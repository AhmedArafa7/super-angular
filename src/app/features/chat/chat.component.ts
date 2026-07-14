import { Component, inject, signal, ElementRef, ViewChild, AfterViewChecked, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Sparkles, Send, Trash2, Volume2, VolumeX, Settings, Plus, Eye, EyeOff, CheckCircle2, AlertTriangle, RefreshCw, Cpu, Layers } from 'lucide-angular';
import { LucideDynamicIcon } from '@lucide/angular';
import { ChatService, ChatMessage, AIProviderModel } from '../../core/chat.service';

@Component({
  selector: 'app-ai-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, LucideDynamicIcon],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit, AfterViewChecked {
  chatService = inject(ChatService);

  @ViewChild('chatScrollContainer') private scrollContainer!: ElementRef;

  // Local state
  inputText = '';
  isThinking = false;
  editingMsgId: string | null = null;

  // Settings Panel state
  showSettings = signal<boolean>(false);
  selectedProvider: 'google' | 'openai' | 'groq' | 'emulated' = 'emulated';
  apiKeyInput = '';
  showApiKey = false;

  providersList: { id: 'google' | 'openai' | 'groq' | 'emulated'; label: string }[] = [
    { id: 'emulated', label: 'المحاكي المجاني (Si-Neuro)' },
    { id: 'google', label: 'Google Gemini 🌐' },
    { id: 'openai', label: 'OpenAI GPT 🤖' },
    { id: 'groq', label: 'Groq Llama ⚡' }
  ];
  
  // Connection states
  isConnecting = false;
  connectionError = '';
  connectionSuccess = false;

  // Attachment upload simulation state
  uploadedAttachment: { name: string; type: string; url: string } | null = null;

  // Audio simulator playing state
  playingMessageId = signal<string | null>(null);

  // Preset ready prompts
  presets = [
    { label: 'بناء تطبيق Angular سريع', icon: 'zap', query: 'كيف يمكنني بناء تطبيق Angular سريع الاستجابة باستخدام Signals؟' },
    { label: 'جدول بومودورو للتركيز', icon: 'clock', query: 'اكتب لي طريقة تنظيم جدول الدراسة الذكي بومودورو لتجنب التشتت.' },
    { label: 'كود زر متوهج CSS', icon: 'terminal', query: 'اكتب لي كود CSS لتأثير زر متوهج زجاجي مذهل (Glassmorphism).' },
    { label: 'توليد لوحة فنية عصبية', icon: 'sparkles', query: '/imagine مدينة مستقبلية نيون عائمة تحت المطر الكوني' }
  ];

  ngOnInit(): void {
    this.selectedProvider = this.chatService.provider();
    this.apiKeyInput = this.chatService.apiKey();
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    try {
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    } catch (err) {}
  }

  // Get metadata details of selected model
  get selectedModelDetails(): AIProviderModel | undefined {
    const activeId = this.chatService.selectedModel();
    return this.chatService.activeModelsList.find(m => m.id === activeId);
  }

  // Connect to custom provider & fetch models
  async handleConnect(): Promise<void> {
    if (this.selectedProvider === 'emulated') {
      this.chatService.saveConfig('emulated', '', []);
      this.connectionSuccess = true;
      this.connectionError = '';
      setTimeout(() => {
        this.showSettings.set(false);
        this.connectionSuccess = false;
      }, 1000);
      return;
    }

    if (!this.apiKeyInput.trim()) {
      this.connectionError = 'يرجى إدخال مفتاح API أولاً!';
      return;
    }

    this.isConnecting = true;
    this.connectionError = '';
    this.connectionSuccess = false;

    try {
      const fetched = await this.chatService.fetchModels(this.selectedProvider, this.apiKeyInput.trim());
      if (fetched.length === 0) {
        throw new Error('لم يتم العثور على نماذج حوارية مدعومة لهذا الحساب.');
      }
      this.chatService.saveConfig(this.selectedProvider, this.apiKeyInput.trim(), fetched);
      this.connectionSuccess = true;
      setTimeout(() => {
        this.showSettings.set(false);
        this.connectionSuccess = false;
      }, 1500);
    } catch (e: any) {
      console.error(e);
      this.connectionError = e.message || 'فشل الاتصال بالمزود، تأكد من صحة المفتاح وجودة شبكة الإنترنت.';
    } finally {
      this.isConnecting = false;
    }
  }

  // Trigger quick prompt preset
  usePreset(query: string): void {
    if (this.isThinking) return;
    this.inputText = query;
    this.handleSend();
  }

  // Send action
  async handleSend(): Promise<void> {
    const text = this.inputText.trim();
    if (!text && !this.uploadedAttachment) return;
    if (this.isThinking) return;

    this.isThinking = true;
    this.inputText = '';

    const attachmentCopy = this.uploadedAttachment ? { ...this.uploadedAttachment } : undefined;
    this.uploadedAttachment = null;

    if (this.editingMsgId) {
      this.chatService.deleteMessage(this.editingMsgId);
      this.editingMsgId = null;
    }

    await this.chatService.sendMessage(text, attachmentCopy);

    this.isThinking = false;
    this.scrollToBottom();
  }

  // File select mock upload
  triggerMockUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      const reader = new FileReader();
      reader.onload = (e) => {
        this.uploadedAttachment = {
          name: file.name,
          type: file.type.startsWith('image/') ? 'image' : 'file',
          url: e.target?.result as string || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop'
        };
      };
      reader.readAsDataURL(file);
    }
  }

  // Text-To-Speech audio simulation
  toggleAudio(msg: ChatMessage): void {
    if (this.playingMessageId() === msg.id) {
      this.playingMessageId.set(null);
      return;
    }

    this.playingMessageId.set(msg.id);

    const words = msg.text.split(' ').length;
    const duration = Math.min(8000, Math.max(2000, words * 150));

    setTimeout(() => {
      if (this.playingMessageId() === msg.id) {
        this.playingMessageId.set(null);
      }
    }, duration);
  }

  // Edit / Delete actions
  editMessage(msg: ChatMessage): void {
    this.editingMsgId = msg.id;
    this.inputText = msg.text;
  }

  deleteMessage(id: string): void {
    this.chatService.deleteMessage(id);
  }

  clearHistory(): void {
    this.chatService.clearHistory();
  }
}
