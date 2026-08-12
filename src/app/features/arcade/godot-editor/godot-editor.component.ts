import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { 
  LucideAngularModule, ArrowRight, Play, Square, Download, Save, 
  Plus, Trash2, Code, Eye, Layers, Gamepad2, FolderOpen, RefreshCw
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
                  class="p-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg transition">
                  <lucide-icon [img]="Play" class="w-4 h-4"></lucide-icon>
                </button>
                <button 
                  (click)="stopPreview()"
                  [disabled]="!isPlaying()"
                  class="p-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg transition">
                  <lucide-icon [img]="Square" class="w-4 h-4"></lucide-icon>
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

          <!-- AI Generation -->
          <div class="bg-slate-900 border border-white/10 rounded-2xl p-4">
            <h3 class="text-sm font-bold text-white mb-3">توليد بالذكاء الاصطناعي</h3>
            <textarea 
              [(ngModel)]="aiPrompt"
              rows="3"
              placeholder="صف اللعبة التي تريد إنشاءها..."
              class="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none mb-3"
            ></textarea>
            <button 
              (click)="generateWithAI()"
              [disabled]="isGenerating() || !aiPrompt.trim()"
              class="w-full py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 rounded-xl text-xs font-bold text-white transition flex items-center justify-center gap-2">
              <lucide-icon [img]="isGenerating() ? RefreshCw : Gamepad2" [class.animate-spin]="isGenerating()" class="w-4 h-4"></lucide-icon>
              <span>{{ isGenerating() ? 'جاري التوليد...' : 'توليد اللعبة بالذكاء الاصطناعي' }}</span>
            </button>
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
  previewUrl = signal<SafeResourceUrl | null>(null);

  currentScriptContent = '';
  currentScriptAttachment = '';

  ngOnInit() {
    this.loadSavedProjects();
    this.createNewProject();
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
      const systemPrompt = `You are an expert Godot 4.x game developer. Generate a complete game based on this request: "${prompt}"

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

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }]
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
      
      this.toast.show('🎮 تم توليد اللعبة بنجاح بالذكاء الاصطناعي!', 'success');
    } catch (e) {
      console.error('AI generation error:', e);
      this.toast.show('❌ فشل التوليد. تأكد من مفتاح API.', 'error');
    } finally {
      this.isGenerating.set(false);
    }
  }
}
