export type ContentSource = 'youtube' | 'drive' | 'local' | 'offline' | 'platform';

export interface ContentItem {
  id: string;
  title: string;
  source: ContentSource;
  thumbnail?: string | null;
  author: string;
  authorId?: string;
  channelAvatar?: string | null;
  time?: string;
  isShorts?: boolean;
  hasMusic?: boolean;
  category?: string;
  fetchedAt?: number;
  url?: string;
  status?: string;
  visibility?: string;
  externalUrl?: string;
  duration?: string;
  views?: string;
  isWhitelisted?: boolean;
}

export interface Video extends ContentItem {
  type?: string;
  uploaderRole?: string;
  submitterId?: string;
  submitterName?: string;
  allowedUserIds?: string[];
  productIds?: string[];
  productDisplayMode?: any;
}

export interface YouTubeSubscription {
  id: string;
  channelId: string;
  channelTitle: string;
  avatarUrl?: string;
  isFavorite?: boolean;
  autoSyncType?: 'all' | 'long' | 'shorts' | 'none';
}

export interface FeedVideo extends ContentItem {}

export interface HistoryItem {
  id: string;
  videoId: string;
  timestamp: number;
  progress: number;
}

export const halaltube_CATEGORIES = [
  "الكل", "قرآن كريم", "أناشيد وابتهالات", "استكشاف المواضيع", "تكنولوجيا وبرمجة", "ألعاب ومغامرات",
  "رسوم متحركة", "علوم وصحة", "تطوير الذات", "أخبار وثقافة", "بودكاست", "المخزن المحلي"
];

export type halaltubeTab = 'home' | 'shorts' | 'subs' | 'library' | 'notifications' | 'explore' | 'studio' | 'history' | 'liked';

export function checkIsShorts(v: any): boolean {
  if (!v) return false;
  
  // 1. Explicit boolean flag
  if (v.isShorts === true || v.isShort === true) return true;

  // 2. URL check (/shorts/)
  const urlStr = (v.url || v.externalUrl || v.id || v.videoId || '').toLowerCase();
  if (urlStr.includes('/shorts/')) return true;

  // 3. Category check
  const cat = (v.category || '').toLowerCase();
  if (cat === 'shorts' || cat === 'شورتس' || cat === 'شورت') return true;

  // 4. Title tags check (#shorts, #short, شورتس, shorts)
  const title = (v.title || '').toLowerCase();
  if (
    title.includes('#shorts') || 
    title.includes('#short') || 
    title.includes('shorts') || 
    title.includes('شورتس')
  ) {
    return true;
  }

  // 5. Duration check (Shorts are 90s or less)
  if (typeof v.duration === 'number') {
    if (v.duration > 0 && v.duration <= 90) return true;
  } else if (typeof v.duration === 'string') {
    const durStr = v.duration.trim();
    // Format: "0:45", "00:58", "1:15"
    const parts = durStr.split(':').map((p: string) => parseInt(p, 10));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      const totalSecs = parts[0] * 60 + parts[1];
      if (totalSecs > 0 && totalSecs <= 90) return true;
    } else if (parts.length === 1 && !isNaN(parts[0])) {
      if (parts[0] > 0 && parts[0] <= 90) return true;
    }
  }

  return false;
}
