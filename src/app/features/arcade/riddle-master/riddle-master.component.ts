import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GlobalStateService } from '../../../core/services/global-state.service';
import { ToastService } from '../../../core/services/toast.service';
import { 
  Riddle, 
  LevelProgress, 
  checkRiddleAnswer, 
  generateLevelRiddles, 
  getStoredProgress, 
  saveProgress, 
  saveCustomRiddle, 
  getStoredCustomRiddles,
  estimateRiddleLevel,
  getLastPlayedState,
  saveLastPlayedState
} from './riddle-data';

@Component({
  selector: 'app-riddle-master',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="min-h-screen bg-[#070913] text-slate-100 font-['Tajawal'] select-none relative overflow-x-hidden flex flex-col justify-between" dir="rtl">
      
      <!-- Background Ambient Glow & Starfield -->
      <div class="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div class="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px]"></div>
        <div class="absolute top-1/3 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px]"></div>
        <div class="absolute -bottom-40 left-1/3 w-96 h-96 bg-cyan-600/20 rounded-full blur-[120px]"></div>
        <div class="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px]"></div>
      </div>

      <!-- ================= HEADER NAVIGATION ================= -->
      <header class="relative z-20 border-b border-white/10 bg-[#0a0f24]/80 backdrop-blur-xl px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-lg">
        <div class="flex items-center gap-3">
          <button (click)="goBack()" class="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer">
            <span class="text-lg">←</span>
          </button>
          <div>
            <h1 class="text-base sm:text-lg font-black bg-gradient-to-r from-purple-400 via-pink-400 to-amber-300 bg-clip-text text-transparent flex items-center gap-2">
              <span>Riddle Master 100</span>
              <span class="text-xs bg-purple-500/20 border border-purple-400/30 text-purple-300 px-2 py-0.5 rounded-full font-mono">100 Levels</span>
            </h1>
            <p class="text-[11px] text-slate-400 hidden sm:block">مملكة الألغاز والفوازير الذكية - 100 مستوى متدرج الصعوبة</p>
          </div>
        </div>

        <!-- Player Stats & Modals Toggles -->
        <div class="flex items-center gap-2 sm:gap-4">
          <!-- Coins & Score -->
          <div class="flex items-center gap-2 bg-black/40 border border-white/10 px-3 py-1.5 rounded-2xl text-xs font-bold">
            <span class="text-amber-400 flex items-center gap-1">🪙 {{ coins }}</span>
            <span class="text-slate-600">|</span>
            <span class="text-purple-400 flex items-center gap-1">🔥 {{ streak }}</span>
            <span class="text-slate-600 hidden sm:inline">|</span>
            <span class="text-cyan-400 hidden sm:inline">⭐ {{ totalStars }}</span>
          </div>

          <!-- Levels Map Button -->
          <button (click)="openLevelsMap()" class="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-black px-3 py-2 rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer transition-all">
            <span>🗺️</span>
            <span class="hidden sm:inline">المستويات (100)</span>
          </button>

          <!-- Add Riddle Button -->
          <button (click)="openCreateRiddleModal()" class="bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-black text-xs px-3 py-2 rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer transition-all">
            <span>➕</span>
            <span class="hidden sm:inline">أضف فزورة</span>
          </button>

          <!-- Sound Toggle -->
          <button (click)="toggleSound()" class="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer">
            <span>{{ soundEnabled ? '🔊' : '🔇' }}</span>
          </button>
        </div>
      </header>

      <!-- ================= MAIN CONTENT AREA ================= -->
      <main class="relative z-10 flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-center">

        <!-- 3 GAME MODES SELECTOR TABS -->
        <div class="flex items-center justify-center gap-2 mb-6 bg-black/40 border border-white/10 p-1.5 rounded-2xl w-fit mx-auto backdrop-blur-md">
          <button (click)="activeMode = 'local'" 
                  [ngClass]="activeMode === 'local' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black shadow-lg shadow-purple-600/30' : 'text-slate-400 hover:text-white'"
                  class="px-4 py-2 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5">
            <span>🎮</span>
            <span>رحلة الـ 100 مستوى</span>
          </button>
          <button (click)="activeMode = 'room'" 
                  [ngClass]="activeMode === 'room' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black shadow-lg shadow-purple-600/30' : 'text-slate-400 hover:text-white'"
                  class="px-4 py-2 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5">
            <span>👥</span>
            <span>إنشاء غرفة تحدي (P2P)</span>
          </button>
          <button (click)="activeMode = 'online'" 
                  [ngClass]="activeMode === 'online' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-lg shadow-amber-500/30' : 'text-slate-400 hover:text-white'"
                  class="px-4 py-2 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5">
            <span>👑</span>
            <span>لعب أونلاين (Pro)</span>
          </button>
        </div>

        <!-- ================= MODE 1: LOCAL / 100 LEVELS JOURNEY ================= -->
        <div *ngIf="activeMode === 'local'" class="space-y-6 animate-in fade-in duration-300">
          
          <!-- Current Level Info Banner -->
          <div class="flex items-center justify-between bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-3 backdrop-blur-md">
            <div class="flex items-center gap-3">
              <div class="size-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-xl font-black shadow-lg shadow-purple-500/30">
                {{ currentLevel }}
              </div>
              <div>
                <div class="text-xs font-bold text-purple-300">المستوى {{ currentLevel }} من 100 ({{ getLevelDifficultyLabel(currentLevel) }})</div>
                <div class="text-sm font-black text-white">الفزورة {{ currentRiddleIndex + 1 }} من {{ currentLevelRiddles.length }}</div>
              </div>
            </div>

            <!-- Progress in Level -->
            <div class="flex items-center gap-3">
              <div class="text-left">
                <div class="text-[10px] text-slate-400 font-mono">الإنجاز بالمستوى</div>
                <div class="text-xs font-black text-emerald-400">{{ getLevelProgressPercent() }}%</div>
              </div>
              <button (click)="openLevelsMap()" class="text-xs text-indigo-400 hover:text-indigo-300 underline cursor-pointer">
                تغيير المستوى
              </button>
            </div>
          </div>

          <!-- RIDDLE CARD -->
          <div *ngIf="currentRiddle" class="bg-gradient-to-b from-[#0e142e]/90 to-[#090d20]/95 border border-purple-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(147,51,234,0.15)] relative overflow-hidden backdrop-blur-2xl transition-all">
            
            <!-- Category & Badge -->
            <div class="flex items-center justify-between mb-4">
              <span class="bg-purple-500/20 border border-purple-400/30 text-purple-300 text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1.5">
                <span>🏷️</span>
                <span>{{ currentRiddle.category }}</span>
              </span>

              <span *ngIf="currentRiddle.isUserCreated" class="bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1">
                <span>✍️ من إبداع: {{ currentRiddle.authorName || 'لاعب' }}</span>
              </span>
            </div>

            <!-- Question Text -->
            <div class="text-xl sm:text-2xl md:text-3xl font-black text-white leading-relaxed text-center my-6 min-h-[100px] flex items-center justify-center">
              « {{ currentRiddle.question }} »
            </div>

            <!-- Hint Display (if unlocked) -->
            <div *ngIf="showHint" class="bg-amber-500/10 border border-amber-400/30 text-amber-200 text-xs sm:text-sm p-3.5 rounded-2xl mb-4 text-center animate-in fade-in duration-300 flex items-center justify-center gap-2">
              <span class="text-lg">💡</span>
              <span>تلميح: {{ currentRiddle.hint }}</span>
            </div>

            <!-- Letters Reveal (if unlocked) -->
            <div *ngIf="revealedLetter" class="bg-indigo-500/10 border border-indigo-400/30 text-indigo-200 text-xs sm:text-sm p-3 rounded-2xl mb-4 text-center animate-in fade-in duration-300">
              🔤 تبدأ الإجابة بحرف: <strong class="text-indigo-400 text-base font-black">[{{ revealedLetter }}]</strong>
            </div>

            <!-- Word Length Indicator -->
            <div class="flex items-center justify-center gap-1.5 my-4 text-slate-400 text-xs">
              <span>طول الإجابة:</span>
              <div class="flex gap-1">
                <span *ngFor="let char of getAnswerLengthArray()" class="w-3.5 h-1 rounded-full bg-purple-500/50"></span>
              </div>
              <span class="text-[11px] font-mono font-bold text-purple-300">({{ currentRiddle.answer.length }} حروف)</span>
            </div>

            <!-- Feedback Message -->
            <div *ngIf="feedbackMsg" 
                 [ngClass]="{
                   'bg-emerald-500/20 text-emerald-300 border-emerald-400/40': isAnswerCorrect,
                   'bg-amber-500/20 text-amber-300 border-amber-400/40': isAnswerClose,
                   'bg-rose-500/20 text-rose-300 border-rose-400/40': !isAnswerCorrect && !isAnswerClose
                 }"
                 class="border p-3.5 rounded-2xl text-center font-bold text-sm mb-4 animate-in fade-in zoom-in-95 duration-200">
              {{ feedbackMsg }}
            </div>

            <!-- Explanation & Success Reveal Card -->
            <div *ngIf="isAnswerCorrect || isRevealed" class="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-4 sm:p-5 mb-6 text-center animate-in zoom-in-95 duration-300">
              <div class="text-emerald-400 text-xs font-bold mb-1">الإجابة الصحيحة:</div>
              <div class="text-2xl font-black text-white mb-2">{{ currentRiddle.answer }}</div>
              <p class="text-xs text-slate-300 leading-relaxed">{{ currentRiddle.explanation }}</p>
              
              <div class="mt-4 flex justify-center">
                <button (click)="nextRiddle()" class="bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black px-8 py-2.5 rounded-2xl shadow-xl hover:scale-105 transition-all cursor-pointer flex items-center gap-2">
                  <span>الفزورة التالية</span>
                  <span>←</span>
                </button>
              </div>
            </div>

            <!-- Input Box & Submit -->
            <div *ngIf="!isAnswerCorrect && !isRevealed" class="space-y-4">
              <form (submit)="submitAnswer($event)" class="flex flex-col sm:flex-row items-stretch gap-2.5">
                <div class="relative flex-1">
                  <input type="text" 
                         [(ngModel)]="userAnswer" 
                         name="userAnswer"
                         placeholder="اكتب إجابتك هنا (يقبل المرادفات والتقريب)..." 
                         autocomplete="off"
                         autofocus
                         class="w-full h-14 bg-black/50 border-2 border-purple-500/40 focus:border-cyan-400 rounded-2xl px-5 text-base sm:text-lg text-white placeholder-slate-500 focus:outline-none transition-all text-center sm:text-right" />
                  <button *ngIf="userAnswer" type="button" (click)="userAnswer = ''" class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-sm">
                    ✕
                  </button>
                </div>
                
                <button type="submit" 
                        [disabled]="!userAnswer.trim()"
                        class="h-14 px-8 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-base shadow-lg shadow-purple-600/30 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2">
                  <span>تأكيد الإجابة</span>
                  <span>✨</span>
                </button>
              </form>

              <!-- Quick Helper Letters / Interactive Keyboard (Answer Letters + 5 Decoys) -->
              <div class="bg-black/30 border border-purple-500/20 rounded-2xl p-4 shadow-inner">
                <div class="flex items-center justify-between text-[11px] text-slate-400 mb-3 px-1 font-bold">
                  <span class="flex items-center gap-1.5">
                    <span>🔤</span>
                    <span>اختر من الحروف (حروف الإجابة + 5 إضافية):</span>
                  </span>
                  <span class="text-purple-300 font-mono font-bold">{{ quickLetters.length }} حروف</span>
                </div>
                <div class="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
                  <button *ngFor="let letter of quickLetters" 
                          type="button"
                          (click)="appendLetter(letter)" 
                          class="size-9 sm:size-10 rounded-xl bg-gradient-to-b from-indigo-900/60 to-purple-950/80 hover:from-purple-600 hover:to-indigo-600 border border-purple-400/30 hover:border-cyan-400 text-white font-black text-base flex items-center justify-center transition-all shadow-md active:scale-90 cursor-pointer">
                    {{ letter }}
                  </button>
                  <button type="button" (click)="deleteLastChar()" class="h-9 sm:h-10 px-3.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/30 text-rose-300 font-bold text-xs flex items-center justify-center transition-all cursor-pointer shadow-md">
                    ⌫ مسح
                  </button>
                  <button *ngIf="userAnswer" type="button" (click)="userAnswer = ''" class="h-9 sm:h-10 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white font-bold text-xs flex items-center justify-center transition-all cursor-pointer">
                    إفراغ
                  </button>
                </div>
              </div>
            </div>

            <!-- Hints & Helps Toolbars -->
            <div *ngIf="!isAnswerCorrect && !isRevealed" class="flex flex-wrap items-center justify-between gap-2 mt-6 pt-4 border-t border-white/10">
              <button (click)="useHint()" [disabled]="showHint || coins < 10" class="bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-40 text-amber-300 text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all">
                <span>💡 تلميح (10 🪙)</span>
              </button>
              <button (click)="revealFirstLetter()" [disabled]="revealedLetter || coins < 15" class="bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-40 text-indigo-300 text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all">
                <span>🔤 كشف حرف (15 🪙)</span>
              </button>
              <button (click)="surrenderAndReveal()" class="bg-white/5 hover:bg-rose-500/20 border border-white/10 hover:border-rose-400/30 text-rose-400 text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all">
                <span>🏳️ استسلام وكشف الإجابة</span>
              </button>
            </div>

          </div>

        </div>

        <!-- ================= MODE 2: PRIVATE ROOM / P2P ================= -->
        <div *ngIf="activeMode === 'room'" class="space-y-6 animate-in fade-in duration-300 max-w-xl mx-auto text-center">
          <div class="bg-[#0e142e]/90 border border-purple-500/30 rounded-3xl p-8 shadow-2xl backdrop-blur-xl space-y-6">
            <div class="size-16 rounded-3xl bg-indigo-600/30 border border-indigo-400/40 text-3xl flex items-center justify-center mx-auto shadow-lg">
              👥
            </div>
            
            <div>
              <h2 class="text-2xl font-black text-white mb-2">غرفة تحدي الفوازير</h2>
              <p class="text-xs text-slate-300 leading-relaxed">تحدَّ أصدقاءك في سباق حل الفوازير لحظياً عبر شبكة الغرف الخاصة!</p>
            </div>

            <div *ngIf="!roomCreated" class="space-y-4">
              <button (click)="createPrivateRoom()" class="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-base shadow-xl shadow-purple-600/30 cursor-pointer transition-all">
                إنشاء غرفة جديدة وتوليد الرابط 🚀
              </button>
            </div>

            <div *ngIf="roomCreated" class="space-y-4 animate-in zoom-in-95 duration-300">
              <div class="bg-black/50 border-2 border-dashed border-purple-400/50 p-4 rounded-2xl">
                <div class="text-xs text-slate-400 mb-1">كود الغرفة الخاص:</div>
                <div class="text-3xl font-mono font-black text-amber-400 tracking-wider">{{ p2pRoomCode }}</div>
              </div>

              <div class="flex gap-2">
                <button (click)="copyRoomLink()" class="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs cursor-pointer shadow transition-all">
                  📋 نسخ رابط الغرفة
                </button>
                <button (click)="roomCreated = false" class="py-3 px-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs cursor-pointer transition-all">
                  إلغاء
                </button>
              </div>

              <div class="text-xs text-emerald-400 font-bold">
                🟢 جاري انتظار انضمام الأصدقاء...
              </div>
            </div>
          </div>
        </div>

        <!-- ================= MODE 3: ONLINE MATCHMAKING / PRO ================= -->
        <div *ngIf="activeMode === 'online'" class="space-y-6 animate-in fade-in duration-300 max-w-xl mx-auto text-center">
          <div class="bg-gradient-to-b from-[#1c1208]/90 to-[#0e142e]/95 border-2 border-amber-500/40 rounded-3xl p-8 shadow-2xl backdrop-blur-xl space-y-6">
            <div class="size-16 rounded-3xl bg-amber-500/20 border border-amber-400/50 text-3xl flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
              👑
            </div>

            <div>
              <span class="bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-wider">
                Pro Subscribed Feature
              </span>
              <h2 class="text-2xl font-black text-white mt-3 mb-2">المواجهات المصنفة (Online Ranked)</h2>
              <p class="text-xs text-slate-300 leading-relaxed">
                خض معارك فوازير مباشرة وتنافسية مع لاعبين عشوائيين حول العالم واجمع نقاط الـ ELO للتصدر في قائمة المتصدرين العالمية!
              </p>
            </div>

            <div class="bg-black/40 border border-amber-500/30 p-4 rounded-2xl text-right space-y-2">
              <div class="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <span>✨</span> <span>مزايا النمط الاحترافي:</span>
              </div>
              <ul class="text-[11px] text-slate-300 space-y-1 list-disc list-inside">
                <li>مبارزات فوازير حية ومؤقتات زمنية سريعة.</li>
                <li>تصنيف عالمي ELO مع بطولات شهرية.</li>
                <li>مضاعفة العملات الذهبية 🪙 والنجوم ⭐.</li>
              </ul>
            </div>

            <button (click)="openProUpgradeModal()" class="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 hover:scale-[1.02] active:scale-95 text-slate-950 font-black text-base shadow-xl shadow-amber-500/30 cursor-pointer transition-all">
              بدء البحث عن منافس / ترقية إلى PRO ⚡
            </button>
          </div>
        </div>

      </main>

      <!-- ================= 100 LEVELS MAP MODAL ================= -->
      <div *ngIf="showLevelsMapModal" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
        <div class="bg-[#0b1026] border border-white/10 rounded-3xl p-6 w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-right">
          
          <div class="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
            <div>
              <h3 class="text-xl font-black text-white flex items-center gap-2">
                <span>🗺️</span>
                <span>خريطة الـ 100 مستوى</span>
              </h3>
              <p class="text-xs text-slate-400">اختر المستوى الذي ترغب في خوض فوازيره (يتدرج من الأسهل للأصعب)</p>
            </div>
            <button (click)="showLevelsMapModal = false" class="size-9 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold flex items-center justify-center cursor-pointer">
              ✕
            </button>
          </div>

          <!-- Levels Grid 1 to 100 -->
          <div class="flex-1 overflow-y-auto pr-1 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-10 gap-2.5 sm:gap-3 py-2 custom-scrollbar">
            <button *ngFor="let lvl of levelsList" 
                    (click)="selectLevel(lvl.level)"
                    [disabled]="!lvl.unlocked"
                    [ngClass]="{
                      'bg-gradient-to-br from-purple-600 to-indigo-600 border-purple-400 text-white shadow-lg shadow-purple-600/30 hover:scale-105': lvl.unlocked && lvl.level === currentLevel,
                      'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10 hover:border-purple-400/50 cursor-pointer': lvl.unlocked && lvl.level !== currentLevel,
                      'bg-black/40 border-white/5 text-slate-600 cursor-not-allowed opacity-60': !lvl.unlocked
                    }"
                    class="aspect-square rounded-2xl border flex flex-col items-center justify-center relative p-1 transition-all">
              <span class="text-base sm:text-lg font-black">{{ lvl.level }}</span>
              <span *ngIf="!lvl.unlocked" class="text-[10px] text-slate-500">🔒</span>
              <span *ngIf="lvl.unlocked" class="text-[9px] text-amber-400 font-bold">⭐ {{ lvl.stars }}/3</span>
              <span *ngIf="lvl.unlocked" class="text-[8px] text-slate-400 font-mono">{{ lvl.completedRiddles }}/100</span>
            </button>
          </div>

        </div>
      </div>

      <!-- ================= COMMUNITY CREATE RIDDLE MODAL ================= -->
      <div *ngIf="showCreateModal" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
        <div class="bg-[#0b1026] border border-purple-500/40 rounded-3xl p-6 sm:p-8 w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl text-right custom-scrollbar">
          
          <div class="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
            <div>
              <h3 class="text-xl font-black text-white flex items-center gap-2">
                <span>➕</span>
                <span>إضافة فزورة جديدة للمستويات</span>
              </h3>
              <p class="text-xs text-slate-400">شارك لغزك مع الجميع ليتم تصنيفه وإضافته لمصفوفة المستويات الـ 100!</p>
            </div>
            <button (click)="showCreateModal = false" class="size-9 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold flex items-center justify-center cursor-pointer">
              ✕
            </button>
          </div>

          <form (submit)="saveNewRiddle($event)" class="space-y-4 text-xs">
            <!-- Question -->
            <div>
              <label class="block font-bold text-slate-300 mb-1">نص الفزورة / اللغز *</label>
              <textarea [(ngModel)]="newRiddle.question" name="newQuestion" rows="3" required placeholder="مثال: ما هو الشيء الذي كلما أخذت منه كَبُر؟" class="w-full bg-black/50 border border-white/10 focus:border-purple-400 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none"></textarea>
            </div>

            <!-- Answer -->
            <div>
              <label class="block font-bold text-slate-300 mb-1">الإجابة الصحيحة النموذجية *</label>
              <input type="text" [(ngModel)]="newRiddle.answer" name="newAnswer" required placeholder="مثال: الحفرة" class="w-full bg-black/50 border border-white/10 focus:border-purple-400 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none" />
            </div>

            <!-- Synonyms -->
            <div>
              <label class="block font-bold text-slate-300 mb-1">إجابات بديلة ومرادفات مقبولة (مفصولة بفواصل)</label>
              <input type="text" [(ngModel)]="newRiddleSynonyms" name="newSynonyms" placeholder="مثال: حفرة, الجحر, بئر, الحفره" class="w-full bg-black/50 border border-white/10 focus:border-purple-400 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none" />
            </div>

            <!-- Hint & Explanation -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block font-bold text-slate-300 mb-1">تلميح الفزورة</label>
                <input type="text" [(ngModel)]="newRiddle.hint" name="newHint" placeholder="مثال: تصنعها في الأرض بالمجرفة" class="w-full bg-black/50 border border-white/10 focus:border-purple-400 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none" />
              </div>
              <div>
                <label class="block font-bold text-slate-300 mb-1">شرح وتفسير الإجابة</label>
                <input type="text" [(ngModel)]="newRiddle.explanation" name="newExp" placeholder="مثال: كلما حفرت وأخذت تراباً اتسعت" class="w-full bg-black/50 border border-white/10 focus:border-purple-400 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none" />
              </div>
            </div>

            <!-- Category & Level Selection -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block font-bold text-slate-300 mb-1">الفئة / التصنيف</label>
                <select [(ngModel)]="newRiddle.category" name="newCat" class="w-full bg-black/50 border border-white/10 focus:border-purple-400 rounded-xl p-3 text-white focus:outline-none">
                  <option value="ذكاء ومنطق">ذكاء ومنطق</option>
                  <option value="طبيعة">طبيعة</option>
                  <option value="أدوات">أدوات</option>
                  <option value="لغة وكلمات">لغة وكلمات</option>
                  <option value="فلسفة وغوامض">فلسفة وغوامض</option>
                  <option value="حساب وأرقام">حساب وأرقام</option>
                </select>
              </div>
              <div>
                <label class="block font-bold text-slate-300 mb-1">المستوى المستهدف (1 إلى 100)</label>
                <input type="number" min="1" max="100" [(ngModel)]="newRiddle.level" name="newLvl" placeholder="اتركه فارغاً للتصنيف الذكي" class="w-full bg-black/50 border border-white/10 focus:border-purple-400 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none" />
              </div>
            </div>

            <div class="pt-4 flex gap-3">
              <button type="submit" class="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm shadow-lg cursor-pointer transition-all">
                حفظ وإدراج الفزورة في المستوى 🚀
              </button>
              <button type="button" (click)="showCreateModal = false" class="px-5 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm cursor-pointer transition-all">
                إلغاء
              </button>
            </div>
          </form>

        </div>
      </div>

      <!-- Footer -->
      <footer class="relative z-10 text-center py-3 text-[11px] text-slate-500 border-t border-white/5 bg-[#050712]/50">
        Riddle Master 100 • 100 مستويات • 10,000 فزورة • نظام ذكي لفحص وتقييم الإجابات والمرادفات
      </footer>

    </div>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.2);
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(147, 51, 234, 0.4);
      border-radius: 4px;
    }
  `]
})
export class RiddleMasterComponent implements OnInit {
  private router = inject(Router);
  private toast = inject(ToastService);
  public globalState = inject(GlobalStateService);

  activeMode: 'local' | 'room' | 'online' = 'local';

  // Game State
  currentLevel = 1;
  currentRiddleIndex = 0;
  currentLevelRiddles: Riddle[] = [];
  currentRiddle: Riddle | null = null;
  userAnswer = '';
  
  // Stats
  coins = 100;
  streak = 0;
  totalStars = 0;
  
  // Hints & Visuals
  showHint = false;
  revealedLetter = '';
  isRevealed = false;
  isAnswerCorrect = false;
  isAnswerClose = false;
  feedbackMsg = '';
  soundEnabled = true;

  // Modals State
  showLevelsMapModal = false;
  showCreateModal = false;
  levelsProgress: Record<number, LevelProgress> = {};
  levelsList: LevelProgress[] = [];

  // P2P Room
  roomCreated = false;
  p2pRoomCode = '';

  // Dynamic quick letters (Exact answer letters + exactly 5 random decoys)
  quickLetters: string[] = [];

  // New Riddle Form Model
  newRiddle: Partial<Riddle> = {
    category: 'ذكاء ومنطق',
    level: 1
  };
  newRiddleSynonyms = '';

  ngOnInit() {
    this.loadProgress();
    const lastState = getLastPlayedState();
    this.loadLevel(lastState.level, lastState.riddleIndex);
  }

  loadProgress() {
    this.levelsProgress = getStoredProgress();
    this.levelsList = Object.values(this.levelsProgress).sort((a, b) => a.level - b.level);
    this.totalStars = this.levelsList.reduce((acc, curr) => acc + curr.stars, 0);
  }

  loadLevel(lvl: number, riddleIndex?: number) {
    this.currentLevel = Math.min(Math.max(lvl, 1), 100);
    this.currentLevelRiddles = generateLevelRiddles(this.currentLevel);

    if (typeof riddleIndex === 'number') {
      this.currentRiddleIndex = Math.min(riddleIndex, Math.max(0, this.currentLevelRiddles.length - 1));
    } else {
      const prog = this.levelsProgress[this.currentLevel];
      const completed = prog ? prog.completedRiddles : 0;
      this.currentRiddleIndex = Math.min(completed, Math.max(0, this.currentLevelRiddles.length - 1));
    }

    saveLastPlayedState(this.currentLevel, this.currentRiddleIndex);
    this.loadCurrentRiddle();
  }

  loadCurrentRiddle() {
    if (this.currentLevelRiddles.length > 0) {
      this.currentRiddle = this.currentLevelRiddles[this.currentRiddleIndex];
    } else {
      this.currentRiddle = null;
    }
    this.resetRiddleState();
  }

  resetRiddleState() {
    this.userAnswer = '';
    this.showHint = false;
    this.revealedLetter = '';
    this.isRevealed = false;
    this.isAnswerCorrect = false;
    this.isAnswerClose = false;
    this.feedbackMsg = '';
    this.generateQuickLetters();
  }

  generateQuickLetters() {
    if (!this.currentRiddle || !this.currentRiddle.answer) {
      this.quickLetters = [];
      return;
    }

    // Clean answer letters: keep all letters of the answer
    const answerClean = this.currentRiddle.answer.replace(/[\s\-_0-9،,.:;!؟?]/g, '');
    const answerChars = answerClean.split('');

    const fullAlphabet = ['أ', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'هـ', 'و', 'ي'];

    // Pick exactly 5 random decoy letters from outside the answer letters (or full alphabet)
    const nonAnswerAlphabet = fullAlphabet.filter(char => !answerChars.includes(char));
    const shuffledNonAnswer = [...nonAnswerAlphabet].sort(() => Math.random() - 0.5);
    const decoys = shuffledNonAnswer.slice(0, 5);

    // If answer contains almost everything, fill up to 5 decoys
    while (decoys.length < 5) {
      const randomChar = fullAlphabet[Math.floor(Math.random() * fullAlphabet.length)];
      decoys.push(randomChar);
    }

    // Combine answer characters + exactly 5 extra decoy letters, and shuffle
    const combined = [...answerChars, ...decoys];
    this.quickLetters = combined.sort(() => Math.random() - 0.5);
  }

  appendLetter(char: string) {
    this.userAnswer += char;
    this.playChimeSound(400);
  }

  deleteLastChar() {
    if (this.userAnswer.length > 0) {
      this.userAnswer = this.userAnswer.slice(0, -1);
      this.playChimeSound(300);
    }
  }

  getAnswerLengthArray(): number[] {
    if (!this.currentRiddle || !this.currentRiddle.answer) return [];
    return new Array(this.currentRiddle.answer.replace(/\s+/g, '').length).fill(0);
  }

  getLevelDifficultyLabel(level: number): string {
    if (level <= 20) return 'سهل وممتع 🌱';
    if (level <= 40) return 'متوسط ومنطقي 💡';
    if (level <= 60) return 'متقدم وألعاب كلمات 🧠';
    if (level <= 80) return 'خبير وألغاز رياضية ⚡';
    return 'قمة العباقرة 👑';
  }

  getLevelProgressPercent(): number {
    const prog = this.levelsProgress[this.currentLevel];
    if (!prog) return 0;
    return Math.min(Math.round((prog.completedRiddles / 100) * 100), 100);
  }

  submitAnswer(e?: Event) {
    if (e) e.preventDefault();
    if (!this.currentRiddle || !this.userAnswer.trim()) return;

    const result = checkRiddleAnswer(this.userAnswer, this.currentRiddle);
    this.feedbackMsg = result.feedback;
    this.isAnswerCorrect = result.isCorrect;
    this.isAnswerClose = result.isClose;

    if (result.isCorrect) {
      this.playSuccessSound();
      this.coins += 15;
      this.streak += 1;
      
      // Update Level Progress
      const prog = this.levelsProgress[this.currentLevel];
      if (prog) {
        prog.completedRiddles = Math.min(Math.max(prog.completedRiddles, this.currentRiddleIndex + 1), 100);
        prog.stars = prog.completedRiddles >= 75 ? 3 : (prog.completedRiddles >= 40 ? 2 : 1);
        
        // Unlock next level if 5 riddles solved or completed
        if (prog.completedRiddles >= 5 && this.currentLevel < 100) {
          const nextLvl = this.levelsProgress[this.currentLevel + 1];
          if (nextLvl) nextLvl.unlocked = true;
        }
        
        saveProgress(this.levelsProgress);
        this.loadProgress();
      }

      // Automatically save next question position so refreshing immediately shows next question
      const nextIdx = this.currentRiddleIndex + 1 < this.currentLevelRiddles.length ? this.currentRiddleIndex + 1 : 0;
      const nextLvl = this.currentRiddleIndex + 1 < this.currentLevelRiddles.length ? this.currentLevel : Math.min(this.currentLevel + 1, 100);
      saveLastPlayedState(nextLvl, nextIdx);
    } else if (result.isClose) {
      this.playChimeSound(600);
    } else {
      this.playErrorSound();
      this.streak = 0;
    }
  }

  nextRiddle() {
    if (this.currentRiddleIndex + 1 < this.currentLevelRiddles.length) {
      this.currentRiddleIndex++;
      saveLastPlayedState(this.currentLevel, this.currentRiddleIndex);
      this.loadCurrentRiddle();
    } else {
      // Level completed!
      this.toast.show(`🎉 أحسنت! أكملت المستوى ${this.currentLevel}!`, 'success', 3500);
      if (this.currentLevel < 100) {
        this.loadLevel(this.currentLevel + 1, 0);
        saveLastPlayedState(this.currentLevel + 1, 0);
      }
    }
  }

  useHint() {
    if (this.coins >= 10 && !this.showHint) {
      this.coins -= 10;
      this.showHint = true;
      this.playChimeSound(520);
    }
  }

  revealFirstLetter() {
    if (this.coins >= 15 && !this.revealedLetter && this.currentRiddle) {
      this.coins -= 15;
      this.revealedLetter = this.currentRiddle.answer.trim().charAt(0);
      this.playChimeSound(580);
    }
  }

  surrenderAndReveal() {
    this.isRevealed = true;
    this.playChimeSound(350);
  }

  openLevelsMap() {
    this.loadProgress();
    this.showLevelsMapModal = true;
  }

  selectLevel(lvl: number) {
    if (this.levelsProgress[lvl]?.unlocked) {
      this.loadLevel(lvl);
      this.showLevelsMapModal = false;
    }
  }

  openCreateRiddleModal() {
    this.newRiddle = {
      question: '',
      answer: '',
      hint: '',
      explanation: '',
      category: 'ذكاء ومنطق',
      level: this.currentLevel
    };
    this.newRiddleSynonyms = '';
    this.showCreateModal = true;
  }

  saveNewRiddle(e: Event) {
    e.preventDefault();
    if (!this.newRiddle.question?.trim() || !this.newRiddle.answer?.trim()) {
      this.toast.show('يرجى كتابة نص الفزورة والإجابة الصحيحة!', 'warning', 2500);
      return;
    }

    const syns = this.newRiddleSynonyms
      .split(/[,،]/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // Auto classify level if not manually selected
    const classifiedLevel = estimateRiddleLevel(
      this.newRiddle.question, 
      this.newRiddle.answer, 
      this.newRiddle.level
    );

    const fullRiddle: Riddle = {
      id: `custom_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      level: classifiedLevel,
      question: this.newRiddle.question.trim(),
      answer: this.newRiddle.answer.trim(),
      synonyms: syns,
      hint: this.newRiddle.hint?.trim() || 'فكر بذكاء وتمعن في الكلمات!',
      explanation: this.newRiddle.explanation?.trim() || 'إجابة منطقية ومحبوكة بدقة.',
      category: this.newRiddle.category || 'ذكاء ومنطق',
      isUserCreated: true,
      authorName: this.globalState.userProfile().name || 'بطل الألغاز',
      createdAt: Date.now()
    };

    saveCustomRiddle(fullRiddle);
    this.showCreateModal = false;
    this.toast.show(`✨ تم إدراج فزورتك بنجاح في المستوى ${classifiedLevel}!`, 'success', 3500);
    this.playSuccessSound();

    // Reload if current level matches
    if (this.currentLevel === classifiedLevel) {
      this.loadLevel(this.currentLevel);
    }
  }

  createPrivateRoom() {
    this.p2pRoomCode = 'RIDDLE-' + Math.floor(1000 + Math.random() * 9000);
    this.roomCreated = true;
    this.playChimeSound(700);
  }

  copyRoomLink() {
    const link = `${window.location.origin}/arcade/riddle-master?room=${this.p2pRoomCode}`;
    navigator.clipboard.writeText(link);
    this.toast.show('📋 تم نسخ رابط الغرفة بنجاح!', 'success', 2500);
  }

  openProUpgradeModal() {
    this.toast.show('🔒 نمط الأونلاين المصنف متاح لمشتركي Pro. يمكنك الترقية من صفحة الاشتراك!', 'info', 3500);
  }

  goBack() {
    this.router.navigate(['/arcade']);
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
  }

  // --- WEB AUDIO API SYNTHESIZER ---
  private playSuccessSound() {
    if (!this.soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.15); // G5
      osc.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.3); // C6
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } catch (e) {}
  }

  private playErrorSound() {
    if (!this.soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.setValueAtTime(130, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {}
  }

  private playChimeSound(freq = 440) {
    if (!this.soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (e) {}
  }
}
