import { Component, inject, signal, computed, ViewChild, ElementRef, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { OmAlQuraService, OmAlQuraProduct, OmAlQuraOrder, OmAlQuraOrderItem, OmAlQuraCustomerDebt } from '../../../core/services/om-al-qura.service';
import { ImageFallbackDirective } from '../../../shared/directives/image-fallback.directive';

@Component({
  selector: 'app-om-al-qura-staff-portal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideDynamicIcon, ImageFallbackDirective],
  template: `
    <div class="space-y-8 font-sans" dir="rtl">
      
      <!-- Top Overview Bar -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-3xl p-5 shadow-lg flex items-center justify-between">
          <div>
            <p class="text-xs text-emerald-100 font-bold mb-1">الموظفون على رأس العمل</p>
            <h3 class="text-3xl font-black">{{ clockedInEmployeesCount() }} / {{ service.employees().length }}</h3>
          </div>
          <div class="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
            <svg lucideIcon="user-check" class="w-6 h-6 text-white"></svg>
          </div>
        </div>

        <div class="bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-3xl p-5 shadow-lg flex items-center justify-between">
          <div>
            <p class="text-xs text-amber-100 font-bold mb-1">طلبات واشعارات جديدة</p>
            <h3 class="text-3xl font-black">{{ service.newNotificationsCount() }}</h3>
          </div>
          <div class="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
            <svg lucideIcon="bell-ring" class="w-6 h-6 text-white animate-bounce"></svg>
          </div>
        </div>

        <div class="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-3xl p-5 shadow-lg flex items-center justify-between">
          <div>
            <p class="text-xs text-blue-100 font-bold mb-1">إجمالي ديون العملاء</p>
            <h3 class="text-3xl font-black">{{ totalDebtsAmount() }} <span class="text-sm font-normal">ج.م</span></h3>
          </div>
          <div class="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
            <svg lucideIcon="receipt" class="w-6 h-6 text-white"></svg>
          </div>
        </div>

        <div class="bg-gradient-to-br from-purple-600 to-pink-700 text-white rounded-3xl p-5 shadow-lg flex items-center justify-between">
          <div>
            <p class="text-xs text-purple-100 font-bold mb-1">منتجات منخفضة المخزون</p>
            <h3 class="text-3xl font-black">{{ service.lowStockProducts().length }}</h3>
          </div>
          <div class="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
            <svg lucideIcon="alert-triangle" class="w-6 h-6 text-white"></svg>
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
      </div>

      <!-- TAB 1: Attendance & Shift Clocking -->
      <div *ngIf="activeSubTab() === 'attendance'" class="space-y-6">
        <!-- Attendance Hero Header -->
        <div class="bg-gradient-to-br from-emerald-700 via-teal-700 to-emerald-800 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-emerald-400/20">
          <div class="flex flex-col md:flex-row items-center justify-between gap-6">
            <div class="flex items-center gap-4">
              <div class="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-lg">
                <svg lucideIcon="clock" class="w-9 h-9 text-white"></svg>
              </div>
              <div>
                <h2 class="text-2xl md:text-3xl font-black text-white flex items-center gap-2">
                  <span>تسجيل الحضور والانصراف</span>
                </h2>
                <p class="text-emerald-100 text-sm mt-1">اضغط على اسمك ثم أدخل كود اليوم من المدير لتثبيت وجودك في المتجر</p>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-4">
              <div class="px-4 py-2.5 bg-emerald-500/20 border border-emerald-400/30 rounded-2xl text-xs font-bold text-emerald-100 flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>الحاضرون الآن: {{ clockedInEmployeesCount() }} موظف</span>
              </div>

              <div class="text-left bg-black/20 rounded-2xl px-6 py-3 border border-white/10 backdrop-blur-md">
                <div class="text-xs text-emerald-200 font-bold uppercase tracking-wider">الوقت الحالي</div>
                <div class="text-2xl font-black font-mono text-amber-300 mt-0.5" dir="ltr">{{ nowLabel }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div *ngIf="service.employees().length > 0; else noAttendanceEmployees" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div *ngFor="let emp of service.employees()"
                 (click)="openAttendanceModal(emp.id)"
                 class="bg-slate-50 dark:bg-slate-800/80 rounded-3xl p-5 border border-slate-200 dark:border-slate-700/60 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden">
              
              <div class="flex items-center justify-between mb-3">
                <span class="px-3 py-1 rounded-full text-xs font-black"
                      [ngClass]="emp.shiftStatus === 'clocked_in' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'">
                  {{ emp.shiftStatus === 'clocked_in' ? 'حاضر الآن' : 'منصرف' }}
                </span>
                <span class="text-xs font-bold text-slate-400">{{ emp.role }}</span>
              </div>

              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-black text-lg border border-emerald-300 dark:border-emerald-800">
                  {{ emp.name.charAt(0) }}
                </div>
                <div>
                  <h3 class="font-black text-slate-900 dark:text-white text-base group-hover:text-emerald-600 transition-colors">{{ emp.name }}</h3>
                  <p class="text-xs text-slate-500 mt-0.5" *ngIf="emp.lastClockIn">آخر حضور: {{ emp.lastClockIn }}</p>
                  <p class="text-xs text-slate-400 mt-0.5" *ngIf="!emp.lastClockIn">الهاتف: {{ emp.phone }}</p>
                </div>
              </div>

              <button *ngIf="!emp.isSuspended"
                      type="button"
                      (click)="openAttendanceModal(emp.id); $event.stopPropagation()"
                      class="w-full mt-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm relative z-10"
                      [ngClass]="emp.shiftStatus === 'clocked_in' ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 hover:bg-rose-100' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'">
                <svg lucideIcon="log-in" class="w-4 h-4" *ngIf="emp.shiftStatus !== 'clocked_in'"></svg>
                <svg lucideIcon="log-out" class="w-4 h-4" *ngIf="emp.shiftStatus === 'clocked_in'"></svg>
                <span>{{ emp.shiftStatus === 'clocked_in' ? 'تسجيل انصراف' : 'تسجيل حضور' }}</span>
              </button>

              <div *ngIf="emp.isSuspended" class="text-xs font-bold text-rose-600 text-center py-2.5 mt-4 bg-rose-50 dark:bg-rose-950/40 rounded-xl">
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
                    <span class="px-2.5 py-1 rounded-full text-xs font-black"
                          [ngClass]="log.type === 'in' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'">
                      {{ log.type === 'in' ? 'حضور' : 'انصراف' }}
                    </span>
                  </td>
                  <td class="p-3 text-slate-500 text-xs">{{ log.date }}</td>
                  <td class="p-3 font-mono text-xs text-right text-slate-600 dark:text-slate-400" dir="ltr">{{ log.time }}</td>
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
            <h2 class="text-xl font-black text-slate-900 dark:text-white">إدارة المنتجات والمخزون والأقسام</h2>
            <p class="text-xs text-slate-500">إضافة المنتجات والأسعار وتخصيص قائمة المقاطعة وإدارة وتسمية أقسام المتجر</p>
          </div>
          <button (click)="openAddProductModal.set(true)" type="button" class="px-5 py-2.5 rounded-2xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-md cursor-pointer">
            <svg lucideIcon="plus" class="w-4 h-4"></svg>
            <span>+ إضافة منتج جديد</span>
          </button>
        </div>

        <!-- Categories Management Section (تسمية وإدارة الأقسام للموظفين) -->
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div class="flex flex-wrap justify-between items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 class="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <svg lucideIcon="tags" class="w-5 h-5 text-emerald-600"></svg>
                <span>إدارة وتسمية أقسام المنظفات والمنتجات</span>
              </h3>
              <p class="text-xs text-slate-500">يمكن للموظفين إضافة أقسام جديدة، إعادة تسميتها وتعديل أسمائها، أو حذفها نهائياً.</p>
            </div>

            <button (click)="promptAddCategory()"
                    class="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 shrink-0">
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
                  <span>مكان المنتج بالمحل:</span>
                  <span class="font-bold text-slate-800 dark:text-white">{{ p.locationInStore }}</span>
                </div>
                <div *ngIf="p.isBoycott" class="text-rose-600 font-bold border-t border-rose-100 pt-1.5 mt-1.5">
                  البدائل: {{ p.boycottAlternatives.join(' ، ') || 'لا توجد بدائل محددة' }}
                </div>
              </div>
            </div>

            <div class="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button (click)="openEditProduct(p)" class="flex-1 py-1.5 px-3 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-bold hover:bg-blue-200 transition-all flex items-center justify-center gap-1">
                <svg lucideIcon="edit-3" class="w-3.5 h-3.5"></svg>
                <span>تعديل المنتج</span>
              </button>
              
              <div class="flex items-center gap-1">
                <input type="number" [(ngModel)]="stockUpdateAmount[p.id]" placeholder="الكمية" class="w-16 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-xs font-bold text-center border-none">
                <button (click)="quickUpdateStock(p, stockUpdateAmount[p.id] || 10)" class="py-1.5 px-3 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-200 shrink-0">
                  إضافة
                </button>
              </div>

              <button (click)="service.deleteProduct(p.id)" class="py-1.5 px-3 rounded-xl bg-rose-100 text-rose-700 text-xs font-bold hover:bg-rose-200 shrink-0">
                حذف
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 3: POS & Bills Generator -->
      <div *ngIf="activeSubTab() === 'pos'" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Products selector for POS with Instant Search & Category Filter -->
        <div class="lg:col-span-2 space-y-4">
          <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            
            <div class="flex flex-wrap items-center justify-between gap-3">
              <h2 class="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <svg lucideIcon="shopping-bag" class="w-5 h-5 text-emerald-600"></svg>
                <span>اختيار المنتجات لنقطة البيع (POS)</span>
              </h2>
              <span class="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                {{ filteredPosProducts().length }} منتج متاح
              </span>
            </div>

            <!-- Instant Search Input & Category Filter Bar -->
            <div class="flex flex-wrap items-center gap-3">
              <div class="relative flex-1 min-w-[240px]">
                <input type="text"
                       [ngModel]="posSearchQuery()"
                       (ngModelChange)="posSearchQuery.set($event)"
                       placeholder="🔍 ابحث عن اسم المنتج، السعر، أو الكود سريعا الكاشير..."
                       class="w-full pl-4 pr-11 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all">
                <div class="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg lucideIcon="search" class="w-4 h-4"></svg>
                </div>
                <button *ngIf="posSearchQuery()" (click)="posSearchQuery.set('')" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-black cursor-pointer">
                  ✕
                </button>
              </div>

              <!-- Quick Category Filter Buttons -->
              <div class="flex items-center gap-1.5 overflow-x-auto custom-scrollbar shrink-0 max-w-full">
                <button (click)="posCategoryFilter.set('all')"
                        class="px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer"
                        [ngClass]="posCategoryFilter() === 'all' ? 'bg-emerald-600 text-white shadow-sm font-black' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'">
                  الكل
                </button>
                <button *ngFor="let cat of posCategories()"
                        (click)="posCategoryFilter.set(cat)"
                        class="px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer"
                        [ngClass]="posCategoryFilter() === cat ? 'bg-emerald-600 text-white shadow-sm font-black' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'">
                  {{ cat }}
                </button>
              </div>
            </div>

            <!-- Filtered Product Cards Grid -->
            <div *ngIf="filteredPosProducts().length > 0; else noPosResults" class="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[460px] overflow-y-auto pr-1 custom-scrollbar">
              <div *ngFor="let p of filteredPosProducts()" (click)="addPosItem(p)"
                   class="p-3 bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-2xl border border-slate-200 dark:border-slate-700 cursor-pointer transition-all hover:scale-[1.02] shadow-xs hover:border-emerald-400 group">
                <div class="flex items-center gap-2">
                  <img *ngIf="p.imageUrl" [src]="p.imageUrl" [alt]="p.name" appImageFallback class="w-9 h-9 rounded-xl object-cover shrink-0">
                  <div class="min-w-0 flex-1">
                    <p class="font-black text-slate-900 dark:text-white text-xs truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400">{{ p.name }}</p>
                    <span class="text-[10px] text-slate-400 block truncate">{{ p.category || 'عام' }}</span>
                  </div>
                </div>
                <div class="flex justify-between items-center mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                  <span class="text-xs text-emerald-600 dark:text-emerald-400 font-black">{{ p.price }} ج.م</span>
                  <span class="text-[10px] font-bold" [ngClass]="p.stockQuantity > 0 ? 'text-slate-500' : 'text-rose-500 font-black'">
                    {{ p.stockQuantity > 0 ? 'المخزون: ' + p.stockQuantity : 'نفد!' }}
                  </span>
                </div>
              </div>
            </div>

            <ng-template #noPosResults>
              <div class="text-center py-10 text-slate-400 space-y-2">
                <svg lucideIcon="search-x" class="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600"></svg>
                <p class="font-bold text-xs">لا توجد منتجات تطابق بحثك "{{ posSearchQuery() }}"</p>
                <button (click)="posSearchQuery.set(''); posCategoryFilter.set('all')" class="text-xs text-emerald-600 font-bold underline cursor-pointer">إعادة ضبط البحث</button>
              </div>
            </ng-template>

          </div>
        </div>

        <!-- POS Invoice Summary & Quantity Controls -->
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-black text-slate-900 dark:text-white">فاتورة الكاشير المباشرة</h3>
              <button *ngIf="posItems().length > 0" (click)="posItems.set([])" class="text-xs font-bold text-rose-500 hover:text-rose-700 underline cursor-pointer">
                تفريغ السلة
              </button>
            </div>
            
            <div class="space-y-2.5 max-h-72 overflow-y-auto mb-4 custom-scrollbar pr-0.5">
              <div *ngFor="let item of posItems()" class="flex justify-between items-center text-xs p-2.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/60">
                <div class="min-w-0 flex-1 pr-1">
                  <p class="font-black text-slate-900 dark:text-white truncate">{{ item.product.name }}</p>
                  <p class="text-[11px] text-emerald-600 font-bold mt-0.5">{{ item.product.price }} ج.م × {{ item.quantity }} = {{ item.product.price * item.quantity }} ج.م</p>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                  <button (click)="decrementPosItem(item.product.id)" class="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-rose-100 text-slate-700 dark:text-slate-200 font-black flex items-center justify-center text-xs transition-all cursor-pointer">-</button>
                  <span class="font-black text-xs px-1 text-slate-900 dark:text-white">{{ item.quantity }}</span>
                  <button (click)="incrementPosItem(item.product.id)" class="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-emerald-100 text-slate-700 dark:text-slate-200 font-black flex items-center justify-center text-xs transition-all cursor-pointer">+</button>
                  <button (click)="removePosItem(item.product.id)" class="text-slate-400 hover:text-rose-500 p-1 mr-1 transition-all cursor-pointer" title="حذف المنتج من الفاتورة">
                    <svg lucideIcon="trash-2" class="w-3.5 h-3.5"></svg>
                  </button>
                </div>
              </div>
              <div *ngIf="posItems().length === 0" class="text-center text-slate-400 py-12 text-xs font-bold space-y-1">
                <svg lucideIcon="shopping-cart" class="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2"></svg>
                <p>لم يتم إضافة منتجات بعد</p>
                <p class="text-[10px] font-normal text-slate-400">اضغط على أي منتج من القائمة لإضافته للفاتورة</p>
              </div>
            </div>
          </div>

          <div class="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div class="flex justify-between text-lg font-black">
              <span>الإجمالي:</span>
              <span class="text-emerald-600 dark:text-emerald-400">{{ posTotal() }} ج.م</span>
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
                    class="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl disabled:opacity-40 transition-all shadow-md cursor-pointer">
              🖨️ طباعة وإصدار الفاتورة
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
              قيد التجهيز بالمحل
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

            <button (click)="orderFilterStatus.set('cancelled')"
                    class="px-4 py-2 rounded-2xl text-xs font-bold transition-all border shrink-0 flex items-center gap-1.5"
                    [ngClass]="orderFilterStatus() === 'cancelled' ? 'bg-rose-600 text-white border-rose-600 shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'">
              <span>طلبات ملغاة</span>
              <span *ngIf="cancelledOrdersCount() > 0" class="bg-rose-950 text-white text-[10px] px-1.5 py-0.5 rounded-full font-black">
                {{ cancelledOrdersCount() }}
              </span>
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
                  {{ getStatusText(ord.status, ord.cancellationReason) }}
                </span>
              </div>

              <div class="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                <svg lucideIcon="clock" class="w-3.5 h-3.5 text-amber-500"></svg>
                <span>وقت الطلب: {{ ord.createdAt }}</span>
              </div>
            </div>

            <!-- Cancellation Warning Alert Banner for Staff -->
            <div *ngIf="ord.status === 'cancelled'" class="p-3.5 bg-rose-500/15 border-2 border-rose-500/80 rounded-2xl text-xs text-rose-900 dark:text-rose-200 font-bold flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black shrink-0 shadow-md">
                <svg lucideIcon="ban" class="w-5 h-5 animate-pulse"></svg>
              </div>
              <div>
                <p class="font-black text-rose-800 dark:text-rose-300 text-sm">🛑 تم إلغاء هذا الطلب من قبل العميل</p>
                <p class="text-[11px] font-bold text-slate-600 dark:text-slate-300 mt-0.5">
                  السبب: <span class="text-rose-700 dark:text-rose-300 font-black">{{ ord.cancellationReason || 'قام العميل بإلغاء الطلب من متجر العملاء' }}</span>
                  • وقت الإلغاء: {{ ord.cancelledAt || ord.createdAt }} (تم إرجاع كميات الأصناف لمخزون المحل تلقائياً)
                </p>
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
                <div *ngIf="ord.status === 'cancelled'" class="px-4 py-2 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-200 font-black text-xs border border-rose-300 dark:border-rose-800 flex items-center gap-1.5 shadow-sm">
                  <svg lucideIcon="ban" class="w-4 h-4 text-rose-600 animate-pulse"></svg>
                  <span>🛑 الطلب ملغي من قبل العميل - محظور التنفيذ</span>
                </div>

                <button (click)="service.updateOrderStatus(ord.id, 'preparing')" *ngIf="ord.status === 'pending'"
                        class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-2xl shadow-md transition-all flex items-center gap-1.5">
                  <svg lucideIcon="check-circle" class="w-4 h-4"></svg>
                  <span>تأكيد وبدء تجهيز المنتجات بالمحل</span>
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

                <button (click)="service.cancelOrder(ord.id, 'تم الإلغاء بواسطة طاقم العمل')" *ngIf="ord.status !== 'completed' && ord.status !== 'cancelled'"
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
                <span>رغبات العملاء بالمنتجات غير المتوفرة بالمتجر</span>
              </h3>
              <p class="text-xs text-slate-500">طلبات المراجعة الواردة من الزبائن لتوفير منظفات أو أصناف ناقصة</p>
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
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 max-w-2xl w-full font-sans dir-rtl space-y-5 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
          <div class="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 class="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <svg lucideIcon="package-plus" class="w-5 h-5 text-emerald-600 dark:text-emerald-400"></svg>
              <span>إضافة منتج جديد للمخزون والمحل</span>
            </h3>
            <button (click)="openAddProductModal.set(false)" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl">
              <svg lucideIcon="x" class="w-5 h-5"></svg>
            </button>
          </div>

          <form (ngSubmit)="saveNewProduct()" class="space-y-4 text-xs">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">اسم المنظف / المنتج *</label>
                <select [(ngModel)]="newProdName" name="newProdNameSelect" class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500">
                  <option value="" disabled>اختر منتجاً...</option>
                  <option *ngFor="let prod of service.products()" [value]="prod.name">{{ prod.name }}</option>
                  <option value="جديد">منتج جديد (اكتب اسماً مخصصاً)</option>
                </select>
                <input *ngIf="newProdName === 'جديد'" type="text" [(ngModel)]="newProdName" name="newProdNameCustom" placeholder="اكتب اسم المنتج الجديد..."
                       class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold mt-2">
              </div>

              <div>
                <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">القسم / التصنيف *</label>
                <select [(ngModel)]="newProdCategory" name="newProdCatSelect" class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500">
                  <option *ngFor="let cat of service.categories()" [value]="cat">{{ cat }}</option>
                  <option value="أخرى">أخرى (كتابة قسم جديد)</option>
                </select>

                <div *ngIf="newProdCategory === 'أخرى'" class="mt-2">
                  <input type="text" [(ngModel)]="customProdCategory" name="customCatInput" placeholder="اكتب اسم القسم الجديد هنا..." required
                         class="w-full p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-700 text-slate-900 dark:text-white text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500">
                </div>
              </div>

              <div class="sm:col-span-2 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div class="flex justify-between items-center">
                  <label class="block font-black text-slate-900 dark:text-white text-xs">🏷️ الكود التسلسلي / الباركود (Serial / Barcode)</label>
                  <button type="button" (click)="generateNewBarcode()" class="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1">
                    <svg lucideIcon="sparkles" class="w-3.5 h-3.5"></svg>
                    <span>توليد باركود تلقائي</span>
                  </button>
                </div>
                <input type="text" [(ngModel)]="newProdBarcode" name="newBarcode" placeholder="مثال: 690123456789 (أو امسح بقارئ الأكواد)"
                       class="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500">
              </div>

              <div>
                <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">السعر (ج.م) *</label>
                <input type="number" [(ngModel)]="newProdPrice" name="newPrice" min="0" placeholder="0"
                       class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500">
              </div>

              <div>
                <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">العدد / الكمية المتاحة *</label>
                <input type="number" [(ngModel)]="newProdStock" name="newStock" min="0" placeholder="0"
                       class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500">
              </div>

              <div>
                <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">مكان المنتج بالمحل (الرف/الممر) *</label>
                <input type="text" [(ngModel)]="newProdLocationStore" name="newLocStore" placeholder="مثال: الممر 2 - رف B3"
                       class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500">
              </div>

              <div>
                <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">مكان التخزين بالمخزن الداخلي</label>
                <input type="text" [(ngModel)]="newProdLocationWarehouse" name="newLocWarehouse" placeholder="مثال: المخزن - رف W-1"
                       class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500">
              </div>

              <div class="sm:col-span-2">
                <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">موعد التوفر المتوقع (عند نفاد المخزون)</label>
                <input type="text" [(ngModel)]="newProdExpectedRestock" name="newRestock" placeholder="مثال: غداً 4 مساءً أو خلال 24 ساعة"
                       class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500">
              </div>

              <div class="sm:col-span-2 flex items-center gap-3 pt-2">
                <input type="checkbox" [(ngModel)]="newProdIsInWarehouse" name="newInWh" id="addWarehouseCheck" class="w-4 h-4 text-emerald-600 rounded">
                <label for="addWarehouseCheck" class="font-bold text-slate-800 dark:text-slate-200 text-xs cursor-pointer">متوفر حالياً بالمخزن الداخلي (وليس العرض فقط)</label>
              </div>

              <div class="sm:col-span-2">
                <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">وصف المنتج</label>
                <textarea [(ngModel)]="newProdDescription" name="newDesc" rows="2" placeholder="وصف قصير للمنتج..."
                          class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"></textarea>
              </div>

              <div class="sm:col-span-2 space-y-2">
                <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">صورة المنتج (من الهاتف / الكاميرا عبر Cloudinary)</label>
                <div class="flex flex-wrap items-center gap-3">
                  <label class="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-2">
                    <svg lucideIcon="camera" class="w-4 h-4"></svg>
                    <span>{{ uploadingAddImage() ? 'جاري الرفع على Cloudinary...' : '📸 التقاط صورة بالكاميرا / رفع من الجوال' }}</span>
                    <input type="file" accept="image/*" capture="environment" class="hidden" (change)="onFileSelectedForAdd($event)" [disabled]="uploadingAddImage()">
                  </label>
                  <span class="text-xs text-slate-400 font-bold">أو رابط صورة:</span>
                  <input type="text" [(ngModel)]="newProdImageUrl" name="newImgUrl" placeholder="https://..." class="flex-1 min-w-[200px] p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white">
                </div>
                <div *ngIf="newProdImageUrl" class="flex items-center gap-3 pt-2">
                  <img [src]="newProdImageUrl" appImageFallback class="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500 shadow-md">
                  <div class="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">✓ تم تجهيز ومعاينة صورة المنتج</div>
                </div>
              </div>

              <div class="sm:col-span-2 p-4 bg-rose-50 dark:bg-rose-950/20 rounded-2xl border border-rose-200 dark:border-rose-900/40 space-y-3">
                <div class="flex items-center gap-2">
                  <input type="checkbox" [(ngModel)]="newProdIsBoycott" name="newBoycott" id="boycottCheck" class="w-4 h-4 text-rose-600 rounded">
                  <label for="boycottCheck" class="font-black text-rose-600 text-xs cursor-pointer">علامة: هذا المنتج ضمن قائمة المقاطعة</label>
                </div>
                <div *ngIf="newProdIsBoycott" class="space-y-2">
                  <div>
                    <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">سبب المقاطعة</label>
                    <input type="text" [(ngModel)]="newProdBoycottReason" name="newBoycottReason" placeholder="مثال: شركة داعمة بشكل مباشر للمحتل" class="w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                  </div>
                  <div>
                    <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">قائمة البدائل الوطنية المطابقة (تفصل بينها بفصلة)</label>
                    <input type="text" [(ngModel)]="newProdAlternatives" name="newBoycottAlts" placeholder="مثال: سبيرو سباتس كولا، عصير سينا كولا" class="w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                  </div>
                </div>
              </div>
            </div>

            <div class="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
              <button type="button" (click)="openAddProductModal.set(false)" class="px-5 py-2.5 rounded-2xl text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 text-xs">
                إلغاء
              </button>
              <button type="submit" [disabled]="!newProdName || newProdPrice === null"
                      class="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md flex items-center gap-2 cursor-pointer">
                <svg lucideIcon="check" class="w-4 h-4"></svg>
                <span>حفظ وتسجيل المنتج</span>
              </button>
            </div>
          </form>
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

          <form (ngSubmit)="submitAddSupplier()" class="space-y-4 text-xs">
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">اسم الشركة / المصنع المورد *</label>
              <input type="text" [(ngModel)]="newSuppCompanyName" name="suppCompanyName" required
                     placeholder="مثال: شركة النيل للمنظفات / مصنع الأهرام للبلاستيك"
                     class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500">
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">اسم المندوب / المسؤول المباشر *</label>
              <input type="text" [(ngModel)]="newSuppName" name="suppName" required
                     placeholder="مثال: أ/ محمد عبد الرحمن"
                     class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500">
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">رقم الهاتف للاتصال والواتساب *</label>
              <input type="tel" [(ngModel)]="newSuppPhone" name="suppPhone" required dir="ltr"
                     placeholder="010XXXXXXXX"
                     class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-right font-mono font-bold focus:ring-2 focus:ring-emerald-500">
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">الأقسام والمنتجات الموردة (مفصولة بفاصلة)</label>
              <input type="text" [(ngModel)]="newSuppCategoriesStr" name="suppCategories"
                     placeholder="مثال: مساحيق غسيل، مطهرات، أدوات نظافة"
                     class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500">
            </div>

            <div class="pt-3 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
              <button type="button" (click)="openAddSupplierModal.set(false)" class="px-5 py-2.5 rounded-2xl text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 text-xs">
                إلغاء
              </button>
              <button type="submit" [disabled]="!newSuppCompanyName || !newSuppName || !newSuppPhone"
                      class="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md flex items-center gap-2 cursor-pointer">
                <svg lucideIcon="check" class="w-4 h-4"></svg>
                <span>حفظ وتسجيل المورد</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- EDIT PRODUCT MODAL DIALOG -->
      <div *ngIf="openEditProductModal()" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 max-w-2xl w-full font-sans dir-rtl space-y-5 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
          <div class="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 class="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <svg lucideIcon="edit-3" class="w-5 h-5 text-emerald-600 dark:text-emerald-400"></svg>
              <span>تعديل تفاصيل المنتج وتصنيفه</span>
            </h3>
            <button (click)="openEditProductModal.set(false)" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl">
              <svg lucideIcon="x" class="w-5 h-5"></svg>
            </button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">اسم المنتج / المنظف *</label>
              <input type="text" [(ngModel)]="editProdName" class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500">
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">القسم / التصنيف *</label>
              <select [(ngModel)]="editProdCategory" class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500">
                <option *ngFor="let cat of service.categories()" [value]="cat">{{ cat }}</option>
                <option value="أخرى">أخرى (كتابة قسم جديد)</option>
              </select>

              <div *ngIf="editProdCategory === 'أخرى'" class="mt-2">
                <input type="text" [(ngModel)]="customEditCategory" placeholder="اكتب اسم القسم الجديد هنا..." required
                       class="w-full p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-700 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-emerald-500">
              </div>
            </div>

            <div class="sm:col-span-2 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div class="flex justify-between items-center">
                <label class="block font-black text-slate-900 dark:text-white text-xs">🏷️ الكود التسلسلي / الباركود (Serial / Barcode)</label>
                <button type="button" (click)="generateEditBarcode()" class="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1">
                  <svg lucideIcon="sparkles" class="w-3.5 h-3.5"></svg>
                  <span>توليد باركود جديد</span>
                </button>
              </div>
              <input type="text" [(ngModel)]="editProdBarcode" placeholder="مثال: 690123456789"
                     class="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500">
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">السعر (ج.م) *</label>
              <input type="number" [(ngModel)]="editProdPrice" min="0" class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500">
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">العدد / الكمية المتاحة *</label>
              <input type="number" [(ngModel)]="editProdStock" min="0" class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500">
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">نسبة الخصم (%)</label>
              <input type="number" [(ngModel)]="editProdDiscount" min="0" max="100" class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500">
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">مكان المنتج بالمحل (الرف/الممر) *</label>
              <input type="text" [(ngModel)]="editProdLocationStore" class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500">
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">مكان التخزين بالمخزن الداخلي</label>
              <input type="text" [(ngModel)]="editProdLocationWarehouse" class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500">
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">موعد التوفر المتوقع (عند نفاد المخزون)</label>
              <input type="text" [(ngModel)]="editProdExpectedRestock" placeholder="مثال: غداً 4 مساءً أو خلال 24 ساعة" class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500">
            </div>

            <div class="sm:col-span-2 flex items-center gap-3 pt-2">
              <input type="checkbox" [(ngModel)]="editProdIsInWarehouse" id="editWarehouseCheck" class="w-4 h-4 text-emerald-600 rounded">
              <label for="editWarehouseCheck" class="font-bold text-slate-800 dark:text-slate-200 text-xs cursor-pointer">متوفر حالياً بالمخزن الداخلي (وليس العرض فقط)</label>
            </div>

            <div class="sm:col-span-2">
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">وصف المنتج</label>
              <textarea [(ngModel)]="editProdDescription" rows="2" class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"></textarea>
            </div>

            <div class="sm:col-span-2 space-y-2">
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">صورة المنتج (تعديل من الهاتف / الكاميرا عبر Cloudinary)</label>
              
              <div class="flex flex-wrap items-center gap-3">
                <label class="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-2">
                  <svg lucideIcon="camera" class="w-4 h-4"></svg>
                  <span>{{ uploadingEditImage() ? 'جاري الرفع على Cloudinary...' : '📸 تغيير الصورة بالكاميرا / الجوال' }}</span>
                  <input type="file" accept="image/*" capture="environment" class="hidden" (change)="onFileSelectedForEdit($event)" [disabled]="uploadingEditImage()">
                </label>

                <span class="text-xs text-slate-400 font-bold">أو رابط صورة:</span>

                <input type="text" [(ngModel)]="editProdImageUrl" placeholder="https://..." class="flex-1 min-w-[200px] p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white">
              </div>

              <div *ngIf="editProdImageUrl" class="flex items-center gap-3 pt-2">
                <img [src]="editProdImageUrl" appImageFallback class="w-16 h-16 rounded-2xl object-cover border-2 border-blue-500 shadow-md">
                <div class="text-[11px] text-blue-600 dark:text-blue-400 font-bold">
                  ✓ معاينة الصورة الجديدة للمنتج
                </div>
              </div>
            </div>

            <div class="sm:col-span-2 p-4 bg-rose-50 dark:bg-rose-950/20 rounded-2xl border border-rose-200 dark:border-rose-900/40 space-y-3">
              <div class="flex items-center gap-2">
                <input type="checkbox" [(ngModel)]="editProdIsBoycott" id="editBoycottCheck" class="w-4 h-4 text-rose-600 rounded">
                <label for="editBoycottCheck" class="font-black text-rose-600 text-xs cursor-pointer">علامة: هذا المنتج ضمن قائمة المقاطعة</label>
              </div>

              <div *ngIf="editProdIsBoycott" class="space-y-2">
                <div>
                  <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">سبب المقاطعة</label>
                  <input type="text" [(ngModel)]="editProdBoycottReason" placeholder="مثال: شركة داعمة بشكل مباشر للمحتل" class="w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                </div>
                <div>
                  <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">قائمة البدائل الوطنية المطابقة (تفصل بينها بفصلة)</label>
                  <input type="text" [(ngModel)]="editProdAlternatives" class="w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
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

      <!-- Daily Attendance Code Modal -->
      <div *ngIf="showAttendanceCodeModal()" class="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6 font-sans">
          <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <svg lucideIcon="shield-check" class="w-6 h-6"></svg>
              </div>
              <div>
                <h3 class="text-lg font-black text-slate-900 dark:text-white">{{ attendanceCodeAction === 'in' ? 'تسجيل حضور' : 'تسجيل انصراف' }}</h3>
                <p class="text-xs text-slate-500">أدخل الكود المتغير لتأكيد وجودك في المتجر</p>
              </div>
            </div>
            <button (click)="showAttendanceCodeModal.set(false)" aria-label="إغلاق النافذة" title="إغلاق" class="text-slate-400 hover:text-slate-600 p-2 rounded-xl">
              <svg lucideIcon="x" class="w-6 h-6"></svg>
            </button>
          </div>

          <div class="text-center">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">كود الحضور (يتغير كل 5 دقائق من المدير)</label>
            <input #attendanceInput type="text" [(ngModel)]="attendanceCodeInput" name="attendanceCode" inputmode="numeric" maxlength="4" dir="ltr"
                   placeholder="0000"
                   (keyup.enter)="confirmAttendanceCode()"
                   class="w-32 mx-auto text-center text-2xl font-black tracking-[0.3em] px-4 py-3 rounded-2xl border-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                   [ngClass]="attendanceCodeError() ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'">
            <div *ngIf="attendanceCodeError()" class="mt-2 text-xs font-bold text-rose-600">
              الكود غير صحيح أو انتهت صلاحيته! يرجى طلب الكود الحالي من المدير
            </div>
          </div>

          <div class="flex gap-3">
            <button (click)="confirmAttendanceCode()" type="button"
                    class="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5">
              <svg lucideIcon="check-circle" class="w-4 h-4"></svg>
              <span>{{ attendanceCodeAction === 'in' ? 'تأكيد الحضور' : 'تأكيد الانصراف' }}</span>
            </button>
            <button (click)="showAttendanceCodeModal.set(false)" type="button"
                    class="px-5 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-2xl text-sm transition-all cursor-pointer">
              إلغاء
            </button>
          </div>
        </div>
      </div>

    </div>
  `
})
export class OmAlQuraStaffPortalComponent implements OnDestroy {
  service = inject(OmAlQuraService);

  activeSubTab = signal<'attendance' | 'inventory' | 'pos' | 'notifications' | 'debts' | 'suggestions'>('attendance');
  orderFilterStatus = signal<'all' | 'pending' | 'preparing' | 'on_the_way' | 'completed' | 'cancelled'>('all');
  openAddProductModal = signal(false);
  openAddDebtModal = signal(false);
  openAddFaqModal = signal(false);
  openEditProductModal = signal(false);

  // Daily Attendance Code modal state
  showAttendanceCodeModal = signal(false);
  attendanceCodeInput = '';
  attendanceCodeAction: 'in' | 'out' = 'in';
  attendanceCodeEmployeeId: string | null = null;
  attendanceCodeError = signal(false);

  nowLabel = '';
  private clockTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.updateClock();
    this.clockTimer = setInterval(() => this.updateClock(), 1000);
  }

  ngOnDestroy() {
    if (this.clockTimer) clearInterval(this.clockTimer);
  }

  private updateClock() {
    this.nowLabel = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  @ViewChild('attendanceInput') set attendanceInput(ref: ElementRef<HTMLInputElement>) {
    if (ref) {
      setTimeout(() => ref.nativeElement.focus(), 50);
    }
  }

  openAttendanceModal(employeeId: string) {
    const emp = this.service.employees().find(e => e.id === employeeId);
    if (!emp || emp.isSuspended) return;
    this.openAttendanceCodeModal(employeeId, emp.shiftStatus === 'clocked_in' ? 'out' : 'in');
  }

  openAttendanceCodeModal(employeeId: string, action: 'in' | 'out') {
    this.attendanceCodeEmployeeId = employeeId;
    this.attendanceCodeAction = action;
    this.attendanceCodeInput = '';
    this.attendanceCodeError.set(false);
    this.showAttendanceCodeModal.set(true);
  }

  confirmAttendanceCode() {
    if (!this.attendanceCodeEmployeeId) return;
    if (!this.service.validateAttendanceCode(this.attendanceCodeInput)) {
      this.attendanceCodeError.set(true);
      return;
    }
    if (this.attendanceCodeAction === 'in') {
      this.service.clockIn(this.attendanceCodeEmployeeId, this.attendanceCodeInput);
    } else {
      this.service.clockOut(this.attendanceCodeEmployeeId, this.attendanceCodeInput);
    }
    this.showAttendanceCodeModal.set(false);
    this.attendanceCodeInput = '';
    this.attendanceCodeEmployeeId = null;
  }

  uploadingAddImage = signal(false);
  uploadingEditImage = signal(false);

  editingProductId = signal<string | null>(null);

  // Debt Form State
  newDebtCustomerName = '';
  newDebtCustomerPhone = '';
  newDebtAmount: number | null = null;
  newDebtNotes = '';
  newDebtStatus: OmAlQuraCustomerDebt['status'] = 'معلق';

  // Edit Product Form state
  editProdName = '';
  editProdCategory = 'منظفات ومساحيق غسيل';
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

  // FAQ State
  newFaqQuestion = '';
  newFaqAnswer = '';
  newFaqCategory = 'عام';

  // Products Management Form state
  newProdName = '';
  newProdCategory = 'منظفات ومساحيق غسيل';
  customProdCategory = '';
  newProdPrice: number | null = null;
  newProdStock: number | null = 10;
  newProdDiscount: number | null = 0;
  newProdLocationStore = 'الممر الرئيسي';
  newProdLocationWarehouse = '';
  newProdIsInWarehouse = false;
  newProdExpectedRestock = '';
  newProdIsBoycott = false;
  newProdBoycottReason = '';
  newProdAlternatives = '';
  newProdDescription = '';
  newProdImageUrl = '';
  newProdBarcode = '';
  
  // Stock update helper state
  stockUpdateAmount: { [prodId: string]: number } = {};

  editProdBarcode = '';

  generateNewBarcode() {
    this.newProdBarcode = `690${Math.floor(100000000 + Math.random() * 900000000)}`;
  }

  generateEditBarcode() {
    this.editProdBarcode = `690${Math.floor(100000000 + Math.random() * 900000000)}`;
  }

  staffTabs: { id: 'attendance' | 'inventory' | 'pos' | 'notifications' | 'debts' | 'suggestions'; label: string; icon: string }[] = [
    { id: 'attendance', label: 'الحضور والانصراف', icon: 'clock' },
    { id: 'inventory', label: 'إدارة المنتجات والمخزون', icon: 'package' },
    { id: 'pos', label: 'الفواتير والكاشير (POS)', icon: 'shopping-bag' },
    { id: 'notifications', label: 'إشعارات الطلبات والحجز', icon: 'bell' },
    { id: 'debts', label: 'دفتر ديون العملاء', icon: 'receipt' },
    { id: 'suggestions', label: 'المقترحات والأسئلة الشائعة', icon: 'lightbulb' }
  ];

  // Suggestion State
  newSugTitle = '';
  newSugDetails = '';

  clockedInEmployeesCount() {
    return this.service.employees().filter(e => e.shiftStatus === 'clocked_in').length;
  }

  totalDebtsAmount() {
    return this.service.customerDebts().reduce((acc, d) => acc + d.debtAmount, 0);
  }

  // POS State & Instant Search Filter
  posItems = signal<OmAlQuraOrderItem[]>([]);
  posSearchQuery = signal<string>('');
  posCategoryFilter = signal<string>('all');

  posCategories = computed(() => {
    const cats = new Set(this.service.products().map(p => p.category).filter(Boolean));
    return Array.from(cats);
  });

  filteredPosProducts = computed(() => {
    const query = this.posSearchQuery().trim().toLowerCase();
    const cat = this.posCategoryFilter();
    return this.service.products().filter(p => {
      const matchesCategory = cat === 'all' || p.category === cat;
      const matchesQuery = !query || 
        p.name.toLowerCase().includes(query) || 
        (p.category && p.category.toLowerCase().includes(query)) ||
        (p.locationInStore && p.locationInStore.toLowerCase().includes(query)) ||
        p.price.toString().includes(query);
      return matchesCategory && matchesQuery;
    });
  });

  addPosItem(product: OmAlQuraProduct) {
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

  incrementPosItem(productId: string) {
    const updated = this.posItems().map(i => {
      if (i.product.id === productId) {
        return { ...i, quantity: i.quantity + 1 };
      }
      return i;
    });
    this.posItems.set(updated);
  }

  decrementPosItem(productId: string) {
    const current = this.posItems();
    const target = current.find(i => i.product.id === productId);
    if (target && target.quantity > 1) {
      const updated = current.map(i => i.product.id === productId ? { ...i, quantity: i.quantity - 1 } : i);
      this.posItems.set(updated);
    } else {
      this.removePosItem(productId);
    }
  }

  removePosItem(productId: string) {
    this.posItems.set(this.posItems().filter(i => i.product.id !== productId));
  }

  posPaymentMethod: OmAlQuraOrder['paymentMethod'] = 'كاش';

  posTotal() {
    return this.posItems().reduce((acc, i) => acc + (i.product.price * i.quantity), 0);
  }

  checkoutPos() {
    this.service.createPosInvoice(this.posItems(), 'زبون كاشير', this.posPaymentMethod);
    this.posItems.set([]);
    this.posPaymentMethod = 'كاش';
  }

  quickUpdateStock(p: OmAlQuraProduct, amount: number) {
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

      if (finalCategory && !this.service.categories().includes(finalCategory)) {
        this.service.addCategory(finalCategory);
      }

      const alts = this.newProdAlternatives ? this.newProdAlternatives.split('،').flatMap(a => a.split(',')).map(a => a.trim()).filter(Boolean) : [];
      const barcodeToSave = this.newProdBarcode.trim() || `690${Math.floor(100000000 + Math.random() * 900000000)}`;

      this.service.addProduct({
        name: this.newProdName,
        barcode: barcodeToSave,
        category: finalCategory,
        price: Number(this.newProdPrice),
        stockQuantity: Number(this.newProdStock || 0),
        discountPercent: Number(this.newProdDiscount || 0),
        isBoycott: this.newProdIsBoycott,
        boycottReason: this.newProdBoycottReason || undefined,
        boycottAlternatives: alts,
        locationInStore: this.newProdLocationStore || 'الممر الرئيسي',
        locationInWarehouse: this.newProdLocationWarehouse || undefined,
        isInWarehouse: this.newProdIsInWarehouse,
        expectedRestockDate: this.newProdExpectedRestock || undefined,
        imageUrl: this.newProdImageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=600&auto=format',
        description: this.newProdDescription || 'منتج طازج ومضمون'
      });

      // Reset form & close modal
      this.newProdName = '';
      this.newProdBarcode = '';
      this.newProdCategory = 'منظفات ومساحيق غسيل';
      this.customProdCategory = '';
      this.newProdPrice = null;
      this.newProdStock = 10;
      this.newProdDiscount = 0;
      this.newProdLocationStore = 'الممر الرئيسي';
      this.newProdLocationWarehouse = '';
      this.newProdIsInWarehouse = false;
      this.newProdExpectedRestock = '';
      this.newProdIsBoycott = false;
      this.newProdBoycottReason = '';
      this.newProdAlternatives = '';
      this.newProdDescription = '';
      this.newProdImageUrl = '';
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
  openEditProduct(p: OmAlQuraProduct) {
    this.editingProductId.set(p.id);
    this.editProdName = p.name;
    this.editProdBarcode = p.barcode || '';
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
    const barcodeToSave = this.editProdBarcode.trim() || `690${Math.floor(100000000 + Math.random() * 900000000)}`;

    this.service.updateProduct(id, {
      name: this.editProdName,
      barcode: barcodeToSave,
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
      imageUrl: this.editProdImageUrl
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

  cancelledOrdersCount() {
    return this.service.orders().filter(o => o.status === 'cancelled').length;
  }

  filteredOrders() {
    const status = this.orderFilterStatus();
    if (status === 'all') return this.service.orders();
    return this.service.orders().filter(o => o.status === status);
  }

  getStatusText(status: string, reason?: string) {
    switch (status) {
      case 'pending': return 'جديد - بانتظار التأكيد والتجهيز';
      case 'preparing': return 'قيد التجهيز بالمحل';
      case 'on_the_way': return 'مع سائق الدليفري';
      case 'completed': return 'تم التوصيل واكتمال الطلب';
      case 'cancelled': return 'تم إلغاء هذا الطلب من قبل العميل 🛑';
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

  // Add Supplier Modal State & Methods
  openAddSupplierModal = signal(false);
  newSuppName = '';
  newSuppCompanyName = '';
  newSuppPhone = '';
  newSuppCategoriesStr = '';

  submitAddSupplier() {
    if (!this.newSuppName.trim() || !this.newSuppCompanyName.trim() || !this.newSuppPhone.trim()) {
      return;
    }
    const cats = this.newSuppCategoriesStr
      ? this.newSuppCategoriesStr.split('،').flatMap(c => c.split(',')).map(c => c.trim()).filter(Boolean)
      : ['منظفات ومطهرات عامة'];

    this.service.addSupplier({
      name: this.newSuppName.trim(),
      companyName: this.newSuppCompanyName.trim(),
      phone: this.newSuppPhone.trim(),
      suppliedCategories: cats
    });

    this.newSuppName = '';
    this.newSuppCompanyName = '';
    this.newSuppPhone = '';
    this.newSuppCategoriesStr = '';
    this.openAddSupplierModal.set(false);
  }
}
