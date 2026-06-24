import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ContextMenuItem } from './context-menu.model';

@Component({
  selector: 'app-context-menu',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl py-2 min-w-[220px] max-w-[300px] overflow-hidden animate-in fade-in zoom-in-95 duration-200" dir="rtl">
      @for (item of items; track item.id) {
        @if (item.isDivider) {
          <div class="h-px bg-white/10 my-1 mx-2"></div>
        } @else {
          <button 
            (click)="selectItem(item, $event)"
            class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-right transition-all group relative"
            [ngClass]="item.danger ? 'text-red-400 hover:text-white hover:bg-red-500/20' : 'text-slate-300 hover:text-white hover:bg-indigo-500/20'">
            
            <!-- Hover Glow Effect -->
            <div class="absolute inset-0 bg-gradient-to-r from-transparent to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                 [ngClass]="{'to-red-500/10': item.danger}"></div>
            
            @if (item.icon) {
              <lucide-icon [img]="item.icon" class="w-4 h-4 shrink-0 transition-transform group-hover:scale-110"
                           [ngClass]="item.danger ? 'text-red-400 group-hover:text-white' : 'text-indigo-400 group-hover:text-indigo-300'"></lucide-icon>
            }
            <span class="flex-1 font-medium truncate relative z-10">{{ item.label }}</span>
          </button>
        }
      }
    </div>
  `
})
export class ContextMenuComponent {
  @Input() items: ContextMenuItem[] = [];
  @Input() data: any;
  @Output() actionSelected = new EventEmitter<ContextMenuItem>();

  selectItem(item: ContextMenuItem, event: MouseEvent) {
    event.stopPropagation();
    if (item.action) {
      item.action();
    }
    this.actionSelected.emit(item);
  }
}
