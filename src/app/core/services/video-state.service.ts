import { Injectable, signal, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { PipedApiService, PipedVideoDetails } from './piped-api.service';
import { IndexedDBService } from './indexed-db.service';
import { VideoDownloadService } from './video-download.service';
import { halaltubeService } from '../../features/halaltube/halaltube.service';
import { checkIsShorts } from '../../features/halaltube/halaltube.model';
import { YoutubeDiscoveryService } from './youtube-discovery.service';

export type PlayerMode = 'hidden' | 'floating' | 'full' | 'pip';
export type PlayerType = 'native' | 'iframe';

export interface ActiveVideo {
  id: string;
  title: string;
  author: string;
  thumbnail: string;
  url?: string;
  source?: string;
  channelAvatar?: string | null;
  category?: string;
  isWhitelisted?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class VideoStateService {
  private pipedService = inject(PipedApiService);
  private discoveryService = inject(YoutubeDiscoveryService);
  private dbService = inject(IndexedDBService);
  private downloadService = inject(VideoDownloadService);
  private halaltubeService = inject(halaltubeService);

  // Player UI State
  readonly playerMode = signal<PlayerMode>('hidden');
  readonly playerType = signal<PlayerType>('native');
  readonly ambientColor = signal<string>('transparent');
  
  // Video Content State
  readonly activeVideo = signal<ActiveVideo | null>(null);
  readonly pipedDetails = signal<PipedVideoDetails | null>(null);
  readonly rawStreamUrl = signal<string | null>(null);
  
  // Watch Sidebar State
  readonly relatedVideos = signal<any[]>([]);
  readonly isLoadingRelated = signal<boolean>(false);
  
  // Playback State
  readonly isPlaying = signal<boolean>(false);
  readonly currentTime = signal<number>(0);
  readonly duration = signal<number>(0);
  readonly isMuted = signal<boolean>(false);
  readonly volume = signal<number>(1);
  readonly isLoading = signal<boolean>(false);

  // Position for seamless Full <-> Floating transition
  readonly playerRect = signal<DOMRect | null>(null);

  // Modal Coordination (Pause video & lower player z-index when modal is active)
  readonly isModalOpen = signal<boolean>(false);

  // Shorts State Coordination
  readonly isShortsMuted = signal<boolean>(true); // All shorts start muted per policies

  // Watched History IDs & Progress for thumbnail progress/indicator
  readonly watchedIds = signal<Set<string>>(new Set());
  readonly watchedProgress = signal<Map<string, number>>(new Map());

  constructor() {
    this.loadWatchedHistory();
  }

  private async loadWatchedHistory() {
    try {
      const history = await this.dbService.getAll('watch_history') || [];
      const ids = new Set<string>();
      const progMap = new Map<string, number>();
      
      for (const item of history) {
        const vid = item.videoId || item.id;
        if (vid) {
          ids.add(vid);
          progMap.set(vid, item.progress || 100);
        }
      }
      this.watchedIds.set(ids);
      this.watchedProgress.set(progMap);
    } catch (e) {
      console.warn('Failed to load watch history:', e);
    }
  }

  // Commands
  readonly seekCommand = signal<number | null>(null);

  pauseVideo() {
    this.isPlaying.set(false);
  }

  notifyShortsStarted() {
    // Coordinate with Global Player: pause it if a short starts
    if (this.isPlaying() && this.activeVideo()) {
      this.isPlaying.set(false);
    }
  }

  async playVideo(video: ActiveVideo, forceIframe = false) {
    const current = this.activeVideo();
    if (current && current.id === video.id && !forceIframe && (this.playerType() === 'iframe' || this.rawStreamUrl())) {
      if (video.title && video.title !== current.title) {
        this.activeVideo.update(v => v ? { ...v, title: video.title, author: video.author || v.author } : v);
      }
      return;
    }

    this.activeVideo.set(video);
    this.playerMode.set('full');
    this.currentTime.set(0);
    this.isLoading.set(true);
    this.isLoadingRelated.set(true);
    this.pipedDetails.set(null);
    this.rawStreamUrl.set(null);
    this.relatedVideos.set([]);

    this.watchedIds.update(set => {
      const newSet = new Set(set);
      newSet.add(video.id);
      return newSet;
    });

    this.watchedProgress.update(map => {
      const newMap = new Map(map);
      if (!newMap.has(video.id)) {
        newMap.set(video.id, 5); // Initial marker when opened
      }
      return newMap;
    });

    // Save to local watch_history in IndexedDB (transparently encrypted)
    try {
      const ytIdForThumb = this.extractYoutubeId(video.url) ||
                           this.extractYoutubeId((video as any).externalUrl) ||
                           this.extractYoutubeId(video.id);

      const safeThumb = (video.thumbnail && !video.thumbnail.includes('placeholder'))
        ? video.thumbnail
        : (ytIdForThumb ? `https://img.youtube.com/vi/${ytIdForThumb}/hqdefault.jpg` : 'assets/placeholder.jpg');

      await this.dbService.put('watch_history', {
        videoId: video.id,
        title: video.title || 'فيديو halaltube',
        thumbnail: safeThumb,
        author: video.author || 'قناة halaltube',
        duration: (video as any).duration || '',
        isShorts: checkIsShorts(video),
        progress: this.watchedProgress().get(video.id) || 5,
        watchedAt: Date.now()
      });
    } catch (e) {
      console.warn('Failed to save watch history locally:', e);
    }

    // Safety fallback timeout to ensure sidebar never gets stuck loading
    setTimeout(() => {
      if (this.isLoadingRelated()) {
        this.isLoadingRelated.set(false);
      }
    }, 2000);

    const ytId = this.extractYoutubeId(video.url) ||
                 this.extractYoutubeId((video as any).externalUrl) ||
                 this.extractYoutubeId(video.id) ||
                 video.id;

    const targetId = ytId;

    // ── Local Video Fast Track ──
    if (video.source === 'local' && video.url && !video.url.includes('youtube.com') && !video.url.includes('youtu.be')) {
      this.playerType.set('native');
      this.rawStreamUrl.set(video.url);
      this.isLoading.set(false);
      this.isPlaying.set(true);
      this.isLoadingRelated.set(false);
      return;
    }

    // Check if video is cached locally (Offline / Data Saver Mode)
    try {
      const cachedBlobUrl = await this.downloadService.getCachedBlobUrl(targetId);
      if (cachedBlobUrl) {
        this.rawStreamUrl.set(cachedBlobUrl);
        this.playerType.set('native');
        this.isLoading.set(false);
        this.isPlaying.set(true);
        this.isLoadingRelated.set(false);
        return;
      }
    } catch (e) {
      console.warn('[VideoStateService] Cache check error:', e);
    }

    // ── Primary YouTube Playback Track: Direct YouTube Embed ──
    this.switchToIframe();

    // 1. Check IndexedDB cache for related videos first
    try {
      const cachedRelated = await this.dbService.getWithTTL('related_videos', targetId, 2 * 60 * 60 * 1000);
      if (cachedRelated?.streams && cachedRelated.streams.length >= 10) {
        this.relatedVideos.set(cachedRelated.streams);
        this.isLoadingRelated.set(false);
      }
    } catch (e) {}

    // 2. Background Contextual Multi-Source Recommendations:
    // Extract keywords from title and clean up common stopwords
    const cleanTitle = (video.title || '')
      .replace(/[\(\)\[\]\|-–—#_]/g, ' ')
      .split(' ')
      .filter((w: string) => w.length > 2 && !['في', 'من', 'على', 'إلى', 'مع', 'عن', 'هذا', 'هذه', 'كيف', 'ماذا', 'شاهد', 'فيديو'].includes(w))
      .slice(0, 4)
      .join(' ');

    const searchTopic = cleanTitle || video.category || 'تكنولوجيا';

    // Query related streams from Piped, Discovery Search, and Channel Streams concurrently
    const relatedPromises: Promise<any[]>[] = [
      this.pipedService.getVideoDetails(targetId).then(d => {
        if (d) this.pipedDetails.set(d);
        return d?.relatedStreams || [];
      }).catch(() => []),
      firstValueFrom(this.discoveryService.searchYouTube(searchTopic)).catch(() => []),
      this.pipedService.search(searchTopic).catch(() => [])
    ];

    if ((video as any).authorId) {
      relatedPromises.push(
        this.pipedService.getChannelDetails((video as any).authorId)
          .then(c => c?.relatedStreams || [])
          .catch(() => [])
      );
    }

    Promise.all(relatedPromises).then(([pipedRelated, discoveryRelated, pipedSearchRelated, channelRelated]) => {
      const allRelated = [
        ...(pipedRelated || []),
        ...(discoveryRelated || []),
        ...(pipedSearchRelated || []),
        ...(channelRelated || [])
      ];

      // Deduplicate and filter out current video
      const seen = new Set<string>([targetId]);
      const uniqueRelated: any[] = [];
      for (const item of allRelated) {
        const vId = item.id || (item.url ? item.url.replace('/watch?v=', '') : '');
        if (vId && !seen.has(vId)) {
          seen.add(vId);
          uniqueRelated.push({
            id: vId,
            title: item.title,
            author: item.author || item.uploaderName,
            authorId: item.authorId || item.uploaderUrl?.replace('/channel/', '') || '',
            thumbnail: item.thumbnail || (item.thumbnailUrl) || `https://img.youtube.com/vi/${vId}/hqdefault.jpg`,
            time: item.time || item.uploadedDate || 'حديثاً',
            duration: item.duration,
            views: item.views,
            category: item.category || video.category,
            source: 'youtube'
          });
        }
      }

      // If we got results, update state & cache in IndexedDB
      if (uniqueRelated.length > 0) {
        this.relatedVideos.set(uniqueRelated);
        this.dbService.setWithTTL('related_videos', { videoId: targetId, streams: uniqueRelated }).catch(() => {});
        // Auto-cache to IndexedDB saved_videos so global library grows!
        for (const item of uniqueRelated.slice(0, 15)) {
          this.dbService.autoCacheVideo(item).catch(() => {});
        }
      }
      this.isLoadingRelated.set(false);
    }).catch(() => {
      this.isLoadingRelated.set(false);
    });
  }

  private switchToIframe() {
    this.playerType.set('iframe');
    this.rawStreamUrl.set(null);
    this.isLoading.set(false);
    this.isPlaying.set(true);
    this.isLoadingRelated.set(false);
  }

  setPlayerMode(mode: PlayerMode) {
    // If we have no active video, we can't be in floating or full mode
    if (!this.activeVideo() && mode !== 'hidden') {
      return;
    }
    this.playerMode.set(mode);
  }

  closePlayer() {
    this.playerMode.set('hidden');
    this.activeVideo.set(null);
    this.rawStreamUrl.set(null);
    this.isPlaying.set(false);
  }

  togglePlayPause() {
    this.isPlaying.update(p => !p);
  }

  seekTo(time: number) {
    this.seekCommand.set(time);
    this.currentTime.set(time);
  }

  updateProgress(time: number) {
    this.currentTime.set(time);
    const active = this.activeVideo();
    const dur = this.duration();
    if (active && dur > 0) {
      const percent = Math.min(100, Math.max(1, Math.round((time / dur) * 100)));
      const videoId = active.id;
      
      this.watchedProgress.update(map => {
        const newMap = new Map(map);
        const current = newMap.get(videoId) || 0;
        if (percent > current) {
          newMap.set(videoId, percent);
        }
        return newMap;
      });

      this.dbService.put('watch_history', {
        videoId: active.id,
        title: active.title,
        thumbnail: active.thumbnail,
        author: active.author,
        progress: this.watchedProgress().get(active.id) || percent,
        watchedAt: Date.now()
      }).catch(() => {});
    }
  }

  private extractYoutubeId(urlOrId?: string): string | null {
    if (!urlOrId) return null;
    const match = urlOrId.match(/(?:v=|\/embed\/|\/shorts\/|youtu\.be\/|^)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  }
}
