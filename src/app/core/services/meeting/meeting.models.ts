export type MeetingMode = 'p2p' | 'sfu' | 'sfu-required';

export type ParticipantRole = 'host' | 'guest';

export interface MeetingParticipant {
  id: string;
  name: string;
  avatarUrl?: string;
  role: ParticipantRole;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  joinedAt: number;
  lastPing?: number;
}

export interface MeetingRoom {
  roomId: string;
  roomCode: string;
  hostId: string;
  hostName: string;
  mode: MeetingMode;
  status: 'active' | 'ended';
  createdAt: number;
  participantsCount: number;
}
