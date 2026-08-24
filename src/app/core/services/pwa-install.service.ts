import { Injectable, signal } from '@angular/core';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

@Injectable({
  providedIn: 'root'
})
export class PwaInstallService {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;

  readonly canInstall = signal<boolean>(false);
  readonly isInstalled = signal<boolean>(false);
  readonly isIOS = signal<boolean>(false);
  readonly isAndroid = signal<boolean>(false);
  readonly showIOSInstructions = signal<boolean>(false);

  constructor() {
    this.initPwaTracking();
  }

  private initPwaTracking(): void {
    if (typeof window === 'undefined') return;

    // Detect standalone display mode
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;
    this.isInstalled.set(isStandalone);

    // Detect Platform
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    const isAndroidDevice = /android/.test(ua);
    this.isIOS.set(isIosDevice);
    this.isAndroid.set(isAndroidDevice);

    // Listen for beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      this.canInstall.set(true);
    });

    // Listen for successful installation
    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.canInstall.set(false);
      this.isInstalled.set(true);
    });
  }

  /**
   * Prompt user to install the PWA
   */
  async promptInstall(): Promise<'accepted' | 'dismissed' | 'ios' | 'already_installed' | 'unsupported'> {
    if (this.isInstalled()) {
      return 'already_installed';
    }

    if (this.deferredPrompt) {
      try {
        await this.deferredPrompt.prompt();
        const choice = await this.deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          this.deferredPrompt = null;
          this.canInstall.set(false);
          this.isInstalled.set(true);
          return 'accepted';
        }
        return 'dismissed';
      } catch (err) {
        console.error('Error invoking PWA install prompt:', err);
        return 'unsupported';
      }
    }

    if (this.isIOS()) {
      this.showIOSInstructions.set(true);
      return 'ios';
    }

    return 'unsupported';
  }

  closeIOSInstructions(): void {
    this.showIOSInstructions.set(false);
  }
}
