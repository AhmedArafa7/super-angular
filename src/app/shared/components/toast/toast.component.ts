import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';
import { LucideDynamicIcon } from '@lucide/angular';
import { trigger, transition, style, animate, state } from '@angular/animations';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule, LucideDynamicIcon],
  template: `
    <!-- Toasts Container -->
    <div class="fixed bottom-4 left-4 z-[9999] flex flex-col gap-2 w-80 pointer-events-none">
      <div *ngFor="let toast of toastService.toasts()" 
           class="pointer-events-auto rounded-lg shadow-lg border p-4 flex items-start gap-3 backdrop-blur-md transition-all duration-300 animate-slide-up"
           [ngClass]="getToastClass(toast.type)">
        
        <svg 
          [lucideIcon]="getIconName(toast.type)" 
          class="w-5 h-5 shrink-0 mt-0.5" 
          [ngClass]="getIconClass(toast.type)">
        </svg>

        <div class="flex-1 text-sm font-medium">
          {{ toast.message }}
        </div>

        <button (click)="toastService.remove(toast.id)" class="shrink-0 p-1 rounded-md opacity-70 hover:opacity-100 hover:bg-black/10 transition-colors">
          <svg lucideIcon="x" class="w-4 h-4"></svg>
        </button>
      </div>
    </div>

    <!-- Confirm Dialog Backdrop -->
    <div *ngIf="toastService.confirmDialog() as dialog" 
         class="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center animate-fade-in pointer-events-auto">
      <div class="bg-surface-primary border border-surface-container-high rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-scale-up">
        <div class="p-5">
          <div class="flex items-center gap-3 text-error mb-4">
            <div class="bg-error/10 p-2 rounded-full">
              <svg lucideIcon="alert-triangle" class="w-6 h-6"></svg>
            </div>
            <h3 class="text-lg font-bold">تأكيد الإجراء</h3>
          </div>
          <p class="text-on-surface-variant font-medium text-sm leading-relaxed">{{ dialog.message }}</p>
        </div>
        <div class="bg-surface-container-lowest border-t border-surface-container-high px-5 py-3 flex justify-end gap-3">
          <button (click)="dialog.resolve(false)" class="px-4 py-2 text-sm font-medium text-on-surface-variant bg-surface-container-low hover:bg-surface-container rounded-lg transition-colors">
            إلغاء
          </button>
          <button (click)="dialog.resolve(true)" class="px-4 py-2 text-sm font-medium text-on-error bg-error hover:bg-error/90 rounded-lg shadow-sm transition-colors">
            نعم، متأكد
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes slide-up {
      from { opacity: 0; transform: translateY(20px) scale(0.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes scale-up {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    .animate-slide-up { animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
    .animate-scale-up { animation: scale-up 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  `]
})
export class ToastComponent {
  toastService = inject(ToastService);

  getToastClass(type: string): string {
    switch (type) {
      case 'success': return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400';
      case 'error': return 'bg-error/10 border-error/20 text-error';
      case 'warning': return 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400';
      default: return 'bg-primary/10 border-primary/20 text-primary';
    }
  }

  getIconClass(type: string): string {
    switch (type) {
      case 'success': return 'text-emerald-600 dark:text-emerald-400';
      case 'error': return 'text-error';
      case 'warning': return 'text-amber-600 dark:text-amber-400';
      default: return 'text-primary';
    }
  }

  getIconName(type: string): string {
    switch (type) {
      case 'success': return 'check-circle-2';
      case 'error': return 'alert-circle';
      case 'warning': return 'alert-triangle';
      default: return 'info';
    }
  }
}
