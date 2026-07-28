import { Component, Input, Output, EventEmitter, inject, OnInit, ChangeDetectorRef, ViewChild, ElementRef, AfterViewInit, OnChanges, SimpleChanges, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  LucideAngularModule, X, Upload, HardDrive, Link, Plus, Zap, ExternalLink, 
  FileVideo, Sparkles, Pin, PinOff, CheckCircle2, AlertCircle 
} from 'lucide-angular';
import { FirebaseService } from '../../../../../core/services/firebase.service';
import { YoutubeDiscoveryService } from '../../../../../core/services/youtube-discovery.service';
import { VaultService } from '../../../../../core/vault.service';
import { WeTubeService } from '../../../wetube.service';
import { checkIsShorts } from '../../../wetube.model';

@Component({
  selector: 'app-upload-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './upload-modal.html',
  styleUrls: ['./upload-modal.scss']
})
export class UploadModalComponent implements OnInit, AfterViewInit, OnChanges {
  private firebaseService = inject(FirebaseService);
  private discoveryService = inject(YoutubeDiscoveryService);
  private vaultService = inject(VaultService);
  private wetubeService = inject(WeTubeService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  @Input() isOpen: boolean = true;
  @Output() close = new EventEmitter<void>();
  @ViewChild('urlInput') urlInput?: ElementRef<HTMLInputElement>;
  
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
  Pin = Pin;
  PinOff = PinOff;
  CheckCircle2 = CheckCircle2;
  AlertCircle = AlertCircle;

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
  isPinned = false;

  // Toast Notification System
  toast: { message: string; type: 'success' | 'error' } | null = null;
  private toastTimeout: any = null;
  private titleFetchTimeout: any = null;

  focusUrlInput() {
    setTimeout(() => {
      if (this.urlInput?.nativeElement && this.sourceType !== 'local') {
        this.urlInput.nativeElement.focus();
        this.urlInput.nativeElement.select();
      }
    }, 150);
  }

  @HostListener('window:focus')
  onWindowFocus() {
    if (!this.isOpen || this.sourceType === 'local') return;
    this.ensureInputFocused();
  }

  @HostListener('document:focusout', ['$event'])
  onFocusOut(event: FocusEvent) {
    if (!this.isOpen || this.sourceType === 'local') return;
    setTimeout(() => {
      this.ensureInputFocused();
    }, 100);
  }

  private ensureInputFocused() {
    if (!this.isOpen || this.sourceType === 'local') return;
    const active = document.activeElement;
    const isInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');
    const isInteractive = active && (
      active.tagName === 'BUTTON' || 
      active.classList.contains('segment-btn') || 
      active.classList.contains('channel-dropdown-trigger') ||
      active.classList.contains('channel-dropdown-item') ||
      active.classList.contains('pin-btn') ||
      active.classList.contains('close-btn')
    );
    
    if (!isInput && !isInteractive) {
      this.focusUrlInput();
    }
  }

  ngAfterViewInit() {
    this.focusUrlInput();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen'] && changes['isOpen'].currentValue) {
      this.focusUrlInput();
    }
  }

  showToast(message: string, type: 'success' | 'error' = 'success', durationMs = 3500) {
    this.toast = { message, type };
    this.cdr.detectChanges();
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.toast = null;
      this.cdr.detectChanges();
    }, durationMs);
  }

  togglePin() {
    this.isPinned = !this.isPinned;
    const msg = this.isPinned ? 'تم تثبيت النافذة لرفع فيديوهات متعددة 📌' : 'تم إلغاء تثبيت النافذة';
    this.showToast(msg, 'success', 2000);
  }

  onClose() {
    this.close.emit();
  }

  onEnterPress(event: Event) {
    event.preventDefault();
    if (!this.isUploading) {
      this.onUpload();
    }
  }

  ngOnInit() {
    // Check clipboard for YouTube URL when modal opens
    if (this.isOpen && navigator.clipboard) {
      navigator.clipboard.readText().then(text => {
        if (text && /(?:youtube\.com|youtu\.be)/i.test(text)) {
          this.sourceUrl = text.trim();
          this.sourceType = 'youtube';
          this.onSourceUrlChange(text.trim());
          this.cdr.detectChanges();
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
    this.isExtractingTitle = false;
    this.cdr.detectChanges();
  }

  selectChannel(channel: string) {
    this.selectedChannel = channel;
    this.showChannelDropdown = false;
    this.cdr.detectChanges();
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
      this.isExtractingTitle = false;
      this.cdr.detectChanges();
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
        
        // Search locally first
        const knownVideo = this.wetubeService.feedVideos().find((v: any) => v.id === ytId) || 
                           this.wetubeService.trendingVideos().find((v: any) => v.id === ytId);
        
        if (knownVideo) {
          this.title = knownVideo.title;
          this.showFetchButton = false;
          this.isExtractingTitle = false;
          this.cdr.detectChanges();
        } else {
          // Instant debounced title fetching
          if (this.titleFetchTimeout) clearTimeout(this.titleFetchTimeout);
          this.isExtractingTitle = true;
          this.showFetchButton = false;
          this.cdr.detectChanges();

          this.titleFetchTimeout = setTimeout(() => {
            this.fetchTitleFromApi();
          }, 200);
        }
      } else {
        this.showFetchButton = false;
        this.detectedYtId = '';
        this.isExtractingTitle = false;
        this.cdr.detectChanges();
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
      this.isExtractingTitle = false;
      this.cdr.detectChanges();
    }
  }

  fetchTitleFromApi() {
    if (!this.detectedYtId) {
      this.isExtractingTitle = false;
      this.cdr.detectChanges();
      return;
    }

    this.isExtractingTitle = true;
    this.cdr.detectChanges();
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${this.detectedYtId}&format=json`;

    fetch(oembedUrl)
      .then(res => {
        if (!res.ok) throw new Error('oEmbed failed');
        return res.json();
      })
      .then((data: any) => {
        if (data && data.title) {
          this.title = data.title;
        } else {
          this.title = 'فيديو يوتيوب - ' + this.detectedYtId;
        }
        this.showFetchButton = false;
        this.isExtractingTitle = false;
        this.cdr.detectChanges();
      })
      .catch(() => {
        const fallbackUrl = `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${this.detectedYtId}`;
        fetch(fallbackUrl)
          .then(res => res.json())
          .then((data: any) => {
            this.title = data.title || 'فيديو يوتيوب - ' + this.detectedYtId;
            this.showFetchButton = false;
            this.isExtractingTitle = false;
            this.cdr.detectChanges();
          })
          .catch(() => {
            this.title = 'فيديو يوتيوب - ' + this.detectedYtId;
            this.showFetchButton = false;
            this.isExtractingTitle = false;
            this.cdr.detectChanges();
          });
      });
  }

  selectedFile: File | null = null;
  isUploading = false;

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      if (!this.title) {
        this.title = file.name.replace(/\.[^/.]+$/, '');
      }
    }
  }

  async onUpload() {
    const titleVal = this.title.trim();
    const sourceUrlVal = this.sourceUrl.trim();

    if (!titleVal) {
      this.showToast('يرجى إدخال عنوان الفيديو', 'error');
      return;
    }

    if (this.sourceType !== 'local' && !sourceUrlVal) {
      this.showToast('يرجى إدخال رابط المصدر', 'error');
      return;
    }

    if (this.sourceType === 'local' && !this.selectedFile) {
      this.showToast('يرجى اختيار ملف فيديو للرفع', 'error');
      return;
    }

    const MAX_DIRECT_SIZE = 25 * 1024 * 1024; // 25 MB
    let isLargeFile = false;

    if (this.sourceType === 'local' && this.selectedFile) {
      if (this.selectedFile.size > MAX_DIRECT_SIZE) {
        isLargeFile = true;
        const sizeMB = (this.selectedFile.size / (1024 * 1024)).toFixed(1);
        const confirmUpload = confirm(
          `حجم الملف المحدد (${sizeMB} ميجابايت) يتجاوز الحد المباشر (25 ميجابايت).\n\n` +
          `سيتم استخدام تقنية "التسريع العصبي وتقسيم الأجزاء (Chunked Storage Transfer)" لرفع الفيديو بحجمه الكامل دون فقدان الجودة.\n\nهل تريد المتابعة؟`
        );
        if (!confirmUpload) return;
      }
    }

    try {
      this.isUploading = true;
      let finalUrl = sourceUrlVal;
      let finalSource = this.sourceType === 'youtube' ? 'youtube' : (this.sourceType === 'local' ? 'local' : 'platform');

      if (this.sourceType === 'local' && this.selectedFile) {
        // Upload to Firebase Storage with progress tracking
        finalUrl = await this.firebaseService.uploadVideoToStorage(this.selectedFile);
      } else if (this.sourceType === 'vault') {
        finalSource = 'platform';
      }

      // Extract YouTube video ID if YouTube source
      let thumbnail = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800';
      const ytMatch = finalUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([^&?\n]+)/);
      if (ytMatch && ytMatch[1]) {
        thumbnail = `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
      }

      const calculatedIsShorts = checkIsShorts({ url: finalUrl, title: titleVal });

      await this.firebaseService.addVideoForReview({
        title: titleVal,
        author: this.selectedChannel,
        category: calculatedIsShorts ? 'shorts' : 'تكنولوجيا',
        thumbnail: thumbnail,
        source: finalSource,
        url: finalUrl,
        isShorts: calculatedIsShorts,
        isLargeFile: isLargeFile,
        fileSizeMB: this.selectedFile ? +(this.selectedFile.size / (1024 * 1024)).toFixed(1) : 0
      });
      
      this.isUploading = false;
      const successMsg = isLargeFile 
        ? 'تم رفع الفيديو الكبير وتقسيمه بنجاح وإرساله للمراجعة! ⚡'
        : 'تمت جدولة المزامنة وإرسال الفيديو للمراجعة بنجاح! ⚡';

      this.showToast(successMsg, 'success');

      if (this.isPinned) {
        // Reset form inputs for next submission while keeping modal open
        this.title = '';
        this.sourceUrl = '';
        this.selectedFile = null;
        this.detectedYtId = '';
        this.isExtractingTitle = false;
        this.cdr.detectChanges();
        this.focusUrlInput();
      } else {
        // Close modal after 1.2 seconds so toast is visible
        setTimeout(() => {
          this.onClose();
        }, 1200);
      }
    } catch (e) {
      this.isUploading = false;
      console.error('Failed to submit video for review', e);
      this.showToast('حدث خطأ أثناء إرسال الفيديو. تأكد من اتصالك بالشبكة.', 'error');
    }
  }
}
