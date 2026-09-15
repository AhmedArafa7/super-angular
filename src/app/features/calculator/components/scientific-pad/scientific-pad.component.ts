import { Component, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-scientific-pad',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="grid grid-cols-5 gap-2">
      <button (click)="btnClick('sin(')" class="p-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl font-bold text-xs transition">sin</button>
      <button (click)="btnClick('cos(')" class="p-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl font-bold text-xs transition">cos</button>
      <button (click)="btnClick('tan(')" class="p-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl font-bold text-xs transition">tan</button>
      <button (click)="btnClick('asin(')" class="p-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl font-bold text-xs transition">asin</button>
      <button (click)="btnClick('acos(')" class="p-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl font-bold text-xs transition">acos</button>

      <button (click)="btnClick('log(')" class="p-2.5 bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/30 rounded-xl font-bold text-xs transition">log</button>
      <button (click)="btnClick('ln(')" class="p-2.5 bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/30 rounded-xl font-bold text-xs transition">ln</button>
      <button (click)="btnClick('√(')" class="p-2.5 bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/30 rounded-xl font-bold text-xs transition">√</button>
      <button (click)="btnClick('∛(')" class="p-2.5 bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/30 rounded-xl font-bold text-xs transition">∛</button>
      <button (click)="btnClick('^')" class="p-2.5 bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/30 rounded-xl font-bold text-xs transition">x^y</button>

      <button (click)="btnClick('²')" class="p-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold text-xs transition">x²</button>
      <button (click)="btnClick('³')" class="p-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold text-xs transition">x³</button>
      <button (click)="btnClick('π')" class="p-2.5 bg-white/5 hover:bg-white/10 text-amber-300 rounded-xl font-bold text-xs transition">π</button>
      <button (click)="btnClick('e')" class="p-2.5 bg-white/5 hover:bg-white/10 text-amber-300 rounded-xl font-bold text-xs transition">e</button>
      <button (click)="btnClick('!')" class="p-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold text-xs transition">n!</button>

      <button (click)="btnClick('(')" class="p-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold text-xs transition">(</button>
      <button (click)="btnClick(')')" class="p-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold text-xs transition">)</button>
      <button (click)="btnClick('abs(')" class="p-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold text-xs transition">|x|</button>
      <button (click)="btnClick('.')" class="p-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold text-xs transition">.</button>
      <button (click)="btnClick('C')" class="p-2.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-xl font-bold text-xs transition">AC</button>
    </div>
  `
})
export class ScientificPadComponent {
  action = output<string>();

  btnClick(val: string) {
    this.action.emit(val);
  }
}
