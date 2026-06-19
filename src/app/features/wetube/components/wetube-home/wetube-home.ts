import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { WeTubeService } from '../../wetube.service';
import { FirebaseService } from '../../../../core/services/firebase.service';
import { WETUBE_CATEGORIES } from '../../wetube.model';
import { SubscriptionBarComponent } from '../shared/subscription-bar/subscription-bar';
import { NexusNativeAdsComponent } from '../nexus-native-ads/nexus-native-ads';
import { LucideAngularModule, Sparkles, TrendingUp, Search, ArrowLeft } from 'lucide-angular';

@Component({
  selector: 'app-wetube-home',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule, SubscriptionBarComponent, NexusNativeAdsComponent],
  templateUrl: './wetube-home.html',
  styleUrls: ['./wetube-home.scss']
})
export class WeTubeHomeComponent implements OnInit {
  wetube = inject(WeTubeService);
  firebaseService = inject(FirebaseService);
  router = inject(Router);

  categories = WETUBE_CATEGORIES;
  showUploadModal = signal(false);
  showOnboardingBanner = signal(false);

  Sparkles = Sparkles;
  TrendingUp = TrendingUp;
  Search = Search;
  ArrowLeft = ArrowLeft;

  needsOnboarding = computed(() => {
    const userData = this.firebaseService.userData();
    return !!(userData && userData.onboardingComplete !== true);
  });

  ngOnInit() {
    if (this.needsOnboarding() && this.wetube.allHomeContent().length === 0) {
      this.router.navigate(['/stream/onboarding']);
      return;
    }
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
}
