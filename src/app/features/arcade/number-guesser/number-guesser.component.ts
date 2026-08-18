import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule, Trophy, Clock, Zap, RotateCcw, ArrowRight, Sparkles, Lock, Key, Eye, EyeOff, Hash, AlertTriangle, ShieldCheck, Copy, Check } from 'lucide-angular';

export interface GuessRecord {
  player: string;
  guess: string;
  bulls: number; // صح في مكانه صح (Right digit, right position)
  cows: number;  // صح في مكانه غلط (Right digit, wrong position)
  misses: number;// أرقام خاطئة
  message: string; // التوضيح اللفظي لنتيجة التخمين
  timestamp: string;
}

export interface PlayerSession {
  name: string;
  secretCode: string;
  isSecretConfirmed: boolean;
  score: number;
}

@Component({
  selector: 'app-number-guesser',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  styles: [`
    @keyframes floatNumber {
      0% { transform: translateY(0px) rotate(0deg) scale(1); opacity: 0.25; }
      50% { transform: translateY(-30px) rotate(12deg) scale(1.2); opacity: 0.55; }
      100% { transform: translateY(0px) rotate(0deg) scale(1); opacity: 0.25; }
    }
    @keyframes floatBadge {
      0% { transform: translateY(0px) rotate(0deg) scale(1); opacity: 0.35; }
      50% { transform: translateY(-35px) rotate(-15deg) scale(1.25); opacity: 0.7; }
      100% { transform: translateY(0px) rotate(0deg) scale(1); opacity: 0.35; }
    }
    .floating-vault-bg {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 0;
      overflow: hidden;
      background: radial-gradient(circle at 50% 20%, #1e140a 0%, #0f172a 60%, #020617 100%);
    }
    .num-particle {
      position: absolute;
      font-weight: 900;
      font-family: 'Monaco', 'Courier New', monospace;
      color: rgba(251, 191, 36, 0.45);
      text-shadow: 0 0 25px rgba(245, 158, 11, 0.6);
      animation: floatNumber 8s ease-in-out infinite;
    }
    .badge-particle {
      position: absolute;
      filter: drop-shadow(0 0 22px rgba(16, 185, 129, 0.6));
      animation: floatBadge 9s ease-in-out infinite;
    }
  `],
  template: `
    <!-- Dynamic Cyber Vault & Secret Number Matrix Background -->
    <div class="floating-vault-bg">
      <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-600/20 rounded-full blur-3xl"></div>
      <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl"></div>
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl"></div>

      <!-- Floating 3D Cyber Digits -->
      <span class="num-particle text-8xl top-[8%] left-[6%]" style="animation-delay: 0s">7</span>
      <span class="num-particle text-9xl top-[22%] right-[10%]" style="animation-delay: 1.5s">3</span>
      <span class="num-particle text-7xl top-[58%] left-[12%]" style="animation-delay: 3s">9</span>
      <span class="num-particle text-9xl top-[72%] right-[6%]" style="animation-delay: 4.5s">4</span>
      <span class="num-particle text-8xl top-[12%] right-[32%]" style="animation-delay: 2s">1</span>
      <span class="num-particle text-9xl top-[48%] left-[28%]" style="animation-delay: 3.5s">8</span>
      <span class="num-particle text-7xl top-[78%] left-[42%]" style="animation-delay: 5s">5</span>
      <span class="num-particle text-8xl top-[32%] left-[4%]" style="animation-delay: 1s">0</span>
      <span class="num-particle text-9xl top-[82%] right-[38%]" style="animation-delay: 2.5s">2</span>
      <span class="num-particle text-8xl top-[42%] right-[3%]" style="animation-delay: 4s">6</span>

      <!-- Floating Feedback Badges & Security Vault Padlocks -->
      <span class="badge-particle text-7xl top-[16%] left-[18%]" style="animation-delay: 0.5s">🎯</span>
      <span class="badge-particle text-8xl top-[62%] right-[20%]" style="animation-delay: 2.8s">🔄</span>
      <span class="badge-particle text-6xl top-[38%] right-[6%]" style="animation-delay: 4.2s">🔐</span>
      <span class="badge-particle text-7xl top-[75%] left-[8%]" style="animation-delay: 1.8s">❌</span>
      <span class="badge-particle text-6xl top-[28%] left-[45%]" style="animation-delay: 3.2s">🔑</span>
    </div>

    <div class="relative z-10 min-h-screen text-white p-4 md:p-10 flex flex-col items-center justify-start select-none font-sans dir-rtl">
      
      <!-- Top Navigation Header -->
      <div class="w-full max-w-4xl flex items-center justify-between mb-8 border-b border-white/10 pb-4 backdrop-blur-md bg-white/5 px-6 py-3 rounded-2xl">
        <button (click)="goBack()" class="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white px-5 py-2.5 rounded-2xl transition-all font-bold text-sm cursor-pointer shadow-lg">
          <lucide-icon [img]="ArrowRight" class="w-4 h-4"></lucide-icon>
          العودة لمعرض الألعاب
        </button>

        <div class="flex items-center gap-3">
          <div class="bg-amber-500/20 border border-amber-500/40 text-amber-300 px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-2 shadow-lg">
            <lucide-icon [img]="Sparkles" class="w-4 h-4 text-emerald-400"></lucide-icon>
            تخمين رقم الخصم 🔢 (3، 4، 5 أرقام)
          </div>
        </div>
      </div>

      <!-- MAIN CONTAINER -->
      <div class="w-full max-w-3xl">

        <!-- 1. SETUP STAGE -->
        <div *ngIf="gameState() === 'setup'" class="bg-amber-950/30 backdrop-blur-2xl border border-amber-500/30 rounded-[2.5rem] p-6 md:p-10 shadow-[0_0_60px_rgba(245,158,11,0.2)] space-y-8 animate-in zoom-in-95 duration-300">
          <div class="text-center space-y-3">
            <h1 class="text-3xl md:text-5xl font-black bg-gradient-to-l from-white via-amber-200 to-amber-400 bg-clip-text text-transparent">
              تخمين رقم الخصم 🔢
            </h1>
            <p class="text-slate-400 text-xs md:text-sm max-w-lg mx-auto leading-relaxed">
              اختر طول الرقم السري (3، 4، أو 5 أرقام)، حدد رمزك السري، وحاول تخمين رقم الخصم بناءً على ردود الفعل: <br>
              <span class="text-emerald-400 font-bold">🎯 صح مكانه صح</span> | 
              <span class="text-amber-400 font-bold">🔄 صح مكانه غلط</span> | 
              <span class="text-rose-400 font-bold">❌ خاطئ تماماً</span>
            </p>
          </div>

          <!-- Standardized 3 Play Modes Selection -->
          <div class="space-y-3">
            <label class="text-xs font-bold text-slate-400 uppercase tracking-widest block text-right">اختر نمط اللعب (3 أنماط قياسية)</label>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              
              <!-- Mode 1: Local Play -->
              <button (click)="selectMode('local')"
                      class="p-5 rounded-2xl border text-right transition-all flex flex-col justify-between space-y-3 cursor-pointer"
                      [ngClass]="selectedMode === 'local' ? 'bg-amber-600/20 border-amber-500 text-white shadow-lg shadow-amber-600/20' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'">
                <div class="flex justify-between items-center">
                  <span class="text-2xl">📱</span>
                  <span *ngIf="selectedMode === 'local'" class="text-[10px] font-black bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full">مُحدد</span>
                </div>
                <div>
                  <h3 class="font-black text-sm text-white">1. اللعب محلياً</h3>
                  <p class="text-[11px] text-slate-400 mt-1">فردي ضد الكمبيوتر 🤖 أو Pass & Play جماعي</p>
                </div>
              </button>

              <!-- Mode 2: Private Room P2P -->
              <button (click)="selectMode('p2p')"
                      class="p-5 rounded-2xl border text-right transition-all flex flex-col justify-between space-y-3 cursor-pointer"
                      [ngClass]="selectedMode === 'p2p' ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-600/20' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'">
                <div class="flex justify-between items-center">
                  <span class="text-2xl">🔑</span>
                  <span *ngIf="selectedMode === 'p2p'" class="text-[10px] font-black bg-indigo-500 text-white px-2 py-0.5 rounded-full">مُحدد</span>
                </div>
                <div>
                  <h3 class="font-black text-sm text-white">2. إنشاء غرفة (P2P)</h3>
                  <p class="text-[11px] text-slate-400 mt-1">غرفة خاصة مع أصدقائك عبر كود الدعوة</p>
                </div>
              </button>

              <!-- Mode 3: Online Matchmaking Pro -->
              <button (click)="selectMode('online_pro')"
                      class="p-5 rounded-2xl border text-right transition-all flex flex-col justify-between space-y-3 relative overflow-hidden cursor-pointer"
                      [ngClass]="selectedMode === 'online_pro' ? 'bg-purple-600/20 border-purple-500 text-white shadow-lg shadow-purple-600/20' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'">
                <div class="flex justify-between items-center">
                  <span class="text-2xl">🌐</span>
                  <span class="text-[10px] font-black bg-purple-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                    <lucide-icon [img]="Lock" class="w-3 h-3"></lucide-icon> Pro
                  </span>
                </div>
                <div>
                  <h3 class="font-black text-sm text-white">3. لعب أونلاين Pro</h3>
                  <p class="text-[11px] text-slate-400 mt-1">مطابقة أونلاين للمشتركين Pro</p>
                </div>
              </button>
            </div>
          </div>

          <!-- P2P Room Configuration Details -->
          <div *ngIf="selectedMode === 'p2p'" class="p-5 bg-indigo-950/40 border border-indigo-500/30 rounded-3xl space-y-4">
            <div class="flex justify-between items-center">
              <h4 class="font-bold text-xs text-indigo-300">تفاصيل الغرفة الخاصة (P2P):</h4>
              <span class="text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-xl">كود الغرفة: {{ p2pRoomCode() }}</span>
            </div>
            <p class="text-xs text-slate-300">شارك هذا الكود مع أصدقائك لينضموا إليك في التحدي مباشرة!</p>
            <div class="flex gap-2">
              <input type="text" readonly [value]="'https://super-app.com/arcade/number-guesser?room=' + p2pRoomCode()" class="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-slate-300" />
              <button (click)="copyRoomLink()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all">
                {{ copiedLink() ? '✓ تم النسخ' : 'نسخ الرابط' }}
              </button>
            </div>
          </div>

          <!-- Code Length Configuration (3, 4, 5 Digits) -->
          <div class="space-y-4 bg-black/30 p-6 rounded-3xl border border-white/5">
            <label class="text-xs font-bold text-slate-400 uppercase tracking-widest block text-right">🔢 اختر طول الرقم السري للخصم</label>
            <div class="grid grid-cols-3 gap-3">
              <button *ngFor="let digits of [3, 4, 5]" 
                      (click)="codeLength = digits"
                      class="py-4 rounded-2xl border text-center transition-all font-black cursor-pointer"
                      [ngClass]="codeLength === digits ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/30 text-lg' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 text-base'">
                {{ digits }} أرقام {{ digits === 4 ? '⭐ (قياسي)' : '' }}
              </button>
            </div>
          </div>

          <!-- Local Mode Type Selection -->
          <div *ngIf="selectedMode === 'local'" class="space-y-3">
            <label class="text-xs font-bold text-slate-400 uppercase tracking-widest block text-right">نوع التحدي المحلي</label>
            <div class="flex items-center gap-3">
              <button (click)="isVsAi = true" [ngClass]="isVsAi ? 'bg-amber-600 text-slate-950 font-black shadow-md' : 'bg-white/5 text-slate-400 font-bold'" class="flex-1 py-3 rounded-2xl text-xs transition-all cursor-pointer">
                فردي ضد الذكاء الاصطناعي 🤖
              </button>
              <button (click)="isVsAi = false" [ngClass]="!isVsAi ? 'bg-amber-600 text-slate-950 font-black shadow-md' : 'bg-white/5 text-slate-400 font-bold'" class="flex-1 py-3 rounded-2xl text-xs transition-all cursor-pointer">
                لاعبين متعددين (Pass & Play) 👥
              </button>
            </div>
          </div>

          <!-- Multiplayer Players List Setup -->
          <div *ngIf="selectedMode === 'local' && !isVsAi" class="space-y-4 bg-black/30 p-6 rounded-3xl border border-white/5">
            <div class="flex justify-between items-center">
              <label class="text-xs font-bold text-slate-400 uppercase tracking-widest">أسماء المتنافسين (2 إلى 6 لاعبين)</label>
              <button (click)="addPlayer()" [disabled]="playerList.length >= 6" class="text-xs font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20 disabled:opacity-40">
                + إضافة لاعب
              </button>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div *ngFor="let p of playerList; let i = index; trackBy: trackByIndex" class="flex items-center gap-2">
                <input type="text" [(ngModel)]="playerList[i]" placeholder="اسم اللاعب..." class="w-full h-11 bg-white/5 border border-white/10 rounded-2xl px-4 text-xs text-white text-right focus:outline-none focus:border-amber-500 font-bold" />
                <button *ngIf="playerList.length > 2" (click)="removePlayer(i)" class="text-rose-400 hover:bg-rose-500/10 p-2 rounded-xl">✕</button>
              </div>
            </div>
          </div>

          <!-- Start Game Button -->
          <button (click)="proceedToSecretSetup()" class="w-full h-14 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-2xl font-black text-base shadow-xl shadow-amber-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer">
            <lucide-icon [img]="Zap" class="w-5 h-5"></lucide-icon>
            <span>الانتقال لمرحلة تحديد الرقم السري ({{ codeLength }} أرقام) 🔐</span>
          </button>
        </div>

        <!-- 2. SECRET CODE SETUP STAGE -->
        <div *ngIf="gameState() === 'secret_setup'" class="bg-slate-900 border border-white/10 rounded-[2.5rem] p-6 md:p-10 shadow-2xl space-y-8 animate-in fade-in duration-300">
          <div class="text-center space-y-2">
            <div class="size-16 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-3xl flex items-center justify-center mx-auto mb-3">
              <lucide-icon [img]="Key" class="w-8 h-8"></lucide-icon>
            </div>
            <h2 class="text-2xl md:text-3xl font-black text-white">تحديد الرمز السري 🔐</h2>
            <p class="text-slate-400 text-xs md:text-sm">
              دور اللاعب: <span class="text-amber-400 font-bold">{{ playerList[currentSetupIndex] }}</span> <br>
              أدخل رقمك السري المكون من <span class="text-amber-400 font-bold font-mono">{{ codeLength }}</span> أرقام واحرص ألا يراه خصمك!
            </p>
          </div>

          <div class="bg-black/40 p-6 md:p-8 rounded-3xl border border-white/5 space-y-6 max-w-md mx-auto">
            <div class="space-y-2 text-right">
              <label class="text-xs font-bold text-slate-400 block">الرمز السري الخاص بك:</label>
              <div class="relative">
                <input 
                  [type]="showSecretInput ? 'text' : 'password'" 
                  [(ngModel)]="tempSecretCode"
                  [attr.maxlength]="codeLength"
                  (keyup.enter)="confirmPlayerSecret()"
                  placeholder="أدخل {{ codeLength }} أرقام..." 
                  class="w-full h-14 bg-white/5 border-2 border-white/10 rounded-2xl px-5 text-center text-2xl font-mono text-amber-300 font-black tracking-widest focus:outline-none focus:border-amber-500"
                />
                <button (click)="showSecretInput = !showSecretInput" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-2">
                  <lucide-icon [img]="showSecretInput ? EyeOff : Eye" class="w-5 h-5"></lucide-icon>
                </button>
              </div>
              <p *ngIf="secretSetupError" class="text-xs text-rose-400 font-bold text-center mt-2">
                ⚠️ {{ secretSetupError }}
              </p>
            </div>

            <button (click)="confirmPlayerSecret()" class="w-full h-12 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-2xl font-black text-sm transition-all shadow-lg shadow-amber-500/20 cursor-pointer">
              تأكيد الرمز السري والحفظ 🔒
            </button>
          </div>
        </div>

        <!-- 3. MAIN PLAYING & GUESSING STAGE -->
        <div *ngIf="gameState() === 'playing'" class="bg-slate-900 border border-white/10 rounded-[2.5rem] p-6 md:p-10 shadow-2xl space-y-8 animate-in fade-in duration-300">
          
          <!-- Turn Banner & Scoreboard -->
          <div class="flex flex-col sm:flex-row items-center justify-between gap-4 bg-black/40 p-6 rounded-3xl border border-white/5">
            <div>
              <span class="text-xs text-slate-400 font-bold block mb-1">دور التخمين الآن:</span>
              <h2 class="text-2xl font-black text-amber-400 flex items-center gap-2">
                <span>👤 {{ currentTurnPlayer }}</span>
              </h2>
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <div *ngIf="secretsMap[currentTurnPlayer]" class="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-4 py-2 rounded-2xl">
                <span class="text-xs text-slate-400 font-bold">🔐 رقمك السري:</span>
                <span class="font-mono text-base font-black text-amber-300 tracking-widest">{{ secretsMap[currentTurnPlayer] }}</span>
              </div>
              <div class="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-2xl border border-white/5">
                <span class="text-xs text-slate-400 font-bold">طول الكود:</span>
                <span class="font-mono text-base font-black text-amber-400">
                  {{ codeLength }} أرقام
                </span>
              </div>
            </div>
          </div>

          <!-- Main Input Section for Guessing Opponent's Code -->
          <div class="bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/40 border-2 border-amber-500/30 p-6 md:p-8 rounded-3xl space-y-4 shadow-xl">
            <div class="text-center space-y-1">
              <span class="text-xs font-black text-amber-400 uppercase tracking-widest">🎯 الخانة الرئيسية لتخمين رقم الخصم</span>
              <p class="text-xs text-slate-400">اكتب الرقم النهائي المكون من {{ codeLength }} أرقام واضغط إرسال للحصول على النتيجة</p>
            </div>

            <div class="relative max-w-md mx-auto">
              <input 
                type="text" 
                [(ngModel)]="currentGuessInput" 
                [attr.maxlength]="codeLength"
                [disabled]="isTurnSwitching()"
                (keyup.enter)="!isTurnSwitching() && submitGuess()"
                placeholder="أدخل تخمينك (مثال: {{ sampleGuessPlaceholder() }})..." 
                autofocus
                class="w-full h-16 bg-slate-950 border-2 border-amber-500/50 rounded-2xl px-6 text-center text-2xl font-mono text-white font-black tracking-widest focus:outline-none focus:border-amber-400 shadow-inner disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button (click)="submitGuess()" 
                      [disabled]="isTurnSwitching()"
                      class="absolute left-2 top-1/2 -translate-y-1/2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black h-12 px-6 rounded-xl text-sm transition-all shadow cursor-pointer">
                {{ isTurnSwitching() ? ('⏳ ' + countdownSeconds() + ' ث') : 'تخمين ↵' }}
              </button>
            </div>
            
            <p *ngIf="guessError" class="text-xs text-rose-400 font-bold text-center">
              ⚠️ {{ guessError }}
            </p>
          </div>

          <!-- Recent Feedback Card (Clean Dynamic Contextual Verbal Feedback) -->
          <div *ngIf="getCurrentPlayerLastFeedback() as fb" 
               class="p-6 rounded-3xl text-center space-y-4 animate-in zoom-in-95 shadow-2xl transition-all border"
               [ngClass]="{
                 'bg-rose-950/30 border-rose-500/40 shadow-rose-500/10': fb.bulls === 0 && fb.cows === 0,
                 'bg-emerald-950/30 border-emerald-500/40 shadow-emerald-500/10': fb.bulls > 0 && fb.cows === 0,
                 'bg-amber-950/30 border-amber-500/40 shadow-amber-500/10': fb.bulls === 0 && fb.cows > 0,
                 'bg-indigo-950/30 border-indigo-500/40 shadow-indigo-500/10': fb.bulls > 0 && fb.cows > 0
               }">
            
            <div class="flex items-center justify-between border-b border-white/10 pb-3">
              <span class="text-xs font-bold text-slate-400">نتيجة تخمينك الأخير:</span>
              <span class="font-mono text-xl font-black text-amber-300 bg-black/40 px-4 py-1 rounded-xl border border-white/10 tracking-widest">{{ fb.guess }}</span>
            </div>

            <!-- Main Dynamic Natural Language Feedback Sentence -->
            <div class="p-5 rounded-2xl border text-sm md:text-base font-black leading-relaxed shadow-lg"
                 [ngClass]="{
                   'bg-rose-500/10 border-rose-500/30 text-rose-300': fb.bulls === 0 && fb.cows === 0,
                   'bg-emerald-500/10 border-emerald-500/30 text-emerald-300': fb.bulls > 0 && fb.cows === 0,
                   'bg-amber-500/10 border-amber-500/30 text-amber-300': fb.bulls === 0 && fb.cows > 0,
                   'bg-indigo-500/10 border-indigo-500/30 text-indigo-200': fb.bulls > 0 && fb.cows > 0
                 }">
              {{ fb.message }}
            </div>

            <!-- 5-Second Turn Switch Countdown Alert (Pass & Play Only) -->
            <div *ngIf="isTurnSwitching() && !isVsAi" class="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 px-4 py-3 rounded-2xl text-xs text-amber-300 font-bold animate-pulse">
              <div class="flex items-center gap-2">
                <span class="text-base">⏳</span>
                <span>انتقال الدور إلى (<span class="text-white font-bold">{{ getNextPlayerName() }}</span>) خلال <span class="font-mono text-sm font-black text-amber-400">{{ countdownSeconds() }}</span> ثوانٍ...</span>
              </div>
              <button (click)="skipCountdown()" class="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black transition-all cursor-pointer shadow">
                تخطي وبدء الدور الآن ⚡
              </button>
            </div>
          </div>

          <!-- AI Thinking Status -->
          <div *ngIf="isAiThinking" class="p-4 bg-purple-950/40 border border-purple-500/30 rounded-2xl text-center flex items-center justify-center gap-3 animate-pulse text-purple-300 text-xs font-bold">
            <span class="animate-spin text-sm">🤖</span>
            <span>الذكاء الاصطناعي يقوم بالتخمين سراً...</span>
          </div>

          <!-- History Table of Previous Guesses (Filtered per current player only) -->
          <div class="space-y-3">
            <div class="flex justify-between items-center">
              <h3 class="text-sm font-bold text-slate-300">سجل تخميناتك السابقة ({{ getCurrentPlayerHistory().length }}):</h3>
              <span class="text-xs text-slate-500">خاص بك فقط • مرتب من الأحدث للأقدم</span>
            </div>

            <div *ngIf="getCurrentPlayerHistory().length === 0" class="bg-black/20 border border-white/5 rounded-2xl p-8 text-center text-slate-500 text-xs">
              لم تقم بأي تخمينات بعد. أدخل تخمينك في الخانة الرئيسية أعلاه! 🚀
            </div>

            <div *ngIf="getCurrentPlayerHistory().length > 0" class="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80">
              <table class="w-full text-right text-xs">
                <thead class="bg-white/5 text-slate-400 font-bold border-b border-white/10">
                  <tr>
                    <th class="p-3 text-center">#</th>
                    <th class="p-3 text-center">الرقم المترشح</th>
                    <th class="p-3 text-right">التقييم والملاحظة</th>
                    <th class="p-3 text-center">🎯 صح مكانه صح</th>
                    <th class="p-3 text-center">🔄 صح مكانه غلط</th>
                    <th class="p-3 text-center">❌ أرقام خاطئة</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-white/5 font-mono">
                  <tr *ngFor="let h of getCurrentPlayerHistory(); let i = index" class="hover:bg-white/5 transition-colors">
                    <td class="p-3 text-center font-sans font-bold text-amber-400">{{ getCurrentPlayerHistory().length - i }}</td>
                    <td class="p-3 text-center font-black text-base text-white tracking-widest">{{ h.guess }}</td>
                    <td class="p-3 text-right font-sans font-bold text-[11px]"
                        [ngClass]="{
                          'text-rose-400': h.bulls === 0 && h.cows === 0,
                          'text-emerald-400': h.bulls > 0 && h.cows === 0,
                          'text-amber-400': h.bulls === 0 && h.cows > 0,
                          'text-indigo-300': h.bulls > 0 && h.cows > 0
                        }">
                      {{ h.message }}
                    </td>
                    <td class="p-3 text-center font-bold" [ngClass]="h.bulls > 0 ? 'text-emerald-400' : 'text-slate-600'">{{ h.bulls }}</td>
                    <td class="p-3 text-center font-bold" [ngClass]="h.cows > 0 ? 'text-amber-400' : 'text-slate-600'">{{ h.cows }}</td>
                    <td class="p-3 text-center font-bold" [ngClass]="h.misses > 0 ? 'text-rose-400' : 'text-slate-600'">{{ h.misses }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- 4. GAME OVER / WINNER STAGE -->
        <div *ngIf="gameState() === 'gameover'" class="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl space-y-8 text-center animate-in zoom-in-95 duration-300">
          <div class="size-24 bg-amber-500/10 border border-amber-500/40 rounded-3xl flex items-center justify-center mx-auto text-amber-400 shadow-xl shadow-amber-500/10">
            <lucide-icon [img]="Trophy" class="w-12 h-12"></lucide-icon>
          </div>

          <div class="space-y-3">
            <span class="text-xs font-bold text-amber-400 uppercase tracking-widest block">🎉 انتهت الجولة بنجاح!</span>
            <h1 class="text-3xl md:text-5xl font-black text-white">
              الفائز: <span class="text-amber-400">{{ winnerName }}</span>! 🏆
            </h1>
            <p class="text-slate-300 text-sm max-w-md mx-auto leading-relaxed bg-amber-950/30 p-4 rounded-2xl border border-amber-500/20">
              تم تخمين الرقم السري للخصم <span class="font-mono font-black text-amber-300 text-lg">({{ winningCode }})</span> بنجاح بعد <span class="font-black text-white">{{ totalAttempts }}</span> محاولة!
            </p>
          </div>

          <!-- Winner Actions -->
          <div class="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto pt-4">
            <button (click)="restartGame()" class="flex-1 h-12 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-2xl text-sm transition-all shadow-lg shadow-amber-500/20 cursor-pointer">
              لعب جولة جديدة 🔄
            </button>
            <button (click)="resetToSetup()" class="flex-1 h-12 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl text-sm transition-all border border-white/10 cursor-pointer">
              تغيير الإعدادات ⚙️
            </button>
          </div>
        </div>

      </div>
    </div>
  `
})
export class NumberGuesserComponent implements OnInit, OnDestroy {

  // Icons
  Trophy = Trophy;
  Clock = Clock;
  Zap = Zap;
  RotateCcw = RotateCcw;
  ArrowRight = ArrowRight;
  Sparkles = Sparkles;
  Lock = Lock;
  Key = Key;
  Eye = Eye;
  EyeOff = EyeOff;
  Hash = Hash;
  AlertTriangle = AlertTriangle;
  ShieldCheck = ShieldCheck;
  Copy = Copy;
  Check = Check;

  // Signals for reactivity
  gameState = signal<'setup' | 'secret_setup' | 'playing' | 'gameover'>('setup');
  p2pRoomCode = signal<string>('');
  copiedLink = signal<boolean>(false);
  isTurnSwitching = signal<boolean>(false);
  countdownSeconds = signal<number>(10);
  private countdownTimer: any = null;

  // Setup properties
  selectedMode: 'local' | 'p2p' | 'online_pro' = 'local';
  codeLength: number = 4; // 3, 4, or 5
  isVsAi: boolean = true;
  playerList: string[] = ['اللاعب 1', 'الكمبيوتر (AI)'];

  // Secret setup phase
  currentSetupIndex: number = 0;
  tempSecretCode: string = '';
  showSecretInput: boolean = true;
  secretSetupError: string = '';
  secretsMap: { [player: string]: string } = {};

  // Playing phase
  currentTurnPlayer: string = '';
  currentGuessInput: string = '';
  guessError: string = '';
  lastFeedback: GuessRecord | null = null;
  guessHistory: GuessRecord[] = [];

  // Victory
  winnerName: string = '';
  winningCode: string = '';
  totalAttempts: number = 0;

  constructor(private router: Router) {}

  ngOnInit() {
    this.p2pRoomCode.set('NUM-' + Math.floor(1000 + Math.random() * 9000));
    const savedName = localStorage.getItem('arcade_player_name');
    if (savedName) {
      this.playerList[0] = savedName;
    }
  }

  ngOnDestroy() {
    this.clearCountdown();
  }

  trackByIndex(index: number): number {
    return index;
  }

  goBack() {
    this.router.navigate(['/arcade']);
  }

  selectMode(mode: 'local' | 'p2p' | 'online_pro') {
    this.selectedMode = mode;
    if (mode === 'online_pro') {
      alert('🔒 هذا النمط مخصص حصرياً للمشتركين Pro! يمكنك اللعب محلياً أو عبر إنشاء غرفة P2P مجاناً.');
      return;
    }
    if (mode === 'local' && this.isVsAi) {
      this.playerList = [this.playerList[0] || 'اللاعب 1', 'الكمبيوتر (AI)'];
    }
  }

  addPlayer() {
    if (this.playerList.length < 6) {
      this.playerList.push(`اللاعب ${this.playerList.length + 1}`);
    }
  }

  removePlayer(index: number) {
    if (this.playerList.length > 2) {
      this.playerList.splice(index, 1);
    }
  }

  copyRoomLink() {
    const link = `https://super-app.com/arcade/number-guesser?room=${this.p2pRoomCode()}`;
    navigator.clipboard.writeText(link);
    this.copiedLink.set(true);
    setTimeout(() => this.copiedLink.set(false), 2500);
  }

  sampleGuessPlaceholder(): string {
    if (this.codeLength === 3) return '123';
    if (this.codeLength === 5) return '12345';
    return '1234';
  }

  // --- Step 1 -> Step 2: Secret Setup ---
  proceedToSecretSetup() {
    if (this.selectedMode === 'local' && this.isVsAi) {
      this.playerList = [this.playerList[0] || 'اللاعب 1', 'الكمبيوتر (AI)'];
      // Generate AI Secret Code automatically
      this.secretsMap['الكمبيوتر (AI)'] = this.generateRandomCode(this.codeLength);
    }

    this.currentSetupIndex = 0;
    this.tempSecretCode = '';
    this.showSecretInput = true;
    this.secretSetupError = '';
    this.gameState.set('secret_setup');
  }

  confirmPlayerSecret() {
    const pName = this.playerList[this.currentSetupIndex];
    const code = this.tempSecretCode.trim();

    // Validate Code
    if (!this.isValidCode(code)) {
      return;
    }

    this.secretsMap[pName] = code;
    this.tempSecretCode = '';
    this.secretSetupError = '';

    // Move to next player secret setup if any
    this.currentSetupIndex++;

    // Skip AI if any
    if (this.currentSetupIndex < this.playerList.length && this.playerList[this.currentSetupIndex] === 'الكمبيوتر (AI)') {
      this.currentSetupIndex++;
    }

    // Check if all players confirmed secrets
    if (this.currentSetupIndex >= this.playerList.length) {
      this.startMatch();
    }
  }

  isValidCode(code: string): boolean {
    if (code.length !== this.codeLength) {
      this.secretSetupError = `يجب أن يتكون الكود من ${this.codeLength} أرقام تماماً.`;
      return false;
    }
    if (!/^\d+$/.test(code)) {
      this.secretSetupError = 'يجب إدخال أرقام فقط (0-9).';
      return false;
    }
    return true;
  }

  generateRandomCode(length: number): string {
    const digits = ['0','1','2','3','4','5','6','7','8','9'];
    let res = '';
    for (let i = 0; i < length; i++) {
      res += digits[Math.floor(Math.random() * 10)];
    }
    return res;
  }

  isAiThinking: boolean = false;

  getCurrentPlayerHistory(): GuessRecord[] {
    return this.guessHistory.filter(h => h.player === this.currentTurnPlayer);
  }

  getCurrentPlayerLastFeedback(): GuessRecord | null {
    if (this.lastFeedback && this.lastFeedback.player === this.currentTurnPlayer) {
      return this.lastFeedback;
    }
    return this.guessHistory.find(h => h.player === this.currentTurnPlayer) || null;
  }

  // --- Step 3: Start Playing ---
  startMatch() {
    this.clearCountdown();
    this.isTurnSwitching.set(false);
    this.isAiThinking = false;
    this.guessHistory = [];
    this.lastFeedback = null;
    this.currentGuessInput = '';
    this.guessError = '';
    this.currentTurnPlayer = this.playerList[0];
    this.gameState.set('playing');
  }

  // --- Submit candidate guess from Main Input Box ---
  submitGuess() {
    if (this.isTurnSwitching() || this.isAiThinking) return;

    const guess = this.currentGuessInput.trim();

    if (guess.length !== this.codeLength || !/^\d+$/.test(guess)) {
      this.guessError = `الرجاء إدخال رقم سري مكون من ${this.codeLength} أرقام.`;
      return;
    }

    this.guessError = '';

    // Determine target secret code (opponent's code)
    const opponentName = this.getOpponentName(this.currentTurnPlayer);
    const targetCode = this.secretsMap[opponentName];

    // Compute Bulls & Cows & Misses
    const feedback = this.evaluateGuess(guess, targetCode);
    const feedbackMessage = this.getFeedbackMessage(feedback.bulls, feedback.cows, feedback.misses, this.codeLength);

    const record: GuessRecord = {
      player: this.currentTurnPlayer,
      guess: guess,
      bulls: feedback.bulls,
      cows: feedback.cows,
      misses: feedback.misses,
      message: feedbackMessage,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };

    this.lastFeedback = record;
    this.guessHistory.unshift(record);
    this.currentGuessInput = '';

    // Check Win Condition (Bulls === codeLength)
    if (feedback.bulls === this.codeLength) {
      this.clearCountdown();
      this.triggerWin(this.currentTurnPlayer, targetCode);
      return;
    }

    // If playing vs AI, let AI make a secret turn automatically
    if (this.selectedMode === 'local' && this.isVsAi) {
      this.isAiThinking = true;
      setTimeout(() => {
        this.handleAiTurn();
      }, 700);
      return;
    }

    // If Pass & Play multiplayer, start turn switch countdown
    this.startTurnCountdown();
  }

  evaluateGuess(guess: string, secret: string): { bulls: number; cows: number; misses: number } {
    let bulls = 0;
    let cows = 0;

    let secretArray = secret.split('');
    let guessArray = guess.split('');

    // First pass: Find Bulls (Exact position matches)
    for (let i = 0; i < this.codeLength; i++) {
      if (guessArray[i] === secretArray[i]) {
        bulls++;
        secretArray[i] = '#'; // Mark used
        guessArray[i] = '*';
      }
    }

    // Second pass: Find Cows (Wrong position matches)
    for (let i = 0; i < this.codeLength; i++) {
      if (guessArray[i] !== '*') {
        const foundIdx = secretArray.indexOf(guessArray[i]);
        if (foundIdx !== -1) {
          cows++;
          secretArray[foundIdx] = '#';
        }
      }
    }

    const misses = this.codeLength - (bulls + cows);
    return { bulls, cows, misses };
  }

  getOpponentName(currentPlayer: string): string {
    const idx = this.playerList.indexOf(currentPlayer);
    const oppIdx = (idx + 1) % this.playerList.length;
    return this.playerList[oppIdx];
  }

  getNextPlayerName(): string {
    return this.getOpponentName(this.currentTurnPlayer);
  }

  startTurnCountdown() {
    this.clearCountdown();
    this.isTurnSwitching.set(true);
    this.countdownSeconds.set(10);

    this.countdownTimer = setInterval(() => {
      const remaining = this.countdownSeconds() - 1;
      if (remaining <= 0) {
        this.clearCountdown();
        this.isTurnSwitching.set(false);
        this.switchTurn();
      } else {
        this.countdownSeconds.set(remaining);
      }
    }, 1000);
  }

  skipCountdown() {
    this.clearCountdown();
    this.isTurnSwitching.set(false);
    this.switchTurn();
  }

  clearCountdown() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  switchTurn() {
    this.clearCountdown();
    this.isTurnSwitching.set(false);
    const idx = this.playerList.indexOf(this.currentTurnPlayer);
    const nextIdx = (idx + 1) % this.playerList.length;
    this.currentTurnPlayer = this.playerList[nextIdx];
  }

  handleAiTurn() {
    const aiGuess = this.generateRandomCode(this.codeLength);
    const humanPlayer = this.playerList[0];
    const humanSecret = this.secretsMap[humanPlayer];

    const feedback = this.evaluateGuess(aiGuess, humanSecret);
    const feedbackMessage = this.getFeedbackMessage(feedback.bulls, feedback.cows, feedback.misses, this.codeLength);

    const record: GuessRecord = {
      player: 'الكمبيوتر (AI)',
      guess: aiGuess,
      bulls: feedback.bulls,
      cows: feedback.cows,
      misses: feedback.misses,
      message: feedbackMessage,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };

    this.guessHistory.unshift(record);
    this.isAiThinking = false;

    if (feedback.bulls === this.codeLength) {
      this.clearCountdown();
      this.triggerWin('الكمبيوتر (AI)', humanSecret);
      return;
    }
  }

  // --- Dynamic Arabic Feedback Generator ---
  getFeedbackMessage(bulls: number, cows: number, misses: number, codeLength: number): string {
    // 1. All Digits Correct -> Win
    if (bulls === codeLength) {
      return `🎉 مبروك! الرقم صحيح بالكامل وفي مكانه الصحيح! (${bulls} أرقام صحيحة)`;
    }

    // 2. Completely Wrong (No bulls, no cows)
    if (bulls === 0 && cows === 0) {
      return `❌ الرقم غلط تماماً! (جميع الأرقام الـ ${codeLength} خاطئة ولا يوجد أي رقم صحيح).`;
    }

    // 3. Only Digits in Correct Position (Bulls only)
    if (bulls > 0 && cows === 0) {
      const bullsText = this.formatBullsText(bulls);
      const missesText = misses > 0 ? ` (و ${this.formatMissesText(misses)})` : '';
      return `🎯 يوجد ${bullsText}${missesText}.`;
    }

    // 4. Only Digits in Wrong Position (Cows only)
    if (bulls === 0 && cows > 0) {
      const cowsText = this.formatCowsText(cows);
      const missesText = misses > 0 ? ` (و ${this.formatMissesText(misses)})` : '';
      return `🔄 يوجد ${cowsText}${missesText}.`;
    }

    // 5. Mixed: Some in correct position AND some in wrong position
    const bullsText = this.formatBullsText(bulls);
    const cowsText = this.formatCowsText(cows);
    const missesText = misses > 0 ? ` (و ${this.formatMissesText(misses)})` : '';
    return `🎯 يوجد ${bullsText}، و 🔄 ${cowsText}${missesText}.`;
  }

  formatBullsText(n: number): string {
    if (n === 1) return 'رقم واحد صح ومكانه صح';
    if (n === 2) return 'رقمان صح ومكانهما صح';
    if (n >= 3 && n <= 10) return `${n} أرقام صح ومكانها صح`;
    return `${n} رقم صح ومكانه صح`;
  }

  formatCowsText(n: number): string {
    if (n === 1) return 'رقم واحد صح ومكانه غلط';
    if (n === 2) return 'رقمان صح ومكانهما غلط';
    if (n >= 3 && n <= 10) return `${n} أرقام صح ومكانها غلط`;
    return `${n} رقم صح ومكانه غلط`;
  }

  formatMissesText(n: number): string {
    if (n === 1) return 'رقم واحد خاطئ';
    if (n === 2) return 'رقمان خاطئان';
    if (n >= 3 && n <= 10) return `${n} أرقام خاطئة`;
    return `${n} رقم خاطئ`;
  }

  triggerWin(winner: string, winningCode: string) {
    this.clearCountdown();
    this.isAiThinking = false;
    this.winnerName = winner;
    this.winningCode = winningCode;
    this.totalAttempts = this.guessHistory.filter(h => h.player === winner).length;
    this.gameState.set('gameover');
  }

  restartGame() {
    this.clearCountdown();
    this.isAiThinking = false;
    this.proceedToSecretSetup();
  }

  resetToSetup() {
    this.clearCountdown();
    this.isAiThinking = false;
    this.gameState.set('setup');
  }
}
