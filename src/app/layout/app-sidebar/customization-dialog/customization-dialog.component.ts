import { Component, inject, OnInit, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarService } from '../../../core/sidebar.service';
import { ALL_NAV_ITEMS, NavItem } from '../../../core/nav-items';
import { CustomModuleStorageService } from '../../../features/ai-module-builder/custom-module-viewer.component';
import { LucideDynamicIcon } from '@lucide/angular';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-sidebar-customization-dialog',
  standalone: true,
  imports: [CommonModule, LucideDynamicIcon, DragDropModule],
  template: `
    <div class="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
      <div class="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        <!-- Header -->
        <div class="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div class="flex items-center gap-2">
            <svg lucideIcon="sliders-horizontal" class="w-5 h-5 text-indigo-400"></svg>
            <h2 class="text-lg font-bold text-white">تخصيص الشريط الجانبي</h2>
          </div>
          <button (click)="close()" class="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors">
            <svg lucideIcon="x" class="w-5 h-5"></svg>
          </button>
        </div>
        
        <!-- Content List -->
        <div class="p-4 overflow-y-auto flex-1">
          <p class="text-sm text-slate-400 mb-4">اسحب العناصر لإعادة ترتيبها أو انقر لتثبيتها، ثم اضغط على "حفظ التغييرات".</p>
          
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
                        class="p-2 rounded-lg transition-colors cursor-pointer hover:bg-white/10"
                        [title]="isPinned(item.id) ? 'إلغاء التثبيت' : 'تثبيت في القائمة'">
                  <svg [lucideIcon]="isPinned(item.id) ? 'pin-off' : 'pin'" 
                       [ngClass]="isPinned(item.id) ? 'text-indigo-400' : 'text-slate-500'" 
                       class="w-5 h-5"></svg>
                </button>
              </div>
            }
          </div>
        </div>

        <!-- Footer Action Toolbar with Save Button -->
        <div class="p-4 border-t border-white/10 bg-slate-950 flex items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            @if (hasUnsavedChanges()) {
              <span class="flex h-2 w-2 relative">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span class="text-xs text-amber-400 font-medium">تغييرات غير محفوظة</span>
            } @else if (showSavedToast()) {
              <span class="text-xs text-green-400 font-medium flex items-center gap-1">
                <svg lucideIcon="check-circle-2" class="w-3.5 h-3.5"></svg>
                تم الحفظ بنجاح!
              </span>
            }
          </div>

          <div class="flex items-center gap-2">
            <button (click)="close()" class="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all cursor-pointer">
              إلغاء
            </button>
            <button (click)="saveChanges()" 
                    [disabled]="!hasUnsavedChanges()"
                    [ngClass]="hasUnsavedChanges() ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 cursor-pointer' : 'bg-slate-800 text-slate-500 cursor-not-allowed'"
                    class="px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2">
              <svg lucideIcon="save" class="w-4 h-4"></svg>
              <span>حفظ التغييرات</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  `
})
export class CustomizationDialogComponent implements OnInit {
  sidebar = inject(SidebarService);
  moduleStorage = inject(CustomModuleStorageService);
  @Output() onClose = new EventEmitter<void>();

  sortedItems: NavItem[] = [];
  draftPinnedIds = signal<string[]>([]);
  hasUnsavedChanges = signal<boolean>(false);
  showSavedToast = signal<boolean>(false);

  get allAvailableItems(): NavItem[] {
    const customModules: NavItem[] = this.moduleStorage.modules()
      .filter(mod => !mod.id.startsWith('game_') && !mod.id.startsWith('custom_game_') && !mod.title.includes('🎮'))
      .map(mod => ({
        id: `custom-${mod.id}`,
        label: mod.title,
        icon: 'sparkles',
        restricted: false,
        status: 'NEW' as const,
        route: `custom-module/${mod.id}`
      }));
    return [...ALL_NAV_ITEMS, ...customModules];
  }

  ngOnInit() {
    const pinned = this.sidebar.pinnedItems();
    this.draftPinnedIds.set([...pinned]);
    
    const all = this.allAvailableItems;
    const pinnedItemsObjects = pinned.map(id => all.find(i => i.id === id)).filter(Boolean) as NavItem[];
    const unpinnedItems = all.filter(i => !pinned.includes(i.id));
    this.sortedItems = [...pinnedItemsObjects, ...unpinnedItems];
  }

  isPinned(id: string): boolean {
    return this.draftPinnedIds().includes(id);
  }

  togglePin(id: string) {
    const current = this.draftPinnedIds();
    if (current.includes(id)) {
      this.draftPinnedIds.set(current.filter(i => i !== id));
    } else {
      this.draftPinnedIds.set([...current, id]);
    }
    this.hasUnsavedChanges.set(true);
  }

  drop(event: CdkDragDrop<NavItem[]>) {
    moveItemInArray(this.sortedItems, event.previousIndex, event.currentIndex);
    this.hasUnsavedChanges.set(true);
  }

  saveChanges() {
    const newPinnedOrder = this.sortedItems
      .filter(item => this.isPinned(item.id))
      .map(item => item.id);
      
    this.sidebar.reorderPinnedItems(newPinnedOrder);
    this.sidebar.saveStateExplicitly();
    this.hasUnsavedChanges.set(false);
    this.showSavedToast.set(true);
    
    setTimeout(() => {
      this.close();
    }, 600);
  }

  close() {
    this.onClose.emit();
  }
}
