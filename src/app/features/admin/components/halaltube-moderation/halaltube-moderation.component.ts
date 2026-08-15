import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { FirebaseService } from '../../../../core/services/firebase.service';
import { YoutubeDiscoveryService } from '../../../../core/services/youtube-discovery.service';
import { IndexedDBService } from '../../../../core/services/indexed-db.service';
import { LucideAngularModule, ShieldCheck, Trash2, CheckCircle2, Clock, PlayCircle, Eye, AlertCircle, RefreshCw, RefreshCcw, Search, Database } from 'lucide-angular';
import { RouterModule } from '@angular/router';
import { QueryDocumentSnapshot } from 'firebase/firestore';

@Component({
  selector: 'app-halaltube-moderation',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, RouterModule],
  templateUrl: './halaltube-moderation.component.html'
})
export class halaltubeModerationComponent implements OnInit {
  private firebase = inject(FirebaseService);

  // Tabs: 'pending' | 'approved' | 'rejected' | 'channels' | 'local_storage' | 'whitelisted_channels'
  activeSubTab = signal<'pending' | 'approved' | 'rejected' | 'channels' | 'local_storage' | 'whitelisted_channels'>('pending');

  // Video Signals
  pendingVideos = signal<any[]>([]);
  approvedVideos = signal<any[]>([]);
  rejectedVideos = signal<any[]>([]);
  blacklistedChannels = signal<any[]>([]);
  localStoredVideos = signal<any[]>([]);
  whitelistedChannels = signal<any[]>([]);
  selectedChannel = signal<any | null>(null);

  // Pagination Trackers
  lastPendingDoc = signal<QueryDocumentSnapshot | null>(null);
  lastApprovedDoc = signal<QueryDocumentSnapshot | null>(null);
  lastRejectedDoc = signal<QueryDocumentSnapshot | null>(null);
  lastChannelDoc = signal<QueryDocumentSnapshot | null>(null);

  // Loading States
  isLoading = signal<boolean>(false);
  hasMorePending = signal<boolean>(true);
  hasMoreApproved = signal<boolean>(true);
  hasMoreRejected = signal<boolean>(true);
  hasMoreChannels = signal<boolean>(true);

  // Icons
  ShieldCheck = ShieldCheck;
  Trash2 = Trash2;
  CheckCircle2 = CheckCircle2;
  Clock = Clock;
  PlayCircle = PlayCircle;
  Eye = Eye;
  AlertCircle = AlertCircle;
  RefreshCw = RefreshCw;
  RefreshCcw = RefreshCcw;
  Search = Search;
  Database = Database;

  isSyncingAvatars = signal<boolean>(false);

  private discoveryService = inject(YoutubeDiscoveryService);
  private idbService = inject(IndexedDBService);

  ngOnInit() {
    this.loadData();
  }

  setTab(tab: 'pending' | 'approved' | 'rejected' | 'channels' | 'local_storage' | 'whitelisted_channels') {
    const isSameTab = this.activeSubTab() === tab;
    this.activeSubTab.set(tab);
    
    if (isSameTab || this.needsLoading(tab)) {
      this.loadData(true);
    }
    if (tab === 'local_storage') {
      this.loadLocalStorage();
    }
    if (tab === 'whitelisted_channels' && this.whitelistedChannels().length === 0) {
      this.loadWhitelistedChannels();
    }
  }

  async loadWhitelistedChannels() {
    this.isLoading.set(true);
    try {
      const [{ videos }, firestoreChannels] = await Promise.all([
        this.firebase.getVideosByStatus('published', undefined, 200),
        this.firebase.getWhitelistedChannels()
      ]);

      const firestoreChannelMap = new Map<string, any>();
      for (const fc of firestoreChannels) {
        firestoreChannelMap.set(fc.channelId || fc.id, fc);
      }

      const channelMap = new Map<string, { authorId: string; author: string; count: number; thumbnail: string; status: 'trusted' | 'probation' | 'blacklisted'; videos: any[] }>();
      
      for (const v of videos) {
        const key = v.authorId || v.author || 'unknown';
        const meta = firestoreChannelMap.get(key) || {};

        if (!channelMap.has(key)) {
          channelMap.set(key, {
            authorId: v.authorId || key,
            author: v.author || meta.channelName || 'قناة غير معروفة',
            count: 0,
            thumbnail: v.thumbnail || '',
            status: meta.status || 'trusted',
            videos: []
          });
        }
        const entry = channelMap.get(key)!;
        entry.count++;
        entry.videos.push(v);
      }

      this.whitelistedChannels.set(Array.from(channelMap.values()));
    } catch (e) {
      console.error('Failed to load whitelisted channels', e);
    } finally {
      this.isLoading.set(false);
    }
  }

  private needsLoading(tab: string): boolean {
    if (tab === 'pending' && this.pendingVideos().length === 0 && this.hasMorePending()) return true;
    if (tab === 'approved' && this.approvedVideos().length === 0 && this.hasMoreApproved()) return true;
    if (tab === 'rejected' && this.rejectedVideos().length === 0 && this.hasMoreRejected()) return true;
    if (tab === 'channels' && this.blacklistedChannels().length === 0 && this.hasMoreChannels()) return true;
    return false;
  }

  extractYoutubeId(urlOrId: string): string | null {
    if (!urlOrId) return null;
    if (urlOrId.length === 11 && /^[a-zA-Z0-9_-]{11}$/.test(urlOrId)) return urlOrId;
    const match = urlOrId.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([^&?\n]+)/);
    return match ? match[1] : null;
  }

  getSafeThumbnail(video: any): string {
    if (video.source === 'youtube' || (video.url && video.url.includes('youtube'))) {
       const id = this.extractYoutubeId(video.url || video.externalUrl || video.id);
       if (id) return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
    }
    return video.thumbnail || 'assets/placeholder.jpg';
  }

  async syncMissingAvatars() {
    this.isSyncingAvatars.set(true);
    try {
      // 1. Fetch all videos to find those missing avatars
      const allVideosSnapshot = await this.firebase.getPublishedVideos(undefined, 1000);
      const pendingVideosSnapshot = await this.firebase.getVideosByStatus('pending_review', undefined, 1000);
      
      const allVideos = [...allVideosSnapshot.videos, ...pendingVideosSnapshot.videos];
      const missingAvatars = allVideos.filter(v => v.source === 'youtube' && !v.channelAvatar);
      
      let updatedCount = 0;

      for (const video of missingAvatars) {
        const ytId = this.extractYoutubeId(video.externalUrl || video.url || video.id);
        if (ytId) {
          try {
            const details = await firstValueFrom(this.discoveryService.fetchVideoDetails(ytId));
            if (details && details.channelAvatar) {
              await this.firebase.updateVideoData(video.id, { channelAvatar: details.channelAvatar });
              updatedCount++;
            }
          } catch (err) {
            console.error(`Failed to fetch avatar for ${ytId}`, err);
          }
        }
      }
      
      alert(`تم مزامنة صور القنوات لـ ${updatedCount} فيديو بنجاح!`);
      // Reload UI to show the new avatars
      this.loadData();
    } catch (err) {
      console.error('Sync failed', err);
      alert('حدث خطأ أثناء المزامنة.');
    } finally {
      this.isSyncingAvatars.set(false);
    }
  }

  refreshCurrentTab() {
    this.loadData(true);
  }

  async loadData(forceRefresh = false) {
    if (this.isLoading()) return;
    this.isLoading.set(true);

    const tab = this.activeSubTab();
    try {
      if (tab === 'pending') {
        if (forceRefresh) {
          this.pendingVideos.set([]);
          this.lastPendingDoc.set(null);
        }
        const { videos, lastVisible } = await this.firebase.getVideosByStatus('pending_review', this.lastPendingDoc() || undefined, 100);
        
        this.pendingVideos.update(existing => {
          const combined = forceRefresh ? videos : [...existing, ...videos];
          const map = new Map<string, any>();
          combined.forEach(v => map.set(v.id, v));
          return Array.from(map.values());
        });
        this.lastPendingDoc.set(lastVisible);
        this.hasMorePending.set(videos.length >= 100);

      } else if (tab === 'approved') {
        if (forceRefresh) {
          this.approvedVideos.set([]);
          this.lastApprovedDoc.set(null);
        }
        const { videos, lastVisible } = await this.firebase.getVideosByStatus('published', this.lastApprovedDoc() || undefined, 100);
        
        this.approvedVideos.update(existing => {
          const combined = forceRefresh ? videos : [...existing, ...videos];
          const map = new Map<string, any>();
          combined.forEach(v => map.set(v.id, v));
          return Array.from(map.values());
        });
        this.lastApprovedDoc.set(lastVisible);
        this.hasMoreApproved.set(videos.length >= 100);

      } else if (tab === 'rejected') {
        if (forceRefresh) {
          this.rejectedVideos.set([]);
          this.lastRejectedDoc.set(null);
        }
        const { videos, lastVisible } = await this.firebase.getVideosByStatus('rejected', this.lastRejectedDoc() || undefined, 100);
        
        this.rejectedVideos.update(existing => {
          const combined = forceRefresh ? videos : [...existing, ...videos];
          const map = new Map<string, any>();
          combined.forEach(v => map.set(v.id, v));
          return Array.from(map.values());
        });
        this.lastRejectedDoc.set(lastVisible);
        this.hasMoreRejected.set(videos.length >= 100);

      } else if (tab === 'channels') {
        if (forceRefresh) {
          this.blacklistedChannels.set([]);
          this.lastChannelDoc.set(null);
        }
        const { channels, lastVisible } = await this.firebase.getBlacklistedChannelsList(this.lastChannelDoc() || undefined, 100);
        this.blacklistedChannels.update(existing => {
          const combined = forceRefresh ? channels : [...existing, ...channels];
          const map = new Map<string, any>();
          combined.forEach(c => map.set(c.id, c));
          return Array.from(map.values());
        });
        this.lastChannelDoc.set(lastVisible);
        this.hasMoreChannels.set(channels.length >= 100);
      }
    } catch (err) {
      console.error('Error loading moderation data', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadLocalStorage() {
    this.isLoading.set(true);
    try {
      const data = await this.idbService.getAll('saved_videos');
      // Sort by cachedAt descending
      this.localStoredVideos.set(data.sort((a, b) => (b.cachedAt || 0) - (a.cachedAt || 0)));
    } catch (e) {
      console.error(e);
    } finally {
      this.isLoading.set(false);
    }
  }

  // --- OPTIMISTIC UPDATES ---

  async changeVideoStatus(video: any, currentTab: string, newStatus: 'published' | 'rejected') {
    // Optimistic UI Update
    if (currentTab === 'pending') {
      this.pendingVideos.update(list => list.filter(v => v.id !== video.id));
    } else if (currentTab === 'approved') {
      this.approvedVideos.update(list => list.filter(v => v.id !== video.id));
    } else if (currentTab === 'rejected') {
      this.rejectedVideos.update(list => list.filter(v => v.id !== video.id));
    }

    const updatedVideo = { ...video, status: newStatus };
    if (newStatus === 'published') {
      this.approvedVideos.update(list => [updatedVideo, ...list]);
    } else if (newStatus === 'rejected') {
      this.rejectedVideos.update(list => [updatedVideo, ...list]);
    }

    try {
      await this.firebase.updateVideoStatus(video.id, newStatus);
    } catch (err) {
      console.error('Failed to update video status, rolling back...', err);
      // Rollback Optimistic UI (naive rollback)
      if (newStatus === 'published') this.approvedVideos.update(list => list.filter(v => v.id !== video.id));
      if (newStatus === 'rejected') this.rejectedVideos.update(list => list.filter(v => v.id !== video.id));
      
      if (currentTab === 'pending') this.pendingVideos.update(list => [video, ...list]);
      if (currentTab === 'approved') this.approvedVideos.update(list => [video, ...list]);
      if (currentTab === 'rejected') this.rejectedVideos.update(list => [video, ...list]);
      alert('فشل تحديث حالة الفيديو. يرجى المحاولة مرة أخرى.');
    }
  }

  async unbanChannel(channel: any) {
    if (!confirm(`هل تريد بالتأكيد فك الحظر عن قناة "${channel.channelName}"؟`)) return;

    // Optimistic
    this.blacklistedChannels.update(list => list.filter(c => c.id !== channel.id));

    try {
      await this.firebase.removeBlacklistedChannel(channel.id);
    } catch (err) {
      // Rollback
      this.blacklistedChannels.update(list => [channel, ...list]);
      console.error('Failed to unban channel', err);
      alert('فشل فك الحظر عن القناة.');
    }
  }

  inspectChannel(channel: any) {
    this.selectedChannel.set(channel);
  }

  closeChannelModal() {
    this.selectedChannel.set(null);
  }

  async putChannelOnProbation(channel: any) {
    if (!confirm(`هل تريد وضع قناة "${channel.author}" تحت الملاحظة (Probation)؟ أي فيديوهات قادمة ستتطلب مراجعة يدوية.`)) return;

    this.isLoading.set(true);
    try {
      await this.firebase.setChannelTrustStatus(channel.authorId, channel.author, 'probation', 'وضع يدوي تحت الملاحظة');
      await this.loadWhitelistedChannels();
      this.selectedChannel.set(null);
      alert(`تم وضع قناة "${channel.author}" تحت الملاحظة بنجاح.`);
    } catch (e) {
      console.error(e);
      alert('حدث خطأ أثناء تحديث حالة القناة.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async restoreChannelTrust(channel: any) {
    if (!confirm(`هل تريد إعادة توثيق قناة "${channel.author}" كقناة موثوقة (Trusted)؟`)) return;

    this.isLoading.set(true);
    try {
      await this.firebase.setChannelTrustStatus(channel.authorId, channel.author, 'trusted');
      await this.loadWhitelistedChannels();
      this.selectedChannel.set(null);
      alert(`تم توثيق قناة "${channel.author}" بنجاح.`);
    } catch (e) {
      console.error(e);
      alert('حدث خطأ أثناء تحديث حالة القناة.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async revokeChannelApproval(channel: any) {
    if (!confirm(`هل أنت متأكد من إلغاء اعتماد قناة "${channel.author}" وحظرها وإزالة جميع فيديوهاتها (${channel.videos.length})؟`)) {
      return;
    }

    this.isLoading.set(true);
    try {
      await this.firebase.blacklistChannel(channel.authorId, channel.author);

      for (const video of channel.videos) {
        await this.firebase.updateVideoStatus(video.id, 'rejected');
      }

      this.whitelistedChannels.update(list => list.filter(c => c.authorId !== channel.authorId));
      this.selectedChannel.set(null);
      alert(`تم بنجاح إلغاء اعتماد القناة وحظرها وإزالة ${channel.videos.length} فيديو.`);
    } catch (e) {
      console.error('Failed to revoke channel approval', e);
      alert('حدث خطأ أثناء إلغاء اعتماد القناة.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
