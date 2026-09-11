import { Injectable, inject } from '@angular/core';
import { Observable, from, of, firstValueFrom } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { FeedVideo } from '../../features/halaltube/halaltube.model';
import { VideoDetails, YouTubeComment, YoutubeDiscoveryService } from './youtube-discovery.service';
import { PipedApiService, PipedVideoDetails } from './piped-api.service';
import { InvidiousProviderService } from './providers/invidious-provider.service';
import { YoutubeCacheService } from './youtube-cache.service';

export interface ChannelDetailsResult {
  id: string;
  name: string;
  avatarUrl: string;
  bannerUrl?: string;
  subscriberCount?: number;
  description?: string;
  relatedStreams: any[];
  nextpage?: string;
}

export interface PipedPlaylistDetails {
  id?: string;
  name?: string;
  uploader?: string;
  bannerUrl?: string;
  thumbnailUrl?: string;
  relatedStreams?: any[];
  videos?: any[];
  items?: any[];
}

import { InstanceHealthRegistry, type InstanceHealth } from './instance-health-registry.service';
export { InstanceHealthRegistry, type InstanceHealth };

@Injectable({
  providedIn: 'root'
})
export class YoutubeProviderService {
  private piped = inject(PipedApiService);
  private invidious = inject(InvidiousProviderService);
  private discovery = inject(YoutubeDiscoveryService);
  private cache = inject(YoutubeCacheService);
  readonly healthRegistry = inject(InstanceHealthRegistry);

  /**
   * Universal Video Search with 3-Tier Multi-Provider Fallback:
   * Tier 1: Piped (privacy & speed)
   * Tier 2: Invidious (instance pool fallback)
   * Tier 3: YouTube Discovery (Proxy/Scraping safety net)
   */
  search(query: string, sp?: string): Observable<FeedVideo[]> {
    return from(this.executeSearch(query, sp)).pipe(
      catchError(err => {
        console.warn('[YoutubeProviderService] All search tiers failed:', err);
        return of([]);
      })
    );
  }

  private async executeSearch(query: string, sp?: string): Promise<FeedVideo[]> {
    // 1. Try Piped
    try {
      const pipedResults = await this.piped.search(query);
      if (Array.isArray(pipedResults) && pipedResults.length > 0) {
        return pipedResults;
      }
    } catch (pipedErr) {
      console.warn('[YoutubeProviderService] Piped search failed, falling to Invidious:', pipedErr);
    }

    // 2. Try Invidious
    try {
      const invidiousResults = await firstValueFrom(this.invidious.search(query, sp));
      if (Array.isArray(invidiousResults) && invidiousResults.length > 0) {
        return invidiousResults;
      }
    } catch (invErr) {
      console.warn('[YoutubeProviderService] Invidious search failed, falling to Discovery:', invErr);
    }

    // 3. Try YouTube Discovery (Scraper via Proxy)
    try {
      const discoveryResults = await firstValueFrom(this.discovery.searchYouTube(query, sp));
      if (Array.isArray(discoveryResults) && discoveryResults.length > 0) {
        return discoveryResults;
      }
    } catch (discErr) {
      console.warn('[YoutubeProviderService] Discovery search failed:', discErr);
    }

    return [];
  }

  /**
   * Video Details with Metadata & Fallbacks
   */
  getVideoDetails(videoId: string): Observable<VideoDetails | null> {
    return this.discovery.fetchVideoDetails(videoId).pipe(
      catchError(() => {
        return this.invidious.getVideoDetails(videoId).pipe(
          map(v => v as VideoDetails),
          catchError(() => of(null))
        );
      })
    );
  }

  /**
   * Direct media stream extraction (Video/Audio streams for player components)
   */
  async getVideoStreamDetails(videoId: string): Promise<PipedVideoDetails> {
    return this.piped.getVideoDetails(videoId);
  }

  /**
   * Strongly typed channel metadata and video listings
   */
  async getChannelDetails(channelId: string, nextpage?: string): Promise<ChannelDetailsResult> {
    return this.piped.getChannelDetails(channelId, nextpage);
  }

  /**
   * Channel search
   */
  async searchChannels(query: string): Promise<{ channelId: string; name: string; avatarUrl: string }[]> {
    return this.piped.searchChannels(query);
  }

  /**
   * Playlist retrieval
   */
  async getPlaylist(playlistId: string): Promise<PipedPlaylistDetails> {
    return this.piped.getPlaylist(playlistId);
  }

  /**
   * Comments stream
   */
  getVideoComments(videoId: string): Observable<YouTubeComment[]> {
    return this.discovery.fetchVideoComments(videoId);
  }

  /**
   * Trending videos feed
   */
  getTrending(topic?: string): Observable<FeedVideo[]> {
    if (topic) {
      return this.search(topic);
    }
    return this.discovery.fetchTrending().pipe(
      catchError(() => from(this.piped.getTrending()).pipe(
        catchError(() => of([]))
      ))
    );
  }

  /**
   * Channel RSS videos
   */
  async fetchChannelRssVideos(channelId: string): Promise<FeedVideo[]> {
    return this.invidious.fetchChannelRssVideos(channelId);
  }
}
