import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { OmAlQuraService, OmAlQuraProduct, OmAlQuraDeliveryDriver, OmAlQuraOrder } from '../../../core/services/om-al-qura.service';
import { ImageFallbackDirective } from '../../../shared/directives/image-fallback.directive';

@Component({
  selector: 'app-om-al-qura-customer-store',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideDynamicIcon, ImageFallbackDirective],
  template: `
    <div class="space-y-8 font-sans" dir="rtl">
      
      <!-- Customer Search & Filter Bar -->
      <div class="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div class="relative z-10 space-y-4">
          <div class="flex flex-wrap justify-between items-center gap-4">
            <div>
              <h2 class="text-2xl font-black mb-1">تسوق أفضل مساحيق المنظفات وأدوات العناية والنظافة</h2>
              <p class="text-xs text-emerald-100">أسعار تنافسية، منظفات عالية الجودة، بدائل مقاطعة معتمدة وتوصيل سريع</p>
            </div>
            
            <div class="flex items-center gap-2">
              <button (click)="openStoreLayoutSketchModal.set(true)" 
                      class="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl text-xs flex items-center gap-2 shadow-md transition-all">
                <svg lucideIcon="map" class="w-4 h-4"></svg>
                <span>عرض الخريطة الكروكية ورسم المحل</span>
              </button>

              <button (click)="openMissingProductModal.set(true)" 
                      class="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-2xl text-xs flex items-center gap-2 shadow-md transition-all">
                <svg lucideIcon="plus-circle" class="w-4 h-4"></svg>
                <span>طلب منظف غير متوفر</span>
              </button>
            </div>
          </div>

          <!-- Search Box with alternatives auto-suggestion -->
          <div class="relative max-w-2xl">
            <input type="text" 
                   [(ngModel)]="searchQuery" 
                   placeholder="ابحث عن مسحوق غسيل، صابون، شامبو، مطهرات، منظف صحون، أو بدائل المقاطعة..." 
                   class="w-full pl-4 pr-12 py-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-emerald-100/70 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
            <div class="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-200">
              <svg lucideIcon="search" class="w-5 h-5"></svg>
            </div>
          </div>
        </div>
      </div>

      <!-- 24-Hour Saved Invoice Banner for Customer -->
      <div *ngIf="service.savedCustomerInvoice()" 
           class="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-3xl p-5 border-2 border-emerald-500/50 shadow-xl flex flex-wrap justify-between items-center gap-4 text-white">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0">
            <svg lucideIcon="receipt" class="w-6 h-6"></svg>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950">
                محفوظة على جهازك لمدة 24 ساعة ⏳
              </span>
              <span class="text-xs font-mono font-bold text-slate-300">#{{ service.savedCustomerInvoice()?.id }}</span>
            </div>
            <h4 class="font-black text-white text-base mt-1">فاتورة طلبك الأخير إجمالي: {{ service.savedCustomerInvoice()?.totalPrice }} ج.م</h4>
            <p class="text-xs text-slate-300">الاسم: {{ service.savedCustomerInvoice()?.customerName }} ({{ service.savedCustomerInvoice()?.customerPhone }})</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button (click)="openInvoiceModal.set(true)"
                  class="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-2xl text-xs shadow-md transition-all flex items-center gap-2">
            <svg lucideIcon="eye" class="w-4 h-4"></svg>
            <span>عرض الفاتورة</span>
          </button>

          <button (click)="service.printThermalReceipt(service.savedCustomerInvoice()!)"
                  class="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl text-xs border border-white/20 transition-all flex items-center gap-1.5">
            <svg lucideIcon="printer" class="w-4 h-4 text-emerald-400"></svg>
            <span>طباعة</span>
          </button>

          <button (click)="service.clearCustomerInvoice()"
                  class="w-9 h-9 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl flex items-center justify-center transition-all" title="إخلاء الفاتورة">
            <svg lucideIcon="x" class="w-4 h-4"></svg>
          </button>
        </div>
      </div>

      <!-- Live Customer Active Orders Progress Tracking (تتبع حالة الطلبات الحالية) -->
      <div *ngIf="customerActiveOrders().length > 0" class="space-y-4">
        <h3 class="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
          <svg lucideIcon="clock" class="w-5 h-5 text-blue-600 animate-spin"></svg>
          <span>تتبع طلباتك الحالية ومراحل التوصيل المباشرة</span>
        </h3>

        <div class="space-y-3">
          <div *ngFor="let ord of customerActiveOrders()" class="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-blue-200 dark:border-blue-800 shadow-md space-y-4">
            <div class="flex flex-wrap justify-between items-center gap-2">
              <div class="flex items-center gap-2">
                <span class="px-3 py-1 rounded-full text-xs font-black bg-blue-600 text-white">
                  طلب #{{ ord.id }}
                </span>
                <span class="text-xs font-bold text-slate-500">مبلغ الطلب: {{ ord.totalPrice }} ج.م</span>
              </div>
              <span class="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                الوقت المتوقع للوصول: {{ ord.deliveryEta }}
              </span>
            </div>

            <!-- 4 Step Progress Bar -->
            <div class="grid grid-cols-4 gap-2 text-center text-[11px] font-bold pt-2">
              
              <!-- Step 1: Pending -->
              <div class="space-y-1.5">
                <div class="h-2 rounded-full transition-all" [ngClass]="ord.status === 'pending' || ord.status === 'preparing' || ord.status === 'on_the_way' || ord.status === 'completed' ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'"></div>
                <span [ngClass]="ord.status === 'pending' ? 'text-emerald-600 dark:text-emerald-400 font-black' : 'text-slate-500'">1. تم الإرسال</span>
              </div>

              <!-- Step 2: Preparing -->
              <div class="space-y-1.5">
                <div class="h-2 rounded-full transition-all" [ngClass]="ord.status === 'preparing' || ord.status === 'on_the_way' || ord.status === 'completed' ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'"></div>
                <span [ngClass]="ord.status === 'preparing' ? 'text-blue-600 dark:text-blue-400 font-black' : 'text-slate-500'">2. قيد التجهيز بالمحل</span>
              </div>

              <!-- Step 3: On The Way -->
              <div class="space-y-1.5">
                <div class="h-2 rounded-full transition-all" [ngClass]="ord.status === 'on_the_way' || ord.status === 'completed' ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'"></div>
                <span [ngClass]="ord.status === 'on_the_way' ? 'text-purple-600 dark:text-purple-400 font-black' : 'text-slate-500'">3. مع الدليفري</span>
              </div>

              <!-- Step 4: Completed -->
              <div class="space-y-1.5">
                <div class="h-2 rounded-full transition-all" [ngClass]="ord.status === 'completed' ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'"></div>
                <span [ngClass]="ord.status === 'completed' ? 'text-emerald-600 dark:text-emerald-400 font-black' : 'text-slate-500'">4. تم التسليم</span>
              </div>

            </div>
          </div>
        </div>
      </div>

      <!-- Top Section 1: Most Ordered & Favorites -->
      <div *ngIf="mostOrderedProducts().length > 0 || favoriteProducts().length > 0" class="space-y-4">
        <h3 class="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
          <svg lucideIcon="sparkles" class="w-5 h-5 text-amber-500"></svg>
          <span>المنتجات الموصى بها لك والمفضلة</span>
        </h3>

        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div *ngFor="let p of favoriteProducts()" class="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-3xl p-4 flex gap-3 items-center">
            <img [src]="p.imageUrl" [alt]="p.name" appImageFallback class="w-16 h-16 rounded-2xl object-cover shrink-0">
            <div class="flex-1 min-w-0">
              <span class="text-[10px] bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded-full">مفضل لديك</span>
              <h4 class="font-bold text-slate-900 dark:text-white text-sm truncate mt-1">{{ p.name }}</h4>
              <p class="text-xs font-black text-emerald-600 dark:text-emerald-400">{{ p.price }} ج.م</p>
            </div>
            <button (click)="service.addToCart(p)" class="w-9 h-9 bg-emerald-600 text-white rounded-xl flex items-center justify-center shrink-0 hover:bg-emerald-700">
              <svg lucideIcon="plus" class="w-4 h-4"></svg>
            </button>
          </div>
        </div>
      </div>

     

      <!-- Category Filter Pills -->
      <div class="flex items-center gap-3 overflow-x-auto pb-2 custom-scrollbar">
        <button *ngFor="let cat of categories()" (click)="selectedCategory.set(cat)"
                class="px-5 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border"
                [ngClass]="selectedCategory() === cat ? 'bg-emerald-700 text-white border-emerald-700 shadow-md' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50'">
          {{ cat }}
        </button>
      </div>

      <!-- Main Product Grid with Alternatives Highlight -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <div *ngFor="let p of filteredProducts()" 
             class="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
          <div>
            <!-- Image & Badges -->
            <div class="relative h-48 bg-slate-100 overflow-hidden">
              <img [src]="p.imageUrl" [alt]="p.name" appImageFallback class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
              
              <button (click)="service.toggleFavorite(p.id)" 
                      class="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex items-center justify-center text-rose-500 shadow-md hover:scale-110 transition-all">
                <svg lucideIcon="heart" class="w-5 h-5" [ngClass]="{'fill-rose-500': service.userFavoriteProductIds().includes(p.id)}"></svg>
              </button>

              <div *ngIf="p.isBoycott" class="absolute top-3 left-3 bg-rose-600 text-white px-2.5 py-1 rounded-full text-[11px] font-black shadow-md flex items-center gap-1">
                <svg lucideIcon="shield-alert" class="w-3.5 h-3.5"></svg>
                <span>مقاطعة</span>
              </div>

              <!-- Discount Tag -->
              <div *ngIf="p.discountPercent > 0" class="absolute top-3 right-14 bg-amber-400 text-slate-950 px-2.5 py-1 rounded-full text-[11px] font-black shadow-md">
                خصم {{ p.discountPercent }}% 🔥
              </div>

              <!-- Remaining Stock Badge for Customer -->
              <div *ngIf="p.stockQuantity > 0" class="absolute bottom-3 right-3 px-2.5 py-1 rounded-xl text-[11px] font-black shadow-md flex items-center gap-1 backdrop-blur-md"
                   [ngClass]="p.stockQuantity <= 5 ? 'bg-amber-500 text-slate-950 font-black animate-pulse' : 'bg-slate-900/80 text-white border border-slate-700'">
                <svg lucideIcon="box" class="w-3.5 h-3.5"></svg>
                <span>المتبقي بالمخزن: {{ p.stockQuantity }} قطعة</span>
              </div>

              <div *ngIf="p.stockQuantity <= 0" class="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center">
                <span class="bg-rose-600 text-white font-black text-xs px-3 py-1 rounded-full mb-2">نفد المنتج!</span>
                <p *ngIf="p.expectedRestockDate" class="text-xs text-amber-300 font-bold mb-1">
                  ⏳ موعد التوفر المتوقع: {{ p.expectedRestockDate }}
                </p>
                <p class="text-[11px] text-slate-200">سيظهر لك البديل التلقائي المطابق بالأسفل</p>
              </div>
            </div>

            <!-- Content -->
            <div class="p-5 space-y-3">
              <div class="flex justify-between items-start">
                <div>
                  <span class="text-[10px] text-slate-400 font-bold block mb-0.5">{{ p.category }}</span>
                  <h3 class="font-black text-slate-900 dark:text-white text-base leading-tight">{{ p.name }}</h3>
                </div>
                <div class="text-left">
                  <span class="text-xl font-black text-emerald-600 dark:text-emerald-400">
                    {{ p.discountPercent > 0 ? (p.price * (1 - p.discountPercent / 100) | number:'1.0-0') : p.price }} <span class="text-xs">ج.م</span>
                  </span>
                  <span *ngIf="p.discountPercent > 0" class="block text-[10px] text-rose-500 line-through font-bold">
                    {{ p.price }} ج.م
                  </span>
                </div>
              </div>

              <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{{ p.description }}</p>

              <!-- Warehouse Stock Badge if stored in back warehouse -->
              <div *ngIf="p.isInWarehouse || p.locationInWarehouse" class="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-[11px] font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <svg lucideIcon="warehouse" class="w-3.5 h-3.5 text-amber-600"></svg>
                <span>متوفر بالمخزن الداخلي: {{ p.locationInWarehouse || 'المخزن الخلفي' }}</span>
              </div>

              <!-- Boycott Alternatives Section -->
              <div *ngIf="p.isBoycott" class="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 space-y-1.5">
                <div *ngIf="p.boycottReason" class="text-[11px] font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1">
                  <svg lucideIcon="info" class="w-3.5 h-3.5 text-rose-600"></svg>
                  <span>سبب المقاطعة: {{ p.boycottReason }}</span>
                </div>

                <div *ngIf="p.boycottAlternatives.length > 0">
                  <div class="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 mb-1">
                    <svg lucideIcon="check-circle-2" class="w-4 h-4 text-emerald-600"></svg>
                    <span>البدائل الوطنية المطابقة (مرتبة من الأفضل):</span>
                  </div>
                  <ol class="list-decimal list-inside text-xs text-emerald-700 dark:text-emerald-400 space-y-0.5 font-medium">
                    <li *ngFor="let alt of p.boycottAlternatives">{{ alt }}</li>
                  </ol>
                </div>
              </div>

              <!-- Stock Quantity & Shelf Location Display for Customer -->
              <div class="text-xs flex flex-wrap justify-between items-center pt-2.5 border-t border-slate-100 dark:border-slate-800 font-bold gap-2">
                <button (click)="openProductMapModal(p)" class="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                  <svg lucideIcon="map-pin" class="w-3.5 h-3.5 text-indigo-500"></svg>
                  <span>الرف: {{ p.locationInStore || 'الممر الرئيسي' }}</span>
                </button>

                <span *ngIf="p.stockQuantity > 5" class="text-emerald-600 dark:text-emerald-400 font-black flex items-center gap-1">
                  <svg lucideIcon="check" class="w-3.5 h-3.5"></svg>
                  <span>متوفر: {{ p.stockQuantity }} قطعة</span>
                </span>

                <span *ngIf="p.stockQuantity > 0 && p.stockQuantity <= 5" class="text-amber-600 dark:text-amber-400 font-black flex items-center gap-1">
                  🔥 متبقي {{ p.stockQuantity }} فقط!
                </span>

                <span *ngIf="p.stockQuantity <= 0" class="text-rose-600 dark:text-rose-400 font-black">
                  غير متوفر
                </span>
              </div>
            </div>
          </div>

          <!-- Add to Cart Action -->
          <div class="p-5 pt-0">
            <button (click)="service.addToCart(p)" [disabled]="p.stockQuantity <= 0"
                    class="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
              <svg lucideIcon="shopping-cart" class="w-4 h-4"></svg>
              <span>{{ p.stockQuantity > 0 ? 'إضافة لسلة الشراء' : 'المنتج غير متوفر حالياً' }}</span>
            </button>
          </div>
        </div>

        <!-- Empty state when no products are added yet by staff/admin -->
        <div *ngIf="filteredProducts().length === 0" class="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 space-y-3">
          <div class="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <svg lucideIcon="package-open" class="w-8 h-8"></svg>
          </div>
          <h3 class="text-lg font-black text-slate-900 dark:text-white">لا توجد منتجات مضافة بالمتجر حالياً</h3>
          <p class="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            يقوم الموظفون والإدارة بإضافة المنتجات والمخزون من صفحة الموظفين والآدمن. بمجرد إضافة أي منتج بواسطة الموظف أو المدير، سيظهر للزبائن هنا فوراً!
          </p>
        </div>
      </div>

      <!-- Floating Cart Drawer Button & Delivery Driver Selection -->
      <div *ngIf="service.cart().length > 0" class="fixed bottom-6 left-6 z-40">
        <button (click)="openCartDrawer.set(true)" 
                class="px-6 py-4 bg-emerald-700 hover:bg-emerald-800 text-white font-black rounded-3xl shadow-2xl flex items-center gap-3 border-2 border-emerald-400/50 animate-bounce">
          <div class="relative">
            <svg lucideIcon="shopping-bag" class="w-6 h-6"></svg>
            <span class="absolute -top-2 -right-2 bg-amber-400 text-slate-900 font-black text-xs w-5 h-5 rounded-full flex items-center justify-center">
              {{ cartItemsCount() }}
            </span>
          </div>
          <span class="text-sm">سلة المشتريات ({{ cartTotal() }} ج.م)</span>
        </button>
      </div>

      <!-- CART & CHECKOUT MODAL -->
      <div *ngIf="openCartDrawer()" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
        <div class="bg-white dark:bg-slate-900 w-full max-w-md h-full p-6 overflow-y-auto flex flex-col justify-between font-sans dir-rtl">
          <div>
            <div class="flex justify-between items-center mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 class="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <svg lucideIcon="shopping-cart" class="w-6 h-6 text-emerald-600"></svg>
                <span>سلة مشترياتك وفاتورة الطلب</span>
              </h3>
              <button (click)="openCartDrawer.set(false)" class="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                <svg lucideIcon="x" class="w-5 h-5"></svg>
              </button>
            </div>

            <!-- Cart items -->
            <div class="space-y-4 mb-6">
              <div *ngFor="let item of service.cart()" class="flex gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800">
                <img [src]="item.product.imageUrl" [alt]="item.product.name" appImageFallback class="w-16 h-16 rounded-xl object-cover">
                <div class="flex-1">
                  <h4 class="font-bold text-slate-900 dark:text-white text-sm">{{ item.product.name }}</h4>
                  <p class="text-xs text-emerald-600 font-black">{{ item.product.price }} ج.م</p>
                  
                  <div class="flex items-center gap-3 mt-2">
                    <button (click)="service.updateCartQuantity(item.product.id, -1)" class="w-6 h-6 bg-slate-200 dark:bg-slate-700 rounded-md font-bold text-xs flex items-center justify-center">-</button>
                    <span class="text-xs font-black text-slate-900 dark:text-white">{{ item.quantity }}</span>
                    <button (click)="service.updateCartQuantity(item.product.id, 1)" class="w-6 h-6 bg-emerald-600 text-white rounded-md font-bold text-xs flex items-center justify-center">+</button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Delivery Driver Selection with Schedule Alert -->
            <div class="space-y-4 p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800 mb-6">
              <h4 class="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <svg lucideIcon="truck" class="w-4 h-4 text-emerald-600"></svg>
                <span>تحديد مندوب التوصيل المفضل</span>
              </h4>

              <select [(ngModel)]="selectedDriverId" (ngModelChange)="saveCustomerData()" class="w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold">
                <option [ngValue]="null">تلقائي (أسرع مندوب متاح)</option>
                <option *ngFor="let d of service.deliveryDrivers()" [value]="d.id">
                  {{ d.name }} - ({{ d.status }})
                </option>
              </select>

              <div *ngIf="selectedDriver()" class="p-3 bg-white dark:bg-slate-800 rounded-xl text-xs space-y-1 border border-slate-200 dark:border-slate-700">
                <p class="font-bold text-emerald-700 dark:text-emerald-400">تنبيه بمواعيد عمل المندوب:</p>
                <p class="text-slate-600 dark:text-slate-300">{{ selectedDriver()?.workingHoursInfo }}</p>
                <p class="text-slate-400">رقم التواصل: {{ selectedDriver()?.phone }}</p>
              </div>
            </div>

            <!-- Customer Details Form -->
            <div class="space-y-3 mb-6">
              <div class="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>بيانات العميل للتوصيل:</span>
                <span class="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 border border-emerald-300/40">
                  <svg lucideIcon="sparkles" class="w-3 h-3 text-amber-500 animate-pulse"></svg>
                  تُحفظ تلقائياً لتوفير وقتك ⚡
                </span>
              </div>
              <input type="text" [(ngModel)]="customerName" (ngModelChange)="saveCustomerData()" placeholder="الاسم بالكامل..." class="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
              <input type="tel" [(ngModel)]="customerPhone" (ngModelChange)="saveCustomerData()" placeholder="رقم الهاتف للواتس والتأكيد..." class="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
              <textarea [(ngModel)]="deliveryAddress" (ngModelChange)="saveCustomerData()" rows="2" placeholder="عنوان التوصيل بالتفصيل..." class="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"></textarea>
            </div>

            <!-- Payment Method Selector -->
            <div class="space-y-3 p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200 dark:border-indigo-800 mb-6">
              <h4 class="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-2">
                <svg lucideIcon="credit-card" class="w-4 h-4 text-indigo-600 dark:text-indigo-400"></svg>
                <span>طريقة الدفع الفوري أو عند التسليم</span>
              </h4>

              <div class="grid grid-cols-3 gap-2">
                <button type="button" (click)="paymentMethod = 'كاش'; saveCustomerData()"
                        class="p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1 cursor-pointer"
                        [ngClass]="paymentMethod === 'كاش' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md font-black' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'">
                  <span class="text-base">💵</span>
                  <span class="text-[11px] font-bold">كاش عند الدفع</span>
                </button>

                <button type="button" (click)="paymentMethod = 'فيزا'; saveCustomerData()"
                        class="p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1 cursor-pointer"
                        [ngClass]="paymentMethod === 'فيزا' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md font-black' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'">
                  <span class="text-base">💳</span>
                  <span class="text-[11px] font-bold">بطاقة فيزا</span>
                </button>

                <button type="button" (click)="paymentMethod = 'محفظة إلكترونية'; saveCustomerData()"
                        class="p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1 cursor-pointer"
                        [ngClass]="paymentMethod === 'محفظة إلكترونية' ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md font-black' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'">
                  <span class="text-base">📱</span>
                  <span class="text-[11px] font-bold">محفظة إلكترونية</span>
                </button>
              </div>

              <!-- Payment Method Instructions -->
              <div *ngIf="paymentMethod === 'محفظة إلكترونية'" class="p-3 bg-amber-100 dark:bg-amber-950/60 rounded-xl text-[11px] text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 space-y-1">
                <p class="font-bold">📱 محفظة (فودافون كاش / إنستا باي / فوري):</p>
                <p>يمكنك التحويل على رقم المحفظة المعتمد: <span class="font-mono font-black dir-ltr inline-block">01033567292</span> أو الدفع المباشر لمندوب التوصيل.</p>
              </div>

              <div *ngIf="paymentMethod === 'فيزا'" class="p-3 bg-indigo-100 dark:bg-indigo-950/60 rounded-xl text-[11px] text-indigo-900 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-800 space-y-1">
                <p class="font-bold">💳 الدفع بالبطاقة البنكية / الفيزا:</p>
                <p>سيكون بحوزة مندوب التوصيل ماكينة الدفع الإلكتروني (POS) لإتمام الخصم مباشرة.</p>
              </div>
            </div>
          </div>

          <!-- Checkout Action -->
          <div class="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div class="flex justify-between items-center text-lg font-black">
              <span>مجموع الفاتورة:</span>
              <span class="text-emerald-600">{{ cartTotal() }} ج.م</span>
            </div>

            <button (click)="submitOrder()" 
                    class="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-sm shadow-lg transition-all">
              تأكيد وإرسال طلب الشراء
            </button>
          </div>
        </div>
      </div>

      <!-- MISSING PRODUCT REQUEST MODAL -->
      <div *ngIf="openMissingProductModal()" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full font-sans dir-rtl space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
          <div class="flex justify-between items-center">
            <h3 class="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <svg lucideIcon="package-plus" class="w-5 h-5 text-amber-500"></svg>
              <span>طلب منتج غير متوفر بالمتجر</span>
            </h3>
            <button (click)="openMissingProductModal.set(false)" class="text-slate-400 hover:text-slate-600">
              <svg lucideIcon="x" class="w-5 h-5"></svg>
            </button>
          </div>

          <p class="text-xs text-slate-500">اكتب اسم المنتج الذي ترغب في شراءه ولم تجده لدينا، وسيقوم الموظفون بمراجعته وتوفيره فوراً.</p>

          <input type="text" [(ngModel)]="missingProdName" placeholder="اسم المنتج المطلوب بالتفصيل..." class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm">
          <input type="text" [(ngModel)]="customerName" (ngModelChange)="saveCustomerData()" placeholder="اسمك الكريم..." class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm">
          <input type="tel" [(ngModel)]="customerPhone" (ngModelChange)="saveCustomerData()" placeholder="رقم هاتفك للتواصل..." class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm">
          <textarea [(ngModel)]="missingProdNotes" rows="2" placeholder="ملاحظات إضافية أو الكمية المطلوبة..." class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"></textarea>

          <button (click)="sendMissingRequest()" [disabled]="!missingProdName"
                  class="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-sm disabled:opacity-40 transition-all">
            إرسال الإشعار للموظفين
          </button>
        </div>
      </div>

      <!-- CUSTOMER SAVED INVOICE MODAL DIALOG -->
      <div *ngIf="openInvoiceModal() && service.savedCustomerInvoice()" class="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full font-sans dir-rtl space-y-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
          
          <div class="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span class="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">فاتورة طلبك الأخير (محفوظة 24 ساعة):</span>
              <h3 class="text-xl font-black text-slate-900 dark:text-white mt-0.5">طلب #{{ service.savedCustomerInvoice()?.id }}</h3>
            </div>
            <button (click)="openInvoiceModal.set(false)" class="text-slate-400 hover:text-slate-600">
              <svg lucideIcon="x" class="w-5 h-5"></svg>
            </button>
          </div>

          <div class="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl space-y-2 text-xs border border-slate-200 dark:border-slate-700">
            <div class="flex justify-between">
              <span class="text-slate-500 font-bold">اسم العميل:</span>
              <span class="font-black text-slate-900 dark:text-white">{{ service.savedCustomerInvoice()?.customerName }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500 font-bold">الهاتف:</span>
              <span class="font-mono font-bold text-slate-900 dark:text-white dir-ltr">{{ service.savedCustomerInvoice()?.customerPhone }}</span>
            </div>
            <div *ngIf="service.savedCustomerInvoice()?.deliveryAddress" class="flex justify-between">
              <span class="text-slate-500 font-bold">العنوان:</span>
              <span class="font-bold text-slate-800 dark:text-slate-200">{{ service.savedCustomerInvoice()?.deliveryAddress }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500 font-bold">طريقة الدفع:</span>
              <span class="font-bold text-emerald-600">{{ service.savedCustomerInvoice()?.paymentMethod }}</span>
            </div>
          </div>

          <div class="space-y-2">
            <h4 class="font-black text-xs text-slate-700 dark:text-slate-300">تفاصيل الأصناف والكميات:</h4>
            <div class="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden text-xs">
              <div *ngFor="let item of service.savedCustomerInvoice()?.items" class="p-3 bg-white dark:bg-slate-900 flex justify-between items-center">
                <div class="flex items-center gap-2">
                  <span class="font-bold text-slate-900 dark:text-white">{{ item.product.name }}</span>
                  <span class="text-slate-400 font-bold">×{{ item.quantity }}</span>
                </div>
                <span class="font-black text-emerald-600 dark:text-emerald-400">{{ item.product.price * item.quantity }} ج.م</span>
              </div>
            </div>
          </div>

          <div class="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 flex justify-between items-center">
            <span class="font-black text-slate-900 dark:text-white text-sm">الإجمالي الحسابي المطلوب:</span>
            <span class="text-2xl font-black text-emerald-600 dark:text-emerald-400">{{ service.savedCustomerInvoice()?.totalPrice }} ج.م</span>
          </div>

          <div class="pt-2 flex justify-between items-center gap-3">
            <button (click)="openInvoiceModal.set(false)" class="px-5 py-2.5 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
              إغلاق
            </button>
            <button (click)="service.printThermalReceipt(service.savedCustomerInvoice()!)"
                    class="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl shadow-md transition-all flex items-center gap-2">
              <svg lucideIcon="printer" class="w-4 h-4"></svg>
              <span>طباعة الفاتورة</span>
            </button>
          </div>
        </div>
      </div>

      <!-- FLOATING FAQ CIRCLE BUTTON FOR CUSTOMER -->
      <div class="fixed bottom-6 left-6 z-40">
        <button (click)="openFaqModal.set(!openFaqModal())"
                class="relative group w-14 h-14 rounded-full bg-gradient-to-br from-emerald-600 via-teal-600 to-indigo-700 text-white flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all border-2 border-white/40 cursor-pointer">
          
          <div class="absolute -inset-1 bg-gradient-to-r from-emerald-400 to-amber-400 rounded-full blur-xs opacity-75 group-hover:opacity-100 transition duration-300 animate-pulse"></div>
          
          <div class="relative flex items-center justify-center">
            <svg lucideIcon="help-circle" class="w-7 h-7 text-white drop-shadow-md"></svg>
          </div>

          <!-- Counter Badge for FAQs -->
          <span *ngIf="service.faqs().length > 0" class="absolute -top-1 -right-1 bg-amber-400 text-slate-950 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md border border-slate-900">
            {{ service.faqs().length }}
          </span>

          <!-- Tooltip label -->
          <div class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block whitespace-nowrap bg-slate-900 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-xl border border-slate-700">
            💬 الأسئلة الشائعة وإجابات الموظفين
          </div>
        </button>
      </div>

      <!-- FLOATING FAQ MODAL DIALOG -->
      <div *ngIf="openFaqModal()" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full font-sans dir-rtl space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[85vh] flex flex-col">
          
          <div class="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div class="flex items-center gap-2">
              <div class="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <svg lucideIcon="help-circle" class="w-5 h-5"></svg>
              </div>
              <div>
                <h3 class="text-lg font-black text-slate-900 dark:text-white">الأسئلة الشائعة وإجابات الفرع</h3>
                <p class="text-[11px] text-slate-500">استفسارات وإرشادات تم إعدادها بواسطة طاقم عمل متجر أم القرى</p>
              </div>
            </div>
            <button (click)="openFaqModal.set(false)" class="text-slate-400 hover:text-slate-600">
              <svg lucideIcon="x" class="w-5 h-5"></svg>
            </button>
          </div>

          <!-- Search FAQs input -->
          <div class="relative shrink-0">
            <input type="text" [(ngModel)]="faqSearchQuery" placeholder="ابحث في الأسئلة والإجابات..."
                   class="w-full pl-4 pr-10 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white">
            <svg lucideIcon="search" class="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"></svg>
          </div>

          <!-- FAQ Items List -->
          <div class="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
            <div *ngFor="let faq of filteredFaqs()" class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
              <div class="flex items-start gap-2">
                <span class="px-2 py-0.5 rounded-lg bg-emerald-600 text-white text-[10px] font-black shrink-0 mt-0.5">سؤال</span>
                <h4 class="font-black text-slate-900 dark:text-white text-xs sm:text-sm leading-relaxed">{{ faq.question }}</h4>
              </div>

              <div class="flex items-start gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300">
                <span class="px-2 py-0.5 rounded-lg bg-indigo-600 text-white text-[10px] font-black shrink-0 mt-0.5">إجابة</span>
                <p class="leading-relaxed font-medium">{{ faq.answer }}</p>
              </div>
            </div>

            <div *ngIf="filteredFaqs().length === 0" class="text-center py-10 text-slate-400 space-y-2">
              <svg lucideIcon="help-circle" class="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700"></svg>
              <p class="text-xs font-bold">لا توجد أسئلة تطابق بحثك حالياً</p>
            </div>
          </div>

        </div>
      </div>

      <!-- STORE LAYOUT SKETCH MODAL DIALOG FOR CUSTOMERS -->
      <div *ngIf="openStoreLayoutSketchModal()" class="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-2xl w-full font-sans dir-rtl space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
          
          <div class="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
            <div class="flex items-center gap-2">
              <div class="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <svg lucideIcon="map" class="w-5 h-5"></svg>
              </div>
              <div>
                <h3 class="text-lg font-black text-slate-900 dark:text-white">الرسم الكروكي وخريطة الرفوف بالفرع</h3>
                <p class="text-[11px] text-slate-500">تم إعداد التخطيط والتوجيه بواسطة إدارة متجر أم القرى</p>
              </div>
            </div>
            <button (click)="openStoreLayoutSketchModal.set(false)" class="text-slate-400 hover:text-slate-600">
              <svg lucideIcon="x" class="w-5 h-5"></svg>
            </button>
          </div>

          <!-- Manager Sketch Image Preview (if uploaded) -->
          <div *ngIf="service.storeLayout().sketchImageUrl" class="rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md">
            <img [src]="service.storeLayout().sketchImageUrl" alt="الرسم الكروكي المرفوع من المدير" appImageFallback class="w-full max-h-72 object-contain bg-slate-950">
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div class="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
              <span class="text-slate-400 font-bold block mb-0.5">المدخل الرئيسي:</span>
              <p class="font-black text-slate-900 dark:text-white text-sm">{{ service.storeLayout().storeEntranceLabel }}</p>
            </div>
            <div class="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
              <span class="text-slate-400 font-bold block mb-0.5">الكاشير والاستقبال:</span>
              <p class="font-black text-slate-900 dark:text-white text-sm">{{ service.storeLayout().checkoutAreaLabel }}</p>
            </div>
            <div class="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
              <span class="text-slate-400 font-bold block mb-0.5">المخزن الداخلي:</span>
              <p class="font-black text-slate-900 dark:text-white text-sm">{{ service.storeLayout().warehouseAreaLabel }}</p>
            </div>
          </div>

          <!-- Aisles & Shelves Directory -->
          <div class="space-y-2">
            <h4 class="font-black text-xs text-slate-800 dark:text-white">الممرات والرفوف المسجلة:</h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div *ngFor="let aisle of service.storeLayout().aisles" class="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-1">
                <h5 class="font-black text-indigo-900 dark:text-indigo-300 text-sm">{{ aisle.name }}</h5>
                <p class="text-slate-600 dark:text-slate-400 text-[11px]">
                  الرفوف: {{ aisle.shelves.join(' • ') }}
                </p>
              </div>
            </div>
          </div>

          <div *ngIf="service.storeLayout().customSketchNotes" class="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 font-bold">
            ملاحظات توجيه الزبائن: {{ service.storeLayout().customSketchNotes }}
          </div>

          <div class="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button (click)="openStoreLayoutSketchModal.set(false)" class="px-5 py-2 bg-slate-900 dark:bg-slate-800 text-white font-black text-xs rounded-2xl">
              إغلاق الخريطة
            </button>
          </div>
        </div>
      </div>

      <!-- SINGLE PRODUCT LOCATION MAP MODAL -->
      <div *ngIf="selectedMapProduct()" class="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full font-sans dir-rtl space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
          
          <div class="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
            <div class="flex items-center gap-2">
              <svg lucideIcon="map-pin" class="w-5 h-5 text-indigo-600"></svg>
              <h3 class="text-base font-black text-slate-900 dark:text-white">موقع المنتج على خريطة الرفوف</h3>
            </div>
            <button (click)="selectedMapProduct.set(null)" class="text-slate-400 hover:text-slate-600">
              <svg lucideIcon="x" class="w-5 h-5"></svg>
            </button>
          </div>

          <div class="p-4 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-800 space-y-2 text-xs">
            <h4 class="font-black text-indigo-900 dark:text-indigo-200 text-base">{{ selectedMapProduct()?.name }}</h4>
            <p class="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
              موقع الرف: {{ selectedMapProduct()?.locationInStore || 'الممر الرئيسي' }}
            </p>
            <p *ngIf="selectedMapProduct()?.locationInWarehouse" class="text-slate-600 dark:text-slate-300">
              مكان القطع الإضافية بالمخزن: {{ selectedMapProduct()?.locationInWarehouse }}
            </p>
            <p *ngIf="selectedMapProduct()?.expectedRestockDate && (selectedMapProduct()?.stockQuantity || 0) <= 0" class="text-rose-600 dark:text-rose-400 font-bold">
              ⏳ موعد إعادة التوفر المتوقع: {{ selectedMapProduct()?.expectedRestockDate }}
            </p>
          </div>

          <div class="p-4 bg-slate-950 text-white rounded-2xl space-y-2 text-xs border border-slate-800">
            <div class="flex items-center gap-2 text-amber-400 font-bold">
              <svg lucideIcon="navigation" class="w-4 h-4"></svg>
              <span>خط سير الوصول بالمحل:</span>
            </div>
            <p class="text-slate-300 font-medium">
              ادخل من {{ service.storeLayout().storeEntranceLabel }} واتجه مباشرة إلى {{ selectedMapProduct()?.locationInStore }}
            </p>
          </div>

          <button (click)="selectedMapProduct.set(null)" class="w-full py-2.5 bg-indigo-600 text-white font-black text-xs rounded-2xl">
            تم الفهم والتوجه للرف
          </button>
        </div>
      </div>

    </div>
  `
})
export class OmAlQuraCustomerStoreComponent implements OnInit {
  service = inject(OmAlQuraService);

  searchQuery = '';
  selectedCategory = signal<string>('الكل');
  openCartDrawer = signal(false);
  openMissingProductModal = signal(false);
  openInvoiceModal = signal(false);
  openStoreLayoutSketchModal = signal(false);
  selectedMapProduct = signal<OmAlQuraProduct | null>(null);

  selectedDriverId: string | null = null;
  customerName = '';
  customerPhone = '';
  deliveryAddress = '';
  paymentMethod: OmAlQuraOrder['paymentMethod'] = 'كاش';

  missingProdName = '';
  missingProdNotes = '';

  ngOnInit() {
    this.loadCustomerData();
  }

  loadCustomerData() {
    const info = this.service.customerInfo();
    if (info) {
      this.customerName = info.name || '';
      this.customerPhone = info.phone || '';
      this.deliveryAddress = info.address || '';
      this.selectedDriverId = info.preferredDriverId || null;
      this.paymentMethod = info.preferredPaymentMethod || 'كاش';
    }
  }

  saveCustomerData() {
    this.service.saveCustomerInfo({
      name: this.customerName,
      phone: this.customerPhone,
      address: this.deliveryAddress,
      preferredDriverId: this.selectedDriverId,
      preferredPaymentMethod: this.paymentMethod
    });
  }

  categories = computed(() => ['الكل', ...this.service.categories()]);

  filteredProducts = computed(() => {
    let prods = this.service.products();
    if (this.selectedCategory() !== 'الكل') {
      prods = prods.filter(p => p.category === this.selectedCategory());
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      prods = prods.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.boycottAlternatives.some(a => a.toLowerCase().includes(q)));
    }
    return prods;
  });

  favoriteProducts = computed(() => {
    const favIds = this.service.userFavoriteProductIds();
    return this.service.products().filter(p => favIds.includes(p.id));
  });

  mostOrderedProducts = computed(() => {
    return [...this.service.products()].sort((a, b) => b.salesCount - a.salesCount).slice(0, 3);
  });

  customerActiveOrders = computed(() => {
    return this.service.orders().filter(o => o.status !== 'completed' && o.status !== 'cancelled');
  });

  cartItemsCount() {
    return this.service.cart().reduce((acc, i) => acc + i.quantity, 0);
  }

  cartTotal() {
    return this.service.cart().reduce((acc, i) => acc + (i.product.price * i.quantity), 0);
  }

  selectedDriver() {
    return this.service.deliveryDrivers().find(d => d.id === this.selectedDriverId);
  }

  openProductMapModal(p: OmAlQuraProduct) {
    this.selectedMapProduct.set(p);
  }

  submitOrder() {
    this.saveCustomerData();
    const order = this.service.submitOrder({
      orderType: 'delivery',
      customerName: this.customerName || 'زبون المتجر',
      customerPhone: this.customerPhone || '01000000000',
      deliveryAddress: this.deliveryAddress || 'عنوان العميل',
      paymentMethod: this.paymentMethod,
      assignedDriverId: this.selectedDriverId || undefined
    });

    if (order) {
      this.openCartDrawer.set(false);
    }
  }

  sendMissingRequest() {
    if (this.missingProdName) {
      this.saveCustomerData();
      this.service.requestMissingProduct(
        this.missingProdName,
        this.customerName || 'عميل',
        this.customerPhone || '01000000000',
        this.missingProdNotes
      );
      this.openMissingProductModal.set(false);
      this.missingProdName = '';
      this.missingProdNotes = '';
    }
  }

  // Floating Customer FAQ Drawer State & Action
  openFaqModal = signal(false);
  faqSearchQuery = '';

  filteredFaqs() {
    const query = (this.faqSearchQuery || '').trim().toLowerCase();
    const faqs = this.service.faqs();
    if (!query) return faqs;
    return faqs.filter(f => 
      f.question.toLowerCase().includes(query) || 
      f.answer.toLowerCase().includes(query)
    );
  }
}
