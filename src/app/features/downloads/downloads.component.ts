import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { StorageService, CachedAsset, AssetType } from '../../core/storage.service';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

@Component({
  selector: 'app-downloads',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideDynamicIcon],
  templateUrl: './downloads.component.html',
  styleUrls: ['./downloads.component.scss']
})
export class DownloadsComponent implements OnInit {
  storageService = inject(StorageService);

  // Active section view
  activeView = signal<'deployment' | 'storage'>('deployment');
  deferredPrompt = signal<BeforeInstallPromptEvent | null>(null);

  // Constants
  APK_DOWNLOAD_URL = "https://github.com/AhmedArafa7/Super/releases/download/mobile-latest/Si-Neuroai-latest.apk";

  // Section categories definitions
  sectionsList = [
    { id: 'quran' as AssetType, label: 'القرآن الكريم', icon: 'book-open', color: 'text-emerald-400' },
    { id: 'video' as AssetType, label: 'WeTube (فيديو)', icon: 'video', color: 'text-indigo-400' },
    { id: 'learning_asset' as AssetType, label: 'المكتبة التعليمية', icon: 'graduation-cap', color: 'text-blue-400' },
    { id: 'ai_model_data' as AssetType, label: 'النبضات العصبية (AI)', icon: 'cpu', color: 'text-rose-400' },
  ];

  deploymentOptions = computed(() => [
    {
      id: 'pwa',
      title: 'تطبيق نكسوس (PWA)',
      desc: 'ثبت نسخة الويب المتقدمة للوصول السريع من شاشتك الرئيسية مع دعم العمل أوفلاين.',
      icon: 'layers',
      status: 'active',
      badge: 'موصى به',
      badgeColor: 'border-indigo-500/30 text-indigo-400 bg-indigo-500/5',
      glowColor: 'hover:shadow-indigo-500/20',
      iconBg: 'bg-gradient-to-br from-indigo-550 to-violet-650',
      actionLabel: this.deferredPrompt() ? 'تثبيت على الجهاز' : 'تم التثبيت / غير مدعوم',
      isDownload: false
    },
    {
      id: 'android',
      title: 'تطبيق أندرويد (Native)',
      desc: 'نسخة APK مخصصة للهواتف الذكية مع دعم كامل للتنبيهات العميقة والوصول للمستشعرات الإضافية.',
      icon: 'laptop',
      status: 'active',
      badge: 'آخر إصدار تلقائي',
      badgeColor: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5',
      glowColor: 'hover:shadow-emerald-500/20',
      iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-650',
      actionLabel: 'تحميل التطبيق (APK)',
      isDownload: true,
      href: this.APK_DOWNLOAD_URL
    },
    {
      id: 'desktop',
      title: 'نسخة الحاسوب (Desktop)',
      desc: 'تطبيق EXE متكامل للحواسب الشخصية (ويندوز/ماك) يوفر أداء فائقاً ومعالجة محلية.',
      icon: 'settings',
      status: 'building',
      badge: 'تحت البناء',
      badgeColor: 'border-amber-500/30 text-amber-400 bg-amber-500/5',
      glowColor: '',
      iconBg: 'bg-gradient-to-br from-slate-700 to-slate-800',
      actionLabel: 'قيد الإعداد...',
      isDownload: false
    },
    {
      id: 'browser',
      title: 'متصفح نكسوس (Sovereign Browser)',
      desc: 'متصفح مبني على نواة نكسوس يوفر تشفيراً عصبياً وتكاملاً مباشراً مع أدوات النظام.',
      icon: 'globe',
      status: 'locked',
      badge: 'قيد التطوير',
      badgeColor: 'border-white/10 text-slate-500',
      glowColor: '',
      iconBg: 'bg-gradient-to-br from-slate-700 to-slate-800',
      actionLabel: 'قيد المزامنة',
      isDownload: false
    }
  ]);

  ngOnInit(): void {
    const handler = (e: Event) => {
      e.preventDefault();
      this.deferredPrompt.set(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
  }

  // Handle PWA installation
  installPWA(): void {
    const prompt = this.deferredPrompt();
    if (!prompt) {
      alert("التطبيق مثبت بالفعل على جهازك أو أن متصفحك الحالي لا يدعم تثبيت تطبيقات PWA.");
      return;
    }

    prompt.prompt();
    prompt.userChoice.then(({ outcome }) => {
      if (outcome === 'accepted') {
        this.deferredPrompt.set(null);
        alert("تم بدء تثبيت نكسوس على جهازك بنجاح!");
      }
    });
  }

  // Get percentage helper for progress-bar
  getPercentage(type: AssetType): number {
    const used = this.storageService.getUsedSpaceByCategory(type);
    const limit = this.storageService.categoryLimits()[type] || 100;
    return Math.min(100, Math.round((used / limit) * 100));
  }

  // Set limits trigger
  updateLimit(type: AssetType, val: string): void {
    const num = Math.max(1, Number(val));
    this.storageService.setCategoryLimit(type, num);
  }

  // Remove local cached asset
  deleteAsset(id: string): void {
    const confirmed = window.confirm("هل أنت متأكد من مسح هذا الملف من الذاكرة المحلية والقرص؟");
    if (confirmed) {
      this.storageService.removeAsset(id);
    }
  }
}
