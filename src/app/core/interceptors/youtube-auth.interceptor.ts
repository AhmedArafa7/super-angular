import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { FirebaseService } from '../services/firebase.service';

export const youtubeAuthInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
  const firebaseService = inject(FirebaseService);

  // We only care about Google APIs
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
  } else {
    // If the token is missing or expired, proceed without the header.
    // This avoids opening intrusive popups automatically on page load.
    return next(req);
  }
};
