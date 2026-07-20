import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { FirebaseService } from '../services/firebase.service';

export const youtubeAuthInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
  const firebaseService = inject(FirebaseService);

  if (!req.url.includes('googleapis.com/youtube')) {
    return next(req);
  }

  const token = localStorage.getItem('yt_access_token');
  const expiry = localStorage.getItem('yt_token_expiry');
  const isExpired = expiry ? Date.now() > parseInt(expiry, 10) : true;

  if (token && !isExpired) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(cloned);
  }

  return next(req);
};
