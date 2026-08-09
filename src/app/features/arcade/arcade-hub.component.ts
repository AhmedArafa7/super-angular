import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ArcadeService, ArcadeGame, GameCategory } from './arcade.service';
import { GlobalStateService } from '../../core/services/global-state.service';
import { FirebaseService } from '../../core/services/firebase.service';
import { LucideAngularModule, UserPlus, Plus, Sparkles, Edit3 } from 'lucide-angular';

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
            <img src="https://images.unsplash.com/photo-1596515828859-e9ceec5c4839?q=80&w=1000&auto=format&fit=crop" class="w-full h-full object-cover" alt="Tank Battle Feature" (error)="onImageError($event)" />
         </div>
        
        <div class="absolute bottom-0 inset-x-0 p-8 md:p-12 z-20 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
           <div class="max-w-2xl text-right">
              <div class="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-full mb-4 backdrop-blur-md">
                 <span class="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
                 <span class="text-xs font-bold text-indigo-300">Super Arcade Platform</span>
              </div>
              <h1 class="text-3xl md:text-5xl font-black text-white mb-3 tracking-tight">معرض ألعاب التسلية الذكية</h1>
              <p class="text-slate-300 text-sm md:text-base font-medium leading-relaxed">استمتع بـ 20+ لعبة ممتعة فردية وجماعية، أو ابنِ لعبتك المخصصة بالذكاء الاصطناعي وانشرها للجميع!</p>
           </div>

           <div class="flex gap-4">
              <button (click)="playGame('tank-battle')" class="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-8 py-4 rounded-2xl shadow-xl shadow-indigo-600/30 transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-3 text-base">
                 <span>العب اللعبة الأكثر شعبية ⚡</span>
              </button>
           </div>
        </div>
      </div>

      <!-- Main Section Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-white/5 pb-6">
        <div>
          <h2 class="text-2xl font-black text-white flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" class="text-indigo-500 size-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            مكتبة الألعاب السيادية
          </h2>
          <p class="text-sm text-slate-400 mr-11">ألعاب تعمل بالكامل داخل بيئة نكسوس، بدون إعلانات وبسيادة كاملة.</p>
        </div>
      </div>

      <!-- Games Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        <!-- AI Game Creator Card (+ Button) -->
        <div 
          [routerLink]="['/arcade/ai-builder']"
          class="group relative cursor-pointer">
          <div class="aspect-[4/3] rounded-[2rem] border-2 border-dashed border-indigo-500/40 hover:border-indigo-400 bg-slate-900/60 hover:bg-indigo-950/30 transition-all duration-500 group-hover:scale-[1.02] group-hover:shadow-2xl group-hover:shadow-indigo-500/20 flex flex-col items-center justify-center p-6 text-center">
            
            <div class="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-xl mb-4">
              <lucide-icon [img]="Plus" class="w-8 h-8"></lucide-icon>
            </div>

            <div class="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full mb-2">
              <lucide-icon [img]="Sparkles" class="w-3 h-3 text-amber-400"></lucide-icon>
              <span class="text-[10px] font-black text-amber-400">استوديو الذكاء الاصطناعي</span>
            </div>

            <h3 class="text-lg font-black text-white group-hover:text-indigo-300 transition-colors">اصنع لعبة جديدة⚡</h3>
            <p class="text-xs text-slate-400 mt-1 font-medium leading-relaxed">ابنِ لعبة Arcade تفاعلية بالذكاء الاصطناعي مخصصة لك</p>
          </div>
        </div>

        <div *ngFor="let game of games" class="group relative">
          <div class="aspect-[4/3] rounded-[2rem] overflow-hidden border border-white/5 bg-slate-900 transition-all duration-500 group-hover:scale-[1.02] group-hover:shadow-2xl group-hover:shadow-indigo-500/10 flex flex-col">
            <div class="flex-1 bg-slate-800 flex items-center justify-center opacity-60 group-hover:opacity-100 transition-opacity">
                 <img *ngIf="game.thumbnail" [src]="game.thumbnail" class="w-full h-full object-cover" [alt]="game.title" (error)="game.thumbnail = ''" />
                <svg *ngIf="!game.thumbnail" xmlns="http://www.w3.org/2000/svg" class="size-20 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            
            <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent p-6 flex flex-col justify-end text-right">
              <h3 class="text-xl font-black text-white mb-1">{{ game.title }}</h3>
              <p class="text-[10px] text-slate-400 mb-4 line-clamp-2">{{ game.description }}</p>
              
              <div class="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                <button *ngIf="game.id.startsWith('custom_game_')" (click)="editGame(game.id)" class="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold h-9 px-3 text-xs flex items-center gap-1 shadow cursor-pointer">
                  <lucide-icon [img]="Edit3" class="w-3.5 h-3.5"></lucide-icon>
                  تعديل ✏️
                </button>
                <button *ngIf="game.status === 'available'" (click)="openInviteModalForGame(game)" class="bg-indigo-600/90 hover:bg-indigo-600 text-white rounded-xl font-bold h-9 px-3 text-xs flex items-center gap-1 shadow cursor-pointer">
                  دعوة ✉️
                </button>
                <button *ngIf="game.status === 'available'" (click)="playGame(game.id)" class="bg-white text-black hover:bg-white/90 rounded-xl font-bold h-9 px-4 text-sm cursor-pointer">
                  العب الآن
                </button>
                <button *ngIf="game.status !== 'available'" disabled class="bg-white/10 text-white/40 rounded-xl font-bold h-9 px-4 text-sm cursor-not-allowed">
                  قريباً
                </button>
              </div>
            </div>
          </div>
          <span *ngIf="game.id.startsWith('custom_game_')" class="absolute top-4 right-4 bg-emerald-500 text-slate-950 text-xs font-black px-3 py-1 rounded-full border border-emerald-300 shadow">منشورة حديثاً 🚀</span>
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

      <!-- Hub Invite Friend Modal -->
      <div *ngIf="showHubInviteModal && selectedGameForInvite" class="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 text-right" dir="rtl">
        <div class="bg-slate-900 border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95">
           <h3 class="text-2xl font-black text-white mb-1">دعوة صديق للعب {{ selectedGameForInvite.title }}</h3>
           <p class="text-xs text-indigo-300 mb-6">اختر صديقاً من قائمة أصدقائك المتصلين لإرسال الدعوة ومزامنة اللعبة لديه فوراً</p>

           <div *ngIf="globalState.friends().length > 0; else noFriendsHub" class="flex flex-col gap-2 max-h-60 overflow-y-auto custom-scrollbar mb-6">
              <div *ngFor="let friend of globalState.friends()" class="flex items-center justify-between bg-black/40 border border-white/5 p-3 rounded-2xl">
                 <div class="flex items-center gap-3">
                    <img [src]="friend.avatarUrl" class="size-10 rounded-full border border-white/10" alt="Avatar">
                    <div>
                      <h4 class="text-sm font-bold text-white leading-tight">{{ friend.name }}</h4>
                      <span class="text-[10px]" [ngClass]="friend.status === 'online' ? 'text-green-400' : (friend.status === 'in-game' ? 'text-indigo-400' : 'text-slate-400')">
                        {{ friend.status === 'online' ? 'متصل الآن' : (friend.status === 'in-game' ? 'يلعب حالياً' : 'غير متصل') }}
                      </span>
                    </div>
                 </div>
                 <button (click)="sendHubGameInvite(friend.id)" [disabled]="sentInviteFriendIds.includes(friend.id)" class="text-xs font-bold px-4 py-2 rounded-xl transition-all" [ngClass]="sentInviteFriendIds.includes(friend.id) ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'">
                    {{ sentInviteFriendIds.includes(friend.id) ? 'تم إرسال الدعوة ✓' : 'إرسال دعوة ✉️' }}
                 </button>
              </div>
           </div>

           <ng-template #noFriendsHub>
              <div class="bg-black/30 border border-white/5 rounded-2xl p-6 text-center mb-6">
                 <p class="text-sm text-slate-400">لا يوجد أصدقاء متصلون في قائمتك حالياً.</p>
                 <p class="text-xs text-indigo-400 mt-1">يمكنك إضافة أصدقاء عبر زر "إضافة صديق" في الشريط العلوي!</p>
              </div>
           </ng-template>

           <button (click)="showHubInviteModal = false" class="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-2xl border border-white/10 text-xs transition-colors">
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
  Plus = Plus;
  Sparkles = Sparkles;
  Edit3 = Edit3;

  editGame(id: string) {
    this.router.navigate(['/arcade/ai-builder'], { queryParams: { gameId: id } });
  }
  showAddFriend = false;
  showSubmitGameModal = false;
  showOpenTTDModal = false;
  showHubInviteModal = false;
  selectedGameForInvite: ArcadeGame | null = null;
  sentInviteFriendIds: string[] = [];
  newFriendName = '';
  newGameUrl = '';
  newGameTitle = '';
  isAdding = false;

  openInviteModalForGame(game: ArcadeGame) {
    this.selectedGameForInvite = game;
    this.showHubInviteModal = true;
  }

  async sendHubGameInvite(friendId: string) {
    if (!this.selectedGameForInvite) return;
    const game = this.selectedGameForInvite;
    const roomCode = 'ROOM-' + Math.floor(1000 + Math.random() * 9000);

    let customGameData: any = undefined;
    if (game.id.startsWith('custom_game_')) {
      const htmlContent = localStorage.getItem(`arcade_custom_code_${game.id}`) || '';
      customGameData = {
        title: game.title,
        description: game.description,
        thumbnail: game.thumbnail,
        category: game.category,
        genre: game.genre,
        htmlContent: htmlContent,
        updatedAt: Date.now()
      };
    }

    this.sentInviteFriendIds.push(friendId);
    await this.firebaseService.sendGameInvite(
      friendId,
      game.id,
      game.title,
      roomCode,
      customGameData
    );

    // توجيه المرسل فوراً لساحة اللعب كصاحب الغرفة (Host)
    this.showHubInviteModal = false;
    this.router.navigate(['/arcade/arena', game.id], { queryParams: { room: roomCode, host: 'true' } });
  }

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
    } else if (id === 'word-chain') {
      this.router.navigate(['/arcade/word-chain']);
    } else if (id === 'flashcards') {
      this.router.navigate(['/arcade/flashcards']);
    } else if (id === 'number-guesser') {
      this.router.navigate(['/arcade/number-guesser']);
    } else {
      this.router.navigate(['/arcade/arena', id]);
    }
  }

  playOpenTTD(version: 'original' | 'modified') {
    this.showOpenTTDModal = false;
    this.router.navigate(['/arcade/arena', 'openttd'], { queryParams: { v: version } });
  }

  async acceptInvite(invite: any) {
    // التحقق مما إذا كانت اللعبة محلية/مخصصة ومزامنتها تلقائياً عند القبول
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

  onImageError(event: Event) {
    const el = event.target as HTMLElement;
    el.style.display = 'none';
  }
}
