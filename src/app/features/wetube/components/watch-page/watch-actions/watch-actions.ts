import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, ThumbsUp, ThumbsDown, Share2, Download, Plus, Scissors, Flag, VolumeX, CheckCircle } from 'lucide-angular';
import { WeTubeService } from '../../../wetube.service';

@Component({
  selector: 'app-watch-actions',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './watch-actions.html',
  styleUrls: ['./watch-actions.scss']
})
export class WatchActionsComponent {
  private wetube = inject(WeTubeService);

  @Input() likes: number = 0;
  @Input() isLiked: boolean = false;
  @Input() isDisliked: boolean = false;
  @Input() isSubscribed: boolean = false;
  @Input() channelName: string = '';
  @Input() channelAvatar?: string | null = '';
  @Input() subscriberCount: string = '';
  @Input() isYoutube: boolean = false;
  @Input() isWhitelisted: boolean = true;
  @Input() isOfficialCreator: boolean = false;

  getSubscriberLabel(): string {
    if (this.subscriberCount && this.subscriberCount.trim()) {
      return this.subscriberCount.includes('مشترك') ? this.subscriberCount : `${this.subscriberCount} مشترك`;
    }
    if (this.isOfficialCreator) {
      return 'منشئ محتوى موثق في WeTube Studio ⚡';
    }
    if (this.isYoutube) {
      return 'فيديو مُقترَح من مجتمع WeTube 👥';
    }
    return 'قناة في WeTube';
  }
  
  getAvatar(): string {
    if (this.channelAvatar && this.channelAvatar.startsWith('http')) {
      return this.channelAvatar;
    }
    
    // Check subscribed channels for matching avatar
    const name = (this.channelName || '').trim().toLowerCase();
    if (name) {
      const subs: any[] = (this.wetube as any).subscriptions ? (this.wetube as any).subscriptions() : [];
      const sub = subs.find((s: any) => {
        const sName = (s.channelTitle || s.name || '').trim().toLowerCase();
        return sName && (sName === name || sName.includes(name) || name.includes(sName));
      });
      if (sub && sub.avatarUrl && sub.avatarUrl.startsWith('http')) {
        return sub.avatarUrl;
      }

      // Check home content for matching channel avatar
      const homeContent: any[] = (this.wetube as any).allHomeContent ? (this.wetube as any).allHomeContent() : [];
      const homeVid = homeContent.find((v: any) => {
        const vAuthor = (v.author || '').trim().toLowerCase();
        return vAuthor && (vAuthor === name || vAuthor.includes(name) || name.includes(vAuthor));
      });
      if (homeVid && (homeVid.channelAvatar || homeVid.avatar)) {
        const av = homeVid.channelAvatar || homeVid.avatar;
        if (av && av.startsWith('http')) return av;
      }
    }

    return `https://ui-avatars.com/api/?name=${encodeURIComponent(this.channelName || 'Channel')}&background=10b981&color=fff`;
  }
  
  @Output() like = new EventEmitter<void>();
  @Output() dislike = new EventEmitter<void>();
  @Output() subscribe = new EventEmitter<void>();
  @Output() share = new EventEmitter<void>();
  @Output() download = new EventEmitter<void>();
  @Output() clip = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();
  @Output() report = new EventEmitter<void>();
  @Output() addToWhitelist = new EventEmitter<void>();
  @Output() recommendNoMusic = new EventEmitter<void>();
  
  ThumbsUp = ThumbsUp;
  ThumbsDown = ThumbsDown;
  Share2 = Share2;
  Download = Download;
  Plus = Plus;
  Scissors = Scissors;
  Flag = Flag;
  VolumeX = VolumeX;
  CheckCircle = CheckCircle;
}
