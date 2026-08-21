import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Sparkles, X, CheckCircle2, XCircle, RotateCcw, AlertTriangle, Cpu, Layers, Sliders, ShieldCheck } from 'lucide-angular';
import { AiGameBlueprint, AiGameMutation } from '../../models/ai-game.models';
import { AiGameStorageService } from '../../services/ai-game-storage.service';

@Component({
  selector: 'app-ai-evolution-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="fixed inset-0 z-[130] bg-slate-950/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 overflow-y-auto custom-scrollbar" dir="rtl">
      
      <div class="relative w-full max-w-3xl bg-slate-900/95 border border-indigo-500/30 rounded-3xl p-5 sm:p-8 shadow-2xl shadow-indigo-950/60 text-right overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        
        <!-- Header -->
        <div class="flex items-start justify-between gap-4 pb-4 border-b border-white/10 relative z-10">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <lucide-icon [img]="Cpu" class="w-6 h-6"></lucide-icon>
            </div>
            <div>
              <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-indigo-500/20 border border-indigo-500/30 rounded-full mb-1">
                <lucide-icon [img]="Sparkles" class="w-3.5 h-3.5 text-indigo-400"></lucide-icon>
                <span class="text-[10px] font-black text-indigo-300">سجل تطورات وتحسينات الذكاء الاصطناعي</span>
              </div>
              <h2 class="text-xl font-black text-white">إدارة طفرات اللعبة والتحكم في التراجع</h2>
              <p class="text-xs text-slate-400 font-medium">يمكنك مراجعة كل تغيير وتعديل ابتكره الذكاء الاصطناعي، أو تعطيله والتراجع عنه في أي وقت.</p>
            </div>
          </div>

          <button (click)="close.emit()" class="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-2xl transition border border-white/5">
            <lucide-icon [img]="X" class="w-5 h-5"></lucide-icon>
          </button>
        </div>

        <!-- Stats Overview Banner -->
        <div class="my-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div class="bg-indigo-950/40 border border-indigo-500/20 rounded-2xl p-3 text-center">
            <span class="text-[10px] text-indigo-300 font-bold block">إجمالي الابتكارات</span>
            <span class="text-lg font-black text-white">{{ game.mutations.length }} طفرة 🧬</span>
          </div>
          <div class="bg-emerald-950/40 border border-emerald-500/20 rounded-2xl p-3 text-center">
            <span class="text-[10px] text-emerald-300 font-bold block">الميكانيكيات النشطة</span>
            <span class="text-lg font-black text-emerald-400">{{ activeMutationsCount }} مفعّلة ✅</span>
          </div>
          <div class="col-span-2 sm:col-span-1 bg-amber-950/40 border border-amber-500/20 rounded-2xl p-3 text-center">
            <span class="text-[10px] text-amber-300 font-bold block">المراحل المتطورة</span>
            <span class="text-lg font-black text-amber-400">{{ game.levels.length }} مرحلة ⚡</span>
          </div>
        </div>

        <!-- Mutations & Changelog List -->
        <div class="space-y-4 max-h-[55vh] overflow-y-auto pl-1 pr-1 custom-scrollbar py-2">
          
          <div *ngIf="game.mutations.length === 0" class="text-center py-10">
            <p class="text-sm text-slate-400">لا توجد طفرات مسجلة بعد. عند اجتيازك أول 5 مراحل سيبتكر الذكاء الاصطناعي أول طفرة!</p>
          </div>

          <div *ngFor="let mutation of game.mutations; let idx = index" 
               [class.border-indigo-500/40]="mutation.isEnabled"
               [class.bg-slate-900/90]="mutation.isEnabled"
               [class.border-slate-800]="!mutation.isEnabled"
               [class.bg-slate-950/60]="!mutation.isEnabled"
               [class.opacity-75]="!mutation.isEnabled"
               class="border rounded-2xl p-4 transition-all duration-300 hover:border-indigo-400/60 relative group">
            
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5 pb-2.5 border-b border-white/5">
              
              <div class="flex items-center gap-2.5">
                <span class="w-7 h-7 rounded-xl bg-indigo-500/20 text-indigo-300 font-black text-xs flex items-center justify-center border border-indigo-500/30">
                  #{{ mutation.version || (game.mutations.length - idx) }}
                </span>
                <div>
                  <h4 class="text-sm font-black text-white flex items-center gap-2">
                    <span>{{ mutation.title }}</span>
                    <span *ngIf="!mutation.isEnabled" class="px-2 py-0.5 bg-rose-500/20 text-rose-300 text-[10px] font-bold rounded-full border border-rose-500/30">
                      معطلة / تم التراجع
                    </span>
                  </h4>
                  <span class="text-[10px] text-slate-400">تم ابتكارها وتفعيلها في المرحلة {{ mutation.unlockedAtLevel }}</span>
                </div>
              </div>

              <!-- Toggle / Rollback Switch -->
              <div class="flex items-center gap-2.5 self-end sm:self-auto">
                <span class="text-xs font-bold text-slate-300">
                  {{ mutation.isEnabled ? 'مفعلة باللعبة' : 'معطلة (تراجع)' }}
                </span>
                
                <button 
                  (click)="toggleMutation(mutation)"
                  [class.bg-emerald-600]="mutation.isEnabled"
                  [class.bg-slate-700]="!mutation.isEnabled"
                  class="w-12 h-6 rounded-full p-1 transition-colors duration-300 relative focus:outline-none cursor-pointer"
                  title="تبديل تفعيل أو تعطيل هذه الميكانيكية">
                  <div 
                    [class.translate-x-6]="!mutation.isEnabled"
                    [class.translate-x-0]="mutation.isEnabled"
                    class="w-4 h-4 rounded-full bg-white transition-transform duration-300 shadow"></div>
                </button>
              </div>

            </div>

            <!-- Description -->
            <div class="text-xs text-slate-300 leading-relaxed mb-2 font-normal">
              {{ mutation.description }}
            </div>

            <!-- AI Rationale (لماذا أضافها الذكاء الاصطناعي) -->
            <div class="bg-indigo-950/30 border border-indigo-500/20 rounded-xl p-2.5 flex items-start gap-2 text-[11px] text-indigo-200">
              <span class="text-sm shrink-0">💡</span>
              <div>
                <span class="font-bold text-indigo-300 block mb-0.5">رؤية الذكاء الاصطناعي والسبب:</span>
                <span>{{ mutation.aiRationale }}</span>
              </div>
            </div>

          </div>

        </div>

        <!-- Footer -->
        <div class="pt-4 border-t border-white/10 flex items-center justify-between gap-3 relative z-10">
          <p class="text-[10px] text-slate-400 hidden sm:block">
            أي تغيير تقوم به هنا ينعكس فوراً على محرك اللعبة في الجولة القادمة!
          </p>
          <button (click)="close.emit()" class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl transition shadow-lg shadow-indigo-600/20">
            حفظ وإغلاق
          </button>
        </div>

      </div>

    </div>
  `
})
export class AiEvolutionPanelComponent {
  @Input({ required: true }) game!: AiGameBlueprint;
  @Output() close = new EventEmitter<void>();
  @Output() mutationChanged = new EventEmitter<AiGameBlueprint>();

  private storage = inject(AiGameStorageService);

  // Icons
  Sparkles = Sparkles;
  X = X;
  CheckCircle2 = CheckCircle2;
  XCircle = XCircle;
  RotateCcw = RotateCcw;
  AlertTriangle = AlertTriangle;
  Cpu = Cpu;
  Layers = Layers;
  Sliders = Sliders;
  ShieldCheck = ShieldCheck;

  get activeMutationsCount(): number {
    return this.game.mutations.filter(m => m.isEnabled).length;
  }

  toggleMutation(mutation: AiGameMutation) {
    mutation.isEnabled = !mutation.isEnabled;
    this.storage.saveGame(this.game);
    this.mutationChanged.emit(this.game);
  }
}
