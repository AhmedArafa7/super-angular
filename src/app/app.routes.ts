import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: '/stream', pathMatch: 'full' },
  {
    path: 'stream',
    loadComponent: () => import('./features/wetube/components/wetube-shell/wetube-shell').then(c => c.WeTubeShellComponent),
    children: [
      { path: 'onboarding', loadComponent: () => import('./features/wetube/components/wetube-onboarding/wetube-onboarding').then(c => c.WeTubeOnboardingComponent), title: 'WeTube - مرحباً' },
      { path: '', loadComponent: () => import('./features/wetube/components/wetube-home/wetube-home').then(c => c.WeTubeHomeComponent), title: 'WeTube - Stream' },
      { path: 'watch/:id', loadComponent: () => import('./features/wetube/components/wetube-watch-view/wetube-watch-view').then(c => c.WeTubeWatchViewComponent), title: 'WeTube - Watch' },
      { path: 'shorts', loadComponent: () => import('./features/wetube/components/wetube-shorts/wetube-shorts').then(c => c.WeTubeShortsComponent), title: 'WeTube - Shorts' },
      { path: 'studio', loadComponent: () => import('./features/wetube/components/wetube-studio/wetube-studio').then(c => c.WeTubeStudioComponent), title: 'WeTube - Studio' },
      { path: 'library', loadComponent: () => import('./features/wetube/components/wetube-library/wetube-library').then(c => c.WeTubeLibraryComponent), title: 'WeTube - Library' },
      { path: 'subscriptions', loadComponent: () => import('./features/wetube/components/wetube-subscriptions/wetube-subscriptions').then(c => c.WeTubeSubscriptionsComponent), title: 'WeTube - Subscriptions' },
      { path: 'notifications', loadComponent: () => import('./features/wetube/components/wetube-notifications/wetube-notifications').then(c => c.WeTubeNotificationsComponent), title: 'WeTube - Notifications' }
    ]
  },
  {
    path: 'health',
    loadComponent: () => import('./features/health/health.component').then(c => c.HealthComponent),
    title: 'الصحة والرياضة'
  },
  { path: '**', redirectTo: '/stream' }
];
