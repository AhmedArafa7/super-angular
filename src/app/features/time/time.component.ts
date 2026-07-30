import { Component, inject, effect, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { TimeService, Task, PomodoroMode, ScheduleBlock } from '../../core/time.service';

@Component({
  selector: 'app-time',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideDynamicIcon],
  templateUrl: './time.component.html',
  styleUrls: ['./time.component.scss']
})
export class TimeComponent implements OnDestroy {
  timeService = inject(TimeService);

  // Form states for tasks
  newTitle = '';
  priority: Task['priority'] = 'medium';

  // Form states for Schedule Blocks
  newSlot = '';
  newBlockTitle = '';
  newCategory: ScheduleBlock['category'] = 'deep_work';
  newTargetFocus = 90;
  newNotes = '';
  showAddBlockForm = false;

  // Local timer reference
  private intervalId: any = null;

  // Computed circular SVG dash offset progress
  progress = computed(() => {
    const left = this.timeService.timeLeft();
    const mode = this.timeService.pomodoroMode();
    const total = mode === 'focus' ? 25 * 60 : mode === 'short' ? 5 * 60 : 15 * 60;
    return (left / total) * 100;
  });

  // Computed schedule stats
  completedBlocksCount = computed(() => {
    return this.timeService.scheduleBlocks().filter(b => b.status === 'completed').length;
  });

  activeBlocksCount = computed(() => {
    return this.timeService.scheduleBlocks().filter(b => b.status === 'active').length;
  });

  priorityColors = {
    high: "text-red-400 border-red-500/20 bg-red-500/10",
    medium: "text-amber-400 border-amber-500/20 bg-amber-500/10",
    low: "text-indigo-400 border-indigo-500/20 bg-indigo-500/10"
  };

  categoryConfig = {
    deep_work: { label: 'عمل عميق', icon: 'zap', badgeClass: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
    break: { label: 'استراحة', icon: 'coffee', badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    meeting: { label: 'اجتماع/تنسيق', icon: 'users', badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    learning: { label: 'تعلم وتطوير', icon: 'book-open', badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/20' }
  };

  statusConfig = {
    pending: { label: 'لم تبدأ بعد', badgeClass: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
    active: { label: 'قيد التنفيذ 🔥', badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse' },
    completed: { label: 'مكتملة ✅', badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' }
  };

  constructor() {
    // Elegant Angular effect to manage running Pomodoro interval ticks reactive to isRunning signal
    effect(() => {
      const running = this.timeService.isRunning();
      if (running) {
        if (!this.intervalId) {
          this.intervalId = setInterval(() => {
            this.timeService.tick();
            
            // Trigger browser-based notification on completion
            if (this.timeService.timeLeft() === 0) {
              this.triggerAlert();
            }
          }, 1000);
        }
      } else {
        this.clearLocalInterval();
      }
    });
  }

  ngOnDestroy(): void {
    this.clearLocalInterval();
  }

  private clearLocalInterval(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // Timer formatted view (mm:ss)
  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // Task actions
  handleAddTask(): void {
    if (!this.newTitle?.trim()) return;
    this.timeService.addTask(this.newTitle.trim(), this.priority);
    this.newTitle = '';
  }

  toggleTask(id: string): void {
    this.timeService.toggleTask(id);
  }

  deleteTask(id: string): void {
    this.timeService.deleteTask(id);
  }

  changeMode(mode: PomodoroMode): void {
    this.timeService.setPomodoroMode(mode);
  }

  // Schedule Block actions
  handleAddScheduleBlock(): void {
    if (!this.newSlot?.trim() || !this.newBlockTitle?.trim()) return;
    this.timeService.addScheduleBlock(
      this.newSlot.trim(),
      this.newBlockTitle.trim(),
      this.newCategory,
      this.newTargetFocus,
      this.newNotes.trim()
    );
    this.newSlot = '';
    this.newBlockTitle = '';
    this.newNotes = '';
    this.showAddBlockForm = false;
  }

  toggleScheduleStatus(id: string): void {
    this.timeService.toggleScheduleStatus(id);
  }

  deleteScheduleBlock(id: string): void {
    this.timeService.deleteScheduleBlock(id);
  }

  loadDefaultPreset(): void {
    this.timeService.loadDefaultSchedulePreset();
  }

  clearSchedule(): void {
    this.timeService.clearSchedule();
  }

  // Session completion notification helper
  private triggerAlert(): void {
    setTimeout(() => {
      alert("انتهت الجلسة! خذ قسطاً من الراحة.");
    }, 100);
  }
}

