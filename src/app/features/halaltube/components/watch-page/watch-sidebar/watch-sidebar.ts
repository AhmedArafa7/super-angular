import { Component, inject, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit, effect, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { VideoStateService } from '../../../../../core/services/video-state.service';
import { ContextMenuService } from '../../../../../shared/components/context-menu/context-menu.service';
import { ContextMenuItem } from '../../../../../shared/components/context-menu/context-menu.model';
import { ToastService } from '../../../../../core/services/toast.service';
import { VideoDownloadService } from '../../../../../core/services/video-download.service';
import { IndexedDBService } from '../../../../../core/services/indexed-db.service';
import { LucideAngularModule, MoreVertical, ListPlus, BookmarkPlus, Download, Share2, VideoOff, Loader2 } from 'lucide-angular';

import { halaltubeService } from '../../../halaltube.service';

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
    
    for (const v of [...related, ...homeContent]) {
      const vId = this.getVideoId(v);
      if (vId && !seen.has(vId)) {
        seen.add(vId);
        combined.push(v);
      }
    }

    let videos = combined;
    const cat = this.activeCategory();
    const activeVid = this.videoState.activeVideo();
    
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
      this.currentPage.set(1);
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

  getThumbnail(video: any): string {
    if (video.thumbnail && video.thumbnail.startsWith('http')) {
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
    if (video.id && /^[a-zA-Z0-9_-]{11}$/.test(video.id)) return video.id;
    if (video.youtubeId) return video.youtubeId;
    if (video.url) {
      if (video.url.includes('?v=')) {
        return video.url.split('?v=')[1].split('&')[0];
      }
      if (video.url.includes('/watch/')) {
        return video.url.split('/watch/')[1].split('?')[0];
      }
      if (video.url.includes('youtu.be/')) {
        return video.url.split('youtu.be/')[1].split('?')[0];
      }
      if (/^[a-zA-Z0-9_-]{11}$/.test(video.url)) {
        return video.url;
      }
    }
    return video.id || video.url || '';
  }
}
