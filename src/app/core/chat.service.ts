import { Injectable, signal } from '@angular/core';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  engine: string;
  timestamp: string;
  attachment?: {
    name: string;
    type: string;
    url: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private readonly STORAGE_KEY = 'Si-Neuro-chat-registry';

  // Core signals
  messages = signal<ChatMessage[]>([]);
  selectedModel = signal<string>('googleai/gemini-2.5-flash');
  autoRead = signal<boolean>(false);

  models = [
    { id: 'googleai/gemini-2.5-flash', label: 'Si-NeuroAI (Flash)', desc: 'المحرك العصبي الأساسي السريع' },
    { id: 'groq/llama-3.3-70b-versatile', label: 'Groq Llama 3.3', desc: 'محرك التحليل فائق السرعة' },
    { id: 'googleai/gemini-1.5-pro', label: 'Gemini Pro 1.5', desc: 'تحليل دقيق مخصص للمستثمرين' }
  ];

  constructor() {
    this.loadMessages();
  }

  private loadMessages(): void {
    const dataStr = localStorage.getItem(this.STORAGE_KEY);
    if (dataStr) {
      try {
        const parsed = JSON.parse(dataStr);
        this.messages.set(parsed || []);
        return;
      } catch (e) {
        console.error("Chat Load Error", e);
      }
    }

    // Default welcoming message if empty
    this.messages.set([
      {
        id: 'msg_welcome',
        role: 'assistant',
        text: 'مرحباً بك في نظام Si-NeuroAI v5.5 للذكاء الاصطناعي. أنا محركك العصبي المتكامل وجاهز لمساعدتك في أي مهمة تطوير أو تنظيم أو برمجة اليوم. يمكنك البدء بسؤالي مباشرة!',
        engine: 'googleai/gemini-2.5-flash',
        timestamp: new Date().toISOString()
      }
    ]);
    this.saveMessages();
  }

  private saveMessages(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.messages()));
  }

  // Add a user message and trigger neural streaming emulation
  async sendMessage(text: string, attachment?: { name: string; type: string; url: string }): Promise<void> {
    const userMsg: ChatMessage = {
      id: `msg_${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      text: text.trim(),
      engine: 'user',
      timestamp: new Date().toISOString(),
      attachment
    };

    this.messages.update(list => [...list, userMsg]);
    this.saveMessages();

    // Check pre-flight command /imagine
    if (text.startsWith('/imagine')) {
      await this.emulateImagineCommand(text);
      return;
    }

    // Emulate standard streaming response
    await this.emulateAIResponse(text);
  }

  deleteMessage(id: string): void {
    this.messages.update(list => list.filter(m => m.id !== id));
    this.saveMessages();
  }

  clearHistory(): void {
    this.messages.set([
      {
        id: `msg_${Math.random().toString(36).substr(2, 9)}`,
        role: 'assistant',
        text: 'تمت إعادة تعيئة الذاكرة العصبية بنجاح. كيف يمكنني مساعدتك الآن؟',
        engine: this.selectedModel(),
        timestamp: new Date().toISOString()
      }
    ]);
    this.saveMessages();
  }

  private async emulateImagineCommand(text: string): Promise<void> {
    const target = text.replace('/imagine', '').trim() || 'فضاء كوانتي غامض';
    
    // Add artificial delay
    await new Promise(resolve => setTimeout(resolve, 3000));

    const responseMsg: ChatMessage = {
      id: `msg_${Math.random().toString(36).substr(2, 9)}`,
      role: 'assistant',
      text: `لقد ولدت الصورة الفنية المطلوبة عصبياً بنجاح بناءً على خيالك الإبداعي لـ (${target}).`,
      engine: 'Imagen 4.0 Studio',
      timestamp: new Date().toISOString(),
      attachment: {
        name: `${target}.png`,
        type: 'image',
        url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop'
      }
    };

    this.messages.update(list => [...list, responseMsg]);
    this.saveMessages();
  }

  private async emulateAIResponse(userText: string): Promise<void> {
    // Add artificial thinking time
    await new Promise(resolve => setTimeout(resolve, 1500));

    const modelId = this.selectedModel();
    let responseText = '';

    const lower = userText.toLowerCase();
    if (lower.includes('موقع') || lower.includes('برمج') || lower.includes('code') || lower.includes('site')) {
      responseText = 'لتطوير هيكلية ويب فائقة الاستجابة عصبياً، أنصحك بالاعتماد على بنية Angular standalone components مع Signals لإدارة الحالة بشكل تفاعلي سريع. إليك نموذج فني:\n\n```typescript\nimport { Component, signal } from \'@angular/core\';\n\n@Component({\n  selector: \'app-Si-Neuro\',\n  standalone: true,\n  template: `<button (click)=\"boost()\">Boost Neural Link: {{ power() }}</button>`\n})\nexport class Si-NeuroComponent {\n  power = signal(9000);\n  boost() { this.power.update(p => p + 100); }\n}\n```\n\nتضمن لك هذه البنية كفاءة تشغيل بنسبة استدعاء لحظية.';
    } else if (lower.includes('دراسة') || lower.includes('تعلم') || lower.includes('مذاكرة')) {
      responseText = 'نظام التلقين العصبي الموصى به يعتمد على فترات التركيز البومودورو المدمجة:\n1. حدد جلسات تركيز لمدة 25 دقيقة دون أي مشتتات.\n2. خذ 5 دقائق استراحة قصيرة بعد كل جلسة لترسخ المعلومات في الذاكرة العصبية العميقة.\n3. استخدم المخططات البيانية لمراقبة تقدمك أسبوعياً.';
    } else {
      responseText = `مرحباً بك! لقد قمت بتحليل استفسارك عصبياً عبر محرك [${modelId}]. نظام نكسوس الذكي يؤكد استقرار العقد والروابط بنسبة 100%، ونحن جاهزون لتنفيذ عمليات محاكاة أكثر تعقيداً متى شئت.`;
    }

    const aiMsgId = `msg_${Math.random().toString(36).substr(2, 9)}`;
    const newAiMsg: ChatMessage = {
      id: aiMsgId,
      role: 'assistant',
      text: '',
      engine: modelId,
      timestamp: new Date().toISOString()
    };

    this.messages.update(list => [...list, newAiMsg]);

    // Emulate streaming tokens (words showing up progressively)
    const words = responseText.split(' ');
    let currentText = '';
    
    for (let i = 0; i < words.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 40));
      currentText += (i === 0 ? '' : ' ') + words[i];
      
      this.messages.update(list => {
        return list.map(m => {
          if (m.id === aiMsgId) {
            return { ...m, text: currentText };
          }
          return m;
        });
      });
    }

    this.saveMessages();
  }
}
