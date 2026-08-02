export interface HistoryEntry {
  text: string;
  time: string;
}

export class TextHistoryManager {
  private stack: string[] = [];
  private entries: HistoryEntry[] = [];
  private step = -1;
  private storageKey: string;

  constructor(storageKey: string) {
    this.storageKey = storageKey;
    this.loadSaved();
  }

  private loadSaved() {
    if (typeof localStorage === 'undefined') return;
    try {
      const data = localStorage.getItem(this.storageKey + '_history');
      if (data) {
        this.entries = JSON.parse(data);
        this.stack = this.entries.map(e => e.text);
        this.step = this.stack.length - 1;
      }
    } catch {}
  }

  push(text: string) {
    if (this.stack[this.step] === text) return;
    if (this.step < this.stack.length - 1) {
      this.stack = this.stack.slice(0, this.step + 1);
      this.entries = this.entries.slice(0, this.step + 1);
    }
    this.stack.push(text);
    const timeStr = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.entries.push({ text, time: timeStr });
    this.step = this.stack.length - 1;
    if (this.stack.length > 30) {
      this.stack.shift();
      this.entries.shift();
      this.step--;
    }
    this.save();
  }

  private save() {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(this.storageKey + '_history', JSON.stringify(this.entries));
  }

  undo(): string | null {
    if (this.step > 0) {
      this.step--;
      return this.stack[this.step];
    }
    return null;
  }

  redo(): string | null {
    if (this.step < this.stack.length - 1) {
      this.step++;
      return this.stack[this.step];
    }
    return null;
  }

  goTo(index: number): string | null {
    if (index >= 0 && index < this.stack.length) {
      this.step = index;
      return this.stack[index];
    }
    return null;
  }

  canUndo(): boolean {
    return this.step > 0;
  }

  canRedo(): boolean {
    return this.step < this.stack.length - 1;
  }

  getEntries(): HistoryEntry[] {
    return this.entries;
  }

  getCurrentStep(): number {
    return this.step;
  }
}
