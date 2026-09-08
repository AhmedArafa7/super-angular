import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class MeetingMediaService {
  // Media device state signals
  readonly isCameraOn = signal<boolean>(true);
  readonly isMicOn = signal<boolean>(true);
  readonly hasPermissions = signal<boolean>(false);
  readonly permissionError = signal<string | null>(null);
  readonly localStream = signal<MediaStream | null>(null);
  readonly audioLevel = signal<number>(0); // 0 to 100 for mic meter

  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private microphoneSource: MediaStreamAudioSourceNode | null = null;
  private animationFrameId: number | null = null;

  /**
   * Starts local preview stream for Lobby
   */
  async startPreview(video: boolean = true, audio: boolean = true): Promise<MediaStream | null> {
    this.stopPreview();
    this.permissionError.set(null);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this.permissionError.set('متصفحك الحالي لا يدعم الوصول للكاميرا والمايكروفون.');
      return null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: video ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
        audio: audio ? { echoCancellation: true, noiseSuppression: true, autoGainControl: true } : false
      });

      this.localStream.set(stream);
      this.hasPermissions.set(true);
      this.isCameraOn.set(video);
      this.isMicOn.set(audio);

      if (audio) {
        this.setupAudioMeter(stream);
      }

      return stream;
    } catch (err: any) {
      console.warn('[MeetingMediaService] Media access rejected/failed:', err);
      let errorMsg = 'تعذر الوصول إلى الكاميرا أو المايكروفون. يرجى التأكد من إعطاء الصلاحية في المتصفح.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = 'تم رفض الإذن بالوصول للكاميرا أو المايك. يرجى تفعيل الصلاحية من شريط العنوان.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = 'لم يتم العثور على كاميرا أو مايكروفون متصل بجهازك.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMsg = 'الكاميرا أو المايكروفون قيد الاستخدام بواسطة تطبيق آخر.';
      }
      this.permissionError.set(errorMsg);
      this.hasPermissions.set(false);
      return null;
    }
  }

  /**
   * Toggles Camera video tracks enabled/disabled
   */
  toggleCamera(): boolean {
    const stream = this.localStream();
    if (!stream) return false;

    const videoTracks = stream.getVideoTracks();
    if (videoTracks.length === 0) return false;

    const newState = !videoTracks[0].enabled;
    videoTracks.forEach(track => {
      track.enabled = newState;
    });

    this.isCameraOn.set(newState);
    return newState;
  }

  /**
   * Toggles Microphone audio tracks enabled/disabled
   */
  toggleMic(): boolean {
    const stream = this.localStream();
    if (!stream) return false;

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) return false;

    const newState = !audioTracks[0].enabled;
    audioTracks.forEach(track => {
      track.enabled = newState;
    });

    this.isMicOn.set(newState);
    if (!newState) {
      this.audioLevel.set(0);
    }
    return newState;
  }

  /**
   * Visual mic audio meter using Web Audio API
   */
  private setupAudioMeter(stream: MediaStream): void {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      this.audioContext = new AudioCtx();
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.analyserNode.smoothingTimeConstant = 0.5;

      this.microphoneSource = this.audioContext.createMediaStreamSource(stream);
      this.microphoneSource.connect(this.analyserNode);

      const bufferLength = this.analyserNode.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateMeter = () => {
        if (!this.analyserNode || !this.isMicOn()) {
          this.audioLevel.set(0);
          return;
        }

        this.analyserNode.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        // Normalize to 0 - 100 with sensitivity multiplier
        const level = Math.min(100, Math.round((average / 128) * 100));
        this.audioLevel.set(level);

        this.animationFrameId = requestAnimationFrame(updateMeter);
      };

      this.animationFrameId = requestAnimationFrame(updateMeter);
    } catch (e) {
      console.warn('[MeetingMediaService] Audio meter setup skipped:', e);
    }
  }

  /**
   * Completely stops all tracks and releases camera/mic hardware
   */
  stopPreview(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.microphoneSource) {
      try { this.microphoneSource.disconnect(); } catch (_) {}
      this.microphoneSource = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try { this.audioContext.close(); } catch (_) {}
      this.audioContext = null;
    }

    const stream = this.localStream();
    if (stream) {
      stream.getTracks().forEach(track => {
        try { track.stop(); } catch (_) {}
      });
      this.localStream.set(null);
    }

    this.audioLevel.set(0);
  }
}
