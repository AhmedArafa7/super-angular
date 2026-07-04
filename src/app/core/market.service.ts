import { Injectable, signal, computed, inject } from '@angular/core';
import { WalletService } from './wallet.service';
import { FirebaseService } from './services/firebase.service';
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc, increment, query, limit, arrayUnion } from 'firebase/firestore';

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
  private firebaseService = inject(FirebaseService);

  // Core signals
  items = signal<MarketItem[]>([]);
  activeCategory = signal<string>('all');
  activeTab = signal<'buy' | 'mine'>('buy');
  searchQuery = signal<string>('');

  constructor() {
    this.loadState();
    this.syncFromFirebase();
  }

  async syncFromFirebase() {
    try {
      const q = query(collection(this.firebaseService.db, 'products'), limit(200));
      const snap = await getDocs(q);
      const fetchedItems = snap.docs.map(d => ({ id: d.id, ...d.data() } as MarketItem));
      
      fetchedItems.sort((a, b) => {
        const dateA = (a as any).createdAt ? new Date((a as any).createdAt).getTime() : 0;
        const dateB = (b as any).createdAt ? new Date((b as any).createdAt).getTime() : 0;
        return dateB - dateA;
      });
      
      this.items.set(fetchedItems);
      this.saveState();
    } catch (e) {
      console.error("Market Firebase load error", e);
    }
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

    this.items.set([]);
    this.saveState();
  }

  saveState(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.items()));
  }

  // Add listing item
  async addItem(title: string, desc: string, price: number, cat: 'software' | 'hardware' | 'services' | 'digital', stock: number, img?: string): Promise<void> {
    const newItemData = {
      title: title.trim(),
      description: desc.trim(),
      price,
      currency: 'BKC',
      mainCategory: cat,
      subCategory: 'general',
      imageUrl: img || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop',
      sellerId: this.firebaseService.getUserId() || 'me',
      purchasedBy: [],
      stock,
      status: 'active' as const,
      createdAt: new Date().toISOString()
    };

    try {
      const docRef = await addDoc(collection(this.firebaseService.db, 'products'), newItemData);
      const newItem: MarketItem = { id: docRef.id, ...newItemData };
      this.items.update(list => [...list, newItem]);
      this.saveState();
    } catch (error) {
      console.error("Failed to add market item to Firebase:", error);
      const newItemLocal: MarketItem = { id: `prod_${Math.random().toString(36).substr(2, 9)}`, ...newItemData };
      this.items.update(list => [...list, newItemLocal]);
      this.saveState();
    }
  }

  // Delete item
  async deleteItem(id: string): Promise<void> {
    this.items.update(list => list.filter(i => i.id !== id));
    this.saveState();
    
    try {
      await deleteDoc(doc(this.firebaseService.db, 'products', id));
    } catch (error) {
      console.error("Failed to delete market item in Firebase:", error);
    }
  }

  // Buy or acquire item
  async acquireItem(id: string): Promise<boolean> {
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
    
    const userId = this.firebaseService.getUserId() || 'me';
    let newStatus = item.status;
    let newStock = item.stock - 1;

    // Decrement stock & record buyer
    this.items.update(list => {
      return list.map(i => {
        if (i.id === id) {
          const purchasedByList = [...(i.purchasedBy || []), userId];
          newStatus = newStock <= 0 ? 'sold_out' as const : i.status;
          return {
            ...i,
            stock: newStock,
            status: newStatus,
            purchasedBy: purchasedByList
          };
        }
        return i;
      });
    });

    this.saveState();

    try {
      const itemRef = doc(this.firebaseService.db, 'products', id);
      await updateDoc(itemRef, { 
        stock: increment(-1),
        status: newStatus,
        purchasedBy: arrayUnion(userId)
      });
    } catch (error) {
      console.error("Failed to acquire item in Firebase:", error);
    }

    return true;
  }

  // Moderate item (Admin action)
  async moderateItem(id: string, status: 'active' | 'rejected', adminFeedback?: string): Promise<void> {
    this.items.update(list => list.map(item => {
      if (item.id === id) {
        return { ...item, status, adminFeedback };
      }
      return item;
    }));
    this.saveState();

    try {
      const updateData: any = { status };
      if (adminFeedback) {
        updateData.adminFeedback = adminFeedback;
      }
      await updateDoc(doc(this.firebaseService.db, 'products', id), updateData);
    } catch (error) {
      console.error("Failed to update moderate status in Firebase:", error);
    }
  }
}
