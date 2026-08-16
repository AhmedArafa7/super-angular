import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';
import { AppShellComponent } from './layout/app-shell/app-shell';

export const routes: Routes = [
  // 1. المسارات التي تعمل داخل الـ Shell (لوحة التحكم، الألعاب، halaltube)
  {
    path: '',
    component: AppShellComponent,
    children: [
      { path: 'launcher', loadComponent: () => import('./features/launcher/launcher.component').then(c => c.LauncherComponent), title: 'لوحة التحكم المركزية' },
      {
        path: 'stream',
        loadComponent: () => import('./features/halaltube/components/halaltube-shell/halaltube-shell').then(c => c.halaltubeShellComponent),
        data: { preload: true, preloadDelay: 1500 },
        children: [
          { path: '', loadComponent: () => import('./features/halaltube/components/halaltube-home/halaltube-home').then(c => c.halaltubeHomeComponent), title: 'الصفحة الرئيسية - halaltube' },
          { path: 'onboarding', loadComponent: () => import('./shared/onboarding/onboarding').then(c => c.OnboardingComponent), title: 'تخصيص halaltube' },
          { path: 'discovery', loadComponent: () => import('./features/halaltube/components/discovery-mode/discovery-mode.component').then(c => c.DiscoveryModeComponent), title: 'اكتشاف - halaltube' },
          { path: 'shorts', loadComponent: () => import('./features/halaltube/components/halaltube-shorts/halaltube-shorts').then(c => c.halaltubeShortsComponent), title: 'Shorts - halaltube' },
          { path: 'subscriptions', loadComponent: () => import('./features/halaltube/components/halaltube-subscriptions/halaltube-subscriptions').then(c => c.halaltubeSubscriptionsComponent), title: 'الاشتراكات - halaltube' },
          { path: 'notifications', loadComponent: () => import('./features/halaltube/components/halaltube-notifications/halaltube-notifications').then(c => c.halaltubeNotificationsComponent), title: 'الإشعارات - halaltube' },
          { path: 'library', loadComponent: () => import('./features/halaltube/components/halaltube-library/halaltube-library').then(c => c.halaltubeLibraryComponent), title: 'المكتبة - halaltube' },
          { path: 'history', loadComponent: () => import('./features/halaltube/components/halaltube-library/halaltube-library').then(c => c.halaltubeLibraryComponent), title: 'سجل المشاهدة - halaltube' },
          { path: 'liked', loadComponent: () => import('./features/halaltube/components/halaltube-library/halaltube-library').then(c => c.halaltubeLibraryComponent), title: 'فيديوهات أعجبتني - halaltube' },
          { path: 'studio', loadComponent: () => import('./features/halaltube/components/halaltube-studio/halaltube-studio').then(c => c.halaltubeStudioComponent), title: 'halaltube Studio' },
          { path: 'watch/:id', loadComponent: () => import('./features/halaltube/components/halaltube-watch-view/halaltube-watch-view').then(c => c.halaltubeWatchViewComponent), title: 'مشاهدة الفيديو - halaltube' },
          { path: 'channel/:id', loadComponent: () => import('./features/halaltube/components/halaltube-channel/halaltube-channel.component').then(c => c.halaltubeChannelComponent) }
        ]
      },
      { path: 'arcade', loadComponent: () => import('./features/arcade/arcade-hub.component').then(c => c.ArcadeHubComponent), title: 'الألعاب' },
      { path: 'arcade/word-chain', loadComponent: () => import('./features/arcade/word-chain/word-chain.component').then(c => c.WordChainComponent), title: 'لعبة سلسلة الكلمات - Word Chain' },
      { path: 'arcade/flashcards', loadComponent: () => import('./features/arcade/flashcards/flashcards.component').then(c => c.FlashcardsComponent), title: 'نظام البطاقات التعليمية الذكية' },
      { path: 'arcade/number-guesser', loadComponent: () => import('./features/arcade/number-guesser/number-guesser.component').then(c => c.NumberGuesserComponent), title: 'لعبة تخمين رقم الخصم' },
      { path: 'arcade/adventure-time', loadComponent: () => import('./features/arcade/adventure-time/adventure-time.component').then(c => c.AdventureTimeComponent), title: 'Adventure Time: Ooo - مغامرة فين وجيك' },
      { path: 'arcade/adventure-time-3d', loadComponent: () => import('./features/arcade/adventure-time/adventure-time-3d.component').then(c => c.AdventureTime3DComponent), title: 'Adventure Time 3D RPG' },
      { path: 'arcade/ai-builder', loadComponent: () => import('./features/arcade/ai-game-builder.component').then(c => c.AiGameBuilderComponent), title: 'استوديو صانع الألعاب الذكي' },
      { path: 'arcade/godot-builder', loadComponent: () => import('./features/arcade/godot-editor/godot-editor.component').then(c => c.GodotEditorComponent), title: 'Godot Game Builder' },
      { path: 'arcade/arena/:id', loadComponent: () => import('./features/arcade/arcade-arena.component').then(c => c.ArcadeArenaComponent) },
      { path: 'time', loadComponent: () => import('./features/time/time.component').then(c => c.TimeComponent), title: 'تنظيم الوقت والتركيز' },
      { path: 'health', loadComponent: () => import('./features/health/health.component').then(c => c.HealthComponent), title: 'الصحة والرياضة' },
      { path: 'settings', loadComponent: () => import('./features/settings/settings.component').then(c => c.SettingsComponent) },
      { path: 'profile', loadComponent: () => import('./features/profile/profile.component').then(c => c.ProfileComponent), title: 'الملف الشخصي' },
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
      { path: 'file-viewer', loadComponent: () => import('./features/file-viewer/file-viewer.component').then(c => c.FileViewerComponent), title: 'عارض ومحلل الملفات الشامل' },
      { path: 'file-manager', loadComponent: () => import('./features/file-manager/file-manager.component').then(c => c.FileManagerComponent), title: 'إدارة وتعديل الملفات' },
      { path: 'ai-module-builder', loadComponent: () => import('./features/ai-module-builder/ai-module-builder.component').then(c => c.AiModuleBuilderComponent), title: 'صانع الأقسام بالذكاء الاصطناعي', data: { preload: true, preloadDelay: 1000 } },
      { path: 'custom-module/:id', loadComponent: () => import('./features/ai-module-builder/custom-module-viewer.component').then(c => c.CustomModuleViewerComponent), title: 'عرض القسم المخصص' },
      { path: 'study-ai', loadComponent: () => import('./features/learning/learning.component').then(c => c.LearningComponent), title: 'المساعد الدراسي الذكي' },
      { path: 'learning', loadComponent: () => import('./features/learning/learning.component').then(c => c.LearningComponent), title: 'المساعد الدراسي والتعلم' },
      { path: 'dev-hub', loadComponent: () => import('./features/dev-hub/dev-hub.component').then(c => c.DevHubComponent), title: 'مركز المطورين الشامل - DevHub' },
      { path: 'developers', redirectTo: 'dev-hub', pathMatch: 'full' },
      { path: 'about', loadComponent: () => import('./features/about/about.component').then(c => c.AboutComponent), title: 'عن الشركة - Super Platform' },
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
