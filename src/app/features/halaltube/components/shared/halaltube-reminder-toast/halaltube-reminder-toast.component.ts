import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Play, CheckCircle2, Clock, SkipForward, X, Flame, Bell, Sparkles, BookOpen } from 'lucide-angular';
import { HalaltubePlaylistService } from '../../../services/halaltube-playlist.service';

@Component({
  selector: 'app-halaltube-reminder-toast',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './halaltube-reminder-toast.component.html',
  styleUrls: ['./halaltube-reminder-toast.component.scss']
})
export class HalaltubeReminderToastComponent {
  playlistSvc = inject(HalaltubePlaylistService);

  // Icons
  Play = Play;
  CheckCircle2 = CheckCircle2;
  Clock = Clock;
  SkipForward = SkipForward;
  X = X;
  Flame = Flame;
  Bell = Bell;
  Sparkles = Sparkles;
  BookOpen = BookOpen;

  get reminder() {
    return this.playlistSvc.pendingReminder();
  }

  get isVisible() {
    return this.playlistSvc.showReminderToast() && this.reminder !== null;
  }

  watchNow() {
    this.playlistSvc.playNextFromReminder();
  }

  markWatched() {
    this.playlistSvc.markWatchedFromReminder();
  }

  snooze(minutes: number = 15) {
    this.playlistSvc.snoozeReminder(minutes);
  }

  skip() {
    this.playlistSvc.skipVideoFromReminder();
  }

  close() {
    this.playlistSvc.dismissReminder();
  }
}
