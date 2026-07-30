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
        data: { preload: true, preloadDelay: 1500 },
        children: [
          { path: '', loadComponent: () => import('./features/wetube/components/wetube-home/wetube-home').then(c => c.WeTubeHomeComponent), title: 'الصفحة الرئيسية - WeTube' },
          { path: 'onboarding', loadComponent: () => import('./shared/onboarding/onboarding').then(c => c.OnboardingComponent), title: 'تخصيص WeTube' },
          { path: 'discovery', loadComponent: () => import('./features/wetube/components/discovery-mode/discovery-mode.component').then(c => c.DiscoveryModeComponent), title: 'اكتشاف - WeTube' },
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
      { path: 'arcade/ai-builder', loadComponent: () => import('./features/arcade/ai-game-builder.component').then(c => c.AiGameBuilderComponent), title: 'استوديو صانع الألعاب الذكي' },
      { path: 'arcade/arena/:id', loadComponent: () => import('./features/arcade/arcade-arena.component').then(c => c.ArcadeArenaComponent) },
      { path: 'time', loadComponent: () => import('./features/time/time.component').then(c => c.TimeComponent), title: 'تنظيم الوقت والتركيز' },
      { path: 'health', loadComponent: () => import('./features/health/health.component').then(c => c.HealthComponent), title: 'الصحة والرياضة' },
      { path: 'settings', loadComponent: () => import('./features/settings/settings.component').then(c => c.SettingsComponent) },
      { path: 'chat', loadComponent: () => import('./features/chat/chat.component').then(c => c.ChatComponent), title: 'الدردشة الذكية' },
      { path: 'peer-chat', loadComponent: () => import('./features/peer-chat/peer-chat.component').then(c => c.PeerChatComponent), title: 'التواصل المباشر' },
      { path: 'downloads', loadComponent: () => import('./features/downloads/downloads.component').then(c => c.DownloadsComponent), title: 'مركز التحميل وإدارة الذاكرة' },
      { path: 'hisn', loadComponent: () => import('./features/hisn/hisn.component').then(c => c.HisnComponent), title: 'حصن المسلم', data: { preload: true, preloadDelay: 2500 } },
      { path: 'docs', loadComponent: () => import('./features/docs/docs.component').then(c => c.DocsComponent), title: 'محرر المستندات SuperDoc' },
      { path: 'vault', loadComponent: () => import('./features/vault/vault.component').then(c => c.VaultComponent), title: 'خزنة الملفات' },
      { path: 'opencode', loadComponent: () => import('./features/opencode/opencode.component').then(c => c.OpencodeComponent), title: 'مساعد البرمجة - OpenCode' },
      { path: 'library', loadComponent: () => import('./features/library/library.component').then(c => c.LibraryComponent), title: 'المكتبة العامة' },
      { path: 'ai-module-builder', loadComponent: () => import('./features/ai-module-builder/ai-module-builder.component').then(c => c.AiModuleBuilderComponent), title: 'صانع الأقسام بالذكاء الاصطناعي', data: { preload: true, preloadDelay: 1000 } },
      { path: 'custom-module/:id', loadComponent: () => import('./features/ai-module-builder/custom-module-viewer.component').then(c => c.CustomModuleViewerComponent), title: 'قسم تفاعلي مخصص' },
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
