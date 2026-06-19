import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { LearningHubService, SubjectId, SectionType, ScheduleEvent } from '../../core/learning-hub.service';

@Component({
  selector: 'app-learning',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideDynamicIcon],
  templateUrl: './learning.component.html',
  styleUrls: ['./learning.component.scss']
})
export class LearningComponent {
  learningService = inject(LearningHubService);

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
  }

  deleteMaterial(itemId: string): void {
    if (confirm('هل أنت متأكد من رغبتك في حذف هذا الملف الدراسي؟')) {
      this.learningService.deleteItem(this.activeSubjectId(), 'materials', itemId);
    }
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
  }

  deleteEvent(id: string): void {
    if (confirm('هل أنت متأكد من رغبتك في إزالة هذا الحدث الدراسي؟')) {
      this.learningService.deleteScheduleEvent(id);
    }
  }

  toggleAssignment(id: string): void {
    this.learningService.toggleAssignmentStatus(this.activeSubjectId(), id);
  }
}
