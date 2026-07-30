import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  LucideAngularModule, Plus, Clock, GraduationCap, LibraryBig, FileText, 
  Video, Check, Edit3, DownloadCloud, ArrowLeft, Sparkles, Info
} from 'lucide-angular';
import { LearningHubService, SubjectId, SectionType, ScheduleEvent } from '../../core/learning-hub.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-learning',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './learning.component.html',
  styleUrls: ['./learning.component.scss']
})
export class LearningComponent {
  learningService = inject(LearningHubService);
  toast = inject(ToastService);

  // Icons
  Plus = Plus;
  Clock = Clock;
  GraduationCap = GraduationCap;
  LibraryBig = LibraryBig;
  FileText = FileText;
  Video = Video;
  Check = Check;
  Edit3 = Edit3;
  DownloadCloud = DownloadCloud;
  ArrowLeft = ArrowLeft;
  Sparkles = Sparkles;
  Info = Info;

  // States
  activeSubjectId = signal<SubjectId>('algo');
  activeSection = signal<SectionType>('materials');

  // Creation forms states
  showAddMaterial = signal<boolean>(false);
  newMaterialName = signal<string>('');

  showAddEvent = signal<boolean>(false);
  newEventTitle = signal<string>('');
  newEventDate = signal<string>('');
  newEventTime = signal<string>('');
  newEventType = signal<'lecture' | 'section' | 'quiz' | 'assignment'>('lecture');

  // Assignment Creation Form State
  showAddAssignment = signal<boolean>(false);
  newAssignmentName = signal<string>('');
  newAssignmentDeadline = signal<string>('');

  // AI Study Assistant Modal State
  showAiTutorModal = signal<boolean>(false);
  aiQuery = signal<string>('');
  aiAnswer = signal<string>('');
  isGeneratingAi = signal<boolean>(false);

  // Fetch visible materials/items based on active filters
  currentSubject = computed(() => {
    return this.learningService.subjects()[this.activeSubjectId()];
  });

  currentProgress = computed(() => {
    return this.learningService.getProgress(this.activeSubjectId());
  });

  globalProgress = computed(() => {
    return this.learningService.getGlobalProgress();
  });

  subjectsList = computed(() => {
    return Object.values(this.learningService.subjects());
  });

  // Event handlers
  addNewMaterial(): void {
    const name = this.newMaterialName().trim();
    if (!name) return;

    this.learningService.addItem(this.activeSubjectId(), 'materials', {
      name,
      date: new Date().toISOString().split('T')[0],
      downloadUrl: '#'
    });

    this.newMaterialName.set('');
    this.showAddMaterial.set(false);
    this.toast.show('تم إضافة المستند الدراسي بنجاح! 📄', 'success');
  }

  deleteMaterial(itemId: string): void {
    this.learningService.deleteItem(this.activeSubjectId(), 'materials', itemId);
    this.toast.show('تم حذف المستند الدراسي 🗑️', 'info');
  }

  addNewEvent(): void {
    const title = this.newEventTitle().trim();
    const date = this.newEventDate().trim();
    const time = this.newEventTime().trim();
    if (!title || !date || !time) return;

    this.learningService.addScheduleEvent({
      title,
      date,
      time,
      type: this.newEventType(),
      subjectId: this.activeSubjectId()
    });

    this.newEventTitle.set('');
    this.newEventDate.set('');
    this.newEventTime.set('');
    this.showAddEvent.set(false);
    this.toast.show('تم إضافة الحدث إلى الجدول الزمني 📅', 'success');
  }

  deleteEvent(id: string): void {
    this.learningService.deleteScheduleEvent(id);
    this.toast.show('تم إزالة الحدث الدراسي 🗑️', 'info');
  }

  toggleAssignment(id: string): void {
    this.learningService.toggleAssignmentStatus(this.activeSubjectId(), id);
    this.toast.show('تم تحديث حالة الواجب وتحديث نسبة الإنجاز ⚡', 'success');
  }

  addNewAssignment(): void {
    const name = this.newAssignmentName().trim();
    const deadline = this.newAssignmentDeadline().trim();
    if (!name || !deadline) return;

    this.learningService.addItem(this.activeSubjectId(), 'assignments', {
      name,
      deadline,
      status: 'pending'
    });

    this.newAssignmentName.set('');
    this.newAssignmentDeadline.set('');
    this.showAddAssignment.set(false);
    this.toast.show('تم إضافة التكليف المطلوب بنجاح 📝', 'success');
  }

  async askAiTutor(): Promise<void> {
    const query = this.aiQuery().trim();
    if (!query) return;

    const apiKey = localStorage.getItem('Si-Neuro-chat-apiKey') || '';
    if (!apiKey) {
      this.toast.show('يرجى إدخال مفتاح Gemini API في لوحة الإعدادات لاستخدام المساعد الذكي.', 'warning');
      return;
    }

    this.isGeneratingAi.set(true);
    const subj = this.currentSubject();

    try {
      const prompt = `أنت المساعد الدراسي الأكاديمي الذكي المخصص لطلاب الجامعات.
المادة الحالية: ${subj.name} (${subj.code}) بإشراف ${subj.instructor}.
سؤال الطالب: "${query}".
اجب بإجابة أكاديمية واضحة، مبسطة، ومنظمة بنقاط باللغة العربية مع تلميحات أو أمثلة عند الحاجة.`;

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'تعذر الحصول على إجابة.';
      this.aiAnswer.set(reply);
    } catch (e) {
      console.error('AI Tutor error:', e);
      this.toast.show('تعذر الاتصال بالمساعد الدراسي الذكي، تحقق من مفتاح API.', 'error');
    } finally {
      this.isGeneratingAi.set(false);
    }
  }

  generateStudySummary(): void {
    const subj = this.currentSubject();
    this.aiQuery.set(`لخص لي أهم المفاهيم والمحاور الأساسية المطلوبة لمراجعة مادة ${subj.name} (${subj.code}).`);
    this.showAiTutorModal.set(true);
    this.askAiTutor();
  }
}
