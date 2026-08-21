import { Component, inject, signal, computed, ViewChild, ElementRef, OnInit, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { AgentAIService, AgentSession, ProjectFile, TaskLogEntry } from '../../core/agent-ai.service';
import { FirebaseService } from '../../core/services/firebase.service';

@Component({
  selector: 'app-agent-ai',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  templateUrl: './agent-ai.component.html',
  styleUrls: ['./agent-ai.component.scss']
})
export class AgentAIComponent implements OnInit, AfterViewChecked {
  agentService = inject(AgentAIService);
  firebase = inject(FirebaseService);
  sanitizer = inject(DomSanitizer);
  route = inject(ActivatedRoute);

  @ViewChild('logTerminal') private logTerminal!: ElementRef;
  @ViewChild('agentChatContainer') private agentChatContainer!: ElementRef;

  // View States
  showArchive = signal<boolean>(true);
  archiveSearchQuery = signal<string>('');
  activeTab = signal<'code' | 'preview'>('preview');
  promptInput = signal<string>('');
  showEngineSettings = signal<boolean>(false);
  copySuccess = signal<boolean>(false);

  // Engines list
  availableEngines = [
    { id: 'GEMINI 2.5 PRO+', label: 'Gemini 2.5 Pro+ (Neural Engine)', desc: 'المحرك البرمجي الأساسي فائق الدقة' },
    { id: 'GPT-4O ARCHITECT', label: 'OpenAI GPT-4o Omnichannel', desc: 'توليد الشفرات وتصحيح الأخطاء' },
    { id: 'GROQ LLAMA 3.3', label: 'Groq Llama 3.3 (Ultra Fast)', desc: 'استجابة فائقة السرعة للمشاريع الصغيرة' },
    { id: 'GITHUB COPILOT ENGINE', label: 'GitHub Copilot Engine', desc: 'محرك مطوري جيت هب' }
  ];

  // Filtered Sessions
  filteredSessions = computed(() => {
    const q = this.archiveSearchQuery().toLowerCase().trim();
    const list = this.agentService.sessions();
    if (!q) return list;
    return list.filter(s => s.title.toLowerCase().includes(q) || s.messages.some(m => m.text.toLowerCase().includes(q)));
  });

  // Safe Preview Iframe URL/Content
  previewHtml = computed<SafeHtml>(() => {
    const session = this.agentService.activeSession;
    if (!session || !session.files || session.files.length === 0) return '';

    const htmlFile = session.files.find(f => f.name.endsWith('.html')) || session.files[0];
    const cssFile = session.files.find(f => f.name.endsWith('.css'));
    const jsFile = session.files.find(f => f.name.endsWith('.js'));

    let fullHtml = htmlFile.content || '';
    if (cssFile && !fullHtml.includes(cssFile.content)) {
      fullHtml = fullHtml.replace('</head>', `<style>${cssFile.content}</style></head>`);
    }
    if (jsFile && !fullHtml.includes(jsFile.content)) {
      fullHtml = fullHtml.replace('</body>', `<script>${jsFile.content}</script></body>`);
    }

    return this.sanitizer.bypassSecurityTrustHtml(fullHtml);
  });

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['session']) {
        this.agentService.selectSession(params['session']);
      }
    });
  }

  ngAfterViewChecked(): void {
    this.scrollTerminalToBottom();
  }

  private scrollTerminalToBottom(): void {
    try {
      if (this.logTerminal?.nativeElement) {
        this.logTerminal.nativeElement.scrollTop = this.logTerminal.nativeElement.scrollHeight;
      }
    } catch {}
  }

  // Create New Session
  newSession(): void {
    this.agentService.createSession();
  }

  // Select Session
  selectSession(s: AgentSession): void {
    this.agentService.selectSession(s.id);
  }

  // Delete Session
  deleteSession(event: Event, id: string): void {
    event.stopPropagation();
    if (confirm('هل أنت متأكد من حذف هذه الجلسة البرمجية؟')) {
      this.agentService.deleteSession(id);
    }
  }

  // Send Prompt
  async handleSend(): Promise<void> {
    const text = this.promptInput().trim();
    if (!text || this.agentService.isExecuting()) return;

    this.promptInput.set('');
    await this.agentService.executePrompt(text);
  }

  // Select Active File
  selectFile(file: ProjectFile): void {
    this.agentService.activeFile.set(file);
    this.activeTab.set('code');
  }

  // Copy Active File Code
  copyCode(): void {
    const file = this.agentService.activeFile();
    if (!file) return;
    navigator.clipboard.writeText(file.content);
    this.copySuccess.set(true);
    setTimeout(() => this.copySuccess.set(false), 2000);
  }

  // Download Project Files
  downloadProject(): void {
    const session = this.agentService.activeSession;
    if (!session || !session.files.length) return;

    // Download active file as text
    const file = this.agentService.activeFile() || session.files[0];
    const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Relative Time in Arabic
  formatRelativeTime(isoStr: string): string {
    if (!isoStr) return 'منذ قليل';
    const diffMs = Date.now() - new Date(isoStr).getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const months = Math.floor(days / 30);
    if (months >= 1) return `منذ ${months} أشهر`;
    if (days >= 1) return `منذ ${days} أيام`;
    return 'اليوم';
  }
}
