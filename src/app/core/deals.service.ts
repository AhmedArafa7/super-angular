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
        const cleanDeals = (JSON.parse(dealsStr) || []).filter((d: Deal) => !d.id.startsWith('deal_'));
        const cleanStores = (JSON.parse(storesStr) || []).filter((s: Store) => !s.id.startsWith('st_'));
        this.deals.set(cleanDeals);
        this.stores.set(cleanStores);
        return;
      } catch (e) {
        console.error("Deals Registry Load Error", e);
      }
    }

    this.stores.set([]);
    this.deals.set([]);
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
