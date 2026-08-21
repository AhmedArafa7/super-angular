import { Injectable, inject, signal } from '@angular/core';
import { WalletService } from './wallet.service';
import { FirebaseService } from './services/firebase.service';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, query, limit, increment } from 'firebase/firestore';

export type AdStatus = 'active' | 'pending_review' | 'rejected' | 'archived';

export interface AdCategoryDefinition {
  id: string;
  label: string;
  emoji: string;
}

export const ADS_CATEGORIES: AdCategoryDefinition[] = [
  { id: 'all', label: 'كل التصنيفات', emoji: '🌟' },
  { id: 'tech_services', label: 'خدمات سحابية وتقنية', emoji: '💻' },
  { id: 'courses', label: 'كورسات وتعليم', emoji: '🎓' },
  { id: 'hardware', label: 'أجهزة ومعدات', emoji: '🔌' },
  { id: 'exclusive_deals', label: 'عروض وتخفيضات', emoji: '🔥' },
  { id: 'jobs', label: 'وظائف ومشاريع', emoji: '💼' },
  { id: 'other', label: 'أخرى', emoji: '📦' }
];

export interface Ad {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  imageUrls: string[];
  linkUrl: string;
  cta: string; // Click-to-action button label (e.g. 'زيارة العرض الآن', 'طلب الخدمة')
  rewardAmount: number; // EGC reward given to user on viewing/clicking
  status: AdStatus;
  category: string;
  categoryLabel?: string;
  type: 'billboard' | 'banner' | 'feed';
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  isVerified?: boolean;
  badge?: string; // e.g. 'موصى به ⭐', 'عرض حصري 🔥', 'شريك رسمي 💎'
  clicks: number;
  impressions: number;
  budget: number;
  durationDays: number;
  createdAt: string;
  expiresAt?: string;
  rejectionReason?: string;
  tags?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AdsService {
  private readonly STORAGE_KEY = 'Si-Neuro-ads-billboard-v5';
  private walletService = inject(WalletService);
  private firebaseService = inject(FirebaseService);

  // Signals
  ads = signal<Ad[]>([]);
  activeCategory = signal<string>('all');
  searchQuery = signal<string>('');

  constructor() {
    this.loadState();
    this.syncFromFirebase();
  }

  // Initial rich seed billboard campaigns
  private getInitialSeedAds(): Ad[] {
    return [
      {
        id: 'ad_neural_cloud_1',
        title: 'استضافة سحابية فائقة السرعة مع حماية DDoS مجانية - خصم 50%',
        description: 'استمتع بسيرفرات NVMe فائقة السرعة مع دعم كامل لـ Node.js, Python, وDocker، وشهادات SSL مجانية ودعم فني على مدار الساعة.',
        imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=800&auto=format&fit=crop',
        imageUrls: ['https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=800&auto=format&fit=crop'],
        linkUrl: '/market',
        cta: 'احصل على الخصم الآن 🚀',
        rewardAmount: 20,
        status: 'active',
        category: 'tech_services',
        categoryLabel: 'خدمات سحابية وتقنية',
        type: 'billboard',
        authorId: 'system_sponsor',
        authorName: 'Global Edge Network',
        isVerified: true,
        badge: 'عرض حصري 🔥',
        clicks: 342,
        impressions: 1250,
        budget: 500,
        durationDays: 30,
        createdAt: '2026-03-01T10:00:00.000Z',
        tags: ['استضافة', 'سحابة', 'سيرفرات', 'cloud', 'hosting']
      },
      {
        id: 'ad_ai_bootcamp_2',
        title: 'دورة احتراف بناء وكلاء الذكاء الاصطناعي وتطبيقات الـ LLMs',
        description: 'تعلم بناء تطبيقات الذكاء الاصطناعي المتقدمة، وربطها بقواعد البيانات المتجهة Vector DBs، وأتمتة المهام المعقدة خطوة بخطوة مع مشاريع عملية واقعية.',
        imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop',
        imageUrls: ['https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop'],
        linkUrl: '/study-ai',
        cta: 'انضم للمعسكر مجاناً 🎓',
        rewardAmount: 25,
        status: 'active',
        category: 'courses',
        categoryLabel: 'كورسات وتعليم',
        type: 'billboard',
        authorId: 'si_neuro_academy',
        authorName: 'Si-Neuro Academy',
        isVerified: true,
        badge: 'موصى به ⭐',
        clicks: 512,
        impressions: 2100,
        budget: 750,
        durationDays: 45,
        createdAt: '2026-03-05T12:00:00.000Z',
        tags: ['ذكاء اصطناعي', 'AI', 'LangChain', 'كورسات', 'Python']
      },
      {
        id: 'ad_iot_masterkit_3',
        title: 'شحنة جديدة من حقائب تطوير ESP32 وشاشات اللمس والمستشعرات',
        description: 'حقيبة متكاملة تضم أكثر من 40 مستشعر وموديول إلكتروني مع كتب تعليمية وشروحات عربية لتنفيذ مشاريع التخرج والأنظمة الذكية.',
        imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=800&auto=format&fit=crop',
        imageUrls: ['https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=800&auto=format&fit=crop'],
        linkUrl: '/microcontroller-lab',
        cta: 'تصفح الحقيبة والعتاد 📦',
        rewardAmount: 15,
        status: 'active',
        category: 'hardware',
        categoryLabel: 'أجهزة ومعدات',
        type: 'billboard',
        authorId: 'nexus_robotics',
        authorName: 'Nexus Robotics Lab',
        isVerified: true,
        badge: 'عتاد أصلي 💎',
        clicks: 218,
        impressions: 980,
        budget: 400,
        durationDays: 20,
        createdAt: '2026-03-08T15:30:00.000Z',
        tags: ['عتاد', 'متحكمات', 'ESP32', 'IoT', 'روبوتات']
      },
      {
        id: 'ad_cyber_shield_4',
        title: 'فحص أمني شامل لتطبيقات الويب والمواقع وكشف الثغرات الحرجة',
        description: 'تقرير أمني مفصل ومطابق لمعايير OWASP مع تقديم حلول وإصلاحات مباشرة للثغرات قبل إطلاق تطبيقك التجاري.',
        imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=800&auto=format&fit=crop',
        imageUrls: ['https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=800&auto=format&fit=crop'],
        linkUrl: '/agent-ai',
        cta: 'طلب استشارة أمنية 🛡️',
        rewardAmount: 30,
        status: 'active',
        category: 'tech_services',
        categoryLabel: 'خدمات سحابية وتقنية',
        type: 'billboard',
        authorId: 'cyber_shield',
        authorName: 'Cyber Shield Hub',
        isVerified: true,
        badge: 'أمان معتمد 🔒',
        clicks: 189,
        impressions: 870,
        budget: 600,
        durationDays: 30,
        createdAt: '2026-03-09T09:00:00.000Z',
        tags: ['أمن سيبراني', 'حماية', 'اختبار اختراق', 'OWASP']
      }
    ];
  }

  // Load from local storage
  private loadState(): void {
    const dataStr = localStorage.getItem(this.STORAGE_KEY);
    if (dataStr) {
      try {
        const parsed = JSON.parse(dataStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.ads.set(parsed);
          return;
        }
      } catch (e) {
        console.error("Ads state load error", e);
      }
    }

    const seeds = this.getInitialSeedAds();
    this.ads.set(seeds);
    this.saveState();
  }

  saveState(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.ads()));
  }

  // Firebase Sync
  async syncFromFirebase(): Promise<void> {
    try {
      const q = query(collection(this.firebaseService.db, 'ads_campaigns'), limit(100));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const fetchedAds = snap.docs.map(d => ({ id: d.id, ...d.data() } as Ad));
        
        // Merge with initial seed ads
        const seedAds = this.getInitialSeedAds();
        const map = new Map<string, Ad>();
        seedAds.forEach(a => map.set(a.id, a));
        fetchedAds.forEach(a => map.set(a.id, a));

        const list = Array.from(map.values());
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        this.ads.set(list);
        this.saveState();
      } else {
        // Upload seed campaigns to Firestore
        for (const ad of this.getInitialSeedAds()) {
          try {
            await setDoc(doc(this.firebaseService.db, 'ads_campaigns', ad.id), ad);
          } catch (err) {}
        }
      }
    } catch (e) {
      console.warn("Ads Firebase sync notice (using local state):", e);
    }
  }

  // Record Click & Award EGC Reward
  async recordClick(adId: string): Promise<number> {
    let reward = 10;
    this.ads.update(list => 
      list.map(ad => {
        if (ad.id === adId) {
          reward = ad.rewardAmount || 10;
          return {
            ...ad,
            clicks: ad.clicks + 1
          };
        }
        return ad;
      })
    );
    this.saveState();

    // Deposit reward to user wallet
    this.walletService.adjustFunds(reward, 'deposit', 'EGC');

    try {
      await updateDoc(doc(this.firebaseService.db, 'ads_campaigns', adId), { clicks: increment(1) });
    } catch (e) {
      console.warn("Firebase record click error:", e);
    }

    return reward;
  }

  // Record Impression
  async recordImpression(adId: string): Promise<void> {
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

    try {
      await updateDoc(doc(this.firebaseService.db, 'ads_campaigns', adId), { impressions: increment(1) });
    } catch (e) {
      console.warn("Firebase record impression error:", e);
    }
  }

  // Submit new Ad Campaign Proposal
  async submitAd(data: Partial<Ad>): Promise<Ad> {
    const currentUserId = this.firebaseService.getUserId() || 'ahmed_arafa';
    const catDef = ADS_CATEGORIES.find(c => c.id === data.category) || ADS_CATEGORIES[1];

    const newAd: Ad = {
      id: `ad_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: (data.title || 'إعلان ترويجي جديد').trim(),
      description: (data.description || '').trim(),
      imageUrl: data.imageUrl || 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=800&auto=format&fit=crop',
      imageUrls: [data.imageUrl || 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=800&auto=format&fit=crop'],
      linkUrl: (data.linkUrl || '/market').trim(),
      cta: data.cta?.trim() || 'زيارة العرض الآن 🚀',
      rewardAmount: data.rewardAmount ?? 15,
      status: 'active',
      category: data.category || 'tech_services',
      categoryLabel: catDef.label,
      type: 'billboard',
      authorId: currentUserId,
      authorName: data.authorName?.trim() || 'أحمد عرفه',
      isVerified: true,
      badge: data.badge || 'جديد ✨',
      clicks: 0,
      impressions: 1,
      budget: data.budget ?? 100,
      durationDays: data.durationDays ?? 30,
      createdAt: new Date().toISOString(),
      tags: data.tags || [catDef.label, 'إعلان']
    };

    this.ads.update(list => [newAd, ...list]);
    this.saveState();

    try {
      await setDoc(doc(this.firebaseService.db, 'ads_campaigns', newAd.id), newAd);
    } catch (err) {
      console.error("Firebase submit ad error:", err);
    }

    return newAd;
  }

  // Approve / Reject Ads (Admin Panel)
  async moderateAd(adId: string, status: AdStatus, rejectionReason?: string): Promise<void> {
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

    try {
      const updateData: any = { status };
      if (rejectionReason) updateData.rejectionReason = rejectionReason;
      await updateDoc(doc(this.firebaseService.db, 'ads_campaigns', adId), updateData);
    } catch (e) {
      console.error("Firebase moderate ad error:", e);
    }
  }

  // Delete Ad
  async deleteAd(adId: string): Promise<void> {
    this.ads.update(list => list.filter(ad => ad.id !== adId));
    this.saveState();

    try {
      await deleteDoc(doc(this.firebaseService.db, 'ads_campaigns', adId));
    } catch (e) {
      console.error("Firebase delete ad error:", e);
    }
  }
}
