import { Component, OnInit, inject, signal, computed, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PipedApiService } from '../../../../core/services/piped-api.service';
import { IndexedDBService } from '../../../../core/services/indexed-db.service';
import { WeTubeService } from '../../wetube.service';
import { LucideAngularModule, Bell, Share2, Play } from 'lucide-angular';
import { VideoCardComponent } from '../video-card/video-card.component';
import { SkeletonLoaderComponent } from '../skeleton-loader/skeleton-loader.component';

@Component({
  selector: 'app-wetube-channel',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, VideoCardComponent, SkeletonLoaderComponent],
  template: `
    <div class="channel-page w-full min-h-screen bg-[#0f0f0f] text-white overflow-y-auto pb-20 hide-scrollbar" (scroll)="onScroll($event)">
      @if (isLoadingMeta()) {
        <!-- Skeleton for Banner -->
        <app-skeleton-loader type="banner"></app-skeleton-loader>
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-10 flex items-end gap-6 mb-8">
          <app-skeleton-loader type="avatar"></app-skeleton-loader>
          <div class="flex-1 pb-4">
            <app-skeleton-loader type="title"></app-skeleton-loader>
            <div class="mt-2"><app-skeleton-loader type="text"></app-skeleton-loader></div>
          </div>
        </div>
      } @else if (channelData()) {
        <!-- Banner -->
        <div class="w-full h-48 md:h-64 lg:h-80 relative overflow-hidden bg-gray-900">
          @if (channelData()?.bannerUrl) {
            <img [src]="channelData().bannerUrl" class="w-full h-full object-cover opacity-80" alt="Channel Banner">
          }
          <div class="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] to-transparent"></div>
        </div>

        <!-- Channel Info Header -->
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 md:-mt-24 relative z-10 flex flex-col md:flex-row items-start md:items-end gap-4 md:gap-6 mb-8">
          <div class="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-[#0f0f0f] bg-gray-800 shrink-0">
            <img [src]="channelData().avatarUrl" class="w-full h-full object-cover" [alt]="channelData().name">
          </div>
          <div class="flex-1 pb-2">
            <h1 class="text-2xl md:text-4xl font-bold mb-1">{{ channelData().name }}</h1>
            <div class="flex items-center text-sm md:text-base text-gray-400 gap-2 mb-3">
              <span>{{ channelData().subscriberCount | number }} مشترك</span>
              <span>•</span>
              <span>{{ channelData().videoCount | number }} فيديو</span>
            </div>
            <p class="text-sm text-gray-400 line-clamp-2 max-w-2xl">{{ channelData().description }}</p>
          </div>
          <div class="flex items-center gap-3 pb-2 w-full md:w-auto">
            <button 
              class="flex-1 md:flex-none px-6 py-2.5 rounded-full font-medium flex items-center justify-center gap-2 transition-all"
              [ngClass]="isSubscribed() ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-white text-black hover:bg-gray-200'"
              (click)="toggleSubscribe()"
            >
              @if (isSubscribed()) {
                <lucide-icon [img]="Bell" size="18" class="mr-1"></lucide-icon> مشترك
              } @else {
                اشتراك
              }
            </button>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="border-b border-gray-800 mb-6">
          <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-8">
            <button class="pb-3 border-b-2 border-white text-white font-medium">الفيديوهات</button>
            <button class="pb-3 border-b-2 border-transparent text-gray-400 hover:text-white font-medium">قوائم التشغيل</button>
            <button class="pb-3 border-b-2 border-transparent text-gray-400 hover:text-white font-medium">المنتدى</button>
          </div>
        </div>

        <!-- Videos Grid -->
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-x-4 md:gap-y-8">
            @for (video of videos(); track video.id) {
              <app-video-card 
                [video]="video" 
                (click)="playVideo(video.id)"
              ></app-video-card>
            }
            
            @if (isLoadingFeed()) {
              @for (i of [1,2,3,4,5,6,7,8]; track i) {
                <app-skeleton-loader type="video-card"></app-skeleton-loader>
              }
            }
          </div>
          
          <!-- Infinite Scroll Trigger -->
          <div #scrollTrigger class="w-full h-20 flex items-center justify-center mt-4">
            @if (isLoadingFeed()) {
              <div class="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            }
          </div>
        </div>
      } @else {
        <!-- Error State -->
        <div class="w-full h-full min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
          <div class="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
            <lucide-icon [img]="Bell" class="w-10 h-10 text-red-500 opacity-80"></lucide-icon>
          </div>
          <h2 class="text-2xl font-bold text-white mb-3">عذراً، لم نتمكن من تحميل بيانات القناة</h2>
          <p class="text-slate-400 mb-6 max-w-md">قد تكون القناة غير متاحة حالياً أو هناك مشكلة في الاتصال بالخادم. يرجى المحاولة مرة أخرى لاحقاً.</p>
          <button class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all" (click)="loadChannelData(channelId())">
            إعادة المحاولة
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .hide-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
    .hide-scrollbar::-webkit-scrollbar {
      display: none;
    }
  `],
  host: {
    class: 'block h-full'
  }
})
export class WeTubeChannelComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private piped = inject(PipedApiService);
  private idb = inject(IndexedDBService);
  private wetube = inject(WeTubeService);

  Bell = Bell;
  Share2 = Share2;
  Play = Play;

  channelId = signal<string>('');
  channelData = signal<any>(null);
  videos = signal<any[]>([]);
  nextpage = signal<string>('');
  
  isLoadingMeta = signal<boolean>(true);
  isLoadingFeed = signal<boolean>(false);
  isSubscribed = signal<boolean>(false);

  @ViewChild('scrollTrigger') scrollTrigger?: ElementRef<HTMLElement>;
  private observer?: IntersectionObserver;

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id && id !== this.channelId()) {
        this.channelId.set(id);
        this.resetState();
        this.loadChannelData(id);
      }
    });
  }

  private resetState() {
    this.channelData.set(null);
    this.videos.set([]);
    this.nextpage.set('');
    this.isLoadingMeta.set(true);
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  async loadChannelData(id: string) {
    this.isLoadingMeta.set(true);
    this.checkSubscriptionStatus(id);

    const META_TTL = 30 * 24 * 60 * 60 * 1000; // 14 days TTL for channel meta
    const FEED_TTL = 2 * 60 * 60 * 1000;       // 2 hours TTL for video feeds

    // 1. Try Cache for Meta (TTL 14 days)
    const cachedMeta = await this.idb.getWithTTL('channel_meta', id, META_TTL);
    
    // 2. Try Cache for Feed (TTL 2 hours)
    const cachedFeed = await this.idb.getWithTTL('channel_feed', id, FEED_TTL);

    if (cachedMeta) {
      // Renew TTL on visit so active channels stay cached
      await this.idb.setWithTTL('channel_meta', cachedMeta);
    }

    if (cachedMeta && cachedFeed) {
      this.channelData.set(cachedMeta);
      this.videos.set(cachedFeed.videos || []);
      this.nextpage.set(cachedFeed.nextpage || '');
      this.isLoadingMeta.set(false);
      this.setupIntersectionObserver();
      return;
    }

    // 3. Fetch from Piped API if cache is missing or expired
    try {
      const data = await this.piped.getChannelDetails(id);
      
      const meta = {
        channelId: id,
        name: data.name,
        avatarUrl: data.avatarUrl,
        bannerUrl: data.bannerUrl,
        subscriberCount: data.subscriberCount,
        videoCount: 0, // Not always provided by Piped directly, keep generic
        description: data.description
      };
      
      this.channelData.set(meta);
      
      const mappedVideos = (data.relatedStreams || []).map((v: any) => ({
        id: v.url.split('v=')[1] || v.url,
        title: v.title,
        thumbnail: v.thumbnail,
        author: meta.name,
        authorId: id,
        views: v.views,
        time: v.uploadedDate || '',
        duration: v.duration > 0 ? this.formatDuration(v.duration) : '',
        channelAvatar: meta.avatarUrl
      }));

      this.videos.set(mappedVideos);
      this.nextpage.set(data.nextpage || '');

      // Save to Cache
      await this.idb.setWithTTL('channel_meta', meta);
      await this.idb.setWithTTL('channel_feed', { channelId: id, videos: mappedVideos, nextpage: data.nextpage });

      this.isLoadingMeta.set(false);
      this.setupIntersectionObserver();
    } catch (e) {
      console.error('Failed to load channel details', e);
      this.isLoadingMeta.set(false);
    }
  }

  private setupIntersectionObserver() {
    setTimeout(() => {
      if (!this.scrollTrigger?.nativeElement) return;
      
      this.observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && this.nextpage() && !this.isLoadingFeed()) {
          this.loadMoreVideos();
        }
      }, { threshold: 0.1 });
      
      this.observer.observe(this.scrollTrigger.nativeElement);
    }, 500);
  }

  private async loadMoreVideos() {
    if (!this.nextpage() || this.isLoadingFeed()) return;
    
    this.isLoadingFeed.set(true);
    try {
      const id = this.channelId();
      const data = await this.piped.getChannelDetails(id, this.nextpage());
      
      const meta = this.channelData();
      const newVideos = (data.relatedStreams || []).map((v: any) => ({
        id: v.url.split('v=')[1] || v.url,
        title: v.title,
        thumbnail: v.thumbnail,
        author: meta.name,
        authorId: id,
        views: v.views,
        time: v.uploadedDate || '',
        duration: v.duration > 0 ? this.formatDuration(v.duration) : '',
        channelAvatar: meta.avatarUrl
      }));

      this.videos.update(v => [...v, ...newVideos]);
      this.nextpage.set(data.nextpage || '');
      
      // Update Feed Cache (do NOT overwrite meta cache)
      await this.idb.setWithTTL('channel_feed', { channelId: id, videos: this.videos(), nextpage: this.nextpage() });

    } catch (e) {
      console.error('Failed to load more videos', e);
    } finally {
      this.isLoadingFeed.set(false);
    }
  }

  onScroll(event: Event) {
    // Optional: add navbar effects on scroll
  }

  playVideo(id: string) {
    this.router.navigate(['/stream/watch', id]);
  }

  private checkSubscriptionStatus(id: string) {
    const meta = this.channelData();
    const isSub = this.wetube.isSubscribedToChannel(id, meta?.name);
    this.isSubscribed.set(isSub);
  }

  async toggleSubscribe() {
    const meta = this.channelData();
    if (!meta) return;
    
    const isNowSubscribed = await this.wetube.toggleSubscription(meta.channelId, meta.name, meta.avatarUrl);
    this.isSubscribed.set(isNowSubscribed);
  }

  private formatDuration(seconds: number): string {
    if (!seconds) return '';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
