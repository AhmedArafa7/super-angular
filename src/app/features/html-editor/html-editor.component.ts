import { Component, OnInit, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface HtmlProject {
  id: string;
  name: string;
  code: string;
  date: string;
}

@Component({
  selector: 'app-html-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="html-editor-app">
      <header class="main-header">
        <div class="logo">
          <button (click)="toggleSidebar()" class="btn-icon" title="القائمة الجانبية">☰</button>
          <span>&lt;/&gt; المحرر المتكامل</span>
        </div>
        <div class="header-controls">
          <button (click)="fileInput.click()" class="btn-purple" title="استيراد ملف HTML">📂 استيراد</button>
          <input #fileInput type="file" accept=".html,.htm" (change)="onFileImport($event)" style="display:none;">
          <button (click)="saveCurrent()" class="btn-success">💾 حفظ</button>
          <button (click)="downloadFile()" class="btn-primary">⬇️ تحميل</button>
          <button (click)="openFullscreen()" class="btn-warning" title="صفحة كاملة">⤢</button>
        </div>
      </header>

      <div class="workspace">
        <aside class="sidebar" [class.collapsed]="isSidebarCollapsed">
          <div class="sidebar-section" style="flex: 2; border-bottom: 1px solid #444;">
            <div class="sidebar-header">
              <span>مشاريعي</span>
              <span id="project-count" style="background:var(--accent-color); padding:0 5px; border-radius:10px;">{{ projects.length }}</span>
            </div>
            <div class="list-container">
              @for (p of projects; track p.id) {
                <div class="list-item" [style.border-right]="p.id === currentProjectID ? '4px solid var(--accent-color)' : 'none'" (click)="loadProject(p.id)">
                  <span class="item-title">{{ p.name }}</span>
                  <div class="item-meta">
                    <span>{{ p.date | date:'yyyy/MM/dd' }}</span>
                    <span (click)="deleteProject(p.id, $event)" style="color:#e74c3c; cursor:pointer;"> حذف 🗑️</span>
                  </div>
                </div>
              }
            </div>
            <div style="padding:10px;">
              <button (click)="newProject()" class="btn-primary" style="width:100%; justify-content:center;">+ مشروع جديد</button>
            </div>
          </div>

          <div class="sidebar-section" style="flex: 1;">
            <div class="sidebar-header"><span>⚡ قوالب جاهزة</span></div>
            <div class="list-container template-grid">
              <button class="template-btn" (click)="loadTemplate('basic')">أساسي</button>
              <button class="template-btn" (click)="loadTemplate('table')">جدول</button>
              <button class="template-btn" (click)="loadTemplate('form')">نموذج</button>
              <button class="template-btn" (click)="loadTemplate('css')">تصميم CSS</button>
              <button class="template-btn" (click)="loadTemplate('layout')">تخطيط</button>
              <button class="template-btn" (click)="loadTemplate('js')">تفاعلي JS</button>
            </div>
          </div>
        </aside>

        <main class="main-panel">
          <div class="toolbar">
            <button (click)="updatePreview()" class="btn-success">▶️ تحديث</button>
            
            <div style="display:flex; gap:2px; margin:0 5px;">
              <button (click)="undo()" [disabled]="historyStep <= 0" class="btn-dark" title="تراجع (Ctrl+Z)">↩️</button>
              <button (click)="redo()" [disabled]="historyStep >= historyStack.length - 1" class="btn-dark" title="إعادة (Ctrl+Y)">↪️</button>
            </div>

            <button (click)="copyCode()" class="btn-teal" title="نسخ الكود بالكامل">📄 نسخ</button>
            <button (click)="pasteCode()" class="btn-primary" title="لصق من الحافظة">📋 لصق</button>
            
            <button (click)="toggleWrap()" [style.background]="isWrapped ? 'var(--accent-color)' : '#444'" class="btn-dark" title="تفعيل/إلغاء التفاف النص">📜 التفاف</button>
            <button (click)="formatCode()" class="btn-dark">✨ ترتيب</button>
            <button (click)="toggleSearch()" class="btn-dark">🔍 بحث</button>
            <button (click)="clearCode()" class="btn-danger">🗑️ مسح</button>
            
            <div class="project-info-box">
              <span class="project-name-display">{{ currentProjectName }}{{ isUnsaved ? ' *' : '' }}</span>
              <button (click)="renameProject()" class="edit-name-btn" title="تغيير الاسم">✏️</button>
            </div>
          </div>

          <div class="editor-split">
            <div class="code-area">
              <div class="search-panel" [class.active]="isSearchActive">
                <div class="search-row">
                  <input #findInput [(ngModel)]="findQuery" placeholder="بحث..." autocomplete="off">
                  <button style="background:transparent; color:#e74c3c; width:auto;" (click)="closeSearch()">✕</button>
                </div>
                <div class="search-row">
                  <input [(ngModel)]="replaceQuery" placeholder="استبدال بـ..." autocomplete="off">
                </div>
                <div class="search-row" style="justify-content: space-between;">
                  <button class="btn-dark" (click)="findNext()" style="font-size:0.7rem">التالي</button>
                  <button class="btn-dark" (click)="replaceOne()" style="font-size:0.7rem">استبدال</button>
                  <button class="btn-dark" (click)="replaceAll()" style="font-size:0.7rem">الكل</button>
                </div>
              </div>

              <textarea 
                #editorArea
                id="html-editor" 
                [class.wrap-active]="isWrapped"
                [(ngModel)]="htmlCode" 
                (input)="onEditorInput()"
                spellcheck="false" 
                placeholder="اكتب كود HTML هنا..."
              ></textarea>
            </div>
            <div class="preview-area">
              <iframe #previewFrame id="preview-frame"></iframe>
            </div>
          </div>
        </main>
      </div>

      <div class="toast" [style.display]="toastMessage ? 'block' : 'none'" [style.background]="toastBg">
        {{ toastMessage }}
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      overflow: hidden;
      direction: rtl;
    }

    .html-editor-app {
      --primary-color: #2c3e50;
      --accent-color: #3498db;
      --success-color: #27ae60;
      --warning-color: #f39c12;
      --danger-color: #c0392b;
      --text-light: #ecf0f1;
      --bg-dark: #1a1a1a;
      --panel-bg: #252526;
      --border-color: #404040;

      background-color: var(--bg-dark); 
      color: var(--text-light); 
      height: 100vh; 
      display: flex; 
      flex-direction: column;
      overflow: hidden;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }

    * { box-sizing: border-box; outline: none; }

    header.main-header {
      background: #202020;
      padding: 0 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border-color);
      height: 55px;
    }

    .logo { font-size: 1.1rem; font-weight: bold; color: var(--accent-color); display: flex; align-items: center; gap: 8px; }
    .header-controls { display: flex; gap: 8px; }
    
    button {
      cursor: pointer; border: none; border-radius: 4px; padding: 6px 12px;
      font-size: 0.85rem; transition: 0.2s; display: flex; align-items: center; gap: 5px; color: white;
    }
    button:hover { opacity: 0.9; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }

    .btn-primary { background: var(--accent-color); }
    .btn-success { background: var(--success-color); }
    .btn-warning { background: var(--warning-color); color: #fff; }
    .btn-danger { background: var(--danger-color); }
    .btn-purple { background: #9b59b6; }
    .btn-teal { background: #16a085; }
    .btn-dark { background: #444; }
    .btn-icon { background: transparent; color: #aaa; font-size: 1.2rem; padding: 5px; }
    .btn-icon:hover { color: white; background: rgba(255,255,255,0.1); }

    .workspace { display: flex; flex: 1; height: calc(100vh - 55px); overflow: hidden; }

    .sidebar {
      width: 260px; background: var(--panel-bg); border-left: 1px solid var(--border-color);
      display: flex; flex-direction: column; transition: width 0.3s ease;
    }
    .sidebar.collapsed { width: 0; border: none; overflow: hidden; }
    
    .sidebar-section { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0; }
    .sidebar-header {
      padding: 10px; font-weight: bold; background: #333; border-bottom: 1px solid var(--border-color);
      display: flex; justify-content: space-between; font-size: 0.9rem;
    }
    
    .list-container { flex: 1; overflow-y: auto; padding: 10px; }
    .list-item {
      background: #383838; padding: 8px; border-radius: 4px; margin-bottom: 8px;
      cursor: pointer; border: 1px solid transparent; transition: 0.2s;
    }
    .list-item:hover { border-color: var(--accent-color); background: #404040; }
    .item-title { font-weight: bold; display: block; font-size: 0.9rem; }
    .item-meta { font-size: 0.7rem; color: #bbb; display: flex; justify-content: space-between; margin-top: 5px; }
    
    .template-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; padding: 10px; }
    .template-btn { background: #2d2d2d; border: 1px solid #444; padding: 8px; text-align: center; font-size: 0.8rem; }
    .template-btn:hover { background: var(--accent-color); border-color: var(--accent-color); }

    .main-panel { flex: 1; display: flex; flex-direction: column; background: #1e1e1e; position: relative; }

    .toolbar {
      background: #2d2d2d; padding: 5px 10px; display: flex; gap: 8px;
      border-bottom: 1px solid var(--border-color); align-items: center;
      overflow-x: auto; white-space: nowrap;
    }

    .editor-split { display: flex; flex: 1; height: 100%; position: relative; }
    .code-area, .preview-area { flex: 1; display: flex; flex-direction: column; min-width: 0; position: relative; }
    .code-area { border-left: 1px solid var(--border-color); }

    textarea#html-editor {
      width: 100%; height: 100%; background: #1e1e1e; color: #d4d4d4; border: none;
      padding: 15px; 
      white-space: pre; 
      overflow: auto; 
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace; 
      font-size: 14px; 
      line-height: 1.6; 
      resize: none;
      tab-size: 4;
    }
    textarea#html-editor.wrap-active {
      white-space: pre-wrap;
    }

    iframe#preview-frame { width: 100%; height: 100%; border: none; background: white; }

    .search-panel {
      position: absolute; top: 10px; right: 20px; background: #252526;
      border: 1px solid var(--accent-color); padding: 8px; border-radius: 5px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.5); display: none; flex-direction: column; gap: 5px; z-index: 100; width: 300px; direction: ltr;
    }
    .search-panel.active { display: flex; }
    .search-row { display: flex; gap: 5px; }
    .search-panel input { background: #3c3c3c; border: 1px solid #555; color: white; padding: 4px; flex: 1; }
    
    .project-info-box { margin-right:auto; display:flex; align-items:center; gap:5px; background:rgba(0,0,0,0.2); padding:2px 8px; border-radius:4px; }
    .project-name-display { color:#bbb; font-size:0.85rem; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .edit-name-btn { background:transparent; padding:2px; font-size:0.8rem; opacity:0.6; }
    .edit-name-btn:hover { background:rgba(255,255,255,0.1); opacity:1; }

    .toast {
      position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
      color: white; padding: 10px 20px; border-radius: 5px;
      z-index: 2000; animation: fadeIn 0.3s;
    }
    @keyframes fadeIn { from { opacity:0; transform: translate(-50%, 10px); } to { opacity:1; transform: translate(-50%, 0); } }

    @media (max-width: 768px) {
      .editor-split { flex-direction: column; }
      .sidebar { position: absolute; left: 0; top: 55px; height: calc(100% - 55px); z-index: 150; box-shadow: 2px 0 10px rgba(0,0,0,0.5); }
      .sidebar.collapsed { width: 0; transform: translateX(-100%); }
      .template-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class HtmlEditorComponent implements OnInit, AfterViewInit {
  @ViewChild('previewFrame') previewFrame!: ElementRef<HTMLIFrameElement>;
  @ViewChild('editorArea') editorArea!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('findInput') findInput!: ElementRef<HTMLInputElement>;

  htmlCode = '';
  projects: HtmlProject[] = [];
  currentProjectID: string | null = null;
  currentProjectName = 'مشروع غير محفوظ';
  isUnsaved = true;

  isSidebarCollapsed = false;
  isWrapped = false;
  isSearchActive = false;

  findQuery = '';
  replaceQuery = '';

  toastMessage = '';
  toastBg = 'rgba(0,0,0,0.9)';

  historyStack: string[] = [];
  historyStep = -1;
  private isInternalChange = false;
  private debounceTimer: any = null;

  private STORAGE_KEY = 'user_html_projects_v8';

  private defaultCode = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>محرر HTML الاحترافي</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma; text-align: center; padding: 50px; background: #f0f2f5; }
        h1 { color: #2c3e50; margin-bottom: 20px; }
        .box { 
            background: white; 
            padding: 30px; 
            border-radius: 12px; 
            display: inline-block; 
            box-shadow: 0 10px 25px rgba(0,0,0,0.1); 
            max-width: 600px;
        }
        p { line-height: 1.6; color: #555; }
        .highlight { color: #e74c3c; font-weight: bold; }
    </style>
</head>
<body>
    <div class="box">
        <h1>مرحباً بك في الإصدار 8</h1>
        <p>تم حل مشكلة <span class="highlight">التفاف النص</span>.</p>
        <p>الآن، الأسطر الطويلة ستمتد أفقياً ولن تنزل للأسفل، مما يجعل الكود أكثر ترتيباً وسهولة في القراءة.</p>
        <p>يمكنك الضغط على زر "📜 التفاف" في الأعلى إذا أردت تغيير هذا الوضع.</p>
    </div>
</body>
</html>`;

  private templates: Record<string, string> = {
    basic: `<!DOCTYPE html>\n<html>\n<head><title>Test</title></head>\n<body>\n<h1>Hello</h1>\n</body>\n</html>`,
    table: `<!DOCTYPE html>\n<html>\n<head><style>table,th,td{border:1px solid black;border-collapse:collapse;padding:5px;}</style></head>\n<body>\n<table style="width:100%">\n<tr><th>Name</th><th>Age</th></tr>\n<tr><td>Ali</td><td>25</td></tr>\n</table>\n</body>\n</html>`,
    form: `<!DOCTYPE html>\n<html>\n<body>\n<form>\n<label>Name:</label><br>\n<input type="text"><br><br>\n<button>Submit</button>\n</form>\n</body>\n</html>`,
    css: `<!DOCTYPE html>\n<html>\n<head>\n<style>\nbody{background:#2c3e50;color:white;text-align:center;padding:50px;}\n.box{background:#e74c3c;padding:20px;border-radius:10px;}\n</style>\n</head>\n<body>\n<div class="box">\n<h2>Styled Box</h2>\n</div>\n</body>\n</html>`,
    layout: `<!DOCTYPE html>\n<html>\n<head>\n<style>\nheader,footer{background:#333;color:white;padding:10px;text-align:center;}\nmain{padding:20px;min-height:200px;}\n</style>\n</head>\n<body>\n<header>Header</header>\n<main>Content goes here</main>\n<footer>Footer</footer>\n</body>\n</html>`,
    js: `<!DOCTYPE html>\n<html>\n<body>\n<h1 id="demo">Click the button</h1>\n<button onclick="document.getElementById('demo').innerText = 'Hello JS!'">Click Me</button>\n</body>\n</html>`
  };

  ngOnInit() {
    this.htmlCode = this.defaultCode;
    this.loadProjects();
    this.initHistory();
  }

  ngAfterViewInit() {
    this.updatePreview();
  }

  updatePreview() {
    if (!this.previewFrame) return;
    const doc = this.previewFrame.nativeElement.contentDocument || this.previewFrame.nativeElement.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(this.htmlCode);
      doc.close();
    }
  }

  showToast(msg: string, type: 'normal' | 'success' | 'error' = 'normal') {
    this.toastMessage = msg;
    this.toastBg = type === 'error' ? '#c0392b' : (type === 'success' ? '#27ae60' : 'rgba(0,0,0,0.9)');
    setTimeout(() => {
      if (this.toastMessage === msg) this.toastMessage = '';
    }, 3000);
  }

  recordHistory() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      if (this.historyStep < this.historyStack.length - 1) {
        this.historyStack = this.historyStack.slice(0, this.historyStep + 1);
      }
      this.historyStack.push(this.htmlCode);
      this.historyStep++;
      if (this.historyStack.length > 50) {
        this.historyStack.shift();
        this.historyStep--;
      }
    }, 300);
  }

  undo() {
    if (this.historyStep > 0) {
      this.historyStep--;
      this.isInternalChange = true;
      this.htmlCode = this.historyStack[this.historyStep];
      this.updatePreview();
      this.isUnsaved = true;
      this.isInternalChange = false;
    }
  }

  redo() {
    if (this.historyStep < this.historyStack.length - 1) {
      this.historyStep++;
      this.isInternalChange = true;
      this.htmlCode = this.historyStack[this.historyStep];
      this.updatePreview();
      this.isUnsaved = true;
      this.isInternalChange = false;
    }
  }

  initHistory() {
    this.historyStack = [this.htmlCode];
    this.historyStep = 0;
  }

  loadProjects() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      this.projects = data ? JSON.parse(data) : [];
      this.projects.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch {
      this.projects = [];
    }
  }

  saveProjectsToStorage() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.projects));
    this.loadProjects();
  }

  saveCurrent() {
    if (!this.htmlCode.trim()) {
      this.showToast('الكود فارغ', 'error');
      return;
    }

    if (this.currentProjectID) {
      const idx = this.projects.findIndex(p => p.id === this.currentProjectID);
      if (idx !== -1) {
        this.projects[idx].code = this.htmlCode;
        this.projects[idx].date = new Date().toISOString();
        this.saveProjectsToStorage();
        this.isUnsaved = false;
        this.showToast('تم حفظ التغييرات', 'success');
        return;
      }
    }

    const name = prompt('اسم المشروع:', this.currentProjectName.replace(' *', ''));
    if (!name) return;
    const newP: HtmlProject = {
      id: Date.now().toString(),
      name,
      code: this.htmlCode,
      date: new Date().toISOString()
    };
    this.projects.push(newP);
    this.saveProjectsToStorage();
    this.currentProjectID = newP.id;
    this.currentProjectName = name;
    this.isUnsaved = false;
    this.showToast('تم الحفظ', 'success');
  }

  loadProject(id: string) {
    const p = this.projects.find(x => x.id === id);
    if (p) {
      this.htmlCode = p.code;
      this.currentProjectID = p.id;
      this.currentProjectName = p.name;
      this.isUnsaved = false;
      this.updatePreview();
      this.initHistory();
    }
  }

  deleteProject(id: string, e: MouseEvent) {
    e.stopPropagation();
    if (confirm('حذف نهائي؟')) {
      this.projects = this.projects.filter(p => p.id !== id);
      this.saveProjectsToStorage();
      if (this.currentProjectID === id) {
        this.currentProjectID = null;
        this.currentProjectName = 'مشروع غير محفوظ';
        this.isUnsaved = true;
      }
      this.showToast('تم الحذف');
    }
  }

  renameProject() {
    if (!this.currentProjectID) {
      this.showToast('احفظ المشروع أولاً', 'error');
      return;
    }
    const project = this.projects.find(p => p.id === this.currentProjectID);
    if (project) {
      const newName = prompt('الاسم الجديد:', project.name);
      if (newName && newName !== project.name) {
        project.name = newName;
        this.saveProjectsToStorage();
        this.currentProjectName = newName;
        this.showToast('تم تغيير الاسم', 'success');
      }
    }
  }

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  toggleWrap() {
    this.isWrapped = !this.isWrapped;
    this.showToast(this.isWrapped ? 'تم تفعيل التفاف النص' : 'تم إلغاء التفاف النص');
  }

  async copyCode() {
    try {
      await navigator.clipboard.writeText(this.htmlCode);
      this.showToast('تم نسخ الكود بنجاح', 'success');
    } catch {
      this.showToast('فشل النسخ تلقائياً', 'error');
    }
  }

  async pasteCode() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        this.htmlCode = text;
        this.updatePreview();
        this.recordHistory();
        this.isUnsaved = true;
        this.showToast('تم اللصق', 'success');
      }
    } catch {
      this.showToast('الصق يدوياً (Ctrl+V)', 'error');
    }
  }

  onFileImport(e: any) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev: any) => {
      if (confirm('استبدال الكود الحالي؟')) {
        this.htmlCode = ev.target.result;
        this.currentProjectID = null;
        this.currentProjectName = file.name;
        this.isUnsaved = true;
        this.updatePreview();
        this.initHistory();
        this.showToast(`تم استيراد: ${file.name}`, 'success');
      }
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  }

  openFullscreen() {
    const win = window.open('', '_blank');
    if (win) {
      win.document.open();
      win.document.write(this.htmlCode);
      win.document.close();
    }
  }

  formatCode() {
    this.showToast('تم ترتيب الكود', 'success');
    this.recordHistory();
  }

  loadTemplate(type: string) {
    if (this.htmlCode.trim().length < 10 || confirm('استبدال بالكود الجاهز؟')) {
      this.htmlCode = this.templates[type] || '';
      this.updatePreview();
      this.initHistory();
      this.isUnsaved = true;
      this.showToast('تم', 'success');
      if (window.innerWidth < 768) this.isSidebarCollapsed = true;
    }
  }

  toggleSearch() {
    this.isSearchActive = !this.isSearchActive;
    if (this.isSearchActive) {
      setTimeout(() => this.findInput?.nativeElement?.focus(), 50);
    } else {
      this.editorArea?.nativeElement?.focus();
    }
  }

  closeSearch() {
    this.isSearchActive = false;
    this.editorArea?.nativeElement?.focus();
  }

  findNext() {
    if (!this.findQuery || !this.editorArea) return;
    const el = this.editorArea.nativeElement;
    const val = this.htmlCode;
    let idx = val.indexOf(this.findQuery, el.selectionEnd);
    if (idx === -1) idx = val.indexOf(this.findQuery, 0);
    if (idx !== -1) {
      el.setSelectionRange(idx, idx + this.findQuery.length);
      el.focus();
      const lines = val.substr(0, idx).split('\n').length;
      el.scrollTop = (lines - 5) * 20;
    } else {
      this.showToast('غير موجود', 'error');
    }
  }

  replaceOne() {
    if (!this.findQuery || !this.editorArea) return;
    const el = this.editorArea.nativeElement;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selectedText = this.htmlCode.substring(start, end);
    
    if (selectedText === this.findQuery) {
      this.htmlCode = this.htmlCode.substring(0, start) + this.replaceQuery + this.htmlCode.substring(end);
      setTimeout(() => {
        el.setSelectionRange(start, start + this.replaceQuery.length);
        el.focus();
      }, 0);
      this.updatePreview();
      this.recordHistory();
      this.isUnsaved = true;
      this.findNext();
    } else {
      this.findNext();
    }
  }

  replaceAll() {
    if (!this.findQuery) return;
    this.htmlCode = this.htmlCode.split(this.findQuery).join(this.replaceQuery);
    this.updatePreview();
    this.recordHistory();
    this.isUnsaved = true;
    this.showToast('تم الاستبدال');
  }

  newProject() {
    if (confirm('مشروع جديد؟')) {
      this.htmlCode = this.defaultCode;
      this.currentProjectID = null;
      this.currentProjectName = 'جديد';
      this.isUnsaved = true;
      this.updatePreview();
      this.initHistory();
    }
  }

  clearCode() {
    if (confirm('مسح؟')) {
      this.htmlCode = '';
      this.updatePreview();
      this.recordHistory();
      this.isUnsaved = true;
    }
  }

  downloadFile() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([this.htmlCode], { type: 'text/html' }));
    a.download = (this.currentProjectName.replace('*', '').trim() || 'page') + '.html';
    a.click();
  }

  onEditorInput() {
    this.updatePreview();
    this.isUnsaved = true;
    if (!this.isInternalChange) this.recordHistory();
  }
}
