import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { 
  LucideAngularModule, Building2, Sparkles, ShieldCheck, Zap, Users, Award, Globe, 
  Target, Compass, HeartHandshake, Send, CheckCircle, ChevronDown, ChevronUp, 
  Phone, Mail, MapPin, Calendar, Code2, Download, Layers, Cpu, Laptop, 
  MessageSquare, Star, ArrowRight, FileText, HelpCircle, Check, ExternalLink, 
  Briefcase, Clock, Rocket, ThumbsUp
} from 'lucide-angular';

export interface Milestone {
  year: string;
  title: string;
  description: string;
  badge: string;
  icon: any;
}

export interface TeamMember {
  name: string;
  role: string;
  bio: string;
  avatar: string;
  specialty: string[];
  social: { linkedin?: string; github?: string; twitter?: string };
}

export interface ServiceItem {
  id: string;
  title: string;
  description: string;
  icon: any;
  features: string[];
  gradient: string;
  stats: string;
}

export interface FaqItem {
  question: string;
  answer: string;
  isOpen?: boolean;
}

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss']
})
export class AboutComponent {
  // Lucide Icons Exposing for template
  readonly Building2 = Building2;
  readonly Sparkles = Sparkles;
  readonly ShieldCheck = ShieldCheck;
  readonly Zap = Zap;
  readonly Users = Users;
  readonly Award = Award;
  readonly Globe = Globe;
  readonly Target = Target;
  readonly Compass = Compass;
  readonly HeartHandshake = HeartHandshake;
  readonly Send = Send;
  readonly CheckCircle = CheckCircle;
  readonly ChevronDown = ChevronDown;
  readonly ChevronUp = ChevronUp;
  readonly Phone = Phone;
  readonly Mail = Mail;
  readonly MapPin = MapPin;
  readonly Calendar = Calendar;
  readonly Code2 = Code2;
  readonly Download = Download;
  readonly Layers = Layers;
  readonly Cpu = Cpu;
  readonly Laptop = Laptop;
  readonly MessageSquare = MessageSquare;
  readonly Star = Star;
  readonly ArrowRight = ArrowRight;
  readonly FileText = FileText;
  readonly HelpCircle = HelpCircle;
  readonly Check = Check;
  readonly ExternalLink = ExternalLink;
  readonly Briefcase = Briefcase;
  readonly Clock = Clock;
  readonly Rocket = Rocket;
  readonly ThumbsUp = ThumbsUp;

  // Active Tab
  activeTab = signal<'overview' | 'mission' | 'services' | 'timeline' | 'team' | 'contact' | 'faq'>('overview');

  // Contact Form Signals
  contactName = signal<string>('');
  contactEmail = signal<string>('');
  contactPhone = signal<string>('');
  contactCategory = signal<string>('general');
  contactMessage = signal<string>('');
  isSubmitting = signal<boolean>(false);
  submitSuccess = signal<boolean>(false);

  // Key Achievements / Metrics
  metrics = [
    { label: 'مستخدم نشط يومياً', value: '+50,000', icon: Users, color: 'from-blue-500 to-indigo-500', desc: 'في مختلف المنصات والأنظمة' },
    { label: 'نسبة الاعتمادية والجاهزية', value: '99.99%', icon: ShieldCheck, color: 'from-emerald-500 to-teal-500', desc: 'بنية سحابية عالية الاستقرار' },
    { label: 'تطبيق ونظام برجمي مخصص', value: '+35', icon: Layers, color: 'from-purple-500 to-pink-500', desc: 'حلول متكاملة للتجارة والإنتاجية' },
    { label: 'عملية معالجة ذكية يومياً', value: '+150K', icon: Cpu, color: 'from-amber-500 to-orange-500', desc: 'بتقنيات الذكاء الاصطناعي' }
  ];

  // Core Values
  values = [
    { 
      title: 'الابتكار والريادة التقنية', 
      desc: 'نطور أنظمة فائقة السرعة والأداء باستخدام أحدث الأطر والذكاء الاصطناعي الذاتي.', 
      icon: Sparkles,
      color: 'border-indigo-500/40 text-indigo-400 bg-indigo-500/10'
    },
    { 
      title: 'الأمان والحماية المطلقة', 
      desc: 'تشفير الميز والبيانات على أعلى المستويات لحماية الخصوصية والمعلومات المؤسسية.', 
      icon: ShieldCheck,
      color: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
    },
    { 
      title: 'السرعة والاعتمادية العالية', 
      desc: 'بنية تحتية موثوقة تضمن تشغيل المنصات والمتاجر بدون انقطاع على مدار الساعة.', 
      icon: Zap,
      color: 'border-amber-500/40 text-amber-400 bg-amber-500/10'
    },
    { 
      title: 'تركيز شامل على تجربة العميل', 
      desc: 'تصميم واجهات سلسة وممتعة تبهر الزوار وتوفر أسهل تجربة استخدام.', 
      icon: HeartHandshake,
      color: 'border-rose-500/40 text-rose-400 bg-rose-500/10'
    }
  ];

  // Services Showcase
  services: ServiceItem[] = [
    {
      id: 'cloud-apps',
      title: 'تطوير المنصات والأنظمة السحابية',
      description: 'بناء تطبيقات ويب فائقة السرعة، أنظمة إدارة المؤسسات والشركات، وتطبيقات التجارة الإلكترونية المتقدمة.',
      icon: Laptop,
      features: ['واجهات تفاعلية جبارة', 'دعم الأوفلاين والمزامنة اللحظية', 'لوحات تحكم مركزية متكاملة'],
      gradient: 'from-blue-600/20 via-indigo-600/10 to-transparent border-blue-500/30',
      stats: '+20 نظام مفعل'
    },
    {
      id: 'ai-solutions',
      title: 'حلول الذكاء الاصطناعي والتحليلات',
      description: 'دمج نماذج الذكاء الاصطناعي التوليدي والتحليل الذكي للبيانات لبناء مساعدين أذكياء ومحركات صانعي المحتوى.',
      icon: Cpu,
      features: ['صانع الأقسام الذكي (AI Builder)', 'معالجة النصوص والرؤية الحاسوبية', 'مساعدات تعليمية وبرمجية'],
      gradient: 'from-purple-600/20 via-pink-600/10 to-transparent border-purple-500/30',
      stats: '+150K معالجة/يوم'
    },
    {
      id: 'interactive-games',
      title: 'الألعاب والحلول التفاعلية (Arcade Hub)',
      description: 'تطوير منصة ألعاب تعليمية وترفيهية متكاملة تدعم اللعب الجماعي المحلي وغرف P2P والمود الاحترافي.',
      icon: Rocket,
      features: ['أنظمة لعب جماعي 4-6 لاعبين', 'ربط فوري بالحسابات والمجموعات', 'لعب محلي وأونلاين للمشتركين'],
      gradient: 'from-amber-600/20 via-orange-600/10 to-transparent border-amber-500/30',
      stats: '+12 لعبة تفاعلية'
    },
    {
      id: 'halaltube-media',
      title: 'منصة halaltube للمحتوى الآمن',
      description: 'بيئة بث وسائط آمنة ونقية موجهة للعائلات وصناع المحتوى الهادف مع أدوات صناعة وتحليل متطورة.',
      icon: Globe,
      features: ['فلترة وتصفية محتوى ذكية', 'بث مقاطع قصيرة Shorts', 'استوديو منشئي المحتوى الشامل'],
      gradient: 'from-emerald-600/20 via-teal-600/10 to-transparent border-emerald-500/30',
      stats: '+10K فيديو مفلتر'
    }
  ];

  // Timeline / Milestones
  milestones: Milestone[] = [
    {
      year: '2022',
      title: 'التأسيس وانطلاق النواة الأولى',
      description: 'تأسيس مجموعة عرفه للتكنولوجيا وإطلاق النواة الأولى لمنظومة Super لتطوير الحلول البرمجية.',
      badge: 'المركزي',
      icon: Building2
    },
    {
      year: '2023',
      title: 'التوسع في حلول التجارة والصناعة',
      description: 'إطلاق متجر أم القرى الإلكتروني ومخبز عباد الرحمن ونظم إدارة المبيعات والمصانع.',
      badge: 'التجارة الرقمية',
      icon: Briefcase
    },
    {
      year: '2024',
      title: 'تدشين منصة halaltube وسلسلة الألعاب',
      description: 'تدشين منصة halaltube للمحتوى الهادف وإطلاق مركز Si-Neuro Arcade للألعاب التفاعلية.',
      badge: 'الوسائط والألعاب',
      icon: Rocket
    },
    {
      year: '2025',
      title: 'دمج الذكاء الاصطناعي الذاتي',
      description: 'إطلاق صانع الأقسام بالذكاء الاصطناعي (AI Module Builder) ومساعد البرمجة OpenCode والمحررات الحديثة.',
      badge: 'الذكاء الاصطناعي',
      icon: Cpu
    },
    {
      year: '2026',
      title: 'الوصول إلى 50,000+ مستخدم والتوسع الدولي',
      description: 'تحديث البنية التحتية الشاملة وتجاوز حجز 50 ألف مستخدم نشط مع تقديم خطط التوسع المؤسسي.',
      badge: 'التوسع العالمي',
      icon: Globe
    }
  ];

  // Team Members
  team: TeamMember[] = [
    {
      name: 'المهندس محمود عرفه',
      role: 'المؤسس والرئيس التنفيذي (Founder & CEO)',
      bio: 'قائد الرؤية التقنية والاستراتيجية لمجموعة عرفه ومنصة Super، خبير في بناء الأنظمة السحابية والذكاء الاصطناعي.',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      specialty: ['قيادة وتخطيط النظم', 'الذكاء الاصطناعي', 'بنية البيانات السحابية'],
      social: { linkedin: '#', github: '#', twitter: '#' }
    },
    {
      name: 'فريق تطوير الهندسة التقنية',
      role: 'Senior Software Engineers & Architects',
      bio: 'نخبة من المهندسين المتخصصين في تطوير الأطر البرمجية المتقدمة مثل Angular وNode.js وحلول P2P.',
      avatar: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=400&q=80',
      specialty: ['تطوير الويب الفائق', 'أنظمة P2P والمزامنة', 'الأمان والتشفير'],
      social: { github: '#' }
    },
    {
      name: 'فريق واجهات وتجربة المستخدم',
      role: 'UI/UX & Product Designers',
      bio: 'مصممون محترفون يضمنون تقديم تجربة مستخدم استثنائية (WOW Experience) مع أرقى التصاميم التفاعلية.',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
      specialty: ['Glassmorphism UI', 'التصميم التفاعلي RTL', 'أنظمة التصميم (Design Systems)'],
      social: { linkedin: '#' }
    }
  ];

  // FAQs
  faqs: FaqItem[] = [
    {
      question: 'ما هي الأنشطة والخدمات الأساسية التي تقدمها شركة Super؟',
      answer: 'نحن شركة تقنية متخصصة في تطوير الأنظمة السحابية، حلول الذكاء الاصطناعي، المتاجر الإلكترونية، المنصات التعليمية والإعلامية (مثل halaltube)، بالإضافة إلى الألعاب والتطبيقات التفاعلية للمؤسسات والأفراد.',
      isOpen: true
    },
    {
      question: 'كيف يمكن للشركات والمحلات الاستفادة من حلولنا البرمجية؟',
      answer: 'نوفر حلولاً مخصصة تبدأ من المتاجر الإلكترونية المتكاملة إلى أنظمة المبيعات والمخازن، بالإضافة إلى إمكانية بناء أقسام ووظائف برمجية مخصصة بالذكاء الاصطناعي تناسب احتياجات نشاطك المباشر.',
      isOpen: false
    },
    {
      question: 'هل تضمن الشركة أمان البيانات واستمرارية الخدمة؟',
      answer: 'نعم بالكامل، نحن نعتمد بنية سحابية موزعة مع تشفير كامل للبيانات ومستويات جاهزية تفوق 99.99%، مع توفير نسخ احتياطي تلقائي ونظام أوفلاين لحفظ العمل عند انقطاع الاتصال.',
      isOpen: false
    },
    {
      question: 'كيف يمكنني التواصل مع فريق الإدارة أو طلب استشارة تقنية؟',
      answer: 'يمكنك التواصل مباشرة من خلال نموذج "تواصل معنا" المتاح في هذه الصفحة، أو الاتصال بالهاتف المباشر أو البريد الإلكتروني الخاص بنا وسيصلك رد من أحد مهندسينا خلال وقت قياسي.',
      isOpen: false
    }
  ];

  toggleFaq(index: number): void {
    this.faqs[index].isOpen = !this.faqs[index].isOpen;
  }

  // Handle Contact Form Submit
  submitContact(): void {
    if (!this.contactName().trim() || !this.contactMessage().trim()) {
      return;
    }

    this.isSubmitting.set(true);

    setTimeout(() => {
      // Save locally as inquiry entry
      const existing = JSON.parse(localStorage.getItem('company_inquiries') || '[]');
      existing.push({
        id: Date.now(),
        name: this.contactName(),
        email: this.contactEmail(),
        phone: this.contactPhone(),
        category: this.contactCategory(),
        message: this.contactMessage(),
        date: new Date().toISOString()
      });
      localStorage.setItem('company_inquiries', JSON.stringify(existing));

      this.isSubmitting.set(false);
      this.submitSuccess.set(true);

      // Reset Form after 4s
      setTimeout(() => {
        this.contactName.set('');
        this.contactEmail.set('');
        this.contactPhone.set('');
        this.contactMessage.set('');
        this.submitSuccess.set(false);
      }, 4000);
    }, 800);
  }

  // Download Profile PDF function placeholder
  downloadCompanyProfile(): void {
    const profileContent = `
==============================================
مجموعة عرفه للتكنولوجيا والصناعة - شركة Super
==============================================
رؤيتنا: تقديم أرقى وأسرع الحلول البرمجية والنظم السحابية.
خدماتنا:
1. تطوير المنصات السحابية والتطبيقات.
2. حلول الذكاء الاصطناعي والتوليدي.
3. المتاجر الإلكترونية وأنظمة إدارة المبيعات.
4. الألعاب والتطبيقات التفاعلية.

التواصل المباشر: info@super-platform.com
    `;

    const blob = new Blob([profileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Super_Company_Profile.txt';
    a.click();
    URL.revokeObjectURL(url);
  }
}
