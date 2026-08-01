import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { OmAlQura2Service, OmAlQura2Product, OmAlQura2Order, OmAlQura2OrderItem, OmAlQura2CustomerDebt } from '../../../core/services/om-al-qura-2.service';
import { ImageFallbackDirective } from '../../../shared/directives/image-fallback.directive';

@Component({
  selector: 'app-om-al-qura-2-staff-portal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideDynamicIcon, ImageFallbackDirective],
  template: `
    <div class="space-y-8 font-sans" dir="rtl">
      
      <!-- Top Overview Bar for Metals Factory -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 font-sans">
        <div class="bg-gradient-to-br from-slate-900 via-zinc-900 to-amber-950 text-white rounded-3xl p-5 shadow-lg flex items-center justify-between border border-amber-500/30">
          <div>
            <p class="text-xs text-amber-200/80 font-bold mb-1">المهندسون والعمال على رأس العمل</p>
            <h3 class="text-3xl font-black text-white">{{ clockedInEmployeesCount() }} / {{ service.employees().length }}</h3>
          </div>
          <div class="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-amber-400/30">
            <svg lucideIcon="user-check" class="w-6 h-6 text-amber-400"></svg>
          </div>
        </div>

        <div class="bg-gradient-to-br from-amber-600 to-amber-700 text-slate-950 rounded-3xl p-5 shadow-lg flex items-center justify-between">
          <div>
            <p class="text-xs text-slate-950 font-black mb-1">طلبات التوريد والتفصيل الجديدة</p>
            <h3 class="text-3xl font-black text-slate-950">{{ service.newNotificationsCount() }}</h3>
          </div>
          <div class="w-12 h-12 bg-slate-950/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
            <svg lucideIcon="bell-ring" class="w-6 h-6 text-slate-950 animate-bounce"></svg>
          </div>
        </div>

        <div class="bg-gradient-to-br from-zinc-800 to-slate-900 text-white rounded-3xl p-5 shadow-lg flex items-center justify-between border border-amber-500/30">
          <div>
            <p class="text-xs text-amber-200/80 font-bold mb-1">إجمالي المستحقات وتسهيلات العملاء</p>
            <h3 class="text-3xl font-black text-amber-400">{{ totalDebtsAmount() }} <span class="text-sm font-normal text-white">ج.م</span></h3>
          </div>
          <div class="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10">
            <svg lucideIcon="receipt" class="w-6 h-6 text-amber-400"></svg>
          </div>
        </div>

        <div class="bg-gradient-to-br from-zinc-900 to-slate-950 text-white rounded-3xl p-5 shadow-lg flex items-center justify-between border border-amber-500/30">
          <div>
            <p class="text-xs text-amber-200/80 font-bold mb-1">قطاعات ومعادن منخفضة المخزون</p>
            <h3 class="text-3xl font-black text-amber-500">{{ service.lowStockProducts().length }}</h3>
          </div>
          <div class="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-amber-400/30">
            <svg lucideIcon="alert-triangle" class="w-6 h-6 text-amber-400"></svg>
          </div>
        </div>
      </div>

      <!-- Navigation Tabs inside Staff Portal & Quick Add Product Action -->
      <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div class="flex items-center gap-2 overflow-x-auto custom-scrollbar">
          <button *ngFor="let tab of staffTabs" (click)="activeSubTab.set(tab.id)"
                  class="px-5 py-2.5 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 shrink-0"
                  [ngClass]="activeSubTab() === tab.id ? 'bg-emerald-700 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'">
            <svg [lucideIcon]="tab.icon" class="w-4 h-4"></svg>
            <span>{{ tab.label }}</span>
            <span *ngIf="tab.id === 'notifications' && service.newNotificationsCount() > 0" class="bg-amber-400 text-slate-900 text-xs px-2 py-0.5 rounded-full font-black">
              {{ service.newNotificationsCount() }}
            </span>
          </button>
        </div>

        <button (click)="openAddProductModal.set(true); activeSubTab.set('inventory')" 
                class="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-sm transition-all flex items-center gap-2 shadow-lg shrink-0">
          <svg lucideIcon="plus-circle" class="w-5 h-5"></svg>
          <span>+ إضافة قطاع/منتج معدني جديد للمصنع</span>
        </button>
      </div>

      <!-- TAB 1: Attendance & Shift Clocking -->
      <div *ngIf="activeSubTab() === 'attendance'" class="space-y-6">
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h2 class="text-xl font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <svg lucideIcon="clock" class="w-5 h-5 text-emerald-600"></svg>
            <span>تسجيل حضور وانصراف الموظفين</span>
          </h2>

          <div *ngIf="service.employees().length > 0; else noAttendanceEmployees" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div *ngFor="let emp of service.employees()" class="p-5 rounded-2xl border transition-all"
                 [ngClass]="emp.isSuspended ? 'bg-rose-50 border-rose-200 opacity-60' : (emp.shiftStatus === 'clocked_in' ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700')">
              <div class="flex items-center justify-between mb-3">
                <span class="font-black text-slate-900 dark:text-white text-lg">{{ emp.name }}</span>
                <span class="px-2.5 py-0.5 rounded-full text-xs font-bold"
                      [ngClass]="emp.shiftStatus === 'clocked_in' ? 'bg-emerald-600 text-white' : 'bg-slate-400 text-white'">
                  {{ emp.shiftStatus === 'clocked_in' ? 'حاضر' : 'منصرف' }}
                </span>
              </div>
              <p class="text-xs text-slate-500 mb-4">الوظيفة: {{ emp.role }} | الهاتف: {{ emp.phone }}</p>
              
              <div *ngIf="!emp.isSuspended" class="flex gap-2">
                <button (click)="service.clockIn(emp.id)" [disabled]="emp.shiftStatus === 'clocked_in'"
                        class="flex-1 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition-all">
                  تسجيل حضور
                </button>
                <button (click)="service.clockOut(emp.id)" [disabled]="emp.shiftStatus === 'clocked_out'"
                        class="flex-1 py-2 rounded-xl text-xs font-bold bg-slate-700 text-white hover:bg-slate-800 disabled:opacity-40 transition-all">
                  تسجيل انصراف
                </button>
              </div>
              <div *ngIf="emp.isSuspended" class="text-xs font-bold text-rose-600 text-center py-1">
                حساب هذا الموظف موقوف
              </div>
            </div>
          </div>

          <ng-template #noAttendanceEmployees>
            <div class="text-center py-8 text-slate-400 text-sm">
              لا يوجد موظفون مسجلون حالياً في وردية الحضور والأنصراف. يرجى التواصل مع المدير لتوظيف عمال جدد.
            </div>
          </ng-template>
        </div>

        <!-- Attendance Logs Table -->
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 class="text-lg font-black text-slate-900 dark:text-white mb-4">سجل الحضور والانصراف اليومي</h3>
          <div class="overflow-x-auto">
            <table class="w-full text-sm text-right">
              <thead class="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                <tr>
                  <th class="p-3 rounded-r-xl">اسم الموظف</th>
                  <th class="p-3">نوع الحركة</th>
                  <th class="p-3">التاريخ</th>
                  <th class="p-3 rounded-l-xl">الوقت</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                <tr *ngFor="let log of service.attendanceLogs()">
                  <td class="p-3 font-bold text-slate-900 dark:text-white">{{ log.employeeName }}</td>
                  <td class="p-3">
                    <span class="px-2 py-0.5 rounded-full text-xs font-bold"
                          [ngClass]="log.type === 'in' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'">
                      {{ log.type === 'in' ? 'حضور' : 'انصراف' }}
                    </span>
                  </td>
                  <td class="p-3 text-slate-500">{{ log.date }}</td>
                  <td class="p-3 font-mono dir-ltr text-right text-slate-600 dark:text-slate-400">{{ log.time }}</td>
                </tr>
                <tr *ngIf="service.attendanceLogs().length === 0">
                  <td colspan="4" class="p-6 text-center text-slate-400">لا توجد سجلات حضور حتى الآن اليوم</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- TAB 2: Inventory & Products Management -->
      <div *ngIf="activeSubTab() === 'inventory'" class="space-y-6">
        <div class="flex flex-wrap justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm gap-4">
          <div>
            <h2 class="text-xl font-black text-slate-900 dark:text-white">إدارة مخزون المعادن والصاج والقطاعات</h2>
            <p class="text-xs text-slate-500">إضافة القطاعات والمعادن والأسعار وتخصيص وتسمية أقسام المعرض والمخزن الهندسي للمصنع</p>
          </div>
          <button (click)="openAddProductModal.set(true)" class="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-sm transition-all flex items-center gap-2 shadow-md">
            <svg lucideIcon="plus" class="w-4 h-4"></svg>
            <span>إضافة قطاع/خام جديد</span>
          </button>
        </div>

        <!-- Categories Management Section (تسمية وإدارة الأقسام للموظفين) -->
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div class="flex flex-wrap justify-between items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 class="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <svg lucideIcon="tags" class="w-5 h-5 text-amber-500"></svg>
                <span>إدارة وتسمية أقسام القطاعات والمنتجات المعدنية</span>
              </h3>
              <p class="text-xs text-slate-500">يمكن للموظفين إضافة أقسام جديدة، إعادة تسميتها وتعديل أسمائها، أو حذفها نهائياً.</p>
            </div>

            <button (click)="promptAddCategory()"
                    class="px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition-all flex items-center gap-1.5 shrink-0">
              <svg lucideIcon="plus" class="w-4 h-4"></svg>
              <span>+ إضافة قسم جديد</span>
            </button>
          </div>

          <div class="flex flex-wrap gap-3">
            <div *ngFor="let cat of service.categories()" class="px-4 py-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-4 transition-all">
              <div class="space-y-0.5">
                <span class="font-black text-slate-900 dark:text-white text-xs block">{{ cat }}</span>
                <span class="text-[10px] text-slate-400 font-bold block">{{ getCategoryProductCount(cat) }} منتجات</span>
              </div>

              <div class="flex items-center gap-1.5">
                <button (click)="openRenameCategoryDialog(cat)" title="تغيير وتعديل اسم القسم بدون حذفه"
                        class="px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-200 transition-all flex items-center gap-1.5 border border-emerald-300 dark:border-emerald-800">
                  <svg lucideIcon="edit-3" class="w-3.5 h-3.5"></svg>
                  <span>تعديل اسم القسم</span>
                </button>

                <button (click)="confirmDeleteCategory(cat)" title="حذف القسم" class="p-1.5 rounded-xl text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950 transition-all">
                  <svg lucideIcon="trash-2" class="w-3.5 h-3.5"></svg>
                </button>
              </div>
            </div>

            <div *ngIf="service.categories().length === 0" class="text-xs text-slate-400 py-2">
              لا توجد أقسام حالياً. اضغط على زر "+ إضافة قسم جديد".
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div *ngFor="let p of service.products()" class="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div>
              <div class="relative h-44 rounded-2xl overflow-hidden mb-4 bg-slate-100">
                <img [src]="p.imageUrl" [alt]="p.name" appImageFallback class="w-full h-full object-cover">
                <div *ngIf="p.isBoycott" class="absolute top-2 right-2 bg-rose-600 text-white px-2.5 py-1 rounded-full text-xs font-black shadow-md flex items-center gap-1">
                  <svg lucideIcon="ban" class="w-3.5 h-3.5"></svg>
                  <span>مقاطعة</span>
                </div>
                <div *ngIf="p.stockQuantity <= 0" class="absolute top-2 left-2 bg-slate-900 text-white px-2.5 py-1 rounded-full text-xs font-black shadow-md">
                  نفد من المخزون
                </div>
              </div>

              <h3 class="font-black text-slate-900 dark:text-white text-lg mb-1">{{ p.name }}</h3>
              <p class="text-xs text-slate-500 mb-3">{{ p.description }}</p>

              <div class="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl mb-4">
                <div class="flex justify-between">
                  <span>السعر:</span>
                  <span class="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{{ p.price }} ج.م</span>
                </div>
                <div class="flex justify-between">
                  <span>العدد المتوفر:</span>
                  <span class="font-bold" [ngClass]="p.stockQuantity <= 5 ? 'text-rose-600' : 'text-slate-800 dark:text-white'">{{ p.stockQuantity }} قطعة</span>
                </div>
                <div class="flex justify-between">
                  <span>موقع القطاع بالمصنع:</span>
                  <span class="font-bold text-slate-800 dark:text-white">{{ p.locationInStore }}</span>
                </div>
                <div *ngIf="p.isBoycott" class="text-rose-600 font-bold border-t border-rose-100 pt-1.5 mt-1.5">
                  البدائل: {{ p.boycottAlternatives.join(' ، ') || 'لا توجد بدائل محددة' }}
                </div>
              </div>
            </div>

            <div class="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button (click)="openEditProduct(p)" class="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black transition-all flex items-center justify-center gap-1 shadow-xs cursor-pointer">
                <svg lucideIcon="edit-3" class="w-3.5 h-3.5 text-white"></svg>
                <span class="text-white">تعديل المنتج والتصنيف</span>
              </button>
              <button (click)="quickUpdateStock(p, 10)" class="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all shrink-0 cursor-pointer shadow-xs">
                +10 مخزون
              </button>
              <button (click)="service.deleteProduct(p.id)" class="py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition-all shrink-0 cursor-pointer shadow-xs">
                حذف
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 3: POS & Bills Generator -->
      <div *ngIf="activeSubTab() === 'pos'" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Products selector for POS -->
        <div class="lg:col-span-2 space-y-4">
          <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h2 class="text-lg font-black text-slate-900 dark:text-white mb-4">اختيار المنتجات لنقطة البيع (POS)</h2>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div *ngFor="let p of service.products()" (click)="addPosItem(p)"
                   class="p-3 bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-2xl border border-slate-200 dark:border-slate-700 cursor-pointer transition-all">
                <p class="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">{{ p.name }}</p>
                <div class="flex justify-between items-center mt-2">
                  <span class="text-xs text-emerald-600 font-black">{{ p.price }} ج.م</span>
                  <span class="text-[10px] text-slate-500">المخزون: {{ p.stockQuantity }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- POS Invoice Summary -->
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 class="text-lg font-black text-slate-900 dark:text-white mb-4">فاتورة الكاشير المباشرة</h3>
            
            <div class="space-y-3 max-h-60 overflow-y-auto mb-4">
              <div *ngFor="let item of posItems()" class="flex justify-between items-center text-sm p-2 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <div>
                  <p class="font-bold text-slate-900 dark:text-white">{{ item.product.name }}</p>
                  <p class="text-xs text-slate-500">{{ item.product.price }} × {{ item.quantity }}</p>
                </div>
                <span class="font-black text-emerald-600">{{ item.product.price * item.quantity }} ج.م</span>
              </div>
              <div *ngIf="posItems().length === 0" class="text-center text-slate-400 py-8 text-sm">
                لم يتم إضافة منتجات بعد
              </div>
            </div>
          </div>

          <div class="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div class="flex justify-between text-lg font-black">
              <span>الإجمالي:</span>
              <span class="text-emerald-600">{{ posTotal() }} ج.م</span>
            </div>

            <div class="space-y-1.5 pt-1">
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300">طريقة تحصيل الفاتورة:</label>
              <select [(ngModel)]="posPaymentMethod" class="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold">
                <option value="كاش">💵 كاش (مباشر)</option>
                <option value="فيزا">💳 فيزا / بطاقة بنكية</option>
                <option value="محفظة إلكترونية">📱 محفظة إلكترونية (فودافون كاش / إنستا باي)</option>
              </select>
            </div>

            <button (click)="checkoutPos()" [disabled]="posItems().length === 0"
                    class="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl disabled:opacity-40 transition-all">
              طباعة وإصدار الفاتورة
            </button>
          </div>
        </div>
      </div>

      <!-- TAB 4: Live Notifications & Orders Hub -->
      <!-- TAB 4: Instant Notifications & Orders Management -->
      <div *ngIf="activeSubTab() === 'notifications'" class="space-y-6">
        
        <!-- Header & Order Filter Pills -->
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div class="flex flex-wrap justify-between items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 class="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <svg lucideIcon="bell-ring" class="w-6 h-6 text-amber-500 animate-bounce"></svg>
                <span>إشعارات وطلبات التوصيل والحجز المسبق الفورية</span>
              </h2>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                متابعة الطلبات المباشرة، محتويات السلة والمنتجات المطلوب تجهيزها، بيانت العملاء وسائقي الدليفري
              </p>
            </div>

            <div class="flex items-center gap-2">
              <span class="px-3.5 py-1.5 rounded-full text-xs font-black bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300/50 flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                <span>{{ pendingOrdersCount() }} طلبات جديدة تنتظر التجهيز</span>
              </span>
            </div>
          </div>

          <!-- Filter Pills -->
          <div class="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
            <button (click)="orderFilterStatus.set('all')"
                    class="px-4 py-2 rounded-2xl text-xs font-bold transition-all border shrink-0"
                    [ngClass]="orderFilterStatus() === 'all' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'">
              جميع الطلبات ({{ service.orders().length }})
            </button>

            <button (click)="orderFilterStatus.set('pending')"
                    class="px-4 py-2 rounded-2xl text-xs font-bold transition-all border shrink-0 flex items-center gap-1.5"
                    [ngClass]="orderFilterStatus() === 'pending' ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md font-black' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'">
              <span>طلبات جديدة</span>
              <span class="bg-amber-950 text-white text-[10px] px-1.5 py-0.5 rounded-full font-black">
                {{ pendingOrdersCount() }}
              </span>
            </button>

            <button (click)="orderFilterStatus.set('preparing')"
                    class="px-4 py-2 rounded-2xl text-xs font-bold transition-all border shrink-0"
                    [ngClass]="orderFilterStatus() === 'preparing' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'">
              قيد التجهيز والتقطيع بالمصنع
            </button>

            <button (click)="orderFilterStatus.set('on_the_way')"
                    class="px-4 py-2 rounded-2xl text-xs font-bold transition-all border shrink-0"
                    [ngClass]="orderFilterStatus() === 'on_the_way' ? 'bg-purple-600 text-white border-purple-600 shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'">
              مع سائق الدليفري
            </button>

            <button (click)="orderFilterStatus.set('completed')"
                    class="px-4 py-2 rounded-2xl text-xs font-bold transition-all border shrink-0"
                    [ngClass]="orderFilterStatus() === 'completed' ? 'bg-teal-600 text-white border-teal-600 shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'">
              طلبات مكتملة
            </button>
          </div>
        </div>

        <!-- Orders Cards Container -->
        <div class="space-y-4">
          <div *ngFor="let ord of filteredOrders()" 
               class="bg-white dark:bg-slate-900 rounded-3xl p-6 border transition-all duration-300 shadow-sm hover:shadow-md space-y-4"
               [ngClass]="{
                 'border-amber-400 dark:border-amber-500/70 bg-amber-50/50 dark:bg-amber-950/30': ord.status === 'pending',
                 'border-blue-400 dark:border-blue-500/70 bg-blue-50/50 dark:bg-blue-950/30': ord.status === 'preparing',
                 'border-purple-400 dark:border-purple-500/70 bg-purple-50/50 dark:bg-purple-950/30': ord.status === 'on_the_way',
                 'border-emerald-400 dark:border-emerald-500/70 bg-emerald-50/50 dark:bg-emerald-950/30': ord.status === 'completed',
                 'border-rose-400 dark:border-rose-500/70 bg-rose-50/50 dark:bg-rose-950/30': ord.status === 'cancelled'
               }">
            
            <!-- Order Card Header -->
            <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div class="flex items-center gap-3">
                <span class="px-3.5 py-1.5 rounded-2xl text-xs font-black text-white shadow-xs flex items-center gap-1.5"
                      [ngClass]="ord.orderType === 'delivery' ? 'bg-blue-600' : 'bg-purple-600'">
                  <svg [lucideIcon]="ord.orderType === 'delivery' ? 'truck' : 'shopping-bag'" class="w-4 h-4"></svg>
                  <span>{{ ord.orderType === 'delivery' ? 'توصيل منزلي (دليفري)' : 'حجز مسبق واستلام من الفرع' }}</span>
                </span>

                <h3 class="font-black text-slate-900 dark:text-white text-lg dir-ltr">#{{ ord.id }}</h3>

                <!-- Status Badge -->
                <span class="px-3 py-1 rounded-full text-xs font-black"
                      [ngClass]="{
                        'bg-amber-400 text-slate-950 animate-pulse': ord.status === 'pending',
                        'bg-blue-600 text-white': ord.status === 'preparing',
                        'bg-purple-600 text-white': ord.status === 'on_the_way',
                        'bg-emerald-600 text-white': ord.status === 'completed',
                        'bg-rose-600 text-white': ord.status === 'cancelled'
                      }">
                  {{ getStatusText(ord.status) }}
                </span>
              </div>

              <div class="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                <svg lucideIcon="clock" class="w-3.5 h-3.5 text-amber-500"></svg>
                <span>وقت الطلب: {{ ord.createdAt }}</span>
              </div>
            </div>

            <!-- Customer Details & Payment Info Grid (وضوح عالي جداً في الدارك مود) -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-sans">
              
              <!-- Customer Info Box -->
              <div class="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div class="flex items-center gap-2 text-slate-900 dark:text-white font-black text-sm">
                  <svg lucideIcon="user" class="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0"></svg>
                  <span>العميل: {{ ord.customerName }}</span>
                </div>
                <div class="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold dir-ltr text-right">
                  <svg lucideIcon="phone" class="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0"></svg>
                  <span class="font-mono text-sm">{{ ord.customerPhone }}</span>
                </div>
              </div>

              <!-- Address Box -->
              <div class="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div class="flex items-start gap-2 text-slate-900 dark:text-white font-bold">
                  <svg lucideIcon="map-pin" class="w-4 h-4 text-rose-500 shrink-0 mt-0.5"></svg>
                  <span class="leading-relaxed">العنوان: {{ ord.deliveryAddress || 'استلام مباشر من الفرع' }}</span>
                </div>
                <p *ngIf="ord.notes" class="text-amber-700 dark:text-amber-300 font-bold text-[11px] pt-1">
                  ملاحظات: {{ ord.notes }}
                </p>
              </div>

              <!-- Payment Total Box -->
              <div class="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 space-y-1.5 flex flex-col justify-center">
                <div class="flex items-center justify-between">
                  <span class="text-slate-700 dark:text-slate-200 font-bold">المبلغ الكلي المطلوب:</span>
                  <span class="text-emerald-700 dark:text-emerald-300 font-black text-base">{{ ord.totalPrice }} ج.م</span>
                </div>
                <div class="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 font-bold">
                  <span>الدفع: {{ ord.paymentMethod }}</span>
                  <span *ngIf="ord.assignedDriverName" class="text-purple-700 dark:text-purple-300 font-black">
                    السائق: {{ ord.assignedDriverName }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Itemized Products List (عرض الأصناف والمنتجات المطلوبة بوضوح تام) -->
            <div class="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
              <h4 class="font-black text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                <svg lucideIcon="package" class="w-4 h-4 text-emerald-600 dark:text-emerald-400"></svg>
                <span>محتويات الطلب والمنتجات المطلوب تحضيرها ({{ ord.items.length }} صنف):</span>
              </h4>

              <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                <div *ngFor="let item of ord.items" class="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs">
                  <div class="min-w-0 pr-1">
                    <p class="font-black text-slate-900 dark:text-white truncate">{{ item.product.name }}</p>
                    <p class="text-[10px] text-slate-500 dark:text-slate-400">سعر الوحدة: {{ item.product.price }} ج.م</p>
                  </div>
                  <div class="text-left shrink-0">
                    <span class="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 font-black text-xs">
                      × {{ item.quantity }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              
              <!-- Driver Assignment dropdown if delivery -->
              <div *ngIf="ord.orderType === 'delivery' && ord.status !== 'completed' && ord.status !== 'cancelled'" class="flex items-center gap-2">
                <span class="text-xs font-bold text-slate-700 dark:text-slate-300">تكليف سائق دليفري:</span>
                <select [ngModel]="ord.assignedDriverId" (ngModelChange)="assignDriverToOrder(ord.id, $event)"
                        class="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white">
                  <option [ngValue]="undefined">اختر السائق...</option>
                  <option *ngFor="let drv of service.deliveryDrivers()" [value]="drv.id">
                    {{ drv.name }} ({{ drv.status }})
                  </option>
                </select>
              </div>

              <!-- Main State Advancement Buttons -->
              <div class="flex items-center gap-2 mr-auto">
                <button (click)="service.updateOrderStatus(ord.id, 'preparing')" *ngIf="ord.status === 'pending'"
                        class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-2xl shadow-md transition-all flex items-center gap-1.5">
                  <svg lucideIcon="check-circle" class="w-4 h-4"></svg>
                  <span>تأكيد وبدء التقطيع والتجهيز بالمصنع</span>
                </button>

                <button (click)="service.updateOrderStatus(ord.id, 'on_the_way')" *ngIf="ord.status === 'preparing'"
                        class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-2xl shadow-md transition-all flex items-center gap-1.5">
                  <svg lucideIcon="truck" class="w-4 h-4"></svg>
                  <span>تسليم لسائق الدليفري (على الطريق)</span>
                </button>

                <button (click)="service.updateOrderStatus(ord.id, 'completed')" *ngIf="ord.status === 'on_the_way'"
                        class="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-black rounded-2xl shadow-md transition-all flex items-center gap-1.5">
                  <svg lucideIcon="sparkles" class="w-4 h-4"></svg>
                  <span>تأكيد تسليم الطلب واكتماله</span>
                </button>

                <button (click)="service.printThermalReceipt(ord)"
                        class="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 text-xs font-bold rounded-2xl transition-all flex items-center gap-1.5 border border-slate-300 dark:border-slate-700">
                  <svg lucideIcon="printer" class="w-4 h-4 text-emerald-600"></svg>
                  <span>طباعة حرارية</span>
                </button>

                <a [href]="service.getWhatsAppOrderLink(ord.customerPhone, ord)" target="_blank"
                   class="px-3.5 py-2.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 text-xs font-bold rounded-2xl transition-all flex items-center gap-1.5 border border-emerald-300 dark:border-emerald-800">
                  <svg lucideIcon="message-circle" class="w-4 h-4 text-emerald-600"></svg>
                  <span>واتساب العميل</span>
                </a>

                <button (click)="service.updateOrderStatus(ord.id, 'cancelled')" *ngIf="ord.status !== 'completed' && ord.status !== 'cancelled'"
                        class="px-3.5 py-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 text-xs font-bold rounded-2xl transition-all">
                  إلغاء الطلب
                </button>
              </div>

            </div>

          </div>

          <div *ngIf="filteredOrders().length === 0" class="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div class="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <svg lucideIcon="bell-off" class="w-8 h-8"></svg>
            </div>
            <h3 class="font-black text-slate-800 dark:text-white text-base">لا توجد طلبات حالياً في تصنيف ({{ getFilterStatusTitle() }})</h3>
            <p class="text-xs text-slate-500">أي طلبات جديدة يتم إرسالها من متجر العملاء ستظهر هنا فورياً ومباشرة.</p>
          </div>
        </div>

        <!-- Missing Products Requests Notifications -->
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div class="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 class="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <svg lucideIcon="package-plus" class="w-5 h-5 text-amber-500"></svg>
                <span>رغبات العملاء للقطاعات والخامات المعدنية المخصصة</span>
              </h3>
              <p class="text-xs text-slate-500">طلبات التوريد والمواصفات الخاصة الواردة من العملاء والشركات والمصانع</p>
            </div>
          </div>

          <div class="space-y-3">
            <div *ngFor="let req of service.missingProductRequests()" class="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-wrap justify-between items-center gap-3">
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                    طلب توفير
                  </span>
                  <h4 class="font-black text-slate-900 dark:text-white text-sm">{{ req.requestedProductName }}</h4>
                </div>
                <p class="text-xs text-slate-600 dark:text-slate-300 font-bold">
                  العميل: {{ req.customerName }} (<span class="dir-ltr text-right inline-block">{{ req.customerPhone }}</span>)
                </p>
                <p *ngIf="req.notes" class="text-xs text-slate-500">ملاحظات: {{ req.notes }}</p>
              </div>

              <div class="flex items-center gap-2">
                <span class="px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-xs font-bold">
                  {{ req.requestedAt }}
                </span>
                <button (click)="openAddProductWithPrefill(req.requestedProductName)" class="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700">
                  + إضافة للمخزون
                </button>
              </div>
            </div>

            <div *ngIf="service.missingProductRequests().length === 0" class="text-center py-6 text-slate-400 text-xs">
              لا توجد طلبات توفير منتجات ناقصة حالياً
            </div>
          </div>
        </div>

      </div>

      <!-- TAB 5: Customer Debts & Ledger -->
      <div *ngIf="activeSubTab() === 'debts'" class="space-y-6">
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div class="flex justify-between items-center mb-6">
            <div>
              <h2 class="text-xl font-black text-slate-900 dark:text-white">دفتر ديون وسندات العملاء</h2>
              <p class="text-xs text-slate-500">تسجيل وتتبع المبالغ والآجل للعملاء والمطاعم</p>
            </div>
            <button (click)="openAddDebtModal.set(true)" class="px-4 py-2 bg-emerald-600 text-white rounded-2xl text-xs font-bold hover:bg-emerald-700">
              تسجيل دين جديد
            </button>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-sm text-right">
              <thead class="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                <tr>
                  <th class="p-3 rounded-r-xl">اسم العميل</th>
                  <th class="p-3">رقم الهاتف</th>
                  <th class="p-3">المبلغ المستحق</th>
                  <th class="p-3">الملاحظات</th>
                  <th class="p-3">الحالة</th>
                  <th class="p-3 rounded-l-xl">إجراءات</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                <tr *ngFor="let d of service.customerDebts()">
                  <td class="p-3 font-bold text-slate-900 dark:text-white">{{ d.customerName }}</td>
                  <td class="p-3 text-slate-500">{{ d.customerPhone }}</td>
                  <td class="p-3 font-black text-rose-600 text-base">{{ d.debtAmount }} ج.م</td>
                  <td class="p-3 text-xs text-slate-600 dark:text-slate-400">{{ d.notes }}</td>
                  <td class="p-3">
                    <span class="px-2.5 py-1 rounded-full text-xs font-bold"
                          [ngClass]="d.status === 'مسدد بالكامل' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'">
                      {{ d.status }}
                    </span>
                  </td>
                  <td class="p-3">
                    <button (click)="service.updateDebtStatus(d.id, 'مسدد بالكامل', d.debtAmount)" class="px-3 py-1 bg-emerald-600 text-white text-xs rounded-xl font-bold hover:bg-emerald-700">
                      تسديد بالكامل
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- TAB 6: Staff Suggestions & FAQs -->
      <div *ngIf="activeSubTab() === 'suggestions'" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Suggestions Box -->
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 class="text-xl font-black text-slate-900 dark:text-white">صندوق مقترحات الموظفين لتحسين المتجر</h2>
          
          <div class="space-y-3">
            <input type="text" [(ngModel)]="newSugTitle" placeholder="عنوان المقترح..." class="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm">
            <textarea [(ngModel)]="newSugDetails" rows="3" placeholder="تفاصيل المقترح للتحسين والتسريع..." class="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"></textarea>
            <button (click)="submitSuggestion()" class="w-full py-2.5 bg-emerald-600 text-white font-bold rounded-2xl text-sm hover:bg-emerald-700">
              إرسال المقترح للإدارة
            </button>
          </div>

          <div class="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div *ngFor="let sug of service.staffSuggestions()" class="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
              <h4 class="font-bold text-slate-900 dark:text-white text-sm">{{ sug.title }}</h4>
              <p class="text-xs text-slate-500 mt-1">{{ sug.details }}</p>
              <p class="text-[10px] text-emerald-600 font-bold mt-2">بواسطة: {{ sug.staffName }} | {{ sug.createdAt }}</p>
            </div>
          </div>
        </div>

        <!-- FAQ Bank -->
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div class="flex flex-wrap justify-between items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 class="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <svg lucideIcon="help-circle" class="w-5 h-5 text-emerald-600"></svg>
                <span>بنك الأسئلة الشائعة وإجاباتها</span>
              </h2>
              <p class="text-xs text-slate-500">دليل الموظفين لإجابة استفسارات العملاء والعمليات</p>
            </div>

            <button (click)="openAddFaqModal.set(true)"
                    class="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all flex items-center gap-1.5 shrink-0">
              <svg lucideIcon="plus-circle" class="w-4 h-4"></svg>
              <span>+ إضافة سؤال شائع جديد</span>
            </button>
          </div>

          <div class="space-y-3 max-h-[420px] overflow-y-auto custom-scrollbar">
            <div *ngFor="let faq of service.faqs()" class="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/60 relative group">
              <div class="flex justify-between items-start gap-3">
                <div class="space-y-1 flex-1">
                  <div class="flex items-center gap-2">
                    <span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      {{ faq.category || 'عام' }}
                    </span>
                    <h4 class="font-black text-slate-900 dark:text-white text-sm">س: {{ faq.question }}</h4>
                  </div>
                  <p class="text-xs text-slate-700 dark:text-slate-300 font-medium bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 mt-2">
                    <strong class="text-emerald-600 dark:text-emerald-400">الإجابة:</strong> {{ faq.answer }}
                  </p>
                </div>
                <button (click)="deleteFaq(faq.id)" title="حذف السؤال" class="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all shrink-0">
                  <svg lucideIcon="trash-2" class="w-4 h-4"></svg>
                </button>
              </div>
            </div>

            <div *ngIf="service.faqs().length === 0" class="text-center py-8 text-slate-400 text-sm">
              لا توجد أسئلة شائعة حالياً. اضغط على زر "+ إضافة سؤال شائع جديد" لإضافة أول سؤال.
            </div>
          </div>
        </div>
      </div>

      <!-- ADD PRODUCT MODAL DIALOG -->
      <div *ngIf="openAddProductModal()" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-xl w-full font-sans dir-rtl space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
          <div class="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 class="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <svg lucideIcon="package-plus" class="w-5 h-5 text-emerald-600"></svg>
              <span>إضافة منتج / قطاع معدني جديد للمصنع</span>
            </h3>
            <button (click)="openAddProductModal.set(false)" class="text-slate-400 hover:text-slate-600">
              <svg lucideIcon="x" class="w-5 h-5"></svg>
            </button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">اسم المنتج أو القطاع المعدني *</label>
              <input type="text" [(ngModel)]="newProdName" placeholder="مثال: قطاع ألومنيوم 6063، صاج بارد 2مم، مواسير حديد صلب..." class="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold">
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">القسم / التصنيف *</label>
              <select [(ngModel)]="newProdCategory" class="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold">
                <option *ngFor="let cat of service.categories()" [value]="cat">{{ cat }}</option>
                <option value="أخرى">أخرى (كتابة قسم جديد)</option>
              </select>

              <div *ngIf="newProdCategory === 'أخرى'" class="mt-2">
                <input type="text" [(ngModel)]="customProdCategory" placeholder="اكتب اسم القسم الجديد هنا..." required
                       class="w-full p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-700 text-slate-900 dark:text-white text-xs font-bold">
              </div>
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">السعر (ج.م) *</label>
              <input type="number" [(ngModel)]="newProdPrice" min="0" placeholder="0" class="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">العدد / الكمية المتاحة *</label>
              <input type="number" [(ngModel)]="newProdStock" min="0" placeholder="0" class="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">نسبة الخصم (%)</label>
              <input type="number" [(ngModel)]="newProdDiscount" min="0" max="100" placeholder="0" class="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">موقع القطاع بالمصنع (الرف/الممر) *</label>
              <input type="text" [(ngModel)]="newProdLocationStore" placeholder="مثال: الممر 2 - رف B3" class="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">مكان التخزين بالمخزن الداخلي</label>
              <input type="text" [(ngModel)]="newProdLocationWarehouse" placeholder="مثال: المخزن - رف W-1" class="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">موعد التوفر المتوقع (عند نفاد المخزون)</label>
              <input type="text" [(ngModel)]="newProdExpectedRestock" placeholder="مثال: غداً 4 مساءً أو خلال 24 ساعة" class="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            </div>

            <div class="flex items-center gap-2 pt-4">
              <input type="checkbox" [(ngModel)]="newProdIsInWarehouse" id="addWarehouseCheck" class="w-4 h-4 text-emerald-600 rounded">
              <label for="addWarehouseCheck" class="font-bold text-slate-800 dark:text-slate-200 text-xs">متوفر حالياً بالمخزن الداخلي (وليس العرض فقط)</label>
            </div>

            <div class="sm:col-span-2">
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">وصف المنتج</label>
              <textarea [(ngModel)]="newProdDescription" rows="2" placeholder="وصف قصير للمنتج..." class="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"></textarea>
            </div>

            <div class="sm:col-span-2 space-y-2">
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">صورة المنتج (من الهاتف / الكاميرا عبر Cloudinary)</label>
              
              <div class="flex flex-wrap items-center gap-3">
                <label class="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-2">
                  <svg lucideIcon="camera" class="w-4 h-4"></svg>
                  <span>{{ uploadingAddImage() ? 'جاري الرفع على Cloudinary...' : '📸 التقاط صورة بالكاميرا / رفع من الجوال' }}</span>
                  <input type="file" accept="image/*" capture="environment" class="hidden" (change)="onFileSelectedForAdd($event)" [disabled]="uploadingAddImage()">
                </label>

                <span class="text-xs text-slate-400 font-bold">أو رابط صورة:</span>

                <input type="text" [(ngModel)]="newProdImageUrl" placeholder="https://..." class="flex-1 min-w-[200px] p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
              </div>

              <div *ngIf="newProdImageUrl" class="flex items-center gap-3 pt-2">
                <img [src]="newProdImageUrl" appImageFallback class="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500 shadow-md">
                <div class="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                  ✓ تم تجهيز ومعاينة صورة المنتج
                </div>
              </div>
            </div>

            <!-- Gallery Images Input -->
            <div class="sm:col-span-2 space-y-1">
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">روابط الصور الإضافية لألبوم المعرض (مفصولة بفاصلة)</label>
              <textarea [(ngModel)]="newProdImagesStr" placeholder="رابط1, رابط2, رابط3..." rows="2" class="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono"></textarea>
              
              <!-- Thumbnails preview -->
              <div *ngIf="newProdImagesStr" class="flex flex-wrap gap-2 pt-1">
                <div *ngFor="let url of newProdImagesStr.split('،').flatMap(a => a.split(','))">
                  <img *ngIf="url.trim()" [src]="url.trim()" appImageFallback class="w-12 h-12 rounded-xl object-cover border border-slate-300 shadow-sm">
                </div>
              </div>
            </div>

          </div>

          <button (click)="saveNewProduct(); openAddProductModal.set(false)" [disabled]="!newProdName || !newProdPrice"
                  class="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-sm disabled:opacity-40 transition-all shadow-md">
            حفظ وإضافة للمخزون
          </button>
        </div>
      </div>

      <!-- EDIT PRODUCT MODAL DIALOG -->
      <div *ngIf="openEditProductModal()" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-xl w-full font-sans dir-rtl space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
          <div class="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 class="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <svg lucideIcon="edit-3" class="w-5 h-5 text-emerald-600"></svg>
              <span>تعديل تفاصيل المنتج وتصنيفه</span>
            </h3>
            <button (click)="openEditProductModal.set(false)" class="text-slate-400 hover:text-slate-600 p-1 rounded-xl">
              <svg lucideIcon="x" class="w-5 h-5"></svg>
            </button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">اسم القطاع المعدني أو المنتج *</label>
              <input type="text" [(ngModel)]="editProdName" class="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold">
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">القسم / التصنيف *</label>
              <select [(ngModel)]="editProdCategory" class="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold">
                <option *ngFor="let cat of service.categories()" [value]="cat">{{ cat }}</option>
                <option value="أخرى">أخرى (كتابة قسم جديد)</option>
              </select>

              <div *ngIf="editProdCategory === 'أخرى'" class="mt-2">
                <input type="text" [(ngModel)]="customEditCategory" placeholder="اكتب اسم القسم الجديد هنا..." required
                       class="w-full p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-700 text-slate-900 dark:text-white text-xs font-bold">
              </div>
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">السعر (ج.م) *</label>
              <input type="number" [(ngModel)]="editProdPrice" min="0" class="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold">
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">العدد / الكمية المتاحة *</label>
              <input type="number" [(ngModel)]="editProdStock" min="0" class="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold">
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">نسبة الخصم (%)</label>
              <input type="number" [(ngModel)]="editProdDiscount" min="0" max="100" class="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold">
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">موقع القطاع بالمصنع (الرف/الممر) *</label>
              <input type="text" [(ngModel)]="editProdLocationStore" class="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">مكان التخزين بالمخزن الداخلي</label>
              <input type="text" [(ngModel)]="editProdLocationWarehouse" class="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">موعد التوفر المتوقع (عند نفاد المخزون)</label>
              <input type="text" [(ngModel)]="editProdExpectedRestock" placeholder="مثال: غداً 4 مساءً أو خلال 24 ساعة" class="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            </div>

            <div class="flex items-center gap-2 pt-4">
              <input type="checkbox" [(ngModel)]="editProdIsInWarehouse" id="editWarehouseCheck" class="w-4 h-4 text-emerald-600 rounded">
              <label for="editWarehouseCheck" class="font-bold text-slate-800 dark:text-slate-200 text-xs">متوفر حالياً بالمخزن الداخلي</label>
            </div>

            <div class="sm:col-span-2">
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">وصف المنتج</label>
              <textarea [(ngModel)]="editProdDescription" rows="2" class="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"></textarea>
            </div>

            <div class="sm:col-span-2 space-y-2">
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">صورة المنتج (تعديل من الهاتف / الكاميرا عبر Cloudinary)</label>
              
              <div class="flex flex-wrap items-center gap-3">
                <label class="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-2">
                  <svg lucideIcon="camera" class="w-4 h-4"></svg>
                  <span>{{ uploadingEditImage() ? 'جاري الرفع على Cloudinary...' : '📸 تغيير الصورة بالكاميرا / الجوال' }}</span>
                  <input type="file" accept="image/*" capture="environment" class="hidden" (change)="onFileSelectedForEdit($event)" [disabled]="uploadingEditImage()">
                </label>

                <span class="text-xs text-slate-400 font-bold">أو رابط صورة:</span>

                <input type="text" [(ngModel)]="editProdImageUrl" placeholder="https://..." class="flex-1 min-w-[200px] p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
              </div>

              <div *ngIf="editProdImageUrl" class="flex items-center gap-3 pt-2">
                <img [src]="editProdImageUrl" appImageFallback class="w-16 h-16 rounded-2xl object-cover border-2 border-blue-500 shadow-md">
                <div class="text-[11px] text-blue-600 dark:text-blue-400 font-bold">
                  ✓ معاينة الصورة الجديدة للمنتج
                </div>
              </div>
            </div>

            <!-- Edit Gallery Images Input -->
            <div class="sm:col-span-2 space-y-1">
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">روابط الصور الإضافية لألبوم المعرض (مفصولة بفاصلة)</label>
              <textarea [(ngModel)]="editProdImagesStr" placeholder="رابط1, رابط2, رابط3..." rows="2" class="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono"></textarea>
              
              <!-- Thumbnails preview -->
              <div *ngIf="editProdImagesStr" class="flex flex-wrap gap-2 pt-1">
                <div *ngFor="let url of editProdImagesStr.split('،').flatMap(a => a.split(','))">
                  <img *ngIf="url.trim()" [src]="url.trim()" appImageFallback class="w-12 h-12 rounded-xl object-cover border border-slate-300 shadow-sm">
                </div>
              </div>
            </div>

          </div>

          <div class="pt-3 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
            <button (click)="openEditProductModal.set(false)" class="px-4 py-2 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
              إلغاء
            </button>
            <button (click)="saveProductEdits(); openEditProductModal.set(false)" [disabled]="!editProdName || editProdPrice === null"
                    class="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-xs disabled:opacity-40 transition-all shadow-md flex items-center gap-2">
              <svg lucideIcon="check" class="w-4 h-4"></svg>
              <span>حفظ التعديلات والتحديث</span>
            </button>
          </div>
        </div>
      </div>

      <!-- ADD FAQ MODAL DIALOG -->
      <div *ngIf="openAddFaqModal()" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full font-sans dir-rtl space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
          <div class="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 class="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <svg lucideIcon="help-circle" class="w-5 h-5 text-emerald-600"></svg>
              <span>إضافة سؤال شائع جديد</span>
            </h3>
            <button (click)="openAddFaqModal.set(false)" class="text-slate-400 hover:text-slate-600 p-1 rounded-xl">
              <svg lucideIcon="x" class="w-5 h-5"></svg>
            </button>
          </div>

          <form (ngSubmit)="submitFaq()" class="space-y-4 text-xs">
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">تصنيف السؤال *</label>
              <select [(ngModel)]="newFaqCategory" name="faqCategory"
                      class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold">
                <option value="عام">عام</option>
                <option value="المنظفات والبدائل">المنظفات والبدائل والمقاطعة</option>
                <option value="الدفع والتوصيل">الدفع والتوصيل والخدمات</option>
                <option value="إرشادات الوردية">إرشادات وسياسات المحل</option>
              </select>
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">السؤال الشائع *</label>
              <input type="text" [(ngModel)]="newFaqQuestion" name="faqQuestion" required
                     placeholder="مثال: كيف يتم التعامل مع المرجعات البديلة؟"
                     class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">الإجابة التفصيلية *</label>
              <textarea [(ngModel)]="newFaqAnswer" name="faqAnswer" rows="4" required
                        placeholder="اكتب الإجابة التفصيلية النموذجية للموظفين والعملاء..."
                        class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"></textarea>
            </div>
            <div class="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <button type="button" (click)="openAddFaqModal.set(false)" class="px-4 py-2 rounded-2xl text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800">
                إلغاء
              </button>
              <button type="submit" [disabled]="!newFaqQuestion || !newFaqAnswer"
                      class="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-xs disabled:opacity-40 transition-all shadow-md">
                إضافة لبنك الأسئلة
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- ADD DEBT MODAL DIALOG -->
      <div *ngIf="openAddDebtModal()" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full font-sans dir-rtl space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
          <div class="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 class="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <svg lucideIcon="receipt" class="w-5 h-5 text-emerald-600"></svg>
              <span>تسجيل دين جديد في دفتر العملاء</span>
            </h3>
            <button (click)="openAddDebtModal.set(false)" class="text-slate-400 hover:text-slate-600 p-1 rounded-xl">
              <svg lucideIcon="x" class="w-5 h-5"></svg>
            </button>
          </div>

          <form (ngSubmit)="submitNewDebt()" class="space-y-4 text-xs">
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">اسم العميل / المطعم *</label>
              <input type="text" [(ngModel)]="newDebtCustomerName" name="debtCustomerName" required
                     placeholder="مثال: أبو فهد / مطعم البركة"
                     class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold">
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">رقم الهاتف</label>
                <input type="tel" [(ngModel)]="newDebtCustomerPhone" name="debtCustomerPhone" dir="ltr"
                       placeholder="010XXXXXXXX"
                       class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-right font-bold">
              </div>

              <div>
                <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">المبلغ المستحق (ج.م) *</label>
                <input type="number" [(ngModel)]="newDebtAmount" name="debtAmount" required min="1"
                       placeholder="مثال: 450"
                       class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold">
              </div>
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">حالة الدين التمهيدية *</label>
              <select [(ngModel)]="newDebtStatus" name="debtStatus"
                      class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold">
                <option value="معلق">معلق (لم يسدد)</option>
                <option value="تسديد جزئي">تسديد جزئي</option>
                <option value="مسدد بالكامل">مسدد بالكامل</option>
              </select>
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">تفاصيل وملاحظات الدين</label>
              <textarea [(ngModel)]="newDebtNotes" name="debtNotes" rows="3"
                        placeholder="تفاصيل المشتريات بالآجل وموعد السداد المتفق عليه..."
                        class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"></textarea>
            </div>

            <div class="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <button type="button" (click)="openAddDebtModal.set(false)" class="px-4 py-2 rounded-2xl text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800">
                إلغاء
              </button>
              <button type="submit" [disabled]="!newDebtCustomerName || !newDebtAmount"
                      class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-xs disabled:opacity-40 transition-all shadow-md flex items-center gap-2">
                <svg lucideIcon="check" class="w-4 h-4"></svg>
                <span>تسجيل وسحب السند</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- RENAME CATEGORY MODAL DIALOG -->
      <div *ngIf="openRenameCategoryModal()" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full font-sans dir-rtl space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
          <div class="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 class="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <svg lucideIcon="edit-3" class="w-5 h-5 text-emerald-600"></svg>
              <span>تعديل اسم القسم للمنتجات (بدون حذفه)</span>
            </h3>
            <button (click)="openRenameCategoryModal.set(false)" class="text-slate-400 hover:text-slate-600">
              <svg lucideIcon="x" class="w-5 h-5"></svg>
            </button>
          </div>

          <div class="space-y-3 text-xs">
            <div class="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
              <span class="text-slate-500 font-bold block mb-1">الاسم الحالي للقسم:</span>
              <span class="font-black text-slate-900 dark:text-white text-sm">{{ targetCategoryToRename() }}</span>
              <span class="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold block mt-1.5">
                سيتم تحديث {{ getCategoryProductCount(targetCategoryToRename()) }} منتجات تابعة لهذا القسم تلقائياً لتدخل تحت الاسم الجديد دون إحداث أي حذف!
              </span>
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">اسم القسم الجديد *</label>
              <input type="text" [(ngModel)]="newCategoryNameInput" placeholder="اكتب اسم القسم الجديد هنا..."
                     class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500">
            </div>

            <div class="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <button type="button" (click)="openRenameCategoryModal.set(false)" class="px-4 py-2 rounded-2xl text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800">
                إلغاء
              </button>
              <button (click)="submitRenameCategory()" type="button"
                      class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5">
                <svg lucideIcon="check" class="w-4 h-4"></svg>
                <span>تأكيد وتحديث اسم القسم</span>
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  `
})
export class OmAlQura2StaffPortalComponent {
  service = inject(OmAlQura2Service);

  activeSubTab = signal<'attendance' | 'inventory' | 'pos' | 'notifications' | 'debts' | 'suggestions'>('inventory');
  orderFilterStatus = signal<'all' | 'pending' | 'preparing' | 'on_the_way' | 'completed' | 'cancelled'>('all');
  openAddProductModal = signal(false);
  openAddDebtModal = signal(false);
  openAddFaqModal = signal(false);
  openEditProductModal = signal(false);

  uploadingAddImage = signal(false);
  uploadingEditImage = signal(false);

  editingProductId = signal<string | null>(null);

  // Debt Form State
  newDebtCustomerName = '';
  newDebtCustomerPhone = '';
  newDebtAmount: number | null = null;
  newDebtNotes = '';
  newDebtStatus: OmAlQura2CustomerDebt['status'] = 'معلق';

  // Edit Product Form state
  editProdName = '';
  editProdCategory = 'ألومنيوم 6063';
  customEditCategory = '';
  editProdPrice: number | null = null;
  editProdStock: number | null = 10;
  editProdDiscount: number | null = 0;
  editProdLocationStore = '';
  editProdLocationWarehouse = '';
  editProdIsInWarehouse = false;
  editProdExpectedRestock = '';
  editProdIsBoycott = false;
  editProdBoycottReason = '';
  editProdAlternatives = '';
  editProdDescription = '';
  editProdImageUrl = '';
  editProdImagesStr = ''; // comma separated additional image URLs

  // FAQ State
  newFaqQuestion = '';
  newFaqAnswer = '';
  newFaqCategory = 'عام';

  // New Product Form state
  newProdName = '';
  newProdCategory = 'ألومنيوم 6063';
  customProdCategory = '';
  newProdPrice: number | null = null;
  newProdStock: number | null = 10;
  newProdDiscount: number | null = 0;
  newProdLocationStore = '';
  newProdLocationWarehouse = '';
  newProdIsInWarehouse = false;
  newProdExpectedRestock = '';
  newProdIsBoycott = false;
  newProdBoycottReason = '';
  newProdAlternatives = '';
  newProdDescription = '';
  newProdImageUrl = '';
  newProdImagesStr = ''; // comma separated additional image URLs

  staffTabs: { id: 'attendance' | 'inventory' | 'pos' | 'notifications' | 'debts' | 'suggestions'; label: string; icon: string }[] = [
    { id: 'attendance', label: 'حضور وانصراف عمال ومهندسي المصنع', icon: 'clock' },
    { id: 'inventory', label: 'إدارة مخزون المعادن والصاج والقطاعات', icon: 'package' },
    { id: 'pos', label: 'فواتير التوريد المباشر والخزينة (POS)', icon: 'shopping-bag' },
    { id: 'notifications', label: 'إشعارات الطلبات والتفصيل', icon: 'bell' },
    { id: 'debts', label: 'دفتر مستحقات وتسهيلات العملاء', icon: 'receipt' },
    { id: 'suggestions', label: 'استفسارات ومقترحات التصنيع', icon: 'lightbulb' }
  ];

  // POS State
  posItems = signal<OmAlQura2OrderItem[]>([]);
  
  // Suggestion State
  newSugTitle = '';
  newSugDetails = '';

  clockedInEmployeesCount() {
    return this.service.employees().filter(e => e.shiftStatus === 'clocked_in').length;
  }

  totalDebtsAmount() {
    return this.service.customerDebts().reduce((acc, d) => acc + d.debtAmount, 0);
  }

  addPosItem(product: OmAlQura2Product) {
    const current = this.posItems();
    const idx = current.findIndex(i => i.product.id === product.id);
    if (idx > -1) {
      const updated = [...current];
      updated[idx].quantity += 1;
      this.posItems.set(updated);
    } else {
      this.posItems.set([...current, { product, quantity: 1 }]);
    }
  }

  posPaymentMethod: OmAlQura2Order['paymentMethod'] = 'كاش';

  posTotal() {
    return this.posItems().reduce((acc, i) => acc + (i.product.price * i.quantity), 0);
  }

  checkoutPos() {
    this.service.createPosInvoice(this.posItems(), 'زبون كاشير', this.posPaymentMethod);
    this.posItems.set([]);
    this.posPaymentMethod = 'كاش';
  }

  quickUpdateStock(p: OmAlQura2Product, amount: number) {
    this.service.updateProduct(p.id, { stockQuantity: p.stockQuantity + amount });
  }

  submitSuggestion() {
    if (this.newSugTitle && this.newSugDetails) {
      this.service.submitStaffSuggestion('موظف المحل', this.newSugTitle, this.newSugDetails);
      this.newSugTitle = '';
      this.newSugDetails = '';
    }
  }

  submitFaq() {
    if (this.newFaqQuestion && this.newFaqAnswer) {
      this.service.addFaq(this.newFaqQuestion, this.newFaqAnswer, this.newFaqCategory);
      this.newFaqQuestion = '';
      this.newFaqAnswer = '';
      this.newFaqCategory = 'عام';
      this.openAddFaqModal.set(false);
    }
  }

  deleteFaq(id: string) {
    if (confirm('هل أنت تأكد من حذف هذا السؤال من بنك الأسئلة الشائعة؟')) {
      this.service.deleteFaq(id);
    }
  }

  saveNewProduct() {
    if (this.newProdName && this.newProdPrice !== null) {
      const finalCategory = (this.newProdCategory === 'أخرى' && this.customProdCategory.trim()) 
        ? this.customProdCategory.trim() 
        : (this.newProdCategory === 'أخرى' ? 'قسم جديد' : this.newProdCategory);

      // Auto-save new category to dynamic categories list if not present
      if (finalCategory && !this.service.categories().includes(finalCategory)) {
        this.service.addCategory(finalCategory);
      }

      const alts = this.newProdAlternatives ? this.newProdAlternatives.split('،').flatMap(a => a.split(',')).map(a => a.trim()).filter(Boolean) : [];
      const galleryImages = this.newProdImagesStr 
        ? this.newProdImagesStr.split('،').flatMap(a => a.split(',')).flatMap(a => a.split('\n')).map(a => a.trim()).filter(Boolean) 
        : [];

      this.service.addProduct({
        name: this.newProdName,
        category: finalCategory,
        price: Number(this.newProdPrice),
        stockQuantity: Number(this.newProdStock || 0),
        discountPercent: Number(this.newProdDiscount || 0),
        isBoycott: this.newProdIsBoycott,
        boycottReason: this.newProdBoycottReason || undefined,
        boycottAlternatives: alts,
        locationInStore: this.newProdLocationStore || 'الممر الرئيسي',
        locationInWarehouse: this.newProdLocationWarehouse || 'المخزن',
        isInWarehouse: this.newProdIsInWarehouse,
        expectedRestockDate: this.newProdExpectedRestock || undefined,
        imageUrl: this.newProdImageUrl || 'https://images.unsplash.com/photo-1535813547-99c456a41d4a?w=500&auto=format&fit=crop&q=60',
        images: galleryImages,
        description: this.newProdDescription || 'قطاع معدني عالي الجودة مقطوع وفقاً للمواصفات الهندسية'
      });

      // Reset form & close modal
      this.newProdName = '';
      this.newProdCategory = 'قطاعات وإكسسوارات الألومنيوم';
      this.customProdCategory = '';
      this.newProdPrice = null;
      this.newProdStock = 10;
      this.newProdDiscount = 0;
      this.newProdLocationStore = '';
      this.newProdLocationWarehouse = '';
      this.newProdIsInWarehouse = false;
      this.newProdExpectedRestock = '';
      this.newProdIsBoycott = false;
      this.newProdBoycottReason = '';
      this.newProdAlternatives = '';
      this.newProdDescription = '';
      this.newProdImageUrl = '';
      this.newProdImagesStr = '';
      this.openAddProductModal.set(false);
    }
  }

  // Category Management Methods for Staff
  openRenameCategoryModal = signal(false);
  targetCategoryToRename = signal<string>('');
  newCategoryNameInput = '';

  getCategoryProductCount(catName: string) {
    return this.service.products().filter(p => p.category === catName).length;
  }

  promptAddCategory() {
    const name = prompt('أدخل اسم القسم الجديد للمنتجات:');
    if (name && name.trim()) {
      this.service.addCategory(name.trim());
    }
  }

  openRenameCategoryDialog(catName: string) {
    const input = window.prompt(`تعديل اسم قسم (${catName}) إلى:`, catName);
    if (input !== null) {
      const trimmed = input.trim();
      if (trimmed && trimmed !== catName) {
        this.service.renameCategory(catName, trimmed);
      }
    }
  }

  submitRenameCategory() {
    const oldName = this.targetCategoryToRename();
    const newName = this.newCategoryNameInput.trim();
    if (!newName) {
      alert('يرجى إدخال اسم جديد للقسم.');
      return;
    }
    if (oldName === newName) {
      alert('يرجى تغيير الاسم إلى اسم جديد مختلف عن الاسم الحالي للقسم.');
      return;
    }
    this.service.renameCategory(oldName, newName);
    this.openRenameCategoryModal.set(false);
  }

  promptRenameCategory(oldName: string) {
    this.openRenameCategoryDialog(oldName);
  }

  confirmDeleteCategory(catName: string) {
    const count = this.getCategoryProductCount(catName);
    const msg = count > 0 
      ? `هل أنت تأكد من حذف قسم (${catName})؟ يحتوي هذا القسم على ${count} منتجات وسيتم نقلها لقسم (عام).`
      : `هل أنت تأكد من حذف قسم (${catName})؟`;
    if (confirm(msg)) {
      this.service.deleteCategory(catName);
    }
  }

  // Edit Product Handlers
  openEditProduct(p: OmAlQura2Product) {
    this.editingProductId.set(p.id);
    this.editProdName = p.name;
    this.editProdCategory = p.category;
    this.customEditCategory = '';
    this.editProdPrice = p.price;
    this.editProdStock = p.stockQuantity;
    this.editProdDiscount = p.discountPercent || 0;
    this.editProdLocationStore = p.locationInStore || '';
    this.editProdLocationWarehouse = p.locationInWarehouse || '';
    this.editProdIsInWarehouse = p.isInWarehouse || false;
    this.editProdExpectedRestock = p.expectedRestockDate || '';
    this.editProdIsBoycott = p.isBoycott || false;
    this.editProdBoycottReason = p.boycottReason || '';
    this.editProdAlternatives = p.boycottAlternatives ? p.boycottAlternatives.join(' ، ') : '';
    this.editProdDescription = p.description || '';
    this.editProdImageUrl = p.imageUrl || '';
    this.editProdImagesStr = p.images ? p.images.join(', ') : '';
    this.openEditProductModal.set(true);
  }

  saveProductEdits() {
    const id = this.editingProductId();
    if (!id || !this.editProdName || this.editProdPrice === null) return;

    const finalCategory = (this.editProdCategory === 'أخرى' && this.customEditCategory.trim())
      ? this.customEditCategory.trim()
      : (this.editProdCategory === 'أخرى' ? 'قسم جديد' : this.editProdCategory);

    if (finalCategory && !this.service.categories().includes(finalCategory)) {
      this.service.addCategory(finalCategory);
    }

    const alts = this.editProdAlternatives ? this.editProdAlternatives.split('،').flatMap(a => a.split(',')).map(a => a.trim()).filter(Boolean) : [];
    const galleryImages = this.editProdImagesStr 
      ? this.editProdImagesStr.split('،').flatMap(a => a.split(',')).flatMap(a => a.split('\n')).map(a => a.trim()).filter(Boolean) 
      : [];

    this.service.updateProduct(id, {
      name: this.editProdName,
      category: finalCategory,
      price: Number(this.editProdPrice),
      stockQuantity: Number(this.editProdStock || 0),
      discountPercent: Number(this.editProdDiscount || 0),
      isBoycott: this.editProdIsBoycott,
      boycottReason: this.editProdBoycottReason || undefined,
      boycottAlternatives: alts,
      locationInStore: this.editProdLocationStore || 'الممر الرئيسي',
      locationInWarehouse: this.editProdLocationWarehouse || 'المخزن',
      isInWarehouse: this.editProdIsInWarehouse,
      expectedRestockDate: this.editProdExpectedRestock || undefined,
      description: this.editProdDescription,
      imageUrl: this.editProdImageUrl,
      images: galleryImages
    });

    this.openEditProductModal.set(false);
    this.editingProductId.set(null);
  }

  submitNewDebt() {
    if (this.newDebtCustomerName && this.newDebtAmount) {
      this.service.addCustomerDebt({
        customerName: this.newDebtCustomerName,
        customerPhone: this.newDebtCustomerPhone || 'غير محدد',
        debtAmount: Number(this.newDebtAmount),
        notes: this.newDebtNotes || 'مستحقات آجل',
        status: this.newDebtStatus
      });

      // Reset form & close modal
      this.newDebtCustomerName = '';
      this.newDebtCustomerPhone = '';
      this.newDebtAmount = null;
      this.newDebtNotes = '';
      this.newDebtStatus = 'معلق';
      this.openAddDebtModal.set(false);
    }
  }

  // Cloudinary Phone Camera & File Upload Handlers
  async onFileSelectedForAdd(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.uploadingAddImage.set(true);
      try {
        const url = await this.service.uploadImageToCloudinary(file);
        this.newProdImageUrl = url;
      } finally {
        this.uploadingAddImage.set(false);
      }
    }
  }

  async onFileSelectedForEdit(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.uploadingEditImage.set(true);
      try {
        const url = await this.service.uploadImageToCloudinary(file);
        this.editProdImageUrl = url;
      } finally {
        this.uploadingEditImage.set(false);
      }
    }
  }

  // Order Filters & Notification Helpers
  pendingOrdersCount() {
    return this.service.orders().filter(o => o.status === 'pending').length;
  }

  filteredOrders() {
    const status = this.orderFilterStatus();
    if (status === 'all') return this.service.orders();
    return this.service.orders().filter(o => o.status === status);
  }

  getStatusText(status: string) {
    switch (status) {
      case 'pending': return 'جديد - بانتظار التأكيد والتجهيز';
      case 'preparing': return 'قيد التجهيز والتقطيع بالمصنع';
      case 'on_the_way': return 'مع سائق الدليفري';
      case 'completed': return 'تم التوصيل واكتمال الطلب';
      case 'cancelled': return 'طلب ملغي';
      default: return status;
    }
  }

  getFilterStatusTitle() {
    switch (this.orderFilterStatus()) {
      case 'all': return 'جميع الطلبات';
      case 'pending': return 'الطلبات الجديدة';
      case 'preparing': return 'طلبات قيد التجهيز';
      case 'on_the_way': return 'طلبات مع سائق الدليفري';
      case 'completed': return 'الطلبات المكتملة';
      case 'cancelled': return 'الطلبات الملغاة';
      default: return 'الطلبات';
    }
  }

  assignDriverToOrder(orderId: string, driverId: string) {
    if (!driverId) return;
    const driver = this.service.deliveryDrivers().find(d => d.id === driverId);
    if (driver) {
      this.service.assignDriverToOrder(orderId, driver.id, driver.name);
    }
  }

  openAddProductWithPrefill(productName: string) {
    this.newProdName = productName;
    this.activeSubTab.set('inventory');
    this.openAddProductModal.set(true);
  }
}
