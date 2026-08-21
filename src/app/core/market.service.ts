import { Injectable, signal, computed, inject } from '@angular/core';
import { WalletService } from './wallet.service';
import { FirebaseService } from './services/firebase.service';
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc, increment, query, limit, arrayUnion, setDoc } from 'firebase/firestore';

export interface MarketCategoryDef {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export const MARKET_CATEGORIES: MarketCategoryDef[] = [
  { id: 'all', name: 'كل القطاعات', icon: 'layout-grid', description: 'استعراض شامل لجميع الأصول والعقد البرمجية' },
  { id: 'electronics', name: 'الإلكترونيات', icon: 'monitor', description: 'أجهزة ذكية، حواسيب، شاشات، وقطع إلكترونية متطورة' },
  { id: 'home', name: 'المنزل وأسلوب الحياة', icon: 'home', description: 'حلول ذكية للمنزل وأسلوب المعيشة العصري' },
  { id: 'digital_assets', name: 'الأصول الرقمية', icon: 'layers', description: 'تصاميم 3D، قوالب جرافيك، أيقونات، ورموز برمجية' },
  { id: 'ui_ux', name: 'تصميمات الواجهة', icon: 'palette', description: 'واجهات مستخدم كاملة، قوالب Figma، وأنظمة Design Systems' },
  { id: 'tech_services', name: 'الخدمات التقنية', icon: 'server', description: 'استضافات سحابية، استشارات، وإعداد بنية تحتية' },
  { id: 'ai_tools', name: 'AI أدوات', icon: 'bot', description: 'نماذج ذكاء اصطناعي، روبوتات محادثة، وأدوات أتمتة' },
  { id: 'industrial', name: 'المعدات الصناعية', icon: 'wrench', description: 'أدوات هندسية، طابعات 3D، ومعدات تصنيع' },
  { id: 'health_beauty', name: 'الصحة والجمال', icon: 'sparkles', description: 'أجهزة متابعة الصحة البدنية والتطبيقات الرياضية' },
  { id: 'knowledge', name: 'المعرفة', icon: 'graduation-cap', description: 'كورسات متقدمة، كتب برمجية، وتوثيقات تقنية' },
  { id: 'software_nodes', name: 'البرمجيات والعقد', icon: 'terminal', description: 'تطبيقات ويب، أدوات سطح مكتب، وخدمات Microservices' }
];

export interface MarketItem {
  id: string;
  title: string;
  description: string;
  price: number; // 0 for free (مجاناً)
  currency: string; // 'BKC' | 'EGC' | 'DLC'
  mainCategory: string; // matches id in MARKET_CATEGORIES
  categoryLabel?: string;
  badge?: string; // e.g. 'WEB_APPS', 'DESIGN', 'AI_CORE', 'FINAL', 'BETA'
  badgeColor?: 'emerald' | 'amber' | 'sky' | 'indigo' | 'purple' | 'rose';
  secondaryBadge?: string;
  secondaryBadgeColor?: 'emerald' | 'amber' | 'sky' | 'indigo' | 'purple' | 'rose';
  imageUrl: string;
  demoUrl?: string; // Direct live app link or shortcut (e.g. https://ilovepdf.com or app route)
  downloadUrl?: string;
  sellerId: string;
  sellerName?: string;
  sellerAvatar?: string;
  purchasedBy?: string[];
  stock: number;
  rating?: number;
  ratingCount?: number;
  status: 'active' | 'sold_out' | 'pending_review' | 'rejected';
  adminFeedback?: string;
  createdAt?: string;
  tags?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class MarketService {
  private readonly STORAGE_KEY = 'Si-Neuro-market-registry-v5';
  walletService = inject(WalletService);
  private firebaseService = inject(FirebaseService);

  // Core signals
  items = signal<MarketItem[]>([]);
  activeCategory = signal<string>('all');
  activeTab = signal<'explore' | 'mine'>('explore');
  searchQuery = signal<string>('');

  constructor() {
    this.loadState();
    this.syncFromFirebase();
  }

  // Get initial seed products matching screenshot exactly
  private getInitialSeedItems(): MarketItem[] {
    return [
      {
        id: 'dulms_portal_1',
        title: 'جامعة الدلتا (DULMS)',
        description: 'تصميم مطابق بالكامل لنظام إدارة التعلم الحالي لجامعة الدلتا، مع دعم المقررات والجداول الدراسية وتسليم الواجبات وإدارة الحسابات الأكاديمية بدقة فائقة.',
        price: 0,
        currency: 'BKC',
        mainCategory: 'ui_ux',
        categoryLabel: 'تصميمات الواجهة',
        badge: 'تصميمات الواجهة',
        badgeColor: 'indigo',
        imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=800&auto=format&fit=crop',
        demoUrl: 'https://dulms.deltauniv.edu.eg',
        sellerId: 'system_core',
        sellerName: 'Delta Systems Hub',
        purchasedBy: [],
        stock: 999,
        rating: 4.9,
        ratingCount: 142,
        status: 'active',
        createdAt: '2026-08-10T10:00:00.000Z',
        tags: ['جامعة الدلتا', 'DULMS', 'نظام إدارة التعلم', 'LMS', 'بورتال']
      },
      {
        id: 'dulms_library_2',
        title: 'جامعة الدلتا (DULMS) - الأرشيف',
        description: 'تصميم مطابق بالكامل لنظام إدارة التعلم والمكتبة الرقمية لجامعة الدلتا، يشمل قاعة المراجع والكتب الإلكترونية والمستودع العلمي.',
        price: 0,
        currency: 'BKC',
        mainCategory: 'ui_ux',
        categoryLabel: 'تصميمات الواجهة',
        badge: 'تصميمات الواجهة',
        badgeColor: 'indigo',
        imageUrl: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=800&auto=format&fit=crop',
        demoUrl: 'https://dulms.deltauniv.edu.eg',
        sellerId: 'system_core',
        sellerName: 'Delta Dev Team',
        purchasedBy: [],
        stock: 500,
        rating: 4.8,
        ratingCount: 88,
        status: 'active',
        createdAt: '2026-08-11T12:00:00.000Z',
        tags: ['جامعة الدلتا', 'مكتبة', 'DULMS', 'أرشيف']
      },
      {
        id: 'ilovepdf_shortcut_3',
        title: 'ilovepdf',
        description: 'ممكن تتعامل معه على أنه shortcut للموقع الرسمي لأدوات الـ PDF المتقدمة، دمج وتقسيم وضغط وتحويل ملفات الـ PDF بسرعة متناهية.',
        price: 1000,
        currency: 'BKC',
        mainCategory: 'software_nodes',
        categoryLabel: 'البرمجيات والعقد',
        badge: 'WEB_APPS',
        badgeColor: 'emerald',
        secondaryBadge: 'FINAL',
        secondaryBadgeColor: 'emerald',
        imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop',
        demoUrl: 'https://www.ilovepdf.com',
        sellerId: 'pdf_solutions',
        sellerName: 'DocuTools Pro',
        purchasedBy: [],
        stock: 100,
        rating: 5.0,
        ratingCount: 312,
        status: 'active',
        createdAt: '2026-08-12T14:30:00.000Z',
        tags: ['pdf', 'ilovepdf', 'tools', 'shortcut', 'web_apps']
      },
      {
        id: 'game_in_dev_4',
        title: 'لعبه قيد التطوير',
        description: 'انتظر القادم. تجربة تفاعلية جديدة قيد التطوير تعتمد على محرك ألعاب مدمج ومغامرات لا تنتهي.',
        price: 0,
        currency: 'BKC',
        mainCategory: 'software_nodes',
        categoryLabel: 'البرمجيات والعقد',
        badge: 'WEB_APPS',
        badgeColor: 'emerald',
        secondaryBadge: 'BETA',
        secondaryBadgeColor: 'amber',
        imageUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=800&auto=format&fit=crop',
        demoUrl: '/arcade',
        sellerId: 'game_studios',
        sellerName: 'Neural Play Studio',
        purchasedBy: [],
        stock: 50,
        rating: 4.7,
        ratingCount: 65,
        status: 'active',
        createdAt: '2026-08-14T09:15:00.000Z',
        tags: ['ألعاب', 'game', 'arcade', 'بيتا', 'تطوير']
      },
      {
        id: 'neural_agent_ai_5',
        title: 'مساعد الذكاء الاصطناعي العصبي (Neural AI Engine)',
        description: 'محرك ذكاء اصطناعي متعدد القدرات لتحليل الكود وتوليد الحلول البرمجية وترجمة النصوص وإدارة المهام المعقدة تلقائياً.',
        price: 500,
        currency: 'BKC',
        mainCategory: 'ai_tools',
        categoryLabel: 'AI أدوات',
        badge: 'AI_TOOLS',
        badgeColor: 'purple',
        secondaryBadge: 'PRO',
        secondaryBadgeColor: 'sky',
        imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop',
        demoUrl: '/agent-ai',
        sellerId: 'system_core',
        sellerName: 'Si-Neuro Core',
        purchasedBy: [],
        stock: 300,
        rating: 4.95,
        ratingCount: 420,
        status: 'active',
        createdAt: '2026-08-15T08:00:00.000Z',
        tags: ['ذكاء اصطناعي', 'AI', 'agent', 'مساعد', 'برمجة']
      },
      {
        id: '3d_neon_assets_6',
        title: 'حزمة أيقونات النيون ثلاثية الأبعاد (3D Neon Icons)',
        description: 'مجموعة احترافية تضم أكثر من 300 أيقونة ثلاثية الأبعاد بدقة 4K مع ملفات المصدر (Blender, Figma, PNG).',
        price: 250,
        currency: 'BKC',
        mainCategory: 'digital_assets',
        categoryLabel: 'الأصول الرقمية',
        badge: 'DIGITAL_ASSETS',
        badgeColor: 'sky',
        imageUrl: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=800&auto=format&fit=crop',
        sellerId: 'designer_pro',
        sellerName: 'Cyber Design Lab',
        purchasedBy: [],
        stock: 200,
        rating: 4.85,
        ratingCount: 190,
        status: 'active',
        createdAt: '2026-08-16T11:00:00.000Z',
        tags: ['أصول رقمية', '3D', 'أيقونات', 'Figma', 'جرافيك']
      },
      {
        id: 'esp32_iot_hub_7',
        title: 'وحدة التحكم الذكية ESP32 IoT Hub',
        description: 'متحكم دقيق متقدم مدمج به شاشة OLED ومستشعرات حرارة ورطوبة مع دعم الربط السحابي والتحكم عن بعد.',
        price: 1500,
        currency: 'BKC',
        mainCategory: 'electronics',
        categoryLabel: 'الإلكترونيات',
        badge: 'HARDWARE',
        badgeColor: 'amber',
        imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=800&auto=format&fit=crop',
        demoUrl: '/microcontroller-lab',
        sellerId: 'hardware_lab',
        sellerName: 'IoT Nexus Hardware',
        purchasedBy: [],
        stock: 35,
        rating: 4.9,
        ratingCount: 54,
        status: 'active',
        createdAt: '2026-08-17T16:00:00.000Z',
        tags: ['إلكترونيات', 'متحكمات', 'ESP32', 'IoT', 'عتاد']
      },
      {
        id: 'cloud_edge_cdn_8',
        title: 'شبكة توزيع المحتوى الفائق (Edge Cloud CDN)',
        description: 'بنية تحتية سحابية موزعة عالمياً لتسريع استجابة المواقع وتأمين تدفق الفيديو والبيانات بضمان 99.99%.',
        price: 2000,
        currency: 'BKC',
        mainCategory: 'tech_services',
        categoryLabel: 'الخدمات التقنية',
        badge: 'CLOUD_SERVICES',
        badgeColor: 'sky',
        imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=800&auto=format&fit=crop',
        sellerId: 'cloud_ops',
        sellerName: 'Global Edge Cloud',
        purchasedBy: [],
        stock: 50,
        rating: 5.0,
        ratingCount: 98,
        status: 'active',
        createdAt: '2026-08-18T18:00:00.000Z',
        tags: ['سحابة', 'CDN', 'خدمات تقنية', 'استضافة', 'أمان']
      }
    ];
  }

  // Load from local storage and fallback to rich seeds
  private loadState(): void {
    const dataStr = localStorage.getItem(this.STORAGE_KEY);
    if (dataStr) {
      try {
        const parsed = JSON.parse(dataStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.items.set(parsed);
          return;
        }
      } catch (e) {
        console.error("Market Load Error", e);
      }
    }

    const seeds = this.getInitialSeedItems();
    this.items.set(seeds);
    this.saveState();
  }

  saveState(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.items()));
  }

  // Firebase Synchronization
  async syncFromFirebase(): Promise<void> {
    try {
      const q = query(collection(this.firebaseService.db, 'products'), limit(200));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const fetchedItems = snap.docs.map(d => ({ id: d.id, ...d.data() } as MarketItem));
        
        // Merge with local seed items to preserve essential showcase products
        const seedItems = this.getInitialSeedItems();
        const mergedMap = new Map<string, MarketItem>();
        
        seedItems.forEach(item => mergedMap.set(item.id, item));
        fetchedItems.forEach(item => mergedMap.set(item.id, item));
        
        const mergedList = Array.from(mergedMap.values());
        mergedList.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });

        this.items.set(mergedList);
        this.saveState();
      } else {
        // First time initialization in Firebase: upload seeds
        const seeds = this.getInitialSeedItems();
        for (const seed of seeds) {
          try {
            await setDoc(doc(this.firebaseService.db, 'products', seed.id), seed);
          } catch (err) {
            // ignore individual seed upload errors
          }
        }
      }
    } catch (e) {
      console.warn("Market Firebase sync notice (using local state):", e);
    }
  }

  // Add listing item
  async addItem(data: Partial<MarketItem>): Promise<MarketItem> {
    const currentUserId = this.firebaseService.getUserId() || 'me';
    const catDef = MARKET_CATEGORIES.find(c => c.id === data.mainCategory) || MARKET_CATEGORIES[0];

    const newItemData: MarketItem = {
      id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: (data.title || 'منتج جديد').trim(),
      description: (data.description || '').trim(),
      price: data.price ?? 0,
      currency: data.currency || 'BKC',
      mainCategory: data.mainCategory || 'software_nodes',
      categoryLabel: catDef.name,
      badge: data.badge || (data.price === 0 ? 'مجاني' : 'عقدة'),
      badgeColor: (data.badgeColor as any) || (data.price === 0 ? 'emerald' : 'indigo'),
      secondaryBadge: data.secondaryBadge,
      secondaryBadgeColor: data.secondaryBadgeColor,
      imageUrl: data.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop',
      demoUrl: data.demoUrl,
      downloadUrl: data.downloadUrl,
      sellerId: currentUserId,
      sellerName: data.sellerName || 'أحمد عرفه (أنت)',
      purchasedBy: [],
      stock: data.stock ?? 10,
      rating: 5.0,
      ratingCount: 1,
      status: 'active',
      createdAt: new Date().toISOString(),
      tags: data.tags || [catDef.name, 'منتج جديد']
    };

    // Update local state immediately
    this.items.update(list => [newItemData, ...list]);
    this.saveState();

    // Sync with Firebase
    try {
      await setDoc(doc(this.firebaseService.db, 'products', newItemData.id), newItemData);
    } catch (error) {
      console.error("Firebase sync error on adding product:", error);
    }

    return newItemData;
  }

  // Update existing item
  async updateItem(id: string, updates: Partial<MarketItem>): Promise<void> {
    this.items.update(list => list.map(item => {
      if (item.id === id) {
        return { ...item, ...updates };
      }
      return item;
    }));
    this.saveState();

    try {
      await updateDoc(doc(this.firebaseService.db, 'products', id), updates as any);
    } catch (error) {
      console.error("Firebase update product error:", error);
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
  async acquireItem(id: string): Promise<{ success: boolean; message: string }> {
    const currentItems = this.items();
    const item = currentItems.find(i => i.id === id);
    if (!item) return { success: false, message: "لم يتم العثور على هذا المنتج." };

    const userId = this.firebaseService.getUserId() || 'me';

    // Already owned
    if (item.sellerId === userId || item.purchasedBy?.includes(userId)) {
      return { success: true, message: "هذا المنتج موجود بالفعل في أصولك الخاصة." };
    }

    if (item.stock <= 0) {
      return { success: false, message: "عذراً، نفدت الكمية المتاحة من هذا المنتج." };
    }

    // Free item acquisition
    if (item.price === 0) {
      const newStock = Math.max(0, item.stock - 1);
      const updatedPurchasedBy = [...(item.purchasedBy || []), userId];

      this.items.update(list => list.map(i => i.id === id ? { ...i, stock: newStock, purchasedBy: updatedPurchasedBy } : i));
      this.saveState();

      try {
        await updateDoc(doc(this.firebaseService.db, 'products', id), {
          stock: newStock,
          purchasedBy: arrayUnion(userId)
        });
      } catch (err) {
        console.warn("Firebase free acquisition sync error:", err);
      }

      return { success: true, message: `تم الاستحواذ على "${item.title}" مجاناً بنجاح وإضافته إلى أصولك!` };
    }

    // Paid item acquisition: Verify wallet balance
    const walletBalance = this.walletService.balances().BKC;
    if (walletBalance < item.price) {
      return {
        success: false,
        message: `عذراً، رصيدك غير كافٍ. تحتاج إلى ${item.price.toLocaleString()} BKC ورصيدك الحالي هو ${walletBalance.toLocaleString()} BKC.`
      };
    }

    // Deduct funds from wallet
    const deductionSuccess = this.walletService.adjustFunds(item.price, 'withdrawal', 'BKC');
    if (!deductionSuccess) {
      return { success: false, message: "فشلت عملية خصم الرصيد من المحفظة." };
    }

    const newStock = Math.max(0, item.stock - 1);
    const updatedPurchasedBy = [...(item.purchasedBy || []), userId];

    this.items.update(list => list.map(i => i.id === id ? { ...i, stock: newStock, purchasedBy: updatedPurchasedBy } : i));
    this.saveState();

    try {
      await updateDoc(doc(this.firebaseService.db, 'products', id), {
        stock: newStock,
        purchasedBy: arrayUnion(userId)
      });
    } catch (err) {
      console.error("Firebase paid acquisition sync error:", err);
    }

    return {
      success: true,
      message: `تم الاستحواذ بنجاح على "${item.title}" وتم خصم ${item.price.toLocaleString()} BKC من محفظتك!`
    };
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
