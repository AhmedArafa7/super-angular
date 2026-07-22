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
  private instances = environment.pipedInstances || ['https://pipedapi.kavin.rocks'];

  private async smartFetch<T>(targetUrl: string, timeoutMs = 8000): Promise<T> {
    if (targetUrl.includes('/piped-proxy')) {
      const text = await firstValueFrom(
        this.http.get(targetUrl, { responseType: 'text' }).pipe(timeout(timeoutMs))
      );
      if (!text || text.trim().length === 0) {
        throw new Error('Local proxy returned empty response');
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

    throw new Error('All Piped instances failed to fetch channel details');
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
}
