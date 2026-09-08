import { Injectable, inject, signal } from '@angular/core';
import { AssistantToolsService, ToolExecutionResult } from './assistant-tools.service';
import { FirebaseService } from './firebase.service';

export interface LearnedPattern {
  id: string;
  triggerPhrase: string;
  toolName: string;
  paramsTemplate: Record<string, any>;
  usageCount: number;
  confidence: number;
  createdAt: number;
}

export interface IntentMatchResult {
  matched: boolean;
  source: 'rule' | 'learned' | 'none';
  toolName?: string;
  args?: any;
  immediateReply?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AssistantIntentService {
  private toolsService = inject(AssistantToolsService);
  private firebaseService = inject(FirebaseService);

  private readonly STORAGE_KEY = 'assistant_learned_patterns_v1';
  learnedPatterns = signal<LearnedPattern[]>([]);

  // Route map for instant in-app navigation
  private readonly routeAliases: { keywords: string[]; route: string; label: string }[] = [
    { keywords: ['حلال تيوب', 'ستريم', 'فيديو', 'فيديوهات', 'halaltube', 'يوتيوب حلال', 'مقاطع'], route: '/stream', label: 'حلال تيوب (Halaltube)' },
    { keywords: ['حصن', 'حصن المسلم', 'قران', 'قرآن', 'اذكار', 'الاذكار', 'hisn', 'ورد'], route: '/hisn', label: 'حصن المسلم والأذكار' },
    { keywords: ['العاب', 'ألعاب', 'اركيد', 'لعبة', 'arcade', 'مترو داش', 'العب'], route: '/arcade', label: 'صالة الألعاب (Arcade)' },
    { keywords: ['ملفات الجهاز', 'ملفاتي', 'الملفات', 'فولدر', 'device-files', 'مستكشف الملفات'], route: '/device-files', label: 'مدير ملفات الجهاز' },
    { keywords: ['اوبن كود', 'كود', 'برمجة', 'محرر البرمجة', 'opencode', 'المبرمج'], route: '/opencode', label: 'مساعد البرمجة (OpenCode)' },
    { keywords: ['مستندات', 'محرر المستندات', 'وورد', 'docs', 'سوبر دوك', 'كتابة'], route: '/docs', label: 'محرر المستندات (SuperDoc)' },
    { keywords: ['رسم', 'استوديو الرسم', 'draw', 'لوحة الرسم', 'ارسم'], route: '/draw', label: 'استوديو الرسم (SuperDraw)' },
    { keywords: ['مشغل', 'مشغل الوسائط', 'مشغل الفيديو', 'local-player', 'فيديو محلي'], route: '/local-player', label: 'مشغل الوسائط المحلي' },
    { keywords: ['الوقت', 'تنظيم الوقت', 'بومودورو', 'تركيز', 'time', 'مؤقت بومودورو'], route: '/time', label: 'تنظيم الوقت والتركيز' },
    { keywords: ['صحة', 'رياضة', 'health', 'تمارين', 'اللياقة'], route: '/health', label: 'الصحة والرياضة' },
    { keywords: ['شات', 'دردشة', 'chat', 'المحادثة الذكية', 'شات جي بي تي'], route: '/chat', label: 'الدردشة الذكية' },
    { keywords: ['محفظة', 'رصيد', 'فلوس', 'wallet', 'المحفظة الذكية'], route: '/wallet', label: 'المحفظة الذكية' },
    { keywords: ['حسابي', 'ملفي', 'بروفايل', 'profile', 'بياناتي'], route: '/profile', label: 'الملف الشخصي' },
    { keywords: ['اعدادات', 'إعدادات', 'ضبط', 'settings', 'الخيارات'], route: '/settings', label: 'إعدادات المنصة' },
    { keywords: ['لوحة التحكم', 'داشبورد', 'dashboard', 'الرئيسية'], route: '/dashboard', label: 'لوحة التحكم المركزية' }
  ];

  constructor() {
    this.loadLearnedPatterns();
  }

  // Load learned patterns from storage & firestore
  private loadLearnedPatterns() {
    try {
      const local = localStorage.getItem(this.STORAGE_KEY);
      if (local) {
        this.learnedPatterns.set(JSON.parse(local));
      }
    } catch (e) {
      console.warn('Could not load learned assistant patterns:', e);
    }
  }

  private saveLearnedPatterns() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.learnedPatterns()));
      // If user is logged in, optionally sync to Firestore
      const user = this.firebaseService.currentUser();
      if (user && user.uid && this.firebaseService.firestore) {
        import('firebase/firestore').then(({ doc, setDoc }) => {
          const docRef = doc(this.firebaseService.firestore, `users/${user.uid}/assistant_meta`, 'patterns');
          setDoc(docRef, {
            patterns: this.learnedPatterns(),
            updatedAt: Date.now()
          }, { merge: true }).catch(() => {});
        });
      }
    } catch (e) {
      console.warn('Could not save learned patterns:', e);
    }
  }

  // Learn a new pattern dynamically when AI resolves an edge-case
  learnPattern(triggerPhrase: string, toolName: string, paramsTemplate: Record<string, any>) {
    const normalized = this.normalizeArabic(triggerPhrase);
    if (!normalized || normalized.length < 3) return;

    // Check if already learned
    const existing = this.learnedPatterns().find(p => p.triggerPhrase === normalized);
    if (existing) {
      this.learnedPatterns.update(list => list.map(p => 
        p.id === existing.id 
          ? { ...p, usageCount: p.usageCount + 1, confidence: Math.min(1.0, p.confidence + 0.1) } 
          : p
      ));
    } else {
      const newPattern: LearnedPattern = {
        id: 'pat_' + Date.now(),
        triggerPhrase: normalized,
        toolName,
        paramsTemplate,
        usageCount: 1,
        confidence: 0.9,
        createdAt: Date.now()
      };
      this.learnedPatterns.update(list => [newPattern, ...list]);
    }
    this.saveLearnedPatterns();
  }

  deletePattern(id: string) {
    this.learnedPatterns.update(list => list.filter(p => p.id !== id));
    this.saveLearnedPatterns();
  }

  clearLearnedPatterns() {
    this.learnedPatterns.set([]);
    this.saveLearnedPatterns();
  }

  // Arabic text normalizer
  normalizeArabic(text: string): string {
    if (!text) return '';
    return text
      .trim()
      .toLowerCase()
      // Remove diacritics / tashkeel
      .replace(/[\u064B-\u065F\u0670]/g, '')
      // Remove tatweel
      .replace(/\u0640/g, '')
      // Normalize alifs
      .replace(/[أإآ]/g, 'ا')
      // Normalize tah marbuta
      .replace(/ة/g, 'ه')
      // Normalize yaa
      .replace(/ى/g, 'ي')
      // Normalize Arabic-Indic digits to ASCII
      .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
      // Replace multiple spaces
      .replace(/\s+/g, ' ');
  }

  // Convert Arabic number words to digits
  private parseArabicDurationMinutes(text: string): number | null {
    // Check direct digits
    const digitMatch = text.match(/(\d+)\s*(دقائق|دقيقة|دقايق|دقيقه|د)?/);
    if (digitMatch && digitMatch[1]) {
      return parseInt(digitMatch[1], 10);
    }

    if (text.includes('دقيقتين') || text.includes('دقيقتان')) return 2;
    if (text.includes('دقيقة') || text.includes('دقيقه')) return 1;
    if (text.includes('ربع ساعة') || text.includes('ربع ساعه') || text.includes('15 دقيقة')) return 15;
    if (text.includes('ثلث ساعة') || text.includes('ثلث ساعه') || text.includes('20 دقيقة')) return 20;
    if (text.includes('نصف ساعة') || text.includes('نص ساعة') || text.includes('نص ساعه') || text.includes('30 دقيقة')) return 30;
    if (text.includes('ساعة الا ربع') || text.includes('ساعه الا ربع') || text.includes('45 دقيقة')) return 45;
    if (text.includes('ساعتين') || text.includes('ساعتان')) return 120;
    if (text.includes('ساعة') || text.includes('ساعه')) return 60;

    // Word numbers
    if (text.includes('ثلاث') || text.includes('تلات')) return 3;
    if (text.includes('اربع') || text.includes('أربع')) return 4;
    if (text.includes('خمس')) return 5;
    if (text.includes('ست')) return 6;
    if (text.includes('سبع')) return 7;
    if (text.includes('ثمان') || text.includes('تمن')) return 8;
    if (text.includes('تسع')) return 9;
    if (text.includes('عشر')) return 10;

    return null;
  }

  // Extract clock time HH:mm from Arabic phrases
  private parseClockTime(text: string): string | null {
    // Matches like 14:30 or 4:15
    const regexTime = /(\d{1,2}):(\d{2})/;
    const m = text.match(regexTime);
    if (m) {
      let h = parseInt(m[1], 10);
      const min = m[2];
      if (text.includes('مساء') || text.includes('بالليل') || text.includes('عصرا')) {
        if (h < 12) h += 12;
      }
      return `${String(h).padStart(2, '0')}:${min}`;
    }

    // Matches like "الساعة 5" or "الساعه 4"
    const hourMatch = text.match(/الساع[هة]\s*(\d{1,2})/);
    if (hourMatch) {
      let h = parseInt(hourMatch[1], 10);
      let min = '00';
      if (text.includes('ونص') || text.includes('ونصف')) min = '30';
      else if (text.includes('وربع')) min = '15';
      else if (text.includes('وثلث')) min = '20';
      else if (text.includes('الا ربع')) {
        h = h > 1 ? h - 1 : 12;
        min = '45';
      }

      if ((text.includes('مساء') || text.includes('بالليل') || text.includes('عصرا')) && h < 12) {
        h += 12;
      }
      return `${String(h).padStart(2, '0')}:${min}`;
    }

    return null;
  }

  // TIER 1 & TIER 2: Match input against deterministic rules or learned patterns
  async evaluateIntent(rawInput: string): Promise<IntentMatchResult> {
    const normalized = this.normalizeArabic(rawInput);
    if (!normalized) return { matched: false, source: 'none' };

    // --- 1. Check Dynamic Learned Patterns First (Fast lookup) ---
    for (const pat of this.learnedPatterns()) {
      if (normalized === pat.triggerPhrase || normalized.includes(pat.triggerPhrase) || pat.triggerPhrase.includes(normalized)) {
        // Execute the learned tool
        const execResult = await this.toolsService.executeTool(pat.toolName, pat.paramsTemplate);
        return {
          matched: true,
          source: 'learned',
          toolName: pat.toolName,
          args: pat.paramsTemplate,
          immediateReply: `⚡ (قاعدة متعلَّمة سريعة):\n${execResult.message}`
        };
      }
    }

    // --- 2. Deterministic Rule Matcher: System Queries & Quick Utilities ---
    if (normalized.includes('الساعه كام') || normalized.includes('الساعة كام') || normalized.includes('الوقت الان') || normalized.includes('كم الوقت')) {
      const now = new Date();
      return {
        matched: true,
        source: 'rule',
        immediateReply: `⚡ الوقت الحالي هو: ${now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} ⏰`
      };
    }

    if (normalized.includes('تاريخ اليوم') || normalized.includes('النهارده كام') || normalized.includes('النهارده ايه')) {
      const now = new Date();
      return {
        matched: true,
        source: 'rule',
        immediateReply: `⚡ اليوم هو: ${now.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} 📅`
      };
    }

    if (normalized.includes('الغاء المنبهات') || normalized.includes('مسح المنبهات') || normalized.includes('وقف المنبهات') || normalized.includes('طفي المنبه')) {
      const res = await this.toolsService.executeTool('clear_alarms', {});
      return {
        matched: true,
        source: 'rule',
        toolName: 'clear_alarms',
        immediateReply: `⚡ ${res.message}`
      };
    }

    if (normalized.includes('مهامي') || normalized.includes('جدولي') || normalized.includes('ايه اللي ورايا')) {
      const res = await this.toolsService.executeTool('get_system_context', {});
      const pending = res.data?.pendingTasks || [];
      if (pending.length === 0) {
        return {
          matched: true,
          source: 'rule',
          immediateReply: `⚡ لا توجد لديك مهام معلقة مجدولة لليوم! يومك حر ومنجز بإذن الله 🌟`
        };
      }
      const taskLines = pending.map((t: any) => `• [${t.timeStr}] ${t.title}`).join('\n');
      return {
        matched: true,
        source: 'rule',
        immediateReply: `⚡ مهامك المتبقية لليوم (${pending.length}):\n${taskLines}`
      };
    }

    // --- 3. Deterministic Rule Matcher: Alarms ---
    // Phrasings: اعمل منبه، اضبط منبه، رنلي كمان 5 دقايق، صحيني بعد ساعة، مؤقت 10 دقائق
    const isAlarmRequest = /^(اعمل|اضبط|حط|رنلي|صحيني|نبهني|مؤقت|منبه|ذكرني بعد|فكرني بعد)/.test(normalized) ||
      normalized.includes('منبه') || normalized.includes('مؤقت') || normalized.includes('صحيني');

    if (isAlarmRequest) {
      const minutes = this.parseArabicDurationMinutes(normalized);
      if (minutes) {
        // Extract title if specified (e.g. "اعمل منبه كمان 5 دقايق للمذاكرة")
        let title = 'منبه المساعد الشخصي';
        const forMatch = normalized.match(/(ل|عشان|علشان|بسبب)\s+([^\d]+)/);
        if (forMatch && forMatch[2] && forMatch[2].length > 2) {
          title = forMatch[2].trim();
        }

        const res = await this.toolsService.executeTool('create_alarm', { title, minutes });
        return {
          matched: true,
          source: 'rule',
          toolName: 'create_alarm',
          args: { title, minutes },
          immediateReply: `⚡ تم التنفيذ فورياً بدون استهلاك توكن:\n${res.message}`
        };
      }
    }

    // --- 4. Deterministic Rule Matcher: Navigation ---
    // Phrasings: افتح حلال تيوب، روح على حصن المسلم، شغل العاب، هات الملفات
    const isNavRequest = /^(افتح|روح|وديني|شغل|هات|انتقل|عرض|صفح[هة]|قسم)/.test(normalized) ||
      normalized.startsWith('عاوز افتح') || normalized.startsWith('عايز افتح') || normalized.startsWith('وديني ل');

    if (isNavRequest) {
      for (const item of this.routeAliases) {
        const matchesKeyword = item.keywords.some(kw => normalized.includes(this.normalizeArabic(kw)));
        if (matchesKeyword) {
          const res = await this.toolsService.executeTool('navigate_to', { route: item.route, sectionName: item.label });
          return {
            matched: true,
            source: 'rule',
            toolName: 'navigate_to',
            args: { route: item.route, sectionName: item.label },
            immediateReply: `⚡ تم التوجيه فورياً:\n${res.message}`
          };
        }
      }
    }

    // --- 5. Deterministic Rule Matcher: Scheduled Tasks ---
    // Phrasings: اضف مهمة، سجل مهمة، فكرني بـ... الساعة 5
    const isTaskRequest = /^(اضف مهم[هة]|سجل مهم[هة]|مهم[هة] جديد[هة]|فكرني ب|ذكرني ب)/.test(normalized);
    if (isTaskRequest) {
      const clockTime = this.parseClockTime(normalized);
      if (clockTime) {
        // Clean title
        let taskTitle = normalized
          .replace(/^(اضف مهم[هة]|سجل مهم[هة]|مهم[هة] جديد[هة]|فكرني ب|ذكرني ب)/, '')
          .replace(/الساع[هة].*$/, '')
          .replace(/\d{1,2}(:\d{2})?.*$/, '')
          .trim();
        if (!taskTitle) taskTitle = 'مهمة مجدولة';

        const res = await this.toolsService.executeTool('add_task', {
          title: taskTitle,
          timeStr: clockTime,
          category: 'general'
        });

        return {
          matched: true,
          source: 'rule',
          toolName: 'add_task',
          args: { title: taskTitle, timeStr: clockTime },
          immediateReply: `⚡ تم جدولة المهمة فورياً بنجاح:\n${res.message}`
        };
      }
    }

    // If none matched, return false -> fallback to Tier 3 (LLM)
    return { matched: false, source: 'none' };
  }
}
