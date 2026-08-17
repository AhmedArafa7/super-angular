import { Component, inject, signal, computed, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { 
  LucideAngularModule, ArrowRight, Maximize2, Minimize2, RotateCcw, 
  ExternalLink, Bookmark, Globe, Pin, PinOff, Copy, Check, Sparkles, Tag, AlertTriangle
} from 'lucide-angular';
import { ExternalTabsService, ExternalTabItem } from '../../core/services/external-tabs.service';

@Component({
  selector: 'app-external-tab-viewer',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  template: `
    <div class="h-screen w-full flex flex-col bg-slate-950 text-white overflow-hidden font-sans" dir="rtl">
      <!-- Top Navigation & Controls Toolbar -->
      <header class="h-14 bg-slate-900/90 border-b border-white/10 px-4 flex items-center justify-between shrink-0 z-20 backdrop-blur-md">
        <!-- Right side (RTL): Back & Tab Identity -->
        <div class="flex items-center gap-3 min-w-0">
          <a routerLink="/external-tabs" class="p-2 hover:bg-white/10 rounded-xl text-slate-300 hover:text-white transition shrink-0" title="العودة لأرشيف التبويبات">
            <lucide-icon [img]="ArrowRight" class="size-5"></lucide-icon>
          </a>
          
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="size-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
              @if (faviconUrl()) {
                <img [src]="faviconUrl()" class="size-5 object-contain" (error)="$any($event.target).style.display='none'">
              } @else {
                <lucide-icon [img]="Globe" class="size-4 text-indigo-400"></lucide-icon>
              }
            </div>

            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <h1 class="text-sm font-black text-white truncate max-w-xs md:max-w-md">{{ activeTabTitle() }}</h1>
                @if (activeTab()?.category) {
                  <span class="hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-bold shrink-0">
                    <lucide-icon [img]="Tag" class="size-2.5"></lucide-icon>
                    {{ activeTab()?.category }}
                  </span>
                }
              </div>
              <span class="text-[10px] text-emerald-400 font-mono block truncate max-w-xs md:max-w-md dir-ltr text-right">
                {{ activeTabUrl() }}
              </span>
            </div>
          </div>
        </div>

        <!-- Left side (RTL): Actions Toolbar -->
        <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <!-- Pin / Unpin to Sidebar -->
          @if (activeTab()?.id) {
            <button 
              (click)="togglePin()" 
              [title]="isPinned() ? 'إلغاء التثبيت من القائمة الجانبية' : 'تثبيت كقسم في القائمة الجانبية'" 
              [class]="isPinned() ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-white/5 text-slate-300 hover:text-white border-white/10 hover:bg-white/10'"
              class="px-2.5 sm:px-3 py-1.5 border rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer">
              <lucide-icon [img]="isPinned() ? PinOff : Pin" class="size-4" [class.text-amber-400]="isPinned()"></lucide-icon>
              <span class="hidden md:inline">{{ isPinned() ? 'مثبت بالشريط' : 'تثبيت كقسم' }}</span>
            </button>
          }

          <!-- Copy URL -->
          <button 
            (click)="copyUrl()" 
            title="نسخ رابط الموقع" 
            class="p-2 sm:px-3 sm:py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-slate-200 flex items-center gap-1.5 transition cursor-pointer">
            <lucide-icon [img]="copied() ? Check : Copy" class="size-4" [class.text-emerald-400]="copied()"></lucide-icon>
            <span class="hidden lg:inline">{{ copied() ? 'تم النسخ' : 'نسخ الرابط' }}</span>
          </button>

          <!-- Reload Iframe -->
          <button 
            (click)="reloadIframe()" 
            title="إعادة تحميل الصفحة" 
            class="p-2 sm:px-3 sm:py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-slate-200 flex items-center gap-1.5 transition cursor-pointer">
            <lucide-icon [img]="RotateCcw" class="size-4 text-indigo-400" [class.animate-spin]="isReloading()"></lucide-icon>
            <span class="hidden lg:inline">تحديث</span>
          </button>

          <!-- Fullscreen Toggle -->
          <button 
            (click)="toggleFullscreen()" 
            [title]="isFullscreen() ? 'تصغير الشاشة' : 'ملء الشاشة'" 
            class="p-2 sm:px-3 sm:py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-slate-200 flex items-center gap-1.5 transition cursor-pointer">
            <lucide-icon [img]="isFullscreen() ? Minimize2 : Maximize2" class="size-4 text-indigo-400"></lucide-icon>
            <span class="hidden sm:inline">{{ isFullscreen() ? 'تصغير' : 'تكبير' }}</span>
          </button>

          <!-- Open in External Browser Window -->
          <a 
            [href]="activeTabUrl()" 
            target="_blank" 
            rel="noopener"
            title="فتح في متصفح خارجي جديد" 
            class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/30">
            <span>فتح خارجي</span>
            <lucide-icon [img]="ExternalLink" class="size-3.5"></lucide-icon>
          </a>
        </div>
      </header>

      <!-- Main In-App Section Frame Container -->
      <main class="flex-1 w-full bg-slate-950 relative overflow-hidden flex flex-col p-2">
        @if (safeUrl()) {
          <div class="relative w-full h-full rounded-2xl overflow-hidden bg-slate-900 border border-white/5 shadow-2xl flex flex-col">
            <!-- Iframe embed -->
            <iframe 
              #tabIframe
              *ngIf="!isReloading()"
              [src]="safeUrl()" 
              class="w-full h-full border-0 bg-white" 
              sandbox="allow-scripts allow-same-origin allow-modals allow-forms allow-popups allow-downloads allow-presentation"
              allow="camera; microphone; fullscreen; display-capture; clipboard-read; clipboard-write; autoplay"
              (load)="onIframeLoaded()">
            </iframe>

            <!-- Loading overlay -->
            @if (isLoading()) {
              <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-10">
                <div class="size-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
                <p class="text-xs text-slate-300 font-bold">جاري تحميل وتضمين الموقع كقسم داخلي...</p>
              </div>
            }

            <!-- Friendly Fallback Bar at the Bottom -->
            <div class="bg-slate-900/95 border-t border-white/10 px-4 py-2 flex items-center justify-between text-xs text-slate-400 gap-4 shrink-0">
              <div class="flex items-center gap-2 min-w-0">
                <lucide-icon [img]="Globe" class="size-3.5 text-indigo-400 shrink-0"></lucide-icon>
                <span class="truncate">يتم عرض الموقع داخل نكسوس. في حال تقييد الموقع للتضمين الداخلي (X-Frame Policy)، يمكنك استخدام الفتح الخارجي.</span>
              </div>
              <a 
                [href]="activeTabUrl()" 
                target="_blank" 
                class="text-indigo-400 hover:text-indigo-300 font-bold shrink-0 hover:underline flex items-center gap-1">
                <span>فتح مباشرة ↗</span>
              </a>
            </div>
          </div>
        } @else {
          <!-- Not Found State -->
          <div class="flex-1 flex flex-col items-center justify-center text-center space-y-4">
            <div class="size-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <lucide-icon [img]="Bookmark" class="size-8"></lucide-icon>
            </div>
            <h3 class="text-lg font-bold text-white">لم يتم العثور على الرابط أو القسم المطلوب</h3>
            <p class="text-xs text-slate-400 max-w-sm">يرجى التأكد من اختيار تبويب محفوظ صحيح من الأرشيف.</p>
            <a routerLink="/external-tabs" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold inline-block shadow-lg">
              العودة إلى أرشيف التبويبات
            </a>
          </div>
        }
      </main>
    </div>
  `
})
export class ExternalTabViewerComponent implements OnInit {
  route = inject(ActivatedRoute);
  router = inject(Router);
  sanitizer = inject(DomSanitizer);
  externalTabsService = inject(ExternalTabsService);

  activeTab = signal<ExternalTabItem | null>(null);
  fallbackUrl = signal<string>('');
  fallbackTitle = signal<string>('');

  isLoading = signal<boolean>(true);
  isReloading = signal<boolean>(false);
  isFullscreen = signal<boolean>(false);
  copied = signal<boolean>(false);

  // Icons
  ArrowRight = ArrowRight;
  Maximize2 = Maximize2;
  Minimize2 = Minimize2;
  RotateCcw = RotateCcw;
  ExternalLink = ExternalLink;
  Bookmark = Bookmark;
  Globe = Globe;
  Pin = Pin;
  PinOff = PinOff;
  Copy = Copy;
  Check = Check;
  Sparkles = Sparkles;
  Tag = Tag;
  AlertTriangle = AlertTriangle;

  activeTabTitle = computed<string>(() => {
    return this.activeTab()?.title || this.fallbackTitle() || 'عرض الموقع الخارجي';
  });

  activeTabUrl = computed<string>(() => {
    return this.activeTab()?.url || this.fallbackUrl() || '';
  });

  faviconUrl = computed<string>(() => {
    const tab = this.activeTab();
    if (tab?.favicon) return tab.favicon;
    const url = this.activeTabUrl();
    return url ? this.externalTabsService.getFaviconUrl(url) : '';
  });

  isPinned = computed<boolean>(() => {
    return !!this.activeTab()?.isPinnedToSidebar;
  });

  safeUrl = computed<SafeResourceUrl | null>(() => {
    const rawUrl = this.activeTabUrl();
    if (!rawUrl) return null;
    const embedUrl = this.externalTabsService.formatEmbedUrl(rawUrl);
    return this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
  });

  ngOnInit() {
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        const tab = this.externalTabsService.getTabById(id);
        if (tab) {
          this.activeTab.set(tab);
          this.isLoading.set(true);
        }
      }
    });

    this.route.queryParams.subscribe(queryParams => {
      if (queryParams['url']) {
        this.fallbackUrl.set(queryParams['url']);
        this.fallbackTitle.set(queryParams['title'] || 'موقع خارجي');
        this.isLoading.set(true);
      }
    });
  }

  onIframeLoaded() {
    this.isLoading.set(false);
  }

  reloadIframe() {
    this.isReloading.set(true);
    this.isLoading.set(true);
    setTimeout(() => {
      this.isReloading.set(false);
    }, 100);
  }

  togglePin() {
    const tab = this.activeTab();
    if (!tab?.id) return;
    const newStatus = this.externalTabsService.togglePinToSidebar(tab.id);
    this.activeTab.set({ ...tab, isPinnedToSidebar: newStatus });
  }

  copyUrl() {
    const url = this.activeTabUrl();
    if (!url || typeof navigator === 'undefined') return;
    navigator.clipboard.writeText(url).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }

  toggleFullscreen() {
    if (typeof document === 'undefined') return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        this.isFullscreen.set(true);
      }).catch(() => {});
    } else {
      document.exitFullscreen().then(() => {
        this.isFullscreen.set(false);
      }).catch(() => {});
    }
  }
}
