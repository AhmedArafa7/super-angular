import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { FirebaseService } from '../../../../core/services/firebase.service';
import { YoutubeDiscoveryService } from '../../../../core/services/youtube-discovery.service';
import { LucideAngularModule, ShieldCheck, Trash2, CheckCircle2, Clock, PlayCircle, Eye, AlertCircle, RefreshCw, RefreshCcw, Search } from 'lucide-angular';
import { RouterModule } from '@angular/router';
import { QueryDocumentSnapshot } from 'firebase/firestore';

@Component({
  selector: 'app-wetube-moderation',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, RouterModule],
  templateUrl: './wetube-moderation.component.html'
})
export class WeTubeModerationComponent implements OnInit {
  private firebase = inject(FirebaseService);

  // Tabs: 'pending' | 'approved' | 'rejected' | 'channels'
  activeSubTab = signal<'pending' | 'approved' | 'rejected' | 'channels'>('pending');

  // Video Signals
  pendingVideos = signal<any[]>([]);
  approvedVideos = signal<any[]>([]);
  rejectedVideos = signal<any[]>([]);
  blacklistedChannels = signal<any[]>([]);

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

  isSyncingAvatars = signal<boolean>(false);

  private discoveryService = inject(YoutubeDiscoveryService);

  ngOnInit() {
    this.loadData();
  }

  setTab(tab: 'pending' | 'approved' | 'rejected' | 'channels') {
    this.activeSubTab.set(tab);
    if (this.needsLoading(tab)) {
      this.loadData();
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

  async loadData() {
    if (this.isLoading()) return;
    this.isLoading.set(true);

    const tab = this.activeSubTab();
    try {
      if (tab === 'pending') {
        const { videos, lastVisible } = await this.firebase.getVideosByStatus('pending_review', this.lastPendingDoc() || undefined);
        this.pendingVideos.update(list => [...list, ...videos]);
        this.lastPendingDoc.set(lastVisible);
        this.hasMorePending.set(videos.length === 20);
      } else if (tab === 'approved') {
        const { videos, lastVisible } = await this.firebase.getVideosByStatus('published', this.lastApprovedDoc() || undefined);
        this.approvedVideos.update(list => [...list, ...videos]);
        this.lastApprovedDoc.set(lastVisible);
        this.hasMoreApproved.set(videos.length === 20);
      } else if (tab === 'rejected') {
        const { videos, lastVisible } = await this.firebase.getVideosByStatus('rejected', this.lastRejectedDoc() || undefined);
        this.rejectedVideos.update(list => [...list, ...videos]);
        this.lastRejectedDoc.set(lastVisible);
        this.hasMoreRejected.set(videos.length === 20);
      } else if (tab === 'channels') {
        const { channels, lastVisible } = await this.firebase.getBlacklistedChannelsList(this.lastChannelDoc() || undefined);
        this.blacklistedChannels.update(list => [...list, ...channels]);
        this.lastChannelDoc.set(lastVisible);
        this.hasMoreChannels.set(channels.length === 20);
      }
    } catch (err) {
      console.error('Error loading moderation data', err);
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
}
