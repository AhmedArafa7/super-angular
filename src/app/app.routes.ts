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
      {
        path: 'stream',
        loadComponent: () => import('./features/wetube/components/wetube-shell/wetube-shell').then(c => c.WeTubeShellComponent),
        children: [
          { path: '', loadComponent: () => import('./features/wetube/components/wetube-home/wetube-home').then(c => c.WeTubeHomeComponent), title: 'الصفحة الرئيسية - WeTube' },
          { path: 'shorts', loadComponent: () => import('./features/wetube/components/wetube-shorts/wetube-shorts').then(c => c.WeTubeShortsComponent), title: 'Shorts - WeTube' },
          { path: 'subscriptions', loadComponent: () => import('./features/wetube/components/wetube-subscriptions/wetube-subscriptions').then(c => c.WeTubeSubscriptionsComponent), title: 'الاشتراكات - WeTube' },
          { path: 'notifications', loadComponent: () => import('./features/wetube/components/wetube-notifications/wetube-notifications').then(c => c.WeTubeNotificationsComponent), title: 'الإشعارات - WeTube' },
          { path: 'library', loadComponent: () => import('./features/wetube/components/wetube-library/wetube-library').then(c => c.WeTubeLibraryComponent), title: 'المكتبة - WeTube' },
          { path: 'history', loadComponent: () => import('./features/wetube/components/wetube-library/wetube-library').then(c => c.WeTubeLibraryComponent), title: 'سجل المشاهدة - WeTube' },
          { path: 'liked', loadComponent: () => import('./features/wetube/components/wetube-library/wetube-library').then(c => c.WeTubeLibraryComponent), title: 'فيديوهات أعجبتني - WeTube' },
          { path: 'studio', loadComponent: () => import('./features/wetube/components/wetube-studio/wetube-studio').then(c => c.WeTubeStudioComponent), title: 'WeTube Studio' },
          { path: 'watch/:id', loadComponent: () => import('./features/wetube/components/wetube-watch-view/wetube-watch-view').then(c => c.WeTubeWatchViewComponent), title: 'مشاهدة الفيديو - WeTube' },
          { path: 'channel/:id', loadComponent: () => import('./features/wetube/components/wetube-channel/wetube-channel.component').then(c => c.WeTubeChannelComponent) }
        ]
      },
      { path: 'arcade', loadComponent: () => import('./features/arcade/arcade-hub.component').then(c => c.ArcadeHubComponent), title: 'الألعاب' },
      { path: 'arcade/arena/:id', loadComponent: () => import('./features/arcade/arcade-arena.component').then(c => c.ArcadeArenaComponent) },
      { path: 'settings', loadComponent: () => import('./features/settings/settings.component').then(c => c.SettingsComponent) },
      { path: 'chat', loadComponent: () => import('./features/chat/chat.component').then(c => c.ChatComponent), title: 'الدردشة الذكية' },
      { path: 'peer-chat', loadComponent: () => import('./features/peer-chat/peer-chat.component').then(c => c.PeerChatComponent), title: 'التواصل المباشر' },
      { path: 'downloads', loadComponent: () => import('./features/downloads/downloads.component').then(c => c.DownloadsComponent), title: 'مركز التحميل وإدارة الذاكرة' },
      { path: 'hisn', loadComponent: () => import('./features/hisn/hisn.component').then(c => c.HisnComponent), title: 'حصن المسلم' },
      { path: 'docs', loadComponent: () => import('./features/docs/docs.component').then(c => c.DocsComponent), title: 'محرر المستندات SuperDoc' },
      { path: 'vault', loadComponent: () => import('./features/vault/vault.component').then(c => c.VaultComponent), title: 'خزنة الملفات' },
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
