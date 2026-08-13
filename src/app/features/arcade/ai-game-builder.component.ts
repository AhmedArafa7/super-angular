import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute, ParamMap } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { 
  LucideAngularModule, Gamepad2, Sparkles, Cpu, Key, RefreshCw, CheckCircle2, 
  Code, Copy, Download, Maximize2, RotateCcw, Share2, Wrench, ArrowRight, 
  Layers, Trophy, Users, Globe, Lock, Play, Plus, Trash2, Edit3, History, 
  ChevronLeft, ChevronRight, Monitor, Tablet, Smartphone, Sliders, Volume2, 
  Image as ImageIcon, Activity, Eye, ShieldCheck, Crosshair, Pin, PinOff
} from 'lucide-angular';
import { AiKeyManagerService } from '../../core/services/ai-key-manager.service';
import { ToastService } from '../../core/services/toast.service';
import { SidebarService } from '../../core/sidebar.service';
import { CustomModuleStorageService, CustomModuleItem } from '../ai-module-builder/custom-module-viewer.component';
import { ArcadeService, ArcadeGame } from './arcade.service';
import { SuperArcadeBridgeService } from '../../core/services/super-arcade-bridge';
import { ArcadeCloudService } from '../../core/services/arcade-cloud.service';

export interface GameVersion {
  versionId: string;
  prompt: string;
  htmlContent: string;
  createdAt: number;
}

export interface SavedGameItem {
  id: string;
  title: string;
  versions: GameVersion[];
  activeVersionIndex: number;
  updatedAt: number;
  assets?: {
    heroSprite?: string;
    enemySprite?: string;
    bgMusicUrl?: string;
    soundEffectUrl?: string;
    gameSpeed?: number;
    playerLives?: number;
  };
}

@Component({
  selector: 'app-ai-game-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  template: `
    <div class="min-h-screen bg-slate-950 p-6 md:p-10 text-white font-sans text-right overflow-y-auto" dir="rtl">
      
      <!-- Top Navigation Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6 mb-8">
        <div class="flex items-center gap-4">
          <a routerLink="/arcade" class="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-slate-300 hover:text-white transition" title="العودة لمكتبة الألعاب">
            <lucide-icon [img]="ArrowRight" class="w-6 h-6"></lucide-icon>
          </a>
          <div>
            <div class="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-2">
              <lucide-icon [img]="Gamepad2" class="w-4 h-4 text-indigo-400"></lucide-icon>
              <span class="text-[10px] font-black uppercase text-indigo-400 tracking-wider">Super Arcade Professional AI Game Studio</span>
            </div>
            <h1 class="text-2xl md:text-4xl font-black tracking-tight text-white">استوديو صانع الألعاب الاحترافي (AI Game Studio)</h1>
            <p class="text-xs text-slate-400 font-medium mt-1">بيئة تطوير متكاملة لبناء الألعاب وتعديل الأصول والمؤثرات وسجل النسخ المتعاقبة.</p>
          </div>
        </div>

        <!-- Create New Game Button & Status Bar -->
        <div class="flex items-center gap-3">
          <button (click)="createNewGame()" class="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black flex items-center gap-2 transition shadow-lg shadow-indigo-600/30">
            <lucide-icon [img]="Plus" class="w-4 h-4"></lucide-icon>
            <span>مشروع لعبة جديد ⚡</span>
          </button>

          <div class="bg-slate-900/80 border border-white/10 rounded-2xl p-3 flex items-center gap-3 hidden sm:flex">
            <div class="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <lucide-icon [img]="Cpu" class="w-4 h-4"></lucide-icon>
            </div>
            <div class="text-right">
              <span class="text-[10px] text-slate-400 font-bold block">المحرك المتقدم للألعاب</span>
              <span class="text-xs font-black text-emerald-400 font-mono">Gemini 3.5 Flash lite (Arcade Engine)</span>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <!-- Engine Selection Tabs -->
        <div class="lg:col-span-12">
          <div class="bg-slate-900/80 border border-white/10 rounded-2xl p-2 flex items-center gap-2">
            <button 
              (click)="selectedEngine.set('web')"
              [class.bg-indigo-600]="selectedEngine() === 'web'"
              [class.text-white]="selectedEngine() === 'web'"
              [class.text-slate-400]="selectedEngine() !== 'web'"
              class="flex-1 px-4 py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2">
              <span>🌐</span>
              <span>Web Games (HTML5/Canvas)</span>
            </button>
            <button 
              (click)="selectedEngine.set('godot')"
              [class.bg-indigo-600]="selectedEngine() === 'godot'"
              [class.text-white]="selectedEngine() === 'godot'"
              [class.text-slate-400]="selectedEngine() !== 'godot'"
              class="flex-1 px-4 py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2">
              <span>🎮</span>
              <span>Godot Games (GDScript)</span>
            </button>
          </div>
        </div>

        <!-- Left Sidebar: Saved Games Drawer, Version History & Game Assets Manager -->
        <div class="lg:col-span-4 space-y-6">
          
          <!-- Saved User Games Drawer -->
          <div class="bg-slate-900/80 border border-white/10 rounded-3xl p-6 space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-black text-white flex items-center gap-2">
                <lucide-icon [img]="Gamepad2" class="w-4 h-4 text-indigo-400"></lucide-icon>
                <span>ألعابي المصنوعة سابقاً ({{ savedGames().length }})</span>
              </h3>
            </div>

            <div class="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
              @for (game of savedGames(); track game.id) {
                <div 
                  (click)="selectGame(game)"
                  [class.bg-indigo-600\/20]="activeGameId() === game.id"
                  [class.border-indigo-500\/50]="activeGameId() === game.id"
                  class="p-3 bg-slate-950/80 hover:bg-white/5 border border-white/5 rounded-2xl cursor-pointer transition flex items-center justify-between group">
                  
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                      <lucide-icon [img]="Gamepad2" class="w-4 h-4"></lucide-icon>
                    </div>
                    <div class="min-w-0">
                      <span class="text-xs font-bold text-white block truncate">{{ game.title }}</span>
                      <span class="text-[10px] text-slate-400 block font-mono">{{ game.versions.length }} إصدارات متتالية</span>
                    </div>
                  </div>

                  <button 
                    (click)="deleteEntireGame(game.id); $event.stopPropagation()"
                    title="حذف اللعبة بالكامل"
                    class="p-1.5 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded-lg transition opacity-0 group-hover:opacity-100">
                    <lucide-icon [img]="Trash2" class="w-3.5 h-3.5"></lucide-icon>
                  </button>
                </div>
              }

              @if (savedGames().length === 0) {
                <div class="text-center py-4 text-slate-500 text-xs font-medium">
                  لم تقم بإنشاء أي لعبة بعد. صف لعبتك في الصندوق واضغط توليد!
                </div>
              }
            </div>
          </div>

          <!-- Version History Timeline -->
          @if (activeGame()) {
            <div class="bg-slate-900/80 border border-white/10 rounded-3xl p-6 space-y-4 animate-in fade-in duration-300">
              <div class="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 class="text-xs font-black text-white flex items-center gap-2">
                  <lucide-icon [img]="History" class="w-4 h-4 text-indigo-400"></lucide-icon>
                  <span>سجل إصدارات وتحديثات اللعبة الحالية</span>
                </h3>
                <span class="text-[10px] bg-indigo-500/20 text-indigo-300 font-mono px-2 py-0.5 rounded-md font-bold">
                  إصدار {{ activeGame()!.activeVersionIndex + 1 }} من {{ activeGame()!.versions.length }}
                </span>
              </div>

              <div class="flex items-center justify-between gap-2">
                <button 
                  (click)="goToPreviousVersion()"
                  [disabled]="activeGame()!.activeVersionIndex <= 0"
                  class="flex-1 px-3 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded-xl text-xs font-bold flex items-center justify-center gap-1">
                  <lucide-icon [img]="ChevronRight" class="w-4 h-4"></lucide-icon>
                  <span>النسخة السابقة</span>
                </button>

                <button 
                  (click)="goToNextVersion()"
                  [disabled]="activeGame()!.activeVersionIndex >= activeGame()!.versions.length - 1"
                  class="flex-1 px-3 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded-xl text-xs font-bold flex items-center justify-center gap-1">
                  <span>النسخة التالية</span>
                  <lucide-icon [img]="ChevronLeft" class="w-4 h-4"></lucide-icon>
                </button>

                <button 
                  (click)="deleteCurrentVersion()"
                  title="حذف هذه النسخة"
                  class="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-xs font-bold">
                  <lucide-icon [img]="Trash2" class="w-4 h-4"></lucide-icon>
                </button>
              </div>
            </div>
          }

          <!-- Game Assets & Physics Configurator Tabs -->
          <div class="bg-slate-900/80 border border-white/10 rounded-3xl p-6 space-y-4">
            <div class="flex gap-4 border-b border-white/10 pb-2 mb-2">
              <button (click)="activeWorkspaceTab.set('physics')" [class.text-indigo-400]="activeWorkspaceTab() === 'physics'" class="text-[11px] font-black uppercase tracking-widest pb-1 transition-all">الفيزياء</button>
              <button (click)="activeWorkspaceTab.set('assets')" [class.text-indigo-400]="activeWorkspaceTab() === 'assets'" class="text-[11px] font-black uppercase tracking-widest pb-1 transition-all">الأصول</button>
              <button (click)="activeWorkspaceTab.set('factory')" [class.text-indigo-400]="activeWorkspaceTab() === 'factory'" class="text-[11px] font-black uppercase tracking-widest pb-1 transition-all">مصنع AI</button>
            </div>

            @if (activeWorkspaceTab() === 'physics') {
                <div class="space-y-3 animate-in fade-in">
                  <div>
                    <label class="text-[11px] font-bold text-slate-300 block mb-1">سرعة الحركة (Game Speed):</label>
                    <input type="range" min="0.5" max="2.5" step="0.1" [(ngModel)]="physicsConfig.speed" (change)="updateGameAssetsPrompt()" class="w-full accent-indigo-500" />
                  </div>
                  <div>
                    <label class="text-[11px] font-bold text-slate-300 block mb-1">عدد الأرواح:</label>
                    <input type="number" min="1" max="10" [(ngModel)]="physicsConfig.lives" (change)="updateGameAssetsPrompt()" class="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white" />
                  </div>
                </div>
            } @else if (activeWorkspaceTab() === 'assets') {
                <div class="space-y-2 animate-in fade-in">
                    <p class="text-[10px] text-slate-400 mb-2">أصول جاهزة ومجانية:</p>
                    <div class="grid grid-cols-1 gap-2">
                        <button (click)="physicsConfig.heroSprite = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png'; updateGameAssetsPrompt()" class="p-2 bg-slate-950 border border-white/10 rounded-xl text-[10px] font-bold hover:border-indigo-500 text-right">🚀 سفينة/بطل (Hero Sprite)</button>
                        <button (click)="physicsConfig.audioUrl = 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg'; updateGameAssetsPrompt()" class="p-2 bg-slate-950 border border-white/10 rounded-xl text-[10px] font-bold hover:border-indigo-500 text-right">🔊 مؤثر صوتي (SFX)</button>
                    </div>
                </div>
            } @else if (activeWorkspaceTab() === 'factory') {
                 <div class="space-y-2 animate-in fade-in">
                    <p class="text-[10px] text-slate-400 mb-2">توليد أصول بواسطة Gemini:</p>
                    <button (click)="generateAsset('Sprite')" [disabled]="isGeneratingAsset()" class="w-full p-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-black text-white mb-1 disabled:opacity-50">
                       {{ isGeneratingAsset() ? 'جاري التوليد...' : 'توليد شخصية (Sprite AI)' }}
                    </button>
                    <button (click)="generateAsset('Background')" [disabled]="isGeneratingAsset()" class="w-full p-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-black text-white disabled:opacity-50">
                       {{ isGeneratingAsset() ? 'جاري التوليد...' : 'توليد خلفية (BG AI)' }}
                    </button>
                 </div>
            }
          </div>

          <!-- Quick Templates -->
          <div class="bg-slate-900/70 border border-white/10 rounded-3xl p-6 space-y-3">
            <h3 class="text-xs font-black text-white flex items-center gap-2">
              <lucide-icon [img]="Sparkles" class="w-4 h-4 text-indigo-400"></lucide-icon>
              <span>قوالب جاهزة لبدء اللعبة:</span>
            </h3>

            <div class="space-y-2">
              @for (tmpl of gameTemplates; track tmpl.title) {
                <div 
                  (click)="applyTemplate(tmpl.prompt)"
                  class="p-3 bg-slate-950/80 hover:bg-indigo-600/20 border border-white/5 hover:border-indigo-500/40 rounded-2xl cursor-pointer transition group">
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-xs font-bold text-white group-hover:text-indigo-300">{{ tmpl.title }}</span>
                    <span class="text-[9px] px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-md font-mono">{{ tmpl.genre }}</span>
                  </div>
                  <p class="text-[10px] text-slate-400 leading-relaxed">{{ tmpl.desc }}</p>
                </div>
              }
            </div>
          </div>

        </div>

        <!-- Right Main Workspace: Game Prompt, Controls, Sandbox & Viewport -->
        <div class="lg:col-span-8 space-y-6">
          
          <!-- Prompt Input Area -->
          <div class="bg-slate-900/80 border border-white/10 rounded-3xl p-6 space-y-4 shadow-2xl">
            <label class="text-xs font-bold text-slate-200 block">
              {{ activeGameId() ? 'وصف التعديل أو التحديث للعبة الحالية:' : 'وصف إنشاء لعبة Arcade تفاعلية جديدة:' }}
            </label>

            <textarea 
              [(ngModel)]="promptText"
              rows="4"
              placeholder="مثال: اصنع لعبة سباق سيارات كلاسيكية بنمط نيون 2D Canvas مع التحكم بالأسهم، شاشة بداية ونهاية وصوت محرك محاكي..."
              class="w-full bg-slate-950 border border-white/10 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-indigo-500 resize-none font-medium placeholder:text-slate-600"
            ></textarea>

            <!-- Quick Action Chips -->
            <div class="space-y-2">
              <span class="text-[11px] font-bold text-slate-400 block">اختصارات تعديل الألعاب سريعة (Game Refinements):</span>
              <div class="flex flex-wrap gap-2">
                @for (sc of gameShortcuts; track sc.label) {
                  <button 
                    (click)="applyShortcut(sc.prompt)"
                    [disabled]="isGenerating()"
                    class="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-xl text-xs font-bold text-indigo-300 transition flex items-center gap-1.5">
                    <lucide-icon [img]="Wrench" class="w-3 h-3 text-indigo-400"></lucide-icon>
                    <span>{{ sc.label }}</span>
                  </button>
                }
              </div>
            </div>

            <div class="flex items-center justify-between flex-wrap gap-4 pt-2 border-t border-white/10">
              <span class="text-xs text-slate-400 flex items-center gap-2">
                <lucide-icon [img]="Trophy" class="w-4 h-4 text-amber-400"></lucide-icon>
                <span>تلقائياً: اللعب محلياً / غرف P2P / لعب أونلاين Pro</span>
              </span>

              <button 
                (click)="generateGame()"
                [disabled]="isGenerating() || !promptText.trim()"
                class="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:opacity-50 rounded-2xl text-xs font-black transition flex items-center gap-2 shadow-xl shadow-indigo-600/30">
                <lucide-icon [img]="isGenerating() ? RefreshCw : Sparkles" [class.animate-spin]="isGenerating()" class="w-4 h-4"></lucide-icon>
                <span>{{ isGenerating() ? 'الذكاء الاصطناعي يطور اللعبة...' : (activeGameId() ? 'تحديث وتطوير اللعبة ⚡' : 'توليد وبناء لعبة ⚡') }}</span>
              </button>
            </div>
          </div>

          <!-- Generated Live Preview & Sandbox -->
          @if (generatedHtml()) {
            <div class="space-y-4 animate-in fade-in duration-500">
              <div class="flex items-center justify-between flex-wrap gap-3">
                <div class="flex items-center gap-4">
                  <h2 class="text-lg font-black flex items-center gap-2">
                    <lucide-icon [img]="CheckCircle2" class="w-5 h-5 text-emerald-400"></lucide-icon>
                    <span>معاينة اللعبة التفاعلية</span>
                  </h2>

                  <!-- Viewport Switcher -->
                  <div class="bg-slate-900 border border-white/10 rounded-xl p-1 flex items-center gap-1">
                    <button 
                      (click)="viewportMode.set('desktop')"
                      [class.bg-indigo-600]="viewportMode() === 'desktop'"
                      [class.text-white]="viewportMode() === 'desktop'"
                      [class.text-slate-400]="viewportMode() !== 'desktop'"
                      title="عرض حاسوب"
                      class="p-1.5 rounded-lg transition">
                      <lucide-icon [img]="Monitor" class="w-3.5 h-3.5"></lucide-icon>
                    </button>
                    <button 
                      (click)="viewportMode.set('tablet')"
                      [class.bg-indigo-600]="viewportMode() === 'tablet'"
                      [class.text-white]="viewportMode() === 'tablet'"
                      [class.text-slate-400]="viewportMode() !== 'tablet'"
                      title="عرض تابلت (768px)"
                      class="p-1.5 rounded-lg transition">
                      <lucide-icon [img]="Tablet" class="w-3.5 h-3.5"></lucide-icon>
                    </button>
                    <button 
                      (click)="viewportMode.set('mobile')"
                      [class.bg-indigo-600]="viewportMode() === 'mobile'"
                      [class.text-white]="viewportMode() === 'mobile'"
                      [class.text-slate-400]="viewportMode() !== 'mobile'"
                      title="عرض هاتف (375px)"
                      class="p-1.5 rounded-lg transition">
                      <lucide-icon [img]="Smartphone" class="w-3.5 h-3.5"></lucide-icon>
                    </button>
                  </div>
                </div>

                <div class="flex items-center gap-2 flex-wrap">
                  <!-- FPS & Hitbox Debugger Toggle -->
                  <button 
                    (click)="debugOverlay.set(!debugOverlay())"
                    title="تفعيل/إخفاء شاشة تصحيح الأداء والتصادم"
                    [class.bg-rose-500\/20]="debugOverlay()"
                    [class.text-rose-400]="debugOverlay()"
                    [class.border-rose-500\/40]="debugOverlay()"
                    class="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-slate-200 flex items-center gap-1.5 transition">
                    <lucide-icon [img]="Crosshair" class="w-4 h-4 text-rose-400"></lucide-icon>
                    <span>{{ debugOverlay() ? 'إخفاء Debugger' : 'مُصحح الأداء FPS & Collisions' }}</span>
                  </button>

                  <button (click)="reloadIframe()" title="إعادة تشغيل" class="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <lucide-icon [img]="RotateCcw" class="w-4 h-4 text-indigo-400"></lucide-icon>
                    <span>إعادة تشغيل</span>
                  </button>

                  <button (click)="openFullScreen()" title="ملء الشاشة" class="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <lucide-icon [img]="Maximize2" class="w-4 h-4 text-emerald-400"></lucide-icon>
                    <span>ملء الشاشة</span>
                  </button>

                  <button (click)="downloadHtml()" title="تحميل HTML" class="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <lucide-icon [img]="Download" class="w-4 h-4 text-indigo-400"></lucide-icon>
                    <span>تحميل كود</span>
                  </button>

                  <button (click)="openPublishModal()" title="نشر اللعبة في معرض الألعاب" class="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl text-xs font-black text-white flex items-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer">
                    <lucide-icon [img]="Share2" class="w-4 h-4"></lucide-icon>
                    <span>نشر اللعبة 🚀</span>
                  </button>

                  <button (click)="showCodeViewer.set(!showCodeViewer())" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white flex items-center gap-2 shadow-lg shadow-indigo-600/20">
                    <lucide-icon [img]="Code" class="w-4 h-4"></lucide-icon>
                    <span>{{ showCodeViewer() ? 'إخفاء Sandbox' : 'عرض Sandbox الكود' }}</span>
                  </button>
                </div>
              </div>

              <!-- Interactive Live Code Sandbox Panel -->
              @if (showCodeViewer()) {
                <div class="bg-slate-950 border border-indigo-500/30 rounded-3xl p-6 space-y-3 font-mono text-xs animate-in fade-in duration-300">
                  <div class="flex items-center justify-between pb-2 border-b border-white/10">
                    <span class="text-indigo-400 font-bold">محرر كود اللعبة التفاعلي (Game Code Sandbox):</span>
                    <button (click)="copyCode()" class="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition">
                      <lucide-icon [img]="Copy" class="w-3.5 h-3.5"></lucide-icon>
                      <span>نسخ الكود</span>
                    </button>
                  </div>
                  <textarea 
                    [ngModel]="generatedHtml()"
                    (ngModelChange)="generatedHtml.set($event)"
                    rows="12"
                    class="w-full bg-slate-900/90 text-emerald-300 font-mono text-xs p-4 rounded-2xl border border-white/10 focus:outline-none focus:border-indigo-500 resize-y"
                    dir="ltr"
                  ></textarea>
                </div>
              }

              <!-- Visual Game Iframe Box -->
              <div class="bg-slate-950 border border-white/10 rounded-3xl p-4 min-h-[500px] overflow-hidden relative shadow-2xl flex justify-center items-center">
                <div 
                  class="transition-all duration-300 overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl"
                  [ngClass]="{
                    'w-full max-w-full': viewportMode() === 'desktop',
                    'w-[768px] max-w-full': viewportMode() === 'tablet',
                    'w-[375px] max-w-full': viewportMode() === 'mobile'
                  }">
                  <iframe 
                    [src]="safeIframeUrl()" 
                    class="w-full h-[550px] border-0 bg-slate-950" 
                    sandbox="allow-scripts allow-same-origin allow-modals flex-1">
                  </iframe>
                </div>
              </div>
            </div>
          }

        </div>
      </div>

      <!-- Publish Game Modal -->
      @if (showPublishModal()) {
        <div class="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center p-4" dir="rtl">
          <div class="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in duration-300">
            <div class="flex items-center justify-between border-b border-white/10 pb-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <lucide-icon [img]="Share2" class="w-5 h-5"></lucide-icon>
                </div>
                <div>
                  <h3 class="text-lg font-black text-white">نشر اللعبة في معرض الألعاب 🚀</h3>
                  <p class="text-xs text-slate-400">اجعل لعبتك المبتكرة متاحة للجميع في منصة Super Arcade!</p>
                </div>
              </div>
              <button (click)="showPublishModal.set(false)" class="p-2 hover:bg-white/10 text-slate-400 hover:text-white rounded-full">
                ✕
              </button>
            </div>

            <div class="space-y-4 text-right">
              <div>
                <label class="text-xs font-bold text-slate-300 block mb-1">عنوان اللعبة:</label>
                <input type="text" [(ngModel)]="publishData.title" placeholder="مثال: سباق النيون الخارق" class="w-full bg-slate-950 border border-white/10 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-bold" />
              </div>

              <div>
                <label class="text-xs font-bold text-slate-300 block mb-1">وصف اللعبة وطريقة اللعب:</label>
                <textarea [(ngModel)]="publishData.description" rows="3" placeholder="اكتب وصفاً جذاباً للعبة والقوانين..." class="w-full bg-slate-950 border border-white/10 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"></textarea>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="text-xs font-bold text-slate-300 block mb-1">التصنيف:</label>
                  <select [(ngModel)]="publishData.category" class="w-full bg-slate-950 border border-white/10 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500">
                    <option value="general">🎮 ألعاب عامة (General)</option>
                    <option value="mental">🧠 ألعاب ذهنية وألغاز (Mental)</option>
                  </select>
                </div>

                <div>
                  <label class="text-xs font-bold text-slate-300 block mb-1">النوع (Genre):</label>
                  <input type="text" [(ngModel)]="publishData.genre" placeholder="مثال: Arcade, Action..." class="w-full bg-slate-950 border border-white/10 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
            </div>

            <div class="flex items-center gap-3 pt-3 border-t border-white/10">
              <button (click)="showPublishModal.set(false)" class="flex-1 py-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-2xl text-xs font-bold transition cursor-pointer">
                إلغاء
              </button>
              <button (click)="confirmPublishGame()" class="flex-2 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl text-xs font-black shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 transition cursor-pointer">
                <lucide-icon [img]="Share2" class="w-4 h-4"></lucide-icon>
                <span>تأكيد ونشر اللعبة الآن 🚀</span>
              </button>
            </div>
          </div>
        </div>
      }

    </div>
  `
})
export class AiGameBuilderComponent implements OnInit {
  sanitizer = inject(DomSanitizer);
  toast = inject(ToastService);
  keyManager = inject(AiKeyManagerService);
  moduleStorage = inject(CustomModuleStorageService);
  router = inject(Router);
  route = inject(ActivatedRoute);
  arcadeService = inject(ArcadeService);
  arcadeCloud = inject(ArcadeCloudService);
  arcadeBridge = inject(SuperArcadeBridgeService);

  private readonly STORAGE_KEY = 'si_neuro_custom_games_v1';

  promptText = '';
  isGenerating = signal<boolean>(false);
  isGeneratingAsset = signal<boolean>(false);
  generatedHtml = signal<string>('');
  savedGames = signal<SavedGameItem[]>([]);
  activeGameId = signal<string | null>(null);
  activeWorkspaceTab = signal<'physics' | 'assets' | 'factory'>('physics');
  showCodeViewer = signal<boolean>(false);
  viewportMode = signal<'desktop' | 'tablet' | 'mobile'>('desktop');

  showPublishModal = signal<boolean>(false);
  publishData = {
    title: '',
    description: '',
    category: 'general',
    genre: 'Arcade AI'
  };

  physicsConfig = {
    speed: 1.0,
    lives: 3,
    heroSprite: '',
    audioUrl: ''
  };

  debugOverlay = signal<boolean>(false);
  showAssetGeneratorModal = signal<boolean>(false);
  selectedEngine = signal<'web' | 'godot'>('web');
  sidebarService = inject(SidebarService);

  // Icons
  Gamepad2 = Gamepad2;
  Sparkles = Sparkles;
  Cpu = Cpu;
  Key = Key;
  RefreshCw = RefreshCw;
  CheckCircle2 = CheckCircle2;
  Code = Code;
  Copy = Copy;
  Download = Download;
  Maximize2 = Maximize2;
  RotateCcw = RotateCcw;
  Share2 = Share2;
  Wrench = Wrench;
  ArrowRight = ArrowRight;
  Trophy = Trophy;
  Plus = Plus;
  Trash2 = Trash2;
  History = History;
  ChevronLeft = ChevronLeft;
  ChevronRight = ChevronRight;
  Monitor = Monitor;
  Tablet = Tablet;
  Smartphone = Smartphone;
  Sliders = Sliders;
  Activity = Activity;
  Eye = Eye;
  ShieldCheck = ShieldCheck;
  Crosshair = Crosshair;
  Pin = Pin;
  PinOff = PinOff;

  gameTemplates = [
    { title: '🎮 طيران السفن النيونية (Neon Asteroids)', genre: 'Arcade Action', desc: 'لعبة طيران بسفينة فضائية وتفادِي العقبات مع 3 أنماط لعب (محلي - P2P - أونلاين).', prompt: 'اصنع لعبة طيران فضائية تفاعلية 2D بـ Canvas باسم (Neon Asteroids). اشترط تطبيق معايير الألعاب: أنماط اللعب الثلاثة في بداية اللعبة (محلياً، غرفة خاصة P2P، لعب أونلاين Pro)، عزل تام لشاشات البداية واللعب 60fps وGame Over، والتحكم بالأسهم/اللمس.' },
    { title: '⚽ كرة قدم الطاولة التكتيكية (Table Soccer)', genre: 'Sports Multiplayer', desc: 'لعبة كرة قدم طاولة تفاعلية ثنائية اللاعبين (Player 1: WASD, Player 2: الأسهم) بـ Canvas مع حساب الأهداف والوقت وشاشات فصل واضحة.', prompt: 'اصنع لعبة كرة قدم طاولة تفاعلية ثنائية اللاعبين (Player 1: WASD, Player 2: الأسهم) بـ Canvas مع حساب الأهداف والوقت وشاشات فصل واضحة.' },
    { title: '🧠 ألغاز الذاكرة والأشكال (Memory Cards)', genre: 'Puzzle & Mind', desc: 'مطابقة البطاقات المقلوبة وتقييم السرعة والذاكرة.', prompt: 'اصنع لعبة ألغاز مطابقة كروت الذاكرة التفاعلية مع بطاقات أنيقة، عداد محاولات ومؤقت زمن وشاشة نصر مبهجة.' }
  ];

  gameShortcuts = [
    { label: '🎮 إضافة تحكم اللمس للهواتف', prompt: 'أضف أزرار تحكم افتراضية على الشاشة (D-Pad & Buttons) تناسب شاشات الجوال.' },
    { label: '🏆 لوحة نتائج ونقاط أعلى (High Score)', prompt: 'أضف نظام حساب نقاط متقدم مع حفظ أعلى نتيجة مسجلة.' },
    { label: '⚡ زيادة السرعة والفيزياء', prompt: 'قم بزيادة سرعة الحركة والفيزياء والتحدي بنسبة 30%.' },
    { label: '🔊 إضافة أصوات ومؤثرات حركية', prompt: 'أضف تأثيرات صوتية محاكاة عند الإطلاق، الفوز، وتدفق الألوان.' }
  ];

  safeIframeUrl = computed(() => {
    let rawHtml = this.generatedHtml();
    if (!rawHtml) return '';
    
    rawHtml = rawHtml.replace(/^```html\s*/gi, '').replace(/```\s*$/gi, '').trim();
    
    let debugScript = '';
    if (this.debugOverlay()) {
      debugScript = `
      <div id="debug-fps-hud" style="position:fixed;top:8px;left:8px;z-index:99999;background:rgba(2,6,23,0.9);border:1px solid #f43f5e;color:#f43f5e;font-family:monospace;font-size:11px;padding:6px 10px;border-radius:8px;pointer-events:none;box-shadow:0 10px 25px rgba(0,0,0,0.5);">
        <div>🎮 Engine Debugger Active</div>
        <div>FPS: <span id="debug-fps-val" style="color:#10b981;font-weight:bold;">60</span></div>
        <div>Hitboxes: <span style="color:#3b82f6;">Active Bounds</span></div>
      </div>
      <script>
        (function(){
          let times = []; let fps = 60;
          function refreshFPS() {
            const now = performance.now();
            while (times.length > 0 && times[0] <= now - 1000) { times.shift(); }
            times.push(now);
            fps = times.length;
            const el = document.getElementById('debug-fps-val');
            if (el) el.innerText = fps;
            requestAnimationFrame(refreshFPS);
          }
          requestAnimationFrame(refreshFPS);
        })();
      </script>`;
    }

    const bridgeScript = this.arcadeBridge.generateBridgeScript({
      gameId: this.activeGameId() || 'preview_game',
      gameTitle: this.activeGame()?.title || 'Preview Game',
      mode: 'local',
      isProUser: true
    });

    const headAssets = `<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;800;900&display=swap" rel="stylesheet"><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">${bridgeScript}<style>body{margin:0;padding:1rem;background-color:#020617;color:white;font-family:'Cairo',system-ui,sans-serif;}</style>`;

    let fullPage = '';
    if (rawHtml.toLowerCase().includes('<html') || rawHtml.toLowerCase().includes('<!doctype')) {
      if (rawHtml.includes('<head>')) {
        fullPage = rawHtml.replace('<head>', `<head>${headAssets}`);
      } else {
        fullPage = headAssets + rawHtml;
      }
      if (debugScript) {
        fullPage += debugScript;
      }
    } else {
      fullPage = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  ${headAssets}
</head>
<body class="bg-slate-950 text-white p-4">
  ${rawHtml}
  ${debugScript}
</body>
</html>`;
    }

    return this.sanitizer.bypassSecurityTrustResourceUrl('data:text/html;charset=utf-8,' + encodeURIComponent(fullPage));
  });

  activeGame = computed(() => {
    const id = this.activeGameId();
    if (!id) return null;
    return this.savedGames().find(g => g.id === id) || null;
  });

  ngOnInit() {
    this.loadSavedGames();
    this.route.queryParamMap.subscribe((params: ParamMap) => {
      const editId = params.get('gameId') || params.get('edit');
      if (editId) {
        this.arcadeService.getGameById(editId).subscribe((game: ArcadeGame | undefined) => {
          if (game) {
            const storedCode = localStorage.getItem(`arcade_custom_code_${game.id}`);
            if (storedCode) {
              this.generatedHtml.set(storedCode);
              this.promptText = `تعديل وتطوير لعبة (${game.title})`;
              this.toast.show(`تم تحميل اللعبة (${game.title}) للتعديل والتطوير ✏️`, 'info');
            }
          }
        });
      }
    });
  }

  openPublishModal() {
    const activeG = this.activeGame();
    if (activeG) {
      this.publishData.title = activeG.title.replace('🎮 ', '');
    } else {
      this.publishData.title = this.promptText.trim().substring(0, 30) || 'لعبة جديدة';
    }
    this.publishData.description = this.promptText.trim() || 'لعبة Arcade تفاعلية تم إنشاؤها عبر الذكاء الاصطناعي.';
    this.showPublishModal.set(true);
  }

  async confirmPublishGame() {
    if (!this.publishData.title.trim()) {
      this.toast.show('يرجى كتابة عنوان للعبة أولاً.', 'warning');
      return;
    }

    const code = this.generatedHtml();
    if (!code) {
      this.toast.show('لا يوجد كود لعبة ينشر بعد!', 'warning');
      return;
    }

    await this.arcadeCloud.publishGameToCloud({
      title: this.publishData.title,
      description: this.publishData.description,
      category: this.publishData.category,
      genre: this.publishData.genre,
      htmlContent: code
    });

    this.arcadeService.publishGame({
      title: this.publishData.title,
      description: this.publishData.description,
      category: this.publishData.category,
      genre: this.publishData.genre,
      htmlContent: code
    });

    this.showPublishModal.set(false);
    this.toast.show('🚀 تم نشر اللعبة بنجاح في السحابة ومعرض ألعاب Super Arcade!', 'success');
    
    setTimeout(() => {
      this.router.navigate(['/arcade']);
    }, 1000);
  }

  loadSavedGames() {
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(this.STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          this.savedGames.set(parsed);
          if (parsed.length > 0) {
            this.selectGame(parsed[0]);
          }
        }
      } catch (e) {}
    }
  }

  saveGamesToStorage(games: SavedGameItem[]) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(games));
    }
    this.savedGames.set(games);
  }

  createNewGame() {
    this.activeGameId.set(null);
    this.promptText = '';
    this.generatedHtml.set('');
    this.toast.show('تم فتح مشروع لعبة جديد 🎮', 'info');
  }

  selectGame(game: SavedGameItem) {
    this.activeGameId.set(game.id);
    const ver = game.versions[game.activeVersionIndex] || game.versions[game.versions.length - 1];
    if (ver) {
      this.promptText = ver.prompt;
      this.generatedHtml.set(ver.htmlContent);
    }
  }

  goToPreviousVersion() {
    const game = this.activeGame();
    if (!game || game.activeVersionIndex <= 0) return;
    this.updateActiveVersionIndex(game.activeVersionIndex - 1);
  }

  goToNextVersion() {
    const game = this.activeGame();
    if (!game || game.activeVersionIndex >= game.versions.length - 1) return;
    this.updateActiveVersionIndex(game.activeVersionIndex + 1);
  }

  private updateActiveVersionIndex(idx: number) {
    const game = this.activeGame();
    if (!game) return;

    const list = [...this.savedGames()];
    const gIdx = list.findIndex(g => g.id === game.id);
    if (gIdx === -1) return;

    list[gIdx].activeVersionIndex = idx;
    const ver = list[gIdx].versions[idx];
    this.promptText = ver.prompt;
    this.generatedHtml.set(ver.htmlContent);
    this.saveGamesToStorage(list);
    this.toast.show(`تم الانتقال لنسخة اللعبة رقم ${idx + 1}`, 'info');
  }

  async deleteCurrentVersion() {
    const game = this.activeGame();
    if (!game || game.versions.length <= 1) {
      this.toast.show('لا يمكن حذف النسخة الوحيدة. يمكنك حذف اللعبة بالكامل.', 'warning');
      return;
    }

    const list = [...this.savedGames()];
    const gIdx = list.findIndex(g => g.id === game.id);
    if (gIdx === -1) return;

    list[gIdx].versions.splice(list[gIdx].activeVersionIndex, 1);
    if (list[gIdx].activeVersionIndex >= list[gIdx].versions.length) {
      list[gIdx].activeVersionIndex = list[gIdx].versions.length - 1;
    }

    const activeVer = list[gIdx].versions[list[gIdx].activeVersionIndex];
    this.promptText = activeVer.prompt;
    this.generatedHtml.set(activeVer.htmlContent);

    this.saveGamesToStorage(list);
    this.toast.show('تم حذف نسخة اللعبة 🗑️', 'info');
  }

  async deleteEntireGame(id: string) {
    const confirmed = await this.toast.confirm('هل أنت متأكد من حذف هذه اللعبة بكافة إصداراتها؟');
    if (!confirmed) return;

    const updated = this.savedGames().filter(g => g.id !== id);
    this.saveGamesToStorage(updated);
    if (this.activeGameId() === id) {
      this.createNewGame();
    }
    this.toast.show('تم حذف اللعبة بالكامل 🗑️', 'info');
  }

  async generateAsset(type: string) {
    const apiKey = localStorage.getItem('Si-Neuro-chat-apiKey') || '';
    if (!apiKey) {
      this.toast.show('⚠️ يرجى إدخال مفتاح Gemini API أولاً!', 'warning');
      return;
    }

    this.isGeneratingAsset.set(true);
    this.toast.show(`🔍 يتم الآن توليد أصل جديد من نوع: ${type} بواسطة Imagen...`, 'info');
    
    const assetPrompts: Record<string, string> = {
        'Sprite': 'Professional 2D game sprite, top-down view, centered, transparent background, clean edges, pixel art style, high contrast.',
        'Background': 'High-quality 2D game background, sci-fi theme, detailed, suitable for arcade games, 16:9 aspect ratio.'
    };
    
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                instances: [{ prompt: assetPrompts[type] }],
                parameters: { sampleCount: 1 }
            })
        });

        if (!res.ok) throw new Error('API Error');

        const data = await res.json();
        const imageUrl = data.predictions[0].bytesBase64Encoded; 
        // ملاحظة: قد تحتاج لتحويل الـ base64 إلى رابط فعلي أو استخدامه مباشرة
        const finalUrl = `data:image/png;base64,${imageUrl}`;

        if(type === 'Sprite') {
            this.physicsConfig.heroSprite = finalUrl;
        }
        
        this.updateGameAssetsPrompt();
        this.toast.show(`✅ تم توليد ${type} بنجاح!`, 'success');

    } catch (e) {
        this.toast.show(`❌ فشل توليد الأصول. تأكد من صلاحيات API Key الخاص بك.`, 'error');
    } finally {
        this.isGeneratingAsset.set(false);
    }
  }

  updateGameAssetsPrompt() {
    const assetPrompt = `\n[تحديث الفيزيائيات والأصول: السرعة = ${this.physicsConfig.speed}x, الأرواح = ${this.physicsConfig.lives}${this.physicsConfig.heroSprite ? `, صورة البطل = ${this.physicsConfig.heroSprite}` : ''}${this.physicsConfig.audioUrl ? `, الصوت = ${this.physicsConfig.audioUrl}` : ''}]`;
    this.promptText += assetPrompt;
    this.toast.show('⚙️ تم تطبيق إعدادات الفيزياء والأصول على طلب اللعبة!', 'info');
  }

  applyTemplate(prompt: string) {
    this.promptText = prompt;
    this.toast.show('📋 تم اختيار قالب اللعبة، اضغط على توليد لبنائها فوراً!', 'info');
  }

  setEngine(engine: 'web' | 'godot') {
    this.selectedEngine.set(engine);
    if (engine === 'godot') {
      this.router.navigate(['/arcade/godot-builder']);
    }
  }

  applyShortcut(shortcutPrompt: string) {
    this.promptText = shortcutPrompt;
    this.generateGame();
  }

  async generateGame() {
    const prompt = this.promptText.trim();
    if (!prompt) return;

    const apiKey = localStorage.getItem('Si-Neuro-chat-apiKey') || '';
    if (!apiKey) {
      this.toast.show('⚠️ يرجى إدخال مفتاح Gemini API أولاً في لوحة الإعدادات أو صانع الموديولات.', 'warning');
      return;
    }

    this.isGenerating.set(true);

    try {
      const currentCode = this.generatedHtml();
      const activeGameObj = this.activeGame();

      let systemPrompt = '';
      if (activeGameObj && currentCode) {
        systemPrompt = `You are a World-Class Web Game Developer Agent specializing in Incremental HTML5/Canvas Game Refactoring.
EXISTING GAME HTML/JS CODE:
\`\`\`html
${currentCode}
\`\`\`

USER MODIFICATION REQUEST: "${prompt}".

CRITICAL REFACTORING DIRECTIVES (STRICT PRESERVATION):
1. PRESERVE EXISTING GAMEPLAY & ARCHITECTURE: Do NOT rewrite a completely different game! Keep all core canvas logic, assets, and mechanics intact while applying ONLY the requested modification/feature.
2. STANDARDIZED GAME MODES (PRESERVE UI):
   - Local Play (اللعب محلياً)
   - Private Room (إنشاء غرفة P2P)
   - Online Matchmaking (لعب أونلاين Pro)
3. SCREEN STATE ISOLATION: Maintain isolated Start Screen, Game Screen 60fps Canvas loop, and Game Over Screen.
4. OUTPUT FORMAT: Return ONLY the updated executable self-contained HTML/JS. No explanations or markdown blocks.`;
      } else {
        systemPrompt = `You are a World-Class Web Game Developer Agent specializing in 2D/3D HTML5 Canvas Arcade Games.
User Game Prompt: "${prompt}".

MANDATORY ARCHITECTURE & POLICY REQUIREMENTS (STRICT COMPLIANCE):
1. STANDARDIZED GAME MODES (CLEAR UI IN START SCREEN):
   - Local Play (اللعب محلياً): Shared screen multiplayer or single player 60fps canvas loop.
   - Private Room (إنشاء غرفة P2P): Peer-to-Peer friendly match UI container.
   - Online Matchmaking (لعب أونلاين Pro): Premium Pro locked prompt button.
2. SCREEN STATE ISOLATION:
   - Absolute isolation between Start Screen (شاشة البداية), Canvas Game Screen, and Game Over Screen (شاشة النهاية).
3. EXECUTABLE JAVASCRIPT & AUDIO:
   - Clean JS inside <script> tags with requestAnimationFrame 60fps game loop.
4. OUTPUT FORMAT: Return ONLY executable self-contained HTML/JS. No markdown explanation.`;
      }

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }]
        })
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data = await res.json();
      let htmlOutput = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      htmlOutput = htmlOutput.replace(/^```html\s*/gi, '').replace(/^```\s*/gi, '').replace(/```\s*$/gi, '').trim();

      this.generatedHtml.set(htmlOutput);
      this.appendNewGameVersion(prompt, htmlOutput);
      this.toast.show(activeGameObj ? '⚡ تم تعديل وتطوير كود اللعبة التراكمي بنجاح!' : '🎮 تم توليد وتشييد اللعبة بنجاح!', 'success');
    } catch (e: any) {
      console.error('Game builder generation error:', e);
      this.toast.show('تعذر التعديل على اللعبة، يرجى التأكد من مفتاح API.', 'error');
    } finally {
      this.isGenerating.set(false);
    }
  }

  appendNewGameVersion(prompt: string, html: string) {
    const title = prompt.trim().substring(0, 30) || 'لعبة Arcade مخصصة';
    const currentId = this.activeGameId();
    const list = [...this.savedGames()];

    const newVer: GameVersion = {
      versionId: 'ver_' + Math.random().toString(36).substr(2, 9),
      prompt: prompt,
      htmlContent: html,
      createdAt: Date.now()
    };

    if (currentId) {
      const idx = list.findIndex(g => g.id === currentId);
      if (idx !== -1) {
        list[idx].versions.push(newVer);
        list[idx].activeVersionIndex = list[idx].versions.length - 1;
        list[idx].updatedAt = Date.now();
        list[idx].title = title;
      }
    } else {
      const newGame: SavedGameItem = {
        id: 'game_' + Math.random().toString(36).substr(2, 9),
        title: title,
        versions: [newVer],
        activeVersionIndex: 0,
        updatedAt: Date.now()
      };
      list.push(newGame);
      this.activeGameId.set(newGame.id);
    }

    this.saveGamesToStorage(list);
  }

  reloadIframe() {
    const cur = this.generatedHtml();
    this.generatedHtml.set('');
    setTimeout(() => this.generatedHtml.set(cur), 50);
  }

  openFullScreen() {
    const code = this.generatedHtml();
    if (!code) return;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(code);
      win.document.close();
    }
  }

  downloadHtml() {
    const code = this.generatedHtml();
    if (!code) return;
    const blob = new Blob([code], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Arcade_Game_${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  copyCode() {
    const code = this.generatedHtml();
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      this.toast.show('📋 تم نسخ كود اللعبة الحركي بنجاح!', 'success');
    });
  }
}
