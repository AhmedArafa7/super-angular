import { Injectable, signal } from '@angular/core';

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: number;
}

export interface ScheduleBlock {
  id: string;
  timeSlot: string; // e.g. "08:00 - 09:30"
  title: string;
  category: 'deep_work' | 'break' | 'meeting' | 'learning';
  targetFocus: number; // percentage (50-100)
  status: 'pending' | 'active' | 'completed';
  notes?: string;
}

export type PomodoroMode = 'focus' | 'short' | 'long';

const MODES = {
  focus: 25 * 60,
  short: 5 * 60,
  long: 15 * 60
};

export const DEFAULT_SCHEDULE_PRESET: Omit<ScheduleBlock, 'id'>[] = [
  { timeSlot: '08:00 - 09:30', title: 'عمل عميق: برمجة وإنجاز المهام الأساسية', category: 'deep_work', targetFocus: 100, status: 'completed', notes: 'تركيز أقصى بدون مقاطعات' },
  { timeSlot: '09:30 - 09:45', title: 'استراحة قصيرة وشرب ماء', category: 'break', targetFocus: 50, status: 'completed', notes: 'إطالة خفيفة وتحريك العضلات' },
  { timeSlot: '09:45 - 11:30', title: 'عمل عميق: تصميم وتطوير الميزات الجديده', category: 'deep_work', targetFocus: 90, status: 'active', notes: 'مراجعة الكود واختبار الواجهات' },
  { timeSlot: '11:30 - 12:30', title: 'تعلم وتطوير مهارات: قراءة ومتابعة التحديثات', category: 'learning', targetFocus: 80, status: 'pending', notes: 'مراجعة الوثائق التقنية' },
  { timeSlot: '12:30 - 01:30', title: 'راحة الغداء والصلاة', category: 'break', targetFocus: 50, status: 'pending', notes: 'تجديد النشاط والابتعاد عن الشاشات' },
  { timeSlot: '01:30 - 03:00', title: 'جلسة مراجعة المهام والاجتماعات الخفيفة', category: 'meeting', targetFocus: 75, status: 'pending', notes: 'التنسيق وتحديد أولويات الغد' }
];

@Injectable({
  providedIn: 'root'
})
export class TimeService {
  // Signals State
  readonly tasks = signal<Task[]>([]);
  readonly scheduleBlocks = signal<ScheduleBlock[]>([]);
  readonly pomodoroMode = signal<PomodoroMode>('focus');
  readonly timeLeft = signal<number>(MODES.focus);
  readonly isRunning = signal<boolean>(false);

  constructor() {
    this.loadState();
  }

  // Tasks Methods
  addTask(title: string, priority: Task['priority']): void {
    const newTask: Task = {
      id: Math.random().toString(36).substring(7),
      title,
      priority,
      completed: false,
      createdAt: Date.now()
    };
    this.tasks.set([newTask, ...this.tasks()]);
    this.saveState();
  }

  toggleTask(id: string): void {
    this.tasks.update(all => 
      all.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
    );
    this.saveState();
  }

  deleteTask(id: string): void {
    this.tasks.update(all => all.filter(t => t.id !== id));
    this.saveState();
  }

  // Schedule Blocks Methods
  addScheduleBlock(timeSlot: string, title: string, category: ScheduleBlock['category'], targetFocus: number, notes: string = ''): void {
    const newBlock: ScheduleBlock = {
      id: 'sb_' + Math.random().toString(36).substring(7),
      timeSlot,
      title,
      category,
      targetFocus,
      status: 'pending',
      notes
    };
    this.scheduleBlocks.set([...this.scheduleBlocks(), newBlock]);
    this.saveState();
  }

  toggleScheduleStatus(id: string): void {
    this.scheduleBlocks.update(blocks => 
      blocks.map(b => {
        if (b.id !== id) return b;
        const nextStatus: ScheduleBlock['status'] = 
          b.status === 'pending' ? 'active' : b.status === 'active' ? 'completed' : 'pending';
        return { ...b, status: nextStatus };
      })
    );
    this.saveState();
  }

  deleteScheduleBlock(id: string): void {
    this.scheduleBlocks.update(blocks => blocks.filter(b => b.id !== id));
    this.saveState();
  }

  loadDefaultSchedulePreset(): void {
    const preset: ScheduleBlock[] = DEFAULT_SCHEDULE_PRESET.map(item => ({
      ...item,
      id: 'sb_' + Math.random().toString(36).substring(7)
    }));
    this.scheduleBlocks.set(preset);
    this.saveState();
  }

  clearSchedule(): void {
    this.scheduleBlocks.set([]);
    this.saveState();
  }

  // Pomodoro Methods
  setPomodoroMode(mode: PomodoroMode): void {
    this.pomodoroMode.set(mode);
    this.timeLeft.set(MODES[mode]);
    this.isRunning.set(false);
    this.saveState();
  }

  tick(): void {
    const current = this.timeLeft();
    if (current <= 0) {
      this.isRunning.set(false);
      this.timeLeft.set(0);
      this.triggerSessionEndEffects();
    } else {
      this.timeLeft.set(current - 1);
    }
  }

  toggleTimer(): void {
    this.isRunning.update(r => !r);
    this.saveState();
  }

  resetTimer(): void {
    const mode = this.pomodoroMode();
    this.timeLeft.set(MODES[mode]);
    this.isRunning.set(false);
    this.saveState();
  }

  private triggerSessionEndEffects(): void {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
  }

  // Persistence Logic
  private saveState(): void {
    if (typeof window !== 'undefined') {
      const state = {
        tasks: this.tasks(),
        scheduleBlocks: this.scheduleBlocks(),
        pomodoroMode: this.pomodoroMode(),
        timeLeft: this.timeLeft(),
        isRunning: false // Always stop running timer on reload
      };
      localStorage.setItem('Si-Neuro-time-registry', JSON.stringify(state));
    }
  }

  private loadState(): void {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('Si-Neuro-time-registry');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.tasks !== undefined) this.tasks.set(parsed.tasks);
          if (parsed.scheduleBlocks !== undefined && Array.isArray(parsed.scheduleBlocks)) {
            this.scheduleBlocks.set(parsed.scheduleBlocks);
          } else {
            this.loadDefaultSchedulePreset();
          }
          if (parsed.pomodoroMode !== undefined) this.pomodoroMode.set(parsed.pomodoroMode);
          if (parsed.timeLeft !== undefined) this.timeLeft.set(parsed.timeLeft);
        } catch (e) {
          console.error("Failed to parse time registry", e);
          this.loadDefaultSchedulePreset();
        }
      } else {
        this.loadDefaultSchedulePreset();
      }
    }
  }
}

