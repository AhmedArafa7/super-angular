import { Injectable, signal, computed } from '@angular/core';

export interface WirdItem {
  id: string;
  name: string;
  target: number;
  progress: number;
  lastUpdated: number;
}

@Injectable({ providedIn: 'root' })
export class HisnService {
  // Wird state
  wird = signal<WirdItem[]>([]);
  quranProgress = signal<{ suraId: number; verseId: number; lastUpdated: number } | null>(null);
  
  // Tasbih persistent state (localStorage only)
  tasbihCount = signal(0);
  tasbihTarget = signal(33);
  tasbihTotal = signal(0);
  tasbihCompletedCycles = signal(0);
  tasbihSessionCount = signal(0);

  // Audio context for chime sound
  private audioContext: AudioContext | null = null;

  constructor() {
    this.loadFromLocalStorage();
  }

  private loadFromLocalStorage() {
    if (typeof window === 'undefined') return;
    
    // Load tasbih data
    const tasbihStored = localStorage.getItem('tasbih_data');
    if (tasbihStored) {
      try {
        const data = JSON.parse(tasbihStored);
        this.tasbihTotal.set(data.totalCount || 0);
        this.tasbihCompletedCycles.set(data.completedCycles || 0);
        this.tasbihSessionCount.set(data.sessionCount || 0);
      } catch {}
    }
    
    // Load wird data
    const wirdStored = localStorage.getItem('wird_data');
    if (wirdStored) {
      try {
        this.wird.set(JSON.parse(wirdStored));
      } catch {}
    }
  }

  // Wird methods (localStorage only)
  async updateWird(wirdId: string, progress: number) {
    const current = this.wird();
    const exists = current.find(w => w.id === wirdId);
    let updated: WirdItem[];
    
    if (exists) {
      updated = current.map(w => w.id === wirdId ? { ...w, progress, lastUpdated: Date.now() } : w);
    } else {
      updated = [...current, { id: wirdId, name: 'ورد مخصص', target: 100, progress, lastUpdated: Date.now() }];
    }
    
    this.wird.set(updated);
    localStorage.setItem('wird_data', JSON.stringify(updated));
  }

  async addWird(name: string, target: number) {
    const newWird: WirdItem = {
      id: `wird-${Date.now()}`,
      name,
      target,
      progress: 0,
      lastUpdated: Date.now()
    };
    
    const updated = [...this.wird(), newWird];
    this.wird.set(updated);
    localStorage.setItem('wird_data', JSON.stringify(updated));
  }

  async deleteWird(wirdId: string) {
    const updated = this.wird().filter(w => w.id !== wirdId);
    this.wird.set(updated);
    localStorage.setItem('wird_data', JSON.stringify(updated));
  }

  // Tasbih methods with localStorage persistence
  incrementTasbih() {
    const nextCount = this.tasbihCount() + 1;
    const target = this.tasbihTarget();
    
    this.tasbihCount.set(nextCount);
    this.tasbihTotal.set(this.tasbihTotal() + 1);
    this.tasbihSessionCount.set(this.tasbihSessionCount() + 1);
    this.triggerVibration(20);
    
    if (nextCount % target === 0) {
      this.playChimeSound();
      this.triggerVibration(100);
      this.tasbihCompletedCycles.set(this.tasbihCompletedCycles() + 1);
      this.saveTasbihData();
      this.showToast(`اكتملت الدورة! لقد أتممت ${target} تسبيحة بنجاح.`);
    }
    this.saveTasbihData();
  }

  setTasbihTarget(val: number) {
    this.tasbihTarget.set(val);
    this.tasbihCount.set(0);
  }

  resetTasbih() {
    this.tasbihCount.set(0);
    this.tasbihSessionCount.set(0);
    this.triggerVibration(30);
  }

  private saveTasbihData() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tasbih_data', JSON.stringify({
        totalCount: this.tasbihTotal(),
        completedCycles: this.tasbihCompletedCycles(),
        sessionCount: this.tasbihSessionCount()
      }));
    }
  }

  // Audio & Vibration utilities
  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  playChimeSound() {
    try {
      const ctx = this.getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {}
  }

  triggerVibration(ms: number) {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(ms);
    }
  }

  // TTS for Azkar
  speakZikr(text: string) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/\(.*\)/g, '').trim();
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'ar-EG';
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  }

  // Toast system
  private toastTimeout: any;
  showToast(message: string) {
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    window.dispatchEvent(new CustomEvent('hisn-toast', { detail: message }));
  }
}