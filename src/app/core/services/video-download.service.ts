import { Injectable, inject, signal } from '@angular/core';
import { PipedApiService } from './piped-api.service';

export interface VideoDownloadStatus {
  videoId: string;
  status: 'idle' | 'downloading' | 'cached' | 'error';
  progress: number; // 0-100
  sizeBytes?: number;
  quality?: string;
  cachedAt?: number;
}

const VIDEO_CACHE_DB = 'WeTubeVideoCacheDB';
const VIDEO_CACHE_VERSION = 1;
const VIDEO_CACHE_STORE = 'video_blobs';
const MAX_CACHE_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB

@Injectable({ providedIn: 'root' })
export class VideoDownloadService {
  private pipedApi = inject(PipedApiService);

  /** Active download status signals keyed by videoId */
  downloadStatuses = signal<Record<string, VideoDownloadStatus>>({});

  private db: IDBDatabase | null = null;

  constructor() {
    this.initDB().catch(e => console.warn('[VideoDownloadService] DB init failed', e));
  }

  private initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.db) { resolve(); return; }
      const req = indexedDB.open(VIDEO_CACHE_DB, VIDEO_CACHE_VERSION);
      req.onerror = () => reject('Failed to open VideoCache DB');
      req.onsuccess = (e) => {
        this.db = (e.target as IDBOpenDBRequest).result;
        resolve();
      };
      req.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(VIDEO_CACHE_STORE)) {
          db.createObjectStore(VIDEO_CACHE_STORE, { keyPath: 'videoId' });
        }
      };
    });
  }

  async isCached(videoId: string): Promise<boolean> {
    await this.initDB();
    return new Promise((resolve) => {
      if (!this.db) { resolve(false); return; }
      const tx = this.db.transaction(VIDEO_CACHE_STORE, 'readonly');
      const store = tx.objectStore(VIDEO_CACHE_STORE);
      const req = store.get(videoId);
      req.onsuccess = () => resolve(!!req.result?.blob);
      req.onerror = () => resolve(false);
    });
  }

  async getCachedBlobUrl(videoId: string): Promise<string | null> {
    await this.initDB();
    return new Promise((resolve) => {
      if (!this.db) { resolve(null); return; }
      const tx = this.db.transaction(VIDEO_CACHE_STORE, 'readonly');
      const store = tx.objectStore(VIDEO_CACHE_STORE);
      const req = store.get(videoId);
      req.onsuccess = () => {
        if (req.result?.blob) {
          resolve(URL.createObjectURL(req.result.blob));
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  }

  async getAllCachedMeta(): Promise<any[]> {
    await this.initDB();
    return new Promise((resolve) => {
      if (!this.db) { resolve([]); return; }
      const tx = this.db.transaction(VIDEO_CACHE_STORE, 'readonly');
      const store = tx.objectStore(VIDEO_CACHE_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result || []).map((r: any) => ({
        videoId: r.videoId,
        title: r.title,
        author: r.author,
        thumbnail: r.thumbnail,
        quality: r.quality,
        sizeBytes: r.sizeBytes,
        cachedAt: r.cachedAt
      })));
      req.onerror = () => resolve([]);
    });
  }

  async downloadVideo(
    videoId: string,
    title: string,
    author: string,
    thumbnail: string,
    preferredQuality: '144p' | '360p' = '144p'
  ): Promise<string | null> {

    const cachedUrl = await this.getCachedBlobUrl(videoId);
    if (cachedUrl) {
      this.setStatus(videoId, { status: 'cached', progress: 100 });
      return cachedUrl;
    }

    const currentStatus = this.downloadStatuses()[videoId];
    if (currentStatus?.status === 'downloading') return null;

    this.setStatus(videoId, { status: 'downloading', progress: 0 });

    try {
      const details = await this.pipedApi.getVideoDetails(videoId);

      let streamUrl: string | null = null;
      let quality = preferredQuality;

      const targetQualities = preferredQuality === '144p'
        ? ['144p', '240p', '360p']
        : ['360p', '480p', '240p', '144p'];

      for (const q of targetQualities) {
        const stream = details.videoStreams?.find(
          (s: any) => !s.videoOnly && s.quality?.includes(q.replace('p', ''))
        );
        if (stream) {
          streamUrl = stream.url;
          quality = q as '144p' | '360p';
          break;
        }
      }

      if (!streamUrl && details.hls) {
        streamUrl = details.hls;
      }

      if (!streamUrl) {
        this.setStatus(videoId, { status: 'error', progress: 0 });
        return null;
      }

      const response = await fetch(streamUrl);

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`);
      }

      const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
      const reader = response.body.getReader();
      const chunks: Uint8Array<ArrayBuffer>[] = [];
      let receivedBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        receivedBytes += value.length;

        if (contentLength > 0) {
          const progress = Math.round((receivedBytes / contentLength) * 100);
          this.setStatus(videoId, { status: 'downloading', progress });
        }
      }

      const blob = new Blob(chunks as BlobPart[], { type: 'video/mp4' });

      await this.enforceStorageLimit(blob.size);

      await this.saveBlob(videoId, blob, {
        title, author, thumbnail, quality,
        sizeBytes: blob.size,
        cachedAt: Date.now()
      });

      const blobUrl = URL.createObjectURL(blob);
      this.setStatus(videoId, { status: 'cached', progress: 100, sizeBytes: blob.size, quality });
      return blobUrl;

    } catch (err) {
      console.error('[VideoDownloadService] Download failed for', videoId, err);
      this.setStatus(videoId, { status: 'error', progress: 0 });
      return null;
    }
  }

  async deleteCached(videoId: string): Promise<void> {
    await this.initDB();
    return new Promise((resolve, reject) => {
      if (!this.db) { resolve(); return; }
      const tx = this.db.transaction(VIDEO_CACHE_STORE, 'readwrite');
      const store = tx.objectStore(VIDEO_CACHE_STORE);
      const req = store.delete(videoId);
      req.onsuccess = () => {
        this.setStatus(videoId, { status: 'idle', progress: 0 });
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  }

  private setStatus(videoId: string, partial: Partial<VideoDownloadStatus>) {
    const current = this.downloadStatuses()[videoId] || {
      videoId, status: 'idle', progress: 0
    };
    this.downloadStatuses.update(all => ({
      ...all,
      [videoId]: { ...current, ...partial, videoId }
    }));
  }

  private saveBlob(videoId: string, blob: Blob, meta: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) { reject('DB not initialized'); return; }
      const tx = this.db.transaction(VIDEO_CACHE_STORE, 'readwrite');
      const store = tx.objectStore(VIDEO_CACHE_STORE);
      const req = store.put({ videoId, blob, ...meta });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  private async enforceStorageLimit(incomingBytes: number): Promise<void> {
    await this.initDB();
    return new Promise((resolve) => {
      if (!this.db) { resolve(); return; }
      const tx = this.db.transaction(VIDEO_CACHE_STORE, 'readwrite');
      const store = tx.objectStore(VIDEO_CACHE_STORE);
      const req = store.getAll();

      req.onsuccess = () => {
        const all: any[] = req.result || [];
        const totalBytes = all.reduce((sum: number, r: any) => sum + (r.sizeBytes || 0), 0) + incomingBytes;

        if (totalBytes > MAX_CACHE_BYTES) {
          all.sort((a: any, b: any) => (a.cachedAt || 0) - (b.cachedAt || 0));
          let freed = 0;
          for (const r of all) {
            if (totalBytes - freed <= MAX_CACHE_BYTES) break;
            store.delete(r.videoId);
            freed += r.sizeBytes || 0;
          }
        }
        resolve();
      };
      req.onerror = () => resolve();
    });
  }
}
