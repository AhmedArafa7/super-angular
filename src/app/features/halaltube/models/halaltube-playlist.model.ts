export interface HalalPlaylistVideo {
  id: string;
  title: string;
  thumbnail: string;
  author: string;
  duration?: string;
  durationSeconds?: number;
  addedAt: number;
  watched: boolean;
  watchedAt?: number;
  notes?: string;
  order: number;
  source?: 'youtube' | 'local' | 'drive' | 'platform';
}

export type StudyTargetType = 'daily' | 'weekly' | 'interval';

export interface PlaylistStudyPlan {
  enabled: boolean;
  targetType: StudyTargetType;
  dailyTarget: number; // e.g. 1, 2, 3 videos per day
  weeklyTarget: number; // e.g. 5, 7, 10 videos per week
  reminderIntervalMinutes: number; // e.g. 30, 60, 120, 240, 1440 mins
  scheduledTime?: string; // e.g. "20:00" for 8:00 PM daily
  activeDays: number[]; // [0,1,2,3,4,5,6] (0 = Sunday, 6 = Saturday)
  soundAlert: boolean;
  browserNotification: boolean;
  streak: number; // consecutive days target was met
  lastCompletedDate?: string; // YYYY-MM-DD
  todayCompletedCount: number;
  todayDate?: string; // YYYY-MM-DD
  lastReminderTimestamp: number;
  snoozeUntilTimestamp?: number;
}

export interface HalalPlaylist {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  videos: HalalPlaylistVideo[];
  source: 'custom' | 'youtube' | 'drive';
  youtubePlaylistId?: string;
  isPrivate: boolean;
  createdAt: number;
  updatedAt: number;
  studyPlan: PlaylistStudyPlan;
  category?: string;
}

export interface PlaylistProgressStats {
  totalVideos: number;
  watchedVideos: number;
  remainingVideos: number;
  percentWatched: number;
  totalDurationSeconds: number;
  remainingDurationSeconds: number;
  formattedTotalDuration: string;
  formattedRemainingDuration: string;
  nextVideo: HalalPlaylistVideo | null;
  estimatedCompletionDate?: string;
  isCompleted: boolean;
}

export interface ReminderPreset {
  label: string;
  minutes: number;
  description: string;
}

export const REMINDER_INTERVAL_PRESETS: ReminderPreset[] = [
  { label: 'كل 15 دقيقة', minutes: 15, description: 'للجلسات المكثفة والسريعة' },
  { label: 'كل 30 دقيقة', minutes: 30, description: 'مناسب للدروس القصيرة' },
  { label: 'كل ساعة', minutes: 60, description: 'توازن مثالي للدراسة والمشاهدة' },
  { label: 'كل ساعتين', minutes: 120, description: 'فواصل مريحة بين الجلسات' },
  { label: 'كل 4 ساعات', minutes: 240, description: 'متابعة موزعة على مدار اليوم' },
  { label: 'كل 12 ساعة (مرتين يومياً)', minutes: 720, description: 'صباحاً ومساءً' },
  { label: 'كل 24 ساعة (يومياً)', minutes: 1440, description: 'تذكير يومي منتظم' },
];

export function createDefaultStudyPlan(): PlaylistStudyPlan {
  const todayStr = new Date().toISOString().split('T')[0];
  return {
    enabled: false,
    targetType: 'daily',
    dailyTarget: 1,
    weeklyTarget: 5,
    reminderIntervalMinutes: 60,
    scheduledTime: '20:00',
    activeDays: [0, 1, 2, 3, 4, 5, 6],
    soundAlert: true,
    browserNotification: true,
    streak: 0,
    todayCompletedCount: 0,
    todayDate: todayStr,
    lastReminderTimestamp: 0
  };
}
