import { Injectable, signal } from '@angular/core';
import { CalculationHistory, CalculatorMode } from '../models/calculator.models';

@Injectable({
  providedIn: 'root'
})
export class CalculatorHistoryService {
  private readonly STORAGE_KEY = 'super_calculator_history_v1';
  
  history = signal<CalculationHistory[]>(this.loadHistory());

  private loadHistory(): CalculationHistory[] {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  }

  addRecord(expression: string, result: string, mode: CalculatorMode) {
    if (!expression || !result || result === 'Error' || result === 'خطأ في التعبير') return;
    const item: CalculationHistory = {
      id: 'calc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
      expression,
      result,
      timestamp: Date.now(),
      mode
    };
    const updated = [item, ...this.history()].slice(0, 100); // Keep last 100
    this.history.set(updated);
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {}
  }

  clearHistory() {
    this.history.set([]);
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (e) {}
  }
}
