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

export const WETUBE_CATEGORIES = [
  "الكل", "قرآن كريم", "أناشيد وابتهالات", "استكشاف المواضيع", "تكنولوجيا وبرمجة", "ألعاب ومغامرات",
  "رسوم متحركة", "علوم وصحة", "تطوير الذات", "أخبار وثقافة", "بودكاست", "المخزن المحلي"
];

export type WeTubeTab = 'home' | 'shorts' | 'subs' | 'library' | 'notifications' | 'explore' | 'studio' | 'history' | 'liked';
