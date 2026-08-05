import { Injectable, signal, computed, inject } from '@angular/core';
import { collection, doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { ToastService } from './toast.service';

export interface OmAlQuraAisleConfig {
  id: string;
  name: string;
  shelves: string[];
}

export interface OmAlQuraStoreLayout {
  storeEntranceLabel: string;
  checkoutAreaLabel: string;
  warehouseAreaLabel: string;
  aisles: OmAlQuraAisleConfig[];
  customSketchNotes?: string;
  sketchImageUrl?: string;
}

export interface OmAlQuraProduct {
  id: string;
  name: string;
  barcode?: string; // الكود التسلسلي / الباركود الخاص بالمنتج
  category: string;
  price: number;
  stockQuantity: number;
  discountPercent: number; // e.g. 10 for 10%
  isBoycott: boolean;
  boycottReason?: string;
  boycottAlternatives: string[]; // List of product names ordered best to worst
  locationInStore: string; // e.g. "الممر 1 - الرف A2 (جهة اليمين)"
  locationInWarehouse?: string; // e.g. "المخزن - رف W-1"
  isInWarehouse: boolean;
  expectedRestockDate?: string; // e.g. "غداً 4 مساءً"
  imageUrl: string;
  description: string;
  salesCount: number;
}

export interface OmAlQuraEmployee {
  id: string;
  name: string;
  role: 'مبيعات' | 'أمينات مخزن' | 'دليفري' | 'مدير';
  phone: string;
  salary: number; // EGP
  workingHoursThisMonth: number;
  holidaysTaken: number;
  isSuspended: boolean;
  shiftStatus: 'clocked_in' | 'clocked_out';
  lastClockIn?: string;
}

export interface OmAlQuraAttendanceLog {
  id: string;
  employeeId: string;
  employeeName: string;
  type: 'in' | 'out';
  time: string;
  date: string;
}

export interface OmAlQuraOrderItem {
  product: OmAlQuraProduct;
  quantity: number;
}

export interface OmAlQuraOrder {
  id: string;
  orderType: 'delivery' | 'pickup' | 'pos' | 'whatsapp';
  customerName: string;
  customerPhone: string;
  items: OmAlQuraOrderItem[];
  totalPrice: number;
  status: 'pending' | 'preparing' | 'on_the_way' | 'completed' | 'cancelled';
  assignedDriverId?: string;
  assignedDriverName?: string;
  assignedDriverPhone?: string;
  deliveryAddress?: string;
  deliveryEta?: string; // e.g. "25 دقيقة"
  paymentMethod: 'كاش' | 'فيزا' | 'محفظة إلكترونية';
  notes?: string;
  createdAt: string;
  cancellationReason?: string;
  cancelledAt?: string;
}

export interface OmAlQuraDeliveryDriver {
  id: string;
  name: string;
  phone: string;
  status: 'متاح' | 'في مهمة توصيل' | 'خارج الدوام';
  workingHoursInfo: string;
  activeDeliveriesCount: number;
}

export interface OmAlQuraCustomerDebt {
  id: string;
  customerName: string;
  customerPhone: string;
  debtAmount: number;
  notes: string;
  lastUpdated: string;
  status: 'معلق' | 'مسدد بالكامل' | 'تسديد جزئي';
}

export interface OmAlQuraSupplier {
  id: string;
  name: string;
  phone: string;
  companyName: string;
  suppliedCategories: string[];
  notes?: string;
}

export interface OmAlQuraPurchaseOrderItem {
  productId?: string;
  productName: string;
  currentStock: number;
  requestedQuantity: number;
  unitPriceEst?: number;
}

export interface OmAlQuraPurchaseOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  supplierPhone: string;
  items: OmAlQuraPurchaseOrderItem[];
  totalEstPrice: number;
  status: 'تم الإنشاء' | 'تم الإرسال للمورد' | 'تم الاستلام وزيادة المخزون';
  createdAt: string;
  notes?: string;
}

export interface OmAlQuraMissingProductRequest {
  id: string;
  customerName: string;
  customerPhone: string;
  requestedProductName: string;
  notes?: string;
  requestedAt: string;
  status: 'جديد' | 'قيد المراجعة' | 'تم التوفير';
}

export interface OmAlQuraStaffSuggestion {
  id: string;
  staffName: string;
  title: string;
  details: string;
  createdAt: string;
  status: 'جديد' | 'تمت دراسته' | 'مطبق';
}

export interface OmAlQuraFaq {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export interface OmAlQuraCustomerInfo {
  name: string;
  phone: string;
  address: string;
  preferredDriverId?: string | null;
  preferredPaymentMethod?: 'كاش' | 'فيزا' | 'محفظة إلكترونية';
}

@Injectable({
  providedIn: 'root'
})
export class OmAlQuraService {
  private firebase = inject(FirebaseService);
  private toast = inject(ToastService);

  // State Signals
  products = signal<OmAlQuraProduct[]>([]);
  employees = signal<OmAlQuraEmployee[]>([]);
  attendanceLogs = signal<OmAlQuraAttendanceLog[]>([]);

  // Realtime clock signal to drive 5-minute attendance code updates
  currentTime = signal<Date>(new Date());

  // Daily Attendance Code (visible only to the manager, changes every 5 minutes)
  private attendanceCodeSalt = 'omalqura_2026_attendance_secret';
  dailyAttendanceCode = computed(() => this.generateDailyAttendanceCode(this.currentTime()));

  // Time remaining until the next 5-minute code refresh (formatted MM:SS)
  attendanceCodeTimeRemaining = computed(() => {
    const now = this.currentTime();
    const secondsInWindow = 5 * 60;
    const elapsedSeconds = Math.floor(now.getTime() / 1000) % secondsInWindow;
    const remainingSeconds = secondsInWindow - elapsedSeconds;
    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  });
  orders = signal<OmAlQuraOrder[]>([]);
  deliveryDrivers = signal<OmAlQuraDeliveryDriver[]>([]);
  customerDebts = signal<OmAlQuraCustomerDebt[]>([]);
  missingProductRequests = signal<OmAlQuraMissingProductRequest[]>([]);
  staffSuggestions = signal<OmAlQuraStaffSuggestion[]>([]);
  faqs = signal<OmAlQuraFaq[]>([]);
  categories = signal<string[]>([]);
  suppliers = signal<OmAlQuraSupplier[]>([]);
  purchaseOrders = signal<OmAlQuraPurchaseOrder[]>([]);

  // Customizable Store Sketch Layout & Aisle/Shelf Names
  storeLayout = signal<OmAlQuraStoreLayout>({
    storeEntranceLabel: 'المدخل الرئيسي للمحل',
    checkoutAreaLabel: 'منطقة الكاشير والاستقبال',
    warehouseAreaLabel: 'المخزن الداخلي الخلفي',
    aisles: [
      { id: 'aisle-1', name: 'الممر 1 (مساحيق غسيل ومنعمات)', shelves: ['الرف 1 (علوي)', 'الرف 2 (وسط)', 'الرف 3 (سفلي)'] },
      { id: 'aisle-2', name: 'الممر 2 (منظفات صحون ومطهرات)', shelves: ['الرف 1 (علوي)', 'الرف 2 (وسط)', 'الرف 3 (سفلي)'] },
      { id: 'aisle-3', name: 'الممر 3 (عناية شخصية وشامبو)', shelves: ['الرف 1 (علوي)', 'الرف 2 (وسط)', 'الرف 3 (سفلي)'] }
    ],
    customSketchNotes: 'يرجى اتباع الممرات المضاءة باللون الأصفر للوصول إلى الصنف المطلوب مباشرة.'
  });

  // Customer Cart & Personal State
  cart = signal<OmAlQuraOrderItem[]>([]);
  userFavoriteProductIds = signal<string[]>([]);
  selectedDriverId = signal<string | null>(null);
  savedCustomerInvoice = signal<OmAlQuraOrder | null>(null);
  customerInfo = signal<OmAlQuraCustomerInfo>({
    name: '',
    phone: '',
    address: '',
    preferredDriverId: null
  });

  // Notifications Signals for Staff Portal
  newNotificationsCount = computed(() => {
    const pendingOrders = this.orders().filter(o => o.status === 'pending');
    const newMissing = this.missingProductRequests().filter(r => r.status === 'جديد');
    return pendingOrders.length + newMissing.length;
  });

  // Low stock products alert (for admin & staff)
  lowStockProducts = computed(() => {
    return this.products().filter(p => p.stockQuantity <= 5);
  });

  constructor() {
    this.loadInitialData();
    this.initFirestoreSync();
    setInterval(() => this.currentTime.set(new Date()), 1000);
  }

  // Real-time Cloud Database Listeners (Firestore Real-time Sync across all browsers/devices)
  private initFirestoreSync() {
    try {
      if (!this.firebase.firestore) return;

      // 1. Real-time Products Sync
      onSnapshot(collection(this.firebase.firestore, 'omalqura_products'), (snapshot) => {
        const prods = snapshot.docs.map(d => d.data() as OmAlQuraProduct);
        if (prods.length > 0) {
          this.products.set(prods);
          localStorage.setItem('omalqura_products', JSON.stringify(prods));
        }
      }, (err) => console.warn('[Firestore] Products sync warning:', err));

      // 2. Real-time Orders Sync
      onSnapshot(collection(this.firebase.firestore, 'omalqura_orders'), (snapshot) => {
        const ords = snapshot.docs.map(d => d.data() as OmAlQuraOrder);
        if (ords.length > 0) {
          this.orders.set(ords);
          localStorage.setItem('omalqura_orders', JSON.stringify(ords));
        }
      }, (err) => console.warn('[Firestore] Orders sync warning:', err));

      // 3. Real-time Delivery Drivers Sync
      onSnapshot(collection(this.firebase.firestore, 'omalqura_delivery_drivers'), (snapshot) => {
        const drvs = snapshot.docs.map(d => d.data() as OmAlQuraDeliveryDriver);
        if (drvs.length > 0) {
          this.deliveryDrivers.set(drvs);
          localStorage.setItem('omalqura_drivers', JSON.stringify(drvs));
        }
      }, (err) => console.warn('[Firestore] Drivers sync warning:', err));

      // 4. Real-time Employees Sync
      onSnapshot(collection(this.firebase.firestore, 'omalqura_employees'), (snapshot) => {
        const emps = snapshot.docs.map(d => d.data() as OmAlQuraEmployee);
        if (emps.length > 0) {
          this.employees.set(emps);
          localStorage.setItem('omalqura_employees', JSON.stringify(emps));
        }
      }, (err) => console.warn('[Firestore] Employees sync warning:', err));

      // 5. Real-time Customer Debts Sync
      onSnapshot(collection(this.firebase.firestore, 'omalqura_customer_debts'), (snapshot) => {
        const debts = snapshot.docs.map(d => d.data() as OmAlQuraCustomerDebt);
        if (debts.length > 0) {
          this.customerDebts.set(debts);
          localStorage.setItem('omalqura_debts', JSON.stringify(debts));
        }
      }, (err) => console.warn('[Firestore] Debts sync warning:', err));

      // 6. Real-time Missing Requests Sync
      onSnapshot(collection(this.firebase.firestore, 'omalqura_missing_requests'), (snapshot) => {
        const reqs = snapshot.docs.map(d => d.data() as OmAlQuraMissingProductRequest);
        if (reqs.length > 0) {
          this.missingProductRequests.set(reqs);
          localStorage.setItem('omalqura_missing_requests', JSON.stringify(reqs));
        }
      }, (err) => console.warn('[Firestore] Missing requests sync warning:', err));

      // 7. Real-time Staff Suggestions Sync
      onSnapshot(collection(this.firebase.firestore, 'omalqura_staff_suggestions'), (snapshot) => {
        const sugs = snapshot.docs.map(d => d.data() as OmAlQuraStaffSuggestion);
        if (sugs.length > 0) {
          this.staffSuggestions.set(sugs);
          localStorage.setItem('omalqura_suggestions', JSON.stringify(sugs));
        }
      }, (err) => console.warn('[Firestore] Suggestions sync warning:', err));

      // 8. Real-time FAQs Sync
      onSnapshot(collection(this.firebase.firestore, 'omalqura_faqs'), (snapshot) => {
        const faqs = snapshot.docs.map(d => d.data() as OmAlQuraFaq);
        if (faqs.length > 0) {
          this.faqs.set(faqs);
          localStorage.setItem('omalqura_faqs', JSON.stringify(faqs));
        }
      }, (err) => console.warn('[Firestore] FAQs sync warning:', err));

      // 9. Real-time Categories Sync
      onSnapshot(doc(this.firebase.firestore, 'omalqura_config', 'categories'), (snapshot) => {
        if (snapshot.exists()) {
          const cats = snapshot.data()['items'] as string[];
          if (cats && cats.length > 0) {
            this.categories.set(cats);
            localStorage.setItem('omalqura_categories', JSON.stringify(cats));
          }
        }
      }, (err) => console.warn('[Firestore] Categories sync warning:', err));

      // 10. Real-time Store Layout Sketch Sync
      onSnapshot(doc(this.firebase.firestore, 'omalqura_config', 'store_layout'), (snapshot) => {
        if (snapshot.exists()) {
          const layout = snapshot.data() as OmAlQuraStoreLayout;
          if (layout) {
            this.storeLayout.set(layout);
            localStorage.setItem('omalqura_store_layout', JSON.stringify(layout));
          }
        }
      }, (err) => console.warn('[Firestore] Layout sync warning:', err));

      // 11. Real-time Suppliers Sync
      onSnapshot(collection(this.firebase.firestore, 'omalqura_suppliers'), (snapshot) => {
        const supps = snapshot.docs.map(d => d.data() as OmAlQuraSupplier);
        if (supps.length > 0) {
          this.suppliers.set(supps);
          localStorage.setItem('omalqura_suppliers', JSON.stringify(supps));
        }
      }, (err) => console.warn('[Firestore] Suppliers sync warning:', err));

      // 12. Real-time Purchase Orders Sync
      onSnapshot(collection(this.firebase.firestore, 'omalqura_purchase_orders'), (snapshot) => {
        const pos = snapshot.docs.map(d => d.data() as OmAlQuraPurchaseOrder);
        if (pos.length > 0) {
          this.purchaseOrders.set(pos);
          localStorage.setItem('omalqura_purchase_orders', JSON.stringify(pos));
        }
      }, (err) => console.warn('[Firestore] Purchase orders sync warning:', err));

    } catch (e) {
      console.warn('[Firestore] Realtime init exception:', e);
    }
  }

  private loadInitialData() {
    const savedProducts = localStorage.getItem('omalqura_products');
    if (savedProducts) {
      try {
        const parsed: OmAlQuraProduct[] = JSON.parse(savedProducts);
        if (parsed && parsed.length > 0) {
          this.products.set(parsed);
        } else {
          this.seedInitialProducts();
        }
      } catch (e) {
        this.seedInitialProducts();
      }
    } else {
      this.seedInitialProducts();
    }

    const savedEmployees = localStorage.getItem('omalqura_employees');
    if (savedEmployees) {
      try {
        const parsed: OmAlQuraEmployee[] = JSON.parse(savedEmployees);
        if (parsed && parsed.length > 0) {
          this.employees.set(parsed);
        } else {
          this.seedEmployees();
        }
      } catch (e) {
        this.seedEmployees();
      }
    } else {
      this.seedEmployees();
    }

    const savedOrders = localStorage.getItem('omalqura_orders');
    if (savedOrders) {
      try {
        const parsed: OmAlQuraOrder[] = JSON.parse(savedOrders);
        this.orders.set(parsed || []);
      } catch (e) {
        this.saveOrders([]);
      }
    } else {
      this.saveOrders([]);
    }

    const savedDrivers = localStorage.getItem('omalqura_drivers');
    if (savedDrivers) {
      try {
        const parsed: OmAlQuraDeliveryDriver[] = JSON.parse(savedDrivers);
        if (parsed && parsed.length > 0) {
          this.deliveryDrivers.set(parsed);
        } else {
          this.seedDrivers();
        }
      } catch (e) {
        this.seedDrivers();
      }
    } else {
      this.seedDrivers();
    }

    const savedDebts = localStorage.getItem('omalqura_debts');
    if (savedDebts) {
      try {
        const parsed: OmAlQuraCustomerDebt[] = JSON.parse(savedDebts);
        this.customerDebts.set(parsed || []);
      } catch (e) {
        this.saveDebts([]);
      }
    } else {
      this.saveDebts([]);
    }

    const savedRequests = localStorage.getItem('omalqura_missing_requests');
    if (savedRequests) {
      try {
        const parsed: OmAlQuraMissingProductRequest[] = JSON.parse(savedRequests);
        this.missingProductRequests.set(parsed || []);
      } catch (e) {
        this.saveMissingRequests([]);
      }
    } else {
      this.saveMissingRequests([]);
    }

    const savedSuggestions = localStorage.getItem('omalqura_suggestions');
    if (savedSuggestions) {
      try {
        const parsed: OmAlQuraStaffSuggestion[] = JSON.parse(savedSuggestions);
        this.staffSuggestions.set(parsed || []);
      } catch (e) {
        this.saveSuggestions([]);
      }
    } else {
      this.saveSuggestions([]);
    }

    const savedFaqs = localStorage.getItem('omalqura_faqs');
    if (savedFaqs) {
      try {
        const parsed: OmAlQuraFaq[] = JSON.parse(savedFaqs);
        if (parsed && parsed.length > 0) {
          this.faqs.set(parsed);
        } else {
          this.seedFaqs();
        }
      } catch (e) {
        this.seedFaqs();
      }
    } else {
      this.seedFaqs();
    }

    const savedCategories = localStorage.getItem('omalqura_categories');
    if (savedCategories) {
      try { this.categories.set(JSON.parse(savedCategories)); } catch (e) { this.seedCategories(); }
    } else {
      this.seedCategories();
    }

    const savedFavs = localStorage.getItem('omalqura_user_favorites');
    if (savedFavs) {
      try { this.userFavoriteProductIds.set(JSON.parse(savedFavs)); } catch (e) {}
    }

    // Load customer profile info to auto-fill input fields
    const savedCustomerInfo = localStorage.getItem('omalqura_customer_info');
    if (savedCustomerInfo) {
      try {
        const parsed: OmAlQuraCustomerInfo = JSON.parse(savedCustomerInfo);
        if (parsed) {
          this.customerInfo.set(parsed);
          if (parsed.preferredDriverId) {
            this.selectedDriverId.set(parsed.preferredDriverId);
          }
        }
      } catch (e) {}
    }

    // Load customer's 24-hour persistent invoice
    const savedInvoiceStr = localStorage.getItem('omalqura_latest_customer_invoice');
    if (savedInvoiceStr) {
      try {
        const parsed = JSON.parse(savedInvoiceStr);
        const ONE_DAY_MS = 24 * 60 * 60 * 1000;
        if (parsed && parsed.savedAt && (Date.now() - parsed.savedAt <= ONE_DAY_MS)) {
          this.savedCustomerInvoice.set(parsed.order);
        } else {
          localStorage.removeItem('omalqura_latest_customer_invoice');
        }
      } catch (e) {
        localStorage.removeItem('omalqura_latest_customer_invoice');
      }
    }

    // Load store layout
    const savedLayout = localStorage.getItem('omalqura_store_layout');
    if (savedLayout) {
      try { this.storeLayout.set(JSON.parse(savedLayout)); } catch (e) {}
    }

    const savedSuppliers = localStorage.getItem('omalqura_suppliers');
    if (savedSuppliers) {
      try { this.suppliers.set(JSON.parse(savedSuppliers)); } catch (e) { this.seedInitialSuppliers(); }
    } else {
      this.seedInitialSuppliers();
    }

    const savedPOs = localStorage.getItem('omalqura_purchase_orders');
    if (savedPOs) {
      try { this.purchaseOrders.set(JSON.parse(savedPOs)); } catch (e) {}
    }
  }

  saveSuppliers(data: OmAlQuraSupplier[]) {
    this.suppliers.set(data);
    localStorage.setItem('omalqura_suppliers', JSON.stringify(data));
    if (this.firebase.firestore) {
      data.forEach(item => setDoc(doc(this.firebase.firestore, 'omalqura_suppliers', item.id), item).catch(() => {}));
    }
  }

  addSupplier(data: Omit<OmAlQuraSupplier, 'id'>): OmAlQuraSupplier {
    const newSupp: OmAlQuraSupplier = {
      id: 'supp-' + Math.floor(1000 + Math.random() * 9000),
      ...data
    };
    this.saveSuppliers([newSupp, ...this.suppliers()]);
    this.toast.show(`تم تسجيل المورد (${newSupp.name}) بنجاح!`, 'success');
    return newSupp;
  }

  deleteSupplier(id: string) {
    const updated = this.suppliers().filter(s => s.id !== id);
    this.suppliers.set(updated);
    localStorage.setItem('omalqura_suppliers', JSON.stringify(updated));
    if (this.firebase.firestore) {
      deleteDoc(doc(this.firebase.firestore, 'omalqura_suppliers', id)).catch(() => {});
    }
    this.toast.show('تم حذف بيانات المورد.', 'info');
  }

  savePurchaseOrders(data: OmAlQuraPurchaseOrder[]) {
    this.purchaseOrders.set(data);
    localStorage.setItem('omalqura_purchase_orders', JSON.stringify(data));
    if (this.firebase.firestore) {
      data.forEach(item => setDoc(doc(this.firebase.firestore, 'omalqura_purchase_orders', item.id), item).catch(() => {}));
    }
  }

  createPurchaseOrder(supplierId: string, items: OmAlQuraPurchaseOrderItem[], notes?: string): OmAlQuraPurchaseOrder | null {
    const supplier = this.suppliers().find(s => s.id === supplierId);
    if (!supplier || items.length === 0) return null;

    const totalEst = items.reduce((acc, i) => acc + ((i.unitPriceEst || 0) * i.requestedQuantity), 0);

    const newPO: OmAlQuraPurchaseOrder = {
      id: 'po-' + Math.floor(1000 + Math.random() * 9000),
      supplierId: supplier.id,
      supplierName: supplier.name,
      supplierPhone: supplier.phone,
      items,
      totalEstPrice: totalEst,
      status: 'تم الإنشاء',
      createdAt: new Date().toLocaleDateString('ar-EG') + ' ' + new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      notes
    };

    this.savePurchaseOrders([newPO, ...this.purchaseOrders()]);
    this.toast.show(`تم إعداد أمر الشراء رقم #${newPO.id} وتوجيهه للمورد (${supplier.name})`, 'success');
    return newPO;
  }

  getWhatsAppPoLink(po: OmAlQuraPurchaseOrder): string {
    const itemsText = po.items.map((item, idx) => `${idx + 1}. *${item.productName}*: المطلوب (${item.requestedQuantity} قطعة) - (المخزون الحالي بالمحل: ${item.currentStock} قطعة)`).join('\n');
    const text = `*أمر توريد وبضاعة منظفات جديد - متجر أم القرى* 🧼
رقم الأمر: #${po.id}
المورد: *${po.supplierName}*
التاريخ: ${po.createdAt}

*قائمة الأصناف المطلوبة للفرع:*
${itemsText}

ملاحظات والتسليم: ${po.notes || 'يرجى التوريد وتأكيد موعد الوصول بالفرع.'}

شكرًا لتعاونكم مع متجر أم القرى للمنظفات!`;

    const cleanPhone = (po.supplierPhone || '').replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('01') ? '2' + cleanPhone : cleanPhone;
    return `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`;
  }

  markPoReceived(poId: string) {
    const po = this.purchaseOrders().find(p => p.id === poId);
    if (!po) return;

    // 1. Update PO Status
    const updatedPOs = this.purchaseOrders().map(p => p.id === poId ? { ...p, status: 'تم الاستلام وزيادة المخزون' as const } : p);
    this.savePurchaseOrders(updatedPOs);

    // 2. Restock products automatically in inventory!
    const updatedProducts = this.products().map(product => {
      const match = po.items.find(i => (i.productId && i.productId === product.id) || i.productName.trim().toLowerCase() === product.name.trim().toLowerCase());
      if (match) {
        return { ...product, stockQuantity: product.stockQuantity + match.requestedQuantity };
      }
      return product;
    });
    this.saveProducts(updatedProducts);

    this.toast.show(`تم تأكيد استلام الشحنة وتزويد رصيد المخزون تلقائياً للأصناف الواردة! 🎉`, 'success');
  }

  private seedInitialSuppliers() {
    const defaults: OmAlQuraSupplier[] = [
      //put real data of suppliers here later 
    ];
    this.saveSuppliers(defaults);
  }

  private saveProducts(data: OmAlQuraProduct[]) {
    this.products.set(data);
    localStorage.setItem('omalqura_products', JSON.stringify(data));
    if (this.firebase.firestore) {
      data.forEach(item => setDoc(doc(this.firebase.firestore, 'omalqura_products', item.id), item).catch(() => {}));
    }
  }

  private saveEmployees(data: OmAlQuraEmployee[]) {
    this.employees.set(data);
    localStorage.setItem('omalqura_employees', JSON.stringify(data));
    if (this.firebase.firestore) {
      data.forEach(item => setDoc(doc(this.firebase.firestore, 'omalqura_employees', item.id), item).catch(() => {}));
    }
  }

  private saveOrders(data: OmAlQuraOrder[]) {
    this.orders.set(data);
    localStorage.setItem('omalqura_orders', JSON.stringify(data));
    if (this.firebase.firestore) {
      data.forEach(item => setDoc(doc(this.firebase.firestore, 'omalqura_orders', item.id), item).catch(() => {}));
    }
  }

  private saveDrivers(data: OmAlQuraDeliveryDriver[]) {
    this.deliveryDrivers.set(data);
    localStorage.setItem('omalqura_drivers', JSON.stringify(data));
    if (this.firebase.firestore) {
      data.forEach(item => setDoc(doc(this.firebase.firestore, 'omalqura_delivery_drivers', item.id), item).catch(() => {}));
    }
  }

  private saveDebts(data: OmAlQuraCustomerDebt[]) {
    this.customerDebts.set(data);
    localStorage.setItem('omalqura_debts', JSON.stringify(data));
    if (this.firebase.firestore) {
      data.forEach(item => setDoc(doc(this.firebase.firestore, 'omalqura_customer_debts', item.id), item).catch(() => {}));
    }
  }

  private saveMissingRequests(data: OmAlQuraMissingProductRequest[]) {
    this.missingProductRequests.set(data);
    localStorage.setItem('omalqura_missing_requests', JSON.stringify(data));
    if (this.firebase.firestore) {
      data.forEach(item => setDoc(doc(this.firebase.firestore, 'omalqura_missing_requests', item.id), item).catch(() => {}));
    }
  }

  private saveAttendanceLogs(data: OmAlQuraAttendanceLog[]) {
    this.attendanceLogs.set(data);
    localStorage.setItem('omalqura_attendance_logs', JSON.stringify(data));
    if (this.firebase.firestore) {
      data.forEach(item => setDoc(doc(this.firebase.firestore, 'omalqura_attendance_logs', item.id), item).catch(() => {}));
    }
  }

  private saveSuggestions(data: OmAlQuraStaffSuggestion[]) {
    this.staffSuggestions.set(data);
    localStorage.setItem('omalqura_suggestions', JSON.stringify(data));
    if (this.firebase.firestore) {
      data.forEach(item => setDoc(doc(this.firebase.firestore, 'omalqura_staff_suggestions', item.id), item).catch(() => {}));
    }
  }

  private saveFaqs(data: OmAlQuraFaq[]) {
    this.faqs.set(data);
    localStorage.setItem('omalqura_faqs', JSON.stringify(data));
    if (this.firebase.firestore) {
      data.forEach(item => setDoc(doc(this.firebase.firestore, 'omalqura_faqs', item.id), item).catch(() => {}));
    }
  }

  private saveCategories(data: string[]) {
    this.categories.set(data);
    localStorage.setItem('omalqura_categories', JSON.stringify(data));
    if (this.firebase.firestore) {
      setDoc(doc(this.firebase.firestore, 'omalqura_config', 'categories'), { items: data }).catch(() => {});
    }
  }

  saveCustomerInfo(info: Partial<OmAlQuraCustomerInfo>) {
    const current = this.customerInfo();
    const updated: OmAlQuraCustomerInfo = {
      name: info.name !== undefined ? info.name : current.name,
      phone: info.phone !== undefined ? info.phone : current.phone,
      address: info.address !== undefined ? info.address : current.address,
      preferredDriverId: info.preferredDriverId !== undefined ? info.preferredDriverId : current.preferredDriverId,
      preferredPaymentMethod: info.preferredPaymentMethod !== undefined ? info.preferredPaymentMethod : current.preferredPaymentMethod
    };
    this.customerInfo.set(updated);
    if (updated.preferredDriverId !== undefined) {
      this.selectedDriverId.set(updated.preferredDriverId);
    }
    localStorage.setItem('omalqura_customer_info', JSON.stringify(updated));
  }

  updateStoreLayout(layout: OmAlQuraStoreLayout) {
    this.storeLayout.set(layout);
    localStorage.setItem('omalqura_store_layout', JSON.stringify(layout));
    if (this.firebase.firestore) {
      setDoc(doc(this.firebase.firestore, 'omalqura_config', 'store_layout'), layout).catch(() => {});
    }
    this.toast.show('تم حفظ وتعميم الخريطة الكروكية وتسميات الرفوف والممرات بنجاح!', 'success');
  }

  // --- SEED DATA ---
  private seedInitialProducts() {
    const defaults: OmAlQuraProduct[] = [
      {
        id: 'oq-p1',
        name: 'مسحوق برسيل أوتوماتيك (2.5 كجم)',
        barcode: '622101234561',
        category: 'مساحيق غسيل ومنعمات',
        price: 185,
        stockQuantity: 45,
        discountPercent: 10,
        isBoycott: false,
        boycottAlternatives: ['برسيل ايجيبت', 'أريال وطني'],
        locationInStore: 'الممر 1 - الرف A1 (جهة اليمين)',
        isInWarehouse: false,
        imageUrl: 'https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?w=500&auto=format&fit=crop&q=60',
        description: 'مسحوق غسيل ممتاز للغسالات الأوتوماتيك، نظافة فائقة ورائحة منعشة تدوم طويلاً.',
        salesCount: 32
      },
      {
        id: 'oq-p2',
        name: 'سائل غسيل الأطباق فيري (1.5 لتر)',
        barcode: '622101234562',
        category: 'منظفات الصحون والمطابخ',
        price: 75,
        stockQuantity: 50,
        discountPercent: 5,
        isBoycott: false,
        boycottAlternatives: ['فاخر منظف', 'سائل اكلين'],
        locationInStore: 'الممر 2 - الرف B2 (وسط)',
        isInWarehouse: false,
        imageUrl: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=500&auto=format&fit=crop&q=60',
        description: 'عملاق إزالة الدهون والصحون، رغوة كثيفة تدوم طويلاً ولطيف على اليدين.',
        salesCount: 48
      },
      {
        id: 'oq-p3',
        name: 'مطهر ومعقم ديتول الأصلي (500 مل)',
        barcode: '622101234563',
        category: 'مطهرات ومعقمات عامة',
        price: 120,
        stockQuantity: 30,
        discountPercent: 0,
        isBoycott: false,
        boycottAlternatives: ['مطهر بلمرز', 'سودو كلين'],
        locationInStore: 'الممر 2 - الرف B1 (علوي)',
        isInWarehouse: false,
        imageUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=500&auto=format&fit=crop&q=60',
        description: 'مطهر عام يقضي على 99.9% من الجراثيم والبكتيريا، مثالي للأسطح والأرضيات.',
        salesCount: 25
      },
      {
        id: 'oq-p4',
        name: 'كلور مركز لتطهير وتبييض الملابس والأسطح (1 لتر)',
        barcode: '622101234564',
        category: 'مطهرات ومعقمات عامة',
        price: 35,
        stockQuantity: 80,
        discountPercent: 0,
        isBoycott: false,
        boycottAlternatives: [],
        locationInStore: 'الممر 2 - الرف B3 (سفلي)',
        isInWarehouse: true,
        imageUrl: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=500&auto=format&fit=crop&q=60',
        description: 'كلور مركز عالي الفعالية لتبييض الملابس البيضاء وتطهير الحمامات والأرضيات.',
        salesCount: 60
      },
      {
        id: 'oq-p5',
        name: 'معطر جو وفراش برائحة اللافندر (450 مل)',
        barcode: '622101234565',
        category: 'العناية الشخصية والشامبو',
        price: 55,
        stockQuantity: 40,
        discountPercent: 15,
        isBoycott: false,
        boycottAlternatives: [],
        locationInStore: 'الممر 3 - الرف C1 (علوي)',
        isInWarehouse: false,
        imageUrl: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=500&auto=format&fit=crop&q=60',
        description: 'معطر جو يدوم طويلاً برائحة اللافندر المنعشة للمنازل والمكاتب.',
        salesCount: 19
      },
      {
        id: 'oq-p6',
        name: 'مجموعة إسفنج تنظيف الصحون (طقم 5 قطع)',
        barcode: '622101234566',
        category: 'الإكسسوارات وأدوات النظافة',
        price: 25,
        stockQuantity: 100,
        discountPercent: 0,
        isBoycott: false,
        boycottAlternatives: [],
        locationInStore: 'الممر 3 - الرف C2 (وسط)',
        isInWarehouse: false,
        imageUrl: 'https://images.unsplash.com/photo-1616401784845-180882ba9ba8?w=500&auto=format&fit=crop&q=60',
        description: 'إسفنج تنظيف عالي الجودة مع طبقة تنظيف خشنة لإزالة الدهون والصحون الصعبة.',
        salesCount: 75
      }
    ];
    this.saveProducts(defaults);
  }

  private seedCategories() {
    this.saveCategories([
      'مساحيق غسيل ومنعمات',
      'منظفات الصحون والمطابخ',
      'مطهرات ومعقمات عامة',
      'العناية الشخصية والشامبو',
      'الإكسسوارات وأدوات النظافة'
    ]);
  }

  private seedEmployees() {
    const defaults: OmAlQuraEmployee[] = [
      {
        id: 'emp-1',
        name: 'أحمد حسن',
        role: 'مبيعات',
        phone: '01011223344',
        salary: 4500,
        workingHoursThisMonth: 160,
        holidaysTaken: 2,
        isSuspended: false,
        shiftStatus: 'clocked_in',
        lastClockIn: '09:00 ص'
      },
      {
        id: 'emp-2',
        name: 'محمود عبد الله',
        role: 'أمينات مخزن',
        phone: '01022334455',
        salary: 5000,
        workingHoursThisMonth: 170,
        holidaysTaken: 1,
        isSuspended: false,
        shiftStatus: 'clocked_in',
        lastClockIn: '08:30 ص'
      },
      {
        id: 'emp-3',
        name: 'إبراهيم علي',
        role: 'دليفري',
        phone: '01033445566',
        salary: 4000,
        workingHoursThisMonth: 150,
        holidaysTaken: 3,
        isSuspended: false,
        shiftStatus: 'clocked_out'
      }
    ];
    this.saveEmployees(defaults);
  }

  private seedOrders() {
    this.saveOrders([]);
  }

  private seedDrivers() {
    const defaults: OmAlQuraDeliveryDriver[] = [
      {
        id: 'drv-1',
        name: 'إبراهيم علي',
        phone: '01033445566',
        status: 'متاح',
        workingHoursInfo: 'وردية صباحية ومسائية (9 ص - 10 م)',
        activeDeliveriesCount: 0
      }
    ];
    this.saveDrivers(defaults);
  }

  private seedDebts() {
    this.saveDebts([]);
  }

  private seedMissingRequests() {
    this.saveMissingRequests([]);
  }

  private seedSuggestions() {
    this.saveSuggestions([]);
  }

  private seedFaqs() {
    const defaults: OmAlQuraFaq[] = [
      {
        id: 'faq-1',
        question: 'ما هي ساعات عمل متجر أم القرى للمنظفات؟',
        answer: 'يعمل المتجر من الساعة 9 صباحاً حتى 11 مساءً طوال أيام الأسبوع، بما فيها أيام الجمعة والعطلات الرسمية.',
        category: 'عام'
      },
      {
        id: 'faq-2',
        question: 'هل يتوفر خدمة التوصيل للمنازل؟ وما هي مناطق التغطية؟',
        answer: 'نعم، نوفر خدمة توصيل سريعة لجميع المناطق. يمكنك تحديد عنوانك عند تقديم الطلب وسيتواصل معك مندوب التوصيل لتأكيد الموعد. مدة التوصيل تتراوح بين 30 دقيقة وساعتين حسب المنطقة.',
        category: 'توصيل'
      },
      {
        id: 'faq-3',
        question: 'ما هي طرق الدفع المتاحة في المتجر؟',
        answer: 'نقبل الدفع بالكاش عند التسليم، وبطاقات الفيزا والماستركارد عبر ماكينة POS مع المندوب، وكذلك المحافظ الإلكترونية (فودافون كاش - إنستاباي - فوري) على رقم 01033567292.',
        category: 'دفع'
      },
      {
        id: 'faq-4',
        question: 'هل يمكنني إرجاع منتج أو استبداله؟',
        answer: 'نعم، نقبل إرجاع المنتجات خلال 7 أيام من تاريخ الشراء بشرط أن يكون المنتج في حالته الأصلية ومغلقاً وغير مستخدم، مع الاحتفاظ بإيصال الشراء. للتواصل: اتصل بنا أو أرسل الطلب عبر الواتس أب.',
        category: 'إرجاع'
      },
      {
        id: 'faq-5',
        question: 'ما هي البدائل الوطنية لمساحيق الغسيل الخاضعة للمقاطعة؟',
        answer: 'من أفضل البدائل المتوفرة لدينا: (1) مسحوق بيرسيل ايجيبت - جودة مطابقة 100%. (2) مسحوق برسيت الوطني - سعر منخفض وجودة عالية. (3) مسحوق تايد المصري. كلها متوفرة في المتجر بأسعار تنافسية.',
        category: 'مقاطعة'
      },
      {
        id: 'faq-6',
        question: 'هل يتوفر عروض وخصومات دورية؟',
        answer: 'نعم! نقدم عروضاً أسبوعية على مجموعات مختلفة من المنتجات. تابع قسم "العروض" في التطبيق للاطلاع على أحدث التخفيضات. كما نقدم خصماً 10% على الطلبات التي تتجاوز 200 ج.م.',
        category: 'عروض'
      },
      {
        id: 'faq-7',
        question: 'كيف أعرف مكان المنتج على رفوف المتجر؟',
        answer: 'يمكنك الضغط على زر "الرف" الظاهر تحت كل منتج في القائمة وسيعطيك التطبيق الموقع الدقيق على خريطة الرفوف. كما يمكنك الضغط على "عرض الخريطة الكروكية" في الأعلى لرؤية مخطط المتجر الكامل.',
        category: 'تسوق'
      },
      {
        id: 'faq-8',
        question: 'ما هو الحد الأدنى للطلب لاستحقاق خدمة التوصيل؟',
        answer: 'الحد الأدنى للطلب للحصول على خدمة التوصيل هو 50 ج.م. للطلبات أقل من ذلك، يمكنك زيارة المتجر مباشرة أو الاستلام شخصياً.',
        category: 'توصيل'
      },
      {
        id: 'faq-9',
        question: 'هل يمكنني طلب منتج غير موجود في القائمة؟',
        answer: 'بالطبع! اضغط على زر "طلب منظف غير متوفر" واكتب اسم المنتج الذي تبحث عنه. سيراجع فريقنا الطلب ويحاول توفيره في أقرب وقت ممكن وسنتواصل معك فور توفره.',
        category: 'منتجات'
      },
      {
        id: 'faq-10',
        question: 'هل منتجاتكم أصلية ومعتمدة؟',
        answer: 'نعم، جميع منتجات متجر أم القرى أصلية 100% ومستوردة من موردين معتمدين. نحرص على جودة كل منتج قبل عرضه. في حال وجود أي شك، يمكنك مراجعة الموظفين مباشرة للاطلاع على شهادات الجودة.',
        category: 'منتجات'
      }
    ];
    this.saveFaqs(defaults);
  }

  // --- METHODS & ACTIONS ---

  // Generate a unique code based on 5-minute intervals + secret salt (deterministic so it matches across devices)
  generateDailyAttendanceCode(date: Date = new Date()): string {
    const windowIndex = Math.floor(date.getTime() / (5 * 60 * 1000));
    const seed = `${this.attendanceCodeSalt}_${windowIndex}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    const code = Math.abs(hash) % 10000;
    return String(code).padStart(4, '0');
  }

  // Validate the code entered by an employee against current or previous 5-minute window
  validateAttendanceCode(code: string | null | undefined): boolean {
    if (!code?.trim()) return false;
    const normalized = code.trim().replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
    const now = this.currentTime();
    const currentCode = this.generateDailyAttendanceCode(now);
    const prevWindowDate = new Date(now.getTime() - 5 * 60 * 1000);
    const prevCode = this.generateDailyAttendanceCode(prevWindowDate);
    return normalized === currentCode || normalized === prevCode;
  }

  // Employees & Attendance
  clockIn(employeeId: string, attendanceCode?: string) {
    if (!this.validateAttendanceCode(attendanceCode)) {
      this.toast.show('كود الحضور غير صحيح أو انتهت صلاحيته! يرجى الحصول على الكود الحالي من المدير', 'error');
      return;
    }
    const timeStr = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    const dateStr = new Date().toLocaleDateString('ar-EG');
    const updatedEmployees = this.employees().map(emp => {
      if (emp.id === employeeId) {
        return { ...emp, shiftStatus: 'clocked_in' as const, lastClockIn: timeStr };
      }
      return emp;
    });
    this.saveEmployees(updatedEmployees);

    const emp = updatedEmployees.find(e => e.id === employeeId);
    const newLog: OmAlQuraAttendanceLog = {
      id: Math.random().toString(36).substr(2, 9),
      employeeId,
      employeeName: emp ? emp.name : 'موظف',
      type: 'in',
      time: timeStr,
      date: dateStr
    };
    this.saveAttendanceLogs([newLog, ...this.attendanceLogs()]);
    this.toast.show(`تم تسجيل حضور الموظف: ${emp?.name}`, 'success');
  }

  clockOut(employeeId: string, attendanceCode?: string) {
    if (!this.validateAttendanceCode(attendanceCode)) {
      this.toast.show('كود الانصراف غير صحيح أو انتهت صلاحيته! يرجى الحصول على الكود الحالي من المدير', 'error');
      return;
    }
    const timeStr = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    const dateStr = new Date().toLocaleDateString('ar-EG');
    const updatedEmployees = this.employees().map(emp => {
      if (emp.id === employeeId) {
        return { ...emp, shiftStatus: 'clocked_out' as const };
      }
      return emp;
    });
    this.saveEmployees(updatedEmployees);

    const emp = updatedEmployees.find(e => e.id === employeeId);
    const newLog: OmAlQuraAttendanceLog = {
      id: Math.random().toString(36).substr(2, 9),
      employeeId,
      employeeName: emp ? emp.name : 'موظف',
      type: 'out',
      time: timeStr,
      date: dateStr
    };
    this.saveAttendanceLogs([newLog, ...this.attendanceLogs()]);
    this.toast.show(`تم تسجيل انصراف الموظف: ${emp?.name}`, 'info');
  }

  toggleSuspendEmployee(employeeId: string) {
    const updated = this.employees().map(e => {
      if (e.id === employeeId) {
        const nextState = !e.isSuspended;
        this.toast.show(nextState ? `تم إيقاف حساب الموظف ${e.name}` : `تم إعادة تفعيل حساب الموظف ${e.name}`, nextState ? 'warning' : 'success');
        return { ...e, isSuspended: nextState };
      }
      return e;
    });
    this.saveEmployees(updated);
  }

  addEmployee(empData: {
    name: string;
    role: OmAlQuraEmployee['role'];
    phone: string;
    salary: number;
  }) {
    const newEmp: OmAlQuraEmployee = {
      id: 'emp-' + Math.random().toString(36).substr(2, 7),
      name: empData.name,
      role: empData.role,
      phone: empData.phone,
      salary: Number(empData.salary) || 0,
      workingHoursThisMonth: 0,
      holidaysTaken: 0,
      isSuspended: false,
      shiftStatus: 'clocked_out'
    };

    const updated = [newEmp, ...this.employees()];
    this.saveEmployees(updated);

    if (empData.role === 'دليفري') {
      const newDriver: OmAlQuraDeliveryDriver = {
        id: 'drv-' + Math.random().toString(36).substr(2, 7),
        name: empData.name,
        phone: empData.phone,
        status: 'متاح',
        workingHoursInfo: 'وردية جديدة',
        activeDeliveriesCount: 0
      };
      this.saveDrivers([newDriver, ...this.deliveryDrivers()]);
    }

    this.toast.show(`تم توظيف العامل الجديد (${empData.name}) بنجاح!`, 'success');
    return newEmp;
  }

  deleteEmployee(employeeId: string) {
    const emp = this.employees().find(e => e.id === employeeId);
    const updated = this.employees().filter(e => e.id !== employeeId);
    this.employees.set(updated);
    localStorage.setItem('omalqura_employees', JSON.stringify(updated));
    if (this.firebase.firestore) {
      deleteDoc(doc(this.firebase.firestore, 'omalqura_employees', employeeId)).catch(() => {});
    }
    if (emp) {
      this.toast.show(`تم إنهاء خدمة وحذف الموظف: ${emp.name}`, 'info');
    }
  }

  clearAllEmployees() {
    this.saveEmployees([]);
    this.toast.show('تم حذف جميع الموظفين من النظام.', 'info');
  }

  // Products & Inventory Management
  addProduct(product: Omit<OmAlQuraProduct, 'id' | 'salesCount'>) {
    const newProd: OmAlQuraProduct = {
      ...product,
      id: 'p-' + Math.random().toString(36).substr(2, 7),
      salesCount: 0
    };
    this.saveProducts([newProd, ...this.products()]);
    this.toast.show('تمت إضافة المنتج بنجاح للمخزون!', 'success');
  }

  updateProduct(id: string, updates: Partial<OmAlQuraProduct>) {
    const updated = this.products().map(p => p.id === id ? { ...p, ...updates } : p);
    this.saveProducts(updated);
    this.toast.show('تم تحديث بيانات المنتج والمخزون بنجاح.', 'success');
  }

  deleteProduct(id: string) {
    const filtered = this.products().filter(p => p.id !== id);
    this.products.set(filtered);
    localStorage.setItem('omalqura_products', JSON.stringify(filtered));
    if (this.firebase.firestore) {
      deleteDoc(doc(this.firebase.firestore, 'omalqura_products', id)).catch(() => {});
    }
    this.toast.show('تم حذف المنتج من النظام.', 'info');
  }

  // Shopping Cart & Orders
  addToCart(product: OmAlQuraProduct) {
    if (product.stockQuantity <= 0) {
      this.toast.show('المنتج نفد من المخزون! يمكنك الاطلاع على البدائل المتاحة.', 'warning');
      return;
    }

    const currentCart = this.cart();
    const existingIndex = currentCart.findIndex(item => item.product.id === product.id);

    if (existingIndex > -1) {
      const updated = [...currentCart];
      if (updated[existingIndex].quantity >= product.stockQuantity) {
        this.toast.show('وصلت للحد الأقصى المتاح في المخزون لهذا المنتج!', 'warning');
        return;
      }
      updated[existingIndex].quantity += 1;
      this.cart.set(updated);
    } else {
      this.cart.set([...currentCart, { product, quantity: 1 }]);
    }
    this.toast.show(`تمت إضافة ${product.name} لسلة الشراء.`, 'success');
  }

  updateCartQuantity(productId: string, delta: number) {
    const updated = this.cart().map(item => {
      if (item.product.id === productId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean) as OmAlQuraOrderItem[];
    this.cart.set(updated);
  }

  clearCart() {
    this.cart.set([]);
  }

  toggleFavorite(productId: string) {
    const favs = this.userFavoriteProductIds();
    if (favs.includes(productId)) {
      const updated = favs.filter(id => id !== productId);
      this.userFavoriteProductIds.set(updated);
      localStorage.setItem('omalqura_user_favorites', JSON.stringify(updated));
      this.toast.show('تمت إزالة المنتج من المفضلة', 'info');
    } else {
      const updated = [...favs, productId];
      this.userFavoriteProductIds.set(updated);
      localStorage.setItem('omalqura_user_favorites', JSON.stringify(updated));
      this.toast.show('تمت إضافة المنتج لمفضلتك!', 'success');
    }
  }

  isDuplicateActiveOrder(cartItems: { product: OmAlQuraProduct; quantity: number }[], customerPhone?: string, customerName?: string): boolean {
    if (!cartItems || cartItems.length === 0) return false;
    const phone = customerPhone?.trim() || this.customerInfo()?.phone?.trim();
    const name = customerName?.trim() || this.customerInfo()?.name?.trim();

    const activeOrders = this.orders().filter(o => o.status !== 'completed' && o.status !== 'cancelled');

    return activeOrders.some(order => {
      const matchCustomer = (phone && order.customerPhone === phone) || (name && order.customerName === name);
      if (!matchCustomer) return false;

      if (order.items.length !== cartItems.length) return false;

      const sortedCart = [...cartItems].sort((a, b) => a.product.id.localeCompare(b.product.id));
      const sortedOrder = [...order.items].sort((a, b) => a.product.id.localeCompare(b.product.id));

      return sortedCart.every((item, idx) => {
        const orderItem = sortedOrder[idx];
        return item.product.id === orderItem.product.id && item.quantity === orderItem.quantity;
      });
    });
  }

  submitOrder(orderData: {
    orderType: OmAlQuraOrder['orderType'];
    customerName: string;
    customerPhone: string;
    deliveryAddress?: string;
    paymentMethod: OmAlQuraOrder['paymentMethod'];
    notes?: string;
    assignedDriverId?: string;
  }) {
    const items = this.cart();
    if (items.length === 0) {
      this.toast.show('سلة الشراء فارغة!', 'warning');
      return null;
    }

    if (this.isDuplicateActiveOrder(items, orderData.customerPhone, orderData.customerName)) {
      this.toast.show('⚠️ لقد قمت بطلب هذه المنتجات بالفعل وهي قيد المراجعة والتنفيذ حالياً! يمكنك تعديل الطلب أو اختيار منتجات جديدة.', 'warning');
      return null;
    }

    const total = items.reduce((acc, curr) => {
      const effectivePrice = curr.product.price * (1 - (curr.product.discountPercent || 0) / 100);
      return acc + (effectivePrice * curr.quantity);
    }, 0);

    let driverName = '';
    let driverPhone = '';
    if (orderData.assignedDriverId) {
      const driver = this.deliveryDrivers().find(d => d.id === orderData.assignedDriverId);
      if (driver) {
        driverName = driver.name;
        driverPhone = driver.phone;
      }
    }

    const newOrder: OmAlQuraOrder = {
      id: 'ord-' + Math.floor(100 + Math.random() * 900),
      orderType: orderData.orderType,
      customerName: orderData.customerName || 'عميل المتجر',
      customerPhone: orderData.customerPhone || '01000000000',
      items: [...items],
      totalPrice: Math.round(total),
      status: 'pending',
      assignedDriverId: orderData.assignedDriverId,
      assignedDriverName: driverName,
      assignedDriverPhone: driverPhone,
      deliveryAddress: orderData.deliveryAddress,
      deliveryEta: orderData.orderType === 'delivery' ? '25 - 35 دقيقة' : '15 دقيقة (حجز مسبق)',
      paymentMethod: orderData.paymentMethod,
      notes: orderData.notes,
      createdAt: 'الآن'
    };

    // Deduct stock
    const updatedProducts = this.products().map(p => {
      const orderedItem = items.find(i => i.product.id === p.id);
      if (orderedItem) {
        return {
          ...p,
          stockQuantity: Math.max(0, p.stockQuantity - orderedItem.quantity),
          salesCount: p.salesCount + orderedItem.quantity
        };
      }
      return p;
    });
    this.saveProducts(updatedProducts);

    this.saveOrders([newOrder, ...this.orders()]);
    this.clearCart();
    this.playNotificationChime();
    this.saveCustomerInvoice(newOrder);
    this.toast.show('تم الطلب وسيتم مراجعة طلبك وتنفيذه', 'success');
    return newOrder;
  }

  // Save / Clear Customer 24-Hour Invoice
  saveCustomerInvoice(order: OmAlQuraOrder) {
    this.savedCustomerInvoice.set(order);
    localStorage.setItem('omalqura_latest_customer_invoice', JSON.stringify({
      order,
      savedAt: Date.now()
    }));
  }

  clearCustomerInvoice() {
    this.savedCustomerInvoice.set(null);
    localStorage.removeItem('omalqura_latest_customer_invoice');
    this.toast.show('تم إزالة حفظ الفاتورة من جهازك.', 'info');
  }

  // POS Direct Invoice Creation
  createPosInvoice(posItems: OmAlQuraOrderItem[], customerName: string = 'زبون كاشير', paymentMethod: OmAlQuraOrder['paymentMethod'] = 'كاش') {
    const total = posItems.reduce((acc, curr) => acc + (curr.product.price * curr.quantity), 0);
    const posOrder: OmAlQuraOrder = {
      id: 'pos-' + Math.floor(1000 + Math.random() * 9000),
      orderType: 'pos',
      customerName,
      customerPhone: 'مباشر',
      items: posItems,
      totalPrice: total,
      status: 'completed',
      paymentMethod,
      createdAt: 'الآن'
    };

    // Deduct stock
    const updatedProducts = this.products().map(p => {
      const item = posItems.find(i => i.product.id === p.id);
      if (item) {
        return { ...p, stockQuantity: Math.max(0, p.stockQuantity - item.quantity), salesCount: p.salesCount + item.quantity };
      }
      return p;
    });
    this.saveProducts(updatedProducts);

    this.saveOrders([posOrder, ...this.orders()]);
    this.toast.show(`تم إصدار فاتورة كاشير رقم #${posOrder.id} بمبلغ ${total} ج.م`, 'success');
    this.printThermalReceipt(posOrder);
  }

  // Update order status (for staff & delivery driver)
  updateOrderStatus(orderId: string, status: OmAlQuraOrder['status']) {
    const updated = this.orders().map(o => o.id === orderId ? { ...o, status } : o);
    this.saveOrders(updated);
    this.toast.show(`تم تحديث حالة الطلب #${orderId} إلى (${status})`, 'info');
  }

  // Cancel order (by customer or staff) and notify staff
  cancelOrder(orderId: string, reason: string = 'تم إلغاء الطلب من قبل العميل') {
    const order = this.orders().find(o => o.id === orderId);
    if (!order) {
      this.toast.show('الطلب غير موجود بالسجلات', 'warning');
      return false;
    }

    if (order.status === 'completed') {
      this.toast.show('عذراً، هذا الطلب مكتمل ومستلم بالفعل ولا يمكن إلغاؤه.', 'warning');
      return false;
    }

    if (order.status === 'cancelled') {
      this.toast.show('هذا الطلب تم إلغاؤه مسبقاً!', 'info');
      return false;
    }

    // 1. Restore product stock quantities
    const updatedProducts = this.products().map(p => {
      const item = order.items.find(i => i.product.id === p.id);
      if (item) {
        return {
          ...p,
          stockQuantity: p.stockQuantity + item.quantity,
          salesCount: Math.max(0, p.salesCount - item.quantity)
        };
      }
      return p;
    });
    this.saveProducts(updatedProducts);

    const nowTime = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

    // 2. Update order status to 'cancelled' with cancellation details
    const updatedOrders = this.orders().map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          status: 'cancelled' as const,
          cancellationReason: reason,
          cancelledAt: nowTime
        };
      }
      return o;
    });
    this.saveOrders(updatedOrders);

    // 3. Sync customer saved invoice if it matches
    if (this.savedCustomerInvoice()?.id === orderId) {
      const updatedInvoice: OmAlQuraOrder = {
        ...this.savedCustomerInvoice()!,
        status: 'cancelled',
        cancellationReason: reason,
        cancelledAt: nowTime
      };
      this.savedCustomerInvoice.set(updatedInvoice);
      localStorage.setItem('omalqura_latest_customer_invoice', JSON.stringify({
        order: updatedInvoice,
        savedAt: Date.now()
      }));
    }

    // 4. Play chime & trigger staff alert notification
    this.playNotificationChime();
    this.toast.show(`🚫 تم إلغاء الطلب #${orderId} وإرسال إشعار فوري لطاقم العمل والموظفين!`, 'warning');
    return true;
  }

  assignDriverToOrder(orderId: string, driverId: string, driverName: string) {
    const updated = this.orders().map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          assignedDriverId: driverId,
          assignedDriverName: driverName,
          status: o.status === 'pending' ? ('preparing' as const) : o.status
        };
      }
      return o;
    });
    this.saveOrders(updated);
    this.toast.show(`تم تكليف السائق (${driverName}) بالطلب #${orderId}`, 'info');
  }

  // Customer Debts
  addCustomerDebt(debt: Omit<OmAlQuraCustomerDebt, 'id' | 'lastUpdated'>) {
    const newDebt: OmAlQuraCustomerDebt = {
      ...debt,
      id: 'debt-' + Math.random().toString(36).substr(2, 6),
      lastUpdated: new Date().toISOString().split('T')[0]
    };
    this.saveDebts([newDebt, ...this.customerDebts()]);
    this.toast.show('تم تسجيل الدين بنجاح لدفتر العملاء.', 'success');
  }

  updateDebtStatus(id: string, status: OmAlQuraCustomerDebt['status'], amountPaid: number = 0) {
    const updated = this.customerDebts().map(d => {
      if (d.id === id) {
        const remaining = Math.max(0, d.debtAmount - amountPaid);
        return {
          ...d,
          status,
          debtAmount: remaining,
          lastUpdated: new Date().toISOString().split('T')[0]
        };
      }
      return d;
    });
    this.saveDebts(updated);
    this.toast.show('تم تحديث حالة السداد والسند.', 'success');
  }

  // Missing Product Request
  requestMissingProduct(productName: string, customerName: string, customerPhone: string, notes?: string) {
    const newReq: OmAlQuraMissingProductRequest = {
      id: 'req-' + Math.random().toString(36).substr(2, 7),
      customerName,
      customerPhone,
      requestedProductName: productName,
      notes,
      requestedAt: 'الآن',
      status: 'جديد'
    };
    this.saveMissingRequests([newReq, ...this.missingProductRequests()]);
    this.toast.show('تم إرسال طلبك للموظفين بنجاح! وسوف نسعى لتوفير المنتج في أقرب وقت.', 'success');
  }

  // Staff Suggestions
  submitStaffSuggestion(staffName: string, title: string, details: string) {
    const newSug: OmAlQuraStaffSuggestion = {
      id: 'sug-' + Math.random().toString(36).substr(2, 7),
      staffName,
      title,
      details,
      createdAt: 'الآن',
      status: 'جديد'
    };
    this.saveSuggestions([newSug, ...this.staffSuggestions()]);
    this.toast.show('شكراً لمقترحك! تم إرساله للإدارة بنجاح.', 'success');
  }

  // FAQs Management
  addFaq(question: string, answer: string, category: string = 'عام') {
    const newFaq: OmAlQuraFaq = {
      id: 'f-' + Math.random().toString(36).substr(2, 6),
      question,
      answer,
      category
    };
    this.saveFaqs([...this.faqs(), newFaq]);
    this.toast.show('تمت إضافة السؤال والجواب لبنك المعلومات.', 'success');
  }

  deleteFaq(faqId: string) {
    const updated = this.faqs().filter(f => f.id !== faqId);
    this.faqs.set(updated);
    localStorage.setItem('omalqura_faqs', JSON.stringify(updated));
    if (this.firebase.firestore) {
      deleteDoc(doc(this.firebase.firestore, 'omalqura_faqs', faqId)).catch(() => {});
    }
    this.toast.show('تم حذف السؤال من بنك المعلومات.', 'info');
  }

  // Dynamic Categories Management
  addCategory(categoryName: string) {
    const trimmed = categoryName.trim();
    if (!trimmed) return;
    if (this.categories().includes(trimmed)) {
      this.toast.show('هذا القسم موجود بالفعل في القائمة!', 'warning');
      return;
    }
    const updated = [...this.categories(), trimmed];
    this.saveCategories(updated);
    this.toast.show(`تمت إضافة قسم جديد: (${trimmed})`, 'success');
  }

  renameCategory(oldName: string, newName: string) {
    const trimmedOld = (oldName || '').trim();
    const trimmedNew = (newName || '').trim();
    if (!trimmedNew || trimmedOld === trimmedNew) return;

    let updatedCategories = [...this.categories()];
    if (updatedCategories.includes(trimmedOld)) {
      updatedCategories = updatedCategories.map(c => c === trimmedOld ? trimmedNew : c);
    } else {
      updatedCategories.push(trimmedNew);
    }

    const uniqueCategories = Array.from(new Set(updatedCategories));
    this.saveCategories(uniqueCategories);

    // Update all products under this category
    const updatedProducts = this.products().map(p => {
      if ((p.category || '').trim() === trimmedOld || p.category === oldName) {
        return { ...p, category: trimmedNew };
      }
      return p;
    });
    this.saveProducts(updatedProducts);
    this.toast.show(`تم تعديل اسم القسم إلى (${trimmedNew}) وتحديث جميع منتجاته التابعة.`, 'success');
  }

  deleteCategory(categoryName: string) {
    const updatedCategories = this.categories().filter(c => c !== categoryName);
    this.saveCategories(updatedCategories);

    // Reassign products under this category to 'عام'
    const updatedProducts = this.products().map(p => {
      if (p.category === categoryName) {
        return { ...p, category: 'عام' };
      }
      return p;
    });
    this.saveProducts(updatedProducts);
    this.toast.show(`تم حذف قسم (${categoryName}) وتم نقل منتجاته التابعة إلى قسم (عام).`, 'info');
  }

  // Cloudinary Direct Image Uploading (Phone Camera & Gallery)
  async uploadImageToCloudinary(file: File): Promise<string> {
    this.toast.show('جاري رفع صورة المنتج إلى Cloudinary...', 'info');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'docs_upload_example_preset');

      const response = await fetch('https://api.cloudinary.com/v1_1/demo/image/upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        if (data.secure_url) {
          this.toast.show('تم رفع الصورة إلى Cloudinary بنجاح! ✨', 'success');
          return data.secure_url;
        }
      }
    } catch (e) {
      console.warn('Cloudinary API upload error, executing FileReader fallback', e);
    }

    // Fallback to local Data URL
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const result = evt.target?.result as string;
        this.toast.show('تم اعتماد صورة المنتج بنجاح!', 'success');
        resolve(result);
      };
      reader.readAsDataURL(file);
    });
  }

  // Delivery Drivers Management (for Admin)
  addDeliveryDriver(driver: Omit<OmAlQuraDeliveryDriver, 'id' | 'activeDeliveriesCount'>) {
    const newDriver: OmAlQuraDeliveryDriver = {
      ...driver,
      id: 'd-' + Math.random().toString(36).substr(2, 6),
      activeDeliveriesCount: 0
    };
    this.saveDrivers([...this.deliveryDrivers(), newDriver]);
    this.toast.show(`تم تسجيل سائق التوصيل: ${driver.name}`, 'success');
  }

  deleteDeliveryDriver(driverId: string) {
    const updated = this.deliveryDrivers().filter(d => d.id !== driverId);
    this.deliveryDrivers.set(updated);
    localStorage.setItem('omalqura_drivers', JSON.stringify(updated));
    if (this.firebase.firestore) {
      deleteDoc(doc(this.firebase.firestore, 'omalqura_delivery_drivers', driverId)).catch(() => {});
    }
    this.toast.show('تم حذف سائق التوصيل.', 'info');
  }

  // Audio Notification Synthesizer (Web Audio Chime for New Orders)
  playNotificationChime() {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.warn('Audio chime failed', e);
    }
  }

  // Generate WhatsApp Direct Link for Orders & Drivers
  getWhatsAppOrderLink(phone: string, order: OmAlQuraOrder) {
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? '2' + cleanPhone : cleanPhone;
    const itemsText = order.items.map(i => `- ${i.product.name} (عدد ${i.quantity})`).join('\n');
    const msg = `مرحباً! تفاصيل الطلب #${order.id} من متجر أم القرى:\n${itemsText}\nالإجمالي: ${order.totalPrice} ج.م\nالعنوان: ${order.deliveryAddress || 'استلام فرع'}`;
    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`;
  }

  // Thermal Receipt Printing (POS & Delivery)
  printThermalReceipt(order: OmAlQuraOrder) {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) return;

    const itemsHtml = order.items.map(i => `
      <tr>
        <td style="text-align:right; padding:4px 0;">${i.product.name}</td>
        <td style="text-align:center; padding:4px 0;">×${i.quantity}</td>
        <td style="text-align:left; padding:4px 0;">${i.product.price * i.quantity}ج.م</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <title>فاتورة حرارية #${order.id}</title>
        <style>
          body { font-family: monospace, sans-serif; width: 280px; margin: 0 auto; padding: 10px; text-align: center; }
          h2 { margin: 5px 0; font-size: 15px; }
          p { margin: 3px 0; font-size: 11px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; margin: 10px 0; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          .total { font-weight: bold; font-size: 14px; margin-top: 8px; }
        </style>
      </head>
      <body>
        <h2>متجر أم القرى</h2>
        <p>العنوان: الشارع الرئيسي - فرع أم القرى</p>
        <div class="divider"></div>
        <p><strong>رقم الفاتورة: #${order.id}</strong></p>
        <p>التاريخ: ${new Date().toLocaleString('ar-EG')}</p>
        <p>العميل: ${order.customerName} (${order.customerPhone})</p>
        ${order.deliveryAddress ? `<p>العنوان: ${order.deliveryAddress}</p>` : ''}
        <div class="divider"></div>
        <table>
          <thead>
            <tr style="border-bottom:1px solid #000;">
              <th style="text-align:right;">الصنف</th>
              <th>العدد</th>
              <th style="text-align:left;">المبلغ</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        <div class="divider"></div>
        <div class="total">الإجمالي: ${order.totalPrice} ج.م</div>
        <p>طريقة الدفع: ${order.paymentMethod}</p>
        <div class="divider"></div>
        <p>شكراً لزيارتكم متجر أم القرى!</p>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  }
}
