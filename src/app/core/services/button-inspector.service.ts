import { Injectable, inject, signal, isDevMode, NgZone } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ToastService } from './toast.service';

export interface ButtonIssue {
  id: string;
  element: HTMLElement;
  tagName: string;
  text: string;
  reason: string;
  severity: 'warning' | 'error' | 'info';
  selector: string;
  locationHint?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ButtonInspectorService {
  private router = inject(Router);
  private toastService = inject(ToastService);
  private ngZone = inject(NgZone);

  /** Track elements that have actual click event listeners attached via addEventListener */
  private elementsWithListeners = new WeakSet<Element>();

  /** Detected button issues on the current page */
  detectedIssues = signal<ButtonIssue[]>([]);
  
  /** Currently highlighted DOM element */
  private activeHighlightEl: HTMLElement | null = null;
  private highlightTimeout: any = null;

  constructor() {
    this.hookEventListener();
    this.initNavigationListener();
    this.initGlobalClickListener();
  }

  /**
   * Monkey-patch addEventListener to track every element Angular or JS binds a click listener to
   */
  private hookEventListener() {
    if (typeof window === 'undefined' || !window.EventTarget) return;

    const self = this;
    const originalAddEventListener = EventTarget.prototype.addEventListener;

    EventTarget.prototype.addEventListener = function (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions
    ) {
      if (type === 'click' && this instanceof Element) {
        self.elementsWithListeners.add(this);
        (this as HTMLElement).dataset['hasClickListener'] = 'true';
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
  }

  /**
   * Listen to router navigation to re-scan the DOM when page changes
   */
  private initNavigationListener() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      setTimeout(() => {
        this.scanCurrentPage();
      }, 600);
    });
  }

  /**
   * Scan current DOM for interactive elements and audit their functionality
   */
  scanCurrentPage() {
    if (typeof document === 'undefined') return;

    const issues: ButtonIssue[] = [];
    const candidates = document.querySelectorAll<HTMLElement>(
      'button, a, [role="button"], input[type="button"], input[type="submit"], .btn'
    );

    candidates.forEach((el, index) => {
      if (this.shouldIgnoreElement(el)) return;

      const issueReason = this.evaluateElementIssue(el);
      if (issueReason) {
        const rawText = el.innerText?.trim() || el.getAttribute('aria-label') || el.getAttribute('title') || el.getAttribute('placeholder') || `<${el.tagName.toLowerCase()}>`;
        const cleanText = rawText.replace(/\s+/g, ' ');
        const selector = this.generateSelector(el);

        issues.push({
          id: `issue-${index}-${Math.random().toString(36).substr(2, 6)}`,
          element: el,
          tagName: el.tagName.toLowerCase(),
          text: cleanText.length > 50 ? cleanText.substring(0, 50) + '...' : cleanText,
          reason: issueReason,
          severity: 'warning',
          selector
        });
      }
    });

    this.detectedIssues.set(issues);
  }

  /**
   * Evaluates if a given DOM element is non-functional or missing actions
   */
  private evaluateElementIssue(el: HTMLElement): string | null {
    // 1. Check if disabled
    if (el.hasAttribute('disabled') || el.classList.contains('disabled') || el.getAttribute('aria-disabled') === 'true') {
      return null; // Disabled elements are intentionally inactive
    }

    // 2. Explicitly marked under-development
    if (el.hasAttribute('data-unimplemented') || el.classList.contains('unimplemented')) {
      return 'عنصر قيد التطوير والإنشاء (معلّم بـ data-unimplemented)';
    }

    const tagName = el.tagName.toLowerCase();

    // 3. Anchor tags checks
    if (tagName === 'a') {
      const href = el.getAttribute('href');
      const routerLink = el.getAttribute('ng-reflect-router-link') || el.getAttribute('routerlink');
      
      if (!href && !routerLink && !this.hasClickEventListener(el)) {
        return 'رابط بدون وجهة أو أمر (لا يملك href أو routerLink أو حدث click)';
      }
      if (href === '#' || href === 'javascript:void(0)' || href === 'javascript:;') {
        if (!routerLink && !this.hasClickEventListener(el)) {
          return 'رابط يحتوي على مسار وهمي (#) وليس لديه وظيفة برمجية نافذة';
        }
      }
    }

    // 4. Buttons and custom role buttons checks
    if (tagName === 'button' || el.getAttribute('role') === 'button' || el.classList.contains('btn')) {
      const hasListener = this.hasClickEventListener(el);
      const hasFormSubmit = el.getAttribute('type') === 'submit' && el.closest('form') !== null;
      const routerLink = el.getAttribute('ng-reflect-router-link') || el.getAttribute('routerlink');

      if (!hasListener && !hasFormSubmit && !routerLink) {
        return 'زر غير مربوط بأي أمر برمجي أو رابط تفاعلي';
      }
    }

    return null;
  }

  /**
   * Check if element or its parent has an attached click listener or Angular binding
   */
  private hasClickEventListener(el: HTMLElement): boolean {
    if (this.elementsWithListeners.has(el) || el.dataset['hasClickListener'] === 'true') {
      return true;
    }
    // Check parents if click event is delegated
    let parent = el.parentElement;
    let depth = 0;
    while (parent && depth < 3) {
      if (this.elementsWithListeners.has(parent) || parent.dataset['hasClickListener'] === 'true') {
        return true;
      }
      parent = parent.parentElement;
      depth++;
    }

    // Check Angular reflect attributes or inline onclick
    if (el.hasAttribute('ng-reflect-click') || el.getAttribute('onclick') || (el as any).__onclick__) {
      return true;
    }

    // Check Angular LView context
    if ((el as any).__ngContext__) {
      const ctx = (el as any).__ngContext__;
      if (Array.isArray(ctx)) {
        // Look for listeners array in LView
        const hasLViewListeners = ctx.some(item => typeof item === 'function' || (item && typeof item === 'object' && item.length > 0));
        if (hasLViewListeners) return true;
      }
    }

    return false;
  }

  /**
   * Ignore elements inside Toast or Dev Audit HUD itself
   */
  private shouldIgnoreElement(el: HTMLElement): boolean {
    if (el.closest('app-dev-audit-panel') || el.closest('app-toast') || el.closest('app-lightbox')) {
      return true;
    }
    // Ignore hidden elements
    if (el.offsetWidth === 0 && el.offsetHeight === 0 && !el.getClientRects().length) {
      return true;
    }
    return false;
  }

  /**
   * Intercept clicks globally on non-functional buttons
   */
  private initGlobalClickListener() {
    if (typeof window === 'undefined') return;

    window.addEventListener('click', (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target) return;

      const clickable = target.closest<HTMLElement>(
        'button, a, [role="button"], input[type="button"], input[type="submit"], .btn'
      );

      if (!clickable || this.shouldIgnoreElement(clickable)) return;

      const issueReason = this.evaluateElementIssue(clickable);

      if (issueReason) {
        if (isDevMode()) {
          console.warn('[Dev Audit Inspector] Clicked non-functional button:', clickable, issueReason);
        } else {
          this.toastService.show('هذه الميزة قيد التطوير حالياً وستكون متاحة قريباً 🚀', 'info');
        }
      }
    }, true);
  }

  /**
   * Scroll to and visually highlight a specific DOM element for the developer
   */
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

  /**
   * Generates a readable CSS selector string for DOM element
   */
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
   * Formats all detected issues into a clean Markdown report for copying
   */
  exportAllIssuesReport(): string {
    const issues = this.detectedIssues();
    if (issues.length === 0) return 'لا توجد أزرار أو عناصر معطلة في الصفحة الحالية.';

    let report = `### 📋 تقرير الأزرار والعناصر التي تحتاج إصلاح (${issues.length} عنصر)\n\n`;
    issues.forEach((issue, index) => {
      report += `${index + 1}. **[${issue.tagName.toUpperCase()}]** \`${issue.text}\`
   - **السبب**: ${issue.reason}
   - **المحدد (Selector)**: \`${issue.selector}\`
\n`;
    });
    return report;
  }
}
