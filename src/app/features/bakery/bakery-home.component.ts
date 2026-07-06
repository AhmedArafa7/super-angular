import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BakeryService, BakeryProduct } from '../../core/services/bakery.service';
import { FirebaseService } from '../../core/services/firebase.service';
import { ToastService } from '../../core/services/toast.service';
import { LucideDynamicIcon } from '@lucide/angular';
import { trigger, transition, style, animate, state } from '@angular/animations';
import { BakeryOrdersComponent } from './components/bakery-orders.component';
import { ImageFallbackDirective } from '../../shared/directives/image-fallback.directive';
import { ImagePreviewDirective } from '../../shared/directives/image-preview.directive';

@Component({
  selector: 'app-bakery-home',
  standalone: true,
  imports: [CommonModule, LucideDynamicIcon, BakeryOrdersComponent, ImageFallbackDirective, ImagePreviewDirective],
  template: `
    <div class="h-full bg-[#FAFAFA] dark:bg-[#121212] overflow-hidden flex font-sans" dir="rtl">
      
      <!-- Main Content (Menu) -->
      <div class="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar">
        <!-- Bakery Header -->
        <header class="relative px-8 py-12 shrink-0 bg-gradient-to-br from-amber-600/90 to-orange-800/90 overflow-hidden">
          <div class="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1517433670267-08bbd4be890f?q=80&w=1200&auto=format')] bg-cover bg-center opacity-30 mix-blend-overlay"></div>
          <div class="relative z-10 flex justify-between items-center text-white">
            <div>
              <div class="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full mb-3 text-xs font-bold tracking-widest text-amber-50">
                <svg lucideIcon="flame" class="w-3.5 h-3.5 text-amber-300 animate-pulse"></svg>
                <span>يُخبز بحب، يُقدم ساخناً</span>
              </div>
              <h1 class="text-4xl md:text-5xl font-black mb-2 drop-shadow-md">مخبز عبّاد الرحمن</h1>
              <p class="text-amber-50/80 font-medium max-w-md text-sm leading-relaxed">
                اطلب معجناتك من البيت، وسنقوم بتجهيزها وخبزها لتستلمها طازجة وساخنة فور وصولك!
              </p>
            </div>
          </div>
        </header>

        <!-- Categories & Menu -->
        <div class="p-8">
          <div class="flex items-center gap-4 mb-8 overflow-x-auto pb-2 custom-scrollbar">
            <button *ngFor="let cat of dynamicCategories()" 
                    (click)="selectedCategory.set(cat)"
                    class="px-5 py-2.5 rounded-2xl font-bold text-sm whitespace-nowrap transition-all shadow-sm border"
                    [ngClass]="selectedCategory() === cat ? 'bg-amber-600 text-white border-amber-600' : 'bg-white dark:bg-surface-container border-surface-container-high text-on-surface-variant hover:bg-amber-50 dark:hover:bg-amber-900/10'">
              {{ cat }}
            </button>
          </div>

          <!-- Product Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <div *ngFor="let item of filteredProducts()" class="bg-white dark:bg-surface-container-low rounded-3xl overflow-hidden border border-surface-container-high shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col">
              <!-- Image Container -->
              <div class="relative h-48 overflow-hidden bg-surface-container-high">
                <img [src]="item.imageUrl" [alt]="item.name" appImageFallback class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                <div class="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1.5 text-white shadow-lg">
                  <svg lucideIcon="clock" class="w-3.5 h-3.5 text-amber-400"></svg>
                  <span class="text-[10px] font-bold">{{ item.preparationTimeMins }} دقيقة</span>
                </div>
                <div *ngIf="item.isPreorderOnly" class="absolute top-3 left-3 bg-amber-600/90 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1.5 text-white shadow-lg border border-amber-500">
                  <span class="text-[10px] font-bold tracking-wide">بالحجز المسبق</span>
                </div>
              </div>
              <!-- Content -->
              <div class="p-5 flex flex-col flex-1">
                <h3 class="text-lg font-black text-on-surface mb-1">{{ item.name }}</h3>
                <p class="text-xs text-on-surface-variant font-medium leading-relaxed mb-4 flex-1 line-clamp-2">{{ item.description }}</p>
                
                <div class="flex items-end justify-between mt-auto">
                  <div>
                    <span class="text-xs text-on-surface-variant block mb-0.5">السعر</span>
                    <div class="text-xl font-black text-amber-600 dark:text-amber-500">{{ item.price }} <span class="text-xs">EGC</span></div>
                  </div>
                  
                  <button (click)="bakery.addToCart(item)" [disabled]="!item.isAvailable" 
                          class="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-500 flex items-center justify-center hover:bg-amber-600 hover:text-white dark:hover:bg-amber-500 dark:hover:text-amber-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <svg lucideIcon="plus" class="w-5 h-5"></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Empty state -->
          <div *ngIf="filteredProducts().length === 0" class="py-20 flex flex-col items-center justify-center text-on-surface-variant opacity-70">
            <svg lucideIcon="croissant" class="w-16 h-16 mb-4 text-amber-500/50"></svg>
            <p class="font-medium">لا توجد منتجات في هذا التصنيف حالياً</p>
          </div>
        </div>
      </div>

      <!-- Right Sidebar (Cart & Orders) -->
      <div class="w-80 bg-white dark:bg-surface-container shrink-0 border-r border-surface-container-high flex flex-col h-full shadow-2xl z-20">
        
        <!-- Tabs -->
        <div class="flex border-b border-surface-container-high p-2 gap-2 bg-surface-container-low shrink-0">
          <button (click)="sidebarTab.set('cart')" [ngClass]="sidebarTab() === 'cart' ? 'bg-white dark:bg-surface-container shadow-sm text-amber-600' : 'text-on-surface-variant hover:bg-black/5'" class="flex-1 py-2 rounded-xl text-xs font-bold flex justify-center items-center gap-2 transition-colors">
            <svg lucideIcon="shopping-bag" class="w-4 h-4"></svg> سلة الطلبات
            <span *ngIf="bakery.cartItemCount() > 0" class="bg-amber-600 text-white text-[9px] px-1.5 py-0.5 rounded-full">{{ bakery.cartItemCount() }}</span>
          </button>
          <button (click)="sidebarTab.set('orders')" [ngClass]="sidebarTab() === 'orders' ? 'bg-white dark:bg-surface-container shadow-sm text-amber-600' : 'text-on-surface-variant hover:bg-black/5'" class="flex-1 py-2 rounded-xl text-xs font-bold flex justify-center items-center gap-2 transition-colors">
            <svg lucideIcon="receipt" class="w-4 h-4"></svg> طلباتي
          </button>
        </div>

        <!-- Cart View -->
        <div *ngIf="sidebarTab() === 'cart'" class="flex-1 flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
          <!-- Cart Items -->
          <div class="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
            <div *ngIf="bakery.cart().length === 0" class="h-full flex flex-col items-center justify-center text-center opacity-60">
              <svg lucideIcon="shopping-bag" class="w-12 h-12 mb-3 text-amber-500"></svg>
              <p class="text-sm font-medium">سلتك فارغة</p>
              <p class="text-xs mt-1">أضف بعض المخبوزات اللذيذة!</p>
            </div>

            <div *ngFor="let item of bakery.cart()" class="flex gap-3 bg-surface-container-low p-3 rounded-2xl border border-surface-container-high">
              <img [src]="item.product.imageUrl" appImageFallback class="w-16 h-16 rounded-xl object-cover">
              <div class="flex-1 flex flex-col justify-between">
                <div>
                  <h4 class="text-xs font-bold text-on-surface line-clamp-1">{{ item.product.name }}</h4>
                  <div class="text-amber-600 font-black text-sm mt-0.5">{{ item.product.price }} <span class="text-[9px]">EGC</span></div>
                </div>
                <div class="flex items-center justify-between mt-2">
                  <div class="flex items-center bg-white dark:bg-surface-container rounded-lg border border-surface-container-high p-0.5">
                    <button (click)="bakery.updateQuantity(item.product.id, -1)" class="w-6 h-6 flex items-center justify-center text-on-surface-variant hover:bg-black/5 rounded-md"><svg lucideIcon="minus" class="w-3 h-3"></svg></button>
                    <span class="w-6 text-center text-xs font-bold">{{ item.quantity }}</span>
                    <button (click)="bakery.updateQuantity(item.product.id, 1)" class="w-6 h-6 flex items-center justify-center text-on-surface-variant hover:bg-black/5 rounded-md"><svg lucideIcon="plus" class="w-3 h-3"></svg></button>
                  </div>
                  <button (click)="bakery.removeFromCart(item.product.id)" class="text-error/70 hover:text-error p-1 rounded-md hover:bg-error/10 transition-colors">
                    <svg lucideIcon="trash-2" class="w-4 h-4"></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Checkout Box -->
          <div class="p-5 bg-surface-container-low border-t border-surface-container-high shrink-0">
            <div class="flex justify-between items-center mb-4">
              <span class="text-sm font-bold text-on-surface-variant">الإجمالي</span>
              <span class="text-xl font-black text-on-surface">{{ bakery.cartTotal() }} <span class="text-xs text-amber-600">EGC</span></span>
            </div>
            
            <button (click)="checkout()" [disabled]="bakery.cart().length === 0 || isSubmitting()" 
                    class="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-surface-container-high disabled:text-on-surface-variant text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20 disabled:shadow-none">
              <svg *ngIf="!isSubmitting()" lucideIcon="flame" class="w-4 h-4"></svg>
              <svg *ngIf="isSubmitting()" lucideIcon="loader-2" class="w-4 h-4 animate-spin"></svg>
              {{ isSubmitting() ? 'جاري تأكيد الطلب...' : 'تأكيد الطلب (دفع عند الاستلام)' }}
            </button>
            <p class="text-[10px] text-center text-on-surface-variant mt-3 font-medium">
              سيتم تجهيز طلبك ليكون ساخناً فور وصولك. الدفع نقداً بالفرع.
            </p>
          </div>
        </div>

        <!-- Orders View -->
        <div *ngIf="sidebarTab() === 'orders'" class="flex-1 overflow-hidden animate-in fade-in slide-in-from-left-4 duration-300">
          <app-bakery-orders></app-bakery-orders>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
    .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); }
  `]
})
export class BakeryHomeComponent implements OnInit {
  bakery = inject(BakeryService);
  firebase = inject(FirebaseService);
  toast = inject(ToastService);

  dynamicCategories = computed(() => ['الكل'].concat(this.bakery.categories()));
  selectedCategory = signal<string>('الكل');
  sidebarTab = signal<'cart' | 'orders'>('cart');
  isSubmitting = signal(false);

  filteredProducts = computed(() => {
    if (this.selectedCategory() === 'الكل') return this.bakery.products();
    return this.bakery.products().filter(p => p.category === this.selectedCategory());
  });

  ngOnInit() {
    const user = this.firebase.currentUser();
    if (user) {
      this.bakery.listenToUserOrders(user.uid);
    }
  }

  async checkout() {
    this.isSubmitting.set(true);
    const success = await this.bakery.placeOrder('cash'); // Only cash is enabled for now as requested
    this.isSubmitting.set(false);
    if (success) {
      this.sidebarTab.set('orders');
    }
  }
}
