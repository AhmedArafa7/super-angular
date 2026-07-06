import { Directive, ElementRef, HostListener, Input } from '@angular/core';

@Directive({
  selector: 'img[appImageFallback]',
  standalone: true
})
export class ImageFallbackDirective {
  @Input() appImageFallback = 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22400%22%20height%3D%22400%22%20viewBox%3D%220%200%20400%20400%22%3E%3Crect%20width%3D%22400%22%20height%3D%22400%22%20fill%3D%22%23e2e8f0%22%2F%3E%3Cpath%20d%3D%22M150%20150%20L250%20250%20M250%20150%20L150%20250%22%20stroke%3D%22%23cbd5e1%22%20stroke-width%3D%228%22%2F%3E%3C%2Fsvg%3E';
  
  private hasErrored = false;

  constructor(private el: ElementRef<HTMLImageElement>) {}

  @HostListener('error')
  onError() {
    if (!this.hasErrored) {
      this.hasErrored = true;
      const img = this.el.nativeElement;
      img.src = this.appImageFallback;
      // Optionally style the fallback to look good (e.g. contain instead of cover)
      if (img.classList.contains('object-cover')) {
        img.classList.remove('object-cover');
        img.classList.add('object-contain', 'bg-surface-container-high', 'p-4');
      }
    }
  }
}
