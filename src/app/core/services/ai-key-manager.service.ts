import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AiKeyManagerService {
  private readonly USAGE_KEY = 'si_neuro_platform_ai_usage';
  private readonly USE_PLATFORM_KEY = 'si_neuro_use_platform_key';
  private readonly USER_API_KEY = 'Si-Neuro-chat-apiKey';

  // Daily quota limit for platform default key
  private readonly DAILY_LIMIT = 50; 

  readonly usePlatformKey = signal<boolean>(this.getInitialUsePlatformKey());
  readonly platformUsageCount = signal<number>(this.getTodayUsage());

  private getInitialUsePlatformKey(): boolean {
    if (typeof localStorage === 'undefined') return true;
    const val = localStorage.getItem(this.USE_PLATFORM_KEY);
    return val === null ? true : val === 'true';
  }

  private getTodayUsage(): number {
    if (typeof localStorage === 'undefined') return 0;
    try {
      const data = JSON.parse(localStorage.getItem(this.USAGE_KEY) || '{}');
      const today = new Date().toISOString().slice(0, 10);
      if (data.date === today) {
        return data.count || 0;
      }
    } catch {}
    return 0;
  }

  public setUsePlatformKey(val: boolean): void {
    this.usePlatformKey.set(val);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.USE_PLATFORM_KEY, val.toString());
    }
  }

  public checkAndIncrementQuota(): boolean {
    if (!this.usePlatformKey()) return true; // User custom key has no platform limits

    const today = new Date().toISOString().slice(0, 10);
    let currentCount = 0;
    try {
      const data = JSON.parse(localStorage.getItem(this.USAGE_KEY) || '{}');
      if (data.date === today) {
        currentCount = data.count || 0;
      }
    } catch {}

    if (currentCount >= this.DAILY_LIMIT) {
      alert(`⚠️ لقد استنفذت حصتك اليومية من مفتاح المنصة (${this.DAILY_LIMIT} طلب). يرجى إدخال مفتاح API خاص بك في الإعدادات للاستمرار بلا حدود.`);
      return false;
    }

    const newCount = currentCount + 1;
    this.platformUsageCount.set(newCount);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.USAGE_KEY, JSON.stringify({ date: today, count: newCount }));
    }
    return true;
  }

  public decrementQuota(): void {
    if (!this.usePlatformKey()) return;
    const current = this.platformUsageCount();
    if (current > 0) {
      const newCount = current - 1;
      this.platformUsageCount.set(newCount);
      const today = new Date().toISOString().slice(0, 10);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.USAGE_KEY, JSON.stringify({ date: today, count: newCount }));
      }
    }
  }

  public getActiveApiKey(): string {
    if (typeof localStorage === 'undefined') return '';
    if (this.usePlatformKey()) {
      // Return built-in default fallback key or route through edge
      return 'AIzaSyAdHKCp9X3rCTdyyZ0XeiRvxWOp2qVaQws'; // Environment default key
    } else {
      return localStorage.getItem(this.USER_API_KEY) || '';
    }
  }
}
