import { Component, input, inject, ElementRef, ViewChild, OnInit, OnDestroy, signal, effect, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { LucideAngularModule, Heart, MessageCircle, Share2, MoreVertical, Volume2, VolumeX, Play } from 'lucide-angular';
import { PipedApiService } from '../../../../core/services/piped-api.service';
import { VideoStateService } from '../../../../core/services/video-state.service';
import { ShortVideo } from '../../../../core/services/shorts-queue.service';
import { IndexedDBService } from '../../../../core/services/indexed-db.service';
import { halaltubeService } from '../../halaltube.service';
import { FirebaseService } from '../../../../core/services/firebase.service';
import { HalalAudioFilterService } from '../../../../core/services/halal-audio-filter.service';

@Component({
  selector: 'app-short-player',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="short-container relative w-full h-full bg-slate-950 flex items-center justify-center overflow-hidden">
      
      @if (isActive()) {
        @if (isLoading()) {
          <div class="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
            <div class="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        }

        @if (streamUrl() && !useIframeFallback()) {
          <video 
            #videoElement
            [src]="streamUrl()"
            class="w-full h-full object-cover"
            [loop]="true"
            playsinline
            (click)="togglePlay()"
          ></video>
        } @else if (useIframeFallback()) {
          <iframe 
            [src]="iframeUrl" 
            class="w-full h-full border-none pointer-events-auto" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerpolicy="strict-origin-when-cross-origin"
            allowfullscreen
          ></iframe>
        } @else if (!isLoading()) {
          <div class="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/80 gap-3">
            <p class="text-slate-400 text-sm">عذراً، تعذر تحميل الفيديو.</p>
            <button (click)="retryLoad()" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-xl text-xs">إعادة المحاولة</button>
          </div>
        }

        <!-- Play Overlay (for native video only) -->
        @if (!isPlaying() && streamUrl() && !useIframeFallback()) {
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
        <!-- Top Bar (Audio Filter & Mute Toggle) -->
        <div class="flex items-center justify-between pointer-events-auto mt-16 px-2">
          <!-- Audio Filter DSP Button -->
          <button 
            class="px-3 py-1.5 rounded-full backdrop-blur-md flex items-center gap-1.5 transition-all text-xs font-bold border shadow-lg"
            [ngClass]="audioFilter.isFilterActive() ? 'bg-emerald-500/30 text-emerald-300 border-emerald-500/50' : 'bg-black/40 text-white/70 border-white/10 hover:text-white'"
            (click)="audioFilter.toggleFilter(); $event.stopPropagation()"
            [title]="audioFilter.getModeLabel()">
            <span class="text-sm">🎧</span>
            <span class="text-[10px] font-black">{{ audioFilter.isFilterActive() ? 'عازل معازف نشط' : 'عازل المعازف' }}</span>
          </button>

          <!-- Mute Toggle -->
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
            
            <button class="flex flex-col items-center gap-1 group" (click)="openComments($event)">
              <div class="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white group-hover:text-indigo-400 transition">
                <lucide-icon [img]="MessageCircle" class="w-6 h-6"></lucide-icon>
              </div>
              <span class="text-white text-xs font-bold drop-shadow-md">تعليق</span>
            </button>
            
            <button class="flex flex-col items-center gap-1 group" (click)="shareShort($event)">
              <div class="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white group-hover:text-green-400 transition">
                <lucide-icon [img]="Share2" class="w-6 h-6"></lucide-icon>
              </div>
              <span class="text-white text-xs font-bold drop-shadow-md">مشاركة</span>
            </button>
            
            <button class="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white transition" (click)="openOptionsMenu($event)">
              <lucide-icon [img]="MoreVertical" class="w-6 h-6"></lucide-icon>
            </button>
          </div>
        </div>
      </div>

      <!-- Options Menu Modal -->
      @if (showOptionsMenu()) {
        <div class="absolute inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-6 pointer-events-auto animate-in fade-in" (click)="showOptionsMenu.set(false); showReportReason.set(false); reportReason.set('')" dir="rtl">
          <div class="bg-slate-900 border border-white/10 rounded-3xl p-6 w-full max-w-xs shadow-2xl flex flex-col gap-3 text-right" (click)="$event.stopPropagation()">
            <h3 class="text-white font-black text-base mb-2">خيارات الفيديو القصير</h3>

            @if (!showReportReason()) {
              <button (click)="whitelistCurrentVideo()" class="w-full bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 font-bold py-3 px-4 rounded-xl text-xs transition-colors border border-emerald-500/30 flex items-center justify-between">
                <span>إضافة للقائمة البيضاء</span>
                <span>✅</span>
              </button>
              <button (click)="showReportReason.set(true)" class="w-full bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 font-bold py-3 px-4 rounded-xl text-xs transition-colors border border-rose-500/30 flex items-center justify-between">
                <span>الإبلاغ عن هذا الفيديو</span>
                <span>🚫</span>
              </button>
              <button (click)="showOptionsMenu.set(false)" class="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors mt-2">
                إلغاء
              </button>
            } @else {
              <p class="text-white/70 text-xs mb-1">ما المشكلة في هذا الفيديو؟</p>
              <textarea
                [(ngModel)]="reportReason"
                class="w-full bg-slate-800 border border-white/10 rounded-xl p-3 text-white text-xs resize-none h-20 outline-none focus:border-indigo-500 transition"
                placeholder="اكتب سبب الإبلاغ..."
                maxlength="500"
              ></textarea>
              <div class="flex gap-2 mt-1">
                <button (click)="blacklistCurrentVideo()" class="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 rounded-xl text-xs transition-colors" [disabled]="!reportReason().trim()">
                  إرسال التقرير
                </button>
                <button (click)="showReportReason.set(false); reportReason.set('')" class="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-2.5 rounded-xl text-xs transition-colors">
                  رجوع
                </button>
              </div>
            }

          </div>
        </div>
      }

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
  readonly audioFilter = inject(HalalAudioFilterService);
  private piped = inject(PipedApiService);
  private idb = inject(IndexedDBService);
  private halaltube = inject(halaltubeService);
  private el = inject(ElementRef);
  private sanitizer = inject(DomSanitizer);
  private firebase = inject(FirebaseService);

  @ViewChild('videoElement') videoEl?: ElementRef<HTMLVideoElement>;

  streamUrl = signal<string | null>(null);
  isLoading = signal<boolean>(true);
  isPlaying = signal<boolean>(false);
  isLiked = signal<boolean>(false);
  isSubscribed = signal<boolean>(false);
  useIframeFallback = signal<boolean>(false);
  showOptionsMenu = signal<boolean>(false);
  showReportReason = signal<boolean>(false);
  reportReason = signal<string>('');

  private observer: IntersectionObserver | null = null;
  private hasLoadedStream = false;
  private savedCurrentTime = 0;
  private abortController: AbortController | null = null;

  Heart = Heart;
  MessageCircle = MessageCircle;
  Share2 = Share2;
  MoreVertical = MoreVertical;
  Volume2 = Volume2;
  VolumeX = VolumeX;
  Play = Play;

  constructor() {
    effect(() => {
      const muted = this.videoState.isShortsMuted();
      const vid = this.videoEl?.nativeElement;
      if (vid) {
        const ct = vid.currentTime;
        vid.muted = muted;
        if (Math.abs(vid.currentTime - ct) > 0.1) {
          vid.currentTime = ct;
        }
      }
    });

    effect(() => {
      const active = this.isActive();
      const vid = this.videoEl?.nativeElement;
      if (!active && vid) {
        this.savedCurrentTime = vid.currentTime;
        vid.pause();
        vid.src = '';
        vid.load();
        this.hasLoadedStream = false;
        this.streamUrl.set(null);
        this.isPlaying.set(false);
      }
    });
  }

  get iframeUrl(): SafeResourceUrl {
    const id = this.video().id;
    const mute = this.videoState.isShortsMuted() ? 1 : 0;
    const url = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=${mute}&playsinline=1&enablejsapi=1&rel=0`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  ngOnInit() {
    this.setupIntersectionObserver();
    this.checkLocalInteractions();
  }

  ngOnDestroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.cleanupStream();
  }

  private setupIntersectionObserver() {
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
    this.videoState.notifyShortsStarted();

    if (!this.hasLoadedStream) {
      await this.loadStream();
    }
    
    this.playVideo();
  }

  private onHidden() {
    const vid = this.videoEl?.nativeElement;
    if (vid) {
      this.savedCurrentTime = vid.currentTime;
      vid.pause();
      vid.src = '';
      vid.load();
      this.hasLoadedStream = false;
      this.streamUrl.set(null);
    }
    this.isPlaying.set(false);
  }

  private cleanupStream() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    const vid = this.videoEl?.nativeElement;
    if (vid) {
      this.savedCurrentTime = vid.currentTime;
      vid.pause();
      vid.src = '';
      vid.load();
    }
  }

  async loadStream(retryCount = 0) {
    this.isLoading.set(true);
    const v = this.video();

    // 1. Handle Local Videos or videos with direct MP4 URL
    if (v.source === 'local' || v.url || v.id.startsWith('local_')) {
      const src = v.url || '/videos/لماذا يجعلك الأكل ضعيفا ؟ - كيف يجعلك الجوع بصحة افضل(240P).mp4';
      console.log('[ShortPlayer] Playing local video stream:', src);
      this.streamUrl.set(src);
      this.useIframeFallback.set(false);
      this.hasLoadedStream = true;
      this.isLoading.set(false);
      return;
    }

    // 2. Validate YouTube Video ID format (standard 11 characters)
    const isYouTubeId = /^[a-zA-Z0-9_-]{11}$/.test(v.id);
    if (!isYouTubeId) {
      console.warn('[ShortPlayer] Invalid YouTube ID, falling back to default local video:', v.id);
      this.streamUrl.set('/videos/لماذا يجعلك الأكل ضعيفا ؟ - كيف يجعلك الجوع بصحة افضل(240P).mp4');
      this.useIframeFallback.set(false);
      this.hasLoadedStream = true;
      this.isLoading.set(false);
      return;
    }

    // 3. YouTube Shorts: Try Piped API for direct HTML5 video stream, fallback to iframe
    try {
      if (this.abortController) this.abortController.abort();
      this.abortController = new AbortController();

      console.log('[ShortPlayer] Attempting Piped stream fetch for YouTube ID:', v.id);
      const details = await this.piped.getVideoDetails(v.id);
      
      if (details?.hls) {
        this.streamUrl.set(details.hls);
        this.useIframeFallback.set(false);
      } else if (details?.videoStreams && details.videoStreams.length > 0) {
        const combined = details.videoStreams.find(s => !s.videoOnly) || details.videoStreams[0];
        if (combined?.url) {
          this.streamUrl.set(combined.url);
          this.useIframeFallback.set(false);
        } else {
          this.useIframeFallback.set(true);
        }
      } else {
        this.useIframeFallback.set(true);
      }
    } catch (e) {
      console.warn(`[ShortPlayer] Piped stream load failed for ${v.id}, using YouTube Embed fallback:`, e);
      this.useIframeFallback.set(true);
    } finally {
      this.hasLoadedStream = true;
      this.isLoading.set(false);
    }
  }

  retryLoad() {
    this.useIframeFallback.set(false);
    this.hasLoadedStream = false;
    this.loadStream(0);
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
    const nextMute = !this.videoState.isShortsMuted();
    this.videoState.isShortsMuted.set(nextMute);
    const vid = this.videoEl?.nativeElement;
    if (vid) {
      vid.muted = nextMute;
    }
  }

  private playVideo() {
    const vid = this.videoEl?.nativeElement;
    if (vid) {
      const ct = this.savedCurrentTime > 0 ? this.savedCurrentTime : vid.currentTime;
      if (ct > 0 && Math.abs(vid.currentTime - ct) > 0.5) {
        vid.currentTime = ct;
      }
      try {
        this.audioFilter.attachMediaElement(vid);
      } catch (e) {}
      vid.play().then(() => {
        this.isPlaying.set(true);
      }).catch(err => {
        console.warn('Autoplay prevented', err);
        this.isPlaying.set(false);
      });
    }
  }

  private pauseVideo() {
    const vid = this.videoEl?.nativeElement;
    if (vid) {
      this.savedCurrentTime = vid.currentTime;
      vid.pause();
      this.isPlaying.set(false);
    }
  }

  openComments(event: Event) {
    event.stopPropagation();
    this.displayToast('قسم التعليقات لهذا الفيديو القصير غير متوفر حالياً');
  }

  shareShort(event: Event) {
    event.stopPropagation();
    const url = window.location.origin + '/stream?v=' + this.video().id;
    if (navigator.share) {
      navigator.share({
        title: this.video().title,
        url: url
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        this.displayToast('تم نسخ رابط الفيديو القصير بنجاح!');
      }).catch(() => {});
    }
  }

  openOptionsMenu(event: Event) {
    event.stopPropagation();
    this.showOptionsMenu.set(true);
  }

  async whitelistCurrentVideo() {
    this.showOptionsMenu.set(false);
    try {
      await this.firebase.addVideoToWhitelist({
        id: this.video().id,
        title: this.video().title,
        url: `https://www.youtube.com/watch?v=${this.video().id}`,
        thumbnail: this.video().thumbnail,
        author: this.video().author,
        authorId: this.video().authorId,
        source: 'youtube',
        duration: '',
        views: 0
      });
      this.displayToast('تمت إضافة الفيديو إلى القائمة البيضاء ليراه الآخرون');
    } catch (e) {
      console.error('Failed to whitelist short', e);
      this.displayToast('فشل إضافة الفيديو للقائمة البيضاء');
    }
  }

  async blacklistCurrentVideo() {
    this.showOptionsMenu.set(false);
    const reason = this.reportReason().trim();
    const authorId = this.video().authorId || '';
    const authorName = this.video().author;
    this.reportReason.set('');
    this.showReportReason.set(false);

    try {
      await this.firebase.blacklistVideo(
        this.video().id,
        this.video().title,
        reason,
        authorId,
        authorName
      );
      this.displayToast('تم الإبلاغ عن الفيديو. شكراً لمساعدتك في تحسين المحتوى!');
    } catch (e) {
      console.error('Failed to blacklist video', e);
      this.displayToast('فشل الإبلاغ عن الفيديو، حاول مرة أخرى');
    }
  }

  private async checkLocalInteractions() {
    const vid = this.video();
    this.isSubscribed.set(this.halaltube.isSubscribedToChannel(vid.authorId, vid.author));

    const saved = await this.idb.get('saved_videos', vid.id);
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

      this.firebase.syncVideoLike(this.video().id, newState, {
        title: this.video().title,
        thumbnail: this.video().thumbnail,
        author: this.video().author
      });
    } catch (e) {
      console.error('Failed to sync like locally', e);
      this.isLiked.set(currentState);
    }
  }

  async toggleSubscription(event: Event) {
    event.stopPropagation();
    const currentState = this.isSubscribed();
    const vid = this.video();
    
    const channelId = vid.authorId || '';
    const channelTitle = vid.author || 'قناة';
    const avatarUrl = vid.thumbnail || '';

    const newState = await this.halaltube.toggleSubscription(channelId, channelTitle, avatarUrl);
    this.isSubscribed.set(newState);
  }

  private displayToast(message: string) {
    const toastEl = document.createElement('div');
    toastEl.className = 'frontend-toast fixed bottom-24 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur text-white px-4 py-2 rounded-full text-xs z-[100] transition-opacity duration-300 pointer-events-none';
    toastEl.innerText = message;
    document.body.appendChild(toastEl);
    setTimeout(() => {
      toastEl.style.opacity = '0';
      setTimeout(() => toastEl.remove(), 300);
    }, 2000);
  }
}
