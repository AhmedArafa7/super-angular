import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Calculator } from 'lucide-angular';
import { CalculatorMode, CalculationHistory } from './models/calculator.models';
import { MathEngineService } from './services/math-engine.service';
import { CalculatorHistoryService } from './services/calculator-history.service';
import { StandardPadComponent } from './components/standard-pad/standard-pad.component';
import { ScientificPadComponent } from './components/scientific-pad/scientific-pad.component';
import { MatrixPadComponent } from './components/matrix-pad/matrix-pad.component';
import { HistoryPadComponent } from './components/history-pad/history-pad.component';

@Component({
  selector: 'app-calculator',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    StandardPadComponent,
    ScientificPadComponent,
    MatrixPadComponent,
    HistoryPadComponent
  ],
  templateUrl: './calculator.component.html',
  styleUrls: ['./calculator.component.scss']
})
export class CalculatorComponent {
  mathEngine = inject(MathEngineService);
  historySvc = inject(CalculatorHistoryService);

  Calculator = Calculator;

  mode = signal<CalculatorMode>('standard');
  expression = signal<string>('');
  result = signal<string>('0');
  angleMode = signal<'deg' | 'rad'>('deg');

  toggleAngleMode() {
    this.angleMode.update(m => m === 'deg' ? 'rad' : 'deg');
  }

  onPadAction(val: string) {
    const cur = this.expression();

    if (val === 'C') {
      this.expression.set('');
      this.result.set('0');
      return;
    }

    if (val === 'DEL') {
      if (cur.length > 0) {
        this.expression.set(cur.slice(0, -1));
      }
      return;
    }

    if (val === '=') {
      const res = this.mathEngine.evaluate(cur, this.angleMode());
      this.result.set(res);
      this.historySvc.addRecord(cur, res, this.mode());
      return;
    }

    this.expression.set(cur + val);
  }

  recallHistory(item: CalculationHistory) {
    this.expression.set(item.expression);
    this.result.set(item.result);
    this.mode.set(item.mode === 'matrix' ? 'standard' : item.mode);
  }
}
