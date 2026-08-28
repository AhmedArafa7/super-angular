import { Component, OnInit, OnDestroy, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DocsService } from './docs.service';
import { SuperDocument } from './docs.model';
import { GlobalStateService } from '../../core/services/global-state.service';
import { FirebaseService } from '../../core/services/firebase.service';
import { RichEditorComponent } from '../../shared/components/rich-editor/rich-editor.component';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

@Component({
  selector: 'app-docs',
  standalone: true,
  imports: [CommonModule, FormsModule, RichEditorComponent],
  templateUrl: './docs.component.html',
  styleUrls: ['./docs.component.scss']
})
export class DocsComponent implements OnInit, OnDestroy {
  private docsService = inject(DocsService);
  private globalState = inject(GlobalStateService);
  private firebaseService = inject(FirebaseService);

  documents: SuperDocument[] = [];
  selectedDoc: SuperDocument | null = null;
  searchQuery: string = '';
  isSaving: boolean = false;
  isPro: boolean = false;
  
  // Document statistics (emitted by child editor)
  wordCount = 0;
  charCount = 0;
  readTime = 0;

  private saveSubject = new Subject<void>();
  private subscriptions: Subscription = new Subscription();

  constructor() {
    // React to Pro status changes reactively
    effect(() => {
      this.isPro = this.globalState.userProfile().isPro;
      if (this.isPro) {
        this.runMigration();
      }
    });
  }

  ngOnInit() {
    this.loadDocs();

    // Auto-save debouncing setup (1 second delay after typing stops)
    this.subscriptions.add(
      this.saveSubject.pipe(debounceTime(1000)).subscribe(() => {
        this.autoSave();
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    // Save current active document before exiting
    if (this.selectedDoc) {
      this.autoSave();
    }
  }

  async loadDocs() {
    try {
      this.documents = await this.docsService.getDocuments();

      const preloaded = sessionStorage.getItem('super_doc_preload');
      if (preloaded) {
        sessionStorage.removeItem('super_doc_preload');
        const paragraphs = preloaded.split('\n').filter(p => p.trim()).map(p => `<p>${p}</p>`).join('');
        const newDoc: SuperDocument = {
          id: 'doc_' + Math.random().toString(36).substring(2, 9),
          title: 'مستند مستخرج من صورة (OCR)',
          content: paragraphs || `<p>${preloaded}</p>`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          wordCount: 0,
          characterCount: 0,
          isSynced: false
        };
        this.documents.unshift(newDoc);
        this.selectDoc(newDoc);
        await this.docsService.saveDocument(newDoc);
        return;
      }

      if (this.documents.length > 0 && !this.selectedDoc) {
        this.selectDoc(this.documents[0]);
      }
    } catch (err) {
      console.error('Failed to load documents', err);
    }
  }

  selectDoc(doc: SuperDocument) {
    if (this.selectedDoc && this.selectedDoc.id !== doc.id) {
      // Save current document before switching
      this.autoSave();
    }
    this.selectedDoc = doc;
  }

  async createNewDoc() {
    const newDoc: SuperDocument = {
      id: 'doc_' + Math.random().toString(36).substring(2, 9),
      title: 'مستند بدون عنوان',
      content: '<p>ابدأ الكتابة هنا...</p>',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      wordCount: 0,
      characterCount: 0,
      isSynced: false
    };

    this.documents.unshift(newDoc);
    this.selectDoc(newDoc);
    await this.docsService.saveDocument(newDoc);
  }

  async deleteDoc(id: string, event: MouseEvent) {
    event.stopPropagation();
    if (!confirm('هل أنت متأكد من رغبتك في حذف هذا المستند؟')) return;

    try {
      await this.docsService.deleteDocument(id);
      this.documents = this.documents.filter(d => d.id !== id);
      
      if (this.selectedDoc?.id === id) {
        this.selectedDoc = null;
        if (this.documents.length > 0) {
          this.selectDoc(this.documents[0]);
        }
      }
    } catch (err) {
      console.error('Failed to delete document', err);
    }
  }

  onTitleInput() {
    if (this.selectedDoc) {
      this.selectedDoc.updatedAt = Date.now();
      this.isSaving = true;
      this.saveSubject.next();
    }
  }

  onContentChange(html: string) {
    if (this.selectedDoc) {
      this.selectedDoc.content = html;
      this.selectedDoc.wordCount = this.wordCount;
      this.selectedDoc.characterCount = this.charCount;
      this.selectedDoc.updatedAt = Date.now();
      
      // Trigger debounced save
      this.isSaving = true;
      this.saveSubject.next();
    }
  }

  onStatsChange(stats: { wordCount: number; charCount: number; readTime: number }) {
    this.wordCount = stats.wordCount;
    this.charCount = stats.charCount;
    this.readTime = stats.readTime;
  }

  async autoSave() {
    if (!this.selectedDoc) return;
    try {
      await this.docsService.saveDocument(this.selectedDoc);
    } catch (err) {
      console.error('Auto save failed', err);
    } finally {
      this.isSaving = false;
    }
  }

  // Export options
  exportTxt() {
    if (!this.selectedDoc) return;
    // Strip HTML tags using simple regex to get plain text
    const text = this.selectedDoc.content.replace(/<[^>]*>/g, ' ');
    this.downloadFile(text, `${this.selectedDoc.title}.txt`, 'text/plain');
  }

  exportHtml() {
    if (!this.selectedDoc) return;
    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>${this.selectedDoc.title}</title>
        <style>
          body { font-family: sans-serif; padding: 40px; background-color: #fff; color: #333; line-height: 1.6; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          table, th, td { border: 1px solid #ddd; padding: 12px; text-align: right; }
          img { max-width: 100%; border-radius: 8px; }
        </style>
      </head>
      <body>
        <h1>${this.selectedDoc.title}</h1>
        <hr>
        ${this.selectedDoc.content}
      </body>
      </html>
    `;
    this.downloadFile(htmlContent, `${this.selectedDoc.title}.html`, 'text/html');
  }

  exportPdf() {
    window.print();
  }

  private downloadFile(content: string, filename: string, contentType: string) {
    const a = document.createElement('a');
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = filename;
    a.click();
  }

  // Pro Migration execution
  async runMigration() {
    try {
      const count = await this.docsService.migrateLocalToCloud();
      if (count > 0) {
        console.log(`Successfully migrated ${count} local documents to the cloud.`);
        this.loadDocs(); // reload to refresh sync badges
      }
    } catch (err) {
      console.error('Migration failed', err);
    }
  }

  get filteredDocs(): SuperDocument[] {
    if (!this.searchQuery.trim()) return this.documents;
    return this.documents.filter(d => 
      d.title.toLowerCase().includes(this.searchQuery.toLowerCase()) || 
      d.content.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  }
}
