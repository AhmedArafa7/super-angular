import { MeetingMode } from './meeting.models';

export interface RemoteStreamEvent {
  participantId: string;
  stream: MediaStream;
}

export interface IMeetingEngine {
  readonly mode: MeetingMode;
  readonly isConnected: boolean;

  /**
   * Initializes and connects the engine
   */
  start(
    roomId: string,
    participantId: string,
    localStream: MediaStream | null,
    onRemoteStream: (event: RemoteStreamEvent) => void,
    onRemoteStreamRemoved?: (participantId: string) => void
  ): Promise<void>;

  /**
   * Publishes or replaces local media tracks
   */
  publishLocalStream(stream: MediaStream): Promise<void>;

  /**
   * Disconnects and releases any media/network resources
   */
  stop(): Promise<void>;
}
