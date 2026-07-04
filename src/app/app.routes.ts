import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/stream', pathMatch: 'full' },
  {
    path: 'stream',
    loadComponent: () => import('./features/wetube/components/wetube-shell/wetube-shell').then(c => c.WeTubeShellComponent),
    children: [
      { path: 'onboarding', loadComponent: () => import('./features/wetube/components/wetube-onboarding/wetube-onboarding').then(c => c.WeTubeOnboardingComponent), title: 'WeTube - مرحباً' },
      { path: '', loadComponent: () => import('./features/wetube/components/wetube-home/wetube-home').then(c => c.WeTubeHomeComponent), title: 'WeTube - Stream' },
      { path: 'watch/:id', loadComponent: () => import('./features/wetube/components/wetube-watch-view/wetube-watch-view').then(c => c.WeTubeWatchViewComponent), title: 'WeTube - Watch' },
      { path: 'channel/:id', loadComponent: () => import('./features/wetube/components/wetube-channel/wetube-channel.component').then(c => c.WeTubeChannelComponent), title: 'WeTube - Channel' },
      { path: 'shorts', loadComponent: () => import('./features/wetube/components/wetube-shorts/wetube-shorts').then(c => c.WeTubeShortsComponent), title: 'WeTube - Shorts' },
      { path: 'studio', loadComponent: () => import('./features/wetube/components/wetube-studio/wetube-studio').then(c => c.WeTubeStudioComponent), title: 'WeTube - Studio' },
      { path: 'library', loadComponent: () => import('./features/wetube/components/wetube-library/wetube-library').then(c => c.WeTubeLibraryComponent), title: 'WeTube - Library' },
      { path: 'subscriptions', loadComponent: () => import('./features/wetube/components/wetube-subscriptions/wetube-subscriptions').then(c => c.WeTubeSubscriptionsComponent), title: 'WeTube - Subscriptions' },
      { path: 'notifications', loadComponent: () => import('./features/wetube/components/wetube-notifications/wetube-notifications').then(c => c.WeTubeNotificationsComponent), title: 'WeTube - Notifications' },
      { path: 'discovery', loadComponent: () => import('./features/wetube/components/discovery-mode/discovery-mode.component').then(c => c.DiscoveryModeComponent), title: 'WeTube - Discovery' }
    ]
  },
  {
    path: 'health',
    loadComponent: () => import('./features/health/health.component').then(c => c.HealthComponent),
    title: 'الصحة والرياضة'
  },
  {
    path: 'settings',
    loadComponent: () => import('./features/settings/settings.component').then(c => c.SettingsComponent),
    title: 'الإعدادات المركزية'
  },
  {
    path: 'admin',
    loadComponent: () => import('./features/admin/admin.component').then(c => c.AdminComponent),
    canActivate: [adminGuard],
    title: 'لوحة الإدارة'
  },
  { path: '**', redirectTo: '/stream' }
];
