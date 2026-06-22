import { Component, inject, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit, effect, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { VideoStateService } from '../../../../../core/services/video-state.service';
import { LucideAngularModule, MoreVertical, ListPlus, BookmarkPlus, Download, Share2, VideoOff, Loader2 } from 'lucide-angular';

@Component({
  selector: 'app-watch-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './watch-sidebar.html',
  styleUrls: ['./watch-sidebar.scss']
})
export class WatchSidebarComponent implements OnInit, OnDestroy, AfterViewInit {
  videoState = inject(VideoStateService);
  router = inject(Router);

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
  
  activeContextMenu = signal<string | null>(null);

  // Computed state for filtered and paginated videos
  filteredVideos = computed(() => {
    let videos = this.videoState.relatedVideos() || [];
    const cat = this.activeCategory();
    
    // Basic mock filtering since Piped API doesn't return explicit categories for related streams
    // We just shuffle or slice to simulate filtering
    if (cat === 'نفس القناة') {
       // Only videos from the same uploader if we had that data easily accessible in related streams
       // For now, we return a subset or just all.
       videos = videos.slice(0, Math.floor(videos.length / 2));
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

  toggleContextMenu(event: Event, videoId: string) {
    event.preventDefault();
    event.stopPropagation();
    if (this.activeContextMenu() === videoId) {
      this.activeContextMenu.set(null);
    } else {
      this.activeContextMenu.set(videoId);
    }
  }

  closeContextMenu() {
    this.activeContextMenu.set(null);
  }

  goToChannel(event: Event, channelId: string) {
    event.preventDefault();
    event.stopPropagation();
    if (channelId) {
      this.router.navigate(['/stream/channel', channelId]);
    }
  }

  getThumbnail(video: any): string {
    // Piped usually returns thumbnail directly.
    return video.thumbnail || `https://i.ytimg.com/vi/${video.url?.split('?v=')[1]}/hqdefault.jpg`;
  }
  
  getVideoId(video: any): string {
    if (video.url && video.url.includes('?v=')) {
      return video.url.split('?v=')[1];
    }
    return video.url;
  }
}
