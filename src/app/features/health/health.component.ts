import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';

@Component({
  selector: 'app-health',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideDynamicIcon],
  templateUrl: './health.component.html',
  styleUrls: ['./health.component.scss']
})
export class HealthComponent {
  Math = Math;
  // BMI State
  weight = '';
  height = '';
  bmi: number | null = null;

  // Water State
  waterGlasses = 0;
  waterGoal = 8;

  // Timer State
  workTime = 30;
  restTime = 10;
  timeLeft = 30;
  isActive = false;
  isWorkPeriod = true;

  // Health Tips
  healthTips = [
    "شرب الماء بانتظام يحسن التركيز ويقلل الصداع.",
    "المشي لمدة 30 دقيقة يومياً يقلل من مخاطر أمراض القلب.",
    "النوم الكافي (7-9 ساعات) ضروري جداً لتعافي العضلات.",
    "تناول الخضروات الورقية يحسن من جودة هضمك وطاقتك.",
    "تمارين الإطالة تساعد في تقليل التوتر العضلي الناتج عن الجلوس الطويل."
  ];
  currentTip = this.healthTips[0];

  constructor() {
    // Random tip on init
    this.currentTip = this.healthTips[Math.floor(Math.random() * this.healthTips.length)];
  }

  // BMI Logic
  calculateBmi() {
    const w = parseFloat(this.weight);
    const h = parseFloat(this.height) / 100;
    if (w > 0 && h > 0) {
      this.bmi = parseFloat((w / (h * h)).toFixed(1));
    }
  }

  getBmiCategory(val: number) {
    if (val < 18.5) return { label: 'نقص وزن', color: 'text-blue-400' };
    if (val < 25) return { label: 'وزن مثالي', color: 'text-green-400' };
    if (val < 30) return { label: 'زيادة وزن', color: 'text-amber-400' };
    return { label: 'سمنة مفرطة', color: 'text-red-400' };
  }

  // Timer Logic
  private interval: any;

  ngOnInit() {
    // Already set currentTip in constructor
  }

  ngOnDestroy() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  startTimer() {
    this.interval = setInterval(() => {
      if (this.isActive && this.timeLeft > 0) {
        this.timeLeft--;
      } else if (this.isActive && this.timeLeft === 0) {
        // Toggle periods
        this.isWorkPeriod = !this.isWorkPeriod;
        this.timeLeft = this.isWorkPeriod ? this.workTime : this.restTime;
      }
    }, 1000);
  }

  toggleTimer() {
    this.isActive = !this.isActive;
    if (this.isActive) {
      this.startTimer();
    } else {
      if (this.interval) {
        clearInterval(this.interval);
      }
    }
  }

  resetTimer() {
    this.isActive = false;
    this.isWorkPeriod = true;
    this.timeLeft = this.workTime;
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  // Water methods
  decreaseWater() {
    if (this.waterGlasses > 0) {
      this.waterGlasses--;
    }
  }

  increaseWater() {
    this.waterGlasses++;
  }
}