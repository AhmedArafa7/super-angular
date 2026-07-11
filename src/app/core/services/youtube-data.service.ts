import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, map, expand, EMPTY } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface YouTubeChannelMetadata {
  id: string;
  title: string;
  description: string;
  avatarUrl: string;
  customUrl?: string;
  subscriberCount?: string;
  videoCount?: string;
}

export interface YouTubeSubscriptionItem {
  channelId: string;
  title: string;
  thumbnail: string;
}

export interface YouTubeChannelStats {
  viewCount: string;
  subscriberCount: string;
  videoCount: string;
  hiddenSubscriberCount: boolean;
}

export interface YouTubeVideo {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class YoutubeDataService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiBaseUrl;

  getLoginUrl(userId: string): string {
    return `${this.baseUrl}/api/auth/youtube/login?userId=${encodeURIComponent(userId)}`;
  }

  fetchMyChannelInfo(accessToken: string): Observable<YouTubeChannelMetadata | null> {
    return this.http.get<YouTubeChannelMetadata>(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails,statistics&mine=true',
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    ).pipe(
      map((res: any) => {
        if (!res.items || res.items.length === 0) return null;
        const channel = res.items[0];
        return {
          id: channel.id,
          title: channel.snippet.title,
          description: channel.snippet.description,
          avatarUrl: channel.snippet.thumbnails.high?.url || channel.snippet.thumbnails.default?.url,
          customUrl: channel.snippet.customUrl,
          subscriberCount: channel.statistics.subscriberCount,
          videoCount: channel.statistics.videoCount
        };
      }),
      catchError(err => {
        console.error('[YoutubeDataService] fetchMyChannelInfo failed:', err);
        return of(null);
      })
    );
  }

  fetchMySubscriptions(accessToken: string): Observable<YouTubeSubscriptionItem[]> {
    return this.fetchSubscriptionsPage(accessToken, undefined).pipe(
      expand((res: any) => res && res.nextPageToken
        ? this.fetchSubscriptionsPage(accessToken, res.nextPageToken)
        : EMPTY
      ),
      map((res: any) => {
        if (!res?.items) return [];
        return res.items.map((item: any) => ({
          channelId: item.snippet?.resourceId?.channelId || '',
          title: item.snippet?.title || '',
          thumbnail: item.snippet?.thumbnails?.default?.url || item.snippet?.thumbnails?.medium?.url || ''
        }));
      }),
      catchError(err => {
        console.error('[YoutubeDataService] fetchMySubscriptions failed:', err);
        return of<YouTubeSubscriptionItem[]>([]);
      })
    );
  }

  private fetchSubscriptionsPage(accessToken: string, pageToken?: string): Observable<any> {
    let url = `https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&mine=true&maxResults=50`;
    if (pageToken) url += `&pageToken=${pageToken}`;
    return this.http.get<any>(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  }

  getMyStats(userId: string): Observable<YouTubeChannelStats | null> {
    return this.http.get<{ success: boolean; data: YouTubeChannelStats }>(
      `${this.baseUrl}/api/auth/youtube/stats?userId=${encodeURIComponent(userId)}`
    ).pipe(
      map(res => res.success ? res.data : null),
      catchError(err => {
        console.error('[YoutubeDataService] getMyStats failed:', err);
        return of(null);
      })
    );
  }

  getMyVideos(userId: string): Observable<YouTubeVideo[]> {
    return this.http.get<{ success: boolean; videos: YouTubeVideo[] }>(
      `${this.baseUrl}/api/auth/youtube/videos?userId=${encodeURIComponent(userId)}`
    ).pipe(
      map(res => res.success ? res.videos : []),
      catchError(err => {
        console.error('[YoutubeDataService] getMyVideos failed:', err);
        return of([]);
      })
    );
  }
}
