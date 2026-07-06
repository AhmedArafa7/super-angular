import { Component, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LightboxService } from '../../../core/services/lightbox.service';
import { LucideDynamicIcon } from '@lucide/angular';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-lightbox',
  standalone: true,
  imports: [CommonModule, LucideDynamicIcon],
  template: `
    <div *ngIf="lightbox.isOpen()" 
         @fade
         class="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4 md:p-12 cursor-zoom-out"
         (click)="lightbox.close()">
         
      <!-- Close Button -->
      <button class="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors shadow-lg backdrop-blur-md z-[10000]"
              (click)="lightbox.close()">
        <svg lucideIcon="x" class="w-6 h-6"></svg>
      </button>

      <!-- Image Container -->
      <div class="relative max-w-full max-h-full flex items-center justify-center" (click)="$event.stopPropagation()">
        <img *ngIf="lightbox.activeImageSrc()" 
             [src]="lightbox.activeImageSrc()" 
             @zoom
             class="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl select-none" 
             alt="Preview">
      </div>
    </div>
  `,
  animations: [
    trigger('fade', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0 }))
      ])
    ]),
    trigger('zoom', [
      transition(':enter', [
        style({ transform: 'scale(0.95)', opacity: 0 }),
        animate('300ms cubic-bezier(0.16, 1, 0.3, 1)', style({ transform: 'scale(1)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ transform: 'scale(0.95)', opacity: 0 }))
      ])
    ])
  ]
})
export class LightboxComponent {
  lightbox = inject(LightboxService);

  @HostListener('window:keydown.escape')
  onEscape() {
    this.lightbox.close();
  }
}
