import { Injectable, inject, signal, computed } from '@angular/core';
import { FirebaseService } from './firebase.service';
import { ToastService } from './toast.service';
import { collection, doc, getDocs, setDoc, updateDoc, addDoc, deleteDoc, onSnapshot, query, where, orderBy, serverTimestamp } from 'firebase/firestore';

export interface BakeryProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  isAvailable: boolean;
  isPreorderOnly: boolean;
  preparationTimeMins: number;
}

export interface CartItem {
  product: BakeryProduct;
  quantity: number;
}

export interface BakeryOrder {
  id: string;
  userId: string;
  userName: string;
  items: CartItem[];
  totalAmount: number;
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  paymentMethod: 'cash' | 'wallet';
  createdAt: any;
  pickupTimeEstimates?: string;
}

export interface BakeryBatch {
  id: string;
  productId: string;
  quantity: number;
  bakedAt: any;
}

@Injectable({
  providedIn: 'root'
})
export class BakeryService {
  private firebase = inject(FirebaseService);
  private toast = inject(ToastService);

  // State
  products = signal<BakeryProduct[]>([]);
  cart = signal<CartItem[]>([]);
  userOrders = signal<BakeryOrder[]>([]);
  allActiveOrders = signal<BakeryOrder[]>([]); // For admin live view
  allTodayOrders = signal<BakeryOrder[]>([]); // For admin inventory calculation
  allBatches = signal<BakeryBatch[]>([]); // For admin inventory
  posCart = signal<CartItem[]>([]); // For POS terminal

  // Computed
  categories = computed(() => {
    const unique = new Set<string>();
    this.products().forEach(p => {
      if (p.category) unique.add(p.category);
    });
    return Array.from(unique);
  });

  cartTotal = computed(() => {
    return this.cart().reduce((total, item) => total + (item.product.price * item.quantity), 0);
  });
  cartItemCount = computed(() => {
    return this.cart().reduce((count, item) => count + item.quantity, 0);
  });

  // Admin Computed Signals
  posCartTotal = computed(() => {
    return this.posCart().reduce((total, item) => total + (item.product.price * item.quantity), 0);
  });

  inventoryAvailable = computed(() => {
    const available: Record<string, number> = {};
    for (const batch of this.allBatches()) {
      available[batch.productId] = (available[batch.productId] || 0) + batch.quantity;
    }
    for (const order of this.allTodayOrders()) {
      if (order.status !== 'cancelled') {
        for (const item of order.items) {
          available[item.product.id] = (available[item.product.id] || 0) - item.quantity;
        }
      }
    }
    return available;
  });

  nextToBakeRecommendations = computed(() => {
    const recommendations: { product: BakeryProduct, deficit: number }[] = [];
    const available = this.inventoryAvailable();
    const products = this.products();
    
    for (const p of products) {
      if (available[p.id] !== undefined && available[p.id] < 0) {
        recommendations.push({ product: p, deficit: Math.abs(available[p.id]) });
      } else if (available[p.id] === undefined) {
        // If never baked, and ordered, it will be < 0 because of the subtraction
      }
    }
    return recommendations.sort((a, b) => b.deficit - a.deficit);
  });

  constructor() {
    this.loadProducts();
    // Load local cart
    const savedCart = localStorage.getItem('ibad_rahman_cart');
    if (savedCart) {
      try { this.cart.set(JSON.parse(savedCart)); } catch (e) {}
    }
  }

  // ---- Products ----
  async loadProducts() {
    try {
      const snapshot = await getDocs(collection(this.firebase.db, 'bakery_products'));
      let fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as BakeryProduct));
      
      // If empty, seed initial data for today's launch!
      if (fetched.length === 0) {
        fetched = await this.seedInitialProducts();
      }
      this.products.set(fetched);
    } catch (e) {
      console.error('Failed to load bakery products', e);
    }
  }

  private async seedInitialProducts(): Promise<BakeryProduct[]> {
    // TODO: قم بإضافة البيانات الحقيقية الثابتة هنا لاحقاً
    const initialProducts: Omit<BakeryProduct, 'id'>[] = [
      // { name: 'اسم المنتج', description: 'وصف', price: 20, imageUrl: '...', category: 'خبز', isAvailable: true, preparationTimeMins: 15 },
    ];

    if (initialProducts.length === 0) return [];

    const seeded: BakeryProduct[] = [];
    for (const p of initialProducts) {
      const docRef = doc(collection(this.firebase.db, 'bakery_products'));
      await setDoc(docRef, p);
      seeded.push({ id: docRef.id, ...p });
    }
    return seeded;
  }

  async addBakeryProduct(productData: Omit<BakeryProduct, 'id'>) {
    try {
      const docRef = await addDoc(collection(this.firebase.db, 'bakery_products'), productData);
      this.toast.show('تمت إضافة المنتج بنجاح', 'success');
      this.loadProducts();
      return docRef.id;
    } catch (e) {
      console.error(e);
      this.toast.show('فشل إضافة المنتج', 'error');
      return null;
    }
  }

  async updateBakeryProduct(id: string, updates: Partial<BakeryProduct>) {
    try {
      await updateDoc(doc(this.firebase.db, 'bakery_products', id), updates);
      this.toast.show('تم تحديث المنتج بنجاح', 'success');
      this.loadProducts();
    } catch (e) {
      console.error(e);
      this.toast.show('فشل تحديث المنتج', 'error');
    }
  }

  async deleteBakeryProduct(id: string) {
    try {
      await deleteDoc(doc(this.firebase.db, 'bakery_products', id));
      this.toast.show('تم حذف المنتج', 'success');
      this.loadProducts();
    } catch (e) {
      console.error(e);
      this.toast.show('فشل حذف المنتج', 'error');
    }
  }

  // ---- Cart ----
  addToCart(product: BakeryProduct) {
    this.cart.update(items => {
      const existing = items.find(i => i.product.id === product.id);
      if (existing) {
        return items.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...items, { product, quantity: 1 }];
    });
    this.saveCart();
    this.toast.show(`تم إضافة ${product.name} للسلة`, 'success');
  }

  removeFromCart(productId: string) {
    this.cart.update(items => items.filter(i => i.product.id !== productId));
    this.saveCart();
  }

  updateQuantity(productId: string, delta: number) {
    this.cart.update(items => items.map(i => {
      if (i.product.id === productId) {
        const newQ = Math.max(1, i.quantity + delta);
        return { ...i, quantity: newQ };
      }
      return i;
    }));
    this.saveCart();
  }

  clearCart() {
    this.cart.set([]);
    this.saveCart();
  }

  private saveCart() {
    localStorage.setItem('ibad_rahman_cart', JSON.stringify(this.cart()));
  }

  // ---- POS Cart ----
  addToPosCart(product: BakeryProduct) {
    this.posCart.update(items => {
      const existing = items.find(i => i.product.id === product.id);
      if (existing) {
        return items.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...items, { product, quantity: 1 }];
    });
  }

  updatePosQuantity(productId: string, delta: number) {
    this.posCart.update(items => items.map(i => {
      if (i.product.id === productId) {
        return { ...i, quantity: Math.max(1, i.quantity + delta) };
      }
      return i;
    }));
  }

  removePosCartItem(productId: string) {
    this.posCart.update(items => items.filter(i => i.product.id !== productId));
  }

  clearPosCart() {
    this.posCart.set([]);
  }

  async placePOSOrder(userName: string, paymentMethod: 'cash' | 'wallet' = 'cash', immediateComplete = false) {
    if (this.posCart().length === 0) return false;

    const orderData: Omit<BakeryOrder, 'id'> = {
      userId: 'POS_SYSTEM',
      userName: userName || 'زبون عابر',
      items: this.posCart(),
      totalAmount: this.posCartTotal(),
      status: immediateComplete ? 'completed' : 'pending',
      paymentMethod,
      createdAt: serverTimestamp(),
      pickupTimeEstimates: immediateComplete ? 'مستلم' : 'الآن'
    };

    try {
      await addDoc(collection(this.firebase.db, 'bakery_orders'), orderData);
      this.clearPosCart();
      this.toast.show('تم تسجيل طلب نقطة البيع بنجاح', 'success');
      return true;
    } catch (e) {
      console.error(e);
      this.toast.show('فشل تسجيل الطلب', 'error');
      return false;
    }
  }

  // ---- Orders (User) ----
  async placeOrder(paymentMethod: 'cash' | 'wallet' = 'cash') {
    const user = this.firebase.currentUser();
    const userData = this.firebase.userData();
    
    if (!user) {
      this.toast.show('يجب تسجيل الدخول لإتمام الطلب', 'error');
      return false;
    }
    if (this.cart().length === 0) return false;

    // Calculate max preparation time from items
    const maxPrepTime = Math.max(...this.cart().map(i => i.product.preparationTimeMins || 15));
    const pickupEstimate = `خلال ${maxPrepTime} - ${maxPrepTime + 10} دقيقة`;

    const orderData: Omit<BakeryOrder, 'id'> = {
      userId: user.uid,
      userName: userData?.name || userData?.displayName || user.email || 'عميل',
      items: this.cart(),
      totalAmount: this.cartTotal(),
      status: 'pending',
      paymentMethod,
      createdAt: serverTimestamp(),
      pickupTimeEstimates: pickupEstimate
    };

    try {
      const docRef = await addDoc(collection(this.firebase.db, 'bakery_orders'), orderData);
      this.clearCart();
      this.toast.show('تم استلام طلبك بنجاح! جاري تحضيره الآن ليكون ساخناً', 'success');
      // Subscribe to user orders to see live updates
      this.listenToUserOrders(user.uid);
      return true;
    } catch (e) {
      console.error(e);
      this.toast.show('حدث خطأ أثناء تقديم الطلب', 'error');
      return false;
    }
  }

  private userOrdersUnsubscribe: any = null;
  listenToUserOrders(userId: string) {
    if (this.userOrdersUnsubscribe) this.userOrdersUnsubscribe();

    const q = query(
      collection(this.firebase.db, 'bakery_orders'), 
      where('userId', '==', userId),
      orderBy('createdAt', 'desc') // we won't strictly rely on this if indexing fails, but let's try
    );

    this.userOrdersUnsubscribe = onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(d => {
        const data = d.data();
        return { 
          id: d.id, 
          ...data,
          createdAt: data['createdAt']?.toDate() || new Date()
        } as BakeryOrder;
      });
      // Sort in memory to avoid missing index errors in Firebase
      orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      this.userOrders.set(orders);
    }, (error) => {
      console.error('User orders listener error', error);
      // Fallback query without orderBy if index is missing
      if (error.message.includes('index')) {
        const fallbackQ = query(collection(this.firebase.db, 'bakery_orders'), where('userId', '==', userId));
        this.userOrdersUnsubscribe = onSnapshot(fallbackQ, (snap2) => {
          const orders = snap2.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data()['createdAt']?.toDate() || new Date() } as BakeryOrder));
          orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          this.userOrders.set(orders);
        });
      }
    });
  }

  // ---- Admin Panel ----
  private adminOrdersUnsubscribe: any = null;
  listenToAllTodayOrders() {
    if (this.adminOrdersUnsubscribe) return;

    // Listen to all orders for admin math. Sort by time.
    const q = query(collection(this.firebase.db, 'bakery_orders'), orderBy('createdAt', 'desc'));
    
    this.adminOrdersUnsubscribe = onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(d => {
        const data = d.data();
        return { id: d.id, ...data, createdAt: data['createdAt']?.toDate() || new Date() } as BakeryOrder;
      });
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todaysOrders = orders.filter(o => o.createdAt >= today);
      
      this.allTodayOrders.set(todaysOrders);
      this.allActiveOrders.set(todaysOrders.filter(o => ['pending', 'preparing', 'ready'].includes(o.status)));
    });
  }

  private batchesUnsubscribe: any = null;
  listenToBatches() {
    if (this.batchesUnsubscribe) return;
    const q = query(collection(this.firebase.db, 'bakery_batches'), orderBy('bakedAt', 'desc'));
    this.batchesUnsubscribe = onSnapshot(q, (snapshot) => {
      const batches = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        bakedAt: d.data()['bakedAt']?.toDate() || new Date()
      } as BakeryBatch));
      
      // Filter today's batches
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      this.allBatches.set(batches.filter(b => b.bakedAt >= today));
    });
  }

  async addBakingBatch(productId: string, quantity: number) {
    try {
      await addDoc(collection(this.firebase.db, 'bakery_batches'), {
        productId,
        quantity,
        bakedAt: serverTimestamp()
      });
      this.toast.show(`تم تسجيل خبز ${quantity} قطعة بنجاح`, 'success');
    } catch (e) {
      console.error(e);
      this.toast.show('فشل تسجيل دفعة الخبز', 'error');
    }
  }

  async updateOrderStatus(orderId: string, status: BakeryOrder['status']) {
    try {
      await updateDoc(doc(this.firebase.db, 'bakery_orders', orderId), { status });
      this.toast.show(`تم تحديث حالة الطلب إلى: ${status}`, 'success');
    } catch (e) {
      console.error(e);
      this.toast.show('خطأ في تحديث حالة الطلب', 'error');
    }
  }
}
