import { Injectable, signal, computed, inject } from '@angular/core';
import { firstValueFrom, from, catchError } from 'rxjs';
import { QueryDocumentSnapshot } from 'firebase/firestore';
import { Video, YouTubeSubscription, FeedVideo, HistoryItem, halaltubeTab, ContentItem, checkIsShorts } from './halaltube.model';
import { FALLBACK_VIDEOS } from './data/fallback-videos';
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
export class halaltubeService {
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
  readonly activeTab = signal<halaltubeTab>('home');
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
        // Whitelist + local videos if not logged in
        combined = [...localVideos, ...dbVids];
      } else {
        combined = [...localVideos];
        // Deterministic recommendation interleaving based on subscriptionWeight
        let subIdx = 0;
        let dbIdx = 0;
        const totalTarget = 300;
        
        while (combined.length < totalTarget && (subIdx < subVids.length || dbIdx < dbVids.length)) {
          if (subIdx < subVids.length && (dbIdx >= dbVids.length || (subIdx / (subIdx + dbIdx + 1)) < subWeight)) {
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

    // Stable Recommendation Sorting: prioritizing user's favorite categories, then sorting by _shuffleOrder
    const catWeights = config.categoryWeights || {};
    const sorted = combined.sort((a, b) => {
      const weightA = catWeights[a.category || ''] || 5;
      const weightB = catWeights[b.category || ''] || 5;
      
      if (weightA !== weightB) {
        return weightB - weightA; // Higher weight comes first
      }

      // Preserve stable bottom-appended order
      const orderA = (a as any)._shuffleOrder !== undefined ? (a as any)._shuffleOrder : 0;
      const orderB = (b as any)._shuffleOrder !== undefined ? (b as any)._shuffleOrder : 0;
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

  // Action helpers
  formatPublishedDate(publishedAt?: number): string {
    if (!publishedAt) return 'حديثاً';
    const diff = Date.now() - publishedAt;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'اليوم';
    if (days === 1) return 'منذ يوم';
    if (days < 30) return `منذ ${days} يوم`;
    const months = Math.floor(days / 30);
    if (months === 1) return 'منذ شهر';
    return `منذ ${months} شهر`;
  }

  setActiveTab(tab: halaltubeTab) {
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

  private isInitialized = false;
  private currentTopicIndex = 0;
  private readonly CORE_TOPICS = [
    'تكنولوجيا وبرمجة',
    'قرآن كريم وتلاوات خاشعة',
    'علوم وفضاء ووثائقيات',
    'ذكاء اصطناعي وتطوير الويب',
    'بودكاست وتطوير الذات',
    'تاريخ وقصص وحضارات'
  ];

  async loadTrending(force = false): Promise<void> {
    if (!force && this.isInitialized && this.feedVideos().length >= 30) {
      return;
    }

    // 1. Check IndexedDB cached feed first for instant loading
    if (!force) {
      try {
        const cached = await this.idb.getWithTTL('whitelist_feed', 'main', 60 * 60 * 1000); // 1 hour TTL
        if (cached && Array.isArray(cached.videos) && cached.videos.length >= 20) {
          this.trendingVideos.set(cached.videos);
          this.feedVideos.set(cached.videos);
          this.isUsingCachedData.set(true);
          this.isInitialized = true;
          return;
        }
      } catch (e) {}
    }

    this.isFeedLoading.set(true);
    this.isUsingCachedData.set(false);
    
    try {
      if (this.subscriptions().length === 0) {
        await this.loadMySubscriptions();
      }

      // Load previous saved/discovered videos from IndexedDB to accumulate repository
      let accumulatedIndexedDbVideos: FeedVideo[] = [];
      try {
        const stored = await this.idb.getAll('saved_videos') || [];
        accumulatedIndexedDbVideos = stored.map((v: any) => ({
          id: v.videoId || v.id,
          title: v.title,
          url: `https://www.youtube.com/watch?v=${v.videoId || v.id}`,
          thumbnail: v.thumbnail || `https://img.youtube.com/vi/${v.videoId || v.id}/hqdefault.jpg`,
          author: v.author,
          authorId: v.authorId || '',
          time: 'محفوظ في الذاكرة',
          source: 'youtube' as const,
          category: v.category || 'تكنولوجيا وبرمجة',
          isWhitelisted: true
        }));
      } catch (e) {}

      // Parallel multi-topic harvesting across 6 core topics
      const topicPromises = this.CORE_TOPICS.map(topic => 
        firstValueFrom(this.discoveryService.searchYouTube(topic))
          .catch(() => this.pipedApiService.search(topic))
          .catch(() => [] as FeedVideo[])
      );

      const [subVideosRes, firestoreResult, ...topicResults] = await Promise.all([
        this.loadSubscriptionsFeed(force).catch(() => {}),
        this.firebaseService.getPublishedVideos(undefined, 50).catch(() => ({ videos: [], lastVisible: null })),
        ...topicPromises
      ]);

      const subVideos = this.subscriptionsFeed() || [];
      const harvestedVideos = topicResults.flat().filter(Boolean);
      
      const mappedFirestore: FeedVideo[] = (firestoreResult?.videos || []).map((v: any) => {
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
          isWhitelisted: true,
          _shuffleOrder: Math.random()
        } as any;
      });

      // Combine all sources: subscriptions, firestore whitelist, multi-topic search, indexeddb library, and fallback videos
      let combined = [
        ...subVideos,
        ...mappedFirestore,
        ...harvestedVideos,
        ...accumulatedIndexedDbVideos,
        ...FALLBACK_VIDEOS
      ];

      // Deduplicate by ID
      const seenIds = new Set<string>();
      const uniqueCombined: FeedVideo[] = [];
      for (const v of combined) {
        if (v && v.id && !seenIds.has(v.id)) {
          seenIds.add(v.id);
          uniqueCombined.push(v);
        }
      }

      // Shuffle once on initial load and assign stable shuffle order
      for (let i = uniqueCombined.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [uniqueCombined[i], uniqueCombined[j]] = [uniqueCombined[j], uniqueCombined[i]];
      }

      const indexedCombined = uniqueCombined.map((v, idx) => ({ ...v, _shuffleOrder: idx }));

      this.trendingVideos.set(indexedCombined);
      this.feedVideos.set(indexedCombined);
      this.lastVisibleFeedDoc.set(firestoreResult?.lastVisible || null);
      this.hasMoreFeed.set(true);
      this.isInitialized = true;

      // Persist to IndexedDB whitelist_feed & auto-cache items
      if (indexedCombined.length > 0) {
        await this.idb.setWithTTL('whitelist_feed', { id: 'main', videos: indexedCombined });
        for (const v of indexedCombined.slice(0, 50)) {
          this.idb.autoCacheVideo(v).catch(() => {});
        }
      }
      
    } catch (err) {
      console.error('[halaltubeService] loadTrending failed', err);
      this.trendingVideos.set(FALLBACK_VIDEOS);
      this.feedVideos.set(FALLBACK_VIDEOS);
    } finally {
      this.isFeedLoading.set(false);
    }
  }

  async loadMoreTrending(): Promise<void> {
    if (this.isFeedLoading()) return;

    this.isFeedLoading.set(true);
    
    try {
      const moreTopics = [
        'شروحات برمجية ومشاريع عملية',
        'تلاوات هادئة مريحة للنفس',
        'عجائب الكون والفضاء الخارجي',
        'بناء العادات اليومية والإنتاجية',
        'وثائقيات علمية وطبيعية',
        'تاريخ وقصص الأنبياء والحضارات',
        'تطبيقات وأدوات الذكاء الاصطناعي',
        'حوارات وبودكاست ملهم'
      ];
      
      const targetTopic = moreTopics[this.currentTopicIndex % moreTopics.length];
      this.currentTopicIndex++;

      const [result, liveVideos] = await Promise.all([
        this.firebaseService.getPublishedVideos(this.lastVisibleFeedDoc() || undefined, 20).catch(() => ({ videos: [], lastVisible: null })),
        firstValueFrom(this.discoveryService.searchYouTube(targetTopic))
          .catch(() => this.pipedApiService.search(targetTopic))
          .catch(() => [] as FeedVideo[])
      ]);
      
      const mappedVideos: FeedVideo[] = (result?.videos || []).map(v => {
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
          isWhitelisted: true,
          channelAvatar: v.channelAvatar,
          duration: v.duration,
          views: v.views ? `${v.views} مشاهدة` : undefined
        };
      });
      
      const currentVideos = this.feedVideos();
      const currentCount = currentVideos.length;
      const newItems = [...mappedVideos, ...(liveVideos || [])];

      // Assign sequential _shuffleOrder to preserve bottom-appended order without shifting previous items
      const indexedNew = newItems.map((v, idx) => ({
        ...v,
        _shuffleOrder: currentCount + idx
      }));

      // Deduplicate against existing
      const existingIds = new Set(currentVideos.map(v => v.id));
      const freshToAdd = indexedNew.filter(v => v && v.id && !existingIds.has(v.id));

      if (freshToAdd.length > 0) {
        this.trendingVideos.update(vids => [...vids, ...freshToAdd]);
        this.feedVideos.update(vids => [...vids, ...freshToAdd]);

        // Auto cache to IndexedDB
        for (const item of freshToAdd) {
          this.idb.autoCacheVideo(item).catch(() => {});
        }
      }
      
      this.lastVisibleFeedDoc.set(result?.lastVisible || null);
      this.hasMoreFeed.set(true); // Always allow more infinite scrolling
      
    } catch (err) {
      console.error('[halaltubeService] loadMoreTrending failed', err);
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
        console.warn('[halaltubeService] Discovery search failed, trying Piped...', err);
        return from(this.pipedApiService.search(query));
      }),
      catchError(err => {
        console.warn('[halaltubeService] Piped search failed, trying Invidious...', err);
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

        // If still 0 results (all network providers down), fallback to matching local & curated fallback videos
        if (!finalVideos || finalVideos.length === 0) {
          const cleanQ = query.trim().toLowerCase();
          const allLocal = [...FALLBACK_VIDEOS, ...this.feedVideos()];
          const matched = allLocal.filter(v => 
            v.title?.toLowerCase().includes(cleanQ) || 
            v.author?.toLowerCase().includes(cleanQ) ||
            v.category?.toLowerCase().includes(cleanQ)
          );
          finalVideos = matched.length > 0 ? matched : FALLBACK_VIDEOS.slice(0, 4);
        }

        // Check which videos are already whitelisted
        const videoIds = finalVideos.map((v: any) => v.id);
        const whitelistedIds = await this.firebaseService.checkVideosExist(videoIds).catch(() => []);
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
        console.error('[halaltubeService] All search providers failed:', err);
        const cleanQ = query.trim().toLowerCase();
        const allLocal = [...FALLBACK_VIDEOS, ...this.feedVideos()];
        const matched = allLocal.filter(v => 
          v.title?.toLowerCase().includes(cleanQ) || 
          v.author?.toLowerCase().includes(cleanQ) ||
          v.category?.toLowerCase().includes(cleanQ)
        );
        this.searchResults.set(matched.length > 0 ? matched : FALLBACK_VIDEOS);
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
      error: (err) => console.error('[halaltubeService] loadVideoDetails failed:', err)
    });
  }

  async loadVideoComments(videoId: string): Promise<void> {
    this.discoveryService.fetchVideoComments(videoId).subscribe({
      next: (comments) => this.currentVideoComments.set(comments),
      error: (err) => console.error('[halaltubeService] loadVideoComments failed:', err)
    });
  }

  async loadMyYouTubeData(): Promise<void> {
    const uid = this.firebaseService.getUserId();
    if (!uid) return;

    this.dataService.getMyStats(uid).subscribe({
      next: (stats) => this.myChannelStats.set(stats),
      error: (err) => console.error('[halaltubeService] loadMyYouTubeData stats failed:', err)
    });

    this.dataService.getMyVideos(uid).subscribe({
      next: (videos) => this.myVideos.set(videos),
      error: (err) => console.error('[halaltubeService] loadMyYouTubeData videos failed:', err)
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
        console.error('[halaltubeService] loadMySubscriptions failed:', err);
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
      console.error(`[halaltubeService] Failed to fetch channel details for ${channelId}`, err);
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
      console.error('[halaltubeService] loadSubscriptionsFeed failed:', err);
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
        if (cached && Array.isArray(cached.videos) && cached.videos.length > 0) {
          this.shortsFeed.set(cached.videos);
          this.isShortsLoading.set(false);
          return;
        }
      }

      // Fetch new shorts from YouTube with cascading fallbacks
      let apiShorts: FeedVideo[] = [];
      try {
        apiShorts = await firstValueFrom(
          this.discoveryService.searchYouTube('shorts', 'EgQYAXAB')
        );
      } catch (e) {
        try {
          apiShorts = await this.pipedApiService.search('shorts');
        } catch (e2) {}
      }

      // Filter shorts using robust checkIsShorts helper
      let shorts = (apiShorts || []).filter(v => checkIsShorts(v));

      // If no shorts found, mark available as shorts
      if (shorts.length === 0 && apiShorts && apiShorts.length > 0) {
        shorts = apiShorts.map(v => ({ ...v, isShorts: true }));
      }

      // Also include shorts from trending/feed
      const feedShorts = this.feedVideos().filter(v => checkIsShorts(v));

      // Combine and deduplicate
      const combined = [...feedShorts, ...shorts];
      const seenIds = new Set<string>();
      const uniqueShorts: FeedVideo[] = [];
      
      for (const video of combined) {
        if (video && video.id && !seenIds.has(video.id)) {
          seenIds.add(video.id);
          uniqueShorts.push(video);
        }
      }

      if (uniqueShorts.length > 0) {
        this.shortsFeed.set(uniqueShorts);
        // Cache the result
        await this.idb.setWithTTL('shorts_feed', { id: 'main', videos: uniqueShorts });
      }
    } catch (err) {
      console.error('[halaltubeService] loadShorts failed:', err);
    } finally {
      this.isShortsLoading.set(false);
    }
  }

  // ── Initialization ─────────────────────────────────────────

  private encryptAndSaveReported(reportedList: string[]) {
    this.encryption.encrypt(reportedList).then(encrypted => {
      localStorage.setItem('halaltube_reported_videos_enc', encrypted);
      localStorage.removeItem('halaltube_reported_videos'); // clean legacy
    }).catch(() => {});
  }

  async initialize(): Promise<void> {
    // Load algorithm configuration from local storage
    try {
      const savedAlgoEnc = localStorage.getItem('halaltube_algo_config_enc');
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
        const savedAlgo = localStorage.getItem('halaltube_algo_config');
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
      const savedEnc = localStorage.getItem('halaltube_reported_videos_enc');
      if (savedEnc) {
        const parsed = await this.encryption.decrypt(savedEnc);
        if (Array.isArray(parsed)) {
          this.reportedVideoIds.set(new Set(parsed));
        }
      } else {
        // Fallback and migrate
        const saved = localStorage.getItem('halaltube_reported_videos');
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
      console.error('[halaltubeService] addVideoToWhitelist failed:', e);
      throw e;
    }
  }

  updateAlgoConfig(config: AlgorithmConfig): void {
    this.algoConfig.set(config);
    this.encryption.encrypt(config).then(encrypted => {
      localStorage.setItem('halaltube_algo_config_enc', encrypted);
      localStorage.removeItem('halaltube_algo_config'); // clean legacy
    }).catch(() => {});
  }
}
