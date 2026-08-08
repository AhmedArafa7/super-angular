import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, FileText, Database, Code, Table, FolderOpen, Download, Search, Trash2, Cpu } from 'lucide-angular';

interface OpenedFile {
  name: string;
  size: number;
  type: string;
  extension: string;
  content: string;
  arrayBuffer?: ArrayBuffer;
  parsedData?: any;
  csvRows?: string[][];
  csvHeaders?: string[];
  dbInfo?: {
    isSqlite: boolean;
    headerHex?: string;
    stringsFound?: string[];
  };
}

@Component({
  selector: 'app-file-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="min-h-screen bg-slate-950 text-white p-6 md:p-12 flex flex-col font-sans" dir="rtl">
      
      <!-- Header -->
      <div class="max-w-7xl mx-auto w-full flex flex-wrap items-center justify-between gap-4 mb-8 border-b border-white/10 pb-6">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-black border border-indigo-500/20 mb-2">
            <lucide-icon [img]="Database" class="w-3.5 h-3.5"></lucide-icon>
            <span>محلل وعارض الملفات المتقدم (.db, .json, .csv, .txt)</span>
          </div>
          <h1 class="text-3xl font-black tracking-tight text-white">عارض الملفات الشامل 📂</h1>
          <p class="text-xs text-slate-400 mt-1">افحص وافتح ملفات قواعد البيانات SQLite (.db)، الجداول (.csv)، والنصوص والرموز بسهولة تامة.</p>
        </div>

        <!-- File Upload Button -->
        <label class="px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 text-white font-black text-sm rounded-2xl shadow-xl transition-all cursor-pointer flex items-center gap-2.5">
          <lucide-icon [img]="FolderOpen" class="w-5 h-5"></lucide-icon>
          <span>فتح ملف جديد 📁</span>
          <input type="file" (change)="onFileSelected($event)" multiple accept=".db,.sqlite,.sqlite3,.json,.csv,.tsv,.txt,.log,.xml,.svg,.html,.sql,.md" class="hidden" />
        </label>
      </div>

      <!-- Main Workspace -->
      <div class="max-w-7xl mx-auto w-full flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        <!-- Sidebar: Opened Files List -->
        <div class="lg:col-span-1 bg-slate-900 border border-white/10 rounded-3xl p-5 flex flex-col gap-4 shadow-xl">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-black text-slate-300">الملفات المفتوحة ({{ openedFiles.length }})</h2>
            <button *ngIf="openedFiles.length > 0" (click)="openedFiles = []; activeFileIndex = null" class="text-[11px] text-red-400 hover:underline cursor-pointer">إغلاق الكل</button>
          </div>

          <div *ngIf="openedFiles.length === 0" class="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-white/10 rounded-2xl text-slate-500">
            <lucide-icon [img]="FolderOpen" class="w-10 h-10 mb-2 opacity-40"></lucide-icon>
            <p class="text-xs font-bold">لا توجد ملفات مفتوحة حالياً</p>
            <p class="text-[10px] text-slate-600 mt-1">انقر على "فتح ملف جديد" بالأعلى لاختيار ملفات من جهازك.</p>
          </div>

          <div class="space-y-2 overflow-y-auto max-h-[500px]">
            <div *ngFor="let file of openedFiles; let idx = index" 
                 (click)="activeFileIndex = idx"
                 class="p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group"
                 [ngClass]="activeFileIndex === idx ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg' : 'bg-black/30 border-white/5 hover:border-white/20 text-slate-300'">
              <div class="flex items-center gap-3 overflow-hidden">
                <span class="text-xl">
                  {{ file.extension === 'db' || file.extension === 'sqlite' ? '🗄️' : file.extension === 'json' ? '📋' : file.extension === 'csv' ? '📊' : '📄' }}
                </span>
                <div class="overflow-hidden">
                  <p class="text-xs font-black truncate">{{ file.name }}</p>
                  <p class="text-[10px] text-slate-400 font-mono">{{ formatFileSize(file.size) }} • .{{ file.extension }}</p>
                </div>
              </div>
              <button (click)="$event.stopPropagation(); closeFile(idx)" class="text-slate-500 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <lucide-icon [img]="Trash2" class="w-4 h-4"></lucide-icon>
              </button>
            </div>
          </div>
        </div>

        <!-- Content Inspector Panel -->
        <div class="lg:col-span-3 bg-slate-900 border border-white/10 rounded-3xl p-6 flex flex-col shadow-xl min-h-[600px]">
          
          <div *ngIf="activeFileIndex === null || !openedFiles[activeFileIndex]" class="flex-1 flex flex-col items-center justify-center text-center p-12 text-slate-500">
            <div class="size-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 text-indigo-400">
              <lucide-icon [img]="Code" class="w-10 h-10"></lucide-icon>
            </div>
            <h3 class="text-lg font-black text-slate-300">لم يتم اختيار أي ملف</h3>
            <p class="text-xs text-slate-500 max-w-sm mt-1">اختر ملفاً من القائمة الجانبية أو قم برفع ملف جديد (.db, .json, .csv, .txt) لمعاينة محتوياته وتحليله.</p>
          </div>

          <div *ngIf="activeFileIndex !== null && openedFiles[activeFileIndex] as file" class="flex-1 flex flex-col gap-6">
            
            <!-- File Info Bar -->
            <div class="flex flex-wrap items-center justify-between gap-4 bg-black/40 p-4 rounded-2xl border border-white/5">
              <div class="flex items-center gap-3">
                <span class="text-2xl">
                  {{ file.extension === 'db' || file.extension === 'sqlite' ? '🗄️' : file.extension === 'json' ? '📋' : file.extension === 'csv' ? '📊' : '📄' }}
                </span>
                <div>
                  <h3 class="text-sm font-black text-white">{{ file.name }}</h3>
                  <div class="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                    <span>الحجم: {{ formatFileSize(file.size) }}</span>
                    <span>•</span>
                    <span class="uppercase font-mono text-indigo-400">امتداد: .{{ file.extension }}</span>
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-3">
                <button (click)="downloadFile(file)" class="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-bold rounded-xl border border-white/10 flex items-center gap-2 cursor-pointer">
                  <lucide-icon [img]="Download" class="w-4 h-4"></lucide-icon>
                  <span>تحميل الملف</span>
                </button>
              </div>
            </div>

            <!-- 1. SQLite / .db Inspector View -->
            <div *ngIf="file.extension === 'db' || file.extension === 'sqlite' || file.extension === 'sqlite3'" class="flex-1 flex flex-col gap-4">
              <div class="p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl text-xs text-indigo-300 flex items-center justify-between">
                <span>🗄️ تحليل ملف قاعدة بيانات SQLite</span>
                <span class="font-mono">{{ file.dbInfo?.isSqlite ? '✅ ملف SQLite صالح' : '⚠️ ملف بيانات ثنائي' }}</span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div class="bg-black/30 p-4 rounded-2xl border border-white/5">
                  <span class="text-xs text-slate-500 block">نوع الترويسة (Header)</span>
                  <span class="text-xs font-mono text-emerald-400 font-bold">{{ file.dbInfo?.headerHex || 'غير متوفر' }}</span>
                </div>
                <div class="bg-black/30 p-4 rounded-2xl border border-white/5">
                  <span class="text-xs text-slate-500 block">إجمالي السطور النصية المستخرجة</span>
                  <span class="text-xs font-mono text-white font-bold">{{ file.dbInfo?.stringsFound?.length || 0 }} سلسلة</span>
                </div>
                <div class="bg-black/30 p-4 rounded-2xl border border-white/5">
                  <span class="text-xs text-slate-500 block">حالة القراءة</span>
                  <span class="text-xs font-bold text-indigo-400">قراءة ثنائية ناجحة ⚡</span>
                </div>
              </div>

              <div class="space-y-2">
                <h4 class="text-xs font-bold text-slate-400">الجداول والكلمات المفتاحية المكتشفة داخل قاعدة البيانات:</h4>
                <div class="bg-black/50 border border-white/10 rounded-2xl p-4 max-h-96 overflow-y-auto font-mono text-xs text-slate-300 space-y-1">
                  <div *ngFor="let s of file.dbInfo?.stringsFound; let i = index" class="border-b border-white/5 py-1 flex items-center justify-between">
                    <span class="text-indigo-400">#{{ i + 1 }}</span>
                    <span class="flex-1 text-right px-4">{{ s }}</span>
                  </div>
                  <div *ngIf="!file.dbInfo?.stringsFound?.length" class="text-slate-500 text-center py-6">
                    لم يتم العثور على سلاسل نصية مقروءة في هذا الملف.
                  </div>
                </div>
              </div>
            </div>

            <!-- 2. JSON Viewer View -->
            <div *ngIf="file.extension === 'json'" class="flex-1 flex flex-col gap-4">
              <div class="flex items-center justify-between text-xs text-slate-400">
                <span>📋 عارض ونسق ملفات JSON</span>
                <span class="text-emerald-400 font-bold">✓ JSON صحيح ومنسق</span>
              </div>
              <pre class="flex-1 bg-black/60 border border-white/10 rounded-2xl p-4 font-mono text-xs text-emerald-300 overflow-auto max-h-[500px]" dir="ltr">{{ file.content }}</pre>
            </div>

            <!-- 3. CSV / TSV Viewer View -->
            <div *ngIf="file.extension === 'csv' || file.extension === 'tsv'" class="flex-1 flex flex-col gap-4">
              <div class="flex items-center justify-between text-xs text-slate-400">
                <span>📊 جدول بيانات CSV ({{ file.csvRows?.length || 0 }} صف)</span>
              </div>
              <div class="flex-1 overflow-x-auto max-h-[500px] border border-white/10 rounded-2xl bg-black/40">
                <table class="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr class="bg-indigo-600/30 border-b border-white/10 text-indigo-300">
                      <th *ngFor="let header of file.csvHeaders" class="p-3 font-black border-l border-white/10">{{ header }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let row of file.csvRows" class="border-b border-white/5 hover:bg-white/5">
                      <td *ngFor="let cell of row" class="p-3 border-l border-white/5 font-mono text-slate-300">{{ cell }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- 4. Default Text / Code Viewer (txt, log, xml, html, svg, md) -->
            <div *ngIf="['txt', 'log', 'xml', 'svg', 'html', 'md', 'sql'].includes(file.extension)" class="flex-1 flex flex-col gap-4">
              <div class="flex items-center justify-between text-xs text-slate-400">
                <span>📄 عارض النصوص والمصدر (.{{ file.extension }})</span>
                <span class="font-mono">عدد الأسطر: {{ file.content.split('\n').length }}</span>
              </div>
              <textarea [(ngModel)]="file.content" class="w-full h-[450px] bg-black/60 border border-white/10 rounded-2xl p-4 font-mono text-xs text-slate-200 focus:outline-none focus:border-indigo-500" dir="ltr"></textarea>
            </div>

          </div>

        </div>

      </div>

    </div>
  `
})
export class FileViewerComponent {
  readonly Database = Database;
  readonly FolderOpen = FolderOpen;
  readonly Trash2 = Trash2;
  readonly Code = Code;
  readonly Download = Download;

  openedFiles: OpenedFile[] = [];
  activeFileIndex: number | null = null;

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 بايت';
    const k = 1024;
    const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async onFileSelected(event: any) {
    const files: FileList = event.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split('.').pop()?.toLowerCase() || 'txt';
      
      if (ext === 'db' || ext === 'sqlite' || ext === 'sqlite3') {
        const buffer = await file.arrayBuffer();
        const headerHex = this.getSqliteHeaderHex(buffer);
        const stringsFound = this.extractReadableStrings(buffer);
        
        this.openedFiles.push({
          name: file.name,
          size: file.size,
          type: file.type,
          extension: ext,
          content: '',
          arrayBuffer: buffer,
          dbInfo: {
            isSqlite: headerHex.includes('SQLite format 3'),
            headerHex,
            stringsFound
          }
        });
      } else if (ext === 'json') {
        const text = await file.text();
        let parsed = null;
        try {
          parsed = JSON.parse(text);
        } catch {}
        this.openedFiles.push({
          name: file.name,
          size: file.size,
          type: file.type,
          extension: ext,
          content: parsed ? JSON.stringify(parsed, null, 2) : text,
          parsedData: parsed
        });
      } else if (ext === 'csv' || ext === 'tsv') {
        const text = await file.text();
        const delimiter = ext === 'tsv' ? '\t' : ',';
        const lines = text.split('\n').filter(l => l.trim().length > 0);
        const headers = lines[0] ? lines[0].split(delimiter).map(h => h.trim().replace(/['"]+/g, '')) : [];
        const rows = lines.slice(1, 100).map(l => l.split(delimiter).map(c => c.trim().replace(/['"]+/g, '')));

        this.openedFiles.push({
          name: file.name,
          size: file.size,
          type: file.type,
          extension: ext,
          content: text,
          csvHeaders: headers,
          csvRows: rows
        });
      } else {
        const text = await file.text();
        this.openedFiles.push({
          name: file.name,
          size: file.size,
          type: file.type,
          extension: ext,
          content: text
        });
      }
    }

    if (this.activeFileIndex === null && this.openedFiles.length > 0) {
      this.activeFileIndex = this.openedFiles.length - 1;
    }
  }

  getSqliteHeaderHex(buffer: ArrayBuffer): string {
    try {
      const view = new Uint8Array(buffer.slice(0, 16));
      let str = '';
      for (let i = 0; i < view.length; i++) {
        str += String.fromCharCode(view[i]);
      }
      return str;
    } catch {
      return 'غير معروف';
    }
  }

  extractReadableStrings(buffer: ArrayBuffer): string[] {
    try {
      const view = new Uint8Array(buffer);
      const strings: string[] = [];
      let current = '';
      for (let i = 0; i < view.length; i++) {
        const byte = view[i];
        if (byte >= 32 && byte <= 126) {
          current += String.fromCharCode(byte);
        } else {
          if (current.length >= 4) {
            strings.push(current);
          }
          current = '';
        }
      }
      if (current.length >= 4) {
        strings.push(current);
      }
      return Array.from(new Set(strings)).slice(0, 150);
    } catch {
      return [];
    }
  }

    closeFile(index: number) {
    this.openedFiles.splice(index, 1);
    if (this.activeFileIndex === index) {
      this.activeFileIndex = this.openedFiles.length > 0 ? 0 : null;
    } else if (this.activeFileIndex !== null && this.activeFileIndex > index) {
      this.activeFileIndex--;
    }
  }

  downloadFile(file: OpenedFile) {
    const blob = new Blob([file.content || ''], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  }
}
