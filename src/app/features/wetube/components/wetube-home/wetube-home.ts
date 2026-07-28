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

  // Seeded Quran Recitations Feed
  defaultQuranVideos: ContentItem[] = [
    {
      id: 'quran_seed_1',
      title: 'تلاوة خاشعة تريح القلوب - سورة الكهف كاملة بصوت عذب',
      source: 'youtube',
      author: 'القارئ الشيخ عبد الباسط عبد الصمد',
      thumbnail: 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?q=80&w=800&auto=format&fit=crop',
      url: 'https://youtu.be/2Vn1pM1c8tU',
      duration: '35:20',
      views: '4.5M',
      category: 'قرآن كريم',
      time: 'موصى به'
    },
    {
      id: 'quran_seed_2',
      title: 'أجمل تلاوات القرآن الكريم - سورة يس والواقعة والرحمان',
      source: 'youtube',
      author: 'قناة التلاوات الخاشعة',
      thumbnail: 'https://images.unsplash.com/photo-1585036156171-384164a8c675?q=80&w=800&auto=format&fit=crop',
      url: 'https://youtu.be/77ZozI0rw7w',
      duration: '1:12:05',
      views: '2.1M',
      category: 'قرآن كريم',
      time: 'موصى به'
    },
    {
      id: 'quran_seed_3',
      title: 'سورة يوسف كاملة بصوت نقي جودة عالية',
      source: 'youtube',
      author: 'روائع القرآن الكريم',
      thumbnail: 'https://images.unsplash.com/photo-1597935258735-e254c1839512?q=80&w=800&auto=format&fit=crop',
      url: 'https://youtu.be/3f_s05Qy3_4',
      duration: '42:15',
      views: '1.8M',
      category: 'قرآن كريم',
      time: 'موصى به'
    },
    {
      id: 'quran_seed_4',
      title: 'تلاوات خاشعة لتهدئة الأعصاب والنوم بسلام',
      source: 'youtube',
      author: 'نفحات قرآنية',
      thumbnail: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?q=80&w=800&auto=format&fit=crop',
      url: 'https://youtu.be/2Vn1pM1c8tU',
      duration: '50:10',
      views: '3.9M',
      category: 'قرآن كريم',
      time: 'موصى به'
    }
  ];

  // Seeded Ansheed & Nasheed (Without Music)
  defaultAnsheedVideos: ContentItem[] = [
    {
      id: 'ansheed_seed_1',
      title: 'أنشودة مولاي صلي وسلم دائماً أبداً - ابتهال روحاني عذب',
      source: 'youtube',
      author: 'منشد التراث الإسلامي',
      thumbnail: 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?q=80&w=800&auto=format&fit=crop',
      url: 'https://youtu.be/1_A48f2S79A',
      duration: '05:40',
      views: '3.2M',
      category: 'أناشيد وابتهالات',
      time: 'موصى به'
    },
    {
      id: 'ansheed_seed_2',
      title: 'أنشودة سوف نبقى هنا - فيديو كليب مؤثر بدون موسيقى',
      source: 'youtube',
      author: 'روائع الأناشيد الهادفة',
      thumbnail: 'https://images.unsplash.com/photo-1519817650390-64a93db51149?q=80&w=800&auto=format&fit=crop',
      url: 'https://youtu.be/G8a5b2N9870',
      duration: '04:12',
      views: '5.6M',
      category: 'أناشيد وابتهالات',
      time: 'موصى به'
    },
    {
      id: 'ansheed_seed_3',
      title: 'ابتهالات فجرية خاشعة - قمر سيدنا النبي (بدون موسيقى)',
      source: 'youtube',
      author: 'مجموعة الأناشيد العذبة',
      thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop',
      url: 'https://youtu.be/K9J0X39Zz5U',
      duration: '06:18',
      views: '1.4M',
      category: 'أناشيد وابتهالات',
      time: 'موصى به'
    },
    {
      id: 'ansheed_seed_4',
      title: 'أنشودة رحمن يا رحمن - بصوت شجي يدخل القلوب',
      source: 'youtube',
      author: 'صوت الحكمة والأناشيد',
      thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop',
      url: 'https://youtu.be/1_A48f2S79A',
      duration: '04:55',
      views: '2.8M',
      category: 'أناشيد وابتهالات',
      time: 'موصى به'
    }
  ];

  // Seeded Explore Videos per Topic
  defaultExploreVideos: Record<string, ContentItem[]> = {
    'رسوم متحركة': [
      {
        id: 'exp_cart_1',
        title: 'محاكمة عم خليل !! - مجمع حلقات طحالب الموسم الثالث',
        source: 'youtube',
        author: 'أمة توون - Ummah Toon',
        thumbnail: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop',
        url: 'https://youtu.be/tP2c2WwN4_M',
        duration: '13:37',
        views: '63K',
        category: 'رسوم متحركة',
        time: 'قبل 3 أيام'
      },
      {
        id: 'exp_cart_2',
        title: 'لماذا يكره الجميع ستيفن يونيفرس؟ تحليل شخصيات أنيميشن',
        source: 'youtube',
        author: 'AniMates',
        thumbnail: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=800&auto=format&fit=crop',
        url: 'https://youtu.be/x4V6z1_1yWk',
        duration: '29:45',
        views: '266K',
        category: 'رسوم متحركة',
        time: 'قبل 4 أيام'
      }
    ],
    'ألعاب ومغامرات': [
      {
        id: 'exp_game_1',
        title: 'مغامرة بناء مدينة أحلام المستقبل - تجربة العوالم المفتوحة',
        source: 'youtube',
        author: 'عالم الألعاب الذكية',
        thumbnail: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=800&auto=format&fit=crop',
        url: 'https://youtu.be/9bZkp7q19f0',
        duration: '22:15',
        views: '150K',
        category: 'ألعاب ومغامرات',
        time: 'قبل أسبوع'
      }
    ],
    'تكنولوجيا وبرمجة': [
      {
        id: 'exp_tech_1',
        title: 'شرح كامل لمعالجات ARM وهندسة البرمجيات الحديثة 2026',
        source: 'youtube',
        author: 'عالم التقنية البرمجية',
        thumbnail: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=800&auto=format&fit=crop',
        url: 'https://youtu.be/dQw4w9WgXcQ',
        duration: '18:40',
        views: '410K',
        category: 'تكنولوجيا وبرمجة',
        time: 'قبل يومين'
      }
    ],
    'علوم وصحة': [
      {
        id: 'exp_sci_1',
        title: 'كيف يعمل العقل البشري أثناء التركيز والتعلم الصائم؟',
        source: 'youtube',
        author: 'أكاديمية العلوم والمعرفة',
        thumbnail: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=800&auto=format&fit=crop',
        url: 'https://youtu.be/2Vn1pM1c8tU',
        duration: '15:10',
        views: '88K',
        category: 'علوم وصحة',
        time: 'قبل 5 أيام'
      }
    ],
    'تطوير الذات': [
      {
        id: 'exp_dev_1',
        title: 'خطة عمل إنجاز الأهداف وتوزيع المهام اليومية بذكاء',
        source: 'youtube',
        author: 'منصة النجاح والإنتاجية',
        thumbnail: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=80&w=800&auto=format&fit=crop',
        url: 'https://youtu.be/3f_s05Qy3_4',
        duration: '12:50',
        views: '320K',
        category: 'تطوير الذات',
        time: 'قبل أسبوع'
      }
    ],
    'كرة القدم': [
      {
        id: 'exp_foot_1',
        title: 'تحليل الخطط التكتيكية واللمسات الإبداعية لأساطير الكرة',
        source: 'youtube',
        author: 'تحليل المباريات الرياضية',
        thumbnail: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=800&auto=format&fit=crop',
        url: 'https://youtu.be/77ZozI0rw7w',
        duration: '14:20',
        views: '540K',
        category: 'كرة القدم',
        time: 'قبل 3 أيام'
      }
    ]
  };

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
    if (video.channelAvatar) return video.channelAvatar;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(video.author || 'Channel')}&background=random&color=fff`;
  }
}
