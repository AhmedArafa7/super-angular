import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { HISN_DATA, NAMES_OF_ALLAH, HisnCategory, ZikrItem, AllahName } from './hisn.model';

@Component({
  selector: 'app-hisn',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideDynamicIcon],
  templateUrl: './hisn.component.html',
  styleUrls: ['./hisn.component.scss']
})
export class HisnComponent {
  Math = Math;

  // View tabs state
  activeTab: 'azkar' | 'names' | 'tasbih' = 'azkar';

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

  // Select/Deselect category
  selectCategory(cat: HisnCategory | null): void {
    this.selectedCategory = cat;
  }

  // Zikr counter logic
  incrementZikr(item: ZikrItem): void {
    const current = this.counts[item.id] || 0;
    if (current < item.count) {
      this.counts[item.id] = current + 1;
      this.triggerVibration(10);
      if (this.counts[item.id] === item.count) {
        this.triggerToast("اكتمل الذكر", `لقد أتممت قراءة الذكر ${item.count} مرة بنجاح.`);
      }
    }
  }

  resetZikr(item: ZikrItem): void {
    this.counts[item.id] = 0;
  }

  // Tasbih counter logic
  incrementTasbih(): void {
    this.tasbihCount++;
    this.triggerVibration(20);
    if (this.tasbihCount % this.tasbihTarget === 0) {
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
