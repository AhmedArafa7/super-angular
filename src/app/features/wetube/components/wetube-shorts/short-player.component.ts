import { Component, input, inject, ElementRef, ViewChild, OnInit, OnDestroy, signal, effect, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Heart, MessageCircle, Share2, MoreVertical, Volume2, VolumeX, Play } from 'lucide-angular';
import { PipedApiService } from '../../../../core/services/piped-api.service';
import { VideoStateService } from '../../../../core/services/video-state.service';
import { ShortVideo } from '../../../../core/services/shorts-queue.service';
import { IndexedDBService } from '../../../../core/services/indexed-db.service';
import { WeTubeService } from '../../wetube.service';

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
              <img crossorigin="anonymous" [src]="video().thumbnail || 'assets/placeholder.jpg'" class="w-10 h-10 rounded-full border border-white/20 object-cover">
              <span class="text-white font-bold text-sm drop-shadow-md">{{ video().author }}</span>
              <button 
                class="px-3 py-1 rounded-full text-xs font-bold ml-2 transition-all"
                [ngClass]="isSubscribed() ? 'bg-white/20 text-white' : 'bg-white text-black'"
                (click)="toggleSubscription($event)">
                {{ isSubscribed() ? 'تمت المتابعة' : 'متابعة' }}
              </button>
            </div>
            <p class="text-white text-sm line-clamp-2 drop-shadow-md mb-2">{{ video().title }}</p>
          </div>

          <!-- Actions Sidebar -->
          <div class="flex flex-col gap-6 items-center pointer-events-auto pb-4">
            <button class="flex flex-col items-center gap-1 group" (click)="toggleLike($event)">
              <div class="w-12 h-12 rounded-full backdrop-blur-md flex items-center justify-center transition-all shadow-lg"
                [ngClass]="isLiked() ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-black/40 text-white hover:text-red-400 hover:bg-black/60'">
                <lucide-icon [img]="Heart" class="w-6 h-6" [class.fill-current]="isLiked()"></lucide-icon>
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
  private idb = inject(IndexedDBService);
  private wetube = inject(WeTubeService);
  private el = inject(ElementRef);

  @ViewChild('videoElement') videoEl?: ElementRef<HTMLVideoElement>;

  streamUrl = signal<string | null>(null);
  isLoading = signal<boolean>(true);
  isPlaying = signal<boolean>(false);
  isLiked = signal<boolean>(false);
  isSubscribed = signal<boolean>(false);
  showToast = signal<{message: string, visible: boolean}>({ message: '', visible: false });

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
    this.checkLocalInteractions();
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
    this.videoState.isShortsMuted.set(!this.videoState.isShortsMuted());
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

  // --- Local Sync Interactions ---
  
  private async checkLocalInteractions() {
    // Check Subscription
    const subs = await this.idb.getAll('subscriptions') || [];
    const targetId = this.video().authorId || this.video().author;
    if (subs.some(s => s.channelId === targetId)) {
      this.isSubscribed.set(true);
    }

    // Check Like
    const saved = await this.idb.get('saved_videos', this.video().id);
    if (saved) {
      this.isLiked.set(true);
    }
  }

  async toggleLike(event: Event) {
    event.stopPropagation();
    const currentState = this.isLiked();
    const newState = !currentState;
    this.isLiked.set(newState);

    try {
      if (newState) {
        await this.idb.put('saved_videos', {
          videoId: this.video().id,
          title: this.video().title,
          thumbnail: this.video().thumbnail,
          author: this.video().author,
          authorId: this.video().authorId,
          savedAt: Date.now()
        });
        this.displayToast('تم تسجيل الإعجاب (حفظ محلياً)');
      } else {
        await this.idb.delete('saved_videos', this.video().id);
        this.displayToast('تمت إزالة الإعجاب');
      }
    } catch (e) {
      console.error('Failed to sync like locally', e);
      this.isLiked.set(currentState);
    }
  }

  async toggleSubscription(event: Event) {
    event.stopPropagation();
    const currentState = this.isSubscribed();
    const newState = !currentState;
    this.isSubscribed.set(newState);

    const targetId = this.video().authorId || this.video().author;

    try {
      if (newState) {
        const newSub = { 
          id: targetId, 
          channelId: targetId, 
          channelTitle: this.video().author, 
          avatarUrl: this.video().thumbnail || '', 
          subscribedAt: Date.now() 
        };
        await this.idb.put('subscriptions', newSub);
        this.displayToast('تم الاشتراك بالقناة (حفظ محلياً)');
      } else {
        await this.idb.delete('subscriptions', targetId);
        this.displayToast('تم إلغاء الاشتراك');
      }
      // Force refresh wetube service subscriptions array if needed
      this.wetube.loadMySubscriptions(true);
    } catch (e) {
      console.error('Failed to sync subscription locally', e);
      this.isSubscribed.set(currentState);
    }
  }

  private displayToast(message: string) {
    // Basic toast, you can replace with a real Toast service
    const toastEl = document.createElement('div');
    toastEl.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur text-white px-4 py-2 rounded-full text-xs z-[100] transition-opacity duration-300 pointer-events-none';
    toastEl.innerText = message;
    document.body.appendChild(toastEl);
    setTimeout(() => {
      toastEl.style.opacity = '0';
      setTimeout(() => toastEl.remove(), 300);
    }, 2000);
  }
}
