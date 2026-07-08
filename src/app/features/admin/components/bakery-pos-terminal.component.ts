import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BakeryService, BakeryProduct } from '../../../core/services/bakery.service';
import { LucideDynamicIcon } from '@lucide/angular';
import { ImageFallbackDirective } from '../../../shared/directives/image-fallback.directive';

@Component({
  selector: 'app-bakery-pos-terminal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideDynamicIcon, ImageFallbackDirective],
  template: `
    <div class="h-full flex gap-6 font-sans text-right" dir="rtl">
      
      <!-- Products Catalog (Left side of screen) -->
      <div class="flex-1 flex flex-col bg-surface-container-low rounded-3xl border border-surface-container-high overflow-hidden">
        <div class="p-4 border-b border-surface-container-high flex justify-between items-center bg-surface-container">
          <h3 class="font-black text-lg text-on-surface">المنتجات</h3>
          
          <div class="flex gap-2">
            <button *ngFor="let cat of ['الكل'].concat(bakery.categories())" 
                    (click)="selectedCategory.set(cat)"
                    [ngClass]="selectedCategory() === cat ? 'bg-amber-600 text-white' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'"
                    class="px-3 py-1.5 rounded-xl text-xs font-bold transition-colors">
              {{ cat }}
            </button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <div *ngFor="let p of filteredProducts()" 
                 (click)="bakery.addToPosCart(p)"
                 class="bg-white dark:bg-surface-container rounded-2xl p-3 border border-surface-container-high hover:border-amber-500 cursor-pointer transition-all shadow-sm flex flex-col text-center relative overflow-hidden group">
              <div class="h-24 w-full bg-surface-container-low rounded-xl mb-3 overflow-hidden relative">
                <img [src]="p.imageUrl" appImageFallback class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
                <div *ngIf="p.isPreorderOnly" class="absolute top-1 right-1 bg-amber-500/90 text-white text-[9px] px-1.5 py-0.5 rounded backdrop-blur-sm font-bold shadow-md">بالحجز</div>
              </div>
              <h4 class="font-bold text-sm text-on-surface mb-1 line-clamp-1">{{ p.name }}</h4>
              <div class="text-amber-600 font-black text-xs mt-auto">{{ p.price }} EGC</div>
            </div>
          </div>
        </div>
      </div>

      <!-- POS Cart / Checkout (Right side of screen) -->
      <div class="w-80 flex flex-col bg-surface-container-low rounded-3xl border border-surface-container-high overflow-hidden shadow-xl shrink-0">
        <div class="p-4 border-b border-surface-container-high bg-surface-container flex items-center gap-2">
          <svg lucideIcon="monitor" class="w-5 h-5 text-on-surface-variant"></svg>
          <h3 class="font-black text-lg text-on-surface">تسجيل المباع</h3>
        </div>

        <!-- Cart Items -->
        <div class="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
          <div *ngIf="bakery.posCart().length === 0" class="h-full flex flex-col items-center justify-center opacity-50">
            <svg lucideIcon="shopping-cart" class="w-12 h-12 mb-2 text-on-surface-variant"></svg>
            <p class="text-sm font-bold">السلة فارغة</p>
          </div>

          <div *ngFor="let item of bakery.posCart()" class="flex items-center gap-3 bg-white text-black dark:bg-surface-container p-2 rounded-xl border border-surface-container-high">
            <div class="flex-1 overflow-hidden">
              <h4 class="text-xs font-bold text-on-surface truncate">{{ item.product.name }}</h4>
              <div class="text-amber-600 font-black text-xs mt-0.5">{{ item.product.price * item.quantity }} EGC</div>
            </div>
            
            <div class="flex items-center gap-2 bg-surface-container-low rounded-lg p-1 border border-surface-container-high">
              <button (click)="bakery.updatePosQuantity(item.product.id, -1)" class="w-6 h-6 flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high rounded"><svg lucideIcon="minus" class="w-3 h-3"></svg></button>
              <span class="text-xs font-bold w-4 text-center">{{ item.quantity }}</span>
              <button (click)="bakery.updatePosQuantity(item.product.id, 1)" class="w-6 h-6 flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high rounded"><svg lucideIcon="plus" class="w-3 h-3"></svg></button>
            </div>
            
            <button (click)="bakery.removePosCartItem(item.product.id)" class="text-error/70 hover:text-error p-1.5 rounded-lg hover:bg-error/10">
              <svg lucideIcon="trash-2" class="w-4 h-4"></svg>
            </button>
          </div>
        </div>

        <!-- Checkout Panel -->
        <div class="p-4 bg-surface-container border-t border-surface-container-high">
          
          <div class="mb-4">
            <label class="text-[10px] font-bold text-on-surface-variant mb-1 block">اسم العميل (اختياري)</label>
            <input type="text" [(ngModel)]="customerName" placeholder="مثال: أحمد" class="w-full bg-white dark:bg-surface-container-lowest border border-surface-container-high rounded-xl px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-amber-500">
          </div>

          <div class="flex justify-between items-center mb-4">
            <span class="text-sm font-bold text-on-surface-variant">إجمالى المبلغ</span>
            <span class="text-2xl font-black text-on-surface">{{ bakery.posCartTotal() }} <span class="text-xs text-amber-600">EGC</span></span>
          </div>

          <div class="flex gap-2">
            <button (click)="placeOrder(false)" [disabled]="bakery.posCart().length === 0" 
                    class="flex-1 bg-amber-600 hover:bg-amber-700 disabled:bg-surface-container-high disabled:text-on-surface-variant text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-xs">
              تأكيد فقط
            </button>
            <button (click)="placeOrder(true)" [disabled]="bakery.posCart().length === 0" 
                    class="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-surface-container-high disabled:text-on-surface-variant text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-xs">
              <svg lucideIcon="check" class="w-4 h-4"></svg> استلم ودفع
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
export class BakeryPosTerminalComponent {
  bakery = inject(BakeryService);
  
  selectedCategory = signal<string>('الكل');
  customerName = '';

  filteredProducts = computed(() => {
    const prods = this.bakery.products().filter(p => p.isAvailable);
    if (this.selectedCategory() === 'الكل') return prods;
    return prods.filter(p => p.category === this.selectedCategory());
  });

  async placeOrder(immediateComplete: boolean) {
    const success = await this.bakery.placePOSOrder(this.customerName, 'cash', immediateComplete);
    if (success) {
      this.customerName = '';
    }
  }
}
