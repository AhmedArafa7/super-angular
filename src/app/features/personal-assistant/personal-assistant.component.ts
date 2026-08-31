import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule, Sparkles, Bot, Brain, Smile, Shield, Mic, MicOff, Send, X, Bell, Clock, CheckCircle2, ArrowRight, Volume2 } from 'lucide-angular';
import { PersonalAssistantService, AssistantTask, ProactiveAlert } from '../../core/services/personal-assistant.service';

@Component({
  selector: 'app-personal-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <!-- Floating Assistant Button -->
    <div class="fixed bottom-6 left-6 z-50 flex items-center gap-3">
      <!-- Proactive Alert Banner Popup -->
      @if (assistant.proactiveAlert(); as alert) {
        <div class="absolute bottom-20 left-0 w-80 bg-slate-900 border-2 border-teal-500/60 rounded-3xl p-4 shadow-2xl backdrop-blur-xl text-white animate-bounce">
          <div class="flex items-start justify-between gap-2 mb-2">
            <div class="flex items-center gap-2">
              <div class="p-2 bg-teal-500/20 rounded-xl text-teal-400">
                <lucide-icon [img]="Bell" class="size-5"></lucide-icon>
              </div>
              <h4 class="text-xs font-black text-white">{{ alert.title }}</h4>
            </div>
            <button (click)="assistant.dismissAlert()" class="text-slate-400 hover:text-white">
              <lucide-icon [img]="X" class="size-4"></lucide-icon>
            </button>
          </div>
          <p class="text-xs text-slate-300 leading-relaxed mb-3">{{ alert.message }}</p>
          <div class="flex items-center justify-end gap-2">
            @if (alert.deepLink) {
              <button (click)="handleAlertAction(alert)" class="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5">
                <span>{{ alert.actionText || 'فتح' }}</span>
                <lucide-icon [img]="ArrowRight" class="size-3.5"></lucide-icon>
              </button>
            } @else {
              <button (click)="assistant.dismissAlert()" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition">
                {{ alert.actionText || 'حسناً' }}
              </button>
            }
          </div>
        </div>
      }

      <!-- Toggle Button -->
      <button 
        (click)="toggleOpen()" 
        class="size-14 rounded-full bg-gradient-to-tr from-indigo-600 via-teal-600 to-emerald-500 text-white shadow-2xl flex items-center justify-center hover:scale-105 transition-all duration-300 relative group"
        title="المساعد الشخصي الذكي">
        <div class="absolute inset-0 rounded-full bg-teal-400/30 animate-ping pointer-events-none"></div>
        <lucide-icon [img]="getIconComponent(assistant.assistantIcon())" class="size-7"></lucide-icon>
      </button>
    </div>

    <!-- Assistant Modal / Drawer -->
    @if (assistant.isAssistantOpen()) {
      <div class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6" (click)="assistant.isAssistantOpen.set(false)">
        <div class="bg-slate-900 border border-white/15 rounded-[2.5rem] w-full max-w-2xl h-[85vh] max-h-[750px] shadow-2xl flex flex-col overflow-hidden text-white" (click)="$event.stopPropagation()" dir="rtl">
          
          <!-- Header -->
          <div class="p-4 sm:p-5 border-b border-white/10 bg-slate-900/90 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="size-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-teal-500 flex items-center justify-center text-white shadow-lg">
                <lucide-icon [img]="getIconComponent(assistant.assistantIcon())" class="size-5"></lucide-icon>
              </div>
              <div>
                <h3 class="text-sm font-black text-white flex items-center gap-2">
                  <span>المساعد الشخصي الذكي</span>
                  <span class="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 font-mono">Gemini Pro 🤖</span>
                </h3>
                <p class="text-[11px] text-slate-400">يسير معك، ينبهك بمواعيدك، ويجيبك صوتياً.</p>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <!-- Icon Selector -->
              <select [(ngModel)]="selectedIcon" (change)="changeIcon($event)" class="bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-teal-300 focus:outline-none">
                <option value="Sparkles">✨ سحرية</option>
                <option value="Bot">🤖 روبوت</option>
                <option value="Brain">🧠 عقل</option>
                <option value="Smile">😊 ابتسامة</option>
                <option value="Shield">🛡️ حماية</option>
              </select>

              <!-- Close Button -->
              <button (click)="assistant.isAssistantOpen.set(false)" class="p-2 text-slate-400 hover:text-white rounded-xl transition">
                <lucide-icon [img]="X" class="size-5"></lucide-icon>
              </button>
            </div>
          </div>

          <!-- Tabs (Chat vs Tasks / Alarms) -->
          <div class="flex border-b border-white/10 bg-slate-950/40 px-4 text-xs font-bold">
            <button 
              (click)="activeTab.set('chat')" 
              [class.border-b-2]="activeTab() === 'chat'"
              [class.border-teal-500]="activeTab() === 'chat'"
              [class.text-teal-400]="activeTab() === 'chat'"
              class="py-3 px-4 text-slate-400 hover:text-white transition flex items-center gap-2">
              <lucide-icon [img]="Bot" class="size-4"></lucide-icon>
              <span>المحادثة الذكية</span>
            </button>
            <button 
              (click)="activeTab.set('tasks')" 
              [class.border-b-2]="activeTab() === 'tasks'"
              [class.border-teal-500]="activeTab() === 'tasks'"
              [class.text-teal-400]="activeTab() === 'tasks'"
              class="py-3 px-4 text-slate-400 hover:text-white transition flex items-center gap-2">
              <lucide-icon [img]="Clock" class="size-4"></lucide-icon>
              <span>المهام والمنبهات ({{ assistant.tasks().length }})</span>
            </button>
          </div>

          <!-- Tab 1: Chat -->
          @if (activeTab() === 'chat') {
            <div class="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar flex flex-col">
              @for (msg of assistant.messages(); track msg.id) {
                <div class="flex flex-col" [class.items-end]="msg.sender === 'user'" [class.items-start]="msg.sender === 'assistant'">
                  <div class="max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-md whitespace-pre-wrap"
                       [ngClass]="msg.sender === 'user' ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-bl-none' : 'bg-slate-800 border border-white/10 text-slate-200 rounded-br-none'"
                       [innerHTML]="formatMessageText(msg.text)">
                  </div>
                  <span class="text-[9px] text-slate-500 font-mono mt-1 px-1">{{ formatTime(msg.timestamp) }}</span>
                </div>
              }
              @if (isSending()) {
                <div class="flex items-center gap-2 text-xs text-teal-400 bg-teal-500/10 p-3 rounded-2xl w-fit animate-pulse">
                  <span>جاري التفكير والرد...</span>
                </div>
              }
            </div>

            <!-- Input Bar -->
            <div class="p-3 sm:p-4 bg-slate-900 border-t border-white/10 flex items-center gap-2">
              <button 
                (click)="toggleVoiceListening()" 
                [class.bg-red-600]="isListening()"
                [class.bg-white/10]="!isListening()"
                class="p-3 rounded-2xl hover:bg-white/20 transition text-white"
                [title]="isListening() ? 'إيقاف الاستماع' : 'التحدث صوتياً'">
                <lucide-icon [img]="isListening() ? MicOff : Mic" class="size-5" [class.text-red-300]="isListening()"></lucide-icon>
              </button>

              <input 
                type="text" 
                [(ngModel)]="userInput" 
                (keydown.enter)="sendPrompt()"
                placeholder="اسأل مساعدك الشخصي أو اطلب منه ضبط منبه أو جدول..." 
                class="flex-1 bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500" />

              <button 
                (click)="sendPrompt()" 
                class="p-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-2xl transition shadow-lg shadow-teal-600/20">
                <lucide-icon [img]="Send" class="size-5"></lucide-icon>
              </button>
            </div>
          }

          <!-- Tab 2: Tasks & Alarms Manager -->
          @if (activeTab() === 'tasks') {
            <div class="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              
              <!-- Add Task Form -->
              <div class="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-3">
                <h4 class="text-xs font-bold text-teal-300">إضافة مهمة أو موعد جديد:</h4>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input type="text" [(ngModel)]="newTaskTitle" placeholder="عنوان المهمة..." class="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500" />
                  <input type="time" [(ngModel)]="newTaskTime" class="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500" />
                  <select [(ngModel)]="newTaskLink" class="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500">
                    <option value="">بدون رابط مباشر</option>
                    <option value="/halaltube">حلال تيوب (Halaltube)</option>
                    <option value="/hisn">الورد اليومي / الحصن</option>
                    <option value="/local-player">مشغل الوسائط المحلي</option>
                  </select>
                </div>
                <button (click)="addNewTask()" class="w-full py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-teal-600/20">
                  + إضافة للمواعيد اليومية
                </button>
              </div>

              <!-- Tasks List -->
              <div class="space-y-2">
                <h4 class="text-xs font-bold text-slate-400">المهام المجدولة:</h4>
                @for (task of assistant.tasks(); track task.id) {
                  <div class="p-3 bg-black/40 border border-white/5 rounded-2xl flex items-center justify-between text-xs">
                    <div class="flex items-center gap-3">
                      <div class="size-8 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center font-mono font-bold">
                        {{ task.timeStr }}
                      </div>
                      <div>
                        <p class="font-bold text-white">{{ task.title }}</p>
                        <p class="text-[10px] text-slate-400 font-mono">رابط: {{ task.deepLink || 'لا يوجد' }}</p>
                      </div>
                    </div>
                    <button (click)="assistant.removeTask(task.id)" class="text-slate-500 hover:text-red-400 p-1.5 transition">حذف</button>
                  </div>
                }
              </div>

              <!-- Quick Alarm Form -->
              <div class="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-3">
                <h4 class="text-xs font-bold text-amber-300">ضبط منبه سريع (دقائق):</h4>
                <div class="flex gap-2">
                  <input type="text" [(ngModel)]="alarmTitle" placeholder="اسم المنبه..." class="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500" />
                  <input type="number" [(ngModel)]="alarmMinutes" min="1" max="180" class="w-24 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500" placeholder="بالدقائق" />
                  <button (click)="setQuickAlarm()" class="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition">
                    ضبط ⏰
                  </button>
                </div>
              </div>

            </div>
          }

        </div>
      </div>
    }
  `
})
export class PersonalAssistantComponent implements OnInit, OnDestroy {
  assistant = inject(PersonalAssistantService);
  router = inject(Router);

  // Icons
  Sparkles = Sparkles;
  Bot = Bot;
  Brain = Brain;
  Smile = Smile;
  Shield = Shield;
  Mic = Mic;
  MicOff = MicOff;
  Send = Send;
  X = X;
  Bell = Bell;
  Clock = Clock;
  CheckCircle2 = CheckCircle2;
  ArrowRight = ArrowRight;
  Volume2 = Volume2;

  activeTab = signal<'chat' | 'tasks'>('chat');
  userInput = '';
  isSending = signal<boolean>(false);
  isListening = signal<boolean>(false);

  selectedIcon = this.assistant.assistantIcon();

  newTaskTitle = '';
  newTaskTime = '10:00';
  newTaskLink = '';

  alarmTitle = '';
  alarmMinutes = 15;

  private recognition: any = null;

  ngOnInit() {
    this.initSpeechRecognition();
  }

  ngOnDestroy() {
    if (this.recognition) {
      try { this.recognition.stop(); } catch(e){}
    }
  }

  toggleOpen() {
    this.assistant.isAssistantOpen.update(v => !v);
  }

  getIconComponent(name: string) {
    switch(name) {
      case 'Bot': return Bot;
      case 'Brain': return Brain;
      case 'Smile': return Smile;
      case 'Shield': return Shield;
      default: return Sparkles;
    }
  }

  changeIcon(event: any) {
    const val = event.target.value;
    this.assistant.setAssistantIcon(val);
  }

  async sendPrompt() {
    const prompt = this.userInput.trim();
    if (!prompt || this.isSending()) return;
    this.userInput = '';
    this.isSending.set(true);
    await this.assistant.sendMessage(prompt);
    this.isSending.set(false);
  }

  handleAlertAction(alert: ProactiveAlert) {
    if (alert.deepLink) {
      this.router.navigateByUrl(alert.deepLink);
    }
    this.assistant.dismissAlert();
  }

  addNewTask() {
    if (!this.newTaskTitle.trim()) return;
    this.assistant.addTask({
      title: this.newTaskTitle.trim(),
      timeStr: this.newTaskTime,
      category: 'study',
      deepLink: this.newTaskLink || undefined
    });
    this.newTaskTitle = '';
  }

  setQuickAlarm() {
    if (!this.alarmTitle.trim() || !this.alarmMinutes) return;
    this.assistant.addAlarm(this.alarmTitle.trim(), Number(this.alarmMinutes));
    this.alarmTitle = '';
    this.alarmMinutes = 15;
  }

  formatTime(timestamp: number): string {
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  formatMessageText(text: string): string {
    if (!text) return '';
    return text.replace(
      /(https:\/\/[^\s]+)/g,
      '<a href="$1" target="_blank" class="text-teal-400 underline font-bold hover:text-teal-300 inline-flex items-center gap-1">$1 🔗</a>'
    );
  }

  initSpeechRecognition() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'ar-SA';
      this.recognition.continuous = false;
      this.recognition.interimResults = false;

      this.recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        this.userInput = text;
        this.isListening.set(false);
        this.sendPrompt();
      };

      this.recognition.onerror = () => {
        this.isListening.set(false);
      };

      this.recognition.onend = () => {
        this.isListening.set(false);
      };
    }
  }

  toggleVoiceListening() {
    if (!this.recognition) {
      alert('متصفحك لا يدعم التعرف الصوتي (Speech Recognition). جرب متصفح جوجل كروم.');
      return;
    }
    if (this.isListening()) {
      this.recognition.stop();
      this.isListening.set(false);
    } else {
      try {
        this.recognition.start();
        this.isListening.set(true);
      } catch (e) {
        this.isListening.set(false);
      }
    }
  }
}
