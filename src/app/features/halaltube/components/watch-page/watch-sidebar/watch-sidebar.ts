import { Component, inject, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit, effect, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { VideoStateService } from '../../../../../core/services/video-state.service';
import { ContextMenuService } from '../../../../../shared/components/context-menu/context-menu.service';
import { ContextMenuItem } from '../../../../../shared/components/context-menu/context-menu.model';
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
    let videos = this.videoState.relatedVideos() || [];
    if (!videos || videos.length === 0) {
      videos = this.halaltube.allHomeContent() || [];
    }
    const cat = this.activeCategory();
    
    if (cat === 'نفس القناة') {
       videos = videos.slice(0, Math.max(2, Math.floor(videos.length / 2)));
    } else if (cat === 'حديثاً') {
       videos = [...videos].reverse();
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
    }
  }

  setCategory(category: string) {
    this.activeCategory.set(category);
    this.currentPage.set(1);
  }

  toggleContextMenu(event: MouseEvent, videoId: string) {
    const items: ContextMenuItem[] = [
      { id: 'add-queue', label: 'إضافه للقائمة', icon: this.ListPlus, action: () => console.log('Add to queue', videoId) },
      { id: 'watch-later', label: 'مشاهدة لاحقاً', icon: this.BookmarkPlus, action: () => console.log('Watch later', videoId) },
      { id: 'div1', label: '', isDivider: true },
      { id: 'share', label: 'مشاركة', icon: this.Share2, action: () => console.log('Share', videoId) },
      { id: 'download', label: 'تنزيل', icon: this.Download, action: () => console.log('Download', videoId) },
      { id: 'div2', label: '', isDivider: true },
      { id: 'not-interested', label: 'لا يهمني', icon: this.VideoOff, danger: true, action: () => console.log('Not interested', videoId) }
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
    if (id && !id.startsWith('/') && !id.startsWith('http')) {
      return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
    }
    return 'assets/placeholder-video.jpg';
  }
  
  getVideoId(video: any): string {
    // Handle ?v= format: /watch?v=VIDEO_ID
    if (video.url?.includes('?v=')) {
      return video.url.split('?v=')[1].split('&')[0];
    }
    // Handle /watch/VIDEO_ID format (Piped)
    if (video.url?.includes('/watch/')) {
      return video.url.split('/watch/')[1].split('?')[0];
    }
    // Handle youtu.be/VIDEO_ID format
    if (video.url?.includes('youtu.be/')) {
      return video.url.split('youtu.be/')[1].split('?')[0];
    }
    // Handle direct ID (11 chars)
    if (video.url && /^[a-zA-Z0-9_-]{11}$/.test(video.url)) {
      return video.url;
    }
    return video.id || video.url || '';
  }
}
