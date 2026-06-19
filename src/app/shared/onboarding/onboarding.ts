import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideDynamicIcon } from '@lucide/angular';

export interface OnboardingStep {
  icon: string;
  title: string;
  description: string;
  color: string;
  bg: string;
  accent: string;
}

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, LucideDynamicIcon],
  templateUrl: './onboarding.html',
  styleUrls: ['./onboarding.scss']
})
export class OnboardingComponent implements OnInit {
  isOpen = signal<boolean>(false);
  currentStep = signal<number>(0);

  steps: OnboardingStep[] = [
    {
      icon: 'sparkles',
      title: 'مرحباً بك في Si-NeuroAI',
      description: 'لقد تزامنت للتو مع نظام التفاعل الذكي المتكامل لعقدتك. دعنا نساعدك في ضبط إعدادات العقدة.',
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
      accent: 'border-indigo-500/20'
    },
    {
      icon: 'wallet',
      title: 'إدارة أرصدتك المالية',
      description: 'محفظتك الرقمية تدير كافة الأرصدة والعملات المشفرة. استخدمها لاقتناء الأدوات الفائقة أو التبرع لعقد التطوير.',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      accent: 'border-emerald-500/20'
    },
    {
      icon: 'shopping-bag',
      title: 'المتجر التكنولوجي السيادي',
      description: 'اكتشف وتداول الأدوات البرمجية الذكية، والمتحكمات الدقيقة، والملحقات التقنية عبر بروتوكولات البيع المشفرة.',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      accent: 'border-amber-500/20'
    },
    {
      icon: 'message-square',
      title: 'محادثات ذكية فورية',
      description: 'تواصل مباشرة مع خوادم الذكاء الاصطناعي السيادية. ارفع الملفات، سجل الصوت، واكتسب ردوداً عصبيّة ذكية.',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      accent: 'border-blue-500/20'
    }
  ];

  ngOnInit(): void {
    const hasSeen = localStorage.getItem('hasSeenOnboarding-v1');
    if (!hasSeen) {
      this.isOpen.set(true);
    }
  }

  next(): void {
    if (this.currentStep() < this.steps.length - 1) {
      this.currentStep.update(i => i + 1);
    } else {
      this.complete();
    }
  }

  prev(): void {
    if (this.currentStep() > 0) {
      this.currentStep.update(i => i - 1);
    }
  }

  complete(): void {
    localStorage.setItem('hasSeenOnboarding-v1', 'true');
    this.isOpen.set(false);
  }
}
