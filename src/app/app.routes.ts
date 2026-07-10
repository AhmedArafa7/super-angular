import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';
import { AppShellComponent } from './layout/app-shell/app-shell';

export const routes: Routes = [
  // 1. المسارات التي تعمل داخل الـ Shell (لوحة التحكم، الألعاب، Wetube)
  {
    path: '',
    component: AppShellComponent,
    children: [
      { path: 'launcher', loadComponent: () => import('./features/launcher/launcher.component').then(c => c.LauncherComponent), title: 'لوحة التحكم المركزية' },
      { path: 'stream', loadComponent: () => import('./features/wetube/components/wetube-shell/wetube-shell').then(c => c.WeTubeShellComponent), children: [] }, // ملاحظة: سأترك المسارات الفرعية في ملفها
      { path: 'arcade', loadComponent: () => import('./features/arcade/arcade-hub.component').then(c => c.ArcadeHubComponent), title: 'الألعاب' },
      { path: 'arcade/arena/:id', loadComponent: () => import('./features/arcade/arcade-arena.component').then(c => c.ArcadeArenaComponent) },
      { path: 'settings', loadComponent: () => import('./features/settings/settings.component').then(c => c.SettingsComponent) },
      { path: 'admin', loadComponent: () => import('./features/admin/admin.component').then(c => c.AdminComponent), canActivate: [adminGuard] }
    ]
  },

  // 2. المسارات المستقلة (المخبز وأي متجر مستقبلي)
  {
    path: 'bakery',
    loadComponent: () => import('./features/bakery/bakery-home.component').then(c => c.BakeryHomeComponent),
    title: 'مخبز عباد الرحمن'
  },
  {
    path: 'bakery/admin',
    loadComponent: () => import('./features/admin/components/bakery-auth.component').then(c => c.BakeryAuthComponent)
  },

  { path: '**', redirectTo: '/launcher' }
];
