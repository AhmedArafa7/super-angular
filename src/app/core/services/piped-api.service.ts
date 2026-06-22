import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

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
  private instances = environment.pipedInstances || ['https://pipedapi.kavin.rocks'];

  async getVideoDetails(videoId: string): Promise<PipedVideoDetails> {
    let lastError: any;

    for (const instance of this.instances) {
      try {
        const url = `${instance}/streams/${videoId}`;
        const response = await firstValueFrom(this.http.get<PipedVideoDetails>(url));
        return response;
      } catch (error) {
        console.warn(`[PipedApiService] Instance ${instance} failed for ${videoId}`, error);
        lastError = error;
        // Continue to the next instance
      }
    }

    // If all instances fail, throw to trigger fallback in VideoStateService
    console.error(`[PipedApiService] ALL instances failed for video ${videoId}. Triggering Kill Switch.`);
    throw new Error('All Piped instances failed to fetch stream');
  }

  async getChannelDetails(channelId: string, nextpage?: string): Promise<any> {
    let lastError: any;

    for (const instance of this.instances) {
      try {
        let url = `${instance}/channel/${channelId}`;
        if (nextpage) {
          url += `?nextpage=${nextpage}`;
        }
        const response = await firstValueFrom(this.http.get<any>(url));
        return response;
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
        const response = await firstValueFrom(this.http.get<any[]>(url));
        return response;
      } catch (error) {
        console.warn(`[PipedApiService] Instance ${instance} failed for trending`, error);
        lastError = error;
      }
    }

    throw new Error('All Piped instances failed to fetch trending');
  }
}
