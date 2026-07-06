import { Directive, HostListener, HostBinding, ElementRef, inject } from '@angular/core';
import { LightboxService } from '../../core/services/lightbox.service';

@Directive({
  selector: 'img:not([data-no-preview])',
  standalone: true
})
export class ImagePreviewDirective {
  private lightbox = inject(LightboxService);
  private el = inject(ElementRef<HTMLImageElement>);

  // Add a cursor style to indicate interactivity
  @HostBinding('style.cursor') cursor = 'zoom-in';

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent) {
    // Only preview if the image has a valid src
    const src = this.el.nativeElement.src;
    
    // Ignore data URIs if they are too small, but we want to allow bakery uploaded images which are data URIs.
    // Also ignore tiny generic icons if needed, but the selector can use data-no-preview to handle exceptions.
    if (src && !src.endsWith('favicon.ico')) {
      event.preventDefault();
      event.stopPropagation();
      this.lightbox.open(src);
    }
  }
}
