import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { 
  LucideAngularModule, Play, Clock, History, Bookmark, User, ChevronLeft, 
  Download, Trash2, WifiOff, Search, X, Sparkles, Film, CheckCircle2,
  PauseCircle, LayoutGrid, List, Filter
} from 'lucide-angular';
import { WeTubeService } from '../../wetube.service';
import { IndexedDBService } from '../../../../core/services/indexed-db.service';
import { VideoDownloadService } from '../../../../core/services/video-download.service';
import { FirebaseService } from '../../../../core/services/firebase.service';
import { checkIsShorts } from '../../wetube.model';

export interface HistoryGroup {
  period: string;
  items: any[];
}

@Component({
  selector: 'app-wetube-library',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule],
  template: `
    <div class="library-page w-full min-h-screen bg-[#0f0f0f] text-white p-4 sm:p-6 lg:p-8 overflow-y-auto pb-24" dir="rtl">
      <div class="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8">
        
        <!-- Main Content (History & Saved) -->
        <div class="flex-1 space-y-10">
          
          <!-- ========================================================= -->
          <!-- HISTORY SECTION                                          -->
          <!-- ========================================================= -->
          @if (pageMode() === 'library' || pageMode() === 'history') {
            <section class="space-y-6">
              
              <!-- Header Bar -->
              <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <lucide-icon [img]="History" size="22"></lucide-icon>
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <h2 class="text-xl font-black text-white">سجل المشاهدة</h2>
                      <span class="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-full text-xs font-bold">
                        {{ filteredHistory().length }} فيديو
                      </span>
                    </div>
                    <p class="text-xs text-slate-400 mt-0.5">الفيديوهات التي قمت بمشاهدتها مؤخراً على WeTube</p>
                  </div>
                </div>

                <div class="flex items-center gap-2.5 w-full sm:w-auto overflow-x-auto hide-scrollbar">
                  @if (pageMode() === 'history' && history().length > 0) {
                    <!-- View Mode Toggle -->
                    <div class="flex items-center bg-slate-900 border border-white/10 rounded-xl p-1 shrink-0">
                      <button 
                        (click)="viewMode.set('grid')"
                        [class.bg-indigo-600]="viewMode() === 'grid'"
                        [class.text-white]="viewMode() === 'grid'"
                        [class.text-slate-400]="viewMode() !== 'grid'"
                        class="px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1">
                        <lucide-icon [img]="LayoutGrid" size="14"></lucide-icon>
                        <span class="hidden sm:inline">شبكة</span>
                      </button>
                      <button 
                        (click)="viewMode.set('list')"
                        [class.bg-indigo-600]="viewMode() === 'list'"
                        [class.text-white]="viewMode() === 'list'"
                        [class.text-slate-400]="viewMode() !== 'list'"
                        class="px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1">
                        <lucide-icon [img]="List" size="14"></lucide-icon>
                        <span class="hidden sm:inline">قائمة</span>
                      </button>
                    </div>

                    <!-- Pause Toggle Button -->
                    <button 
                      (click)="togglePauseHistory()"
                      [ngClass]="isHistoryPaused() ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-slate-900 text-slate-300 border-white/10 hover:border-white/20'"
                      class="px-3 py-2 border rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0">
                      <lucide-icon [img]="PauseCircle" size="14" [class.text-amber-400]="isHistoryPaused()"></lucide-icon>
                      <span>{{ isHistoryPaused() ? 'موقوف مؤقتاً' : 'إيقاف السجل' }}</span>
                    </button>

                    <!-- Clear Button -->
                    <button 
                      (click)="clearAllHistory()"
                      class="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0">
                      <lucide-icon [img]="Trash2" size="14"></lucide-icon>
                      <span class="hidden sm:inline">مسح السجل</span>
                    </button>
                  }
                  @if (pageMode() === 'library') {
                    <button class="text-indigo-400 hover:text-indigo-300 text-xs font-bold flex items-center gap-1 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20" [routerLink]="['/stream/history']">
                      <span>عرض الكل</span>
                      <lucide-icon [img]="ChevronLeft" size="16"></lucide-icon>
                    </button>
                  }
                </div>
              </div>

              <!-- History Paused Alert Banner -->
              @if (isHistoryPaused()) {
                <div class="flex items-center justify-between bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-amber-300 text-xs font-bold animate-in fade-in">
                  <div class="flex items-center gap-2.5">
                    <lucide-icon [img]="PauseCircle" size="18" class="text-amber-400 shrink-0"></lucide-icon>
                    <span>تم إيقاف سجل المشاهدة مؤقتاً. لن يتم حفظ الفيديوهات التي تشاهدها حالياً.</span>
                  </div>
                  <button (click)="togglePauseHistory()" class="underline text-amber-400 hover:text-white shrink-0">استئناف الحفظ</button>
                </div>
              }

              <!-- Search & Content Type Filters Bar -->
              @if (pageMode() === 'history' && history().length > 0) {
                <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                  <!-- Search Bar -->
                  <div class="relative flex-1 max-w-md">
                    <input 
                      type="text" 
                      [(ngModel)]="historySearchQuery"
                      placeholder="ابحث في سجل مشاهداتك..."
                      class="w-full bg-slate-900/90 border border-white/10 focus:border-indigo-500/50 rounded-xl py-2.5 pr-10 pl-4 text-xs font-bold text-white placeholder-slate-500 focus:outline-none transition-all"
                    />
                    <lucide-icon [img]="Search" size="16" class="absolute right-3 top-3 text-slate-500 pointer-events-none"></lucide-icon>
                    @if (historySearchQuery()) {
                      <button (click)="historySearchQuery.set('')" class="absolute left-3 top-2.5 text-slate-400 hover:text-white">
                        <lucide-icon [img]="X" size="14"></lucide-icon>
                      </button>
                    }
                  </div>

                  <!-- Type Filter Chips -->
                  <div class="flex items-center gap-2 shrink-0">
                    <button 
                      (click)="typeFilter.set('all')"
                      class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition border"
                      [ngClass]="typeFilter() === 'all' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'">
                      الكل
                    </button>
                    <button 
                      (click)="typeFilter.set('videos')"
                      class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition border"
                      [ngClass]="typeFilter() === 'videos' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'">
                      فيديوهات
                    </button>
                    <button 
                      (click)="typeFilter.set('shorts')"
                      class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition border"
                      [ngClass]="typeFilter() === 'shorts' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'">
                      Shorts ⚡
                    </button>
                  </div>
                </div>
              }
              
              <!-- Empty History State -->
              @if (filteredHistory().length === 0) {
                <div class="text-slate-400 py-12 text-center bg-slate-900/40 border border-white/5 rounded-2xl flex flex-col items-center justify-center gap-3">
                  <lucide-icon [img]="History" size="36" class="text-slate-600"></lucide-icon>
                  <h4 class="text-sm font-bold text-slate-300">
                    {{ historySearchQuery() ? 'لم نجد نتائج مطابقة لبحثك في السجل' : 'سجل المشاهدة فارغ حالياً' }}
                  </h4>
                  <p class="text-xs text-slate-500 max-w-xs">الفيديوهات التي تتفرج عليها ستظهر هنا تلقائياً لسهولة العودة إليها في أي وقت</p>
                </div>
              } @else {
                
                <!-- Full History Mode: Grouped by Date Periods (اليوم، أمس، هذا الأسبوع، أقدم) -->
                @if (pageMode() === 'history') {
                  <div class="space-y-8">
                    @for (group of groupedHistory(); track group.period) {
                      <div class="space-y-4">
                        <!-- Date Section Header -->
                        <div class="flex items-center gap-3 border-b border-white/5 pb-2">
                          <h3 class="text-sm font-black text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-xl">
                            {{ group.period }}
                          </h3>
                          <span class="text-xs text-slate-500 font-bold">({{ group.items.length }} فيديو)</span>
                        </div>

                        <!-- Grid View Mode -->
                        @if (viewMode() === 'grid') {
                          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                            @for (item of group.items; track item.videoId) {
                              <div 
                                class="w-full group cursor-pointer relative flex flex-col gap-2 bg-slate-900/50 p-2.5 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all duration-300 hover:-translate-y-1"
                                (click)="playVideo(item.videoId)">
                                
                                <!-- Thumbnail Container -->
                                <div class="relative w-full rounded-xl overflow-hidden bg-slate-950 border border-white/5"
                                     [ngClass]="isShortsVideo(item) ? 'aspect-[9/16]' : 'aspect-video'">
                                  
                                  <img 
                                    crossorigin="anonymous" 
                                    [src]="getSafeThumbnail(item)" 
                                    (error)="onThumbnailError($event, item)"
                                    [alt]="item.title" 
                                    class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                    loading="lazy" 
                                  />

                                  <!-- Delete Button Overlay -->
                                  <button 
                                    (click)="deleteHistoryItem(item.videoId, $event)"
                                    title="حذف من السجل"
                                    class="absolute top-2 left-2 w-7 h-7 rounded-lg bg-black/70 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-sm z-10">
                                    <lucide-icon [img]="X" size="14"></lucide-icon>
                                  </button>

                                  <!-- Shorts Badge -->
                                  @if (isShortsVideo(item)) {
                                    <span class="absolute top-2 right-2 bg-gradient-to-br from-red-600 to-red-800 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase shadow-lg">SHORTS</span>
                                  }

                                  <!-- Duration Badge -->
                                  @if (item.duration) {
                                    <span class="absolute bottom-2 left-2 bg-black/80 backdrop-blur-sm text-white px-1.5 py-0.5 rounded text-[10px] font-bold">{{ item.duration }}</span>
                                  }

                                  <!-- Real Progress Bar Overlay -->
                                  <div class="absolute bottom-0 inset-x-0 h-1 bg-slate-800/80">
                                    <div class="h-full bg-red-600 transition-all duration-500" [style.width.%]="item.progress || 5"></div>
                                  </div>
                                </div>

                                <!-- Info -->
                                <div class="flex flex-col min-w-0 pt-0.5">
                                  <h3 class="text-xs font-bold text-white line-clamp-2 leading-snug group-hover:text-indigo-400 transition-colors">{{ item.title }}</h3>
                                  <div class="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                                    <span class="truncate font-medium">{{ item.author || 'WeTube' }}</span>
                                    <span class="text-slate-500 font-semibold shrink-0">{{ formatTimeAgo(item.watchedAt) }}</span>
                                  </div>
                                </div>
                              </div>
                            }
                          </div>
                        } @else {
                          <!-- Detailed Horizontal List View Mode -->
                          <div class="space-y-3">
                            @for (item of group.items; track item.videoId) {
                              <div 
                                (click)="playVideo(item.videoId)"
                                class="group cursor-pointer bg-slate-900/60 hover:bg-slate-900 border border-white/5 hover:border-indigo-500/30 rounded-2xl p-3 flex flex-col sm:flex-row gap-4 items-start transition-all duration-200 relative">
                                
                                <div class="relative w-full sm:w-48 shrink-0 rounded-xl overflow-hidden bg-slate-950 border border-white/5"
                                     [ngClass]="isShortsVideo(item) ? 'aspect-[9/16] max-w-[120px]' : 'aspect-video'">
                                  <img 
                                    crossorigin="anonymous" 
                                    [src]="getSafeThumbnail(item)" 
                                    (error)="onThumbnailError($event, item)"
                                    [alt]="item.title" 
                                    class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                    loading="lazy" 
                                  />
                                  @if (item.duration) {
                                    <span class="absolute bottom-2 left-2 bg-black/80 backdrop-blur-sm text-white px-1.5 py-0.5 rounded text-[10px] font-bold">{{ item.duration }}</span>
                                  }
                                  <div class="absolute bottom-0 inset-x-0 h-1 bg-slate-800/80">
                                    <div class="h-full bg-red-600 transition-all duration-500" [style.width.%]="item.progress || 5"></div>
                                  </div>
                                </div>

                                <div class="flex-1 min-w-0 space-y-1">
                                  <h3 class="text-sm font-bold text-white leading-snug group-hover:text-indigo-400 transition-colors line-clamp-2">{{ item.title }}</h3>
                                  <p class="text-xs text-slate-400 font-medium">{{ item.author || 'WeTube' }}</p>
                                  <div class="flex items-center gap-3 text-[11px] text-slate-500 font-semibold pt-2">
                                    <span>{{ formatTimeAgo(item.watchedAt) }}</span>
                                    <span>•</span>
                                    <span>مكتمل بنسبة {{ item.progress || 5 }}%</span>
                                  </div>
                                </div>

                                <button 
                                  (click)="deleteHistoryItem(item.videoId, $event)"
                                  title="حذف من السجل"
                                  class="w-8 h-8 rounded-xl bg-white/5 hover:bg-red-600 text-slate-400 hover:text-white transition flex items-center justify-center self-center shrink-0">
                                  <lucide-icon [img]="X" size="16"></lucide-icon>
                                </button>
                              </div>
                            }
                          </div>
                        }

                      </div>
                    }
                  </div>
                } @else {
                  <!-- Library Home Overview Mode (Compact Horizontal Scroll) -->
                  <div class="flex gap-4 overflow-x-auto hide-scrollbar pb-4 snap-x">
                    @for (item of filteredHistory().slice(0, 8); track item.videoId) {
                      <div 
                        class="w-64 shrink-0 snap-start group cursor-pointer relative flex flex-col gap-2 bg-slate-900/50 p-2.5 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all"
                        (click)="playVideo(item.videoId)">
                        <div class="aspect-video bg-slate-950 rounded-xl overflow-hidden relative border border-white/5">
                          <img 
                            crossorigin="anonymous" 
                            [src]="getSafeThumbnail(item)" 
                            (error)="onThumbnailError($event, item)"
                            [alt]="item.title" 
                            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                            loading="lazy" 
                          />
                          <div class="absolute bottom-0 inset-x-0 h-1 bg-slate-800/80">
                            <div class="h-full bg-red-600 transition-all duration-500" [style.width.%]="item.progress || 5"></div>
                          </div>
                        </div>
                        <h3 class="text-xs font-bold text-white line-clamp-2 leading-snug group-hover:text-indigo-400 transition-colors">{{ item.title }}</h3>
                        <p class="text-[10px] text-slate-400 truncate font-medium">{{ item.author || 'WeTube' }}</p>
                      </div>
                    }
                  </div>
                }

              }
            </section>
          }

          <!-- ========================================================= -->
          <!-- OFFLINE DOWNLOADS SECTION                                  -->
          <!-- ========================================================= -->
          @if (pageMode() === 'library' || pageMode() === 'downloads') {
            <section class="space-y-6">
              <div class="flex items-center justify-between border-b border-white/10 pb-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <lucide-icon [img]="Download" size="22"></lucide-icon>
                  </div>
                  <div>
                    <h2 class="text-xl font-black text-white">التنزيلات المحفوظة أوفلاين</h2>
                    <p class="text-xs text-slate-400 mt-0.5">الفيديوهات المخزنة محلياً لمشاهدتها بدون إنترنت (إجمالي الحجم: {{ formatSize(totalDownloadSize()) }})</p>
                  </div>
                </div>
              </div>

              @if (downloads().length === 0) {
                <div class="text-slate-400 py-12 text-center bg-slate-900/40 border border-white/5 rounded-2xl flex flex-col items-center justify-center gap-3">
                  <lucide-icon [img]="WifiOff" size="36" class="text-slate-600"></lucide-icon>
                  <h4 class="text-sm font-bold text-slate-300">لا توجد تنزيلات محلية</h4>
                  <p class="text-xs text-slate-500 max-w-xs">يمكنك تنزيل أي فيديو لمشاهدته لاحقاً بدون الحاجة لاتصال بالإنترنت</p>
                </div>
              } @else {
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                  @for (item of downloads(); track item.videoId) {
                    <div class="w-full group cursor-pointer relative flex flex-col gap-2 bg-slate-900/50 p-2.5 rounded-2xl border border-white/5 hover:border-emerald-500/30 transition-all duration-300 hover:-translate-y-1"
                         (click)="playVideo(item.videoId)">
                      
                      <div class="aspect-video bg-slate-950 rounded-xl overflow-hidden relative border border-white/5">
                        <img 
                          crossorigin="anonymous" 
                          [src]="item.thumbnail || 'assets/placeholder.jpg'" 
                          [alt]="item.title" 
                          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                          loading="lazy"
                        />
                        <button 
                          (click)="deleteDownload(item.videoId, $event)"
                          title="حذف التنزيل"
                          class="absolute top-2 left-2 w-7 h-7 rounded-lg bg-black/70 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-sm z-10">
                          <lucide-icon [img]="X" size="14"></lucide-icon>
                        </button>
                        <span class="absolute bottom-2 right-2 bg-emerald-600 text-white px-1.5 py-0.5 rounded text-[9px] font-black">{{ item.quality || '144p' }}</span>
                      </div>

                      <div class="flex flex-col min-w-0 pt-0.5">
                        <h3 class="text-xs font-bold text-white line-clamp-2 leading-snug group-hover:text-emerald-400 transition-colors">{{ item.title }}</h3>
                        <div class="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                          <span class="truncate font-medium">{{ item.author || 'WeTube' }}</span>
                          <span class="text-emerald-400 font-bold shrink-0">{{ formatSize(item.sizeBytes) }}</span>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              }
            </section>
          }
          @if (pageMode() === 'library' || pageMode() === 'liked') {
            <section class="space-y-6">
              <div class="flex items-center justify-between border-b border-white/10 pb-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <lucide-icon [img]="Bookmark" size="22"></lucide-icon>
                  </div>
                  <div>
                    <h2 class="text-xl font-black text-white">الفيديوهات المحفوظة والجميلة</h2>
                    <p class="text-xs text-slate-400 mt-0.5">قائمة الفيديوهات المضافة للمفضلة أو المحفوظة لاحقاً</p>
                  </div>
                </div>
                @if (pageMode() === 'library') {
                  <button class="text-indigo-400 hover:text-indigo-300 text-xs font-bold flex items-center gap-1 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20" [routerLink]="['/stream/liked']">
                    <span>عرض الكل</span>
                    <lucide-icon [img]="ChevronLeft" size="16"></lucide-icon>
                  </button>
                }
              </div>
              
              @if (savedVideos().length === 0) {
                <div class="text-slate-400 py-12 text-center bg-slate-900/40 border border-white/5 rounded-2xl flex flex-col items-center justify-center gap-3">
                  <lucide-icon [img]="Bookmark" size="36" class="text-slate-600"></lucide-icon>
                  <h4 class="text-sm font-bold text-slate-300">لم تقم بحفظ أي فيديو بعد</h4>
                  <p class="text-xs text-slate-500 max-w-xs">اضغط على زر الحفظ أو الإعجاب أثناء مشاهدة أي فيديو ليظهر هنا تلقائياً</p>
                </div>
              } @else {
                <div [class]="pageMode() === 'liked' ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5' : 'flex gap-4 overflow-x-auto hide-scrollbar pb-4 snap-x'">
                  @for (item of (pageMode() === 'liked' ? savedVideos() : savedVideos().slice(0, 8)); track item.id || item.videoId) {
                    <div 
                      [class]="pageMode() === 'liked' ? 'w-full group cursor-pointer relative flex flex-col gap-2 bg-slate-900/50 p-2.5 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all duration-300 hover:-translate-y-1' : 'w-64 shrink-0 snap-start group cursor-pointer relative flex flex-col gap-2 bg-slate-900/50 p-2.5 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all'" 
                      (click)="playVideo(item.id || item.videoId)">
                      
                      <div class="aspect-video bg-slate-950 rounded-xl overflow-hidden relative border border-white/5">
                        <img 
                          crossorigin="anonymous" 
                          [src]="getSafeThumbnail(item)" 
                          (error)="onThumbnailError($event, item)"
                          [alt]="item.title" 
                          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                          loading="lazy"
                        />
                      </div>
                      <div class="flex flex-col min-w-0 pt-0.5">
                        <h3 class="text-xs font-bold text-white line-clamp-2 leading-snug group-hover:text-indigo-400 transition-colors">{{ item.title }}</h3>
                        <p class="text-[10px] text-slate-400 mt-1 truncate font-medium">{{ item.author || 'WeTube' }}</p>
                      </div>
                    </div>
                  }
                </div>
              }
            </section>
          }

        </div>

        <!-- Sidebar Profile & Stats -->
        @if (pageMode() === 'library') {
          <div class="w-full lg:w-80 shrink-0">
            <div class="bg-slate-900/80 border border-white/10 rounded-3xl p-6 sticky top-24 space-y-6">
              <div class="flex flex-col items-center text-center border-b border-white/5 pb-6">
                <div class="w-20 h-20 rounded-full bg-indigo-900/40 border-2 border-indigo-500 mb-3 flex items-center justify-center overflow-hidden shrink-0 shadow-xl shadow-indigo-500/10">
                  <img *ngIf="userAvatar" [src]="userAvatar" [alt]="userName" class="w-full h-full object-cover" />
                  <lucide-icon *ngIf="!userAvatar" [img]="User" size="36" class="text-indigo-300"></lucide-icon>
                </div>
                <h2 class="text-base font-bold text-white">{{ userName }}</h2>
                <p class="text-xs text-slate-400" dir="ltr">{{ userHandle }}</p>
              </div>

              <div class="space-y-3.5">
                <div class="flex justify-between items-center text-xs font-bold">
                  <span class="text-slate-400">الاشتراكات</span>
                  <span class="text-white font-black bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">{{ wetube.subscriptions().length }}</span>
                </div>
                <div class="flex justify-between items-center text-xs font-bold">
                  <span class="text-slate-400">الفيديوهات المحفوظة</span>
                  <span class="text-white font-black bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">{{ savedVideos().length }}</span>
                </div>
                <div class="flex justify-between items-center text-xs font-bold">
                  <span class="text-slate-400">سجل المشاهدة</span>
                  <span class="text-white font-black bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">{{ filteredHistory().length }}</span>
                </div>
              </div>
            </div>
          </div>
        }

      </div>
    </div>
  `,
  styles: [`
    .hide-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
    .hide-scrollbar::-webkit-scrollbar {
      display: none;
    }
  `]
})
export class WeTubeLibraryComponent implements OnInit {
  wetube = inject(WeTubeService);
  firebase = inject(FirebaseService);
  private idb = inject(IndexedDBService);
  private router = inject(Router);
  private downloadSvc = inject(VideoDownloadService);

  get userName(): string {
    const user = this.firebase.currentUser();
    const data = this.firebase.userData();
    return data?.name || user?.displayName || 'مستخدم WeTube';
  }

  get userHandle(): string {
    const user = this.firebase.currentUser();
    if (user?.email) return '@' + user.email.split('@')[0];
    return '@user';
  }

  get userAvatar(): string | null {
    const user = this.firebase.currentUser();
    return user?.photoURL || null;
  }
  
  // Icons
  Clock = Clock;
  Play = Play;
  History = History;
  Bookmark = Bookmark;
  User = User;
  ChevronLeft = ChevronLeft;
  Download = Download;
  Trash2 = Trash2;
  WifiOff = WifiOff;
  Search = Search;
  X = X;
  Sparkles = Sparkles;
  Film = Film;
  CheckCircle2 = CheckCircle2;
  PauseCircle = PauseCircle;
  LayoutGrid = LayoutGrid;
  List = List;
  Filter = Filter;

  history = signal<any[]>([]);
  savedVideos = signal<any[]>([]);
  downloads = signal<any[]>([]);
  historySearchQuery = signal<string>('');
  typeFilter = signal<'all' | 'videos' | 'shorts'>('all');
  viewMode = signal<'grid' | 'list'>('grid');
  isHistoryPaused = signal<boolean>(localStorage.getItem('wetube_history_paused') === 'true');

  pageMode = computed<'library' | 'history' | 'liked' | 'downloads'>(() => {
    const url = this.router.url;
    if (url.includes('/history')) return 'history';
    if (url.includes('/liked')) return 'liked';
    if (url.includes('/downloads')) return 'downloads';
    return 'library';
  });

  // Filtered and De-duplicated History List
  filteredHistory = computed(() => {
    const rawList = this.history();
    const query = this.historySearchQuery().trim().toLowerCase();
    const type = this.typeFilter();

    // De-duplicate by videoId keeping the latest watchedAt
    const uniqueMap = new Map<string, any>();
    for (const item of rawList) {
      const key = this.extractYoutubeId(item.videoId || item.id) || item.videoId || item.id;
      if (!key) continue;

      const existing = uniqueMap.get(key);
      if (!existing || (item.watchedAt || 0) > (existing.watchedAt || 0)) {
        uniqueMap.set(key, {
          ...item,
          videoId: key
        });
      }
    }

    let result = Array.from(uniqueMap.values()).sort((a, b) => (b.watchedAt || 0) - (a.watchedAt || 0));

    // Apply Content Type Filter (Videos vs Shorts)
    if (type === 'shorts') {
      result = result.filter(item => this.isShortsVideo(item));
    } else if (type === 'videos') {
      result = result.filter(item => !this.isShortsVideo(item));
    }

    // Apply Search Query Filter
    if (query) {
      result = result.filter(item => 
        (item.title && item.title.toLowerCase().includes(query)) ||
        (item.author && item.author.toLowerCase().includes(query))
      );
    }

    return result;
  });

  // Grouped History by Date Periods (اليوم، أمس، هذا الأسبوع، أقدم)
  groupedHistory = computed<HistoryGroup[]>(() => {
    const list = this.filteredHistory();
    if (list.length === 0) return [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - (24 * 60 * 60 * 1000);
    const startOfWeek = startOfToday - (7 * 24 * 60 * 60 * 1000);

    const todayItems: any[] = [];
    const yesterdayItems: any[] = [];
    const thisWeekItems: any[] = [];
    const olderItems: any[] = [];

    for (const item of list) {
      const t = item.watchedAt || 0;
      if (t >= startOfToday) {
        todayItems.push(item);
      } else if (t >= startOfYesterday) {
        yesterdayItems.push(item);
      } else if (t >= startOfWeek) {
        thisWeekItems.push(item);
      } else {
        olderItems.push(item);
      }
    }

    const groups: HistoryGroup[] = [];
    if (todayItems.length > 0) groups.push({ period: 'اليوم', items: todayItems });
    if (yesterdayItems.length > 0) groups.push({ period: 'أمس', items: yesterdayItems });
    if (thisWeekItems.length > 0) groups.push({ period: 'هذا الأسبوع', items: thisWeekItems });
    if (olderItems.length > 0) groups.push({ period: 'أقدم', items: olderItems });

    return groups;
  });

  totalDownloadSize = () => this.downloads().reduce((sum, d) => sum + (d.sizeBytes || 0), 0);

  ngOnInit() {
    this.loadLibraryData();
  }

  togglePauseHistory() {
    const nextState = !this.isHistoryPaused();
    this.isHistoryPaused.set(nextState);
    localStorage.setItem('wetube_history_paused', nextState.toString());
  }

  async loadLibraryData() {
    try {
      // Load History
      const historyData = await this.idb.getAll('watch_history');
      const sortedHistory = (historyData || []).sort((a: any, b: any) => (b.watchedAt || 0) - (a.watchedAt || 0));
      this.history.set(sortedHistory);

      // Async Legacy Record Resolver: Fix default titles "فيديو WeTube المميز"
      this.resolveLegacyHistoryRecords(sortedHistory);

      // Load Saved Videos
      await this.loadSavedVideos();

      // Load Offline Downloads
      const dlData = await this.downloadSvc.getAllCachedMeta();
      this.downloads.set(dlData.sort((a, b) => (b.cachedAt || 0) - (a.cachedAt || 0)));
      
    } catch (e) {
      console.error('Failed to load library data from IndexedDB', e);
    }
  }

  private async resolveLegacyHistoryRecords(items: any[]) {
    let resolvedCount = 0;
    for (const item of items) {
      if (resolvedCount >= 5) break;
      if (item._resolved) continue;

      const ytId = this.extractYoutubeId(item.videoId || item.url || item.id);
      if (!ytId) continue;

      const isShortsVal = checkIsShorts(item);
      const needsTitleUpdate = !item.title || item.title === 'فيديو WeTube المميز' || !item.author || item.author === 'قناة WeTube';
      const needsIsShortsUpdate = item.isShorts !== isShortsVal;

      if (needsTitleUpdate || needsIsShortsUpdate) {
        resolvedCount++;
        try {
          let resolvedTitle = item.title;
          let resolvedAuthor = item.author;

          if (needsTitleUpdate) {
            const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${ytId}&format=json`);
            if (oembedRes.ok) {
              const data = await oembedRes.json();
              if (data && data.title) {
                resolvedTitle = data.title;
                resolvedAuthor = data.author_name || item.author || 'قناة يوتيوب';
              }
            }
          }

          const updatedItem = {
            ...item,
            title: resolvedTitle || 'فيديو WeTube',
            author: resolvedAuthor || 'قناة WeTube',
            thumbnail: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
            isShorts: isShortsVal,
            _resolved: true
          };

          await this.idb.put('watch_history', updatedItem);
          this.history.update(list => list.map(h => ((h.videoId || h.id) === (item.videoId || item.id)) ? updatedItem : h));
        } catch (e) {
          // silently catch
        }
      }
    }
  }

  async loadSavedVideos() {
    try {
      const dbVideos = await this.idb.getAll('saved_videos');
      if (dbVideos && dbVideos.length > 0) {
        const normalized = dbVideos.map((v: any) => ({
          ...v,
          id: v.id || v.videoId,
          videoId: v.videoId || v.id
        }));
        this.savedVideos.set(normalized.sort((a: any, b: any) => (b.savedAt || 0) - (a.savedAt || 0)));
      } else {
        this.savedVideos.set([]);
      }
    } catch (e) {
      console.error('Failed to load saved videos', e);
    }
  }

  extractYoutubeId(str?: string): string | null {
    if (!str) return null;
    if (str.length === 11 && /^[a-zA-Z0-9_-]{11}$/.test(str)) return str;
    const match = str.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([^&?\n]+)/);
    return match ? match[1] : null;
  }

  getSafeThumbnail(item: any): string {
    const ytId = this.extractYoutubeId(item.videoId || item.url || item.id);
    if (ytId) {
      return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
    }
    if (item.thumbnail && !item.thumbnail.includes('placeholder')) {
      return item.thumbnail;
    }
    return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800';
  }

  onThumbnailError(event: Event, item: any) {
    const img = event.target as HTMLImageElement;
    const ytId = this.extractYoutubeId(item.videoId || item.url || item.id);
    if (ytId && img.src !== `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`) {
      img.src = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
    } else {
      img.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800';
    }
  }

  isShortsVideo(item: any): boolean {
    return checkIsShorts(item);
  }

  formatTimeAgo(timestamp?: number): string {
    if (!timestamp) return 'سابقاً';
    const now = Date.now();
    const diff = Math.floor((now - timestamp) / 1000); // in seconds

    if (diff < 60) return 'الآن';
    if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
    if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
    if (diff < 172800) return 'أمس';
    if (diff < 604800) return `منذ ${Math.floor(diff / 86400)} أيام`;
    return new Date(timestamp).toLocaleDateString('ar-EG');
  }

  playVideo(id: string) {
    this.router.navigate(['/stream/watch', id]);
  }

  async deleteHistoryItem(videoId: string, event?: Event) {
    if (event) event.stopPropagation();
    try {
      await this.idb.delete('watch_history', videoId);
      this.history.update(list => list.filter(item => (item.videoId || item.id) !== videoId));
    } catch (e) {
      console.error('Failed to delete item from watch_history', e);
    }
  }

  async clearAllHistory() {
    if (confirm('هل أنت تأكد من إخلاء ومسح سجل المشاهدة بالكامل؟')) {
      try {
        await this.idb.clearStore('watch_history');
        this.history.set([]);
      } catch (e) {
        console.error('Failed to clear watch_history', e);
      }
    }
  }

  async deleteDownload(videoId: string, event?: Event) {
    if (event) event.stopPropagation();
    await this.downloadSvc.deleteCached(videoId);
    this.downloads.update(all => all.filter(d => d.videoId !== videoId));
  }

  formatSize(bytes: number): string {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
}
