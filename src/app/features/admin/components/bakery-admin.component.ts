import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BakeryService } from '../../../core/services/bakery.service';
import { LucideDynamicIcon } from '@lucide/angular';
import { BakeryLiveOrdersComponent } from './bakery-live-orders.component';
import { BakeryPosTerminalComponent } from './bakery-pos-terminal.component';
import { BakeryInventoryComponent } from './bakery-inventory.component';
import { BakeryProductManagerComponent } from './bakery-product-manager.component';

@Component({
  selector: 'app-bakery-admin',
  standalone: true,
  imports: [
    CommonModule, 
    LucideDynamicIcon, 
    BakeryLiveOrdersComponent, 
    BakeryPosTerminalComponent, 
    BakeryInventoryComponent, 
    BakeryProductManagerComponent
  ],
  template: `
    <div class="h-full flex flex-col font-sans text-right" dir="rtl">
      
      <!-- Smart Header & Tabs Navigation -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 bg-surface-container-low p-4 rounded-2xl border border-surface-container-high gap-4">
        
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-amber-500/20 text-amber-500 flex items-center justify-center rounded-xl">
            <svg lucideIcon="croissant" class="w-6 h-6"></svg>
          </div>
          <div>
            <h2 class="text-xl font-black text-on-surface">إدارة المخبز</h2>
            <p class="text-sm font-medium text-on-surface-variant">نظام الإدارة المركزي ومتابعة الطلبات والمخزون</p>
          </div>
        </div>
        
        <!-- Tabs -->
        <div class="flex flex-wrap gap-2 bg-surface-container p-1.5 rounded-xl border border-surface-container-high">
          <button (click)="activeTab.set('live')" [ngClass]="activeTab() === 'live' ? 'bg-white dark:bg-surface-container-low shadow-sm text-amber-600' : 'text-on-surface-variant hover:bg-black/5'" class="px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors">
            <svg lucideIcon="activity" class="w-4 h-4"></svg> الطلبات الحية
            <span *ngIf="bakery.allActiveOrders().length > 0" class="bg-amber-600 text-white px-1.5 rounded-full text-[10px] animate-pulse">{{ bakery.allActiveOrders().length }}</span>
          </button>
          
          <button (click)="activeTab.set('pos')" [ngClass]="activeTab() === 'pos' ? 'bg-white dark:bg-surface-container-low shadow-sm text-amber-600' : 'text-on-surface-variant hover:bg-black/5'" class="px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors">
            <svg lucideIcon="monitor" class="w-4 h-4"></svg> نقطة البيع (POS)
          </button>
          
          <button (click)="activeTab.set('inventory')" [ngClass]="activeTab() === 'inventory' ? 'bg-white dark:bg-surface-container-low shadow-sm text-amber-600' : 'text-on-surface-variant hover:bg-black/5'" class="px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors">
            <svg lucideIcon="flame" class="w-4 h-4"></svg> التجهيز والمخزون
            <span *ngIf="bakery.nextToBakeRecommendations().length > 0" class="bg-error text-white px-1.5 rounded-full text-[10px]">{{ bakery.nextToBakeRecommendations().length }}</span>
          </button>
          
          <button (click)="activeTab.set('products')" [ngClass]="activeTab() === 'products' ? 'bg-white dark:bg-surface-container-low shadow-sm text-amber-600' : 'text-on-surface-variant hover:bg-black/5'" class="px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors">
            <svg lucideIcon="box" class="w-4 h-4"></svg> إدارة المنتجات
          </button>
        </div>
      </div>

      <!-- Tab Content Area -->
      <div class="flex-1 overflow-hidden">
        <app-bakery-live-orders *ngIf="activeTab() === 'live'"></app-bakery-live-orders>
        <app-bakery-pos-terminal *ngIf="activeTab() === 'pos'"></app-bakery-pos-terminal>
        <app-bakery-inventory *ngIf="activeTab() === 'inventory'"></app-bakery-inventory>
        <app-bakery-product-manager *ngIf="activeTab() === 'products'"></app-bakery-product-manager>
      </div>

    </div>
  `
})
export class BakeryAdminComponent implements OnInit {
  bakery = inject(BakeryService);
  activeTab = signal<'live' | 'pos' | 'inventory' | 'products'>('live');

  ngOnInit() {
    // Initialize required listeners for Admin functionalities
    this.bakery.listenToAllTodayOrders();
    this.bakery.listenToBatches();
  }
}
