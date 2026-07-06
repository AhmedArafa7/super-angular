import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LightboxService {
  isOpen = signal<boolean>(false);
  activeImageSrc = signal<string | null>(null);

  open(src: string) {
    if (!src) return;
    this.activeImageSrc.set(src);
    this.isOpen.set(true);
    document.body.style.overflow = 'hidden'; // prevent scrolling
  }

  close() {
    this.isOpen.set(false);
    setTimeout(() => {
      this.activeImageSrc.set(null);
      document.body.style.overflow = '';
    }, 300); // Wait for animation
  }
}
