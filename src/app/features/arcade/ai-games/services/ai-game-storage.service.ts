import { Injectable, inject, signal } from '@angular/core';
import { AiGameBlueprint, AiGameMutation } from '../models/ai-game.models';
import { FirebaseService } from '../../../../core/services/firebase.service';
import { ArcadeCloudService } from '../../../../core/services/arcade-cloud.service';

@Injectable({
  providedIn: 'root'
})
export class AiGameStorageService {
  private firebase = inject(FirebaseService);
  private cloudService = inject(ArcadeCloudService);

  private readonly STORAGE_KEY = 'si_neuro_ai_games_universe_v1';
  private readonly MUTATION_TOGGLES_KEY = 'si_neuro_ai_game_toggles_v1';

  // Signals
  games = signal<AiGameBlueprint[]>([]);
  activeGame = signal<AiGameBlueprint | null>(null);

  constructor() {
    this.loadFromStorage();
  }

  loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed: AiGameBlueprint[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.games.set(parsed);
          return;
        }
      }
    } catch (e) {
      console.error('Error loading AI games from storage', e);
    }

    // Default Seed Games designed by AI
    const defaultGames: AiGameBlueprint[] = this.getDefaultSeedGames();
    this.games.set(defaultGames);
    this.saveToStorage();
  }

  saveToStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.games()));
      this.syncToCloud();
    } catch (e) {
      console.error('Error saving AI games to storage', e);
    }
  }

  saveGame(game: AiGameBlueprint): void {
    const current = [...this.games()];
    const index = current.findIndex(g => g.id === game.id);
    game.updatedAt = Date.now();

    if (index >= 0) {
      current[index] = { ...game };
    } else {
      current.unshift(game);
    }

    this.games.set(current);
    if (this.activeGame()?.id === game.id) {
      this.activeGame.set({ ...game });
    }
    this.saveToStorage();
  }

  deleteGame(gameId: string): void {
    const updated = this.games().filter(g => g.id !== gameId);
    this.games.set(updated);
    if (this.activeGame()?.id === gameId) {
      this.activeGame.set(null);
    }
    this.saveToStorage();
  }

  getGameById(gameId: string): AiGameBlueprint | undefined {
    return this.games().find(g => g.id === gameId);
  }

  toggleMutation(gameId: string, mutationId: string, isEnabled: boolean): void {
    const game = this.getGameById(gameId);
    if (!game) return;

    const mutation = game.mutations.find(m => m.id === mutationId);
    if (mutation) {
      mutation.isEnabled = isEnabled;
      this.saveGame(game);
    }
  }

  updateProgress(gameId: string, levelCompleted: number, newScore: number): void {
    const game = this.getGameById(gameId);
    if (!game) return;

    if (levelCompleted >= game.maxUnlockedLevel) {
      game.maxUnlockedLevel = levelCompleted + 1;
    }
    game.currentLevelIndex = levelCompleted + 1;
    if (newScore > game.highScore) {
      game.highScore = newScore;
      this.cloudService.submitHighScore(game.id, 'اللاعب الذكي', newScore);
    }
    game.timesPlayed += 1;
    this.saveGame(game);
  }

  private syncToCloud(): void {
    // Cloud sync logic if user is online and authenticated
    try {
      const user = this.firebase.userData();
      if (user && user.uid) {
        // Asynchronous firestore sync can be logged or placed in user profile
      }
    } catch (e) {}
  }

  private getDefaultSeedGames(): AiGameBlueprint[] {
    return [
      {
        id: 'ai_game_quantum_orbit',
        title: 'مدارات الكوانتوم: نبض الفضاء',
        genre: 'orbital_gravity',
        tagline: 'لعبة فيزياء مدارية وتفادي الإشعاعات تبتكر قوانينها تلقائياً',
        storyLore: 'في قلب مفاعل نجمي كمي، يتحكم الذكاء الاصطناعي في جاذبية الكريستالات المشعة. عليك جمع الطاقة واستخدام مدارات النجوم للبقاء حياً وتفادي ثقوب الدود المنهارة.',
        rules: [
          'استخدم الأسهم أو شاشة اللمس للتحكم في اتجاه المركبة النجمية.',
          'اجمع كريستالات الطاقة الكوانتية لزيادة النقاط وشحن الدرع.',
          'تجنب الاصطدام بالحطام الفضائي وحقول البلازما المشتعلة.',
          'الوصول إلى الحد الأدنى للنقاط يفتح المرحلة التالية مباشرة.'
        ],
        controlsGuide: {
          keyboard: ['⬅️ ➡️ أو A / D: تدوير وتوجيه المركبة', '⬆️ أو W / Space: دفع محرك النبض', 'S / سهم لأسفل: كبح السرعة'],
          touch: ['أزرار التحكم الدائرية على الشاشة للتوجيه والدفع السريع.'],
          mouse: 'انقر واسحب للتوجيه والدفع الفوري نحو مؤشر الفأرة.'
        },
        theme: {
          primaryColor: '#06b6d4',
          accentColor: '#8b5cf6',
          bgGradient: 'from-slate-950 via-indigo-950 to-slate-950',
          icon: '🪐',
          particleStyle: 'stars'
        },
        currentLevelIndex: 1,
        maxUnlockedLevel: 5,
        levels: [
          {
            levelNumber: 1,
            title: 'المرحلة 1: الانطلاق في مدار التدريب',
            description: 'تعلم التحكم في الجاذبية وجمع 5 كريستالات طاقة أساسية.',
            targetScore: 500,
            requiredGems: 5,
            hazardsCount: 3,
            speedMultiplier: 1.0,
            themeHue: 190,
            specialRules: ['سرعة قياسية', 'لا توجد حقول جاذبية معكوسة']
          },
          {
            levelNumber: 2,
            title: 'المرحلة 2: حزام الكويكبات المغناطيسية',
            description: 'حطام كوني يتحرك بمسارات بيضاوية سريعة.',
            targetScore: 1200,
            requiredGems: 8,
            hazardsCount: 5,
            speedMultiplier: 1.15,
            themeHue: 220,
            specialRules: ['كويكبات سريعة']
          },
          {
            levelNumber: 3,
            title: 'المرحلة 3: النبض البلازمي',
            description: 'انبعاثات شمسية دورية تفرض عليك التوقيت الدقيق.',
            targetScore: 2000,
            requiredGems: 10,
            hazardsCount: 7,
            speedMultiplier: 1.25,
            themeHue: 270,
            specialRules: ['أمواج إشعاعية متقطعة']
          },
          {
            levelNumber: 4,
            title: 'المرحلة 4: دوامة الكوانتوم المتسارعة',
            description: 'ازدياد كثافة الأجرام السماوية وجاذبية الكريستالات.',
            targetScore: 3000,
            requiredGems: 12,
            hazardsCount: 9,
            speedMultiplier: 1.35,
            themeHue: 310,
            specialRules: ['جاذبية مضاعفة']
          },
          {
            levelNumber: 5,
            title: 'المرحلة 5: العاصفة النجمية الكبرى',
            description: 'مرحلة التحدي الفاصلة قبل انتقال الذكاء الاصطناعي لابتكار ميكانيكيات جديدة!',
            targetScore: 4500,
            requiredGems: 15,
            hazardsCount: 12,
            speedMultiplier: 1.5,
            themeHue: 340,
            specialRules: ['عاصفة بلازما كاملة']
          }
        ],
        mutations: [
          {
            id: 'mut_gravity_well',
            version: 1,
            unlockedAtLevel: 1,
            title: '⚡ حقول الجاذبية المغناطيسية التلقائية',
            category: 'mechanic',
            description: 'يقوم الذكاء الاصطناعي بجذب الكريستالات القريبة نحو المركبة تلقائياً عند الاقتراب منها.',
            aiRationale: 'تم تحسين تجربة التحكم لتقليل صعوبة جمع الجواهر المتقاربة.',
            isEnabled: true,
            createdAt: Date.now() - 100000
          }
        ],
        totalEvolutionsCount: 1,
        highScore: 1850,
        timesPlayed: 4,
        createdAt: Date.now() - 200000,
        updatedAt: Date.now(),
        generationStatus: 'ready'
      },
      {
        id: 'ai_game_cyber_chrono',
        title: 'نبض النيون: كسر حاجز الزمن',
        genre: 'chrono_dodger',
        tagline: 'لعبة تفادي سريعة مع قدرات التباطؤ والانتقال اللحظي',
        storyLore: 'في مدينة النيون السيبرانية لعام 2088، يحاول نظام الذكاء الاصطناعي حماية النواة الرقمية من هجمات الفيروسات فائقة السرعة.',
        rules: [
          'تحرك في الشبكة لتفادي نبضات الليزر وتيارات البيانات الضارة.',
          'التقط شرائح الاستقرار الزمنية لإبطاء حركة الفيروسات مؤقتاً.',
          'حافظ على استمرارية الحركة لرفع مضاعف النقاط (Combo Multiplier).'
        ],
        controlsGuide: {
          keyboard: ['الأسهم أو W,A,S,D: حركة سريعة في 8 اتجاهات', 'Space / Shift: اندفاع سيبراني خاطف (Dash)'],
          touch: ['لوحة اللمس الافتراضية للتوجيه وزر Dash للاندفاع السريع.'],
          mouse: 'تحريك المؤشر يقود النواة السيبرانية مباشرة.'
        },
        theme: {
          primaryColor: '#ec4899',
          accentColor: '#10b981',
          bgGradient: 'from-slate-950 via-purple-950 to-slate-950',
          icon: '⚡',
          particleStyle: 'cyber_squares'
        },
        currentLevelIndex: 1,
        maxUnlockedLevel: 5,
        levels: [
          {
            levelNumber: 1,
            title: 'المرحلة 1: تهيئة الجدار الناري',
            description: 'تفادي خطوط الليزر الأفقية وجمع 6 شرائح استقرار.',
            targetScore: 600,
            requiredGems: 6,
            hazardsCount: 4,
            speedMultiplier: 1.0,
            themeHue: 320
          },
          {
            levelNumber: 2,
            title: 'المرحلة 2: تدفق البيانات المتعامد',
            description: 'ليزر متقاطع أفقي وعمودي.',
            targetScore: 1400,
            requiredGems: 8,
            hazardsCount: 6,
            speedMultiplier: 1.2,
            themeHue: 280
          },
          {
            levelNumber: 3,
            title: 'المرحلة 3: وميض النبضات الفيروسية',
            description: 'كرات بلازما ترتد عن الجدران النيونية.',
            targetScore: 2400,
            requiredGems: 10,
            hazardsCount: 8,
            speedMultiplier: 1.35,
            themeHue: 200
          },
          {
            levelNumber: 4,
            title: 'المرحلة 4: تكسر المصفوفة',
            description: 'مجالات طاقة متذبذبة تتطلب دقة متناهية في الاندفاع.',
            targetScore: 3500,
            requiredGems: 12,
            hazardsCount: 10,
            speedMultiplier: 1.45,
            themeHue: 160
          },
          {
            levelNumber: 5,
            title: 'المرحلة 5: زعيم الجدار الناري السيبراني',
            description: 'صمود كامل ومناورات خاطفة حتى ينتهي الذكاء الاصطناعي من فك التشفير.',
            targetScore: 5000,
            requiredGems: 15,
            hazardsCount: 14,
            speedMultiplier: 1.6,
            themeHue: 40
          }
        ],
        mutations: [
          {
            id: 'mut_chrono_dash',
            version: 1,
            unlockedAtLevel: 1,
            title: '🌀 ميكانيكية الاندفاع اللحظي (Chrono Dash)',
            category: 'ability',
            description: 'تتيح للاعب الاندفاع عبر أشعة الليزر دون تلقي ضرر لمدة 0.3 ثانية.',
            aiRationale: 'ابتكار أساسي لموازنة السرعة الفائقة لليزر في المراحل المتقدمة.',
            isEnabled: true,
            createdAt: Date.now() - 150000
          }
        ],
        totalEvolutionsCount: 1,
        highScore: 2300,
        timesPlayed: 6,
        createdAt: Date.now() - 250000,
        updatedAt: Date.now(),
        generationStatus: 'ready'
      }
    ];
  }
}
