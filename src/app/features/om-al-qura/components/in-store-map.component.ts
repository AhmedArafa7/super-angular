import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { OmAlQuraService, OmAlQuraProduct } from '../../../core/services/om-al-qura.service';
import { ImageFallbackDirective } from '../../../shared/directives/image-fallback.directive';

@Component({
  selector: 'app-om-al-qura-in-store-map',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideDynamicIcon, ImageFallbackDirective],
  template: `
    <div class="space-y-8 font-sans" dir="rtl">
      
      <!-- Interactive Navigation Map Header -->
      <div class="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
        <div class="relative z-10 max-w-3xl space-y-4">
          <div class="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 backdrop-blur-md rounded-full text-xs font-bold text-indigo-300">
            <svg lucideIcon="map-pin" class="w-3.5 h-3.5 text-amber-400 animate-pulse"></svg>
            <span>دليل التسوق الداخلي التفاعلي لفرع المحل</span>
          </div>
          <h2 class="text-3xl font-black">ابحث عن أي منتج وتوجّه لمكانه بالضبط داخل المتجر</h2>
          <p class="text-xs text-slate-300 leading-relaxed">
            اختر المنتج الذي تبحث عنه، وسيقوم النظام بتوليد خريطة دقيقة تحدد لك (الممر، الرف، والجهة) وهل المنتج في المحل أم المخزن أم نفد مع موعد التوفر المتوقع.
          </p>

          <!-- Search Input & Quick Actions -->
          <div class="flex flex-wrap items-center gap-3">
            <div class="relative flex-1 min-w-[280px]">
              <input type="text" 
                     [(ngModel)]="searchQuery" 
                     placeholder="اكتب اسم المنتج الذي تبحث عنه الآن داخل المحل..." 
                     class="w-full pl-4 pr-12 py-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
              <div class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                <svg lucideIcon="search" class="w-5 h-5"></svg>
              </div>
            </div>

            <!-- Geometric Grid Canvas Line Drawing Quick Trigger -->
            <button (click)="openLineCanvasDrawer()"
                    class="px-5 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-2xl text-xs flex items-center gap-2 shadow-xl transition-all shrink-0 cursor-pointer">
              <svg lucideIcon="pen-tool" class="w-4 h-4"></svg>
              <span>📍 رسم خطوط مستقيمة فائقة الدقة بتحديد نقطتين</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Prominent Section: Manager Geometric Line Sketch / Floor Plan Layout -->
      <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
        <div class="flex flex-wrap justify-between items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-indigo-600 text-white flex items-center justify-center shadow-md shrink-0">
              <svg lucideIcon="grid" class="w-6 h-6"></svg>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950">خطوط مستقيمة دقيقة (نقطتين A → B) 📍</span>
                <span class="text-xs font-bold text-slate-500">رسم كروكي هندسي للمحل</span>
              </div>
              <h3 class="text-lg font-black text-slate-900 dark:text-white mt-1">تخطيط رسم المحل بخطوط مستقيمة دقيقة بين نقطتين</h3>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button (click)="openStoreLayoutSketchModal.set(true)"
                    class="px-4 py-2.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 font-bold rounded-2xl text-xs flex items-center gap-2 border border-indigo-200 dark:border-indigo-800 transition-all">
              <svg lucideIcon="maximize-2" class="w-4 h-4"></svg>
              <span>تكبير الخريطة الكاملة</span>
            </button>

            <button (click)="openLineCanvasDrawer()"
                    class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-xs flex items-center gap-2 shadow-md transition-all">
              <svg lucideIcon="pen-tool" class="w-4 h-4"></svg>
              <span>📍 فتح لوحة رسم الخطوط بالنقطتين</span>
            </button>
          </div>
        </div>

        <!-- Line Sketch Canvas Preview / Display Box for Customers -->
        <div class="relative bg-slate-950 rounded-3xl overflow-hidden border-2 border-slate-800 p-2 min-h-[300px] flex items-center justify-center">
          <div *ngIf="service.storeLayout().sketchImageUrl; else noSketchPlaceholder" class="w-full text-center space-y-2">
            <img [src]="service.storeLayout().sketchImageUrl" 
                 alt="مخطط رسم المحل بالخطوط الهندسية المستقيمة" 
                 appImageFallback 
                 class="w-full max-h-[380px] object-contain rounded-2xl bg-slate-950">
            <p class="text-[11px] text-amber-400 font-bold flex items-center justify-center gap-1">
              <span>💡 المخطط الكروكي موضح بخطوط مستقيمة دقيقة ومقاسات مبينة لتوزيع الرفوف والممرات.</span>
            </p>
          </div>

          <ng-template #noSketchPlaceholder>
            <div class="p-8 text-center space-y-3 text-slate-400">
              <div class="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-amber-400">
                <svg lucideIcon="grid" class="w-7 h-7"></svg>
              </div>
              <h4 class="font-black text-white text-base">لم يتم رسم كروكي بالخطوط المستقيمة حتى الآن</h4>
              <p class="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                اضغط على زر "فتح لوحة رسم الخطوط بالنقطتين" لوضع نقطة البداية (A) ونقطة النهاية (B) ليرسم النظام خطاً مستقيماً دقيقاً بينهما!
              </p>
              <button (click)="openLineCanvasDrawer()" class="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-2xl text-xs shadow-lg inline-flex items-center gap-2 cursor-pointer">
                <svg lucideIcon="pen-tool" class="w-4 h-4"></svg>
                <span>بدء رسم خطوط المحل دقيقة بالنقطتين</span>
              </button>
            </div>
          </ng-template>
        </div>

        <!-- Quick Summary Grid -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-2">
          <div class="p-3 bg-emerald-50/80 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 space-y-1">
            <span class="text-emerald-700 dark:text-emerald-400 font-bold block">🚪 المدخل الرئيسي:</span>
            <p class="font-black text-slate-900 dark:text-white text-sm">{{ service.storeLayout().storeEntranceLabel }}</p>
          </div>
          <div class="p-3 bg-blue-50/80 dark:bg-blue-950/30 rounded-2xl border border-blue-200 dark:border-blue-800/60 space-y-1">
            <span class="text-blue-700 dark:text-blue-400 font-bold block">💵 منطقة الكاشير والاستقبال:</span>
            <p class="font-black text-slate-900 dark:text-white text-sm">{{ service.storeLayout().checkoutAreaLabel }}</p>
          </div>
          <div class="p-3 bg-purple-50/80 dark:bg-purple-950/30 rounded-2xl border border-purple-200 dark:border-purple-800/60 space-y-1">
            <span class="text-purple-700 dark:text-purple-400 font-bold block">📦 المخزن الداخلي:</span>
            <p class="font-black text-slate-900 dark:text-white text-sm">{{ service.storeLayout().warehouseAreaLabel }}</p>
          </div>
        </div>
      </div>

      <!-- Main Layout: Product Selection & Interactive Visual Map -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <!-- Left Column: Product Search Results -->
        <div class="space-y-4">
          <h3 class="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <svg lucideIcon="package-search" class="w-5 h-5 text-indigo-600"></svg>
            <span>نتائج البحث والمنتجات المتاحة</span>
          </h3>

          <div class="space-y-3 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
            <div *ngFor="let p of matchingProducts()" 
                 (click)="selectedProduct.set(p)"
                 class="p-4 rounded-2xl border transition-all cursor-pointer flex gap-3 items-center"
                 [ngClass]="effectiveSelectedProduct()?.id === p.id ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 shadow-md ring-2 ring-indigo-500' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50'">
              <img [src]="p.imageUrl" [alt]="p.name" appImageFallback class="w-16 h-16 rounded-xl object-cover shrink-0">
              <div class="flex-1 min-w-0">
                <h4 class="font-black text-slate-900 dark:text-white text-sm truncate">{{ p.name }}</h4>
                <p class="text-xs text-slate-500 truncate mt-0.5">{{ p.locationInStore }}</p>
                
                <div class="flex items-center gap-2 mt-2">
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold"
                        [ngClass]="p.stockQuantity > 0 ? (p.isInWarehouse ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800') : 'bg-rose-100 text-rose-800'">
                    {{ p.stockQuantity > 0 ? (p.isInWarehouse ? 'متوفر بالمخزن الداخلي' : 'متوفر بالمحل') : 'نفد من المخزون' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column: Interactive Store Layout Map & Directions -->
        <div class="lg:col-span-2 space-y-6">
          <div *ngIf="effectiveSelectedProduct()" class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            
            <!-- Selected Product Location Card Header -->
            <div class="flex flex-wrap justify-between items-start gap-4 p-5 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-2xl border border-indigo-200 dark:border-indigo-800">
              <div>
                <span class="text-xs font-bold text-indigo-600 dark:text-indigo-400">موقع المنتج المحدد حالياً:</span>
                <h3 class="text-2xl font-black text-slate-900 dark:text-white mt-1">{{ effectiveSelectedProduct()?.name }}</h3>
                <p class="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  الموقع بالضبط: {{ effectiveSelectedProduct()?.locationInStore }}
                </p>
              </div>

              <!-- Status Badge -->
              <div class="text-left">
                <span class="inline-block px-4 py-2 rounded-2xl text-xs font-black"
                      [ngClass]="(effectiveSelectedProduct()?.stockQuantity || 0) > 0 ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'">
                  {{ (effectiveSelectedProduct()?.stockQuantity || 0) > 0 ? 'متوفر الآن' : 'غير متوفر حالياً' }}
                </span>
                <p *ngIf="(effectiveSelectedProduct()?.stockQuantity || 0) <= 0" class="text-xs text-rose-600 font-bold mt-2">
                  موعد إعادة التوفر المتوقع: {{ effectiveSelectedProduct()?.expectedRestockDate || 'خلال 48 ساعة' }}
                </p>
              </div>
            </div>

            <!-- Visual Store Map Representation -->
            <div class="space-y-3">
              <h4 class="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
                <svg lucideIcon="map" class="w-5 h-5 text-indigo-600"></svg>
                <span>خريطة الرفوف وتوجيه الحركة داخل الفرع (تخطيط الإدارة)</span>
              </h4>

              <div class="relative bg-slate-950 rounded-3xl p-6 overflow-hidden min-h-[340px] border border-slate-800 flex flex-col justify-between">
                <!-- Store Layout Grid Representation -->
                <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center text-xs">
                  <div class="p-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 font-bold">
                    {{ service.storeLayout().storeEntranceLabel }}
                  </div>
                  
                  <div *ngFor="let aisle of service.storeLayout().aisles" 
                       class="p-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 font-bold transition-all"
                       [ngClass]="{'ring-2 ring-amber-400 bg-amber-950/40 text-amber-300 shadow-lg': effectiveSelectedProduct()?.locationInStore?.includes(aisle.name) || effectiveSelectedProduct()?.locationInStore?.includes(aisle.id)}">
                    {{ aisle.name }}
                  </div>
                </div>

                <!-- Product Pin Location Indicator -->
                <div class="my-8 p-6 bg-slate-900/90 rounded-2xl border border-indigo-500/50 flex flex-wrap justify-between items-center gap-4">
                  <div class="flex items-center gap-3">
                    <div class="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black animate-bounce shadow-lg shrink-0">
                      <svg lucideIcon="navigation" class="w-6 h-6"></svg>
                    </div>
                    <div>
                      <p class="text-xs text-amber-300 font-bold">المسار الموصى به للمشي:</p>
                      <p class="text-sm font-black text-white">تحرك من {{ service.storeLayout().storeEntranceLabel }} إلى {{ effectiveSelectedProduct()?.locationInStore }}</p>
                    </div>
                  </div>

                  <div class="text-xs text-slate-300">
                    <p>إرشادات الخريطة:</p>
                    <span class="font-bold text-indigo-400">{{ service.storeLayout().customSketchNotes || 'الرف المضاء باللون الأصفر' }}</span>
                  </div>
                </div>

                <div class="flex justify-between items-center text-xs text-slate-400 pt-3 border-t border-slate-800">
                  <span>{{ service.storeLayout().checkoutAreaLabel }}</span>
                  <span>{{ service.storeLayout().warehouseAreaLabel }}</span>
                </div>
              </div>
            </div>

            <!-- Additional Product Notes -->
            <div class="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1">
              <p class="font-bold text-slate-900 dark:text-white">معلومات تخزين إضافية:</p>
              <p *ngIf="effectiveSelectedProduct()?.locationInWarehouse">مكان القطعة الإضافية بالمخزن: {{ effectiveSelectedProduct()?.locationInWarehouse }}</p>
              <p>إذا واجهت أي صعوبة في الوصول، يمكنك الاستعانة بموظفي الفرع في الممر.</p>
            </div>

          </div>

          <div *ngIf="!effectiveSelectedProduct()" class="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center text-slate-400 border border-slate-200 dark:border-slate-800">
            <svg lucideIcon="map-pin" class="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-700"></svg>
            <p class="font-bold">يرجى اختيار منتج من القائمة الجانبية لعرض الخريطة التفاعلية ومكانه في المحل</p>
          </div>
        </div>

      </div>

    </div>

    <!-- STORE LAYOUT SKETCH MODAL DIALOG -->
    <div *ngIf="openStoreLayoutSketchModal()" class="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-3xl w-full font-sans dir-rtl space-y-5 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        
        <div class="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <svg lucideIcon="map" class="w-6 h-6"></svg>
            </div>
            <div>
              <h3 class="text-xl font-black text-slate-900 dark:text-white">الخريطة الكروكية الرسمية ورسم المحل</h3>
              <p class="text-xs text-slate-500">دليل توزيع الرفوف والممرات والمعالم بالفرع</p>
            </div>
          </div>
          <button (click)="openStoreLayoutSketchModal.set(false)" class="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
            <svg lucideIcon="x" class="w-6 h-6"></svg>
          </button>
        </div>

        <!-- Manager Uploaded Sketch / Line Drawing Preview -->
        <div *ngIf="service.storeLayout().sketchImageUrl" class="rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md">
          <div class="bg-slate-950 p-2 text-center text-xs text-slate-300 font-bold flex items-center justify-center gap-2">
            <svg lucideIcon="image" class="w-4 h-4 text-amber-400"></svg>
            <span>الرسم الكروكي والمخطط بالخطوط من المدير</span>
          </div>
          <img [src]="service.storeLayout().sketchImageUrl" alt="الرسم الكروكي للفرع" appImageFallback class="w-full max-h-80 object-contain bg-slate-950">
        </div>

        <!-- Entrance / Cashier / Warehouse Grid -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div class="p-4 bg-emerald-50/80 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 space-y-1">
            <span class="text-emerald-700 dark:text-emerald-400 font-bold block">🚪 المدخل الرئيسي:</span>
            <p class="font-black text-slate-900 dark:text-white text-sm">{{ service.storeLayout().storeEntranceLabel }}</p>
          </div>
          <div class="p-4 bg-blue-50/80 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-800/60 space-y-1">
            <span class="text-blue-700 dark:text-blue-400 font-bold block">💵 منطقة الكاشير والاستقبال:</span>
            <p class="font-black text-slate-900 dark:text-white text-sm">{{ service.storeLayout().checkoutAreaLabel }}</p>
          </div>
          <div class="p-4 bg-purple-50/80 dark:bg-purple-950/40 rounded-2xl border border-purple-200 dark:border-purple-800/60 space-y-1">
            <span class="text-purple-700 dark:text-purple-400 font-bold block">📦 المخزن الداخلي:</span>
            <p class="font-black text-slate-900 dark:text-white text-sm">{{ service.storeLayout().warehouseAreaLabel }}</p>
          </div>
        </div>

        <!-- Aisles & Shelves Interactive Grid -->
        <div class="space-y-3">
          <h4 class="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <svg lucideIcon="layers" class="w-4 h-4 text-indigo-600"></svg>
            <span>دليل الممرات والرفوف المسجلة للفرع:</span>
          </h4>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            <div *ngFor="let aisle of service.storeLayout().aisles" class="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 space-y-2">
              <div class="flex items-center justify-between">
                <h5 class="font-black text-indigo-900 dark:text-indigo-300 text-sm">{{ aisle.name }}</h5>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-200 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
                  {{ aisle.shelves.length }} رفوف
                </span>
              </div>
              <div class="text-slate-600 dark:text-slate-400 text-[11px] font-medium leading-relaxed">
                <span class="font-bold text-slate-700 dark:text-slate-300">الرفوف:</span> {{ aisle.shelves.join(' • ') }}
              </div>
            </div>
          </div>
        </div>

        <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <button (click)="openLineCanvasDrawer()" class="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-2xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer">
            <svg lucideIcon="pen-tool" class="w-4 h-4"></svg>
            <span>📍 فتح رسم الخطوط بالنقطتين A → B</span>
          </button>

          <button (click)="openStoreLayoutSketchModal.set(false)" class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-2xl shadow-md transition-all">
            إغلاق الخريطة
          </button>
        </div>

      </div>
    </div>

    <!-- PRECISE POINT-TO-POINT STRAIGHT LINE CANVAS DRAWER MODAL -->
    <div *ngIf="showCanvasDrawer()" class="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div class="bg-slate-900 rounded-3xl p-6 max-w-4xl w-full font-sans dir-rtl space-y-4 border border-slate-800 shadow-2xl max-h-[95vh] overflow-y-auto custom-scrollbar">
        
        <div class="flex justify-between items-center border-b border-slate-800 pb-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black shrink-0">
              <svg lucideIcon="navigation" class="w-5 h-5"></svg>
            </div>
            <div>
              <h3 class="text-lg font-black text-white">رسم خطوط مستقيمة دقيقة بتحديد نقطتين A ➔ B 📍</h3>
              <p class="text-xs text-slate-400">حدد النقطة الأولى A ثم النقطة الثانية B ليرسم النظام خطاً مستقيماً دقيقاً 100% بينهما مع حساب المسافة</p>
            </div>
          </div>
          <button (click)="showCanvasDrawer.set(false)" class="text-slate-400 hover:text-white p-2 rounded-xl">
            <svg lucideIcon="x" class="w-6 h-6"></svg>
          </button>
        </div>

        <!-- Geometric Controls & Mode Bar -->
        <div class="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3 text-xs text-white">
          
          <div class="flex flex-wrap items-center justify-between gap-3">
            <!-- Line Mode Selector: Two-Point Mode (A->B) vs Drag Mode -->
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-slate-400 font-bold ml-1">طريقة رسم الخط المستقيم:</span>
              
              <button (click)="lineMode = 'two_clicks'; cancelPointA();" type="button"
                      class="px-3.5 py-2 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                      [ngClass]="lineMode === 'two_clicks' ? 'bg-amber-500 text-slate-950 shadow-amber-500/20 ring-2 ring-amber-400' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'">
                <span>📍 وضع نقطتين (اضغط A ثم اضغط B)</span>
              </button>

              <button (click)="lineMode = 'drag'; cancelPointA();" type="button"
                      class="px-3.5 py-2 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                      [ngClass]="lineMode === 'drag' ? 'bg-indigo-600 text-white ring-2 ring-indigo-400' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'">
                <span>✍️ سحب خط مستقيم من أ لأخرى</span>
              </button>
            </div>

            <!-- Orthogonal 90 degree Lock & Clear Controls -->
            <div class="flex items-center gap-2">
              <button (click)="orthoMode = !orthoMode" type="button"
                      class="px-3 py-2 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                      [ngClass]="orthoMode ? 'bg-indigo-600 text-white ring-2 ring-indigo-300' : 'bg-slate-800 text-slate-400'">
                <span>📐 قفل أفقياً/رأسياً (90°): {{ orthoMode ? 'مفعّل' : 'معطّل' }}</span>
              </button>

              <button (click)="toggleSnapToGrid()" type="button"
                      class="px-3 py-2 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                      [ngClass]="snapToGrid ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'">
                <span>🧲 جذب بالشبكة: {{ snapToGrid ? 'مفعّل' : 'معطّل' }}</span>
              </button>
            </div>
          </div>

          <!-- Secondary Drawing Tools (Straight Line, Rect, Pencil, Text, Eraser) -->
          <div class="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-800/80">
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="text-slate-400 font-bold ml-1">الأداة الفعالة:</span>

              <button (click)="activeTool = 'line'" type="button"
                      class="px-3 py-1 rounded-lg font-bold text-xs transition-all"
                      [ngClass]="activeTool === 'line' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'">
                <span>📏 خط مستقيم</span>
              </button>

              <button (click)="activeTool = 'rect'; cancelPointA();" type="button"
                      class="px-3 py-1 rounded-lg font-bold text-xs transition-all"
                      [ngClass]="activeTool === 'rect' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'">
                <span>⏹️ مستطيل / رف</span>
              </button>

              <button (click)="activeTool = 'pencil'; cancelPointA();" type="button"
                      class="px-3 py-1 rounded-lg font-bold text-xs transition-all"
                      [ngClass]="activeTool === 'pencil' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'">
                <span>✏️ قلم حر</span>
              </button>

              <button (click)="activeTool = 'text'; cancelPointA();" type="button"
                      class="px-3 py-1 rounded-lg font-bold text-xs transition-all"
                      [ngClass]="activeTool === 'text' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'">
                <span>🔤 كتابة نص</span>
              </button>

              <button (click)="activeTool = 'eraser'; cancelPointA();" type="button"
                      class="px-3 py-1 rounded-lg font-bold text-xs transition-all"
                      [ngClass]="activeTool === 'eraser' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-300'">
                <span>🧹 ممحاة</span>
              </button>
            </div>

            <!-- Color Palette & Line Width -->
            <div class="flex items-center gap-3">
              <div class="flex items-center gap-1.5">
                <span class="text-slate-400 font-bold">اللون:</span>
                <button *ngFor="let c of ['#fbbf24', '#10b981', '#6366f1', '#f43f5e', '#ffffff', '#38bdf8']"
                        type="button"
                        (click)="brushColor = c"
                        class="w-5 h-5 rounded-full border border-slate-700 cursor-pointer"
                        [style.backgroundColor]="c"
                        [ngClass]="brushColor === c ? 'scale-125 ring-2 ring-amber-400' : ''"></button>
              </div>

              <div class="flex items-center gap-1.5">
                <span class="text-slate-400 font-bold">السُمك:</span>
                <button *ngFor="let s of [2, 4, 8]" type="button" (click)="brushSize = s"
                        class="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-[11px]"
                        [ngClass]="brushSize === s ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-300'">
                  {{ s }}
                </button>
              </div>

              <button (click)="undoLastAction()" type="button" [disabled]="undoHistory.length <= 1" class="px-3 py-1 bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 disabled:opacity-40 disabled:cursor-not-allowed font-bold rounded-xl border border-indigo-800/60 transition-all text-xs flex items-center gap-1 cursor-pointer">
                <span>↩️ تراجع خطوة (Undo)</span>
              </button>

              <button (click)="clearCanvas()" type="button" class="px-3 py-1 bg-rose-950/80 hover:bg-rose-900 text-rose-300 font-bold rounded-xl border border-rose-800/60 transition-all text-xs">
                مسح الشاشة 🔄
              </button>
            </div>
          </div>

          <!-- Two-Point Status Banner -->
          <div *ngIf="lineMode === 'two_clicks' && activeTool === 'line'" 
               class="p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between"
               [ngClass]="pointA ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-300'">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full animate-ping" [ngClass]="pointA ? 'bg-emerald-400' : 'bg-amber-400'"></span>
              <span>
                {{ pointA ? '📍 تم تحديد النقطة (A): اضغط على الخريطة الآن لوضع النقطة (B) ليرسم الخط المستقيم بينهما!' : '📍 اضغط على الخريطة لوضع النقطة الأولى (A)...' }}
              </span>
            </div>
            <button *ngIf="pointA" (click)="cancelPointA()" class="px-2 py-0.5 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 text-[11px]">
              إلغاء النقطة A
            </button>
          </div>

        </div>

        <!-- Canvas Container with Snap Crosshair & Real-time Line Preview -->
        <div class="relative rounded-2xl overflow-hidden border-2 border-amber-500/50 bg-slate-950 flex justify-center items-center shadow-2xl">
          <canvas id="inStoreLineCanvas" 
                  width="760" 
                  height="440" 
                  (mousedown)="handleCanvasClick($event)" 
                  (mousemove)="handleCanvasMouseMove($event)" 
                  (mouseup)="stopDrawing()" 
                  (mouseleave)="stopDrawing()"
                  (touchstart)="handleCanvasClick($event)" 
                  (touchmove)="handleCanvasMouseMove($event)" 
                  (touchend)="stopDrawing()"
                  class="touch-none cursor-crosshair bg-slate-950 block w-full h-[380px] sm:h-[440px]"></canvas>
        </div>

        <div class="flex justify-between items-center pt-2">
          <p class="text-[11px] text-amber-300 font-medium">
            💡 وضع النقطتين يتيح لك تحديد (Point A) ثم (Point B) ليقوم النظام تلقائياً برسم خط مستقيم هندسي دقيق بـ 100%.
          </p>
          
          <div class="flex gap-2">
            <button (click)="showCanvasDrawer.set(false)" class="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700">
              إلغاء
            </button>
            <button (click)="saveCanvasDrawing()" class="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer">
              <svg lucideIcon="check" class="w-4 h-4"></svg>
              <span>حفظ ورسم كروكي الخطوط الهندسية</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  `
})
export class OmAlQuraInStoreMapComponent {
  service = inject(OmAlQuraService);

  searchQuery = '';
  selectedProduct = signal<OmAlQuraProduct | null>(null);

  openStoreLayoutSketchModal = signal(false);
  showCanvasDrawer = signal(false);

  // Precise Line Drawing & Point-to-Point (A -> B) State
  activeTool: 'line' | 'rect' | 'pencil' | 'text' | 'eraser' = 'line';
  lineMode: 'two_clicks' | 'drag' = 'two_clicks';
  orthoMode = false;
  snapToGrid = true;
  gridSize = 30; // 30px x 30px equal squares
  brushColor = '#fbbf24';
  brushSize = 3;

  pointA: { x: number; y: number } | null = null;
  private isDrawing = false;
  private startX = 0;
  private startY = 0;
  private canvasSnapshot: ImageData | null = null;

  matchingProducts = computed(() => {
    const q = this.searchQuery.toLowerCase().trim();
    const prods = this.service.products();
    if (!q) return prods;
    return prods.filter(p => p.name.toLowerCase().includes(q) || (p.locationInStore && p.locationInStore.toLowerCase().includes(q)));
  });

  effectiveSelectedProduct = computed(() => {
    const sel = this.selectedProduct();
    if (sel && this.service.products().some(p => p.id === sel.id)) {
      return sel;
    }
    return this.matchingProducts().length > 0 ? this.matchingProducts()[0] : null;
  });

  openLineCanvasDrawer() {
    this.showCanvasDrawer.set(true);
    this.pointA = null;
    setTimeout(() => {
      this.initCanvasGrid();
    }, 100);
  }

  toggleSnapToGrid() {
    this.snapToGrid = !this.snapToGrid;
  }

  cancelPointA() {
    this.pointA = null;
    if (this.canvasSnapshot) {
      const canvas = document.getElementById('inStoreLineCanvas') as HTMLCanvasElement;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.putImageData(this.canvasSnapshot, 0, 0);
      }
    }
  }

  // Calculate Snap-to-Grid intersection point
  private getSnapPoint(x: number, y: number): { x: number, y: number } {
    if (!this.snapToGrid) return { x: Math.round(x), y: Math.round(y) };
    const snappedX = Math.round(x / this.gridSize) * this.gridSize;
    const snappedY = Math.round(y / this.gridSize) * this.gridSize;
    return { x: snappedX, y: snappedY };
  }

  // Constrain straight line to strictly grid lines (horizontal/vertical) OR grid square diagonals (45 deg)
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

    // Normalize sector index to [0..7]
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
      // Square diagonal line connecting opposite vertices of grid squares (45°, 135°, 225°, 315°)
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
    const canvas = document.getElementById('inStoreLineCanvas') as HTMLCanvasElement;
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
    const canvas = document.getElementById('inStoreLineCanvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx && prevState) {
      ctx.putImageData(prevState, 0, 0);
    }
  }

  initCanvasGrid() {
    const canvas = document.getElementById('inStoreLineCanvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    this.undoHistory = [];
    this.redrawGridBackgroundOnly();
    this.pushUndoState();

    if (this.service.storeLayout().sketchImageUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        this.pushUndoState();
      };
      img.onerror = () => {
        this.redrawGridBackgroundOnly();
      };
      img.src = this.service.storeLayout().sketchImageUrl!;
    }
  }

  // Canvas Mouse / Touch Click Handler
  handleCanvasClick(event: MouseEvent | TouchEvent) {
    const canvas = document.getElementById('inStoreLineCanvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in event ? (event as TouchEvent).touches[0].clientX : (event as MouseEvent).clientX;
    const clientY = 'touches' in event ? (event as TouchEvent).touches[0].clientY : (event as MouseEvent).clientY;

    const rawX = (clientX - rect.left) * (canvas.width / rect.width);
    const rawY = (clientY - rect.top) * (canvas.height / rect.height);
    const pt = this.getSnapPoint(rawX, rawY);

    if (this.activeTool === 'text') {
      const text = prompt('اكتب اسم الرف أو الممر أو العلامة على الخريطة الهندسية:');
      if (text) {
        ctx.fillStyle = this.brushColor;
        ctx.font = `bold ${Math.max(14, this.brushSize * 3)}px sans-serif`;
        ctx.fillText(text, pt.x, pt.y);
        this.pushUndoState();
      }
      return;
    }

    // TWO-CLICK POINT-TO-POINT STRAIGHT LINE MODE (A -> B)
    if (this.activeTool === 'line' && this.lineMode === 'two_clicks') {
      if (!this.pointA) {
        // Fix Point A
        this.pointA = { x: pt.x, y: pt.y };
        this.canvasSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Draw Point A Indicator Pin
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('A', pt.x + 8, pt.y - 8);
      } else {
        // Point A already set, now Click Point B -> Draw Precise Straight Line
        let pointB = { x: pt.x, y: pt.y };

        if (this.snapToGrid) {
          pointB = this.constrainLineToGridAndDiagonals(this.pointA, pointB);
        } else if (this.orthoMode) {
          const dx = Math.abs(pointB.x - this.pointA.x);
          const dy = Math.abs(pointB.y - this.pointA.y);
          if (dx > dy) {
            pointB.y = this.pointA.y;
          } else {
            pointB.x = this.pointA.x;
          }
        }

        // Restore snapshot before drawing final line so point A badge is cleared
        if (this.canvasSnapshot) ctx.putImageData(this.canvasSnapshot, 0, 0);

        // Draw Straight Line A -> B
        ctx.lineWidth = this.brushSize;
        ctx.strokeStyle = this.brushColor;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(this.pointA.x, this.pointA.y);
        ctx.lineTo(pointB.x, pointB.y);
        ctx.stroke();

        // Draw Endpoint Dots
        ctx.fillStyle = this.brushColor;
        ctx.beginPath();
        ctx.arc(this.pointA.x, this.pointA.y, 4, 0, Math.PI * 2);
        ctx.arc(pointB.x, pointB.y, 4, 0, Math.PI * 2);
        ctx.fill();

        // Calculate and Draw Length Badge along line
        const lenPx = Math.hypot(pointB.x - this.pointA.x, pointB.y - this.pointA.y);
        const meters = (lenPx / 40).toFixed(1); // 40px = 1 meter
        const midX = (this.pointA.x + pointB.x) / 2;
        const midY = (this.pointA.y + pointB.y) / 2;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(midX - 22, midY - 14, 44, 18);
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1;
        ctx.strokeRect(midX - 22, midY - 14, 44, 18);
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText(`${meters}م`, midX - 14, midY - 1);

        // Save history state after line completion
        this.pushUndoState();

        // Reset Point A for next line
        this.pointA = null;
        this.canvasSnapshot = null;
      }
      return;
    }

    // DRAG LINE OR PENCIL / RECT / ERASER MODES
    this.isDrawing = true;
    this.startX = pt.x;
    this.startY = pt.y;
    this.canvasSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (this.activeTool === 'pencil' || this.activeTool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(this.startX, this.startY);
    }
  }

  // Live Canvas Mouse / Touch Motion Handler
  handleCanvasMouseMove(event: MouseEvent | TouchEvent) {
    const canvas = document.getElementById('inStoreLineCanvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in event ? (event as TouchEvent).touches[0].clientX : (event as MouseEvent).clientX;
    const clientY = 'touches' in event ? (event as TouchEvent).touches[0].clientY : (event as MouseEvent).clientY;

    const rawX = (clientX - rect.left) * (canvas.width / rect.width);
    const rawY = (clientY - rect.top) * (canvas.height / rect.height);
    const pt = this.getSnapPoint(rawX, rawY);

    // Live preview for 2-Click Mode when Point A is already placed
    if (this.activeTool === 'line' && this.lineMode === 'two_clicks' && this.pointA) {
      if (this.canvasSnapshot) ctx.putImageData(this.canvasSnapshot, 0, 0);

      let currentPt = { x: pt.x, y: pt.y };
      if (this.snapToGrid) {
        currentPt = this.constrainLineToGridAndDiagonals(this.pointA, currentPt);
      } else if (this.orthoMode) {
        const dx = Math.abs(currentPt.x - this.pointA.x);
        const dy = Math.abs(currentPt.y - this.pointA.y);
        if (dx > dy) currentPt.y = this.pointA.y; else currentPt.x = this.pointA.x;
      }

      // Draw dashed live line preview from A to current mouse position
      ctx.lineWidth = this.brushSize;
      ctx.strokeStyle = this.brushColor;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(this.pointA.x, this.pointA.y);
      ctx.lineTo(currentPt.x, currentPt.y);
      ctx.stroke();
      ctx.setLineDash([]); // reset dash

      // Draw Point A Indicator
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(this.pointA.x, this.pointA.y, 5, 0, Math.PI * 2);
      ctx.fill();

      // Draw current cursor snap dot
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(currentPt.x, currentPt.y, 4, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    if (!this.isDrawing) return;

    let currentX = pt.x;
    let currentY = pt.y;

    if (this.activeTool === 'line') {
      let constrained = { x: pt.x, y: pt.y };
      if (this.snapToGrid) {
        constrained = this.constrainLineToGridAndDiagonals({ x: this.startX, y: this.startY }, { x: pt.x, y: pt.y });
        currentX = constrained.x;
        currentY = constrained.y;
      } else if (this.orthoMode) {
        const dx = Math.abs(currentX - this.startX);
        const dy = Math.abs(currentY - this.startY);
        if (dx > dy) currentY = this.startY; else currentX = this.startX;
      }
    } else if (this.orthoMode && this.activeTool === 'rect') {
      const dx = Math.abs(currentX - this.startX);
      const dy = Math.abs(currentY - this.startY);
      if (dx > dy) currentY = this.startY; else currentX = this.startX;
    }

    if (this.activeTool === 'line' && this.lineMode === 'drag') {
      if (this.canvasSnapshot) ctx.putImageData(this.canvasSnapshot, 0, 0);
      ctx.lineWidth = this.brushSize;
      ctx.strokeStyle = this.brushColor;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(this.startX, this.startY);
      ctx.lineTo(currentX, currentY);
      ctx.stroke();

    } else if (this.activeTool === 'rect') {
      if (this.canvasSnapshot) ctx.putImageData(this.canvasSnapshot, 0, 0);
      ctx.lineWidth = this.brushSize;
      ctx.strokeStyle = this.brushColor;
      ctx.strokeRect(this.startX, this.startY, currentX - this.startX, currentY - this.startY);

    } else if (this.activeTool === 'pencil') {
      ctx.lineWidth = this.brushSize;
      ctx.strokeStyle = this.brushColor;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineTo(currentX, currentY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(currentX, currentY);

    } else if (this.activeTool === 'eraser') {
      ctx.lineWidth = this.brushSize * 4;
      ctx.strokeStyle = '#060a12';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineTo(currentX, currentY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(currentX, currentY);
    }
  }

  stopDrawing() {
    if (this.isDrawing) {
      this.isDrawing = false;
      this.canvasSnapshot = null;
      this.pushUndoState();
    }
  }

  clearCanvas() {
    const canvas = document.getElementById('inStoreLineCanvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    this.pointA = null;
    this.redrawGridBackgroundOnly();
    this.pushUndoState();
  }

  private redrawGridBackgroundOnly() {
    const canvas = document.getElementById('inStoreLineCanvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dark blueprint background
    ctx.fillStyle = '#060a12';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Equal intersecting grid lines (minor grid)
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

    // Major accent grid lines every 4 cells
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    const majorGrid = this.gridSize * 4;

    for (let x = 0; x <= canvas.width; x += majorGrid) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    for (let y = 0; y <= canvas.height; y += majorGrid) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Corner guides text
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('🚪 ' + (this.service.storeLayout().storeEntranceLabel || 'المدخل الرئيسي'), 15, 25);
    ctx.fillText('💵 ' + (this.service.storeLayout().checkoutAreaLabel || 'الكاشير والاستقبال'), canvas.width - 200, 25);
    ctx.fillText('📦 ' + (this.service.storeLayout().warehouseAreaLabel || 'المخزن الداخلي'), canvas.width - 200, canvas.height - 15);
  }

  saveCanvasDrawing() {
    const canvas = document.getElementById('inStoreLineCanvas') as HTMLCanvasElement;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    
    this.service.updateStoreLayout({
      ...this.service.storeLayout(),
      sketchImageUrl: dataUrl
    });

    this.showCanvasDrawer.set(false);
  }
}
