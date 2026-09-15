export type CalculatorMode = 'standard' | 'scientific' | 'matrix' | 'history';

export interface CalculationHistory {
  id: string;
  expression: string;
  result: string;
  timestamp: number;
  mode: CalculatorMode;
}

export interface MatrixData {
  rows: number;
  cols: number;
  data: number[][];
}
