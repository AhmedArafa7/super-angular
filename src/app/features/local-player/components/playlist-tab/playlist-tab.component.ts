import { Component, input, output, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Search, ArrowUpDown, Trash2, Film, FolderPlus, Plus, Play, Pause, X } from 'lucide-angular';
import { LocalMediaItem } from '../../models/local-player.models';

@Component({
  selector: 'app-playlist-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  host: { class: 'flex-1 flex flex-col overflow-hidden' },
  template: `
    <!-- Playlist Header -->
    <div class="p-3.5 border-b border-white/10 bg-slate-900/90 flex flex-col gap-2.5">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span *ngIf="playlist().length > 0" class="text-[10px] px-1.5 py-0.5 bg-teal-500/20 text-teal-300 rounded font-mono font-bold" title="محفوظ دائماً محلياً">
            💾 دائم محلياً
          </span>
        </div>

        <!-- Quick action links -->
        <div class="flex items-center gap-2">
          <label class="text-[11px] text-teal-400 hover:text-teal-300 cursor-pointer font-bold flex items-center gap-1 hover:underline">
            <lucide-icon [img]="FolderPlus" class="size-3.5"></lucide-icon>
            <span>+ مجلد</span>
            <input type="file" webkitdirectory directory multiple (change)="addFolder.emit($event)" class="hidden" />
          </label>
          <span class="text-slate-600">|</span>
          <label class="text-[11px] text-indigo-400 hover:text-indigo-300 cursor-pointer font-bold flex items-center gap-1 hover:underline">
            <lucide-icon [img]="Plus" class="size-3.5"></lucide-icon>
            <span>+ ملف</span>
            <input type="file" multiple accept="video/*,audio/*,.mkv,.avi,.wmv,.flv,.m4v,.ts,.mp3,.wav,.aac,.ogg,.flac,.m4a" (change)="addFiles.emit($event)" class="hidden" />
          </label>
        </div>
      </div>

      <!-- Search & Sort Bar in Playlist -->
      <div *ngIf="playlist().length > 0" class="flex items-center gap-1.5">
        <div class="relative flex-1">
          <input 
            type="text" 
            [ngModel]="searchQuery()" 
            (ngModelChange)="searchQuery.set($event)"
            placeholder="ابحث في الدروس أو الفيديوهات..." 
            class="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500 pr-8" />
          <lucide-icon [img]="Search" class="size-3.5 text-slate-500 absolute right-2.5 top-2.5"></lucide-icon>
          <button *ngIf="searchQuery()" (click)="searchQuery.set('')" class="absolute left-2.5 top-2 text-slate-500 hover:text-white">
            <lucide-icon [img]="X" class="size-3"></lucide-icon>
          </button>
        </div>

        <button 
          (click)="sortChange.emit()" 
          class="p-1.5 bg-black/40 hover:bg-white/10 border border-white/10 rounded-xl text-slate-400 hover:text-white transition" 
          [title]="sortOrder() === 'asc' ? 'الترتيب: تصاعدي (1-9)' : 'الترتيب: تنازلي (9-1)'">
          <lucide-icon [img]="ArrowUpDown" class="size-3.5"></lucide-icon>
        </button>
      </div>
    </div>

    <!-- Playlist Items List -->
    <div class="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
      @if (displayedPlaylist().length > 0) {
        @for (item of displayedPlaylist(); track item.id; let idx = $index) {
          <div 
            (click)="selectItem.emit(item)" 
            class="p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 group relative"
            [ngClass]="activeItemId() === item.id ? 'bg-gradient-to-r from-teal-500/20 to-indigo-500/20 border-teal-500/60 text-white shadow-lg shadow-teal-500/10' : 'bg-black/30 border-white/5 hover:border-white/20 text-slate-300'">
            
            <!-- Index / Play indicator -->
            <div class="size-8 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
              <span *ngIf="activeItemId() !== item.id" class="text-xs font-mono text-slate-400">{{ idx + 1 }}</span>
              <lucide-icon *ngIf="activeItemId() === item.id" [img]="isPlaying() ? Pause : Play" class="size-4 text-teal-400"></lucide-icon>
            </div>

            <!-- Details -->
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <p class="text-xs font-bold truncate group-hover:text-teal-300 transition-colors" [title]="item.name">{{ item.name }}</p>
                <span *ngIf="notesCountByVideoId()[item.id] > 0" class="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold shrink-0">
                    {{ notesCountByVideoId()[item.id] }}
                </span>
              </div>
              <div class="flex items-center gap-1.5 mt-0.5">
                <span *ngIf="item.folderName" class="text-[9px] px-1.5 py-0.2 rounded bg-white/10 text-teal-300 font-mono truncate max-w-[120px]" [title]="item.folderName">
                  📁 {{ item.folderName }}
                </span>
                <span class="text-[10px] text-slate-500 font-mono">{{ formatTime(item.duration || 0) + ' • ' }}{{ formatFileSize(item.size) }}</span>
                <span *ngIf="item.lastPosition && item.lastPosition > 10" class="text-[9px] px-1 bg-indigo-500/20 text-indigo-300 rounded font-mono">
                  {{ formatTime(item.lastPosition) }}
                </span>
              </div>
            </div>

            <!-- Remove Item -->
            <button (click)="$event.stopPropagation(); removeItem.emit(item.id)" class="text-slate-500 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity" title="حذف">
              <lucide-icon [img]="Trash2" class="size-3.5"></lucide-icon>
            </button>
          </div>
        }
      } @else {
        <div class="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500">
          <lucide-icon [img]="Film" class="size-10 mb-2 opacity-30"></lucide-icon>
          <p class="text-xs font-bold text-slate-400">القائمة فارغة</p>
        </div>
      }
    </div>

    <!-- Bottom Summary Bar -->
    <div *ngIf="playlist().length > 0" class="p-2.5 bg-slate-950/60 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400 px-4">
      <span>الإجمالي: <b class="text-white font-mono">{{ playlist().length }} فيديو</b></span>
      <span class="text-slate-500 font-mono">{{ formatFileSize(totalPlaylistSize()) }}</span>
    </div>
  `
})
export class PlaylistTabComponent {
  Play = Play;
  Pause = Pause;
  Search = Search;
  ArrowUpDown = ArrowUpDown;
  Trash2 = Trash2;
  Film = Film;
  FolderPlus = FolderPlus;
  Plus = Plus;
  X = X;

  playlist = input<LocalMediaItem[]>([]);
  displayedPlaylist = input<LocalMediaItem[]>([]);
  activeItemId = input<string | null>(null);
  isPlaying = input<boolean>(false);
  sortOrder = input<'asc' | 'desc'>('asc');
  searchQuery = model<string>('');
  totalPlaylistSize = input<number>(0);
  notesCountByVideoId = input<Record<string, number>>({});

  selectItem = output<LocalMediaItem>();
  removeItem = output<string>();
  sortChange = output<void>();
  addFolder = output<Event>();
  addFiles = output<Event>();

  formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  formatFileSize(bytes: number): string {
    if (!bytes) return '0 B';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1000) return (mb / 1024).toFixed(1) + ' GB';
    return mb.toFixed(1) + ' MB';
  }
}
