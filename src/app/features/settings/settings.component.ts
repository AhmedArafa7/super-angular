import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { SettingsService, PREMIUM_VOICES, VoiceCatalogItem, UsageLog } from '../../core/settings.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideDynamicIcon],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit, OnDestroy {
  settingsService = inject(SettingsService);
  premiumVoices = PREMIUM_VOICES;

  // Web Speech Synthesis parameters
  availableVoices = signal<SpeechSynthesisVoice[]>([]);
  testText = signal<string>('مرحباً بك في نظام نكسوس الذكي. هذا اختبار للصوت العصبي.');
  isSpeaking = signal<boolean>(false);
  downloadingIds = signal<string[]>([]);

  private synth: SpeechSynthesis | null = null;
  private utterance: SpeechSynthesisUtterance | null = null;

  ngOnInit(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadSystemVoices();
      
      // Handle chrome dynamic voice loads
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadSystemVoices();
      }
    }
  }

  ngOnDestroy(): void {
    this.stopSpeaking();
  }

  // Load physical browser speech voices
  private loadSystemVoices(): void {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    this.availableVoices.set(voices);

    // Set first voice as preferred if empty
    if (!this.settingsService.preferredVoice() && voices.length > 0) {
      // Prioritize Arabic if available
      const arVoice = voices.find(v => v.lang.startsWith('ar'));
      this.settingsService.preferredVoice.set(arVoice ? arVoice.name : voices[0].name);
      this.settingsService.saveState();
    }
  }

  // Speak test speech synthesis
  testSpeech(): void {
    if (!this.synth || !this.testText().trim()) return;

    this.stopSpeaking();

    const textToSpeak = this.testText();
    this.utterance = new SpeechSynthesisUtterance(textToSpeak);

    // Find and map selected voice
    const activeVoiceName = this.settingsService.preferredVoice();
    const systemVoice = this.availableVoices().find(v => v.name === activeVoiceName);
    if (systemVoice) {
      this.utterance.voice = systemVoice;
    }

    // Assign rates and pitches
    this.utterance.rate = this.settingsService.speechRate();
    this.utterance.pitch = this.settingsService.speechPitch();

    // Event updates
    this.utterance.onstart = () => this.isSpeaking.set(true);
    this.utterance.onend = () => this.isSpeaking.set(false);
    this.utterance.onerror = () => this.isSpeaking.set(false);

    this.synth.speak(this.utterance);
  }

  // Stop current utterance
  stopSpeaking(): void {
    if (this.synth) {
      this.synth.cancel();
    }
    this.isSpeaking.set(false);
  }

  // Download custom neural voice (simulate download delay)
  downloadNeuralVoice(voiceId: string): void {
    if (this.downloadingIds().includes(voiceId)) return;
    this.downloadingIds.update(ids => [...ids, voiceId]);

    setTimeout(() => {
      this.settingsService.downloadVoice(voiceId);
      this.downloadingIds.update(ids => ids.filter(id => id !== voiceId));
      alert("تم تحميل المحرك الصوتي بنجاح وهو متاح الآن للاستخدام الأساسي!");
    }, 2000);
  }

  // Adjust global system configuration parameters
  setTheme(theme: 'dark' | 'light' | 'neural'): void {
    this.settingsService.theme.set(theme);
    this.settingsService.saveState();
  }

  setLanguage(lang: 'ar' | 'en'): void {
    this.settingsService.language.set(lang);
    this.settingsService.saveState();
  }

  toggleMusicFilter(hide: boolean): void {
    this.settingsService.hideMusic.set(hide);
    this.settingsService.saveState();
  }

  toggleSidebarShortcut(enabled: boolean): void {
    this.settingsService.sidebarIconShortcutEnabled.set(enabled);
    this.settingsService.saveState();
  }

  // Clears live consumption reports
  clearProLogs(): void {
    this.settingsService.clearUsageLog();
    alert("تم مسح السجلات الاستهلاكية بنجاح.");
  }

  // Purges all system configurations
  handlePurgeData(): void {
    if (confirm("هل أنت متأكد من مسح جميع البيانات؟ سيتم إعادة ضبط النظام بالكامل وحذف الإعدادات والملفات المخزنة.")) {
      this.settingsService.purgeSystemData();
      this.loadSystemVoices();
      alert("تمت إعادة تهيئة النظام الافتراضي بنجاح.");
    }
  }

  // Get active neural premium voices combined with browser ones
  get combinedVoicesList(): { name: string; lang: string; isNeural: boolean }[] {
    const list = this.availableVoices().map(v => ({ name: v.name, lang: v.lang, isNeural: false }));
    
    // Add downloaded neural voices
    const downloadedIds = this.settingsService.downloadedVoices();
    const neuralList = PREMIUM_VOICES
      .filter(pv => downloadedIds.includes(pv.id))
      .map(v => ({ name: `${v.name} (Premium)`, lang: v.lang, isNeural: true }));

    return [...neuralList, ...list];
  }
}
