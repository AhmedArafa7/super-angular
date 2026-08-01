import { Component, inject, signal, computed, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { OmAlQura2Service, OmAlQura2Product, OmAlQura2DeliveryDriver, OmAlQura2Order, TechnicalDataSheet } from '../../../core/services/om-al-qura-2.service';
import { ImageFallbackDirective } from '../../../shared/directives/image-fallback.directive';
import { MetalCalculatorComponent } from './metal-calculator/metal-calculator.component';

@Component({
  selector: 'app-om-al-qura-2-customer-store',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideDynamicIcon, ImageFallbackDirective, MetalCalculatorComponent],
  template: `
    <div class="space-y-8 font-sans" dir="rtl">
      
      <!-- Customer Search & Filter Bar for Metals Factory -->
      <div class="bg-gradient-to-r from-slate-900 via-zinc-900 to-amber-950 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden border border-amber-500/30">
        <div class="relative z-10 space-y-4">
          <div class="flex flex-wrap justify-between items-center gap-4">
            <div>
              <h2 class="text-2xl font-black mb-1 flex items-center gap-2">
                <span>تصفح واطلب أحدث قطاعات المعادن والصاج والصلب</span>
                <span class="text-xs px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-400/30">توريد سريع ومقاسات خاصة</span>
              </h2>
              <p class="text-xs text-amber-200/80">ألومنيوم 6063، حديد صلب مجلفن، صاج بارد، إستانلس 304، مسبوكات نحاسية ومقاسات تقطيع بالليزر حسب الطلب</p>
            </div>
            
            <div class="flex flex-wrap items-center gap-2">
              <button (click)="toggleWeightCalculatorModal(true)" 
                      type="button"
                      class="px-4 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-black rounded-2xl text-xs flex items-center gap-2 border border-amber-400/40 shadow-sm transition-all cursor-pointer hover:scale-105 active:scale-95">
                <svg lucideIcon="calculator" class="w-4 h-4 text-amber-400"></svg>
                <span>🧮 حاسبة أوزان وأسعار المعادن</span>
              </button>

              <button (click)="openDataSheetsModal.set(true)" 
                      type="button"
                      class="px-4 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-black rounded-2xl text-xs flex items-center gap-2 border border-emerald-400/40 shadow-sm transition-all cursor-pointer hover:scale-105 active:scale-95">
                <svg lucideIcon="file-text" class="w-4 h-4 text-emerald-400"></svg>
                <span>📚 الكتالوجات والمواصفات الفنية</span>
              </button>

              <button (click)="toggleLaserSimulatorModal(true)" 
                      type="button"
                      class="px-4 py-2.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 font-black rounded-2xl text-xs flex items-center gap-2 border border-orange-400/40 shadow-sm transition-all cursor-pointer hover:scale-105 active:scale-95">
                <svg lucideIcon="zap" class="w-4 h-4 text-orange-400"></svg>
                <span>⚡ محاكي التتقطيع بالليزر والثني</span>
              </button>

              <button (click)="toggleTruckTrackerModal(true)" 
                      type="button"
                      class="px-4 py-2.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 font-black rounded-2xl text-xs flex items-center gap-2 border border-blue-400/40 shadow-sm transition-all cursor-pointer hover:scale-105 active:scale-95">
                <svg lucideIcon="truck" class="w-4 h-4 text-blue-400"></svg>
                <span>🚛 تتبع شاحنات النقل الثقيل (الحي)</span>
              </button>

              <button (click)="toggleFaqModal(true)" 
                      type="button"
                      class="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-2xl text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95">
                <svg lucideIcon="help-circle" class="w-4 h-4"></svg>
                <span>💬 استفسارات التوريد ({{ service.faqs().length }})</span>
              </button>

              <button (click)="openStoreLayoutSketchModal.set(true); openMapTab.emit()" 
                      class="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-black rounded-2xl text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer border border-amber-500/30 hover:scale-105 active:scale-95">
                <svg lucideIcon="map" class="w-4 h-4 text-amber-400"></svg>
                <span>مخطط المصنع وأماكن الرفوف والمعارض</span>
              </button>

              <button (click)="openMissingProductModal.set(true)" 
                      class="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-slate-950 font-black rounded-2xl text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95">
                <svg lucideIcon="plus-circle" class="w-4 h-4"></svg>
                <span>طلب مقاس أو قطاع معدني مخصص</span>
              </button>
            </div>
          </div>

          <!-- Search Box for Metals & Materials -->
          <div class="relative max-w-2xl">
            <input type="text" 
                   [ngModel]="searchQuery()" 
                   (ngModelChange)="searchQuery.set($event)" 
                   placeholder="ابحث عن ألومنيوم، حديد صلب، صاج مجلفن، مواسير، إستانلس، مسامير، أو زوايا معدنية..." 
                   class="w-full pl-4 pr-12 py-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-amber-400/30 text-white placeholder-amber-200/50 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
            <div class="absolute right-4 top-1/2 -translate-y-1/2 text-amber-400">
              <svg lucideIcon="search" class="w-5 h-5"></svg>
            </div>
          </div>

          <!-- LIVE METAL PRICE TICKER BAR (مؤشر أسعار البورصة المعادن المباشر) -->
          <div class="bg-slate-950/80 backdrop-blur-md rounded-2xl p-3 border border-amber-500/30 shadow-lg overflow-hidden relative">
            <div class="flex items-center gap-3">
              <div class="flex items-center gap-2 bg-amber-500/20 px-3 py-1.5 rounded-xl border border-amber-400/30 shrink-0">
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                <span class="text-xs font-black text-amber-300">مؤشر البورصة اليوم</span>
              </div>

              <div class="overflow-x-auto no-scrollbar whitespace-nowrap w-full">
                <div class="inline-flex items-center gap-4">
                  <div *ngFor="let item of service.liveMetalPrices()" class="inline-flex items-center gap-2 text-xs font-bold text-slate-200 bg-slate-900/90 px-3 py-1 rounded-xl border border-slate-800 shadow-sm">
                    <span class="text-amber-400 font-black">{{ item.name }}:</span>
                    <span class="font-mono text-white">{{ item.pricePerKg }} {{ item.unit }}</span>
                    <span class="text-[11px] px-1.5 py-0.5 rounded-md font-mono"
                          [ngClass]="item.trend === 'up' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : (item.trend === 'down' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-slate-700 text-slate-300')">
                      {{ item.trend === 'up' ? '▲ +' : (item.trend === 'down' ? '▼ ' : '► ') }}{{ item.changePercent }}%
                    </span>
                  </div>
                </div>
              </div>
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
                <span [ngClass]="ord.status === 'preparing' ? 'text-amber-500 font-black' : 'text-slate-500'">2. قيد التعيين والتجهيز بالمصنع</span>
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
                class="px-5 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border shrink-0"
                [ngClass]="selectedCategory() === cat ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md font-black' : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100'">
          {{ cat }}
        </button>
      </div>

      <!-- Main Product Grid with Alternatives Highlight -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <div *ngFor="let p of filteredProducts()" 
             class="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
          <div>
            <!-- Image & Badges -->
            <div (click)="openProductQuickView(p)" class="relative h-48 bg-slate-100 overflow-hidden cursor-pointer">
              <img [src]="p.imageUrl" [alt]="p.name" appImageFallback class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
              
              <!-- Gallery Photo Count Indicator -->
              <div *ngIf="p.images && p.images.length > 0" class="absolute bottom-3 left-3 bg-slate-900/85 text-amber-300 border border-slate-700 px-2.5 py-1 rounded-xl text-[10px] font-black flex items-center gap-1 shadow-md z-10">
                <svg lucideIcon="image" class="w-3.5 h-3.5"></svg>
                <span>+{{ p.images.length }} صور</span>
              </div>
              
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

              <!-- Active Pending Order Badge for Product -->
              <div *ngIf="orderedProductIdsInPending().has(p.id)" class="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-[11px] font-bold text-indigo-800 dark:text-indigo-300 flex items-center gap-1.5">
                <svg lucideIcon="check-circle-2" class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0"></svg>
                <span>اشتريته مسبقاً (طلبك الحالي قيد التنفيذ)</span>
              </div>

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
            
            <!-- Duplicate Order Warning Box -->
            <div *ngIf="isDuplicateCartOrder()" class="p-3.5 bg-amber-500/15 border-2 border-amber-500/80 rounded-2xl text-xs text-amber-900 dark:text-amber-200 space-y-1 font-bold">
              <div class="flex items-center gap-1.5 font-black text-amber-800 dark:text-amber-300">
                <svg lucideIcon="alert-triangle" class="w-4 h-4 text-amber-500 shrink-0"></svg>
                <span>تنبيه: لقد قمت بطلب نفس هذا الطلب بالفعل!</span>
              </div>
              <p class="text-[11px] font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                لديك طلب قائم مسبقاً بنفس هذه المنتجات والكميات وهو قيد المراجعة والتنفيذ. يرجى تغيير الطلب أو إضافة أصناف مختلفة قبل الإرسال.
              </p>
            </div>

            <div class="flex justify-between items-center text-lg font-black">
              <span>مجموع الفاتورة:</span>
              <span class="text-emerald-600">{{ cartTotal() }} ج.م</span>
            </div>

            <button (click)="submitOrder()" 
                    [disabled]="isDuplicateCartOrder()"
                    class="w-full py-3.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black rounded-2xl text-sm shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              {{ isDuplicateCartOrder() ? 'اشتريت هذا الطلب بالفعل (قيد التنفيذ)' : 'تأكيد وإرسال أمر الشراء والتوريد' }}
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
              <span>طلب قطاع معدني أو خام مخصص</span>
            </h3>
            <button (click)="openMissingProductModal.set(false)" class="text-slate-400 hover:text-slate-600">
              <svg lucideIcon="x" class="w-5 h-5"></svg>
            </button>
          </div>

          <p class="text-xs text-slate-500">اكتب اسم القطاع أو الصاج أو الخامة وسماكتها التي ترغب بتوريدها ولم تجدها بالمعرض، وسيقوم مهندسو المصنع بمراجعتها وتوفيرها فوراً.</p>

          <input type="text" [(ngModel)]="missingProdName" placeholder="اسم القطاع المعدني أو الخام وسماكته المطلوب بالتفصيل..." class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm">
          <input type="text" [(ngModel)]="customerName" (ngModelChange)="saveCustomerData()" placeholder="اسمك أو اسم الشركة/الورشة..." class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm">
          <input type="tel" [(ngModel)]="customerPhone" (ngModelChange)="saveCustomerData()" placeholder="رقم هاتفك للتواصل والتأكيد..." class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm">
          <textarea [(ngModel)]="missingProdNotes" rows="2" placeholder="ملاحظات الطول، الأمتار، الأطنان، أو رسم المقاسات..." class="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"></textarea>

          <button (click)="sendMissingRequest()" [disabled]="!missingProdName"
                  class="w-full py-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black rounded-2xl text-sm disabled:opacity-40 transition-all">
            إرسال مواصفات الطلب لمهندسي المصنع
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

          <!-- Order Confirmation Status Banner -->
          <div class="p-4 bg-emerald-500/10 dark:bg-emerald-950/50 border-2 border-emerald-500/80 rounded-2xl flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shrink-0 shadow-md">
              <svg lucideIcon="check-circle-2" class="w-6 h-6"></svg>
            </div>
            <div>
              <h4 class="font-black text-sm text-emerald-800 dark:text-emerald-300">تم الطلب وسيتم مراجعة طلبك وتنفيذه</h4>
              <p class="text-[11px] font-bold text-slate-600 dark:text-slate-400 mt-0.5">طلبك قيد المتابعة من فريق العمل، وتفاصيل الفاتورة مبينة أدناه.</p>
            </div>
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
      <div class="fixed bottom-6 right-6 z-40">
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
      <div *ngIf="openFaqModal()" class="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full font-sans dir-rtl space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[90vh] flex flex-col">
          
          <div class="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-black border border-amber-500/30">
                <svg lucideIcon="help-circle" class="w-5 h-5"></svg>
              </div>
              <div>
                <h3 class="text-base font-black text-slate-900 dark:text-white">💬 مركز استفسارات التوريد والمواصفات الفنية</h3>
                <p class="text-[11px] text-amber-600 dark:text-amber-400 font-bold">مصنع محمود عرفه للمعادن وتصنيع الصاج والألومنيوم</p>
              </div>
            </div>
            <button (click)="openFaqModal.set(false)" class="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-all">
              <svg lucideIcon="x" class="w-5 h-5"></svg>
            </button>
          </div>

          <!-- Submit New Supply Inquiry Form -->
          <div class="p-4 bg-slate-50 dark:bg-slate-800/90 rounded-2xl border border-amber-500/30 space-y-2.5 shrink-0">
            <label class="block text-xs font-black text-slate-900 dark:text-amber-300">طرح استفسار توريد أو مقاسات هندسية جديد:</label>
            <div class="flex gap-2">
              <input type="text" 
                     [(ngModel)]="newFaqText" 
                     placeholder="اكتب استفسارك (مثال: هل يتوفر تقطيع ليزر لسماكة 5 مم؟)..." 
                     class="flex-1 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500">
              <button (click)="submitNewFaq()" 
                      class="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all shrink-0 cursor-pointer">
                إرسال
              </button>
            </div>
          </div>

          <!-- Search FAQs input -->
          <div class="relative shrink-0">
            <input type="text" [ngModel]="faqSearchQuery()" (ngModelChange)="faqSearchQuery.set($event)" placeholder="ابحث في الاستفسارات السابقة وإجابات المهندسين..."
                   class="w-full pl-4 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400">
            <svg lucideIcon="search" class="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"></svg>
          </div>

          <!-- FAQ Items List -->
          <div class="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
            <div *ngFor="let faq of filteredFaqs()" class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
              <div class="flex items-start justify-between gap-2">
                <div class="flex items-start gap-2">
                  <span class="px-2 py-0.5 rounded-lg bg-amber-600 text-slate-950 text-[10px] font-black shrink-0 mt-0.5">استفسار</span>
                  <h4 class="font-black text-slate-900 dark:text-white text-xs sm:text-sm leading-relaxed">{{ faq.question }}</h4>
                </div>
                <span *ngIf="faq.category" class="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold shrink-0">
                  {{ faq.category }}
                </span>
              </div>

              <div class="flex items-start gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300">
                <span class="px-2 py-0.5 rounded-lg bg-emerald-600 text-white text-[10px] font-black shrink-0 mt-0.5">إجابة المصنع</span>
                <p class="leading-relaxed font-medium text-emerald-700 dark:text-emerald-300">{{ faq.answer }}</p>
              </div>
            </div>

            <div *ngIf="filteredFaqs().length === 0" class="text-center py-8 text-slate-400 space-y-2">
              <svg lucideIcon="help-circle" class="w-10 h-10 mx-auto text-slate-400 dark:text-slate-600"></svg>
              <p class="text-xs font-bold">لا توجد استفسارات تطابق بحثك حالياً</p>
            </div>
          </div>

          <div class="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0">
            <button (click)="openFaqModal.set(false)" class="px-5 py-2.5 bg-slate-900 dark:bg-slate-800 text-white font-black text-xs rounded-xl cursor-pointer">
              إغلاق النافذة
            </button>
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

      <!-- 1. METAL WEIGHT & PRICE CALCULATOR MODAL (REFACTORED ONPUSH COMPONENT) -->
      <app-metal-calculator 
        [isOpen]="openWeightCalculatorModal()" 
        (closeModal)="openWeightCalculatorModal.set(false)" 
        (itemAddedToCart)="openCartDrawer.set(true)">
      </app-metal-calculator>

      <!-- TECHNICAL DATA SHEETS & SPECS MODAL (مكتبة المواصفات والكتالوجات الفنية الهندسية) -->
      <div *ngIf="openDataSheetsModal()"
           class="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-3xl w-full border border-emerald-500/40 shadow-2xl space-y-6 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
          
          <div class="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-black">
                <svg lucideIcon="file-text" class="w-6 h-6"></svg>
              </div>
              <div>
                <h3 class="text-xl font-black text-slate-900 dark:text-white">📚 مكتبة الكتالوجات والمواصفات الفنية الهندسية</h3>
                <p class="text-xs text-slate-500 mt-0.5">تحميل ومعاينة جداول الأوزان القياسية والتركيب الكيميائي للمعادن والصاج</p>
              </div>
            </div>

            <button (click)="openDataSheetsModal.set(false)" type="button" class="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center">
              <svg lucideIcon="x" class="w-5 h-5"></svg>
            </button>
          </div>

          <!-- Data Sheets Cards Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div *ngFor="let ds of service.technicalDataSheets()" 
                 class="bg-slate-50 dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 hover:border-emerald-500/50 transition-all space-y-3 flex flex-col justify-between shadow-sm">
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <span class="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 text-[10px] font-black border border-emerald-500/30">
                    {{ ds.category }}
                  </span>
                  <span class="text-xs font-mono font-bold text-slate-400">{{ ds.metalCode }}</span>
                </div>

                <h4 class="font-black text-slate-900 dark:text-white text-sm leading-snug">{{ ds.title }}</h4>
                <p class="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{{ ds.description }}</p>

                <div class="grid grid-cols-2 gap-2 text-[11px] font-bold bg-white dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                  <div>
                    <span class="text-slate-400 block text-[10px]">الكثافة القياسية:</span>
                    <span class="text-slate-800 dark:text-slate-200">{{ ds.density }} جم/سم³</span>
                  </div>
                  <div>
                    <span class="text-slate-400 block text-[10px]">مقاومة الشد:</span>
                    <span class="text-slate-800 dark:text-slate-200">{{ ds.tensileStrengthMpa }} MPa</span>
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                <button (click)="selectedDataSheet.set(ds)" class="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm">
                  <svg lucideIcon="eye" class="w-3.5 h-3.5"></svg>
                  <span>معاينة الجدول</span>
                </button>
                
                <button (click)="downloadDataSheetFile(ds)" class="py-2 px-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1">
                  <svg lucideIcon="download" class="w-3.5 h-3.5 text-emerald-500"></svg>
                  <span>تحميل</span>
                </button>
              </div>
            </div>
          </div>

          <!-- PREVIEW MODAL FOR SPECIFIC SHEET -->
          <div *ngIf="selectedDataSheet()" class="p-5 bg-emerald-950/20 border-2 border-emerald-500/40 rounded-2xl space-y-4 shadow-md">
            <div class="flex justify-between items-center border-b border-emerald-500/20 pb-2">
              <h4 class="font-black text-emerald-400 text-sm">تفاصيل والتركيب الكيميائي: {{ selectedDataSheet()?.title }}</h4>
              <button (click)="selectedDataSheet.set(null)" class="text-xs text-slate-400 hover:text-white font-bold">إغلاق المعاينة ×</button>
            </div>

            <div class="space-y-3 text-xs">
              <div>
                <span class="font-bold text-slate-300 block mb-1">التركيب الكيميائي الهندسي (Chemical Composition):</span>
                <div class="flex flex-wrap gap-2">
                  <span *ngFor="let c of selectedDataSheet()?.chemicalComposition" class="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 font-mono">
                    {{ c.element }}: <strong class="text-amber-400">{{ c.percentage }}</strong>
                  </span>
                </div>
              </div>

              <div>
                <span class="font-bold text-slate-300 block mb-1">جدول الأوزان والقطاعات النمطية:</span>
                <table class="w-full text-right text-xs">
                  <thead class="bg-slate-900 text-slate-300">
                    <tr>
                      <th class="p-2">المواصفة والمقاس القياسي</th>
                      <th class="p-2">وزن المتر (كجم)</th>
                      <th class="p-2">ملاحظة الكثافة</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-800 text-slate-300">
                    <tr *ngFor="let w of selectedDataSheet()?.standardWeights">
                      <td class="p-2 font-bold">{{ w.sizeSpec }}</td>
                      <td class="p-2 font-mono text-emerald-400 font-bold">{{ w.weightKgPerMeter }} كجم</td>
                      <td class="p-2 text-slate-400">{{ w.densityNote }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <button (click)="openDataSheetsModal.set(false)" type="button" class="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-2xl">
            إغلاق الكتالوجات
          </button>
        </div>
      </div>

      <!-- PRODUCT QUICK VIEW & IMAGE GALLERY MODAL (معرض صور المنتج والتفاصيل الهندسية) -->
      <div *ngIf="openProductGalleryModal() && selectedQuickViewProduct()"
           class="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-2xl w-full border border-amber-500/40 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200 max-h-[92vh] overflow-y-auto">
          
          <div class="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <span class="text-[10px] px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-400/30">معاينة تفاصيل وخامات المنتج</span>
              <h3 class="text-lg font-black text-slate-900 dark:text-white mt-1">{{ selectedQuickViewProduct()?.name }}</h3>
            </div>
            
            <button (click)="openProductGalleryModal.set(false)" type="button" class="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center">
              <svg lucideIcon="x" class="w-5 h-5"></svg>
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Left Side: Interactive Gallery Slider -->
            <div class="space-y-3">
              <!-- Active Large Image -->
              <div class="relative h-64 bg-slate-100 dark:bg-slate-950 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                <img [src]="getProductGalleryImages()[activeImageIdxIndex()]" [alt]="selectedQuickViewProduct()?.name" appImageFallback class="w-full h-full object-cover">
                
                <!-- Slide count badge -->
                <div class="absolute bottom-3 left-3 bg-slate-950/70 text-slate-200 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                  {{ activeImageIdxIndex() + 1 }} / {{ getProductGalleryImages().length }}
                </div>
              </div>

              <!-- Clickable Gallery Thumbnails -->
              <div *ngIf="getProductGalleryImages().length > 1" class="flex flex-wrap gap-2 justify-center">
                <button *ngFor="let img of getProductGalleryImages(); let idx = index" 
                        (click)="activeImageIdxIndex.set(idx)"
                        class="w-14 h-14 rounded-xl overflow-hidden border-2 transition-all"
                        [ngClass]="activeImageIdxIndex() === idx ? 'border-amber-500 scale-105 shadow-md' : 'border-transparent hover:border-slate-300 opacity-70 hover:opacity-100'">
                  <img [src]="img" appImageFallback class="w-full h-full object-cover">
                </button>
              </div>
            </div>

            <!-- Right Side: Details & Action Buttons -->
            <div class="space-y-4 flex flex-col justify-between">
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs text-slate-500">القسم:</span>
                  <span class="text-xs font-bold text-amber-500">{{ selectedQuickViewProduct()?.category }}</span>
                </div>

                <div class="flex items-center justify-between">
                  <span class="text-xs text-slate-500">موقع المنتج بالمصنع:</span>
                  <span class="text-xs font-bold text-slate-700 dark:text-slate-300">{{ selectedQuickViewProduct()?.locationInStore }}</span>
                </div>

                <div *ngIf="selectedQuickViewProduct()?.locationInWarehouse" class="flex items-center justify-between">
                  <span class="text-xs text-slate-500">موقعه بالمخزن:</span>
                  <span class="text-xs font-bold text-slate-700 dark:text-slate-300">{{ selectedQuickViewProduct()?.locationInWarehouse }}</span>
                </div>

                <div class="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2">
                  <span class="text-xs text-slate-500">السعر:</span>
                  <div class="text-right">
                    <span class="text-lg font-black text-emerald-600 dark:text-emerald-400">{{ selectedQuickViewProduct()?.price }} ج.م</span>
                    <span *ngIf="selectedQuickViewProduct()!.discountPercent > 0" class="text-[10px] text-rose-500 line-through block">
                      {{ Math.round(selectedQuickViewProduct()!.price / (1 - selectedQuickViewProduct()!.discountPercent/100)) }} ج.م
                    </span>
                  </div>
                </div>

                <div class="space-y-1 pt-1">
                  <span class="text-xs text-slate-500 font-bold block">الوصف والتفاصيل:</span>
                  <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{{ selectedQuickViewProduct()?.description }}</p>
                </div>
              </div>

              <div class="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <button (click)="service.addToCart(selectedQuickViewProduct()!); openProductGalleryModal.set(false)" 
                        [disabled]="selectedQuickViewProduct()!.stockQuantity <= 0"
                        class="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:from-slate-300 disabled:to-slate-400 text-slate-950 font-black text-xs rounded-2xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all">
                  <svg lucideIcon="shopping-cart" class="w-4 h-4"></svg>
                  <span>{{ selectedQuickViewProduct()!.stockQuantity > 0 ? '+ إضافة لسلة الشراء والطلب' : 'غير متوفر حالياً' }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. LASER CUTTING & CNC BENDING SIMULATOR MODAL (محاكي التتقطيع بالليزر والثني) -->
      <div *ngIf="openLaserSimulatorModal()" 
           class="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-xl w-full border border-orange-500/40 shadow-2xl space-y-6 animate-in fade-in zoom-in duration-200">
          
          <div class="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-2xl bg-orange-500/20 text-orange-500 flex items-center justify-center font-black">
                <svg lucideIcon="zap" class="w-6 h-6"></svg>
              </div>
              <div>
                <h3 class="text-xl font-black text-slate-900 dark:text-white">⚡ محاكي تكلفة التقطيع بالليزر والثني CNC</h3>
                <p class="text-xs text-slate-500 mt-0.5">حساب أمتار التقطيع بالليزر وعدد الثنيات والتثقيب بدقة هندسية</p>
              </div>
            </div>

            <button (click)="openLaserSimulatorModal.set(false)" type="button" class="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center">
              <svg lucideIcon="x" class="w-5 h-5"></svg>
            </button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">طول خط التقطيع بالليزر (متر):</label>
              <input type="number" [(ngModel)]="laserMeterLength" min="1" step="1" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white">
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">سماكة الصوج/القطاع (مم):</label>
              <input type="number" [(ngModel)]="laserSheetThickness" min="1" step="1" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white">
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">عدد ثنيات CNC المطلوب:</label>
              <input type="number" [(ngModel)]="cncBendCount" min="0" step="1" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white">
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">عدد نقاط الاختراق (Piercing):</label>
              <input type="number" [(ngModel)]="laserPiercingPoints" min="0" step="1" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white">
            </div>
          </div>

          <!-- COST BREAKDOWN -->
          <div class="p-5 bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-600/10 border-2 border-orange-500/40 rounded-2xl space-y-3">
            <h4 class="font-black text-xs text-slate-800 dark:text-white border-b border-orange-500/20 pb-2">تفاصيل تكلفة المصنعية والتجهيز:</h4>
            <div class="space-y-1.5 text-xs">
              <div class="flex justify-between text-slate-600 dark:text-slate-300 font-bold">
                <span>تكلفة تقطيع الليزر ({{ laserMeterLength }} متر):</span>
                <span>{{ Math.round((laserMeterLength || 0) * (selectedMetalMaterial ? selectedMetalMaterial.laserRatePerMeter : 15) * (1 + ((laserSheetThickness || 1) - 1) * 0.15)) }} ج.م</span>
              </div>
              <div class="flex justify-between text-slate-600 dark:text-slate-300 font-bold">
                <span>تكلفة ثنيات الـ CNC ({{ cncBendCount }} ثنيات):</span>
                <span>{{ (cncBendCount || 0) * 15 }} ج.م</span>
              </div>
              <div class="flex justify-between text-slate-600 dark:text-slate-300 font-bold">
                <span>تكلفة نقاط اختراق البداية ({{ laserPiercingPoints }} ثقب):</span>
                <span>{{ (laserPiercingPoints || 0) * 5 }} ج.م</span>
              </div>
              <div class="flex justify-between text-base font-black text-orange-600 dark:text-orange-400 pt-2 border-t border-orange-500/30">
                <span>إجمالي تكلفة تشكيل الخدمة:</span>
                <span>{{ calculatedLaserCost }} ج.م</span>
              </div>
            </div>
          </div>

          <button (click)="openLaserSimulatorModal.set(false)" type="button" class="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-black text-sm rounded-2xl shadow-md transition-all cursor-pointer">
            اعتماد الحساب ومتابعة طلب التوريد
          </button>
        </div>
      </div>

      <!-- 3. LIVE HEAVY METAL TRUCK DELIVERY TRACKER MODAL (تتبع شاحنات النقل الثقيل) -->
      <div *ngIf="openTruckTrackerModal()" 
           class="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-2xl w-full border border-blue-500/40 shadow-2xl space-y-6 animate-in fade-in zoom-in duration-200">
          
          <div class="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-500 flex items-center justify-center font-black">
                <svg lucideIcon="truck" class="w-6 h-6"></svg>
              </div>
              <div>
                <h3 class="text-xl font-black text-slate-900 dark:text-white">🚛 شاشة تتبع شاحنات النقل الثقيل والحمولات مباشرة</h3>
                <p class="text-xs text-slate-500 mt-0.5">تتبع مرحلة الشاحنة من التحميل بالمصنع وميزان البسكول وحتى التفريغ بالموقع</p>
              </div>
            </div>

            <button (click)="openTruckTrackerModal.set(false)" type="button" class="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center">
              <svg lucideIcon="x" class="w-5 h-5"></svg>
            </button>
          </div>

          <!-- TRUCK ACTIVE SHIPMENT DETAILS CARD -->
          <div class="p-5 bg-gradient-to-r from-slate-900 via-zinc-900 to-slate-900 border border-blue-500/40 rounded-2xl text-white space-y-4 shadow-lg">
            <div class="flex flex-wrap justify-between items-center gap-2 border-b border-slate-800 pb-3">
              <div class="flex items-center gap-3">
                <span class="px-3 py-1 rounded-full text-xs font-black bg-blue-600 text-white">
                  شاحنة مرسيدس نقل ثقيل #TRK-849
                </span>
                <span class="text-xs font-bold text-amber-400">رقم اللوحة: ط د ر 8492</span>
              </div>
              <span class="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-500/40">
                ⚖️ صافي وزن البسكول: 4,250 كجم (4.25 طن)
              </span>
            </div>

            <!-- LIVE TIMELINE STAGES -->
            <div class="space-y-3 pt-2">
              <h4 class="text-xs font-bold text-slate-400">مراحل التوريد المباشرة:</h4>
              <div class="grid grid-cols-1 sm:grid-cols-4 gap-2 text-center text-xs">
                <div class="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold">
                  <span>⚙️ 1. تحميل القطاعات</span>
                  <p class="text-[10px] text-emerald-400/80 mt-0.5">تم المراجعة بالمصنع</p>
                </div>

                <div class="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold">
                  <span>⚖️ 2. ميزان البسكول</span>
                  <p class="text-[10px] text-emerald-400/80 mt-0.5">تم توزين الحمولة</p>
                </div>

                <div class="p-3 rounded-xl bg-amber-500/20 border-2 border-amber-400 text-amber-300 font-black animate-pulse">
                  <span>🚛 3. الشاحنة على الطريق</span>
                  <p class="text-[10px] text-amber-300 mt-0.5">وصول متوقع خلال 30 د</p>
                </div>

                <div class="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-400 font-bold">
                  <span>✅ 4. التفريغ بالموقع</span>
                  <p class="text-[10px] text-slate-500 mt-0.5">في الانتظار بالموقع</p>
                </div>
              </div>
            </div>

            <div class="flex flex-wrap justify-between items-center gap-3 pt-3 border-t border-slate-800 text-xs">
              <div class="flex items-center gap-2">
                <span class="font-bold text-slate-300">السائق المسؤول:</span>
                <span class="font-black text-amber-400">سعيد عبد الرحمن (شاحنة النقل الثقيل)</span>
              </div>
              <a href="tel:01033334444" class="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center gap-1.5 transition-all">
                <svg lucideIcon="phone" class="w-3.5 h-3.5"></svg>
                <span>اتصال بالسائق</span>
              </a>
            </div>
          </div>

          <button (click)="openTruckTrackerModal.set(false)" type="button" class="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-black text-xs rounded-2xl cursor-pointer">
            إغلاق تتبع الشاحنة
          </button>
        </div>
      </div>

    </div>
  `
})
export class OmAlQura2CustomerStoreComponent implements OnInit {
  service = inject(OmAlQura2Service);

  @Output() openMapTab = new EventEmitter<void>();

  Math = Math;

  metalsList = [
    { id: 'steel', name: 'حديد (Steel)', density: 7.85, defaultPrice: 55, laserRatePerMeter: 15 },
    { id: 'aluminum', name: 'ألومنيوم (Aluminum)', density: 2.7, defaultPrice: 180, laserRatePerMeter: 12 },
    { id: 'stainless', name: 'استانلس (Stainless Steel)', density: 7.93, defaultPrice: 195, laserRatePerMeter: 25 },
    { id: 'copper', name: 'نحاس (Copper)', density: 8.96, defaultPrice: 420, laserRatePerMeter: 35 }
  ];

  shapesList = [
    { id: 'sheet', name: 'لوح صاج (Sheet/Plate)' },
    { id: 'bar', name: 'عمود مصمت (Solid Round Bar)' },
    { id: 'tube', name: 'ماسورة (Round Tube)' },
    { id: 'angle', name: 'زاوية (Angle / L-Shape)' }
  ];

  selectedMetalId = 'steel';
  selectedShapeId = 'sheet';
  metalPricePerKg = 55;

  lengthM = 1;
  widthCm = 100;
  thicknessMm = 2;
  outerDiameterMm = 50;
  leg1Cm = 5;
  leg2Cm = 5;
  quantity = 1;

  openWeightCalculatorModal = signal(false);

  openLaserSimulatorModal = signal(false);
  laserMeterLength = 10;
  laserSheetThickness = 2;
  cncBendCount = 4;
  laserPiercingPoints = 5;

  openTruckTrackerModal = signal(false);

  toggleWeightCalculatorModal(state: boolean = true) {
    this.openWeightCalculatorModal.set(state);
  }

  toggleLaserSimulatorModal(state: boolean = true) {
    this.openLaserSimulatorModal.set(state);
  }

  toggleTruckTrackerModal(state: boolean = true) {
    this.openTruckTrackerModal.set(state);
  }

  onMetalChange() {
    const metal = this.metalsList.find(m => m.id === this.selectedMetalId);
    if (metal) {
      this.metalPricePerKg = metal.defaultPrice;
    }
  }

  get selectedMetalObj() {
    return this.metalsList.find(m => m.id === this.selectedMetalId) || this.metalsList[0];
  }

  get selectedShapeObj() {
    return this.shapesList.find(s => s.id === this.selectedShapeId) || this.shapesList[0];
  }

  get calculatedSingleVolumeCm3() {
    const lenCm = Math.max(0, (this.lengthM || 0)) * 100;
    const thickCm = Math.max(0, (this.thicknessMm || 0)) / 10;
    const widthCm = Math.max(0, (this.widthCm || 0));

    if (this.selectedShapeId === 'sheet') {
      return lenCm * widthCm * thickCm;
    } else if (this.selectedShapeId === 'bar') {
      const radiusCm = Math.max(0, (this.outerDiameterMm || 0)) / 20;
      return Math.PI * radiusCm * radiusCm * lenCm;
    } else if (this.selectedShapeId === 'tube') {
      const outerRadiusCm = Math.max(0, (this.outerDiameterMm || 0)) / 20;
      const innerRadiusCm = Math.max(0, outerRadiusCm - thickCm);
      const crossAreaCm2 = Math.PI * (outerRadiusCm * outerRadiusCm - innerRadiusCm * innerRadiusCm);
      return crossAreaCm2 * lenCm;
    } else if (this.selectedShapeId === 'angle') {
      const leg1 = Math.max(0, (this.leg1Cm || 0));
      const leg2 = Math.max(0, (this.leg2Cm || 0));
      const crossAreaCm2 = Math.max(0, (leg1 + leg2 - thickCm) * thickCm);
      return crossAreaCm2 * lenCm;
    }
    return 0;
  }

  get calculatedTotalWeightKg() {
    const volCm3 = this.calculatedSingleVolumeCm3;
    const density = Math.max(0, this.selectedMetalObj?.density || 7.85);
    const qty = Math.max(1, this.quantity || 1);
    const totalGrams = volCm3 * density * qty;
    return parseFloat((totalGrams / 1000).toFixed(2));
  }

  get calculatedTotalWeightTons() {
    return parseFloat((this.calculatedTotalWeightKg / 1000).toFixed(3));
  }

  get calculatedTotalPriceEgp() {
    return Math.round(this.calculatedTotalWeightKg * (this.metalPricePerKg || 0));
  }

  addCalculatedItemToCart() {
    const metal = this.selectedMetalObj;
    const shape = this.selectedShapeObj;
    const name = `${metal.name} - ${shape.name} (وزن ${this.calculatedTotalWeightKg}كجم)`;
    const price = this.calculatedTotalPriceEgp;
    const customProd: OmAlQura2Product = {
      id: 'custom-' + Date.now(),
      name: name,
      category: 'قطاعات ومقاسات مخصصة',
      price: price,
      stockQuantity: 99,
      discountPercent: 0,
      isBoycott: false,
      boycottAlternatives: [],
      locationInStore: 'الممر 1 (علوي)',
      isInWarehouse: false,
      imageUrl: 'https://images.unsplash.com/photo-1535813547-99c456a41d4a?w=400',
      description: `خام معدني مخصص بالوزن والأبعاد: نوع ${metal.name}، شكل ${shape.name}، الطول ${this.lengthM}م، الكمية: ${this.quantity} قطعة، الوزن الإجمالي: ${this.calculatedTotalWeightKg} كجم.`,
      salesCount: 1
    };

    this.service.addToCart(customProd);
    this.openWeightCalculatorModal.set(false);
    this.openCartDrawer.set(true);
  }

  customerQuoteName = '';
  openDataSheetsModal = signal(false);
  selectedDataSheet = signal<TechnicalDataSheet | null>(null);

  openProductGalleryModal = signal(false);
  selectedQuickViewProduct = signal<OmAlQura2Product | null>(null);
  activeImageIdxIndex = signal<number>(0);

  openProductQuickView(p: OmAlQura2Product) {
    this.selectedQuickViewProduct.set(p);
    this.activeImageIdxIndex.set(0);
    this.openProductGalleryModal.set(true);
  }

  getProductGalleryImages(): string[] {
    const p = this.selectedQuickViewProduct();
    if (!p) return [];
    const arr = [p.imageUrl];
    if (p.images && p.images.length > 0) {
      p.images.forEach(img => {
        if (img && img.trim() && !arr.includes(img)) {
          arr.push(img);
        }
      });
    }
    return arr;
  }

  exportCalculatorPdf() {
    this.service.generateOfficialQuotePdf({
      customerName: this.customerQuoteName,
      metalName: this.selectedMetalObj.name,
      density: this.selectedMetalObj.density,
      shapeName: this.selectedShapeObj.name,
      lengthM: this.lengthM,
      widthCm: this.selectedShapeId === 'sheet' ? this.widthCm : undefined,
      thicknessMm: ['sheet', 'tube', 'angle'].includes(this.selectedShapeId) ? this.thicknessMm : undefined,
      outerDiameterMm: ['bar', 'tube'].includes(this.selectedShapeId) ? this.outerDiameterMm : undefined,
      leg1Cm: this.selectedShapeId === 'angle' ? this.leg1Cm : undefined,
      leg2Cm: this.selectedShapeId === 'angle' ? this.leg2Cm : undefined,
      quantity: this.quantity,
      pricePerKg: this.metalPricePerKg,
      totalWeightKg: this.calculatedTotalWeightKg,
      totalWeightTons: this.calculatedTotalWeightTons,
      totalPriceEgp: this.calculatedTotalPriceEgp
    });
  }

  sendCalculatorToWhatsApp() {
    let widthOrDia = '';
    if (this.selectedShapeId === 'sheet') widthOrDia = `عرض ${this.widthCm}سم`;
    else if (this.selectedShapeId === 'bar' || this.selectedShapeId === 'tube') widthOrDia = `قطر ${this.outerDiameterMm}مم`;
    else if (this.selectedShapeId === 'angle') widthOrDia = `جناحين ${this.leg1Cm}×${this.leg2Cm}سم`;

    const url = this.service.getWhatsAppQuoteLink('01000000000', {
      metalName: this.selectedMetalObj.name,
      shapeName: this.selectedShapeObj.name,
      lengthM: this.lengthM,
      widthOrDia: widthOrDia,
      thicknessMm: this.thicknessMm || 0,
      quantity: this.quantity,
      weightKg: this.calculatedTotalWeightKg,
      priceEgp: this.calculatedTotalPriceEgp,
      customerName: this.customerQuoteName
    });

    window.open(url, '_blank');
  }

  downloadDataSheetFile(ds: TechnicalDataSheet) {
    const textContent = `
============================================================
مصنع محمود عرفه للمعادن وتصنيع الصاج والألومنيوم
TECHNICAL DATA SHEET / الكتالوج الفني الهندسي
============================================================
عنوان الكتالوج: ${ds.title}
القسم والسبائك: ${ds.category} (${ds.metalCode})
الكثافة القياسية: ${ds.density} جم/سم³
مقاومة الشد (Tensile Strength): ${ds.tensileStrengthMpa} MPa

------------------------------------------------------------
التركيب الكيميائي الهندسي (Chemical Composition):
------------------------------------------------------------
${ds.chemicalComposition.map(c => `- ${c.element}: ${c.percentage}`).join('\n')}

------------------------------------------------------------
جدول الأوزان والقطاعات القياسية النمطية:
------------------------------------------------------------
${ds.standardWeights.map(w => `• ${w.sizeSpec} ==> متوسط الوزن: ${w.weightKgPerMeter} كجم (${w.densityNote})`).join('\n')}

------------------------------------------------------------
الوصف الميكانيكي والاستخدام الصناعي:
${ds.description}
------------------------------------------------------------
المصنع: مصنع محمود عرفه للمعادن والصاج
تواصل المبيعات والتوريد: 01000000000
============================================================
`;
    const blob = new Blob(['\uFEFF' + textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = ds.downloadFilename.replace('.pdf', '.txt');
    link.click();
    URL.revokeObjectURL(url);
  }

  get calculatedLaserCost() {
    const mat = this.selectedMetalObj;
    const ratePerMeter = (mat ? mat.laserRatePerMeter : 15) * (1 + ((this.laserSheetThickness || 1) - 1) * 0.15);
    const laserCuttingFee = (this.laserMeterLength || 0) * ratePerMeter;
    const piercingFee = (this.laserPiercingPoints || 0) * 5;
    const bendingFee = (this.cncBendCount || 0) * 15;
    return Math.round(laserCuttingFee + piercingFee + bendingFee);
  }

  // Alias for backward-compat with laser cost template references
  get selectedMetalMaterial() { return this.selectedMetalObj; }

  searchQuery = signal('');
  selectedCategory = signal<string>('الكل');
  openCartDrawer = signal(false);
  openMissingProductModal = signal(false);
  openInvoiceModal = signal(false);
  openStoreLayoutSketchModal = signal(false);
  openFaqModal = signal(false);
  faqSearchQuery = signal('');
  newFaqText = '';
  selectedMapProduct = signal<OmAlQura2Product | null>(null);

  toggleFaqModal(state: boolean = true) {
    this.openFaqModal.set(state);
  }

  submitNewFaq() {
    if (!this.newFaqText.trim()) return;
    this.service.addFaqQuestion(this.newFaqText.trim());
    this.newFaqText = '';
  }

  filteredFaqs = computed(() => {
    const q = this.faqSearchQuery().toLowerCase().trim();
    const allFaqs = this.service.faqs();
    if (!q) return allFaqs;
    return allFaqs.filter(f => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q));
  });

  selectedDriverId: string | null = null;
  customerName = '';
  customerPhone = '';
  deliveryAddress = '';
  paymentMethod: OmAlQura2Order['paymentMethod'] = 'كاش';

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
    const q = this.searchQuery().toLowerCase().trim();
    if (q) {
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

  orderedProductIdsInPending = computed(() => {
    const active = this.customerActiveOrders();
    const ids = new Set<string>();
    active.forEach(o => {
      o.items.forEach(i => ids.add(i.product.id));
    });
    return ids;
  });

  isDuplicateCartOrder() {
    return this.service.isDuplicateActiveOrder(this.service.cart(), this.customerPhone, this.customerName);
  }



  cartItemsCount() {
    return this.service.cart().reduce((acc, i) => acc + i.quantity, 0);
  }

  cartTotal() {
    return this.service.cart().reduce((acc, i) => acc + (i.product.price * i.quantity), 0);
  }

  selectedDriver() {
    return this.service.deliveryDrivers().find(d => d.id === this.selectedDriverId);
  }

  openProductMapModal(p: OmAlQura2Product) {
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
      this.openInvoiceModal.set(true);
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
}
