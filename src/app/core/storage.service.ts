import { Injectable, signal, computed } from '@angular/core';

export type AssetType = 'quran' | 'video' | 'learning_asset' | 'ai_model_data';

export interface CachedAsset {
  id: string;
  type: AssetType;
  title: string;
  sizeMB: number;
  timestamp: number;
  isFavorite: boolean;
  metadata?: any;
  downloadedQuality?: string;
}

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly STORAGE_KEY = 'Si-Neuro-segmented-storage-v2';

  // Signals for state management
  cachedAssets = signal<CachedAsset[]>([]);
  categoryLimits = signal<Record<AssetType, number>>({
    'quran': 100,
    'video': 300,
    'learning_asset': 200,
    'ai_model_data': 50
  });
  storageLimitMB = signal<number>(500);

  constructor() {
    this.loadState();
  }

  private loadState(): void {
    const dataStr = localStorage.getItem(this.STORAGE_KEY);
    if (dataStr) {
      try {
        const parsed = JSON.parse(dataStr);
        if (parsed.cachedAssets) this.cachedAssets.set(parsed.cachedAssets);
        if (parsed.categoryLimits) this.categoryLimits.set(parsed.categoryLimits);
        if (parsed.storageLimitMB) this.storageLimitMB.set(parsed.storageLimitMB);
        return;
      } catch (e) {
        console.error("Storage Load Error", e);
      }
    }

    // Seed default cached assets for spectacular initial fidelity
    const seeds: CachedAsset[] = [
      {
        id: 'seed_asset_1',
        type: 'quran',
        title: 'القرآن الكريم كامل بصوت الشيخ عبد الباسط عبد الصمد',
        sizeMB: 48.2,
        timestamp: Date.now() - 3600000 * 2,
        isFavorite: true
      },
      {
        id: 'seed_asset_2',
        type: 'video',
        title: 'كيف يعمل نموذج التفكير المستقل عصبياً؟ - حوار المطورين',
        sizeMB: 124.5,
        timestamp: Date.now() - 3600000 * 5,
        isFavorite: false
      },
      {
        id: 'seed_asset_3',
        type: 'ai_model_data',
        title: 'Si-Neuro Core Neural Weights V2.8 (Model Data)',
        sizeMB: 32.8,
        timestamp: Date.now() - 3600000 * 10,
        isFavorite: false
      }
    ];

    this.cachedAssets.set(seeds);
    this.saveState();
  }

  saveState(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
      cachedAssets: this.cachedAssets(),
      categoryLimits: this.categoryLimits(),
      storageLimitMB: this.storageLimitMB()
    }));
  }

  // Add Asset operation
  addAsset(type: AssetType, title: string, sizeMB: number, metadata?: any, downloadedQuality?: string): void {
    const existing = this.cachedAssets().find(a => a.title === title && a.type === type);
    if (existing) {
      this.cachedAssets.update(list => {
        return list.map(a => a.id === existing.id ? { ...a, timestamp: Date.now() } : a);
      });
      this.saveState();
      return;
    }

    const limit = this.categoryLimits()[type] || 100;
    const currentUsed = this.getUsedSpaceByCategory(type);

    if (currentUsed + sizeMB > limit) {
      this.clearCategorySpace(type, sizeMB);
    }

    const newAsset: CachedAsset = {
      id: `asset_${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      sizeMB,
      timestamp: Date.now(),
      isFavorite: false,
      metadata,
      downloadedQuality
    };

    this.cachedAssets.update(list => [...list, newAsset]);
    this.saveState();
  }

  removeAsset(id: string): void {
    this.cachedAssets.update(list => list.filter(a => a.id !== id));
    this.saveState();
  }

  toggleFavorite(id: string): void {
    this.cachedAssets.update(list => {
      return list.map(a => a.id === id ? { ...a, isFavorite: !a.isFavorite } : a);
    });
    this.saveState();
  }

  setCategoryLimit(type: AssetType, limit: number): void {
    this.categoryLimits.update(limits => ({
      ...limits,
      [type]: limit
    }));
    this.saveState();
  }

  clearCategorySpace(type: AssetType, requiredSpace: number): void {
    const limit = this.categoryLimits()[type] || 100;
    const assets = this.cachedAssets().filter(a => a.type === type);
    let currentTotal = assets.reduce((sum, a) => sum + a.sizeMB, 0);

    // Oldest non-favorited deletions first
    const candidates = assets
      .filter(a => !a.isFavorite)
      .sort((a, b) => a.timestamp - b.timestamp);

    const idsToRemove = new Set<string>();
    for (const c of candidates) {
      if (currentTotal + requiredSpace <= limit) break;
      currentTotal -= c.sizeMB;
      idsToRemove.add(c.id);
    }

    this.cachedAssets.update(list => list.filter(a => !idsToRemove.has(a.id)));
    this.saveState();
  }

  getUsedSpaceByCategory(type: AssetType): number {
    return this.cachedAssets()
      .filter(a => a.type === type)
      .reduce((sum, a) => sum + a.sizeMB, 0);
  }

  getTotalUsedSpace(): number {
    return this.cachedAssets().reduce((sum, a) => sum + a.sizeMB, 0);
  }
}
