import { Component, inject, signal, OnInit, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { WeTubeService } from '../../wetube.service';
import { FirebaseService } from '../../../../core/services/firebase.service';
import { WETUBE_CATEGORIES } from '../../wetube.model';
import { SubscriptionBarComponent } from '../shared/subscription-bar/subscription-bar';
import { NexusNativeAdsComponent } from '../nexus-native-ads/nexus-native-ads';
import { LucideAngularModule, Sparkles, TrendingUp, Search, ArrowLeft, Youtube, RefreshCcw, LogIn, Video } from 'lucide-angular';

@Component({
  selector: 'app-wetube-home',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule, SubscriptionBarComponent, NexusNativeAdsComponent],
  templateUrl: './wetube-home.html',
  styleUrls: ['./wetube-home.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block h-full'
  }
})
export class WeTubeHomeComponent implements OnInit {
  wetube = inject(WeTubeService);
  firebaseService = inject(FirebaseService);
  router = inject(Router);
  route = inject(ActivatedRoute);

  categories = WETUBE_CATEGORIES;
  showUploadModal = signal(false);
  showOnboardingBanner = signal(false);

  searchFilters = [
    { label: "الكل", sp: "" },
    { label: "آخر ساعة", sp: "EgIIAQ%3D%3D" },
    { label: "اليوم", sp: "EgQIAhAB" },
    { label: "هذا الأسبوع", sp: "EgQIAxAB" },
    { label: "قنوات", sp: "EgIQAg%3D%3D" },
    { label: "قوائم تشغيل", sp: "EgIQAw%3D%3D" },
    { label: "أفلام", sp: "EgIQBA%3D%3D" },
    { label: "قصير (<4د)", sp: "EgQYAXAB" },
    { label: "طويل (>20د)", sp: "EgQYAnAB" },
  ];

  visibleCount = signal(20);
  private observer: IntersectionObserver | null = null;
  selectedChannelId = signal<string | null>(null);

  Sparkles = Sparkles;
  TrendingUp = TrendingUp;
  Search = Search;
  ArrowLeft = ArrowLeft;
  Youtube = Youtube;
  RefreshCcw = RefreshCcw;
  LogIn = LogIn;
  Video = Video;

  needsOnboarding = computed(() => {
    const userData = this.firebaseService.userData();
    return !!(userData && userData.onboardingComplete !== true);
  });

  ngOnInit() {
    if (this.needsOnboarding() && this.wetube.allHomeContent().length === 0) {
      this.router.navigate(['/stream/onboarding']);
      return;
    }
    this.checkOnboardingStatus();
    
    setTimeout(() => {
      this.setupIntersectionObserver();
    }, 1000);

    this.route.queryParams.subscribe(params => {
      if (params['channel']) {
        this.selectedChannelId.set(params['channel']);
        this.wetube.setActiveTab('home');
      }
    });

    this.wetube.initialize();
  }

  extractYoutubeId(urlOrId: string): string | null {
    if (!urlOrId) return null;
    if (urlOrId.length === 11 && /^[a-zA-Z0-9_-]{11}$/.test(urlOrId)) return urlOrId;
    const match = urlOrId.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?\n]+)/);
    return match ? match[1] : null;
  }

  getSafeThumbnail(video: any): string {
    const isYoutube = video.source === 'youtube' || (video.externalUrl && video.externalUrl.includes('youtube')) || (video.url && video.url.includes('youtube'));
    if (isYoutube) {
       const ytId = this.extractYoutubeId(video.externalUrl || video.url || video.id);
       if (ytId) return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
    }
    return video.thumbnail || 'assets/placeholder.jpg';
  }

  ngOnDestroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  private setupIntersectionObserver() {
    const options = {
      root: document.querySelector('.main-content'),
      rootMargin: '100px',
      threshold: 0.1
    };

    this.observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        this.loadMore();
      }
    }, options);

    const target = document.querySelector('#infinite-scroll-trigger');
    if (target) {
      this.observer.observe(target);
    }
  }

  loadMore() {
    const currentCount = this.visibleCount();
    const totalItems = this.wetube.allHomeContent().length;
    
    if (currentCount < totalItems) {
      // Simulate slight network delay for smooth UI
      setTimeout(() => {
        this.visibleCount.set(currentCount + 20);
      }, 100);
    } else if (this.wetube.hasMoreFeed() && !this.wetube.isFeedLoading()) {
      this.wetube.loadMoreTrending().then(() => {
        this.visibleCount.set(this.wetube.allHomeContent().length);
      });
    }
  }

  private checkOnboardingStatus() {
    if (this.needsOnboarding() && this.wetube.allHomeContent().length === 0) {
      this.router.navigate(['/stream/onboarding']);
    }
  }

  onCategoryClick(category: string) {
    this.wetube.setActiveCategory(category);
    if (category === 'الكل') {
      this.wetube.setSearchQuery('');
      this.wetube.searchSp.set('');
    } else if (category !== 'تريند') {
      this.wetube.search(category);
    }
  }

  onSearchFilterClick(sp: string) {
    const query = this.wetube.searchQuery();
    if (query) {
      this.wetube.search(query, sp);
    }
  }

  openUpload() {
    this.showUploadModal.set(true);
  }

  goToOnboarding() {
    this.router.navigate(['/stream/onboarding']);
  }

  trackByVideoId(index: number, video: any): string {
    return video.id || index.toString();
  }
}
