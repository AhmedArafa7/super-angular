import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-history-toolbar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center justify-between bg-[#161b22] border border-[#30363d] rounded-xl px-4 py-3 shadow-md">
      <div class="flex items-center gap-2">
        <button 
          (click)="undo.emit()" 
          [disabled]="!canUndo"
          class="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all border border-[#30363d] cursor-pointer">
          ↩️ تراجع
        </button>
        <button 
          (click)="redo.emit()" 
          [disabled]="!canRedo"
          class="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all border border-[#30363d] cursor-pointer">
          ↪️ إعادة
        </button>
        <button 
          (click)="openHistory.emit()" 
          class="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all border border-indigo-500/30 cursor-pointer">
          📜 السجل ({{ historyCount }})
        </button>
      </div>
      <span class="text-xs text-slate-400 font-mono">حفظ تلقائي مفعل</span>
    </div>
  `
})
export class HistoryToolbarComponent {
  @Input() canUndo = false;
  @Input() canRedo = false;
  @Input() historyCount = 0;

  @Output() undo = new EventEmitter<void>();
  @Output() redo = new EventEmitter<void>();
  @Output() openHistory = new EventEmitter<void>();
}
