import { Injectable, inject } from '@angular/core';
import { EncryptionService } from './encryption.service';

@Injectable({
  providedIn: 'root'
})
export class IndexedDBService {
  private readonly DB_NAME = 'halaltubeDB';
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  private encryption = inject(EncryptionService);

  private readonly ALL_STORES = [
    'watch_history',
    'saved_videos',
    'subscriptions',
    'channel_meta',
    'channel_feed',
    'related_videos',
    'whitelist_feed',
    'blacklisted_channels',
    'personal_pdf_books',
    'created_books',
    'book_video_blobs',
    'playlists',
    'local_player_media',
    'local_player_notes'
  ];

  constructor() {
    this.initDB().catch(err => {
      console.warn('[IndexedDBService] Initial DB connection deferred or caught:', err);
    });
  }

  private getKeyPathForStore(storeName: string): string {
    if (storeName === 'subscriptions') return 'channelId';
    if (storeName === 'personal_pdf_books' || storeName === 'created_books' || storeName === 'book_video_blobs' || storeName === 'playlists' || storeName === 'local_player_media' || storeName === 'local_player_notes') return 'id';
    return 'videoId';
  }

  private createAllStores(db: IDBDatabase): void {
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

    // Created Studio Books Store
    if (!db.objectStoreNames.contains('created_books')) {
      db.createObjectStore('created_books', { keyPath: 'id' });
    }

    // Dedicated Video Blobs Store for Video Books (Zero RAM Overhead)
    if (!db.objectStoreNames.contains('book_video_blobs')) {
      db.createObjectStore('book_video_blobs', { keyPath: 'id' });
    }

    // HalalTube Playlists & Smart Study Plans Store
    if (!db.objectStoreNames.contains('playlists')) {
      db.createObjectStore('playlists', { keyPath: 'id' });
    }

    // Local Player Media Store (Persistent Offline Library & Courses)
    if (!db.objectStoreNames.contains('local_player_media')) {
      db.createObjectStore('local_player_media', { keyPath: 'id' });
    }

    // Local Player Notes Store
    if (!db.objectStoreNames.contains('local_player_notes')) {
      db.createObjectStore('local_player_notes', { keyPath: 'id' });
    }
  }

  private bindDatabaseEvents(db: IDBDatabase): void {
    db.onversionchange = () => {
      console.warn('[IndexedDBService] Database version change detected from another connection, closing.');
      db.close();
      this.db = null;
      this.initPromise = null;
    };
    db.onclose = () => {
      this.db = null;
      this.initPromise = null;
    };
  }

  private checkAllStoresPresent(db: IDBDatabase): boolean {
    return this.ALL_STORES.every(store => db.objectStoreNames.contains(store));
  }

  private initDB(): Promise<void> {
    if (this.db) {
      return Promise.resolve();
    }
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise<void>((resolve, reject) => {
      // Opening without version parameter:
      // In IndexedDB, this ALWAYS opens the database at its current version, completely avoiding VersionError!
      const openReq = indexedDB.open(this.DB_NAME);

      openReq.onerror = () => {
        const error = openReq.error;
        console.error('[IndexedDBService] Error opening DB without explicit version:', error);
        this.initPromise = null;
        reject(error || 'Error opening IndexedDB');
      };

      openReq.onupgradeneeded = () => {
        // Only fires if database did not exist at all before (version 0 -> 1)
        const db = openReq.result;
        this.createAllStores(db);
      };

      openReq.onsuccess = () => {
        const db = openReq.result;
        
        // Verify that all required stores are present
        if (this.checkAllStoresPresent(db)) {
          this.bindDatabaseEvents(db);
          this.db = db;
          resolve();
          return;
        }

        // If any stores are missing, upgrade cleanly to db.version + 1
        const nextVersion = (db.version || 1) + 1;
        db.close();

        const upgradeReq = indexedDB.open(this.DB_NAME, nextVersion);

        upgradeReq.onupgradeneeded = () => {
          const upgradeDb = upgradeReq.result;
          this.createAllStores(upgradeDb);
        };

        upgradeReq.onsuccess = () => {
          const upgradedDb = upgradeReq.result;
          this.bindDatabaseEvents(upgradedDb);
          this.db = upgradedDb;
          resolve();
        };

        upgradeReq.onerror = () => {
          console.error('[IndexedDBService] Error upgrading DB for missing stores:', upgradeReq.error);
          this.initPromise = null;
          reject(upgradeReq.error || 'Error upgrading IndexedDB');
        };

        upgradeReq.onblocked = (e) => {
          console.warn('[IndexedDBService] Database upgrade blocked by another connection/tab:', e);
        };
      };
    }).catch(err => {
      this.initPromise = null;
      throw err;
    });

    return this.initPromise;
  }

  private async ensureStore(storeName: string): Promise<void> {
    await this.initDB();
    if (this.db && !this.db.objectStoreNames.contains(storeName)) {
      const currentVersion = this.db.version || 1;
      this.db.close();
      this.db = null;
      this.initPromise = null;

      await new Promise<void>((resolve, reject) => {
        const req = indexedDB.open(this.DB_NAME, currentVersion + 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          this.createAllStores(db);
        };
        req.onsuccess = () => {
          const db = req.result;
          this.bindDatabaseEvents(db);
          this.db = db;
          resolve();
        };
        req.onerror = () => {
          console.error('[IndexedDBService] Error in ensureStore upgrade:', req.error);
          reject(req.error);
        };
        req.onblocked = (e) => {
          console.warn('[IndexedDBService] ensureStore blocked:', e);
        };
      });
    }
  }

  async put(storeName: string, item: any): Promise<void> {
    await this.ensureStore(storeName);

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
    await this.ensureStore(storeName);
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
    await this.ensureStore(storeName);
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
    await this.ensureStore(storeName);
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
    await this.ensureStore(storeName);
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
    await this.ensureStore(storeName);
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

  // =========================================================================
  // --- Dedicated Raw Blob Storage (Ultra-efficient for Video Books, 0 RAM) ---
  // =========================================================================

  async putVideoBlob(id: string, blob: Blob, meta?: { name?: string; mimeType?: string; size?: number; duration?: number }): Promise<void> {
    await this.initDB();
    const item = {
      id,
      blob,
      name: meta?.name || '',
      mimeType: meta?.mimeType || blob.type || 'video/mp4',
      size: meta?.size ?? blob.size,
      duration: meta?.duration || 0,
      savedAt: Date.now()
    };
    return this.put('book_video_blobs', item);
  }

  async getVideoBlob(id: string): Promise<Blob | null> {
    await this.initDB();
    try {
      const item = await this.get('book_video_blobs', id);
      if (!item) return null;
      return item.blob || null;
    } catch (e) {
      console.warn(`[IndexedDBService] Could not retrieve video blob "${id}":`, e);
      return null;
    }
  }

  async deleteVideoBlob(id: string): Promise<void> {
    await this.initDB();
    return this.delete('book_video_blobs', id);
  }

  async getVideoBlobsBatch(ids: string[]): Promise<Map<string, Blob>> {
    await this.initDB();
    const map = new Map<string, Blob>();
    for (const id of ids) {
      const blob = await this.getVideoBlob(id);
      if (blob) {
        map.set(id, blob);
      }
    }
    return map;
  }
}

