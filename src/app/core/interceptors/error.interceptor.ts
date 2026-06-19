import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Ignore offline errors since they are handled by network.interceptor
      if (!navigator.onLine) {
        return throwError(() => error);
      }

      console.error('[ErrorInterceptor] API Error caught:', error);

      // TODO: Integrate a Toast/Snackbar service here to display nice error messages
      if (error.status === 401) {
        console.warn('Unauthorized access - please log in again.');
      } else if (error.status >= 500) {
        console.warn('Server error occurred.');
      }

      return throwError(() => error);
    })
  );
};
