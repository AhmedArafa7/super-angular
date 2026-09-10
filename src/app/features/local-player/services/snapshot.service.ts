import { Injectable, inject } from '@angular/core';
import { OcrService } from '../../../core/services/ocr.service';

@Injectable({
  providedIn: 'root'
})
export class SnapshotService {
  private ocrService = inject(OcrService);

  takeSnapshot(vid: HTMLVideoElement): string {
    const canvas = document.createElement('canvas');
    canvas.width = vid.videoWidth || 1280;
    canvas.height = vid.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  }

  async extractText(dataUrl: string, imageName: string, language: string = 'eng'): Promise<string> {
    const res = await this.ocrService.recognize(dataUrl, imageName, language);
    return res.fullText || '';
  }

  rotate(currentAngle: number): number {
    return (currentAngle + 90) % 360;
  }

  async downloadEditedSnapshot(dataUrl: string, angle: number, fileName: string): Promise<void> {
    const img = new Image();
    img.src = dataUrl;
    await img.decode();

    const canvas = document.createElement('canvas');
    // Handle rotation for dimensions
    if (angle === 90 || angle === 270) {
      canvas.width = img.height;
      canvas.height = img.width;
    } else {
      canvas.width = img.width;
      canvas.height = img.height;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);

    const rotatedDataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = rotatedDataUrl;
    a.download = fileName;
    a.click();
  }
}
