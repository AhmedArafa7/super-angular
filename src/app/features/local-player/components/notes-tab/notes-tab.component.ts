import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Pin, Trash2, Settings, Music, Image as ImageIcon, Copy, Check } from 'lucide-angular';
import { VideoNote } from '../../models/local-player.models';

@Component({
  selector: 'app-notes-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  host: { class: 'flex-1 flex flex-col min-h-0 overflow-hidden' },
  template: `
    <!-- Notes Scrollable List -->
    <div class="flex-1 overflow-y-auto space-y-3 pr-1 pb-6 custom-scrollbar min-h-0" style="scrollbar-gutter: stable;">
      @if (sortedNotes().length > 0) {
        @for (note of sortedNotes(); track note.id) {
           <div class="p-3.5 rounded-2xl bg-black/40 border transition-all flex flex-col gap-2.5 cursor-pointer hover:border-teal-500/50 group"
                (click)="noteClick.emit(note)"
                [ngClass]="note.videoId === currentVideoId() ? 'border-teal-500/40' : 'border-white/10'">
             
             <div class="flex items-center justify-between gap-2">
               <div class="flex items-center gap-1.5 flex-wrap">
                  <span *ngIf="note.isPinned" class="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">📌 مثبتة</span>
                  <span *ngIf="note.images.length > 0" class="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">📷 OCR / لقطة</span>
                  <span *ngIf="note.videoId === currentVideoId()" class="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 font-bold">فيديو حالي</span>
                  <span *ngIf="note.videoId === null" class="text-[10px] px-1.5 py-0.5 rounded bg-slate-500/20 text-slate-400 font-bold">بدون فيديو</span>
                  <span *ngIf="note.videoName" class="text-[10px] text-slate-400 truncate max-w-[120px]">{{ note.videoName }}</span>
               </div>
               <div class="flex items-center gap-1 shrink-0" (click)="$event.stopPropagation()">
                  <button (click)="copyNoteText(note, $event)" class="p-1.5 text-slate-400 hover:text-teal-300 hover:bg-white/10 rounded-lg transition" [title]="copiedNoteId === note.id ? 'تم النسخ!' : 'نسخ النص'">
                    <lucide-icon [img]="copiedNoteId === note.id ? Check : Copy" class="size-3.5" [class.text-teal-400]="copiedNoteId === note.id"></lucide-icon>
                  </button>
                  <button (click)="editNote.emit(note)" class="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-white/10 rounded-lg transition" title="تعديل"><lucide-icon [img]="Settings" class="size-3.5"></lucide-icon></button>
                  <button (click)="deleteNote.emit(note.id)" class="p-1.5 text-slate-400 hover:text-red-400 hover:bg-white/10 rounded-lg transition" title="حذف"><lucide-icon [img]="Trash2" class="size-3.5"></lucide-icon></button>
                  <button (click)="togglePin.emit(note)" class="p-1.5 text-slate-400 hover:text-amber-300 hover:bg-white/10 rounded-lg transition" title="تثبيت"><lucide-icon [img]="Pin" class="size-3.5"></lucide-icon></button>
               </div>
             </div>

            <!-- Note Text with scrollable/readable pre-wrap formatting -->
            <div class="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed select-text font-mono bg-black/40 p-3 rounded-xl border border-white/5" 
                 [style.color]="note.textColor || 'inherit'"
                 dir="auto">
              {{ note.text }}
            </div>
            
            <div *ngIf="note.timestampInVideo !== null" class="text-[10px] text-teal-400 font-mono">🕒 {{ formatTime(note.timestampInVideo) }}</div>
            
            <!-- Images -->
            <div *ngIf="note.images.length > 0" class="flex gap-2 overflow-x-auto">
              @for (img of note.images; track img.id) {
                  <img [src]="img.dataUrl" class="size-16 object-cover rounded-lg cursor-pointer hover:opacity-80 transition" (click)="imageClick.emit()" />
              }
            </div>

            <!-- Audio -->
            <div *ngIf="note.audio">
              <audio controls [src]="note.audio.dataUrl" class="h-8 w-full"></audio>
            </div>
          </div>
        }
      } @else {
        <div class="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
          <p class="text-xs font-bold text-slate-400">لا توجد ملاحظات</p>
        </div>
      }
    </div>
  `
})
export class NotesTabComponent {
  readonly Settings = Settings;
  readonly Trash2 = Trash2;
  readonly Pin = Pin;
  readonly Copy = Copy;
  readonly Check = Check;

  copiedNoteId: string | null = null;

  async copyNoteText(note: VideoNote, event?: Event) {
    if (event) event.stopPropagation();
    if (!note.text) return;
    try {
      await navigator.clipboard.writeText(note.text);
      this.copiedNoteId = note.id;
      setTimeout(() => {
        if (this.copiedNoteId === note.id) this.copiedNoteId = null;
      }, 2000);
    } catch (e) {}
  }

  allNotes = input<VideoNote[]>([]);
  currentVideoId = input<string | null>(null);
  
  editNote = output<VideoNote>();
  deleteNote = output<string>();
  togglePin = output<VideoNote>();
  imageClick = output<void>();
  noteClick = output<VideoNote>();

  sortedNotes = computed(() => {
    return [...this.allNotes()].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      if ((a.videoId === this.currentVideoId()) !== (b.videoId === this.currentVideoId())) return a.videoId === this.currentVideoId() ? -1 : 1;
      return b.updatedAt - a.updatedAt;
    });
  });

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
}
