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

          <!-- Search Input -->
          <div class="relative">
            <input type="text" 
                   [(ngModel)]="searchQuery" 
                   placeholder="اكتب اسم المنتج الذي تبحث عنه الآن داخل المحل..." 
                   class="w-full pl-4 pr-12 py-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
            <div class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
              <svg lucideIcon="search" class="w-5 h-5"></svg>
            </div>
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

            <!-- Simulated Visual Store Map Canvas -->
            <div class="space-y-3">
              <h4 class="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
                <svg lucideIcon="map" class="w-5 h-5 text-indigo-600"></svg>
                <span>خريطة الرفوف المباشرة وتوجيه الحركة داخل الفرع</span>
              </h4>

              <div class="relative bg-slate-950 rounded-3xl p-6 overflow-hidden min-h-[340px] border border-slate-800 flex flex-col justify-between">
                <!-- Store Layout Grid Representation -->
                <div class="grid grid-cols-4 gap-4 text-center text-xs">
                  <div class="p-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 font-bold">
                    مدخل الفرع
                  </div>
                  <div class="p-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 font-bold"
                       [ngClass]="{'ring-2 ring-amber-400 bg-amber-950/40 text-amber-300': effectiveSelectedProduct()?.locationInStore?.includes('ممر 1')}">
                    الممر 1 (مساحيق غسيل ومنعمات)
                  </div>
                  <div class="p-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 font-bold"
                       [ngClass]="{'ring-2 ring-amber-400 bg-amber-950/40 text-amber-300': effectiveSelectedProduct()?.locationInStore?.includes('ممر 2')}">
                    الممر 2 (منظفات صحون ومطهرات)
                  </div>
                  <div class="p-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 font-bold"
                       [ngClass]="{'ring-2 ring-amber-400 bg-amber-950/40 text-amber-300': effectiveSelectedProduct()?.locationInStore?.includes('ممر 3')}">
                    الممر 3 (عناية شخصية وشامبو)
                  </div>
                </div>

                <!-- Product Pin Location Indicator -->
                <div class="my-8 p-6 bg-slate-900/90 rounded-2xl border border-indigo-500/50 flex flex-wrap justify-between items-center gap-4">
                  <div class="flex items-center gap-3">
                    <div class="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black animate-bounce shadow-lg">
                      <svg lucideIcon="navigation" class="w-6 h-6"></svg>
                    </div>
                    <div>
                      <p class="text-xs text-amber-300 font-bold">المسار الموصى به للمشي:</p>
                      <p class="text-sm font-black text-white">تحرك من المدخل الرئيسي إلى {{ effectiveSelectedProduct()?.locationInStore }}</p>
                    </div>
                  </div>

                  <div class="text-xs text-slate-300">
                    <p>صورة توضيحية للرف:</p>
                    <span class="font-bold text-indigo-400">الرف المضاء باللون الأصفر</span>
                  </div>
                </div>

                <div class="flex justify-between items-center text-xs text-slate-400 pt-3 border-t border-slate-800">
                  <span>منطقة الكاشير والاستقبال</span>
                  <span>المخزن الداخلي الخلفي</span>
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
  `
})
export class OmAlQuraInStoreMapComponent {
  service = inject(OmAlQuraService);

  searchQuery = '';
  selectedProduct = signal<OmAlQuraProduct | null>(null);

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
}
