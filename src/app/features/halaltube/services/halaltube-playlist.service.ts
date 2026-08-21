import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { 
  HalalPlaylist, 
  HalalPlaylistVideo, 
  PlaylistStudyPlan, 
  PlaylistProgressStats, 
  createDefaultStudyPlan 
} from '../models/halaltube-playlist.model';
import { IndexedDBService } from '../../../core/services/indexed-db.service';
import { FirebaseService } from '../../../core/services/firebase.service';
import { PipedApiService } from '../../../core/services/piped-api.service';
import { ToastService } from '../../../core/services/toast.service';
import { VideoStateService } from '../../../core/services/video-state.service';

@Injectable({
  providedIn: 'root'
})
export class HalaltubePlaylistService {
  private idb = inject(IndexedDBService);
  private firebase = inject(FirebaseService);
  private pipedApi = inject(PipedApiService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private videoState = inject(VideoStateService);

  // Playlists State
  readonly playlists = signal<HalalPlaylist[]>([]);
  readonly activePlaylist = signal<HalalPlaylist | null>(null);
  readonly activeQueue = signal<HalalPlaylistVideo[]>([]);
  readonly currentQueueIndex = signal<number>(-1);
  readonly isAutoplay = signal<boolean>(true);
  readonly isLoop = signal<boolean>(false);
  readonly isShuffle = signal<boolean>(false);

  // Active Reminder State (for in-app floating card & audio alert)
  readonly pendingReminder = signal<{
    playlist: HalalPlaylist;
    nextVideo: HalalPlaylistVideo;
    streak: number;
    remaining: number;
    todayProgress: { done: number; target: number };
  } | null>(null);
  readonly showReminderToast = signal<boolean>(false);

  // Background watcher timer reference
  private reminderIntervalId: any = null;
  private audioCtx: AudioContext | null = null;

  constructor() {
    this.loadPlaylists();
    this.startReminderEngine();
    this.requestNotificationPermission();
  }

  // =========================================================================
  // 1. DATA LOADING & DEFAULT PLAYLISTS INITIALIZATION
  // =========================================================================

  async loadPlaylists() {
    try {
      const stored = await this.idb.getAll('playlists');
      if (stored && stored.length > 0) {
        // Ensure all stored playlists have properly structured studyPlan
        const normalized = stored.map(p => ({
          ...p,
          studyPlan: p.studyPlan ? { ...createDefaultStudyPlan(), ...p.studyPlan } : createDefaultStudyPlan(),
          videos: (p.videos || []).sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
        }));
        this.playlists.set(normalized.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)));
      } else {
        // Initialize default starter playlists
        const defaults = this.getDefaultPlaylists();
        for (const p of defaults) {
          await this.idb.put('playlists', p);
        }
        this.playlists.set(defaults);
      }
    } catch (e) {
      console.error('[HalaltubePlaylistService] Failed to load playlists from IndexedDB', e);
    }
  }

  private getDefaultPlaylists(): HalalPlaylist[] {
    const now = Date.now();
    const todayStr = new Date().toISOString().split('T')[0];

    const watchLater: HalalPlaylist = {
      id: 'watch_later',
      title: 'مشاهدة لاحقاً ⏳',
      description: 'فيديوهات قمت بحفظها للرجوع إليها ومشاهدتها في وقت لاحق',
      videos: [],
      source: 'custom',
      isPrivate: true,
      createdAt: now,
      updatedAt: now,
      studyPlan: {
        ...createDefaultStudyPlan(),
        enabled: false
      }
    };

    const favorites: HalalPlaylist = {
      id: 'favorites',
      title: 'المفضلة والمختارات ⭐',
      description: 'أفضل المقاطع والفيديوهات المفضلة لديك على حلال تيوب',
      videos: [],
      source: 'custom',
      isPrivate: true,
      createdAt: now,
      updatedAt: now,
      studyPlan: {
        ...createDefaultStudyPlan(),
        enabled: false
      }
    };

    const courseExample: HalalPlaylist = {
      id: 'course_web_dev',
      title: 'دورة هندسة البرمجيات وتطبيقات الذكاء الاصطناعي 🚀',
      description: 'مسار تعليمي متكامل لتعلم بناء المنصات الذكية وتطوير الويب الحديث خطوة بخطوة',
      thumbnail: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=800',
      source: 'custom',
      isPrivate: false,
      createdAt: now - 86400000 * 3,
      updatedAt: now,
      studyPlan: {
        enabled: true,
        targetType: 'daily',
        dailyTarget: 2,
        weeklyTarget: 6,
        reminderIntervalMinutes: 60,
        scheduledTime: '20:00',
        activeDays: [0, 1, 2, 3, 4, 5, 6],
        soundAlert: true,
        browserNotification: true,
        streak: 2,
        todayCompletedCount: 1,
        todayDate: todayStr,
        lastReminderTimestamp: 0
      },
      videos: [
        {
          id: 'dQw4w9WgXcQ_1',
          title: 'الدرس الأول: مقدمة في بناء البنية التحتية لتطبيقات الويب الحديثة',
          thumbnail: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=800',
          author: 'أكاديمية البرمجة الهادفة',
          duration: '18:45',
          durationSeconds: 1125,
          addedAt: now - 86400000 * 3,
          watched: true,
          watchedAt: now - 86400000 * 2,
          order: 0
        },
        {
          id: 'dQw4w9WgXcQ_2',
          title: 'الدرس الثاني: تصميم قواعد البيانات المتطورة والمزامنة اللحظية',
          thumbnail: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&q=80&w=800',
          author: 'أكاديمية البرمجة الهادفة',
          duration: '24:10',
          durationSeconds: 1450,
          addedAt: now - 86400000 * 3,
          watched: true,
          watchedAt: now - 86400000,
          order: 1
        },
        {
          id: 'dQw4w9WgXcQ_3',
          title: 'الدرس الثالث: دمج نماذج الذكاء الاصطناعي وبناء تجربة مستخدم فائقة',
          thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800',
          author: 'أكاديمية البرمجة الهادفة',
          duration: '31:50',
          durationSeconds: 1910,
          addedAt: now - 86400000 * 3,
          watched: false,
          order: 2
        },
        {
          id: 'dQw4w9WgXcQ_4',
          title: 'الدرس الرابع: تحسين الأداء والأمان وحماية خصوصية المستخدمين',
          thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=800',
          author: 'أكاديمية البرمجة الهادفة',
          duration: '21:15',
          durationSeconds: 1275,
          addedAt: now - 86400000 * 3,
          watched: false,
          order: 3
        },
        {
          id: 'dQw4w9WgXcQ_5',
          title: 'الدرس الخامس: نشر المشروع على السحابة وإدارة التحديثات المستمرة',
          thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=800',
          author: 'أكاديمية البرمجة الهادفة',
          duration: '28:40',
          durationSeconds: 1720,
          addedAt: now - 86400000 * 3,
          watched: false,
          order: 4
        }
      ]
    };

    return [courseExample, watchLater, favorites];
  }

  // =========================================================================
  // 2. PLAYLIST CRUD & MANAGEMENT
  // =========================================================================

  async createPlaylist(
    title: string, 
    description: string = '', 
    isPrivate: boolean = true, 
    initialVideos: HalalPlaylistVideo[] = [],
    studyPlanConfig?: Partial<PlaylistStudyPlan>
  ): Promise<HalalPlaylist> {
    const id = 'pl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const now = Date.now();

    const plan: PlaylistStudyPlan = {
      ...createDefaultStudyPlan(),
      ...(studyPlanConfig || {})
    };

    const playlist: HalalPlaylist = {
      id,
      title: title.trim(),
      description: description.trim(),
      thumbnail: initialVideos[0]?.thumbnail || undefined,
      videos: initialVideos.map((v, idx) => ({ ...v, order: idx })),
      source: 'custom',
      isPrivate,
      createdAt: now,
      updatedAt: now,
      studyPlan: plan
    };

    await this.idb.put('playlists', playlist);
    this.playlists.update(list => [playlist, ...list]);
    this.toast.show(`تم إنشاء قائمة "${playlist.title}" بنجاح ✨`, 'success');
    return playlist;
  }

  async updatePlaylist(playlist: HalalPlaylist): Promise<void> {
    playlist.updatedAt = Date.now();
    await this.idb.put('playlists', playlist);
    this.playlists.update(list => list.map(p => p.id === playlist.id ? { ...playlist } : p));
    if (this.activePlaylist()?.id === playlist.id) {
      this.activePlaylist.set({ ...playlist });
    }
  }

  async deletePlaylist(playlistId: string): Promise<void> {
    const target = this.playlists().find(p => p.id === playlistId);
    if (!target) return;

    await this.idb.delete('playlists', playlistId);
    this.playlists.update(list => list.filter(p => p.id !== playlistId));
    if (this.activePlaylist()?.id === playlistId) {
      this.activePlaylist.set(null);
    }
    this.toast.show(`تم حذف قائمة "${target.title}" 🗑️`, 'info');
  }

  async addVideoToPlaylist(playlistId: string, video: Partial<HalalPlaylistVideo>): Promise<boolean> {
    const playlist = this.playlists().find(p => p.id === playlistId);
    if (!playlist) return false;

    const vId = video.id || (video as any).videoId;
    if (!vId) return false;

    // Avoid duplicate video in same playlist
    const existing = playlist.videos.find(v => v.id === vId);
    if (existing) {
      this.toast.show(`الفيديو موجود بالفعل في "${playlist.title}"`, 'info');
      return false;
    }

    const newVideo: HalalPlaylistVideo = {
      id: vId,
      title: video.title || 'فيديو بدون عنوان',
      thumbnail: video.thumbnail || `https://img.youtube.com/vi/${vId}/hqdefault.jpg`,
      author: video.author || 'قناة غير معروفة',
      duration: video.duration || '',
      durationSeconds: video.durationSeconds || this.parseDurationToSeconds(video.duration || ''),
      addedAt: Date.now(),
      watched: false,
      order: playlist.videos.length,
      source: video.source || 'youtube'
    };

    playlist.videos.push(newVideo);
    if (!playlist.thumbnail) {
      playlist.thumbnail = newVideo.thumbnail;
    }

    await this.updatePlaylist(playlist);
    this.toast.show(`تمت إضافة الفيديو إلى "${playlist.title}" 🎵`, 'success');
    return true;
  }

  async removeVideoFromPlaylist(playlistId: string, videoId: string): Promise<void> {
    const playlist = this.playlists().find(p => p.id === playlistId);
    if (!playlist) return;

    playlist.videos = playlist.videos
      .filter(v => v.id !== videoId)
      .map((v, idx) => ({ ...v, order: idx }));

    if (playlist.videos.length > 0 && (!playlist.thumbnail || playlist.thumbnail.includes(videoId))) {
      playlist.thumbnail = playlist.videos[0].thumbnail;
    }

    await this.updatePlaylist(playlist);
    this.toast.show('تمت إزالة الفيديو من قائمة التشغيل', 'info');
  }

  async reorderVideos(playlistId: string, fromIndex: number, toIndex: number): Promise<void> {
    const playlist = this.playlists().find(p => p.id === playlistId);
    if (!playlist) return;

    const [moved] = playlist.videos.splice(fromIndex, 1);
    if (moved) {
      playlist.videos.splice(toIndex, 0, moved);
      playlist.videos.forEach((v, idx) => v.order = idx);
      await this.updatePlaylist(playlist);
    }
  }

  // =========================================================================
  // 3. YOUTUBE PLAYLIST IMPORT
  // =========================================================================

  async importYoutubePlaylist(urlOrId: string, enableStudyPlan: boolean = true, dailyTarget: number = 2): Promise<HalalPlaylist | null> {
    const playlistId = this.extractPlaylistId(urlOrId);
    if (!playlistId) {
      this.toast.show('تعذر استخراج معرف قائمة التشغيل. يرجى التأكد من الرابط.', 'error');
      return null;
    }

    try {
      this.toast.show('جاري جلب وفهرسة قائمة التشغيل من يوتيوب... ⏳', 'info');
      const res = await this.pipedApi.getPlaylist(playlistId);
      
      const rawVideos = res?.relatedStreams || res?.videos || res?.items || [];
      if (rawVideos.length === 0) {
        this.toast.show('لم يتم العثور على فيديوهات داخل هذه القائمة', 'warning');
        return null;
      }

      const now = Date.now();
      const mappedVideos: HalalPlaylistVideo[] = rawVideos.map((v: any, idx: number) => {
        const vId = v.id || (v.url ? v.url.replace('/watch?v=', '') : `yt_${idx}`);
        return {
          id: vId,
          title: v.title || `فيديو ${idx + 1}`,
          thumbnail: v.thumbnail || v.videoThumbnails?.[0]?.url || `https://img.youtube.com/vi/${vId}/hqdefault.jpg`,
          author: v.uploaderName || v.author || res?.uploader || 'يوتيوب',
          duration: typeof v.duration === 'string' ? v.duration : this.formatSeconds(v.duration || 0),
          durationSeconds: typeof v.duration === 'number' ? v.duration : this.parseDurationToSeconds(v.duration || ''),
          addedAt: now,
          watched: false,
          order: idx,
          source: 'youtube' as const
        };
      });

      const playlistTitle = res?.name || res?.title || `قائمة يوتيوب (${mappedVideos.length} فيديو)`;
      const playlistDesc = res?.description || `قائمة تشغيل مستوردة من يوتيوب تحتوي على ${mappedVideos.length} فيديو`;

      const newPlaylist = await this.createPlaylist(
        playlistTitle,
        playlistDesc,
        false,
        mappedVideos,
        {
          enabled: enableStudyPlan,
          targetType: 'daily',
          dailyTarget: dailyTarget,
          reminderIntervalMinutes: 60,
          scheduledTime: '20:00'
        }
      );

      newPlaylist.youtubePlaylistId = playlistId;
      newPlaylist.source = 'youtube';
      await this.updatePlaylist(newPlaylist);

      this.toast.show(`تم استيراد قائمة "${playlistTitle}" بنجاح (${mappedVideos.length} فيديو) 🎉`, 'success');
      return newPlaylist;
    } catch (err) {
      console.error('[HalaltubePlaylistService] Failed to import YouTube playlist:', err);
      this.toast.show('فشل استيراد قائمة التشغيل. يرجى التحقق من اتصال الإنترنت والرابط.', 'error');
      return null;
    }
  }

  extractPlaylistId(str: string): string | null {
    if (!str) return null;
    const clean = str.trim();
    if (/^[a-zA-Z0-9_-]{18,}$/.test(clean)) return clean;
    const match = clean.match(/[?&]list=([a-zA-Z0-9_-]+)/i);
    return match ? match[1] : null;
  }

  // =========================================================================
  // 4. WATCH PROGRESS, GOALS & STREAK TRACKING
  // =========================================================================

  async toggleVideoWatched(playlistId: string, videoId: string, forceWatched?: boolean): Promise<void> {
    const playlist = this.playlists().find(p => p.id === playlistId);
    if (!playlist) return;

    const video = playlist.videos.find(v => v.id === videoId);
    if (!video) return;

    const isNowWatched = forceWatched !== undefined ? forceWatched : !video.watched;
    video.watched = isNowWatched;
    video.watchedAt = isNowWatched ? Date.now() : undefined;

    // Update study plan progress
    if (isNowWatched && playlist.studyPlan) {
      const todayStr = new Date().toISOString().split('T')[0];
      const plan = playlist.studyPlan;

      if (plan.todayDate !== todayStr) {
        plan.todayDate = todayStr;
        plan.todayCompletedCount = 0;
      }

      plan.todayCompletedCount = (plan.todayCompletedCount || 0) + 1;

      // Check if daily target completed
      if (plan.todayCompletedCount >= plan.dailyTarget && plan.lastCompletedDate !== todayStr) {
        plan.streak = (plan.streak || 0) + 1;
        plan.lastCompletedDate = todayStr;
        this.playCelebrationSound();
        this.toast.show(`🔥 رائع! لقد حققت هدفك اليومي لقائمة "${playlist.title}"! (سلسلة الالتزام: ${plan.streak} أيام)`, 'success');
      } else {
        this.toast.show(`✓ تم تعليم "${video.title}" كمشاهدة (${plan.todayCompletedCount}/${plan.dailyTarget} اليوم)`, 'info');
      }
    }

    await this.updatePlaylist(playlist);

    // Sync with global VideoState watched list
    if (isNowWatched) {
      this.videoState.watchedIds.update(set => {
        const next = new Set(set);
        next.add(videoId);
        return next;
      });
      this.videoState.watchedProgress.update(map => {
        const next = new Map(map);
        next.set(videoId, 100);
        return next;
      });
    }
  }

  // Calculate detailed stats for a playlist
  calculateStats(playlist: HalalPlaylist): PlaylistProgressStats {
    const videos = playlist.videos || [];
    const totalVideos = videos.length;
    const watchedVideos = videos.filter(v => v.watched).length;
    const remainingVideos = totalVideos - watchedVideos;
    const percentWatched = totalVideos > 0 ? Math.round((watchedVideos / totalVideos) * 100) : 0;

    let totalDurationSeconds = 0;
    let remainingDurationSeconds = 0;

    for (const v of videos) {
      const sec = v.durationSeconds || this.parseDurationToSeconds(v.duration || '');
      totalDurationSeconds += sec;
      if (!v.watched) {
        remainingDurationSeconds += sec;
      }
    }

    // Find first unwatched video
    const nextVideo = videos.find(v => !v.watched) || null;

    // Calculate estimated completion date based on daily target
    let estimatedCompletionDate: string | undefined = undefined;
    const dailyTarget = playlist.studyPlan?.dailyTarget || 1;
    if (remainingVideos > 0 && dailyTarget > 0) {
      const daysNeeded = Math.ceil(remainingVideos / dailyTarget);
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + daysNeeded);
      estimatedCompletionDate = targetDate.toLocaleDateString('ar-EG', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    }

    return {
      totalVideos,
      watchedVideos,
      remainingVideos,
      percentWatched,
      totalDurationSeconds,
      remainingDurationSeconds,
      formattedTotalDuration: this.formatDurationArabic(totalDurationSeconds),
      formattedRemainingDuration: this.formatDurationArabic(remainingDurationSeconds),
      nextVideo,
      estimatedCompletionDate,
      isCompleted: totalVideos > 0 && watchedVideos === totalVideos
    };
  }

  // =========================================================================
  // 5. SMART REMINDER & FOLLOW-UP ENGINE
  // =========================================================================

  private startReminderEngine() {
    if (this.reminderIntervalId) {
      clearInterval(this.reminderIntervalId);
    }

    // Check reminders every 30 seconds
    this.reminderIntervalId = setInterval(() => {
      this.checkAndTriggerReminders();
    }, 30000);
  }

  private checkAndTriggerReminders() {
    const now = Date.now();
    const todayStr = new Date().toISOString().split('T')[0];
    const currentDayOfWeek = new Date().getDay(); // 0 = Sunday
    const currentHours = new Date().getHours().toString().padStart(2, '0');
    const currentMinutes = new Date().getMinutes().toString().padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMinutes}`;

    for (const playlist of this.playlists()) {
      const plan = playlist.studyPlan;
      if (!plan || !plan.enabled) continue;

      // Skip if playlist is 100% completed
      const stats = this.calculateStats(playlist);
      if (stats.isCompleted || !stats.nextVideo) continue;

      // Check snooze
      if (plan.snoozeUntilTimestamp && now < plan.snoozeUntilTimestamp) {
        continue;
      }

      // Check if reminder is due
      let isDue = false;

      if (plan.targetType === 'interval' || plan.reminderIntervalMinutes > 0) {
        const intervalMs = (plan.reminderIntervalMinutes || 60) * 60 * 1000;
        const lastRemind = plan.lastReminderTimestamp || 0;
        if (now - lastRemind >= intervalMs) {
          isDue = true;
        }
      } else if (plan.targetType === 'daily' && plan.scheduledTime) {
        // Daily scheduled mode
        const isScheduledHour = currentTimeStr === plan.scheduledTime;
        const isTodayActive = (plan.activeDays || [0,1,2,3,4,5,6]).includes(currentDayOfWeek);
        const lastRemindToday = plan.lastReminderTimestamp && (new Date(plan.lastReminderTimestamp).toISOString().split('T')[0] === todayStr);

        if (isScheduledHour && isTodayActive && !lastRemindToday) {
          isDue = true;
        }
      }

      if (isDue) {
        this.triggerReminder(playlist, stats.nextVideo, stats.remainingVideos);
        plan.lastReminderTimestamp = now;
        plan.snoozeUntilTimestamp = undefined;
        this.updatePlaylist(playlist);
        break; // Only show 1 reminder at a time to prevent UI clutter
      }
    }
  }

  triggerReminder(playlist: HalalPlaylist, nextVideo: HalalPlaylistVideo, remaining: number) {
    const plan = playlist.studyPlan;
    const todayStr = new Date().toISOString().split('T')[0];

    const todayDone = (plan?.todayDate === todayStr) ? (plan?.todayCompletedCount || 0) : 0;
    const todayTarget = plan?.dailyTarget || 1;

    this.pendingReminder.set({
      playlist,
      nextVideo,
      streak: plan?.streak || 0,
      remaining,
      todayProgress: { done: todayDone, target: todayTarget }
    });

    this.showReminderToast.set(true);

    if (plan?.soundAlert) {
      this.playReminderChime();
    }

    if (plan?.browserNotification) {
      this.sendBrowserNotification(playlist, nextVideo);
    }
  }

  // Manually test the reminder for a specific playlist
  testReminder(playlistId: string) {
    const playlist = this.playlists().find(p => p.id === playlistId);
    if (!playlist) return;

    const stats = this.calculateStats(playlist);
    const targetVideo = stats.nextVideo || playlist.videos[0];
    if (!targetVideo) {
      this.toast.show('لا توجد فيديوهات في هذه القائمة لاختبار التذكير', 'warning');
      return;
    }

    this.triggerReminder(playlist, targetVideo, stats.remainingVideos || 1);
    this.toast.show('🔔 تم إطلاق إشعار التذكير التجريبي بنجاح!', 'info');
  }

  // Quick Action 1: Mark as Watched directly from the notification
  async markWatchedFromReminder() {
    const reminder = this.pendingReminder();
    if (!reminder) return;

    await this.toggleVideoWatched(reminder.playlist.id, reminder.nextVideo.id, true);
    this.showReminderToast.set(false);
    this.pendingReminder.set(null);
  }

  // Quick Action 2: Watch next video now
  playNextFromReminder() {
    const reminder = this.pendingReminder();
    if (!reminder) return;

    this.showReminderToast.set(false);
    this.initQueue(reminder.playlist.id, reminder.nextVideo.id);
    this.router.navigate(['/stream/watch', reminder.nextVideo.id], {
      queryParams: { list: reminder.playlist.id }
    });
  }

  // Quick Action 3: Snooze reminder
  snoozeReminder(minutes: number = 15) {
    const reminder = this.pendingReminder();
    if (!reminder) return;

    const playlist = this.playlists().find(p => p.id === reminder.playlist.id);
    if (playlist && playlist.studyPlan) {
      playlist.studyPlan.snoozeUntilTimestamp = Date.now() + minutes * 60 * 1000;
      this.updatePlaylist(playlist);
    }

    this.showReminderToast.set(false);
    this.pendingReminder.set(null);
    this.toast.show(`⏰ تم تأجيل التذكير لمدة ${minutes} دقيقة`, 'info');
  }

  // Quick Action 4: Skip to next video in sequence
  skipVideoFromReminder() {
    const reminder = this.pendingReminder();
    if (!reminder) return;

    const videos = reminder.playlist.videos || [];
    const currentIndex = videos.findIndex(v => v.id === reminder.nextVideo.id);
    const nextUnwatched = videos.slice(currentIndex + 1).find(v => !v.watched) || videos.find(v => !v.watched && v.id !== reminder.nextVideo.id);

    if (nextUnwatched) {
      this.triggerReminder(reminder.playlist, nextUnwatched, reminder.remaining);
      this.toast.show(`تم تخطي الفيديو والانتقال إلى: "${nextUnwatched.title}"`, 'info');
    } else {
      this.showReminderToast.set(false);
      this.pendingReminder.set(null);
      this.toast.show('لا توجد فيديوهات أخرى متبقية في هذه القائمة', 'info');
    }
  }

  dismissReminder() {
    this.showReminderToast.set(false);
    this.pendingReminder.set(null);
  }

  // =========================================================================
  // 6. AUDIO & BROWSER NOTIFICATIONS
  // =========================================================================

  private playReminderChime() {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;
      const osc1 = this.audioCtx.createOscillator();
      const osc2 = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(440, now);
      osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.25); // D6

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc1.start(now);
      osc2.start(now + 0.08);
      osc1.stop(now + 0.6);
      osc2.stop(now + 0.6);
    } catch (e) {
      // Ignore audio synthesis errors on locked browsers
    }
  }

  private playCelebrationSound() {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        const osc = this.audioCtx!.createOscillator();
        const gain = this.audioCtx!.createGain();
        const startTime = now + i * 0.1;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.01, startTime);
        gain.gain.linearRampToValueAtTime(0.18, startTime + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

        osc.connect(gain);
        gain.connect(this.audioCtx!.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.45);
      });
    } catch (e) {}
  }

  private requestNotificationPermission() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        // We do not force prompt immediately, will be requested when user toggles notifications
      }
    }
  }

  async askBrowserNotificationPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    const res = await Notification.requestPermission();
    return res === 'granted';
  }

  private sendBrowserNotification(playlist: HalalPlaylist, nextVideo: HalalPlaylistVideo) {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    try {
      const notif = new Notification(`⏰ حان موعد متابعة: ${playlist.title}`, {
        body: `الفيديو المقترح التالي: "${nextVideo.title}" (${nextVideo.duration || 'مقطع'})`,
        icon: nextVideo.thumbnail || 'assets/icons/icon-192x192.png',
        tag: `halaltube_playlist_${playlist.id}`,
        dir: 'rtl',
        lang: 'ar'
      });

      notif.onclick = () => {
        window.focus();
        this.playNextFromReminder();
        notif.close();
      };
    } catch (e) {
      console.warn('[HalaltubePlaylistService] Web notification failed:', e);
    }
  }

  // =========================================================================
  // 7. PLAYER QUEUE MANAGEMENT
  // =========================================================================

  initQueue(playlistId: string, startVideoId?: string) {
    const playlist = this.playlists().find(p => p.id === playlistId);
    if (!playlist) return;

    this.activePlaylist.set(playlist);
    let videos = [...playlist.videos];

    if (this.isShuffle()) {
      videos = this.shuffleArray(videos);
    }

    this.activeQueue.set(videos);

    let idx = 0;
    if (startVideoId) {
      const foundIdx = videos.findIndex(v => v.id === startVideoId);
      if (foundIdx >= 0) idx = foundIdx;
    }
    this.currentQueueIndex.set(idx);
  }

  getNextQueueVideo(): HalalPlaylistVideo | null {
    const queue = this.activeQueue();
    const curr = this.currentQueueIndex();
    if (queue.length === 0) return null;

    if (curr + 1 < queue.length) {
      return queue[curr + 1];
    } else if (this.isLoop()) {
      return queue[0];
    }
    return null;
  }

  getPrevQueueVideo(): HalalPlaylistVideo | null {
    const queue = this.activeQueue();
    const curr = this.currentQueueIndex();
    if (queue.length === 0) return null;

    if (curr - 1 >= 0) {
      return queue[curr - 1];
    } else if (this.isLoop()) {
      return queue[queue.length - 1];
    }
    return null;
  }

  async onVideoEnded(currentVideoId: string) {
    const playlist = this.activePlaylist();
    if (!playlist) return;

    // Automatically mark video as watched in playlist
    await this.toggleVideoWatched(playlist.id, currentVideoId, true);

    if (this.isAutoplay()) {
      const next = this.getNextQueueVideo();
      if (next) {
        const nextIdx = this.activeQueue().findIndex(v => v.id === next.id);
        this.currentQueueIndex.set(nextIdx);
        this.router.navigate(['/stream/watch', next.id], {
          queryParams: { list: playlist.id }
        });
      }
    }
  }

  private shuffleArray<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  // =========================================================================
  // 8. HELPERS & FORMATTING
  // =========================================================================

  parseDurationToSeconds(dur: string | number): number {
    if (typeof dur === 'number') return dur;
    if (!dur) return 0;
    const parts = dur.trim().split(':').map(p => parseInt(p, 10));
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 1 && !isNaN(parts[0])) {
      return parts[0];
    }
    return 0;
  }

  formatSeconds(totalSeconds: number): string {
    if (!totalSeconds || isNaN(totalSeconds)) return '0:00';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  formatDurationArabic(totalSeconds: number): string {
    if (!totalSeconds || isNaN(totalSeconds)) return '0 دقيقة';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (hours > 0 && minutes > 0) {
      return `${hours} ساعة و ${minutes} دقيقة`;
    } else if (hours > 0) {
      return `${hours} ساعة`;
    }
    return `${minutes} دقيقة`;
  }
}
