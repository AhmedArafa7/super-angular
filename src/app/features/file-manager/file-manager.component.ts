import { Component, signal, inject } from '@angular/core';
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
    <div class="p-6 max-w-6xl mx-auto h-full flex flex-col">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-white">مدير الملفات الذكي</h2>
        <div class="flex gap-2" *ngIf="filePath">
            <button (click)="saveFile()" class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">حفظ الملف</button>
            <button (click)="reset()" class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">إغلاق</button>
        </div>
      </div>
      
      <div *ngIf="!filePath" class="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-700 rounded-xl p-12 text-center">
        <div class="text-gray-400 mb-6">اختر صيغة التحرير ثم ارفع ملفاً للبدء</div>
        <div class="flex gap-4">
            <button (click)="openFile('text')" class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">تحرير نصي (سريع)</button>
            <button 
            (click)="openFile('advanced')" 
            [disabled]="onBattery && !bypassEnergySave"
            class="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50">
            تحرير متقدم (تنسيق)
            </button>
        </div>
        
        <div *ngIf="onBattery && !bypassEnergySave" class="mt-4 text-red-400 text-sm">
          الوضع المتقدم معطل لتوفير الطاقة. 
          <button (click)="bypassEnergySave=true" class="text-blue-400 underline ml-1">تجاوز؟</button>
        </div>
      </div>

      <div *ngIf="isLoading" class="flex-1 flex items-center justify-center text-white">
        جاري معالجة الملف...
      </div>

      <div *ngIf="filePath && !isLoading" class="flex-1 mt-4">
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

  constructor() {
    this.powerSvc.getStatus().then(status => this.onBattery = status.onBattery);
  }

  async openFile(mode: 'text' | 'advanced') {
    // 1. Handle browser-based file input for basic text files
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.txt,.json,.md,.js,.ts,.html,.css,.csv,.ipynb,.pdf';
    
    fileInput.onchange = async (e: any) => {
        const file = e.target.files[0];
        if (!file) return;

        // If we are in Electron, use IPC
        if ((window as any).electronAPI) {
            this.filePath = file.path; 
            this.isLoading = true;
            const result = await (window as any).electronAPI.fileProcessing.process(this.filePath, mode);
            this.isLoading = false;
            if (result.ok) {
                this.content = result.content;
            } else {
                alert('خطأ في معالجة الملف: ' + result.error);
                this.filePath = '';
            }
        } else {
            // Browser processing
            this.isLoading = true;
            try {
                if (file.type === 'application/pdf') {
                    const arrayBuffer = await file.arrayBuffer();
                    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                    let text = '';
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const content = await page.getTextContent();
                        text += content.items.map((item: any) => item.str).join(' ') + '\n';
                    }
                    this.content = text;
                } else {
                    const reader = new FileReader();
                    reader.onload = (e: any) => {
                        this.content = e.target.result;
                    };
                    reader.readAsText(file);
                }
                this.filePath = file.name;
            } catch (err: any) {
                alert('خطأ في قراءة الملف: ' + err.message);
            }
            this.isLoading = false;
        }
    };
    
    fileInput.click();
  }

  async saveFile() {
    if (!(window as any).electronAPI) return;

    // Determine extension and default path based on original file
    const originalPath = this.filePath || 'document.txt';
    const lastDotIndex = originalPath.lastIndexOf('.');
    let baseName = originalPath;
    let ext = 'txt';

    if (lastDotIndex !== -1) {
      baseName = originalPath.substring(0, lastDotIndex);
      ext = originalPath.substring(lastDotIndex + 1).toLowerCase();
    }

    const defaultPath = `${baseName}_edited.${ext}`;
    const filterName = `${ext.toUpperCase()} Files`;

    const savePath = await (window as any).electronAPI.dialog.saveFile({
      defaultPath,
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
  }

  reset() {
      this.filePath = '';
      this.content = '';
  }
}
