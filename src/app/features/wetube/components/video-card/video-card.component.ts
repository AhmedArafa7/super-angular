import { Component, input, inject, signal, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, MoreVertical, ListPlus, Clock, FolderPlus, Download, Share2, Ban, UserX, Flag } from 'lucide-angular';
import { VideoStateService } from '../../../../core/services/video-state.service';
import { IndexedDBService } from '../../../../core/services/indexed-db.service';
import { FirebaseService } from '../../../../core/services/firebase.service';
import { VideoDownloadService } from '../../../../core/services/video-download.service';

@Component({
  selector: 'app-video-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    @if (!isHidden()) {
      <div class="video-card group cursor-pointer relative flex flex-col gap-3">
        <!-- Thumbnail Wrapper -->
        <div class="thumbnail-wrapper relative w-full rounded-xl overflow-hidden bg-slate-900 border border-white/5 transition-all duration-300 group-hover:shadow-xl group-hover:shadow-indigo-500/10 group-hover:-translate-y-1 aspect-video">
          <img crossorigin="anonymous" [src]="video().thumbnail || 'assets/placeholder.jpg'" [alt]="video().title" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy">
          
          @if (video().duration) {
            <span class="absolute bottom-2 left-2 bg-black/80 backdrop-blur-sm text-white px-1.5 py-0.5 rounded text-[10px] font-bold z-10">{{ video().duration }}</span>
          }

          <!-- Watched Progress Bar (YouTube style red bar at bottom) -->
          @if (getProgress() > 0) {
            <div class="absolute bottom-0 left-0 right-0 h-1 bg-black/40 z-20">
              <div class="h-full bg-red-600 transition-all duration-300" [style.width.%]="getProgress()"></div>
            </div>
          }
        </div>

        <!-- Info Section -->
        <div class="video-info flex gap-3 items-start px-1 relative">
          <img 
            crossorigin="anonymous" 
            [src]="getAvatarUrl()" 
            (error)="onAvatarError($event)"
            class="w-9 h-9 rounded-full bg-slate-800 border border-white/10 shrink-0 object-cover mt-0.5" 
            [alt]="video().author"
          >
          
          <div class="info-text flex flex-col min-w-0 flex-1">
            <h3 class="text-sm font-bold text-white leading-snug line-clamp-2 mb-1 group-hover:text-indigo-400 transition-colors">{{ video().title }}</h3>
            <p class="text-xs text-slate-400 font-medium truncate hover:text-slate-300">{{ video().author }}</p>
            <p class="text-[11px] text-slate-500 font-medium mt-0.5">
              @if (video().views) { <span>{{ video().views }} مشاهدة</span> }
              @if (video().time) { <span> • {{ video().time }}</span> }
            </p>
          </div>

          <!-- Three Dots Menu Button (⋮) -->
          <button 
            class="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition opacity-70 group-hover:opacity-100 shrink-0 relative"
            [class.opacity-100]="showMenu()"
            (click)="toggleMenu($event)"
            title="خيارات"
          >
            <lucide-icon [img]="MoreVertical" class="w-4 h-4"></lucide-icon>

            <!-- Popup Menu (YouTube Style) -->
            @if (showMenu()) {
              <div 
                class="absolute left-0 bottom-full mb-2 w-56 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl py-2 z-[9999] text-right flex flex-col text-xs text-slate-200 animate-in fade-in zoom-in-95 duration-150 cursor-default"
                (click)="$event.stopPropagation()"
                dir="rtl"
              >
                <button (click)="addToQueue($event)" class="flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 transition text-right">
                  <lucide-icon [img]="ListPlus" class="w-4 h-4 text-slate-400"></lucide-icon>
                  <span>الإضافة إلى قائمة المحتوى التالي</span>
                </button>
                <button (click)="saveToWatchLater($event)" class="flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 transition text-right">
                  <lucide-icon [img]="Clock" class="w-4 h-4 text-slate-400"></lucide-icon>
                  <span>الحفظ في قائمة "المشاهدة لاحقاً"</span>
                </button>
                <button (click)="saveToPlaylist($event)" class="flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 transition text-right">
                  <lucide-icon [img]="FolderPlus" class="w-4 h-4 text-slate-400"></lucide-icon>
                  <span>الحفظ في قائمة تشغيل</span>
                </button>
                <button (click)="downloadVideo($event)" class="flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 transition text-right">
                  <lucide-icon [img]="Download" class="w-4 h-4 text-slate-400"></lucide-icon>
                  <span>تنزيل</span>
                </button>
                <button (click)="shareVideo($event)" class="flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 transition text-right">
                  <lucide-icon [img]="Share2" class="w-4 h-4 text-slate-400"></lucide-icon>
                  <span>مشاركة</span>
                </button>
                <div class="my-1 border-t border-white/10"></div>
                <button (click)="notInterested($event)" class="flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 transition text-right">
                  <lucide-icon [img]="Ban" class="w-4 h-4 text-slate-400"></lucide-icon>
                  <span>لا يهمني</span>
                </button>
                <button (click)="blockChannel($event)" class="flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 transition text-right text-rose-400">
                  <lucide-icon [img]="UserX" class="w-4 h-4 text-rose-400"></lucide-icon>
                  <span>عدم اقتراح القناة</span>
                </button>
                <button (click)="reportVideo($event)" class="flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 transition text-right text-rose-400">
                  <lucide-icon [img]="Flag" class="w-4 h-4 text-rose-400"></lucide-icon>
                  <span>إبلاغ</span>
                </button>
              </div>
            }
          </button>
        </div>
      </div>
    }
  `
})
export class VideoCardComponent {
  video = input.required<any>();
  videoState = inject(VideoStateService);
  private idb = inject(IndexedDBService);
  private firebase = inject(FirebaseService);
  private downloadService = inject(VideoDownloadService);
  private el = inject(ElementRef);

  showMenu = signal<boolean>(false);
  isHidden = signal<boolean>(false);

  MoreVertical = MoreVertical;
  ListPlus = ListPlus;
  Clock = Clock;
  FolderPlus = FolderPlus;
  Download = Download;
  Share2 = Share2;
  Ban = Ban;
  UserX = UserX;
  Flag = Flag;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.el.nativeElement.contains(event.target)) {
      this.showMenu.set(false);
    }
  }

  toggleMenu(event: Event) {
    event.stopPropagation();
    this.showMenu.update(v => !v);
  }

  getAvatarUrl(): string {
    const v = this.video();
    if (v.channelAvatar) return v.channelAvatar;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(v.author || 'Channel')}&background=random&color=fff`;
  }

  onAvatarError(event: Event) {
    const imgEl = event.target as HTMLImageElement;
    imgEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(this.video().author || 'Channel')}&background=random&color=fff`;
  }

  isWatched(): boolean {
    const v = this.video();
    return this.videoState.watchedIds().has(v.id);
  }

  getProgress(): number {
    const v = this.video();
    return this.videoState.watchedProgress().get(v.id) || 0;
  }

  async addToQueue(event: Event) {
    event.stopPropagation();
    this.showMenu.set(false);
    this.displayToast('تمت الإضافة إلى قائمة المحتوى التالي');
  }

  async saveToWatchLater(event: Event) {
    event.stopPropagation();
    this.showMenu.set(false);
    const v = this.video();
    try {
      await this.idb.put('saved_videos', {
        videoId: v.id,
        title: v.title,
        thumbnail: v.thumbnail,
        author: v.author,
        watchLater: true,
        savedAt: Date.now()
      });
      this.displayToast('تم الحفظ في قائمة "المشاهدة لاحقاً"');
    } catch (e) {
      console.error('Failed to save to watch later', e);
      this.displayToast('فشل الحفظ في المشاهدة لاحقاً');
    }
  }

  async saveToPlaylist(event: Event) {
    event.stopPropagation();
    this.showMenu.set(false);
    this.displayToast('فتح قائمة التشغيل للحفظ...');
  }

  async downloadVideo(event: Event) {
    event.stopPropagation();
    this.showMenu.set(false);
    this.displayToast('جاري بدء التنزيل...');
    const v = this.video();
    try {
      await this.downloadService.downloadVideo(
        v.id,
        v.title,
        v.author,
        v.thumbnail
      );
    } catch (e) {
      this.displayToast('فشل تنزيل الفيديو');
    }
  }

  shareVideo(event: Event) {
    event.stopPropagation();
    this.showMenu.set(false);
    const url = window.location.origin + '/stream/watch/' + this.video().id;
    navigator.clipboard.writeText(url).then(() => {
      this.displayToast('تم نسخ رابط الفيديو إلى الحافظة!');
    }).catch(() => {
      this.displayToast('تعذر نسخ الرابط');
    });
  }

  notInterested(event: Event) {
    event.stopPropagation();
    this.showMenu.set(false);
    this.isHidden.set(true);
    this.displayToast('تمت إزالة الفيديو بناءً على اختيارك "لا يهمني"');
  }

  async blockChannel(event: Event) {
    event.stopPropagation();
    this.showMenu.set(false);
    const v = this.video();
    const authorId = v.authorId || v.author;
    try {
      await this.firebase.blacklistChannel(authorId, v.author);
      this.isHidden.set(true);
      this.displayToast(`تم إزالة اقتراحات قناة (${v.author})`);
    } catch (e) {
      console.error('Failed to blacklist channel', e);
      this.displayToast('فشل حظر القناة');
    }
  }

  async reportVideo(event: Event) {
    event.stopPropagation();
    this.showMenu.set(false);
    const v = this.video();
    try {
      await this.firebase.blacklistVideo(v.id, v.title, 'الإبلاغ السريع من بطاقة الفيديو', v.authorId, v.author);
      this.isHidden.set(true);
      this.displayToast('تم إبلاغ الإدارة عن الفيديو بنجاح');
    } catch (e) {
      console.error('Failed to report video', e);
      this.displayToast('فشل إرسال البلاغ');
    }
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
