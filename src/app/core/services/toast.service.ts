import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

export interface ConfirmDialog {
  id: string;
  message: string;
  resolve: (value: boolean) => void;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  toasts = signal<Toast[]>([]);
  confirmDialog = signal<ConfirmDialog | null>(null);

  show(message: string, type: ToastType = 'info', duration: number = 4000) {
    const id = Math.random().toString(36).substr(2, 9);
    const toast: Toast = { id, message, type };
    
    this.toasts.update(current => [...current, toast]);

    setTimeout(() => {
      this.remove(id);
    }, duration);
  }

  remove(id: string) {
    this.toasts.update(current => current.filter(t => t.id !== id));
  }

  confirm(message: string): Promise<boolean> {
    return new Promise(resolve => {
      this.confirmDialog.set({
        id: Math.random().toString(36).substr(2, 9),
        message,
        resolve: (value: boolean) => {
          this.confirmDialog.set(null);
          resolve(value);
        }
      });
    });
  }
}
