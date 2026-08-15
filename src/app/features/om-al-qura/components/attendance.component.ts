import { Component, inject, signal, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { OmAlQuraService } from '../../../core/services/om-al-qura.service';

@Component({
  selector: 'app-om-al-qura-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideDynamicIcon],
  template: `
    <div class="space-y-6 font-sans" dir="rtl">
      <!-- Attendance Hero Header -->
      <div class="bg-gradient-to-br from-emerald-700 via-teal-700 to-emerald-800 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-emerald-400/20">
        <div class="flex flex-col md:flex-row items-center justify-between gap-6">
          <div class="flex items-center gap-4">
            <div class="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-lg">
              <svg lucideIcon="clock" class="w-9 h-9 text-white"></svg>
            </div>
            <div>
              <h2 class="text-2xl md:text-3xl font-black text-white flex items-center gap-2">
                <span>تسجيل الحضور والانصراف</span>
              </h2>
              <p class="text-emerald-100 text-sm mt-1">اضغط على اسمك ثم أدخل كود اليوم من المدير لتثبيت وجودك في المتجر</p>
            </div>
          </div>

          <div class="text-left bg-black/20 rounded-2xl px-6 py-3 border border-white/10 backdrop-blur-md">
            <div class="text-xs text-emerald-200 font-bold uppercase tracking-wider">الوقت الحالي</div>
            <div class="text-2xl font-black font-mono text-amber-300 mt-0.5" dir="ltr">{{ nowLabel }}</div>
          </div>
        </div>
      </div>

      <!-- Employees Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div *ngFor="let emp of service.employees()"
             (click)="openAttendanceModal(emp.id)"
             class="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden">
          
          <div class="flex items-center justify-between mb-3">
            <span class="px-3 py-1 rounded-full text-xs font-black"
                  [ngClass]="emp.shiftStatus === 'clocked_in' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'">
              {{ emp.shiftStatus === 'clocked_in' ? 'حاضر الآن' : 'غير حاضر' }}
            </span>
            <span class="text-xs font-bold text-slate-400">{{ emp.role }}</span>
          </div>

          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-lg border border-emerald-200 dark:border-emerald-800/50">
              {{ emp.name.charAt(0) }}
            </div>
            <div>
              <h3 class="font-black text-slate-900 dark:text-white text-base group-hover:text-emerald-600 transition-colors">{{ emp.name }}</h3>
              <p class="text-xs text-slate-500 mt-0.5" *ngIf="emp.lastClockIn">آخر حضور: {{ emp.lastClockIn }}</p>
            </div>
          </div>

          <button class="w-full mt-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                  [ngClass]="emp.shiftStatus === 'clocked_in' ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 hover:bg-rose-100' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'">
            <svg lucideIcon="log-in" class="w-4 h-4" *ngIf="emp.shiftStatus !== 'clocked_in'"></svg>
            <svg lucideIcon="log-out" class="w-4 h-4" *ngIf="emp.shiftStatus === 'clocked_in'"></svg>
            <span>{{ emp.shiftStatus === 'clocked_in' ? 'تسجيل انصراف' : 'تسجيل حضور' }}</span>
          </button>
        </div>
      </div>

      <!-- Logs History Table -->
      <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 class="text-lg font-black text-slate-900 dark:text-white mb-4">سجل الحضور اليوم</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-sm text-right text-slate-600 dark:text-slate-300">
            <thead class="text-xs text-slate-400 uppercase bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th class="p-3 font-bold">الموظف</th>
                <th class="p-3 font-bold">النوع</th>
                <th class="p-3 font-bold">الوقت</th>
                <th class="p-3 font-bold">التاريخ</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              <tr *ngFor="let log of service.attendanceLogs()">
                <td class="p-3 font-bold text-slate-900 dark:text-white">{{ log.employeeName }}</td>
                <td class="p-3">
                  <span class="px-2.5 py-1 rounded-full text-xs font-black"
                        [ngClass]="log.type === 'in' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'">
                    {{ log.type === 'in' ? 'حضور' : 'انصراف' }}
                  </span>
                </td>
                <td class="p-3 font-mono text-xs" dir="ltr">{{ log.time }}</td>
                <td class="p-3 text-xs text-slate-400">{{ log.date }}</td>
              </tr>
              <tr *ngIf="service.attendanceLogs().length === 0">
                <td colspan="4" class="p-6 text-center text-slate-400">لا توجد سجلات حضور حتى الآن اليوم</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Attendance Code Modal -->
      <div *ngIf="showModal()" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6 animate-in fade-in zoom-in duration-200">
          
          <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <svg lucideIcon="shield-check" class="w-6 h-6"></svg>
              </div>
              <div>
                <h3 class="text-lg font-black text-slate-900 dark:text-white">{{ selectedActionStr() }}</h3>
                <p class="text-xs text-slate-500">أدخل الكود المتغير لتأكيد وجودك في المتجر</p>
              </div>
            </div>
            <button (click)="closeModal()" aria-label="إغلاق النافذة" title="إغلاق" class="text-slate-400 hover:text-slate-600 p-2 rounded-xl">
              <svg lucideIcon="x" class="w-6 h-6"></svg>
            </button>
          </div>

          <div class="text-center">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">كود الحضور (يتغير كل 5 دقائق من المدير)</label>
            <input #codeInputField type="text" [(ngModel)]="codeInput" name="attendanceCode" inputmode="numeric" maxlength="4" dir="ltr"
                   placeholder="0000" autofocus
                   (keyup.enter)="confirm()"
                   class="w-32 mx-auto text-center text-2xl font-black tracking-[0.3em] px-4 py-3 rounded-2xl border-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                   [ngClass]="codeError() ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'">
            <div *ngIf="codeError()" class="mt-2 text-xs font-bold text-rose-600">
              الكود غير صحيح أو انتهت صلاحيته! يرجى طلب الكود الحالي من المدير
            </div>
          </div>

          <div class="flex gap-3">
            <button (click)="confirm()" type="button"
                    class="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-sm shadow-md transition-all cursor-pointer">
              {{ selectedAction === 'in' ? 'تأكيد الحضور' : 'تأكيد الانصراف' }}
            </button>
            <button (click)="closeModal()" type="button"
                    class="px-5 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-2xl text-sm transition-all cursor-pointer">
              إلغاء
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class OmAlQuraAttendanceComponent implements OnDestroy {
  service = inject(OmAlQuraService);

  showModal = signal(false);
  codeInput = '';
  selectedEmployeeId: string | null = null;
  selectedAction: 'in' | 'out' = 'in';
  codeError = signal(false);
  nowLabel = '';

  private clockTimer: ReturnType<typeof setInterval> | null = null;

  @ViewChild('codeInputField') set codeInputField(ref: ElementRef<HTMLInputElement>) {
    if (ref) {
      setTimeout(() => ref.nativeElement.focus(), 50);
    }
  }

  constructor() {
    this.updateClock();
    this.clockTimer = setInterval(() => this.updateClock(), 1000);
  }

  ngOnDestroy() {
    if (this.clockTimer) clearInterval(this.clockTimer);
  }

  private updateClock() {
    this.nowLabel = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  selectedActionStr() {
    return this.selectedAction === 'in' ? 'تسجيل حضور' : 'تسجيل انصراف';
  }

  openAttendanceModal(employeeId: string) {
    const emp = this.service.employees().find(e => e.id === employeeId);
    if (!emp) return;
    this.selectedEmployeeId = employeeId;
    this.selectedAction = emp.shiftStatus === 'clocked_in' ? 'out' : 'in';
    this.codeInput = '';
    this.codeError.set(false);
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.selectedEmployeeId = null;
  }

  confirm() {
    if (!this.selectedEmployeeId) return;
    if (!this.service.validateAttendanceCode(this.codeInput)) {
      this.codeError.set(true);
      return;
    }
    if (this.selectedAction === 'in') {
      this.service.clockIn(this.selectedEmployeeId, this.codeInput);
    } else {
      this.service.clockOut(this.selectedEmployeeId, this.codeInput);
    }
    this.closeModal();
  }
}