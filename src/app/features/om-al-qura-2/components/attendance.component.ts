import { Component, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { OmAlQura2Service } from '../../../core/services/om-al-qura-2.service';

@Component({
  selector: 'app-om-al-qura-2-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideDynamicIcon],
  template: `
    <div class="space-y-6 font-sans" dir="rtl">
      <!-- Attendance Hero Header -->
      <div class="bg-gradient-to-br from-amber-700 via-orange-800 to-amber-900 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-amber-400/20">
        <div class="flex flex-col md:flex-row items-center justify-between gap-6">
          <div class="flex items-center gap-4">
            <div class="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-lg">
              <svg lucideIcon="clock" class="w-9 h-9 text-white"></svg>
            </div>
            <div>
              <h2 class="text-2xl md:text-3xl font-black text-white flex items-center gap-2">
                <span>تسجيل الحضور والانصراف</span>
              </h2>
              <p class="text-amber-100 text-sm mt-1">اضغط على اسمك ثم أدخل كود اليوم من المدير لتثبيت وجودك في المصنع</p>
            </div>
          </div>
          <div class="text-center bg-black/20 border border-white/20 rounded-2xl px-6 py-4 backdrop-blur-md">
            <p class="text-[10px] text-amber-100 uppercase tracking-widest font-bold">التوقيت الآني</p>
            <p class="text-2xl font-black font-mono tabular-nums">{{ nowLabel }}</p>
          </div>
        </div>
      </div>

      <!-- Employees Grid -->
      <div *ngIf="service.employees().length > 0; else noEmployees" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <div *ngFor="let emp of service.employees()" class="p-5 rounded-3xl border-2 transition-all cursor-pointer"
             [ngClass]="emp.isSuspended
                        ? 'bg-rose-50 border-rose-200 opacity-60'
                        : (emp.shiftStatus === 'clocked_in'
                            ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-400 shadow-lg shadow-amber-500/10'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-400')"
             (click)="emp.isSuspended ? null : openAttendanceModal(emp.id)">
          <div class="flex items-center justify-between mb-4">
            <span class="font-black text-slate-900 dark:text-white text-lg">{{ emp.name }}</span>
            <span class="px-2.5 py-1 rounded-full text-xs font-bold"
                  [ngClass]="emp.shiftStatus === 'clocked_in' ? 'bg-emerald-600 text-white' : 'bg-slate-400 text-white'">
              {{ emp.shiftStatus === 'clocked_in' ? 'حاضر ✔' : 'منصرف' }}
            </span>
          </div>
          <div class="text-xs text-slate-500 mb-4">الوظيفة: {{ emp.role }}</div>

          <div *ngIf="emp.shiftStatus === 'clocked_in'" class="text-center py-2 rounded-2xl bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-bold">
            سجّلت حضورك اليوم — اضغط لتسجيل الانصراف
          </div>
          <div *ngIf="emp.shiftStatus !== 'clocked_in' && !emp.isSuspended" class="w-full py-3 rounded-2xl bg-amber-600 text-white text-sm font-black text-center">
            تسجيل حضور ➜
          </div>
          <div *ngIf="emp.isSuspended" class="text-xs font-bold text-rose-600 text-center py-2">
            حسابك موقوف
          </div>
        </div>
      </div>

      <ng-template #noEmployees>
        <div class="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
          <div class="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mx-auto mb-3">
            <svg lucideIcon="users" class="w-8 h-8"></svg>
          </div>
          <p class="text-slate-500 text-sm">لا يوجد عمال مسجلون حالياً. يرجى توظيف عمال من قسم إدارة المصنع.</p>
        </div>
      </ng-template>

      <!-- Today's Attendance Log -->
      <div *ngIf="service.attendanceLogs().length > 0" class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 class="text-lg font-black text-slate-900 dark:text-white mb-4">سجل الحضور اليوم</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-sm text-right">
            <thead class="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
              <tr>
                <th class="p-3 rounded-r-xl">الموظف</th>
                <th class="p-3">الحركة</th>
                <th class="p-3 rounded-l-xl">الوقت</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              <tr *ngFor="let log of service.attendanceLogs()">
                <td class="p-3 font-bold text-slate-900 dark:text-white">{{ log.employeeName }}</td>
                <td class="p-3">
                  <span class="px-2 py-0.5 rounded-full text-xs font-bold"
                        [ngClass]="log.type === 'in' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'">
                    {{ log.type === 'in' ? 'حضور' : 'انصراف' }}
                  </span>
                </td>
                <td class="p-3 font-mono dir-ltr text-right text-slate-600">{{ log.time }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Daily Code Modal -->
      <div *ngIf="showModal()" class="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6 font-sans">
          <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <svg lucideIcon="shield-check" class="w-6 h-6"></svg>
              </div>
              <div>
                <h3 class="text-lg font-black text-slate-900 dark:text-white">{{ selectedActionStr() }}</h3>
                <p class="text-xs text-slate-500">أدخل الكود المتغير لتأكيد وجودك في المصنع</p>
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
                   class="w-32 mx-auto text-center text-2xl font-black tracking-[0.3em] px-4 py-3 rounded-2xl border-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                   [ngClass]="codeError() ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'">
            <div *ngIf="codeError()" class="mt-2 text-xs font-bold text-rose-600">
              الكود غير صحيح أو انتهت صلاحيته! يرجى طلب الكود الحالي من المدير
            </div>
          </div>

          <div class="flex gap-3">
            <button (click)="confirm()" type="button"
                    class="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-2xl text-sm shadow-md transition-all cursor-pointer">
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
export class OmAlQura2AttendanceComponent {
  service = inject(OmAlQura2Service);

  showModal = signal(false);
  codeInput = '';
  selectedEmployeeId: string | null = null;
  selectedAction: 'in' | 'out' = 'in';
  codeError = signal(false);
  nowLabel = '';

  private clockTimer: any;

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