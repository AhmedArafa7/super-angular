import { Injectable, inject } from '@angular/core';
import { halaltubeService } from '../../features/halaltube/halaltube.service';
import { IndexedDBService } from './indexed-db.service';
import { YoutubeDiscoveryService } from './youtube-discovery.service';
import { ContentSource } from '../../features/halaltube/halaltube.model';

export interface ShortVideo {
  id: string;
  title: string;
  author: string;
  authorId?: string;
  thumbnail: string;
  type: 'new' | 'watched' | 'saved';
  source?: ContentSource;
  url?: string;
}

const CURATED_SHORTS: ShortVideo[] = [
  {
    id: 'local_intro_1',
    title: 'لماذا يجعلك الأكل ضعيفا ؟ - كيف يجعلك الجوع بصحة افضل',
    author: 'إدارة الموقع',
    thumbnail: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=2953&auto=format&fit=crop',
    source: 'local',
    url: '/videos/لماذا يجعلك الأكل ضعيفا ؟ - كيف يجعلك الجوع بصحة افضل(240P).mp4',
    type: 'new'
  },
  {
    id: 'L_LUpnjgPso',
    title: 'مقتطفات روعة الطبيعة والحيوانات',
    author: 'عالم الطبيعة',
    thumbnail: 'https://i.ytimg.com/vi/L_LUpnjgPso/hqdefault.jpg',
    source: 'youtube',
    type: 'new'
  },
  {
    id: '_tV5LEBDs7w',
    title: 'نصائح لبرمجة نظيفة وسريعة',
    author: 'أكاديمية البرمجة',
    thumbnail: 'https://i.ytimg.com/vi/_tV5LEBDs7w/hqdefault.jpg',
    source: 'youtube',
    type: 'new'
  },
  {
    id: '3JZ_D3ELwOQ',
    title: 'تجارب علمية مذهلة في 60 ثانية',
    author: 'العلوم للجميع',
    thumbnail: 'https://i.ytimg.com/vi/3JZ_D3ELwOQ/hqdefault.jpg',
    source: 'youtube',
    type: 'new'
  },
  {
    id: '1La4QzyHYfA',
    title: 'العمارة الإسلامية والتاريخ',
    author: 'ثقافة وحضارة',
    thumbnail: 'https://i.ytimg.com/vi/1La4QzyHYfA/hqdefault.jpg',
    source: 'youtube',
    type: 'new'
  },
  {
    id: '2lAe1cqCOXo',
    title: 'ابتكارات التكنولوجيا الحديثة',
    author: 'تكنولوجيا المستقبل',
    thumbnail: 'https://i.ytimg.com/vi/2lAe1cqCOXo/hqdefault.jpg',
    source: 'youtube',
    type: 'new'
  }
];

@Injectable({
  providedIn: 'root'
})
export class ShortsQueueService {
  private halaltube = inject(halaltubeService);
  private idb = inject(IndexedDBService);
  private discovery = inject(YoutubeDiscoveryService);

  private isFetchingAPI = false;

  // Generate a queue of 20 videos according to the algorithm: 75% new, 20% watched, 5% saved.
  async generateQueue(): Promise<ShortVideo[]> {
    const queue: ShortVideo[] = [];

    // Fetch all available data sources
    const allHomeContent = this.halaltube.allHomeContent(); // Includes videos and shorts
    const shortsFeed = this.halaltube.shortsFeed(); // Use dedicated shorts feed if available

    // Combine shorts from both sources, with priority to shortsFeed
    let allShorts = [...shortsFeed];
    const feedShorts = allHomeContent.filter(v => v.isShorts || v.source === 'local');
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

    // 1. Get new videos (randomly selected from shorts sources)
    let newCandidates: any[] = [...allShorts];
    
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
            source: 'youtube' as const,
            url: v.url
          }));
          newCandidates = [...newCandidates, ...apiCandidates];
        }
      } catch (e) {
        console.warn('[ShortsQueue] Fallback API fetch failed', e);
      } finally {
        this.isFetchingAPI = false;
      }
    }

    // If still not enough shorts, merge curated shorts and normal home content
    if (newCandidates.length < 15) {
      const homeExtras = allHomeContent.filter(v => !v.isShorts);
      newCandidates = [...newCandidates, ...CURATED_SHORTS, ...homeExtras];
    }

    // Deduplicate candidates by ID
    const uniqueCandidates: any[] = [];
    const seenIds = new Set<string>();
    for (const item of newCandidates) {
      if (item && item.id && !seenIds.has(item.id)) {
        seenIds.add(item.id);
        uniqueCandidates.push(item);
      }
    }

    this.shuffle(uniqueCandidates);
    const newVids = uniqueCandidates.slice(0, 15).map(v => ({
      id: v.id,
      title: v.title,
      author: v.author,
      authorId: v.authorId,
      thumbnail: v.thumbnail || '',
      source: v.source || (v.id.startsWith('local_') ? 'local' : 'youtube'),
      url: v.url || (v.id === 'local_intro_1' ? '/videos/لماذا يجعلك الأكل ضعيفا ؟ - كيف يجعلك الجوع بصحة افضل(240P).mp4' : undefined),
      type: 'new' as const
    }));
    queue.push(...newVids);

    // 2. Get watched videos
    if (watchedHistory.length > 0) {
      this.shuffle(watchedHistory);
      const watched = watchedHistory.slice(0, 4).map(v => ({
        id: v.videoId,
        title: v.title || 'Watched Video',
        author: v.author || 'Unknown',
        authorId: v.authorId,
        thumbnail: v.thumbnail || '',
        source: v.source || 'youtube',
        url: v.url,
        type: 'watched' as const
      }));
      queue.push(...watched);
    }

    // 3. Get saved video
    if (savedVideos.length > 0) {
      this.shuffle(savedVideos);
      const saved = savedVideos.slice(0, 1).map(v => ({
        id: v.videoId,
        title: v.title || 'Saved Video',
        author: v.author || 'Unknown',
        authorId: v.authorId,
        thumbnail: v.thumbnail || '',
        source: v.source || 'youtube',
        url: v.url,
        type: 'saved' as const
      }));
      queue.push(...saved);
    }

    // If quota isn't filled to 20, backfill with remaining unique candidates
    const remaining = 20 - queue.length;
    if (remaining > 0) {
      const moreNew = uniqueCandidates.slice(15, 15 + remaining).map(v => ({
        id: v.id,
        title: v.title,
        author: v.author,
        authorId: v.authorId,
        thumbnail: v.thumbnail || '',
        source: v.source || (v.id.startsWith('local_') ? 'local' : 'youtube'),
        url: v.url || (v.id === 'local_intro_1' ? '/videos/لماذا يجعلك الأكل ضعيفا ؟ - كيف يجعلك الجوع بصحة افضل(240P).mp4' : undefined),
        type: 'new' as const
      }));
      queue.push(...moreNew);
    }

    // Final shuffle
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
