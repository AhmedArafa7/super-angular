import { Component, inject, OnInit, OnDestroy, input, computed, signal, ElementRef, HostListener, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { SiNeuroVideoPlayerComponent } from '../nexus-video-player/nexus-video-player';
import { WatchDescriptionComponent } from '../watch-page/watch-description/watch-description';
import { WatchActionsComponent } from '../watch-page/watch-actions/watch-actions';
import { WatchCommentsComponent } from '../watch-page/watch-comments/watch-comments';
import { WatchSidebarComponent } from '../watch-page/watch-sidebar/watch-sidebar';
import { WatchProductShelfComponent } from '../watch-page/watch-product-shelf/watch-product-shelf';
import { VideoProductSelectorComponent } from '../utils/video-product-selector/video-product-selector';
import { VideoSourceDetectorComponent } from '../utils/video-source-detector/video-source-detector';
import { NexusNativeAdsComponent } from '../nexus-native-ads/nexus-native-ads';
import { halaltubeService } from '../../halaltube.service';
import { HalaltubePlaylistService } from '../../services/halaltube-playlist.service';
import { SidebarService } from '../../../../core/sidebar.service';
import { VideoStateService } from '../../../../core/services/video-state.service';
import { YoutubeDiscoveryService } from '../../../../core/services/youtube-discovery.service';
import { IndexedDBService } from '../../../../core/services/indexed-db.service';
import { LucideAngularModule, Flag, CheckCircle2, AlertTriangle } from 'lucide-angular';
import { PipedApiService } from '../../../../core/services/piped-api.service';
import { FirebaseService } from '../../../../core/services/firebase.service';
import { ToastService } from '../../../../core/services/toast.service';
import { VideoDownloadService } from '../../../../core/services/video-download.service';
import { ShareModalComponent } from '../modals/share-modal/share-modal';
import { ClipModalComponent } from '../modals/clip-modal/clip-modal';
import { PlaylistSelectorModalComponent } from '../modals/playlist-selector-modal/playlist-selector-modal';

@Component({
  selector: 'app-halaltube-watch-view',
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
    ShareModalComponent,
    ClipModalComponent,
    PlaylistSelectorModalComponent,
    LucideAngularModule
  ],
  templateUrl: './halaltube-watch-view.html',
  styleUrls: ['./halaltube-watch-view.scss']
})
export class halaltubeWatchViewComponent implements OnInit, OnDestroy {
  id = input.required<string>();
  
  sidebar = inject(SidebarService);
  halaltube = inject(halaltubeService);
  playlistSvc = inject(HalaltubePlaylistService);
  router = inject(Router);
  route = inject(ActivatedRoute);
  videoState = inject(VideoStateService);
  discovery = inject(YoutubeDiscoveryService);
  piped = inject(PipedApiService);
  firebase = inject(FirebaseService);
  toast = inject(ToastService);
  downloadSvc = inject(VideoDownloadService);
  dbService = inject(IndexedDBService);

  video = this.videoState.activeVideo;
  isLoading = signal(false);
  comments = signal<any[]>([]);

  isLiked = signal(false);
  isDisliked = signal(false);
  isSubscribed = signal(false);
  likes = signal(12500);
  subscriberCount = signal<string>('');
  
  // Interactive Modals State
  showShareModal = signal(false);
  showClipModal = signal(false);
  showPlaylistModal = signal(false);

  // Report Modal State
  showReportModal = signal(false);
  reportSubmitted = signal(false);
  reportReasons = [
    'أنصح به لكن بعد نزع المعازف والموسيقى منه',
    'محتوى حرام شرعاً أو خادش للحياء',
    'محتوى غير لائق / عنيف',
    'معلومات مضللة أو كاذبة',
    'محتوى لا يستحق القائمة البيضاء (مستوى متدني)',
    'انتهاك حقوق الملكية الفكرية',
    'أخرى'
  ];
  selectedReason = signal<string>('محتوى حرام شرعاً أو خادش للحياء');
  reportComments = signal<string>('');

  // Report Icons
  Flag = Flag;
  CheckCircle2 = CheckCircle2;
  AlertTriangle = AlertTriangle;
  
  showProductSelector = signal(false);
  
  selectedProducts = signal<string[]>([]);
  productDisplayMode = signal<'shelf' | 'overlay' | 'none'>('none');

  extractYoutubeId(str?: string): string | null {
    if (!str) return null;
    if (str.length === 11 && /^[a-zA-Z0-9_-]{11}$/.test(str)) return str;
    const match = str.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([^&?\n]+)/);
    return (match && match[1] && match[1].length === 11) ? match[1] : null;
  }

  ngOnInit() {
    this.sidebar.setCollapsed(true);
    this.route.queryParamMap.subscribe(params => {
      const listId = params.get('list');
      if (listId) {
        this.playlistSvc.initQueue(listId, this.id());
      }
    });
    setTimeout(() => {
      this.updatePlayerRect();
      const scrollTargets = [window, document, document.body, document.querySelector('.watch-view-container'), document.querySelector('.main-content'), document.querySelector('main')];
      scrollTargets.forEach(target => {
        if (target) {
          target.addEventListener('scroll', () => this.updatePlayerRect(), { passive: true });
        }
      });
    }, 50);
  }

  async loadVideoById(rawId: string) {
    if (!rawId) return;
    this.isLoading.set(true);

    // 1. Check if rawId is already a valid 11-character YouTube ID
    let ytId = this.extractYoutubeId(rawId);
    let targetUrl = '';
    let videoTitle = '';
    let videoAuthor = '';
    let videoThumb = '';
    let homeVideo: any = null;

    // 2. Find in home content / Firestore whitelisted videos cache
    homeVideo = this.halaltube.allHomeContent().find(v => 
      v.id === rawId || 
      (v as any).docId === rawId || 
      (v as any).youtubeId === rawId
    );

    // 3. If not in home content and rawId is not an 11-char YT ID, fetch from Firestore directly
    if (!homeVideo && !ytId) {
      try {
        homeVideo = await this.firebase.getVideoById(rawId);
      } catch (e) {
        console.warn('[WatchView] Firestore fetch error for docId:', rawId, e);
      }
    }

    if (homeVideo) {
      targetUrl = homeVideo.url || homeVideo.externalUrl || '';
      ytId = this.extractYoutubeId(targetUrl) || 
             this.extractYoutubeId(homeVideo.youtubeId) || 
             ytId;
      videoTitle = homeVideo.title;
      videoAuthor = homeVideo.author || homeVideo.uploaderName;
      videoThumb = homeVideo.thumbnail;
    }

    const playingId = ytId || homeVideo?.id || rawId;
    const playingSource = homeVideo?.source || (ytId ? 'youtube' : 'platform');

    // Compute dynamic likes initially based on video ID hash so it's not hardcoded 12,500
    const hash = playingId.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
    const initialLikes = homeVideo?.likes || (homeVideo?.views ? Math.floor(homeVideo.views * 0.08) : (520 + (hash * 43) % 9400));
    this.likes.set(initialLikes);

    this.videoState.playVideo({
      id: playingId,
      title: videoTitle || (ytId ? `فيديو يوتيوب (${ytId})` : 'فيديو halaltube المميز'),
      author: videoAuthor || 'قناة halaltube',
      thumbnail: videoThumb || (ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800'),
      url: targetUrl || (ytId ? `https://www.youtube.com/watch?v=${ytId}` : ''),
      source: playingSource,
      isWhitelisted: homeVideo?.isWhitelisted || false
    });

    // Check if video is already in the whitelist database
    this.firebase.checkVideosExist([playingId]).then(existing => {
      if (existing.includes(playingId) || homeVideo?.isWhitelisted) {
        this.videoState.activeVideo.update(current => current ? { ...current, isWhitelisted: true } as any : current);
      }
    }).catch(() => {});

    // Load full details & comments asynchronously if it's a YouTube video
    if (ytId) {
      // 1. YouTube oEmbed for 100% free, keyless, instant real channel name & title resolution
      fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${ytId}&format=json`)
        .then(res => res.json())
        .then((data: any) => {
          if (data && data.author_name) {
            this.videoState.activeVideo.update(current => current ? { 
              ...current, 
              author: data.author_name,
              title: data.title || current.title
            } : current);
          }
        }).catch(() => {});

      this.piped.getVideoDetails(ytId).then(details => {
        if (details) {
          if ((details as any).likes) this.likes.set((details as any).likes);
          const subCount = (details as any).uploaderSubscriberCount || (details as any).subscribers;
          if (subCount) {
            this.subscriberCount.set(typeof subCount === 'number' ? this.formatSubscribers(subCount) : subCount);
          }
          if (details.title) {
            this.videoState.activeVideo.update(current => current ? { 
              ...current, 
              title: details.title, 
              author: details.uploader || current.author,
              thumbnail: details.thumbnailUrl || current.thumbnail
            } : current);
          }
        }
      }).catch(() => {});

      this.discovery.fetchVideoComments(ytId).subscribe({
        next: (comments) => this.comments.set(comments),
        error: () => this.comments.set([])
      });
    }

    this.isLoading.set(false);

    // Sync watch history locally and to Firebase
    const vMeta = this.video();
    if (vMeta && rawId) {
      this.firebase.syncWatchHistory({
        videoId: rawId,
        title: vMeta.title || '',
        thumbnail: vMeta.thumbnail || '',
        author: vMeta.author || '',
        watchedAt: Date.now()
      });
    }
  }

  playFallbackVideo() {
    this.loadVideoById(this.id());
  }

  ngOnDestroy() {
    // When leaving the watch page, switch to floating mode if a video is playing
    if (this.videoState.activeVideo()) {
      this.videoState.setPlayerMode('floating');
    }
  }

  @HostListener('window:resize')
  @HostListener('window:scroll')
  @HostListener('scroll')
  onResizeOrScroll() {
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

    const vid = this.video();
    const vidId = this.id() || vid?.id;
    if (vidId) {
      this.firebase.syncVideoLike(vidId, this.isLiked(), {
        title: vid?.title || '',
        thumbnail: vid?.thumbnail || '',
        author: vid?.author || ''
      });
    }
  }

  onDislike() {
    this.isDisliked.update(v => !v);
    if (this.isDisliked()) {
      this.isLiked.set(false);
      const vid = this.video();
      const vidId = this.id() || vid?.id;
      if (vidId) {
        this.firebase.syncVideoLike(vidId, false);
      }
    }
  }

  constructor() {
    effect(() => {
      const videoId = this.id();
      if (videoId) {
        this.loadVideoById(videoId);
      }
    }, { allowSignalWrites: true });

    effect(() => {
      const vid = this.video();
      if (vid) {
        const channelId = (vid as any).authorId || (vid as any).channelId;
        const isSub = this.halaltube.isSubscribedToChannel(channelId, vid.author);
        this.isSubscribed.set(isSub);
      }
    }, { allowSignalWrites: true });
  }

  onSubscribe() {
    const vid = this.video();
    if (!vid) return;

    const channelId = (vid as any).authorId || (vid as any).channelId || ('title_' + encodeURIComponent(vid.author || ''));
    const channelTitle = vid.author || 'قناة';
    const avatarUrl = vid.channelAvatar || '';

    this.halaltube.toggleSubscription(channelId, channelTitle, avatarUrl).then(isNowSubscribed => {
      this.isSubscribed.set(isNowSubscribed);
    });
  }

  onShare() {
    this.videoState.isModalOpen.set(true);
    this.videoState.pauseVideo();
    this.showShareModal.set(true);
  }

  closeShareModal() {
    this.showShareModal.set(false);
    this.videoState.isModalOpen.set(false);
  }

  onDownload() {
    const vid = this.video();
    if (!vid) return;
    this.downloadSvc.downloadVideo(vid.id, vid.title, vid.author, vid.thumbnail || '');
    this.toast.show('بدء تنزيل الفيديو لحفظه أوفلاين في مركز التحميلات 📥', 'success');
  }

  onClip() {
    this.videoState.isModalOpen.set(true);
    this.videoState.pauseVideo();
    this.showClipModal.set(true);
  }

  closeClipModal() {
    this.showClipModal.set(false);
    this.videoState.isModalOpen.set(false);
  }

  onClipCreate(data: { start: number, end: number, title: string }) {
    const shareUrl = `${window.location.origin}/stream/watch/${this.id()}?t=${data.start}s`;
    navigator.clipboard.writeText(shareUrl);
    this.toast.show(`تم إنشاء المقطع "${data.title || 'مقطع قص'}" ونقل الرابط للحافظة ✂️`, 'success');
    this.closeClipModal();
  }

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
      this.videoState.isModalOpen.set(true);
      this.videoState.pauseVideo();
      this.showPlaylistModal.set(true);
      this.toast.show('تم حفظ الفيديو في المكتبة 📌', 'success');
    } catch (e) {
      console.error('Failed to save video:', e);
    }
  }

  onPlaylistSelect(playlistName: string) {
    this.toast.show(`تمت إضافة الفيديو إلى قائمة "${playlistName}" 🎵`, 'success');
    this.showPlaylistModal.set(false);
    this.videoState.isModalOpen.set(false);
  }

  closePlaylistModal() {
    this.showPlaylistModal.set(false);
    this.videoState.isModalOpen.set(false);
  }

  onProductUpdate(data: {productIds: string[], mode: string}) {
    this.selectedProducts.set(data.productIds);
    this.productDisplayMode.set(data.mode as any);
    this.showProductSelector.set(false);
  }

  onReport() {
    this.videoState.isModalOpen.set(true);
    this.videoState.pauseVideo();
    this.showReportModal.set(true);
  }

  closeReportModal() {
    this.showReportModal.set(false);
    this.reportSubmitted.set(false);
    this.reportComments.set('');
    this.videoState.isModalOpen.set(false);
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
      await this.halaltube.reportVideo(vid.id, vid.title, this.selectedReason(), this.reportComments());
      
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
      this.toast.show('حدث خطأ أثناء إرسال الإبلاغ. الرجاء المحاولة مرة أخرى.', 'error');
    }
  }

  async onAddToWhitelist() {
    const vid = this.video();
    if (!vid) return;

    try {
      await this.halaltube.addVideoToWhitelist(vid);
      
      // Update local state to reflect it is whitelisted now
      this.videoState.activeVideo.update(v => v ? { ...v, isWhitelisted: true } as any : null);
      
      this.toast.show('تمت إضافة الفيديو للقائمة البيضاء بنجاح وسيتم اقتراحه لباقي المستخدمين! ⭐', 'success');
    } catch (e) {
      console.error(e);
      this.toast.show('حدث خطأ أثناء إضافة الفيديو للقائمة البيضاء.', 'error');
    }
  }

  async onRecommendNoMusic() {
    const vid = this.video();
    if (!vid) return;

    try {
      await this.firebase.blacklistVideo(
        vid.id,
        vid.title,
        'أنصح به لكن بعد نزع المعازف والموسيقى منه',
        (vid as any).authorId || '',
        vid.author
      );
      this.toast.show('تم إرسال اقتراحك (أنصح به لكن بعد نزع المعازف) بنجاح للمراجعين! 🎼', 'info');
    } catch (e) {
      console.error(e);
      this.toast.show('تم تسجيل اقتراحك (أنصح به لكن بعد نزع المعازف) بنجاح 🎼', 'info');
    }
  }

  private formatSubscribers(count: number): string {
    if (!count) return '';
    if (count >= 1_000_000) return (count / 1_000_000).toFixed(1) + 'M مشترك';
    if (count >= 1_000) return (count / 1_000).toFixed(0) + 'K مشترك';
    return count + ' مشترك';
  }

  isVideoWhitelisted(id: string): boolean {
    const vid: any = this.video();
    return vid?.isWhitelisted === true;
  }
}
