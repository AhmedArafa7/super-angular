import { Injectable, signal, computed, inject } from '@angular/core';
import { FirebaseService } from './firebase.service';
import { ToastService } from './toast.service';

export interface OmAlQuraProduct {
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
  orders = signal<OmAlQuraOrder[]>([]);
  deliveryDrivers = signal<OmAlQuraDeliveryDriver[]>([]);
  customerDebts = signal<OmAlQuraCustomerDebt[]>([]);
  missingProductRequests = signal<OmAlQuraMissingProductRequest[]>([]);
  staffSuggestions = signal<OmAlQuraStaffSuggestion[]>([]);
  faqs = signal<OmAlQuraFaq[]>([]);
  categories = signal<string[]>([]);

  // Customer Cart & Personal State
  cart = signal<OmAlQuraOrderItem[]>([]);
  userFavoriteProductIds = signal<string[]>([]);
  selectedDriverId = signal<string | null>(null);
  savedCustomerInvoice = signal<OmAlQuraOrder | null>(null);

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
  }

  private loadInitialData() {
    const savedProducts = localStorage.getItem('omalqura_products');
    if (savedProducts) {
      try {
        const parsed: OmAlQuraProduct[] = JSON.parse(savedProducts);
        const realProductsOnly = parsed.filter(p => !['p1', 'p2', 'p3', 'p4', 'p5', 'p6'].includes(p.id));
        this.products.set(realProductsOnly);
        localStorage.setItem('omalqura_products', JSON.stringify(realProductsOnly));
      } catch (e) {
        this.saveProducts([]);
      }
    } else {
      this.saveProducts([]);
    }

    const savedEmployees = localStorage.getItem('omalqura_employees');
    if (savedEmployees) {
      try {
        const parsed: OmAlQuraEmployee[] = JSON.parse(savedEmployees);
        const realEmployeesOnly = parsed.filter(e => !['e1', 'e2', 'e3', 'e4'].includes(e.id));
        this.employees.set(realEmployeesOnly);
        localStorage.setItem('omalqura_employees', JSON.stringify(realEmployeesOnly));
      } catch (e) {
        this.saveEmployees([]);
      }
    } else {
      this.saveEmployees([]);
    }

    const savedOrders = localStorage.getItem('omalqura_orders');
    if (savedOrders) {
      try {
        const parsed: OmAlQuraOrder[] = JSON.parse(savedOrders);
        const realOrdersOnly = parsed.filter(o => !['ord-101', 'ord-468', 'ord-494', 'pos-3047'].includes(o.id));
        this.orders.set(realOrdersOnly);
        localStorage.setItem('omalqura_orders', JSON.stringify(realOrdersOnly));
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
        const realDriversOnly = parsed.filter(d => !['d1', 'd2', 'd3'].includes(d.id));
        this.deliveryDrivers.set(realDriversOnly);
        localStorage.setItem('omalqura_drivers', JSON.stringify(realDriversOnly));
      } catch (e) {
        this.saveDrivers([]);
      }
    } else {
      this.saveDrivers([]);
    }

    const savedDebts = localStorage.getItem('omalqura_debts');
    if (savedDebts) {
      try {
        const parsed: OmAlQuraCustomerDebt[] = JSON.parse(savedDebts);
        const realDebtsOnly = parsed.filter(d => !['debt-1', 'debt-2'].includes(d.id));
        this.customerDebts.set(realDebtsOnly);
        localStorage.setItem('omalqura_debts', JSON.stringify(realDebtsOnly));
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
        const realRequestsOnly = parsed.filter(r => !['req-1'].includes(r.id));
        this.missingProductRequests.set(realRequestsOnly);
        localStorage.setItem('omalqura_missing_requests', JSON.stringify(realRequestsOnly));
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
        const realSuggestionsOnly = parsed.filter(s => !['sug-1'].includes(s.id));
        this.staffSuggestions.set(realSuggestionsOnly);
        localStorage.setItem('omalqura_suggestions', JSON.stringify(realSuggestionsOnly));
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
        const realFaqsOnly = parsed.filter(f => !['f-1', 'f-2', 'f-3'].includes(f.id));
        this.faqs.set(realFaqsOnly);
        localStorage.setItem('omalqura_faqs', JSON.stringify(realFaqsOnly));
      } catch (e) {
        this.saveFaqs([]);
      }
    } else {
      this.saveFaqs([]);
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
  }

  private saveProducts(data: OmAlQuraProduct[]) {
    this.products.set(data);
    localStorage.setItem('omalqura_products', JSON.stringify(data));
  }

  private saveEmployees(data: OmAlQuraEmployee[]) {
    this.employees.set(data);
    localStorage.setItem('omalqura_employees', JSON.stringify(data));
  }

  private saveOrders(data: OmAlQuraOrder[]) {
    this.orders.set(data);
    localStorage.setItem('omalqura_orders', JSON.stringify(data));
  }

  private saveDrivers(data: OmAlQuraDeliveryDriver[]) {
    this.deliveryDrivers.set(data);
    localStorage.setItem('omalqura_drivers', JSON.stringify(data));
  }

  private saveDebts(data: OmAlQuraCustomerDebt[]) {
    this.customerDebts.set(data);
    localStorage.setItem('omalqura_debts', JSON.stringify(data));
  }

  private saveMissingRequests(data: OmAlQuraMissingProductRequest[]) {
    this.missingProductRequests.set(data);
    localStorage.setItem('omalqura_missing_requests', JSON.stringify(data));
  }

  private saveSuggestions(data: OmAlQuraStaffSuggestion[]) {
    this.staffSuggestions.set(data);
    localStorage.setItem('omalqura_suggestions', JSON.stringify(data));
  }

  private saveFaqs(data: OmAlQuraFaq[]) {
    this.faqs.set(data);
    localStorage.setItem('omalqura_faqs', JSON.stringify(data));
  }

  private saveCategories(data: string[]) {
    this.categories.set(data);
    localStorage.setItem('omalqura_categories', JSON.stringify(data));
  }

  // --- SEED DATA ---
  private seedInitialData() {
    this.saveProducts([]);
  }

  private seedCategories() {
    const defaults = [
      'منظفات ومساحيق غسيل',
      'أدوات عناية شخصية وشامبو',
      'مطهرات ومعقمات منزلية',
      'منظفات صحون وأواني',
      'أدوات نظافة ومناديل ورقية',
      'معطرات جو ومفارش'
    ];
    this.saveCategories(defaults);
  }

  private seedEmployees() {
    this.saveEmployees([]);
  }

  private seedOrders() {
    this.saveOrders([]);
  }

  private seedDrivers() {
    this.saveDrivers([]);
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
    this.saveFaqs([]);
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
    const newLog: OmAlQuraAttendanceLog = {
      id: Math.random().toString(36).substr(2, 9),
      employeeId,
      employeeName: emp ? emp.name : 'موظف',
      type: 'in',
      time: timeStr,
      date: dateStr
    };
    this.attendanceLogs.update(logs => [newLog, ...logs]);
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
    const newLog: OmAlQuraAttendanceLog = {
      id: Math.random().toString(36).substr(2, 9),
      employeeId,
      employeeName: emp ? emp.name : 'موظف',
      type: 'out',
      time: timeStr,
      date: dateStr
    };
    this.attendanceLogs.update(logs => [newLog, ...logs]);
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
    this.saveEmployees(updated);
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
    this.saveProducts(filtered);
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
    this.toast.show('تم تأكيد وإرسال طلبك بنجاح! حُفظت الفاتورة على جهازك لمدة 24 ساعة.', 'success');
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
  createPosInvoice(posItems: OmAlQuraOrderItem[], customerName: string = 'زبون كاشير') {
    const total = posItems.reduce((acc, curr) => acc + (curr.product.price * curr.quantity), 0);
    const posOrder: OmAlQuraOrder = {
      id: 'pos-' + Math.floor(1000 + Math.random() * 9000),
      orderType: 'pos',
      customerName,
      customerPhone: 'مباشر',
      items: posItems,
      totalPrice: total,
      status: 'completed',
      paymentMethod: 'كاش',
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
  updateOrderStatus(orderId: string, status: OmAlQuraOrder['status']) {
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
    this.saveFaqs(updated);
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
    const trimmed = newName.trim();
    if (!trimmed || oldName === trimmed) return;
    if (this.categories().includes(trimmed)) {
      this.toast.show('توجد فئة بنفس هذا الاسم الجديد بالفعل!', 'warning');
      return;
    }
    const updatedCategories = this.categories().map(c => c === oldName ? trimmed : c);
    this.saveCategories(updatedCategories);

    // Update all products under this category
    const updatedProducts = this.products().map(p => {
      if (p.category === oldName) {
        return { ...p, category: trimmed };
      }
      return p;
    });
    this.saveProducts(updatedProducts);
    this.toast.show(`تم تعديل اسم القسم إلى (${trimmed}) وتحديث المنتجات التابعة له.`, 'success');
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
    this.saveDrivers(updated);
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
        <h2>متجر أم القرى للمنظفات والعناية</h2>
        <p>العنوان: الشارع الرئيسي - فرع أم القرى</p>
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
