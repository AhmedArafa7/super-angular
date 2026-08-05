import { Component, inject, signal, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideDynamicIcon } from '@lucide/angular';
import { OmAlQura2Service } from '../../core/services/om-al-qura-2.service';
import { OmAlQura2AttendanceComponent } from './components/attendance.component';
import { OmAlQura2StaffPortalComponent } from './components/staff-portal.component';
import { OmAlQura2CustomerStoreComponent } from './components/customer-store.component';
import { OmAlQura2InStoreMapComponent } from './components/in-store-map.component';
import { OmAlQura2DeliveryPortalComponent } from './components/delivery-portal.component';
import { OmAlQura2AdminPortalComponent } from './components/admin-portal.component';

export type MetalFactoryTheme = 'dark' | 'gray' | 'beige';

@Component({
  selector: 'app-om-al-qura-2-home',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    CommonModule,
    LucideDynamicIcon,
    OmAlQura2StaffPortalComponent,
    OmAlQura2CustomerStoreComponent,
    OmAlQura2InStoreMapComponent,
    OmAlQura2DeliveryPortalComponent,
    OmAlQura2AdminPortalComponent
  ],
  styles: [`
    @keyframes marquee {
      0% { transform: translateX(0%); }
      100% { transform: translateX(-50%); }
    }
    .animate-marquee {
      display: inline-flex;
      animation: marquee 28s linear infinite;
    }

    /* GLOBAL OVERRIDES FOR RICH DEEP WARM BEIGE THEME (#c5ae87) */
    html.theme-beige, 
    body.theme-beige,
    .theme-beige {
      background-color: #c5ae87 !important;
      color: #0f172a !important;
    }

    .theme-beige main {
      background-color: #c5ae87 !important;
    }

    /* LIGHT CARDS IN BEIGE MODE - INFUSED WITH RICH WARM GOLDEN-ORANGE SUNSET TINT (#fcefd8 & #f5e4c6 & #eed7b3) */
    .theme-beige .bg-white {
      background-color: #fcefd8 !important;
      border-color: #d5ab71 !important;
      color: #1a1107 !important;
    }

    .theme-beige .bg-slate-50 {
      background-color: #f5e4c6 !important;
      border-color: #d5ab71 !important;
      color: #1a1107 !important;
    }

    .theme-beige .bg-slate-100 {
      background-color: #eed7b3 !important;
      border-color: #d5ab71 !important;
      color: #1a1107 !important;
    }

    /* DEEP CHARCOAL TEXT FOR ALL LIGHT SECTIONS IN BEIGE MODE */
    .theme-beige .bg-white p,
    .theme-beige .bg-white span:not(.text-amber-400):not(.text-emerald-400):not(.bg-amber-500):not(.bg-emerald-600),
    .theme-beige .bg-white h1,
    .theme-beige .bg-white h2,
    .theme-beige .bg-white h3,
    .theme-beige .bg-white h4,
    .theme-beige .bg-slate-50 p,
    .theme-beige .bg-slate-50 span,
    .theme-beige .bg-slate-50 h1,
    .theme-beige .bg-slate-50 h2,
    .theme-beige .bg-slate-50 h3,
    .theme-beige .bg-slate-50 h4,
    .theme-beige .bg-white .text-slate-900,
    .theme-beige .bg-white .text-slate-800,
    .theme-beige .bg-white .text-slate-700,
    .theme-beige .bg-white .text-slate-600,
    .theme-beige .bg-white .text-slate-500,
    .theme-beige .bg-white .text-slate-400,
    .theme-beige .bg-slate-50 .text-slate-900,
    .theme-beige .bg-slate-50 .text-slate-800,
    .theme-beige .bg-slate-50 .text-slate-700,
    .theme-beige .bg-slate-50 .text-slate-600,
    .theme-beige .bg-slate-50 .text-slate-500,
    .theme-beige .bg-slate-50 .text-slate-400 {
      color: #1a1107 !important;
    }

    /* WARM GOLDEN AMBER WHITE TINT FOR TEXT IN ALL DARK CONTAINERS (HEADER, HERO BANNERS, DIAGRAMS, GRADIENT CARDS) */
    .theme-beige .text-white,
    .theme-beige .bg-slate-950 *,
    .theme-beige .bg-slate-900 *,
    .theme-beige .bg-black *,
    .theme-beige .bg-gradient-to-r *,
    .theme-beige .bg-gradient-to-br *,
    .theme-beige .bg-gradient-to-bl *,
    .theme-beige .bg-gradient-to-tr * {
      color: #fef08a !important;
    }

    .theme-beige .bg-slate-950 .text-slate-400,
    .theme-beige .bg-slate-950 .text-slate-500,
    .theme-beige .bg-slate-950 .text-slate-300,
    .theme-beige .bg-slate-900 .text-slate-400,
    .theme-beige .bg-slate-900 .text-slate-500,
    .theme-beige .bg-slate-900 .text-slate-300,
    .theme-beige .bg-black .text-slate-400,
    .theme-beige .bg-black .text-slate-500,
    .theme-beige .bg-gradient-to-r .text-slate-400,
    .theme-beige .bg-gradient-to-r .text-slate-300,
    .theme-beige .bg-gradient-to-br .text-slate-400,
    .theme-beige .bg-gradient-to-br .text-slate-300 {
      color: #fde68a !important;
    }

    .theme-beige .text-amber-100,
    .theme-beige .text-amber-200,
    .theme-beige .text-amber-300,
    .theme-beige .text-amber-400,
    .theme-beige .text-amber-500,
    .theme-beige .bg-slate-950 .text-amber-400,
    .theme-beige .bg-slate-950 .text-amber-300,
    .theme-beige .bg-slate-900 .text-amber-400,
    .theme-beige .bg-slate-900 .text-amber-300,
    .theme-beige .bg-gradient-to-r .text-amber-400,
    .theme-beige .bg-gradient-to-r .text-amber-300,
    .theme-beige .bg-gradient-to-br .text-amber-400,
    .theme-beige .bg-gradient-to-br .text-amber-300 {
      color: #fbbf24 !important;
    }

    /* SOLID COLOR ACTION BUTTONS & BADGES IN BEIGE MODE ALWAYS HAVE PURE WHITE TEXT */
    .theme-beige .bg-blue-600,
    .theme-beige .bg-blue-600 *,
    .theme-beige .bg-emerald-600,
    .theme-beige .bg-emerald-600 *,
    .theme-beige .bg-rose-600,
    .theme-beige .bg-rose-600 *,
    .theme-beige .bg-indigo-600,
    .theme-beige .bg-indigo-600 *,
    .theme-beige .bg-purple-600,
    .theme-beige .bg-purple-600 *,
    .theme-beige .bg-teal-600,
    .theme-beige .bg-teal-600 * {
      color: #ffffff !important;
    }

    .theme-beige .border-slate-200,
    .theme-beige .border-slate-300,
    .theme-beige .border-slate-700,
    .theme-beige .border-slate-800 {
      border-color: #a89067 !important;
    }

    /* GLOBAL OVERRIDES FOR SLIGHTLY LIGHTER CHARCOAL SLATE THEME (#3d4350) */
    html.theme-gray, 
    body.theme-gray,
    .theme-gray {
      background-color: #3d4350 !important;
      color: #f8fafc !important;
    }

    .theme-gray main {
      background-color: #3d4350 !important;
    }

    .theme-gray .bg-white,
    .theme-gray .bg-slate-900,
    .theme-gray .bg-slate-950 {
      background-color: #2b303a !important;
      border-color: #525b6c !important;
      color: #f8fafc !important;
    }

    .theme-gray .bg-slate-50,
    .theme-gray .bg-slate-100,
    .theme-gray .bg-slate-800 {
      background-color: #343a46 !important;
      border-color: #525b6c !important;
      color: #f8fafc !important;
    }

    .theme-gray .text-slate-900,
    .theme-gray .text-slate-800,
    .theme-gray .text-slate-700 {
      color: #ffffff !important;
    }

    .theme-gray .text-slate-500,
    .theme-gray .text-slate-400 {
      color: #cbd5e1 !important;
    }

    .theme-gray .border-slate-200,
    .theme-gray .border-slate-300,
    .theme-gray .border-slate-700,
    .theme-gray .border-slate-800 {
      border-color: #525b6c !important;
    }
  `],
  template: `
    <div [ngClass]="getThemeWrapperClass()" [style.background-color]="getBgColor()" dir="rtl">
      
      <!-- Dedicated Standalone Navigation Header for "مصنع محمود عرفه للمعادن" -->
      <header class="bg-gradient-to-r from-slate-900 via-zinc-900 to-amber-950 text-white shadow-xl sticky top-0 z-40 border-b border-amber-500/20">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          
          <!-- Logo & Title with Metallic Industrial Anvil & Gear SVG Icon -->
          <div class="flex items-center gap-3.5">
            <div class="relative group">
              <div class="absolute -inset-1 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-400 rounded-2xl blur-xs opacity-80 group-hover:opacity-100 transition duration-300 animate-pulse"></div>
              <div class="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-700 via-zinc-900 to-slate-950 p-2 flex items-center justify-center text-white font-black shadow-2xl border-2 border-amber-400/50">
                <!-- Ultra Eye-Catching Golden Industrial Steel E-Commerce Bag Logo -->
                <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-11 h-11 drop-shadow-2xl">
                  <path d="M30 2L56 16V44L30 58L4 44V16L30 2Z" fill="url(#hex_bg)" stroke="url(#hex_border)" stroke-width="3"/>
                  <path d="M17 22H43L40 46H20L17 22Z" fill="url(#bag_body)" stroke="#fbbf24" stroke-width="2" stroke-linejoin="round"/>
                  <path d="M24 22V16C24 12.6863 26.6863 10 30 10C33.3137 10 36 12.6863 36 16V22" stroke="url(#handle_gold)" stroke-width="3.5" stroke-linecap="round"/>
                  <path d="M23 38L27 28L30 33L33 28L37 38" stroke="#fef08a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                  <circle cx="30" cy="10" r="2.5" fill="#fef08a"/>
                  <defs>
                    <linearGradient id="hex_bg" x1="4" y1="2" x2="56" y2="58" gradientUnits="userSpaceOnUse">
                      <stop stop-color="#2d1500"/>
                      <stop offset="0.5" stop-color="#0f172a"/>
                      <stop offset="1" stop-color="#1e1b18"/>
                    </linearGradient>
                    <linearGradient id="hex_border" x1="4" y1="2" x2="56" y2="58" gradientUnits="userSpaceOnUse">
                      <stop stop-color="#fef08a"/>
                      <stop offset="0.3" stop-color="#f59e0b"/>
                      <stop offset="0.7" stop-color="#ea580c"/>
                      <stop offset="1" stop-color="#78350f"/>
                    </linearGradient>
                    <linearGradient id="bag_body" x1="17" y1="22" x2="43" y2="46" gradientUnits="userSpaceOnUse">
                      <stop stop-color="#78350f"/>
                      <stop offset="0.5" stop-color="#b45309"/>
                      <stop offset="1" stop-color="#d97706"/>
                    </linearGradient>
                    <linearGradient id="handle_gold" x1="24" y1="10" x2="36" y2="22" gradientUnits="userSpaceOnUse">
                      <stop stop-color="#ffffff"/>
                      <stop offset="0.5" stop-color="#fbbf24"/>
                      <stop offset="1" stop-color="#f59e0b"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
            <div>
              <div class="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-300 bg-white/10 px-2.5 py-0.5 rounded-full mb-0.5 border border-white/10">
                <svg lucideIcon="wrench" class="w-3 h-3 text-amber-400"></svg>
                <span>تصنيع وتوريد المعادن والمنتجات المعدنية والمشغولات</span>
              </div>
              <h1 class="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <span>مصنع محمود عرفه للمعادن</span>
                <span class="text-xs px-2 py-0.5 rounded-md bg-amber-500/30 text-amber-300 font-bold border border-amber-400/30">متجر ومعرض إلكتروني</span>
              </h1>
            </div>
          </div>

          <!-- Color Theme Switcher Bar (داكن / رصاصي فحمي / بيج غامق) -->
          <div class="flex items-center gap-2 bg-slate-950/90 p-2 rounded-2xl border-2 border-amber-500/50 shadow-2xl">
            <span class="text-xs font-bold text-amber-300 px-1 flex items-center gap-1">
              <svg lucideIcon="palette" class="w-4 h-4 text-amber-400"></svg>
              <span class="hidden sm:inline">لون الخلفية:</span>
            </span>

            <!-- Dark Theme Option -->
            <button (click)="setTheme('dark')"
                    title="النمط الداكن الصناعي"
                    class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    [ngClass]="themeMode() === 'dark' ? 'bg-amber-500 text-slate-950 font-black shadow-md scale-105 ring-2 ring-amber-300' : 'text-slate-300 hover:text-white hover:bg-white/10'">
              <span class="text-sm">🌙</span>
              <span>داكن</span>
            </button>

            <!-- Charcoal / Slate Grey Theme Option (رصاصي فحمي) -->
            <button (click)="setTheme('gray')"
                    title="النمط الرصاصي الفحمي المتوسط"
                    class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    [ngClass]="themeMode() === 'gray' ? 'bg-[#525b6c] text-white font-black shadow-md scale-105 ring-2 ring-slate-300' : 'text-slate-300 hover:text-white hover:bg-white/10'">
              <span class="text-sm">⚙️</span>
              <span>رصاصي</span>
            </button>

            <!-- Darker Beige Theme Option -->
            <button (click)="setTheme('beige')"
                    title="النمط البيج الغامق الدافئ"
                    class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    [ngClass]="themeMode() === 'beige' ? 'bg-[#c5ae87] text-amber-950 font-black shadow-md scale-105 ring-2 ring-[#ebdcc3]' : 'text-slate-300 hover:text-white hover:bg-white/10'">
              <span class="text-sm">📜</span>
              <span>بيج غامق</span>
            </button>
          </div>

        </div>

        <!-- 5 Main Navigation Tabs Bar -->
        <div class="bg-slate-950/80 backdrop-blur-md border-t border-white/10 overflow-x-auto custom-scrollbar">
          <div class="max-w-7xl mx-auto px-4 flex items-center gap-2 py-2">
            <button *ngFor="let tab of mainTabs" (click)="activeTab.set(tab.id)"
                    class="px-5 py-3 rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center gap-2 whitespace-nowrap shrink-0"
                    [ngClass]="activeTab() === tab.id ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-slate-950 shadow-lg scale-[1.02]' : 'text-slate-300 hover:bg-white/5 hover:text-white'">
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
      <main class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8" [style.background-color]="getBgColor()">
        
        <!-- PAGE 1: Staff Portal -->
        <app-om-al-qura-2-staff-portal *ngIf="activeTab() === 'staff' || activeTab() === 'attendance'"></app-om-al-qura-2-staff-portal>

        <!-- PAGE 2: Customer Store -->
        <app-om-al-qura-2-customer-store *ngIf="activeTab() === 'customer'" (openMapTab)="activeTab.set('in_store_map')"></app-om-al-qura-2-customer-store>

        <!-- PAGE 3: In-Store Map -->
        <app-om-al-qura-2-in-store-map *ngIf="activeTab() === 'in_store_map'"></app-om-al-qura-2-in-store-map>

        <!-- PAGE 4: Delivery Portal -->
        <app-om-al-qura-2-delivery-portal *ngIf="activeTab() === 'delivery'"></app-om-al-qura-2-delivery-portal>

        <!-- PAGE 5: Admin Portal -->
        <app-om-al-qura-2-admin-portal *ngIf="activeTab() === 'admin'"></app-om-al-qura-2-admin-portal>

      </main>

      <!-- Footer -->
      <footer [ngClass]="getFooterClass()">
        مصنع "محمود عرفه للمعادن" الإلكتروني المتكامل © 2026 - جميع الحقوق محفوظة
      </footer>

    </div>
  `
})
export class OmAlQura2HomeComponent implements OnInit {
  service = inject(OmAlQura2Service);

  activeTab = signal<'attendance' | 'staff' | 'customer' | 'in_store_map' | 'delivery' | 'admin'>('customer');
  themeMode = signal<MetalFactoryTheme>('dark');

  mainTabs: { id: 'attendance' | 'staff' | 'customer' | 'in_store_map' | 'delivery' | 'admin'; label: string; icon: string }[] = [
    { id: 'customer', label: '1. معارض المعادن وشراء المنتجات', icon: 'shopping-bag' },
    { id: 'staff', label: '2. الموظفين والمهندسين بالنظام الداخلي', icon: 'user-cog' },
    { id: 'in_store_map', label: '3. مخطط المصنع والمخازن الهندسية', icon: 'map-pin' },
    { id: 'delivery', label: '4. شاحنات السائقين والتوريد الثقيل', icon: 'truck' },
    { id: 'admin', label: '5. إدارة المصنع والإنتاج (HR)', icon: 'shield-check' }
  ];

  ngOnInit() {
    const savedTheme = localStorage.getItem('mahmoud_arafa_theme') as MetalFactoryTheme;
    if (savedTheme && ['dark', 'gray', 'beige'].includes(savedTheme)) {
      this.themeMode.set(savedTheme);
    }
    this.applyHtmlTheme(this.themeMode());
  }

  setTheme(mode: MetalFactoryTheme) {
    this.themeMode.set(mode);
    localStorage.setItem('mahmoud_arafa_theme', mode);
    this.applyHtmlTheme(mode);
  }

  applyHtmlTheme(mode: MetalFactoryTheme) {
    if (typeof document === 'undefined') return;
    const htmlEl = document.documentElement;
    const bodyEl = document.body;

    htmlEl.classList.remove('dark', 'theme-dark', 'theme-gray', 'theme-beige');
    bodyEl.classList.remove('dark', 'theme-dark', 'theme-gray', 'theme-beige');

    if (mode === 'dark') {
      htmlEl.classList.add('dark', 'theme-dark');
      bodyEl.classList.add('dark', 'theme-dark');
    } else if (mode === 'beige') {
      htmlEl.classList.add('theme-beige');
      bodyEl.classList.add('theme-beige');
    } else {
      htmlEl.classList.add('dark', 'theme-gray');
      bodyEl.classList.add('dark', 'theme-gray');
    }
  }

  getBgColor(): string {
    const mode = this.themeMode();
    if (mode === 'gray') return '#3d4350';
    if (mode === 'beige') return '#c5ae87';
    return '#090d16';
  }

  getThemeWrapperClass(): string {
    const mode = this.themeMode();
    if (mode === 'gray') {
      return 'dark theme-gray min-h-screen bg-[#3d4350] text-slate-100 flex flex-col font-sans transition-colors duration-300';
    } else if (mode === 'beige') {
      return 'theme-beige min-h-screen bg-[#c5ae87] text-[#231508] flex flex-col font-sans transition-colors duration-300';
    }
    return 'dark theme-dark min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans transition-colors duration-300';
  }

  getFooterClass(): string {
    const mode = this.themeMode();
    if (mode === 'gray') {
      return 'bg-[#2b303a] border-t border-[#454c5a] py-6 text-center text-xs text-slate-300 font-bold shadow-xs';
    } else if (mode === 'beige') {
      return 'bg-[#b8a077] border-t border-[#a68e65] py-6 text-center text-xs text-[#231508] font-black';
    }
    return 'bg-slate-900 border-t border-slate-800 py-6 text-center text-xs text-slate-500 font-medium';
  }
}
