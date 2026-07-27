import { ApplicationConfig, provideZoneChangeDetection, provideBrowserGlobalErrorListeners, isDevMode } from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions, withPreloading } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors, withInterceptorsFromDi } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';

import { routes } from './app.routes';
import { CriticalPreloadingStrategy } from './core/strategies/critical-preloading.strategy';
import { networkInterceptor } from './core/interceptors/network.interceptor';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { provideLucideIcons } from './core/icons.provider';

import { youtubeAuthInterceptor } from './core/interceptors/youtube-auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideLucideIcons(),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding(), withViewTransitions(), withPreloading(CriticalPreloadingStrategy)),
    provideHttpClient(
      withFetch(),
      withInterceptors([networkInterceptor, authInterceptor, errorInterceptor, youtubeAuthInterceptor]),
      withInterceptorsFromDi()
    ),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    })
  ]
};
