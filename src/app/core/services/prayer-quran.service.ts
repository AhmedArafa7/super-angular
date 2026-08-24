import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';

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
  translation?: string;
  tafsir?: string;
}

export interface TafsirAyah {
  ayahNumber: number;
  text: string;
}

export type ReadingMode = 'normal' | 'mushaf' | 'translation' | 'large';
export type ReciterId = 'alafasy' | 'abdulbasit' | 'minshawi' | 'husary' | 'shaatree';

export interface Reciter {
  id: ReciterId;
  name: string;
  url: string;
}

export const RECITERS: Reciter[] = [
  { id: 'alafasy', name: 'مشاري العفاسي', url: 'https://server7.mp3quran.net/afs/' },
  { id: 'abdulbasit', name: 'عبدالباسط عبدالصمد', url: 'https://server8.mp3quran.net/abdulbasit-mujawwad/' },
  { id: 'minshawi', name: 'محمد صديق المنشاوي', url: 'https://server10.mp3quran.net/minshawi-mujawwad/' },
  { id: 'husary', name: 'محمود خليل الحصري', url: 'https://server13.mp3quran.net/husary/' },
  { id: 'shaatree', name: 'أبوبكر الشاطري', url: 'https://server16.mp3quran.net/shaatree/' }
];

import { ALL_SURAHS } from '../constants/quran-surahs.data';

@Injectable({ providedIn: 'root' })
export class PrayerQuranService {
  private http = inject(HttpClient);

  // Prayer state
  timings = signal<PrayerTimings | null>(null);
  nextPrayer = signal<{ name: string; remaining: string } | null>(null);
  isLoadingPrayer = signal(false);
  isRefreshingInBackground = signal(false);
  calculationMethod = signal(3);
  asrMethod = signal(0);
  timeFormat = signal<'12h' | '24h'>('12h');
  notificationMinutes = signal(10);
  autoRefreshDays = signal<number>(1); // 1 = daily, 2, 3, 7, 30, 0 = manual only
  lastUpdated = signal<number | null>(null);
  lastFetchedDate = signal<string>('');

  // Location
  latitude = signal<number | null>(null);
  longitude = signal<number | null>(null);
  city = signal<string>('جاري التحديد...');

  // Computed prayer freshness
  daysSinceLastUpdate = computed(() => {
    const ts = this.lastUpdated();
    if (!ts) return 0;
    const diffMs = Date.now() - ts;
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  });

  isStalePrayer = computed(() => {
    const ts = this.lastUpdated();
    if (!ts) return false;
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const fetchedDate = this.lastFetchedDate();
    if (fetchedDate && fetchedDate !== todayStr) return true;
    return this.daysSinceLastUpdate() >= 1;
  });

  prayerStatusMessage = computed(() => {
    if (!this.timings()) return 'لم يتم تحديد المواقيت بعد';
    const days = this.daysSinceLastUpdate();
    if (days === 0 && !this.isStalePrayer()) return 'مواقيت اليوم محدثة ✓';
    if (days === 1 || this.isStalePrayer()) return 'مواقيت محفوظة من الأمس (يُنصح بإعادة الطلب)';
    return `مواقيت محفوظة منذ ${days} أيام (يُنصح بإعادة الطلب)`;
  });

  // Quran state - initialized with offline complete 114 Surahs dataset
  surahs = signal<Surah[]>(ALL_SURAHS);
  currentSurah = signal<Surah | null>(null);
  ayahs = signal<Ayah[]>([]);
  isLoadingQuran = signal(false);
  bookmarks = signal<Record<number, number>>({});
  readingProgress = signal<Record<number, number>>({});
  fontSize = signal(24);
  translation = signal<'ar' | 'en' | 'none'>('ar');
  currentAudioSurah = signal<number | null>(null);
  isPlaying = signal(false);

  // Audio
  private audioPlayer: HTMLAudioElement | null = null;
  audioProgress = signal(0);
  audioDuration = signal(0);

  // Reciter
  selectedReciter = signal<ReciterId>('alafasy');
  reciters = RECITERS;

  private db: any = null;
  private readonly DB_NAME = 'QuranDB';
  private readonly STORE_NAME = 'Surahs';

  // Reading mode
  readingMode = signal<ReadingMode>('normal');

  // Tafsir
  tafsirData = signal<TafsirAyah[]>([]);
  isLoadingTafsir = signal(false);
  showTafsir = signal(false);
  selectedTafsir = signal<'ibnkathir' | 'jalalayn' | 'saadi'>('ibnkathir');

  // Computed
  formattedDate = computed(() => {
    const ts = this.lastUpdated();
    if (!ts) return '';
    return new Intl.DateTimeFormat('ar-EG', {
      month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric'
    }).format(new Date(ts));
  });

  constructor() {
    this.initDB();
    this.loadPersistedData();
    this.initPrayerChecker();
    this.loadSurahs();
    this.checkAndAutoRefreshPrayerTimes();
  }

  notificationPermission = signal<'granted' | 'denied' | 'default'>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );

  private checkPrayerNotificationsInterval: any = null;
  private notifiedPrayersToday: string = '';

  private parseMinutes(timeStr: string): number {
    if (!timeStr) return -1;
    const match = timeStr.match(/(\d{1,2}):(\d{1,2})/);
    if (!match) return -1;
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    if (isNaN(hours) || isNaN(minutes)) return -1;
    return hours * 60 + minutes;
  }

  private initPrayerChecker() {
    if (this.checkPrayerNotificationsInterval) clearInterval(this.checkPrayerNotificationsInterval);

    this.checkPrayerNotificationsInterval = setInterval(() => {
      const timings = this.timings();
      if (!timings) return;

      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      if (this.notifiedPrayersToday !== todayStr) {
        this.notifiedPrayersToday = todayStr;
        localStorage.setItem('notified_prayers_date', todayStr);
        localStorage.removeItem('notified_prayers_list');
      }

      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentTotalMinutes = currentHours * 60 + currentMinutes;

      const prayers = [
        { key: 'Fajr', name: 'الفجر' },
        { key: 'Dhuhr', name: 'الظهر' },
        { key: 'Asr', name: 'العصر' },
        { key: 'Maghrib', name: 'المغرب' },
        { key: 'Isha', name: 'العشاء' }
      ];

      const notifiedListJson = localStorage.getItem('notified_prayers_list') || '[]';
      let notifiedList: string[] = [];
      try { notifiedList = JSON.parse(notifiedListJson); } catch {}

      for (const p of prayers) {
        const timeStr = (timings as any)[p.key];
        if (!timeStr) continue;

        const prayerTotalMinutes = this.parseMinutes(timeStr);
        if (prayerTotalMinutes < 0) continue;

        const offsetMin = this.notificationMinutes();
        const targetTotalMinutes = prayerTotalMinutes - offsetMin;

        // Notification for configured offset (e.g. 10 mins before)
        const notificationKey = `${todayStr}_${p.key}_offset_${offsetMin}`;
        if (
          currentTotalMinutes >= targetTotalMinutes &&
          currentTotalMinutes <= targetTotalMinutes + 1 &&
          !notifiedList.includes(notificationKey)
        ) {
          this.triggerNotification(p.name, offsetMin);
          notifiedList.push(notificationKey);
          localStorage.setItem('notified_prayers_list', JSON.stringify(notifiedList));
        }

        // Also notify at the exact Adhan moment if offset is > 0
        if (offsetMin > 0) {
          const adhanKey = `${todayStr}_${p.key}_exact_0`;
          if (
            currentTotalMinutes >= prayerTotalMinutes &&
            currentTotalMinutes <= prayerTotalMinutes + 1 &&
            !notifiedList.includes(adhanKey)
          ) {
            this.triggerNotification(p.name, 0);
            notifiedList.push(adhanKey);
            localStorage.setItem('notified_prayers_list', JSON.stringify(notifiedList));
          }
        }
      }
    }, 10000);
  }

  playNotificationSound() {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      const now = ctx.currentTime;
      const notes = [
        { freq: 523.25, time: 0.0, dur: 0.4 },  // C5
        { freq: 659.25, time: 0.25, dur: 0.4 }, // E5
        { freq: 783.99, time: 0.5, dur: 0.5 },  // G5
        { freq: 1046.50, time: 0.8, dur: 1.2 }  // C6
      ];

      notes.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + time);
        
        gain.gain.setValueAtTime(0.0001, now + time);
        gain.gain.exponentialRampToValueAtTime(0.3, now + time + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + time);
        osc.stop(now + time + dur);
      });
    } catch (e) {
      console.warn('Audio chime fallback error:', e);
    }
  }

  async requestNotificationPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    try {
      const perm = await Notification.requestPermission();
      this.notificationPermission.set(perm);
      if (perm === 'granted') {
        this.testNotification();
        return true;
      }
    } catch (e) {
      console.error('Error requesting permission', e);
    }
    return false;
  }

  testNotification() {
    this.playNotificationSound();
    const title = 'اختبار تنبيه مواقيت الصلاة 🕌';
    const body = `يعمل التنبيه بنجاح لمدينة ${this.city()}. تقبل الله منا ومنكم.`;

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, { body, icon: '/favicon.ico' });
      } catch {}
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hisn-toast', {
        detail: 'تم تشغيل التنبيه التجريبي وتحديث الأذونات بنجاح 🔔'
      }));
      window.dispatchEvent(new CustomEvent('prayer-alert-event', {
        detail: { title, body, prayerName: 'تجربة التنبيه', minutesBefore: 10 }
      }));
    }
  }

  private triggerNotification(prayerName: string, minutesBefore: number) {
    const title = minutesBefore === 0 
      ? `حَانَ الآن موعد أذان ${prayerName} 🕌` 
      : `تنبيه: اقترب موعد أذان ${prayerName} (بقي ${minutesBefore} دقائق) ⏰`;
    const body = minutesBefore === 0 
      ? `حان وقت الصلاة في مدينة ${this.city()}. تقبل الله منا ومنكم صالح الأعمال.` 
      : `استعد لصلاة ${prayerName} في مدينة ${this.city()}.`;

    // 1. Play synthesized tone
    this.playNotificationSound();

    // 2. Browser Desktop Notification
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, { body, icon: '/favicon.ico' });
      } catch (e) {
        console.error('Notification error', e);
      }
    }

    // 3. In-App Notification events
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hisn-toast', { detail: title }));
      window.dispatchEvent(new CustomEvent('prayer-alert-event', {
        detail: { title, body, prayerName, minutesBefore }
      }));
    }
  }

  private initDB() {
    const request = indexedDB.open(this.DB_NAME, 1);
    request.onupgradeneeded = (e: any) => {
      this.db = e.target.result;
      if (!this.db!.objectStoreNames.contains(this.STORE_NAME)) {
        this.db!.createObjectStore(this.STORE_NAME);
      }
    };
    request.onsuccess = (e: any) => {
      this.db = e.target.result;
    };
  }

  private async getFromDB(key: number): Promise<Ayah[] | null> {
    return new Promise((resolve) => {
      if (!this.db) { resolve(null); return; }
      const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  }

  private async saveToDB(key: number, value: Ayah[]) {
    if (!this.db) return;
    const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
    const store = transaction.objectStore(this.STORE_NAME);
    store.put(value, key);
  }

  private loadPersistedData() {
    if (typeof window === 'undefined') return;

    const prayerSettings = localStorage.getItem('prayer_settings');
    if (prayerSettings) {
      try {
        const s = JSON.parse(prayerSettings);
        this.calculationMethod.set(s.method ?? 3);
        this.asrMethod.set(s.asr ?? 0);
        this.timeFormat.set(s.format ?? '12h');
        this.notificationMinutes.set(s.notifications ?? 10);
        if (s.autoRefreshDays !== undefined) {
          this.autoRefreshDays.set(s.autoRefreshDays);
        }
      } catch {}
    }

    const cachedPrayer = localStorage.getItem('prayer_cached_data');
    if (cachedPrayer) {
      try {
        const c = JSON.parse(cachedPrayer);
        if (c.timings) this.timings.set(c.timings);
        if (c.city) this.city.set(c.city);
        if (c.latitude) this.latitude.set(c.latitude);
        if (c.longitude) this.longitude.set(c.longitude);
        if (c.lastUpdated) this.lastUpdated.set(c.lastUpdated);
        if (c.lastFetchedDate) this.lastFetchedDate.set(c.lastFetchedDate);
        if (c.autoRefreshDays !== undefined) this.autoRefreshDays.set(c.autoRefreshDays);

        if (this.timings()) {
          this.calculateNextPrayer();
        }
      } catch {}
    }

    const reciter = localStorage.getItem('quran_reciter') as ReciterId | null;
    if (reciter) this.selectedReciter.set(reciter);

    const mode = localStorage.getItem('quran_reading_mode') as ReadingMode | null;
    if (mode) this.readingMode.set(mode);

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

  async checkAndAutoRefreshPrayerTimes() {
    const hasTimings = !!this.timings();
    const lastUp = this.lastUpdated();
    const autoDays = this.autoRefreshDays();

    // If no data cached at all, fetch initial data
    if (!hasTimings) {
      await this.initLocationAndPrayer();
      return;
    }

    // If manual only mode (0), don't auto-refresh
    if (autoDays === 0) {
      return;
    }

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const isDifferentDay = this.lastFetchedDate() !== todayStr;
    const daysPassed = lastUp ? Math.floor((Date.now() - lastUp) / (1000 * 60 * 60 * 24)) : 999;

    // Check if renewal threshold reached
    if ((autoDays === 1 && isDifferentDay) || daysPassed >= autoDays) {
      this.refreshPrayerTimesInBackground();
    }
  }

  async refreshPrayerTimesInBackground() {
    if (this.isRefreshingInBackground()) return;
    this.isRefreshingInBackground.set(true);
    try {
      const lat = this.latitude() ?? 21.3891;
      const lng = this.longitude() ?? 39.8579;
      await this.fetchPrayerTimes(lat, lng, true);
    } catch (e) {
      console.warn('Background prayer refresh skipped/failed', e);
    } finally {
      this.isRefreshingInBackground.set(false);
    }
  }

  async refreshPrayerTimesManually(forceLocation = false) {
    this.isLoadingPrayer.set(true);
    try {
      if (forceLocation || !this.latitude() || !this.longitude()) {
        await this.initLocationAndPrayer();
      } else {
        await this.fetchPrayerTimes(this.latitude()!, this.longitude()!);
      }
    } finally {
      this.isLoadingPrayer.set(false);
    }
  }

  private async initLocationAndPrayer() {
    this.isLoadingPrayer.set(true);
    try {
      const position = await this.getCurrentPosition();
      this.latitude.set(position.coords.latitude);
      this.longitude.set(position.coords.longitude);
      await this.fetchPrayerTimes(position.coords.latitude, position.coords.longitude);
      this.reverseGeocode(position.coords.latitude, position.coords.longitude);
    } catch {
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
        catchError(() => of({ latitude: 21.3891, longitude: 39.8579, city: 'مكة المكرمة' }))
      ).toPromise();

      if (res) {
        this.latitude.set(res.latitude);
        this.longitude.set(res.longitude);
        this.city.set(res.city || 'مكة المكرمة');
        await this.fetchPrayerTimes(res.latitude, res.longitude);
      }
    } catch {
      this.latitude.set(21.3891);
      this.longitude.set(39.8579);
      this.city.set('مكة المكرمة');
      await this.fetchPrayerTimes(21.3891, 39.8579);
    }
  }

  async fetchPrayerTimes(lat: number, lng: number, silent = false) {
    if (!silent) {
      this.isLoadingPrayer.set(true);
    }
    try {
      const date = new Date();
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const dateKey = `${year}-${month}-${day}`;

      const url = `https://api.aladhan.com/v1/timings/${day}-${month}-${year}`;
      const params = {
        latitude: lat.toString(),
        longitude: lng.toString(),
        method: this.calculationMethod().toString(),
        school: this.asrMethod().toString()
      };

      const res = await this.http.get<any>(url, { params }).pipe(
        catchError(() => of(null))
      ).toPromise();

      if (res?.data?.timings) {
        this.timings.set(res.data.timings);
        this.lastUpdated.set(Date.now());
        this.lastFetchedDate.set(dateKey);
        this.calculateNextPrayer();
        this.savePrayerSettings();
      }
    } catch (e) {
      console.error('Failed to fetch prayer times', e);
    } finally {
      if (!silent) {
        this.isLoadingPrayer.set(false);
      }
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
      const prayerMinutes = this.parseMinutes(prayer.time);
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

    const fajrBaseMinutes = this.parseMinutes(timings.Fajr);
    const fajrMinutes = fajrBaseMinutes + 1440;
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
        this.savePrayerCache();
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

  setAutoRefreshDays(days: number) {
    this.autoRefreshDays.set(days);
    this.savePrayerSettings();
    if (days > 0 && this.isStalePrayer()) {
      this.refreshPrayerTimesInBackground();
    }
  }

  setNotificationMinutes(min: number) {
    this.notificationMinutes.set(min);
    this.savePrayerSettings();
    if (min > 0 && 'Notification' in window) {
      Notification.requestPermission();
    }
  }

  private savePrayerCache() {
    if (typeof window === 'undefined') return;
    localStorage.setItem('prayer_cached_data', JSON.stringify({
      timings: this.timings(),
      city: this.city(),
      latitude: this.latitude(),
      longitude: this.longitude(),
      lastUpdated: this.lastUpdated(),
      lastFetchedDate: this.lastFetchedDate(),
      autoRefreshDays: this.autoRefreshDays()
    }));
  }

  private savePrayerSettings() {
    if (typeof window === 'undefined') return;
    localStorage.setItem('prayer_settings', JSON.stringify({
      method: this.calculationMethod(),
      asr: this.asrMethod(),
      format: this.timeFormat(),
      notifications: this.notificationMinutes(),
      autoRefreshDays: this.autoRefreshDays()
    }));
    this.savePrayerCache();
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
    if (this.surahs().length === 0) {
      this.surahs.set(ALL_SURAHS);
    }
    try {
      const res = await this.http.get<any>('https://api.alquran.cloud/v1/surah').pipe(
        catchError(() => of(null))
      ).toPromise();

      if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
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
      // Fallback already active with ALL_SURAHS
    }
  }

  async loadSurah(surahNumber: number) {
    this.isLoadingQuran.set(true);
    this.currentAudioSurah.set(null);
    this.isPlaying.set(false);
    this.tafsirData.set([]);
    this.showTafsir.set(false);

    try {
      const surah = this.surahs().find(s => s.number === surahNumber) || ALL_SURAHS.find(s => s.number === surahNumber);
      if (surah) this.currentSurah.set(surah);

      // 1. Try IndexedDB
      const cached = await this.getFromDB(surahNumber);
      if (cached && cached.length > 0) {
        this.ayahs.set(cached);
        this.isLoadingQuran.set(false);
        return;
      }

      // 2. Load from Primary API (alquran.cloud)
      let ayahsLoaded = false;
      try {
        const arabicRes = await this.http.get<any>(`https://api.alquran.cloud/v1/surah/${surahNumber}/ar.alafasy`).pipe(
          catchError(() => of(null))
        ).toPromise();

        if (arabicRes?.data?.ayahs && Array.isArray(arabicRes.data.ayahs) && arabicRes.data.ayahs.length > 0) {
          const ayahs = arabicRes.data.ayahs.map((a: any) => ({
            number: a.number,
            text: a.text,
            numberInSurah: a.numberInSurah,
            juz: a.juz,
            manzil: a.manzil,
            page: a.page,
            ruku: a.ruku,
            hizbQuarter: a.hizbQuarter,
            sajda: a.sajda
          }));
          
          this.ayahs.set(ayahs);
          this.saveToDB(surahNumber, ayahs);
          ayahsLoaded = true;
        }
      } catch (e) {}

      // 3. Fallback to secondary API if primary failed (e.g. adblocker or downtime)
      if (!ayahsLoaded) {
        try {
          const fallbackRes = await this.http.get<any>(`https://api.quran.com/api/v4/verses/by_chapter/${surahNumber}?language=ar&words=false&per_page=300&fields=text_uthmani,chapter_id,verse_number,juz_number,page_number`).pipe(
            catchError(() => of(null))
          ).toPromise();

          if (fallbackRes?.verses && Array.isArray(fallbackRes.verses) && fallbackRes.verses.length > 0) {
            const ayahs: Ayah[] = fallbackRes.verses.map((v: any) => ({
              number: v.id || v.verse_number,
              text: v.text_uthmani || v.text_imlaei || '',
              numberInSurah: v.verse_number,
              juz: v.juz_number || 1,
              manzil: 1,
              page: v.page_number || 1,
              ruku: 1,
              hizbQuarter: 1,
              sajda: false
            }));

            this.ayahs.set(ayahs);
            this.saveToDB(surahNumber, ayahs);
            ayahsLoaded = true;
          }
        } catch (e) {}
      }

      // Load translation if needed
      if (this.translation() !== 'none') {
        const transLang = this.translation() === 'en' ? 'en.asad' : 'ar.muyassar';
        const transRes = await this.http.get<any>(`https://api.alquran.cloud/v1/surah/${surahNumber}/${transLang}`).pipe(
          catchError(() => of(null))
        ).toPromise();

        if (transRes?.data?.ayahs) {
          this.ayahs.update(ayahs => ayahs.map((a, i) => ({
            ...a,
            translation: transRes.data.ayahs[i]?.text || ''
          })));
        }
      }

      // Load tafsir if enabled
      if (this.showTafsir()) {
        this.loadTafsir(surahNumber);
      }
    } catch (e) {
      console.error('Failed to load surah', e);
    } finally {
      this.isLoadingQuran.set(false);
    }
  }

  async loadTafsir(surahNumber: number) {
    this.isLoadingTafsir.set(true);
    try {
      const tafsirIds: Record<string, number> = {
        'ibnkathir': 3,
        'jalalayn': 2,
        'saadi': 4
      };
      const tafsirId = tafsirIds[this.selectedTafsir()] ?? 3;

      const res = await this.http.get<any>(
        `https://api.quran.com/api/v4/tafsirs/${tafsirId}?surah_number=${surahNumber}&language=ar`
      ).pipe(catchError(() => of(null))).toPromise();

      if (res?.tafsirs) {
        this.tafsirData.set(res.tafsirs.map((t: any) => ({
          ayahNumber: t.verse_key ? parseInt(t.verse_key.split(':')[1]) : t.id,
          text: t.text.replace(/<[^>]*>/g, '').trim()
        })));
      }
    } catch (e) {
      console.error('Failed to load tafsir', e);
    } finally {
      this.isLoadingTafsir.set(false);
    }
  }

  setReciter(id: ReciterId) {
    this.selectedReciter.set(id);
    localStorage.setItem('quran_reciter', id);
    if (this.currentAudioSurah()) {
      this.playSurah(this.currentAudioSurah()!);
    }
  }

  setReadingMode(mode: ReadingMode) {
    this.readingMode.set(mode);
    localStorage.setItem('quran_reading_mode', mode);
  }

  setSelectedTafsir(tafsir: 'ibnkathir' | 'jalalayn' | 'saadi') {
    this.selectedTafsir.set(tafsir);
    if (this.currentSurah()) {
      this.loadTafsir(this.currentSurah()!.number);
    }
  }

  toggleTafsir() {
    this.showTafsir.update(v => !v);
    if (this.showTafsir() && this.currentSurah()) {
      this.loadTafsir(this.currentSurah()!.number);
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
    if (this.fontSize() < 48) {
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

  // ==================== AUDIO ====================

  playSurah(surahNumber: number) {
    if (this.currentAudioSurah() === surahNumber && this.isPlaying()) {
      this.pauseAudio();
      return;
    }

    this.stopAudio();

    const reciter = this.reciters.find(r => r.id === this.selectedReciter()) ?? this.reciters[0];
    const padded = surahNumber.toString().padStart(3, '0');
    const audioUrl = `${reciter.url}${padded}.mp3`;

    this.audioPlayer = new Audio(audioUrl);
    this.currentAudioSurah.set(surahNumber);
    this.isPlaying.set(true);

    this.audioPlayer.addEventListener('timeupdate', () => {
      if (this.audioPlayer) {
        this.audioProgress.set(this.audioPlayer.currentTime);
        this.audioDuration.set(this.audioPlayer.duration || 0);
      }
    });

    this.audioPlayer.addEventListener('ended', () => {
      this.isPlaying.set(false);
      this.currentAudioSurah.set(null);
      this.audioProgress.set(0);
      this.audioDuration.set(0);
    });

    this.audioPlayer.addEventListener('error', () => {
      this.isPlaying.set(false);
      this.currentAudioSurah.set(null);
    });

    this.audioPlayer.play().catch(e => {
      console.error('Audio play failed', e);
      this.isPlaying.set(false);
      this.currentAudioSurah.set(null);
    });
  }

  pauseAudio() {
    if (this.audioPlayer) {
      this.audioPlayer.pause();
      this.isPlaying.set(false);
    }
  }

  stopAudio() {
    if (this.audioPlayer) {
      this.audioPlayer.pause();
      this.audioPlayer.currentTime = 0;
      this.audioPlayer = null;
    }
    this.isPlaying.set(false);
    this.currentAudioSurah.set(null);
    this.audioProgress.set(0);
    this.audioDuration.set(0);
  }

  seekAudio(time: number) {
    if (this.audioPlayer) {
      this.audioPlayer.currentTime = time;
      this.audioProgress.set(time);
    }
  }

  // ==================== EXPORT/IMPORT ====================

  exportQuranData(): string {
    return JSON.stringify({
      bookmarks: this.bookmarks(),
      progress: this.readingProgress(),
      settings: {
        fontSize: this.fontSize(),
        translation: this.translation(),
        reciter: this.selectedReciter(),
        readingMode: this.readingMode()
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
        if (data.settings.reciter) this.selectedReciter.set(data.settings.reciter);
        if (data.settings.readingMode) this.readingMode.set(data.settings.readingMode);
        this.saveQuranSettings();
      }
      return true;
    } catch {
      return false;
    }
  }

  exportAllData(): string {
    return JSON.stringify({
      quran: {
        bookmarks: this.bookmarks(),
        progress: this.readingProgress()
      },
      prayer: {
        method: this.calculationMethod(),
        asr: this.asrMethod(),
        format: this.timeFormat(),
        notifications: this.notificationMinutes(),
        autoRefreshDays: this.autoRefreshDays()
      },
      settings: {
        reciter: this.selectedReciter(),
        readingMode: this.readingMode()
      },
      timestamp: Date.now()
    }, null, 2);
  }

  importAllData(json: string): boolean {
    try {
      const data = JSON.parse(json);
      if (data.quran) {
        if (data.quran.bookmarks) {
          this.bookmarks.set(data.quran.bookmarks);
          localStorage.setItem('quran_bookmarks', JSON.stringify(data.quran.bookmarks));
        }
        if (data.quran.progress) {
          this.readingProgress.set(data.quran.progress);
          localStorage.setItem('quran_progress', JSON.stringify(data.quran.progress));
        }
      }
      if (data.prayer) {
        this.calculationMethod.set(data.prayer.method ?? 3);
        this.asrMethod.set(data.prayer.asr ?? 0);
        this.timeFormat.set(data.prayer.format ?? '12h');
        this.notificationMinutes.set(data.prayer.notifications ?? 10);
        if (data.prayer.autoRefreshDays !== undefined) {
          this.autoRefreshDays.set(data.prayer.autoRefreshDays);
        }
        this.savePrayerSettings();
      }
      if (data.settings) {
        if (data.settings.reciter) this.setReciter(data.settings.reciter);
        if (data.settings.readingMode) this.setReadingMode(data.settings.readingMode);
      }
      return true;
    } catch {
      return false;
    }
  }

  // For compatibility with HisnComponent
  azkarCounts = signal<Record<number, number>>({});
  tasbihTotal = signal(0);
  tasbihCompletedCycles = signal(0);
  tasbihSessionCount = signal(0);
  wirdItems = signal<WirdItem[]>([]);

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
