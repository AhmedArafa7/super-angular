import { Injectable, signal, inject } from '@angular/core';
import { AssistantToolsService } from './assistant-tools.service';
import { AssistantIntentService } from './assistant-intent.service';
import { ChatService } from '../chat.service';
import { FirebaseService } from './firebase.service';
import { GlobalStateService } from './global-state.service';

export interface AssistantMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: number;
  source?: 'rule' | 'learned' | 'ai' | 'none';
  toolBadge?: string;
}

export interface AssistantTask {
  id: string;
  title: string;
  timeStr: string; // "14:30"
  targetTimestamp?: number;
  category?: 'general' | 'study' | 'quran' | 'finance' | 'alarm';
  deepLink?: string;
  completed: boolean;
  recurring?: boolean;
}

export interface ProactiveAlert {
  id: string;
  title: string;
  message: string;
  deepLink?: string;
  actionText?: string;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class PersonalAssistantService {
  toolsService = inject(AssistantToolsService);
  intentService = inject(AssistantIntentService);
  private chatService = inject(ChatService);
  private firebaseService = inject(FirebaseService);
  private globalState = inject(GlobalStateService);

  private readonly STORAGE_TASKS_KEY = 'assistant_tasks_v2';
  private readonly STORAGE_ALARMS_KEY = 'assistant_alarms_v2';
  private readonly STORAGE_MESSAGES_KEY = 'assistant_messages_v2';

  // State signals
  messages = signal<AssistantMessage[]>([]);
  tasks = signal<AssistantTask[]>([]);
  alarms = signal<{ id: string; title: string; triggerTime: number }[]>([]);

  assistantIcon = signal<string>(localStorage.getItem('assistant_icon') || 'Sparkles');
  isAssistantOpen = signal<boolean>(false);
  proactiveAlert = signal<ProactiveAlert | null>(null);
  voiceEnabled = signal<boolean>(true);

  private watcherInterval: any = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private lastCheckedMinute = '';

  constructor() {
    // 1. Register tool callbacks
    this.toolsService.registerCallbacks({
      addAlarm: (title, minutes) => this.addAlarm(title, minutes),
      addTask: (task) => this.addTask(task),
      getTasks: () => ({ tasks: this.tasks(), alarms: this.alarms() }),
      clearAlarms: () => this.clearAlarms(),
      speak: (text) => this.speak(text)
    });

    // 2. Load stored state
    this.loadFromStorage();

    // 3. Request browser notifications if available
    this.requestNotificationPermission();

    // 4. Start watcher with improved multi-task and sleep tolerance
    this.startWatcher();
  }

  private requestNotificationPermission() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }
  }

  private loadFromStorage() {
    try {
      // Load messages
      const savedMessages = localStorage.getItem(this.STORAGE_MESSAGES_KEY);
      if (savedMessages) {
        const parsed = JSON.parse(savedMessages);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.messages.set(parsed);
        }
      }

      if (this.messages().length === 0) {
        this.messages.set([
          {
            id: 'msg_welcome',
            sender: 'assistant',
            text: 'أهلاً بك! أنا مساعدك الشخصي الذكي الهجين. يمكنني ضبط المنبهات، إدارة المواعيد، والتنقل في المنصة فورياً ⚡ أو الإجابة على أي استفسار تحليلي وبرمجي 🤖✨',
            timestamp: Date.now(),
            source: 'rule'
          }
        ]);
      }

      // Load tasks
      const savedTasks = localStorage.getItem(this.STORAGE_TASKS_KEY);
      if (savedTasks) {
        this.tasks.set(JSON.parse(savedTasks));
      } else {
        // Defaults
        this.tasks.set([
          {
            id: 'task_1',
            title: 'التعلم من حلال تيوب (Halaltube)',
            timeStr: '10:00',
            category: 'study',
            deepLink: '/stream',
            completed: false
          },
          {
            id: 'task_2',
            title: 'مراجعة الورد اليومي من القرآن الكريم',
            timeStr: '17:00',
            category: 'quran',
            deepLink: '/hisn',
            completed: false
          }
        ]);
      }

      // Load alarms
      const savedAlarms = localStorage.getItem(this.STORAGE_ALARMS_KEY);
      if (savedAlarms) {
        this.alarms.set(JSON.parse(savedAlarms));
      }
    } catch (e) {
      console.warn('Could not load assistant storage:', e);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(this.STORAGE_TASKS_KEY, JSON.stringify(this.tasks()));
      localStorage.setItem(this.STORAGE_ALARMS_KEY, JSON.stringify(this.alarms()));
      localStorage.setItem(this.STORAGE_MESSAGES_KEY, JSON.stringify(this.messages().slice(-40)));

      // Sync with Firestore for logged-in user
      const user = this.firebaseService.currentUser();
      if (user && user.uid && this.firebaseService.firestore) {
        import('firebase/firestore').then(({ doc, setDoc }) => {
          const docRef = doc(this.firebaseService.firestore, `users/${user.uid}/assistant_meta`, 'state');
          setDoc(docRef, {
            tasks: this.tasks(),
            alarms: this.alarms(),
            lastUpdated: Date.now()
          }, { merge: true }).catch(() => {});
        });
      }
    } catch (e) {
      console.warn('Could not save assistant storage:', e);
    }
  }

  setAssistantIcon(iconName: string) {
    this.assistantIcon.set(iconName);
    localStorage.setItem('assistant_icon', iconName);
  }

  addTask(task: Omit<AssistantTask, 'id' | 'completed'>) {
    const newTask: AssistantTask = {
      category: 'general',
      ...task,
      id: 'task_' + Date.now(),
      completed: false
    };
    this.tasks.update(list => [...list, newTask]);
    this.saveToStorage();
  }

  removeTask(id: string) {
    this.tasks.update(list => list.filter(t => t.id !== id));
    this.saveToStorage();
  }

  addAlarm(title: string, minutesFromNow: number) {
    const triggerTime = Date.now() + minutesFromNow * 60 * 1000;
    const newAlarm = { id: 'alarm_' + Date.now(), title, triggerTime };
    this.alarms.update(list => [...list, newAlarm]);
    this.saveToStorage();
    this.speak(`تم ضبط منبه: ${title} بعد ${minutesFromNow} دقيقة.`);
  }

  clearAlarms() {
    this.alarms.set([]);
    this.saveToStorage();
  }

  clearChatHistory() {
    this.messages.set([
      {
        id: 'msg_' + Date.now(),
        sender: 'assistant',
        text: 'تم مسح المحادثة وتجديد الجلسة. كيف يمكنني خدمتك الآن؟',
        timestamp: Date.now(),
        source: 'rule'
      }
    ]);
    this.saveToStorage();
  }

  dismissAlert() {
    this.proactiveAlert.set(null);
  }

  private startWatcher() {
    if (this.watcherInterval) clearInterval(this.watcherInterval);

    this.watcherInterval = setInterval(() => {
      const now = new Date();
      const currentHoursMins = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const nowMs = Date.now();

      // Only check tasks when minute changes to avoid repeating alert within the same minute
      if (currentHoursMins !== this.lastCheckedMinute) {
        this.lastCheckedMinute = currentHoursMins;

        const currentTasks = this.tasks();
        let tasksUpdated = false;

        for (const t of currentTasks) {
          if (!t.completed && t.timeStr === currentHoursMins) {
            this.triggerAlert({
              id: 'alert_' + t.id + '_' + nowMs,
              title: `⏰ موعد مهمة: ${t.title}`,
              message: `حان الآن موعد أداء مهمتك المجدولة (${t.timeStr}). اضغط للانتقال السريع وابدأ فوراً دون تشتت!`,
              deepLink: t.deepLink,
              actionText: 'ابدأ الآن 🚀',
              timestamp: nowMs
            });

            // Mark task as completed
            this.tasks.update(list => list.map(item => item.id === t.id ? { ...item, completed: true } : item));
            tasksUpdated = true;
          }
        }

        if (tasksUpdated) {
          this.saveToStorage();
        }
      }

      // Check alarms (using triggerTime timestamp)
      const currentAlarms = this.alarms();
      const dueAlarms = currentAlarms.filter(a => nowMs >= a.triggerTime);
      if (dueAlarms.length > 0) {
        for (const a of dueAlarms) {
          this.triggerAlert({
            id: 'alert_' + a.id,
            title: `🔔 انتهى الوقت: ${a.title}`,
            message: `انتهت المدة المحددة لمنبهك (${a.title})!`,
            actionText: 'حسناً 👍',
            timestamp: nowMs
          });
        }
        // Remove triggered alarms
        const dueIds = new Set(dueAlarms.map(a => a.id));
        this.alarms.update(list => list.filter(item => !dueIds.has(item.id)));
        this.saveToStorage();
      }
    }, 10000); // Check every 10 seconds
  }

  private triggerAlert(alert: ProactiveAlert) {
    this.proactiveAlert.set(alert);
    this.speak(alert.title + '. ' + alert.message);

    // Show native browser notification if allowed
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(alert.title, {
          body: alert.message,
          icon: '/favicon.ico'
        });
      } catch (e) {
        console.warn('Native notification failed:', e);
      }
    }
  }

  speak(text: string) {
    if (!this.voiceEnabled()) return;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        // Clean markdown / emoji for cleaner pronunciation
        const cleanText = text.replace(/[*#_`~⚡🤖⏰🚀📋🔔]/g, '').trim();
        const utterance = new SpeechSynthesisUtterance(cleanText);

        const voices = window.speechSynthesis.getVoices();
        const arabicVoice = voices.find(v => v.lang.startsWith('ar') || v.lang.includes('ar'));
        if (arabicVoice) {
          utterance.voice = arabicVoice;
        }
        utterance.lang = 'ar-SA';
        utterance.rate = 1.0;

        // Keep reference in class to avoid Chromium garbage collection bug
        this.currentUtterance = utterance;
        utterance.onend = () => { this.currentUtterance = null; };
        utterance.onerror = () => { this.currentUtterance = null; };

        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn('Speech synthesis error:', e);
      }
    }
  }

  // MAIN ENTRYPOINT: 3-TIER EXECUTION PIPELINE
  async sendMessage(prompt: string): Promise<string> {
    const trimmed = prompt.trim();
    if (!trimmed) return '';

    // Record user message
    const userMsg: AssistantMessage = {
      id: 'msg_' + Date.now(),
      sender: 'user',
      text: trimmed,
      timestamp: Date.now()
    };
    this.messages.update(list => [...list, userMsg]);
    this.saveToStorage();

    // =========================================================================
    // TIER 1 & TIER 2: Deterministic Rule-First & Dynamic Learned Pattern Check
    // =========================================================================
    const intentResult = await this.intentService.evaluateIntent(trimmed);
    if (intentResult.matched && intentResult.immediateReply) {
      const immediateMsg: AssistantMessage = {
        id: 'msg_' + Date.now() + '_res',
        sender: 'assistant',
        text: intentResult.immediateReply,
        timestamp: Date.now(),
        source: intentResult.source,
        toolBadge: intentResult.toolName
      };
      this.messages.update(list => [...list, immediateMsg]);
      this.saveToStorage();
      this.speak(intentResult.immediateReply);
      return intentResult.immediateReply;
    }

    // =========================================================================
    // TIER 3: LLM Fallback (Gemini / ChatService) with Multi-Turn & Auto-Learning
    // =========================================================================
    return await this.executeAIFallback(trimmed);
  }

  private async executeAIFallback(prompt: string): Promise<string> {
    const aiMessageId = 'msg_' + Date.now() + '_ai';

    // Check religious context
    const religiousKeywords = ['حكم', 'فتوى', 'فتوه', 'صلاة', 'صيام', 'دين', 'اسلام', 'إسلام', 'زكاة', 'قرآن', 'سنة', 'حديث', 'حلال', 'حرام', 'طهارة', 'وضوء', 'حج', 'عمرة', 'دعاء', 'أذكار'];
    const isReligious = religiousKeywords.some(kw => prompt.toLowerCase().includes(kw));

    // Get active API key (from ChatService or user localStorage)
    const apiKey = this.chatService.apiKey().trim() || localStorage.getItem('Si-Neuro-chat-apiKey') || '';

    // Multi-turn history (last 10 messages)
    const history = this.messages()
      .slice(-10)
      .filter(m => m.id !== 'msg_welcome' && m.id !== aiMessageId)
      .map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));

    // System instruction
    const user = this.globalState.userProfile();
    let systemInstruction = `أنت المساعد الشخصي الذكي والودود لمنصة Si-Neuro Super App. 
اسم المستخدم: ${user.name || 'المستخدم'}.
الوقت والتاريخ الحالي: ${new Date().toLocaleString('ar-EG')}.
مهمتك مساعدة المستخدم بذكاء، باختصار ووضوح، مع تقديم حلول عملية. الرد باللغة العربية.`;

    if (isReligious) {
      systemInstruction += ` هذا السؤال ذو طبيعة دينية/شرعية. أجب بأدب وعلم موجز ووجه المستخدم دائماً للرجوع إلى موقع إسلام ويب (https://www.islamweb.net/ar/) للفتاوى المعتمدة.`;
    }

    // If no API key configured, use local intelligent assistant fallback
    if (!apiKey) {
      const fallbackReply = `أهلاً بك! لقد فهمت رسالتك ("${prompt}"). يمكنك سؤالي عن الوقت، ضبط منبهات فورية، جدولة مهامك، أو فتح أي قسم في المنصة. لتفعيل الذكاء الاصطناعي الكامل للتفكير البرمجي والتحليلي، يمكنك تفعيل مفتاح الـ API من إعدادات الدردشة الذكية.`;
      
      const aiMsg: AssistantMessage = {
        id: aiMessageId,
        sender: 'assistant',
        text: fallbackReply,
        timestamp: Date.now(),
        source: 'ai'
      };
      this.messages.update(list => [...list, aiMsg]);
      this.saveToStorage();
      this.speak(fallbackReply);
      return fallbackReply;
    }

    try {
      const tools = [{ functionDeclarations: this.toolsService.getGeminiFunctionDeclarations() }];
      const contents = [
        ...history,
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ];

      // Call Gemini 2.5 Flash / 1.5 Flash
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents,
          tools
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const candidate = data.candidates?.[0]?.content;
      let replyText = '';
      let executedToolName: string | undefined;

      // Check if Gemini invoked a Function Call (Tool Calling)
      const functionCall = candidate?.parts?.find((p: any) => p.functionCall)?.functionCall;
      if (functionCall) {
        executedToolName = functionCall.name;
        const toolArgs = functionCall.args || {};
        
        // 1. Execute the tool
        const toolResult = await this.toolsService.executeTool(functionCall.name, toolArgs);
        replyText = `🤖 ${toolResult.message}`;

        // 2. CRITICAL AUTO-LEARN: Persist this pattern so it runs via Layer 1 next time!
        this.intentService.learnPattern(prompt, functionCall.name, toolArgs);
      } else {
        replyText = candidate?.parts?.[0]?.text || 'عذراً، لم أستطع تكوين رد مناسب حالياً.';
      }

      if (isReligious && !replyText.includes('islamweb.net')) {
        replyText += `\n\n📌 للحصول على الفتاوى الموثوقة والمفصلة، تفضل بزيارة موقع إسلام ويب الرسمي:\nhttps://www.islamweb.net/ar/`;
      }

      const aiMsg: AssistantMessage = {
        id: aiMessageId,
        sender: 'assistant',
        text: replyText,
        timestamp: Date.now(),
        source: 'ai',
        toolBadge: executedToolName
      };

      this.messages.update(list => [...list, aiMsg]);
      this.saveToStorage();
      this.speak(replyText);
      return replyText;

    } catch (err: any) {
      console.error('Gemini Assistant Error:', err);
      const errorMsg = 'حدث خطأ في الاتصال بنموذج الذكاء الاصطناعي. يمكنك الاستمرار في استخدام الأوامر الفورية (المنبهات، المهام، التنقل) محلياً بدون إنترنت.';
      this.messages.update(list => [...list, {
        id: aiMessageId,
        sender: 'assistant',
        text: errorMsg,
        timestamp: Date.now(),
        source: 'ai'
      }]);
      this.saveToStorage();
      return errorMsg;
    }
  }
}
