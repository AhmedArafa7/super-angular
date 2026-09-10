import { Injectable, inject, signal } from '@angular/core';
import { AiGameBlueprint, AiGameGenre, AiGameLevel, AiGameMutation } from '../models/ai-game.models';
import { AiKeyManagerService } from '../../../../core/services/ai-key-manager.service';
import { AiGameStorageService } from './ai-game-storage.service';

@Injectable({
  providedIn: 'root'
})
export class AiGameEngineService {
  private keyManager = inject(AiKeyManagerService);
  private storageService = inject(AiGameStorageService);

  isGenerating = signal<boolean>(false);
  generatingGameId = signal<string | null>(null);
  currentGenerationStep = signal<string>('');

  private readonly AVAILABLE_GENRES: { id: AiGameGenre; label: string; icon: string; desc: string }[] = [
    { id: 'orbital_gravity', label: 'فيزياء الفضاء والجاذبية', icon: '🪐', desc: 'مناورات مدارية وتفادي بلازما النجوم' },
    { id: 'chrono_dodger', label: 'نبض النيون والزمن', icon: '⚡', desc: 'تفادي سريع وحقول تباطؤ زمني' },
    { id: 'quantum_grid', label: 'شبكة الكوانتوم المتغيرة', icon: '🧩', desc: 'ألغاز هندسية وتغيير أطوار الطاقة' },
    { id: 'action_runner', label: 'مغامرة الركض السيبراني', icon: '🏃‍♂️', desc: 'سرعة فائقة وقفزات دقيقة بين المنصات' },
    { id: 'elemental_arena', label: 'ساحة العناصر السحرية', icon: '🔮', desc: 'دمج عناصر الطاقة ومواجهة كائنات نيونية' },
    { id: 'cyber_defense', label: 'الدفاع التكتيكي الذكي', icon: '🛡️', desc: 'صد أمواج البيانات وحماية النواة' }
  ];

  getAvailableGenres() {
    return this.AVAILABLE_GENRES;
  }

  /**
   * Generates a completely new AI game autonomously
   */
  async generateNewGame(customGenreOrPrompt?: string): Promise<AiGameBlueprint> {
    const gameId = 'ai_game_' + Date.now();
    this.isGenerating.set(true);
    this.generatingGameId.set(gameId);

    // 1. Initial placeholder with loading steps
    const placeholderGame: AiGameBlueprint = {
      id: gameId,
      title: 'جاري استحضار الفكرة والاسم...',
      genre: 'orbital_gravity',
      tagline: 'يقوم الذكاء الاصطناعي الآن بابتكار وتطوير كل جانب من جوانب اللعبة...',
      storyLore: 'جاري كتابة وتوليد القصة...',
      rules: ['جاري بناء القوانين...'],
      controlsGuide: {
        keyboard: ['جاري تجهيز أزرار التحكم...'],
        touch: ['جاري تجهيز أزرار اللمس...']
      },
      theme: {
        primaryColor: '#6366f1',
        accentColor: '#ec4899',
        bgGradient: 'from-slate-950 via-indigo-950 to-slate-950',
        icon: '✨',
        particleStyle: 'sparks'
      },
      currentLevelIndex: 1,
      maxUnlockedLevel: 1,
      levels: [],
      mutations: [],
      totalEvolutionsCount: 0,
      highScore: 0,
      timesPlayed: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      generationStatus: 'generating',
      currentGeneratingStep: '🧠 ابتكار الفكرة والقصة وعالم اللعبة الفريد...'
    };

    this.storageService.saveGame(placeholderGame);
    this.updateStep('🧠 ابتكار الفكرة والقصة والاسم الفريد بالذكاء الاصطناعي...');

    await this.sleep(1200);

    let generatedBlueprint: Partial<AiGameBlueprint> | null = null;

    if (this.keyManager.hasActiveKey()) {
      try {
        this.updateStep('⚙️ هندسة ميكانيكا وقوانين اللعب وأزرار التحكم...');
        generatedBlueprint = await this.fetchGameFromGemini(customGenreOrPrompt);
        await this.sleep(1000);
      } catch (err) {
        console.warn('Gemini API call failed or timed out, falling back to autonomous engine:', err);
      }
    }

    this.updateStep('🎨 تصميم الرسوم والألوان النيونية والمؤثرات الصوتية...');
    await this.sleep(1000);

    this.updateStep('🏆 بناء أول 5 مراحل تأسيسية وميكانيكيات البداية...');
    await this.sleep(1200);

    // If Gemini didn't return a full blueprint, use our rich autonomous procedural generator
    const finalBlueprint: AiGameBlueprint = generatedBlueprint && generatedBlueprint.title
      ? {
          ...placeholderGame,
          ...generatedBlueprint,
          id: gameId,
          generationStatus: 'ready',
          updatedAt: Date.now()
        } as AiGameBlueprint
      : this.createProceduralGame(gameId, customGenreOrPrompt);

    finalBlueprint.generationStatus = 'ready';
    this.storageService.saveGame(finalBlueprint);

    this.isGenerating.set(false);
    this.generatingGameId.set(null);
    this.currentGenerationStep.set('');

    return finalBlueprint;
  }

  /**
   * Evolve the game with 5 new infinite levels and brand-new AI innovations/mutations
   */
  async evolveGameNextBatch(game: AiGameBlueprint): Promise<{ game: AiGameBlueprint; newMutation: AiGameMutation }> {
    const currentLevelsCount = game.levels.length;
    const startLevelNum = currentLevelsCount + 1;
    const endLevelNum = currentLevelsCount + 5;
    const versionNum = game.mutations.length + 1;

    this.updateStep(`🧠 الذكاء الاصطناعي يحلل أداءك ويبتكر المراحل ${startLevelNum} إلى ${endLevelNum}...`);

    let newMutation: AiGameMutation | null = null;
    let newLevels: AiGameLevel[] = [];

    if (this.keyManager.hasActiveKey()) {
      try {
        const aiEvolutionResult = await this.fetchEvolutionFromGemini(game, startLevelNum, endLevelNum, versionNum);
        if (aiEvolutionResult) {
          newMutation = aiEvolutionResult.mutation;
          newLevels = aiEvolutionResult.levels;
        }
      } catch (e) {
        console.warn('Gemini evolution call error, using procedural evolution:', e);
      }
    }

    if (!newMutation || newLevels.length === 0) {
      const procedural = this.createProceduralEvolution(game, startLevelNum, endLevelNum, versionNum);
      newMutation = procedural.mutation;
      newLevels = procedural.levels;
    }

    // Attach to game
    const updatedGame: AiGameBlueprint = {
      ...game,
      levels: [...game.levels, ...newLevels],
      mutations: [newMutation, ...game.mutations],
      totalEvolutionsCount: game.totalEvolutionsCount + 1,
      maxUnlockedLevel: Math.max(game.maxUnlockedLevel, startLevelNum),
      updatedAt: Date.now()
    };

    this.storageService.saveGame(updatedGame);
    return { game: updatedGame, newMutation };
  }

  private updateStep(stepText: string) {
    this.currentGenerationStep.set(stepText);
    const activeId = this.generatingGameId();
    if (activeId) {
      const g = this.storageService.getGameById(activeId);
      if (g) {
        g.currentGeneratingStep = stepText;
        this.storageService.saveGame(g);
      }
    }
  }

  private async fetchGameFromGemini(promptHint?: string): Promise<Partial<AiGameBlueprint> | null> {
    const prompt = `You are a visionary AI Game Designer creating a brand new dynamic HTML5 canvas game.
Requirements:
1. Come up with a unique, creative Arabic game title and rich cyberpunk/arcade lore.
2. Formulate 4 clear game rules in Arabic.
3. Design controls guide (Arabic).
4. Generate the first 5 foundational levels (levels 1 to 5) with progressive difficulty and objectives.
5. Create 1 initial game mutation/mechanic created by AI.
Genre hint: ${promptHint || 'Any creative arcade physics or neon action genre'}.

Respond ONLY with valid JSON in this structure:
{
  "title": "اسم اللعبة المبتكر",
  "genre": "orbital_gravity",
  "tagline": "وصف تسويقي قصير ومشوق",
  "storyLore": "قصة اللعبة المثيرة وعالمها",
  "rules": ["قاعدة 1", "قاعدة 2", "قاعدة 3", "قاعدة 4"],
  "controlsGuide": {
    "keyboard": ["الأسهم أو W,A,S,D للتحكم", "Space للقفز أو الإطلاق"],
    "touch": ["أزرار اللمس الدائرية على الشاشة"],
    "mouse": "تحريك المؤشر أو النقر"
  },
  "theme": {
    "primaryColor": "#06b6d4",
    "accentColor": "#f43f5e",
    "bgGradient": "from-slate-950 via-slate-900 to-indigo-950",
    "icon": "⚡",
    "particleStyle": "sparks"
  },
  "levels": [
    {
      "levelNumber": 1,
      "title": "اسم المرحلة 1",
      "description": "وصف الهدف",
      "targetScore": 500,
      "requiredGems": 5,
      "hazardsCount": 3,
      "speedMultiplier": 1.0,
      "themeHue": 180
    },
    {
      "levelNumber": 2,
      "title": "اسم المرحلة 2",
      "description": "وصف الهدف",
      "targetScore": 1200,
      "requiredGems": 8,
      "hazardsCount": 5,
      "speedMultiplier": 1.15,
      "themeHue": 210
    },
    {
      "levelNumber": 3,
      "title": "اسم المرحلة 3",
      "description": "وصف الهدف",
      "targetScore": 2000,
      "requiredGems": 10,
      "hazardsCount": 7,
      "speedMultiplier": 1.25,
      "themeHue": 250
    },
    {
      "levelNumber": 4,
      "title": "اسم المرحلة 4",
      "description": "وصف الهدف",
      "targetScore": 3000,
      "requiredGems": 12,
      "hazardsCount": 9,
      "speedMultiplier": 1.35,
      "themeHue": 290
    },
    {
      "levelNumber": 5,
      "title": "المرحلة 5: التحدي الختامي الأولي",
      "description": "صمود وتفادي أقصى طاقة لاجتياز الدورة الأولى",
      "targetScore": 4500,
      "requiredGems": 15,
      "hazardsCount": 12,
      "speedMultiplier": 1.5,
      "themeHue": 330
    }
  ],
  "mutations": [
    {
      "id": "mut_init_1",
      "version": 1,
      "unlockedAtLevel": 1,
      "title": "✨ ميكانيكية النبض الأولي الذكي",
      "category": "mechanic",
      "description": "تفعيل درع حماية مؤقت عند الاقتراب الحرج من المخاطر.",
      "aiRationale": "قام الذكاء الاصطناعي بإضافة هذه الميكانيكية لتسهيل التعلم في البداية.",
      "isEnabled": true
    }
  ]
}`;

    const res = await this.keyManager.callGeminiApi({
      model: 'gemini-3.5-flash-lite',
      prompt
    });

    if (!res.ok || !res.text) return null;

    let text = res.text;
    text = text.replace(/^```json\s*/gi, '').replace(/^```\s*/gi, '').replace(/```\s*$/gi, '').trim();

    try {
      const parsed = JSON.parse(text);
      return parsed;
    } catch {
      return null;
    }
  }

  private async fetchEvolutionFromGemini(game: AiGameBlueprint, startLvl: number, endLvl: number, versionNum: number) {
    const prompt = `You are the AI Game Director for the game "${game.title}".
The player has just beaten level ${startLvl - 1}.
Invent a completely NEW game mechanic / mutation (e.g. quantum wormholes, gravitational inversion, bullet deflection, color phasing, time warp) that DID NOT exist before, and generate 5 new levels (${startLvl} to ${endLvl}).

Respond ONLY with valid JSON:
{
  "mutation": {
    "id": "mut_${Date.now()}",
    "version": ${versionNum},
    "unlockedAtLevel": ${startLvl},
    "title": "اسم الميكانيكية الجديدة المبتكرة",
    "category": "mechanic",
    "description": "شرح دقيق لما تفعله الميكانيكية في اللعبة وكيفية استخدامها",
    "aiRationale": "شرح سبب ابتكار الذكاء الاصطناعي لهذه الميزة لتحسين اللعبة ومفاجأة اللاعب",
    "isEnabled": true,
    "createdAt": ${Date.now()}
  },
  "levels": [
    {
      "levelNumber": ${startLvl},
      "title": "اسم المرحلة ${startLvl}",
      "description": "تجربة الميكانيكية الجديدة",
      "targetScore": ${startLvl * 800},
      "requiredGems": ${10 + (startLvl - 5)},
      "hazardsCount": ${8 + (startLvl - 5)},
      "speedMultiplier": ${1.3 + (startLvl * 0.05)},
      "themeHue": ${(startLvl * 45) % 360}
    },
    {
      "levelNumber": ${startLvl + 1},
      "title": "اسم المرحلة ${startLvl + 1}",
      "description": "تحدي متقدم",
      "targetScore": ${(startLvl + 1) * 850},
      "requiredGems": ${11 + (startLvl - 5)},
      "hazardsCount": ${9 + (startLvl - 5)},
      "speedMultiplier": ${1.35 + (startLvl * 0.05)},
      "themeHue": ${((startLvl + 1) * 45) % 360}
    },
    {
      "levelNumber": ${startLvl + 2},
      "title": "اسم المرحلة ${startLvl + 2}",
      "description": "دمج السرعة مع الميكانيكية",
      "targetScore": ${(startLvl + 2) * 900},
      "requiredGems": ${12 + (startLvl - 5)},
      "hazardsCount": ${10 + (startLvl - 5)},
      "speedMultiplier": ${1.4 + (startLvl * 0.05)},
      "themeHue": ${((startLvl + 2) * 45) % 360}
    },
    {
      "levelNumber": ${startLvl + 3},
      "title": "اسم المرحلة ${startLvl + 3}",
      "description": "مرحلة الضغط العالي",
      "targetScore": ${(startLvl + 3) * 950},
      "requiredGems": ${13 + (startLvl - 5)},
      "hazardsCount": ${11 + (startLvl - 5)},
      "speedMultiplier": ${1.45 + (startLvl * 0.05)},
      "themeHue": ${((startLvl + 3) * 45) % 360}
    },
    {
      "levelNumber": ${endLvl},
      "title": "المرحلة ${endLvl}: قمة التطور",
      "description": "صمود كامل قبل الدورة الابتكارية القادمة",
      "targetScore": ${endLvl * 1000},
      "requiredGems": ${15 + (startLvl - 5)},
      "hazardsCount": ${13 + (startLvl - 5)},
      "speedMultiplier": ${1.5 + (startLvl * 0.05)},
      "themeHue": ${(endLvl * 45) % 360}
    }
  ]
}`;

    const res = await this.keyManager.callGeminiApi({
      model: 'gemini-3.5-flash-lite',
      prompt
    });

    if (!res.ok || !res.text) return null;

    let text = res.text;
    text = text.replace(/^```json\s*/gi, '').replace(/^```\s*/gi, '').replace(/```\s*$/gi, '').trim();

    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  private createProceduralGame(gameId: string, customGenreOrPrompt?: string): AiGameBlueprint {
    const genres: AiGameGenre[] = ['orbital_gravity', 'chrono_dodger', 'quantum_grid', 'action_runner', 'elemental_arena', 'cyber_defense', 'puzzle_physics', 'space_invader'];
    const selectedGenre: AiGameGenre = (customGenreOrPrompt && genres.includes(customGenreOrPrompt as any))
      ? (customGenreOrPrompt as AiGameGenre)
      : genres[Math.floor(Math.random() * genres.length)];

    const themesByGenre: Record<AiGameGenre, { title: string; tagline: string; lore: string; icon: string; primary: string; accent: string }> = {
      orbital_gravity: {
        title: 'مدارات النبض النجمي: أفق الفضاء 🌌',
        tagline: 'ملاحة مدارية حركية مع قوى جاذبية تتطور باستمرار',
        lore: 'سفينة استكشاف ذكية ضلت طريقها داخل حقل كهرومغناطيسي لثقب أسود نيون. الذكاء الاصطناعي للمركبة يبتكر دروعاً ومدارات جديدة لمواجهة الحطام المتسارع.',
        icon: '🪐',
        primary: '#38bdf8',
        accent: '#c084fc'
      },
      chrono_dodger: {
        title: 'سرعة النيون: اختراق الزمن ⚡',
        tagline: 'تفادي فائق السرعة مع بوابات التباطؤ والقفزات الكمية',
        lore: 'في شبكة الإنترنت المظلمة لعام 2140، تتحكم خوارزمية ذكية في جسيم فوتوني نقي لتجاوز جدران الحماية النارية واستعادة البيانات المفقودة.',
        icon: '⚡',
        primary: '#ec4899',
        accent: '#34d399'
      },
      quantum_grid: {
        title: 'مصفوفة الكوانتوم: تحول الأبعاد 🧩',
        tagline: 'لعبة شبكية تجمع بين دقة الحركة وتغيير أطوار الطاقة اللحظي',
        lore: 'محاكاة رياضية لجسيمات مضادة تتفاعل داخل مفاعل نيوتروني، يتدخل الذكاء الاصطناعي في كل مرحلة لتغيير هندسة الفضاء وقوانين الاحتكاك.',
        icon: '💎',
        primary: '#a855f7',
        accent: '#06b6d4'
      },
      action_runner: {
        title: 'عداء السيبربانك: الهروب اللانهائي 🏃‍♂️',
        tagline: 'تحدي المنصات والسرعة الفائقة مع فيزياء ديناميكية ذكية',
        lore: 'روبوت واعي يهرب من مصنع إعادة التدوير المركزي، ويتلقى ترقيات وتحسينات فورية أثناء الركض من رفيقه الذكاء الاصطناعي.',
        icon: '🚀',
        primary: '#f59e0b',
        accent: '#ef4444'
      },
      elemental_arena: {
        title: 'ساحة الأثير: تصادم العناصر 🔥💧',
        tagline: 'دمج طاقات النار والجليد والبرق لمواجهة الكائنات النيونية',
        lore: 'مملكة سحرية مدعومة بنواة ذكاء اصطناعي كوانتي تبتكر تعويذات ووحوشاً تتكيف مع كل حركة تقوم بها.',
        icon: '🔮',
        primary: '#10b981',
        accent: '#f97316'
      },
      cyber_defense: {
        title: 'حارس النواة السيبرانية 🛡️',
        tagline: 'دفاع حركي واستراتيجي لصد هجمات الفيروسات الموجهة',
        lore: 'نظام حماية عصبي متطور يولد حقول صد وحواجز كهرومغناطيسية تتغير تكتيكياً مع كل هجمة تتجاوزها.',
        icon: '🛡️',
        primary: '#6366f1',
        accent: '#e11d48'
      },
      puzzle_physics: {
        title: 'ألغاز الكوانتوم الفيزيائية 🔬',
        tagline: 'تحديات فيزيائية مبنية على توازن القوى وحقول الطاقة',
        lore: 'مختبر ذكاء اصطناعي يبني تجارب وتحديات جاذبية تتطور ذاتياً مع كل لغز تجتازه.',
        icon: '🧩',
        primary: '#14b8a6',
        accent: '#a855f7'
      },
      space_invader: {
        title: 'غزاة الفضاء النيوني 👾',
        tagline: 'معارك فضائية كلاسيكية بفيزياء وموجات هجوم يطورها الذكاء الاصطناعي',
        lore: 'أسطول فضائي يقوده ذكاء اصطناعي عسكري يتكيف مع أسلوب إطلاقك ومناوراتك.',
        icon: '👾',
        primary: '#8b5cf6',
        accent: '#ec4899'
      }
    };

    const t = themesByGenre[selectedGenre];

    const initialLevels: AiGameLevel[] = [
      {
        levelNumber: 1,
        title: 'المرحلة 1: تهيئة النظام والملاحة الأساسية',
        description: 'اجمع 5 كريستالات طاقة وتجنب الاصطدام بالمخاطر الأولية.',
        targetScore: 500,
        requiredGems: 5,
        hazardsCount: 3,
        speedMultiplier: 1.0,
        themeHue: 190
      },
      {
        levelNumber: 2,
        title: 'المرحلة 2: التيارات المتقاطعة',
        description: 'ازدياد سرعة المخاطر بمقدار 15% مع ظهور كريستالات متتابعة.',
        targetScore: 1200,
        requiredGems: 8,
        hazardsCount: 5,
        speedMultiplier: 1.15,
        themeHue: 220
      },
      {
        levelNumber: 3,
        title: 'المرحلة 3: النبضات التذبذبية',
        description: 'مخاطر تتحرك بأنماط دائرية تتطلب توقيتاً حذراً.',
        targetScore: 2000,
        requiredGems: 10,
        hazardsCount: 7,
        speedMultiplier: 1.25,
        themeHue: 260
      },
      {
        levelNumber: 4,
        title: 'المرحلة 4: عاصفة الجسيمات المشحونة',
        description: 'كثافة عالية في المخاطر وحركة سريعة لكريستالات الطاقة.',
        targetScore: 3200,
        requiredGems: 12,
        hazardsCount: 9,
        speedMultiplier: 1.35,
        themeHue: 300
      },
      {
        levelNumber: 5,
        title: 'المرحلة 5: اختبار التوافق العصبي الأكبر',
        description: 'المرحلة التأسيسية الأخيرة! اجتزها ليدخل الذكاء الاصطناعي في وضع الابتكار الكامل.',
        targetScore: 4800,
        requiredGems: 15,
        hazardsCount: 12,
        speedMultiplier: 1.5,
        themeHue: 340
      }
    ];

    const initialMutation: AiGameMutation = {
      id: 'mut_init_' + Date.now(),
      version: 1,
      unlockedAtLevel: 1,
      title: '✨ نظام الدرع الحركي التلقائي (Kinetic Auto-Pulse)',
      category: 'mechanic',
      description: 'يقوم الذكاء الاصطناعي بتوليد موجة نبضية تدفع الكريستالات نحوك عند الاقتراب منها، وتمنحك درعاً مؤقتاً.',
      aiRationale: 'ابتكار تأسيسي لضمان تدفق الحركة وسلاستها قبل الانتقال للمراحل المتقدمة.',
      isEnabled: true,
      createdAt: Date.now()
    };

    return {
      id: gameId,
      title: t.title,
      genre: selectedGenre,
      tagline: t.tagline,
      storyLore: t.lore,
      rules: [
        'تحكم في حركتك باستخدام الأسهم أو اللمس أو الفأرة لتفادي المخاطر النيونية.',
        'التقط كريستالات الطاقة الكوانتية لجمع النقاط وشحن مقياس المرحلة.',
        'الوصول لعدد الكريستالات المطلوب يتيح لك الانتقال للمرحلة التالية.',
        'كل 5 مراحل تنهيها، يبتكر الذكاء الاصطناعي ميكانيكيات وطفرات جديدة لم ترها من قبل!'
      ],
      controlsGuide: {
        keyboard: [
          '⬅️ ➡️ ⬆️ ⬇️ أو W,A,S,D: توجيه والتحرك السريع',
          'Space / المسافة: اندفاع سريع (Dash) / نبضة درع',
          'Shift: كبح وإبطاء الحركة للتحكم الدقيق'
        ],
        touch: [
          'لوحة اللمس الدائرية الافتراضية على الشاشة للحركة السلسة',
          'زر الاندفاع السريع (Dash) لتفادي المخاطر'
        ],
        mouse: 'حرك المؤشر لتوجيه الكيان، وانقر للاندفاع الفوري.'
      },
      theme: {
        primaryColor: t.primary,
        accentColor: t.accent,
        bgGradient: 'from-slate-950 via-slate-900 to-indigo-950',
        icon: t.icon,
        particleStyle: 'sparks'
      },
      currentLevelIndex: 1,
      maxUnlockedLevel: 1,
      levels: initialLevels,
      mutations: [initialMutation],
      totalEvolutionsCount: 1,
      highScore: 0,
      timesPlayed: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      generationStatus: 'ready'
    };
  }

  private createProceduralEvolution(game: AiGameBlueprint, startLvl: number, endLvl: number, versionNum: number): { mutation: AiGameMutation; levels: AiGameLevel[] } {
    const proceduralMutationsPool = [
      {
        title: '🌀 بوابات الكوانتوم الانتقالية (Quantum Portals)',
        category: 'mechanic' as const,
        description: 'ظهور بوابات نيونية زوجية في الساحة؛ الدخول في البوابة الزرقاء يقذفك فورياً من البوابة البرتقالية بسرعة مضاعفة.',
        rationale: 'لاحظ الذكاء الاصطناعي سرعتك في المراحل السابقة فابتكر ميكانيكية النقل الفضائي لفتح مسارات هروب تكتيكية جديدة.'
      },
      {
        title: '⏳ حقول التباطؤ الزمني (Chrono Dilation Zones)',
        category: 'environment' as const,
        description: 'مناطق طاقة خضراء تطفو في الساحة؛ عند الدخول إليها تتباطأ حركة جميع المقذوفات والمخاطر بنسبة 60% لمدة 3 ثوان.',
        rationale: 'تم ابتكار هذه المنطقة الاستراتيجية لمساعدتك في تفادي الكثافة العالية للمخاطر في المستويات المتقدمة.'
      },
      {
        title: '🛡️ الدرع الانفجاري الارتدادي (Kinetic Shockwave Blast)',
        category: 'ability' as const,
        description: 'عند جمع 3 كريستالات متتالية بدون تلقي ضرر، تنطلق موجة صدمة نيونية تدمر جميع المخاطر المحيطة وتمنحك نقاطاً مضاعفة.',
        rationale: 'مكافأة ذكية ابتكرها الـ AI لتشجيع اللعب الهجومي والدقيق.'
      },
      {
        title: '🧲 المجال المغناطيسي الفائق (Superconductor Pull)',
        category: 'ability' as const,
        description: 'مضاعفة نصف قطر جذب الكريستالات بمقدار 3 أضعاف مع إضافة مسار نيون مضيء لكل كريستالة مقتربة.',
        rationale: 'تحسين ذكي لتسريع جمع الجواهر في المراحل ذات المخاطر السريعة.'
      },
      {
        title: '🌈 الليزر متعدد الأطوار (Chromatic Phase Lasers)',
        category: 'hazard' as const,
        description: 'ظهور أشعة ليزر تغير لونها دورياً؛ تطابق لون درعك مع لون الليزر يجعلك تمتص الطاقة بدلاً من تلقي الضرر.',
        rationale: 'إضافة عنصر تناغم حركي واختبار ردة الفعل مع الحفاظ على التحدي العالي.'
      },
      {
        title: '🚀 الجاذبية المتغيرة والموجات الدافعة (Gravity Surge Waves)',
        category: 'twist' as const,
        description: 'نبضات جاذبية دورية تدفع الكيان والجسيمات نحو حواف الشاشة مع ظهور ممرات أمان مؤقتة.',
        rationale: 'ابتكار يكسر رتابة الحركة المستقيمة ويضيف شعوراً بالديناميكية الفيزيائية الحية.'
      }
    ];

    const pick = proceduralMutationsPool[(versionNum - 1) % proceduralMutationsPool.length];

    const mutation: AiGameMutation = {
      id: 'mut_evo_' + Date.now(),
      version: versionNum,
      unlockedAtLevel: startLvl,
      title: pick.title,
      category: pick.category,
      description: pick.description,
      aiRationale: pick.rationale,
      isEnabled: true,
      createdAt: Date.now()
    };

    const levels: AiGameLevel[] = [];
    for (let i = startLvl; i <= endLvl; i++) {
      const isBoss = i === endLvl;
      levels.push({
        levelNumber: i,
        title: isBoss ? `المرحلة ${i}: ذروة الطفرة التطورية ${versionNum} 👑` : `المرحلة ${i}: اندماج ${pick.title.split(' ')[1] || 'الميكانيكية'}`,
        description: isBoss
          ? `صمود مطلق واستعراض للمهارات قبل انتقال الذكاء الاصطناعي لابتكار ميكانيكيات الجيل ${versionNum + 1}!`
          : `تطبيق ميكانيكية (${pick.title}) مع جمع ${8 + (i - 5) * 2} كريستالة طاقة.`,
        targetScore: i * 850,
        requiredGems: 8 + (i - 5) * 2,
        hazardsCount: 5 + (i - 4),
        speedMultiplier: +(1.2 + (i * 0.04)).toFixed(2),
        themeHue: (i * 47) % 360,
        specialRules: [pick.title, isBoss ? 'تحدي زعيم الطفرة' : 'مضاعفة النقاط']
      });
    }

    return { mutation, levels };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
