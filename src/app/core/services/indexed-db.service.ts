import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class IndexedDBService {
  private readonly DB_NAME = 'WeTubeDB';
  private readonly DB_VERSION = 5; // Incremented for new stores
  private db: IDBDatabase | null = null;

  constructor() {
    this.initDB();
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
      };
    });
  }

  async put(storeName: string, item: any): Promise<void> {
    await this.initDB();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('DB not initialized');
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async get(storeName: string, key: string): Promise<any> {
    await this.initDB();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('DB not initialized');
      const transaction = this.db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll(storeName: string): Promise<any[]> {
    await this.initDB();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('DB not initialized');
      const transaction = this.db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
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
}
