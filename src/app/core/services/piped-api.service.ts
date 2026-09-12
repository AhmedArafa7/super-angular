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

import { InstanceHealthRegistry } from './instance-health-registry.service';

@Injectable({
  providedIn: 'root'
})
export class PipedApiService {
  private http = inject(HttpClient);
  private healthRegistry = inject(InstanceHealthRegistry);
  private proxyBase = environment.apiBaseUrl !== undefined && environment.apiBaseUrl !== null ? environment.apiBaseUrl : 'https://super-axd.pages.dev';
  
  // Healthy curated public instances pool (2026 active nodes)
  private instances = [
    'https://pipedapi.adminforge.de',
    'https://pipedapi.rhea.pub',
    'https://api.piped.privacydev.net',
    'https://pipedapi.drgns.space',
    'https://piped-api.garudalinux.org',
    'https://pipedapi.leptons.xyz',
    'https://pipedapi.astral.autistici.org',
    'https://pipedapi.smnz.de'
  ];

  private activeInstanceIndex = 0;
  private corsBlockedOrigins = new Set<string>();

  // In-memory caching and deduplication
  private videoDetailsCache = new Map<string, { data: PipedVideoDetails; time: number }>();
  private inFlightVideoDetails = new Map<string, Promise<PipedVideoDetails>>();
  private commentsCache = new Map<string, { data: any; time: number }>();
  private inFlightComments = new Map<string, Promise<any>>();

  getRotatedInstances(): string[] {
    const list = [...this.instances];
    // Rotate so last successful instance stays first
    const shifted = list.slice(this.activeInstanceIndex).concat(list.slice(0, this.activeInstanceIndex));
    return this.healthRegistry.filterAvailable(shifted);
  }

  private async smartFetch<T>(targetUrl: string, timeoutMs = 3500): Promise<T> {
    if (targetUrl.includes('/piped-proxy')) {
      const text = await firstValueFrom(
        this.http.get(targetUrl, { 
          responseType: 'text',
          headers: { 'X-Silent-Error': 'true' }
        }).pipe(timeout(timeoutMs))
      );
      if (!text || text.trim().length === 0) {
        throw new Error('Local proxy returned empty response');
      }
      if (text.trim().startsWith('<')) {
        throw new Error('Local proxy returned HTML instead of JSON');
      }
      return JSON.parse(text) as T;
    }

    let origin = '';
    try {
      origin = new URL(targetUrl).origin;
    } catch {}

    // Try direct fetch only if origin hasn't failed CORS previously
    if (origin && !this.corsBlockedOrigins.has(origin)) {
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
        } else {
          this.corsBlockedOrigins.add(origin);
        }
      } catch {
        this.corsBlockedOrigins.add(origin);
      }
    }

    const proxyUrl = `${this.proxyBase}/api/proxy?url=${encodeURIComponent(targetUrl)}`;
    const text = await firstValueFrom(
      this.http.get(proxyUrl, { 
        responseType: 'text',
        headers: { 'X-Silent-Error': 'true' }
      }).pipe(timeout(timeoutMs))
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
    const cached = this.videoDetailsCache.get(videoId);
    if (cached && (Date.now() - cached.time < 30 * 60 * 1000)) {
      return cached.data;
    }

    const inFlight = this.inFlightVideoDetails.get(videoId);
    if (inFlight) {
      return inFlight;
    }

    const promise = this.fetchVideoDetailsInternal(videoId).then(res => {
      this.videoDetailsCache.set(videoId, { data: res, time: Date.now() });
      this.inFlightVideoDetails.delete(videoId);
      return res;
    }).catch(err => {
      this.inFlightVideoDetails.delete(videoId);
      throw err;
    });

    this.inFlightVideoDetails.set(videoId, promise);
    return promise;
  }

  private async fetchVideoDetailsInternal(videoId: string): Promise<PipedVideoDetails> {
    // 1. Try Piped instances (fast 3.5s timeout per instance)
    const instancesToTry = this.getRotatedInstances();
    for (let i = 0; i < Math.min(instancesToTry.length, 5); i++) {
      const instance = instancesToTry[i];
      try {
        const url = `${instance}/streams/${videoId}`;
        const res = await this.smartFetch<PipedVideoDetails>(url, 3500);
        if (res && (res.videoStreams?.length > 0 || res.hls || res.title)) {
          this.activeInstanceIndex = this.instances.indexOf(instance);
          this.healthRegistry.recordSuccess(instance);
          return res;
        }
      } catch (error) {
        this.healthRegistry.recordFailure(instance);
        // Continue to next instance
      }
    }

    const invidiousInstances = [
      'https://inv.tux.pizza',
      'https://invidious.nerdvpn.de',
      'https://inv.nadeko.net',
      'https://invidious.projectsegfau.lt',
      'https://invidious.drgns.space',
      'https://yewtu.be'
    ];

    const availableInvidious = this.healthRegistry.filterAvailable(invidiousInstances);
    for (const inv of availableInvidious) {
      try {
        const invRes = await fetch(`${inv}/api/v1/videos/${videoId}`, { signal: AbortSignal.timeout(3000) });
        if (invRes.ok) {
          this.healthRegistry.recordSuccess(inv);
          const data = await invRes.json();
          const streams: PipedVideoStream[] = (data.formatStreams || []).map((f: any) => ({
            url: f.url,
            quality: f.qualityLabel || f.quality || '360p',
            mimeType: f.type || 'video/mp4',
            videoOnly: false
          }));

          return {
            title: data.title || 'فيديو',
            description: data.description || '',
            uploader: data.author || '',
            uploaderAvatar: data.authorThumbnails?.[0]?.url || '',
            thumbnailUrl: data.videoThumbnails?.[0]?.url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            hls: data.hlsUrl || null,
            videoStreams: streams,
            audioStreams: [],
            relatedStreams: []
          };
        } else {
          this.healthRegistry.recordFailure(inv);
        }
      } catch (e) {
        this.healthRegistry.recordFailure(inv);
      }
    }

    // 3. Ultra-fast oEmbed fallback for genuine title & channel metadata
    try {
      const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`, {
        signal: AbortSignal.timeout(3000)
      });
      if (oembedRes.ok) {
        const data = await oembedRes.json();
        return {
          title: data.title || 'فيديو يوتيوب',
          description: '',
          uploader: data.author_name || 'قناة يوتيوب',
          uploaderAvatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.author_name || 'Channel')}&background=6366f1&color=fff&bold=true`,
          thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          hls: null,
          videoStreams: [],
          audioStreams: [],
          relatedStreams: []
        };
      }
    } catch (e) {}

    // 4. Absolute Fallback
    return {
      title: 'فيديو يوتيوب',
      description: '',
      uploader: 'قناة يوتيوب',
      uploaderAvatar: '',
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      hls: null,
      videoStreams: [],
      audioStreams: [],
      relatedStreams: []
    };
  }

  async getChannelDetails(channelId: string, nextpage?: string): Promise<any> {
    for (const instance of this.getRotatedInstances().slice(0, 3)) {
      try {
        let url = `${instance}/channel/${channelId}`;
        if (nextpage) url += `?nextpage=${nextpage}`;
        const res = await this.smartFetch<any>(url, 3500);
        this.healthRegistry.recordSuccess(instance);
        return res;
      } catch (error) {
        this.healthRegistry.recordFailure(instance);
        // Try next
      }
    }

    // Fallback: Fetch official YouTube Channel RSS Feed via Proxy if Piped fails
    try {
      return await this.fetchChannelRssFallback(channelId);
    } catch (rssErr) {
      console.error('[PipedApiService] YouTube RSS Fallback failed:', rssErr);
      throw new Error('All Piped instances and RSS fallback failed for channel details');
    }
  }

  private async fetchChannelRssFallback(channelId: string): Promise<any> {
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const proxyUrl = `${this.proxyBase}/api/proxy?url=${encodeURIComponent(rssUrl)}`;
    
    const xmlText = await firstValueFrom(
      this.http.get(proxyUrl, { responseType: 'text' }).pipe(timeout(6000))
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
    for (const instance of this.instances.slice(0, 3)) {
      try {
        const url = `${instance}/trending?region=${region}`;
        return await this.smartFetch<any[]>(url, 3500);
      } catch (error) {
        // Try next
      }
    }
    throw new Error('All Piped instances failed to fetch trending');
  }

  async getComments(videoId: string, nextpage?: string): Promise<any> {
    if (!nextpage) {
      const cached = this.commentsCache.get(videoId);
      if (cached && (Date.now() - cached.time < 10 * 60 * 1000)) {
        return cached.data;
      }

      const inFlight = this.inFlightComments.get(videoId);
      if (inFlight) {
        return inFlight;
      }
    }

    const promise = this.fetchCommentsInternal(videoId, nextpage).then(res => {
      if (!nextpage) {
        this.commentsCache.set(videoId, { data: res, time: Date.now() });
        this.inFlightComments.delete(videoId);
      }
      return res;
    }).catch(() => {
      if (!nextpage) {
        this.inFlightComments.delete(videoId);
      }
      return { comments: [], nextpage: null };
    });

    if (!nextpage) {
      this.inFlightComments.set(videoId, promise);
    }
    return promise;
  }

  private async fetchCommentsInternal(videoId: string, nextpage?: string): Promise<any> {
    for (const instance of this.instances.slice(0, 3)) {
      try {
        let url = `${instance}/comments/${videoId}`;
        if (nextpage) url += `?nextpage=${nextpage}`;
        return await this.smartFetch<any>(url, 3500);
      } catch (error) {
        // Try next
      }
    }
    return { comments: [], nextpage: null };
  }

  async search(query: string): Promise<any[]> {
    for (const instance of this.getRotatedInstances().slice(0, 4)) {
      try {
        const url = `${instance}/search?q=${encodeURIComponent(query)}&filter=all`;
        const res = await this.smartFetch<any>(url, 3500);
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
                  channelAvatar: item.uploaderAvatar || item.uploaderThumbnails?.[0]?.url || item.avatar || '',
                  source: 'youtube' as const,
                  isShorts: item.duration > 0 && item.duration <= 65
                });
              }
            }
          }
          if (videos.length > 0) {
            this.healthRegistry.recordSuccess(instance);
            return videos;
          }
        }
      } catch (err) {
        this.healthRegistry.recordFailure(instance);
        // Try next instance
      }
    }
    return [];
  }

  async searchChannels(query: string): Promise<any[]> {
    for (const instance of this.getRotatedInstances().slice(0, 3)) {
      try {
        const url = `${instance}/search?q=${encodeURIComponent(query)}&filter=all`;
        const res = await this.smartFetch<any>(url, 3500);
        const items = res?.items || res || [];
        if (Array.isArray(items) && items.length > 0) {
          const channels = items
            .filter((item: any) => item.type === 'channel' || (item.url && item.url.includes('/channel/')))
            .map((item: any) => ({
              channelId: item.url ? item.url.replace('/channel/', '') : item.id,
              name: item.name || item.uploaderName || '',
              avatarUrl: item.thumbnail || item.avatarUrl || ''
            }));
          if (channels.length > 0) {
            this.healthRegistry.recordSuccess(instance);
            return channels;
          }
        }
      } catch (err) {
        this.healthRegistry.recordFailure(instance);
        // Try next
      }
    }
    return [];
  }

  async getPlaylist(playlistId: string): Promise<any> {
    // 1. Try Piped instances
    for (const instance of this.getRotatedInstances().slice(0, 4)) {
      try {
        const url = `${instance}/playlists/${playlistId}`;
        const res = await this.smartFetch<any>(url, 3500);
        if (res && (res.relatedStreams || res.videos || res.items)) {
          this.healthRegistry.recordSuccess(instance);
          return res;
        }
      } catch (error) {
        this.healthRegistry.recordFailure(instance);
        // Try next instance
      }
    }

    // 2. Invidious Instances Fallback
    const invidiousInstances = [
      'https://inv.tux.pizza',
      'https://invidious.nerdvpn.de',
      'https://invidious.projectsegfau.lt',
      'https://inv.nadeko.net',
      'https://invidious.drgns.space',
      'https://yewtu.be'
    ];

    const availableInvidious = this.healthRegistry.filterAvailable(invidiousInstances);
    for (const inv of availableInvidious) {
      try {
        const invRes = await fetch(`${inv}/api/v1/playlists/${playlistId}`, { signal: AbortSignal.timeout(3500) });
        if (invRes.ok) {
          this.healthRegistry.recordSuccess(inv);
          const data = await invRes.json();
          const videos = (data.videos || []).map((v: any) => ({
            type: 'stream',
            url: `/watch?v=${v.videoId}`,
            id: v.videoId,
            title: v.title,
            uploaderName: v.author || data.author,
            thumbnail: v.videoThumbnails?.[0]?.url || `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`
          }));
          return {
            name: data.title || 'قائمة تشغيل',
            uploader: data.author || '',
            relatedStreams: videos,
            videos: videos
          };
        } else {
          this.healthRegistry.recordFailure(inv);
        }
      } catch (e) {
        this.healthRegistry.recordFailure(inv);
      }
    }

    throw new Error('All Piped and Invidious instances failed to fetch playlist');
  }
}
