import { Injectable, signal, computed, inject } from '@angular/core';
import { Video, YouTubeSubscription, FeedVideo, HistoryItem, WeTubeTab, ContentItem } from './wetube.model';
import { FirebaseService } from '../../core/services/firebase.service';
import { YoutubeDiscoveryService, VideoDetails, YouTubeComment } from '../../core/services/youtube-discovery.service';
import { YoutubeDataService, YouTubeChannelStats, YouTubeVideo } from '../../core/services/youtube-data.service';
import { YoutubeCacheService } from '../../core/services/youtube-cache.service';

@Injectable({
  providedIn: 'root'
})
export class WeTubeService {
  private firebaseService = inject(FirebaseService);
  private discoveryService = inject(YoutubeDiscoveryService);
  private dataService = inject(YoutubeDataService);
  private cacheService = inject(YoutubeCacheService);

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
  readonly isSearching = signal<boolean>(false);
  readonly isFeedLoading = signal<boolean>(false);
  readonly isShortsLoading = signal<boolean>(false);
  readonly isUsingCachedData = signal<boolean>(false);

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
  }

  forceRefresh(): void {
    this.cacheService.clearFeed();
    this.cacheService.clearSubscriptions();
    this.loadTrending(true);
    this.loadMySubscriptions(true);
  }

  // ── Real data fetching ─────────────────────────────────────

  async loadTrending(force = false): Promise<void> {
    if (!force) {
      const cached = this.cacheService.getFeed();
      if (cached && cached.length > 0) {
        this.trendingVideos.set(cached);
        this.feedVideos.set(cached);
        this.isUsingCachedData.set(true);
        return;
      }
    }

    this.isFeedLoading.set(true);
    this.isUsingCachedData.set(false);
    this.discoveryService.fetchTrending().subscribe({
      next: (videos) => {
        this.trendingVideos.set(videos);
        this.feedVideos.set(videos);
        this.cacheService.setFeed(videos);
        this.isFeedLoading.set(false);
      },
      error: (err) => {
        console.error('[WeTubeService] loadTrending failed:', err);
        const fallback = this.cacheService.getFeed();
        if (fallback) {
          this.trendingVideos.set(fallback);
          this.feedVideos.set(fallback);
          this.isUsingCachedData.set(true);
        }
        this.isFeedLoading.set(false);
      }
    });
  }

  async search(query: string): Promise<void> {
    this.isSearching.set(true);
    this.setSearchQuery(query);
    if (!query.trim()) {
      this.searchResults.set([]);
      this.isSearching.set(false);
      return;
    }

    this.discoveryService.searchYouTube(query).subscribe({
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
    if (!force) {
      const cachedSubs = this.cacheService.getSubscriptions();
      if (cachedSubs && cachedSubs.length > 0) {
        this.subscriptions.set(cachedSubs);
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
        this.subscriptions.set(mappedSubs);
        this.cacheService.setSubscriptions(mappedSubs);
      },
      error: (err) => {
        console.error('[WeTubeService] loadMySubscriptions failed:', err);
        const fallback = this.cacheService.getSubscriptions();
        if (fallback) {
          this.subscriptions.set(fallback);
        }
      }
    });
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
