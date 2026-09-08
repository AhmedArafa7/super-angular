import { Injectable, inject, signal, computed, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { FirebaseService } from '../firebase.service';
import { ToastService } from '../toast.service';
import { MeetingRoomService } from './meeting-room.service';
import { MeetingMediaService } from './meeting-media.service';
import { MeetingP2pService } from './meeting-p2p.service';
import { MeetingSfuService } from './meeting-sfu.service';
import { MeetingRoom, MeetingParticipant, MeetingMode } from './meeting.models';

@Injectable({
  providedIn: 'root'
})
export class MeetingService implements OnDestroy {
  private router = inject(Router);
  private firebase = inject(FirebaseService);
  private roomService = inject(MeetingRoomService);
  private toast = inject(ToastService);
  readonly media = inject(MeetingMediaService);
  readonly p2p = inject(MeetingP2pService);
  readonly sfu = inject(MeetingSfuService);

  // Core Meeting Signals
  readonly currentRoom = signal<MeetingRoom | null>(null);
  readonly participants = signal<MeetingParticipant[]>([]);
  readonly isLobby = signal<boolean>(true);
  readonly isInMeeting = signal<boolean>(false);
  readonly isConnecting = signal<boolean>(false);
  readonly isMigrating = signal<boolean>(false);
  readonly localParticipant = signal<MeetingParticipant | null>(null);

  // Active meeting mode ('p2p' or 'sfu')
  readonly activeMeetingMode = computed<MeetingMode>(() => {
    return this.currentRoom()?.mode || 'p2p';
  });

  // Participant count
  readonly participantsCount = computed<number>(() => {
    return this.participants().length;
  });

  // Active cleanup subscriptions
  private unsubscribeRoom: (() => void) | null = null;
  private unsubscribeParticipants: (() => void) | null = null;

  ngOnDestroy(): void {
    this.leaveMeeting();
  }

  /**
   * Generates or retrieves a unique endpoint session ID for this browser tab context
   */
  getSessionParticipantId(): string {
    if (typeof window === 'undefined') return 'peer_endpoint';
    let sid = sessionStorage.getItem('super_meet_endpoint_id');
    if (!sid) {
      const baseUid = this.firebase.getUserId() || 'guest';
      const rand = Math.random().toString(36).slice(2, 8);
      sid = `${baseUid.slice(0, 10)}_${rand}`;
      sessionStorage.setItem('super_meet_endpoint_id', sid);
    }
    return sid;
  }

  /**
   * Generates a unique room and navigates to its Lobby
   */
  async createMeeting(customCode?: string): Promise<string> {
    const endpointId = this.getSessionParticipantId();
    const userName = this.firebase.userData()?.displayName || this.firebase.userData()?.name || 'المستضيف';

    this.isConnecting.set(true);
    try {
      const room = await this.roomService.createRoom(endpointId, userName, customCode);
      this.currentRoom.set(room);
      this.router.navigate(['/meeting', room.roomCode]);
      return room.roomCode;
    } catch (e: any) {
      this.toast.show('تعذر إنشاء غرفة الاجتماع، يرجى المحاولة مرة أخرى.', 'error');
      throw e;
    } finally {
      this.isConnecting.set(false);
    }
  }

  /**
   * Initializes Lobby for a given room code
   */
  async enterLobby(roomCode: string): Promise<boolean> {
    this.cleanupListeners();
    this.isConnecting.set(true);
    this.isLobby.set(true);
    this.isInMeeting.set(false);

    try {
      const room = await this.roomService.getRoom(roomCode);
      if (!room) {
        this.toast.show('غرفة الاجتماع غير موجودة أو انتهت صلاحيتها.', 'error');
        this.isConnecting.set(false);
        return false;
      }

      this.currentRoom.set(room);

      // Listen to room updates
      this.unsubscribeRoom = this.roomService.listenToRoom(roomCode, async (updatedRoom) => {
        if (!updatedRoom || updatedRoom.status === 'ended') {
          if (this.isInMeeting()) {
            this.toast.show('تم إنهاء الاجتماع بواسطة المستضيف.', 'warning');
            this.leaveMeeting();
          }
          this.currentRoom.set(null);
          return;
        }

        const prevMode = this.currentRoom()?.mode;
        this.currentRoom.set(updatedRoom);

        // STEP 6 & 7: Check if authoritative mode changed from 'p2p' to 'sfu'
        if (updatedRoom.mode === 'sfu' && prevMode === 'p2p' && this.isInMeeting()) {
          await this.executeSfuMigration();
        }
      });

      // Listen to participants
      this.unsubscribeParticipants = this.roomService.listenToParticipants(roomCode, async (parts) => {
        this.participants.set(parts);

        if (!this.isInMeeting()) return;

        const currentMode = this.activeMeetingMode();

        // 1. In P2P mode:
        if (currentMode === 'p2p') {
          if (parts.length === 2 && this.p2p.connectionStatus() === 'disconnected') {
            await this.startP2pCall();
          } else if (parts.length < 2 && this.p2p.isConnected) {
            await this.p2p.stop();
          } else if (parts.length >= 3) {
            // STEP 7: Prevent Race Condition. Authoritative coordinator (Host) triggers SFU transition
            const isCoordinator = this.localParticipant()?.role === 'host' || 
                                 (parts.length > 0 && parts[0].id === this.localParticipant()?.id);

            if (isCoordinator && this.currentRoom()?.mode === 'p2p') {
              console.log('[MeetingService] 3rd participant detected! Initiating authoritative SFU transition in Firestore...');
              await this.roomService.transitionToSfu(roomCode, this.localParticipant()!.id);
            }
          }
        } 
        // 2. In SFU mode:
        else if (currentMode === 'sfu') {
          // STEP 13: DO NOT switch SFU -> P2P when dropping to 2. Remain on SFU for stability!
          if (!this.sfu.isConnected && this.sfu.connectionStatus() === 'disconnected' && !this.isMigrating()) {
            await this.connectSfuEngine();
          }
        }
      });

      // Start local camera/mic preview for Lobby
      await this.media.startPreview(this.media.isCameraOn(), this.media.isMicOn());

      return true;
    } catch (e) {
      console.error('[MeetingService] Failed to enter lobby:', e);
      this.toast.show('حدث خطأ أثناء تحميل بيانات الغرفة.', 'error');
      return false;
    } finally {
      this.isConnecting.set(false);
    }
  }

  /**
   * Enters the actual meeting room from the Lobby
   */
  async joinMeeting(displayName: string): Promise<boolean> {
    const room = this.currentRoom();
    if (!room) {
      this.toast.show('لا توجد غرفة نشطة للانضمام إليها.', 'error');
      return false;
    }

    const endpointId = this.getSessionParticipantId();
    const isHost = room.hostId === endpointId;
    const name = displayName.trim() || this.firebase.userData()?.displayName || (isHost ? 'المستضيف' : 'مشارك');

    const participant: MeetingParticipant = {
      id: endpointId,
      name,
      avatarUrl: this.firebase.userData()?.photoURL || `https://picsum.photos/seed/${endpointId}/100/100`,
      role: isHost ? 'host' : 'guest',
      isAudioEnabled: this.media.isMicOn(),
      isVideoEnabled: this.media.isCameraOn(),
      isScreenSharing: false,
      joinedAt: Date.now()
    };

    this.isConnecting.set(true);
    try {
      const ok = await this.roomService.joinRoom(room.roomCode, participant);
      if (!ok) {
        this.toast.show('تعذر الانضمام للغرفة.', 'error');
        return false;
      }

      this.localParticipant.set(participant);
      this.isLobby.set(false);
      this.isInMeeting.set(true);

      this.toast.show(`مرحباً بك في الاجتماع (${room.roomCode})`, 'success');

      // Decide which engine to start:
      const currentMode = this.activeMeetingMode();
      if (currentMode === 'sfu' || this.participants().length >= 3) {
        await this.connectSfuEngine();
      } else if (this.participants().length === 2 && currentMode === 'p2p') {
        await this.startP2pCall();
      }

      return true;
    } catch (e) {
      console.error('[MeetingService] Join error:', e);
      this.toast.show('فشل الانضمام للاجتماع.', 'error');
      return false;
    } finally {
      this.isConnecting.set(false);
    }
  }

  /**
   * Starts Native WebRTC P2P connection between Host and Guest (Exactly 1 Upstream per user)
   */
  async startP2pCall(): Promise<void> {
    const room = this.currentRoom();
    const local = this.localParticipant();
    if (!room || !local) return;

    const isHost = local.role === 'host';
    const localStream = this.media.localStream();

    console.log(`[MeetingService] Starting 1-to-1 P2P connection (isHost: ${isHost}) for room: ${room.roomCode}`);

    await this.p2p.start(
      room.roomCode,
      local.id,
      localStream,
      (event) => {
        console.log('[MeetingService] Remote P2P stream established successfully');
      },
      (participantId) => {
        console.log('[MeetingService] Remote P2P stream closed');
      },
      isHost
    );
  }

  /**
   * Connects to LiveKit SFU engine (1 Upstream to SFU, SFU forwards to participants)
   */
  async connectSfuEngine(): Promise<void> {
    const room = this.currentRoom();
    const local = this.localParticipant();
    if (!room || !local) return;

    const localStream = this.media.localStream();
    console.log(`[MeetingService] Connecting to LiveKit SFU for room: ${room.roomCode}`);

    await this.sfu.start(
      room.roomCode,
      local.id,
      localStream,
      (event) => {
        console.log('[MeetingService] SFU remote stream track received from:', event.participantId);
      },
      (participantId) => {
        console.log('[MeetingService] SFU remote stream track removed:', participantId);
      },
      local.name
    );
  }

  /**
   * STEP 6: Seamless P2P -> SFU Migration with minimal media disruption
   */
  async executeSfuMigration(): Promise<void> {
    if (this.isMigrating()) return;
    this.isMigrating.set(true);

    this.toast.show('انضم 3 مشاركين! جاري التبديل لمحرك LiveKit SFU (1 Upstream)...', 'info', 4000);

    try {
      // 1. Connect to SFU in parallel while P2P is still active
      await this.connectSfuEngine();

      // 2. Short window: once SFU connection is active, immediately tear down old P2P
      await this.p2p.stop();

      this.toast.show('تم التحويل بنجاح إلى وضع LiveKit SFU المركزي (One Upstream Active)', 'success', 3000);
    } catch (err) {
      console.error('[MeetingService] Migration to SFU failed:', err);
    } finally {
      this.isMigrating.set(false);
    }
  }

  /**
   * Toggles Camera and syncs state to active engine & Firestore
   */
  async toggleCamera(): Promise<void> {
    const newState = this.media.toggleCamera();
    const room = this.currentRoom();
    const local = this.localParticipant();

    if (this.activeMeetingMode() === 'sfu') {
      await this.sfu.setCameraEnabled(newState);
    }

    if (room && local) {
      await this.roomService.updateParticipantState(room.roomCode, local.id, { isVideoEnabled: newState });
    }
  }

  /**
   * Toggles Microphone and syncs state to active engine & Firestore
   */
  async toggleMic(): Promise<void> {
    const newState = this.media.toggleMic();
    const room = this.currentRoom();
    const local = this.localParticipant();

    if (this.activeMeetingMode() === 'sfu') {
      await this.sfu.setMicrophoneEnabled(newState);
    }

    if (room && local) {
      await this.roomService.updateParticipantState(room.roomCode, local.id, { isAudioEnabled: newState });
    }
  }

  /**
   * Formats the direct sharable invitation link
   */
  getInvitationLink(): string {
    const room = this.currentRoom();
    if (!room) return '';
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/meeting/${room.roomCode}`;
  }

  /**
   * Copies invitation link to clipboard with toast notification
   */
  async copyInvitationLink(): Promise<void> {
    const link = this.getInvitationLink();
    if (!link) return;

    try {
      await navigator.clipboard.writeText(link);
      this.toast.show('تم نسخ رابط الاجتماع بنجاح! أرسله لأصدقائك للانضمام.', 'success');
    } catch (e) {
      this.toast.show(`رابط الاجتماع: ${link}`, 'info');
    }
  }

  /**
   * Leaves active meeting, releases devices and cleans up Firestore, P2P & SFU
   */
  async leaveMeeting(): Promise<void> {
    const room = this.currentRoom();
    const local = this.localParticipant();

    // 1. Close both P2P and SFU engines cleanly
    await this.p2p.stop();
    await this.sfu.stop();

    // 2. Remove participant presence from Firestore
    if (room && local) {
      const isHost = local.role === 'host';
      const count = this.participants().length;
      await this.roomService.leaveRoom(room.roomCode, local.id, isHost, count);
    }

    // 3. Stop media hardware
    this.media.stopPreview();
    this.cleanupListeners();

    // 4. Reset state
    this.currentRoom.set(null);
    this.participants.set([]);
    this.localParticipant.set(null);
    this.isInMeeting.set(false);
    this.isLobby.set(true);
    this.isMigrating.set(false);

    this.router.navigate(['/meeting']);
  }

  private cleanupListeners(): void {
    if (this.unsubscribeRoom) {
      this.unsubscribeRoom();
      this.unsubscribeRoom = null;
    }
    if (this.unsubscribeParticipants) {
      this.unsubscribeParticipants();
      this.unsubscribeParticipants = null;
    }
  }
}
