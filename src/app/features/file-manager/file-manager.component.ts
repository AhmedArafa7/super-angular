import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PowerService } from './power.service';
import { RichEditorComponent } from '../../shared/components/rich-editor/rich-editor.component';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker source
(pdfjsLib as any).GlobalWorkerOptions.workerSrc = '/assets/pdf.worker.js';

@Component({
  selector: 'app-file-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, RichEditorComponent],
  template: `
    <div class="p-6 max-w-7xl mx-auto h-full flex flex-col font-sans" dir="rtl">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-black text-lg">
            📁
          </div>
          <div>
            <h2 class="text-xl font-black text-white flex items-center gap-2">
              <span>مدير ومحرر الملفات الذكي</span>
              @if (filePath) {
                <span 
                  class="px-2.5 py-0.5 rounded-full text-[11px] font-bold border"
                  [ngClass]="currentMode === 'advanced' ? 'bg-purple-500/15 text-purple-300 border-purple-500/30' : 'bg-blue-500/15 text-blue-300 border-blue-500/30'"
                >
                  {{ currentMode === 'advanced' ? '✨ تحرير متقدم (تنسيق غني)' : '⚡ تحرير نصي سريع' }}
                </span>
              }
            </h2>
            <p class="text-xs text-slate-400">
              {{ filePath ? ('الملف الحالي: ' + getFileName()) : 'قم بتحميل أو تحرير أي ملف نصي، برمجي، جداول أو PDF بكل سهولة' }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2" *ngIf="filePath">
          <button 
            type="button" 
            (click)="saveFile()" 
            class="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <span>💾 حفظ الملف</span>
          </button>
          <button 
            type="button" 
            (click)="reset()" 
            class="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
      
      <!-- Upload / Dropzone state when no file opened -->
      <div 
        *ngIf="!filePath" 
        (dragover)="onDragOver($event)"
        (dragleave)="isDragging = false"
        (drop)="onDrop($event)"
        [class.border-indigo-500]="isDragging"
        [class.bg-indigo-950/20]="isDragging"
        class="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-3xl p-12 text-center transition-all bg-slate-900/30 backdrop-blur-sm"
      >
        <div class="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl mb-4 shadow-xl">
          📄
        </div>
        <h3 class="text-lg font-black text-white mb-2">اختر صيغة التحرير أو اسحب وأفلت الملف هنا</h3>
        <p class="text-xs text-slate-400 max-w-md mb-8">
          يدعم: نصوص (.txt)، ماركداون (.md)، جداول (.csv)، بيانات (.json)، أكواد برمجية (.js, .ts, .html, .css)، دفاتر (.ipynb) ومستندات (.pdf).
        </p>

        <div class="flex flex-wrap items-center justify-center gap-4">
          <button 
            type="button" 
            (click)="openFile('text')" 
            class="px-6 py-3.5 bg-slate-800 hover:bg-slate-700 border border-white/10 text-white rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg active:scale-95"
          >
            <span>⚡ تحرير نصي (سريع)</span>
          </button>
          
          <button 
            type="button" 
            (click)="openFile('advanced')" 
            [disabled]="onBattery && !bypassEnergySave"
            class="px-6 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-2xl text-xs font-black transition flex items-center gap-2 cursor-pointer shadow-xl shadow-purple-600/20 disabled:opacity-50 active:scale-95"
          >
            <span>✨ تحرير متقدم (تنسيق ذكي)</span>
          </button>
        </div>
        
        <div *ngIf="onBattery && !bypassEnergySave" class="mt-6 text-amber-400 text-xs flex items-center gap-1.5">
          <span>⚠️ الوضع المتقدم معطل مؤقتًا لتوفير طاقة البطارية.</span> 
          <button type="button" (click)="bypassEnergySave = true" class="text-indigo-400 underline font-bold cursor-pointer">تجاوز؟</button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading" class="flex-1 flex flex-col items-center justify-center text-white gap-3">
        <div class="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
        <span class="text-sm text-slate-300 font-bold animate-pulse">جاري معالجة وتنسيق الملف...</span>
      </div>

      <!-- Rich Editor View -->
      <div *ngIf="filePath && !isLoading" class="flex-1 min-h-0 flex flex-col rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
        <app-rich-editor [content]="content" (contentChange)="content = $event"></app-rich-editor>
      </div>
    </div>
  `
})
export class FileManagerComponent {
  powerSvc = inject(PowerService);
  onBattery = false;
  bypassEnergySave = false;
  content = '';
  filePath = '';
  isLoading = false;
  isDragging = false;
  currentMode: 'text' | 'advanced' = 'advanced';

  constructor() {
    this.powerSvc.getStatus().then(status => this.onBattery = status.onBattery);
  }

  getFileName(): string {
    if (!this.filePath) return '';
    const parts = this.filePath.replace(/\\/g, '/').split('/');
    return parts[parts.length - 1] || this.filePath;
  }

  onDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging = true;
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging = false;
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      this.processSelectedFile(file, this.currentMode);
    }
  }

  async openFile(mode: 'text' | 'advanced') {
    this.currentMode = mode;
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.txt,.json,.md,.js,.ts,.html,.css,.csv,.ipynb,.pdf,.py,.xml,.yaml,.yml,.sql,.log';
    
    fileInput.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      await this.processSelectedFile(file, mode);
    };
    
    fileInput.click();
  }

  private async processSelectedFile(file: File | any, mode: 'text' | 'advanced') {
    this.currentMode = mode;
    const ext = (file.name || '').split('.').pop()?.toLowerCase() || '';

    // 1. Electron Environment
    if ((window as any).electronAPI && file.path) {
      this.filePath = file.path;
      this.isLoading = true;
      const result = await (window as any).electronAPI.fileProcessing.process(this.filePath, mode);
      this.isLoading = false;
      if (result && result.ok) {
        if (mode === 'advanced' && ext !== 'pdf') {
          this.content = this.formatAdvancedContent(result.content, ext);
        } else {
          this.content = result.content;
        }
      } else {
        alert('خطأ في معالجة الملف: ' + (result?.error || 'حدث خطأ غير معروف'));
        this.filePath = '';
      }
      return;
    }

    // 2. Browser Environment
    this.isLoading = true;
    try {
      this.filePath = file.name;
      if (file.type === 'application/pdf' || ext === 'pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let formattedPdf = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          if (mode === 'advanced') {
            formattedPdf += `<div style="border-bottom: 2px solid #6366f1; margin: 24px 0 10px; padding-bottom: 4px; color: #a5b4fc; font-weight: 800; font-size: 13px;">📄 صفحة ${i} من ${pdf.numPages}</div><p style="margin-bottom: 14px; line-height: 1.8;">${this.escapeHtml(pageText).replace(/\n/g, '<br>')}</p>`;
          } else {
            formattedPdf += pageText + '\n\n';
          }
        }
        this.content = formattedPdf;
      } else {
        const text = await file.text();
        if (mode === 'advanced') {
          this.content = this.formatAdvancedContent(text, ext);
        } else {
          this.content = text;
        }
      }
    } catch (err: any) {
      alert('خطأ في قراءة الملف: ' + err.message);
      this.filePath = '';
    } finally {
      this.isLoading = false;
    }
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  private formatAdvancedContent(raw: string, ext: string): string {
    switch (ext) {
      case 'md':
        return this.formatMarkdown(raw);
      case 'csv':
        return this.formatCsv(raw);
      case 'json':
        return this.formatJson(raw);
      case 'ipynb':
        return this.formatNotebook(raw);
      case 'html':
        return raw;
      default:
        return raw
          .split(/\n\s*\n/)
          .map(para => `<p style="margin-bottom: 12px; line-height: 1.8;">${this.escapeHtml(para).replace(/\n/g, '<br>')}</p>`)
          .join('');
    }
  }

  private formatMarkdown(md: string): string {
    let html = this.escapeHtml(md);

    // Code blocks
    html = html.replace(/```([a-z]*)\n([\s\S]*?)```/gi, (_, lang, code) => {
      return `<pre style="background: rgba(0,0,0,0.5); border: 1px solid rgba(99,102,241,0.25); border-radius: 12px; padding: 16px; margin: 16px 0; overflow-x: auto; color: #38bdf8; font-family: monospace; font-size: 13px; line-height: 1.6;"><code>${code}</code></pre>`;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; font-family: monospace; color: #f472b6;">$1</code>');

    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3 style="font-size: 1.25rem; font-weight: 800; color: #818cf8; margin: 20px 0 10px;">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 style="font-size: 1.5rem; font-weight: 800; color: #a5b4fc; margin: 24px 0 12px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 6px;">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 style="font-size: 1.85rem; font-weight: 900; color: #c7d2fe; margin: 28px 0 16px; border-bottom: 2px solid #6366f1; padding-bottom: 8px;">$1</h1>');

    // Bold & Italic
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong style="color: #ffffff; font-weight: bold;">$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em style="color: #cbd5e1;">$1</em>');

    // Blockquotes
    html = html.replace(/^\> (.*$)/gim, '<blockquote style="border-right: 4px solid #6366f1; margin: 14px 0; color: #94a3b8; font-style: italic; background: rgba(99,102,241,0.05); padding: 8px 14px; border-radius: 0 8px 8px 0;">$1</blockquote>');

    // Horizontal rules
    html = html.replace(/^(?:---|\*\*\*|___)\s*$/gim, '<hr style="border: none; border-top: 1px solid rgba(255,255,255,0.15); margin: 24px 0;" />');

    // Lists
    html = html.replace(/^\- (.*$)/gim, '<li style="margin-bottom: 6px; color: #e2e8f0; list-style-type: disc; margin-right: 20px;">$1</li>');

    // Paragraphs
    const paragraphs = html.split(/\n\s*\n/).map(p => {
      p = p.trim();
      if (!p) return '';
      if (p.startsWith('<h') || p.startsWith('<pre') || p.startsWith('<blockquote') || p.startsWith('<hr') || p.startsWith('<li')) {
        return p;
      }
      return `<p style="margin-bottom: 12px; line-height: 1.8;">${p.replace(/\n/g, '<br>')}</p>`;
    });

    return paragraphs.join('\n');
  }

  private formatCsv(csv: string): string {
    const lines = csv.trim().split(/\r?\n/);
    if (lines.length === 0) return '<p>ملف CSV فارغ</p>';

    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let cur = '';
      let inQuotes = false;
      const delimiter = line.includes(';') && !line.includes(',') ? ';' : ',';
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          result.push(cur.trim());
          cur = '';
        } else {
          cur += char;
        }
      }
      result.push(cur.trim());
      return result;
    };

    const header = parseLine(lines[0]);
    let tableHtml = `<div style="overflow-x: auto; margin: 20px 0;"><table style="width: 100%; border-collapse: collapse; text-align: right; font-size: 13px; border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; overflow: hidden;">`;
    
    // Header
    tableHtml += `<thead><tr style="background: rgba(99,102,241,0.25); color: #c7d2fe; border-bottom: 2px solid rgba(99,102,241,0.4);">`;
    for (const col of header) {
      tableHtml += `<th style="padding: 12px 16px; font-weight: 800;">${this.escapeHtml(col)}</th>`;
    }
    tableHtml += `</tr></thead><tbody>`;

    // Data rows
    for (let r = 1; r < lines.length; r++) {
      if (!lines[r].trim()) continue;
      const row = parseLine(lines[r]);
      const bg = r % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent';
      tableHtml += `<tr style="background: ${bg}; border-bottom: 1px solid rgba(255,255,255,0.06);">`;
      for (let c = 0; c < header.length; c++) {
        const val = row[c] !== undefined ? row[c] : '';
        tableHtml += `<td style="padding: 10px 16px; color: #e2e8f0;">${this.escapeHtml(val)}</td>`;
      }
      tableHtml += `</tr>`;
    }

    tableHtml += `</tbody></table></div><p><br></p>`;
    return tableHtml;
  }

  private formatJson(jsonStr: string): string {
    try {
      const parsed = JSON.parse(jsonStr);
      const pretty = JSON.stringify(parsed, null, 2);
      return `<pre style="background: #020617; border: 1px solid rgba(99,102,241,0.25); border-radius: 12px; padding: 18px; color: #38bdf8; font-family: monospace; font-size: 13px; line-height: 1.6; overflow-x: auto;"><code>${this.escapeHtml(pretty)}</code></pre><p><br></p>`;
    } catch {
      return `<pre style="background: #020617; padding: 16px; color: #ef4444; font-family: monospace;"><code>${this.escapeHtml(jsonStr)}</code></pre>`;
    }
  }

  private formatNotebook(ipynbStr: string): string {
    try {
      const nb = JSON.parse(ipynbStr);
      let html = `<div style="padding: 10px 0;"><h2 style="font-size: 1.5rem; font-weight: 800; color: #a5b4fc; margin-bottom: 16px;">📓 Jupyter Notebook</h2>`;
      
      if (Array.isArray(nb.cells)) {
        for (const cell of nb.cells) {
          const source = Array.isArray(cell.source) ? cell.source.join('') : (cell.source || '');
          if (cell.cell_type === 'markdown') {
            html += `<div style="margin: 16px 0; padding: 12px 16px; background: rgba(255,255,255,0.02); border-radius: 8px;">${this.formatMarkdown(source)}</div>`;
          } else if (cell.cell_type === 'code') {
            const execCount = cell.execution_count !== null && cell.execution_count !== undefined ? cell.execution_count : ' ';
            html += `<div style="margin: 16px 0; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; overflow: hidden;">
              <div style="background: rgba(255,255,255,0.04); padding: 6px 14px; font-size: 11px; color: #94a3b8; font-family: monospace; border-bottom: 1px solid rgba(255,255,255,0.06);">In [${execCount}]</div>
              <pre style="margin: 0; padding: 14px; background: #020617; color: #38bdf8; font-family: monospace; font-size: 13px; line-height: 1.6; overflow-x: auto;"><code>${this.escapeHtml(source)}</code></pre>
            </div>`;
          }
        }
      }
      html += `</div><p><br></p>`;
      return html;
    } catch {
      return this.formatJson(ipynbStr);
    }
  }

  private getMimeType(ext: string): string {
    const mimeMap: Record<string, string> = {
      'txt': 'text/plain;charset=utf-8',
      'md': 'text/markdown;charset=utf-8',
      'json': 'application/json;charset=utf-8',
      'csv': 'text/csv;charset=utf-8',
      'html': 'text/html;charset=utf-8',
      'css': 'text/css;charset=utf-8',
      'js': 'text/javascript;charset=utf-8',
      'ts': 'text/plain;charset=utf-8',
      'ipynb': 'application/x-ipynb+json;charset=utf-8',
      'pdf': 'application/pdf',
      'xml': 'application/xml;charset=utf-8',
      'yaml': 'text/yaml;charset=utf-8',
      'yml': 'text/yaml;charset=utf-8'
    };
    return mimeMap[ext] || 'text/plain;charset=utf-8';
  }

  async saveFile() {
    const originalPath = this.filePath || 'document.txt';
    const lastDotIndex = originalPath.lastIndexOf('.');
    let baseName = originalPath;
    let ext = 'txt';

    if (lastDotIndex !== -1) {
      baseName = originalPath.substring(0, lastDotIndex);
      ext = originalPath.substring(lastDotIndex + 1).toLowerCase();
    }

    const defaultFilename = `${baseName}_edited.${ext}`;
    const filterName = `${ext.toUpperCase()} Files`;
    const mimeType = this.getMimeType(ext);

    // 1. Electron Mode
    if ((window as any).electronAPI) {
      const savePath = await (window as any).electronAPI.dialog.saveFile({
        defaultPath: defaultFilename,
        filters: [
          { name: filterName, extensions: [ext] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });
      if (!savePath) return;

      const result = await (window as any).electronAPI.fs.writeFile(savePath, this.content);
      if (result && result.ok) {
        alert('تم حفظ الملف بنجاح!');
      } else {
        alert('خطأ في الحفظ: ' + (result?.error || 'حدث خطأ غير متوقع'));
      }
      return;
    }

    // 2. Browser Mode: File System Access API
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: defaultFilename,
          types: [{
            description: filterName,
            accept: { [mimeType.split(';')[0]]: [`.${ext}`] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(this.content);
        await writable.close();
        alert('تم حفظ الملف بنجاح!');
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return;
        }
        console.warn('showSaveFilePicker failed, falling back to Blob download:', err);
      }
    }

    // Fallback: Blob + <a> download
    try {
      const blob = new Blob([this.content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = defaultFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      alert('تم تنزيل الملف بنجاح!');
    } catch (err: any) {
      alert('خطأ في تنزيل الملف: ' + err.message);
    }
  }

  reset() {
    this.filePath = '';
    this.content = '';
  }
}
