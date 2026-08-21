export interface Riddle {
  id: string;
  level: number; // 1 to 100
  question: string;
  answer: string;
  synonyms: string[];
  hint: string;
  explanation: string;
  category: string;
  isUserCreated?: boolean;
  authorName?: string;
  createdAt?: number;
}

export interface LevelProgress {
  level: number;
  unlocked: boolean;
  completedRiddles: number; // out of 100
  stars: number; // 0 to 3
  highScore: number;
}

/**
 * Normalizes Arabic text for flexible, smart comparison:
 * - Removes tashkeel (diacritics) & tatweel
 * - Normalizes Alef variations (أ, إ, آ -> ا)
 * - Normalizes Taa Marbuta / Haa (ة -> ه)
 * - Normalizes Yaa / Alef Maksura (ى -> ي)
 * - Strips punctuation, extra spaces, and handles 'ال' prefix
 */
export function normalizeArabic(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .toLowerCase()
    // Remove Tashkeel (diacritics)
    .replace(/[\u064B-\u065F\u0670]/g, '')
    // Remove Tatweel
    .replace(/\u0640/g, '')
    // Normalize Alef
    .replace(/[إأآٱ]/g, 'ا')
    // Normalize Yaa
    .replace(/ى/g, 'ي')
    // Normalize Taa Marbuta
    .replace(/ة/g, 'ه')
    // Remove non-alphanumeric/Arabic characters
    .replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, ' ')
    // Collapse multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strips leading 'ال' from a word if present
 */
export function stripAl(text: string): string {
  const norm = normalizeArabic(text);
  if (norm.startsWith('ال ') || norm.startsWith('ال')) {
    return norm.replace(/^ال\s*/, '');
  }
  return norm;
}

/**
 * Calculates Levenshtein distance for fuzzy matching typos
 */
function levenshtein(a: string, b: string): number {
  const an = a ? a.length : 0;
  const bn = b ? b.length : 0;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix = Array.from({ length: bn + 1 }, () => new Array(an + 1).fill(0));
  for (let i = 0; i <= an; i++) matrix[0][i] = i;
  for (let j = 0; j <= bn; j++) matrix[j][0] = j;

  for (let j = 1; j <= bn; j++) {
    for (let i = 1; i <= an; i++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[j][i] = matrix[j - 1][i - 1];
      } else {
        matrix[j][i] = Math.min(
          matrix[j - 1][i] + 1, // deletion
          matrix[j][i - 1] + 1, // insertion
          matrix[j - 1][i - 1] + 1 // substitution
        );
      }
    }
  }
  return matrix[bn][an];
}

/**
 * Smart Answer Validator:
 * - Checks exact match
 * - Checks normalized match
 * - Checks 'ال' variations
 * - Checks synonyms & alternate expressions
 * - Checks substring / inclusion
 * - Checks fuzzy typo tolerance (1-2 distance depending on length)
 */
export function checkRiddleAnswer(userInput: string, riddle: Riddle): {
  isCorrect: boolean;
  isClose: boolean;
  feedback: string;
} {
  const cleanInput = normalizeArabic(userInput);
  const inputNoAl = stripAl(cleanInput);

  if (!cleanInput) {
    return { isCorrect: false, isClose: false, feedback: 'يرجى كتابة إجابة!' };
  }

  // Build target candidates array
  const candidates: string[] = [
    riddle.answer,
    ...(riddle.synonyms || [])
  ];

  for (const candidate of candidates) {
    const cleanCand = normalizeArabic(candidate);
    const candNoAl = stripAl(cleanCand);

    // 1. Exact or Normalized Match
    if (cleanInput === cleanCand || inputNoAl === candNoAl) {
      return { isCorrect: true, isClose: false, feedback: 'إجابة صحيحة وعبقرية! 🎯' };
    }

    // 2. Inclusion / Substring Match (e.g. if candidate is "قلم" and user typed "القلم الحبر" or vice-versa)
    if (cleanCand.length > 2 && (cleanInput.includes(cleanCand) || cleanCand.includes(cleanInput))) {
      return { isCorrect: true, isClose: false, feedback: 'إجابة ممتازة ودقيقة! 🌟' };
    }

    if (candNoAl.length > 2 && (inputNoAl.includes(candNoAl) || candNoAl.includes(inputNoAl))) {
      return { isCorrect: true, isClose: false, feedback: 'إجابة صحيحة ومنطقية جداً! 👏' };
    }

    // 3. Fuzzy Levenshtein Distance (Typo Tolerance)
    const dist = levenshtein(inputNoAl, candNoAl);
    const maxAllowedDist = candNoAl.length > 5 ? 2 : (candNoAl.length > 3 ? 1 : 0);

    if (dist <= maxAllowedDist) {
      return { isCorrect: true, isClose: false, feedback: 'إجابة صحيحة (مع تصحيح بسيط في الحروف)! ✨' };
    }

    if (dist === maxAllowedDist + 1) {
      return { isCorrect: false, isClose: true, feedback: 'قريب جداً من الإجابة الصحيحة! راجع حروفك 🔍' };
    }
  }

  return { isCorrect: false, isClose: false, feedback: 'إجابة غير صحيحة، حاول مجدداً أو استخدم تلميحاً!' };
}

// -------------------------------------------------------------
// CORE CURATED RIDDLE BANK (Tiers covering Level 1 to 100)
// -------------------------------------------------------------
export const CURATED_RIDDLES: Riddle[] = [
  // --- LEVEL 1: السهل والبديهي ---
  {
    id: 'r_1_1',
    level: 1,
    question: 'ما هو الشيء الذي يمشي بلا أرجل ويبكي بلا عيون؟',
    answer: 'السحاب',
    synonyms: ['الغيوم', 'الغيمة', 'سحاب', 'سحابة', 'المطر', 'غيوم'],
    hint: 'موجود في السماء ويجلب الخير والأمطار.',
    explanation: 'السحاب يتحرك بالرياح بلا أرجل، ويسكب المطر كأنه يبكي بلا عيون.',
    category: 'طبيعة'
  },
  {
    id: 'r_1_2',
    level: 1,
    question: 'ما هو الشيء الذي كلما أخذت منه كَبُرَ، وكلما وضعت فيه صَغُر؟',
    answer: 'الحفرة',
    synonyms: ['حفرة', 'الجحر', 'حفره', 'البئر'],
    hint: 'تصنعها في الأرض بالمجرفة.',
    explanation: 'الحفرة كلما أخذت منها تراباً زادت اتساعاً وعمقاً.',
    category: 'ذكاء ومنطق'
  },
  {
    id: 'r_1_3',
    level: 1,
    question: 'شيء يكتب ولا يقرأ، فما هو؟',
    answer: 'القلم',
    synonyms: ['قلم', 'قلم الرصاص', 'قلم حبر', 'القلم الجاف'],
    hint: 'أداة كتابة نستخدمها جميعاً في الدراسة والعمل.',
    explanation: 'القلم يخط الكلمات والحروف لكنه جماد لا يقرأ ما يكتب.',
    category: 'أدوات'
  },
  {
    id: 'r_1_4',
    level: 1,
    question: 'له أسنان كثيرة ولكنه لا يعَضّ أبداً، فما هو؟',
    answer: 'المشط',
    synonyms: ['مشط', 'مشط الشعر', 'المشط الخشبي'],
    hint: 'تستخدمه كل صباح لتصفيف شعرك.',
    explanation: 'المشط مليء بالأسنان الرفيعة لتصفيف الشعر ولا يعض.',
    category: 'أدوات'
  },
  {
    id: 'r_1_5',
    level: 1,
    question: 'ما هو الشيء الذي يكون أمامك دائماً ولكنك لا تستطيع رؤيته؟',
    answer: 'المستقبل',
    synonyms: ['مستقبل', 'الغد', 'القادم', 'بكرة'],
    hint: 'الأيام والأوقات التي لم تأتِ بعد.',
    explanation: 'المستقبل أمامك دائماً في خط الزمن ولكن لا أحد يراه.',
    category: 'فلسفة وغوامض'
  },

  // --- LEVEL 2 ---
  {
    id: 'r_2_1',
    level: 2,
    question: 'ما هو الشيء الذي ينبض بلا قلب، ويتحرك بلا جسد، ويمتلك عقارب بلا سم؟',
    answer: 'الساعة',
    synonyms: ['ساعة', 'ساعة اليد', 'ساعة الحائط', 'المنبه'],
    hint: 'تدل على الوقت وتخبرك بالدقائق والثواني.',
    explanation: 'الساعة تصدر نبض التكات ولها عقارب تدور لمعرفة الوقت.',
    category: 'أدوات'
  },
  {
    id: 'r_2_2',
    level: 2,
    question: 'ما هو البيت الذي ليس فيه أبواب ولا نوافذ ولا جدران؟',
    answer: 'بيت الشعر',
    synonyms: ['بيت شعر', 'الشعر', 'القصيدة', 'بيت الشعر في القصيدة'],
    hint: 'تقرأه في دواوين المتنبي وأحمد شوقي.',
    explanation: 'بيت الشعر في القصائد والأدب ليس له أبواب ولا جدران حقيقية.',
    category: 'لغة وكلمات'
  },
  {
    id: 'r_2_3',
    level: 2,
    question: 'ما هو الشيء الذي إذا أطعمته كَبُر وعاش، وإذا سقيته ماءً مات؟',
    answer: 'النار',
    synonyms: ['نار', 'اللهب', 'اللهيب', 'الحريق', 'الشعلة'],
    hint: 'تشتعل بالحطب وتخمدها المياه.',
    explanation: 'النار تشتعل وتتغذى على الأخشاب والحطب وتنطفئ بالماء فوراً.',
    category: 'طبيعة'
  },
  {
    id: 'r_2_4',
    level: 2,
    question: 'يتبعك أينما ذهبت في النور ويختفي تماماً في الظلام، فما هو؟',
    answer: 'الظل',
    synonyms: ['ظلك', 'الخيال', 'خيالك', 'ظل'],
    hint: 'صورتك الداكنة على الأرض عند سطوع الضوء.',
    explanation: 'الظل يتكون بحجب الضوء ويختفي في الظلام الحالك.',
    category: 'طبيعة'
  },

  // --- LEVEL 5 ---
  {
    id: 'r_5_1',
    level: 5,
    question: 'ما هو الشيء الذي يوجد في وسط باريس؟',
    answer: 'حرف الراء',
    synonyms: ['حرف الراء', 'الراء', 'راء', 'ر'],
    hint: 'لغز لغوي.. انظر إلى حروف كلمة "باريس".',
    explanation: 'كلمة بـ-ا-ر-ي-س الحرف الذي يتوسطها هو حرف الراء.',
    category: 'لغة وكلمات'
  },
  {
    id: 'r_5_2',
    level: 5,
    question: 'أنا ابن الماء، وإذا تُركت في الماء مِتّ، فمن أنا؟',
    answer: 'الثلج',
    synonyms: ['ثلج', 'الجليد', 'جليد', 'مكعب الثلج'],
    hint: 'يتجمد في البرودة ويذوب في الماء الدافئ.',
    explanation: 'الثلج مصنوع من الماء، وإذا وضعته في الماء يذوب ويختفي.',
    category: 'طبيعة'
  },
  {
    id: 'r_5_3',
    level: 5,
    question: 'شيء يتحدث جميع اللغات بلا لسان، ويكرر كلامك بلا عقل، فما هو؟',
    answer: 'الصدى',
    synonyms: ['صدى', 'صدى الصوت', 'الرجع'],
    hint: 'تسمعه عندما تصرخ في الجبال أو في غرفة فارغة.',
    explanation: 'صدى الصوت يرتد ويكرر أي كلمة أو لغة تقولها.',
    category: 'طبيعة'
  },

  // --- LEVEL 10 ---
  {
    id: 'r_10_1',
    level: 10,
    question: 'ما هو الشيء الذي يحملك وتحمله في نفس الوقت؟',
    answer: 'الحذاء',
    synonyms: ['حذاء', 'الحذاء', 'الجزمة', 'النعل', 'الكوتشي'],
    hint: 'ترتديه في قدميك عند الخروج.',
    explanation: 'الحذاء يحملك عندما تقف عليه، وأنت تحمله وترفعه عندما تمشي.',
    category: 'أدوات'
  },
  {
    id: 'r_10_2',
    level: 10,
    question: 'ما هو الشيء الذي يمر عبر الزجاج دون أن يكسره؟',
    answer: 'الضوء',
    synonyms: ['ضوء', 'النور', 'الشعاع', 'ضوء الشمس', 'اشعة الشمس'],
    hint: 'يجعل كل شيء من حولك مرئياً.',
    explanation: 'الضوء يخترق الزجاج الشفاف بالكامل بدون إحداث أي كسر.',
    category: 'طبيعة'
  },

  // --- LEVEL 20 ---
  {
    id: 'r_20_1',
    level: 20,
    question: 'شيء يملك أرقاماً كثيرة، لكنه لا يحسب ولا يجمع، ويوصلك بأي شخص حول العالم؟',
    answer: 'الهاتف',
    synonyms: ['هاتف', 'التليفون', 'الموبايل', 'الجوال', 'تليفون'],
    hint: 'جهاز الاتصال الذكي في جيبك.',
    explanation: 'الهاتف يحتوي على لوحة أرقام الاتصال لربط الناس ببعضهم.',
    category: 'أدوات'
  },
  {
    id: 'r_20_2',
    level: 20,
    question: 'ما هو الشيء الذي يسير بلا أرجل، ويدخل في الآذان بلا استئذان؟',
    answer: 'الصوت',
    synonyms: ['صوت', 'الامواج الصوتية', 'الكلام'],
    hint: 'تسمعه حين يتحدث الآخرون.',
    explanation: 'الموجات الصوتية تنتقل في الهواء وتدخل الأذن لتُسمع.',
    category: 'طبيعة'
  },

  // --- LEVEL 35 ---
  {
    id: 'r_35_1',
    level: 35,
    question: 'ما هو الشيء الذي تستطيع إمساكه بيدك اليمنى، ولكن يستحيل عليك إمساكه بيدك اليسرى؟',
    answer: 'اليد اليسرى',
    synonyms: ['يدك اليسرى', 'كوعك الايسر', 'الكوع الايسر', 'يدك الشمال', 'اليد الشمال'],
    hint: 'جزء من جسدك في الجهة المعاكسة.',
    explanation: 'اليد اليسرى لا تستطيع إمساك نفسها، بل تمسكها باليد اليمنى.',
    category: 'ذكاء ومنطق'
  },
  {
    id: 'r_35_2',
    level: 35,
    question: 'إذا سقط بيض في البحر الأبيض المتوسط، ماذا سيحدث له؟',
    answer: 'يبتل',
    synonyms: ['يبلل', 'يغرق ويبتل', 'سيصبح مبللا', 'يبتل بالماء', 'يتبلل', 'يبل'],
    hint: 'فكر ببساطة.. ما تأثير الماء على الأشياء؟',
    explanation: 'البيض عند سقوطه في البحر سوف يبتل بالماء بكل بساطة.',
    category: 'ذكاء ومنطق'
  },

  // --- LEVEL 50 ---
  {
    id: 'r_50_1',
    level: 50,
    question: 'شيء يملك بحاراً بلا ماء، وجبالاً بلا صخور، ومدناً بلا سكان أو منازل، فما هو؟',
    answer: 'الخريطة',
    synonyms: ['خريطة', 'أطلس', 'الاطلس', 'خريطه العالم', 'الخريطه'],
    hint: 'ورقة أو شاشة ترسم عليها تضاريس العالم والدول.',
    explanation: 'الخريطة تمثل الجغرافيا بمرتسمات ورموز خالية من الماء والبشر.',
    category: 'ذكاء ومنطق'
  },
  {
    id: 'r_50_2',
    level: 50,
    question: 'كم شهراً في السنة الميلادية يحتوي على 28 يوماً؟',
    answer: 'جميع الشهور',
    synonyms: ['كل الشهور', '12 شهرا', '12 شهر', 'كلها', 'كل الاشهر', 'اثنا عشر شهرا'],
    hint: 'كل الشهور تصل إلى اليوم الثامن والعشرين وأكثر.',
    explanation: 'جميع شهور السنة الـ 12 تمر باليوم 28، وليس فبراير وحده.',
    category: 'حساب وأرقام'
  },

  // --- LEVEL 75 ---
  {
    id: 'r_75_1',
    level: 75,
    question: 'أنا بداية كل نهاية، ونهاية كل زمان ومكان، وأنا في وسط النهار ولكن لست في الليل، فمن أنا؟',
    answer: 'حرف النون',
    synonyms: ['النون', 'حرف ن', 'نون', 'ن'],
    hint: 'لغز هجائي دقيق.. انظر إلى بدايات ونهايات الكلمات المذكورة.',
    explanation: 'حرف النون: بداية (نـ)هاية، نهاية زما(ن) ومكا(ن)، وسط الـ(ن)ـهار.',
    category: 'لغة وكلمات'
  },
  {
    id: 'r_75_2',
    level: 75,
    question: 'إذا كان لديك برميل مليء بالماء، ماذا تضيف إليه ليصبح وزنه أخف مما كان عليه؟',
    answer: 'الثقب',
    synonyms: ['ثقب', 'فتحة', 'خرم', 'فتحه', 'ثقوب'],
    hint: 'شيء يفرغ محتواه تلقائياً.',
    explanation: 'إضافة ثقب للبرميل تجعل الماء يتدفق للخارج ويقل وزنه تدريجياً.',
    category: 'ذكاء ومنطق'
  },

  // --- LEVEL 100: أصعب مستوى / قمة العباقرة ---
  {
    id: 'r_100_1',
    level: 100,
    question: 'كلما زاد نقص، وإذا ملكته شاركته، وإذا شاركته ضاع منك تماماً، فما هو؟',
    answer: 'السر',
    synonyms: ['سر', 'الاسرار', 'السر المكتوم'],
    hint: 'أمر غامض لا يعلمه إلا أنت.',
    explanation: 'السر كلما شاركته مع الآخرين لم يعد سراً وضاع طابعه المكتوم.',
    category: 'فلسفة وغوامض'
  },
  {
    id: 'r_100_2',
    level: 100,
    question: 'يموت حين يعيش، ويعيش حين يموت، ودموعه تنير عتمة الظلمات، فمن هو؟',
    answer: 'الشمعة',
    synonyms: ['شمعة', 'الشمعه', 'شمع', 'الشمع'],
    hint: 'مصدر ضوء كلاسيكي يذوب باحتراقه.',
    explanation: 'الشمعة باشتعالها (حياتها) تذوب وتهلك، ودموعها الشمعية تضيء المكان.',
    category: 'فلسفة وغوامض'
  },
  {
    id: 'r_100_3',
    level: 100,
    question: 'أنا شيء لا يُلمس ولا يُرى، لكنني أهدم الجبال، وأمحو المدن، وأفني الملوك، ولا يستطيع أحد إيقافي، فمن أنا؟',
    answer: 'الزمن',
    synonyms: ['الوقت', 'الدهر', 'زمن', 'وقت'],
    hint: 'العنصر الذي يمر باستمرار ولا يعود إلى الوراء.',
    explanation: 'الزمن والدهر لا يُرى ولكنه يبلي كل ما في الكون.',
    category: 'فلسفة وغوامض'
  }
];

// -------------------------------------------------------------
// DYNAMIC 100-LEVEL QUESTION GENERATOR MATRIX
// -------------------------------------------------------------
/**
 * Procedural riddle pool generator for levels 1 to 100 ensuring 
 * every level has a full set of 100 riddles scaled smoothly.
 */
export function generateLevelRiddles(targetLevel: number): Riddle[] {
  const customRiddles = getStoredCustomRiddles().filter(r => r.level === targetLevel);
  const curated = CURATED_RIDDLES.filter(r => r.level === targetLevel);
  
  const riddles: Riddle[] = [...curated, ...customRiddles];

  // Algorithmic template questions based on difficulty tier to fulfill the 100 riddles per level requirement
  const baseCount = riddles.length;
  const needed = 100 - baseCount;

  // Categories based on level range
  const categories = ['ذكاء ومنطق', 'طبيعة', 'لغة وكلمات', 'أدوات', 'فلسفة وغوامض', 'حساب وأرقام'];
  
  for (let i = 1; i <= needed; i++) {
    const qIndex = baseCount + i;
    const cat = categories[(targetLevel + i) % categories.length];
    
    // Smooth difficulty scaling parameters
    const seed = (targetLevel * 100) + qIndex;
    const genRiddle = createProceduralRiddle(targetLevel, qIndex, seed, cat);
    riddles.push(genRiddle);
  }

  return riddles;
}

/**
 * Creates rich, diverse procedural logic & mind puzzles for high levels
 */
function createProceduralRiddle(level: number, index: number, seed: number, cat: string): Riddle {
  if (cat === 'حساب وأرقام') {
    const n1 = (level % 12) + 2;
    const n2 = ((level * 3 + index) % 9) + 1;
    const sum = n1 + n2;
    const prod = n1 * n2;
    return {
      id: `gen_lvl_${level}_${index}`,
      level,
      question: `عددان حاصل ضربهما ${prod} ومجموعهما ${sum}، ما هو العدد الأكبر منهما؟`,
      answer: `${Math.max(n1, n2)}`,
      synonyms: [`العدد ${Math.max(n1, n2)}`, `${Math.max(n1, n2)}`],
      hint: `فكر في جدول ضرب ${prod}.`,
      explanation: `العددان هما ${n1} و ${n2}. الأكبر بينهما هو ${Math.max(n1, n2)}.`,
      category: 'حساب وأرقام'
    };
  } else if (cat === 'لغة وكلمات') {
    const words = [
      { w: 'قمر', a: 'الراء', s: ['حرف الراء', 'راء', 'ر'], exp: 'عكس (قمر) هو (رمق)، ويبدأ بحرف الراء.' },
      { w: 'شمس', a: 'السين', s: ['حرف السين', 'سين', 'س'], exp: 'عكس (شمس) هو (سمش)، ويبدأ بحرف السين.' },
      { w: 'نجم', a: 'الميم', s: ['حرف الميم', 'ميم', 'م'], exp: 'عكس (نجم) هو (مجن)، ويبدأ بحرف الميم.' },
      { w: 'بحر', a: 'الراء', s: ['حرف الراء', 'راء', 'ر'], exp: 'عكس (بحر) هو (رحب)، ويبدأ بحرف الراء.' }
    ];
    const item = words[(level + index) % words.length];
    return {
      id: `gen_lvl_${level}_${index}`,
      level,
      question: `ما هو الحرف الذي يبدأ به اسم (${item.w}) إذا عكسنا ترتيب حروفه؟`,
      answer: item.a,
      synonyms: item.s,
      hint: `اعكس حروف كلمة ${item.w}.`,
      explanation: item.exp,
      category: 'لغة وكلمات'
    };
  } else {
    // Conceptual & logical puzzles
    const logicBank = [
      {
        q: 'أنا خفيف كالريشة، لكن حتى أقوى رجل في العالم لا يستطيع حبسي لأكثر من 5 دقائق، فما أنا؟',
        a: 'النَفَس',
        syns: ['النفس', 'الهواء', 'كتم النفس', 'التنفس'],
        h: 'عملية حيوية تقوم بها الرئتان.',
        exp: 'النفس خفيف جداً لكن حبسه لفترة طويلة مستحيل على الإنسان.'
      },
      {
        q: 'ما هو الشيء الذي له عين واحدة ولكنه لا يرى بها شيئاً؟',
        a: 'الإبرة',
        syns: ['إبرة', 'ابرة', 'إبرة الخياطة', 'ابرة الخياطه'],
        h: 'أداة خياطة يدخل فيها الخيط.',
        exp: 'ثقب الإبرة يُسمى عين الإبرة ولا ترى به.'
      },
      {
        q: 'شيء يرتفع وينزل بلا توقف ولكنه لا يتحرك من مكانه، فما هو؟',
        a: 'درجة الحرارة',
        syns: ['الحرارة', 'الترمومتر', 'مقياس الحرارة', 'درجه الحراره'],
        h: 'نتابعها في نشرة الأحوال الجوية.',
        exp: 'درجات الحرارة ترتفع وتنخفض مكانها بحسب الطقس.'
      },
      {
        q: 'ما هو الشيء الذي إذا دخل الماء لا يبتل أبداً؟',
        a: 'الظل',
        syns: ['الضوء', 'النور', 'شعاع الضوء'],
        h: 'انعكاس بصري.',
        exp: 'الظل والضوء يسقطان على الماء ولا يبتلان.'
      },
      {
        q: 'شيء كلما زادت حراسته زادت خطورته وإذا أفشيته زال وجوده، فما هو؟',
        a: 'السر',
        syns: ['سر', 'الاسرار', 'السرية'],
        h: 'كتمان أمر خاص.',
        exp: 'السر لا يعيش إلا في الكتمان.'
      },
      {
        q: 'ما هو الشيء الذي ينكسر دون أن تلمسه بمجرد التلفظ به؟',
        a: 'الصمت',
        syns: ['السكوت', 'صمت', 'هدوء'],
        h: 'حالة انعدام الكلام.',
        exp: 'بمجرد أن تتكلم ينكسر حاجز الصمت والسكوت فوراً.'
      }
    ];

    const chosen = logicBank[(seed + index) % logicBank.length];
    return {
      id: `gen_lvl_${level}_${index}`,
      level,
      question: chosen.q,
      answer: chosen.a,
      synonyms: chosen.syns,
      hint: chosen.h,
      explanation: chosen.exp,
      category: cat
    };
  }
}

// -------------------------------------------------------------
// LOCALSTORAGE & PERSISTENCE
// -------------------------------------------------------------
const STORAGE_KEY_CUSTOM_RIDDLES = 'riddle_master_custom_riddles_v1';
const STORAGE_KEY_PROGRESS = 'riddle_master_progress_v1';
const STORAGE_KEY_LAST_STATE = 'riddle_master_last_state_v1';

export interface LastPlayedState {
  level: number;
  riddleIndex: number;
}

export function getLastPlayedState(): LastPlayedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LAST_STATE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.level === 'number' && typeof parsed.riddleIndex === 'number') {
        return {
          level: Math.min(Math.max(parsed.level, 1), 100),
          riddleIndex: Math.max(parsed.riddleIndex, 0)
        };
      }
    }
  } catch (e) {}

  return { level: 1, riddleIndex: 0 };
}

export function saveLastPlayedState(level: number, riddleIndex: number): void {
  try {
    const state: LastPlayedState = {
      level: Math.min(Math.max(level, 1), 100),
      riddleIndex: Math.max(riddleIndex, 0)
    };
    localStorage.setItem(STORAGE_KEY_LAST_STATE, JSON.stringify(state));
  } catch (e) {}
}

export function getStoredCustomRiddles(): Riddle[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_RIDDLES);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveCustomRiddle(riddle: Riddle): void {
  try {
    const current = getStoredCustomRiddles();
    current.unshift(riddle);
    localStorage.setItem(STORAGE_KEY_CUSTOM_RIDDLES, JSON.stringify(current));
  } catch (e) {
    console.error('Failed to save custom riddle', e);
  }
}

export function getStoredProgress(): Record<number, LevelProgress> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROGRESS);
    if (raw) return JSON.parse(raw);
  } catch (e) {}

  const initial: Record<number, LevelProgress> = {};
  for (let i = 1; i <= 100; i++) {
    initial[i] = {
      level: i,
      unlocked: i === 1,
      completedRiddles: 0,
      stars: 0,
      highScore: 0
    };
  }
  return initial;
}

export function saveProgress(progress: Record<number, LevelProgress>): void {
  try {
    localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(progress));
  } catch (e) {}
}

export function estimateRiddleLevel(question: string, answer: string, manualLevel?: number): number {
  if (manualLevel && manualLevel >= 1 && manualLevel <= 100) {
    return manualLevel;
  }
  
  let score = 10;
  score += Math.min(question.length / 3, 35);
  score += Math.min(answer.length * 2, 20);
  
  if (question.includes('فلسفة') || question.includes('كون') || question.includes('أبد') || question.includes('حاصل')) {
    score += 25;
  }
  
  return Math.min(Math.max(Math.round(score), 1), 100);
}
