import { Component, OnInit, OnDestroy, HostListener, ElementRef, ViewChild, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { GlobalStateService } from '../../core/services/global-state.service';
import { MultiplayerService } from '../../core/services/multiplayer.service';
import { ArcadeService, ArcadeGame } from './arcade.service';

@Component({
  selector: 'app-arcade-arena',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div #container class="fixed inset-0 z-[60] bg-black flex flex-col" dir="rtl">
      <!-- Immersive Header -->
      <header class="h-16 px-6 border-b border-white/5 bg-slate-900/80 backdrop-blur-xl flex items-center justify-between shrink-0">
        <div class="flex items-center gap-4">
          <button (click)="goBack()" class="text-white/60 hover:text-white hover:bg-white/5 rounded-xl p-2 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
          </button>
          <div class="flex flex-col text-right" *ngIf="game">
             <h2 class="text-sm font-black text-white leading-none mb-1">{{ game.title }}</h2>
             <span class="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Arena Mode Active</span>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <!-- Game Status Indicators -->
           <div class="hidden md:flex items-center gap-6 px-4 py-1.5 bg-white/5 rounded-full border border-white/5">
              <div class="flex items-center gap-2">
                 <svg xmlns="http://www.w3.org/2000/svg" class="size-4" [ngClass]="{'text-green-400': multiplayer.connectionState() === 'connected' || gameState !== 'Waiting...', 'text-amber-400': multiplayer.connectionState() === 'connecting', 'text-red-400': multiplayer.connectionState() === 'failed'}" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                 <span class="text-[10px] font-black text-white uppercase">{{ multiplayer.connectionState() === 'connected' ? 'P2P Connected' : multiplayer.connectionState() === 'connecting' ? 'Connecting...' : gameState }}</span>
              </div>
           </div>

           <button (click)="reloadGame()" class="text-white/40 hover:text-white rounded-lg p-2 transition-colors" title="Reload Game">
              <svg xmlns="http://www.w3.org/2000/svg" [class.animate-spin]="isLoading" class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
           </button>
           <button (click)="toggleFullscreen()" class="text-white/40 hover:text-white rounded-lg p-2 transition-colors" title="Fullscreen">
              <svg *ngIf="!isFullscreen" xmlns="http://www.w3.org/2000/svg" class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
              <svg *ngIf="isFullscreen" xmlns="http://www.w3.org/2000/svg" class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8V4m0 0h4M3 4l4 4m8 0V4m0 0h-4m4 0l-4 4m-8 4v4m0 0h4m-4 0l4-4m8 4l-4-4m4 4v-4m0 4h-4" /></svg>
           </button>
        </div>
      </header>

      <!-- Mode Selection Overlay -->
      <div *ngIf="!selectedMode" class="flex-1 flex flex-col items-center justify-center p-6 md:p-12 animate-in fade-in zoom-in duration-500 relative overflow-y-auto custom-scrollbar">
         <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.1)_0%,transparent_70%)] pointer-events-none"></div>
         <h1 class="text-3xl md:text-5xl font-black text-white mb-3 text-center tracking-tight">اختر نمط اللعب</h1>
         <p class="text-slate-400 text-center max-w-lg mb-12 text-sm md:text-base leading-relaxed">كيف تود خوض هذا التحدي؟ اختر النمط الذي يناسبك الآن وابدأ اللعب.</p>
         
         <div class="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl z-10">
            
            <!-- Local Mode / AI Mode -->
            <ng-container *ngIf="game?.localModeType === 'ai'; else standardLocal">
              <button (click)="selectMode('local')" class="group relative bg-slate-900/50 hover:bg-slate-800 border border-white/10 hover:border-blue-500/50 rounded-3xl p-8 flex flex-col items-center text-center transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(59,130,246,0.3)]">
                 <div class="size-16 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" class="size-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                 </div>
                 <h3 class="text-xl font-black text-white mb-2">ضد الذكاء الاصطناعي</h3>
                 <p class="text-sm text-slate-400 leading-relaxed">العب وتدرب ضد الذكاء الاصطناعي (AI) لتطوير مهاراتك.</p>
              </button>
            </ng-container>
            <ng-template #standardLocal>
              <button (click)="selectMode('local')" class="group relative bg-slate-900/50 hover:bg-slate-800 border border-white/10 hover:border-indigo-500/50 rounded-3xl p-8 flex flex-col items-center text-center transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(99,102,241,0.3)]">
                 <div class="size-16 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" class="size-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                 </div>
                 <h3 class="text-xl font-black text-white mb-2">{{ game?.localModeType === 'pass_and_play' ? 'لعب مشترك' : 'لعب محلياً' }}</h3>
                 <p class="text-sm text-slate-400 leading-relaxed">{{ game?.localModeType === 'pass_and_play' ? 'مرر الهاتف أو العبوا بالدور على نفس الجهاز.' : 'العب مع أصدقائك على نفس الجهاز في وضع الشاشة المشتركة.' }}</p>
              </button>
            </ng-template>

            <!-- Private Room Mode -->
            <button (click)="selectMode('private')" class="group relative bg-slate-900/50 hover:bg-slate-800 border border-white/10 hover:border-emerald-500/50 rounded-3xl p-8 flex flex-col items-center text-center transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(16,185,129,0.3)]">
               <div class="size-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" class="size-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
               </div>
               <h3 class="text-xl font-black text-white mb-2">إنشاء غرفة</h3>
               <p class="text-sm text-slate-400 leading-relaxed">قم بإنشاء غرفة خاصة وشارك الكود مع أصدقائك للعب معاً عن بُعد.</p>
            </button>

            <!-- Pro Online Mode -->
            <button (click)="selectMode('pro')" class="group relative bg-slate-900/50 hover:bg-slate-800 border border-white/10 hover:border-amber-500/50 rounded-3xl p-8 flex flex-col items-center text-center transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(245,158,11,0.3)] overflow-hidden">
               <div *ngIf="!globalState.userProfile().isPro" class="absolute top-4 right-4 bg-black/60 backdrop-blur-sm border border-white/10 rounded-full px-3 py-1 flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" class="size-3.5 text-amber-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C9.243 2 7 4.243 7 7v3H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2h-1V7c0-2.757-2.243-5-5-5zM9 7c0-1.654 1.346-3 3-3s3 1.346 3 3v3H9V7zm4 10.723V19h-2v-1.277a1.993 1.993 0 01.867-3.669A2 2 0 0113 17.723z"/></svg>
                  <span class="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Pro Only</span>
               </div>
               <div class="size-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" class="size-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
               </div>
               <h3 class="text-xl font-black text-white mb-2" [class.text-amber-500]="globalState.userProfile().isPro">لعب أونلاين</h3>
               <p class="text-sm text-slate-400 leading-relaxed">العب ضد منافسين عشوائيين من جميع أنحاء العالم (خاص بمشتركي Pro).</p>
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
            
            <div class="flex items-center justify-center gap-3 mt-8">
               <svg xmlns="http://www.w3.org/2000/svg" class="size-5 text-indigo-400 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
               <span class="text-sm font-bold text-indigo-400 uppercase tracking-widest">Waiting for player...</span>
            </div>
            <p *ngIf="copied" class="text-xs text-emerald-400 mt-4 animate-in fade-in slide-in-from-bottom-2">تم نسخ الرابط بنجاح!</p>
         </div>
      </div>

      <!-- Game Stage -->
      <div *ngIf="selectedMode && !showPrivateRoomModal" class="flex-1 relative bg-black overflow-hidden flex items-center justify-center animate-in fade-in duration-1000">
        <div *ngIf="isLoading" class="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950">
           <div class="size-20 bg-indigo-500/10 rounded-full flex items-center justify-center mb-6 border border-indigo-500/20 animate-pulse">
              <svg xmlns="http://www.w3.org/2000/svg" class="size-10 text-indigo-500 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
           </div>
           <p class="font-black text-white/40 uppercase tracking-[0.3em] animate-pulse">Launching Arena</p>
        </div>
        
        <iframe *ngIf="safeUrl"
          #gameIframe
          [src]="safeUrl"
          class="w-full h-full border-none transition-opacity duration-1000"
          [class.opacity-0]="isLoading"
          [class.opacity-100]="!isLoading"
          (load)="onIframeLoad()"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          [title]="game?.title">
        </iframe>

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
    </div>
  `
})
export class ArcadeArenaComponent implements OnInit, OnDestroy {
  game: ArcadeGame | undefined;
  safeUrl: SafeResourceUrl | null = null;
  isLoading = true;
  isFullscreen = false;
  
  playTime = 0;
  private timer: any;
  gameState = 'Waiting...';
  lastWinner = '';

  selectedMode: 'local' | 'private' | 'pro' | null = null;
  showPrivateRoomModal = false;
  generatedRoomCode = '';

  @ViewChild('container') containerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('gameIframe') iframeRef!: ElementRef<HTMLIFrameElement>;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private arcadeService = inject(ArcadeService);
  private sanitizer = inject(DomSanitizer);
  globalState = inject(GlobalStateService);
  multiplayer = inject(MultiplayerService);
  
  copied = false;

  constructor() {
    effect(() => {
      const state = this.multiplayer.connectionState();
      if (state === 'connected' && this.selectedMode === 'private') {
        this.launchGame();
      } else if (state === 'failed') {
        alert('فشل الاتصال بالغرفة. قد تكون الغرفة غير موجودة أو انتهت صلاحيتها.');
        this.goBack();
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
      const id = params.get('id');
      if (id) {
        this.arcadeService.getGameById(id).subscribe(game => {
          if (game && game.localUrl) {
            this.game = game;
          } else {
            this.goBack();
          }
        });
      }
    });

    this.route.queryParamMap.subscribe(params => {
      const room = params.get('room');
      if (room) {
        this.selectedMode = 'private';
        this.multiplayer.joinRoom(room);
      }
    });

    this.timer = setInterval(() => {
      if (!this.isLoading && this.selectedMode && !this.showPrivateRoomModal && this.multiplayer.connectionState() !== 'connecting') {
        this.playTime++;
      }
    }, 1000);
  }

  async selectMode(mode: 'local' | 'private' | 'pro') {
    if (mode === 'pro' && !this.globalState.userProfile().isPro) {
      alert('عذراً، هذا النمط متاح للمشتركين في باقة Pro فقط. قم بالترقية الآن!');
      return;
    }
    
    this.selectedMode = mode;
    
    if (mode === 'private') {
      const code = await this.multiplayer.createRoom();
      this.generatedRoomCode = code;
      this.showPrivateRoomModal = true;
    } else {
      this.launchGame();
    }
  }

  copyRoomLink() {
    const url = window.location.origin + this.router.url.split('?')[0] + '?room=' + this.generatedRoomCode;
    navigator.clipboard.writeText(url).then(() => {
      this.copied = true;
      setTimeout(() => this.copied = false, 2000);
    });
  }

  launchGame() {
    this.showPrivateRoomModal = false;
    this.isLoading = true;
    this.gameState = 'Launching...';
    // Here we can append the mode to the localUrl if we want to pass it to the game iframe
    if (this.game && this.game.localUrl) {
      let url = this.game.localUrl;
      url += (url.includes('?') ? '&' : '?') + 'mode=' + this.selectedMode;
      if (this.selectedMode === 'private') {
         url += '&room=' + this.generatedRoomCode;
      }
      this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
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
        }
      }

      // If we are in a private multiplayer session, forward everything else to the peer
      if (this.selectedMode === 'private' && this.multiplayer.connectionState() === 'connected') {
        this.multiplayer.sendMessage(data);
      }
    }
  }

  onIframeLoad() {
    this.isLoading = false;
    this.gameState = 'Ready';

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

  formatPlayTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
}
