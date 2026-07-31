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

            <!-- Manager Canvas Line Drawing Quick Trigger -->
            <button (click)="openLineCanvasDrawer()"
                    class="px-5 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-2xl text-xs flex items-center gap-2 shadow-xl transition-all shrink-0 cursor-pointer">
              <svg lucideIcon="pen-tool" class="w-4 h-4"></svg>
              <span>✏️ رسم/تعديل تخطيط الخطوط (خاص بالمدير)</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Prominent Section: Manager Line Sketch / Floor Plan Layout -->
      <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
        <div class="flex flex-wrap justify-between items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md shrink-0">
              <svg lucideIcon="map" class="w-6 h-6"></svg>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-600 text-white">تخطيط هاند ميد بالخطوط 📏</span>
                <span class="text-xs font-bold text-slate-500">التصميم الهندسي المباشر للمحل</span>
              </div>
              <h3 class="text-lg font-black text-slate-900 dark:text-white mt-1">الرسم الكروكي والمخطط الهيكلي لتقسيم الفرع بالخطوط</h3>
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
              <span>رسم بالخطوط والمستطيلات</span>
            </button>
          </div>
        </div>

        <!-- Line Sketch Canvas Preview / Display Box for Customers -->
        <div class="relative bg-slate-950 rounded-3xl overflow-hidden border-2 border-slate-800 p-2 min-h-[300px] flex items-center justify-center">
          <div *ngIf="service.storeLayout().sketchImageUrl; else noSketchPlaceholder" class="w-full text-center space-y-2">
            <img [src]="service.storeLayout().sketchImageUrl" 
                 alt="مخطط رسم المحل بالخطوط" 
                 appImageFallback 
                 class="w-full max-h-[380px] object-contain rounded-2xl bg-slate-950">
            <p class="text-[11px] text-slate-400 font-medium">💡 المخطط الموضح أعلاه من تصميم إدارة المحل لبيان الممرات والرفوف بالخطوط والألوان.</p>
          </div>

          <ng-template #noSketchPlaceholder>
            <div class="p-8 text-center space-y-3 text-slate-400">
              <div class="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-amber-400">
                <svg lucideIcon="pen-tool" class="w-7 h-7"></svg>
              </div>
              <h4 class="font-black text-white text-base">لم يتم رسم كروكي بالخطوط حتى الآن</h4>
              <p class="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                يمكن لمدير المحل الضغط على زر "رسم بالخطوط والمستطيلات" بالشرائط أعلى الصفحة لرسم تخطيط خطوط المحل وتعيين مكان الرفوف والممرات بسهولة!
              </p>
              <button (click)="openLineCanvasDrawer()" class="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-2xl text-xs shadow-lg inline-flex items-center gap-2">
                <svg lucideIcon="pen-tool" class="w-4 h-4"></svg>
                <span>بدء رسم كروكي الفرع الآن</span>
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

            <!-- Simulated Visual Store Map Canvas & Manager Custom Sketch -->
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

        <!-- Notes -->
        <div *ngIf="service.storeLayout().customSketchNotes" class="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 font-bold space-y-1">
          <p class="font-black flex items-center gap-1.5">
            <svg lucideIcon="info" class="w-4 h-4 text-amber-500"></svg>
            <span>إرشادات الإدارة لحركة التسوق:</span>
          </p>
          <p class="font-medium text-slate-700 dark:text-slate-300">{{ service.storeLayout().customSketchNotes }}</p>
        </div>

        <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <button (click)="openLineCanvasDrawer()" class="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-2xl shadow-md transition-all flex items-center gap-1.5">
            <svg lucideIcon="pen-tool" class="w-4 h-4"></svg>
            <span>✏️ تعديل ومسح الرسم الكروكي بالخطوط</span>
          </button>

          <button (click)="openStoreLayoutSketchModal.set(false)" class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-2xl shadow-md transition-all">
            إغلاق الخريطة
          </button>
        </div>

      </div>
    </div>

    <!-- INTERACTIVE LINE & SHAPE CANVAS DRAWER MODAL -->
    <div *ngIf="showCanvasDrawer()" class="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div class="bg-slate-900 rounded-3xl p-6 max-w-3xl w-full font-sans dir-rtl space-y-4 border border-slate-800 shadow-2xl">
        
        <div class="flex justify-between items-center border-b border-slate-800 pb-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black shrink-0">
              <svg lucideIcon="pen-tool" class="w-5 h-5"></svg>
            </div>
            <div>
              <h3 class="text-lg font-black text-white">رسم كروكي المحل بالخطوط والمستطيلات 📏</h3>
              <p class="text-xs text-slate-400">ارسم الجدران، الممرات، الرفوف ومواقع الكاشير والمدخل بدقة بالغة</p>
            </div>
          </div>
          <button (click)="showCanvasDrawer.set(false)" class="text-slate-400 hover:text-white p-2 rounded-xl">
            <svg lucideIcon="x" class="w-6 h-6"></svg>
          </button>
        </div>

        <!-- Drawing Tools Bar (Straight Line, Rectangle, Pencil, Text, Eraser) -->
        <div class="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-3 text-xs text-white">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <!-- Tool Type Selectors -->
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="text-slate-400 font-bold ml-1">أداة الرسم:</span>
              
              <button (click)="activeTool = 'line'"
                      class="px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5"
                      [ngClass]="activeTool === 'line' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'">
                <svg lucideIcon="minus" class="w-4 h-4"></svg>
                <span>📏 خط مستقيم</span>
              </button>

              <button (click)="activeTool = 'rect'"
                      class="px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5"
                      [ngClass]="activeTool === 'rect' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'">
                <svg lucideIcon="square" class="w-4 h-4"></svg>
                <span>⏹️ رف / مستطيل</span>
              </button>

              <button (click)="activeTool = 'pencil'"
                      class="px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5"
                      [ngClass]="activeTool === 'pencil' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'">
                <svg lucideIcon="pencil" class="w-4 h-4"></svg>
                <span>✏️ قلم حر</span>
              </button>

              <button (click)="activeTool = 'text'"
                      class="px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5"
                      [ngClass]="activeTool === 'text' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'">
                <svg lucideIcon="type" class="w-4 h-4"></svg>
                <span>🔤 كتابة نص</span>
              </button>

              <button (click)="activeTool = 'eraser'"
                      class="px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5"
                      [ngClass]="activeTool === 'eraser' ? 'bg-rose-600 text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'">
                <svg lucideIcon="eraser" class="w-4 h-4"></svg>
                <span>🧹 ممحاة</span>
              </button>
            </div>

            <!-- Clear Canvas Button -->
            <button (click)="clearCanvas()" class="px-3 py-1.5 bg-rose-950/70 hover:bg-rose-900 text-rose-300 font-bold rounded-xl border border-rose-800/60 transition-all flex items-center gap-1">
              <svg lucideIcon="rotate-ccw" class="w-3.5 h-3.5"></svg>
              <span>مسح ورسم جديد</span>
            </button>
          </div>

          <!-- Color Palette & Line Thickness -->
          <div class="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
            <!-- Palette Colors -->
            <div class="flex items-center gap-2">
              <span class="text-slate-400 font-bold">اللون:</span>
              <button *ngFor="let c of ['#fbbf24', '#10b981', '#6366f1', '#f43f5e', '#ffffff', '#38bdf8', '#94a3b8']"
                      (click)="brushColor = c"
                      class="w-6 h-6 rounded-full border-2 transition-transform cursor-pointer"
                      [style.backgroundColor]="c"
                      [ngClass]="brushColor === c ? 'scale-125 border-amber-400 shadow-md' : 'border-slate-700 opacity-80'"></button>
            </div>

            <!-- Brush Size -->
            <div class="flex items-center gap-2">
              <span class="text-slate-400 font-bold">سُمك الخط:</span>
              <button *ngFor="let s of [2, 4, 8, 12]" (click)="brushSize = s"
                      class="w-7 h-7 rounded-xl bg-slate-800 flex items-center justify-center font-bold transition-all"
                      [ngClass]="brushSize === s ? 'bg-amber-500 text-slate-950 font-black scale-110' : 'text-slate-300'">
                {{ s }}
              </button>
            </div>
          </div>
        </div>

        <!-- HTML5 Canvas Container with Blueprint Grid -->
        <div class="relative rounded-2xl overflow-hidden border-2 border-amber-500/40 bg-slate-950 flex justify-center items-center">
          <canvas id="inStoreLineCanvas" 
                  width="680" 
                  height="400" 
                  (mousedown)="startDrawing($event)" 
                  (mousemove)="draw($event)" 
                  (mouseup)="stopDrawing()" 
                  (mouseleave)="stopDrawing()"
                  (touchstart)="startDrawing($event)" 
                  (touchmove)="draw($event)" 
                  (touchend)="stopDrawing()"
                  class="touch-none cursor-crosshair bg-slate-950 block w-full h-[360px] sm:h-[400px]"></canvas>
        </div>

        <div class="flex justify-between items-center pt-2">
          <p class="text-[11px] text-slate-400 font-medium">💡 التمس بالشاشة أو استخدم الماوس لرسم خطوط المحل ثم اضغط "حفظ وتعزيز المخطط".</p>
          
          <div class="flex gap-2">
            <button (click)="showCanvasDrawer.set(false)" class="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs">
              إلغاء
            </button>
            <button (click)="saveCanvasDrawing()" class="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer">
              <svg lucideIcon="check" class="w-4 h-4"></svg>
              <span>حفظ ورسم كروكي الخطوط للمحل</span>
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

  // Line Drawing Canvas Tools State
  activeTool: 'line' | 'rect' | 'pencil' | 'text' | 'eraser' = 'line';
  brushColor = '#fbbf24';
  brushSize = 3;
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
    setTimeout(() => {
      this.initCanvasGrid();
    }, 100);
  }

  initCanvasGrid() {
    const canvas = document.getElementById('inStoreLineCanvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (this.service.storeLayout().sketchImageUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = this.service.storeLayout().sketchImageUrl!;
    } else {
      this.clearCanvas();
    }
  }

  startDrawing(event: MouseEvent | TouchEvent) {
    const canvas = document.getElementById('inStoreLineCanvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    this.isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in event ? (event as TouchEvent).touches[0].clientX : (event as MouseEvent).clientX;
    const clientY = 'touches' in event ? (event as TouchEvent).touches[0].clientY : (event as MouseEvent).clientY;

    this.startX = (clientX - rect.left) * (canvas.width / rect.width);
    this.startY = (clientY - rect.top) * (canvas.height / rect.height);

    if (this.activeTool === 'text') {
      const text = prompt('اكتب اسم الرف أو الممر أو العلامة على الخريطة:');
      if (text) {
        ctx.fillStyle = this.brushColor;
        ctx.font = `bold ${Math.max(14, this.brushSize * 3)}px sans-serif`;
        ctx.fillText(text, this.startX, this.startY);
      }
      this.isDrawing = false;
      return;
    }

    // Save snapshot for line / rect previews
    this.canvasSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (this.activeTool === 'pencil' || this.activeTool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(this.startX, this.startY);
    }
  }

  stopDrawing() {
    this.isDrawing = false;
    this.canvasSnapshot = null;
  }

  draw(event: MouseEvent | TouchEvent) {
    if (!this.isDrawing) return;
    const canvas = document.getElementById('inStoreLineCanvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in event ? (event as TouchEvent).touches[0].clientX : (event as MouseEvent).clientX;
    const clientY = 'touches' in event ? (event as TouchEvent).touches[0].clientY : (event as MouseEvent).clientY;

    const currentX = (clientX - rect.left) * (canvas.width / rect.width);
    const currentY = (clientY - rect.top) * (canvas.height / rect.height);

    if (this.activeTool === 'line') {
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
      ctx.strokeStyle = '#090d16';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineTo(currentX, currentY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(currentX, currentY);
    }
  }

  clearCanvas() {
    const canvas = document.getElementById('inStoreLineCanvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw subtle blueprint grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('🚪 ' + (this.service.storeLayout().storeEntranceLabel || 'المدخل الرئيسي'), 20, 35);
    ctx.fillText('💵 ' + (this.service.storeLayout().checkoutAreaLabel || 'الكاشير والاستقبال'), canvas.width - 200, 35);
    ctx.fillText('📦 ' + (this.service.storeLayout().warehouseAreaLabel || 'المخزن الخلفي'), canvas.width - 200, canvas.height - 25);
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
