import { Injectable, signal } from '@angular/core';
import { createWorker, Worker, PSM } from 'tesseract.js';

export interface BoundingBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface OcrWord {
  text: string;
  confidence: number;
  bbox: BoundingBox;
}

export interface OcrLine {
  text: string;
  confidence: number;
  bbox: BoundingBox;
  words: OcrWord[];
}

export interface OcrBlock {
  text: string;
  confidence: number;
  bbox: BoundingBox;
  lines: OcrLine[];
}

export interface OcrResult {
  id: string;
  timestamp: number;
  imageName: string;
  imageThumbnail: string;
  imageWidth: number;
  imageHeight: number;
  fullText: string;
  language: string;
  averageConfidence: number;
  blocks: OcrBlock[];
  lines: OcrLine[];
  words: OcrWord[];
}

export interface OcrProgress {
  status: string;
  progress: number;
  arabicMessage: string;
}

export interface ImageAdjustments {
  rotation: number; // 0, 90, 180, 270
  brightness: number; // -100 to 100 (0 default)
  contrast: number; // -100 to 100 (0 default)
  grayscale: boolean;
  binarize: boolean; // High contrast B&W threshold
  thresholdValue: number; // 0 to 255 (default ~128)
  invert: boolean;
}

const STORAGE_KEY = 'super_ocr_history_v1';

@Injectable({
  providedIn: 'root'
})
export class OcrService {
  isProcessing = signal<boolean>(false);
  progress = signal<OcrProgress>({ status: 'idle', progress: 0, arabicMessage: 'جاهز للاستخراج' });
  isSpeaking = signal<boolean>(false);
  history = signal<OcrResult[]>(this.loadHistory());

  constructor() {}

  /**
   * Translates Tesseract internal progress strings to human Arabic
   */
  private translateStatus(status: string, progress: number): string {
    const pct = Math.round(progress * 100);
    switch (status) {
      case 'loading tesseract core':
        return `تحميل محرك التعرف الذكي... (${pct}%)`;
      case 'initializing tesseract':
        return `تهيئة نواة المعالج المحلي... (${pct}%)`;
      case 'loading language traineddata':
        return `تحميل قواميس ونماذج اللغة... (${pct}%)`;
      case 'initializing api':
        return `إعداد مسار التعرف البصري... (${pct}%)`;
      case 'recognizing text':
        return `مسح وقراءة النصوص واستخراج الكلمات... (${pct}%)`;
      default:
        return `جاري المعالجة محلياً... (${pct}%)`;
    }
  }

  /**
   * Performs OCR on an image (HTMLCanvasElement, HTMLImageElement, or Data URL / Blob)
   */
  async recognize(
    imageSource: string | HTMLCanvasElement | HTMLImageElement,
    imageName: string,
    language: string = 'ara+eng',
    psmMode?: any
  ): Promise<OcrResult> {
    this.isProcessing.set(true);
    this.progress.set({ status: 'starting', progress: 0.05, arabicMessage: 'بدء تهيئة المحرك المحلي...' });

    let worker: Worker | null = null;
    try {
      // Create fresh worker
      worker = await createWorker(language, 1, {
        logger: (m: any) => {
          if (m && m.status) {
            const rawProgress = typeof m.progress === 'number' ? m.progress : 0;
            this.progress.set({
              status: m.status,
              progress: rawProgress,
              arabicMessage: this.translateStatus(m.status, rawProgress)
            });
          }
        }
      });

      if (psmMode !== undefined) {
        await worker.setParameters({
          tessedit_pageseg_mode: psmMode.toString() as any
        });
      }

      this.progress.set({ status: 'recognizing', progress: 0.5, arabicMessage: 'قراءة وتحليل السطور والكلمات...' });

      const ret = await worker.recognize(imageSource);
      const data: any = ret.data;

      // Extract image dimensions if canvas/image
      let imgWidth = 800;
      let imgHeight = 600;
      if (typeof imageSource !== 'string') {
        imgWidth = imageSource.width || 800;
        imgHeight = imageSource.height || 600;
      }

      // Structure words
      const words: OcrWord[] = ((data.words as any[]) || []).map((w: any) => ({
        text: w.text ? w.text.trim() : '',
        confidence: Math.round(w.confidence || 0),
        bbox: {
          x0: w.bbox?.x0 || 0,
          y0: w.bbox?.y0 || 0,
          x1: w.bbox?.x1 || 0,
          y1: w.bbox?.y1 || 0
        }
      })).filter((w: OcrWord) => w.text.length > 0);

      // Structure lines
      const lines: OcrLine[] = ((data.lines as any[]) || []).map((l: any) => ({
        text: l.text ? l.text.trim() : '',
        confidence: Math.round(l.confidence || 0),
        bbox: {
          x0: l.bbox?.x0 || 0,
          y0: l.bbox?.y0 || 0,
          x1: l.bbox?.x1 || 0,
          y1: l.bbox?.y1 || 0
        },
        words: ((l.words as any[]) || []).map((w: any) => ({
          text: w.text ? w.text.trim() : '',
          confidence: Math.round(w.confidence || 0),
          bbox: {
            x0: w.bbox?.x0 || 0,
            y0: w.bbox?.y0 || 0,
            x1: w.bbox?.x1 || 0,
            y1: w.bbox?.y1 || 0
          }
        })).filter((w: OcrWord) => w.text.length > 0)
      })).filter((l: OcrLine) => l.text.length > 0);

      // Structure blocks / paragraphs
      const blocks: OcrBlock[] = ((data.blocks as any[]) || []).map((b: any) => ({
        text: b.text ? b.text.trim() : '',
        confidence: Math.round(b.confidence || 0),
        bbox: {
          x0: b.bbox?.x0 || 0,
          y0: b.bbox?.y0 || 0,
          x1: b.bbox?.x1 || 0,
          y1: b.bbox?.y1 || 0
        },
        lines: ((b.lines as any[]) || []).map((l: any) => ({
          text: l.text ? l.text.trim() : '',
          confidence: Math.round(l.confidence || 0),
          bbox: {
            x0: l.bbox?.x0 || 0,
            y0: l.bbox?.y0 || 0,
            x1: l.bbox?.x1 || 0,
            y1: l.bbox?.y1 || 0
          },
          words: ((l.words as any[]) || []).map((w: any) => ({
            text: w.text ? w.text.trim() : '',
            confidence: Math.round(w.confidence || 0),
            bbox: {
              x0: w.bbox?.x0 || 0,
              y0: w.bbox?.y0 || 0,
              x1: w.bbox?.x1 || 0,
              y1: w.bbox?.y1 || 0
            }
          })).filter((w: OcrWord) => w.text.length > 0)
        })).filter((l: OcrLine) => l.text.length > 0)
      })).filter((b: OcrBlock) => b.text.length > 0);

      // Create a small thumbnail
      const thumbnail = typeof imageSource === 'string' 
        ? imageSource 
        : (imageSource as HTMLCanvasElement).toDataURL ? (imageSource as HTMLCanvasElement).toDataURL('image/jpeg', 0.5) : '';

      const result: OcrResult = {
        id: 'ocr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        timestamp: Date.now(),
        imageName: imageName || 'صورة ممسوحة',
        imageThumbnail: thumbnail.length > 150000 ? thumbnail.substring(0, 150000) : thumbnail,
        imageWidth: imgWidth,
        imageHeight: imgHeight,
        fullText: data.text ? data.text.trim() : '',
        language,
        averageConfidence: Math.round(data.confidence || 0),
        blocks,
        lines,
        words
      };

      this.saveToHistory(result);
      this.progress.set({ status: 'done', progress: 1, arabicMessage: 'تم استخراج النصوص بنجاح!' });
      return result;
    } catch (err: any) {
      console.error('OCR Extraction Error:', err);
      this.progress.set({ status: 'error', progress: 0, arabicMessage: 'حدث خطأ أثناء قراءة الصورة: ' + (err.message || err) });
      throw err;
    } finally {
      if (worker) {
        try {
          await worker.terminate();
        } catch (_) {}
      }
      this.isProcessing.set(false);
    }
  }

  /**
   * Applies image adjustments and filters onto a canvas
   */
  applyImageFilters(
    sourceImg: HTMLImageElement,
    adjustments: ImageAdjustments,
    cropRect?: { x: number; y: number; width: number; height: number } | null
  ): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    let srcX = 0;
    let srcY = 0;
    let srcW = sourceImg.naturalWidth || sourceImg.width;
    let srcH = sourceImg.naturalHeight || sourceImg.height;

    if (cropRect && cropRect.width > 5 && cropRect.height > 5) {
      srcX = Math.max(0, cropRect.x);
      srcY = Math.max(0, cropRect.y);
      srcW = Math.min(srcW - srcX, cropRect.width);
      srcH = Math.min(srcH - srcY, cropRect.height);
    }

    const isRotated90or270 = adjustments.rotation === 90 || adjustments.rotation === 270;
    canvas.width = isRotated90or270 ? srcH : srcW;
    canvas.height = isRotated90or270 ? srcW : srcH;

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((adjustments.rotation * Math.PI) / 180);

    const drawW = isRotated90or270 ? canvas.height : canvas.width;
    const drawH = isRotated90or270 ? canvas.width : canvas.height;

    ctx.drawImage(sourceImg, srcX, srcY, srcW, srcH, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    // Apply pixel-level filters
    if (adjustments.grayscale || adjustments.binarize || adjustments.invert || adjustments.brightness !== 0 || adjustments.contrast !== 0) {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      const contrastFactor = (259 * (adjustments.contrast + 255)) / (255 * (259 - adjustments.contrast));
      const threshold = adjustments.thresholdValue || 128;

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Brightness
        if (adjustments.brightness !== 0) {
          r += adjustments.brightness;
          g += adjustments.brightness;
          b += adjustments.brightness;
        }

        // Contrast
        if (adjustments.contrast !== 0) {
          r = contrastFactor * (r - 128) + 128;
          g = contrastFactor * (g - 128) + 128;
          b = contrastFactor * (b - 128) + 128;
        }

        // Grayscale / Binarize
        if (adjustments.grayscale || adjustments.binarize) {
          let gray = 0.299 * r + 0.587 * g + 0.114 * b;
          if (adjustments.binarize) {
            gray = gray >= threshold ? 255 : 0;
          }
          r = gray;
          g = gray;
          b = gray;
        }

        // Invert
        if (adjustments.invert) {
          r = 255 - r;
          g = 255 - g;
          b = 255 - b;
        }

        data[i] = Math.min(255, Math.max(0, r));
        data[i + 1] = Math.min(255, Math.max(0, g));
        data[i + 2] = Math.min(255, Math.max(0, b));
      }
      ctx.putImageData(imgData, 0, 0);
    }

    return canvas;
  }

  /**
   * Text-to-Speech playback using browser native SpeechSynthesis
   */
  speakText(text: string, lang: string = 'ar-SA'): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    if (!text || text.trim().length === 0) {
      this.isSpeaking.set(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    // Detect language if possible
    const isArabic = /[\u0600-\u06FF]/.test(text);
    utterance.lang = isArabic ? 'ar-SA' : 'en-US';
    utterance.rate = 0.95;

    utterance.onstart = () => this.isSpeaking.set(true);
    utterance.onend = () => this.isSpeaking.set(false);
    utterance.onerror = () => this.isSpeaking.set(false);

    window.speechSynthesis.speak(utterance);
  }

  stopSpeaking(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.isSpeaking.set(false);
  }

  /**
   * Local history storage management
   */
  private loadHistory(): OcrResult[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveToHistory(item: OcrResult): void {
    if (typeof window === 'undefined') return;
    try {
      const current = this.loadHistory();
      // Keep up to 30 recent items
      const updated = [item, ...current.filter(i => i.id !== item.id)].slice(0, 30);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      this.history.set(updated);
    } catch (e) {
      console.warn('Could not save OCR item to localStorage history', e);
    }
  }

  deleteHistoryItem(id: string): void {
    const current = this.loadHistory();
    const updated = current.filter(i => i.id !== id);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      this.history.set(updated);
    } catch {}
  }

  clearHistory(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      this.history.set([]);
    } catch {}
  }
}
