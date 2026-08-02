import { Injectable, inject, signal, isDevMode } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ToastService } from './toast.service';

export type IssueCategory = 'error' | 'suggestion';

export interface ButtonIssue {
  id: string;
  element: HTMLElement;
  tagName: string;
  text: string;
  reason: string;
  englishReason: string;
  category: IssueCategory;
  severity: 'warning' | 'error' | 'info';
  selector: string;
  locationHint?: string;
}

/** Utility to generate zero-cost SVG avatar data URIs with bulletproof URI encoding */
export function getInitialAvatarSvg(name: string, bgColor: string = '#4f46e5'): string {
  let initial = 'U';
  try {
    const clean = (name || 'U').trim();
    if (clean.length > 0) {
      initial = Array.from(clean)[0]?.toUpperCase() || 'U';
    }
  } catch {
    initial = 'U';
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
    <rect width="128" height="128" rx="64" fill="${bgColor}"/>
    <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" fill="#ffffff" font-size="60" font-family="sans-serif" font-weight="bold">${initial}</text>
  </svg>`;

  try {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  } catch {
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" fill="${bgColor}"/><text x="50%" y="50%" fill="#fff" font-size="60" text-anchor="middle" dominant-baseline="central">${initial}</text></svg>`;
  }
}

@Injectable({
  providedIn: 'root'
})
export class ButtonInspectorService {
  private router = inject(Router);
  private toastService = inject(ToastService);

  /** Track broken images that failed to load */
  private brokenImages = new WeakSet<HTMLImageElement>();

  /** Detected button & image issues on the current page */
  detectedIssues = signal<ButtonIssue[]>([]);
  
  /** Currently highlighted DOM element */
  private activeHighlightEl: HTMLElement | null = null;
  private highlightTimeout: any = null;
  private scanDebounceTimer: any = null;

  constructor() {
    this.hookImageErrorListeners();
    this.initNavigationListener();
    this.initGlobalClickListener();
  }

  private hookImageErrorListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('error', (event: ErrorEvent) => {
      const target = event.target as HTMLElement;
      if (target && target.tagName === 'IMG') {
        this.brokenImages.add(target as HTMLImageElement);
        this.scheduleScan(1000);
      }
      
      // Catch icon resolution or runtime UI errors
      if (event.message && (event.message.includes('Unable to resolve icon') || event.message.includes('lucide'))) {
        this.addRuntimeErrorIssue('أيقونة غير معتمدة أو فشل حل الأيقونة (Icon Resolution Error)', event.message);
      }
    }, true);

    // Also catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      const msg = event.reason?.message || String(event.reason);
      if (msg && (msg.includes('Unable to resolve icon') || msg.includes('lucide'))) {
        this.addRuntimeErrorIssue('أيقونة غير معتمدة أو فشل حل الأيقونة (Icon Resolution Error)', msg);
      }
    });
  }

  private addRuntimeErrorIssue(reason: string, details: string) {
    const current = this.detectedIssues();
    const newIssue: ButtonIssue = {
      id: `runtime-error-${Math.random().toString(36).substr(2, 6)}`,
      element: document.body,
      tagName: 'svg',
      text: details.substring(0, 40),
      reason: reason,
      englishReason: details,
      category: 'error',
      severity: 'error',
      selector: 'svg[lucideIcon]'
    };
    if (!current.some(i => i.englishReason === details)) {
      this.detectedIssues.set([...current, newIssue]);
    }
  }

  private initNavigationListener() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.scheduleScan(800);
    });
  }

  private scheduleScan(delayMs: number = 800) {
    if (this.scanDebounceTimer) clearTimeout(this.scanDebounceTimer);
    this.scanDebounceTimer = setTimeout(() => {
      this.scanCurrentPage();
    }, delayMs);
  }

  /**
   * Scan current DOM for interactive elements, broken images, and UX suggestions
   */
  scanCurrentPage() {
    if (typeof document === 'undefined') return;

    const issues: ButtonIssue[] = [];
    const candidates = document.querySelectorAll<HTMLElement>(
      'button, a, [role="button"], input[type="button"], input[type="submit"], .btn, img'
    );

    candidates.forEach((el, index) => {
      if (this.shouldIgnoreElement(el)) return;

      const evalResult = this.evaluateElementIssue(el);
      if (evalResult) {
        const rawText = el.getAttribute('alt') || el.innerText?.trim() || el.getAttribute('aria-label') || el.getAttribute('title') || el.getAttribute('placeholder') || `<${el.tagName.toLowerCase()}>`;
        const cleanText = rawText.replace(/\s+/g, ' ');
        const selector = this.generateSelector(el);

        issues.push({
          id: `issue-${index}-${Math.random().toString(36).substr(2, 6)}`,
          element: el,
          tagName: el.tagName.toLowerCase(),
          text: cleanText.length > 50 ? cleanText.substring(0, 50) + '...' : cleanText,
          reason: evalResult.arabic,
          englishReason: evalResult.english,
          category: evalResult.category,
          severity: evalResult.category === 'error' ? 'error' : 'info',
          selector
        });
      }
    });

    this.detectedIssues.set(issues);
  }

  /**
   * Evaluates if an element has a CRITICAL ERROR or a UX SUGGESTION
   */
  private evaluateElementIssue(el: HTMLElement): { arabic: string; english: string; category: IssueCategory } | null {
    const tagName = el.tagName.toLowerCase();

    // =========================================================================
    // CATEGORY 1: CRITICAL ERRORS (أخطاء برمجية وخلل حقيقي)
    // =========================================================================

    // 1.1 Image tag validation
    if (tagName === 'img') {
      const img = el as HTMLImageElement;
      const src = img.getAttribute('src') || img.src;

      if (!src || src === '#' || src.trim() === '') {
        return {
          arabic: 'صورة / أيقونة بدون رابط مصدري (missing or empty img src)',
          english: 'Image element missing src attribute or has empty URL',
          category: 'error'
        };
      }

      if (this.brokenImages.has(img)) {
        return {
          arabic: 'صورة أو أيقونة معطلة وفشل تحميلها من السيرفر (Broken Image URL)',
          english: 'Image failed to load (network/CORS/404 error)',
          category: 'error'
        };
      }

      if (img.complete && img.naturalWidth === 0 && src.startsWith('http')) {
        return {
          arabic: 'صورة لم يتم عرضها بنجاح (Zero width / failed render)',
          english: 'Image loaded with 0 natural width (render error or blocked)',
          category: 'error'
        };
      }

      return null;
    }

    // Check if element is disabled
    if (el.hasAttribute('disabled') || el.classList.contains('disabled') || el.getAttribute('aria-disabled') === 'true') {
      return null;
    }

    // Explicitly marked under-development
    if (el.hasAttribute('data-unimplemented') || el.classList.contains('unimplemented')) {
      return {
        arabic: 'عنصر قيد التطوير والإنشاء (معلّم بـ data-unimplemented)',
        english: 'Element explicitly tagged as work-in-progress (data-unimplemented)',
        category: 'error'
      };
    }

    // 1.2 Anchor tags checks
    if (tagName === 'a') {
      const href = el.getAttribute('href');
      const routerLink = el.getAttribute('ng-reflect-router-link') || el.getAttribute('routerlink');
      
      if (!href && !routerLink && !this.hasClickEventListener(el)) {
        return {
          arabic: 'رابط بدون وجهة أو أمر (لا يملك href أو routerLink أو حدث click)',
          english: 'Anchor element missing href, routerLink, or click binding',
          category: 'error'
        };
      }
      if (href === '#' || href === 'javascript:void(0)' || href === 'javascript:;') {
        if (!routerLink && !this.hasClickEventListener(el)) {
          return {
            arabic: 'رابط يحتوي على مسار وهمي (#) وليس لديه وظيفة برمجية نافذة',
            english: 'Anchor has stub href="#" without click handler or routerLink',
            category: 'error'
          };
        }
      }
    }

    // 1.3 Buttons & Interactive elements checks
    const hasListener = this.hasClickEventListener(el);
    const hasFormSubmit = el.getAttribute('type') === 'submit' && el.closest('form') !== null;
    const routerLink = el.getAttribute('ng-reflect-router-link') || el.getAttribute('routerlink');

    if (tagName === 'button' || el.getAttribute('role') === 'button' || el.classList.contains('btn')) {
      if (!hasListener && !hasFormSubmit && !routerLink) {
        return {
          arabic: 'زر غير مربوط بأي أمر برمجي أو رابط تفاعلي',
          english: 'Button element missing (click) event handler or routerLink',
          category: 'error'
        };
      }
    }

    // =========================================================================
    // CATEGORY 2: UX SUGGESTIONS & BEST-PRACTICES (تلميحات واقتراحات تحسين)
    // =========================================================================

    // 2.1 Angular-Aware Accessibility Check
    if (tagName === 'button' || el.getAttribute('role') === 'button') {
      const innerText = el.innerText?.trim() || '';
      const ariaLabel = el.getAttribute('aria-label') || 
                        el.getAttribute('title') || 
                        el.getAttribute('ng-reflect-aria-label') || 
                        el.getAttribute('ng-reflect-title') || 
                        el.getAttribute('ng-reflect-tooltip') ||
                        el.getAttribute('placeholder') || '';

      const hasAngularIcon = el.querySelector('lucide-icon') !== null || 
                             el.querySelector('svg') !== null || 
                             el.querySelector('mat-icon') !== null || 
                             el.querySelector('i') !== null;

      if (!innerText && hasAngularIcon && !ariaLabel) {
        const childTitle = el.querySelector('[title], [aria-label]') !== null;
        if (!childTitle) {
          return {
            arabic: '💡 اقتراح UX: زر أيقونة ينصح بإضافة aria-label أو title (لسهولة الوصول والقرّاء الآليين).',
            english: '💡 UX Suggestion: Icon-only button recommended to have aria-label or title attribute for screen readers.',
            category: 'suggestion'
          };
        }
      }
    }

    return null;
  }

  private hasClickEventListener(el: HTMLElement): boolean {
    // 1. Check Angular DevTools / Debug API (available in Angular runtime)
    if (typeof (window as any).ng?.getListeners === 'function') {
      try {
        const listeners = (window as any).ng.getListeners(el);
        if (listeners && listeners.some((l: any) => l.name === 'click')) {
          return true;
        }
      } catch {}
    }

    // 2. Direct inline handlers or attributes
    if (el.hasAttribute('ng-reflect-click') || el.getAttribute('onclick') || (el as any).__onclick__) {
      return true;
    }

    // 3. Angular Ivy __ngContext__ inspection
    if ((el as any).__ngContext__) {
      const ctx = (el as any).__ngContext__;
      if (Array.isArray(ctx)) {
        return true; // Any element attached to Angular Ivy component view context with button/click tag
      }
    }

    // 4. Check parent containers up to 3 levels
    let parent = el.parentElement;
    let depth = 0;
    while (parent && depth < 3) {
      if (typeof (window as any).ng?.getListeners === 'function') {
        try {
          const listeners = (window as any).ng.getListeners(parent);
          if (listeners && listeners.some((l: any) => l.name === 'click')) {
            return true;
          }
        } catch {}
      }
      if (parent.hasAttribute('ng-reflect-click') || parent.getAttribute('onclick')) {
        return true;
      }
      if ((parent as any).__ngContext__) {
        return true;
      }
      parent = parent.parentElement;
      depth++;
    }

    return false;
  }

  private shouldIgnoreElement(el: HTMLElement): boolean {
    if (el.closest('app-dev-audit-panel') || el.closest('app-toast') || el.closest('app-lightbox')) {
      return true;
    }
    if (el.offsetWidth === 0 && el.offsetHeight === 0 && !el.getClientRects().length) {
      return true;
    }
    return false;
  }

  private initGlobalClickListener() {
    if (typeof window === 'undefined') return;

    window.addEventListener('click', (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target) return;

      const clickable = target.closest<HTMLElement>(
        'button, a, [role="button"], input[type="button"], input[type="submit"], .btn'
      );

      if (!clickable || this.shouldIgnoreElement(clickable)) return;

      const evalResult = this.evaluateElementIssue(clickable);

      if (evalResult && evalResult.category === 'error') {
        if (isDevMode()) {
          console.warn('[Dev Audit Inspector] Clicked non-functional element:', clickable, evalResult.english);
        } else {
          this.toastService.show('هذه الميزة قيد التطوير حالياً وستكون متاحة قريباً 🚀', 'info');
        }
      }
    }, true);
  }

  highlightElement(issue: ButtonIssue) {
    const el = issue.element;
    if (!el || !document.body.contains(el)) {
      this.toastService.show('لم يتم العثور على العنصر في الصفحة الحالية', 'warning');
      return;
    }

    if (this.activeHighlightEl) {
      this.activeHighlightEl.classList.remove('dev-audit-highlight');
    }

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('dev-audit-highlight');
    this.activeHighlightEl = el;

    if (this.highlightTimeout) clearTimeout(this.highlightTimeout);
    this.highlightTimeout = setTimeout(() => {
      el.classList.remove('dev-audit-highlight');
      this.activeHighlightEl = null;
    }, 4000);
  }

  private generateSelector(el: HTMLElement): string {
    if (el.id) return `#${el.id}`;
    let selector = el.tagName.toLowerCase();
    if (el.className && typeof el.className === 'string') {
      const classes = el.className.split(' ').filter(c => c && !c.startsWith('ng-')).slice(0, 2);
      if (classes.length) selector += '.' + classes.join('.');
    }
    return selector;
  }

  /**
   * Formats token-optimized English prompt with category filtering (all, errors, suggestions)
   */
  exportAIPromptReport(limitCount: number | null = null, filterCategory: 'all' | 'errors' | 'suggestions' = 'all'): string {
    let allIssues = this.detectedIssues();
    const currentUrl = this.router.url;

    if (filterCategory === 'errors') {
      allIssues = allIssues.filter(i => i.category === 'error');
    } else if (filterCategory === 'suggestions') {
      allIssues = allIssues.filter(i => i.category === 'suggestion');
    }

    if (allIssues.length === 0) {
      return `No issues found for category "${filterCategory}" on current page.`;
    }

    const issues = limitCount && limitCount > 0 ? allIssues.slice(0, limitCount) : allIssues;
    const isLimited = limitCount && limitCount < allIssues.length;

    let prompt = `<CODE_AUDIT_REPORT url="${currentUrl}" category="${filterCategory}" showing="${issues.length}" total="${allIssues.length}">\n`;
    prompt += `The following ${isLimited ? `top ${issues.length} (out of ${allIssues.length})` : `all ${issues.length}`} items on route "${currentUrl}" were audited:\n\n`;

    issues.forEach((issue, index) => {
      const catLabel = issue.category === 'error' ? '[CRITICAL ERROR]' : '[UX SUGGESTION]';
      prompt += `${index + 1}. ${catLabel} <${issue.tagName}> | Selector: \`${issue.selector}\` | Text: "${issue.text}"\n`;
      prompt += `   Details: ${issue.englishReason}\n`;
    });

    prompt += `\nInstructions for AI Agent:\n`;
    prompt += `- Locate these elements in the corresponding Angular template / component for route "${currentUrl}".\n`;
    prompt += `- For CRITICAL ERRORS: Fix missing click bindings, broken routes, or unhandled image URLs.\n`;
    prompt += `- For UX SUGGESTIONS: Implement recommended UX accessibility labels or best practices if desired.\n`;
    prompt += `</CODE_AUDIT_REPORT>`;

    return prompt;
  }

  exportSingleIssueAIPrompt(issue: ButtonIssue): string {
    const currentUrl = this.router.url;
    const typeLabel = issue.category === 'error' ? 'Critical Error' : 'UX Suggestion';
    return `Audit item on route "${currentUrl}" (${typeLabel}): <${issue.tagName}> element with selector \`${issue.selector}\` and label "${issue.text}". Item: ${issue.englishReason}. Please implement the appropriate fix or UX improvement.`;
  }
}
