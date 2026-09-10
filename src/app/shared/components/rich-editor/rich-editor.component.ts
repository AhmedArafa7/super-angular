import { Component, OnInit, OnChanges, SimpleChanges, Input, Output, EventEmitter, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiKeyManagerService } from '../../../core/services/ai-key-manager.service';

@Component({
  selector: 'app-rich-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rich-editor.component.html',
  styleUrls: ['./rich-editor.component.scss']
})
export class RichEditorComponent implements OnInit, OnChanges {
  @Input() content: string = '';
  @Input() placeholder: string = 'ابدأ الكتابة هنا...';
  @Input() isPro: boolean = false;

  @Output() contentChange = new EventEmitter<string>();
  @Output() statsChange = new EventEmitter<{ wordCount: number; charCount: number; readTime: number }>();
  @Output() saveTrigger = new EventEmitter<void>();

  @ViewChild('editor') editorEl!: ElementRef;

  private aiKeyManager = inject(AiKeyManagerService);

  wordCount = 0;
  charCount = 0;
  readTime = 0;

  // AI Modal states
  showAiModal = false;
  aiActionType = '';
  aiPromptText = '';
  aiResultText = '';
  isAiLoading = false;

  ngOnInit() {
    this.updateCounts();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['content'] && !changes['content'].firstChange) {
      const newContent = changes['content'].currentValue;
      if (this.editorEl && this.editorEl.nativeElement && this.editorEl.nativeElement.innerHTML !== newContent) {
        this.editorEl.nativeElement.innerHTML = newContent || '<p><br></p>';
        this.updateCounts();
      }
    }
  }

  onEditorInput() {
    this.updateCounts();
    if (this.editorEl) {
      const html = this.editorEl.nativeElement.innerHTML;
      this.contentChange.emit(html);
    }
  }

  updateCounts() {
    if (!this.editorEl) return;
    const text = this.editorEl.nativeElement.innerText || '';
    this.charCount = text.length;
    this.wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
    this.readTime = Math.ceil(this.wordCount / 200); // 200 words per minute average reading speed

    this.statsChange.emit({
      wordCount: this.wordCount,
      charCount: this.charCount,
      readTime: this.readTime
    });
  }

  // Executing rich-text command
  executeFormat(command: string, value: string = '') {
    document.execCommand(command, false, value);
    if (this.editorEl) {
      this.editorEl.nativeElement.focus();
    }
    this.onEditorInput();
  }

  insertLink() {
    const url = prompt('أدخل رابط URL:', 'https://');
    if (url) {
      this.executeFormat('createLink', url);
    }
  }

  insertImage() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event: any) => {
          const imgHtml = `<img src="${event.target.result}" style="max-width:100%; border-radius:12px; margin:15px 0; box-shadow: 0 10px 20px rgba(0,0,0,0.15);" />`;
          this.insertHtmlAtCursor(imgHtml);
        };
        reader.readAsDataURL(file);
      }
    };
    fileInput.click();
  }

  insertTable() {
    const size = prompt('أدخل حجم الجدول (صفوف × أعمدة، مثال: 3x3):', '3x3');
    if (!size) return;

    const [rows, cols] = size.toLowerCase().split('x').map(Number);
    if (isNaN(rows) || isNaN(cols)) {
      alert('الأبعاد المدخلة غير صحيحة، يرجى كتابتها بالصيغة الصحيحة (مثل: 3x3)');
      return;
    }

    let tableHtml = '<table style="width:100%; border-collapse:collapse; margin:15px 0; border:1px solid rgba(255,255,255,0.1);">';
    for (let r = 0; r < rows; r++) {
      tableHtml += '<tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">';
      for (let c = 0; c < cols; c++) {
        tableHtml += `<td style="border: 1px solid rgba(255,255,255,0.1); padding:10px; min-width:60px; color:inherit;">${r === 0 ? 'عنوان' : 'خلية'}</td>`;
      }
      tableHtml += '</tr>';
    }
    tableHtml += '</table><p><br></p>';
    this.insertHtmlAtCursor(tableHtml);
  }

  insertHtmlAtCursor(html: string) {
    const sel = window.getSelection();
    if (sel && sel.rangeCount) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const el = document.createElement('div');
      el.innerHTML = html;
      const frag = document.createDocumentFragment();
      let node, lastNode;
      while ((node = el.firstChild)) {
        lastNode = frag.appendChild(node);
      }
      range.insertNode(frag);
      if (lastNode) {
        range.setStartAfter(lastNode);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
    this.onEditorInput();
  }

  changeFontColor(event: any) {
    this.executeFormat('foreColor', event.target.value);
  }

  changeBgColor(event: any) {
    this.executeFormat('hiliteColor', event.target.value);
  }

  // AI Neuro features
  openAiAssist(action: string) {
    this.aiActionType = action;
    this.aiResultText = '';
    
    // Auto-grab selected text if available
    let selectedText = '';
    if (typeof window !== 'undefined') {
      const selection = window.getSelection();
      if (selection && selection.toString().trim()) {
        selectedText = selection.toString().trim();
      }
    }

    if (selectedText) {
      this.aiPromptText = selectedText;
    } else if (this.editorEl?.nativeElement?.innerText) {
      const fullText = this.editorEl.nativeElement.innerText.trim();
      this.aiPromptText = fullText.length < 1200 ? fullText : fullText.substring(0, 1200) + '...';
    } else {
      this.aiPromptText = '';
    }

    this.showAiModal = true;
  }

  async generateAiResponse() {
    if (!this.aiKeyManager.hasActiveKey()) {
      this.aiResultText = '⚠️ يرجى تفعيل مفتاح المنصة أو إدخال مفتاح Gemini API في الإعدادات.';
      return;
    }

    const prompt = (this.aiPromptText || this.editorEl?.nativeElement?.innerText || '').trim();
    if (!prompt) {
      this.aiResultText = '⚠️ يرجى كتابة أو تحديد النص المراد معالجته أولاً.';
      return;
    }

    this.isAiLoading = true;
    this.aiResultText = '';

    let instruction = '';
    if (this.aiActionType === 'rewrite') {
      instruction = `أنت محرر نصوص وكاتب بليغ محترف. أعد صياغة النص التالي بأسلوب احترافي، قوي، وواضح مع الحفاظ على المعنى الأصلي دون أي مقدمات أو هوامش إضافية:\n\n"${prompt}"`;
    } else if (this.aiActionType === 'summarize') {
      instruction = `أنت مساعد تلخيص تنفيذي ذكي. لخص النص التالي في نقاط موجزة وأهم الأفكار والمخرجات الأساسية:\n\n"${prompt}"`;
    } else if (this.aiActionType === 'grammar') {
      instruction = `أنت مدقق لغوي ونحوي وإملائي محترف. قم بفحص النص التالي وتصحيح أي أخطاء لغوية أو نحوية أو إملائية أو علامات ترقيم، ثم أعد النص بعد التصحيح متبوعاً بقائمة سريعة ومختصرة بأبرز التعديلات إن وجدت:\n\n"${prompt}"`;
    }

    try {
      const res = await this.aiKeyManager.callGeminiApi({
        model: 'gemini-2.5-flash',
        prompt: instruction
      });

      if (res.ok && res.text) {
        this.aiResultText = res.text.trim();
      } else {
        this.aiResultText = `⚠️ حدث خطأ أثناء المعالجة: ${res.error || 'لم يتم استلام رد من النموذج'}`;
      }
    } catch (e: any) {
      this.aiResultText = `⚠️ تعذر الاتصال بمحرك الذكاء الاصطناعي: ${e.message || 'خطأ غير معروف'}`;
    } finally {
      this.isAiLoading = false;
    }
  }

  insertAiResult() {
    if (this.aiResultText) {
      const formattedHtml = `<div style="background: rgba(99, 102, 241, 0.08); border-left: 4px solid #6366f1; padding: 15px; border-radius: 8px; margin: 15px 0;">${this.aiResultText.replace(/\n/g, '<br>')}</div><p><br></p>`;
      this.insertHtmlAtCursor(formattedHtml);
      this.showAiModal = false;
    }
  }
}
