import { Injectable, signal, computed, inject } from '@angular/core';
import { FirebaseService } from './services/firebase.service';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, query, limit, arrayUnion, increment } from 'firebase/firestore';

export interface Store {
  id: string;
  name: string;
  type: string;
  address: string;
  phone?: string;
  rating?: number;
}

export type DealCategory = 
  | 'groceries'
  | 'vegetables_fruits'
  | 'meat_poultry'
  | 'dairy_cheese'
  | 'beverages'
  | 'cleaning'
  | 'personal_care'
  | 'snacks_sweets'
  | 'other';

export interface DealCategoryDefinition {
  id: DealCategory;
  label: string;
  emoji: string;
}

export const DEAL_CATEGORIES: DealCategoryDefinition[] = [
  { id: 'groceries', label: 'مواد غذائية', emoji: '🥫' },
  { id: 'vegetables_fruits', label: 'خضار وفاكهة', emoji: '🥬' },
  { id: 'meat_poultry', label: 'لحوم ودواجن', emoji: '🍗' },
  { id: 'dairy_cheese', label: 'ألبان وأجبان', emoji: '🧀' },
  { id: 'beverages', label: 'مشروبات', emoji: '🧃' },
  { id: 'cleaning', label: 'منظفات', emoji: '🧹' },
  { id: 'personal_care', label: 'عناية شخصية', emoji: '🧴' },
  { id: 'snacks_sweets', label: 'سناكس وحلويات', emoji: '🍫' },
  { id: 'other', label: 'أخرى', emoji: '📦' }
];

export interface Deal {
  id: string;
  rank?: string; // e.g. '#2', '#4', '#6'
  storeId: string;
  storeName: string;
  productName: string;
  price: number;
  originalPrice?: number;
  category: DealCategory;
  categoryLabel?: string;
  unit: string; // e.g. '1 لتر', '1 كجم'
  addedBy: string;
  addedByName: string;
  createdAt: string;
  expiresAt?: string;
  confirmations: number;
  confirmedBy: string[];
  reports: number;
  reportedBy: string[];
  imageUrl?: string;
  branchNote?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DealsService {
  private readonly STORAGE_KEY_DEALS = 'Si-Neuro-deals-v5';
  private readonly STORAGE_KEY_STORES = 'Si-Neuro-stores-v5';
  private firebaseService = inject(FirebaseService);

  // Core signals
  deals = signal<Deal[]>([]);
  stores = signal<Store[]>([]);
  activeCategory = signal<DealCategory | 'all'>('all');
  activeSort = signal<'price' | 'discount' | 'confirmations' | 'newest'>('price');
  searchQuery = signal<string>('');

  constructor() {
    this.loadState();
    this.syncFromFirebase();
  }

  // Initial rich seed stores
  private getInitialSeedStores(): Store[] {
    return [
      { id: 'st_kheir_zaman', name: 'خير زمان', type: 'سوبرماركت', address: 'فرع الميرغني / الدقي / التجمع', phone: '16007', rating: 4.6 },
      { id: 'st_kazyon', name: 'كازيون', type: 'سوبرماركت / هايبر', address: 'فروع القاهرة والجيزة والدلتا', phone: '19069', rating: 4.7 },
      { id: 'st_al_noqeity', name: 'النقيطي', type: 'هايبر ماركت ومنظفات', address: 'الفرع الرئيسي', phone: '01000000000', rating: 4.8 },
      { id: 'st_bim', name: 'بيم (BIM)', type: 'سوبرماركت تخفيضات', address: 'جميع الفروع', phone: '16688', rating: 4.5 },
      { id: 'st_ragab_sons', name: 'أولاد رجب', type: 'سلسلة هايبر ماركت', address: 'فروع الجمهورية', phone: '19225', rating: 4.4 },
      { id: 'st_fathalla', name: 'فتح الله ماركت', type: 'هايبر ماركت جملة وقطاعي', address: 'فروع الإسكندرية والقاهرة', phone: '19477', rating: 4.8 }
    ];
  }

  // Initial rich seed deals matching the screenshot
  private getInitialSeedDeals(): Deal[] {
    return [
      {
        id: 'deal_pepsi_1l',
        rank: '#2',
        storeId: 'st_kheir_zaman',
        storeName: 'خير زمان',
        productName: 'بيبسي 1 لتر',
        price: 20,
        originalPrice: 25,
        category: 'beverages',
        categoryLabel: 'مشروبات',
        unit: '1 لتر',
        addedBy: 'ahmed_arafa',
        addedByName: 'أحمد عرفه',
        createdAt: '2026-03-10T10:00:00.000Z',
        confirmations: 12,
        confirmedBy: ['ahmed_arafa'],
        reports: 0,
        reportedBy: [],
        branchNote: 'فرع الدقي والميرغني'
      },
      {
        id: 'deal_sugar_1kg',
        rank: '#4',
        storeId: 'st_kazyon',
        storeName: 'كازيون',
        productName: 'سكر 1 كجم',
        price: 28,
        originalPrice: 35,
        category: 'groceries',
        categoryLabel: 'مواد غذائية',
        unit: '1 كجم',
        addedBy: 'ahmed_arafa',
        addedByName: 'أحمد عرفه',
        createdAt: '2026-03-10T11:30:00.000Z',
        confirmations: 18,
        confirmedBy: ['ahmed_arafa'],
        reports: 0,
        reportedBy: [],
        branchNote: 'متوفر بكميات لجميع العملاء'
      },
      {
        id: 'deal_pril_1l',
        rank: '#6',
        storeId: 'st_al_noqeity',
        storeName: 'النقيطي',
        productName: 'بريل صابون أطباق 1 لتر',
        price: 35,
        originalPrice: 48,
        category: 'cleaning',
        categoryLabel: 'منظفات',
        unit: '1 لتر',
        addedBy: 'ahmed_arafa',
        addedByName: 'أحمد عرفه',
        createdAt: '2026-03-10T12:45:00.000Z',
        confirmations: 9,
        confirmedBy: ['ahmed_arafa'],
        reports: 0,
        reportedBy: [],
        branchNote: 'عرض خاص ساري حتى نهاية الأسبوع'
      },
      {
        id: 'deal_rice_1kg',
        rank: '#1',
        storeId: 'st_bim',
        storeName: 'بيم (BIM)',
        productName: 'أرز مصري المطبخ 1 كجم',
        price: 24,
        originalPrice: 30,
        category: 'groceries',
        categoryLabel: 'مواد غذائية',
        unit: '1 كجم',
        addedBy: 'ahmed_arafa',
        addedByName: 'أحمد عرفه',
        createdAt: '2026-03-11T09:00:00.000Z',
        confirmations: 25,
        confirmedBy: ['ahmed_arafa'],
        reports: 0,
        reportedBy: []
      },
      {
        id: 'deal_oil_800ml',
        rank: '#3',
        storeId: 'st_ragab_sons',
        storeName: 'أولاد رجب',
        productName: 'زيت ذرة عافية 800 مل',
        price: 54,
        originalPrice: 70,
        category: 'groceries',
        categoryLabel: 'مواد غذائية',
        unit: '800 مل',
        addedBy: 'ahmed_arafa',
        addedByName: 'أحمد عرفه',
        createdAt: '2026-03-11T14:00:00.000Z',
        confirmations: 14,
        confirmedBy: ['ahmed_arafa'],
        reports: 0,
        reportedBy: []
      },
      {
        id: 'deal_domty_500g',
        rank: '#5',
        storeId: 'st_kazyon',
        storeName: 'كازيون',
        productName: 'جبنة دومتي بلس فيتا 500 جم',
        price: 32,
        originalPrice: 42,
        category: 'dairy_cheese',
        categoryLabel: 'ألبان وأجبان',
        unit: '500 جم',
        addedBy: 'ahmed_arafa',
        addedByName: 'أحمد عرفه',
        createdAt: '2026-03-12T08:30:00.000Z',
        confirmations: 11,
        confirmedBy: ['ahmed_arafa'],
        reports: 0,
        reportedBy: []
      },
      {
        id: 'deal_chicken_pane_1kg',
        rank: '#7',
        storeId: 'st_fathalla',
        storeName: 'فتح الله ماركت',
        productName: 'دجاج بانيه متبل طازج 1 كجم',
        price: 195,
        originalPrice: 240,
        category: 'meat_poultry',
        categoryLabel: 'لحوم ودواجن',
        unit: '1 كجم',
        addedBy: 'ahmed_arafa',
        addedByName: 'أحمد عرفه',
        createdAt: '2026-03-12T16:20:00.000Z',
        confirmations: 20,
        confirmedBy: ['ahmed_arafa'],
        reports: 0,
        reportedBy: []
      }
    ];
  }

  // Load from local storage
  private loadState(): void {
    const dealsStr = localStorage.getItem(this.STORAGE_KEY_DEALS);
    const storesStr = localStorage.getItem(this.STORAGE_KEY_STORES);

    let loadedDeals: Deal[] = [];
    let loadedStores: Store[] = [];

    if (dealsStr) {
      try {
        loadedDeals = JSON.parse(dealsStr) || [];
      } catch (e) {
        console.error("Deals LocalStorage parse error", e);
      }
    }

    if (storesStr) {
      try {
        loadedStores = JSON.parse(storesStr) || [];
      } catch (e) {
        console.error("Stores LocalStorage parse error", e);
      }
    }

    if (loadedStores.length === 0) {
      loadedStores = this.getInitialSeedStores();
    }

    if (loadedDeals.length === 0) {
      loadedDeals = this.getInitialSeedDeals();
    }

    this.stores.set(loadedStores);
    this.deals.set(loadedDeals);
    this.saveState();
  }

  saveState(): void {
    localStorage.setItem(this.STORAGE_KEY_DEALS, JSON.stringify(this.deals()));
    localStorage.setItem(this.STORAGE_KEY_STORES, JSON.stringify(this.stores()));
  }

  // Firebase Sync
  async syncFromFirebase(): Promise<void> {
    try {
      // Sync stores
      const storesSnap = await getDocs(query(collection(this.firebaseService.db, 'deals_stores'), limit(100)));
      if (!storesSnap.empty) {
        const fetchedStores = storesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Store));
        this.stores.set(fetchedStores);
      } else {
        // Upload initial stores to Firestore
        for (const store of this.getInitialSeedStores()) {
          try {
            await setDoc(doc(this.firebaseService.db, 'deals_stores', store.id), store);
          } catch (err) {}
        }
      }

      // Sync deals
      const dealsSnap = await getDocs(query(collection(this.firebaseService.db, 'deals_offers'), limit(200)));
      if (!dealsSnap.empty) {
        const fetchedDeals = dealsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Deal));
        
        // Merge with initial showcase deals
        const seedDeals = this.getInitialSeedDeals();
        const map = new Map<string, Deal>();
        seedDeals.forEach(d => map.set(d.id, d));
        fetchedDeals.forEach(d => map.set(d.id, d));

        const list = Array.from(map.values());
        list.sort((a, b) => a.price - b.price);
        this.deals.set(list);
        this.saveState();
      } else {
        // Upload initial deals to Firestore
        for (const deal of this.getInitialSeedDeals()) {
          try {
            await setDoc(doc(this.firebaseService.db, 'deals_offers', deal.id), deal);
          } catch (err) {}
        }
      }
    } catch (e) {
      console.warn("Deals Firebase sync notice (using local state):", e);
    }
  }

  // Add new store
  async addStore(name: string, type: string, address: string, phone?: string): Promise<Store> {
    const id = `st_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newStore: Store = { id, name: name.trim(), type: type.trim(), address: address.trim(), phone: phone?.trim(), rating: 5.0 };
    
    this.stores.update(list => [...list, newStore]);
    this.saveState();

    try {
      await setDoc(doc(this.firebaseService.db, 'deals_stores', id), newStore);
    } catch (err) {
      console.error("Firebase store add error:", err);
    }

    return newStore;
  }

  // Publish new price deal
  async addDeal(
    storeId: string,
    productName: string,
    price: number,
    originalPrice?: number,
    category: DealCategory = 'groceries',
    unit: string = '1 كجم',
    expiresInDays?: number,
    branchNote?: string
  ): Promise<Deal> {
    const store = this.stores().find(s => s.id === storeId) || { name: 'محل محلي', id: storeId };
    const catDef = DEAL_CATEGORIES.find(c => c.id === category) || DEAL_CATEGORIES[0];
    const currentCount = this.deals().length + 1;

    const newDeal: Deal = {
      id: `deal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      rank: `#${currentCount}`,
      storeId,
      storeName: store.name,
      productName: productName.trim(),
      price: Number(price) || 0,
      originalPrice: originalPrice ? Number(originalPrice) : undefined,
      category,
      categoryLabel: catDef.label,
      unit: unit.trim() || '1 قطعة',
      addedBy: this.firebaseService.getUserId() || 'ahmed_arafa',
      addedByName: 'أحمد عرفه',
      createdAt: new Date().toISOString(),
      expiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * 86400000).toISOString() : undefined,
      confirmations: 1,
      confirmedBy: [this.firebaseService.getUserId() || 'ahmed_arafa'],
      reports: 0,
      reportedBy: [],
      branchNote: branchNote?.trim()
    };

    this.deals.update(list => [newDeal, ...list]);
    this.saveState();

    try {
      await setDoc(doc(this.firebaseService.db, 'deals_offers', newDeal.id), newDeal);
    } catch (err) {
      console.error("Firebase deal add error:", err);
    }

    return newDeal;
  }

  // Confirm price accuracy (Upvote)
  async confirmDeal(dealId: string): Promise<void> {
    const userId = this.firebaseService.getUserId() || 'user_' + Math.random().toString(36).substring(2, 6);
    
    this.deals.update(list => list.map(d => {
      if (d.id === dealId) {
        if (d.confirmedBy.includes(userId)) return d;
        return {
          ...d,
          confirmations: d.confirmations + 1,
          confirmedBy: [...d.confirmedBy, userId]
        };
      }
      return d;
    }));
    this.saveState();

    try {
      await updateDoc(doc(this.firebaseService.db, 'deals_offers', dealId), {
        confirmations: increment(1),
        confirmedBy: arrayUnion(userId)
      });
    } catch (err) {
      console.warn("Firebase confirmDeal error:", err);
    }
  }

  // Report inaccurate prices
  async reportDeal(dealId: string): Promise<void> {
    const userId = this.firebaseService.getUserId() || 'user_' + Math.random().toString(36).substring(2, 6);

    this.deals.update(list => list.map(d => {
      if (d.id === dealId) {
        if (d.reportedBy.includes(userId)) return d;
        return {
          ...d,
          reports: d.reports + 1,
          reportedBy: [...d.reportedBy, userId]
        };
      }
      return d;
    }));
    this.saveState();

    try {
      await updateDoc(doc(this.firebaseService.db, 'deals_offers', dealId), {
        reports: increment(1),
        reportedBy: arrayUnion(userId)
      });
    } catch (err) {
      console.warn("Firebase reportDeal error:", err);
    }
  }

  // Delete deal
  async deleteDeal(dealId: string): Promise<void> {
    this.deals.update(list => list.filter(d => d.id !== dealId));
    this.saveState();

    try {
      await deleteDoc(doc(this.firebaseService.db, 'deals_offers', dealId));
    } catch (err) {
      console.error("Firebase deleteDeal error:", err);
    }
  }
}
