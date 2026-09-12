import { Component, inject, ViewChild, ElementRef, ChangeDetectionStrategy, effect, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { VideoStateService } from '../../../../core/services/video-state.service';
import { LucideAngularModule, Play, Pause, X, Maximize, ExternalLink, PictureInPicture, Sparkles } from 'lucide-angular';
import { SafePipe } from '../../../../core/pipes/safe.pipe'; // Need to ensure we have a safe pipe for IFrame URLs

@Component({
  selector: 'app-global-video-player',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, SafePipe],
  template: `
    @if (videoState.playerMode() !== 'hidden' && videoState.activeVideo()) {
      <div 
        class="global-player-wrapper transition-all duration-300 rounded-2xl shadow-2xl overflow-hidden border border-white/10 bg-slate-950 cursor-pointer"
        [style.display]="videoState.isModalOpen() ? 'none' : 'block'"
        [style.position]="'fixed'"
        [style.z-index]="videoState.playerMode() === 'floating' ? '9999' : '40'"
        [style.background]="'black'"
        [style.top]="videoState.playerMode() === 'full' ? (videoState.playerRect()?.top + 'px') : 'auto'"
        [style.bottom]="videoState.playerMode() === 'floating' ? (isMobileScreen() ? '16px' : '24px') : 'auto'"
        [style.left]="videoState.playerMode() === 'full' ? (videoState.playerRect()?.left + 'px') : 'auto'"
        [style.right]="videoState.playerMode() === 'floating' ? (isMobileScreen() ? '16px' : '24px') : 'auto'"
        [style.width]="videoState.playerMode() === 'full' ? (videoState.playerRect()?.width + 'px') : (isMobileScreen() ? 'calc(100vw - 32px)' : '320px')"
        [style.height]="videoState.playerMode() === 'full' ? (videoState.playerRect()?.height + 'px') : (isMobileScreen() ? 'calc((100vw - 32px) * 9 / 16)' : '180px')"
        (click)="onPlayerWrapperClick($event)"
      >
        <!-- Loading State -->
        @if (videoState.isLoading() && !isContentReady()) {
          <div class="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center z-10 pointer-events-none transition-opacity duration-300">
            <div class="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2"></div>
            <span class="text-xs text-slate-400 font-bold">جاري تحميل المشغل...</span>
          </div>
        }

        <!-- Si-Neuro PRO Optimizer Overlay -->
        @if (isOptimizing()) {
          <div class="absolute inset-0 bg-slate-950/95 backdrop-blur-3xl z-50 flex flex-col items-center justify-center transition-opacity duration-500 pointer-events-none">
            <div class="relative w-24 h-24 mb-6">
              <!-- Glowing rings -->
              <div class="absolute inset-0 border-4 border-indigo-500/20 rounded-full animate-[spin_3s_linear_infinite]"></div>
              <div class="absolute inset-2 border-4 border-t-indigo-500 border-r-indigo-500 border-b-transparent border-l-transparent rounded-full animate-[spin_1.5s_linear_infinite]"></div>
              <div class="absolute inset-4 border-4 border-t-transparent border-r-transparent border-b-cyan-400 border-l-cyan-400 rounded-full animate-[spin_1s_linear_infinite_reverse]"></div>
              <lucide-icon [img]="Sparkles" class="absolute inset-0 m-auto w-8 h-8 text-indigo-400 animate-pulse"></lucide-icon>
            </div>
            <h3 class="text-xl font-black text-white mb-2 tracking-tight">Si-Neuro™ PRO</h3>
            <p class="text-sm text-indigo-400 font-bold mb-4 animate-pulse">جاري تحسين جودة العرض بالذكاء الاصطناعي...</p>
            
            <div class="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
              <div class="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 w-full origin-left animate-pulse"></div>
            </div>
          </div>
        }

        <!-- Native Video Player (Piped API Stream) -->
        @if (videoState.playerType() === 'native' && videoState.rawStreamUrl()) {
          <video 
            #nativeVideo 
            [src]="videoState.rawStreamUrl()" 
            class="w-full h-full object-cover bg-black"
            [autoplay]="true"
            controls
            crossorigin="anonymous"
            (play)="onNativePlay()"
            (canplay)="onContentReady()"
            (pause)="videoState.isPlaying.set(false)"
            (timeupdate)="onTimeUpdate($event)"
            (loadedmetadata)="onLoadedMetadata($event)"
            [muted]="videoState.isMuted()"
          ></video>
          <canvas #ambientCanvas width="1" height="1" class="hidden"></canvas>
        }

        <!-- Fallback IFrame Player (YouTube API / Google Drive Preview) -->
        @if (videoState.playerType() === 'iframe') {
          <div class="relative w-full h-full bg-black">
            <iframe 
              [src]="getIframeUrl() | safe:'resourceUrl'" 
              class="w-full h-full bg-black border-0"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
              referrerpolicy="strict-origin-when-cross-origin"
              allowfullscreen
              (load)="onIframeLoaded()">
            </iframe>

          </div>
        }

        <!-- Floating Mode Custom Controls Overlay -->
        @if (videoState.playerMode() === 'floating') {
          <div class="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 opacity-0 hover:opacity-100 transition-opacity bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/80">
            <!-- Top Bar -->
            <div class="flex justify-between items-start pointer-events-auto">
              <button class="w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-red-500 transition-colors" (click)="closePlayer()">
                <lucide-icon [img]="X" class="w-3.5 h-3.5"></lucide-icon>
              </button>
              
              <div class="flex gap-2">
                @if (videoState.playerType() === 'native') {
                  <button class="w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-indigo-500 transition-colors" (click)="requestPiP()" title="Picture in Picture">
                    <lucide-icon [img]="PictureInPicture" class="w-3.5 h-3.5"></lucide-icon>
                  </button>
                }
                <button class="w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-indigo-500 transition-colors" (click)="expandPlayer()">
                  <lucide-icon [img]="Maximize" class="w-3.5 h-3.5"></lucide-icon>
                </button>
              </div>
            </div>

            <!-- Bottom Info -->
            <div class="pointer-events-auto">
              <h4 class="text-white text-xs font-bold line-clamp-1 mb-1">{{ videoState.activeVideo()?.title }}</h4>
              <p class="text-slate-400 text-[10px]">{{ videoState.activeVideo()?.author }}</p>
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    /* Ensure native video controls look decent */
    video::-webkit-media-controls-panel {
      background: linear-gradient(transparent, rgba(0,0,0,0.8));
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GlobalVideoPlayerComponent {
  videoState = inject(VideoStateService);
  router = inject(Router);

  @ViewChild('nativeVideo') nativeVideoEl?: ElementRef<HTMLVideoElement>;

  Play = Play;
  Pause = Pause;
  X = X;
  Maximize = Maximize;
  ExternalLink = ExternalLink;
  PictureInPicture = PictureInPicture;
  Sparkles = Sparkles;

  isOptimizing = signal<boolean>(false);
  isContentReady = signal<boolean>(false);
  windowWidth = signal<number>(typeof window !== 'undefined' ? window.innerWidth : 1200);

  private lastVideoId: string | null = null;
  private lastOptimizedVideoId: string | null = null;

  onIframeLoaded() {
    this.isContentReady.set(true);
    this.videoState.isLoading.set(false);
  }

  onNativePlay() {
    this.isContentReady.set(true);
    this.videoState.isLoading.set(false);
    this.videoState.isPlaying.set(true);
  }

  onContentReady() {
    this.isContentReady.set(true);
    this.videoState.isLoading.set(false);
  }

  @HostListener('window:resize')
  onWindowResize() {
    if (typeof window !== 'undefined') {
      this.windowWidth.set(window.innerWidth);
    }
  }

  isMobileScreen(): boolean {
    return this.windowWidth() < 640;
  }

  constructor() {
    effect(() => {
      // Trigger Si-Neuro optimization overlay ONCE per unique video
      const activeVid = this.videoState.activeVideo();
      if (activeVid) {
        if (activeVid.id !== this.lastVideoId) {
          this.lastVideoId = activeVid.id;
          this.isContentReady.set(false);
        }

        if (activeVid.id !== this.lastOptimizedVideoId) {
          this.lastOptimizedVideoId = activeVid.id;
          this.isOptimizing.set(true);
          setTimeout(() => {
            this.isOptimizing.set(false);
          }, 1000);
        }
      }
    }, { allowSignalWrites: true });
    effect(() => {
      // Handle programmatic seek commands
      const seekTime = this.videoState.seekCommand();
      if (seekTime !== null && this.nativeVideoEl?.nativeElement) {
        this.nativeVideoEl.nativeElement.currentTime = seekTime;
        this.videoState.seekCommand.set(null); // clear command
      }
    });

    effect(() => {
      // Sync play/pause state & modal state
      const isPlaying = this.videoState.isPlaying();
      const isModal = this.videoState.isModalOpen();
      const video = this.nativeVideoEl?.nativeElement;
      const shouldPlay = isPlaying && !isModal;

      if (video) {
        if (shouldPlay && video.paused) {
          video.play().catch(e => console.warn('Auto-play prevented', e));
        } else if (!shouldPlay && !video.paused) {
          video.pause();
        }
        
        // Handle Ambient Mode Extraction interval
        if (shouldPlay) {
          this.startAmbientExtraction();
        } else {
          this.stopAmbientExtraction();
        }
      } else {
        this.stopAmbientExtraction();
      }

      // If shouldPlay is false, pause YouTube iframe via postMessage as well
      if (!shouldPlay) {
        try {
          const iframes = document.querySelectorAll('iframe');
          iframes.forEach(iframe => {
            iframe.contentWindow?.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
          });
        } catch (e) {}
      }
    });
  }

  // --- Ambient Mode: 1x1 Canvas Hack with requestAnimationFrame ---
  @ViewChild('ambientCanvas') ambientCanvas?: ElementRef<HTMLCanvasElement>;
  private animFrameId: number | null = null;
  private lastExtractionTime = 0;

  private startAmbientExtraction() {
    if (this.animFrameId) return;

    const loop = (timestamp: number) => {
      if (timestamp - this.lastExtractionTime >= 500) { // Throttle to ~2 FPS
        this.extractAmbientColor();
        this.lastExtractionTime = timestamp;
      }
      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  private stopAmbientExtraction() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private extractAmbientColor() {
    const video = this.nativeVideoEl?.nativeElement;
    const canvas = this.ambientCanvas?.nativeElement;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    try {
      // GPU Downsampling directly to 1x1 pixel
      ctx.drawImage(video, 0, 0, 1, 1);
      const data = ctx.getImageData(0, 0, 1, 1).data;
      // data is [r, g, b, a]
      const color = `rgb(${data[0]}, ${data[1]}, ${data[2]})`;
      this.videoState.ambientColor.set(color);
    } catch (e) {
      // Ignore cross-origin canvas errors if they happen occasionally
    }
  }

  ngOnDestroy() {
    this.stopAmbientExtraction();
  }

  onPlayerWrapperClick(event: MouseEvent) {
    if (this.videoState.playerMode() === 'floating') {
      const target = event.target as HTMLElement;
      if (!target.closest('button')) {
        this.expandPlayer();
      }
    }
  }

  minimizeToMiniplayer() {
    this.videoState.setPlayerMode('floating');
    if (this.router.url.includes('/stream/watch/')) {
      this.router.navigate(['/stream']);
    }
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    // Ignore keyboard shortcuts if typing in text inputs or textareas
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || (activeEl as HTMLElement).isContentEditable)) {
      return;
    }

    const vid = this.videoState.activeVideo();
    if (!vid || this.videoState.playerMode() === 'hidden') return;

    const key = event.key;

    switch (key.toLowerCase()) {
      case 'i':
        event.preventDefault();
        if (this.videoState.playerMode() === 'floating') {
          this.expandPlayer();
        } else {
          this.minimizeToMiniplayer();
        }
        break;

      case 'k':
      case ' ':
        event.preventDefault();
        this.videoState.togglePlayPause();
        break;

      case 'j':
        event.preventDefault();
        this.videoState.seekTo(Math.max(0, this.videoState.currentTime() - 10));
        break;

      case 'l':
        event.preventDefault();
        this.videoState.seekTo(Math.min(this.videoState.duration() || 100, this.videoState.currentTime() + 10));
        break;

      case 'arrowleft':
        event.preventDefault();
        this.videoState.seekTo(Math.max(0, this.videoState.currentTime() - 5));
        break;

      case 'arrowright':
        event.preventDefault();
        this.videoState.seekTo(Math.min(this.videoState.duration() || 100, this.videoState.currentTime() + 5));
        break;

      case 'arrowup':
        event.preventDefault();
        this.videoState.volume.update(v => Math.min(1, v + 0.05));
        this.videoState.isMuted.set(false);
        break;

      case 'arrowdown':
        event.preventDefault();
        this.videoState.volume.update(v => Math.max(0, v - 0.05));
        break;

      case 'm':
        event.preventDefault();
        this.videoState.isMuted.update(m => !m);
        break;

      case 'f':
        event.preventDefault();
        this.toggleFullscreen();
        break;

      default:
        if (/^[0-9]$/.test(key) && this.videoState.duration() > 0) {
          event.preventDefault();
          const percent = parseInt(key, 10) * 0.10;
          this.videoState.seekTo(this.videoState.duration() * percent);
        }
        break;
    }
  }

  private extractYoutubeId(str?: string): string | null {
    if (!str) return null;
    if (str.length === 11 && /^[a-zA-Z0-9_-]{11}$/.test(str)) return str;
    const match = str.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([^&?\n]+)/);
    return (match && match[1] && match[1].length === 11) ? match[1] : null;
  }

  private extractDriveId(url?: string): string | null {
    if (!url) return null;
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  }

  isDriveVideo(): boolean {
    const video = this.videoState.activeVideo();
    if (!video) return false;
    return video.source === 'drive' || (video.url && video.url.includes('drive.google.com')) || !!(video as any).driveFileId;
  }

  getIframeUrl(): string {
    const video = this.videoState.activeVideo();
    if (!video) return '';

    // Google Drive Video Embed
    if (this.isDriveVideo()) {
      if ((video as any).embedUrl) return (video as any).embedUrl;
      const driveId = (video as any).driveFileId || this.extractDriveId(video.url) || video.id;
      return `https://drive.google.com/file/d/${driveId}/preview`;
    }

    // YouTube Embed
    const ytId = this.extractYoutubeId(video.url) ||
                 this.extractYoutubeId((video as any).externalUrl) ||
                 this.extractYoutubeId(video.id);
    if (!ytId || ytId.length !== 11) return '';
    return `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1`;
  }

  getDirectExternalLink(): string {
    const video = this.videoState.activeVideo();
    if (!video) return '#';
    if (this.isDriveVideo()) {
      const driveId = (video as any).driveFileId || this.extractDriveId(video.url) || video.id;
      return video.url || `https://drive.google.com/file/d/${driveId}/view`;
    }
    const ytId = this.extractYoutubeId(video.url) ||
                 this.extractYoutubeId((video as any).externalUrl) ||
                 this.extractYoutubeId(video.id);
    return ytId ? `https://www.youtube.com/watch?v=${ytId}` : '#';
  }

  getDirectYoutubeLink(): string {
    return this.getDirectExternalLink();
  }

  closePlayer() {
    this.videoState.closePlayer();
  }

  expandPlayer() {
    const videoId = this.videoState.activeVideo()?.id;
    if (videoId) {
      this.videoState.setPlayerMode('full');
      this.router.navigate(['/stream/watch', videoId]);
    }
  }

  onTimeUpdate(event: Event) {
    const video = event.target as HTMLVideoElement;
    this.videoState.updateProgress(video.currentTime);
  }

  onLoadedMetadata(event: Event) {
    const video = event.target as HTMLVideoElement;
    this.videoState.duration.set(video.duration);
  }

  async requestPiP() {
    const video = this.nativeVideoEl?.nativeElement;
    if (video) {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await video.requestPictureInPicture();
        }
      } catch (error) {
        console.error('[GlobalVideoPlayer] PiP failed', error);
      }
    }
  }
}
