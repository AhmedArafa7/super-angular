import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalculatorHistoryService } from '../../services/calculator-history.service';
import { CalculationHistory } from '../../models/calculator.models';

@Component({
  selector: 'app-history-pad',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex-1 flex flex-col overflow-hidden space-y-2">
      <div class="flex items-center justify-between shrink-0 pb-2 border-b border-white/10">
        <span class="text-xs font-bold text-slate-300">سجل العمليات الحسابية</span>
        <button (click)="historySvc.clearHistory()" class="text-[11px] text-red-400 hover:text-red-300 font-bold">مسح السجل 🗑️</button>
      </div>

      <div class="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
        @if (historySvc.history().length > 0) {
          @for (item of historySvc.history(); track item.id) {
            <div (click)="selectItem.emit(item)" class="p-3 bg-black/30 hover:bg-black/50 border border-white/5 hover:border-teal-500/40 rounded-2xl cursor-pointer transition flex items-center justify-between group">
              <div class="flex flex-col gap-0.5">
                <span class="text-[11px] text-slate-400 font-mono">{{ item.expression }}</span>
                <span class="text-xs font-bold text-teal-300 font-mono">= {{ item.result }}</span>
              </div>
              <span class="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-slate-500 font-mono uppercase">{{ item.mode }}</span>
            </div>
          }
        } @else {
          <div class="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <p class="text-xs font-bold text-slate-400">لا يوجد سجل عمليات</p>
          </div>
        }
      </div>
    </div>
  `
})
export class HistoryPadComponent {
  historySvc = inject(CalculatorHistoryService);
  selectItem = output<CalculationHistory>();
}
