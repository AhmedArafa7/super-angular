import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { LucideAngularModule } from 'lucide-angular';
import { LauncherService, WebProject, AppFramework } from '../../core/launcher.service';
import { WalletService } from '../../core/wallet.service';

export type LaunchEngine = 'stackblitz' | 'codesandbox' | 'gh-pages' | 'githack' | 'direct';

export interface GithubRepoMetadata {
  owner: string;
  repo: string;
  title: string;
  description: string;
  avatarUrl: string;
  language: string;
  stars?: number;
  homepage?: string;
}

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

  // Instant GitHub Launcher states
  githubInputUrl = signal<string>('');
  isFetchingGithub = signal<boolean>(false);
  githubMetadata = signal<GithubRepoMetadata | null>(null);
  selectedEngine = signal<LaunchEngine>('codesandbox');
  isDevCodeMode = signal<boolean>(false); // False by default = Regular user Live App Preview mode!
  customTitle = signal<string>('');
  customDescription = signal<string>('');

  // Form Inputs for standard proposal modal
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

  // Engine options
  engines: { id: LaunchEngine; label: string; desc: string; icon: string }[] = [
    { id: 'stackblitz', label: 'StackBlitz App', desc: 'تشغيل المعاينة المباشرة للتطبيق', icon: 'zap' },
    { id: 'codesandbox', label: 'CodeSandbox App', desc: 'معاينة مباشرة عبر حاويات CodeSandbox', icon: 'box' },
    { id: 'gh-pages', label: 'GitHub Pages', desc: 'تشغيل الموقع المستضاف مباشرة', icon: 'globe' },
    { id: 'githack', label: 'GitHack RAW HTML', desc: 'معاينة ملفات HTML المباشرة', icon: 'code-2' },
    { id: 'direct', label: 'رابط مباشر (Direct)', desc: 'فتح الرابط الأصلي مباشرة', icon: 'link' }
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

  // Safe resource url mapping computed signal to prevent iframe continuous re-rendering / flickering
  safeUrl = computed<SafeResourceUrl | null>(() => {
    const active = this.activeProject();
    if (!active?.url) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(active.url);
  });

  // Monitor URL input and auto-detect GitHub Repos
  async onGithubUrlInput(url: string): Promise<void> {
    const trimmed = url.trim();
    this.githubInputUrl.set(trimmed);

    if (!trimmed) {
      this.githubMetadata.set(null);
      this.customTitle.set('');
      this.customDescription.set('');
      return;
    }

    // Match patterns like github.com/owner/repo
    const ghMatch = trimmed.match(/github\.com\/([^\/]+)\/([^\/#?]+)/i);

    if (ghMatch) {
      const owner = ghMatch[1];
      const repo = ghMatch[2].replace(/\.git$/, '');

      this.isFetchingGithub.set(true);

      try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
        if (response.ok) {
          const data = await response.json();
          const meta: GithubRepoMetadata = {
            owner: data.owner?.login || owner,
            repo: data.name || repo,
            title: data.name ? data.name.replace(/[-_]/g, ' ') : repo,
            description: data.description || `مشروع GitHub بواسطة ${owner}`,
            avatarUrl: data.owner?.avatar_url || `https://github.com/${owner}.png`,
            language: data.language || 'JavaScript',
            stars: data.stargazers_count,
            homepage: data.homepage
          };
          this.githubMetadata.set(meta);
          this.customTitle.set(meta.title);
          this.customDescription.set(meta.description);

          // Auto select engine if homepage or gh-pages exists
          if (data.homepage && data.homepage.includes('github.io')) {
            this.selectedEngine.set('gh-pages');
          } else {
            this.selectedEngine.set('codesandbox');
          }
        } else {
          // Graceful fallback if API limit reached or repo private
          this.setDefaultGithubMeta(owner, repo);
        }
      } catch (err) {
        console.warn('GitHub API fetch failed, using fallback:', err);
        this.setDefaultGithubMeta(owner, repo);
      } finally {
        this.isFetchingGithub.set(false);
      }
    } else {
      // Non-GitHub URL
      this.githubMetadata.set(null);
      this.selectedEngine.set('direct');
      if (!this.customTitle()) {
        try {
          const urlObj = new URL(trimmed);
          this.customTitle.set(urlObj.hostname);
        } catch {
          this.customTitle.set('تطبيق خارجي');
        }
      }
    }
  }

  private setDefaultGithubMeta(owner: string, repo: string): void {
    const meta: GithubRepoMetadata = {
      owner,
      repo,
      title: repo.replace(/[-_]/g, ' '),
      description: `مشروع GitHub: ${owner}/${repo}`,
      avatarUrl: `https://github.com/${owner}.png`,
      language: 'JavaScript'
    };
    this.githubMetadata.set(meta);
    this.customTitle.set(meta.title);
    this.customDescription.set(meta.description);
    this.selectedEngine.set('codesandbox');
  }

  toggleDevCodeMode(): void {
    const currentMode = this.isDevCodeMode();
    this.isDevCodeMode.set(!currentMode);
    
    // Refresh active project URL dynamically
    const current = this.activeProject();
    if (current) {
      const newUrl = this.getCalculatedRunUrl();
      if (newUrl) {
        this.activeProject.set({
          ...current,
          url: newUrl
        });
      }
    }
  }

  // Calculate final iframe URL based on engine and mode
  getCalculatedRunUrl(): string {
    const meta = this.githubMetadata();
    const rawUrl = this.githubInputUrl().trim();
    const engine = this.selectedEngine();
    const devMode = this.isDevCodeMode();

    if (!rawUrl) return '';

    // Ensure protocol
    let formattedUrl = rawUrl;
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }

    if (meta) {
      const { owner, repo } = meta;
      switch (engine) {
        case 'stackblitz':
          const sbView = devMode ? 'both' : 'preview';
          const sbParams = devMode ? '' : '&hideExplorer=1&hideNavigation=1';
          return `https://stackblitz.com/github/${owner}/${repo}?embed=1&file=README.md&hideNavigation=1&theme=dark&view=${sbView}${sbParams}`;
        case 'codesandbox':
          const csView = devMode ? 'editor' : 'preview';
          return `https://codesandbox.io/embed/github/${owner}/${repo}?view=${csView}&hidedevtools=1`;
        case 'gh-pages':
          return meta.homepage && meta.homepage.startsWith('http') 
            ? meta.homepage 
            : `https://${owner}.github.io/${repo}/`;
        case 'githack':
          return `https://raw.githack.com/${owner}/${repo}/main/index.html`;
        case 'direct':
        default:
          return formattedUrl;
      }
    }

    // Direct url fallback
    if (engine === 'stackblitz' && formattedUrl.includes('github.com')) {
      const ghMatch = formattedUrl.match(/github\.com\/([^\/]+)\/([^\/#?]+)/i);
      if (ghMatch) {
        const sbView = devMode ? 'both' : 'preview';
        const sbParams = devMode ? '' : '&hideExplorer=1&hideNavigation=1';
        return `https://stackblitz.com/github/${ghMatch[1]}/${ghMatch[2].replace(/\.git$/, '')}?embed=1&file=README.md&hideNavigation=1&theme=dark&view=${sbView}${sbParams}`;
      }
    }

    return formattedUrl;
  }

  // Run instantly inside iframe
  runGithubInstantly(): void {
    const runUrl = this.getCalculatedRunUrl();
    if (!runUrl) {
      alert('يرجى إدخال رابط صحيح أولاً.');
      return;
    }

    const meta = this.githubMetadata();
    const title = this.customTitle().trim() || meta?.title || 'تطبيق GitHub';
    const desc = this.customDescription().trim() || meta?.description || 'مشروع تم تشغيله فورياً عبر المنصة';
    const thumb = meta?.avatarUrl || 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?q=80&w=600&auto=format&fit=crop';
    const framework = this.mapLanguageToFramework(meta?.language);

    const tempProject: WebProject = {
      id: `gh_inst_${Date.now()}`,
      title,
      description: desc,
      url: runUrl,
      framework,
      access: 'free',
      price: 0,
      thumbnail: thumb,
      authorId: 'me',
      authorName: meta ? meta.owner : 'GitHub User',
      status: 'approved',
      createdAt: new Date().toISOString()
    };

    this.activeProject.set(tempProject);
  }

  // Save to permanent Launcher catalog
  async saveGithubApp(): Promise<void> {
    const runUrl = this.getCalculatedRunUrl();
    if (!runUrl) {
      alert('يرجى إدخال رابط صحيح لتتمكن من الحفظ.');
      return;
    }

    const meta = this.githubMetadata();
    const title = this.customTitle().trim() || meta?.title || 'تطبيق GitHub';
    const desc = this.customDescription().trim() || meta?.description || 'مشروع GitHub مخصص';
    const thumb = meta?.avatarUrl || 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?q=80&w=600&auto=format&fit=crop';
    const framework = this.mapLanguageToFramework(meta?.language);

    const created = await this.launcherService.submitAppRequest(
      title,
      runUrl,
      desc,
      framework,
      thumb,
      'approved'
    );

    // Reset instant form
    this.githubInputUrl.set('');
    this.githubMetadata.set(null);
    this.customTitle.set('');
    this.customDescription.set('');

    alert(`تم حفظ التطبيق "${created.title}" بنجاح في قائمة تطبيقاتك!`);
  }

  // Switch engine while viewing active iframe
  switchActiveEngine(engine: LaunchEngine): void {
    const current = this.activeProject();
    if (!current) return;

    this.selectedEngine.set(engine);
    const newUrl = this.getCalculatedRunUrl();
    if (newUrl) {
      this.activeProject.set({
        ...current,
        url: newUrl
      });
    }
  }

  private mapLanguageToFramework(lang?: string): AppFramework {
    if (!lang) return 'other';
    const l = lang.toLowerCase();
    if (l.includes('typescript') || l.includes('angular')) return 'angular';
    if (l.includes('react') || l.includes('jsx')) return 'react';
    if (l.includes('vue')) return 'vue';
    if (l.includes('html') || l.includes('css')) return 'html';
    return 'other';
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

  // Submit standard suggestion modal
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

    this.launcherService.submitAppRequest(title, url, desc, this.appFramework(), thumb, 'approved');

    // Reset fields
    this.appTitle.set('');
    this.appUrl.set('');
    this.appDescription.set('');
    this.appFramework.set('other');
    this.isFormOpen.set(false);

    alert("تم تفعيل ونشر التطبيق بنجاح في قائمة التطبيقات!");
  }

  // Helper method to open link
  openExternal(url: string): void {
    window.open(url, '_blank');
  }
}
