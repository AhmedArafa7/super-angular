import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { LucideAngularModule, Sparkles, Loader2, Play } from 'lucide-angular';
import { WeTubeService } from '../../wetube.service';
import { VideoCardComponent } from '../video-card/video-card.component';
import { SkeletonLoaderComponent } from '../skeleton-loader/skeleton-loader.component';
import { ImportSubscriptionsModalComponent } from '../modals/import-subscriptions-modal/import-subscriptions-modal';
import { ManageChannelsModalComponent } from '../modals/manage-channels-modal/manage-channels-modal';
import { AddChannelModalComponent } from '../modals/add-channel-modal/add-channel-modal';

@Component({
  selector: 'app-wetube-subscriptions',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LucideAngularModule,
    VideoCardComponent,
    SkeletonLoaderComponent,
    ImportSubscriptionsModalComponent,
    ManageChannelsModalComponent,
    AddChannelModalComponent
  ],
  templateUrl: './wetube-subscriptions.html',
  styleUrls: ['./wetube-subscriptions.scss']
})
export class WeTubeSubscriptionsComponent implements OnInit {
  wetube = inject(WeTubeService);
  router = inject(Router);
  
  Sparkles = Sparkles;
  Loader2 = Loader2;
  Play = Play;

  numRows = signal<number>(2);

  // Modal states
  isImportOpen = signal(false);
  isManageOpen = signal(false);
  isAddOpen = signal(false);

  ngOnInit() {
    this.wetube.loadSubscriptionsFeed();
    
    // Load rows count from localStorage (stored locally per requirements)
    const savedRows = localStorage.getItem('wetube-subs-rows');
    if (savedRows) {
      const parsed = parseInt(savedRows, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 5) {
        this.numRows.set(parsed);
      }
    }
  }

  increaseRows() {
    this.numRows.update(r => {
      const val = Math.min(r + 1, 5);
      localStorage.setItem('wetube-subs-rows', val.toString());
      return val;
    });
  }

  decreaseRows() {
    this.numRows.update(r => {
      const val = Math.max(r - 1, 1);
      localStorage.setItem('wetube-subs-rows', val.toString());
      return val;
    });
  }

  trackSubAvatar(channelTitle: string): string {
    return channelTitle?.charAt(0) || '?';
  }

  playVideo(videoId: string) {
    this.router.navigate(['/stream/watch', videoId]);
  }
}
