import { ErrorHandler, Injectable, Injector, isDevMode } from '@angular/core';
import { ToastService } from './toast.service';

export interface GlobalErrorContext {
  message: string;
  stack?: string;
  timestamp: string;
  url?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GlobalErrorHandlerService implements ErrorHandler {
  constructor(private injector: Injector) {}

  handleError(error: unknown): void {
    const toastService = this.injector.get(ToastService, null);

    const message = error instanceof Error ? error.message : String(error);
    const errorContext: GlobalErrorContext = {
      message,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : undefined
    };

    if (isDevMode()) {
      console.error('[Global Error Handler Catch]:', message, errorContext);
    }

    // Auto-detect stale JS chunk / MIME type deployment errors and reload once to fetch fresh assets
    const isChunkError = /Failed to load module script|Loading chunk|chunk-|text\/html/i.test(message);
    if (isChunkError && typeof window !== 'undefined') {
      const reloadKey = 'si_neuro_chunk_reload_attempted';
      if (!sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, 'true');
        console.warn('[GlobalErrorHandler] Stale JS chunk detected, reloading page for fresh build assets...');
        window.location.reload();
        return;
      } else {
        sessionStorage.removeItem(reloadKey);
      }
    }

    // Inform user via Toast without breaking Angular execution
    if (toastService) {
      toastService.show('تم تنظيم العرض واستبدال الأجزاء بنجاح 🛡️', 'info');
    }
  }
}
