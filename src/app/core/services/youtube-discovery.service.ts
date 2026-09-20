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

export interface ChannelDetailsResult {
  id: string;
  name: string;
  avatarUrl: string;
  bannerUrl?: string;
  subscriberCount?: number | string;
  description?: string;
  relatedStreams: any[];
  nextpage?: string;
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

          let authorId = '';
          if (data.author_url) {
            const match = data.author_url.match(/(?:channel\/|@)([^/?&]+)/);
            if (match && match[1]) {
              authorId = data.author_url.includes('/@') ? `@${match[1]}` : match[1];
            }
          }

          observer.next({
            id: videoId,
            title: data.title || 'فيديو يوتيوب',
            url: `https://www.youtube.com/watch?v=${videoId}`,
            thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            author: data.author_name || 'قناة يوتيوب',
            authorId: authorId,
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
                let authorId = '';
                if (data.author_url) {
                  const match = data.author_url.match(/(?:channel\/|@)([^/?&]+)/);
                  if (match && match[1]) {
                    authorId = data.author_url.includes('/@') ? `@${match[1]}` : match[1];
                  }
                }

                observer.next({
                  id: videoId,
                  title: data.title,
                  url: `https://www.youtube.com/watch?v=${videoId}`,
                  thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
                  author: data.author_name || 'قناة يوتيوب',
                  authorId: authorId,
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

  /**
   * Search for YouTube channels by name/query via proxy
   */
  searchChannel(query: string): Observable<{ channelId: string; name: string; avatarUrl: string; handle?: string }[]> {
    const url = YOUTUBE_SEARCH_URL + encodeURIComponent(query);

    return this.proxy.fetchJSON<any>(url).pipe(
      map(data => {
        if (!data) return [];
        const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
        const channels: { channelId: string; name: string; avatarUrl: string; handle?: string }[] = [];
        const seen = new Set<string>();

        for (const section of contents) {
          const items = section.itemSectionRenderer?.contents || [];
          for (const item of items) {
            if (item.channelRenderer) {
              const cr = item.channelRenderer;
              const chId = cr.channelId;
              if (chId && !seen.has(chId)) {
                seen.add(chId);
                const name = cr.title?.simpleText || cr.title?.runs?.[0]?.text || query;
                const avatarUrl = cr.thumbnail?.thumbnails?.slice(-1)[0]?.url || '';
                const handle = cr.navigationEndpoint?.browseEndpoint?.canonicalBaseUrl || '';
                channels.push({
                  channelId: chId,
                  name,
                  avatarUrl: avatarUrl.startsWith('//') ? `https:${avatarUrl}` : avatarUrl,
                  handle
                });
              }
            }

            if (item.videoRenderer) {
              const vr = item.videoRenderer;
              const chId = vr.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId;
              const chName = vr.ownerText?.runs?.[0]?.text;
              if (chId && chName && !seen.has(chId)) {
                const queryLower = query.toLowerCase();
                if (chName.toLowerCase().includes(queryLower) || queryLower.includes(chName.toLowerCase())) {
                  seen.add(chId);
                  const avatar = vr.channelThumbnailSupportedRenderers?.channelThumbnailWithLinkRenderer?.thumbnail?.thumbnails?.slice(-1)[0]?.url || '';
                  channels.push({
                    channelId: chId,
                    name: chName,
                    avatarUrl: avatar.startsWith('//') ? `https:${avatar}` : avatar,
                    handle: vr.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.canonicalBaseUrl || ''
                  });
                }
              }
            }
          }
        }
        return channels;
      }),
      catchError(() => of([]))
    );
  }

  /**
   * Fetch full YouTube channel details and videos directly via proxy
   */
  fetchChannelDetails(channelIdentifier: string): Observable<ChannelDetailsResult | null> {
    let clean = (channelIdentifier || '').trim();
    if (clean.startsWith('title_')) {
      clean = clean.replace(/^title_/, '');
      try {
        clean = decodeURIComponent(clean);
      } catch {}
      clean = clean.replace(/\s*-\s*/, ' ').trim();
    }

    if (!clean) return of(null);

    let targetUrl = '';
    if (clean.startsWith('UC')) {
      targetUrl = `https://www.youtube.com/channel/${clean}/videos`;
    } else if (clean.startsWith('@')) {
      targetUrl = `https://www.youtube.com/${clean}/videos`;
    } else {
      targetUrl = `https://www.youtube.com/@${clean}/videos`;
    }

    return this.proxy.fetchJSON<any>(targetUrl).pipe(
      map(data => {
        if (!data) return null;
        return this.parseChannelData(data, clean);
      }),
      catchError(err => {
        console.warn('[YoutubeDiscoveryService] Channel direct fetch failed, trying search fallback:', err);
        return of(null);
      })
    );
  }

  private parseChannelData(data: any, identifierFallback: string): ChannelDetailsResult | null {
    try {
      const channelMeta = data.metadata?.channelMetadataRenderer;
      const channelId = channelMeta?.externalId || (identifierFallback.startsWith('UC') ? identifierFallback : '');
      const header = data.header?.pageHeaderRenderer || data.header?.c4TabbedHeaderRenderer;
      
      const channelName = channelMeta?.title || 
                          header?.pageTitle || 
                          header?.title || 
                          identifierFallback;

      const avatarUrl = channelMeta?.avatar?.thumbnails?.slice(-1)[0]?.url || 
                        header?.content?.pageHeaderViewModel?.image?.decoratedAvatarViewModel?.avatar?.image?.sources?.slice(-1)[0]?.url ||
                        header?.avatar?.thumbnails?.slice(-1)[0]?.url || 
                        '';

      const bannerSources = header?.content?.pageHeaderViewModel?.banner?.imageBannerViewModel?.image?.sources ||
                            header?.banner?.thumbnails;
      const bannerUrl = bannerSources && bannerSources.length > 0 ? bannerSources[bannerSources.length - 1].url : '';

      let subscriberCount = '';
      const metaRows = header?.content?.pageHeaderViewModel?.metadata?.contentMetadataViewModel?.metadataRows;
      if (metaRows) {
        for (const row of metaRows) {
          for (const part of row.metadataParts || []) {
            const text = part.text?.content || '';
            if (text.includes('subscribers') || text.includes('مشترك') || text.includes('sub') || text.includes('K') || text.includes('M')) {
              subscriberCount = text;
            }
          }
        }
      }
      if (!subscriberCount && header?.subscriberCountText?.simpleText) {
        subscriberCount = header.subscriberCountText.simpleText;
      }

      const description = channelMeta?.description || '';

      // Parse videos
      const tabs = data.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
      const videosTab = tabs.find((t: any) => 
        t.tabRenderer?.selected || 
        t.tabRenderer?.title === 'Videos' || 
        t.tabRenderer?.title === 'فيديوهات'
      ) || tabs[0];

      const gridContents = videosTab?.tabRenderer?.content?.richGridRenderer?.contents || 
                           videosTab?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents?.[0]?.gridRenderer?.items ||
                           [];

      const relatedStreams: any[] = [];

      for (const item of gridContents) {
        // Support modern 2026 YouTube lockupViewModel layout
        const lockup = item.richItemRenderer?.content?.lockupViewModel;
        if (lockup) {
          const videoId = lockup.contentId || 
            lockup.rendererContext?.commandContext?.onTap?.innertubeCommand?.watchEndpoint?.videoId;
          if (!videoId) continue;

          const title = lockup.metadata?.lockupMetadataViewModel?.title?.content || 'فيديو';
          const thumbSources = lockup.contentImage?.thumbnailViewModel?.image?.sources || [];
          const thumbnail = thumbSources[thumbSources.length - 1]?.url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
          
          let duration = '';
          const overlayBadges = lockup.contentImage?.thumbnailViewModel?.overlays || [];
          for (const ov of overlayBadges) {
            const badgeText = ov.thumbnailOverlayTimeStatusRenderer?.text?.runs?.[0]?.text ||
                              ov.thumbnailOverlayTimeStatusRenderer?.text?.simpleText;
            if (badgeText) {
              duration = badgeText;
              break;
            }
          }

          let views = '';
          let time = '';
          const videoMetaRows = lockup.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows || [];
          for (const r of videoMetaRows) {
            const parts = r.metadataParts || [];
            if (parts[0]?.text?.content) views = parts[0].text.content;
            if (parts[1]?.text?.content) time = parts[1].text.content;
          }

          relatedStreams.push({
            type: 'stream',
            url: `/watch?v=${videoId}`,
            id: videoId,
            title,
            uploaderName: channelName,
            uploaderUrl: `/channel/${channelId}`,
            uploaderAvatar: avatarUrl,
            uploadedDate: time,
            duration: duration || 0,
            views: views,
            thumbnail
          });
          continue;
        }

        // Support classic videoRenderer layout
        const vr = item.richItemRenderer?.content?.videoRenderer || item.videoRenderer;
        if (vr) {
          const videoId = vr.videoId;
          if (!videoId) continue;

          relatedStreams.push({
            type: 'stream',
            url: `/watch?v=${videoId}`,
            id: videoId,
            title: vr.title?.runs?.[0]?.text || vr.title?.simpleText || 'فيديو',
            uploaderName: channelName,
            uploaderUrl: `/channel/${channelId}`,
            uploaderAvatar: avatarUrl,
            uploadedDate: vr.publishedTimeText?.simpleText || '',
            duration: vr.lengthText?.simpleText || 0,
            views: vr.shortViewCountText?.simpleText || vr.viewCountText?.simpleText || '',
            thumbnail: vr.thumbnail?.thumbnails?.slice(-1)[0]?.url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
          });
        }
      }

      return {
        id: channelId || identifierFallback,
        name: channelName,
        avatarUrl,
        bannerUrl,
        subscriberCount: subscriberCount || 0,
        description,
        relatedStreams,
        nextpage: ''
      };
    } catch (e) {
      console.warn('[YoutubeDiscoveryService] parseChannelData error:', e);
      return null;
    }
  }

  private parseVideoRenderer(renderer: any): FeedVideo | null {
    try {
      const videoId = renderer.videoId;
      if (!videoId) return null;

      const title = renderer.title?.runs?.[0]?.text || '';
      const author = renderer.ownerText?.runs?.[0]?.text || renderer.shortBylineText?.runs?.[0]?.text || 'قناة يوتيوب';
      const authorId = renderer.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId || 
                       renderer.shortBylineText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId ||
                       renderer.navigationEndpoint?.browseEndpoint?.browseId || 
                       (renderer.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.canonicalBaseUrl?.replace(/^\//, '')) || '';
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
