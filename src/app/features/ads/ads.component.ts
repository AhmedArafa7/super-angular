import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { AdsService, Ad, ADS_CATEGORIES, AdCategoryDefinition } from '../../core/ads.service';
import { WalletService } from '../../core/wallet.service';
import { ToastService } from '../../core/services/toast.service';
import { FirebaseService } from '../../core/services/firebase.service';

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
  toast = inject(ToastService);
  private firebaseService = inject(FirebaseService);
  private router = inject(Router);

  // Categories definition
  categories: AdCategoryDefinition[] = ADS_CATEGORIES;

  // Search input query
  searchQuery = signal<string>('');
  selectedCategory = signal<string>('all');

  // Dialog states
  isCreateModalOpen = signal<boolean>(false);
  isMyAdsModalOpen = signal<boolean>(false);
  selectedAdDetails = signal<Ad | null>(null);

  // Create Ad Form State
  newTitle = '';
  newDesc = '';
  newCategory = 'tech_services';
  newImageUrl = '';
  newLinkUrl = '';
  newCta = 'زيارة العرض الآن 🚀';
  newRewardAmount = 20;
  newDurationDays = 30;
  newAuthorName = 'أحمد عرفه (أنت)';
  newBadge = 'عرض مميز 🔥';

  // Preset Banners for quick aesthetics
  presetBanners = [
    { label: 'سحابة وسيرفرات', url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=800&auto=format&fit=crop' },
    { label: 'ذكاء اصطناعي', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop' },
    { label: 'عتاد ومتحكمات', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=800&auto=format&fit=crop' },
    { label: 'أمن سيبراني', url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=800&auto=format&fit=crop' },
    { label: 'برمجة وتطوير', url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=800&auto=format&fit=crop' },
    { label: 'تصميم وجرافيك', url: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=800&auto=format&fit=crop' }
  ];

  get currentUserId(): string {
    return this.firebaseService.getUserId() || 'ahmed_arafa';
  }

  // Filtered Billboard Ads
  filteredAds = computed(() => {
    const list = this.adsService.ads();
    const cat = this.selectedCategory();
    const query = this.searchQuery().toLowerCase().trim();

    return list.filter(ad => {
      // 1. Status
      if (ad.status !== 'active') return false;

      // 2. Category
      if (cat !== 'all' && ad.category !== cat) return false;

      // 3. Search query
      if (query) {
        const matchTitle = ad.title.toLowerCase().includes(query);
        const matchDesc = ad.description.toLowerCase().includes(query);
        const matchAuthor = ad.authorName.toLowerCase().includes(query);
        const matchCat = (ad.categoryLabel || '').toLowerCase().includes(query);
        const matchTags = ad.tags?.some(t => t.toLowerCase().includes(query));
        if (!matchTitle && !matchDesc && !matchAuthor && !matchCat && !matchTags) return false;
      }

      return true;
    });
  });

  // User's own submitted ads
  myAds = computed(() => {
    const userId = this.currentUserId;
    return this.adsService.ads().filter(ad => ad.authorId === userId || ad.authorId === 'current_user' || ad.authorId === 'ahmed_arafa');
  });

  // Open Create Ad Modal
  openCreateModal(): void {
    this.newTitle = '';
    this.newDesc = '';
    this.newCategory = 'tech_services';
    this.newImageUrl = this.presetBanners[0].url;
    this.newLinkUrl = '/market';
    this.newCta = 'زيارة العرض الآن 🚀';
    this.newRewardAmount = 20;
    this.newDurationDays = 30;
    this.newBadge = 'عرض مميز 🔥';
    this.isCreateModalOpen.set(true);
  }

  selectPresetBanner(url: string): void {
    this.newImageUrl = url;
  }

  // Refresh feed from database
  async handleRefresh(): Promise<void> {
    await this.adsService.syncFromFirebase();
    this.toast.show('تم تحديث لوحة الإعلانات ومزامنة البيانات.', 'info');
  }

  // Submit Ad Campaign Proposal
  async handleCreateAd(): Promise<void> {
    if (!this.newTitle.trim() || !this.newDesc.trim()) {
      this.toast.show('يرجى كتابة عنوان الإعلان والوصف التسويقي.', 'error');
      return;
    }

    const created = await this.adsService.submitAd({
      title: this.newTitle,
      description: this.newDesc,
      category: this.newCategory,
      imageUrl: this.newImageUrl || this.presetBanners[0].url,
      linkUrl: this.newLinkUrl || '/market',
      cta: this.newCta || 'زيارة العرض الآن 🚀',
      rewardAmount: Number(this.newRewardAmount) || 15,
      durationDays: Number(this.newDurationDays) || 30,
      authorName: this.newAuthorName,
      badge: this.newBadge
    });

    this.isCreateModalOpen.set(false);
    this.toast.show(`تم نشر إعلانك "${created.title}" بنجاح على اللوحة الإعلانية!`, 'success');
  }

  // User interacts with Ad -> Reward credited & Target Link Launched!
  async handleClaimAndLaunch(ad: Ad): Promise<void> {
    const reward = await this.adsService.recordClick(ad.id);
    
    this.toast.show(`🎉 تهانينا! حصلت على مكافأة ${reward} EGC وتم إيداعها في محفظتك.`, 'success');

    // Launch Target URL
    if (ad.linkUrl) {
      if (ad.linkUrl.startsWith('/')) {
        this.router.navigateByUrl(ad.linkUrl);
      } else {
        window.open(ad.linkUrl, '_blank', 'noopener,noreferrer');
      }
    }
  }

  // Delete Ad
  async handleDeleteAd(ad: Ad): Promise<void> {
    const confirmed = await this.toast.confirm(`هل أنت متأكد من حذف إعلان "${ad.title}"؟`);
    if (confirmed) {
      await this.adsService.deleteAd(ad.id);
      this.selectedAdDetails.set(null);
      this.toast.show('تم حذف الإعلان بنجاح.', 'info');
    }
  }

  // Copy share link
  copyShareLink(ad: Ad): void {
    const shareText = `عرض مميز: ${ad.title} 📣🔥\n${ad.description}`;
    navigator.clipboard.writeText(shareText);
    this.toast.show('تم نسخ تفاصيل الإعلان إلى الحافظة بنجاح.', 'success');
  }
}
