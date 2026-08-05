export type ErrorType = 'grammar' | 'logic' | 'scientific';

export interface StoryError {
  id: number;
  type: ErrorType;
  sentenceIndex: number;
  originalText: string;
  correction: string;
  explanation: string;
}

export interface Story {
  id: string;
  title: string;
  content: string[]; // sentences
  errors: StoryError[];
}

export const STORIES: Story[] = [
  {
    id: 'story1',
    title: 'قصة اليوم الغريب',
    content: [
      'كان يوماً مشمساً في المنزل.',
      'دخل أحمد الغرفة وكان الكهرباء مقطوعة.',
      'ضغط أحمد على زر الإضاءة ليعمل الضوء.',
      'شعر أحمد بالحر الشديد ففتح الثلاجة ليبرد الغرفة.',
      'ثم تناول سيجارة وأشعلها وقال: التدخين مفيد إذا شربت بعدها كوب عصير.',
      'كانت الأمور تسير بشكل رائع.'
    ],
    errors: [
      {
        id: 1,
        type: 'grammar',
        sentenceIndex: 1,
        originalText: 'وكان الكهرباء',
        correction: 'وكانت الكهرباء',
        explanation: 'الكهرباء مؤنث، لذا يجب استخدام "كانت" وليس "كان".'
      },
      {
        id: 2,
        type: 'logic',
        sentenceIndex: 2,
        originalText: 'ضغط أحمد على زر الإضاءة ليعمل الضوء',
        correction: 'لم يعمل الضوء لأن الكهرباء مقطوعة',
        explanation: 'من المنطقي ألا تعمل الإضاءة إذا كانت الكهرباء مقطوعة بالفعل.'
      },
      {
        id: 3,
        type: 'logic',
        sentenceIndex: 3,
        originalText: 'فتح الثلاجة ليبرد الغرفة',
        correction: 'الثلاجة لا تبرد الغرفة',
        explanation: 'فتح الثلاجة يستهلك طاقة أكبر ويخرج حرارة للغرفة بدلاً من تبريدها.'
      },
      {
        id: 4,
        type: 'scientific',
        sentenceIndex: 4,
        originalText: 'التدخين مفيد إذا شربت بعدها كوب عصير',
        correction: 'التدخين ضار جداً بكل المقاييس',
        explanation: 'هذه خرافة خطيرة. لا يوجد أي مشروب أو طعام يبطل أضرار التدخين؛ فهو يسبب أمراضاً رئوية وقلبية مزمنة.'
      }
    ]
  }
];
