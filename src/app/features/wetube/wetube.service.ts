import { Injectable, signal, computed, inject } from '@angular/core';
import { firstValueFrom, from, catchError } from 'rxjs';
import { QueryDocumentSnapshot } from 'firebase/firestore';
import { Video, YouTubeSubscription, FeedVideo, HistoryItem, WeTubeTab, ContentItem, checkIsShorts } from './wetube.model';
import { FirebaseService } from '../../core/services/firebase.service';
import { YoutubeDiscoveryService, VideoDetails, YouTubeComment } from '../../core/services/youtube-discovery.service';
import { YoutubeDataService, YouTubeChannelStats, YouTubeVideo } from '../../core/services/youtube-data.service';
import { YoutubeCacheService } from '../../core/services/youtube-cache.service';
import { IndexedDBService } from '../../core/services/indexed-db.service';
import { PipedApiService } from '../../core/services/piped-api.service';
import { InvidiousProviderService } from '../../core/services/providers/invidious-provider.service';
import { environment } from '../../../environments/environment';
import { EncryptionService } from '../../core/services/encryption.service';

export interface AlgorithmConfig {
  subscriptionWeight: number;
  hideWatched: boolean;
  categoryWeights: { [category: string]: number };
  dataSaverEnabled: boolean;
  targetUpscaleQuality: string;
}

@Injectable({
  providedIn: 'root'
})
export class WeTubeService {
  private firebaseService = inject(FirebaseService);
  private discoveryService = inject(YoutubeDiscoveryService);
  private dataService = inject(YoutubeDataService);
  private cacheService = inject(YoutubeCacheService);
  private idb = inject(IndexedDBService);
  private encryption = inject(EncryptionService);

  // Core State
  readonly videos = signal<Video[]>([]);
  readonly subscriptions = signal<YouTubeSubscription[]>([]);
  readonly feedVideos = signal<FeedVideo[]>([]);
  readonly trendingVideos = signal<FeedVideo[]>([]);
  readonly searchResults = signal<FeedVideo[]>([]);
  readonly shortsFeed = signal<FeedVideo[]>([]);
  readonly subscriptionsFeed = signal<FeedVideo[]>([]);
  readonly isSubsFeedLoading = signal<boolean>(false);

  // UI State
  readonly activeTab = signal<WeTubeTab>('home');
  readonly activeCategory = signal<string>('الكل');
  readonly searchQuery = signal<string>('');
  readonly isSearching = signal<boolean>(false);
  readonly isFeedLoading = signal<boolean>(false);
  readonly isShortsLoading = signal<boolean>(false);
  readonly isSidebarCollapsed = signal<boolean>(true); // مغلق افتراضياً لتوسيع مساحة المشاهدة
  readonly isUsingCachedData = signal<boolean>(false);
  readonly showUploadModal = signal<boolean>(false);
  readonly searchSp = signal<string>('');
  
  // Pagination State for Whitelist
  readonly lastVisibleFeedDoc = signal<QueryDocumentSnapshot | null>(null);
  readonly hasMoreFeed = signal<boolean>(true);
  readonly reportedVideoIds = signal<Set<string>>(new Set());

  // Active Content Context
  readonly activeChannel = signal<{ id: string, name: string, avatar?: string } | null>(null);
  readonly channelVideos = signal<FeedVideo[]>([]);

  // History State
  readonly history = signal<HistoryItem[]>([]);
  readonly remoteHistory = signal<FeedVideo[]>([]);

  // Video details
  readonly currentVideoDetails = signal<VideoDetails | null>(null);
  readonly currentVideoComments = signal<YouTubeComment[]>([]);

  // Channel stats (for the authenticated YouTube channel)
  readonly myChannelStats = signal<YouTubeChannelStats | null>(null);
  readonly myVideos = signal<YouTubeVideo[]>([]);
  
  readonly algoConfig = signal<AlgorithmConfig>({
    subscriptionWeight: 50,
    hideWatched: false,
    dataSaverEnabled: false,
    targetUpscaleQuality: '720p',
    categoryWeights: {
      'موسيقى': 5,
      'ألعاب': 5,
      'مباشر': 5,
      'رياضة': 5,
      'أخبار': 5,
      'بودكاست': 5,
      'برمجة': 5,
      'طبخ': 5,
      'تكنولوجيا': 5,
      'كوميديا': 5,
      'اقتصاد': 5
    }
  });

  // Computed State: allHomeContent
  readonly allHomeContent = computed(() => {
    const searchRes = this.searchResults();
    const query = this.searchQuery();
    const subs = this.subscriptions();

    if (searchRes.length > 0 && query) {
      return searchRes.map(v => {
        const sub = subs.find(s => s.channelId === v.authorId);
        return { ...v, channelAvatar: v.channelAvatar || sub?.avatarUrl };
      });
    }

    const channel = this.activeChannel();
    if (channel) {
      return this.channelVideos().map(v => {
        const sub = subs.find(s => s.channelId === v.authorId);
        return { ...v, channelAvatar: v.channelAvatar || channel.avatar || sub?.avatarUrl };
      });
    }

    // Map public/Firestore whitelist videos
    const dbVids = this.feedVideos().map(v => ({
      ...v,
      source: 'youtube' as const,
      time: 'حديثاً',
      category: v.category || 'تكنولوجيا',
      channelAvatar: v.channelAvatar || subs.find(s => s.channelId === v.authorId)?.avatarUrl
    }));

    // Map Subscribed Channels RSS feed videos
    const subVids = this.subscriptionsFeed().map(v => ({
      ...v,
      source: 'youtube' as const,
      time: 'جديد المشتركين',
      category: v.category || 'تكنولوجيا',
      channelAvatar: v.channelAvatar || subs.find(s => s.channelId === v.authorId)?.avatarUrl
    }));

    let combined: ContentItem[] = [];
    const tab = this.activeTab();

    const localVideos: ContentItem[] = [{
      id: 'local_intro_1',
      title: 'لماذا يجعلك الأكل ضعيفا ؟ - كيف يجعلك الجوع بصحة افضل',
      source: 'local',
      author: 'إدارة الموقع',
      time: 'منذ يومين',
      category: 'صحة',
      thumbnail: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=2953&auto=format&fit=crop',
      url: '/videos/لماذا يجعلك الأكل ضعيفا ؟ - كيف يجعلك الجوع بصحة افضل(240P).mp4',
      duration: '08:44',
      views: '1M',
      visibility: 'public'
    }];

    if (tab === 'home') {
      const config = this.algoConfig();
      const subWeight = config.subscriptionWeight / 100;
      
      if (subVids.length === 0) {
        // Fallback to Whitelist only if they are not logged in or have no subscriptions
        combined = [...localVideos, ...dbVids];
      } else {
        combined = [...localVideos];
        // Advanced Recommendation interleaving based on subscriptionWeight
        let subIdx = 0;
        let dbIdx = 0;
        const totalTarget = 100;
        
        while (combined.length < totalTarget && (subIdx < subVids.length || dbIdx < dbVids.length)) {
          // Weighted choice: pull from subscriptions feed vs whitelist feed
          if (subIdx < subVids.length && (dbIdx >= dbVids.length || Math.random() < subWeight)) {
            combined.push(subVids[subIdx++]);
          } else if (dbIdx < dbVids.length) {
            combined.push(dbVids[dbIdx++]);
          } else {
            break;
          }
        }
      }
    } else if (tab === 'explore') {
      combined = [...localVideos, ...dbVids];
    } else {
      combined = [...localVideos, ...subVids, ...dbVids];
    }

    const category = this.activeCategory();
    if (category !== 'الكل' && category !== 'تريند') {
      combined = combined.filter(v =>
        v.title.toLowerCase().includes(category.toLowerCase()) ||
        v.category === category
      );
    }

    // Filter out reported videos instantly from feed
    const reported = this.reportedVideoIds();
    combined = combined.filter(v => !reported.has(v.id));

    // Filter out previously watched videos if configured
    const config = this.algoConfig();
    if (config.hideWatched) {
      const watchHistory = this.firebaseService.userData()?.watchHistory || [];
      const watchedIds = new Set(watchHistory.map(h => h.videoId));
      combined = combined.filter(v => !watchedIds.has(v.id));
    }

    // Deduplicate by video ID to prevent duplicate items in Angular rendering loops
    const uniqueCombined: ContentItem[] = [];
    const seenIds = new Set<string>();
    for (const item of combined) {
      if (item && item.id && !seenIds.has(item.id)) {
        seenIds.add(item.id);
        uniqueCombined.push(item);
      }
    }
    combined = uniqueCombined;

    // Recommendation Sorting: prioritizing user's favorite categories, then sorting by _shuffleOrder
    const catWeights = config.categoryWeights || {};
    const sorted = combined.sort((a, b) => {
      const weightA = catWeights[a.category || ''] || 5;
      const weightB = catWeights[b.category || ''] || 5;
      
      if (weightA !== weightB) {
        return weightB - weightA; // Higher weight comes first
      }

      // Preserve the shuffled order if weights are equal
      const orderA = (a as any)._shuffleOrder !== undefined ? (a as any)._shuffleOrder : Math.random();
      const orderB = (b as any)._shuffleOrder !== undefined ? (b as any)._shuffleOrder : Math.random();
      return orderA - orderB;
    });

    // Enforce channel diversity so videos from the same channel are never clustered together
    return this.enforceChannelDiversity(sorted);
  });

  private enforceChannelDiversity<T extends { author?: string }>(videos: T[]): T[] {
    const authorMap = new Map<string, T[]>();
    for (const v of videos) {
      const author = v.author || 'Unknown';
      if (!authorMap.has(author)) {
        authorMap.set(author, []);
      }
      authorMap.get(author)!.push(v);
    }

    const authorLists = Array.from(authorMap.values());
    authorLists.sort((a, b) => b.length - a.length);

    const result: T[] = [];
    let added = true;
    while (added) {
      added = false;
      for (const list of authorLists) {
        if (list.length > 0) {
          result.push(list.shift()!);
          added = true;
        }
      }
    }
    return result;
  }

  // Actions
  setActiveTab(tab: WeTubeTab) {
    this.activeTab.set(tab);
  }

  setActiveCategory(cat: string) {
    this.activeCategory.set(cat);
  }

  setSearchQuery(query: string) {
    this.searchQuery.set(query);
  }

  setActiveChannel(channel: { id: string, name: string, avatar?: string } | null) {
    this.activeChannel.set(channel);
    this.activeTab.set('home');
    this.searchResults.set([]);
    this.searchQuery.set('');
    this.searchSp.set('');
  }

  forceRefresh(): void {
    this.cacheService.clearFeed();
    this.cacheService.clearSubscriptions();
    this.idb.delete('whitelist_feed', 'main');
    this.lastVisibleFeedDoc.set(null);
    this.hasMoreFeed.set(true);
    this.loadTrending(true);
    this.loadMySubscriptions(true);
  }

  // ── Real data fetching ─────────────────────────────────────

  private pipedApiService = inject(PipedApiService);
  private invidious = inject(InvidiousProviderService);

  async loadTrending(force = false): Promise<void> {
    if (!force) {
      const cached = await this.idb.getWithTTL('whitelist_feed', 'main', 60 * 60 * 1000); // 60 mins TTL
      if (cached && cached.videos && cached.videos.length > 0) {
        this.trendingVideos.set(cached.videos);
        this.feedVideos.set(cached.videos);
        this.isUsingCachedData.set(true);
        return;
      }
    }

    this.isFeedLoading.set(true);
    this.isUsingCachedData.set(false);
    
    try {
      // Make sure subscriptions are loaded first to enable subscription feed mixing
      if (this.subscriptions().length === 0) {
        await this.loadMySubscriptions();
      }

      const topics = ['برمجة', 'تكنولوجيا', 'علوم', 'وثائقي', 'أخبار تقنية', 'ذكاء اصطناعي', 'تطوير الويب', 'عالم الفضاء', 'تاريخ', 'بودكاست'];
      const randomTopic = topics[Math.floor(Math.random() * topics.length)];

      // Fetch RSS feeds, Whitelist videos, and random YT topic in parallel
      const cachedLive = this.cacheService.getRandomVideos() || [];
      let liveVideosPromise = Promise.resolve(cachedLive.slice(0, 5)); // Use 5 cached by default
      
      // If cache is empty or we want to refresh (e.g. 20% chance to fetch new), fetch from API
      if (cachedLive.length < 20 || Math.random() < 0.2) {
        liveVideosPromise = firstValueFrom(this.discoveryService.searchYouTube(randomTopic))
          .then(vids => {
            if (vids && vids.length > 0) {
              this.cacheService.setRandomVideos(vids);
            }
            return vids.slice(0, 5); // Take up to 5 fresh ones
          })
          .catch(() => cachedLive.slice(0, 5));
      }

      const [_, firestoreResult, liveVideos] = await Promise.all([
        this.loadSubscriptionsFeed(force),
        this.firebaseService.getPublishedVideos(undefined, 50),
        liveVideosPromise
      ]);
      const subVideos = this.subscriptionsFeed();
      
      const mappedFirestore: FeedVideo[] = firestoreResult.videos.map((v: any) => {
        const isYt = v.source === 'youtube';
        return {
          id: v.id,
          title: v.title,
          url: v.url || v.externalUrl || (isYt ? `https://www.youtube.com/watch?v=${v.id}` : ''),
          thumbnail: v.thumbnail || (isYt ? `https://img.youtube.com/vi/${v.id}/hqdefault.jpg` : ''),
          author: v.author,
          authorId: v.authorId,
          time: v.time || 'حديثاً',
          source: v.source || 'youtube',
          isShorts: v.isShorts || false,
          isWhitelisted: true, // Add this flag
          _shuffleOrder: Math.random() // Add shuffle order
        } as any;
      });

      // Combine personalized subscription videos, published Firestore videos, and random topic videos
      let combined = [...subVideos, ...mappedFirestore, ...liveVideos];

      // Shuffle the combined array to make the feed dynamic and prevent static content
      for (let i = combined.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [combined[i], combined[j]] = [combined[j], combined[i]];
      }

      // Add _shuffleOrder to all items so they keep this order after sorting
      combined = combined.map((v, idx) => ({ ...v, _shuffleOrder: idx }));

      // Deduplicate by ID just in case
      const seenIds = new Set();
      combined = combined.filter(v => {
        if (seenIds.has(v.id)) return false;
        seenIds.add(v.id);
        return true;
      });
      
      this.trendingVideos.set(combined);
      this.feedVideos.set(combined);
      this.lastVisibleFeedDoc.set(firestoreResult.lastVisible);
      this.hasMoreFeed.set(firestoreResult.videos.length >= 50);

      // Cache the fresh combined feed
      await this.idb.setWithTTL('whitelist_feed', { id: 'main', videos: combined });
      
    } catch (err) {
      console.error('[WeTubeService] loadTrending failed', err);
      // Absolute fallback
      try {
        const fallbackVids = await firstValueFrom(this.discoveryService.searchYouTube('برمجة'));
        this.trendingVideos.set(fallbackVids);
        this.feedVideos.set(fallbackVids);
      } catch (e) {}
    } finally {
      this.isFeedLoading.set(false);
    }
  }

  async loadMoreTrending(): Promise<void> {
    if (!this.hasMoreFeed() || this.isFeedLoading()) return;

    this.isFeedLoading.set(true);
    
    try {
      const topics = ['برمجة', 'تكنولوجيا', 'علوم', 'وثائقي', 'أخبار تقنية', 'ذكاء اصطناعي', 'تطوير الويب', 'عالم الفضاء', 'تاريخ', 'بودكاست'];
      const randomTopic = topics[Math.floor(Math.random() * topics.length)];

      const [result, liveVideos] = await Promise.all([
        this.firebaseService.getPublishedVideos(this.lastVisibleFeedDoc() || undefined, 20),
        firstValueFrom(this.discoveryService.searchYouTube(randomTopic)).catch(() => [])
      ]);
      
      const mappedVideos: FeedVideo[] = result.videos.map(v => {
        const isYt = v.source === 'youtube';
        return {
          id: v.id,
          title: v.title,
          url: v.url || v.externalUrl || (isYt ? `https://www.youtube.com/watch?v=${v.id}` : ''),
          thumbnail: v.thumbnail || (isYt ? `https://img.youtube.com/vi/${v.id}/hqdefault.jpg` : ''),
          author: v.author,
          authorId: v.authorId,
          time: v.time || new Date(v.createdAt).toLocaleDateString(),
          source: v.source || 'youtube',
          isShorts: v.isShorts || false,
          isWhitelisted: true, // Add this flag
          channelAvatar: v.channelAvatar,
          duration: v.duration,
          views: v.views ? `${v.views} مشاهدة` : undefined
        };
      });
      
      let newCombined = [...mappedVideos, ...liveVideos];

      // Shuffle
      for (let i = newCombined.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newCombined[i], newCombined[j]] = [newCombined[j], newCombined[i]];
      }

      this.trendingVideos.update(vids => [...vids, ...newCombined]);
      this.feedVideos.update(vids => {
        const combined = [...vids, ...newCombined];
        // Deduplicate
        const seenIds = new Set();
        return combined.filter(v => {
          if (seenIds.has(v.id)) return false;
          seenIds.add(v.id);
          return true;
        });
      });
      
      this.lastVisibleFeedDoc.set(result.lastVisible);
      this.hasMoreFeed.set(result.videos.length === 20);
      
    } catch (err) {
      console.error('[WeTubeService] loadMoreTrending failed', err);
    } finally {
      this.isFeedLoading.set(false);
    }
  }

  async search(query: string, sp?: string): Promise<void> {
    this.isSearching.set(true);
    this.setSearchQuery(query);
    if (sp !== undefined) {
      this.searchSp.set(sp);
    }
    
    if (!query.trim()) {
      this.searchResults.set([]);
      this.isSearching.set(false);
      return;
    }

    this.discoveryService.searchYouTube(query, sp).pipe(
      catchError(err => {
        console.warn('[WeTubeService] Discovery search failed, trying Piped...', err);
        return from(this.pipedApiService.search(query));
      }),
      catchError(err => {
        console.warn('[WeTubeService] Piped search failed, trying Invidious...', err);
        return this.invidious.search(query, sp);
      })
    ).subscribe({
      next: async (videos) => {
        let finalVideos: any[] = videos || [];
        // If initial search returned very few results (less than 5), supplement with Piped search
        if (!finalVideos || finalVideos.length < 5) {
          try {
            const pipedVids = await this.pipedApiService.search(query);
            if (pipedVids && pipedVids.length > 0) {
              const seen = new Set(finalVideos.map((v: any) => v.id));
              const combined = [...finalVideos];
              for (const pVid of pipedVids) {
                if (!seen.has(pVid.id)) {
                  seen.add(pVid.id);
                  combined.push(pVid);
                }
              }
              finalVideos = combined;
            }
          } catch (e) {}
        }

        // Check which videos are already whitelisted
        const videoIds = finalVideos.map((v: any) => v.id);
        const whitelistedIds = await this.firebaseService.checkVideosExist(videoIds);
        const whitelistedSet = new Set(whitelistedIds);
        
        // Add isWhitelisted flag
        const videosWithFlag = finalVideos.map((v: any) => ({
          ...v,
          isWhitelisted: whitelistedSet.has(v.id)
        }));
        
        this.searchResults.set(videosWithFlag);
        this.isSearching.set(false);
      },
      error: (err) => {
        console.error('[WeTubeService] All search providers failed:', err);
        this.searchResults.set([]);
        this.isSearching.set(false);
      }
    });
  }

  async loadVideoDetails(videoId: string): Promise<void> {
    this.discoveryService.fetchVideoDetails(videoId).subscribe({
      next: async (details) => {
        if (details) {
          // Check if video is whitelisted
          const whitelistedIds = await this.firebaseService.checkVideosExist([videoId]);
          const isWhitelisted = whitelistedIds.includes(videoId);
          
          this.currentVideoDetails.set({
            ...details,
            isWhitelisted
          });
          
          this.firebaseService.addToHistory({
            videoId: details.id,
            title: details.title,
            thumbnail: details.thumbnail || `https://img.youtube.com/vi/${details.id}/hqdefault.jpg`,
            author: details.author,
            watchedAt: Date.now()
          });
        } else {
          this.currentVideoDetails.set(null);
        }
      },
      error: (err) => console.error('[WeTubeService] loadVideoDetails failed:', err)
    });
  }

  async loadVideoComments(videoId: string): Promise<void> {
    this.discoveryService.fetchVideoComments(videoId).subscribe({
      next: (comments) => this.currentVideoComments.set(comments),
      error: (err) => console.error('[WeTubeService] loadVideoComments failed:', err)
    });
  }

  async loadMyYouTubeData(): Promise<void> {
    const uid = this.firebaseService.getUserId();
    if (!uid) return;

    this.dataService.getMyStats(uid).subscribe({
      next: (stats) => this.myChannelStats.set(stats),
      error: (err) => console.error('[WeTubeService] loadMyYouTubeData stats failed:', err)
    });

    this.dataService.getMyVideos(uid).subscribe({
      next: (videos) => this.myVideos.set(videos),
      error: (err) => console.error('[WeTubeService] loadMyYouTubeData videos failed:', err)
    });
  }

  async loadMySubscriptions(force = false): Promise<void> {
    // 1. Load local subscriptions from IndexedDB (Phase 3 Immutability Rule)
    try {
      const localSubs = await this.idb.getAll('subscriptions') || [];
      const cleanSubs = localSubs.filter(s => s && s.channelId && s.channelId !== 'undefined' && s.channelTitle);
      if (cleanSubs.length > 0) {
        this.subscriptions.set(cleanSubs);
      }
      if (localSubs.length !== cleanSubs.length) {
        force = true;
      }
    } catch (e) {
      console.warn('Failed to load local subscriptions from IndexedDB', e);
    }

    if (!force) {
      const cachedSubs = this.cacheService.getSubscriptions();
      if (cachedSubs && cachedSubs.length > 0) {
        // Merge local and cached
        this.mergeSubscriptions(cachedSubs);
        return;
      }
    }

    const ytAccount = this.firebaseService.getYouTubeAccount();
    if (!ytAccount?.accessToken) return;

    this.dataService.fetchMySubscriptions(ytAccount.accessToken).subscribe({
      next: (subs) => {
        const mappedSubs = subs.map(s => ({
          id: s.channelId,
          channelId: s.channelId,
          channelTitle: s.title,
          avatarUrl: s.thumbnail
        }));
        this.mergeSubscriptions(mappedSubs);
        this.cacheService.setSubscriptions(mappedSubs);
      },
      error: (err) => {
        console.error('[WeTubeService] loadMySubscriptions failed:', err);
        const fallback = this.cacheService.getSubscriptions();
        if (fallback) {
          this.mergeSubscriptions(fallback);
        }
      }
    });
  }

  private mergeSubscriptions(newSubs: YouTubeSubscription[]) {
    const current = this.subscriptions().filter(s => s.channelId && s.channelId !== 'undefined');
    const subMap = new Map<string, YouTubeSubscription>();
    current.forEach(s => subMap.set(s.channelId, s));
    
    for (const sub of newSubs) {
      if (!sub.channelId || sub.channelId === 'undefined') continue;
      const existing = subMap.get(sub.channelId);
      if (existing) {
        subMap.set(sub.channelId, {
          ...existing,
          channelTitle: sub.channelTitle || existing.channelTitle,
          avatarUrl: sub.avatarUrl || existing.avatarUrl
        });
      } else {
        subMap.set(sub.channelId, sub);
      }
    }
    
    const merged = Array.from(subMap.values());
    this.subscriptions.set(merged);

    // Save clean subscriptions back to IndexedDB
    merged.forEach(async (sub) => {
      try {
        await this.idb.put('subscriptions', sub);
      } catch (e) {}
    });
  }

  isSubscribedToChannel(channelId?: string, channelTitle?: string): boolean {
    const current = this.subscriptions();
    if (!current || current.length === 0) return false;

    const normalize = (str?: string) => str ? str.trim().toLowerCase().replace(/[\u064B-\u0652]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه') : '';

    const cleanId = channelId?.trim();
    const cleanTitle = normalize(channelTitle);

    return current.some(s => {
      const sId = s.channelId || s.id;
      if (cleanId && sId && (sId === cleanId || cleanId.includes(sId) || sId.includes(cleanId))) return true;
      
      const sTitle = normalize(s.channelTitle || (s as any).name || (s as any).title || (s as any).channelName || (s as any).author);
      if (cleanTitle && sTitle && (sTitle === cleanTitle || sTitle.includes(cleanTitle) || cleanTitle.includes(sTitle))) return true;
      
      return false;
    });
  }

  async toggleSubscription(channelId: string, channelTitle: string, avatarUrl: string): Promise<boolean> {
    const effectiveId = channelId || ('title_' + encodeURIComponent(channelTitle || 'channel'));
    const isSub = this.isSubscribedToChannel(effectiveId, channelTitle);
    
    try {
      if (isSub) {
        const current = this.subscriptions();
        const existing = current.find(s => 
          (effectiveId && (s.channelId === effectiveId || s.id === effectiveId)) ||
          (channelTitle && s.channelTitle && s.channelTitle.trim().toLowerCase() === channelTitle.trim().toLowerCase())
        );
        const delId = existing ? (existing.id || existing.channelId) : effectiveId;
        await this.idb.delete('subscriptions', delId);
        this.subscriptions.update(subs => subs.filter(s => 
          s.channelId !== delId && 
          s.id !== delId && 
          (!channelTitle || !s.channelTitle || s.channelTitle.trim().toLowerCase() !== channelTitle.trim().toLowerCase())
        ));
        return false;
      } else {
        const newSub = { id: effectiveId, channelId: effectiveId, channelTitle: channelTitle || 'قناة', avatarUrl: avatarUrl || '', subscribedAt: Date.now() };
        await this.idb.put('subscriptions', newSub);
        this.subscriptions.update(subs => [...subs, newSub]);
        return true;
      }
    } catch (e) {
      console.error('Failed to toggle subscription in IndexedDB', e);
      return isSub;
    }
  }

  startYouTubeAuth(): void {
    this.firebaseService.signInWithGoogle().then(success => {
      if (success) {
        this.loadMySubscriptions(true);
      }
    });
  }

  async fetchChannelRssVideos(channelId: string): Promise<FeedVideo[]> {
    if (!channelId) return [];

    try {
      const channelDetails = await this.pipedApiService.getChannelDetails(channelId);
      if (!channelDetails || !channelDetails.relatedStreams) return [];

      const videos: FeedVideo[] = [];
      const streams = channelDetails.relatedStreams;

      for (let i = 0; i < Math.min(streams.length, 30); i++) {
        const stream = streams[i];
        if (stream.type !== 'stream') continue;

        const videoId = stream.url.replace('/watch?v=', '');
        
        videos.push({
          id: videoId,
          title: stream.title,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          author: stream.uploaderName || '',
          authorId: channelId,
          time: stream.uploadedDate || 'حديثاً',
          source: 'youtube' as const,
          isShorts: stream.isShort === true || (stream.duration > 0 && stream.duration <= 65) || stream.title.toLowerCase().includes('#shorts'),
          duration: stream.duration ? this.formatDuration(stream.duration) : undefined,
          views: stream.views ? `${stream.views} مشاهدة` : undefined
        });
      }

      return videos;
    } catch (err) {
      console.error(`[WeTubeService] Failed to fetch channel details for ${channelId}`, err);
      return [];
    }
  }

  private formatDuration(seconds: number): string {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    if (m > 60) {
      const h = Math.floor(m / 60);
      const rm = m % 60;
      return `${h}:${rm.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  async loadSubscriptionsFeed(force = false): Promise<void> {
    if (!force && this.subscriptionsFeed().length > 0) return;
    
    // Ensure subscriptions are loaded first
    let subs = this.subscriptions();
    if (subs.length === 0) {
      try {
        const localSubs = await this.idb.getAll('subscriptions') || [];
        subs = localSubs.filter(s => s && s.channelId && s.channelId !== 'undefined' && s.channelTitle);
        if (subs.length > 0) {
          this.subscriptions.set(subs);
        }
      } catch (e) {}
    }

    if (subs.length === 0) {
      this.subscriptionsFeed.set([]);
      return;
    }
    
    this.isSubsFeedLoading.set(true);
    
    try {
      // Sort favorite subscriptions first, then limit to a maximum of 15 channels to avoid proxy throttling and excessive network usage
      const sortedSubs = [...subs].sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0));
      const channelIds = sortedSubs.map(s => s.channelId).slice(0, 15);
      
      const results: FeedVideo[][] = [];
      const chunkSize = 5; // Fetch 5 channels at a time
      
      for (let i = 0; i < channelIds.length; i += chunkSize) {
        const chunk = channelIds.slice(i, i + chunkSize);
        const chunkPromises = chunk.map(id => this.fetchChannelRssVideos(id));
        const chunkResults = await Promise.all(chunkPromises);
        results.push(...chunkResults);
        
        if (i + chunkSize < channelIds.length) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      const allVideos = results.flat();
      
      // Sort them by published date
      allVideos.sort((a, b) => {
        const aTime = new Date(a.time || 0).getTime();
        const bTime = new Date(b.time || 0).getTime();
        return bTime - aTime;
      });

      // Format time display to a friendly format
      const formattedVideos = allVideos.map(v => {
        let displayTime = 'حديثاً';
        if (v.time) {
          try {
            const date = new Date(v.time);
            if (!isNaN(date.getTime())) {
              displayTime = date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
            }
          } catch(e) {}
        }
        return {
          ...v,
          time: displayTime
        };
      });
      
      // Deduplicate videos by ID to prevent duplicate tracking keys in Angular rendering loops
      const uniqueVideos: FeedVideo[] = [];
      const seenIds = new Set<string>();
      for (const video of formattedVideos) {
        if (!seenIds.has(video.id)) {
          seenIds.add(video.id);
          uniqueVideos.push(video);
        }
      }
      
      this.subscriptionsFeed.set(uniqueVideos.slice(0, 80));
    } catch (err) {
      console.error('[WeTubeService] loadSubscriptionsFeed failed:', err);
    } finally {
      this.isSubsFeedLoading.set(false);
    }
  }

  async loadShorts(force = false): Promise<void> {
    this.isShortsLoading.set(true);
    try {
      // Try to load from cache first
      if (!force) {
        const cached = await this.idb.getWithTTL('shorts_feed', 'main', 60 * 60 * 1000);
        if (cached && cached.videos && cached.videos.length > 0) {
          this.shortsFeed.set(cached.videos);
          this.isShortsLoading.set(false);
          return;
        }
      }

      // Fetch new shorts from YouTube
      const apiShorts = await firstValueFrom(
        this.discoveryService.searchYouTube('shorts', 'EgQYAXAB')
      );

      // Filter shorts using robust checkIsShorts helper
      let shorts = apiShorts.filter(v => checkIsShorts(v));

      // If no shorts found, mark all as shorts
      if (shorts.length === 0) {
        shorts = apiShorts.map(v => ({ ...v, isShorts: true }));
      }

      // Also include shorts from trending/feed
      const feedShorts = this.feedVideos().filter(v => checkIsShorts(v));

      // Combine and deduplicate
      const combined = [...feedShorts, ...shorts];
      const seenIds = new Set<string>();
      const uniqueShorts: FeedVideo[] = [];
      
      for (const video of combined) {
        if (!seenIds.has(video.id)) {
          seenIds.add(video.id);
          uniqueShorts.push(video);
        }
      }

      this.shortsFeed.set(uniqueShorts);

      // Cache the result
      await this.idb.setWithTTL('shorts_feed', { id: 'main', videos: uniqueShorts });
    } catch (err) {
      console.error('[WeTubeService] loadShorts failed:', err);
    } finally {
      this.isShortsLoading.set(false);
    }
  }

  // ── Initialization ─────────────────────────────────────────

  private encryptAndSaveReported(reportedList: string[]) {
    this.encryption.encrypt(reportedList).then(encrypted => {
      localStorage.setItem('wetube_reported_videos_enc', encrypted);
      localStorage.removeItem('wetube_reported_videos'); // clean legacy
    }).catch(() => {});
  }

  async initialize(): Promise<void> {
    // Load algorithm configuration from local storage
    try {
      const savedAlgoEnc = localStorage.getItem('wetube_algo_config_enc');
      if (savedAlgoEnc) {
        const parsed = await this.encryption.decrypt(savedAlgoEnc);
        if (parsed && typeof parsed.subscriptionWeight === 'number') {
          this.algoConfig.set({
            ...this.algoConfig(),
            ...parsed
          });
        }
      } else {
        // Fallback and migrate
        const savedAlgo = localStorage.getItem('wetube_algo_config');
        if (savedAlgo) {
          const parsed = JSON.parse(savedAlgo);
          if (parsed && typeof parsed.subscriptionWeight === 'number') {
            this.algoConfig.set({
              ...this.algoConfig(),
              ...parsed
            });
            this.updateAlgoConfig(parsed);
          }
        }
      }
    } catch (e) {}

    // Load reported video IDs from local storage (to hide them persistently)
    try {
      const savedEnc = localStorage.getItem('wetube_reported_videos_enc');
      if (savedEnc) {
        const parsed = await this.encryption.decrypt(savedEnc);
        if (Array.isArray(parsed)) {
          this.reportedVideoIds.set(new Set(parsed));
        }
      } else {
        // Fallback and migrate
        const saved = localStorage.getItem('wetube_reported_videos');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            this.reportedVideoIds.set(new Set(parsed));
            this.encryptAndSaveReported(parsed);
          }
        }
      }
    } catch (e) {}

    this.loadTrending();
    this.loadShorts();
    this.loadMyYouTubeData();
    this.loadMySubscriptions();
  }

  async reportVideo(videoId: string, videoTitle: string, reason: string, comments: string): Promise<void> {
    // 1. Report to Firestore backend
    await this.firebaseService.reportVideo(videoId, videoTitle, reason, comments);
    
    // 2. Add to local reported set to hide instantly
    this.reportedVideoIds.update(current => {
      const next = new Set(current);
      next.add(videoId);
      this.encryptAndSaveReported(Array.from(next));
      return next;
    });
  }

  async addVideoToWhitelist(videoData: any): Promise<void> {
    try {
      await this.firebaseService.addVideoToWhitelist(videoData);
    } catch (e) {
      console.error('[WeTubeService] addVideoToWhitelist failed:', e);
      throw e;
    }
  }

  updateAlgoConfig(config: AlgorithmConfig): void {
    this.algoConfig.set(config);
    this.encryption.encrypt(config).then(encrypted => {
      localStorage.setItem('wetube_algo_config_enc', encrypted);
      localStorage.removeItem('wetube_algo_config'); // clean legacy
    }).catch(() => {});
  }
}
