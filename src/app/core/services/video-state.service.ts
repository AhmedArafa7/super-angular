import { Injectable, signal, inject } from '@angular/core';
import { PipedApiService, PipedVideoDetails } from './piped-api.service';

export type PlayerMode = 'hidden' | 'floating' | 'full' | 'pip';
export type PlayerType = 'native' | 'iframe';

export interface ActiveVideo {
  id: string;
  title: string;
  author: string;
  thumbnail: string;
}

@Injectable({
  providedIn: 'root'
})
export class VideoStateService {
  private pipedService = inject(PipedApiService);

  // Player UI State
  readonly playerMode = signal<PlayerMode>('hidden');
  readonly playerType = signal<PlayerType>('native');
  readonly ambientColor = signal<string>('transparent');
  
  // Video Content State
  readonly activeVideo = signal<ActiveVideo | null>(null);
  readonly pipedDetails = signal<PipedVideoDetails | null>(null);
  readonly rawStreamUrl = signal<string | null>(null);
  
  // Playback State
  readonly isPlaying = signal<boolean>(false);
  readonly currentTime = signal<number>(0);
  readonly duration = signal<number>(0);
  readonly isMuted = signal<boolean>(false);
  readonly volume = signal<number>(1);
  readonly isLoading = signal<boolean>(false);

  // Position for seamless Full <-> Floating transition
  readonly playerRect = signal<DOMRect | null>(null);

  // Shorts State Coordination
  readonly isShortsMuted = signal<boolean>(true); // All shorts start muted per policies

  // Commands
  readonly seekCommand = signal<number | null>(null);

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
    this.pipedDetails.set(null);
    this.rawStreamUrl.set(null);

    if (forceIframe) {
      this.switchToIframe();
      return;
    }

    try {
      this.playerType.set('native');
      const details = await this.pipedService.getVideoDetails(video.id);
      this.pipedDetails.set(details);
      
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
