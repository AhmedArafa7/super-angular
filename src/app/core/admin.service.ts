import { Injectable, inject, signal } from '@angular/core';
import { WalletService } from './wallet.service';
import { MarketService } from './market.service';

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

  // Signals
  users = signal<UserNode[]>([]);
  categorySuggestions = signal<CategorySuggestion[]>([]);
  systemLogs = signal<string[]>([]);

  constructor() {
    this.loadState();
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
      // Seed default user nodes
      const defaultUsers: UserNode[] = [
        {
          id: 'node_1',
          name: 'المهندس أحمد عرفة',
          role: 'founder',
          balance: 25000,
          weightGb: 100,
          status: 'active',
          lastActive: new Date().toISOString()
        },
        {
          id: 'node_2',
          name: 'د. يوسف النجار',
          role: 'cofounder',
          balance: 18000,
          weightGb: 80,
          status: 'active',
          lastActive: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: 'node_3',
          name: 'سارة عبد الرحمن',
          role: 'management',
          balance: 5200,
          weightGb: 50,
          status: 'active',
          lastActive: new Date(Date.now() - 3600000 * 4).toISOString()
        },
        {
          id: 'node_4',
          name: 'عمر خالد (مشاريع طلابية)',
          role: 'member',
          balance: 850,
          weightGb: 20,
          status: 'active',
          lastActive: new Date(Date.now() - 3600000 * 24).toISOString()
        },
        {
          id: 'node_5',
          name: 'حساب مجهول (قيد المراجعة)',
          role: 'member',
          balance: 0,
          weightGb: 10,
          status: 'pending',
          lastActive: new Date(Date.now() - 3600000 * 48).toISOString()
        }
      ];

      // Seed category requests
      const defaultSuggestions: CategorySuggestion[] = [
        {
          id: 'cat_s1',
          suggestedName: 'إنترنت الأشياء (IoT)',
          parentCategory: 'مشاريع العتاد',
          userName: 'المهندس أحمد',
          userId: 'node_1',
          status: 'pending'
        },
        {
          id: 'cat_s2',
          suggestedName: 'الواقع الافتراضي (VR)',
          parentCategory: 'التطبيقات البرمجية',
          userName: 'عمر خالد',
          userId: 'node_4',
          status: 'pending'
        }
      ];

      const defaultLogs = [
        'SYSTEM: تم تهيئة شبكة العقد بنجاح.',
        'SECURITY: اتصال آمن مشفر من العقدة المؤسسة.',
        'DATABASE: تم استيراد 156 معاملة مالية نشطة.'
      ];

      this.users.set(defaultUsers);
      this.categorySuggestions.set(defaultSuggestions);
      this.systemLogs.set(defaultLogs);
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
  updateUserRole(userId: string, role: UserNode['role']): void {
    this.users.update(list => 
      list.map(u => u.id === userId ? { ...u, role } : u)
    );
    this.logAction(`ROLE_CHANGE: تغيير صلاحية العقدة ${userId} إلى ${role}`);
    this.saveState();
  }

  // Toggle suspended status
  toggleUserStatus(userId: string): void {
    this.users.update(list => 
      list.map(u => {
        if (u.id === userId) {
          const newStatus: UserNode['status'] = u.status === 'active' ? 'suspended' : 'active';
          return { ...u, status: newStatus };
        }
        return u;
      })
    );
    this.logAction(`STATUS_CHANGE: تغيير حالة العقدة ${userId}`);
    this.saveState();
  }

  // Allocate funds to a user node
  allocateCredits(userId: string, amount: number): void {
    this.users.update(list => 
      list.map(u => {
        if (u.id === userId) {
          return { ...u, balance: u.balance + amount };
        }
        return u;
      })
    );
    this.logAction(`FUNDS_ALLOCATION: منح العقدة ${userId} رصيد بقيمة ${amount} credits`);
    this.saveState();
  }

  // Submit new category suggestion (User facing)
  suggestCategory(suggestedName: string, parentCategory: string, userName: string, userId: string): void {
    const newSuggestion: CategorySuggestion = {
      id: 'cat_s' + Math.random().toString(36).substr(2, 9),
      suggestedName,
      parentCategory,
      userName,
      userId,
      status: 'pending'
    };

    this.categorySuggestions.update(list => [newSuggestion, ...list]);
    this.logAction(`CATEGORY_SUGGESTION: اقتراح تصنيف جديد "${suggestedName}" تحت "${parentCategory}"`);
    this.saveState();
  }

  // Moderate Category Suggestions
  moderateCategory(suggestionId: string, status: 'approved' | 'rejected', reason?: string): void {
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
  }

  // Helper log action
  logAction(logText: string): void {
    this.systemLogs.update(list => [
      `[${new Date().toLocaleTimeString('ar-EG')}] ${logText}`,
      ...list.slice(0, 49) // Keep last 50 logs
    ]);
  }
}
