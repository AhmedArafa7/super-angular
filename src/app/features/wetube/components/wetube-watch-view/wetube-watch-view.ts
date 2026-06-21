import { Component, inject, OnInit, OnDestroy, input, computed, signal, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SiNeuroVideoPlayerComponent } from '../nexus-video-player/nexus-video-player';
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
import { VideoStateService } from '../../../../core/services/video-state.service';

@Component({
  selector: 'app-wetube-watch-view',
  standalone: true,
  imports: [
    CommonModule,
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
export class WeTubeWatchViewComponent implements OnInit, OnDestroy {
  id = input.required<string>();
  
  sidebar = inject(SidebarService);
  wetube = inject(WeTubeService);
  router = inject(Router);
  videoState = inject(VideoStateService);

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
    
    // Check if the current video is already playing to avoid reloading
    const currentVideo = this.videoState.activeVideo();
    if (!currentVideo || currentVideo.id !== this.id()) {
      const vid = this.video();
      if (vid) {
        this.videoState.playVideo({
          id: vid.id,
          title: vid.title,
          author: vid.author,
          thumbnail: vid.thumbnail || ''
        });
      }
    } else {
      this.videoState.setPlayerMode('full');
    }

    // Small delay to allow DOM to render placeholder before measuring
    setTimeout(() => this.updatePlayerRect(), 100);
  }

  ngOnDestroy() {
    // When leaving the watch page, switch to floating mode if a video is playing
    if (this.videoState.activeVideo()) {
      this.videoState.setPlayerMode('floating');
    }
  }

  @HostListener('window:resize')
  onResize() {
    this.updatePlayerRect();
  }

  updatePlayerRect() {
    const placeholder = document.getElementById('video-placeholder');
    if (placeholder) {
      this.videoState.playerRect.set(placeholder.getBoundingClientRect());
    }
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
