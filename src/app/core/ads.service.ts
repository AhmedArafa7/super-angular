import { Injectable, inject, signal } from '@angular/core';
import { WalletService } from './wallet.service';
import { FirebaseService } from './services/firebase.service';
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc, increment, query, limit } from 'firebase/firestore';

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
  private firebaseService = inject(FirebaseService);

  // Signals
  ads = signal<Ad[]>([]);

  constructor() {
    this.loadState();
    this.syncFromFirebase();
  }

  async syncFromFirebase() {
    try {
      const q = query(collection(this.firebaseService.db, 'ads'), limit(100));
      const snap = await getDocs(q);
      const fetchedAds = snap.docs.map(d => ({ id: d.id, ...d.data() } as Ad));
      
      fetchedAds.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      this.ads.set(fetchedAds);
      this.saveState();
    } catch (e) {
      console.error("Ads Firebase load error", e);
    }
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
      this.ads.set([]);
      this.saveState();
    }
  }

  saveState(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.ads()));
  }

  // Record Click & Award Credit!
  async recordClick(adId: string, userId: string = 'current_user'): Promise<void> {
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

    try {
      const adRef = doc(this.firebaseService.db, 'ads', adId);
      await updateDoc(adRef, { clicks: increment(1) });
    } catch (e) {
      console.error("Failed to record click in Firebase:", e);
    }
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
      const adRef = doc(this.firebaseService.db, 'ads', adId);
      await updateDoc(adRef, { impressions: increment(1) });
    } catch (e) {
      console.error("Failed to record impression in Firebase:", e);
    }
  }

  // Submit new ad submission
  async submitAd(
    title: string,
    description: string,
    imageUrl: string,
    linkUrl: string,
    rewardAmount: number,
    type: Ad['type'],
    category: string,
    authorName: string,
    isAdmin = false
  ): Promise<void> {
    const newAdData = {
      title,
      description,
      imageUrls: [imageUrl || 'https://images.unsplash.com/photo-1557683316-973673baf926?w=600&auto=format&fit=crop&q=80'],
      linkUrl: linkUrl || 'https://google.com',
      rewardAmount: rewardAmount || 10,
      status: isAdmin ? 'active' : 'pending_review' as AdStatus,
      category: category || 'general',
      type: type || 'feed',
      createdAt: new Date().toISOString(),
      authorId: this.firebaseService.getUserId() || 'current_user',
      authorName: authorName || 'مستخدم نكسوس',
      clicks: 0,
      impressions: 0,
      cta: 'شاهد العرض الآن'
    };

    try {
      const docRef = await addDoc(collection(this.firebaseService.db, 'ads'), newAdData);
      const newAd: Ad = { id: docRef.id, ...newAdData };
      this.ads.update(list => [newAd, ...list]);
      this.saveState();
    } catch (error) {
      console.error("Failed to submit ad to Firebase:", error);
      // Fallback local update
      const newAdLocal: Ad = { id: 'ad_' + Math.random().toString(36).substr(2, 9), ...newAdData };
      this.ads.update(list => [newAdLocal, ...list]);
      this.saveState();
    }
  }

  // Approve / Reject Ads (Admin Panel)
  async moderateAd(adId: string, status: 'active' | 'rejected', rejectionReason?: string): Promise<void> {
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
      await updateDoc(doc(this.firebaseService.db, 'ads', adId), updateData);
    } catch (error) {
      console.error("Failed to moderate ad in Firebase:", error);
    }
  }

  // Delete Ad
  async deleteAd(adId: string): Promise<void> {
    this.ads.update(list => list.filter(ad => ad.id !== adId));
    this.saveState();
    
    try {
      await deleteDoc(doc(this.firebaseService.db, 'ads', adId));
    } catch (error) {
      console.error("Failed to delete ad in Firebase:", error);
    }
  }
}
