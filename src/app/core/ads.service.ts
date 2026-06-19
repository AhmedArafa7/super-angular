import { Injectable, inject, signal } from '@angular/core';
import { WalletService } from './wallet.service';

export type AdStatus = 'active' | 'pending_review' | 'rejected' | 'archived';

export interface Ad {
  id: string;
  title: string;
  description: string;
  imageUrls: string[];
  linkUrl: string;
  rewardAmount: number;
  status: AdStatus;
  category: string;
  type: 'video' | 'image' | 'page' | 'sidebar' | 'banner' | 'feed';
  targetCategories?: string[];
  createdAt: string;
  authorId: string;
  authorName: string;
  clicks: number;
  impressions: number;
  rejectionReason?: string;
  cta?: string; // Click-to-action button label
}

@Injectable({
  providedIn: 'root'
})
export class AdsService {
  private readonly STORAGE_KEY = 'Si-Neuro-ads-store';
  private walletService = inject(WalletService);

  // Signals
  ads = signal<Ad[]>([]);

  constructor() {
    this.loadState();
  }

  private loadState(): void {
    const dataStr = localStorage.getItem(this.STORAGE_KEY);
    if (dataStr) {
      try {
        const parsed = JSON.parse(dataStr);
        this.ads.set(parsed || []);
      } catch (e) {
        console.error("Ads state load error", e);
      }
    } else {
      // Seed premium ads
      const defaultAds: Ad[] = [
        {
          id: 'ad_1',
          title: 'شريحة برمجة متحكمات ESP32 فائقة الأداء بخصم 20%',
          description: 'احصل على شريحة ESP32 اللاسلكية المتوافقة مع معمل المتحكمات مباشرة مع دعم كامل لبروتوكول Wi-Fi و Bluetooth ومنافذ التوسيع المتطورة.',
          imageUrls: ['https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80'],
          linkUrl: 'https://carrefour.eg',
          rewardAmount: 15,
          status: 'active',
          category: 'hardware',
          type: 'feed',
          createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
          authorId: 'admin_root',
          authorName: 'سوق نكسوس التقني',
          clicks: 142,
          impressions: 1250,
          cta: 'شراء الآن 🛒'
        },
        {
          id: 'ad_2',
          title: 'كورس تعلم أساسيات الذكاء الاصطناعي التوليدي من البداية للاحتراف',
          description: 'انضم لـ 5000+ طالب في رحلة بناء شبكاتك العصبية وبرمجة المساعدين الأذكياء كورس معتمد بالكامل.',
          imageUrls: ['https://images.unsplash.com/photo-1677442136019-21780efad99a?w=600&auto=format&fit=crop&q=80'],
          linkUrl: 'https://udemy.com',
          rewardAmount: 25,
          status: 'active',
          category: 'education',
          type: 'banner',
          createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
          authorId: 'user_99',
          authorName: 'أكاديمية المستقبل',
          clicks: 89,
          impressions: 920,
          cta: 'سجل مجاناً 🎓'
        },
        {
          id: 'ad_3',
          title: 'باقة استضافة سحابية فائقة السرعة للمطورين الصغار',
          description: 'أطلق موقعك أو تطبيق الـ Angular الخاص بك في ثوانٍ مع خوادم محلية سريعة ودعم فني على مدار الساعة.',
          imageUrls: ['https://images.unsplash.com/photo-1600132806370-bf17e65e942f?w=600&auto=format&fit=crop&q=80'],
          linkUrl: 'https://hostinger.com',
          rewardAmount: 10,
          status: 'active',
          category: 'services',
          type: 'image',
          createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
          authorId: 'user_45',
          authorName: 'سحابة نكسوس',
          clicks: 34,
          impressions: 480,
          cta: 'ابدأ التجربة 🚀'
        }
      ];
      this.ads.set(defaultAds);
      this.saveState();
    }
  }

  saveState(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.ads()));
  }

  // Record Click & Award Credit!
  recordClick(adId: string, userId: string = 'current_user'): void {
    this.ads.update(list => 
      list.map(ad => {
        if (ad.id === adId) {
          // Award coins to user's wallet!
          this.walletService.adjustFunds(ad.rewardAmount, 'deposit', 'EGC');
          return {
            ...ad,
            clicks: ad.clicks + 1
          };
        }
        return ad;
      })
    );
    this.saveState();
  }

  // Record Impression
  recordImpression(adId: string): void {
    this.ads.update(list => 
      list.map(ad => {
        if (ad.id === adId) {
          return {
            ...ad,
            impressions: ad.impressions + 1
          };
        }
        return ad;
      })
    );
    this.saveState();
  }

  // Submit new ad submission
  submitAd(
    title: string,
    description: string,
    imageUrl: string,
    linkUrl: string,
    rewardAmount: number,
    type: Ad['type'],
    category: string,
    authorName: string,
    isAdmin = false
  ): void {
    const newAd: Ad = {
      id: 'ad_' + Math.random().toString(36).substr(2, 9),
      title,
      description,
      imageUrls: [imageUrl || 'https://images.unsplash.com/photo-1557683316-973673baf926?w=600&auto=format&fit=crop&q=80'],
      linkUrl: linkUrl || 'https://google.com',
      rewardAmount: rewardAmount || 10,
      status: isAdmin ? 'active' : 'pending_review',
      category: category || 'general',
      type: type || 'feed',
      createdAt: new Date().toISOString(),
      authorId: 'current_user',
      authorName: authorName || 'مستخدم نكسوس',
      clicks: 0,
      impressions: 0,
      cta: 'شاهد العرض الآن'
    };

    this.ads.update(list => [newAd, ...list]);
    this.saveState();
  }

  // Approve / Reject Ads (Admin Panel)
  moderateAd(adId: string, status: 'active' | 'rejected', rejectionReason?: string): void {
    this.ads.update(list => 
      list.map(ad => {
        if (ad.id === adId) {
          return {
            ...ad,
            status,
            rejectionReason: status === 'rejected' ? rejectionReason : undefined
          };
        }
        return ad;
      })
    );
    this.saveState();
  }

  // Delete Ad
  deleteAd(adId: string): void {
    this.ads.update(list => list.filter(ad => ad.id !== adId));
    this.saveState();
  }
}
