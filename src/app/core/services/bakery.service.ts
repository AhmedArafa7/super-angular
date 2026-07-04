import { Injectable, inject, signal, computed } from '@angular/core';
import { FirebaseService } from './firebase.service';
import { ToastService } from './toast.service';
import { collection, doc, getDocs, setDoc, updateDoc, addDoc, onSnapshot, query, where, orderBy, serverTimestamp } from 'firebase/firestore';

export interface BakeryProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: 'خبز' | 'كرواسون' | 'حلويات' | 'مشروبات';
  isAvailable: boolean;
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
  allActiveOrders = signal<BakeryOrder[]>([]); // For admin

  // Computed
  cartTotal = computed(() => {
    return this.cart().reduce((total, item) => total + (item.product.price * item.quantity), 0);
  });
  cartItemCount = computed(() => {
    return this.cart().reduce((count, item) => count + item.quantity, 0);
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
    const initialProducts: Omit<BakeryProduct, 'id'>[] = [
      { name: 'كرواسون سادة (ساخن)', description: 'كرواسون فرنسي طازج يخبز عند الطلب', price: 25, imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&q=80', category: 'كرواسون', isAvailable: true, preparationTimeMins: 15 },
      { name: 'كرواسون شوكولاتة', description: 'محشو بشوكولاتة بلجيكية ذائبة', price: 35, imageUrl: 'https://images.unsplash.com/photo-1549903072-7e6e0d65605a?w=400&q=80', category: 'كرواسون', isAvailable: true, preparationTimeMins: 15 },
      { name: 'خبز فرنسي (باجيت)', description: 'مخبوز للتو، مقرمش من الخارج وطري من الداخل', price: 20, imageUrl: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=400&q=80', category: 'خبز', isAvailable: true, preparationTimeMins: 20 },
      { name: 'سينابون كلاسيك', description: 'لفائف القرفة الطازجة مع الكريمة الغنية', price: 45, imageUrl: 'https://images.unsplash.com/photo-1509365465985-25d11c17e8a2?w=400&q=80', category: 'حلويات', isAvailable: true, preparationTimeMins: 10 },
      { name: 'قهوة سوداء (V60)', description: 'قهوة مقطرة ساخنة تُعد لحظة وصولك', price: 50, imageUrl: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=400&q=80', category: 'مشروبات', isAvailable: true, preparationTimeMins: 5 },
    ];

    const seeded: BakeryProduct[] = [];
    for (const p of initialProducts) {
      const docRef = doc(collection(this.firebase.db, 'bakery_products'));
      await setDoc(docRef, p);
      seeded.push({ id: docRef.id, ...p });
    }
    return seeded;
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
  listenToAllActiveOrders() {
    if (this.adminOrdersUnsubscribe) return; // Already listening

    // Only get active orders (not completed/cancelled) to save reads
    const q = query(collection(this.firebase.db, 'bakery_orders'), where('status', 'in', ['pending', 'preparing', 'ready']));
    
    this.adminOrdersUnsubscribe = onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(d => {
        const data = d.data();
        return { id: d.id, ...data, createdAt: data['createdAt']?.toDate() || new Date() } as BakeryOrder;
      });
      orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      this.allActiveOrders.set(orders);
    });
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
