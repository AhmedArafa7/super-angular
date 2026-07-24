import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, map, catchError, of, concatMap } from 'rxjs';
import { VideoProvider } from './video-provider.interface';
import { FeedVideo } from '../../../features/wetube/wetube.model';
import { VideoDetails } from '../youtube-discovery.service';

@Injectable({ providedIn: 'root' })
export class InvidiousProviderService implements VideoProvider {
  private http = inject(HttpClient);
  name = 'Invidious';
  private instances = ['https://invidious.snopyta.org', 'https://yewtu.be', 'https://inv.riverside.rocks', 'https://vid.puffyan.us'];

  // Helper function to try instances in order
  private tryInstances<T>(
    requestFn: (instance: string) => Observable<T>,
    fallbackValue: T
  ): Observable<T> {
    // Create an observable sequence that tries each instance one after another
    return from(this.instances).pipe(
      concatMap(instance => 
        requestFn(instance).pipe(
          catchError(err => {
            console.warn(`[InvidiousProvider] Instance ${instance} failed:`, err);
            return of(null); // Signal that this instance failed, try next
          })
        )
      ),
      // Find the first non-null result
      concatMap(result => result ? of(result) : of()),
      // If all failed, use fallback
      catchError(() => of(fallbackValue))
    );
  }

  search(query: string, sp?: string): Observable<FeedVideo[]> {
    return this.tryInstances(
      (instance) => this.http.get<any[]>(`${instance}/api/v1/search?q=${encodeURIComponent(query)}`).pipe(
        map(results => results.map(v => ({
          id: v.videoId,
          title: v.title,
          url: `https://youtube.com/watch?v=${v.videoId}`,
          thumbnail: v.videoThumbnails?.find((t: any) => t.quality === 'high')?.url || '',
          author: v.author,
          authorId: v.authorId,
          source: 'youtube' as const,
          isShorts: false
        })))
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
          thumbnail: v.videoThumbnails?.find((t: any) => t.quality === 'high')?.url || '',
          views: v.viewCount,
          duration: v.lengthSeconds?.toString() || '0',
          relatedVideos: [],
          source: 'youtube'
        }))
      ),
      { id: videoId, title: '', description: '', author: '', thumbnail: '', views: 0, duration: '0', relatedVideos: [], source: 'youtube' }
    );
  }

  async fetchChannelRssVideos(channelId: string): Promise<FeedVideo[]> {
    // Try instances in order for fetchChannelRssVideos (using fetch API)
    for (const instance of this.instances) {
      try {
        const response = await fetch(`${instance}/feed/channel/${channelId}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const xmlText = await response.text();
        // TODO: Add proper RSS parsing here
        return [];
      } catch (err) {
        console.warn(`[InvidiousProvider] Instance ${instance} failed for channel RSS:`, err);
      }
    }
    return [];
  }
}
