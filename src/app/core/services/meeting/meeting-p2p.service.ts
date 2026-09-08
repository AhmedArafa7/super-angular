import { Injectable, inject, signal } from '@angular/core';
import { FirebaseService } from '../firebase.service';
import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  onSnapshot, 
  deleteDoc, 
  getDocs, 
  serverTimestamp 
} from 'firebase/firestore';
import { IMeetingEngine, RemoteStreamEvent } from './meeting-engine.interface';
import { MeetingMode } from './meeting.models';

export type P2pConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';

export const RTC_ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' }
  ],
  iceCandidatePoolSize: 2
};

@Injectable({
  providedIn: 'root'
})
export class MeetingP2pService implements IMeetingEngine {
  private firebase = inject(FirebaseService);

  readonly mode: MeetingMode = 'p2p';
  readonly connectionStatus = signal<P2pConnectionStatus>('disconnected');
  readonly remoteStream = signal<MediaStream | null>(null);
  readonly iceConnectionState = signal<RTCIceConnectionState>('new');

  get isConnected(): boolean {
    return this.connectionStatus() === 'connected';
  }

  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private currentRoomId: string | null = null;
  private currentParticipantId: string | null = null;
  private isHostRole: boolean = false;

  private unsubs: (() => void)[] = [];
  private remoteCandidateQueue: RTCIceCandidateInit[] = [];
  private isRemoteDescriptionSet: boolean = false;

  // RTP Senders references for granular track manipulation
  private audioSender: RTCRtpSender | null = null;
  private videoSender: RTCRtpSender | null = null;

  /**
   * Initializes and starts 1-to-1 WebRTC P2P connection
   */
  async start(
    roomId: string,
    participantId: string,
    localStream: MediaStream | null,
    onRemoteStream: (event: RemoteStreamEvent) => void,
    onRemoteStreamRemoved?: (participantId: string) => void,
    isHost: boolean = false
  ): Promise<void> {
    await this.stop();

    this.currentRoomId = roomId;
    this.currentParticipantId = participantId;
    this.localStream = localStream;
    this.isHostRole = isHost;
    this.isRemoteDescriptionSet = false;
    this.remoteCandidateQueue = [];

    this.connectionStatus.set('connecting');

    // 1. Instantiate exactly ONE RTCPeerConnection
    this.peerConnection = new RTCPeerConnection(RTC_ICE_CONFIG);

    // 2. Attach local media tracks (Host -> Guest OR Guest -> Host, exactly 1 upstream per track)
    if (this.localStream) {
      this.attachLocalTracks(this.localStream);
    }

    // 3. ICE event handler: send local candidates to Firestore
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.currentRoomId) {
        this.sendIceCandidate(event.candidate.toJSON());
      }
    };

    // 4. Track event handler: receive remote stream
    this.peerConnection.ontrack = (event) => {
      const stream = event.streams[0] || new MediaStream([event.track]);
      this.remoteStream.set(stream);
      onRemoteStream({
        participantId: isHost ? 'guest' : 'host',
        stream
      });
    };

    // 5. Connection state monitor
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      switch (state) {
        case 'connected':
          this.connectionStatus.set('connected');
          break;
        case 'connecting':
          this.connectionStatus.set('connecting');
          break;
        case 'disconnected':
          this.connectionStatus.set('reconnecting');
          break;
        case 'failed':
          this.connectionStatus.set('failed');
          break;
        case 'closed':
          this.connectionStatus.set('disconnected');
          break;
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      if (this.peerConnection) {
        const ice = this.peerConnection.iceConnectionState;
        this.iceConnectionState.set(ice);
        if (ice === 'failed') {
          this.connectionStatus.set('failed');
        } else if (ice === 'disconnected') {
          this.connectionStatus.set('reconnecting');
        } else if (ice === 'connected' || ice === 'completed') {
          this.connectionStatus.set('connected');
        }
      }
    };

    // 6. Begin Role-specific Signaling via Firestore
    if (this.isHostRole) {
      await this.initiateHostFlow();
    } else {
      await this.initiateGuestFlow();
    }
  }

  /**
   * Attaches local tracks to the PeerConnection
   */
  private attachLocalTracks(stream: MediaStream): void {
    if (!this.peerConnection) return;

    stream.getTracks().forEach(track => {
      try {
        const sender = this.peerConnection!.addTrack(track, stream);
        if (track.kind === 'audio') this.audioSender = sender;
        if (track.kind === 'video') this.videoSender = sender;
      } catch (e) {
        console.warn('[MeetingP2pService] Failed adding track to RTCPeerConnection:', e);
      }
    });
  }

  /**
   * Publishes or replaces local media stream tracks seamlessly
   */
  async publishLocalStream(stream: MediaStream): Promise<void> {
    this.localStream = stream;
    if (!this.peerConnection) return;

    const audioTrack = stream.getAudioTracks()[0] || null;
    const videoTrack = stream.getVideoTracks()[0] || null;

    if (this.audioSender && audioTrack) {
      await this.audioSender.replaceTrack(audioTrack);
    }
    if (this.videoSender && videoTrack) {
      await this.videoSender.replaceTrack(videoTrack);
    }
  }

  /**
   * HOST FLOW: Creates Offer -> writes to Firestore -> listens for Answer
   */
  private async initiateHostFlow(): Promise<void> {
    if (!this.peerConnection || !this.currentRoomId) return;

    const sessionDocRef = doc(this.firebase.firestore, 'meeting_rooms', this.currentRoomId, 'signaling', 'p2p_session');

    try {
      // 1. Create Offer
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await this.peerConnection.setLocalDescription(offer);

      // 2. Write Offer to Firestore
      await setDoc(sessionDocRef, {
        offer: {
          type: offer.type,
          sdp: offer.sdp
        },
        hostId: this.currentParticipantId,
        createdAt: Date.now()
      });

      // 3. Listen for Guest's Answer in p2p_session
      const unsubAnswer = onSnapshot(sessionDocRef, async (snapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.data();

        if (data && data['answer'] && this.peerConnection && this.peerConnection.signalingState === 'have-local-offer') {
          try {
            const answerDesc = new RTCSessionDescription(data['answer']);
            await this.peerConnection.setRemoteDescription(answerDesc);
            this.isRemoteDescriptionSet = true;
            await this.drainCandidateQueue();
          } catch (err) {
            console.error('[MeetingP2pService] Failed setting remote answer:', err);
          }
        }
      });
      this.unsubs.push(unsubAnswer);

      // 4. Listen for Guest's ICE candidates
      this.listenToRemoteIceCandidates('signaling_guest_candidates');
    } catch (e) {
      console.error('[MeetingP2pService] Host flow initiation failed:', e);
      this.connectionStatus.set('failed');
    }
  }

  /**
   * GUEST FLOW: Listens for Offer -> sets Remote Description -> creates Answer -> writes to Firestore
   */
  private async initiateGuestFlow(): Promise<void> {
    if (!this.peerConnection || !this.currentRoomId) return;

    const sessionDocRef = doc(this.firebase.firestore, 'meeting_rooms', this.currentRoomId, 'signaling', 'p2p_session');

    // 1. Listen for Host's Offer
    const unsubOffer = onSnapshot(sessionDocRef, async (snapshot) => {
      if (!snapshot.exists() || !this.peerConnection) return;
      const data = snapshot.data();

      if (data && data['offer'] && !this.isRemoteDescriptionSet) {
        try {
          const offerDesc = new RTCSessionDescription(data['offer']);
          await this.peerConnection.setRemoteDescription(offerDesc);
          this.isRemoteDescriptionSet = true;
          await this.drainCandidateQueue();

          // 2. Create and set Answer
          const answer = await this.peerConnection.createAnswer();
          await this.peerConnection.setLocalDescription(answer);

          // 3. Write Answer back to Firestore
          await setDoc(sessionDocRef, {
            answer: {
              type: answer.type,
              sdp: answer.sdp
            },
            guestId: this.currentParticipantId,
            answeredAt: Date.now()
          }, { merge: true });
        } catch (err) {
          console.error('[MeetingP2pService] Guest failed handling offer/answer:', err);
        }
      }
    });
    this.unsubs.push(unsubOffer);

    // 4. Listen for Host's ICE candidates
    this.listenToRemoteIceCandidates('signaling_host_candidates');
  }

  /**
   * Sends local ICE candidate to Firestore subcollection
   */
  private async sendIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.currentRoomId) return;
    const collName = this.isHostRole ? 'signaling_host_candidates' : 'signaling_guest_candidates';
    const candidatesRef = collection(this.firebase.firestore, 'meeting_rooms', this.currentRoomId, collName);
    try {
      await addDoc(candidatesRef, {
        candidate,
        fromId: this.currentParticipantId,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.warn('[MeetingP2pService] Failed writing ICE candidate:', e);
    }
  }

  /**
   * Listens for remote ICE candidates from Firestore
   */
  private listenToRemoteIceCandidates(subcollectionName: string): void {
    if (!this.currentRoomId) return;
    const candidatesRef = collection(this.firebase.firestore, 'meeting_rooms', this.currentRoomId, subcollectionName);

    const unsub = onSnapshot(candidatesRef, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          if (data && data['candidate']) {
            const candidateInit: RTCIceCandidateInit = data['candidate'];
            if (this.peerConnection && this.isRemoteDescriptionSet) {
              try {
                await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidateInit));
              } catch (e) {
                console.warn('[MeetingP2pService] Error adding ICE candidate:', e);
              }
            } else {
              // Buffer candidate until remote description is set
              this.remoteCandidateQueue.push(candidateInit);
            }
          }
        }
      });
    });

    this.unsubs.push(unsub);
  }

  /**
   * Drains any ICE candidates received before remote description was ready
   */
  private async drainCandidateQueue(): Promise<void> {
    if (!this.peerConnection || !this.isRemoteDescriptionSet) return;
    while (this.remoteCandidateQueue.length > 0) {
      const candidateInit = this.remoteCandidateQueue.shift();
      if (candidateInit) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidateInit));
        } catch (e) {
          console.warn('[MeetingP2pService] Error adding buffered ICE candidate:', e);
        }
      }
    }
  }

  /**
   * Completely closes connection, cancels listeners, and resets state
   */
  async stop(): Promise<void> {
    this.unsubs.forEach(unsub => {
      try { unsub(); } catch (_) {}
    });
    this.unsubs = [];

    if (this.peerConnection) {
      this.peerConnection.onicecandidate = null;
      this.peerConnection.ontrack = null;
      this.peerConnection.onconnectionstatechange = null;
      this.peerConnection.oniceconnectionstatechange = null;

      try {
        this.peerConnection.close();
      } catch (_) {}
      this.peerConnection = null;
    }

    this.remoteStream.set(null);
    this.connectionStatus.set('disconnected');
    this.iceConnectionState.set('new');
    this.isRemoteDescriptionSet = false;
    this.remoteCandidateQueue = [];
    this.audioSender = null;
    this.videoSender = null;
    this.currentRoomId = null;
    this.currentParticipantId = null;
  }
}
