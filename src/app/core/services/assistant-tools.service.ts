import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { GlobalStateService } from './global-state.service';

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required?: string[];
  };
}

export interface ToolExecutionResult {
  tool: string;
  success: boolean;
  message: string;
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class AssistantToolsService {
  private router = inject(Router);
  private globalState = inject(GlobalStateService);

  // Callbacks registered by PersonalAssistantService to avoid circular dependency
  private onAddAlarmCallback?: (title: string, minutes: number) => void;
  private onAddTaskCallback?: (task: { title: string; timeStr: string; category?: any; deepLink?: string }) => void;
  private onGetTasksCallback?: () => { tasks: any[]; alarms: any[] };
  private onClearAlarmsCallback?: () => void;
  private onSpeakCallback?: (text: string) => void;

  registerCallbacks(callbacks: {
    addAlarm: (title: string, minutes: number) => void;
    addTask: (task: { title: string; timeStr: string; category?: any; deepLink?: string }) => void;
    getTasks: () => { tasks: any[]; alarms: any[] };
    clearAlarms: () => void;
    speak: (text: string) => void;
  }) {
    this.onAddAlarmCallback = callbacks.addAlarm;
    this.onAddTaskCallback = callbacks.addTask;
    this.onGetTasksCallback = callbacks.getTasks;
    this.onClearAlarmsCallback = callbacks.clearAlarms;
    this.onSpeakCallback = callbacks.speak;
  }

  // Schema definition for Gemini Function Calling
  getGeminiFunctionDeclarations(): ToolDefinition[] {
    return [
      {
        name: 'create_alarm',
        description: 'ضبط منبه ومؤقت بالدقائق للمستخدم',
        parameters: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING', description: 'عنوان أو سبب المنبه، مثل: مذاكرة، استراحة، صلاة' },
            minutes: { type: 'NUMBER', description: 'عدد الدقائق حتى ينطلق المنبه' }
          },
          required: ['title', 'minutes']
        }
      },
      {
        name: 'add_task',
        description: 'إضافة مهمة مجدولة في يوم المستخدم مع تحديد وقت الساعات والدقائق ورابط سريع اختياري',
        parameters: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING', description: 'عنوان المهمة المطلوب تذكير المستخدم بها' },
            timeStr: { type: 'STRING', description: 'وقت التنبيه بصيغة 24 ساعة HH:mm مثل "14:30" أو "05:00"' },
            category: { 
              type: 'STRING', 
              description: 'تصنيف المهمة', 
              enum: ['general', 'study', 'quran', 'finance', 'alarm'] 
            },
            deepLink: { type: 'STRING', description: 'مسار داخلي للانتقال الفوري عند التنبيه مثل /stream أو /hisn أو /opencode' }
          },
          required: ['title', 'timeStr']
        }
      },
      {
        name: 'navigate_to',
        description: 'الانتقال بصفحة المستخدم إلى أحد أقسام المنصة مباشرة',
        parameters: {
          type: 'OBJECT',
          properties: {
            route: { 
              type: 'STRING', 
              description: 'المسار المطلوب فتحه داخل التطبيق',
              enum: [
                '/stream', '/hisn', '/arcade', '/opencode', '/docs', 
                '/draw', '/local-player', '/device-files', '/time', 
                '/health', '/chat', '/wallet', '/profile', '/dashboard'
              ] 
            },
            sectionName: { type: 'STRING', description: 'الاسم العربي للقسم لتأكيد الانتقال' }
          },
          required: ['route']
        }
      },
      {
        name: 'get_system_context',
        description: 'الحصول على سياق المستخدم الحالي: الوقت والتاريخ، المهام العالقة، والمنبهات الفعالة',
        parameters: {
          type: 'OBJECT',
          properties: {}
        }
      },
      {
        name: 'clear_alarms',
        description: 'مسح وإلغاء جميع المنبهات الفعالة حالياً',
        parameters: {
          type: 'OBJECT',
          properties: {}
        }
      }
    ];
  }

  // Execute tool by name
  async executeTool(toolName: string, args: any): Promise<ToolExecutionResult> {
    try {
      switch (toolName) {
        case 'create_alarm': {
          const minutes = Math.max(1, Math.round(Number(args.minutes) || 5));
          const title = (args.title || 'منبه سريع').trim();
          if (this.onAddAlarmCallback) {
            this.onAddAlarmCallback(title, minutes);
          }
          return {
            tool: toolName,
            success: true,
            message: `تم ضبط منبه: "${title}" بعد ${minutes} دقيقة ⏰`,
            data: { title, minutes }
          };
        }

        case 'add_task': {
          const title = (args.title || 'مهمة جديدة').trim();
          let timeStr = (args.timeStr || '').trim();
          if (!timeStr.includes(':')) {
            const now = new Date();
            timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
          }
          const category = args.category || 'general';
          const deepLink = args.deepLink || undefined;

          if (this.onAddTaskCallback) {
            this.onAddTaskCallback({ title, timeStr, category, deepLink });
          }

          return {
            tool: toolName,
            success: true,
            message: `تمت إضافة المهمة بنجاح: "${title}" في تمام الساعة ${timeStr} 📋`,
            data: { title, timeStr, deepLink }
          };
        }

        case 'navigate_to': {
          const route = (args.route || '').trim();
          const label = args.sectionName || route;
          if (route) {
            await this.router.navigateByUrl(route);
            return {
              tool: toolName,
              success: true,
              message: `جاري الانتقال فوراً إلى: ${label} 🚀`,
              data: { route, label }
            };
          }
          return { tool: toolName, success: false, message: 'المسار غير صالح للانتقال' };
        }

        case 'get_system_context': {
          const now = new Date();
          const tasksData = this.onGetTasksCallback ? this.onGetTasksCallback() : { tasks: [], alarms: [] };
          const user = this.globalState.userProfile();
          
          return {
            tool: toolName,
            success: true,
            message: 'تم جلب سياق النظام بنجاح',
            data: {
              userName: user.name,
              isPro: user.isPro,
              currentTime: now.toLocaleTimeString('ar-EG'),
              currentDate: now.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
              pendingTasks: tasksData.tasks.filter((t: any) => !t.completed),
              activeAlarmsCount: tasksData.alarms.length
            }
          };
        }

        case 'clear_alarms': {
          if (this.onClearAlarmsCallback) {
            this.onClearAlarmsCallback();
          }
          return {
            tool: toolName,
            success: true,
            message: 'تم إيقاف وإلغاء جميع المنبهات بنجاح 🔕'
          };
        }

        default:
          return {
            tool: toolName,
            success: false,
            message: `الأداة ${toolName} غير معروفة في النظام`
          };
      }
    } catch (err: any) {
      console.error('Tool execution error:', err);
      return {
        tool: toolName,
        success: false,
        message: `حدث خطأ أثناء تنفيذ ${toolName}: ${err.message || err}`
      };
    }
  }
}
