import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { OmAlQuraService, OmAlQuraOrder, OmAlQuraDeliveryDriver } from '../../../core/services/om-al-qura.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-om-al-qura-delivery-portal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideDynamicIcon],
  template: `
    <div class="space-y-8 font-sans" dir="rtl">
      
      <!-- Top Delivery Drivers Availability Header -->
      <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h2 class="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <svg lucideIcon="truck" class="w-6 h-6 text-emerald-600"></svg>
          <span>قائمة طاقم مندوبي التوصيل والمظلات المتاحة</span>
        </h2>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div *ngFor="let driver of service.deliveryDrivers()" class="p-5 rounded-2xl border transition-all flex flex-col justify-between"
               [ngClass]="driver.status === 'متاح' ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'">
            <div>
              <div class="flex justify-between items-start mb-2">
                <h3 class="font-black text-slate-900 dark:text-white text-lg">{{ driver.name }}</h3>
                <span class="px-2.5 py-0.5 rounded-full text-xs font-bold"
                      [ngClass]="driver.status === 'متاح' ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'">
                  {{ driver.status }}
                </span>
              </div>
              <p class="text-xs text-slate-500 mb-1">رقم الهاتف: <span class="font-mono font-bold text-slate-800 dark:text-white dir-ltr">{{ driver.phone }}</span></p>
              <p class="text-xs text-slate-500 mb-3">مواعيد الدوام: {{ driver.workingHoursInfo }}</p>
            </div>

            <div class="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700 text-xs">
              <span class="font-bold text-slate-700 dark:text-slate-300">الطلبات الحالية النشطة:</span>
              <span class="px-2.5 py-0.5 bg-emerald-600 text-white rounded-full font-black">{{ driver.activeDeliveriesCount }}</span>
            </div>
          </div>

          <div *ngIf="service.deliveryDrivers().length === 0" class="col-span-full p-6 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
            لم يتم تسجيل أي سائقين أو مندوبي توصيل بالفرع حتى الآن.
          </div>
        </div>
      </div>

      <!-- Active Delivery Orders & Interactive Route Map -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <!-- Delivery Orders List -->
        <div class="space-y-4">
          <h3 class="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <svg lucideIcon="list-todo" class="w-5 h-5 text-blue-600"></svg>
            <span>طلبات التوصيل النشطة</span>
          </h3>

          <div class="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
            <div *ngFor="let ord of deliveryOrders()" 
                 (click)="selectedOrder.set(ord)"
                 class="p-4 rounded-2xl border transition-all cursor-pointer space-y-2"
                 [ngClass]="selectedOrder()?.id === ord.id ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 shadow-md ring-2 ring-blue-500' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50'">
              <div class="flex justify-between items-center">
                <span class="font-black text-slate-900 dark:text-white text-base">طلب #{{ ord.id }}</span>
                <span class="px-2.5 py-0.5 rounded-full text-xs font-bold"
                      [ngClass]="ord.status === 'on_the_way' ? 'bg-blue-600 text-white' : 'bg-amber-500 text-white'">
                  {{ ord.status === 'on_the_way' ? 'على الطريق' : 'قيد التجهيز' }}
                </span>
              </div>
              <p class="text-xs text-slate-600 dark:text-slate-300 font-bold">العميل: {{ ord.customerName }}</p>
              <p class="text-xs text-slate-500 truncate">العنوان: {{ ord.deliveryAddress }}</p>
              
              <div class="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <span class="font-black text-emerald-600">{{ ord.totalPrice }} ج.م</span>
                <span class="text-slate-400">ETA: {{ ord.deliveryEta }}</span>
              </div>
            </div>

            <div *ngIf="deliveryOrders().length === 0" class="p-8 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
              لا توجد طلبات توصيل حالية
            </div>
          </div>
        </div>

        <!-- Order Destination Details & Interactive Route Map & Electronic Invoice -->
        <div class="lg:col-span-2 space-y-6">
          <div *ngIf="selectedOrder()" class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            
            <!-- Order Header -->
            <div class="flex flex-wrap justify-between items-start gap-4 p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div>
                <span class="text-xs font-bold text-blue-600 dark:text-blue-400">تفاصيل وجهة الطلب وتأكيد التوصيل:</span>
                <h3 class="text-2xl font-black text-slate-900 dark:text-white mt-1">طلب #{{ selectedOrder()?.id }} - {{ selectedOrder()?.customerName }}</h3>
                <p class="text-xs text-slate-500 mt-1">هاتف العميل: {{ selectedOrder()?.customerPhone }} | المندوب المكلف: {{ selectedOrder()?.assignedDriverName || 'غير محدد' }}</p>
              </div>

              <button (click)="printElectronicInvoice()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-2">
                <svg lucideIcon="printer" class="w-4 h-4"></svg>
                <span>طباعة الفاتورة الإلكترونية</span>
              </button>
            </div>

            <!-- Simulated Route Map to Destination -->
            <div class="space-y-3">
              <h4 class="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
                <svg lucideIcon="map-pin" class="w-5 h-5 text-rose-500"></svg>
                <span>خريطة توجيه المسار إلى موقع العميل</span>
              </h4>

              <div class="relative bg-slate-950 rounded-3xl p-6 overflow-hidden min-h-[300px] border border-slate-800 flex flex-col justify-between text-white">
                <div class="flex justify-between items-center text-xs text-slate-400 border-b border-slate-800 pb-3">
                  <span>الانطلاق: فرع متجر أم القرى</span>
                  <span class="text-amber-400 font-bold">الوجهة: {{ selectedOrder()?.deliveryAddress }}</span>
                </div>

                <!-- Visual Route Representation -->
                <div class="my-6 p-5 bg-slate-900/90 rounded-2xl border border-blue-500/50 flex flex-wrap justify-between items-center gap-4">
                  <div class="flex items-center gap-3">
                    <div class="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black animate-pulse">
                      <svg lucideIcon="navigation" class="w-6 h-6"></svg>
                    </div>
                    <div>
                      <p class="text-xs text-blue-300 font-bold">زمن التوصيل المتوقع (ETA):</p>
                      <p class="text-xl font-black text-white">{{ selectedOrder()?.deliveryEta }}</p>
                    </div>
                  </div>

                  <div class="text-left text-xs space-y-1">
                    <p class="font-bold text-slate-300">طريقة الدفع المطلوبة:</p>
                    <span class="inline-block px-3 py-1 rounded-xl text-xs font-black shadow-md"
                          [ngClass]="selectedOrder()?.paymentMethod === 'فيزا' ? 'bg-indigo-600 text-white' : (selectedOrder()?.paymentMethod === 'محفظة إلكترونية' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-emerald-600 text-white')">
                      {{ selectedOrder()?.paymentMethod === 'فيزا' ? '💳 بطاقة فيزا' : (selectedOrder()?.paymentMethod === 'محفظة إلكترونية' ? '📱 محفظة إلكترونية' : '💵 كاش عند التسليم') }}
                    </span>
                  </div>
                </div>

                <!-- Customer Notes -->
                <div class="p-3 bg-amber-950/40 rounded-xl border border-amber-800/50 text-xs text-amber-200">
                  <span class="font-bold block mb-1">ملاحظات العميل الخاصة للتوصيل:</span>
                  <p>{{ selectedOrder()?.notes || 'لا توجد ملاحظات خاصة مدونة' }}</p>
                </div>
              </div>
            </div>

            <!-- Electronic Invoice Breakdown -->
            <div class="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-4">
              <h4 class="font-black text-slate-900 dark:text-white text-base">معاينة الفاتورة الإلكترونية للطلب</h4>

              <div class="space-y-2 text-xs">
                <div *ngFor="let item of selectedOrder()?.items" class="flex justify-between items-center py-1.5 border-b border-slate-200 dark:border-slate-700">
                  <span class="font-bold text-slate-800 dark:text-white">{{ item.product.name }} (×{{ item.quantity }})</span>
                  <span class="font-black text-emerald-600">{{ item.product.price * item.quantity }} ج.م</span>
                </div>
              </div>

              <div class="flex justify-between items-center text-base font-black pt-2">
                <span>إجمالي المبلغ المطلوب تحصيله:</span>
                <span class="text-emerald-600 text-xl">{{ selectedOrder()?.totalPrice }} ج.م</span>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex gap-3">
              <button (click)="service.updateOrderStatus(selectedOrder()!.id, 'completed')" 
                      class="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl text-sm transition-all">
                تأكيد تسليم الطلب واستلام المبلغ
              </button>
            </div>

          </div>
        </div>

      </div>

    </div>
  `
})
export class OmAlQuraDeliveryPortalComponent {
  service = inject(OmAlQuraService);
  toast = inject(ToastService);

  selectedOrder = signal<OmAlQuraOrder | null>(null);

  deliveryOrders = computed(() => {
    return this.service.orders().filter(o => o.orderType === 'delivery' && (o.status === 'pending' || o.status === 'preparing' || o.status === 'on_the_way'));
  });

  constructor() {
    if (this.deliveryOrders().length > 0) {
      this.selectedOrder.set(this.deliveryOrders()[0]);
    }
  }

  printElectronicInvoice() {
    if (this.selectedOrder()) {
      this.service.printThermalReceipt(this.selectedOrder()!);
    } else {
      this.toast.show('يرجى تحديد طلب لمعاينة الفاتورة الإلكترونية والطباعة.', 'warning');
    }
  }
}
