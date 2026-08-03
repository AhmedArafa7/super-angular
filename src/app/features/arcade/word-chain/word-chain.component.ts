import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule, Trophy, Clock, Zap, RotateCcw, ArrowRight, ShieldAlert, Sparkles } from 'lucide-angular';
import { ArcadeService, ArcadeGame } from '../arcade.service';

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
    <div class="min-h-screen bg-slate-950 text-white p-6 md:p-12 flex flex-col items-center justify-start select-none font-sans" dir="rtl">
      
      <!-- Top Navigation Header -->
      <div class="w-full max-w-4xl flex items-center justify-between mb-8 border-b border-white/10 pb-4">
        <button (click)="goBack()" class="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white px-5 py-2.5 rounded-2xl transition-all font-bold text-sm">
          <lucide-icon [img]="ArrowRight" class="w-4 h-4"></lucide-icon>
          العودة لمعرض الألعاب
        </button>
        <div class="flex items-center gap-3">
          <div class="bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 px-4 py-1.5 rounded-2xl text-xs font-black flex items-center gap-2">
            <lucide-icon [img]="Sparkles" class="w-4 h-4"></lucide-icon>
            لعبة سلسلة الكلمات الإنجليزية (Word Chain)
          </div>
        </div>
      </div>

      <!-- MAIN CONTAINER -->
      <div class="w-full max-w-3xl">

        <!-- 1. SETUP STAGE -->
        <div *ngIf="gameState() === 'setup'" class="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl space-y-8 animate-in zoom-in-95 duration-300">
          <div class="text-center space-y-3">
            <h1 class="text-3xl md:text-5xl font-black bg-gradient-to-l from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">سلسلة الكلمات الذكية 🔗</h1>
            <p class="text-slate-400 text-sm max-w-lg mx-auto">اكتب كلمة تبدأ بآخر حرف من الكلمة السابقة! تحدى نفسك أو أصدقاءك، واهزم المؤقت قبل نفاد الوقت.</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 bg-black/30 p-6 rounded-3xl border border-white/5">
            <!-- Mode Selection -->
            <div class="space-y-3">
              <label class="text-xs font-bold text-slate-400 uppercase tracking-widest">وضع اللعب</label>
              <div class="grid grid-cols-2 gap-3">
                <button (click)="isMultiplayer = false" [ngClass]="!isMultiplayer ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'bg-white/5 text-slate-400 hover:bg-white/10'" class="py-3 rounded-2xl font-bold text-xs transition-all">
                  فردي ضد الذكاء الاصطناعي 🤖
                </button>
                <button (click)="isMultiplayer = true" [ngClass]="isMultiplayer ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'bg-white/5 text-slate-400 hover:bg-white/10'" class="py-3 rounded-2xl font-bold text-xs transition-all">
                  غرفة جماعية (Pass & Play) 👥
                </button>
              </div>
            </div>

            <!-- Dynamic Time Selection -->
            <div class="space-y-3">
              <div class="flex justify-between items-center">
                <label class="text-xs font-bold text-slate-400 uppercase tracking-widest">الزمن المتاح لكل كلمة</label>
                <span class="text-indigo-400 font-mono font-black text-sm">{{ customTime }} ثانية</span>
              </div>
              <input type="range" min="3" max="15" step="1" [(ngModel)]="customTime" class="w-full accent-indigo-500 bg-slate-800 rounded-lg cursor-pointer h-2" />
              <div class="flex items-center justify-between">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="isDynamicTime" class="accent-indigo-500 size-4 rounded" />
                  <span class="text-xs font-bold text-slate-300">تفعيل الزمن الديناميكي (يقل تدريجياً مع كل كلمة ⚡)</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Multiplayer Names Setup -->
          <div *ngIf="isMultiplayer" class="space-y-4 bg-black/30 p-6 rounded-3xl border border-white/5">
            <div class="flex justify-between items-center">
              <label class="text-xs font-bold text-slate-400 uppercase tracking-widest">أسماء اللاعبين (حلقة الأدوار)</label>
              <button (click)="addPlayer()" class="text-xs font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 px-3 py-1.5 rounded-xl border border-indigo-500/20">
                + إضافة لاعب
              </button>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div *ngFor="let p of players; let i = index" class="flex items-center gap-2">
                <input type="text" [(ngModel)]="players[i]" placeholder="اسم اللاعب..." class="w-full h-11 bg-white/5 border border-white/10 rounded-2xl px-4 text-xs text-white text-right focus:outline-none focus:border-indigo-500" />
                <button *ngIf="players.length > 2" (click)="removePlayer(i)" class="text-red-400 hover:bg-red-500/10 p-2 rounded-xl">✕</button>
              </div>
            </div>
          </div>

          <button (click)="startGame()" class="w-full h-14 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-2xl font-black text-base shadow-xl shadow-indigo-600/30 transition-all active:scale-95 flex items-center justify-center gap-2">
            <lucide-icon [img]="Zap" class="w-5 h-5"></lucide-icon>
            ابدأ التحدي الآن
          </button>
        </div>

        <!-- 2. PLAYING STAGE -->
        <div *ngIf="gameState() === 'playing'" class="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl space-y-8 animate-in fade-in duration-300">
          
          <!-- Header Info & Timer -->
          <div class="flex flex-col sm:flex-row items-center justify-between gap-4 bg-black/40 p-6 rounded-3xl border border-white/5">
            <div>
              <span class="text-xs text-slate-400 font-bold block mb-1">دور اللاعب الحالي:</span>
              <h2 class="text-2xl font-black text-indigo-400 flex items-center gap-2">
                <span>👤 {{ currentTurnPlayer }}</span>
              </h2>
            </div>

            <!-- Timer Circle -->
            <div class="flex items-center gap-4">
              <div class="relative size-16 flex items-center justify-center rounded-full bg-slate-950 border-4" [ngClass]="timeLeft <= 3 ? 'border-red-500 animate-pulse' : 'border-indigo-500'">
                <span class="font-mono text-xl font-black" [ngClass]="timeLeft <= 3 ? 'text-red-400' : 'text-white'">{{ timeLeft }}s</span>
              </div>
            </div>
          </div>

          <!-- Last Word & Required Letter Banner -->
          <div class="bg-gradient-to-r from-indigo-950/40 to-violet-950/40 border border-indigo-500/30 p-8 rounded-3xl text-center space-y-4">
            <span class="text-xs font-black text-indigo-300 uppercase tracking-widest">الكلمة الأخيرة المسجلة</span>
            <div class="text-3xl md:text-5xl font-black text-white font-mono tracking-wider">
              {{ lastWord ? lastWord : '(لا توجد كلمات بعد)' }}
            </div>
            
            <div *ngIf="lastWord" class="inline-flex items-center gap-2 px-6 py-2 bg-indigo-500/20 border border-indigo-400/40 rounded-full text-indigo-200 text-sm font-bold">
              <span>الحرف المطلوب للبدء:</span>
              <span class="text-2xl font-black text-amber-400 font-mono uppercase">{{ requiredLetter }}</span>
            </div>
          </div>

          <!-- Input Field & Submit -->
          <div class="space-y-4">
            <div class="relative">
              <input 
                type="text" 
                [(ngModel)]="currentInput" 
                (keyup.enter)="submitWord()"
                placeholder="اكتب كلمة بالإنجليزية تبدأ بحرف '{{ requiredLetter }}'..." 
                autofocus
                class="w-full h-16 bg-white/5 border-2 border-white/10 rounded-2xl px-6 text-lg text-white font-mono text-right focus:outline-none focus:border-indigo-500 shadow-inner"
              />
              <button (click)="submitWord()" class="absolute left-3 top-1/2 -translate-y-1/2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-10 px-6 rounded-xl text-sm transition-all shadow">
                إرسال ↵
              </button>
            </div>
            <p class="text-xs text-slate-500 text-center">تنبيه: يجب ألا تكرر كلمة تم كتابتها مسبقاً، ويجب أن تتطابق مع الحرف الأخير بدقة.</p>
          </div>

          <!-- Used Words History (Tags) -->
          <div class="space-y-2">
            <span class="text-xs font-bold text-slate-400">الكلمات المستخدمة في هذه الجلسة ({{ usedWords.length }}):</span>
            <div class="flex flex-wrap gap-2 max-h-36 overflow-y-auto custom-scrollbar p-3 bg-black/20 rounded-2xl border border-white/5">
              <span *ngFor="let w of usedWords" class="px-3 py-1 bg-white/5 border border-white/10 rounded-xl text-xs font-mono text-indigo-300">
                {{ w }}
              </span>
            </div>
          </div>
        </div>

        <!-- 3. GAME OVER / RANKINGS STAGE -->
        <div *ngIf="gameState() === 'gameover'" class="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl space-y-8 text-center animate-in zoom-in-95 duration-300">
          <div class="size-20 bg-amber-500/10 border border-amber-500/30 rounded-3xl flex items-center justify-center mx-auto text-amber-400">
            <lucide-icon [img]="Trophy" class="w-10 h-10"></lucide-icon>
          </div>

          <div class="space-y-2">
            <h1 class="text-3xl font-black text-white">انتهت اللعبة! 🏆</h1>
            <p class="text-slate-400 text-sm">{{ gameOverReason }}</p>
          </div>

          <!-- Rankings Board -->
          <div class="space-y-3 max-w-md mx-auto">
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-widest text-right">ترتيب اللاعبين النهائي</h3>
            <div class="space-y-2">
              <div *ngFor="let p of rankedPlayers; let i = index" class="flex items-center justify-between bg-black/40 border border-white/5 p-4 rounded-2xl">
                <div class="flex items-center gap-3">
                  <span class="size-8 rounded-xl flex items-center justify-center font-black text-sm" [ngClass]="i === 0 ? 'bg-amber-500 text-slate-950' : (i === 1 ? 'bg-slate-300 text-slate-950' : 'bg-white/10 text-slate-400')">
                    #{{ i + 1 }}
                  </span>
                  <span class="font-bold text-white text-sm">{{ p.name }}</span>
                </div>
                <span class="font-mono font-black text-indigo-400 text-sm">{{ p.score }} كلمة</span>
              </div>
            </div>
          </div>

          <div class="flex gap-4 max-w-md mx-auto pt-4">
            <button (click)="gameState.set('setup')" class="flex-1 h-14 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2">
              <lucide-icon [img]="RotateCcw" class="w-4 h-4"></lucide-icon>
              لعبة جديدة
            </button>
            <button (click)="goBack()" class="flex-1 h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-indigo-600/30">
              العودة للمعرض
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

  gameState = signal<'setup' | 'playing' | 'gameover'>('setup');
  
  isMultiplayer = false;
  customTime = 7;
  isDynamicTime = false;
  
  players: string[] = ['أنت', 'صديق 1'];
  currentPlayerIndex = 0;
  currentTurnPlayer = '';

  timeLeft = 7;
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
  }

  ngOnDestroy() {
    this.clearIntervals();
  }

  goBack() {
    this.router.navigate(['/arcade']);
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
    if (!this.isMultiplayer) {
      this.endGame(`${this.currentTurnPlayer} خسر بسبب انتهاء الوقت! ⌛`);
    } else {
      // في وضع الغرفة الجماعية، اللاعب الحالي يخسر ويتم إقصاؤه
      const loser = this.currentTurnPlayer;
      this.players.splice(this.currentPlayerIndex, 1);
      
      if (this.players.length === 1) {
        this.endGame(`فاز اللاعب ${this.players[0]} بعد إقصاء الجميع! 👑`);
      } else {
        alert(`انتهى الوقت على ${loser}! تم إقصاؤه.`);
        if (this.currentPlayerIndex >= this.players.length) {
          this.currentPlayerIndex = 0;
        }
        this.currentTurnPlayer = this.players[this.currentPlayerIndex];
        this.resetTurnTimer();
      }
    }
  }

  resetTurnTimer() {
    if (this.isDynamicTime) {
      // يقل تدريجياً مع تقدم الكلمات (بحد أدنى 3 ثواني)
      const reduction = Math.floor(this.usedWords.length / 3);
      this.timeLeft = Math.max(3, Number(this.customTime) - reduction);
    } else {
      this.timeLeft = Number(this.customTime);
    }
    this.startTimer();
  }

  submitWord() {
    const word = this.currentInput.toLowerCase().trim();
    if (!word) return;

    // 1. Validate English letters only
    if (!/^[a-z]+$/.test(word)) {
      alert('يجب كتابة كلمات باللغة الإنجليزية فقط وبحروف صحيحة!');
      return;
    }

    // 2. Validate starts with required letter (if lastWord exists)
    if (this.lastWord && word[0] !== this.requiredLetter) {
      alert(`يجب أن تبدأ الكلمة بالحرف '${this.requiredLetter.toUpperCase()}'!`);
      return;
    }

    // 3. Validate uniqueness (prevent infinite loops & repeats)
    if (this.usedWords.includes(word)) {
      alert('هذه الكلمة تم استخدامها مسبقاً! ممنوع التكرار.');
      return;
    }

    // Success word accepted!
    this.usedWords.push(word);
    this.scores[this.currentTurnPlayer] = (this.scores[this.currentTurnPlayer] || 0) + 1;
    this.lastWord = word;
    this.requiredLetter = word[word.length - 1];
    this.currentInput = '';
    this.clearIntervals();

    // If single player vs AI
    if (!this.isMultiplayer) {
      // Switch to AI turn briefly or just let user continue
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
      'eye', 'yellow', 'water', 'river', 'road', 'dog', 'game', 'engine', 'net'
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
