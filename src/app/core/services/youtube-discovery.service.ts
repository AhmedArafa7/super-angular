import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProxyService } from './proxy.service';
import { FeedVideo } from '../../features/wetube/wetube.model';

export interface VideoDetails extends FeedVideo {
  description: string;
  views: string;
  duration: string;
  likes?: number;
  date?: string;
  relatedVideos: FeedVideo[];
}

export interface YouTubeComment {
  author: string;
  text: string;
  authorThumb: string;
  time: string;
}

const YOUTUBE_SEARCH_URL = 'https://www.youtube.com/results?search_query=';
const YOUTUBE_TRENDING_URL = 'https://www.youtube.com/feed/trending';
const YOUTUBE_WATCH_URL = 'https://www.youtube.com/watch?v=';

@Injectable({
  providedIn: 'root'
})
export class YoutubeDiscoveryService {
  private proxy = inject(ProxyService);
  private baseUrl = environment.apiBaseUrl;

  searchYouTube(query: string, sp?: string): Observable<FeedVideo[]> {
    const url = YOUTUBE_SEARCH_URL + encodeURIComponent(query) + (sp ? `&sp=${sp}` : '');

    return this.proxy.fetchJSON<any>(url).pipe(
      map(data => {
        if (!data) return [];
        const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
        if (!contents) return [];

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
        return videos;
      }),
      catchError(() => of([]))
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
    const url = YOUTUBE_WATCH_URL + videoId;

    return this.proxy.fetch(url).pipe(
      map(html => {
        if (!html) return null;

        const data = this.extractJSONFromHTML(html, 'ytInitialData');
        const playerResponse = this.extractJSONFromHTML(html, 'ytInitialPlayerResponse');
        const videoDetails = playerResponse?.videoDetails;

        const primaryInfo = data?.contents?.twoColumnWatchNextResults?.results?.results?.contents?.find((c: any) => c.videoPrimaryInfoRenderer)?.videoPrimaryInfoRenderer;
        const dateText = primaryInfo?.dateText?.simpleText || '';

        const secondaryContents = data?.contents?.twoColumnWatchNextResults?.secondaryResults?.secondaryResults?.results;
        const related: FeedVideo[] = [];
        if (secondaryContents) {
          secondaryContents.forEach((item: any) => {
            if (item.compactVideoRenderer) {
              const v = this.parseVideoRenderer(item.compactVideoRenderer);
              if (v) related.push(v);
            }
          });
        }

        return {
          id: videoId,
          title: videoDetails?.title || '',
          url: `https://www.youtube.com/watch?v=${videoId}`,
          thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
          author: videoDetails?.author || '',
          authorId: videoDetails?.channelId || '',
          channelAvatar: data?.contents?.twoColumnWatchNextResults?.results?.results?.contents?.find((c: any) => c.videoSecondaryInfoRenderer)?.videoSecondaryInfoRenderer?.owner?.videoOwnerRenderer?.thumbnail?.thumbnails?.[0]?.url,
          published: '',
          source: 'youtube',
          isShorts: false,
          description: videoDetails?.shortDescription || '',
          views: videoDetails?.viewCount || '0',
          duration: videoDetails?.lengthSeconds || '0',
          date: dateText,
          relatedVideos: related
        } as VideoDetails;
      }),
      catchError(() => of(null))
    );
  }

  fetchVideoComments(videoId: string): Observable<YouTubeComment[]> {
    const url = YOUTUBE_WATCH_URL + videoId;
    return of([]);
  }

  private parseVideoRenderer(renderer: any): FeedVideo | null {
    try {
      const videoId = renderer.videoId;
      if (!videoId) return null;

      const title = renderer.title?.runs?.[0]?.text || '';
      const author = renderer.ownerText?.runs?.[0]?.text || renderer.shortBylineText?.runs?.[0]?.text || 'YouTube Channel';
      const authorId = renderer.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId || '';
      const published = renderer.publishedTimeText?.simpleText || renderer.videoInfo?.runs?.[0]?.text || '';
      const views = renderer.viewCountText?.simpleText || renderer.shortViewCountText?.simpleText || '';
      const channelAvatar = renderer.channelThumbnail?.thumbnails?.[0]?.url;
      const duration = renderer.lengthText?.simpleText || renderer.lengthText?.runs?.[0]?.text || '';

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

  private extractJSONFromHTML(html: string, variableName: string): any {
    try {
      const pattern = `var ${variableName} = `;
      const startIndex = html.indexOf(pattern);
      if (startIndex === -1) return null;

      const jsonStart = html.indexOf('{', startIndex + pattern.length);
      if (jsonStart === -1) return null;

      let braceCount = 0;
      let inString = false;
      let escape = false;

      for (let i = jsonStart; i < html.length; i++) {
        const char = html[i];
        if (escape) { escape = false; continue; }
        if (char === '\\') { escape = true; continue; }
        if (char === '"') { inString = !inString; continue; }
        if (!inString) {
          if (char === '{') braceCount++;
          else if (char === '}') {
            braceCount--;
            if (braceCount === 0) {
              return JSON.parse(html.substring(jsonStart, i + 1));
            }
          }
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  }
}
