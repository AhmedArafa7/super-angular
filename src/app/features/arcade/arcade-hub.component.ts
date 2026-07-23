import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ArcadeService, ArcadeGame, GameCategory } from './arcade.service';
import { GlobalStateService } from '../../core/services/global-state.service';
import { FirebaseService } from '../../core/services/firebase.service';
import { LucideAngularModule, UserPlus } from 'lucide-angular';

@Component({
  selector: 'app-arcade-hub',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule],
  template: `
    <div class="min-h-full bg-slate-950 p-6 md:p-10 text-right overflow-y-auto custom-scrollbar" dir="rtl">
      
      <!-- Incoming Game Invites -->
      <div *ngIf="globalState.activeGameInvites().length > 0" class="fixed top-20 right-6 z-[100] flex flex-col gap-3 max-w-sm w-full">
         <div *ngFor="let invite of globalState.activeGameInvites()" class="bg-indigo-900/90 backdrop-blur-xl border border-indigo-400/50 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-right fade-in duration-500">
            <div class="flex items-center gap-3 mb-3">
               <img [src]="invite.fromAvatar" class="size-10 rounded-full border-2 border-indigo-400" alt="Avatar">
               <div>
                  <h4 class="text-white font-black text-sm">{{ invite.fromName }} يدعوك للعب</h4>
                  <p class="text-indigo-200 text-xs">{{ invite.gameTitle }}</p>
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
           <button (click)="showSubmitGameModal = true" class="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 h-9 text-xs font-bold transition-all flex items-center gap-2">
             <lucide-icon [img]="UserPlus" class="w-4 h-4"></lucide-icon>
             أضف لعبتك
           </button>
           
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

      <!-- Add Game Modal -->
      <div *ngIf="showSubmitGameModal" class="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
        <div class="bg-slate-900 border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl">
           <h3 class="text-2xl font-black text-white mb-6">أضف لعبتك الخاصة</h3>
           <input type="text" [(ngModel)]="newGameUrl" placeholder="رابط اللعبة (URL)..." class="w-full h-12 bg-black/40 border border-indigo-500/50 rounded-2xl text-sm text-white px-4 mb-4" />
           <input type="text" [(ngModel)]="newGameTitle" placeholder="اسم اللعبة..." class="w-full h-12 bg-black/40 border border-indigo-500/50 rounded-2xl text-sm text-white px-4 mb-6" />
           <div class="flex gap-4">
             <button (click)="showSubmitGameModal = false" class="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl">إلغاء</button>
             <button (click)="submitGame()" class="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl">إرسال</button>
           </div>
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

      <!-- Floating Category Tabs -->
      <div class="flex justify-center mb-10">
        <div class="inline-flex bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 shadow-2xl shadow-black/50" role="tablist">
          <button *ngFor="let cat of arcadeService.categories"
                  (click)="activeCategory = cat.id"
                  role="tab"
                  [attr.aria-selected]="activeCategory === cat.id"
                  class="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300"
                  [ngClass]="{
                    'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30': activeCategory === cat.id,
                    'text-slate-400 hover:text-white hover:bg-white/5': activeCategory !== cat.id
                  }">
            <span>{{ cat.icon }}</span>
            <span>{{ cat.label }}</span>
            <span class="text-[10px] opacity-60">({{ getCategoryCount(cat.id) }})</span>
          </button>
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
        <div *ngFor="let game of filteredGames" class="group relative">
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

      <!-- OpenTTD Selection Modal -->
      <div *ngIf="showOpenTTDModal" class="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 text-right" dir="rtl">
        <div class="bg-slate-900 border border-white/10 rounded-3xl p-8 w-full max-w-2xl shadow-2xl relative overflow-hidden">
           <div class="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent pointer-events-none"></div>
           <h3 class="text-3xl font-black text-white mb-2">اختر إصدار اللعبة 🚂</h3>
           <p class="text-slate-400 mb-8">اختر بين الإصدار الأصلي الكلاسيكي، أو الإصدار المعدل الذي يحتوي على إضافات وتحسينات جديدة.</p>
           
           <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
             <!-- Original Option -->
             <div (click)="playOpenTTD('original')" class="group cursor-pointer bg-black/40 border border-slate-700 hover:border-slate-500 rounded-2xl p-6 transition-all hover:bg-slate-800">
                <div class="flex items-center gap-4 mb-4">
                  <div class="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-600">
                     <span class="text-2xl">🏛️</span>
                  </div>
                  <h4 class="text-xl font-bold text-white group-hover:text-slate-300">الإصدار الأصلي</h4>
                </div>
                <p class="text-sm text-slate-400">لعبة Transport Tycoon Deluxe الكلاسيكية بدون أي تعديلات. استمتع بالتجربة الأصلية لإدارة شبكات النقل.</p>
             </div>

             <!-- Modified Option -->
             <div (click)="playOpenTTD('modified')" class="group cursor-pointer bg-indigo-900/20 border border-indigo-500/30 hover:border-indigo-400 rounded-2xl p-6 transition-all hover:bg-indigo-900/40 relative overflow-hidden">
                <div class="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/20 blur-2xl rounded-full"></div>
                <div class="flex items-center gap-4 mb-4">
                  <div class="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                     <span class="text-2xl">🚀</span>
                  </div>
                  <h4 class="text-xl font-bold text-white">الإصدار المعدّل</h4>
                </div>
                <p class="text-sm text-indigo-200/70">
                  <span class="block mb-1">✅ دعم أفضل للمس على الشاشات الصغيرة</span>
                  <span class="block mb-1">✅ أزرار تحكم مخصصة للموبايل</span>
                  <span class="block">✅ تعديلات في واجهة المستخدم لتناسب الهاتف</span>
                </p>
             </div>
           </div>

           <button (click)="showOpenTTDModal = false" class="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-colors border border-white/10">
             إلغاء
           </button>
        </div>
      </div>
    </div>
  `
})
export class ArcadeHubComponent implements OnInit {
  games: ArcadeGame[] = [];
  activeCategory: string = 'mental';
  
  arcadeService = inject(ArcadeService);
  private router = inject(Router);
  globalState = inject(GlobalStateService);
  private firebaseService = inject(FirebaseService);

  get filteredGames(): ArcadeGame[] {
    return this.games.filter(g => g.category === this.activeCategory && g.status !== 'coming_soon');
  }

  getCategoryCount(categoryId: string): number {
    return this.games.filter(g => g.category === categoryId && g.status !== 'coming_soon').length;
  }

  UserPlus = UserPlus;
  showAddFriend = false;
  showSubmitGameModal = false;
  showOpenTTDModal = false;
  newFriendName = '';
  newGameUrl = '';
  newGameTitle = '';
  isAdding = false;

  submitGame() {
    const title = this.newGameTitle.trim();
    const url = this.newGameUrl.trim();
    if (!title || !url) {
      alert('الرجاء إدخال اسم ورابط اللعبة');
      return;
    }
    // هنا يجب إضافة المنطق لحفظ اللعبة في Firebase
    alert('تم إرسال اللعبة للمراجعة!');
    this.showSubmitGameModal = false;
    this.newGameTitle = '';
    this.newGameUrl = '';
  }

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
    if (id === 'openttd') {
      this.showOpenTTDModal = true;
    } else {
      this.router.navigate(['/arcade/arena', id]);
    }
  }

  playOpenTTD(version: 'original' | 'modified') {
    this.showOpenTTDModal = false;
    this.router.navigate(['/arcade/arena', 'openttd'], { queryParams: { v: version } });
  }

  async acceptInvite(invite: any) {
    await this.firebaseService.updateGameInviteStatus(invite.id, 'accepted');
    this.router.navigate(['/arcade/arena', invite.gameId], { queryParams: { room: invite.roomCode } });
  }

  async declineInvite(invite: any) {
    await this.firebaseService.updateGameInviteStatus(invite.id, 'declined');
  }
}
