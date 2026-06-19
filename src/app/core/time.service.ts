import { Injectable, signal } from '@angular/core';

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: number;
}

export type PomodoroMode = 'focus' | 'short' | 'long';

const MODES = {
  focus: 25 * 60,
  short: 5 * 60,
  long: 15 * 60
};

@Injectable({
  providedIn: 'root'
})
export class TimeService {
  // Signals State
  readonly tasks = signal<Task[]>([]);
  readonly pomodoroMode = signal<PomodoroMode>('focus');
  readonly timeLeft = signal<number>(MODES.focus);
  readonly isRunning = signal<boolean>(false);

  constructor() {
    this.loadState();
  }

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
          if (parsed.pomodoroMode !== undefined) this.pomodoroMode.set(parsed.pomodoroMode);
          if (parsed.timeLeft !== undefined) this.timeLeft.set(parsed.timeLeft);
        } catch (e) {
          console.error("Failed to parse time registry", e);
        }
      }
    }
  }
}
