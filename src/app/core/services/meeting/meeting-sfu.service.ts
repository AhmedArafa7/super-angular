import { Injectable, signal } from '@angular/core';
import { 
  Room, 
  RoomEvent, 
  Track, 
  RemoteParticipant, 
  RemoteTrackPublication, 
  RemoteTrack, 
  ConnectionState,
  LocalAudioTrack,
  LocalVideoTrack
} from 'livekit-client';
import { IMeetingEngine, RemoteStreamEvent } from './meeting-engine.interface';
import { MeetingMode } from './meeting.models';
import { P2pConnectionStatus } from './meeting-p2p.service';

export interface SfuTokenResponse {
  ok: boolean;
  token?: string;
  serverUrl?: string;
  isConfigured?: boolean;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MeetingSfuService implements IMeetingEngine {
  readonly mode: MeetingMode = 'sfu';
  readonly connectionStatus = signal<P2pConnectionStatus>('disconnected');
  readonly isLiveKitConfigured = signal<boolean>(true);
  readonly remoteStreams = signal<Map<string, MediaStream>>(new Map());

  get isConnected(): boolean {
    return this.connectionStatus() === 'connected';
  }

  private room: Room | null = null;
  private localStream: MediaStream | null = null;
  private currentRoomId: string | null = null;
  private currentParticipantId: string | null = null;

  /**
   * Fetches signed LiveKit access token from backend server
   */
  async requestToken(roomName: string, participantName: string, participantId: string): Promise<SfuTokenResponse> {
    try {
      const response = await fetch('/api/meeting/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName, participantName, participantId })
      });

      if (!response.ok) {
        throw new Error(`Token request failed with status: ${response.status}`);
      }

      const data: SfuTokenResponse = await response.json();
      return data;
    } catch (err: any) {
      console.warn('[MeetingSfuService] Failed to fetch LiveKit token from server:', err);
      return { ok: false, error: err.message || 'Token server unreachable' };
    }
  }

  /**
   * Initializes LiveKit SFU connection, publishes tracks ONCE, and listens for remote streams
   */
  async start(
    roomId: string,
    participantId: string,
    localStream: MediaStream | null,
    onRemoteStream: (event: RemoteStreamEvent) => void,
    onRemoteStreamRemoved?: (participantId: string) => void,
    participantName: string = 'Participant'
  ): Promise<void> {
    await this.stop();

    this.currentRoomId = roomId;
    this.currentParticipantId = participantId;
    this.localStream = localStream;
    this.connectionStatus.set('connecting');

    // 1. Acquire secure signed token from backend
    const tokenRes = await this.requestToken(roomId, participantName, participantId);
    if (!tokenRes.ok || !tokenRes.token || !tokenRes.serverUrl || tokenRes.isConfigured === false || tokenRes.serverUrl.includes('example.com')) {
      console.warn('[MeetingSfuService] LiveKit credentials not configured yet in environment (LIVEKIT_URL / API_KEY / API_SECRET).');
      this.isLiveKitConfigured.set(false);
      this.connectionStatus.set('connected'); // Graceful SFU standby state
      return;
    }

    this.isLiveKitConfigured.set(true);

    try {
      // 2. Instantiate LiveKit client Room with adaptive Dynacast (optimizes upload/download)
      this.room = new Room({
        adaptiveStream: true,
        dynacast: true
      });

      // 3. Setup event listeners
      this.setupRoomEvents(onRemoteStream, onRemoteStreamRemoved);

      // 4. Connect to SFU
      await this.room.connect(tokenRes.serverUrl, tokenRes.token);

      // 5. ONE UPSTREAM: Publish local audio & video tracks ONCE to the SFU
      if (this.localStream) {
        await this.publishExistingMediaStream(this.localStream);
      }

      this.connectionStatus.set('connected');
    } catch (err) {
      console.error('[MeetingSfuService] Error connecting to LiveKit room:', err);
      this.connectionStatus.set('failed');
    }
  }

  /**
   * Publishes or replaces local media tracks to LiveKit room
   */
  async publishLocalStream(stream: MediaStream): Promise<void> {
    this.localStream = stream;
    if (!this.room || this.room.state !== ConnectionState.Connected) return;
    await this.publishExistingMediaStream(stream);
  }

  /**
   * Publishes tracks from an existing MediaStream to avoid re-invoking getUserMedia
   */
  private async publishExistingMediaStream(stream: MediaStream): Promise<void> {
    if (!this.room) return;

    const audioTrack = stream.getAudioTracks()[0];
    const videoTrack = stream.getVideoTracks()[0];

    try {
      if (audioTrack) {
        const localAudio = new LocalAudioTrack(audioTrack);
        await this.room.localParticipant.publishTrack(localAudio);
      }
      if (videoTrack) {
        const localVideo = new LocalVideoTrack(videoTrack);
        await this.room.localParticipant.publishTrack(localVideo, {
          simulcast: true // Adaptive multi-tier publishing for subscribers
        });
      }
    } catch (e) {
      console.warn('[MeetingSfuService] Track publication error:', e);
    }
  }

  /**
   * Toggles camera track in SFU
   */
  async setCameraEnabled(enabled: boolean): Promise<void> {
    if (this.room && this.room.localParticipant) {
      await this.room.localParticipant.setCameraEnabled(enabled);
    }
  }

  /**
   * Toggles microphone track in SFU
   */
  async setMicrophoneEnabled(enabled: boolean): Promise<void> {
    if (this.room && this.room.localParticipant) {
      await this.room.localParticipant.setMicrophoneEnabled(enabled);
    }
  }

  /**
   * Sets up LiveKit event listeners
   */
  private setupRoomEvents(
    onRemoteStream: (event: RemoteStreamEvent) => void,
    onRemoteStreamRemoved?: (participantId: string) => void
  ): void {
    if (!this.room) return;

    // Track Subscribed (Receiving remote video/audio forwarded by the SFU)
    this.room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
      const pid = participant.identity;
      const mediaStream = new MediaStream([track.mediaStreamTrack]);
      
      const current = new Map(this.remoteStreams());
      current.set(pid, mediaStream);
      this.remoteStreams.set(current);

      onRemoteStream({
        participantId: pid,
        stream: mediaStream
      });
    });

    // Track Unsubscribed
    this.room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
      const pid = participant.identity;
      const current = new Map(this.remoteStreams());
      current.delete(pid);
      this.remoteStreams.set(current);

      if (onRemoteStreamRemoved) {
        onRemoteStreamRemoved(pid);
      }
    });

    // Participant Disconnected
    this.room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      const pid = participant.identity;
      const current = new Map(this.remoteStreams());
      current.delete(pid);
      this.remoteStreams.set(current);

      if (onRemoteStreamRemoved) {
        onRemoteStreamRemoved(pid);
      }
    });

    // Connection State change
    this.room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
      switch (state) {
        case ConnectionState.Connected:
          this.connectionStatus.set('connected');
          break;
        case ConnectionState.Connecting:
          this.connectionStatus.set('connecting');
          break;
        case ConnectionState.Reconnecting:
          this.connectionStatus.set('reconnecting');
          break;
        case ConnectionState.Disconnected:
          this.connectionStatus.set('disconnected');
          break;
      }
    });
  }

  /**
   * Disconnects and cleans up all LiveKit resources
   */
  async stop(): Promise<void> {
    if (this.room) {
      try {
        await this.room.disconnect();
      } catch (_) {}
      this.room = null;
    }

    this.remoteStreams.set(new Map());
    this.connectionStatus.set('disconnected');
    this.currentRoomId = null;
    this.currentParticipantId = null;
  }
}
