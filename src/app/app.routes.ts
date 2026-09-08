import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';
import { AppShellComponent } from './layout/app-shell/app-shell';

export const routes: Routes = [
  // 1. المسارات التي تعمل داخل الـ Shell (لوحة التحكم، الألعاب، halaltube)
  {
    path: '',
    component: AppShellComponent,
    children: [
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then(c => c.DashboardComponent), title: 'لوحة التحكم المركزية - Si-Neuro' },
      { path: 'launcher', loadComponent: () => import('./features/launcher/launcher.component').then(c => c.LauncherComponent), title: 'لوحة التحكم والمشاريع' },
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
          { path: 'playlists', loadComponent: () => import('./features/halaltube/components/halaltube-library/halaltube-library').then(c => c.halaltubeLibraryComponent), title: 'قوائم التشغيل وخطط المتابعة - halaltube' },
          { path: 'playlist/:id', loadComponent: () => import('./features/halaltube/components/halaltube-playlist-view/halaltube-playlist-view.component').then(c => c.HalaltubePlaylistViewComponent), title: 'قائمة التشغيل - halaltube' },
          { path: 'history', loadComponent: () => import('./features/halaltube/components/halaltube-library/halaltube-library').then(c => c.halaltubeLibraryComponent), title: 'سجل المشاهدة - halaltube' },
          { path: 'liked', loadComponent: () => import('./features/halaltube/components/halaltube-library/halaltube-library').then(c => c.halaltubeLibraryComponent), title: 'فيديوهات أعجبتني - halaltube' },
          { path: 'studio', loadComponent: () => import('./features/halaltube/components/halaltube-studio/halaltube-studio').then(c => c.halaltubeStudioComponent), title: 'halaltube Studio' },
          { path: 'watch/:id', loadComponent: () => import('./features/halaltube/components/halaltube-watch-view/halaltube-watch-view').then(c => c.halaltubeWatchViewComponent), title: 'مشاهدة الفيديو - halaltube' },
          { path: 'channel/:id', loadComponent: () => import('./features/halaltube/components/halaltube-channel/halaltube-channel.component').then(c => c.halaltubeChannelComponent) }
        ]
      },
      { path: 'arcade', loadComponent: () => import('./features/arcade/arcade-hub.component').then(c => c.ArcadeHubComponent), title: 'الألعاب' },
      { path: '', loadComponent: () => import('./features/arcade/arcade-hub.component').then(c => c.ArcadeHubComponent), title: 'الألعاب' },
      { path: 'arcade/word-chain', loadComponent: () => import('./features/arcade/word-chain/word-chain.component').then(c => c.WordChainComponent), title: 'لعبة سلسلة الكلمات - Word Chain' },
      { path: 'arcade/flashcards', loadComponent: () => import('./features/arcade/flashcards/flashcards.component').then(c => c.FlashcardsComponent), title: 'نظام البطاقات التعليمية الذكية' },
      { path: 'arcade/number-guesser', loadComponent: () => import('./features/arcade/number-guesser/number-guesser.component').then(c => c.NumberGuesserComponent), title: 'لعبة تخمين رقم الخصم' },
      { path: 'arcade/adventure-time', loadComponent: () => import('./features/arcade/adventure-time/adventure-time.component').then(c => c.AdventureTimeComponent), title: 'Loot & Scoot - مغامرة جمع الكنوز والهروب' },
      { path: 'arcade/neuro-physio', loadComponent: () => import('./features/arcade/neuro-physio/neuro-physio.component').then(c => c.NeuroPhysioComponent), title: 'NEURO-PHYSIO CODEX: CAIRO 🦾🧬💻' },
      { path: 'arcade/metro-dash', loadComponent: () => import('./features/arcade/subway-surfers/subway-surfers-3d.component').then(c => c.SubwaySurfers3DComponent), title: 'Metro Dash 3D 🚇⚡' },
      { path: 'arcade/metro-dash-3d', loadComponent: () => import('./features/arcade/subway-surfers/subway-surfers-3d.component').then(c => c.SubwaySurfers3DComponent), title: 'Metro Dash 3D 🚇⚡' },
      { path: 'arcade/subway-surfers', loadComponent: () => import('./features/arcade/subway-surfers/subway-surfers-3d.component').then(c => c.SubwaySurfers3DComponent), title: 'Metro Dash 3D 🚇⚡' },
      { path: 'arcade/subway-surfers-3d', loadComponent: () => import('./features/arcade/subway-surfers/subway-surfers-3d.component').then(c => c.SubwaySurfers3DComponent), title: 'Metro Dash 3D 🚇⚡' },
      { path: 'arcade/ai-games', loadComponent: () => import('./features/arcade/ai-games/ai-games-hub.component').then(c => c.AiGamesHubComponent), title: 'ألعاب الذكاء الاصطناعي - Si-Neuro 🧬✨' },
      { path: 'arcade/ai-games/play/:id', loadComponent: () => import('./features/arcade/ai-games/components/ai-game-runner/ai-game-runner.component').then(c => c.AiGameRunnerComponent), title: 'تشغيل اللعبة - ألعاب الذكاء الاصطناعي 🎮' },
      { path: 'ai-games', redirectTo: 'arcade/ai-games', pathMatch: 'full' },
      { path: 'arcade/ai-builder', loadComponent: () => import('./features/arcade/ai-game-builder.component').then(c => c.AiGameBuilderComponent), title: 'استوديو صانع الألعاب الذكي' },
      { path: 'arcade/godot-builder', loadComponent: () => import('./features/arcade/godot-editor/godot-editor.component').then(c => c.GodotEditorComponent), title: 'Godot Game Builder' },
      { path: 'arcade/schulte-table', loadComponent: () => import('./features/arcade/schulte-table/schulte-table.component').then(c => c.SchulteTableComponent), title: 'Schulte Table 5×5 🧠⚡' },
      { path: 'arcade/riddle-master', loadComponent: () => import('./features/arcade/riddle-master/riddle-master.component').then(c => c.RiddleMasterComponent), title: 'Riddle Master: 100 Levels 🧩💡' },
      { path: 'arcade/arena/:id', loadComponent: () => import('./features/arcade/arcade-arena.component').then(c => c.ArcadeArenaComponent) },
      { path: 'qa', loadComponent: () => import('./features/qa/qa.component').then(c => c.QAComponent), title: 'الأسئلة والطلبات - Si-Neuro' },
      { path: 'time', loadComponent: () => import('./features/time/time.component').then(c => c.TimeComponent), title: 'تنظيم الوقت والتركيز' },
      { path: 'health', loadComponent: () => import('./features/health/health.component').then(c => c.HealthComponent), title: 'الصحة والرياضة' },
      { path: 'notifications', loadComponent: () => import('./features/notifications/notifications.component').then(c => c.NotificationsComponent), title: 'مركز التنبيهات - Neural Hub' },
      { path: 'settings', loadComponent: () => import('./features/settings/settings.component').then(c => c.SettingsComponent) },
      { path: 'profile', loadComponent: () => import('./features/profile/profile.component').then(c => c.ProfileComponent), title: 'الملف الشخصي' },
      { path: 'directory', loadComponent: () => import('./features/directory/directory.component').then(c => c.DirectoryComponent), title: 'سجل العقد الحية - دليل المستخدمين' },
      { path: 'wallet', loadComponent: () => import('./features/wallet/wallet.component').then(c => c.WalletComponent), title: 'المحفظة الذكية - Si-Neuro' },
      { path: 'offers', loadComponent: () => import('./features/offers/offers.component').then(c => c.OffersComponent), title: 'تدفق التفاوض والعروض - Negotiation Stream' },
      { path: 'chat', loadComponent: () => import('./features/chat/chat.component').then(c => c.ChatComponent), title: 'الدردشة الذكية' },
      { path: 'agent-ai', loadComponent: () => import('./features/agent-ai/agent-ai.component').then(c => c.AgentAIComponent), title: 'المهندس المساعد العصبي - Si-Neuro' },
      { path: 'peer-chat', loadComponent: () => import('./features/peer-chat/peer-chat.component').then(c => c.PeerChatComponent), title: 'التواصل المباشر' },
      { path: 'meeting', loadComponent: () => import('./features/meeting/meeting.component').then(c => c.MeetingComponent), title: 'Super Meet — استوديو الاجتماعات الذكية' },
      { path: 'meeting/:roomId', loadComponent: () => import('./features/meeting/meeting.component').then(c => c.MeetingComponent), title: 'Super Meet — استوديو الاجتماعات الذكية' },
      { path: 'downloads', loadComponent: () => import('./features/downloads/downloads.component').then(c => c.DownloadsComponent), title: 'مركز التحميل وإدارة الذاكرة' },
      { path: 'hisn', loadComponent: () => import('./features/hisn/hisn.component').then(c => c.HisnComponent), title: 'حصن المسلم', data: { preload: true, preloadDelay: 2500 } },
      { path: 'docs', loadComponent: () => import('./features/docs/docs.component').then(c => c.DocsComponent), title: 'محرر المستندات SuperDoc' },
      { path: 'draw', loadComponent: () => import('./features/draw/draw.component').then(c => c.DrawComponent), title: 'استوديو الرسم - SuperDraw' },
      { path: 'inkscape', loadComponent: () => import('./features/inkscape/inkscape.component').then(c => c.InkscapeComponent), title: 'محرر الرسوميات المتجهية - Inkscape SVG' },
      { path: 'vault', loadComponent: () => import('./features/vault/vault.component').then(c => c.VaultComponent), title: 'خزنة الملفات' },
      { path: 'opencode', loadComponent: () => import('./features/opencode/opencode.component').then(c => c.OpencodeComponent), title: 'مساعد البرمجة - OpenCode' },
      { path: 'library', loadComponent: () => import('./features/library/library.component').then(c => c.LibraryComponent), title: 'المكتبة العامة' },
      { path: 'market', loadComponent: () => import('./features/market/market.component').then(c => c.MarketComponent), title: 'سوق العقد العصبية - المتجر التقني' },
      { path: 'deals', loadComponent: () => import('./features/deals/deals.component').then(c => c.DealsComponent), title: 'عروض المحلات - مقارنة الأسعار' },
      { path: 'ads', loadComponent: () => import('./features/ads/ads.component').then(c => c.AdsComponent), title: 'مركز الإعلانات وعروض المطورين' },
      { path: 'external-tabs', loadComponent: () => import('./features/external-tabs/external-tabs.component').then(c => c.ExternalTabsComponent), title: 'أرشيف التبويبات الخارجية' },
      { path: 'external-tabs/view/:id', loadComponent: () => import('./features/external-tabs/external-tab-viewer.component').then(c => c.ExternalTabViewerComponent), title: 'عرض القسم الخارجي' },
      { path: 'external-tabs/view', loadComponent: () => import('./features/external-tabs/external-tab-viewer.component').then(c => c.ExternalTabViewerComponent), title: 'عرض القسم الخارجي' },
      { path: 'local-player', loadComponent: () => import('./features/local-player/local-player.component').then(c => c.LocalPlayerComponent), title: 'مشغل الوسائط والفيديوهات المحلي' },
      { path: 'html-editor', loadComponent: () => import('./features/html-editor/html-editor.component').then(c => c.HtmlEditorComponent), title: 'محرر HTML الشامل' },
      { path: 'text-fixer', loadComponent: () => import('./features/text-fixer/text-fixer.component').then(c => c.TextFixerComponent), title: 'مصحح اتجاه النصوص (RTL/LTR)' },
      { path: 'ocr', loadComponent: () => import('./features/ocr/ocr.component').then(c => c.OcrComponent), title: 'استخراج النصوص من الصور (OCR) - محلي وفوري' },
      { path: 'file-viewer', loadComponent: () => import('./features/file-viewer/file-viewer.component').then(c => c.FileViewerComponent), title: 'عارض ومحلل الملفات الشامل' },
      { path: 'file-manager', loadComponent: () => import('./features/file-manager/file-manager.component').then(c => c.FileManagerComponent), title: 'إدارة وتعديل الملفات' },
      { path: 'device-files', loadComponent: () => import('./features/device-files/device-files.component').then(c => c.DeviceFilesComponent), title: 'مدير ملفات الجهاز' },
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
