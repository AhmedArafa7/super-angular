import { Injectable, signal } from '@angular/core';

export type AudioFilterMode = 'off' | 'vocal_boost' | 'strict_no_music';

@Injectable({
  providedIn: 'root'
})
export class HalalAudioFilterService {
  private audioCtx: AudioContext | null = null;
  private mediaSourceMap = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();

  // DSP Filter Nodes for the currently connected element
  private highPassNode: BiquadFilterNode | null = null;
  private lowPassNode: BiquadFilterNode | null = null;
  private vocalBoostNode: BiquadFilterNode | null = null;
  private midGainNode: GainNode | null = null;
  private sideGainNode: GainNode | null = null;
  private splitterNode: ChannelSplitterNode | null = null;
  private mergerNode: ChannelMergerNode | null = null;
  private currentElement: HTMLMediaElement | null = null;

  // Reactive State
  readonly isFilterActive = signal<boolean>(false);
  readonly filterMode = signal<AudioFilterMode>('vocal_boost');
  readonly isProcessing = signal<boolean>(false);

  constructor() {
    // Load saved preference
    const saved = localStorage.getItem('halaltube_audio_filter_mode') as AudioFilterMode | null;
    if (saved && ['off', 'vocal_boost', 'strict_no_music'].includes(saved)) {
      this.filterMode.set(saved);
      this.isFilterActive.set(saved !== 'off');
    }
  }

  private initAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  /**
   * Connects an HTML5 video/audio element to the Web Audio DSP Graph
   */
  attachMediaElement(element: HTMLMediaElement): void {
    if (!element) return;
    this.currentElement = element;

    try {
      const ctx = this.initAudioContext();
      if (!ctx) return;

      let sourceNode = this.mediaSourceMap.get(element);
      if (!sourceNode) {
        sourceNode = ctx.createMediaElementSource(element);
        this.mediaSourceMap.set(element, sourceNode);
      }

      // Build or rebuild DSP graph
      this.buildDSPGraph(ctx, sourceNode);
      this.applyMode(this.filterMode());
    } catch (err) {
      console.warn('[HalalAudioFilterService] Could not attach media element to AudioContext:', err);
    }
  }

  private buildDSPGraph(ctx: AudioContext, source: MediaElementAudioSourceNode): void {
    try {
      // Disconnect any existing routing
      source.disconnect();

      // 1. High-Pass Filter: Cuts sub-bass, 808s, basslines (< 140Hz)
      this.highPassNode = ctx.createBiquadFilter();
      this.highPassNode.type = 'highpass';
      this.highPassNode.frequency.setValueAtTime(140, ctx.currentTime);
      this.highPassNode.Q.setValueAtTime(0.7, ctx.currentTime);

      // 2. Vocal Clarity Boost: Peaking filter boosting human speech formants (1.2kHz - 2.8kHz)
      this.vocalBoostNode = ctx.createBiquadFilter();
      this.vocalBoostNode.type = 'peaking';
      this.vocalBoostNode.frequency.setValueAtTime(1800, ctx.currentTime);
      this.vocalBoostNode.Q.setValueAtTime(1.1, ctx.currentTime);
      this.vocalBoostNode.gain.setValueAtTime(3.5, ctx.currentTime); // +3.5 dB speech boost

      // 3. Low-Pass Filter: Cuts high frequency cymbals, synths, sizzle (> 3.6kHz)
      this.lowPassNode = ctx.createBiquadFilter();
      this.lowPassNode.type = 'lowpass';
      this.lowPassNode.frequency.setValueAtTime(3600, ctx.currentTime);
      this.lowPassNode.Q.setValueAtTime(0.7, ctx.currentTime);

      // 4. Stereo Mid-Side Decomposition & Side Attenuation:
      // Human voice is largely centered (Mono/Mid), whereas musical instruments and stereo reverb are panned (Side).
      // We mix L and R into Mid channel and attenuate side channels.
      this.splitterNode = ctx.createChannelSplitter(2);
      this.mergerNode = ctx.createChannelMerger(2);
      this.midGainNode = ctx.createGain();
      this.sideGainNode = ctx.createGain();

      this.midGainNode.gain.setValueAtTime(1.2, ctx.currentTime); // Strengthen center speech
      this.sideGainNode.gain.setValueAtTime(0.1, ctx.currentTime); // Greatly reduce wide stereo instruments

      // Wiring DSP Graph:
      // Source -> HighPass -> VocalBoost -> LowPass -> Splitter -> MidGain/SideGain -> Merger -> Destination
      source.connect(this.highPassNode);
      this.highPassNode.connect(this.vocalBoostNode);
      this.vocalBoostNode.connect(this.lowPassNode);

      // Connect filtered signal to Splitter
      this.lowPassNode.connect(this.splitterNode);

      // Splitter: channel 0 (L), channel 1 (R) -> Mid summing
      this.splitterNode.connect(this.midGainNode, 0);
      this.splitterNode.connect(this.midGainNode, 1);

      // Route Mid channel equally to both Left and Right output channels for crystal clear center dialogue
      this.midGainNode.connect(this.mergerNode, 0, 0);
      this.midGainNode.connect(this.mergerNode, 0, 1);

      // Final Output to Speakers
      this.mergerNode.connect(ctx.destination);
    } catch (e) {
      console.warn('[HalalAudioFilterService] Error building DSP graph:', e);
      // Fallback: direct connection
      try {
        source.connect(ctx.destination);
      } catch (_) {}
    }
  }

  setFilterMode(mode: AudioFilterMode): void {
    this.filterMode.set(mode);
    this.isFilterActive.set(mode !== 'off');
    localStorage.setItem('halaltube_audio_filter_mode', mode);
    this.applyMode(mode);
  }

  toggleFilter(): void {
    const current = this.filterMode();
    const next: AudioFilterMode = current === 'off' ? 'vocal_boost' : current === 'vocal_boost' ? 'strict_no_music' : 'off';
    this.setFilterMode(next);
  }

  private applyMode(mode: AudioFilterMode): void {
    if (!this.audioCtx) return;
    const ctx = this.audioCtx;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const t = ctx.currentTime;

    if (mode === 'off') {
      // Bypass filters: flatten response
      if (this.highPassNode) this.highPassNode.frequency.setTargetAtTime(10, t, 0.05);
      if (this.lowPassNode) this.lowPassNode.frequency.setTargetAtTime(22000, t, 0.05);
      if (this.vocalBoostNode) this.vocalBoostNode.gain.setTargetAtTime(0, t, 0.05);
      if (this.midGainNode) this.midGainNode.gain.setTargetAtTime(1.0, t, 0.05);
      if (this.sideGainNode) this.sideGainNode.gain.setTargetAtTime(1.0, t, 0.05);
      this.isProcessing.set(false);
    } else if (mode === 'vocal_boost') {
      // Balanced Vocal Boost & Music Soft-Dampening
      if (this.highPassNode) this.highPassNode.frequency.setTargetAtTime(120, t, 0.05);
      if (this.lowPassNode) this.lowPassNode.frequency.setTargetAtTime(4500, t, 0.05);
      if (this.vocalBoostNode) {
        this.vocalBoostNode.frequency.setTargetAtTime(1600, t, 0.05);
        this.vocalBoostNode.gain.setTargetAtTime(4.0, t, 0.05);
      }
      if (this.midGainNode) this.midGainNode.gain.setTargetAtTime(1.2, t, 0.05);
      if (this.sideGainNode) this.sideGainNode.gain.setTargetAtTime(0.25, t, 0.05);
      this.isProcessing.set(true);
    } else if (mode === 'strict_no_music') {
      // Aggressive Speech-Only Isolation (Cuts instruments sharply, passes only human dialogue band)
      if (this.highPassNode) this.highPassNode.frequency.setTargetAtTime(200, t, 0.05);
      if (this.lowPassNode) this.lowPassNode.frequency.setTargetAtTime(3200, t, 0.05);
      if (this.vocalBoostNode) {
        this.vocalBoostNode.frequency.setTargetAtTime(1800, t, 0.05);
        this.vocalBoostNode.gain.setTargetAtTime(6.0, t, 0.05);
      }
      if (this.midGainNode) this.midGainNode.gain.setTargetAtTime(1.35, t, 0.05);
      if (this.sideGainNode) this.sideGainNode.gain.setTargetAtTime(0.0, t, 0.05); // Zero stereo instruments
      this.isProcessing.set(true);
    }
  }

  getModeLabel(mode: AudioFilterMode = this.filterMode()): string {
    switch (mode) {
      case 'strict_no_music':
        return 'عازل معازف فائق (حوار بشري فقط 🎙️)';
      case 'vocal_boost':
        return 'عازل معازف نشط (تعزيز الحوار وقمع الموسيقى 🎧)';
      case 'off':
      default:
        return 'الصوت الأصلي بدون عازل';
    }
  }
}
