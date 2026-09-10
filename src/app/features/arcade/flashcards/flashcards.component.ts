import { Component, signal, inject, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { 
  LucideAngularModule, ArrowRight, Sparkles, RotateCcw, Plus, Trash2, 
  CheckCircle2, XCircle, Brain, Volume2, Settings, Mic, Keyboard, 
  Lightbulb, Clock, Flame, Image as ImageIcon, Music, Code, Eye, 
  Play, Pause, Shuffle, Layers, Check, HelpCircle, UploadCloud
} from 'lucide-angular';
import { AiKeyManagerService } from '../../../core/services/ai-key-manager.service';
import { ArcadeCloudService } from '../../../core/services/arcade-cloud.service';

export interface FlashcardSideData {
  textVariants: string[];     // Alternative text phrases / synonyms (e.g. ["Apple", "تفاحة"])
  imageVariants: string[];    // Array of Image URLs or Data URLs
  audioVariants: string[];    // Array of Audio URLs or Data URLs
  svgVariants: string[];      // Array of raw <svg>...</svg> strings
}

export interface Flashcard {
  id?: string;
  front: string; // Primary front text
  back: string;  // Primary back text
  category: string;
  frontData?: FlashcardSideData;
  backData?: FlashcardSideData;
  distractors?: string[];
}

export interface Deck {
  id: string;
  title: string;
  description: string;
  icon: string;
  cards: Flashcard[];
  isCustom?: boolean;
}

export type AnswerMode = 'multiple_choice' | 'random' | 'voice_only' | 'type_only' | 'both';

export interface GameSettings {
  answerMode: AnswerMode;
  directionMode: 'random' | 'front_to_back' | 'back_to_front';
  autoAudio: boolean;
  timerMode: boolean;
}

interface ActiveSideDisplay {
  text: string;
  imageUrl: string | null;
  audioUrl: string | null;
  rawSvg: string | null;
  svgHtml: SafeHtml | null;
}

interface ChoiceOption {
  id: number;
  text: string;
  isCorrect: boolean;
}

@Component({
  selector: 'app-flashcards-game',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="min-h-screen bg-slate-950 text-white p-4 md:p-8 flex flex-col items-center justify-start select-none font-sans relative overflow-x-hidden" dir="rtl">
      
      <!-- THEMATIC BACKGROUND WALLPAPER -->
      <div class="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-80 filter brightness-105 pointer-events-none z-0" 
           style="background-image: url('assets/images/flashcards-bg.png');"></div>

      <!-- FLOATING SYMBOLS OVERLAY -->
      <div class="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-25 select-none text-4xl flex flex-wrap gap-16 p-8">
        <span>🎴</span><span>🖼️</span><span>🎙️</span><span>⚡</span><span>🧠</span><span>📐</span><span>💡</span><span>🏆</span>
      </div>

      <!-- Contrast Gradient -->
      <div class="fixed inset-0 bg-gradient-to-b from-slate-950/50 via-slate-950/40 to-slate-950/80 pointer-events-none z-0"></div>

      <!-- Top Header Navigation -->
      <div class="w-full max-w-6xl flex items-center justify-between mb-6 border-b border-white/10 pb-4 relative z-10">
        <button (click)="goBack()" class="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white px-5 py-2.5 rounded-2xl transition-all font-bold text-sm cursor-pointer border border-white/10 shadow-lg">
          <lucide-icon [img]="ArrowRight" class="w-4 h-4"></lucide-icon>
          العودة لمعرض الألعاب
        </button>
        <div class="flex items-center gap-3">
          <div class="bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-2 shadow-inner">
            <lucide-icon [img]="Brain" class="w-4 h-4 text-indigo-400"></lucide-icon>
            لعبة البطاقات التفاعلية FlipIt 🎴✨
          </div>
        </div>
      </div>

      <!-- MAIN CONTAINER -->
      <div class="w-full max-w-6xl relative z-10">

        <!-- ================= 1. DECK SELECTION SCREEN ================= -->
        <div *ngIf="gameState() === 'select'" class="space-y-8 animate-in zoom-in-95 duration-300">
          
          <!-- HERO BANNER -->
          <div class="relative bg-gradient-to-br from-indigo-900/60 via-slate-900/95 to-slate-950 border-2 border-indigo-500/30 rounded-[2.5rem] p-6 md:p-10 shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div class="lg:col-span-7 space-y-5 text-right">
              <div class="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-400/30 text-indigo-300 px-4 py-1.5 rounded-full text-xs font-black shadow-lg">
                <lucide-icon [img]="Sparkles" class="w-4 h-4 text-amber-300"></lucide-icon>
                <span>استوديو البطاقات متعددة الوسائط 🎨🎙️🖼️</span>
              </div>

              <h1 class="text-3xl md:text-4xl font-black bg-gradient-to-r from-amber-200 via-white to-cyan-200 bg-clip-text text-transparent leading-tight">
                FlipIt 🎴✨ - بطاقات تفاعلية ذكية
              </h1>

              <p class="text-slate-300 text-xs md:text-sm leading-relaxed">
                أنشئ وتدرّب على بطاقات تدعم <strong class="text-indigo-300">الصور، التسجيلات الصوتية، وأكواد SVG</strong> مع توليد عشوائي للمرادفات، ونظام خيارات اختيار من متعدد 🔘 ذكي وسريع!
              </p>

              <!-- FEATURES PILLS -->
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs font-bold">
                <div class="bg-black/40 border border-white/10 p-2.5 rounded-2xl flex items-center gap-2 text-indigo-300">
                  <span class="text-lg">🔘</span>
                  <span>نظام خيارات سهل</span>
                </div>
                <div class="bg-black/40 border border-white/10 p-2.5 rounded-2xl flex items-center gap-2 text-emerald-300">
                  <span class="text-lg">🖼️</span>
                  <span>صور متعددة</span>
                </div>
                <div class="bg-black/40 border border-white/10 p-2.5 rounded-2xl flex items-center gap-2 text-purple-300">
                  <span class="text-lg">🎙️</span>
                  <span>تسجيل صوتي</span>
                </div>
                <div class="bg-black/40 border border-white/10 p-2.5 rounded-2xl flex items-center gap-2 text-amber-300">
                  <span class="text-lg">⚡</span>
                  <span>رسوم SVG حية</span>
                </div>
              </div>
            </div>

            <!-- Demo Card Preview -->
            <div class="lg:col-span-5 flex flex-col items-center justify-center">
              <div (click)="toggleHeroCard()" class="w-full max-w-sm group cursor-pointer bg-gradient-to-br from-indigo-800/90 via-slate-800 to-indigo-950 border-2 border-indigo-400/50 hover:border-amber-400 rounded-[2.5rem] p-6 shadow-2xl transition-all duration-300 transform hover:scale-[1.02] text-center">
                <div class="text-[10px] bg-amber-400/20 text-amber-300 px-3 py-1 rounded-full font-mono font-bold border border-amber-400/30 inline-block mb-3">
                  انقر لقلب البطاقة ⟳
                </div>
                <div class="text-2xl md:text-3xl font-black text-white font-mono my-2 min-h-[3rem] flex items-center justify-center">
                  {{ heroCardFlipped ? '1 (الشهر الأول) 🎯' : 'January 📅' }}
                </div>
                <div class="text-[11px] text-slate-400 font-bold border-t border-white/10 pt-2.5">
                  <span>{{ heroCardFlipped ? 'الظهر (الإجابة)' : 'الوجه (السؤال والوسائط)' }}</span>
                </div>
              </div>
            </div>

          </div>

          <!-- DECKS HEADER -->
          <div class="flex items-center justify-between px-2 pt-2">
            <div>
              <h2 class="text-2xl font-black text-white flex items-center gap-3">
                <span>🎴</span>
                <span>اختر مجموعة البطاقات لبدء التحدي:</span>
              </h2>
              <p class="text-xs text-slate-400 mt-1">تتضمن المجموعات دعماً كاملاً للوسائط والتنويع العشوائي ونظام الخيارات</p>
            </div>
            <span class="text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-4 py-2 rounded-full font-bold shadow">
              {{ decks.length }} مجموعات
            </span>
          </div>

          <!-- DECKS GRID -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div *ngFor="let deck of decks" (click)="openSettings(deck)" 
                 class="group cursor-pointer bg-slate-900/90 border-2 border-white/10 hover:border-indigo-400/80 p-6 rounded-[2.2rem] shadow-2xl hover:shadow-indigo-500/20 transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between relative overflow-hidden">
              
              <div>
                <div class="flex items-center justify-between mb-4">
                  <div class="size-14 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform">
                    {{ deck.icon }}
                  </div>
                  <span class="text-xs px-3 py-1 rounded-full border font-black shadow bg-indigo-500/20 text-indigo-300 border-indigo-500/40">
                    {{ deck.id === 'years' ? 'عشوائي متجدد ⚡' : deck.cards.length + ' بطاقات' }}
                  </span>
                </div>

                <h3 class="text-xl font-black text-white group-hover:text-indigo-300 transition-colors leading-tight">{{ deck.title }}</h3>
                <p class="text-xs text-slate-400 mt-2 leading-relaxed min-h-[2.5rem]">{{ deck.description }}</p>

                <!-- Cards Sample Preview -->
                <div class="mt-4 pt-3 border-t border-white/10 space-y-2">
                  <span class="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">عينات من المحتوى:</span>
                  <div class="flex flex-wrap gap-1.5 text-xs">
                    <span *ngFor="let card of deck.cards.slice(0, 3)" class="bg-indigo-950/80 border border-indigo-500/30 text-indigo-200 px-2.5 py-1 rounded-xl font-mono text-[11px]">
                      {{ card.front }} ↔️ {{ card.back }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="mt-6 flex items-center justify-between pt-3 border-t border-white/10">
                <span class="text-[11px] text-slate-400 font-bold">خيارات / صوت / كتابة</span>
                <span class="flex items-center gap-1.5 bg-indigo-600 group-hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-black transition-all shadow-lg">
                  <lucide-icon [img]="Settings" class="w-3.5 h-3.5"></lucide-icon>
                  بدء الإعداد ⚙️
                </span>
              </div>
            </div>
          </div>

          <!-- CREATE CUSTOM DECK BANNER -->
          <div (click)="openCreator()" class="group cursor-pointer bg-gradient-to-r from-indigo-900/60 via-slate-900 to-purple-900/60 border-2 border-dashed border-indigo-500/50 hover:border-indigo-400 p-6 md:p-8 rounded-[2.2rem] transition-all duration-300 hover:scale-[1.01] shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div class="flex items-center gap-4 text-right">
              <div class="size-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-3xl shrink-0">
                ➕
              </div>
              <div>
                <h3 class="text-lg md:text-xl font-black text-white group-hover:text-indigo-300 transition-colors">إنشاء مجموعة وسائط مخصصة (صور، أصوات، SVG، خيارات) ⚡</h3>
                <p class="text-xs text-slate-300 mt-1">أضف بطاقاتك الخاصة وضع لكل بطاقة أكثر من صورة وصوت وكلمة لتظهر عشوائياً في كل جولة!</p>
              </div>
            </div>
            <button class="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3.5 rounded-2xl text-xs font-black transition-all shadow-xl shadow-indigo-600/40 shrink-0 cursor-pointer flex items-center gap-2">
              <lucide-icon [img]="Plus" class="w-4 h-4"></lucide-icon>
              إنشاء مجموعة متقدمة
            </button>
          </div>

        </div>

        <!-- ================= 2. GAME SETTINGS MODAL ================= -->
        <div *ngIf="gameState() === 'settings'" class="bg-slate-900/95 border-2 border-white/10 rounded-[2.5rem] p-6 md:p-10 shadow-2xl space-y-6 animate-in zoom-in-95 duration-300">
          
          <div class="flex flex-col md:flex-row md:items-center justify-between border-b border-white/10 pb-4 gap-4">
            <div class="flex items-center gap-4">
              <div class="size-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-3xl shadow-inner">
                {{ selectedDeckForPlay?.icon }}
              </div>
              <div>
                <h2 class="text-xl md:text-2xl font-black text-white">إعدادات تحدي: {{ selectedDeckForPlay?.title }}</h2>
                <p class="text-xs text-slate-400 mt-1">خصص أسلوب الاختبار ونظام الإجابة المناسب لك</p>
              </div>
            </div>
            <button (click)="gameState.set('select')" class="text-xs text-slate-300 hover:text-white cursor-pointer bg-white/10 hover:bg-white/20 border border-white/10 px-4 py-2 rounded-xl font-bold transition-all self-start md:self-auto">
              ← الرجوع للمجموعات
            </button>
          </div>

          <div class="space-y-5">
            <!-- 1. Answer Method Selection -->
            <div class="space-y-2.5">
              <label class="text-xs font-bold text-indigo-300 flex items-center gap-2">
                <lucide-icon [img]="Brain" class="w-4 h-4"></lucide-icon>
                طريقة التحدي والإجابة (موصى به: نظام الخيارات 🔘)
              </label>
              <div class="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                
                <!-- 1. Multiple Choice (Recommended / Easiest) -->
                <button (click)="gameSettings.answerMode = 'multiple_choice'" 
                        [ngClass]="gameSettings.answerMode === 'multiple_choice' ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-400 shadow-xl scale-[1.02]' : 'bg-black/40 text-slate-300 border-white/5 hover:bg-white/5'" 
                        class="p-3.5 rounded-2xl border text-xs font-black transition-all cursor-pointer flex flex-col items-center gap-1.5 text-center relative">
                  <span class="absolute -top-2 left-2 bg-amber-400 text-slate-950 text-[9px] px-1.5 py-0.5 rounded-full font-black">الأسهل ⚡</span>
                  <span class="text-2xl">🔘</span>
                  <span>نظام الخيارات (4 خيارات)</span>
                </button>

                <!-- 2. Random Mode -->
                <button (click)="gameSettings.answerMode = 'random'" 
                        [ngClass]="gameSettings.answerMode === 'random' ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg' : 'bg-black/40 text-slate-400 border-white/5 hover:bg-white/5'" 
                        class="p-3.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1.5 text-center">
                  <span class="text-2xl">🔀</span>
                  <span>عشوائي منوع</span>
                </button>

                <!-- 3. Type Only -->
                <button (click)="gameSettings.answerMode = 'type_only'" 
                        [ngClass]="gameSettings.answerMode === 'type_only' ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg' : 'bg-black/40 text-slate-400 border-white/5 hover:bg-white/5'" 
                        class="p-3.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1.5 text-center">
                  <span class="text-2xl">⌨️</span>
                  <span>كتابة فقط</span>
                </button>

                <!-- 4. Voice Only -->
                <button (click)="gameSettings.answerMode = 'voice_only'" 
                        [ngClass]="gameSettings.answerMode === 'voice_only' ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg' : 'bg-black/40 text-slate-400 border-white/5 hover:bg-white/5'" 
                        class="p-3.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1.5 text-center">
                  <span class="text-2xl">🎙️</span>
                  <span>صوت فقط (AI)</span>
                </button>

                <!-- 5. Both Mode -->
                <button (click)="gameSettings.answerMode = 'both'" 
                        [ngClass]="gameSettings.answerMode === 'both' ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg' : 'bg-black/40 text-slate-400 border-white/5 hover:bg-white/5'" 
                        class="p-3.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1.5 text-center">
                  <span class="text-2xl">⚡</span>
                  <span>كتابة أو صوت</span>
                </button>
              </div>
            </div>

            <!-- 2. Direction Mode -->
            <div class="space-y-2.5">
              <label class="text-xs font-bold text-indigo-300 flex items-center gap-2">
                <lucide-icon [img]="Shuffle" class="w-4 h-4"></lucide-icon>
                اتجاه عرض السؤال والإجابة
              </label>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button (click)="gameSettings.directionMode = 'random'" 
                        [ngClass]="gameSettings.directionMode === 'random' ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg' : 'bg-black/40 text-slate-400 border-white/5 hover:bg-white/5'" 
                        class="p-3.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2">
                  <span>🔀 عشوائي لكل بطاقة</span>
                </button>
                <button (click)="gameSettings.directionMode = 'front_to_back'" 
                        [ngClass]="gameSettings.directionMode === 'front_to_back' ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg' : 'bg-black/40 text-slate-400 border-white/5 hover:bg-white/5'" 
                        class="p-3.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2">
                  <span>الوجه ← الظهر</span>
                </button>
                <button (click)="gameSettings.directionMode = 'back_to_front'" 
                        [ngClass]="gameSettings.directionMode === 'back_to_front' ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg' : 'bg-black/40 text-slate-400 border-white/5 hover:bg-white/5'" 
                        class="p-3.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2">
                  <span>الظهر ← الوجه</span>
                </button>
              </div>
            </div>

            <!-- 3. Extra Options -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <label class="flex items-center justify-between p-3.5 bg-black/40 border border-white/5 rounded-2xl cursor-pointer hover:border-indigo-500/30">
                <div class="flex items-center gap-3">
                  <span class="text-xl">🔊</span>
                  <div>
                    <span class="text-xs font-bold block text-white">نطق صوتي تلقائي</span>
                    <span class="text-[10px] text-slate-400">تشغيل الصوت تلقائياً عند ظهور كل بطاقة</span>
                  </div>
                </div>
                <input type="checkbox" [(ngModel)]="gameSettings.autoAudio" class="w-5 h-5 accent-indigo-600 rounded cursor-pointer" />
              </label>

              <label class="flex items-center justify-between p-3.5 bg-black/40 border border-white/5 rounded-2xl cursor-pointer hover:border-indigo-500/30">
                <div class="flex items-center gap-3">
                  <span class="text-xl">⏱️</span>
                  <div>
                    <span class="text-xs font-bold block text-white">تحدي الوقت (15 ثانية)</span>
                    <span class="text-[10px] text-slate-400">مؤقت تنازلي سريع لكل بطاقة</span>
                  </div>
                </div>
                <input type="checkbox" [(ngModel)]="gameSettings.timerMode" class="w-5 h-5 accent-indigo-600 rounded cursor-pointer" />
              </label>
            </div>
          </div>

          <button (click)="startPlaying()" class="w-full h-14 bg-gradient-to-r from-indigo-600 via-purple-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 text-white rounded-2xl font-black text-sm transition-all shadow-xl shadow-indigo-600/40 cursor-pointer flex items-center justify-center gap-2">
            <span>ابدأ التحدي الآن 🚀</span>
          </button>
        </div>

        <!-- ================= 3. ADVANCED MULTI-MODAL DECK CREATOR ================= -->
        <div *ngIf="gameState() === 'create'" class="bg-slate-900 border border-white/10 rounded-[2.5rem] p-6 md:p-10 shadow-2xl space-y-6 animate-in zoom-in-95 duration-300">
          
          <div class="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h2 class="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                <span>🎨🎙️</span>
                <span>استوديو إعداد مجموعة البطاقات والوسائط المتعددة</span>
              </h2>
              <p class="text-xs text-slate-400 mt-1">أدخل نصوصاً، صوراً، تسجيلات صوتية، أو أكواد SVG مع تنويع عشوائي تلقائي</p>
            </div>
            <button (click)="gameState.set('select')" class="text-xs bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white px-4 py-2 rounded-xl font-bold cursor-pointer transition-all">إلغاء</button>
          </div>

          <!-- Deck Info -->
          <div class="space-y-4">
            <div>
              <label class="text-xs font-bold text-slate-300 block mb-1.5">عنوان المجموعة</label>
              <input type="text" [(ngModel)]="newDeckTitle" placeholder="مثال: مفردات إنجليزية مصورة، أشكال هندسية..." class="w-full h-12 bg-black/40 border border-white/10 rounded-2xl px-4 text-xs text-white focus:outline-none focus:border-indigo-500" />
            </div>

            <!-- Cards List with Rich Media Panels -->
            <div class="space-y-6 pt-2">
              <div class="flex items-center justify-between">
                <label class="text-xs font-black text-indigo-300 block">قائمة البطاقات والوسائط ({{ creatorCards.length }})</label>
                <span class="text-[11px] text-slate-400">يمكنك وضع أكثر من صورة أو صوت لكل بطاقة ليتم التبديل عشوائياً</span>
              </div>

              <div *ngFor="let card of creatorCards; let i = index" class="bg-black/30 border border-white/10 p-5 rounded-3xl space-y-4 shadow-xl relative">
                
                <!-- Card Header -->
                <div class="flex items-center justify-between border-b border-white/5 pb-3">
                  <div class="flex items-center gap-2 font-mono text-xs font-bold text-indigo-400">
                    <span class="size-6 rounded-lg bg-indigo-500/20 flex items-center justify-center">#{{ i + 1 }}</span>
                    <span>بطاقة رقم {{ i + 1 }}</span>
                  </div>

                  <div class="flex items-center gap-2">
                    <button (click)="toggleCardMediaStudio(i)" 
                            [ngClass]="card.isExpanded ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white'" 
                            class="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-white/5">
                      <lucide-icon [img]="Sparkles" class="w-3.5 h-3.5"></lucide-icon>
                      <span>{{ card.isExpanded ? 'إخفاء استوديو الوسائط' : '🎨 إضافة صور / صوت / SVG' }}</span>
                    </button>

                    <button *ngIf="creatorCards.length > 1" (click)="removeCreatorCard(i)" class="text-red-400 hover:bg-red-500/10 p-1.5 rounded-xl cursor-pointer transition-all" title="حذف البطاقة">
                      <lucide-icon [img]="Trash2" class="w-4 h-4"></lucide-icon>
                    </button>
                  </div>
                </div>

                <!-- Primary Text Inputs (Always Available) -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label class="text-[11px] font-bold text-slate-400 block mb-1">الوجه (السؤال / الكلمة الأساسية):</label>
                    <input type="text" [(ngModel)]="card.front" placeholder="مثال: Apple" class="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-3 text-xs text-white text-right focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label class="text-[11px] font-bold text-slate-400 block mb-1">الظهر (الإجابة الصحيحة):</label>
                    <input type="text" [(ngModel)]="card.back" placeholder="مثال: تفاحة" class="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-3 text-xs text-white text-right focus:outline-none focus:border-indigo-500" />
                  </div>
                </div>

                <!-- EXPANDED RICH MEDIA STUDIO FOR THIS CARD -->
                <div *ngIf="card.isExpanded" class="p-4 bg-slate-900/90 border border-indigo-500/30 rounded-2xl space-y-5 animate-in slide-in-from-top-2 duration-300">
                  
                  <!-- Tabs to switch between Front Media and Back Media -->
                  <div class="flex items-center justify-between border-b border-white/10 pb-2">
                    <div class="flex gap-2">
                      <button (click)="card.activeSideTab = 'front'" 
                              [ngClass]="card.activeSideTab === 'front' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white'" 
                              class="px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer">
                        وسائط الوجه (Front)
                      </button>
                      <button (click)="card.activeSideTab = 'back'" 
                              [ngClass]="card.activeSideTab === 'back' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white'" 
                              class="px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer">
                        وسائط الظهر (Back)
                      </button>
                    </div>
                    <span class="text-[10px] text-indigo-300 font-mono">الوسائط المضافة ستُعرض عشوائياً في الجولات</span>
                  </div>

                  <!-- ACTIVE SIDE MEDIA CONTROLS -->
                  <div class="space-y-4">
                    
                    <!-- 1. Text Synonyms / Alternatives -->
                    <div class="space-y-2">
                      <div class="flex items-center justify-between">
                        <span class="text-[11px] font-bold text-indigo-300 flex items-center gap-1.5">
                          <span>🔤</span> كلمات / مرادفات بديلة (تُقبل كإجابات صحيحة أو تُعرض عشوائياً):
                        </span>
                        <button (click)="addTextVariant(card, card.activeSideTab)" class="text-[10px] text-indigo-400 hover:text-indigo-300 font-black cursor-pointer">+ إضافة مرادف</button>
                      </div>
                      <div class="flex flex-wrap gap-2">
                        <div *ngFor="let txt of getSideData(card, card.activeSideTab).textVariants; let ti = index" class="flex items-center gap-1 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
                          <input type="text" [(ngModel)]="getSideData(card, card.activeSideTab).textVariants[ti]" class="bg-transparent border-none text-xs text-white focus:outline-none w-24 text-right" />
                          <button (click)="removeTextVariant(card, card.activeSideTab, ti)" class="text-red-400 hover:text-red-300 text-xs cursor-pointer">✕</button>
                        </div>
                      </div>
                    </div>

                    <!-- 2. Images (Upload / URL / Gallery) -->
                    <div class="space-y-2">
                      <div class="flex items-center justify-between">
                        <span class="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
                          <lucide-icon [img]="ImageIcon" class="w-3.5 h-3.5"></lucide-icon>
                          صور البطاقة (يتم اختيار واحدة عشوائياً):
                        </span>
                        <label class="text-[10px] bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30 px-2.5 py-1 rounded-lg font-black cursor-pointer flex items-center gap-1">
                          <lucide-icon [img]="UploadCloud" class="w-3 h-3"></lucide-icon>
                          رفع صورة 📁
                          <input type="file" accept="image/*" (change)="handleImageUpload($event, card, card.activeSideTab)" class="hidden" />
                        </label>
                      </div>

                      <div class="flex items-center gap-2">
                        <input type="text" [(ngModel)]="card.tempImageUrl" placeholder="أو الصق رابط صورة مباشرة..." class="flex-1 h-9 bg-white/5 border border-white/10 rounded-xl px-3 text-xs text-white" />
                        <button (click)="addImageUrl(card, card.activeSideTab)" class="h-9 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer">إضافة رابط</button>
                      </div>

                      <!-- Image Thumbnails Preview -->
                      <div *ngIf="getSideData(card, card.activeSideTab).imageVariants.length > 0" class="flex flex-wrap gap-2 pt-1">
                        <div *ngFor="let imgUrl of getSideData(card, card.activeSideTab).imageVariants; let imgIdx = index" class="relative size-16 rounded-xl overflow-hidden border border-emerald-500/40 group">
                          <img [src]="imgUrl" class="w-full h-full object-cover" />
                          <button (click)="removeImageVariant(card, card.activeSideTab, imgIdx)" class="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center text-red-400 font-bold transition-opacity cursor-pointer">
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>

                    <!-- 3. Audio (Record Live Voice / URL / Upload) -->
                    <div class="space-y-2">
                      <div class="flex items-center justify-between">
                        <span class="text-[11px] font-bold text-purple-300 flex items-center gap-1.5">
                          <lucide-icon [img]="Music" class="w-3.5 h-3.5"></lucide-icon>
                          أصوات وتسجيلات (يتم تشغيل صوت عشوائي):
                        </span>
                        
                        <!-- Live Record Button -->
                        <button (click)="toggleLiveVoiceRecording(card, card.activeSideTab)" 
                                [ngClass]="isRecordingSideVoice() && activeRecordingCardIndex === i ? 'bg-red-500 animate-pulse text-white' : 'bg-purple-600/20 border border-purple-500/40 text-purple-300 hover:bg-purple-600/30'" 
                                class="text-[10px] px-2.5 py-1 rounded-lg font-black cursor-pointer flex items-center gap-1 transition-all">
                          <lucide-icon [img]="Mic" class="w-3 h-3"></lucide-icon>
                          <span>{{ isRecordingSideVoice() && activeRecordingCardIndex === i ? '⏹️ إيقاف وحفظ التسجيل' : '🔴 تسجيل صوتك بالميكروفون' }}</span>
                        </button>
                      </div>

                      <div class="flex items-center gap-2">
                        <input type="text" [(ngModel)]="card.tempAudioUrl" placeholder="أو الصق رابط ملف صوتي (MP3/WAV)..." class="flex-1 h-9 bg-white/5 border border-white/10 rounded-xl px-3 text-xs text-white" />
                        <button (click)="addAudioUrl(card, card.activeSideTab)" class="h-9 px-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold cursor-pointer">إضافة صوت</button>
                      </div>

                      <!-- Audio Clips Preview List -->
                      <div *ngIf="getSideData(card, card.activeSideTab).audioVariants.length > 0" class="flex flex-wrap gap-2 pt-1">
                        <div *ngFor="let audUrl of getSideData(card, card.activeSideTab).audioVariants; let audIdx = index" class="flex items-center gap-2 bg-purple-950/60 border border-purple-500/30 px-3 py-1.5 rounded-xl text-xs font-mono text-purple-200">
                          <button (click)="playAudioClip(audUrl)" class="size-6 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center cursor-pointer">▶</button>
                          <span>تسجيل صوتي #{{ audIdx + 1 }}</span>
                          <button (click)="removeAudioVariant(card, card.activeSideTab, audIdx)" class="text-red-400 hover:text-red-300 font-bold ml-1 cursor-pointer">✕</button>
                        </div>
                      </div>
                    </div>

                    <!-- 4. SVG Vector Code -->
                    <div class="space-y-2">
                      <div class="flex items-center justify-between">
                        <span class="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                          <lucide-icon [img]="Code" class="w-3.5 h-3.5"></lucide-icon>
                          كود رسومي SVG (رسم مخصص):
                        </span>
                        <button (click)="addSvgVariant(card, card.activeSideTab)" class="text-[10px] bg-amber-600/20 border border-amber-500/40 text-amber-300 hover:bg-amber-600/30 px-2.5 py-1 rounded-lg font-black cursor-pointer">+ إضافة كود SVG</button>
                      </div>

                      <div class="space-y-2">
                        <textarea [(ngModel)]="card.tempSvgCode" placeholder="الصق كود <svg>...</svg> هنا لإنشاء شكل هندسي أو رسم توضيحي..." class="w-full h-16 bg-white/5 border border-white/10 rounded-xl p-2.5 text-[11px] font-mono text-amber-200 focus:outline-none focus:border-amber-500"></textarea>
                        
                        <!-- SVG Preview List -->
                        <div *ngIf="getSideData(card, card.activeSideTab).svgVariants.length > 0" class="flex flex-wrap gap-2 pt-1">
                          <div *ngFor="let svgRaw of getSideData(card, card.activeSideTab).svgVariants; let sIdx = index" class="relative size-16 p-1 rounded-xl bg-black/60 border border-amber-500/40 flex items-center justify-center group overflow-hidden">
                            <div [innerHTML]="sanitizeSvg(svgRaw)" class="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"></div>
                            <button (click)="removeSvgVariant(card, card.activeSideTab, sIdx)" class="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center text-red-400 font-bold transition-opacity cursor-pointer">
                              ✕
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

              </div>

              <button (click)="addCreatorCard()" class="w-full py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-500/40 rounded-2xl text-xs text-indigo-300 font-bold flex items-center justify-center gap-2 cursor-pointer transition-all">
                <lucide-icon [img]="Plus" class="w-4 h-4"></lucide-icon>
                <span>+ إضافة بطاقة أخرى للمجموعة</span>
              </button>
            </div>
          </div>

          <button (click)="saveCustomDeck()" class="w-full h-14 bg-gradient-to-r from-indigo-600 via-purple-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 text-white rounded-2xl font-black text-sm transition-all shadow-xl shadow-indigo-600/30 cursor-pointer flex items-center justify-center gap-2">
            <span>حفظ المجموعة وبدء التحدي 🚀</span>
          </button>
        </div>

        <!-- ================= 4. IN-GAME FLASHCARD PLAYING SCREEN ================= -->
        <div *ngIf="gameState() === 'playing'" class="bg-slate-900/95 border border-white/10 rounded-[2.5rem] p-6 md:p-10 shadow-2xl space-y-6 text-center animate-in zoom-in-95 duration-300 max-w-4xl mx-auto">
          
          <!-- Top Round Bar: Streak, Timer, Category -->
          <div class="flex flex-wrap items-center justify-between text-xs text-slate-400 font-bold gap-3">
            <span class="bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 font-mono">
              البطاقة {{ currentIndex + 1 }} من {{ activeDeck.cards.length }}
            </span>
            
            <div class="flex items-center gap-2 bg-amber-500/10 text-amber-300 px-3 py-1.5 rounded-xl border border-amber-500/20 font-black">
              <lucide-icon [img]="Flame" class="w-4 h-4 text-amber-400"></lucide-icon>
              <span>التتابع: {{ streakCount }} 🔥</span>
            </div>

            <div *ngIf="gameSettings.timerMode" class="flex items-center gap-2 bg-red-500/10 text-red-300 px-3 py-1.5 rounded-xl border border-red-500/20 font-mono font-black">
              <lucide-icon [img]="Clock" class="w-4 h-4 text-red-400 animate-pulse"></lucide-icon>
              <span>{{ timeLeft }} ثانية</span>
            </div>

            <span class="bg-indigo-500/10 text-indigo-400 px-3 py-1.5 rounded-xl border border-indigo-500/20 font-bold">
              {{ activeDeck.title }}
            </span>
          </div>

          <!-- Active Audio trigger if available -->
          <div class="flex items-center justify-center gap-3">
            <button (click)="playCurrentAudio()" class="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow">
              <lucide-icon [img]="Volume2" class="w-4 h-4 text-indigo-400"></lucide-icon>
              <span>الاستماع للصوت 🔊</span>
            </button>

            <span *ngIf="activeRound?.roundAnswerMode === 'multiple_choice'" class="text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-xl font-bold">
              🔘 نظام الخيارات مفعل (اختر الإجابة الصحيحة)
            </span>
          </div>

          <!-- 🎴 THE 3D INTERACTIVE FLASHCARD SURFACE -->
          <div (click)="flipCard()" 
               class="w-full min-h-[260px] md:min-h-[320px] bg-gradient-to-br from-slate-800 via-slate-900 to-indigo-950/80 border-2 border-indigo-500/40 hover:border-indigo-400 rounded-[2.5rem] p-6 md:p-8 flex flex-col items-center justify-center cursor-pointer shadow-2xl relative overflow-hidden group transition-all transform hover:scale-[1.01]">
            
            <div class="absolute top-4 right-6 text-[10px] text-slate-500 font-mono bg-black/40 px-2.5 py-1 rounded-lg border border-white/5">
              انقر لقلب البطاقة ⟳
            </div>

            <div class="space-y-4 max-w-lg w-full flex flex-col items-center justify-center">
              
              <!-- Label indication -->
              <span class="text-xs font-black tracking-widest uppercase px-3 py-1 rounded-full border"
                    [ngClass]="!isFlipped ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'">
                {{ !isFlipped ? 'السؤال (المحتوى والوسائط):' : 'الإجابة الصحيحة:' }}
              </span>

              <!-- Display SVG if present -->
              <div *ngIf="getCurrentDisplay().svgHtml" 
                   [innerHTML]="getCurrentDisplay().svgHtml" 
                   class="size-28 md:size-36 flex items-center justify-center p-2 drop-shadow-xl [&>svg]:w-full [&>svg]:h-full">
              </div>

              <!-- Display Image if present -->
              <div *ngIf="getCurrentDisplay().imageUrl" class="size-28 md:size-36 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl">
                <img [src]="getCurrentDisplay().imageUrl" class="w-full h-full object-cover" />
              </div>

              <!-- Display Text -->
              <div *ngIf="getCurrentDisplay().text" class="text-3xl md:text-5xl font-black text-white font-mono tracking-wide">
                {{ getCurrentDisplay().text }}
              </div>

            </div>
          </div>

          <!-- ================= ANSWER INPUT REGION ================= -->

          <!-- 1. MULTIPLE CHOICE MODE (نظام الخيارات - 4 خيارات تفاعلية وسريعة) -->
          <div *ngIf="activeRound?.roundAnswerMode === 'multiple_choice'" class="space-y-4 pt-2">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
              <button 
                *ngFor="let opt of activeRound?.options; let optIdx = index"
                (click)="selectChoiceOption(opt)"
                [disabled]="activeRound?.isAnswerSubmitted"
                [ngClass]="getChoiceOptionClass(opt)"
                class="p-4 rounded-2xl border-2 text-sm md:text-base font-black transition-all cursor-pointer flex items-center justify-between shadow-lg text-right active:scale-95 disabled:cursor-default group">
                
                <div class="flex items-center gap-3">
                  <span class="size-7 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center font-mono text-xs text-indigo-300 group-hover:scale-110 transition-transform">
                    {{ optIdx + 1 }}
                  </span>
                  <span class="text-white">{{ opt.text }}</span>
                </div>

                <span *ngIf="activeRound?.isAnswerSubmitted && opt.isCorrect" class="text-emerald-400 font-bold text-xs">✓ صحيح</span>
                <span *ngIf="activeRound?.isAnswerSubmitted && activeRound?.selectedOptionId === opt.id && !opt.isCorrect" class="text-red-400 font-bold text-xs">✕ خطأ</span>
              </button>
            </div>

            <div class="text-[11px] text-slate-500 font-bold">
              💡 يمكنك أيضاً الضغط على الأرقام (1, 2, 3, 4) من لوحة المفاتيح للإجابة بسرعة البرق!
            </div>
          </div>

          <!-- 2. TYPING / VOICE MODES -->
          <div *ngIf="activeRound?.roundAnswerMode !== 'multiple_choice'" class="space-y-4 max-w-md mx-auto">
            
            <!-- Typing Input -->
            <div *ngIf="activeRound?.roundAnswerMode !== 'voice_only'" class="relative flex items-center gap-2">
              <input 
                type="text" 
                [(ngModel)]="userInput" 
                (keyup.enter)="checkAnswer()"
                placeholder="اكتب إجابتك هنا..." 
                class="w-full h-14 bg-white/5 border-2 border-white/10 rounded-2xl px-6 text-base text-white text-center focus:outline-none focus:border-indigo-500 font-mono"
              />
              <button *ngIf="gameSettings.answerMode === 'both' || gameSettings.answerMode === 'random'" 
                      (click)="toggleVoiceRecording()" 
                      [ngClass]="isListening() ? 'bg-red-500 animate-pulse text-white scale-105' : 'bg-white/5 hover:bg-white/10 text-indigo-400 border border-white/10'" 
                      class="h-14 px-4 rounded-2xl transition-all flex items-center justify-center cursor-pointer shrink-0 text-lg shadow-lg" 
                      title="تحدث للإجابة صوتياً عبر Gemini AI">
                🎙️
              </button>
            </div>

            <!-- Voice Only Big Button -->
            <div *ngIf="activeRound?.roundAnswerMode === 'voice_only'" class="space-y-3">
              <button (click)="toggleVoiceRecording()" 
                      [ngClass]="isListening() ? 'bg-red-500 animate-pulse text-white scale-105' : 'bg-indigo-600 hover:bg-indigo-500 text-white'" 
                      class="w-full h-16 rounded-2xl font-black text-base shadow-xl flex items-center justify-center gap-3 cursor-pointer transition-all">
                <span class="text-2xl">🎙️</span>
                <span>{{ isListening() ? 'جاري الاستماع... انقر للإيقاف والتحليل' : 'اضغط للتحدث بصوتك 🎙️' }}</span>
              </button>
            </div>

            <!-- Hint Button -->
            <div class="flex items-center justify-between text-xs px-2">
              <button (click)="showHint()" class="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1.5 cursor-pointer bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
                <lucide-icon [img]="Lightbulb" class="w-3.5 h-3.5"></lucide-icon>
                <span>تلميح (الحرف الأول)</span>
              </button>
              <span class="text-slate-500 font-mono">النمط: {{ getAnswerModeLabel() }}</span>
            </div>

            <!-- Check Answer Button in Typing Mode -->
            <div class="flex gap-3 pt-2">
              <button (click)="checkAnswer()" class="flex-1 h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl text-sm transition-all shadow-lg shadow-indigo-600/20 cursor-pointer">
                تحقق من الإجابة ✓
              </button>
              <button (click)="nextCard()" class="h-12 px-6 bg-white/5 hover:bg-white/10 text-slate-300 font-bold rounded-2xl text-sm transition-all cursor-pointer">
                تخطي ➔
              </button>
            </div>
          </div>

          <!-- Inline Feedback Message -->
          <div *ngIf="feedbackMessage()" class="p-3.5 rounded-2xl text-xs font-black transition-all animate-in fade-in flex items-center justify-center gap-2 max-w-lg mx-auto"
               [ngClass]="feedbackType() === 'success' ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300' : 'bg-red-500/20 border border-red-500/40 text-red-300'">
            <lucide-icon [img]="feedbackType() === 'success' ? CheckCircle2 : XCircle" class="w-4 h-4"></lucide-icon>
            <span>{{ feedbackMessage() }}</span>
          </div>

        </div>

        <!-- ================= 5. SUMMARY SCREEN ================= -->
        <div *ngIf="gameState() === 'summary'" class="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl space-y-8 text-center animate-in zoom-in-95 duration-300 max-w-2xl mx-auto">
          <div class="size-20 bg-emerald-500/10 border border-emerald-500/30 rounded-3xl flex items-center justify-center mx-auto text-emerald-400 shadow-xl">
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
              مجموعة أخرى
            </button>
            <button (click)="goBack()" class="flex-1 h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-indigo-600/30 cursor-pointer">
              معرض الألعاب
            </button>
          </div>
        </div>

      </div>
    </div>
  `
})
export class FlashcardsComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);
  private aiKeyManager = inject(AiKeyManagerService);
  private arcadeCloud = inject(ArcadeCloudService);

  // Lucide Icons Registration
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
  ImageIcon = ImageIcon;
  Music = Music;
  Code = Code;
  Eye = Eye;
  Play = Play;
  Pause = Pause;
  Shuffle = Shuffle;
  Layers = Layers;
  Check = Check;
  HelpCircle = HelpCircle;
  UploadCloud = UploadCloud;

  // Game States
  gameState = signal<'select' | 'settings' | 'create' | 'playing' | 'summary'>('select');
  feedbackMessage = signal<string | null>(null);
  feedbackType = signal<'success' | 'error' | null>(null);
  isListening = signal<boolean>(false);
  isRecordingSideVoice = signal<boolean>(false);
  activeRecordingCardIndex: number | null = null;
  heroCardFlipped = false;

  // Base Decks
  decks: Deck[] = [
    {
      id: 'months',
      title: 'أشهر السنة الإنجليزية (Months)',
      description: 'حفظ أسماء الأشهر باللغة الإنجليزية وترتيبها بالأرقام من 1 إلى 12 مع نطق صوتي وصور ورسوم.',
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
      description: 'حفظ أيام الأسبوع بالإنجليزية وترتيبها بالعربية مع خيارات ذكية.',
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
      description: 'أعوام وأرقام عشوائية متجددة في كل اختبار تدربك على سرعة البديهة.',
      icon: '⏳',
      cards: []
    }
  ];

  selectedDeckForPlay: Deck | null = null;
  activeDeck: Deck = this.decks[0];
  currentIndex = 0;
  isFlipped = false;
  userInput = '';
  streakCount = 0;
  maxStreak = 0;

  // Active Round Presentation with picked random variants
  activeRound: {
    prompt: ActiveSideDisplay;
    answer: ActiveSideDisplay;
    acceptableAnswers: string[];
    options: ChoiceOption[];
    selectedOptionId: number | null;
    isAnswerSubmitted: boolean;
    roundAnswerMode: 'multiple_choice' | 'voice_only' | 'type_only';
  } | null = null;

  // Game Settings (Default to multiple choice for supreme ease & fun)
  gameSettings: GameSettings = {
    answerMode: 'multiple_choice',
    directionMode: 'random',
    autoAudio: false,
    timerMode: false
  };

  effectiveDirection: 'front-to-back' | 'back-to-front' = 'front-to-back';
  private timerInterval: any = null;
  timeLeft = 15;

  // Creator state
  newDeckTitle = '';
  creatorCards: Array<{
    front: string;
    back: string;
    isExpanded: boolean;
    activeSideTab: 'front' | 'back';
    tempImageUrl: string;
    tempAudioUrl: string;
    tempSvgCode: string;
    frontData: FlashcardSideData;
    backData: FlashcardSideData;
  }> = [];

  // Media Recorders
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private currentAudioPlayer: HTMLAudioElement | null = null;

  // Web Audio Context for juicy SFX
  private audioCtx: AudioContext | null = null;

  ngOnInit() {
    this.loadCustomDecks();
  }

  ngOnDestroy() {
    this.clearTimer();
    this.stopAudioPlayer();
  }

  // Keyboard shortcut listener for Multiple Choice options 1, 2, 3, 4
  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (this.gameState() !== 'playing' || !this.activeRound || this.activeRound.roundAnswerMode !== 'multiple_choice') {
      return;
    }
    const key = event.key;
    const numMap: { [k: string]: number } = {
      '1': 0, '2': 1, '3': 2, '4': 3,
      '١': 0, '٢': 1, '٣': 2, '٤': 3
    };
    if (key in numMap && !this.activeRound.isAnswerSubmitted) {
      const idx = numMap[key];
      if (this.activeRound.options[idx]) {
        this.selectChoiceOption(this.activeRound.options[idx]);
      }
    }
  }

  private loadCustomDecks() {
    if (typeof localStorage === 'undefined') return;
    const saved = localStorage.getItem('super_flashcards_custom_decks');
    if (saved) {
      try {
        const customDecks: Deck[] = JSON.parse(saved);
        if (Array.isArray(customDecks) && customDecks.length > 0) {
          this.decks = [...customDecks, ...this.decks.filter(d => !d.id.startsWith('custom_'))];
        }
      } catch (e) {
        console.error('Error loading custom decks:', e);
      }
    }
  }

  toggleHeroCard() {
    this.heroCardFlipped = !this.heroCardFlipped;
  }

  goBack() {
    this.clearTimer();
    this.stopAudioPlayer();
    this.router.navigate(['/arcade']);
  }

  openSettings(deck: Deck) {
    const deckCopy: Deck = JSON.parse(JSON.stringify(deck));

    // Dynamic generation for years deck
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
    this.gameState.set('settings');
  }

  startPlaying() {
    if (!this.selectedDeckForPlay) return;
    this.activeDeck = JSON.parse(JSON.stringify(this.selectedDeckForPlay));
    
    // Shuffle cards
    this.activeDeck.cards = this.shuffleArray(this.activeDeck.cards);
    this.currentIndex = 0;
    this.streakCount = 0;
    this.maxStreak = 0;

    this.setupCardRound();
    this.gameState.set('playing');
  }

  /**
   * Setup active round with Random Variation for images, audio, SVG, and words!
   */
  setupCardRound() {
    this.isFlipped = false;
    this.userInput = '';
    this.feedbackMessage.set(null);
    this.feedbackType.set(null);
    this.stopAudioPlayer();

    const card = this.activeDeck.cards[this.currentIndex];

    // Determine Direction for this card
    if (this.gameSettings.directionMode === 'random') {
      this.effectiveDirection = Math.random() > 0.5 ? 'front-to-back' : 'back-to-front';
    } else if (this.gameSettings.directionMode === 'front_to_back') {
      this.effectiveDirection = 'front-to-back';
    } else {
      this.effectiveDirection = 'back-to-front';
    }

    const isF2B = this.effectiveDirection === 'front-to-back';
    const promptSideData = isF2B ? card.frontData : card.backData;
    const answerSideData = isF2B ? card.backData : card.frontData;
    const promptFallback = isF2B ? card.front : card.back;
    const answerFallback = isF2B ? card.back : card.front;

    // Pick 1 random variant from available variants
    const promptText = this.pickRandomVariant(promptSideData?.textVariants, promptFallback);
    const promptImage = this.pickRandomVariant(promptSideData?.imageVariants, null);
    const promptAudio = this.pickRandomVariant(promptSideData?.audioVariants, null);
    const promptSvg = this.pickRandomVariant(promptSideData?.svgVariants, null);

    const answerText = this.pickRandomVariant(answerSideData?.textVariants, answerFallback);
    const answerImage = this.pickRandomVariant(answerSideData?.imageVariants, null);
    const answerAudio = this.pickRandomVariant(answerSideData?.audioVariants, null);
    const answerSvg = this.pickRandomVariant(answerSideData?.svgVariants, null);

    // Collect all acceptable answers (synonyms)
    const acceptableAnswers = Array.from(new Set([
      answerFallback,
      ...(answerSideData?.textVariants || []),
      answerText
    ])).map(s => s.toLowerCase().trim()).filter(Boolean);

    // Determine Round Answer Mode
    let roundMode: 'multiple_choice' | 'voice_only' | 'type_only' = 'multiple_choice';
    if (this.gameSettings.answerMode === 'multiple_choice') {
      roundMode = 'multiple_choice';
    } else if (this.gameSettings.answerMode === 'voice_only') {
      roundMode = 'voice_only';
    } else if (this.gameSettings.answerMode === 'type_only') {
      roundMode = 'type_only';
    } else if (this.gameSettings.answerMode === 'both') {
      roundMode = 'type_only'; // supports both typing and voice mic in UI
    } else if (this.gameSettings.answerMode === 'random') {
      const randModes: Array<'multiple_choice' | 'type_only' | 'voice_only'> = ['multiple_choice', 'type_only', 'multiple_choice'];
      roundMode = randModes[Math.floor(Math.random() * randModes.length)];
    }

    // Generate 4 Multiple Choice Options if needed
    const options: ChoiceOption[] = [];
    if (roundMode === 'multiple_choice') {
      options.push({ id: 1, text: answerText, isCorrect: true });
      
      // Pull 3 smart distractors from other cards in the deck
      const otherAnswers = this.activeDeck.cards
        .filter((_, idx) => idx !== this.currentIndex)
        .map(c => isF2B ? c.back : c.front)
        .filter(ans => ans && ans.toLowerCase().trim() !== answerText.toLowerCase().trim());
      
      const shuffledOther = this.shuffleArray(otherAnswers);
      const distractors = shuffledOther.slice(0, 3);

      // Fallback distractors if deck has fewer than 4 cards
      while (distractors.length < 3) {
        distractors.push(`خيار بديل ${distractors.length + 1}`);
      }

      distractors.forEach((d, idx) => {
        options.push({ id: idx + 2, text: d, isCorrect: false });
      });

      // Shuffle options so correct one is randomly positioned
      this.shuffleOptionsInPlace(options);
    }

    this.activeRound = {
      prompt: {
        text: promptText,
        imageUrl: promptImage,
        audioUrl: promptAudio,
        rawSvg: promptSvg,
        svgHtml: promptSvg ? this.sanitizeSvg(promptSvg) : null
      },
      answer: {
        text: answerText,
        imageUrl: answerImage,
        audioUrl: answerAudio,
        rawSvg: answerSvg,
        svgHtml: answerSvg ? this.sanitizeSvg(answerSvg) : null
      },
      acceptableAnswers,
      options,
      selectedOptionId: null,
      isAnswerSubmitted: false,
      roundAnswerMode: roundMode
    };

    // Auto Audio play if enabled
    if (this.gameSettings.autoAudio) {
      setTimeout(() => {
        this.playCurrentAudio();
      }, 350);
    }

    // Timer Mode
    this.clearTimer();
    if (this.gameSettings.timerMode) {
      this.timeLeft = 15;
      this.timerInterval = setInterval(() => {
        if (this.timeLeft > 0) {
          this.timeLeft--;
        } else {
          this.clearTimer();
          this.playSfxTone(180, 'sawtooth');
          this.feedbackType.set('error');
          this.feedbackMessage.set(`انتهى الوقت! الإجابة الصحيحة هي: "${answerText}"`);
          this.streakCount = 0;
          setTimeout(() => {
            this.nextCard();
          }, 1600);
        }
      }, 1000);
    }
  }

  getCurrentDisplay(): ActiveSideDisplay {
    if (!this.activeRound) {
      return { text: '', imageUrl: null, audioUrl: null, rawSvg: null, svgHtml: null };
    }
    return !this.isFlipped ? this.activeRound.prompt : this.activeRound.answer;
  }

  flipCard() {
    this.isFlipped = !this.isFlipped;
    this.playSfxTone(600, 'sine', 0.05);
  }

  /**
   * Selection handler for Multiple Choice mode
   */
  selectChoiceOption(option: ChoiceOption) {
    if (!this.activeRound || this.activeRound.isAnswerSubmitted) return;

    this.clearTimer();
    this.activeRound.isAnswerSubmitted = true;
    this.activeRound.selectedOptionId = option.id;

    if (option.isCorrect) {
      this.playChimeSuccess();
      this.streakCount++;
      if (this.streakCount > this.maxStreak) this.maxStreak = this.streakCount;

      this.feedbackType.set('success');
      this.feedbackMessage.set(`إجابة صحيحة وممتازة! تتابع: ${this.streakCount} 🔥`);
      
      setTimeout(() => {
        this.nextCard();
      }, 800);
    } else {
      this.playSfxTone(180, 'sawtooth', 0.2);
      this.streakCount = 0;
      this.feedbackType.set('error');
      this.feedbackMessage.set(`إجابة غير صحيحة! الصحيح هو: "${this.activeRound.answer.text}"`);

      setTimeout(() => {
        this.nextCard();
      }, 1800);
    }
  }

  getChoiceOptionClass(option: ChoiceOption): string {
    if (!this.activeRound?.isAnswerSubmitted) {
      return 'bg-slate-950/70 border-white/10 hover:border-indigo-400 hover:bg-indigo-600/10 text-white';
    }
    if (option.isCorrect) {
      return 'bg-emerald-600/30 border-emerald-400 text-emerald-300 shadow-emerald-500/20';
    }
    if (this.activeRound.selectedOptionId === option.id && !option.isCorrect) {
      return 'bg-red-600/30 border-red-400 text-red-300 animate-shake';
    }
    return 'bg-slate-950/40 border-white/5 opacity-50';
  }

  checkAnswer() {
    if (!this.activeRound) return;
    const answer = this.userInput.toLowerCase().trim();
    if (!answer) return;

    this.clearTimer();
    const isCorrect = this.activeRound.acceptableAnswers.some(ans => ans === answer);

    if (isCorrect) {
      this.playChimeSuccess();
      this.streakCount++;
      if (this.streakCount > this.maxStreak) this.maxStreak = this.streakCount;

      this.feedbackType.set('success');
      this.feedbackMessage.set(`إجابة صحيحة! تتابع متواصل: ${this.streakCount} 🔥`);
      setTimeout(() => {
        this.nextCard();
      }, 800);
    } else {
      this.playSfxTone(180, 'sawtooth', 0.2);
      this.streakCount = 0;
      this.feedbackType.set('error');
      this.feedbackMessage.set(`إجابة غير صحيحة! الصحيح هو: "${this.activeRound.answer.text}"`);
    }
  }

  nextCard() {
    this.clearTimer();
    this.userInput = '';
    this.isFlipped = false;
    this.feedbackMessage.set(null);
    this.stopAudioPlayer();

    if (this.currentIndex < this.activeDeck.cards.length - 1) {
      this.currentIndex++;
      this.setupCardRound();
    } else {
      this.clearTimer();
      this.saveSessionScore();
      this.gameState.set('summary');
    }
  }

  private saveSessionScore() {
    if (this.maxStreak > 0) {
      this.arcadeCloud.submitHighScore(
        'flashcards-' + this.activeDeck.id, 
        'لاعب ذكي', 
        this.maxStreak * 100
      );
    }
  }

  showHint() {
    if (!this.activeRound) return;
    const ans = this.activeRound.answer.text;
    const firstLetter = ans.charAt(0);
    this.feedbackType.set('success');
    this.feedbackMessage.set(`💡 تلميح: يبدأ بالحرف "${firstLetter}" (عدد الحروف: ${ans.length})`);
  }

  // Audio Playback
  playCurrentAudio() {
    if (!this.activeRound) return;
    const current = this.getCurrentDisplay();
    
    // If card has a recorded or URL audio clip, play it!
    if (current.audioUrl) {
      this.playAudioClip(current.audioUrl);
      return;
    }

    // Otherwise, text-to-speech fallback
    if (current.text) {
      this.speakText(current.text);
    }
  }

  playAudioClip(audioUrl: string) {
    this.stopAudioPlayer();
    try {
      this.currentAudioPlayer = new Audio(audioUrl);
      this.currentAudioPlayer.play().catch(e => console.warn('Audio play warning:', e));
    } catch (e) {
      console.error('Error playing audio clip:', e);
    }
  }

  stopAudioPlayer() {
    if (this.currentAudioPlayer) {
      this.currentAudioPlayer.pause();
      this.currentAudioPlayer.currentTime = 0;
      this.currentAudioPlayer = null;
    }
  }

  speakText(text: string) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const isArabic = /[\u0600-\u06FF]/.test(text);
      utterance.lang = isArabic ? 'ar-SA' : 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  }

  // ================= DECK CREATOR METHODS =================
  openCreator() {
    this.newDeckTitle = '';
    this.creatorCards = [
      this.createNewCreatorCard(),
      this.createNewCreatorCard()
    ];
    this.gameState.set('create');
  }

  private createNewCreatorCard() {
    return {
      front: '',
      back: '',
      isExpanded: true,
      activeSideTab: 'front' as 'front' | 'back',
      tempImageUrl: '',
      tempAudioUrl: '',
      tempSvgCode: '',
      frontData: {
        textVariants: [],
        imageVariants: [],
        audioVariants: [],
        svgVariants: []
      },
      backData: {
        textVariants: [],
        imageVariants: [],
        audioVariants: [],
        svgVariants: []
      }
    };
  }

  addCreatorCard() {
    this.creatorCards.push(this.createNewCreatorCard());
  }

  removeCreatorCard(index: number) {
    if (this.creatorCards.length > 1) {
      this.creatorCards.splice(index, 1);
    }
  }

  toggleCardMediaStudio(index: number) {
    this.creatorCards[index].isExpanded = !this.creatorCards[index].isExpanded;
  }

  getSideData(card: any, side: 'front' | 'back'): FlashcardSideData {
    return side === 'front' ? card.frontData : card.backData;
  }

  // Text variant additions
  addTextVariant(card: any, side: 'front' | 'back') {
    const data = this.getSideData(card, side);
    data.textVariants.push('');
  }

  removeTextVariant(card: any, side: 'front' | 'back', index: number) {
    const data = this.getSideData(card, side);
    data.textVariants.splice(index, 1);
  }

  // Image Upload / URL additions
  handleImageUpload(event: any, card: any, side: 'front' | 'back') {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const data = this.getSideData(card, side);
      data.imageVariants.push(dataUrl);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  }

  addImageUrl(card: any, side: 'front' | 'back') {
    if (!card.tempImageUrl.trim()) return;
    const data = this.getSideData(card, side);
    data.imageVariants.push(card.tempImageUrl.trim());
    card.tempImageUrl = '';
  }

  removeImageVariant(card: any, side: 'front' | 'back', index: number) {
    const data = this.getSideData(card, side);
    data.imageVariants.splice(index, 1);
  }

  // Live Microphone Audio Recording inside Creator
  async toggleLiveVoiceRecording(card: any, side: 'front' | 'back') {
    if (this.isRecordingSideVoice()) {
      this.stopSideVoiceRecording(card, side);
    } else {
      await this.startSideVoiceRecording(card);
    }
  }

  private async startSideVoiceRecording(card: any) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start();
      this.isRecordingSideVoice.set(true);
      this.activeRecordingCardIndex = this.creatorCards.indexOf(card);
      this.playSfxTone(800, 'sine', 0.1);
    } catch (e) {
      console.error('Error accessing microphone:', e);
      alert('تعذر الوصول إلى الميكروفون. يرجى التأكد من منح الإذن للمتصفح.');
    }
  }

  private stopSideVoiceRecording(card: any, side: 'front' | 'back') {
    if (this.mediaRecorder && this.isRecordingSideVoice()) {
      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          const data = this.getSideData(card, side);
          data.audioVariants.push(base64Audio);
          this.isRecordingSideVoice.set(false);
          this.activeRecordingCardIndex = null;
          this.playSfxTone(400, 'sine', 0.1);
        };
        reader.readAsDataURL(audioBlob);
      };

      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach(t => t.stop());
    }
  }

  addAudioUrl(card: any, side: 'front' | 'back') {
    if (!card.tempAudioUrl.trim()) return;
    const data = this.getSideData(card, side);
    data.audioVariants.push(card.tempAudioUrl.trim());
    card.tempAudioUrl = '';
  }

  removeAudioVariant(card: any, side: 'front' | 'back', index: number) {
    const data = this.getSideData(card, side);
    data.audioVariants.splice(index, 1);
  }

  // SVG Additions
  addSvgVariant(card: any, side: 'front' | 'back') {
    if (!card.tempSvgCode.trim()) return;
    const data = this.getSideData(card, side);
    data.svgVariants.push(card.tempSvgCode.trim());
    card.tempSvgCode = '';
  }

  removeSvgVariant(card: any, side: 'front' | 'back', index: number) {
    const data = this.getSideData(card, side);
    data.svgVariants.splice(index, 1);
  }

  sanitizeSvg(svgStr: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(svgStr);
  }

  saveCustomDeck() {
    if (!this.newDeckTitle.trim()) {
      alert('يرجى كتابة عنوان للمجموعة!');
      return;
    }

    const validCards: Flashcard[] = this.creatorCards
      .filter(c => c.front.trim() || c.frontData.imageVariants.length || c.frontData.svgVariants.length)
      .map(c => ({
        id: 'card_' + Math.random().toString(36).substring(2, 9),
        front: c.front.trim() || 'سؤال مصور',
        back: c.back.trim() || 'إجابة',
        category: 'custom',
        frontData: {
          textVariants: c.frontData.textVariants.filter(t => t.trim()),
          imageVariants: c.frontData.imageVariants,
          audioVariants: c.frontData.audioVariants,
          svgVariants: c.frontData.svgVariants
        },
        backData: {
          textVariants: c.backData.textVariants.filter(t => t.trim()),
          imageVariants: c.backData.imageVariants,
          audioVariants: c.backData.audioVariants,
          svgVariants: c.backData.svgVariants
        }
      }));

    if (validCards.length === 0) {
      alert('يرجى إضافة بطاقة واحدة على الأقل!');
      return;
    }

    const newDeck: Deck = {
      id: 'custom_' + Date.now(),
      title: this.newDeckTitle,
      description: 'مجموعة مخصصة تحتوي على بطاقات ووسائط ورسوم تفاعلية.',
      icon: '🎨',
      cards: validCards,
      isCustom: true
    };

    this.decks.unshift(newDeck);

    // Persist custom decks in localStorage
    if (typeof localStorage !== 'undefined') {
      const customDecksOnly = this.decks.filter(d => d.id.startsWith('custom_'));
      localStorage.setItem('super_flashcards_custom_decks', JSON.stringify(customDecksOnly));
    }

    this.openSettings(newDeck);
  }

  // ================= VOICE RECORDING & GEMINI AI =================
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
      this.feedbackMessage.set('🎙️ جاري الاستماع... انطق الإجابة ثم انقر على الميكروفون مجدداً للإيقاف والتحليل.');
    } catch (e) {
      console.error('Microphone permission error:', e);
      this.feedbackType.set('error');
      this.feedbackMessage.set('تعذر الوصول إلى الميكروفون. يرجى منح الإذن للمتصفح.');
      this.isListening.set(false);
    }
  }

  stopVoiceRecording() {
    if (this.mediaRecorder && this.isListening()) {
      this.mediaRecorder.stop();
      this.isListening.set(false);
      this.feedbackMessage.set('⏳ جاري تحليل الصوت باستخدام الذكاء الاصطناعي...');
    }
  }

  async processAudioWithGemini(blob: Blob) {
    if (!this.aiKeyManager.hasActiveKey()) {
      this.feedbackType.set('error');
      this.feedbackMessage.set('مفتاح Google API غير متوفر في الإعدادات.');
      return;
    }

    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];

        const res = await this.aiKeyManager.callGeminiApi({
          model: 'gemini-2.5-flash',
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
        });

        const transcribedText = (res.text || '').trim();

        if (transcribedText) {
          this.userInput = transcribedText.replace(/['".,?!]/g, '');
          this.feedbackType.set('success');
          this.feedbackMessage.set(`تم التعرف على الصوت: "${this.userInput}"`);
          setTimeout(() => {
            this.checkAnswer();
          }, 400);
        } else {
          this.feedbackType.set('error');
          this.feedbackMessage.set(res.error || 'لم يتبين الصوت بوضوح عبر Gemini AI. حاول مرة أخرى.');
        }
      };
    } catch (e) {
      console.error('Gemini Audio Error:', e);
      this.feedbackType.set('error');
      this.feedbackMessage.set('حدث خطأ أثناء معالجة الصوت.');
    }
  }

  // ================= UTILITIES & AUDIO SFX =================
  private pickRandomVariant<T>(variants: T[] | undefined, fallback: T): T {
    if (variants && variants.length > 0) {
      const nonEmpties = variants.filter(v => v !== null && v !== undefined && v !== '');
      if (nonEmpties.length > 0) {
        const randIndex = Math.floor(Math.random() * nonEmpties.length);
        return nonEmpties[randIndex];
      }
    }
    return fallback;
  }

  private shuffleArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  private shuffleOptionsInPlace(options: ChoiceOption[]): void {
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
  }

  getAnswerModeLabel(): string {
    switch (this.gameSettings.answerMode) {
      case 'multiple_choice': return 'نظام الخيارات 🔘';
      case 'voice_only': return 'صوت فقط 🎙️';
      case 'type_only': return 'كتابة فقط ⌨️';
      case 'both': return 'كتابة أو صوت ⚡';
      case 'random': default: return 'عشوائي منوع 🔀';
    }
  }

  clearTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private ensureAudioContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  private playSfxTone(freq: number, type: OscillatorType = 'sine', duration: number = 0.1) {
    try {
      this.ensureAudioContext();
      if (!this.audioCtx) return;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (e) {}
  }

  private playChimeSuccess() {
    this.playSfxTone(523.25, 'sine', 0.08);
    setTimeout(() => this.playSfxTone(659.25, 'sine', 0.08), 80);
    setTimeout(() => this.playSfxTone(783.99, 'sine', 0.18), 160);
  }
}
