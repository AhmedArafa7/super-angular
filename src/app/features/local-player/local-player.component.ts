import { Component, OnInit, OnDestroy, signal, computed, ViewChild, ElementRef, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { 
  LucideAngularModule, Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, 
  RotateCcw, SkipForward, SkipBack, FolderOpen, Upload, Film, Music, Trash2, 
  ListMusic, Sparkles, Sliders, Camera, Subtitles, Repeat, Eye, HardDrive, Clock
} from 'lucide-angular';
import { IndexedDBService } from '../../core/services/indexed-db.service';

export interface LocalMediaItem {
  id: string;
  name: string;
  size: number;
  type: 'video' | 'audio';
  mimeType: string;
  blobUrl: string;
  file?: File;
  duration?: number;
  lastPosition?: number;
  thumbnail?: string;
  subtitlesUrl?: string;
  subtitlesName?: string;
  createdAt: number;
}

@Component({
  selector: 'app-local-player',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  template: `
    <div class="min-h-screen bg-slate-950 text-white flex flex-col font-sans select-none" dir="rtl">
      
      <!-- Top Navigation Header -->
      <header class="h-16 bg-slate-900/80 border-b border-white/10 px-6 flex items-center justify-between shrink-0 backdrop-blur-md z-20">
        <div class="flex items-center gap-3">
          <div class="p-2.5 bg-gradient-to-tr from-indigo-600 to-teal-500 rounded-2xl text-white shadow-lg shadow-indigo-500/20">
            <lucide-icon [img]="Film" class="size-6"></lucide-icon>
          </div>
          <div>
            <h1 class="text-base font-black tracking-tight text-white flex items-center gap-2">
              <span>مشغل الوسائط والفيديوهات المحلي</span>
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 font-mono">Offline Cinema ⚡</span>
            </h1>
            <p class="text-[11px] text-slate-400">شغّل الفيديوهات والصوتيات من جهازك بجودة فائقة وبدون استهلاك للإنترنت.</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- File Picker Buttons -->
          <label class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20">
            <lucide-icon [img]="FolderOpen" class="size-4"></lucide-icon>
            <span>فتح ملفات من الجهاز</span>
            <input type="file" multiple accept="video/*,audio/*" (change)="onFilesSelected($event)" class="hidden" />
          </label>

          <button *ngIf="playlist().length > 0" (click)="clearPlaylist()" class="p-2 text-slate-400 hover:text-red-400 hover:bg-white/5 rounded-xl transition" title="تفريغ القائمة">
            <lucide-icon [img]="Trash2" class="size-4"></lucide-icon>
          </button>
        </div>
      </header>

      <!-- Main Layout -->
      <div class="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        <!-- Left / Center: Video Stage & Player -->
        <main class="flex-1 flex flex-col bg-black relative justify-center items-center overflow-hidden min-h-[50vh] lg:min-h-0">
          
          <!-- Ambient Glow Light behind active video -->
          <div *ngIf="activeItem() && isPlaying()" class="absolute inset-0 bg-indigo-500/10 blur-[120px] pointer-events-none transition-all duration-1000"></div>

          <!-- Video Element & Canvas Container -->
          <div *ngIf="activeItem(); else dropzoneTmpl" class="relative w-full h-full flex items-center justify-center group overflow-hidden" (mousemove)="onMouseMove()">
            
            <video 
              #videoPlayer
              [src]="activeItem()?.blobUrl"
              class="w-full h-full max-h-[85vh] object-contain cursor-pointer"
              (timeupdate)="onTimeUpdate()"
              (loadedmetadata)="onLoadedMetadata()"
              (ended)="onMediaEnded()"
              (play)="isPlaying.set(true)"
              (pause)="isPlaying.set(false)"
              (click)="togglePlay()"
              playsinline>
              <!-- Subtitles Track if provided -->
              <track *ngIf="activeItem()?.subtitlesUrl" [src]="activeItem()?.subtitlesUrl" kind="subtitles" srclang="ar" label="العربية" default>
            </video>

            <!-- Custom Center Play/Pause Pulsing Icon -->
            <div *ngIf="!isPlaying()" class="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div class="size-20 rounded-full bg-indigo-600/80 backdrop-blur-md flex items-center justify-center text-white shadow-2xl animate-pulse">
                <lucide-icon [img]="Play" class="size-10 fill-white translate-x-0.5"></lucide-icon>
              </div>
            </div>

            <!-- Top Overlay Info Bar (visible on hover) -->
            <div class="absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between z-10 transition-opacity duration-300"
                 [class.opacity-0]="!showControls() && isPlaying()"
                 [class.opacity-100]="showControls() || !isPlaying()">
              <div class="flex items-center gap-3">
                <span class="px-2.5 py-1 rounded-lg bg-white/10 text-[11px] font-mono font-bold text-teal-300">
                  {{ activeItem()?.type === 'video' ? '🎬 فيديو' : '🎵 صوت' }}
                </span>
                <h2 class="text-sm font-bold text-white truncate max-w-md">{{ activeItem()?.name }}</h2>
              </div>

              <!-- Quick Top Actions: Snapshot & Subtitles -->
              <div class="flex items-center gap-2">
                <label class="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white cursor-pointer transition text-xs flex items-center gap-1.5" title="إضافة ملف ترجمة (.srt / .vtt)">
                  <lucide-icon [img]="Subtitles" class="size-4 text-amber-400"></lucide-icon>
                  <span class="hidden sm:inline">ترجمة</span>
                  <input type="file" accept=".srt,.vtt" (change)="onSubtitlesSelected($event)" class="hidden" />
                </label>

                <button (click)="takeSnapshot()" class="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition" title="التقاط صورة من الفيديو">
                  <lucide-icon [img]="Camera" class="size-4 text-emerald-400"></lucide-icon>
                </button>
              </div>
            </div>

            <!-- Bottom Custom Control Bar -->
            <div class="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col gap-2.5 z-10 transition-opacity duration-300"
                 [class.opacity-0]="!showControls() && isPlaying()"
                 [class.opacity-100]="showControls() || !isPlaying()">
              
              <!-- Progress Timeline Slider -->
              <div class="flex items-center gap-3">
                <span class="text-xs font-mono text-slate-300 min-w-12 text-left">{{ formatTime(currentTime()) }}</span>
                <input 
                  type="range" 
                  min="0" 
                  [max]="duration() || 100" 
                  [value]="currentTime()" 
                  (input)="seek($event)"
                  class="flex-1 h-1.5 bg-white/20 rounded-lg accent-indigo-500 cursor-pointer hover:h-2 transition-all" />
                <span class="text-xs font-mono text-slate-400 min-w-12">{{ formatTime(duration()) }}</span>
              </div>

              <!-- Bottom Control Buttons -->
              <div class="flex items-center justify-between">
                
                <!-- Play / Pause / Skip -->
                <div class="flex items-center gap-2">
                  <button (click)="playPrevious()" class="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition" title="السابق">
                    <lucide-icon [img]="SkipBack" class="size-5"></lucide-icon>
                  </button>

                  <button (click)="togglePlay()" class="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl shadow-lg transition" [title]="isPlaying() ? 'إيقاف مؤقت' : 'تشغيل'">
                    <lucide-icon [img]="isPlaying() ? Pause : Play" class="size-5" [class.fill-white]="isPlaying()"></lucide-icon>
                  </button>

                  <button (click)="playNext()" class="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition" title="التالي">
                    <lucide-icon [img]="SkipForward" class="size-5"></lucide-icon>
                  </button>

                  <!-- Volume Controls -->
                  <div class="flex items-center gap-1.5 mr-2">
                    <button (click)="toggleMute()" class="p-2 text-slate-300 hover:text-white rounded-xl">
                      <lucide-icon [img]="isMuted() || volume() === 0 ? VolumeX : Volume2" class="size-5"></lucide-icon>
                    </button>
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.05" 
                      [value]="isMuted() ? 0 : volume()" 
                      (input)="setVolume($event)" 
                      class="w-20 h-1.5 bg-white/20 rounded-lg accent-indigo-500 cursor-pointer" />
                  </div>
                </div>

                <!-- Right Side Control Options -->
                <div class="flex items-center gap-2">
                  
                  <!-- Speed Selector -->
                  <div class="relative">
                    <button (click)="toggleSpeedMenu()" class="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-mono font-bold text-teal-300">
                      {{ playbackRate() }}x
                    </button>
                    <div *ngIf="showSpeedMenu()" class="absolute bottom-full mb-2 left-0 bg-slate-900 border border-white/10 rounded-2xl p-2 shadow-2xl flex flex-col gap-1 z-30">
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
                  <button (click)="toggleFullscreen()" class="p-2 text-slate-300 hover:text-white rounded-xl transition" title="ملء الشاشة">
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
              class="w-full max-w-xl m-6 p-12 border-2 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center text-center transition-all duration-300 cursor-pointer"
              [ngClass]="isDragging() ? 'border-indigo-500 bg-indigo-500/10 scale-105' : 'border-white/10 bg-slate-900/50 hover:border-indigo-500/30'">
              
              <div class="size-20 rounded-3xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-6 shadow-xl">
                <lucide-icon [img]="Film" class="size-10"></lucide-icon>
              </div>

              <h3 class="text-xl font-black text-white mb-2">اسحب وأفلت الفيديوهات هنا</h3>
              <p class="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
                يدعم تشغيل ملفات الفيديو والصوت المحلية (.mp4, .mkv, .webm, .mov, .mp3, .wav) مباشرة وبدون استهلاك للإنترنت أو الذاكرة.
              </p>

              <label class="px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 text-white font-bold rounded-2xl text-xs shadow-xl shadow-indigo-600/20 transition cursor-pointer flex items-center gap-2">
                <lucide-icon [img]="HardDrive" class="size-4"></lucide-icon>
                <span>اختر ملفات من جهازك</span>
                <input type="file" multiple accept="video/*,audio/*" (change)="onFilesSelected($event)" class="hidden" />
              </label>
            </div>
          </ng-template>

        </main>

        <!-- Right Side: Playlist & Local Files Queue -->
        <aside class="w-full lg:w-96 bg-slate-900 border-r border-white/10 flex flex-col shrink-0 h-80 lg:h-auto overflow-hidden">
          
          <div class="p-4 border-b border-white/10 flex items-center justify-between bg-slate-900/90">
            <div class="flex items-center gap-2">
              <lucide-icon [img]="ListMusic" class="size-4 text-indigo-400"></lucide-icon>
              <h3 class="text-xs font-black text-white">قائمة التشغيل المحلية ({{ playlist().length }})</h3>
            </div>

            <label class="text-[11px] text-indigo-400 hover:underline cursor-pointer font-bold">
              + إضافة ملف
              <input type="file" multiple accept="video/*,audio/*" (change)="onFilesSelected($event)" class="hidden" />
            </label>
          </div>

          <!-- Playlist Items List -->
          <div class="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            @if (playlist().length > 0) {
              @for (item of playlist(); track item.id; let idx = $index) {
                <div 
                  (click)="playItem(item)" 
                  class="p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 group relative"
                  [ngClass]="activeItem()?.id === item.id ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg' : 'bg-black/30 border-white/5 hover:border-white/20 text-slate-300'">
                  
                  <!-- Index / Play indicator -->
                  <div class="size-8 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                    <span *ngIf="activeItem()?.id !== item.id" class="text-xs font-mono text-slate-400">{{ idx + 1 }}</span>
                    <lucide-icon *ngIf="activeItem()?.id === item.id" [img]="isPlaying() ? Pause : Play" class="size-4 text-indigo-400"></lucide-icon>
                  </div>

                  <!-- Details -->
                  <div class="min-w-0 flex-1">
                    <p class="text-xs font-bold truncate group-hover:text-indigo-300 transition-colors">{{ item.name }}</p>
                    <p class="text-[10px] text-slate-500 font-mono">{{ formatFileSize(item.size) }} • {{ item.type }}</p>
                  </div>

                  <!-- Remove Item from Queue -->
                  <button (click)="$event.stopPropagation(); removeItem(item.id)" class="text-slate-500 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity" title="حذف من القائمة">
                    <lucide-icon [img]="Trash2" class="size-3.5"></lucide-icon>
                  </button>
                </div>
              }
            } @else {
              <div class="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500">
                <lucide-icon [img]="Film" class="size-10 mb-2 opacity-30"></lucide-icon>
                <p class="text-xs font-bold text-slate-400">القائمة فارغة</p>
                <p class="text-[10px] text-slate-500 mt-1">افتح ملفات فيديو من جهازك لبدء التشغيل التلقائي.</p>
              </div>
            }
          </div>

        </aside>

      </div>

    </div>
  `
})
export class LocalPlayerComponent implements OnInit, OnDestroy {
  sanitizer = inject(DomSanitizer);
  indexedDb = inject(IndexedDBService);

  @ViewChild('videoPlayer') videoPlayer?: ElementRef<HTMLVideoElement>;

  playlist = signal<LocalMediaItem[]>([]);
  activeItem = signal<LocalMediaItem | null>(null);
  
  isPlaying = signal<boolean>(false);
  currentTime = signal<number>(0);
  duration = signal<number>(0);
  volume = signal<number>(1.0);
  isMuted = signal<boolean>(false);
  playbackRate = signal<number>(1.0);
  isLooping = signal<boolean>(false);
  isFullscreen = signal<boolean>(false);
  isDragging = signal<boolean>(false);

  showControls = signal<boolean>(true);
  showSpeedMenu = signal<boolean>(false);
  private controlsTimeout: any = null;

  speedRates = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

  // Icons
  Play = Play;
  Pause = Pause;
  Volume2 = Volume2;
  VolumeX = VolumeX;
  Maximize2 = Maximize2;
  Minimize2 = Minimize2;
  RotateCcw = RotateCcw;
  SkipForward = SkipForward;
  SkipBack = SkipBack;
  FolderOpen = FolderOpen;
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

  ngOnInit() {
    this.resetControlsTimer();
  }

  ngOnDestroy() {
    if (this.controlsTimeout) clearTimeout(this.controlsTimeout);
    // Cleanup any created object URLs
    for (const item of this.playlist()) {
      if (item.blobUrl && item.blobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(item.blobUrl);
      }
    }
  }

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.addFilesToPlaylist(Array.from(input.files));
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

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(false);
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.addFilesToPlaylist(Array.from(event.dataTransfer.files));
    }
  }

  addFilesToPlaylist(files: File[]) {
    const validMediaFiles = files.filter(f => f.type.startsWith('video/') || f.type.startsWith('audio/'));
    if (validMediaFiles.length === 0) return;

    const newItems: LocalMediaItem[] = validMediaFiles.map(file => ({
      id: 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      name: file.name,
      size: file.size,
      type: file.type.startsWith('audio/') ? 'audio' : 'video',
      mimeType: file.type,
      blobUrl: URL.createObjectURL(file),
      file: file,
      createdAt: Date.now()
    }));

    const current = this.playlist();
    this.playlist.set([...current, ...newItems]);

    // If no active video, auto-start first one
    if (!this.activeItem() && newItems.length > 0) {
      this.playItem(newItems[0]);
    }
  }

  playItem(item: LocalMediaItem) {
    this.activeItem.set(item);
    setTimeout(() => {
      if (this.videoPlayer?.nativeElement) {
        this.videoPlayer.nativeElement.playbackRate = this.playbackRate();
        this.videoPlayer.nativeElement.play().then(() => {
          this.isPlaying.set(true);
        }).catch(() => {});
      }
    }, 50);
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

  onTimeUpdate() {
    const vid = this.videoPlayer?.nativeElement;
    if (vid) {
      this.currentTime.set(vid.currentTime);
    }
  }

  onLoadedMetadata() {
    const vid = this.videoPlayer?.nativeElement;
    if (vid) {
      this.duration.set(vid.duration);
      vid.volume = this.volume();
    }
  }

  onMediaEnded() {
    if (this.isLooping()) {
      const vid = this.videoPlayer?.nativeElement;
      if (vid) {
        vid.currentTime = 0;
        vid.play();
      }
    } else {
      this.playNext();
    }
  }

  playNext() {
    const list = this.playlist();
    const cur = this.activeItem();
    if (!cur || list.length <= 1) return;
    const curIdx = list.findIndex(i => i.id === cur.id);
    const nextIdx = (curIdx + 1) % list.length;
    this.playItem(list[nextIdx]);
  }

  playPrevious() {
    const list = this.playlist();
    const cur = this.activeItem();
    if (!cur || list.length <= 1) return;
    const curIdx = list.findIndex(i => i.id === cur.id);
    const prevIdx = (curIdx - 1 + list.length) % list.length;
    this.playItem(list[prevIdx]);
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
    this.volume.set(val);
    const vid = this.videoPlayer?.nativeElement;
    if (vid) {
      vid.volume = val;
      this.isMuted.set(val === 0);
    }
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
  }

  setSpeed(rate: number) {
    this.playbackRate.set(rate);
    const vid = this.videoPlayer?.nativeElement;
    if (vid) {
      vid.playbackRate = rate;
    }
    this.showSpeedMenu.set(false);
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

  onSubtitlesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const subFile = input.files[0];
      const cur = this.activeItem();
      if (cur) {
        const subUrl = URL.createObjectURL(subFile);
        cur.subtitlesUrl = subUrl;
        cur.subtitlesName = subFile.name;
        this.activeItem.set({ ...cur });
      }
    }
  }

  takeSnapshot() {
    const vid = this.videoPlayer?.nativeElement;
    if (!vid) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = vid.videoWidth || 1280;
      canvas.height = vid.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `snapshot_${this.activeItem()?.name || 'video'}_${Math.floor(this.currentTime())}s.png`;
        a.click();
      }
    } catch (e) {
      console.warn('Snapshot failed:', e);
    }
  }

  removeItem(id: string) {
    const current = this.playlist();
    const updated = current.filter(i => i.id !== id);
    this.playlist.set(updated);
    if (this.activeItem()?.id === id) {
      if (updated.length > 0) {
        this.playItem(updated[0]);
      } else {
        this.activeItem.set(null);
        this.isPlaying.set(false);
      }
    }
  }

  clearPlaylist() {
    this.playlist.set([]);
    this.activeItem.set(null);
    this.isPlaying.set(false);
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
      }
    }, 3000);
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

  // Keyboard Shortcuts: Space (Play/Pause), Left/Right (Seek), Up/Down (Volume), F (Fullscreen)
  @HostListener('window:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent) {
    const tag = (event.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    if (event.key === ' ' || event.code === 'Space') {
      event.preventDefault();
      this.togglePlay();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      const vid = this.videoPlayer?.nativeElement;
      if (vid) vid.currentTime = Math.min(vid.duration, vid.currentTime + 5);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      const vid = this.videoPlayer?.nativeElement;
      if (vid) vid.currentTime = Math.max(0, vid.currentTime - 5);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.volume.update(v => Math.min(1, v + 0.1));
      if (this.videoPlayer?.nativeElement) this.videoPlayer.nativeElement.volume = this.volume();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.volume.update(v => Math.max(0, v - 0.1));
      if (this.videoPlayer?.nativeElement) this.videoPlayer.nativeElement.volume = this.volume();
    } else if (event.key === 'f' || event.key === 'F') {
      event.preventDefault();
      this.toggleFullscreen();
    }
  }
}
