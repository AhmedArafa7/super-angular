import { ErrorHandler, Injectable, Injector, isDevMode } from '@angular/core';

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
  private isReloading = false;

  constructor(private injector: Injector) {}

  handleError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);

    // Ignore change detection loop errors and expression changed errors to prevent recursive loops
    if (/NG0103|NG0100|ExpressionChangedAfterItHasBeenCheckedError|Infinite change detection/i.test(message)) {
      if (isDevMode()) {
        console.warn('[GlobalErrorHandler] Suppressed change detection loop error:', message);
      }
      return;
    }

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
    if (isChunkError && typeof window !== 'undefined' && !this.isReloading) {
      const reloadKey = 'si_neuro_chunk_reload_attempted';
      if (!sessionStorage.getItem(reloadKey)) {
        this.isReloading = true;
        sessionStorage.setItem(reloadKey, 'true');
        console.warn('[GlobalErrorHandler] Stale JS chunk detected, reloading page for fresh build assets...');
        window.location.reload();
        return;
      } else {
        sessionStorage.removeItem(reloadKey);
      }
    }
  }
}
