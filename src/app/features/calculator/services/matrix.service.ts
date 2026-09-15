import { Injectable } from '@angular/core';
import { MatrixData } from '../models/calculator.models';

@Injectable({
  providedIn: 'root'
})
export class MatrixCalculatorService {

  createMatrix(rows: number, cols: number, initialVal = 0): MatrixData {
    const data: number[][] = [];
    for (let i = 0; i < rows; i++) {
      const row: number[] = [];
      for (let j = 0; j < cols; j++) {
        row.push(initialVal);
      }
      data.push(row);
    }
    return { rows, cols, data };
  }

  add(a: MatrixData, b: MatrixData): MatrixData | null {
    if (a.rows !== b.rows || a.cols !== b.cols) return null;
    const res = this.createMatrix(a.rows, a.cols);
    for (let i = 0; i < a.rows; i++) {
      for (let j = 0; j < a.cols; j++) {
        res.data[i][j] = a.data[i][j] + b.data[i][j];
      }
    }
    return res;
  }

  subtract(a: MatrixData, b: MatrixData): MatrixData | null {
    if (a.rows !== b.rows || a.cols !== b.cols) return null;
    const res = this.createMatrix(a.rows, a.cols);
    for (let i = 0; i < a.rows; i++) {
      for (let j = 0; j < a.cols; j++) {
        res.data[i][j] = a.data[i][j] - b.data[i][j];
      }
    }
    return res;
  }

  multiply(a: MatrixData, b: MatrixData): MatrixData | null {
    if (a.cols !== b.rows) return null;
    const res = this.createMatrix(a.rows, b.cols);
    for (let i = 0; i < a.rows; i++) {
      for (let j = 0; j < b.cols; j++) {
        let sum = 0;
        for (let k = 0; k < a.cols; k++) {
          sum += a.data[i][k] * b.data[k][j];
        }
        res.data[i][j] = sum;
      }
    }
    return res;
  }

  transpose(m: MatrixData): MatrixData {
    const res = this.createMatrix(m.cols, m.rows);
    for (let i = 0; i < m.rows; i++) {
      for (let j = 0; j < m.cols; j++) {
        res.data[j][i] = m.data[i][j];
      }
    }
    return res;
  }

  determinant(m: MatrixData): number | null {
    if (m.rows !== m.cols) return null;
    const n = m.rows;
    if (n === 1) return m.data[0][0];
    if (n === 2) {
      return m.data[0][0] * m.data[1][1] - m.data[0][1] * m.data[1][0];
    }
    if (n === 3) {
      const a = m.data;
      return a[0][0] * (a[1][1] * a[2][2] - a[1][2] * a[2][1]) -
             a[0][1] * (a[1][0] * a[2][2] - a[1][2] * a[2][0]) +
             a[0][2] * (a[1][0] * a[2][1] - a[1][1] * a[2][0]);
    }
    return null; // Higher order det can be added if needed
  }
}
