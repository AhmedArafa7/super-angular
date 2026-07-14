import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, of } from 'rxjs';

export interface PrayerTimings {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
  Imsak: string;
  Midnight: string;
  Firstthird: string;
  Lastthird: string;
}

export interface CalculationMethod {
  id: number;
  name: string;
  params: any;
}

export interface Surah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  revelationType: string;
  numberOfAyahs: number;
}

export interface Ayah {
  number: number;
  text: string;
  numberInSurah: number;
  juz: number;
  manzil: number;
  page: number;
  ruku: number;
  hizbQuarter: number;
  sajda: boolean | { id: number; recommended: boolean; obligatory: boolean };
}

@Injectable({ providedIn: 'root' })
export class PrayerQuranService {
  private http = inject(HttpClient);
  
  // Prayer state
  timings = signal<PrayerTimings | null>(null);
  nextPrayer = signal<{ name: string; remaining: string } | null>(null);
  isLoadingPrayer = signal(false);
  calculationMethod = signal(3); // Muslim World League
  asrMethod = signal(0); // Shafi
  timeFormat = signal<'12h' | '24h'>('12h');
  notificationMinutes = signal(10);
  lastUpdated = signal<number | null>(null);
  
  // Location
  latitude = signal<number | null>(null);
  longitude = signal<number | null>(null);
  city = signal<string>('جاري التحديد...');
  
  // Quran state
  surahs = signal<Surah[]>([]);
  currentSurah = signal<Surah | null>(null);
  ayahs = signal<Ayah[]>([]);
  isLoadingQuran = signal(false);
  bookmarks = signal<Record<number, number>>({});
  readingProgress = signal<Record<number, number>>({});
  fontSize = signal(24);
  translation = signal<'ar' | 'en' | 'none'>('ar');
  audioPlayer: HTMLAudioElement | null = null;
  currentAudioSurah = signal<number | null>(null);
  isPlaying = signal(false);
  
  // Computed
  formattedDate = computed(() => {
    const ts = this.lastUpdated();
    if (!ts) return '';
    return new Intl.DateTimeFormat('ar-EG', { 
      month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' 
    }).format(new Date(ts));
  });

  constructor() {
    this.loadPersistedData();
    this.initLocationAndPrayer();
    this.loadSurahs();
  }

  private loadPersistedData() {
    if (typeof window === 'undefined') return;
    
    // Prayer settings
    const prayerSettings = localStorage.getItem('prayer_settings');
    if (prayerSettings) {
      try {
        const s = JSON.parse(prayerSettings);
        this.calculationMethod.set(s.method ?? 3);
        this.asrMethod.set(s.asr ?? 0);
        this.timeFormat.set(s.format ?? '12h');
        this.notificationMinutes.set(s.notifications ?? 10);
      } catch {}
    }
    
    // Quran data
    this.loadBookmarks();
    this.loadReadingProgress();
    this.loadQuranSettings();
  }

  private loadQuranSettings() {
    const settings = localStorage.getItem('quran_settings');
    if (settings) {
      try {
        const s = JSON.parse(settings);
        this.fontSize.set(s.fontSize ?? 24);
        this.translation.set(s.translation ?? 'ar');
      } catch {}
    }
  }

  private saveQuranSettings() {
    localStorage.setItem('quran_settings', JSON.stringify({
      fontSize: this.fontSize(),
      translation: this.translation()
    }));
  }

  // ==================== PRAYER TIMES ====================
  
  private async initLocationAndPrayer() {
    this.isLoadingPrayer.set(true);
    
    try {
      // Try to get location
      const position = await this.getCurrentPosition();
      this.latitude.set(position.coords.latitude);
      this.longitude.set(position.coords.longitude);
      await this.fetchPrayerTimes(position.coords.latitude, position.coords.longitude);
      this.reverseGeocode(position.coords.latitude, position.coords.longitude);
    } catch (e) {
      // Fallback to IP-based location or default (Makkah)
      console.warn('Location denied, using IP fallback');
      await this.fetchByIP();
    } finally {
      this.isLoadingPrayer.set(false);
    }
  }

  private getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      });
    });
  }

  private async fetchByIP() {
    try {
      const res = await this.http.get<any>('https://ipapi.co/json/').pipe(
        catchError(() => of({ latitude: 21.3891, longitude: 39.8579, city: 'Makkah' }))
      ).toPromise();
      
      if (res) {
        this.latitude.set(res.latitude);
        this.longitude.set(res.longitude);
        this.city.set(res.city || 'مكة المكرمة');
        await this.fetchPrayerTimes(res.latitude, res.longitude);
      }
    } catch {
      // Ultimate fallback - Makkah
      this.latitude.set(21.3891);
      this.longitude.set(39.8579);
      this.city.set('مكة المكرمة');
      await this.fetchPrayerTimes(21.3891, 39.8579);
    }
  }

  async fetchPrayerTimes(lat: number, lng: number) {
    this.isLoadingPrayer.set(true);
    try {
      const date = new Date();
      const day = date.getDate();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      
      const url = `https://api.aladhan.com/v1/timings/${day}-${month}-${year}`;
      const params = {
        latitude: lat.toString(),
        longitude: lng.toString(),
        method: this.calculationMethod().toString(),
        school: this.asrMethod().toString(),
        timezonestring: 'auto'
      };
      
      const res = await this.http.get<any>(url, { params }).pipe(
        catchError(() => of(null))
      ).toPromise();
      
      if (res?.data?.timings) {
        this.timings.set(res.data.timings);
        this.lastUpdated.set(Date.now());
        this.calculateNextPrayer();
        this.savePrayerSettings();
      }
    } catch (e) {
      console.error('Failed to fetch prayer times', e);
    } finally {
      this.isLoadingPrayer.set(false);
    }
  }

  private calculateNextPrayer() {
    const timings = this.timings();
    if (!timings) return;
    
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    const prayers = [
      { name: 'الفجر', time: timings.Fajr },
      { name: 'الشروق', time: timings.Sunrise },
      { name: 'الظهر', time: timings.Dhuhr },
      { name: 'العصر', time: timings.Asr },
      { name: 'المغرب', time: timings.Maghrib },
      { name: 'العشاء', time: timings.Isha }
    ];
    
    for (const prayer of prayers) {
      const [h, m] = prayer.time.split(':').map(Number);
      const prayerMinutes = h * 60 + m;
      if (prayerMinutes > currentMinutes) {
        const diff = prayerMinutes - currentMinutes;
        const hours = Math.floor(diff / 60);
        const minutes = diff % 60;
        this.nextPrayer.set({
          name: prayer.name,
          remaining: `${hours > 0 ? hours + 'س ' : ''}${minutes}د`
        });
        return;
      }
    }
    
    // Next day Fajr
    const [h, m] = timings.Fajr.split(':').map(Number);
    const fajrMinutes = h * 60 + m + 1440;
    const diff = fajrMinutes - currentMinutes;
    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;
    this.nextPrayer.set({
      name: 'الفجر (غداً)',
      remaining: `${hours > 0 ? hours + 'س ' : ''}${minutes}د`
    });
  }

  private async reverseGeocode(lat: number, lng: number) {
    try {
      const res = await this.http.get<any>(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=ar`).pipe(
        catchError(() => of(null))
      ).toPromise();
      
      if (res) {
        this.city.set(res.city || res.locality || res.principalSubdivision || 'موقع غير معروف');
      }
    } catch {}
  }

  setCalculationMethod(method: number) {
    this.calculationMethod.set(method);
    this.savePrayerSettings();
    if (this.latitude() && this.longitude()) {
      this.fetchPrayerTimes(this.latitude()!, this.longitude()!);
    }
  }

  setAsrMethod(method: number) {
    this.asrMethod.set(method);
    this.savePrayerSettings();
    if (this.latitude() && this.longitude()) {
      this.fetchPrayerTimes(this.latitude()!, this.longitude()!);
    }
  }

  setTimeFormat(format: '12h' | '24h') {
    this.timeFormat.set(format);
    this.savePrayerSettings();
  }

  setNotificationMinutes(min: number) {
    this.notificationMinutes.set(min);
    this.savePrayerSettings();
    if (min > 0 && 'Notification' in window) {
      Notification.requestPermission();
    }
  }

  private savePrayerSettings() {
    localStorage.setItem('prayer_settings', JSON.stringify({
      method: this.calculationMethod(),
      asr: this.asrMethod(),
      format: this.timeFormat(),
      notifications: this.notificationMinutes()
    }));
  }

  formatTime(time: string): string {
    if (!time) return '--:--';
    if (this.timeFormat() === '24h') return time;
    
    const [hours, minutes] = time.split(':').map(Number);
    const ampm = hours >= 12 ? 'م' : 'ص';
    const h12 = hours % 12 || 12;
    return `${h12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  }

  // ==================== QURAN ====================

  private async loadSurahs() {
    try {
      const res = await this.http.get<any>('https://api.alquran.cloud/v1/surah').pipe(
        catchError(() => of({ data: [] }))
      ).toPromise();
      
      if (res?.data) {
        this.surahs.set(res.data.map((s: any) => ({
          number: s.number,
          name: s.name,
          englishName: s.englishName,
          englishNameTranslation: s.englishNameTranslation,
          revelationType: s.revelationType,
          numberOfAyahs: s.numberOfAyahs
        })));
      }
    } catch (e) {
      console.error('Failed to load surahs', e);
    }
  }

  async loadSurah(surahNumber: number) {
    this.isLoadingQuran.set(true);
    this.currentAudioSurah.set(null);
    this.isPlaying.set(false);
    
    try {
      const surah = this.surahs().find(s => s.number === surahNumber);
      if (surah) this.currentSurah.set(surah);

      // Load Arabic text
      const arabicRes = await this.http.get<any>(`https://api.alquran.cloud/v1/surah/${surahNumber}/ar.alafasy`).pipe(
        catchError(() => of(null))
      ).toPromise();
      
      if (arabicRes?.data?.ayahs) {
        this.ayahs.set(arabicRes.data.ayahs.map((a: any) => ({
          number: a.number,
          text: a.text,
          numberInSurah: a.numberInSurah,
          juz: a.juz,
          manzil: a.manzil,
          page: a.page,
          ruku: a.ruku,
          hizbQuarter: a.hizbQuarter,
          sajda: a.sajda
        })));
      }

      // Load translation if needed
      if (this.translation() !== 'ar') {
        const transRes = await this.http.get<any>(`https://api.alquran.cloud/v1/surah/${surahNumber}/en.asad`).pipe(
          catchError(() => of(null))
        ).toPromise();
        
        if (transRes?.data?.ayahs) {
          this.ayahs.update(ayahs => ayahs.map((a, i) => ({
            ...a,
            translation: transRes.data.ayahs[i]?.text || ''
          })));
        }
      }

      // Restore bookmark
      const bookmark = this.getBookmark(surahNumber);
      if (bookmark > 1) {
        // Scroll to bookmarked ayah (handled in component)
      }
    } catch (e) {
      console.error('Failed to load surah', e);
    } finally {
      this.isLoadingQuran.set(false);
    }
  }

  private loadBookmarks() {
    try {
      const saved = localStorage.getItem('quran_bookmarks');
      if (saved) this.bookmarks.set(JSON.parse(saved));
    } catch {}
  }

  private loadReadingProgress() {
    try {
      const saved = localStorage.getItem('quran_progress');
      if (saved) this.readingProgress.set(JSON.parse(saved));
    } catch {}
  }

  saveBookmark(surahNumber: number, ayahNumber: number) {
    this.bookmarks.update(b => ({ ...b, [surahNumber]: ayahNumber }));
    localStorage.setItem('quran_bookmarks', JSON.stringify(this.bookmarks()));
  }

  getBookmark(surahNumber: number): number {
    return this.bookmarks()[surahNumber] || 1;
  }

  updateReadingProgress(surahNumber: number, ayahNumber: number) {
    this.readingProgress.update(p => ({ ...p, [surahNumber]: ayahNumber }));
    localStorage.setItem('quran_progress', JSON.stringify(this.readingProgress()));
  }

  getProgress(surahNumber: number): number {
    const surah = this.surahs().find(s => s.number === surahNumber);
    if (!surah) return 0;
    const progress = this.readingProgress()[surahNumber] || 1;
    return Math.round((progress / surah.numberOfAyahs) * 100);
  }

  increaseFontSize() { 
    if (this.fontSize() < 42) { 
      this.fontSize.update(v => v + 2); 
      this.saveQuranSettings();
    }
  }

  decreaseFontSize() { 
    if (this.fontSize() > 16) { 
      this.fontSize.update(v => v - 2); 
      this.saveQuranSettings();
    }
  }

  setTranslation(t: 'ar' | 'en' | 'none') {
    this.translation.set(t);
    this.saveQuranSettings();
    if (this.currentSurah()) {
      this.loadSurah(this.currentSurah()!.number);
    }
  }

  // Audio playback
  playSurah(surahNumber: number) {
    if (this.currentAudioSurah() === surahNumber && this.isPlaying()) {
      this.pauseAudio();
      return;
    }
    
    if (this.audioPlayer) {
      this.audioPlayer.pause();
    }
    
    this.audioPlayer = new Audio(`https://verses.quran.com/${surahNumber}.mp3`);
    this.currentAudioSurah.set(surahNumber);
    this.isPlaying.set(true);
    
    this.audioPlayer.onended = () => {
      this.isPlaying.set(false);
      this.currentAudioSurah.set(null);
    };
    
    this.audioPlayer.onerror = () => {
      this.isPlaying.set(false);
      this.currentAudioSurah.set(null);
    };
    
    this.audioPlayer.play().catch(e => {
      console.error('Audio play failed', e);
      this.isPlaying.set(false);
    });
  }

  pauseAudio() {
    if (this.audioPlayer) {
      this.audioPlayer.pause();
      this.isPlaying.set(false);
    }
  }

  // Export/Import
  exportQuranData(): string {
    return JSON.stringify({
      bookmarks: this.bookmarks(),
      progress: this.readingProgress(),
      settings: {
        fontSize: this.fontSize(),
        translation: this.translation()
      },
      timestamp: Date.now()
    }, null, 2);
  }

  importQuranData(json: string): boolean {
    try {
      const data = JSON.parse(json);
      if (data.bookmarks) {
        this.bookmarks.set(data.bookmarks);
        localStorage.setItem('quran_bookmarks', JSON.stringify(data.bookmarks));
      }
      if (data.progress) {
        this.readingProgress.set(data.progress);
        localStorage.setItem('quran_progress', JSON.stringify(data.progress));
      }
      if (data.settings) {
        this.fontSize.set(data.settings.fontSize ?? 24);
        this.translation.set(data.settings.translation ?? 'ar');
        this.saveQuranSettings();
      }
      return true;
    } catch {
      return false;
    }
  }

  // Export all Hisn data
  exportAllData(): string {
    return JSON.stringify({
      azkarCounts: this.azkarCounts(),
      tasbih: {
        total: this.tasbihTotal(),
        cycles: this.tasbihCompletedCycles(),
        session: this.tasbihSessionCount()
      },
      wird: this.wirdItems(),
      quran: {
        bookmarks: this.bookmarks(),
        progress: this.readingProgress()
      },
      prayer: {
        method: this.calculationMethod(),
        asr: this.asrMethod(),
        format: this.timeFormat(),
        notifications: this.notificationMinutes()
      },
      timestamp: Date.now()
    }, null, 2);
  }

  // For compatibility with existing HisnComponent
  azkarCounts = signal<Record<number, number>>({});
  tasbihTotal = signal(0);
  tasbihCompletedCycles = signal(0);
  tasbihSessionCount = signal(0);
  wirdItems = signal<WirdItem[]>([]);

  // Wird methods
  updateWird(wirdId: string, progress: number) {
    this.wirdItems.update(items => {
      const exists = items.find(w => w.id === wirdId);
      if (exists) {
        return items.map(w => w.id === wirdId ? { ...w, progress, lastUpdated: Date.now() } : w);
      }
      return [...items, { id: wirdId, name: 'ورد مخصص', target: 100, progress, lastUpdated: Date.now() }];
    });
  }

  addWird(name: string, target: number) {
    const newWird: WirdItem = {
      id: `wird-${Date.now()}`,
      name,
      target,
      progress: 0,
      lastUpdated: Date.now()
    };
    this.wirdItems.update(items => [...items, newWird]);
  }

  deleteWird(wirdId: string) {
    this.wirdItems.update(items => items.filter(w => w.id !== wirdId));
  }
}

export interface WirdItem {
  id: string;
  name: string;
  target: number;
  progress: number;
  lastUpdated: number;
}