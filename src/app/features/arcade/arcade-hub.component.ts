import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ArcadeService, ArcadeGame } from './arcade.service';
import { GlobalStateService } from '../../core/services/global-state.service';
import { LucideAngularModule, UserPlus } from 'lucide-angular';

@Component({
  selector: 'app-arcade-hub',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule],
  template: `
    <div class="min-h-full bg-slate-950 p-6 md:p-10 text-right overflow-y-auto custom-scrollbar" dir="rtl">
      
      <!-- Friends Bar -->
      <div class="mb-6 flex items-center justify-between bg-slate-900/50 border border-white/5 rounded-2xl p-4 backdrop-blur-sm shadow-lg animate-in fade-in slide-in-from-top-4 duration-500">
        <div class="flex items-center gap-4 overflow-x-auto scrollbar-hide flex-1">
          <div class="flex items-center gap-3">
             <span class="text-slate-400 text-xs font-bold whitespace-nowrap ml-2">الأصدقاء:</span>
             <ng-container *ngFor="let friend of globalState.friends()">
               <div class="relative group cursor-pointer">
                 <img [src]="friend.avatarUrl" class="w-10 h-10 rounded-full border-2 border-transparent hover:border-indigo-500 object-cover transition-all duration-300" />
                 <span class="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#0B0F19]"
                       [ngClass]="{
                         'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]': friend.status === 'online',
                         'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)] animate-pulse': friend.status === 'in-game',
                         'bg-slate-500': friend.status === 'offline'
                       }">
                 </span>
                 <div class="absolute -bottom-8 right-1/2 translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-xl border border-white/10">
                   {{ friend.name }} <span *ngIf="friend.status === 'in-game'" class="text-indigo-400 block text-[8px]">يلعب: {{ friend.gameName }}</span>
                 </div>
               </div>
             </ng-container>
          </div>
        </div>
        
        <!-- Add Friend -->
        <div class="flex items-center gap-2 shrink-0 border-r border-white/10 pr-4 ml-2">
           <ng-container *ngIf="showAddFriend; else addBtn">
             <input type="text" [(ngModel)]="newFriendName" (keyup.enter)="addFriend()" [disabled]="isAdding" placeholder="اسم المستخدم..." class="px-3 h-9 bg-black/40 border border-indigo-500/50 rounded-xl text-xs text-white text-right focus:outline-none focus:bg-black/60 w-36 transition-all disabled:opacity-50" />
             <button (click)="addFriend()" [disabled]="isAdding" class="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 h-9 text-xs font-bold transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 min-w-[70px]">
               {{ isAdding ? 'جاري...' : 'إضافة' }}
             </button>
           </ng-container>
           <ng-template #addBtn>
             <button (click)="showAddFriend = true" class="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl px-4 h-9 text-xs font-bold transition-all hover:scale-105 active:scale-95">
               <lucide-icon [img]="UserPlus" class="w-4 h-4 text-indigo-400"></lucide-icon>
               إضافة صديق
             </button>
           </ng-template>
        </div>
      </div>

      <!-- Hero Section -->
      <div class="relative mb-12 rounded-[2.5rem] overflow-hidden border border-white/5 bg-slate-900 shadow-2xl">
        <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent z-10"></div>
        <div class="w-full h-[400px] bg-slate-800 flex items-center justify-center opacity-50 grayscale hover:grayscale-0 transition-all duration-1000">
           <img src="https://images.unsplash.com/photo-1596515828859-e9ceec5c4839?q=80&w=1000&auto=format&fit=crop" class="w-full h-full object-cover" alt="Tank Battle Feature" />
        </div>
        
        <div class="absolute bottom-0 right-0 p-8 md:p-12 z-20 max-w-2xl">
          <span class="inline-block bg-amber-500 text-black font-black mb-4 px-4 py-1 rounded-full animate-pulse text-sm">
            لعبة مميزة
          </span>
          <h1 class="text-4xl md:text-6xl font-black text-white mb-6 leading-tight">Tank Battle</h1>
          <p class="text-slate-400 text-lg mb-8 leading-relaxed">
            استمتع بأقوى تجربة حرب دبابات تكتيكية مباشرة من متصفحك. ادعُ أصدقاءك للعب معاً في شاشة واحدة أو تحدَّ الذكاء الاصطناعي.
          </p>
          <div class="flex flex-wrap gap-4">
            <button (click)="playGame('tank-battle')" class="bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl h-14 px-8 font-black text-lg shadow-xl shadow-indigo-600/20 flex items-center gap-3 border-t border-white/20 transition-all">
               العب الآن 
               <svg xmlns="http://www.w3.org/2000/svg" class="size-5 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            </button>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-between mb-8">
        <div>
          <h2 class="text-2xl font-black text-white flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" class="text-indigo-500 size-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            مكتبة الألعاب السيادية
          </h2>
          <p class="text-sm text-muted-foreground mr-11">ألعاب تعمل بالكامل داخل بيئة نكسوس، بدون إعلانات وبسيادة كاملة.</p>
        </div>
      </div>

      <!-- Games Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        <div *ngFor="let game of games" class="group relative">
          <div class="aspect-[4/3] rounded-[2rem] overflow-hidden border border-white/5 bg-slate-900 transition-all duration-500 group-hover:scale-[1.02] group-hover:shadow-2xl group-hover:shadow-indigo-500/10 flex flex-col">
            <div class="flex-1 bg-slate-800 flex items-center justify-center opacity-60 group-hover:opacity-100 transition-opacity">
                <img *ngIf="game.thumbnail" [src]="game.thumbnail" class="w-full h-full object-cover" [alt]="game.title" />
                <svg *ngIf="!game.thumbnail" xmlns="http://www.w3.org/2000/svg" class="size-20 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            
            <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent p-6 flex flex-col justify-end text-right">
              <h3 class="text-xl font-black text-white mb-1">{{ game.title }}</h3>
              <p class="text-[10px] text-slate-400 mb-4 line-clamp-2">{{ game.description }}</p>
              
              <div class="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                <button *ngIf="game.status === 'available'" (click)="playGame(game.id)" class="bg-white text-black hover:bg-white/90 rounded-xl font-bold h-9 px-4 text-sm">
                  العب الآن
                </button>
                <button *ngIf="game.status !== 'available'" disabled class="bg-white/10 text-white/40 rounded-xl font-bold h-9 px-4 text-sm cursor-not-allowed">
                  قريباً
                </button>
              </div>
            </div>
          </div>
          <span *ngIf="game.status === 'coming_soon'" class="absolute top-4 right-4 bg-slate-800 text-white text-xs font-bold px-3 py-1 rounded-full border border-white/10">قريباً</span>
        </div>
      </div>
    </div>
  `
})
export class ArcadeHubComponent implements OnInit {
  games: ArcadeGame[] = [];
  
  private arcadeService = inject(ArcadeService);
  private router = inject(Router);
  globalState = inject(GlobalStateService);

  UserPlus = UserPlus;
  showAddFriend = false;
  newFriendName = '';
  isAdding = false;

  ngOnInit() {
    // Automatically set the arcade player name from the database user profile
    const dbName = this.globalState.userProfile().name;
    if (dbName) {
      localStorage.setItem('arcade_player_name', dbName);
    }

    this.arcadeService.getGames().subscribe(data => {
      this.games = data;
    });
  }

  async addFriend() {
    const name = this.newFriendName.trim();
    if (!name || this.isAdding) return;

    this.isAdding = true;
    try {
      const success = await this.globalState.addFriend(name);
      if (success) {
        this.newFriendName = '';
        this.showAddFriend = false;
        // Optional: show success toast
        alert('تم إضافة الصديق بنجاح!');
      } else {
        alert('لم يتم العثور على مستخدم بهذا الاسم.');
      }
    } catch (e) {
      alert('حدث خطأ أثناء إضافة الصديق.');
    } finally {
      this.isAdding = false;
    }
  }

  playGame(id: string) {
    this.router.navigate(['/arcade/arena', id]);
  }
}
