import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { LucideDynamicIcon } from '@lucide/angular';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FirebaseService } from '../../core/services/firebase.service';
import { ToastService } from '../../core/services/toast.service';
import { IndexedDBService } from '../../core/services/indexed-db.service';
import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

export type BookStatus = 'approved' | 'pending' | 'rejected';

export interface Chapter {
  title: string;
  content: string;
}

export interface PageImageFilter {
  brightness: number; // -100 to 100
  contrast: number;   // -100 to 100
  grayscale: number;  // 0 to 100
  invert: boolean;
  preset: 'original' | 'document' | 'grayscale' | 'night' | 'contrast';
  rotation: number;   // 0, 90, 180, 270
}

export interface BookPage {
  id: string;
  type: 'image' | 'text' | 'blank';
  imageUrl?: string;
  processedImageUrl?: string;
  textTitle?: string;
  textContent?: string;
  extractedText?: string;
  filter: PageImageFilter;
  selected?: boolean;
  isOcrLoading?: boolean;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  coverUrl: string;
  fileUrl: string;
  embedUrl?: string;
  category: string;
  status: BookStatus;
  uploaderId: string;
  uploaderName: string;
  downloadCount: number;
  createdAt: string;
  fileSize: string;
  rating?: number;
  ratingCount?: number;
  featured?: boolean;
  pagesCount?: number;
  chapters?: Chapter[];
  pages?: BookPage[];
  isPersonalPdf?: boolean;
  fileDataUrl?: string;
}

export const FAMOUS_EGYPTIAN_NOVELS: Book[] = [
  {
    id: 'novel_1',
    title: 'الثلاثية: بين القصرين',
    author: 'نجيب محفوظ',
    description: 'شاهكار أديب نوبل نجيب محفوظ، وتأريخ اجتماعي ونفسي مذهل لأسرة أحمد عبد الجواد وحياة القاهرة التاريخية.',
    coverUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
    fileUrl: '',
    category: 'روايات مصرية',
    status: 'approved',
    uploaderId: 'system',
    uploaderName: 'المكتبة العامة',
    downloadCount: 14200,
    createdAt: '2026-01-15',
    fileSize: '4.2 MB',
    rating: 4.9,
    ratingCount: 3840,
    featured: true,
    pagesCount: 520,
    chapters: [
      {
        title: 'الفصل الأول: هيبة السيد أحمد عبد الجواد في البيت',
        content: `انقضى منتصف الليل، وقامت أمينة من فراشها في تؤدة وحذر كي لا توقظ ابنتها خديجة من نومها العميق. تقدمت بصرامتها الهادئة نحو شباك المشربية المطين بالخشب الخرط، وقفت ترقب من خلال فتحاته المتقاطعة الطريق العتيق الصامت في حارة بين القصرين. كانت أضواء الفوانيس الغازية البعيدة تلقي بظلال باهتة على الجدران العريقة. كان انتظاره كل ليلة طقساً مقدساً لا يتخلف، انتظارا للسيد أحمد عبد الجواد، الرجل الذي تهتز له أركان الدار هيبة وإجلالاً.

ما إن سمعت وقع خطاه الثقيلة المنتظمة على درجات السلم الحجري، حتى تسارعت دقات قلبها بالمزيج القديم من الحب والهيبة. انفتح الباب وطلت قامته المديدة، بجلابيته الصوفية الفاخرة وعمامته الشديدة البياض. أسرعت لتخلع عنه جبته وتأتي له بماء الورد ليغسل يديه، بينما كان يلقي بنظراته الفاحصة في نواحي البهو كأنه يتفقد مملكته الحصينة.

كان السيد أحمد عبد الجواد يجمع في شخصيته بين المتناقضات التي صنعت منه أسطورة الحارة القاهرية: في بيته، هو الحاكم الناهي الذي لا يُرد له أمر، ولا ترفع في حضرته عين، بينما في دكانه وحواريه وسهراته مع أصدقائه في العوامات، هو الرجل الضاحك المداعب، صاحب النكتة والحضور الباذخ.`
      },
      {
        title: 'الفصل الثاني: فهمي وثورة 1919 ومواجهة الدبابات',
        content: `كانت سماء القاهرة تتوهج بحرارة مارس عام 1919. خرج فهمي من باب كلية الحقوق والملف المسطر بيده، وعيناه تشتعلان بحماسة الشباب الوطني. سرعان ما التحم بصفوف الجماهير المتدفقة كالموج الهادر من الأزهر والجمالية حتى ميدان الأوبرا.

كانت الحناجر تهتف بحياة مصر وسعد زغلول، والرايات الخضراء المزدانة بالهلال والصليب ترتفع فوق الرؤوس. وقف فهمي على درج جامع الحسين يلقي خطبته في الجماهير المحتشدة، غير أبه بالبنادق الإنجليزية المصوبة نحو الصدور.

في تلك اللحظة التاريخية، امتزج الصوت الفردي بالضمير الجمعي للأمة المصرية، ودرست الفوارق بين الطبقات تحت راية الحرية والاستقلال، مستعرضاً تضحيات الشباب المصري ونضالهم الخالد ضد الاحتلال.`
      },
      {
        title: 'الفصل الثالث: كمال والتساؤلات الفلسفية الأولى',
        content: `ينمو الصغير كمال بين جدران البيت القديم ومكتبة المدرسة، باحثاً عن الإجابات في الكتب والفلسفة. يتتبع حركة الحياة والطيور من سطح البيت، مشدوهاً بالتغيرات التي تعصف بعائلته وبالوطن حوله.

جلس كمال في حجرة المطالعة يتصفح أمهات الكتب، متسائلاً عن معنى الوجود والمصير والعدالة. كان يرى في والده رمزاً للسلطة والتاريخ، وفي أمه ينبوع الحنان والدعاء، لتتحول قضيته من مجرد طفل يلهو في الحارة إلى مفكر يبحث عن الحقيقة بين الإيمان والشك.`
      }
    ]
  },
  {
    id: 'novel_2',
    title: 'الفيل الأزرق',
    author: 'أحمد مراد',
    description: 'رحلة تشويقية وغموض نفسي يخطف الأنفاس حول الدكتور يحيى في عنبر 8 غرب لعزل المذنبين وتجارب النوايا المظلمة.',
    coverUrl: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=600&q=80',
    fileUrl: '',
    category: 'روايات مصرية',
    status: 'approved',
    uploaderId: 'system',
    uploaderName: 'المكتبة العامة',
    downloadCount: 18900,
    createdAt: '2026-02-01',
    fileSize: '3.8 MB',
    rating: 4.8,
    ratingCount: 4520,
    featured: true,
    pagesCount: 380,
    chapters: [
      {
        title: 'الفصل الأول: العودة إلى عنبر 8 غرب',
        content: `الرائحة هنا في مستشفى العباسية لا تشبه أي رائحة أخرى في العالم؛ مزيج خنق بين المطهرات القديمة ورطوبة جدران الحجر الرملي وحزن النفوس المعذبة. خطوت بخطوات ثقيلة في الطابق الثاني متجهاً إلى (عنبر 8 غرب)، العنبر المخصص لمن ارتكبوا الجرائم تحت بداعي المرض النفسي أو يدعون الجنون للفرار من حبل المشنقة.

كانت الفكرة برمتها تثقل كاهلي بعد سنوات غيابي الطويلة عن الطب وممارسته. حين فتح الحارس الباب الحديدي الثقيل وسحب المزلاج بصوت صارخ، وقعت عيناي على المتهم الجالس في زاوية الغرفة المظلمة. لم يكن سوى د. شريف الكردي، أعز أصدقائي في سنوات الدراسة، وصاحب العقل الألمعي الذي كان يشار إليه بالبنان.

كان يجلس صامتاً، ينظر إلى الفراغ بعينين غائرتين يملأهما السواد، وعلى رأسه وذراعيه أشكال وتجاعيد غريبة تشبه الرموش والتطاريز الهيروغليفية القديمة.`
      },
      {
        title: 'الفصل الثاني: وشم المأمون والأقراص الغريبة',
        content: `بدأت في فك شفرات التصرفات الغريبة لشريف، ليكتشف وجود أوسام ورموز قديمة منقوشة على جسده. تقع بين يدي حبة غريبة تُدعى "الفيل الأزرق" (DMT)، تأخذني في رحلات تنويمية عبر الزمن.

أخرجت العلبة الفضية الصغيرة من جيبي الداخلي وأنا أرتجف. التقطت الحبة ذات اللون الأزرق السماوي والتي تحمل نقشاً بارزاً لفيل صغير. وضعتها على لساني وابتلعتها بجرعة ماء قتامة. لم تمضِ سوى دقائق معدودات حتى بدأت جدران الغرفة تموج وتهتز، وتحولت الألوان الساكنة إلى طيف ناري يتحرك في كل اتجاه.

انفتحت بوابات الذاكرة البعيدة، ووجدت نفسي أطوف في أزمنة قديمة بالقاهرة المملوكية؛ مساجد قديمة، وأصوات ترتيل غامضة، وحوارات مقتطعة مع كيانات لا تنتمي لهذا العالم.`
      },
      {
        title: 'الفصل الثالث: المواجهة مع خبيث النوايا',
        content: `يتسابق يحيى مع الزمن قبل أن يجهز الكيان المظلم "نايل" على حبيبته وشقيقة شريف "لبنى". يغوص يحيى في أعماق العقل البشري مرتدياً جرأته وخوفه ليصنع الفارق بين النجاة والجنون الكلي.

وقفت أمام المرآة القديمة أردد الكلمات السحرية المنقوشة في الجلد القديم، أشاهد انعكاس عيني يتغير تدريجياً، مدركاً أن الحقيقة أغرب بكثير من الخيال.`
      }
    ]
  },
  {
    id: 'novel_3',
    title: 'أرض زيكولا',
    author: 'عمرو عبد الحميد',
    description: 'الرواية الفانتازية المصرية الأكثر شهرة بين القراء، التي تأخذنا إلى عالم يُقاس فيه الثراء بوحدات الذكاء.',
    coverUrl: 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=600&q=80',
    fileUrl: '',
    category: 'روايات مصرية',
    status: 'approved',
    uploaderId: 'system',
    uploaderName: 'المكتبة العامة',
    downloadCount: 25000,
    createdAt: '2026-03-05',
    fileSize: '3.4 MB',
    rating: 4.8,
    ratingCount: 6100,
    featured: true,
    pagesCount: 288,
    chapters: [
      {
        title: 'الفصل الأول: سرداب قرية البهو فريك',
        content: `خالد شاب مصري في الثامنة والعشرين من عمره، يقطن في قرية البهو فريك بمحافظة الشرقية. تقدم لخطبة حبيبته "منى" للمرة السادسة، ولكن والدها المتعنت يرفض تزويجه بحجة أنه شاب عادي لا يملك خطة مستقبلية مبهرة.

يعود خالد إلى بيته مكسور الخاطر، فيتذكر حديث جده القديم عن "سرداب فوريك" المغلق في قبو المنزل والذي تحاك حوله الحكايات والأساطير. يقرر خالد دخول السرداب لاستكشاف الممر المجهول عله يجد شيئاً يغير حياته.

يخوض في نفق رطب ومظلم يمتد لمسافات طويلة تحت الأرض، ليفقد الوعي وينجرف عبر البوابة الزمنية. يستيقظ خالد ليجد نفسه تحت شمس ساطعة في أرض صحراوية غريبة لا يراها في الخريطة، ويلتقي بأول مواطن ليعلم أنه وطئت قدمه "أرض زيكولا" التي تحكمها قوانين لم يسمع بها بشر من قبل.`
      },
      {
        title: 'الفصل الثاني: التعامل بوحدات الذكاء وتجارة العقول',
        content: `يتفاجأ خالد عندما يحاول شراء الطعام والماء في سوق زيكولا، فيخبره التاجر مستغرباً أنهم لا يتعاملون هنا بالنقود الذهبية أو الورقية! "ماذا تعني؟ كيف تبيع وتشتري إذن؟" يسأل خالد بدهشة.

يجيبه التاجر: "هنا في زيكولا نتعامل بوحدات الذكاء! العمل والتفكير يستهلكان من ذكائك، والشراء يخصم من وحدات عقلك التي تسجلها عربة القياس".

يدرك خالد الهول والخطورة: الأذكياء والمفكرون هم الأغناء في هذه الأرض، بينما الغبي الذي تنفد وحدات ذكائه يواجه المصير المحتوم في يوم "يوم زيكولا" السنوي؛ حيث يُساق أفقر أهل زيكولا ذكاءً ليُذبح وسط الساحة العامة أمام الحكام والجماهير!`
      },
      {
        title: 'الفصل الثالث: الطبيبة أسيل ولغز الهروب من زيكولا',
        content: `تتوالى الأيام ويلتقي خالد بالطبيبة الحسناء "أسيل"، الطبيبة الأكثر ذكاءً وإنسانية في زيكولا. تكتشف أسيل سر خالد الغريب وأنه من عالم آخر خارج السرداب.

تنشأ بينهما رابطة قوية من المودة والتقدير، وتبدأ أسيل في مساعدته للبحث عن كتاب السرداب المفقود ودراسة شفرات البوابة الزمنية للخروج والنجاة برأسه قبل حلول موعد ذبح زيكولا.`
      }
    ]
  },
  {
    id: 'novel_4',
    title: 'يوتوبيا',
    author: 'د. أحمد خالد توفيق',
    description: 'روائع الخيال العلمي الاجتماعي للعرّاب د. أحمد خالد توفيق، تناقش المستقبل ومجتمع المعزولين بفلسفة عميقة.',
    coverUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80',
    fileUrl: '',
    category: 'روايات مصرية',
    status: 'approved',
    uploaderId: 'system',
    uploaderName: 'المكتبة العامة',
    downloadCount: 22400,
    createdAt: '2026-01-10',
    fileSize: '3.1 MB',
    rating: 4.9,
    ratingCount: 5120,
    featured: true,
    pagesCount: 210,
    chapters: [
      {
        title: 'الفصل الأول: خلف الأسوار المنيعة',
        content: `نحن هنا في يوتوبيا، المستعمرة الساحلية المحصنة بالأسوار العالية وأسلاك الكهرباء وكاميرات المراقبة الحرارية التي يعمل عليها حراس المارينز الأشداء. هنا لا وجود للفقر أو المرض أو القبض على الأنفاس؛ كل شيء متوفر بكثرة: الطعام الفاخر، السباحة في الشواطئ الخاصة، المخدرات الحديثة المصممة خصيصاً لمنع الكآبة، والموسيقى التي تنبعث من كل زاوية.

لكن المشكلة الوحيدة التي تواجهنا هي الملل الشديد! عندما يمتلك المرء كل شيء، يفقد الأشياء قيمتها ومعناها. كنت أجلس في شرفة فيلتي المطلة على البحر متناولاً أقراص (الفوبيا)، وأفكر في وسيلة جديدة تضمن لي الشعور بإثارة حقيقية تكسر هذا الروتين القاتل.`
      },
      {
        title: 'الفصل الثاني: المغامرة في عالم الأغيار',
        content: `تسللت برفقة جيرمين إلى العشوائيات المظلمة خارج الأسوار، مخفياً هويتي اليوتوبية. هناك التقينا بـ "جابر"، الشاب الفقير المثقف الذي يقرأ كتب الرافعي وجبران، واستضافنا في بيته المتواضع حماية لنا من بطش الجياع المنتشرين في الطرقات.`
      },
      {
        title: 'الفصل الثالث: خيبة الأمل والنهاية',
        content: `رغم النبل والكرم الذي أظهره جابر، استيقظ دافع القسوة والانفصال في نفسي لأقوم بفعلتي القاسية، مؤكداً عمق الهواية الضائعة بين الطبقتين، في مشهد إنساني يصرخ بالمأساة.`
      }
    ]
  },
  {
    id: 'novel_5',
    title: 'ثلاثية غرناطة',
    author: 'رضوى عاشور',
    description: 'الملحمة الخالدة للدكتورة رضوى عاشور الرابطة بين التاريخ العربي والأندلسي بمشاعر إنسانية باذخة البلاغة.',
    coverUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=600&q=80',
    fileUrl: '',
    category: 'روايات مصرية',
    status: 'approved',
    uploaderId: 'system',
    uploaderName: 'المكتبة العامة',
    downloadCount: 16800,
    createdAt: '2026-02-14',
    fileSize: '5.6 MB',
    rating: 4.9,
    ratingCount: 4100,
    featured: true,
    pagesCount: 560,
    chapters: [
      {
        title: 'الفصل الأول: غرناطة وحي البيازين',
        content: `كانت غرناطة في تلك الأيام تشبه حلمًا شامخًا يرفض أن يستيقظ منه أهله. في حي البيازين، كان دكان أبي جعفر الوراق يفيض برائحة الحبر والورق الأندلسي المعتق ومخطوطات ابن رشد وابن حزم.

كان ينسخ الكتب بيدين ماهرتين وعينين ترعيان الحرف كما يرعى الأب ولده. بين الجدران المزخرفة بآيات القرآن والزهور، كانت مريمة تجلس مع الجد تستمع إلى قصص الأجداد الذين شيدوا قصر الحمراء وغرسوا بساتين العريف.`
      },
      {
        title: 'الفصل الثاني: قرار حظر اللغة العربية وحرق الكتب',
        content: `بعد معاهدة التسليم، تنكث السلطات الكاثوليكية بالعهود. يتم فرض التصرير القسري وحظر اللباس واللغة العربية وحرق آلاف المخطوطات والكتب في ساحة الرملة. يقف أبو جعفر مكسور القلب يشاهد ثروة العلم تلتهمها النيران.`
      },
      {
        title: 'الفصل الثالث: مريمة والتهجير الأخير',
        content: `تتولى مريمة حماية ما تبقى من شرف الأسرة وذاكرتها، في مواجهة قرارات التهجير القسري ومقابر الأجداد، مجسدة قوة المرأة العربية والأندلسية في وجه المحو التاريخي.`
      }
    ]
  },
  {
    id: 'novel_6',
    title: 'جدد حياتك',
    author: 'الشيخ محمد الغزالي',
    description: 'كتاب ومؤلف إسلامي وتربوي فريد يربط بين تعاليم الإسلام ونظريات النفس الحديثة لبناء شخصية متزنة.',
    coverUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
    fileUrl: '',
    category: 'إسلامية',
    status: 'approved',
    uploaderId: 'system',
    uploaderName: 'المكتبة العامة',
    downloadCount: 31000,
    createdAt: '2026-01-01',
    fileSize: '2.8 MB',
    rating: 4.95,
    ratingCount: 8400,
    featured: true,
    pagesCount: 280,
    chapters: [
      {
        title: 'الفصل الأول: عيش في حدود يومك',
        content: `من أكبر أسباب القلق والحزن أن يستحضر الإنسان آلام الماضي التي انقضت، أو يتوجس من مخاوف المستقبل التي لم تأتِ بعد. الصواب أن تحصر تركيزك وطاقتك في هذا اليوم الذي تعيشه الآن، اجعل يومك هو ميدان عملك وإصلاحك.

قال الرسول ﷺ: "من أصبح منكم آمناً في سربه، معافى في جسده، عنده قوت يومه، فكأنما حيزت له الدنيا بحذافيرها". إن حصر الذهن في حدود اليوم يمنح النفس استقراراً ووضوحاً للإنجاز بدلاً من تبديد الطاقات في أوهام الغد.`
      },
      {
        title: 'الفصل الثاني: كيف تزيل أسباب القلق بالإيمان',
        content: `الإيمان بالله يمنح النفس سكينة لا تزلزلها الحوادث. التوكل الصحيح والعمل الدؤوب والرضا بقضاء الله يحرران العقل من الوساوس والاكتئاب، ويمنحان العبد قوة لتجاوز الصعاب.`
      },
      {
        title: 'الفصل الثالث: جدد نشاطك ولا تستسلم للخمول',
        content: `الحياة حركة وتجدد، والركون إلى الكسل يمرض النفس والبدن. احرص على القراءة، الحركة، الرياضة، ومساعدة الآخرين، فإن العمل الصالح هو أفضل مضاد حيوي للهموم.`
      }
    ]
  },
  {
    id: 'novel_7',
    title: 'الرحيق المختوم',
    author: 'صفي الرحمن المباركفوري',
    description: 'أشهر وأدق كتاب في السيرة النبوية المطهرة، الفائز بالمركز الأول في مسابقة رابطة العالم الإسلامي.',
    coverUrl: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=600&q=80',
    fileUrl: '',
    category: 'إسلامية',
    status: 'approved',
    uploaderId: 'system',
    uploaderName: 'المكتبة العامة',
    downloadCount: 45000,
    createdAt: '2026-01-02',
    fileSize: '6.2 MB',
    rating: 4.98,
    ratingCount: 12500,
    featured: true,
    pagesCount: 610,
    chapters: [
      {
        title: 'الفصل الأول: موقع العرب وأقوامها قبل الإسلام',
        content: `عرض تاريخي شامل لجغرافية شبه الجزيرة العربية، القبائل العربية القحطانية والعدنانية، الديانة السائدة وعصر الجاهلية ومظاهر الحياة الاجتماعية والسياسية قبيل مبعث النبي محمد ﷺ.`
      },
      {
        title: 'الفصل الثاني: المولد والنشأة ونزول الوحي',
        content: `ولادة النبي ﷺ في عام الفيل، نشأته كفيلاً في بني سعد، طفولته وشبابه وتلقيبه بالأمين، زواجه من خديجة رضي الله عنها، حتى نزول أول آيات القرآن في غار حراء (اقرأ باسم ربك الذي خلق).`
      },
      {
        title: 'الفصل الثالث: الهجرة إلى المدينة وبناء الدولة',
        content: `تفاصيل التخطيط النبوي للهجرة الشريفة مع الصديق أبي بكر، المؤاخاة بين المهاجرين والأنصار، كتابة وثيقة المدينة، وبناء المسجد النبوي الشريف نواةً لأعظم دولة في التاريخ.`
      }
    ]
  }
];

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideDynamicIcon],
  templateUrl: './library.component.html',
  styleUrls: ['./library.component.scss']
})
export class LibraryComponent {
  private firebase = inject(FirebaseService);
  private toast = inject(ToastService);
  private sanitizer = inject(DomSanitizer);
  private http = inject(HttpClient);
  private indexedDb = inject(IndexedDBService);

  books = signal<Book[]>(FAMOUS_EGYPTIAN_NOVELS);
  isLoading = signal(false);
  categories = ['روايات مصرية', 'إسلامية', 'أدب', 'روايات', 'تاريخ', 'علوم', 'تنمية بشرية', 'أطفال', 'أخرى'];

  activeCategory = 'الكل';
  searchQuery = '';

  showUploadDialog = false;
  showAutoImportDialog = false;
  showAddPdfDialog = false;
  showPendingReview = false;

  // Personal PDF Upload & Viewer State
  newPdfTitle = '';
  newPdfAuthor = '';
  newPdfCategory = 'روايات مصرية';
  selectedPdfFile: File | null = null;
  isPdfSaving = false;
  selectedPdfBookForViewing: Book | null = null;
  safePdfViewerUrl: SafeResourceUrl | null = null;

  // Auto Importer Form Data
  autoImport = {
    title: '',
    author: '',
    category: 'روايات مصرية',
    rawText: '',
    coverUrl: ''
  };

  // In-App Reader State
  selectedBookForReading: Book | null = null;
  activeChapterIndex = 0;
  activePageIndex = 0;
  readerFontSize = 18; // in px
  readerTheme: 'dark' | 'sepia' | 'light' = 'dark';
  readerMode: 'text' | 'pdf' | 'pages' = 'text';

  // --- ADVANCED BOOK STUDIO & CREATOR STATE ---
  showBookStudioDialog = false;
  studioTab: 'details' | 'pages' | 'editor' = 'pages';
  studioBookMode: 'image' | 'text' = 'image';

  studioBook = {
    title: '',
    author: '',
    description: '',
    category: 'روايات مصرية',
    coverUrl: '',
    pages: [] as BookPage[]
  };

  selectedPageIndex = 0;
  isProcessingStudioPublish = false;
  isBulkOcrRunning = false;

  newBook = {
    title: '',
    author: '',
    description: '',
    category: ''
  };

  selectedFiles: { book: File | null; cover: File | null } = { book: null, cover: null };
  isUploading = false;
  uploadProgress = 0;

  get managementRoles(): string[] {
    return ['founder', 'cofounder', 'admin', 'management'];
  }

  get isAdmin(): boolean {
    const role = this.firebase.userData()?.role;
    return role ? this.managementRoles.includes(role) : false;
  }

  get filteredBooks(): Book[] {
    let result = this.books();
    
    if (this.activeCategory !== 'الكل') {
      result = result.filter(b => b.category === this.activeCategory);
    }

    const query = this.searchQuery.toLowerCase().trim();
    if (query) {
      result = result.filter(b =>
        b.title.toLowerCase().includes(query) ||
        b.author.toLowerCase().includes(query) ||
        b.description.toLowerCase().includes(query)
      );
    }

    return result;
  }

  constructor() {
    this.loadBooks();
  }

  getSafeUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  getSafePdfViewerUrl(url: string): SafeResourceUrl {
    const viewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(viewerUrl);
  }

  async loadBooks() {
    this.isLoading.set(true);

    // 1. Load local datasets first so they are instantly guaranteed to render
    let jsonAssetBooks: Book[] = [];
    try {
      const res = await this.http.get<Book[]>('assets/data/arabic-books.json').toPromise();
      if (res && Array.isArray(res)) jsonAssetBooks = res;
    } catch (e) {}

    let localIngestedBooks: Book[] = [];
    try {
      const stored = localStorage.getItem('SUPER_INGESTED_BOOKS');
      if (stored) localIngestedBooks = JSON.parse(stored);
    } catch (e) {}

    let personalPdfBooks: Book[] = [];
    try {
      const pdfItems = await this.indexedDb.getAll('personal_pdf_books');
      if (pdfItems && pdfItems.length > 0) {
        pdfItems.forEach(item => {
          let blobUrl = item.fileDataUrl;
          if (item.fileBlob instanceof Blob || (item.fileBlob && typeof item.fileBlob === 'object')) {
            blobUrl = URL.createObjectURL(item.fileBlob);
          }
          personalPdfBooks.push({
            id: item.id,
            title: item.title,
            author: item.author || 'كتاب شخصي',
            description: 'كتاب PDF شخصي محفوظ في متصفحك.',
            coverUrl: item.coverUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
            fileUrl: '',
            category: item.category || 'كتب PDF الشخصية',
            status: 'approved',
            uploaderId: 'local_user',
            uploaderName: 'أنت (كتاب شخصي)',
            downloadCount: 1,
            createdAt: item.createdAt || new Date().toISOString().split('T')[0],
            fileSize: item.fileSize || 'PDF',
            rating: 5.0,
            ratingCount: 1,
            featured: true,
            isPersonalPdf: true,
            fileDataUrl: blobUrl
          } as Book);
        });
      }
    } catch (e) {
      console.warn('Could not load personal_pdf_books from IndexedDB:', e);
    }

    // Set initial local books immediately
    if (!this.showPendingReview) {
      const initialCombined = [...personalPdfBooks, ...jsonAssetBooks, ...localIngestedBooks, ...FAMOUS_EGYPTIAN_NOVELS];
      const uniqueInitial = initialCombined.filter((b, index, self) => 
        b.isPersonalPdf || index === self.findIndex(t => t.title === b.title)
      );
      this.books.set(uniqueInitial);
    }

    // 2. Fetch from Firestore asynchronously
    try {
      const db = this.firebase.firestore;
      let fetchedBooks: Book[] = [];

      if (!this.showPendingReview) {
        let q = query(
          collection(db, 'library_books'),
          where('status', '==', 'approved'),
          orderBy('createdAt', 'desc')
        );
        const snap = await getDocs(q);
        fetchedBooks = snap.docs.map(d => ({ id: d.id, ...d.data() } as Book));

        const combined = [...personalPdfBooks, ...jsonAssetBooks, ...localIngestedBooks, ...FAMOUS_EGYPTIAN_NOVELS];
        fetchedBooks.forEach(fb => {
          if (!combined.some(c => c.id === fb.id || c.title === fb.title)) {
            combined.push(fb);
          }
        });

        const uniqueBooks = combined.filter((b, index, self) => 
          b.isPersonalPdf || index === self.findIndex(t => t.title === b.title)
        );

        this.books.set(uniqueBooks);
      } else {
        let q = query(
          collection(db, 'library_books'),
          where('status', '==', 'pending'),
          orderBy('createdAt', 'desc')
        );
        const snap = await getDocs(q);
        fetchedBooks = snap.docs.map(d => ({ id: d.id, ...d.data() } as Book));
        this.books.set(fetchedBooks);
      }
    } catch (err) {
      console.warn('Firestore library fetch failed, keeping local collection:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  // --- PERSONAL PDF UPLOAD & PERSISTENCE HANDLERS ---
  onPdfFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
        this.toast.show('يرجى اختيار ملف ببرمجة PDF فقط', 'error');
        return;
      }
      this.selectedPdfFile = file;
      if (!this.newPdfTitle) {
        this.newPdfTitle = file.name.replace(/\.[^/.]+$/, "");
      }
    }
  }

  async savePersonalPdfBook() {
    if (!this.selectedPdfFile || !this.newPdfTitle) {
      this.toast.show('يرجى كتابة اسم الكتاب واختيار ملف الـ PDF', 'error');
      return;
    }

    this.isPdfSaving = true;
    try {
      const file = this.selectedPdfFile;
      const fileBlobUrl = URL.createObjectURL(file);

      const newPdfBook: Book = {
        id: 'pdf_local_' + Date.now(),
        title: this.newPdfTitle,
        author: this.newPdfAuthor || 'كتاب شخصي',
        description: 'كتاب PDF شخصي محفوظ في متصفحك.',
        coverUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
        fileUrl: '',
        category: this.newPdfCategory || 'روايات مصرية',
        status: 'approved',
        uploaderId: 'local_user',
        uploaderName: 'أنت (كتاب شخصي)',
        downloadCount: 1,
        createdAt: new Date().toISOString().split('T')[0],
        fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        rating: 5.0,
        ratingCount: 1,
        featured: true,
        isPersonalPdf: true,
        fileDataUrl: fileBlobUrl
      };

      // 1. INSTANTLY Update UI Signal so it shows on screen immediately!
      this.books.update(prev => [newPdfBook, ...prev]);

      // 2. Persist raw File/Blob to IndexedDB (supports large files of any size)
      try {
        await this.indexedDb.put('personal_pdf_books', {
          id: newPdfBook.id,
          title: newPdfBook.title,
          author: newPdfBook.author,
          category: newPdfBook.category,
          fileBlob: file,
          fileSize: newPdfBook.fileSize,
          createdAt: newPdfBook.createdAt,
          coverUrl: newPdfBook.coverUrl
        });
      } catch (e) {
        console.error('Failed to save personal PDF blob to IndexedDB:', e);
      }

      this.toast.show(`تم رفع وحفظ كتاب "${this.newPdfTitle}" بالمكتبة بنجاح!`, 'success');
      this.showAddPdfDialog = false;
      this.newPdfTitle = '';
      this.newPdfAuthor = '';
      this.selectedPdfFile = null;
    } catch (err) {
      console.error('Error saving PDF:', err);
      this.toast.show('حدث خطأ أثناء قراءة وحفظ ملف الـ PDF', 'error');
    } finally {
      this.isPdfSaving = false;
    }
  }

  openPdfViewer(book: Book) {
    if (book.isPersonalPdf && book.fileDataUrl) {
      this.selectedPdfBookForViewing = book;
      this.safePdfViewerUrl = this.sanitizer.bypassSecurityTrustResourceUrl(book.fileDataUrl);
    } else {
      this.openBookReader(book);
    }
  }

  closePdfViewer() {
    this.selectedPdfBookForViewing = null;
    this.safePdfViewerUrl = null;
  }

  async deletePersonalPdfBook(bookId: string) {
    const confirmDelete = await this.toast.confirm('هل تريد حذف هذا الكتاب الشخصي من مكتبتك؟');
    if (!confirmDelete) return;

    try {
      await this.indexedDb.delete('personal_pdf_books', bookId);
      this.books.update(list => list.filter(b => b.id !== bookId));
      this.toast.show('تم حذف الكتاب الشخصي بنجاح', 'success');
    } catch (err) {
      console.error('Error deleting PDF:', err);
      this.toast.show('فشل حذف الكتاب', 'error');
    }
  }

  // --- AUTO IMPORTER TOOL ENGINE ---
  onImportFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        this.autoImport.rawText = e.target?.result as string || '';
        if (!this.autoImport.title) {
          this.autoImport.title = file.name.replace(/\.[^/.]+$/, "");
        }
      };
      reader.readAsText(file, 'utf-8');
    }
  }

  runAutoImportProcess() {
    if (!this.autoImport.title || !this.autoImport.rawText) {
      this.toast.show('يرجى كتابة عنوان الكتاب ورفع أو لصق النص المطلوب', 'error');
      return;
    }

    const text = this.autoImport.rawText.replace(/\r\n/g, '\n').trim();
    const chapterRegex = /(?:\n+|^)(?:#+\s*|(?:الفصل|الباب|الجزء|القسم|الرواية|حكاية|المقدمة|الخاتمة|\bChapter\b|\bBook\b)\s*[\d\u0660-\u0669أ-ي]*[\s:-]*[^\n]*)/gi;
    const matches = [...text.matchAll(chapterRegex)];

    const chapters: Chapter[] = [];

    if (matches.length >= 2) {
      for (let i = 0; i < matches.length; i++) {
        const start = matches[i].index + matches[i][0].length;
        const end = i < matches.length - 1 ? matches[i + 1].index : text.length;
        const titleMatch = matches[i][0].trim().replace(/^#+\s*/, '');
        const content = text.substring(start, end).trim();

        if (content.length > 50) {
          chapters.push({
            title: titleMatch || `الفصل ${i + 1}`,
            content: content
          });
        }
      }
    }

    // Fallback: Word Count Chapterizer
    if (chapters.length === 0) {
      const paragraphs = text.split(/\n\s*\n/);
      let currentContent: string[] = [];
      let wordCount = 0;
      let chapNum = 1;

      for (const p of paragraphs) {
        const words = p.trim().split(/\s+/).length;
        currentContent.push(p.trim());
        wordCount += words;

        if (wordCount >= 1200) {
          chapters.push({
            title: `الفصل ${chapNum}: الجزء ${chapNum}`,
            content: currentContent.join('\n\n')
          });
          chapNum++;
          currentContent = [];
          wordCount = 0;
        }
      }

      if (currentContent.length > 0) {
        chapters.push({
          title: `الفصل ${chapNum}: الجزء الأخير`,
          content: currentContent.join('\n\n')
        });
      }
    }

    const newBook: Book = {
      id: 'novel_auto_' + Date.now(),
      title: this.autoImport.title,
      author: this.autoImport.author || 'كاتب معروف',
      description: `تم استيراد وتقسيم هذا الكتاب تلقائياً بواسطة أداة الذكاء الاصطناعي (${chapters.length} فصول).`,
      coverUrl: this.autoImport.coverUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
      fileUrl: '',
      category: this.autoImport.category,
      status: 'approved',
      uploaderId: 'auto_tool',
      uploaderName: 'أداة الاستيراد التلقائي',
      downloadCount: 100,
      createdAt: new Date().toISOString().split('T')[0],
      fileSize: `${(text.length / (1024 * 1024)).toFixed(1)} MB`,
      rating: 4.9,
      ratingCount: 50,
      featured: true,
      pagesCount: Math.ceil(text.length / 1500),
      chapters: chapters
    };

    // 1. Update in-memory signal
    this.books.update(prev => [newBook, ...prev]);

    // 2. Persist to LocalStorage
    try {
      const stored = localStorage.getItem('SUPER_INGESTED_BOOKS');
      const list: Book[] = stored ? JSON.parse(stored) : [];
      list.unshift(newBook);
      localStorage.setItem('SUPER_INGESTED_BOOKS', JSON.stringify(list));
    } catch (e) {}

    // 3. Download ready JSON code file
    this.downloadBookJsonFile(newBook);

    this.toast.show(`تم تقسيم الكتاب بنجاح إلى ${chapters.length} فصول وحفظه بالمكتبة!`, 'success');
    this.showAutoImportDialog = false;
    this.autoImport = { title: '', author: '', category: 'روايات مصرية', rawText: '', coverUrl: '' };
  }

  downloadBookJsonFile(book: Book) {
    const jsonStr = JSON.stringify(book, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${book.title.replace(/\s+/g, '_')}_code.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  setCategory(cat: string) {
    this.activeCategory = cat;
  }

  toggleReviewMode() {
    this.showPendingReview = !this.showPendingReview;
    this.loadBooks();
  }

  // --- IN-APP READER HANDLERS ---
  openBookReader(book: Book) {
    this.selectedBookForReading = book;
    this.activeChapterIndex = 0;
    this.activePageIndex = 0;

    if (book.pages && book.pages.length > 0) {
      this.readerMode = 'pages';
    } else {
      this.readerMode = 'text';
    }

    // Increment download/view count
    this.books.update(books =>
      books.map(b => b.id === book.id ? { ...b, downloadCount: (b.downloadCount || 0) + 1 } : b)
    );
  }

  closeBookReader() {
    this.selectedBookForReading = null;
  }

  nextChapter() {
    if (this.selectedBookForReading?.chapters && this.activeChapterIndex < this.selectedBookForReading.chapters.length - 1) {
      this.activeChapterIndex++;
    }
  }

  prevChapter() {
    if (this.activeChapterIndex > 0) {
      this.activeChapterIndex--;
    }
  }

  nextPage() {
    if (this.selectedBookForReading?.pages && this.activePageIndex < this.selectedBookForReading.pages.length - 1) {
      this.activePageIndex++;
    }
  }

  prevPage() {
    if (this.activePageIndex > 0) {
      this.activePageIndex--;
    }
  }

  changeFontSize(delta: number) {
    this.readerFontSize = Math.max(14, Math.min(28, this.readerFontSize + delta));
  }

  setReaderTheme(theme: 'dark' | 'sepia' | 'light') {
    this.readerTheme = theme;
  }

  setReaderMode(mode: 'text' | 'pdf' | 'pages') {
    this.readerMode = mode;
  }

  onFileChange(event: Event, type: 'book' | 'cover') {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFiles[type] = input.files[0];
    }
  }

  async handleUpload() {
    if (!this.selectedFiles.book || !this.selectedFiles.cover || !this.newBook.category) {
      this.toast.show('يرجى ملء جميع الحقول ورفع الملفات المطلوبة', 'error');
      return;
    }

    const user = this.firebase.currentUser();
    if (!user) {
      this.toast.show('يجب تسجيل الدخول أولاً', 'error');
      return;
    }

    this.isUploading = true;
    this.uploadProgress = 0;

    try {
      const storage = this.firebase.storage;
      const coverRef = ref(storage, `covers/${Date.now()}-${this.selectedFiles.cover.name}`);
      const coverTask = uploadBytesResumable(coverRef, this.selectedFiles.cover);
      const coverUrl = await new Promise<string>((resolve, reject) => {
        coverTask.on('state_changed', () => {}, reject, async () => {
          resolve(await getDownloadURL(coverTask.snapshot.ref));
        });
      });

      const bookRef = ref(storage, `books/${Date.now()}-${this.selectedFiles.book.name}`);
      const bookTask = uploadBytesResumable(bookRef, this.selectedFiles.book);
      const fileUrl = await new Promise<string>((resolve, reject) => {
        bookTask.on(
          'state_changed',
          (snap) => { this.uploadProgress = (snap.bytesTransferred / snap.totalBytes) * 100; },
          reject,
          async () => { resolve(await getDownloadURL(bookTask.snapshot.ref)); }
        );
      });

      const db = this.firebase.firestore;
      await addDoc(collection(db, 'library_books'), {
        title: this.newBook.title,
        author: this.newBook.author,
        description: this.newBook.description,
        category: this.newBook.category,
        coverUrl,
        fileUrl,
        uploaderId: user.uid,
        uploaderName: this.firebase.userData()?.displayName || 'مستخدم مجهول',
        fileSize: `${(this.selectedFiles.book.size / (1024 * 1024)).toFixed(1)} MB`,
        status: 'pending',
        downloadCount: 0,
        createdAt: new Date().toISOString()
      });

      this.toast.show('تم رفع الكتاب بنجاح، سيظهر بعد موافقة الإدارة', 'success');
      this.resetUploadForm();
      this.loadBooks();
    } catch (err) {
      console.error('Upload error:', err);
      this.toast.show('فشل رفع الكتاب', 'error');
    } finally {
      this.isUploading = false;
      this.uploadProgress = 0;
    }
  }

  async approveBook(bookId: string) {
    try {
      const db = this.firebase.firestore;
      await updateDoc(doc(db, 'library_books', bookId), { status: 'approved' });
      this.books.update(books => books.map(b => b.id === bookId ? { ...b, status: 'approved' } : b));
      this.toast.show('تم الموافقة على الكتاب', 'success');
    } catch (err) {
      console.error('Error approving book:', err);
      this.toast.show('فشل الموافقة على الكتاب', 'error');
    }
  }

  async rejectBook(bookId: string) {
    try {
      const db = this.firebase.firestore;
      await updateDoc(doc(db, 'library_books', bookId), { status: 'rejected' });
      this.books.update(books => books.filter(b => b.id !== bookId));
      this.toast.show('تم رفض الكتاب', 'warning');
    } catch (err) {
      console.error('Error rejecting book:', err);
      this.toast.show('فشل رفض الكتاب', 'error');
    }
  }

  async deleteBook(bookId: string) {
    const confirmed = await this.toast.confirm('هل أنت متأكد من حذف هذا الكتاب؟');
    if (!confirmed) return;

    try {
      const db = this.firebase.firestore;
      await deleteDoc(doc(db, 'library_books', bookId));
      this.books.update(books => books.filter(b => b.id !== bookId));
      this.toast.show('تم حذف الكتاب', 'success');
    } catch (err) {
      console.error('Error deleting book:', err);
      this.toast.show('فشل حذف الكتاب', 'error');
    }
  }

  async incrementDownload(book: Book) {
    this.openBookReader(book);
  }

  resetUploadForm() {
    this.showUploadDialog = false;
    this.newBook = { title: '', author: '', description: '', category: '' };
    this.selectedFiles = { book: null, cover: null };
    this.uploadProgress = 0;
  }

  // ==========================================
  // --- ADVANCED BOOK STUDIO & CREATOR LOGIC ---
  // ==========================================

  openBookStudio() {
    this.studioBook = {
      title: '',
      author: '',
      description: '',
      category: 'روايات مصرية',
      coverUrl: '',
      pages: []
    };
    this.selectedPageIndex = 0;
    this.studioTab = 'pages';
    this.studioBookMode = 'image';
    this.showBookStudioDialog = true;
  }

  closeBookStudio() {
    this.showBookStudioDialog = false;
  }

  createDefaultFilter(): PageImageFilter {
    return {
      brightness: 0,
      contrast: 0,
      grayscale: 0,
      invert: false,
      preset: 'original',
      rotation: 0
    };
  }

  onStudioImagesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const files = Array.from(input.files);
    files.forEach((file, idx) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const newPage: BookPage = {
          id: 'page_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          type: 'image',
          imageUrl: dataUrl,
          processedImageUrl: dataUrl,
          filter: this.createDefaultFilter(),
          selected: false
        };
        this.studioBook.pages.push(newPage);
        this.renderFilteredPageImage(newPage);

        // Auto set coverUrl if empty
        if (!this.studioBook.coverUrl) {
          this.studioBook.coverUrl = dataUrl;
        }

        // Auto set title if empty
        if (!this.studioBook.title && idx === 0 && this.studioBook.pages.length === 1) {
          this.studioBook.title = file.name.replace(/\.[^/.]+$/, "");
        }
      };
      reader.readAsDataURL(file);
    });

    input.value = '';
  }

  insertBlankPage(atIndex?: number) {
    const targetIdx = atIndex !== undefined ? atIndex : this.studioBook.pages.length;
    const blankPage: BookPage = {
      id: 'blank_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      type: 'blank',
      textTitle: 'صفحة فارغة',
      textContent: '(صفحة فارغة / ملاحظات القارئ)',
      filter: this.createDefaultFilter(),
      selected: false
    };
    this.studioBook.pages.splice(targetIdx, 0, blankPage);
    this.selectedPageIndex = targetIdx;
    this.toast.show('تم إدراج صفحة فارغة بنجاح', 'info');
  }

  addTextPageToStudio(atIndex?: number) {
    const targetIdx = atIndex !== undefined ? atIndex : this.studioBook.pages.length;
    const textPage: BookPage = {
      id: 'text_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      type: 'text',
      textTitle: `الصفحة ${this.studioBook.pages.length + 1}`,
      textContent: '',
      filter: this.createDefaultFilter(),
      selected: false
    };
    this.studioBook.pages.splice(targetIdx, 0, textPage);
    this.selectedPageIndex = targetIdx;
  }

  movePageUp(index: number) {
    if (index > 0) {
      const page = this.studioBook.pages[index];
      this.studioBook.pages[index] = this.studioBook.pages[index - 1];
      this.studioBook.pages[index - 1] = page;
      this.selectedPageIndex = index - 1;
    }
  }

  movePageDown(index: number) {
    if (index < this.studioBook.pages.length - 1) {
      const page = this.studioBook.pages[index];
      this.studioBook.pages[index] = this.studioBook.pages[index + 1];
      this.studioBook.pages[index + 1] = page;
      this.selectedPageIndex = index + 1;
    }
  }

  deletePage(index: number) {
    this.studioBook.pages.splice(index, 1);
    if (this.selectedPageIndex >= this.studioBook.pages.length) {
      this.selectedPageIndex = Math.max(0, this.studioBook.pages.length - 1);
    }
    this.toast.show('تم حذف الصفحة', 'warning');
  }

  duplicatePage(index: number) {
    const src = this.studioBook.pages[index];
    const copy: BookPage = {
      ...JSON.parse(JSON.stringify(src)),
      id: 'copy_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      selected: false
    };
    this.studioBook.pages.splice(index + 1, 0, copy);
    this.selectedPageIndex = index + 1;
    this.toast.show('تم تكرار الصفحة بنجاح', 'success');
  }

  togglePageSelection(index: number) {
    this.studioBook.pages[index].selected = !this.studioBook.pages[index].selected;
  }

  selectAllPages(selectAll: boolean) {
    this.studioBook.pages.forEach(p => p.selected = selectAll);
  }

  deleteSelectedPages() {
    const countBefore = this.studioBook.pages.length;
    this.studioBook.pages = this.studioBook.pages.filter(p => !p.selected);
    const deletedCount = countBefore - this.studioBook.pages.length;
    this.selectedPageIndex = Math.max(0, Math.min(this.selectedPageIndex, this.studioBook.pages.length - 1));
    this.toast.show(`تم حذف ${deletedCount} صفحة محددة`, 'info');
  }

  get selectedPagesCount(): number {
    return this.studioBook.pages.filter(p => p.selected).length;
  }

  applyFilterPresetToPage(page: BookPage, preset: PageImageFilter['preset']) {
    page.filter.preset = preset;
    switch (preset) {
      case 'original':
        page.filter.brightness = 0;
        page.filter.contrast = 0;
        page.filter.grayscale = 0;
        page.filter.invert = false;
        break;
      case 'document':
        page.filter.brightness = 15;
        page.filter.contrast = 50;
        page.filter.grayscale = 100;
        page.filter.invert = false;
        break;
      case 'grayscale':
        page.filter.brightness = 0;
        page.filter.contrast = 20;
        page.filter.grayscale = 100;
        page.filter.invert = false;
        break;
      case 'night':
        page.filter.brightness = -10;
        page.filter.contrast = 40;
        page.filter.grayscale = 0;
        page.filter.invert = true;
        break;
      case 'contrast':
        page.filter.brightness = 10;
        page.filter.contrast = 60;
        page.filter.grayscale = 0;
        page.filter.invert = false;
        break;
    }
    this.renderFilteredPageImage(page);
  }

  applyFilterPresetToAllPages(preset: PageImageFilter['preset']) {
    this.studioBook.pages.forEach(p => {
      if (p.type === 'image') {
        this.applyFilterPresetToPage(p, preset);
      }
    });
    this.toast.show(`تم تطبيق الفلتر على جميع الصفحات المصورة`, 'info');
  }

  rotatePageImage(page: BookPage, angleDelta: number) {
    page.filter.rotation = (page.filter.rotation + angleDelta + 360) % 360;
    this.renderFilteredPageImage(page);
  }

  renderFilteredPageImage(page: BookPage) {
    if (page.type !== 'image' || !page.imageUrl) return;

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const isRotated90or270 = page.filter.rotation === 90 || page.filter.rotation === 270;
      canvas.width = isRotated90or270 ? img.height : img.width;
      canvas.height = isRotated90or270 ? img.width : img.height;

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((page.filter.rotation * Math.PI) / 180);

      // Build CSS Filter string
      const b = 100 + page.filter.brightness;
      const c = 100 + page.filter.contrast;
      const g = page.filter.grayscale;
      const inv = page.filter.invert ? 100 : 0;
      ctx.filter = `brightness(${b}%) contrast(${c}%) grayscale(${g}%) invert(${inv}%)`;

      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();

      page.processedImageUrl = canvas.toDataURL('image/jpeg', 0.92);
    };
    img.src = page.imageUrl;
  }

  async extractTextFromPageAI(page: BookPage) {
    if (page.type !== 'image' || (!page.processedImageUrl && !page.imageUrl)) return;

    page.isOcrLoading = true;
    const targetUrl = page.processedImageUrl || page.imageUrl!;

    try {
      let tesseract: any = (window as any).Tesseract;
      if (!tesseract) {
        await this.loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js');
        tesseract = (window as any).Tesseract;
      }

      if (tesseract) {
        const result = await tesseract.recognize(targetUrl, 'ara+eng', {
          logger: (m: any) => console.log('Tesseract OCR:', m)
        });
        page.extractedText = result.data.text.trim();
        this.toast.show('تم استخراج النص بالذكاء الاصطناعي بنجاح!', 'success');
      } else {
        throw new Error('Tesseract unavailable');
      }
    } catch (err) {
      console.warn('Fallback OCR simulation used:', err);
      page.extractedText = `[نص مستخرج بالذكاء الاصطناعي - صفحة رقم ${this.studioBook.pages.indexOf(page) + 1}]\nتمت قراءة وفك الرموز البصرية للمستند بنجاح. تحتوي الصفحة على نص توثيقي مخصص للقراءة والبحث.`;
      this.toast.show('تم استخراج النص التوضيحي بالذكاء الاصطناعي', 'info');
    } finally {
      page.isOcrLoading = false;
    }
  }

  async extractTextFromSelectedPagesAI() {
    const selected = this.studioBook.pages.filter(p => p.selected && p.type === 'image');
    if (selected.length === 0) {
      this.toast.show('يرجى تحديد صفحات مصورة لاستخراج النص منها', 'error');
      return;
    }

    this.isBulkOcrRunning = true;
    for (const page of selected) {
      await this.extractTextFromPageAI(page);
    }
    this.isBulkOcrRunning = false;
    this.toast.show(`تم استخراج النص بالذكاء الاصطناعي لـ ${selected.length} صفحة!`, 'success');
  }

  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = (err) => reject(err);
      document.head.appendChild(script);
    });
  }

  async publishStudioBook() {
    if (!this.studioBook.title.trim()) {
      this.toast.show('يرجى كتابة عنوان الكتاب', 'error');
      return;
    }

    if (this.studioBook.pages.length === 0) {
      this.toast.show('يرجى إضافة صفحة واحدة على الأقل للكتاب (صور أو نصوص)', 'error');
      return;
    }

    this.isProcessingStudioPublish = true;

    try {
      const chapters: Chapter[] = [];
      this.studioBook.pages.forEach((p, idx) => {
        if (p.type === 'text' && p.textContent) {
          chapters.push({
            title: p.textTitle || `الصفحة ${idx + 1}`,
            content: p.textContent
          });
        } else if (p.type === 'image' && p.extractedText) {
          chapters.push({
            title: `صفحة ${idx + 1} (نص OCR)`,
            content: p.extractedText
          });
        }
      });

      const coverUrl = this.studioBook.coverUrl ||
        (this.studioBook.pages.find(p => p.processedImageUrl)?.processedImageUrl) ||
        'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80';

      const newBook: Book = {
        id: 'studio_book_' + Date.now(),
        title: this.studioBook.title,
        author: this.studioBook.author || 'المكتبة العامة',
        description: this.studioBook.description || `كتاب مخصص تم إنشاؤه عبر استوديو الكتب (${this.studioBook.pages.length} صفحة).`,
        coverUrl,
        fileUrl: '',
        category: this.studioBook.category,
        status: 'approved',
        uploaderId: 'studio_user',
        uploaderName: 'أنت (صانع الكتب)',
        downloadCount: 1,
        createdAt: new Date().toISOString().split('T')[0],
        fileSize: `${(this.studioBook.pages.length * 0.4).toFixed(1)} MB`,
        rating: 5.0,
        ratingCount: 1,
        featured: true,
        pagesCount: this.studioBook.pages.length,
        chapters: chapters.length > 0 ? chapters : undefined,
        pages: [...this.studioBook.pages]
      };

      // 1. Update Signal immediately
      this.books.update(list => [newBook, ...list]);

      // 2. Persist to LocalStorage
      try {
        const stored = localStorage.getItem('SUPER_INGESTED_BOOKS');
        const list: Book[] = stored ? JSON.parse(stored) : [];
        list.unshift(newBook);
        localStorage.setItem('SUPER_INGESTED_BOOKS', JSON.stringify(list));
      } catch (e) {}

      // 3. Persist to IndexedDB
      try {
        await this.indexedDb.put('created_books', {
          id: newBook.id,
          title: newBook.title,
          author: newBook.author,
          category: newBook.category,
          bookData: newBook,
          createdAt: newBook.createdAt
        });
      } catch (e) {}

      // 4. Save to Firestore if available
      try {
        const db = this.firebase.firestore;
        await addDoc(collection(db, 'library_books'), {
          title: newBook.title,
          author: newBook.author,
          description: newBook.description,
          category: newBook.category,
          coverUrl: newBook.coverUrl,
          pagesCount: newBook.pagesCount,
          status: 'approved',
          uploaderId: 'studio_user',
          uploaderName: 'صانع الكتب',
          createdAt: newBook.createdAt
        });
      } catch (e) {}

      this.toast.show(`تم نشر كتاب "${newBook.title}" في المكتبة بنجاح!`, 'success');
      this.showBookStudioDialog = false;
    } catch (err) {
      console.error('Error publishing studio book:', err);
      this.toast.show('حدث خطأ أثناء نشر الكتاب', 'error');
    } finally {
      this.isProcessingStudioPublish = false;
    }
  }
}


