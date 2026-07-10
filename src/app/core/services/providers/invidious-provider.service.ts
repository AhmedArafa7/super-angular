import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, map } from 'rxjs';
import { VideoProvider } from './video-provider.interface';
import { FeedVideo } from '../../../features/wetube/wetube.model';
import { VideoDetails } from '../youtube-discovery.service';

@Injectable({ providedIn: 'root' })
export class InvidiousProviderService implements VideoProvider {
  private http = inject(HttpClient);
  name = 'Invidious';
  private instances = ['https://invidious.snopyta.org', 'https://yewtu.be'];

  search(query: string, sp?: string): Observable<FeedVideo[]> {
    const instance = this.instances[0];
    return this.http.get<any[]>(`${instance}/api/v1/search?q=${encodeURIComponent(query)}`).pipe(
      map(results => results.map(v => ({
        id: v.videoId,
        title: v.title,
        url: `https://youtube.com/watch?v=${v.videoId}`,
        thumbnail: v.videoThumbnails?.find((t: any) => t.quality === 'high')?.url || '',
        author: v.author,
        authorId: v.authorId,
        source: 'youtube' as const, // تم تغيير القيمة لتتوافق مع ContentSource
        isShorts: false
      })))
    );
  }

  getVideoDetails(videoId: string): Observable<VideoDetails> {
    const instance = this.instances[0];
    return this.http.get<any>(`${instance}/api/v1/videos/${videoId}`).pipe(
      map(v => ({
        id: v.videoId,
        title: v.title,
        description: v.description,
        author: v.author,
        thumbnail: v.videoThumbnails?.find((t: any) => t.quality === 'high')?.url || '',
        views: v.viewCount,
        duration: v.lengthSeconds?.toString() || '0', // إضافة الخصائص المفقودة
        relatedVideos: [],
        source: 'youtube' // تم تغيير القيمة لتتوافق مع ContentSource
      }))
    );
  }

  async fetchChannelRssVideos(channelId: string): Promise<FeedVideo[]> {
    // Invidious supports RSS
    const instance = this.instances[0];
    const response = await fetch(`${instance}/feed/channel/${channelId}`);
    const xmlText = await response.text();
    // RSS parsing logic... (simplified)
    return [];
  }
}
