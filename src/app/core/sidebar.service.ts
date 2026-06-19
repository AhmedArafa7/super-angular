import { Injectable, signal, computed } from '@angular/core';

export type NavItemId = "chat" | "peer-chat" | "stream" | "market" | "features" | "admin" | "notifications" | "learning" | "wallet" | "dashboard" | "offers" | "hisn" | "launcher" | "lab" | "directory" | "agent-ai" | "ads" | "vault" | "downloads" | "time" | "deals" | "health" | "qa" | "microcontroller-lab" | "library" | "settings" | "study-ai" | "arcade" | "sheets";

export type SidebarPosition = "left" | "right" | "top" | "bottom" | "floating";

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  // State Signals
  readonly pinnedItems = signal<NavItemId[]>(["dashboard", "qa", "time", "health", "chat", "vault", "agent-ai", "deals", "peer-chat", "stream", "market", "arcade", "launcher", "lab", "ads", "downloads", "wallet", "hisn", "microcontroller-lab", "sheets", "settings", "admin"]);
  readonly isCollapsed = signal<boolean>(false);
  readonly isVisible = signal<boolean>(true);
  readonly isHeaderVisible = signal<boolean>(true);
  readonly width = signal<number>(280);
  readonly position = signal<SidebarPosition>("left");
  readonly floatingPos = signal<{x: number, y: number}>({ x: 20, y: 100 });

  constructor() {
    this.loadState();
  }

  // Derived State (Computed)
  // We return a computed signal for each id to efficiently track pinned status in templates
  isPinned(id: NavItemId) {
    return computed(() => this.pinnedItems().includes(id));
  }

  // Actions
  togglePin(id: NavItemId): void {
    const current = this.pinnedItems();
    if (current.includes(id)) {
      this.pinnedItems.set(current.filter(item => item !== id));
    } else {
      this.pinnedItems.set([...current, id]);
    }
    this.saveState();
  }

  setCollapsed(val: boolean): void {
    this.isCollapsed.set(val);
    this.saveState();
  }

  setVisible(val: boolean): void {
    this.isVisible.set(val);
    this.saveState();
  }

  setHeaderVisible(val: boolean): void {
    this.isHeaderVisible.set(val);
    this.saveState();
  }

  setWidth(val: number): void {
    this.width.set(val);
    this.saveState();
  }

  setPosition(val: SidebarPosition): void {
    this.position.set(val);
    this.saveState();
  }

  setFloatingPos(pos: { x: number, y: number }): void {
    this.floatingPos.set(pos);
    this.saveState();
  }

  toggleCollapsed(): void {
    this.isCollapsed.update(v => !v);
    this.saveState();
  }

  toggleVisible(): void {
    this.isVisible.update(v => !v);
    this.saveState();
  }

  toggleHeader(): void {
    this.isHeaderVisible.update(v => !v);
    this.saveState();
  }

  // Persistence Logic (Replacing Zustand persist middleware)
  private saveState(): void {
    if (typeof window !== 'undefined') {
      const state = {
        pinnedItems: this.pinnedItems(),
        isCollapsed: this.isCollapsed(),
        isVisible: this.isVisible(),
        isHeaderVisible: this.isHeaderVisible(),
        width: this.width(),
        position: this.position(),
        floatingPos: this.floatingPos()
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
          if (parsed.isCollapsed !== undefined) this.isCollapsed.set(parsed.isCollapsed);
          if (parsed.isVisible !== undefined) this.isVisible.set(parsed.isVisible);
          if (parsed.isHeaderVisible !== undefined) this.isHeaderVisible.set(parsed.isHeaderVisible);
          if (parsed.width !== undefined) this.width.set(parsed.width);
          if (parsed.position !== undefined) this.position.set(parsed.position);
          if (parsed.floatingPos !== undefined) this.floatingPos.set(parsed.floatingPos);
        } catch (e) {
          console.error("Failed to parse sidebar prefs", e);
        }
      }
    }
  }
}
