import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideDynamicIcon } from '@lucide/angular';
import { PwaInstallService } from '../../../core/services/pwa-install.service';

@Component({
  selector: 'app-pwa-install-prompt',
  standalone: true,
  imports: [CommonModule, LucideDynamicIcon],
  template: `
    <!-- iOS Guided Installation Modal -->
    <div *ngIf="pwaInstall.showIOSInstructions()" class="fixed inset-0 z-[250] bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-4 text-right" dir="rtl">
      <div class="bg-slate-900 border border-indigo-500/20 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl shadow-indigo-500/10 space-y-6 animate-in slide-in-from-bottom sm:zoom-in-95 duration-300">
        
        <div class="flex items-center justify-between border-b border-white/10 pb-4">
          <div class="flex items-center gap-3">
            <div class="size-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg">
              <svg lucideIcon="smartphone" class="size-5 text-white"></svg>
            </div>
            <div>
              <h3 class="text-base font-black text-white">تثبيت التطبيق على آيفون (iOS)</h3>
              <p class="text-[11px] text-slate-400 font-bold">اتبع الخطوتين التاليتين لتثبيت التطبيق</p>
            </div>
          </div>
          <button (click)="pwaInstall.closeIOSInstructions()" class="size-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center font-bold transition-all">✕</button>
        </div>

        <div class="space-y-4 text-xs font-bold text-slate-200">
          
          <div class="flex items-start gap-3 bg-white/5 p-4 rounded-2xl border border-white/5">
            <div class="size-7 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 font-black text-xs mt-0.5">
              1
            </div>
            <div class="space-y-1">
              <p class="text-white">اضغط على زر <span class="text-indigo-400 font-black">المشاركة (Share)</span> أسفل شاشة المتصفح في Safari:</p>
              <div class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/10 rounded-lg text-slate-300 text-[10px]">
                <svg lucideIcon="share" class="size-3.5 text-indigo-400"></svg>
                <span>أيقونة المربع ذو السهم للأعلى</span>
              </div>
            </div>
          </div>

          <div class="flex items-start gap-3 bg-white/5 p-4 rounded-2xl border border-white/5">
            <div class="size-7 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 font-black text-xs mt-0.5">
              2
            </div>
            <div class="space-y-1">
              <p class="text-white">مرر لأسفل واختر <span class="text-indigo-400 font-black">"إضافة إلى الشاشة الرئيسية"</span>:</p>
              <div class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/10 rounded-lg text-slate-300 text-[10px]">
                <svg lucideIcon="plus-square" class="size-3.5 text-emerald-400"></svg>
                <span>Add to Home Screen ➕</span>
              </div>
            </div>
          </div>

        </div>

        <div class="pt-2">
          <button (click)="pwaInstall.closeIOSInstructions()" class="w-full h-11 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black text-xs shadow-xl shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
            <svg lucideIcon="check" class="size-4"></svg>
            فهمت ذلك، تم!
          </button>
        </div>

      </div>
    </div>
  `
})
export class PwaInstallPromptComponent {
  pwaInstall = inject(PwaInstallService);
}
