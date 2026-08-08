import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, Bell } from 'lucide-angular';
import { halaltubeService } from '../../../halaltube.service';
import { getInitialAvatarSvg } from '../../../../../core/services/button-inspector.service';

@Component({
  selector: 'app-subscription-bar',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './subscription-bar.html',
  styleUrls: ['./subscription-bar.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SubscriptionBarComponent {
  halaltube = inject(halaltubeService);
  Bell = Bell;
  mutedChannels = signal<Set<string>>(new Set());

  isChannelSelected(channelId: string): boolean {
    return this.halaltube.activeChannel()?.id === channelId;
  }

  trackSubAvatar(channelTitle: string): string {
    return channelTitle?.charAt(0) || '?';
  }

  isMuted(channelId: string): boolean {
    return this.mutedChannels().has(channelId);
  }

  getAvatarUrl(sub: any): string {
    if (sub.avatarUrl && sub.avatarUrl.startsWith('http') && !sub.avatarUrl.includes('ui-avatars.com')) {
      return sub.avatarUrl;
    }
    return getInitialAvatarSvg(sub.channelTitle || 'Channel');
  }

  onAvatarError(event: Event, sub: any) {
    const imgEl = event.target as HTMLImageElement;
    imgEl.src = getInitialAvatarSvg(sub.channelTitle || 'Channel');
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
