import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BakeryService } from '../../../core/services/bakery.service';
import { LucideDynamicIcon } from '@lucide/angular';
import { ImageFallbackDirective } from '../../../shared/directives/image-fallback.directive';

@Component({
  selector: 'app-bakery-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideDynamicIcon, ImageFallbackDirective],
  template: `
    <div class="h-full flex gap-6 font-sans text-right" dir="rtl">
      
      <!-- Baking Recommendations -->
      <div class="flex-1 flex flex-col bg-surface-container-low rounded-3xl border border-surface-container-high overflow-hidden shadow-lg">
        <div class="p-4 border-b border-surface-container-high bg-orange-500/10 flex items-center gap-3">
          <div class="bg-orange-500 text-white p-2 rounded-xl">
            <svg lucideIcon="flame" class="w-5 h-5 animate-pulse"></svg>
          </div>
          <div>
            <h3 class="font-black text-lg text-on-surface">ماذا يجب أن نخبز تالياً؟</h3>
            <p class="text-xs font-medium text-on-surface-variant">توصيات لحظية بناءً على الطلبات المعلقة والمخزون الحالي</p>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div *ngIf="bakery.nextToBakeRecommendations().length === 0" class="flex flex-col items-center justify-center h-full opacity-60 text-center">
            <svg lucideIcon="check-circle-2" class="w-16 h-16 text-emerald-500 mb-4"></svg>
            <p class="text-lg font-bold text-on-surface">الوضع ممتاز!</p>
            <p class="text-sm font-medium text-on-surface-variant">لا توجد نواقص لتلبية الطلبات الحالية.</p>
          </div>

          <div class="space-y-4">
            <div *ngFor="let rec of bakery.nextToBakeRecommendations()" class="bg-white dark:bg-surface-container p-4 rounded-2xl border border-error/20 flex items-center gap-4 relative overflow-hidden">
              <div class="absolute left-0 top-0 bottom-0 w-2 bg-error"></div>
              
              <img [src]="rec.product.imageUrl" appImageFallback class="w-16 h-16 rounded-xl object-cover">
              
              <div class="flex-1">
                <h4 class="font-black text-lg text-on-surface">{{ rec.product.name }}</h4>
                <div class="flex items-center gap-2 mt-1">
                  <span class="text-xs bg-error/10 text-error px-2 py-0.5 rounded-md font-bold">عجز {{ rec.deficit }} قطعة</span>
                  <span class="text-[10px] text-on-surface-variant flex items-center gap-1">
                    <svg lucideIcon="clock" class="w-3 h-3"></svg> يستغرق {{ rec.product.preparationTimeMins }} دقيقة
                  </span>
                </div>
              </div>

              <div class="flex flex-col items-end gap-2">
                <div class="flex items-center gap-2">
                  <input type="number" #qtyInput [value]="rec.deficit" class="w-16 text-center bg-surface-container-low border border-surface-container-high rounded-lg py-1.5 text-sm font-bold text-on-surface focus:outline-none focus:border-amber-500">
                  <button (click)="bakery.addBakingBatch(rec.product.id, +qtyInput.value)" class="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
                    سجل الخبز
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Current Inventory Status -->
      <div class="w-96 flex flex-col bg-surface-container-low rounded-3xl border border-surface-container-high overflow-hidden shadow-xl shrink-0">
        <div class="p-4 border-b border-surface-container-high bg-surface-container">
          <h3 class="font-black text-lg text-on-surface mb-1">المخزون المتوفر</h3>
          <p class="text-xs text-on-surface-variant">الكميات الجاهزة للتسليم فوراً (تم خبزها ولم تباع)</p>
        </div>

        <div class="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
          <div *ngFor="let p of bakery.products()" class="flex items-center justify-between bg-white dark:bg-surface-container p-3 rounded-xl border border-surface-container-high">
            <div class="flex items-center gap-3">
              <img [src]="p.imageUrl" appImageFallback class="w-10 h-10 rounded-lg object-cover">
              <span class="text-sm font-bold text-on-surface">{{ p.name }}</span>
            </div>
            <div class="text-lg font-black" [ngClass]="(bakery.inventoryAvailable()[p.id] || 0) > 0 ? 'text-emerald-500' : 'text-on-surface-variant'">
              {{ Math.max(0, bakery.inventoryAvailable()[p.id] || 0) }}
            </div>
          </div>
        </div>
        
        <!-- Quick Manual Bake -->
        <div class="p-4 bg-surface-container border-t border-surface-container-high">
          <h4 class="text-xs font-bold text-on-surface-variant mb-3">تسجيل بدأ خبز</h4>
          <div class="flex gap-2">
            <select #manualProd class="flex-1 bg-white dark:bg-surface-container-lowest border border-surface-container-high rounded-xl px-2 py-2 text-xs text-on-surface focus:outline-none focus:border-amber-500">
              <option *ngFor="let p of bakery.products()" [value]="p.id">{{ p.name }}</option>
            </select>
            <input type="number" #manualQty value="10" class="w-16 text-center bg-white dark:bg-surface-container-lowest border border-surface-container-high rounded-xl py-2 text-xs font-bold text-on-surface focus:outline-none focus:border-amber-500">
            <button (click)="bakery.addBakingBatch(manualProd.value, +manualQty.value)" class="bg-amber-600 hover:bg-amber-700 text-white px-3 rounded-xl text-xs font-bold transition-colors">
              خبز
            </button>
          </div>
        </div>

      </div>

    </div>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
    .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); }
  `]
})
export class BakeryInventoryComponent {
  bakery = inject(BakeryService);
  Math = Math;
}
