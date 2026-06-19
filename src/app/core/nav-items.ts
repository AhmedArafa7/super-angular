export interface NavItem {
  id: string;
  label: string;
  icon: string;
  restricted: boolean;
  isPermanent?: boolean;
  badge?: number;
}

export const ALL_NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "لوحة التحكم", icon: "layout-dashboard", restricted: false, isPermanent: true },
  { id: "qa", label: "الأسئلة والطلبات", icon: "message-circle-question", restricted: false, isPermanent: true },
  { id: "arcade", label: "Si-Neuro Arcade", icon: "gamepad-2", restricted: false },
  { id: "time", label: "تنظيم الوقت", icon: "clock", restricted: false },
  { id: "health", label: "الصحة والرياضة", icon: "heart-pulse", restricted: false },
  { id: "chat", label: "الدردشة الذكية", icon: "message-square", restricted: false },
  { id: "agent-ai", label: "المهندس المساعد", icon: "cpu", restricted: false },
  { id: "vault", label: "خزنة الملفات", icon: "hard-drive", restricted: false },
  { id: "sheets", label: "جداول البيانات", icon: "table", restricted: false },
  { id: "deals", label: "عروض المحلات", icon: "tag", restricted: false },
  { id: "peer-chat", label: "التواصل المباشر", icon: "message-circle", restricted: false },
  { id: "stream", label: "WeTube", icon: "video", restricted: false },
  { id: "wetube-studio", label: "WeTube Studio", icon: "layout-dashboard", restricted: false },
  { id: "market", label: "المتجر التقني", icon: "shopping-cart", restricted: false },
  { id: "study-ai", label: "المساعد الدراسي", icon: "graduation-cap", restricted: false },
  { id: "knowledge", label: "المكتبة المعرفية", icon: "library-big", restricted: false },
  { id: "ads", label: "مركز الإعلانات", icon: "megaphone", restricted: false },
  { id: "downloads", label: "التحميلات", icon: "download-cloud", restricted: false },
  { id: "launcher", label: "مشغل المواقع", icon: "rocket", restricted: false },
  { id: "wallet", label: "المحفظة الرقمية", icon: "wallet", restricted: false },
  { id: "offers", label: "صندوق العروض", icon: "repeat", restricted: false },
  { id: "learning", label: "التعلم", icon: "graduation-cap", restricted: false },
  { id: "microcontroller-lab", label: "برمجة المتحكمات", icon: "circuit-board", restricted: false },
  { id: "library", label: "المكتبة العامة", icon: "library", restricted: false },
  { id: "lab", label: "المختبر التجريبي", icon: "microscope", restricted: false },
  { id: "directory", label: "دليل المستخدمين", icon: "users", restricted: false },
  { id: "hisn", label: "حصن المسلم", icon: "book-open", restricted: false },
  { id: "features", label: "المميزات", icon: "zap", restricted: false },
  { id: "notifications", label: "التنبيهات", icon: "bell", restricted: false },
  { id: "settings", label: "الإعدادات", icon: "settings", restricted: false },
  { id: "admin", label: "لوحة الإدارة", icon: "shield-check", restricted: true },
];

export function getVisibleNavItems(userRole: string | null, navItems: NavItem[]) {
  const managementRoles = ['founder', 'cofounder', 'admin', 'management'];
  const hasAdminAccess = userRole && managementRoles.includes(userRole);
  
  return navItems.filter(item => {
    if (item.restricted && !hasAdminAccess) return false;
    return true;
  });
}
