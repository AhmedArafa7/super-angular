import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Play, Users, Globe, Lock, Sparkles, X, ChevronLeft, Shield, Zap, Flame, Trophy, Copy, Check } from 'lucide-angular';
import { AiGameBlueprint, AiGamePlayMode } from '../../models/ai-game.models';
import { FirebaseService } from '../../../../../core/services/firebase.service';
import { ToastService } from '../../../../../core/services/toast.service';

@Component({
  selector: 'app-ai-game-briefing-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="fixed inset-0 z-[120] bg-slate-950/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 overflow-y-auto custom-scrollbar" dir="rtl">
      
      <div class="relative w-full max-w-2xl bg-slate-900/95 border border-indigo-500/30 rounded-3xl p-5 sm:p-8 shadow-2xl shadow-indigo-950/50 text-right overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        
        <!-- Background Ambient Glow -->
        <div class="absolute -top-24 -right-24 w-72 h-72 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -bottom-24 -left-24 w-72 h-72 bg-fuchsia-500/15 rounded-full blur-3xl pointer-events-none"></div>

        <!-- Header with Close Button -->
        <div class="flex items-start justify-between gap-4 pb-4 border-b border-white/10 relative z-10">
          <div class="flex items-center gap-3.5">
            <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl shadow-lg shadow-indigo-500/20 border border-white/20">
              {{ game.theme.icon || '✨' }}
            </div>
            <div>
              <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-indigo-500/20 border border-indigo-500/30 rounded-full mb-1">
                <lucide-icon [img]="Sparkles" class="w-3.5 h-3.5 text-indigo-400"></lucide-icon>
                <span class="text-[10px] font-black text-indigo-300">ابتكار الذكاء الاصطناعي الكامل</span>
              </div>
              <h2 class="text-xl sm:text-2xl font-black text-white tracking-tight">{{ game.title }}</h2>
              <p class="text-xs text-slate-400 font-medium">{{ game.tagline }}</p>
            </div>
          </div>

          <button (click)="close.emit()" class="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-2xl transition border border-white/5">
            <lucide-icon [img]="X" class="w-5 h-5"></lucide-icon>
          </button>
        </div>

        <div class="py-5 space-y-5 relative z-10 max-h-[65vh] overflow-y-auto pl-1 pr-1 custom-scrollbar">
          
          <!-- Story & Concept Section -->
          <div class="bg-indigo-950/30 border border-indigo-500/20 rounded-2xl p-4">
            <div class="flex items-center gap-2 text-indigo-400 font-bold text-xs mb-1.5">
              <span>📖</span>
              <span>عالم وقصة اللعبة (AI Lore)</span>
            </div>
            <p class="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
              {{ game.storyLore }}
            </p>
          </div>

          <!-- Rules & Objective -->
          <div class="bg-slate-950/60 border border-white/5 rounded-2xl p-4">
            <div class="flex items-center gap-2 text-amber-400 font-bold text-xs mb-2.5">
              <span>🎯</span>
              <span>قوانين اللعبة والأهداف</span>
            </div>
            <ul class="space-y-1.5">
              <li *ngFor="let rule of game.rules; let i = index" class="flex items-start gap-2 text-xs text-slate-300">
                <span class="w-4 h-4 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{{ i + 1 }}</span>
                <span>{{ rule }}</span>
              </li>
            </ul>
          </div>

          <!-- Controls Guide -->
          <div class="bg-slate-950/60 border border-white/5 rounded-2xl p-4">
            <div class="flex items-center gap-2 text-cyan-400 font-bold text-xs mb-2.5">
              <span>🕹️</span>
              <span>طريقة التحكم (Controls Guide)</span>
            </div>
            
            <div class="space-y-2">
              <div *ngIf="game.controlsGuide.keyboard && game.controlsGuide.keyboard.length > 0" class="flex flex-wrap items-center gap-1.5">
                <span class="text-[11px] text-slate-400 font-bold ml-2">لوحة المفاتيح:</span>
                <span *ngFor="let k of game.controlsGuide.keyboard" class="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs font-mono">
                  {{ k }}
                </span>
              </div>

              <div *ngIf="game.controlsGuide.touch && game.controlsGuide.touch.length > 0" class="flex flex-wrap items-center gap-1.5 pt-1">
                <span class="text-[11px] text-slate-400 font-bold ml-2">شاشات اللمس / الجوال:</span>
                <span *ngFor="let t of game.controlsGuide.touch" class="px-2.5 py-1 bg-indigo-900/40 border border-indigo-500/30 rounded-lg text-indigo-200 text-xs">
                  📱 {{ t }}
                </span>
              </div>
            </div>
          </div>

          <!-- Standardized 3 Game Modes Selection -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-black text-white flex items-center gap-1.5">
                <span>🎮</span>
                <span>اختر وضع اللعب (Game Mode)</span>
              </span>
              <span class="text-[10px] text-slate-400">معيار سوبر القياسي للألعاب</span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
              <!-- 1. Local Play Mode -->
              <div 
                (click)="selectedMode = 'local'"
                [class.border-indigo-500]="selectedMode === 'local'"
                [class.bg-indigo-950/40]="selectedMode === 'local'"
                [class.border-white/10]="selectedMode !== 'local'"
                class="cursor-pointer border bg-slate-950/50 hover:bg-slate-900 rounded-2xl p-3.5 transition-all text-center relative group">
                <div class="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                  <lucide-icon [img]="Play" class="w-5 h-5"></lucide-icon>
                </div>
                <h4 class="text-xs font-black text-white mb-0.5">اللعب محلياً</h4>
                <p class="text-[10px] text-slate-400 leading-tight">لعب فردي أو على نفس الجهاز مع حفظ الإنجازات</p>
                <div *ngIf="selectedMode === 'local'" class="absolute top-2 left-2 w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></div>
              </div>

              <!-- 2. Private Room / P2P -->
              <div 
                (click)="selectedMode = 'p2p'"
                [class.border-indigo-500]="selectedMode === 'p2p'"
                [class.bg-indigo-950/40]="selectedMode === 'p2p'"
                [class.border-white/10]="selectedMode !== 'p2p'"
                class="cursor-pointer border bg-slate-950/50 hover:bg-slate-900 rounded-2xl p-3.5 transition-all text-center relative group">
                <div class="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                  <lucide-icon [img]="Users" class="w-5 h-5"></lucide-icon>
                </div>
                <h4 class="text-xs font-black text-white mb-0.5">إنشاء غرفة (P2P)</h4>
                <p class="text-[10px] text-slate-400 leading-tight">شارك كود اللعبة مع الأصدقاء للتنافس المباشر</p>
                <div *ngIf="selectedMode === 'p2p'" class="absolute top-2 left-2 w-2 h-2 rounded-full bg-purple-400 animate-pulse"></div>
              </div>

              <!-- 3. Online Matchmaking (Pro Mode) -->
              <div 
                (click)="selectOnlineProMode()"
                [class.border-amber-500]="selectedMode === 'online_pro'"
                [class.bg-amber-950/30]="selectedMode === 'online_pro'"
                [class.border-white/10]="selectedMode !== 'online_pro'"
                class="cursor-pointer border bg-slate-950/50 hover:bg-slate-900 rounded-2xl p-3.5 transition-all text-center relative group">
                <div class="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                  <lucide-icon [img]="isProUser ? Globe : Lock" class="w-5 h-5"></lucide-icon>
                </div>
                <div class="flex items-center justify-center gap-1 mb-0.5">
                  <h4 class="text-xs font-black text-white">لعب أونلاين</h4>
                  <span class="px-1.5 py-0.2 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 text-[9px] font-black rounded">PRO</span>
                </div>
                <p class="text-[10px] text-slate-400 leading-tight">مطابقة تلقائية وبث سحابي مستمر</p>
                <div *ngIf="selectedMode === 'online_pro'" class="absolute top-2 left-2 w-2 h-2 rounded-full bg-amber-400 animate-pulse"></div>
              </div>

            </div>

            <!-- Room Code Generator if P2P mode selected -->
            <div *ngIf="selectedMode === 'p2p'" class="mt-3 bg-purple-950/40 border border-purple-500/30 rounded-2xl p-3 flex items-center justify-between gap-3 animate-in fade-in duration-200">
              <div>
                <span class="text-[10px] text-purple-300 block font-bold">كود الغرفة الخاص بك:</span>
                <span class="text-sm font-black text-white font-mono tracking-widest">{{ generatedRoomCode }}</span>
              </div>
              <button (click)="copyRoomCode()" class="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition">
                <lucide-icon [img]="copiedCode ? Check : Copy" class="w-3.5 h-3.5"></lucide-icon>
                <span>{{ copiedCode ? 'تم النسخ' : 'نسخ الكود' }}</span>
              </button>
            </div>

            <!-- Pro Upgrade Notice if non-pro clicks Online Matchmaking -->
            <div *ngIf="showProLockModal" class="mt-3 bg-amber-950/50 border border-amber-500/40 rounded-2xl p-3.5 flex items-center justify-between gap-3 animate-in fade-in duration-200">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <lucide-icon [img]="Lock" class="w-4 h-4"></lucide-icon>
                </div>
                <div>
                  <h5 class="text-xs font-black text-amber-300">ميزة حصرية لمشتركي Pro</h5>
                  <p class="text-[10px] text-amber-200/80">خوادم البث المباشر والمطابقة العالمية تتطلب اشتراك Pro لتغطية تكاليف الخوادم السحابية.</p>
                </div>
              </div>
              <button (click)="showProLockModal = false; selectedMode = 'local'" class="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shrink-0 transition">
                العب محلياً مجاناً ✨
              </button>
            </div>

          </div>

          <!-- Evolution / Mutation Notice -->
          <div class="bg-gradient-to-r from-indigo-950/40 to-fuchsia-950/40 border border-indigo-500/20 rounded-2xl p-3.5 flex items-center gap-3">
            <div class="text-2xl">🧬</div>
            <div class="text-right">
              <span class="text-xs font-black text-indigo-300 block">نظام المراحل اللانهائية وتطور الذكاء الاصطناعي:</span>
              <p class="text-[10px] text-slate-400 leading-normal">
                تبدأ اللعبة بـ 5 مراحل. عند فوزك بالمراحل الخمس، سيبتكر الذكاء الاصطناعي 5 مراحل جديدة بميكانيكيات وطفرات لم تكن موجودة من قبل، مع إمكانية التراجع أو التعطيل لأي تعديل في أي وقت!
              </p>
            </div>
          </div>

        </div>

        <!-- Action Footer -->
        <div class="pt-4 border-t border-white/10 flex items-center justify-between gap-3 relative z-10">
          <div class="text-right hidden sm:block">
            <span class="text-[10px] text-slate-400 block">المرحلة الحالية المفتوحة</span>
            <span class="text-sm font-black text-white">المرحلة {{ game.currentLevelIndex }} من أصل {{ game.levels.length }} ⚡</span>
          </div>

          <div class="flex items-center gap-3 w-full sm:w-auto">
            <button (click)="close.emit()" class="flex-1 sm:flex-initial px-5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-bold text-xs transition border border-white/10">
              إلغاء
            </button>
            <button (click)="startGame()" class="flex-1 sm:flex-initial px-8 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95">
              <lucide-icon [img]="Play" class="w-4 h-4 fill-white"></lucide-icon>
              <span>ابدأ اللعب الآن 🚀</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  `
})
export class AiGameBriefingModalComponent {
  @Input({ required: true }) game!: AiGameBlueprint;
  @Output() close = new EventEmitter<void>();
  @Output() play = new EventEmitter<{ mode: AiGamePlayMode; roomCode?: string }>();

  private firebase = inject(FirebaseService);
  private toast = inject(ToastService);

  // Icons
  Play = Play;
  Users = Users;
  Globe = Globe;
  Lock = Lock;
  Sparkles = Sparkles;
  X = X;
  ChevronLeft = ChevronLeft;
  Shield = Shield;
  Zap = Zap;
  Flame = Flame;
  Trophy = Trophy;
  Copy = Copy;
  Check = Check;

  selectedMode: AiGamePlayMode = 'local';
  generatedRoomCode: string = 'ROOM-' + Math.random().toString(36).substring(2, 7).toUpperCase();
  copiedCode = false;
  showProLockModal = false;

  get isProUser(): boolean {
    const role = (this.firebase.userData() as any)?.role;
    return role === 'admin' || role === 'founder' || role === 'cofounder' || role === 'pro';
  }

  selectOnlineProMode() {
    if (this.isProUser) {
      this.selectedMode = 'online_pro';
      this.showProLockModal = false;
    } else {
      this.showProLockModal = true;
    }
  }

  copyRoomCode() {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(this.generatedRoomCode);
      this.copiedCode = true;
      this.toast.show('تم نسخ كود الغرفة بنجاح!', 'success');
      setTimeout(() => this.copiedCode = false, 2500);
    }
  }

  startGame() {
    this.play.emit({
      mode: this.selectedMode,
      roomCode: this.selectedMode === 'p2p' ? this.generatedRoomCode : undefined
    });
  }
}
