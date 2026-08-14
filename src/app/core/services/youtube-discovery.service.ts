import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, from, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ProxyService } from './proxy.service';
import { FeedVideo } from '../../features/halaltube/halaltube.model';
import { PipedApiService } from './piped-api.service';

export interface VideoDetails extends FeedVideo {
  description: string;
  views: string;
  duration: string;
  likes?: number;
  date?: string;
  relatedVideos: FeedVideo[];
}

export interface YouTubeComment {
  id: string;
  author: string;
  authorThumb: string;
  text: string;
  likes: number;
  time: string;
  isPinned: boolean;
  repliesCount: number;
}

const YOUTUBE_SEARCH_URL = 'https://www.youtube.com/results?search_query=';
const YOUTUBE_TRENDING_URL = 'https://www.youtube.com/feed/trending';
const YOUTUBE_WATCH_URL = 'https://www.youtube.com/watch?v=';

@Injectable({
  providedIn: 'root'
})
export class YoutubeDiscoveryService {
  private proxy = inject(ProxyService);
  private pipedService = inject(PipedApiService);
  private baseUrl = environment.apiBaseUrl;

  searchYouTube(query: string, sp?: string): Observable<FeedVideo[]> {
    const url = YOUTUBE_SEARCH_URL + encodeURIComponent(query) + (sp ? `&sp=${sp}` : '');

    return this.proxy.fetchJSON<any>(url).pipe(
      map(data => {
        if (!data) {
          throw new Error('Proxy returned empty HTML data');
        }
        const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
        if (!contents) {
          throw new Error('YouTube desktop layout search contents missing');
        }

        const videos: FeedVideo[] = [];
        contents.forEach((section: any) => {
          const items = section.itemSectionRenderer?.contents;
          if (items) {
            items.forEach((item: any) => {
              if (item.videoRenderer) {
                const v = this.parseVideoRenderer(item.videoRenderer);
                if (v) videos.push(v);
              }
            });
          }
        });
        if (videos.length === 0) {
          throw new Error('No video items parsed from search');
        }
        return videos;
      })
    );
  }

  fetchTrending(): Observable<FeedVideo[]> {
    return this.proxy.fetchJSON<any>(YOUTUBE_TRENDING_URL).pipe(
      map(data => {
        if (!data) return [];
        const tabs = data.contents?.twoColumnBrowseResultsRenderer?.tabs;
        const trendingTab = tabs?.find((t: any) => t.tabRenderer?.selected)?.tabRenderer;
        const contents = trendingTab?.content?.sectionListRenderer?.contents;

        if (!contents) return [];

        const videos: FeedVideo[] = [];
        contents.forEach((section: any) => {
          const shelf = section.itemSectionRenderer?.contents[0]?.shelfRenderer;
          const items = shelf?.content?.expandedShelfContentsRenderer?.items;
          if (items) {
            items.forEach((item: any) => {
              if (item.videoRenderer) {
                const v = this.parseVideoRenderer(item.videoRenderer);
                if (v) videos.push(v);
              }
            });
          }
        });
        return videos;
      }),
      catchError(() => of([]))
    );
  }

  fetchVideoDetails(videoId: string): Observable<VideoDetails | null> {
    // Use direct fetch to YouTube oEmbed API (CORS-supported, no proxy needed)
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;

    return new Observable<VideoDetails | null>(observer => {
      fetch(oembedUrl)
        .then(res => {
          if (!res.ok) throw new Error(`oEmbed failed: ${res.status}`);
          return res.json();
        })
        .then(data => {
          if (!data || !data.title) {
            throw new Error('Empty oEmbed title');
          }
          observer.next({
            id: videoId,
            title: data.title || 'فيديو يوتيوب',
            url: `https://www.youtube.com/watch?v=${videoId}`,
            thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            author: data.author_name || 'قناة يوتيوب',
            authorId: '',
            published: '',
            source: 'youtube',
            isShorts: false,
            description: '',
            views: '0',
            duration: '0',
            relatedVideos: []
          } as VideoDetails);
          observer.complete();
        })
        .catch(err => {
          // Fallback: try noembed.com
          fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`)
            .then(res => res.json())
            .then(data => {
              if (data && data.title) {
                observer.next({
                  id: videoId,
                  title: data.title,
                  url: `https://www.youtube.com/watch?v=${videoId}`,
                  thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
                  author: data.author_name || 'قناة يوتيوب',
                  authorId: '',
                  published: '',
                  source: 'youtube',
                  isShorts: false,
                  description: '',
                  views: '0',
                  duration: '0',
                  relatedVideos: []
                } as VideoDetails);
              } else {
                observer.next(null);
              }
              observer.complete();
            })
            .catch(() => {
              observer.next(null);
              observer.complete();
            });
        });
    });
  }

  fetchVideoComments(videoId: string): Observable<YouTubeComment[]> {
    return from(this.pipedService.getComments(videoId)).pipe(
      map(res => {
        if (!res || !res.comments) return [];
        return res.comments.map((c: any) => ({
          id: c.commentId,
          author: c.author,
          authorThumb: c.thumbnail,
          text: c.commentText,
          likes: c.likeCount,
          time: c.commentedTime,
          isPinned: c.pinned || false,
          repliesCount: c.replyCount || 0
        }));
      }),
      catchError(err => {
        console.error('Failed to fetch comments:', err);
        return of([]);
      })
    );
  }

  private parseVideoRenderer(renderer: any): FeedVideo | null {
    try {
      const videoId = renderer.videoId;
      if (!videoId) return null;

      const title = renderer.title?.runs?.[0]?.text || '';
      const author = renderer.ownerText?.runs?.[0]?.text || renderer.shortBylineText?.runs?.[0]?.text || 'قناة يوتيوب';
      const authorId = renderer.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId || '';
      const published = renderer.publishedTimeText?.simpleText || renderer.videoInfo?.runs?.[0]?.text || '';
      const views = renderer.viewCountText?.simpleText || renderer.shortViewCountText?.simpleText || '';
      const channelAvatar = renderer.channelThumbnail?.thumbnails?.[0]?.url || 
                            renderer.ownerThumbnail?.thumbnails?.[0]?.url || 
                            renderer.videoOwnerRenderer?.thumbnail?.thumbnails?.[0]?.url;
      
      let duration = renderer.lengthText?.simpleText || 
                     renderer.lengthText?.runs?.[0]?.text || 
                     renderer.thumbnailOverlays?.[0]?.thumbnailOverlayTimeStatusRenderer?.text?.simpleText || '';
      
      if (!duration && renderer.approxDurationMs) {
        const totalSeconds = Math.floor(Number(renderer.approxDurationMs) / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        if (hours > 0) {
          duration = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
          duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
      }

      const isShorts = 
        title.toLowerCase().includes('#shorts') || 
        title.toLowerCase().includes('shorts') ||
        (duration && (duration.startsWith('0:') || duration === '1:00'));

      return {
        id: videoId,
        title,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        author,
        authorId,
        time: published || views,
        source: 'youtube',
        isShorts: !!isShorts,
        channelAvatar,
        duration: duration || undefined
      };
    } catch (e) {
      return null;
    }
  }
}
