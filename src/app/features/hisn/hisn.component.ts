import { Component, inject, effect, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { HISN_DATA, NAMES_OF_ALLAH, HisnCategory, ZikrItem } from './hisn.model';
import { HisnService } from '../../core/services/hisn.service';
import { PrayerQuranService, ReadingMode, ReciterId, RECITERS } from '../../core/services/prayer-quran.service';

@Component({
  selector: 'app-hisn',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideDynamicIcon],
  templateUrl: './hisn.component.html',
  styleUrls: ['./hisn.component.scss']
})
export class HisnComponent implements OnDestroy {
  private hisnService = inject(HisnService);
  private prayerQuranService = inject(PrayerQuranService);

  private toastListener = ((event: any) => {
    this.toastMessage = event.detail;
    this.showToast = true;
    setTimeout(() => this.showToast = false, 4000);
  }) as EventListener;

  ngOnDestroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('hisn-toast', this.toastListener);
    }
  }

  // Expose signals from services
  wird = this.hisnService.wird;
  quranProgress = this.hisnService.quranProgress;
  tasbihCount = this.hisnService.tasbihCount;
  tasbihTarget = this.hisnService.tasbihTarget;
  tasbihTotal = this.hisnService.tasbihTotal;
  tasbihCompletedCycles = this.hisnService.tasbihCompletedCycles;
  tasbihSessionCount = this.hisnService.tasbihSessionCount;
  customTasbihTarget = 33;

  // Prayer & Quran signals
  timings = this.prayerQuranService.timings;
  nextPrayer = this.prayerQuranService.nextPrayer;
  isLoadingPrayer = this.prayerQuranService.isLoadingPrayer;
  city = this.prayerQuranService.city;
  calculationMethod = this.prayerQuranService.calculationMethod;
  asrMethod = this.prayerQuranService.asrMethod;
  timeFormat = this.prayerQuranService.timeFormat;
  notificationMinutes = this.prayerQuranService.notificationMinutes;
  formattedDate = this.prayerQuranService.formattedDate;

  surahs = this.prayerQuranService.surahs;
  currentSurah = this.prayerQuranService.currentSurah;
  ayahs = this.prayerQuranService.ayahs;
  isLoadingQuran = this.prayerQuranService.isLoadingQuran;
  fontSize = this.prayerQuranService.fontSize;
  translation = this.prayerQuranService.translation;
  bookmarks = this.prayerQuranService.bookmarks;
  isPlaying = this.prayerQuranService.isPlaying;
  currentAudioSurah = this.prayerQuranService.currentAudioSurah;
  audioProgress = this.prayerQuranService.audioProgress;
  audioDuration = this.prayerQuranService.audioDuration;

  // Reciter & reading mode
  selectedReciter = this.prayerQuranService.selectedReciter;
  reciters = RECITERS;
  readingMode = this.prayerQuranService.readingMode;

  // Tafsir
  tafsirData = this.prayerQuranService.tafsirData;
  isLoadingTafsir = this.prayerQuranService.isLoadingTafsir;
  showTafsir = this.prayerQuranService.showTafsir;
  selectedTafsir = this.prayerQuranService.selectedTafsir;

  // Quran search
  surahSearchTerm = '';

  // View tabs state
  activeTab: 'quran' | 'prayers' | 'azkar' | 'wird' | 'names' | 'tasbih' | 'storage' | 'qibla' | 'khatma' = 'quran';
  azkarSearchTerm = '';
  qiblaDirection = 135;
  isLocatingQibla = false;

  // Khatma state
  khatmaDays = 30;
  khatmaCurrentPage = 1;
  totalQuranPages = 604;

  get filteredCategories() {
    if (!this.azkarSearchTerm.trim()) return this.categories;
    const term = this.azkarSearchTerm.trim().toLowerCase();
    return this.categories.filter(c => 
      c.title.toLowerCase().includes(term) ||
      c.items.some(i => i.text.toLowerCase().includes(term) || (i.description && i.description.toLowerCase().includes(term)))
    );
  }

  showAppToast(message: string) {
    this.toastMessage = message;
    this.showToast = true;
    setTimeout(() => this.showToast = false, 4000);
  }

  locateQibla() {
    this.isLocatingQibla = true;
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(pos => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const kaabaLat = 21.4225;
        const kaabaLon = 39.8262;
        const dLon = (kaabaLon - lon) * Math.PI / 180;
        const lat1 = lat * Math.PI / 180;
        const lat2 = kaabaLat * Math.PI / 180;
        const y = Math.sin(dLon) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
        let brng = Math.atan2(y, x) * 180 / Math.PI;
        this.qiblaDirection = (brng + 360) % 360;
        this.isLocatingQibla = false;
        this.showAppToast('تم تحديد اتجاه القبلة بنجاح 🕋');
      }, () => {
        this.isLocatingQibla = false;
        this.qiblaDirection = 135;
        this.showAppToast('تعذر جلب الموقع الجغرافي، تم عرض الاتجاه التقريبي');
      }, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      });
    } else {
      this.isLocatingQibla = false;
      this.showAppToast('المتصفح لا يدعم تحديد الموقع');
    }
  }

  shareText(text: string) {
    if (navigator.share) {
      navigator.share({ title: 'حصن المسلم', text: text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() => {
        this.showAppToast('تم نسخ النص إلى الحافظة 📋');
      }).catch(() => {
        this.showAppToast('تعذر نسخ النص');
      });
    }
  }

  // Wird / Quran states
  wirdItems = this.hisnService.wird;

  // Azkar States
  categories = HISN_DATA;
  selectedCategory: HisnCategory | null = null;
  counts: Record<number, number> = {};
  azkarFontSize = 24;
  isSpeaking: Record<number, boolean> = {};

  // Names of Allah States
  namesOfAllah = NAMES_OF_ALLAH;
  searchTerm = '';

  get filteredNames() {
    if (!this.searchTerm.trim()) return this.namesOfAllah;
    const term = this.searchTerm.trim();
    return this.namesOfAllah.filter(item =>
      item.name.includes(term) || item.meaning.includes(term)
    );
  }

  // Wird form state
  showAddWird = false;
  newWirdName = '';
  newWirdTarget = 100;

  // Toast
  showToast = false;
  toastMessage = '';

  // Prayer methods
  CALCULATION_METHODS = [
    { id: 1, label: 'جامعة العلوم الإسلامية - كراتشي' },
    { id: 2, label: 'رابطة العالم الإسلامي' },
    { id: 3, label: 'الجمعية الفقهية الأمريكية' },
    { id: 4, label: 'أوقاف مصر' },
    { id: 5, label: 'جامعة أم القرى' },
    { id: 7, label: 'معهد الجيوفيزياء - طهران' },
    { id: 8, label: 'تونس' },
    { id: 9, label: 'تركيا' },
    { id: 10, label: 'فرنسا' },
    { id: 11, label: 'روسيا' },
    { id: 12, label: 'ماليزيا' },
    { id: 13, label: 'مجلس الإفتاء الأوروبي' }
  ];

  // Computed for filtered surahs
  get filteredSurahs() {
    if (!this.surahSearchTerm.trim()) return this.surahs();
    const term = this.surahSearchTerm.trim();
    return this.surahs().filter(s =>
      s.name.includes(term) ||
      s.englishName.toLowerCase().includes(term.toLowerCase()) ||
      s.englishNameTranslation.includes(term) ||
      s.number.toString() === term
    );
  }

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('hisn-toast', this.toastListener);
    }
  }

  // Wird methods
  startWird(wirdId: string) {
    this.hisnService.updateWird(wirdId, 0);
  }

  updateProgress(wirdId: string, currentProgress: number, target: number) {
    if (currentProgress < target) {
      this.hisnService.updateWird(wirdId, currentProgress + 1);
    }
  }

  addWird() {
    if (!this.newWirdName.trim()) return;
    this.hisnService.addWird(this.newWirdName.trim(), this.newWirdTarget);
    this.newWirdName = '';
    this.newWirdTarget = 100;
    this.showAddWird = false;
  }

  deleteWird(wirdId: string) {
    this.hisnService.deleteWird(wirdId);
  }

  // Azkar methods
  selectCategory(cat: HisnCategory | null): void {
    this.selectedCategory = cat;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.isSpeaking = {};
  }

  speakZikr(item: ZikrItem): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (this.isSpeaking[item.id]) {
      window.speechSynthesis.cancel();
      this.isSpeaking[item.id] = false;
      return;
    }

    window.speechSynthesis.cancel();
    Object.keys(this.isSpeaking).forEach(k => this.isSpeaking[+k] = false);

    this.hisnService.speakZikr(item.text);
    this.isSpeaking[item.id] = true;
  }

  incrementZikr(item: ZikrItem): void {
    const current = this.counts[item.id] || 0;
    if (current < item.count) {
      const next = current + 1;
      this.counts[item.id] = next;
      this.hisnService.triggerVibration(10);

      if (next === item.count) {
        this.hisnService.playChimeSound();
        this.hisnService.triggerVibration(50);
        this.hisnService.showToast(`اكتمل الذكر: لقد أتممت قراءة الذكر ${item.count} مرة بنجاح.`);
      }
    }
  }

  resetZikr(item: ZikrItem): void {
    this.counts[item.id] = 0;
  }

  resetAllSelectedZikr(): void {
    if (!this.selectedCategory) return;
    for (const item of this.selectedCategory.items) {
      this.counts[item.id] = 0;
    }
    this.hisnService.showToast('تم تصفير جميع عدادات القسم الحالي.');
  }

  getCategoryProgress(): number {
    if (!this.selectedCategory) return 0;
    const items = this.selectedCategory.items;
    if (items.length === 0) return 0;

    let completed = 0;
    for (const item of items) {
      if ((this.counts[item.id] || 0) >= item.count) {
        completed++;
      }
    }
    return Math.round((completed / items.length) * 100);
  }

  increaseAzkarFontSize(): void {
    if (this.azkarFontSize < 36) this.azkarFontSize += 2;
  }

  decreaseAzkarFontSize(): void {
    if (this.azkarFontSize > 18) this.azkarFontSize -= 2;
  }

  // Tasbih methods
  incrementTasbih(): void {
    this.hisnService.incrementTasbih();
  }

  setTasbihTarget(val: number): void {
    this.hisnService.setTasbihTarget(val);
    this.customTasbihTarget = val;
  }

  resetTasbih(): void {
    this.hisnService.resetTasbih();
  }

  get tasbihProgressPercent(): number {
    const target = this.tasbihTarget();
    return target > 0 ? Math.round((this.tasbihCount() / target) * 100) : 0;
  }

  get totalTasbihCycles(): number {
    return this.tasbihTarget() > 0 ? Math.floor(this.tasbihTotal() / this.tasbihTarget()) : 0;
  }

  // Prayer methods
  formatTime(time: string): string {
    return this.prayerQuranService.formatTime(time);
  }

  latitude = this.prayerQuranService.latitude;
  longitude = this.prayerQuranService.longitude;

  fetchPrayerTimes(lat?: number, lng?: number) {
    const lLat = lat ?? this.latitude() ?? 31.0379;
    const lLng = lng ?? this.longitude() ?? 31.3815;
    this.prayerQuranService.fetchPrayerTimes(lLat, lLng);
  }

  setCalculationMethod(method: number) {
    this.prayerQuranService.setCalculationMethod(method);
  }

  setAsrMethod(method: number) {
    this.prayerQuranService.setAsrMethod(method);
  }

  setTimeFormat(format: '12h' | '24h') {
    this.prayerQuranService.setTimeFormat(format);
  }

  setNotificationMinutes(min: number) {
    this.prayerQuranService.setNotificationMinutes(min);
  }

  // Quran methods
  loadSurah(surahNumber: number) {
    this.prayerQuranService.loadSurah(surahNumber);
  }

  getProgress(surahNumber: number): number {
    return this.prayerQuranService.getProgress(surahNumber);
  }

  getBookmark(surahNumber: number): number {
    return this.prayerQuranService.getBookmark(surahNumber);
  }

  saveBookmark(surahNumber: number, ayahNumber: number) {
    this.prayerQuranService.saveBookmark(surahNumber, ayahNumber);
  }

  increaseFontSize() {
    this.prayerQuranService.increaseFontSize();
  }

  decreaseFontSize() {
    this.prayerQuranService.decreaseFontSize();
  }

  setTranslation(t: 'ar' | 'en' | 'none') {
    this.prayerQuranService.setTranslation(t);
  }

  playSurah(surahNumber: number) {
    this.prayerQuranService.playSurah(surahNumber);
  }

  pauseAudio() {
    this.prayerQuranService.pauseAudio();
  }

  stopAudio() {
    this.prayerQuranService.stopAudio();
  }

  setReciter(id: ReciterId) {
    this.prayerQuranService.setReciter(id);
  }

  setReadingMode(mode: ReadingMode) {
    this.prayerQuranService.setReadingMode(mode);
  }

  setSelectedTafsir(tafsir: 'ibnkathir' | 'jalalayn' | 'saadi') {
    this.prayerQuranService.setSelectedTafsir(tafsir);
  }

  toggleTafsir() {
    this.prayerQuranService.toggleTafsir();
  }

  seekAudio(event: Event) {
    const input = event.target as HTMLInputElement;
    this.prayerQuranService.seekAudio(parseFloat(input.value));
  }

  formatAudioTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  goBackToSurahList() {
    this.prayerQuranService.currentSurah.set(null);
    this.prayerQuranService.ayahs.set([]);
    this.prayerQuranService.tafsirData.set([]);
    this.prayerQuranService.stopAudio();
  }

  // Export/Import
  exportQuranData() {
    const data = this.prayerQuranService.exportQuranData();
    this.downloadFile(data, 'quran-backup.json', 'application/json');
  }

  importQuranData(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = this.prayerQuranService.importQuranData(e.target?.result as string);
        this.hisnService.showToast(result ? 'تم الاستيراد بنجاح' : 'فشل الاستيراد - ملف غير صالح');
      };
      reader.readAsText(input.files[0]);
    }
  }

  exportAllData() {
    const data = this.prayerQuranService.exportAllData();
    this.downloadFile(data, 'hisn-complete-backup.json', 'application/json');
  }

  importAllData(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = this.prayerQuranService.importAllData(e.target?.result as string);
        this.hisnService.showToast(result ? 'تم استيراد البيانات الشاملة بنجاح' : 'فشل الاستيراد - ملف غير صالح');
      };
      reader.readAsText(input.files[0]);
    }
  }

  private downloadFile(content: string, filename: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Storage calculation
  calculateStorageUsed(): number {
    if (typeof window === 'undefined') return 0;
    let totalBytes = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const val = localStorage.getItem(key) || '';
        totalBytes += (key.length + val.length) * 2;
      }
    }
    return Math.round((totalBytes / 1024) * 10) / 10;
  }

  calculateStoragePercent(): number {
    return Math.min(100, Math.round((this.calculateStorageUsed() / 512) * 100));
  }

  getTotalAzkarCounts(): number {
    return Object.values(this.counts).reduce((a, b) => a + b, 0);
  }

  Math = Math;

  getCategoryIcon(cat: HisnCategory): string {
    const icons: Record<string, string> = {
      morning: 'sun', evening: 'moon', sleep: 'zap',
      after_prayer: 'target', situations: 'globe', praises: 'sparkles'
    };
    return icons[cat.id] || 'book-open';
  }

  getCategoryIconColor(cat: HisnCategory): string {
    const colors: Record<string, string> = {
      morning: 'text-amber-400', evening: 'text-indigo-400',
      sleep: 'text-purple-400', after_prayer: 'text-emerald-400',
      situations: 'text-cyan-400', praises: 'text-rose-400'
    };
    return colors[cat.id] || 'text-primary';
  }
}
