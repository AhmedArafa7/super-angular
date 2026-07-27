import { Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, of, timer } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class CriticalPreloadingStrategy implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<any>): Observable<any> {
    // Check if route explicitly requests preloading via data property
    if (route.data && route.data['preload'] === true) {
      // Delay preloading slightly (e.g. 2 seconds after app stable) to avoid bandwidth contention on initial load
      const delayMs = route.data['preloadDelay'] || 2000;
      return timer(delayMs).pipe(
        mergeMap(() => load())
      );
    }
    return of(null);
  }
}
