import { Injectable, inject } from '@angular/core';
import { EncryptionService } from './encryption.service';

@Injectable({
  providedIn: 'root'
})
export class IndexedDBService {
  private readonly DB_NAME = 'WeTubeDB';
  private readonly DB_VERSION = 6; // Incremented for personal PDF books store
  private db: IDBDatabase | null = null;
  private encryption = inject(EncryptionService);

  constructor() {
    this.initDB();
  }

  private getKeyPathForStore(storeName: string): string {
    if (storeName === 'subscriptions') return 'channelId';
    if (storeName === 'personal_pdf_books') return 'id';
    return 'videoId';
  }

  private initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        resolve();
        return;
      }

      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = (event) => {
        console.error('[IndexedDBService] Error opening DB', event);
        reject('Error opening IndexedDB');
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Immutability Rule: Do NOT change existing stores
        if (!db.objectStoreNames.contains('watch_history')) {
          db.createObjectStore('watch_history', { keyPath: 'videoId' });
        }
        if (!db.objectStoreNames.contains('saved_videos')) {
          db.createObjectStore('saved_videos', { keyPath: 'videoId' });
        }
        
        // New stores for Phase 3
        if (!db.objectStoreNames.contains('subscriptions')) {
          db.createObjectStore('subscriptions', { keyPath: 'channelId' });
        }
        if (!db.objectStoreNames.contains('channel_meta')) {
          db.createObjectStore('channel_meta', { keyPath: 'channelId' }); // TTL 24h
        }
        if (!db.objectStoreNames.contains('channel_feed')) {
          db.createObjectStore('channel_feed', { keyPath: 'channelId' }); // TTL 2h
        }

        // New stores for Phase 4 (Watch Sidebar)
        if (!db.objectStoreNames.contains('related_videos')) {
          db.createObjectStore('related_videos', { keyPath: 'videoId' }); // TTL 2h
        }
        
        // Whitelist Home Feed caching
        if (!db.objectStoreNames.contains('whitelist_feed')) {
          db.createObjectStore('whitelist_feed', { keyPath: 'id' }); // TTL 1h
        }
        
        // Reviewer Blacklist caching
        if (!db.objectStoreNames.contains('blacklisted_channels')) {
          db.createObjectStore('blacklisted_channels', { keyPath: 'id' });
        }

        // Personal PDF Books Store
        if (!db.objectStoreNames.contains('personal_pdf_books')) {
          db.createObjectStore('personal_pdf_books', { keyPath: 'id' });
        }
      };
    });
  }

  async put(storeName: string, item: any): Promise<void> {
    await this.initDB();

    let dataToStore = item;
    const sensitiveStores = ['watch_history', 'saved_videos', 'subscriptions'];
    if (sensitiveStores.includes(storeName)) {
      const keyPath = this.getKeyPathForStore(storeName);
      const idValue = item[keyPath];
      
      const encrypted = await this.encryption.encrypt(item);
      dataToStore = {
        [keyPath]: idValue,
        _data: encrypted
      };
    }

    return new Promise((resolve, reject) => {
      if (!this.db) return reject('DB not initialized');
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(dataToStore);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async get(storeName: string, key: string): Promise<any> {
    await this.initDB();
    const rawResult = await new Promise<any>((resolve, reject) => {
      if (!this.db) return reject('DB not initialized');
      const transaction = this.db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const sensitiveStores = ['watch_history', 'saved_videos', 'subscriptions'];
    if (rawResult && sensitiveStores.includes(storeName) && rawResult._data) {
      return this.encryption.decrypt(rawResult._data);
    }
    return rawResult;
  }

  async getAll(storeName: string): Promise<any[]> {
    await this.initDB();
    const rawResults = await new Promise<any[]>((resolve, reject) => {
      if (!this.db) return reject('DB not initialized');
      const transaction = this.db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });

    const sensitiveStores = ['watch_history', 'saved_videos', 'subscriptions'];
    if (sensitiveStores.includes(storeName)) {
      const decryptedPromises = rawResults.map(item => {
        if (item && item._data) {
          return this.encryption.decrypt(item._data);
        }
        return Promise.resolve(item);
      });
      return Promise.all(decryptedPromises);
    }
    return rawResults;
  }

  async getRawAll(storeName: string): Promise<any[]> {
    await this.initDB();
    return new Promise<any[]>((resolve, reject) => {
      if (!this.db) return reject('DB not initialized');
      const transaction = this.db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: string, key: string): Promise<void> {
    await this.initDB();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('DB not initialized');
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearStore(storeName: string): Promise<void> {
    await this.initDB();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('DB not initialized');
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- TTL Caching Logic ---
  async setWithTTL(storeName: string, item: any): Promise<void> {
    // Inject current timestamp for TTL checks
    const data = {
      ...item,
      _timestamp: Date.now()
    };
    return this.put(storeName, data);
  }

  async getWithTTL(storeName: string, key: string, ttlMs: number): Promise<any | null> {
    const data = await this.get(storeName, key);
    if (!data) return null;
    if (!data._timestamp) return data; // No timestamp, treat as valid forever (backward compat)
    
    const age = Date.now() - data._timestamp;
    if (age > ttlMs) {
      // Data expired
      await this.delete(storeName, key);
      return null;
    }
    return data;
  }

  // --- Auto Caching & Limits ---
  async autoCacheVideo(video: any): Promise<void> {
    const existing = await this.get('saved_videos', video.id || video.videoId);
    if (existing) {
      // Update views if it's already there
      existing.viewCount = (existing.viewCount || 0) + 1;
      existing.lastViewedAt = Date.now();
      await this.put('saved_videos', existing);
    } else {
      // New cache entry
      const cacheEntry = {
        videoId: video.id || video.videoId,
        title: video.title,
        thumbnail: video.thumbnail,
        author: video.author,
        authorId: video.authorId,
        category: video.category || '',
        viewCount: 1,
        adminPoints: 0,
        cachedAt: Date.now(),
        lastViewedAt: Date.now()
      };
      await this.put('saved_videos', cacheEntry);
    }
    
    // Manage limits asynchronously without blocking
    this.manageSavedVideosLimit().catch(e => console.warn('[IndexedDBService] Limit management failed', e));
  }

  async manageSavedVideosLimit(): Promise<void> {
    const allVideos = await this.getAll('saved_videos');
    const MAX_VIDEOS = 500;
    const EVICT_COUNT = 50;

    if (allVideos.length > MAX_VIDEOS) {
      // Sort by importance (ascending - lowest importance first)
      // Importance = views + adminPoints + category bonus
      const sorted = allVideos.sort((a, b) => {
        const getImportance = (v: any) => {
          let score = (v.viewCount || 0) + (v.adminPoints || 0);
          if (v.savedAt) score += 10000; // User explicitly saved/liked it
          // Simple category bonus
          if (v.category === 'برمجة' || v.category === 'تكنولوجيا') score += 10;
          return score;
        };
        
        // If importance is same, sort by oldest view
        const impA = getImportance(a);
        const impB = getImportance(b);
        if (impA === impB) {
          return (a.lastViewedAt || 0) - (b.lastViewedAt || 0);
        }
        return impA - impB;
      });

      // Evict the lowest 50
      const toEvict = sorted.slice(0, EVICT_COUNT);
      for (const v of toEvict) {
        await this.delete('saved_videos', v.videoId);
      }
    }
  }
}
