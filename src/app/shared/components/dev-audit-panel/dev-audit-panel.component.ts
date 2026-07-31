import { Component, inject, signal, isDevMode, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonInspectorService, ButtonIssue } from '../../../core/services/button-inspector.service';
import { ToastService } from '../../../core/services/toast.service';
import { LucideDynamicIcon } from '@lucide/angular';

@Component({
  selector: 'app-dev-audit-panel',
  standalone: true,
  imports: [CommonModule, LucideDynamicIcon],
  template: `
    <!-- Render Dev Panel ONLY in Development Mode -->
    <ng-container *ngIf="isDev">
      <!-- Floating Dev Badge -->
      <div class="fixed bottom-5 right-5 z-[99999] pointer-events-auto">
        <button 
          (click)="togglePanel()"
          [class.bg-amber-500]="issuesCount() > 0"
          [class.bg-emerald-600]="issuesCount() === 0"
          class="flex items-center gap-2 px-3.5 py-2 rounded-full text-white font-bold text-xs shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 border border-white/20 backdrop-blur-md">
          <svg lucideIcon="wrench" class="w-4 h-4 animate-spin-slow"></svg>
          <span>مفتش الكود</span>
          <span 
            class="px-2 py-0.5 rounded-full text-[11px] font-extrabold"
            [class.bg-black\/20]="issuesCount() > 0"
            [class.bg-emerald-800]="issuesCount() === 0">
            {{ issuesCount() }}
          </span>
        </button>
      </div>

      <!-- Dev Inspector Slide-out Panel -->
      <div 
        *ngIf="isOpen()"
        class="fixed bottom-20 right-5 z-[99999] w-96 max-w-[calc(100vw-2.5rem)] bg-slate-900/95 text-slate-100 rounded-2xl shadow-2xl border border-slate-700/80 backdrop-blur-xl overflow-hidden flex flex-col max-h-[520px] animate-scale-up">
        
        <!-- Panel Header -->
        <div class="px-4 py-3 bg-slate-800/90 border-b border-slate-700/80 flex items-center justify-between">
          <div class="flex items-center gap-2 text-amber-400 font-bold text-sm">
            <svg lucideIcon="bug" class="w-4 h-4"></svg>
            <span>فاحص الأزرار والعناصر المعطلة</span>
          </div>

          <div class="flex items-center gap-1.5">
            <!-- Copy All Button in Header -->
            <button 
              *ngIf="issuesCount() > 0"
              (click)="copyAllIssues()"
              title="نسخ تقرير جميع العناصر"
              class="px-2.5 py-1 text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg transition-colors flex items-center gap-1">
              <svg lucideIcon="copy" class="w-3.5 h-3.5"></svg>
              <span>نسخ الكل</span>
            </button>

            <button 
              (click)="rescan()" 
              title="إعادة مسح الصفحة"
              class="p-1.5 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-white transition-colors">
              <svg lucideIcon="refresh-cw" class="w-4 h-4"></svg>
            </button>
            <button 
              (click)="isOpen.set(false)" 
              class="p-1.5 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-white transition-colors">
              <svg lucideIcon="x" class="w-4 h-4"></svg>
            </button>
          </div>
        </div>

        <!-- Issues List -->
        <div class="p-3 overflow-y-auto flex-1 flex flex-col gap-2.5 custom-scrollbar">
          <div *ngIf="issuesCount() === 0" class="py-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
            <svg lucideIcon="check-circle-2" class="w-8 h-8 text-emerald-400"></svg>
            <p class="font-medium text-emerald-300">جميع الأزرار والعناصر التفاعلية في هذه الصفحة تعمل ومربوطة بأوامر بنجاح!</p>
          </div>

          <div 
            *ngFor="let issue of inspectorService.detectedIssues()"
            class="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-amber-500/50 transition-all group flex flex-col gap-2">
            
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-2">
                <span class="px-1.5 py-0.5 text-[10px] uppercase font-mono font-bold bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
                  {{ issue.tagName }}
                </span>
                <span class="text-xs font-bold text-slate-100 truncate max-w-[180px]">
                  {{ issue.text || '(بدون عنوان)' }}
                </span>
              </div>

              <button 
                (click)="highlight(issue)"
                class="px-2.5 py-1 text-[11px] font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-md transition-colors shrink-0 flex items-center gap-1 shadow-sm">
                <svg lucideIcon="locate" class="w-3 h-3"></svg>
                <span>تحديد</span>
              </button>
            </div>

            <p class="text-[11px] text-amber-300/90 leading-relaxed font-medium bg-amber-950/40 p-2.5 rounded-lg border border-amber-500/30">
              {{ issue.reason }}
            </p>

            <div class="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-700/40">
              <span class="truncate max-w-[200px]" title="{{ issue.selector }}">{{ issue.selector }}</span>
              <button 
                (click)="copySelector(issue)" 
                class="text-slate-400 hover:text-white transition-colors flex items-center gap-1 font-sans">
                <svg lucideIcon="copy" class="w-3 h-3"></svg>
                <span>نسخ المحدد</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Footer Bar with Copy All & Rescan -->
        <div class="px-4 py-2.5 bg-slate-950/80 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between items-center">
          <div class="flex items-center gap-2">
            <span>التطوير (Dev Mode)</span>
            <span class="text-slate-600">•</span>
            <span>{{ issuesCount() }} عنصر يتطلب مراجعة</span>
          </div>

          <div class="flex items-center gap-2">
            <button 
              *ngIf="issuesCount() > 0"
              (click)="copyAllIssues()" 
              class="text-amber-400 hover:text-amber-300 font-bold underline transition-colors">
              نسخ التقرير الكامل
            </button>
            <span *ngIf="issuesCount() > 0" class="text-slate-600">•</span>
            <button (click)="rescan()" class="hover:text-slate-200 underline">إعادة الفحص</button>
          </div>
        </div>
      </div>
    </ng-container>
  `,
  styles: [`
    @keyframes animate-pulse-glow {
      0%, 100% { outline: 4px solid #f59e0b; box-shadow: 0 0 20px #f59e0b; transform: scale(1); }
      50% { outline: 6px solid #ef4444; box-shadow: 0 0 35px #ef4444; transform: scale(1.05); }
    }
    :host ::ng-deep .dev-audit-highlight {
      animation: animate-pulse-glow 0.8s ease-in-out infinite !important;
      z-index: 99990 !important;
      position: relative !important;
    }
    .custom-scrollbar::-webkit-scrollbar {
      width: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: rgba(15, 23, 42, 0.6);
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(100, 116, 139, 0.5);
      border-radius: 4px;
    }
  `]
})
export class DevAuditPanelComponent implements OnInit {
  inspectorService = inject(ButtonInspectorService);
  toastService = inject(ToastService);

  isDev = isDevMode();
  isOpen = signal<boolean>(false);

  ngOnInit() {
    if (this.isDev) {
      setTimeout(() => {
        this.inspectorService.scanCurrentPage();
      }, 800);
    }
  }

  issuesCount(): number {
    return this.inspectorService.detectedIssues().length;
  }

  togglePanel() {
    this.isOpen.update(v => !v);
    if (this.isOpen()) {
      this.inspectorService.scanCurrentPage();
    }
  }

  rescan() {
    this.inspectorService.scanCurrentPage();
    this.toastService.show('تمت إعادة مسح وتحديث أزرار الصفحة الحالية بنجاح', 'success');
  }

  highlight(issue: ButtonIssue) {
    this.inspectorService.highlightElement(issue);
  }

  copySelector(issue: ButtonIssue) {
    navigator.clipboard.writeText(issue.selector);
    this.toastService.show(`تم نسخ المحدد: ${issue.selector}`, 'info');
  }

  copyAllIssues() {
    const report = this.inspectorService.exportAllIssuesReport();
    navigator.clipboard.writeText(report);
    this.toastService.show(`تم نسخ تقرير جميع العناصر (${this.issuesCount()} عنصر) إلى الحافظة بنجاح!`, 'success');
  }
}
