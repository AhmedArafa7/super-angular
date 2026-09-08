import { 
  Component, 
  inject, 
  signal, 
  OnInit, 
  OnDestroy, 
  Directive,
  Input,
  ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { MeetingService } from '../../core/services/meeting/meeting.service';
import { FirebaseService } from '../../core/services/firebase.service';
import { ToastService } from '../../core/services/toast.service';

@Directive({
  selector: '[appMediaStream]',
  standalone: true
})
export class MediaStreamDirective {
  private el = inject(ElementRef<HTMLVideoElement>);

  @Input() set appMediaStream(stream: MediaStream | null | undefined) {
    const video = this.el.nativeElement;
    if (stream) {
      if (video.srcObject !== stream) {
        video.srcObject = stream;
        video.play().catch(() => {});
      }
    } else {
      video.srcObject = null;
    }
  }
}

@Component({
  selector: 'app-meeting',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideDynamicIcon, MediaStreamDirective],
  templateUrl: './meeting.component.html',
  styleUrls: ['./meeting.component.scss']
})
export class MeetingComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private firebase = inject(FirebaseService);
  private toast = inject(ToastService);
  readonly meeting = inject(MeetingService);

  // Form & View inputs
  joinCodeInput = signal<string>('');
  displayNameInput = signal<string>('');
  isFullscreen = signal<boolean>(false);
  activeTab = signal<'lobby' | 'hub'>('hub');

  ngOnInit(): void {
    // Set initial display name from authenticated user profile or session
    const currentName = this.firebase.userData()?.displayName || 
                        this.firebase.userData()?.name || 
                        localStorage.getItem('super_meet_username') || '';
    this.displayNameInput.set(currentName);

    // Watch route params for roomId
    this.route.paramMap.subscribe(async (params) => {
      const roomId = params.get('roomId');
      if (roomId) {
        this.joinCodeInput.set(roomId);
        this.activeTab.set('lobby');
        await this.meeting.enterLobby(roomId);
      } else {
        this.activeTab.set('hub');
      }
    });
  }

  ngOnDestroy(): void {
    this.meeting.media.stopPreview();
  }

  /**
   * Retrieves the active MediaStream for any participant (from P2P or SFU)
   */
  getParticipantStream(participantId: string): MediaStream | null {
    if (this.meeting.activeMeetingMode() === 'sfu') {
      return this.meeting.sfu.remoteStreams().get(participantId) || null;
    }
    return this.meeting.p2p.remoteStream();
  }

  /**
   * Checks if remote participant has active stream available
   */
  hasRemoteStream(participantId: string): boolean {
    return !!this.getParticipantStream(participantId);
  }

  /**
   * Action: Start a brand-new instant meeting
   */
  async startInstantMeeting(): Promise<void> {
    try {
      const roomCode = await this.meeting.createMeeting();
      // Navigation to /meeting/:roomCode happens inside meetingService
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * Action: Navigate to room lobby using entered code or URL
   */
  async navigateToRoom(): Promise<void> {
    let code = this.joinCodeInput().trim();
    if (!code) {
      this.toast.show('يرجى كتابة رمز الغرفة أو رابط الاجتماع.', 'warning');
      return;
    }

    // Support full links like http://localhost:4200/meeting/NEURO-8821
    if (code.includes('/meeting/')) {
      code = code.split('/meeting/')[1].split('?')[0].trim();
    }

    code = code.toUpperCase();
    this.router.navigate(['/meeting', code]);
  }

  /**
   * Action: Confirm and join meeting from Lobby
   */
  async confirmJoinMeeting(): Promise<void> {
    const name = this.displayNameInput().trim();
    if (!name) {
      this.toast.show('يرجى كتابة اسمك أولاً قبل الدخول.', 'warning');
      return;
    }

    localStorage.setItem('super_meet_username', name);
    await this.meeting.joinMeeting(name);
  }

  /**
   * Quick toggles
   */
  async toggleCamera(): Promise<void> {
    await this.meeting.toggleCamera();
  }

  async toggleMic(): Promise<void> {
    await this.meeting.toggleMic();
  }

  copyLink(): void {
    this.meeting.copyInvitationLink();
  }

  toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      this.isFullscreen.set(true);
    } else {
      document.exitFullscreen().catch(() => {});
      this.isFullscreen.set(false);
    }
  }

  leave(): void {
    this.meeting.leaveMeeting();
  }
}
