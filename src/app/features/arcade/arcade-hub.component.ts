import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ArcadeService, ArcadeGame, GameCategory } from './arcade.service';
import { GlobalStateService } from '../../core/services/global-state.service';
import { FirebaseService } from '../../core/services/firebase.service';
import { LucideAngularModule, UserPlus, Plus, Sparkles, Edit3, Gamepad2, Trophy, Flame, Zap, Play, Users, Cpu, Shield, ArrowRight } from 'lucide-angular';

@Component({
  selector: 'app-arcade-hub',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule],
  template: `
    <div class="min-h-screen bg-[#050811] text-slate-100 p-3 sm:p-6 md:p-8 font-['Tajawal'] select-none text-right overflow-y-auto custom-scrollbar relative" dir="rtl">
      
      <!-- ================= ARCADE MISTY FOG BACKGROUND ================= -->
      <div class="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <!-- Background Image -->
        <img src="assets/images/arcade-bg.jpg" 
             alt="Arcade Background" 
             class="w-full h-full object-cover object-center scale-100 opacity-95" />
        
        <!-- Light Misty Haze & Soft Contrast Layers -->
        <div class="absolute inset-0 backdrop-blur-[2px] bg-[#050811]/45"></div>
        <div class="absolute inset-0 bg-gradient-to-t from-[#050811] via-[#050811]/30 to-[#050811]/60"></div>
        <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.12),transparent_75%)]"></div>
      </div>

      <!-- ================= INCOMING GAME INVITES ================= -->
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

      <div class="max-w-7xl mx-auto space-y-8 relative z-10">

        <!-- ================= 1. ARCADE FRIENDS & LIVE STATUS BAR ================= -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0a0f1d]/80 border border-white/10 rounded-2xl p-3 sm:p-4 backdrop-blur-xl shadow-2xl">
          <div class="flex items-center gap-3 overflow-x-auto scrollbar-hide flex-1 py-1">
            <div class="flex items-center gap-2 sm:gap-3">
               <span class="text-indigo-400 text-xs font-black whitespace-nowrap ml-1 sm:ml-2 flex items-center gap-1.5">
                 <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                 الأصدقاء المتصلون:
               </span>
               <ng-container *ngFor="let friend of globalState.friends()">
                 <div class="relative group cursor-pointer">
                   <img [src]="friend.avatarUrl" class="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-transparent hover:border-indigo-500 object-cover transition-all duration-300 shadow-md" />
                   <span class="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 border-[#0B0F19]"
                         [ngClass]="{
                           'bg-emerald-400 shadow-[0_0_8px_rgba(34,197,94,0.6)]': friend.status === 'online',
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
          
          <!-- Actions: Add Friend + Submit Game -->
          <div class="flex items-center gap-2 shrink-0 border-t sm:border-t-0 sm:border-r border-white/10 pt-2 sm:pt-0 sm:pr-4 sm:ml-2 justify-end">
             <button (click)="showSubmitGameModal = true" class="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl px-3 sm:px-4 h-9 text-xs font-black transition-all flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 cursor-pointer">
               <span>+</span>
               أضف لعبتك
             </button>
             
             <ng-container *ngIf="showAddFriend; else addBtn">
               <input type="text" [(ngModel)]="newFriendName" (keyup.enter)="addFriend()" [disabled]="isAdding" placeholder="اسم المستخدم..." class="px-3 h-9 bg-black/40 border border-indigo-500/50 rounded-xl text-xs text-white text-right focus:outline-none focus:bg-black/60 w-28 sm:w-36 transition-all disabled:opacity-50" />
               <button (click)="addFriend()" [disabled]="isAdding" class="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-3 sm:px-4 h-9 text-xs font-bold transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 min-w-[60px] sm:min-w-[70px]">
                 {{ isAdding ? 'جاري...' : 'إضافة' }}
               </button>
             </ng-container>
             <ng-template #addBtn>
               <button (click)="showAddFriend = true" class="flex items-center gap-1.5 sm:gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl px-3 sm:px-4 h-9 text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer">
                 <lucide-icon [img]="UserPlus" class="w-3.5 h-3.5 text-indigo-400"></lucide-icon>
                 إضافة صديق
               </button>
             </ng-template>
          </div>
        </div>

        <!-- ================= 2. EPIC CYBERPUNK ARCADE HERO BANNER ================= -->
        <div class="relative rounded-3xl sm:rounded-[2.5rem] overflow-hidden border border-indigo-500/30 bg-gradient-to-br from-[#0b1026] via-[#0e1638] to-[#150a2a] shadow-2xl p-6 sm:p-10 md:p-14 relative group">
          
          <!-- Background Cyber Mesh Glows -->
          <div class="absolute -top-24 -right-24 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none"></div>
          <div class="absolute -bottom-24 -left-24 w-96 h-96 bg-fuchsia-600/20 rounded-full blur-[120px] pointer-events-none"></div>
          <div class="absolute inset-0 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none"></div>

          <!-- Hero Content Flex -->
          <div class="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8 md:gap-12">
            
            <!-- Right: Title, Badges, CTAs -->
            <div class="space-y-4 max-w-2xl text-right">
              
              <!-- Floating Engine Badges -->
              <div class="flex items-center gap-2 flex-wrap justify-start">
                <div class="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/20 border border-indigo-500/40 rounded-full backdrop-blur-md">
                  <span class="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                  <span class="text-[11px] font-black text-cyan-300 font-mono">3D ARCADE ENGINE v2.5</span>
                </div>
                <div class="inline-flex items-center gap-1 px-3 py-1 bg-fuchsia-500/20 border border-fuchsia-500/40 rounded-full text-[11px] font-black text-fuchsia-300">
                  <span>⚡ 60 FPS ULTRA</span>
                </div>
                <div class="inline-flex items-center gap-1 px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 rounded-full text-[11px] font-black text-emerald-300">
                  <span>👥 P2P MULTIPLAYER</span>
                </div>
              </div>

              <!-- Epic Title -->
              <h1 class="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-tight">
                ساحة الألعاب السيادية
                <span class="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-300 to-fuchsia-400 text-2xl sm:text-4xl mt-1">
                  Si-Neuro Cyber Arcade
                </span>
              </h1>

              <!-- Subtitle -->
              <p class="text-slate-300 text-xs sm:text-sm md:text-base font-medium leading-relaxed">
                استمتع بأقوى ألعاب الـ 3D والركض الحماسي، ألعاب الذكاء وتحديات 1v1 الجماعية، مع صانع الألعاب الذكي لتوليد ألعابك الخاصة بالـ AI وبثها لجميع اللاعبين!
              </p>

              <!-- Hero CTA Buttons -->
              <div class="flex items-center gap-3 flex-wrap pt-2">
                
                <!-- Play Top Game Button -->
                <button 
                  (click)="playGame('subway-surfers')" 
                  class="bg-gradient-to-r from-cyan-500 via-indigo-600 to-fuchsia-600 hover:from-cyan-400 hover:to-fuchsia-500 text-white font-black px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl shadow-2xl shadow-indigo-600/40 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 cursor-pointer text-sm sm:text-base">
                  <span class="text-xl">🏃‍♂️⚡</span>
                  <span>العب الأكثر شعبية: Metro Dash 3D</span>
                </button>

                <!-- AI Games Universe -->
                <button 
                  [routerLink]="['/arcade/ai-games']"
                  class="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold px-5 py-3.5 rounded-2xl transition-all hover:scale-105 active:scale-95 flex items-center gap-2 text-xs sm:text-sm cursor-pointer shadow-lg">
                  <span>🧬</span>
                  <span>ألعاب الذكاء الاصطناعي</span>
                </button>

                <!-- AI Builder -->
                <button 
                  [routerLink]="['/arcade/ai-builder']"
                  class="bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 font-bold px-4 py-3.5 rounded-2xl transition-all flex items-center gap-2 text-xs sm:text-sm cursor-pointer">
                  <span>🛠️</span>
                  <span>صانع الألعاب الذكي</span>
                </button>

              </div>

            </div>

            <!-- Left: High-Energy Featured 3D Showcase Card -->
            <div class="w-full lg:w-96 shrink-0">
              <div class="relative rounded-3xl overflow-hidden border-2 border-indigo-500/50 bg-[#090d20] p-4 shadow-2xl shadow-indigo-500/20 group-hover:border-cyan-400 transition-all duration-500">
                
                <!-- Image / Banner -->
                <div class="relative h-44 rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center">
                  <img src="assets/images/metro-dash-thumb.jpg" 
                       (error)="onImageFallback($event)" 
                       alt="Metro Dash 3D" 
                       class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  
                  <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
                  
                  <span class="absolute top-2 right-2 bg-gradient-to-r from-red-600 to-amber-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg animate-pulse">
                    🔥 HOT 3D GAME
                  </span>

                  <span class="absolute bottom-2 right-2 text-xs font-black text-cyan-300 font-mono">
                    Metro Dash 3D 🚇⚡
                  </span>
                </div>

                <!-- Featured Card Mini Specs -->
                <div class="mt-3 space-y-2 text-right">
                  <div class="flex items-center justify-between text-[11px] text-slate-400">
                    <span class="text-emerald-400 font-bold font-mono">● 14,200 نقطة قياسية</span>
                    <span>3D Runner • Cairo Rails</span>
                  </div>
                  
                  <div class="grid grid-cols-3 gap-1.5 text-center text-[10px] font-mono text-slate-400 bg-black/40 p-2 rounded-xl border border-white/5">
                    <div>
                      <span class="block text-indigo-300 font-bold">1-2 P</span>
                      <span>لاعبين</span>
                    </div>
                    <div>
                      <span class="block text-cyan-300 font-bold">60 FPS</span>
                      <span>سلاسة</span>
                    </div>
                    <div>
                      <span class="block text-amber-300 font-bold">3 أنماط</span>
                      <span>Play Modes</span>
                    </div>
                  </div>

                  <button 
                    (click)="playGame('subway-surfers')" 
                    class="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer">
                    العب الآن مجاناً 🎮
                  </button>
                </div>

              </div>
            </div>

          </div>

        </div>

        <!-- ================= 3. ARCADE LIVE STATS & TELEMETRY BAR ================= -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          
          <div class="bg-[#0e1426]/90 border border-white/10 rounded-2xl p-4 flex items-center gap-3 shadow-xl">
            <div class="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-lg shrink-0">
              🎮
            </div>
            <div>
              <span class="text-base sm:text-xl font-black text-white font-mono">{{ games.length + 3 }}+</span>
              <p class="text-[11px] text-slate-400 font-bold">ألعاب سيادية نشطة</p>
            </div>
          </div>

          <div class="bg-[#0e1426]/90 border border-white/10 rounded-2xl p-4 flex items-center gap-3 shadow-xl">
            <div class="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-lg shrink-0">
              ⚡
            </div>
            <div>
              <span class="text-base sm:text-xl font-black text-cyan-300 font-mono">0 Latency</span>
              <p class="text-[11px] text-slate-400 font-bold">محركات 3D مدمجة</p>
            </div>
          </div>

          <div class="bg-[#0e1426]/90 border border-white/10 rounded-2xl p-4 flex items-center gap-3 shadow-xl">
            <div class="w-10 h-10 rounded-xl bg-fuchsia-500/20 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-400 text-lg shrink-0">
              👑
            </div>
            <div>
              <span class="text-base sm:text-xl font-black text-fuchsia-300 font-mono">3 Play Modes</span>
              <p class="text-[11px] text-slate-400 font-bold">محلي • غرف P2P • Pro</p>
            </div>
          </div>

          <div class="bg-[#0e1426]/90 border border-white/10 rounded-2xl p-4 flex items-center gap-3 shadow-xl">
            <div class="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 text-lg shrink-0">
              🏆
            </div>
            <div>
              <span class="text-base sm:text-xl font-black text-amber-300 font-mono">Top #1</span>
              <p class="text-[11px] text-slate-400 font-bold">المتصدر: أحمد عرفه</p>
            </div>
          </div>

        </div>

        <!-- ================= 4. GAME BUILDERS & AI CREATION SPOTLIGHT ================= -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          
          <!-- Spotlight 1: AI Autonomous Games Hub -->
          <div 
            [routerLink]="['/arcade/ai-games']"
            class="relative rounded-3xl border-2 border-indigo-500/60 hover:border-fuchsia-400 bg-gradient-to-br from-indigo-950/80 via-slate-900/90 to-purple-950/80 p-6 flex flex-col justify-between shadow-2xl transition-all duration-300 hover:scale-[1.02] cursor-pointer group overflow-hidden">
            <div class="absolute -right-8 -top-8 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none"></div>
            
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-2xl shadow-lg">🧬</span>
                <span class="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300">طفرات لانهائية</span>
              </div>
              <h3 class="text-lg font-black text-white group-hover:text-indigo-300 transition-colors">عالم ألعاب الذكاء الاصطناعي 🧬</h3>
              <p class="text-xs text-slate-300 leading-relaxed">ألعاب ذاتية التوليد يبتكرها الـ AI بالكامل مع مراحل مستمرة وطفرات أسبوعية.</p>
            </div>

            <div class="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-black text-indigo-400 group-hover:text-fuchsia-300">
              <span>استكشف الألعاب الذكية ←</span>
              <span>⚡ Live</span>
            </div>
          </div>

          <!-- Spotlight 2: AI Game Studio Builder -->
          <div 
            [routerLink]="['/arcade/ai-builder']"
            class="relative rounded-3xl border-2 border-purple-500/50 hover:border-amber-400 bg-gradient-to-br from-purple-950/80 via-slate-900/90 to-indigo-950/80 p-6 flex flex-col justify-between shadow-2xl transition-all duration-300 hover:scale-[1.02] cursor-pointer group overflow-hidden">
            <div class="absolute -right-8 -top-8 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl pointer-events-none"></div>
            
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="w-12 h-12 rounded-2xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center text-2xl shadow-lg">⚡</span>
                <span class="text-[10px] font-black px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300">Zero Code</span>
              </div>
              <h3 class="text-lg font-black text-white group-hover:text-amber-300 transition-colors">استوديو صانع الألعاب الذكي 🛠️</h3>
              <p class="text-xs text-slate-300 leading-relaxed">اكتب فكرة لعبتك في سطر واحد وسيقوم المهندس العصبي ببرمجتها وتشغيلها فوراً!</p>
            </div>

            <div class="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-black text-purple-400 group-hover:text-amber-300">
              <span>افتح الاستوديو الذكي ←</span>
              <span>🚀 Prompt to Game</span>
            </div>
          </div>

          <!-- Spotlight 3: Godot Game Engine -->
          <div 
            [routerLink]="['/arcade/godot-builder']"
            class="relative rounded-3xl border-2 border-cyan-500/50 hover:border-cyan-300 bg-gradient-to-br from-cyan-950/80 via-slate-900/90 to-blue-950/80 p-6 flex flex-col justify-between shadow-2xl transition-all duration-300 hover:scale-[1.02] cursor-pointer group overflow-hidden">
            <div class="absolute -right-8 -top-8 w-32 h-32 bg-cyan-500/20 rounded-full blur-2xl pointer-events-none"></div>
            
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="w-12 h-12 rounded-2xl bg-cyan-600/30 border border-cyan-400/40 flex items-center justify-center text-2xl shadow-lg">🎮</span>
                <span class="text-[10px] font-black px-2.5 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300">Godot Web Engine</span>
              </div>
              <h3 class="text-lg font-black text-white group-hover:text-cyan-300 transition-colors">محرر ألعاب Godot المباشر 🕹️</h3>
              <p class="text-xs text-slate-300 leading-relaxed">بيئة تطوير احترافية بمحرك Godot لتصميم وتعديل ألعاب الـ Web و 2D/3D مباشرة.</p>
            </div>

            <div class="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-black text-cyan-400 group-hover:text-cyan-300">
              <span>تشغيل محرر Godot ←</span>
              <span>📦 WebAssembly</span>
            </div>
          </div>

        </div>

        <!-- ================= 5. MAIN GAMES LIBRARY HEADER & CATEGORY FILTER ================= -->
        <div class="space-y-4 pt-4 border-t border-white/10">
          
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 class="text-2xl font-black text-white flex items-center gap-2.5">
                <span class="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                  <lucide-icon [img]="Gamepad2" class="w-5 h-5"></lucide-icon>
                </span>
                مكتبة الألعاب السيادية
              </h2>
              <p class="text-xs sm:text-sm text-slate-400 mt-1">
                جميع الألعاب تعمل محلياً وفورياً داخل بيئة نكسوس، بدون إعلانات وبسيادة كاملة.
              </p>
            </div>

            <!-- Search input -->
            <div class="relative w-full md:w-72">
              <input 
                type="text" 
                [(ngModel)]="searchQuery" 
                placeholder="ابحث عن لعبة أو تصنيف..." 
                class="w-full h-11 bg-black/40 border border-white/10 rounded-2xl pr-10 pl-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors" />
              <span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            </div>
          </div>

          <!-- Category Filter Pills -->
          <div class="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button 
              (click)="selectedCategory = 'all'"
              [ngClass]="selectedCategory === 'all' ? 'bg-indigo-600 text-white font-black shadow-lg shadow-indigo-600/30' : 'bg-black/30 text-slate-400 hover:text-white border border-white/5'"
              class="px-4 py-2 rounded-xl text-xs whitespace-nowrap transition-all cursor-pointer">
              🔥 جميع الألعاب ({{ games.length }})
            </button>

            <button 
              (click)="selectedCategory = '3d'"
              [ngClass]="selectedCategory === '3d' ? 'bg-indigo-600 text-white font-black shadow-lg shadow-indigo-600/30' : 'bg-black/30 text-slate-400 hover:text-white border border-white/5'"
              class="px-4 py-2 rounded-xl text-xs whitespace-nowrap transition-all cursor-pointer">
              🚀 ألعاب 3D وأكشن
            </button>

            <button 
              (click)="selectedCategory = 'mental'"
              [ngClass]="selectedCategory === 'mental' ? 'bg-indigo-600 text-white font-black shadow-lg shadow-indigo-600/30' : 'bg-black/30 text-slate-400 hover:text-white border border-white/5'"
              class="px-4 py-2 rounded-xl text-xs whitespace-nowrap transition-all cursor-pointer">
              🧠 ألعاب ذهنية وتركيز
            </button>

            <button 
              (click)="selectedCategory = 'multiplayer'"
              [ngClass]="selectedCategory === 'multiplayer' ? 'bg-indigo-600 text-white font-black shadow-lg shadow-indigo-600/30' : 'bg-black/30 text-slate-400 hover:text-white border border-white/5'"
              class="px-4 py-2 rounded-xl text-xs whitespace-nowrap transition-all cursor-pointer">
              👥 جماعية و 1v1
            </button>
          </div>

        </div>

        <!-- ================= 6. GAMES GRID ================= -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          
          <div *ngFor="let game of displayedGames" class="group relative">
            
            <!-- Game Card Container -->
            <div class="aspect-[4/3] rounded-3xl overflow-hidden border bg-[#0b0f1e] hover:border-indigo-400/80 transition-all duration-500 hover:scale-[1.02] flex flex-col relative shadow-xl hover:shadow-[0_0_30px_rgba(99,102,241,0.3)]"
                 [ngClass]="getGameCardGlow(game.id)">
              
              <!-- Thumbnail / Visual -->
              <div class="flex-1 bg-slate-900 flex items-center justify-center opacity-85 group-hover:opacity-100 transition-opacity overflow-hidden relative">
                
                <img *ngIf="game.thumbnail" 
                     [src]="game.thumbnail" 
                     class="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" 
                     [alt]="game.title" 
                     (error)="onCardImageFallback($event, game)" />
                
                <div *ngIf="!game.thumbnail" class="flex flex-col items-center justify-center text-slate-600">
                  <span class="text-4xl mb-2">🎮</span>
                  <span class="text-xs font-mono font-bold">{{ game.genre }}</span>
                </div>

                <!-- Top Badges -->
                <div class="absolute top-3 right-3 flex items-center gap-1.5 z-20">
                  <span *ngIf="game.id === 'riddle-master'" class="bg-gradient-to-r from-purple-500 via-pink-500 to-amber-300 text-slate-950 text-[9px] font-black px-2.5 py-0.5 rounded-full shadow-lg animate-pulse">
                    🧩 100 LEVELS
                  </span>
                  <span *ngIf="game.id === 'sonic-runner'" class="bg-gradient-to-r from-blue-600 via-sky-400 to-amber-400 text-slate-950 text-[9px] font-black px-2.5 py-0.5 rounded-full shadow-lg animate-pulse">
                    ⚡ SONIC 3D
                  </span>
                  <span *ngIf="game.id === 'abdullah-clinic'" class="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-slate-950 text-[9px] font-black px-2.5 py-0.5 rounded-full shadow-lg animate-pulse">
                    💻 THE CODE LAB
                  </span>
                  <span *ngIf="game.id === 'bomb-arena'" class="bg-gradient-to-r from-amber-500 via-orange-500 to-lime-400 text-slate-950 text-[9px] font-black px-2.5 py-0.5 rounded-full shadow-lg animate-pulse">
                    💣 BOOM BUDDIES
                  </span>
                  <span *ngIf="game.id === 'funny-answers'" class="bg-gradient-to-r from-rose-500 via-yellow-400 to-lime-400 text-slate-950 text-[9px] font-black px-2.5 py-0.5 rounded-full shadow-lg animate-pulse">
                    🤣 ABSURDO
                  </span>
                  <span *ngIf="game.id === 'mindustry'" class="bg-gradient-to-r from-orange-500 via-amber-400 to-cyan-400 text-slate-950 text-[9px] font-black px-2.5 py-0.5 rounded-full shadow-lg animate-pulse">
                    🤖 BOTS & BLOCKS
                  </span>
                  <span *ngIf="game.id === 'adventure-time'" class="bg-gradient-to-r from-fuchsia-500 to-amber-400 text-slate-950 text-[9px] font-black px-2.5 py-0.5 rounded-full shadow-lg animate-pulse">
                    🗡️ LOOT & SCOOT
                  </span>
                  <span *ngIf="game.id === 'schulte-table'" class="bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-400 text-white text-[9px] font-black px-2.5 py-0.5 rounded-full shadow-lg animate-pulse">
                    🧠 SCHULTE 5×5
                  </span>
                  <span *ngIf="game.id === 'neuro-physio'" class="bg-gradient-to-r from-cyan-400 to-amber-400 text-slate-950 text-[9px] font-black px-2 py-0.5 rounded-full shadow animate-pulse">
                    🦾 القاهرة 2026
                  </span>
                  <span *ngIf="game.maxPlayers && game.maxPlayers > 1" class="bg-indigo-600/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow">
                    👥 {{ game.maxPlayers }}P
                  </span>
                </div>

                <div class="absolute inset-0 bg-gradient-to-t from-[#0b0f1e] via-[#0b0f1e]/60 to-transparent"></div>
              </div>

              <!-- Card Content Overlay -->
              <div class="absolute inset-0 p-4 sm:p-5 flex flex-col justify-end text-right z-10">
                
                <h3 class="text-sm sm:text-base font-black mb-1 truncate text-white group-hover:text-indigo-300 transition-colors">
                  {{ game.title }}
                </h3>

                <p class="text-[10px] text-slate-400 mb-3 line-clamp-2 leading-relaxed font-medium">
                  {{ game.description }}
                </p>

                <!-- Action Buttons: Play + Invite -->
                <div class="flex items-center gap-2 justify-end">
                  
                  <button *ngIf="game.id.startsWith('custom_game_')" (click)="editGame(game.id)" class="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold h-9 px-3 text-xs flex items-center gap-1 shadow cursor-pointer">
                    <span>✏️</span>
                  </button>

                  <button *ngIf="game.status === 'available'" (click)="openInviteModalForGame(game)" class="bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white rounded-xl font-bold h-9 px-3 text-xs flex items-center gap-1.5 border border-white/10 transition-all cursor-pointer">
                    <span>✉️</span>
                    <span class="hidden sm:inline">دعوة</span>
                  </button>

                  <button *ngIf="game.status === 'available'" (click)="playGame(game.id)"
                          class="rounded-xl font-black h-9 px-4 text-xs cursor-pointer whitespace-nowrap transition-all shadow-lg flex items-center gap-1.5"
                          [ngClass]="getGamePlayButtonClass(game.id)">
                    <span>العب الآن</span>
                    <span>⚡</span>
                  </button>

                  <button *ngIf="game.status !== 'available'" disabled class="bg-white/10 text-white/40 rounded-xl font-bold h-9 px-4 text-xs cursor-not-allowed">
                    قريباً
                  </button>

                </div>

              </div>

            </div>

          </div>

        </div>

      </div>

      <!-- ================= MODALS ================= -->

      <!-- OpenTTD Selection Modal -->
      <div *ngIf="showOpenTTDModal" class="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 text-right" dir="rtl">
        <div class="bg-slate-900 border border-white/10 rounded-3xl p-8 w-full max-w-2xl shadow-2xl relative overflow-hidden">
           <div class="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent pointer-events-none"></div>
           <h3 class="text-3xl font-black text-white mb-2">اختر إصدار اللعبة 🚂</h3>
           <p class="text-slate-400 mb-8">اختر بين الإصدار الأصلي الكلاسيكي، أو الإصدار المعدل الذي يحتوي على إضافات وتحسينات جديدة.</p>
           
           <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
             <div (click)="playOpenTTD('original')" class="group cursor-pointer bg-black/40 border border-slate-700 hover:border-slate-500 rounded-2xl p-6 transition-all hover:bg-slate-800">
                <div class="flex items-center gap-4 mb-4">
                  <div class="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-600">
                     <span class="text-2xl">🏛️</span>
                  </div>
                  <h4 class="text-xl font-bold text-white group-hover:text-slate-300">الإصدار الأصلي</h4>
                </div>
                <p class="text-sm text-slate-400">لعبة Transport Tycoon Deluxe الكلاسيكية بدون أي تعديلات. استمتع بالتجربة الأصلية لإدارة شبكات النقل.</p>
             </div>

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

      <!-- Add Game Modal -->
      <div *ngIf="showSubmitGameModal" class="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 text-right" dir="rtl">
        <div class="bg-slate-900 border border-white/10 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl">
           <h3 class="text-xl sm:text-2xl font-black text-white mb-4 sm:mb-6">أضف لعبتك الخاصة</h3>
           <input type="text" [(ngModel)]="newGameUrl" placeholder="رابط اللعبة (URL)..." class="w-full h-11 sm:h-12 bg-black/40 border border-indigo-500/50 rounded-2xl text-xs sm:text-sm text-white px-4 mb-3 sm:mb-4" />
           <input type="text" [(ngModel)]="newGameTitle" placeholder="اسم اللعبة..." class="w-full h-11 sm:h-12 bg-black/40 border border-indigo-500/50 rounded-2xl text-xs sm:text-sm text-white px-4 mb-5 sm:mb-6" />
           <div class="flex gap-3 sm:gap-4">
             <button (click)="showSubmitGameModal = false" class="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm">إلغاء</button>
             <button (click)="submitGame()" class="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm">إرسال</button>
           </div>
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
  selectedCategory: string = 'all';
  searchQuery: string = '';

  arcadeService = inject(ArcadeService);
  private router = inject(Router);
  globalState = inject(GlobalStateService);
  private firebaseService = inject(FirebaseService);

  // Lucide Icons
  UserPlus = UserPlus;
  Plus = Plus;
  Sparkles = Sparkles;
  Edit3 = Edit3;
  Gamepad2 = Gamepad2;
  Trophy = Trophy;
  Flame = Flame;
  Zap = Zap;
  Play = Play;
  Users = Users;
  Cpu = Cpu;
  Shield = Shield;
  ArrowRight = ArrowRight;

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

  get displayedGames(): ArcadeGame[] {
    let list = this.games.filter(g => g.status !== 'coming_soon');
    
    // Category filter
    if (this.selectedCategory === '3d') {
      list = list.filter(g => g.id.includes('subway') || g.id.includes('metro') || g.id.includes('sonic') || g.genre.toLowerCase().includes('action') || g.genre.toLowerCase().includes('3d'));
    } else if (this.selectedCategory === 'mental') {
      list = list.filter(g => g.category === 'mental');
    } else if (this.selectedCategory === 'multiplayer') {
      list = list.filter(g => (g.maxPlayers && g.maxPlayers > 1) || g.id === 'schulte-table' || g.id === 'echoes-of-time');
    }

    // Search query filter
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(g => 
        g.title.toLowerCase().includes(q) || 
        g.description.toLowerCase().includes(q) || 
        g.genre.toLowerCase().includes(q)
      );
    }

    return list;
  }

  getGameCardGlow(id: string): string {
    switch (id) {
      case 'riddle-master':
        return 'border-2 border-purple-500/90 shadow-[0_0_25px_rgba(168,85,247,0.5)] hover:border-amber-400';
      case 'schulte-table':
        return 'border-2 border-purple-500/80 shadow-[0_0_25px_rgba(168,85,247,0.45)] hover:border-cyan-400';
      case 'sonic-runner':
        return 'border-2 border-blue-500/90 shadow-[0_0_25px_rgba(59,130,246,0.5)] hover:border-amber-400';
      case 'neuro-physio':
        return 'border-2 border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.4)]';
      case 'abdullah-clinic':
        return 'border-2 border-emerald-400/80 shadow-[0_0_25px_rgba(52,211,153,0.45)] hover:border-cyan-400';
      case 'adventure-time':
        return 'border-2 border-fuchsia-500/70 shadow-[0_0_25px_rgba(217,70,239,0.35)] hover:border-amber-400';
      case 'mindustry':
        return 'border-2 border-orange-500/80 shadow-[0_0_25px_rgba(249,115,22,0.4)] hover:border-cyan-400';
      case 'funny-answers':
        return 'border-2 border-rose-500/80 shadow-[0_0_25px_rgba(244,63,94,0.4)] hover:border-yellow-400';
      case 'bomb-arena':
        return 'border-2 border-amber-500/80 shadow-[0_0_25px_rgba(245,158,11,0.45)] hover:border-lime-400';
      default:
        return 'border-white/10';
    }
  }

  getGamePlayButtonClass(id: string): string {
    switch (id) {
      case 'riddle-master':
        return 'bg-gradient-to-r from-purple-600 via-pink-600 to-amber-400 hover:from-purple-500 hover:to-amber-300 text-slate-950 font-black shadow-[0_0_15px_rgba(168,85,247,0.6)] hover:scale-105';
      case 'schulte-table':
        return 'bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-black shadow-[0_0_15px_rgba(168,85,247,0.5)] hover:scale-105';
      case 'sonic-runner':
        return 'bg-gradient-to-r from-blue-600 via-sky-400 to-amber-400 hover:from-blue-500 hover:to-amber-300 text-slate-950 font-black shadow-[0_0_15px_rgba(59,130,246,0.5)] hover:scale-105';
      case 'neuro-physio':
        return 'bg-gradient-to-r from-cyan-400 to-amber-400 text-slate-950 hover:scale-105 shadow-[0_0_15px_rgba(6,182,212,0.6)]';
      case 'abdullah-clinic':
        return 'bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-slate-950 font-black shadow-[0_0_15px_rgba(52,211,153,0.5)] hover:scale-105';
      case 'adventure-time':
        return 'bg-gradient-to-r from-fuchsia-600 to-amber-500 hover:from-fuchsia-500 hover:to-amber-400 text-white shadow-[0_0_15px_rgba(217,70,239,0.5)] hover:scale-105';
      case 'mindustry':
        return 'bg-gradient-to-r from-orange-500 to-cyan-400 hover:from-orange-400 hover:to-cyan-300 text-slate-950 font-black shadow-[0_0_15px_rgba(249,115,22,0.5)] hover:scale-105';
      case 'funny-answers':
        return 'bg-gradient-to-r from-rose-500 via-yellow-400 to-lime-400 hover:from-rose-400 hover:to-yellow-300 text-slate-950 font-black shadow-[0_0_15px_rgba(244,63,94,0.5)] hover:scale-105';
      case 'bomb-arena':
        return 'bg-gradient-to-r from-amber-500 via-orange-500 to-lime-400 hover:from-amber-400 hover:to-lime-300 text-slate-950 font-black shadow-[0_0_15px_rgba(245,158,11,0.5)] hover:scale-105';
      default:
        return 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 hover:scale-105';
    }
  }

  ngOnInit() {
    const dbName = this.globalState.userProfile().name;
    if (dbName) {
      localStorage.setItem('arcade_player_name', dbName);
    }

    this.arcadeService.getGames().subscribe(data => {
      this.games = data;
    });
  }

  editGame(id: string) {
    this.router.navigate(['/arcade/ai-builder'], { queryParams: { gameId: id } });
  }

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
    alert('تم إرسال اللعبة للمراجعة!');
    this.showSubmitGameModal = false;
    this.newGameTitle = '';
    this.newGameUrl = '';
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
    } else if (id === 'riddle-master') {
      this.router.navigate(['/arcade/riddle-master']);
    } else if (id === 'schulte-table') {
      this.router.navigate(['/arcade/schulte-table']);
    } else if (id === 'word-chain') {
      this.router.navigate(['/arcade/word-chain']);
    } else if (id === 'flashcards') {
      this.router.navigate(['/arcade/flashcards']);
    } else if (id === 'number-guesser') {
      this.router.navigate(['/arcade/number-guesser']);
    } else if (id === 'subway-surfers' || id === 'metro-dash') {
      this.router.navigate(['/arcade/subway-surfers-3d']);
    } else if (id === 'adventure-time') {
      this.router.navigate(['/arcade/adventure-time']);
    } else if (id === 'neuro-physio') {
      this.router.navigate(['/arcade/neuro-physio']);
    } else if (id === 'godot-builder') {
      this.router.navigate(['/arcade/godot-builder']);
    } else {
      this.router.navigate(['/arcade/arena', id]);
    }
  }

  playOpenTTD(version: 'original' | 'modified') {
    this.showOpenTTDModal = false;
    this.router.navigate(['/arcade/arena', 'openttd'], { queryParams: { v: version } });
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

  onImageFallback(event: Event) {
    const el = event.target as HTMLImageElement;
    el.src = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=800&auto=format&fit=crop';
  }

  onCardImageFallback(event: Event, game: ArcadeGame) {
    const el = event.target as HTMLImageElement;
    el.src = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=800&auto=format&fit=crop';
  }
}
