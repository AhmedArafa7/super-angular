import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { LucideAngularModule } from 'lucide-angular';
import { LauncherService, WebProject, AppFramework } from '../../core/launcher.service';
import { WalletService } from '../../core/wallet.service';

@Component({
  selector: 'app-launcher',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './launcher.component.html',
  styleUrls: ['./launcher.component.scss']
})
export class LauncherComponent {
  launcherService = inject(LauncherService);
  walletService = inject(WalletService);
  sanitizer = inject(DomSanitizer);

  // Search and Modal states
  searchQuery = signal<string>('');
  isFormOpen = signal<boolean>(false);
  activeProject = signal<WebProject | null>(null);
  isHeadlessStream = signal<boolean>(true);

  // Form Inputs
  appTitle = signal<string>('');
  appUrl = signal<string>('');
  appDescription = signal<string>('');
  appFramework = signal<AppFramework>('other');

  // Framework Option definitions
  frameworks = [
    { id: 'react', label: 'React' },
    { id: 'nextjs', label: 'Next.js' },
    { id: 'angular', label: 'Angular' },
    { id: 'vue', label: 'Vue' },
    { id: 'html', label: 'HTML/CSS/JS' },
    { id: 'other', label: 'أخرى' }
  ];

  // Computed lists of approved apps
  filteredApps = computed(() => {
    const list = this.launcherService.apps().filter(a => a.status === 'approved');
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return list;
    return list.filter(a =>
      a.title.toLowerCase().includes(query) ||
      a.description.toLowerCase().includes(query)
    );
  });

  // Safe resource url mapping
  get safeUrl(): SafeResourceUrl {
    const active = this.activeProject();
    if (!active) return '';
    return this.sanitizer.bypassSecurityTrustResourceUrl(active.url);
  }

  // Handle launch operation with currency constraints
  launchApp(project: WebProject): void {
    if (project.access === 'paid' && project.price > 0) {
      const balance = this.walletService.balances().BKC;
      if (balance < project.price) {
        alert(`عذراً، رصيدك غير كافٍ. تحتاج إلى ${project.price} BKC لتشغيل هذا التطبيق.`);
        return;
      }

      const confirmed = window.confirm(`هذا التطبيق متميز ويتطلب استهلاك ${project.price} BKC. هل تريد الاستمرار؟`);
      if (!confirmed) return;

      const success = this.walletService.adjustFunds(project.price, 'withdrawal', 'BKC');
      if (!success) return;
    }

    this.activeProject.set(project);
  }

  // Submit suggestion
  submitProposal(): void {
    const title = this.appTitle().trim();
    const url = this.appUrl().trim();
    const desc = this.appDescription().trim();

    if (!title || !url) {
      alert("يرجى ملء جميع الحقول المطلوبة (الاسم والرابط).");
      return;
    }

    // Dynamic thumbnail using picsum
    const thumb = `https://picsum.photos/seed/${encodeURIComponent(title)}/800/450`;

    this.launcherService.submitAppRequest(title, url, desc, this.appFramework(), thumb);

    // Reset fields
    this.appTitle.set('');
    this.appUrl.set('');
    this.appDescription.set('');
    this.appFramework.set('other');
    this.isFormOpen.set(false);

    alert("تم تقديم طلبك بنجاح! سيتم مراجعته وتنشيطه من قبل الإدارة قريباً.");
  }

  // Helper method to open link
  openExternal(url: string): void {
    window.open(url, '_blank');
  }
}
