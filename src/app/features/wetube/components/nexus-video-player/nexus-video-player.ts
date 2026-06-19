import { Component, ElementRef, Input, ViewChild, signal, computed, effect, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideDynamicIcon } from '@lucide/angular';
import { SafePipe } from '../../../../shared/pipes/safe.pipe'; // Will need this for iframe bypassSecurityTrustResourceUrl

export interface NeuralMetadata {
  introStart?: number;
  introEnd?: number;
  outroStart?: number;
}

@Component({
  selector: 'app-Si-Neuro-video-player',
  standalone: true,
  imports: [CommonModule, LucideDynamicIcon, SafePipe],
  templateUrl: './nexus-video-player.html',
  styleUrls: ['./nexus-video-player.scss']
})
export class SiNeuroVideoPlayerComponent implements AfterViewInit, OnDestroy {
  @Input() src = '';
  @Input() videoId = '';
  @Input() poster = '';
  @Input() autoPlay = false;
  @Input() title = '';
  @Input() author = '';
  @Input() authorAvatar = '';
  @Input() qualityOptions: string[] = ["Auto (720p)"];
  @Input() defaultQuality = "Auto (720p)";
  @Input() sourceType: "local" | "telegram" | "tiktok" | "youtube" = "youtube";
  @Input() proSettings?: {
    autoTrimOutro: boolean;
    frameSkipRatio: string;
    isSmartCacheEnabled?: boolean;
  };
  @Input() neuralMetadata?: NeuralMetadata;

  @ViewChild('videoPlayer') videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('playerContainer') containerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('frameCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  isPlaying = signal(false);
  progress = signal(0);
  currentTime = signal('0:00');
  duration = signal('0:00');
  isMuted = signal(false);
  showControls = signal(true);
  quality = signal('');
  showSkipIntro = signal(false);
  isCaching = signal(false);

  private rafRef: number | null = null;
  private hideControlsTimeout: any = null;

  constructor() {
    effect(() => {
      // If quality changes, we could emit an event here
    });
  }

  ngAfterViewInit() {
    this.quality.set(this.defaultQuality);
    if (this.autoPlay && this.videoRef?.nativeElement) {
      this.videoRef.nativeElement.play().catch(e => console.error(e));
      this.isPlaying.set(true);
    }
  }

  ngOnDestroy() {
    if (this.rafRef) cancelAnimationFrame(this.rafRef);
    if (this.hideControlsTimeout) clearTimeout(this.hideControlsTimeout);
  }

  get youtubeIframeUrl() {
    const qualityParam = this.quality().replace(/\D/g, '');
    return `https://www.youtube-nocookie.com/embed/${this.videoId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&enablejsapi=1&vq=hd${qualityParam}`;
  }

  handleMouseMove() {
    this.showControls.set(true);
    if (this.hideControlsTimeout) clearTimeout(this.hideControlsTimeout);
    if (this.isPlaying()) {
      this.hideControlsTimeout = setTimeout(() => this.showControls.set(false), 3000);
    }
  }

  handleMouseLeave() {
    if (this.isPlaying()) {
      this.showControls.set(false);
    }
  }

  togglePlay() {
    if (this.sourceType === 'youtube' && !this.proSettings) return; // YouTube iframe handles its own play
    
    if (this.videoRef?.nativeElement) {
      if (this.isPlaying()) {
        this.videoRef.nativeElement.pause();
      } else {
        this.videoRef.nativeElement.play();
      }
      this.isPlaying.set(!this.isPlaying());
    }
  }

  handleTimeUpdate() {
    if (!this.videoRef?.nativeElement) return;
    const current = this.videoRef.nativeElement.currentTime;
    const dur = this.videoRef.nativeElement.duration;

    const outroTrigger = this.neuralMetadata?.outroStart || (dur > 10 ? dur - 5 : dur);
    if (this.proSettings?.autoTrimOutro && current >= outroTrigger) {
      this.videoRef.nativeElement.currentTime = dur;
      return;
    }

    if (this.neuralMetadata?.introStart !== undefined && this.neuralMetadata?.introEnd !== undefined) {
      if (current >= this.neuralMetadata.introStart && current < this.neuralMetadata.introEnd) {
        this.showSkipIntro.set(true);
      } else {
        this.showSkipIntro.set(false);
      }
    }

    this.progress.set((current / dur) * 100);
    this.currentTime.set(this.formatTime(current));
  }

  handleLoadedMetadata() {
    if (!this.videoRef?.nativeElement) return;
    this.duration.set(this.formatTime(this.videoRef.nativeElement.duration));
  }

  handleSeek(event: Event) {
    const target = event.target as HTMLInputElement;
    const time = Number(target.value);
    if (this.videoRef?.nativeElement) {
      this.videoRef.nativeElement.currentTime = (time / 100) * this.videoRef.nativeElement.duration;
      this.progress.set(time);
    }
  }

  toggleMute() {
    if (this.videoRef?.nativeElement) {
      this.videoRef.nativeElement.muted = !this.isMuted();
      this.isMuted.set(!this.isMuted());
    }
  }

  toggleFullScreen() {
    if (this.containerRef?.nativeElement) {
      if (!document.fullscreenElement) {
        this.containerRef.nativeElement.requestFullscreen().catch(err => {
          console.error("Error attempting to enable full-screen mode:", err.message);
        });
      } else {
        document.exitFullscreen();
      }
    }
  }

  private formatTime(timeInSeconds: number) {
    if (isNaN(timeInSeconds)) return "0:00";
    const result = new Date(timeInSeconds * 1000).toISOString().substring(11, 19);
    return result.startsWith("00:") ? result.substring(3) : result;
  }
}
