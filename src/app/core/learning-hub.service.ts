import { Injectable, signal, computed } from '@angular/core';

export type SubjectId = 'algo' | 'arch' | 'network' | 'sec';
export type SectionType = 'materials' | 'recordings' | 'assignments' | 'quizzes';

export interface SubjectData {
  id: SubjectId;
  name: string;
  code: string;
  instructor: string;
  materials: any[];
  recordings: any[];
  assignments: any[];
  quizzes: any[];
}

export interface ScheduleEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  type: 'lecture' | 'section' | 'quiz' | 'assignment';
  subjectId: SubjectId;
}

@Injectable({
  providedIn: 'root'
})
export class LearningHubService {
  private readonly STORAGE_KEY = 'Si-Neuro-learning-hub-v5';

  subjects = signal<Record<SubjectId, SubjectData>>({
    algo: {
      id: 'algo',
      name: 'الخوارزميات وهياكل البيانات',
      code: 'CS201',
      instructor: 'د. عمر الخطيب',
      materials: [
        { id: 'm1', name: 'مقدمة في هياكل البيانات الخطية.pdf', date: '2026-05-10', downloadUrl: '#' },
        { id: 'm2', name: 'خوارزميات البحث والترتيب المتقدمة.pdf', date: '2026-05-15', downloadUrl: '#' }
      ],
      recordings: [
        { id: 'r1', name: 'المحاضرة 1: تعقيد الوقت والمساحة (Big O)', date: '2026-05-11', duration: '1h 15m', videoUrl: '#' }
      ],
      assignments: [
        { id: 'a1', name: 'الواجب الأول: هياكل البيانات المخصصة', deadline: '2026-06-01', status: 'pending' }
      ],
      quizzes: [
        { id: 'q1', name: 'الاختبار القصير الأول: الأشجار والرسوم البيانية', date: '2026-06-05', completed: false }
      ]
    },
    arch: {
      id: 'arch',
      name: 'معمارية وبناء الحاسب',
      code: 'CS202',
      instructor: 'د. يوسف النجار',
      materials: [
        { id: 'm3', name: 'بنية المعالجات الميكروية.pdf', date: '2026-05-12', downloadUrl: '#' }
      ],
      recordings: [],
      assignments: [
        { id: 'a2', name: 'الواجب الثاني: تصميم وحدة الحساب والمنطق ALU', deadline: '2026-05-30', status: 'submitted' }
      ],
      quizzes: []
    },
    network: {
      id: 'network',
      name: 'شبكات الحاسوب والاتصالات',
      code: 'CS301',
      instructor: 'د. ليلى حسن',
      materials: [],
      recordings: [],
      assignments: [],
      quizzes: []
    },
    sec: {
      id: 'sec',
      name: 'أمن المعلومات والشبكات',
      code: 'CS401',
      instructor: 'د. أحمد صقر',
      materials: [],
      recordings: [],
      assignments: [],
      quizzes: []
    }
  });

  schedule = signal<ScheduleEvent[]>([
    { id: 'e1', title: 'محاضرة الخوارزميات المباشرة', date: '2026-05-24', time: '10:00 AM', type: 'lecture', subjectId: 'algo' },
    { id: 'e2', title: 'تسليم واجب معمارية الحاسب', date: '2026-05-30', time: '11:59 PM', type: 'assignment', subjectId: 'arch' }
  ]);

  searchQuery = signal<string>('');
  selectedGroup = signal<string>('A');

  constructor() {
    this.loadState();
  }

  private loadState(): void {
    const dataStr = localStorage.getItem(this.STORAGE_KEY);
    if (dataStr) {
      try {
        const parsed = JSON.parse(dataStr);
        if (parsed.subjects) this.subjects.set(parsed.subjects);
        if (parsed.schedule) this.schedule.set(parsed.schedule);
        if (parsed.selectedGroup) this.selectedGroup.set(parsed.selectedGroup);
        return;
      } catch (e) {
        console.error("LearningHub Load Error", e);
      }
    }
    this.saveState();
  }

  saveState(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
      subjects: this.subjects(),
      schedule: this.schedule(),
      selectedGroup: this.selectedGroup()
    }));
  }

  // CRUD Items
  addItem(subjectId: SubjectId, section: SectionType, item: any): void {
    const newItem = {
      ...item,
      id: `item_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString()
    };

    this.subjects.update(subjs => {
      const target = { ...subjs[subjectId] };
      target[section] = [...target[section], newItem];
      return { ...subjs, [subjectId]: target };
    });
    this.saveState();
  }

  deleteItem(subjectId: SubjectId, section: SectionType, itemId: string): void {
    this.subjects.update(subjs => {
      const target = { ...subjs[subjectId] };
      target[section] = target[section].filter((i: any) => i.id !== itemId);
      return { ...subjs, [subjectId]: target };
    });
    this.saveState();
  }

  toggleAssignmentStatus(subjectId: SubjectId, itemId: string): void {
    this.subjects.update(subjs => {
      const target = { ...subjs[subjectId] };
      target.assignments = target.assignments.map((a: any) => {
        if (a.id !== itemId) return a;
        const nextStatus = a.status === 'pending' ? 'submitted' : 'pending';
        return { ...a, status: nextStatus };
      });
      return { ...subjs, [subjectId]: target };
    });
    this.saveState();
  }

  // Schedule Events
  addScheduleEvent(event: Omit<ScheduleEvent, 'id'>): void {
    const newEvent: ScheduleEvent = {
      ...event,
      id: `event_${Math.random().toString(36).substr(2, 9)}`
    };
    this.schedule.update(list => [...list, newEvent]);
    this.saveState();
  }

  deleteScheduleEvent(id: string): void {
    this.schedule.update(list => list.filter(e => e.id !== id));
    this.saveState();
  }

  // Progress metrics computed
  getProgress(subjectId: SubjectId): number {
    const subj = this.subjects()[subjectId];
    if (!subj) return 0;
    const totalAssignments = subj.assignments.length;
    const completedAssignments = subj.assignments.filter((a: any) => a.status === 'submitted').length;
    const totalQuizzes = subj.quizzes.length;
    const completedQuizzes = subj.quizzes.filter((q: any) => q.completed).length;

    const total = totalAssignments + totalQuizzes;
    if (total === 0) return 0;
    return Math.round(((completedAssignments + completedQuizzes) / total) * 100);
  }

  getGlobalProgress(): number {
    const sIds: SubjectId[] = ['algo', 'arch', 'network', 'sec'];
    const total = sIds.reduce((acc, id) => acc + this.getProgress(id), 0);
    return Math.round(total / sIds.length);
  }
}
