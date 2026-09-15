import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatrixCalculatorService } from '../../services/matrix.service';
import { MatrixData } from '../../models/calculator.models';

@Component({
  selector: 'app-matrix-pad',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-col gap-4 text-xs">
      <div class="flex items-center justify-between bg-black/40 p-3 rounded-2xl border border-white/10">
        <span class="font-bold text-teal-300">مصفوفة أ (Matrix A)</span>
        <div class="flex items-center gap-2">
          <span>أبعاد:</span>
          <select [(ngModel)]="rowsA" (change)="initMatrixA()" class="bg-black/60 border border-white/15 rounded-lg px-2 py-1 text-white">
            <option [value]="2">2×2</option>
            <option [value]="3">3×3</option>
          </select>
          <span>×</span>
          <select [(ngModel)]="colsA" (change)="initMatrixA()" class="bg-black/60 border border-white/15 rounded-lg px-2 py-1 text-white">
            <option [value]="2">2×2</option>
            <option [value]="3">3×3</option>
          </select>
        </div>
      </div>

      <!-- Matrix A Inputs -->
      <div class="grid gap-2 p-3 bg-black/30 rounded-2xl border border-white/5" [style.grid-template-columns]="'repeat(' + colsA + ', minmax(0, 1fr))'">
        @for (row of matrixA.data; track $index; let i = $index) {
          @for (val of row; track $index; let j = $index) {
            <input type="number" [(ngModel)]="matrixA.data[i][j]" class="bg-black/60 border border-white/15 rounded-xl p-2 text-center text-white font-mono" />
          }
        }
      </div>

      <!-- Operations -->
      <div class="flex flex-wrap gap-2">
        <button (click)="calcDet()" class="px-3 py-2 bg-teal-600/30 hover:bg-teal-600/40 text-teal-300 border border-teal-500/30 rounded-xl font-bold transition">المحدد (Det A)</button>
        <button (click)="calcTranspose()" class="px-3 py-2 bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 rounded-xl font-bold transition">المنقول (Transpose A)</button>
      </div>

      <!-- Result Display -->
      @if (resultText()) {
        <div class="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 font-mono text-center">
          {{ resultText() }}
        </div>
      }
    </div>
  `
})
export class MatrixPadComponent {
  matrixSvc = inject(MatrixCalculatorService);

  rowsA = 2;
  colsA = 2;
  matrixA: MatrixData = this.matrixSvc.createMatrix(2, 2);

  resultText = signal<string | null>(null);

  initMatrixA() {
    this.matrixA = this.matrixSvc.createMatrix(this.rowsA, this.colsA);
    this.resultText.set(null);
  }

  calcDet() {
    const det = this.matrixSvc.determinant(this.matrixA);
    if (det !== null) {
      this.resultText.set(`Det(A) = ${det}`);
    } else {
      this.resultText.set('المحدد غير مدعوم لهذا الحجم');
    }
  }

  calcTranspose() {
    const t = this.matrixSvc.transpose(this.matrixA);
    this.matrixA = t;
    this.rowsA = t.rows;
    this.colsA = t.cols;
    this.resultText.set('تم حساب المنقول بنجاح');
  }
}
