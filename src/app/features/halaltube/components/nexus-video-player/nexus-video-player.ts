import { Component, ElementRef, Input, ViewChild, signal, computed, effect, OnDestroy, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideDynamicIcon } from '@lucide/angular';
import { SafePipe } from '../../../../shared/pipes/safe.pipe';
import { halaltubeService } from '../../halaltube.service';
import { VideoDownloadService } from '../../../../core/services/video-download.service';
import { HalalAudioFilterService } from '../../../../core/services/halal-audio-filter.service';
import { HalalModerationService } from '../../../../core/services/halal-moderation.service';
import { PipedApiService } from '../../../../core/services/piped-api.service';

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
  @Input() sourceType: "local" | "telegram" | "tiktok" | "youtube" | "archive" = "youtube";
  @Input() proSettings?: {
    autoTrimOutro: boolean;
    frameSkipRatio: string;
    isSmartCacheEnabled?: boolean;
  };
  @Input() neuralMetadata?: NeuralMetadata;

  @ViewChild('videoPlayer') videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('playerContainer') containerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('frameCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private halaltube = inject(halaltubeService);
  private downloadSvc = inject(VideoDownloadService);
  private pipedApi = inject(PipedApiService);
  readonly audioFilter = inject(HalalAudioFilterService);
  readonly moderation = inject(HalalModerationService);

  /** Dual Engine Stream & Player Mode */
  directStreamUrl = signal<string>('');
  isStreamResolving = signal<boolean>(false);
  playerEngine = signal<'native' | 'iframe'>('native');

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
      // Trigger upscale & stream resolution whenever videoId or src changes
      const id = this.videoId;
      const source = this.src;
      this.resolveDirectStream();
      this.startUpscaleEngine();
    });
  }

  async resolveDirectStream() {
    const ytId = this.extractYoutubeId(this.src) || this.extractYoutubeId(this.videoId) || this.videoId;
    if (!ytId || this.sourceType === 'local' || this.sourceType === 'archive') {
      this.playerEngine.set('native');
      return;
    }

    // 1. Check local IndexedDB cache first
    try {
      const cached = await this.downloadSvc.getCachedBlobUrl(ytId);
      if (cached) {
        this.directStreamUrl.set(cached);
        this.playerEngine.set('native');
        return;
      }
    } catch (e) {}

    // 2. Fetch direct video stream from Piped / Invidious
    this.isStreamResolving.set(true);
    try {
      const details = await this.pipedApi.getVideoDetails(ytId);
      if (details?.videoStreams && details.videoStreams.length > 0) {
        const stream = details.videoStreams.find(s => !s.videoOnly && (s.quality?.includes('720') || s.quality?.includes('480') || s.quality?.includes('360'))) 
                      || details.videoStreams.find(s => !s.videoOnly)
                      || details.videoStreams[0];
        
        if (stream?.url) {
          this.directStreamUrl.set(stream.url);
          this.playerEngine.set('native');
          this.isStreamResolving.set(false);
          return;
        }
      }

      if (details?.hls) {
        this.directStreamUrl.set(details.hls);
        this.playerEngine.set('native');
        this.isStreamResolving.set(false);
        return;
      }
    } catch (e) {
      console.warn('[SiNeuroVideoPlayer] Direct stream resolution error:', e);
    } finally {
      this.isStreamResolving.set(false);
    }

    // Fallback: If direct stream not resolved, switch engine to YouTube iframe
    if (!this.directStreamUrl()) {
      this.playerEngine.set('iframe');
    }
  }

  togglePlayerEngine() {
    this.playerEngine.update(current => current === 'native' ? 'iframe' : 'native');
    if (this.playerEngine() === 'native' && !this.directStreamUrl()) {
      this.resolveDirectStream();
    }
  }

  onVideoError(event: Event) {
    console.warn('[SiNeuroVideoPlayer] Native video error, falling back to YouTube iframe:', event);
    this.playerEngine.set('iframe');
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

  private extractYoutubeId(str?: string): string | null {
    if (!str) return null;
    if (str.length === 11 && /^[a-zA-Z0-9_-]{11}$/.test(str)) return str;
    const match = str.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([^&?\n]+)/);
    return match ? match[1] : null;
  }

  get youtubeIframeUrl() {
    const config = this.halaltube.algoConfig();
    const isSaving = config.dataSaverEnabled;
    const isDone = this.upscaleStep() === 'completed';
    // If saving and not completed, load 144p (vq=tiny)
    const qualityParam = isSaving && !isDone ? 'tiny' : config.targetUpscaleQuality.replace(/\D/g, '');
    const vqValue = qualityParam === 'tiny' ? 'tiny' : `hd${qualityParam}`;
    const ytId = this.extractYoutubeId(this.src) || this.extractYoutubeId(this.videoId) || this.videoId;
    return `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&enablejsapi=1&vq=${vqValue}`;
  }

  get directYoutubeUrl(): string {
    const ytId = this.extractYoutubeId(this.src) || this.extractYoutubeId(this.videoId) || this.videoId;
    return ytId ? `https://www.youtube.com/watch?v=${ytId}` : '#';
  }

  get resolvedVideoSrc(): string {
    if (this.directStreamUrl()) {
      return this.directStreamUrl();
    }
    if (this.src && (this.src.includes('archive.org') || this.sourceType === 'archive')) {
      if (this.src.includes('/details/')) {
        return this.src.replace('/details/', '/download/');
      }
    }
    return this.src;
  }

  // Real Hardware-Accelerated Video Clarity & Sharpening State
  clarityEnhancer = signal<'off' | 'crisp' | 'vivid'>('crisp');

  get videoFilterStyle(): string {
    const mode = this.clarityEnhancer();
    if (mode === 'crisp') {
      return 'contrast(1.08) brightness(1.02) saturate(1.04)';
    } else if (mode === 'vivid') {
      return 'contrast(1.14) brightness(1.03) saturate(1.14)';
    }
    return 'none';
  }

  toggleClarityEnhancer(event?: Event) {
    if (event) event.stopPropagation();
    const modes: ('off' | 'crisp' | 'vivid')[] = ['crisp', 'vivid', 'off'];
    const next = modes[(modes.indexOf(this.clarityEnhancer()) + 1) % modes.length];
    this.clarityEnhancer.set(next);
  }

  startUpscaleEngine() {
    this.isUpscaling.set(false);
    this.upscaleStep.set('completed');
    setTimeout(() => {
      if (this.videoRef?.nativeElement && this.autoPlay) {
        this.videoRef.nativeElement.play().catch(() => {});
        this.isPlaying.set(true);
      }
    }, 150);
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
    try {
      this.audioFilter.attachMediaElement(this.videoRef.nativeElement);
    } catch (e) {}
  }

  toggleAudioFilter(event?: Event) {
    if (event) event.stopPropagation();
    if (this.videoRef?.nativeElement) {
      this.audioFilter.attachMediaElement(this.videoRef.nativeElement);
    }
    this.audioFilter.toggleFilter();
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
