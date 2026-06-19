import { Injectable, signal, computed } from '@angular/core';

export interface Store {
  id: string;
  name: string;
  type: string;
  address: string;
}

export type DealCategory = 'groceries' | 'electronics' | 'meat' | 'bakery' | 'pharmacy' | 'other';

export interface DealCategoryDefinition {
  id: DealCategory;
  label: string;
  emoji: string;
}

export const DEAL_CATEGORIES: DealCategoryDefinition[] = [
  { id: 'groceries', label: 'البقالة والسلع الغذائية', emoji: '🛒' },
  { id: 'meat', label: 'اللحوم والدواجن والأسماك', emoji: '🥩' },
  { id: 'bakery', label: 'المخبوزات والحلويات', emoji: '🍞' },
  { id: 'electronics', label: 'الأجهزة الكهربائية والمنزلية', emoji: '🔌' },
  { id: 'pharmacy', label: 'الصيدلية والعناية الشخصية', emoji: '🧼' },
  { id: 'other', label: 'فئات أخرى متنوعة', emoji: '📦' }
];

export interface Deal {
  id: string;
  storeId: string;
  storeName: string;
  productName: string;
  price: number;
  originalPrice?: number;
  category: DealCategory;
  unit?: string;
  addedBy: string;
  addedByName: string;
  createdAt: string;
  expiresAt?: string;
  confirmations: number;
  confirmedBy: string[];
  reports: number;
  reportedBy: string[];
}

@Injectable({
  providedIn: 'root'
})
export class DealsService {
  private readonly STORAGE_KEY_DEALS = 'Si-Neuro-deals-registry';
  private readonly STORAGE_KEY_STORES = 'Si-Neuro-stores-registry';

  // Core signals
  deals = signal<Deal[]>([]);
  stores = signal<Store[]>([]);
  activeCategory = signal<DealCategory | 'all'>('all');
  activeSort = signal<'price' | 'discount' | 'confirmations' | 'newest'>('price');

  constructor() {
    this.loadState();
  }

  private loadState(): void {
    const dealsStr = localStorage.getItem(this.STORAGE_KEY_DEALS);
    const storesStr = localStorage.getItem(this.STORAGE_KEY_STORES);

    if (dealsStr && storesStr) {
      try {
        this.deals.set(JSON.parse(dealsStr) || []);
        this.stores.set(JSON.parse(storesStr) || []);
        return;
      } catch (e) {
        console.error("Deals Registry Load Error", e);
      }
    }

    // Seed default stores
    const defaultStores: Store[] = [
      { id: 'st_1', name: 'كارفور Carrefour', type: 'هايبر ماركت', address: 'سيتي سنتر، الإسكندرية' },
      { id: 'st_2', name: 'فتح الله Fathalla', type: 'سوبر ماركت كبير', address: 'شارع جلال، وسط البلد' },
      { id: 'st_3', name: 'بيم BIM', type: 'سوبر ماركت مخفض', address: 'بجوار مدرسة لوران' },
      { id: 'st_4', name: 'مترو Metro', type: 'سوبر ماركت راقي', address: 'شارع شعراوي، كفر عبده' }
    ];

    // Seed default deals
    const defaultDeals: Deal[] = [
      {
        id: 'deal_1',
        storeId: 'st_1',
        storeName: 'كارفور Carrefour',
        productName: 'أرز مصري الفيروز 5 كجم',
        price: 150,
        originalPrice: 180,
        category: 'groceries',
        unit: '5 كجم',
        addedBy: 'admin',
        addedByName: 'المهندس المشرف',
        createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
        expiresAt: new Date(Date.now() + 86400000 * 5).toISOString(),
        confirmations: 12,
        confirmedBy: [],
        reports: 0,
        reportedBy: []
      },
      {
        id: 'deal_2',
        storeId: 'st_2',
        storeName: 'فتح الله Fathalla',
        productName: 'زيت عباد الشمس كريستال 1.6 لتر',
        price: 110,
        originalPrice: 130,
        category: 'groceries',
        unit: '1.6 لتر',
        addedBy: 'system',
        addedByName: 'النواة الذكية',
        createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
        expiresAt: new Date(Date.now() + 86400000 * 7).toISOString(),
        confirmations: 25,
        confirmedBy: [],
        reports: 0,
        reportedBy: []
      },
      {
        id: 'deal_3',
        storeId: 'st_3',
        storeName: 'بيم BIM',
        productName: 'جبنة بيضاء دومتي 500 جم',
        price: 35,
        originalPrice: 42,
        category: 'groceries',
        unit: '500 جم',
        addedBy: 'user_node',
        addedByName: 'أحمد عرفة',
        createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
        expiresAt: new Date(Date.now() + 86400000 * 2).toISOString(),
        confirmations: 8,
        confirmedBy: [],
        reports: 0,
        reportedBy: []
      },
      {
        id: 'deal_4',
        storeId: 'st_1',
        storeName: 'كارفور Carrefour',
        productName: 'صدور دجاج كوكي 1 كجم',
        price: 195,
        originalPrice: 220,
        category: 'meat',
        unit: '1 كجم',
        addedBy: 'admin',
        addedByName: 'المهندس المشرف',
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
        expiresAt: new Date(Date.now() + 86400000 * 3).toISOString(),
        confirmations: 15,
        confirmedBy: [],
        reports: 0,
        reportedBy: []
      }
    ];

    this.stores.set(defaultStores);
    this.deals.set(defaultDeals);
    this.saveState();
  }

  private saveState(): void {
    localStorage.setItem(this.STORAGE_KEY_DEALS, JSON.stringify(this.deals()));
    localStorage.setItem(this.STORAGE_KEY_STORES, JSON.stringify(this.stores()));
  }

  // Create new store
  addStore(name: string, type: string, address: string): string {
    const id = `st_${Math.random().toString(36).substr(2, 9)}`;
    const newStore: Store = { id, name, type, address };
    this.stores.update(list => [...list, newStore]);
    this.saveState();
    return id;
  }

  // Publish new price deal
  addDeal(
    storeId: string,
    productName: string,
    price: number,
    originalPrice?: number,
    category: DealCategory = 'groceries',
    unit?: string,
    expiresInDays?: number
  ): void {
    const store = this.stores().find(s => s.id === storeId);
    if (!store) return;

    const newDeal: Deal = {
      id: `deal_${Math.random().toString(36).substr(2, 9)}`,
      storeId,
      storeName: store.name,
      productName: productName.trim(),
      price,
      originalPrice,
      category,
      unit: unit?.trim() || undefined,
      addedBy: 'me',
      addedByName: 'أحمد عرفة (المشرف)',
      createdAt: new Date().toISOString(),
      expiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * 86400000).toISOString() : undefined,
      confirmations: 1,
      confirmedBy: ['me'],
      reports: 0,
      reportedBy: []
    };

    this.deals.update(list => [newDeal, ...list]);
    this.saveState();
  }

  // Confirm price accuracy
  confirmDeal(dealId: string): void {
    this.deals.update(list => {
      return list.map(d => {
        if (d.id === dealId) {
          if (d.confirmedBy.includes('me')) return d;
          return {
            ...d,
            confirmations: d.confirmations + 1,
            confirmedBy: [...d.confirmedBy, 'me']
          };
        }
        return d;
      });
    });
    this.saveState();
  }

  // Report inaccurate prices
  reportDeal(dealId: string): void {
    this.deals.update(list => {
      return list.map(d => {
        if (d.id === dealId) {
          if (d.reportedBy.includes('me')) return d;
          return {
            ...d,
            reports: d.reports + 1,
            reportedBy: [...d.reportedBy, 'me']
          };
        }
        return d;
      });
    });
    this.saveState();
  }
}
