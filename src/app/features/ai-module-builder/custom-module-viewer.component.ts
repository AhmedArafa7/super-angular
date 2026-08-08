import { Component, inject, signal, computed, OnInit, Injectable } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { LucideAngularModule, ArrowRight, Maximize2, RotateCcw, Download, Sparkles, Share2 } from 'lucide-angular';

export interface CustomModuleItem {
  id: string;
  title: string;
  versions?: { versionId: string; prompt: string; htmlContent: string; createdAt: number }[];
  activeVersionIndex?: number;
  code?: string;
  promptText?: string;
  createdAt?: number;
  updatedAt?: number;
}

@Injectable({
  providedIn: 'root'
})
export class CustomModuleStorageService {
  private readonly STORAGE_KEY = 'si_neuro_custom_modules_v2';
  readonly modules = signal<CustomModuleItem[]>([]);

  constructor() {
    this.loadModules();
  }

  loadModules(): CustomModuleItem[] {
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(this.STORAGE_KEY);
        if (raw) {
          const parsed: CustomModuleItem[] = JSON.parse(raw);
          const normalized = parsed.map(m => {
            let code = m.code || '';
            if (!code && m.versions && m.versions.length > 0) {
              const idx = m.activeVersionIndex ?? (m.versions.length - 1);
              code = m.versions[idx]?.htmlContent || m.versions[0]?.htmlContent || '';
            }
            return {
              ...m,
              code
            };
          });
          this.modules.set(normalized);
          return normalized;
        }
      } catch (e) {}
    }
    return [];
  }

  getModuleById(id: string): CustomModuleItem | undefined {
    this.loadModules(); // ensure fresh load
    return this.modules().find(m => m.id === id);
  }
}

@Component({
  selector: 'app-custom-module-viewer',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  template: `
    <div class="h-screen w-full flex flex-col bg-slate-950 text-white overflow-hidden" dir="rtl">
      <!-- Top Header Navigation Bar -->
      <header class="h-14 bg-slate-900/90 border-b border-white/10 px-4 flex items-center justify-between shrink-0 z-20 backdrop-blur-md">
        <div class="flex items-center gap-3">
          <a routerLink="/ai-module-builder" class="p-2 hover:bg-white/10 rounded-xl text-slate-300 hover:text-white transition" title="العودة لصانع الأقسام">
            <lucide-icon [img]="ArrowRight" class="w-5 h-5"></lucide-icon>
          </a>
          
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <lucide-icon [img]="Sparkles" class="w-4 h-4"></lucide-icon>
            </div>
            <div>
              <h1 class="text-sm font-black text-white truncate max-w-xs md:max-w-md">{{ activeModule()?.title || 'عرض القسم المخصص' }}</h1>
              <span class="text-[10px] text-emerald-400 font-mono block">قسم تفاعلي شخصي (Dynamic App)</span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button (click)="reloadIframe()" title="إعادة تشغيل" class="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-slate-200 flex items-center gap-1.5 transition">
            <lucide-icon [img]="RotateCcw" class="w-4 h-4 text-indigo-400"></lucide-icon>
            <span class="hidden sm:inline">إعادة تشغيل</span>
          </button>

          <button (click)="downloadHtml()" title="تحميل HTML" class="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-slate-200 flex items-center gap-1.5 transition">
            <lucide-icon [img]="Download" class="w-4 h-4 text-emerald-400"></lucide-icon>
            <span class="hidden sm:inline">تحميل كود</span>
          </button>

          <a [routerLink]="['/ai-module-builder']" [queryParams]="{ id: activeModule()?.id }" class="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/30">
            <span>تعديل بالذكاء الاصطناعي ⚡</span>
          </a>
        </div>
      </header>

      <!-- Main Interactive App Frame Container -->
      <main class="flex-1 w-full bg-slate-950 relative overflow-hidden flex items-center justify-center p-2">
        @if (rawHtmlContent()) {
          <iframe 
            [srcdoc]="rawHtmlContent()" 
            class="w-full h-full border-0 rounded-2xl bg-slate-950 shadow-2xl" 
            sandbox="allow-scripts allow-same-origin allow-modals allow-forms allow-popups">
          </iframe>
        } @else {
          <div class="text-center space-y-3">
            <div class="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <lucide-icon [img]="Sparkles" class="w-6 h-6"></lucide-icon>
            </div>
            <h3 class="text-base font-bold text-white">لم يتم العثور على القسم أو اللعبة المطلوب</h3>
            <a routerLink="/ai-module-builder" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold inline-block">الانتقال إلى صانع الأقسام</a>
          </div>
        }
      </main>
    </div>
  `
})
export class CustomModuleViewerComponent implements OnInit {
  route = inject(ActivatedRoute);
  sanitizer = inject(DomSanitizer);
  moduleStorage = inject(CustomModuleStorageService);

  activeModule = signal<CustomModuleItem | null>(null);

  ArrowRight = ArrowRight;
  Maximize2 = Maximize2;
  RotateCcw = RotateCcw;
  Download = Download;
  Sparkles = Sparkles;
  Share2 = Share2;

  rawHtmlContent = computed<string>(() => {
    const item = this.activeModule();
    if (!item || !item.code) return '';

    let rawHtml = item.code.replace(/^```html\s*/gi, '').replace(/```\s*$/gi, '').trim();
    const headAssets = `<script src="https://cdn.tailwindcss.com"></script><link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;800;900&display=swap" rel="stylesheet"><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"><style>body{margin:0;padding:1rem;background-color:#020617;color:white;font-family:'Cairo',system-ui,sans-serif;}</style>`;

    if (rawHtml.toLowerCase().includes('<html') || rawHtml.toLowerCase().includes('<!doctype')) {
      if (rawHtml.includes('<head>')) {
        return rawHtml.replace('<head>', `<head>${headAssets}`);
      } else {
        return headAssets + rawHtml;
      }
    } else {
      return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  ${headAssets}
</head>
<body class="bg-slate-950 text-white p-4">
  ${rawHtml}
</body>
</html>`;
    }
  });

  ngOnInit() {
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        const item = this.moduleStorage.getModuleById(id);
        if (item) {
          this.activeModule.set(item);
        }
      }
    });
  }

  reloadIframe() {
    const cur = this.activeModule();
    if (!cur) return;
    this.activeModule.set(null);
    setTimeout(() => this.activeModule.set(cur), 50);
  }

  downloadHtml() {
    const mod = this.activeModule();
    if (!mod || !mod.code) return;
    const blob = new Blob([mod.code], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${mod.title.replace(/\s+/g, '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
