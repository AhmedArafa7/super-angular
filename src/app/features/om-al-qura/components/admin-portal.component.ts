import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { OmAlQuraService, OmAlQuraEmployee, OmAlQuraAisleConfig, OmAlQuraProduct, OmAlQuraSupplier, OmAlQuraPurchaseOrderItem } from '../../../core/services/om-al-qura.service';
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

      <!-- SECTION 0: Daily Attendance Code (Manager Only) -->
      <div class="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-emerald-400/30 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <div class="flex items-center gap-2 mb-2 flex-wrap">
            <span class="px-3 py-1 rounded-full text-xs font-black bg-black/20 text-emerald-50 border border-white/20">
              خاص بالمدير فقط
            </span>
            <span class="px-3 py-1 rounded-full text-xs font-black bg-amber-400 text-amber-950 flex items-center gap-1 shadow-sm">
              <svg lucideIcon="timer" class="w-3.5 h-3.5"></svg>
              يتغير تلقائياً كل 5 دقائق
            </span>
          </div>
          <h2 class="text-2xl font-black text-white flex items-center gap-2">
            <svg lucideIcon="shield-check" class="w-7 h-7"></svg>
            <span>كود الحضور للموظفين (متغير كل 5 دقائق)</span>
          </h2>
          <p class="text-xs text-emerald-100 mt-2 leading-relaxed">
            أعطِ هذا الكود للموظفين المتواجدين فعلياً في المتجر. الكود يتغير تلقائياً كل 5 دقائق،
            ولا يمكن لأي موظف تسجيل حضور أو انصراف من خارج المتجر بدونه.
          </p>
          <p class="text-xs text-amber-200 mt-2 font-bold flex items-center gap-1.5 bg-black/20 w-fit px-3 py-1 rounded-lg border border-amber-300/30">
            <svg lucideIcon="clock" class="w-4 h-4 text-amber-300 animate-spin" style="animation-duration: 4s;"></svg>
            يتجدد الكود بعد: <span class="font-mono text-amber-300 text-sm font-black" dir="ltr">{{ service.attendanceCodeTimeRemaining() }}</span>
          </p>
        </div>

        <div class="text-center bg-black/25 border border-white/20 rounded-3xl px-10 py-6 backdrop-blur-md">
          <p class="text-[11px] font-bold text-emerald-100 uppercase tracking-widest mb-2">الكود الحالي (5 دقائق)</p>
          <div class="text-5xl font-black tracking-[0.35em] font-mono text-white select-all" dir="ltr">{{ service.dailyAttendanceCode() }}</div>
          <button (click)="copyDailyCode()"
                  class="mt-4 px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs transition-all flex items-center gap-1.5 mx-auto">
            <svg lucideIcon="copy" class="w-4 h-4"></svg>
            <span>{{ codeCopied ? 'تم النسخ ✅' : 'نسخ الكود' }}</span>
          </button>
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

      <!-- SECTION 3: Store Layout Sketch & Aisle Customization (تسمية الرفوف والممرات) -->
      <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div class="flex flex-wrap justify-between items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 class="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <svg lucideIcon="map-pin" class="w-6 h-6 text-indigo-600"></svg>
              <span>تعديل التخطيط الكروكي للمحل وتسمية الممرات والرفوف</span>
            </h2>
            <p class="text-xs text-slate-500 mt-1">تحديد أسماء الممرات، الرفوف، المدخل الرئيسي، وملاحظات المشي للعملاء والموظفين.</p>
          </div>

          <button (click)="openLayoutModal()"
                  class="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm shadow-md transition-all flex items-center gap-2">
            <svg lucideIcon="edit-3" class="w-5 h-5"></svg>
            <span>تعديل الخريطة الكروكية والممرات</span>
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
            <span class="text-slate-400 font-bold">المدخل الرئيسي:</span>
            <p class="font-black text-slate-900 dark:text-white text-sm">{{ service.storeLayout().storeEntranceLabel }}</p>
          </div>

          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
            <span class="text-slate-400 font-bold">منطقة الكاشير:</span>
            <p class="font-black text-slate-900 dark:text-white text-sm">{{ service.storeLayout().checkoutAreaLabel }}</p>
          </div>

          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
            <span class="text-slate-400 font-bold">المخزن الخلفي:</span>
            <p class="font-black text-slate-900 dark:text-white text-sm">{{ service.storeLayout().warehouseAreaLabel }}</p>
          </div>
        </div>

        <div class="space-y-2">
          <h4 class="font-black text-xs text-slate-800 dark:text-white">الممرات والرفوف المسجلة بالفرع حالياً:</h4>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div *ngFor="let aisle of service.storeLayout().aisles" class="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 space-y-2">
              <h5 class="font-black text-indigo-900 dark:text-indigo-300 text-sm">{{ aisle.name }}</h5>
              <div class="text-[11px] text-slate-600 dark:text-slate-400">
                <span class="font-bold">الرفوف:</span> {{ aisle.shelves.join(' • ') }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- SECTION 4: Low-Stock Automated Alerts & Supplier Purchase Orders Center -->
      <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div class="flex flex-wrap justify-between items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <svg lucideIcon="alert-triangle" class="w-6 h-6 text-amber-500"></svg>
                <span>مركز التنبيه الآلي للمخزون وطلبات الشراء للموردين</span>
              </h2>
              <span *ngIf="service.lowStockProducts().length > 0" class="px-3 py-1 rounded-full bg-rose-600 text-white font-black text-xs animate-pulse">
                {{ service.lowStockProducts().length }} أصناف حرجة
              </span>
            </div>
            <p class="text-xs text-slate-500 mt-1">تتبع التنبيهات الآلية للمخزون النافذ وإصدار أوامر الشراء المباشرة للموردين عبر الواتساب.</p>
          </div>

          <div class="flex items-center gap-2">
            <button (click)="openAddSupplierModal.set(true)"
                    class="px-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-200 transition-all flex items-center gap-1.5">
              <svg lucideIcon="plus" class="w-4 h-4"></svg>
              <span>+ إضافة مورد جديد</span>
            </button>
            <button (click)="openCreatePoModal()"
                    class="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm shadow-md transition-all flex items-center gap-2">
              <svg lucideIcon="shopping-cart" class="w-5 h-5"></svg>
              <span>+ إنشاء أمر شراء بضاعة</span>
            </button>
          </div>
        </div>

        <!-- LOW STOCK ALERT PRODUCTS GRID -->
        <div class="space-y-3">
          <h4 class="font-black text-xs text-slate-800 dark:text-white flex items-center gap-1.5">
            <svg lucideIcon="flame" class="w-4 h-4 text-rose-500 animate-bounce"></svg>
            <span>أصناف على وشك النفاد (5 قطع أو أقل):</span>
          </h4>

          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div *ngFor="let prod of service.lowStockProducts()" 
                 class="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700/60 flex justify-between items-center gap-3">
              <div>
                <h5 class="font-black text-slate-900 dark:text-white text-xs sm:text-sm">{{ prod.name }}</h5>
                <p class="text-[11px] text-slate-500 mt-0.5">القسم: {{ prod.category }}</p>
                <div class="mt-2 inline-flex items-center gap-1 text-[11px] font-black text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/60 px-2 py-0.5 rounded-full">
                  🔥 المتبقي: {{ prod.stockQuantity }} قطعة فقط
                </div>
              </div>

              <button (click)="openCreatePoForSingleProduct(prod)" 
                      class="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl shadow-xs transition-all shrink-0">
                طلب توريد
              </button>
            </div>

            <div *ngIf="service.lowStockProducts().length === 0" class="col-span-full p-6 text-center text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800">
              ✓ ممتازة! جميع المنتجات والمنظفات بالمتجر متوفرة بمخزون كافٍ كحد أدنى.
            </div>
          </div>
        </div>

        <!-- SUPPLIERS DIRECTORY -->
        <div class="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div class="flex items-center justify-between gap-4">
            <h4 class="font-black text-xs text-slate-800 dark:text-white">سجل شركات الموردين المسجلين:</h4>
            <button (click)="openAddSupplierModal.set(true)" type="button"
                    class="px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer">
              <svg lucideIcon="plus-circle" class="w-4 h-4"></svg>
              <span>+ إضافة شركة توريد جديدة</span>
            </button>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div *ngFor="let supp of service.suppliers()" class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-3">
              <div>
                <div class="flex justify-between items-start">
                  <h5 class="font-black text-slate-900 dark:text-white text-sm">{{ supp.name }}</h5>
                  <button (click)="service.deleteSupplier(supp.id)" class="text-rose-500 hover:text-rose-700 p-1">
                    <svg lucideIcon="trash-2" class="w-4 h-4"></svg>
                  </button>
                </div>
                <p class="text-xs text-slate-500 mt-1">الشركة: <span class="font-bold text-slate-700 dark:text-slate-300">{{ supp.companyName }}</span></p>
                <p class="text-xs text-slate-500">الهاتف: <span class="font-mono font-bold text-slate-900 dark:text-white dir-ltr">{{ supp.phone }}</span></p>
                <div class="mt-2 text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                  الأقسام الموردة: {{ supp.suppliedCategories.join(' ، ') }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ADD SUPPLIER MODAL DIALOG -->
        <div *ngIf="openAddSupplierModal()" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 max-w-lg w-full font-sans dir-rtl space-y-5 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div class="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 class="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <svg lucideIcon="truck" class="w-5 h-5 text-emerald-600 dark:text-emerald-400"></svg>
                <span>إضافة شركة / مورد جديد للشراء والتوريد</span>
              </h3>
              <button (click)="openAddSupplierModal.set(false)" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl">
                <svg lucideIcon="x" class="w-5 h-5"></svg>
              </button>
            </div>

            <form (ngSubmit)="submitAddSupplierForm()" class="space-y-4 text-xs">
              <div>
                <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">اسم الشركة / المصنع المورد *</label>
                <input type="text" [(ngModel)]="newSupplierCompany" name="suppCompanyName" required
                       placeholder="مثال: شركة النيل للمنظفات / مصنع الأهرام للبلاستيك"
                       class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500">
              </div>

              <div>
                <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">اسم المندوب / المسؤول المباشر *</label>
                <input type="text" [(ngModel)]="newSupplierName" name="suppName" required
                       placeholder="مثال: أ/ محمد عبد الرحمن"
                       class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500">
              </div>

              <div>
                <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">رقم الهاتف للاتصال والواتساب *</label>
                <input type="tel" [(ngModel)]="newSupplierPhone" name="suppPhone" required dir="ltr"
                       placeholder="010XXXXXXXX"
                       class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-right font-mono font-bold focus:ring-2 focus:ring-emerald-500">
              </div>

              <div>
                <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">الأقسام والمنتجات الموردة (مفصولة بفاصلة)</label>
                <input type="text" [(ngModel)]="newSupplierCategoriesStr" name="suppCategories"
                       placeholder="مثال: مساحيق غسيل، مطهرات، أدوات نظافة"
                       class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500">
              </div>

              <div class="pt-3 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button type="button" (click)="openAddSupplierModal.set(false)" class="px-5 py-2.5 rounded-2xl text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 text-xs">
                  إلغاء
                </button>
                <button type="submit" [disabled]="!newSupplierCompany || !newSupplierName || !newSupplierPhone"
                        class="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md flex items-center gap-2 cursor-pointer">
                  <svg lucideIcon="check" class="w-4 h-4"></svg>
                  <span>حفظ وتسجيل المورد</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- PURCHASE ORDERS LIST & STATUS -->
        <div class="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <h4 class="font-black text-xs text-slate-800 dark:text-white">أوامر الشراء الصادرة وشحنات التوريد:</h4>

          <div class="space-y-3">
            <div *ngFor="let po of service.purchaseOrders()" class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 flex flex-wrap justify-between items-center gap-4">
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-black text-slate-900 dark:text-white text-sm">أمر شراء #{{ po.id }}</span>
                  <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                        [ngClass]="po.status === 'تم الاستلام وزيادة المخزون' ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-slate-950'">
                    {{ po.status }}
                  </span>
                </div>
                <p class="text-xs text-slate-500 mt-1">المورد: <span class="font-bold text-slate-800 dark:text-white">{{ po.supplierName }}</span> ({{ po.supplierPhone }})</p>
                <div class="text-xs text-slate-600 dark:text-slate-300 font-medium mt-1">
                  الأصناف المطلوبة: <span class="font-bold text-emerald-600">{{ po.items.length }} أصناف</span>
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <a [href]="service.getWhatsAppPoLink(po)" target="_blank"
                   class="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xs transition-all flex items-center gap-1.5">
                  <svg lucideIcon="message-square" class="w-4 h-4"></svg>
                  <span>إرسال بالواتساب للمورد</span>
                </a>

                <button *ngIf="po.status !== 'تم الاستلام وزيادة المخزون'"
                        (click)="service.markPoReceived(po.id)"
                        class="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-xs transition-all flex items-center gap-1.5">
                  <svg lucideIcon="check-circle" class="w-4 h-4"></svg>
                  <span>تم استلام الشحنة وتزويد المخزون</span>
                </button>
              </div>
            </div>

            <div *ngIf="service.purchaseOrders().length === 0" class="p-6 text-center text-xs text-slate-400 font-bold bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700">
              لا توجد أوامر شراء صادر حالياً. اضغط على "+ إنشاء أمر شراء بضاعة".
            </div>
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

      <!-- STORE LAYOUT EDITOR MODAL -->
      <div *ngIf="openLayoutEditorModal()" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-xl w-full font-sans dir-rtl space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
          
          <div class="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 class="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <svg lucideIcon="map" class="w-5 h-5 text-indigo-600"></svg>
              <span>تعديل الرسم الكروكي وأسماء الممرات والرفوف</span>
            </h3>
            <button (click)="openLayoutEditorModal.set(false)" class="text-slate-400 hover:text-slate-600">
              <svg lucideIcon="x" class="w-5 h-5"></svg>
            </button>
          </div>

          <form (ngSubmit)="saveLayoutForm()" class="space-y-4 text-xs">
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">اسم المدخل الرئيسي للفرع</label>
              <input type="text" [(ngModel)]="editEntrance" name="editEntrance" class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white">
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">اسم منطقة الكاشير والاستقبال</label>
              <input type="text" [(ngModel)]="editCheckout" name="editCheckout" class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white">
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">اسم منطقة المخزن الداخلي</label>
              <input type="text" [(ngModel)]="editWarehouse" name="editWarehouse" class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white">
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">الرسم الكروكي التوضيحي للمحل (صورة أو رسم مباشر)</label>
              
              <div class="flex flex-wrap items-center gap-2 mb-2">
                <button type="button" (click)="openInteractiveCanvas()"
                        class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all">
                  <svg lucideIcon="pen-tool" class="w-4 h-4"></svg>
                  <span>رسم كروكي المحل بالموس/اللمس 🎨</span>
                </button>

                <label class="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs cursor-pointer flex items-center gap-2 transition-all">
                  <svg lucideIcon="upload" class="w-4 h-4 text-indigo-500"></svg>
                  <span>رفع صورة مخطط من الجهاز</span>
                  <input type="file" (change)="onFileSelectedForSketch($event)" accept="image/*" class="hidden">
                </label>
              </div>

              <!-- Sketch Image Preview -->
              <div *ngIf="editSketchUrl" class="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-950 p-1 mt-2">
                <img [src]="editSketchUrl" alt="معاينة الرسم الكروكي" class="w-full h-36 object-contain">
                <button type="button" (click)="editSketchUrl = ''" class="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-rose-700">
                  <svg lucideIcon="trash-2" class="w-4 h-4"></svg>
                </button>
              </div>
            </div>

            <div class="space-y-3 pt-2">
              <div class="flex justify-between items-center">
                <label class="font-black text-slate-800 dark:text-white">الممرات والرفوف التابعة لها:</label>
                <button type="button" (click)="addNewAisleRow()" class="px-3 py-1 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-xl font-bold text-xs">
                  + إضافة ممر جديد
                </button>
              </div>

              <div *ngFor="let aisle of editAisles; let i = index" class="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div class="flex justify-between items-center gap-2">
                  <input type="text" [(ngModel)]="aisle.name" [name]="'aisleName_' + i" placeholder="اسم الممر وتصنيفه..." class="flex-1 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white">
                  <button type="button" (click)="removeAisleRow(i)" class="text-rose-500 hover:text-rose-700 p-1">
                    <svg lucideIcon="trash-2" class="w-4 h-4"></svg>
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">ملاحظات توجيه الزبائن والموظفين</label>
              <textarea [(ngModel)]="editNotes" name="editNotes" rows="2" class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"></textarea>
            </div>

            <div class="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <button type="button" (click)="openLayoutEditorModal.set(false)" class="px-4 py-2 rounded-2xl text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800">
                إلغاء
              </button>
              <button type="submit" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl text-xs shadow-md">
                حفظ وتعميم الخريطة الكروكية
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- INTERACTIVE SKETCH CANVAS DRAWING MODAL -->
      <div *ngIf="showCanvasDrawer()" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
        <div class="bg-slate-900 rounded-3xl p-6 max-w-2xl w-full font-sans dir-rtl space-y-4 border border-slate-800 shadow-2xl">
          <div class="flex justify-between items-center border-b border-slate-800 pb-3">
            <div class="flex items-center gap-2">
              <div class="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <svg lucideIcon="pen-tool" class="w-5 h-5"></svg>
              </div>
              <h3 class="text-base font-black text-white">رسم وتصاميم خريطة المحل الكروكية المباشرة</h3>
            </div>
            <button (click)="showCanvasDrawer.set(false)" class="text-slate-400 hover:text-white p-1">
              <svg lucideIcon="x" class="w-5 h-5"></svg>
            </button>
          </div>

          <!-- Drawing Toolbar -->
          <div class="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-3 text-xs text-white">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex flex-wrap items-center gap-1.5">
                <span class="text-slate-400 font-bold ml-1">أداة الرسم:</span>
                
                <button (click)="activeTool = 'line'" type="button"
                        class="px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5"
                        [ngClass]="activeTool === 'line' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'">
                  <svg lucideIcon="minus" class="w-4 h-4"></svg>
                  <span>📏 خط مستقيم</span>
                </button>

                <button (click)="activeTool = 'rect'" type="button"
                        class="px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5"
                        [ngClass]="activeTool === 'rect' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'">
                  <svg lucideIcon="square" class="w-4 h-4"></svg>
                  <span>⏹️ رف / مستطيل</span>
                </button>

                <button (click)="activeTool = 'pencil'" type="button"
                        class="px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5"
                        [ngClass]="activeTool === 'pencil' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'">
                  <svg lucideIcon="pencil" class="w-4 h-4"></svg>
                  <span>✏️ قلم حر</span>
                </button>

                <button (click)="activeTool = 'text'" type="button"
                        class="px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5"
                        [ngClass]="activeTool === 'text' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'">
                  <svg lucideIcon="type" class="w-4 h-4"></svg>
                  <span>🔤 كتابة نص</span>
                </button>

                <button (click)="activeTool = 'eraser'" type="button"
                        class="px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5"
                        [ngClass]="activeTool === 'eraser' ? 'bg-rose-600 text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'">
                  <svg lucideIcon="eraser" class="w-4 h-4"></svg>
                  <span>🧹 ممحاة</span>
                </button>
              </div>

              <button (click)="undoLastAction()" type="button" [disabled]="undoHistory.length <= 1" class="px-3 py-1.5 bg-indigo-950/70 hover:bg-indigo-900 text-indigo-300 disabled:opacity-40 disabled:cursor-not-allowed font-bold rounded-xl border border-indigo-800/60 transition-all flex items-center gap-1 cursor-pointer">
                <span>↩️ تراجع خطوة (Undo)</span>
              </button>

              <button (click)="clearCanvas()" type="button" class="px-3 py-1.5 bg-rose-950/70 hover:bg-rose-900 text-rose-300 font-bold rounded-xl border border-rose-800/60 transition-all flex items-center gap-1">
                <svg lucideIcon="rotate-ccw" class="w-3.5 h-3.5"></svg>
                <span>مسح وإعادة الرسم</span>
              </button>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
              <div class="flex items-center gap-2">
                <span class="text-slate-400 font-bold">اللون:</span>
                <button *ngFor="let c of ['#fbbf24', '#10b981', '#6366f1', '#f43f5e', '#ffffff', '#38bdf8', '#94a3b8']"
                        type="button"
                        (click)="brushColor = c"
                        class="w-6 h-6 rounded-full border-2 transition-transform cursor-pointer"
                        [style.backgroundColor]="c"
                        [ngClass]="brushColor === c ? 'scale-125 border-amber-400' : 'border-slate-700 opacity-80'"></button>
              </div>

              <div class="flex items-center gap-2">
                <span class="text-slate-400 font-bold">سُمك الخط:</span>
                <button *ngFor="let s of [2, 4, 8, 12]" type="button" (click)="brushSize = s"
                        class="w-7 h-7 rounded-xl bg-slate-800 flex items-center justify-center font-bold"
                        [ngClass]="brushSize === s ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-300'">
                  {{ s }}
                </button>
              </div>
            </div>
          </div>

          <!-- HTML5 Canvas Container -->
          <div class="relative rounded-2xl overflow-hidden border-2 border-slate-700 bg-slate-950 flex justify-center items-center">
            <canvas id="storeSketchCanvas" 
                    width="640" 
                    height="380" 
                    (mousedown)="startDrawing($event)" 
                    (mousemove)="draw($event)" 
                    (mouseup)="stopDrawing()" 
                    (mouseleave)="stopDrawing()"
                    (touchstart)="startDrawing($event)" 
                    (touchmove)="draw($event)" 
                    (touchend)="stopDrawing()"
                    class="touch-none cursor-crosshair bg-slate-950 block w-full h-[340px] sm:h-[380px]"></canvas>
          </div>

          <div class="flex justify-between items-center pt-2">
            <p class="text-[11px] text-slate-400 font-medium">💡 ارسم أماكن الممرات والرفوف والمدخل بأصابعك أو الماوس ثم اضغط حفظ.</p>
            
            <div class="flex gap-2">
              <button (click)="showCanvasDrawer.set(false)" class="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs">
                إلغاء
              </button>
              <button (click)="saveCanvasDrawing()" class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all flex items-center gap-1.5">
                <svg lucideIcon="check" class="w-4 h-4"></svg>
                <span>اعتماد وتثبيت الرسم الكروكي</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ADD SUPPLIER MODAL -->
      <div *ngIf="openAddSupplierModal()" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full font-sans dir-rtl space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
          <div class="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 class="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <svg lucideIcon="truck" class="w-5 h-5 text-indigo-600"></svg>
              <span>تسجيل شركة مورد جديد</span>
            </h3>
            <button (click)="openAddSupplierModal.set(false)" class="text-slate-400 hover:text-slate-600">
              <svg lucideIcon="x" class="w-5 h-5"></svg>
            </button>
          </div>

          <form (ngSubmit)="submitAddSupplierForm()" class="space-y-4 text-xs">
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">اسم المورد / المسؤول *</label>
              <input type="text" [(ngModel)]="newSupplierName" name="suppName" required placeholder="مثال: المهندس أحمد النيل"
                     class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white">
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">اسم الشركة / المصنع *</label>
              <input type="text" [(ngModel)]="newSupplierCompany" name="suppComp" required placeholder="مثال: النيل للمنظفات والمطهرات"
                     class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white">
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">رقم هاتف المورد (واتساب التوريد) *</label>
              <input type="tel" [(ngModel)]="newSupplierPhone" name="suppPhone" required dir="ltr" placeholder="010XXXXXXXX"
                     class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white text-right">
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">الأقسام التي يوردها (مفصولة بفاصلة)</label>
              <input type="text" [(ngModel)]="newSupplierCategoriesStr" name="suppCats" placeholder="مثال: منظفات ومساحيق غسيل ، مطهرات"
                     class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white">
            </div>

            <div class="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <button type="button" (click)="openAddSupplierModal.set(false)" class="px-4 py-2 rounded-2xl text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800">
                إلغاء
              </button>
              <button type="submit" [disabled]="!newSupplierName || !newSupplierPhone"
                      class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl text-xs disabled:opacity-40 shadow-md">
                حفظ وتسجيل المورد
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- CREATE PURCHASE ORDER MODAL -->
      <div *ngIf="showPoModal()" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full font-sans dir-rtl space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[85vh] flex flex-col">
          <div class="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <h3 class="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <svg lucideIcon="shopping-cart" class="w-5 h-5 text-amber-500"></svg>
              <span>إنشاء وتوجيه أمر شراء بضاعة للمورد</span>
            </h3>
            <button (click)="showPoModal.set(false)" class="text-slate-400 hover:text-slate-600">
              <svg lucideIcon="x" class="w-5 h-5"></svg>
            </button>
          </div>

          <div class="space-y-4 text-xs flex-1 overflow-y-auto custom-scrollbar pr-1">
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">اختر المورد المستهدف *</label>
              <select [(ngModel)]="selectedPoSupplierId" class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white">
                <option value="">-- اختر شركة توريد --</option>
                <option *ngFor="let s of service.suppliers()" [value]="s.id">{{ s.name }} ({{ s.companyName }})</option>
              </select>
            </div>

            <div class="space-y-2">
              <label class="block font-bold text-slate-700 dark:text-slate-300">حدد الأصناف والكميات المطلوبة من المورد *</label>
              
              <div class="space-y-2 max-h-56 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-2xl p-3 bg-slate-50 dark:bg-slate-800/50">
                <div *ngFor="let prod of service.products()" class="flex justify-between items-center gap-3 p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div>
                    <span class="font-bold text-slate-900 dark:text-white text-xs block">{{ prod.name }}</span>
                    <span class="text-[10px] text-slate-400">المخزون الحالي: {{ prod.stockQuantity }}</span>
                  </div>

                  <div class="flex items-center gap-2">
                    <span class="text-[11px] text-slate-500 font-bold">الكمية:</span>
                    <input type="number" [(ngModel)]="poItemQuantities[prod.id]" min="1" placeholder="مثال: 20"
                           class="w-20 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center font-bold text-slate-900 dark:text-white text-xs">
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">ملاحظات وتعليمات للتسليم بالفرع</label>
              <textarea [(ngModel)]="poNotes" rows="2" placeholder="ملاحظات حول طريقة الشحن، التوريد العاجل، أو مواعيد التسليم..."
                        class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"></textarea>
            </div>
          </div>

          <div class="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800 shrink-0">
            <button type="button" (click)="showPoModal.set(false)" class="px-4 py-2 rounded-2xl text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800">
              إلغاء
            </button>
            <button (click)="submitCreatePo()" [disabled]="!selectedPoSupplierId"
                    class="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-2xl text-xs disabled:opacity-40 shadow-md">
              تأكيد وإنشاء أمر الشراء
            </button>
          </div>

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

  codeCopied = false;
  todayDateLabel = new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  copyDailyCode() {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(this.service.dailyAttendanceCode()).then(() => {
      this.codeCopied = true;
      setTimeout(() => (this.codeCopied = false), 2000);
    });
  }

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

  // Store Layout Sketch Editor State & Actions
  openLayoutEditorModal = signal(false);
  editEntrance = '';
  editCheckout = '';
  editWarehouse = '';
  editNotes = '';
  editSketchUrl = '';
  editAisles: OmAlQuraAisleConfig[] = [];

  openLayoutModal() {
    const layout = this.service.storeLayout();
    this.editEntrance = layout.storeEntranceLabel;
    this.editCheckout = layout.checkoutAreaLabel;
    this.editWarehouse = layout.warehouseAreaLabel;
    this.editNotes = layout.customSketchNotes || '';
    this.editSketchUrl = layout.sketchImageUrl || '';
    this.editAisles = JSON.parse(JSON.stringify(layout.aisles || []));
    this.openLayoutEditorModal.set(true);
  }

  addNewAisleRow() {
    const num = this.editAisles.length + 1;
    this.editAisles.push({
      id: 'aisle-' + Math.random().toString(36).substr(2, 6),
      name: `الممر ${num} (تصنيف جديد)`,
      shelves: ['الرف 1', 'الرف 2', 'الرف 3']
    });
  }

  removeAisleRow(index: number) {
    this.editAisles.splice(index, 1);
  }

  async onFileSelectedForSketch(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const uploadedUrl = await this.service.uploadImageToCloudinary(file);
    if (uploadedUrl) {
      this.editSketchUrl = uploadedUrl;
    }
  }

  // Interactive Canvas Drawing Methods for Store Layout
  // Interactive Canvas Drawing Methods for Store Layout
  showCanvasDrawer = signal(false);
  activeTool: 'line' | 'rect' | 'pencil' | 'text' | 'eraser' = 'line';
  brushColor = '#fbbf24';
  brushSize = 3;
  gridSize = 30;
  isDrawing = false;
  private startX = 0;
  private startY = 0;
  private canvasSnapshot: ImageData | null = null;

  private getSnapPoint(x: number, y: number): { x: number, y: number } {
    const snappedX = Math.round(x / this.gridSize) * this.gridSize;
    const snappedY = Math.round(y / this.gridSize) * this.gridSize;
    return { x: snappedX, y: snappedY };
  }

  private constrainLineToGridAndDiagonals(
    start: { x: number; y: number },
    target: { x: number; y: number }
  ): { x: number; y: number } {
    const dx = target.x - start.x;
    const dy = target.y - start.y;

    if (dx === 0 && dy === 0) return { x: start.x, y: start.y };

    const angle = Math.atan2(dy, dx);
    const sectorAngle = Math.PI / 4; // 45 degrees
    const snappedSector = Math.round(angle / sectorAngle);
    const normalizedSector = ((snappedSector % 8) + 8) % 8;

    const isHorizontal = normalizedSector === 0 || normalizedSector === 4;
    const isVertical = normalizedSector === 2 || normalizedSector === 6;

    const S = this.gridSize;

    if (isHorizontal) {
      const steps = Math.round(Math.abs(dx) / S);
      const dirX = Math.sign(dx) || 1;
      return {
        x: start.x + dirX * steps * S,
        y: start.y
      };
    } else if (isVertical) {
      const steps = Math.round(Math.abs(dy) / S);
      const dirY = Math.sign(dy) || 1;
      return {
        x: start.x,
        y: start.y + dirY * steps * S
      };
    } else {
      // Square diagonal connecting opposite vertices of grid squares (45°, 135°, 225°, 315°)
      const avgDist = (Math.abs(dx) + Math.abs(dy)) / 2;
      const steps = Math.max(1, Math.round(avgDist / S));
      const dirX = Math.sign(dx) || 1;
      const dirY = Math.sign(dy) || 1;
      return {
        x: start.x + dirX * steps * S,
        y: start.y + dirY * steps * S
      };
    }
  }

  undoHistory: ImageData[] = [];

  pushUndoState() {
    const canvas = document.getElementById('storeSketchCanvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    this.undoHistory.push(data);
    if (this.undoHistory.length > 35) this.undoHistory.shift();
  }

  undoLastAction() {
    if (this.undoHistory.length <= 1) return;
    this.undoHistory.pop();
    const prevState = this.undoHistory[this.undoHistory.length - 1];
    const canvas = document.getElementById('storeSketchCanvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx && prevState) {
      ctx.putImageData(prevState, 0, 0);
    }
  }

  openInteractiveCanvas() {
    this.showCanvasDrawer.set(true);
    setTimeout(() => this.initCanvas(), 100);
  }

  initCanvas() {
    const canvas = document.getElementById('storeSketchCanvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    this.undoHistory = [];
    this.clearCanvas();
    this.pushUndoState();

    if (this.editSketchUrl && this.editSketchUrl.startsWith('data:image')) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        this.pushUndoState();
      };
      img.src = this.editSketchUrl;
    }
  }

  startDrawing(event: MouseEvent | TouchEvent) {
    const canvas = document.getElementById('storeSketchCanvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    this.isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in event ? (event as TouchEvent).touches[0].clientX : (event as MouseEvent).clientX;
    const clientY = 'touches' in event ? (event as TouchEvent).touches[0].clientY : (event as MouseEvent).clientY;

    const rawX = (clientX - rect.left) * (canvas.width / rect.width);
    const rawY = (clientY - rect.top) * (canvas.height / rect.height);
    const pt = this.getSnapPoint(rawX, rawY);

    this.startX = pt.x;
    this.startY = pt.y;

    if (this.activeTool === 'text') {
      const text = prompt('اكتب اسم الرف أو الممر أو العلامة على الخريطة:');
      if (text) {
        ctx.fillStyle = this.brushColor;
        ctx.font = `bold ${Math.max(14, this.brushSize * 3)}px sans-serif`;
        ctx.fillText(text, this.startX, this.startY);
        this.pushUndoState();
      }
      this.isDrawing = false;
      return;
    }

    this.canvasSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (this.activeTool === 'pencil' || this.activeTool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(this.startX, this.startY);
    }
  }

  stopDrawing() {
    if (this.isDrawing) {
      this.isDrawing = false;
      this.canvasSnapshot = null;
      this.pushUndoState();
    }
  }

  draw(event: MouseEvent | TouchEvent) {
    if (!this.isDrawing) return;
    const canvas = document.getElementById('storeSketchCanvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in event ? (event as TouchEvent).touches[0].clientX : (event as MouseEvent).clientX;
    const clientY = 'touches' in event ? (event as TouchEvent).touches[0].clientY : (event as MouseEvent).clientY;

    const rawX = (clientX - rect.left) * (canvas.width / rect.width);
    const rawY = (clientY - rect.top) * (canvas.height / rect.height);
    const pt = this.getSnapPoint(rawX, rawY);

    if (this.activeTool === 'line') {
      if (this.canvasSnapshot) ctx.putImageData(this.canvasSnapshot, 0, 0);
      const constrained = this.constrainLineToGridAndDiagonals({ x: this.startX, y: this.startY }, pt);

      ctx.lineWidth = this.brushSize;
      ctx.strokeStyle = this.brushColor;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(this.startX, this.startY);
      ctx.lineTo(constrained.x, constrained.y);
      ctx.stroke();

      // End points indicator dots
      ctx.fillStyle = this.brushColor;
      ctx.beginPath();
      ctx.arc(this.startX, this.startY, 4, 0, Math.PI * 2);
      ctx.arc(constrained.x, constrained.y, 4, 0, Math.PI * 2);
      ctx.fill();

    } else if (this.activeTool === 'rect') {
      if (this.canvasSnapshot) ctx.putImageData(this.canvasSnapshot, 0, 0);
      ctx.lineWidth = this.brushSize;
      ctx.strokeStyle = this.brushColor;
      ctx.strokeRect(this.startX, this.startY, pt.x - this.startX, pt.y - this.startY);
    } else if (this.activeTool === 'pencil') {
      ctx.lineWidth = this.brushSize;
      ctx.strokeStyle = this.brushColor;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y);
    } else if (this.activeTool === 'eraser') {
      ctx.lineWidth = this.brushSize * 4;
      ctx.strokeStyle = '#090d16';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y);
    }
  }

  clearCanvas() {
    const canvas = document.getElementById('storeSketchCanvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x <= canvas.width; x += this.gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += this.gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('🚪 ' + (this.editEntrance || 'المدخل الرئيسي'), 20, 35);
    ctx.fillText('💵 ' + (this.editCheckout || 'الكاشير والاستقبال'), canvas.width - 200, 35);
    ctx.fillText('📦 ' + (this.editWarehouse || 'المخزن الخلفي'), canvas.width - 200, canvas.height - 25);
  }

  saveCanvasDrawing() {
    const canvas = document.getElementById('storeSketchCanvas') as HTMLCanvasElement;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    this.editSketchUrl = dataUrl;
    this.showCanvasDrawer.set(false);
  }

  saveLayoutForm() {
    this.service.updateStoreLayout({
      storeEntranceLabel: this.editEntrance || 'مدخل الفرع الرئيسي',
      checkoutAreaLabel: this.editCheckout || 'منطقة الكاشير والاستقبال',
      warehouseAreaLabel: this.editWarehouse || 'المخزن الداخلي الخلفي',
      aisles: [...this.editAisles],
      customSketchNotes: this.editNotes,
      sketchImageUrl: this.editSketchUrl
    });
    this.openLayoutEditorModal.set(false);
  }

  // Suppliers & Purchase Orders State & Handlers
  openAddSupplierModal = signal(false);
  newSupplierName = '';
  newSupplierCompany = '';
  newSupplierPhone = '';
  newSupplierCategoriesStr = 'منظفات ومساحيق غسيل ، مطهرات';

  showPoModal = signal(false);
  selectedPoSupplierId = '';
  poItemQuantities: { [productId: string]: number } = {};
  poNotes = '';

  submitAddSupplierForm() {
    if (!this.newSupplierName || !this.newSupplierPhone) return;

    const cats = this.newSupplierCategoriesStr 
      ? this.newSupplierCategoriesStr.split('،').flatMap(c => c.split(',')).map(c => c.trim()).filter(Boolean) 
      : ['عام'];

    this.service.addSupplier({
      name: this.newSupplierName,
      companyName: this.newSupplierCompany || 'مؤسسة توريدات',
      phone: this.newSupplierPhone,
      suppliedCategories: cats
    });

    this.newSupplierName = '';
    this.newSupplierCompany = '';
    this.newSupplierPhone = '';
    this.newSupplierCategoriesStr = 'منظفات ومساحيق غسيل ، مطهرات';
    this.openAddSupplierModal.set(false);
  }

  openCreatePoModal() {
    this.poItemQuantities = {};
    // Pre-fill low stock items default quantity to 20
    this.service.lowStockProducts().forEach(p => {
      this.poItemQuantities[p.id] = 20;
    });
    const firstSupp = this.service.suppliers()[0];
    this.selectedPoSupplierId = firstSupp ? firstSupp.id : '';
    this.poNotes = 'يرجى التوريد بشكل عاجل والتسليم لمخزن الفرع.';
    this.showPoModal.set(true);
  }

  openCreatePoForSingleProduct(product: OmAlQuraProduct) {
    this.poItemQuantities = { [product.id]: 20 };
    const firstSupp = this.service.suppliers()[0];
    this.selectedPoSupplierId = firstSupp ? firstSupp.id : '';
    this.poNotes = `طلب توريد عاجل لصنف (${product.name}).`;
    this.showPoModal.set(true);
  }

  submitCreatePo() {
    if (!this.selectedPoSupplierId) return;

    const itemsToRequest: OmAlQuraPurchaseOrderItem[] = [];
    Object.keys(this.poItemQuantities).forEach(prodId => {
      const qty = Number(this.poItemQuantities[prodId]);
      if (qty && qty > 0) {
        const prod = this.service.products().find(p => p.id === prodId);
        if (prod) {
          itemsToRequest.push({
            productId: prod.id,
            productName: prod.name,
            currentStock: prod.stockQuantity,
            requestedQuantity: qty,
            unitPriceEst: prod.price
          });
        }
      }
    });

    if (itemsToRequest.length === 0) {
      alert('يرجى تحديد كمية مطلوبة لصنف واحد على الأقل.');
      return;
    }

    this.service.createPurchaseOrder(this.selectedPoSupplierId, itemsToRequest, this.poNotes);
    this.showPoModal.set(false);
  }
}
