import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';

export interface BmiRecord {
  id: string;
  date: string;
  weight: number;
  height: number;
  bmi: number;
  category: string;
  colorClass: string;
}

export interface BmiRefRow {
  category: string;
  range: string;
  min: number;
  max: number;
  status: string;
  recommendation: string;
  badgeClass: string;
}

export interface WaterLog {
  id: string;
  time: string;
  amountMl: number;
  glasses: number;
  progressPercent: number;
  note: string;
}

export interface HiitInterval {
  id: string;
  round: number;
  name: string;
  workSec: number;
  restSec: number;
  calories: number;
  status: 'pending' | 'active' | 'completed';
}

export interface HiitRoutine {
  id: string;
  title: string;
  description: string;
  intervals: Omit<HiitInterval, 'id' | 'status'>[];
}

const DEFAULT_HIIT_ROUTINES: HiitRoutine[] = [
  {
    id: 'fat_burn_7min',
    title: '🔥 تحدي 7 دقائق لحرق الدهون',
    description: 'تمارين مكثفة لتنشيط التمثيل الغذائي وحرق السعرات العالية.',
    intervals: [
      { round: 1, name: 'نط الحبل (Jumping Jacks)', workSec: 30, restSec: 10, calories: 12 },
      { round: 2, name: 'القرفصاء السريعة (Bodyweight Squats)', workSec: 30, restSec: 10, calories: 10 },
      { round: 3, name: 'تمارين الضغط (Push-ups)', workSec: 30, restSec: 10, calories: 11 },
      { round: 4, name: 'الجري في المكان (High Knees)', workSec: 30, restSec: 10, calories: 15 },
      { round: 5, name: 'تمرين المتسلق (Mountain Climbers)', workSec: 30, restSec: 10, calories: 14 },
      { round: 6, name: 'تمرين البوربي (Burpees)', workSec: 30, restSec: 15, calories: 18 }
    ]
  },
  {
    id: 'tabata_intense',
    title: '⚡ تمرين تاباتا البروتوكول السريع',
    description: '20 ثانية أقصى مجهود و 10 ثواني راحة لزيادة اللياقة القلبية.',
    intervals: [
      { round: 1, name: 'سرعة البديهة والركض السريع (Sprint High Knees)', workSec: 20, restSec: 10, calories: 15 },
      { round: 2, name: 'قفز القرفصاء (Jump Squats)', workSec: 20, restSec: 10, calories: 16 },
      { round: 3, name: 'الضغط المتفجر (Explosive Push-ups)', workSec: 20, restSec: 10, calories: 14 },
      { round: 4, name: 'تمارين المعدة (Plank Shoulder Taps)', workSec: 20, restSec: 10, calories: 9 }
    ]
  }
];

@Component({
  selector: 'app-health',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideDynamicIcon],
  templateUrl: './health.component.html',
  styleUrls: ['./health.component.scss']
})
export class HealthComponent implements OnInit, OnDestroy {
  Math = Math;

  // --- 1. BMI STATE ---
  weight = '';
  height = '';
  bmi: number | null = null;
  bmiHistory: BmiRecord[] = [];

  bmiReferenceTable: BmiRefRow[] = [
    { category: 'نقص وزن', range: 'أقل من 18.5', min: 0, max: 18.49, status: 'ضعف عام / نقص تغذية', recommendation: 'زيادة السعرات الصحية والبروتين وتناول وجبات مغذية.', badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    { category: 'وزن مثالي', range: '18.5 - 24.9', min: 18.5, max: 24.99, status: 'صحة ممتازة ومثالية ✨', recommendation: 'المحافظة على النمط الغذائي المتوازن والنشاط البدني المنتظم.', badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    { category: 'زيادة وزن', range: '25.0 - 29.9', min: 25, max: 29.99, status: 'خطورة متوسطة / زيادة طفيفة', recommendation: 'تقليل السكريات والكربوهيدرات المكررة وزيادة التمارين.', badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    { category: 'سمنة مفرطة', range: '30.0 أو أكثر', min: 30, max: 999, status: 'خطورة عالية على الصحة العامة', recommendation: 'اتباع برنامج حمية وتدريب مكثف واستشارة أخصائي تغذية.', badgeClass: 'bg-red-500/10 text-red-400 border-red-500/20' }
  ];

  // --- 2. WATER STATE ---
  waterGlasses = 0;
  waterGoal = 10; // 10 glasses = 2500 ml
  waterLogs: WaterLog[] = [];
  selectedWaterNote = 'كوب عادي (250مل)';

  // --- 3. HIIT TIMER & ROUTINE TABLE STATE ---
  routines = DEFAULT_HIIT_ROUTINES;
  selectedRoutineId = 'fat_burn_7min';
  hiitIntervals: HiitInterval[] = [];

  // HIIT Engine Live State
  currentHiitIndex = 0;
  hiitTimeLeft = 30;
  isHiitActive = false;
  isHiitWorkPhase = true;
  totalCaloriesBurned = 0;
  private hiitIntervalTimer: any = null;

  // New Exercise Form
  newExName = '';
  newExWork = 30;
  newExRest = 10;
  newExCalories = 12;
  showAddExForm = false;

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
    this.currentTip = this.healthTips[Math.floor(Math.random() * this.healthTips.length)];
  }

  ngOnInit(): void {
    this.loadAllHealthData();
    this.loadRoutine(this.selectedRoutineId);
  }

  ngOnDestroy(): void {
    this.clearHiitInterval();
  }

  // --- BMI METHODS ---
  calculateBmi(): void {
    const w = parseFloat(this.weight);
    const h = parseFloat(this.height) / 100;
    if (w > 0 && h > 0) {
      this.bmi = parseFloat((w / (h * h)).toFixed(1));
      const catInfo = this.getBmiCategory(this.bmi);
      
      const newRecord: BmiRecord = {
        id: 'bmi_' + Date.now(),
        date: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) + ' - ' + new Date().toLocaleDateString('ar-EG'),
        weight: w,
        height: parseFloat(this.height),
        bmi: this.bmi,
        category: catInfo.label,
        colorClass: catInfo.color
      };

      this.bmiHistory = [newRecord, ...this.bmiHistory];
      this.saveBmiHistory();
    }
  }

  getBmiCategory(val: number) {
    if (val < 18.5) return { label: 'نقص وزن', color: 'text-blue-400', badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
    if (val < 25) return { label: 'وزن مثالي', color: 'text-green-400', badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
    if (val < 30) return { label: 'زيادة وزن', color: 'text-amber-400', badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
    return { label: 'سمنة مفرطة', color: 'text-red-400', badgeClass: 'bg-red-500/10 text-red-400 border-red-500/20' };
  }

  deleteBmiRecord(id: string): void {
    this.bmiHistory = this.bmiHistory.filter(r => r.id !== id);
    this.saveBmiHistory();
  }

  clearBmiHistory(): void {
    this.bmiHistory = [];
    this.saveBmiHistory();
  }

  // --- WATER TRACKER METHODS ---
  addWaterLog(glassesCount: number = 1, amountMl: number = 250, note: string = 'كوب ماء'): void {
    this.waterGlasses += glassesCount;
    const goalPercent = Math.min(100, Math.round((this.waterGlasses / this.waterGoal) * 100));

    const newLog: WaterLog = {
      id: 'w_' + Date.now(),
      time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      amountMl,
      glasses: glassesCount,
      progressPercent: goalPercent,
      note
    };

    this.waterLogs = [newLog, ...this.waterLogs];
    this.saveWaterData();
  }

  decreaseWater(): void {
    if (this.waterGlasses > 0) {
      this.waterGlasses--;
      if (this.waterLogs.length > 0) {
        this.waterLogs.shift();
      }
      this.saveWaterData();
    }
  }

  deleteWaterLog(id: string): void {
    const log = this.waterLogs.find(l => l.id === id);
    if (log) {
      this.waterGlasses = Math.max(0, this.waterGlasses - log.glasses);
      this.waterLogs = this.waterLogs.filter(l => l.id !== id);
      this.saveWaterData();
    }
  }

  resetWater(): void {
    this.waterGlasses = 0;
    this.waterLogs = [];
    this.saveWaterData();
  }

  // --- HIIT WORKOUT & INTERVAL TABLE METHODS ---
  loadRoutine(routineId: string): void {
    this.selectedRoutineId = routineId;
    const routine = this.routines.find(r => r.id === routineId);
    if (routine) {
      this.hiitIntervals = routine.intervals.map((item, idx) => ({
        id: 'hiit_' + idx + '_' + Date.now(),
        ...item,
        status: idx === 0 ? 'pending' : 'pending'
      }));
    }
    this.resetHiitTimer();
  }

  toggleHiitTimer(): void {
    this.isHiitActive = !this.isHiitActive;
    if (this.isHiitActive) {
      this.startHiitEngine();
    } else {
      this.clearHiitInterval();
    }
  }

  resetHiitTimer(): void {
    this.clearHiitInterval();
    this.isHiitActive = false;
    this.currentHiitIndex = 0;
    this.isHiitWorkPhase = true;
    this.totalCaloriesBurned = 0;

    if (this.hiitIntervals.length > 0) {
      this.hiitTimeLeft = this.hiitIntervals[0].workSec;
      this.hiitIntervals = this.hiitIntervals.map((inv, idx) => ({
        ...inv,
        status: idx === 0 ? 'active' : 'pending'
      }));
    }
  }

  addCustomInterval(): void {
    if (!this.newExName.trim()) return;
    const newRoundNum = this.hiitIntervals.length + 1;
    const newInterval: HiitInterval = {
      id: 'custom_hiit_' + Date.now(),
      round: newRoundNum,
      name: this.newExName.trim(),
      workSec: this.newExWork,
      restSec: this.newExRest,
      calories: this.newExCalories,
      status: 'pending'
    };
    this.hiitIntervals.push(newInterval);
    this.newExName = '';
    this.showAddExForm = false;
    this.saveHiitData();
  }

  deleteInterval(id: string): void {
    this.hiitIntervals = this.hiitIntervals.filter(inv => inv.id !== id);
    // Re-index rounds
    this.hiitIntervals = this.hiitIntervals.map((inv, idx) => ({
      ...inv,
      round: idx + 1
    }));
    this.saveHiitData();
  }

  private startHiitEngine(): void {
    this.clearHiitInterval();
    this.hiitIntervalTimer = setInterval(() => {
      if (this.hiitTimeLeft > 0) {
        this.hiitTimeLeft--;
      } else {
        // Interval completed or phase toggles
        if (this.isHiitWorkPhase) {
          // Work phase ended -> Switch to Rest phase
          this.isHiitWorkPhase = false;
          const currentInv = this.hiitIntervals[this.currentHiitIndex];
          if (currentInv) {
            this.totalCaloriesBurned += currentInv.calories;
            this.hiitTimeLeft = currentInv.restSec;
          }
        } else {
          // Rest phase ended -> Move to next round
          const currentInv = this.hiitIntervals[this.currentHiitIndex];
          if (currentInv) {
            currentInv.status = 'completed';
          }

          this.currentHiitIndex++;
          if (this.currentHiitIndex < this.hiitIntervals.length) {
            this.isHiitWorkPhase = true;
            const nextInv = this.hiitIntervals[this.currentHiitIndex];
            nextInv.status = 'active';
            this.hiitTimeLeft = nextInv.workSec;
          } else {
            // Workout completely done!
            this.clearHiitInterval();
            this.isHiitActive = false;
            alert("🔥 أسطوري! تم إكمال جميع جولات التمرين بنجاح. حرق سعرات: " + this.totalCaloriesBurned + " سعرة حرارية!");
          }
        }
      }
    }, 1000);
  }

  private clearHiitInterval(): void {
    if (this.hiitIntervalTimer) {
      clearInterval(this.hiitIntervalTimer);
      this.hiitIntervalTimer = null;
    }
  }

  // --- LOCAL STORAGE PERSISTENCE ---
  private saveBmiHistory(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('Si-Health-BmiHistory', JSON.stringify(this.bmiHistory));
    }
  }

  private saveWaterData(): void {
    if (typeof window !== 'undefined') {
      const data = { waterGlasses: this.waterGlasses, waterLogs: this.waterLogs };
      localStorage.setItem('Si-Health-WaterData', JSON.stringify(data));
    }
  }

  private saveHiitData(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('Si-Health-HiitCustom', JSON.stringify(this.hiitIntervals));
    }
  }

  private loadAllHealthData(): void {
    if (typeof window !== 'undefined') {
      try {
        const bmiSt = localStorage.getItem('Si-Health-BmiHistory');
        if (bmiSt) this.bmiHistory = JSON.parse(bmiSt);

        const waterSt = localStorage.getItem('Si-Health-WaterData');
        if (waterSt) {
          const parsed = JSON.parse(waterSt);
          this.waterGlasses = parsed.waterGlasses || 0;
          this.waterLogs = parsed.waterLogs || [];
        }
      } catch (e) {
        console.error("Error loading health local storage", e);
      }
    }
  }
}