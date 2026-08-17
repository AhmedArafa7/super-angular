export type NavCategoryId = 'core' | 'ai' | 'dev' | 'tools';

export interface NavCategory {
  id: NavCategoryId;
  label: string;
  icon: string;
}

export const NAV_CATEGORIES: NavCategory[] = [
  { id: 'core', label: 'الأدوات الرئيسية', icon: 'layout-grid' },
  { id: 'ai', label: 'الذكاء الاصطناعي والتعلم', icon: 'sparkles' },
  { id: 'dev', label: 'المختبر والتطوير', icon: 'code-2' },
  { id: 'tools', label: 'الخدمات والمرافق', icon: 'wrench' },
];

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  restricted: boolean;
  isPermanent?: boolean;
  category?: NavCategoryId;
  badge?: number;
  status?: 'BETA' | 'PRO' | 'NEW';
  route?: string;
  aliases?: string[];
}

export const ALL_NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "لوحة التحكم", icon: "layout-dashboard", restricted: false, isPermanent: true, status: 'BETA', category: 'core', aliases: ['الرئيسية', 'لوحة', 'home', 'main'] },
  { id: "profile", label: "الملف الشخصي", icon: "user", restricted: false, isPermanent: true, status: 'NEW', route: 'profile', category: 'core', aliases: ['حسابي', 'بياناتي', 'profile', 'user', 'عضويتي'] },
  { id: "qa", label: "الأسئلة والطلبات", icon: "message-circle-question", restricted: false, isPermanent: true, status: 'BETA', category: 'core', aliases: ['استفسارات', 'طلبات', 'سؤال', 'q&a', 'faq'] },
  { id: "arcade", label: "Si-Neuro Arcade", icon: "gamepad-2", restricted: false, isPermanent: true, category: 'core', aliases: ['العاب', 'ألعاب', 'قيمز', 'games', 'arcade', 'تسلية'] },
  { id: "time", label: "تنظيم الوقت", icon: "clock", restricted: false, isPermanent: true, category: 'core', aliases: ['ساعة', 'مؤقت', 'بومودورو', 'timer', 'pomodoro', 'مهام', 'انجاز'] },
  { id: "health", label: "الصحة والرياضة", icon: "heart-pulse", restricted: false, isPermanent: true, status: 'BETA', category: 'core', aliases: ['تمارين', 'رياضة', 'صحة', 'تغذية', 'fitness', 'health'] },
  { id: "chat", label: "الدردشة الذكية", icon: "message-square", restricted: false, isPermanent: true, category: 'ai', aliases: ['شات', 'ذكاء اصطناعي', 'chat', 'ai', 'gpt', 'محادثة', 'روبوت'] },
  { id: "agent-ai", label: "المهندس المساعد", icon: "cpu", restricted: false, isPermanent: true, status: 'BETA', category: 'ai', aliases: ['مهندس', 'وكيل ذكي', 'agent', 'مساعد', 'برمجة ذكية'] },
  { id: "vault", label: "خزنة الملفات", icon: "hard-drive", restricted: false, isPermanent: true, category: 'core', aliases: ['درايف', 'تخزين سحابي', 'ملفات', 'مستندات', 'drive', 'cloud', 'vault'] },
  { id: "sheets", label: "جداول البيانات", icon: "table", restricted: false, isPermanent: true, status: 'BETA', category: 'core', aliases: ['اكسيل', 'جداول', 'شيت', 'excel', 'sheets', 'بيانات'] },
  { id: "docs", label: "محرر المستندات", icon: "file-text", restricted: false, isPermanent: true, status: 'NEW', category: 'core', aliases: ['وورد', 'مستندات', 'محرر نصوص', 'word', 'doc', 'كتابة'] },
  { id: "draw", label: "مرسم سوبر", icon: "palette", restricted: false, isPermanent: true, status: 'NEW', route: 'draw', category: 'core', aliases: ['رسم', 'لوحة', 'تلوين', 'مرسم', 'paint', 'canvas', 'draw'] },
  { id: "inkscape", label: "محرر SVG - Inkscape", icon: "pen-tool", restricted: false, isPermanent: true, status: 'NEW', route: 'inkscape', category: 'core', aliases: ['فيكتور', 'svg', 'تصميم', 'inkscape', 'شعار', 'رسوميات'] },
  { id: "dev-hub", label: "مركز المطورين", icon: "code-2", restricted: false, isPermanent: true, status: 'NEW', route: 'dev-hub', category: 'dev', aliases: ['مطورين', 'api', 'developers', 'dev', 'توثيق', 'ادوات'] },
  { id: "opencode", label: "مساعد البرمجة OpenCode", icon: "terminal", restricted: false, isPermanent: true, status: 'NEW', route: 'opencode', category: 'dev', aliases: ['محرر كود', 'برمجة', 'كود', 'code', 'ide', 'terminal', 'بيئة برمجية'] },
  { id: "local-player", label: "مشغل الوسائط المحلي", icon: "film", restricted: false, isPermanent: true, status: 'NEW', route: 'local-player', category: 'tools', aliases: ['مشغل فيديو', 'مشغل محلي', 'سينما', 'فيديوهاتي', 'media player', 'mp4', 'mkv', 'صوتيات'] },
  { id: "external-tabs", label: "أرشيف التبويبات الخارجية", icon: "bookmark", restricted: false, isPermanent: true, status: 'NEW', route: 'external-tabs', category: 'tools', aliases: ['روابط', 'مواقع', 'تبويبات', 'bookmarks', 'drive links', 'مواقعي'] },
  { id: "html-editor", label: "محرر HTML الشامل", icon: "code", restricted: false, isPermanent: true, status: 'NEW', route: 'html-editor', category: 'dev', aliases: ['محرر صفحات', 'html', 'css', 'web editor', 'تصميم مواقع'] },
  { id: "file-manager", label: "مدير الملفات", icon: "file-archive", restricted: false, isPermanent: true, status: 'NEW', route: 'file-manager', category: 'tools', aliases: ['ملفاتي', 'مجلدات', 'explorer', 'تصفح الملفات', 'مدير'] },
  { id: "text-fixer", label: "مصحح اتجاه النصوص", icon: "type", restricted: false, isPermanent: true, status: 'NEW', route: 'text-fixer', category: 'tools', aliases: ['تصليح عربي', 'rtl', 'ltr', 'تعديل النص', 'قلب النص'] },
  { id: "ai-module-builder", label: "صانع الأقسام بالذكاء الاصطناعي", icon: "sparkles", restricted: false, isPermanent: true, status: 'NEW', route: 'ai-module-builder', category: 'ai', aliases: ['صانع اقسام', 'بناء قسم', 'module builder', 'قسم جديد'] },
  { id: "deals", label: "عروض المحلات", icon: "tag", restricted: false, category: 'tools', aliases: ['تخفيضات', 'عروض', 'خصومات', 'deals', 'discounts'] },
  { id: "peer-chat", label: "التواصل المباشر", icon: "message-circle", restricted: false, isPermanent: true, status: 'BETA', category: 'core', aliases: ['مكالمات', 'تواصل', 'p2p', 'peer', 'دردشة مباشرة'] },
  { id: "stream", label: "halaltube", icon: "video", restricted: false, isPermanent: true, status: 'PRO', category: 'core', aliases: ['يوتيوب', 'فيديوهات', 'حلال تيوب', 'فيديو', 'youtube', 'video', 'مقاطع', 'مرئيات'] },
  { id: "halaltube-studio", label: "halaltube Studio", icon: "layout-dashboard", restricted: false, isPermanent: true, status: 'BETA', route: 'stream/studio', category: 'dev', aliases: ['استوديو حلال تيوب', 'رفع فيديوهات', 'ادارة القناة'] },
  { id: "downloads", label: "التحميلات", icon: "download-cloud", restricted: false, isPermanent: true, status: 'BETA', category: 'tools', aliases: ['تنزيلات', 'تحميل', 'downloads', 'ملفات محملة'] },
  { id: "wallet", label: "المحفظة الرقمية", icon: "wallet", restricted: false, isPermanent: true, category: 'tools', aliases: ['رصيد', 'فلوس', 'اموال', 'wallet', 'دفع'] },
  { id: "lab", label: "المختبر التجريبي", icon: "microscope", restricted: false, isPermanent: true, category: 'dev', aliases: ['تجارب', 'مختبر', 'بيتا', 'lab'] },
  
  { id: "market", label: "المتجر التقني", icon: "shopping-cart", restricted: false, category: 'tools', aliases: ['سوق', 'متجر', 'شراء', 'store', 'market', 'منتجات'] },
  { id: "study-ai", label: "المساعد الدراسي", icon: "graduation-cap", restricted: false, isPermanent: true, status: 'NEW', route: 'study-ai', category: 'ai', aliases: ['دراسة', 'مذاكرة', 'معلم', 'امتحانات', 'study'] },
  { id: "knowledge", label: "المكتبة المعرفية", icon: "library-big", restricted: false, category: 'ai', aliases: ['معلومات', 'معرفة', 'مقالات', 'موسوعة'] },
  { id: "ads", label: "مركز الإعلانات", icon: "megaphone", restricted: false, category: 'tools', aliases: ['اعلانات', 'ترويج', 'ads'] },
  { id: "launcher", label: "مشغل المواقع", icon: "rocket", restricted: false, category: 'tools', aliases: ['مواقع', 'مشغل', 'launcher'] },
  { id: "offers", label: "صندوق العروض", icon: "repeat", restricted: false, category: 'tools', aliases: ['عروض خاصة', 'offers'] },
  { id: "learning", label: "التعلم", icon: "graduation-cap", restricted: false, category: 'ai', aliases: ['تعليم', 'دورات', 'كورسات', 'learn'] },
  { id: "microcontroller-lab", label: "برمجة المتحكمات", icon: "circuit-board", restricted: false, category: 'dev', aliases: ['اردوينو', 'متحكمات', 'arduino', 'esp32', 'electronics', 'الكترونيات'] },
  { id: "library", label: "المكتبة العامة", icon: "library", restricted: false, isPermanent: true, status: 'NEW', category: 'ai', aliases: ['كتب', 'مكتبة', 'روايات', 'pdf', 'books', 'قراءة'] },
  { id: "directory", label: "دليل المستخدمين", icon: "users", restricted: false, category: 'tools', aliases: ['اعضاء', 'دليل', 'مستخدمين', 'users'] },
  { id: "hisn", label: "حصن المسلم", icon: "book-open", restricted: false, category: 'tools', aliases: ['اذكار', 'أذكار', 'حصن', 'أدعية', 'قرآن', 'صباح ومساء'] },
  { id: "about", label: "عن الشركة", icon: "building-2", restricted: false, isPermanent: true, status: 'NEW', route: 'about', category: 'core', aliases: ['معلومات عنا', 'من نحن', 'about', 'فريق العمل'] },
  { id: "features", label: "المميزات", icon: "zap", restricted: false, category: 'tools', aliases: ['خواص', 'ميزات', 'features'] },
  { id: "notifications", label: "التنبيهات", icon: "bell", restricted: false, category: 'tools', aliases: ['اشعارات', 'تنبيهات', 'notifications', 'alerts'] },
  { id: "settings", label: "الإعدادات", icon: "settings", restricted: false, category: 'tools', aliases: ['تخصيص', 'خيارات', 'settings', 'config'] },
  { id: "admin", label: "لوحة الإدارة", icon: "shield-check", restricted: true, category: 'tools', aliases: ['ادمن', 'ادارة', 'admin', 'لوحة تحكم'] },
];

export function getVisibleNavItems(userRole: string | null, navItems: NavItem[]) {
  const managementRoles = ['founder', 'cofounder', 'admin', 'management'];
  const hasAdminAccess = userRole && managementRoles.includes(userRole);
  
  return navItems.filter(item => {
    if (item.restricted && !hasAdminAccess) return false;
    return true;
  });
}
