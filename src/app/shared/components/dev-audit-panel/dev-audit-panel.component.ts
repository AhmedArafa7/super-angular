import { Component, inject, signal, isDevMode, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonInspectorService, ButtonIssue, IssueCategory } from '../../../core/services/button-inspector.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-dev-audit-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Render Dev Panel ONLY in Development Mode -->
    <ng-container *ngIf="isDev">
      <!-- Floating Dev Badge -->
      <div class="fixed bottom-5 right-5 z-[99999] pointer-events-auto">
        <button 
          (click)="togglePanel()"
          [class.bg-slate-900]="totalCount() === 0"
          [class.bg-slate-900\/95]="totalCount() > 0"
          class="flex items-center gap-2.5 px-4 py-2.5 rounded-full text-white font-bold text-xs shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 border border-slate-700 backdrop-blur-xl">
          
          <!-- Wrench Icon SVG -->
          <svg class="w-4 h-4 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
          </svg>

          <span>مفتش الكود</span>

          <!-- Errors Badge -->
          <span 
            *ngIf="errorCount() > 0"
            class="px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-500 text-white shadow-sm flex items-center gap-1">
            <span>🚨</span>
            <span>{{ errorCount() }}</span>
          </span>

          <!-- Suggestions Badge -->
          <span 
            *ngIf="suggestionCount() > 0"
            class="px-2 py-0.5 rounded-full text-[11px] font-black bg-indigo-600 text-white shadow-sm flex items-center gap-1">
            <span>💡</span>
            <span>{{ suggestionCount() }}</span>
          </span>

          <span *ngIf="totalCount() === 0" class="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-600/80 text-emerald-100">
            ✓ سليم
          </span>
        </button>
      </div>

      <!-- Dev Inspector Slide-out Panel -->
      <div 
        *ngIf="isOpen()"
        class="fixed bottom-20 right-5 z-[99999] w-[460px] max-w-[calc(100vw-2.5rem)] bg-slate-900/95 text-slate-100 rounded-2xl shadow-2xl border border-slate-700/80 backdrop-blur-xl overflow-hidden flex flex-col max-h-[580px] animate-scale-up">
        
        <!-- Panel Header -->
        <div class="px-4 py-3 bg-slate-800/90 border-b border-slate-700/80 flex items-center justify-between">
          <div class="flex items-center gap-2 text-amber-400 font-bold text-sm">
            <!-- Bug Icon SVG -->
            <svg class="w-4 h-4 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="m8 2 1.88 1.88M14.12 3.88 16 2M9 7.13v-1a3 3 0 1 1 6 0v1M12 20c-3.3 0-6-2.7-6-6v-3a6 6 0 0 1 12 0v3c0 3.3-2.7 6-6 6ZM12 20v2M4 13h2M18 13h2M4.93 19.07l1.41-1.41M17.66 17.66l1.41 1.41"/>
            </svg>
            <span>مفتش الكود وتجربة المستخدم (UX Inspector)</span>
          </div>

          <div class="flex items-center gap-1.5">
            <button 
              (click)="rescan()" 
              title="إعادة مسح الصفحة"
              class="p-1.5 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-white transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/>
              </svg>
            </button>

            <button 
              (click)="isOpen.set(false)" 
              class="p-1.5 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-white transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Category Tabs Bar (الأخطاء vs التنبيهات واقتراحات UX) -->
        <div class="p-1.5 bg-slate-950/80 border-b border-slate-800 flex items-center gap-1">
          <button 
            (click)="activeTab.set('all')"
            [class.bg-slate-800]="activeTab() === 'all'"
            [class.text-white]="activeTab() === 'all'"
            [class.text-slate-400]="activeTab() !== 'all'"
            class="flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5">
            <span>الكل</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-700 text-slate-200">{{ totalCount() }}</span>
          </button>

          <button 
            (click)="activeTab.set('errors')"
            [class.bg-rose-950\/60]="activeTab() === 'errors'"
            [class.text-rose-300]="activeTab() === 'errors'"
            [class.border-rose-500\/40]="activeTab() === 'errors'"
            [class.text-slate-400]="activeTab() !== 'errors'"
            class="flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors border border-transparent flex items-center justify-center gap-1.5">
            <span>🚨 الأخطاء المعطلة</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-900/80 text-rose-200">{{ errorCount() }}</span>
          </button>

          <button 
            (click)="activeTab.set('suggestions')"
            [class.bg-indigo-950\/60]="activeTab() === 'suggestions'"
            [class.text-indigo-300]="activeTab() === 'suggestions'"
            [class.border-indigo-500\/40]="activeTab() === 'suggestions'"
            [class.text-slate-400]="activeTab() !== 'suggestions'"
            class="flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors border border-transparent flex items-center justify-center gap-1.5">
            <span>💡 التلميحات والـ UX</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-900/80 text-indigo-200">{{ suggestionCount() }}</span>
          </button>
        </div>

        <!-- Copy Settings Toolbar -->
        <div *ngIf="filteredIssues().length > 0" class="px-4 py-2 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between gap-2 text-xs">
          <div class="flex items-center gap-1.5">
            <span class="text-slate-400 font-medium">الحد الأقصى (من الأعلى):</span>
            <select 
              [ngModel]="copyLimit()" 
              (ngModelChange)="onLimitChange($event)"
              class="bg-slate-800 text-amber-300 border border-slate-700 rounded-lg px-2 py-1 font-bold text-xs focus:outline-none focus:border-amber-500 transition-colors">
              <option [value]="0">الكل ({{ filteredIssues().length }})</option>
              <option [value]="5">أول 5 عناصر</option>
              <option [value]="10">أول 10 عناصر</option>
              <option [value]="20">أول 20 عنصر</option>
              <option [value]="50">أول 50 عنصر</option>
            </select>
          </div>

          <!-- Copy AI Prompt Button -->
          <button 
            (click)="copyAIPrompt()"
            title="نسخ تقرير الذكاء الاصطناعي بناءً على التبويب المحدد"
            class="px-3 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400/40 rounded-lg transition-colors flex items-center gap-1.5 shadow-md active:scale-95">
            <svg class="w-3.5 h-3.5 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8V4H8M12 2a2 2 0 0 1 2 2v2M2 14h2M20 14h2M15 13v2M9 13v2M5 10a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-8Z"/>
            </svg>
            <span>{{ getCopyButtonLabel() }}</span>
          </button>
        </div>

        <!-- Issues List -->
        <div class="p-3 overflow-y-auto flex-1 flex flex-col gap-2.5 custom-scrollbar">
          <div *ngIf="filteredIssues().length === 0" class="py-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
            <svg class="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3"/>
            </svg>
            <p class="font-medium text-emerald-300">لا توجد عناصر متبقية في هذا التبويب!</p>
          </div>

          <div 
            *ngFor="let issue of filteredIssues(); let idx = index"
            [class.border-rose-500\/40]="issue.category === 'error'"
            [class.border-indigo-500\/40]="issue.category === 'suggestion'"
            class="p-3 rounded-xl bg-slate-800/50 border transition-all group flex flex-col gap-2 relative">
            
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-2">
                <span class="w-5 h-5 rounded-full bg-slate-700 text-slate-300 text-[10px] font-bold flex items-center justify-center border border-slate-600 shrink-0">
                  {{ idx + 1 }}
                </span>

                <!-- Badge Type -->
                <span 
                  *ngIf="issue.category === 'error'"
                  class="px-1.5 py-0.5 text-[10px] uppercase font-mono font-bold bg-rose-500/20 text-rose-300 rounded border border-rose-500/30">
                  🚨 {{ issue.tagName }} (خلل)
                </span>
                <span 
                  *ngIf="issue.category === 'suggestion'"
                  class="px-1.5 py-0.5 text-[10px] uppercase font-mono font-bold bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30">
                  💡 {{ issue.tagName }} (تلميح UX)
                </span>

                <span class="text-xs font-bold text-slate-100 truncate max-w-[150px]">
                  {{ issue.text || '(بدون عنوان)' }}
                </span>
              </div>

              <div class="flex items-center gap-1">
                <button 
                  (click)="highlight(issue)"
                  [class.bg-rose-500]="issue.category === 'error'"
                  [class.bg-indigo-600]="issue.category === 'suggestion'"
                  class="px-2.5 py-1 text-[11px] font-bold text-white rounded-md transition-colors shrink-0 flex items-center gap-1 shadow-sm hover:brightness-110">
                  <svg class="w-3 h-3 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/><circle cx="12" cy="12" r="7"/>
                  </svg>
                  <span>تحديد</span>
                </button>

                <button 
                  (click)="copySingleAIPrompt(issue)"
                  title="نسخ أمر معالجة هذا العنصر للذكاء الاصطناعي"
                  class="px-2 py-1 text-[11px] font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white rounded-md transition-colors shrink-0 flex items-center gap-1">
                  <svg class="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 8V4H8M12 2a2 2 0 0 1 2 2v2M2 14h2M20 14h2M15 13v2M9 13v2M5 10a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-8Z"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Reason Description Box -->
            <p 
              [class.bg-rose-950\/30]="issue.category === 'error'"
              [class.border-rose-500\/20]="issue.category === 'error'"
              [class.text-rose-200]="issue.category === 'error'"
              [class.bg-indigo-950\/30]="issue.category === 'suggestion'"
              [class.border-indigo-500\/20]="issue.category === 'suggestion'"
              [class.text-indigo-200]="issue.category === 'suggestion'"
              class="text-[11px] leading-relaxed font-medium p-2.5 rounded-lg border">
              {{ issue.reason }}
            </p>

            <div class="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-700/40">
              <span class="truncate max-w-[220px]" title="{{ issue.selector }}">{{ issue.selector }}</span>
              <button 
                (click)="copySelector(issue)" 
                class="text-slate-400 hover:text-white transition-colors flex items-center gap-1 font-sans">
                <svg class="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                </svg>
                <span>نسخ المحدد</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Footer Bar -->
        <div class="px-4 py-2.5 bg-slate-950/80 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between items-center">
          <div class="flex items-center gap-2">
            <span>🚨 الأخطاء: {{ errorCount() }}</span>
            <span class="text-slate-600">•</span>
            <span>💡 التلميحات: {{ suggestionCount() }}</span>
          </div>

          <div class="flex items-center gap-2">
            <button 
              *ngIf="filteredIssues().length > 0"
              (click)="copyAIPrompt()" 
              class="text-indigo-400 hover:text-indigo-300 font-bold underline transition-colors flex items-center gap-1">
              <svg class="w-3 h-3 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z"/>
              </svg>
              <span>نسخ {{ getEffectiveCopyCount() }} عنصر</span>
            </button>
            <span *ngIf="filteredIssues().length > 0" class="text-slate-600">•</span>
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

  /** Active Tab Filter: 'all' | 'errors' | 'suggestions' */
  activeTab = signal<'all' | 'errors' | 'suggestions'>('all');
  
  /** Selected copy limit count (0 means ALL) */
  copyLimit = signal<number>(0);

  ngOnInit() {
    if (this.isDev) {
      setTimeout(() => {
        this.inspectorService.scanCurrentPage();
      }, 800);
    }
  }

  totalCount(): number {
    return this.inspectorService.detectedIssues().length;
  }

  errorCount(): number {
    return this.inspectorService.detectedIssues().filter(i => i.category === 'error').length;
  }

  suggestionCount(): number {
    return this.inspectorService.detectedIssues().filter(i => i.category === 'suggestion').length;
  }

  filteredIssues(): ButtonIssue[] {
    const tab = this.activeTab();
    const issues = this.inspectorService.detectedIssues();
    if (tab === 'errors') return issues.filter(i => i.category === 'error');
    if (tab === 'suggestions') return issues.filter(i => i.category === 'suggestion');
    return issues;
  }

  onLimitChange(val: any) {
    this.copyLimit.set(Number(val) || 0);
  }

  getEffectiveCopyCount(): number {
    const total = this.filteredIssues().length;
    const limit = this.copyLimit();
    if (limit <= 0 || limit >= total) return total;
    return limit;
  }

  getCopyButtonLabel(): string {
    const total = this.filteredIssues().length;
    const limit = this.copyLimit();
    const tabLabel = this.activeTab() === 'errors' ? 'الأخطاء' : this.activeTab() === 'suggestions' ? 'التلميحات' : 'الكل';
    
    if (limit <= 0 || limit >= total) {
      return `AI Prompt (${tabLabel}: ${total})`;
    }
    return `AI Prompt (أول ${limit} من ${tabLabel})`;
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

  copyAIPrompt() {
    const limit = this.copyLimit();
    const tab = this.activeTab();
    const count = this.getEffectiveCopyCount();
    const prompt = this.inspectorService.exportAIPromptReport(limit > 0 ? limit : null, tab);
    navigator.clipboard.writeText(prompt);
    
    this.toastService.show(`تم نسخ تقرير الـ AI (${count} عنصر - تبويب: ${tab}) بنجاح! 🤖`, 'success');
  }

  copySingleAIPrompt(issue: ButtonIssue) {
    const prompt = this.inspectorService.exportSingleIssueAIPrompt(issue);
    navigator.clipboard.writeText(prompt);
    this.toastService.show(`تم نسخ أمر معالجة هذا العنصر للـ AI! 🤖`, 'success');
  }
}
