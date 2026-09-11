import { Component, input, output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  LucideAngularModule, Pin, Trash2, Settings, Copy, Check, 
  Code, Binary, Pencil, RotateCcw, Sparkles, X, MoveHorizontal, WrapText,
  SlidersHorizontal, Plus, ArrowUp, ArrowDown
} from 'lucide-angular';
import { VideoNote, CustomTextRule } from '../../models/local-player.models';
import { OcrCleanerService } from '../../services/ocr-cleaner.service';

@Component({
  selector: 'app-notes-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  host: { class: 'block' },
  styles: [`
    .custom-scrollbar-h::-webkit-scrollbar {
      height: 6px;
    }
    .custom-scrollbar-h::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.25);
      border-radius: 4px;
    }
    .custom-scrollbar-h::-webkit-scrollbar-thumb {
      background: rgba(20, 184, 166, 0.4);
      border-radius: 4px;
    }
    .custom-scrollbar-h::-webkit-scrollbar-thumb:hover {
      background: rgba(20, 184, 166, 0.7);
    }
  `],
  template: `
    <!-- Notes View Controls Bar -->
    <div class="flex items-center justify-between px-1 pb-2 shrink-0 text-[11px] text-slate-400 gap-2 flex-wrap">
      <span class="font-bold flex items-center gap-1 text-slate-300">
        <span>الملاحظات ({{ sortedNotes().length }})</span>
      </span>
      <div class="flex items-center gap-1.5 flex-wrap">
        <button (click)="openRulesModal()" 
                class="px-2.5 py-1 rounded-xl font-bold transition flex items-center gap-1.5 border text-xs bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border-indigo-500/30 active:scale-95 shadow-sm"
                title="إدارة وتخصيص قواعد تنقية النصوص واستبدال Regex">
          <lucide-icon [img]="SlidersHorizontal" class="size-3.5 text-indigo-400"></lucide-icon>
          <span>قواعد التنقية ({{ activeRulesCount() }})</span>
        </button>
        <button (click)="toggleWordWrap()" 
                class="px-2.5 py-1 rounded-xl font-bold transition flex items-center gap-1.5 border text-xs active:scale-95"
                [ngClass]="isWordWrap() ? 'bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border-teal-500/30 shadow-sm shadow-teal-500/10' : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'"
                [title]="isWordWrap() ? 'النمط الحالي: التفاف الأسطر مفعّل. انقر للتبديل إلى سطر كامل ممتد مع شريط تمرير أفقي' : 'النمط الحالي: سطر كامل مع شريط تمرير. انقر للتبديل إلى التفاف الأسطر الطبيعي'">
          <lucide-icon [img]="isWordWrap() ? WrapText : MoveHorizontal" class="size-3.5 text-teal-400"></lucide-icon>
          <span>{{ isWordWrap() ? '↵ التفاف الأسطر' : '↔ سطر ممتد' }}</span>
        </button>
      </div>
    </div>

    <!-- Notes List (Flows naturally in parent scroll container) -->
    <div class="space-y-3">
      @if (sortedNotes().length > 0) {
        @for (note of sortedNotes(); track note.id) {
           <div class="p-3.5 rounded-2xl bg-black/40 border transition-all flex flex-col gap-2.5 cursor-pointer hover:border-teal-500/50 group"
                (click)="noteClick.emit(note)"
                [ngClass]="note.videoId === currentVideoId() ? 'border-teal-500/40' : 'border-white/10'">
             
             <!-- Header Bar: badges & actions -->
             <div class="flex items-center justify-between gap-2">
               <div class="flex items-center gap-1.5 flex-wrap">
                  <span *ngIf="note.isPinned" class="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">📌 مثبتة</span>
                  <span *ngIf="note.images.length > 0" class="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">📷 OCR / لقطة</span>
                  <span *ngIf="note.videoId === currentVideoId()" class="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 font-bold">فيديو حالي</span>
                  <span *ngIf="note.videoId === null" class="text-[10px] px-1.5 py-0.5 rounded bg-slate-500/20 text-slate-400 font-bold">بدون فيديو</span>
                  <span *ngIf="note.videoName" class="text-[10px] text-slate-400 truncate max-w-[120px]">{{ note.videoName }}</span>
               </div>
               <div class="flex items-center gap-1 shrink-0" (click)="$event.stopPropagation()">
                  <button (click)="copyNoteText(note, $event)" class="p-1.5 text-slate-400 hover:text-teal-300 hover:bg-white/10 rounded-lg transition" [title]="copiedNoteId === note.id ? 'تم النسخ!' : 'نسخ النص'">
                    <lucide-icon [img]="copiedNoteId === note.id ? Check : Copy" class="size-3.5" [class.text-teal-400]="copiedNoteId === note.id"></lucide-icon>
                  </button>
                  <button (click)="startInlineEdit(note, $event)" class="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-white/10 rounded-lg transition" title="تعديل يدوي سريع"><lucide-icon [img]="Pencil" class="size-3.5"></lucide-icon></button>
                  <button (click)="editNote.emit(note)" class="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-white/10 rounded-lg transition" title="خيارات إضافية"><lucide-icon [img]="Settings" class="size-3.5"></lucide-icon></button>
                  <button (click)="deleteNote.emit(note.id)" class="p-1.5 text-slate-400 hover:text-red-400 hover:bg-white/10 rounded-lg transition" title="حذف"><lucide-icon [img]="Trash2" class="size-3.5"></lucide-icon></button>
                  <button (click)="togglePin.emit(note)" class="p-1.5 text-slate-400 hover:text-amber-300 hover:bg-white/10 rounded-lg transition" title="تثبيت"><lucide-icon [img]="Pin" class="size-3.5"></lucide-icon></button>
               </div>
             </div>

            <!-- Inline Editing Mode -->
            @if (editingInlineNoteId() === note.id) {
              <div class="flex flex-col gap-2" (click)="$event.stopPropagation()">
                <textarea 
                  [ngModel]="inlineEditText()"
                  (ngModelChange)="inlineEditText.set($event)"
                  rows="7"
                  [dir]="hasArabic(inlineEditText()) ? 'rtl' : 'ltr'"
                  [class.text-right]="hasArabic(inlineEditText())"
                  [class.text-left]="!hasArabic(inlineEditText())"
                  [wrap]="isWordWrap() ? 'soft' : 'off'"
                  class="w-full bg-black/60 border border-teal-500/50 rounded-xl p-3 text-xs text-white placeholder:text-slate-500 focus:outline-none font-mono resize-y leading-relaxed custom-scrollbar select-text"
                  [ngClass]="isWordWrap() ? 'whitespace-pre-wrap' : 'whitespace-pre overflow-x-auto custom-scrollbar-h'"></textarea>
                <div class="flex items-center justify-end gap-2">
                  <button (click)="cancelInlineEdit()" class="px-3 py-1 bg-white/10 hover:bg-white/20 text-slate-300 rounded-lg text-xs font-bold transition">إلغاء</button>
                  <button (click)="saveInlineEdit(note)" class="px-3 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold transition">حفظ التعديل ✓</button>
                </div>
              </div>
            } @else {
              <!-- Note Text with readable font, preserved lines & smart direction -->
              <div class="text-xs text-slate-200 leading-relaxed select-text font-mono bg-black/40 p-3 rounded-xl border border-white/5 transition-all" 
                   [ngClass]="isWordWrap() ? 'whitespace-pre-wrap' : 'whitespace-pre overflow-x-auto custom-scrollbar-h'"
                   [style.color]="note.textColor || 'inherit'"
                   [dir]="hasArabic(note.text) ? 'rtl' : 'ltr'"
                   [class.text-right]="hasArabic(note.text)"
                   [class.text-left]="!hasArabic(note.text)">
                {{ note.text }}
              </div>
            }

            <!-- Smart Operations & Filters Toolbar -->
            <div class="flex items-center flex-wrap gap-1.5 pt-0.5" (click)="$event.stopPropagation()">
              <button (click)="applyCodeClean(note, $event)" 
                      class="px-2 py-1 bg-teal-500/15 hover:bg-teal-500/30 text-teal-300 border border-teal-500/25 rounded-lg text-[10px] font-bold flex items-center gap-1 transition active:scale-95" 
                      title="تنقية الكود وحذف أرقام الأسطر والرموز ومخلفات المحرر مع تطبيق القواعد الفعالة">
                <lucide-icon [img]="Code" class="size-3 text-teal-400"></lucide-icon>
                <span>تنقية كود</span>
              </button>

              <button (click)="applyCustomRulesToNote(note, $event)" 
                      class="px-2 py-1 bg-indigo-500/15 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/25 rounded-lg text-[10px] font-bold flex items-center gap-1 transition active:scale-95" 
                      title="تطبيق القواعد المخصصة فقط على هذه الملاحظة">
                <lucide-icon [img]="SlidersHorizontal" class="size-3 text-indigo-400"></lucide-icon>
                <span>تطبيق القواعد ({{ activeRulesCount() }})</span>
              </button>

              <button (click)="applyRemoveNumbers(note, $event)" 
                      class="px-2 py-1 bg-white/5 hover:bg-white/15 text-slate-300 border border-white/10 rounded-lg text-[10px] font-bold flex items-center gap-1 transition active:scale-95" 
                      title="حذف جميع الأرقام من النص">
                <lucide-icon [img]="Binary" class="size-3 text-amber-400"></lucide-icon>
                <span>حذف الأرقام</span>
              </button>

              <button (click)="applyRemoveBlankLines(note, $event)" 
                      class="px-2 py-1 bg-white/5 hover:bg-white/15 text-slate-300 border border-white/10 rounded-lg text-[10px] font-bold flex items-center gap-1 transition active:scale-95" 
                      title="إزالة الأسطر الفارغة والمسافات الزائدة">
                <span>✂️ تقليص الفراغات</span>
              </button>

              <button (click)="applyKeepLatinOnly(note, $event)" 
                      class="px-2 py-1 bg-white/5 hover:bg-white/15 text-slate-300 border border-white/10 rounded-lg text-[10px] font-bold flex items-center gap-1 transition active:scale-95" 
                      title="إبقاء الكود والإنجليزي فقط وحذف أي حروف عربية مشوهة">
                <span>🔤 كود فقط</span>
              </button>

              <button *ngIf="note.originalText && note.originalText !== note.text" 
                      (click)="applyRestoreOriginal(note, $event)" 
                      class="px-2 py-1 bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/25 rounded-lg text-[10px] font-bold flex items-center gap-1 transition active:scale-95" 
                      title="استعادة النص الأصلي قبل الفلاتر والتعديل">
                <lucide-icon [img]="RotateCcw" class="size-3 text-amber-400"></lucide-icon>
                <span>استعادة الأصلي</span>
              </button>
            </div>
            
            <div *ngIf="note.timestampInVideo !== null" class="text-[10px] text-teal-400 font-mono">🕒 {{ formatTime(note.timestampInVideo) }}</div>
            
            <!-- Images -->
            <div *ngIf="note.images.length > 0" class="flex gap-2 overflow-x-auto">
              @for (img of note.images; track img.id) {
                  <img [src]="img.dataUrl" class="size-16 object-cover rounded-lg cursor-pointer hover:opacity-80 transition" (click)="imageClick.emit()" />
              }
            </div>

            <!-- Audio -->
            <div *ngIf="note.audio">
              <audio controls [src]="note.audio.dataUrl" class="h-8 w-full"></audio>
            </div>
          </div>
        }
      } @else {
        <div class="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
          <p class="text-xs font-bold text-slate-400">لا توجد ملاحظات</p>
        </div>
      }
    </div>

    <!-- Rules Manager Modal -->
    <div *ngIf="showRulesModal()" 
         class="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
         (click)="closeRulesModal()">
      <div (click)="$event.stopPropagation()" 
           class="bg-slate-900 border border-white/10 rounded-2xl max-w-3xl w-full p-4 sm:p-6 flex flex-col gap-4 shadow-2xl my-auto text-slate-200 select-text max-h-[90vh] overflow-y-auto custom-scrollbar"
           dir="rtl">
        
        <!-- Modal Header -->
        <div class="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div class="flex items-center gap-2.5">
            <div class="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shrink-0">
              <lucide-icon [img]="SlidersHorizontal" class="size-5"></lucide-icon>
            </div>
            <div>
              <h3 class="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                <span>قواعد تنقية واستبدال النصوص</span>
                <span class="text-[11px] font-normal px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                  {{ activeRulesCount() }} مفعلة من {{ customRules().length }}
                </span>
              </h3>
              <p class="text-[11px] text-slate-400">خصص قواعد واستبدالات (Regex / نص عادي) لتنقية الكود والنصوص المستخرجة بدقة فائقة</p>
            </div>
          </div>

          <div class="flex items-center gap-1.5">
            <button (click)="startAddRule()" 
                    *ngIf="!showRuleForm()"
                    class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-lg shadow-indigo-600/20 active:scale-95">
              <lucide-icon [img]="Plus" class="size-3.5"></lucide-icon>
              <span>إضافة قاعدة</span>
            </button>
            <button (click)="resetDefaultRules()" 
                    class="p-2 text-slate-400 hover:text-amber-400 hover:bg-white/5 rounded-xl transition"
                    title="استعادة القواعد الافتراضية">
              <lucide-icon [img]="RotateCcw" class="size-4"></lucide-icon>
            </button>
            <button (click)="closeRulesModal()" 
                    class="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition">
              <lucide-icon [img]="X" class="size-4"></lucide-icon>
            </button>
          </div>
        </div>

        <!-- Add / Edit Rule Form -->
        <div *ngIf="showRuleForm()" class="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/40 flex flex-col gap-3 shrink-0 animate-fade-in">
          <div class="flex items-center justify-between">
            <h4 class="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
              <span>{{ editingRuleId() ? '✏️ تعديل القاعدة' : '➕ إضافة قاعدة جديدة' }}</span>
            </h4>
            <button (click)="cancelRuleForm()" class="text-slate-400 hover:text-white text-xs">إلغاء ✕</button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="flex flex-col gap-1">
              <label class="text-[11px] font-bold text-slate-300">اسم القاعدة <span class="text-red-400">*</span></label>
              <input type="text" [(ngModel)]="ruleFormName" placeholder="مثال: حذف أسطر القوائم العلوية" 
                     class="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-[11px] font-bold text-slate-300">الوصف (اختياري)</label>
              <input type="text" [(ngModel)]="ruleFormDescription" placeholder="مثال: إزالة تبويبات الحل والأشرطة" 
                     class="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition" />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="flex flex-col gap-1">
              <label class="text-[11px] font-bold text-slate-300">النمط / النص المبحوث عنه <span class="text-red-400">*</span></label>
              <input type="text" [(ngModel)]="ruleFormPattern" dir="ltr" placeholder="مثال: ^\\s*\\d+\\s+ أو Fry" 
                     class="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition text-left" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-[11px] font-bold text-slate-300">النص البديل (اتركه فارغاً للحذف)</label>
              <input type="text" [(ngModel)]="ruleFormReplacement" dir="ltr" placeholder="اتركه فارغاً للحذف، أو اكتب البديل" 
                     class="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition text-left" />
            </div>
          </div>

          <div class="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-white/10">
            <div class="flex items-center gap-4 text-xs text-slate-300">
              <label class="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" [(ngModel)]="ruleFormIsRegex" class="rounded accent-indigo-500 cursor-pointer" />
                <span>تعبير نمطي (Regex)</span>
              </label>
              <label class="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" [(ngModel)]="ruleFormCaseSensitive" class="rounded accent-indigo-500 cursor-pointer" />
                <span>حساس لحالة الأحرف (Case Sensitive)</span>
              </label>
            </div>
            <div class="flex items-center gap-2">
              <button (click)="cancelRuleForm()" class="px-3 py-1.5 bg-white/10 hover:bg-white/15 text-slate-300 rounded-xl text-xs font-bold transition">
                إلغاء
              </button>
              <button (click)="saveRuleForm()" class="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1">
                <lucide-icon [img]="Check" class="size-3.5"></lucide-icon>
                <span>حفظ القاعدة</span>
              </button>
            </div>
          </div>

          <div *ngIf="ruleFormErrorMessage()" class="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-2 font-mono text-center">
            {{ ruleFormErrorMessage() }}
          </div>
        </div>

        <!-- Live Sandbox / Test Playground -->
        <div class="p-3.5 rounded-2xl bg-black/50 border border-white/10 flex flex-col gap-2.5 shrink-0">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold text-teal-300 flex items-center gap-1">
                <span>🧪 مختبر التجربة الفورية (Live Test Sandbox)</span>
              </span>
              <span class="text-[10px] text-slate-400">جرب أثر القواعد في الوقت الفعلي</span>
            </div>
            <div class="flex items-center gap-2">
              <button (click)="loadSampleText()" 
                      class="px-2.5 py-1 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/30 rounded-lg text-[10px] font-bold transition active:scale-95"
                      title="تحميل عينة OCR من شاشة Visual Studio لاختبار القواعد">
                <span>📋 عينة Visual Studio</span>
              </button>
              <div class="flex bg-white/5 rounded-lg p-0.5 border border-white/10 text-[10px]">
                <button (click)="testMode.set('fullClean')" 
                        [class.bg-teal-600]="testMode() === 'fullClean'" 
                        [class.text-white]="testMode() === 'fullClean'"
                        class="px-2 py-0.5 rounded text-slate-400 transition">
                  تنقية شاملة + قواعد
                </button>
                <button (click)="testMode.set('rulesOnly')" 
                        [class.bg-indigo-600]="testMode() === 'rulesOnly'" 
                        [class.text-white]="testMode() === 'rulesOnly'"
                        class="px-2 py-0.5 rounded text-slate-400 transition">
                  القواعد فقط
                </button>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <!-- Input Area -->
            <div class="flex flex-col gap-1">
              <div class="flex items-center justify-between text-[11px] text-slate-400">
                <span>النص التجريبي (قبل التنقية):</span>
                <button *ngIf="testInputText()" (click)="testInputText.set('')" class="text-[10px] text-slate-500 hover:text-slate-300">مسح ✕</button>
              </div>
              <textarea 
                [ngModel]="testInputText()"
                (ngModelChange)="testInputText.set($event)"
                rows="6"
                placeholder="الصق أي نص أو كود هنا لتجربة القواعد الفعالة مباشرة..."
                dir="ltr"
                class="w-full bg-black/70 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500 font-mono resize-y leading-relaxed custom-scrollbar text-left"></textarea>
            </div>

            <!-- Output Area -->
            <div class="flex flex-col gap-1">
              <div class="flex items-center justify-between text-[11px] text-teal-300">
                <span class="font-bold">النتيجة بعد التنقية (المخرجات):</span>
                <button *ngIf="testOutputText()" (click)="copyTestOutput()" class="text-[10px] px-2 py-0.5 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 rounded font-bold transition flex items-center gap-1">
                  <lucide-icon [img]="testCopied() ? Check : Copy" class="size-3"></lucide-icon>
                  <span>{{ testCopied() ? 'تم النسخ!' : 'نسخ النتيجة' }}</span>
                </button>
              </div>
              <textarea 
                [value]="testOutputText()"
                readonly
                rows="6"
                placeholder="ستظهر النتيجة المنقحة فورياً هنا..."
                dir="ltr"
                class="w-full bg-black/70 border border-teal-500/30 rounded-xl p-2.5 text-xs text-teal-200 placeholder:text-slate-500 focus:outline-none font-mono resize-y leading-relaxed custom-scrollbar text-left"></textarea>
            </div>
          </div>
        </div>

        <!-- Rules List -->
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <h4 class="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <span>📋 قائمة القواعد ({{ customRules().length }})</span>
            </h4>
            <span class="text-[11px] text-slate-500">يتم تطبيق القواعد بالترتيب من الأعلى إلى الأسفل</span>
          </div>

          <div class="space-y-2 max-h-[320px] overflow-y-auto custom-scrollbar pr-1">
            @for (rule of customRules(); track rule.id; let idx = $index) {
              <div class="p-3 rounded-xl bg-black/40 border transition-all flex flex-col gap-2 group"
                   [ngClass]="rule.enabled ? 'border-white/10 hover:border-indigo-500/40' : 'border-white/5 opacity-60'">
                
                <!-- Rule Header -->
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2 min-w-0">
                    <!-- Enable Toggle Checkbox -->
                    <input type="checkbox" 
                           [checked]="rule.enabled" 
                           (change)="toggleRule(rule.id)"
                           class="size-4 rounded accent-indigo-500 cursor-pointer"
                           [title]="rule.enabled ? 'قاعدة مفعلة - انقر للتعطيل' : 'قاعدة معطلة - انقر للتفعيل'" />
                    
                    <span class="text-xs font-bold truncate" [class.text-white]="rule.enabled" [class.text-slate-400]="!rule.enabled">
                      {{ rule.name }}
                    </span>

                    <span *ngIf="rule.isBuiltIn" class="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">افتراضية</span>
                    <span *ngIf="!rule.isBuiltIn" class="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">مخصصة</span>
                    <span class="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400 font-mono">{{ rule.isRegex ? 'Regex' : 'نص عادي' }}</span>
                  </div>

                  <!-- Action Buttons -->
                  <div class="flex items-center gap-1 shrink-0">
                    <button (click)="moveRuleUp(idx)" [disabled]="idx === 0" 
                            class="p-1 text-slate-400 hover:text-white disabled:opacity-20 disabled:hover:text-slate-400 rounded transition" title="تحريك لأعلى">
                      <lucide-icon [img]="ArrowUp" class="size-3.5"></lucide-icon>
                    </button>
                    <button (click)="moveRuleDown(idx)" [disabled]="idx === customRules().length - 1" 
                            class="p-1 text-slate-400 hover:text-white disabled:opacity-20 disabled:hover:text-slate-400 rounded transition" title="تحريك لأسفل">
                      <lucide-icon [img]="ArrowDown" class="size-3.5"></lucide-icon>
                    </button>
                    <button (click)="startEditRule(rule)" class="p-1 text-slate-400 hover:text-indigo-400 rounded transition" title="تعديل القاعدة">
                      <lucide-icon [img]="Pencil" class="size-3.5"></lucide-icon>
                    </button>
                    <button (click)="deleteRule(rule.id)" class="p-1 text-slate-400 hover:text-red-400 rounded transition" title="حذف القاعدة">
                      <lucide-icon [img]="Trash2" class="size-3.5"></lucide-icon>
                    </button>
                  </div>
                </div>

                <!-- Description (if present) -->
                <p *ngIf="rule.description" class="text-[11px] text-slate-400 leading-snug">
                  {{ rule.description }}
                </p>

                <!-- Pattern / Replacement pill -->
                <div class="flex items-center gap-2 text-[10px] font-mono bg-black/60 p-2 rounded-lg border border-white/5 overflow-x-auto text-left" dir="ltr">
                  <span class="text-indigo-300 shrink-0 font-bold">نمط:</span>
                  <span class="text-slate-200 bg-white/5 px-1.5 py-0.5 rounded truncate max-w-[280px]" [title]="rule.pattern">{{ rule.pattern }}</span>
                  <span class="text-slate-500 shrink-0">➔</span>
                  <span class="text-emerald-300 shrink-0 font-bold">بديل:</span>
                  <span class="text-slate-200 bg-white/5 px-1.5 py-0.5 rounded truncate max-w-[150px]">
                    {{ rule.replacement === '' ? '[حذف]' : rule.replacement }}
                  </span>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="pt-3 border-t border-white/10 flex items-center justify-between shrink-0">
          <span class="text-[11px] text-slate-400">القواعد تحفظ تلقائياً في المتصفح وتعمل دون إنترنت</span>
          <button (click)="closeRulesModal()" class="px-5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition">
            إغلاق
          </button>
        </div>

      </div>
    </div>
  `
})
export class NotesTabComponent {
  private ocrCleaner = inject(OcrCleanerService);

  readonly Settings = Settings;
  readonly Trash2 = Trash2;
  readonly Pin = Pin;
  readonly Copy = Copy;
  readonly Check = Check;
  readonly Code = Code;
  readonly Binary = Binary;
  readonly Pencil = Pencil;
  readonly RotateCcw = RotateCcw;
  readonly Sparkles = Sparkles;
  readonly X = X;
  readonly MoveHorizontal = MoveHorizontal;
  readonly WrapText = WrapText;
  readonly SlidersHorizontal = SlidersHorizontal;
  readonly Plus = Plus;
  readonly ArrowUp = ArrowUp;
  readonly ArrowDown = ArrowDown;

  isWordWrap = signal<boolean>(this.loadWordWrap());

  // Custom rules state
  customRules = this.ocrCleaner.customRules;
  activeRulesCount = computed(() => this.customRules().filter(r => r.enabled).length);

  showRulesModal = signal<boolean>(false);
  showRuleForm = signal<boolean>(false);
  editingRuleId = signal<string | null>(null);

  ruleFormName = '';
  ruleFormDescription = '';
  ruleFormPattern = '';
  ruleFormReplacement = '';
  ruleFormIsRegex = true;
  ruleFormCaseSensitive = false;
  ruleFormErrorMessage = signal<string | null>(null);

  // Live Test Sandbox
  testInputText = signal<string>('');
  testMode = signal<'fullClean' | 'rulesOnly'>('fullClean');
  testCopied = signal<boolean>(false);

  testOutputText = computed(() => {
    const input = this.testInputText();
    if (!input) return '';
    if (this.testMode() === 'fullClean') {
      return this.ocrCleaner.cleanCode(input, true);
    } else {
      return this.ocrCleaner.applyCustomRules(input);
    }
  });

  private loadWordWrap(): boolean {
    try {
      const saved = localStorage.getItem('local_player_notes_word_wrap');
      if (saved !== null) {
        return saved === 'true';
      }
    } catch (e) {}
    return true; // Default: true (wrapped lines, easily readable)
  }

  toggleWordWrap() {
    const newVal = !this.isWordWrap();
    this.isWordWrap.set(newVal);
    localStorage.setItem('local_player_notes_word_wrap', String(newVal));
  }

  hasArabic(text: string): boolean {
    if (!text) return false;
    return /[\u0600-\u06FF]/.test(text);
  }

  copiedNoteId: string | null = null;
  editingInlineNoteId = signal<string | null>(null);
  inlineEditText = signal<string>('');

  allNotes = input<VideoNote[]>([]);
  currentVideoId = input<string | null>(null);
  
  editNote = output<VideoNote>();
  deleteNote = output<string>();
  togglePin = output<VideoNote>();
  imageClick = output<void>();
  noteClick = output<VideoNote>();
  updateNote = output<{ id: string; changes: Partial<VideoNote> }>();

  sortedNotes = computed(() => {
    return [...this.allNotes()].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      if ((a.videoId === this.currentVideoId()) !== (b.videoId === this.currentVideoId())) return a.videoId === this.currentVideoId() ? -1 : 1;
      return b.updatedAt - a.updatedAt;
    });
  });

  async copyNoteText(note: VideoNote, event?: Event) {
    if (event) event.stopPropagation();
    if (!note.text) return;
    try {
      await navigator.clipboard.writeText(note.text);
      this.copiedNoteId = note.id;
      setTimeout(() => {
        if (this.copiedNoteId === note.id) this.copiedNoteId = null;
      }, 2000);
    } catch (e) {}
  }

  // --- Inline Editing ---
  startInlineEdit(note: VideoNote, event?: Event) {
    if (event) event.stopPropagation();
    this.editingInlineNoteId.set(note.id);
    this.inlineEditText.set(note.text);
  }

  cancelInlineEdit() {
    this.editingInlineNoteId.set(null);
    this.inlineEditText.set('');
  }

  saveInlineEdit(note: VideoNote) {
    const newText = this.inlineEditText().trim();
    const originalText = note.originalText || note.text;
    this.updateNote.emit({
      id: note.id,
      changes: {
        text: newText,
        originalText
      }
    });
    this.cancelInlineEdit();
  }

  // --- Smart Filters / Operations ---
  applyCodeClean(note: VideoNote, event?: Event) {
    if (event) event.stopPropagation();
    const cleaned = this.ocrCleaner.cleanCode(note.text);
    const originalText = note.originalText || note.text;
    this.updateNote.emit({
      id: note.id,
      changes: { text: cleaned, originalText }
    });
  }

  applyCustomRulesToNote(note: VideoNote, event?: Event) {
    if (event) event.stopPropagation();
    const cleaned = this.ocrCleaner.applyCustomRules(note.text);
    const originalText = note.originalText || note.text;
    this.updateNote.emit({
      id: note.id,
      changes: { text: cleaned, originalText }
    });
  }

  applyRemoveNumbers(note: VideoNote, event?: Event) {
    if (event) event.stopPropagation();
    const cleaned = this.ocrCleaner.removeNumbers(note.text);
    const originalText = note.originalText || note.text;
    this.updateNote.emit({
      id: note.id,
      changes: { text: cleaned, originalText }
    });
  }

  applyRemoveBlankLines(note: VideoNote, event?: Event) {
    if (event) event.stopPropagation();
    const cleaned = this.ocrCleaner.removeBlankLines(note.text);
    const originalText = note.originalText || note.text;
    this.updateNote.emit({
      id: note.id,
      changes: { text: cleaned, originalText }
    });
  }

  applyKeepLatinOnly(note: VideoNote, event?: Event) {
    if (event) event.stopPropagation();
    const cleaned = this.ocrCleaner.keepLatinAndCodeOnly(note.text);
    const originalText = note.originalText || note.text;
    this.updateNote.emit({
      id: note.id,
      changes: { text: cleaned, originalText }
    });
  }

  applyRestoreOriginal(note: VideoNote, event?: Event) {
    if (event) event.stopPropagation();
    if (note.originalText) {
      this.updateNote.emit({
        id: note.id,
        changes: { text: note.originalText }
      });
    }
  }

  // --- Rules Manager Modal Methods ---
  openRulesModal() {
    this.showRulesModal.set(true);
    this.cancelRuleForm();
    if (!this.testInputText()) {
      this.loadSampleText();
    }
  }

  closeRulesModal() {
    this.showRulesModal.set(false);
    this.cancelRuleForm();
  }

  startAddRule() {
    this.editingRuleId.set(null);
    this.ruleFormName = '';
    this.ruleFormDescription = '';
    this.ruleFormPattern = '';
    this.ruleFormReplacement = '';
    this.ruleFormIsRegex = true;
    this.ruleFormCaseSensitive = false;
    this.ruleFormErrorMessage.set(null);
    this.showRuleForm.set(true);
  }

  startEditRule(rule: CustomTextRule) {
    this.editingRuleId.set(rule.id);
    this.ruleFormName = rule.name;
    this.ruleFormDescription = rule.description || '';
    this.ruleFormPattern = rule.pattern;
    this.ruleFormReplacement = rule.replacement ?? '';
    this.ruleFormIsRegex = rule.isRegex;
    this.ruleFormCaseSensitive = rule.caseSensitive;
    this.ruleFormErrorMessage.set(null);
    this.showRuleForm.set(true);
  }

  cancelRuleForm() {
    this.showRuleForm.set(false);
    this.editingRuleId.set(null);
    this.ruleFormErrorMessage.set(null);
  }

  saveRuleForm() {
    const name = this.ruleFormName.trim();
    const pattern = this.ruleFormPattern;
    const replacement = this.ruleFormReplacement;

    if (!name) {
      this.ruleFormErrorMessage.set('يرجى إدخال اسم للقاعدة');
      return;
    }
    if (!pattern) {
      this.ruleFormErrorMessage.set('يرجى إدخال النمط أو النص المبحوث عنه');
      return;
    }

    if (this.ruleFormIsRegex) {
      try {
        new RegExp(pattern, this.ruleFormCaseSensitive ? 'g' : 'gi');
      } catch (err: any) {
        this.ruleFormErrorMessage.set(`خطأ في التعبير النمطي (Regex): ${err?.message || 'صيغة غير صالحة'}`);
        return;
      }
    }

    if (this.editingRuleId()) {
      this.ocrCleaner.updateCustomRule(this.editingRuleId()!, {
        name,
        description: this.ruleFormDescription.trim(),
        pattern,
        replacement,
        isRegex: this.ruleFormIsRegex,
        caseSensitive: this.ruleFormCaseSensitive
      });
    } else {
      this.ocrCleaner.addCustomRule({
        name,
        description: this.ruleFormDescription.trim(),
        pattern,
        replacement,
        isRegex: this.ruleFormIsRegex,
        caseSensitive: this.ruleFormCaseSensitive,
        enabled: true,
        isBuiltIn: false
      });
    }

    this.cancelRuleForm();
  }

  toggleRule(id: string) {
    this.ocrCleaner.toggleCustomRule(id);
  }

  deleteRule(id: string) {
    this.ocrCleaner.deleteCustomRule(id);
  }

  moveRuleUp(index: number) {
    if (index > 0) {
      this.ocrCleaner.reorderCustomRules(index, index - 1);
    }
  }

  moveRuleDown(index: number) {
    if (index < this.customRules().length - 1) {
      this.ocrCleaner.reorderCustomRules(index, index + 1);
    }
  }

  resetDefaultRules() {
    if (confirm('هل تريد استعادة جميع القواعد الافتراضية؟ سيتم إعادة ضبط قواعد تنظيف شاشات الكود وبيئات التطوير.')) {
      this.ocrCleaner.resetToDefaultRules();
      this.cancelRuleForm();
    }
  }

  loadSampleText() {
    this.testInputText.set(
`0Q file Edit View Git Project Buld Debug Test Analyze Tools Extensions Window Help © Search~ | ECommerce.Web.Solution AS x
@- He @ Debug - Any CPU ~ https + > O-B FE: ¥ 5 Hs & GitHub Copilot 12 &
ExceptionHan...iddleWare.cs # X ApiBaseControllercs ProductsController.cs ProductService.cs Results IProductService.cs Solution Explorer vax 8
- be Alo-sa0 [wu #=] g
1 using ECommerce.Services.Exceptions; Cr Ear (Gk) pg
n = . 2
2 using Microsoft.AspNetCore.Mvc; . b  [ ECommerce.Domin ES
3 using static System.Net.Mime.MediaTypeNames; > Esmee Sr se fa o
4 > [& ECommerce Services ES
5 namespace ECommerce.Web.CustomMiddleWares bE InfrastructreLayer g
6 { 4 [EW PresentationLayer 3
4 [E ECommerce Presentation
77 public class ExceptionHandlerMiddleWare > CPE
8 { > [B Attributes
4 [E3 Controllers
9 = i b c= ApiBaseController.cs
10 // 1- You Must Inject RequestDelegate as Next Middleware to Ur CTOR b c= BasketController.cs
11 // 2- Must Have InvokeAsync Method with HttpContext as Parameter > c# ProductsController.cs
117) | 1 4 57 ECommerce. Web
13 private readonly RequestDelegate _next; bp Connected Services
14 private readonly ILogger<ExceptionHandlerMiddleWare> _logger; > Hes
> 3) Imports
15 =
> SW Properties
: . A : ” > bin
16 public ExceptionHandlerMiddleWare(RequestDelegate Next , ILogger<ExceptionHandlerMiddleWare> logge 4B CustomMiddleWares
17 it Pb c# ExceptionHandlerMiddleWare.cs
18 _next = Next; > [E3 Extensions
19 _logger = logger; b BB Factories
20 } > obj
21 > [0 appsettingsjson
@&F ECommerce Web.http
22 public async Task InvokeAsync(HttpContext context) Bo Rem
= 1 4 ECommerce Shared
b #8 Dependencies
24 Fry > B8 CommonResult
25 { > ma Dros
26 await _next.Invoke(context); b c= PaginatedResult.cs
128% =~ & © Noissues found | #~ « ) - ° b c= ProductQueryParams.cs =
Error List Output Package Manager Console
[J Ready 1 Add to Source Control «+ Select Repository «+  [g
mm @ 1 = 840PM
mea rr INE IES mD ~ Og ENG RD ® gos &`
    );
  }

  async copyTestOutput() {
    const text = this.testOutputText();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      this.testCopied.set(true);
      setTimeout(() => this.testCopied.set(false), 2000);
    } catch (e) {}
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
}


