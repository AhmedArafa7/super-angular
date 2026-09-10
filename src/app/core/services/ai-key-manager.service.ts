import { Injectable, signal } from '@angular/core';

export interface GeminiApiPayload {
  model?: string;
  action?: 'generateContent' | 'predict';
  contents?: any[];
  prompt?: string;
  instances?: any[];
  parameters?: any;
  generationConfig?: any;
  systemInstruction?: any;
}

export interface GeminiApiResponse {
  ok: boolean;
  data?: any;
  text?: string;
  error?: string;
}

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

  /**
   * Check if any valid key configuration exists (either server platform key or user custom key).
   */
  public hasActiveKey(): boolean {
    if (this.usePlatformKey()) return true;
    return !!(typeof localStorage !== 'undefined' && localStorage.getItem(this.USER_API_KEY)?.trim());
  }

  /**
   * Returns user-provided custom key if active, or '__PLATFORM_PROXY__' when routing through edge proxy.
   * NEVER exposes secret platform keys to the browser.
   */
  public getActiveApiKey(): string {
    if (typeof localStorage === 'undefined') return '';
    if (this.usePlatformKey()) {
      return '__PLATFORM_PROXY__';
    } else {
      return localStorage.getItem(this.USER_API_KEY) || '';
    }
  }

  /**
   * Unified, secure caller for Gemini & Imagen APIs.
   * When using platform mode, routes securely through /api/ai/generate on Cloudflare Edge.
   * When using user custom mode, passes the key securely to the proxy or handles it directly.
   */
  public async callGeminiApi(payload: GeminiApiPayload): Promise<GeminiApiResponse> {
    if (!this.checkAndIncrementQuota()) {
      return { ok: false, error: 'تم استنفاذ الحصة اليومية من مفتاح المنصة.' };
    }

    try {
      const userKey = !this.usePlatformKey() && typeof localStorage !== 'undefined'
        ? (localStorage.getItem(this.USER_API_KEY) || '').trim()
        : '';

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (userKey) {
        headers['x-gemini-api-key'] = userKey;
      }

      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        this.decrementQuota();
        return {
          ok: false,
          error: json.error || `خطأ في الاتصال بالخادم (${res.status})`,
          data: json.data
        };
      }

      return {
        ok: true,
        data: json.data,
        text: json.text || json.data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
      };
    } catch (err: any) {
      this.decrementQuota();
      return { ok: false, error: err.message || 'فشل الاتصال بمحرك الذكاء الاصطناعي.' };
    }
  }
}
