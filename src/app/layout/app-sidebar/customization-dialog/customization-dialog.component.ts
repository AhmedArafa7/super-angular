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
      <div class="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
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
        <div class="p-6 overflow-y-auto flex-1 space-y-6">
          


          <div>
            <p class="text-sm text-slate-400 mb-3">اسحب العناصر لإعادة ترتيبها أو انقر لتثبيتها، ثم اضغط على "حفظ التغييرات".</p>
            
            <!-- Sort Mode Selector Card -->
            <div class="bg-slate-950/60 border border-white/10 rounded-2xl p-4 mb-4 space-y-2.5">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>⚡</span> نظام ترتيب الأقسام:
                </span>
                <span class="text-[10px] text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                  {{ sidebar.sortMode() === 'most-used' ? 'الأكثر استخداماً فوق' : (sidebar.sortMode() === 'alphabetical' ? 'أبجدي' : 'ترتيب مخصص / افتراضي') }}
                </span>
              </div>
              <div class="grid grid-cols-3 gap-2">
                <button (click)="sidebar.setSortMode('default')" 
                        [class.bg-indigo-600]="sidebar.sortMode() === 'default'"
                        [class.text-white]="sidebar.sortMode() === 'default'"
                        [class.bg-white/5]="sidebar.sortMode() !== 'default'"
                        [class.text-slate-400]="sidebar.sortMode() !== 'default'"
                        class="py-2 px-2 rounded-xl text-xs font-bold transition-all border border-white/5 text-center cursor-pointer">
                  ⚡ افتراضي / مخصص
                </button>
                <button (click)="sidebar.setSortMode('most-used')" 
                        [class.bg-gradient-to-r]="sidebar.sortMode() === 'most-used'"
                        [class.from-amber-600]="sidebar.sortMode() === 'most-used'"
                        [class.to-orange-500]="sidebar.sortMode() === 'most-used'"
                        [class.text-white]="sidebar.sortMode() === 'most-used'"
                        [class.bg-white/5]="sidebar.sortMode() !== 'most-used'"
                        [class.text-slate-400]="sidebar.sortMode() !== 'most-used'"
                        class="py-2 px-2 rounded-xl text-xs font-bold transition-all border border-white/5 text-center cursor-pointer flex items-center justify-center gap-1">
                  <span>🔥</span> الأكثر استخداماً
                </button>
                <button (click)="sidebar.setSortMode('alphabetical')" 
                        [class.bg-indigo-600]="sidebar.sortMode() === 'alphabetical'"
                        [class.text-white]="sidebar.sortMode() === 'alphabetical'"
                        [class.bg-white/5]="sidebar.sortMode() !== 'alphabetical'"
                        [class.text-slate-400]="sidebar.sortMode() !== 'alphabetical'"
                        class="py-2 px-2 rounded-xl text-xs font-bold transition-all border border-white/5 text-center cursor-pointer">
                  🔤 أبجدي
                </button>
              </div>
            </div>

            <div cdkDropList class="space-y-2" (cdkDropListDropped)="drop($event)">
              @for (item of sortedItems; track item.id) {
                <div cdkDrag class="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors cursor-move group">
                  <div class="flex items-center gap-3">
                    <svg lucideIcon="grip-vertical" class="w-4 h-4 text-slate-500 opacity-50 group-hover:opacity-100"></svg>
                    <div class="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                      <svg [lucideIcon]="item.icon" class="w-4 h-4 text-indigo-400"></svg>
                    </div>
                    <div>
                      <span class="text-white font-medium block text-xs">{{ item.label }}</span>
                      <div class="flex items-center gap-2 mt-0.5">
                        <span class="text-[10px] text-amber-400/90 font-mono">🔥 {{ sidebar.getItemUsageCount(item.id) }} فتح</span>
                        @if (sidebar.getAliases(item.id).length > 0) {
                          <span class="text-[10px] text-indigo-300 font-mono">🏷️ {{ sidebar.getAliases(item.id).length }} وسم</span>
                        }
                      </div>
                    </div>
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

            <!-- Mode Toggle Section (The new requested feature) -->
            <div class="bg-indigo-950/40 border border-indigo-500/30 rounded-2xl p-4 flex items-center justify-between mt-4">
              <div class="space-y-1">
                <h4 class="text-sm font-bold text-white flex items-center gap-2">
                  <span>وضع إظهار جميع الأقسام (غير المثبتة أسفل القائمة)</span>
                  <span class="bg-indigo-500 text-white text-[9px] px-2 py-0.5 rounded-full font-black">جديد ⚡</span>
                </h4>
                <p class="text-xs text-slate-400 leading-relaxed">عند التفعيل، تظهر كل الأقسام في الشريط الجانبي دائماً، بحيث تكون الأقسام غير المثبتة في الأسفل ليسهل تثبيتها بنقرة واحدة.</p>
              </div>
              <button (click)="sidebar.toggleShowAllUnpinnedAtBottom()" 
                      [ngClass]="sidebar.showAllUnpinnedAtBottom() ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'bg-white/10 text-slate-400'"
                      class="relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none">
                <span [ngClass]="sidebar.showAllUnpinnedAtBottom() ? 'translate-x-0' : '-translate-x-5'"
                      class="pointer-events-none inline-block size-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out"></span>
              </button>
            </div>

            </div>
          </div>
        </div>

        

        <!-- Footer Action Toolbar with Save Button -->
        <div class="p-4 border-t border-white/10 bg-slate-950 flex items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            @if (hasUnsavedChanges() || sidebar.hasUnsavedChanges()) {
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
                    class="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 cursor-pointer px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2">
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
