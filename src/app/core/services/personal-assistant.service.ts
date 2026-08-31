import { Injectable, signal } from '@angular/core';

export interface AssistantMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

export interface AssistantTask {
  id: string;
  title: string;
  timeStr: string; // e.g. "14:30" or timestamp
  targetTimestamp?: number;
  category: 'general' | 'study' | 'quran' | 'finance' | 'alarm';
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
  messages = signal<AssistantMessage[]>([
    {
      id: 'msg_1',
      sender: 'assistant',
      text: 'أهلاً بك! أنا مساعدك الشخصي الذكي. يمكنك التحدث معي صوتياً، طلب أي مساعدة برمجية أو تحليلية، وسأقوم بتذكيرك بمهامك ومواعيدك بذكاء وبمبادرة استباقية 🤖✨',
      timestamp: Date.now()
    }
  ]);

  tasks = signal<AssistantTask[]>([
    {
      id: 'task_1',
      title: 'التعلم من حلال تيوب (Halaltube)',
      timeStr: '10:00',
      category: 'study',
      deepLink: '/halaltube',
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

  alarms = signal<{ id: string; title: string; triggerTime: number }[]>([]);
  
  assistantIcon = signal<string>(localStorage.getItem('assistant_icon') || 'Sparkles');
  isAssistantOpen = signal<boolean>(false);
  proactiveAlert = signal<ProactiveAlert | null>(null);
  voiceEnabled = signal<boolean>(true);

  private watcherInterval: any = null;

  constructor() {
    this.loadFromStorage();
    this.startWatcher();
  }

  private loadFromStorage() {
    try {
      const savedTasks = localStorage.getItem('assistant_tasks');
      if (savedTasks) this.tasks.set(JSON.parse(savedTasks));

      const savedAlarms = localStorage.getItem('assistant_alarms');
      if (savedAlarms) this.alarms.set(JSON.parse(savedAlarms));
    } catch (e) {
      console.warn('Could not load assistant storage:', e);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem('assistant_tasks', JSON.stringify(this.tasks()));
      localStorage.setItem('assistant_alarms', JSON.stringify(this.alarms()));
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

  dismissAlert() {
    this.proactiveAlert.set(null);
  }

  private startWatcher() {
    if (this.watcherInterval) clearInterval(this.watcherInterval);
    this.watcherInterval = setInterval(() => {
      const now = new Date();
      const currentHoursMins = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const nowMs = Date.now();

      // Check tasks
      const currentTasks = this.tasks();
      for (const t of currentTasks) {
        if (!t.completed && t.timeStr === currentHoursMins) {
          // Trigger proactive alert
          this.triggerAlert({
            id: 'alert_' + t.id + '_' + nowMs,
            title: `⏰ موعد مهمة: ${t.title}`,
            message: `حان الآن موعد أداء مهمتك المجدولة (${t.timeStr}). اضغط للانتقال السريع وابدأ فوراً دون تشتت!`,
            deepLink: t.deepLink,
            actionText: 'ابدأ الآن 🚀',
            timestamp: nowMs
          });
          // Mark task completed for today
          this.tasks.update(list => list.map(item => item.id === t.id ? { ...item, completed: true } : item));
          break;
        }
      }

      // Check alarms
      const currentAlarms = this.alarms();
      for (const a of currentAlarms) {
        if (nowMs >= a.triggerTime) {
          this.triggerAlert({
            id: 'alert_' + a.id,
            title: `🔔 انتهى الوقت: ${a.title}`,
            message: `انتهت المدة المحددة لمنبهك (${a.title})!`,
            actionText: 'حسناً 👍',
            timestamp: nowMs
          });
          // Remove triggered alarm
          this.alarms.update(list => list.filter(item => item.id !== a.id));
          this.saveToStorage();
          break;
        }
      }
    }, 15000); // Check every 15 seconds
  }

  private triggerAlert(alert: ProactiveAlert) {
    this.proactiveAlert.set(alert);
    this.speak(alert.title + '. ' + alert.message);
  }

  speak(text: string) {
    if (!this.voiceEnabled()) return;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ar-SA';
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  }

  async sendMessage(prompt: string): Promise<string> {
    const userMsg: AssistantMessage = {
      id: 'msg_' + Date.now(),
      sender: 'user',
      text: prompt,
      timestamp: Date.now()
    };
    this.messages.update(list => [...list, userMsg]);

    const apiKey = localStorage.getItem('Si-Neuro-chat-apiKey') || 'AIzaSyAdHKCp9X3rCTdyyZ0XeiRvxWOp2qVaQws';
    const aiMessageId = 'msg_' + (Date.now() + 1);

    const religiousKeywords = ['حكم', 'فتوى', 'فتوه', 'صلاة', 'صيام', 'دين', 'اسلام', 'إسلام', 'زكاة', 'قرآن', 'سنة', 'حديث', 'حلال', 'حرام', 'طهارة', 'وضوء', 'حج', 'عمرة', 'دعاء', 'أذكار'];
    const isReligious = religiousKeywords.some(kw => prompt.toLowerCase().includes(kw));

    let systemInstruction = `أنت مساعد شخصي ذكي وودود جداً داخل منصة إنتاجية متكاملة (Super App). ساعد المستخدم في مهامه وجدوله بذكاء. الرد باللغة العربية باختصار وفعالية.`;
    if (isReligious) {
      systemInstruction += ` هذا السؤال ذو طبيعة دينية/شرعية. أجب بأدب وعلم، ووجه المستخدم دائماً للرجوع إلى موقع إسلام ويب (https://www.islamweb.net/ar/) للفتاوى المعتمدة.`;
    }

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemInstruction}\nالسؤال: ${prompt}` }]
            }
          ]
        })
      });

      const data = await res.json();
      let reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'عذراً، لم أستطع معالجة طلبك حالياً.';
      if (isReligious && !reply.includes('islamweb.net')) {
        reply += `\n\n📌 للحصول على الفتاوى الموثوقة والمفصلة، تفضل بزيارة موقع إسلام ويب الرسمي:\nhttps://www.islamweb.net/ar/`;
      }

      const aiMsg: AssistantMessage = {
        id: aiMessageId,
        sender: 'assistant',
        text: reply,
        timestamp: Date.now()
      };
      this.messages.update(list => [...list, aiMsg]);
      this.speak(reply);
      return reply;
    } catch (e) {
      console.error('Gemini Assistant Error:', e);
      const errorReply = 'حدث خطأ في الاتصال بالمساعد الذكي. تأكد من مفتاح الapi.';
      this.messages.update(list => [...list, { id: aiMessageId, sender: 'assistant', text: errorReply, timestamp: Date.now() }]);
      return errorReply;
    }
  }
}
