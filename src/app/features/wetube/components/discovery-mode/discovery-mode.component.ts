import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { YoutubeDiscoveryService } from '../../../../core/services/youtube-discovery.service';
import { FirebaseService } from '../../../../core/services/firebase.service';
import { IndexedDBService } from '../../../../core/services/indexed-db.service';
import { FeedVideo } from '../../wetube.model';
import { LucideAngularModule, ShieldBan, CheckCircle2, RefreshCcw, Search } from 'lucide-angular';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-discovery-mode',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FormsModule],
  templateUrl: './discovery-mode.component.html'
})
export class DiscoveryModeComponent implements OnInit {
  private discoveryService = inject(YoutubeDiscoveryService);
  private firebaseService = inject(FirebaseService);
  private idb = inject(IndexedDBService);

  videos = signal<FeedVideo[]>([]);
  isLoading = signal<boolean>(false);
  searchQuery = signal<string>('');
  activePlayingId = signal<string | null>(null);

  private sanitizer = inject(DomSanitizer);

  // Lucide icons
  ShieldBan = ShieldBan;
  CheckCircle2 = CheckCircle2;
  RefreshCcw = RefreshCcw;
  Search = Search;

  async ngOnInit() {
    await this.syncBlacklist();
    this.fetchTrending();
  }

  private async syncBlacklist() {
    const remoteBlacklist = await this.firebaseService.syncBlacklistedChannels();
    
    // Wipe local and re-populate
    const currentLocal = await this.idb.getAll('blacklisted_channels');
    if (currentLocal) {
      for (const item of currentLocal) {
        await this.idb.delete('blacklisted_channels', item.id);
      }
    }
    
    for (const id of remoteBlacklist) {
      await this.idb.put('blacklisted_channels', { id });
    }
    console.log('[DiscoveryMode] Synced blacklist to IndexedDB, count:', remoteBlacklist.length);
  }

  async fetchTrending() {
    this.isLoading.set(true);
    this.videos.set([]);
    this.discoveryService.fetchTrending().subscribe({
      next: async (vids) => {
        await this.processAndFilterVideos(vids);
      },
      error: () => this.isLoading.set(false)
    });
  }

  async searchVideos() {
    if (!this.searchQuery().trim()) return;
    this.isLoading.set(true);
    this.videos.set([]);
    this.discoveryService.searchYouTube(this.searchQuery()).subscribe({
      next: async (vids) => {
        await this.processAndFilterVideos(vids);
      },
      error: () => this.isLoading.set(false)
    });
  }

  private async processAndFilterVideos(vids: FeedVideo[]) {
    // 1. Local Blacklist Filter (Client-side)
    const localBlacklist = await this.idb.getAll('blacklisted_channels');
    const blacklistSet = new Set(localBlacklist?.map(b => b.id) || []);

    let filtered = vids.filter(v => !blacklistSet.has(v.authorId));

    // 2. Server-side Whitelist check (in chunks)
    if (filtered.length > 0) {
      const videoIds = filtered.map(v => v.id);
      const existingInWhitelist = await this.firebaseService.checkVideosExist(videoIds);
      const whitelistSet = new Set(existingInWhitelist);
      
      filtered = filtered.filter(v => !whitelistSet.has(v.id));
    }

    this.videos.set(filtered);
    this.isLoading.set(false);
  }

  async addToWhitelist(video: FeedVideo) {
    try {
      await this.firebaseService.addVideoToWhitelist(video);
      // Remove from UI
      this.videos.update(vids => vids.filter(v => v.id !== video.id));
    } catch (err) {
      console.error('Failed to whitelist video', err);
      alert('حدث خطأ أثناء إضافة الفيديو.');
    }
  }

  async blacklistChannel(channelId: string, channelName: string) {
    if (!confirm(`هل أنت متأكد من حظر قناة "${channelName}"؟ لن تظهر مجدداً في قائمة المراجعة.`)) return;

    try {
      // 1. Save to Firebase
      await this.firebaseService.blacklistChannel(channelId, channelName);
      
      // 2. Update local IDB cache
      await this.idb.put('blacklisted_channels', { id: channelId });
      
      // 3. Instantly remove all videos by this channel from the current UI
      this.videos.update(vids => vids.filter(v => v.authorId !== channelId));
      
    } catch (err) {
      console.error('Failed to blacklist channel', err);
      alert('حدث خطأ أثناء حظر القناة.');
    }
  }

  playVideo(id: string) {
    this.activePlayingId.set(id);
  }

  getSafeEmbedUrl(id: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube.com/embed/${id}?autoplay=1`);
  }
}
