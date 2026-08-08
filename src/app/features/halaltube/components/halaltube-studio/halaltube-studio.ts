import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FirebaseService } from '../../../../core/services/firebase.service';
import { halaltubeService } from '../../halaltube.service';
import { PipedApiService } from '../../../../core/services/piped-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { doc, updateDoc } from 'firebase/firestore';
import { LucideAngularModule, LayoutDashboard, Eye, Users, Video, Heart, BarChart3, PlusCircle, Youtube, Link2, CheckCircle2, CloudLightning, Lock } from 'lucide-angular';

@Component({
  selector: 'app-halaltube-studio',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './halaltube-studio.html',
  styleUrls: ['./halaltube-studio.scss']
})
export class halaltubeStudioComponent implements OnInit {
  firebase = inject(FirebaseService);
  halaltube = inject(halaltubeService);
  toast = inject(ToastService);

  // Icons
  LayoutDashboard = LayoutDashboard;
  Eye = Eye;
  Users = Users;
  Video = Video;
  Heart = Heart;
  BarChart3 = BarChart3;
  PlusCircle = PlusCircle;
  Youtube = Youtube;
  Link2 = Link2;
  CheckCircle2 = CheckCircle2;
  CloudLightning = CloudLightning;
  Lock = Lock;

  isLoadingStats = signal(false);
  channelStats = signal<{ viewCount: string, subscriberCount: string, videoCount: string, name?: string } | null>(null);
  videos = signal<any[]>([]);
  isPreviewMode = signal(false);

  connectedPlatforms = signal<{id: string, name: string, icon: any, connected: boolean}[]>([
    { id: 'youtube', name: 'YouTube', icon: Youtube, connected: false },
    { id: 'tiktok', name: 'TikTok', icon: Video, connected: false },
    { id: 'facebook', name: 'Facebook', icon: Users, connected: false }
  ]);

  ngOnInit() {
    this.checkConnections();
  }

  private async checkConnections() {
    const user = this.firebase.userData();
    let youtubeLinked = false;
    let channelId = null;

    if (user?.linkedAccounts && Array.isArray(user.linkedAccounts)) {
      const ytAccount = user.linkedAccounts.find((a: any) => a.platform === 'youtube');
      if (ytAccount) {
        youtubeLinked = true;
        channelId = ytAccount.channelId || null;
      }
    } else if ((user as any)?.linkedYouTubeChannel) {
      // Fallback for old mock structure
      youtubeLinked = true;
      channelId = (user as any).linkedYouTubeChannel;
    }

    if (youtubeLinked) {
      this.connectedPlatforms.update(platforms => 
        platforms.map(p => p.id === 'youtube' ? { ...p, connected: true } : p)
      );
      if (channelId && typeof channelId === 'string') {
        await this.fetchRealStats(channelId);
      } else {
        // Channel linked but no ID saved, just show empty real state
        this.channelStats.set({ viewCount: '0', subscriberCount: '0', videoCount: '0' });
      }
    }
  }

  private piped = inject(PipedApiService);

  private async fetchRealStats(channelId: string) {
    this.isLoadingStats.set(true);
    try {
      const details = await this.piped.getChannelDetails(channelId);
      this.channelStats.set({
        viewCount: '0', // Piped doesn't return total views easily
        subscriberCount: details.subscriberCount?.toString() || '0',
        videoCount: '0', // Piped doesn't return total video count
        name: details.name
      });
      // Get last 4 videos
      if (details.relatedStreams && details.relatedStreams.length > 0) {
        this.videos.set(details.relatedStreams.slice(0, 4));
      }
    } catch (e) {
      console.error('Failed to fetch real channel stats', e);
      this.channelStats.set({ viewCount: '0', subscriberCount: '0', videoCount: '0' });
    } finally {
      this.isLoadingStats.set(false);
    }
  }

  togglePreviewMode() {
    this.toast.show('تم إيقاف وضع المعاينة الوهمي. يرجى ربط حساب يوتيوب حقيقي لمشاهدة الإحصائيات.', 'info');
  }

  formatNumber(numStr: string): string {
    const num = parseInt(numStr, 10);
    if (isNaN(num)) return numStr;
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }

  openUploadModal() {
    this.halaltube.showUploadModal.set(true);
  }

  async connectPlatform(platformId: string) {
    if (platformId === 'youtube') {
      const user = this.firebase.currentUser();
      if (!user) {
        this.toast.show('يجب تسجيل الدخول للربط', 'error');
        return;
      }
      
      const channelId = prompt('الرجاء إدخال معرف القناة (Channel ID) الخاصة بك على يوتيوب:');
      if (channelId) {
        try {
          const userRef = doc(this.firebase.db, 'users', user.uid);
          await updateDoc(userRef, {
            linkedYouTubeChannel: channelId
          });
          this.toast.show('تم ربط قناتك بنجاح!', 'success');
          // Update local state implicitly via checkConnections
          this.checkConnections();
        } catch (e) {
          console.error("Failed to link channel", e);
          this.toast.show('حدث خطأ أثناء الاتصال بقاعدة البيانات', 'error');
        }
      }
    } else {
      this.toast.show('الربط بهذه المنصة غير مدعوم حالياً', 'warning');
    }
  }
}
