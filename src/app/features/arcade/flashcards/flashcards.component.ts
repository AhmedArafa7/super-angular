import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule, ArrowRight, Sparkles, RotateCcw, Plus, Trash2, CheckCircle2, XCircle, Brain, Volume2, Settings, Mic, Keyboard, Lightbulb, Clock, Flame } from 'lucide-angular';
import { AiKeyManagerService } from '../../../core/services/ai-key-manager.service';

interface Flashcard {
  front: string;
  back: string;
  category: string;
}

interface Deck {
  id: string;
  title: string;
  description: string;
  icon: string;
  cards: Flashcard[];
}

interface GameSettings {
  answerMode: 'random' | 'voice_only' | 'type_only' | 'both';
  directionMode: 'random' | 'front_to_back' | 'back_to_front';
  autoAudio: boolean;
  timerMode: boolean;
}

@Component({
  selector: 'app-flashcards-game',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="min-h-screen bg-slate-950 text-white p-6 md:p-12 flex flex-col items-center justify-start select-none font-sans" dir="rtl">
      
      <!-- Top Navigation Header -->
      <div class="w-full max-w-4xl flex items-center justify-between mb-8 border-b border-white/10 pb-4">
        <button (click)="goBack()" class="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white px-5 py-2.5 rounded-2xl transition-all font-bold text-sm cursor-pointer">
          <lucide-icon [img]="ArrowRight" class="w-4 h-4"></lucide-icon>
          العودة لمعرض الألعاب
        </button>
        <div class="flex items-center gap-3">
          <div class="bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 px-4 py-1.5 rounded-2xl text-xs font-black flex items-center gap-2">
            <lucide-icon [img]="Brain" class="w-4 h-4"></lucide-icon>
            نظام البطاقات التعليمية الذكية (Flashcards)
          </div>
        </div>
      </div>

      <!-- MAIN CONTAINER -->
      <div class="w-full max-w-3xl">

        <!-- 1. CATEGORY & DECK SELECTION STAGE -->
        <div *ngIf="gameState() === 'select'" class="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl space-y-8 animate-in zoom-in-95 duration-300">
          <div class="text-center space-y-3">
            <h1 class="text-3xl md:text-5xl font-black bg-gradient-to-l from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">حفظ واختبار البطاقات 🧠</h1>
            <p class="text-slate-400 text-sm max-w-lg mx-auto">اختر مجموعة بطاقات جاهزة أو أنشئ مجموعتك الخاصة! قسم السنين يولد أرقاماً وعوام عشوائية متجددة في كل مرة.</p>
          </div>

          <!-- Decks Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div *ngFor="let deck of decks" (click)="openSettings(deck)" class="group cursor-pointer bg-black/40 border border-white/5 hover:border-indigo-500/50 p-6 rounded-3xl transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between">
              <div>
                <div class="text-3xl mb-3">{{ deck.icon }}</div>
                <h3 class="text-xl font-bold text-white group-hover:text-indigo-300 transition-colors">{{ deck.title }}</h3>
                <p class="text-xs text-slate-400 mt-1">{{ deck.description }}</p>
              </div>
              <div class="mt-6 flex items-center justify-between text-xs text-indigo-400 font-bold">
                <span>{{ deck.id === 'years' ? 'عشوائي متجدد ⏳' : deck.cards.length + ' بطاقة' }}</span>
                <span class="flex items-center gap-1 bg-indigo-500/20 px-3 py-1 rounded-xl text-indigo-300">
                  <lucide-icon [img]="Settings" class="w-3.5 h-3.5"></lucide-icon>
                  ضبط واختبار ⚙️
                </span>
              </div>
            </div>
          </div>

          <!-- Custom Deck Creator Button -->
          <button (click)="openCreator()" class="w-full h-14 bg-white/5 hover:bg-white/10 border border-dashed border-indigo-500/40 text-indigo-300 hover:text-white rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer">
            <lucide-icon [img]="Plus" class="w-5 h-5"></lucide-icon>
            إنشاء مجموعة بطاقات مخصصة جديدة ⚡
          </button>
        </div>

        <!-- 1.5 GAME SETUP & SETTINGS STAGE -->
        <div *ngIf="gameState() === 'settings'" class="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl space-y-8 animate-in zoom-in-95 duration-300">
          <div class="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h2 class="text-2xl font-black text-white flex items-center gap-3">
                <span>{{ selectedDeckForPlay?.icon }}</span>
                <span>إعدادات تحدي: {{ selectedDeckForPlay?.title }}</span>
              </h2>
              <p class="text-xs text-slate-400 mt-1">خصص أسلوب الاختبار واتجاه الأسئلة وطريقة الإجابة قبل الانطلاق</p>
            </div>
            <button (click)="gameState.set('select')" class="text-xs text-slate-400 hover:text-white cursor-pointer bg-white/5 px-3 py-1.5 rounded-xl">الرجوع</button>
          </div>

          <div class="space-y-6">
            <!-- 1. Answer Method -->
            <div class="space-y-3">
              <label class="text-xs font-bold text-indigo-300 block flex items-center gap-2">
                <lucide-icon [img]="Mic" class="w-4 h-4"></lucide-icon>
                طريقة إدخال الإجابة (الافتراضي: عشوائي)
              </label>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button (click)="gameSettings.answerMode = 'random'" 
                        [ngClass]="gameSettings.answerMode === 'random' ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg' : 'bg-black/40 text-slate-400 border-white/5'" 
                        class="p-4 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-2 text-center">
                  <span class="text-xl">🔀</span>
                  <span>عشوائي (منوع)</span>
                </button>
                <button (click)="gameSettings.answerMode = 'voice_only'" 
                        [ngClass]="gameSettings.answerMode === 'voice_only' ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg' : 'bg-black/40 text-slate-400 border-white/5'" 
                        class="p-4 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-2 text-center">
                  <span class="text-xl">🎙️</span>
                  <span>صوت فقط (Gemini AI)</span>
                </button>
                <button (click)="gameSettings.answerMode = 'type_only'" 
                        [ngClass]="gameSettings.answerMode === 'type_only' ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg' : 'bg-black/40 text-slate-400 border-white/5'" 
                        class="p-4 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-2 text-center">
                  <span class="text-xl">⌨️</span>
                  <span>كتابة فقط</span>
                </button>
                <button (click)="gameSettings.answerMode = 'both'" 
                        [ngClass]="gameSettings.answerMode === 'both' ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg' : 'bg-black/40 text-slate-400 border-white/5'" 
                        class="p-4 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-2 text-center">
                  <span class="text-xl">⚡</span>
                  <span>كتابة أو صوت</span>
                </button>
              </div>
            </div>

            <!-- 2. Direction Mode -->
            <div class="space-y-3">
              <label class="text-xs font-bold text-indigo-300 block flex items-center gap-2">
                <lucide-icon [img]="Brain" class="w-4 h-4"></lucide-icon>
                اتجاه عرض السؤال والإجابة
              </label>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button (click)="gameSettings.directionMode = 'random'" 
                        [ngClass]="gameSettings.directionMode === 'random' ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg' : 'bg-black/40 text-slate-400 border-white/5'" 
                        class="p-4 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-3">
                  <span>🔀 عشوائي لكل بطاقة</span>
                </button>
                <button (click)="gameSettings.directionMode = 'front_to_back'" 
                        [ngClass]="gameSettings.directionMode === 'front_to_back' ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg' : 'bg-black/40 text-slate-400 border-white/5'" 
                        class="p-4 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-3">
                  <span>الوجه ← الظهر</span>
                </button>
                <button (click)="gameSettings.directionMode = 'back_to_front'" 
                        [ngClass]="gameSettings.directionMode === 'back_to_front' ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg' : 'bg-black/40 text-slate-400 border-white/5'" 
                        class="p-4 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-3">
                  <span>الظهر ← الوجه</span>
                </button>
              </div>
            </div>

            <!-- 3. Extra Options -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <label class="flex items-center justify-between p-4 bg-black/40 border border-white/5 rounded-2xl cursor-pointer hover:border-indigo-500/30">
                <div class="flex items-center gap-3">
                  <span class="text-xl">🔊</span>
                  <div>
                    <span class="text-xs font-bold block text-white">نطق صوتي تلقائي</span>
                    <span class="text-[10px] text-slate-400">قراءة السؤال صوتياً عند عرض البطاقة</span>
                  </div>
                </div>
                <input type="checkbox" [(ngModel)]="gameSettings.autoAudio" class="w-5 h-5 accent-indigo-600 rounded cursor-pointer" />
              </label>

              <label class="flex items-center justify-between p-4 bg-black/40 border border-white/5 rounded-2xl cursor-pointer hover:border-indigo-500/30">
                <div class="flex items-center gap-3">
                  <span class="text-xl">⏱️</span>
                  <div>
                    <span class="text-xs font-bold block text-white">تحدي الوقت (15 ثانية)</span>
                    <span class="text-[10px] text-slate-400">مؤقت تنازلي لكل بطاقة</span>
                  </div>
                </div>
                <input type="checkbox" [(ngModel)]="gameSettings.timerMode" class="w-5 h-5 accent-indigo-600 rounded cursor-pointer" />
              </label>
            </div>
          </div>

          <button (click)="startPlaying()" class="w-full h-14 bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 text-white rounded-2xl font-black text-sm transition-all shadow-xl shadow-indigo-600/30 cursor-pointer">
            ابدأ التحدي الآن 🚀
          </button>
        </div>

        <!-- 2. CUSTOM DECK CREATOR STAGE -->
        <div *ngIf="gameState() === 'create'" class="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl space-y-8 animate-in zoom-in-95 duration-300">
          <div class="flex items-center justify-between">
            <h2 class="text-2xl font-black text-white">إعداد مجموعة بطاقات مخصصة</h2>
            <button (click)="gameState.set('select')" class="text-xs text-slate-400 hover:text-white cursor-pointer">إلغاء</button>
          </div>

          <div class="space-y-4">
            <div>
              <label class="text-xs font-bold text-slate-400 block mb-2">عنوان المجموعة</label>
              <input type="text" [(ngModel)]="newDeckTitle" placeholder="مثال: كلمات إنجليزية، عواصم الدول..." class="w-full h-12 bg-black/40 border border-white/10 rounded-2xl px-4 text-xs text-white" />
            </div>

            <div class="space-y-3 pt-2">
              <label class="text-xs font-bold text-slate-400 block">البطاقات (الوجه والظهر)</label>
              <div *ngFor="let card of customCards; let i = index" class="flex items-center gap-3 bg-black/30 p-3 rounded-2xl border border-white/5">
                <span class="text-xs font-mono text-slate-500">#{{ i + 1 }}</span>
                <input type="text" [(ngModel)]="card.front" placeholder="الوجه (مثال: January)" class="flex-1 h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-xs text-white text-right" />
                <input type="text" [(ngModel)]="card.back" placeholder="الظهر (مثال: 1)" class="flex-1 h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-xs text-white text-right" />
                <button *ngIf="customCards.length > 1" (click)="removeCustomCard(i)" class="text-red-400 hover:bg-red-500/10 p-2 rounded-xl cursor-pointer">
                  <lucide-icon [img]="Trash2" class="w-4 h-4"></lucide-icon>
                </button>
              </div>
              <button (click)="addCustomCard()" class="text-xs text-indigo-400 hover:text-indigo-300 font-bold cursor-pointer">+ إضافة بطاقة أخرى</button>
            </div>
          </div>

          <button (click)="saveCustomDeck()" class="w-full h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-sm transition-all shadow-lg shadow-indigo-600/30 cursor-pointer">
            حفظ وبدء الإعداد 🚀
          </button>
        </div>

        <!-- 3. PLAYING STAGE (FLASHCARD VIEW) -->
        <div *ngIf="gameState() === 'playing'" class="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl space-y-8 text-center animate-in zoom-in-95 duration-300">
          
          <!-- Progress & Mode info -->
          <div class="flex flex-wrap items-center justify-between text-xs text-slate-400 font-bold gap-3">
            <span class="bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">البطاقة {{ currentIndex + 1 }} من {{ activeDeck.cards.length }}</span>
            
            <!-- Streak & Score Badge -->
            <div class="flex items-center gap-2 bg-amber-500/10 text-amber-300 px-3 py-1.5 rounded-xl border border-amber-500/20 font-black">
              <lucide-icon [img]="Flame" class="w-4 h-4 text-amber-400"></lucide-icon>
              <span>التتابع: {{ streakCount }} 🔥</span>
            </div>

            <!-- Timer Badge if enabled -->
            <div *ngIf="gameSettings.timerMode" class="flex items-center gap-2 bg-red-500/10 text-red-300 px-3 py-1.5 rounded-xl border border-red-500/20 font-mono font-black">
              <lucide-icon [img]="Clock" class="w-4 h-4 text-red-400 animate-pulse"></lucide-icon>
              <span>{{ timeLeft }} ثانية</span>
            </div>

            <span class="bg-indigo-500/10 text-indigo-400 px-3 py-1.5 rounded-xl border border-indigo-500/20">{{ activeDeck.title }}</span>
          </div>

           <!-- Audio trigger -->
           <button (click)="playAudio(getCurrentPrompt())" class="mx-auto bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer">
              <lucide-icon [img]="Volume2" class="w-4 h-4"></lucide-icon> الاستماع للنص الصوتي
           </button>

           <!-- The Flashcard -->
           <div (click)="flipCard()" class="w-full aspect-[16/9] bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-indigo-500/30 rounded-[2.5rem] p-8 flex flex-col items-center justify-center cursor-pointer shadow-2xl relative overflow-hidden group hover:border-indigo-500 transition-all">
            
            <div class="absolute top-4 right-6 text-xs text-slate-500 font-mono">
              اضغط على البطاقة لقلبها ⟳
            </div>

            <div class="space-y-4">
              <span class="text-xs font-bold text-indigo-300 uppercase tracking-widest">
                {{ !isFlipped ? (effectiveDirection === 'front-to-back' ? 'السؤال (الوجه):' : 'السؤال (الظهر):') : 'الإجابة الصحيحة:' }}
              </span>
              
              <div class="text-4xl md:text-6xl font-black text-white font-mono tracking-wide">
                {{ !isFlipped ? getCurrentPrompt() : getCurrentAnswer() }}
              </div>
            </div>
          </div>

          <!-- User Input / Guess Section (Adapted based on answerMode) -->
          <div class="space-y-4 max-w-md mx-auto">
            
            <!-- Typing Input (Enabled unless voice_only) -->
            <div *ngIf="gameSettings.answerMode !== 'voice_only'" class="relative flex items-center gap-2">
              <input 
                type="text" 
                [(ngModel)]="userInput" 
                (keyup.enter)="checkAnswer()"
                [placeholder]="gameSettings.answerMode === 'both' ? 'اكتب إجابتك أو استخدم الميكروفون 🎙️' : 'اكتب إجابتك هنا...'" 
                class="w-full h-14 bg-white/5 border-2 border-white/10 rounded-2xl px-6 text-base text-white text-center focus:outline-none focus:border-indigo-500 font-mono"
              />
              <button *ngIf="gameSettings.answerMode === 'both' || gameSettings.answerMode === 'random'" 
                      (click)="toggleVoiceRecording()" 
                      [ngClass]="isListening() ? 'bg-red-500 animate-pulse text-white scale-105' : 'bg-white/5 hover:bg-white/10 text-indigo-400 border border-white/10'" 
                      class="h-14 px-4 rounded-2xl transition-all flex items-center justify-center cursor-pointer shrink-0 text-lg shadow-lg relative" 
                      title="تحدث للإجابة عبر Gemini AI">
                🎙️
              </button>
            </div>

            <!-- Voice Only Mode Notice & Big Mic Button -->
            <div *ngIf="gameSettings.answerMode === 'voice_only'" class="space-y-3">
              <div class="p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl text-xs text-indigo-300 font-bold text-center">
                🎙️ نمط الصوت فقط مفعل! انقر على الزر أدناه وانطق الإجابة بوضوح:
              </div>
              <button (click)="toggleVoiceRecording()" 
                      [ngClass]="isListening() ? 'bg-red-500 animate-pulse text-white scale-105' : 'bg-indigo-600 hover:bg-indigo-500 text-white'" 
                      class="w-full h-16 rounded-2xl font-black text-base shadow-xl flex items-center justify-center gap-3 cursor-pointer transition-all">
                <span class="text-2xl">🎙️</span>
                <span>{{ isListening() ? 'جاري الاستماع... انقر للإيقاف والتحليل' : 'اضغط للتحدث بصوتك 🎙️' }}</span>
              </button>
            </div>

            <!-- Hint Button & Info -->
            <div class="flex items-center justify-between text-xs px-2">
              <button (click)="showHint()" class="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1.5 cursor-pointer bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
                <lucide-icon [img]="Lightbulb" class="w-3.5 h-3.5"></lucide-icon>
                <span>تلميح (الحرف الأول)</span>
              </button>
              <span class="text-slate-500 font-mono">طريقة الإجابة: {{ getAnswerModeLabel() }}</span>
            </div>

            <!-- Inline Feedback Banner -->
            <div *ngIf="feedbackMessage()" class="p-3 rounded-xl text-xs font-bold transition-all animate-in fade-in flex items-center justify-center gap-2"
                 [ngClass]="feedbackType() === 'success' ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300' : 'bg-red-500/20 border border-red-500/40 text-red-300'">
              <lucide-icon [img]="feedbackType() === 'success' ? CheckCircle2 : XCircle" class="w-4 h-4"></lucide-icon>
              <span>{{ feedbackMessage() }}</span>
            </div>

            <div class="flex gap-3 pt-2">
              <button (click)="checkAnswer()" class="flex-1 h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl text-sm transition-all shadow-lg shadow-indigo-600/20 cursor-pointer">
                تحقق من الإجابة ✓
              </button>
              <button (click)="nextCard()" class="h-12 px-6 bg-white/5 hover:bg-white/10 text-slate-300 font-bold rounded-2xl text-sm transition-all cursor-pointer">
                تخطي ➔
              </button>
            </div>
          </div>
        </div>

        <!-- 4. SUMMARY / FINISH STAGE -->
        <div *ngIf="gameState() === 'summary'" class="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl space-y-8 text-center animate-in zoom-in-95 duration-300">
          <div class="size-20 bg-emerald-500/10 border border-emerald-500/30 rounded-3xl flex items-center justify-center mx-auto text-emerald-400">
            <lucide-icon [img]="CheckCircle2" class="w-10 h-10"></lucide-icon>
          </div>

          <div class="space-y-2">
            <h1 class="text-3xl font-black text-white">أحسنت! أتممت الجلسة بنجاح 🌟</h1>
            <p class="text-slate-400 text-sm">لقد راجعت جميع بطاقات مجموعة "{{ activeDeck.title }}"</p>
          </div>

          <div class="bg-black/40 border border-white/5 p-6 rounded-3xl max-w-sm mx-auto flex items-center justify-around">
            <div>
              <span class="text-xs text-slate-500 block">أعلى تتابع (Streak)</span>
              <span class="text-2xl font-black text-amber-400 font-mono">{{ maxStreak }} 🔥</span>
            </div>
            <div class="h-10 w-px bg-white/10"></div>
            <div>
              <span class="text-xs text-slate-500 block">البطاقات</span>
              <span class="text-2xl font-black text-white font-mono">{{ activeDeck.cards.length }}</span>
            </div>
          </div>

          <div class="flex gap-4 max-w-md mx-auto pt-4">
            <button (click)="gameState.set('select')" class="flex-1 h-14 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer">
              <lucide-icon [img]="RotateCcw" class="w-4 h-4"></lucide-icon>
              اختر مجموعة أخرى
            </button>
            <button (click)="goBack()" class="flex-1 h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-indigo-600/30 cursor-pointer">
              العودة للمعرض
            </button>
          </div>
        </div>

      </div>
    </div>
  `
})
export class FlashcardsComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  aiKeyManager = inject(AiKeyManagerService);

  ArrowRight = ArrowRight;
  Sparkles = Sparkles;
  RotateCcw = RotateCcw;
  Plus = Plus;
  Trash2 = Trash2;
  CheckCircle2 = CheckCircle2;
  XCircle = XCircle;
  Brain = Brain;
  Volume2 = Volume2;
  Settings = Settings;
  Mic = Mic;
  Keyboard = Keyboard;
  Lightbulb = Lightbulb;
  Clock = Clock;
  Flame = Flame;

  gameState = signal<'select' | 'settings' | 'create' | 'playing' | 'summary'>('select');
  feedbackMessage = signal<string | null>(null);
  feedbackType = signal<'success' | 'error' | null>(null);
  isListening = signal<boolean>(false);

  decks: Deck[] = [
    {
      id: 'months',
      title: 'أشهر السنة الإنجليزية (Months)',
      description: 'حفظ أسماء الأشهر باللغة الإنجليزية وترتيبها بالأرقام من 1 إلى 12.',
      icon: '📅',
      cards: [
        { front: 'January', back: '1', category: 'months' },
        { front: 'February', back: '2', category: 'months' },
        { front: 'March', back: '3', category: 'months' },
        { front: 'April', back: '4', category: 'months' },
        { front: 'May', back: '5', category: 'months' },
        { front: 'June', back: '6', category: 'months' },
        { front: 'July', back: '7', category: 'months' },
        { front: 'August', back: '8', category: 'months' },
        { front: 'September', back: '9', category: 'months' },
        { front: 'October', back: '10', category: 'months' },
        { front: 'November', back: '11', category: 'months' },
        { front: 'December', back: '12', category: 'months' },
      ]
    },
    {
      id: 'weekdays',
      title: 'أيام الأسبوع (Days of Week)',
      description: 'حفظ أيام الأسبوع بالإنجليزية وترتيبها.',
      icon: '🕒',
      cards: [
        { front: 'Saturday', back: 'السبت', category: 'weekdays' },
        { front: 'Sunday', back: 'الأحد', category: 'weekdays' },
        { front: 'Monday', back: 'الإثنين', category: 'weekdays' },
        { front: 'Tuesday', back: 'الثلاثاء', category: 'weekdays' },
        { front: 'Wednesday', back: 'الأربعاء', category: 'weekdays' },
        { front: 'Thursday', back: 'الخميس', category: 'weekdays' },
        { front: 'Friday', back: 'الجمعة', category: 'weekdays' },
      ]
    },
    {
      id: 'years',
      title: 'تحدي السنين والأرقام (Random Years)',
      description: 'أعوام وأرقام عشوائية متجددة في كل اختبار.',
      icon: '⏳',
      cards: [] // Will be generated dynamically on the fly
    }
  ];

  selectedDeckForPlay: Deck | null = null;
  activeDeck: Deck = this.decks[0];
  currentIndex = 0;
  isFlipped = false;
  userInput = '';
  streakCount = 0;
  maxStreak = 0;

  // Game Settings (Default: Random / Flexible)
  gameSettings: GameSettings = {
    answerMode: 'random',
    directionMode: 'random',
    autoAudio: false,
    timerMode: false
  };

  effectiveDirection: 'front-to-back' | 'back-to-front' = 'front-to-back';
  private timerInterval: any = null;
  timeLeft = 15;

  newDeckTitle = '';
  customCards: Array<{ front: string; back: string }> = [{ front: '', back: '' }];

  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  ngOnInit() {
    const saved = localStorage.getItem('super_flashcards_custom_decks');
    if (saved) {
      try {
        const customDecks: Deck[] = JSON.parse(saved);
        if (Array.isArray(customDecks) && customDecks.length > 0) {
          this.decks = [...customDecks, ...this.decks];
        }
      } catch (e) {}
    }
  }

  ngOnDestroy() {
    this.clearTimer();
  }

  goBack() {
    this.clearTimer();
    this.router.navigate(['/arcade']);
  }

  openSettings(deck: Deck) {
    const deckCopy = JSON.parse(JSON.stringify(deck));

    // If it's the years deck, generate dynamic random years (1950 to 2035) every time!
    if (deck.id === 'years') {
      const randomYears: Flashcard[] = [];
      const usedYears = new Set<number>();
      while (randomYears.length < 12) {
        const yr = Math.floor(Math.random() * (2035 - 1950 + 1)) + 1950;
        if (!usedYears.has(yr)) {
          usedYears.add(yr);
          randomYears.push({
            front: yr.toString(),
            back: yr.toString(),
            category: 'years'
          });
        }
      }
      deckCopy.cards = randomYears;
    }

    this.selectedDeckForPlay = deckCopy;
    this.gameSettings = {
      answerMode: 'random',
      directionMode: 'random',
      autoAudio: false,
      timerMode: false
    };
    this.gameState.set('settings');
  }

  shuffleArray(array: Flashcard[]): Flashcard[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  startPlaying() {
    if (!this.selectedDeckForPlay) return;
    this.activeDeck = JSON.parse(JSON.stringify(this.selectedDeckForPlay));
    // Shuffle cards randomly every time
    this.activeDeck.cards = this.shuffleArray(this.activeDeck.cards);

    this.currentIndex = 0;
    this.isFlipped = false;
    this.userInput = '';
    this.streakCount = 0;
    this.maxStreak = 0;
    this.feedbackMessage.set(null);

    this.setupCardRound();
    this.gameState.set('playing');
  }

  setupCardRound() {
    this.isFlipped = false;
    this.userInput = '';
    this.feedbackMessage.set(null);

    // Resolve direction mode for this card
    if (this.gameSettings.directionMode === 'random') {
      this.effectiveDirection = Math.random() > 0.5 ? 'front-to-back' : 'back-to-front';
    } else if (this.gameSettings.directionMode === 'front_to_back') {
      this.effectiveDirection = 'front-to-back';
    } else {
      this.effectiveDirection = 'back-to-front';
    }

    // Auto audio prompt if enabled
    if (this.gameSettings.autoAudio) {
      setTimeout(() => {
        this.playAudio(this.getCurrentPrompt());
      }, 400);
    }

    // Timer mode
    this.clearTimer();
    if (this.gameSettings.timerMode) {
      this.timeLeft = 15;
      this.timerInterval = setInterval(() => {
        if (this.timeLeft > 0) {
          this.timeLeft--;
        } else {
          this.clearTimer();
          this.feedbackType.set('error');
          this.feedbackMessage.set(`انتهى الوقت! الإجابة الصحيحة هي: "${this.getCurrentAnswer()}"`);
          this.streakCount = 0;
          setTimeout(() => {
            this.nextCard();
          }, 1500);
        }
      }, 1000);
    }
  }

  clearTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  getAnswerModeLabel(): string {
    switch (this.gameSettings.answerMode) {
      case 'voice_only': return 'صوت فقط (Gemini AI) 🎙️';
      case 'type_only': return 'كتابة فقط ⌨️';
      case 'both': return 'كتابة أو صوت ⚡';
      case 'random': default: return 'عشوائي منوع 🔀';
    }
  }

  showHint() {
    const ans = this.getCurrentAnswer();
    const firstLetter = ans.charAt(0);
    this.feedbackType.set('success');
    this.feedbackMessage.set(`💡 تلميح: يبدأ بالحرف "${firstLetter}" (عدد الحروف: ${ans.length})`);
  }

  openCreator() {
    this.newDeckTitle = '';
    this.customCards = [{ front: '', back: '' }, { front: '', back: '' }];
    this.gameState.set('create');
  }

  addCustomCard() {
    this.customCards.push({ front: '', back: '' });
  }

  removeCustomCard(index: number) {
    if (this.customCards.length > 1) {
      this.customCards.splice(index, 1);
    }
  }

  saveCustomDeck() {
    if (!this.newDeckTitle.trim()) return;
    const validCards = this.customCards.filter(c => c.front.trim() && c.back.trim());
    if (validCards.length === 0) return;

    const newDeck: Deck = {
      id: 'custom_' + Date.now(),
      title: this.newDeckTitle,
      description: 'مجموعة بطاقات مخصصة أنشأها المستخدم.',
      icon: '✨',
      cards: validCards.map(c => ({ front: c.front, back: c.back, category: 'custom' }))
    };

    this.decks.unshift(newDeck);
    const customDecksOnly = this.decks.filter(d => d.id.startsWith('custom_'));
    localStorage.setItem('super_flashcards_custom_decks', JSON.stringify(customDecksOnly));

    this.openSettings(newDeck);
  }

  flipCard() {
    this.isFlipped = !this.isFlipped;
  }

  getCurrentPrompt() {
    const card = this.activeDeck.cards[this.currentIndex];
    return this.effectiveDirection === 'front-to-back' ? card.front : card.back;
  }

  getCurrentAnswer() {
    const card = this.activeDeck.cards[this.currentIndex];
    return this.effectiveDirection === 'front-to-back' ? card.back : card.front;
  }

  checkAnswer() {
    const answer = this.userInput.toLowerCase().trim();
    if (!answer) return;

    this.clearTimer();
    const correct = this.getCurrentAnswer().toLowerCase().trim();
    
    if (answer === correct) {
      this.streakCount++;
      if (this.streakCount > this.maxStreak) this.maxStreak = this.streakCount;

      this.feedbackType.set('success');
      this.feedbackMessage.set(`إجابة صحيحة! تتابع متواصل: ${this.streakCount} 🔥`);
      setTimeout(() => {
        this.nextCard();
      }, 800);
    } else {
      this.streakCount = 0;
      this.feedbackType.set('error');
      this.feedbackMessage.set(`إجابة خاطئة! الصحيح هو: "${this.getCurrentAnswer()}"`);
    }
  }

  nextCard() {
    this.clearTimer();
    this.userInput = '';
    this.isFlipped = false;
    this.feedbackMessage.set(null);
    if (this.currentIndex < this.activeDeck.cards.length - 1) {
      this.currentIndex++;
      this.setupCardRound();
    } else {
      this.clearTimer();
      this.gameState.set('summary');
    }
  }

  playAudio(text: string) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const isArabic = /[\u0600-\u06FF]/.test(text);
      utterance.lang = isArabic ? 'ar-SA' : 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  }

  async toggleVoiceRecording() {
    if (this.isListening()) {
      this.stopVoiceRecording();
    } else {
      await this.startVoiceRecordingGemini();
    }
  }

  async startVoiceRecordingGemini() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        await this.processAudioWithGemini(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      this.mediaRecorder.start();
      this.isListening.set(true);
      this.feedbackType.set('success');
      this.feedbackMessage.set('🎙️ جاري التسجيل... انطق الكلمة الآن ثم انقر زر الميكروفون مجدداً للإيقاف والتحليل.');
    } catch (e) {
      console.error('Microphone permission error:', e);
      this.feedbackType.set('error');
      this.feedbackMessage.set('تعذر الوصول إلى الميكروفون. يرجى السماح للمتصفح بالوصول للميكروفون.');
      this.isListening.set(false);
    }
  }

  stopVoiceRecording() {
    if (this.mediaRecorder && this.isListening()) {
      this.mediaRecorder.stop();
      this.isListening.set(false);
      this.feedbackMessage.set('⏳ جاري تحليل الصوت باستخدام Google Gemini AI...');
    }
  }

  async processAudioWithGemini(blob: Blob) {
    const apiKey = this.aiKeyManager.getActiveApiKey();
    if (!apiKey) {
      this.feedbackType.set('error');
      this.feedbackMessage.set('مفتاح جوجل API غير متوفر. يرجى إدخاله في الإعدادات.');
      return;
    }

    if (!this.aiKeyManager.checkAndIncrementQuota()) {
      return;
    }

    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: "Listen to this audio recording of a flashcard answer. What word, number, or phrase did the speaker say? Reply ONLY with the exact transcribed word/number, with no extra punctuation or explanation."
                  },
                  {
                    inline_data: {
                      mime_type: "audio/webm",
                      data: base64Data
                    }
                  }
                ]
              }
            ]
          })
        });

        const data = await response.json();
        const transcribedText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

        if (transcribedText) {
          this.userInput = transcribedText.replace(/['".,?!]/g, '');
          this.feedbackType.set('success');
          this.feedbackMessage.set(`تم التعرف على الصوت عبر Gemini: "${this.userInput}"`);
          setTimeout(() => {
            this.checkAnswer();
          }, 400);
        } else {
          this.feedbackType.set('error');
          this.feedbackMessage.set('لم يتبين الصوت بوضوح عبر Gemini AI. حاول مرة أخرى.');
        }
      };
    } catch (e: any) {
      console.error('Gemini audio processing error:', e);
      this.feedbackType.set('error');
      this.feedbackMessage.set('حدث خطأ أثناء معالجة الصوت عبر Gemini AI.');
    }
  }
}
