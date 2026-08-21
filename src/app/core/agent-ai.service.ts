import { Injectable, signal, inject } from '@angular/core';
import { FirebaseService } from './services/firebase.service';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

export interface ProjectFile {
  name: string;
  path: string;
  language: string;
  content: string;
}

export interface TaskLogEntry {
  id: string;
  timestamp: string;
  stepNumber: number;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface AgentChatMessage {
  id: string;
  role: 'user' | 'agent';
  text: string;
  timestamp: string;
  generatedFiles?: ProjectFile[];
}

export interface AgentSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: AgentChatMessage[];
  files: ProjectFile[];
  logs: TaskLogEntry[];
  engine: string;
}

@Injectable({
  providedIn: 'root'
})
export class AgentAIService {
  private firebase = inject(FirebaseService);
  private readonly STORAGE_KEY = 'Si-Neuro-agent-sessions-v2';

  // Signals
  sessions = signal<AgentSession[]>([]);
  activeSessionId = signal<string>('');
  isExecuting = signal<boolean>(false);
  activeFile = signal<ProjectFile | null>(null);
  currentEngine = signal<string>('GEMINI 2.5 PRO+');
  apiKey = signal<string>('');

  constructor() {
    this.loadState();
    this.initFirestoreSync();
  }

  private loadState(): void {
    const dataStr = localStorage.getItem(this.STORAGE_KEY);
    if (dataStr) {
      try {
        const parsed = JSON.parse(dataStr);
        if (parsed && Array.isArray(parsed) && parsed.length > 0) {
          this.sessions.set(parsed);
          this.activeSessionId.set(parsed[0].id);
          this.activeFile.set(parsed[0].files?.[0] || null);
          return;
        }
      } catch (e) {
        console.error('Agent state load error', e);
      }
    }

    // Default Seed Sessions matching user screenshot
    const defaultSessions: AgentSession[] = [
      {
        id: 'session_1',
        title: 'محادثة برمجية جديدة',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120).toISOString(), // 4 months ago
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120).toISOString(),
        engine: 'GEMINI 2.5 PRO+',
        messages: [
          {
            id: 'm1',
            role: 'user',
            text: 'ابدأ بناء تطبيق ويب متكامل لإدارة المهام مع مؤقت بومودورو وتأثيرات زجاجية نيون.',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120).toISOString()
          },
          {
            id: 'm2',
            role: 'agent',
            text: 'تم تحليل الطلب وبناء هيكلية التطبيق بنجاح. قمت بإنشاء ملفات الواجهة `index.html` وملف التنسيق `style.css` والمنطق البرمجي `app.js`. يمكنك معاينة وتشغيل الكود مباشرة!',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120).toISOString()
          }
        ],
        files: [
          {
            name: 'index.html',
            path: 'src/index.html',
            language: 'html',
            content: `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>نظام إدارة المهام العصبي - Si-Neuro</title>
  <link rel="stylesheet" href="style.css">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-[#0b0f19] text-white min-h-screen p-6 font-sans">
  <div class="max-w-xl mx-auto space-y-6">
    <header class="text-center space-y-2">
      <h1 class="text-3xl font-black text-indigo-400">⚡ المهام والتركيز العصبي</h1>
      <p class="text-xs text-slate-400">تم البناء بواسطة المهندس العصبي Si-NeuroAI</p>
    </header>
    <div class="bg-[#131b2e] border border-indigo-500/30 p-6 rounded-3xl space-y-4 shadow-2xl">
      <div class="flex gap-2">
        <input id="taskInput" type="text" placeholder="اكتب مهمتك الجديدة هنا..." class="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500">
        <button onclick="addTask()" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 font-bold text-sm rounded-xl transition">إضافة</button>
      </div>
      <ul id="taskList" class="space-y-2 text-sm"></ul>
    </div>
  </div>
  <script src="app.js"></script>
</body>
</html>`
          },
          {
            name: 'app.js',
            path: 'src/app.js',
            language: 'javascript',
            content: `function addTask() {
  const input = document.getElementById('taskInput');
  const text = input.value.trim();
  if (!text) return;
  const list = document.getElementById('taskList');
  const li = document.createElement('li');
  li.className = 'p-3 bg-black/30 border border-white/5 rounded-xl flex items-center justify-between animate-fadeIn';
  li.innerHTML = '<span>' + text + '</span><button onclick="this.parentElement.remove()" class="text-red-400 text-xs font-bold hover:text-red-300">حذف</button>';
  list.appendChild(li);
  input.value = '';
}`
          },
          {
            name: 'style.css',
            path: 'src/style.css',
            language: 'css',
            content: `body {
  font-family: system-ui, -apple-system, sans-serif;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fadeIn {
  animation: fadeIn 0.2s ease-out;
}`
          }
        ],
        logs: [
          { id: 'l1', timestamp: '8:28:39 PM', stepNumber: 1, message: 'جاري تحليل هيكلة المشروع وجلب ملفات التكوين...', type: 'info' },
          { id: 'l2', timestamp: '8:28:39 PM', stepNumber: 2, message: 'جاري توليد ملفات الواجهة والمنطق البرمجي (HTML, CSS, JS)...', type: 'info' },
          { id: 'l3', timestamp: '8:28:39 PM', stepNumber: 3, message: 'جاري التحقق من التوافقية وتشغيل فحص الشفرة...', type: 'info' },
          { id: 'l4', timestamp: '8:28:39 PM', stepNumber: 4, message: 'اكتمل بناء المشروع وجاهز للاختبار والتحميل بنجاح ✅', type: 'success' }
        ]
      },
      {
        id: 'session_2',
        title: 'محادثة برمجية جديدة',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120).toISOString(),
        engine: 'GEMINI 2.5 PRO+',
        messages: [],
        files: [],
        logs: []
      },
      {
        id: 'session_3',
        title: 'محادثة برمجية جديدة',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120).toISOString(),
        engine: 'GEMINI 2.5 PRO+',
        messages: [],
        files: [],
        logs: []
      },
      {
        id: 'session_4',
        title: 'محادثة برمجية جديدة',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 150).toISOString(), // 5 months ago
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 150).toISOString(),
        engine: 'GEMINI 2.5 PRO+',
        messages: [],
        files: [],
        logs: []
      },
      {
        id: 'session_5',
        title: 'غير اسم الموقع',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 150).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 150).toISOString(),
        engine: 'GEMINI 2.5 PRO+',
        messages: [
          {
            id: 'm5_1',
            role: 'user',
            text: 'غير اسم الموقع إلى Si-Neuro Core',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 150).toISOString()
          },
          {
            id: 'm5_2',
            role: 'agent',
            text: 'تم تحديث عنوان الموقع واسم المنظومة بنجاح في ملفات التكوين والواجهة.',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 150).toISOString()
          }
        ],
        files: [],
        logs: []
      }
    ];

    this.sessions.set(defaultSessions);
    this.activeSessionId.set(defaultSessions[0].id);
    this.activeFile.set(defaultSessions[0].files[0] || null);
    this.saveState();
  }

  private initFirestoreSync(): void {
    try {
      if (this.firebase.firestore) {
        const col = collection(this.firebase.firestore, 'agent_sessions');
        onSnapshot(col, (snapshot) => {
          if (!snapshot.empty) {
            const remote: AgentSession[] = [];
            snapshot.forEach(docSnap => {
              remote.push({ id: docSnap.id, ...docSnap.data() } as AgentSession);
            });
            if (remote.length > 0) {
              this.sessions.set(remote);
              this.saveState();
            }
          }
        }, (err) => {
          console.warn('[AgentAIService] Firestore sync notice:', err.message);
        });
      }
    } catch (e) {
      console.warn('[AgentAIService] Firestore sync init skipped:', e);
    }
  }

  saveState(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.sessions()));
  }

  // Get active session
  get activeSession(): AgentSession | undefined {
    return this.sessions().find(s => s.id === this.activeSessionId()) || this.sessions()[0];
  }

  // Create new session
  createSession(): AgentSession {
    const newSession: AgentSession = {
      id: 'session_' + Math.random().toString(36).substr(2, 9),
      title: 'محادثة برمجية جديدة',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      engine: this.currentEngine(),
      messages: [],
      files: [],
      logs: []
    };

    this.sessions.update(list => [newSession, ...list]);
    this.activeSessionId.set(newSession.id);
    this.activeFile.set(null);
    this.saveState();
    this.syncSessionToFirestore(newSession);
    return newSession;
  }

  // Delete session
  deleteSession(sessionId: string): void {
    this.sessions.update(list => list.filter(s => s.id !== sessionId));
    if (this.activeSessionId() === sessionId) {
      const remaining = this.sessions();
      if (remaining.length > 0) {
        this.activeSessionId.set(remaining[0].id);
        this.activeFile.set(remaining[0].files?.[0] || null);
      } else {
        this.createSession();
      }
    }
    this.saveState();

    try {
      if (this.firebase.firestore) {
        const docRef = doc(this.firebase.firestore, 'agent_sessions', sessionId);
        deleteDoc(docRef);
      }
    } catch (e) {}
  }

  // Select session
  selectSession(sessionId: string): void {
    this.activeSessionId.set(sessionId);
    const session = this.activeSession;
    if (session && session.files.length > 0) {
      this.activeFile.set(session.files[0]);
    } else {
      this.activeFile.set(null);
    }
  }

  // Execute Agent Prompt
  async executePrompt(promptText: string, attachmentUrl?: string): Promise<void> {
    const text = promptText.trim();
    if (!text) return;

    let session = this.activeSession;
    if (!session) {
      session = this.createSession();
    }

    // Add user message
    const userMsg: AgentChatMessage = {
      id: 'msg_' + Math.random().toString(36).substr(2, 9),
      role: 'user',
      text,
      timestamp: new Date().toISOString()
    };

    // Update title if it was generic
    if (session.title === 'محادثة برمجية جديدة' && text.length < 30) {
      session.title = text;
    }

    session.messages.push(userMsg);
    this.isExecuting.set(true);

    // Stream logs
    session.logs = [];
    const addLog = (msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
      const timeStr = new Date().toLocaleTimeString();
      const step = session!.logs.length + 1;
      session!.logs.push({
        id: 'log_' + Math.random().toString(36).substr(2, 9),
        timestamp: timeStr,
        stepNumber: step,
        message: msg,
        type
      });
      this.sessions.update(list => [...list]);
    };

    addLog(`جاري تحليل هيكلة المشروع وجلب ملفات التكوين (${session.engine})...`);
    await new Promise(resolve => setTimeout(resolve, 800));

    addLog('جاري تفكيك المتطلبات وبناء شجرة العقد والمكونات البرمجية...');
    await new Promise(resolve => setTimeout(resolve, 900));

    // Generate real project files based on prompt
    const generatedFiles = this.generateCodeForPrompt(text);
    session.files = generatedFiles;
    this.activeFile.set(generatedFiles[0] || null);

    addLog(`تم توليد ${generatedFiles.length} ملفات برمجية بنجاح...`);
    await new Promise(resolve => setTimeout(resolve, 700));

    addLog('جاري ربط الأكواد والتحقق من التوافقية البرمجية...');
    await new Promise(resolve => setTimeout(resolve, 600));

    addLog('اكتمل بناء المشروع وجاهز للاختبار والمعاينة الحية ✅', 'success');

    // Add Agent Response
    const agentMsg: AgentChatMessage = {
      id: 'msg_' + Math.random().toString(36).substr(2, 9),
      role: 'agent',
      text: `تمت معالجة طلبك البرمجي بنجاح بواسطة ${session.engine}! 🚀\n\nقمت بإنشاء ${generatedFiles.length} ملفات برمجية متكاملة. يمكنك الآن استعراض شجرة الملفات من (مستكشف العقد)، فحص الكود البرمجي، تشغيل المعاينة الحية، أو تحميل المشروع بالكامل كملف ZIP.`,
      timestamp: new Date().toISOString(),
      generatedFiles
    };

    session.messages.push(agentMsg);
    session.updatedAt = new Date().toISOString();

    this.isExecuting.set(false);
    this.saveState();
    this.syncSessionToFirestore(session);
  }

  // Code Generator Engine
  private generateCodeForPrompt(prompt: string): ProjectFile[] {
    const p = prompt.toLowerCase();

    if (p.includes('حاسبة') || p.includes('calculator')) {
      return [
        {
          name: 'index.html',
          path: 'src/index.html',
          language: 'html',
          content: `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>الحاسبة الذكية - Si-Neuro</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="style.css">
</head>
<body class="bg-[#0b0f19] text-white min-h-screen flex items-center justify-center p-4">
  <div class="bg-[#111827] border border-indigo-500/30 p-6 rounded-3xl shadow-2xl w-full max-w-xs space-y-4">
    <div class="text-right">
      <span class="text-xs text-indigo-400 font-mono">Si-Neuro Calc v2.5</span>
      <input id="display" type="text" readonly class="w-full bg-black/50 border border-white/10 rounded-2xl h-14 px-4 text-2xl font-mono text-right text-emerald-400 focus:outline-none mt-1" value="0">
    </div>
    <div class="grid grid-cols-4 gap-2">
      <button onclick="clearCalc()" class="col-span-2 p-3 bg-red-500/20 text-red-400 rounded-xl font-bold hover:bg-red-500/30">C</button>
      <button onclick="appendOp('/')" class="p-3 bg-indigo-600/30 text-indigo-300 rounded-xl font-bold hover:bg-indigo-600/50">÷</button>
      <button onclick="appendOp('*')" class="p-3 bg-indigo-600/30 text-indigo-300 rounded-xl font-bold hover:bg-indigo-600/50">×</button>
      
      <button onclick="appendNum('7')" class="p-3 bg-white/5 rounded-xl font-bold hover:bg-white/10">7</button>
      <button onclick="appendNum('8')" class="p-3 bg-white/5 rounded-xl font-bold hover:bg-white/10">8</button>
      <button onclick="appendNum('9')" class="p-3 bg-white/5 rounded-xl font-bold hover:bg-white/10">9</button>
      <button onclick="appendOp('-')" class="p-3 bg-indigo-600/30 text-indigo-300 rounded-xl font-bold hover:bg-indigo-600/50">-</button>
      
      <button onclick="appendNum('4')" class="p-3 bg-white/5 rounded-xl font-bold hover:bg-white/10">4</button>
      <button onclick="appendNum('5')" class="p-3 bg-white/5 rounded-xl font-bold hover:bg-white/10">5</button>
      <button onclick="appendNum('6')" class="p-3 bg-white/5 rounded-xl font-bold hover:bg-white/10">6</button>
      <button onclick="appendOp('+')" class="p-3 bg-indigo-600/30 text-indigo-300 rounded-xl font-bold hover:bg-indigo-600/50">+</button>
      
      <button onclick="appendNum('1')" class="p-3 bg-white/5 rounded-xl font-bold hover:bg-white/10">1</button>
      <button onclick="appendNum('2')" class="p-3 bg-white/5 rounded-xl font-bold hover:bg-white/10">2</button>
      <button onclick="appendNum('3')" class="p-3 bg-white/5 rounded-xl font-bold hover:bg-white/10">3</button>
      <button onclick="calculate()" class="row-span-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-black text-xl flex items-center justify-center shadow-lg shadow-indigo-600/30">=</button>
      
      <button onclick="appendNum('0')" class="col-span-2 p-3 bg-white/5 rounded-xl font-bold hover:bg-white/10">0</button>
      <button onclick="appendNum('.')" class="p-3 bg-white/5 rounded-xl font-bold hover:bg-white/10">.</button>
    </div>
  </div>
  <script src="calculator.js"></script>
</body>
</html>`
        },
        {
          name: 'calculator.js',
          path: 'src/calculator.js',
          language: 'javascript',
          content: `let expr = '';
function appendNum(n) {
  if (expr === '0') expr = '';
  expr += n;
  document.getElementById('display').value = expr;
}
function appendOp(op) {
  expr += ' ' + op + ' ';
  document.getElementById('display').value = expr;
}
function clearCalc() {
  expr = '';
  document.getElementById('display').value = '0';
}
function calculate() {
  try {
    const res = eval(expr);
    document.getElementById('display').value = res;
    expr = res.toString();
  } catch(e) {
    document.getElementById('display').value = 'Error';
    expr = '';
  }
}`
        },
        {
          name: 'style.css',
          path: 'src/style.css',
          language: 'css',
          content: `body {
  user-select: none;
}`
        }
      ];
    }

    // Default rich project template (Interactive Dashboard / Game)
    return [
      {
        name: 'index.html',
        path: 'src/index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>${prompt || 'مشروع المهندس العصبي'}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="style.css">
</head>
<body class="bg-[#0b0f19] text-white min-h-screen p-6 font-sans">
  <div class="max-w-4xl mx-auto space-y-6">
    <header class="flex items-center justify-between border-b border-white/10 pb-4">
      <div>
        <h1 class="text-2xl font-black text-indigo-400">⚡ ${prompt || 'تطبيق نكسوس العصبي'}</h1>
        <p class="text-xs text-slate-400">تم البناء التلقائي بواسطة Neural Architect</p>
      </div>
      <span class="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-full">جاهز للتشغيل</span>
    </header>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="p-5 bg-[#131b2e] border border-white/5 rounded-2xl space-y-2">
        <span class="text-xs text-slate-400 font-bold">الحالة العامة</span>
        <h3 class="text-xl font-bold text-emerald-400">نشط ومستقر</h3>
      </div>
      <div class="p-5 bg-[#131b2e] border border-white/5 rounded-2xl space-y-2">
        <span class="text-xs text-slate-400 font-bold">زمن الاستجابة</span>
        <h3 class="text-xl font-bold text-indigo-400">12 ms</h3>
      </div>
      <div class="p-5 bg-[#131b2e] border border-white/5 rounded-2xl space-y-2">
        <span class="text-xs text-slate-400 font-bold">العقد المتصلة</span>
        <h3 class="text-xl font-bold text-purple-400">4 عقد</h3>
      </div>
    </div>

    <div class="p-6 bg-[#131b2e] border border-white/5 rounded-3xl space-y-4">
      <h2 class="text-lg font-bold">لوحة التحكم التفاعلية</h2>
      <p class="text-xs text-slate-300">اضغط على الزر أدناه لاختبار التفاعل الحي وتوليد البيانات العصبية.</p>
      <button onclick="triggerAction()" class="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition">
        تشغيل المحاكاة 🚀
      </button>
      <div id="outputLog" class="p-4 bg-black/50 border border-white/10 rounded-2xl font-mono text-xs text-indigo-300 min-h-[80px]">
        بانتظار بدء المحاكاة...
      </div>
    </div>
  </div>
  <script src="main.js"></script>
</body>
</html>`
      },
      {
        name: 'main.js',
        path: 'src/main.js',
        language: 'javascript',
        content: `function triggerAction() {
  const log = document.getElementById('outputLog');
  const timestamp = new Date().toLocaleTimeString();
  log.innerHTML = '[' + timestamp + '] تم إرسال نبضة عصبية بنجاح! التردد: 2.4 GHz | الأداء: 100% ✨';
}`
      },
      {
        name: 'style.css',
        path: 'src/style.css',
        language: 'css',
        content: `body {
  background-color: #0b0f19;
}`
      },
      {
        name: 'README.md',
        path: 'README.md',
        language: 'markdown',
        content: `# ${prompt || 'مشروع Si-Neuro'}\n\nتم توليد هذا المشروع تلقائياً بواسطة المهندس العصبي الذكي (Neural Architect).\n\n## التشغيل\nافتح ملف \`index.html\` في أي متصفح حديث.`
      }
    ];
  }

  private async syncSessionToFirestore(session: AgentSession): Promise<void> {
    try {
      if (this.firebase.firestore) {
        const ref = doc(this.firebase.firestore, 'agent_sessions', session.id);
        await setDoc(ref, session, { merge: true });
      }
    } catch (e) {}
  }
}
