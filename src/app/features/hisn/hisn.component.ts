import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { HISN_DATA, NAMES_OF_ALLAH, HisnCategory, ZikrItem, AllahName } from './hisn.model';
import { HisnService } from '../../core/services/hisn.service';

@Component({
  selector: 'app-hisn',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideDynamicIcon],
  templateUrl: './hisn.component.html',
  styleUrls: ['./hisn.component.scss']
})
export class HisnComponent {
  Math = Math;
  private hisnService = inject(HisnService);

  // View tabs state
  activeTab: 'quran' | 'prayer' | 'azkar' | 'names' | 'tasbih' | 'manager' = 'quran';

  // Wird / Quran states
  wird = this.hisnService.wird;
  quranProgress = this.hisnService.quranProgress;

  // Azkar States
  categories = HISN_DATA;
  selectedCategory: HisnCategory | null = null;
  counts: Record<number, number> = {};
  fontSize = 24;

  // Names of Allah States
  namesOfAllah = NAMES_OF_ALLAH;

  // Tasbih States
  tasbihCount = 0;
  tasbihTarget = 33;
  showToast = false;
  toastMessage = '';

  startWird(wirdId: string) {
    this.hisnService.updateWird(wirdId, 0);
  }

  updateProgress(wirdId: string, currentProgress: number, target: number) {
    if (currentProgress < target) {
      this.hisnService.updateWird(wirdId, currentProgress + 1);
    }
  }



  // Select/Deselect category
  selectCategory(cat: HisnCategory | null): void {
    this.selectedCategory = cat;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.isSpeaking = {};
  }

  isSpeaking: Record<number, boolean> = {};

  speakZikr(item: ZikrItem): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (this.isSpeaking[item.id]) {
      window.speechSynthesis.cancel();
      this.isSpeaking[item.id] = false;
      return;
    }

    window.speechSynthesis.cancel();
    Object.keys(this.isSpeaking).forEach(k => this.isSpeaking[+k] = false);

    const cleanText = item.text.replace(/\(.*\)/g, '').trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'ar-EG';
    utterance.rate = 0.85;

    utterance.onend = () => {
      this.isSpeaking[item.id] = false;
    };
    utterance.onerror = () => {
      this.isSpeaking[item.id] = false;
    };

    this.isSpeaking[item.id] = true;
    window.speechSynthesis.speak(utterance);
  }

  // Zikr counter logic
  incrementZikr(item: ZikrItem): void {
    const current = this.counts[item.id] || 0;
    if (current < item.count) {
      const next = current + 1;
      this.counts[item.id] = next;
      this.triggerVibration(10);
      
      if (next === item.count) {
        this.playChimeSound();
        this.triggerToast("اكتمل الذكر", `لقد أتممت قراءة الذكر ${item.count} مرة بنجاح.`);
      }
    }
  }

  resetZikr(item: ZikrItem): void {
    this.counts[item.id] = 0;
  }

  resetAllSelectedZikr(): void {
    if (!this.selectedCategory) return;
    for (const item of this.selectedCategory.items) {
      this.counts[item.id] = 0;
    }
    this.triggerToast("إعادة ضبط", "تم تصفير جميع عدادات القسم الحالي.");
  }

  getCategoryProgress(): number {
    if (!this.selectedCategory) return 0;
    const items = this.selectedCategory.items;
    if (items.length === 0) return 0;

    let completed = 0;
    for (const item of items) {
      if ((this.counts[item.id] || 0) >= item.count) {
        completed++;
      }
    }
    return Math.round((completed / items.length) * 100);
  }

  // Tasbih counter logic
  incrementTasbih(): void {
    this.tasbihCount++;
    this.triggerVibration(20);
    if (this.tasbihCount % this.tasbihTarget === 0) {
      this.playChimeSound();
      this.triggerToast("اكتملت الدورة", `لقد أتممت ${this.tasbihTarget} تسبيحة بنجاح.`);
    }
  }

  setTasbihTarget(val: number): void {
    this.tasbihTarget = val;
  }

  resetTasbih(): void {
    this.tasbihCount = 0;
  }

  // Font size adjustment for readability
  increaseFontSize(): void {
    if (this.fontSize < 36) this.fontSize += 2;
  }

  decreaseFontSize(): void {
    if (this.fontSize > 18) this.fontSize -= 2;
  }

  // Play satisfying chime synthesizer natively via Web Audio API
  private playChimeSound(): void {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
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

  // Support for physical vibration on mobile devices
  private triggerVibration(ms: number): void {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(ms);
    }
  }

  // Custom micro-toast system
  private triggerToast(title: string, desc: string): void {
    this.toastMessage = `${title}: ${desc}`;
    this.showToast = true;
    setTimeout(() => {
      this.showToast = false;
    }, 4000);
  }
}
