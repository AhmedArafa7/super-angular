import { Component, Input, Output, EventEmitter, inject, OnInit } from '@angular/core';
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
export class UploadModalComponent implements OnInit {
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

  ngOnInit() {
    // Check clipboard for YouTube URL when modal opens
    if (this.isOpen && navigator.clipboard) {
      navigator.clipboard.readText().then(text => {
        if (text && /(?:youtube\.com|youtu\.be)/i.test(text)) {
          this.sourceUrl = text.trim();
          this.sourceType = 'youtube';
          this.onSourceUrlChange(text.trim());
        }
      }).catch(() => {});
    }
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
    // Normal videos
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) return match[2];
    
    // Shorts: youtube.com/shorts/VIDEO_ID
    const shortsRegExp = /(?:youtube\.com\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]+)/;
    const shortsMatch = url.match(shortsRegExp);
    if (shortsMatch) return shortsMatch[1];
    
    // Fallback: extract any video ID after youtube.com
    const fallback = /youtube\.com\/.*?([a-zA-Z0-9_-]{10,})/;
    const fallbackMatch = url.match(fallback);
    return fallbackMatch ? fallbackMatch[1] : null;
  }

  onSourceUrlChange(url: string) {
    this.sourceUrl = url;
    const urlVal = url.trim();
    if (!urlVal) {
      this.showFetchButton = false;
      this.detectedYtId = '';
      return;
    }

    // Auto-switch to YouTube tab if a YouTube URL is detected
    const isYoutube = /(?:youtube\.com|youtu\.be)/i.test(urlVal);
    if (isYoutube && this.sourceType !== 'youtube') {
      this.sourceType = 'youtube';
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
          // Auto-fetch title from YouTube API instead of requiring manual click
          this.title = '';
          this.isExtractingTitle = true;
          this.showFetchButton = false;
          this.fetchTitleFromApi();
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

    // Use YouTube oEmbed API - simple, free, no API key needed
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${this.detectedYtId}&format=json`;

    fetch(oembedUrl)
      .then(res => {
        if (!res.ok) throw new Error('oEmbed failed');
        return res.json();
      })
      .then((data: any) => {
        if (data && data.title) {
          this.title = data.title;
          // Also try to get author from oEmbed
          if (data.author_name && !this.title.includes(data.author_name)) {
            // title is good as-is
          }
        } else {
          this.title = 'فيديو يوتيوب - ' + this.detectedYtId;
        }
        this.showFetchButton = false;
        this.isExtractingTitle = false;
      })
      .catch((err) => {
        console.warn('oEmbed failed, trying oembed.io fallback', err);
        // Fallback: try another oEmbed service
        const fallbackUrl = `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${this.detectedYtId}`;
        fetch(fallbackUrl)
          .then(res => res.json())
          .then((data: any) => {
            this.title = data.title || 'فيديو يوتيوب - ' + this.detectedYtId;
            this.showFetchButton = false;
            this.isExtractingTitle = false;
          })
          .catch(() => {
            this.title = 'فيديو يوتيوب - ' + this.detectedYtId;
            this.showFetchButton = false;
            this.isExtractingTitle = false;
          });
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
