import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, OnInit, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule, ArrowRight } from 'lucide-angular';
import * as THREE from 'three';
import Peer from 'peerjs';

interface PowerupConfig {
  name: string;
  icon: string;
  desc: string;
  durations: number[];
  costs: number[];
}

interface CharacterSkin {
  id: string;
  name: string;
  price: number;
  unlocked: boolean;
  color: number;
  hatColor: number;
  desc: string;
  perk: string;
  iconBg: string;
  badgeEmoji: string;
}

interface HoverboardItem {
  id: string;
  name: string;
  price: number;
  unlocked: boolean;
  color: number;
  desc: string;
  perk: string;
  iconBg: string;
}

interface MissionItem {
  id: string;
  text: string;
  target: number;
  type: 'coins' | 'distance' | 'jumps' | 'slides' | 'hoverboard' | 'powerup' | 'lane_changes';
  rewardKeys: number;
  current: number;
  completed: boolean;
}

interface LeaderboardEntry {
  date: string;
  score: number;
  coins: number;
}

@Component({
  selector: 'app-subway-surfers-3d',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="relative w-full h-[100dvh] bg-slate-950 overflow-hidden font-sans select-none text-white" dir="rtl"
         (touchstart)="onTouchStart($event)" (touchend)="onTouchEnd($event)">
      
      <!-- Top HUD (Visible during active gameplay) -->
      <div *ngIf="gameState === 'PLAYING' || gameState === 'PAUSED'" class="absolute top-4 inset-x-4 z-20 flex items-center justify-between pointer-events-none">
        
        <!-- Left HUD: Coins, Keys, Multiplier -->
        <div class="flex items-center gap-2 pointer-events-auto">
          <div class="bg-black/75 backdrop-blur-md border border-amber-400/40 px-3.5 py-1.5 rounded-2xl flex items-center gap-2 shadow-xl">
            <span class="text-lg">🪙</span>
            <span class="text-base font-black text-amber-300">{{ totalCoins.toLocaleString() }}</span>
            <span class="text-xs text-amber-200/70">(+{{ coins }})</span>
          </div>

          <div class="bg-black/75 backdrop-blur-md border border-cyan-400/40 px-3.5 py-1.5 rounded-2xl flex items-center gap-2 shadow-xl">
            <span class="text-lg">🔑</span>
            <span class="text-base font-black text-cyan-300">{{ totalKeys }}</span>
          </div>

          <div class="bg-gradient-to-r from-amber-500 to-orange-600 px-3 py-1.5 rounded-2xl font-black text-xs text-slate-950 shadow-lg animate-pulse">
            x{{ scoreMultiplier }}
          </div>
        </div>

        <!-- Center HUD: Distance & Score -->
        <div class="flex flex-col items-center">
          <div class="text-2xl sm:text-3xl font-black text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] tracking-wider">
            {{ score.toLocaleString() }} <span class="text-sm font-bold text-amber-400">متر</span>
          </div>

          <!-- Police Chase Distance Meter -->
          <div class="w-36 sm:w-48 bg-slate-900/80 border border-white/20 rounded-full h-3 overflow-hidden p-0.5 mt-1 shadow-md">
            <div class="h-full rounded-full transition-all duration-150" 
                 [ngClass]="chaseDistance < 15 ? 'bg-red-500 animate-pulse' : (chaseDistance < 30 ? 'bg-amber-500' : 'bg-emerald-500')"
                 [style.width.%]="Math.min(100, (chaseDistance / 60) * 100)"></div>
          </div>
          <span class="text-[10px] text-slate-300 font-bold mt-0.5">👮‍♂️ مسافة الشرطي: {{ Math.round(chaseDistance) }}م</span>
        </div>

        <!-- Right HUD: Missions Toggle, Pause, Sound -->
        <div class="flex items-center gap-2 pointer-events-auto">
          <button (click)="toggleMissionsBanner()" class="bg-black/75 hover:bg-black border border-white/20 p-2.5 rounded-2xl transition-all shadow-xl cursor-pointer text-xs font-bold text-amber-300">
            🎯 المهمات ({{ getCompletedMissionsCount() }}/3)
          </button>
          <button (click)="toggleSound()" class="bg-black/75 hover:bg-black border border-white/20 p-2.5 rounded-2xl transition-all shadow-xl cursor-pointer">
            <span *ngIf="!isMuted">🔊</span>
            <span *ngIf="isMuted">🔇</span>
          </button>
          <button (click)="pauseGame()" class="bg-black/75 hover:bg-black border border-white/20 px-3 py-2 rounded-2xl text-xs font-black transition-all shadow-xl cursor-pointer flex items-center gap-1.5">
            ⏸️ إيقاف
          </button>
        </div>
      </div>

      <!-- Missions Banner Dropdown in HUD -->
      <div *ngIf="showMissionsBanner && (gameState === 'PLAYING' || gameState === 'PAUSED')" class="absolute top-20 left-4 z-30 w-72 bg-slate-900/95 border-2 border-amber-500/50 backdrop-blur-md rounded-2xl p-3 shadow-2xl animate-in fade-in duration-200">
        <div class="flex items-center justify-between border-b border-white/10 pb-1.5 mb-2">
          <span class="text-xs font-black text-amber-400">🎯 مهمات المستوى {{ missionTier }}</span>
          <span class="text-[10px] text-slate-400">المضاعف: x{{ scoreMultiplier }}</span>
        </div>
        <div class="flex flex-col gap-2">
          <div *ngFor="let m of activeMissions" class="flex flex-col gap-1 bg-black/40 p-2 rounded-xl border border-white/5">
            <div class="flex items-center justify-between text-xs font-bold">
              <span>{{ m.completed ? '✅' : '📌' }} {{ m.text }}</span>
              <span class="text-amber-300">+{{ m.rewardKeys }} 🔑</span>
            </div>
            <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all duration-300" [ngClass]="m.completed ? 'bg-emerald-500' : 'bg-amber-400'" [style.width.%]="Math.min(100, (m.current / m.target) * 100)"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Streak Multiplier HUD Badge -->
      <div *ngIf="streakCombo > 2 && gameState === 'PLAYING'" class="absolute top-24 left-6 z-20 pointer-events-none animate-bounce">
        <div class="bg-gradient-to-r from-yellow-400 via-amber-500 to-red-500 text-slate-950 font-black px-4 py-1.5 rounded-2xl text-sm shadow-2xl border-2 border-white">
          ⚡ STREAK x{{ getComboMultiplier() }}! ({{ streakCombo }})
        </div>
      </div>

      <!-- Active Power-ups Bar -->
      <div class="absolute top-20 right-6 z-20 flex flex-col gap-1.5 pointer-events-none">
        <ng-container *ngFor="let pKey of powerupKeys">
          <div *ngIf="powerups[pKey]?.active" class="bg-slate-900/90 border border-amber-400/50 backdrop-blur-md px-3 py-1 rounded-2xl text-xs font-bold text-amber-300 shadow-xl flex items-center gap-1.5 animate-pulse">
            <span>{{ powerupConfigs[pKey].icon }}</span>
            <span>{{ powerupConfigs[pKey].name }}:</span>
            <span class="text-white font-black">{{ Math.ceil(powerups[pKey].timer) }}ث</span>
          </div>
        </ng-container>

        <!-- Side Collision Strike Warning Badge -->
        <div *ngIf="stumbleCount > 0 && gameState === 'PLAYING'" class="bg-red-950/95 border-2 border-red-500 text-red-200 font-black px-3.5 py-1.5 rounded-2xl text-xs shadow-[0_0_20px_rgba(239,68,68,0.7)] flex items-center gap-2 backdrop-blur-md animate-pulse">
          <span class="text-base animate-bounce">⚠️</span>
          <div class="flex flex-col">
            <span class="text-red-400 font-black">اصطدام جانبي ({{ stumbleCount }}/2)</span>
            <span class="text-[10px] text-red-200">خبطة ثانية = إمساك فوراً! (تعافٍ: {{ Math.ceil(stumbleResetTimer) }}ث)</span>
          </div>
        </div>
      </div>

      <!-- Local 2-Player Inspector Action Buttons (When mode is local_vs) -->
      <div *ngIf="activeMode === 'local_vs' && gameState === 'PLAYING'" class="absolute bottom-6 inset-x-6 z-30 flex items-center justify-between pointer-events-auto">
        <div class="bg-black/80 backdrop-blur-md border border-cyan-500/40 p-3 rounded-2xl flex items-center gap-2 shadow-2xl">
          <span class="text-xs font-black text-cyan-300">🎮 تحكم الهارب:</span>
          <span class="text-xs text-white">الأسهم ⬅️ ➡️ ⬆️ ⬇️</span>
        </div>

        <div class="bg-black/80 backdrop-blur-md border border-amber-500/40 p-2.5 rounded-2xl flex items-center gap-2 shadow-2xl">
          <span class="text-xs font-black text-amber-300">👮‍♂️ قدرات الشرطي (P2):</span>
          <button (click)="triggerCopBoost()" [disabled]="copBoostCd > 0" class="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 disabled:opacity-40 text-slate-950 font-black text-xs rounded-xl cursor-pointer">
            💨 تيربو (W) {{ copBoostCd > 0 ? '(' + copBoostCd + 's)' : '' }}
          </button>
          <button (click)="triggerCopTrap()" [disabled]="copTrapCd > 0" class="px-3 py-1.5 bg-gradient-to-r from-red-500 to-rose-600 disabled:opacity-40 text-white font-black text-xs rounded-xl cursor-pointer">
            🚧 فخ (S) {{ copTrapCd > 0 ? '(' + copTrapCd + 's)' : '' }}
          </button>
          <button (click)="triggerCopDog()" [disabled]="copDogCd > 0" class="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-indigo-600 disabled:opacity-40 text-white font-black text-xs rounded-xl cursor-pointer">
            🐕 هجوم الكلب (E) {{ copDogCd > 0 ? '(' + copDogCd + 's)' : '' }}
          </button>
        </div>
      </div>

      <!-- Floating Banner Announcements -->
      <div *ngIf="floatingBannerText" class="absolute top-28 inset-x-0 z-30 flex justify-center pointer-events-none animate-in fade-in zoom-in duration-200">
        <div class="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 text-slate-950 font-black px-6 py-2.5 rounded-full shadow-2xl border-2 border-white text-sm">
          {{ floatingBannerText }}
        </div>
      </div>

      <!-- 3D WebGL Canvas Container -->
      <div #canvasContainer class="absolute inset-0 w-full h-full z-0"></div>

      <!-- Tap to Play Sprint Prompt (Intro State) -->
      <div *ngIf="gameState === 'INTRO_IDLE'" (click)="startSprintFromIntro()" class="absolute inset-0 z-20 flex flex-col items-center justify-end pb-24 bg-gradient-to-t from-black/80 via-transparent to-transparent cursor-pointer">
        <div class="bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 px-8 py-4 rounded-full font-black text-xl shadow-[0_0_40px_rgba(245,158,11,0.8)] animate-bounce border-2 border-white">
          🏃‍♂️ اضغط في أي مكان لبدء الجري والهروب!
        </div>
        <p class="text-xs text-slate-300 font-bold mt-3">استخدم الأسهم ⬅️ ➡️ أو اسحب الشاشة للمراوغة، ⬆️ للقفز، ⬇️ للتزحلق تحت الحواجز</p>
      </div>

      <!-- ================= 1. START MENU OVERLAY (TROPICAL BEACH DASH EDITION) ================= -->
      <div *ngIf="gameState === 'MENU'" class="absolute inset-0 z-40 flex items-center justify-center p-3 sm:p-4 bg-gradient-to-br from-sky-500 via-cyan-600 to-blue-900 overflow-hidden select-none">
        
        <!-- Tropical Sunny Ocean & Beach Backdrop Overlay -->
        <div class="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-amber-200/30 via-transparent to-blue-950/80"></div>
        <div class="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-slate-950/70"></div>

        <!-- Left Side Floating Badge: Beach Dash Runner Avatar -->
        <div class="absolute left-4 sm:left-12 top-20 hidden md:flex flex-col items-center gap-1.5 z-10">
          <div class="w-16 h-16 rounded-full border-2 border-cyan-400/80 bg-slate-900/90 p-1 shadow-[0_0_25px_rgba(6,182,212,0.6)] flex items-center justify-center">
            <span class="text-3xl">🏄‍♂️</span>
          </div>
          <span class="text-xs font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">Beach Dash</span>
        </div>

        <!-- Right Side Floating Badge: Tropical Coast Avatar -->
        <div class="absolute right-4 sm:right-12 top-20 hidden md:flex flex-col items-center gap-1.5 z-10">
          <div class="w-16 h-16 rounded-full border-2 border-amber-400/80 bg-slate-900/90 p-1 shadow-[0_0_25px_rgba(245,158,11,0.6)] flex items-center justify-center">
            <span class="text-3xl">🏖️</span>
          </div>
          <span class="text-xs font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">Tropical Coast</span>
        </div>

        <!-- Center Station Card (Beach Resort Edition) -->
        <div class="relative w-full max-w-[450px] bg-slate-900/90 backdrop-blur-xl border-2 border-cyan-500/60 rounded-[36px] p-5 sm:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.95)] flex flex-col items-center text-center">
          
          <!-- Small Beach Palm Badge at Top Edge -->
          <div class="absolute -top-3.5 inset-x-0 mx-auto w-12 h-6 bg-slate-900 border border-cyan-500 rounded-full flex items-center justify-center shadow-lg text-sm z-20">
            🌴
          </div>

          <!-- Header Section: Inspector Portrait + BEACH DASH Title + Beach Cruiser Train -->
          <div class="w-full flex items-center justify-between mt-1 mb-3">
            <!-- Inspector Portrait -->
            <div class="w-16 h-16 rounded-2xl bg-gradient-to-b from-blue-950 to-slate-900 border border-cyan-400/40 flex items-center justify-center text-3xl shadow-lg relative overflow-hidden">
              <span class="transform scale-125">👮‍♂️</span>
            </div>

            <!-- Center Title & Arabic Subtitle -->
            <div class="flex flex-col items-center flex-1 px-2">
              <h1 class="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-amber-400 to-orange-500 tracking-wider drop-shadow-[0_2px_12px_rgba(245,158,11,0.7)] font-sans">
                BEACH DASH 🏖️
              </h1>
              <span class="text-xs font-bold text-cyan-200 mt-0.5 tracking-wide">الهروب عبر شاطئ البحر الاستوائي</span>
            </div>

            <!-- Beach Train Graphic -->
            <div class="w-16 h-16 rounded-2xl bg-gradient-to-b from-cyan-950 to-blue-900 border border-cyan-400/40 flex items-center justify-center text-3xl shadow-lg relative overflow-hidden">
              <span class="transform scale-125">🚆</span>
            </div>
          </div>

          <!-- Stats / Wallet Pill Bar (ذهب / طاقة / مستوى) -->
          <div class="w-full bg-black/75 border border-white/15 rounded-2xl py-2 px-3 flex items-center justify-between text-xs font-black mb-4 shadow-inner">
            <div class="flex items-center gap-1 text-amber-300">
              <span class="text-slate-400 font-bold text-[10px]">ذهب:</span>
              <span>🪙 {{ totalCoins.toLocaleString() }}</span>
            </div>
            <div class="w-px h-3.5 bg-white/20"></div>
            <div class="flex items-center gap-1 text-cyan-300">
              <span class="text-slate-400 font-bold text-[10px]">طاقة:</span>
              <span>⚡ 4</span>
            </div>
            <div class="w-px h-3.5 bg-white/20"></div>
            <div class="flex items-center gap-1 text-orange-400">
              <span class="text-slate-400 font-bold text-[10px]">مستوى:</span>
              <span>{{ missionTier }} (x{{ scoreMultiplier }}) 🔑 {{ totalKeys }}</span>
            </div>
          </div>

          <!-- 4 Ticket-Style Play Mode Buttons -->
          <div class="flex flex-col gap-2.5 w-full">
            
            <!-- Ticket 1: Single Player (Green) -->
            <button (click)="startGame('single')" class="relative w-full h-12 bg-emerald-950/70 hover:bg-emerald-900/90 border-2 border-emerald-500/80 rounded-2xl flex items-center justify-between px-3 shadow-[0_0_15px_rgba(16,185,129,0.25)] transition-all transform hover:scale-[1.02] cursor-pointer group">
              <div class="flex items-center gap-2.5">
                <span class="text-[10px] font-black text-emerald-400 border-l-2 border-dashed border-emerald-500/50 pl-2.5 py-0.5">Ticket 1</span>
                <span class="font-black text-sm text-emerald-300 group-hover:text-white">🎮 اللعب الفردي (كلاسيك)</span>
              </div>
              <span class="text-lg">🎮</span>
            </button>

            <!-- Ticket 2: Local VS (Blue) -->
            <button (click)="startGame('local_vs')" class="relative w-full h-12 bg-cyan-950/70 hover:bg-cyan-900/90 border-2 border-cyan-500/80 rounded-2xl flex items-center justify-between px-3 shadow-[0_0_15px_rgba(6,182,212,0.25)] transition-all transform hover:scale-[1.02] cursor-pointer group">
              <div class="flex items-center gap-2.5">
                <span class="text-[10px] font-black text-cyan-400 border-l-2 border-dashed border-cyan-500/50 pl-2.5 py-0.5">Ticket 2</span>
                <span class="font-black text-sm text-cyan-300 group-hover:text-white">👥 اللعب محلياً (شرطي ضد هارب)</span>
              </div>
              <span class="text-lg">👥</span>
            </button>

            <!-- Ticket 3: Private Room P2P (Charcoal/Silver) -->
            <button (click)="openRoomModal()" class="relative w-full h-12 bg-slate-800/90 hover:bg-slate-700 border-2 border-slate-500/80 rounded-2xl flex items-center justify-between px-3 shadow-md transition-all transform hover:scale-[1.02] cursor-pointer group">
              <div class="flex items-center gap-2.5">
                <span class="text-[10px] font-black text-slate-400 border-l-2 border-dashed border-slate-500/50 pl-2.5 py-0.5">Ticket 3</span>
                <span class="font-black text-sm text-slate-200 group-hover:text-white">🎯 إنشاء غرفة خاصة (P2P Online)</span>
              </div>
              <span class="text-lg">🔗</span>
            </button>

            <!-- Ticket Pro: Online Pro (Purple) -->
            <button (click)="startProMode()" class="relative w-full h-12 bg-purple-950/70 hover:bg-purple-900/90 border-2 border-purple-500/80 rounded-2xl flex items-center justify-between px-3 shadow-[0_0_15px_rgba(168,85,247,0.25)] transition-all transform hover:scale-[1.02] cursor-pointer group">
              <div class="flex items-center gap-2.5">
                <span class="text-[10px] font-black text-purple-400 border-l-2 border-dashed border-purple-500/50 pl-2.5 py-0.5">Pro</span>
                <span class="font-black text-sm text-purple-300 group-hover:text-white">🏆 اللعب أونلاين Pro (للمحترفين)</span>
              </div>
              <span class="text-lg">🏆</span>
            </button>

          </div>

          <!-- Bottom 3 Action Pills: Heroes, Spin Wheel, Shop -->
          <div class="grid grid-cols-3 gap-2 w-full mt-3.5">
            <button (click)="openLeaderboard()" class="py-2 px-1 bg-slate-800/90 hover:bg-slate-700 border border-white/10 rounded-2xl text-xs font-black text-slate-300 flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all hover:scale-105">
              <span class="text-base">👑</span>
              <span>Heroes</span>
            </button>

            <button (click)="openWheel()" class="py-2 px-1 bg-slate-800/90 hover:bg-slate-700 border border-white/10 rounded-2xl text-xs font-black text-slate-300 flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all hover:scale-105">
              <span class="text-base">🎡</span>
              <span>Spin Wheel</span>
            </button>

            <button (click)="openShop()" class="py-2 px-1 bg-slate-800/90 hover:bg-slate-700 border border-white/10 rounded-2xl text-xs font-black text-slate-300 flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all hover:scale-105">
              <span class="text-base">🏪</span>
              <span>Shop</span>
            </button>
          </div>

          <!-- Exit Link -->
          <button (click)="exitToArcade()" class="mt-3.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1">
            <span>العودة إلى صالة الألعاب</span> <lucide-icon [img]="ArrowRight" class="w-3.5 h-3.5"></lucide-icon>
          </button>

        </div>
      </div>

      <!-- ================= 2. SAVE ME / QUICK REVIVE MODAL (5s COUNTDOWN) ================= -->
      <div *ngIf="gameState === 'SAVEME'" class="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in zoom-in duration-200">
        <div class="relative w-full max-w-sm bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-cyan-400 rounded-[32px] p-6 shadow-2xl flex flex-col items-center text-center">
          <div class="text-4xl mb-2">⚡ 🔑 💥</div>
          <h3 class="text-2xl font-black text-cyan-300">{{ saveMeTitle }}</h3>
          <p class="text-xs text-slate-300 mt-1 mb-4">{{ saveMeSubtitle }}</p>

          <!-- 5s Countdown Progress Bar -->
          <div class="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden mb-5 border border-white/10">
            <div class="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all duration-100" [style.width.%]="saveMeTimerPercent"></div>
          </div>

          <button (click)="executeRevive()" [disabled]="totalKeys < getReviveKeyCost() && totalCoins < 100" class="w-full py-3.5 bg-gradient-to-r from-cyan-400 to-blue-600 hover:from-cyan-300 hover:to-blue-500 disabled:opacity-50 text-slate-950 font-black text-base rounded-2xl shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 mb-3">
            <span>🔑 متابعة ({{ getReviveKeyCost() }} مفتاح أو 100 🪙)</span>
          </button>

          <button (click)="skipSaveMeAndGameOver()" class="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer py-1">
            تخطي إلى شاشة النهاية ❌
          </button>
        </div>
      </div>

      <!-- ================= 3. LIVING 3D CINEMATIC GAME OVER UI ================= -->
      <div *ngIf="gameState === 'GAMEOVER'" class="absolute inset-0 z-50 flex flex-col justify-between p-3 sm:p-6 bg-gradient-to-t from-black/60 via-transparent to-black/40 animate-in fade-in duration-300 select-none pointer-events-none">
        
        <!-- Top Loss Title Banner (Pointer Events Auto) -->
        <div class="flex flex-col items-center text-center mt-1 sm:mt-2 pointer-events-auto">
          <div class="bg-red-600/95 border border-red-400 text-white text-[11px] sm:text-xs font-black px-4 py-0.5 rounded-full shadow-[0_0_20px_rgba(239,68,68,0.8)] mb-1 tracking-widest uppercase animate-bounce">
            GAME OVER
          </div>
          <h2 class="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-400 to-red-500 drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]">
            لقد خسرت!
          </h2>
          <p class="text-xs sm:text-sm text-yellow-300 font-bold mt-1 bg-black/75 border border-yellow-500/40 px-4 py-0.5 rounded-full shadow-lg backdrop-blur-md">
            {{ gameOverSubtitle }}
          </p>
        </div>

        <!-- Center 3D Viewport is 100% Open & Unblocked to showcase Jake, Inspector, and the Beach! -->
        <div class="flex-1 w-full pointer-events-none"></div>

        <!-- Bottom Floating Dock: Sleek Horizontal 3D Stats + Action Buttons (Pointer Events Auto) -->
        <div class="w-full max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md border-2 border-amber-400/80 rounded-[28px] shadow-[0_15px_40px_rgba(0,0,0,0.9)] pointer-events-auto mb-1">
          
          <!-- Horizontal Stats Strip -->
          <div class="grid grid-cols-3 gap-2 sm:gap-4 w-full md:w-auto flex-1 text-center border-b md:border-b-0 md:border-l border-white/15 pb-2.5 md:pb-0 md:pl-4">
            
            <!-- 1. المجمّع -->
            <div class="flex flex-col items-center bg-black/50 rounded-2xl p-2 border border-white/10 shadow-inner">
              <span class="text-[11px] sm:text-xs font-bold text-slate-300">المجمّع</span>
              <span class="text-lg sm:text-2xl font-black text-yellow-300 font-mono drop-shadow-[0_2px_6px_rgba(253,224,71,0.6)]">
                {{ score.toLocaleString() }} <span class="text-[10px] text-amber-400">م</span>
              </span>
            </div>

            <!-- 2. العملات -->
            <div class="flex flex-col items-center bg-black/50 rounded-2xl p-2 border border-white/10 shadow-inner">
              <span class="text-[11px] sm:text-xs font-bold text-slate-300">العملات</span>
              <div class="flex items-center gap-1">
                <span class="text-lg sm:text-2xl font-black text-yellow-300 font-mono drop-shadow-[0_2px_6px_rgba(253,224,71,0.6)]">
                  {{ coins.toLocaleString() }}
                </span>
                <span class="text-xs animate-pulse">🪙</span>
              </div>
            </div>

            <!-- 3. المسافة -->
            <div class="flex flex-col items-center bg-black/50 rounded-2xl p-2 border border-white/10 shadow-inner">
              <span class="text-[11px] sm:text-xs font-bold text-slate-300">المسافة</span>
              <span class="text-base sm:text-xl font-black text-cyan-300 font-mono drop-shadow-[0_2px_6px_rgba(6,182,212,0.6)]">
                {{ (score / 1000).toFixed(1) }} كلم
              </span>
            </div>

          </div>

          <!-- 3D Tactile Pop-Out Buttons -->
          <div class="flex items-center gap-2.5 w-full md:w-auto">
            
            <!-- Green Button: العب مرة أخرى (3D Pop-Out) -->
            <button (click)="restartCurrentGame()" 
                    class="flex-1 md:flex-initial px-6 py-3.5 bg-gradient-to-b from-[#22c55e] to-[#15803d] border-t-2 border-l-2 border-r-2 border-[#86efac] border-b-[6px] border-[#14532d] hover:border-b-[8px] hover:-translate-y-1 active:border-b-[2px] active:translate-y-1 rounded-2xl shadow-[0_8px_20px_rgba(34,197,94,0.6)] cursor-pointer text-white font-black text-base sm:text-lg flex items-center justify-center gap-2 transition-all duration-100 select-none">
              <span class="text-xl">🔄</span>
              <span class="whitespace-nowrap">العب مرة أخرى</span>
            </button>

            <!-- Blue Button: القائمة (3D Pop-Out) -->
            <button (click)="backToMenuFromGameOver()" 
                    class="px-4 py-3.5 bg-gradient-to-b from-[#0ea5e9] to-[#0369a1] border-t-2 border-l-2 border-r-2 border-[#7dd3fc] border-b-[6px] border-[#0c4a6e] hover:border-b-[8px] hover:-translate-y-1 active:border-b-[2px] active:translate-y-1 rounded-2xl shadow-[0_6px_16px_rgba(14,165,233,0.5)] cursor-pointer text-white font-black text-sm sm:text-base flex items-center justify-center gap-1.5 transition-all duration-100 select-none">
              <span>🏠</span>
              <span class="hidden sm:inline">الرئيسية</span>
            </button>

            <!-- Yellow Button: المتجر (3D Pop-Out) -->
            <button (click)="openShopFromGameOver()" 
                    class="px-4 py-3.5 bg-gradient-to-b from-[#f59e0b] to-[#b45309] border-t-2 border-l-2 border-r-2 border-[#fef08a] border-b-[6px] border-[#78350f] hover:border-b-[8px] hover:-translate-y-1 active:border-b-[2px] active:translate-y-1 rounded-2xl shadow-[0_6px_16px_rgba(245,158,11,0.5)] cursor-pointer text-slate-950 font-black text-sm sm:text-base flex items-center justify-center gap-1.5 transition-all duration-100 select-none">
              <span>🏪</span>
              <span class="hidden sm:inline">المتجر</span>
            </button>

          </div>

        </div>

        <!-- Footer Bottom Spacer -->
        <div class="mb-1"></div>

      </div>

      <!-- ================= 4. PAUSE MODAL ================= -->
      <div *ngIf="gameState === 'PAUSED'" class="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <div class="relative w-full max-w-xs bg-slate-900 border-2 border-white/20 rounded-[32px] p-6 shadow-2xl flex flex-col items-center text-center gap-3">
          <h3 class="text-2xl font-black text-white mb-2">⏸️ اللعبة متوقفة مؤقتاً</h3>

          <button (click)="resumeGame()" class="w-full py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-slate-950 font-black text-sm rounded-2xl shadow-md cursor-pointer">
            استئناف الجري ▶️
          </button>
          <button (click)="restartCurrentGame()" class="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs rounded-2xl border border-white/10 cursor-pointer">
            إعادة المحاولة 🔄
          </button>
          <button (click)="openShop()" class="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-black text-xs rounded-2xl border border-amber-500/30 cursor-pointer">
            المتجر 🏪
          </button>
          <button (click)="backToMenuFromGameOver()" class="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs rounded-2xl border border-white/10 cursor-pointer">
            القائمة الرئيسية 🏠
          </button>
        </div>
      </div>

      <!-- ================= 5. SHOP MODAL (3 TABS WITH 3D GLOWING STARS) ================= -->
      <div *ngIf="showShopModal" class="absolute inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in zoom-in duration-200">
        <div class="relative w-full max-w-xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border-2 border-amber-500/60 rounded-[36px] p-5 sm:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.95)] flex flex-col max-h-[92vh] overflow-hidden">
          
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-2xl shadow-lg border border-amber-300">
                🏪
              </div>
              <div>
                <h3 class="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-500">
                  متجر وترقيات Metro Dash ⚡
                </h3>
                <p class="text-xs text-slate-400 font-bold">طور قدراتك للوصول لأعلى سكور وافتح شخصيات وألواح نادرة</p>
              </div>
            </div>

            <!-- Wallet Pill -->
            <div class="flex items-center gap-2 bg-black/80 px-4 py-2 rounded-2xl border border-amber-500/50 shadow-inner">
              <span class="text-xl animate-bounce">🪙</span>
              <span class="text-base font-black text-amber-300">{{ totalCoins.toLocaleString() }}</span>
            </div>
          </div>

          <!-- 3 Tabs Navigation -->
          <div class="grid grid-cols-3 gap-2 bg-black/50 p-1.5 rounded-2xl mb-4 border border-white/10 shadow-inner">
            <button (click)="shopTab = 'powers'" class="py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5" [ngClass]="shopTab === 'powers' ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 shadow-lg scale-105' : 'text-slate-400 hover:text-white'">
              <span class="text-sm">⚡</span>
              <span>القدرات</span>
            </button>
            <button (click)="shopTab = 'characters'" class="py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5" [ngClass]="shopTab === 'characters' ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 shadow-lg scale-105' : 'text-slate-400 hover:text-white'">
              <span class="text-sm">👕</span>
              <span>الشخصيات</span>
            </button>
            <button (click)="shopTab = 'boards'" class="py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5" [ngClass]="shopTab === 'boards' ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 shadow-lg scale-105' : 'text-slate-400 hover:text-white'">
              <span class="text-sm">🛹</span>
              <span>الألواح</span>
            </button>
          </div>

          <!-- Tab 1: Powers Upgrades (Enhanced 3D Glowing Stars & Stat Boosts) -->
          <div *ngIf="shopTab === 'powers'" class="flex-1 overflow-y-auto pr-1 flex flex-col gap-3">
            <div *ngFor="let pKey of powerupKeys" class="bg-slate-900/90 hover:bg-slate-900 border-2 border-white/10 hover:border-amber-500/40 rounded-3xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl transition-all">
              
              <!-- Left: 3D Icon + Info -->
              <div class="flex items-center gap-3.5 flex-1">
                
                <!-- Distinct High-Fidelity 3D Rendered Icon Container -->
                <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl flex items-center justify-center p-1 shadow-2xl border-2 relative overflow-hidden flex-shrink-0"
                     [ngClass]="{
                       'bg-gradient-to-b from-slate-900 via-red-950/80 to-slate-950 border-rose-500/70 shadow-[0_0_25px_rgba(244,63,94,0.5)]': pKey === 'magnet',
                       'bg-gradient-to-b from-slate-900 via-amber-950/80 to-slate-950 border-yellow-400/70 shadow-[0_0_25px_rgba(245,158,11,0.55)]': pKey === 'multiplier',
                       'bg-gradient-to-b from-slate-900 via-cyan-950/80 to-slate-950 border-cyan-400/70 shadow-[0_0_25px_rgba(6,182,212,0.55)]': pKey === 'hoverboard',
                       'bg-gradient-to-b from-slate-900 via-emerald-950/80 to-slate-950 border-emerald-400/70 shadow-[0_0_25px_rgba(16,185,129,0.5)]': pKey === 'sneakers',
                       'bg-gradient-to-b from-slate-900 via-orange-950/80 to-slate-950 border-orange-400/70 shadow-[0_0_25px_rgba(249,115,22,0.55)]': pKey === 'jetpack'
                     }">
                  
                  <!-- 1. Ultra-Realistic 3D Horseshoe Magnet -->
                  <svg *ngIf="pKey === 'magnet'" class="w-full h-full drop-shadow-[0_4px_16px_rgba(239,68,68,0.9)]" viewBox="0 0 100 100" fill="none">
                    <defs>
                      <radialGradient id="magBody3D" cx="30%" cy="30%" r="75%">
                        <stop offset="0%" stop-color="#ff6b6b"/>
                        <stop offset="45%" stop-color="#dc2626"/>
                        <stop offset="85%" stop-color="#881337"/>
                        <stop offset="100%" stop-color="#450a0a"/>
                      </radialGradient>
                      <linearGradient id="chrome3D" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stop-color="#ffffff"/>
                        <stop offset="35%" stop-color="#e2e8f0"/>
                        <stop offset="65%" stop-color="#64748b"/>
                        <stop offset="100%" stop-color="#cbd5e1"/>
                      </linearGradient>
                      <radialGradient id="goldCoin3D" cx="35%" cy="35%" r="65%">
                        <stop offset="0%" stop-color="#fef08a"/>
                        <stop offset="45%" stop-color="#facc15"/>
                        <stop offset="80%" stop-color="#ca8a04"/>
                        <stop offset="100%" stop-color="#713f12"/>
                      </radialGradient>
                      <linearGradient id="goldRingGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stop-color="#fef08a"/>
                        <stop offset="50%" stop-color="#eab308"/>
                        <stop offset="100%" stop-color="#854d0e"/>
                      </linearGradient>
                      <filter id="magSparkGlow" x="-30%" y="-30%" width="160%" height="160%">
                        <feGaussianBlur stdDeviation="2.5" result="blur"/>
                        <feMerge>
                          <feMergeNode in="blur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>

                    <!-- Drop Shadow -->
                    <ellipse cx="50" cy="88" rx="34" ry="7" fill="#000000" opacity="0.6"/>

                    <!-- 3D Red Horseshoe Body -->
                    <path d="M22 28 V 56 C 22 71.5 34.5 83 50 83 C 65.5 83 78 71.5 78 56 V 28 H 60 V 56 C 60 61.5 55.5 66 50 66 C 44.5 66 40 61.5 40 56 V 28 H 22 Z" fill="url(#magBody3D)" stroke="#991b1b" stroke-width="1.5"/>

                    <!-- Specular 3D Highlight Shine -->
                    <path d="M26 30 V 56 C 26 68 36 76.5 50 76.5" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" opacity="0.5"/>

                    <!-- Left Chrome Pole Tip with Gold Collar & N label -->
                    <rect x="20.5" y="14" width="19" height="16" rx="3" fill="url(#chrome3D)" stroke="#475569" stroke-width="1"/>
                    <rect x="20.5" y="27" width="19" height="3" fill="url(#goldRingGrad)"/>
                    <text x="30" y="25" fill="#0f172a" font-size="10" font-weight="900" text-anchor="middle" font-family="sans-serif">N</text>

                    <!-- Right Chrome Pole Tip with Gold Collar & S label -->
                    <rect x="58.5" y="14" width="19" height="16" rx="3" fill="url(#chrome3D)" stroke="#475569" stroke-width="1"/>
                    <rect x="58.5" y="27" width="19" height="3" fill="url(#goldRingGrad)"/>
                    <text x="68" y="25" fill="#0f172a" font-size="10" font-weight="900" text-anchor="middle" font-family="sans-serif">S</text>

                    <!-- Electric Blue Spark Arc -->
                    <path d="M30 18 Q 50 6 68 18" stroke="#38bdf8" stroke-width="3.5" stroke-linecap="round" fill="none" filter="url(#magSparkGlow)"/>
                    <path d="M30 18 Q 50 6 68 18" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" fill="none"/>
                    
                    <!-- Pulsing Blue Lightning Sparks -->
                    <path d="M35 17 L44 11 L41 19 L53 13 L51 21 L63 17" stroke="#00f0ff" stroke-width="1.8" stroke-linecap="round" fill="none" filter="url(#magSparkGlow)"/>

                    <!-- Central Floating 3D Gold Coin with Star -->
                    <ellipse cx="50" cy="40" rx="14" ry="14" fill="url(#goldCoin3D)" stroke="#facc15" stroke-width="1.5"/>
                    <polygon points="50,30 53,37 60,37 55,42 57,49 50,45 43,49 45,42 40,37 47,37" fill="#fef08a" stroke="#ca8a04" stroke-width="0.8"/>

                    <!-- Magnetic Attraction Waves -->
                    <path d="M12 24 C 8 36 8 50 15 62" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round" opacity="0.75" stroke-dasharray="3 3"/>
                    <path d="M88 24 C 92 36 92 50 85 62" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round" opacity="0.75" stroke-dasharray="3 3"/>
                  </svg>

                  <!-- 2. Ultra-Realistic 3D Cyber Hoverboard -->
                  <svg *ngIf="pKey === 'hoverboard'" class="w-full h-full drop-shadow-[0_4px_16px_rgba(6,182,212,0.9)]" viewBox="0 0 100 100" fill="none">
                    <defs>
                      <linearGradient id="hbHullGrad" x1="15" y1="20" x2="85" y2="70" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stop-color="#0284c7"/>
                        <stop offset="35%" stop-color="#0369a1"/>
                        <stop offset="70%" stop-color="#082f49"/>
                        <stop offset="100%" stop-color="#0f172a"/>
                      </linearGradient>
                      <linearGradient id="hbCarbonDeck" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stop-color="#1e293b"/>
                        <stop offset="50%" stop-color="#0f172a"/>
                        <stop offset="100%" stop-color="#020617"/>
                      </linearGradient>
                      <linearGradient id="hbGoldStripe" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stop-color="#fef08a"/>
                        <stop offset="50%" stop-color="#facc15"/>
                        <stop offset="100%" stop-color="#ea580c"/>
                      </linearGradient>
                      <linearGradient id="hbThrusterFire" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#ffffff"/>
                        <stop offset="25%" stop-color="#38bdf8"/>
                        <stop offset="70%" stop-color="#0284c7"/>
                        <stop offset="100%" stop-color="#0369a1" stop-opacity="0"/>
                      </linearGradient>
                      <filter id="hbNeonGlow" x="-30%" y="-30%" width="160%" height="160%">
                        <feGaussianBlur stdDeviation="2.5" result="blur"/>
                        <feMerge>
                          <feMergeNode in="blur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>

                    <!-- Ground Shadow & Anti-Gravity Energy Disc -->
                    <ellipse cx="50" cy="86" rx="38" ry="9" fill="#000000" opacity="0.5"/>
                    <ellipse cx="50" cy="83" rx="32" ry="7" fill="none" stroke="#00f0ff" stroke-width="2.5" stroke-dasharray="4 3" filter="url(#hbNeonGlow)"/>

                    <!-- Left Jet Thruster & Flame -->
                    <rect x="25" y="50" width="10" height="15" rx="3" fill="#1e293b" stroke="#facc15" stroke-width="1.2"/>
                    <polygon points="26,65 34,65 30,86" fill="url(#hbThrusterFire)" filter="url(#hbNeonGlow)"/>

                    <!-- Right Jet Thruster & Flame -->
                    <rect x="65" y="50" width="10" height="15" rx="3" fill="#1e293b" stroke="#facc15" stroke-width="1.2"/>
                    <polygon points="66,65 74,65 70,86" fill="url(#hbThrusterFire)" filter="url(#hbNeonGlow)"/>

                    <!-- 3D Aerodynamic Hull -->
                    <path d="M12 43 C 8 35 24 27 50 27 C 76 27 92 35 88 43 L 84 52 C 80 58 68 62 50 62 C 32 62 20 58 16 52 Z" fill="#034e7b" stroke="#00f0ff" stroke-width="1"/>

                    <!-- Neon Glowing Outer Hull -->
                    <path d="M12 41 C 8 33 24 25 50 25 C 76 25 92 33 88 41 C 84 48 72 52 50 52 C 28 52 16 48 12 41 Z" fill="url(#hbHullGrad)" stroke="#00f0ff" stroke-width="2.5" filter="url(#hbNeonGlow)"/>

                    <!-- Top Carbon Fiber Grip Pad -->
                    <path d="M18 39 C 16 33 28 28 50 28 C 72 28 84 33 82 39 C 80 43 70 47 50 47 C 30 47 20 43 18 39 Z" fill="url(#hbCarbonDeck)" stroke="#0284c7" stroke-width="1"/>

                    <!-- Carbon Hex Texture Lines -->
                    <line x1="32" y1="32" x2="38" y2="44" stroke="#334155" stroke-width="1"/>
                    <line x1="42" y1="30" x2="48" y2="45" stroke="#334155" stroke-width="1"/>
                    <line x1="58" y1="30" x2="52" y2="45" stroke="#334155" stroke-width="1"/>
                    <line x1="68" y1="32" x2="62" y2="44" stroke="#334155" stroke-width="1"/>

                    <!-- Central Racing Livery Stripe -->
                    <path d="M47 28 H 53 L 52 47 H 48 Z" fill="url(#hbGoldStripe)"/>

                    <!-- Foot Placement Rings -->
                    <ellipse cx="30" cy="37" rx="6" ry="3.2" fill="#06b6d4" opacity="0.85"/>
                    <ellipse cx="70" cy="37" rx="6" ry="3.2" fill="#06b6d4" opacity="0.85"/>

                    <!-- Specular Light Reflection -->
                    <path d="M22 35 C 32 31 68 31 78 35" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
                  </svg>

                  <!-- 3. Ultra-Realistic 3D 2X Multiplier Star -->
                  <svg *ngIf="pKey === 'multiplier'" class="w-full h-full drop-shadow-[0_4px_16px_rgba(245,158,11,0.9)]" viewBox="0 0 100 100" fill="none">
                    <defs>
                      <radialGradient id="starGold3D" cx="40%" cy="40%" r="65%">
                        <stop offset="0%" stop-color="#fffbeb"/>
                        <stop offset="25%" stop-color="#fef08a"/>
                        <stop offset="55%" stop-color="#facc15"/>
                        <stop offset="85%" stop-color="#d97706"/>
                        <stop offset="100%" stop-color="#78350f"/>
                      </radialGradient>
                    </defs>
                    <polygon points="50,8 62,34 92,36 68,56 76,86 50,68 24,86 32,56 8,36 38,34" fill="url(#starGold3D)" stroke="#fef08a" stroke-width="2"/>
                    <circle cx="50" cy="48" r="16" fill="#082f49" stroke="#38bdf8" stroke-width="2.5"/>
                    <text x="50" y="55" fill="#facc15" font-size="18" font-weight="900" text-anchor="middle" font-family="sans-serif" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.8))">2X</text>
                  </svg>

                  <!-- 4. Ultra-Realistic 3D Winged Spring Sneakers -->
                  <svg *ngIf="pKey === 'sneakers'" class="w-full h-full drop-shadow-[0_4px_16px_rgba(16,185,129,0.9)]" viewBox="0 0 100 100" fill="none">
                    <defs>
                      <linearGradient id="snk3DGrad" x1="15" y1="30" x2="85" y2="70" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stop-color="#34d399"/>
                        <stop offset="50%" stop-color="#10b981"/>
                        <stop offset="100%" stop-color="#065f46"/>
                      </linearGradient>
                    </defs>
                    <!-- Sneaker Upper -->
                    <path d="M18 55 C 18 55 22 34 40 30 C 50 28 56 36 60 42 L 76 44 C 82 44 86 50 84 56 L 80 62 C 76 68 68 70 60 70 H 26 C 21 70 18 66 18 61 V 55 Z" fill="url(#snk3DGrad)" stroke="#6ee7b7" stroke-width="2"/>
                    <!-- White Sole -->
                    <path d="M18 61 H 80 C 83 61 85 64 83 66 L 80 69 H 22 C 19 69 18 67 18 64 V 61 Z" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/>
                    <!-- Heavy-Duty Suspension Spring -->
                    <path d="M34 70 C 30 75 38 78 42 81 C 46 84 38 87 34 90" stroke="#facc15" stroke-width="4" stroke-linecap="round" fill="none"/>
                    <!-- Hermes Wing -->
                    <path d="M30 32 C 20 25 18 15 28 12 C 38 10 44 18 40 30 Z" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" opacity="0.95"/>
                  </svg>

                  <!-- 5. Ultra-Realistic 3D Jetpack -->
                  <svg *ngIf="pKey === 'jetpack'" class="w-full h-full drop-shadow-[0_4px_16px_rgba(249,115,22,0.9)]" viewBox="0 0 100 100" fill="none">
                    <defs>
                      <linearGradient id="jet3DGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stop-color="#38bdf8"/>
                        <stop offset="50%" stop-color="#0284c7"/>
                        <stop offset="100%" stop-color="#0c4a6e"/>
                      </linearGradient>
                      <linearGradient id="jet3DFlame" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#ffffff"/>
                        <stop offset="25%" stop-color="#facc15"/>
                        <stop offset="70%" stop-color="#f97316"/>
                        <stop offset="100%" stop-color="#dc2626" stop-opacity="0"/>
                      </linearGradient>
                    </defs>
                    <!-- Left & Right Cylinders -->
                    <rect x="24" y="20" width="18" height="42" rx="9" fill="url(#jet3DGrad)" stroke="#facc15" stroke-width="2"/>
                    <rect x="58" y="20" width="18" height="42" rx="9" fill="url(#jet3DGrad)" stroke="#facc15" stroke-width="2"/>
                    <!-- Center Module -->
                    <rect x="36" y="32" width="28" height="20" rx="5" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/>
                    <!-- Fiery Exhaust Cones -->
                    <polygon points="26,62 40,62 33,88" fill="url(#jet3DFlame)"/>
                    <polygon points="60,62 74,62 67,88" fill="url(#jet3DFlame)"/>
                  </svg>

                </div>

                <!-- Text & Stars -->
                <div class="flex flex-col gap-1 flex-1">
                  
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-black text-base text-white tracking-wide">{{ powerupConfigs[pKey].name }}</span>
                    
                    <!-- 5 Distinct 3D Glowing Stars -->
                    <div class="flex items-center gap-1 bg-black/60 px-2.5 py-1 rounded-full border border-amber-500/30">
                      <span *ngFor="let s of [1,2,3,4,5]" 
                            class="text-sm transition-all duration-300"
                            [ngClass]="s <= (userUpgrades[pKey] || 1) ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.9)] scale-110' : 'text-slate-600 opacity-40'">
                        ★
                      </span>
                      <span class="text-[10px] font-black text-amber-300 mr-1">({{ userUpgrades[pKey] || 1 }}/5)</span>
                    </div>
                  </div>

                  <p class="text-xs text-slate-300 font-medium">{{ powerupConfigs[pKey].desc }}</p>

                  <!-- Duration Stat Comparison Badges -->
                  <div class="flex items-center gap-2 mt-1">
                    <div class="bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-[10px] font-black px-2.5 py-0.5 rounded-lg">
                      ⏱️ المدة: {{ powerupConfigs[pKey].durations[(userUpgrades[pKey] || 1) - 1] }}ث
                    </div>

                    <div *ngIf="(userUpgrades[pKey] || 1) < 5" class="bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px] font-black px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                      <span>➔ المستوى التالي: {{ powerupConfigs[pKey].durations[userUpgrades[pKey] || 1] }}ث</span>
                      <span class="text-emerald-400 font-extrabold">(+{{ powerupConfigs[pKey].durations[userUpgrades[pKey] || 1] - powerupConfigs[pKey].durations[(userUpgrades[pKey] || 1) - 1] }}ث)</span>
                    </div>

                    <div *ngIf="(userUpgrades[pKey] || 1) >= 5" class="bg-amber-500/20 border border-amber-400/50 text-amber-300 text-[10px] font-black px-2.5 py-0.5 rounded-lg">
                      👑 أقصى ترقية (Max Level)
                    </div>
                  </div>

                </div>
              </div>

              <!-- Right: 3D Tactile Upgrade Button -->
              <div class="flex items-center sm:self-center">
                <button (click)="buyPowerUpgrade(pKey)" 
                        [disabled]="(userUpgrades[pKey] || 1) >= 5 || totalCoins < powerupConfigs[pKey].costs[userUpgrades[pKey] || 1]"
                        class="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 disabled:opacity-40 disabled:pointer-events-none text-slate-950 font-black text-xs rounded-2xl shadow-[0_4px_15px_rgba(245,158,11,0.4)] transition-all transform active:scale-95 cursor-pointer flex items-center justify-center gap-2 border border-amber-300">
                  <span *ngIf="(userUpgrades[pKey] || 1) < 5" class="text-base">⚡</span>
                  <span *ngIf="(userUpgrades[pKey] || 1) >= 5" class="text-base">👑</span>
                  <div class="flex flex-col text-right">
                    <span>{{ (userUpgrades[pKey] || 1) >= 5 ? 'مكتمل بالكامل' : 'ترقية المستوى' }}</span>
                    <span *ngIf="(userUpgrades[pKey] || 1) < 5" class="text-[11px] text-slate-950 font-extrabold flex items-center gap-1">
                      🪙 {{ powerupConfigs[pKey].costs[userUpgrades[pKey] || 1].toLocaleString() }}
                    </span>
                  </div>
                </button>
              </div>

            </div>
          </div>

          <!-- Tab 2: Character Skins with Rich 3D Visual Previews -->
          <div *ngIf="shopTab === 'characters'" class="flex-1 overflow-y-auto pr-1 grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div *ngFor="let skin of characterSkins" 
                 class="bg-slate-900/95 border-2 rounded-3xl p-4 flex flex-col justify-between shadow-2xl transition-all relative overflow-hidden group"
                 [ngClass]="selectedSkin === skin.id ? 'border-emerald-500 bg-emerald-950/30 ring-2 ring-emerald-500/20' : 'border-white/10 hover:border-amber-400/40'">
              
              <div class="flex items-start gap-3.5">
                <!-- 3D Character Avatar Preview Box -->
                <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br {{ skin.iconBg }} border border-white/20 flex flex-col items-center justify-center relative shadow-inner shrink-0 overflow-hidden">
                  <div class="absolute inset-0 bg-radial from-white/20 to-transparent pointer-events-none"></div>
                  
                  <!-- Character Visual Icon / Avatar Art -->
                  <div class="text-3xl sm:text-4xl drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)] transform group-hover:scale-110 transition-transform">
                    {{ skin.badgeEmoji }}
                  </div>
                  
                  <!-- Floating Mini Character Color Tag -->
                  <div class="absolute bottom-1 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded-full border border-white/20 text-[9px] font-black text-white">
                    {{ skin.id === 'jake' ? 'ORIGINAL' : (skin.id === 'cyborg' ? 'MYTHIC' : 'ELITE') }}
                  </div>
                </div>

                <!-- Character Details & Perks -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between gap-1 mb-1">
                    <span class="font-black text-base text-white truncate">{{ skin.name }}</span>
                    <span *ngIf="selectedSkin === skin.id" class="bg-emerald-500 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full shadow shrink-0">مفعل</span>
                    <span *ngIf="skin.unlocked && selectedSkin !== skin.id" class="bg-slate-800 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">مفتوح</span>
                  </div>

                  <p class="text-xs text-slate-300 leading-relaxed mb-2">{{ skin.desc }}</p>

                  <!-- Special Perk Badge -->
                  <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] font-bold text-amber-300">
                    <span>{{ skin.perk }}</span>
                  </div>
                </div>
              </div>

              <!-- Purchase / Select Action Button -->
              <button (click)="selectOrBuySkin(skin)" 
                      [disabled]="!skin.unlocked && totalCoins < skin.price"
                      class="mt-3.5 w-full py-2.5 text-xs font-black rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                      [ngClass]="selectedSkin === skin.id ? 'bg-emerald-500 text-slate-950 cursor-default' : (skin.unlocked ? 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-400/40' : 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 hover:brightness-110')">
                <span>{{ selectedSkin === skin.id ? 'مفعل في اللعبة ✔️' : (skin.unlocked ? 'ارتداء الشخصية 👕' : 'فتح الشخصية 🛒') }}</span>
                <span *ngIf="!skin.unlocked" class="text-[11px] font-black bg-slate-950/20 px-2 py-0.5 rounded-full">🪙 {{ skin.price.toLocaleString() }}</span>
              </button>
            </div>
          </div>

          <!-- Tab 3: Hoverboards with Rich 3D Visual Previews -->
          <div *ngIf="shopTab === 'boards'" class="flex-1 overflow-y-auto pr-1 grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div *ngFor="let board of hoverboardsList" 
                 class="bg-slate-900/95 border-2 rounded-3xl p-4 flex flex-col justify-between shadow-2xl transition-all relative overflow-hidden group"
                 [ngClass]="selectedBoard === board.id ? 'border-cyan-400 bg-cyan-950/30 ring-2 ring-cyan-400/20' : 'border-white/10 hover:border-cyan-500/40'">
              
              <div class="flex items-start gap-3.5">
                <!-- 3D Hoverboard Visual Preview Box -->
                <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br {{ board.iconBg }} border border-white/20 flex flex-col items-center justify-center relative shadow-inner shrink-0 overflow-hidden">
                  <div class="absolute inset-0 bg-radial from-white/20 to-transparent pointer-events-none"></div>
                  
                  <div class="text-3xl sm:text-4xl drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)] transform group-hover:scale-110 group-hover:rotate-12 transition-transform">
                    🛹
                  </div>

                  <div class="absolute bottom-1 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded-full border border-white/20 text-[9px] font-black text-cyan-300">
                    {{ board.id === 'classic' ? 'STANDARD' : (board.id === 'quantum' ? 'ULTRA' : 'SPECIAL') }}
                  </div>
                </div>

                <!-- Board Details & Perks -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between gap-1 mb-1">
                    <span class="font-black text-base text-white truncate">{{ board.name }}</span>
                    <span *ngIf="selectedBoard === board.id" class="bg-cyan-400 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full shadow shrink-0">مجهز</span>
                    <span *ngIf="board.unlocked && selectedBoard !== board.id" class="bg-slate-800 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">مفتوح</span>
                  </div>

                  <p class="text-xs text-slate-300 leading-relaxed mb-2">{{ board.desc }}</p>

                  <!-- Special Perk Badge -->
                  <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-[11px] font-bold text-cyan-300">
                    <span>{{ board.perk }}</span>
                  </div>
                </div>
              </div>

              <!-- Purchase / Select Action Button -->
              <button (click)="selectOrBuyBoard(board)" 
                      [disabled]="!board.unlocked && totalCoins < board.price"
                      class="mt-3.5 w-full py-2.5 text-xs font-black rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                      [ngClass]="selectedBoard === board.id ? 'bg-cyan-400 text-slate-950 cursor-default' : (board.unlocked ? 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-400/40' : 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 hover:brightness-110')">
                <span>{{ selectedBoard === board.id ? 'مجهز في اللعبة ✔️' : (board.unlocked ? 'تجهيز اللوح 🛹' : 'شراء اللوح 🛒') }}</span>
                <span *ngIf="!board.unlocked" class="text-[11px] font-black bg-slate-950/20 px-2 py-0.5 rounded-full">🪙 {{ board.price.toLocaleString() }}</span>
              </button>
            </div>
          </div>

          <!-- Close Shop Button -->
          <button (click)="closeShop()" class="w-full mt-4 py-3 bg-slate-800/90 hover:bg-slate-700 text-white font-black text-xs rounded-2xl transition-all cursor-pointer border border-white/10">
            إغلاق المتجر
          </button>
        </div>
      </div>

      <!-- ================= 6. LUCKY SPIN WHEEL MODAL ================= -->
      <div *ngIf="showWheelModal" class="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <div class="relative w-full max-w-sm bg-slate-900 border-2 border-amber-500/50 rounded-[32px] p-6 shadow-2xl flex flex-col items-center text-center">
          <h3 class="text-2xl font-black text-amber-400 mb-1">🎡 عجلة الحظ اليومية</h3>
          <p class="text-xs text-slate-400 mb-4">أدر العجلة واربح عملات ومفاتيح وصناديق مفاجآت!</p>

          <!-- Wheel Canvas -->
          <div class="relative w-72 h-72 flex items-center justify-center mb-4">
            <div class="absolute -top-3 z-20 text-3xl font-black text-red-500 drop-shadow-lg">▼</div>
            <canvas #wheelCanvas width="280" height="280" class="rounded-full shadow-2xl border-4 border-amber-400"></canvas>
          </div>

          <!-- Spin Button -->
          <button (click)="spinWheel()" [disabled]="isSpinningWheel" class="w-full py-3.5 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 disabled:opacity-50 text-slate-950 font-black text-base rounded-2xl shadow-xl transition-all cursor-pointer mb-2">
            <span>{{ isSpinningWheel ? 'جاري الدوران... ⏳' : '🎲 تدوير العجلة مجاناً!' }}</span>
          </button>

          <button (click)="showWheelModal = false" [disabled]="isSpinningWheel" class="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer py-1">
            إغلاق
          </button>
        </div>
      </div>

      <!-- ================= 7. LEADERBOARD MODAL ================= -->
      <div *ngIf="showLeaderboardModal" class="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <div class="relative w-full max-w-sm bg-slate-900 border-2 border-purple-500/50 rounded-[32px] p-6 shadow-2xl flex flex-col items-center">
          <h3 class="text-2xl font-black text-purple-400 mb-1">🏆 لوحة الأبطال القياسية</h3>
          <p class="text-xs text-slate-400 mb-4">أفضل السكورات المسجلة في شاطئ المترو الاستوائي 🏖️</p>

          <div class="w-full flex flex-col gap-2 mb-4">
            <div *ngFor="let rec of leaderboardList; let idx = index" class="bg-slate-950/80 border border-white/10 rounded-2xl p-3 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span class="text-2xl">{{ ['🥇','🥈','🥉','4️⃣','5️⃣'][idx] || '🎖️' }}</span>
                <div class="text-right">
                  <div class="font-black text-amber-300 text-sm">{{ rec.score.toLocaleString() }} م</div>
                  <div class="text-[10px] text-slate-400">{{ rec.date }}</div>
                </div>
              </div>
              <div class="font-black text-cyan-300 text-xs">🪙 {{ rec.coins.toLocaleString() }}</div>
            </div>

            <div *ngIf="leaderboardList.length === 0" class="text-xs text-slate-400 py-6 text-center">
              لم يتم تسجيل أرقام بعد. ابدأ اللعب وسجل أول رقم قياسي!
            </div>
          </div>

          <button (click)="showLeaderboardModal = false" class="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs rounded-2xl transition-all cursor-pointer">
            إغلاق
          </button>
        </div>
      </div>

      <!-- ================= 8. P2P ROOM MODAL ================= -->
      <div *ngIf="showRoomModal" class="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <div class="relative w-full max-w-sm bg-slate-900 border-2 border-amber-500/50 rounded-[32px] p-6 shadow-2xl flex flex-col items-center text-center">
          <h3 class="text-2xl font-black text-amber-400 mb-1">🎯 غرفة التحدي الخاصة</h3>
          <p class="text-xs text-slate-400 mb-4">العب أونلاين ضد صديقك (هارب ضد شرطي)</p>

          <div *ngIf="createdRoomCode" class="w-full bg-black/60 border border-amber-400/40 p-4 rounded-2xl mb-4">
            <span class="text-xs text-slate-300">كود الغرفة الخاص بك:</span>
            <div class="text-2xl font-black text-amber-400 tracking-widest mt-1">{{ createdRoomCode }}</div>
            <p class="text-[10px] text-slate-400 mt-1">شارك هذا الكود مع صديقك ليدخل معك في الجولة</p>
          </div>

          <button *ngIf="!createdRoomCode" (click)="createP2PRoom()" class="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-sm rounded-2xl shadow-xl transition-all cursor-pointer mb-3">
            ✨ إنشاء كود غرفة جديد
          </button>

          <div class="w-full flex items-center gap-2 mb-4">
            <input type="text" [(ngModel)]="joinRoomCodeInput" placeholder="أدخل كود الغرفة..." class="flex-1 bg-slate-950 border border-white/20 rounded-2xl px-3 py-2.5 text-xs text-center font-black uppercase text-amber-300 focus:outline-none focus:border-amber-400">
            <button (click)="joinP2PRoom()" class="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs rounded-2xl shadow-md cursor-pointer">
              انضمام
            </button>
          </div>

          <button (click)="showRoomModal = false" class="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer">
            إغلاق
          </button>
        </div>
      </div>

    </div>
  `
})
export class SubwaySurfers3DComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvasContainer') canvasContainerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('wheelCanvas') wheelCanvasRef!: ElementRef<HTMLCanvasElement>;

  private router = inject(Router);
  Math = Math;
  ArrowRight = ArrowRight;

  // Game States
  gameState: 'MENU' | 'INTRO_IDLE' | 'PLAYING' | 'PAUSED' | 'SAVEME' | 'GAMEOVER' = 'MENU';
  activeMode: 'single' | 'local_vs' | 'p2p' | 'pro' = 'single';

  score = 0;
  coins = 0;
  totalCoins = 0;
  totalKeys = 0;
  scoreMultiplier = 1;
  missionTier = 1;
  streakCombo = 0;
  comboTimer = 0;
  chaseDistance = 40.0;
  invulnerabilityTimer = 0;
  gameOverSubtitle = 'تعثرت بالحاجز وأمسك بك الشرطي!';

  // Quick Revive / Save Me State
  saveMeTitle = '🚨 كدت أن تُمسك!';
  saveMeSubtitle = 'استخدم المفتاح لمسح العوائق ومواصلة نفس السكور فوراً!';
  saveMeTimerPercent = 100;
  private saveMeInterval: any = null;

  // Missions System
  showMissionsBanner = false;
  activeMissions: MissionItem[] = [];
  missionPool: MissionItem[] = [
    { id: 'coins_50', text: 'اجمع 50 عملة ذهبية', target: 50, type: 'coins', rewardKeys: 1, current: 0, completed: false },
    { id: 'distance_300', text: 'اقطع مسافة 300 متر', target: 300, type: 'distance', rewardKeys: 1, current: 0, completed: false },
    { id: 'jumps_8', text: 'اقفز 8 مرات', target: 8, type: 'jumps', rewardKeys: 1, current: 0, completed: false },
    { id: 'slides_6', text: 'تدحرج وانزلق 6 مرات', target: 6, type: 'slides', rewardKeys: 1, current: 0, completed: false },
    { id: 'hoverboard_1', text: 'استخدم لوح التزلج', target: 1, type: 'hoverboard', rewardKeys: 1, current: 0, completed: false },
    { id: 'powerup_2', text: 'التقط قدرتين خاصتين', target: 2, type: 'powerup', rewardKeys: 1, current: 0, completed: false },
    { id: 'coins_120', text: 'اجمع 120 عملة ذهبية', target: 120, type: 'coins', rewardKeys: 2, current: 0, completed: false },
    { id: 'distance_600', text: 'اقطع مسافة 600 متر', target: 600, type: 'distance', rewardKeys: 2, current: 0, completed: false },
    { id: 'lane_changes_12', text: 'غيّر مسارك 12 مرة', target: 12, type: 'lane_changes', rewardKeys: 1, current: 0, completed: false }
  ];

  // Inspector Player 2 Cooldowns (Local VS mode)
  copBoostCd = 0;
  copTrapCd = 0;
  copDogCd = 0;

  // Touch Swipe Variables
  private touchStartX = 0;
  private touchStartY = 0;

  // UI Modals
  showShopModal = false;
  showWheelModal = false;
  showLeaderboardModal = false;
  showRoomModal = false;
  shopTab: 'powers' | 'characters' | 'boards' = 'powers';
  floatingBannerText = '';
  bannerTimeout: any = null;

  // Sound Engine
  isMuted = false;
  private audioCtx: AudioContext | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicInterval: any = null;

  // Lucky Spin Wheel
  isSpinningWheel = false;
  wheelAngle = 0;
  wheelPrizes = [
    { label: '🪙 150', type: 'coins', val: 150, color: '#f59e0b' },
    { label: '🔑 1', type: 'keys', val: 1, color: '#38bdf8' },
    { label: '🪙 300', type: 'coins', val: 300, color: '#10b981' },
    { label: '🎁 صندوق', type: 'box', val: 1, color: '#a855f7' },
    { label: '🪙 600', type: 'coins', val: 600, color: '#ef4444' },
    { label: '🔑 2', type: 'keys', val: 2, color: '#06b6d4' },
    { label: '🪙 1,000', type: 'coins', val: 1000, color: '#eab308' },
    { label: '⭐ ترقية', type: 'upgrade', val: 1, color: '#ec4899' }
  ];

  // Upgrades & Shop Config
  powerupKeys = ['magnet', 'multiplier', 'hoverboard', 'sneakers', 'jetpack'];
  powerupConfigs: Record<string, PowerupConfig> = {
    magnet: { name: 'المغناطيس الخارق', icon: '🧲', desc: 'جذب العملات تلقائياً من جميع المسارات الشاطئية', durations: [10, 15, 20, 26, 35], costs: [0, 1500, 5000, 15000, 35000] },
    multiplier: { name: 'مضاعف النقاط 2X', icon: '⭐', desc: 'مضاعفة نقاط السكور والعملات المجمعة', durations: [12, 18, 24, 30, 40], costs: [0, 2000, 6000, 18000, 40000] },
    hoverboard: { name: 'لوح التزلج النفاث', icon: '🛹', desc: 'حماية كاملة من الاصطدام الأول وتحويم سريع', durations: [15, 22, 30, 40, 55], costs: [0, 2500, 7500, 20000, 45000] },
    sneakers: { name: 'حذاء القفز العالي', icon: '👟', desc: 'قفزات هوائية مضاعفة للوصول لأسطح القطارات', durations: [10, 15, 20, 26, 35], costs: [0, 1500, 5000, 15000, 35000] },
    jetpack: { name: 'الصاروخ النفاث الشاطئي (Beach Jetpack) 🚀🌊', icon: '🚀', desc: 'صاروخ نفاث فائق السرعة! تحليق أسطوري في سماء الشاطئ فوق كل العوائق مع مسار عملات ذهبية ضخم', durations: [8, 12, 16, 22, 30], costs: [0, 3000, 9000, 25000, 55000] }
  };

  userUpgrades: Record<string, number> = { magnet: 1, multiplier: 1, hoverboard: 1, sneakers: 1, jetpack: 1 };
  powerups: Record<string, { active: boolean; timer: number }> = {
    magnet: { active: false, timer: 0 },
    multiplier: { active: false, timer: 0 },
    hoverboard: { active: false, timer: 0 },
    sneakers: { active: false, timer: 0 },
    jetpack: { active: false, timer: 0 }
  };

  characterSkins: CharacterSkin[] = [
    { 
      id: 'jake', 
      name: 'جيك (الهارب الكلاسيكي)', 
      price: 0, 
      unlocked: true, 
      color: 0x1d4ed8, 
      hatColor: 0xdc2626, 
      desc: 'البطل الكلاسيكي بالفيست الأزرق وقبعة التزلج الحمراء', 
      perk: '🎮 متوازن وسريع الاستجابة', 
      iconBg: 'from-blue-600 to-indigo-900', 
      badgeEmoji: '🧢' 
    },
    { 
      id: 'fresh', 
      name: 'فريش (عازف الإيقاع)', 
      price: 8500, 
      unlocked: false, 
      color: 0x10b981, 
      hatColor: 0xf59e0b, 
      desc: 'سماعات DJ مضيئة، سترة خضراء، ومسجل Boombox عملاق على ظهره', 
      perk: '⚡ +15% سرعة مراوغة بين المسارات', 
      iconBg: 'from-emerald-600 to-teal-950', 
      badgeEmoji: '🎧' 
    },
    { 
      id: 'tricky', 
      name: 'تريكي (المتزلجة الذكية)', 
      price: 22000, 
      unlocked: false, 
      color: 0xec4899, 
      hatColor: 0x8b5cf6, 
      desc: 'طاقية بنفسجية وضفائر شقراء مع جاكيت وردي وسادات ركبة', 
      perk: '🦘 قفزات هوائية أعلى بنسبة 20%', 
      iconBg: 'from-pink-600 to-purple-950', 
      badgeEmoji: '🎀' 
    },
    { 
      id: 'beach_king', 
      name: 'بطل الشاطئ (Beach Surfer)', 
      price: 45000, 
      unlocked: false, 
      color: 0x06b6d4, 
      hatColor: 0xfacc15, 
      desc: 'قميص هاواي استوائي مزهر، نظارة شمسية، ولوح ركوب أمواج على الظهر', 
      perk: '🏖️ +25% مدة أطول لجميع القدرات', 
      iconBg: 'from-cyan-500 to-blue-950', 
      badgeEmoji: '🏄‍♂️' 
    },
    { 
      id: 'ninja', 
      name: 'نينجا الظل (Shadow Shinobi)', 
      price: 75000, 
      unlocked: false, 
      color: 0x0f172a, 
      hatColor: 0xdc2626, 
      desc: 'درع الشينوبي الأسود مع سيوف كاتا مزدوجة ووشاح أحمر طائر', 
      perk: '🥷 درع حماية تلقائي من أول تعثر', 
      iconBg: 'from-slate-800 to-rose-950', 
      badgeEmoji: '🥷' 
    },
    { 
      id: 'cyborg', 
      name: 'السايبورغ الذهبي (Cyber 3000)', 
      price: 120000, 
      unlocked: false, 
      color: 0xfacc15, 
      hatColor: 0x38bdf8, 
      desc: 'درع تيتانيوم ذهبي خارق مع مفاعل بلازما مشع في الصدر وعين ليزر', 
      perk: '👑 مضاعف سكور دائم 2X لكل الجريات', 
      iconBg: 'from-amber-400 to-yellow-950', 
      badgeEmoji: '🤖' 
    }
  ];

  hoverboardsList: HoverboardItem[] = [
    { 
      id: 'classic', 
      name: 'لوح الشارع الكلاسيكي', 
      price: 0, 
      unlocked: true, 
      color: 0xd97706, 
      desc: 'لوح التزلج الأساسي بحماية كاملة من الاصطدام الأول', 
      perk: '🛡️ حماية اصطدام كاملة', 
      iconBg: 'from-amber-600 to-orange-950' 
    },
    { 
      id: 'cyber', 
      name: 'لوح السايبر النيون', 
      price: 14000, 
      unlocked: false, 
      color: 0x06b6d4, 
      desc: 'إطار نيون فيروزي فائق التوهج مع محركات دفع بلازمية', 
      perk: '💨 تيربو وسرعة تحويم أعلى', 
      iconBg: 'from-cyan-500 to-blue-950' 
    },
    { 
      id: 'tsunami', 
      name: 'لوح تسونامي الاستوائي', 
      price: 32000, 
      unlocked: false, 
      color: 0x0284c7, 
      desc: 'لوح ركوب أمواج بحري يجذب العملات المجاورة تلقائياً', 
      perk: '🧲 جذب عملات تلقائي مستمر', 
      iconBg: 'from-sky-500 to-indigo-950' 
    },
    { 
      id: 'dragon', 
      name: 'لوح التنين الناري 🔥', 
      price: 65000, 
      unlocked: false, 
      color: 0xef4444, 
      desc: 'لهب بركاني مشتعل يحرق أي حاجز يعترض طريقك على المسار', 
      perk: '💥 تدمير الحواجز الخفيفة', 
      iconBg: 'from-red-600 to-orange-950' 
    },
    { 
      id: 'quantum', 
      name: 'لوح البلازما الكمي ⚡', 
      price: 110000, 
      unlocked: false, 
      color: 0xa855f7, 
      desc: 'تكنولوجيا فضائية فائقة تجعل مدة اللوح تدوم 60 ثانية كاملة', 
      perk: '⏳ مدة تحويم خارقة 60 ثانية', 
      iconBg: 'from-purple-600 to-slate-950' 
    }
  ];

  selectedSkin = 'jake';
  selectedBoard = 'classic';
  leaderboardList: LeaderboardEntry[] = [];

  // P2P Room State
  peer: Peer | null = null;
  p2pConn: any = null;
  createdRoomCode = '';
  joinRoomCodeInput = '';

  // Three.js Engine Variables
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private animationFrameId: number | null = null;
  private clock = new THREE.Clock();

  // World & Track
  private readonly LANES = [-3.6, 0, 3.6];
  private worldObjects: THREE.Object3D[] = [];
  private trackChunks: THREE.Group[] = [];
  private nextSpawnZ = -50;

  // 3D Characters & Collision State
  private runner: any = null;
  private inspector: any = null;
  private runnerStridePhase = 0;
  private copStridePhase = 0;
  private revivesUsedThisRound = 0;
  stumbleCount = 0;
  stumbleResetTimer = 0;
  screenShakeTimer = 0;
  screenShakeIntensity = 0;

  ngOnInit() {
    this.loadPersistedData();
    this.initMissions();
  }

  ngAfterViewInit() {
    this.initThreeJS();
    this.initAudio();
    this.drawWheel();
  }

  @HostListener('window:resize')
  onWindowResize() {
    if (!this.canvasContainerRef || !this.renderer || !this.camera) return;
    const container = this.canvasContainerRef.nativeElement;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    if (width > 0 && height > 0) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }
  }

  ngOnDestroy() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.saveMeInterval) {
      clearInterval(this.saveMeInterval);
    }
    this.stopMusic();
    if (this.peer) {
      this.peer.destroy();
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
  }

  // --- Storage Persistence ---
  private loadPersistedData() {
    this.totalCoins = parseInt(localStorage.getItem('subway_total_coins') || '500', 10);
    this.totalKeys = parseInt(localStorage.getItem('subway_total_keys') || '5', 10);
    this.missionTier = parseInt(localStorage.getItem('subway_mission_tier') || '1', 10);
    this.scoreMultiplier = this.missionTier;

    const savedUpgrades = localStorage.getItem('subway_user_upgrades');
    if (savedUpgrades) {
      try { this.userUpgrades = { ...this.userUpgrades, ...JSON.parse(savedUpgrades) }; } catch(e) {}
    }

    this.selectedSkin = localStorage.getItem('subway_selected_skin') || 'jake';
    this.selectedBoard = localStorage.getItem('subway_selected_board') || 'classic';

    const savedSkins = localStorage.getItem('subway_unlocked_skins');
    if (savedSkins) {
      try {
        const unlockedIds: string[] = JSON.parse(savedSkins);
        this.characterSkins.forEach(s => {
          if (unlockedIds.includes(s.id)) s.unlocked = true;
        });
      } catch(e) {}
    }

    const savedBoards = localStorage.getItem('subway_unlocked_boards');
    if (savedBoards) {
      try {
        const unlockedIds: string[] = JSON.parse(savedBoards);
        this.hoverboardsList.forEach(b => {
          if (unlockedIds.includes(b.id)) b.unlocked = true;
        });
      } catch(e) {}
    }

    const savedRecords = localStorage.getItem('subway_leaderboard_data');
    if (savedRecords) {
      try { this.leaderboardList = JSON.parse(savedRecords); } catch(e) {}
    }
  }

  private savePersistedData() {
    localStorage.setItem('subway_total_coins', this.totalCoins.toString());
    localStorage.setItem('subway_total_keys', this.totalKeys.toString());
    localStorage.setItem('subway_mission_tier', this.missionTier.toString());
    localStorage.setItem('subway_user_upgrades', JSON.stringify(this.userUpgrades));
    localStorage.setItem('subway_selected_skin', this.selectedSkin);
    localStorage.setItem('subway_selected_board', this.selectedBoard);

    const unlockedSkinIds = this.characterSkins.filter(s => s.unlocked).map(s => s.id);
    localStorage.setItem('subway_unlocked_skins', JSON.stringify(unlockedSkinIds));

    const unlockedBoardIds = this.hoverboardsList.filter(b => b.unlocked).map(b => b.id);
    localStorage.setItem('subway_unlocked_boards', JSON.stringify(unlockedBoardIds));

    localStorage.setItem('subway_leaderboard_data', JSON.stringify(this.leaderboardList));
  }

  // --- Missions System ---
  private initMissions() {
    const saved = localStorage.getItem('subway_active_missions');
    if (saved) {
      try { this.activeMissions = JSON.parse(saved); } catch(e) { this.generateMissions(); }
    } else {
      this.generateMissions();
    }
  }

  private generateMissions() {
    const start = ((this.missionTier - 1) * 3) % this.missionPool.length;
    this.activeMissions = [];
    for (let i = 0; i < 3; i++) {
      const t = this.missionPool[(start + i) % this.missionPool.length];
      this.activeMissions.push({
        id: t.id + '_' + this.missionTier,
        text: t.text,
        target: t.target,
        type: t.type,
        rewardKeys: t.rewardKeys,
        current: 0,
        completed: false
      });
    }
    this.saveMissions();
  }

  private saveMissions() {
    localStorage.setItem('subway_active_missions', JSON.stringify(this.activeMissions));
    localStorage.setItem('subway_mission_tier', this.missionTier.toString());
  }

  private trackMission(type: string, amount = 1) {
    if (this.gameState !== 'PLAYING') return;
    let changed = false;
    this.activeMissions.forEach(m => {
      if (!m.completed && m.type === type) {
        m.current = Math.min(m.target, m.current + amount);
        changed = true;
        if (m.current >= m.target) {
          m.completed = true;
          this.totalKeys += m.rewardKeys;
          this.savePersistedData();
          this.playPowerupSound();
          this.showBanner(`🎉 اكتملت المهمة! +${m.rewardKeys} مفتاح 🔑`);
          this.voiceCallout('أحسنت! اكتملت المهمة');
        }
      }
    });

    if (changed) {
      this.saveMissions();
      if (this.activeMissions.every(m => m.completed)) {
        this.missionTier++;
        this.scoreMultiplier = this.missionTier;
        this.playPowerupSound();
        this.showBanner(`🔥 ترقية المستوى ${this.missionTier}! مضاعف السكور x${this.scoreMultiplier}!`);
        setTimeout(() => this.generateMissions(), 2000);
      }
    }
  }

  toggleMissionsBanner() {
    this.showMissionsBanner = !this.showMissionsBanner;
  }

  getCompletedMissionsCount(): number {
    return this.activeMissions.filter(m => m.completed).length;
  }

  // --- Three.js Initialization ---
  private initThreeJS() {
    const container = this.canvasContainerRef.nativeElement;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Scene with Sunny Tropical Beach Atmosphere
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x38bdf8); // Bright Tropical Summer Sky Blue
    this.scene.fog = new THREE.FogExp2(0xbae6fd, 0.0035); // Light Coastal Sea-Spray Haze

    // Camera
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 450);
    this.camera.position.set(0, 5.5, 9.5);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    // Warm Tropical Sun & Ocean Ambient Lights
    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0xfde047, 1.2); // Sky blue above, golden sand bounce below
    this.scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfffbeb, 1.6); // Radiant tropical sun
    sunLight.position.set(20, 45, 25);
    this.scene.add(sunLight);

    const warmAmbient = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(warmAmbient);

    // Infinite 360-Degree Tropical Sky Dome & Sand Floor (Guarantees zero black screen at any camera rotation)
    const skyGeo = new THREE.SphereGeometry(380, 32, 16);
    const skyMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.BackSide });
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(skyDome);

    const groundGeo = new THREE.PlaneGeometry(800, 800);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0xfacc15 });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -0.12;
    this.scene.add(groundMesh);

    // Build World Track Chunks (Tropical Beach Resort Environment)
    this.buildTrackEnvironment();

    // Build Characters
    this.runner = this.buildJakeCharacter();
    this.applySelectedSkinToRunner();
    this.applySelectedBoardToRunner();
    this.scene.add(this.runner.root);

    this.inspector = this.buildPoliceCharacter();
    this.scene.add(this.inspector.root);

    // Start Loop
    this.clock.start();
    this.animate();
  }

  private buildTrackEnvironment() {
    const CHUNK_LENGTH = 60;
    const NUM_CHUNKS = 5;

    // Materials for Tropical Beach Resort Environment
    const sandTile1Mat = new THREE.MeshLambertMaterial({ color: 0xfde047 }); // Bright sunny beach sand
    const sandTile2Mat = new THREE.MeshLambertMaterial({ color: 0xfacc15 }); // Warm golden sand
    const oceanWaterMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1, metalness: 0.4 }); // Crystal turquoise sea
    const oceanFoamMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.85 }); // Foamy white shoreline
    const palmTrunkMat = new THREE.MeshLambertMaterial({ color: 0x78350f }); // Coconut palm wood
    const palmLeaf1Mat = new THREE.MeshLambertMaterial({ color: 0x16a34a }); // Lush palm fronds
    const palmLeaf2Mat = new THREE.MeshLambertMaterial({ color: 0x22c55e }); // Bright palm leaves
    const coconutMat = new THREE.MeshLambertMaterial({ color: 0x451a03 }); // Brown coconuts
    const woodDockMat = new THREE.MeshLambertMaterial({ color: 0x92400e }); // Rustic boardwalk wood
    const railMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.85, roughness: 0.2 }); // Coastal steel rails
    const tieMat = new THREE.MeshLambertMaterial({ color: 0x78350f }); // Teak wooden sleepers

    // Umbrella & Surfboard Color Palettes
    const umbrellaMatRed = new THREE.MeshLambertMaterial({ color: 0xef4444 });
    const umbrellaMatWhite = new THREE.MeshLambertMaterial({ color: 0xf8fafc });
    const umbrellaMatCyan = new THREE.MeshLambertMaterial({ color: 0x06b6d4 });
    const umbrellaMatYellow = new THREE.MeshLambertMaterial({ color: 0xfacc15 });
    const lifebuoyRed = new THREE.MeshLambertMaterial({ color: 0xdc2626 });
    const lifebuoyWhite = new THREE.MeshLambertMaterial({ color: 0xffffff });

    for (let c = 0; c < NUM_CHUNKS; c++) {
      const chunk = new THREE.Group();
      chunk.position.z = -c * CHUNK_LENGTH;

      // 1. Alternating Two-Tone Golden Beach Sand Tiles (Visibly Rushing Past)
      for (let fz = -CHUNK_LENGTH / 2; fz < CHUNK_LENGTH / 2; fz += 4) {
        const isOdd = Math.abs(Math.round(fz / 4)) % 2 === 1;
        const tileGeo = new THREE.PlaneGeometry(36, 4);
        const tile = new THREE.Mesh(tileGeo, isOdd ? sandTile1Mat : sandTile2Mat);
        tile.rotation.x = -Math.PI / 2;
        tile.position.set(0, 0, fz + 2);
        chunk.add(tile);
      }

      // 2. Turquoise Ocean Waters with Foamy Shoreline on Both Flanks
      [-22, 22].forEach(ox => {
        // Deep turquoise ocean plane
        const waterGeo = new THREE.PlaneGeometry(16, CHUNK_LENGTH);
        const water = new THREE.Mesh(waterGeo, oceanWaterMat);
        water.rotation.x = -Math.PI / 2;
        water.position.set(ox, -0.05, 0);

        // Foamy shoreline wave crest
        const foamGeo = new THREE.PlaneGeometry(1.6, CHUNK_LENGTH);
        const foam = new THREE.Mesh(foamGeo, oceanFoamMat);
        foam.rotation.x = -Math.PI / 2;
        foam.position.set(ox > 0 ? ox - 8.2 : ox + 8.2, 0.01, 0);

        chunk.add(water, foam);
      });

      // 3. High-Contrast Coastal Rails and Teak Wooden Ties
      [-3.6, 0, 3.6].forEach(x => {
        [-0.7, 0.7].forEach(rx => {
          const railGeo = new THREE.BoxGeometry(0.14, 0.18, CHUNK_LENGTH);
          const rail = new THREE.Mesh(railGeo, railMat);
          rail.position.set(x + rx, 0.09, 0);
          chunk.add(rail);
        });

        // Teak Wooden Ties with Chrome Fasteners
        const tieGeo = new THREE.BoxGeometry(2.0, 0.12, 0.45);
        for (let tz = -CHUNK_LENGTH / 2; tz < CHUNK_LENGTH / 2; tz += 1.4) {
          const tie = new THREE.Mesh(tieGeo, tieMat);
          tie.position.set(x, 0.05, tz);

          const bolt = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.1), railMat);
          bolt.position.set(x, 0.07, tz);

          chunk.add(tie, bolt);
        }
      });

      // 4. Tropical Coconut Palm Trees (أشجار النخيل الاستوائية على جانبي المسار)
      [-7.2, 7.2].forEach(px => {
        for (let pz = -CHUNK_LENGTH / 2 + 6; pz < CHUNK_LENGTH / 2; pz += 18) {
          const palmGroup = new THREE.Group();
          palmGroup.position.set(px, 0, pz);

          // Curved Palm Trunk
          const trunkGeo = new THREE.CylinderGeometry(0.32, 0.48, 7.5, 8);
          const trunk = new THREE.Mesh(trunkGeo, palmTrunkMat);
          trunk.position.set(px > 0 ? -0.4 : 0.4, 3.75, 0);
          trunk.rotation.z = px > 0 ? -0.1 : 0.1;
          palmGroup.add(trunk);

          // Palm Crown with 6 Lush Fronds
          const crownY = 7.3;
          for (let f = 0; f < 6; f++) {
            const angle = (f * Math.PI * 2) / 6;
            const frondGeo = new THREE.BoxGeometry(0.55, 0.06, 2.8);
            const frond = new THREE.Mesh(frondGeo, f % 2 === 0 ? palmLeaf1Mat : palmLeaf2Mat);
            frond.position.set(Math.sin(angle) * 1.3, crownY - 0.2, Math.cos(angle) * 1.3);
            frond.rotation.y = angle;
            frond.rotation.x = 0.35;
            palmGroup.add(frond);
          }

          // Cluster of Brown Coconuts
          for (let k = 0; k < 3; k++) {
            const coconut = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), coconutMat);
            const cAngle = (k * Math.PI * 2) / 3;
            coconut.position.set(Math.sin(cAngle) * 0.35, crownY - 0.25, Math.cos(cAngle) * 0.35);
            palmGroup.add(coconut);
          }

          chunk.add(palmGroup);
        }
      });

      // 5. Striped Beach Umbrellas & Wooden Sun Loungers (شماسي ملونة وكراسي بحر)
      [-10.2, 10.2].forEach((ux, uIdx) => {
        for (let uz = -CHUNK_LENGTH / 2 + 12; uz < CHUNK_LENGTH / 2; uz += 24) {
          const umbrellaGroup = new THREE.Group();
          umbrellaGroup.position.set(ux, 0, uz);

          // Umbrella Pole
          const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.2, 8), woodDockMat);
          pole.position.y = 1.6;
          umbrellaGroup.add(pole);

          // Striped Umbrella Canopy
          const canopyGeo = new THREE.ConeGeometry(1.6, 0.65, 12);
          const canopyMat = (uIdx + uz) % 2 === 0 ? umbrellaMatRed : umbrellaMatCyan;
          const canopy = new THREE.Mesh(canopyGeo, canopyMat);
          canopy.position.y = 3.2;
          umbrellaGroup.add(canopy);

          // White accent rim
          const rim = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.05, 6, 16), umbrellaMatWhite);
          rim.rotation.x = Math.PI / 2;
          rim.position.y = 2.9;
          umbrellaGroup.add(rim);

          // Wooden Sun Lounger under umbrella
          const lounger = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.22, 2.2), woodDockMat);
          lounger.position.set(0, 0.15, 0.2);
          const loungerMat = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.08, 2.0), umbrellaMatWhite);
          loungerMat.position.set(0, 0.28, 0.2);
          umbrellaGroup.add(lounger, loungerMat);

          chunk.add(umbrellaGroup);
        }
      });

      // 6. Upright Colorful Surfboards Planted in Sand
      [-8.6, 8.6].forEach(sx => {
        const boardGroup = new THREE.Group();
        boardGroup.position.set(sx, 0, -CHUNK_LENGTH / 2 + 20);

        const boardGeo = new THREE.BoxGeometry(0.55, 2.4, 0.1);
        const boardMat = new THREE.MeshStandardMaterial({ color: sx > 0 ? 0xec4899 : 0x06b6d4, roughness: 0.3 });
        const surfboard = new THREE.Mesh(boardGeo, boardMat);
        surfboard.position.y = 1.1;
        surfboard.rotation.z = sx > 0 ? -0.15 : 0.15;

        // Stripe on surfboard
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.57, 0.35, 0.12), umbrellaMatYellow);
        stripe.position.set(0, 1.1, 0);
        surfboard.add(stripe);

        boardGroup.add(surfboard);
        chunk.add(boardGroup);
      });

      // 7. Coastal Tropical Boardwalk Archway
      const archGroup = new THREE.Group();
      archGroup.position.set(0, 0, 0);

      // Wooden Posts (Left & Right)
      [-6.5, 6.5].forEach(postX => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 9.0, 10), woodDockMat);
        post.position.set(postX, 4.5, 0);

        // Lifebuoy hanging on each post!
        const buoy = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.14, 8, 16), lifebuoyRed);
        buoy.position.set(postX > 0 ? postX - 0.5 : postX + 0.5, 4.2, 0);
        const buoyStripe1 = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.32), lifebuoyWhite);
        buoyStripe1.position.copy(buoy.position);
        archGroup.add(post, buoy, buoyStripe1);
      });

      // Overhead Tropical Bamboo & Surfboard Sign
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(14.5, 1.1, 1.2), woodDockMat);
      lintel.position.set(0, 8.5, 0);

      // Canvas Sign: "BEACH DASH 🏄‍♂️🌴"
      const signCanvas = document.createElement('canvas');
      signCanvas.width = 512;
      signCanvas.height = 128;
      const sCtx = signCanvas.getContext('2d');
      if (sCtx) {
        sCtx.fillStyle = '#0284c7';
        sCtx.fillRect(0, 0, 512, 128);
        sCtx.lineWidth = 8;
        sCtx.strokeStyle = '#facc15';
        sCtx.strokeRect(4, 4, 504, 120);
        sCtx.fillStyle = '#ffffff';
        sCtx.font = 'bold 44px Cairo, sans-serif';
        sCtx.textAlign = 'center';
        sCtx.fillText('🌊 شاطئ المترو الاستوائي 🏖️🏄‍♂️', 256, 78);
      }
      const sTex = new THREE.CanvasTexture(signCanvas);
      const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(8.5, 2.0), new THREE.MeshBasicMaterial({ map: sTex }));
      signMesh.position.set(0, 8.5, 0.65);

      archGroup.add(lintel, signMesh);
      chunk.add(archGroup);

      this.scene.add(chunk);
      this.trackChunks.push(chunk);
    }
  }

  // --- 1:1 Jake Character Builder (Back Facing Player, Running Forward into Tunnel) ---
  private buildJakeCharacter() {
    const root = new THREE.Group();
    const bodyGroup = new THREE.Group();
    root.add(bodyGroup);

    // Torso Group (White Hoodie + Denim Vest)
    const torsoGroup = new THREE.Group();
    torsoGroup.position.y = 1.5;

    const torsoGeo = new THREE.BoxGeometry(0.85, 1.1, 0.52);
    const torsoMat = new THREE.MeshLambertMaterial({ color: 0x1d4ed8 }); // Denim Blue
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torsoGroup.add(torso);

    // White Hoodie chest & collar (Facing Forward into -Z)
    const hoodieGeo = new THREE.BoxGeometry(0.42, 0.95, 0.15);
    const hoodieMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc });
    const hoodie = new THREE.Mesh(hoodieGeo, hoodieMat);
    hoodie.position.set(0, 0.08, -0.22);
    torsoGroup.add(hoodie);

    // Olive / Brown Street Backpack (Mounted on BACK facing player +Z)
    const packGeo = new THREE.BoxGeometry(0.65, 0.85, 0.32);
    const packMat = new THREE.MeshLambertMaterial({ color: 0x4d3822 });
    const backpack = new THREE.Mesh(packGeo, packMat);
    backpack.position.set(0, 0, 0.32);
    const packPocket = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.12), new THREE.MeshLambertMaterial({ color: 0x3f6212 }));
    packPocket.position.set(0, -0.15, 0.18);
    backpack.add(packPocket);
    torsoGroup.add(backpack);

    bodyGroup.add(torsoGroup);

    // Head Group
    const headGroup = new THREE.Group();
    headGroup.position.y = 2.35;

    const headGeo = new THREE.SphereGeometry(0.36, 16, 16);
    const headMat = new THREE.MeshLambertMaterial({ color: 0xffedd5 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 0, -0.04);
    headGroup.add(head);

    // Red Cap with Classic Backwards Visor (Facing Player +Z)
    const capGeo = new THREE.CylinderGeometry(0.38, 0.4, 0.22, 16);
    const capMat = new THREE.MeshLambertMaterial({ color: 0xdc2626 });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.set(0, 0.2, 0);
    headGroup.add(cap);

    // Backwards Green Visor pointing towards player (+Z)
    const visorGeo = new THREE.BoxGeometry(0.42, 0.05, 0.28);
    const visorMat = new THREE.MeshLambertMaterial({ color: 0x16a34a });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 0.18, 0.28);
    headGroup.add(visor);

    bodyGroup.add(headGroup);

    // Left Arm Group (Pivoting at Shoulder)
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.55, 1.9, 0);
    const armGeo = new THREE.BoxGeometry(0.24, 0.85, 0.24);
    const armMat = new THREE.MeshLambertMaterial({ color: 0x1d4ed8 });
    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.y = -0.4;
    leftArmGroup.add(leftArm);
    bodyGroup.add(leftArmGroup);

    // Right Arm Group (Pivoting at Shoulder) + Spray Can
    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.55, 1.9, 0);
    const rightArm = new THREE.Mesh(armGeo, armMat);
    rightArm.position.y = -0.4;
    rightArmGroup.add(rightArm);

    // Spray Can in Right Hand (Pointing Forward into -Z)
    const canGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.32, 12);
    const canMat = new THREE.MeshLambertMaterial({ color: 0x06b6d4 });
    const sprayCan = new THREE.Mesh(canGeo, canMat);
    sprayCan.position.set(0, -0.75, -0.15);
    sprayCan.rotation.x = -Math.PI / 4;
    rightArmGroup.add(sprayCan);
    bodyGroup.add(rightArmGroup);

    // Left Leg Group (Pivoting at Hip)
    const leftLegGroup = new THREE.Group();
    leftLegGroup.position.set(-0.24, 0.95, 0);
    const legGeo = new THREE.BoxGeometry(0.28, 0.9, 0.28);
    const legMat = new THREE.MeshLambertMaterial({ color: 0x1e3a8a });
    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.y = -0.45;
    // Shoe pointing forward into -Z
    const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.45), new THREE.MeshLambertMaterial({ color: 0xdc2626 }));
    leftShoe.position.set(0, -0.85, -0.08);
    leftLegGroup.add(leftLeg, leftShoe);
    bodyGroup.add(leftLegGroup);

    // Right Leg Group (Pivoting at Hip)
    const rightLegGroup = new THREE.Group();
    rightLegGroup.position.set(0.24, 0.95, 0);
    const rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.y = -0.45;
    // Shoe pointing forward into -Z
    const rightShoe = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.45), new THREE.MeshLambertMaterial({ color: 0xdc2626 }));
    rightShoe.position.set(0, -0.85, -0.08);
    rightLegGroup.add(rightLeg, rightShoe);
    bodyGroup.add(rightLegGroup);

    // Pharaonic Horus Jetpack 3D Model (Mounted on BACK facing player +Z)
    const pharaohJetpack = new THREE.Group();
    pharaohJetpack.position.set(0, 1.55, 0.36);
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.85, roughness: 0.2 });
    const flameMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    [-0.35, 0.35].forEach(ox => {
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 1.2, 12), goldMat);
      cyl.position.x = ox;
      const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.25, 12), goldMat);
      nozzle.position.set(ox, -0.7, 0);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.6, 10), flameMat);
      flame.rotation.x = Math.PI;
      flame.position.set(ox, -1.05, 0);
      pharaohJetpack.add(cyl, nozzle, flame);
    });

    const leftWing = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.35, 0.05), goldMat);
    leftWing.position.set(-0.75, 0.2, 0.05);
    leftWing.rotation.z = 0.25;
    const rightWing = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.35, 0.05), goldMat);
    rightWing.position.set(0.75, 0.2, 0.05);
    rightWing.rotation.z = -0.25;
    pharaohJetpack.add(leftWing, rightWing);
    pharaohJetpack.visible = false;
    bodyGroup.add(pharaohJetpack);

    // High-Tech Cyber Hoverboard (Under Runner's Feet)
    const hoverboard = new THREE.Group();
    hoverboard.position.y = -0.1;

    const boardDeckMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.25, metalness: 0.6 });
    const carbonGripMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 });
    const neonGlowMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const goldAccentMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.9, roughness: 0.1 });
    const plasmaConeMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    // 1. Aerodynamic Main Deck
    const boardMesh = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.14, 2.3), boardDeckMat);
    hoverboard.add(boardMesh);

    // Top Carbon Grip Pads (Front & Rear Foot Placements)
    [-0.55, 0.55].forEach(pz => {
      const pad = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.7), carbonGripMat);
      pad.position.set(0, 0.08, pz);
      boardMesh.add(pad);
    });

    // Center Gold Livery Stripe
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 2.1), goldAccentMat);
    stripe.position.y = 0.08;
    boardMesh.add(stripe);

    // 2. Full Perimeter Neon LED Light Strip
    const boardGlow = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.06, 2.38), neonGlowMat);
    boardGlow.position.y = -0.04;
    hoverboard.add(boardGlow);

    // 3. Dual Anti-Gravity Plasma Thrusters Underneath
    [-0.35, 0.35].forEach(tx => {
      const thruster = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.35, 12), carbonGripMat);
      thruster.position.set(tx, -0.2, -0.6);

      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.45, 10), plasmaConeMat);
      flame.rotation.x = Math.PI;
      flame.position.set(0, -0.38, 0);
      thruster.add(flame);

      hoverboard.add(thruster);
    });

    hoverboard.visible = false;

    // Dynamic Ground Shadow Blob
    const shadowGeo = new THREE.PlaneGeometry(1.5, 1.5);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.38 });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0.03;
    root.add(shadowMesh);

    return {
      root,
      bodyGroup,
      torsoGroup,
      torso,
      hoodie,
      backpack,
      headGroup,
      head,
      cap,
      visor,
      leftArmGroup,
      rightArmGroup,
      leftArm,
      rightArm,
      leftLegGroup,
      rightLegGroup,
      leftLeg,
      rightLeg,
      leftShoe,
      rightShoe,
      hoverboard,
      pharaohJetpack,
      leftWing,
      rightWing,
      sprayCan,
      shadowMesh,
      customAccessoryGroup: null,
      laneIndex: 1,
      targetX: 0,
      vx: 0,
      y: 0,
      vy: 0,
      isJumping: false,
      isSliding: false,
      slideTimer: 0
    };
  }

  // --- Dynamic 3D Character Customizer (تبديل مظهر وهيئة الشخصية في المشهد ثلاثي الأبعاد) ---
  applySelectedSkinToRunner() {
    if (!this.runner) return;
    const skinId = this.selectedSkin || 'jake';

    // 1. Remove previous custom skin accessories
    if (this.runner.customAccessoryGroup) {
      this.runner.bodyGroup.remove(this.runner.customAccessoryGroup);
      this.runner.customAccessoryGroup = null;
    }
    const accGroup = new THREE.Group();
    this.runner.customAccessoryGroup = accGroup;
    this.runner.bodyGroup.add(accGroup);

    const torso = this.runner.torso;
    const hoodie = this.runner.hoodie;
    const backpack = this.runner.backpack;
    const cap = this.runner.cap;
    const visor = this.runner.visor;
    const leftArm = this.runner.leftArm;
    const rightArm = this.runner.rightArm;
    const leftLeg = this.runner.leftLeg;
    const rightLeg = this.runner.rightLeg;
    const leftShoe = this.runner.leftShoe;
    const rightShoe = this.runner.rightShoe;

    // Reset base visibilities
    cap.visible = true;
    visor.visible = true;
    backpack.visible = true;

    if (skinId === 'jake') {
      // 🧢 جيك (الهارب الكلاسيكي)
      torso.material = new THREE.MeshLambertMaterial({ color: 0x1d4ed8 }); // Denim Blue
      hoodie.material = new THREE.MeshLambertMaterial({ color: 0xf8fafc }); // White hoodie
      backpack.material = new THREE.MeshLambertMaterial({ color: 0x4d3822 }); // Brown backpack
      cap.material = new THREE.MeshLambertMaterial({ color: 0xdc2626 }); // Red cap
      visor.material = new THREE.MeshLambertMaterial({ color: 0x16a34a }); // Green visor
      leftArm.material = new THREE.MeshLambertMaterial({ color: 0x1d4ed8 });
      rightArm.material = new THREE.MeshLambertMaterial({ color: 0x1d4ed8 });
      leftLeg.material = new THREE.MeshLambertMaterial({ color: 0x1e3a8a }); // Jeans
      rightLeg.material = new THREE.MeshLambertMaterial({ color: 0x1e3a8a });
      leftShoe.material = new THREE.MeshLambertMaterial({ color: 0xdc2626 }); // Red shoes
      rightShoe.material = new THREE.MeshLambertMaterial({ color: 0xdc2626 });
    } else if (skinId === 'fresh') {
      // 🎧 فريش (عازف الإيقاع - DJ)
      torso.material = new THREE.MeshLambertMaterial({ color: 0x10b981 }); // Emerald Green jacket
      hoodie.material = new THREE.MeshLambertMaterial({ color: 0xfacc15 }); // Gold zipper trim
      cap.material = new THREE.MeshLambertMaterial({ color: 0xf59e0b }); // Golden orange beanie
      visor.visible = false;
      backpack.visible = false;

      leftArm.material = new THREE.MeshLambertMaterial({ color: 0x10b981 });
      rightArm.material = new THREE.MeshLambertMaterial({ color: 0x10b981 });
      leftLeg.material = new THREE.MeshLambertMaterial({ color: 0x365314 }); // Olive cargo pants
      rightLeg.material = new THREE.MeshLambertMaterial({ color: 0x365314 });
      leftShoe.material = new THREE.MeshLambertMaterial({ color: 0x38bdf8 }); // Cyan high-tops
      rightShoe.material = new THREE.MeshLambertMaterial({ color: 0x38bdf8 });

      // Big Over-Ear DJ Headphones with Cyan Glowing Rings
      const hpMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 });
      const hpGlowMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
      const hpBand = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.06, 8, 16, Math.PI), hpMat);
      hpBand.position.set(0, 2.65, -0.04);
      hpBand.rotation.z = Math.PI;
      const hpLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 12), hpGlowMat);
      hpLeft.position.set(-0.44, 2.35, -0.04);
      hpLeft.rotation.z = Math.PI / 2;
      const hpRight = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 12), hpGlowMat);
      hpRight.position.set(0.44, 2.35, -0.04);
      hpRight.rotation.z = Math.PI / 2;
      accGroup.add(hpBand, hpLeft, hpRight);

      // Giant Stereo Boombox on Back with Twin Subwoofers!
      const boomboxGeo = new THREE.BoxGeometry(1.0, 0.65, 0.38);
      const boomboxMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.3 });
      const boombox = new THREE.Mesh(boomboxGeo, boomboxMat);
      boombox.position.set(0, 1.5, 0.38);
      [-0.28, 0.28].forEach(bx => {
        const sub = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.05, 12), new THREE.MeshBasicMaterial({ color: 0x0f172a }));
        sub.position.set(bx, 0, 0.2);
        sub.rotation.x = Math.PI / 2;
        const subCore = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), hpGlowMat);
        subCore.position.set(bx, 0, 0.22);
        boombox.add(sub, subCore);
      });
      accGroup.add(boombox);
    } else if (skinId === 'tricky') {
      // 🎀 تريكي (المتزلجة الذكية)
      torso.material = new THREE.MeshLambertMaterial({ color: 0xec4899 }); // Hot Pink crop jacket
      hoodie.material = new THREE.MeshLambertMaterial({ color: 0xa855f7 }); // Lavender purple under-top
      backpack.material = new THREE.MeshLambertMaterial({ color: 0xec4899 }); // Pink skate pack
      cap.material = new THREE.MeshLambertMaterial({ color: 0x8b5cf6 }); // Violet skater beanie
      visor.visible = false;
      leftArm.material = new THREE.MeshLambertMaterial({ color: 0xffedd5 }); // Bare arms
      rightArm.material = new THREE.MeshLambertMaterial({ color: 0xffedd5 });
      leftLeg.material = new THREE.MeshLambertMaterial({ color: 0x0284c7 }); // Denim shorts
      rightLeg.material = new THREE.MeshLambertMaterial({ color: 0x0284c7 });
      leftShoe.material = new THREE.MeshLambertMaterial({ color: 0xf43f5e }); // Rose sneakers
      rightShoe.material = new THREE.MeshLambertMaterial({ color: 0xf43f5e });

      // Blonde Skater Braids on sides
      const hairMat = new THREE.MeshLambertMaterial({ color: 0xfde047 });
      [-0.38, 0.38].forEach(hx => {
        const pigtail = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.6, 8), hairMat);
        pigtail.position.set(hx, 2.1, 0.05);
        pigtail.rotation.z = hx > 0 ? -0.2 : 0.2;
        const ribbon = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.03, 6, 12), new THREE.MeshBasicMaterial({ color: 0xec4899 }));
        ribbon.position.set(hx, 2.35, 0.05);
        ribbon.rotation.x = Math.PI / 2;
        accGroup.add(pigtail, ribbon);
      });

      // Purple Skater Knee Pads
      const padMat = new THREE.MeshStandardMaterial({ color: 0x7c3aed, roughness: 0.4 });
      [-0.24, 0.24].forEach(px => {
        const pad = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.14), padMat);
        pad.position.set(px, 0.5, -0.16);
        accGroup.add(pad);
      });
    } else if (skinId === 'beach_king') {
      // 🏄‍♂️ بطل الشاطئ (Beach Surfer)
      torso.material = new THREE.MeshLambertMaterial({ color: 0x06b6d4 }); // Turquoise Hawaiian Shirt
      hoodie.material = new THREE.MeshLambertMaterial({ color: 0xfacc15 }); // Tropical yellow floral collar
      backpack.visible = false;
      cap.material = new THREE.MeshLambertMaterial({ color: 0xfacc15 }); // Sun-kissed golden hair
      visor.visible = false;
      leftArm.material = new THREE.MeshLambertMaterial({ color: 0xffedd5 });
      rightArm.material = new THREE.MeshLambertMaterial({ color: 0xffedd5 });
      leftLeg.material = new THREE.MeshLambertMaterial({ color: 0xfacc15 }); // Sunny Yellow Boardshorts
      rightLeg.material = new THREE.MeshLambertMaterial({ color: 0xfacc15 });
      leftShoe.material = new THREE.MeshLambertMaterial({ color: 0x0284c7 });
      rightShoe.material = new THREE.MeshLambertMaterial({ color: 0x0284c7 });

      // Gold Sunglasses perched on Head
      const glassMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.9, roughness: 0.1 });
      const lensMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
      const sunFrame = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.1, 0.12), glassMat);
      sunFrame.position.set(0, 2.5, -0.26);
      const lensL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.08), lensMat);
      lensL.position.set(-0.18, 2.5, -0.28);
      const lensR = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.08), lensMat);
      lensR.position.set(0.18, 2.5, -0.28);
      accGroup.add(sunFrame, lensL, lensR);

      // Mini Surfboard strapped diagonally on back
      const miniBoardGeo = new THREE.BoxGeometry(0.48, 1.5, 0.1);
      const miniBoardMat = new THREE.MeshStandardMaterial({ color: 0xec4899, roughness: 0.3 });
      const miniBoard = new THREE.Mesh(miniBoardGeo, miniBoardMat);
      miniBoard.position.set(0.1, 1.55, 0.34);
      miniBoard.rotation.z = 0.35;
      const boardStripe = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.12), new THREE.MeshLambertMaterial({ color: 0x06b6d4 }));
      boardStripe.position.set(0, 0.2, 0);
      miniBoard.add(boardStripe);
      accGroup.add(miniBoard);
    } else if (skinId === 'ninja') {
      // 🥷 نينجا الظل (Shadow Shinobi)
      torso.material = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 }); // Matte Black
      hoodie.material = new THREE.MeshLambertMaterial({ color: 0xdc2626 }); // Crimson Crest
      backpack.visible = false;
      cap.material = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });
      visor.material = new THREE.MeshBasicMaterial({ color: 0xef4444 }); // Glowing red headband
      leftArm.material = new THREE.MeshStandardMaterial({ color: 0x0f172a });
      rightArm.material = new THREE.MeshStandardMaterial({ color: 0x0f172a });
      leftLeg.material = new THREE.MeshStandardMaterial({ color: 0x0f172a });
      rightLeg.material = new THREE.MeshStandardMaterial({ color: 0x0f172a });
      leftShoe.material = new THREE.MeshLambertMaterial({ color: 0xfacc15 });
      rightShoe.material = new THREE.MeshLambertMaterial({ color: 0xfacc15 });

      // Red Fluttering Headband Tail ribbons behind head
      const ribbonMat = new THREE.MeshBasicMaterial({ color: 0xdc2626 });
      const ribbonL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 0.04), ribbonMat);
      ribbonL.position.set(-0.15, 2.2, 0.32);
      ribbonL.rotation.x = 0.4;
      const ribbonR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.04), ribbonMat);
      ribbonR.position.set(0.12, 2.15, 0.32);
      ribbonR.rotation.x = 0.45;
      accGroup.add(ribbonL, ribbonR);

      // Dual Crossed Samurai Katanas in Sheaths on Back
      const katanaMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
      const goldHiltMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.9 });
      [-0.45, 0.45].forEach(kx => {
        const sheath = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.4, 8), katanaMat);
        sheath.position.set(0, 1.6, 0.34);
        sheath.rotation.z = kx;
        const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.35, 8), goldHiltMat);
        hilt.position.set(0, 0.8, 0);
        sheath.add(hilt);
        accGroup.add(sheath);
      });
    } else if (skinId === 'cyborg') {
      // 🤖 السايبورغ الذهبي (Cyber Cyborg 3000)
      const goldArmorMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.95, roughness: 0.08 });
      const cyanCoreMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
      const darkTitaniumMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.2 });

      torso.material = goldArmorMat;
      hoodie.material = cyanCoreMat; // Glowing Arc Reactor in Chest
      backpack.visible = false;
      cap.material = goldArmorMat; // Chrome Helmet
      visor.material = cyanCoreMat; // HUD Visor
      leftArm.material = darkTitaniumMat;
      rightArm.material = darkTitaniumMat;
      leftLeg.material = goldArmorMat;
      rightLeg.material = goldArmorMat;
      leftShoe.material = cyanCoreMat;
      rightShoe.material = cyanCoreMat;

      // Arc Reactor Pulsing Core Ring
      const reactorRing = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.04, 8, 16), cyanCoreMat);
      reactorRing.position.set(0, 1.55, -0.28);
      accGroup.add(reactorRing);

      // Dual Jet Exhaust Thrusters on Back
      [-0.22, 0.22].forEach(tx => {
        const thruster = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.5, 10), darkTitaniumMat);
        thruster.position.set(tx, 1.55, 0.34);
        const glowFlame = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 8), cyanCoreMat);
        glowFlame.rotation.x = Math.PI;
        glowFlame.position.set(0, -0.32, 0);
        thruster.add(glowFlame);
        accGroup.add(thruster);
      });
    }
  }

  // --- Dynamic 3D Hoverboard Customizer (تبديل شكل ولون لوح التزلج ثلاثي الأبعاد) ---
  applySelectedBoardToRunner() {
    if (!this.runner || !this.runner.hoverboard) return;
    const boardId = this.selectedBoard || 'classic';
    const board = this.runner.hoverboard;

    if (boardId === 'classic') {
      board.children.forEach((c: any) => {
        if (c.material && c.material.color) c.material.color.setHex(0xd97706);
      });
    } else if (boardId === 'cyber') {
      board.children.forEach((c: any) => {
        if (c.material && c.material.color) c.material.color.setHex(0x00f0ff);
      });
    } else if (boardId === 'tsunami') {
      board.children.forEach((c: any) => {
        if (c.material && c.material.color) c.material.color.setHex(0x0284c7);
      });
    } else if (boardId === 'dragon') {
      board.children.forEach((c: any) => {
        if (c.material && c.material.color) c.material.color.setHex(0xef4444);
      });
    } else if (boardId === 'quantum') {
      board.children.forEach((c: any) => {
        if (c.material && c.material.color) c.material.color.setHex(0xa855f7);
      });
    }
  }

  // --- Police Inspector & Running Bulldog Companion ---
  private buildPoliceCharacter() {
    const root = new THREE.Group();
    root.position.set(0, 0, 8);

    // Inspector Torso & Cap
    const torsoGeo = new THREE.BoxGeometry(1.2, 1.4, 0.7);
    const torsoMat = new THREE.MeshLambertMaterial({ color: 0x0f172a });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 1.7;
    root.add(torso);

    const headGeo = new THREE.SphereGeometry(0.42, 16, 16);
    const headMat = new THREE.MeshLambertMaterial({ color: 0xfecaca });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 2.65;
    root.add(head);

    const capGeo = new THREE.CylinderGeometry(0.44, 0.46, 0.28, 16);
    const capMat = new THREE.MeshLambertMaterial({ color: 0x0f172a });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.set(0, 2.9, 0);
    root.add(cap);

    // Inspector Legs
    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.1, 0.35), torsoMat);
    leftLeg.position.set(-0.3, 0.55, 0);
    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.1, 0.35), torsoMat);
    rightLeg.position.set(0.3, 0.55, 0);
    root.add(leftLeg, rightLeg);

    // Police Dog (Bulldog)
    const dog = new THREE.Group();
    dog.position.set(1.4, 0, 0);

    const dogBody = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.9), new THREE.MeshLambertMaterial({ color: 0x78350f }));
    dogBody.position.y = 0.5;
    const dogHead = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.45), new THREE.MeshLambertMaterial({ color: 0x451a03 }));
    dogHead.position.set(0, 0.8, 0.5);

    dog.add(dogBody, dogHead);
    root.add(dog);

    return { root, torso, head, leftLeg, rightLeg, dog, laneIndex: 1, targetX: 0 };
  }

  // --- 3D Pickups & Obstacles ---
  private createGoldCoin() {
    const geo = new THREE.CylinderGeometry(0.44, 0.44, 0.14, 16);
    const mat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.9, roughness: 0.15 });
    const coin = new THREE.Mesh(geo, mat);
    coin.rotation.x = Math.PI / 2;
    coin.userData = { type: 'coin' };
    return coin;
  }

  private createKeyMesh() {
    const group = new THREE.Group();
    const keyMat = new THREE.MeshStandardMaterial({ 
      color: 0x38bdf8, 
      emissive: 0x0284c7, 
      emissiveIntensity: 0.6, 
      metalness: 0.9, 
      roughness: 0.1 
    });
    
    // Ring head
    const ringGeo = new THREE.TorusGeometry(0.35, 0.08, 12, 24);
    const ring = new THREE.Mesh(ringGeo, keyMat);
    ring.position.y = 0.55;
    
    // Stem
    const stemGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.85, 12);
    const stem = new THREE.Mesh(stemGeo, keyMat);
    stem.position.y = 0.05;
    
    // Teeth
    const tooth1 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.08), keyMat);
    tooth1.position.set(0.11, -0.2, 0);
    const tooth2 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.08), keyMat);
    tooth2.position.set(0.09, -0.32, 0);
    
    // Glowing halo
    const glowGeo = new THREE.SphereGeometry(0.65, 10, 10);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.35 });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    
    group.add(ring, stem, tooth1, tooth2, glow);
    group.userData = { type: 'key' };
    return group;
  }

  private createMysteryBox() {
    const group = new THREE.Group();
    // 1. Purple gift cube with gold trim
    const geo = new THREE.BoxGeometry(0.95, 0.95, 0.95);
    const mat = new THREE.MeshStandardMaterial({ color: 0x9333ea, roughness: 0.3, metalness: 0.3 });
    const box = new THREE.Mesh(geo, mat);

    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.9, roughness: 0.1 });
    
    // Golden Ribbons wrapping around all 4 sides
    const ribbonV = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.98, 0.22), goldMat);
    const ribbonH = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.98, 0.98), goldMat);
    
    // Golden Question Mark '?' 3D glyph on front and back
    const qTopGeo = new THREE.TorusGeometry(0.18, 0.05, 8, 16, Math.PI * 1.3);
    const qTopF = new THREE.Mesh(qTopGeo, goldMat);
    qTopF.position.set(0, 0.15, 0.50);
    const qDotF = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), goldMat);
    qDotF.position.set(0, -0.22, 0.50);

    const qTopB = new THREE.Mesh(qTopGeo, goldMat);
    qTopB.position.set(0, 0.15, -0.50);
    qTopB.rotation.y = Math.PI;
    const qDotB = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), goldMat);
    qDotB.position.set(0, -0.22, -0.50);

    // Glowing Halo
    const haloMat = new THREE.MeshBasicMaterial({ color: 0xc084fc, transparent: true, opacity: 0.35 });
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.85, 10, 10), haloMat);

    group.add(box, ribbonV, ribbonH, qTopF, qDotF, qTopB, qDotB, halo);
    group.userData = { type: 'mystery_box', baseY: 1.4 };
    return group;
  }

  private openMysteryBox() {
    const rewards = [
      { type: 'coins', amount: Math.floor(Math.random() * 300) + 150, text: 'عملة ذهبية 🪙' },
      { type: 'keys', amount: 1, text: 'مفتاح ذهبي 🔑' },
      { type: 'coins', amount: 500, text: 'كنز ذهبي ضخم 💰' }
    ];
    const picked = rewards[Math.floor(Math.random() * rewards.length)];
    if (picked.type === 'coins') {
      this.coins += picked.amount;
      this.totalCoins += picked.amount;
      this.showBanner(`🎁 صندوق المفاجآت: +${picked.amount} ${picked.text}!`);
    } else {
      this.totalKeys += picked.amount;
      this.showBanner(`🎁 صندوق المفاجآت: +${picked.amount} ${picked.text}!`);
    }
    this.savePersistedData();
    this.playPowerupSound();
  }

  private createPowerupMesh(pType: string) {
    const group = new THREE.Group();

    if (pType === 'magnet') {
      // 🧲 Iconic Ultra-Detailed Red & Silver Horseshoe Magnet (مغناطيس العملات الخارق)
      const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.25, metalness: 0.2 });
      const silverMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.95, roughness: 0.05 });
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.9, roughness: 0.15 });
      const sparkMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

      // Curved Red Horseshoe main body (arch)
      const bodyGeo = new THREE.TorusGeometry(0.55, 0.15, 16, 28, Math.PI);
      const magnetBody = new THREE.Mesh(bodyGeo, redMat);
      magnetBody.rotation.z = Math.PI; // Opening upwards

      // Silver Pole Tips on Left & Right with gold isolation rings
      const tipL = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.32, 16), silverMat);
      tipL.position.set(-0.55, 0.16, 0);
      const ringL = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.03, 8, 16), goldMat);
      ringL.position.set(-0.55, 0.02, 0);
      ringL.rotation.x = Math.PI / 2;

      const tipR = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.32, 16), silverMat);
      tipR.position.set(0.55, 0.16, 0);
      const ringR = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.03, 8, 16), goldMat);
      ringR.position.set(0.55, 0.02, 0);
      ringR.rotation.x = Math.PI / 2;

      // Central Golden Coin floating between the magnetic poles
      const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.08, 16), goldMat);
      coin.position.set(0, 0.18, 0);
      coin.rotation.x = Math.PI / 2;

      // Magnetic Blue Spark Arc bridging the poles
      const spark = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.035, 6, 16, Math.PI), sparkMat);
      spark.position.set(0, 0.3, 0);

      // Pulsing Cyan Flux Rings hovering above tips
      const fluxL = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 8, 16), sparkMat);
      fluxL.position.set(-0.55, 0.38, 0);
      fluxL.rotation.x = Math.PI / 2;

      const fluxR = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 8, 16), sparkMat);
      fluxR.position.set(0.55, 0.38, 0);
      fluxR.rotation.x = Math.PI / 2;

      // Glowing Aura Spheres
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 12), new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.28 }));

      group.add(magnetBody, tipL, ringL, tipR, ringR, coin, spark, fluxL, fluxR, glow);
    } else if (pType === 'multiplier') {
      // ⭐ 2X Multiplier Golden Star with Glowing '2X' Badge
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.9, roughness: 0.15 });
      const cyanMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.2 });

      // 5-Pointed Star Shape
      const starCenter = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.2, 16), goldMat);
      group.add(starCenter);

      for (let i = 0; i < 5; i++) {
        const angle = (i * 2 * Math.PI) / 5;
        const pt = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.55, 4), goldMat);
        pt.position.set(Math.sin(angle) * 0.45, Math.cos(angle) * 0.45, 0);
        pt.rotation.z = -angle;
        group.add(pt);
      }

      // '2X' Center Badge (Double embossed disks)
      const badge = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.26, 16), cyanMat);
      badge.rotation.x = Math.PI / 2;
      group.add(badge);

      // Orbiting Golden Energy Rings
      const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.04, 8, 24), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
      const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.04, 8, 24), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
      ring1.rotation.x = Math.PI / 3;
      ring2.rotation.y = Math.PI / 3;
      group.add(ring1, ring2);
    } else if (pType === 'sneakers') {
      // 👟 Super Spring-Loaded Winged High-Top Sneaker
      const greenMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.4 });
      const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.85, roughness: 0.2 });

      // Shoe body
      const sole = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.15, 0.9), whiteMat);
      sole.position.y = 0.08;
      const upper = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.35, 0.8), greenMat);
      upper.position.set(0, 0.28, 0.05);
      const ankle = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.35, 0.4), greenMat);
      ankle.position.set(0, 0.55, -0.15);

      // Golden Spring Coil underneath!
      const spring = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.4, 12), goldMat);
      spring.position.y = -0.22;

      // Hermes Angel Wings on both sides
      const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.5), whiteMat);
      wingL.position.set(-0.25, 0.45, -0.1);
      wingL.rotation.z = 0.35;
      const wingR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.5), whiteMat);
      wingR.position.set(0.25, 0.45, -0.1);
      wingR.rotation.z = -0.35;

      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.85, 10, 10), new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.25 }));

      group.add(sole, upper, ankle, spring, wingL, wingR, glow);
    } else if (pType === 'hoverboard') {
      // 🛹 High-Tech Cyber Aerodynamic Hoverboard (لوح التزلج النفاث الخارق)
      const deckMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.25, metalness: 0.6 });
      const carbonMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 });
      const neonCyanMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
      const goldStripeMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.9, roughness: 0.1 });
      const plasmaFlameMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

      // 1. Aerodynamic Main Deck Shell
      const deckGeo = new THREE.BoxGeometry(0.72, 0.10, 1.6);
      const deck = new THREE.Mesh(deckGeo, deckMat);
      group.add(deck);

      // Top Carbon Grip Traction Pad
      const gripPad = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.04, 1.3), carbonMat);
      gripPad.position.y = 0.06;
      deck.add(gripPad);

      // Center Gold Racing Stripe
      const racingStripe = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 1.4), goldStripeMat);
      racingStripe.position.y = 0.06;
      deck.add(racingStripe);

      // 2. Full Perimeter Neon LED Light Strip
      const neonRim = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.04, 1.66), neonCyanMat);
      neonRim.position.y = -0.02;
      group.add(neonRim);

      // 3. Dual Anti-Gravity Plasma Thrusters Underneath
      [-0.24, 0.24].forEach(tx => {
        const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.28, 12), carbonMat);
        housing.position.set(tx, -0.15, -0.4);

        const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.13, 0.1, 12), goldStripeMat);
        nozzle.position.set(0, -0.16, 0);
        housing.add(nozzle);

        // Glowing Blue Plasma Exhaust Cone
        const flame = new THREE.Mesh(new THREE.ConeGeometry(0.10, 0.35, 10), plasmaFlameMat);
        flame.rotation.x = Math.PI;
        flame.position.set(0, -0.32, 0);
        housing.add(flame);

        group.add(housing);
      });

      // 4. Anti-Gravity Hover Field Ring Underneath
      const hoverField = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.03, 8, 20), neonCyanMat);
      hoverField.position.set(0, -0.22, 0);
      hoverField.rotation.x = Math.PI / 2;
      group.add(hoverField);

      // Glowing Ambient Halo
      const halo = new THREE.Mesh(new THREE.SphereGeometry(0.95, 12, 12), new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.26 }));
      group.add(halo);
    } else {
      // 🚀 Pharaoh Horus Rocket Jetpack
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.9, roughness: 0.15 });
      const flameMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

      [-0.28, 0.28].forEach(ox => {
        const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.9, 12), goldMat);
        cyl.position.x = ox;
        const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.2, 12), goldMat);
        nozzle.position.set(ox, -0.55, 0);
        const flame = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.45, 10), flameMat);
        flame.rotation.x = Math.PI;
        flame.position.set(ox, -0.85, 0);
        group.add(cyl, nozzle, flame);
      });

      // Eagle wings
      const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.28, 0.05), goldMat);
      wingL.position.set(-0.6, 0.15, 0);
      wingL.rotation.z = 0.25;
      const wingR = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.28, 0.05), goldMat);
      wingR.position.set(0.6, 0.15, 0);
      wingR.rotation.z = -0.25;

      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.95, 10, 10), new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.3 }));

      group.add(wingL, wingR, glow);
    }

    group.userData = { type: 'powerup', pType, baseY: 1.4 };
    return group;
  }

  private createCairoMetroTrain(isMoving: boolean = false, speed: number = 0, hasRamp: boolean = false) {
    const group = new THREE.Group();
    const length = 28;
    const height = 4.3;
    const width = 2.85;

    // --- Materials Palette for High-Realism Train ---
    const bodyMat = new THREE.MeshStandardMaterial({ 
      color: isMoving ? 0x0284c7 : 0x0891b2, 
      roughness: 0.35, 
      metalness: 0.45 
    });
    const undercarriageMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
    const wheelSteelMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9, roughness: 0.15 });
    const chromeHubMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.95, roughness: 0.05 });
    const coralStripeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.4 });
    const goldBandMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.85, roughness: 0.2 });
    const windowGlassMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, metalness: 0.9, emissive: 0x0284c7, emissiveIntensity: 0.4 });
    const windowFrameMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
    const doorMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.75, roughness: 0.25 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
    const hvacMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.4 });
    const xenonLightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const redMarkerMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const darkGlassMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.1, metalness: 0.9 });

    // 1. Main Train Body Shell
    const bodyGeo = new THREE.BoxGeometry(width, height - 0.7, length);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = height / 2 + 0.35;
    group.add(body);

    // Aerodynamic Curved Roof
    const roofGeo = new THREE.CylinderGeometry(width / 2, width / 2, length, 16, 1, false, 0, Math.PI);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.rotation.x = Math.PI / 2;
    roof.rotation.z = Math.PI;
    roof.position.set(0, height, 0);
    group.add(roof);

    // Corrugated Roof Ribs (Sleek aerodynamic longitudinal lines)
    [-0.8, -0.4, 0, 0.4, 0.8].forEach(rx => {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, length - 1), goldBandMat);
      rib.position.set(rx, height + (width / 2) * Math.cos(rx / 1.5) - 0.25, 0);
      group.add(rib);
    });

    // 2. Rooftop HVAC Climate Units & Ventilation Pods
    [-length / 4, length / 4].forEach(hz => {
      const hvac = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.45, 3.8), hvacMat);
      hvac.position.set(0, height + 0.35, hz);
      
      // Fan grills on top of HVAC
      [-1.0, 1.0].forEach(fz => {
        const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.08, 12), undercarriageMat);
        fan.position.set(0, 0.25, fz);
        hvac.add(fan);
      });
      group.add(hvac);
    });

    // High-Voltage Electrical Roof Conduit
    const conduit = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, length - 4, 8), chromeHubMat);
    conduit.rotation.x = Math.PI / 2;
    conduit.position.set(0.95, height + 0.15, 0);
    group.add(conduit);

    // 3. Side Racing Stripes & Coach Livery
    const sideStripeL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, length), coralStripeMat);
    sideStripeL.position.set(-width / 2 - 0.02, height / 2 + 0.1, 0);
    const sideStripeR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, length), coralStripeMat);
    sideStripeR.position.set(width / 2 + 0.02, height / 2 + 0.1, 0);

    const bottomGoldL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, length), goldBandMat);
    bottomGoldL.position.set(-width / 2 - 0.02, 1.0, 0);
    const bottomGoldR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, length), goldBandMat);
    bottomGoldR.position.set(width / 2 + 0.02, 1.0, 0);
    group.add(sideStripeL, sideStripeR, bottomGoldL, bottomGoldR);

    // 4. Detailed Passenger Windows & Bi-fold Doors (Both sides)
    for (let wz = -length / 2 + 3.2; wz <= length / 2 - 3.2; wz += 3.4) {
      const isDoorBay = Math.abs(wz) < 2.0;

      if (isDoorBay) {
        // Bi-fold Passenger Sliding Doors
        [-width / 2 - 0.03, width / 2 + 0.03].forEach(dx => {
          const door = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.6, 1.8), doorMat);
          door.position.set(dx, 2.0, wz);

          // Door window glass
          const doorWin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 0.6), windowGlassMat);
          doorWin.position.set(0, 0.4, 0);
          door.add(doorWin);
          group.add(door);
        });
      } else {
        // Passenger Window with Frame
        [-width / 2 - 0.03, width / 2 + 0.03].forEach(wx => {
          const frame = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.35, 1.8), windowFrameMat);
          frame.position.set(wx, 2.7, wz);

          const glass = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.15, 1.6), windowGlassMat);
          glass.position.set(0, 0, 0);
          frame.add(glass);
          group.add(frame);
        });
      }
    }

    // 5. Undercarriage Bogies & Steel Flanged Wheels
    [-length / 3.2, length / 3.2].forEach(bz => {
      const bogie = new THREE.Group();
      bogie.position.set(0, 0.4, bz);

      // Cast iron bogie frame
      const frame = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.35, 3.8), undercarriageMat);
      bogie.add(frame);

      // 4 Steel Disc Wheels per bogie (Total 8 wheels per car)
      [-0.95, 0.95].forEach(wx => {
        [-1.3, 1.3].forEach(wz => {
          const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.18, 16), wheelSteelMat);
          wheel.rotation.z = Math.PI / 2;
          wheel.position.set(wx, 0, wz);

          const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.22, 12), chromeHubMat);
          hub.rotation.z = Math.PI / 2;
          wheel.add(hub);

          bogie.add(wheel);
        });
      });

      // Center suspension pivot
      const pivot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.4, 10), undercarriageMat);
      pivot.position.y = 0.25;
      bogie.add(pivot);

      group.add(bogie);
    });

    // 6. Front Nose Cab / Ramp
    if (hasRamp) {
      // High-Detail Teak Boardwalk Loading Ramp (9 units long)
      const rampLengthZ = 9.0;
      const angle = Math.atan2(height, rampLengthZ);
      const hypotenuse = Math.sqrt(height * height + rampLengthZ * rampLengthZ);

      // Teak Wood Plank with non-slip safety trims
      const rampMat = new THREE.MeshLambertMaterial({ color: 0x92400e });
      const rampPlank = new THREE.Mesh(new THREE.BoxGeometry(width - 0.1, 0.22, hypotenuse), rampMat);
      rampPlank.position.set(0, height / 2, length / 2 + (rampLengthZ / 2));
      rampPlank.rotation.x = angle;
      group.add(rampPlank);

      // Non-slip yellow tread lines along the ramp
      for (let s = -hypotenuse / 2 + 1; s < hypotenuse / 2 - 1; s += 1.5) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(width - 0.3, 0.25, 0.15), goldBandMat);
        step.position.set(0, height / 2 + (s * Math.sin(angle)), length / 2 + (rampLengthZ / 2) + (s * Math.cos(angle)));
        step.rotation.x = angle;
        group.add(step);
      }

      // Illuminated safety guide railings
      const railCyanMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, metalness: 0.8 });
      [-width / 2 + 0.05, width / 2 - 0.05].forEach(rx => {
        const handrail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.45, hypotenuse), railCyanMat);
        handrail.position.set(rx, height / 2, length / 2 + (rampLengthZ / 2));
        handrail.rotation.x = angle;
        group.add(handrail);
      });

      // Heavy triangular support truss
      const truss = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.2, 0.4), undercarriageMat);
      truss.position.set(0, 1.1, length / 2 + 4.5);
      group.add(truss);
    } else {
      // Aerodynamic Sloped Driver Cabin
      const cabNose = new THREE.Mesh(new THREE.BoxGeometry(width * 0.94, 2.0, 1.6), bodyMat);
      cabNose.position.set(0, 2.5, length / 2 + 0.3);
      cabNose.rotation.x = -0.26;
      group.add(cabNose);

      // Wide Panoramic Tinted Windshield
      const windshield = new THREE.Mesh(new THREE.BoxGeometry(width * 0.82, 1.3, 0.1), darkGlassMat);
      windshield.position.set(0, 2.85, length / 2 + 0.95);
      windshield.rotation.x = -0.26;
      group.add(windshield);

      // Dual Windshield Wipers
      [-0.45, 0.45].forEach(wix => {
        const wiper = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.6, 0.04), undercarriageMat);
        wiper.position.set(wix, 2.7, length / 2 + 1.02);
        wiper.rotation.z = 0.3;
        wiper.rotation.x = -0.26;
        group.add(wiper);
      });

      // Heavy-Duty Steel Cowcatcher / Pilot Bumper with Hazard Stripes
      const bumper = new THREE.Mesh(new THREE.BoxGeometry(width + 0.15, 0.7, 0.6), undercarriageMat);
      bumper.position.set(0, 0.55, length / 2 + 0.5);
      
      const hazardPlate = new THREE.Mesh(new THREE.BoxGeometry(width, 0.45, 0.06), goldBandMat);
      hazardPlate.position.set(0, 0, 0.32);
      bumper.add(hazardPlate);
      group.add(bumper);

      // Heavy Knuckle Train Coupler in center
      const coupler = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 0.8), chromeHubMat);
      coupler.position.set(0, 0.55, length / 2 + 0.9);
      group.add(coupler);

      // Dual High-Power Xenon Headlights with Chrome Rings
      [-0.85, 0.85].forEach(lx => {
        const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.1, 12), chromeHubMat);
        bezel.rotation.x = Math.PI / 2;
        bezel.position.set(lx, 1.45, length / 2 + 0.45);

        const lens = new THREE.Mesh(new THREE.SphereGeometry(0.20, 10, 10), xenonLightMat);
        lens.position.set(0, 0.06, 0);
        bezel.add(lens);
        group.add(bezel);
      });

      // Dual Top Red Marker Lights
      [-0.95, 0.95].forEach(rx => {
        const redLed = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), redMarkerMat);
        redLed.position.set(rx, 3.8, length / 2 + 0.35);
        group.add(redLed);
      });

      // Digital LED Destination Display: "قطار الشاطئ السريع 🏖️🏄‍♂️"
      const boardCanvas = document.createElement('canvas');
      boardCanvas.width = 256;
      boardCanvas.height = 64;
      const ctx = boardCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#082f49';
        ctx.fillRect(0, 0, 256, 64);
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#facc15';
        ctx.strokeRect(2, 2, 252, 60);
        ctx.fillStyle = '#fde047';
        ctx.font = 'bold 22px Cairo, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('قطار الشاطئ السريع 🏖️🏄‍♂️', 128, 42);
      }
      const tex = new THREE.CanvasTexture(boardCanvas);
      const destMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 0.6), new THREE.MeshBasicMaterial({ map: tex }));
      destMesh.position.set(0, 3.55, length / 2 + 0.38);
      group.add(destMesh);
    }

    group.userData = { type: 'train', length, height, isMoving, speed, hasRamp };
    return group;
  }

  private createBarrier(isSlideBarrier: boolean) {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x92400e });
    const bambooMat = new THREE.MeshLambertMaterial({ color: 0xca8a04 });
    const redMat = new THREE.MeshLambertMaterial({ color: 0xef4444 });
    const whiteMat = new THREE.MeshLambertMaterial({ color: 0xffffff });

    if (isSlideBarrier) {
      // High Tropical Driftwood Arch to slide under
      const barGeo = new THREE.BoxGeometry(3.0, 0.45, 0.2);
      const bar = new THREE.Mesh(barGeo, woodMat);
      bar.position.set(0, 2.2, 0);
      group.add(bar);

      // Warning hazard stripes
      const stripeGeo = new THREE.BoxGeometry(2.8, 0.2, 0.24);
      const stripe = new THREE.Mesh(stripeGeo, redMat);
      stripe.position.set(0, 2.2, 0);
      group.add(stripe);

      const pL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.4, 0.25), bambooMat);
      pL.position.set(-1.4, 1.2, 0);
      const pR = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.4, 0.25), bambooMat);
      pR.position.set(1.4, 1.2, 0);
      group.add(pL, pR);

      group.userData = { type: 'barrier_slide' };
    } else {
      // Low Tropical Bamboo Hurdle with Red/White Lifebuoy to jump over
      const hurdleGeo = new THREE.BoxGeometry(3.0, 0.85, 0.25);
      const hurdle = new THREE.Mesh(hurdleGeo, bambooMat);
      hurdle.position.set(0, 0.45, 0);

      // Lifebuoy in center of hurdle
      const buoy = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.09, 8, 16), redMat);
      buoy.position.set(0, 0.45, 0.15);
      const buoyRing = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.2), whiteMat);
      buoyRing.position.set(0, 0.45, 0.15);

      group.add(hurdle, buoy, buoyRing);
      group.userData = { type: 'barrier_jump' };
    }
    return group;
  }

  // --- Coins and Keys Helper Spawners ---
  private spawnCoinLine(lane: number, startZ: number, count: number, spacing: number = 3.0, height: number = 1.0) {
    for (let i = 0; i < count; i++) {
      const coin = this.createGoldCoin();
      coin.position.set(this.LANES[lane], height, startZ - i * spacing);
      this.scene.add(coin);
      this.worldObjects.push(coin);
    }
  }

  private spawnCoinArc(lane: number, startZ: number, count: number = 5, spacing: number = 3.0, peakHeight: number = 3.2, baseHeight: number = 1.0) {
    for (let i = 0; i < count; i++) {
      const coin = this.createGoldCoin();
      const progress = i / (count - 1);
      const cy = baseHeight + Math.sin(progress * Math.PI) * (peakHeight - baseHeight);
      coin.position.set(this.LANES[lane], cy, startZ - i * spacing);
      this.scene.add(coin);
      this.worldObjects.push(coin);
    }
  }

  private spawnKeyPickup(lane: number, z: number, y: number = 1.6) {
    const key = this.createKeyMesh();
    key.position.set(this.LANES[lane], y, z);
    this.scene.add(key);
    this.worldObjects.push(key);
  }

  // --- Structured Train & Obstacle Pattern Spawner ---
  private patternSequence = 0;

  private spawnWorldSegment() {
    const z = this.nextSpawnZ;
    const patternType = this.patternSequence % 8;
    this.patternSequence++;

    switch (patternType) {
      case 0: {
        // Pattern 0: Open Sprint & Golden Coin Waves (ممر مفتوح ومريح لجمع العملات)
        for (let l = 0; l < 3; l++) {
          this.spawnCoinLine(l, z + 6, 4, 3.0, 1.0);
        }
        if (Math.random() < 0.6) {
          const box = this.createMysteryBox();
          box.position.set(this.LANES[1], 1.2, z - 8);
          this.scene.add(box);
          this.worldObjects.push(box);
        } else {
          this.spawnKeyPickup(1, z - 8, 1.5);
        }
        this.nextSpawnZ -= 38;
        break;
      }

      case 1: {
        // Pattern 1: Stationary Train with Ramp & Rooftop Coins (قطار ثابت واحد مع ممر صعود سلس)
        const tLane = Math.random() < 0.5 ? 0 : 2;
        const otherLane = 1;
        const train = this.createCairoMetroTrain(false, 0, true);
        train.position.set(this.LANES[tLane], 0, z - 12);
        this.scene.add(train);
        this.worldObjects.push(train);

        // Smooth coin line up the ramp onto the roof
        this.spawnCoinArc(tLane, z + 10, 4, 2.8, 4.4, 0.8);
        this.spawnCoinLine(tLane, z - 2, 5, 3.0, 4.8);

        // Center lane has open coin line and low hurdle
        const hurdle = this.createBarrier(false);
        hurdle.position.set(this.LANES[otherLane], 0, z);
        this.scene.add(hurdle);
        this.worldObjects.push(hurdle);
        this.spawnCoinArc(otherLane, z + 6, 5, 2.5, 3.0);

        this.nextSpawnZ -= 48;
        break;
      }

      case 2: {
        // Pattern 2: Parkour Hurdle & Slide Duo (حواجز كلاسيكية خفيفة بدون قطارات)
        const hurdle = this.createBarrier(false);
        hurdle.position.set(this.LANES[1], 0, z + 4);
        this.scene.add(hurdle);
        this.worldObjects.push(hurdle);
        this.spawnCoinArc(1, z + 10, 5, 2.5, 3.0);

        const slideBarrier = this.createBarrier(true);
        slideBarrier.position.set(this.LANES[0], 0, z - 10);
        this.scene.add(slideBarrier);
        this.worldObjects.push(slideBarrier);
        this.spawnCoinLine(0, z - 6, 4, 2.5, 0.4);

        // Safe right lane with coins
        this.spawnCoinLine(2, z + 8, 6, 3.0, 1.0);

        this.nextSpawnZ -= 42;
        break;
      }

      case 3: {
        // Pattern 3: Gentle Oncoming Train in one side lane (قطار هادئ قادم في مسار جانبي واحد)
        const tLane = Math.random() < 0.5 ? 0 : 2;
        const train = this.createCairoMetroTrain(true, 9.5, false); // Gentle speed for great reaction time
        train.position.set(this.LANES[tLane], 0, z - 28);
        this.scene.add(train);
        this.worldObjects.push(train);

        // Center and other side are wide open with coin streaks and power-up
        this.spawnCoinLine(1, z + 4, 7, 3.0, 1.0);
        const pType = this.powerupKeys[Math.floor(Math.random() * this.powerupKeys.length)];
        const powerup = this.createPowerupMesh(pType);
        powerup.position.set(this.LANES[1], 1.4, z - 8);
        this.scene.add(powerup);
        this.worldObjects.push(powerup);

        this.nextSpawnZ -= 46;
        break;
      }

      case 4: {
        // Pattern 4: Pharaoh Super Gold Rush (طوفان العملات الذهبية المفتوح)
        for (let l = 0; l < 3; l++) {
          this.spawnCoinLine(l, z + 4, 5, 2.8, 1.0);
        }
        this.spawnKeyPickup(1, z - 10, 1.5);
        this.nextSpawnZ -= 38;
        break;
      }

      case 5: {
        // Pattern 5: High Floating Key Challenge (تحدي المفتاح المرتفع 🔑)
        const hurdle = this.createBarrier(false);
        hurdle.position.set(this.LANES[1], 0, z);
        this.scene.add(hurdle);
        this.worldObjects.push(hurdle);

        this.spawnCoinArc(1, z + 6, 4, 2.5, 2.6);
        this.spawnKeyPickup(1, z, 3.0); // High Key over hurdle!
        this.spawnCoinLine(1, z - 6, 3, 2.5, 1.0);

        // Side lanes open with coins
        this.spawnCoinLine(0, z + 4, 4, 3.0, 1.0);
        this.spawnCoinLine(2, z + 4, 4, 3.0, 1.0);

        this.nextSpawnZ -= 40;
        break;
      }

      case 6: {
        // Pattern 6: Spaced Double Train Canyon (قطاران ثابتان على الجوانب وممر أوسط آمن ومفتوح)
        const trainL = this.createCairoMetroTrain(false, 0, false);
        trainL.position.set(this.LANES[0], 0, z - 12);
        this.scene.add(trainL);
        this.worldObjects.push(trainL);

        const trainR = this.createCairoMetroTrain(false, 0, false);
        trainR.position.set(this.LANES[2], 0, z - 12);
        this.scene.add(trainR);
        this.worldObjects.push(trainR);

        // Safe, clear center lane packed with coins and Key
        this.spawnCoinLine(1, z + 6, 4, 2.8, 1.0);
        this.spawnKeyPickup(1, z - 6, 1.5);
        this.spawnCoinLine(1, z - 10, 4, 2.8, 1.0);

        this.nextSpawnZ -= 50;
        break;
      }

      case 7:
      default: {
        // Pattern 7: Open Track Speedway with Mystery Box
        this.spawnCoinLine(0, z + 4, 5, 3.0, 1.0);
        this.spawnCoinLine(2, z + 4, 5, 3.0, 1.0);
        const box = this.createMysteryBox();
        box.position.set(this.LANES[1], 1.2, z);
        this.scene.add(box);
        this.worldObjects.push(box);

        const hurdle = this.createBarrier(false);
        hurdle.position.set(this.LANES[2], 0, z - 10);
        this.scene.add(hurdle);
        this.worldObjects.push(hurdle);

        this.nextSpawnZ -= 38;
        break;
      }
    }
  }

  // --- Animation Loop ---
  private animate = () => {
    this.animationFrameId = requestAnimationFrame(this.animate);
    const dt = Math.min(this.clock.getDelta(), 0.1);

    try {
      if (this.gameState === 'PLAYING') {
        this.updateGame(dt);
      } else if (this.gameState === 'INTRO_IDLE') {
        this.updateIntroIdle(dt);
      } else if (this.gameState === 'GAMEOVER' || this.gameState === 'SAVEME') {
        this.updateGameOverScene(dt);
      }

      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    } catch (err) {
      console.error('SubwaySurfers render loop error:', err);
    }
  };

  private updateIntroIdle(dt: number) {
    if (this.runner) {
      this.runner.sprayCan.rotation.y += dt * 3.0;
    }
  }

  private updateGameOverScene(dt: number) {
    if (!this.runner) return;
    const t = Date.now() * 0.001;

    // 1. Cinematic dynamic elevated camera framing Jake, Inspector, and the sunny beach background
    const targetCamX = this.runner.root.position.x;
    const targetCamY = 4.2 + Math.sin(t * 1.5) * 0.06;
    const targetCamZ = this.runner.root.position.z + 7.0;
    this.camera.position.x += (targetCamX - this.camera.position.x) * 6.0 * dt;
    this.camera.position.y += (targetCamY - this.camera.position.y) * 6.0 * dt;
    this.camera.position.z += (targetCamZ - this.camera.position.z) * 6.0 * dt;
    this.camera.lookAt(this.runner.root.position.x * 0.5, 1.4, this.runner.root.position.z - 15.0);

    // 2. Jake Sitting Exhausted on the track ties facing forward
    this.runner.root.position.y = 0.1;
    this.runner.root.rotation.y = 0;
    this.runner.leftLegGroup.rotation.x = 0.85;
    this.runner.rightLegGroup.rotation.x = 0.85;
    this.runner.leftLegGroup.rotation.z = -0.15;
    this.runner.rightLegGroup.rotation.z = 0.15;

    // 3. Heavy panting and exhausted breathing cycle
    const panting = Math.sin(t * 4.2);
    this.runner.bodyGroup.position.y = panting * 0.05;
    this.runner.torsoGroup.rotation.x = 0.15 + panting * 0.05;

    // 4. Holding his head with right hand & rubbing head from the crash
    this.runner.rightArmGroup.rotation.x = -1.6 + Math.sin(t * 2.0) * 0.06;
    this.runner.rightArmGroup.rotation.z = -0.4;
    this.runner.leftArmGroup.rotation.x = 0.4;

    // 5. Looking left and right with dizzy head wobble
    this.runner.headGroup.rotation.y = Math.sin(t * 1.4) * 0.35;
    this.runner.headGroup.rotation.x = 0.1 + panting * 0.04;

    // 6. Police Inspector & Dog standing beside Jake looking triumphant
    if (this.inspector) {
      this.inspector.root.position.set(this.runner.root.position.x + 2.0, 0, this.runner.root.position.z + 1.2);
      this.inspector.root.lookAt(this.runner.root.position.x, 0.5, this.runner.root.position.z - 5.0);
      this.inspector.head.rotation.y = Math.sin(t * 1.1) * 0.12;
      this.inspector.dog.rotation.y = Math.sin(t * 2.5) * 0.15;
    }
  }

  private updateGame(dt: number) {
    // 50% Balanced Arcade/Realistic Speed Curve (Starts comfortably at 14.0 m/s ~50 km/h, scales smoothly to 24.0 m/s)
    const baseSpeed = 14.0 + Math.min(10.0, (this.score / 5000) * 2.0);
    const moveZ = baseSpeed * dt;

    this.score += Math.round(moveZ * this.scoreMultiplier);
    this.trackMission('distance', Math.round(moveZ));

    // Invulnerability shield timer countdown
    if (this.invulnerabilityTimer > 0) {
      this.invulnerabilityTimer -= dt;
      if (this.invulnerabilityTimer < 0) this.invulnerabilityTimer = 0;
    }

    // Power-up Timer Countdown
    this.powerupKeys.forEach(k => {
      if (this.powerups[k]?.active) {
        this.powerups[k].timer -= dt;
        if (this.powerups[k].timer <= 0) {
          this.powerups[k].active = false;
          if (k === 'hoverboard') this.runner.hoverboard.visible = false;
        }
      }
    });

    // Inspector Cooldowns in 2P Mode
    if (this.copBoostCd > 0) this.copBoostCd = Math.max(0, Math.round((this.copBoostCd - dt) * 10) / 10);
    if (this.copTrapCd > 0) this.copTrapCd = Math.max(0, Math.round((this.copTrapCd - dt) * 10) / 10);
    if (this.copDogCd > 0) this.copDogCd = Math.max(0, Math.round((this.copDogCd - dt) * 10) / 10);

    // 100% Realistic Lateral Spring Inertia & Momentum Physics
    const targetX = this.runner.targetX;
    const currentX = this.runner.root.position.x;
    this.runner.vx = (this.runner.vx || 0) + (targetX - currentX) * 55.0 * dt - (this.runner.vx || 0) * 12.0 * dt;
    this.runner.root.position.x += this.runner.vx * dt;

    // Runner Jump & Slide Physics
    if (this.runner.isSliding) {
      this.runner.slideTimer -= dt;
      if (this.runner.slideTimer <= 0) {
        this.runner.isSliding = false;
      }
    }

    // 1. Calculate Ground Surface Height Under Player Feet (Ramps, Train Rooftops, Tracks)
    let targetGroundY = 0;
    const rx = this.runner.root.position.x;
    const rz = this.runner.root.position.z;

    for (let i = 0; i < this.worldObjects.length; i++) {
      const obj = this.worldObjects[i];
      if (obj.userData['type'] === 'train') {
        const ox = obj.position.x;
        const oz = obj.position.z;
        const halfLen = (obj.userData['length'] as number) / 2;
        const height = (obj.userData['height'] as number) || 4.2;
        const hasRamp = !!obj.userData['hasRamp'];

        if (Math.abs(rx - ox) < 1.35) {
          const rampLengthZ = 9.0;
          // Front ramp area: smooth elevation from track floor up to rooftop
          if (hasRamp && rz <= (oz + halfLen + rampLengthZ + 0.8) && rz >= (oz + halfLen)) {
            const rampProgress = THREE.MathUtils.clamp(((oz + halfLen + rampLengthZ) - rz) / rampLengthZ, 0, 1);
            targetGroundY = Math.max(targetGroundY, rampProgress * (height + 0.25));
          } else if (rz < (oz + halfLen) && rz > (oz - halfLen - 0.5)) {
            // Rooftop area: strictly ONLY allowed if player came up via ramp or is already jumping across rooftops
            if (this.runner.y >= (height - 0.8) || (hasRamp && rz >= (oz + halfLen - 1.5))) {
              targetGroundY = Math.max(targetGroundY, height + 0.25);
            }
          }
        }
      }
    }

    // 2. Vertical Movement & 100% Real Scaled Gravity Physics (32 m/s² natural human parabola)
    const gravity = 32.0;
    if (this.powerups['jetpack']?.active) {
      this.runner.pharaohJetpack.visible = true;
      const targetFlightY = 8.5;
      this.runner.y += (targetFlightY - this.runner.y) * 6.0 * dt;
      this.runner.vy = 0;
      this.runner.isJumping = false;
      this.runner.leftWing.rotation.z = 0.25 + Math.sin(Date.now() * 0.015) * 0.25;
      this.runner.rightWing.rotation.z = -0.25 - Math.sin(Date.now() * 0.015) * 0.25;
    } else {
      if (this.runner.pharaohJetpack?.visible) {
        this.runner.pharaohJetpack.visible = false;
      }

      if (this.runner.isJumping) {
        // Player is actively jumping
        this.runner.y += this.runner.vy * dt;
        this.runner.vy -= gravity * dt;

        // Land on ground or train roof when falling with natural landing dampening
        if (this.runner.vy <= 0 && this.runner.y <= targetGroundY) {
          this.runner.y = targetGroundY;
          this.runner.vy = 0;
          this.runner.isJumping = false;
        }
      } else {
        // Player is not jumping: check if walking, ascending ramp, or falling off
        if (this.runner.y > targetGroundY + 0.05) {
          // Stepped off train roof or ramp into the open air -> Apply natural falling gravity
          this.runner.vy -= gravity * dt;
          this.runner.y += this.runner.vy * dt;
          if (this.runner.y <= targetGroundY) {
            this.runner.y = targetGroundY;
            this.runner.vy = 0;
          }
        } else if (this.runner.y < targetGroundY) {
          // Ascending ramp onto train roof
          this.runner.y += (targetGroundY - this.runner.y) * 16.0 * dt;
          if (Math.abs(this.runner.y - targetGroundY) < 0.05) {
            this.runner.y = targetGroundY;
          }
          this.runner.vy = 0;
        } else {
          this.runner.y = targetGroundY;
          this.runner.vy = 0;
        }
      }
    }
    this.runner.root.position.y = this.runner.y;

    // Update dynamic ground shadow scaling and opacity based on jump height
    if (this.runner.shadowMesh) {
      const heightAboveGround = Math.max(0, this.runner.y - targetGroundY);
      const shadowScale = THREE.MathUtils.clamp(1.0 - heightAboveGround * 0.12, 0.35, 1.1);
      this.runner.shadowMesh.scale.set(shadowScale, shadowScale, shadowScale);
      this.runner.shadowMesh.material.opacity = THREE.MathUtils.clamp(0.40 - heightAboveGround * 0.06, 0.08, 0.40);
      this.runner.shadowMesh.position.y = targetGroundY + 0.03;
    }

    // Dynamic Character Running & Stride Animation
    const strideFreq = baseSpeed * 1.05;
    this.runnerStridePhase += dt * strideFreq;

    if (this.runner.isSliding) {
      // Dive-Slide Pose (Diving forward under hurdles)
      this.runner.headGroup.rotation.x = 0.2;
      this.runner.bodyGroup.rotation.x = -Math.PI / 2.3;
      this.runner.bodyGroup.rotation.y = 0;
      this.runner.bodyGroup.rotation.z = 0;
      this.runner.bodyGroup.position.y = -0.65;
      this.runner.leftLegGroup.rotation.set(-0.9, 0, 0);
      this.runner.rightLegGroup.rotation.set(-0.9, 0, 0);
      this.runner.leftArmGroup.rotation.set(-1.0, 0, 0);
      this.runner.rightArmGroup.rotation.set(-1.0, 0, 0);
    } else if (this.runner.isJumping) {
      // Jump Pose: Arms up, legs bent back
      this.runner.headGroup.rotation.x = 0;
      this.runner.bodyGroup.rotation.x = 0.15;
      this.runner.bodyGroup.rotation.y = 0;
      this.runner.bodyGroup.rotation.z = 0;
      this.runner.bodyGroup.position.y = 0;
      this.runner.leftArmGroup.rotation.set(1.4, 0, 0);
      this.runner.rightArmGroup.rotation.set(1.4, 0, 0);
      this.runner.leftLegGroup.rotation.set(-0.6, 0, 0);
      this.runner.rightLegGroup.rotation.set(0.3, 0, 0);
    } else if (this.powerups['jetpack']?.active) {
      // 🚀 Superhero / Pharaonic Jetpack True Flight Pose (طيران حقيقي بالصاروخ النفاث في السماء)
      const vx = this.runner.vx || 0;
      const flightHoverBob = Math.sin(Date.now() * 0.007) * 0.05;

      // Aerodynamic Forward Flight Pitch (~45 degrees forward into tunnel) with roll into steering
      this.runner.bodyGroup.rotation.x = -Math.PI / 3.8 + flightHoverBob;
      this.runner.bodyGroup.rotation.z = -vx * 0.045; // Fighter jet roll
      this.runner.bodyGroup.rotation.y = vx * 0.025;
      this.runner.bodyGroup.position.y = 0.15 + flightHoverBob;

      // Head tilted up to face forward while flying into tunnel
      this.runner.headGroup.rotation.x = 0.45;

      // Streamlined straight legs back with slipstream trailing (Facing player +Z)
      this.runner.leftLegGroup.rotation.set(-0.25 + Math.sin(Date.now() * 0.009) * 0.04, 0, 0.08);
      this.runner.rightLegGroup.rotation.set(-0.25 - Math.sin(Date.now() * 0.009) * 0.04, 0, -0.08);

      // Streamlined arms alongside jetpack for aerodynamic steering
      this.runner.leftArmGroup.rotation.set(-0.45 + Math.sin(Date.now() * 0.01) * 0.05, 0, 0.25);
      this.runner.rightArmGroup.rotation.set(-0.45 + Math.sin(Date.now() * 0.01) * 0.05, 0, -0.25);

      // Flapping golden wings
      if (this.runner.leftWing && this.runner.rightWing) {
        this.runner.leftWing.rotation.z = 0.35 + Math.sin(Date.now() * 0.02) * 0.25;
        this.runner.rightWing.rotation.z = -0.35 - Math.sin(Date.now() * 0.02) * 0.25;
      }
    } else if (this.powerups['hoverboard']?.active) {
      // Surfing Pose on Hoverboard
      this.runner.headGroup.rotation.x = 0;
      this.runner.bodyGroup.rotation.x = -0.05;
      this.runner.bodyGroup.rotation.y = 0.4;
      this.runner.bodyGroup.rotation.z = 0;
      this.runner.bodyGroup.position.y = 0;
      this.runner.leftArmGroup.rotation.set(0.4, 0, 0);
      this.runner.rightArmGroup.rotation.set(-0.5, 0, 0);
      this.runner.leftLegGroup.rotation.set(-0.2, 0, 0);
      this.runner.rightLegGroup.rotation.set(0.2, 0, 0);
    } else {
      // Active Sprint Running Pose with 100% Real Banking & Centrifugal Tilt
      const vx = this.runner.vx || 0;
      this.runner.headGroup.rotation.x = 0;
      this.runner.bodyGroup.rotation.x = -0.12 - (baseSpeed / 30.0) * 0.06; // Forward aerodynamic lean into tunnel
      this.runner.bodyGroup.rotation.z = -vx * 0.025; // Organic bank into turns
      this.runner.bodyGroup.rotation.y = vx * 0.015;
      this.runner.bodyGroup.position.y = Math.abs(Math.sin(this.runnerStridePhase * 2)) * 0.10;

      this.runner.leftLegGroup.rotation.set(-Math.sin(this.runnerStridePhase) * 0.85, 0, 0);
      this.runner.rightLegGroup.rotation.set(Math.sin(this.runnerStridePhase) * 0.85, 0, 0);
      this.runner.leftArmGroup.rotation.set(Math.sin(this.runnerStridePhase) * 0.75, 0, 0);
      this.runner.rightArmGroup.rotation.set(-Math.sin(this.runnerStridePhase) * 0.75, 0, 0);
    }

    // Inspector AI Lerp
    if (this.activeMode === 'single') {
      if (Math.random() < 0.03) {
        this.inspector.laneIndex = this.runner.laneIndex;
        this.inspector.targetX = this.LANES[this.inspector.laneIndex];
      }
    }
    this.inspector.root.position.x += (this.inspector.targetX - this.inspector.root.position.x) * 12.0 * dt;
    const targetCopZ = this.runner.root.position.z + (this.chaseDistance * 0.45);
    this.inspector.root.position.z += (targetCopZ - this.inspector.root.position.z) * 4.0 * dt;

    this.copStridePhase += dt * 16.0;
    this.inspector.leftLeg.rotation.x = Math.sin(this.copStridePhase) * 0.65;
    this.inspector.rightLeg.rotation.x = -Math.sin(this.copStridePhase) * 0.65;

    // Chase distance meter recovery
    this.chaseDistance = Math.min(65.0, this.chaseDistance + dt * 1.5);

    // Inspector catch condition if chase distance drops too low
    if (this.chaseDistance <= 2.8 && this.invulnerabilityTimer <= 0) {
      this.handleFatalObstacleHit('👮‍♂️ تم الإمساك بك من الشرطي والكلب!');
      return;
    }

    // Streak Combo Timer
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.streakCombo = 0;
      }
    }

    // Stumble Strike Recovery Timer (6s clean run clears strike 1)
    if (this.stumbleResetTimer > 0) {
      this.stumbleResetTimer -= dt;
      if (this.stumbleResetTimer <= 0) {
        this.stumbleCount = 0;
      }
    }

    // Update World Track Chunks (Infinite scrolling with seamless while-loop wrapping)
    const CHUNK_LENGTH = 60;
    const NUM_CHUNKS = 5;
    this.trackChunks.forEach(chunk => {
      chunk.position.z += moveZ;
      while (chunk.position.z > CHUNK_LENGTH) {
        chunk.position.z -= NUM_CHUNKS * CHUNK_LENGTH;
      }
    });

    // Update World Objects
    let passingTrainDraft = 0;
    for (let i = this.worldObjects.length - 1; i >= 0; i--) {
      const obj = this.worldObjects[i];
      obj.position.z += moveZ;

      if (obj.userData['type'] === 'train' && obj.userData['isMoving']) {
        obj.position.z += (obj.userData['speed'] as number) * dt;
        if (Math.abs(obj.position.z) < 12.0 && Math.abs(obj.position.x - this.runner.root.position.x) > 2.0) {
          passingTrainDraft = (Math.random() - 0.5) * 0.04;
        }
      }

      if (obj.userData['type'] === 'coin' || obj.userData['type'] === 'key') {
        obj.rotation.y += 3.5 * dt;
        if (this.powerups['magnet']?.active || this.powerups['jetpack']?.active) {
          const dist = obj.position.distanceTo(this.runner.root.position);
          if (dist < (this.powerups['jetpack']?.active ? 28.0 : 25.0)) {
            obj.position.lerp(this.runner.root.position, 16.0 * dt);
          }
        }
      }

      if (obj.userData['type'] === 'powerup' || obj.userData['type'] === 'mystery_box') {
        obj.rotation.y += 2.5 * dt;
        const baseY = (obj.userData['baseY'] as number) || 1.4;
        obj.position.y = baseY + Math.sin(Date.now() * 0.005 + i) * 0.15;
      }

      this.checkCollisions(obj, i);
      if (this.gameState !== 'PLAYING') return;

      if (obj.position.z > 25) {
        this.scene.remove(obj);
        this.worldObjects.splice(i, 1);
      }
    }

    // Replenish horizon
    this.nextSpawnZ += moveZ;
    while (this.nextSpawnZ > -280) {
      this.spawnWorldSegment();
    }

    // Dynamic Camera Follow with passing train draft and collision screen shake
    let shakeX = 0, shakeY = 0;
    if (this.screenShakeTimer > 0) {
      this.screenShakeTimer -= dt;
      shakeX = (Math.random() - 0.5) * this.screenShakeIntensity;
      shakeY = (Math.random() - 0.5) * this.screenShakeIntensity;
    }
    this.camera.position.x = rx * 0.45 + passingTrainDraft + shakeX;
    this.camera.position.y = 5.5 + Math.max(0, this.runner.y) * 0.45 + shakeY;
    this.camera.position.z = 9.0;
    this.camera.lookAt(rx * 0.2, 2.0 + Math.max(0, this.runner.y) * 0.35, -18);
  }

  // --- Collisions ---
  private checkCollisions(obj: THREE.Object3D, index: number) {
    const rx = this.runner.root.position.x;
    const ry = this.runner.root.position.y;
    const rz = this.runner.root.position.z;

    const ox = obj.position.x;
    const oy = obj.position.y;
    const oz = obj.position.z;

    // 0. Key Pickup Collection
    if (obj.userData['type'] === 'key') {
      if (Math.abs(rx - ox) < 1.3 && Math.abs(rz - oz) < 1.6 && Math.abs(ry - oy) < 2.0) {
        this.totalKeys++;
        this.savePersistedData();
        this.playPowerupSound();
        this.showBanner('🔑 حصلت على مفتاح ذهبي!');
        this.scene.remove(obj);
        this.worldObjects.splice(index, 1);
      }
      return;
    }

    // 1. Mystery Box Collection
    if (obj.userData['type'] === 'mystery_box') {
      if (Math.abs(rx - ox) < 1.4 && Math.abs(rz - oz) < 1.6 && Math.abs(ry - oy) < 2.0) {
        this.openMysteryBox();
        this.scene.remove(obj);
        this.worldObjects.splice(index, 1);
      }
      return;
    }

    // 2. Coin Collection (with High-Pitched Arpeggio Sound & Streak Combos)
    if (obj.userData['type'] === 'coin') {
      if (Math.abs(rx - ox) < 1.2 && Math.abs(rz - oz) < 1.4 && Math.abs(ry - oy) < 1.8) {
        const mult = this.getComboMultiplier();
        const add = (this.powerups['multiplier']?.active ? 2 : 1) * mult;
        this.coins += add;
        this.totalCoins += add;
        this.score += 60 * mult;
        this.savePersistedData();
        this.playCoinSound();

        // Increment Streak Combo
        this.streakCombo++;
        this.comboTimer = 2.5;

        this.trackMission('coins', add);

        this.scene.remove(obj);
        this.worldObjects.splice(index, 1);
      }
      return;
    }

    // 3. Powerup Pickup Collection
    if (obj.userData['type'] === 'powerup') {
      if (Math.abs(rx - ox) < 1.3 && Math.abs(rz - oz) < 1.4 && Math.abs(ry - oy) < 1.8) {
        const pType = obj.userData['pType'];
        const dur = this.powerupConfigs[pType].durations[(this.userUpgrades[pType] || 1) - 1];
        this.powerups[pType] = { active: true, timer: dur };

        if (pType === 'hoverboard') {
          this.runner.hoverboard.visible = true;
          this.trackMission('hoverboard', 1);
        }

        this.trackMission('powerup', 1);
        this.playPowerupSound();
        this.showBanner(`⭐ ${this.powerupConfigs[pType].name} مفعل! (${dur}ث)`);

        this.scene.remove(obj);
        this.worldObjects.splice(index, 1);
      }
      return;
    }

    if (this.invulnerabilityTimer > 0) return;

    // 4. Train Collision (Frontal Fatal vs Side Stumble)
    if (obj.userData['type'] === 'train') {
      const halfLen = (obj.userData['length'] as number) / 2;
      const height = (obj.userData['height'] as number) || 4.2;
      const hasRamp = !!obj.userData['hasRamp'];

      // Safe if player is legitimately running on the rooftop
      if (ry >= (height - 0.6)) {
        return;
      }

      // Safe if train has ramp and player is entering smoothly via the front ramp
      if (hasRamp && rz >= (oz + halfLen - 1.5) && Math.abs(rx - ox) < 1.35) {
        return;
      }

      // A) Direct Frontal / In-Lane Train Collision -> Instant 1-Hit Fatal Death
      if (Math.abs(rx - ox) < 1.45 && rz <= (oz + halfLen + 0.8) && rz >= (oz - halfLen - 0.5)) {
        this.handleFatalObstacleHit('💥 اصطدمت بمقدمة قطار المترو السريع!');
        return;
      }

      // B) Side Contact / Scrape on train edge (Player brushing into train side wall) -> 2-Strike Stumble
      if (Math.abs(rx - ox) >= 1.45 && Math.abs(rx - ox) < 2.4 && rz <= (oz + halfLen + 0.5) && rz >= (oz - halfLen - 0.5)) {
        // Bounce runner away from train side wall
        if (rx < ox) {
          this.runner.vx = -8.0;
        } else {
          this.runner.vx = 8.0;
        }
        this.handleSideStumble('⚠️ ارتطمت بجدار القطار الجانبي!');
        return;
      }

      return;
    }

    // 5. Jump Barrier Collision (Stone Hurdle)
    if (obj.userData['type'] === 'barrier_jump') {
      if (Math.abs(rx - ox) < 1.35 && Math.abs(rz - oz) < 1.3) {
        if (ry < 0.65) {
          // Direct frontal hit without jumping -> Fatal Instant Death
          this.handleFatalObstacleHit('🚧 اصطدمت بالحاجز الحجري دون قفز!');
        } else if (ry < 1.25) {
          // Clipped top edge -> 2-Strike Stumble
          this.handleSideStumble('⚠️ تعثرت بالحاجز الحجري!');
        }
      }
      return;
    }

    // 6. Slide Barrier Collision (Overhead Barrier)
    if (obj.userData['type'] === 'barrier_slide') {
      if (Math.abs(rx - ox) < 1.35 && Math.abs(rz - oz) < 1.3) {
        if (!this.runner.isSliding) {
          // Direct hit without sliding -> Fatal Instant Death
          this.handleFatalObstacleHit('🚧 اصطدمت بالحاجز العلوي دون تزحلق!');
        }
      }
      return;
    }
  }

  // --- Collision Handlers: Fatal (1-Hit Death) vs Side Stumble (2-Strikes System) ---
  private handleFatalObstacleHit(subtitle: string) {
    if (this.invulnerabilityTimer > 0) return;

    if (this.powerups['hoverboard']?.active) {
      this.powerups['hoverboard'].active = false;
      this.runner.hoverboard.visible = false;
      this.invulnerabilityTimer = 2.5;
      this.playCrashSound();
      this.showBanner('🛹 لوح التزلج تحطم وحماك من الاصطدام القاتل!');
      return;
    }

    this.playCrashSound();
    this.screenShakeTimer = 0.5;
    this.screenShakeIntensity = 0.55;
    this.saveMeSubtitle = subtitle;

    // Clear any train or obstacle directly covering Jake so camera and characters are 100% visible
    for (let i = this.worldObjects.length - 1; i >= 0; i--) {
      const obj = this.worldObjects[i];
      if (Math.abs(obj.position.z - this.runner.root.position.z) < 20) {
        this.scene.remove(obj);
        this.worldObjects.splice(i, 1);
      }
    }

    this.triggerSaveMeModal('💥 اصطدام قاتل بقطار الشاطئ السريع!', subtitle);
  }

  private handleSideStumble(subtitle: string) {
    if (this.invulnerabilityTimer > 0) return;

    if (this.powerups['hoverboard']?.active) {
      this.powerups['hoverboard'].active = false;
      this.runner.hoverboard.visible = false;
      this.invulnerabilityTimer = 2.0;
      this.playCrashSound();
      this.showBanner('🛹 لوح التزلج حماك من التعثر!');
      return;
    }

    this.stumbleCount++;
    this.screenShakeTimer = 0.35;
    this.screenShakeIntensity = 0.28;

    if (this.stumbleCount === 1) {
      // Strike 1: Stumble, police inspector rushes right behind you (5m)!
      this.chaseDistance = 5.0;
      this.stumbleResetTimer = 6.0;
      this.invulnerabilityTimer = 0.35; // short debounce so rapid consecutive hit triggers Strike 2
      this.playTone(180, 'sawtooth', 0.3);
      this.playTone(90, 'square', 0.4);
      this.showBanner('⚠️ الخبطة الأولى (1/2)! الشرطي خلفك مباشرة! خبطة ثانية وستخسر!');
      this.voiceCallout('انتبه! الشرطي اقترب!');

      // Bounce runner back safely into current lane
      this.runner.root.position.x = this.LANES[this.runner.laneIndex];
      this.runner.targetX = this.LANES[this.runner.laneIndex];
    } else {
      // Strike 2: Hit train twice -> INSTANT FATAL DEATH!
      this.stumbleCount = 0;
      this.stumbleResetTimer = 0;
      this.handleFatalObstacleHit('👮‍♂️ أمسك بك الشرطي بعد اصطدامك الثاني بالقطار!');
    }
  }

  // --- Quick Revive / Save Me ---
  private triggerSaveMeModal(title: string, subtitle: string) {
    this.saveMeTitle = title;
    this.saveMeSubtitle = subtitle;
    this.gameState = 'SAVEME';
    this.stopMusic();

    this.saveMeTimerPercent = 100;
    if (this.saveMeInterval) clearInterval(this.saveMeInterval);
    this.saveMeInterval = setInterval(() => {
      this.saveMeTimerPercent -= 2;
      if (this.saveMeTimerPercent <= 0) {
        clearInterval(this.saveMeInterval);
        this.skipSaveMeAndGameOver();
      }
    }, 100);
  }

  getReviveKeyCost(): number {
    return Math.pow(2, this.revivesUsedThisRound);
  }

  executeRevive() {
    const cost = this.getReviveKeyCost();
    if (this.totalKeys >= cost) {
      this.totalKeys -= cost;
    } else if (this.totalCoins >= 100) {
      this.totalCoins -= 100;
    } else {
      return;
    }

    if (this.saveMeInterval) clearInterval(this.saveMeInterval);
    this.revivesUsedThisRound++;
    this.savePersistedData();
    this.invulnerabilityTimer = 4.0;
    this.chaseDistance = 45.0;
    this.stumbleCount = 0;
    this.stumbleResetTimer = 0;
    this.screenShakeTimer = 0;
    this.screenShakeIntensity = 0;

    // Reset Runner & Inspector Poses & Camera
    this.runner.y = 0;
    this.runner.vy = 0;
    this.runner.isJumping = false;
    this.runner.isSliding = false;
    this.runner.root.position.set(this.LANES[this.runner.laneIndex], 0, 0);
    this.runner.root.rotation.set(0, 0, 0);
    this.runner.bodyGroup.position.set(0, 0, 0);
    this.runner.bodyGroup.rotation.set(0, 0, 0);
    this.runner.torsoGroup.rotation.set(0, 0, 0);
    this.runner.headGroup.rotation.set(0, 0, 0);
    this.runner.leftArmGroup.rotation.set(0, 0, 0);
    this.runner.rightArmGroup.rotation.set(0, 0, 0);
    this.runner.leftLegGroup.rotation.set(0, 0, 0);
    this.runner.rightLegGroup.rotation.set(0, 0, 0);
    this.runner.hoverboard.visible = false;
    this.runner.hoverboard.position.set(0, -0.1, 0);
    this.runner.hoverboard.rotation.set(0, 0, 0);

    if (this.inspector) {
      this.inspector.root.position.set(this.LANES[this.runner.laneIndex], 0, 8);
      this.inspector.root.rotation.set(0, 0, 0);
    }

    if (this.camera) {
      this.camera.position.set(0, 5.5, 9.0);
      this.camera.lookAt(0, 2.0, -18);
    }

    // Clear only immediately dangerous obstacles in player vicinity (-25 to +25)
    for (let i = this.worldObjects.length - 1; i >= 0; i--) {
      const obj = this.worldObjects[i];
      if (obj.position.z > -25 && obj.position.z < 30) {
        this.scene.remove(obj);
        this.worldObjects.splice(i, 1);
      }
    }

    // Ensure horizon is populated
    while (this.nextSpawnZ > -280) {
      this.spawnWorldSegment();
    }

    this.gameState = 'PLAYING';
    this.startMusic();
    this.showBanner('⚡ تم الإنعاش! درع الحماية مفعل لـ 4 ثوانٍ!');
  }

  skipSaveMeAndGameOver() {
    if (this.saveMeInterval) clearInterval(this.saveMeInterval);
    this.gameOverSubtitle = this.saveMeSubtitle;
    this.gameState = 'GAMEOVER';
    this.stopMusic();
    this.savePersistedData();
    this.recordLeaderboardEntry();

    // Clear any obstacles or train obstructing the camera view
    for (let i = this.worldObjects.length - 1; i >= 0; i--) {
      const obj = this.worldObjects[i];
      if (Math.abs(obj.position.z - this.runner.root.position.z) < 22) {
        this.scene.remove(obj);
        this.worldObjects.splice(i, 1);
      }
    }
  }

  // --- Controls Handling (Keyboard & Touch Swipes) ---
  @HostListener('window:keydown', ['$event'])
  handleKeyboard(e: KeyboardEvent) {
    if (this.gameState !== 'PLAYING') return;

    // Runner Controls (P1)
    if (e.key === 'ArrowLeft') {
      this.moveRunnerLeft();
    } else if (e.key === 'ArrowRight') {
      this.moveRunnerRight();
    } else if (e.key === 'ArrowUp' || e.key === ' ') {
      this.runnerJump();
    } else if (e.key === 'ArrowDown') {
      this.runnerSlide();
    }

    // Inspector Controls (P2 in local_vs mode)
    if (this.activeMode === 'local_vs') {
      if (e.key === 'a' || e.key === 'A') {
        if (this.inspector.laneIndex > 0) {
          this.inspector.laneIndex--;
          this.inspector.targetX = this.LANES[this.inspector.laneIndex];
        }
      } else if (e.key === 'd' || e.key === 'D') {
        if (this.inspector.laneIndex < 2) {
          this.inspector.laneIndex++;
          this.inspector.targetX = this.LANES[this.inspector.laneIndex];
        }
      } else if (e.key === 'w' || e.key === 'W') {
        this.triggerCopBoost();
      } else if (e.key === 's' || e.key === 'S') {
        this.triggerCopTrap();
      } else if (e.key === 'e' || e.key === 'E') {
        this.triggerCopDog();
      }
    } else {
      // Allow WASD for Runner in single mode as well
      if (e.key === 'a' || e.key === 'A') this.moveRunnerLeft();
      if (e.key === 'd' || e.key === 'D') this.moveRunnerRight();
      if (e.key === 'w' || e.key === 'W') this.runnerJump();
      if (e.key === 's' || e.key === 'S') this.runnerSlide();
    }
  }

  private isTrainBlockingLane(targetLaneIndex: number): boolean {
    const targetX = this.LANES[targetLaneIndex];
    const rz = this.runner.root.position.z;
    const ry = this.runner.y;

    for (let i = 0; i < this.worldObjects.length; i++) {
      const obj = this.worldObjects[i];
      if (obj.userData['type'] === 'train') {
        const ox = obj.position.x;
        const oz = obj.position.z;
        const halfLen = (obj.userData['length'] as number) / 2;
        const height = (obj.userData['height'] as number) || 4.2;
        const hasRamp = !!obj.userData['hasRamp'];

        if (Math.abs(ox - targetX) < 0.6) {
          // If player is on rooftop height, they can leap across train roofs
          if (ry >= (height - 0.8)) {
            continue;
          }

          // If the train has a ramp and player is entering in front of the ramp
          if (hasRamp && rz >= (oz + halfLen)) {
            continue;
          }

          // Train solid body occupies [oz - halfLen, oz + halfLen]
          if (rz <= (oz + halfLen + 0.6) && rz >= (oz - halfLen - 0.6)) {
            return true; // Lane is physically blocked by the train body!
          }
        }
      }
    }
    return false;
  }

  private moveRunnerLeft() {
    if (this.runner.laneIndex > 0) {
      const targetLane = this.runner.laneIndex - 1;
      if (this.isTrainBlockingLane(targetLane)) {
        // Physical collision with solid train side wall -> Bounce back!
        this.runner.vx = 7.0;
        this.runner.root.position.x += 0.25;
        this.handleSideStumble('⚠️ ارتطمت بجدار القطار الجانبي!');
        return;
      }
      this.runner.laneIndex = targetLane;
      this.runner.targetX = this.LANES[this.runner.laneIndex];
      this.trackMission('lane_changes', 1);
    }
  }

  private moveRunnerRight() {
    if (this.runner.laneIndex < 2) {
      const targetLane = this.runner.laneIndex + 1;
      if (this.isTrainBlockingLane(targetLane)) {
        // Physical collision with solid train side wall -> Bounce back!
        this.runner.vx = -7.0;
        this.runner.root.position.x -= 0.25;
        this.handleSideStumble('⚠️ ارتطمت بجدار القطار الجانبي!');
        return;
      }
      this.runner.laneIndex = targetLane;
      this.runner.targetX = this.LANES[this.runner.laneIndex];
      this.trackMission('lane_changes', 1);
    }
  }

  private runnerJump() {
    if (!this.runner.isJumping) {
      this.runner.isJumping = true;
      this.runner.vy = this.powerups['sneakers']?.active ? 22.0 : 16.5;
      this.playJumpSound();
      this.trackMission('jumps', 1);
    }
  }

  private runnerSlide() {
    this.runner.isSliding = true;
    this.runner.slideTimer = 0.75;
    if (this.runner.y > 0) {
      this.runner.vy = -32.0; // Responsive air dive-down drop onto rails
    }
    this.playTone(160, 'sawtooth', 0.15);
    this.trackMission('slides', 1);
  }

  // --- Touch Swipes ---
  onTouchStart(e: TouchEvent) {
    if (e.touches.length > 0) {
      this.touchStartX = e.touches[0].clientX;
      this.touchStartY = e.touches[0].clientY;
    }
  }

  onTouchEnd(e: TouchEvent) {
    if (this.gameState !== 'PLAYING' || e.changedTouches.length === 0) return;
    const dx = e.changedTouches[0].clientX - this.touchStartX;
    const dy = e.changedTouches[0].clientY - this.touchStartY;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 40) this.moveRunnerLeft(); // RTL left
      else if (dx < -40) this.moveRunnerRight();
    } else {
      if (dy < -40) this.runnerJump();
      else if (dy > 40) this.runnerSlide();
    }
  }

  // --- Inspector Player 2 Abilities ---
  triggerCopBoost() {
    if (this.copBoostCd > 0) return;
    this.copBoostCd = 8;
    this.chaseDistance = Math.max(2.0, this.chaseDistance - 15.0);
    this.playTone(480, 'sawtooth', 0.3);
    this.showBanner('👮‍♂️ الشرطي استخدم تيربو السرعة!');
  }

  triggerCopTrap() {
    if (this.copTrapCd > 0) return;
    this.copTrapCd = 10;
    const trap = this.createBarrier(false);
    trap.position.set(this.LANES[this.runner.laneIndex], 0, this.runner.root.position.z - 25);
    this.scene.add(trap);
    this.worldObjects.push(trap);
    this.showBanner('🚧 الشرطي نصب فخاً أمامك!');
  }

  triggerCopDog() {
    if (this.copDogCd > 0) return;
    this.copDogCd = 12;
    this.chaseDistance = Math.max(2.0, this.chaseDistance - 20.0);
    this.playTone(220, 'square', 0.2);
    this.showBanner('🐕 هجوم الكلب البوليسي!');
  }

  // --- Game Lifecycle Actions ---
  startGame(mode: 'single' | 'local_vs' | 'p2p' | 'pro') {
    this.activeMode = mode;
    this.score = 0;
    this.coins = 0;
    this.streakCombo = 0;
    this.revivesUsedThisRound = 0;
    this.chaseDistance = 40.0;
    this.invulnerabilityTimer = 0;
    this.stumbleCount = 0;
    this.stumbleResetTimer = 0;
    this.screenShakeTimer = 0;
    this.screenShakeIntensity = 0;

    // Reset Runner & Inspector
    this.runner.laneIndex = 1;
    this.runner.targetX = 0;
    this.runner.root.position.set(0, 0, 0);
    this.runner.root.rotation.set(0, 0, 0);
    this.runner.bodyGroup.position.set(0, 0, 0);
    this.runner.bodyGroup.rotation.set(0, 0, 0);
    this.runner.torsoGroup.rotation.set(0, 0, 0);
    this.runner.headGroup.rotation.set(0, 0, 0);
    this.runner.leftArmGroup.rotation.set(0, 0, 0);
    this.runner.rightArmGroup.rotation.set(0, 0, 0);
    this.runner.leftLegGroup.rotation.set(0, 0, 0);
    this.runner.rightLegGroup.rotation.set(0, 0, 0);
    this.runner.y = 0;
    this.runner.vy = 0;
    this.runner.isJumping = false;
    this.runner.isSliding = false;
    this.runner.hoverboard.visible = false;
    this.runner.hoverboard.position.set(0, -0.1, 0);
    this.runner.hoverboard.rotation.set(0, 0, 0);

    this.inspector.laneIndex = 1;
    this.inspector.targetX = 0;
    this.inspector.root.position.set(0, 0, 8);
    this.inspector.root.rotation.set(0, 0, 0);

    // Reset Track Chunks
    const CHUNK_LENGTH = 60;
    this.trackChunks.forEach((chunk, index) => {
      chunk.position.z = -index * CHUNK_LENGTH;
    });

    // Reset Camera
    if (this.camera) {
      this.camera.position.set(0, 5.5, 9.0);
      this.camera.lookAt(0, 2.0, -18);
    }

    // Clear and Pre-populate World Objects Ahead Immediately
    this.worldObjects.forEach(obj => this.scene.remove(obj));
    this.worldObjects = [];
    this.nextSpawnZ = -12;
    this.patternSequence = 0;
    for (let i = 0; i < 8; i++) {
      this.spawnWorldSegment();
    }

    // Start sprinting immediately
    this.gameState = 'PLAYING';
    this.startMusic();
  }

  startSprintFromIntro() {
    this.gameState = 'PLAYING';
    this.startMusic();
  }

  pauseGame() {
    this.gameState = 'PAUSED';
    this.stopMusic();
  }

  resumeGame() {
    this.gameState = 'PLAYING';
    this.startMusic();
  }

  restartCurrentGame() {
    this.startGame(this.activeMode);
  }

  backToMenuFromGameOver() {
    this.gameState = 'MENU';
  }

  // --- Modals & Shop ---
  openShop() { this.showShopModal = true; }
  openShopFromGameOver() { this.showShopModal = true; }
  closeShop() { this.showShopModal = false; }

  openWheel() { this.showWheelModal = true; this.drawWheel(); }
  openLeaderboard() { this.showLeaderboardModal = true; }
  openRoomModal() { this.showRoomModal = true; }

  startProMode() {
    alert('🏆 وضع أونلاين Pro متاح لمشتركي Pro! جاري بدء جولة المصنفين...');
    this.startGame('pro');
  }

  exitToArcade() {
    this.router.navigate(['/arcade']);
  }

  getUpgradeStars(level: number): string {
    let s = '';
    for (let i = 1; i <= 5; i++) s += i <= level ? '★' : '☆';
    return s;
  }

  buyPowerUpgrade(pKey: string) {
    const curLvl = this.userUpgrades[pKey] || 1;
    if (curLvl >= 5) return;
    const cost = this.powerupConfigs[pKey].costs[curLvl];
    if (this.totalCoins >= cost) {
      this.totalCoins -= cost;
      this.userUpgrades[pKey] = curLvl + 1;
      this.savePersistedData();
      this.playPowerupSound();
      this.showBanner(`🌟 تم ترقية ${this.powerupConfigs[pKey].name} إلى المستوى ${this.userUpgrades[pKey]}!`);
    }
  }

  selectOrBuySkin(skin: CharacterSkin) {
    if (skin.unlocked) {
      this.selectedSkin = skin.id;
      this.applySelectedSkinToRunner();
      this.savePersistedData();
      this.showBanner(`👕 تم ارتداء ${skin.name}!`);
    } else if (this.totalCoins >= skin.price) {
      this.totalCoins -= skin.price;
      skin.unlocked = true;
      this.selectedSkin = skin.id;
      this.applySelectedSkinToRunner();
      this.savePersistedData();
      this.playPowerupSound();
      this.showBanner(`🎉 مبروك فتح ${skin.name}!`);
    }
  }

  selectOrBuyBoard(board: HoverboardItem) {
    if (board.unlocked) {
      this.selectedBoard = board.id;
      this.applySelectedBoardToRunner();
      this.savePersistedData();
      this.showBanner(`🛹 تم تجهيز ${board.name}!`);
    } else if (this.totalCoins >= board.price) {
      this.totalCoins -= board.price;
      board.unlocked = true;
      this.selectedBoard = board.id;
      this.applySelectedBoardToRunner();
      this.savePersistedData();
      this.playPowerupSound();
      this.showBanner(`🎉 مبروك فتح ${board.name}!`);
    }
  }

  getComboMultiplier(): number {
    if (this.streakCombo >= 20) return 5;
    if (this.streakCombo >= 12) return 4;
    if (this.streakCombo >= 6) return 3;
    if (this.streakCombo >= 3) return 2;
    return 1;
  }

  showBanner(msg: string) {
    this.floatingBannerText = msg;
    if (this.bannerTimeout) clearTimeout(this.bannerTimeout);
    this.bannerTimeout = setTimeout(() => this.floatingBannerText = '', 2500);
  }

  onBgImgErr(e: any) {
    e.target.style.display = 'none';
  }

  // --- Lucky Spin Wheel ---
  drawWheel() {
    if (!this.wheelCanvasRef) return;
    const canvas = this.wheelCanvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const numSlices = this.wheelPrizes.length;
    const sliceAngle = (Math.PI * 2) / numSlices;
    const cx = 140, cy = 140, radius = 130;

    ctx.clearRect(0, 0, 280, 280);

    for (let i = 0; i < numSlices; i++) {
      const angle = this.wheelAngle + i * sliceAngle;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, angle, angle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = this.wheelPrizes[i].color;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px Cairo, sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 4;
      ctx.fillText(this.wheelPrizes[i].label, radius - 15, 6);
      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#facc15';
    ctx.stroke();
  }

  spinWheel() {
    if (this.isSpinningWheel) return;
    this.isSpinningWheel = true;
    this.playPowerupSound();

    const extraRots = 5 + Math.random() * 4;
    const targetAngle = this.wheelAngle + extraRots * Math.PI * 2 + Math.random() * Math.PI * 2;
    const startAngle = this.wheelAngle;
    const duration = 3800;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - progress, 3);
      this.wheelAngle = startAngle + (targetAngle - startAngle) * ease;
      this.drawWheel();

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        this.isSpinningWheel = false;
        const numSlices = this.wheelPrizes.length;
        const sliceAngle = (Math.PI * 2) / numSlices;
        const normAngle = ((Math.PI * 1.5 - (this.wheelAngle % (Math.PI * 2))) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        const winIdx = Math.floor(normAngle / sliceAngle) % numSlices;
        const prize = this.wheelPrizes[winIdx];

        if (prize.type === 'coins') {
          this.totalCoins += prize.val;
          alert(`🎉 مبروك! ربحت ${prize.val} عملة ذهبية! 🪙`);
        } else if (prize.type === 'keys') {
          this.totalKeys += prize.val;
          alert(`🎉 مبروك! ربحت ${prize.val} مفتاح ذهبي نادر! 🔑`);
        } else if (prize.type === 'box') {
          this.totalCoins += 500;
          this.totalKeys += 1;
          alert('🎉 مبروك! ربحت صندوق مفاجآت فاخر (500 عملة + 1 مفتاح)! 🎁');
        } else {
          this.totalCoins += 300;
          alert('🎉 مبروك! ربحت ترقية مجانية ومكافأة 300 عملة! ⭐');
        }
        this.savePersistedData();
      }
    };
    requestAnimationFrame(step);
  }

  // --- Leaderboard ---
  private recordLeaderboardEntry() {
    this.leaderboardList.push({
      date: new Date().toLocaleDateString('ar-EG'),
      score: this.score,
      coins: this.coins
    });
    this.leaderboardList.sort((a, b) => b.score - a.score);
    this.leaderboardList = this.leaderboardList.slice(0, 5);
    this.savePersistedData();
  }

  // --- P2P Online Room ---
  createP2PRoom() {
    this.createdRoomCode = 'SUBWAY_' + Math.random().toString(36).substring(2, 7).toUpperCase();
    this.peer = new Peer(this.createdRoomCode);
    this.peer.on('connection', conn => {
      this.p2pConn = conn;
      this.showRoomModal = false;
      this.startGame('p2p');
    });
  }

  joinP2PRoom() {
    const code = this.joinRoomCodeInput.trim().toUpperCase();
    if (!code) return;
    this.peer = new Peer();
    this.peer.on('open', () => {
      if (!this.peer) return;
      this.p2pConn = this.peer.connect(code);
      this.p2pConn.on('open', () => {
        this.showRoomModal = false;
        this.startGame('p2p');
      });
    });
  }

  // --- Web Audio Synthesizer ---
  private initAudio() {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      this.audioCtx = new AudioContextClass();
      this.sfxGain = this.audioCtx.createGain();
      this.sfxGain.gain.value = 0.35;
      this.sfxGain.connect(this.audioCtx.destination);

      this.musicGain = this.audioCtx.createGain();
      this.musicGain.gain.value = 0.15;
      this.musicGain.connect(this.audioCtx.destination);
    }
  }

  toggleSound() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) this.stopMusic();
    else if (this.gameState === 'PLAYING') this.startMusic();
  }

  private playTone(freq: number, type: OscillatorType, duration: number, targetGain: GainNode | null = this.sfxGain) {
    if (!this.audioCtx || this.isMuted || !targetGain) return;
    try {
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(targetGain);
      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch(e) {}
  }

  playCoinSound() {
    this.playTone(987.77, 'sine', 0.08);
    setTimeout(() => this.playTone(1318.51, 'triangle', 0.12), 35);
  }

  playJumpSound() {
    this.playTone(320, 'sine', 0.15);
  }

  playPowerupSound() {
    [440, 554, 659, 880].forEach((f, i) => setTimeout(() => this.playTone(f, 'sine', 0.12), i * 45));
  }

  playCrashSound() {
    this.playTone(110, 'sawtooth', 0.35);
    this.playTone(55, 'square', 0.45);
  }

  private voiceCallout(text: string) {
    if ('speechSynthesis' in window) {
      try {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'ar-EG';
        u.rate = 1.1;
        window.speechSynthesis.speak(u);
      } catch(e) {}
    }
  }

  private startMusic() {
    if (this.musicInterval || this.isMuted || !this.audioCtx) return;
    let step = 0;
    const notes = [110, 110, 146, 110, 164, 146, 110, 130];
    this.musicInterval = setInterval(() => {
      if (this.gameState === 'PLAYING' && !this.isMuted) {
        const note = notes[step % notes.length];
        this.playTone(note, 'triangle', 0.1, this.musicGain);
        step++;
      }
    }, 180);
  }

  private stopMusic() {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }
}
