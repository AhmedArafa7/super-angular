import { Component, inject, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarService } from '../../../core/sidebar.service';
import { ALL_NAV_ITEMS, NavItem } from '../../../core/nav-items';
import { LucideDynamicIcon } from '@lucide/angular';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-sidebar-customization-dialog',
  standalone: true,
  imports: [CommonModule, LucideDynamicIcon, DragDropModule],
  template: `
    <div class="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
      <div class="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div class="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 class="text-lg font-bold text-white">تخصيص الشريط الجانبي</h2>
          <button (click)="close()" class="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors">
            <svg lucideIcon="x" class="w-5 h-5"></svg>
          </button>
        </div>
        
        <div class="p-4 overflow-y-auto flex-1">
          <p class="text-sm text-slate-400 mb-4">اسحب العناصر لإعادة ترتيبها أو انقر لتثبيتها في الشريط الجانبي.</p>
          
          <div cdkDropList class="space-y-2" (cdkDropListDropped)="drop($event)">
            @for (item of sortedItems; track item.id) {
              <div cdkDrag class="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors cursor-move group">
                <div class="flex items-center gap-3">
                  <svg lucideIcon="grip-vertical" class="w-4 h-4 text-slate-500 opacity-50 group-hover:opacity-100"></svg>
                  <div class="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                    <svg [lucideIcon]="item.icon" class="w-4 h-4 text-indigo-400"></svg>
                  </div>
                  <span class="text-white font-medium">{{ item.label }}</span>
                </div>
                
                <button (click)="togglePin(item.id)" 
                        [disabled]="item.isPermanent"
                        [ngClass]="{'opacity-50 cursor-not-allowed': item.isPermanent}"
                        class="p-2 rounded-lg transition-colors">
                  <svg [lucideIcon]="isPinned(item.id) ? 'pin-off' : 'pin'" 
                       [ngClass]="isPinned(item.id) ? 'text-indigo-400' : 'text-slate-500'" 
                       class="w-5 h-5"></svg>
                </button>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `
})
export class CustomizationDialogComponent implements OnInit {
  sidebar = inject(SidebarService);
  @Output() onClose = new EventEmitter<void>();

  sortedItems: NavItem[] = [];

  ngOnInit() {
    const pinned = this.sidebar.pinnedItems();
    const pinnedItemsObjects = pinned.map(id => ALL_NAV_ITEMS.find(i => i.id === id)).filter(Boolean) as NavItem[];
    const unpinnedItems = ALL_NAV_ITEMS.filter(i => !pinned.includes(i.id as any));
    this.sortedItems = [...pinnedItemsObjects, ...unpinnedItems];
  }

  isPinned(id: string) {
    return this.sidebar.pinnedItems().includes(id as any) || ALL_NAV_ITEMS.find(i => i.id === id)?.isPermanent;
  }

  togglePin(id: string) {
    this.sidebar.togglePin(id as any);
  }

  drop(event: CdkDragDrop<NavItem[]>) {
    moveItemInArray(this.sortedItems, event.previousIndex, event.currentIndex);
    
    const newPinnedOrder = this.sortedItems
      .filter(item => this.isPinned(item.id))
      .map(item => item.id as any);
      
    this.sidebar.reorderPinnedItems(newPinnedOrder);
  }

  close() {
    this.onClose.emit();
  }
}
