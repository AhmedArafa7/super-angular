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
}

interface HoverboardItem {
  id: string;
  name: string;
  price: number;
  unlocked: boolean;
  color: number;
  desc: string;
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

      <!-- ================= 1. START MENU OVERLAY (1:1 CAIRO METRO DASH EDITION) ================= -->
      <div *ngIf="gameState === 'MENU'" class="absolute inset-0 z-40 flex items-center justify-center p-3 sm:p-4 bg-slate-950 overflow-hidden select-none">
        
        <!-- Authentic Railroad Tracks Station Background -->
        <img src="assets/images/metro-tracks-bg.jpg" class="absolute inset-0 w-full h-full object-cover object-center" (error)="onBgImgErr($event)" />
        <div class="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/50 to-slate-950/80"></div>

        <!-- Left Side Floating Badge: Metro Dash Runner Avatar -->
        <div class="absolute left-4 sm:left-12 top-20 hidden md:flex flex-col items-center gap-1.5 z-10">
          <div class="w-16 h-16 rounded-full border-2 border-cyan-400/80 bg-slate-900/90 p-1 shadow-[0_0_25px_rgba(6,182,212,0.6)] flex items-center justify-center">
            <span class="text-3xl">🏃‍♂️</span>
          </div>
          <span class="text-xs font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">Metro Dash</span>
        </div>

        <!-- Right Side Floating Badge: Metro Line 3 Avatar -->
        <div class="absolute right-4 sm:right-12 top-20 hidden md:flex flex-col items-center gap-1.5 z-10">
          <div class="w-16 h-16 rounded-full border-2 border-amber-400/80 bg-slate-900/90 p-1 shadow-[0_0_25px_rgba(245,158,11,0.6)] flex items-center justify-center">
            <span class="text-3xl">🚇</span>
          </div>
          <span class="text-xs font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">Metro Line 3</span>
        </div>

        <!-- Center Station Card (1:1 with target design) -->
        <div class="relative w-full max-w-[450px] bg-slate-900/90 backdrop-blur-xl border-2 border-slate-700/80 rounded-[36px] p-5 sm:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.95)] flex flex-col items-center text-center">
          
          <!-- Small Egyptian Flag Badge at Top Edge -->
          <div class="absolute -top-3.5 inset-x-0 mx-auto w-12 h-6 bg-slate-900 border border-slate-600 rounded-full flex items-center justify-center shadow-lg text-sm z-20">
            🇪🇬
          </div>

          <!-- Header Section: Inspector Portrait + METRO DASH Title + Metro Train -->
          <div class="w-full flex items-center justify-between mt-1 mb-3">
            <!-- Inspector Portrait -->
            <div class="w-16 h-16 rounded-2xl bg-gradient-to-b from-blue-950 to-slate-900 border border-cyan-400/40 flex items-center justify-center text-3xl shadow-lg relative overflow-hidden">
              <span class="transform scale-125">👮‍♂️</span>
            </div>

            <!-- Center Title & Arabic Subtitle -->
            <div class="flex flex-col items-center flex-1 px-2">
              <h1 class="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-cyan-300 tracking-wider drop-shadow-[0_2px_12px_rgba(6,182,212,0.7)] font-sans">
                METRO DASH
              </h1>
              <span class="text-xs font-bold text-slate-300 mt-0.5 tracking-wide">الهروب عبر محطات المترو</span>
            </div>

            <!-- Metro Train Graphic -->
            <div class="w-16 h-16 rounded-2xl bg-gradient-to-b from-slate-900 to-emerald-950 border border-emerald-400/40 flex items-center justify-center text-3xl shadow-lg relative overflow-hidden">
              <span class="transform scale-125">🚇</span>
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

      <!-- ================= 3. 1:1 CAIRO METRO GAME OVER OVERLAY ================= -->
      <div *ngIf="gameState === 'GAMEOVER'" class="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
        
        <!-- Main Game Over Card -->
        <div class="relative w-full max-w-sm rounded-[36px] p-6 shadow-2xl flex flex-col items-center text-center overflow-hidden border-2 border-amber-500/60 bg-gradient-to-b from-slate-900/95 via-slate-950/98 to-slate-950">
          
          <!-- Background Artwork image if available -->
          <img src="/games/subway-surfers/gameover-bg.jpg" class="absolute inset-0 w-full h-full object-cover opacity-25 pointer-events-none" (error)="onBgImgErr($event)">

          <!-- Loss Title & 1:1 Cairo Arabic Heading -->
          <div class="relative z-10 flex flex-col items-center">
            <div class="bg-red-600/90 border border-red-400 text-white text-[11px] font-black px-4 py-1 rounded-full shadow-lg mb-2 tracking-widest uppercase">
              GAME OVER
            </div>
            <h2 class="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-400 to-red-500 drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]">
              لقد خسرت!
            </h2>
            <p class="text-xs text-slate-300 font-bold mt-1 mb-4">{{ gameOverSubtitle }}</p>
          </div>

          <!-- 1:1 Stats Panel matching screenshot -->
          <div class="relative z-10 w-full bg-slate-900/90 border border-white/15 rounded-3xl p-4 shadow-2xl flex flex-col gap-2.5 mb-5">
            <div class="flex items-center justify-between border-b border-white/10 pb-2">
              <span class="text-xs font-bold text-slate-400">المجمّع (النقاط):</span>
              <span class="text-lg font-black text-amber-400">{{ score.toLocaleString() }} م</span>
            </div>
            <div class="flex items-center justify-between border-b border-white/10 pb-2">
              <span class="text-xs font-bold text-slate-400">العملات المجمعة:</span>
              <span class="text-lg font-black text-amber-300 flex items-center gap-1">🪙 {{ coins.toLocaleString() }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-400">المسافة المقطوعة:</span>
              <span class="text-sm font-black text-cyan-300">{{ (score / 1000).toFixed(1) }} كلم</span>
            </div>
          </div>

          <!-- 3 Action Buttons (1:1 with Loss Screen) -->
          <div class="relative z-10 flex flex-col gap-2.5 w-full">
            <button (click)="restartCurrentGame()" class="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-base rounded-2xl shadow-xl transition-all transform hover:scale-[1.02] cursor-pointer flex items-center justify-center gap-2 border border-emerald-300">
              <span>🔄 العب مرة أخرى</span>
            </button>

            <div class="grid grid-cols-2 gap-2 w-full">
              <button (click)="openShopFromGameOver()" class="py-3 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black text-xs rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-yellow-300">
                <span>🏪 المتجر</span>
              </button>
              <button (click)="backToMenuFromGameOver()" class="py-3 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-white/20">
                <span>🏠 القائمة الرئيسية</span>
              </button>
            </div>
          </div>

        </div>
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
                
                <!-- Distinct 3D Glowing Icon Container -->
                <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-lg border relative overflow-hidden flex-shrink-0"
                     [ngClass]="{
                       'bg-gradient-to-br from-red-600 via-rose-700 to-indigo-900 border-rose-400/60 shadow-[0_0_20px_rgba(244,63,94,0.4)]': pKey === 'magnet',
                       'bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-600 border-yellow-300 shadow-[0_0_20px_rgba(245,158,11,0.5)]': pKey === 'multiplier',
                       'bg-gradient-to-br from-cyan-500 via-teal-600 to-slate-900 border-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.4)]': pKey === 'hoverboard',
                       'bg-gradient-to-br from-purple-600 via-violet-700 to-indigo-950 border-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.4)]': pKey === 'sneakers',
                       'bg-gradient-to-br from-orange-500 via-red-600 to-rose-900 border-orange-300 shadow-[0_0_20px_rgba(249,115,22,0.5)]': pKey === 'jetpack'
                     }">
                  <span class="transform hover:scale-110 transition-transform">{{ powerupConfigs[pKey].icon }}</span>
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

          <!-- Tab 2: Character Skins -->
          <div *ngIf="shopTab === 'characters'" class="flex-1 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div *ngFor="let skin of characterSkins" class="bg-slate-900/90 border-2 rounded-3xl p-4 flex flex-col justify-between shadow-xl transition-all"
                 [ngClass]="selectedSkin === skin.id ? 'border-emerald-500 bg-emerald-950/20' : 'border-white/10'">
              
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <span class="font-black text-base text-white">{{ skin.name }}</span>
                  <span *ngIf="selectedSkin === skin.id" class="bg-emerald-500 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full shadow">مفعل حالياً</span>
                  <span *ngIf="skin.unlocked && selectedSkin !== skin.id" class="bg-slate-800 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full">مفتوح</span>
                </div>
                <p class="text-xs text-slate-300">{{ skin.desc }}</p>
              </div>

              <button (click)="selectOrBuySkin(skin)" 
                      [disabled]="!skin.unlocked && totalCoins < skin.price"
                      class="mt-4 w-full py-2.5 text-xs font-black rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                      [ngClass]="selectedSkin === skin.id ? 'bg-emerald-500 text-slate-950 cursor-default' : (skin.unlocked ? 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-400/40' : 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950')">
                <span>{{ selectedSkin === skin.id ? 'مفعل ✔️' : (skin.unlocked ? 'ارتداء الشخصية 👕' : 'فتح الشخصية 🛒') }}</span>
                <span *ngIf="!skin.unlocked" class="text-[11px] font-black">🪙 {{ skin.price.toLocaleString() }}</span>
              </button>
            </div>
          </div>

          <!-- Tab 3: Hoverboards -->
          <div *ngIf="shopTab === 'boards'" class="flex-1 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div *ngFor="let board of hoverboardsList" class="bg-slate-900/90 border-2 rounded-3xl p-4 flex flex-col justify-between shadow-xl transition-all"
                 [ngClass]="selectedBoard === board.id ? 'border-cyan-400 bg-cyan-950/20' : 'border-white/10'">
              
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <span class="font-black text-base text-white">{{ board.name }}</span>
                  <span *ngIf="selectedBoard === board.id" class="bg-cyan-400 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full shadow">مجهز حالياً</span>
                  <span *ngIf="board.unlocked && selectedBoard !== board.id" class="bg-slate-800 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full">مفتوح</span>
                </div>
                <p class="text-xs text-slate-300">{{ board.desc }}</p>
              </div>

              <button (click)="selectOrBuyBoard(board)" 
                      [disabled]="!board.unlocked && totalCoins < board.price"
                      class="mt-4 w-full py-2.5 text-xs font-black rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                      [ngClass]="selectedBoard === board.id ? 'bg-cyan-400 text-slate-950 cursor-default' : (board.unlocked ? 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-400/40' : 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950')">
                <span>{{ selectedBoard === board.id ? 'مجهز ✔️' : (board.unlocked ? 'تجهيز اللوح 🛹' : 'شراء اللوح 🛒') }}</span>
                <span *ngIf="!board.unlocked" class="text-[11px] font-black">🪙 {{ board.price.toLocaleString() }}</span>
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
          <p class="text-xs text-slate-400 mb-4">أفضل السكورات المسجلة في مترو القاهرة</p>

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
    magnet: { name: 'المغناطيس الخارق', icon: '🧲', desc: 'جذب العملات تلقائياً من جميع المسارات', durations: [10, 14, 18, 22, 28], costs: [0, 100, 250, 500, 1000] },
    multiplier: { name: 'مضاعف النقاط 2X', icon: '⭐', desc: 'مضاعفة نقاط السكور والعملات المجمعة', durations: [12, 16, 20, 25, 32], costs: [0, 150, 300, 600, 1200] },
    hoverboard: { name: 'لوح التزلج النفاث', icon: '🛹', desc: 'حماية كاملة من الاصطدام الأول وتحويم سريع', durations: [15, 20, 25, 30, 40], costs: [0, 200, 400, 800, 1500] },
    sneakers: { name: 'حذاء القفز العالي', icon: '👟', desc: 'قفزات هوائية مضاعفة للوصول لأسطح القطارات', durations: [10, 14, 18, 22, 28], costs: [0, 100, 250, 500, 1000] },
    jetpack: { name: 'صاروخ حورس النفاث (Pharaoh Jetpack) 🦅👑', icon: '🦅', desc: 'أجنحة حورس الذهبية والنفاثة الفرعونية! تحليق أسطوري في السماء فوق كل العوائق مع مسار عملات ذهبية ضخم', durations: [8, 11, 14, 18, 24], costs: [0, 250, 500, 1000, 2000] }
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
    { id: 'jake', name: 'جيك (الهارب الأصلي)', price: 0, unlocked: true, color: 0x1d4ed8, hatColor: 0xdc2626, desc: 'البطل الكلاسيكي مع القبعة الحمراء والفيست الأزرق' },
    { id: 'fresh', name: 'فريش (عازف الإيقاع)', price: 1500, unlocked: false, color: 0x10b981, hatColor: 0xf59e0b, desc: 'سماعات ضخمة وسرعة مراوغة أعلى' },
    { id: 'tricky', name: 'تريكي (المتزلجة الذكية)', price: 3000, unlocked: false, color: 0xec4899, hatColor: 0x8b5cf6, desc: 'خفيفة الحركة وقفزات هوائية أعلى' },
    { id: 'cairo_king', name: 'صقر القاهرة (فرعوني)', price: 5000, unlocked: false, color: 0xfacc15, hatColor: 0x0f172a, desc: 'زي أسطوري مع درع ذهبي لامع' }
  ];

  hoverboardsList: HoverboardItem[] = [
    { id: 'classic', name: 'لوح الشارع الكلاسيكي', price: 0, unlocked: true, color: 0xd97706, desc: 'حماية كاملة من أول اصطدام' },
    { id: 'cyber', name: 'لوح السايبر النيون', price: 1200, unlocked: false, color: 0x06b6d4, desc: 'سرعة تحويم مضاعفة وتوهج ليلي' },
    { id: 'pharaoh', name: 'لوح رمسيس الذهبي', price: 2500, unlocked: false, color: 0xfacc15, desc: 'يجذب العملات القريبة تلقائياً' }
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

  // 3D Characters
  private runner: any = null;
  private inspector: any = null;
  private runnerStridePhase = 0;
  private copStridePhase = 0;
  private revivesUsedThisRound = 0;

  ngOnInit() {
    this.loadPersistedData();
    this.initMissions();
  }

  ngAfterViewInit() {
    this.initThreeJS();
    this.initAudio();
    this.drawWheel();
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

    // Scene with Warm Egyptian Dusk Atmosphere
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x180f07); // Warm Egyptian dusk
    this.scene.fog = new THREE.FogExp2(0x180f07, 0.005);

    // Camera
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 450);
    this.camera.position.set(0, 5.5, 9.5);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    // Warm Sun & Egyptian Ambient Lights
    const hemiLight = new THREE.HemisphereLight(0xffedd5, 0x78350f, 0.9);
    this.scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfef08a, 1.35);
    sunLight.position.set(15, 35, 20);
    this.scene.add(sunLight);

    const warmAmbient = new THREE.AmbientLight(0xd97706, 0.35);
    this.scene.add(warmAmbient);

    // Build World Track Chunks (Pharaonic Temple Environment)
    this.buildTrackEnvironment();

    // Build Characters
    this.runner = this.buildJakeCharacter();
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

    // Materials for Pharaonic Environment
    const sandTile1Mat = new THREE.MeshLambertMaterial({ color: 0x854d0e });
    const sandTile2Mat = new THREE.MeshLambertMaterial({ color: 0x5c330a });
    const sandstoneWallMat = new THREE.MeshLambertMaterial({ color: 0x92400e });
    const pylonMat = new THREE.MeshLambertMaterial({ color: 0xb45309 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.85, roughness: 0.2 });
    const lapisMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.5, roughness: 0.3 });
    const turquoiseMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, metalness: 0.6, roughness: 0.2 });
    const torchGlowMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
    const railMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.9, roughness: 0.15 });
    const tieMat = new THREE.MeshLambertMaterial({ color: 0x451a03 });

    for (let c = 0; c < NUM_CHUNKS; c++) {
      const chunk = new THREE.Group();
      chunk.position.z = -c * CHUNK_LENGTH;

      // 1. Alternating Two-Tone Sandstone Floor Tiles (Visibly Rushing Past)
      for (let fz = -CHUNK_LENGTH / 2; fz < CHUNK_LENGTH / 2; fz += 4) {
        const isOdd = Math.abs(Math.round(fz / 4)) % 2 === 1;
        const tileGeo = new THREE.PlaneGeometry(36, 4);
        const tile = new THREE.Mesh(tileGeo, isOdd ? sandTile1Mat : sandTile2Mat);
        tile.rotation.x = -Math.PI / 2;
        tile.position.set(0, 0, fz + 2);
        chunk.add(tile);
      }

      // 2. High-Contrast Golden Rails and Carved Wooden Ties
      [-3.6, 0, 3.6].forEach(x => {
        [-0.7, 0.7].forEach(rx => {
          const railGeo = new THREE.BoxGeometry(0.14, 0.18, CHUNK_LENGTH);
          const rail = new THREE.Mesh(railGeo, railMat);
          rail.position.set(x + rx, 0.09, 0);
          chunk.add(rail);
        });

        // Wooden Ties with Gold Plates
        const tieGeo = new THREE.BoxGeometry(2.0, 0.12, 0.45);
        for (let tz = -CHUNK_LENGTH / 2; tz < CHUNK_LENGTH / 2; tz += 1.4) {
          const tie = new THREE.Mesh(tieGeo, tieMat);
          tie.position.set(x, 0.05, tz);

          // Golden Tie Bolt
          const bolt = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.1), goldMat);
          bolt.position.set(x, 0.07, tz);

          chunk.add(tie, bolt);
        }
      });

      // 3. Pharaonic Sandstone Temple Side Walls
      [-9.5, 9.5].forEach(wx => {
        const wallGeo = new THREE.BoxGeometry(1.2, 10, CHUNK_LENGTH);
        const wall = new THREE.Mesh(wallGeo, sandstoneWallMat);
        wall.position.set(wx, 5, 0);

        // Golden Hieroglyphic Frieze Cornice along the top of wall
        const friezeGeo = new THREE.BoxGeometry(1.4, 0.7, CHUNK_LENGTH);
        const frieze = new THREE.Mesh(friezeGeo, goldMat);
        frieze.position.set(wx, 9.7, 0);

        // Torch Sconces on Walls
        for (let tz = -CHUNK_LENGTH / 2 + 10; tz < CHUNK_LENGTH / 2; tz += 20) {
          const scone = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.5), goldMat);
          scone.position.set(wx > 0 ? wx - 0.7 : wx + 0.7, 4.5, tz);

          const flame = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), torchGlowMat);
          flame.position.set(wx > 0 ? wx - 0.7 : wx + 0.7, 5.1, tz);
          chunk.add(scone, flame);
        }

        chunk.add(wall, frieze);
      });

      // 4. Fluted Lotus Temple Columns of Luxor (الأعمدة الفرعونية)
      [-6.2, 6.2].forEach(cx => {
        for (let cz = -CHUNK_LENGTH / 2 + 8; cz < CHUNK_LENGTH / 2; cz += 22) {
          const colGroup = new THREE.Group();
          colGroup.position.set(cx, 0, cz);

          // Column Shaft
          const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.65, 8.5, 12), pylonMat);
          shaft.position.y = 4.25;

          // Lapis & Gold Painted Bands
          const band1 = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.4, 12), lapisMat);
          band1.position.y = 6.8;
          const band2 = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.3, 12), turquoiseMat);
          band2.position.y = 2.5;

          // Lotus Flower Capital at top
          const capital = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.52, 1.2, 12), goldMat);
          capital.position.y = 8.8;

          colGroup.add(shaft, band1, band2, capital);
          chunk.add(colGroup);
        }
      });

      // 5. Monumental Pharaonic Pylon Archway with Winged Solar Disc of Horus
      const pylonArch = new THREE.Group();
      pylonArch.position.set(0, 0, 0);

      // Pylon Towers (Left & Right)
      const pL = new THREE.Mesh(new THREE.BoxGeometry(2.4, 10.5, 2.6), pylonMat);
      pL.position.set(-8.2, 5.25, 0);
      const pR = new THREE.Mesh(new THREE.BoxGeometry(2.4, 10.5, 2.6), pylonMat);
      pR.position.set(8.2, 5.25, 0);

      // Heavy Sandstone Lintel Beam spanning over tracks
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(19, 1.6, 2.8), pylonMat);
      lintel.position.set(0, 9.8, 0);

      // Sculpted Golden Winged Sun Disc of Horus (قرص الشمس المجنح) in center of beam
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.18, 16), goldMat);
      disc.rotation.x = Math.PI / 2;
      disc.position.set(0, 9.8, 1.45);

      const wingL = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.45, 0.12), goldMat);
      wingL.position.set(-1.8, 9.8, 1.45);
      wingL.rotation.z = 0.15;

      const wingR = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.45, 0.12), goldMat);
      wingR.position.set(1.8, 9.8, 1.45);
      wingR.rotation.z = -0.15;

      pylonArch.add(pL, pR, lintel, disc, wingL, wingR);
      chunk.add(pylonArch);

      // 6. Golden Guardian Sphinx Statues along the sides
      [-6.2, 6.2].forEach(sx => {
        const statueGroup = new THREE.Group();
        statueGroup.position.set(sx, 0, -CHUNK_LENGTH / 2 + 19);

        // Stone Pedestal
        const ped = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 2.6), pylonMat);
        ped.position.y = 0.6;

        // Golden Sphinx Body
        const sBody = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 2.0), goldMat);
        sBody.position.y = 1.7;

        // Pharaonic Nemes Head
        const sHead = new THREE.Mesh(new THREE.SphereGeometry(0.48, 12, 12), goldMat);
        sHead.position.set(0, 2.4, 0.7);

        // Lapis Royal Crown
        const sCrown = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5, 0.4), lapisMat);
        sCrown.position.set(0, 2.5, 0.7);

        statueGroup.add(ped, sBody, sHead, sCrown);
        chunk.add(statueGroup);
      });

      this.scene.add(chunk);
      this.trackChunks.push(chunk);
    }
  }

  // --- 1:1 Jake Character Builder ---
  private buildJakeCharacter() {
    const root = new THREE.Group();
    const bodyGroup = new THREE.Group();
    root.add(bodyGroup);

    // Torso Group (White Hoodie + Denim Vest)
    const torsoGroup = new THREE.Group();
    torsoGroup.position.y = 1.5;

    const torsoGeo = new THREE.BoxGeometry(0.85, 1.1, 0.55);
    const torsoMat = new THREE.MeshLambertMaterial({ color: 0x1d4ed8 }); // Denim Blue
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torsoGroup.add(torso);

    // White Hoodie inner collar
    const hoodieGeo = new THREE.BoxGeometry(0.45, 0.95, 0.57);
    const hoodieMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc });
    const hoodie = new THREE.Mesh(hoodieGeo, hoodieMat);
    hoodie.position.set(0, 0.08, 0);
    torsoGroup.add(hoodie);

    // Olive Backpack
    const packGeo = new THREE.BoxGeometry(0.65, 0.85, 0.35);
    const packMat = new THREE.MeshLambertMaterial({ color: 0x3f6212 });
    const backpack = new THREE.Mesh(packGeo, packMat);
    backpack.position.set(0, 0, -0.38);
    torsoGroup.add(backpack);

    bodyGroup.add(torsoGroup);

    // Head Group
    const headGroup = new THREE.Group();
    headGroup.position.y = 2.35;

    const headGeo = new THREE.SphereGeometry(0.36, 16, 16);
    const headMat = new THREE.MeshLambertMaterial({ color: 0xffedd5 });
    const head = new THREE.Mesh(headGeo, headMat);
    headGroup.add(head);

    // Red Cap with Green Visor
    const capGeo = new THREE.CylinderGeometry(0.38, 0.4, 0.22, 16);
    const capMat = new THREE.MeshLambertMaterial({ color: 0xdc2626 });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.set(0, 0.2, 0);
    headGroup.add(cap);

    const visorGeo = new THREE.BoxGeometry(0.42, 0.05, 0.3);
    const visorMat = new THREE.MeshLambertMaterial({ color: 0x16a34a });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 0.22, -0.32);
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

    // Spray Can in Hand
    const canGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.32, 12);
    const canMat = new THREE.MeshLambertMaterial({ color: 0x06b6d4 });
    const sprayCan = new THREE.Mesh(canGeo, canMat);
    sprayCan.position.set(0, -0.75, 0.15);
    sprayCan.rotation.x = Math.PI / 4;
    rightArmGroup.add(sprayCan);
    bodyGroup.add(rightArmGroup);

    // Left Leg Group (Pivoting at Hip)
    const leftLegGroup = new THREE.Group();
    leftLegGroup.position.set(-0.24, 0.95, 0);
    const legGeo = new THREE.BoxGeometry(0.28, 0.9, 0.28);
    const legMat = new THREE.MeshLambertMaterial({ color: 0x1e3a8a });
    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.y = -0.45;
    const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.45), new THREE.MeshLambertMaterial({ color: 0xdc2626 }));
    leftShoe.position.set(0, -0.85, 0.08);
    leftLegGroup.add(leftLeg, leftShoe);
    bodyGroup.add(leftLegGroup);

    // Right Leg Group (Pivoting at Hip)
    const rightLegGroup = new THREE.Group();
    rightLegGroup.position.set(0.24, 0.95, 0);
    const rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.y = -0.45;
    const rightShoe = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.45), new THREE.MeshLambertMaterial({ color: 0xdc2626 }));
    rightShoe.position.set(0, -0.85, 0.08);
    rightLegGroup.add(rightLeg, rightShoe);
    bodyGroup.add(rightLegGroup);

    // Pharaonic Horus Jetpack 3D Model
    const pharaohJetpack = new THREE.Group();
    pharaohJetpack.position.set(0, 1.55, -0.45);
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
    leftWing.position.set(-0.75, 0.2, -0.05);
    leftWing.rotation.z = 0.25;
    const rightWing = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.35, 0.05), goldMat);
    rightWing.position.set(0.75, 0.2, -0.05);
    rightWing.rotation.z = -0.25;
    pharaohJetpack.add(leftWing, rightWing);
    pharaohJetpack.visible = false;
    bodyGroup.add(pharaohJetpack);

    // Hoverboard
    const hoverboard = new THREE.Group();
    hoverboard.position.y = -0.1;
    const boardMat = new THREE.MeshLambertMaterial({ color: 0xd97706 });
    const boardMesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 2.2), boardMat);
    const boardGlow = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.06, 2.26), new THREE.MeshBasicMaterial({ color: 0x06b6d4 }));
    boardGlow.position.y = -0.05;
    hoverboard.add(boardMesh, boardGlow);
    hoverboard.visible = false;
    root.add(hoverboard);

    return {
      root,
      bodyGroup,
      torsoGroup,
      torso,
      headGroup,
      head,
      leftArmGroup,
      rightArmGroup,
      leftLegGroup,
      rightLegGroup,
      leftLeg,
      rightLeg,
      hoverboard,
      pharaohJetpack,
      leftWing,
      rightWing,
      sprayCan,
      laneIndex: 1,
      targetX: 0,
      y: 0,
      vy: 0,
      isJumping: false,
      isSliding: false,
      slideTimer: 0
    };
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
    const geo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
    const mat = new THREE.MeshLambertMaterial({ color: 0x9333ea });
    const mesh = new THREE.Mesh(geo, mat);
    const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.94, 0.2), new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.8 }));
    group.add(mesh, ribbon);
    group.userData = { type: 'mystery_box' };
    return group;
  }

  private createPowerupMesh(pType: string) {
    const group = new THREE.Group();
    const geo = new THREE.SphereGeometry(0.55, 16, 16);
    const mat = new THREE.MeshLambertMaterial({ 
      color: pType === 'magnet' ? 0xef4444 : (pType === 'jetpack' ? 0xf59e0b : (pType === 'sneakers' ? 0x10b981 : 0x06b6d4)) 
    });
    const mesh = new THREE.Mesh(geo, mat);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.06, 8, 20), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    ring.rotation.x = Math.PI / 2;
    group.add(mesh, ring);
    group.userData = { type: 'powerup', pType };
    return group;
  }

  private createCairoMetroTrain(isMoving: boolean = false, speed: number = 0, hasRamp: boolean = false) {
    const group = new THREE.Group();
    const length = 28;
    const height = 4.2;

    // Train Body (Cairo Blue with Golden Pharaoh Stripe)
    const bodyGeo = new THREE.BoxGeometry(2.85, height, length);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x0284c7 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = height / 2;
    group.add(body);

    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.85, roughness: 0.2 });
    const roofBand = new THREE.Mesh(new THREE.BoxGeometry(2.95, 0.35, length), goldMat);
    roofBand.position.y = height + 0.15;
    group.add(roofBand);

    // Front Windshield Slope
    const cabinGeo = new THREE.BoxGeometry(2.6, 1.8, 1.5);
    const darkGlassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1 });
    const cabin = new THREE.Mesh(cabinGeo, darkGlassMat);
    cabin.position.set(0, 2.6, length / 2 + 0.3);
    cabin.rotation.x = -0.3;
    group.add(cabin);

    // Dual Glowing Headlights
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    [-0.8, 0.8].forEach(lx => {
      const headlight = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), lightMat);
      headlight.position.set(lx, 1.3, length / 2 + 0.15);
      group.add(headlight);
    });

    // Front Arabic Destination Board: "مترو القاهرة 🚇"
    const boardCanvas = document.createElement('canvas');
    boardCanvas.width = 256;
    boardCanvas.height = 64;
    const ctx = boardCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0a0f1d';
      ctx.fillRect(0, 0, 256, 64);
      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 24px Cairo, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('مترو القاهرة 🚇✨', 128, 42);
    }
    const tex = new THREE.CanvasTexture(boardCanvas);
    const destMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.65), new THREE.MeshBasicMaterial({ map: tex }));
    destMesh.position.set(0, 3.5, length / 2 + 0.08);
    group.add(destMesh);

    // Front Ramp for stationary trains
    if (hasRamp) {
      const rampGeo = new THREE.BoxGeometry(2.4, 0.3, 7.0);
      const rampMat = new THREE.MeshLambertMaterial({ color: 0xb45309 });
      const ramp = new THREE.Mesh(rampGeo, rampMat);
      ramp.position.set(0, height / 2, length / 2 + 3.5);
      ramp.rotation.x = 0.52; // Angled ramp to roof
      group.add(ramp);
    }

    group.userData = { type: 'train', length, height, isMoving, speed, hasRamp };
    return group;
  }

  private createBarrier(isSlideBarrier: boolean) {
    const group = new THREE.Group();
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.85, roughness: 0.2 });
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0xb45309 });

    if (isSlideBarrier) {
      // High barrier to slide under
      const barGeo = new THREE.BoxGeometry(3.0, 0.45, 0.2);
      const bar = new THREE.Mesh(barGeo, goldMat);
      bar.position.set(0, 2.2, 0);
      group.add(bar);

      const pL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.4, 0.25), stoneMat);
      pL.position.set(-1.4, 1.2, 0);
      const pR = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.4, 0.25), stoneMat);
      pR.position.set(1.4, 1.2, 0);
      group.add(pL, pR);

      group.userData = { type: 'barrier_slide' };
    } else {
      // Low barrier to jump over
      const hurdleGeo = new THREE.BoxGeometry(3.0, 0.9, 0.25);
      const hurdle = new THREE.Mesh(hurdleGeo, stoneMat);
      hurdle.position.set(0, 0.45, 0);

      const goldTrim = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.2, 0.3), goldMat);
      goldTrim.position.set(0, 0.85, 0);

      group.add(hurdle, goldTrim);
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
        this.spawnCoinArc(tLane, z + 8, 4, 3.0, 4.6, 1.0);
        this.spawnCoinLine(tLane, z - 4, 5, 3.2, 5.0);

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

    if (this.gameState === 'PLAYING') {
      this.updateGame(dt);
    } else if (this.gameState === 'INTRO_IDLE') {
      this.updateIntroIdle(dt);
    }

    this.renderer.render(this.scene, this.camera);
  };

  private updateIntroIdle(dt: number) {
    if (this.runner) {
      this.runner.sprayCan.rotation.y += dt * 3.0;
    }
  }

  private updateGame(dt: number) {
    // Dynamic Subway running speed (starts at 15.0 m/s ~54 km/h and accelerates smoothly)
    const baseSpeed = 15.0 + Math.min(18.0, (this.score / 2500) * 2.5);
    const moveZ = baseSpeed * dt;

    this.score += Math.round(moveZ * this.scoreMultiplier);
    this.trackMission('distance', Math.round(moveZ));

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

    // Runner Lateral Movement Lerp
    this.runner.root.position.x += (this.runner.targetX - this.runner.root.position.x) * 16.0 * dt;

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
          // Front ramp area
          if (hasRamp && rz <= (oz + halfLen + 5.5) && rz >= (oz + halfLen)) {
            const rampProgress = THREE.MathUtils.clamp(((oz + halfLen + 5.5) - rz) / 5.5, 0, 1);
            targetGroundY = Math.max(targetGroundY, rampProgress * (height + 0.25));
          } else if (rz < (oz + halfLen) && rz > (oz - halfLen - 0.5)) {
            // Rooftop area
            targetGroundY = Math.max(targetGroundY, height + 0.25);
          }
        }
      }
    }

    // 2. Vertical Movement & Gravity
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
        this.runner.vy -= 44.0 * dt;

        // Land on ground or train roof when falling
        if (this.runner.vy <= 0 && this.runner.y <= targetGroundY) {
          this.runner.y = targetGroundY;
          this.runner.vy = 0;
          this.runner.isJumping = false;
        }
      } else {
        // Player is not jumping: check if walking, ascending ramp, or falling off
        if (this.runner.y > targetGroundY + 0.05) {
          // Stepped off train roof or ramp into the open air -> Apply realistic falling gravity!
          this.runner.vy -= 44.0 * dt;
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

    // Dynamic Character Running & Stride Animation
    const strideFreq = baseSpeed * 1.15;
    this.runnerStridePhase += dt * strideFreq;

    if (this.runner.isSliding) {
      // Dive-Slide Pose
      this.runner.bodyGroup.rotation.x = Math.PI / 2.3;
      this.runner.bodyGroup.position.y = -0.65;
      this.runner.leftLegGroup.rotation.x = 0.9;
      this.runner.rightLegGroup.rotation.x = 0.9;
      this.runner.leftArmGroup.rotation.x = 1.0;
      this.runner.rightArmGroup.rotation.x = 1.0;
    } else if (this.runner.isJumping) {
      // Jump Pose: Arms up, legs bent back
      this.runner.bodyGroup.rotation.x = -0.15;
      this.runner.bodyGroup.position.y = 0;
      this.runner.leftArmGroup.rotation.x = -1.4;
      this.runner.rightArmGroup.rotation.x = -1.4;
      this.runner.leftLegGroup.rotation.x = 0.6;
      this.runner.rightLegGroup.rotation.x = -0.3;
    } else if (this.powerups['hoverboard']?.active) {
      // Surfing Pose on Hoverboard
      this.runner.bodyGroup.rotation.x = 0.05;
      this.runner.bodyGroup.rotation.y = 0.4;
      this.runner.bodyGroup.position.y = 0;
      this.runner.leftArmGroup.rotation.x = -0.4;
      this.runner.rightArmGroup.rotation.x = 0.5;
      this.runner.leftLegGroup.rotation.x = 0.2;
      this.runner.rightLegGroup.rotation.x = -0.2;
    } else {
      // Active Sprint Running Pose
      const lateralVel = (this.runner.targetX - this.runner.root.position.x);
      this.runner.bodyGroup.rotation.x = 0.15; // Forward lean
      this.runner.bodyGroup.rotation.z = -lateralVel * 0.12; // Bank into turns
      this.runner.bodyGroup.rotation.y = lateralVel * 0.08;
      this.runner.bodyGroup.position.y = Math.abs(Math.sin(this.runnerStridePhase * 2)) * 0.12;

      this.runner.leftLegGroup.rotation.x = Math.sin(this.runnerStridePhase) * 0.95;
      this.runner.rightLegGroup.rotation.x = -Math.sin(this.runnerStridePhase) * 0.95;
      this.runner.leftArmGroup.rotation.x = -Math.sin(this.runnerStridePhase) * 0.85;
      this.runner.rightArmGroup.rotation.x = Math.sin(this.runnerStridePhase) * 0.85;
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

    // Streak Combo Timer
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.streakCombo = 0;
      }
    }

    // Update World Track Chunks (Infinite scrolling)
    const CHUNK_LENGTH = 60;
    const NUM_CHUNKS = 5;
    this.trackChunks.forEach(chunk => {
      chunk.position.z += moveZ;
      if (chunk.position.z > CHUNK_LENGTH) {
        chunk.position.z -= NUM_CHUNKS * CHUNK_LENGTH;
      }
    });

    // Update World Objects
    for (let i = this.worldObjects.length - 1; i >= 0; i--) {
      const obj = this.worldObjects[i];
      obj.position.z += moveZ;

      if (obj.userData['type'] === 'train' && obj.userData['isMoving']) {
        obj.position.z += (obj.userData['speed'] as number) * dt;
      }

      if (obj.userData['type'] === 'coin' || obj.userData['type'] === 'key') {
        obj.rotation.y += 3.5 * dt;
        if (this.powerups['magnet']?.active) {
          const dist = obj.position.distanceTo(this.runner.root.position);
          if (dist < 25.0) {
            obj.position.lerp(this.runner.root.position, 16.0 * dt);
          }
        }
      }

      this.checkCollisions(obj, i);

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

    // Dynamic Camera Follow
    this.camera.position.x = this.runner.root.position.x * 0.45;
    this.camera.position.y = (this.runner.y > 4 ? 8.5 : 5.5) + this.runner.root.position.y * 0.3;
    this.camera.position.z = this.runner.root.position.z + 9.0;
    this.camera.lookAt(this.runner.root.position.x * 0.2, this.runner.y * 0.3 + 2.0, -18);
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
        this.voiceCallout('مفتاح رائع!');
        this.scene.remove(obj);
        this.worldObjects.splice(index, 1);
      }
      return;
    }

    // 1. Coin Collection
    if (obj.userData['type'] === 'coin') {
      if (Math.abs(rx - ox) < 1.2 && Math.abs(rz - oz) < 1.5 && Math.abs(ry - oy) < 1.8) {
        this.streakCombo++;
        this.comboTimer = 1.6;
        const mult = this.getComboMultiplier();
        const add = (this.powerups['multiplier']?.active ? 2 : 1) * mult;
        this.coins += add;
        this.totalCoins += add;
        this.trackMission('coins', add);
        this.playCoinSound();
        this.savePersistedData();
        this.scene.remove(obj);
        this.worldObjects.splice(index, 1);
      }
      return;
    }

    // 2. Mystery Box Collection
    if (obj.userData['type'] === 'mystery_box') {
      if (Math.abs(rx - ox) < 1.3 && Math.abs(rz - oz) < 1.6) {
        const winCoins = Math.floor(Math.random() * 200) + 50;
        this.coins += winCoins;
        this.totalCoins += winCoins;
        this.showBanner(`🎁 صندوق المفاجآت: +${winCoins} عملة ذهبية!`);
        this.playPowerupSound();
        this.savePersistedData();
        this.scene.remove(obj);
        this.worldObjects.splice(index, 1);
      }
      return;
    }

    // 3. Power-up Collection
    if (obj.userData['type'] === 'powerup') {
      if (Math.abs(rx - ox) < 1.3 && Math.abs(rz - oz) < 1.6) {
        const pType = obj.userData['pType'] as string;
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

    // 4. Train Collision
    if (obj.userData['type'] === 'train') {
      const halfLen = (obj.userData['length'] as number) / 2;
      const height = (obj.userData['height'] as number) || 4.2;

      if (Math.abs(rx - ox) < 1.05) {
        // Body collision only if below rooftop level inside train bounds
        if (rz < (oz + halfLen - 0.5) && rz > (oz - halfLen + 0.5)) {
          if (ry < (height - 0.5)) {
            this.handleObstacleHit('💥 اصطدمت بقطار مترو الفراعنة السريع!');
          }
        }
      }
      return;
    }

    // 5. Jump Barrier Collision
    if (obj.userData['type'] === 'barrier_jump') {
      if (Math.abs(rx - ox) < 1.2 && Math.abs(rz - oz) < 1.0) {
        if (ry < 1.2) {
          this.handleObstacleHit('🚧 اصطدمت بالحاجز الحجري! كان يجب القفز!');
        }
      }
      return;
    }

    // 6. Slide Barrier Collision
    if (obj.userData['type'] === 'barrier_slide') {
      if (Math.abs(rx - ox) < 1.2 && Math.abs(rz - oz) < 1.0) {
        if (!this.runner.isSliding) {
          this.handleObstacleHit('🚧 اصطدمت بالحاجز العلوي! كان يجب التزحلق!');
        }
      }
      return;
    }
  }

  private handleObstacleHit(subtitle: string) {
    if (this.invulnerabilityTimer > 0) return;

    if (this.powerups['hoverboard']?.active) {
      this.powerups['hoverboard'].active = false;
      this.runner.hoverboard.visible = false;
      this.invulnerabilityTimer = 2.5;
      this.playCrashSound();
      this.showBanner('🛹 لوح التزلج حماك من الاصطدام!');
      return;
    }

    this.playCrashSound();
    this.saveMeSubtitle = subtitle;
    this.triggerSaveMeModal('🚨 كدت أن تُمسك!', subtitle);
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
    this.invulnerabilityTimer = 3.5;
    this.chaseDistance = 45.0;

    // Clear Obstacles around player
    for (let i = this.worldObjects.length - 1; i >= 0; i--) {
      const obj = this.worldObjects[i];
      if (obj.userData['type'] === 'train' || obj.userData['type'] === 'barrier_jump' || obj.userData['type'] === 'barrier_slide') {
        this.scene.remove(obj);
        this.worldObjects.splice(i, 1);
      }
    }

    this.gameState = 'PLAYING';
    this.startMusic();
    this.showBanner('⚡ تم الإنعاش! موجة انفجار طهرت السكة!');
  }

  skipSaveMeAndGameOver() {
    if (this.saveMeInterval) clearInterval(this.saveMeInterval);
    this.gameOverSubtitle = this.saveMeSubtitle;
    this.gameState = 'GAMEOVER';
    this.stopMusic();
    this.savePersistedData();
    this.recordLeaderboardEntry();
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

  private moveRunnerLeft() {
    if (this.runner.laneIndex > 0) {
      this.runner.laneIndex--;
      this.runner.targetX = this.LANES[this.runner.laneIndex];
      this.trackMission('lane_changes', 1);
    }
  }

  private moveRunnerRight() {
    if (this.runner.laneIndex < 2) {
      this.runner.laneIndex++;
      this.runner.targetX = this.LANES[this.runner.laneIndex];
      this.trackMission('lane_changes', 1);
    }
  }

  private runnerJump() {
    if (!this.runner.isJumping) {
      this.runner.isJumping = true;
      this.runner.vy = this.powerups['sneakers']?.active ? 20.0 : 15.0;
      this.playJumpSound();
      this.trackMission('jumps', 1);
    }
  }

  private runnerSlide() {
    this.runner.isSliding = true;
    this.runner.slideTimer = 0.7;
    if (this.runner.y > 0) {
      this.runner.vy = -36.0; // Fast dive-down drop onto ground
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

    // Reset Runner & Inspector
    this.runner.laneIndex = 1;
    this.runner.targetX = 0;
    this.runner.root.position.set(0, 0, 0);
    this.runner.y = 0;
    this.runner.vy = 0;
    this.runner.isJumping = false;
    this.runner.isSliding = false;
    this.runner.hoverboard.visible = false;

    this.inspector.laneIndex = 1;
    this.inspector.targetX = 0;
    this.inspector.root.position.set(0, 0, 8);

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
      this.savePersistedData();
      this.showBanner(`👕 تم ارتداء ${skin.name}!`);
    } else if (this.totalCoins >= skin.price) {
      this.totalCoins -= skin.price;
      skin.unlocked = true;
      this.selectedSkin = skin.id;
      this.savePersistedData();
      this.showBanner(`🎉 مبروك فتح ${skin.name}!`);
    }
  }

  selectOrBuyBoard(board: HoverboardItem) {
    if (board.unlocked) {
      this.selectedBoard = board.id;
      this.savePersistedData();
      this.showBanner(`🛹 تم تجهيز ${board.name}!`);
    } else if (this.totalCoins >= board.price) {
      this.totalCoins -= board.price;
      board.unlocked = true;
      this.selectedBoard = board.id;
      this.savePersistedData();
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
