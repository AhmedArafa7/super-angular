import { Component, ElementRef, Input, ViewChild, signal, computed, effect, OnDestroy, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideDynamicIcon } from '@lucide/angular';
import { SafePipe } from '../../../../shared/pipes/safe.pipe';
import { WeTubeService } from '../../wetube.service';
import { VideoDownloadService } from '../../../../core/services/video-download.service';

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

  private wetube = inject(WeTubeService);
  private downloadSvc = inject(VideoDownloadService);

  /** Current download status for this video */
  dlStatus = computed(() => this.downloadSvc.downloadStatuses()[this.videoId]);

  triggerDownload() {
    if (!this.videoId) return;
    this.downloadSvc.downloadVideo(
      this.videoId, this.title, this.author, this.poster, '144p'
    ).catch(() => {});
  }

  isPlaying = signal(false);
  progress = signal(0);
  currentTime = signal('0:00');
  duration = signal('0:00');
  isMuted = signal(false);
  showControls = signal(true);
  quality = signal('');
  showSkipIntro = signal(false);
  isCaching = signal(false);

  // Neural Upscaler State
  isUpscaling = signal(false);
  upscaleProgress = signal(0);
  upscaleStep = signal<'idle' | 'loading_144' | 'processing' | 'completed'>('idle');
  upscaleQuality = signal('144p');

  private rafRef: number | null = null;
  private hideControlsTimeout: any = null;
  private upscaleInterval: any = null;

  constructor() {
    effect(() => {
      // Trigger upscale whenever videoId or src changes
      const id = this.videoId;
      const source = this.src;
      this.startUpscaleEngine();
    });
  }

  ngAfterViewInit() {
    this.quality.set(this.defaultQuality);
    this.startUpscaleEngine();
  }

  ngOnDestroy() {
    if (this.rafRef) cancelAnimationFrame(this.rafRef);
    if (this.hideControlsTimeout) clearTimeout(this.hideControlsTimeout);
    if (this.upscaleInterval) {
      clearInterval(this.upscaleInterval);
      this.upscaleInterval = null;
    }
  }

  get youtubeIframeUrl() {
    const config = this.wetube.algoConfig();
    const isSaving = config.dataSaverEnabled;
    const isDone = this.upscaleStep() === 'completed';
    // If saving and not completed, load 144p (vq=tiny)
    const qualityParam = isSaving && !isDone ? 'tiny' : config.targetUpscaleQuality.replace(/\D/g, '');
    const vqValue = qualityParam === 'tiny' ? 'tiny' : `hd${qualityParam}`;
    return `https://www.youtube-nocookie.com/embed/${this.videoId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&enablejsapi=1&vq=${vqValue}`;
  }

  startUpscaleEngine() {
    if (this.upscaleInterval) {
      clearInterval(this.upscaleInterval);
      this.upscaleInterval = null;
    }

    const config = this.wetube.algoConfig();
    if (!config.dataSaverEnabled) {
      this.isUpscaling.set(false);
      this.upscaleStep.set('idle');
      this.upscaleQuality.set(this.defaultQuality);
      
      // Auto play if data saver is disabled
      setTimeout(() => {
        if (this.videoRef?.nativeElement) {
          this.videoRef.nativeElement.play().catch(() => {});
          this.isPlaying.set(true);
        }
      }, 200);
      return;
    }

    // Initialize Data Saver Upscaling Sequence
    this.isUpscaling.set(true);
    this.upscaleProgress.set(0);
    this.upscaleStep.set('loading_144');
    this.upscaleQuality.set('144p');

    // Pause player initially if playing
    if (this.videoRef?.nativeElement) {
      this.videoRef.nativeElement.pause();
      this.isPlaying.set(false);
    }

    // Start background upscaling progress simulation
    this.upscaleInterval = setInterval(() => {
      const nextProgress = this.upscaleProgress() + 5;
      this.upscaleProgress.set(nextProgress);

      if (nextProgress === 50) {
        // Start playback at 50% upscaled (in low quality 144p while upscaling continues in background)
        this.upscaleStep.set('processing');
        if (this.videoRef?.nativeElement) {
          this.videoRef.nativeElement.play().catch(() => {});
          this.isPlaying.set(true);
        }
      }

      if (nextProgress >= 100) {
        clearInterval(this.upscaleInterval);
        this.upscaleInterval = null;
        this.upscaleProgress.set(100);
        this.upscaleStep.set('completed');
        
        // Upgrade quality to user-selected target
        const targetQ = config.targetUpscaleQuality || '720p';
        this.upscaleQuality.set(targetQ);

        // Hide overlay after showing 100% completed state for 1.5 seconds
        setTimeout(() => {
          this.isUpscaling.set(false);
        }, 1500);
      }
    }, 150); // 20 steps * 150ms = 3.0s total upscale delay. Playback starts at 1.5s (50% progress)
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
