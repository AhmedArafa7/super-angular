import { Injectable, inject } from '@angular/core';
import { FirebaseService } from '../firebase.service';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  serverTimestamp, 
  writeBatch 
} from 'firebase/firestore';
import { MeetingRoom, MeetingParticipant, MeetingMode } from './meeting.models';

@Injectable({
  providedIn: 'root'
})
export class MeetingRoomService {
  private firebase = inject(FirebaseService);

  /**
   * Generates a human-friendly unique room code (e.g. NEURO-7492)
   */
  generateRoomCode(): string {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `NEURO-${code}`;
  }

  /**
   * Creates a new meeting room in Firestore
   */
  async createRoom(hostId: string, hostName: string, requestedCode?: string): Promise<MeetingRoom> {
    const roomCode = (requestedCode ? requestedCode.trim().toUpperCase() : this.generateRoomCode()).replace(/[^A-Z0-9-]/g, '');
    const roomRef = doc(this.firebase.firestore, 'meeting_rooms', roomCode);

    const roomData: MeetingRoom = {
      roomId: roomCode,
      roomCode: roomCode,
      hostId,
      hostName,
      mode: 'p2p', // Starts with P2P for 2 participants
      status: 'active',
      createdAt: Date.now(),
      participantsCount: 1
    };

    await setDoc(roomRef, {
      ...roomData,
      updatedAt: serverTimestamp()
    });

    return roomData;
  }

  /**
   * Retrieves room data once
   */
  async getRoom(roomCode: string): Promise<MeetingRoom | null> {
    const cleanCode = roomCode.trim().toUpperCase();
    const roomRef = doc(this.firebase.firestore, 'meeting_rooms', cleanCode);
    const snap = await getDoc(roomRef);
    if (!snap.exists()) return null;
    return snap.data() as MeetingRoom;
  }

  /**
   * Adds or updates a participant in the room's presence subcollection
   */
  async joinRoom(roomCode: string, participant: MeetingParticipant): Promise<boolean> {
    const cleanCode = roomCode.trim().toUpperCase();
    const roomRef = doc(this.firebase.firestore, 'meeting_rooms', cleanCode);
    const roomSnap = await getDoc(roomRef);

    if (!roomSnap.exists()) {
      return false;
    }

    const roomData = roomSnap.data() as MeetingRoom;
    if (roomData.status === 'ended') {
      return false;
    }

    const participantRef = doc(this.firebase.firestore, 'meeting_rooms', cleanCode, 'participants', participant.id);
    await setDoc(participantRef, {
      ...participant,
      lastPing: Date.now()
    }, { merge: true });

    return true;
  }

  /**
   * Real-time listener for Room status and mode
   */
  listenToRoom(roomCode: string, callback: (room: MeetingRoom | null) => void): () => void {
    const cleanCode = roomCode.trim().toUpperCase();
    const roomRef = doc(this.firebase.firestore, 'meeting_rooms', cleanCode);

    return onSnapshot(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as MeetingRoom);
      } else {
        callback(null);
      }
    }, (error) => {
      console.warn('[MeetingRoomService] Room listener error:', error);
      callback(null);
    });
  }

  /**
   * Real-time listener for Participants in the room
   */
  listenToParticipants(roomCode: string, callback: (participants: MeetingParticipant[]) => void): () => void {
    const cleanCode = roomCode.trim().toUpperCase();
    const participantsRef = collection(this.firebase.firestore, 'meeting_rooms', cleanCode, 'participants');

    return onSnapshot(participantsRef, (snapshot) => {
      const participants: MeetingParticipant[] = [];
      snapshot.forEach(docSnap => {
        participants.push(docSnap.data() as MeetingParticipant);
      });
      // Sort: Host first, then by joinedAt
      participants.sort((a, b) => {
        if (a.role === 'host') return -1;
        if (b.role === 'host') return 1;
        return a.joinedAt - b.joinedAt;
      });
      callback(participants);
    }, (error) => {
      console.warn('[MeetingRoomService] Participants listener error:', error);
      callback([]);
    });
  }

  /**
   * Updates participant audio/video/screen state in real-time
   */
  async updateParticipantState(roomCode: string, participantId: string, updates: Partial<MeetingParticipant>): Promise<void> {
    const cleanCode = roomCode.trim().toUpperCase();
    const participantRef = doc(this.firebase.firestore, 'meeting_rooms', cleanCode, 'participants', participantId);
    try {
      await updateDoc(participantRef, {
        ...updates,
        lastPing: Date.now()
      });
    } catch (e) {
      console.warn('[MeetingRoomService] Failed to update participant state:', e);
    }
  }

  /**
   * Updates Room Mode in Firestore (e.g. from 'p2p' to 'sfu')
   */
  async updateRoomMode(roomCode: string, mode: MeetingMode): Promise<void> {
    const cleanCode = roomCode.trim().toUpperCase();
    const roomRef = doc(this.firebase.firestore, 'meeting_rooms', cleanCode);
    try {
      await updateDoc(roomRef, {
        mode,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.warn('[MeetingRoomService] Failed to update room mode:', e);
    }
  }

  /**
   * Authoritative transition from P2P to SFU mode in Firestore
   */
  async transitionToSfu(roomCode: string, initiatedBy: string): Promise<void> {
    const cleanCode = roomCode.trim().toUpperCase();
    const roomRef = doc(this.firebase.firestore, 'meeting_rooms', cleanCode);
    try {
      await updateDoc(roomRef, {
        mode: 'sfu',
        migration: {
          state: 'completed',
          initiatedBy,
          migratedAt: Date.now()
        },
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.warn('[MeetingRoomService] Failed to transition to SFU:', e);
    }
  }

  /**
   * Leaves room and cleans up participant presence
   */
  async leaveRoom(roomCode: string, participantId: string, isHost: boolean, remainingCount: number): Promise<void> {
    const cleanCode = roomCode.trim().toUpperCase();
    const participantRef = doc(this.firebase.firestore, 'meeting_rooms', cleanCode, 'participants', participantId);
    const roomRef = doc(this.firebase.firestore, 'meeting_rooms', cleanCode);

    try {
      await deleteDoc(participantRef);

      if (remainingCount <= 1 && isHost) {
        // Close room if host leaves and no one is left
        await updateDoc(roomRef, {
          status: 'ended',
          participantsCount: 0,
          updatedAt: serverTimestamp()
        });
      } else {
        await updateDoc(roomRef, {
          participantsCount: Math.max(0, remainingCount - 1),
          updatedAt: serverTimestamp()
        });
      }
    } catch (e) {
      console.warn('[MeetingRoomService] Failed on leaveRoom cleanup:', e);
    }
  }
}
