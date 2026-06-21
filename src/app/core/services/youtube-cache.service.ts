import { Injectable } from '@angular/core';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class YoutubeCacheService {
  private readonly KEYS = {
    FEED: 'wetube_feed_cache',
    SUBS: 'wetube_subs_cache'
  };

  private readonly TTL = {
    FEED: 15 * 60 * 1000, // 15 minutes
    SUBS: 30 * 60 * 1000  // 30 minutes
  };

  setFeed(data: any): void {
    const entry: CacheEntry<any> = { data, timestamp: Date.now() };
    try {
      localStorage.setItem(this.KEYS.FEED, JSON.stringify(entry));
    } catch (e) {
      console.warn('[YoutubeCache] LocalStorage full, cannot save feed');
    }
  }

  getFeed(): any | null {
    try {
      const stored = localStorage.getItem(this.KEYS.FEED);
      if (!stored) return null;
      const entry: CacheEntry<any> = JSON.parse(stored);
      if (Date.now() - entry.timestamp > this.TTL.FEED) {
        return null; // Expired
      }
      return entry.data;
    } catch (e) {
      return null;
    }
  }

  setSubscriptions(data: any): void {
    const entry: CacheEntry<any> = { data, timestamp: Date.now() };
    try {
      localStorage.setItem(this.KEYS.SUBS, JSON.stringify(entry));
    } catch (e) {
      console.warn('[YoutubeCache] LocalStorage full, cannot save subs');
    }
  }

  getSubscriptions(): any | null {
    try {
      const stored = localStorage.getItem(this.KEYS.SUBS);
      if (!stored) return null;
      const entry: CacheEntry<any> = JSON.parse(stored);
      if (Date.now() - entry.timestamp > this.TTL.SUBS) {
        return null; // Expired
      }
      return entry.data;
    } catch (e) {
      return null;
    }
  }

  clearFeed(): void {
    localStorage.removeItem(this.KEYS.FEED);
  }

  clearSubscriptions(): void {
    localStorage.removeItem(this.KEYS.SUBS);
  }
}
