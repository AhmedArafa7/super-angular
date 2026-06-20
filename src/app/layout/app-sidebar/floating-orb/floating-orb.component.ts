import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarService } from '../../../core/sidebar.service';
import { LucideDynamicIcon } from '@lucide/angular';
import { DragDropModule, CdkDragEnd } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-floating-orb',
  standalone: true,
  imports: [CommonModule, LucideDynamicIcon, DragDropModule],
  template: `
    <div cdkDrag 
         [cdkDragFreeDragPosition]="sidebar.floatingPos()"
         (cdkDragEnded)="onDragEnded($event)"
         class="fixed z-[100] flex items-center justify-center w-14 h-14 rounded-full bg-indigo-600/90 backdrop-blur-xl shadow-2xl border border-white/20 cursor-move hover:scale-105 transition-transform active:scale-95 group">
         
      <svg lucideIcon="zap" class="w-6 h-6 text-white group-hover:animate-pulse"></svg>
      
      <!-- Quick actions floating around the orb -->
      <button class="absolute -top-10 bg-slate-800 text-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all group-hover:-translate-y-2 hover:bg-slate-700"
              (click)="restoreSidebar()">
        <svg lucideIcon="layout-panel-left" class="w-4 h-4"></svg>
      </button>
    </div>
  `
})
export class FloatingOrbComponent {
  sidebar = inject(SidebarService);

  onDragEnded(event: CdkDragEnd) {
    const transform = event.source.getFreeDragPosition();
    this.sidebar.setFloatingPos({ x: transform.x, y: transform.y });
  }

  restoreSidebar() {
    this.sidebar.setPosition('left');
  }
}
