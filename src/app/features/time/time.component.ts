import { Component, inject, effect, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { TimeService, Task, PomodoroMode } from '../../core/time.service';

@Component({
  selector: 'app-time',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideDynamicIcon],
  templateUrl: './time.component.html',
  styleUrls: ['./time.component.scss']
})
export class TimeComponent implements OnDestroy {
  timeService = inject(TimeService);

  // Form states
  newTitle = '';
  priority: Task['priority'] = 'medium';

  // Local timer reference
  private intervalId: any = null;

  // Computed circular SVG dash offset progress
  progress = computed(() => {
    const left = this.timeService.timeLeft();
    const mode = this.timeService.pomodoroMode();
    const total = mode === 'focus' ? 25 * 60 : mode === 'short' ? 5 * 60 : 15 * 60;
    return (left / total) * 100;
  });

  priorityColors = {
    high: "text-red-400 border-red-500/20 bg-red-500/10",
    medium: "text-amber-400 border-amber-500/20 bg-amber-500/10",
    low: "text-indigo-400 border-indigo-500/20 bg-indigo-500/10"
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

  // Session completion notification helper
  private triggerAlert(): void {
    setTimeout(() => {
      alert("انتهت الجلسة! خذ قسطاً من الراحة.");
    }, 100);
  }
}
