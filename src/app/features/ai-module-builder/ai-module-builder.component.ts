import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { LucideAngularModule, Sparkles, Cpu, Key, Plus, RefreshCw, Layers, CheckCircle2, Trash2, Edit3, Save, History, ChevronLeft, ChevronRight, Image as ImageIcon, X, LayoutTemplate, ShieldCheck, Code, Copy, Download, Maximize2, Cloud, Lock, Smartphone, Tablet, Monitor, RotateCcw, Share2, Wrench } from 'lucide-angular';
import { AiKeyManagerService } from '../../core/services/ai-key-manager.service';
import { ToastService } from '../../core/services/toast.service';

export interface ModuleVersion {
  versionId: string;
  prompt: string;
  htmlContent: string;
  createdAt: number;
}

export interface CustomModuleItem {
  id: string;
  title: string;
  versions: ModuleVersion[];
  activeVersionIndex: number;
  updatedAt: number;
}

@Component({
  selector: 'app-ai-module-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="p-6 md:p-8 max-w-6xl mx-auto space-y-8 text-white font-sans text-right" dir="rtl">
      
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-3">
            <lucide-icon [img]="Sparkles" class="w-3.5 h-3.5 text-indigo-400"></lucide-icon>
            <span class="text-[10px] font-black uppercase text-indigo-400 tracking-wider">AI Autonomous Agent & Code Inspector</span>
          </div>
          <h1 class="text-2xl md:text-3xl font-black tracking-tight">الوكيل الذكي لبناء التطبيقات والألعاب (Autonomous Agent)</h1>
          <p class="text-xs text-slate-400 font-medium mt-1">قم ببناء ألعاب تفاعلية كاملة أو أدوات مع إمكانية استعراض وتصدير الكود البرمجي في أي وقت.</p>
        </div>

        <!-- API Key Selector Card -->
        <div class="bg-slate-900/80 border border-white/10 rounded-2xl p-4 flex flex-col gap-3 min-w-[280px]">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-300">مصدر مفتاح الـ API:</span>
            <span class="text-[10px] font-mono px-2 py-0.5 rounded-full" [ngClass]="keyManager.usePlatformKey() ? 'bg-emerald-500/10 text-emerald-400' : 'bg-indigo-500/10 text-indigo-400'">
              {{ keyManager.usePlatformKey() ? 'مفتاح المنصة (حصة يومية)' : 'مفتاحك الخاص' }}
            </span>
          </div>

          <div class="flex items-center gap-2">
            <button 
              (click)="keyManager.setUsePlatformKey(true)"
              [class.bg-indigo-600]="keyManager.usePlatformKey()"
              [class.bg-white/5]="!keyManager.usePlatformKey()"
              class="flex-1 py-1.5 rounded-xl text-[11px] font-bold transition">
              مفتاح المنصة
            </button>
            <button 
              (click)="keyManager.setUsePlatformKey(false)"
              [class.bg-indigo-600]="!keyManager.usePlatformKey()"
              [class.bg-white/5]="keyManager.usePlatformKey()"
              class="flex-1 py-1.5 rounded-xl text-[11px] font-bold transition">
              مفتاح خاص
            </button>
          </div>

          @if (!keyManager.usePlatformKey()) {
            <input 
              type="password"
              [(ngModel)]="userApiKey"
              (blur)="saveUserApiKey()"
              placeholder="ألصق مفتاح Gemini API هنا..."
              class="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
          } @else {
            <div class="text-[10px] text-slate-400 flex items-center justify-between">
              <span>الاستهلاك اليومي:</span>
              <span class="font-mono font-bold text-indigo-400">{{ keyManager.platformUsageCount() }} / 50 طلب</span>
            </div>
          }
        </div>
      </div>

      <!-- Saved Modules Bar -->
      @if (savedModules().length > 0) {
        <div class="bg-slate-900/40 border border-white/10 rounded-2xl p-4 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-black text-indigo-400 uppercase tracking-wider">الأقسام والألعاب المنشورة مسبقاً:</span>
            <button (click)="createNewModule()" class="text-xs font-bold text-indigo-400 hover:text-white flex items-center gap-1">
              <lucide-icon [img]="Plus" class="w-3.5 h-3.5"></lucide-icon>
              <span>إنشاء قسم جديد</span>
            </button>
          </div>
          <div class="flex flex-wrap gap-2">
            @for (mod of savedModules(); track mod.id) {
              <div 
                (click)="selectModule(mod)"
                [class.bg-indigo-600]="activeModuleId() === mod.id"
                [class.bg-slate-800]="activeModuleId() !== mod.id"
                class="px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-2 border border-white/5 hover:border-indigo-500">
                <span>{{ mod.title }}</span>
                <span class="text-[10px] opacity-70 font-mono">({{ mod.versions.length }} نسخ)</span>
                <button (click)="$event.stopPropagation(); deleteEntireModule(mod.id)" class="text-slate-400 hover:text-red-400 p-1">
                  <lucide-icon [img]="Trash2" class="w-3 h-3"></lucide-icon>
                </button>
              </div>
            }
          </div>
        </div>
      }

      <!-- Version Control & History Timeline Bar -->
      @if (activeModule() && activeModule()!.versions.length > 1) {
        <div class="bg-indigo-950/20 border border-indigo-500/20 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-4">
          <div class="flex items-center gap-2">
            <lucide-icon [img]="History" class="w-4 h-4 text-indigo-400"></lucide-icon>
            <span class="text-xs font-bold text-indigo-300">سجل التحديثات والنسخ المنشورة:</span>
          </div>

          <div class="flex items-center gap-2 flex-wrap">
            <button 
              (click)="goToPreviousVersion()" 
              [disabled]="activeModule()!.activeVersionIndex <= 0"
              class="px-3 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-40 rounded-xl text-xs font-bold flex items-center gap-1">
              <lucide-icon [img]="ChevronRight" class="w-3.5 h-3.5"></lucide-icon>
              <span>النسخة السابقة (Undo)</span>
            </button>

            <span class="text-xs font-mono px-3 py-1 bg-black/40 rounded-xl text-indigo-300">
              نسخة {{ activeModule()!.activeVersionIndex + 1 }} من {{ activeModule()!.versions.length }}
            </span>

            <button 
              (click)="goToNextVersion()" 
              [disabled]="activeModule()!.activeVersionIndex >= activeModule()!.versions.length - 1"
              class="px-3 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-40 rounded-xl text-xs font-bold flex items-center gap-1">
              <span>النسخة التالية (Redo)</span>
              <lucide-icon [img]="ChevronLeft" class="w-3.5 h-3.5"></lucide-icon>
            </button>

            <button 
              (click)="deleteCurrentVersion()" 
              [disabled]="activeModule()!.versions.length <= 1"
              class="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 disabled:opacity-40 rounded-xl text-xs font-bold flex items-center gap-1">
              <lucide-icon [img]="Trash2" class="w-3.5 h-3.5"></lucide-icon>
              <span>حذف هذه النسخة</span>
            </button>
          </div>
        </div>
      }

      <!-- Templates & Rules Selector Panel -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Templates -->
        <div class="bg-slate-900/60 border border-white/10 rounded-3xl p-5 space-y-3">
          <div class="flex items-center gap-2 text-xs font-black text-indigo-400">
            <lucide-icon [img]="LayoutTemplate" class="w-4 h-4"></lucide-icon>
            <span>اختر نموذجاً جاهزاً (Templates & Games):</span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            @for (tpl of availableTemplates; track tpl.title) {
              <button 
                (click)="applyTemplate(tpl.prompt)"
                class="p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-right text-xs font-bold transition flex flex-col gap-1 group">
                <span class="text-white group-hover:text-indigo-300">{{ tpl.title }}</span>
                <span class="text-[10px] text-slate-400 font-normal truncate">{{ tpl.desc }}</span>
              </button>
            }
          </div>
        </div>

        <!-- Rules & Guidelines -->
        <div class="bg-slate-900/60 border border-white/10 rounded-3xl p-5 space-y-3">
          <div class="flex items-center gap-2 text-xs font-black text-emerald-400">
            <lucide-icon [img]="ShieldCheck" class="w-4 h-4"></lucide-icon>
            <span>قواعد الوظائف والتفاعل (Agent Rules):</span>
          </div>
          <div class="flex flex-wrap gap-2">
            @for (rule of availableRules; track rule.id) {
              <button 
                (click)="toggleRule(rule.id)"
                [class.bg-emerald-600]="selectedRules.has(rule.id)"
                [class.bg-white-5]="!selectedRules.has(rule.id)"
                class="px-3 py-2 rounded-xl text-xs font-bold transition border border-white/10 flex items-center gap-1.5"
                [ngClass]="selectedRules.has(rule.id) ? 'bg-emerald-600 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'">
                <span>{{ rule.label }}</span>
              </button>
            }
          </div>
        </div>
      </div>

      <!-- Prompt Input & Generation -->
      <div class="bg-slate-900/60 border border-white/10 rounded-3xl p-6 space-y-4">
        <label class="text-xs font-bold text-slate-300 block">
          {{ activeModuleId() ? 'وصف التعديل أو التحديث للقسم/اللعبة الحالية:' : 'وصف إنشاء لعبة أو قسم تفاعلي جديد:' }}
        </label>
        
        <div class="relative">
          <textarea 
            [(ngModel)]="promptText"
            rows="3"
            placeholder="مثال: اصنع لعبة تفاعلية كاملة مع لوحة نتائج وحلقة تشغيل requestAnimationFrame، إلخ..."
            class="w-full bg-slate-950/80 border border-white/10 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-indigo-500 resize-none font-medium placeholder:text-slate-600"
          ></textarea>
        </div>

        <!-- Attached Image Preview Bar -->
        @if (attachedImage) {
          <div class="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-3 w-fit">
            <img [src]="attachedImage.previewUrl" alt="Attached Preview" class="w-12 h-12 rounded-xl object-cover border border-white/10" />
            <div class="text-right">
              <span class="text-xs font-bold text-white block truncate max-w-xs">{{ attachedImage.name }}</span>
              <span class="text-[10px] text-emerald-400 font-mono">جاهز للإرسال مع الطلب</span>
            </div>
            <button (click)="removeAttachedImage()" class="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-red-400 transition">
              <lucide-icon [img]="X" class="w-4 h-4"></lucide-icon>
            </button>
          </div>
        }

        <!-- Quick Refinement Shortcuts Bar -->
        <div class="space-y-2">
          <span class="text-[11px] font-bold text-slate-400 block">اختصارات تعديل سريعة بضغطة زر (Quick Refinements):</span>
          <div class="flex flex-wrap gap-2">
            @for (sc of quickShortcuts; track sc.label) {
              <button 
                (click)="applyShortcutPrompt(sc.prompt)"
                [disabled]="isGenerating()"
                class="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-xl text-xs font-bold text-indigo-300 transition flex items-center gap-1.5">
                <lucide-icon [img]="Wrench" class="w-3 h-3 text-indigo-400"></lucide-icon>
                <span>{{ sc.label }}</span>
              </button>
            }
          </div>
        </div>

        <div class="flex items-center justify-between flex-wrap gap-4">
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-2 text-xs text-slate-400">
              <lucide-icon [img]="Cpu" class="w-4 h-4 text-indigo-400"></lucide-icon>
              <span>المحرك: Google Gemini 3.5 Flash lite (Autonomous Agent)</span>
            </div>

            <input 
              type="file" 
              accept="image/*" 
              #fileInput 
              (change)="onImageSelected($event)" 
              class="hidden" 
            />
            <button 
              (click)="fileInput.click()"
              class="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-indigo-300 flex items-center gap-1.5 transition">
              <lucide-icon [img]="ImageIcon" class="w-3.5 h-3.5 text-indigo-400"></lucide-icon>
              <span>إرفاق صورة مرجعية</span>
            </button>
          </div>

          <button 
            (click)="generateOrUpdateModule()"
            [disabled]="isGenerating() || (!promptText.trim() && !attachedImage)"
            class="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:opacity-50 rounded-2xl text-xs font-black transition flex items-center gap-2 shadow-lg shadow-indigo-600/30">
            <lucide-icon [img]="isGenerating() ? RefreshCw : Sparkles" [class.animate-spin]="isGenerating()" class="w-4 h-4"></lucide-icon>
            <span>{{ isGenerating() ? 'الوكيل الذكي يعمل الآن...' : (activeModuleId() ? 'تحديث ونشر اللعبة/القسم ⚡' : 'توليد وبناء لعبة/قسم ⚡') }}</span>
          </button>
        </div>
      </div>

      <!-- Live Generated Module Preview & Code Inspector -->
      @if (generatedHtml()) {
        <div class="space-y-4 animate-in fade-in duration-500">
          <div class="flex items-center justify-between flex-wrap gap-3">
            <div class="flex items-center gap-4">
              <h2 class="text-lg font-black flex items-center gap-2">
                <lucide-icon [img]="CheckCircle2" class="w-5 h-5 text-emerald-400"></lucide-icon>
                <span>معاينة القسم أو اللعبة التفاعلية</span>
              </h2>

              <!-- Viewport Switcher (Desktop / Tablet / Mobile) -->
              <div class="bg-slate-900 border border-white/10 rounded-xl p-1 flex items-center gap-1">
                <button 
                  (click)="viewportMode.set('desktop')"
                  [class.bg-indigo-600]="viewportMode() === 'desktop'"
                  [class.text-white]="viewportMode() === 'desktop'"
                  [class.text-slate-400]="viewportMode() !== 'desktop'"
                  title="عرض شاشة حاسوب"
                  class="p-1.5 rounded-lg transition">
                  <lucide-icon [img]="Monitor" class="w-3.5 h-3.5"></lucide-icon>
                </button>
                <button 
                  (click)="viewportMode.set('tablet')"
                  [class.bg-indigo-600]="viewportMode() === 'tablet'"
                  [class.text-white]="viewportMode() === 'tablet'"
                  [class.text-slate-400]="viewportMode() !== 'tablet'"
                  title="عرض تابلت (768px)"
                  class="p-1.5 rounded-lg transition">
                  <lucide-icon [img]="Tablet" class="w-3.5 h-3.5"></lucide-icon>
                </button>
                <button 
                  (click)="viewportMode.set('mobile')"
                  [class.bg-indigo-600]="viewportMode() === 'mobile'"
                  [class.text-white]="viewportMode() === 'mobile'"
                  [class.text-slate-400]="viewportMode() !== 'mobile'"
                  title="عرض هاتف (375px)"
                  class="p-1.5 rounded-lg transition">
                  <lucide-icon [img]="Smartphone" class="w-3.5 h-3.5"></lucide-icon>
                </button>
              </div>
            </div>

            <div class="flex items-center gap-2 flex-wrap">
              <!-- Reload Canvas Button -->
              <button 
                (click)="reloadIframe()"
                title="إعادة تشغيل اللعبة/الأداة"
                class="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-slate-200 flex items-center gap-1.5 transition">
                <lucide-icon [img]="RotateCcw" class="w-4 h-4 text-indigo-400"></lucide-icon>
                <span>إعادة تشغيل</span>
              </button>

              <!-- Share & Embed Button -->
              <button 
                (click)="showEmbedModal.set(true)"
                title="تضمين الكود في أي موقع"
                class="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-slate-200 flex items-center gap-1.5 transition">
                <lucide-icon [img]="Share2" class="w-4 h-4 text-emerald-400"></lucide-icon>
                <span>تضمين (Embed)</span>
              </button>

              <!-- Full Screen Preview Button -->
              <button 
                (click)="openFullScreen()"
                title="فتح المعاينة في شاشة كاملة"
                class="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-slate-200 flex items-center gap-1.5 transition">
                <lucide-icon [img]="Maximize2" class="w-4 h-4 text-emerald-400"></lucide-icon>
                <span>ملء الشاشة</span>
              </button>

              <!-- Export HTML File Button -->
              <button 
                (click)="downloadHtmlFile()"
                title="تحميل كـ ملف HTML جاهز للتشغيل"
                class="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-slate-200 flex items-center gap-1.5 transition">
                <lucide-icon [img]="Download" class="w-4 h-4 text-indigo-400"></lucide-icon>
                <span>تحميل HTML</span>
              </button>

              <!-- Pro Cloud Sync Feature Lock Button -->
              <button 
                (click)="promptCloudSyncPro()"
                title="ميزة الحفظ السحابي مخصصة لمشتركي Pro"
                class="px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-xl text-xs font-bold text-amber-400 flex items-center gap-1.5 transition">
                <lucide-icon [img]="Cloud" class="w-4 h-4"></lucide-icon>
                <lucide-icon [img]="Lock" class="w-3 h-3 text-amber-400"></lucide-icon>
                <span>مزامنة سحابية (Pro)</span>
              </button>

              <!-- View Code Toggle Button -->
              <button 
                (click)="showCodeViewer.set(!showCodeViewer())"
                class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white flex items-center gap-2 transition shadow-lg shadow-indigo-600/20">
                <lucide-icon [img]="Code" class="w-4 h-4"></lucide-icon>
                <span>{{ showCodeViewer() ? 'إخفاء الكود البرمجي' : 'عرض وتعديل الكود البرمجي (Code Sandbox)' }}</span>
              </button>
            </div>
          </div>

          <!-- Interactive Code Editor Panel -->
          @if (showCodeViewer()) {
            <div class="bg-slate-950 border border-indigo-500/30 rounded-3xl p-6 space-y-3 font-mono text-xs animate-in fade-in duration-300">
              <div class="flex items-center justify-between pb-2 border-b border-white/10">
                <span class="text-indigo-400 font-bold">محرر الكود المباشر والتعديل الفوري (Live Code Sandbox):</span>
                <div class="flex items-center gap-2">
                  <button 
                    (click)="downloadHtmlFile()"
                    class="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition">
                    <lucide-icon [img]="Download" class="w-3.5 h-3.5 text-indigo-400"></lucide-icon>
                    <span>تحميل الكود كملف</span>
                  </button>
                  <button 
                    (click)="copyCode()"
                    class="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition">
                    <lucide-icon [img]="Copy" class="w-3.5 h-3.5"></lucide-icon>
                    <span>نسخ الكود</span>
                  </button>
                </div>
              </div>
              <textarea 
                [ngModel]="generatedHtml()"
                (ngModelChange)="generatedHtml.set($event)"
                rows="12"
                class="w-full bg-slate-900/90 text-emerald-300 font-mono text-xs p-4 rounded-2xl border border-white/10 focus:outline-none focus:border-indigo-500 resize-y"
                dir="ltr"
              ></textarea>
            </div>
          }

          <!-- Visual Preview Box (Viewport Resizable) -->
          <div class="bg-slate-950 border border-white/10 rounded-3xl p-4 min-h-[450px] overflow-hidden relative shadow-2xl flex justify-center items-center">
            <div 
              class="transition-all duration-300 overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl"
              [ngClass]="{
                'w-full max-w-full': viewportMode() === 'desktop',
                'w-[768px] max-w-full': viewportMode() === 'tablet',
                'w-[375px] max-w-full': viewportMode() === 'mobile'
              }">
              <iframe 
                [src]="safeIframeUrl()" 
                class="w-full h-[550px] border-0 bg-slate-950" 
                sandbox="allow-scripts allow-same-origin allow-modals flex-1">
              </iframe>
            </div>
          </div>
        </div>
      }

      <!-- Embed Code Modal -->
      @if (showEmbedModal()) {
        <div class="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div class="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-xl w-full space-y-4 shadow-2xl">
            <div class="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 class="text-base font-black text-white flex items-center gap-2">
                <lucide-icon [img]="Share2" class="w-5 h-5 text-indigo-400"></lucide-icon>
                <span>كود التضمين للمواقع المدعومة (Embed Code)</span>
              </h3>
              <button (click)="showEmbedModal.set(false)" class="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white">
                <lucide-icon [img]="X" class="w-5 h-5"></lucide-icon>
              </button>
            </div>

            <p class="text-xs text-slate-300 font-medium">انسخ كود الـ iframe التالي لتجربة أو عرض اللعبة/التطبيق في أي موقع أو مدونة خارجية بسهولة:</p>

            <textarea 
              readonly
              [value]="getEmbedCode()"
              rows="4"
              class="w-full bg-slate-950 border border-white/10 rounded-2xl p-4 font-mono text-xs text-indigo-300 focus:outline-none resize-none"
              dir="ltr"
            ></textarea>

            <div class="flex justify-end gap-2">
              <button (click)="showEmbedModal.set(false)" class="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-slate-300">
                إغلاق
              </button>
              <button (click)="copyEmbedCode()" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2">
                <lucide-icon [img]="Copy" class="w-4 h-4"></lucide-icon>
                <span>نسخ كود التضمين</span>
              </button>
            </div>
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    /* Custom builder styles */
  `]
})
export class AiModuleBuilderComponent {
  keyManager = inject(AiKeyManagerService);
  toast = inject(ToastService);
  sanitizer = inject(DomSanitizer);

  private readonly STORAGE_KEY = 'si_neuro_custom_modules_v2';

  promptText = '';
  userApiKey = '';
  isGenerating = signal<boolean>(false);
  generatedHtml = signal<string>('');
  savedModules = signal<CustomModuleItem[]>([]);
  activeModuleId = signal<string | null>(null);
  showCodeViewer = signal<boolean>(false);

  safeIframeUrl = computed(() => {
    let rawHtml = this.generatedHtml();
    if (!rawHtml) return '';
    
    // Clean code blocks if present
    rawHtml = rawHtml.replace(/^```html\s*/gi, '').replace(/```\s*$/gi, '').trim();

    const headAssets = `<script src="https://cdn.tailwindcss.com"></script><link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;800;900&display=swap" rel="stylesheet"><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"><style>body{margin:0;padding:1rem;background-color:#020617;color:white;font-family:'Cairo',system-ui,sans-serif;}</style>`;

    let fullPage = '';
    if (rawHtml.toLowerCase().includes('<html') || rawHtml.toLowerCase().includes('<!doctype')) {
      if (rawHtml.includes('<head>')) {
        fullPage = rawHtml.replace('<head>', `<head>${headAssets}`);
      } else {
        fullPage = headAssets + rawHtml;
      }
    } else {
      fullPage = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  ${headAssets}
</head>
<body class="bg-slate-950 text-white p-4">
  ${rawHtml}
</body>
</html>`;
    }

    return this.sanitizer.bypassSecurityTrustResourceUrl('data:text/html;charset=utf-8,' + encodeURIComponent(fullPage));
  });

  attachedImage: { name: string; mimeType: string; base64: string; previewUrl: string } | null = null;
  selectedRules = new Set<string>();

  availableTemplates = [
    { title: '🎮 لعبة التقاط الكور المتساقطة', desc: 'لعبة تفاعلية كاملة بـ Canvas', prompt: 'اصنع لعبة تفاعلية كاملة باسم (رحلة التقاط الكور). اشترط عزل الشاشات: شاشة البداية بها زر (ابدأ اللعب)، وشاشة اللعب تحوي Canvas بـ 60fps ورسم طبق تحكم بالماوس/الأسهم لالتقاط الكور وزيادة النقاط مع أروح (3 قلوب)، وشاشة النهاية (Game Over) تظهر فقط عند انتهاء الأرواح مع زر (إعادة اللعب). استخدم خلفية نيون زجاجية مظلمة وتصميم فاخر جداً.' },
    { title: '📊 لوحة متابعة أسعار العملات', desc: 'تحديثات حية وتأثيرات زجاجية', prompt: 'اصنع لوحة متابعة أسعار بيتكوين وإيثريوم والعملات الرقمية بتصميم مظلم زجاجي فاخر مع مخططات شمعية حية وتحديثات وتنبيهات أسعار بطاقات تفاعلية.' },
    { title: '⏱️ تطبيق بومودورو للتركيز', desc: 'عداد متوهج وأصوات تفاعلية', prompt: 'اصنع أداة مؤقت بومودورو الاحترافية مع حلقة تقدم دائرية متوهجة (SVG Circular Progress)، أزرار تشغيل وإيقاف مؤقت وإعادة ضبط، وتبويب للاستراحة القصيرة والطويلة، مع عداد الجلسات المكتملة وتأثيرات صوتية عند الانتهاء.' },
    { title: '✅ لوحة كانبان لإدارة المهام', desc: 'إضافة وسحب وإدارة المهام', prompt: 'اصنع تطبيق إدارة مهام كانبان كامل تفاعلي، يسمح بإضافة مهام جديدة، نقلها بين (قيد الانتظار - جاري العمل - مكتملة)، وحذف المهام مع إمكانية البحث والفلترة وتخزين الحالات.' }
  ];

  availableRules = [
    { id: 'full_game_loop', label: '🎮 دورة تشغيل كاملة وحلقة تفاعلية (Game Loop & JS)' },
    { id: 'dark_glass', label: '🌙 تصميم مظلم زجاجي (Dark Glassmorphism)' },
    { id: 'responsive', label: '📱 متجاوب لجميع الشاشات' },
    { id: 'neon_glow', label: '✨ تأثيرات نيون متوهجة (Glowing Neon)' }
  ];

  Sparkles = Sparkles;
  Cpu = Cpu;
  Key = Key;
  Plus = Plus;
  RefreshCw = RefreshCw;
  Layers = Layers;
  CheckCircle2 = CheckCircle2;
  Trash2 = Trash2;
  Edit3 = Edit3;
  Save = Save;
  History = History;
  ChevronLeft = ChevronLeft;
  ChevronRight = ChevronRight;
  ImageIcon = ImageIcon;
  X = X;
  LayoutTemplate = LayoutTemplate;
  ShieldCheck = ShieldCheck;
  Code = Code;
  Copy = Copy;
  Download = Download;
  Maximize2 = Maximize2;
  Cloud = Cloud;
  Lock = Lock;
  Smartphone = Smartphone;
  Tablet = Tablet;
  Monitor = Monitor;
  RotateCcw = RotateCcw;
  Share2 = Share2;
  Wrench = Wrench;

  viewportMode = signal<'desktop' | 'tablet' | 'mobile'>('desktop');
  showEmbedModal = signal<boolean>(false);

  quickShortcuts = [
    { label: '🎨 نمط نيون وذهبي', prompt: 'قم بتحديث التصميم ليكون بنمط نيون مظلم ولمسات ذهبية زجاجية عالية الفخامة.' },
    { label: '📱 تحسين اللمس للهاتف', prompt: 'أضف أزرار تحكم افتراضية على الشاشة باللمس تناسب الهواتف الذكية.' },
    { label: '⚡ زيادة السرعة والصعوبة', prompt: 'قم بزيادة سرعة الحركة ورفع مستوى الصعوبة والتحدي بنسبة 25%.' },
    { label: '🔧 إصلاح الأخطاء تلقائياً', prompt: 'تأكد من سلامة جميع السكريبتات وحلقة التشغيل وإصلاح أي خطأ برمجي أو تداخل شاشات.' }
  ];

  ngOnInit() {
    if (typeof localStorage !== 'undefined') {
      this.userApiKey = localStorage.getItem('Si-Neuro-chat-apiKey') || '';
      this.loadSavedModules();

      const lastActiveId = localStorage.getItem('si_neuro_builder_active_id');
      if (lastActiveId && this.savedModules().some(m => m.id === lastActiveId)) {
        const mod = this.savedModules().find(m => m.id === lastActiveId);
        if (mod) this.selectModule(mod);
      } else if (this.savedModules().length > 0) {
        this.selectModule(this.savedModules()[0]);
      }
    }
  }

  activeModule = computed(() => {
    const id = this.activeModuleId();
    if (!id) return null;
    return this.savedModules().find(m => m.id === id) || null;
  });

  loadSavedModules() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        this.savedModules.set(parsed);
      }
    } catch (e) {
      console.error('Error loading custom modules:', e);
    }
  }

  saveSavedModulesToStorage(modules: CustomModuleItem[]) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(modules));
    }
    this.savedModules.set(modules);
  }

  saveUserApiKey() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('Si-Neuro-chat-apiKey', this.userApiKey.trim());
    }
  }

  applyTemplate(prompt: string) {
    this.promptText = prompt;
    this.toast.show('📋 تم اختيار النموذج، يمكنك التعديل عليه أو إضافته كـ لعبة/قسم!', 'info');
  }

  toggleRule(ruleId: string) {
    if (this.selectedRules.has(ruleId)) {
      this.selectedRules.delete(ruleId);
    } else {
      this.selectedRules.add(ruleId);
    }
  }

  onImageSelected(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.toast.show('يرجى اختيار ملف صورة صالح.', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const result = e.target.result as string;
      const commaIdx = result.indexOf(',');
      const mimeType = file.type;
      const base64 = result.substring(commaIdx + 1);

      this.attachedImage = {
        name: file.name,
        mimeType: mimeType,
        base64: base64,
        previewUrl: result
      };
      this.toast.show('📷 تم إرفاق الصورة بنجاح وجاهزة للتحليل!', 'success');
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  }

  removeAttachedImage() {
    this.attachedImage = null;
    this.toast.show('تمت إزالة الصورة المرفقة', 'info');
  }

  createNewModule() {
    this.activeModuleId.set(null);
    this.promptText = '';
    this.generatedHtml.set('');
    this.attachedImage = null;
    this.selectedRules.clear();
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('si_neuro_builder_active_id');
    }
    this.toast.show('تم فتح نموذج لإنشاء لعبة/قسم جديد ⚡', 'info');
  }

  selectModule(mod: CustomModuleItem) {
    this.activeModuleId.set(mod.id);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('si_neuro_builder_active_id', mod.id);
    }
    const activeVer = mod.versions[mod.activeVersionIndex] || mod.versions[mod.versions.length - 1];
    this.promptText = activeVer ? activeVer.prompt : '';
    this.generatedHtml.set(activeVer ? activeVer.htmlContent : '');
    this.attachedImage = null;
    this.toast.show(`تم تحميل: "${mod.title}" (نسخة ${mod.activeVersionIndex + 1})`, 'success');
  }

  goToPreviousVersion() {
    const mod = this.activeModule();
    if (!mod || mod.activeVersionIndex <= 0) return;
    const newIdx = mod.activeVersionIndex - 1;
    this.updateActiveVersionIndex(newIdx);
  }

  goToNextVersion() {
    const mod = this.activeModule();
    if (!mod || mod.activeVersionIndex >= mod.versions.length - 1) return;
    const newIdx = mod.activeVersionIndex + 1;
    this.updateActiveVersionIndex(newIdx);
  }

  private updateActiveVersionIndex(idx: number) {
    const mod = this.activeModule();
    if (!mod) return;
    const list = [...this.savedModules()];
    const mIdx = list.findIndex(m => m.id === mod.id);
    if (mIdx === -1) return;

    list[mIdx].activeVersionIndex = idx;
    const ver = list[mIdx].versions[idx];
    this.promptText = ver.prompt;
    this.generatedHtml.set(ver.htmlContent);
    this.saveSavedModulesToStorage(list);
    this.toast.show(`تم الانتقال إلى النسخة رقم ${idx + 1}`, 'info');
  }

  async deleteCurrentVersion() {
    const mod = this.activeModule();
    if (!mod || mod.versions.length <= 1) {
      this.toast.show('لا يمكن حذف النسخة الوحيدة المتبقية. يمكنك حذف القسم بالكامل.', 'warning');
      return;
    }

    const confirmed = await this.toast.confirm('هل أنت متأكد من حذف هذه النسخة المحددة من السجل؟');
    if (!confirmed) return;

    const list = [...this.savedModules()];
    const mIdx = list.findIndex(m => m.id === mod.id);
    if (mIdx === -1) return;

    list[mIdx].versions.splice(list[mIdx].activeVersionIndex, 1);
    if (list[mIdx].activeVersionIndex >= list[mIdx].versions.length) {
      list[mIdx].activeVersionIndex = list[mIdx].versions.length - 1;
    }

    const activeVer = list[mIdx].versions[list[mIdx].activeVersionIndex];
    this.promptText = activeVer.prompt;
    this.generatedHtml.set(activeVer.htmlContent);

    this.saveSavedModulesToStorage(list);
    this.toast.show('تم حذف النسخة بنجاح من سجل التحديثات 🗑️', 'info');
  }

  async deleteEntireModule(id: string) {
    const confirmed = await this.toast.confirm('هل أنت متأكد من حذف هذا القسم بالكامل مع كافة نسخه؟');
    if (!confirmed) return;

    const updated = this.savedModules().filter(m => m.id !== id);
    this.saveSavedModulesToStorage(updated);
    if (this.activeModuleId() === id) {
      this.createNewModule();
    }
    this.toast.show('تم حذف القسم بالكامل 🗑️', 'info');
  }

  copyCode() {
    const code = this.generatedHtml();
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      this.toast.show('📋 تم نسخ الكود البرمجي إلى الحافظة بنجاح!', 'success');
    }).catch(() => {
      this.toast.show('تعذر نسخ الكود.', 'error');
    });
  }

  reloadIframe() {
    const current = this.generatedHtml();
    this.generatedHtml.set('');
    setTimeout(() => {
      this.generatedHtml.set(current);
      this.toast.show('🔄 تم إعادة تشغيل اللعبة/الأداة بنجاح!', 'info');
    }, 50);
  }

  applyShortcutPrompt(shortcutPrompt: string) {
    this.promptText = shortcutPrompt;
    this.generateOrUpdateModule();
  }

  getEmbedCode(): string {
    const title = this.activeModule()?.title || 'Custom Module';
    return `<iframe srcdoc="${this.generatedHtml().replace(/"/g, '&quot;')}" width="100%" height="600" style="border:none;border-radius:16px;" title="${title}"></iframe>`;
  }

  copyEmbedCode() {
    navigator.clipboard.writeText(this.getEmbedCode()).then(() => {
      this.toast.show('🔗 تم نسخ كود التضمين (Embed Code) بنجاح!', 'success');
      this.showEmbedModal.set(false);
    });
  }

  downloadHtmlFile() {
    const code = this.generatedHtml();
    if (!code) return;
    const blob = new Blob([code], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const title = this.activeModule()?.title || 'app-module';
    link.download = `${title.replace(/\s+/g, '_')}.html`;
    link.click();
    URL.revokeObjectURL(url);
    this.toast.show('💾 تم تحميل ملف الـ HTML بنجاح!', 'success');
  }

  openFullScreen() {
    const code = this.generatedHtml();
    if (!code) return;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(code);
      win.document.close();
    } else {
      this.toast.show('يرجى السماح بالنوافذ المنبثقة للفتح في شاشة كاملة.', 'warning');
    }
  }

  promptCloudSyncPro() {
    this.toast.show('🔒 ميزة "الحفظ السحابي وحفظ الموديولات في الحساب" مقتصرة على مشتركي Pro للحد من تكاليف الخوادم السحابية. يمكنك الاستمرار في الحفظ المحلي مجاناً!', 'info');
  }

  async generateOrUpdateModule() {
    const prompt = this.promptText.trim();
    if (!prompt && !this.attachedImage) return;

    if (!this.keyManager.checkAndIncrementQuota()) {
      return;
    }

    this.isGenerating.set(true);

    try {
      const apiKey = this.keyManager.getActiveApiKey();
      if (!apiKey) {
        this.toast.show('يرجى إدخال مفتاح API أولاً أو استخدام مفتاح المنصة.', 'warning');
        this.isGenerating.set(false);
        return;
      }

      let rulesText = '';
      if (this.selectedRules.size > 0) {
        rulesText = `\nMandatory agent engineering rules: ${Array.from(this.selectedRules).join(', ')}.`;
      }

      const existingCode = this.generatedHtml();
      let systemPrompt = '';

      if (existingCode) {
        systemPrompt = `You are a World-Class Autonomous UI & Web Game Developer Agent.
Existing Application Code:
\`\`\`html
${existingCode}
\`\`\`
User Modification Request: "${prompt}". ${rulesText}

DESIGN & ARCHITECTURE REQUIREMENTS:
1. Return 100% Executable, self-contained HTML document.
2. Include CDN links in <head>:
   - Tailwind CSS: <script src="https://cdn.tailwindcss.com"></script>
   - Google Cairo Font: <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;800;900&display=swap" rel="stylesheet">
   - FontAwesome Icons: <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
3. Apply modern dark glassmorphism aesthetic:
   - Deep slate/indigo dark gradient background (bg-slate-950).
   - Vibrant neon elements, rounded-3xl containers, backdrop-blur-md, sleek shadows.
4. SCREEN STATE ISOLATION (CRITICAL FOR GAMES):
   - Do NOT display Start Screen, Game Screen, and Game Over Screen simultaneously!
   - Use absolute positioned overlays with hidden/flex classes controlled by JS state.
   - Start with Start Screen visible. Hide it when user clicks "Start / ابدأ".
5. EXECUTABLE JS & GAME LOOP:
   - Write clean JavaScript inside <script> tags.
   - Implement Canvas 2D or DOM rendering with requestAnimationFrame/setInterval.
   - Add responsive keyboard (Arrow keys / WASD) and Touch/Mouse controls.
6. OUTPUT FORMAT: Return ONLY the raw HTML code. Do NOT wrap in markdown code blocks (\`\`\`html) or text explanations.`;
      } else {
        systemPrompt = `You are a World-Class Autonomous UI & Web Game Developer Agent.
User Application Prompt: "${prompt}". ${rulesText}

DESIGN & ARCHITECTURE REQUIREMENTS:
1. Return 100% Executable, self-contained HTML document.
2. Include CDN links in <head>:
   - Tailwind CSS: <script src="https://cdn.tailwindcss.com"></script>
   - Google Cairo Font: <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;800;900&display=swap" rel="stylesheet">
   - FontAwesome Icons: <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
3. Apply modern dark glassmorphism aesthetic:
   - Deep slate/indigo dark gradient background (bg-slate-950).
   - Vibrant neon elements, rounded-3xl containers, backdrop-blur-md, sleek shadows.
4. SCREEN STATE ISOLATION (CRITICAL FOR GAMES):
   - Do NOT display Start Screen, Game Screen, and Game Over Screen simultaneously!
   - Use absolute positioned overlays with hidden/flex classes controlled by JS state.
   - Start with Start Screen visible. Hide it when user clicks "Start / ابدأ".
5. EXECUTABLE JS & GAME LOOP:
   - Write clean JavaScript inside <script> tags.
   - Implement Canvas 2D or DOM rendering with requestAnimationFrame/setInterval.
   - Add responsive keyboard (Arrow keys / WASD) and Touch/Mouse controls.
6. OUTPUT FORMAT: Return ONLY the raw HTML code. Do NOT wrap in markdown code blocks (\`\`\`html) or text explanations.`;
      }

      const parts: any[] = [{ text: systemPrompt }];
      if (this.attachedImage) {
        parts.push({
          inlineData: {
            mimeType: this.attachedImage.mimeType,
            data: this.attachedImage.base64
          }
        });
      }

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }]
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText);
      }

      const data = await res.json();

      let htmlOutput = data.candidates?.[0]?.content?.parts?.[0]?.text || '<div class="p-4 text-red-400">فشل التوليد.</div>';
      
      htmlOutput = htmlOutput.replace(/^```html\s*/gi, '').replace(/^```\s*/gi, '').replace(/```\s*$/gi, '').trim();

      this.generatedHtml.set(htmlOutput);
      
      this.appendNewVersion(prompt || 'تحديث اللعبة/القسم', htmlOutput);
      this.attachedImage = null;
      const isUpdating = !!this.activeModuleId();
      this.toast.show(isUpdating ? '⚡ تم تحديث اللعبة ونشر النسخة بنجاح!' : '✨ تم بناء وتشغيل اللعبة/القسم بنجاح!', 'success');
    } catch (e: any) {
      console.error('Module generation error:', e);
      this.toast.show(`حدث خطأ أثناء الاتصال بـ Gemini AI: ${e.message || ''}`, 'error');
    } finally {
      this.isGenerating.set(false);
    }
  }

  private wasResOk(res: Response): boolean {
    return res.ok;
  }

  appendNewVersion(prompt: string, html: string) {
    const title = prompt.trim().substring(0, 30) || 'لعبة/قسم مخصص';
    const currentId = this.activeModuleId();
    const list = [...this.savedModules()];

    const newVersion: ModuleVersion = {
      versionId: 'ver_' + Math.random().toString(36).substr(2, 9),
      prompt: prompt,
      htmlContent: html,
      createdAt: Date.now()
    };

    if (currentId) {
      const idx = list.findIndex(m => m.id === currentId);
      if (idx !== -1) {
        list[idx].versions.push(newVersion);
        list[idx].activeVersionIndex = list[idx].versions.length - 1;
        list[idx].updatedAt = Date.now();
        list[idx].title = title;
      }
    } else {
      const newMod: CustomModuleItem = {
        id: 'mod_' + Math.random().toString(36).substr(2, 9),
        title: title,
        versions: [newVersion],
        activeVersionIndex: 0,
        updatedAt: Date.now()
      };
      list.push(newMod);
      this.activeModuleId.set(newMod.id);
    }

    if (typeof localStorage !== 'undefined' && this.activeModuleId()) {
      localStorage.setItem('si_neuro_builder_active_id', this.activeModuleId()!);
    }

    this.saveSavedModulesToStorage(list);
  }
}
