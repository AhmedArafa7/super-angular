import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { 
  LucideAngularModule, Play, CheckCircle2, Clock, Flame, Bell, Sparkles, 
  Trash2, Plus, ArrowUpDown, ChevronLeft, Share2, Shuffle, Check, Edit3, 
  BookOpen, Calendar, Target, Volume2, Globe, AlertCircle, RefreshCw, X
} from 'lucide-angular';
import { HalaltubePlaylistService } from '../../services/halaltube-playlist.service';
import { HalalPlaylist, HalalPlaylistVideo, REMINDER_INTERVAL_PRESETS, ReminderPreset } from '../../models/halaltube-playlist.model';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-halaltube-playlist-view',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule],
  templateUrl: './halaltube-playlist-view.component.html',
  styleUrls: ['./halaltube-playlist-view.component.scss']
})
export class HalaltubePlaylistViewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  playlistSvc = inject(HalaltubePlaylistService);
  toast = inject(ToastService);

  // Icons
  Play = Play;
  CheckCircle2 = CheckCircle2;
  Clock = Clock;
  Flame = Flame;
  Bell = Bell;
  Sparkles = Sparkles;
  Trash2 = Trash2;
  Plus = Plus;
  ArrowUpDown = ArrowUpDown;
  ChevronLeft = ChevronLeft;
  Share2 = Share2;
  Shuffle = Shuffle;
  Check = Check;
  Edit3 = Edit3;
  BookOpen = BookOpen;
  Calendar = Calendar;
  Target = Target;
  Volume2 = Volume2;
  Globe = Globe;
  AlertCircle = AlertCircle;
  RefreshCw = RefreshCw;
  X = X;

  playlistId = signal<string>('');
  filterMode = signal<'all' | 'unwatched' | 'watched'>('all');
  searchQuery = signal<string>('');
  showStudyPlanModal = signal<boolean>(false);
  showAddVideoModal = signal<boolean>(false);
  showEditInfoModal = signal<boolean>(false);

  // Add Video Form
  newVideoUrl = signal<string>('');
  newVideoTitle = signal<string>('');
  isAddingVideo = signal<boolean>(false);

  // Edit Playlist Info Form
  editTitle = signal<string>('');
  editDescription = signal<string>('');

  // Study Plan Form State
  planEnabled = signal<boolean>(false);
  planTargetType = signal<'daily' | 'weekly' | 'interval'>('daily');
  planDailyTarget = signal<number>(1);
  planWeeklyTarget = signal<number>(5);
  planIntervalMinutes = signal<number>(60);
  planScheduledTime = signal<string>('20:00');
  planSoundAlert = signal<boolean>(true);
  planBrowserNotification = signal<boolean>(true);

  intervalPresets = REMINDER_INTERVAL_PRESETS;

  // Active playlist computed
  playlist = computed<HalalPlaylist | null>(() => {
    const id = this.playlistId();
    return this.playlistSvc.playlists().find(p => p.id === id) || null;
  });

  // Stats computed
  stats = computed(() => {
    const p = this.playlist();
    if (!p) return null;
    return this.playlistSvc.calculateStats(p);
  });

  // Filtered and searched videos
  filteredVideos = computed(() => {
    const p = this.playlist();
    if (!p) return [];

    let list = [...(p.videos || [])];
    const mode = this.filterMode();
    const query = this.searchQuery().trim().toLowerCase();

    if (mode === 'unwatched') {
      list = list.filter(v => !v.watched);
    } else if (mode === 'watched') {
      list = list.filter(v => v.watched);
    }

    if (query) {
      list = list.filter(v => 
        (v.title && v.title.toLowerCase().includes(query)) ||
        (v.author && v.author.toLowerCase().includes(query))
      );
    }

    return list;
  });

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.playlistId.set(id);
        this.syncStudyPlanForm();
      }
    });
  }

  syncStudyPlanForm() {
    const p = this.playlist();
    if (!p || !p.studyPlan) return;

    const plan = p.studyPlan;
    this.planEnabled.set(plan.enabled);
    this.planTargetType.set(plan.targetType || 'daily');
    this.planDailyTarget.set(plan.dailyTarget || 1);
    this.planWeeklyTarget.set(plan.weeklyTarget || 5);
    this.planIntervalMinutes.set(plan.reminderIntervalMinutes || 60);
    this.planScheduledTime.set(plan.scheduledTime || '20:00');
    this.planSoundAlert.set(plan.soundAlert ?? true);
    this.planBrowserNotification.set(plan.browserNotification ?? true);

    this.editTitle.set(p.title);
    this.editDescription.set(p.description || '');
  }

  playAll(shuffle: boolean = false) {
    const p = this.playlist();
    if (!p || p.videos.length === 0) return;

    this.playlistSvc.isShuffle.set(shuffle);
    const startVideo = shuffle ? p.videos[Math.floor(Math.random() * p.videos.length)] : p.videos[0];
    this.playlistSvc.initQueue(p.id, startVideo.id);
    this.router.navigate(['/stream/watch', startVideo.id], {
      queryParams: { list: p.id }
    });
  }

  resumeNext() {
    const p = this.playlist();
    const st = this.stats();
    if (!p || !st) return;

    const targetVideo = st.nextVideo || p.videos[0];
    if (!targetVideo) return;

    this.playlistSvc.initQueue(p.id, targetVideo.id);
    this.router.navigate(['/stream/watch', targetVideo.id], {
      queryParams: { list: p.id }
    });
  }

  playVideo(video: HalalPlaylistVideo) {
    const p = this.playlist();
    if (!p) return;

    this.playlistSvc.initQueue(p.id, video.id);
    this.router.navigate(['/stream/watch', video.id], {
      queryParams: { list: p.id }
    });
  }

  async toggleWatched(video: HalalPlaylistVideo, event: Event) {
    event.stopPropagation();
    const p = this.playlist();
    if (!p) return;

    await this.playlistSvc.toggleVideoWatched(p.id, video.id);
  }

  async removeVideo(video: HalalPlaylistVideo, event: Event) {
    event.stopPropagation();
    const p = this.playlist();
    if (!p) return;

    if (confirm(`هل أنت متأكد من إزالة فيديو "${video.title}" من القائمة؟`)) {
      await this.playlistSvc.removeVideoFromPlaylist(p.id, video.id);
    }
  }

  async moveUp(index: number, event: Event) {
    event.stopPropagation();
    const p = this.playlist();
    if (!p || index <= 0) return;

    await this.playlistSvc.reorderVideos(p.id, index, index - 1);
  }

  async moveDown(index: number, event: Event) {
    event.stopPropagation();
    const p = this.playlist();
    if (!p || index >= p.videos.length - 1) return;

    await this.playlistSvc.reorderVideos(p.id, index, index + 1);
  }

  testReminder() {
    const p = this.playlist();
    if (!p) return;
    this.playlistSvc.testReminder(p.id);
  }

  async saveStudyPlan() {
    const p = this.playlist();
    if (!p) return;

    // Check browser notification permission if requested
    if (this.planBrowserNotification()) {
      await this.playlistSvc.askBrowserNotificationPermission();
    }

    p.studyPlan = {
      ...p.studyPlan,
      enabled: this.planEnabled(),
      targetType: this.planTargetType(),
      dailyTarget: this.planDailyTarget(),
      weeklyTarget: this.planWeeklyTarget(),
      reminderIntervalMinutes: Number(this.planIntervalMinutes()),
      scheduledTime: this.planScheduledTime(),
      soundAlert: this.planSoundAlert(),
      browserNotification: this.planBrowserNotification()
    };

    await this.playlistSvc.updatePlaylist(p);
    this.showStudyPlanModal.set(false);
    this.toast.show('تم حفظ إعدادات خطة المتابعة والتذكير بنجاح! 🎯', 'success');
  }

  async savePlaylistInfo() {
    const p = this.playlist();
    if (!p) return;

    p.title = this.editTitle().trim() || p.title;
    p.description = this.editDescription().trim();

    await this.playlistSvc.updatePlaylist(p);
    this.showEditInfoModal.set(false);
    this.toast.show('تم تحديث بيانات القائمة بنجاح ✨', 'success');
  }

  async deletePlaylist() {
    const p = this.playlist();
    if (!p) return;

    if (confirm(`هل أنت متأكد من حذف قائمة "${p.title}" نهائياً؟`)) {
      await this.playlistSvc.deletePlaylist(p.id);
      this.router.navigate(['/stream/library']);
    }
  }

  async addNewVideo() {
    const p = this.playlist();
    if (!p) return;

    const url = this.newVideoUrl().trim();
    if (!url) return;

    this.isAddingVideo.set(true);
    try {
      let vId = url;
      if (url.length === 11) {
        vId = url;
      } else {
        const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([^&?\n]+)/);
        if (match && match[1]) vId = match[1];
      }

      const title = this.newVideoTitle().trim() || 'فيديو يوتيوب';
      const thumb = `https://img.youtube.com/vi/${vId}/hqdefault.jpg`;

      await this.playlistSvc.addVideoToPlaylist(p.id, {
        id: vId,
        title,
        thumbnail: thumb,
        author: 'يوتيوب'
      });

      this.newVideoUrl.set('');
      this.newVideoTitle.set('');
      this.showAddVideoModal.set(false);
    } catch (e) {
      this.toast.show('فشل إضافة الفيديو للقائمة', 'error');
    } finally {
      this.isAddingVideo.set(false);
    }
  }

  sharePlaylist() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      this.toast.show('تم نسخ رابط القائمة إلى الحافظة! 📋', 'success');
    }).catch(() => {
      this.toast.show('تعذر نسخ الرابط', 'error');
    });
  }
}
