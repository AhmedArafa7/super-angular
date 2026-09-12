import { Component, inject, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit, effect, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { VideoStateService } from '../../../../../core/services/video-state.service';
import { ContextMenuService } from '../../../../../shared/components/context-menu/context-menu.service';
import { ContextMenuItem } from '../../../../../shared/components/context-menu/context-menu.model';
import { ToastService } from '../../../../../core/services/toast.service';
import { VideoDownloadService } from '../../../../../core/services/video-download.service';
import { IndexedDBService } from '../../../../../core/services/indexed-db.service';
import { 
  LucideAngularModule, MoreVertical, ListPlus, BookmarkPlus, Download, Share2, 
  VideoOff, Loader2, ListVideo, Shuffle, Repeat, CheckCircle2, X, ChevronDown, 
  ChevronUp, Play, Check, Flame
} from 'lucide-angular';

import { halaltubeService } from '../../../halaltube.service';
import { HalaltubePlaylistService } from '../../../services/halaltube-playlist.service';
import { HalalPlaylistVideo } from '../../../models/halaltube-playlist.model';

@Component({
  selector: 'app-watch-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './watch-sidebar.html',
  styleUrls: ['./watch-sidebar.scss']
})
export class WatchSidebarComponent implements OnInit, OnDestroy, AfterViewInit {
  videoState = inject(VideoStateService);
  halaltube = inject(halaltubeService);
  playlistSvc = inject(HalaltubePlaylistService);
  router = inject(Router);
  contextMenu = inject(ContextMenuService);

  toast = inject(ToastService);
  downloadSvc = inject(VideoDownloadService);
  dbService = inject(IndexedDBService);

  // Icons
  MoreVertical = MoreVertical;
  ListPlus = ListPlus;
  BookmarkPlus = BookmarkPlus;
  Download = Download;
  Share2 = Share2;
  VideoOff = VideoOff;
  Loader2 = Loader2;
  ListVideo = ListVideo;
  Shuffle = Shuffle;
  Repeat = Repeat;
  CheckCircle2 = CheckCircle2;
  X = X;
  ChevronDown = ChevronDown;
  ChevronUp = ChevronUp;
  Play = Play;
  Check = Check;
  Flame = Flame;

  // Playlist Queue State
  isQueueExpanded = signal<boolean>(true);

  // Filtering
  categories = ['الكل', 'ذات صلة', 'نفس القناة', 'حديثاً'];
  activeCategory = signal('الكل');

  // Pagination / Infinite Scroll
  displayedVideos = signal<any[]>([]);
  currentPage = signal(1);
  readonly itemsPerPage = 10;
  
  @ViewChild('infiniteScrollTrigger') infiniteScrollTrigger!: ElementRef;
  private observer: IntersectionObserver | null = null;

  // Computed state for filtered and paginated videos
  filteredVideos = computed(() => {
    const related = this.videoState.relatedVideos() || [];
    const homeContent = this.halaltube.allHomeContent() || [];
    
    // Merge related videos first, then append global catalog for endless suggestions
    const seen = new Set<string>();
    const combined: any[] = [];
    
    // Exclude currently playing video so it does not appear in recommendations
    const activeVid = this.videoState.activeVideo();
    if (activeVid) {
      if (activeVid.id) seen.add(activeVid.id);
      const activeYt = this.getVideoId(activeVid);
      if (activeYt) seen.add(activeYt);
      if (activeVid.url) {
        const urlYt = this.extractYoutubeId(activeVid.url);
        if (urlYt) seen.add(urlYt);
      }
    }
    
    for (const v of [...related, ...homeContent]) {
      const vId = this.getVideoId(v);
      if (vId && !seen.has(vId)) {
        seen.add(vId);
        if (v.id) seen.add(v.id);
        combined.push(v);
      }
    }

    let videos = combined;
    const cat = this.activeCategory();
    
    if (cat === 'نفس القناة') {
       if (activeVid?.author) {
         const authorNorm = activeVid.author.trim().toLowerCase();
         const authorMatches = videos.filter(v => {
           const vAuthor = (v.author || v.uploaderName || '').trim().toLowerCase();
           return vAuthor === authorNorm || vAuthor.includes(authorNorm) || authorNorm.includes(vAuthor);
         });
         if (authorMatches.length > 0) {
           videos = authorMatches;
         }
       }
    } else if (cat === 'ذات صلة') {
        const vidCat = (activeVid as any)?.category;
        if (vidCat) {
          const catNorm = vidCat.trim().toLowerCase();
          const catMatches = videos.filter(v => (v.category || '').trim().toLowerCase() === catNorm);
          if (catMatches.length > 0) {
            videos = catMatches;
          }
        }
    } else if (cat === 'حديثاً') {
       videos = [...videos].sort((a, b) => {
         const timeA = new Date(a.time || a.uploadedDate || 0).getTime();
         const timeB = new Date(b.time || b.uploadedDate || 0).getTime();
         return timeB - timeA;
       });
    }
    return videos;
  });

  constructor() {
    effect(() => {
      const filtered = this.filteredVideos();
      const page = this.currentPage();
      // When filtered videos or page changes, update displayed videos
      const itemsToShow = filtered.slice(0, page * this.itemsPerPage);
      this.displayedVideos.set(itemsToShow);
    }, { allowSignalWrites: true });

    effect(() => {
      // Reset pagination when related videos completely change (e.g. new video loaded)
      this.videoState.relatedVideos();
      if (this.currentPage() !== 1) {
        this.currentPage.set(1);
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit() {}

  ngAfterViewInit() {
    this.setupIntersectionObserver();
  }

  ngOnDestroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  setupIntersectionObserver() {
    const options = {
      root: null,
      rootMargin: '100px',
      threshold: 0.1
    };

    this.observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        this.loadMore();
      }
    }, options);

    if (this.infiniteScrollTrigger) {
      this.observer.observe(this.infiniteScrollTrigger.nativeElement);
    }
  }

  loadMore() {
    const totalFiltered = this.filteredVideos().length;
    const currentDisplayed = this.displayedVideos().length;
    
    if (currentDisplayed < totalFiltered) {
      this.currentPage.update(p => p + 1);
    } else if (this.halaltube.hasMoreFeed() && !this.halaltube.isFeedLoading()) {
      this.halaltube.loadMoreTrending().then(() => {
        this.currentPage.update(p => p + 1);
      });
    }
  }

  setCategory(category: string) {
    this.activeCategory.set(category);
    this.currentPage.set(1);
  }

  // Playlist Queue Actions
  playQueueVideo(video: HalalPlaylistVideo) {
    const playlist = this.playlistSvc.activePlaylist();
    if (!playlist) return;

    const idx = this.playlistSvc.activeQueue().findIndex(v => v.id === video.id);
    if (idx >= 0) {
      this.playlistSvc.currentQueueIndex.set(idx);
    }

    this.router.navigate(['/stream/watch', video.id], {
      queryParams: { list: playlist.id }
    });
  }

  async toggleWatched(video: HalalPlaylistVideo, event: Event) {
    event.stopPropagation();
    const playlist = this.playlistSvc.activePlaylist();
    if (!playlist) return;

    await this.playlistSvc.toggleVideoWatched(playlist.id, video.id);
  }

  toggleAutoplay() {
    this.playlistSvc.isAutoplay.update(v => !v);
    this.toast.show(this.playlistSvc.isAutoplay() ? 'تم تفعيل التشغيل التلقائي للتالي ▶️' : 'تم إيقاف التشغيل التلقائي', 'info');
  }

  toggleLoop() {
    this.playlistSvc.isLoop.update(v => !v);
    this.toast.show(this.playlistSvc.isLoop() ? 'تم تفعيل تكرار القائمة 🔁' : 'تم إيقاف تكرار القائمة', 'info');
  }

  toggleShuffle() {
    this.playlistSvc.isShuffle.update(v => !v);
    const playlist = this.playlistSvc.activePlaylist();
    if (playlist) {
      this.playlistSvc.initQueue(playlist.id, this.videoState.activeVideo()?.id);
      this.toast.show(this.playlistSvc.isShuffle() ? 'تم تفعيل الخلط العشوائي 🔀' : 'تم إيقاف الخلط العشوائي', 'info');
    }
  }

  dismissQueue() {
    this.playlistSvc.activePlaylist.set(null);
    this.playlistSvc.activeQueue.set([]);
    this.playlistSvc.currentQueueIndex.set(-1);
    this.router.navigate([], {
      queryParams: { list: null },
      queryParamsHandling: 'merge'
    });
  }

  toggleContextMenu(event: MouseEvent, videoId: string) {
    const targetVideo = this.displayedVideos().find(v => this.getVideoId(v) === videoId);
    const items: ContextMenuItem[] = [
      { id: 'add-queue', label: 'إضافه للقائمة', icon: this.ListPlus, action: () => {
        this.toast.show('تمت إضافة الفيديو إلى قائمة التشغيل المؤقتة 📋', 'success');
      }},
      { id: 'watch-later', label: 'مشاهدة لاحقاً', icon: this.BookmarkPlus, action: async () => {
        if (targetVideo) {
          await this.dbService.put('saved_videos', {
            id: targetVideo.id || videoId,
            title: targetVideo.title,
            author: targetVideo.author || targetVideo.uploaderName,
            thumbnail: this.getThumbnail(targetVideo),
            savedAt: Date.now()
          });
          this.toast.show('تمت إضافة الفيديو إلى قائمة مشاهدة لاحقاً 📌', 'success');
        }
      }},
      { id: 'div1', label: '', isDivider: true },
      { id: 'share', label: 'مشاركة', icon: this.Share2, action: () => {
        const shareUrl = `${window.location.origin}/stream/watch/${videoId}`;
        navigator.clipboard.writeText(shareUrl);
        this.toast.show('تم نسخ رابط الفيديو إلى الحافظة 🔗', 'success');
      }},
      { id: 'download', label: 'تنزيل', icon: this.Download, action: () => {
        if (targetVideo) {
          this.downloadSvc.downloadVideo(targetVideo.id || videoId, targetVideo.title, targetVideo.author || targetVideo.uploaderName, this.getThumbnail(targetVideo));
          this.toast.show('بدء تنزيل الفيديو لحفظه أوفلاين 📥', 'success');
        }
      }},
      { id: 'div2', label: '', isDivider: true },
      { id: 'not-interested', label: 'لا يهمني', icon: this.VideoOff, danger: true, action: () => {
        this.halaltube.reportedVideoIds.update(set => {
          const newSet = new Set(set);
          newSet.add(videoId);
          return newSet;
        });
        this.toast.show('تم إخفاء هذا الفيديو ولن يتم اقتراحه مجدداً 🚫', 'info');
      }}
    ];
    this.contextMenu.openAttached(event.currentTarget as HTMLElement, items);
  }

  closeContextMenu() {
    this.contextMenu.close();
  }

  goToChannel(event: Event, channelId: string) {
    event.preventDefault();
    event.stopPropagation();
    if (channelId) {
      this.router.navigate(['/stream/channel', channelId]);
    }
  }

  onSelectVideo(video: any, event?: Event) {
    if (event) {
      const target = event.target as HTMLElement;
      // Do not navigate if clicking channel name or context menu trigger
      if (target.closest('button') || target.closest('[data-channel]')) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
    }

    const videoId = this.getVideoId(video);
    if (!videoId) return;

    // Smoothly scroll window to top
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    this.router.navigate(['/stream/watch', videoId]);
  }

  formatViews(views: any): string {
    if (views === null || views === undefined || views === '') return '0 مشاهدة';
    if (typeof views === 'string') {
      if (views.includes('مشاهدة')) return views;
      const clean = views.trim();
      if (clean.includes('M') || clean.includes('K') || clean.includes('B')) {
        return `${clean} مشاهدة`;
      }
      const num = Number(clean.replace(/[^0-9.]/g, ''));
      if (isNaN(num) || num === 0) return `${clean} مشاهدة`;
      return `${num.toLocaleString('ar-EG')} مشاهدة`;
    }
    if (typeof views === 'number') {
      return `${views.toLocaleString('ar-EG')} مشاهدة`;
    }
    return `${views} مشاهدة`;
  }

  formatDuration(duration: any): string {
    if (!duration) return '';
    if (typeof duration === 'string' && duration.includes(':')) return duration;
    const sec = Number(duration);
    if (!isNaN(sec) && sec > 0) {
      const m = Math.floor(sec / 60);
      const s = Math.floor(sec % 60);
      return `${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return String(duration);
  }

  extractYoutubeId(str?: string): string | null {
    if (!str || typeof str !== 'string') return null;
    if (str.length === 11 && /^[a-zA-Z0-9_-]{11}$/.test(str)) return str;
    const match = str.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([^&?\n]+)/);
    return (match && match[1] && match[1].length === 11) ? match[1] : null;
  }

  getThumbnail(video: any): string {
    if (video.thumbnail && typeof video.thumbnail === 'string' && video.thumbnail.startsWith('http') && !video.thumbnail.includes('placeholder')) {
      return video.thumbnail;
    }
    const id = this.getVideoId(video);
    if (id && !id.startsWith('/') && !id.startsWith('http') && /^[a-zA-Z0-9_-]{11}$/.test(id)) {
      return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
    }
    return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800';
  }
  
  getVideoId(video: any): string {
    if (!video) return '';
    if (typeof video === 'string') {
      return this.extractYoutubeId(video) || video;
    }
    // 1. Explicit youtubeId
    if (video.youtubeId && /^[a-zA-Z0-9_-]{11}$/.test(video.youtubeId)) {
      return video.youtubeId;
    }
    // 2. Extract from URL fields
    for (const field of [video.url, video.externalUrl, video.sourceUrl, video.embedUrl]) {
      const yt = this.extractYoutubeId(field);
      if (yt) return yt;
    }
    // 3. Direct 11-char ID
    if (video.id && /^[a-zA-Z0-9_-]{11}$/.test(video.id)) {
      return video.id;
    }
    // 4. Drive file ID
    if (video.driveFileId) {
      return video.driveFileId;
    }
    // 5. Fallback to docId, id, or url
    return video.id || (video as any).docId || video.url || '';
  }
}
