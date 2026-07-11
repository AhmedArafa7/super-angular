import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule, X, Upload, HardDrive, Link, Plus, Zap, ExternalLink, FileVideo, Sparkles } from 'lucide-angular';
import { FirebaseService } from '../../../../../core/services/firebase.service';
import { YoutubeDiscoveryService } from '../../../../../core/services/youtube-discovery.service';
import { VaultService } from '../../../../../core/vault.service';
import { WeTubeService } from '../../../wetube.service';

@Component({
  selector: 'app-upload-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './upload-modal.html',
  styleUrls: ['./upload-modal.scss']
})
export class UploadModalComponent {
  private firebaseService = inject(FirebaseService);
  private discoveryService = inject(YoutubeDiscoveryService);
  private vaultService = inject(VaultService);
  private wetubeService = inject(WeTubeService);
  private router = inject(Router);

  @Input() isOpen: boolean = true;
  @Output() close = new EventEmitter<void>();
  
  // Icons
  X = X;
  Upload = Upload;
  HardDrive = HardDrive;
  Link = Link;
  Plus = Plus;
  Zap = Zap;
  ExternalLink = ExternalLink;
  FileVideo = FileVideo;
  Sparkles = Sparkles;

  // Form Fields
  title = '';
  sourceUrl = '';
  sourceType: 'vault' | 'youtube' | 'local' = 'vault';
  selectedChannel = 'الرئيسية';
  
  showChannelDropdown = false;
  channels = ['الرئيسية', 'قناة المبدعين', 'قناة المبرمجين', 'Si-Neuro AI'];
  
  isExtractingTitle = false;
  showFetchButton = false;
  detectedYtId = '';

  onClose() {
    this.close.emit();
  }
  
  selectSourceType(type: 'vault' | 'youtube' | 'local') {
    this.sourceType = type;
    this.title = '';
    this.sourceUrl = '';
    this.showFetchButton = false;
    this.detectedYtId = '';
  }

  selectChannel(channel: string) {
    this.selectedChannel = channel;
    this.showChannelDropdown = false;
  }

  openVault() {
    this.onClose();
    this.router.navigate(['/vault']);
  }

  extractYoutubeId(url: string): string | null {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }

  onSourceUrlChange(url: string) {
    this.sourceUrl = url;
    const urlVal = url.trim();
    if (!urlVal) {
      this.showFetchButton = false;
      this.detectedYtId = '';
      return;
    }

    if (this.sourceType === 'youtube') {
      const ytId = this.extractYoutubeId(urlVal);
      if (ytId) {
        this.detectedYtId = ytId;
        
        // 1. Search locally first (Instant, offline & 100% free)
        const knownVideo = this.wetubeService.feedVideos().find((v: any) => v.id === ytId) || 
                           this.wetubeService.trendingVideos().find((v: any) => v.id === ytId) ||
                           this.wetubeService.videos().find((v: any) => v.id === ytId);
        
        if (knownVideo) {
          this.title = knownVideo.title;
          this.showFetchButton = false;
        } else {
          // Pre-fill a clear suggested placeholder title so they are not blocked
          this.title = 'فيديو يوتيوب - ' + ytId;
          this.showFetchButton = true; // Show on-demand API fetch button
        }
      } else {
        this.showFetchButton = false;
        this.detectedYtId = '';
      }
    } else if (this.sourceType === 'vault') {
      const matchedAsset = this.vaultService.assets().find(a => 
        a.id === urlVal || 
        a.name === urlVal || 
        (a.url && a.url === urlVal)
      );
      if (matchedAsset) {
        this.title = matchedAsset.name;
      }
      this.showFetchButton = false;
    }
  }

  fetchTitleFromApi() {
    if (!this.detectedYtId) return;
    this.isExtractingTitle = true;
    this.discoveryService.fetchVideoDetails(this.detectedYtId).subscribe({
      next: (details) => {
        if (details && details.title) {
          this.title = details.title;
          this.showFetchButton = false;
        } else {
          alert('تعذر جلب العنوان من يوتيوب. يمكنك تعديل العنوان المقترح يدوياً.');
        }
        this.isExtractingTitle = false;
      },
      error: (err) => {
        console.warn('Failed to auto-extract YouTube title', err);
        alert('تنبيه: تعذر جلب العنوان من السيرفر (ربما بسبب حدود الطلبات). يمكنك تعديل العنوان المقترح يدوياً.');
        this.isExtractingTitle = false;
      }
    });
  }

  async onUpload() {
    const titleVal = this.title.trim();
    const sourceUrlVal = this.sourceUrl.trim();

    if (!titleVal) {
      alert('يرجى إدخال عنوان الفيديو');
      return;
    }

    if (this.sourceType !== 'local' && !sourceUrlVal) {
      alert('يرجى إدخال رابط المصدر');
      return;
    }

    try {
      await this.firebaseService.addVideoForReview({
        title: titleVal,
        author: this.selectedChannel,
        category: 'تكنولوجيا',
        thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800', // default placeholder
        source: this.sourceType === 'youtube' ? 'youtube' : 'drive',
        url: this.sourceType === 'local' ? 'local_stream' : sourceUrlVal
      });
      
      alert('تمت جدولة المزامنة وإرسال الفيديو للمراجعة بنجاح! ⚡');
      this.onClose();
    } catch (e) {
      console.error('Failed to submit video for review', e);
      alert('حدث خطأ أثناء إرسال الفيديو. تأكد من اتصالك بالشبكة.');
    }
  }
}
