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
    // Load local carts
    const savedCart = localStorage.getItem('ibad_rahman_cart');
    if (savedCart) {
      try { this.cart.set(JSON.parse(savedCart)); } catch (e) {}
    }
    const savedPosCart = localStorage.getItem('ibad_rahman_pos_cart');
    if (savedPosCart) {
      try { this.posCart.set(JSON.parse(savedPosCart)); } catch (e) {}
    }
  }

  // ---- Products ----
  async loadProducts() {
    try {
      const snapshot = await getDocs(collection(this.firebase.db, 'bakery_products'));
      let fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as BakeryProduct));

      // If empty or if we want to ensure gorgeous high-quality real mock products matching their images
      const realProducts: Omit<BakeryProduct, 'id'>[] = [
        {
          name: 'فطير مشلتت فلاحي بالسمن البلدي',
          description: 'فطير فلاحي مورق ومقرمش من برة وطري من جوة، محضر بالسمن البلدي الأصلي والقشطة الطازجة.',
          price: 65,
          imageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?q=80&w=800&auto=format',
          category: 'فطير مشلتت',
          isAvailable: true,
          isPreorderOnly: false,
          preparationTimeMins: 20
        },
        {
          name: 'كرواسون زبدة فرنسي طازج',
          description: 'كرواسون هش ومقرمش محشو بالزبدة الفرنسية الطبيعية، يخبز طازجاً كل صباح.',
          price: 25,
          imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?q=80&w=800&auto=format',
          category: 'مخبوزات غربية',
          isAvailable: true,
          isPreorderOnly: false,
          preparationTimeMins: 10
        },
        {
          name: 'خبز بلدي طازج بالردة (5 أرغفة)',
          description: 'خبز بلدي مصري أصلي ساخن ومطحون بالردة الطازجة، مخبوز في الفرن الحجري.',
          price: 10,
          imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=800&auto=format',
          category: 'خبز ومخبوزات',
          isAvailable: true,
          isPreorderOnly: false,
          preparationTimeMins: 5
        },
        {
          name: 'بسبوسة مرملة بالسمن البلدي والمكسرات',
          description: 'بسبوسة شرقية دايبة بالسمن البلدي الفاخر ومغطاة بالمكسرات المقرمشة ومسقية بالشربات الساخن.',
          price: 90,
          imageUrl: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?q=80&w=800&auto=format',
          category: 'حلويات شرقية',
          isAvailable: true,
          isPreorderOnly: false,
          preparationTimeMins: 15
        },
        {
          name: 'بيتزا إيطالية بالجبنة الموزاريلا',
          description: 'عجينة بيتزا هشة مخبوزة طازجة مع صوص الطماطم الإيطالي وطبقة كثيفة من جبنة الموزاريلا السائحة.',
          price: 120,
          imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=800&auto=format',
          category: 'معجنات وبيتزا',
          isAvailable: true,
          isPreorderOnly: false,
          preparationTimeMins: 25
        },
        {
          name: 'كيك الشوكولاتة الفاخر بالصوص الغني',
          description: 'قطع كيك شوكولاتة طرية وغنية بصوص الشوكولاتة البلجيكية الساخنة واللذيذة.',
          price: 45,
          imageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?q=80&w=800&auto=format',
          category: 'حلويات شرقية',
          isAvailable: true,
          isPreorderOnly: false,
          preparationTimeMins: 10
        }
      ];

      // If fetched is empty, seed them
      if (fetched.length === 0) {
        for (const p of realProducts) {
          await addDoc(collection(this.firebase.db, 'bakery_products'), p);
        }
        const snapshot2 = await getDocs(collection(this.firebase.db, 'bakery_products'));
        fetched = snapshot2.docs.map(d => ({ id: d.id, ...d.data() } as BakeryProduct));
      }

      this.products.set(fetched);
    } catch (e) {
      console.error('Failed to load bakery products', e);
    }
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
    if (confirm('هل أنت متأكد من حذف هذا المنتج من السلة؟')) {
      this.cart.update(items => items.filter(i => i.product.id !== productId));
      this.saveCart();
      this.toast.show('تم حذف المنتج', 'success');
    }
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
    if (confirm('هل أنت متأكد من مسح السلة بالكامل؟')) {
      this.cart.set([]);
      this.saveCart();
      this.toast.show('تم مسح السلة', 'success');
    }
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
    this.savePosCart();
  }

  updatePosQuantity(productId: string, delta: number) {
    this.posCart.update(items => items.map(i => {
      if (i.product.id === productId) {
        return { ...i, quantity: Math.max(1, i.quantity + delta) };
      }
      return i;
    }));
    this.savePosCart();
  }

  removePosCartItem(productId: string) {
    this.posCart.update(items => items.filter(i => i.product.id !== productId));
    this.savePosCart();
  }

  clearPosCart() {
    this.posCart.set([]);
    this.savePosCart();
  }

  private savePosCart() {
    localStorage.setItem('ibad_rahman_pos_cart', JSON.stringify(this.posCart()));
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
