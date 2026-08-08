import { Injectable, inject } from '@angular/core';
import { halaltubeService } from '../../features/halaltube/halaltube.service';
import { IndexedDBService } from './indexed-db.service';
import { YoutubeDiscoveryService } from './youtube-discovery.service';

export interface ShortVideo {
  id: string;
  title: string;
  author: string;
  authorId?: string;
  thumbnail: string;
  type: 'new' | 'watched' | 'saved';
}

@Injectable({
  providedIn: 'root'
})
export class ShortsQueueService {
  private halaltube = inject(halaltubeService);
  private idb = inject(IndexedDBService);
  private discovery = inject(YoutubeDiscoveryService);

  private isFetchingAPI = false;

  // Generate a queue of 20 videos according to the algorithm: 75% new, 20% watched, 5% saved.
  // 75% of 20 = 15 new
  // 20% of 20 = 4 watched
  // 5% of 20 = 1 saved
  async generateQueue(): Promise<ShortVideo[]> {
    const queue: ShortVideo[] = [];

    // Fetch all available data sources
    const allHomeContent = this.halaltube.allHomeContent(); // Includes videos and shorts
    const shortsFeed = this.halaltube.shortsFeed(); // Use dedicated shorts feed if available

    // Combine shorts from both sources, with priority to shortsFeed
    let allShorts = [...shortsFeed];
    const feedShorts = allHomeContent.filter(v => v.isShorts);
    const existingIds = new Set(allShorts.map(v => v.id));
    for (const short of feedShorts) {
      if (!existingIds.has(short.id)) {
        allShorts.push(short);
      }
    }
    
    let watchedHistory: any[] = [];
    let savedVideos: any[] = [];
    
    try {
      watchedHistory = await this.idb.getAll('watch_history') || [];
      savedVideos = await this.idb.getAll('saved_videos') || [];
    } catch (e) {
      console.warn('Could not read from IndexedDB for Shorts Queue', e);
    }

    // 1. Get 15 new videos (randomly selected from shorts sources)
    let newCandidates = [...allShorts];
    
    // Guard Clause & API Fallback
    if (newCandidates.length < 15 && !this.isFetchingAPI) {
      try {
        this.isFetchingAPI = true;
        console.log('[ShortsQueue] Fetching real shorts from API as fallback...');
        const apiShorts = await this.discovery.searchYouTube('shorts', 'EgQYAXAB').toPromise();
        if (apiShorts && apiShorts.length > 0) {
          const apiCandidates = apiShorts.map((v: any) => ({
            id: v.id,
            title: v.title,
            author: v.author,
            thumbnail: v.thumbnail || '',
            isShorts: true,
            source: 'youtube' as const
          }));
          newCandidates = [...newCandidates, ...apiCandidates];
        }
      } catch (e) {
        console.warn('[ShortsQueue] Fallback API fetch failed', e);
      } finally {
        this.isFetchingAPI = false;
      }
    }

    if (newCandidates.length < 15) {
      // Fallback to normal videos if API failed or still not enough shorts
      newCandidates = [...newCandidates, ...allHomeContent.filter(v => !v.isShorts)];
    }
    this.shuffle(newCandidates);
    const newVids = newCandidates.slice(0, 15).map(v => ({
      id: v.id,
      title: v.title,
      author: v.author,
      authorId: v.authorId,
      thumbnail: v.thumbnail || '',
      type: 'new' as const
    }));
    queue.push(...newVids);

    // 2. Get 4 watched videos
    if (watchedHistory.length > 0) {
      this.shuffle(watchedHistory);
      const watched = watchedHistory.slice(0, 4).map(v => ({
        id: v.videoId,
        title: v.title || 'Watched Video',
        author: v.author || 'Unknown',
        authorId: v.authorId,
        thumbnail: v.thumbnail || '',
        type: 'watched' as const
      }));
      queue.push(...watched);
    }

    // 3. Get 1 saved video
    if (savedVideos.length > 0) {
      this.shuffle(savedVideos);
      const saved = savedVideos.slice(0, 1).map(v => ({
        id: v.videoId,
        title: v.title || 'Saved Video',
        author: v.author || 'Unknown',
        authorId: v.authorId,
        thumbnail: v.thumbnail || '',
        type: 'saved' as const
      }));
      queue.push(...saved);
    }

    // If we couldn't fulfill the quota from watched/saved, backfill with more new videos
    const remaining = 20 - queue.length;
    if (remaining > 0) {
      const moreNew = newCandidates.slice(15, 15 + remaining).map(v => ({
        id: v.id,
        title: v.title,
        author: v.author,
        authorId: v.authorId,
        thumbnail: v.thumbnail || '',
        type: 'new' as const
      }));
      queue.push(...moreNew);
    }

    // Final shuffle so the user doesn't see a block of 15 new, then 4 old, then 1 saved.
    this.shuffle(queue);
    
    return queue;
  }

  // Fisher-Yates shuffle
  private shuffle(array: any[]) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}
