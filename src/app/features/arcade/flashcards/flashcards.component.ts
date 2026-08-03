import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule, ArrowRight, Sparkles, RotateCcw, Plus, Trash2, CheckCircle2, XCircle, Brain } from 'lucide-angular';

interface Flashcard {
  front: string;
  back: string;
  category: string;
}

@Component({
  selector: 'app-flashcards-game',
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
            <p class="text-slate-400 text-sm max-w-lg mx-auto">اختر مجموعة بطاقات جاهزة (مثل أشهر السنة) أو أنشئ مجموعتك الخاصة لأي شيء تريد حفظه!</p>
          </div>

          <!-- Decks Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div *ngFor="let deck of decks" (click)="selectDeck(deck.id)" class="group cursor-pointer bg-black/40 border border-white/5 hover:border-indigo-500/50 p-6 rounded-3xl transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between">
              <div>
                <div class="text-3xl mb-3">{{ deck.icon }}</div>
                <h3 class="text-xl font-bold text-white group-hover:text-indigo-300 transition-colors">{{ deck.title }}</h3>
                <p class="text-xs text-slate-400 mt-1">{{ deck.description }}</p>
              </div>
              <div class="mt-6 flex items-center justify-between text-xs text-indigo-400 font-bold">
                <span>{{ deck.cards.length }} بطاقة</span>
                <span>ابدأ التدريب ←</span>
              </div>
            </div>
          </div>

          <!-- Custom Deck Creator Button -->
          <button (click)="openCreator()" class="w-full h-14 bg-white/5 hover:bg-white/10 border border-dashed border-indigo-500/40 text-indigo-300 hover:text-white rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2">
            <lucide-icon [img]="Plus" class="w-5 h-5"></lucide-icon>
            إنشاء مجموعة بطاقات مخصصة جديدة ⚡
          </button>
        </div>

        <!-- 2. CUSTOM DECK CREATOR STAGE -->
        <div *ngIf="gameState() === 'create'" class="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl space-y-8 animate-in zoom-in-95 duration-300">
          <div class="flex items-center justify-between">
            <h2 class="text-2xl font-black text-white">إعداد مجموعة بطاقات مخصصة</h2>
            <button (click)="gameState.set('select')" class="text-xs text-slate-400 hover:text-white">إلغاء</button>
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
                <button *ngIf="customCards.length > 1" (click)="removeCustomCard(i)" class="text-red-400 hover:bg-red-500/10 p-2 rounded-xl">
                  <lucide-icon [img]="Trash2" class="w-4 h-4"></lucide-icon>
                </button>
              </div>
              <button (click)="addCustomCard()" class="text-xs text-indigo-400 hover:text-indigo-300 font-bold">+ إضافة بطاقة أخرى</button>
            </div>
          </div>

          <button (click)="saveCustomDeck()" class="w-full h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-sm transition-all shadow-lg shadow-indigo-600/30">
            حفظ وبدء اللعب 🚀
          </button>
        </div>

        <!-- 3. PLAYING STAGE (FLASHCARD VIEW) -->
        <div *ngIf="gameState() === 'playing'" class="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl space-y-8 text-center animate-in zoom-in-95 duration-300">
          
          <!-- Progress & Mode info -->
          <div class="flex items-center justify-between text-xs text-slate-400 font-bold">
            <span>البطاقة {{ currentIndex + 1 }} من {{ activeDeck.cards.length }}</span>
            <span class="bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full border border-indigo-500/20">{{ activeDeck.title }}</span>
          </div>

          <!-- Direction Toggle -->
          <div class="flex justify-center gap-3">
            <button (click)="quizMode = 'front-to-back'" [ngClass]="quizMode === 'front-to-back' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400'" class="px-4 py-2 rounded-xl text-xs font-bold transition-all">
              الوجه ← الظهر (عرض الاسم واكتب الرقم/المعنى)
            </button>
            <button (click)="quizMode = 'back-to-front'" [ngClass]="quizMode === 'back-to-front' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400'" class="px-4 py-2 rounded-xl text-xs font-bold transition-all">
              الظهر ← الوجه (عرض الرقم واكتب الاسم)
            </button>
          </div>

          <!-- The Flashcard -->
          <div (click)="flipCard()" class="w-full aspect-[16/9] bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-indigo-500/30 rounded-[2.5rem] p-8 flex flex-col items-center justify-center cursor-pointer shadow-2xl relative overflow-hidden group hover:border-indigo-500 transition-all">
            
            <div class="absolute top-4 right-6 text-xs text-slate-500 font-mono">
              اضغط على البطاقة لقلبها ⟳
            </div>

            <div class="space-y-4">
              <span class="text-xs font-bold text-indigo-300 uppercase tracking-widest">
                {{ !isFlipped ? (quizMode === 'front-to-back' ? 'ما هو المقابل لـ:' : 'ما هو المقابل لـ:') : 'الإجابة الصحيحة:' }}
              </span>
              
              <div class="text-4xl md:text-6xl font-black text-white font-mono tracking-wide">
                {{ !isFlipped ? getCurrentPrompt() : getCurrentAnswer() }}
              </div>
            </div>
          </div>

          <!-- User Input / Guess Section -->
          <div class="space-y-4 max-w-md mx-auto">
            <div class="relative">
              <input 
                type="text" 
                [(ngModel)]="userInput" 
                (keyup.enter)="checkAnswer()"
                placeholder="اكتب إجابتك هنا..." 
                class="w-full h-14 bg-white/5 border-2 border-white/10 rounded-2xl px-6 text-base text-white text-center focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
            <div class="flex gap-3">
              <button (click)="checkAnswer()" class="flex-1 h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl text-sm transition-all shadow-lg shadow-indigo-600/20">
                تحقق من الإجابة ✓
              </button>
              <button (click)="nextCard()" class="h-12 px-6 bg-white/5 hover:bg-white/10 text-slate-300 font-bold rounded-2xl text-sm transition-all">
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
              <span class="text-xs text-slate-500 block">إجمالي البطاقات</span>
              <span class="text-2xl font-black text-white font-mono">{{ activeDeck.cards.length }}</span>
            </div>
            <div class="h-10 w-px bg-white/10"></div>
            <div>
              <span class="text-xs text-slate-500 block">الحالة</span>
              <span class="text-2xl font-black text-emerald-400">مكتمل 🎯</span>
            </div>
          </div>

          <div class="flex gap-4 max-w-md mx-auto pt-4">
            <button (click)="gameState.set('select')" class="flex-1 h-14 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2">
              <lucide-icon [img]="RotateCcw" class="w-4 h-4"></lucide-icon>
              اختر مجموعة أخرى
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
export class FlashcardsComponent {
  private router = inject(Router);

  ArrowRight = ArrowRight;
  Sparkles = Sparkles;
  RotateCcw = RotateCcw;
  Plus = Plus;
  Trash2 = Trash2;
  CheckCircle2 = CheckCircle2;
  XCircle = XCircle;
  Brain = Brain;

  gameState = signal<'select' | 'create' | 'playing' | 'summary'>('select');

  // Predefined Decks (Months & Numbers by default)
  decks: Array<{ id: string; title: string; description: string; icon: string; cards: Flashcard[] }> = [
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
    }
  ];

  activeDeck: any = this.decks[0];
  currentIndex = 0;
  isFlipped = false;
  quizMode: 'front-to-back' | 'back-to-front' = 'front-to-back';
  userInput = '';

  // Custom Deck Creator State
  newDeckTitle = '';
  customCards: Array<{ front: string; back: string }> = [{ front: '', back: '' }];

  goBack() {
    this.router.navigate(['/arcade']);
  }

  selectDeck(deckId: string) {
    const found = this.decks.find(d => d.id === deckId);
    if (found) {
      this.activeDeck = JSON.parse(JSON.stringify(found));
      this.currentIndex = 0;
      this.isFlipped = false;
      this.userInput = '';
      this.gameState.set('playing');
    }
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
    if (!this.newDeckTitle.trim()) {
      alert('يرجى إدخال عنوان للمجموعة');
      return;
    }
    const validCards = this.customCards.filter(c => c.front.trim() && c.back.trim());
    if (validCards.length === 0) {
      alert('يرجى إدخال بطاقة واحدة على الأقل بالوجه والظهر');
      return;
    }

    const newDeck = {
      id: 'custom_' + Date.now(),
      title: this.newDeckTitle,
      description: 'مجموعة بطاقات مخصصة أنشأها المستخدم.',
      icon: '✨',
      cards: validCards.map(c => ({ front: c.front, back: c.back, category: 'custom' }))
    };

    this.decks.unshift(newDeck);
    this.selectDeck(newDeck.id);
  }

  flipCard() {
    this.isFlipped = !this.isFlipped;
  }

  getCurrentPrompt() {
    const card = this.activeDeck.cards[this.currentIndex];
    return this.quizMode === 'front-to-back' ? card.front : card.back;
  }

  getCurrentAnswer() {
    const card = this.activeDeck.cards[this.currentIndex];
    return this.quizMode === 'front-to-back' ? card.back : card.front;
  }

  checkAnswer() {
    const answer = this.userInput.toLowerCase().trim();
    if (!answer) return;

    const correct = this.getCurrentAnswer().toLowerCase().trim();
    if (answer === correct) {
      alert('إجابة صحيحة! ممتاز 🌟');
      this.nextCard();
    } else {
      alert(`إجابة خاطئة! الصحيح هو: "${this.getCurrentAnswer()}"`);
    }
  }

  nextCard() {
    this.userInput = '';
    this.isFlipped = false;
    if (this.currentIndex < this.activeDeck.cards.length - 1) {
      this.currentIndex++;
    } else {
      this.gameState.set('summary');
    }
  }
}
