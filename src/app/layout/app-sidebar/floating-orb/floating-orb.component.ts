import { Component, inject, signal, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragEnd, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { LucideAngularModule } from 'lucide-angular';
import { SidebarService, SidebarPosition } from '../../../core/sidebar.service';
import { ALL_NAV_ITEMS, NavItem, getVisibleNavItems } from '../../../core/nav-items';
import { FirebaseService } from '../../../core/services/firebase.service';
import { CustomModuleStorageService } from '../../../features/ai-module-builder/custom-module-viewer.component';
import { SettingsService } from '../../../core/settings.service';
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
    <!-- 1. COLLAPSED FLOATING ORB (Minimode Floating Button)            -->
    <!-- ═══════════════════════════════════════════════════════════════ -->
    @if (!sidebar.isFloatingExpanded()) {
      <div cdkDrag
           [cdkDragConstrainPosition]="constrainPosition"
           [cdkDragFreeDragPosition]="sidebar.floatingPos()"
           (cdkDragEnded)="onDragEnded($event)"
           class="fixed top-0 left-0 z-[100] group flex items-center justify-center cursor-move select-none animate-in zoom-in-90 duration-300">
        
        <div class="absolute inset-0 rounded-full bg-indigo-500/30 blur-md animate-pulse"></div>

        <button (click)="sidebar.setFloatingExpanded(true)"
                class="relative w-14 h-14 rounded-full bg-gradient-to-tr from-slate-900 via-indigo-950 to-indigo-900 border-2 border-indigo-500/50 shadow-[0_0_25px_rgba(99,102,241,0.6)] flex items-center justify-center text-white hover:scale-110 hover:border-indigo-400 active:scale-95 transition-all duration-300 cursor-pointer"
                title="فتح لوحة التحكم العائمة (Si-Neuro OMNI-CONTROL)">
          <lucide-icon name="zap" class="w-6 h-6 text-indigo-400 group-hover:text-amber-300 group-hover:rotate-12 transition-all duration-300"></lucide-icon>
          
          <span class="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-3.5 w-3.5 bg-indigo-500 border-2 border-[#0B0F19]"></span>
          </span>
        </button>

        <div class="absolute -bottom-9 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap bg-slate-950/95 text-slate-300 text-[10px] px-3 py-1.5 rounded-xl border border-white/10 shadow-2xl font-bold" dir="rtl">
          انقر للفتح أو اسحب لتغيير الموضع ⚡
        </div>
      </div>
    }

    <!-- ═══════════════════════════════════════════════════════════════ -->
    <!-- 2. EXPANDED FLOATING SYSTEM                                     -->
    <!-- ═══════════════════════════════════════════════════════════════ -->
    @if (sidebar.isFloatingExpanded()) {

      <!-- ───────────────────────────────────────────────────────────── -->
      <!-- 2A. VERTICAL OMNI-CONTROL FLOATING PANEL                       -->
      <!-- ───────────────────────────────────────────────────────────── -->
      @if (sidebar.floatingOrientation() === 'vertical') {
        <div cdkDrag
             [cdkDragConstrainPosition]="constrainPosition"
             [cdkDragFreeDragPosition]="sidebar.floatingPos()"
             (cdkDragEnded)="onDragEnded($event)"
             class="fixed top-0 left-0 z-[100] select-none flex flex-col bg-[#0B0F19]/95 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] rounded-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 transition-[width,height] duration-200 ease-out"
             [style.width.px]="sidebar.isFloatingIconsOnly() ? 72 : sidebar.floatingWidth()"
             [style.maxHeight.px]="sidebar.floatingHeight()"
             dir="rtl">

          <!-- Header & Drag Handle -->
          <div cdkDragHandle
               class="px-3 py-2.5 bg-white/[0.04] border-b border-white/10 flex items-center justify-between cursor-move group/header shrink-0">
            
            @if (!sidebar.isFloatingIconsOnly()) {
              <div class="flex items-center gap-2 min-w-0">
                <div class="w-7 h-7 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-black text-xs shrink-0">
                  SN
                </div>
                <div class="flex flex-col truncate">
                  <span class="text-xs font-black tracking-wider text-white uppercase truncate">Si-Neuro OMNI</span>
                  <span class="text-[8px] font-bold text-indigo-400 tracking-widest uppercase">Floating Menu</span>
                </div>
              </div>
            } @else {
              <div class="w-full flex justify-center py-0.5">
                <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-black text-xs cursor-move" title="اسحب لتحريك القائمة">
                  SN
                </div>
              </div>
            }

            <!-- Header Controls -->
            @if (!sidebar.isFloatingIconsOnly()) {
              <div class="flex items-center gap-1 shrink-0">
                
                <!-- Switch to Horizontal Floating Dock -->
                <button (click)="sidebar.setFloatingOrientation('horizontal')"
                        class="px-2 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-[9px] font-bold text-indigo-300 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                        title="التحويل إلى الدوك الأفقي العائم">
                  <span>⏹️</span>
                  <span>أفقي</span>
                </button>

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

                <!-- Switch Layout Dropdown Trigger -->
                <div class="relative">
                  <button (click)="toggleLayoutMenu($event)"
                          class="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                          title="تغيير تخطيط وموضع الشريط">
                    <lucide-icon name="layout-dashboard" class="w-3.5 h-3.5"></lucide-icon>
                  </button>

                  @if (showLayoutMenu()) {
                    <div [ngClass]="isNearTop() ? 'top-full mt-1.5' : 'bottom-full mb-1.5'"
                         class="absolute left-0 w-44 bg-slate-900/98 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                         (click)="$event.stopPropagation()">
                      <div class="px-2 py-1 text-[10px] font-bold text-slate-400">تغيير تخطيط الواجهة:</div>
                      
                      <button (click)="changePosition('left')" class="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded-xl text-right transition-colors cursor-pointer">
                        <lucide-icon name="panel-left" class="w-3.5 h-3.5 text-indigo-400"></lucide-icon>
                        <span>الشريط الأيسر</span>
                      </button>
                      
                      <button (click)="changePosition('right')" class="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded-xl text-right transition-colors cursor-pointer">
                        <lucide-icon name="panel-right" class="w-3.5 h-3.5 text-indigo-400"></lucide-icon>
                        <span>الشريط الأيمن</span>
                      </button>

                      <button (click)="changePosition('top')" class="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded-xl text-right transition-colors cursor-pointer">
                        <lucide-icon name="panel-top" class="w-3.5 h-3.5 text-indigo-400"></lucide-icon>
                        <span>الشريط العلوي</span>
                      </button>

                      <button (click)="changePosition('bottom')" class="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded-xl text-right transition-colors cursor-pointer">
                        <lucide-icon name="panel-bottom" class="w-3.5 h-3.5 text-indigo-400"></lucide-icon>
                        <span>الشريط السفلي</span>
                      </button>

                      <div class="h-px bg-white/10 my-1"></div>

                      <button (click)="changePosition('floating')" class="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 rounded-xl text-right font-bold transition-colors cursor-pointer">
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

          <!-- Quick Search Filter Input -->
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

          <!-- Recent Visited Pages -->
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
                     class="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 hover:bg-indigo-600/20 border border-white/5 hover:border-indigo-500/30 text-[10px] text-slate-300 hover:text-white truncate transition-all cursor-pointer">
                    <lucide-icon [name]="item.icon" class="w-3 h-3 text-indigo-400 shrink-0"></lucide-icon>
                    <span class="truncate">{{ item.label }}</span>
                  </a>
                }
              </div>
            </div>
          }

          <!-- Navigation Items List (Drag & Drop Reorderable) -->
          <div #itemsContainer
               cdkDropList
               (cdkDropListDropped)="onDropItem($event)"
               class="flex-1 overflow-y-auto scrollbar-hide p-2 space-y-1">
            
            @for (item of pinnedItems; track item.id) {
              @if (!sidebar.isFloatingIconsOnly()) {
                <div cdkDrag class="w-full relative group flex items-center rounded-xl transition-all">
                  <div class="flex-1">
                    <app-sidebar-item [item]="item" (click)="onItemClick(item)"></app-sidebar-item>
                  </div>
                </div>
              } @else {
                <a [routerLink]="['/' + (item.route || item.id)]"
                   (click)="onItemClick(item)"
                   routerLinkActive="bg-indigo-600 text-white shadow-lg shadow-indigo-600/40"
                   [routerLinkActiveOptions]="{ exact: !item.route && item.id === '' }"
                   class="w-full h-11 flex items-center justify-center rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all relative group cursor-pointer"
                   [title]="item.label">
                  <lucide-icon [name]="item.icon" 
                              class="w-5 h-5 shrink-0 transition-transform group-hover:scale-110"
                              [ngClass]="getIconColor(item.id)"></lucide-icon>
                  <div class="absolute right-full mr-2.5 px-2.5 py-1 bg-slate-900/95 backdrop-blur-xl border border-white/10 text-white text-[11px] font-bold rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 z-50 whitespace-nowrap">
                    {{ item.label }}
                  </div>
                </a>
              }
            } @empty {
              <div class="text-xs text-slate-500 text-center py-6">لا توجد أقسام تطابق البحث</div>
            }

            @if (sidebar.showAllUnpinnedAtBottom() && !sidebar.isFloatingIconsOnly() && unpinnedItems.length > 0) {
              <div class="pt-2 border-t border-white/5 space-y-1">
                <div class="text-[9px] font-bold text-slate-500 uppercase tracking-wider px-2">أقسام إضافية غير مثبتة</div>
                @for (item of unpinnedItems; track item.id) {
                  <app-sidebar-item [item]="item" (click)="onItemClick(item)"></app-sidebar-item>
                }
              </div>
            }
          </div>

          <!-- Bottom Multi-Function Directional Controls -->
          <div class="border-t border-white/10 p-2.5 space-y-2 bg-black/40 shrink-0">
            @if (!sidebar.isFloatingIconsOnly()) {
              <div class="space-y-1.5">
                <div class="flex items-center justify-between text-[9px] font-bold text-slate-400 px-1">
                  <span>وظيفة الأسهم:</span>
                  <span class="text-indigo-400 font-mono font-bold">{{ getArrowModeTitle() }}</span>
                </div>

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

                <div class="grid grid-cols-4 gap-1 pt-1">
                  <button (click)="onArrowClick('up')"
                          class="flex flex-col items-center justify-center p-1.5 rounded-xl bg-white/5 hover:bg-indigo-600/30 border border-white/5 hover:border-indigo-500/40 text-slate-300 hover:text-white transition-all cursor-pointer group active:scale-95"
                          [title]="getArrowTooltip('up')">
                    <lucide-icon name="arrow-up" class="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform"></lucide-icon>
                    <span class="text-[8px] mt-0.5 font-bold">{{ getArrowLabel('up') }}</span>
                  </button>

                  <button (click)="onArrowClick('down')"
                          class="flex flex-col items-center justify-center p-1.5 rounded-xl bg-white/5 hover:bg-indigo-600/30 border border-white/5 hover:border-indigo-500/40 text-slate-300 hover:text-white transition-all cursor-pointer group active:scale-95"
                          [title]="getArrowTooltip('down')">
                    <lucide-icon name="arrow-down" class="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform"></lucide-icon>
                    <span class="text-[8px] mt-0.5 font-bold">{{ getArrowLabel('down') }}</span>
                  </button>

                  <button (click)="onArrowClick('left')"
                          class="flex flex-col items-center justify-center p-1.5 rounded-xl bg-white/5 hover:bg-indigo-600/30 border border-white/5 hover:border-indigo-500/40 text-slate-300 hover:text-white transition-all cursor-pointer group active:scale-95"
                          [title]="getArrowTooltip('left')">
                    <lucide-icon name="arrow-left" class="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform"></lucide-icon>
                    <span class="text-[8px] mt-0.5 font-bold">{{ getArrowLabel('left') }}</span>
                  </button>

                  <button (click)="onArrowClick('right')"
                          class="flex flex-col items-center justify-center p-1.5 rounded-xl bg-white/5 hover:bg-indigo-600/30 border border-white/5 hover:border-indigo-500/40 text-slate-300 hover:text-white transition-all cursor-pointer group active:scale-95"
                          [title]="getArrowTooltip('right')">
                    <lucide-icon name="arrow-right" class="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform"></lucide-icon>
                    <span class="text-[8px] mt-0.5 font-bold">{{ getArrowLabel('right') }}</span>
                  </button>
                </div>

                @if (sidebar.arrowControlMode() === 'snap') {
                  <button (click)="sidebar.snapFloatingTo('center')"
                          class="w-full flex items-center justify-center gap-1.5 py-1 bg-white/5 hover:bg-indigo-600/20 border border-white/5 hover:border-indigo-500/30 rounded-xl text-[9px] text-slate-300 hover:text-white transition-all cursor-pointer">
                    <span>🎯</span>
                    <span>إرساء في منتصف الشاشة</span>
                  </button>
                }
              </div>
            } @else {
              <div class="flex flex-col gap-1 items-center">
                <button (click)="sidebar.snapFloatingTo('left')"
                        class="w-full flex items-center justify-center p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                        title="إرساء لليسار">
                  <lucide-icon name="arrow-left" class="w-3.5 h-3.5"></lucide-icon>
                </button>
                <button (click)="sidebar.snapFloatingTo('right')"
                        class="w-full flex items-center justify-center p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                        title="إرساء لليمين">
                  <lucide-icon name="arrow-right" class="w-3.5 h-3.5"></lucide-icon>
                </button>
              </div>
            }
          </div>

        </div>
      }

      <!-- ───────────────────────────────────────────────────────────── -->
      <!-- 2B. LUXURY MAC-OS STYLE DYNAMIC HORIZONTAL GLASS DOCK         -->
      <!-- ───────────────────────────────────────────────────────────── -->
      @if (sidebar.floatingOrientation() === 'horizontal') {
        <div cdkDrag
             [cdkDragConstrainPosition]="constrainPosition"
             [cdkDragFreeDragPosition]="sidebar.floatingPos()"
             (cdkDragEnded)="onDragEnded($event)"
             class="fixed top-0 left-0 z-[100] w-max max-w-[94vw] bg-[#080C16]/92 backdrop-blur-2xl border border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.85),0_0_35px_rgba(99,102,241,0.2)] rounded-3xl p-1.5 flex flex-col gap-1 select-none animate-in fade-in zoom-in-95 duration-200"
             dir="rtl">
          
          <!-- Subtle Top Grab Bar for Natural Dragging -->
          <div cdkDragHandle
               (dblclick)="sidebar.resetFloatingPosition()"
               class="w-full flex items-center justify-center py-0.5 cursor-move group/grab shrink-0"
               title="اسحب لنقل الدوك في أي مكان (انقر مرتين للتوسيط 🎯)">
            <div class="w-16 h-1 rounded-full bg-white/20 group-hover/grab:bg-indigo-400/80 group-hover/grab:w-24 transition-all duration-300"></div>
          </div>

          <!-- Main Unified Glass Dock Row -->
          <div class="flex items-center gap-1.5 px-1">
            
            <!-- Right Tool Capsule: Search & Recent -->
            <div class="flex items-center gap-1 bg-white/[0.04] p-1 rounded-2xl border border-white/5 shrink-0">
              
              <!-- Quick Search Trigger -->
              <button (click)="toggleSearch()"
                      [ngClass]="showSearch() ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'"
                      class="w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95"
                      title="بحث سريع (Ctrl + K)">
                <lucide-icon name="search" class="w-4 h-4"></lucide-icon>
              </button>

              <!-- Recent Visited Pages -->
              <div class="relative">
                <button (click)="toggleRecentMenu($event)"
                        [ngClass]="showRecentMenu() ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'"
                        class="w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95"
                        title="الأقسام الأخيرة">
                  <lucide-icon name="history" class="w-4 h-4 text-indigo-400"></lucide-icon>
                </button>

                @if (showRecentMenu()) {
                  <div [ngClass]="isNearTop() ? 'top-full mt-2' : 'bottom-full mb-2'"
                       class="absolute right-0 w-56 bg-slate-900/98 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl p-2 z-[120] animate-in fade-in zoom-in-95 duration-100"
                       (click)="$event.stopPropagation()">
                    <div class="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1.5 flex items-center gap-1 border-b border-white/10 pb-1">
                      <lucide-icon name="history" class="w-3 h-3"></lucide-icon>
                      <span>الأقسام الأخيرة</span>
                    </div>
                    <div class="space-y-1 max-h-48 overflow-y-auto scrollbar-hide">
                      @for (item of recentItems; track item.id) {
                        <a [routerLink]="['/' + (item.route || item.id)]"
                           (click)="onItemClick(item); showRecentMenu.set(false)"
                           class="flex items-center gap-2 p-1.5 rounded-xl bg-white/5 hover:bg-indigo-600/20 border border-white/5 text-xs text-slate-300 hover:text-white transition-all cursor-pointer">
                          <lucide-icon [name]="item.icon" class="w-3.5 h-3.5 text-indigo-400 shrink-0"></lucide-icon>
                          <span class="truncate">{{ item.label }}</span>
                        </a>
                      } @empty {
                        <div class="text-[10px] text-slate-500 text-center py-2">لا توجد أقسام أخيرة</div>
                      }
                    </div>
                  </div>
                }
              </div>

            </div>

            <!-- Glowing Vertical Divider -->
            <div class="w-px h-7 bg-white/10 shrink-0 mx-0.5"></div>

            <!-- Dock Scroll Right Arrow (Hidden if not needed, smooth on click) -->
            <button (click)="scrollHorizontalDock('right')" 
                    class="w-7 h-9 rounded-xl bg-white/[0.03] hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all shrink-0 cursor-pointer text-xs"
                    title="تمرير لليمين">
              ▶
            </button>

            <!-- Center App Icons Container (DND Reorderable + Fluid Mac Dock Hover) -->
            <div #horizontalDock
                 cdkDropList
                 cdkDropListOrientation="horizontal"
                 (cdkDropListDropped)="onDropItem($event)"
                 class="max-w-[65vw] flex items-center gap-1.5 overflow-x-auto scrollbar-none px-0.5 py-1 scroll-smooth"
                 style="-ms-overflow-style: none; scrollbar-width: none;">
              
              @for (item of pinnedItems; track item.id) {
                <div cdkDrag
                     class="relative group shrink-0 flex items-center justify-center">
                  
                  <a [routerLink]="['/' + (item.route || item.id)]"
                     (click)="onItemClick(item)"
                     routerLinkActive="bg-indigo-600/30 text-white border-indigo-500/60 shadow-lg shadow-indigo-500/25"
                     [routerLinkActiveOptions]="{ exact: !item.route && item.id === '' }"
                     class="relative flex flex-col items-center justify-center w-11 h-11 rounded-2xl bg-white/[0.04] hover:bg-white/15 border border-white/5 hover:border-white/20 text-slate-400 hover:text-white hover:-translate-y-1 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer">
                    
                    <lucide-icon [name]="item.icon" class="w-5 h-5 transition-transform group-hover:scale-110 text-slate-300 group-hover:text-indigo-400"></lucide-icon>

                    @if (item.status === 'BETA') {
                      <span class="absolute -top-1 -right-1 text-[7px] px-1 h-3.5 border border-amber-500/40 bg-amber-500/30 text-amber-300 font-black rounded-full shadow-sm">B</span>
                    }
                    @if (item.status === 'PRO') {
                      <span class="absolute -top-1 -right-1 bg-gradient-to-r from-amber-400 to-orange-500 text-black px-1 h-3.5 rounded-full text-[7px] font-black shadow-sm">P</span>
                    }

                    <!-- 3-Dots Mini Action on Hover -->
                    <button (click)="toggleItemContextMenu($event, item)"
                            class="absolute -bottom-1 -left-1 w-4 h-4 rounded-full bg-slate-900/95 border border-white/20 text-slate-400 hover:text-white hover:bg-indigo-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 cursor-pointer shadow">
                      <lucide-icon name="more-vertical" class="w-2.5 h-2.5"></lucide-icon>
                    </button>

                    <!-- Tooltip on Hover (Smart Placement) -->
                    @if (contextMenuItem()?.id !== item.id) {
                      <div [ngClass]="isNearTop() ? 'top-full mt-3' : 'bottom-full mb-3'"
                           class="absolute px-3 py-1.5 bg-slate-900/95 backdrop-blur-xl border border-white/15 text-white text-xs font-bold rounded-2xl shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 z-50 whitespace-nowrap">
                        {{ item.label }}
                      </div>
                    }
                  </a>

                  <!-- Item Context Menu Attached DIRECTLY to this item -->
                  @if (contextMenuItem()?.id === item.id) {
                    <div (click)="$event.stopPropagation()"
                         [ngClass]="isNearTop() ? 'top-full mt-2' : 'bottom-full mb-2'"
                         class="absolute right-0 z-[130] bg-slate-900/98 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl p-2 min-w-44 animate-in fade-in zoom-in-95 duration-100 text-right">
                      
                      <div class="px-2 py-1 text-[10px] font-bold text-indigo-400 border-b border-white/10 mb-1 flex items-center justify-between">
                        <span class="truncate">{{ item.label }}</span>
                        <button (click)="closeItemContextMenu()" class="text-slate-400 hover:text-white text-[10px] p-0.5 cursor-pointer">✕</button>
                      </div>

                      <a [routerLink]="['/' + (item.route || item.id)]"
                         (click)="closeItemContextMenu()"
                         class="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded-xl text-right transition-colors cursor-pointer">
                        <lucide-icon name="external-link" class="w-3.5 h-3.5 text-indigo-400"></lucide-icon>
                        <span>فتح القسم</span>
                      </a>

                      <button (click)="togglePinItem(item); closeItemContextMenu()" 
                              class="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded-xl text-right transition-colors cursor-pointer">
                        <lucide-icon name="pin" class="w-3.5 h-3.5 text-amber-400"></lucide-icon>
                        <span>{{ sidebar.isPinned(item.id) ? 'إلغاء التثبيت' : 'تثبيت في المفضلة' }}</span>
                      </button>

                      <button (click)="showCustomizationDialog = true; closeItemContextMenu()"
                              class="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded-xl text-right transition-colors cursor-pointer">
                        <lucide-icon name="sliders-horizontal" class="w-3.5 h-3.5 text-indigo-400"></lucide-icon>
                        <span>تخصيص وترتيب</span>
                      </button>
                    </div>
                  }

                </div>
              } @empty {
                <div class="text-xs text-slate-500 text-center py-2 px-6">لا توجد أقسام تطابق البحث</div>
              }
            </div>

            <!-- Dock Scroll Left Arrow -->
            <button (click)="scrollHorizontalDock('left')" 
                    class="w-7 h-9 rounded-xl bg-white/[0.03] hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all shrink-0 cursor-pointer text-xs"
                    title="تمرير لليسار">
              ◀
            </button>

            <!-- Glowing Vertical Divider -->
            <div class="w-px h-7 bg-white/10 shrink-0 mx-0.5"></div>

            <!-- Left Unified Control Capsule: Master Omni Hub, Minimize -->
            <div class="flex items-center gap-1 bg-white/[0.04] p-1 rounded-2xl border border-white/5 shrink-0">
              
              <!-- Master Omni Hub & Tools Menu Popover Trigger -->
              <div class="relative">
                <button (click)="toggleHorizontalLayoutMenu($event)"
                        [ngClass]="showHorizontalLayoutMenu() ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white hover:bg-white/10'"
                        class="w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95"
                        title="مركز التحكم بالواجهة والأدوات (Omni Hub)">
                  <lucide-icon name="settings-2" class="w-4 h-4 text-indigo-400"></lucide-icon>
                </button>

                @if (showHorizontalLayoutMenu()) {
                  <div [ngClass]="isNearTop() ? 'top-full mt-2' : 'bottom-full mb-2'"
                       class="absolute left-0 w-60 bg-slate-900/98 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl p-2.5 z-[120] animate-in fade-in zoom-in-95 duration-100 space-y-2 text-right"
                       (click)="$event.stopPropagation()">
                    
                    <!-- Header -->
                    <div class="flex items-center justify-between text-[10px] font-bold text-slate-300 pb-1.5 border-b border-white/10">
                      <span>مركز التحكم (Omni Hub):</span>
                      <button (click)="sidebar.resetFloatingPosition()" class="text-amber-400 hover:text-amber-300 text-[10px] flex items-center gap-1 cursor-pointer" title="توسيط الشاشة">
                        <span>🎯</span>
                        <span>توسيط</span>
                      </button>
                    </div>

                    <!-- Mode Switch: Switch to Vertical -->
                    <button (click)="sidebar.setFloatingOrientation('vertical'); closeAllPopovers()"
                            class="w-full flex items-center justify-between px-2.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 rounded-xl text-xs text-indigo-300 hover:text-white transition-all cursor-pointer">
                      <div class="flex items-center gap-2">
                        <lucide-icon name="panel-right" class="w-4 h-4 text-indigo-400"></lucide-icon>
                        <span class="font-bold">التحويل إلى اللوحة الرأسية</span>
                      </div>
                      <span class="text-[10px] bg-indigo-500/30 px-1.5 py-0.5 rounded-md">⏸️ رأسي</span>
                    </button>

                    <!-- Layout Switcher Section -->
                    <div class="space-y-1 pt-1">
                      <div class="text-[9px] font-bold text-slate-400">تغيير تخطيط الواجهة:</div>
                      <div class="grid grid-cols-2 gap-1">
                        <button (click)="changePosition('top')" class="flex items-center gap-1.5 px-2 py-1 text-[11px] text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer">
                          <lucide-icon name="panel-top" class="w-3 h-3 text-indigo-400"></lucide-icon>
                          <span>شريط علوي</span>
                        </button>
                        <button (click)="changePosition('bottom')" class="flex items-center gap-1.5 px-2 py-1 text-[11px] text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer">
                          <lucide-icon name="panel-bottom" class="w-3 h-3 text-indigo-400"></lucide-icon>
                          <span>شريط سفلي</span>
                        </button>
                        <button (click)="changePosition('left')" class="flex items-center gap-1.5 px-2 py-1 text-[11px] text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer">
                          <lucide-icon name="panel-left" class="w-3 h-3 text-indigo-400"></lucide-icon>
                          <span>شريط أيسر</span>
                        </button>
                        <button (click)="changePosition('right')" class="flex items-center gap-1.5 px-2 py-1 text-[11px] text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer">
                          <lucide-icon name="panel-right" class="w-3 h-3 text-indigo-400"></lucide-icon>
                          <span>شريط أيمن</span>
                        </button>
                      </div>
                    </div>

                    <!-- Multi-Mode Directional Pad -->
                    <div class="space-y-1 pt-1 border-t border-white/10">
                      <div class="flex items-center justify-between text-[9px] font-bold text-slate-400">
                        <span>التحكم بالأسهم والإرساء:</span>
                        <span class="text-indigo-400 font-mono">{{ getArrowModeTitle() }}</span>
                      </div>

                      <div class="grid grid-cols-4 gap-1 bg-white/[0.03] p-0.5 rounded-lg border border-white/5">
                        <button (click)="sidebar.setArrowControlMode('move')" [ngClass]="sidebar.arrowControlMode() === 'move' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'" class="py-0.5 rounded text-[8px] text-center cursor-pointer">📍 تحريك</button>
                        <button (click)="sidebar.setArrowControlMode('snap')" [ngClass]="sidebar.arrowControlMode() === 'snap' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'" class="py-0.5 rounded text-[8px] text-center cursor-pointer">🧲 إرساء</button>
                        <button (click)="sidebar.setArrowControlMode('resize')" [ngClass]="sidebar.arrowControlMode() === 'resize' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'" class="py-0.5 rounded text-[8px] text-center cursor-pointer">📐 أبعاد</button>
                        <button (click)="sidebar.setArrowControlMode('scroll')" [ngClass]="sidebar.arrowControlMode() === 'scroll' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'" class="py-0.5 rounded text-[8px] text-center cursor-pointer">📜 تمرير</button>
                      </div>

                      <div class="grid grid-cols-4 gap-1 pt-1">
                        <button (click)="onArrowClick('up')" class="flex flex-col items-center justify-center p-1 rounded-lg bg-white/5 hover:bg-indigo-600/30 text-slate-300 hover:text-white cursor-pointer">
                          <lucide-icon name="arrow-up" class="w-3 h-3 text-indigo-400"></lucide-icon>
                          <span class="text-[7px] font-bold">{{ getArrowLabel('up') }}</span>
                        </button>
                        <button (click)="onArrowClick('down')" class="flex flex-col items-center justify-center p-1 rounded-lg bg-white/5 hover:bg-indigo-600/30 text-slate-300 hover:text-white cursor-pointer">
                          <lucide-icon name="arrow-down" class="w-3 h-3 text-indigo-400"></lucide-icon>
                          <span class="text-[7px] font-bold">{{ getArrowLabel('down') }}</span>
                        </button>
                        <button (click)="onArrowClick('left')" class="flex flex-col items-center justify-center p-1 rounded-lg bg-white/5 hover:bg-indigo-600/30 text-slate-300 hover:text-white cursor-pointer">
                          <lucide-icon name="arrow-left" class="w-3 h-3 text-indigo-400"></lucide-icon>
                          <span class="text-[7px] font-bold">{{ getArrowLabel('left') }}</span>
                        </button>
                        <button (click)="onArrowClick('right')" class="flex flex-col items-center justify-center p-1 rounded-lg bg-white/5 hover:bg-indigo-600/30 text-slate-300 hover:text-white cursor-pointer">
                          <lucide-icon name="arrow-right" class="w-3 h-3 text-indigo-400"></lucide-icon>
                          <span class="text-[7px] font-bold">{{ getArrowLabel('right') }}</span>
                        </button>
                      </div>
                    </div>

                    <!-- Customization Action -->
                    <div class="pt-1 border-t border-white/10">
                      <button (click)="showCustomizationDialog = true; closeAllPopovers()"
                              class="w-full flex items-center justify-center gap-2 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs text-slate-300 hover:text-white transition-all cursor-pointer">
                        <lucide-icon name="sliders-horizontal" class="w-3.5 h-3.5 text-indigo-400"></lucide-icon>
                        <span>تخصيص وترتيب الأقسام</span>
                      </button>
                    </div>

                  </div>
                }
              </div>

              <!-- Minimize to Floating Orb -->
              <button (click)="sidebar.setFloatingExpanded(false)"
                      class="w-9 h-9 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all cursor-pointer active:scale-95"
                      title="تصغير إلى الدائرة">
                <lucide-icon name="minimize-2" class="w-4 h-4"></lucide-icon>
              </button>

            </div>

          </div>

          <!-- Quick Search Bar (When Search is open in Horizontal Mode) -->
          @if (showSearch()) {
            <div class="px-2 pt-1 border-t border-white/10 animate-in fade-in slide-in-from-top-1">
              <div class="relative flex items-center bg-white/5 border border-white/10 rounded-xl px-3 py-1 focus-within:border-indigo-500/60">
                <lucide-icon name="search" class="w-3.5 h-3.5 text-slate-400 shrink-0 ml-2"></lucide-icon>
                <input #horizontalSearchInput
                       type="text" 
                       [ngModel]="searchQuery()" 
                       (ngModelChange)="searchQuery.set($event)"
                       placeholder="ابحث في جميع الأقسام..." 
                       class="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none text-right font-medium">
                @if (searchQuery()) {
                  <button (click)="searchQuery.set('')" class="text-slate-400 hover:text-white text-xs px-1 cursor-pointer">✕</button>
                }
              </div>
            </div>
          }

        </div>
      }

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
  settingsService = inject(SettingsService);

  @ViewChild('itemsContainer') itemsContainerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('searchInput') searchInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('horizontalSearchInput') horizontalSearchInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('horizontalDock') horizontalDockRef!: ElementRef<HTMLDivElement>;

  showLayoutMenu = signal<boolean>(false);
  showHorizontalLayoutMenu = signal<boolean>(false);
  showSearch = signal<boolean>(false);
  showRecentMenu = signal<boolean>(false);
  showArrowPad = signal<boolean>(false);
  searchQuery = signal<string>('');
  showCustomizationDialog: boolean = false;

  contextMenuItem = signal<NavItem | null>(null);

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    this.closeAllPopovers();
  }

  constrainPosition = (point: { x: number, y: number }, dragRef: any) => {
    if (typeof window === 'undefined') return point;
    const root = dragRef?.getRootElement?.();
    const width = root?.offsetWidth || (this.sidebar.isFloatingIconsOnly() ? 72 : 300);
    const height = root?.offsetHeight || 60;
    const padding = 16;

    const minX = padding;
    const maxX = Math.max(padding, window.innerWidth - width - padding);
    const minY = padding;
    const maxY = Math.max(padding, window.innerHeight - height - padding);

    return {
      x: Math.max(minX, Math.min(maxX, point.x)),
      y: Math.max(minY, Math.min(maxY, point.y))
    };
  };

  isNearTop(): boolean {
    return this.sidebar.floatingPos().y < 280;
  }

  closeAllPopovers() {
    this.showRecentMenu.set(false);
    this.showArrowPad.set(false);
    this.showHorizontalLayoutMenu.set(false);
    this.showLayoutMenu.set(false);
    this.contextMenuItem.set(null);
  }

  get userRole(): string | null {
    return (this.firebase.userData() as any)?.role || 'admin';
  }

  get visibleItems(): NavItem[] {
    const baseItems = getVisibleNavItems(this.userRole, ALL_NAV_ITEMS);
    
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

  scrollHorizontalDock(direction: 'left' | 'right') {
    const el = this.horizontalDockRef?.nativeElement;
    if (!el) return;
    const delta = direction === 'left' ? -200 : 200;
    el.scrollBy({ left: delta, behavior: 'smooth' });
  }

  toggleSearch() {
    this.showSearch.update(v => !v);
    if (this.showSearch()) {
      setTimeout(() => {
        this.searchInputRef?.nativeElement?.focus();
        this.horizontalSearchInputRef?.nativeElement?.focus();
      }, 50);
    } else {
      this.searchQuery.set('');
    }
  }

  toggleRecentMenu(event: Event) {
    event.stopPropagation();
    const next = !this.showRecentMenu();
    this.closeAllPopovers();
    this.showRecentMenu.set(next);
  }

  toggleHorizontalLayoutMenu(event: Event) {
    event.stopPropagation();
    const next = !this.showHorizontalLayoutMenu();
    this.closeAllPopovers();
    this.showHorizontalLayoutMenu.set(next);
  }

  toggleItemContextMenu(event: MouseEvent, item: NavItem) {
    event.preventDefault();
    event.stopPropagation();
    if (this.contextMenuItem()?.id === item.id) {
      this.closeItemContextMenu();
    } else {
      this.closeAllPopovers();
      this.contextMenuItem.set(item);
    }
  }

  closeItemContextMenu() {
    this.contextMenuItem.set(null);
  }

  togglePinItem(item: NavItem) {
    this.sidebar.togglePin(item.id);
  }

  onItemClick(item: NavItem) {
    this.sidebar.addRecentItem(item.id);
  }

  onDragEnded(event: CdkDragEnd) {
    const transform = event.source.getFreeDragPosition();
    const el = event.source.element.nativeElement;
    const width = el.offsetWidth || (this.sidebar.isFloatingIconsOnly() ? 72 : 300);
    const height = el.offsetHeight || 60;
    const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
    const padding = 16;

    let safeX = Math.max(padding, Math.min(windowWidth - width - padding, transform.x));
    let safeY = Math.max(padding, Math.min(windowHeight - height - padding, transform.y));

    this.sidebar.setFloatingPos({ x: safeX, y: safeY });
  }

  onDropItem(event: CdkDragDrop<NavItem[]>) {
    const currentPinned = [...this.sidebar.pinnedItems()];
    moveItemInArray(currentPinned, event.previousIndex, event.currentIndex);
    this.sidebar.reorderPinnedItems(currentPinned);
  }

  toggleLayoutMenu(event: Event) {
    event.stopPropagation();
    const next = !this.showLayoutMenu();
    this.closeAllPopovers();
    this.showLayoutMenu.set(next);
  }

  changePosition(pos: SidebarPosition) {
    this.closeAllPopovers();
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
    
    if (mode === 'move') {
      this.sidebar.moveFloating(dir, 40);
      return;
    }

    if (mode === 'snap') {
      const edge = dir === 'up' ? 'top' : dir === 'down' ? 'bottom' : dir;
      this.sidebar.snapFloatingTo(edge);
      return;
    }

    if (mode === 'resize') {
      if (dir === 'up') this.sidebar.resizeFloating(0, 50);
      if (dir === 'down') this.sidebar.resizeFloating(0, -50);
      if (dir === 'left') this.sidebar.resizeFloating(30, 0);
      if (dir === 'right') this.sidebar.resizeFloating(-30, 0);
      return;
    }

    if (mode === 'scroll') {
      const el = this.sidebar.floatingOrientation() === 'vertical' 
        ? this.itemsContainerRef?.nativeElement 
        : this.horizontalDockRef?.nativeElement;
      if (!el) return;

      if (this.sidebar.floatingOrientation() === 'vertical') {
        if (dir === 'up') el.scrollBy({ top: -120, behavior: 'smooth' });
        if (dir === 'down') el.scrollBy({ top: 120, behavior: 'smooth' });
        if (dir === 'left') el.scrollTo({ top: 0, behavior: 'smooth' });
        if (dir === 'right') el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      } else {
        if (dir === 'left' || dir === 'up') el.scrollBy({ left: -200, behavior: 'smooth' });
        if (dir === 'right' || dir === 'down') el.scrollBy({ left: 200, behavior: 'smooth' });
      }
      return;
    }
  }
}
