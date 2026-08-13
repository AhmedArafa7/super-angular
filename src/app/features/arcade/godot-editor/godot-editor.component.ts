import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { 
  LucideAngularModule, ArrowRight, Play, Square, Download, Save, 
  Plus, Trash2, Code, Eye, Layers, Gamepad2, FolderOpen, RefreshCw,
  Image as ImageIcon, Upload, X, Maximize2, Sliders, Palette, Sun, Zap
} from 'lucide-angular';
import { ToastService } from '../../../core/services/toast.service';
import { 
  GodotExportService, 
  GodotProject, 
  GodotScript, 
  GodotAsset 
} from '../../../core/services/godot-export.service';
import { GODOT_TEMPLATES } from './godot-templates';

@Component({
  selector: 'app-godot-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  template: `
    <div class="min-h-screen bg-slate-950 p-6 text-white font-sans" dir="rtl">
      
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-4">
          <a routerLink="/arcade" class="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-slate-300 hover:text-white transition">
            <lucide-icon [img]="ArrowRight" class="w-6 h-6"></lucide-icon>
          </a>
          <div>
            <h1 class="text-2xl font-black text-white flex items-center gap-2">
              <lucide-icon [img]="Gamepad2" class="w-6 h-6 text-indigo-400"></lucide-icon>
              <span>Godot Game Builder</span>
            </h1>
            <p class="text-xs text-slate-400">أنشئ ألعاب بمحرك Godot بالذكاء الاصطناعي</p>
          </div>
        </div>
        
        <div class="flex items-center gap-2">
          <button (click)="openOfficialGodotEditor()" class="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-lg shadow-purple-600/30">
            <lucide-icon [img]="Gamepad2" class="w-4 h-4 text-purple-200"></lucide-icon>
            <span>فتح واجهة Godot 4 الرسمية 🎮</span>
          </button>
          <button (click)="saveCurrentProject()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold flex items-center gap-2 transition">
            <lucide-icon [img]="Save" class="w-4 h-4"></lucide-icon>
            <span>حفظ</span>
          </button>
          <button (click)="exportGame()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold flex items-center gap-2 transition">
            <lucide-icon [img]="Download" class="w-4 h-4"></lucide-icon>
            <span>تصدير HTML</span>
          </button>
        </div>
      </div>

      <!-- Official Godot Engine Fullscreen Modal -->
      @if (showOfficialEditorModal()) {
        <div class="fixed inset-0 z-50 bg-slate-950/95 backdrop-filter backdrop-blur-lg flex items-center justify-center p-6">
          <div class="bg-slate-900 border border-indigo-500/30 rounded-3xl p-8 max-w-2xl w-full text-center space-y-6 shadow-2xl shadow-indigo-600/30 relative">
            <button (click)="closeOfficialGodotEditor()" class="absolute top-4 left-4 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/50">
              <lucide-icon [img]="X" class="w-5 h-5"></lucide-icon>
            </button>

            <div class="w-20 h-20 bg-indigo-600/20 border border-indigo-500/40 rounded-3xl flex items-center justify-center mx-auto text-indigo-400 shadow-inner">
              <lucide-icon [img]="Gamepad2" class="w-10 h-10"></lucide-icon>
            </div>

            <div class="space-y-2">
              <h2 class="text-2xl font-black text-white">محرر Godot Engine 4.2 الرسمي الأصلي ⚙️</h2>
              <p class="text-sm text-slate-300 leading-relaxed max-w-lg mx-auto">
                نظراً لقيود الحماية في المتصفحات العالمية (X-Frame-Options)، ترفض خوادم Godot الرسمية العرض داخل إطار صغير (iframe). 
                يمكنك فتح محرر Godot 4 الكامل في تبويب مستقل بضغطة واحدة!
              </p>
            </div>

            <div class="bg-slate-950/80 border border-white/5 rounded-2xl p-4 text-right space-y-2">
              <div class="flex items-center gap-2 text-xs font-bold text-emerald-400">
                <span>✓ المحرر يعمل بـ WebAssembly بجميع مزايا الـ 3D Viewport والـ Inspector</span>
              </div>
              <div class="flex items-center gap-2 text-xs font-bold text-indigo-400">
                <span>✓ يمكنك تصدير الملفات واستيرادها مباشرة إلى مشروعك</span>
              </div>
            </div>

            <div class="flex items-center justify-center gap-3 pt-2">
              <button 
                (click)="launchOfficialGodotWebTab()"
                class="px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-2xl text-sm font-bold text-white transition flex items-center gap-2 shadow-xl shadow-indigo-600/40">
                <lucide-icon [img]="Gamepad2" class="w-5 h-5"></lucide-icon>
                <span>فتح محرر Godot 4 في تبويب جديد 🚀</span>
              </button>
              <button 
                (click)="closeOfficialGodotEditor()"
                class="px-6 py-3.5 bg-slate-800 hover:bg-slate-700 rounded-2xl text-sm font-bold text-slate-300 transition">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      }

      <div class="grid grid-cols-12 gap-4">
        
        <!-- Left Panel: Templates & Projects -->
        <div class="col-span-3 space-y-4">
          
          <!-- Templates -->
          <div class="bg-slate-900 border border-white/10 rounded-2xl p-4">
            <h3 class="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <lucide-icon [img]="Layers" class="w-4 h-4 text-indigo-400"></lucide-icon>
              <span>قوالب جاهزة</span>
            </h3>
            <div class="space-y-2">
              @for (template of templates; track template.id) {
                <button 
                  (click)="applyTemplate(template)"
                  class="w-full p-3 bg-slate-950 hover:bg-indigo-600/20 border border-white/5 hover:border-indigo-500/40 rounded-xl text-right transition">
                  <span class="text-xs font-bold text-white block">{{ template.name }}</span>
                  <span class="text-[10px] text-slate-400">{{ template.description }}</span>
                </button>
              }
            </div>
          </div>

          <!-- Saved Projects -->
          <div class="bg-slate-900 border border-white/10 rounded-2xl p-4">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-sm font-bold text-white flex items-center gap-2">
                <lucide-icon [img]="FolderOpen" class="w-4 h-4 text-indigo-400"></lucide-icon>
                <span>مشاريعي</span>
              </h3>
              <button (click)="createNewProject()" class="p-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition">
                <lucide-icon [img]="Plus" class="w-3 h-3"></lucide-icon>
              </button>
            </div>
            <div class="space-y-2 max-h-48 overflow-y-auto">
              @for (project of savedProjects(); track project.id) {
                <div 
                  (click)="loadProject(project.id)"
                  [class.bg-indigo-600/20]="currentProject()?.id === project.id"
                  [class.border-indigo-500/50]="currentProject()?.id === project.id"
                  class="p-2 bg-slate-950 hover:bg-white/5 border border-white/5 rounded-xl cursor-pointer transition flex items-center justify-between group">
                  <span class="text-xs font-bold text-white truncate">{{ project.name }}</span>
                  <button 
                    (click)="deleteProject(project.id); $event.stopPropagation()"
                    class="p-1 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded transition opacity-0 group-hover:opacity-100">
                    <lucide-icon [img]="Trash2" class="w-3 h-3"></lucide-icon>
                  </button>
                </div>
              }
              @if (savedProjects().length === 0) {
                <p class="text-[10px] text-slate-500 text-center">لا توجد مشاريع محفوظة</p>
              }
            </div>
          </div>
        </div>

        <!-- Center Panel: Scene Tree & Script Editor -->
        <div class="col-span-5 space-y-4">
          
          <!-- Project Name -->
          <div class="bg-slate-900 border border-white/10 rounded-2xl p-4">
            <label class="text-xs font-bold text-slate-300 block mb-2">اسم المشروع:</label>
            <input 
              type="text" 
              [(ngModel)]="projectName"
              placeholder="اسم اللعبة..."
              class="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <!-- Scene Tree -->
          <div class="bg-slate-900 border border-white/10 rounded-2xl p-4">
            <h3 class="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <lucide-icon [img]="Layers" class="w-4 h-4 text-indigo-400"></lucide-icon>
              <span>شجرة المشاهد (Scene Tree)</span>
            </h3>
            <textarea 
              [(ngModel)]="sceneTreeContent"
              rows="10"
              class="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs font-mono text-emerald-300 focus:outline-none focus:border-indigo-500 resize-y"
              dir="ltr"
              placeholder="[gd_scene ...]"
            ></textarea>
          </div>

          <!-- Script Editor -->
          <div class="bg-slate-900 border border-white/10 rounded-2xl p-4">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-sm font-bold text-white flex items-center gap-2">
                <lucide-icon [img]="Code" class="w-4 h-4 text-indigo-400"></lucide-icon>
                <span>محرر GDScript</span>
              </h3>
              <button (click)="addNewScript()" class="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-[10px] font-bold flex items-center gap-1 transition">
                <lucide-icon [img]="Plus" class="w-3 h-3"></lucide-icon>
                <span>سكربت جديد</span>
              </button>
            </div>
            
            <!-- Script Tabs -->
            <div class="flex gap-2 mb-3 overflow-x-auto">
              @for (script of currentScripts(); track script.name; let i = $index) {
                <button 
                  (click)="selectScript(i)"
                  [class.bg-indigo-600]="selectedScriptIndex() === i"
                  [class.bg-slate-800]="selectedScriptIndex() !== i"
                  class="px-3 py-1.5 rounded-lg text-xs font-bold text-white whitespace-nowrap transition">
                  {{ script.name }}
                </button>
              }
            </div>
            
            <!-- Script Content -->
            @if (currentScripts().length > 0) {
              <textarea 
                [(ngModel)]="currentScriptContent"
                rows="15"
                class="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs font-mono text-emerald-300 focus:outline-none focus:border-indigo-500 resize-y"
                dir="ltr"
                placeholder="extends CharacterBody2D&#10;&#10;func _ready():&#10;    pass"
              ></textarea>
              
              <div class="flex items-center gap-2 mt-3">
                <label class="text-xs text-slate-400">مرتبط بـ:</label>
                <input 
                  type="text" 
                  [(ngModel)]="currentScriptAttachment"
                  class="flex-1 bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                  dir="ltr"
                  placeholder="NodePath"
                />
                <button (click)="deleteCurrentScript()" class="p-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg transition">
                  <lucide-icon [img]="Trash2" class="w-3 h-3"></lucide-icon>
                </button>
              </div>
            }
          </div>
        </div>

        <!-- Right Panel: Preview -->
        <div class="col-span-4 space-y-4">
          
          <!-- Preview Controls -->
          <div class="bg-slate-900 border border-white/10 rounded-2xl p-4">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-bold text-white flex items-center gap-2">
                <lucide-icon [img]="Eye" class="w-4 h-4 text-indigo-400"></lucide-icon>
                <span>معاينة اللعبة</span>
              </h3>
              <div class="flex items-center gap-2">
                <button 
                  (click)="runPreview()"
                  [disabled]="isPlaying()"
                  title="تشغيل المعاينة"
                  class="p-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg transition text-white">
                  <lucide-icon [img]="Play" class="w-4 h-4"></lucide-icon>
                </button>
                <button 
                  (click)="stopPreview()"
                  [disabled]="!isPlaying()"
                  title="إيقاف المعاينة"
                  class="p-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg transition text-white">
                  <lucide-icon [img]="Square" class="w-4 h-4"></lucide-icon>
                </button>
                <button 
                  (click)="toggleFullScreen()"
                  [disabled]="!isPlaying()"
                  title="ملء الشاشة بالكامل ⛶"
                  class="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg text-xs font-bold transition flex items-center gap-1 text-white">
                  <lucide-icon [img]="Maximize2" class="w-3.5 h-3.5"></lucide-icon>
                  <span>ملء الشاشة</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Game Preview -->
          <div class="bg-slate-900 border border-white/10 rounded-2xl p-4 min-h-[400px]">
            @if (previewUrl()) {
              <iframe 
                [src]="previewUrl()" 
                class="w-full h-[380px] border-0 rounded-xl bg-slate-950"
                sandbox="allow-scripts allow-same-origin"
              ></iframe>
            } @else {
              <div class="w-full h-[380px] bg-slate-950 rounded-xl flex items-center justify-center">
                <p class="text-slate-500 text-sm">اضغط "تشغيل" لمعاينة اللعبة</p>
              </div>
            }
          </div>

          <!-- AI Generation & Multimodal Vision -->
          <div class="bg-slate-900 border border-white/10 rounded-2xl p-4 space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-bold text-white flex items-center gap-2">
                <lucide-icon [img]="Gamepad2" class="w-4 h-4 text-indigo-400"></lucide-icon>
                <span>توليد وتعديل بالذكاء الاصطناعي</span>
              </h3>
              
              <!-- Image Upload Button -->
              <label class="p-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 rounded-lg text-xs font-bold cursor-pointer transition flex items-center gap-1" title="إرفاق صورة مرجعية أو لقطة شاشة للـ AI">
                <lucide-icon [img]="ImageIcon" class="w-3.5 h-3.5"></lucide-icon>
                <span>إرفاق صورة 🖼️</span>
                <input type="file" accept="image/*" (change)="onImageSelected($event)" class="hidden" />
              </label>
            </div>

            <!-- Attached Image Preview Badge -->
            @if (attachedImagePreview()) {
              <div class="relative rounded-xl overflow-hidden border border-indigo-500/40 bg-slate-950 p-2 flex items-center gap-3">
                <img [src]="attachedImagePreview()" class="w-12 h-12 object-cover rounded-lg border border-white/10" />
                <div class="flex-1 min-w-0">
                  <span class="text-[11px] font-bold text-indigo-300 block truncate">صورة مرجعية مرفقة 🖼️</span>
                  <span class="text-[9px] text-slate-400 block">سوف يستعين بها AI Gemini للتعديل بصرياً</span>
                </div>
                <button (click)="removeAttachedImage()" class="p-1 text-slate-400 hover:text-red-400 rounded-lg">
                  <lucide-icon [img]="X" class="w-4 h-4"></lucide-icon>
                </button>
              </div>
            }

            <textarea 
              [(ngModel)]="aiPrompt"
              rows="3"
              placeholder="صف اللعبة أو التعديلات المطلوبة (يمكنك إرفاق صورة مع الوصف)..."
              class="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none font-medium"
            ></textarea>

            <button 
              (click)="generateWithAI()"
              [disabled]="isGenerating() || !aiPrompt.trim()"
              class="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 rounded-xl text-xs font-bold text-white transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30">
              <lucide-icon [img]="isGenerating() ? RefreshCw : Gamepad2" [class.animate-spin]="isGenerating()" class="w-4 h-4"></lucide-icon>
              <span>{{ isGenerating() ? 'الذكاء الاصطناعي يبني اللعبة...' : 'توليد وتحديث اللعبة بالـ AI ⚡' }}</span>
            </button>
          </div>

          <!-- Visual Node Inspector & Sliders -->
          <div class="bg-slate-900 border border-white/10 rounded-2xl p-4 space-y-4">
            <h3 class="text-sm font-bold text-white flex items-center justify-between">
              <span class="flex items-center gap-2">
                <lucide-icon [img]="Sliders" class="w-4 h-4 text-emerald-400"></lucide-icon>
                <span>مفتش الخصائص البصري (Visual Inspector)</span>
              </span>
              <span class="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full font-mono">تفاعلي ⚙️</span>
            </h3>

            <!-- Color Palette Customizer -->
            <div class="space-y-2">
              <label class="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <lucide-icon [img]="Palette" class="w-3.5 h-3.5 text-indigo-400"></lucide-icon>
                <span>تخصيص ألوان اللعبة (Colors):</span>
              </label>
              <div class="grid grid-cols-2 gap-2">
                <div class="bg-slate-950 p-2 rounded-xl border border-white/5 flex items-center justify-between">
                  <span class="text-[11px] text-slate-300 font-bold">لون البطل</span>
                  <input type="color" [(ngModel)]="inspectorPlayerColor" (change)="applyVisualInspectorChanges()" class="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0" />
                </div>
                <div class="bg-slate-950 p-2 rounded-xl border border-white/5 flex items-center justify-between">
                  <span class="text-[11px] text-slate-300 font-bold">لون الأرضية</span>
                  <input type="color" [(ngModel)]="inspectorFloorColor" (change)="applyVisualInspectorChanges()" class="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0" />
                </div>
              </div>
            </div>

            <!-- Physics Sliders -->
            <div class="space-y-3 pt-1 border-t border-white/5">
              <div>
                <div class="flex justify-between text-xs font-bold text-slate-300 mb-1">
                  <span>سرعة حركة اللعبة (Speed):</span>
                  <span class="text-indigo-400 font-mono">{{ inspectorSpeed }}</span>
                </div>
                <input type="range" min="4" max="30" [(ngModel)]="inspectorSpeed" (input)="applyVisualInspectorChanges()" class="w-full accent-indigo-500 cursor-pointer" />
              </div>

              <div>
                <div class="flex justify-between text-xs font-bold text-slate-300 mb-1">
                  <span>قوة القفز (Jump Velocity):</span>
                  <span class="text-emerald-400 font-mono">{{ inspectorJumpForce }}</span>
                </div>
                <input type="range" min="5" max="25" [(ngModel)]="inspectorJumpForce" (input)="applyVisualInspectorChanges()" class="w-full accent-emerald-500 cursor-pointer" />
              </div>
            </div>

            <!-- Quick Node Injectors -->
            <div class="flex gap-2 pt-1 border-t border-white/5">
              <button (click)="injectLightingNode()" class="flex-1 py-1.5 bg-slate-950 hover:bg-indigo-600/20 border border-white/5 hover:border-indigo-500/40 rounded-xl text-[10px] font-bold text-slate-300 hover:text-white transition flex items-center justify-center gap-1">
                <lucide-icon [img]="Sun" class="w-3 h-3 text-amber-400"></lucide-icon>
                <span>إضافة إضاءة 3D 💡</span>
              </button>
              <button (click)="boostPhysicsMode()" class="flex-1 py-1.5 bg-slate-950 hover:bg-purple-600/20 border border-white/5 hover:border-purple-500/40 rounded-xl text-[10px] font-bold text-slate-300 hover:text-white transition flex items-center justify-center gap-1">
                <lucide-icon [img]="Zap" class="w-3 h-3 text-purple-400"></lucide-icon>
                <span>مضاعفة السرعة ⚡</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class GodotEditorComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);
  private toast = inject(ToastService);
  private godotService = inject(GodotExportService);

  // Icons
  ArrowRight = ArrowRight;
  Play = Play;
  Square = Square;
  Download = Download;
  Save = Save;
  Plus = Plus;
  Trash2 = Trash2;
  Code = Code;
  Eye = Eye;
  Layers = Layers;
  Gamepad2 = Gamepad2;
  FolderOpen = FolderOpen;
  RefreshCw = RefreshCw;
  Sliders = Sliders;
  Palette = Palette;
  Sun = Sun;
  Zap = Zap;
  Maximize2 = Maximize2;

  // Visual Node Inspector Properties
  inspectorPlayerColor = '#38bdf8';
  inspectorFloorColor = '#1e1b4b';
  inspectorSpeed = 12;
  inspectorJumpForce = 12;

  applyVisualInspectorChanges() {
    // 1. Update GDScript speed and jump forces if found
    let scriptChanged = false;
    const scripts = [...this.currentScripts()];
    for (let script of scripts) {
      if (script.content.includes('speed') || script.content.includes('SPEED')) {
        script.content = script.content.replace(/(@export\s+var\s+speed:\s*float\s*=\s*)\d+(\.\d+)?/gi, `$1${this.inspectorSpeed}.0`);
        script.content = script.content.replace(/(const\s+SPEED\s*=\s*)\d+(\.\d+)?/gi, `$1${this.inspectorSpeed * 25}.0`);
        scriptChanged = true;
      }
      if (script.content.includes('jump_velocity') || script.content.includes('JUMP_VELOCITY')) {
        script.content = script.content.replace(/(@export\s+var\s+jump_velocity:\s*float\s*=\s*)\d+(\.\d+)?/gi, `$1${this.inspectorJumpForce}.0`);
        script.content = script.content.replace(/(const\s+JUMP_VELOCITY\s*=\s*)-?\d+(\.\d+)?/gi, `$1-${this.inspectorJumpForce * 30}.0`);
        scriptChanged = true;
      }
    }
    if (scriptChanged) {
      this.currentScripts.set(scripts);
      this.updateScriptContent();
    }

    // 2. Update SceneTree colors
    if (this.sceneTreeContent.includes('albedo_color')) {
      const hexToColor = (hex: string) => {
        const r = (parseInt(hex.slice(1, 3), 16) / 255).toFixed(2);
        const g = (parseInt(hex.slice(3, 5), 16) / 255).toFixed(2);
        const b = (parseInt(hex.slice(5, 7), 16) / 255).toFixed(2);
        return `Color(${r}, ${g}, ${b}, 1)`;
      };

      this.sceneTreeContent = this.sceneTreeContent.replace(
        /albedo_color\s*=\s*Color\([^)]+\)/i,
        `albedo_color = ${hexToColor(this.inspectorFloorColor)}`
      );
    }

    this.saveCurrentProject();

    // Auto Refresh Preview live
    if (this.isPlaying()) {
      this.runPreview();
    }
  }

  injectLightingNode() {
    if (!this.sceneTreeContent.includes('DirectionalLight3D')) {
      this.sceneTreeContent += `\n\n[node name="DirectionalLight3D" type="DirectionalLight3D" parent="."]\ntransform = Transform3D(1, 0, 0, 0, 0.707, 0.707, 0, -0.707, 0.707, 0, 10, 0)\nshadow_enabled = true`;
      this.saveCurrentProject();
      if (this.isPlaying()) this.runPreview();
      this.toast.show('💡 تم إضافة إضاءة 3D موجهة (DirectionalLight3D) بنجاح!', 'success');
    } else {
      this.toast.show('💡 الإضاءة مضافة بالفعل في شجرة المشاهد!', 'info');
    }
  }

  boostPhysicsMode() {
    this.inspectorSpeed = Math.min(30, this.inspectorSpeed + 6);
    this.inspectorJumpForce = Math.min(25, this.inspectorJumpForce + 4);
    this.applyVisualInspectorChanges();
    this.toast.show('⚡ تم مضاعفة سرعة اللعبة وقفز البطل بنجاح!', 'success');
  }

  templates = GODOT_TEMPLATES;
  
  projectName = '';
  sceneTreeContent = '';
  aiPrompt = '';
  
  currentProject = signal<GodotProject | null>(null);
  savedProjects = signal<GodotProject[]>([]);
  currentScripts = signal<GodotScript[]>([]);
  selectedScriptIndex = signal<number>(0);
  
  isPlaying = signal<boolean>(false);
  isGenerating = signal<boolean>(false);
  showOfficialEditorModal = signal<boolean>(false);
  previewUrl = signal<SafeResourceUrl | null>(null);

  openOfficialGodotEditor() {
    this.showOfficialEditorModal.set(true);
  }

  launchOfficialGodotWebTab() {
    window.open('https://editor.godotengine.org/', '_blank');
    this.showOfficialEditorModal.set(false);
    this.toast.show('🚀 تم فتح محرر Godot 4 الرسمي في تبويب جديد بنجاح!', 'success');
  }

  closeOfficialGodotEditor() {
    this.showOfficialEditorModal.set(false);
  }

  currentScriptContent = '';
  currentScriptAttachment = '';

  ngOnInit() {
    this.loadSavedProjects();
    const projects = this.savedProjects();
    if (projects.length > 0) {
      this.loadProject(projects[0].id);
    } else {
      this.applyTemplate(this.templates[0]);
    }
  }

  ngOnDestroy() {
    this.stopPreview();
  }

  loadSavedProjects() {
    const projects = this.godotService.getAllProjects();
    this.savedProjects.set(projects);
  }

  createNewProject() {
    const project = this.godotService.createNewProject('لعبة جديدة');
    this.currentProject.set(project);
    this.projectName = project.name;
    this.sceneTreeContent = project.sceneTree;
    this.currentScripts.set([...project.scripts]);
    this.selectedScriptIndex.set(0);
    this.updateScriptContent();
    this.toast.show('تم إنشاء مشروع جديد 🎮', 'info');
  }

  applyTemplate(template: any) {
    const project = this.godotService.createNewProject(template.name);
    project.sceneTree = template.sceneTree;
    project.scripts = [...template.scripts];
    
    this.currentProject.set(project);
    this.projectName = project.name;
    this.sceneTreeContent = project.sceneTree;
    this.currentScripts.set([...project.scripts]);
    this.selectedScriptIndex.set(0);
    this.updateScriptContent();
    this.saveCurrentProject();
    
    this.toast.show(`تم تطبيق قالب "${template.name}" 📋`, 'info');
  }

  loadProject(projectId: string) {
    const project = this.godotService.loadProject(projectId);
    if (project) {
      this.currentProject.set(project);
      this.projectName = project.name;
      this.sceneTreeContent = project.sceneTree;
      this.currentScripts.set([...project.scripts]);
      this.selectedScriptIndex.set(0);
      this.updateScriptContent();
      this.toast.show(`تم تحميل مشروع "${project.name}" 📂`, 'info');
    }
  }

  saveCurrentProject() {
    const project = this.currentProject();
    if (!project) return;

    project.name = this.projectName;
    project.sceneTree = this.sceneTreeContent;
    project.scripts = this.currentScripts();
    
    this.godotService.saveProject(project);
    this.loadSavedProjects();
    this.toast.show('تم حفظ المشروع بنجاح 💾', 'success');
  }

  deleteProject(projectId: string) {
    this.godotService.deleteProject(projectId);
    this.loadSavedProjects();
    
    if (this.currentProject()?.id === projectId) {
      this.createNewProject();
    }
    
    this.toast.show('تم حذف المشروع 🗑️', 'info');
  }

  selectScript(index: number) {
    this.saveCurrentScriptContent();
    this.selectedScriptIndex.set(index);
    this.updateScriptContent();
  }

  updateScriptContent() {
    const scripts = this.currentScripts();
    const index = this.selectedScriptIndex();
    
    if (scripts[index]) {
      this.currentScriptContent = scripts[index].content;
      this.currentScriptAttachment = scripts[index].attachedTo;
    }
  }

  saveCurrentScriptContent() {
    const scripts = [...this.currentScripts()];
    const index = this.selectedScriptIndex();
    
    if (scripts[index]) {
      scripts[index] = {
        ...scripts[index],
        content: this.currentScriptContent,
        attachedTo: this.currentScriptAttachment
      };
      this.currentScripts.set(scripts);
    }
  }

  addNewScript() {
    const scripts = [...this.currentScripts()];
    const newScript: GodotScript = {
      name: `script_${scripts.length + 1}.gd`,
      content: `extends Node

func _ready():
    pass
`,
      attachedTo: 'Root'
    };
    
    scripts.push(newScript);
    this.currentScripts.set(scripts);
    this.selectedScriptIndex.set(scripts.length - 1);
    this.updateScriptContent();
    
    this.toast.show('تم إضافة سكربت جديد 📝', 'info');
  }

  deleteCurrentScript() {
    const scripts = [...this.currentScripts()];
    const index = this.selectedScriptIndex();
    
    if (scripts.length <= 1) {
      this.toast.show('لا يمكن حذف السكربت الوحيد', 'warning');
      return;
    }
    
    scripts.splice(index, 1);
    this.currentScripts.set(scripts);
    
    if (index >= scripts.length) {
      this.selectedScriptIndex.set(scripts.length - 1);
    }
    
    this.updateScriptContent();
    this.toast.show('تم حذف السكربت 🗑️', 'info');
  }

  runPreview() {
    this.saveCurrentScriptContent();
    
    const project = this.currentProject();
    if (!project) return;

    project.name = this.projectName;
    project.sceneTree = this.sceneTreeContent;
    project.scripts = this.currentScripts();
    
    this.godotService.exportToWeb(project).then(html => {
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      this.previewUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
      this.isPlaying.set(true);
      this.toast.show('جاري تشغيل اللعبة ▶️', 'info');
    });
  }

  stopPreview() {
    this.previewUrl.set(null);
    this.isPlaying.set(false);
  }

  async toggleFullScreen() {
    const project = this.currentProject();
    if (!project) return;
    const html = await this.godotService.exportToWeb(project);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      this.toast.show('⚡ تم فتح اللعبة في شاشة مستقلة بكامل الحجم!', 'success');
    }
  }

  async exportGame() {
    this.saveCurrentScriptContent();
    
    const project = this.currentProject();
    if (!project) return;

    project.name = this.projectName;
    project.sceneTree = this.sceneTreeContent;
    project.scripts = this.currentScripts();
    
    const html = await this.godotService.exportToWeb(project);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Godot_Game_${project.name}_${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
    
    this.toast.show('تم تصدير اللعبة بنجاح 📦', 'success');
  }

  attachedImagePreview = signal<string | null>(null);
  attachedImageBase64: string | null = null;
  attachedImageMimeType = 'image/png';
  ImageIcon = ImageIcon;
  Upload = Upload;
  X = X;

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.attachedImageMimeType = file.type || 'image/png';
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        this.attachedImagePreview.set(result);
        this.attachedImageBase64 = result.split(',')[1] || null;
        this.toast.show('🖼️ تم إرفاق الصورة بنجاح! يمكنك الآن توجيه AI بناءً عليها.', 'info');
      };
      reader.readAsDataURL(file);
    }
  }

  removeAttachedImage() {
    this.attachedImagePreview.set(null);
    this.attachedImageBase64 = null;
  }

  async generateWithAI() {
    const prompt = this.aiPrompt.trim();
    if (!prompt) return;

    const apiKey = localStorage.getItem('Si-Neuro-chat-apiKey') || '';
    if (!apiKey) {
      this.toast.show('⚠️ يرجى إدخال مفتاح Gemini API أولاً!', 'warning');
      return;
    }

    this.isGenerating.set(true);

    try {
      const systemPrompt = `You are an expert Godot 4.x game developer. Generate a complete game or apply requested fixes based on user instructions: "${prompt}".
Ensure physics, spawning, procedural recycling, camera tracking, and materials are valid and functional.

OUTPUT FORMAT (JSON):
{
  "name": "Game Name",
  "sceneTree": "Complete .tscn content in Godot format",
  "scripts": [
    {
      "name": "filename.gd",
      "content": "Complete GDScript code",
      "attachedTo": "NodePath"
    }
  ]
}

REQUIREMENTS:
1. Generate valid Godot 4.x scene tree format
2. Generate complete GDScript code
3. Use only built-in Godot nodes
4. Make the game fun and playable
5. Return ONLY valid JSON, no markdown`;

      const requestParts: any[] = [{ text: systemPrompt }];
      if (this.attachedImageBase64) {
        requestParts.push({
          inline_data: {
            mime_type: this.attachedImageMimeType,
            data: this.attachedImageBase64
          }
        });
      }

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: requestParts }]
        })
      });

      if (!res.ok) throw new Error('API Error');

      const data = await res.json();
      let output = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      output = output.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
      
      const gameData = JSON.parse(output);
      
      const project = this.godotService.createNewProject(gameData.name || prompt.substring(0, 30));
      project.sceneTree = gameData.sceneTree || project.sceneTree;
      project.scripts = gameData.scripts || project.scripts;
      
      this.currentProject.set(project);
      this.projectName = project.name;
      this.sceneTreeContent = project.sceneTree;
      this.currentScripts.set([...project.scripts]);
      this.selectedScriptIndex.set(0);
      this.updateScriptContent();
      this.saveCurrentProject();

      if (this.isPlaying()) {
        this.runPreview();
      }
      
      this.toast.show('🎮 تم توليد وتعديل اللعبة بنجاح بالذكاء الاصطناعي!', 'success');
    } catch (e) {
      console.error('AI generation error:', e);
      this.toast.show('❌ فشل التوليد. تأكد من مفتاح API.', 'error');
    } finally {
      this.isGenerating.set(false);
    }
  }
}
