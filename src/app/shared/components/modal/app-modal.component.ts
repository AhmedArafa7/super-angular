/**
 * ♻️ Generic Reusable Modal Shell — app-modal
 *
 * A DRY modal wrapper that provides:
 *  - Backdrop overlay (click-to-close)
 *  - Centered panel with rounded corners & shadow
 *  - Header row: icon slot + title + subtitle + close button
 *  - <ng-content> body — filled entirely by the parent component
 *
 * Usage:
 *   <app-modal
 *     [isOpen]="mySignal()"
 *     title="عنوان المودال"
 *     subtitle="وصف قصير"
 *     icon="package-plus"
 *     [maxWidth]="'max-w-md'"
 *     (closed)="mySignal.set(false)">
 *
 *     <!-- your custom content here -->
 *     <p>أي محتوى تريده</p>
 *
 *   </app-modal>
 */
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideDynamicIcon } from '@lucide/angular';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule, LucideDynamicIcon],
  template: `
    <div *ngIf="isOpen"
         class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
         (click)="close()">

      <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full font-sans border border-slate-200 dark:border-slate-800 shadow-2xl"
           [ngClass]="maxWidth"
           dir="rtl"
           (click)="$event.stopPropagation()">

        <!-- Header -->
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <svg *ngIf="icon" [lucideIcon]="icon" class="w-5 h-5" [class]="iconClass"></svg>
            <span>{{ title }}</span>
          </h3>
          <button (click)="close()"
                  class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <svg lucideIcon="x" class="w-5 h-5"></svg>
          </button>
        </div>

        <p *ngIf="subtitle" class="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
          {{ subtitle }}
        </p>

        <!-- Body — projected from the parent -->
        <ng-content></ng-content>

      </div>
    </div>
  `
})
export class AppModalComponent {
  /** Controls modal visibility */
  @Input() isOpen = false;

  /** Header title text */
  @Input() title = '';

  /** Optional subtitle / description below the title */
  @Input() subtitle = '';

  /** Lucide icon name shown beside the title (e.g. "package-plus", "help-circle") */
  @Input() icon = '';

  /** Tailwind class for the icon color (e.g. "text-amber-500") */
  @Input() iconClass = 'text-emerald-600';

  /** Tailwind max-width class for the panel (default: max-w-md) */
  @Input() maxWidth = 'max-w-md';

  /** Emitted when the modal should close — parent updates isOpen */
  @Output() closed = new EventEmitter<void>();

  close() {
    this.closed.emit();
  }
}
