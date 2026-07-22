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
import { YoutubeDiscoveryService } from '../../../../core/services/youtube-discovery.service';
import { IndexedDBService } from '../../../../core/services/indexed-db.service';
import { LucideAngularModule, Flag, CheckCircle2, AlertTriangle } from 'lucide-angular';

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
    NexusNativeAdsComponent,
    LucideAngularModule
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
  discovery = inject(YoutubeDiscoveryService);

  video = this.videoState.activeVideo;
  isLoading = signal(false);
  comments = signal<any[]>([]);

  isLiked = signal(false);
  isDisliked = signal(false);
  isSubscribed = signal(false);
  likes = signal(12500);
  
  // Report Modal State
  showReportModal = signal(false);
  reportSubmitted = signal(false);
  reportReasons = [
    'محتوى غير لائق / عنيف',
    'معلومات مضللة أو كاذبة',
    'محتوى لا يستحق القائمة البيضاء (مستوى متدني)',
    'انتهاك حقوق الملكية الفكرية',
    'أخرى'
  ];
  selectedReason = signal<string>('محتوى لا يستحق القائمة البيضاء (مستوى متدني)');
  reportComments = signal<string>('');

  // Report Icons
  Flag = Flag;
  CheckCircle2 = CheckCircle2;
  AlertTriangle = AlertTriangle;
  
  showProductSelector = signal(false);
  
  selectedProducts = signal<string[]>([]);
  productDisplayMode = signal<'shelf' | 'overlay' | 'none'>('none');

  ngOnInit() {
    this.sidebar.setCollapsed(true);
    
    const homeVideo = this.wetube.allHomeContent().find(v => v.id === this.id());
    
    if (homeVideo && homeVideo.source === 'local') {
      this.videoState.playVideo({
        id: homeVideo.id,
        title: homeVideo.title,
        author: homeVideo.author,
        thumbnail: homeVideo.thumbnail || '',
        url: homeVideo.url,
        source: homeVideo.source
      });
      this.isLoading.set(false);
      setTimeout(() => this.updatePlayerRect(), 50);
      return;
    }

    this.discovery.fetchVideoComments(this.id()).subscribe({
      next: (comments) => this.comments.set(comments),
      error: () => this.comments.set([])
    });

    const currentVideo = this.videoState.activeVideo();
    if (!currentVideo || currentVideo.id !== this.id()) {
      this.isLoading.set(true);
      this.discovery.fetchVideoDetails(this.id()).subscribe({
        next: (details) => {
          if (details) {
            this.videoState.playVideo({
              ...details,
              thumbnail: details.thumbnail || ''
            });
          } else {
            this.playFallbackVideo();
          }
          this.isLoading.set(false);
          setTimeout(() => this.updatePlayerRect(), 50);
        },
        error: (err) => {
          console.warn('[WeTubeWatchView] API failed, using fallback mock video.', err);
          this.playFallbackVideo();
          this.isLoading.set(false);
          setTimeout(() => this.updatePlayerRect(), 50);
        }
      });
    } else {
      this.videoState.setPlayerMode('full');
      setTimeout(() => this.updatePlayerRect(), 50);
    }
  }

  playFallbackVideo() {
    const videoId = this.id();
    const knownVideo = this.wetube.feedVideos().find(v => v.id === videoId) || 
                       this.wetube.trendingVideos().find(v => v.id === videoId) ||
                       this.wetube.videos().find(v => v.id === videoId);
                       
    if (knownVideo) {
      this.videoState.playVideo({
        id: knownVideo.id,
        title: knownVideo.title,
        author: knownVideo.author,
        thumbnail: knownVideo.thumbnail || ''
      });
    } else {
      this.videoState.playVideo({
        id: videoId,
        title: 'مقطع فيديو من منصة WeTube',
        author: 'Si-Neuro Creator',
        thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800'
      });
    }
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

  dbService = inject(IndexedDBService);

  async onSave() {
    const vid = this.video();
    if (!vid) return;
    try {
      await this.dbService.put('saved_videos', {
        id: vid.id,
        title: vid.title,
        author: vid.author,
        thumbnail: vid.thumbnail,
        savedAt: Date.now()
      });
      alert('تم حفظ الفيديو في المكتبة بنجاح');
    } catch (e) {
      console.error('Failed to save video:', e);
    }
  }

  onProductUpdate(data: {productIds: string[], mode: string}) {
    this.selectedProducts.set(data.productIds);
    this.productDisplayMode.set(data.mode as any);
    this.showProductSelector.set(false);
  }

  onReport() {
    this.showReportModal.set(true);
    // Pause video playback when opening the report modal
    this.videoState.isPlaying.set(false);
  }

  closeReportModal() {
    this.showReportModal.set(false);
    this.reportSubmitted.set(false);
    this.reportComments.set('');
  }

  onReasonChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    if (select) {
      this.selectedReason.set(select.value);
    }
  }

  onCommentsChange(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    if (textarea) {
      this.reportComments.set(textarea.value);
    }
  }

  async onSubmitReport() {
    const vid = this.video();
    if (!vid) return;

    try {
      // 1. Submit report to database and add to local block list
      await this.wetube.reportVideo(vid.id, vid.title, this.selectedReason(), this.reportComments());
      
      // 2. Change modal view to success
      this.reportSubmitted.set(true);
      
      // 3. Stop player playback instantly
      this.videoState.closePlayer();
      
      // 4. Redirect after 2.5s to Home Page (where reported video is now hidden!)
      setTimeout(() => {
        this.closeReportModal();
        this.router.navigate(['/stream']);
      }, 2500);
    } catch (e) {
      alert('حدث خطأ أثناء إرسال الإبلاغ. الرجاء المحاولة مرة أخرى.');
    }
  }
}
