import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule, ArrowRight, Brain, Volume2, CheckCircle2, AlertTriangle, Lightbulb } from 'lucide-angular';
import { STORIES, Story, StoryError, ErrorType } from './error-detective.model';

@Component({
  selector: 'app-error-detective',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="min-h-screen bg-slate-950 text-white p-6 font-sans" dir="rtl">
      <!-- Header -->
      <div class="max-w-4xl mx-auto flex items-center justify-between mb-8 border-b border-white/10 pb-4">
        <button (click)="goBack()" class="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl text-sm font-bold transition-all">
          <lucide-icon [img]="ArrowRight" class="w-4 h-4"></lucide-icon> العودة
        </button>
        <h1 class="text-xl font-black flex items-center gap-2 text-indigo-400">
          <lucide-icon [img]="Brain" class="w-6 h-6"></lucide-icon> مكتشف الأخطاء (Error Detective)
        </h1>
      </div>

      <div class="max-w-3xl mx-auto bg-slate-900 rounded-3xl p-8 border border-white/5 shadow-2xl">
        <!-- Story Display -->
        <div class="space-y-4">
          <h2 class="text-2xl font-black mb-6">{{ currentStory().title }}</h2>
          <div *ngFor="let sentence of currentStory().content; let i = index" 
               (click)="checkSentence(i)"
               [class]="'p-4 rounded-xl cursor-pointer transition-all ' + (selectedSentenceIndex() === i ? 'bg-indigo-600/30 border border-indigo-500' : 'bg-black/20 hover:bg-black/40')">
            <p class="text-lg leading-relaxed">{{ sentence }}</p>
          </div>
        </div>

        <!-- Feedback Area -->
        <div *ngIf="activeError" class="mt-8 p-6 bg-amber-500/10 border border-amber-500/30 rounded-2xl animate-in slide-in-from-bottom-2">
          <div class="flex items-center gap-3 text-amber-400 mb-2 font-bold">
            <lucide-icon [img]="AlertTriangle" class="w-5 h-5"></lucide-icon> تم اكتشاف خطأ!
          </div>
          <p class="text-white mb-2 font-medium">التصحيح: {{ activeError.correction }}</p>
          <div class="bg-black/30 p-4 rounded-xl text-sm text-slate-300">
             <span class="font-bold text-amber-200">لماذا؟</span> {{ activeError.explanation }}
          </div>
        </div>
      </div>
    </div>
  `
})
export class ErrorDetectiveComponent {
  private router = inject(Router);
  currentStory = signal<Story>(STORIES[0]);
  selectedSentenceIndex = signal<number | null>(null);
  activeError: StoryError | null = null;

  ArrowRight = ArrowRight; Brain = Brain; Volume2 = Volume2; AlertTriangle = AlertTriangle; Lightbulb = Lightbulb;

  goBack() { this.router.navigate(['/arcade']); }

  checkSentence(index: number) {
    this.selectedSentenceIndex.set(index);
    const error = this.currentStory().errors.find(e => e.sentenceIndex === index);
    this.activeError = error || null;
    
    if (error) {
        this.speakExplanation(error.explanation);
    }
  }

  speakExplanation(text: string) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ar-SA';
      window.speechSynthesis.speak(utterance);
    }
  }
}
