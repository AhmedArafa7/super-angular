import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TextHistoryManager, HistoryEntry } from '../../core/services/text-history.service';
import { HistoryToolbarComponent } from '../../shared/components/history-toolbar/history-toolbar.component';

@Component({
  selector: 'app-text-fixer',
  standalone: true,
  imports: [CommonModule, FormsModule, HistoryToolbarComponent],
  template: `
    <div class="text-fixer-wrapper">
      <div class="container">
        <h2 class="header-title">أداة تصحيح النصوص المدمجة (عربي/إنجليزي)</h2>
        
        <!-- Reusable History Toolbar -->
        <app-history-toolbar
          [canUndo]="historyManager.canUndo()"
          [canRedo]="historyManager.canRedo()"
          [historyCount]="historyManager.getEntries().length"
          (undo)="undo()"
          (redo)="redo()"
          (openHistory)="showHistoryModal = true">
        </app-history-toolbar>

        <textarea 
          [(ngModel)]="inputText"
          (input)="onInput()"
          placeholder="الصق النص هنا لضبط اتجاه الكلمات وعلامات الترقيم تلقائياً..."
        ></textarea>
        
        <div class="output-box" [innerHTML]="outputText"></div>
      </div>
    </div>

    <!-- History Modal / Drawer -->
    @if (showHistoryModal) {
      <div class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-[#161b22] border border-[#30363d] rounded-2xl w-full max-w-lg p-6 shadow-2xl flex flex-col max-h-[80vh]">
          <div class="flex items-center justify-between mb-4 border-b border-[#30363d] pb-3">
            <h3 class="text-lg font-bold text-white flex items-center gap-2">📜 سجل التعديلات السابقة</h3>
            <button (click)="showHistoryModal = false" class="text-slate-400 hover:text-white font-bold text-lg">✕</button>
          </div>
          <div class="flex-1 overflow-y-auto space-y-2.5 pr-1">
            @for (entry of historyManager.getEntries(); track $index) {
              <div 
                (click)="restoreHistory($index)"
                [class.border-indigo-500]="$index === historyManager.getCurrentStep()"
                class="bg-[#0d1117] hover:bg-[#21262d] border border-[#30363d] rounded-xl p-3.5 cursor-pointer transition-all flex flex-col gap-1.5">
                <div class="flex items-center justify-between text-[11px] text-slate-400">
                  <span class="font-bold text-indigo-400">الإصدار #{{ $index + 1 }}</span>
                  <span class="font-mono">{{ entry.time }}</span>
                </div>
                <p class="text-sm text-slate-300 line-clamp-2 truncate">{{ entry.text || '(فارغ)' }}</p>
              </div>
            }
          </div>
          <div class="mt-4 pt-3 border-t border-[#30363d] flex justify-end">
            <button (click)="showHistoryModal = false" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all">إغلاق</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      min-height: 100vh;
      background-color: #0d1117;
      color: #c9d1d9;
      font-family: 'Cairo', sans-serif;
    }

    .text-fixer-wrapper {
      --bg-color: #0d1117; 
      --container-bg: #161b22;
      --text-color: #c9d1d9;
      --accent-color: #2ea043;
      --border-color: #30363d;
      --input-bg: #010409;

      box-sizing: border-box;
      background-color: var(--bg-color);
      color: var(--text-color);
      line-height: 1.8;
      padding: 2rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
      direction: rtl;
    }

    .container {
      width: 100%;
      max-width: 900px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    textarea {
      width: 100%;
      height: 200px;
      background-color: var(--input-bg);
      color: var(--text-color);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 1.5rem;
      font-family: 'Cairo', sans-serif;
      font-size: 1.1rem;
      resize: vertical;
      outline: none;
      transition: border-color 0.3s;
    }

    textarea:focus {
      border-color: var(--accent-color);
    }

    .output-box {
      background-color: var(--container-bg);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 2rem;
      min-height: 200px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
      font-size: 1.1rem;
      white-space: pre-wrap;
    }

    ::ng-deep .tech-term {
      background-color: rgba(88, 166, 255, 0.1);
      color: #79c0ff;
      padding: 0.1rem 0.4rem;
      border-radius: 4px;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      display: inline-block;
      direction: ltr;
    }

    .header-title {
      text-align: center;
      margin-bottom: 1rem;
      color: #fff;
    }
  `]
})
export class TextFixerComponent implements OnInit {
  inputText = '';
  outputText = '';
  showHistoryModal = false;

  historyManager = new TextHistoryManager('rtlTextFixer');
  private isInternalChange = false;
  private debounceTimer: any = null;
  private storageKey = 'rtlTextFixerData';

  ngOnInit() {
    const savedText = localStorage.getItem(this.storageKey) || '';
    this.inputText = savedText;
    this.processText(savedText);
    this.historyManager.push(savedText);
  }

  onInput() {
    localStorage.setItem(this.storageKey, this.inputText);
    this.processText(this.inputText);
    if (!this.isInternalChange) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.historyManager.push(this.inputText);
      }, 500);
    }
  }

  undo() {
    const res = this.historyManager.undo();
    if (res !== null) {
      this.isInternalChange = true;
      this.inputText = res;
      localStorage.setItem(this.storageKey, this.inputText);
      this.processText(this.inputText);
      this.isInternalChange = false;
    }
  }

  redo() {
    const res = this.historyManager.redo();
    if (res !== null) {
      this.isInternalChange = true;
      this.inputText = res;
      localStorage.setItem(this.storageKey, this.inputText);
      this.processText(this.inputText);
      this.isInternalChange = false;
    }
  }

  restoreHistory(index: number) {
    const res = this.historyManager.goTo(index);
    if (res !== null) {
      this.isInternalChange = true;
      this.inputText = res;
      localStorage.setItem(this.storageKey, this.inputText);
      this.processText(this.inputText);
      this.isInternalChange = false;
      this.showHistoryModal = false;
    }
  }

  private processText(text: string) {
    if (!text || !text.trim()) {
      this.outputText = '<span style="color: #8b949e;">سيظهر النص المنسق هنا...</span>';
      return;
    }

    let safeText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const regex = /([a-zA-Z0-9#_]+(?:[-' ][a-zA-Z0-9#_]+)*)/g;
    safeText = safeText.replace(regex, '<span class="tech-term">$1</span>');
    this.outputText = safeText;
  }
}
