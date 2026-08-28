import { Component, inject, signal, computed, ViewChild, ElementRef, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { LucideAngularModule, ScanText, Crop, RotateCw, RotateCcw, ZoomIn, ZoomOut, Volume2, VolumeX, FileSearch, Sparkles, Sliders, Languages, Camera, Layers, FileText, Check, Copy, Trash2, Download, ExternalLink, RefreshCw, Eye, Share2, UploadCloud, X, Play, Square, Search, ArrowRight, ArrowLeft } from 'lucide-angular';
import { OcrService, OcrResult, OcrLine, OcrWord, ImageAdjustments } from '../../core/services/ocr.service';

interface LanguageOption {
  code: string;
  name: string;
  flag: string;
}

@Component({
  selector: 'app-ocr',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  templateUrl: './ocr.component.html',
  styleUrls: ['./ocr.component.scss']
})
export class OcrComponent implements OnInit, OnDestroy {
  ocrService = inject(OcrService);
  router = inject(Router);

  // Lucide Icons
  readonly ScanTextIcon = ScanText;
  readonly CropIcon = Crop;
  readonly RotateCwIcon = RotateCw;
  readonly RotateCcwIcon = RotateCcw;
  readonly ZoomInIcon = ZoomIn;
  readonly ZoomOutIcon = ZoomOut;
  readonly Volume2Icon = Volume2;
  readonly VolumeXIcon = VolumeX;
  readonly FileSearchIcon = FileSearch;
  readonly SparklesIcon = Sparkles;
  readonly SlidersIcon = Sliders;
  readonly LanguagesIcon = Languages;
  readonly CameraIcon = Camera;
  readonly LayersIcon = Layers;
  readonly FileTextIcon = FileText;
  readonly CheckIcon = Check;
  readonly CopyIcon = Copy;
  readonly Trash2Icon = Trash2;
  readonly DownloadIcon = Download;
  readonly ExternalLinkIcon = ExternalLink;
  readonly RefreshCwIcon = RefreshCw;
  readonly EyeIcon = Eye;
  readonly Share2Icon = Share2;
  readonly UploadCloudIcon = UploadCloud;
  readonly XIcon = X;
  readonly PlayIcon = Play;
  readonly SquareIcon = Square;
  readonly SearchIcon = Search;
  readonly ArrowRightIcon = ArrowRight;
  readonly ArrowLeftIcon = ArrowLeft;

  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('sourceImage') sourceImageRef!: ElementRef<HTMLImageElement>;
  @ViewChild('previewCanvas') previewCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('cameraVideo') cameraVideoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('textEditor') textEditorRef!: ElementRef<HTMLTextAreaElement>;

  // Image Source & File States
  selectedImageUrl = signal<string | null>(null);
  selectedImageName = signal<string>('صورة جديدة');
  selectedImageFile = signal<File | null>(null);
  imageNaturalWidth = signal<number>(0);
  imageNaturalHeight = signal<number>(0);

  // Language & Engine settings
  languages: LanguageOption[] = [
    { code: 'ara+eng', name: 'العربية + الإنجليزية (تلقائي)', flag: '🌐' },
    { code: 'ara', name: 'اللغة العربية فقط', flag: '🇸🇦' },
    { code: 'eng', name: 'اللغة الإنجليزية فقط', flag: '🇬🇧' },
    { code: 'fra', name: 'الفرنسية (Français)', flag: '🇫🇷' },
    { code: 'deu', name: 'الألمانية (Deutsch)', flag: '🇩🇪' },
    { code: 'spa', name: 'الإسبانية (Español)', flag: '🇪🇸' }
  ];
  selectedLanguage = signal<string>('ara+eng');

  // Adjustments & Filters
  adjustments = signal<ImageAdjustments>({
    rotation: 0,
    brightness: 0,
    contrast: 0,
    grayscale: false,
    binarize: false,
    thresholdValue: 128,
    invert: false
  });
  showFiltersPanel = signal<boolean>(false);

  // Zoom & Pan
  zoomLevel = signal<number>(1);

  // ROI / Crop selection state
  isCropMode = signal<boolean>(false);
  cropStart = signal<{ x: number; y: number } | null>(null);
  cropRect = signal<{ x: number; y: number; width: number; height: number } | null>(null);
  isDraggingCrop = signal<boolean>(false);

  // OCR Results & Workspace states
  currentResult = signal<OcrResult | null>(null);
  editableText = signal<string>('');
  activeTab = signal<'editor' | 'blocks' | 'json'>('editor');
  textDirection = signal<'rtl' | 'ltr'>('rtl');
  editorFontSize = signal<number>(15);
  searchQuery = signal<string>('');
  
  // Interactive Hover/Selection
  hoveredWord = signal<OcrWord | null>(null);
  hoveredLine = signal<OcrLine | null>(null);
  selectedLineIndex = signal<number | null>(null);
  showBoundingBoxes = signal<boolean>(true);

  // UI Modals & Drawers
  showCameraModal = signal<boolean>(false);
  showHistoryDrawer = signal<boolean>(false);
  copyToastMessage = signal<string | null>(null);
  cameraStream: MediaStream | null = null;
  cameraFacing: 'user' | 'environment' = 'environment';

  // Stats computed
  wordCount = computed(() => {
    const txt = this.editableText().trim();
    return txt ? txt.split(/\s+/).length : 0;
  });

  charCount = computed(() => {
    return this.editableText().length;
  });

  lineCount = computed(() => {
    const txt = this.editableText();
    return txt ? txt.split('\n').length : 0;
  });

  filteredLines = computed(() => {
    const res = this.currentResult();
    if (!res) return [];
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return res.lines;
    return res.lines.filter(l => l.text.toLowerCase().includes(q));
  });

  ngOnInit(): void {
    // Check if there is history to load initially
    const hist = this.ocrService.history();
    if (hist.length > 0 && !this.selectedImageUrl()) {
      // Keep empty or let user pick
    }
  }

  ngOnDestroy(): void {
    this.stopCamera();
    this.ocrService.stopSpeaking();
  }

  // Global Clipboard Paste Listener
  @HostListener('window:paste', ['$event'])
  onWindowPaste(event: ClipboardEvent): void {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          this.processImageFile(blob, 'صورة ملصوقة من الحافظة');
          this.showToast('📋 تم استيراد الصورة من الحافظة بنجاح!');
          break;
        }
      }
    }
  }

  // Drag & Drop handlers
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        this.processImageFile(file, file.name);
      } else {
        this.showToast('⚠️ يرجى اختيار ملف صورة صالح (PNG, JPG, WEBP, إلخ)');
      }
    }
  }

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      const file = target.files[0];
      this.processImageFile(file, file.name);
    }
  }

  processImageFile(file: File | Blob, name: string): void {
    this.selectedImageName.set(name);
    if (file instanceof File) {
      this.selectedImageFile.set(file);
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      this.setImageUrl(url, name);
    };
    reader.readAsDataURL(file);
  }

  setImageUrl(url: string, name: string): void {
    this.selectedImageUrl.set(url);
    this.selectedImageName.set(name);
    this.resetAdjustments();
    this.cropRect.set(null);
    this.currentResult.set(null);
    this.editableText.set('');
    this.zoomLevel.set(1);

    // Load image natural dimensions
    const img = new Image();
    img.onload = () => {
      this.imageNaturalWidth.set(img.naturalWidth || img.width);
      this.imageNaturalHeight.set(img.naturalHeight || img.height);
      this.updateFilteredCanvas();
      // Automatically detect if Arabic text direction fits best
      this.textDirection.set('rtl');
    };
    img.src = url;
  }

  // Load Built-in Test Samples
  loadSample(sampleType: 'arabic-invoice' | 'arabic-doc' | 'code-snippet'): void {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (sampleType === 'arabic-invoice') {
      canvas.width = 900;
      canvas.height = 700;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Header
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 34px Tahoma, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('فاتورة مبيعات ضريبية - شركة سوبر', 450, 60);

      ctx.font = '18px Arial';
      ctx.fillStyle = '#64748b';
      ctx.fillText('رقم الفاتورة: #INV-2026-9842 | التاريخ: 25-08-2026', 450, 100);

      // Divider
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(60, 120);
      ctx.lineTo(840, 120);
      ctx.stroke();

      // Items Table
      ctx.textAlign = 'right';
      ctx.font = 'bold 20px Tahoma, Arial';
      ctx.fillStyle = '#1e293b';
      ctx.fillText('البيان / الخدمة', 820, 160);
      ctx.fillText('الكمية', 480, 160);
      ctx.fillText('السعر الإفرادي', 300, 160);
      ctx.fillText('الإجمالي (ر.س)', 120, 160);

      ctx.font = '19px Arial';
      ctx.fillStyle = '#334155';
      const items = [
        ['ترخيص منصة سوبر كلاود السحابية - باقة Pro', '1', '450.00', '450.00'],
        ['خدمة ربط قواعد البيانات والمزامنة الفورية', '2', '120.00', '240.00'],
        ['استشارات تطوير الذكاء الاصطناعي العصبي', '3', '300.00', '900.00'],
        ['شهادة الأمان والحماية التشفيرية المتقدمة', '1', '150.00', '150.00']
      ];

      let y = 210;
      items.forEach(it => {
        ctx.fillText(it[0], 820, y);
        ctx.fillText(it[1], 480, y);
        ctx.fillText(it[2], 300, y);
        ctx.fillText(it[3], 120, y);
        y += 45;
      });

      // Total Box
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(60, y + 20, 780, 120);
      ctx.strokeStyle = '#e2e8f0';
      ctx.strokeRect(60, y + 20, 780, 120);

      ctx.font = 'bold 22px Tahoma, Arial';
      ctx.fillStyle = '#047857';
      ctx.fillText('المجموع الفرعي: 1740.00 ر.س', 800, y + 65);
      ctx.fillText('ضريبة القيمة المضافة (15%): 261.00 ر.س', 800, y + 105);
      ctx.font = 'bold 26px Tahoma, Arial';
      ctx.fillStyle = '#0f172a';
      ctx.fillText('الإجمالي الكلي المستحق: 2001.00 ر.س', 380, y + 85);

      ctx.font = 'italic 16px Arial';
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'center';
      ctx.fillText('شكراً لتعاملكم معنا • جميع الحقوق محفوظة لمنصة Super Platform 2026', 450, 660);

      this.setImageUrl(canvas.toDataURL('image/png'), 'نموذج_فاتورة_عربية.png');
    } else if (sampleType === 'arabic-doc') {
      canvas.width = 900;
      canvas.height = 700;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#1e1b4b';
      ctx.font = 'bold 30px Tahoma, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('وثيقة المعايير التقنية لتطوير الأنظمة الذكية', 450, 60);

      ctx.font = '17px Arial';
      ctx.fillStyle = '#6b7280';
      ctx.fillText('الإصدار 4.2 • صادر عن قسم هندسة البرمجيات العصبية', 450, 95);

      ctx.textAlign = 'right';
      ctx.font = 'bold 22px Tahoma, Arial';
      ctx.fillStyle = '#312e81';
      ctx.fillText('1. مبدأ الخصوصية والتشغيل المحلي (Offline-First):', 840, 150);

      ctx.font = '19px Arial';
      ctx.fillStyle = '#374151';
      const p1 = [
        'تعتمد بنيتنا التحتية على تشغيل المعالجات الحساسة مثل استخراج النصوص (OCR)',
        'ومعالجة الوسائط داخل متصفح العميل مباشرة دون نقل أي بيانات شخصية إلى السحابة.',
        'يضمن ذلك سرية مطلقة لكافة المستندات والوثائق المالية والشهادات الرسمية.'
      ];
      let docY = 190;
      p1.forEach(line => {
        ctx.fillText(line, 840, docY);
        docY += 35;
      });

      ctx.font = 'bold 22px Tahoma, Arial';
      ctx.fillStyle = '#312e81';
      ctx.fillText('2. دقة التعرف الضوئي ومطابقة الخطوط:', 840, docY + 20);

      docY += 60;
      const p2 = [
        'يتم استخدام خوارزميات الذكاء الاصطناعي والتعلم الآلي لتمييز الحروف العربية',
        'بما فيها علامات التشكيل والحركات والخطوط المركبة مثل النسخ والرقعة والديواني.',
        'مع إمكانية الفحص التفاعلي لكل كلمة وتحديد نسبة الدقة الإحصائية المستخرجة.'
      ];
      p2.forEach(line => {
        ctx.fillText(line, 840, docY);
        docY += 35;
      });

      this.setImageUrl(canvas.toDataURL('image/png'), 'تقرير_تقني_رسمي.png');
    } else {
      // Code snippet sample
      canvas.width = 900;
      canvas.height = 650;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 24px Consolas, Courier New, monospace';
      ctx.textAlign = 'left';
      ctx.fillText('// Local OCR Processor with WebAssembly', 40, 50);

      ctx.font = '18px Consolas, Courier New, monospace';
      const codeLines = [
        ['const tesseract = require("tesseract.js");', '#e2e8f0'],
        ['', '#e2e8f0'],
        ['async function extractLocalText(imageBuffer, lang = "ara+eng") {', '#818cf8'],
        ['  const worker = await tesseract.createWorker(lang, 1);', '#e2e8f0'],
        ['  const { data } = await worker.recognize(imageBuffer);', '#34d399'],
        ['  console.log("Recognition Accuracy:", data.confidence);', '#fbbf24'],
        ['  await worker.terminate();', '#e2e8f0'],
        ['  return {', '#f472b6'],
        ['    text: data.text,', '#e2e8f0'],
        ['    words: data.words.map(w => ({ text: w.text, bbox: w.bbox })),', '#38bdf8'],
        ['    timestamp: Date.now()', '#e2e8f0'],
        ['  };', '#f472b6'],
        ['}', '#818cf8']
      ];

      let cY = 100;
      codeLines.forEach(line => {
        ctx.fillStyle = line[1];
        ctx.fillText(line[0], 40, cY);
        cY += 36;
      });

      this.setImageUrl(canvas.toDataURL('image/png'), 'كود_برمجي_توضيحي.png');
      this.textDirection.set('ltr');
    }
  }

  // Camera Capture
  async openCamera(): Promise<void> {
    this.showCameraModal.set(true);
    try {
      this.cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: this.cameraFacing, width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      setTimeout(() => {
        if (this.cameraVideoRef?.nativeElement && this.cameraStream) {
          this.cameraVideoRef.nativeElement.srcObject = this.cameraStream;
        }
      }, 100);
    } catch (err) {
      console.error('Camera access error:', err);
      this.showToast('⚠️ تعذر الوصول إلى الكاميرا. يرجى التحقق من أذونات المتصفح.');
      this.showCameraModal.set(false);
    }
  }

  toggleCameraFacing(): void {
    this.cameraFacing = this.cameraFacing === 'user' ? 'environment' : 'user';
    this.stopCamera();
    this.openCamera();
  }

  captureCameraSnapshot(): void {
    if (!this.cameraVideoRef?.nativeElement) return;
    const video = this.cameraVideoRef.nativeElement;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const url = canvas.toDataURL('image/jpeg', 0.95);
      this.setImageUrl(url, 'لقطة_كاميرا_' + new Date().toLocaleTimeString('ar-EG') + '.jpg');
      this.stopCamera();
      this.showCameraModal.set(false);
      this.showToast('📸 تم التقاط الصورة من الكاميرا بنجاح!');
    }
  }

  stopCamera(): void {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
      this.cameraStream = null;
    }
  }

  // Adjustments & Filters logic
  updateAdjustment(key: keyof ImageAdjustments, value: any): void {
    this.adjustments.update(prev => ({ ...prev, [key]: value }));
    this.updateFilteredCanvas();
  }

  rotateImage(direction: 'cw' | 'ccw'): void {
    this.adjustments.update(prev => {
      let r = prev.rotation + (direction === 'cw' ? 90 : -90);
      if (r >= 360) r = 0;
      if (r < 0) r = 270;
      return { ...prev, rotation: r };
    });
    this.cropRect.set(null); // Reset crop on rotate
    this.updateFilteredCanvas();
  }

  resetAdjustments(): void {
    this.adjustments.set({
      rotation: 0,
      brightness: 0,
      contrast: 0,
      grayscale: false,
      binarize: false,
      thresholdValue: 128,
      invert: false
    });
    this.cropRect.set(null);
    this.updateFilteredCanvas();
  }

  updateFilteredCanvas(): void {
    if (!this.previewCanvasRef?.nativeElement || !this.selectedImageUrl()) return;
    const img = new Image();
    img.onload = () => {
      const processedCanvas = this.ocrService.applyImageFilters(img, this.adjustments(), this.cropRect());
      const canvas = this.previewCanvasRef.nativeElement;
      canvas.width = processedCanvas.width;
      canvas.height = processedCanvas.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(processedCanvas, 0, 0);
      }
    };
    img.src = this.selectedImageUrl()!;
  }

  // ROI / Crop selection handlers on canvas
  startCropDrag(event: MouseEvent): void {
    if (!this.isCropMode()) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    this.cropStart.set({ x, y });
    this.isDraggingCrop.set(true);
    this.cropRect.set({ x, y, width: 0, height: 0 });
  }

  onCropDragMove(event: MouseEvent): void {
    if (!this.isDraggingCrop() || !this.cropStart()) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const curX = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
    const curY = Math.max(0, Math.min(rect.height, event.clientY - rect.top));

    const start = this.cropStart()!;
    const x = Math.min(start.x, curX);
    const y = Math.min(start.y, curY);
    const width = Math.abs(curX - start.x);
    const height = Math.abs(curY - start.y);

    this.cropRect.set({ x, y, width, height });
  }

  endCropDrag(): void {
    if (!this.isDraggingCrop()) return;
    this.isDraggingCrop.set(false);
    const currentCrop = this.cropRect();
    if (currentCrop && (currentCrop.width < 15 || currentCrop.height < 15)) {
      this.cropRect.set(null);
    }
  }

  clearCrop(): void {
    this.cropRect.set(null);
    this.isCropMode.set(false);
    this.updateFilteredCanvas();
  }

  // OCR Recognition execution
  async runOcr(): Promise<void> {
    if (!this.selectedImageUrl()) return;

    try {
      let sourceToScan: HTMLCanvasElement | string = this.selectedImageUrl()!;
      const img = new Image();
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.src = this.selectedImageUrl()!;
      });

      // If adjustments or crop applied, use the processed canvas
      const adj = this.adjustments();
      if (adj.rotation !== 0 || adj.brightness !== 0 || adj.contrast !== 0 || adj.grayscale || adj.binarize || adj.invert || this.cropRect()) {
        sourceToScan = this.ocrService.applyImageFilters(img, adj, this.cropRect());
      }

      const result = await this.ocrService.recognize(
        sourceToScan,
        this.selectedImageName(),
        this.selectedLanguage()
      );

      this.currentResult.set(result);
      this.editableText.set(result.fullText);
      this.activeTab.set('editor');

      // Auto set direction based on content
      const hasArabic = /[\u0600-\u06FF]/.test(result.fullText);
      this.textDirection.set(hasArabic ? 'rtl' : 'ltr');

      this.showToast('✨ تم استخراج النصوص بنجاح محلياً!');
    } catch (err: any) {
      console.error('Failed to run OCR:', err);
      this.showToast('⚠️ فشل التعرف على النصوص: ' + (err.message || 'خطأ غير معروف'));
    }
  }

  // Interactive word/line box overlay helpers
  getScaledBboxStyle(bbox: { x0: number; y0: number; x1: number; y1: number }): { [key: string]: string } {
    const origW = this.imageNaturalWidth() || 800;
    const origH = this.imageNaturalHeight() || 600;

    const left = (bbox.x0 / origW) * 100;
    const top = (bbox.y0 / origH) * 100;
    const width = ((bbox.x1 - bbox.x0) / origW) * 100;
    const height = ((bbox.y1 - bbox.y0) / origH) * 100;

    return {
      'left': `${left}%`,
      'top': `${top}%`,
      'width': `${width}%`,
      'height': `${height}%`
    };
  }

  // Granular Text Copying
  copyToClipboard(text: string, label: string = 'النص'): void {
    if (!text || text.trim().length === 0) return;
    navigator.clipboard.writeText(text).then(() => {
      this.showToast(`✅ تم نسخ ${label} إلى الحافظة!`);
    }).catch(() => {
      this.showToast('⚠️ تعذر النسخ إلى الحافظة');
    });
  }

  copyWord(word: OcrWord, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.copyToClipboard(word.text, `الكلمة: "${word.text}"`);
  }

  copyLine(line: OcrLine, index: number, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.selectedLineIndex.set(index);
    this.copyToClipboard(line.text, `السطر #${index + 1}`);
  }

  copyAllText(): void {
    this.copyToClipboard(this.editableText(), 'النص المستخرج كاملاً');
  }

  copyAsMarkdown(): void {
    const text = this.editableText();
    const md = `# نصوص مستخرجة من صورة: ${this.selectedImageName()}\n*تاريخ الاستخراج: ${new Date().toLocaleString('ar-EG')}*\n\n---\n\n${text}`;
    this.copyToClipboard(md, 'النص بتنسيق Markdown');
  }

  copyAsJson(): void {
    const res = this.currentResult();
    if (!res) {
      this.copyToClipboard(JSON.stringify({ text: this.editableText() }, null, 2), 'بيانات JSON');
      return;
    }
    const json = JSON.stringify({
      name: res.imageName,
      timestamp: new Date(res.timestamp).toISOString(),
      language: res.language,
      confidence: res.averageConfidence,
      text: this.editableText(),
      lines: res.lines.map(l => ({ text: l.text, confidence: l.confidence }))
    }, null, 2);
    this.copyToClipboard(json, 'بيانات JSON المنظمة');
  }

  // Text Transform Utilities
  cleanExcessiveWhitespace(): void {
    const cleaned = this.editableText()
      .split('\n')
      .map(line => line.replace(/\s+/g, ' ').trim())
      .filter(line => line.length > 0)
      .join('\n');
    this.editableText.set(cleaned);
    this.showToast('🧹 تم تنظيف المسافات والأسطر الفارغة!');
  }

  transformCase(mode: 'upper' | 'lower' | 'title'): void {
    const txt = this.editableText();
    if (mode === 'upper') {
      this.editableText.set(txt.toUpperCase());
    } else if (mode === 'lower') {
      this.editableText.set(txt.toLowerCase());
    } else {
      this.editableText.set(txt.replace(/\b\w/g, c => c.toUpperCase()));
    }
  }

  // Text-to-Speech
  toggleSpeech(): void {
    if (this.ocrService.isSpeaking()) {
      this.ocrService.stopSpeaking();
    } else {
      this.ocrService.speakText(this.editableText(), this.selectedLanguage() === 'eng' ? 'en-US' : 'ar-SA');
    }
  }

  // Export & Integrations
  downloadTxtFile(): void {
    const blob = new Blob([this.editableText()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OCR_${this.selectedImageName().replace(/\.[^/.]+$/, '')}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('📥 تم تحميل الملف النصي .txt بنجاح!');
  }

  downloadMdFile(): void {
    const md = `# نصوص مستخرجة بواسطة Super OCR\n**الصورة:** ${this.selectedImageName()}\n**التاريخ:** ${new Date().toLocaleString('ar-EG')}\n\n---\n\n${this.editableText()}`;
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OCR_${this.selectedImageName().replace(/\.[^/.]+$/, '')}_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('📥 تم تحميل ملف Markdown .md بنجاح!');
  }

  sendToTextFixer(): void {
    // Navigate to text-fixer with text state
    sessionStorage.setItem('super_text_fixer_preload', this.editableText());
    this.router.navigate(['/text-fixer']);
  }

  sendToSuperDoc(): void {
    sessionStorage.setItem('super_doc_preload', this.editableText());
    this.router.navigate(['/docs']);
  }

  // History Drawer
  restoreHistoryItem(item: OcrResult): void {
    this.currentResult.set(item);
    this.selectedImageName.set(item.imageName);
    this.editableText.set(item.fullText);
    this.selectedLanguage.set(item.language);
    if (item.imageThumbnail) {
      this.selectedImageUrl.set(item.imageThumbnail);
    }
    const hasArabic = /[\u0600-\u06FF]/.test(item.fullText);
    this.textDirection.set(hasArabic ? 'rtl' : 'ltr');
    this.showHistoryDrawer.set(false);
    this.showToast(`📜 تم استعادة المسح: "${item.imageName}"`);
  }

  deleteHistory(id: string, event: MouseEvent): void {
    event.stopPropagation();
    this.ocrService.deleteHistoryItem(id);
    this.showToast('🗑️ تم حذف العنصر من السجل');
  }

  clearAllHistory(): void {
    if (confirm('هل أنت متأكد من رغبتك في مسح كافة سجلات الاستخراج السابقة؟')) {
      this.ocrService.clearHistory();
      this.showToast('🧹 تم مسح السجل بالكامل');
    }
  }

  // Toast notification helper
  private showToast(msg: string): void {
    this.copyToastMessage.set(msg);
    setTimeout(() => {
      if (this.copyToastMessage() === msg) {
        this.copyToastMessage.set(null);
      }
    }, 3200);
  }
}
