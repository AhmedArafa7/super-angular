import { Component, inject, ViewChild, ElementRef, ChangeDetectionStrategy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { VideoStateService } from '../../../../core/services/video-state.service';
import { LucideAngularModule, Play, Pause, X, Maximize, ExternalLink, PictureInPicture } from 'lucide-angular';
import { SafePipe } from '../../../../core/pipes/safe.pipe'; // Need to ensure we have a safe pipe for IFrame URLs

@Component({
  selector: 'app-global-video-player',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, SafePipe],
  template: `
    @if (videoState.playerMode() !== 'hidden' && videoState.activeVideo()) {
      <div 
        class="global-player-wrapper transition-all duration-300"
        [ngClass]="{
          'fixed bottom-6 left-6 w-80 h-48 rounded-2xl shadow-2xl overflow-hidden border border-white/10 bg-slate-950 z-[60]': videoState.playerMode() === 'floating',
          'fixed z-[40] bg-black': videoState.playerMode() === 'full'
        }"
        [style.top.px]="videoState.playerMode() === 'full' ? videoState.playerRect()?.top : null"
        [style.left.px]="videoState.playerMode() === 'full' ? videoState.playerRect()?.left : null"
        [style.width.px]="videoState.playerMode() === 'full' ? videoState.playerRect()?.width : null"
        [style.height.px]="videoState.playerMode() === 'full' ? videoState.playerRect()?.height : null"
      >
        <!-- Loading State -->
        @if (videoState.isLoading()) {
          <div class="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center z-10">
            <div class="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2"></div>
            <span class="text-xs text-slate-400 font-bold">جاري تحميل المشغل...</span>
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
            (play)="videoState.isPlaying.set(true)"
            (pause)="videoState.isPlaying.set(false)"
            (timeupdate)="onTimeUpdate($event)"
            (loadedmetadata)="onLoadedMetadata($event)"
            [muted]="videoState.isMuted()"
          ></video>
          <canvas #ambientCanvas width="1" height="1" class="hidden"></canvas>
        }

        <!-- Fallback IFrame Player (YouTube API) -->
        @if (videoState.playerType() === 'iframe') {
          <iframe 
            [src]="getIframeUrl() | safe:'resourceUrl'" 
            class="w-full h-full bg-black border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowfullscreen>
          </iframe>
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

  constructor() {
    effect(() => {
      // Handle programmatic seek commands
      const seekTime = this.videoState.seekCommand();
      if (seekTime !== null && this.nativeVideoEl?.nativeElement) {
        this.nativeVideoEl.nativeElement.currentTime = seekTime;
        this.videoState.seekCommand.set(null); // clear command
      }
    });

    effect(() => {
      // Sync play/pause state
      const isPlaying = this.videoState.isPlaying();
      const video = this.nativeVideoEl?.nativeElement;
      if (video) {
        if (isPlaying && video.paused) {
          video.play().catch(e => console.warn('Auto-play prevented', e));
        } else if (!isPlaying && !video.paused) {
          video.pause();
        }
        
        // Handle Ambient Mode Extraction interval
        if (isPlaying) {
          this.startAmbientExtraction();
        } else {
          this.stopAmbientExtraction();
        }
      } else {
        this.stopAmbientExtraction();
      }
    });
  }

  // --- Ambient Mode: 1x1 Canvas Hack ---
  @ViewChild('ambientCanvas') ambientCanvas?: ElementRef<HTMLCanvasElement>;
  private ambientInterval: any;

  private startAmbientExtraction() {
    if (this.ambientInterval) return;
    this.ambientInterval = setInterval(() => this.extractAmbientColor(), 500); // 2 FPS
  }

  private stopAmbientExtraction() {
    if (this.ambientInterval) {
      clearInterval(this.ambientInterval);
      this.ambientInterval = null;
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

  getIframeUrl(): string {
    const video = this.videoState.activeVideo();
    if (!video) return '';
    // Use youtube-nocookie for privacy and autoplay=1
    return `https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0&modestbranding=1`;
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
