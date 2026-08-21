import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  LucideAngularModule, 
  ArrowRight, 
  Sparkles, 
  Trophy, 
  Clock, 
  Zap, 
  RotateCcw, 
  Lock, 
  Users, 
  Globe, 
  Smartphone, 
  Copy, 
  Check, 
  Volume2, 
  VolumeX, 
  Target, 
  Award, 
  Flame, 
  Play, 
  AlertTriangle,
  Swords,
  CheckCircle2,
  XCircle,
  HelpCircle,
  TrendingUp,
  Share2
} from 'lucide-angular';
import { GlobalStateService } from '../../../core/services/global-state.service';
import { FirebaseService } from '../../../core/services/firebase.service';
import { ArcadeCloudService } from '../../../core/services/arcade-cloud.service';

export interface SchulteCell {
  number: number;
  isClicked: boolean;
  isWrongFlash: boolean;
}

export interface PlayerScoreRecord {
  name: string;
  completed: boolean;
  numbersFound: number;
  timeSpent: number; // in seconds
  mistakes: number;
  accuracy: number;
  rank?: number;
}

export type PlayMode = 'local' | 'p2p' | 'online_pro';
export type LocalSubMode = 'solo' | 'pass_and_play' | 'split_battle';

@Component({
  selector: 'app-schulte-table',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Rajdhani:wght@700;900&family=Bungee&display=swap');

    @keyframes pulseNeon {
      0%, 100% { box-shadow: 0 0 25px rgba(0, 240, 255, 0.6), 0 0 50px rgba(234, 179, 8, 0.35), inset 0 0 20px rgba(0, 240, 255, 0.3); border-color: rgba(251, 191, 36, 0.9); }
      50% { box-shadow: 0 0 45px rgba(0, 240, 255, 0.9), 0 0 90px rgba(234, 179, 8, 0.6), inset 0 0 35px rgba(0, 240, 255, 0.5); border-color: #38bdf8; }
    }
    @keyframes pulseUrgent {
      0%, 100% { box-shadow: 0 0 20px rgba(239, 68, 68, 0.6); border-color: rgba(239, 68, 68, 0.9); }
      50% { box-shadow: 0 0 50px rgba(239, 68, 68, 1); border-color: #fee2e2; }
    }
    @keyframes shakeCell {
      0%, 100% { transform: translateX(0); }
      20%, 60% { transform: translateX(-8px) rotate(-3deg); }
      40%, 80% { transform: translateX(8px) rotate(3deg); }
    }
    @keyframes popSuccess {
      0% { transform: scale(0.9); }
      50% { transform: scale(1.15); box-shadow: 0 0 30px #34d399, inset 0 0 20px #fff; }
      100% { transform: scale(1); }
    }
    @keyframes lightningZap {
      0%, 100% { opacity: 0.15; transform: scale(1); }
      50% { opacity: 0.85; transform: scale(1.02); filter: drop-shadow(0 0 15px #00f0ff); }
    }
    @keyframes hyperspaceStars {
      0% { transform: scale(0.8) rotate(0deg); opacity: 0.3; }
      50% { transform: scale(1.1) rotate(180deg); opacity: 0.7; }
      100% { transform: scale(0.8) rotate(360deg); opacity: 0.3; }
    }
    @keyframes digitalGlow {
      0%, 100% { text-shadow: 0 0 10px #fbbf24, 0 0 20px #f59e0b; }
      50% { text-shadow: 0 0 20px #fde047, 0 0 40px #f59e0b, 0 0 60px #ea580c; }
    }

    .neon-border {
      animation: pulseNeon 2.5s infinite ease-in-out;
    }
    .urgent-timer {
      animation: pulseUrgent 0.5s infinite ease-in-out;
    }
    .shake-cell {
      animation: shakeCell 0.35s ease-in-out;
    }
    .pop-success {
      animation: popSuccess 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .floating-bg {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 0;
      overflow: hidden;
      background: radial-gradient(circle at 50% 30%, #1e1035 0%, #0c071e 50%, #03000a 100%);
    }
    .hyperspace-overlay {
      position: absolute;
      inset: 0;
      background: 
        radial-gradient(1.5px 1.5px at 15% 20%, #fff, transparent),
        radial-gradient(2px 2px at 85% 15%, #00f0ff, transparent),
        radial-gradient(1.5px 1.5px at 45% 75%, #fbbf24, transparent),
        radial-gradient(2.5px 2.5px at 70% 60%, #c084fc, transparent),
        radial-gradient(1.5px 1.5px at 25% 85%, #38bdf8, transparent);
      background-size: 300px 300px;
      animation: hyperspaceStars 30s linear infinite;
    }
    .lightning-ray {
      position: absolute;
      pointer-events: none;
      filter: blur(1px);
      animation: lightningZap 4s infinite ease-in-out;
    }

    /* Cover Art Neon Header */
    .schulte-cover-title {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      line-height: 1;
      text-transform: uppercase;
      font-family: 'Rajdhani', 'Bungee', sans-serif;
    }
    .word-schulte {
      font-size: clamp(2rem, 5vw, 3.2rem);
      font-weight: 900;
      letter-spacing: 4px;
      color: #00f0ff;
      text-shadow: 0 0 15px #00f0ff, 0 0 30px #0284c7, 0 0 60px #0369a1, 0 2px 4px #000;
    }
    .word-table {
      font-size: clamp(1.6rem, 4vw, 2.6rem);
      font-weight: 900;
      letter-spacing: 6px;
      color: #fde047;
      text-shadow: 0 0 15px #fde047, 0 0 30px #f59e0b, 0 0 60px #d97706, 0 2px 4px #000;
      margin-top: -4px;
    }

    /* 3D Floating Cosmic Board Plaque (Matches Cover Image) */
    .schulte-cosmic-board {
      position: relative;
      background: linear-gradient(135deg, rgba(35, 18, 70, 0.95), rgba(12, 6, 28, 0.98));
      border: 3px solid #fbbf24;
      border-radius: 28px;
      box-shadow: 
        0 0 35px rgba(0, 240, 255, 0.6),
        0 0 75px rgba(234, 179, 8, 0.4),
        inset 0 0 25px rgba(0, 240, 255, 0.3),
        0 25px 60px rgba(0, 0, 0, 0.95);
      padding: 12px;
    }

    /* 25 Glossy Beveled Glass Crystal Cells (Matches Cover Image) */
    .schulte-crystal-cell {
      position: relative;
      background: linear-gradient(145deg, rgba(88, 28, 135, 0.85) 0%, rgba(26, 16, 60, 0.95) 100%);
      border: 2px solid rgba(56, 189, 248, 0.6);
      border-top: 2.5px solid rgba(216, 180, 254, 0.9);
      border-bottom: 3.5px solid rgba(15, 10, 30, 0.95);
      border-radius: 16px;
      box-shadow: 
        0 6px 16px rgba(0, 0, 0, 0.7),
        inset 0 1px 3px rgba(255, 255, 255, 0.5),
        inset 0 0 14px rgba(168, 85, 247, 0.35),
        0 0 10px rgba(56, 189, 248, 0.25);
      transition: all 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      overflow: hidden;
    }
    .schulte-crystal-cell::before {
      content: '';
      position: absolute;
      top: 2px;
      left: 4px;
      right: 4px;
      height: 38%;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0.02) 100%);
      border-radius: 12px 12px 6px 6px;
      pointer-events: none;
    }
    .schulte-crystal-cell:hover:not(:disabled) {
      transform: translateY(-3px) scale(1.04);
      border-color: #38bdf8;
      box-shadow: 
        0 12px 25px rgba(0, 0, 0, 0.8),
        0 0 25px rgba(0, 240, 255, 0.7),
        inset 0 0 20px rgba(251, 191, 36, 0.4);
    }
    .schulte-crystal-cell:active:not(:disabled) {
      transform: translateY(2px) scale(0.97);
    }

    /* Solved Cell */
    .schulte-crystal-cell.is-clicked {
      background: linear-gradient(145deg, rgba(16, 185, 129, 0.85) 0%, rgba(4, 120, 87, 0.95) 100%);
      border-color: #34d399;
      box-shadow: 
        0 0 25px rgba(52, 211, 153, 0.8),
        inset 0 0 15px rgba(255, 255, 255, 0.6);
      opacity: 0.9;
    }

    /* Wrong Cell */
    .schulte-crystal-cell.is-wrong {
      background: linear-gradient(145deg, rgba(239, 68, 68, 0.95) 0%, rgba(153, 27, 27, 0.98) 100%);
      border-color: #f87171;
      box-shadow: 
        0 0 35px rgba(239, 68, 68, 1),
        inset 0 0 20px rgba(255, 255, 255, 0.7);
    }

    /* Number Styling (Matches Cover Art) */
    .schulte-number-glow {
      font-family: 'Share Tech Mono', 'Rajdhani', monospace, sans-serif;
      font-size: clamp(1.4rem, 4vw, 2.4rem);
      font-weight: 900;
      color: #ffffff;
      text-shadow: 
        0 0 10px rgba(0, 240, 255, 0.95),
        0 0 22px rgba(168, 85, 247, 0.8),
        0 2px 4px #000;
      line-height: 1;
    }

    /* Cyberpunk Sci-Fi Digital LED Timer Box (Matches Cover Image Bottom) */
    .schulte-cyber-timer-box {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      margin-top: 14px;
      position: relative;
    }
    .cyber-timer-screen {
      background: linear-gradient(180deg, #050b14 0%, #010408 100%);
      border: 2px solid #00f0ff;
      border-radius: 16px;
      padding: 8px 24px;
      display: flex;
      align-items: center;
      gap: 4px;
      box-shadow: 
        0 0 25px rgba(0, 240, 255, 0.5),
        inset 0 0 15px rgba(0, 240, 255, 0.3),
        0 8px 20px rgba(0, 0, 0, 0.8);
      font-family: 'Share Tech Mono', monospace;
      font-size: clamp(1.6rem, 4vw, 2.5rem);
      font-weight: 900;
      letter-spacing: 2px;
    }
    .cyber-digits-cyan {
      color: #00f0ff;
      text-shadow: 0 0 12px #00f0ff, 0 0 25px #0284c7;
    }
    .cyber-digits-gold {
      color: #fbbf24;
      text-shadow: 0 0 12px #fbbf24, 0 0 25px #f59e0b;
      animation: digitalGlow 2s infinite ease-in-out;
    }
    .cyber-bracket {
      width: 14px;
      height: 36px;
      border: 2px solid #00f0ff;
      position: relative;
    }
    .left-bracket {
      border-right: none;
      border-radius: 8px 0 0 8px;
    }
    .right-bracket {
      border-left: none;
      border-radius: 0 8px 8px 0;
    }
  `],
  template: `
    <!-- Floating Cyber Background -->
    <div class="floating-bg">
      <img src="assets/images/schulte-table-thumb.png" class="absolute inset-0 w-full h-full object-cover opacity-30 filter blur-sm pointer-events-none scale-105" alt="Cover Backdrop">
      <div class="hyperspace-overlay"></div>
    </div>

    <div class="relative z-10 min-h-screen text-white p-2 sm:p-4 flex flex-col items-center justify-start select-none font-sans" dir="rtl">
      
      <!-- Top Navigation & Controls Bar -->
      <div class="w-full max-w-2xl flex items-center justify-between mb-3 border-b border-white/10 pb-2 backdrop-blur-md bg-white/5 px-4 py-2 rounded-2xl">
        <button (click)="goBack()" class="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white px-3 py-1.5 rounded-xl transition-all font-bold text-xs cursor-pointer shadow-lg">
          <lucide-icon [img]="ArrowRight" class="w-3.5 h-3.5"></lucide-icon>
          <span>معرض الألعاب</span>
        </button>

        <div class="flex items-center gap-2">
          <!-- Sound Toggle -->
          <button (click)="toggleSound()" class="p-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-slate-300 hover:text-white cursor-pointer" [title]="isSoundEnabled ? 'كتم الصوت' : 'تفعيل الصوت'">
            <lucide-icon [img]="isSoundEnabled ? Volume2 : VolumeX" class="w-4 h-4"></lucide-icon>
          </button>
        </div>
      </div>

      <!-- MAIN CONTAINER -->
      <div class="w-full max-w-2xl flex flex-col items-center justify-center">

        <!-- ======================================================== -->
        <!-- 1. SETUP SCREEN: MODE SELECTION & CONFIGURATION          -->
        <!-- ======================================================== -->
        <div *ngIf="gameState === 'setup'" class="bg-slate-900/80 backdrop-blur-2xl border border-cyan-500/30 rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 md:p-10 shadow-[0_0_50px_rgba(6,182,212,0.15)] space-y-6 sm:space-y-8 animate-in zoom-in-95 duration-300">
          
          <div class="text-center space-y-2 sm:space-y-3">
            <div class="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-full mb-1">
              <span class="size-2 rounded-full bg-cyan-400 animate-ping"></span>
              <span class="text-[11px] font-black text-cyan-300">اختبار الإدراك البصري والتركيز الفائق</span>
            </div>
            <h1 class="text-2xl sm:text-4xl md:text-5xl font-black bg-gradient-to-l from-white via-cyan-200 to-cyan-400 bg-clip-text text-transparent">
              جدول شولت 5×5 (Schulte Table)
            </h1>
            <p class="text-slate-400 text-xs sm:text-sm max-w-lg mx-auto leading-relaxed">
              ابحث واضغط على الأرقام من <span class="text-cyan-400 font-bold">1 إلى 25</span> بالترتيب التصاعدي الصحيح قبل انتهاء المهلة (<span class="text-amber-400 font-bold">20 ثانية</span>). إذا انتهى الوقت قبل الوصول إلى 25 تخسر الجولة!
            </p>
          </div>

          <!-- Standardized 3 Play Modes Selection -->
          <div class="space-y-3">
            <label class="text-xs font-bold text-slate-400 uppercase tracking-widest block text-right">اختر نمط اللعب (3 أنماط قياسية)</label>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              
              <!-- Mode 1: Local Play -->
              <button (click)="selectMode('local')"
                      class="p-4 sm:p-5 rounded-2xl border text-right transition-all flex flex-col justify-between space-y-3 cursor-pointer"
                      [ngClass]="selectedMode === 'local' ? 'bg-cyan-600/20 border-cyan-500 text-white shadow-lg shadow-cyan-600/20 ring-1 ring-cyan-400' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'">
                <div class="flex justify-between items-center">
                  <span class="text-2xl">📱</span>
                  <span *ngIf="selectedMode === 'local'" class="text-[10px] font-black bg-cyan-500 text-slate-950 px-2 py-0.5 rounded-full">مُحدد</span>
                </div>
                <div>
                  <h3 class="font-black text-sm text-white">1. اللعب محلياً</h3>
                  <p class="text-[11px] text-slate-400 mt-1">تحدي فردي ⚡ أو جماعي (Pass & Play) أو مواجهة ثنائية</p>
                </div>
              </button>

              <!-- Mode 2: Private Room P2P -->
              <button (click)="selectMode('p2p')"
                      class="p-4 sm:p-5 rounded-2xl border text-right transition-all flex flex-col justify-between space-y-3 cursor-pointer"
                      [ngClass]="selectedMode === 'p2p' ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-600/20 ring-1 ring-indigo-400' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'">
                <div class="flex justify-between items-center">
                  <span class="text-2xl">🔑</span>
                  <span *ngIf="selectedMode === 'p2p'" class="text-[10px] font-black bg-indigo-500 text-white px-2 py-0.5 rounded-full">مُحدد</span>
                </div>
                <div>
                  <h3 class="font-black text-sm text-white">2. إنشاء غرفة (P2P)</h3>
                  <p class="text-[11px] text-slate-400 mt-1">غرفة خاصة مع أصدقائك عبر كود الدعوة المباشر</p>
                </div>
              </button>

              <!-- Mode 3: Online Matchmaking Pro -->
              <button (click)="selectMode('online_pro')"
                      class="p-4 sm:p-5 rounded-2xl border text-right transition-all flex flex-col justify-between space-y-3 relative overflow-hidden cursor-pointer"
                      [ngClass]="selectedMode === 'online_pro' ? 'bg-purple-600/20 border-purple-500 text-white shadow-lg shadow-purple-600/20 ring-1 ring-purple-400' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'">
                <div class="flex justify-between items-center">
                  <span class="text-2xl">🌐</span>
                  <span class="text-[10px] font-black bg-purple-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                    <lucide-icon [img]="Lock" class="w-3 h-3"></lucide-icon> Pro
                  </span>
                </div>
                <div>
                  <h3 class="font-black text-sm text-white">3. لعب أونلاين Pro</h3>
                  <p class="text-[11px] text-slate-400 mt-1">مطابقة أونلاين وتصنيف عالمي للمشتركين</p>
                </div>
              </button>
            </div>
          </div>

          <!-- Local Sub-Mode Selection (If Mode 1 is chosen) -->
          <div *ngIf="selectedMode === 'local'" class="space-y-3 bg-black/30 p-4 sm:p-6 rounded-3xl border border-white/5">
            <label class="text-xs font-bold text-slate-400 uppercase tracking-widest block text-right">نوع اللعب المحلي</label>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
              <button (click)="localSubMode = 'solo'" 
                      [ngClass]="localSubMode === 'solo' ? 'bg-cyan-500 text-slate-950 font-black shadow-md' : 'bg-white/5 text-slate-300 hover:bg-white/10 font-bold'" 
                      class="py-3 px-3 rounded-2xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5">
                <span>⚡ فردي سريع (Solo)</span>
              </button>
              <button (click)="localSubMode = 'pass_and_play'" 
                      [ngClass]="localSubMode === 'pass_and_play' ? 'bg-cyan-500 text-slate-950 font-black shadow-md' : 'bg-white/5 text-slate-300 hover:bg-white/10 font-bold'" 
                      class="py-3 px-3 rounded-2xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5">
                <span>👥 تمرير الشاشة (2-6 لاعبين)</span>
              </button>
              <button (click)="localSubMode = 'split_battle'" 
                      [ngClass]="localSubMode === 'split_battle' ? 'bg-cyan-500 text-slate-950 font-black shadow-md' : 'bg-white/5 text-slate-300 hover:bg-white/10 font-bold'" 
                      class="py-3 px-3 rounded-2xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5">
                <span>⚔️ مواجهة ثنائية (1v1)</span>
              </button>
            </div>
          </div>

          <!-- Time Limit Difficulty Selection -->
          <div class="space-y-3 bg-black/30 p-4 sm:p-6 rounded-3xl border border-white/5">
            <div class="flex justify-between items-center">
              <label class="text-xs font-bold text-slate-400 uppercase tracking-widest">⏱️ المهلة الزمنية للجولة</label>
              <span class="text-xs text-amber-400 font-bold">القياسي: 20 ثانية</span>
            </div>
            <div class="grid grid-cols-3 gap-2 sm:gap-3">
              <button (click)="timeLimit = 20" 
                      [ngClass]="timeLimit === 20 ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-lg shadow-amber-500/20' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 font-bold'" 
                      class="py-3.5 rounded-2xl border text-center transition-all cursor-pointer text-xs sm:text-sm">
                20 ثانية ⭐ (القياسي)
              </button>
              <button (click)="timeLimit = 15" 
                      [ngClass]="timeLimit === 15 ? 'bg-rose-500 text-white border-rose-400 font-black shadow-lg shadow-rose-500/20' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 font-bold'" 
                      class="py-3.5 rounded-2xl border text-center transition-all cursor-pointer text-xs sm:text-sm">
                15 ثانية 🔥 (ناري محترف)
              </button>
              <button (click)="timeLimit = 30" 
                      [ngClass]="timeLimit === 30 ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-lg shadow-emerald-500/20' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 font-bold'" 
                      class="py-3.5 rounded-2xl border text-center transition-all cursor-pointer text-xs sm:text-sm">
                30 ثانية 🧠 (تدريب هادئ)
              </button>
            </div>
          </div>

          <!-- Pass & Play Players List -->
          <div *ngIf="selectedMode === 'local' && localSubMode === 'pass_and_play'" class="space-y-4 bg-black/30 p-4 sm:p-6 rounded-3xl border border-white/5">
            <div class="flex justify-between items-center">
              <label class="text-xs font-bold text-slate-400 uppercase tracking-widest">أسماء المتنافسين (2 إلى 6 لاعبين)</label>
              <button (click)="addPlayer()" [disabled]="playersList.length >= 6" class="text-xs font-bold text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 px-3 py-1.5 rounded-xl border border-cyan-500/20 disabled:opacity-40 cursor-pointer">
                + إضافة لاعب
              </button>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div *ngFor="let p of playersList; let i = index; trackBy: trackByIndex" class="flex items-center gap-2">
                <input type="text" [(ngModel)]="playersList[i]" placeholder="اسم اللاعب..." class="w-full h-11 bg-white/5 border border-white/10 rounded-2xl px-4 text-xs text-white text-right focus:outline-none focus:border-cyan-500 font-bold" />
                <button *ngIf="playersList.length > 2" (click)="removePlayer(i)" class="text-rose-400 hover:bg-rose-500/10 p-2 rounded-xl cursor-pointer">✕</button>
              </div>
            </div>
          </div>

          <!-- P2P Room Configuration Details -->
          <div *ngIf="selectedMode === 'p2p'" class="p-5 bg-indigo-950/40 border border-indigo-500/30 rounded-3xl space-y-4">
            <div class="flex justify-between items-center">
              <h4 class="font-bold text-xs text-indigo-300">تفاصيل الغرفة الخاصة (P2P):</h4>
              <span class="text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-xl">كود الغرفة: {{ p2pRoomCode }}</span>
            </div>
            <p class="text-xs text-slate-300">شارك هذا الكود مع أصدقائك لينضموا إليك في تحدي شولت اللحظي!</p>
            <div class="flex gap-2">
              <input type="text" readonly [value]="p2pShareLink" class="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-slate-300" />
              <button (click)="copyRoomLink()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer">
                {{ isLinkCopied ? '✓ تم النسخ' : 'نسخ الرابط' }}
              </button>
            </div>
          </div>

          <!-- Pro Restriction Banner (Mode 3) -->
          <div *ngIf="selectedMode === 'online_pro' && !isProUser" class="p-5 bg-purple-950/40 border border-purple-500/40 rounded-3xl space-y-3 text-center">
            <div class="size-12 rounded-2xl bg-purple-600/20 border border-purple-500/40 text-purple-400 flex items-center justify-center mx-auto">
              <lucide-icon [img]="Lock" class="w-6 h-6"></lucide-icon>
            </div>
            <h4 class="font-black text-sm text-purple-200">نمط Pro الحصري للمشتركين 👑</h4>
            <p class="text-xs text-slate-300 max-w-md mx-auto">
              اللعب والمطابقة التنافسية أونلاين وحفظ التصنيفات العالمية مخصصة لمشتركي باقة Pro المميزة لتوفير استهلاك الخوادم.
            </p>
            <button (click)="openProModal()" class="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-lg shadow-purple-600/30 transition-all cursor-pointer">
              الترقية إلى Pro الآن ⚡
            </button>
          </div>

          <!-- Personal Best Record Card -->
          <div *ngIf="bestRecord" class="flex items-center justify-between bg-black/40 border border-cyan-500/20 px-5 py-3.5 rounded-2xl">
            <div class="flex items-center gap-3">
              <span class="text-2xl">🏆</span>
              <div>
                <span class="text-[11px] text-slate-400 font-bold block">أفضل رقم قياسي لك:</span>
                <span class="text-sm font-black text-cyan-300 font-mono">{{ bestRecord.timeSpent.toFixed(2) }} ثانية (دقة {{ bestRecord.accuracy }}%)</span>
              </div>
            </div>
            <span class="text-[10px] text-slate-400 font-mono">{{ bestRecord.date }}</span>
          </div>

          <!-- Start Game Button -->
          <button (click)="startGame()" class="w-full h-14 bg-gradient-to-r from-cyan-500 via-teal-500 to-cyan-600 hover:from-cyan-400 hover:to-teal-400 text-slate-950 rounded-2xl font-black text-base shadow-xl shadow-cyan-500/25 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer">
            <lucide-icon [img]="Play" class="w-5 h-5 fill-current"></lucide-icon>
            <span>ابدأ تحدي جدول شولت ({{ timeLimit }} ثانية) ⚡</span>
          </button>
        </div>

        <!-- ======================================================== -->
        <!-- 2. MAIN PLAYING STAGE (SOLO & PASS-AND-PLAY)             -->
        <!-- ======================================================== -->
        <div *ngIf="gameState === 'playing' && localSubMode !== 'split_battle'" class="w-full flex flex-col items-center justify-center animate-in fade-in duration-300">
          
          <!-- Top Cover Title Header (Matches Outside Cover Image Exactly) -->
          <div class="schulte-cover-title mb-1 select-none">
            <span class="word-schulte">SCHULTE</span>
            <span class="word-table">TABLE 5X5</span>
          </div>

          <!-- Sleek Floating Micro-HUD Badges -->
          <div class="flex items-center justify-between w-full max-w-[450px] px-2 mb-2">
            <div class="bg-cyan-950/80 border border-cyan-400/60 px-3 py-1 rounded-xl text-xs flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,240,255,0.3)]">
              <span class="text-cyan-300 font-bold text-[10px]">الهدف:</span>
              <span class="text-white font-mono font-black text-sm">{{ currentTarget }}</span>
            </div>

            <div *ngIf="selectedMode === 'local' && localSubMode === 'pass_and_play'" class="bg-indigo-950/80 border border-indigo-400/60 px-3 py-1 rounded-xl text-indigo-200 font-bold text-xs">
              👤 {{ playersList[currentPlayerIndex] }}
            </div>

            <div class="bg-purple-950/80 border border-purple-400/60 px-3 py-1 rounded-xl text-xs flex items-center gap-1.5 shadow-[0_0_12px_rgba(168,85,247,0.3)]">
              <span class="text-purple-300 font-bold text-[10px]">التقدم:</span>
              <span class="text-emerald-400 font-mono font-black text-sm">{{ currentTarget - 1 }}/25</span>
            </div>
          </div>

          <!-- THE 5x5 SCHULTE TABLE 3D COSMIC BOARD (Matches Outside Cover Image) -->
          <div class="schulte-cosmic-board max-w-[450px] mx-auto w-full aspect-square relative neon-border">
            <!-- Lightning Arcs in the corners -->
            <svg class="absolute inset-0 w-full h-full pointer-events-none z-10 opacity-70 overflow-visible" viewBox="0 0 450 450">
              <path d="M 0 0 L 80 70 L 60 110 L 150 160 L 130 190 L 225 225" stroke="#00f0ff" stroke-width="2.5" fill="none" class="lightning-ray"/>
              <path d="M 450 0 L 370 90 L 390 130 L 300 180 L 320 210 L 225 225" stroke="#fde047" stroke-width="2.5" fill="none" class="lightning-ray" style="animation-delay: 1.5s"/>
              <path d="M 0 450 L 90 360 L 70 320 L 160 270 L 225 225" stroke="#c084fc" stroke-width="2" fill="none" class="lightning-ray" style="animation-delay: 2.5s"/>
              <path d="M 450 450 L 360 370 L 380 330 L 290 280 L 225 225" stroke="#38bdf8" stroke-width="2.5" fill="none" class="lightning-ray" style="animation-delay: 0.8s"/>
            </svg>

            <div class="grid grid-cols-5 grid-rows-5 gap-1.5 sm:gap-2.5 h-full w-full relative z-0">
              <button 
                *ngFor="let cell of grid; let idx = index"
                (click)="onCellClick(cell, idx)"
                [disabled]="cell.isClicked"
                class="schulte-crystal-cell flex items-center justify-center cursor-pointer select-none"
                [ngClass]="{
                  'is-clicked pop-success': cell.isClicked,
                  'is-wrong shake-cell': cell.isWrongFlash
                }">
                
                <span class="schulte-number-glow">{{ cell.number }}</span>

                <!-- Completed Check Badge -->
                <span *ngIf="cell.isClicked" class="absolute top-1 right-1 size-3.5 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center text-[9px] font-black shadow-lg">
                  ✓
                </span>
              </button>
            </div>
          </div>

          <!-- Cyberpunk Sci-Fi Digital LED Timer Box (Matches Outside Cover Image Bottom) -->
          <div class="schulte-cyber-timer-box" dir="ltr">
            <div class="cyber-bracket left-bracket"></div>
            <div class="cyber-timer-screen" dir="ltr">
              <span class="cyber-digits-cyan">00:</span>
              <span class="cyber-digits-gold">{{ formatSeconds(remainingTime) }}</span>
            </div>
            <div class="cyber-bracket right-bracket"></div>
          </div>

          <!-- In-Game Footer Controls -->
          <div class="flex items-center justify-center pt-2">
            <button (click)="giveUp()" class="text-xs text-slate-400 hover:text-rose-400 font-bold px-3 py-1 rounded-xl hover:bg-rose-500/10 transition-all cursor-pointer">
              استسلام / إعادة البدء ✕
            </button>
          </div>
        </div>

        <!-- ======================================================== -->
        <!-- 3. 1v1 SPLIT-SCREEN BATTLE (MODE 1: SUB-MODE 3)          -->
        <!-- ======================================================== -->
        <div *ngIf="gameState === 'playing' && localSubMode === 'split_battle'" class="bg-slate-900/90 backdrop-blur-2xl border border-cyan-500/30 rounded-[2rem] p-4 sm:p-6 shadow-2xl space-y-5 animate-in fade-in duration-300">
          
          <!-- Top Cover Title Header -->
          <div class="schulte-cover-title my-1">
            <span class="word-schulte">SCHULTE</span>
            <span class="word-table">1v1 BATTLE</span>
          </div>

          <!-- Battle Top Timer -->
          <div class="flex items-center justify-between bg-black/50 p-3 sm:p-4 rounded-2xl border border-white/5">
            <div class="text-right">
              <span class="text-[10px] text-cyan-400 font-bold block">اللاعب 1 (أزرق)</span>
              <span class="text-base font-black text-cyan-300">الهدف: {{ battleP1Target }}</span>
            </div>

            <!-- Cyberpunk Timer -->
            <div class="schulte-cyber-timer-box !mt-0">
              <div class="cyber-timer-screen !py-1 !px-4 !text-xl">
                <span class="cyber-digits-cyan">00:</span>
                <span class="cyber-digits-gold">{{ formatSeconds(remainingTime) }}</span>
              </div>
            </div>

            <div class="text-left">
              <span class="text-[10px] text-rose-400 font-bold block">اللاعب 2 (أحمر)</span>
              <span class="text-base font-black text-rose-300">الهدف: {{ battleP2Target }}</span>
            </div>
          </div>

          <!-- Two Side-by-Side 5x5 Tables -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <!-- Player 1 Table -->
            <div class="schulte-cosmic-board !p-2 space-y-1.5">
              <div class="flex justify-between items-center text-xs font-bold text-cyan-300 px-1">
                <span>👤 اللاعب 1</span>
                <span>{{ battleP1Target - 1 }} / 25</span>
              </div>
              <div class="grid grid-cols-5 grid-rows-5 gap-1 aspect-square">
                <button 
                  *ngFor="let cell of battleP1Grid; let idx = index"
                  (click)="onBattleP1Click(cell, idx)"
                  [disabled]="cell.isClicked"
                  class="schulte-crystal-cell flex items-center justify-center cursor-pointer select-none"
                  [ngClass]="{
                    'is-clicked': cell.isClicked,
                    'is-wrong shake-cell': cell.isWrongFlash
                  }">
                  <span class="schulte-number-glow !text-base sm:!text-lg">{{ cell.number }}</span>
                </button>
              </div>
            </div>

            <!-- Player 2 Table -->
            <div class="schulte-cosmic-board !p-2 !border-rose-500 space-y-1.5">
              <div class="flex justify-between items-center text-xs font-bold text-rose-300 px-1">
                <span>👤 اللاعب 2</span>
                <span>{{ battleP2Target - 1 }} / 25</span>
              </div>
              <div class="grid grid-cols-5 grid-rows-5 gap-1 aspect-square">
                <button 
                  *ngFor="let cell of battleP2Grid; let idx = index"
                  (click)="onBattleP2Click(cell, idx)"
                  [disabled]="cell.isClicked"
                  class="schulte-crystal-cell flex items-center justify-center cursor-pointer select-none"
                  [ngClass]="{
                    'is-clicked': cell.isClicked,
                    'is-wrong shake-cell': cell.isWrongFlash
                  }">
                  <span class="schulte-number-glow !text-base sm:!text-lg">{{ cell.number }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- ======================================================== -->
        <!-- 4. VICTORY RESULT SCREEN                                 -->
        <!-- ======================================================== -->
        <div *ngIf="gameState === 'victory'" class="bg-slate-900/95 backdrop-blur-2xl border-2 border-emerald-500/50 rounded-[2.5rem] p-6 sm:p-10 shadow-[0_0_80px_rgba(16,185,129,0.3)] space-y-6 text-center animate-in zoom-in-95 duration-300">
          
          <div class="size-20 bg-emerald-500/20 border-2 border-emerald-400/50 text-emerald-400 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20 animate-bounce">
            <span class="text-4xl">🏆</span>
          </div>

          <div class="space-y-1">
            <h2 class="text-2xl sm:text-4xl font-black text-white">
              مبروك! انتصار ساحق ⚡
            </h2>
            <p class="text-emerald-400 font-bold text-sm sm:text-base">
              {{ getBrainSpeedTitle(lastResultTime) }}
            </p>
          </div>

          <!-- Stats Grid -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-black/40 p-4 rounded-3xl border border-white/5">
            <div class="p-3 bg-white/5 rounded-2xl">
              <span class="text-[11px] text-slate-400 font-bold block mb-1">وقت الإنجاز</span>
              <span class="text-xl sm:text-2xl font-black text-cyan-300 font-mono">{{ lastResultTime.toFixed(2) }}s</span>
            </div>
            <div class="p-3 bg-white/5 rounded-2xl">
              <span class="text-[11px] text-slate-400 font-bold block mb-1">الوقت المتبقي</span>
              <span class="text-xl sm:text-2xl font-black text-emerald-400 font-mono">{{ (timeLimit - lastResultTime).toFixed(2) }}s</span>
            </div>
            <div class="p-3 bg-white/5 rounded-2xl">
              <span class="text-[11px] text-slate-400 font-bold block mb-1">معدل رد الفعل</span>
              <span class="text-xl sm:text-2xl font-black text-amber-300 font-mono">{{ (lastResultTime / 25).toFixed(2) }}s/رقم</span>
            </div>
            <div class="p-3 bg-white/5 rounded-2xl">
              <span class="text-[11px] text-slate-400 font-bold block mb-1">نسبة الدقة</span>
              <span class="text-xl sm:text-2xl font-black text-purple-300 font-mono">{{ lastResultAccuracy }}%</span>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-col sm:flex-row gap-3 pt-2">
            <button (click)="playAgain()" class="flex-1 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-2xl text-sm transition-all shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer flex items-center justify-center gap-2">
              <lucide-icon [img]="RotateCcw" class="w-4 h-4"></lucide-icon>
              <span>لعب جولة جديدة 🔄</span>
            </button>
            <button (click)="resetToSetup()" class="flex-1 h-12 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl text-sm transition-all border border-white/10 cursor-pointer">
              القائمة الرئيسية ⚙️
            </button>
          </div>
        </div>

        <!-- ======================================================== -->
        <!-- 5. GAME OVER RESULT SCREEN                               -->
        <!-- ======================================================== -->
        <div *ngIf="gameState === 'gameover'" class="bg-slate-900/95 backdrop-blur-2xl border-2 border-rose-500/50 rounded-[2.5rem] p-6 sm:p-10 shadow-[0_0_80px_rgba(239,68,68,0.3)] space-y-6 text-center animate-in zoom-in-95 duration-300">
          
          <div class="size-20 bg-rose-500/20 border-2 border-rose-400/50 text-rose-400 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-rose-500/20">
            <span class="text-4xl">⏱️</span>
          </div>

          <div class="space-y-1">
            <h2 class="text-2xl sm:text-4xl font-black text-white">
              انتهى الوقت! 💔
            </h2>
            <p class="text-rose-300 font-medium text-xs sm:text-sm">
              لم تتمكن من الوصول إلى الرقم 25 خلال المهلة المحددة ({{ timeLimit }} ثانية).
            </p>
          </div>

          <!-- Progress summary box -->
          <div class="bg-black/40 p-5 rounded-3xl border border-white/5 space-y-3">
            <div class="flex justify-between items-center text-xs text-slate-400 font-bold">
              <span>ما تم تحقيقه:</span>
              <span class="text-amber-400 font-mono text-sm">{{ currentTarget - 1 }} من 25 رقم ({{ ((currentTarget - 1) / 25 * 100).toFixed(0) }}%)</span>
            </div>
            <div class="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-white/10">
              <div class="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full" [style.width.%]="(currentTarget - 1) / 25 * 100"></div>
            </div>
            <p class="text-xs text-slate-400">
              💡 نصيحة تدريبية: ثبت نظرك في منتصف المربع واستخدم الرؤية الجانبية (Peripheral Vision) لمسح الأرقام أسرع!
            </p>
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-col sm:flex-row gap-3 pt-2">
            <button (click)="playAgain()" class="flex-1 h-12 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-slate-950 font-black rounded-2xl text-sm transition-all shadow-lg shadow-rose-500/20 active:scale-95 cursor-pointer flex items-center justify-center gap-2">
              <lucide-icon [img]="Zap" class="w-4 h-4"></lucide-icon>
              <span>حاول مجدداً ⚡</span>
            </button>
            <button (click)="resetToSetup()" class="flex-1 h-12 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl text-sm transition-all border border-white/10 cursor-pointer">
              تغيير الإعدادات ⚙️
            </button>
          </div>
        </div>

        <!-- ======================================================== -->
        <!-- 6. PASS & PLAY PODIUM LEADERBOARD STAGE                  -->
        <!-- ======================================================== -->
        <div *ngIf="gameState === 'podium'" class="bg-slate-900/95 backdrop-blur-2xl border-2 border-indigo-500/50 rounded-[2.5rem] p-6 sm:p-10 shadow-[0_0_80px_rgba(99,102,241,0.3)] space-y-6 text-center animate-in zoom-in-95 duration-300">
          
          <div class="size-20 bg-amber-500/20 border-2 border-amber-400/50 text-amber-400 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-amber-500/20">
            <span class="text-4xl">👑</span>
          </div>

          <div class="space-y-1">
            <h2 class="text-2xl sm:text-4xl font-black text-white">
              لوحة تتويج الأبطال 🏆
            </h2>
            <p class="text-indigo-300 text-xs sm:text-sm">
              النتائج النهائية للمنافسة المحلية (Pass & Play)
            </p>
          </div>

          <!-- Podium Ranking Table -->
          <div class="space-y-2.5 bg-black/40 p-4 sm:p-6 rounded-3xl border border-white/5 text-right">
            <div *ngFor="let p of podiumRankings; let idx = index" 
                 class="flex items-center justify-between p-3.5 rounded-2xl border transition-all"
                 [ngClass]="{
                   'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-md': idx === 0,
                   'bg-slate-300/10 border-slate-300/30 text-slate-200': idx === 1,
                   'bg-amber-700/15 border-amber-700/30 text-amber-400': idx === 2,
                   'bg-white/5 border-white/5 text-slate-400': idx > 2
                 }">
              
              <div class="flex items-center gap-3">
                <span class="size-8 rounded-xl font-black flex items-center justify-center text-sm"
                      [ngClass]="{
                        'bg-amber-500 text-slate-950': idx === 0,
                        'bg-slate-300 text-slate-950': idx === 1,
                        'bg-amber-700 text-white': idx === 2,
                        'bg-white/10 text-white': idx > 2
                      }">
                  {{ idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : idx + 1)) }}
                </span>
                <div>
                  <h4 class="font-black text-sm text-white">{{ p.name }}</h4>
                  <span class="text-[10px] text-slate-400">
                    {{ p.completed ? 'أكمل الـ 25 رقم بالكامل ✓' : 'وصل للرقم ' + p.numbersFound + ' من 25' }}
                  </span>
                </div>
              </div>

              <div class="text-left font-mono">
                <span class="text-sm sm:text-base font-black block" [ngClass]="idx === 0 ? 'text-amber-400' : 'text-white'">
                  {{ p.completed ? p.timeSpent.toFixed(2) + 's' : 'لم يكمل' }}
                </span>
                <span class="text-[10px] text-slate-400">دقة {{ p.accuracy }}%</span>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-col sm:flex-row gap-3 pt-2">
            <button (click)="startGame()" class="flex-1 h-12 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-slate-950 font-black rounded-2xl text-sm transition-all shadow-lg shadow-indigo-500/20 active:scale-95 cursor-pointer flex items-center justify-center gap-2">
              <lucide-icon [img]="RotateCcw" class="w-4 h-4"></lucide-icon>
              <span>بطولة جديدة 🔄</span>
            </button>
            <button (click)="resetToSetup()" class="flex-1 h-12 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl text-sm transition-all border border-white/10 cursor-pointer">
              القائمة الرئيسية ⚙️
            </button>
          </div>
        </div>

      </div>
    </div>
  `
})
export class SchulteTableComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  globalState = inject(GlobalStateService);
  private firebaseService = inject(FirebaseService);
  private arcadeCloudService = inject(ArcadeCloudService);

  // Lucide Icons
  ArrowRight = ArrowRight;
  Sparkles = Sparkles;
  Trophy = Trophy;
  Clock = Clock;
  Zap = Zap;
  RotateCcw = RotateCcw;
  Lock = Lock;
  Users = Users;
  Globe = Globe;
  Smartphone = Smartphone;
  Copy = Copy;
  Check = Check;
  Volume2 = Volume2;
  VolumeX = VolumeX;
  Target = Target;
  Award = Award;
  Flame = Flame;
  Play = Play;
  AlertTriangle = AlertTriangle;
  Swords = Swords;
  CheckCircle2 = CheckCircle2;
  XCircle = XCircle;
  HelpCircle = HelpCircle;
  TrendingUp = TrendingUp;
  Share2 = Share2;

  // Game Configuration State
  selectedMode: PlayMode = 'local';
  localSubMode: LocalSubMode = 'solo';
  timeLimit: number = 20; // Default: 20 seconds
  isSoundEnabled: boolean = true;
  gameState: 'setup' | 'playing' | 'victory' | 'gameover' | 'podium' = 'setup';

  // Solo & Pass-and-Play Game State
  grid: SchulteCell[] = [];
  currentTarget: number = 1;
  remainingTime: number = 20;
  timerInterval: any = null;
  startTime: number = 0;
  mistakesCount: number = 0;
  lastResultTime: number = 0;
  lastResultAccuracy: number = 100;

  // Pass-and-Play Multiplayer State
  playersList: string[] = ['اللاعب 1', 'اللاعب 2'];
  currentPlayerIndex: number = 0;
  podiumRankings: PlayerScoreRecord[] = [];

  // 1v1 Split-Screen Battle State
  battleP1Grid: SchulteCell[] = [];
  battleP2Grid: SchulteCell[] = [];
  battleP1Target: number = 1;
  battleP2Target: number = 1;

  // P2P Room State
  p2pRoomCode: string = '';
  p2pShareLink: string = '';
  isLinkCopied: boolean = false;

  // Pro Subscription State
  isProUser: boolean = false;

  // Local Best Record
  bestRecord: { timeSpent: number; accuracy: number; date: string } | null = null;

  // Web Audio Context for synthesized sound effects
  private audioCtx: AudioContext | null = null;

  ngOnInit() {
    this.initAudio();
    this.loadBestRecord();
    this.generateP2PRoomCode();
    this.checkProStatus();
  }

  ngOnDestroy() {
    this.clearIntervalTimer();
  }

  trackByIndex(index: number, item: any): number {
    return index;
  }

  goBack() {
    this.clearIntervalTimer();
    this.router.navigate(['/arcade']);
  }

  toggleSound() {
    this.isSoundEnabled = !this.isSoundEnabled;
  }

  formatSeconds(time: number): string {
    const t = Math.max(0, time);
    return t < 10 ? '0' + t.toFixed(2) : t.toFixed(2);
  }

  // --- AUDIO SYNTHESIZER (Web Audio API) ---
  private initAudio() {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
    } catch (e) {
      console.warn('AudioContext not supported', e);
    }
  }

  private playTone(freq: number, type: OscillatorType, durationMs: number, gainValue: number = 0.15) {
    if (!this.isSoundEnabled || !this.audioCtx) return;
    try {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

      gain.gain.setValueAtTime(gainValue, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + durationMs / 1000);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + durationMs / 1000);
    } catch (e) {}
  }

  private playCorrectSound(targetNum: number) {
    // Harmonic pitch goes up with each sequential number from 1 to 25
    const baseFreq = 300;
    const freq = baseFreq + (targetNum * 32);
    this.playTone(freq, 'sine', 180, 0.2);
  }

  private playWrongSound() {
    this.playTone(130, 'sawtooth', 250, 0.25);
  }

  private playUrgentTick() {
    this.playTone(880, 'triangle', 80, 0.1);
  }

  private playVictoryFanfare() {
    if (!this.isSoundEnabled || !this.audioCtx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 'sine', 350, 0.25);
      }, i * 120);
    });
  }

  private playGameOverSound() {
    if (!this.isSoundEnabled || !this.audioCtx) return;
    const notes = [400, 320, 240, 160];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 'sawtooth', 300, 0.2);
      }, i * 150);
    });
  }

  // --- GRID RANDOM GENERATOR (5x5, 1 to 25 unique) ---
  generateRandomGrid(): SchulteCell[] {
    const numbers = Array.from({ length: 25 }, (_, i) => i + 1);
    // Fisher-Yates Shuffle
    for (let i = numbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }
    return numbers.map(num => ({
      number: num,
      isClicked: false,
      isWrongFlash: false
    }));
  }

  // --- GAME MODES & SETUP ---
  selectMode(mode: PlayMode) {
    this.selectedMode = mode;
  }

  addPlayer() {
    if (this.playersList.length < 6) {
      this.playersList.push(`اللاعب ${this.playersList.length + 1}`);
    }
  }

  removePlayer(index: number) {
    if (this.playersList.length > 2) {
      this.playersList.splice(index, 1);
    }
  }

  generateP2PRoomCode() {
    this.p2pRoomCode = 'SCHULTE-' + Math.floor(1000 + Math.random() * 9000);
    if (typeof window !== 'undefined') {
      this.p2pShareLink = `${window.location.origin}/arcade/schulte-table?room=${this.p2pRoomCode}`;
    }
  }

  copyRoomLink() {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(this.p2pShareLink);
      this.isLinkCopied = true;
      setTimeout(() => this.isLinkCopied = false, 2500);
    }
  }

  checkProStatus() {
    const profile = this.globalState.userProfile();
    this.isProUser = !!(profile && ((profile as any).isPro || (profile as any).plan === 'pro'));
  }

  openProModal() {
    alert('ميزة اللعب أونلاين Pro مخصصة للمشتركين! يمكنك ترقية حسابك من قسم الإعدادات أو لوحة التحكم.');
  }

  // --- START GAME LOOP ---
  startGame() {
    this.clearIntervalTimer();
    this.mistakesCount = 0;
    this.currentTarget = 1;
    this.remainingTime = this.timeLimit;

    if (this.selectedMode === 'local' && this.localSubMode === 'pass_and_play') {
      this.currentPlayerIndex = 0;
      this.podiumRankings = [];
    }

    if (this.selectedMode === 'local' && this.localSubMode === 'split_battle') {
      this.startSplitBattle();
      return;
    }

    this.grid = this.generateRandomGrid();
    this.gameState = 'playing';
    this.startTime = performance.now();
    this.startTimerCountdown();
  }

  startSplitBattle() {
    this.battleP1Grid = this.generateRandomGrid();
    this.battleP2Grid = this.generateRandomGrid();
    this.battleP1Target = 1;
    this.battleP2Target = 1;
    this.gameState = 'playing';
    this.startTime = performance.now();
    this.startTimerCountdown();
  }

  startTimerCountdown() {
    this.clearIntervalTimer();
    const intervalMs = 100;

    this.timerInterval = setInterval(() => {
      this.remainingTime = Math.max(0, this.remainingTime - (intervalMs / 1000));

      // Urgent tick sound when time is running out (<= 5s)
      if (this.remainingTime <= 5 && this.remainingTime > 0) {
        if (Math.floor(this.remainingTime * 10) % 10 === 0) {
          this.playUrgentTick();
        }
      }

      // Time Over Condition (< 0.05s)
      if (this.remainingTime <= 0.05) {
        this.clearIntervalTimer();
        this.handleTimeOver();
      }
    }, intervalMs);
  }

  clearIntervalTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  // --- CLICK HANDLING (SOLO & PASS-AND-PLAY) ---
  onCellClick(cell: SchulteCell, index: number) {
    if (this.gameState !== 'playing' || cell.isClicked) return;

    if (cell.number === this.currentTarget) {
      // 1. Correct Click!
      cell.isClicked = true;
      this.playCorrectSound(this.currentTarget);
      this.currentTarget++;

      // Check for 25 Complete (Win)
      if (this.currentTarget > 25) {
        this.handlePlayerWin();
      }
    } else {
      // 2. Wrong Click!
      this.mistakesCount++;
      this.playWrongSound();
      cell.isWrongFlash = true;
      setTimeout(() => {
        cell.isWrongFlash = false;
      }, 350);
    }
  }

  // --- CLICK HANDLING (1v1 SPLIT-SCREEN) ---
  onBattleP1Click(cell: SchulteCell, index: number) {
    if (this.gameState !== 'playing' || cell.isClicked) return;

    if (cell.number === this.battleP1Target) {
      cell.isClicked = true;
      this.playCorrectSound(this.battleP1Target);
      this.battleP1Target++;

      if (this.battleP1Target > 25) {
        this.clearIntervalTimer();
        this.playVictoryFanfare();
        alert('🎉 فاز اللاعب 1 بالمعركة الثنائية!');
        this.resetToSetup();
      }
    } else {
      this.playWrongSound();
      cell.isWrongFlash = true;
      setTimeout(() => cell.isWrongFlash = false, 350);
    }
  }

  onBattleP2Click(cell: SchulteCell, index: number) {
    if (this.gameState !== 'playing' || cell.isClicked) return;

    if (cell.number === this.battleP2Target) {
      cell.isClicked = true;
      this.playCorrectSound(this.battleP2Target);
      this.battleP2Target++;

      if (this.battleP2Target > 25) {
        this.clearIntervalTimer();
        this.playVictoryFanfare();
        alert('🎉 فاز اللاعب 2 بالمعركة الثنائية!');
        this.resetToSetup();
      }
    } else {
      this.playWrongSound();
      cell.isWrongFlash = true;
      setTimeout(() => cell.isWrongFlash = false, 350);
    }
  }

  // --- WIN HANDLING ---
  handlePlayerWin() {
    this.clearIntervalTimer();
    const elapsedMs = performance.now() - this.startTime;
    const timeSpent = Math.min(this.timeLimit, elapsedMs / 1000);
    this.lastResultTime = timeSpent;
    this.lastResultAccuracy = Math.round((25 / (25 + this.mistakesCount)) * 100);

    this.playVictoryFanfare();

    // Check if in Pass & Play mode
    if (this.selectedMode === 'local' && this.localSubMode === 'pass_and_play') {
      const record: PlayerScoreRecord = {
        name: this.playersList[this.currentPlayerIndex],
        completed: true,
        numbersFound: 25,
        timeSpent: timeSpent,
        mistakes: this.mistakesCount,
        accuracy: this.lastResultAccuracy
      };
      this.podiumRankings.push(record);

      this.currentPlayerIndex++;
      if (this.currentPlayerIndex < this.playersList.length) {
        alert(`👏 أحسنت يا ${record.name}! استعد يا ${this.playersList[this.currentPlayerIndex]} لبدء دورك!`);
        this.startNextPassAndPlayTurn();
      } else {
        this.showPodiumResults();
      }
      return;
    }

    // Save Solo High Score
    this.saveBestRecord(timeSpent, this.lastResultAccuracy);
    this.gameState = 'victory';
  }

  // --- TIME OVER HANDLING (LOSS) ---
  handleTimeOver() {
    this.playGameOverSound();
    const numbersFound = this.currentTarget - 1;
    this.lastResultAccuracy = Math.round((numbersFound / (numbersFound + this.mistakesCount || 1)) * 100);

    // If in Pass & Play mode
    if (this.selectedMode === 'local' && this.localSubMode === 'pass_and_play') {
      const record: PlayerScoreRecord = {
        name: this.playersList[this.currentPlayerIndex],
        completed: false,
        numbersFound: numbersFound,
        timeSpent: this.timeLimit,
        mistakes: this.mistakesCount,
        accuracy: this.lastResultAccuracy
      };
      this.podiumRankings.push(record);

      this.currentPlayerIndex++;
      if (this.currentPlayerIndex < this.playersList.length) {
        alert(`⏱️ انتهى وقت ${record.name}! استعد يا ${this.playersList[this.currentPlayerIndex]} لبدء دورك!`);
        this.startNextPassAndPlayTurn();
      } else {
        this.showPodiumResults();
      }
      return;
    }

    this.gameState = 'gameover';
  }

  startNextPassAndPlayTurn() {
    this.currentTarget = 1;
    this.mistakesCount = 0;
    this.remainingTime = this.timeLimit;
    this.grid = this.generateRandomGrid();
    this.startTime = performance.now();
    this.startTimerCountdown();
  }

  showPodiumResults() {
    // Sort podium: Completed first (by lowest time), then by highest numbersFound
    this.podiumRankings.sort((a, b) => {
      if (a.completed && b.completed) {
        return a.timeSpent - b.timeSpent;
      }
      if (a.completed && !b.completed) return -1;
      if (!a.completed && b.completed) return 1;
      return b.numbersFound - a.numbersFound;
    });

    this.gameState = 'podium';
  }

  giveUp() {
    this.clearIntervalTimer();
    this.resetToSetup();
  }

  playAgain() {
    this.startGame();
  }

  resetToSetup() {
    this.clearIntervalTimer();
    this.gameState = 'setup';
  }

  getBrainSpeedTitle(time: number): string {
    if (time < 12) return '⚡ أسطورة الإدراك البصري الفائق (سرعة عبقرية)!';
    if (time < 16) return '🧠 تركيز فولاذي وسرعة بديهة استثنائية!';
    if (time <= 20) return '🚀 بطل شولت متميز!';
    return '👍 أداء جيد!';
  }

  // --- BEST RECORD STORAGE & CLOUD SYNC ---
  private readonly BEST_RECORD_KEY = 'schulte_best_time_v1';

  private loadBestRecord() {
    if (typeof localStorage !== 'undefined') {
      try {
        const data = localStorage.getItem(this.BEST_RECORD_KEY);
        if (data) {
          this.bestRecord = JSON.parse(data);
        }
      } catch (e) {}
    }
  }

  private saveBestRecord(timeSpent: number, accuracy: number) {
    if (!this.bestRecord || timeSpent < this.bestRecord.timeSpent) {
      this.bestRecord = {
        timeSpent,
        accuracy,
        date: new Date().toLocaleDateString('ar-EG')
      };
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.BEST_RECORD_KEY, JSON.stringify(this.bestRecord));
      }
      // Cloud sync
      const profile = this.globalState.userProfile();
      const playerName = profile?.name || 'لاعب شولت';
      this.arcadeCloudService.submitHighScore('schulte-table', playerName, Math.round(10000 / timeSpent));
    }
  }
}
