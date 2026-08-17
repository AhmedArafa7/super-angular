import { Injectable, signal } from '@angular/core';

export interface ExternalTabItem {
  id: string;
  title: string;
  url: string;
  category: string;
  notes?: string;
  createdAt: string;
  favicon?: string;
  isPinnedToSidebar?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ExternalTabsService {
  private readonly STORAGE_KEY = 'si_neuro_external_tabs_vault';
  readonly tabs = signal<ExternalTabItem[]>([]);

  constructor() {
    this.loadTabs();
  }

  loadTabs(): ExternalTabItem[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (data) {
        const parsed: ExternalTabItem[] = JSON.parse(data);
        this.tabs.set(parsed);
        return parsed;
      }
    } catch (e) {
      console.error('[ExternalTabsService] Failed to load tabs', e);
    }
    return [];
  }

  saveTabs(items: ExternalTabItem[]) {
    this.tabs.set(items);
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('[ExternalTabsService] Failed to save tabs', e);
    }
  }

  getTabById(id: string): ExternalTabItem | undefined {
    this.loadTabs();
    return this.tabs().find(t => t.id === id);
  }

  addTab(item: Omit<ExternalTabItem, 'id' | 'createdAt'> & { id?: string; createdAt?: string }): ExternalTabItem {
    const newItem: ExternalTabItem = {
      id: item.id || 'tab_' + Date.now(),
      title: item.title.trim(),
      url: item.url.trim(),
      category: item.category || 'أخرى',
      notes: item.notes?.trim() || undefined,
      createdAt: item.createdAt || new Date().toISOString(),
      favicon: item.favicon || this.getFaviconUrl(item.url),
      isPinnedToSidebar: item.isPinnedToSidebar ?? false
    };

    const current = this.tabs();
    const updated = [newItem, ...current];
    this.saveTabs(updated);
    return newItem;
  }

  deleteTab(id: string) {
    const updated = this.tabs().filter(t => t.id !== id);
    this.saveTabs(updated);
  }

  togglePinToSidebar(id: string): boolean {
    let newPinnedStatus = false;
    const updated = this.tabs().map(t => {
      if (t.id === id) {
        newPinnedStatus = !t.isPinnedToSidebar;
        return { ...t, isPinnedToSidebar: newPinnedStatus };
      }
      return t;
    });
    this.saveTabs(updated);
    return newPinnedStatus;
  }

  getFaviconUrl(urlStr: string): string {
    try {
      let formatted = urlStr.trim();
      if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
        formatted = 'https://' + formatted;
      }
      const domain = new URL(formatted).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch {
      return '';
    }
  }

  /**
   * Helper to format embeddable URLs for Google Drive, YouTube, etc.
   */
  formatEmbedUrl(rawUrl: string): string {
    if (!rawUrl) return '';
    let url = rawUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    // 1. Google Drive Folder Embed
    const driveFolderMatch = url.match(/drive\.google\.com\/(?:drive\/folders\/|folderview\?id=|file\/d\/)([a-zA-Z0-9_-]+)/);
    if (driveFolderMatch && url.includes('/folders/')) {
      return `https://drive.google.com/embeddedfolderview?id=${driveFolderMatch[1]}#grid`;
    }

    // 2. Google Drive File Preview Embed
    if (driveFolderMatch && (url.includes('/file/d/') || url.includes('open?id='))) {
      return `https://drive.google.com/file/d/${driveFolderMatch[1]}/preview`;
    }

    // 3. YouTube Embed
    const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([^&?\n]+)/);
    if (ytMatch && ytMatch[1].length === 11) {
      return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=1&rel=0&modestbranding=1`;
    }

    return url;
  }
}
