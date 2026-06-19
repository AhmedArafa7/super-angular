import { Component, inject, OnInit, input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SiNeuroVideoPlayerComponent } from '../nexus-video-player/nexus-video-player';
import { WatchPlayerComponent } from '../watch-page/watch-player/watch-player';
import { WatchDescriptionComponent } from '../watch-page/watch-description/watch-description';
import { WatchActionsComponent } from '../watch-page/watch-actions/watch-actions';
import { WatchCommentsComponent } from '../watch-page/watch-comments/watch-comments';
import { WatchSidebarComponent } from '../watch-page/watch-sidebar/watch-sidebar';
import { WatchProductShelfComponent } from '../watch-page/watch-product-shelf/watch-product-shelf';
import { VideoProductSelectorComponent } from '../utils/video-product-selector/video-product-selector';
import { VideoSourceDetectorComponent } from '../utils/video-source-detector/video-source-detector';
import { NexusNativeAdsComponent } from '../nexus-native-ads/nexus-native-ads';
import { WeTubeService } from '../../wetube.service';
import { SidebarService } from '../../../../core/sidebar.service';

@Component({
  selector: 'app-wetube-watch-view',
  standalone: true,
  imports: [
    CommonModule,
    WatchPlayerComponent,
    WatchDescriptionComponent,
    WatchActionsComponent,
    WatchCommentsComponent,
    WatchSidebarComponent,
    WatchProductShelfComponent,
    VideoProductSelectorComponent,
    VideoSourceDetectorComponent,
    NexusNativeAdsComponent
  ],
  templateUrl: './wetube-watch-view.html',
  styleUrls: ['./wetube-watch-view.scss']
})
export class WeTubeWatchViewComponent implements OnInit {
  id = input.required<string>();
  
  sidebar = inject(SidebarService);
  wetube = inject(WeTubeService);
  router = inject(Router);

  video = computed(() => {
    return this.wetube.allHomeContent().find(v => v.id === this.id());
  });

  isLiked = signal(false);
  isDisliked = signal(false);
  isSubscribed = signal(false);
  likes = signal(12500);
  
  showProductSelector = signal(false);
  
  selectedProducts = signal<string[]>([]);
  productDisplayMode = signal<'shelf' | 'overlay' | 'none'>('none');

  ngOnInit() {
    this.sidebar.setCollapsed(true);
  }

  onClose() {
    this.router.navigate(['/stream']);
  }

  onLike() {
    this.isLiked.update(v => !v);
    this.likes.update(v => v + (this.isLiked() ? 1 : -1));
    if (this.isLiked()) this.isDisliked.set(false);
  }

  onDislike() {
    this.isDisliked.update(v => !v);
    if (this.isDisliked()) this.isLiked.set(false);
  }

  onSubscribe() {
    this.isSubscribed.update(v => !v);
  }

  onShare() {
    const shareUrl = `${window.location.origin}/stream/watch/${this.id()}`;
    if (navigator.share) {
      navigator.share({ title: this.video()?.title, url: shareUrl });
    } else {
      navigator.clipboard.writeText(shareUrl);
    }
  }

  onDownload() {
    alert('بدء التحميل...');
  }

  onClip() {
    alert('فتح أداة القص...');
  }

  onSave() {
    this.showProductSelector.update(v => !v);
  }

  onProductUpdate(data: {productIds: string[], mode: string}) {
    this.selectedProducts.set(data.productIds);
    this.productDisplayMode.set(data.mode as any);
    this.showProductSelector.set(false);
  }
}
