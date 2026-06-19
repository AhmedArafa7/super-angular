import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { OfflineQueueService } from '../services/offline-queue.service';

export const networkInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
  const offlineQueue = inject(OfflineQueueService);

  // Check if browser is offline
  if (!navigator.onLine) {
    // If it's a data-modifying request (POST, PUT, DELETE, PATCH)
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      
      // Serialize headers safely
      const headerObj: any = {};
      req.headers.keys().forEach(key => {
        headerObj[key] = req.headers.get(key);
      });

      offlineQueue.enqueueRequest({
        url: req.url,
        method: req.method,
        body: req.body,
        headers: headerObj
      });
      
      // Return a Mock Response so the Component/UI thinks it succeeded and proceeds normally
      return of(new HttpResponse({ 
        status: 202, 
        statusText: 'Accepted (Offline)', 
        body: { offline: true, message: 'Request saved offline. Will sync when connection is restored.' } 
      }));
    } else {
      // For GET requests, fail fast if offline so UI can show cached state or error state
      return throwError(() => new Error('No internet connection. Unable to fetch fresh data.'));
    }
  }

  // If online, proceed normally
  return next(req);
};
