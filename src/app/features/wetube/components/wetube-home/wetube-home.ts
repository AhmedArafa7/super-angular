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

    this.route.queryParams.subscribe(params => {
      if (params['channel']) {
        this.selectedChannelId.set(params['channel']);
        this.wetube.setActiveTab('home');
      }
    });

    this.wetube.initialize();
  }

  onCategoryClick(category: string) {
    this.wetube.setActiveCategory(category);
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
