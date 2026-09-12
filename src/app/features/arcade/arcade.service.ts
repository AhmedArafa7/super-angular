import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface GameCategory {
  id: string;
  label: string;
  icon: string;
  color?: string;
  description?: string;
  isCustom?: boolean;
}

export type GameEngine = 'web' | 'godot';

export interface ArcadeGame {
  id: string;
  category: string; // for backwards compatibility (primary category)
  categories?: string[]; // multiple category tags per game
  title: string;
  description: string;
  thumbnail: string;
  genre: string;
  platforms: ('browser' | 'android' | 'pc')[];
  localUrl?: string; // Path in assets
  status: 'available' | 'coming_soon' | 'beta';
  maxPlayers?: number;
  localModeType?: 'standard' | 'ai' | 'pass_and_play'; // Determines the first button behavior/UI
  hasCustomMenu?: boolean; // If true, game handles its own initial menu before mode selection
  engine?: GameEngine; // Type of game engine used
  godotProjectId?: string; // Godot project ID for Godot games
  // General mobile-control contract for all iframe games.
  mobileControls?: {
    movement?: {
      up: [string, string?];
      down: [string, string?];
      left: [string, string?];
      right: [string, string?];
    };
    actions?: Array<{
      label: string;
      keys: [string, string?];
      style?: 'primary' | 'secondary' | 'danger' | 'success';
    }>;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ArcadeService {
  
  // Default open extensible category list
  readonly defaultCategories: GameCategory[] = [
    { id: 'mental', label: 'ألعاب ذهنية', icon: '🧠', color: 'from-purple-500 to-indigo-600', description: 'تحديات الذاكرة، الذكاء والتركيز وسرعة الاستنتاج' },
    { id: 'fast_paced', label: 'ألعاب سريعة', icon: '⚡', color: 'from-amber-500 to-red-500', description: 'حركة وركض واستجابة خاطفة فائقة الحماس' },
    { id: 'educational', label: 'تعليمية ومعرفية', icon: '📚', color: 'from-emerald-500 to-teal-600', description: 'تعلم لغات، رياضيات، علوم، وحفظ المفردات' },
    { id: 'strategic', label: 'تفكير استراتيجي', icon: '♟️', color: 'from-blue-600 to-cyan-500', description: 'تخطيط، محاكاة هندسية، وحساب الخطوات' },
    { id: 'action_3d', label: '3D وأكشن', icon: '🚀', color: 'from-cyan-500 to-blue-600', description: 'عوالم ثلاثية الأبعاد، مغامرات، ومعارك حية' },
    { id: 'multiplayer_party', label: 'جماعية وحفلات', icon: '👥', color: 'from-pink-500 to-rose-600', description: 'منافسات 1v1، ألعاب شاشة مقسمة و غرف P2P' },
    { id: 'simulation_coding', label: 'محاكاة وبرمجة', icon: '💻', color: 'from-indigo-500 to-cyan-600', description: 'معامل ذكاء اصطناعي، روبوتات وتطبيقات طبية' },
    { id: 'words_puzzles', label: 'كلمات وفوازير', icon: '🔤', color: 'from-violet-500 to-purple-700', description: 'تحديات لغوية، فوازير ذكية، وتخمين المفردات' },
    { id: 'cards_board', label: 'بطاقات وبورد', icon: '🎴', color: 'from-fuchsia-600 to-purple-600', description: 'ألعاب الورق الكلاسيكية وألواح النرد الفاخرة' },
    { id: 'reflex_focus', label: 'خفة يد وتركيز', icon: '🎯', color: 'from-yellow-500 to-amber-600', description: 'صيد الأرقام، دقة الملاحظة وردود الفعل السريعة' }
  ];

  // Storage Keys for Customizations
  private readonly customCategoriesKey = 'si_neuro_arcade_custom_categories_v1';
  private readonly categoryOverridesKey = 'si_neuro_arcade_game_category_overrides_v1';
  private readonly publishedGamesKey = 'si_neuro_published_arcade_games_v1';

  // Base list of games with rich multi-category tags
  private games: ArcadeGame[] = [
    {
      id: 'riddle-master',
      category: 'mental',
      categories: ['mental', 'educational', 'words_puzzles', 'strategic'],
      title: 'Riddle Master: 100 Levels 🧩💡🕵️‍♂️',
      description: 'مملكة الألغاز والفوازير الذكية! 100 مستوى متدرج من السهل للعباقرة، مع نظام ذكي لفحص الإجابات والمرادفات وصانع فوازير مجتمعي متقدم!',
      thumbnail: 'assets/images/riddle-master-thumb.png',
      genre: 'Puzzle / Riddles',
      platforms: ['browser', 'android', 'pc'],
      status: 'available',
      hasCustomMenu: true,
      maxPlayers: 8
    },
    {
      id: 'schulte-table',
      category: 'mental',
      categories: ['mental', 'educational', 'fast_paced', 'reflex_focus', 'multiplayer_party'],
      title: 'Schulte Table 5×5 🧠⚡',
      description: 'اختبار الإدراك والتركيز البصري العالمي! اضغط على الأرقام من 1 إلى 25 بالترتيب التصاعدي قبل انتهاء الـ 20 ثانية، مع أنماط فردية وجماعية ومواجهات 1v1.',
      thumbnail: 'assets/images/schulte-table-thumb.png',
      genre: 'Puzzle / Speed Focus',
      platforms: ['browser', 'android', 'pc'],
      status: 'available',
      hasCustomMenu: true,
      maxPlayers: 6
    },
    {
      id: 'abdullah-clinic',
      category: 'mental',
      categories: ['simulation_coding', 'educational', 'strategic', 'mental'],
      title: 'The Code Lab 💻🧪⚡',
      description: 'معمل البرمجة والمحاكاة التكنولوجية The Code Lab! اكتب الأكواد البرمجية، طوّر الأذرع الروبوتية والدارات العصبية الذكية، وحل المشكلات الهندسية في بيئة محاكاة متطورة!',
      thumbnail: 'assets/images/code-lab-thumb.png',
      genre: 'Simulation / Coding',
      platforms: ['browser', 'android', 'pc'],
      localUrl: '/games/abdullah-clinic/index.html',
      status: 'available',
      hasCustomMenu: false,
      maxPlayers: 1
    },
    {
      id: 'neuro-physio',
      category: 'mental',
      categories: ['simulation_coding', 'educational', 'mental', 'strategic'],
      title: 'NEURO-PHYSIO CODEX: CAIRO 🦾🧬💻',
      description: 'لعبة المحاكاة والبرمجة الطبية الثورية! ساعد د. عبد الله في علاج المرضى بالقاهرة عبر دمج الطب الطبيعي بالروبوتات وخوارزمية Rehab-Logic v1.3.',
      thumbnail: 'assets/images/neuro-physio-thumb.png',
      genre: 'Simulation / Programming',
      platforms: ['browser', 'android', 'pc'],
      status: 'available',
      hasCustomMenu: true,
      maxPlayers: 2
    },
    {
      id: 'subway-surfers',
      category: 'general',
      categories: ['fast_paced', 'action_3d', 'reflex_focus', 'multiplayer_party'],
      title: 'Metro Dash 🚇⚡🏃‍♂️',
      description: 'لعبة الركض والمطاردة ثلاثية الأبعاد الحماسية Metro Dash! انطلق بسرعة البرق فوق قضبان مترو القاهرة، تفادَ القطارات السريعة، استخدم لوح التزلج والـ Jetpack والمغناطيس، واهرب من الشرطي والكلب!',
      thumbnail: 'assets/images/metro-dash-thumb.jpg',
      genre: 'Action / 3D Runner',
      platforms: ['browser', 'android', 'pc'],
      localUrl: '/games/subway-surfers/index.html',
      status: 'available',
      hasCustomMenu: true,
      maxPlayers: 2
    },
    {
      id: 'sonic-boom',
      category: 'general',
      categories: ['fast_paced', 'action_3d', 'reflex_focus'],
      title: 'SONIC BOOM 💥🔵⚡',
      description: 'لعبة الركض السريعة والمثيرة SONIC BOOM! اركض بسرعة الصوت عبر الجزيرة المفقودة، اقفز فوق العوائق، اجمع الحلقات الذهبية، استخدم الداش لتدمير الروبوتات، وحقق أعلى الأرقام!',
      thumbnail: 'assets/images/sonic-boom-thumb.png',
      genre: 'Action',
      platforms: ['browser', 'android', 'pc'],
      localUrl: '/games/sonic-boom/index.html',
      status: 'available'
    },
    {
      id: 'sonic-runner',
      category: 'general',
      categories: ['fast_paced', 'action_3d', 'reflex_focus'],
      title: 'Sonic 3D Runner 🏃‍♂️🔵⚡',
      description: 'لعبة الركض ثلاثية الأبعاد فائقة السرعة Sonic 3D Runner! انطلق بسرعة الصوت في حلبات Green Hill ثلاثية الأبعاد، اجمع الحلقات الذهبية وتفادى العوائق والكراب الآلي!',
      thumbnail: 'assets/images/sonic-3d-runner-thumb.png',
      genre: '3D Runner / Action',
      platforms: ['browser', 'android', 'pc'],
      localUrl: '/games/sonic-runner/index.html',
      status: 'available'
    },
    {
      id: 'dragon-dungeon',
      category: 'mental',
      categories: ['strategic', 'action_3d', 'mental'],
      title: 'Jinx 🐉⚔️',
      description: 'لعبة التحدي والمغامرات الأسطورية Jinx! اختر بطلك (محارب، ساحر، سارق)، واهزم الوحوش والتنانين في الزنازين السحرية!',
      thumbnail: 'assets/images/jinx-thumb.png',
      genre: 'RPG',
      platforms: ['browser', 'pc', 'android'],
      localUrl: '/games/dragon-dungeon/index.html',
      status: 'available'
    },
    {
      id: 'flashcards',
      category: 'mental',
      categories: ['educational', 'mental', 'words_puzzles'],
      title: 'FlipIt 🎴✨',
      description: 'لعبة التحدي والبطاقات التعليمية المرحة! اختبر حفظك ومعرفتك للأشهر والأيام والأرقام مع دعم الصوت والذكاء الاصطناعي.',
      thumbnail: 'assets/images/flipit-thumb.png',
      genre: 'Puzzle',
      platforms: ['browser', 'pc', 'android'],
      status: 'available'
    },
    {
      id: 'word-chain',
      category: 'mental',
      categories: ['educational', 'words_puzzles', 'fast_paced', 'mental'],
      title: 'Tail to Head 🔗🔤✨',
      description: 'لعبة الذكاء وسرعة البديهة الإنجليزية Tail to Head! ابدأ الكلمة الجديدة بآخر حرف من الكلمة السابقة (من الذيل إلى الرأس) قبل انتهاء المؤقت!',
      thumbnail: 'assets/images/tail-to-head-thumb.png',
      genre: 'Puzzle',
      platforms: ['browser', 'pc', 'android'],
      status: 'available'
    },
    {
      id: 'number-guesser',
      category: 'mental',
      categories: ['mental', 'strategic', 'educational'],
      title: 'Mind Hacker 🧠💻🔓',
      description: 'لعبة اختراق الرموز والاستنتاج السري Mind Hacker! حدد طول الرقم السري (3، 4، أو 5 أرقام)، واختر شفرتك الخاصة، ونافس في اختراق رقم الخصم!',
      thumbnail: 'assets/images/mind-hacker-thumb.png',
      genre: 'Puzzle',
      platforms: ['browser', 'pc', 'android'],
      status: 'available'
    },
    {
      id: 'echoes-of-time',
      category: 'mental',
      categories: ['strategic', 'mental', 'multiplayer_party'],
      title: 'Tic Tac Toe',
      description: 'لعبة التحدي والاستراتيجية Tic Tac Toe عبور الزمن! يتواصل 3 أبطال من (الماضي، الحاضر، والمستقبل) لتفعيل بوابة الزمن وحل شبكة التحدي للنجاة!',
      thumbnail: 'assets/images/tic-tac-toe-thumb.png',
      genre: 'Puzzle',
      platforms: ['browser', 'pc'],
      localUrl: '/games/echoes-of-time/index.html',
      status: 'available',
      hasCustomMenu: true,
      maxPlayers: 3
    },
    {
      id: 'three-monkeys',
      category: 'mental',
      categories: ['multiplayer_party', 'strategic', 'mental'],
      title: 'Beyond Senses 🙈🙉🙊',
      description: 'لعبة تفكيك قنابل تعاونية حماسية لـ 3 لاعبين (وراء الحواس)! يتواصل الأعمى والأصم والأبكم لتفكيك القنبلة الموقوتة قبل انفجارها.',
      thumbnail: 'assets/images/beyond-senses-thumb.png',
      genre: 'Co-op',
      platforms: ['browser', 'pc'],
      localUrl: '/games/three-monkeys/index.html',
      status: 'available',
      hasCustomMenu: true,
      maxPlayers: 3
    },
    {
      id: 'toxic-butterfly',
      category: 'reflex_focus',
      categories: ['reflex_focus', 'fast_paced', 'mental', 'multiplayer_party'],
      title: 'صائد الفراشات السامة 🐻🦋☠️',
      description: 'لعبة الدقة والملاحظة وسرعة البديهة! ساعد الدب المحقق في الغابة السحرية على تمييز واصطياد الفراشة السامة التي تتحرك بحركات غريبة وتطلق شرارات مشعة وتجنب الفراشات البريئة!',
      thumbnail: 'assets/images/toxic-butterfly-thumb.png',
      genre: 'Reflex & Observation',
      platforms: ['browser', 'android', 'pc'],
      localUrl: '/games/toxic-butterfly/index.html',
      status: 'available',
      hasCustomMenu: false,
      maxPlayers: 6
    },
    {
      id: 'tank-battle',
      category: 'general',
      categories: ['action_3d', 'fast_paced', 'multiplayer_party'],
      title: 'Crazy Shells 💣💥',
      description: 'لعبة معارك الدبابات الحماسية Crazy Shells! اختر دبابتك ووجه ذخائرك المفخخة والمفرقعات الملونة لتدمير الخصوم محلياً أو ضد AI!',
      thumbnail: 'assets/images/crazy-shells-thumb.png',
      genre: 'Action',
      platforms: ['browser'],
      localUrl: '/games/tank-battle/index.html',
      status: 'available'
    },
    {
      id: 'spot-differences',
      category: 'mental',
      categories: ['mental', 'reflex_focus', 'educational'],
      title: 'Eagle Eye 5 🦅🔍✨',
      description: 'لعبة التركيز ودقة الملاحظة النارية Eagle Eye 5! استخدم عين النسر الثاقبة لاكتشاف الاختلافات الخمسة المخبأة بين الصور المتشابهة في أسرع وقت ممكن!',
      thumbnail: 'assets/images/eagle-eye-5-thumb.png',
      genre: 'Puzzle',
      platforms: ['browser', 'android'],
      localUrl: '/games/spot-differences/index.html',
      status: 'available'
    },
    {
      id: 'card-battle',
      category: 'mental',
      categories: ['strategic', 'cards_board', 'mental'],
      title: 'Neural Deck 🧠🎴⚡',
      description: 'لعبة معارك البطاقات العصبية والاستراتيجية Neural Deck! جهز deck بطاقاتك المستقبلية المكونة من 20 بطاقة سحرية وتغلب على الذكاء الاصطناعي بالذكاء والتخطيط!',
      thumbnail: 'assets/images/neural-deck-thumb.png',
      genre: 'Strategy',
      platforms: ['browser', 'android'],
      localUrl: '/games/card-battle/index.html',
      status: 'available'
    },
    {
      id: 'cairo-runner',
      category: 'general',
      categories: ['fast_paced', 'action_3d', 'reflex_focus'],
      title: 'Gridlock Gurus 🏎️💨',
      description: 'لعبة تفادي السيارات والزحمة السريعة Gridlock Gurus! قد سيارتك الرياضية عبر الطريق المزدحم وتفادَ جميع السيارات والتكاتك دون أي تصادم!',
      thumbnail: 'assets/images/gridlock-gurus-thumb.png',
      genre: 'Action',
      platforms: ['browser', 'android'],
      localUrl: '/games/cairo-runner/index.html',
      status: 'available'
    },
    {
      id: 'lethal-company',
      category: 'general',
      categories: ['action_3d', 'multiplayer_party', 'strategic'],
      title: 'Lethal Company 3D 🔦👽📦',
      description: 'لعبة الرعب والنجاة ثلاثية الأبعاد Lethal Company 3D! استكشف المنشآت الفضائية المظلمة، اجمع الخردة الثمينة، واهرب من الوحوش الكونية المرعبة مع أصدقائك!',
      thumbnail: 'assets/images/loot-and-scoot-thumb.png',
      genre: 'Horror / 3D',
      platforms: ['browser', 'pc'],
      localUrl: '/games/lethal-company/index.html',
      status: 'available'
    },
    {
      id: 'strategic-xo',
      category: 'mental',
      categories: ['strategic', 'mental'],
      title: 'Fractal XO ✖️⭕🌀',
      description: 'لعبة التحدي والذكاء الهندسية الفائقة Fractal XO! العب في شبكة فركتال لانهائية 9x9 حيث تتداخل ألعاب XO الصغيرة داخل الشبكة الكبرى لتحديد التحدي القادم!',
      thumbnail: 'assets/images/fractal-xo-thumb.png',
      genre: 'Puzzle',
      platforms: ['browser', 'android'],
      localUrl: '/games/strategic-xo/index.html',
      status: 'available'
    },
    {
      id: 'memory-match',
      category: 'mental',
      categories: ['mental', 'educational', 'reflex_focus', 'multiplayer_party'],
      title: 'Neural Pairs 🧠💡✨',
      description: 'لعبة مطابقة الذاكرة العصبية الفائقة Neural Pairs! طابق البطاقات المزدوجة واكتشف الرموز المتماثلة في أسرع وقت مع أصدقائك في نفس الشاشة أو أونلاين عبر P2P!',
      thumbnail: 'assets/images/neural-pairs-thumb.png',
      genre: 'Puzzle',
      platforms: ['browser', 'android'],
      localUrl: '/games/memory-match/index.html',
      status: 'available'
    },
    {
      id: 'space-shooter',
      category: 'general',
      categories: ['fast_paced', 'action_3d', 'reflex_focus'],
      title: 'Nova Blitz 🚀💥🌌',
      description: 'لعبة المعارك الفضائية والأنوار الكونية Nova Blitz! قد سفينتك الفضائية وسط انفجارات السوبرنوفا المضيئة واهزم أسراب الفضائيين!',
      thumbnail: 'assets/images/nova-blitz-thumb.png',
      genre: 'Action',
      platforms: ['browser', 'pc'],
      localUrl: '/games/space-shooter/index.html',
      status: 'available'
    },
    {
      id: 'spyfall',
      category: 'general',
      categories: ['multiplayer_party', 'strategic', 'mental'],
      title: 'Hidden Agent 🕵️‍♂️🔍💥',
      description: 'لعبة الخداع والمراوغة السرية Hidden Agent! العب مع أصدقائك من هاتف واحد (Pass & Play)، اطرحوا الأسئلة الذكية واكشفوا الجاسوس الخفي قبل أن يهرب!',
      thumbnail: 'assets/images/hidden-agent-thumb.png',
      genre: 'Social',
      platforms: ['browser', 'android'],
      localUrl: '/games/spyfall/index.html',
      status: 'available'
    },
    {
      id: 'tick-tock-bomb',
      category: 'general',
      categories: ['fast_paced', 'multiplayer_party'],
      title: 'Hot Potato 🥔🔥💣',
      description: 'لعبة التمرير والإجابة السريعة الحماسية Hot Potato! أجب على السؤال بسرعة ومرر الهاتف قبل أن تنفجر بطاطس القنبلة المشتعلة في يدك!',
      thumbnail: 'assets/images/hot-potato-thumb.png',
      genre: 'Social',
      platforms: ['browser', 'android'],
      localUrl: '/games/tick-tock-bomb/index.html',
      status: 'available'
    },
    {
      id: 'heads-up',
      category: 'general',
      categories: ['multiplayer_party', 'educational', 'words_puzzles'],
      title: 'On My Head 📱🤦‍♂️✨',
      description: 'لعبة الحركات والتخمين الجماعية On My Head! ضع الهاتف على جبهتك لتبدأ اللعب، وسيقوم أصدقاؤك بتمثيل الكلمة المعروضة وعليك تخمينها قبل انتهاء الـ 60 ثانية.',
      thumbnail: 'assets/images/on-my-head-thumb.png',
      genre: 'Party',
      platforms: ['browser', 'android'],
      localUrl: '/games/heads-up/index.html',
      status: 'available'
    },
    {
      id: 'draw-and-guess',
      category: 'general',
      categories: ['multiplayer_party', 'educational', 'words_puzzles'],
      title: 'Sketch & Guess 🎨✏️✨',
      description: 'لعبة التحدي والإبداع الفني Sketch & Guess! امسك القلم السحري وارسم الكلمة السرية على اللوحة بينما يصرخ أصدقاؤك لتخمين الرسمة قبل فوات الوقت!',
      thumbnail: 'assets/images/sketch-and-guess-thumb.png',
      genre: 'Party',
      platforms: ['browser', 'android', 'pc'],
      localUrl: '/games/draw-and-guess/index.html',
      status: 'available'
    },
    {
      id: 'dobble',
      category: 'general',
      categories: ['fast_paced', 'reflex_focus', 'multiplayer_party'],
      title: 'Symbol Hunter 🎯⚡🔮',
      description: 'لعبة المطابقة السريعة وصيد الرموز الحماسية Symbol Hunter! ابحث عن الرمز المتطابق الوحيد بين بطاقتك وبطاقة خصمك واضغط عليه أولاً للفوز!',
      thumbnail: 'assets/images/symbol-hunter-thumb.png',
      genre: 'Party',
      platforms: ['browser', 'android'],
      localUrl: '/games/dobble/index.html',
      status: 'available'
    },
    {
      id: 'squid-game',
      category: 'general',
      categories: ['fast_paced', 'multiplayer_party', 'reflex_focus'],
      title: 'الضوء الأحمر والأخضر 🦑',
      description: 'لعبة شاشة منقسمة (Split-Screen) حماسية! اركض عندما يكون الضوء أخضر، وارفع إصبعك فوراً عندما يصبح أحمر وإلا سيتم إقصاؤك!',
      thumbnail: 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%3E%3Cdefs%3E%3CradialGradient%20id%3D%22bg%22%20cx%3D%2250%25%22%20cy%3D%2250%25%22%20r%3D%2270%25%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%23312e81%22%2F%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%231e1b4b%22%2F%3E%3C%2FradialGradient%3E%3Cfilter%20id%3D%22glow%22%3E%3CfeGaussianBlur%20stdDeviation%3D%228%22%20result%3D%22blur%22%2F%3E%3CfeMerge%3E%3CfeMergeNode%20in%3D%22blur%22%2F%3E%3CfeMergeNode%20in%3D%22SourceGraphic%22%2F%3E%3C%2FfeMerge%3E%3C%2Ffilter%3E%3C%2Fdefs%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22url(%23bg)%22%20%2F%3E%3Cg%20transform%3D%22translate(400%2C300)%22%3E%3Ccircle%20cx%3D%22-150%22%20cy%3D%220%22%20r%3D%2260%22%20fill%3D%22%2310b981%22%20filter%3D%22url(%23glow)%22%2F%3E%3Ccircle%20cx%3D%22150%22%20cy%3D%220%22%20r%3D%2260%22%20fill%3D%22%23ef4444%22%20filter%3D%22url(%23glow)%22%2F%3E%3Cpath%20d%3D%22M-40%200%20L40%200%22%20stroke%3D%22%23cbd5e1%22%20stroke-width%3D%2210%22%20stroke-dasharray%3D%2215%2C15%22%2F%3E%3C%2Fg%3E%3Ctext%20x%3D%22400%22%20y%3D%22480%22%20font-family%3D%22system-ui%2C%20sans-serif%22%20font-size%3D%2260%22%20font-weight%3D%22900%22%20fill%3D%22%23fff%22%20text-anchor%3D%22middle%22%20filter%3D%22url(%23glow)%22%3ERED%20LIGHT%20GREEN%20LIGHT%3C%2Ftext%3E%3Ctext%20x%3D%22400%22%20y%3D%22150%22%20font-family%3D%22system-ui%2C%20sans-serif%22%20font-size%3D%2280%22%20font-weight%3D%22900%22%20fill%3D%22%23fff%22%20text-anchor%3D%22middle%22%3E%F0%9F%A6%91%3C%2Ftext%3E%3C%2Fsvg%3E',
      genre: 'Party',
      platforms: ['browser', 'android'],
      localUrl: '/games/squid-game/index.html',
      status: 'available'
    },
    {
      id: 'snake-arena',
      category: 'general',
      categories: ['fast_paced', 'multiplayer_party', 'action_3d'],
      title: 'حرب الثعابين 🐍',
      description: 'لعبة الثعبان الجماعية الكلاسيكية! العب مع أصدقائك عبر الإنترنت (P2P)، وتجنب الاصطدام بهم لتكون آخر الناجين.',
      thumbnail: 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22%23064e3b%22%2F%3E%3Ctext%20x%3D%22400%22%20y%3D%22300%22%20font-size%3D%22120%22%20text-anchor%3D%22middle%22%3E%F0%9F%90%8D%3C%2Ftext%3E%3Ctext%20x%3D%22400%22%20y%3D%22450%22%20font-family%3D%22system-ui%2C%20sans-serif%22%20font-size%3D%2260%22%20font-weight%3D%22900%22%20fill%3D%22%23fff%22%20text-anchor%3D%22middle%22%3ESNAKE%20ARENA%3C%2Ftext%3E%3C%2Fsvg%3E',
      genre: 'Action',
      platforms: ['browser', 'pc', 'android'],
      localUrl: '/games/snake-arena/index.html',
      status: 'available'
    },
    {
      id: 'arabic-wordle',
      category: 'mental',
      categories: ['educational', 'words_puzzles', 'mental', 'strategic'],
      title: 'LexiCode 🔤🟩🟨',
      description: 'لعبة التشفير والتخمين الذكي للكلمات العربية LexiCode! خمن الكلمة السرية المكونة من 5 حروف في 6 محاولات فقط واكتشف الألوان الصحيحة!',
      thumbnail: 'assets/images/lexicode-thumb.png',
      genre: 'Puzzle',
      platforms: ['browser', 'pc', 'android'],
      localUrl: '/games/arabic-wordle/index.html',
      status: 'available'
    },
    {
      id: 'escape-room',
      category: 'mental',
      categories: ['mental', 'strategic', 'multiplayer_party'],
      title: 'غرفة الهروب 🚪',
      description: 'لعبة تعاونية (P2P). تبادلا التلميحات عبر الميكروفون لحل الألغاز وفتح الأقفال والهروب معاً قبل نفاد الوقت!',
      thumbnail: 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22%231e1b4b%22%2F%3E%3Cg%20transform%3D%22translate(300%2C150)%22%3E%3Crect%20x%3D%220%22%20y%3D%220%22%20width%3D%22200%22%20height%3D%22250%22%20fill%3D%22%23475569%22%20stroke%3D%22%23334155%22%20stroke-width%3D%2210%22%2F%3E%3Ccircle%20cx%3D%22160%22%20cy%3D%22125%22%20r%3D%2210%22%20fill%3D%22%23fbbf24%22%20%2F%3E%3C%2Fg%3E%3Ctext%20x%3D%22400%22%20y%3D%22500%22%20font-family%3D%22system-ui%2C%20sans-serif%22%20font-size%3D%2260%22%20font-weight%3D%22900%22%20fill%3D%22%23fff%22%20text-anchor%3D%22middle%22%3EESCAPE%20ROOM%3C%2Ftext%3E%3C%2Fsvg%3E',
      genre: 'Co-op',
      platforms: ['browser', 'pc'],
      localUrl: '/games/escape-room/index.html',
      status: 'available'
    },
    {
      id: 'fruit-slicer',
      category: 'general',
      categories: ['fast_paced', 'reflex_focus', 'action_3d'],
      title: 'Fruit Frenzy 🍉🍍⚔️',
      description: 'لعبة التقطيع الاستوائية السريعة Fruit Frenzy! اقطع الفواكه المتطايرة بمهارة السيف النينجا واجمع أعلى النقاط وتفاد القنابل!',
      thumbnail: 'assets/images/fruit-frenzy-thumb.png',
      genre: 'Action',
      platforms: ['browser', 'pc', 'android'],
      localUrl: '/games/fruit-slicer/index.html',
      status: 'available'
    },
    {
      id: 'typing-defense',
      category: 'mental',
      categories: ['educational', 'fast_paced', 'words_puzzles'],
      title: 'حرب الطباعة ⌨️',
      description: 'الكلمات تتساقط من السماء! اكتبها بسرعة لتدمرها قبل أن تصل إلى القاعدة وتدمرها.',
      thumbnail: 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22%230f172a%22%2F%3E%3Crect%20x%3D%22300%22%20y%3D%22200%22%20width%3D%22200%22%20height%3D%2280%22%20rx%3D%2240%22%20fill%3D%22%231e293b%22%20stroke%3D%22%238b5cf6%22%20stroke-width%3D%224%22%2F%3E%3Ctext%20x%3D%22400%22%20y%3D%22250%22%20font-size%3D%2240%22%20font-family%3D%22sans-serif%22%20fill%3D%22%23fff%22%20text-anchor%3D%22middle%22%3ESUPER%3C%2Ftext%3E%3Cpath%20d%3D%22M400%20350%20L400%20500%22%20stroke%3D%22%23ef4444%22%20stroke-width%3D%2210%22%20stroke-dasharray%3D%2220%2C20%22%2F%3E%3Ctext%20x%3D%22400%22%20y%3D%22550%22%20font-family%3D%22system-ui%2C%20sans-serif%22%20font-size%3D%2260%22%20font-weight%3D%22900%22%20fill%3D%22%23fff%22%20text-anchor%3D%22middle%22%3ETYPING%20DEFENSE%3C%2Ftext%3E%3C%2Fsvg%3E',
      genre: 'Puzzle',
      platforms: ['browser', 'pc'],
      localUrl: '/games/typing-defense/index.html',
      status: 'available'
    },
    {
      id: 'flappy-clone',
      category: 'general',
      categories: ['fast_paced', 'reflex_focus'],
      title: 'Flying Kong 🐦🎈✨',
      description: 'لعبة الطيران والمغامرة Flying Kong! حرك العصفورة المضحكة وطير بها بمهارة بين الأنابيب والحواجز الملونة للتحليق لأعلى الأرقام القياسية!',
      thumbnail: 'assets/images/flying-kong-thumb.png',
      genre: 'Action',
      platforms: ['browser', 'android'],
      localUrl: '/games/flappy-clone/index.html',
      status: 'available'
    },
    {
      id: 'math-racer',
      category: 'mental',
      categories: ['educational', 'mental', 'fast_paced'],
      title: 'سباق الرياضيات 🏎️',
      description: 'تسابق ضد الزمن! أجب عن المسائل الحسابية بأسرع ما يمكن لتسبق السيارة الأخرى إلى خط النهاية.',
      thumbnail: 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22%231f2937%22%2F%3E%3Ctext%20x%3D%22400%22%20y%3D%22250%22%20font-size%3D%22100%22%20font-family%3D%22sans-serif%22%20fill%3D%22%23facc15%22%20text-anchor%3D%22middle%22%3E5%20%2B%207%20%3D%20%3F%3C%2Ftext%3E%3Ctext%20x%3D%22300%22%20y%3D%22400%22%20font-size%3D%2280%22%20text-anchor%3D%22middle%22%3E%F0%9F%9A%99%3C%2Ftext%3E%3Ctext%20x%3D%22500%22%20y%3D%22400%22%20font-size%3D%2280%22%20text-anchor%3D%22middle%22%3E%F0%9F%8F%8E%EF%B8%8F%3C%2Ftext%3E%3Ctext%20x%3D%22400%22%20y%3D%22550%22%20font-family%3D%22system-ui%2C%20sans-serif%22%20font-size%3D%2260%22%20font-weight%3D%22900%22%20fill%3D%22%23fff%22%20text-anchor%3D%22middle%22%3EMATH%20RACER%3C%2Ftext%3E%3C%2Fsvg%3E',
      genre: 'Puzzle',
      platforms: ['browser', 'android', 'pc'],
      localUrl: '/games/math-racer/index.html',
      status: 'available'
    },
    {
      id: 'air-hockey',
      category: 'general',
      categories: ['fast_paced', 'multiplayer_party', 'reflex_focus'],
      title: 'الهوكي الهوائي 🏒',
      description: 'لعبة كلاسيكية حماسية! العب ضد صديقك على نفس الشاشة أو تحدى الذكاء الاصطناعي في مباريات سريعة.',
      thumbnail: 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22%23e0f2fe%22%2F%3E%3Crect%20x%3D%22300%22%20y%3D%220%22%20width%3D%22200%22%20height%3D%2220%22%20fill%3D%22%23ef4444%22%2F%3E%3Crect%20x%3D%22300%22%20y%3D%22580%22%20width%3D%22200%22%20height%3D%2220%22%20fill%3D%22%233b82f6%22%2F%3E%3Ccircle%20cx%3D%22400%22%20cy%3D%22300%22%20r%3D%22100%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%2210%22%2F%3E%3Cline%20x1%3D%220%22%20y1%3D%22300%22%20x2%3D%22800%22%20y2%3D%22300%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%2210%22%2F%3E%3Ccircle%20cx%3D%22400%22%20cy%3D%22150%22%20r%3D%2250%22%20fill%3D%22%23ef4444%22%2F%3E%3Ccircle%20cx%3D%22400%22%20cy%3D%22450%22%20r%3D%2250%22%20fill%3D%22%233b82f6%22%2F%3E%3Ctext%20x%3D%22400%22%20y%3D%22320%22%20font-family%3D%22system-ui%2C%20sans-serif%22%20font-size%3D%2260%22%20font-weight%3D%22900%22%20fill%3D%22%230f172a%22%20text-anchor%3D%22middle%22%3EAIR%20HOCKEY%3C%2Ftext%3E%3C%2Fsvg%3E',
      genre: 'Action',
      platforms: ['browser', 'android'],
      localUrl: '/games/air-hockey/index.html',
      status: 'available'
    },
    {
      id: 'space-deception',
      category: 'general',
      categories: ['strategic', 'multiplayer_party', 'mental'],
      title: 'AstroTrick 🚀🕵️‍♂️🔪',
      description: 'لعبة التحدي والاستنتاج الخاطف AstroTrick! أنجزوا مهام سفينة الفضاء كطاقم، أو قوموا بالتسلل والتخريب كمخربين دون أن يكتشفكم أحد!',
      thumbnail: 'assets/images/astrotrick-thumb.png',
      genre: 'Co-op',
      platforms: ['browser', 'pc', 'android'],
      localUrl: '/games/space-deception/index.html',
      status: 'available',
      localModeType: 'ai'
    },
    {
      id: 'ludo-party',
      category: 'general',
      categories: ['cards_board', 'multiplayer_party', 'strategic'],
      title: 'Four Gems 💎🎲✨',
      description: 'لعبة البورد الكلاسيكية الفاخرة Four Gems! حرك أحجارك الكريستالية الأربعة (ياقوت، زمرد، ياقوت أزرق، جمشت) عبر اللوحة الذهبية وكن أول من يصل بكل جواهره إلى البيت!',
      thumbnail: 'assets/images/four-gems-thumb.png',
      genre: 'Board',
      platforms: ['browser', 'android'],
      localUrl: '/games/ludo-party/index.html',
      status: 'available'
    },
    {
      id: 'crazy-uno',
      category: 'general',
      categories: ['cards_board', 'multiplayer_party', 'fast_paced'],
      title: 'JOHN 🎴🖤💜',
      description: 'لعبة البطاقات الشهيرة والمثيرة JOHN! العب مع 2 إلى 8 أصدقاء باللونين الأسود والأرجواني الفاخر، استخدم بطاقات السحب والعكس القاتلة، ولا تنس أن تصرخ "JOHN" قبل الفوز!',
      thumbnail: 'assets/images/john-thumb.png',
      genre: 'Card',
      platforms: ['browser', 'android'],
      localUrl: '/games/crazy-uno/index.html',
      status: 'available',
      localModeType: 'pass_and_play'
    },
    {
      id: 'werewolf-village',
      category: 'general',
      categories: ['multiplayer_party', 'strategic', 'mental'],
      title: "Who's the Wolf? 🐺🌕🔍",
      description: "لعبة الغموض والتنكر الجماعية Who's the Wolf? هناك مستذئب مخادع يتخفى بين القرويين! تناقشوا وحققوا لاكتشاف الخونة قبل منتصف الليل!",
      thumbnail: 'assets/images/whos-the-wolf-thumb.png',
      genre: 'Social',
      platforms: ['browser', 'android', 'pc'],
      localUrl: '/games/werewolf-village/index.html',
      status: 'available',
      localModeType: 'ai'
    },
    {
      id: 'bomb-arena',
      category: 'general',
      categories: ['fast_paced', 'multiplayer_party', 'action_3d'],
      title: 'Boom Buddies 💣💥👥',
      description: 'لعبة معارك وتفجير القنابل الجماعية الحماسية Boom Buddies! انطلق مع أصدقائك في ساحات ملونة قابلة للتدمير، ازرع القنابل، اجمع النجوم والـ Power-ups وكن الناجي الأخير!',
      thumbnail: 'assets/images/boom-buddies-thumb.png',
      genre: 'Action / Party',
      platforms: ['browser', 'android', 'pc'],
      localUrl: '/games/bomb-arena/index.html',
      status: 'available',
      mobileControls: {
        movement: {
          up: ['ArrowUp', 'w'],
          down: ['ArrowDown', 's'],
          left: ['ArrowLeft', 'a'],
          right: ['ArrowRight', 'd']
        },
        actions: [
          { label: 'BOMB', keys: [' ', ' '], style: 'danger' }
        ]
      }
    },
    {
      id: 'funny-answers',
      category: 'general',
      categories: ['multiplayer_party', 'words_puzzles', 'cards_board'],
      title: 'Absurdo 🤣🃏💥',
      description: 'لعبة الحفلات والبطاقات الكوميدية الأكثر عبثية وإضحاكاً Absurdo! املأ الفراغات في البطاقات السوداء بأغرب وأظرف إجابات من بطاقاتك البيضاء ودع القاضي يختار الفائز!',
      thumbnail: 'assets/images/absurdo-thumb.png',
      genre: 'Party / Comedy',
      platforms: ['browser', 'android'],
      localUrl: '/games/funny-answers/index.html',
      status: 'available',
      localModeType: 'pass_and_play'
    },
    {
      id: 'number-hunt',
      category: 'general',
      categories: ['fast_paced', 'reflex_focus', 'mental'],
      title: 'Spot It: Digits 🎯🔢✨',
      description: 'لعبة السرعة والتركيز الخاطف Spot It: Digits! ابحث عن الرقم المطلوب من بين مئات الأرقام المتطايرة واضغط عليه فوراً للانتصار!',
      thumbnail: 'assets/images/spot-it-digits-thumb.png',
      genre: 'Party',
      platforms: ['browser', 'pc', 'android'],
      localUrl: '/games/number-hunt/index.html',
      status: 'available'
    },
    {
      id: 'mindustry',
      category: 'mental',
      categories: ['strategic', 'simulation_coding', 'mental'],
      title: 'Bots & Blocks 🤖🧱⚡',
      description: 'لعبة بناء الروبوتات والمصانع الذكية والدفاع الآلي Bots & Blocks! ابنِ آلات الاستخراج، سيور النقل، شبكات الطاقة، والمدافع الدفاعية مع روبوتاتك لتصدي لموجات الأعداء!',
      thumbnail: 'assets/images/bots-and-blocks-thumb.png',
      genre: 'Strategy / Automation',
      platforms: ['browser', 'pc', 'android'],
      localUrl: '/games/mindustry/index.html',
      status: 'available',
      hasCustomMenu: true
    },
    {
      id: 'adventure-time',
      category: 'general',
      categories: ['action_3d', 'fast_paced', 'strategic'],
      title: 'Loot & Scoot 🗡️💎🏃‍♂️',
      description: 'لعبة المغامرة وجمع الغنائم السريعة Loot & Scoot! استكشف الحصون المليئة بالكنوز، حارب الوحوش بالسيف، واجمع الذهب والجواهر النادرة واهرب بها بأقصى سرعة!',
      thumbnail: 'assets/images/loot-scoot-thumb.jpg',
      genre: 'Action / RPG',
      platforms: ['browser', 'android', 'pc'],
      status: 'available'
    }
  ];

  // ================= CATEGORIES MANAGEMENT ENGINE ================= //

  get categories(): GameCategory[] {
    return this.getCategories();
  }

  getCategories(): GameCategory[] {
    let custom: GameCategory[] = [];
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(this.customCategoriesKey);
        if (raw) custom = JSON.parse(raw);
      } catch (e) {}
    }
    return [...this.defaultCategories, ...custom];
  }

  addCategory(newCat: { id?: string; label: string; icon?: string; color?: string; description?: string }): GameCategory {
    const slug = (newCat.id || ('cat_' + Date.now())).trim().toLowerCase().replace(/\s+/g, '_');
    const createdCat: GameCategory = {
      id: slug,
      label: newCat.label.trim(),
      icon: newCat.icon?.trim() || '🏷️',
      color: newCat.color || 'from-indigo-500 to-purple-600',
      description: newCat.description?.trim() || 'تصنيف مخصص أضافه المستخدم',
      isCustom: true
    };

    if (typeof localStorage !== 'undefined') {
      const existing = this.getCustomCategories();
      const filtered = existing.filter(c => c.id !== createdCat.id);
      const updated = [...filtered, createdCat];
      localStorage.setItem(this.customCategoriesKey, JSON.stringify(updated));
    }
    return createdCat;
  }

  deleteCategory(catId: string): void {
    if (typeof localStorage !== 'undefined') {
      const existing = this.getCustomCategories();
      const filtered = existing.filter(c => c.id !== catId);
      localStorage.setItem(this.customCategoriesKey, JSON.stringify(filtered));

      // Also clean up any game category overrides using this deleted category
      const overrides = this.getGameCategoryOverrides();
      let changed = false;
      for (const gid in overrides) {
        if (overrides[gid].includes(catId)) {
          overrides[gid] = overrides[gid].filter(c => c !== catId);
          changed = true;
        }
      }
      if (changed) {
        localStorage.setItem(this.categoryOverridesKey, JSON.stringify(overrides));
      }
    }
  }

  getCustomCategories(): GameCategory[] {
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(this.customCategoriesKey);
        if (raw) return JSON.parse(raw);
      } catch (e) {}
    }
    return [];
  }

  // ================= PER-GAME CATEGORY OVERRIDES ================= //

  getGameCategoryOverrides(): Record<string, string[]> {
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(this.categoryOverridesKey);
        if (raw) return JSON.parse(raw);
      } catch (e) {}
    }
    return {};
  }

  updateGameCategories(gameId: string, categories: string[]): void {
    if (typeof localStorage !== 'undefined') {
      const overrides = this.getGameCategoryOverrides();
      const sanitized = Array.from(new Set(categories.filter(c => !!c)));
      overrides[gameId] = sanitized;
      localStorage.setItem(this.categoryOverridesKey, JSON.stringify(overrides));
    }
  }

  resetGameCategories(gameId: string): void {
    if (typeof localStorage !== 'undefined') {
      const overrides = this.getGameCategoryOverrides();
      delete overrides[gameId];
      localStorage.setItem(this.categoryOverridesKey, JSON.stringify(overrides));
    }
  }

  resetAllCategoryOverrides(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.categoryOverridesKey);
    }
  }

  getEffectiveGameCategories(game: ArcadeGame): string[] {
    const overrides = this.getGameCategoryOverrides();
    if (overrides[game.id] && Array.isArray(overrides[game.id])) {
      return overrides[game.id];
    }
    if (game.categories && game.categories.length > 0) {
      return game.categories;
    }
    if (game.category) {
      return [game.category];
    }
    return ['general'];
  }

  // ================= PUBLISHED CUSTOM GAMES STORAGE ================= //

  getPublishedGames(): ArcadeGame[] {
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(this.publishedGamesKey);
        if (stored) return JSON.parse(stored);
      } catch (e) {}
    }
    return [];
  }

  publishGame(gameData: { title: string; description: string; genre: string; category: string; categories?: string[]; htmlContent: string; thumbnail?: string }): ArcadeGame {
    const published = this.getPublishedGames();
    const id = 'custom_game_' + Date.now();
    const cats = gameData.categories && gameData.categories.length > 0 
      ? gameData.categories 
      : [gameData.category || 'general'];

    const newGame: ArcadeGame = {
      id: id,
      category: cats[0] || 'general',
      categories: cats,
      title: gameData.title,
      description: gameData.description || 'لعبة مخصصة تم إنشاؤها بنجاح ونشرها عبر استوديو الألعاب الذكي.',
      thumbnail: gameData.thumbnail || 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22%234f46e5%22%2F%3E%3Ctext%20x%3D%22400%22%20y%3D%22280%22%20font-size%3D%22100%22%20text-anchor%3D%22middle%22%3E%F0%9F%9A%80%3C%2Ftext%3E%3Ctext%20x%3D%22400%22%20y%3D%22420%22%20font-family%3D%22system-ui%2C%20sans-serif%22%20font-size%3D%2240%22%20font-weight%3D%22900%22%20fill%3D%22%23fff%22%20text-anchor%3D%22middle%22%3E' + encodeURIComponent(gameData.title.substring(0, 20)) + '%3C%2Ftext%3E%3C%2Fsvg%3E',
      genre: gameData.genre || 'Arcade AI',
      platforms: ['browser'],
      status: 'available',
      hasCustomMenu: true
    };

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`arcade_custom_code_${id}`, gameData.htmlContent);
      localStorage.setItem(this.publishedGamesKey, JSON.stringify([newGame, ...published]));
    }

    return newGame;
  }

  saveOrUpdateCustomGame(gameId: string, gameData: { title: string; description?: string; thumbnail?: string; category?: string; categories?: string[]; genre?: string }, htmlContent: string): ArcadeGame {
    const published = this.getPublishedGames();
    const existingIndex = published.findIndex(g => g.id === gameId);
    const cats = gameData.categories && gameData.categories.length > 0 
      ? gameData.categories 
      : [gameData.category || 'general'];

    const updatedGame: ArcadeGame = {
      id: gameId,
      category: cats[0] || 'general',
      categories: cats,
      title: gameData.title,
      description: gameData.description || 'لعبة مخصصة تم استقبالها من صديق ومزامنتها بنجاح.',
      thumbnail: gameData.thumbnail || 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22%234f46e5%22%2F%3E%3Ctext%20x%3D%22400%22%20y%3D%22280%22%20font-size%3D%22100%22%20text-anchor%3D%22middle%22%3E%F0%9F%9A%80%3C%2Ftext%3E%3Ctext%20x%3D%22400%22%20y%3D%22420%22%20font-family%3D%22system-ui%2C%20sans-serif%22%20font-size%3D%2240%22%20font-weight%3D%22900%22%20fill%3D%22%23fff%22%20text-anchor%3D%22middle%22%3E' + encodeURIComponent(gameData.title.substring(0, 20)) + '%3C%2Ftext%3E%3C%2Fsvg%3E',
      genre: gameData.genre || 'Arcade AI',
      platforms: ['browser'],
      status: 'available',
      hasCustomMenu: true
    };

    if (existingIndex >= 0) {
      published[existingIndex] = updatedGame;
    } else {
      published.unshift(updatedGame);
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`arcade_custom_code_${gameId}`, htmlContent);
      localStorage.setItem(this.publishedGamesKey, JSON.stringify(published));
    }

    return updatedGame;
  }

  hasUpToDateCustomGame(gameId: string): boolean {
    if (typeof localStorage === 'undefined') return false;
    const code = localStorage.getItem(`arcade_custom_code_${gameId}`);
    return !!code && code.trim().length > 0;
  }

  getGames(): Observable<ArcadeGame[]> {
    const custom = this.getPublishedGames();
    const all = [...custom, ...this.games];
    const overrides = this.getGameCategoryOverrides();

    const merged = all.map(game => {
      const effectiveCats = overrides[game.id] || game.categories || (game.category ? [game.category] : ['general']);
      return {
        ...game,
        categories: effectiveCats,
        category: effectiveCats[0] || game.category || 'general'
      };
    });

    return of(merged);
  }

  getGameById(id: string): Observable<ArcadeGame | undefined> {
    const custom = this.getPublishedGames();
    const foundCustom = custom.find(g => g.id === id);
    const overrides = this.getGameCategoryOverrides();

    if (foundCustom) {
      const effectiveCats = overrides[foundCustom.id] || foundCustom.categories || (foundCustom.category ? [foundCustom.category] : ['general']);
      return of({
        ...foundCustom,
        categories: effectiveCats,
        category: effectiveCats[0] || foundCustom.category || 'general'
      });
    }

    const foundBase = this.games.find(g => g.id === id);
    if (foundBase) {
      const effectiveCats = overrides[foundBase.id] || foundBase.categories || (foundBase.category ? [foundBase.category] : ['general']);
      return of({
        ...foundBase,
        categories: effectiveCats,
        category: effectiveCats[0] || foundBase.category || 'general'
      });
    }

    return of(undefined);
  }
}
