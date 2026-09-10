import { Component, OnInit, OnDestroy, signal, computed, ViewChild, ElementRef, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { 
  LucideAngularModule, Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, 
  RotateCcw, RotateCw, SkipForward, SkipBack, FolderOpen, FolderPlus, Upload, Film, Music, Trash2, 
  ListMusic, Sparkles, Sliders, Camera, Subtitles, Repeat, Eye, HardDrive, Clock,
  Search, ArrowUpDown, Plus, X, Loader2, Check, Settings, HelpCircle, CheckCircle2, Tv,
  Undo2, Redo2, ChevronLeft, ChevronRight, History, ScanText
} from 'lucide-angular';
import { PlaylistTabComponent } from './components/playlist-tab/playlist-tab.component';
import { NotesTabComponent } from './components/notes-tab/notes-tab.component';
import { LocalMediaItem, VideoBookmark, RecycleBinItem, VideoNote, VideoJumpPoint } from './models/local-player.models';
import { StorageService } from './services/storage.service';
import { SnapshotService } from './services/snapshot.service';
import { NotesService } from './services/notes.service';

@Component({
  selector: 'app-local-player',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule, PlaylistTabComponent, NotesTabComponent],
  template: `
    <div class="h-screen w-screen bg-slate-950 text-white flex flex-col font-sans select-none overflow-hidden" dir="rtl">
      
      <!-- Top Navigation Header -->
      <header class="h-16 bg-slate-900/80 border-b border-white/10 px-4 sm:px-6 flex items-center justify-between shrink-0 backdrop-blur-md z-20">
        <div class="flex items-center gap-3">
          <div class="p-2.5 bg-gradient-to-tr from-indigo-600 to-teal-500 rounded-2xl text-white shadow-lg shadow-indigo-500/20">
            <lucide-icon [img]="Film" class="size-6"></lucide-icon>
          </div>
          <div>
            <h1 class="text-base font-black tracking-tight text-white flex items-center gap-2">
              <span>مشغل الوسائط والفيديوهات المحلي</span>
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 font-mono">Offline Storage 💾</span>
            </h1>
            <p class="text-[11px] text-slate-400 hidden sm:block">شغّل الفيديوهات والمجلدات من جهازك بدون إنترنت — مع حفظ دائم حتى بعد تحديث الصفحة.</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Folder Picker Button -->
          <label (click)="onFolderLabelClick($event)" class="px-3.5 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg shadow-teal-600/20" title="رفع مجلد كامل بجميع فيديوهاته وحفظه محلياً">
            <lucide-icon [img]="FolderPlus" class="size-4"></lucide-icon>
            <span class="hidden md:inline">فتح مجلد كامل</span>
            <span class="md:hidden">+ مجلد</span>
            <input type="file" #folderInput webkitdirectory directory multiple (change)="onFolderSelected($event)" class="hidden" />
          </label>

          <!-- Files Picker Button -->
          <label class="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20" title="اختيار ملفات محددة">
            <lucide-icon [img]="FolderOpen" class="size-4"></lucide-icon>
            <span class="hidden md:inline">إضافة ملفات</span>
            <span class="md:hidden">+ ملفات</span>
            <input type="file" #filesInput multiple accept="video/*,audio/*,.mkv,.avi,.wmv,.flv,.m4v,.ts,.mp3,.wav,.aac,.ogg,.flac,.m4a" (change)="onFilesSelected($event)" class="hidden" />
          </label>

          <!-- Shortcuts Help Button -->
          <button (click)="showShortcutsModal.set(true)" class="p-2 text-slate-400 hover:text-teal-300 hover:bg-white/5 rounded-xl transition" title="اختصارات لوحة المفاتيح">
            <lucide-icon [img]="HelpCircle" class="size-4.5"></lucide-icon>
          </button>

          <!-- Clear Playlist Button -->
          <button *ngIf="playlist().length > 0" (click)="showClearConfirm.set(true)" class="p-2 text-slate-400 hover:text-red-400 hover:bg-white/5 rounded-xl transition" title="تفريغ القائمة والذاكرة">
            <lucide-icon [img]="Trash2" class="size-4"></lucide-icon>
          </button>
        </div>
      </header>

      <!-- Main Layout -->
      <div class="flex-1 flex flex-col lg:flex-row overflow-hidden relative h-[calc(100vh-4rem)]">
        
        <!-- Left / Center: Video Stage & Player -->
        <main 
          class="flex flex-col bg-black relative justify-center items-center overflow-hidden transition-all duration-300" 
          [ngClass]="{
            'flex-1 min-h-[50vh] lg:min-h-0': !isFloatingMini(),
            'fixed bottom-6 left-6 w-[440px] h-[260px] z-50 shadow-2xl rounded-3xl border-2 border-teal-500 overflow-hidden bg-slate-950': isFloatingMini()
          }"
          (wheel)="onVideoWheel($event)">
          
          <!-- Floating Mini Exit Button -->
          <button *ngIf="isFloatingMini()" (click)="toggleFloatingMini()" class="absolute top-2 left-2 z-40 p-1.5 bg-slate-900/90 hover:bg-red-600 text-white rounded-full shadow-lg transition" title="إغلاق النافذة المصغرة">
            <lucide-icon [img]="X" class="size-4"></lucide-icon>
          </button>
          
          <!-- Ambient Glow Light behind active video -->
          <div *ngIf="activeItem() && isPlaying()" class="absolute inset-0 bg-indigo-500/10 blur-[120px] pointer-events-none transition-all duration-1000"></div>

          <!-- Video Element & Canvas Container -->
          <div *ngIf="activeItem(); else dropzoneTmpl" class="relative w-full h-full flex items-center justify-center group overflow-hidden" (mousemove)="onMouseMove()">
            
            <video 
              #videoPlayer
              [src]="activeItem()?.blobUrl"
              class="w-full h-full max-h-[85vh] cursor-pointer transition-all duration-200"
              [style.filter]="'brightness(' + brightness() + '%)'"
              [ngClass]="{
                'object-contain': videoFit() === 'contain',
                'object-cover': videoFit() === 'cover',
                'object-fill': videoFit() === 'fill'
              }"
              (timeupdate)="onTimeUpdate()"
              (loadedmetadata)="onLoadedMetadata()"
              (ended)="onMediaEnded()"
              (play)="isPlaying.set(true)"
              (pause)="onVideoPause()"
              (error)="onVideoError($event)"
              (click)="onVideoClick($event)"
              playsinline>
              <!-- Subtitles Track if provided -->
              <track *ngIf="activeItem()?.subtitlesUrl" [src]="activeItem()?.subtitlesUrl" kind="subtitles" srclang="ar" label="العربية" default>
            </video>

            <!-- Center Pulse Play/Pause Icon when Paused -->
            <div *ngIf="!isPlaying() && showCenterPlayIcon()" class="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div class="size-20 rounded-full bg-indigo-600/80 backdrop-blur-md flex items-center justify-center text-white shadow-2xl animate-pulse">
                <lucide-icon [img]="Play" class="size-10 fill-white translate-x-0.5"></lucide-icon>
              </div>
            </div>

            <!-- On-Screen OSD Indicator Animation -->
            <div *ngIf="skipFeedback().visible" class="absolute inset-0 flex items-center justify-center pointer-events-none z-30 transition-all">
              <div class="px-6 py-3.5 rounded-3xl bg-slate-900/90 border border-white/20 text-white backdrop-blur-xl shadow-2xl flex items-center gap-3 animate-bounce">
                <lucide-icon [img]="skipFeedback().direction === 'vol' ? (isMuted() || volume() === 0 ? VolumeX : Volume2) : (skipFeedback().direction === 'speed' ? Sliders : (skipFeedback().direction === 'fwd' ? RotateCw : RotateCcw))" class="size-7 text-teal-400"></lucide-icon>
                <span class="text-lg font-black font-mono tracking-wider">{{ skipFeedback().text }}</span>
              </div>
            </div>

            <!-- Top Overlay Info Bar (visible on hover or pause) -->
            <div class="absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/85 via-black/40 to-transparent flex items-center justify-between z-10 transition-opacity duration-300"
                 [class.opacity-0]="!showControls() && isPlaying()"
                 [class.opacity-100]="showControls() || !isPlaying()">
              <div class="flex items-center gap-3">
                <span class="px-2.5 py-1 rounded-lg bg-white/10 text-[11px] font-mono font-bold text-teal-300">
                  {{ activeItem()?.type === 'video' ? '🎬 فيديو' : '🎵 صوت' }}
                </span>
                <div>
                  <h2 class="text-sm font-bold text-white truncate max-w-md">{{ activeItem()?.name }}</h2>
                  <p *ngIf="activeItem()?.folderName" class="text-[10px] text-slate-400 truncate max-w-xs font-mono">📁 {{ activeItem()?.folderName }}</p>
                </div>
              </div>

              <!-- Quick Top Actions: Snapshot, Subtitles, PiP, Settings -->
              <div class="flex items-center gap-2">
                
                <!-- Subtitle Picker -->
                <label class="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white cursor-pointer transition text-xs flex items-center gap-1.5" title="إضافة ملف ترجمة (.srt / .vtt)">
                  <lucide-icon [img]="Subtitles" class="size-4 text-amber-400"></lucide-icon>
                  <span class="hidden sm:inline text-[11px]">ترجمة</span>
                  <input type="file" accept=".srt,.vtt,.ass" (change)="onSubtitlesSelected($event)" class="hidden" />
                </label>

                <!-- Snapshot Button -->
                <button (click)="takeSnapshot()" class="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition" title="التقاط صورة من الفيديو">
                  <lucide-icon [img]="Camera" class="size-4 text-emerald-400"></lucide-icon>
                </button>

                <!-- Quick Background OCR Extraction Button -->
                @if (showQuickOcrButton() && activeItem()) {
                  <button (click)="quickExtractOcr()" 
                          [disabled]="isQuickExtractingOcr()"
                          class="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition relative flex items-center justify-center" 
                          [class.animate-pulse]="isQuickExtractingOcr()"
                          title="استخراج النص من الشاشة وحفظه كملاحظة دون إيقاف الفيديو (Alt + O)">
                    @if (isQuickExtractingOcr()) {
                      <lucide-icon [img]="Loader2" class="size-4 text-cyan-400 animate-spin"></lucide-icon>
                    } @else {
                      <lucide-icon [img]="ScanText" class="size-4 text-cyan-400"></lucide-icon>
                    }
                  </button>
                }

                <!-- Picture in Picture (PiP) -->
                <button (click)="togglePiP()" class="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition" title="صورة داخل صورة (Picture in Picture)">
                  <lucide-icon [img]="Tv" class="size-4 text-indigo-400"></lucide-icon>
                </button>

                <!-- Theater Mode -->
                <button (click)="toggleTheaterMode()" [class.bg-amber-500/30]="isTheaterMode()" [class.text-amber-400]="isTheaterMode()" class="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition" title="وضع السينما والتركيز">
                  <lucide-icon [img]="Maximize2" class="size-4 text-amber-400"></lucide-icon>
                </button>

                <!-- Mini Floating Player -->
                <button (click)="toggleFloatingMini()" [class.bg-emerald-500/30]="isFloatingMini()" [class.text-emerald-400]="isFloatingMini()" class="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition" title="نافذة مصغرة عائمة">
                  <lucide-icon [img]="Tv" class="size-4 text-emerald-400"></lucide-icon>
                </button>
              </div>
            </div>

            <!-- Bottom Custom Control Bar -->
            <div class="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/95 via-black/70 to-transparent flex flex-col gap-2.5 z-10 transition-opacity duration-300"
                 [class.opacity-0]="!showControls() && isPlaying() && !keepControlsVisible()"
                 [class.opacity-100]="showControls() || !isPlaying() || keepControlsVisible()">
              
              <!-- Progress Timeline Slider -->
              <div class="flex items-center gap-3">
                <span class="text-xs font-mono text-slate-300 min-w-14 text-left font-bold">{{ formatTime(currentTime()) }}</span>
                <input 
                  type="range" 
                  min="0" 
                  [max]="duration() || 100" 
                  [value]="currentTime()" 
                  (input)="seek($event)"
                  class="flex-1 h-2 bg-white/20 rounded-lg accent-teal-400 cursor-pointer hover:h-2.5 transition-all" />
                <span class="text-xs font-mono text-slate-400 min-w-14 font-bold">{{ formatTime(duration()) }}</span>
              </div>

              <!-- Bottom Control Buttons -->
              <div class="flex items-center justify-between flex-wrap gap-2">
                
                <!-- Play / Pause / Skip / Seek Buttons -->
                <div class="flex items-center gap-1.5 sm:gap-2">
                  
                  <!-- Previous Video -->
                  <button (click)="playPrevious()" class="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition" title="الفيديو السابق (B)">
                    <lucide-icon [img]="SkipBack" class="size-5"></lucide-icon>
                  </button>

                  <!-- Quick Skip Backward (-10s / custom) -->
                  <button (click)="skipTime(-skipStep())" class="p-2 text-slate-300 hover:text-teal-300 hover:bg-white/10 rounded-xl transition flex items-center gap-0.5 relative group" [title]="'تأخير ' + skipStep() + ' ثوانٍ (← أو J)'">
                    <lucide-icon [img]="RotateCcw" class="size-4.5"></lucide-icon>
                    <span class="text-[10px] font-bold font-mono">{{ skipStep() }}</span>
                  </button>

                  <!-- Main Play/Pause Button -->
                  <button (click)="togglePlay()" class="p-3 bg-gradient-to-tr from-indigo-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 text-white rounded-2xl shadow-xl transition transform active:scale-95" [title]="isPlaying() ? 'إيقاف مؤقت (Space / K)' : 'تشغيل (Space / K)'">
                    <lucide-icon [img]="isPlaying() ? Pause : Play" class="size-5" [class.fill-white]="isPlaying()"></lucide-icon>
                  </button>

                  <!-- Quick Skip Forward (+10s / custom) -->
                  <button (click)="skipTime(skipStep())" class="p-2 text-slate-300 hover:text-teal-300 hover:bg-white/10 rounded-xl transition flex items-center gap-0.5 relative group" [title]="'تقديم ' + skipStep() + ' ثوانٍ (→ أو L)'">
                    <lucide-icon [img]="RotateCw" class="size-4.5"></lucide-icon>
                    <span class="text-[10px] font-bold font-mono">{{ skipStep() }}</span>
                  </button>

                  <!-- Next Video -->
                  <button (click)="playNext()" class="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition" title="الفيديو التالي (N)">
                    <lucide-icon [img]="SkipForward" class="size-5"></lucide-icon>
                  </button>

                  <!-- Quick Jump History Navigation in Player Bar -->
                  <div class="flex items-center gap-0.5 bg-white/5 px-1.5 py-1 rounded-xl border border-white/10 mr-1" title="ذاكرة الانتقالات السريعة (Alt + ← / →)">
                    <button (click)="jumpBack()" 
                            [disabled]="!canJumpBack()" 
                            [class.opacity-30]="!canJumpBack()"
                            [class.cursor-not-allowed]="!canJumpBack()"
                            class="p-1 text-slate-300 hover:text-teal-300 hover:bg-white/10 rounded-lg transition" 
                            title="الرجوع للّحظة السابقة (Alt + ←)">
                      <lucide-icon [img]="Undo2" class="size-4"></lucide-icon>
                    </button>
                    
                    <button (click)="showJumpHistoryModal.set(true)" 
                            class="px-1.5 py-0.5 text-[10px] font-mono font-bold text-teal-300 hover:bg-teal-500/20 rounded transition flex items-center gap-1"
                            title="فتح سجل وذاكرة الانتقالات">
                      <lucide-icon [img]="History" class="size-3"></lucide-icon>
                      <span>{{ jumpHistory().length > 0 ? (jumpHistoryIndex() + 1) + '/' + jumpHistory().length : '0' }}</span>
                    </button>

                    <button (click)="jumpForward()" 
                            [disabled]="!canJumpForward()" 
                            [class.opacity-30]="!canJumpForward()"
                            [class.cursor-not-allowed]="!canJumpForward()"
                            class="p-1 text-slate-300 hover:text-teal-300 hover:bg-white/10 rounded-lg transition" 
                            title="التقدم للّحظة التالية (Alt + →)">
                      <lucide-icon [img]="Redo2" class="size-4"></lucide-icon>
                    </button>
                  </div>

                  <!-- Volume Controls -->
                  <div class="flex items-center gap-1.5 mr-2">
                    <button (click)="toggleMute()" class="p-2 text-slate-300 hover:text-white rounded-xl" title="كتم/تشغيل الصوت (M)">
                      <lucide-icon [img]="isMuted() || volume() === 0 ? VolumeX : Volume2" class="size-5"></lucide-icon>
                    </button>
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.05" 
                      [value]="isMuted() ? 0 : volume()" 
                      (input)="setVolume($event)" 
                      class="w-16 sm:w-20 h-1.5 bg-white/20 rounded-lg accent-teal-400 cursor-pointer" />
                  </div>
                </div>

                <!-- Right Side Control Options -->
                <div class="flex items-center gap-1.5 sm:gap-2">
                  
                  <!-- Skip Step Selector (5s, 10s, 15s, 30s) -->
                  <div class="relative">
                    <button 
                      (click)="toggleSettingsMenu()" 
                      class="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-mono font-bold text-teal-300 flex items-center gap-1"
                      title="تحديد مدة القفز/التقديم">
                      <lucide-icon [img]="Sliders" class="size-3"></lucide-icon>
                      <span>±{{ skipStep() }}s</span>
                    </button>

                    <!-- Settings Dropdown -->
                    <div *ngIf="showSettingsMenu()" class="absolute bottom-full mb-2 left-0 bg-slate-900 border border-white/15 rounded-2xl p-3 shadow-2xl flex flex-col gap-2.5 z-30 min-w-44">
                      <div>
                        <p class="text-[10px] text-slate-400 font-bold mb-1.5">مدة التقديم والتأخير:</p>
                        <div class="grid grid-cols-4 gap-1">
                          @for (step of [5, 10, 15, 30]; track step) {
                            <button 
                              (click)="setSkipStep(step)" 
                              [class.bg-teal-600]="skipStep() === step"
                              [class.text-white]="skipStep() === step"
                              class="py-1 text-xs rounded-lg font-mono bg-white/5 hover:bg-white/15 text-center font-bold">
                              {{ step }}s
                            </button>
                          }
                        </div>
                      </div>

                      <div class="border-t border-white/10 pt-2">
                        <p class="text-[10px] text-slate-400 font-bold mb-1.5">تناسق الشاشة:</p>
                        <div class="flex gap-1">
                          <button (click)="setVideoFit('contain')" [class.bg-teal-600]="videoFit() === 'contain'" class="flex-1 py-1 text-[11px] rounded-lg bg-white/5 hover:bg-white/15 text-center">أصلي</button>
                          <button (click)="setVideoFit('cover')" [class.bg-teal-600]="videoFit() === 'cover'" class="flex-1 py-1 text-[11px] rounded-lg bg-white/5 hover:bg-white/15 text-center">ملء</button>
                          <button (click)="setVideoFit('fill')" [class.bg-teal-600]="videoFit() === 'fill'" class="flex-1 py-1 text-[11px] rounded-lg bg-white/5 hover:bg-white/15 text-center">تمديد</button>
                        </div>
                      </div>

                      <div class="border-t border-white/10 pt-2 flex items-center justify-between">
                        <span class="text-[11px] text-slate-300">تشغيل تلقائي للتالي:</span>
                        <input type="checkbox" [checked]="autoplayNext()" (change)="autoplayNext.set(!autoplayNext())" class="accent-teal-500 size-4 cursor-pointer" />
                      </div>

                      <div class="border-t border-white/10 pt-2 space-y-1.5">
                        <p class="text-[10px] text-slate-400 font-bold">طرق التحكم في الصوت:</p>
                        <div class="flex items-center justify-between">
                          <span class="text-[11px] text-slate-300">عجلة الماوس (Wheel):</span>
                          <input type="checkbox" [checked]="wheelVolumeEnabled()" (change)="toggleWheelVolume()" class="accent-teal-500 size-4 cursor-pointer" />
                        </div>
                        <div class="flex items-center justify-between">
                          <span class="text-[11px] text-slate-300">أزرار الكيبورد (↑ / ↓):</span>
                          <input type="checkbox" [checked]="keyboardVolumeEnabled()" (change)="toggleKeyboardVolume()" class="accent-teal-500 size-4 cursor-pointer" />
                        </div>
                      </div>

                      <div class="border-t border-white/10 pt-2 space-y-1.5">
                        <p class="text-[10px] text-slate-400 font-bold">تخصيص الواجهة والعرض:</p>
                        <div class="flex items-center justify-between">
                          <span class="text-[11px] text-slate-300">أيقونة التشغيل بالمنتصف:</span>
                          <input type="checkbox" [checked]="showCenterPlayIcon()" (change)="toggleCenterPlayIcon()" class="accent-teal-500 size-4 cursor-pointer" />
                        </div>
                        <div class="flex items-center justify-between">
                          <span class="text-[11px] text-slate-300">إبقاء شريط التحكم ظاهراً:</span>
                          <input type="checkbox" [checked]="keepControlsVisible()" (change)="toggleKeepControls()" class="accent-teal-500 size-4 cursor-pointer" />
                        </div>
                        <div class="flex items-center justify-between">
                          <span class="text-[11px] text-slate-300">زر استخراج النص من الشاشة (OCR):</span>
                          <input type="checkbox" [checked]="showQuickOcrButton()" (change)="toggleQuickOcrButton()" class="accent-teal-500 size-4 cursor-pointer" />
                        </div>
                      </div>

                      <div class="border-t border-white/10 pt-2 space-y-1.5">
                        <p class="text-[10px] text-slate-400 font-bold">تكرار مقطع (A-B Loop):</p>
                        <div class="flex items-center gap-1">
                          <button (click)="setPointA()" class="flex-1 py-1 text-[10px] rounded-lg bg-teal-600/30 hover:bg-teal-600 text-teal-300 hover:text-white font-mono font-bold" title="تحديد النقطة أ">A: {{ loopAB().a !== null ? formatTime(loopAB().a!) : '--' }}</button>
                          <button (click)="setPointB()" class="flex-1 py-1 text-[10px] rounded-lg bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white font-mono font-bold" title="تحديد النقطة ب">B: {{ loopAB().b !== null ? formatTime(loopAB().b!) : '--' }}</button>
                          <button (click)="toggleABLoop()" [class.bg-teal-600]="loopAB().active" class="px-2 py-1 text-[10px] rounded-lg bg-white/5 hover:bg-white/15 text-center font-bold" title="تشغيل/إيقاف التكرار">🔁</button>
                          <button (click)="clearABLoop()" class="px-2 py-1 text-[10px] rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-300 text-center" title="مسح">🗑️</button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Playback Speed Selector -->
                  <div class="relative">
                    <button (click)="toggleSpeedMenu()" class="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-mono font-bold text-teal-300">
                      {{ playbackRate() }}x
                    </button>
                    <div *ngIf="showSpeedMenu()" class="absolute bottom-full mb-2 left-0 bg-slate-900 border border-white/15 rounded-2xl p-2 shadow-2xl flex flex-col gap-1 z-30 min-w-24">
                      @for (rate of speedRates; track rate) {
                        <button (click)="setSpeed(rate)" [class.bg-indigo-600]="playbackRate() === rate" class="px-3 py-1 text-xs rounded-lg font-mono hover:bg-white/10 text-right">
                          {{ rate }}x
                        </button>
                      }
                    </div>
                  </div>

                  <!-- Loop Toggle -->
                  <button (click)="isLooping.set(!isLooping())" [class.text-indigo-400]="isLooping()" [class.bg-indigo-500/20]="isLooping()" class="p-2 text-slate-300 hover:text-white rounded-xl transition" title="تكرار التشغيل">
                    <lucide-icon [img]="Repeat" class="size-4.5"></lucide-icon>
                  </button>

                  <!-- Fullscreen -->
                  <button (click)="toggleFullscreen()" class="p-2 text-slate-300 hover:text-white rounded-xl transition" title="ملء الشاشة (F)">
                    <lucide-icon [img]="isFullscreen() ? Minimize2 : Maximize2" class="size-5"></lucide-icon>
                  </button>
                </div>

              </div>

            </div>

          </div>

          <!-- Empty Drag-and-Drop Area -->
          <ng-template #dropzoneTmpl>
            <div 
              (dragover)="onDragOver($event)" 
              (dragleave)="onDragLeave($event)" 
              (drop)="onDrop($event)"
              class="w-full max-w-2xl m-6 p-8 sm:p-12 border-2 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center text-center transition-all duration-300"
              [ngClass]="isDragging() ? 'border-teal-400 bg-teal-500/10 scale-[1.02]' : 'border-white/10 bg-slate-900/50 hover:border-indigo-500/30'">
              
              <!-- Animated Loading Spinner when scanning directories -->
              <div *ngIf="isScanning() || isLoadingStored()" class="flex flex-col items-center py-6">
                <lucide-icon [img]="Loader2" class="size-12 text-teal-400 animate-spin mb-4"></lucide-icon>
                <p class="text-sm font-bold text-white">
                  {{ isLoadingStored() ? 'جاري استرجاع الفيديوهات من الذاكرة الدائمة...' : 'جاري فحص المجلد وحفظ الفيديوهات محلياً...' }}
                </p>
                <p class="text-xs text-slate-400 mt-1">يتم الترتيب التسلسلي وحفظ المقاطع تلقائياً</p>
              </div>

              <div *ngIf="!isScanning() && !isLoadingStored()" class="flex flex-col items-center">
                <div class="size-20 rounded-3xl bg-gradient-to-tr from-teal-500/20 to-indigo-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 mb-5 shadow-xl">
                  <lucide-icon [img]="FolderPlus" class="size-10"></lucide-icon>
                </div>

                <h3 class="text-xl sm:text-2xl font-black text-white mb-2">اسحب وأفلت مجلداً كاملاً أو فيديوهات هنا</h3>
                <p class="text-xs text-slate-400 max-w-md mb-8 leading-relaxed">
                  يمكنك رفع مجلد كامل (Folder) مع حفظه دائماً على جهازك، ولن تختفي فيديوهاتك عند تحديث الصفحة أو إغلاق المتصفح.
                </p>

                <!-- Dual Action Buttons -->
                <div class="flex flex-wrap items-center justify-center gap-3 w-full max-w-md">
                  
                   <!-- Option 1: Select Full Folder -->
                   <label (click)="onFolderLabelClick($event)" class="flex-1 min-w-[180px] px-5 py-3.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold rounded-2xl text-xs shadow-xl shadow-teal-600/25 transition cursor-pointer flex items-center justify-center gap-2 group">
                    <lucide-icon [img]="FolderPlus" class="size-5 group-hover:scale-110 transition-transform"></lucide-icon>
                    <span>📁 فتح مجلد كامل (Folder)</span>
                    <input type="file" webkitdirectory directory multiple (change)="onFolderSelected($event)" class="hidden" />
                  </label>

                  <!-- Option 2: Select Files -->
                  <label class="flex-1 min-w-[180px] px-5 py-3.5 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border border-white/10 hover:border-white/20 font-bold rounded-2xl text-xs shadow-lg transition cursor-pointer flex items-center justify-center gap-2 group">
                    <lucide-icon [img]="Film" class="size-5 text-indigo-400 group-hover:scale-110 transition-transform"></lucide-icon>
                    <span>🎬 اختيار ملفات (Files)</span>
                    <input type="file" multiple accept="video/*,audio/*,.mkv,.avi,.wmv,.flv,.m4v,.ts,.mp3,.wav,.aac,.ogg,.flac,.m4a" (change)="onFilesSelected($event)" class="hidden" />
                  </label>
                </div>

                <!-- Formats badges -->
                <div class="flex flex-wrap items-center justify-center gap-2 mt-8 opacity-60">
                  <span class="text-[10px] text-slate-400 font-mono">الصيغ المدعومة:</span>
                  <span class="text-[10px] px-2 py-0.5 rounded-md bg-white/5 font-mono text-slate-300">MP4</span>
                  <span class="text-[10px] px-2 py-0.5 rounded-md bg-white/5 font-mono text-slate-300">MKV</span>
                  <span class="text-[10px] px-2 py-0.5 rounded-md bg-white/5 font-mono text-slate-300">WEBM</span>
                  <span class="text-[10px] px-2 py-0.5 rounded-md bg-white/5 font-mono text-slate-300">MOV</span>
                  <span class="text-[10px] px-2 py-0.5 rounded-md bg-white/5 font-mono text-slate-300">TS</span>
                  <span class="text-[10px] px-2 py-0.5 rounded-md bg-white/5 font-mono text-slate-300">MP3 / WAV</span>
                </div>
              </div>

            </div>
          </ng-template>

        </main>

        <!-- Right Side: Sidebar Tabs (Playlist, Bookmarks, Storage) -->
        <aside [class.hidden]="isTheaterMode() || isFloatingMini()" class="w-full lg:w-96 bg-slate-900 border-r border-white/10 flex flex-col shrink-0 h-80 lg:h-full overflow-hidden">
          
          <!-- Sidebar Navigation Tabs -->
          <div class="flex items-center bg-slate-950 border-b border-white/10 px-1 py-1.5 gap-0.5 shrink-0">
            <button (click)="onSelectTab('playlist')" [class.bg-teal-600]="sidebarTab() === 'playlist'" [class.text-white]="sidebarTab() === 'playlist'" class="flex-1 py-1 px-1 rounded-lg text-[10px] font-bold text-slate-300 hover:bg-white/5 transition flex items-center justify-center gap-0.5">
              <lucide-icon [img]="ListMusic" class="size-3"></lucide-icon>
              <span>القائمة</span>
            </button>
            <button (click)="onSelectTab('bookmarks')" [class.bg-indigo-600]="sidebarTab() === 'bookmarks'" [class.text-white]="sidebarTab() === 'bookmarks'" class="flex-1 py-1 px-1 rounded-lg text-[10px] font-bold text-slate-300 hover:bg-white/5 transition flex items-center justify-center gap-0.5" title="الملاحظات">
              <lucide-icon [img]="Clock" class="size-3"></lucide-icon>
              <span>ملاحظات</span>
            </button>
            <button (click)="onSelectTab('storage')" [class.bg-emerald-600]="sidebarTab() === 'storage'" [class.text-white]="sidebarTab() === 'storage'" class="flex-1 py-1 px-1 rounded-lg text-[10px] font-bold text-slate-300 hover:bg-white/5 transition flex items-center justify-center gap-0.5" title="التخزين">
              <lucide-icon [img]="HardDrive" class="size-3"></lucide-icon>
              <span>التخزين</span>
            </button>
            <button (click)="onSelectTab('recycle')" [class.bg-amber-600]="sidebarTab() === 'recycle'" [class.text-white]="sidebarTab() === 'recycle'" class="flex-1 py-1 px-1 rounded-lg text-[10px] font-bold text-slate-300 hover:bg-white/5 transition flex items-center justify-center gap-0.5" title="سلة المحذوفات والسجل">
              <lucide-icon [img]="Trash2" class="size-3"></lucide-icon>
              <span>السجل ({{ recycleBin().length }})</span>
            </button>
            <button (click)="exportPlaylistJson()" class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition" title="تصدير القائمة والتقدم JSON">
              <lucide-icon [img]="Upload" class="size-3.5"></lucide-icon>
            </button>
          </div>

          <!-- TAB 1: PLAYLIST -->
          <ng-container *ngIf="sidebarTab() === 'playlist'">
            <app-playlist-tab
              [playlist]="playlist()"
              [displayedPlaylist]="displayedPlaylist()"
              [activeItemId]="activeItemId()"
              [isPlaying]="isPlaying()"
              [sortOrder]="sortOrder()"
              [(searchQuery)]="searchQuery"
              [totalPlaylistSize]="totalPlaylistSize()"
              [notesCountByVideoId]="notesCountByVideoId()"
              (selectItem)="onPlaylistItemClick($event)"
              (removeItem)="removeItem($event)"
              (sortChange)="toggleSortOrder()"
              (addFolder)="onFolderSelected($event)"
              (addFiles)="onFilesSelected($event)">
            </app-playlist-tab>
          </ng-container>

          <!-- TAB 2: BOOKMARKS & NOTES -->
          <ng-container *ngIf="sidebarTab() === 'bookmarks'">
            <div class="flex-1 flex flex-col overflow-hidden p-3 space-y-3">
              <div class="p-3 rounded-2xl bg-black/40 border border-white/10 flex flex-col gap-2 shrink-0">
                <p class="text-xs font-bold text-teal-300 flex items-center gap-1.5">
                  <span *ngIf="activeItem()">🔖 إضافة ملاحظة عند الدقيقة الحالية</span>
                  <span *ngIf="!activeItem()">📝 إضافة ملاحظة عامة</span>
                  <span *ngIf="activeItem()" class="text-[10px] font-mono text-slate-400">({{ formatTime(currentTime()) }})</span>
                </p>
                <div class="flex gap-1.5">
                  <input type="text" [(ngModel)]="newBookmarkNote" (keydown.enter)="addBookmark()" [placeholder]="activeItem() ? 'اكتب ملاحظة (مثل: نقطة مهمة)...' : 'اكتب ملاحظة عامة أو تذكير...'" class="flex-1 bg-black/60 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500" />
                  <button (click)="addBookmark()" class="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition">إضافة</button>
                </div>
                <!-- Quick OCR background button in notes tab -->
                @if (showQuickOcrButton() && activeItem()) {
                  <button (click)="quickExtractOcr()" 
                          [disabled]="isQuickExtractingOcr()"
                          class="w-full py-1.5 px-3 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-300 text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-98"
                          title="استخراج النص من الشاشة كملاحظة دون إيقاف الفيديو (Alt + O)">
                    @if (isQuickExtractingOcr()) {
                      <lucide-icon [img]="Loader2" class="size-3.5 animate-spin text-cyan-400"></lucide-icon>
                      <span>جارٍ استخراج النص في الخلفية...</span>
                    } @else {
                      <lucide-icon [img]="ScanText" class="size-3.5 text-cyan-400"></lucide-icon>
                      <span>⚡ استخراج النص من اللحظة الحالية دون إيقاف</span>
                    }
                  </button>
                }
              </div>

              <!-- Jump History Navigation Toolbar in Notes Tab -->
              <div class="px-3 py-2 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between gap-2 shrink-0">
                <div class="flex items-center gap-1.5">
                  <button (click)="jumpBack()" 
                          [disabled]="!canJumpBack()" 
                          [class.opacity-30]="!canJumpBack()"
                          [class.cursor-not-allowed]="!canJumpBack()"
                          class="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/15 text-white text-xs font-bold transition flex items-center gap-1 active:scale-95"
                          title="الرجوع للّحظة السابقة (Alt + ←)">
                    <lucide-icon [img]="ChevronRight" class="size-3.5 text-teal-400"></lucide-icon>
                    <span>السابق</span>
                  </button>

                  <button (click)="jumpForward()" 
                          [disabled]="!canJumpForward()" 
                          [class.opacity-30]="!canJumpForward()"
                          [class.cursor-not-allowed]="!canJumpForward()"
                          class="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/15 text-white text-xs font-bold transition flex items-center gap-1 active:scale-95"
                          title="التقدم للّحظة التالية (Alt + →)">
                    <span>التالي</span>
                    <lucide-icon [img]="ChevronLeft" class="size-3.5 text-teal-400"></lucide-icon>
                  </button>
                </div>

                <button (click)="showJumpHistoryModal.set(true)" 
                        class="px-2.5 py-1 rounded-xl bg-teal-500/15 hover:bg-teal-500/30 text-teal-300 text-xs font-bold transition flex items-center gap-1.5 border border-teal-500/20 active:scale-95"
                        title="دخول ذاكرة الانتقالات المباشرة (حتى 20 نقطة)">
                  <lucide-icon [img]="History" class="size-3.5 text-teal-400"></lucide-icon>
                  <span>الذاكرة ({{ jumpHistory().length }}/20)</span>
                </button>
              </div>

              <!-- Notes Tab Component (All Notes & Current Video Notes) -->
              <app-notes-tab
                [allNotes]="allNotesList()"
                [currentVideoId]="activeItem()?.id || null"
                (editNote)="onEditNote($event)"
                (deleteNote)="onDeleteNote($event)"
                (togglePin)="onTogglePin($event)"
                (noteClick)="jumpToNote($event)">
              </app-notes-tab>
            </div>
          </ng-container>

          <!-- TAB 3: STORAGE MANAGER -->
          <ng-container *ngIf="sidebarTab() === 'storage'">
            <div class="flex-1 flex flex-col overflow-hidden p-3 space-y-3">
              <div class="p-3.5 rounded-2xl bg-black/40 border border-white/10 flex flex-col gap-2">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <lucide-icon [img]="HardDrive" class="size-4 text-emerald-400"></lucide-icon>
                    <span>حجم فيديوهات القائمة الحالية</span>
                  </span>
                  <span class="text-[11px] font-mono font-bold text-teal-300">{{ formatFileSize(totalPlaylistSize()) }}</span>
                </div>
                <div class="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>عدد الفيديوهات: {{ playlist().length }}</span>
                  <span>التخزين المحلي النشط ✓</span>
                </div>
              </div>

              <p class="text-[11px] text-slate-400 font-bold px-1">إدارة الفيديوهات وحذف ملف محدد لتفريغ المساحة:</p>
              <div class="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                @if (playlist().length > 0) {
                  @for (item of playlist(); track item.id) {
                    <div class="p-2.5 rounded-xl bg-black/30 border border-white/5 flex items-center justify-between gap-2">
                      <div class="min-w-0 flex-1">
                        <p class="text-xs font-bold text-slate-200 truncate" [title]="item.name">{{ item.name }}</p>
                        <p class="text-[10px] text-slate-500 font-mono">{{ formatFileSize(item.size) }}</p>
                      </div>
                      <button (click)="removeItem(item.id)" class="px-2.5 py-1 bg-red-500/20 hover:bg-red-500/40 text-red-300 rounded-lg text-[10px] font-bold transition flex items-center gap-1 shrink-0" title="تفريغ هذا الملف فقط">
                        <lucide-icon [img]="Trash2" class="size-3"></lucide-icon>
                        <span>حذف</span>
                      </button>
                    </div>
                  }
                } @else {
                  <div class="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
                    <lucide-icon [img]="HardDrive" class="size-8 mb-2 opacity-30"></lucide-icon>
                    <p class="text-xs font-bold text-slate-400">لا توجد فيديوهات مضافة حالياً</p>
                    <p class="text-[10px] text-slate-500 mt-1">أضف مجلداً أو ملفات لعرض حجمها هنا.</p>
                  </div>
                }
              </div>
            </div>
          </ng-container>

          <!-- TAB 4: RECYCLE BIN & HISTORY ARCHIVE -->
          <ng-container *ngIf="sidebarTab() === 'recycle'">
            <div class="flex-1 flex flex-col overflow-hidden p-3 space-y-3">
              <div class="flex items-center justify-between p-3 rounded-2xl bg-black/40 border border-white/10">
                <div>
                  <p class="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>🗑️ سلة المحذوفات وسجل المشاهدة</span>
                  </p>
                  <p class="text-[10px] text-slate-400 mt-0.5">الاحتفاظ بمعلومات المشاهدة تلقائياً لمدة 30 يوماً</p>
                </div>
                <button *ngIf="recycleBin().length > 0" (click)="clearRecycleBin()" class="px-2.5 py-1 bg-red-500/20 hover:bg-red-500/40 text-red-300 rounded-lg text-[10px] font-bold transition">
                  تفريغ السجل
                </button>
              </div>

              <!-- Recycle Bin Items List -->
              <div class="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                @if (recycleBin().length > 0) {
                  @for (item of recycleBin(); track item.id) {
                    <div class="p-2.5 rounded-2xl bg-black/30 border border-white/5 flex flex-col gap-1.5 group">
                      <div class="flex items-center justify-between gap-2">
                        <p class="text-xs font-bold text-slate-200 truncate" [title]="item.name">{{ item.name }}</p>
                        <button (click)="removeRecycleBinItem(item.id)" class="text-slate-500 hover:text-red-400 p-1 transition" title="حذف نهائي من السجل">
                          <lucide-icon [img]="Trash2" class="size-3"></lucide-icon>
                        </button>
                      </div>

                      <div class="flex items-center justify-between text-[10px] font-mono">
                        <span class="px-2 py-0.5 rounded font-bold"
                              [ngClass]="{
                                'bg-emerald-500/20 text-emerald-300': item.watchStatus === 'watched',
                                'bg-amber-500/20 text-amber-300': item.watchStatus === 'partial',
                                'bg-slate-500/20 text-slate-400': item.watchStatus === 'unwatched'
                              }">
                          {{ item.watchStatus === 'watched' ? '✅ مشاهدة بالكامل' : (item.watchStatus === 'partial' ? '⏳ مشاهدة جزئية' : '⭕ لم تبدأ') }}
                        </span>
                        <span class="text-slate-500">حُذف منذ {{ formatDaysAgo(item.deletedAt) }}</span>
                      </div>
                    </div>
                  }
                } @else {
                  <div class="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
                    <lucide-icon [img]="Trash2" class="size-8 mb-2 opacity-30"></lucide-icon>
                    <p class="text-xs font-bold text-slate-400">سلة المحذوفات فارغة</p>
                    <p class="text-[10px] text-slate-500 mt-1">الفيديوهات المحذوفة تظهر هنا مع حفظ حالة المشاهدة لـ 30 يوماً.</p>
                  </div>
                }
              </div>
            </div>
          </ng-container>

        </aside>

      </div>

      <!-- Floating Toast Notification -->
      <div *ngIf="toast().visible" class="fixed bottom-6 right-6 z-50 transition-all transform animate-slide-in">
        <div class="px-4 py-3 rounded-2xl bg-slate-900/95 border border-teal-500/40 text-white shadow-2xl backdrop-blur-md flex items-center gap-3">
          <lucide-icon [img]="CheckCircle2" class="size-5 text-teal-400 shrink-0"></lucide-icon>
          <span class="text-xs font-bold">{{ toast().message }}</span>
        </div>
      </div>

      <!-- Clear Playlist Confirmation Modal -->
      <div *ngIf="showClearConfirm()" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-slate-900 border border-white/15 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center">
          <div class="size-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-4">
            <lucide-icon [img]="Trash2" class="size-6"></lucide-icon>
          </div>
          <h3 class="text-base font-bold text-white mb-2">تفريغ قائمة التشغيل والذاكرة؟</h3>
          <p class="text-xs text-slate-400 mb-6">سيتم إزالة جميع الفيديوهات المحفوظة محلياً من المتصفح.</p>
          <div class="flex gap-3">
            <button (click)="confirmClearPlaylist()" class="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition">
              نعم، تفريغ الكل
            </button>
            <button (click)="showClearConfirm.set(false)" class="flex-1 py-2.5 bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-bold rounded-xl transition">
              إلغاء
            </button>
          </div>
        </div>
      </div>

      <!-- Keyboard Shortcuts Modal -->
      <div *ngIf="showShortcutsModal()" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" (click)="showShortcutsModal.set(false)">
        <div class="bg-slate-900 border border-white/15 rounded-3xl p-6 max-w-lg w-full shadow-2xl flex flex-col max-h-[85vh]" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between mb-4 border-b border-white/10 pb-3 shrink-0">
            <div class="flex items-center gap-2">
              <lucide-icon [img]="HelpCircle" class="size-5 text-teal-400"></lucide-icon>
              <h3 class="text-sm font-black text-white">اختصارات لوحة المفاتيح والإيماءات</h3>
            </div>
            <button (click)="showShortcutsModal.set(false)" class="text-slate-400 hover:text-white">
              <lucide-icon [img]="X" class="size-4"></lucide-icon>
            </button>
          </div>

          <div class="space-y-2 text-xs flex-1 overflow-y-auto custom-scrollbar pr-1">
            <p class="text-[11px] text-teal-300 mb-2">اضغط على زر "تغيير" بجانب أي اختصار ثم اضغط الزر المطلوب في لوحة المفاتيح لتخصيصه:</p>
            @for (key of Object.keys(shortcutLabels); track key) {
              <div class="flex justify-between items-center p-2.5 rounded-xl bg-white/5">
                <span class="text-slate-300 font-bold">{{ shortcutLabels[key] }}</span>
                <div class="flex items-center gap-2">
                  <kbd class="px-2.5 py-1 bg-black/50 border border-white/10 rounded-md font-mono text-teal-300 uppercase">
                    {{ editingAction === key ? 'اضغط الزر الجديد...' : (customShortcuts()[key] || []).join(' / ') }}
                  </kbd>
                  <button 
                    (click)="startEditingShortcut(key)" 
                    class="px-2.5 py-1 bg-teal-600/80 hover:bg-teal-600 text-white rounded-lg text-[10px] font-bold transition">
                    {{ editingAction === key ? 'جاري...' : 'تغيير' }}
                  </button>
                </div>
              </div>
            }
          </div>

          <div class="pt-3 mt-3 border-t border-white/10 shrink-0">
            <button (click)="resetShortcuts()" class="w-full py-2 bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-bold rounded-xl transition">
              استعادة الاختصارات الافتراضية ↺
            </button>
          </div>
        </div>
      </div>

      <!-- Jump Navigation History Modal -->
      <div *ngIf="showJumpHistoryModal()" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" (click)="showJumpHistoryModal.set(false)">
        <div class="bg-slate-900 border border-white/15 rounded-3xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden" (click)="$event.stopPropagation()">
          
          <!-- Modal Header -->
          <div class="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-slate-950/60">
            <div class="flex items-center gap-3">
              <div class="size-10 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
                <lucide-icon [img]="History" class="size-5"></lucide-icon>
              </div>
              <div>
                <h3 class="text-sm font-black text-white flex items-center gap-2">
                  <span>ذاكرة وتاريخ الانتقالات</span>
                  <span class="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-mono">{{ jumpHistory().length }}/20 نقطة</span>
                </h3>
                <p class="text-[11px] text-slate-400">انقر على أي نقطة للانتقال الفوري إليها بالفيديو والزمن المحددين</p>
              </div>
            </div>

            <div class="flex items-center gap-1.5">
              <button *ngIf="jumpHistory().length > 0" (click)="clearJumpHistory()" class="px-2.5 py-1 text-[11px] bg-red-500/20 hover:bg-red-500/40 text-red-300 rounded-xl font-bold transition flex items-center gap-1" title="مسح كل السجل">
                <lucide-icon [img]="Trash2" class="size-3"></lucide-icon>
                <span>تفريغ</span>
              </button>
              <button (click)="showJumpHistoryModal.set(false)" class="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition">
                <lucide-icon [img]="X" class="size-4.5"></lucide-icon>
              </button>
            </div>
          </div>

          <!-- Modal Body (Jump Points List) -->
          <div class="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
            @if (jumpHistory().length > 0) {
              <div class="space-y-1.5">
                @for (point of jumpHistory(); track point.id; let idx = $index) {
                  <div (click)="jumpToHistoryPoint(idx)" 
                       class="p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 group"
                       [ngClass]="idx === jumpHistoryIndex() ? 'bg-teal-950/40 border-teal-500/60 shadow-lg shadow-teal-950/50' : 'bg-black/30 border-white/5 hover:border-white/20 hover:bg-white/[0.04]'">
                    
                    <div class="flex items-center gap-3 min-w-0 flex-1">
                      <span class="size-6 rounded-lg font-mono text-[10px] font-bold flex items-center justify-center shrink-0"
                            [ngClass]="idx === jumpHistoryIndex() ? 'bg-teal-500 text-slate-950' : 'bg-white/10 text-slate-400'">
                        {{ idx + 1 }}
                      </span>

                      <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2">
                          <span class="text-xs font-bold text-white truncate" [title]="point.videoName">{{ point.videoName }}</span>
                          <span *ngIf="idx === jumpHistoryIndex()" class="text-[9px] px-1.5 py-0.5 rounded bg-teal-500/30 text-teal-300 font-bold shrink-0">🎯 اللحظة الحالية</span>
                          <span *ngIf="point.videoId === activeItem()?.id && idx !== jumpHistoryIndex()" class="text-[9px] px-1.5 py-0.5 rounded bg-slate-500/20 text-slate-400 font-bold shrink-0">الفيديو الحالي</span>
                        </div>
                        <div class="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                          <span class="text-teal-400 font-mono font-bold">🕒 {{ point.formattedTime }}</span>
                          <span>•</span>
                          <span class="truncate text-slate-300">{{ point.label }}</span>
                          <span class="text-slate-500 font-mono">({{ formatRelativeTime(point.timestamp) }})</span>
                        </div>
                      </div>
                    </div>

                    <div class="flex items-center gap-2 shrink-0">
                      <button (click)="removeJumpPoint(point.id, $event)" class="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-red-400 transition rounded-lg hover:bg-white/5" title="حذف هذه النقطة">
                        <lucide-icon [img]="Trash2" class="size-3.5"></lucide-icon>
                      </button>
                      <span class="text-[11px] font-bold text-teal-400 group-hover:translate-x-[-2px] transition flex items-center gap-0.5">
                        <span>انتقال</span>
                        <lucide-icon [img]="ChevronLeft" class="size-3"></lucide-icon>
                      </span>
                    </div>

                  </div>
                }
              </div>
            } @else {
              <div class="py-12 text-center text-slate-500 flex flex-col items-center justify-center">
                <lucide-icon [img]="History" class="size-12 mb-3 opacity-30 text-teal-400"></lucide-icon>
                <p class="text-xs font-bold text-slate-300">لا توجد نقاط انتقال في الذاكرة بعد</p>
                <p class="text-[11px] text-slate-500 max-w-xs mt-1">عند النقر على أي ملاحظة أو علامة زمنية أو التنقل بين الفيديوهات، سيتم حفظ موقعك تلقائياً هنا لتتمكن من العودة إليه بضغطة زر واحدة!</p>
              </div>
            }
          </div>

          <!-- Modal Footer -->
          <div class="p-3.5 border-t border-white/10 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
            <div class="flex items-center gap-2">
              <span class="font-mono text-[11px] bg-white/10 px-1.5 py-0.5 rounded text-slate-300">Alt + ←</span>
              <span>السابق</span>
              <span class="font-mono text-[11px] bg-white/10 px-1.5 py-0.5 rounded text-slate-300">Alt + →</span>
              <span>التالي</span>
            </div>
            <button (click)="showJumpHistoryModal.set(false)" class="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition">
              إغلاق
            </button>
          </div>

        </div>
      </div>

      <!-- Snapshot Editor & OCR Modal -->
      <div *ngIf="showSnapshotModal()" class="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto" (click)="showSnapshotModal.set(false)">
        <div class="bg-slate-900 border border-white/20 rounded-[2.5rem] p-6 max-w-4xl w-full shadow-2xl flex flex-col max-h-[92vh]" (click)="$event.stopPropagation()">
          
          <!-- Modal Header -->
          <div class="flex items-center justify-between mb-4 border-b border-white/10 pb-3 shrink-0">
            <div class="flex items-center gap-2">
              <lucide-icon [img]="Camera" class="size-5 text-emerald-400"></lucide-icon>
              <h3 class="text-base font-black text-white">معاينة وتعديل الصورة الملتقطة واستخراج النص (OCR)</h3>
            </div>
            <button (click)="showSnapshotModal.set(false)" class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10">
              <lucide-icon [img]="X" class="size-5"></lucide-icon>
            </button>
          </div>

          <!-- Modal Body Grid -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 overflow-y-auto custom-scrollbar pr-1">
            
            <!-- Left: Image Preview -->
            <div class="flex flex-col gap-3">
              <div class="relative bg-black rounded-2xl border border-white/10 overflow-hidden flex items-center justify-center p-2 min-h-[280px]">
                <img [src]="snapshotDataUrl()" alt="Snapshot" class="max-h-[350px] w-auto object-contain rounded-xl shadow-lg transition-transform pointer-events-none" [style.transform]="'rotate(' + snapshotRotations() + 'deg)'" />
              </div>
              
              <!-- Editing Toolbar -->
              <div class="flex items-center justify-center flex-wrap gap-2 pt-2">
                <button (click)="rotateSnapshot()" class="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer" title="تدوير 90 درجة">
                  <span>🔄 تدوير</span>
                </button>
                <button class="px-3 py-2 bg-white/5 opacity-50 text-slate-300 rounded-xl text-xs font-bold transition" title="قريباً">
                  <span>✂️ قص (قريباً)</span>
                </button>
                <button class="px-3 py-2 bg-white/5 opacity-50 text-slate-300 rounded-xl text-xs font-bold transition" title="قريباً">
                  <span>✍️ نص (قريباً)</span>
                </button>
              </div>
            </div>

            <!-- Right: OCR Text Extraction & Copy Panel -->
            <div class="flex flex-col gap-4">
              <div class="flex items-center justify-between">
                <h4 class="text-xs font-bold text-teal-300 flex items-center gap-1.5">
                  <span>📄 النص المستخرج (OCR)</span>
                  <span *ngIf="isExtractingOcr()" class="text-[10px] text-amber-400 animate-pulse">جاري التعرف على الحروف...</span>
                </h4>
              </div>

              <textarea 
                [value]="extractedOcrText()"
                rows="8"
                dir="auto"
                readonly
                class="flex-1 bg-black/50 border border-white/15 rounded-2xl p-4 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500 resize-none font-mono leading-relaxed custom-scrollbar text-left"></textarea>
            </div>
          </div>

          <!-- Modal Footer Actions -->
          <div class="pt-4 mt-4 border-t border-white/10 flex items-center justify-between shrink-0">
            <button (click)="showSnapshotModal.set(false)" class="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer">
              إغلاق
            </button>
            <div class="flex items-center gap-2">
              <button (click)="downloadEditedSnapshot()" class="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white text-xs font-black rounded-xl transition shadow-xl flex items-center gap-2 cursor-pointer">
                <lucide-icon [img]="Camera" class="size-4"></lucide-icon>
                <span>حفظ وتنزيل الصورة 💾</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      <!-- Note Create/Edit Modal -->
      <div *ngIf="showNoteModal()" class="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto" (click)="showNoteModal.set(false)">
        <div class="bg-slate-900 border border-white/20 rounded-[2.5rem] p-6 max-w-lg w-full shadow-2xl flex flex-col max-h-[90vh]" (click)="$event.stopPropagation()">
          
          <!-- Modal Header -->
          <div class="flex items-center justify-between mb-4 border-b border-white/10 pb-3 shrink-0">
            <div class="flex items-center gap-2">
              <lucide-icon [img]="Clock" class="size-5 text-teal-400"></lucide-icon>
              <h3 class="text-base font-black text-white">{{ editingNote() ? 'تعديل الملاحظة' : 'ملاحظة جديدة' }}</h3>
            </div>
            <button (click)="showNoteModal.set(false)" class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10">
              <lucide-icon [img]="X" class="size-5"></lucide-icon>
            </button>
          </div>

          <!-- Modal Body -->
          <div class="flex flex-col gap-4 flex-1 overflow-y-auto custom-scrollbar pr-1">
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-bold text-slate-300">نص الملاحظة</label>
              <textarea 
                [ngModel]="noteFormText()"
                (ngModelChange)="noteFormText.set($event)"
                rows="5"
                dir="auto"
                placeholder="اكتب ملاحظتك هنا..."
                class="bg-black/50 border border-white/15 rounded-2xl p-4 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500 resize-none leading-relaxed custom-scrollbar"></textarea>
            </div>

            <!-- Color Picker -->
            <div class="flex flex-col gap-2">
              <label class="text-xs font-bold text-slate-300">لون النص</label>
              <div class="flex items-center gap-3">
                <button 
                  type="button" 
                  (click)="noteFormColor.set(null)"
                  [class.ring-2]="noteFormColor() === null"
                  class="size-8 rounded-full bg-slate-200 border border-white/20 flex items-center justify-center text-[10px] font-bold text-slate-900 ring-teal-400 ring-offset-2 ring-offset-slate-900 transition">
                  افتراضي
                </button>
                <button 
                  type="button" 
                  (click)="noteFormColor.set('#f59e0b')"
                  [class.ring-2]="noteFormColor() === '#f59e0b'"
                  class="size-8 rounded-full bg-amber-500 ring-teal-400 ring-offset-2 ring-offset-slate-900 transition">
                </button>
                <button 
                  type="button" 
                  (click)="noteFormColor.set('#10b981')"
                  [class.ring-2]="noteFormColor() === '#10b981'"
                  class="size-8 rounded-full bg-emerald-500 ring-teal-400 ring-offset-2 ring-offset-slate-900 transition">
                </button>
                <button 
                  type="button" 
                  (click)="noteFormColor.set('#3b82f6')"
                  [class.ring-2]="noteFormColor() === '#3b82f6'"
                  class="size-8 rounded-full bg-blue-500 ring-teal-400 ring-offset-2 ring-offset-slate-900 transition">
                </button>
                <button 
                  type="button" 
                  (click)="noteFormColor.set('#ec4899')"
                  [class.ring-2]="noteFormColor() === '#ec4899'"
                  class="size-8 rounded-full bg-pink-500 ring-teal-400 ring-offset-2 ring-offset-slate-900 transition">
                </button>
                <button 
                  type="button" 
                  (click)="noteFormColor.set('#ef4444')"
                  [class.ring-2]="noteFormColor() === '#ef4444'"
                  class="size-8 rounded-full bg-red-500 ring-teal-400 ring-offset-2 ring-offset-slate-900 transition">
                </button>
              </div>
            </div>
          </div>

          <!-- Modal Footer Actions -->
          <div class="pt-4 mt-4 border-t border-white/10 flex items-center justify-between shrink-0">
            <button (click)="showNoteModal.set(false)" class="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer">
              إلغاء
            </button>
            <button (click)="saveNoteFromModal()" class="px-6 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 text-white text-xs font-black rounded-xl transition shadow-xl flex items-center gap-2 cursor-pointer">
              <span>حفظ الملاحظة 💾</span>
            </button>
          </div>

        </div>
      </div>

    </div>
  `
})
export class LocalPlayerComponent implements OnInit, OnDestroy {
  sanitizer = inject(DomSanitizer);
  storageService = inject(StorageService);

  @ViewChild('videoPlayer') videoPlayer?: ElementRef<HTMLVideoElement>;
  @ViewChild('folderInput') folderInput?: ElementRef<HTMLInputElement>;
  @ViewChild('filesInput') filesInput?: ElementRef<HTMLInputElement>;

  playlist = signal<LocalMediaItem[]>([]);
  activeItemId = signal<string | null>(null);
  allNotesList = signal<VideoNote[]>([]);
  showNoteModal = signal<boolean>(false);
  editingNote = signal<VideoNote | null>(null);
  noteFormText = signal<string>('');
  noteFormColor = signal<string | null>(null);

  activeItem = computed(() => {
    const id = this.activeItemId();
    if (!id) return null;
    return this.playlist().find(i => i.id === id) || null;
  });
  
  isPlaying = signal<boolean>(false);
  currentTime = signal<number>(0);
  duration = signal<number>(0);
  volume = signal<number>(1.0);
  isMuted = signal<boolean>(false);
  playbackRate = signal<number>(1.0);
  isLooping = signal<boolean>(false);
  autoplayNext = signal<boolean>(true);
  wheelVolumeEnabled = signal<boolean>(true);
  keyboardVolumeEnabled = signal<boolean>(true);
  skipStep = signal<number>(10);
  videoFit = signal<'contain' | 'cover' | 'fill'>('contain');
  showCenterPlayIcon = signal<boolean>(true);
  keepControlsVisible = signal<boolean>(false);
  isFullscreen = signal<boolean>(false);
  isDragging = signal<boolean>(false);
  isScanning = signal<boolean>(false);
  isLoadingStored = signal<boolean>(true);
  isElectron = !!(window as any).electronAPI?.isElectron;

  onFolderLabelClick(event: MouseEvent) {
    if (this.isElectron) {
      event.preventDefault();
      this.openNativeFolder();
    }
  }

  async openNativeFolder() {
    const api = (window as any).electronAPI;
    if (api?.dialog?.openDirectory) {
      this.isScanning.set(true);
      try {
        const nativeFiles = await api.dialog.openDirectory();
        if (nativeFiles && nativeFiles.length > 0) {
          const newItems: LocalMediaItem[] = [];
          for (const f of nativeFiles) {
            const fileUrl = `file://${f.path.replace(/\\/g, '/')}`;
            const check = this.checkMediaFileType({ name: f.name, type: '' } as any);

            const item: LocalMediaItem = {
              id: 'native_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
              name: f.name,
              relativePath: f.path,
              folderName: f.folderName,
              size: f.size,
              type: check.type,
              mimeType: check.type === 'video' ? 'video/mp4' : 'audio/mp3',
              blobUrl: fileUrl,
              lastPosition: 0,
              createdAt: Date.now()
            };
            newItems.push(item);

            this.storageService.saveMediaItem({
              id: item.id,
              name: item.name,
              relativePath: item.relativePath,
              folderName: item.folderName,
              size: item.size,
              type: item.type,
              mimeType: item.mimeType,
              duration: item.duration,
              lastPosition: 0,
              createdAt: item.createdAt
            }).catch(() => {});
          }

          const sortedNew = this.sortMediaItems(newItems, this.sortOrder());
          const combined = [...this.playlist(), ...sortedNew];
          this.playlist.set(combined);
          this.showToast(`تم فتح ${newItems.length} فيديو مباشرة من القرص الصلب (دائم ولا يُمحى) 💾`);

          if (!this.activeItem() && sortedNew.length > 0) {
            this.playItem(sortedNew[0]);
          }
        }
      } catch (e) {
        console.warn('Native folder open error:', e);
      } finally {
        this.isScanning.set(false);
      }
    }
  }

  searchQuery = '';
  sortOrder = signal<'asc' | 'desc'>('asc');

  showControls = signal<boolean>(true);
  showSpeedMenu = signal<boolean>(false);
  showSettingsMenu = signal<boolean>(false);
  showShortcutsModal = signal<boolean>(false);
  showClearConfirm = signal<boolean>(false);

  skipFeedback = signal<{ text: string; direction: 'fwd' | 'bwd' | 'vol' | 'speed'; visible: boolean }>({
    text: '',
    direction: 'fwd',
    visible: false
  });

  toast = signal<{ message: string; type: 'info' | 'success' | 'warning'; visible: boolean }>({
    message: '',
    type: 'info',
    visible: false
  });

  private controlsTimeout: any = null;
  private skipTimeout: any = null;
  private toastTimeout: any = null;
  private saveProgressTimer: any = null;
  private clickTimer: any = null;
  private clickCount = 0;

  speedRates = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

  Object = Object;
  shortcutLabels: Record<string, string> = {
    playPause: 'تشغيل / إيقاف مؤقت (Play / Pause)',
    skipFwd: 'تقديم الفيديو للأمام (Skip Forward)',
    skipBwd: 'تأخير الفيديو للخلف (Skip Backward)',
    volUp: 'رفع مستوى الصوت',
    volDown: 'خفض مستوى الصوت',
    speedUp: 'زيادة سرعة التشغيل',
    speedDown: 'تقليل سرعة التشغيل',
    mute: 'كتم / إلغاء كتم الصوت',
    pip: 'وضع صورة داخل صورة (PiP)',
    nextVideo: 'الانتقال للفيديو التالي',
    prevVideo: 'الانتقال للفيديو السابق'
  };

  defaultShortcuts = {
    playPause: ['Space', 'k'],
    skipFwd: ['ArrowRight', 'l'],
    skipBwd: ['ArrowLeft', 'j'],
    volUp: ['ArrowUp'],
    volDown: ['ArrowDown'],
    speedUp: ['.', '>'],
    speedDown: [',', '<'],
    mute: ['m'],
    pip: ['p'],
    nextVideo: ['n'],
    prevVideo: ['b']
  };

  customShortcuts = signal<Record<string, string[]>>(this.loadShortcuts());
  editingAction: string | null = null;

  private loadShortcuts(): Record<string, string[]> {
    try {
      const saved = localStorage.getItem('local_player_shortcuts');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return this.defaultShortcuts;
  }

  startEditingShortcut(actionKey: string) {
    this.editingAction = actionKey;
  }

  resetShortcuts() {
    this.customShortcuts.set(this.defaultShortcuts);
    localStorage.removeItem('local_player_shortcuts');
    this.showToast('تمت استعادة الاختصارات الافتراضية ↺');
  }

  private matchesAction(event: KeyboardEvent, allowedKeys: string[]): boolean {
    const key = event.key.toLowerCase();
    const code = event.code.toLowerCase();
    return allowedKeys.some(k => {
      const target = k.toLowerCase();
      if (target === 'space' || target === ' ') return event.key === ' ' || event.code === 'Space';
      if (target === 'arrowright') return event.key === 'ArrowRight' || event.code === 'ArrowRight';
      if (target === 'arrowleft') return event.key === 'ArrowLeft' || event.code === 'ArrowLeft';
      if (target === 'arrowup') return event.key === 'ArrowUp' || event.code === 'ArrowUp';
      if (target === 'arrowdown') return event.key === 'ArrowDown' || event.code === 'ArrowDown';
      return target === key || target === code;
    });
  }

  sidebarTab = signal<'playlist' | 'bookmarks' | 'storage' | 'recycle'>('playlist');
  recycleBin = signal<RecycleBinItem[]>([]);
  bookmarks = signal<VideoBookmark[]>([]);
  newBookmarkNote = '';

  // Jump History Stack (Max 20 entries)
  jumpHistory = signal<VideoJumpPoint[]>([]);
  jumpHistoryIndex = signal<number>(-1);
  showJumpHistoryModal = signal<boolean>(false);

  canJumpBack = computed(() => this.jumpHistoryIndex() > 0);
  canJumpForward = computed(() => {
    const idx = this.jumpHistoryIndex();
    return idx >= 0 && idx < this.jumpHistory().length - 1;
  });

  async loadRecycleBinAndState() {
    try {
      if ((window as any).electronAPI?.localPlayer) {
        const res = await (window as any).electronAPI.localPlayer.loadState();
        if (res?.ok && res.data) {
          if (res.data.recycleBin) {
            const thirtyDays = 30 * 24 * 60 * 60 * 1000;
            const valid = res.data.recycleBin.filter((i: RecycleBinItem) => (Date.now() - i.deletedAt) <= thirtyDays);
            this.recycleBin.set(valid);
          }
        }
      } else {
        const saved = localStorage.getItem('local_player_recycle_bin');
        if (saved) {
          const parsed: RecycleBinItem[] = JSON.parse(saved);
          const thirtyDays = 30 * 24 * 60 * 60 * 1000;
          const valid = parsed.filter(i => (Date.now() - i.deletedAt) <= thirtyDays);
          this.recycleBin.set(valid);
        }
      }
    } catch (e) {}
  }

  saveRecycleBinAndState() {
    try {
      const data = { recycleBin: this.recycleBin() };
      if ((window as any).electronAPI?.localPlayer) {
        (window as any).electronAPI.localPlayer.saveState(data);
      } else {
        localStorage.setItem('local_player_recycle_bin', JSON.stringify(this.recycleBin()));
      }
    } catch (e) {}
  }

  clearRecycleBin() {
    this.recycleBin.set([]);
    this.saveRecycleBinAndState();
    this.showToast('تم تفريغ سلة المحذوفات نهائياً 🧹');
  }

  removeRecycleBinItem(id: string) {
    const updated = this.recycleBin().filter(i => i.id !== id);
    this.recycleBin.set(updated);
    this.saveRecycleBinAndState();
  }

  formatDaysAgo(timestamp: number): string {
    const days = Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'اليوم';
    if (days === 1) return 'أمس';
    return `منذ ${days} أيام`;
  }

  snapshotService = inject(SnapshotService);
  notesService = inject(NotesService);

  showSnapshotModal = signal<boolean>(false);
  snapshotDataUrl = signal<string | null>(null);
  snapshotImageName = signal<string>('video_snapshot.png');
  snapshotDrawMode = signal<'none' | 'text' | 'rect' | 'crop'>('none');
  snapshotRotations = signal<number>(0);
  extractedOcrText = signal<string>('');
  isExtractingOcr = signal<boolean>(false);
  showQuickOcrButton = signal<boolean>(true);
  isQuickExtractingOcr = signal<boolean>(false);
  snapshotHistory = signal<string[]>([]);
  snapshotRedoStack = signal<string[]>([]);
  snapshotTextToAdd = '';
  cropBox = signal<{ x: number; y: number; w: number; h: number }>({ x: 15, y: 15, w: 70, h: 70 });

  loopAB = signal<{ a: number | null; b: number | null; active: boolean }>({ a: null, b: null, active: false });
  notesCountByVideoId = signal<Record<string, number>>({});
  brightness = signal<number>(100);
  isTheaterMode = signal<boolean>(false);
  isFloatingMini = signal<boolean>(false);
  storageQuota = signal<{ used: number; total: number; percent: number } | null>(null);

  async checkStorageQuota() {
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        const used = estimate.usage || 0;
        const total = estimate.quota || 1;
        const percent = Math.round((used / total) * 100);
        this.storageQuota.set({ used, total, percent });
      } catch (e) {}
    }
  }

  async addBookmark() {
    const noteText = this.newBookmarkNote.trim();
    const cur = this.activeItem();
    const vid = this.videoPlayer?.nativeElement;

    if (!noteText && !cur) {
      this.showToast('يرجى كتابة نص الملاحظة أولاً ✍️', 'warning');
      return;
    }

    const time = (cur && vid) ? vid.currentTime : null;
    const finalNoteText = noteText || (time !== null ? `ملاحظة عند الدقيقة ${this.formatTime(time)}` : 'ملاحظة عامة');
    
    // Create via NotesService for global notes tab
    try {
      await this.notesService.createNote({
        videoId: cur ? cur.id : null,
        videoName: cur ? cur.name : 'ملاحظة عامة',
        folderName: cur?.folderName || '',
        timestampInVideo: time,
        text: finalNoteText,
        textColor: null,
        images: [],
        audio: null,
        isPinned: false
      });
      await this.refreshNotesCounts();
    } catch (err) {
      console.error('[LocalPlayer] Error creating note in NotesService:', err);
    }

    if (cur && time !== null) {
      const newBm: VideoBookmark = {
        id: 'bm_' + Date.now(),
        videoId: cur.id,
        videoName: cur.name,
        folderName: cur.folderName || '',
        time,
        note: finalNoteText,
        formattedTime: this.formatTime(time)
      };
      const updated = [...this.bookmarks(), newBm].sort((a, b) => a.time - b.time);
      this.bookmarks.set(updated);
      this.saveBookmarksForVideo(cur.id, updated);
      this.showToast('تم إضافة العلامة الزمنية والملاحظة 🔖', 'success');
    } else {
      this.showToast('تمت إضافة الملاحظة بنجاح 📝', 'success');
    }

    this.newBookmarkNote = '';
  }

  jumpToBookmark(time: number) {
    const cur = this.activeItem();
    const vid = this.videoPlayer?.nativeElement;
    const curTime = vid ? vid.currentTime : this.currentTime();

    if (cur && curTime !== null && curTime !== undefined) {
      this.recordJumpPoint({
        videoId: cur.id,
        videoName: cur.name,
        folderName: cur.folderName,
        time: curTime,
        label: 'موقع المشاهدة السابق'
      });
    }

    if (vid) {
      vid.currentTime = time;
      this.currentTime.set(time);
    }

    if (cur) {
      this.recordJumpPoint({
        videoId: cur.id,
        videoName: cur.name,
        folderName: cur.folderName,
        time: time,
        label: `علامة زمنية (${this.formatTime(time)})`
      });
    }
  }

  // ==========================================
  // JUMP NAVIGATION HISTORY (Max 20 entries)
  // ==========================================

  recordJumpPoint(point: { videoId: string; videoName: string; folderName?: string; time: number; label: string }) {
    if (!point.videoId || point.time === null || point.time === undefined || isNaN(point.time)) return;

    const newPoint: VideoJumpPoint = {
      id: 'jp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      videoId: point.videoId,
      videoName: point.videoName,
      folderName: point.folderName,
      time: Math.round(point.time),
      formattedTime: this.formatTime(point.time),
      label: point.label,
      timestamp: Date.now()
    };

    let history = [...this.jumpHistory()];
    const currentIndex = this.jumpHistoryIndex();

    // If user navigated backward and is now making a new jump, drop the forward history
    if (currentIndex >= 0 && currentIndex < history.length - 1) {
      history = history.slice(0, currentIndex + 1);
    }

    // Deduplicate: Don't push if the last item is identical video & time (within 2 sec)
    const last = history[history.length - 1];
    if (last && last.videoId === newPoint.videoId && Math.abs(last.time - newPoint.time) <= 2) {
      if (point.label && !last.label.includes(point.label)) {
        last.label = point.label;
        this.jumpHistory.set([...history]);
      }
      return;
    }

    history.push(newPoint);

    // Maximum 20 entries
    if (history.length > 20) {
      history = history.slice(history.length - 20);
    }

    this.jumpHistory.set(history);
    this.jumpHistoryIndex.set(history.length - 1);
    this.saveJumpHistoryToStorage();
  }

  async jumpBack() {
    if (!this.canJumpBack()) return;
    const newIndex = this.jumpHistoryIndex() - 1;
    await this.applyJumpPoint(this.jumpHistory()[newIndex], newIndex);
  }

  async jumpForward() {
    if (!this.canJumpForward()) return;
    const newIndex = this.jumpHistoryIndex() + 1;
    await this.applyJumpPoint(this.jumpHistory()[newIndex], newIndex);
  }

  async jumpToHistoryPoint(index: number) {
    const history = this.jumpHistory();
    if (index >= 0 && index < history.length) {
      await this.applyJumpPoint(history[index], index);
      this.showJumpHistoryModal.set(false);
    }
  }

  async applyJumpPoint(point: VideoJumpPoint, newIndex: number) {
    const cur = this.activeItem();
    this.jumpHistoryIndex.set(newIndex);

    if (point.videoId && point.videoId !== cur?.id) {
      const targetItem = this.playlist().find(item => item.id === point.videoId);
      if (targetItem) {
        this.playItem(targetItem, true, point.time);
        this.showToast(`تم الانتقال إلى: ${point.videoName} عند ${point.formattedTime} ⏱️`);
      } else {
        this.showToast(`الفيديو (${point.videoName}) لم يعد موجوداً في القائمة`, 'warning');
      }
    } else {
      const vid = this.videoPlayer?.nativeElement;
      if (vid) {
        vid.currentTime = point.time;
        this.currentTime.set(point.time);
        this.showToast(`تم الانتقال إلى ${point.formattedTime} ⏱️`);
      }
    }
  }

  removeJumpPoint(id: string, event?: Event) {
    if (event) event.stopPropagation();
    const history = this.jumpHistory().filter(p => p.id !== id);
    this.jumpHistory.set(history);
    if (this.jumpHistoryIndex() >= history.length) {
      this.jumpHistoryIndex.set(history.length - 1);
    }
    this.saveJumpHistoryToStorage();
  }

  clearJumpHistory() {
    this.jumpHistory.set([]);
    this.jumpHistoryIndex.set(-1);
    this.saveJumpHistoryToStorage();
    this.showToast('تم تفريغ ذاكرة الانتقالات 🧹');
  }

  formatRelativeTime(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'الآن';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `منذ ${minutes} د`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `منذ ${hours} س`;
    return `منذ ${Math.floor(hours / 24)} ي`;
  }

  private saveJumpHistoryToStorage() {
    try {
      localStorage.setItem('local_player_jump_history', JSON.stringify(this.jumpHistory()));
    } catch (e) {}
  }

  private loadJumpHistoryFromStorage() {
    try {
      const saved = localStorage.getItem('local_player_jump_history');
      if (saved) {
        const parsed: VideoJumpPoint[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.jumpHistory.set(parsed.slice(-20));
          this.jumpHistoryIndex.set(this.jumpHistory().length - 1);
        }
      }
    } catch (e) {}
  }

  removeBookmark(id: string) {
    const cur = this.activeItem();
    const updated = this.bookmarks().filter(b => b.id !== id);
    this.bookmarks.set(updated);
    if (cur) {
      this.saveBookmarksForVideo(cur.id, updated);
    }
  }

  loadBookmarksForVideo(videoId: string) {
    try {
      const saved = localStorage.getItem('local_player_bm_' + videoId);
      if (saved) {
        this.bookmarks.set(JSON.parse(saved));
      } else {
        this.bookmarks.set([]);
      }
    } catch (e) {
      this.bookmarks.set([]);
    }
  }

  private saveBookmarksForVideo(videoId: string, list: VideoBookmark[]) {
    try {
      localStorage.setItem('local_player_bm_' + videoId, JSON.stringify(list));
    } catch (e) {}
  }

  setPointA() {
    const vid = this.videoPlayer?.nativeElement;
    if (!vid) return;
    const a = vid.currentTime;
    this.loopAB.update(l => ({ ...l, a }));
    this.showToast(`تم تحديد النقطة A عند ${this.formatTime(a)} 🎯`);
  }

  setPointB() {
    const vid = this.videoPlayer?.nativeElement;
    if (!vid) return;
    const b = vid.currentTime;
    this.loopAB.update(l => ({ ...l, b }));
    this.showToast(`تم تحديد النقطة B عند ${this.formatTime(b)} 🎯`);
  }

  toggleABLoop() {
    const state = this.loopAB();
    if (state.a !== null && state.b !== null && state.a < state.b) {
      const active = !state.active;
      this.loopAB.update(l => ({ ...l, active }));
      this.showToast(active ? 'تم تفعيل التكرار المستمر بين A و B 🔁' : 'تم إيقاف التكرار ⏹️');
    } else {
      this.showToast('يرجى تحديد نقطتي A و B بشكل صحيح أولاً (A < B)', 'warning');
    }
  }

  clearABLoop() {
    this.loopAB.set({ a: null, b: null, active: false });
    this.showToast('تم إلغاء تكرار المقطع 🗑️');
  }

  toggleTheaterMode() {
    this.isTheaterMode.update(v => {
      const next = !v;
      this.showToast(next ? 'تم تفعيل وضع السينما والتركيز 🎬' : 'تم إيقاف وضع السينما 🖥️');
      return next;
    });
  }

  toggleFloatingMini() {
    this.isFloatingMini.update(v => {
      const next = !v;
      this.showToast(next ? 'تم تفعيل النافذة المصغرة العائمة 📺' : 'تم إغلاق النافذة المصغرة 🪟');
      return next;
    });
  }

  exportPlaylistJson() {
    try {
      const data = {
        playlist: this.playlist().map(item => ({
          id: item.id,
          name: item.name,
          size: item.size,
          type: item.type,
          duration: item.duration,
          folderName: item.folderName
        })),
        exportedAt: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `playlist_backup_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      this.showToast('تم تصدير قائمة التشغيل بنجاح 💾');
    } catch (e) {
      this.showToast('فشل تصدير القائمة', 'warning');
    }
  }

  // Icons
  Play = Play;
  Pause = Pause;
  Volume2 = Volume2;
  VolumeX = VolumeX;
  Maximize2 = Maximize2;
  Minimize2 = Minimize2;
  RotateCcw = RotateCcw;
  RotateCw = RotateCw;
  SkipForward = SkipForward;
  SkipBack = SkipBack;
  FolderOpen = FolderOpen;
  FolderPlus = FolderPlus;
  Upload = Upload;
  Film = Film;
  Music = Music;
  Trash2 = Trash2;
  ListMusic = ListMusic;
  Sparkles = Sparkles;
  Sliders = Sliders;
  Camera = Camera;
  Subtitles = Subtitles;
  Repeat = Repeat;
  Eye = Eye;
  HardDrive = HardDrive;
  Clock = Clock;
  Search = Search;
  ArrowUpDown = ArrowUpDown;
  Plus = Plus;
  X = X;
  Loader2 = Loader2;
  Check = Check;
  Settings = Settings;
  HelpCircle = HelpCircle;
  CheckCircle2 = CheckCircle2;
  Tv = Tv;
  Undo2 = Undo2;
  Redo2 = Redo2;
  ChevronLeft = ChevronLeft;
  ChevronRight = ChevronRight;
  History = History;
  ScanText = ScanText;

  // Filtered & Sorted playlist
  displayedPlaylist = computed(() => {
    let list = [...this.playlist()];
    const q = this.searchQuery?.trim().toLowerCase();
    if (q) {
      list = list.filter(i => 
        i.name.toLowerCase().includes(q) || 
        (i.folderName && i.folderName.toLowerCase().includes(q))
      );
    }
    return list;
  });

  totalPlaylistSize = computed(() => {
    return this.playlist().reduce((acc, item) => acc + (item.size || 0), 0);
  });

  async ngOnInit() {
    this.resetControlsTimer();
    this.loadUserPreferences();
    this.checkStorageQuota();
    await this.restoreStoredPlaylist();
    await this.loadRecycleBinAndState();
    await this.notesService.migrateLegacyBookmarksIfNeeded();
    await this.refreshNotesCounts();
  }

  async onSelectTab(tab: 'playlist' | 'bookmarks' | 'storage' | 'recycle') {
    this.sidebarTab.set(tab);
    if (tab === 'bookmarks') {
      this.loadBookmarksForVideo(this.activeItem()?.id || '');
      await this.refreshNotesCounts();
    } else if (tab === 'storage') {
      this.checkStorageQuota();
    }
  }

  async refreshNotesCounts() {
    const allNotes = await this.notesService.getAllNotes();
    this.allNotesList.set(allNotes); // Keep in sync
    const counts: Record<string, number> = {};
    for (const note of allNotes) {
      if (note.videoId) {
        counts[note.videoId] = (counts[note.videoId] || 0) + 1;
      }
    }
    this.notesCountByVideoId.set(counts);
  }

  // TODO: refreshNotesCounts() after note create/delete

  onEditNote(note: VideoNote) {
    this.editingNote.set(note);
    this.noteFormText.set(note.text);
    this.noteFormColor.set(note.textColor);
    this.showNoteModal.set(true);
  }

  async saveNoteFromModal() {
    const edit = this.editingNote();
    if (edit) {
      await this.notesService.updateNote(edit.id, {
        text: this.noteFormText().trim(),
        textColor: this.noteFormColor()
      });
      await this.refreshNotesCounts();
      this.showNoteModal.set(false);
      this.showToast('تم حفظ الملاحظة بنجاح ✨');
    } else {
      // TODO: creation mode
      this.showNoteModal.set(false);
    }
  }

  async onDeleteNote(id: string) {
    await this.notesService.softDeleteNote(id);
    const cur = this.activeItem();
    if (cur) {
      const bms = this.bookmarks().filter(b => b.id !== id);
      if (bms.length !== this.bookmarks().length) {
        this.bookmarks.set(bms);
        this.saveBookmarksForVideo(cur.id, bms);
      }
    }
    await this.refreshNotesCounts();
    this.showToast('تم نقل الملاحظة إلى سلة المحذوفات 🗑️');
  }

  async onTogglePin(note: VideoNote) {
    await this.notesService.updateNote(note.id, { isPinned: !note.isPinned });
    await this.refreshNotesCounts();
    this.showToast(note.isPinned ? 'تم إزالة التثبيت' : 'تم تثبيت الملاحظة 📌');
  }

  async jumpToNote(note: VideoNote) {
    const cur = this.activeItem();
    const vid = this.videoPlayer?.nativeElement;
    const curTime = vid ? vid.currentTime : this.currentTime();

    // 1. Snapshot current position before jumping if valid
    if (cur && curTime !== null && curTime !== undefined) {
      this.recordJumpPoint({
        videoId: cur.id,
        videoName: cur.name,
        folderName: cur.folderName,
        time: curTime,
        label: 'موقع المشاهدة السابق'
      });
    }

    // 2. Perform the jump (switch video if different)
    if (note.videoId && note.videoId !== this.activeItem()?.id) {
      const targetItem = this.playlist().find(item => item.id === note.videoId);
      if (targetItem) {
        this.playItem(targetItem, true, note.timestampInVideo ?? undefined);
      } else {
        this.showToast(`الفيديو (${note.videoName}) لم يعد موجوداً في القائمة`, 'warning');
      }
    } else if (note.timestampInVideo !== null) {
      if (vid) {
        vid.currentTime = note.timestampInVideo;
        this.currentTime.set(note.timestampInVideo);
      }
    }

    // 3. Record target position into history stack
    if (note.timestampInVideo !== null) {
      const targetVidId = note.videoId || cur?.id || '';
      const targetVidName = note.videoName || cur?.name || 'فيديو';
      this.recordJumpPoint({
        videoId: targetVidId,
        videoName: targetVidName,
        folderName: note.folderName || cur?.folderName,
        time: note.timestampInVideo,
        label: note.text ? `ملاحظة: ${note.text.slice(0, 30)}` : 'انتقال لملاحظة'
      });
    }
  }

  // TODO: refreshNotesCounts() after note create/delete

  ngOnDestroy() {
    if (this.controlsTimeout) clearTimeout(this.controlsTimeout);
    if (this.skipTimeout) clearTimeout(this.skipTimeout);
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    if (this.saveProgressTimer) clearInterval(this.saveProgressTimer);
    
    // Save current progress before unload
    this.saveCurrentPosition();

    // Revoke object URLs
    for (const item of this.playlist()) {
      if (item.blobUrl && item.blobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(item.blobUrl);
      }
      if (item.subtitlesUrl && item.subtitlesUrl.startsWith('blob:')) {
        URL.revokeObjectURL(item.subtitlesUrl);
      }
    }
  }

  private loadUserPreferences() {
    try {
      const savedSkip = localStorage.getItem('local_player_skip_step');
      if (savedSkip) this.skipStep.set(parseInt(savedSkip, 10) || 10);

      const savedFit = localStorage.getItem('local_player_fit') as any;
      if (savedFit) this.videoFit.set(savedFit);

      const savedVol = localStorage.getItem('local_player_volume');
      if (savedVol !== null) this.volume.set(parseFloat(savedVol) || 1.0);

      const savedAutoplay = localStorage.getItem('local_player_autoplay');
      if (savedAutoplay !== null) this.autoplayNext.set(savedAutoplay === 'true');

      const savedWheelVol = localStorage.getItem('local_player_wheel_volume');
      if (savedWheelVol !== null) this.wheelVolumeEnabled.set(savedWheelVol === 'true');

      const savedKeyVol = localStorage.getItem('local_player_keyboard_volume');
      if (savedKeyVol !== null) this.keyboardVolumeEnabled.set(savedKeyVol === 'true');

      const savedSpeed = localStorage.getItem('local_player_speed');
      if (savedSpeed) {
        const rate = parseFloat(savedSpeed);
        if (!isNaN(rate)) this.playbackRate.set(rate);
      }

      const savedCenterPlay = localStorage.getItem('local_player_center_play');
      if (savedCenterPlay !== null) this.showCenterPlayIcon.set(savedCenterPlay === 'true');

      const savedKeepControls = localStorage.getItem('local_player_keep_controls');
      if (savedKeepControls !== null) this.keepControlsVisible.set(savedKeepControls === 'true');

      const savedShowQuickOcr = localStorage.getItem('local_player_show_quick_ocr');
      if (savedShowQuickOcr !== null) this.showQuickOcrButton.set(savedShowQuickOcr === 'true');

      this.loadJumpHistoryFromStorage();
    } catch (e) {
      console.warn('Could not load user preferences:', e);
    }
  }

  toggleQuickOcrButton() {
    const val = !this.showQuickOcrButton();
    this.showQuickOcrButton.set(val);
    localStorage.setItem('local_player_show_quick_ocr', val.toString());
    this.showToast(val ? 'تم إظهار زر استخراج النص السريع (OCR) ✨' : 'تم إخفاء زر استخراج النص السريع', 'info');
  }

  toggleWheelVolume() {
    const val = !this.wheelVolumeEnabled();
    this.wheelVolumeEnabled.set(val);
    localStorage.setItem('local_player_wheel_volume', val.toString());
  }

  toggleKeyboardVolume() {
    const val = !this.keyboardVolumeEnabled();
    this.keyboardVolumeEnabled.set(val);
    localStorage.setItem('local_player_keyboard_volume', val.toString());
  }

  toggleCenterPlayIcon() {
    const val = !this.showCenterPlayIcon();
    this.showCenterPlayIcon.set(val);
    localStorage.setItem('local_player_center_play', val.toString());
  }

  toggleKeepControls() {
    const val = !this.keepControlsVisible();
    this.keepControlsVisible.set(val);
    localStorage.setItem('local_player_keep_controls', val.toString());
  }

  /**
   * Restores previously uploaded playlist and media files from IndexedDB
   */
  private async restoreStoredPlaylist() {
    this.isLoadingStored.set(true);
    try {
      const storedItems: any[] = await this.storageService.getAllMediaItems();
      if (storedItems && storedItems.length > 0) {
        const restored: LocalMediaItem[] = [];
        for (const item of storedItems) {
          if (item.fileBlob) {
            const blobUrl = URL.createObjectURL(item.fileBlob);
            let subtitlesUrl: string | undefined;
            if (item.subtitlesBlob) {
              subtitlesUrl = URL.createObjectURL(item.subtitlesBlob);
            }
            restored.push({
              ...item,
              blobUrl,
              subtitlesUrl
            });
          }
        }

        if (restored.length > 0) {
          const sorted = this.sortMediaItems(restored, this.sortOrder());
          this.playlist.set(sorted);

          // Restore last active item
          const lastActiveId = localStorage.getItem('local_player_active_id');
          const target = sorted.find(i => i.id === lastActiveId) || sorted[0];
          if (target) {
            this.playItem(target, false); // load but don't auto-start unprompted
          }

          this.showToast(`تم استعادة ${sorted.length} فيديو محفوظ من الذاكرة المحلية 💾`);
        }
      }
    } catch (err) {
      console.warn('[LocalPlayer] Could not restore stored playlist:', err);
    } finally {
      this.isLoadingStored.set(false);
    }
  }

  showToast(message: string, type: 'info' | 'success' | 'warning' = 'info') {
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toast.set({ message, type, visible: true });
    this.toastTimeout = setTimeout(() => {
      this.toast.set({ message: '', type: 'info', visible: false });
    }, 4000);
  }

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.processFiles(Array.from(input.files));
      input.value = '';
    }
  }

  onFolderSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.processFiles(Array.from(input.files));
      input.value = '';
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(false);
  }

  async onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(false);
    
    if (event.dataTransfer?.items && event.dataTransfer.items.length > 0) {
      this.isScanning.set(true);
      try {
        const extractedFiles = await this.extractFilesFromDataTransfer(event.dataTransfer.items);
        if (extractedFiles.length > 0) {
          await this.processFiles(extractedFiles);
        }
      } catch (err) {
        console.warn('Error reading dropped folder:', err);
      } finally {
        this.isScanning.set(false);
      }
    } else if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      await this.processFiles(Array.from(event.dataTransfer.files));
    }
  }

  private async extractFilesFromDataTransfer(items: DataTransferItemList): Promise<File[]> {
    const files: File[] = [];

    const readEntry = async (entry: any, currentPath = ''): Promise<void> => {
      if (!entry) return;
      if (entry.isFile) {
        await new Promise<void>((resolve) => {
          entry.file((file: File) => {
            if (currentPath) {
              Object.defineProperty(file, 'webkitRelativePath', {
                value: `${currentPath}/${file.name}`,
                writable: false
              });
            }
            files.push(file);
            resolve();
          }, () => resolve());
        });
      } else if (entry.isDirectory) {
        const dirReader = entry.createReader();
        const nextPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
        
        const readBatch = (): Promise<any[]> => {
          return new Promise((resolve) => {
            dirReader.readEntries((entries: any[]) => resolve(entries), () => resolve([]));
          });
        };

        let readMore = true;
        while (readMore) {
          const batch = await readBatch();
          if (batch && batch.length > 0) {
            for (const childEntry of batch) {
              await readEntry(childEntry, nextPath);
            }
          } else {
            readMore = false;
          }
        }
      }
    };

    const promises: Promise<void>[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.webkitGetAsEntry) {
        const entry = item.webkitGetAsEntry();
        if (entry) {
          promises.push(readEntry(entry));
          continue;
        }
      }
      const file = item.getAsFile();
      if (file) {
        files.push(file);
      }
    }

    await Promise.all(promises);
    return files;
  }

  private checkMediaFileType(file: File): { isMedia: boolean; isSub: boolean; type: 'video' | 'audio' } {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const videoExts = ['mp4', 'mkv', 'webm', 'mov', 'avi', 'wmv', 'flv', 'm4v', 'ts', '3gp', 'ogv', 'mts', 'm2ts'];
    const audioExts = ['mp3', 'wav', 'aac', 'ogg', 'flac', 'm4a', 'opus', 'wma', 'mka', 'mid'];
    const subExts = ['srt', 'vtt', 'ass', 'ssa'];

    if (subExts.includes(ext)) {
      return { isMedia: false, isSub: true, type: 'video' };
    }

    if (file.type) {
      if (file.type.startsWith('video/')) return { isMedia: true, isSub: false, type: 'video' };
      if (file.type.startsWith('audio/')) return { isMedia: true, isSub: false, type: 'audio' };
    }

    if (videoExts.includes(ext)) return { isMedia: true, isSub: false, type: 'video' };
    if (audioExts.includes(ext)) return { isMedia: true, isSub: false, type: 'audio' };

    return { isMedia: false, isSub: false, type: 'video' };
  }

  private sortMediaItems(items: LocalMediaItem[], order: 'asc' | 'desc' = 'asc'): LocalMediaItem[] {
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    return items.sort((a, b) => {
      const folderA = (a.folderName || '').trim();
      const folderB = (b.folderName || '').trim();
      if (folderA !== folderB) {
        return collator.compare(folderA, folderB);
      }
      const cmp = collator.compare(a.name, b.name);
      return order === 'asc' ? cmp : -cmp;
    });
  }

  private async extractDuration(file: File): Promise<number> {
    return new Promise((resolve) => {
      const vid = document.createElement('video');
      vid.preload = 'metadata';
      const url = URL.createObjectURL(file);
      vid.src = url;
      vid.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(vid.duration || 0);
      };
      vid.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(0);
      };
    });
  }

  async processFiles(files: File[]) {
    if (!files || files.length === 0) return;

    this.isScanning.set(true);
    const mediaFiles: File[] = [];
    const subtitleFiles: Map<string, File> = new Map();

    for (const file of files) {
      const check = this.checkMediaFileType(file);
      if (check.isMedia) {
        mediaFiles.push(file);
      } else if (check.isSub) {
        const baseName = file.name.substring(0, file.name.lastIndexOf('.')).toLowerCase();
        subtitleFiles.set(baseName, file);
      }
    }

    if (mediaFiles.length === 0) {
      this.isScanning.set(false);
      return;
    }

    const newItems: LocalMediaItem[] = [];
    for (const file of mediaFiles) {
      const check = this.checkMediaFileType(file);
      const relativePath = file.webkitRelativePath || '';
      let folderName = '';
      if (relativePath) {
        const parts = relativePath.split('/');
        if (parts.length > 1) {
          folderName = parts.slice(0, -1).join(' / ');
        }
      }

      let subtitlesUrl: string | undefined;
      let subtitlesBlob: File | undefined;
      let subtitlesName: string | undefined;
      const baseName = file.name.substring(0, file.name.lastIndexOf('.')).toLowerCase();
      if (subtitleFiles.has(baseName)) {
        subtitlesBlob = subtitleFiles.get(baseName)!;
        subtitlesUrl = URL.createObjectURL(subtitlesBlob);
        subtitlesName = subtitlesBlob.name;
      }

      const duration = await this.extractDuration(file).catch(() => 0);

      const item: LocalMediaItem = {
        id: 'local_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
        name: file.name,
        relativePath: relativePath || undefined,
        folderName: folderName || undefined,
        size: file.size,
        type: check.type,
        mimeType: file.type || (check.type === 'video' ? 'video/mp4' : 'audio/mp3'),
        blobUrl: URL.createObjectURL(file),
        fileBlob: file,
        subtitlesUrl,
        subtitlesBlob,
        subtitlesName,
        duration: duration || undefined,
        lastPosition: 0,
        createdAt: Date.now()
      };

      newItems.push(item);

      // Persist in IndexedDB
        this.storageService.saveMediaItem({
          id: item.id,
          name: item.name,
          relativePath: item.relativePath,
          folderName: item.folderName,
          size: item.size,
          type: item.type,
          mimeType: item.mimeType,
          fileBlob: item.fileBlob,
          subtitlesBlob: item.subtitlesBlob,
          subtitlesName: item.subtitlesName,
          duration: item.duration,
          lastPosition: 0,
          createdAt: item.createdAt
        }).catch(e => {
        console.warn('Could not store in IndexedDB:', e);
        if (e?.name === 'QuotaExceededError' || e?.code === 22) {
          this.showToast('تحذير: تم امتلاء المساحة المخصصة للتخزين المؤقت في المتصفح!', 'warning');
        }
      });
    }

    const sortedNew = this.sortMediaItems(newItems, this.sortOrder());
    const current = this.playlist();
    const combined = [...current, ...sortedNew];
    this.playlist.set(combined);

    this.isScanning.set(false);
    this.showToast(`تمت إضافة ${newItems.length} فيديو وحفظها محلياً 💾`);

    // Auto start first item if none is currently active
    if (!this.activeItem() && sortedNew.length > 0) {
      this.playItem(sortedNew[0]);
    }
  }

  toggleSortOrder() {
    const newOrder = this.sortOrder() === 'asc' ? 'desc' : 'asc';
    this.sortOrder.set(newOrder);
    const sorted = this.sortMediaItems([...this.playlist()], newOrder);
    this.playlist.set(sorted);
  }

  onPlaylistItemClick(item: LocalMediaItem) {
    if (this.activeItem()?.id === item.id) {
      this.togglePlay();
    } else {
      const cur = this.activeItem();
      const vid = this.videoPlayer?.nativeElement;
      const curTime = vid ? vid.currentTime : this.currentTime();
      if (cur && curTime !== null && curTime !== undefined) {
        this.recordJumpPoint({
          videoId: cur.id,
          videoName: cur.name,
          folderName: cur.folderName,
          time: curTime,
          label: 'موقع المشاهدة السابق'
        });
      }
      this.playItem(item);
    }
  }

  playItem(item: LocalMediaItem, autoPlay = true, seekToTime?: number) {
    this.saveCurrentPosition();
    this.activeItemId.set(item.id);
    localStorage.setItem('local_player_active_id', item.id);
    this.loadBookmarksForVideo(item.id);

    setTimeout(() => {
      if (this.videoPlayer?.nativeElement) {
        this.videoPlayer.nativeElement.playbackRate = this.playbackRate();
        this.videoPlayer.nativeElement.volume = this.volume();
        this.videoPlayer.nativeElement.muted = this.isMuted();

        if (seekToTime !== undefined && seekToTime !== null) {
          this.videoPlayer.nativeElement.currentTime = seekToTime;
          this.currentTime.set(seekToTime);
        } else if (item.lastPosition && item.lastPosition > 5) {
          this.videoPlayer.nativeElement.currentTime = item.lastPosition;
          this.currentTime.set(item.lastPosition);
        }

        if (autoPlay) {
          this.videoPlayer.nativeElement.play().then(() => {
            this.isPlaying.set(true);
          }).catch(() => {});
        }
      }
    }, 60);
  }

  togglePlay() {
    const vid = this.videoPlayer?.nativeElement;
    if (!vid) return;
    if (vid.paused) {
      vid.play();
    } else {
      vid.pause();
    }
  }

  /**
   * Jump forward or backward by a specific number of seconds
   */
  skipTime(seconds: number) {
    const vid = this.videoPlayer?.nativeElement;
    if (!vid) return;

    const newTime = Math.max(0, Math.min(vid.duration || 0, vid.currentTime + seconds));
    vid.currentTime = newTime;
    this.currentTime.set(newTime);

    const text = (seconds > 0 ? `+${seconds}` : `${seconds}`) + 's';
    this.showOsFeedback(text, seconds > 0 ? 'fwd' : 'bwd');
  }

  private showOsFeedback(text: string, direction: 'fwd' | 'bwd' | 'vol' | 'speed') {
    if (this.skipTimeout) clearTimeout(this.skipTimeout);
    this.skipFeedback.set({
      text,
      direction,
      visible: true
    });

    this.skipTimeout = setTimeout(() => {
      this.skipFeedback.set({ text: '', direction: 'fwd', visible: false });
    }, 650);
  }

  setSkipStep(step: number) {
    this.skipStep.set(step);
    localStorage.setItem('local_player_skip_step', step.toString());
    this.showSettingsMenu.set(false);
    this.showToast(`تم تعيين مدة القفز إلى ${step} ثوانٍ ⚡`);
  }

  setVideoFit(fit: 'contain' | 'cover' | 'fill') {
    this.videoFit.set(fit);
    localStorage.setItem('local_player_fit', fit);
    this.showSettingsMenu.set(false);
  }

  onVideoClick(event: MouseEvent) {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const width = rect.width;

    this.clickCount++;
    if (this.clickCount === 1) {
      this.clickTimer = setTimeout(() => {
        // Single click: toggle play/pause
        this.clickCount = 0;
        this.togglePlay();
      }, 250);
    } else if (this.clickCount === 2) {
      // Double click
      clearTimeout(this.clickTimer);
      this.clickCount = 0;

      // In RTL: Left side (0 to 35%) is backward (-), Right side (65% to 100%) is forward (+)
      if (clickX < width * 0.35) {
        this.skipTime(-this.skipStep());
      } else if (clickX > width * 0.65) {
        this.skipTime(this.skipStep());
      } else {
        this.toggleFullscreen();
      }
    }
  }

  onVideoWheel(event: WheelEvent) {
    if (!this.activeItem() || !this.wheelVolumeEnabled()) return;
    event.preventDefault();
    const delta = event.deltaY < 0 ? 0.05 : -0.05;
    const newVol = Math.max(0, Math.min(1, this.volume() + delta));
    this.setVolumeNumber(newVol);
  }

  private lastSavedTime = 0;

  onVideoPause() {
    this.isPlaying.set(false);
    this.saveCurrentPosition();
  }

  @HostListener('window:beforeunload')
  onBeforeUnload() {
    this.saveCurrentPosition();
  }

  onTimeUpdate() {
    const vid = this.videoPlayer?.nativeElement;
    if (vid) {
      this.currentTime.set(vid.currentTime);
      
      const cur = this.activeItem();
      if (cur) {
        if (Math.abs((cur.lastPosition || 0) - vid.currentTime) > 4) {
          cur.lastPosition = vid.currentTime;
          this.playlist.update(list => list.map(i => i.id === cur.id ? { ...i, lastPosition: vid.currentTime } : i));
        }

        if (Math.abs(vid.currentTime - this.lastSavedTime) > 5) {
          this.lastSavedTime = vid.currentTime;
          this.saveCurrentPosition();
        }
      }
    }
  }

  private saveCurrentPosition() {
    const cur = this.activeItem();
    const vid = this.videoPlayer?.nativeElement;
    if (cur && vid) {
      const pos = vid.currentTime;
      cur.lastPosition = pos;
        this.storageService.getMediaItem(cur.id).then(stored => {
          if (stored) {
            stored.lastPosition = pos;
            stored.lastWatchedAt = Date.now();
            this.storageService.saveMediaItem(stored).catch(() => {});
          }
        }).catch(() => {});
    }
  }

  onLoadedMetadata() {
    const vid = this.videoPlayer?.nativeElement;
    if (vid) {
      const dur = vid.duration;
      this.duration.set(dur);
      vid.volume = this.volume();
      vid.muted = this.isMuted();
      vid.playbackRate = this.playbackRate();

      const cur = this.activeItem();
      if (cur) {
        if (dur && !cur.duration) {
          cur.duration = dur;
          this.playlist.update(list => list.map(i => i.id === cur.id ? { ...i, duration: dur } : i));
          this.storageService.getMediaItem(cur.id).then(stored => {
            if (stored) {
              stored.duration = dur;
              this.storageService.saveMediaItem(stored).catch(() => {});
            }
          }).catch(() => {});
        }

        if (cur.lastPosition && cur.lastPosition > 3) {
          vid.currentTime = cur.lastPosition;
          this.currentTime.set(cur.lastPosition);
        }
      }
    }
  }

  onMediaEnded() {
    if (this.isLooping()) {
      const vid = this.videoPlayer?.nativeElement;
      if (vid) {
        vid.currentTime = 0;
        vid.play();
      }
    } else if (this.autoplayNext()) {
      this.playNext();
    } else {
      this.isPlaying.set(false);
    }
  }

  playNext() {
    const list = this.displayedPlaylist();
    const cur = this.activeItem();
    if (!cur || list.length <= 1) return;

    // Filter to items in the same folder
    const sameFolderList = list.filter(i => (i.folderName || '') === (cur.folderName || ''));
    const targetList = sameFolderList.length > 0 ? sameFolderList : list;

    const curIdx = targetList.findIndex(i => i.id === cur.id);
    const nextIdx = (curIdx + 1) % targetList.length;
    this.playItem(targetList[nextIdx]);
  }

  playPrevious() {
    const list = this.displayedPlaylist();
    const cur = this.activeItem();
    if (!cur || list.length <= 1) return;

    // Filter to items in the same folder
    const sameFolderList = list.filter(i => (i.folderName || '') === (cur.folderName || ''));
    const targetList = sameFolderList.length > 0 ? sameFolderList : list;

    const curIdx = targetList.findIndex(i => i.id === cur.id);
    const prevIdx = (curIdx - 1 + targetList.length) % targetList.length;
    this.playItem(targetList[prevIdx]);
  }

  seek(event: Event) {
    const val = +(event.target as HTMLInputElement).value;
    const vid = this.videoPlayer?.nativeElement;
    if (vid) {
      vid.currentTime = val;
      this.currentTime.set(val);
    }
  }

  setVolume(event: Event) {
    const val = +(event.target as HTMLInputElement).value;
    this.setVolumeNumber(val);
  }

  private setVolumeNumber(val: number) {
    this.volume.set(val);
    localStorage.setItem('local_player_volume', val.toString());
    const vid = this.videoPlayer?.nativeElement;
    if (vid) {
      vid.volume = val;
      this.isMuted.set(val === 0);
    }
    const percent = Math.round(val * 100);
    this.showOsFeedback(`${percent}%`, 'vol');
  }

  toggleMute() {
    const vid = this.videoPlayer?.nativeElement;
    if (!vid) return;
    const newMuted = !this.isMuted();
    this.isMuted.set(newMuted);
    vid.muted = newMuted;
  }

  toggleSpeedMenu() {
    this.showSpeedMenu.update(v => !v);
    this.showSettingsMenu.set(false);
  }

  toggleSettingsMenu() {
    this.showSettingsMenu.update(v => !v);
    this.showSpeedMenu.set(false);
  }

  setSpeed(rate: number) {
    this.playbackRate.set(rate);
    localStorage.setItem('local_player_speed', rate.toString());
    const vid = this.videoPlayer?.nativeElement;
    if (vid) {
      vid.playbackRate = rate;
    }
    this.showSpeedMenu.set(false);
    this.showOsFeedback(`${rate}x`, 'speed');
  }

  speedUp() {
    const cur = this.playbackRate();
    const idx = this.speedRates.indexOf(cur);
    if (idx >= 0 && idx < this.speedRates.length - 1) {
      this.setSpeed(this.speedRates[idx + 1]);
    } else {
      const next = Math.min(3.0, Number((cur + 0.25).toFixed(2)));
      this.setSpeed(next);
    }
  }

  speedDown() {
    const cur = this.playbackRate();
    const idx = this.speedRates.indexOf(cur);
    if (idx > 0) {
      this.setSpeed(this.speedRates[idx - 1]);
    } else {
      const next = Math.max(0.25, Number((cur - 0.25).toFixed(2)));
      this.setSpeed(next);
    }
  }

  onVideoError(event: Event) {
    console.warn('Video playback error:', event);
    this.showToast('تعذر تشغيل هذا الملف (قد يكون التنسيق أو الترميز غير مدعوم في المتصفح)', 'warning');
    this.isPlaying.set(false);
  }

  toggleFullscreen() {
    const vidContainer = this.videoPlayer?.nativeElement?.parentElement;
    if (!vidContainer) return;
    if (!document.fullscreenElement) {
      vidContainer.requestFullscreen().then(() => this.isFullscreen.set(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => this.isFullscreen.set(false)).catch(() => {});
    }
  }

  async togglePiP() {
    const vid = this.videoPlayer?.nativeElement;
    if (!vid) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await vid.requestPictureInPicture();
      }
    } catch (e) {
      console.warn('Picture in Picture failed:', e);
    }
  }

  onSubtitlesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const subFile = input.files[0];
      const cur = this.activeItem();
      if (cur) {
        const subUrl = URL.createObjectURL(subFile);
        const updatedItem = {
          ...cur,
          subtitlesUrl: subUrl,
          subtitlesBlob: subFile,
          subtitlesName: subFile.name
        };
        this.playlist.update(list => list.map(i => i.id === cur.id ? updatedItem : i));

        // Update IndexedDB entry
        this.storageService.getMediaItem(cur.id).then(stored => {
          if (stored) {
            stored.subtitlesBlob = subFile;
            stored.subtitlesName = subFile.name;
            this.storageService.saveMediaItem(stored);
          }
        }).catch(() => {});

        this.showToast(`تم تحميل ملف الترجمة: ${subFile.name} 💬`);
      }
    }
  }

  takeSnapshot() {
    const vid = this.videoPlayer?.nativeElement;
    if (!vid) {
      this.showToast('تعذر الوصول لمشغل الفيديو، يرجى المحاولة لاحقاً', 'warning');
      return;
    }
    const dataUrl = this.snapshotService.takeSnapshot(vid);
    if (!dataUrl) {
      this.showToast('فشل التقاط الصورة، يرجى المحاولة مرة أخرى', 'warning');
      return;
    }

    this.snapshotDataUrl.set(dataUrl);
    this.snapshotImageName.set(`snapshot_${this.activeItem()?.name || 'video'}_${Math.floor(this.currentTime())}s.png`);
    this.extractedOcrText.set('');
    this.snapshotRotations.set(0);
    this.snapshotHistory.set([]);
    this.snapshotRedoStack.set([]);
    this.showSnapshotModal.set(true);
    this.showToast('تم التقاط الصورة! عاينها، عدل عليها، واستخرج النص 📸');

    this.extractTextFromSnapshot(dataUrl);
  }

  async extractTextFromSnapshot(urlToScan?: string) {
    const url = urlToScan || this.snapshotDataUrl();
    if (!url) return;
    this.isExtractingOcr.set(true);
    try {
      const text = await this.snapshotService.extractText(url, this.snapshotImageName());
      this.extractedOcrText.set(text);
      if (text) {
        await navigator.clipboard.writeText(text);
        this.showToast('تم استخراج النص ونسخه إلى الحافظة تلقائياً! 📋✨');
      } else {
        this.showToast('لم يتم العثور على نص واضح في الصورة', 'warning');
      }
    } catch (e) {
      this.showToast('فشل استخراج النص من الصورة', 'warning');
    } finally {
      this.isExtractingOcr.set(false);
    }
  }

  rotateSnapshot() {
    this.snapshotRotations.update(r => this.snapshotService.rotate(r));
  }

  /**
   * Fast background OCR extraction directly from video frame without pausing playback
   */
  async quickExtractOcr() {
    const vid = this.videoPlayer?.nativeElement;
    const cur = this.activeItem();
    if (!vid || !cur) {
      this.showToast('لا يوجد فيديو قيد التشغيل حالياً لاستخراج النص منه', 'warning');
      return;
    }

    if (this.isQuickExtractingOcr()) {
      this.showToast('جاري استخراج النص بالفعل في الخلفية...', 'info');
      return;
    }

    // 1. Take snapshot of current frame completely in memory without pausing or interrupting video playback!
    const dataUrl = this.snapshotService.takeSnapshot(vid);
    if (!dataUrl) {
      this.showToast('تعذر التقاط إطار الفيديو الحالي', 'warning');
      return;
    }

    const timeAtCapture = vid.currentTime;
    const timeFormatted = this.formatTime(timeAtCapture);
    const videoNameAtCapture = cur.name;
    const videoIdAtCapture = cur.id;
    const folderNameAtCapture = cur.folderName || '';
    const imageName = `quick_ocr_${cur.name}_${Math.floor(timeAtCapture)}s.png`;

    this.isQuickExtractingOcr.set(true);
    this.showToast(`⚡ جارٍ استخراج النص من الشاشة عند (${timeFormatted}) دون إيقاف الفيديو...`, 'info');

    try {
      const text = await this.snapshotService.extractText(dataUrl, imageName);
      const trimmed = text ? text.trim() : '';

      if (!trimmed) {
        this.showToast(`لم يتم العثور على نص واضح في إطار الدقيقة (${timeFormatted})`, 'warning');
        return;
      }

      // Automatically copy extracted text to clipboard for instant user convenience
      try {
        await navigator.clipboard.writeText(trimmed);
      } catch (clipErr) {
        // Clipboard failure shouldn't fail note creation
      }

      // 2. Save into NotesService tied to the video and exact timestamp
      await this.notesService.createNote({
        videoId: videoIdAtCapture,
        videoName: videoNameAtCapture,
        folderName: folderNameAtCapture,
        timestampInVideo: timeAtCapture !== null && !isNaN(timeAtCapture) ? Math.floor(timeAtCapture) : null,
        text: trimmed,
        textColor: null,
        images: [{
          id: 'img_' + Date.now(),
          dataUrl: dataUrl,
          order: 0,
          createdAt: Date.now()
        }],
        audio: null,
        isPinned: false
      });

      // Also save to video bookmarks if currently on that video so it reflects in all views
      const newBm: VideoBookmark = {
        id: 'bm_' + Date.now(),
        videoId: videoIdAtCapture,
        videoName: videoNameAtCapture,
        folderName: folderNameAtCapture,
        time: Math.floor(timeAtCapture),
        note: trimmed,
        formattedTime: timeFormatted
      };
      const updatedBms = [...this.bookmarks(), newBm].sort((a, b) => a.time - b.time);
      this.bookmarks.set(updatedBms);
      this.saveBookmarksForVideo(videoIdAtCapture, updatedBms);

      // Refresh global notes list & playlist badges
      await this.refreshNotesCounts();

      this.showToast(`✅ تم استخراج النص وحفظه كملاحظة عند (${timeFormatted}) ونسخه للحافظة بنجاح!`, 'success');
    } catch (err) {
      console.error('[LocalPlayer] quickExtractOcr error:', err);
      this.showToast('حدث خطأ أثناء استخراج النص من الشاشة', 'warning');
    } finally {
      this.isQuickExtractingOcr.set(false);
    }
  }

  async downloadEditedSnapshot() {
    const url = this.snapshotDataUrl();
    if (!url) return;
    try {
      await this.snapshotService.downloadEditedSnapshot(url, this.snapshotRotations(), this.snapshotImageName());
      this.showToast('تم حفظ وتنزيل الصورة النهائية بنجاح 💾');
      this.showSnapshotModal.set(false);
    } catch (e) {
      console.error('Download failed:', e);
      this.showToast('فشل في تنزيل الصورة، يرجى المحاولة مرة أخرى', 'warning');
    }
  }

  removeItem(id: string) {
    const item = this.playlist().find(i => i.id === id);
    if (item && item.blobUrl && item.blobUrl.startsWith('blob:')) {
      URL.revokeObjectURL(item.blobUrl);
    }

    const updated = this.playlist().filter(i => i.id !== id);
    this.playlist.set(updated);

    // Delete from IndexedDB
    this.storageService.deleteMediaItem(id).catch(() => {});

    if (this.activeItem()?.id === id) {
      if (updated.length > 0) {
        this.playItem(updated[0]);
      } else {
        this.activeItemId.set(null);
        this.isPlaying.set(false);
        localStorage.removeItem('local_player_active_id');
      }
    }
  }

  confirmClearPlaylist() {
    this.showClearConfirm.set(false);
    for (const item of this.playlist()) {
      if (item.blobUrl && item.blobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(item.blobUrl);
      }
    }

    this.playlist.set([]);
    this.activeItemId.set(null);
    this.isPlaying.set(false);
    localStorage.removeItem('local_player_active_id');

    this.storageService.clearAllMedia().catch(() => {});
    this.showToast('تم تفريغ قائمة التشغيل والذاكرة المحلية بنجاح 🧹');
  }

  onMouseMove() {
    this.showControls.set(true);
    this.resetControlsTimer();
  }

  private resetControlsTimer() {
    if (this.controlsTimeout) clearTimeout(this.controlsTimeout);
    this.controlsTimeout = setTimeout(() => {
      if (this.isPlaying()) {
        this.showControls.set(false);
        this.showSpeedMenu.set(false);
        this.showSettingsMenu.set(false);
      }
    }, 3500);
  }

  formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) {
      const remMins = mins % 60;
      return `${hrs}:${remMins < 10 ? '0' : ''}${remMins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  formatFileSize(bytes: number): string {
    if (!bytes) return '0 B';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1000) return (mb / 1024).toFixed(1) + ' GB';
    return mb.toFixed(1) + ' MB';
  }

  // Keyboard Shortcuts: Space/K, Left/Right/J/L, Up/Down, F, M, P, N, B, 0-9
  @HostListener('window:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent) {
    if (this.editingAction) {
      event.preventDefault();
      const newKey = event.key;
      const action = this.editingAction;
      this.customShortcuts.update(sc => ({
        ...sc,
        [action]: [newKey]
      }));
      localStorage.setItem('local_player_shortcuts', JSON.stringify(this.customShortcuts()));
      this.editingAction = null;
      this.showToast(`تم تعيين الاختصار الجديد بنجاح ⌨️`);
      return;
    }

    if (this.showShortcutsModal() || this.showClearConfirm() || this.showSpeedMenu() || this.showSettingsMenu()) {
      return;
    }

    if (this.showJumpHistoryModal()) {
      if (event.key === 'Escape') {
        this.showJumpHistoryModal.set(false);
      }
      return;
    }

    const tag = (event.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    // Alt + Left: Jump Back
    if (event.altKey && (event.key === 'ArrowLeft' || event.key === '[')) {
      event.preventDefault();
      this.jumpBack();
      return;
    }
    // Alt + Right: Jump Forward
    if (event.altKey && (event.key === 'ArrowRight' || event.key === ']')) {
      event.preventDefault();
      this.jumpForward();
      return;
    }
    // Alt + H: Jump History
    if (event.altKey && (event.key === 'h' || event.key === 'H' || event.key === 'ا')) {
      event.preventDefault();
      this.showJumpHistoryModal.set(!this.showJumpHistoryModal());
      return;
    }

    // Alt + O: Quick OCR without pausing video
    if (event.altKey && (event.key === 'o' || event.key === 'O' || event.key === 'خ')) {
      event.preventDefault();
      if (this.showQuickOcrButton()) {
        this.quickExtractOcr();
      }
      return;
    }

    const shortcuts = this.customShortcuts();

    if (this.matchesAction(event, shortcuts['playPause'])) {
      event.preventDefault();
      this.togglePlay();
    } else if (this.matchesAction(event, shortcuts['skipFwd'])) {
      event.preventDefault();
      this.skipTime(this.skipStep());
    } else if (this.matchesAction(event, shortcuts['skipBwd'])) {
      event.preventDefault();
      this.skipTime(-this.skipStep());
    } else if (this.matchesAction(event, shortcuts['volUp'])) {
      if (this.keyboardVolumeEnabled()) {
        event.preventDefault();
        this.setVolumeNumber(Math.min(1, this.volume() + 0.05));
      }
    } else if (this.matchesAction(event, shortcuts['volDown'])) {
      if (this.keyboardVolumeEnabled()) {
        event.preventDefault();
        this.setVolumeNumber(Math.max(0, this.volume() - 0.05));
      }
    } else if (this.matchesAction(event, shortcuts['mute'])) {
      event.preventDefault();
      this.toggleMute();
    } else if (this.matchesAction(event, shortcuts['pip'])) {
      event.preventDefault();
      this.togglePiP();
    } else if (this.matchesAction(event, shortcuts['nextVideo'])) {
      event.preventDefault();
      this.playNext();
    } else if (this.matchesAction(event, shortcuts['prevVideo'])) {
      event.preventDefault();
      this.playPrevious();
    } else if (this.matchesAction(event, shortcuts['speedUp'])) {
      event.preventDefault();
      this.speedUp();
    } else if (this.matchesAction(event, shortcuts['speedDown'])) {
      event.preventDefault();
      this.speedDown();
    } else {
      const key = event.key.toLowerCase();
      if (key >= '0' && key <= '9') {
        const vid = this.videoPlayer?.nativeElement;
        if (vid && vid.duration) {
          event.preventDefault();
          const fraction = parseInt(key, 10) / 10;
          vid.currentTime = vid.duration * fraction;
        }
      }
    }
  }
}
