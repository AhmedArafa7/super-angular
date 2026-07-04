import { Component, OnInit, OnDestroy, HostListener, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
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
                 <svg xmlns="http://www.w3.org/2000/svg" class="size-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                 <span class="text-[10px] font-black text-white uppercase">{{ gameState }}</span>
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

      <!-- Game Stage -->
      <div class="flex-1 relative bg-black overflow-hidden flex items-center justify-center">
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

  @ViewChild('container') containerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('gameIframe') iframeRef!: ElementRef<HTMLIFrameElement>;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private arcadeService = inject(ArcadeService);
  private sanitizer = inject(DomSanitizer);

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.arcadeService.getGameById(id).subscribe(game => {
          if (game && game.localUrl) {
            this.game = game;
            // Ensure URL is trusted
            this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(game.localUrl);
          } else {
            this.goBack();
          }
        });
      }
    });

    this.timer = setInterval(() => {
      if (!this.isLoading) {
        this.playTime++;
      }
    }, 1000);
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }

  @HostListener('window:message', ['$event'])
  onMessage(event: MessageEvent) {
    // Basic security check could be added here
    const data = event.data;
    if (data && data.type) {
      if (data.type === 'ARCADE_GAME_START') {
        this.gameState = 'Playing';
        this.lastWinner = '';
      } else if (data.type === 'ARCADE_GAME_OVER') {
        this.gameState = 'Game Over';
        this.lastWinner = data.winner || 'Draw';
      }
    }
  }

  onIframeLoad() {
    this.isLoading = false;
    this.gameState = 'Ready';
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
