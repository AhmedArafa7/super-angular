import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, from, throwError, BehaviorSubject, switchMap, catchError, filter, take } from 'rxjs';
import { FirebaseService } from '../services/firebase.service';

let isRefreshing = false;
let refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

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
    return next(cloned).pipe(
      catchError(error => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          return handle401Error(req, next, firebaseService);
        } else {
          return throwError(() => error);
        }
      })
    );
  } else {
    // Token is missing or expired, attempt refresh
    return handle401Error(req, next, firebaseService);
  }
};

function handle401Error(request: HttpRequest<any>, next: HttpHandlerFn, firebaseService: FirebaseService): Observable<HttpEvent<any>> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    return from(firebaseService.refreshGoogleToken()).pipe(
      switchMap((token) => {
        isRefreshing = false;
        refreshTokenSubject.next(token);
        
        if (token) {
          return next(request.clone({
            setHeaders: { Authorization: `Bearer ${token}` }
          }));
        }
        return throwError(() => new Error('Failed to refresh token'));
      }),
      catchError((err) => {
        isRefreshing = false;
        return throwError(() => err);
      })
    );
  } else {
    return refreshTokenSubject.pipe(
      filter(token => token != null),
      take(1),
      switchMap(token => {
        return next(request.clone({
          setHeaders: { Authorization: `Bearer ${token}` }
        }));
      })
    );
  }
}
