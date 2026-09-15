import { Component, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-standard-pad',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="grid grid-cols-4 gap-2.5">
      <button (click)="btnClick('C')" class="p-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 rounded-2xl font-bold text-xs transition">AC</button>
      <button (click)="btnClick('DEL')" class="p-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-2xl font-bold text-xs transition">⌫</button>
      <button (click)="btnClick('%')" class="p-3 bg-white/5 hover:bg-white/10 text-teal-300 border border-white/10 rounded-2xl font-bold text-xs transition">%</button>
      <button (click)="btnClick('/')" class="p-3 bg-teal-600/30 hover:bg-teal-600/40 text-teal-300 border border-teal-500/30 rounded-2xl font-bold text-sm transition">÷</button>

      <button (click)="btnClick('7')" class="p-3.5 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold text-sm transition">7</button>
      <button (click)="btnClick('8')" class="p-3.5 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold text-sm transition">8</button>
      <button (click)="btnClick('9')" class="p-3.5 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold text-sm transition">9</button>
      <button (click)="btnClick('*')" class="p-3.5 bg-teal-600/30 hover:bg-teal-600/40 text-teal-300 border border-teal-500/30 rounded-2xl font-bold text-sm transition">×</button>

      <button (click)="btnClick('4')" class="p-3.5 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold text-sm transition">4</button>
      <button (click)="btnClick('5')" class="p-3.5 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold text-sm transition">5</button>
      <button (click)="btnClick('6')" class="p-3.5 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold text-sm transition">6</button>
      <button (click)="btnClick('-')" class="p-3.5 bg-teal-600/30 hover:bg-teal-600/40 text-teal-300 border border-teal-500/30 rounded-2xl font-bold text-sm transition">-</button>

      <button (click)="btnClick('1')" class="p-3.5 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold text-sm transition">1</button>
      <button (click)="btnClick('2')" class="p-3.5 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold text-sm transition">2</button>
      <button (click)="btnClick('3')" class="p-3.5 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold text-sm transition">3</button>
      <button (click)="btnClick('+')" class="p-3.5 bg-teal-600/30 hover:bg-teal-600/40 text-teal-300 border border-teal-500/30 rounded-2xl font-bold text-sm transition">+</button>

      <button (click)="btnClick('0')" class="col-span-2 p-3.5 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold text-sm transition">0</button>
      <button (click)="btnClick('.')" class="p-3.5 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold text-sm transition">.</button>
      <button (click)="btnClick('=')" class="p-3.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 text-white rounded-2xl font-black text-sm shadow-lg transition">=</button>
    </div>
  `
})
export class StandardPadComponent {
  action = output<string>();

  btnClick(val: string) {
    this.action.emit(val);
  }
}
