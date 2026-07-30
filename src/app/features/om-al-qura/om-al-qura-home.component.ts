import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideDynamicIcon } from '@lucide/angular';
import { OmAlQuraService } from '../../core/services/om-al-qura.service';
import { OmAlQuraStaffPortalComponent } from './components/staff-portal.component';
import { OmAlQuraCustomerStoreComponent } from './components/customer-store.component';
import { OmAlQuraInStoreMapComponent } from './components/in-store-map.component';
import { OmAlQuraDeliveryPortalComponent } from './components/delivery-portal.component';
import { OmAlQuraAdminPortalComponent } from './components/admin-portal.component';

@Component({
  selector: 'app-om-al-qura-home',
  standalone: true,
  imports: [
    CommonModule,
    LucideDynamicIcon,
    OmAlQuraStaffPortalComponent,
    OmAlQuraCustomerStoreComponent,
    OmAlQuraInStoreMapComponent,
    OmAlQuraDeliveryPortalComponent,
    OmAlQuraAdminPortalComponent
  ],
  template: `
    <div class="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans" dir="rtl">
      
      <!-- Dedicated Standalone Navigation Header for "أم القرى" -->
      <header class="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white shadow-xl sticky top-0 z-40">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          
          <!-- Logo & Title -->
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-emerald-500 flex items-center justify-center text-slate-950 font-black shadow-lg">
              <svg lucideIcon="store" class="w-7 h-7"></svg>
            </div>
            <div>
              <div class="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-300 bg-white/10 px-2.5 py-0.5 rounded-full mb-0.5">
                <svg lucideIcon="sparkles" class="w-3 h-3 text-amber-400"></svg>
                <span>متجر المنظفات وأدوات العناية والنظافة الإلكتروني</span>
              </div>
              <h1 class="text-2xl font-black tracking-tight text-white">متجر أم القرى</h1>
            </div>
          </div>


        </div>

        <!-- 5 Main Navigation Tabs Bar -->
        <div class="bg-slate-950/60 backdrop-blur-md border-t border-white/10 overflow-x-auto custom-scrollbar">
          <div class="max-w-7xl mx-auto px-4 flex items-center gap-2 py-2">
            <button *ngFor="let tab of mainTabs" (click)="activeTab.set(tab.id)"
                    class="px-5 py-3 rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center gap-2 whitespace-nowrap shrink-0"
                    [ngClass]="activeTab() === tab.id ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg scale-[1.02]' : 'text-slate-300 hover:bg-white/5 hover:text-white'">
              <svg [lucideIcon]="tab.icon" class="w-4 h-4"></svg>
              <span>{{ tab.label }}</span>
              <span *ngIf="tab.id === 'staff' && service.newNotificationsCount() > 0" class="bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full text-[10px] font-black animate-pulse">
                {{ service.newNotificationsCount() }}
              </span>
            </button>
          </div>
        </div>
      </header>

      <!-- Main Dynamic Content Container -->
      <main class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        
        <!-- PAGE 1: Staff Portal -->
        <app-om-al-qura-staff-portal *ngIf="activeTab() === 'staff'"></app-om-al-qura-staff-portal>

        <!-- PAGE 2: Customer Store -->
        <app-om-al-qura-customer-store *ngIf="activeTab() === 'customer'"></app-om-al-qura-customer-store>

        <!-- PAGE 3: In-Store Map -->
        <app-om-al-qura-in-store-map *ngIf="activeTab() === 'in_store_map'"></app-om-al-qura-in-store-map>

        <!-- PAGE 4: Delivery Portal -->
        <app-om-al-qura-delivery-portal *ngIf="activeTab() === 'delivery'"></app-om-al-qura-delivery-portal>

        <!-- PAGE 5: Admin Portal -->
        <app-om-al-qura-admin-portal *ngIf="activeTab() === 'admin'"></app-om-al-qura-admin-portal>

      </main>

      <!-- Footer -->
      <footer class="bg-slate-900 border-t border-slate-800 py-6 text-center text-xs text-slate-500 font-medium">
        متجر "أم القرى" الإلكتروني المتكامل © 2026 - جميع الحقوق محفوظة
      </footer>

    </div>
  `
})
export class OmAlQuraHomeComponent {
  service = inject(OmAlQuraService);

  activeTab = signal<'staff' | 'customer' | 'in_store_map' | 'delivery' | 'admin'>('customer');

  mainTabs: { id: 'staff' | 'customer' | 'in_store_map' | 'delivery' | 'admin'; label: string; icon: string }[] = [
    { id: 'customer', label: '1.  الزبائن والعملاء', icon: 'shopping-bag' },
    { id: 'staff', label: '2.  الموظفين والنظام الداخلي', icon: 'user-cog' },
    { id: 'in_store_map', label: '3. خريطة المحل للزبائن داخل الفرع', icon: 'map-pin' },
    { id: 'delivery', label: '4.  الدليفري والتوصيل', icon: 'truck' },
    { id: 'admin', label: '5.  الإدارة والآدمن (HR)', icon: 'shield-check' }
  ];
}
