import { Injectable, signal, computed } from '@angular/core';

export type NavItemId = "chat" | "peer-chat" | "stream" | "market" | "features" | "admin" | "notifications" | "learning" | "wallet" | "dashboard" | "offers" | "hisn" | "launcher" | "lab" | "directory" | "agent-ai" | "ads" | "vault" | "downloads" | "time" | "deals" | "health" | "qa" | "microcontroller-lab" | "library" | "settings" | "study-ai" | "arcade" | "sheets";

export type SidebarPosition = "left" | "right" | "top" | "bottom" | "floating";

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  // State Signals
  readonly showAllUnpinnedAtBottom = signal<boolean>(false);
  readonly pinnedItems = signal<string[]>(["dashboard", "profile", "qa", "time", "health", "chat", "vault", "agent-ai", "deals", "peer-chat", "stream", "market", "arcade", "launcher", "lab", "ads", "downloads", "wallet", "hisn", "microcontroller-lab", "sheets", "settings", "admin"]);
  readonly isCollapsed = signal<boolean>(false);
  readonly isVisible = signal<boolean>(true);
  readonly isHeaderVisible = signal<boolean>(true);
  readonly width = signal<number>(280);
  readonly isResizing = signal<boolean>(false);
  readonly position = signal<SidebarPosition>("left");
  readonly floatingPos = signal<{x: number, y: number}>({ x: 20, y: 100 });
  readonly isMobile = signal<boolean>(false);

  readonly collapsedCategories = signal<string[]>([]);
  readonly recentItemIds = signal<string[]>([]);
  readonly hasUnsavedChanges = signal<boolean>(false);

  constructor() {
    this.loadState();
  }

  toggleShowAllUnpinnedAtBottom(): void {
    this.showAllUnpinnedAtBottom.update(v => !v);
    this.markUnsaved();
  }

  // Check if an item ID is pinned
  isPinned(id: string): boolean {
    return this.pinnedItems().includes(id);
  }

  toggleCategoryCollapse(catId: string): void {
    const current = this.collapsedCategories();
    if (current.includes(catId)) {
      this.collapsedCategories.set(current.filter(c => c !== catId));
    } else {
      this.collapsedCategories.set([...current, catId]);
    }
    this.markUnsaved();
  }

  isCategoryCollapsed(catId: string): boolean {
    return this.collapsedCategories().includes(catId);
  }

  addRecentItem(id: string): void {
    const current = this.recentItemIds().filter(i => i !== id);
    const updated = [id, ...current].slice(0, 4);
    this.recentItemIds.set(updated);
    this.saveState();
  }

  // Actions
  togglePin(id: string): void {
    const current = this.pinnedItems();
    if (current.includes(id)) {
      this.pinnedItems.set(current.filter(item => item !== id));
    } else {
      this.pinnedItems.set([...current, id]);
    }
    this.markUnsaved();
  }

  reorderPinnedItems(newItems: string[]): void {
    this.pinnedItems.set(newItems);
    this.markUnsaved();
  }

  setCollapsed(val: boolean): void {
    this.isCollapsed.set(val);
    this.markUnsaved();
  }

  setVisible(val: boolean): void {
    this.isVisible.set(val);
    this.markUnsaved();
  }

  setHeaderVisible(val: boolean): void {
    this.isHeaderVisible.set(val);
    this.markUnsaved();
  }

  setWidth(val: number): void {
    this.width.set(val);
    this.markUnsaved();
  }

  setIsResizing(val: boolean): void {
    this.isResizing.set(val);
  }

  setPosition(val: SidebarPosition): void {
    this.position.set(val);
    this.markUnsaved();
  }

  setFloatingPos(pos: { x: number, y: number }): void {
    this.floatingPos.set(pos);
    this.markUnsaved();
  }

  toggleCollapsed(): void {
    this.isCollapsed.update(v => !v);
    this.markUnsaved();
  }

  toggleVisible(): void {
    this.isVisible.update(v => !v);
    this.markUnsaved();
  }

  toggleHeader(): void {
    this.isHeaderVisible.update(v => !v);
    this.markUnsaved();
  }

  markUnsaved(): void {
    this.hasUnsavedChanges.set(true);
    this.saveState(); // Keep persistent fallback while notifying UI of changes
  }

  saveStateExplicitly(): void {
    this.saveState();
    this.hasUnsavedChanges.set(false);
  }

  // Persistence Logic (Replacing Zustand persist middleware)
  private saveState(): void {
    if (typeof window !== 'undefined') {
      const state = {
        pinnedItems: this.pinnedItems(),
        showAllUnpinnedAtBottom: this.showAllUnpinnedAtBottom(),
        isCollapsed: this.isCollapsed(),
        isVisible: this.isVisible(),
        isHeaderVisible: this.isHeaderVisible(),
        width: this.width(),
        position: this.position(),
        floatingPos: this.floatingPos(),
        collapsedCategories: this.collapsedCategories(),
        recentItemIds: this.recentItemIds()
      };
      localStorage.setItem('Si-Neuro-sidebar-prefs-v4', JSON.stringify(state));
    }
  }

  private loadState(): void {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('Si-Neuro-sidebar-prefs-v4');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.pinnedItems !== undefined) this.pinnedItems.set(parsed.pinnedItems);
          if (parsed.showAllUnpinnedAtBottom !== undefined) this.showAllUnpinnedAtBottom.set(parsed.showAllUnpinnedAtBottom);
          if (parsed.isCollapsed !== undefined) this.isCollapsed.set(parsed.isCollapsed);
          if (parsed.isVisible !== undefined) this.isVisible.set(parsed.isVisible);
          if (parsed.isHeaderVisible !== undefined) this.isHeaderVisible.set(parsed.isHeaderVisible);
          if (parsed.width !== undefined) this.width.set(parsed.width);
          if (parsed.position !== undefined) this.position.set(parsed.position);
          if (parsed.floatingPos !== undefined) this.floatingPos.set(parsed.floatingPos);
          if (parsed.collapsedCategories !== undefined) this.collapsedCategories.set(parsed.collapsedCategories);
          if (parsed.recentItemIds !== undefined) this.recentItemIds.set(parsed.recentItemIds);
        } catch (e) {
          console.error("Failed to parse sidebar prefs", e);
        }
      }
    }
  }
}
