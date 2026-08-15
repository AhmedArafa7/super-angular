import { Component, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragEnd, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { LucideAngularModule } from 'lucide-angular';
import { SidebarService, SidebarPosition } from '../../../core/sidebar.service';
import { ALL_NAV_ITEMS, NavItem, getVisibleNavItems } from '../../../core/nav-items';
import { FirebaseService } from '../../../core/services/firebase.service';
import { CustomModuleStorageService } from '../../../features/ai-module-builder/custom-module-viewer.component';
import { SidebarItemComponent } from '../sidebar-item/sidebar-item.component';
import { CustomizationDialogComponent } from '../customization-dialog/customization-dialog.component';

@Component({
  selector: 'app-floating-orb',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    FormsModule, 
    DragDropModule, 
    LucideAngularModule,
    SidebarItemComponent,
    CustomizationDialogComponent
  ],
  template: `
    <!-- ═══════════════════════════════════════════════════════════════ -->
    <!-- 1. COLLAPSED FLOATING ORB (When user minimizes the panel)       -->
    <!-- ═══════════════════════════════════════════════════════════════ -->
    @if (!sidebar.isFloatingExpanded()) {
      <div cdkDrag
           cdkDragBoundary="body"
           [cdkDragFreeDragPosition]="sidebar.floatingPos()"
           (cdkDragEnded)="onDragEnded($event)"
           class="fixed z-[100] group flex items-center justify-center cursor-move select-none animate-in zoom-in-90 duration-300">
        
        <!-- Glowing Pulse Effect Behind Orb -->
        <div class="absolute inset-0 rounded-full bg-indigo-500/30 blur-md animate-pulse"></div>

        <!-- Main Orb Button -->
        <button (click)="sidebar.setFloatingExpanded(true)"
                class="relative w-14 h-14 rounded-full bg-gradient-to-tr from-slate-900 via-indigo-950 to-indigo-900 border-2 border-indigo-500/50 shadow-[0_0_25px_rgba(99,102,241,0.6)] flex items-center justify-center text-white hover:scale-110 hover:border-indigo-400 active:scale-95 transition-all duration-300 cursor-pointer"
                title="فتح لوحة التحكم العائمة (Si-Neuro OMNI-CONTROL)">
          <lucide-icon name="zap" class="w-6 h-6 text-indigo-400 group-hover:text-amber-300 group-hover:rotate-12 transition-all duration-300"></lucide-icon>
          
          <!-- Mini Floating Indicator Ring -->
          <span class="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-3.5 w-3.5 bg-indigo-500 border-2 border-[#0B0F19]"></span>
          </span>
        </button>

        <!-- Quick Action Tooltip / Restore on Hover -->
        <div class="absolute -bottom-9 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap bg-slate-950/95 text-slate-300 text-[10px] px-3 py-1.5 rounded-xl border border-white/10 shadow-2xl font-bold" dir="rtl">
          انقر للفتح أو اسحب لتغيير الموضع ⚡
        </div>
      </div>
    }

    <!-- ═══════════════════════════════════════════════════════════════ -->
    <!-- 2. EXPANDED OMNI-CONTROL FLOATING SIDEBAR PANEL                 -->
    <!-- ═══════════════════════════════════════════════════════════════ -->
    @if (sidebar.isFloatingExpanded()) {
      <div cdkDrag
           cdkDragBoundary="body"
           [cdkDragFreeDragPosition]="sidebar.floatingPos()"
           (cdkDragEnded)="onDragEnded($event)"
           class="fixed z-[100] select-none flex flex-col bg-[#0B0F19]/95 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] rounded-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 transition-[width,height] duration-200 ease-out"
           [style.width.px]="sidebar.isFloatingIconsOnly() ? 72 : sidebar.floatingWidth()"
           [style.maxHeight.px]="sidebar.floatingHeight()"
           dir="rtl">

        <!-- ──────────────── Header & Drag Handle ──────────────── -->
        <div cdkDragHandle
             class="px-3 py-2.5 bg-white/[0.04] border-b border-white/10 flex items-center justify-between cursor-move group/header shrink-0">
          
          @if (!sidebar.isFloatingIconsOnly()) {
            <div class="flex items-center gap-2 min-w-0">
              <div class="w-7 h-7 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-black text-xs shrink-0">
                SN
              </div>
              <div class="flex flex-col truncate">
                <span class="text-xs font-black tracking-wider text-white uppercase truncate">Si-Neuro OMNI</span>
                <span class="text-[8px] font-bold text-indigo-400 tracking-widest uppercase">Central Floating Hub</span>
              </div>
            </div>
          } @else {
            <div class="w-full flex justify-center py-0.5">
              <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-black text-xs cursor-move" title="اسحب لتحريك القائمة">
                SN
              </div>
            </div>
          }

          <!-- Header Controls & Toggles -->
          @if (!sidebar.isFloatingIconsOnly()) {
            <div class="flex items-center gap-1 shrink-0">
              
              <!-- Mode Toggle Pill: Full vs Icons Only -->
              <div class="bg-black/40 border border-white/10 p-0.5 rounded-xl flex items-center gap-0.5">
                <button (click)="sidebar.setFloatingIconsOnly(false)"
                        [ngClass]="!sidebar.isFloatingIconsOnly() ? 'bg-indigo-600 text-white shadow-sm font-bold' : 'text-slate-400 hover:text-white'"
                        class="px-1.5 py-0.5 rounded-lg text-[9px] transition-all cursor-pointer"
                        title="العرض الكامل">
                  قائمة
                </button>
                <button (click)="sidebar.setFloatingIconsOnly(true)"
                        [ngClass]="sidebar.isFloatingIconsOnly() ? 'bg-indigo-600 text-white shadow-sm font-bold' : 'text-slate-400 hover:text-white'"
                        class="px-1.5 py-0.5 rounded-lg text-[9px] transition-all cursor-pointer"
                        title="عرض الأيقونات فقط">
                  أيقونات
                </button>
              </div>

              <!-- Quick Search Filter Toggle -->
              <button (click)="toggleSearch()"
                      [ngClass]="showSearch() ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/40' : 'text-slate-400 hover:text-white hover:bg-white/10 border-transparent'"
                      class="p-1.5 rounded-lg border transition-all cursor-pointer"
                      title="بحث سريع (Ctrl + K)">
                <lucide-icon name="search" class="w-3.5 h-3.5"></lucide-icon>
              </button>

              <!-- Customization Dialog Trigger -->
              <button (click)="showCustomizationDialog = true"
                      class="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title="تخصيص وترتيب الأقسام">
                <lucide-icon name="sliders-horizontal" class="w-3.5 h-3.5"></lucide-icon>
              </button>

              <!-- Switch Layout Dropdown Trigger (Left, Right, Top, Bottom, Floating) -->
              <div class="relative">
                <button (click)="toggleLayoutMenu($event)"
                        class="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                        title="تغيير تخطيط وموضع الشريط">
                  <lucide-icon name="layout-dashboard" class="w-3.5 h-3.5"></lucide-icon>
                </button>

                @if (showLayoutMenu()) {
                  <div class="absolute left-0 top-full mt-1.5 w-44 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                       (click)="$event.stopPropagation()">
                    
                    <div class="px-2 py-1 text-[10px] font-bold text-slate-400">تغيير تخطيط الواجهة:</div>
                    
                    <button (click)="changePosition('left')" class="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded-xl text-right transition-colors">
                      <lucide-icon name="panel-left" class="w-3.5 h-3.5 text-indigo-400"></lucide-icon>
                      <span>الشريط الأيسر</span>
                    </button>
                    
                    <button (click)="changePosition('right')" class="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded-xl text-right transition-colors">
                      <lucide-icon name="panel-right" class="w-3.5 h-3.5 text-indigo-400"></lucide-icon>
                      <span>الشريط الأيمن</span>
                    </button>

                    <button (click)="changePosition('top')" class="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded-xl text-right transition-colors">
                      <lucide-icon name="panel-top" class="w-3.5 h-3.5 text-indigo-400"></lucide-icon>
                      <span class="font-bold text-amber-300">الشريط العلوي (جديد)</span>
                    </button>

                    <button (click)="changePosition('bottom')" class="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded-xl text-right transition-colors">
                      <lucide-icon name="panel-bottom" class="w-3.5 h-3.5 text-indigo-400"></lucide-icon>
                      <span>الشريط السفلي</span>
                    </button>

                    <div class="h-px bg-white/10 my-1"></div>

                    <button (click)="changePosition('floating')" class="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 rounded-xl text-right font-bold transition-colors">
                      <lucide-icon name="orbit" class="w-3.5 h-3.5 text-amber-400"></lucide-icon>
                      <span>الوضع العائم (الحالي)</span>
                    </button>
                  </div>
                }
              </div>

              <!-- Minimize to Floating Orb -->
              <button (click)="sidebar.setFloatingExpanded(false)"
                      class="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title="تصغير إلى الدائرة العائمة">
                <lucide-icon name="minimize-2" class="w-3.5 h-3.5"></lucide-icon>
              </button>
            </div>
          } @else {
            <!-- In Icons-Only Mode: Quick Expand Icon -->
            <button (click)="sidebar.setFloatingIconsOnly(false)"
                    class="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer mt-1"
                    title="التبديل إلى العرض الكامل">
              <lucide-icon name="maximize-2" class="w-3.5 h-3.5 text-indigo-400"></lucide-icon>
            </button>
          }
        </div>

        <!-- ──────────────── Quick Search Filter Input ──────────────── -->
        @if (showSearch() && !sidebar.isFloatingIconsOnly()) {
          <div class="p-2 border-b border-white/10 bg-black/30 shrink-0 animate-in fade-in slide-in-from-top-2">
            <div class="relative flex items-center bg-white/5 border border-white/10 rounded-xl px-2.5 py-1 focus-within:border-indigo-500/60">
              <lucide-icon name="search" class="w-3.5 h-3.5 text-slate-400 shrink-0 ml-2"></lucide-icon>
              <input #searchInput
                     type="text" 
                     [ngModel]="searchQuery()" 
                     (ngModelChange)="searchQuery.set($event)"
                     placeholder="بحث في الأقسام..." 
                     class="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none text-right font-medium">
              @if (searchQuery()) {
                <button (click)="searchQuery.set('')" class="text-slate-400 hover:text-white text-xs px-1">✕</button>
              }
            </div>
          </div>
        }

        <!-- ──────────────── Recent Visited Pages ──────────────── -->
        @if (!sidebar.isFloatingIconsOnly() && !searchQuery().trim() && recentItems.length > 0) {
          <div class="px-3 pt-2 pb-1 shrink-0 border-b border-white/5 bg-white/[0.01]">
            <div class="text-[9px] font-bold text-indigo-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <lucide-icon name="history" class="w-3 h-3"></lucide-icon>
              <span>الأقسام الأخيرة</span>
            </div>
            <div class="grid grid-cols-2 gap-1 pb-1">
              @for (item of recentItems.slice(0, 4); track item.id) {
                <a [routerLink]="['/' + (item.route || item.id)]"
                   (click)="onItemClick(item)"
                   class="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 hover:bg-indigo-600/20 border border-white/5 hover:border-indigo-500/30 text-[10px] text-slate-300 hover:text-white truncate transition-all">
                  <lucide-icon [name]="item.icon" class="w-3 h-3 text-indigo-400 shrink-0"></lucide-icon>
                  <span class="truncate">{{ item.label }}</span>
                </a>
              }
            </div>
          </div>
        }

        <!-- ──────────────── Navigation Items List (Drag & Drop Reorderable) ──────────────── -->
        <div #itemsContainer
             cdkDropList
             (cdkDropListDropped)="onDropItem($event)"
             class="flex-1 overflow-y-auto scrollbar-hide p-2 space-y-1">
          
          <!-- Filtered or Pinned Items List -->
          @for (item of pinnedItems; track item.id) {
            
            <!-- Standard Full Item Row with Drag & Drop AND 3-Dots Context Menu -->
            @if (!sidebar.isFloatingIconsOnly()) {
              <div cdkDrag
                   class="w-full relative group flex items-center rounded-xl transition-all">
                
                <!-- Complete Rich Sidebar Item (Supports Active Route, Badges, 3-Dots Context Menu) -->
                <div class="flex-1">
                  <app-sidebar-item [item]="item" (click)="onItemClick(item)"></app-sidebar-item>
                </div>
              </div>
            } 
            <!-- Compact Icons-Only Dock Mode -->
            @else {
              <a [routerLink]="['/' + (item.route || item.id)]"
                 (click)="onItemClick(item)"
                 routerLinkActive="bg-indigo-600 text-white shadow-lg shadow-indigo-600/40"
                 [routerLinkActiveOptions]="{ exact: !item.route && item.id === '' }"
                 class="w-full h-11 flex items-center justify-center rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all relative group cursor-pointer"
                 [title]="item.label">
                
                <lucide-icon [name]="item.icon" 
                            class="w-5 h-5 shrink-0 transition-transform group-hover:scale-110"
                            [ngClass]="getIconColor(item.id)"></lucide-icon>

                <!-- Floating Hover Tooltip -->
                <div class="absolute right-full mr-2.5 px-2.5 py-1 bg-slate-900/95 backdrop-blur-xl border border-white/10 text-white text-[11px] font-bold rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 z-50 whitespace-nowrap">
                  {{ item.label }}
                </div>
              </a>
            }
          } @empty {
            <div class="text-xs text-slate-500 text-center py-6">لا توجد أقسام تطابق البحث</div>
          }

          <!-- Unpinned Items at bottom if enabled -->
          @if (sidebar.showAllUnpinnedAtBottom() && !sidebar.isFloatingIconsOnly() && unpinnedItems.length > 0) {
            <div class="pt-2 border-t border-white/5 space-y-1">
              <div class="text-[9px] font-bold text-slate-500 uppercase tracking-wider px-2">أقسام إضافية غير مثبتة</div>
              @for (item of unpinnedItems; track item.id) {
                <app-sidebar-item [item]="item" (click)="onItemClick(item)"></app-sidebar-item>
              }
            </div>
          }
        </div>

        <!-- ──────────────── Bottom Multi-Function Directional Controls ──────────────── -->
        <div class="border-t border-white/10 p-2.5 space-y-2 bg-black/40 shrink-0">
          
          @if (!sidebar.isFloatingIconsOnly()) {
            <!-- Arrow Function Mode Selector Tabs (User chooses favorite function) -->
            <div class="space-y-1.5">
              <div class="flex items-center justify-between text-[9px] font-bold text-slate-400 px-1">
                <span>وظيفة الأسهم:</span>
                <span class="text-indigo-400 font-mono font-bold">{{ getArrowModeTitle() }}</span>
              </div>

              <!-- Segmented Tabs for Arrow Modes -->
              <div class="grid grid-cols-4 gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/5">
                <button (click)="sidebar.setArrowControlMode('move')"
                        [ngClass]="sidebar.arrowControlMode() === 'move' ? 'bg-indigo-600 text-white font-bold shadow' : 'text-slate-400 hover:text-white'"
                        class="py-1 rounded-lg text-[9px] transition-all cursor-pointer text-center"
                        title="تحريك القائمة العائمة بكسل بكسل">
                  📍 تحريك
                </button>
                <button (click)="sidebar.setArrowControlMode('snap')"
                        [ngClass]="sidebar.arrowControlMode() === 'snap' ? 'bg-indigo-600 text-white font-bold shadow' : 'text-slate-400 hover:text-white'"
                        class="py-1 rounded-lg text-[9px] transition-all cursor-pointer text-center"
                        title="إرساء فوري لأطراف وزوايا الشاشة">
                  🧲 إرساء
                </button>
                <button (click)="sidebar.setArrowControlMode('resize')"
                        [ngClass]="sidebar.arrowControlMode() === 'resize' ? 'bg-indigo-600 text-white font-bold shadow' : 'text-slate-400 hover:text-white'"
                        class="py-1 rounded-lg text-[9px] transition-all cursor-pointer text-center"
                        title="تغيير أبعاد وعرض وارتفاع القائمة">
                  📐 أبعاد
                </button>
                <button (click)="sidebar.setArrowControlMode('scroll')"
                        [ngClass]="sidebar.arrowControlMode() === 'scroll' ? 'bg-indigo-600 text-white font-bold shadow' : 'text-slate-400 hover:text-white'"
                        class="py-1 rounded-lg text-[9px] transition-all cursor-pointer text-center"
                        title="تمرير القائمة للأعلى والأسفل">
                  📜 تمرير
                </button>
              </div>

              <!-- Dynamic 4-Directional Action Control Pad -->
              <div class="grid grid-cols-4 gap-1 pt-1">
                <!-- UP Action Button -->
                <button (click)="onArrowClick('up')"
                        class="flex flex-col items-center justify-center p-1.5 rounded-xl bg-white/5 hover:bg-indigo-600/30 border border-white/5 hover:border-indigo-500/40 text-slate-300 hover:text-white transition-all cursor-pointer group active:scale-95"
                        [title]="getArrowTooltip('up')">
                  <lucide-icon name="arrow-up" class="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform"></lucide-icon>
                  <span class="text-[8px] mt-0.5 font-bold">{{ getArrowLabel('up') }}</span>
                </button>

                <!-- DOWN Action Button -->
                <button (click)="onArrowClick('down')"
                        class="flex flex-col items-center justify-center p-1.5 rounded-xl bg-white/5 hover:bg-indigo-600/30 border border-white/5 hover:border-indigo-500/40 text-slate-300 hover:text-white transition-all cursor-pointer group active:scale-95"
                        [title]="getArrowTooltip('down')">
                  <lucide-icon name="arrow-down" class="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform"></lucide-icon>
                  <span class="text-[8px] mt-0.5 font-bold">{{ getArrowLabel('down') }}</span>
                </button>

                <!-- LEFT Action Button -->
                <button (click)="onArrowClick('left')"
                        class="flex flex-col items-center justify-center p-1.5 rounded-xl bg-white/5 hover:bg-indigo-600/30 border border-white/5 hover:border-indigo-500/40 text-slate-300 hover:text-white transition-all cursor-pointer group active:scale-95"
                        [title]="getArrowTooltip('left')">
                  <lucide-icon name="arrow-left" class="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform"></lucide-icon>
                  <span class="text-[8px] mt-0.5 font-bold">{{ getArrowLabel('left') }}</span>
                </button>

                <!-- RIGHT Action Button -->
                <button (click)="onArrowClick('right')"
                        class="flex flex-col items-center justify-center p-1.5 rounded-xl bg-white/5 hover:bg-indigo-600/30 border border-white/5 hover:border-indigo-500/40 text-slate-300 hover:text-white transition-all cursor-pointer group active:scale-95"
                        [title]="getArrowTooltip('right')">
                  <lucide-icon name="arrow-right" class="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform"></lucide-icon>
                  <span class="text-[8px] mt-0.5 font-bold">{{ getArrowLabel('right') }}</span>
                </button>
              </div>

              <!-- Quick Snap Center Button (When in Snap Mode) -->
              @if (sidebar.arrowControlMode() === 'snap') {
                <button (click)="sidebar.snapFloatingTo('center')"
                        class="w-full flex items-center justify-center gap-1.5 py-1 bg-white/5 hover:bg-indigo-600/20 border border-white/5 hover:border-indigo-500/30 rounded-xl text-[9px] text-slate-300 hover:text-white transition-all cursor-pointer">
                  <span>🎯</span>
                  <span>إرساء في منتصف الشاشة</span>
                </button>
              }
            </div>
          } @else {
            <!-- In Icons-Only Mode: Quick Compact Dock Controls -->
            <div class="flex flex-col gap-1 items-center">
              <button (click)="sidebar.snapFloatingTo('left')"
                      class="w-full flex items-center justify-center p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                      title="إرساء لليسار">
                <lucide-icon name="arrow-left" class="w-3.5 h-3.5"></lucide-icon>
              </button>
              <button (click)="sidebar.snapFloatingTo('right')"
                      class="w-full flex items-center justify-center p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                      title="إرساء لليمين">
                <lucide-icon name="arrow-right" class="w-3.5 h-3.5"></lucide-icon>
              </button>
            </div>
          }

        </div>

      </div>
    }

    <!-- ──────────────── Customization Dialog ──────────────── -->
    @if (showCustomizationDialog) {
      <app-sidebar-customization-dialog (onClose)="showCustomizationDialog = false"></app-sidebar-customization-dialog>
    }
  `
})
export class FloatingOrbComponent {
  sidebar = inject(SidebarService);
  firebase = inject(FirebaseService);
  moduleStorage = inject(CustomModuleStorageService);

  @ViewChild('itemsContainer') itemsContainerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('searchInput') searchInputRef!: ElementRef<HTMLInputElement>;

  showLayoutMenu = signal<boolean>(false);
  showSearch = signal<boolean>(false);
  searchQuery = signal<string>('');
  showCustomizationDialog: boolean = false;

  get userRole(): string | null {
    return (this.firebase.userData() as any)?.role || 'admin';
  }

  get visibleItems(): NavItem[] {
    const baseItems = getVisibleNavItems(this.userRole, ALL_NAV_ITEMS);
    
    // Dynamically append user-generated custom modules
    const customModules = this.moduleStorage.modules()
      .filter(mod => !mod.id.startsWith('game_') && !mod.id.startsWith('custom_game_') && !mod.title.includes('🎮'))
      .map(mod => ({
        id: `custom-${mod.id}`,
        label: mod.title,
        icon: 'sparkles',
        restricted: false,
        status: 'NEW' as const,
        category: 'ai' as const,
        route: `custom-module/${mod.id}`
      }));

    return [...baseItems, ...customModules];
  }

  get pinnedItems(): NavItem[] {
    const pinnedList = this.sidebar.pinnedItems();
    const visible = this.visibleItems;
    
    let items: NavItem[] = [];
    for (const id of pinnedList) {
      const found = visible.find(i => i.id === id);
      if (found && !items.some(i => i.id === found.id)) {
        items.push(found);
      }
    }

    const q = this.searchQuery().trim().toLowerCase();
    if (q) {
      items = items.filter(item => item.label.toLowerCase().includes(q));
    }
    return items;
  }

  get unpinnedItems(): NavItem[] {
    const pinnedList = this.sidebar.pinnedItems();
    const visible = this.visibleItems;
    let items = visible.filter(item => !pinnedList.includes(item.id));

    const q = this.searchQuery().trim().toLowerCase();
    if (q) {
      items = items.filter(item => item.label.toLowerCase().includes(q));
    }
    return items;
  }

  get recentItems(): NavItem[] {
    const ids = this.sidebar.recentItemIds();
    return ids.map(id => this.visibleItems.find(i => i.id === id)).filter(Boolean) as NavItem[];
  }

  getIconColor(id: string): string {
    switch(id) {
      case 'time': return 'text-indigo-400';
      case 'micro-ide': return 'text-emerald-400';
      case 'health': return 'text-red-400 font-bold';
      case 'vault': return 'text-amber-400';
      case 'downloads': return 'text-indigo-400';
      case 'arcade': return 'text-purple-400';
      case 'chat': return 'text-cyan-400';
      case 'deals': return 'text-emerald-400';
      default: return 'text-slate-400';
    }
  }

  toggleSearch() {
    this.showSearch.update(v => !v);
    if (this.showSearch()) {
      setTimeout(() => this.searchInputRef?.nativeElement?.focus(), 50);
    } else {
      this.searchQuery.set('');
    }
  }

  onItemClick(item: NavItem) {
    this.sidebar.addRecentItem(item.id);
  }

  onDragEnded(event: CdkDragEnd) {
    const transform = event.source.getFreeDragPosition();
    this.sidebar.setFloatingPos({ 
      x: Math.max(10, transform.x), 
      y: Math.max(10, transform.y) 
    });
  }

  onDropItem(event: CdkDragDrop<NavItem[]>) {
    const currentPinned = [...this.sidebar.pinnedItems()];
    moveItemInArray(currentPinned, event.previousIndex, event.currentIndex);
    this.sidebar.reorderPinnedItems(currentPinned);
  }

  toggleLayoutMenu(event: Event) {
    event.stopPropagation();
    this.showLayoutMenu.update(v => !v);
  }

  changePosition(pos: SidebarPosition) {
    this.showLayoutMenu.set(false);
    this.sidebar.setPosition(pos);
  }

  // --- Dynamic Multi-Mode Arrow Controls Helper Methods ---
  getArrowModeTitle(): string {
    switch(this.sidebar.arrowControlMode()) {
      case 'move': return 'تحريك بكسلي';
      case 'snap': return 'إرساء للأطراف';
      case 'resize': return 'تغيير الأبعاد';
      case 'scroll': return 'تمرير القائمة';
      default: return 'تحكم';
    }
  }

  getArrowLabel(dir: 'up' | 'down' | 'left' | 'right'): string {
    const mode = this.sidebar.arrowControlMode();
    if (mode === 'move') {
      return dir === 'up' ? 'أعلى' : dir === 'down' ? 'أسفل' : dir === 'left' ? 'يسار' : 'يمين';
    }
    if (mode === 'snap') {
      return dir === 'up' ? 'أعلى ⬆' : dir === 'down' ? 'أسفل ⬇' : dir === 'left' ? 'يسار ⬅' : 'يمين ➡';
    }
    if (mode === 'resize') {
      return dir === 'up' ? '+طول' : dir === 'down' ? '-طول' : dir === 'left' ? '+عرض' : '-عرض';
    }
    if (mode === 'scroll') {
      return dir === 'up' ? 'لأعلى' : dir === 'down' ? 'لأسفل' : dir === 'left' ? 'البداية' : 'النهاية';
    }
    return '';
  }

  getArrowTooltip(dir: 'up' | 'down' | 'left' | 'right'): string {
    const mode = this.sidebar.arrowControlMode();
    if (mode === 'move') {
      return `تحريك القائمة ${dir === 'up' ? 'لأعلى' : dir === 'down' ? 'لأسفل' : dir === 'left' ? 'لليسار' : 'لليمين'}`;
    }
    if (mode === 'snap') {
      return `إرساء القائمة في ${dir === 'up' ? 'أعلى الشاشة' : dir === 'down' ? 'أسفل الشاشة' : dir === 'left' ? 'أقصى اليسار' : 'أقصى اليمين'}`;
    }
    if (mode === 'resize') {
      return dir === 'up' ? 'زيادة طول القائمة' : dir === 'down' ? 'تقليل طول القائمة' : dir === 'left' ? 'زيادة عرض القائمة' : 'تقليل عرض القائمة';
    }
    if (mode === 'scroll') {
      return dir === 'up' ? 'تمرير للأعلى' : dir === 'down' ? 'تمرير للأسفل' : dir === 'left' ? 'القفز لبداية القائمة' : 'القفز لنهاية القائمة';
    }
    return '';
  }

  onArrowClick(dir: 'up' | 'down' | 'left' | 'right') {
    const mode = this.sidebar.arrowControlMode();
    
    // 1. Move Mode
    if (mode === 'move') {
      this.sidebar.moveFloating(dir, 40);
      return;
    }

    // 2. Snap Mode
    if (mode === 'snap') {
      const edge = dir === 'up' ? 'top' : dir === 'down' ? 'bottom' : dir;
      this.sidebar.snapFloatingTo(edge);
      return;
    }

    // 3. Resize Mode
    if (mode === 'resize') {
      if (dir === 'up') this.sidebar.resizeFloating(0, 50);
      if (dir === 'down') this.sidebar.resizeFloating(0, -50);
      if (dir === 'left') this.sidebar.resizeFloating(30, 0);
      if (dir === 'right') this.sidebar.resizeFloating(-30, 0);
      return;
    }

    // 4. Scroll Mode
    if (mode === 'scroll') {
      const el = this.itemsContainerRef?.nativeElement;
      if (!el) return;
      if (dir === 'up') el.scrollBy({ top: -120, behavior: 'smooth' });
      if (dir === 'down') el.scrollBy({ top: 120, behavior: 'smooth' });
      if (dir === 'left') el.scrollTo({ top: 0, behavior: 'smooth' });
      if (dir === 'right') el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      return;
    }
  }
}
