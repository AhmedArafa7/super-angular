import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ImageOptimizerService {
  
  /**
   * Compress an image file using Canvas API
   * @param file The original image file
   * @param maxWidth Max width/height to resize to
   * @param quality Quality of the output WebP (0 to 1)
   * @returns A Promise that resolves with the compressed Base64 string
   */
  async compressImage(file: File, maxWidth: number = 800, quality: number = 0.7): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!file.type.match(/image.*/)) {
        reject(new Error('File is not an image'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (readerEvent: any) => {
        const image = new Image();
        image.onload = () => {
          const canvas = document.createElement('canvas');
          let width = image.width;
          let height = image.height;

          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxWidth) {
              width *= maxWidth / height;
              height = maxWidth;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          ctx.drawImage(image, 0, 0, width, height);

          // Convert to WebP for best compression
          const dataUrl = canvas.toDataURL('image/webp', quality);
          resolve(dataUrl);
        };
        
        image.onerror = (err) => reject(err);
        image.src = readerEvent.target.result;
      };
      
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }
}
