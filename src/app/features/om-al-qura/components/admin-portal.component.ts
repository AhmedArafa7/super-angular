import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { OmAlQuraService, OmAlQuraEmployee } from '../../../core/services/om-al-qura.service';
import { ImageFallbackDirective } from '../../../shared/directives/image-fallback.directive';

@Component({
  selector: 'app-om-al-qura-admin-portal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideDynamicIcon],
  template: `
    <div class="space-y-8 font-sans" dir="rtl">
      
      <!-- Admin Header Stats -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-6 border border-slate-800 shadow-xl">
          <p class="text-xs text-slate-400 font-bold mb-1">إجمالي الموظفين</p>
          <h3 class="text-3xl font-black text-white">{{ service.employees().length }}</h3>
          <p class="text-[11px] text-emerald-400 mt-2 font-bold">{{ activeEmployeesCount() }} موظف نشط علي العمل</p>
        </div>

        <div class="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-6 border border-slate-800 shadow-xl">
          <p class="text-xs text-slate-400 font-bold mb-1">إجمالي الرواتب الشهرية</p>
          <h3 class="text-3xl font-black text-emerald-400">{{ totalSalaries() }} <span class="text-sm font-normal text-white">ج.م</span></h3>
          <p class="text-[11px] text-slate-400 mt-2">كشف مستحقات هذا الشهر</p>
        </div>

        <div class="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-6 border border-slate-800 shadow-xl">
          <p class="text-xs text-slate-400 font-bold mb-1">إجمالي الساعات المنجزة</p>
          <h3 class="text-3xl font-black text-amber-400">{{ totalWorkingHours() }} <span class="text-sm font-normal text-white">ساعة</span></h3>
          <p class="text-[11px] text-slate-400 mt-2">عبر كافة ورديات الموظفين</p>
        </div>

        <div class="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-6 border border-slate-800 shadow-xl">
          <p class="text-xs text-slate-400 font-bold mb-1">تنبيهات المخزون الحرج</p>
          <h3 class="text-3xl font-black text-rose-500">{{ lowOrZeroStockProducts().length }}</h3>
          <p class="text-[11px] text-rose-400 mt-2 font-bold">منتجات تحتاج إعادة شراء فوري</p>
        </div>
      </div>

      <!-- SECTION 1: Staff HR & Payroll Table + Manager Actions -->
      <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div class="flex flex-wrap justify-between items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                صلاحيات المدير الإداري
              </span>
            </div>
            <h2 class="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 mt-1">
              <svg lucideIcon="users" class="w-6 h-6 text-emerald-600"></svg>
              <span>توظيف عمال جداد وسجلات الموظفين والرواتب (HR)</span>
            </h2>
            <p class="text-xs text-slate-500 mt-1">المدير هو المسؤول عن توظيف عمال جدد، تعديل الرواتب، وإلغاء/حذف الموظفين من المتجر.</p>
          </div>

          <div class="flex items-center gap-3">
            <button (click)="showHireModal.set(true)"
                    class="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md transition-all flex items-center gap-2">
              <svg lucideIcon="user-plus" class="w-5 h-5"></svg>
              <span>+ توظيف عامل جديد</span>
            </button>

            <button *ngIf="service.employees().length > 0"
                    (click)="confirmClearAll()"
                    class="px-4 py-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 border border-rose-200 dark:border-rose-900 text-xs font-bold transition-all flex items-center gap-1.5">
              <svg lucideIcon="trash-2" class="w-4 h-4"></svg>
              <span>مسح جميع الموظفين</span>
            </button>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table *ngIf="service.employees().length > 0; else emptyEmployees" class="w-full text-sm text-right">
            <thead class="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
              <tr>
                <th class="p-3 rounded-r-xl">اسم الموظف / العامل</th>
                <th class="p-3">الوظيفة</th>
                <th class="p-3">الهاتف</th>
                <th class="p-3">الراتب الشهري</th>
                <th class="p-3">ساعات العمل هذا الشهر</th>
                <th class="p-3">رصيد الإجازات المستهلك</th>
                <th class="p-3">حالة الحساب</th>
                <th class="p-3 rounded-l-xl">إجراءات المدير</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              <tr *ngFor="let emp of service.employees()" [ngClass]="{'bg-rose-50/50 dark:bg-rose-950/20': emp.isSuspended}">
                <td class="p-3 font-black text-slate-900 dark:text-white">{{ emp.name }}</td>
                <td class="p-3">
                  <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {{ emp.role }}
                  </span>
                </td>
                <td class="p-3 font-mono dir-ltr text-right text-slate-500">{{ emp.phone }}</td>
                <td class="p-3 font-black text-emerald-600 dark:text-emerald-400 text-base">{{ emp.salary }} ج.م</td>
                <td class="p-3 font-bold text-slate-800 dark:text-white">{{ emp.workingHoursThisMonth }} ساعة</td>
                <td class="p-3 text-slate-600 dark:text-slate-400">{{ emp.holidaysTaken }} أيام</td>
                <td class="p-3">
                  <span class="px-2.5 py-1 rounded-full text-xs font-black"
                        [ngClass]="emp.isSuspended ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'">
                    {{ emp.isSuspended ? 'حساب موقوف' : 'نشط بالخدمة' }}
                  </span>
                </td>
                <td class="p-3 flex items-center gap-2">
                  <button (click)="service.toggleSuspendEmployee(emp.id)"
                          class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs"
                          [ngClass]="emp.isSuspended ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-amber-600 hover:bg-amber-700 text-white'">
                    {{ emp.isSuspended ? 'إعادة تفعيل' : 'إيقاف مؤقت' }}
                  </button>

                  <button (click)="service.deleteEmployee(emp.id)"
                          title="حذف الموظف نهائياً"
                          class="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-xs flex items-center gap-1">
                    <svg lucideIcon="trash-2" class="w-3.5 h-3.5"></svg>
                    <span>حذف</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>

          <ng-template #emptyEmployees>
            <div class="text-center py-12 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 space-y-3">
              <div class="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <svg lucideIcon="users" class="w-8 h-8"></svg>
              </div>
              <h3 class="font-black text-slate-800 dark:text-white text-lg">لا يوجد موظفون أو عمال مسجلون حالياً</h3>
              <p class="text-xs text-slate-500 max-w-md mx-auto">تم حذف الموظفين السابقين. يمكنك الآن بصفتك المدير توظيف عمال وموظفين جدد بالنقر على زر "+ توظيف عامل جديد".</p>
              <button (click)="showHireModal.set(true)" class="px-6 py-2.5 rounded-2xl bg-emerald-600 text-white font-black text-sm shadow-md hover:bg-emerald-700 transition-all inline-flex items-center gap-2 mt-2">
                <svg lucideIcon="user-plus" class="w-4 h-4"></svg>
                <span>توظيف أول عامل جديد</span>
              </button>
            </div>
          </ng-template>
        </div>
      </div>

      <!-- SECTION 2: Inventory Alerts (Low Stock & Out of Stock) -->
      <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h2 class="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <svg lucideIcon="alert-circle" class="w-6 h-6 text-rose-600"></svg>
          <span>قائمة المنتجات المنتهية وقليلة المخزون (Low Stock & Out of Stock)</span>
        </h2>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div *ngFor="let p of lowOrZeroStockProducts()" class="p-4 rounded-2xl border bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 flex gap-3 items-center">
            <img [src]="p.imageUrl" [alt]="p.name" appImageFallback class="w-16 h-16 rounded-xl object-cover shrink-0">
            <div class="flex-1 min-w-0">
              <h4 class="font-black text-slate-900 dark:text-white text-sm truncate">{{ p.name }}</h4>
              <p class="text-xs text-slate-500">مكان التخزين: {{ p.locationInStore }}</p>
              
              <div class="flex items-center justify-between mt-2">
                <span class="text-xs font-black" [ngClass]="p.stockQuantity === 0 ? 'text-rose-600' : 'text-amber-600'">
                  المتبقي: {{ p.stockQuantity }} قطعة
                </span>
                <span *ngIf="p.expectedRestockDate" class="text-[10px] text-slate-400">إعادة شراء: {{ p.expectedRestockDate }}</span>
              </div>
            </div>
          </div>

          <div *ngIf="lowOrZeroStockProducts().length === 0" class="col-span-full text-center py-8 text-slate-400 text-sm">
            ممتاز! جميع المنتجات متوفرة وتزيد عن حد الأمان للمخزون
          </div>
        </div>
      </div>

      <!-- MODAL: Hire New Worker (حصرية للمدير) -->
      <div *ngIf="showHireModal()" class="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6 font-sans">
          <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <svg lucideIcon="user-plus" class="w-6 h-6"></svg>
              </div>
              <div>
                <h3 class="text-lg font-black text-slate-900 dark:text-white">توظيف عامل / موظف جديد</h3>
                <p class="text-xs text-slate-500">خاص بصلاحيات المدير الإداري لمتجر أم القرى</p>
              </div>
            </div>
            <button (click)="showHireModal.set(false)" class="text-slate-400 hover:text-slate-600 p-2 rounded-xl">
              <svg lucideIcon="x" class="w-6 h-6"></svg>
            </button>
          </div>

          <form (ngSubmit)="submitHireForm()" class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">اسم العامل / الموظف ثلاثي *</label>
              <input type="text" [(ngModel)]="newHireName" name="hireName" required
                     placeholder="مثال: أحمد محمود إبراهيم"
                     class="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500">
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">الوظيفة / الدور *</label>
                <select [(ngModel)]="newHireRole" name="hireRole"
                        class="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500">
                  <option value="مبيعات">مبيعات / كاشير</option>
                  <option value="أمينات مخزن">أمين/أمينة مخزن</option>
                  <option value="دليفري">عامل توصيل / دليفري</option>
                  <option value="مدير">مدير إداري فرعي</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">رقم الهاتف *</label>
                <input type="text" [(ngModel)]="newHirePhone" name="hirePhone" required dir="ltr"
                       placeholder="010XXXXXXXX"
                       class="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm text-right focus:outline-hidden focus:ring-2 focus:ring-emerald-500">
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">الراتب الشهري المتفق عليه (بالجنيه) *</label>
              <input type="number" [(ngModel)]="newHireSalary" name="hireSalary" required min="0"
                     placeholder="مثال: 6000"
                     class="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500">
            </div>

            <div class="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
              <button type="button" (click)="showHireModal.set(false)"
                      class="px-5 py-2.5 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                إلغاء
              </button>
              <button type="submit"
                      class="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md transition-all flex items-center gap-2">
                <svg lucideIcon="check" class="w-4 h-4"></svg>
                <span>إتمام التوظيف والإضافة</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- SECTION 2: Delivery Drivers Management (سائقي الدليفري والتوصيل) -->
      <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div class="flex flex-wrap justify-between items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 class="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <svg lucideIcon="truck" class="w-6 h-6 text-blue-600"></svg>
              <span>إدارة وتعيين طاقم سائقي ومندوبي التوصيل (الدليفري)</span>
            </h2>
            <p class="text-xs text-slate-500 mt-1">تحديد ومتابعة سائقي المتجر وتحديد مواعيد الدوام وتوزيع الطلبات.</p>
          </div>

          <button (click)="showHireDriverModal.set(true)"
                  class="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-md transition-all flex items-center gap-2">
            <svg lucideIcon="plus" class="w-5 h-5"></svg>
            <span>+ تعيين سائق دليفري جديد</span>
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div *ngFor="let drv of service.deliveryDrivers()" class="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex flex-col justify-between space-y-3">
            <div>
              <div class="flex justify-between items-center">
                <h3 class="font-black text-slate-900 dark:text-white text-base">{{ drv.name }}</h3>
                <span class="px-2.5 py-0.5 rounded-full text-xs font-bold"
                      [ngClass]="drv.status === 'متاح' ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'">
                  {{ drv.status }}
                </span>
              </div>
              <p class="text-xs text-slate-500 mt-1">الهاتف: <span class="font-mono font-bold text-slate-800 dark:text-white dir-ltr">{{ drv.phone }}</span></p>
              <p class="text-xs text-slate-500">الدوام: {{ drv.workingHoursInfo }}</p>
            </div>

            <div class="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
              <span class="text-xs text-slate-600 dark:text-slate-400 font-bold">الطلبات النشطة: {{ drv.activeDeliveriesCount }}</span>
              <button (click)="service.deleteDeliveryDriver(drv.id)" class="px-3 py-1 bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold hover:bg-rose-200">
                حذف السائق
              </button>
            </div>
          </div>

          <div *ngIf="service.deliveryDrivers().length === 0" class="col-span-full py-8 text-center text-slate-400 text-xs font-bold bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
            لم يتم تعيين أي سائقين أو مندوبي توصيل بالفرع حتى الآن
          </div>
        </div>
      </div>

      <!-- HIRE DRIVER MODAL -->
      <div *ngIf="showHireDriverModal()" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full font-sans dir-rtl space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
          <div class="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 class="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <svg lucideIcon="truck" class="w-5 h-5 text-blue-600"></svg>
              <span>تعيين سائق توصيل جديد</span>
            </h3>
            <button (click)="showHireDriverModal.set(false)" class="text-slate-400 hover:text-slate-600">
              <svg lucideIcon="x" class="w-5 h-5"></svg>
            </button>
          </div>

          <form (ngSubmit)="submitHireDriverForm()" class="space-y-4 text-xs">
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">اسم السائق *</label>
              <input type="text" [(ngModel)]="newDriverName" name="drvName" required placeholder="مثال: محمود عبد السلام"
                     class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white">
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">رقم الهاتف *</label>
              <input type="tel" [(ngModel)]="newDriverPhone" name="drvPhone" required dir="ltr" placeholder="010XXXXXXXX"
                     class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white text-right">
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">ساعات والدوام المتفق عليه</label>
              <input type="text" [(ngModel)]="newDriverShift" name="drvShift" placeholder="من 8 ص حتى 5 م"
                     class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white">
            </div>

            <div class="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <button type="button" (click)="showHireDriverModal.set(false)" class="px-4 py-2 rounded-2xl text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800">
                إلغاء
              </button>
              <button type="submit" [disabled]="!newDriverName || !newDriverPhone"
                      class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl text-xs disabled:opacity-40 shadow-md">
                تعيين وسحب الكارت
              </button>
            </div>
          </form>
        </div>
      </div>

    </div>
  `
})
export class OmAlQuraAdminPortalComponent {
  service = inject(OmAlQuraService);

  showHireModal = signal(false);
  newHireName = '';
  newHireRole: OmAlQuraEmployee['role'] = 'مبيعات';
  newHirePhone = '';
  newHireSalary: number | null = null;

  activeEmployeesCount = computed(() => {
    return this.service.employees().filter(e => !e.isSuspended).length;
  });

  totalSalaries = computed(() => {
    return this.service.employees().filter(e => !e.isSuspended).reduce((acc, e) => acc + e.salary, 0);
  });

  totalWorkingHours = computed(() => {
    return this.service.employees().reduce((acc, e) => acc + e.workingHoursThisMonth, 0);
  });

  lowOrZeroStockProducts = computed(() => {
    return this.service.products().filter(p => p.stockQuantity <= 5);
  });

  submitHireForm() {
    if (!this.newHireName || !this.newHirePhone || !this.newHireSalary) {
      alert('يرجى ملء جميع الحقول المطلوبة للتوظيف.');
      return;
    }

    this.service.addEmployee({
      name: this.newHireName,
      role: this.newHireRole,
      phone: this.newHirePhone,
      salary: this.newHireSalary
    });

    this.newHireName = '';
    this.newHireRole = 'مبيعات';
    this.newHirePhone = '';
    this.newHireSalary = null;
    this.showHireModal.set(false);
  }

  confirmClearAll() {
    if (confirm('هل أنت تأكد كمدير من حذف جميع الموظفين نهائياً من النظام؟')) {
      this.service.clearAllEmployees();
    }
  }

  // Delivery Driver Hiring State & Action
  showHireDriverModal = signal(false);
  newDriverName = '';
  newDriverPhone = '';
  newDriverShift = 'من 8:00 صباحاً حتى 5:00 مساءً';

  submitHireDriverForm() {
    if (!this.newDriverName || !this.newDriverPhone) return;

    this.service.addDeliveryDriver({
      name: this.newDriverName,
      phone: this.newDriverPhone,
      status: 'متاح',
      workingHoursInfo: this.newDriverShift || 'دوام كامل'
    });

    this.newDriverName = '';
    this.newDriverPhone = '';
    this.newDriverShift = 'من 8:00 صباحاً حتى 5:00 مساءً';
    this.showHireDriverModal.set(false);
  }
}
