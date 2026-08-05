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
      { path: 'arcade/word-chain', loadComponent: () => import('./features/arcade/word-chain/word-chain.component').then(c => c.WordChainComponent), title: 'لعبة سلسلة الكلمات - Word Chain' },
      { path: 'arcade/flashcards', loadComponent: () => import('./features/arcade/flashcards/flashcards.component').then(c => c.FlashcardsComponent), title: 'نظام البطاقات التعليمية الذكية' },
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
      { path: 'draw', loadComponent: () => import('./features/draw/draw.component').then(c => c.DrawComponent), title: 'استوديو الرسم - SuperDraw' },
      { path: 'inkscape', loadComponent: () => import('./features/inkscape/inkscape.component').then(c => c.InkscapeComponent), title: 'محرر الرسوميات المتجهية - Inkscape SVG' },
      { path: 'vault', loadComponent: () => import('./features/vault/vault.component').then(c => c.VaultComponent), title: 'خزنة الملفات' },
      { path: 'opencode', loadComponent: () => import('./features/opencode/opencode.component').then(c => c.OpencodeComponent), title: 'مساعد البرمجة - OpenCode' },
      { path: 'library', loadComponent: () => import('./features/library/library.component').then(c => c.LibraryComponent), title: 'المكتبة العامة' },
      { path: 'external-tabs', loadComponent: () => import('./features/external-tabs/external-tabs.component').then(c => c.ExternalTabsComponent), title: 'أرشيف التبويبات الخارجية' },
      { path: 'html-editor', loadComponent: () => import('./features/html-editor/html-editor.component').then(c => c.HtmlEditorComponent), title: 'محرر HTML الشامل' },
      { path: 'text-fixer', loadComponent: () => import('./features/text-fixer/text-fixer.component').then(c => c.TextFixerComponent), title: 'مصحح اتجاه النصوص (RTL/LTR)' },
      { path: 'ai-module-builder', loadComponent: () => import('./features/ai-module-builder/ai-module-builder.component').then(c => c.AiModuleBuilderComponent), title: 'صانع الأقسام بالذكاء الاصطناعي', data: { preload: true, preloadDelay: 1000 } },
      { path: 'custom-module/:id', loadComponent: () => import('./features/ai-module-builder/custom-module-viewer.component').then(c => c.CustomModuleViewerComponent), title: 'عرض القسم المخصص' },
      { path: 'study-ai', loadComponent: () => import('./features/learning/learning.component').then(c => c.LearningComponent), title: 'المساعد الدراسي الذكي' },
      { path: 'learning', loadComponent: () => import('./features/learning/learning.component').then(c => c.LearningComponent), title: 'المساعد الدراسي والتعلم' },
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
  {
    path: 'om-al-qura',
    loadComponent: () => import('./features/om-al-qura/om-al-qura-home.component').then(c => c.OmAlQuraHomeComponent),
    title: 'متجر أم القرى الإلكتروني'
  },
  {
    path: 'om-al-qura-2',
    loadComponent: () => import('./features/om-al-qura-2/om-al-qura-2-home.component').then(c => c.OmAlQura2HomeComponent),
    title: 'مصنع محمود عرفه للمعادن'
  },
  {
    path: 'mahmoud-arafa',
    loadComponent: () => import('./features/om-al-qura-2/om-al-qura-2-home.component').then(c => c.OmAlQura2HomeComponent),
    title: 'مصنع محمود عرفه للمعادن'
  },

  { path: '**', redirectTo: '/launcher' }
];
