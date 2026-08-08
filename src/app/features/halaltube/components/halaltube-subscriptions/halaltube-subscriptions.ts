import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { LucideAngularModule, Sparkles, Loader2, Play } from 'lucide-angular';
import { halaltubeService } from '../../halaltube.service';
import { IndexedDBService } from '../../../../core/services/indexed-db.service';
import { VideoCardComponent } from '../video-card/video-card.component';
import { SkeletonLoaderComponent } from '../skeleton-loader/skeleton-loader.component';
import { ImportSubscriptionsModalComponent } from '../modals/import-subscriptions-modal/import-subscriptions-modal';
import { ManageChannelsModalComponent } from '../modals/manage-channels-modal/manage-channels-modal';
import { AddChannelModalComponent } from '../modals/add-channel-modal/add-channel-modal';

@Component({
  selector: 'app-halaltube-subscriptions',
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
  templateUrl: './halaltube-subscriptions.html',
  styleUrls: ['./halaltube-subscriptions.scss']
})
export class halaltubeSubscriptionsComponent implements OnInit {
  halaltube = inject(halaltubeService);
  router = inject(Router);
  dbService = inject(IndexedDBService);
  
  Sparkles = Sparkles;
  Loader2 = Loader2;
  Play = Play;

  numRows = signal<number>(2);

  // Modal states
  isImportOpen = signal(false);
  isManageOpen = signal(false);
  isAddOpen = signal(false);

  ngOnInit() {
    this.halaltube.loadSubscriptionsFeed();
    
    // Load rows count from localStorage (stored locally per requirements)
    const savedRows = localStorage.getItem('halaltube-subs-rows');
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
      localStorage.setItem('halaltube-subs-rows', val.toString());
      return val;
    });
  }

  decreaseRows() {
    this.numRows.update(r => {
      const val = Math.max(r - 1, 1);
      localStorage.setItem('halaltube-subs-rows', val.toString());
      return val;
    });
  }

  trackSubAvatar(channelTitle: string): string {
    return channelTitle?.charAt(0) || '?';
  }

  playVideo(videoId: string) {
    this.router.navigate(['/stream/watch', videoId]);
  }

  async removeChannel(channelId: string) {
    const subs = this.halaltube.subscriptions().filter(s => s.channelId !== channelId);
    this.halaltube.subscriptions.set(subs);
    // Persist to indexed db (pseudo code assuming dbService exists in halaltube or inject it)
    await this.dbService.delete('subscriptions', channelId).catch(() => {});
  }

  async toggleNotifications(channelId: string) {
    const subs = this.halaltube.subscriptions().map(s => {
      if (s.channelId === channelId) {
        // Mock toggling notifications (add property to model if needed)
        // For now just console log
        console.log('Toggled notifications for', channelId);
      }
      return s;
    });
    this.halaltube.subscriptions.set(subs);
  }
}
