import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule, Trophy, Clock, Zap, RotateCcw, ArrowRight, ShieldAlert, Sparkles, Lock, Users, Globe, Smartphone, Copy, Check } from 'lucide-angular';
import { ArcadeService } from '../arcade.service';

interface PlayerScore {
  name: string;
  score: number;
  eliminated: boolean;
  rank?: number;
}

@Component({
  selector: 'app-word-chain-game',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="min-h-screen bg-slate-950 text-white p-4 md:p-12 flex flex-col items-center justify-start select-none font-sans dir-rtl">
      
      <!-- Top Navigation Header -->
      <div class="w-full max-w-4xl flex items-center justify-between mb-8 border-b border-white/10 pb-4">
        <button (click)="goBack()" class="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white px-5 py-2.5 rounded-2xl transition-all font-bold text-sm cursor-pointer">
          <lucide-icon [img]="ArrowRight" class="w-4 h-4"></lucide-icon>
          العودة لمعرض الألعاب
        </button>

        <div class="flex items-center gap-3">
          <div class="bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 px-4 py-1.5 rounded-2xl text-xs font-black flex items-center gap-2">
            <lucide-icon [img]="Sparkles" class="w-4 h-4"></lucide-icon>
            سلسلة الكلمات الذكية 🔗 (30 ثانية لكل كلمة)
          </div>
        </div>
      </div>

      <!-- MAIN CONTAINER -->
      <div class="w-full max-w-3xl">

        <!-- 1. SETUP STAGE -->
        <div *ngIf="gameState() === 'setup'" class="bg-slate-900 border border-white/10 rounded-[2.5rem] p-6 md:p-10 shadow-2xl space-y-8 animate-in zoom-in-95 duration-300">
          <div class="text-center space-y-3">
            <h1 class="text-3xl md:text-5xl font-black bg-gradient-to-l from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">سلسلة الكلمات الذكية 🔗</h1>
            <p class="text-slate-400 text-xs md:text-sm max-w-lg mx-auto leading-relaxed">
              اكتب كلمة تبدأ بالحرف الأخير للكلمة السابقة! ⚡ <br>
              <span class="text-amber-400 font-bold">تنبيه: إذا كتبت كلمة غلط أو غير متطابقة تخسر فوراً وتسقط من الجولة!</span>
            </p>
          </div>

          <!-- Standarized 3 Play Modes Selection -->
          <div class="space-y-3">
            <label class="text-xs font-bold text-slate-400 uppercase tracking-widest block text-right">اختيار نظام اللعب (3 أنماط قياسية)</label>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              
              <!-- Mode 1: Local Play -->
              <button (click)="selectMode('local')"
                      class="p-5 rounded-2xl border text-right transition-all flex flex-col justify-between space-y-3 cursor-pointer"
                      [ngClass]="selectedMode === 'local' ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-600/20' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'">
                <div class="flex justify-between items-center">
                  <span class="text-2xl">📱</span>
                  <span *ngIf="selectedMode === 'local'" class="text-[10px] font-black bg-indigo-500 text-white px-2 py-0.5 rounded-full">مُحدد</span>
                </div>
                <div>
                  <h3 class="font-black text-sm text-white">1. اللعب محلياً</h3>
                  <p class="text-[11px] text-slate-400 mt-1">فردي ضد الكمبيوتر أو محلي (حتى 6 لاعبين)</p>
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
                      [ngClass]="selectedMode === 'online_pro' ? 'bg-amber-500/20 border-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'">
                <div class="flex justify-between items-center">
                  <span class="text-2xl">🌐</span>
                  <span class="text-[10px] font-black bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <lucide-icon [img]="Lock" class="w-3 h-3"></lucide-icon> Pro
                  </span>
                </div>
                <div>
                  <h3 class="font-black text-sm text-white">3. لعب أونلاين Pro</h3>
                  <p class="text-[11px] text-slate-400 mt-1">مطابقة أونلاين ضد منافسين عشوائيين</p>
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
            <p class="text-xs text-slate-300">شارك هذا الكود مع أصدقائك لينضموا إليك في الجولة أونلاين مباشرة!</p>
            <div class="flex gap-2">
              <input type="text" readonly [value]="'https://super-app.com/arcade/word-chain?room=' + p2pRoomCode()" class="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-slate-300" />
              <button (click)="copyRoomLink()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all">
                {{ copiedLink() ? '✓ تم النسخ' : 'نسخ الرابط' }}
              </button>
            </div>
          </div>

          <!-- Options & 30s Timer Configuration -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 bg-black/30 p-6 rounded-3xl border border-white/5">
            <!-- Dynamic Time Selection (Default 30 Seconds) -->
            <div class="space-y-3 sm:col-span-2">
              <div class="flex justify-between items-center">
                <label class="text-xs font-bold text-slate-400 uppercase tracking-widest">⏱️ الوقت المحدد لكل كلمة</label>
                <span class="text-indigo-400 font-mono font-black text-base bg-indigo-500/10 px-3 py-1 rounded-xl border border-indigo-500/30">
                  {{ customTime }} ثانية
                </span>
              </div>
              
              <!-- Quick Time Preset Buttons -->
              <div class="flex flex-wrap gap-2 pt-1">
                <button *ngFor="let t of [10, 15, 30, 45, 60]" (click)="customTime = t"
                        class="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        [ngClass]="customTime === t ? 'bg-indigo-600 text-white shadow-md font-black' : 'bg-white/5 text-slate-400 hover:bg-white/10'">
                  {{ t }} ثانية {{ t === 30 ? '⭐ الافتراضي' : '' }}
                </button>
              </div>

              <input type="range" min="5" max="60" step="5" [(ngModel)]="customTime" class="w-full accent-indigo-500 bg-slate-800 rounded-lg cursor-pointer h-2 mt-2" />
            </div>

            <!-- Single vs Local Multiplayer setup for Mode 1 -->
            <div *ngIf="selectedMode === 'local'" class="space-y-3 sm:col-span-2">
              <label class="text-xs font-bold text-slate-400 uppercase tracking-widest block">نوع التحدي المحلي</label>
              <div class="flex items-center gap-3">
                <button (click)="isMultiplayer = false" [ngClass]="!isMultiplayer ? 'bg-indigo-600 text-white shadow-md' : 'bg-white/5 text-slate-400'" class="flex-1 py-3 rounded-2xl font-bold text-xs transition-all cursor-pointer">
                  فردي ضد الذكاء الاصطناعي 🤖
                </button>
                <button (click)="isMultiplayer = true" [ngClass]="isMultiplayer ? 'bg-indigo-600 text-white shadow-md' : 'bg-white/5 text-slate-400'" class="flex-1 py-3 rounded-2xl font-bold text-xs transition-all cursor-pointer">
                  مجموعة لاعبين (Pass & Play) 👥
                </button>
              </div>
            </div>
          </div>

          <!-- Multiplayer Names Setup -->
          <div *ngIf="isMultiplayer && selectedMode === 'local'" class="space-y-4 bg-black/30 p-6 rounded-3xl border border-white/5">
            <div class="flex justify-between items-center">
              <label class="text-xs font-bold text-slate-400 uppercase tracking-widest">أسماء اللاعبين (من 2 إلى 6 لاعبين)</label>
              <button (click)="addPlayer()" [disabled]="players.length >= 6" class="text-xs font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 px-3 py-1.5 rounded-xl border border-indigo-500/20 disabled:opacity-40">
                + إضافة لاعب
              </button>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div *ngFor="let p of players; let i = index" class="flex items-center gap-2">
                <input type="text" [(ngModel)]="players[i]" placeholder="اسم اللاعب..." class="w-full h-11 bg-white/5 border border-white/10 rounded-2xl px-4 text-xs text-white text-right focus:outline-none focus:border-indigo-500 font-bold" />
                <button *ngIf="players.length > 2" (click)="removePlayer(i)" class="text-red-400 hover:bg-red-500/10 p-2 rounded-xl">✕</button>
              </div>
            </div>
          </div>

          <button (click)="startGame()" class="w-full h-14 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-2xl font-black text-base shadow-xl shadow-indigo-600/30 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer">
            <lucide-icon [img]="Zap" class="w-5 h-5"></lucide-icon>
            <span>ابدأ التحدي بـ {{ customTime }} ثانية لكل كلمة 🔥</span>
          </button>
        </div>

        <!-- 2. PLAYING STAGE -->
        <div *ngIf="gameState() === 'playing'" class="bg-slate-900 border border-white/10 rounded-[2.5rem] p-6 md:p-10 shadow-2xl space-y-8 animate-in fade-in duration-300">
          
          <!-- Header Info & Timer -->
          <div class="flex flex-col sm:flex-row items-center justify-between gap-4 bg-black/40 p-6 rounded-3xl border border-white/5">
            <div>
              <span class="text-xs text-slate-400 font-bold block mb-1">دور اللاعب الحالي:</span>
              <h2 class="text-2xl font-black text-indigo-400 flex items-center gap-2">
                <span>👤 {{ currentTurnPlayer }}</span>
              </h2>
            </div>

            <!-- Timer Circle (30s Countdown) -->
            <div class="flex items-center gap-4">
              <div class="relative size-20 flex flex-col items-center justify-center rounded-full bg-slate-950 border-4 transition-all"
                   [ngClass]="timeLeft <= 5 ? 'border-red-500 animate-pulse bg-red-950/20' : 'border-indigo-500'">
                <span class="font-mono text-2xl font-black" [ngClass]="timeLeft <= 5 ? 'text-red-400' : 'text-white'">{{ timeLeft }}s</span>
                <span class="text-[9px] text-slate-400 font-bold">متبقي</span>
              </div>
            </div>
          </div>

          <!-- Last Word & Required Letter Banner -->
          <div class="bg-gradient-to-r from-indigo-950/50 via-slate-900 to-violet-950/50 border border-indigo-500/30 p-8 rounded-3xl text-center space-y-4 shadow-inner">
            <span class="text-xs font-black text-indigo-300 uppercase tracking-widest block">الكلمة الحالية المسجلة</span>
            <div class="text-3xl md:text-5xl font-black text-white font-mono tracking-wider">
              {{ lastWord ? lastWord : '(ابدأ بأي كلمة بالإنجليزية!)' }}
            </div>
            
            <div class="inline-flex items-center gap-2 px-6 py-2 bg-amber-500/20 border border-amber-400/40 rounded-full text-amber-200 text-sm font-bold shadow-md">
              <span>الحرف المطلوب للبدء:</span>
              <span class="text-2xl font-black text-amber-400 font-mono uppercase">{{ requiredLetter }}</span>
            </div>
          </div>

          <!-- Input Field & Submit -->
          <div class="space-y-3">
            <div class="relative">
              <input 
                type="text" 
                [(ngModel)]="currentInput" 
                (keyup.enter)="submitWord()"
                placeholder="اكتب كلمة بالإنجليزية تبدأ بالحرف '{{ requiredLetter }}'..." 
                autofocus
                class="w-full h-16 bg-white/5 border-2 border-white/10 rounded-2xl px-6 text-lg text-white font-mono text-right focus:outline-none focus:border-indigo-500 shadow-inner"
              />
              <button (click)="submitWord()" class="absolute left-3 top-1/2 -translate-y-1/2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-10 px-6 rounded-xl text-sm transition-all shadow cursor-pointer">
                إرسال ↵
              </button>
            </div>
            <p class="text-xs text-amber-400/90 text-center font-bold">
              ⚠️ إذا كتبت كلمة خطأ، أو لا تبدأ بحرف '{{ requiredLetter.toUpperCase() }}'، أو مكررة، ستخسر الجولة فوراً!
            </p>
          </div>

          <!-- Used Words History -->
          <div class="space-y-2">
            <span class="text-xs font-bold text-slate-400">الكلمات المقبولة في هذه الجلسة ({{ usedWords.length }}):</span>
            <div class="flex flex-wrap gap-2 max-h-36 overflow-y-auto custom-scrollbar p-3 bg-black/20 rounded-2xl border border-white/5">
              <span *ngFor="let w of usedWords" class="px-3 py-1 bg-white/5 border border-white/10 rounded-xl text-xs font-mono text-indigo-300 font-bold">
                {{ w }}
              </span>
            </div>
          </div>
        </div>

        <!-- 3. GAME OVER / RANKINGS STAGE -->
        <div *ngIf="gameState() === 'gameover'" class="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl space-y-8 text-center animate-in zoom-in-95 duration-300">
          <div class="size-20 bg-rose-500/10 border border-rose-500/30 rounded-3xl flex items-center justify-center mx-auto text-rose-400 shadow-lg">
            <lucide-icon [img]="Trophy" class="w-10 h-10"></lucide-icon>
          </div>

          <div class="space-y-2">
            <h1 class="text-3xl font-black text-white">انتهت اللعبة! ❌</h1>
            <p class="text-rose-400 font-bold text-base leading-relaxed bg-rose-950/30 p-4 rounded-2xl border border-rose-500/20 max-w-lg mx-auto">
              {{ gameOverReason }}
            </p>
          </div>

          <!-- Rankings Board -->
          <div class="space-y-3 max-w-md mx-auto">
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-widest text-right">نتائج التحدي والكلمات المقبولة</h3>
            <div class="space-y-2">
              <div *ngFor="let p of rankedPlayers; let i = index" class="flex items-center justify-between bg-black/40 border border-white/5 p-4 rounded-2xl">
                <div class="flex items-center gap-3">
                  <span class="size-8 rounded-xl flex items-center justify-center font-black text-sm" [ngClass]="i === 0 ? 'bg-amber-500 text-slate-950' : 'bg-white/10 text-slate-400'">
                    #{{ i + 1 }}
                  </span>
                  <span class="font-bold text-white text-sm">{{ p.name }}</span>
                </div>
                <span class="font-mono font-black text-indigo-400 text-sm">{{ p.score }} كلمة</span>
              </div>
            </div>
          </div>

          <div class="flex gap-4 max-w-md mx-auto pt-4">
            <button (click)="gameState.set('setup')" class="flex-1 h-14 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer">
              <lucide-icon [img]="RotateCcw" class="w-4 h-4"></lucide-icon>
              إعادة اللعب
            </button>
            <button (click)="goBack()" class="flex-1 h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-indigo-600/30 cursor-pointer">
              العودة للمعرض
            </button>
          </div>
        </div>

      </div>

      <!-- PRO SUBSCRIPTION PROMPT MODAL -->
      <div *ngIf="showProModal()" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 dir-rtl">
        <div class="bg-slate-900 border border-amber-500/40 rounded-3xl p-8 max-w-md w-full space-y-6 text-center shadow-2xl">
          <div class="w-16 h-16 bg-amber-500/20 border border-amber-500/40 rounded-2xl flex items-center justify-center mx-auto text-amber-400">
            <lucide-icon [img]="Lock" class="w-8 h-8"></lucide-icon>
          </div>

          <div class="space-y-2">
            <h3 class="text-xl font-black text-white">وضع اللعب أونلاين (Pro) 🌟</h3>
            <p class="text-xs text-slate-300 leading-relaxed">
              وضع المطابقة العامة أونلاين ضد لاعبين عشوائيين مخصص حصرياً للمشاركين في الباقة الاحترافية Super Pro.
            </p>
          </div>

          <div class="p-4 bg-black/40 rounded-2xl border border-white/5 text-right space-y-2 text-xs">
            <div class="flex items-center gap-2 text-amber-400 font-bold">
              <span>✓ مطابقة فورية أونلاين عبر الخادم</span>
            </div>
            <div class="flex items-center gap-2 text-amber-400 font-bold">
              <span>✓ حفظ الإحصائيات في قائمة المتصدرين العالمية</span>
            </div>
          </div>

          <div class="flex gap-3">
            <button (click)="showProModal.set(false)" class="flex-1 py-3 bg-white/10 hover:bg-white/20 text-slate-300 rounded-2xl font-bold text-xs">
              إلغاء
            </button>
            <button (click)="showProModal.set(false)" class="flex-1 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-2xl text-xs shadow-lg shadow-amber-500/20">
              ترقية الحساب إلى Pro 👑
            </button>
          </div>
        </div>
      </div>

    </div>
  `
})
export class WordChainComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private arcadeService = inject(ArcadeService);

  ArrowRight = ArrowRight;
  Trophy = Trophy;
  Clock = Clock;
  Zap = Zap;
  RotateCcw = RotateCcw;
  ShieldAlert = ShieldAlert;
  Sparkles = Sparkles;
  Lock = Lock;
  Users = Users;
  Globe = Globe;
  Smartphone = Smartphone;
  Copy = Copy;
  Check = Check;

  gameState = signal<'setup' | 'playing' | 'gameover'>('setup');
  
  selectedMode: 'local' | 'p2p' | 'online_pro' = 'local';
  showProModal = signal(false);
  
  p2pRoomCode = signal<string>('');
  copiedLink = signal(false);

  isMultiplayer = false;
  customTime = 30; // Default 30 seconds timer
  isDynamicTime = false;
  
  players: string[] = ['أنت', 'صديق 1'];
  currentPlayerIndex = 0;
  currentTurnPlayer = '';

  timeLeft = 30;
  timerInterval: any = null;

  lastWord = '';
  requiredLetter = '';
  currentInput = '';
  usedWords: string[] = [];

  scores: { [name: string]: number } = {};
  rankedPlayers: PlayerScore[] = [];
  gameOverReason = '';

  ngOnInit() {
    const savedName = localStorage.getItem('arcade_player_name');
    if (savedName) {
      this.players[0] = savedName;
    }
    this.p2pRoomCode.set(`CHAIN-${Math.floor(1000 + Math.random() * 9000)}`);
  }

  ngOnDestroy() {
    this.clearIntervals();
  }

  goBack() {
    this.router.navigate(['/arcade']);
  }

  selectMode(mode: 'local' | 'p2p' | 'online_pro') {
    if (mode === 'online_pro') {
      this.showProModal.set(true);
      return;
    }
    this.selectedMode = mode;
    if (mode === 'p2p') {
      this.isMultiplayer = true;
    }
  }

  copyRoomLink() {
    const link = `https://super-app.com/arcade/word-chain?room=${this.p2pRoomCode()}`;
    navigator.clipboard.writeText(link);
    this.copiedLink.set(true);
    setTimeout(() => this.copiedLink.set(false), 2500);
  }

  addPlayer() {
    if (this.players.length < 6) {
      this.players.push(`لاعب ${this.players.length + 1}`);
    }
  }

  removePlayer(index: number) {
    if (this.players.length > 2) {
      this.players.splice(index, 1);
    }
  }

  startGame() {
    this.usedWords = [];
    this.scores = {};
    this.players.forEach(p => this.scores[p] = 0);
    
    this.currentPlayerIndex = 0;
    this.currentTurnPlayer = this.players[0];
    this.lastWord = '';
    this.requiredLetter = this.getRandomStartingLetter();
    this.currentInput = '';
    this.timeLeft = Number(this.customTime);

    this.gameState.set('playing');
    this.startTimer();
  }

  getRandomStartingLetter(): string {
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    return letters[Math.floor(Math.random() * letters.length)];
  }

  startTimer() {
    this.clearIntervals();
    this.timerInterval = setInterval(() => {
      if (this.timeLeft > 0) {
        this.timeLeft--;
      } else {
        this.handleTimeOut();
      }
    }, 1000);
  }

  clearIntervals() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  handleTimeOut() {
    this.clearIntervals();
    this.handleWrongWord(`${this.currentTurnPlayer} خسر بسبب انتهاء الوقت المحدد (${this.customTime} ثانية)! ⌛`);
  }

  handleWrongWord(reason: string) {
    this.clearIntervals();

    if (!this.isMultiplayer || this.players.length <= 1) {
      this.endGame(reason);
    } else {
      // In Hotseat Multiplayer, eliminate the player who made the mistake
      const loser = this.currentTurnPlayer;
      this.players.splice(this.currentPlayerIndex, 1);
      
      if (this.players.length === 1) {
        this.endGame(`فاز اللاعب (${this.players[0]}) بالمباراة بعد إقصاء (${loser}) بكلمة خاطئة! 👑`);
      } else {
        alert(`${reason}\nتم إقصاء اللاعب (${loser}) من هذه الجولة!`);
        if (this.currentPlayerIndex >= this.players.length) {
          this.currentPlayerIndex = 0;
        }
        this.currentTurnPlayer = this.players[this.currentPlayerIndex];
        this.currentInput = '';
        this.resetTurnTimer();
      }
    }
  }

  resetTurnTimer() {
    this.timeLeft = Number(this.customTime);
    this.startTimer();
  }

  submitWord() {
    const word = this.currentInput.toLowerCase().trim();
    if (!word) return;

    // 1. Validate English letters only
    if (!/^[a-z]+$/.test(word)) {
      this.handleWrongWord(`${this.currentTurnPlayer} خسر بسبب إدخال كلمة بها حروف أو رموز غير إنجليزية! ❌`);
      return;
    }

    // 2. Validate starts with required letter (if requiredLetter exists)
    if (this.requiredLetter && word[0] !== this.requiredLetter) {
      this.handleWrongWord(`${this.currentTurnPlayer} خسر لأن الكلمة (${word}) لا تبدأ بالحرف المطلوب '${this.requiredLetter.toUpperCase()}'! ❌`);
      return;
    }

    // 3. Validate uniqueness
    if (this.usedWords.includes(word)) {
      this.handleWrongWord(`${this.currentTurnPlayer} خسر بسبب إدخال كلمة مكررة تم استخدامها مسبقاً! ❌`);
      return;
    }

    // Word is valid and accepted!
    this.usedWords.push(word);
    this.scores[this.currentTurnPlayer] = (this.scores[this.currentTurnPlayer] || 0) + 1;
    this.lastWord = word;
    this.requiredLetter = word[word.length - 1];
    this.currentInput = '';
    this.clearIntervals();

    // If single player vs AI
    if (!this.isMultiplayer) {
      this.currentTurnPlayer = 'الذكاء الاصطناعي 🤖';
      setTimeout(() => {
        const aiWord = this.getAiWord(this.requiredLetter);
        if (!aiWord) {
          this.endGame('عجز الذكاء الاصطناعي عن إيجاد كلمة! أنت الفائز! 🏆');
          return;
        }
        this.usedWords.push(aiWord);
        this.lastWord = aiWord;
        this.requiredLetter = aiWord[aiWord.length - 1];
        this.currentTurnPlayer = this.players[0];
        this.resetTurnTimer();
      }, 1000);
    } else {
      // Multiplayer turn rotation
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
      this.currentTurnPlayer = this.players[this.currentPlayerIndex];
      this.resetTurnTimer();
    }
  }

  getAiWord(letter: string): string | null {
    const sampleWords = [
      'apple', 'elephant', 'tiger', 'rabbit', 'train', 'net', 'tree', 'eagle',
      'earth', 'house', 'elephant', 'tomato', 'orange', 'egg', 'goat', 'table',
      'eye', 'yellow', 'water', 'river', 'road', 'dog', 'game', 'engine', 'net',
      'sun', 'star', 'moon', 'sky', 'cloud', 'rain', 'snow', 'wind', 'storm',
      'music', 'song', 'sound', 'voice', 'sing', 'dance', 'play', 'book', 'key'
    ];
    const valid = sampleWords.filter(w => w.startsWith(letter) && !this.usedWords.includes(w));
    if (valid.length > 0) {
      return valid[Math.floor(Math.random() * valid.length)];
    }
    return null;
  }

  endGame(reason: string) {
    this.clearIntervals();
    this.gameOverReason = reason;

    // Build ranked players list
    this.rankedPlayers = Object.keys(this.scores).map(name => ({
      name,
      score: this.scores[name],
      eliminated: false
    })).sort((a, b) => b.score - a.score);

    this.gameState.set('gameover');
  }
}
