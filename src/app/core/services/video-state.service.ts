import { Injectable, signal, inject } from '@angular/core';
import { PipedApiService, PipedVideoDetails } from './piped-api.service';
import { IndexedDBService } from './indexed-db.service';
import { VideoDownloadService } from './video-download.service';
import { WeTubeService } from '../../features/wetube/wetube.service';

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
}

@Injectable({
  providedIn: 'root'
})
export class VideoStateService {
  private pipedService = inject(PipedApiService);
  private dbService = inject(IndexedDBService);
  private downloadService = inject(VideoDownloadService);
  private wetubeService = inject(WeTubeService);

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
    this.activeVideo.set(video);
    this.playerMode.set('full');
    this.currentTime.set(0);
    this.isLoading.set(true);
    this.isLoadingRelated.set(true);
    this.pipedDetails.set(null);
    this.rawStreamUrl.set(null);
    this.relatedVideos.set([]);

    // Save to local watch_history in IndexedDB (transparently encrypted)
    try {
      await this.dbService.put('watch_history', {
        videoId: video.id,
        title: video.title,
        thumbnail: video.thumbnail,
        author: video.author,
        watchedAt: Date.now()
      });
    } catch (e) {
      console.warn('Failed to save watch history locally:', e);
    }

    if (forceIframe) {
      this.switchToIframe();
      return;
    }

    // ── Local Video Fast Track ──
    if (video.source === 'local' && video.url) {
      this.playerType.set('native');
      this.rawStreamUrl.set(video.url);
      this.isLoading.set(false);
      this.isPlaying.set(true);
      return;
    }

    try {
      this.playerType.set('native');
      
      // Attempt to load related videos from cache first
      const cachedRelated = await this.dbService.getWithTTL('related_videos', video.id, 2 * 60 * 60 * 1000);
      if (cachedRelated) {
        this.relatedVideos.set(cachedRelated.streams || []);
        this.isLoadingRelated.set(false);
      }

      // ── Check local offline cache FIRST (bandwidth × 1 strategy) ──
      const cachedBlobUrl = await this.downloadService.getCachedBlobUrl(video.id);
      if (cachedBlobUrl) {
        this.rawStreamUrl.set(cachedBlobUrl);
        this.playerType.set('native');
        this.isLoading.set(false);
        this.isPlaying.set(true);
        // Still load related in background
        this.pipedService.getVideoDetails(video.id).then(details => {
          if (details?.relatedStreams) {
            this.relatedVideos.set(details.relatedStreams);
            this.dbService.setWithTTL('related_videos', { videoId: video.id, streams: details.relatedStreams });
          }
          this.isLoadingRelated.set(false);
        }).catch(() => this.isLoadingRelated.set(false));
        return;
      }

      const details = await this.pipedService.getVideoDetails(video.id);
      this.pipedDetails.set(details);
      
      // Update related videos and cache them if not cached or if we want to refresh
      if (details.relatedStreams) {
        this.relatedVideos.set(details.relatedStreams);
        this.isLoadingRelated.set(false);
        await this.dbService.setWithTTL('related_videos', { videoId: video.id, streams: details.relatedStreams });
      }
      
      // Prefer HLS stream, otherwise fallback to highest quality mp4 videoOnly + audio (which is hard in native video tag)
      // Usually Piped HLS is best for native web playback.
      if (details.hls) {
        this.rawStreamUrl.set(details.hls);
      } else {
        // Fallback to highest quality mp4 that includes both video and audio, or just first stream
        const combinedStream = details.videoStreams.find(s => !s.videoOnly && s.mimeType.includes('mp4'));
        if (combinedStream) {
          this.rawStreamUrl.set(combinedStream.url);
        } else {
          // If no combined stream, we might have to use IFrame as fallback since native video tag can't easily mux video+audio
          this.switchToIframe();
        }
      }
      this.isLoading.set(false);
      this.isPlaying.set(true);

      // ── Background download for offline caching (144p, bandwidth × 1) ──
      // Only start if Data Saver mode is enabled and not already cached/downloading
      if (this.wetubeService.algoConfig().dataSaverEnabled) {
        const dlStatus = this.downloadService.downloadStatuses()[video.id];
        if (!dlStatus || (dlStatus.status !== 'cached' && dlStatus.status !== 'downloading')) {
          this.downloadService.downloadVideo(
            video.id,
            video.title || '',
            video.author || '',
            video.thumbnail || '',
            '144p'
          ).catch(() => {}); // Silent - never block playback
        }
      }

    } catch (error) {
      console.warn('[VideoStateService] Piped failed, falling back to IFrame API');
      this.switchToIframe();
    }
  }

  private switchToIframe() {
    this.playerType.set('iframe');
    this.rawStreamUrl.set(null);
    this.isLoading.set(false);
    this.isPlaying.set(true);
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
  }
}
