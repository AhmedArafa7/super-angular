import { Injectable, inject, signal } from '@angular/core';
import { WalletService } from './wallet.service';
import { MarketService } from './market.service';
import { FirebaseService } from './services/firebase.service';
import { collection, getDocs, doc, updateDoc, addDoc, query, limit, increment } from 'firebase/firestore';

export interface UserNode {
  id: string;
  name: string;
  role: 'founder' | 'cofounder' | 'admin' | 'management' | 'member';
  balance: number;
  weightGb: number; // Computational resource allocated
  status: 'active' | 'suspended' | 'pending';
  lastActive: string;
}

export interface CategorySuggestion {
  id: string;
  suggestedName: string;
  parentCategory: string;
  userName: string;
  userId: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private readonly STORAGE_KEY = 'Si-Neuro-admin-store';
  private walletService = inject(WalletService);
  private marketService = inject(MarketService);
  private firebaseService = inject(FirebaseService);

  // Signals
  users = signal<UserNode[]>([]);
  categorySuggestions = signal<CategorySuggestion[]>([]);
  systemLogs = signal<string[]>([]);

  constructor() {
    this.loadState();
    this.syncFromFirebase();
  }

  async syncFromFirebase() {
    try {
      // Fetch users
      const usersQ = query(collection(this.firebaseService.db, 'users'), limit(100));
      const usersSnap = await getDocs(usersQ);
      const fetchedUsers = usersSnap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          name: data['displayName'] || data['name'] || `مستخدم ${d.id.substring(0, 5)}`,
          role: data['role'] || 'free',
          balance: data['balance'] || 0,
          weightGb: data['weightGb'] || 10,
          status: data['status'] || 'active',
          lastActive: data['lastActive'] || new Date().toISOString()
        } as UserNode;
      });
      
      this.users.set(fetchedUsers);

      // Fetch category suggestions
      const catsQ = query(collection(this.firebaseService.db, 'category_requests'), limit(100));
      const catsSnap = await getDocs(catsQ);
      const fetchedCats = catsSnap.docs.map(d => ({ id: d.id, ...d.data() } as CategorySuggestion));
      
      this.categorySuggestions.set(fetchedCats);
      this.saveState();
    } catch (e) {
      console.error("Admin Firebase load error", e);
    }
  }

  private loadState(): void {
    const dataStr = localStorage.getItem(this.STORAGE_KEY);
    if (dataStr) {
      try {
        const parsed = JSON.parse(dataStr);
        this.users.set(parsed.users || []);
        this.categorySuggestions.set(parsed.categorySuggestions || []);
        this.systemLogs.set(parsed.systemLogs || []);
      } catch (e) {
        console.error("Admin state load error", e);
      }
    } else {
      this.users.set([]);
      this.categorySuggestions.set([]);
      this.systemLogs.set([]);
      this.saveState();
    }
  }

  saveState(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
      users: this.users(),
      categorySuggestions: this.categorySuggestions(),
      systemLogs: this.systemLogs()
    }));
  }

  // Update user role
  async updateUserRole(userId: string, role: UserNode['role']): Promise<void> {
    this.users.update(list => 
      list.map(u => u.id === userId ? { ...u, role } : u)
    );
    this.logAction(`ROLE_CHANGE: تغيير صلاحية العقدة ${userId} إلى ${role}`);
    this.saveState();

    try {
      await updateDoc(doc(this.firebaseService.db, 'users', userId), { role });
    } catch (e) {
      console.error("Failed to update user role in Firebase:", e);
    }
  }

  // Toggle suspended status
  async toggleUserStatus(userId: string): Promise<void> {
    let newStatus: UserNode['status'] = 'active';
    this.users.update(list => 
      list.map(u => {
        if (u.id === userId) {
          newStatus = u.status === 'active' ? 'suspended' : 'active';
          return { ...u, status: newStatus };
        }
        return u;
      })
    );
    this.logAction(`STATUS_CHANGE: تغيير حالة العقدة ${userId}`);
    this.saveState();

    try {
      await updateDoc(doc(this.firebaseService.db, 'users', userId), { status: newStatus });
    } catch (e) {
      console.error("Failed to toggle user status in Firebase:", e);
    }
  }

  // Allocate funds to a user node
  async allocateCredits(userId: string, amount: number): Promise<void> {
    this.users.update(list => 
      list.map(u => {
        if (u.id === userId) {
          return { ...u, balance: (u.balance || 0) + amount };
        }
        return u;
      })
    );
    this.logAction(`FUNDS_ALLOCATION: منح العقدة ${userId} رصيد بقيمة ${amount} credits`);
    this.saveState();

    try {
      await updateDoc(doc(this.firebaseService.db, 'users', userId), { balance: increment(amount) });
    } catch (e) {
      console.error("Failed to allocate credits in Firebase:", e);
    }
  }

  // Submit new category suggestion (User facing)
  async suggestCategory(suggestedName: string, parentCategory: string, userName: string, userId: string): Promise<void> {
    const newSuggestionData = {
      suggestedName,
      parentCategory,
      userName,
      userId,
      status: 'pending' as const
    };

    try {
      const docRef = await addDoc(collection(this.firebaseService.db, 'category_requests'), newSuggestionData);
      const newSuggestion: CategorySuggestion = { id: docRef.id, ...newSuggestionData };
      this.categorySuggestions.update(list => [newSuggestion, ...list]);
      this.logAction(`CATEGORY_SUGGESTION: اقتراح تصنيف جديد "${suggestedName}" تحت "${parentCategory}"`);
      this.saveState();
    } catch (e) {
      console.error("Failed to suggest category in Firebase:", e);
      const newLocalSuggestion: CategorySuggestion = { id: 'cat_s' + Math.random().toString(36).substr(2, 9), ...newSuggestionData };
      this.categorySuggestions.update(list => [newLocalSuggestion, ...list]);
      this.saveState();
    }
  }

  // Moderate Category Suggestions
  async moderateCategory(suggestionId: string, status: 'approved' | 'rejected', reason?: string): Promise<void> {
    this.categorySuggestions.update(list => 
      list.map(s => {
        if (s.id === suggestionId) {
          return { ...s, status, rejectionReason: reason };
        }
        return s;
      })
    );
    this.logAction(`CATEGORY_MODERATION: معالجة تصنيف ${suggestionId} بالـ ${status}`);
    this.saveState();

    try {
      const updateData: any = { status };
      if (reason) updateData.rejectionReason = reason;
      await updateDoc(doc(this.firebaseService.db, 'category_requests', suggestionId), updateData);
    } catch (e) {
      console.error("Failed to moderate category in Firebase:", e);
    }
  }

  // Helper log action
  logAction(logText: string): void {
    this.systemLogs.update(list => [
      `[${new Date().toLocaleTimeString('ar-EG')}] ${logText}`,
      ...list.slice(0, 49) // Keep last 50 logs
    ]);
  }
}
