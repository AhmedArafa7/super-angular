import { Component, OnInit, OnDestroy, HostListener, ElementRef, ViewChild, inject, effect, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { GlobalStateService } from '../../core/services/global-state.service';
import { MultiplayerService } from '../../core/services/multiplayer.service';
import { ArcadeService, ArcadeGame } from './arcade.service';
import { FirebaseService } from '../../core/services/firebase.service';
import { ArcadeAudioService } from '../../core/services/arcade-audio.service';
import { ArcadeCloudService } from '../../core/services/arcade-cloud.service';
import { SuperArcadeBridgeService } from '../../core/services/super-arcade-bridge';

@Component({
  selector: 'app-arcade-arena',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div #container class="fixed inset-0 z-[60] bg-black flex flex-col" dir="rtl">
      <!-- Incoming Game Invites -->
      <div *ngIf="globalState.activeGameInvites().length > 0" class="fixed top-20 right-6 z-[100] flex flex-col gap-3 max-w-sm w-full">
         <div *ngFor="let invite of globalState.activeGameInvites()" class="bg-indigo-900/90 backdrop-blur-xl border border-indigo-400/50 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-right fade-in duration-500">
            <div class="flex items-center gap-3 mb-3">
               <img [src]="invite.fromAvatar" class="size-10 rounded-full border-2 border-indigo-400" alt="Avatar">
               <div>
                  <h4 class="text-white font-black text-sm">{{ invite.fromName }} يدعوك للعب</h4>
                  <p class="text-indigo-200 text-xs flex items-center gap-1.5">
                     <span>{{ invite.gameTitle }}</span>
                     <span *ngIf="invite.isCustom || invite.gameId?.startsWith('custom_game_')" class="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full border border-emerald-400/30 font-bold">لعبة محلية 🚀</span>
                  </p>
               </div>
            </div>
            <div class="flex gap-2">
               <button (click)="acceptInvite(invite)" class="flex-1 bg-indigo-500 hover:bg-indigo-400 text-white font-bold py-2 rounded-xl text-xs transition-colors">
                  قبول وانضمام
               </button>
               <button (click)="declineInvite(invite)" class="bg-white/10 hover:bg-white/20 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors">
                  رفض
               </button>
            </div>
         </div>
      </div>

      <!-- Immersive Header -->
      <header [class.hidden]="isImmersive" class="h-16 px-6 border-b border-white/5 bg-slate-900/80 backdrop-blur-xl flex items-center justify-between shrink-0 transition-all duration-300">
        <div class="flex items-center gap-4">
          <button (click)="goBack()" class="text-white/60 hover:text-white hover:bg-white/5 rounded-xl p-2 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
          </button>
          <div class="flex flex-col text-right" *ngIf="game">
             <h2 class="text-sm font-black text-white leading-none mb-1">{{ game.title }}</h2>
             <span class="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Arena Mode Active</span>
          </div>
        </div>

        <div class="flex items-center gap-2 md:gap-4">
           <!-- Direct Invite Friend Button -->
           <button (click)="openPrivateRoomInviteModal()" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shadow-lg shadow-indigo-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
              <span>دعوة صديق ✉️</span>
           </button>

           <!-- Game Status Indicators -->
           <div class="hidden md:flex items-center gap-6 px-4 py-1.5 bg-white/5 rounded-full border border-white/5">
              <div class="flex items-center gap-2">
                 <svg xmlns="http://www.w3.org/2000/svg" class="size-4" [ngClass]="{'text-green-400': multiplayer.connectionState() === 'connected' || gameState !== 'Waiting...', 'text-amber-400': multiplayer.connectionState() === 'connecting', 'text-red-400': multiplayer.connectionState() === 'failed'}" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                 <span class="text-[10px] font-black text-white uppercase">{{ multiplayer.connectionState() === 'connected' ? 'P2P Connected' : multiplayer.connectionState() === 'connecting' ? 'Connecting...' : gameState }}</span>
              </div>
           </div>

           <!-- Settings: Rotate & Immersive -->
           <button (click)="isRotated = !isRotated" class="text-white/40 hover:text-white rounded-lg p-2 transition-colors" [class.bg-white_10]="isRotated" title="تدوير الشاشة (Rotate)">
              <svg xmlns="http://www.w3.org/2000/svg" class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
           </button>

           <button (click)="toggleImmersive()" class="text-white/40 hover:text-white rounded-lg p-2 transition-colors" title="ملء الشاشة (Immersive)">
              <svg xmlns="http://www.w3.org/2000/svg" class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
           </button>

           <button *ngIf="game" (click)="showGamepad = !showGamepad" class="text-white/40 hover:text-white rounded-lg p-2 transition-colors" [ngClass]="{'text-indigo-400': showGamepad, 'bg-indigo-500/10': showGamepad}" title="Toggle Mobile Gamepad">
              <svg xmlns="http://www.w3.org/2000/svg" class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" /></svg>
           </button>
        </div>
      </header>

      <!-- Dynamic Mode Selection Menu -->
      <div *ngIf="showModeOverlay" id="arena-menu-overlay" class="absolute inset-0 z-50 flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-500 overflow-hidden" 
           [style.background]="getDynamicGradient()">
         
         <!-- Floating Theme Emojis Animation Overlay -->
         <div *ngIf="activeTheme" class="absolute inset-0 pointer-events-none select-none z-1 text-4xl opacity-20 overflow-hidden flex flex-wrap items-center justify-around leading-[140px] animate-pulse">
            {{ activeTheme.floatingEmojis }}
         </div>

         <!-- Fullscreen HD Game Wallpaper -->
         <img *ngIf="game && !bgImageFailed" 
              [src]="bgUrl" 
              (error)="onBgError()" 
              class="absolute inset-0 w-full h-full object-cover pointer-events-none z-0">

         <!-- Blurred / scaled game thumbnail background decoration fallback -->
         <div *ngIf="bgImageFailed" class="absolute inset-0 opacity-25 pointer-events-none bg-cover bg-center blur-2xl scale-110"
              [style.background-image]="game && game.thumbnail && !game.thumbnail.startsWith('data:') ? 'url(' + game.thumbnail + ')' : 'none'">
         </div>
         
         <!-- Dynamic Menu Container -->
         <div id="arena-menu-container" 
              class="relative w-full max-w-sm flex flex-col gap-5 z-10 p-8 rounded-[36px] backdrop-blur-xl shadow-2xl transition-all duration-300 border-2"
              [style.background]="activeTheme && activeTheme.cardBg ? activeTheme.cardBg : 'rgba(15, 23, 42, 0.88)'"
              [style.border-color]="activeTheme ? activeTheme.primaryColor : 'rgba(255,255,255,0.15)'"
              [style.box-shadow]="activeTheme ? '0 25px 60px rgba(0,0,0,0.85), 0 0 25px ' + activeTheme.borderColor : '0 25px 60px rgba(0,0,0,0.85)'">
            
            <!-- Custom Game Theme Badge -->
            <div *ngIf="activeTheme" 
                 class="absolute -top-4 right-7 text-white text-xs font-black px-4 py-1.5 rounded-full shadow-xl z-20 border border-white/20 tracking-wider"
                 [style.background]="activeTheme.badgeBg">
               {{ activeTheme.badge }}
            </div>

            <!-- Private Room Button (PLAY) -->
            <button (click)="selectMode('private')" class="arena-btn btn-play group">
               <span>🎯 إنشاء غرفة وتحدي صديق</span>
            </button>
            <button (click)="openJoinRoomModal()" class="arena-btn btn-join">
              <span>🔑 الانضمام بكود الغرفة</span>
            </button>

            <!-- Local Play Button -->
            <button (click)="selectMode('local')" class="arena-btn btn-local">
               <span>👥 اللعب محلياً (نفس الجهاز)</span>
            </button>

            <!-- Online Matchmaking Button -->
            <div class="pro-btn-wrapper relative">
               <div *ngIf="!globalState.userProfile().isPro" class="pro-lock-overlay">
                  <span>اشتراك Pro فقط 🔒</span>
               </div>
               <button (click)="selectMode('pro')" [disabled]="!globalState.userProfile().isPro" class="arena-btn btn-online">
                  <span>🏆 لعب أونلاين Pro</span>
               </button>
            </div>

            <!-- Quit Button -->
            <button (click)="goBack()" class="arena-btn btn-quit">
               <span>🚪 خروج</span>
            </button>

         </div>
      </div>

      <!-- Private Room Modal (Host View) -->
      <div *ngIf="showPrivateRoomModal" class="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
         <div class="bg-slate-900 border border-white/10 rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl animate-in zoom-in-95">
            <h3 class="text-2xl font-black text-white mb-2">غرفتك جاهزة!</h3>
            <p class="text-sm text-slate-400 mb-6">شارك هذا الرابط مع أصدقائك لينضموا إليك</p>
            
            <div class="bg-black/50 border border-white/5 rounded-2xl p-4 mb-4 flex items-center justify-between gap-3">
               <span class="text-lg font-mono font-black text-emerald-400 truncate">{{ generatedRoomCode }}</span>
               <button (click)="copyRoomLink()" class="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10 p-2 rounded-lg transition-colors flex-shrink-0" title="Copy Link">
                  <svg xmlns="http://www.w3.org/2000/svg" class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
               </button>
            </div>
            
            <div class="flex items-center justify-center gap-3 mt-4">
               <svg xmlns="http://www.w3.org/2000/svg" class="size-5 text-indigo-400 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
               <span class="text-sm font-bold text-indigo-400 uppercase tracking-widest">Waiting for player...</span>
            </div>
            <p *ngIf="copied" class="text-xs text-emerald-400 mt-2 animate-in fade-in slide-in-from-bottom-2">تم نسخ الرابط بنجاح!</p>

            <!-- Friend Invites Section -->
            <div class="mt-6 border-t border-white/10 pt-4 text-right">
               <h4 class="text-sm font-bold text-slate-300 mb-3 text-center">أصدقاؤك المتصلون</h4>
               <div *ngIf="globalState.friends().length > 0; else noFriends" class="flex flex-col gap-2 max-h-40 overflow-y-auto custom-scrollbar px-2">
                  <div *ngFor="let friend of globalState.friends()" class="flex items-center justify-between bg-black/40 border border-white/5 p-2 rounded-xl">
                     <div class="flex items-center gap-2">
                        <img [src]="friend.avatarUrl" class="size-8 rounded-full border border-white/10" alt="Avatar">
                        <span class="text-sm font-bold text-white">{{ friend.name }}</span>
                     </div>
                     <button (click)="inviteFriend(friend.id)" [disabled]="invitedFriends.includes(friend.id)" class="text-xs font-bold px-3 py-1.5 rounded-lg transition-colors" [ngClass]="invitedFriends.includes(friend.id) ? 'bg-slate-800 text-slate-500' : 'bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white'">
                        {{ invitedFriends.includes(friend.id) ? 'تم الإرسال ✓' : 'دعوة ✉️' }}
                     </button>
                  </div>
               </div>
               <ng-template #noFriends>
                  <p class="text-xs text-slate-400 text-center py-2">لا يوجد أصدقاء متصلين حالياً. يمكنك مشاركة الكود أعلاه مباشرة مع صديقك!</p>
               </ng-template>
            </div>

            <button (click)="showPrivateRoomModal = false" class="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 rounded-xl text-xs transition-colors mt-4">
               إغلاق والعودة للعبة
            </button>
         </div>
      </div>

      <!-- Join Room Modal -->
      <div *ngIf="showJoinRoomModal" class="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
         <div class="bg-slate-900 border border-white/10 rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl animate-in zoom-in-95">
            <h3 class="text-2xl font-black text-white mb-2">انضم لغرفة</h3>
            <p class="text-sm text-slate-400 mb-6">اكتب كود الغرفة المرسل من صاحب الجلسة</p>

            <input
              type="text"
              [(ngModel)]="joinRoomCode"
              maxlength="12"
              placeholder="مثال: 6REN7S"
              class="w-full bg-black/50 border border-white/10 rounded-2xl px-4 py-3 text-center text-emerald-400 font-mono font-black tracking-[0.15em] uppercase outline-none focus:border-emerald-500/50 mb-4"
            />

            <div class="flex gap-3">
               <button (click)="showJoinRoomModal = false; showModeOverlay = true" class="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3 rounded-xl transition-colors">
                  رجوع
               </button>
               <button (click)="joinRoomByCode()" [disabled]="joiningRoom || !joinRoomCode.trim()" class="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-3 rounded-xl transition-colors">
                  {{ joiningRoom ? 'جارٍ الانضمام...' : 'انضم الآن' }}
               </button>
            </div>
         </div>
      </div>

      <!-- Game Stage -->
      <div *ngIf="selectedMode && !showPrivateRoomModal && !showJoinRoomModal" class="flex-1 relative bg-black overflow-hidden flex items-center justify-center animate-in fade-in duration-1000">
        <div *ngIf="isLoading" class="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950">
           <div class="size-20 bg-indigo-500/10 rounded-full flex items-center justify-center mb-6 border border-indigo-500/20 animate-pulse">
              <svg xmlns="http://www.w3.org/2000/svg" class="size-10 text-indigo-500 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
           </div>
           <p class="font-black text-white/40 uppercase tracking-[0.3em] animate-pulse">Launching Arena</p>
        </div>
        
        <div class="absolute inset-0 z-0 flex items-center justify-center transition-all duration-500 overflow-hidden" [ngClass]="{'opacity-0': isLoading, 'opacity-100': !isLoading}">
           <iframe *ngIf="safeUrl"
             #gameIframe
             [src]="safeUrl"
             class="border-none transition-all duration-500 origin-center"
             [style.width]="isRotated ? '100vh' : '100%'"
             [style.height]="isRotated ? '100vw' : '100%'"
             [style.transform]="isRotated ? 'rotate(90deg)' : 'none'"
             (load)="onIframeLoad()"
             sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
             [title]="game?.title">
           </iframe>
        </div>

        <!-- Exit Immersive Button -->
        <button *ngIf="isImmersive" (click)="toggleImmersive()" class="absolute top-4 right-4 z-50 bg-black/50 hover:bg-black/80 text-white rounded-full p-3 backdrop-blur-md border border-white/10 transition-all shadow-lg animate-in fade-in">
           <svg xmlns="http://www.w3.org/2000/svg" class="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <!-- Virtual Gamepad Overlay -->
        <div *ngIf="showGamepad && !isLoading" class="absolute inset-x-0 bottom-0 pointer-events-none z-50 flex justify-between px-6 pb-6 md:px-12 md:pb-12" dir="ltr">
           <!-- D-Pad -->
           <div class="relative size-32 opacity-70 pointer-events-auto">
              <button (touchstart)="simulateKey(getMovementBindings().up[0], getMovementBindings().up[1] || getMovementBindings().up[0], true, $event)" (touchend)="simulateKey(getMovementBindings().up[0], getMovementBindings().up[1] || getMovementBindings().up[0], false, $event)" (touchcancel)="simulateKey(getMovementBindings().up[0], getMovementBindings().up[1] || getMovementBindings().up[0], false, $event)" class="absolute top-0 left-1/2 -translate-x-1/2 bg-white/20 active:bg-white/40 w-10 h-12 rounded-t-xl backdrop-blur-md border border-white/10 flex items-center justify-center">
                 <svg xmlns="http://www.w3.org/2000/svg" class="size-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" /></svg>
              </button>
              <button (touchstart)="simulateKey(getMovementBindings().down[0], getMovementBindings().down[1] || getMovementBindings().down[0], true, $event)" (touchend)="simulateKey(getMovementBindings().down[0], getMovementBindings().down[1] || getMovementBindings().down[0], false, $event)" (touchcancel)="simulateKey(getMovementBindings().down[0], getMovementBindings().down[1] || getMovementBindings().down[0], false, $event)" class="absolute bottom-0 left-1/2 -translate-x-1/2 bg-white/20 active:bg-white/40 w-10 h-12 rounded-b-xl backdrop-blur-md border border-white/10 flex items-center justify-center">
                 <svg xmlns="http://www.w3.org/2000/svg" class="size-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
              </button>
              <button (touchstart)="simulateKey(getMovementBindings().left[0], getMovementBindings().left[1] || getMovementBindings().left[0], true, $event)" (touchend)="simulateKey(getMovementBindings().left[0], getMovementBindings().left[1] || getMovementBindings().left[0], false, $event)" (touchcancel)="simulateKey(getMovementBindings().left[0], getMovementBindings().left[1] || getMovementBindings().left[0], false, $event)" class="absolute top-1/2 left-0 -translate-y-1/2 bg-white/20 active:bg-white/40 w-12 h-10 rounded-l-xl backdrop-blur-md border border-white/10 flex items-center justify-center">
                 <svg xmlns="http://www.w3.org/2000/svg" class="size-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button (touchstart)="simulateKey(getMovementBindings().right[0], getMovementBindings().right[1] || getMovementBindings().right[0], true, $event)" (touchend)="simulateKey(getMovementBindings().right[0], getMovementBindings().right[1] || getMovementBindings().right[0], false, $event)" (touchcancel)="simulateKey(getMovementBindings().right[0], getMovementBindings().right[1] || getMovementBindings().right[0], false, $event)" class="absolute top-1/2 right-0 -translate-y-1/2 bg-white/20 active:bg-white/40 w-12 h-10 rounded-r-xl backdrop-blur-md border border-white/10 flex items-center justify-center">
                 <svg xmlns="http://www.w3.org/2000/svg" class="size-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
              </button>
              <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/10 w-10 h-10 backdrop-blur-md"></div>
           </div>

           <!-- Action Buttons -->
           <div class="flex items-end gap-4 opacity-70 pointer-events-auto pb-4">
              <button *ngFor="let action of getActionBindings(); let i = index"
                (touchstart)="simulateKey(action.keys[0], action.keys[1] || action.keys[0], true, $event)"
                (touchend)="simulateKey(action.keys[0], action.keys[1] || action.keys[0], false, $event)"
                (touchcancel)="simulateKey(action.keys[0], action.keys[1] || action.keys[0], false, $event)"
                class="w-14 h-14 rounded-full backdrop-blur-md border flex items-center justify-center text-white font-black text-sm select-none"
                [ngClass]="getActionButtonClass(action.style)"
                [style.marginBottom]="i % 2 === 0 ? '1.5rem' : '0'">
                 {{ action.label }}
              </button>
           </div>
        </div>

        <!-- HUD -->
        <div class="absolute top-8 right-8 pointer-events-none flex flex-col gap-2 text-left" dir="ltr">
           <div class="flex items-center gap-2 bg-black/50 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-md">
              <div class="font-mono text-[10px] text-white/80 uppercase tracking-widest">Time: {{ formatPlayTime(playTime) }}</div>
           </div>
         <div *ngIf="lastWinner" class="flex items-center gap-2 bg-indigo-500/20 px-3 py-1.5 rounded-full border border-indigo-500/50 backdrop-blur-md text-indigo-200 text-xs font-bold animate-in slide-in-from-right">
               Latest Result: {{ lastWinner }}
            </div>
         </div>
      </div>

      <!-- Team Deployment Modal (علامة انتشار الفريق) -->
      @if (showTeamDeploymentModal) {
        <div class="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4" dir="rtl">
          <div class="bg-slate-900 border border-indigo-500/40 rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <div class="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
              <h3 class="text-2xl font-black text-white flex items-center gap-3">
                <span class="p-2.5 bg-indigo-600/20 rounded-2xl text-indigo-400">🛡️</span>
                علامة انتشار الفريق (Team Deployment)
              </h3>
            </div>
            <p class="text-slate-300 text-sm mb-6 leading-relaxed">
              بما أن هذه اللعبة تدعم أكثر من لاعبين، يرجى اختيار وتوزيع الفرق بين اللاعبين المنضمين قبل بدء اللعب رسمياً:
            </p>
            
            <div class="space-y-4 mb-8">
              <label class="block p-4 rounded-2xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-all flex items-center justify-between">
                <div>
                  <span class="block font-bold text-white text-base">التوزيع المتوازن (Balanced Squads)</span>
                  <span class="text-xs text-slate-400">توزيع اللاعبين بالتساوي على الفرق المتاحة</span>
                </div>
                <input type="radio" name="teamSetup" [(ngModel)]="selectedTeamSetup" value="balanced" class="accent-indigo-500 size-4">
              </label>

              <label class="block p-4 rounded-2xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-all flex items-center justify-between">
                <div>
                  <span class="block font-bold text-white text-base">اللاعب ضد الجميع (Free For All)</span>
                  <span class="text-xs text-slate-400">كل لاعب يلعب بشكل مستقل بذاته</span>
                </div>
                <input type="radio" name="teamSetup" [(ngModel)]="selectedTeamSetup" value="ffa" class="accent-indigo-500 size-4">
              </label>
            </div>

            <button (click)="confirmTeamDeployment()" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-600/30 transition-all text-base">
              تأكيد الانتشار وبدء اللعبة ⚡
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    #arena-menu-overlay { font-family: 'Fredoka One', system-ui, sans-serif; }
    #arena-menu-container {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 40px;
      padding: 2rem 1.5rem;
      box-shadow: 0 20px 50px rgba(0,0,0,0.5);
    }
    .arena-btn {
      width: 100%;
      height: 4rem;
      border-radius: 9999px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      font-weight: 900;
      font-size: 1.5rem;
      letter-spacing: 0.1em;
      color: white;
      transition: all 0.2s ease;
      cursor: pointer;
      position: relative;
      overflow: hidden;
    }
    .arena-btn:hover { transform: translateY(-4px); filter: brightness(1.1); }
    .arena-btn:active { transform: translateY(4px); }
    
    .btn-play { background: #ff0066; border-bottom: 6px solid #cc0052; box-shadow: 0 5px 15px rgba(255,0,102,0.4); }
    .btn-join { background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.2); height: 3rem; font-size: 1.2rem; }
    .btn-local { background: #ff9900; border-bottom: 6px solid #cc7a00; box-shadow: 0 5px 15px rgba(255,153,0,0.4); }
    .btn-online { background: #3366ff; border-bottom: 6px solid #2952cc; box-shadow: 0 5px 15px rgba(51,102,255,0.4); }
    .btn-quit { background: #33cc33; border-bottom: 6px solid #29a329; box-shadow: 0 5px 15px rgba(51,204,51,0.4); }

    .pro-lock-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0,0,0,0.6);
      backdrop-filter: blur(4px);
      border-radius: 9999px;
      z-index: 20;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fbbf24;
      font-weight: 900;
      font-size: 0.875rem;
      letter-spacing: 0.1em;
      text-shadow: 0 2px 4px rgba(0,0,0,0.5);
    }
  `]
})
export class ArcadeArenaComponent implements OnInit, OnDestroy {
  game: ArcadeGame | undefined;
  safeUrl: SafeResourceUrl | null = null;
  gameVersion: string | null = null;
  isLoading = true;
  isFullscreen = false;
  isRotated = false;
  isImmersive = false;
  
  playTime = 0;
  private timer: any;
  gameState = 'Waiting...';
  lastWinner = '';

  selectedMode: 'local' | 'private' | 'pro' | 'custom' | null = null;
  showModeOverlay = true;
  showPrivateRoomModal = false;
  showJoinRoomModal = false;
  generatedRoomCode = '';
  joinRoomCode = '';
  joiningRoom = false;
  privateRoomRole: 'host' | 'guest' | null = null;
  showGamepad = false;

  private arcadeAudio = inject(ArcadeAudioService);

  @ViewChild('container') containerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('gameIframe') iframeRef!: ElementRef<HTMLIFrameElement>;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private arcadeService = inject(ArcadeService);
  private sanitizer = inject(DomSanitizer);
  private cdr = inject(ChangeDetectorRef);
  globalState = inject(GlobalStateService);
  multiplayer = inject(MultiplayerService);
  private firebaseService = inject(FirebaseService);
  arcadeCloud = inject(ArcadeCloudService);
  arcadeBridge = inject(SuperArcadeBridgeService);

  @HostListener('window:message', ['$event'])
  onWindowMessage(event: MessageEvent) {
    const data = event.data;
    if (!data || typeof data !== 'object') return;

    if (data.type === 'SUPER_ARCADE_SCORE_SUBMIT') {
      const playerName = this.globalState.userProfile().name || 'لاعب Arcade';
      this.arcadeCloud.submitHighScore(data.gameId, playerName, data.score);
    } else if (data.type === 'SUPER_ARCADE_P2P_SEND') {
      this.multiplayer.sendMessage({ action: data.action, payload: data.payload });
    }
  }

  copied = false;
  invitedFriends: string[] = [];
  showTeamDeploymentModal = false;
  selectedTeamSetup = 'balanced';
  teamDeploymentCompleted = false;

  constructor() {
    effect(() => {
      const state = this.multiplayer.connectionState();
      if (state === 'connected' && this.selectedMode === 'private') {
        this.launchGame();
      } else if (state === 'failed') {
        if (this.game && (this.game.id.startsWith('custom_game_') || this.selectedMode !== 'private')) {
          console.warn('P2P connection state failed, continuing in local mode.');
          this.launchGame();
        } else {
          alert('فشل الاتصال بالغرفة. قد تكون الغرفة غير موجودة أو انتهت صلاحيتها.');
          this.goBack();
        }
      }
    });

    effect(() => {
      const msg = this.multiplayer.onMessageReceived();
      if (msg && this.iframeRef?.nativeElement?.contentWindow) {
        // Forward WebRTC message to iframe
        this.iframeRef.nativeElement.contentWindow.postMessage(msg, '*');
      }
    });
  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const gameId = params.get('id');
      if (gameId) {
        this.arcadeService.getGameById(gameId).subscribe(game => {
          if (game && (game.localUrl || gameId.startsWith('custom_game_'))) {
            this.game = game;
            this.loadGameMenuTheme(gameId);
            if (!this.route.snapshot.queryParamMap.has('room')) {
              this.selectedMode = null;
              this.showModeOverlay = true;
            }
          } else {
            this.goBack();
          }
        });
      }
    });

    this.route.queryParamMap.subscribe(params => {
      const room = params.get('room');
      const isHost = params.get('host') === 'true';
      const version = params.get('v');
      
      if (version) {
        this.gameVersion = version;
      }
      
      if (room) {
        this.generatedRoomCode = room.trim().toUpperCase();
        this.selectedMode = 'private';
        this.showModeOverlay = false;
        this.showPrivateRoomModal = false;
        this.showJoinRoomModal = false;

        if (isHost) {
          this.privateRoomRole = 'host';
          this.multiplayer.createRoom(this.generatedRoomCode).catch(e => console.warn('Host createRoom:', e));
        } else {
          this.privateRoomRole = 'guest';
          this.multiplayer.joinRoom(this.generatedRoomCode).catch(e => console.warn('Guest joinRoom:', e));
        }

        // Launch game iframe automatically
        this.launchGame();
      }
    });

    this.timer = setInterval(() => {
      if (!this.isLoading && this.selectedMode && !this.showPrivateRoomModal && this.multiplayer.connectionState() !== 'connecting') {
        this.playTime++;
      }
    }, 1000);
  }

  bgImageFailed = false;
  bgTimestamp = Date.now();
  bgUrl = '';
  activeTheme: any = null;

  private gameThemes: Record<string, any> = {
    'subway-surfers': {
      badge: '🚇 SUBWAY SURFERS 3D 🏃‍♂️👮‍♂️',
      primaryColor: '#f59e0b',
      borderColor: 'rgba(245, 158, 11, 0.7)',
      floatingEmojis: '🚇   🏃‍♂️   👮‍♂️   🪙   🛹   ⚡',
      badgeBg: 'linear-gradient(135deg, #f59e0b, #ea580c, #ef4444)',
      cardBg: 'linear-gradient(145deg, rgba(15, 23, 42, 0.94), rgba(2, 6, 23, 0.96))'
    },
    'memory-match': {
      badge: '🧠 MEMORY MATCH 💡',
      primaryColor: '#38bdf8',
      borderColor: 'rgba(56, 189, 248, 0.6)',
      floatingEmojis: '🧠   💡   ❓   ⭐   ✨',
      badgeBg: 'linear-gradient(135deg, #0284c7, #8b5cf6)'
    },
    'fruit-slicer': {
      badge: '🍉 FRUIT SLICER ⚔️',
      primaryColor: '#ef4444',
      borderColor: 'rgba(239, 68, 68, 0.6)',
      floatingEmojis: '🍉   🍊   🍍   🍓   ⚔️',
      badgeBg: 'linear-gradient(135deg, #ef4444, #f59e0b, #10b981)'
    },
    'typing-defense': {
      badge: '⌨️ TYPING DEFENSE ⚡',
      primaryColor: '#a855f7',
      borderColor: 'rgba(168, 85, 247, 0.6)',
      floatingEmojis: '⌨️   ⚡   💥   🔤   🎯',
      badgeBg: 'linear-gradient(135deg, #a855f7, #ec4899)'
    },
    'flappy-clone': {
      badge: '🐦 FLAPPY BIRD ☁️',
      primaryColor: '#0284c7',
      borderColor: 'rgba(2, 132, 199, 0.6)',
      floatingEmojis: '🐦   ☁️   🍃   🪙   ✨',
      badgeBg: 'linear-gradient(135deg, #0284c7, #22c55e)'
    },
    'air-hockey': {
      badge: '🏒 AIR HOCKEY ⚡',
      primaryColor: '#38bdf8',
      borderColor: 'rgba(56, 189, 248, 0.6)',
      floatingEmojis: '🏒   🔴   🔵   🏒   ✨',
      badgeBg: 'linear-gradient(135deg, #0284c7, #38bdf8)'
    },
    'ludo-party': {
      badge: '🎲 POLO 🌟',
      primaryColor: '#a855f7',
      borderColor: 'rgba(168, 85, 247, 0.7)',
      floatingEmojis: '🎲   🟣   🌸   ⬛   🟤   ⭐',
      badgeBg: 'linear-gradient(135deg, #a855f7, #ec4899, #334155, #8b4513)'
    },
    'crazy-uno': {
      badge: '🎴 JOHN CARD GAME 🎴',
      primaryColor: '#a855f7',
      borderColor: 'rgba(168, 85, 247, 0.7)',
      floatingEmojis: '🎴   🟪   ⬛   ⚡   JOHN',
      badgeBg: 'linear-gradient(135deg, #7e22ce, #a855f7)',
      cardBg: 'linear-gradient(145deg, rgba(15, 5, 29, 0.95), rgba(8, 1, 18, 0.96))'
    },
    'bomb-arena': {
      badge: '💣 BOMB ARENA 💥',
      primaryColor: '#f97316',
      borderColor: 'rgba(249, 115, 22, 0.6)',
      floatingEmojis: '💥   💣   🔥   💥   💣   🔥',
      badgeBg: 'linear-gradient(135deg, #f97316, #ef4444)'
    },
    'tick-tock-bomb': {
      badge: '💣 TICK TOCK BOMB ⏰',
      primaryColor: '#f97316',
      borderColor: 'rgba(249, 115, 22, 0.8)',
      floatingEmojis: '💣   ⏰   🔥   💥   ⚡',
      badgeBg: 'linear-gradient(135deg, #ef4444, #f59e0b)',
      cardBg: 'linear-gradient(145deg, rgba(30, 10, 10, 0.95), rgba(45, 15, 15, 0.95))'
    },
    'space-shooter': {
      badge: '🚀 SPACE SHOOTER 👾',
      primaryColor: '#3b82f6',
      borderColor: 'rgba(59, 130, 246, 0.6)',
      floatingEmojis: '🚀   👾   💥   ⭐   🌌',
      badgeBg: 'linear-gradient(135deg, #1d4ed8, #7c3aed)'
    },
    'space-deception': {
      badge: '🚀 SPACE DECEPTION 🔪',
      primaryColor: '#ef4444',
      borderColor: 'rgba(239, 68, 68, 0.8)',
      floatingEmojis: '🚀   🔪   🚨   🌌   👾',
      badgeBg: 'linear-gradient(135deg, #ef4444, #3b82f6)',
      cardBg: 'linear-gradient(145deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95))'
    },
    'tank-battle': {
      badge: '⚔️ TANK BATTLE 💥',
      primaryColor: '#ef4444',
      borderColor: 'rgba(239, 68, 68, 0.6)',
      floatingEmojis: '💥   🛡️   💣   🎯   ⚡',
      badgeBg: 'linear-gradient(135deg, #b91c1c, #f59e0b)'
    },
    'cairo-runner': {
      badge: '🛺 CAIRO RUNNER 🚦',
      primaryColor: '#f59e0b',
      borderColor: 'rgba(245, 158, 11, 0.6)',
      floatingEmojis: '🛺   🚌   🚗   🚦   ⚡',
      badgeBg: 'linear-gradient(135deg, #d97706, #ef4444)'
    },
    'spot-differences': {
      badge: '🔍 SPOT DIFFERENCES 👁️',
      primaryColor: '#8b5cf6',
      borderColor: 'rgba(139, 92, 246, 0.6)',
      floatingEmojis: '🔍   👁️   ❓   💡   ✨',
      badgeBg: 'linear-gradient(135deg, #6d28d9, #0284c7)'
    },
    'strategic-xo': {
      badge: '❌ STRATEGIC XO ⭕',
      primaryColor: '#06b6d4',
      borderColor: 'rgba(6, 182, 212, 0.7)',
      floatingEmojis: '❌   ⭕   🎯   ⚔️   ✨',
      badgeBg: 'linear-gradient(135deg, #06b6d4, #f43f5e)',
      cardBg: 'linear-gradient(145deg, rgba(15, 23, 42, 0.94), rgba(3, 7, 18, 0.96))'
    },
    'card-battle': {
      badge: '🃏 CARD BATTLE 🛡️',
      primaryColor: '#6366f1',
      borderColor: 'rgba(99, 102, 241, 0.6)',
      floatingEmojis: '🃏   ⚔️   🛡️   💥   👑',
      badgeBg: 'linear-gradient(135deg, #4338ca, #be185d)'
    },
    'math-racer': {
      badge: '🏎️ MATH RACER ⚡',
      primaryColor: '#eab308',
      borderColor: 'rgba(234, 179, 8, 0.6)',
      floatingEmojis: '🏎️   ➕   ➖   ✖️   🏁',
      badgeBg: 'linear-gradient(135deg, #ca8a04, #16a34a)'
    },
    'dragon-dungeon': {
      badge: '🐉 DRAGON DUNGEON ⚔️',
      primaryColor: '#f97316',
      borderColor: 'rgba(249, 115, 22, 0.6)',
      floatingEmojis: '🐉   ⚔️   🛡️   🔥   💎',
      badgeBg: 'linear-gradient(135deg, #ea580c, #b91c1c)'
    },
    'snake-arena': {
      badge: '🐍 SNAKE ARENA 🍎',
      primaryColor: '#10b981',
      borderColor: 'rgba(16, 185, 129, 0.6)',
      floatingEmojis: '🐍   🍎   ⭐   💥   ✨',
      badgeBg: 'linear-gradient(135deg, #059669, #0284c7)'
    },
    'werewolf-village': {
      badge: '🐺 WEREWOLF VILLAGE 🌕',
      primaryColor: '#64748b',
      borderColor: 'rgba(100, 116, 139, 0.6)',
      floatingEmojis: '🐺   🌕   🕯️   🌲   💀',
      badgeBg: 'linear-gradient(135deg, #334155, #b91c1c)'
    },
    'spyfall': {
      badge: '🕵️ SPYFALL 🔎',
      primaryColor: '#0ea5e9',
      borderColor: 'rgba(14, 165, 233, 0.8)',
      floatingEmojis: '🕵️   🔎   ❓   ⏱️   🕶️',
      badgeBg: 'linear-gradient(135deg, #0284c7, #4f46e5)',
      cardBg: 'linear-gradient(145deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95))'
    }
  };

  loadGameMenuTheme(gameId: string) {
    if (!gameId) return;
    this.bgTimestamp = Date.now();
    this.bgImageFailed = false;
    this.bgUrl = `/assets/games/${gameId}/bg.png?v=${this.bgTimestamp}`;
    this.activeTheme = this.gameThemes[gameId] || null;
    
    const tryFetchTheme = (url: string, fallbackUrl?: string) => {
      fetch(url).then(res => {
        if (res.ok) return res.text();
        throw new Error('404');
      }).then(cssText => {
        if (!cssText || cssText.trim().startsWith('<!DOCTYPE')) {
          throw new Error('Invalid CSS text');
        }
        let styleTag = document.getElementById('game-menu-theme') as HTMLStyleElement;
        if (!styleTag) {
          styleTag = document.createElement('style');
          styleTag.id = 'game-menu-theme';
          document.head.appendChild(styleTag);
        }
        styleTag.textContent = cssText;
      }).catch(() => {
        if (fallbackUrl) {
          tryFetchTheme(fallbackUrl);
        } else {
          this.removeGameMenuTheme();
        }
      });
    };

    tryFetchTheme(`/assets/games/${gameId}/menu-theme.css?v=${this.bgTimestamp}`, `/games/${gameId}/menu-theme.css?v=${this.bgTimestamp}`);
  }

  onBgError() {
    if (this.bgUrl.startsWith('/assets/games/')) {
      this.bgUrl = `/games/${this.game?.id}/bg.png?v=${this.bgTimestamp}`;
    } else {
      this.bgImageFailed = true;
    }
  }

  removeGameMenuTheme() {
    const styleTag = document.getElementById('game-menu-theme');
    if (styleTag) {
      styleTag.remove();
    }
  }

  async selectMode(mode: 'local' | 'private' | 'pro') {
    if (mode === 'pro' && !this.globalState.userProfile().isPro) {
      alert('عذراً، هذا النمط متاح للمشتركين في باقة Pro فقط. قم بالترقية الآن!');
      return;
    }
    
    this.arcadeAudio.playSfx(0.8);
    this.selectedMode = mode;
    this.showModeOverlay = false;
    
    if (mode === 'private') {
      this.privateRoomRole = 'host';
      this.generatedRoomCode = 'جاري...';
      this.showPrivateRoomModal = true;
      try {
        const code = await this.multiplayer.createRoom();
        this.generatedRoomCode = code;
        const hostName = this.globalState.userProfile().name || 'مستضيف الغرفة';
        await this.arcadeCloud.registerPrivateRoom(code, this.game?.id || 'arcade_game', code || 'host_peer', hostName);
      } catch (err) {
        console.error('Failed to create room:', err);
        alert('فشل إنشاء الغرفة. تأكد من اتصالك بالإنترنت أو إعدادات السيرفر.');
        this.showPrivateRoomModal = false;
        this.showModeOverlay = true;
      }
    } else {
      this.launchGame();
    }
  }

  async openPrivateRoomInviteModal() {
    if (!this.generatedRoomCode || this.generatedRoomCode === 'جاري...') {
      try {
        const code = await this.multiplayer.createRoom();
        this.generatedRoomCode = code || ('ROOM-' + Math.floor(1000 + Math.random() * 9000));
      } catch (e) {
        this.generatedRoomCode = 'ROOM-' + Math.floor(1000 + Math.random() * 9000);
      }
    }
    this.showPrivateRoomModal = true;
  }

  async inviteFriend(friendId: string) {
    if (!this.game || !this.generatedRoomCode) return;
    this.invitedFriends.push(friendId);

    let customGameData: any = undefined;
    if (this.game.id.startsWith('custom_game_')) {
      const htmlContent = localStorage.getItem(`arcade_custom_code_${this.game.id}`) || '';
      customGameData = {
        title: this.game.title,
        description: this.game.description,
        thumbnail: this.game.thumbnail,
        category: this.game.category,
        genre: this.game.genre,
        htmlContent: htmlContent,
        updatedAt: Date.now()
      };
    }

    await this.firebaseService.sendGameInvite(
      friendId,
      this.game.id,
      this.game.title,
      this.generatedRoomCode,
      customGameData
    );
  }

  async acceptInvite(invite: any) {
    const isCustom = invite.isCustom || invite.gameId?.startsWith('custom_game_');
    if (isCustom && invite.customGameData) {
      const gameId = invite.gameId;
      const customData = invite.customGameData;
      const htmlContent = customData.htmlContent;

      if (htmlContent && (!this.arcadeService.hasUpToDateCustomGame(gameId))) {
        this.arcadeService.saveOrUpdateCustomGame(
          gameId,
          {
            title: invite.gameTitle || customData.title || 'لعبة مخصصة',
            description: customData.description,
            thumbnail: customData.thumbnail,
            category: customData.category,
            genre: customData.genre
          },
          htmlContent
        );
      }
    }

    await this.firebaseService.updateGameInviteStatus(invite.id, 'accepted');
    this.router.navigate(['/arcade/arena', invite.gameId], { queryParams: { room: invite.roomCode } });
  }

  async declineInvite(invite: any) {
    await this.firebaseService.updateGameInviteStatus(invite.id, 'declined');
  }

  async simulateKey(key1: string, key2: string, isDown: boolean, event?: TouchEvent) {
    if (event) event.preventDefault();
    
    const iframeWindow = this.iframeRef?.nativeElement?.contentWindow;
    const iframeDocument = this.iframeRef?.nativeElement?.contentDocument;
    
    if (!iframeWindow && !iframeDocument) return;

    const eventName = isDown ? 'keydown' : 'keyup';
    
    // Create and dispatch events for both key1 (e.g. ArrowUp) and key2 (e.g. 'w')
    const triggerEvent = (k: string) => {
      const keyboardEvent = new KeyboardEvent(eventName, {
        key: k,
        code: k,
        keyCode: k === ' ' ? 32 : k === 'Enter' ? 13 : 0,
        bubbles: true,
        cancelable: true
      });
      if (iframeDocument) iframeDocument.dispatchEvent(keyboardEvent);
      if (iframeWindow) iframeWindow.dispatchEvent(keyboardEvent);
    };

    triggerEvent(key1);
    triggerEvent(key2);
  }

  async copyRoomLink() {
    const url = window.location.origin + this.router.url.split('?')[0] + '?room=' + this.generatedRoomCode;
    navigator.clipboard.writeText(url).then(() => {
      this.copied = true;
      setTimeout(() => this.copied = false, 2000);
    });
  }

  openJoinRoomModal() {
    this.showModeOverlay = false;
    this.showPrivateRoomModal = false;
    this.showJoinRoomModal = true;
    this.joinRoomCode = '';
    this.joiningRoom = false;
  }

  joinRoomByCode() {
    const code = this.joinRoomCode.trim().toUpperCase();
    if (!code) return;

    this.joiningRoom = true;
    this.privateRoomRole = 'guest';
    this.generatedRoomCode = code;
    this.selectedMode = 'private';
    this.showJoinRoomModal = false;
    this.showModeOverlay = false;
    this.multiplayer.joinRoom(code);
  }

  confirmTeamDeployment() {
    this.teamDeploymentCompleted = true;
    this.showTeamDeploymentModal = false;
    this.launchGame();
  }

  launchGame() {
    this.showPrivateRoomModal = false;
    this.isLoading = true;
    this.gameState = 'Launching...';

    const maxPlayers = this.game?.maxPlayers || 2;
    if (maxPlayers > 2 && this.privateRoomRole === 'host' && !this.teamDeploymentCompleted) {
      this.showTeamDeploymentModal = true;
      return;
    }

    if (this.game) {
      if (this.game.id.startsWith('custom_game_')) {
        const storedCode = localStorage.getItem(`arcade_custom_code_${this.game.id}`);
        if (storedCode) {
          this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl('data:text/html;charset=utf-8,' + encodeURIComponent(storedCode));
          return;
        }
      }

      if (this.game.localUrl) {
        let url = this.game.localUrl;
        
        // Handle modified version for OpenTTD
        if (this.game.id === 'openttd' && this.gameVersion === 'modified') {
          url = url.replace('index.html', 'index_modified.html');
        }

        url += (url.includes('?') ? '&' : '?') + 'mode=' + this.selectedMode + '&v=' + Date.now();
        if (this.selectedMode === 'private') {
           url += '&room=' + this.generatedRoomCode;
           if (this.privateRoomRole) {
             url += '&role=' + this.privateRoomRole;
           }
        }
        this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
      }
    }
  }

  getDynamicGradient(): string {
    if (!this.game) return 'linear-gradient(135deg, #0f172a 0%, #020617 100%)';
    const id = this.game.id;
    const genre = this.game.genre?.toLowerCase() || '';

    const customGradients: Record<string, string> = {
      'space-shooter': 'radial-gradient(circle at center, #1e1b4b 0%, #03000a 100%)',
      'tank-battle': 'linear-gradient(135deg, #18181b 0%, #27272a 50%, #09090b 100%)',
      'air-hockey': 'radial-gradient(circle at center, #0f172a 0%, #020617 100%)',
      'fruit-slicer': 'linear-gradient(135deg, #022c22 0%, #064e3b 50%, #020617 100%)',
      'flappy-clone': 'linear-gradient(180deg, #0284c7 0%, #0369a1 50%, #0f172a 100%)',
      'snake-arena': 'radial-gradient(circle at center, #064e3b 0%, #022c22 100%)',
      'bomb-arena': 'linear-gradient(135deg, #450a0a 0%, #1e1b4b 100%)',
      'openttd': 'linear-gradient(135deg, #064e3b 0%, #1e293b 50%, #0f172a 100%)',
      'echoes-of-time': 'radial-gradient(circle at center, #172554 0%, #020817 100%)',
      'three-monkeys': 'linear-gradient(135deg, #3b0764 0%, #1e1b4b 100%)',
      'escape-room': 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      'space-deception': 'radial-gradient(circle at center, #450a0a 0%, #020617 100%)',
      'spot-differences': 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
      'card-battle': 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      'strategic-xo': 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
      'memory-match': 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      'arabic-wordle': 'linear-gradient(135deg, #18181b 0%, #121213 100%)',
      'typing-defense': 'linear-gradient(135deg, #2e1065 0%, #0f172a 100%)',
      'spyfall': 'linear-gradient(135deg, #1e293b 0%, #020617 100%)',
      'tick-tock-bomb': 'radial-gradient(circle at center, #7f1d1d 0%, #000000 100%)',
      'heads-up': 'linear-gradient(135deg, #1d4ed8 0%, #1e1b4b 100%)',
      'draw-and-guess': 'linear-gradient(135deg, #1e3a8a 0%, #172554 100%)',
      'dobble': 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      'squid-game': 'linear-gradient(135deg, #831843 0%, #0f172a 100%)',
    };

    if (customGradients[id]) return customGradients[id];

    if (genre.includes('action') || genre.includes('co-op')) {
      return 'linear-gradient(135deg, #311042 0%, #0f172a 100%)';
    } else if (genre.includes('puzzle') || genre.includes('strategy')) {
      return 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)';
    } else if (genre.includes('social') || genre.includes('party')) {
      return 'linear-gradient(135deg, #1d4ed8 0%, #1e1b4b 100%)';
    }
    return 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #020617 100%)';
  }

  ngOnDestroy() {
    this.removeGameMenuTheme();
    if (this.timer) {
      clearInterval(this.timer);
    }
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }

  @HostListener('window:message', ['$event'])
  onMessage(event: MessageEvent) {
    // Basic security: ensure message comes from our iframe
    if (this.iframeRef && event.source === this.iframeRef.nativeElement.contentWindow) {
      const data = event.data;
      
      // If it's a known system message
      if (data && data.type) {
        if (data.type === 'ARCADE_GAME_START') {
          this.gameState = 'Playing';
          this.lastWinner = '';
        } else if (data.type === 'ARCADE_GAME_OVER') {
          this.gameState = 'Game Over';
          this.lastWinner = data.winner || 'Draw';
        } else if (data.type === 'SHOW_MODE_SELECTION') {
          this.showModeOverlay = true;
        } else if (data.type === 'ENTER_FULLSCREEN') {
          this.isImmersive = true;
        } else if (data.type === 'EXIT_FULLSCREEN') {
          this.isImmersive = false;
        } else if (data.type === 'CLOSE_GAME') {
          this.goBack();
        }
      }

      // Audio events from game iframe
      if (data && data.type) {
        if (data.type === 'AUDIO_PLAY_SFX') {
          this.arcadeAudio.playSfx(data.volume !== undefined ? data.volume : 0.8);
        } else if (data.type === 'AUDIO_PLAY_BGM') {
          this.arcadeAudio.playBgm(data.volume !== undefined ? data.volume : 0.5);
        } else if (data.type === 'AUDIO_STOP_BGM') {
          this.arcadeAudio.stopBgm();
        }
      }

      // If we are in a private multiplayer session, forward everything else to the peer
      if (this.selectedMode === 'private' && this.multiplayer.connectionState() === 'connected') {
        this.multiplayer.sendMessage(data);
      }
    }
  }

  @HostListener('document:click')
  onDocumentClick() {
    this.arcadeAudio.ensureAudioContext();
  }

  onIframeLoad() {
    this.isLoading = false;
    this.gameState = 'Ready';
    this.cdr.detectChanges();

    // Inject global scroll fix for current and future games
    try {
      if (this.iframeRef && this.iframeRef.nativeElement) {
        const iframeDoc = this.iframeRef.nativeElement.contentDocument || this.iframeRef.nativeElement.contentWindow?.document;
        if (iframeDoc) {
          const style = iframeDoc.createElement('style');
          style.innerHTML = `
            body, html {
              overflow-y: auto !important;
              overflow-x: hidden !important;
              /* Prevent canvas dragging from scrolling the page accidentally */
              touch-action: pan-y;
            }
            canvas {
              touch-action: none;
            }
          `;
          iframeDoc.head.appendChild(style);
        }
      }
    } catch (e) {
      console.warn('Cannot inject styles into game iframe:', e);
    }
  }

  reloadGame() {
    this.isLoading = true;
    if (this.iframeRef && this.iframeRef.nativeElement) {
      this.iframeRef.nativeElement.src = this.iframeRef.nativeElement.src;
    }
  }

  goBack() {
    this.router.navigate(['/arcade']);
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      this.containerRef.nativeElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      this.isFullscreen = true;
    } else {
      document.exitFullscreen();
      this.isFullscreen = false;
    }
  }

  toggleImmersive() {
     this.isImmersive = !this.isImmersive;
     if (this.isImmersive) {
        // Also try to trigger native fullscreen for maximum immersion
        if (!document.fullscreenElement) {
           this.containerRef.nativeElement.requestFullscreen().catch(() => {});
        }
     } else {
        if (document.fullscreenElement) {
           document.exitFullscreen().catch(() => {});
        }
     }
  }

  formatPlayTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  getMovementBindings() {
    const movement = this.game?.mobileControls?.movement;
    return movement ?? {
      up: ['ArrowUp', 'w'],
      down: ['ArrowDown', 's'],
      left: ['ArrowLeft', 'a'],
      right: ['ArrowRight', 'd']
    };
  }

  getActionBindings() {
    return this.game?.mobileControls?.actions ?? [
      { label: 'B', keys: ['Enter', 'Enter'] as [string, string], style: 'success' as const },
      { label: 'A', keys: [' ', ' '] as [string, string], style: 'primary' as const }
    ];
  }

  getActionButtonClass(style: 'primary' | 'secondary' | 'danger' | 'success' | undefined) {
    switch (style) {
      case 'danger':
        return 'bg-rose-500/50 active:bg-rose-500 border-rose-400/50 shadow-[0_0_15px_rgba(244,63,94,0.5)]';
      case 'success':
        return 'bg-emerald-500/50 active:bg-emerald-500 border-emerald-400/50 shadow-[0_0_15px_rgba(16,185,129,0.5)]';
      case 'secondary':
        return 'bg-slate-500/50 active:bg-slate-500 border-slate-300/50 shadow-[0_0_15px_rgba(148,163,184,0.45)]';
      default:
        return 'bg-indigo-500/50 active:bg-indigo-500 border-indigo-400/50 shadow-[0_0_15px_rgba(99,102,241,0.5)]';
    }
  }
}
