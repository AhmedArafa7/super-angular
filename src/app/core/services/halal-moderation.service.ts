import { Injectable, signal, inject } from '@angular/core';
import { EncryptionService } from './encryption.service';

export interface HalalEvaluationResult {
  score: number; // 0 to 100
  status: 'safe' | 'unvetted' | 'blocked';
  isWhitelisted: boolean;
  hasMusicWarning: boolean;
  reasons: string[];
}

@Injectable({
  providedIn: 'root'
})
export class HalalModerationService {
  private encryption = inject(EncryptionService);

  // Settings Signals
  readonly strictHalalMode = signal<boolean>(false);
  readonly smartThumbnailBlur = signal<boolean>(false);
  readonly autoAudioFilter = signal<boolean>(true);

  // 1. Explicitly Banned Keywords (Adult, offensive, haram, gambling, blasphemy, etc.)
  private readonly BANNED_KEYWORDS = [
    'porn', 'xxx', 'sexy', 'hot girl', 'bikini', 'nude', 'erotic', 'gamble', 'casino', 'betting', '1xbet',
    'alcohol', 'wine', 'beer', 'dating', 'hookup', 'kissing', 'astrology', 'horoscope', 'tarot', 'witchcraft',
    'إباحي', 'تعري', 'مثير', 'بنات عاريات', 'رقص ساخن', 'كازينو', 'ميسر', 'قمار', 'خمر', 'مشروبات كحولية',
    'ابراج اليوم', 'تاروت', 'سحر وشعوذة', 'شذوذ', 'مثلية', 'إلحاد', 'سب الذات', 'إهانة الدين'
  ];

  // 2. Music & Song Keywords (flagged for automatic instrumental neutralization)
  private readonly MUSIC_KEYWORDS = [
    'music', 'song', 'songs', 'clip', 'official audio', 'official music video', 'mv', 'remix', 'dj', 'concert',
    'lyrics', 'feat', 'ft.', 'vocal', 'pop', 'hip hop', 'rap', 'rock', 'guitar', 'piano', 'beats', 'soundtrack',
    'موسيقى', 'أغنية', 'أغاني', 'كليب', 'فيديو كليب', 'طرب', 'عزف', 'عود', 'بيانو', 'جيتار', 'دي جي', 'ريمكس',
    'حفل غنائي', 'مهرجان', 'كلمات أغنية', 'تراك', 'لحن', 'معازف'
  ];

  // 3. Islamic & Whitelisted Educational Topics (High Confidence Boost)
  private readonly SAFE_BOOST_KEYWORDS = [
    'قرآن', 'تلاوة', 'سورة', 'مصحف', 'تفسير', 'حديث', 'سنة', 'فقه', 'عقيدة', 'سيرة نبوية', 'قصص الأنبياء',
    'محاضرة دينية', 'خطبة الجمعة', 'دعاء', 'أذكار', 'صوتيات إسلامية', 'أناشيد بدون إيقاع',
    'برمجة', 'تطوير الويب', 'ذكاء اصطناعي', 'هياكل البيانات', 'خوارزميات', 'بايثون', 'جافاسكريبت', 'انجلر',
    'شرح', 'كورس', 'دورة تدريبية', 'علوم', 'فيزياء', 'كيمياء', 'فلك', 'وثائقي', 'تاريخ', 'حضارة', 'كتب', 'بودكاست',
    'quran', 'tilawah', 'islamic', 'lecture', 'programming', 'coding', 'tutorial', 'algorithm', 'documentary', 'science'
  ];

  constructor() {
    this.loadSavedSettings();
  }

  private loadSavedSettings(): void {
    try {
      const savedStrict = localStorage.getItem('halaltube_strict_halal_mode');
      if (savedStrict !== null) {
        this.strictHalalMode.set(savedStrict === 'true');
      }

      const savedBlur = localStorage.getItem('halaltube_smart_thumb_blur');
      if (savedBlur !== null) {
        this.smartThumbnailBlur.set(savedBlur === 'true');
      }

      const savedAutoFilter = localStorage.getItem('halaltube_auto_audio_filter');
      if (savedAutoFilter !== null) {
        this.autoAudioFilter.set(savedAutoFilter === 'true');
      }
    } catch (e) {}
  }

  setStrictHalalMode(enabled: boolean): void {
    this.strictHalalMode.set(enabled);
    localStorage.setItem('halaltube_strict_halal_mode', String(enabled));
  }

  setSmartThumbnailBlur(enabled: boolean): void {
    this.smartThumbnailBlur.set(enabled);
    localStorage.setItem('halaltube_smart_thumb_blur', String(enabled));
  }

  setAutoAudioFilter(enabled: boolean): void {
    this.autoAudioFilter.set(enabled);
    localStorage.setItem('halaltube_auto_audio_filter', String(enabled));
  }

  /**
   * Evaluates a video title, description, category, and author against moderation rules.
   */
  evaluateVideo(video: {
    id?: string;
    title?: string;
    description?: string;
    author?: string;
    category?: string;
    isWhitelisted?: boolean;
  }): HalalEvaluationResult {
    if (!video) {
      return { score: 50, status: 'unvetted', isWhitelisted: false, hasMusicWarning: false, reasons: [] };
    }

    // 1. Whitelisted video verified by platform / community
    if (video.isWhitelisted) {
      return {
        score: 100,
        status: 'safe',
        isWhitelisted: true,
        hasMusicWarning: false,
        reasons: ['فيديو موثق ومعتمد في القائمة البيضاء']
      };
    }

    const text = `${video.title || ''} ${video.description || ''} ${video.category || ''} ${video.author || ''}`.toLowerCase();
    const reasons: string[] = [];
    let score = 70;
    let hasMusicWarning = false;

    // Check banned keywords
    for (const kw of this.BANNED_KEYWORDS) {
      if (text.includes(kw.toLowerCase())) {
        return {
          score: 0,
          status: 'blocked',
          isWhitelisted: false,
          hasMusicWarning: true,
          reasons: [`يحتوي على مصطلح محظور: (${kw})`]
        };
      }
    }

    // Check music keywords
    for (const kw of this.MUSIC_KEYWORDS) {
      if (text.includes(kw.toLowerCase())) {
        hasMusicWarning = true;
        score -= 25;
        reasons.push(`قد يحتوي على معازف أو موسيقى (${kw})`);
        break;
      }
    }

    // Check safe boost keywords
    let boostFound = false;
    for (const kw of this.SAFE_BOOST_KEYWORDS) {
      if (text.includes(kw.toLowerCase())) {
        score += 25;
        boostFound = true;
        reasons.push(`محتوى نافع وموثوق: (${kw})`);
        break;
      }
    }

    score = Math.max(0, Math.min(100, score));
    const status: 'safe' | 'unvetted' | 'blocked' = (score >= 80 && !hasMusicWarning) ? 'safe' : 'unvetted';

    return {
      score,
      status,
      isWhitelisted: false,
      hasMusicWarning,
      reasons
    };
  }

  /**
   * Validates if a user's search query is halal safe.
   */
  isQuerySafe(query: string): { isAllowed: boolean; reason?: string; cleanQuery: string } {
    const clean = (query || '').trim().toLowerCase();
    if (!clean) return { isAllowed: true, cleanQuery: '' };

    for (const kw of this.BANNED_KEYWORDS) {
      if (clean.includes(kw.toLowerCase())) {
        return {
          isAllowed: false,
          reason: `كلمة البحث (${kw}) غير مسموح بها في منصة حلال تيوب لحماية المستخدمين.`,
          cleanQuery: clean
        };
      }
    }

    return { isAllowed: true, cleanQuery: clean };
  }

  /**
   * Filters an array of videos according to the active moderation mode.
   */
  filterVideos<T extends { title?: string; isWhitelisted?: boolean; id?: string }>(videos: T[]): T[] {
    if (!videos || videos.length === 0) return [];

    const isStrict = this.strictHalalMode();

    return videos.filter(v => {
      const evaluation = this.evaluateVideo(v as any);
      if (evaluation.status === 'blocked') return false;
      if (isStrict) {
        // Strict mode: Only allow 100% whitelisted or verified safe
        return evaluation.isWhitelisted || evaluation.status === 'safe';
      }
      return true;
    });
  }
}
