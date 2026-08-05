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
}

export const ALL_NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "لوحة التحكم", icon: "layout-dashboard", restricted: false, isPermanent: true, status: 'BETA', category: 'core' },
  { id: "profile", label: "الملف الشخصي", icon: "user", restricted: false, isPermanent: true, status: 'NEW', route: 'profile', category: 'core' },
  { id: "qa", label: "الأسئلة والطلبات", icon: "message-circle-question", restricted: false, isPermanent: true, status: 'BETA', category: 'core' },
  { id: "arcade", label: "Si-Neuro Arcade", icon: "gamepad-2", restricted: false, isPermanent: true, category: 'core' },
  { id: "time", label: "تنظيم الوقت", icon: "clock", restricted: false, isPermanent: true, category: 'core' },
  { id: "health", label: "الصحة والرياضة", icon: "heart-pulse", restricted: false, isPermanent: true, status: 'BETA', category: 'core' },
  { id: "chat", label: "الدردشة الذكية", icon: "message-square", restricted: false, isPermanent: true, category: 'ai' },
  { id: "agent-ai", label: "المهندس المساعد", icon: "cpu", restricted: false, isPermanent: true, status: 'BETA', category: 'ai' },
  { id: "vault", label: "خزنة الملفات", icon: "hard-drive", restricted: false, isPermanent: true, category: 'core' },
  { id: "sheets", label: "جداول البيانات", icon: "table", restricted: false, isPermanent: true, status: 'BETA', category: 'core' },
  { id: "docs", label: "محرر المستندات", icon: "file-text", restricted: false, isPermanent: true, status: 'NEW', category: 'core' },
  { id: "draw", label: "مرسم سوبر", icon: "palette", restricted: false, isPermanent: true, status: 'NEW', route: 'draw', category: 'core' },
  { id: "inkscape", label: "محرر SVG - Inkscape", icon: "pen-tool", restricted: false, isPermanent: true, status: 'NEW', route: 'inkscape', category: 'core' },
  { id: "opencode", label: "مساعد البرمجة OpenCode", icon: "terminal", restricted: false, isPermanent: true, status: 'NEW', route: 'opencode', category: 'dev' },
  { id: "external-tabs", label: "أرشيف التبويبات الخارجية", icon: "bookmark", restricted: false, isPermanent: true, status: 'NEW', route: 'external-tabs', category: 'tools' },
  { id: "html-editor", label: "محرر HTML الشامل", icon: "code", restricted: false, isPermanent: true, status: 'NEW', route: 'html-editor', category: 'dev' },
  { id: "text-fixer", label: "مصحح اتجاه النصوص", icon: "type", restricted: false, isPermanent: true, status: 'NEW', route: 'text-fixer', category: 'tools' },
  { id: "ai-module-builder", label: "صانع الأقسام بالذكاء الاصطناعي", icon: "sparkles", restricted: false, isPermanent: true, status: 'NEW', route: 'ai-module-builder', category: 'ai' },
  { id: "deals", label: "عروض المحلات", icon: "tag", restricted: false, category: 'tools' },
  { id: "peer-chat", label: "التواصل المباشر", icon: "message-circle", restricted: false, isPermanent: true, status: 'BETA', category: 'core' },
  { id: "stream", label: "WeTube", icon: "video", restricted: false, isPermanent: true, status: 'PRO', category: 'core' },
  { id: "wetube-studio", label: "WeTube Studio", icon: "layout-dashboard", restricted: false, isPermanent: true, status: 'BETA', route: 'stream/studio', category: 'dev' },
  { id: "downloads", label: "التحميلات", icon: "download-cloud", restricted: false, isPermanent: true, status: 'BETA', category: 'tools' },
  { id: "wallet", label: "المحفظة الرقمية", icon: "wallet", restricted: false, isPermanent: true, category: 'tools' },
  { id: "lab", label: "المختبر التجريبي", icon: "microscope", restricted: false, isPermanent: true, category: 'dev' },
  
  { id: "market", label: "المتجر التقني", icon: "shopping-cart", restricted: false, category: 'tools' },
  { id: "study-ai", label: "المساعد الدراسي", icon: "graduation-cap", restricted: false, isPermanent: true, status: 'NEW', route: 'study-ai', category: 'ai' },
  { id: "knowledge", label: "المكتبة المعرفية", icon: "library-big", restricted: false, category: 'ai' },
  { id: "ads", label: "مركز الإعلانات", icon: "megaphone", restricted: false, category: 'tools' },
  { id: "launcher", label: "مشغل المواقع", icon: "rocket", restricted: false, category: 'tools' },
  { id: "offers", label: "صندوق العروض", icon: "repeat", restricted: false, category: 'tools' },
  { id: "learning", label: "التعلم", icon: "graduation-cap", restricted: false, category: 'ai' },
  { id: "microcontroller-lab", label: "برمجة المتحكمات", icon: "circuit-board", restricted: false, category: 'dev' },
  { id: "library", label: "المكتبة العامة", icon: "library", restricted: false, isPermanent: true, status: 'NEW', category: 'ai' },
  { id: "directory", label: "دليل المستخدمين", icon: "users", restricted: false, category: 'tools' },
  { id: "hisn", label: "حصن المسلم", icon: "book-open", restricted: false, category: 'tools' },
  { id: "features", label: "المميزات", icon: "zap", restricted: false, category: 'tools' },
  { id: "notifications", label: "التنبيهات", icon: "bell", restricted: false, category: 'tools' },
  { id: "settings", label: "الإعدادات", icon: "settings", restricted: false, category: 'tools' },
  { id: "admin", label: "لوحة الإدارة", icon: "shield-check", restricted: true, category: 'tools' },
];

export function getVisibleNavItems(userRole: string | null, navItems: NavItem[]) {
  const managementRoles = ['founder', 'cofounder', 'admin', 'management'];
  const hasAdminAccess = userRole && managementRoles.includes(userRole);
  
  return navItems.filter(item => {
    if (item.restricted && !hasAdminAccess) return false;
    return true;
  });
}
