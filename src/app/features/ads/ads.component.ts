import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { AdsService, Ad } from '../../core/ads.service';
import { WalletService } from '../../core/wallet.service';

@Component({
  selector: 'app-ads',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideDynamicIcon],
  templateUrl: './ads.component.html',
  styleUrls: ['./ads.component.scss']
})
export class AdsComponent {
  adsService = inject(AdsService);
  walletService = inject(WalletService);

  // States
  searchQuery = signal<string>('');
  selectedCategory = signal<string>('all');
  
  // Submission Form State
  isFormOpen = signal<boolean>(false);
  adTitle = signal<string>('');
  adDescription = signal<string>('');
  adImageUrl = signal<string>('');
  adLinkUrl = signal<string>('');
  adRewardAmount = signal<number>(15);
  adCategory = signal<string>('hardware');
  adCta = signal<string>('زيارة العرض الآن');
  adAdvertiserName = signal<string>('مطور العقدة');

  // Dialog Tracking for My Submissions
  isMySubmissionsOpen = signal<boolean>(false);

  // List of active categories
  categories = [
    { id: 'all', label: 'كل التصنيفات' },
    { id: 'hardware', label: 'معدات وأجهزة' },
    { id: 'education', label: 'كورسات وتعليم' },
    { id: 'services', label: 'خدمات سحابية' }
  ];

  // Computed Filtered Ads for the Public Billboard
  filteredAds = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const cat = this.selectedCategory();
    let list = this.adsService.ads().filter(ad => ad.status === 'active');

    if (query) {
      list = list.filter(ad => 
        ad.title.toLowerCase().includes(query) ||
        ad.description.toLowerCase().includes(query) ||
        ad.authorName.toLowerCase().includes(query)
      );
    }

    if (cat !== 'all') {
      list = list.filter(ad => ad.category === cat);
    }

    return list;
  });

  // Track User Specific Submissions (Active, Pending, Rejected)
  myAds = computed(() => {
    return this.adsService.ads().filter(ad => ad.authorId === 'current_user');
  });

  // Action: User reviews and clicks on Ad -> Earn rewards!
  claimReward(ad: Ad): void {
    this.adsService.recordClick(ad.id);
    alert(`🎉 تهانينا! لقد حصلت على مكافأة قدرها ${ad.rewardAmount} EGC لإطلاعك على العرض.`);
    
    // Redirect simulation
    if (ad.linkUrl) {
      window.open(ad.linkUrl, '_blank');
    }
  }

  // Action: Submit Ad proposal
  submitAdProposal(): void {
    if (!this.adTitle().trim() || !this.adDescription().trim()) return;

    this.adsService.submitAd(
      this.adTitle().trim(),
      this.adDescription().trim(),
      this.adImageUrl().trim(),
      this.adLinkUrl().trim(),
      this.adRewardAmount(),
      'feed', // Default type
      this.adCategory(),
      this.adAdvertiserName().trim(),
      false // requires administrative review
    );

    // Reset Form
    this.adTitle.set('');
    this.adDescription.set('');
    this.adImageUrl.set('');
    this.adLinkUrl.set('');
    this.adRewardAmount.set(15);
    this.isFormOpen.set(false);

    alert('✅ تم تقديم إعلانك بنجاح وهو قيد المراجعة الإدارية الآن.');
  }
}
