import { Injectable, OnDestroy } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ArcadeAudioService implements OnDestroy {
  private audioCtx: AudioContext | null = null;
  private bgmOsc1: OscillatorNode | null = null;
  private bgmOsc2: OscillatorNode | null = null;
  private bgmGain: GainNode | null = null;

  constructor() {}

  /**
   * Ensure AudioContext is initialized and resumed.
   * Call this on the first user interaction (e.g. click).
   */
  public ensureAudioContext(): void {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  /**
   * Play a short UI click sound (SFX).
   * @param volume Volume level from 0.0 to 1.0
   */
  public playSfx(volume: number): void {
    this.ensureAudioContext();
    if (!this.audioCtx || volume <= 0) return;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, this.audioCtx.currentTime + 0.1);
    
    gain.gain.value = volume * 0.5;
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    
    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.1);
  }

  /**
   * Start or update background music.
   * @param volume Volume level from 0.0 to 1.0
   */
  public playBgm(volume: number): void {
    this.ensureAudioContext();
    if (!this.audioCtx) return;

    if (volume <= 0) {
      this.stopBgm();
      return;
    }

    if (!this.bgmGain) {
      this.bgmGain = this.audioCtx.createGain();
      this.bgmGain.gain.value = 0;
      this.bgmGain.connect(this.audioCtx.destination);
      
      // Pleasant soft ambient drone (E4 and A4)
      this.bgmOsc1 = this.audioCtx.createOscillator();
      this.bgmOsc1.type = 'sine';
      this.bgmOsc1.frequency.value = 329.63; // E4
      this.bgmOsc1.connect(this.bgmGain);
      this.bgmOsc1.start();

      this.bgmOsc2 = this.audioCtx.createOscillator();
      this.bgmOsc2.type = 'sine';
      this.bgmOsc2.frequency.value = 440.00; // A4
      this.bgmOsc2.connect(this.bgmGain);
      this.bgmOsc2.start();
    }
    
    // Very gentle volume scaling
    this.bgmGain.gain.value = volume * 0.05;
  }

  /**
   * Completely stop and disconnect the background music oscillators.
   */
  public stopBgm(): void {
    if (this.bgmOsc1) { this.bgmOsc1.stop(); this.bgmOsc1.disconnect(); this.bgmOsc1 = null; }
    if (this.bgmOsc2) { this.bgmOsc2.stop(); this.bgmOsc2.disconnect(); this.bgmOsc2 = null; }
    if (this.bgmGain) { this.bgmGain.disconnect(); this.bgmGain = null; }
  }

  ngOnDestroy(): void {
    this.stopBgm();
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }
}
