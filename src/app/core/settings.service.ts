import { Injectable, signal, effect } from '@angular/core';

export interface VoiceCatalogItem {
  id: string;
  name: string;
  lang: string;
  provider: 'Google' | 'Azure' | 'Amazon' | 'Neural';
  quality: 'Standard' | 'High' | 'Ultra';
  sizeMB: number;
}

export const PREMIUM_VOICES: VoiceCatalogItem[] = [
  { id: 'ar-neural-1', name: 'أمل (Neural SA)', lang: 'ar-SA', provider: 'Neural', quality: 'Ultra', sizeMB: 42 },
  { id: 'ar-neural-2', name: 'ياسين (Neural EG)', lang: 'ar-EG', provider: 'Neural', quality: 'Ultra', sizeMB: 38 },
  { id: 'en-neural-1', name: 'Sarah (Studio US)', lang: 'en-US', provider: 'Azure', quality: 'High', sizeMB: 45 },
  { id: 'en-neural-2', name: 'James (Studio GB)', lang: 'en-GB', provider: 'Azure', quality: 'High', sizeMB: 48 },
  { id: 'ar-google-1', name: 'ليلى (Wavenet)', lang: 'ar-XA', provider: 'Google', quality: 'High', sizeMB: 30 }
];

export interface UsageLog {
  id: string;
  videoId: string;
  timestamp: string;
  quality: string;
  bytesConsumed: number;
  bytesSaved: number;
  method: 'cache' | 'p2p' | 'neural';
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private readonly STORAGE_KEY_SETTINGS = 'Si-Neuro-system-settings';
  private readonly STORAGE_KEY_PRO_USAGE = 'Si-Neuro-pro-usage-log';

  // Core settings signals
  language = signal<'ar' | 'en'>('ar');
  theme = signal<'dark' | 'light' | 'neural'>('dark');
  hideMusic = signal<boolean>(true);
  sidebarIconShortcutEnabled = signal<boolean>(true);

  // Voice Speech settings signals
  preferredVoice = signal<string>('');
  speechRate = signal<number>(1.0);
  speechPitch = signal<number>(1.0);
  isEmergencyOnly = signal<boolean>(false);
  downloadedVoices = signal<string[]>([]);

  // Pro Usage signals
  usageLog = signal<UsageLog[]>([]);
  totalSavedMB = signal<number>(0);

  constructor() {
    this.loadState();
    this.applyDOMDirection(this.language());

    effect(() => {
      const currentLang = this.language();
      this.applyDOMDirection(currentLang);
    });
  }

  applyDOMDirection(lang: 'ar' | 'en'): void {
    if (typeof document === 'undefined') return;
    const dir = lang === 'ar' ? 'rtl' : 'ltr';

    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', lang);

    if (document.body) {
      document.body.dir = dir;
      document.body.setAttribute('dir', dir);
    }
  }

  setLanguage(lang: 'ar' | 'en'): void {
    this.language.set(lang);
    this.applyDOMDirection(lang);
    this.saveState();
  }

  toggleLanguage(): void {
    const nextLang = this.language() === 'ar' ? 'en' : 'ar';
    this.setLanguage(nextLang);
  }

  private loadState(): void {
    const settingsStr = localStorage.getItem(this.STORAGE_KEY_SETTINGS);
    const usageStr = localStorage.getItem(this.STORAGE_KEY_PRO_USAGE);

    if (settingsStr) {
      try {
        const parsed = JSON.parse(settingsStr);
        if (parsed.language) this.language.set(parsed.language);
        if (parsed.theme) this.theme.set(parsed.theme);
        if (parsed.hideMusic !== undefined) this.hideMusic.set(parsed.hideMusic);
        if (parsed.sidebarIconShortcutEnabled !== undefined) this.sidebarIconShortcutEnabled.set(parsed.sidebarIconShortcutEnabled);
        if (parsed.preferredVoice) this.preferredVoice.set(parsed.preferredVoice);
        if (parsed.speechRate) this.speechRate.set(parsed.speechRate);
        if (parsed.speechPitch) this.speechPitch.set(parsed.speechPitch);
        if (parsed.isEmergencyOnly !== undefined) this.isEmergencyOnly.set(parsed.isEmergencyOnly);
        if (parsed.downloadedVoices) this.downloadedVoices.set(parsed.downloadedVoices);
      } catch (e) {
        console.error("System Settings load error", e);
      }
    }

    if (usageStr) {
      try {
        const parsedLogs = JSON.parse(usageStr);
        const clean = (parsedLogs as UsageLog[] || []).filter(l => !l.id.startsWith('log_'));
        this.usageLog.set(clean);
        const total = clean.reduce((acc: number, log: UsageLog) => acc + (log.bytesSaved / 1024 / 1024), 0);
        this.totalSavedMB.set(total);
      } catch (e) {
        console.error("Pro Usage logs load error", e);
      }
    } else {
      this.usageLog.set([]);
      this.totalSavedMB.set(0);
      this.saveState();
    }
  }

  saveState(): void {
    const settings = {
      language: this.language(),
      theme: this.theme(),
      hideMusic: this.hideMusic(),
      sidebarIconShortcutEnabled: this.sidebarIconShortcutEnabled(),
      preferredVoice: this.preferredVoice(),
      speechRate: this.speechRate(),
      speechPitch: this.speechPitch(),
      isEmergencyOnly: this.isEmergencyOnly(),
      downloadedVoices: this.downloadedVoices()
    };
    localStorage.setItem(this.STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    localStorage.setItem(this.STORAGE_KEY_PRO_USAGE, JSON.stringify(this.usageLog()));
  }

  // Clear usage log dashboard
  clearUsageLog(): void {
    this.usageLog.set([]);
    this.totalSavedMB.set(0);
    this.saveState();
  }

  // Download custom neural voice
  downloadVoice(voiceId: string): void {
    if (this.downloadedVoices().includes(voiceId)) return;
    this.downloadedVoices.update(list => [...list, voiceId]);
    this.saveState();
  }

  // Clear all local storage database configs starting with 'Si-Neuro-'
  purgeSystemData(): void {
    if (typeof window !== 'undefined') {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('Si-Neuro-')) {
          keys.push(key);
        }
      }
      keys.forEach(key => localStorage.removeItem(key));
      // Re-initialize state
      this.language.set('ar');
      this.theme.set('dark');
      this.hideMusic.set(true);
      this.sidebarIconShortcutEnabled.set(true);
      this.preferredVoice.set('');
      this.speechRate.set(1.0);
      this.speechPitch.set(1.0);
      this.isEmergencyOnly.set(false);
      this.downloadedVoices.set([]);
      this.usageLog.set([]);
      this.totalSavedMB.set(0);
      this.saveState();
    }
  }
}
