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
    SUBS: 'wetube_subs_cache',
    RANDOM_VIDEOS: 'wetube_random_videos_cache'
  };

  private readonly TTL = {
    FEED: 15 * 60 * 1000, // 15 minutes
    SUBS: 30 * 60 * 1000, // 30 minutes
    RANDOM_VIDEOS: 24 * 60 * 60 * 1000 // 24 hours
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

  setRandomVideos(videos: any[]): void {
    try {
      // Get existing and merge
      let existing = this.getRandomVideos() || [];
      const newVids = [...videos, ...existing];
      // Deduplicate by ID
      const unique = [];
      const seen = new Set();
      for (const v of newVids) {
        if (!seen.has(v.id)) {
          seen.add(v.id);
          unique.push(v);
        }
      }
      // Keep up to 100 videos max to avoid blowing up localStorage
      const entry: CacheEntry<any> = { data: unique.slice(0, 100), timestamp: Date.now() };
      localStorage.setItem(this.KEYS.RANDOM_VIDEOS, JSON.stringify(entry));
    } catch (e) {
      console.warn('[YoutubeCache] LocalStorage full, cannot save random videos');
    }
  }

  getRandomVideos(): any[] | null {
    try {
      const stored = localStorage.getItem(this.KEYS.RANDOM_VIDEOS);
      if (!stored) return null;
      const entry: CacheEntry<any> = JSON.parse(stored);
      if (Date.now() - entry.timestamp > this.TTL.RANDOM_VIDEOS) {
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
