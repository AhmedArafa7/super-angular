import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { firstValueFrom, timeout } from 'rxjs';

export interface PipedVideoStream {
  url: string;
  quality: string;
  mimeType: string;
  videoOnly: boolean;
}

export interface PipedAudioStream {
  url: string;
  quality: string;
  mimeType: string;
}

export interface PipedVideoDetails {
  title: string;
  description: string;
  uploader: string;
  uploaderAvatar: string;
  thumbnailUrl: string;
  hls: string | null;
  videoStreams: PipedVideoStream[];
  audioStreams: PipedAudioStream[];
  relatedStreams: any[];
}

@Injectable({
  providedIn: 'root'
})
export class PipedApiService {
  private http = inject(HttpClient);
  private proxyBase = environment.apiBaseUrl !== undefined && environment.apiBaseUrl !== null ? environment.apiBaseUrl : 'https://super-axd.pages.dev';
  private instances = environment.pipedInstances || [
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.tokhmi.xyz',
    'https://api.piped.privacydev.net',
    'https://pipedapi.palvelut.me',
    'https://pipedapi.mha.fi',
    'https://pipedapi.drgns.space'
  ];

  private async smartFetch<T>(targetUrl: string, timeoutMs = 8000): Promise<T> {
    if (targetUrl.includes('/piped-proxy')) {
      const text = await firstValueFrom(
        this.http.get(targetUrl, { responseType: 'text' }).pipe(timeout(timeoutMs))
      );
      if (!text || text.trim().length === 0) {
        throw new Error('Local proxy returned empty response');
      }
      if (text.trim().startsWith('<')) {
        throw new Error('Local proxy returned HTML instead of JSON');
      }
      return JSON.parse(text) as T;
    }

    // Try direct fetch first (some Piped instances support CORS)
    try {
      const response = await fetch(targetUrl, { signal: AbortSignal.timeout(timeoutMs) });
      if (response.ok) {
        const text = await response.text();
        if (text && text.trim().length > 0 && !text.trim().startsWith('<')) {
          const parsed = JSON.parse(text) as any;
          if (!parsed?.error && !parsed?.message?.toLowerCase().includes('shutdown')) {
            return parsed as T;
          }
        }
      }
    } catch {
      // Direct fetch failed, fall through to proxy
    }

    const proxyUrl = `${this.proxyBase}/api/proxy?url=${encodeURIComponent(targetUrl)}`;
    const text = await firstValueFrom(
      this.http.get(proxyUrl, { responseType: 'text' }).pipe(timeout(timeoutMs))
    );

    if (!text || text.trim().length === 0) {
      throw new Error('Proxy returned empty response');
    }
    if (text.trim().startsWith('<')) {
      throw new Error('Proxy returned HTML instead of JSON');
    }

    const parsed = JSON.parse(text) as any;

    if (parsed?.error || parsed?.message?.toLowerCase().includes('shutdown')) {
      throw new Error(`Dead instance: ${parsed.error || parsed.message}`);
    }

    return parsed as T;
  }

  async getVideoDetails(videoId: string): Promise<PipedVideoDetails> {
    let lastError: any;

    for (const instance of this.instances) {
      try {
        const url = `${instance}/streams/${videoId}`;
        return await this.smartFetch<PipedVideoDetails>(url);
      } catch (error) {
        console.warn(`[PipedApiService] Instance ${instance} failed for ${videoId}`, error);
        lastError = error;
      }
    }

    // Secondary Fallback: Multi-instance Invidious API
    const invidiousInstances = [
      'https://inv.tux.pizza',
      'https://invidious.nerdvpn.de',
      'https://invidious.drgns.space',
      'https://vid.puffyan.us',
      'https://invidious.fdn.fr'
    ];

    for (const inv of invidiousInstances) {
      try {
        const invRes = await fetch(`${inv}/api/v1/videos/${videoId}`, { signal: AbortSignal.timeout(6000) });
        if (invRes.ok) {
          const text = await invRes.text();
          if (text && !text.trim().startsWith('<')) {
            const data = JSON.parse(text);
            if (data && (data.formatStreams?.length > 0 || data.adaptiveFormats?.length > 0)) {
              const videoStreams: PipedVideoStream[] = (data.formatStreams || []).map((f: any) => ({
                url: f.url,
                quality: f.quality || f.qualityLabel || '360p',
                mimeType: f.container ? `video/${f.container}` : 'video/mp4',
                videoOnly: false
              }));

              const audioStreams: PipedAudioStream[] = (data.adaptiveFormats || []).filter((f: any) => f.type?.includes('audio')).map((f: any) => ({
                url: f.url,
                quality: f.quality || 'audio',
                mimeType: f.type || 'audio/mp4'
              }));

              return {
                title: data.title || '',
                description: data.description || '',
                uploader: data.author || '',
                uploaderAvatar: data.authorThumbnails?.[0]?.url || '',
                thumbnailUrl: data.videoThumbnails?.[0]?.url || '',
                hls: data.hlsUrl || null,
                videoStreams,
                audioStreams,
                relatedStreams: (data.recommendedVideos || []).map((r: any) => ({
                  url: `/watch?v=${r.videoId}`,
                  title: r.title,
                  uploaderName: r.author,
                  thumbnail: r.videoThumbnails?.[0]?.url || `https://img.youtube.com/vi/${r.videoId}/hqdefault.jpg`,
                  duration: r.lengthSeconds,
                  views: r.viewCount
                }))
              };
            }
          }
        }
      } catch (invErr) {
        console.warn(`[PipedApiService] Invidious fallback ${inv} failed for ${videoId}`, invErr);
      }
    }

    console.error(`[PipedApiService] ALL instances failed for video ${videoId}. Triggering Kill Switch.`);
    throw new Error('All Piped instances failed to fetch stream');
  }

  async getChannelDetails(channelId: string, nextpage?: string): Promise<any> {
    let lastError: any;

    for (const instance of this.instances) {
      try {
        let url = `${instance}/channel/${channelId}`;
        if (nextpage) url += `?nextpage=${nextpage}`;
        return await this.smartFetch<any>(url);
      } catch (error) {
        console.warn(`[PipedApiService] Instance ${instance} failed for channel ${channelId}`, error);
        lastError = error;
      }
    }

    // Fallback: Fetch official YouTube Channel RSS Feed via Proxy if Piped fails
    console.warn(`[PipedApiService] All Piped instances failed for channel ${channelId}. Using YouTube RSS Fallback.`);
    try {
      return await this.fetchChannelRssFallback(channelId);
    } catch (rssErr) {
      console.error('[PipedApiService] YouTube RSS Fallback also failed:', rssErr);
      throw new Error('All Piped instances and RSS fallback failed for channel details');
    }
  }

  private async fetchChannelRssFallback(channelId: string): Promise<any> {
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const proxyUrl = `${this.proxyBase}/api/proxy?url=${encodeURIComponent(rssUrl)}`;
    
    const xmlText = await firstValueFrom(
      this.http.get(proxyUrl, { responseType: 'text' }).pipe(timeout(10000))
    );

    if (!xmlText || !xmlText.includes('<feed')) {
      throw new Error('Proxy returned empty or non-XML feed');
    }

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    const channelName = xmlDoc.getElementsByTagName('name')[0]?.textContent || 
                        xmlDoc.getElementsByTagName('title')[0]?.textContent || 
                        'قناة يوتيوب';

    const entries = Array.from(xmlDoc.getElementsByTagName('entry'));
    const relatedStreams = entries.map(entry => {
      const videoId = entry.getElementsByTagName('yt:videoId')[0]?.textContent || 
                      entry.getElementsByTagName('videoId')[0]?.textContent || 
                      entry.getElementsByTagName('id')[0]?.textContent?.replace('yt:video:', '') || '';

      const title = entry.getElementsByTagName('title')[0]?.textContent || '';
      const published = entry.getElementsByTagName('published')[0]?.textContent || '';

      return {
        type: 'stream',
        url: `/watch?v=${videoId}`,
        title: title,
        uploaderName: channelName,
        uploaderUrl: `/channel/${channelId}`,
        uploaderAvatar: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        uploadedDate: published ? new Date(published).toLocaleDateString('ar-EG') : 'حديثاً',
        shortDescription: '',
        duration: 0,
        views: 0,
        thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      };
    });

    return {
      id: channelId,
      name: channelName,
      avatarUrl: relatedStreams[0]?.thumbnail || 'assets/placeholder.jpg',
      bannerUrl: '',
      subscriberCount: 0,
      description: `قناة ${channelName}`,
      relatedStreams,
      nextpage: ''
    };
  }

  async getTrending(region: string = 'EG'): Promise<any[]> {
    let lastError: any;

    for (const instance of this.instances) {
      try {
        const url = `${instance}/trending?region=${region}`;
        return await this.smartFetch<any[]>(url);
      } catch (error) {
        console.warn(`[PipedApiService] Instance ${instance} failed for trending`, error);
        lastError = error;
      }
    }

    throw new Error('All Piped instances failed to fetch trending');
  }

  async getComments(videoId: string, nextpage?: string): Promise<any> {
    let lastError: any;

    for (const instance of this.instances) {
      try {
        let url = `${instance}/comments/${videoId}`;
        if (nextpage) url += `?nextpage=${nextpage}`;
        return await this.smartFetch<any>(url);
      } catch (error) {
        console.warn(`[PipedApiService] Instance ${instance} failed for comments`, error);
        lastError = error;
      }
    }

    throw new Error('All Piped instances failed to fetch comments');
  }

  async search(query: string): Promise<any[]> {
    for (const instance of this.instances) {
      try {
        const url = `${instance}/search?q=${encodeURIComponent(query)}&filter=all`;
        const res = await this.smartFetch<any>(url);
        const items = res?.items || res || [];
        if (Array.isArray(items) && items.length > 0) {
          const videos: any[] = [];
          for (const item of items) {
            if (item.type === 'stream' || item.url?.includes('/watch?v=')) {
              const videoId = item.url ? item.url.replace('/watch?v=', '') : item.id;
              if (videoId) {
                videos.push({
                  id: videoId,
                  title: item.title,
                  url: `https://youtube.com/watch?v=${videoId}`,
                  thumbnail: item.thumbnail || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
                  author: item.uploaderName || item.author || '',
                  authorId: item.uploaderUrl ? item.uploaderUrl.replace('/channel/', '') : '',
                  source: 'youtube' as const,
                  isShorts: item.duration > 0 && item.duration <= 65
                });
              }
            }
          }
          if (videos.length > 0) return videos;
        }
      } catch (err) {
        console.warn(`[PipedApiService] Search failed for instance ${instance}`, err);
      }
    }
    return [];
  }
}
