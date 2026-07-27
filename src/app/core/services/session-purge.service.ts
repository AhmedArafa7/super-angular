import { Injectable, inject } from '@angular/core';
import { FirebaseService } from './firebase.service';

@Injectable({
  providedIn: 'root'
})
export class SessionPurgeService {
  private firebaseService = inject(FirebaseService);

  constructor() {
    this.initLogoutListener();
  }

  private initLogoutListener(): void {
    // Listen to storage events or manual logout flags across tabs/iframes
    window.addEventListener('storage', (event) => {
      if (event.key === 'manual_logout' && event.newValue === 'true') {
        this.purgeAllSessions();
      }
    });
  }

  public async purgeAllSessions(): Promise<void> {
    try {
      // 1. Sign out from Firebase Auth if initialized
      if (this.firebaseService.auth) {
        await this.firebaseService.logout();
      }
    } catch (e) {
      console.warn('[SessionPurgeService] Firebase logout error:', e);
    }

    // 2. Clear sensitive tokens and local storage caches while preserving key preferences if needed
    const keysToKeep = ['si_neuro_theme', 'si_neuro_language'];
    const preservedData: Record<string, string> = {};
    keysToKeep.forEach(k => {
      const val = localStorage.getItem(k);
      if (val !== null) preservedData[k] = val;
    });

    localStorage.clear();
    sessionStorage.clear();

    // Restore preserved preferences
    Object.entries(preservedData).forEach(([k, v]) => {
      localStorage.setItem(k, v);
    });

    localStorage.setItem('manual_logout', 'true');

    // 3. Notify parent/child iframes if any
    if (window.parent && window.parent !== window) {
      const parentOrigin = document.referrer ? new URL(document.referrer).origin : '*';
      window.parent.postMessage({ type: 'SI_NEURO_LOGOUT' }, parentOrigin);
    }

    console.log('[SessionPurgeService] All local sessions and states purged successfully.');
  }
}
