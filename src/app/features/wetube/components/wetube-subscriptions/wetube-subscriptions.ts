import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
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

  // Modal states
  isImportOpen = signal(false);
  isManageOpen = signal(false);
  isAddOpen = signal(false);

  ngOnInit() {
    this.wetube.loadSubscriptionsFeed();
  }

  playVideo(videoId: string) {
    this.router.navigate(['/stream/watch', videoId]);
  }
}
