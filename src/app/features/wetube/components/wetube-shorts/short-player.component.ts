import { Component, input, inject, ElementRef, ViewChild, OnInit, OnDestroy, signal, effect, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Heart, MessageCircle, Share2, MoreVertical, Volume2, VolumeX, Play } from 'lucide-angular';
import { PipedApiService } from '../../../../core/services/piped-api.service';
import { VideoStateService } from '../../../../core/services/video-state.service';
import { ShortVideo } from '../../../../core/services/shorts-queue.service';

@Component({
  selector: 'app-short-player',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="short-container relative w-full h-full bg-slate-950 flex items-center justify-center overflow-hidden">
      
      @if (isActive()) {
        @if (isLoading()) {
          <div class="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
            <div class="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        }

        @if (streamUrl()) {
          <video 
            #videoElement
            [src]="streamUrl()"
            class="w-full h-full object-cover"
            [muted]="videoState.isShortsMuted()"
            [loop]="true"
            playsinline
            (click)="togglePlay()"
          ></video>
        } @else if (!isLoading()) {
          <div class="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/80">
            <p class="text-slate-400 text-sm">عذراً، تعذر تحميل الفيديو.</p>
          </div>
        }

        <!-- Play Overlay -->
        @if (!isPlaying() && streamUrl()) {
          <div class="absolute inset-0 z-20 flex items-center justify-center pointer-events-none bg-black/20">
            <div class="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center text-white backdrop-blur-md">
              <lucide-icon [img]="Play" class="w-8 h-8 ml-1"></lucide-icon>
            </div>
          </div>
        }
      } @else {
        <!-- Recycled Placeholder -->
        <div class="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center">
           <!-- Render nothing but background to save RAM -->
        </div>
      }

      <!-- UI Overlay -->
      <div class="absolute inset-0 z-30 pointer-events-none flex flex-col justify-between p-4">
        <!-- Top Bar (Mute Toggle) -->
        <div class="flex justify-end pointer-events-auto mt-16">
          <button 
            class="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition"
            (click)="toggleMute($event)"
          >
            <lucide-icon [img]="videoState.isShortsMuted() ? VolumeX : Volume2" class="w-5 h-5"></lucide-icon>
          </button>
        </div>

        <!-- Bottom Info & Right Actions -->
        <div class="flex items-end justify-between gap-4">
          
          <!-- Info -->
          <div class="flex-1 pointer-events-auto">
            <div class="flex items-center gap-2 mb-3">
              <img [src]="video().thumbnail || 'assets/placeholder.jpg'" class="w-10 h-10 rounded-full border border-white/20 object-cover">
              <span class="text-white font-bold text-sm drop-shadow-md">{{ video().author }}</span>
              <button class="bg-white text-black px-3 py-1 rounded-full text-xs font-bold ml-2">اشتراك</button>
            </div>
            <p class="text-white text-sm line-clamp-2 drop-shadow-md mb-2">{{ video().title }}</p>
          </div>

          <!-- Actions Sidebar -->
          <div class="flex flex-col gap-6 items-center pointer-events-auto pb-4">
            <button class="flex flex-col items-center gap-1 group">
              <div class="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white group-hover:text-red-500 transition">
                <lucide-icon [img]="Heart" class="w-6 h-6"></lucide-icon>
              </div>
              <span class="text-white text-xs font-bold drop-shadow-md">إعجاب</span>
            </button>
            
            <button class="flex flex-col items-center gap-1 group">
              <div class="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white group-hover:text-indigo-400 transition">
                <lucide-icon [img]="MessageCircle" class="w-6 h-6"></lucide-icon>
              </div>
              <span class="text-white text-xs font-bold drop-shadow-md">تعليق</span>
            </button>
            
            <button class="flex flex-col items-center gap-1 group">
              <div class="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white group-hover:text-green-400 transition">
                <lucide-icon [img]="Share2" class="w-6 h-6"></lucide-icon>
              </div>
              <span class="text-white text-xs font-bold drop-shadow-md">مشاركة</span>
            </button>
            
            <button class="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white transition">
              <lucide-icon [img]="MoreVertical" class="w-6 h-6"></lucide-icon>
            </button>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      scroll-snap-align: start;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShortPlayerComponent implements OnInit, OnDestroy {
  video = input.required<ShortVideo>();
  isActive = input.required<boolean>();
  
  videoState = inject(VideoStateService);
  private piped = inject(PipedApiService);
  private el = inject(ElementRef);

  @ViewChild('videoElement') videoEl?: ElementRef<HTMLVideoElement>;

  streamUrl = signal<string | null>(null);
  isLoading = signal<boolean>(true);
  isPlaying = signal<boolean>(false);

  private observer: IntersectionObserver | null = null;
  private hasLoadedStream = false;

  Heart = Heart;
  MessageCircle = MessageCircle;
  Share2 = Share2;
  MoreVertical = MoreVertical;
  Volume2 = Volume2;
  VolumeX = VolumeX;
  Play = Play;

  ngOnInit() {
    this.setupIntersectionObserver();
  }

  ngOnDestroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  private setupIntersectionObserver() {
    // 0.7 threshold: video must be 70% visible to play
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.onVisible();
        } else {
          this.onHidden();
        }
      });
    }, { threshold: 0.7 });

    this.observer.observe(this.el.nativeElement);
  }

  private async onVisible() {
    // Coordinate with Global Player
    this.videoState.notifyShortsStarted();

    if (!this.hasLoadedStream) {
      await this.loadStream();
    }
    
    this.playVideo();
  }

  private onHidden() {
    this.pauseVideo();
  }

  private async loadStream() {
    this.isLoading.set(true);
    try {
      const details = await this.piped.getVideoDetails(this.video().id);
      if (details.hls) {
        this.streamUrl.set(details.hls);
      } else {
        const combined = details.videoStreams.find(s => !s.videoOnly && s.mimeType.includes('mp4'));
        if (combined) {
          this.streamUrl.set(combined.url);
        } else if (details.videoStreams.length > 0) {
          this.streamUrl.set(details.videoStreams[0].url);
        }
      }
      this.hasLoadedStream = true;
    } catch (e) {
      console.error('Failed to load short stream', e);
    } finally {
      this.isLoading.set(false);
    }
  }

  togglePlay() {
    if (this.isPlaying()) {
      this.pauseVideo();
    } else {
      this.playVideo();
    }
  }

  toggleMute(event: Event) {
    event.stopPropagation();
    this.videoState.isShortsMuted.update(m => !m);
  }

  private playVideo() {
    const vid = this.videoEl?.nativeElement;
    if (vid) {
      vid.play().then(() => {
        this.isPlaying.set(true);
      }).catch(err => {
        console.warn('Autoplay prevented', err);
        // Browsers block autoplay of unmuted videos.
        // Even if we fail, we keep it paused until user interaction.
        this.isPlaying.set(false);
      });
    }
  }

  private pauseVideo() {
    const vid = this.videoEl?.nativeElement;
    if (vid) {
      vid.pause();
      this.isPlaying.set(false);
    }
  }
}
