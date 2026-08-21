import { Component, inject, signal, ElementRef, ViewChild, AfterViewChecked, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ChatService, ChatMessage, AIProviderModel } from '../../core/chat.service';
import { SettingsService } from '../../core/settings.service';
import { FirebaseService } from '../../core/services/firebase.service';

@Component({
  selector: 'app-ai-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit, AfterViewChecked, OnDestroy {
  chatService = inject(ChatService);
  settingsService = inject(SettingsService);
  firebase = inject(FirebaseService);

  @ViewChild('chatScrollContainer') private scrollContainer!: ElementRef;

  // Local State
  inputText = '';
  isThinking = false;
  editingMsgId: string | null = null;

  // Settings & Quick Tools
  showSettings = signal<boolean>(false);
  selectedProvider: 'google' | 'openai' | 'groq' | 'emulated' = 'emulated';
  apiKeyInput = '';
  showApiKey = false;

  providersList: { id: 'google' | 'openai' | 'groq' | 'emulated'; label: string }[] = [
    { id: 'emulated', label: 'المحاكي الذكي المجاني (Si-Neuro)' },
    { id: 'google', label: 'Google Gemini 🌐' },
    { id: 'openai', label: 'OpenAI GPT 🤖' },
    { id: 'groq', label: 'Groq Llama ⚡' }
  ];

  isConnecting = false;
  connectionError = '';
  connectionSuccess = false;

  // Attachment / Image upload state
  uploadedAttachment: { name: string; type: string; url: string } | null = null;

  // Real Web Speech Synthesis audio playing state
  playingMessageId = signal<string | null>(null);

  ngOnInit(): void {
    this.selectedProvider = this.chatService.provider();
    this.apiKeyInput = this.chatService.apiKey();
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  private scrollToBottom(): void {
    try {
      if (this.scrollContainer?.nativeElement) {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      }
    } catch {}
  }

  // Get active model details
  get selectedModelDetails(): AIProviderModel | undefined {
    const activeId = this.chatService.selectedModel();
    return this.chatService.activeModelsList.find(m => m.id === activeId);
  }

  // Send message
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

  // File / Image selection handler
  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        this.uploadedAttachment = {
          name: file.name,
          type: file.type.startsWith('image/') ? 'image' : 'file',
          url: e.target?.result as string
        };
      };
      reader.readAsDataURL(file);
    }
  }

  removeAttachment(): void {
    this.uploadedAttachment = null;
  }

  // Real Web Speech Synthesis Text-To-Speech
  toggleAudio(msg: ChatMessage): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('متصفحك لا يدعم تحويل النصوص إلى كلام (Speech Synthesis)');
      return;
    }

    if (this.playingMessageId() === msg.id) {
      window.speechSynthesis.cancel();
      this.playingMessageId.set(null);
      return;
    }

    window.speechSynthesis.cancel();
    this.playingMessageId.set(msg.id);

    // Clean markdown and code formatting for crystal-clear speech
    const cleanText = msg.text
      .replace(/```[\s\S]*?```/g, 'تم تضمين كود برمجي.')
      .replace(/[#*_`~>-]/g, '')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'ar-SA';
    utterance.rate = this.settingsService.speechRate() || 1.0;
    utterance.pitch = this.settingsService.speechPitch() || 1.0;

    const voices = window.speechSynthesis.getVoices();
    const arVoice = voices.find(v => v.lang.startsWith('ar'));
    if (arVoice) {
      utterance.voice = arVoice;
    }

    utterance.onend = () => {
      if (this.playingMessageId() === msg.id) {
        this.playingMessageId.set(null);
      }
    };

    utterance.onerror = () => {
      this.playingMessageId.set(null);
    };

    window.speechSynthesis.speak(utterance);
  }

  // Connect to custom AI Provider
  async handleConnect(): Promise<void> {
    if (this.selectedProvider === 'emulated') {
      this.chatService.saveConfig('emulated', '', []);
      this.connectionSuccess = true;
      this.connectionError = '';
      setTimeout(() => {
        this.showSettings.set(false);
        this.connectionSuccess = false;
      }, 800);
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
      }, 1000);
    } catch (e: any) {
      console.error(e);
      this.connectionError = e.message || 'فشل الاتصال بالمزود، تأكد من صحة المفتاح وجودة شبكة الإنترنت.';
    } finally {
      this.isConnecting = false;
    }
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
    if (confirm('هل أنت متأكد من مسح سجل المحادثة؟')) {
      this.chatService.clearHistory();
    }
  }
}
