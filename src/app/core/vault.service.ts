import { Injectable, signal, computed } from '@angular/core';

export interface DriveAsset {
  id: string;
  name: string;
  mimeType: 'folder' | 'image' | 'video' | 'audio' | 'pdf' | 'file';
  size?: string;
  url?: string;
  parentId: string; // "root" or parent folder ID
  isFavorite?: boolean;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class VaultService {
  private readonly STORAGE_KEY = 'Si-Neuro-vault-registry';

  // Signals
  assets = signal<DriveAsset[]>([]);
  currentFolderId = signal<string>('root');
  folderStack = signal<{ id: string; name: string }[]>([]);
  activeTab = signal<'all' | 'recent' | 'favorites'>('all');

  // Computed helper: returns assets belonging to the active folder
  currentAssets = computed(() => {
    const list = this.assets();
    const folderId = this.currentFolderId();
    const tab = this.activeTab();

    if (tab === 'favorites') {
      return list.filter(a => a.isFavorite);
    }
    
    // For 'all' or 'recent': filter by parent folder
    return list.filter(a => a.parentId === folderId);
  });

  constructor() {
    this.loadState();
  }

  private loadState(): void {
    const dataStr = localStorage.getItem(this.STORAGE_KEY);
    if (dataStr) {
      try {
        const parsed: DriveAsset[] = JSON.parse(dataStr);
        // Filter out old seed assets if cached
        const clean = (parsed || []).filter(a => !a.id.startsWith('fold_') && !a.id.startsWith('file_'));
        this.assets.set(clean);
        return;
      } catch (e) {
        console.error("Vault Load Error", e);
      }
    }

    this.assets.set([]);
    this.saveState();
  }

  private saveState(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.assets()));
  }

  // Upload or add folder
  addFolder(name: string): void {
    const newFolder: DriveAsset = {
      id: `fold_${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim() || 'مجلد جديد غير معنون',
      mimeType: 'folder',
      parentId: this.currentFolderId(),
      createdAt: new Date().toISOString()
    };

    this.assets.update(list => [...list, newFolder]);
    this.saveState();
  }

  uploadFile(name: string, type: 'image' | 'video' | 'audio' | 'pdf' | 'file', size: string, url?: string): void {
    const newFile: DriveAsset = {
      id: `file_${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim() || 'ملف غير معنون',
      mimeType: type,
      size,
      url,
      parentId: this.currentFolderId(),
      createdAt: new Date().toISOString()
    };

    this.assets.update(list => [...list, newFile]);
    this.saveState();
  }

  deleteAsset(id: string): void {
    // Delete target asset
    this.assets.update(list => list.filter(a => a.id !== id));
    this.saveState();
  }

  toggleFavorite(id: string): void {
    this.assets.update(list => {
      return list.map(a => {
        if (a.id === id) {
          return { ...a, isFavorite: !a.isFavorite };
        }
        return a;
      });
    });
    this.saveState();
  }
}
