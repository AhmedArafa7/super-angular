import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, map, catchError, of, concatMap, timeout } from 'rxjs';
import { VideoProvider } from './video-provider.interface';
import { FeedVideo } from '../../../features/halaltube/halaltube.model';
import { VideoDetails } from '../youtube-discovery.service';

@Injectable({ providedIn: 'root' })
export class InvidiousProviderService implements VideoProvider {
  private http = inject(HttpClient);
  name = 'Invidious';
  private instances = [
    'https://inv.nadeko.net',
    'https://invidious.projectsegfau.lt',
    'https://invidious.drgns.space',
    'https://yewtu.be',
    'https://invidious.lunar.icu'
  ];

  // Helper function to try instances in order
  private tryInstances<T>(
    requestFn: (instance: string) => Observable<T>,
    fallbackValue: T
  ): Observable<T> {
    return from(this.instances).pipe(
      concatMap(instance => 
        requestFn(instance).pipe(
          timeout(3500),
          catchError(err => {
            return of(null);
          })
        )
      ),
      concatMap(result => result ? of(result) : of()),
      catchError(() => of(fallbackValue))
    );
  }

  search(query: string, sp?: string): Observable<FeedVideo[]> {
    return this.tryInstances(
      (instance) => this.http.get<any[]>(`${instance}/api/v1/search?q=${encodeURIComponent(query)}`).pipe(
        map(results => {
          if (!Array.isArray(results)) return [];
          return results.map(v => ({
            id: v.videoId,
            title: v.title,
            url: `https://youtube.com/watch?v=${v.videoId}`,
            thumbnail: v.videoThumbnails?.find((t: any) => t.quality === 'high')?.url || `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`,
            author: v.author,
            authorId: v.authorId,
            source: 'youtube' as const,
            isShorts: false
          }));
        })
      ),
      []
    );
  }

  getVideoDetails(videoId: string): Observable<VideoDetails> {
    return this.tryInstances(
      (instance) => this.http.get<any>(`${instance}/api/v1/videos/${videoId}`).pipe(
        map(v => ({
          id: v.videoId,
          title: v.title,
          description: v.description,
          author: v.author,
          thumbnail: v.videoThumbnails?.find((t: any) => t.quality === 'high')?.url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          views: v.viewCount,
          duration: v.lengthSeconds?.toString() || '0',
          relatedVideos: [],
          source: 'youtube'
        }))
      ),
      { id: videoId, title: '', description: '', author: '', thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`, views: '0', duration: '0', relatedVideos: [], source: 'youtube' }
    );
  }

  async fetchChannelRssVideos(channelId: string): Promise<FeedVideo[]> {
    for (const instance of this.instances) {
      try {
        const response = await fetch(`${instance}/feed/channel/${channelId}`, { signal: AbortSignal.timeout(3500) });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const xmlText = await response.text();
        return [];
      } catch (err) {
        // Try next
      }
    }
    return [];
  }
}
