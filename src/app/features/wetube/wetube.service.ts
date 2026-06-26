import { Injectable, signal, computed, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { QueryDocumentSnapshot } from 'firebase/firestore';
import { Video, YouTubeSubscription, FeedVideo, HistoryItem, WeTubeTab, ContentItem } from './wetube.model';
import { FirebaseService } from '../../core/services/firebase.service';
import { YoutubeDiscoveryService, VideoDetails, YouTubeComment } from '../../core/services/youtube-discovery.service';
import { YoutubeDataService, YouTubeChannelStats, YouTubeVideo } from '../../core/services/youtube-data.service';
import { YoutubeCacheService } from '../../core/services/youtube-cache.service';
import { IndexedDBService } from '../../core/services/indexed-db.service';
import { PipedApiService } from '../../core/services/piped-api.service';

@Injectable({
  providedIn: 'root'
})
export class WeTubeService {
  private firebaseService = inject(FirebaseService);
  private discoveryService = inject(YoutubeDiscoveryService);
  private dataService = inject(YoutubeDataService);
  private cacheService = inject(YoutubeCacheService);
  private idb = inject(IndexedDBService);

  // Core State
  readonly videos = signal<Video[]>([]);
  readonly subscriptions = signal<YouTubeSubscription[]>([]);
  readonly feedVideos = signal<FeedVideo[]>([]);
  readonly trendingVideos = signal<FeedVideo[]>([]);
  readonly searchResults = signal<FeedVideo[]>([]);
  readonly shortsFeed = signal<FeedVideo[]>([]);

  // UI State
  readonly activeTab = signal<WeTubeTab>('home');
  readonly activeCategory = signal<string>('الكل');
  readonly searchQuery = signal<string>('');
  readonly searchSp = signal<string>('');
  readonly isSearching = signal<boolean>(false);
  readonly isFeedLoading = signal<boolean>(false);
  readonly isShortsLoading = signal<boolean>(false);
  readonly isUsingCachedData = signal<boolean>(false);
  readonly showUploadModal = signal<boolean>(false);
  
  // Pagination State for Whitelist
  readonly lastVisibleFeedDoc = signal<QueryDocumentSnapshot | null>(null);
  readonly hasMoreFeed = signal<boolean>(true);

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

    const feedVids = this.feedVideos().map(v => ({
      ...v,
      source: 'youtube' as const,
      time: 'حديثاً',
      channelAvatar: v.channelAvatar || subs.find(s => s.channelId === v.authorId)?.avatarUrl
    }));

    const trendingVids = this.trendingVideos().map(v => ({
      ...v,
      source: 'youtube' as const,
      time: 'رائج',
      channelAvatar: v.channelAvatar || subs.find(s => s.channelId === v.authorId)?.avatarUrl
    }));

    let combined: ContentItem[] = [];
    const tab = this.activeTab();

    if (tab === 'home') combined = [...feedVids, ...trendingVids];
    else if (tab === 'explore') combined = trendingVids;
    else combined = [...feedVids, ...trendingVids];

    const category = this.activeCategory();
    if (category === 'تريند') combined = trendingVids;
    else if (category !== 'الكل') {
      combined = combined.filter(v =>
        v.title.toLowerCase().includes(category.toLowerCase()) ||
        v.category === category
      );
    }

    return combined.sort((a, b) => {
      const aTime = (a as any).fetchedAt || new Date(a.time || 0).getTime();
      const bTime = (b as any).fetchedAt || new Date(b.time || 0).getTime();
      return bTime - aTime;
    });
  });

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

  async loadTrending(force = false): Promise<void> {
    if (!force) {
      const cached = await this.idb.getWithTTL('whitelist_feed', 'main', 60 * 60 * 1000); // 60 mins TTL
      if (cached && cached.videos && cached.videos.length > 0) {
        this.trendingVideos.set(cached.videos);
        this.feedVideos.set(cached.videos);
        this.isUsingCachedData.set(true);
        // We do not restore lastVisibleFeedDoc from cache because Firestore cursor cannot be serialized easily.
        // The user will just start fetching from the beginning if they scroll past the cache,
        // or we can fetch a fresh page 1 in the background. For now, we will leave the cursor null
        // so the next fetch will get the latest videos.
        return;
      }
    }

    this.isFeedLoading.set(true);
    this.isUsingCachedData.set(false);
    
    try {
      const result = await this.firebaseService.getPublishedVideos(undefined, 20);
      
      const mappedVideos: FeedVideo[] = result.videos.map(v => ({
        id: v.id,
        title: v.title,
        url: v.externalUrl || `https://www.youtube.com/watch?v=${v.id}`,
        thumbnail: v.thumbnail || `https://img.youtube.com/vi/${v.id}/hqdefault.jpg`,
        author: v.author,
        authorId: v.authorId,
        time: v.time || new Date(v.createdAt).toLocaleDateString(),
        source: v.source || 'youtube',
        isShorts: v.isShorts || false,
        channelAvatar: v.channelAvatar,
        duration: v.duration,
        views: v.views ? `${v.views} مشاهدة` : undefined
      }));
      
      this.trendingVideos.set(mappedVideos);
      this.feedVideos.set(mappedVideos);
      this.lastVisibleFeedDoc.set(result.lastVisible);
      this.hasMoreFeed.set(mappedVideos.length === 20);

      // Cache the first page
      await this.idb.setWithTTL('whitelist_feed', { id: 'main', videos: mappedVideos });
      
    } catch (err) {
      console.error('[WeTubeService] loadTrending failed from Firestore', err);
      // Empty state will be handled by the UI since trendingVideos is empty
      const cached = await this.idb.getWithTTL('whitelist_feed', 'main', 60 * 60 * 1000);
      if (cached && cached.videos) {
        this.trendingVideos.set(cached.videos);
        this.feedVideos.set(cached.videos);
        this.isUsingCachedData.set(true);
      } else {
        this.trendingVideos.set([]);
        this.feedVideos.set([]);
      }
    } finally {
      this.isFeedLoading.set(false);
    }
  }

  async loadMoreTrending(): Promise<void> {
    if (!this.hasMoreFeed() || this.isFeedLoading()) return;

    this.isFeedLoading.set(true);
    
    try {
      const result = await this.firebaseService.getPublishedVideos(this.lastVisibleFeedDoc() || undefined, 20);
      
      const mappedVideos: FeedVideo[] = result.videos.map(v => ({
        id: v.id,
        title: v.title,
        url: v.externalUrl || `https://www.youtube.com/watch?v=${v.id}`,
        thumbnail: v.thumbnail || `https://img.youtube.com/vi/${v.id}/hqdefault.jpg`,
        author: v.author,
        authorId: v.authorId,
        time: v.time || new Date(v.createdAt).toLocaleDateString(),
        source: v.source || 'youtube',
        isShorts: v.isShorts || false,
        channelAvatar: v.channelAvatar,
        duration: v.duration,
        views: v.views ? `${v.views} مشاهدة` : undefined
      }));
      
      this.trendingVideos.update(vids => [...vids, ...mappedVideos]);
      this.feedVideos.update(vids => [...vids, ...mappedVideos]);
      this.lastVisibleFeedDoc.set(result.lastVisible);
      this.hasMoreFeed.set(mappedVideos.length === 20);
      
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

    this.discoveryService.searchYouTube(query, sp).subscribe({
      next: (videos) => {
        this.searchResults.set(videos);
        this.isSearching.set(false);
      },
      error: (err) => {
        console.error('[WeTubeService] search failed:', err);
        this.searchResults.set([]);
        this.isSearching.set(false);
      }
    });
  }

  async loadVideoDetails(videoId: string): Promise<void> {
    this.discoveryService.fetchVideoDetails(videoId).subscribe({
      next: (details) => {
        this.currentVideoDetails.set(details);
        if (details) {
          this.firebaseService.addToHistory({
            videoId: details.id,
            title: details.title,
            thumbnail: details.thumbnail || `https://img.youtube.com/vi/${details.id}/hqdefault.jpg`,
            author: details.author,
            watchedAt: Date.now()
          });
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
      if (localSubs.length > 0) {
        this.subscriptions.set(localSubs);
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
    const current = this.subscriptions();
    const currentIds = new Set(current.map(s => s.channelId));
    const merged = [...current];
    
    for (const sub of newSubs) {
      if (!currentIds.has(sub.channelId)) {
        merged.push(sub);
      }
    }
    this.subscriptions.set(merged);
  }

  async toggleSubscription(channelId: string, channelTitle: string, avatarUrl: string): Promise<boolean> {
    const current = this.subscriptions();
    const isSubscribed = current.some(s => s.channelId === channelId);
    
    try {
      if (isSubscribed) {
        await this.idb.delete('subscriptions', channelId);
        this.subscriptions.update(subs => subs.filter(s => s.channelId !== channelId));
        return false;
      } else {
        const newSub = { id: channelId, channelId, channelTitle, avatarUrl, subscribedAt: Date.now() };
        await this.idb.put('subscriptions', newSub);
        this.subscriptions.update(subs => [...subs, newSub]);
        return true;
      }
    } catch (e) {
      console.error('Failed to toggle subscription in IndexedDB', e);
      return isSubscribed;
    }
  }

  startYouTubeAuth(): void {
    this.firebaseService.signInWithGoogle().then(success => {
      if (success) {
        this.loadMySubscriptions(true);
      }
    });
  }

  // ── Initialization ─────────────────────────────────────────

  initialize(): void {
    this.loadTrending();
    this.loadMyYouTubeData();
    this.loadMySubscriptions();
  }
}
