import { Injectable, inject, NgZone, signal } from '@angular/core';
import { FirebaseService } from './firebase.service';
import { doc, setDoc, onSnapshot, collection, addDoc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'failed';

@Injectable({
  providedIn: 'root'
})
export class MultiplayerService {
  private firebaseService = inject(FirebaseService);
  private ngZone = inject(NgZone);

  // Star Topology: Host can have multiple peers. Guest has 1 peer (the host).
  public isHost = false;
  private peerConnections = new Map<string, RTCPeerConnection>();
  private dataChannels = new Map<string, RTCDataChannel>();
  private currentRoomCode: string | null = null;
  private guestId: string | null = null; // Used if we are a guest

  private unsubscribes: (() => void)[] = [];

  // Reactive State
  readonly connectionState = signal<ConnectionState>('disconnected');
  readonly onMessageReceived = signal<any | null>(null);

  private readonly rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  /**
   * Cleans up all connections and listeners.
   */
  disconnect() {
    this.unsubscribes.forEach(unsub => unsub());
    this.unsubscribes = [];
    
    this.dataChannels.forEach(channel => channel.close());
    this.dataChannels.clear();

    this.peerConnections.forEach(pc => {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.close();
    });
    this.peerConnections.clear();

    this.currentRoomCode = null;
    this.guestId = null;
    this.isHost = false;
    this.ngZone.run(() => this.connectionState.set('disconnected'));
  }

  /**
   * Generates a random ID for guests
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2, 9);
  }

  /**
   * Sends a message to peers.
   * If Host: Broadcasts to ALL guests (unless a specific target is provided in future).
   * If Guest: Sends to Host.
   */
  sendMessage(message: any) {
    const dataStr = typeof message === 'string' ? message : JSON.stringify(message);
    
    // Inject sender info if needed
    let payload = message;
    if (typeof message === 'object') {
      payload = { ...message, _sender: this.isHost ? 'host' : this.guestId };
    }
    const finalDataStr = typeof payload === 'string' ? payload : JSON.stringify(payload);

    this.dataChannels.forEach(channel => {
      if (channel.readyState === 'open') {
        channel.send(finalDataStr);
      }
    });
  }

  private setupDataChannel(channel: RTCDataChannel, peerId: string) {
    channel.onmessage = (event) => {
      this.ngZone.run(() => {
        try {
          const data = JSON.parse(event.data);
          this.onMessageReceived.set(data);
          
          // If we are Host, we act as a relay (Star Topology). 
          // We broadcast the message to all OTHER guests so everyone is in sync.
          if (this.isHost && data.type !== 'PRIVATE') {
            this.dataChannels.forEach((ch, id) => {
              if (id !== peerId && ch.readyState === 'open') {
                ch.send(event.data);
              }
            });
          }
        } catch {
          this.onMessageReceived.set(event.data);
        }
      });
    };
    channel.onopen = () => {
      this.ngZone.run(() => this.connectionState.set('connected'));
    };
    channel.onclose = () => {
      if (!this.isHost) {
        this.ngZone.run(() => this.connectionState.set('disconnected'));
      }
      this.dataChannels.delete(peerId);
      this.peerConnections.delete(peerId);
    };
  }

  // ==========================================
  // HOST LOGIC
  // ==========================================
  async createRoom(): Promise<string> {
    this.disconnect();
    this.isHost = true;
    this.ngZone.run(() => this.connectionState.set('connecting'));

    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.currentRoomCode = roomCode;
    const roomRef = doc(this.firebaseService.db, 'rooms', roomCode);

    // Create root room doc
    await setDoc(roomRef, { createdAt: Date.now(), hostId: 'host' });

    // Host listens for new guests joining
    const guestsCol = collection(roomRef, 'guests');
    const unsubGuests = onSnapshot(guestsCol, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const guestId = change.doc.id;
          const guestData = change.doc.data();
          
          if (guestData['offer'] && !this.peerConnections.has(guestId)) {
            await this.handleNewGuest(roomCode, guestId, guestData['offer']);
          }
        }
      });
    });
    this.unsubscribes.push(unsubGuests);

    return roomCode;
  }

  private async handleNewGuest(roomCode: string, guestId: string, offer: any) {
    const pc = new RTCPeerConnection(this.rtcConfig);
    this.peerConnections.set(guestId, pc);

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'connected') {
        this.ngZone.run(() => this.connectionState.set('connected'));
      }
    };

    // Host receives datachannel from guest
    pc.ondatachannel = (event) => {
      this.dataChannels.set(guestId, event.channel);
      this.setupDataChannel(event.channel, guestId);
    };

    // Host sends ICE candidates to guest
    const hostCandidatesCol = collection(this.firebaseService.db, `rooms/${roomCode}/guests/${guestId}/hostCandidates`);
    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        await addDoc(hostCandidatesCol, event.candidate.toJSON());
      }
    };

    // Process Offer and create Answer
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    // Write Answer back to Guest's document
    const guestDocRef = doc(this.firebaseService.db, `rooms/${roomCode}/guests/${guestId}`);
    await updateDoc(guestDocRef, {
      answer: { type: answer.type, sdp: answer.sdp }
    });

    // Listen for Guest's ICE candidates
    const guestCandidatesCol = collection(this.firebaseService.db, `rooms/${roomCode}/guests/${guestId}/candidates`);
    const unsubICE = onSnapshot(guestCandidatesCol, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const candidate = new RTCIceCandidate(change.doc.data());
          pc.addIceCandidate(candidate).catch(e => console.error(e));
        }
      });
    });
    this.unsubscribes.push(unsubICE);
  }


  // ==========================================
  // GUEST LOGIC
  // ==========================================
  async joinRoom(roomCode: string): Promise<boolean> {
    this.disconnect();
    this.isHost = false;
    this.guestId = this.generateId();
    this.ngZone.run(() => this.connectionState.set('connecting'));
    this.currentRoomCode = roomCode;

    const roomRef = doc(this.firebaseService.db, 'rooms', roomCode);
    const roomSnap = await getDoc(roomRef);
    if (!roomSnap.exists()) {
      this.ngZone.run(() => this.connectionState.set('failed'));
      return false;
    }

    const pc = new RTCPeerConnection(this.rtcConfig);
    this.peerConnections.set('host', pc);

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'connected') {
        this.ngZone.run(() => this.connectionState.set('connected'));
      } else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        this.ngZone.run(() => this.connectionState.set('disconnected'));
      }
    };

    // Guest creates data channel
    const dc = pc.createDataChannel('gameData', { ordered: false });
    this.dataChannels.set('host', dc);
    this.setupDataChannel(dc, 'host');

    const guestDocRef = doc(this.firebaseService.db, `rooms/${roomCode}/guests/${this.guestId}`);
    const guestCandidatesCol = collection(guestDocRef, 'candidates');

    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        await addDoc(guestCandidatesCol, event.candidate.toJSON());
      }
    };

    // Create Offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await setDoc(guestDocRef, {
      offer: { type: offer.type, sdp: offer.sdp },
      joinedAt: Date.now()
    });

    // Listen for Host Answer
    const unsubRoom = onSnapshot(guestDocRef, async (snapshot) => {
      const data = snapshot.data();
      if (!pc.currentRemoteDescription && data?.['answer']) {
        const answer = new RTCSessionDescription(data['answer']);
        await pc.setRemoteDescription(answer);
      }
    });
    this.unsubscribes.push(unsubRoom);

    // Listen for Host ICE Candidates
    const hostCandidatesCol = collection(guestDocRef, 'hostCandidates');
    const unsubICE = onSnapshot(hostCandidatesCol, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const candidate = new RTCIceCandidate(change.doc.data());
          pc.addIceCandidate(candidate).catch(e => console.error(e));
        }
      });
    });
    this.unsubscribes.push(unsubICE);

    return true;
  }
}
