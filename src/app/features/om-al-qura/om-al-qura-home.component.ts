import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideDynamicIcon } from '@lucide/angular';
import { OmAlQuraService } from '../../core/services/om-al-qura.service';
import { FaviconService } from '../../core/services/favicon.service';
import { OmAlQuraAttendanceComponent } from './components/attendance.component';
import { OmAlQuraStaffPortalComponent } from './components/staff-portal.component';
import { OmAlQuraCustomerStoreComponent } from './components/customer-store.component';
import { OmAlQuraInStoreMapComponent } from './components/in-store-map.component';
import { OmAlQuraDeliveryPortalComponent } from './components/delivery-portal.component';
import { OmAlQuraAdminPortalComponent } from './components/admin-portal.component';
import { OmAlQuraSecurityCctvComponent } from './components/security-cctv.component';

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
    OmAlQuraAdminPortalComponent,
    OmAlQuraSecurityCctvComponent
  ],
  template: `
    <div class="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans" dir="rtl">
      
      <!-- Dedicated Standalone Navigation Header for "أم القرى" -->
      <header class="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white shadow-xl sticky top-0 z-40">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          
          <!-- Logo & Title with Custom Cleaning Detergent & Soap Bubbles Icon -->
          <div class="flex items-center gap-3.5">
            <div class="relative group">
              <div class="absolute -inset-1 bg-gradient-to-r from-amber-400 via-emerald-400 to-cyan-400 rounded-2xl blur-xs opacity-80 group-hover:opacity-100 transition duration-300 animate-pulse"></div>
              <div class="relative w-13 h-13 rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 p-2.5 flex items-center justify-center text-white font-black shadow-2xl border border-white/30">
                <!-- Custom Detergent Spray Bottle + Soap Bubbles & Sparkles SVG -->
                <svg viewBox="0 0 32 32" fill="none" class="w-8 h-8 text-white drop-shadow-md">
                  <!-- Spray Bottle Body -->
                  <path d="M12 9 C12 7 14 6 16 6 C18 6 20 7 20 9 L20 12 L12 12 Z" fill="#67e8f9" opacity="0.9"/>
                  <path d="M10 12 L22 12 L24 28 C24 29.5 22.5 30 21 30 L11 30 C9.5 30 8 29.5 8 28 Z" fill="white" opacity="0.25"/>
                  <path d="M10 12 L22 12 L24 28 C24 29.5 22.5 30 21 30 L11 30 C9.5 30 8 29.5 8 28 Z" stroke="white" stroke-width="2" stroke-linejoin="round"/>
                  <!-- Trigger & Nozzle -->
                  <path d="M16 6 L16 2 L20 2" stroke="white" stroke-width="2" stroke-linecap="round"/>
                  <path d="M14 4 L8 6 L12 9" stroke="#fef08a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <!-- Soap Bubbles -->
                  <circle cx="21" cy="18" r="2.5" fill="#67e8f9" opacity="0.8"/>
                  <circle cx="14" cy="22" r="3.5" fill="#fef08a" opacity="0.7"/>
                  <circle cx="18" cy="25" r="2" fill="white" opacity="0.9"/>
                  <!-- Sparkles -->
                  <path d="M26 3 L27 5.5 L29.5 6.5 L27 7.5 L26 10 L25 7.5 L22.5 6.5 L25 5.5 Z" fill="#fef08a"/>
                  <path d="M6 14 L6.8 15.8 L8.6 16.6 L6.8 17.4 L6 19.2 L5.2 17.4 L3.4 16.6 L5.2 15.8 Z" fill="#67e8f9"/>
                </svg>
              </div>
            </div>
            <div>
              <div class="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-300 bg-white/10 px-2.5 py-0.5 rounded-full mb-0.5 border border-white/10">
                <svg lucideIcon="sparkles" class="w-3 h-3 text-amber-400 animate-spin"></svg>
                <span>متجر المنظفات والمطهرات وأدوات النظافة</span>
              </div>
              <h1 class="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <span>متجر أم القرى</span>
                <span class="text-xs px-2 py-0.5 rounded-md bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-400/30">للمنظفات</span>
              </h1>
            </div>
          </div>
          <!-- Standalone App Installation & Status Badge -->
          <div class="flex items-center gap-2 sm:gap-3">
            <button *ngIf="deferredPrompt" (click)="installApp()"
                    class="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-xl transition-all border border-amber-200/50 hover:scale-105 active:scale-95 animate-pulse cursor-pointer">
              <svg lucideIcon="download" class="w-4 h-4"></svg>
              <span>تثبيت برنامج "أم القرى" 📱</span>
            </button>
            <div *ngIf="isStandalone()" class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-400/30 backdrop-blur-md">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span>برنامج أم القرى مفعّل 💻</span>
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
        <app-om-al-qura-staff-portal *ngIf="activeTab() === 'staff' || activeTab() === 'attendance'"></app-om-al-qura-staff-portal>

        <!-- PAGE 2: Customer Store -->
        <app-om-al-qura-customer-store *ngIf="activeTab() === 'customer'"
          (navigateToStoreMap)="activeTab.set('in_store_map')">
        </app-om-al-qura-customer-store>

        <!-- PAGE 3: In-Store Map -->
        <app-om-al-qura-in-store-map *ngIf="activeTab() === 'in_store_map'"></app-om-al-qura-in-store-map>

        <!-- PAGE 4: Delivery Portal -->
        <app-om-al-qura-delivery-portal *ngIf="activeTab() === 'delivery'"></app-om-al-qura-delivery-portal>

        <!-- PAGE 5: Admin Portal -->
        <app-om-al-qura-admin-portal *ngIf="activeTab() === 'admin'"></app-om-al-qura-admin-portal>

        <!-- PAGE 6: CCTV & Security Cameras -->
        <app-om-al-qura-security-cctv *ngIf="activeTab() === 'cctv'"></app-om-al-qura-security-cctv>

      </main>

      <!-- Footer -->
      <footer class="bg-slate-900 border-t border-slate-800 py-6 text-center text-xs text-slate-500 font-medium">
        برنامج "متجر أم القرى للمنظفات" المستقل © 2026 - جميع الحقوق محفوظة
      </footer>

    </div>
  `
})
export class OmAlQuraHomeComponent implements OnInit, OnDestroy {
  service = inject(OmAlQuraService);
  private faviconService = inject(FaviconService);

  activeTab = signal<'attendance' | 'staff' | 'customer' | 'in_store_map' | 'delivery' | 'admin' | 'cctv'>('customer');
  deferredPrompt: any = null;
  isStandalone = signal<boolean>(false);

  mainTabs: { id: 'attendance' | 'staff' | 'customer' | 'in_store_map' | 'delivery' | 'admin' | 'cctv'; label: string; icon: string }[] = [
    { id: 'customer', label: '1.  الزبائن والعملاء', icon: 'shopping-bag' },
    { id: 'staff', label: '2.  الموظفين والنظام الداخلي', icon: 'user-cog' },
    { id: 'in_store_map', label: '3. خريطة المحل للزبائن داخل الفرع', icon: 'map-pin' },
    { id: 'delivery', label: '4.  الدليفري والتوصيل', icon: 'truck' },
    { id: 'admin', label: '5.  الإدارة', icon: 'shield-check' },
    { id: 'cctv', label: '6. 📹 كاميرات المراقبة والأمن', icon: 'video' }
  ];

  ngOnInit(): void {
    // 1. Activate standalone identity for Om Al Qura (Manifest, Title, Theme Color, Favicon)
    this.faviconService.setOmAlQuraIdentity();

    // 2. Check if running as a installed standalone app or listen for PWA install prompt
    if (typeof window !== 'undefined') {
      this.isStandalone.set(
        window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true
      );

      window.addEventListener('beforeinstallprompt', (e: Event) => {
        e.preventDefault();
        this.deferredPrompt = e;
      });
    }
  }

  async installApp(): Promise<void> {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        this.deferredPrompt = null;
      }
    }
  }

  ngOnDestroy(): void {
    // Restore default site identity when navigating away
    this.faviconService.restoreDefaultIdentity();
  }
}


