import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, Bell } from 'lucide-angular';
import { WeTubeService } from '../../../wetube.service';

@Component({
  selector: 'app-subscription-bar',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './subscription-bar.html',
  styleUrls: ['./subscription-bar.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SubscriptionBarComponent {
  wetube = inject(WeTubeService);
  Bell = Bell;
  mutedChannels = signal<Set<string>>(new Set());

  isChannelSelected(channelId: string): boolean {
    return this.wetube.activeChannel()?.id === channelId;
  }

  trackSubAvatar(channelTitle: string): string {
    return channelTitle?.charAt(0) || '?';
  }

  isMuted(channelId: string): boolean {
    return this.mutedChannels().has(channelId);
  }

  onBellClick(event: Event, channelId: string) {
    event.preventDefault();
    event.stopPropagation();
    this.mutedChannels.update(current => {
      const next = new Set(current);
      if (next.has(channelId)) {
        next.delete(channelId);
      } else {
        next.add(channelId);
      }
      return next;
    });
  }
}
