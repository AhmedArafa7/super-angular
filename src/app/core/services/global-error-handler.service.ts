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

    const errorContext: GlobalErrorContext = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : undefined
    };

    if (isDevMode()) {
      console.error('[Global Error Handler Catch]:', errorContext.message, errorContext);
    }

    // Gracefully inform user via Toast without crashing the Angular UI thread
    if (toastService) {
      toastService.show('حدث خطأ غير متوقع في النظام، تم احتواء المشكلة بنجاح 🛡️', 'warning');
    }
  }
}
