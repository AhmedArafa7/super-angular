import { Injectable, signal, computed, inject } from '@angular/core';
import { collection, doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { ToastService } from './toast.service';

export interface OmAlQura2AisleConfig {
  id: string;
  name: string;
  shelves: string[];
}

export interface OmAlQura2StoreLayout {
  storeEntranceLabel: string;
  checkoutAreaLabel: string;
  warehouseAreaLabel: string;
  aisles: OmAlQura2AisleConfig[];
  customSketchNotes?: string;
  sketchImageUrl?: string;
}

export interface OmAlQura2Product {
  id: string;
  name: string;
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
  images?: string[]; // Array of additional image URLs for gallery
  description: string;
  salesCount: number;
}

export interface OmAlQura2Employee {
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

export interface OmAlQura2AttendanceLog {
  id: string;
  employeeId: string;
  employeeName: string;
  type: 'in' | 'out';
  time: string;
  date: string;
}

export interface OmAlQura2OrderItem {
  product: OmAlQura2Product;
  quantity: number;
}

export interface OmAlQura2Order {
  id: string;
  orderType: 'delivery' | 'pickup' | 'pos';
  customerName: string;
  customerPhone: string;
  items: OmAlQura2OrderItem[];
  totalPrice: number;
  status: 'pending' | 'preparing' | 'on_the_way' | 'completed' | 'cancelled';
  assignedDriverId?: string;
  assignedDriverName?: string;
  assignedDriverPhone?: string;
  deliveryAddress?: string;
  deliveryEta?: string;
  paymentMethod: 'كاش' | 'فيزا' | 'محفظة إلكترونية';
  notes?: string;
  createdAt: string;
  truckPlateNumber?: string;
  weighbridgeKg?: number;
  truckStageStatus?: 'factory_loading' | 'weighbridge' | 'on_the_way' | 'delivered';
}

export interface MetalMaterialInfo {
  id: string;
  name: string;
  density: number; // in g/cm3
  defaultPricePerKg: number; // in EGP
  laserRatePerMeter: number; // in EGP per meter for 1mm thickness
}

export const METAL_MATERIALS_DATABASE: MetalMaterialInfo[] = [
  { id: 'alum_6063', name: 'ألومنيوم 6063 فبريكة', density: 2.7, defaultPricePerKg: 180, laserRatePerMeter: 12 },
  { id: 'steel_cold', name: 'صاج صلب بارد 2مم', density: 7.85, defaultPricePerKg: 55, laserRatePerMeter: 15 },
  { id: 'steel_galv', name: 'صاج صلب مجلفن', density: 7.85, defaultPricePerKg: 62, laserRatePerMeter: 18 },
  { id: 'stainless_304', name: 'إستانلس ستيل 304 ليزر', density: 7.93, defaultPricePerKg: 195, laserRatePerMeter: 25 },
  { id: 'iron_pipes', name: 'مواسير حديد صلب', density: 7.85, defaultPricePerKg: 50, laserRatePerMeter: 14 },
  { id: 'copper_red', name: 'نحاس أصفر/أحمر فبريكة', density: 8.96, defaultPricePerKg: 420, laserRatePerMeter: 35 }
];

export interface MetalPriceTickerItem {
  id: string;
  name: string;
  pricePerKg: number;
  changePercent: number; // e.g. +1.2 or -0.5
  trend: 'up' | 'down' | 'stable';
  unit: string;
}

export const LIVE_METAL_PRICES_TICKER: MetalPriceTickerItem[] = [
  { id: '1', name: 'صاج صلب بارد 2مم', pricePerKg: 55, changePercent: 1.2, trend: 'up', unit: 'ج.م/كجم' },
  { id: '2', name: 'صاج صلب مجلفن 1.25م', pricePerKg: 62, changePercent: 0.8, trend: 'up', unit: 'ج.م/كجم' },
  { id: '3', name: 'ألومنيوم 6063 فبريكة', pricePerKg: 180, changePercent: -0.5, trend: 'down', unit: 'ج.م/كجم' },
  { id: '4', name: 'إستانلس ستيل 304', pricePerKg: 195, changePercent: 0.0, trend: 'stable', unit: 'ج.م/كجم' },
  { id: '5', name: 'نحاس أصفر/أحمر فبريكة', pricePerKg: 420, changePercent: 2.1, trend: 'up', unit: 'ج.م/كجم' },
  { id: '6', name: 'مواسير حديد صلب', pricePerKg: 50, changePercent: 1.0, trend: 'up', unit: 'ج.م/كجم' }
];

export interface DataSheetWeightRow {
  sizeSpec: string;
  weightKgPerMeter: number;
  densityNote: string;
}

export interface TechnicalDataSheet {
  id: string;
  title: string;
  category: string;
  metalCode: string;
  density: number; // g/cm3
  tensileStrengthMpa: number;
  chemicalComposition: { element: string; percentage: string }[];
  standardWeights: DataSheetWeightRow[];
  description: string;
  downloadFilename: string;
}

export const TECHNICAL_DATA_SHEETS_DATABASE: TechnicalDataSheet[] = [
  {
    id: 'ds-alum-6063',
    title: 'كتالوج المواصفات الفنية والأوزان القياسية - سبائك الألومنيوم 6063-T6',
    category: 'قطاعات الألومنيوم',
    metalCode: 'Alloy 6063-T6',
    density: 2.70,
    tensileStrengthMpa: 240,
    chemicalComposition: [
      { element: 'ألومنيوم (Al)', percentage: '97.5%' },
      { element: 'سيليكون (Si)', percentage: '0.2 - 0.6%' },
      { element: 'ماغنسيوم (Mg)', percentage: '0.45 - 0.9%' },
      { element: 'حديد (Fe)', percentage: '0.35% max' }
    ],
    standardWeights: [
      { sizeSpec: 'لوح ألومنيوم 100 × 200 سم - سمك 2 مم', weightKgPerMeter: 10.8, densityNote: '2.70 جم/سم³' },
      { sizeSpec: 'ماسورة ألومنيوم قطر 50 مم - سمك 3 مم', weightKgPerMeter: 1.2, densityNote: '2.70 جم/سم³' },
      { sizeSpec: 'زاوية ألومنيوم 50 × 50 مم - سمك 5 مم', weightKgPerMeter: 1.3, densityNote: '2.70 جم/سم³' }
    ],
    description: 'يمتاز ألومنيوم 6063 بمقاومته الفائقة للتآكل وإمكانية أنودته وتشكيله بدقة عالية للقطاعات المعمارية والصناعية.',
    downloadFilename: 'Mahmoud_Arafa_Aluminum_6063_Specs.pdf'
  },
  {
    id: 'ds-steel-cold',
    title: 'جدول الأوزان والخصائص الميكانيكية - الصاج الصلب البارد والمجلفن',
    category: 'ألواح وصاج الصلب',
    metalCode: 'ST37 / DX51D+Z',
    density: 7.85,
    tensileStrengthMpa: 360,
    chemicalComposition: [
      { element: 'حديد (Fe)', percentage: '99.1%' },
      { element: 'كربون (C)', percentage: '0.12%' },
      { element: 'منجنيز (Mn)', percentage: '0.45%' },
      { element: 'طبقة الجلفنة (Zn)', percentage: '120-275 جم/م²' }
    ],
    standardWeights: [
      { sizeSpec: 'لوح صاج 125 × 250 سم - سمك 1.5 مم', weightKgPerMeter: 36.8, densityNote: '7.85 جم/سم³' },
      { sizeSpec: 'لوح صاج 125 × 250 سم - سمك 2.0 مم', weightKgPerMeter: 49.1, densityNote: '7.85 جم/سم³' },
      { sizeSpec: 'لوح صاج 125 × 250 سم - سمك 3.0 مم', weightKgPerMeter: 73.6, densityNote: '7.85 جم/سم³' }
    ],
    description: 'ألواح صاج بارد مجلفن ومقاوم للصدأ مجهز للقص بالليزر المباشر وتشكيل الهياكل والعلب الكهربائية والمجاري الهوائية.',
    downloadFilename: 'Mahmoud_Arafa_Steel_Sheet_Specs.pdf'
  },
  {
    id: 'ds-stainless-304',
    title: 'الدليل الهندسي للإستانلس ستيل 304 - المقاومة والتحمل الحراري',
    category: 'الإستانلس ستيل',
    metalCode: 'AISI 304 / EN 1.4301',
    density: 7.93,
    tensileStrengthMpa: 515,
    chemicalComposition: [
      { element: 'كروم (Cr)', percentage: '18.0 - 20.0%' },
      { element: 'نيكل (Ni)', percentage: '8.0 - 10.5%' },
      { element: 'حديد (Fe)', percentage: '68.0%' },
      { element: 'كربون (C)', percentage: '0.07% max' }
    ],
    standardWeights: [
      { sizeSpec: 'لوح إستانلس 100 × 200 سم - سمك 1.0 مم', weightKgPerMeter: 15.86, densityNote: '7.93 جم/سم³' },
      { sizeSpec: 'لوح إستانلس 125 × 250 سم - سمك 2.0 مم', weightKgPerMeter: 49.56, densityNote: '7.93 جم/سم³' },
      { sizeSpec: 'ماسورة إستانلس غذائي 2 بوصة - سمك 2 مم', weightKgPerMeter: 2.45, densityNote: '7.93 جم/سم³' }
    ],
    description: 'إستانلس 304 ممتاز للصناعات الغذائية والدوائية والواجهات المعمارية ذات اللمعان العالي والمقاومة المطلقة للصدأ.',
    downloadFilename: 'Mahmoud_Arafa_Stainless_304_Specs.pdf'
  }
];

export interface OmAlQura2DeliveryDriver {
  id: string;
  name: string;
  phone: string;
  status: 'متاح' | 'في مصلحة/توصيل' | 'غير متاح';
  currentDeliveryAddress?: string;
  workingHoursInfo: string;
  activeDeliveriesCount: number;
}

export interface OmAlQura2CustomerDebt {
  id: string;
  customerName: string;
  customerPhone: string;
  debtAmount: number; // EGP
  notes: string;
  dueDate?: string;
  lastUpdated: string;
  status: 'معلق' | 'مسدد بالكامل' | 'تسديد جزئي';
}

export interface OmAlQura2Supplier {
  id: string;
  name: string;
  phone: string;
  companyName: string;
  suppliedCategories: string[];
  notes?: string;
}

export interface OmAlQura2PurchaseOrderItem {
  productId?: string;
  productName: string;
  currentStock: number;
  requestedQuantity: number;
  unitPriceEst?: number;
}

export interface OmAlQura2PurchaseOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  supplierPhone: string;
  items: OmAlQura2PurchaseOrderItem[];
  totalEstPrice: number;
  status: 'تم الإنشاء' | 'تم الإرسال للمورد' | 'تم الاستلام وزيادة المخزون';
  createdAt: string;
  notes?: string;
}

export interface OmAlQura2MissingProductRequest {
  id: string;
  customerName: string;
  customerPhone: string;
  requestedProductName: string;
  notes?: string;
  requestedAt: string;
  status: 'جديد' | 'قيد المراجعة' | 'تم التوفير';
}

export interface OmAlQura2StaffSuggestion {
  id: string;
  staffName: string;
  title: string;
  details: string;
  createdAt: string;
  status: 'جديد' | 'تمت دراسته' | 'مطبق';
}

export interface OmAlQura2Faq {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export interface OmAlQura2CustomerInfo {
  name: string;
  phone: string;
  address: string;
  preferredDriverId?: string | null;
  preferredPaymentMethod?: 'كاش' | 'فيزا' | 'محفظة إلكترونية';
}

@Injectable({
  providedIn: 'root'
})
export class OmAlQura2Service {
  private firebase = inject(FirebaseService);
  private toast = inject(ToastService);

  // State Signals
  products = signal<OmAlQura2Product[]>([]);
  employees = signal<OmAlQura2Employee[]>([]);
  attendanceLogs = signal<OmAlQura2AttendanceLog[]>([]);
  orders = signal<OmAlQura2Order[]>([]);
  deliveryDrivers = signal<OmAlQura2DeliveryDriver[]>([]);
  customerDebts = signal<OmAlQura2CustomerDebt[]>([]);
  missingProductRequests = signal<OmAlQura2MissingProductRequest[]>([]);
  staffSuggestions = signal<OmAlQura2StaffSuggestion[]>([]);
  faqs = signal<OmAlQura2Faq[]>([]);
  categories = signal<string[]>([]);
  suppliers = signal<OmAlQura2Supplier[]>([]);
  purchaseOrders = signal<OmAlQura2PurchaseOrder[]>([]);
  liveMetalPrices = signal<MetalPriceTickerItem[]>(LIVE_METAL_PRICES_TICKER);
  technicalDataSheets = signal<TechnicalDataSheet[]>(TECHNICAL_DATA_SHEETS_DATABASE);

  // Customizable Store Sketch Layout & Aisle/Shelf Names
  storeLayout = signal<OmAlQura2StoreLayout>({
    storeEntranceLabel: 'المدخل الرئيسي للمصنع',
    checkoutAreaLabel: 'منطقة الإدارة والمبيعات والمعارض',
    warehouseAreaLabel: 'المخزن الهندسي للمعادن والمواد الخام',
    aisles: [
      { id: 'aisle-1', name: 'الممر 1 (قطاعات ألومنيوم وهياكل)', shelves: ['الرف 1 (علوي)', 'الرف 2 (وسط)', 'الرف 3 (سفلي)'] },
      { id: 'aisle-2', name: 'الممر 2 (حديد صلب ومواسير)', shelves: ['الرف 1 (علوي)', 'الرف 2 (وسط)', 'الرف 3 (سفلي)'] },
      { id: 'aisle-3', name: 'الممر 3 (اكسسوارات ومسامير ومسبوكات)', shelves: ['الرف 1 (علوي)', 'الرف 2 (وسط)', 'الرف 3 (سفلي)'] }
    ],
    customSketchNotes: 'يرجى اتباع الممرات المحددة للوصول لقسم المعادن والمشغولات المطلوب.'
  });

  // Customer Cart & Personal State
  cart = signal<OmAlQura2OrderItem[]>([]);
  userFavoriteProductIds = signal<string[]>([]);
  selectedDriverId = signal<string | null>(null);
  savedCustomerInvoice = signal<OmAlQura2Order | null>(null);
  customerInfo = signal<OmAlQura2CustomerInfo>({
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
  }

  // Real-time Cloud Database Listeners (Firestore Real-time Sync across all browsers/devices)
  private initFirestoreSync() {
    try {
      if (!this.firebase.firestore) return;

      // 1. Real-time Products Sync
      onSnapshot(collection(this.firebase.firestore, 'mahmoud_arafa_products'), (snapshot) => {
        const prods = snapshot.docs.map(d => d.data() as OmAlQura2Product);
        if (prods.length > 0 || !snapshot.metadata.hasPendingWrites) {
          this.products.set(prods);
          localStorage.setItem('mahmoud_arafa_products', JSON.stringify(prods));
        }
      }, (err) => console.warn('[Firestore MahmoudArafa] Products sync warning:', err));

      // 2. Real-time Orders Sync
      onSnapshot(collection(this.firebase.firestore, 'mahmoud_arafa_orders'), (snapshot) => {
        const ords = snapshot.docs.map(d => d.data() as OmAlQura2Order);
        if (ords.length > 0 || !snapshot.metadata.hasPendingWrites) {
          this.orders.set(ords);
          localStorage.setItem('mahmoud_arafa_orders', JSON.stringify(ords));
        }
      }, (err) => console.warn('[Firestore MahmoudArafa] Orders sync warning:', err));

      // 3. Real-time Delivery Drivers Sync
      onSnapshot(collection(this.firebase.firestore, 'mahmoud_arafa_delivery_drivers'), (snapshot) => {
        const drvs = snapshot.docs.map(d => d.data() as OmAlQura2DeliveryDriver);
        if (drvs.length > 0 || !snapshot.metadata.hasPendingWrites) {
          this.deliveryDrivers.set(drvs);
          localStorage.setItem('mahmoud_arafa_drivers', JSON.stringify(drvs));
        }
      }, (err) => console.warn('[Firestore MahmoudArafa] Drivers sync warning:', err));

      // 4. Real-time Employees Sync
      onSnapshot(collection(this.firebase.firestore, 'mahmoud_arafa_employees'), (snapshot) => {
        const emps = snapshot.docs.map(d => d.data() as OmAlQura2Employee);
        if (emps.length > 0 || !snapshot.metadata.hasPendingWrites) {
          this.employees.set(emps);
          localStorage.setItem('mahmoud_arafa_employees', JSON.stringify(emps));
        }
      }, (err) => console.warn('[Firestore MahmoudArafa] Employees sync warning:', err));

      // 5. Real-time Customer Debts Sync
      onSnapshot(collection(this.firebase.firestore, 'mahmoud_arafa_customer_debts'), (snapshot) => {
        const debts = snapshot.docs.map(d => d.data() as OmAlQura2CustomerDebt);
        if (debts.length > 0 || !snapshot.metadata.hasPendingWrites) {
          this.customerDebts.set(debts);
          localStorage.setItem('mahmoud_arafa_debts', JSON.stringify(debts));
        }
      }, (err) => console.warn('[Firestore MahmoudArafa] Debts sync warning:', err));

      // 6. Real-time Missing Requests Sync
      onSnapshot(collection(this.firebase.firestore, 'mahmoud_arafa_missing_requests'), (snapshot) => {
        const reqs = snapshot.docs.map(d => d.data() as OmAlQura2MissingProductRequest);
        if (reqs.length > 0 || !snapshot.metadata.hasPendingWrites) {
          this.missingProductRequests.set(reqs);
          localStorage.setItem('mahmoud_arafa_missing_requests', JSON.stringify(reqs));
        }
      }, (err) => console.warn('[Firestore MahmoudArafa] Missing requests sync warning:', err));

      // 7. Real-time Staff Suggestions Sync
      onSnapshot(collection(this.firebase.firestore, 'mahmoud_arafa_staff_suggestions'), (snapshot) => {
        const sugs = snapshot.docs.map(d => d.data() as OmAlQura2StaffSuggestion);
        if (sugs.length > 0 || !snapshot.metadata.hasPendingWrites) {
          this.staffSuggestions.set(sugs);
          localStorage.setItem('mahmoud_arafa_suggestions', JSON.stringify(sugs));
        }
      }, (err) => console.warn('[Firestore MahmoudArafa] Suggestions sync warning:', err));

      // 8. Real-time FAQs Sync
      onSnapshot(collection(this.firebase.firestore, 'mahmoud_arafa_faqs'), (snapshot) => {
        const faqs = snapshot.docs.map(d => d.data() as OmAlQura2Faq);
        if (faqs.length > 0 || !snapshot.metadata.hasPendingWrites) {
          this.faqs.set(faqs);
          localStorage.setItem('mahmoud_arafa_faqs', JSON.stringify(faqs));
        }
      }, (err) => console.warn('[Firestore MahmoudArafa] FAQs sync warning:', err));

      // 9. Real-time Categories Sync
      onSnapshot(doc(this.firebase.firestore, 'mahmoud_arafa_config', 'categories'), (snapshot) => {
        if (snapshot.exists()) {
          const cats = snapshot.data()['items'] as string[];
          if (cats && cats.length > 0) {
            this.categories.set(cats);
            localStorage.setItem('mahmoud_arafa_categories', JSON.stringify(cats));
          }
        }
      }, (err) => console.warn('[Firestore MahmoudArafa] Categories sync warning:', err));

      // 10. Real-time Store Layout Sketch Sync
      onSnapshot(doc(this.firebase.firestore, 'mahmoud_arafa_config', 'store_layout'), (snapshot) => {
        if (snapshot.exists()) {
          const layout = snapshot.data() as OmAlQura2StoreLayout;
          if (layout) {
            this.storeLayout.set(layout);
            localStorage.setItem('mahmoud_arafa_store_layout', JSON.stringify(layout));
          }
        }
      }, (err) => console.warn('[Firestore MahmoudArafa] Layout sync warning:', err));

      // 11. Real-time Suppliers Sync
      onSnapshot(collection(this.firebase.firestore, 'mahmoud_arafa_suppliers'), (snapshot) => {
        const supps = snapshot.docs.map(d => d.data() as OmAlQura2Supplier);
        if (supps.length > 0 || !snapshot.metadata.hasPendingWrites) {
          this.suppliers.set(supps);
          localStorage.setItem('mahmoud_arafa_suppliers', JSON.stringify(supps));
        }
      }, (err) => console.warn('[Firestore MahmoudArafa] Suppliers sync warning:', err));

      // 12. Real-time Purchase Orders Sync
      onSnapshot(collection(this.firebase.firestore, 'mahmoud_arafa_purchase_orders'), (snapshot) => {
        const pos = snapshot.docs.map(d => d.data() as OmAlQura2PurchaseOrder);
        if (pos.length > 0 || !snapshot.metadata.hasPendingWrites) {
          this.purchaseOrders.set(pos);
          localStorage.setItem('mahmoud_arafa_purchase_orders', JSON.stringify(pos));
        }
      }, (err) => console.warn('[Firestore MahmoudArafa] Purchase orders sync warning:', err));

    } catch (e) {
      console.warn('[Firestore OmAlQura2] Realtime init exception:', e);
    }
  }

  private loadInitialData() {
    const savedProducts = localStorage.getItem('mahmoud_arafa_products');
    if (savedProducts) {
      try {
        const parsed: OmAlQura2Product[] = JSON.parse(savedProducts);
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

    const savedEmployees = localStorage.getItem('mahmoud_arafa_employees');
    if (savedEmployees) {
      try {
        const parsed: OmAlQura2Employee[] = JSON.parse(savedEmployees);
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

    const savedOrders = localStorage.getItem('mahmoud_arafa_orders');
    if (savedOrders) {
      try {
        const parsed: OmAlQura2Order[] = JSON.parse(savedOrders);
        this.orders.set(parsed || []);
      } catch (e) {
        this.saveOrders([]);
      }
    } else {
      this.saveOrders([]);
    }

    const savedDrivers = localStorage.getItem('mahmoud_arafa_drivers');
    if (savedDrivers) {
      try {
        const parsed: OmAlQura2DeliveryDriver[] = JSON.parse(savedDrivers);
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

    const savedDebts = localStorage.getItem('mahmoud_arafa_debts');
    if (savedDebts) {
      try {
        const parsed: OmAlQura2CustomerDebt[] = JSON.parse(savedDebts);
        this.customerDebts.set(parsed || []);
      } catch (e) {
        this.saveDebts([]);
      }
    } else {
      this.saveDebts([]);
    }

    const savedRequests = localStorage.getItem('mahmoud_arafa_missing_requests');
    if (savedRequests) {
      try {
        const parsed: OmAlQura2MissingProductRequest[] = JSON.parse(savedRequests);
        this.missingProductRequests.set(parsed || []);
      } catch (e) {
        this.saveMissingRequests([]);
      }
    } else {
      this.saveMissingRequests([]);
    }

    const savedSuggestions = localStorage.getItem('mahmoud_arafa_suggestions');
    if (savedSuggestions) {
      try {
        const parsed: OmAlQura2StaffSuggestion[] = JSON.parse(savedSuggestions);
        this.staffSuggestions.set(parsed || []);
      } catch (e) {
        this.saveSuggestions([]);
      }
    } else {
      this.saveSuggestions([]);
    }

    const savedFaqs = localStorage.getItem('mahmoud_arafa_faqs');
    if (savedFaqs) {
      try {
        const parsed: OmAlQura2Faq[] = JSON.parse(savedFaqs);
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

    const savedCategories = localStorage.getItem('mahmoud_arafa_categories');
    if (savedCategories) {
      try { this.categories.set(JSON.parse(savedCategories)); } catch (e) { this.seedCategories(); }
    } else {
      this.seedCategories();
    }

    const savedFavs = localStorage.getItem('mahmoud_arafa_user_favorites');
    if (savedFavs) {
      try { this.userFavoriteProductIds.set(JSON.parse(savedFavs)); } catch (e) {}
    }

    // Load customer profile info to auto-fill input fields
    const savedCustomerInfo = localStorage.getItem('mahmoud_arafa_customer_info');
    if (savedCustomerInfo) {
      try {
        const parsed: OmAlQura2CustomerInfo = JSON.parse(savedCustomerInfo);
        if (parsed) {
          this.customerInfo.set(parsed);
          if (parsed.preferredDriverId) {
            this.selectedDriverId.set(parsed.preferredDriverId);
          }
        }
      } catch (e) {}
    }

    // Load customer's 24-hour persistent invoice
    const savedInvoiceStr = localStorage.getItem('mahmoud_arafa_latest_customer_invoice');
    if (savedInvoiceStr) {
      try {
        const parsed = JSON.parse(savedInvoiceStr);
        const ONE_DAY_MS = 24 * 60 * 60 * 1000;
        if (parsed && parsed.savedAt && (Date.now() - parsed.savedAt <= ONE_DAY_MS)) {
          this.savedCustomerInvoice.set(parsed.order);
        } else {
          localStorage.removeItem('mahmoud_arafa_latest_customer_invoice');
        }
      } catch (e) {
        localStorage.removeItem('mahmoud_arafa_latest_customer_invoice');
      }
    }

    // Load store layout
    const savedLayout = localStorage.getItem('mahmoud_arafa_store_layout');
    if (savedLayout) {
      try { this.storeLayout.set(JSON.parse(savedLayout)); } catch (e) {}
    }

    const savedSuppliers = localStorage.getItem('mahmoud_arafa_suppliers');
    if (savedSuppliers) {
      try { this.suppliers.set(JSON.parse(savedSuppliers)); } catch (e) { this.seedInitialSuppliers(); }
    } else {
      this.seedInitialSuppliers();
    }

    const savedPOs = localStorage.getItem('mahmoud_arafa_purchase_orders');
    if (savedPOs) {
      try { this.purchaseOrders.set(JSON.parse(savedPOs)); } catch (e) {}
    }
  }

  saveSuppliers(data: OmAlQura2Supplier[]) {
    this.suppliers.set(data);
    localStorage.setItem('mahmoud_arafa_suppliers', JSON.stringify(data));
    if (this.firebase.firestore) {
      data.forEach(item => setDoc(doc(this.firebase.firestore, 'mahmoud_arafa_suppliers', item.id), item).catch(() => {}));
    }
  }

  addSupplier(data: Omit<OmAlQura2Supplier, 'id'>): OmAlQura2Supplier {
    const newSupp: OmAlQura2Supplier = {
      id: 'supp-' + Math.floor(1000 + Math.random() * 9000),
      ...data
    };
    this.saveSuppliers([newSupp, ...this.suppliers()]);
    this.toast.show(`تم تسجيل المورد (${newSupp.name}) بنجاح بمصنع محمود عرفه للمعادن!`, 'success');
    return newSupp;
  }

  deleteSupplier(id: string) {
    const updated = this.suppliers().filter(s => s.id !== id);
    this.suppliers.set(updated);
    localStorage.setItem('mahmoud_arafa_suppliers', JSON.stringify(updated));
    if (this.firebase.firestore) {
      deleteDoc(doc(this.firebase.firestore, 'mahmoud_arafa_suppliers', id)).catch(() => {});
    }
    this.toast.show('تم حذف بيانات المورد.', 'info');
  }

  savePurchaseOrders(data: OmAlQura2PurchaseOrder[]) {
    this.purchaseOrders.set(data);
    localStorage.setItem('mahmoud_arafa_purchase_orders', JSON.stringify(data));
    if (this.firebase.firestore) {
      data.forEach(item => setDoc(doc(this.firebase.firestore, 'mahmoud_arafa_purchase_orders', item.id), item).catch(() => {}));
    }
  }

  createPurchaseOrder(supplierId: string, items: OmAlQura2PurchaseOrderItem[], notes?: string): OmAlQura2PurchaseOrder | null {
    const supplier = this.suppliers().find(s => s.id === supplierId);
    if (!supplier || items.length === 0) return null;

    const totalEst = items.reduce((acc, i) => acc + ((i.unitPriceEst || 0) * i.requestedQuantity), 0);

    const newPO: OmAlQura2PurchaseOrder = {
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

  getWhatsAppPoLink(po: OmAlQura2PurchaseOrder): string {
    const itemsText = po.items.map((item, idx) => `${idx + 1}. *${item.productName}*: المطلوب (${item.requestedQuantity} قطعة) - (المخزون الحالي بمصنع المعادن: ${item.currentStock} قطعة)`).join('\n');
    const text = `*أمر توريد وبضاعة معادن جديد - مصنع محمود عرفه للمعادن* ⚙️
رقم الأمر: #${po.id}
المورد: *${po.supplierName}*
التاريخ: ${po.createdAt}

*قائمة أصناف المعادن المطلوبة للمصنع:*
${itemsText}

ملاحظات والتسليم: ${po.notes || 'يرجى التوريد وتأكيد موعد الوصول لمقر المصنع.'}

شكرًا لتعاونكم مع مصنع محمود عرفه للمعادن!`;

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

    this.toast.show(`تم تأكيد استلام شحنة المعادن وتزويد رصيد المخزون تلقائياً للأصناف الواردة! 🎉`, 'success');
  }

  private seedInitialSuppliers() {
    const defaults: OmAlQura2Supplier[] = [];
    this.saveSuppliers(defaults);
  }

  private saveProducts(data: OmAlQura2Product[]) {
    this.products.set(data);
    localStorage.setItem('mahmoud_arafa_products', JSON.stringify(data));
    if (this.firebase.firestore) {
      data.forEach(item => setDoc(doc(this.firebase.firestore, 'mahmoud_arafa_products', item.id), item).catch(() => {}));
    }
  }

  private saveEmployees(data: OmAlQura2Employee[]) {
    this.employees.set(data);
    localStorage.setItem('mahmoud_arafa_employees', JSON.stringify(data));
    if (this.firebase.firestore) {
      data.forEach(item => setDoc(doc(this.firebase.firestore, 'mahmoud_arafa_employees', item.id), item).catch(() => {}));
    }
  }

  private saveOrders(data: OmAlQura2Order[]) {
    this.orders.set(data);
    localStorage.setItem('mahmoud_arafa_orders', JSON.stringify(data));
    if (this.firebase.firestore) {
      data.forEach(item => setDoc(doc(this.firebase.firestore, 'mahmoud_arafa_orders', item.id), item).catch(() => {}));
    }
  }

  private saveDrivers(data: OmAlQura2DeliveryDriver[]) {
    this.deliveryDrivers.set(data);
    localStorage.setItem('mahmoud_arafa_drivers', JSON.stringify(data));
    if (this.firebase.firestore) {
      data.forEach(item => setDoc(doc(this.firebase.firestore, 'mahmoud_arafa_delivery_drivers', item.id), item).catch(() => {}));
    }
  }

  private saveDebts(data: OmAlQura2CustomerDebt[]) {
    this.customerDebts.set(data);
    localStorage.setItem('mahmoud_arafa_debts', JSON.stringify(data));
    if (this.firebase.firestore) {
      data.forEach(item => setDoc(doc(this.firebase.firestore, 'mahmoud_arafa_customer_debts', item.id), item).catch(() => {}));
    }
  }

  private saveMissingRequests(data: OmAlQura2MissingProductRequest[]) {
    this.missingProductRequests.set(data);
    localStorage.setItem('mahmoud_arafa_missing_requests', JSON.stringify(data));
    if (this.firebase.firestore) {
      data.forEach(item => setDoc(doc(this.firebase.firestore, 'mahmoud_arafa_missing_requests', item.id), item).catch(() => {}));
    }
  }

  private saveAttendanceLogs(data: OmAlQura2AttendanceLog[]) {
    this.attendanceLogs.set(data);
    localStorage.setItem('mahmoud_arafa_attendance_logs', JSON.stringify(data));
    if (this.firebase.firestore) {
      data.forEach(item => setDoc(doc(this.firebase.firestore, 'mahmoud_arafa_attendance_logs', item.id), item).catch(() => {}));
    }
  }

  private saveSuggestions(data: OmAlQura2StaffSuggestion[]) {
    this.staffSuggestions.set(data);
    localStorage.setItem('mahmoud_arafa_suggestions', JSON.stringify(data));
    if (this.firebase.firestore) {
      data.forEach(item => setDoc(doc(this.firebase.firestore, 'mahmoud_arafa_staff_suggestions', item.id), item).catch(() => {}));
    }
  }

  private saveFaqs(data: OmAlQura2Faq[]) {
    this.faqs.set(data);
    localStorage.setItem('mahmoud_arafa_faqs', JSON.stringify(data));
    if (this.firebase.firestore) {
      data.forEach(item => setDoc(doc(this.firebase.firestore, 'mahmoud_arafa_faqs', item.id), item).catch(() => {}));
    }
  }



  private saveCategories(data: string[]) {
    this.categories.set(data);
    localStorage.setItem('mahmoud_arafa_categories', JSON.stringify(data));
    if (this.firebase.firestore) {
      setDoc(doc(this.firebase.firestore, 'mahmoud_arafa_config', 'categories'), { items: data }).catch(() => {});
    }
  }

  saveCustomerInfo(info: Partial<OmAlQura2CustomerInfo>) {
    const current = this.customerInfo();
    const updated: OmAlQura2CustomerInfo = {
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
    localStorage.setItem('mahmoud_arafa_customer_info', JSON.stringify(updated));
  }

  updateStoreLayout(layout: OmAlQura2StoreLayout) {
    this.storeLayout.set(layout);
    localStorage.setItem('mahmoud_arafa_store_layout', JSON.stringify(layout));
    if (this.firebase.firestore) {
      setDoc(doc(this.firebase.firestore, 'mahmoud_arafa_config', 'store_layout'), layout).catch(() => {});
    }
    this.toast.show('تم حفظ وتعميم الخريطة وتوزيع الرفوف بمصنع محمود عرفه للمعادن بنجاح!', 'success');
  }

  // --- SEED DATA ---
  private seedInitialProducts() {
    const defaults: OmAlQura2Product[] = [
      {
        id: 'metal-1',
        name: 'قطاع ألومنيوم 6063 فبريكة (3 متر)',
        category: 'قطاعات وإكسسوارات الألومنيوم',
        price: 750,
        stockQuantity: 45,
        discountPercent: 0,
        isBoycott: false,
        boycottAlternatives: [],
        locationInStore: 'الممر 1 (علوي)',
        isInWarehouse: false,
        description: 'قطاع ألومنيوم عالي الجودة سبائك 6063 معالج حرارياً، ممتاز لأعمال الهياكل والكريتال والتشكيل.',
        imageUrl: 'https://images.unsplash.com/photo-1535813547-99c456a41d4a?w=500&auto=format&fit=crop&q=60',
        images: [
          'https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=500&auto=format&fit=crop&q=60',
          'https://images.unsplash.com/photo-1563784462386-044fd95e9852?w=500&auto=format&fit=crop&q=60'
        ],
        salesCount: 15
      },
      {
        id: 'metal-2',
        name: 'ماسورة حديد صلب مجلفن 2 بوصة (6 متر)',
        category: 'حديد الصلب والمواسير',
        price: 1200,
        stockQuantity: 30,
        discountPercent: 0,
        isBoycott: false,
        boycottAlternatives: [],
        locationInStore: 'الممر 2 (وسط)',
        isInWarehouse: false,
        description: 'مواسير حديد صلب مجلفن سمك 3.2 مم مقاومة للصدأ للاستخدامات الهندسية والإنشائية الشاقة.',
        imageUrl: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=500&auto=format&fit=crop&q=60',
        images: [
          'https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&auto=format&fit=crop&q=60',
          'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=500&auto=format&fit=crop&q=60'
        ],
        salesCount: 22
      },
      {
        id: 'metal-3',
        name: 'لوح صاج بارد مجلفن (1.25 × 2.5 متر)',
        category: 'الصاج والألواح المجلفنة',
        price: 1850,
        stockQuantity: 20,
        discountPercent: 5,
        isBoycott: false,
        boycottAlternatives: [],
        locationInStore: 'الممر 2 (سفلي)',
        isInWarehouse: false,
        description: 'ألواح صاج مجلفن سمك 2 مم مقطوعة بالليزر، ناعمة السطح وجاهزة للدهان وتشكيل الهياكل.',
        imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop&q=60',
        images: [
          'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=500&auto=format&fit=crop&q=60',
          'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=500&auto=format&fit=crop&q=60'
        ],
        salesCount: 18
      },
      {
        id: 'metal-4',
        name: 'لوح إستانلس ستيل 304 ليزر (1 × 2 متر)',
        category: 'إستانلس ستيل ومقاوم الصدأ',
        price: 3400,
        stockQuantity: 15,
        discountPercent: 0,
        isBoycott: false,
        boycottAlternatives: [],
        locationInStore: 'الممر 1 (وسط)',
        isInWarehouse: false,
        description: 'ألواح إستانلس 304 لميع مرآة مقاوم للأحماض والصدأ والظروف الجوية الصعبة.',
        imageUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=500&auto=format&fit=crop&q=60',
        images: [
          'https://images.unsplash.com/photo-1485083269755-a7b559a4fe5e?w=500&auto=format&fit=crop&q=60',
          'https://images.unsplash.com/photo-1498084393753-b411b2d26b34?w=500&auto=format&fit=crop&q=60'
        ],
        salesCount: 8
      },
      {
        id: 'metal-5',
        name: 'عمود نحاس أصفر صلب قطر 25 مم (1 متر)',
        category: 'مسبوكات وإكسسوارات النحاس',
        price: 980,
        stockQuantity: 25,
        discountPercent: 0,
        isBoycott: false,
        boycottAlternatives: [],
        locationInStore: 'الممر 3 (علوي)',
        isInWarehouse: false,
        description: 'أعمدة نحاس أصفر عالي الكثافة للخراطة الدقيقة والمسبوكات والمفاصل الهندسية والصناعية.',
        imageUrl: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=500&auto=format&fit=crop&q=60',
        images: [
          'https://images.unsplash.com/photo-1558346490-a72e53ae2d4f?w=500&auto=format&fit=crop&q=60',
          'https://images.unsplash.com/photo-1449034446853-66c86144b0ad?w=500&auto=format&fit=crop&q=60'
        ],
        salesCount: 12
      },
      {
        id: 'metal-6',
        name: 'طقم مسامير صلب 8.8 عالي الإجهاد (100 قطعة)',
        category: 'المسامير والمشغولات المعدنية',
        price: 320,
        stockQuantity: 60,
        discountPercent: 0,
        isBoycott: false,
        boycottAlternatives: [],
        locationInStore: 'الممر 3 (وسط)',
        isInWarehouse: false,
        description: 'مسامير حديد صلب درجة 8.8 مع الصواميل والورد المجلفنة للتثبيت والإنشاءات الهندسية.',
        imageUrl: 'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?w=500&auto=format&fit=crop&q=60',
        images: [
          'https://images.unsplash.com/photo-1540104696136-bd18f8e02d6b?w=500&auto=format&fit=crop&q=60',
          'https://images.unsplash.com/photo-1530124560072-aae91cc294b1?w=500&auto=format&fit=crop&q=60'
        ],
        salesCount: 35
      }
    ];
    this.saveProducts(defaults);
  }

  private seedCategories() {
    this.saveCategories([
      'قطاعات وإكسسوارات الألومنيوم',
      'حديد الصلب والمواسير',
      'الصاج والألواح المجلفنة',
      'إستانلس ستيل ومقاوم الصدأ',
      'مسبوكات وإكسسوارات النحاس',
      'المسامير والمشغولات المعدنية'
    ]);
  }

  private seedEmployees() {
    const defaults: OmAlQura2Employee[] = [
      {
        id: 'emp-1',
        name: 'المهندس محمود عرفه',
        role: 'مدير',
        phone: '01011112222',
        salary: 15000,
        workingHoursThisMonth: 180,
        holidaysTaken: 1,
        isSuspended: false,
        shiftStatus: 'clocked_in',
        lastClockIn: '08:00 ص'
      },
      {
        id: 'emp-2',
        name: 'الأسطى أحمد السيد',
        role: 'مبيعات',
        phone: '01022223333',
        salary: 8500,
        workingHoursThisMonth: 160,
        holidaysTaken: 2,
        isSuspended: false,
        shiftStatus: 'clocked_in',
        lastClockIn: '08:30 ص'
      },
      {
        id: 'emp-3',
        name: 'سعيد عبد الرحمن',
        role: 'دليفري',
        phone: '01033334444',
        salary: 7000,
        workingHoursThisMonth: 150,
        holidaysTaken: 0,
        isSuspended: false,
        shiftStatus: 'clocked_in',
        lastClockIn: '09:00 ص'
      }
    ];
    this.saveEmployees(defaults);
  }

  private seedOrders() {
    this.saveOrders([]);
  }

  private seedDrivers() {
    const defaults: OmAlQura2DeliveryDriver[] = [
      {
        id: 'drv-1',
        name: 'سعيد عبد الرحمن - شاحنة النقل الثقيل',
        phone: '01033334444',
        status: 'متاح',
        workingHoursInfo: 'وردية التوريد والشحن (8 ص - 6 م)',
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
    const defaults: OmAlQura2Faq[] = [
      {
        id: 'faq-1',
        question: 'هل يوفر المصنع خدمات قص المعادن بالليزر والـ CNC؟',
        answer: 'نعم، نوفر أحدث ماكينات قص بالليزر وتشكيل الصاج والألومنيوم بدقة عالية وفقاً للمخططات والرسم الهندسي.',
        category: 'الخدمات والتصنيع'
      },
      {
        id: 'faq-2',
        question: 'ما هي خيارات شحن وتوريد المعادن والشحنات الثقيلة؟',
        answer: 'نوفر شاحنات نقل ثقيل ومجهزة لتوريد المعادن لكافة المحافظات مع ضمان السلامة والتفريغ الفني بالوقع.',
        category: 'الشحن والتوريد'
      }
    ];
    this.saveFaqs(defaults);
  }

  addFaqQuestion(question: string, answer: string = 'قيد المراجعة والإجابة من مهندسي المصنع...', category: string = 'استفسارات التوريد') {
    const newFaq: OmAlQura2Faq = {
      id: 'faq-' + Math.floor(1000 + Math.random() * 9000),
      question: question.trim(),
      answer: answer.trim(),
      category: category.trim()
    };
    this.saveFaqs([newFaq, ...this.faqs()]);
    this.toast.show('تم تقديم استفسار التوريد بنجاح وسيتم إجابته من مهندسي المصنع!', 'success');
  }

  // --- METHODS & ACTIONS ---

  // Employees & Attendance
  clockIn(employeeId: string) {
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
    const newLog: OmAlQura2AttendanceLog = {
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

  clockOut(employeeId: string) {
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
    const newLog: OmAlQura2AttendanceLog = {
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
    role: OmAlQura2Employee['role'];
    phone: string;
    salary: number;
  }) {
    const newEmp: OmAlQura2Employee = {
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
      const newDriver: OmAlQura2DeliveryDriver = {
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
    localStorage.setItem('omalqura2_employees', JSON.stringify(updated));
    if (this.firebase.firestore) {
      deleteDoc(doc(this.firebase.firestore, 'omalqura2_employees', employeeId)).catch(() => {});
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
  addProduct(product: Omit<OmAlQura2Product, 'id' | 'salesCount'>) {
    const newProd: OmAlQura2Product = {
      ...product,
      id: 'p-' + Math.random().toString(36).substr(2, 7),
      salesCount: 0
    };
    this.saveProducts([newProd, ...this.products()]);
    this.toast.show('تمت إضافة المنتج بنجاح لمخزون الفرع الثاني!', 'success');
  }

  updateProduct(id: string, updates: Partial<OmAlQura2Product>) {
    const updated = this.products().map(p => p.id === id ? { ...p, ...updates } : p);
    this.saveProducts(updated);
    this.toast.show('تم تحديث بيانات المنتج والمخزون بنجاح.', 'success');
  }

  deleteProduct(id: string) {
    const filtered = this.products().filter(p => p.id !== id);
    this.products.set(filtered);
    localStorage.setItem('omalqura2_products', JSON.stringify(filtered));
    if (this.firebase.firestore) {
      deleteDoc(doc(this.firebase.firestore, 'omalqura2_products', id)).catch(() => {});
    }
    this.toast.show('تم حذف المنتج من النظام.', 'info');
  }

  // Shopping Cart & Orders
  addToCart(product: OmAlQura2Product) {
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
    }).filter(Boolean) as OmAlQura2OrderItem[];
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
      localStorage.setItem('omalqura2_user_favorites', JSON.stringify(updated));
      this.toast.show('تمت إزالة المنتج من المفضلة', 'info');
    } else {
      const updated = [...favs, productId];
      this.userFavoriteProductIds.set(updated);
      localStorage.setItem('omalqura2_user_favorites', JSON.stringify(updated));
      this.toast.show('تمت إضافة المنتج لمفضلتك!', 'success');
    }
  }

  isDuplicateActiveOrder(cartItems: { product: OmAlQura2Product; quantity: number }[], customerPhone?: string, customerName?: string): boolean {
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
    orderType: OmAlQura2Order['orderType'];
    customerName: string;
    customerPhone: string;
    deliveryAddress?: string;
    paymentMethod: OmAlQura2Order['paymentMethod'];
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

    const newOrder: OmAlQura2Order = {
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
  saveCustomerInvoice(order: OmAlQura2Order) {
    this.savedCustomerInvoice.set(order);
    localStorage.setItem('omalqura2_latest_customer_invoice', JSON.stringify({
      order,
      savedAt: Date.now()
    }));
  }

  clearCustomerInvoice() {
    this.savedCustomerInvoice.set(null);
    localStorage.removeItem('omalqura2_latest_customer_invoice');
    this.toast.show('تم إزالة حفظ الفاتورة من جهازك.', 'info');
  }

  // POS Direct Invoice Creation
  createPosInvoice(posItems: OmAlQura2OrderItem[], customerName: string = 'زبون كاشير', paymentMethod: OmAlQura2Order['paymentMethod'] = 'كاش') {
    const total = posItems.reduce((acc, curr) => acc + (curr.product.price * curr.quantity), 0);

    const posOrder: OmAlQura2Order = {
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
  }

  // Update order status (for staff & delivery driver)
  updateOrderStatus(orderId: string, status: OmAlQura2Order['status']) {
    const updated = this.orders().map(o => o.id === orderId ? { ...o, status } : o);
    this.saveOrders(updated);
    this.toast.show(`تم تحديث حالة الطلب #${orderId} إلى (${status})`, 'info');
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
  addCustomerDebt(debt: Omit<OmAlQura2CustomerDebt, 'id' | 'lastUpdated'>) {
    const newDebt: OmAlQura2CustomerDebt = {
      ...debt,
      id: 'debt-' + Math.random().toString(36).substr(2, 6),
      lastUpdated: new Date().toISOString().split('T')[0]
    };
    this.saveDebts([newDebt, ...this.customerDebts()]);
    this.toast.show('تم تسجيل الدين بنجاح لدفتر العملاء.', 'success');
  }

  updateDebtStatus(id: string, status: OmAlQura2CustomerDebt['status'], amountPaid: number = 0) {
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
    const newReq: OmAlQura2MissingProductRequest = {
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
    const newSug: OmAlQura2StaffSuggestion = {
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
    const newFaq: OmAlQura2Faq = {
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
    localStorage.setItem('omalqura2_faqs', JSON.stringify(updated));
    if (this.firebase.firestore) {
      deleteDoc(doc(this.firebase.firestore, 'omalqura2_faqs', faqId)).catch(() => {});
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
  addDeliveryDriver(driver: Omit<OmAlQura2DeliveryDriver, 'id' | 'activeDeliveriesCount'>) {
    const newDriver: OmAlQura2DeliveryDriver = {
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
    localStorage.setItem('omalqura2_drivers', JSON.stringify(updated));
    if (this.firebase.firestore) {
      deleteDoc(doc(this.firebase.firestore, 'omalqura2_delivery_drivers', driverId)).catch(() => {});
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
  getWhatsAppOrderLink(phone: string, order: OmAlQura2Order) {
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? '2' + cleanPhone : cleanPhone;
    const itemsText = order.items.map(i => `- ${i.product.name} (عدد ${i.quantity})`).join('\n');
    const msg = `مرحباً! تفاصيل الطلب #${order.id} من مصنع محمود عرفه للمعادن:\n${itemsText}\nالإجمالي: ${order.totalPrice} ج.م\nالعنوان: ${order.deliveryAddress || 'استلام المصنع'}`;
    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`;
  }

  // Thermal Receipt Printing (POS & Delivery)
  printThermalReceipt(order: OmAlQura2Order) {
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
        <title>فاتورة توريد #${order.id}</title>
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
        <h2>مصنع محمود عرفه للمعادن</h2>
        <p>العنوان: المنطقة الصناعية - مصنع محمود عرفه للمعادن</p>
        <p>الهاتف: 01000000000</p>
        <div class="divider"></div>
        <p><strong>رقم الفاتورة: #${order.id}</strong></p>
        <p>التاريخ: ${new Date().toLocaleString('ar-EG')}</p>
        <p>العميل: ${order.customerName} (${order.customerPhone})</p>
        ${order.deliveryAddress ? `<p>العنوان: ${order.deliveryAddress}</p>` : ''}
        <div class="divider"></div>
        <table>
          <thead>
            <tr style="border-bottom:1px solid #000;">
              <th style="text-align:right;">الصنف / المنتج المعدني</th>
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
        <p>شكراً لتعاملكم مع مصنع محمود عرفه للمعادن!</p>
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

  // Generate WhatsApp Direct Quote Link
  getWhatsAppQuoteLink(
    phone: string = '01000000000',
    quoteInfo: {
      metalName: string;
      shapeName: string;
      lengthM: number;
      widthOrDia: string;
      thicknessMm: number;
      quantity: number;
      weightKg: number;
      priceEgp: number;
      customerName?: string;
    }
  ) {
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? '2' + cleanPhone : (cleanPhone.length > 0 ? cleanPhone : '20100000000');
    const clientLine = quoteInfo.customerName ? `العميل/المهندس: ${quoteInfo.customerName}\n` : '';
    const msg = `مرحباً مبيعات مصنع محمود عرفه للمعادن 🏭\n` +
      `أود الاستفسار عن عرض سعر وتخفيض الكميات للقطاع التالي:\n` +
      `${clientLine}` +
      `• الخامة: ${quoteInfo.metalName}\n` +
      `• الشكل: ${quoteInfo.shapeName}\n` +
      `• الأبعاد: طول ${quoteInfo.lengthM}م | ${quoteInfo.widthOrDia} | سماكة ${quoteInfo.thicknessMm}مم\n` +
      `• الكمية المطلوب حسابها: ${quoteInfo.quantity} قطعة\n` +
      `• الوزن الإجمالي: ${quoteInfo.weightKg} كجم (${(quoteInfo.weightKg / 1000).toFixed(3)} طن)\n` +
      `• السعر التقديري بالحاسبة: ${quoteInfo.priceEgp} ج.م\n\n` +
      `يرجى التواصل لمناقشة الخصم وميعاد التوريد ومواعيد التسليم.`;
    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`;
  }

  // Official PDF Quote Print & Export Helper
  generateOfficialQuotePdf(quoteDetails: {
    customerName?: string;
    metalName: string;
    density: number;
    shapeName: string;
    lengthM: number;
    widthCm?: number;
    thicknessMm?: number;
    outerDiameterMm?: number;
    leg1Cm?: number;
    leg2Cm?: number;
    quantity: number;
    pricePerKg: number;
    totalWeightKg: number;
    totalWeightTons: number;
    totalPriceEgp: number;
  }) {
    const printWindow = window.open('', '_blank', 'width=850,height=1000');
    if (!printWindow) return;

    const quoteCode = `QUO-MA-${Math.floor(100000 + Math.random() * 900000)}`;
    const todayStr = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + 7);
    const expireStr = expireDate.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });

    let dimSummary = `طول: ${quoteDetails.lengthM} متر`;
    if (quoteDetails.widthCm) dimSummary += ` | عرض: ${quoteDetails.widthCm} سم`;
    if (quoteDetails.outerDiameterMm) dimSummary += ` | القطر الخارجي: ${quoteDetails.outerDiameterMm} مم`;
    if (quoteDetails.leg1Cm && quoteDetails.leg2Cm) dimSummary += ` | الجناحين: ${quoteDetails.leg1Cm}×${quoteDetails.leg2Cm} سم`;
    if (quoteDetails.thicknessMm) dimSummary += ` | السماكة: ${quoteDetails.thicknessMm} مم`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>عرض سعر رسمي - مصنع محمود عرفه للمعادن - ${quoteCode}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
          * { box-sizing: border-box; font-family: 'Cairo', sans-serif; margin: 0; padding: 0; }
          body { background: #f8fafc; color: #0f172a; padding: 30px; line-height: 1.6; }
          .quote-container { background: #ffffff; border-radius: 20px; border: 2px solid #f59e0b; padding: 35px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); max-width: 800px; margin: 0 auto; position: relative; }
          .header { display: flex; justify-content: space-between; align-items: center; border-b: 3px solid #f59e0b; padding-bottom: 20px; margin-bottom: 25px; }
          .brand { display: flex; align-items: center; gap: 15px; }
          .brand-logo { width: 60px; height: 60px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 16px; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 30px; font-weight: 900; line-height: 60px; text-align: center; }
          .brand-title h1 { font-size: 22px; font-weight: 900; color: #1e293b; }
          .brand-title p { font-size: 12px; color: #b45309; font-weight: 700; }
          .meta-info { text-align: left; font-size: 12px; color: #475569; font-weight: 600; }
          .quote-badge { display: inline-block; background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 99px; font-weight: 800; font-size: 11px; margin-bottom: 5px; border: 1px solid #fcd34d; }
          .client-box { background: #f1f5f9; border-radius: 12px; padding: 15px 20px; margin-bottom: 25px; display: flex; justify-content: space-between; font-size: 13px; font-weight: 700; border-right: 4px solid #f59e0b; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 25px; border-radius: 12px; overflow: hidden; }
          th { background: #1e293b; color: #ffffff; padding: 12px; font-size: 13px; font-weight: 800; text-align: right; }
          td { padding: 14px 12px; font-size: 13px; border-bottom: 1px solid #e2e8f0; font-weight: 600; background: #fff; }
          .highlight-row { background: #fffbeb !important; font-weight: 800; }
          .totals-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px; }
          .total-card { background: linear-gradient(135deg, #fffbeb, #fef3c7); border: 2px solid #f59e0b; border-radius: 14px; padding: 15px; text-align: center; }
          .total-card-emerald { background: linear-gradient(135deg, #ecfdf5, #d1fae5); border: 2px solid #10b981; border-radius: 14px; padding: 15px; text-align: center; }
          .total-card label { font-size: 12px; color: #92400e; font-weight: 800; display: block; }
          .total-card-emerald label { font-size: 12px; color: #065f46; font-weight: 800; display: block; }
          .total-card val { font-size: 24px; font-weight: 900; color: #b45309; display: block; margin-top: 4px; }
          .total-card-emerald val { font-size: 24px; font-weight: 900; color: #047857; display: block; margin-top: 4px; }
          .footer-terms { border-t: 1px dashed #cbd5e1; padding-top: 15px; margin-top: 25px; display: flex; justify-content: space-between; align-items: flex-end; }
          .terms { font-size: 11px; color: #64748b; font-weight: 600; max-width: 500px; }
          .stamp { width: 120px; height: 120px; border: 3px double #f59e0b; border-radius: 50%; color: #b45309; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 10px; font-weight: 900; transform: rotate(-10deg); opacity: 0.85; text-align: center; padding: 5px; }
          @media print {
            body { background: #fff; padding: 0; }
            .quote-container { border: none; box-shadow: none; padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="quote-container">
          <div class="header">
            <div class="brand">
              <div class="brand-logo">⚙️</div>
              <div class="brand-title">
                <h1>مصنع محمود عرفه للمعادن والصاج</h1>
                <p>تشكيل الصاج بالليزر • ألواح وقطاعات الألومنيوم والصلب والإستانلس</p>
              </div>
            </div>
            <div class="meta-info">
              <span class="quote-badge">عرض سعر رسمي مالي</span>
              <div>كود العرض: <strong>${quoteCode}</strong></div>
              <div>تاريخ الإصدار: ${todayStr}</div>
              <div>صالح لغاية: <strong style="color:#d97706;">${expireStr}</strong></div>
            </div>
          </div>

          <div class="client-box">
            <div>العميل / الشركة: <strong>${quoteDetails.customerName || 'السادة عملاء مصنع محمود عرفه المحترمين'}</strong></div>
            <div>نوع العرض: <strong>توريد خاص وتصنيع قطاعات</strong></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>البيان والخامة</th>
                <th>الشكل الهندسي</th>
                <th>الأبعاد والمواصفات</th>
                <th>العدد</th>
                <th>سعر الكيلو</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>${quoteDetails.metalName}</strong><br><small style="color:#64748b;">(كثافة: ${quoteDetails.density} جم/سم³)</small></td>
                <td>${quoteDetails.shapeName}</td>
                <td>${dimSummary}</td>
                <td>${quoteDetails.quantity} قطعة</td>
                <td>${quoteDetails.pricePerKg} ج.م/كجم</td>
              </tr>
              <tr class="highlight-row">
                <td colspan="3"><strong>الوزن الكلي التقديري:</strong> ${quoteDetails.totalWeightKg} كجم (${quoteDetails.totalWeightTons} طن)</td>
                <td colspan="2" style="text-align:left;"><strong>سند التسعير:</strong> طبقاً للبورصة اليومية</td>
              </tr>
            </tbody>
          </table>

          <div class="totals-grid">
            <div class="total-card">
              <label>⚖️ إجمالي الوزن المطلوب</label>
              <val>${quoteDetails.totalWeightKg} كجم</val>
              <small style="font-size:11px; color:#78350f;">تساوي ${quoteDetails.totalWeightTons} طن متري</small>
            </div>
            <div class="total-card-emerald">
              <label>💰 إجمالي قيمة عرض السعر التقديري</label>
              <val>${quoteDetails.totalPriceEgp} ج.م</val>
              <small style="font-size:11px; color:#064e3b;">غير شامل مصاريف الشحن إن وجدت</small>
            </div>
          </div>

          <div class="footer-terms">
            <div class="terms">
              <strong>الشروط والأحكام العامة:</strong>
              <ol style="margin-right:15px; margin-top:4px;">
                <li>أسعار البورصة متغيرة، ويكون هذا العرض نافذاً ومضموناً لمدة 7 أيام من تاريخه.</li>
                <li>يتم استلام المعادن بمقر المصنع أو التنسيق مع أسطول شاحنات المصنع.</li>
                <li>نوفر تقطيع أطوال ومقاسات مخصصة بالليزر والثني CNC حسب الرسم الهندسي.</li>
              </ol>
            </div>
            <div class="stamp">
              <span>مصنع محمود عرفه</span>
              <span style="font-size:8px;">قسم المبيعات والتوريدات</span>
              <span>عرض سعر معتمد</span>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  }
}
