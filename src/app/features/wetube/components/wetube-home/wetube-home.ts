import { Component, inject, signal, OnInit, computed, ChangeDetectionStrategy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { WeTubeService, AlgorithmConfig } from '../../wetube.service';
import { FirebaseService } from '../../../../core/services/firebase.service';
import { YoutubeDiscoveryService } from '../../../../core/services/youtube-discovery.service';
import { WETUBE_CATEGORIES, ContentItem, checkIsShorts } from '../../wetube.model';
import { SubscriptionBarComponent } from '../shared/subscription-bar/subscription-bar';
import { NexusNativeAdsComponent } from '../nexus-native-ads/nexus-native-ads';
import { 
  LucideAngularModule, Sparkles, TrendingUp, Search, ArrowLeft, Youtube, 
  RefreshCcw, LogIn, Video, Sliders, Check, ShieldCheck, BookOpen, Music, 
  HardDrive, Play, Folder, FileText, Image as ImageIcon, FileAudio, Plus, Download, Compass, Layers 
} from 'lucide-angular';
import { IndexedDBService } from '../../../../core/services/indexed-db.service';
import { getInitialAvatarSvg } from '../../../../core/services/button-inspector.service';
import { EncryptionService } from '../../../../core/services/encryption.service';
import { VaultService } from '../../../../core/vault.service';
import { VideoDownloadService } from '../../../../core/services/video-download.service';

@Component({
  selector: 'app-wetube-home',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule, SubscriptionBarComponent, NexusNativeAdsComponent],
  templateUrl: './wetube-home.html',
  styleUrls: ['./wetube-home.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block h-full'
  }
})
export class WeTubeHomeComponent implements OnInit {
  wetube = inject(WeTubeService);
  firebaseService = inject(FirebaseService);
  vaultService = inject(VaultService);
  downloadService = inject(VideoDownloadService);
  router = inject(Router);
  route = inject(ActivatedRoute);

  categories = WETUBE_CATEGORIES;
  showUploadModal = signal(false);
  showOnboardingBanner = signal(false);

  searchFilters = [
    { label: "الكل", sp: "" },
    { label: "آخر ساعة", sp: "EgIIAQ%3D%3D" },
    { label: "اليوم", sp: "EgQIAhAB" },
    { label: "هذا الأسبوع", sp: "EgQIAxAB" },
    { label: "قنوات", sp: "EgIQAg%3D%3D" },
    { label: "قوائم تشغيل", sp: "EgIQAw%3D%3D" },
    { label: "أفلام", sp: "EgIQBA%3D%3D" },
    { label: "قصير (<4د)", sp: "EgQYAXAB" },
    { label: "طويل (>20د)", sp: "EgQYAnAB" },
  ];

  visibleCount = signal(20);
  private observer: IntersectionObserver | null = null;
  selectedChannelId = signal<string | null>(null);

  discoveryService = inject(YoutubeDiscoveryService);
  resolvedAvatars = signal<Record<string, string>>({});

  // Icons
  Sparkles = Sparkles;
  TrendingUp = TrendingUp;
  Search = Search;
  ArrowLeft = ArrowLeft;
  Youtube = Youtube;
  RefreshCcw = RefreshCcw;
  LogIn = LogIn;
  Video = Video;
  Sliders = Sliders;
  Check = Check;
  ShieldCheck = ShieldCheck;
  BookOpen = BookOpen;
  Music = Music;
  HardDrive = HardDrive;
  Play = Play;
  Folder = Folder;
  FileText = FileText;
  ImageIcon = ImageIcon;
  FileAudio = FileAudio;
  Plus = Plus;
  Download = Download;
  Compass = Compass;
  Layers = Layers;

  showAlgoModal = signal(false);
  showDebugModal = signal(false);
  debugTab = signal<'encrypted' | 'history' | 'saved' | 'subs' | 'algo'>('encrypted');
  
  rawEncryptedData = signal<{storeName: string, items: any[]}[]>([]);
  decryptedHistory = signal<any[]>([]);
  decryptedSaved = signal<any[]>([]);
  decryptedSubs = signal<any[]>([]);
  rawAlgoDataEnc = signal<string>('');
  rawAlgoDataDec = signal<any>(null);

  indexedDb = inject(IndexedDBService);
  encryptionService = inject(EncryptionService);

  // Cached Offline Videos Metadata
  cachedOfflineMeta = signal<any[]>([]);

  // Explore Topics State
  exploreTopics = ['رسوم متحركة', 'ألعاب ومغامرات', 'تكنولوجيا وبرمجة', 'علوم وصحة', 'تطوير الذات', 'كرة القدم'];
  activeExploreTopic = signal<string>('رسوم متحركة');

  // Shorts Dynamic Row Configuration
  shortsRows = signal<number>(1);

  // Quran Recitations Feed
  defaultQuranVideos: ContentItem[] = [];

  // Ansheed & Nasheed (Without Music)
  defaultAnsheedVideos: ContentItem[] = [];

  // Explore Videos per Topic
  defaultExploreVideos: Record<string, ContentItem[]> = {};

  // Lists computed per Section
  shortsList = computed(() => {
    return this.wetube.allHomeContent().filter(v => checkIsShorts(v));
  });

  standardVideosList = computed(() => {
    return this.wetube.allHomeContent().filter(v => !checkIsShorts(v));
  });

  // Section 1: Quran List
  quranList = computed(() => {
    const fromFeed = this.wetube.allHomeContent().filter(v => 
      v.category === 'قرآن كريم' || 
      v.title.includes('قرآن') || 
      v.title.includes('تلاوة') || 
      v.title.includes('سورة') ||
      v.title.includes('القارئ')
    );
    return fromFeed.length > 0 ? fromFeed : this.defaultQuranVideos;
  });

  // Section 2: Ansheed List
  ansheedList = computed(() => {
    const fromFeed = this.wetube.allHomeContent().filter(v => 
      v.category === 'أناشيد وابتهالات' || 
      v.title.includes('نشيد') || 
      v.title.includes('انشودة') || 
      v.title.includes('ابتهال') ||
      v.title.includes('أناشيد')
    );
    return fromFeed.length > 0 ? fromFeed : this.defaultAnsheedVideos;
  });

  // Section 3: Explore Topics List
  exploreTopicVideos = computed(() => {
    const topic = this.activeExploreTopic();
    const fromFeed = this.wetube.allHomeContent().filter(v => 
      v.category === topic || v.title.toLowerCase().includes(topic.toLowerCase())
    );
    const defaults = this.defaultExploreVideos[topic] || [];
    return [...fromFeed, ...defaults];
  });

  // Section 4: Local Vault Items (EXACTLY ALL ITEMS AT THE VERY BOTTOM OF THE PAGE)
  allVaultItems = computed(() => {
    const assets = this.vaultService.assets() || [];
    const cached = this.cachedOfflineMeta() || [];

    const formattedAssets = assets.map(a => ({
      id: a.id,
      title: a.name,
      mimeType: a.mimeType,
      size: a.size || 'محلي',
      url: a.url,
      createdAt: a.createdAt,
      isFavorite: a.isFavorite,
      source: 'vault' as const
    }));

    const formattedCached = cached.map(c => ({
      id: c.videoId,
      title: c.title || 'فيديو أوفلاين مخصص',
      mimeType: 'video' as const,
      size: c.sizeBytes ? `${(c.sizeBytes / (1024 * 1024)).toFixed(1)} MB` : 'محفوظ محلياً',
      url: `/stream/watch/${c.videoId}`,
      createdAt: c.cachedAt ? new Date(c.cachedAt).toISOString() : new Date().toISOString(),
      thumbnail: c.thumbnail,
      author: c.author || 'WeTube Offline',
      quality: c.quality,
      source: 'offline' as const
    }));

    // Return EVERY SINGLE ITEM in the vault and local downloads without any slicing or omitting!
    return [...formattedAssets, ...formattedCached];
  });

  isFounder = computed(() => {
    const user = this.firebaseService.currentUser();
    const role = this.firebaseService.userData()?.role || 'user';
    const allowedRoles = ['admin', 'super_admin', 'founder', 'cofounder', 'management'];
    return allowedRoles.includes(role) || 
           (user && (user.email === 'admin@sineuro.com' || user.email === 'mo1999382@gmail.com'));
  });

  needsOnboarding = computed(() => {
    const userData = this.firebaseService.userData();
    return !!(userData && userData.onboardingComplete !== true);
  });

  constructor() {}

  ngOnInit() {
    if (this.needsOnboarding() && this.wetube.allHomeContent().length === 0) {
      this.router.navigate(['/stream/onboarding']);
      return;
    }
    this.checkOnboardingStatus();
    
    // Load shorts rows from local storage
    const savedShortsRows = localStorage.getItem('wetube-shorts-rows');
    if (savedShortsRows) {
      const parsed = parseInt(savedShortsRows, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 3) {
        this.shortsRows.set(parsed);
      }
    }

    // Load offline cached video metadata
    this.loadOfflineCachedMeta();

    setTimeout(() => {
      this.setupIntersectionObserver();
    }, 1000);

    this.wetube.initialize();
  }

  async loadOfflineCachedMeta() {
    try {
      const meta = await this.downloadService.getAllCachedMeta();
      this.cachedOfflineMeta.set(meta || []);
    } catch (e) {
      console.warn('[WeTubeHome] Offline cache load error:', e);
    }
  }

  setExploreTopic(topic: string) {
    this.activeExploreTopic.set(topic);
  }

  increaseShortsRows() {
    this.shortsRows.update(r => {
      const val = Math.min(r + 1, 3);
      localStorage.setItem('wetube-shorts-rows', val.toString());
      return val;
    });
  }

  decreaseShortsRows() {
    this.shortsRows.update(r => {
      const val = Math.max(r - 1, 1);
      localStorage.setItem('wetube-shorts-rows', val.toString());
      return val;
    });
  }

  extractYoutubeId(urlOrId: string): string | null {
    if (!urlOrId) return null;
    if (urlOrId.length === 11 && /^[a-zA-Z0-9_-]{11}$/.test(urlOrId)) return urlOrId;
    const match = urlOrId.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([^&?\n]+)/);
    return match ? match[1] : null;
  }

  getSafeThumbnail(video: any): string {
    const isYoutube = video.source === 'youtube' || (video.externalUrl && video.externalUrl.includes('youtube')) || (video.url && video.url.includes('youtube'));
    if (isYoutube) {
       const ytId = this.extractYoutubeId(video.externalUrl || video.url || video.id);
       if (ytId) return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
    }
    return video.thumbnail || 'assets/placeholder.jpg';
  }

  openVaultItem(item: any) {
    if (item.source === 'offline') {
      this.router.navigate(['/stream/watch', item.id]);
    } else if (item.mimeType === 'video' || item.mimeType === 'audio') {
      if (item.url) {
        window.open(item.url, '_blank');
      } else {
        this.router.navigate(['/stream/vault']);
      }
    } else {
      this.router.navigate(['/stream/vault']);
    }
  }

  toggleDebugModal() {
    const newState = !this.showDebugModal();
    this.showDebugModal.set(newState);
    if (newState) {
      this.loadDebugData();
    }
  }

  async loadDebugData() {
    try {
      const sensitiveStores = ['watch_history', 'saved_videos', 'subscriptions'];
      const rawDataList: {storeName: string, items: any[]}[] = [];
      for (const store of sensitiveStores) {
        const items = await this.indexedDb.getRawAll(store);
        rawDataList.push({ storeName: store, items });
      }
      this.rawEncryptedData.set(rawDataList);

      const history = await this.indexedDb.getAll('watch_history');
      this.decryptedHistory.set(history);

      const saved = await this.indexedDb.getAll('saved_videos');
      this.decryptedSaved.set(saved);

      const subs = await this.indexedDb.getAll('subscriptions');
      this.decryptedSubs.set(subs);

      const savedAlgoEnc = localStorage.getItem('wetube_algo_config_enc') || '';
      this.rawAlgoDataEnc.set(savedAlgoEnc);
      if (savedAlgoEnc) {
        const parsed = await this.encryptionService.decrypt(savedAlgoEnc);
        this.rawAlgoDataDec.set(parsed);
      }
    } catch (e) {
      console.error('Failed to load founder debug data', e);
    }
  }

  setDebugTab(tab: 'encrypted' | 'history' | 'saved' | 'subs' | 'algo') {
    this.debugTab.set(tab);
  }

  toggleAlgoModal() {
    this.showAlgoModal.update(v => !v);
  }

  updateSubscriptionWeight(event: Event) {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    const current = this.wetube.algoConfig();
    this.wetube.updateAlgoConfig({
      ...current,
      subscriptionWeight: val
    });
  }

  toggleHideWatched() {
    const current = this.wetube.algoConfig();
    this.wetube.updateAlgoConfig({
      ...current,
      hideWatched: !current.hideWatched
    });
  }

  toggleDataSaver() {
    const current = this.wetube.algoConfig();
    this.wetube.updateAlgoConfig({
      ...current,
      dataSaverEnabled: !current.dataSaverEnabled
    });
  }

  updateTargetUpscaleQuality(event: Event) {
    const select = event.target as HTMLSelectElement;
    if (select) {
      const current = this.wetube.algoConfig();
      this.wetube.updateAlgoConfig({
        ...current,
        targetUpscaleQuality: select.value
      });
    }
  }

  ngOnDestroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  private setupIntersectionObserver() {
    const options = {
      root: document.querySelector('.main-content'),
      rootMargin: '100px',
      threshold: 0.1
    };

    this.observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        this.loadMore();
      }
    }, options);

    const target = document.querySelector('#infinite-scroll-trigger');
    if (target) {
      this.observer.observe(target);
    }
  }

  loadMore() {
    const currentCount = this.visibleCount();
    const totalItems = this.standardVideosList().length;
    
    if (currentCount < totalItems) {
      setTimeout(() => {
        this.visibleCount.set(currentCount + 20);
      }, 100);
    } else if (this.wetube.hasMoreFeed() && !this.wetube.isFeedLoading()) {
      this.wetube.loadMoreTrending().then(() => {
        this.visibleCount.set(this.standardVideosList().length);
      });
    }
  }

  private checkOnboardingStatus() {
    if (this.needsOnboarding() && this.wetube.allHomeContent().length === 0) {
      this.router.navigate(['/stream/onboarding']);
    }
  }

  onCategoryClick(category: string) {
    this.wetube.setActiveCategory(category);
    if (category === 'الكل') {
      this.wetube.setSearchQuery('');
      this.wetube.searchSp.set('');
    } else if (category === 'المخزن المحلي') {
      // Scroll to Vault section at bottom
      const vaultElement = document.querySelector('#local-vault-section');
      if (vaultElement) {
        vaultElement.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (category !== 'تريند') {
      this.wetube.search(category);
    }
  }

  onSearchFilterClick(sp: string) {
    const query = this.wetube.searchQuery();
    if (query) {
      this.wetube.search(query, sp);
    }
  }

  openUpload() {
    this.showUploadModal.set(true);
  }

  goToOnboarding() {
    this.router.navigate(['/stream/onboarding']);
  }

  goToVault() {
    this.router.navigate(['/stream/vault']);
  }

  trackByVideoId(index: number, video: any): string {
    return video.id || index;
  }

  getAvatarUrl(video: any): string {
    if (video.channelAvatar && video.channelAvatar.sourcesize || (video.channelAvatar && video.channelAvatar.startsWith('http'))) return video.channelAvatar;
    if (video.channelAvatar && video.channelAvatar.startsWith('http')) return video.channelAvatar;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(video.author || 'Channel')}&background=random&color=fff&bold=true`;
  }
}
