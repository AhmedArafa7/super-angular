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
        const parsed = JSON.parse(dataStr);
        this.assets.set(parsed || []);
        return;
      } catch (e) {
        console.error("Vault Load Error", e);
      }
    }

    // Seed default assets
    const seedAssets: DriveAsset[] = [
      {
        id: 'fold_1',
        name: 'مستندات البرمجة والتوثيق',
        mimeType: 'folder',
        parentId: 'root',
        createdAt: new Date().toISOString()
      },
      {
        id: 'fold_2',
        name: 'الوسائط المتعددة والتصاميم',
        mimeType: 'folder',
        parentId: 'root',
        createdAt: new Date().toISOString()
      },
      {
        id: 'fold_3',
        name: 'سجلات النواة العميقة',
        mimeType: 'folder',
        parentId: 'root',
        createdAt: new Date().toISOString()
      },
      {
        id: 'file_1',
        name: 'خطة الهجرة الشاملة للويب.pdf',
        mimeType: 'pdf',
        size: '2.4 MB',
        parentId: 'root',
        isFavorite: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'file_2',
        name: 'أيقونة النواة الزجاجية.png',
        mimeType: 'image',
        size: '1.2 MB',
        url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop',
        parentId: 'fold_2',
        createdAt: new Date().toISOString()
      },
      {
        id: 'file_3',
        name: 'تلاوة التراويح الهادئة.mp3',
        mimeType: 'audio',
        size: '8.5 MB',
        parentId: 'fold_2',
        createdAt: new Date().toISOString()
      },
      {
        id: 'file_4',
        name: 'تقارير الأداء المالي والتحليل.pdf',
        mimeType: 'pdf',
        size: '1.6 MB',
        parentId: 'fold_3',
        isFavorite: true,
        createdAt: new Date().toISOString()
      }
    ];

    this.assets.set(seedAssets);
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
