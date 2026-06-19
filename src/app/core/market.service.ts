import { Injectable, signal, computed, inject } from '@angular/core';
import { WalletService } from './wallet.service';

export interface MarketItem {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string; // 'BKC' | 'EGC' | 'DLC'
  mainCategory: 'software' | 'hardware' | 'services' | 'digital';
  subCategory: string;
  imageUrl?: string;
  sellerId: string;
  purchasedBy?: string[];
  stock: number;
  status: 'active' | 'sold_out' | 'pending_review' | 'rejected';
  adminFeedback?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MarketService {
  private readonly STORAGE_KEY = 'Si-Neuro-market-registry';
  walletService = inject(WalletService);

  // Core signals
  items = signal<MarketItem[]>([]);
  activeCategory = signal<string>('all');
  activeTab = signal<'buy' | 'mine'>('buy');
  searchQuery = signal<string>('');

  constructor() {
    this.loadState();
  }

  private loadState(): void {
    const dataStr = localStorage.getItem(this.STORAGE_KEY);
    if (dataStr) {
      try {
        const parsed = JSON.parse(dataStr);
        this.items.set(parsed || []);
        return;
      } catch (e) {
        console.error("Market Load Error", e);
      }
    }

    // Seed default marketplace assets
    const seedItems: MarketItem[] = [
      {
        id: 'prod_1',
        title: 'بوابة WeTube Pro',
        description: 'النسخة الاحترافية من مشغل WeTube بميزات السينما العميقة والتحليل التلقائي عصبياً.',
        price: 500,
        currency: 'BKC',
        mainCategory: 'software',
        subCategory: 'apps',
        imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop',
        sellerId: 'system',
        purchasedBy: [],
        stock: 10,
        status: 'active'
      },
      {
        id: 'prod_2',
        title: 'حقيبة مستشعرات Arduino Mega',
        description: 'مجموعة المبتدئين المتكاملة للبرمجة عصبياً مع الألواح والمستشعرات والمحركات.',
        price: 1500,
        currency: 'BKC',
        mainCategory: 'hardware',
        subCategory: 'mcu',
        imageUrl: 'https://images.unsplash.com/photo-1555664424-778a1e5e1b48?q=80&w=600&auto=format&fit=crop',
        sellerId: 'admin_user',
        purchasedBy: [],
        stock: 3,
        status: 'active'
      },
      {
        id: 'prod_3',
        title: 'AI Script Optimizer Agent',
        description: 'عميل ذكي مبرمج بالكامل لتحسين كود بايثون البرمجي تلقائياً وزيادة سرعة الأنوية.',
        price: 250,
        currency: 'BKC',
        mainCategory: 'services',
        subCategory: 'ai_agents',
        imageUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=600&auto=format&fit=crop',
        sellerId: 'agent_hub',
        purchasedBy: [],
        stock: 20,
        status: 'active'
      }
    ];

    this.items.set(seedItems);
    this.saveState();
  }

  saveState(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.items()));
  }

  // Add listing item
  addItem(title: string, desc: string, price: number, cat: 'software' | 'hardware' | 'services' | 'digital', stock: number, img?: string): void {
    const newItem: MarketItem = {
      id: `prod_${Math.random().toString(36).substr(2, 9)}`,
      title: title.trim(),
      description: desc.trim(),
      price,
      currency: 'BKC',
      mainCategory: cat,
      subCategory: 'general',
      imageUrl: img || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop',
      sellerId: 'me', // Mock active user ID
      purchasedBy: [],
      stock,
      status: 'active'
    };

    this.items.update(list => [...list, newItem]);
    this.saveState();
  }

  // Delete item
  deleteItem(id: string): void {
    this.items.update(list => list.filter(i => i.id !== id));
    this.saveState();
  }

  // Buy or acquire item
  acquireItem(id: string): boolean {
    const currentItems = this.items();
    const item = currentItems.find(i => i.id === id);
    if (!item) return false;

    if (item.stock <= 0) {
      alert("عذراً، هذا المنتج غير متوفر حالياً.");
      return false;
    }

    // Verify wallet balance
    const walletBalance = this.walletService.balances().BKC;
    if (walletBalance < item.price) {
      alert(`عذراً، رصيدك غير كافٍ. تحتاج إلى ${item.price} BKC ورصيدك الحالي هو ${walletBalance} BKC.`);
      return false;
    }

    // Deduct funds
    this.walletService.adjustFunds(item.price, 'withdrawal', 'BKC');
    
    // Decrement stock & record buyer
    this.items.update(list => {
      return list.map(i => {
        if (i.id === id) {
          const newStock = i.stock - 1;
          const purchasedByList = [...(i.purchasedBy || []), 'me'];
          return {
            ...i,
            stock: newStock,
            status: newStock <= 0 ? 'sold_out' as const : i.status,
            purchasedBy: purchasedByList
          };
        }
        return i;
      });
    });

    this.saveState();
    return true;
  }
}
