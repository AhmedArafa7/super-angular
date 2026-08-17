import { Injectable, signal, computed } from '@angular/core';

export type NavItemId = "chat" | "peer-chat" | "stream" | "market" | "features" | "admin" | "notifications" | "learning" | "wallet" | "dashboard" | "offers" | "hisn" | "launcher" | "lab" | "directory" | "agent-ai" | "ads" | "vault" | "downloads" | "time" | "deals" | "health" | "qa" | "microcontroller-lab" | "library" | "settings" | "study-ai" | "arcade" | "sheets";

export type SidebarPosition = "left" | "right" | "top" | "bottom" | "floating";
export type NavSortMode = 'default' | 'most-used' | 'alphabetical' | 'custom';

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
  readonly floatingWidth = signal<number>(310);
  readonly floatingHeight = signal<number>(450);
  readonly arrowControlMode = signal<'move' | 'snap' | 'resize' | 'scroll'>('move');
  readonly isFloatingExpanded = signal<boolean>(true);
  readonly isFloatingIconsOnly = signal<boolean>(false);
  readonly floatingOrientation = signal<'vertical' | 'horizontal'>('vertical');
  readonly isMobile = signal<boolean>(false);

  readonly collapsedCategories = signal<string[]>([]);
  readonly recentItemIds = signal<string[]>([]);
  readonly hasUnsavedChanges = signal<boolean>(false);

  // --- NEW: Custom Aliases, Usage Analytics & Sort Modes ---
  readonly customAliases = signal<Record<string, string[]>>({});
  readonly itemUsageStats = signal<Record<string, number>>({});
  readonly sortMode = signal<NavSortMode>('default');

  constructor() {
    this.loadState();
  }

  // --- Custom Aliases Methods ---
  getAliases(itemId: string): string[] {
    return this.customAliases()[itemId] || [];
  }

  setAliases(itemId: string, aliases: string[]): void {
    const clean = aliases.map(a => a.trim()).filter(Boolean);
    this.customAliases.update(prev => ({
      ...prev,
      [itemId]: clean
    }));
    this.markUnsaved();
  }

  addAlias(itemId: string, alias: string): void {
    const trimmed = alias.trim();
    if (!trimmed) return;
    const current = this.getAliases(itemId);
    if (!current.includes(trimmed)) {
      this.setAliases(itemId, [...current, trimmed]);
    }
  }

  removeAlias(itemId: string, alias: string): void {
    const current = this.getAliases(itemId);
    this.setAliases(itemId, current.filter(a => a !== alias));
  }

  // --- Usage Tracking Methods ---
  getItemUsageCount(itemId: string): number {
    return this.itemUsageStats()[itemId] || 0;
  }

  incrementItemUsage(itemId: string): void {
    this.itemUsageStats.update(stats => {
      const count = (stats[itemId] || 0) + 1;
      return { ...stats, [itemId]: count };
    });
    this.saveState();
  }

  // --- Sort Mode Management ---
  setSortMode(mode: NavSortMode): void {
    this.sortMode.set(mode);
    this.markUnsaved();
  }

  // --- Universal Search Matching ---
  matchesSearch(item: { id: string; label: string; route?: string; aliases?: string[] }, query: string): boolean {
    const q = query.trim().toLowerCase();
    if (!q) return true;

    // 1. Label match
    if (item.label.toLowerCase().includes(q)) return true;
    // 2. ID or route match
    if (item.id.toLowerCase().includes(q) || (item.route && item.route.toLowerCase().includes(q))) return true;
    // 3. Built-in aliases match
    if (item.aliases && item.aliases.some(a => a.toLowerCase().includes(q))) return true;
    // 4. Custom user aliases match
    const userAliases = this.getAliases(item.id);
    if (userAliases.some(a => a.toLowerCase().includes(q))) return true;

    return false;
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
    this.incrementItemUsage(id);
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
    let x = pos.x;
    let y = pos.y;
    if (typeof window !== 'undefined') {
      const screenW = window.innerWidth;
      const screenH = window.innerHeight;
      const maxX = Math.max(16, screenW - 50);
      const maxY = Math.max(16, screenH - 50);
      x = Math.max(10, Math.min(maxX, x));
      y = Math.max(10, Math.min(maxY, y));
    }
    this.floatingPos.set({ x, y });
    this.markUnsaved();
  }

  resetFloatingPosition(): void {
    if (typeof window !== 'undefined') {
      const screenW = window.innerWidth;
      const isHoriz = this.floatingOrientation() === 'horizontal';
      const w = isHoriz ? 500 : (this.isFloatingIconsOnly() ? 72 : this.floatingWidth());
      const x = Math.max(16, (screenW - w) / 2);
      const y = 20;
      this.setFloatingPos({ x, y });
    } else {
      this.setFloatingPos({ x: 50, y: 50 });
    }
  }

  setFloatingDimensions(w: number, h: number): void {
    this.floatingWidth.set(Math.max(220, Math.min(500, w)));
    this.floatingHeight.set(Math.max(300, Math.min(800, h)));
    this.markUnsaved();
  }

  resizeFloating(deltaWidth: number, deltaHeight: number): void {
    const newW = Math.max(240, Math.min(480, this.floatingWidth() + deltaWidth));
    const newH = Math.max(320, Math.min(750, this.floatingHeight() + deltaHeight));
    this.floatingWidth.set(newW);
    this.floatingHeight.set(newH);
    this.markUnsaved();
  }

  setArrowControlMode(mode: 'move' | 'snap' | 'resize' | 'scroll'): void {
    this.arrowControlMode.set(mode);
    this.saveState();
  }

  snapFloatingTo(edge: 'top' | 'bottom' | 'left' | 'right' | 'center' | 'up' | 'down'): void {
    if (typeof window === 'undefined') return;
    
    const isHoriz = this.floatingOrientation() === 'horizontal';
    const isIcons = this.isFloatingIconsOnly();
    
    let elWidth = isHoriz ? 550 : (isIcons ? 72 : this.floatingWidth());
    let elHeight = isHoriz ? 64 : this.floatingHeight();
    
    // Dynamic measurement of the active floating element if rendered
    const domEl = document.querySelector('[cdkdrag]') as HTMLElement;
    if (domEl) {
      elWidth = domEl.offsetWidth || elWidth;
      elHeight = domEl.offsetHeight || elHeight;
    }

    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const padding = 16;

    let targetX = this.floatingPos().x;
    let targetY = this.floatingPos().y;

    if (edge === 'top' || edge === 'up') {
      targetY = padding;
    } else if (edge === 'bottom' || edge === 'down') {
      targetY = Math.max(padding, screenH - elHeight - padding);
    } else if (edge === 'left') {
      targetX = padding;
    } else if (edge === 'right') {
      targetX = Math.max(padding, screenW - elWidth - padding);
    } else if (edge === 'center') {
      targetX = Math.max(padding, (screenW - elWidth) / 2);
      targetY = Math.max(padding, (screenH - elHeight) / 2);
    }

    this.setFloatingPos({ x: targetX, y: targetY });
  }

  setFloatingExpanded(val: boolean): void {
    this.isFloatingExpanded.set(val);
    this.markUnsaved();
  }

  toggleFloatingExpanded(): void {
    this.isFloatingExpanded.update(v => !v);
    this.markUnsaved();
  }

  setFloatingIconsOnly(val: boolean): void {
    this.isFloatingIconsOnly.set(val);
    this.markUnsaved();
  }

  toggleFloatingIconsOnly(): void {
    this.isFloatingIconsOnly.update(v => !v);
    this.markUnsaved();
  }

  setFloatingOrientation(val: 'vertical' | 'horizontal'): void {
    this.floatingOrientation.set(val);
    this.markUnsaved();
  }

  toggleFloatingOrientation(): void {
    this.floatingOrientation.update(v => v === 'vertical' ? 'horizontal' : 'vertical');
    this.markUnsaved();
  }

  moveFloating(direction: 'up' | 'down' | 'left' | 'right', delta: number = 40): void {
    const current = this.floatingPos();
    let newX = current.x;
    let newY = current.y;

    if (direction === 'up') newY = Math.max(10, current.y - delta);
    if (direction === 'down') newY = current.y + delta;
    if (direction === 'left') newX = Math.max(10, current.x - delta);
    if (direction === 'right') newX = current.x + delta;

    this.setFloatingPos({ x: newX, y: newY });
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
        floatingWidth: this.floatingWidth(),
        floatingHeight: this.floatingHeight(),
        arrowControlMode: this.arrowControlMode(),
        isFloatingExpanded: this.isFloatingExpanded(),
        isFloatingIconsOnly: this.isFloatingIconsOnly(),
        floatingOrientation: this.floatingOrientation(),
        collapsedCategories: this.collapsedCategories(),
        recentItemIds: this.recentItemIds(),
        customAliases: this.customAliases(),
        itemUsageStats: this.itemUsageStats(),
        sortMode: this.sortMode()
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
          if (parsed.floatingPos !== undefined) this.setFloatingPos(parsed.floatingPos);
          if (parsed.floatingWidth !== undefined) this.floatingWidth.set(parsed.floatingWidth);
          if (parsed.floatingHeight !== undefined) this.floatingHeight.set(parsed.floatingHeight);
          if (parsed.arrowControlMode !== undefined) this.arrowControlMode.set(parsed.arrowControlMode);
          if (parsed.isFloatingExpanded !== undefined) this.isFloatingExpanded.set(parsed.isFloatingExpanded);
          if (parsed.isFloatingIconsOnly !== undefined) this.isFloatingIconsOnly.set(parsed.isFloatingIconsOnly);
          if (parsed.floatingOrientation !== undefined) this.floatingOrientation.set(parsed.floatingOrientation);
          if (parsed.collapsedCategories !== undefined) this.collapsedCategories.set(parsed.collapsedCategories);
          if (parsed.recentItemIds !== undefined) this.recentItemIds.set(parsed.recentItemIds);
          if (parsed.customAliases !== undefined) this.customAliases.set(parsed.customAliases);
          if (parsed.itemUsageStats !== undefined) this.itemUsageStats.set(parsed.itemUsageStats);
          if (parsed.sortMode !== undefined) this.sortMode.set(parsed.sortMode);
        } catch (e) {
          console.error("Failed to parse sidebar prefs", e);
        }
      }
    }
  }
}
