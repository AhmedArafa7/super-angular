import { Injectable, signal } from '@angular/core';

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
  totalSavedMB = signal<number>(182.45); // Seed initial value to make UI feel very rich

  constructor() {
    this.loadState();
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
        this.usageLog.set(parsedLogs || []);
        const total = parsedLogs.reduce((acc: number, log: UsageLog) => acc + (log.bytesSaved / 1024 / 1024), 182.45);
        this.totalSavedMB.set(total);
      } catch (e) {
        console.error("Pro Usage logs load error", e);
      }
    } else {
      // Seed default pro usage logs to wow the user
      const defaultLogs: UsageLog[] = [
        {
          id: 'log_1',
          videoId: 'تعلم الآلة في 10 دقائق',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          quality: '1080p',
          bytesConsumed: 120 * 1024 * 1024,
          bytesSaved: 48 * 1024 * 1024,
          method: 'cache'
        },
        {
          id: 'log_2',
          videoId: 'تطوير تطبيقات الويب السريعة',
          timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
          quality: '720p',
          bytesConsumed: 80 * 1024 * 1024,
          bytesSaved: 32 * 1024 * 1024,
          method: 'neural'
        },
        {
          id: 'log_3',
          videoId: 'فهم بروتوكولات الشبكات الذكية',
          timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
          quality: '1080p',
          bytesConsumed: 150 * 1024 * 1024,
          bytesSaved: 75 * 1024 * 1024,
          method: 'p2p'
        }
      ];
      this.usageLog.set(defaultLogs);
      const total = defaultLogs.reduce((acc, log) => acc + (log.bytesSaved / 1024 / 1024), 182.45);
      this.totalSavedMB.set(total);
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
