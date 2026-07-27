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

export interface AIProviderModel {
  id: string;
  label: string;
  desc: string;
  inputLimit?: string;
  outputLimit?: string;
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

  // API Config signals
  provider = signal<'google' | 'openai' | 'groq' | 'emulated'>('emulated');
  apiKey = signal<string>('');
  customModels = signal<AIProviderModel[]>([]);

  // Default fallback / emulated models
  defaultModels: AIProviderModel[] = [
    { id: 'googleai/gemini-2.5-flash', label: 'Si-NeuroAI (Flash)', desc: 'المحرك العصبي الأساسي السريع للمنصة', inputLimit: '1,048,576', outputLimit: '8,192' },
    { id: 'groq/llama-3.3-70b-versatile', label: 'Groq Llama 3.3', desc: 'محرك التحليل والبحث السريع', inputLimit: '128,000', outputLimit: '4,096' },
    { id: 'googleai/gemini-2.5-pro', label: 'Gemini Pro 2.5', desc: 'تحليل دقيق متعدد الوسائط', inputLimit: '2,097,152', outputLimit: '8,192' }
  ];

  constructor() {
    this.loadMessages();
    this.loadConfig();
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
        text: 'مرحباً بك في نظام Si-NeuroAI الذكي للدردشة. تم تفعيل المحرك العصبي المتكامل وجاهز لمساعدتك. يمكنك إدخال مفتاح API لربط موديلات Gemini أو OpenAI أو Groq المباشرة ورؤية حدودها، أو استخدام محرك المحاكاة المجاني الحالي!',
        engine: 'Si-NeuroAI (Emulated)',
        timestamp: new Date().toISOString()
      }
    ]);
    this.saveMessages();
  }

  private saveMessages(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.messages()));
  }

  // Load provider configurations
  loadConfig() {
    this.provider.set((localStorage.getItem('Si-Neuro-chat-provider') as any) || 'emulated');
    this.apiKey.set(localStorage.getItem('Si-Neuro-chat-apiKey') || '');
    
    const savedModels = localStorage.getItem('Si-Neuro-chat-customModels');
    if (savedModels) {
      try {
        this.customModels.set(JSON.parse(savedModels));
      } catch (e) {
        this.customModels.set([]);
      }
    }

    const savedSelected = localStorage.getItem('Si-Neuro-chat-selectedModel');
    if (savedSelected) {
      this.selectedModel.set(savedSelected);
    } else {
      this.selectedModel.set(this.provider() === 'emulated' ? 'googleai/gemini-2.5-flash' : (this.customModels()[0]?.id || ''));
    }
  }

  // Save configurations
  saveConfig(provider: 'google' | 'openai' | 'groq' | 'emulated', key: string, modelsList: AIProviderModel[]) {
    this.provider.set(provider);
    this.apiKey.set(key);
    this.customModels.set(modelsList);

    localStorage.setItem('Si-Neuro-chat-provider', provider);
    localStorage.setItem('Si-Neuro-chat-apiKey', key);
    localStorage.setItem('Si-Neuro-chat-customModels', JSON.stringify(modelsList));

    const newDefaultModel = provider === 'emulated' ? 'googleai/gemini-2.5-flash' : (modelsList[0]?.id || '');
    this.selectedModel.set(newDefaultModel);
    localStorage.setItem('Si-Neuro-chat-selectedModel', newDefaultModel);
  }

  // Connect & fetch models from API dynamically
  async fetchModels(provider: 'google' | 'openai' | 'groq', key: string): Promise<AIProviderModel[]> {
    if (provider === 'google') {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || `فشل الاتصال بـ Google API (${res.status})`);
      }
      const data = await res.json();
      return (data.models || [])
        .filter((m: any) => m.name.includes('gemini') && m.supportedGenerationMethods?.includes('generateContent'))
        .map((m: any) => {
          const modelId = m.name.replace('models/', '');
          return {
            id: modelId,
            label: m.displayName || modelId,
            desc: m.description || 'Google Gemini LLM',
            inputLimit: m.inputTokenLimit ? m.inputTokenLimit.toLocaleString() : '1,048,576',
            outputLimit: m.outputTokenLimit ? m.outputTokenLimit.toLocaleString() : '8,192'
          };
        });
    } else if (provider === 'openai') {
      const res = await fetch(`https://api.openai.com/v1/models`, {
        headers: { 'Authorization': `Bearer ${key}` }
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || `فشل الاتصال بـ OpenAI API (${res.status})`);
      }
      const data = await res.json();
      return (data.data || [])
        .filter((m: any) => m.id.startsWith('gpt') || m.id.startsWith('o1') || m.id.startsWith('o3'))
        .map((m: any) => ({
          id: m.id,
          label: m.id,
          desc: 'نموذج ذكاء اصطناعي فائق من شركة OpenAI',
          inputLimit: m.id.includes('mini') ? '128,000' : '128,000',
          outputLimit: m.id.includes('mini') ? '16,384' : '4,096'
        }));
    } else if (provider === 'groq') {
      const res = await fetch(`https://api.groq.com/openai/v1/models`, {
        headers: { 'Authorization': `Bearer ${key}` }
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || `فشل الاتصال بـ Groq API (${res.status})`);
      }
      const data = await res.json();
      return (data.data || []).map((m: any) => ({
        id: m.id,
        label: m.id,
        desc: `نموذج Groq فائق السرعة، مزود بواسطة شركة ${m.owned_by || 'Groq'}`,
        inputLimit: '128,000',
        outputLimit: '4,096'
      }));
    }
    return [];
  }

  // Get active models list
  get activeModelsList(): AIProviderModel[] {
    return this.provider() === 'emulated' ? this.defaultModels : this.customModels();
  }

  // Send message entrypoint
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

    // Check pre-flight imagine
    if (text.startsWith('/imagine')) {
      await this.emulateImagineCommand(text);
      return;
    }

    if (this.provider() === 'emulated') {
      await this.emulateAIResponse(text);
    } else {
      await this.callRealAPIResponse(text);
    }
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
        text: 'تمت إعادة تهيئة الذاكرة بنجاح. كيف يمكنني مساعدتك الآن؟',
        engine: this.selectedModel(),
        timestamp: new Date().toISOString()
      }
    ]);
    this.saveMessages();
  }

  private async emulateImagineCommand(text: string): Promise<void> {
    const target = text.replace('/imagine', '').trim() || 'فضاء كوانتي غامض';
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

  // Call real AI API (Gemini / OpenAI / Groq)
  private async callRealAPIResponse(userText: string): Promise<void> {
    const provider = this.provider();
    const key = this.apiKey();
    const model = this.selectedModel();

    const aiMsgId = `msg_${Math.random().toString(36).substr(2, 9)}`;
    const newAiMsg: ChatMessage = {
      id: aiMsgId,
      role: 'assistant',
      text: '',
      engine: model,
      timestamp: new Date().toISOString()
    };

    this.messages.update(list => [...list, newAiMsg]);

    let responseText = '';
    try {
      if (provider === 'google') {
        const geminiHistory = this.messages()
          .filter(m => m.id !== 'msg_welcome' && m.id !== aiMsgId)
          .map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.text }]
          }));

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: geminiHistory })
        });

        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'لم يتم إرجاع أي رد من نموذج Gemini.';
      } else {
        // OpenAI or Groq
        const endpoint = provider === 'groq' 
          ? 'https://api.groq.com/openai/v1/chat/completions'
          : 'https://api.openai.com/v1/chat/completions';

        const openAIHistory = this.messages()
          .filter(m => m.id !== 'msg_welcome' && m.id !== aiMsgId)
          .map(m => ({
            role: m.role,
            content: m.text
          }));

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
          },
          body: JSON.stringify({
            model: model,
            messages: openAIHistory
          })
        });

        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        responseText = data.choices?.[0]?.message?.content || 'لم يتم إرجاع أي رد من النموذج.';
      }
    } catch (e: any) {
      console.error(e);
      let errMsg = 'حدث خطأ أثناء محاولة الاتصال بالمزود.';
      try {
        const parsed = JSON.parse(e.message);
        errMsg = parsed.error?.message || errMsg;
      } catch (jsonErr) {
        if (e.message) errMsg = e.message;
      }
      responseText = `⚠️ فشل الاتصال العصبي بالمحرك: ${errMsg}`;
    }

    // Stream word typing simulation
    const words = responseText.split(' ');
    let currentText = '';
    
    for (let i = 0; i < words.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 30));
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

  private async emulateAIResponse(userText: string): Promise<void> {
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
