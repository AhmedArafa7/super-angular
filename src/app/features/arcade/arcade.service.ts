import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface ArcadeGame {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  genre: string;
  platforms: ('browser' | 'android' | 'pc')[];
  localUrl?: string; // Path in assets
  status: 'available' | 'coming_soon' | 'beta';
  localModeType?: 'standard' | 'ai' | 'pass_and_play'; // Determines the first button behavior/UI
  hasCustomMenu?: boolean; // If true, game handles its own initial menu before mode selection
}

@Injectable({
  providedIn: 'root'
})
export class ArcadeService {
  
  // Local Mock Data representing games until Firebase is integrated
    private games: ArcadeGame[] = [
    {
      id: 'echoes-of-time',
      title: 'أصداء الزمن ⏳',
      description: 'لعبة ألغاز تعاونية لـ 3 لاعبين (الماضي، الحاضر، المستقبل). تواصلوا لتفعيل بوابة الزمن وحل الألغاز المترابطة للنجاة!',
      thumbnail: 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22%230f172a%22%2F%3E%3Ccircle%20cx%3D%22400%22%20cy%3D%22300%22%20r%3D%22150%22%20fill%3D%22none%22%20stroke%3D%22%2338bdf8%22%20stroke-width%3D%2210%22%20stroke-dasharray%3D%2220%2010%22%2F%3E%3Ctext%20x%3D%22400%22%20y%3D%22300%22%20font-size%3D%2280%22%20text-anchor%3D%22middle%22%3E%E2%8F%B3%3C%2Ftext%3E%3Ctext%20x%3D%22400%22%20y%3D%22420%22%20font-family%3D%22system-ui%2C%20sans-serif%22%20font-size%3D%2240%22%20font-weight%3D%22900%22%20fill%3D%22%2338bdf8%22%20text-anchor%3D%22middle%22%3EECHOES%20OF%20TIME%3C%2Ftext%3E%3C%2Fsvg%3E',
      genre: 'Puzzle',
      platforms: ['browser', 'pc'],
      localUrl: '/games/echoes-of-time/index.html',
      status: 'available',
      hasCustomMenu: true
    },
    {
      id: 'three-monkeys',
      title: 'القردة الثلاثة 🙈🙉🙊',
      description: 'لعبة تفكيك قنابل تعاونية لـ 3 لاعبين. يتواصل الأعمى والأصم والأبكم لتفكيك القنبلة قبل انتهاء الوقت المتبقي! تتطلب استخدام الميكروفون.',
      thumbnail: 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22%23111827%22%2F%3E%3Ctext%20x%3D%22400%22%20y%3D%22300%22%20font-size%3D%22120%22%20text-anchor%3D%22middle%22%3E%F0%9F%99%88%F0%9F%99%89%F0%9F%99%8A%3C%2Ftext%3E%3Ctext%20x%3D%22400%22%20y%3D%22400%22%20font-family%3D%22system-ui%2C%20sans-serif%22%20font-size%3D%2260%22%20font-weight%3D%22900%22%20fill%3D%22%23fbbf24%22%20text-anchor%3D%22middle%22%3ETHE%20THREE%20MONKEYS%3C%2Ftext%3E%3C%2Fsvg%3E',
      genre: 'Co-op',
      platforms: ['browser', 'pc'],
      localUrl: '/games/three-monkeys/index.html',
      status: 'available',
      hasCustomMenu: true
    },
    {
      id: 'tank-battle',
      title: 'Tank Battle Classic',
      description: 'لعبة حرب الدبابات الشهيرة. يمكنك اللعب مع أصدقائك في نفس الشاشة أو اللعب ضد الذكاء الاصطناعي في معارك طاحنة.',
      thumbnail: 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22bg%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%23111827%22%2F%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%23374151%22%2F%3E%3C%2FlinearGradient%3E%3Cpattern%20id%3D%22grid%22%20width%3D%2240%22%20height%3D%2240%22%20patternUnits%3D%22userSpaceOnUse%22%3E%3Cpath%20d%3D%22M%2040%200%20L%200%200%200%2040%22%20fill%3D%22none%22%20stroke%3D%22%234b5563%22%20stroke-width%3D%221%22%2F%3E%3C%2Fpattern%3E%3Cfilter%20id%3D%22glow%22%3E%3CfeGaussianBlur%20stdDeviation%3D%223%22%20result%3D%22coloredBlur%22%2F%3E%3CfeMerge%3E%3CfeMergeNode%20in%3D%22coloredBlur%22%2F%3E%3CfeMergeNode%20in%3D%22SourceGraphic%22%2F%3E%3C%2FfeMerge%3E%3C%2Ffilter%3E%3C%2Fdefs%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22url(%23bg)%22%20%2F%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22url(%23grid)%22%20%2F%3E%3Ctext%20x%3D%22400%22%20y%3D%22100%22%20font-family%3D%22system-ui%2C%20sans-serif%22%20font-size%3D%2260%22%20font-weight%3D%22900%22%20fill%3D%22%23fff%22%20text-anchor%3D%22middle%22%20filter%3D%22url(%23glow)%22%3ETANK%20BATTLE%3C%2Ftext%3E%3Cg%20transform%3D%22translate(600%2C%20300)%20rotate(-45)%22%3E%3Crect%20x%3D%22-40%22%20y%3D%22-45%22%20width%3D%2220%22%20height%3D%2290%22%20fill%3D%22%231f2937%22%20rx%3D%225%22%2F%3E%3Crect%20x%3D%2220%22%20y%3D%22-45%22%20width%3D%2220%22%20height%3D%2290%22%20fill%3D%22%231f2937%22%20rx%3D%225%22%2F%3E%3Crect%20x%3D%22-30%22%20y%3D%22-35%22%20width%3D%2260%22%20height%3D%2270%22%20fill%3D%22%23ef4444%22%20rx%3D%2210%22%2F%3E%3Crect%20x%3D%22-20%22%20y%3D%22-25%22%20width%3D%2240%22%20height%3D%2250%22%20fill%3D%22%23b91c1c%22%20rx%3D%225%22%2F%3E%3Crect%20x%3D%22-6%22%20y%3D%22-70%22%20width%3D%2212%22%20height%3D%2250%22%20fill%3D%22%234b5563%22%20rx%3D%222%22%2F%3E%3Ccircle%20cx%3D%220%22%20cy%3D%220%22%20r%3D%2220%22%20fill%3D%22%23fca5a5%22%20%2F%3E%3Ccircle%20cx%3D%220%22%20cy%3D%220%22%20r%3D%2210%22%20fill%3D%22%23ef4444%22%20%2F%3E%3C%2Fg%3E%3Cg%20transform%3D%22translate(200%2C%20400)%20rotate(135)%22%3E%3Crect%20x%3D%22-40%22%20y%3D%22-45%22%20width%3D%2220%22%20height%3D%2290%22%20fill%3D%22%231f2937%22%20rx%3D%225%22%2F%3E%3Crect%20x%3D%2220%22%20y%3D%22-45%22%20width%3D%2220%22%20height%3D%2290%22%20fill%3D%22%231f2937%22%20rx%3D%225%22%2F%3E%3Crect%20x%3D%22-30%22%20y%3D%22-35%22%20width%3D%2260%22%20height%3D%2270%22%20fill%3D%22%233b82f6%22%20rx%3D%2210%22%2F%3E%3Crect%20x%3D%22-20%22%20y%3D%22-25%22%20width%3D%2240%22%20height%3D%2250%22%20fill%3D%22%231d4ed8%22%20rx%3D%225%22%2F%3E%3Crect%20x%3D%22-6%22%20y%3D%22-70%22%20width%3D%2212%22%20height%3D%2250%22%20fill%3D%22%234b5563%22%20rx%3D%222%22%2F%3E%3Ccircle%20cx%3D%220%22%20cy%3D%220%22%20r%3D%2220%22%20fill%3D%22%2393c5fd%22%20%2F%3E%3Ccircle%20cx%3D%220%22%20cy%3D%220%22%20r%3D%2210%22%20fill%3D%22%233b82f6%22%20%2F%3E%3C%2Fg%3E%3Crect%20x%3D%22350%22%20y%3D%22350%22%20width%3D%228%22%20height%3D%2220%22%20fill%3D%22%23facc15%22%20transform%3D%22rotate(45%20354%20360)%22%20filter%3D%22url(%23glow)%22%2F%3E%3Crect%20x%3D%22450%22%20y%3D%22320%22%20width%3D%228%22%20height%3D%2220%22%20fill%3D%22%23facc15%22%20transform%3D%22rotate(-45%20454%20330)%22%20filter%3D%22url(%23glow)%22%2F%3E%3Ccircle%20cx%3D%22400%22%20cy%3D%22350%22%20r%3D%2240%22%20fill%3D%22%23f97316%22%20opacity%3D%220.8%22%20filter%3D%22url(%23glow)%22%2F%3E%3Ccircle%20cx%3D%22400%22%20cy%3D%22350%22%20r%3D%2220%22%20fill%3D%22%23facc15%22%20opacity%3D%220.9%22%2F%3E%3C%2Fsvg%3E',
      genre: 'Action',
      platforms: ['browser'],
      localUrl: '/games/tank-battle/index.html',
      status: 'available'
    },
    {
      id: 'spot-differences',
      title: 'الاختلافات الخمسة',
      description: 'درب قوة ملاحظتك وقم بإيجاد الاختلافات الخمسة في الوقت المحدد. تتغير الصور والتحديات تلقائياً في كل مرة تلعب!',
      thumbnail: 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22bg%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%231e1b4b%22%2F%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%23312e81%22%2F%3E%3C%2FlinearGradient%3E%3Cfilter%20id%3D%22glow%22%3E%3CfeGaussianBlur%20stdDeviation%3D%223%22%20result%3D%22coloredBlur%22%2F%3E%3CfeMerge%3E%3CfeMergeNode%20in%3D%22coloredBlur%22%2F%3E%3CfeMergeNode%20in%3D%22SourceGraphic%22%2F%3E%3C%2FfeMerge%3E%3C%2Ffilter%3E%3Cfilter%20id%3D%22dropShadow%22%3E%3CfeDropShadow%20dx%3D%220%22%20dy%3D%2210%22%20stdDeviation%3D%2215%22%20flood-opacity%3D%220.5%22%2F%3E%3C%2Ffilter%3E%3C%2Fdefs%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22url(%23bg)%22%20%2F%3E%3Cg%20transform%3D%22translate(150%2C%20150)%22%20filter%3D%22url(%23dropShadow)%22%3E%3Crect%20width%3D%22220%22%20height%3D%22280%22%20fill%3D%22%23f8fafc%22%20rx%3D%2220%22%20stroke%3D%22%23e2e8f0%22%20stroke-width%3D%228%22%2F%3E%3Ccircle%20cx%3D%22110%22%20cy%3D%22140%22%20r%3D%2260%22%20fill%3D%22%23fcd34d%22%20%2F%3E%3Cpath%20d%3D%22M%200%20200%20Q%20110%20150%20220%20200%20L%20220%20280%20L%200%20280%20Z%22%20fill%3D%22%2334d399%22%20%2F%3E%3Ccircle%20cx%3D%2260%22%20cy%3D%2280%22%20r%3D%2220%22%20fill%3D%22%2338bdf8%22%20%2F%3E%3Ccircle%20cx%3D%22170%22%20cy%3D%2290%22%20r%3D%2215%22%20fill%3D%22%2338bdf8%22%20%2F%3E%3Ccircle%20cx%3D%22150%22%20cy%3D%22220%22%20r%3D%2215%22%20fill%3D%22%23ef4444%22%20id%3D%22targetApple%22%20%2F%3E%3Crect%20x%3D%22148%22%20y%3D%22200%22%20width%3D%224%22%20height%3D%2210%22%20fill%3D%22%238b4513%22%20%2F%3E%3C%2Fg%3E%3Cg%20transform%3D%22translate(430%2C%20150)%22%20filter%3D%22url(%23dropShadow)%22%3E%3Crect%20width%3D%22220%22%20height%3D%22280%22%20fill%3D%22%23f8fafc%22%20rx%3D%2220%22%20stroke%3D%22%23e2e8f0%22%20stroke-width%3D%228%22%2F%3E%3Ccircle%20cx%3D%22110%22%20cy%3D%22140%22%20r%3D%2260%22%20fill%3D%22%23fcd34d%22%20%2F%3E%3Cpath%20d%3D%22M%200%20200%20Q%20110%20150%20220%20200%20L%20220%20280%20L%200%20280%20Z%22%20fill%3D%22%2334d399%22%20%2F%3E%3Ccircle%20cx%3D%2260%22%20cy%3D%2280%22%20r%3D%2220%22%20fill%3D%22%2338bdf8%22%20%2F%3E%3Ccircle%20cx%3D%22170%22%20cy%3D%2290%22%20r%3D%2215%22%20fill%3D%22%2338bdf8%22%20%2F%3E%3C%2Fg%3E%3Cg%20transform%3D%22translate(580%2C%20370)%20rotate(-30)%22%20filter%3D%22url(%23glow)%22%3E%3Cline%20x1%3D%220%22%20y1%3D%2245%22%20x2%3D%220%22%20y2%3D%22120%22%20stroke%3D%22%23475569%22%20stroke-width%3D%2225%22%20stroke-linecap%3D%22round%22%20%2F%3E%3Ccircle%20cx%3D%220%22%20cy%3D%220%22%20r%3D%2250%22%20fill%3D%22rgba(239%2C%2068%2C%2068%2C%200.2)%22%20stroke%3D%22%23ef4444%22%20stroke-width%3D%2212%22%20%2F%3E%3Cpath%20d%3D%22M%20-25%20-25%20Q%200%20-40%2025%20-25%22%20fill%3D%22none%22%20stroke%3D%22%23fff%22%20stroke-width%3D%225%22%20stroke-linecap%3D%22round%22%20opacity%3D%220.8%22%2F%3E%3C%2Fg%3E%3Ccircle%20cx%3D%22580%22%20cy%3D%22370%22%20r%3D%2260%22%20fill%3D%22none%22%20stroke%3D%22%23ef4444%22%20stroke-width%3D%226%22%20stroke-dasharray%3D%2215%2C10%22%20filter%3D%22url(%23glow)%22%20%2F%3E%3Ctext%20x%3D%22400%22%20y%3D%22100%22%20font-family%3D%22system-ui%2C%20sans-serif%22%20font-size%3D%2250%22%20font-weight%3D%22900%22%20fill%3D%22%23fff%22%20text-anchor%3D%22middle%22%20filter%3D%22url(%23glow)%22%3ESPOT%20THE%20DIFFERENCE%3C%2Ftext%3E%3C%2Fsvg%3E',
      genre: 'Puzzle',
      platforms: ['browser', 'android'],
      localUrl: '/games/spot-differences/index.html',
      status: 'available'
    },
    {
      id: 'card-battle',
      title: 'صراع البطاقات',
      description: 'لعبة استراتيجية مذهلة. قم بتجهيز مجموعتك المكونة من 20 بطاقات، وزع 100 نقطة عليها، وتغلب على الذكاء الاصطناعي في معارك تكتيكية محتدمة.',
      thumbnail: 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22bg%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%230f172a%22%2F%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%231e293b%22%2F%3E%3C%2FlinearGradient%3E%3Cfilter%20id%3D%22glow%22%3E%3CfeGaussianBlur%20stdDeviation%3D%225%22%20result%3D%22coloredBlur%22%2F%3E%3CfeMerge%3E%3CfeMergeNode%20in%3D%22coloredBlur%22%2F%3E%3CfeMergeNode%20in%3D%22SourceGraphic%22%2F%3E%3C%2FfeMerge%3E%3C%2Ffilter%3E%3C%2Fdefs%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22url(%23bg)%22%20%2F%3E%3Cg%20transform%3D%22translate(300%2C%20200)%20rotate(-15)%22%3E%3Crect%20width%3D%22180%22%20height%3D%22260%22%20fill%3D%22%23334155%22%20rx%3D%2210%22%20stroke%3D%22%23ef4444%22%20stroke-width%3D%224%22%2F%3E%3Ctext%20x%3D%2290%22%20y%3D%22150%22%20font-size%3D%2280%22%20text-anchor%3D%22middle%22%3E%26%23x2694%3B%3C%2Ftext%3E%3C%2Fg%3E%3Cg%20transform%3D%22translate(450%2C%20220)%20rotate(15)%22%20filter%3D%22url(%23glow)%22%3E%3Crect%20width%3D%22180%22%20height%3D%22260%22%20fill%3D%22%231e293b%22%20rx%3D%2210%22%20stroke%3D%22%233b82f6%22%20stroke-width%3D%224%22%2F%3E%3Ctext%20x%3D%2290%22%20y%3D%22150%22%20font-size%3D%2280%22%20text-anchor%3D%22middle%22%3E%26%23x1F6E1%3B%3C%2Ftext%3E%3C%2Fg%3E%3Ctext%20x%3D%22400%22%20y%3D%22120%22%20font-family%3D%22system-ui%2C%20sans-serif%22%20font-size%3D%2260%22%20font-weight%3D%22900%22%20fill%3D%22%23fff%22%20text-anchor%3D%22middle%22%20filter%3D%22url(%23glow)%22%3ECARD%20BATTLE%3C%2Ftext%3E%3C%2Fsvg%3E',
      genre: 'Strategy',
      platforms: ['browser', 'android'],
      localUrl: '/games/card-battle/index.html',
      status: 'available'
    },
    {
      id: 'cairo-runner',
      title: 'زحمة الميكروباص',
      description: 'لعبة ركض لا نهائي إدمانية! تفادى الميكروباصات والتكاتك في شوارع مصر المزدحمة. تحدى أصدقاءك واعرف من سيصمد لفترة أطول!',
      thumbnail: 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22road%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%220%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%231f2937%22%2F%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%23374151%22%2F%3E%3C%2FlinearGradient%3E%3Cfilter%20id%3D%22glow%22%3E%3CfeGaussianBlur%20stdDeviation%3D%224%22%20result%3D%22blur%22%2F%3E%3CfeMerge%3E%3CfeMergeNode%20in%3D%22blur%22%2F%3E%3CfeMergeNode%20in%3D%22SourceGraphic%22%2F%3E%3C%2FfeMerge%3E%3C%2Ffilter%3E%3C%2Fdefs%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22%23111827%22%20%2F%3E%3Cg%20transform%3D%22perspective(500)%20rotateX(45)%20translate(0%2C%20-200)%22%3E%3Crect%20x%3D%22200%22%20y%3D%220%22%20width%3D%22400%22%20height%3D%221000%22%20fill%3D%22url(%23road)%22%2F%3E%3Cline%20x1%3D%22333%22%20y1%3D%220%22%20x2%3D%22333%22%20y2%3D%221000%22%20stroke%3D%22%23fcd34d%22%20stroke-width%3D%228%22%20stroke-dasharray%3D%2240%2C40%22%2F%3E%3Cline%20x1%3D%22466%22%20y1%3D%220%22%20x2%3D%22466%22%20y2%3D%221000%22%20stroke%3D%22%23fcd34d%22%20stroke-width%3D%228%22%20stroke-dasharray%3D%2240%2C40%22%2F%3E%3C%2Fg%3E%3Cg%20transform%3D%22translate(350%2C%20350)%22%3E%3Crect%20x%3D%22-40%22%20y%3D%220%22%20width%3D%2280%22%20height%3D%22120%22%20fill%3D%22%23fff%22%20rx%3D%2210%22%2F%3E%3Crect%20x%3D%22-40%22%20y%3D%2280%22%20width%3D%2280%22%20height%3D%2215%22%20fill%3D%22%23ef4444%22%2F%3E%3Crect%20x%3D%22-30%22%20y%3D%2210%22%20width%3D%2260%22%20height%3D%2230%22%20fill%3D%22%231f2937%22%20rx%3D%225%22%2F%3E%3C%2Fg%3E%3Cg%20transform%3D%22translate(500%2C%20200)%20scale(0.8)%22%3E%3Crect%20x%3D%22-40%22%20y%3D%220%22%20width%3D%2280%22%20height%3D%22100%22%20fill%3D%22%23fcd34d%22%20rx%3D%225%22%2F%3E%3Crect%20x%3D%22-30%22%20y%3D%2210%22%20width%3D%2260%22%20height%3D%2230%22%20fill%3D%22%231f2937%22%20rx%3D%225%22%2F%3E%3Ccircle%20cx%3D%220%22%20cy%3D%2290%22%20r%3D%2215%22%20fill%3D%22%23000%22%2F%3E%3C%2Fg%3E%3Ccircle%20cx%3D%22270%22%20cy%3D%22450%22%20r%3D%2225%22%20fill%3D%22%233b82f6%22%2F%3E%3Ccircle%20cx%3D%22270%22%20cy%3D%22430%22%20r%3D%2215%22%20fill%3D%22%23fca5a5%22%2F%3E%3Ctext%20x%3D%22400%22%20y%3D%22100%22%20font-family%3D%22system-ui%2C%20sans-serif%22%20font-size%3D%2260%22%20font-weight%3D%22900%22%20fill%3D%22%23fff%22%20text-anchor%3D%22middle%22%20filter%3D%22url(%23glow)%22%3ECAIRO%20RUNNER%3C%2Ftext%3E%3C%2Fsvg%3E',
      genre: 'Action',
      platforms: ['browser', 'android'],
      localUrl: '/games/cairo-runner/index.html',
      status: 'available'
    },
    {
      id: 'lethal-company',
      title: 'الشركة المميتة (2D)',
      description: 'نسخة 2D من اللعبة الشهيرة! استكشف منشأة مظلمة، اجمع الخردة للشركة قبل انتهاء الوقت، ولا تدع الوحوش تمسك بك. تدعم اللعب التعاوني (P2P).',
      thumbnail: 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%3E%3Cdefs%3E%3CradialGradient%20id%3D%22bg%22%20cx%3D%2250%25%22%20cy%3D%2250%25%22%20r%3D%2270%25%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%23000%22%2F%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%23050505%22%2F%3E%3C%2FradialGradient%3E%3Cfilter%20id%3D%22glowGreen%22%3E%3CfeGaussianBlur%20stdDeviation%3D%224%22%20result%3D%22blur%22%2F%3E%3CfeMerge%3E%3CfeMergeNode%20in%3D%22blur%22%2F%3E%3CfeMergeNode%20in%3D%22SourceGraphic%22%2F%3E%3C%2FfeMerge%3E%3C%2Ffilter%3E%3Cfilter%20id%3D%22glowRed%22%3E%3CfeGaussianBlur%20stdDeviation%3D%226%22%20result%3D%22blur%22%2F%3E%3CfeMerge%3E%3CfeMergeNode%20in%3D%22blur%22%2F%3E%3CfeMergeNode%20in%3D%22SourceGraphic%22%2F%3E%3C%2FfeMerge%3E%3C%2Ffilter%3E%3C%2Fdefs%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22url(%23bg)%22%20%2F%3E%3Cg%20transform%3D%22translate(250%2C250)%22%3E%3Cpath%20d%3D%22M%200%200%20L%20350%20-150%20A%20350%20350%200%200%201%20350%20150%20Z%22%20fill%3D%22rgba(74%2C222%2C128%2C0.15)%22%20filter%3D%22url(%23glowGreen)%22%2F%3E%3Ccircle%20cx%3D%220%22%20cy%3D%220%22%20r%3D%2220%22%20fill%3D%22%2338bdf8%22%20%2F%3E%3C%2Fg%3E%3Cg%20transform%3D%22translate(600%2C250)%22%3E%3Ccircle%20cx%3D%220%22%20cy%3D%220%22%20r%3D%2225%22%20fill%3D%22%23111%22%20stroke%3D%22%23ef4444%22%20stroke-width%3D%224%22%2F%3E%3Ccircle%20cx%3D%22-10%22%20cy%3D%22-5%22%20r%3D%226%22%20fill%3D%22%23ef4444%22%20filter%3D%22url(%23glowRed)%22%2F%3E%3Ccircle%20cx%3D%2210%22%20cy%3D%22-5%22%20r%3D%226%22%20fill%3D%22%23ef4444%22%20filter%3D%22url(%23glowRed)%22%2F%3E%3C%2Fg%3E%3Ctext%20x%3D%22400%22%20y%3D%22100%22%20font-family%3D%22monospace%22%20font-size%3D%2250%22%20font-weight%3D%22bold%22%20fill%3D%22%234ade80%22%20text-anchor%3D%22middle%22%20filter%3D%22url(%23glowGreen)%22%3ELETHAL%20COMPANY%202D%3C%2Ftext%3E%3C%2Fsvg%3E',
      genre: 'Horror',
      platforms: ['browser', 'pc'],
      localUrl: '/games/lethal-company/index.html',
      status: 'available'
    },
    {
      id: 'strategic-xo',
      title: 'XO الاستراتيجية',
      description: 'النسخة الخارقة من لعبة إكس أو (Ultimate Tic-Tac-Toe). فكر في كل حركة لأن موقع لعبك يحدد أين سيلعب خصمك!',
      thumbnail: 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22bg%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%230f172a%22%2F%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%231e293b%22%2F%3E%3C%2FlinearGradient%3E%3Cfilter%20id%3D%22glowX%22%3E%3CfeGaussianBlur%20stdDeviation%3D%224%22%20result%3D%22blur%22%2F%3E%3CfeMerge%3E%3CfeMergeNode%20in%3D%22blur%22%2F%3E%3CfeMergeNode%20in%3D%22SourceGraphic%22%2F%3E%3C%2FfeMerge%3E%3C%2Ffilter%3E%3Cfilter%20id%3D%22glowO%22%3E%3CfeGaussianBlur%20stdDeviation%3D%224%22%20result%3D%22blur%22%2F%3E%3CfeMerge%3E%3CfeMergeNode%20in%3D%22blur%22%2F%3E%3CfeMergeNode%20in%3D%22SourceGraphic%22%2F%3E%3C%2FfeMerge%3E%3C%2Ffilter%3E%3C%2Fdefs%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22url(%23bg)%22%20%2F%3E%3Cg%20transform%3D%22translate(250%2C150)%22%3E%3Crect%20width%3D%22300%22%20height%3D%22300%22%20fill%3D%22%23334155%22%20rx%3D%2210%22%2F%3E%3Cline%20x1%3D%22100%22%20y1%3D%2210%22%20x2%3D%22100%22%20y2%3D%22290%22%20stroke%3D%22%23475569%22%20stroke-width%3D%224%22%2F%3E%3Cline%20x1%3D%22200%22%20y1%3D%2210%22%20x2%3D%22200%22%20y2%3D%22290%22%20stroke%3D%22%23475569%22%20stroke-width%3D%224%22%2F%3E%3Cline%20x1%3D%2210%22%20y1%3D%22100%22%20x2%3D%22290%22%20y2%3D%22100%22%20stroke%3D%22%23475569%22%20stroke-width%3D%224%22%2F%3E%3Cline%20x1%3D%2210%22%20y1%3D%22200%22%20x2%3D%22290%22%20y2%3D%22200%22%20stroke%3D%22%23475569%22%20stroke-width%3D%224%22%2F%3E%3Cg%20transform%3D%22translate(20%2C%2020)%22%3E%3Cpath%20d%3D%22M%200%200%20L%2060%2060%20M%2060%200%20L%200%2060%22%20stroke%3D%22%23f43f5e%22%20stroke-width%3D%228%22%20stroke-linecap%3D%22round%22%20filter%3D%22url(%23glowX)%22%2F%3E%3C%2Fg%3E%3Cg%20transform%3D%22translate(120%2C%20120)%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%2225%22%20fill%3D%22none%22%20stroke%3D%22%2338bdf8%22%20stroke-width%3D%228%22%20filter%3D%22url(%23glowO)%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3Ctext%20x%3D%22400%22%20y%3D%22100%22%20font-family%3D%22system-ui%2C%20sans-serif%22%20font-size%3D%2260%22%20font-weight%3D%22900%22%20fill%3D%22%23fff%22%20text-anchor%3D%22middle%22%3ESTRATEGIC%20XO%3C%2Ftext%3E%3C%2Fsvg%3E',
      genre: 'Puzzle',
      platforms: ['browser', 'android'],
      localUrl: '/games/strategic-xo/index.html',
      status: 'available'
    },
    {
      id: 'memory-match',
      title: 'لعبة الذاكرة',
      description: 'اختبر ذاكرتك وسرعة بديهتك مع أصدقائك في نفس الشاشة أو أونلاين عبر P2P. مستويات صعوبة متعددة بانتظارك!',
      thumbnail: 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22bg%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%231e293b%22%2F%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%230f172a%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22url(%23bg)%22%20%2F%3E%3Cg%20transform%3D%22translate(250%2C200)%22%3E%3Crect%20width%3D%22120%22%20height%3D%22160%22%20rx%3D%2210%22%20fill%3D%22%2338bdf8%22%2F%3E%3Ctext%20x%3D%2260%22%20y%3D%2290%22%20font-size%3D%2260%22%20text-anchor%3D%22middle%22%20alignment-baseline%3D%22middle%22%3E%F0%9F%92%A1%3C%2Ftext%3E%3C%2Fg%3E%3Cg%20transform%3D%22translate(430%2C200)%22%3E%3Crect%20width%3D%22120%22%20height%3D%22160%22%20rx%3D%2210%22%20fill%3D%22%23cbd5e1%22%2F%3E%3Ctext%20x%3D%2260%22%20y%3D%2290%22%20font-size%3D%2260%22%20text-anchor%3D%22middle%22%20alignment-baseline%3D%22middle%22%3E%3F%3C%2Ftext%3E%3C%2Fg%3E%3Ctext%20x%3D%22400%22%20y%3D%22100%22%20font-family%3D%22system-ui%2C%20sans-serif%22%20font-size%3D%2260%22%20font-weight%3D%22900%22%20fill%3D%22%23fff%22%20text-anchor%3D%22middle%22%3EMEMORY%20MATCH%3C%2Ftext%3E%3C%2Fsvg%3E',
      genre: 'Puzzle',
      platforms: ['browser', 'android'],
      localUrl: '/games/memory-match/index.html',
      status: 'available'
    },
    {
      id: 'space-shooter',
      title: 'حماية المجرة',
      description: 'أنقذ كوكبك من الغزو الفضائي! تحكم في سفينتك، دمر الأعداء، وتعاون مع أصدقائك في نفس الشاشة أو أونلاين عبر الـ P2P.',
      thumbnail: 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%3E%3Cdefs%3E%3CradialGradient%20id%3D%22bg%22%20cx%3D%2250%25%22%20cy%3D%2250%25%22%20r%3D%2270%25%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%231e1b4b%22%2F%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%23000%22%2F%3E%3C%2FradialGradient%3E%3Cfilter%20id%3D%22glow%22%3E%3CfeGaussianBlur%20stdDeviation%3D%224%22%20result%3D%22coloredBlur%22%2F%3E%3CfeMerge%3E%3CfeMergeNode%20in%3D%22coloredBlur%22%2F%3E%3CfeMergeNode%20in%3D%22SourceGraphic%22%2F%3E%3C%2FfeMerge%3E%3C%2Ffilter%3E%3C%2Fdefs%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22url(%23bg)%22%20%2F%3E%3Cg%20fill%3D%22%23fff%22%20opacity%3D%220.5%22%3E%3Ccircle%20cx%3D%22100%22%20cy%3D%22100%22%20r%3D%222%22%2F%3E%3Ccircle%20cx%3D%22250%22%20cy%3D%2250%22%20r%3D%221%22%2F%3E%3Ccircle%20cx%3D%22400%22%20cy%3D%22150%22%20r%3D%223%22%2F%3E%3Ccircle%20cx%3D%22600%22%20cy%3D%2280%22%20r%3D%222%22%2F%3E%3Ccircle%20cx%3D%22750%22%20cy%3D%22200%22%20r%3D%221%22%2F%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%22400%22%20r%3D%222%22%2F%3E%3Ccircle%20cx%3D%22200%22%20cy%3D%22500%22%20r%3D%223%22%2F%3E%3Ccircle%20cx%3D%22500%22%20cy%3D%22450%22%20r%3D%221%22%2F%3E%3Ccircle%20cx%3D%22700%22%20cy%3D%22550%22%20r%3D%222%22%2F%3E%3C%2Fg%3E%3Cg%20transform%3D%22translate(400%2C%20450)%22%20filter%3D%22url(%23glow)%22%3E%3Cpath%20d%3D%22M%200%20-40%20L%2040%2040%20L%200%2020%20L%20-40%2040%20Z%22%20fill%3D%22%233b82f6%22%2F%3E%3Crect%20x%3D%22-10%22%20y%3D%2230%22%20width%3D%2220%22%20height%3D%2240%22%20fill%3D%22%23f59e0b%22%20rx%3D%2210%22%2F%3E%3C%2Fg%3E%3Cg%20transform%3D%22translate(250%2C%20200)%22%20filter%3D%22url(%23glow)%22%3E%3Cpath%20d%3D%22M%200%2040%20L%2030%20-30%20L%200%20-10%20L%20-30%20-30%20Z%22%20fill%3D%22%23ef4444%22%2F%3E%3C%2Fg%3E%3Cg%20transform%3D%22translate(550%2C%20150)%20scale(1.5)%22%20filter%3D%22url(%23glow)%22%3E%3Cpath%20d%3D%22M%200%2040%20L%2040%20-40%20L%200%20-20%20L%20-40%20-40%20Z%22%20fill%3D%22%23ef4444%22%2F%3E%3C%2Fg%3E%3Crect%20x%3D%22395%22%20y%3D%22300%22%20width%3D%2210%22%20height%3D%2240%22%20fill%3D%22%233b82f6%22%20filter%3D%22url(%23glow)%22%2F%3E%3Ctext%20x%3D%22400%22%20y%3D%22100%22%20font-family%3D%22system-ui%2C%20sans-serif%22%20font-size%3D%2260%22%20font-weight%3D%22900%22%20fill%3D%22%23fff%22%20text-anchor%3D%22middle%22%20filter%3D%22url(%23glow)%22%3ESPACE%20SHOOTER%3C%2Ftext%3E%3C%2Fsvg%3E',
      genre: 'Action',
      platforms: ['browser', 'pc'],
      localUrl: '/games/space-shooter/index.html',
      status: 'available'
    },
    {
      id: 'spyfall',
      title: 'الجاسوس (Spyfall)',
      description: 'لعبة الخداع والمراوغة! العب مع أصدقائك من هاتف واحد (Pass & Play)، اطرحوا الأسئلة، واكشفوا الجاسوس قبل أن يهرب!',
      thumbnail: 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22bg%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%230f172a%22%2F%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%23020617%22%2F%3E%3C%2FlinearGradient%3E%3Cfilter%20id%3D%22glow%22%3E%3CfeGaussianBlur%20stdDeviation%3D%228%22%20result%3D%22coloredBlur%22%2F%3E%3CfeMerge%3E%3CfeMergeNode%20in%3D%22coloredBlur%22%2F%3E%3CfeMergeNode%20in%3D%22SourceGraphic%22%2F%3E%3C%2FfeMerge%3E%3C%2Ffilter%3E%3C%2Fdefs%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22url(%23bg)%22%20%2F%3E%3Cg%20transform%3D%22translate(400%2C300)%22%3E%3Cpath%20d%3D%22M-150%20-50%20C-150%20-150%20150%20-150%20150%20-50%20Z%22%20fill%3D%22%231e293b%22%20stroke%3D%22%23334155%22%20stroke-width%3D%224%22%2F%3E%3Crect%20x%3D%22-180%22%20y%3D%22-50%22%20width%3D%22360%22%20height%3D%2220%22%20fill%3D%22%230f172a%22%20stroke%3D%22%23334155%22%20stroke-width%3D%222%22%20rx%3D%225%22%2F%3E%3Cg%20filter%3D%22url(%23glow)%22%3E%3Ccircle%20cx%3D%22-60%22%20cy%3D%2230%22%20r%3D%2240%22%20fill%3D%22%23ef4444%22%20stroke%3D%22%23000%22%20stroke-width%3D%228%22%2F%3E%3Ccircle%20cx%3D%2260%22%20cy%3D%2230%22%20r%3D%2240%22%20fill%3D%22%23ef4444%22%20stroke%3D%22%23000%22%20stroke-width%3D%228%22%2F%3E%3Cline%20x1%3D%22-20%22%20y1%3D%2230%22%20x2%3D%2220%22%20y2%3D%2230%22%20stroke%3D%22%23000%22%20stroke-width%3D%228%22%2F%3E%3Cpath%20d%3D%22M-30%20120%20Q0%20150%2030%20120%22%20fill%3D%22none%22%20stroke%3D%22%23334155%22%20stroke-width%3D%226%22%20stroke-linecap%3D%22round%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3Ctext%20x%3D%22400%22%20y%3D%22100%22%20font-family%3D%22system-ui%2C%20sans-serif%22%20font-size%3D%2260%22%20font-weight%3D%22900%22%20fill%3D%22%23fff%22%20text-anchor%3D%22middle%22%20filter%3D%22url(%23glow)%22%3ESPYFALL%3C%2Ftext%3E%3C%2Fsvg%3E',
      genre: 'Social',
      platforms: ['browser', 'android'],
      localUrl: '/games/spyfall/index.html',
      status: 'available'
    },
    {
      id: 'tick-tock-bomb',
      title: 'القنبلة الموقوتة 💣',
      description: 'لعبة جماعية حماسية (Pass & Play)! أجب على السؤال بسرعة ومرر الهاتف قبل أن تنفجر القنبلة في يدك. الوقت المتبقي عشوائي ومجهول!',
      thumbnail: 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%3E%3Cdefs%3E%3CradialGradient%20id%3D%22bg%22%20cx%3D%2250%25%22%20cy%3D%2250%25%22%20r%3D%2270%25%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%23450a0a%22%2F%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%23000%22%2F%3E%3C%2FradialGradient%3E%3Cfilter%20id%3D%22glow%22%3E%3CfeGaussianBlur%20stdDeviation%3D%2210%22%20result%3D%22blur%22%2F%3E%3CfeMerge%3E%3CfeMergeNode%20in%3D%22blur%22%2F%3E%3CfeMergeNode%20in%3D%22SourceGraphic%22%2F%3E%3C%2FfeMerge%3E%3C%2Ffilter%3E%3C%2Fdefs%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22url(%23bg)%22%20%2F%3E%3Cg%20transform%3D%22translate(400%2C320)%22%3E%3Ccircle%20cx%3D%220%22%20cy%3D%220%22%20r%3D%22120%22%20fill%3D%22%23111827%22%20stroke%3D%22%231f2937%22%20stroke-width%3D%2210%22%2F%3E%3Crect%20x%3D%22-25%22%20y%3D%22-150%22%20width%3D%2250%22%20height%3D%2240%22%20fill%3D%22%23374151%22%20rx%3D%2210%22%2F%3E%3Cpath%20d%3D%22M0%20-150%20Q40%20-200%2080%20-180%22%20fill%3D%22none%22%20stroke%3D%22%23d97706%22%20stroke-width%3D%2210%22%20stroke-linecap%3D%22round%22%2F%3E%3Ccircle%20cx%3D%2280%22%20cy%3D%22-180%22%20r%3D%2220%22%20fill%3D%22%23ef4444%22%20filter%3D%22url(%23glow)%22%2F%3E%3Cpolygon%20points%3D%2280%2C-220%2090%2C-190%20120%2C-180%2090%2C-170%2080%2C-140%2070%2C-170%2040%2C-180%2070%2C-190%22%20fill%3D%22%23fcd34d%22%20filter%3D%22url(%23glow)%22%2F%3E%3Ctext%20x%3D%220%22%20y%3D%2225%22%20font-family%3D%22monospace%22%20font-size%3D%2260%22%20font-weight%3D%22bold%22%20fill%3D%22%23ef4444%22%20text-anchor%3D%22middle%22%20filter%3D%22url(%23glow)%22%3E00:03%3C%2Ftext%3E%3C%2Fg%3E%3Ctext%20x%3D%22400%22%20y%3D%22100%22%20font-family%3D%22system-ui%2C%20sans-serif%22%20font-size%3D%2260%22%20font-weight%3D%22900%22%20fill%3D%22%23fff%22%20text-anchor%3D%22middle%22%20filter%3D%22url(%23glow)%22%3ETICK%20TOCK%20BOMB%3C%2Ftext%3E%3C%2Fsvg%3E',
      genre: 'Social',
      platforms: ['browser', 'android'],
      localUrl: '/games/tick-tock-bomb/index.html',
      status: 'available'
    },
    {
      id: 'heads-up',
      title: 'على رأسي 🤦‍♂️',
      description: 'ضع الهاتف على جبهتك لتبدأ اللعب! سيقوم أصدقاؤك بتمثيل الكلمة التي تظهر على الشاشة، وعليك تخمينها قبل انتهاء الـ 60 ثانية.',
      thumbnail: 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22bg%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%23312e81%22%2F%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%231e1b4b%22%2F%3E%3C%2FlinearGradient%3E%3Cfilter%20id%3D%22glow%22%3E%3CfeGaussianBlur%20stdDeviation%3D%2210%22%20result%3D%22blur%22%2F%3E%3CfeMerge%3E%3CfeMergeNode%20in%3D%22blur%22%2F%3E%3CfeMergeNode%20in%3D%22SourceGraphic%22%2F%3E%3C%2FfeMerge%3E%3C%2Ffilter%3E%3C%2Fdefs%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22url(%23bg)%22%20%2F%3E%3Cg%20transform%3D%22translate(400%2C300)%22%3E%3Crect%20x%3D%22-150%22%20y%3D%22-80%22%20width%3D%22300%22%20height%3D%22160%22%20fill%3D%22%231e293b%22%20rx%3D%2220%22%20stroke%3D%22%233b82f6%22%20stroke-width%3D%228%22%20filter%3D%22url(%23glow)%22%2F%3E%3Crect%20x%3D%22-120%22%20y%3D%22-50%22%20width%3D%22240%22%20height%3D%22100%22%20fill%3D%22%233b82f6%22%20rx%3D%2210%22%2F%3E%3Ctext%20x%3D%220%22%20y%3D%2215%22%20font-family%3D%22system-ui%2C%20sans-serif%22%20font-size%3D%2240%22%20font-weight%3D%22bold%22%20fill%3D%22%23fff%22%20text-anchor%3D%22middle%22%3E%D8%A3%D8%B3%D8%AF%3C%2Ftext%3E%3Cg%20transform%3D%22translate(0%2C%20-200)%22%3E%3Ccircle%20cx%3D%220%22%20cy%3D%220%22%20r%3D%2240%22%20fill%3D%22none%22%20stroke%3D%22%23cbd5e1%22%20stroke-width%3D%226%22%2F%3E%3Cpath%20d%3D%22M-20%20-10%20Q0%20-30%2020%20-10%22%20fill%3D%22none%22%20stroke%3D%22%23cbd5e1%22%20stroke-width%3D%226%22%2F%3E%3Cpath%20d%3D%22M-15%2015%20Q0%2025%2015%2015%22%20fill%3D%22none%22%20stroke%3D%22%23cbd5e1%22%20stroke-width%3D%226%22%20stroke-linecap%3D%22round%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3Ctext%20x%3D%22400%22%20y%3D%22100%22%20font-family%3D%22system-ui%2C%20sans-serif%22%20font-size%3D%2260%22%20font-weight%3D%22900%22%20fill%3D%22%23fff%22%20text-anchor%3D%22middle%22%20filter%3D%22url(%23glow)%22%3EHEADS%20UP!%3C%2Ftext%3E%3C%2Fsvg%3E',
      genre: 'Party',
      platforms: ['browser', 'android'],
      localUrl: '/games/heads-up/index.html',
      status: 'available'
    },
    {
      id: 'draw-and-guess',
      title: 'الرسم والتخمين 🎨',
      description: 'هل أنت رسام ماهر؟ امسك الهاتف وارسم الكلمة السرية بينما يصرخ أصدقاؤك لتخمينها قبل أن ينتهي الوقت!',
      thumbnail: 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22bg%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%231e3a8a%22%2F%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%23172554%22%2F%3E%3C%2FlinearGradient%3E%3Cfilter%20id%3D%22glow%22%3E%3CfeGaussianBlur%20stdDeviation%3D%225%22%20result%3D%22blur%22%2F%3E%3CfeMerge%3E%3CfeMergeNode%20in%3D%22blur%22%2F%3E%3CfeMergeNode%20in%3D%22SourceGraphic%22%2F%3E%3C%2FfeMerge%3E%3C%2Ffilter%3E%3C%2Fdefs%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22url(%23bg)%22%20%2F%3E%3Cg%20transform%3D%22translate(400%2C300)%22%3E%3Crect%20x%3D%22-180%22%20y%3D%22-120%22%20width%3D%22360%22%20height%3D%22240%22%20fill%3D%22%23f8fafc%22%20rx%3D%2210%22%20stroke%3D%22%23cbd5e1%22%20stroke-width%3D%2210%22%2F%3E%3Cpath%20d%3D%22M-120%2020%20Q-80%20-60%20-40%2020%20T40%2020%20T120%2020%22%20fill%3D%22none%22%20stroke%3D%22%23ef4444%22%20stroke-width%3D%228%22%20stroke-linecap%3D%22round%22%2F%3E%3Ccircle%20cx%3D%2280%22%20cy%3D%22-40%22%20r%3D%2220%22%20fill%3D%22%23fcd34d%22%2F%3E%3Cg%20transform%3D%22translate(60%2C%2080)%20rotate(-30)%22%3E%3Crect%20x%3D%22-15%22%20y%3D%22-60%22%20width%3D%2230%22%20height%3D%22120%22%20fill%3D%22%23facc15%22%20rx%3D%225%22%2F%3E%3Cpolygon%20points%3D%22-15%2C-60%2015%2C-60%200%2C-90%22%20fill%3D%22%23fbbf24%22%2F%3E%3Cpolygon%20points%3D%22-5%2C-60%205%2C-60%200%2C-90%22%20fill%3D%22%23374151%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3Ctext%20x%3D%22400%22%20y%3D%22100%22%20font-family%3D%22system-ui%2C%20sans-serif%22%20font-size%3D%2250%22%20font-weight%3D%22900%22%20fill%3D%22%23fff%22%20text-anchor%3D%22middle%22%20filter%3D%22url(%23glow)%22%3EDRAW%20%26%20GUESS%3C%2Ftext%3E%3C%2Fsvg%3E',
      genre: 'Party',
      platforms: ['browser', 'android', 'pc'],
      localUrl: '/games/draw-and-guess/index.html',
      status: 'available'
    },
    {
      id: 'dobble',
      title: 'المطابقة السريعة ⚡',
      description: 'لعبة شاشة منقسمة (Split-Screen) للاعبين! هناك رمز واحد فقط مشترك بين بطاقتك وبطاقة خصمك، كن الأسرع في إيجاده والضغط عليه للفوز.',
      thumbnail: 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22bg%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%231e293b%22%2F%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%230f172a%22%2F%3E%3C%2FlinearGradient%3E%3Cfilter%20id%3D%22glow%22%3E%3CfeGaussianBlur%20stdDeviation%3D%228%22%20result%3D%22blur%22%2F%3E%3CfeMerge%3E%3CfeMergeNode%20in%3D%22blur%22%2F%3E%3CfeMergeNode%20in%3D%22SourceGraphic%22%2F%3E%3C%2FfeMerge%3E%3C%2Ffilter%3E%3C%2Fdefs%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22url(%23bg)%22%20%2F%3E%3Cpath%20d%3D%22M0%20300%20L800%20300%22%20stroke%3D%22%23ef4444%22%20stroke-width%3D%228%22%20filter%3D%22url(%23glow)%22%2F%3E%3Cg%20transform%3D%22translate(400%2C150)%22%3E%3Ccircle%20cx%3D%220%22%20cy%3D%220%22%20r%3D%22100%22%20fill%3D%22%23fff%22%20stroke%3D%22%23cbd5e1%22%20stroke-width%3D%226%22%2F%3E%3Ctext%20x%3D%22-30%22%20y%3D%22-30%22%20font-size%3D%2240%22%3E%F0%9F%9A%80%3C%2Ftext%3E%3Ctext%20x%3D%2220%22%20y%3D%2230%22%20font-size%3D%2230%22%3E%F0%9F%8D%8E%3C%2Ftext%3E%3Ctext%20x%3D%22-20%22%20y%3D%2240%22%20font-size%3D%2250%22%3E%F0%9F%90%B1%3C%2Ftext%3E%3Ctext%20x%3D%2230%22%20y%3D%22-20%22%20font-size%3D%2235%22%3E%E2%9A%BD%3C%2Ftext%3E%3C%2Fg%3E%3Cg%20transform%3D%22translate(400%2C450)%22%3E%3Ccircle%20cx%3D%220%22%20cy%3D%220%22%20r%3D%22100%22%20fill%3D%22%23fff%22%20stroke%3D%22%23cbd5e1%22%20stroke-width%3D%226%22%2F%3E%3Ctext%20x%3D%2220%22%20y%3D%22-20%22%20font-size%3D%2230%22%3E%E2%AD%90%3C%2Ftext%3E%3Ctext%20x%3D%22-40%22%20y%3D%2210%22%20font-size%3D%2245%22%3E%F0%9F%90%B1%3C%2Ftext%3E%3Ctext%20x%3D%2210%22%20y%3D%2240%22%20font-size%3D%2235%22%3E%F0%9F%8E%B2%3C%2Ftext%3E%3Ctext%20x%3D%22-10%22%20y%3D%22-40%22%20font-size%3D%2225%22%3E%F0%9F%8E%A8%3C%2Ftext%3E%3C%2Fg%3E%3Ctext%20x%3D%22400%22%20y%3D%22300%22%20font-family%3D%22system-ui%2C%20sans-serif%22%20font-size%3D%2250%22%20font-weight%3D%22900%22%20fill%3D%22%23fff%22%20text-anchor%3D%22middle%22%20filter%3D%22url(%23glow)%22%20transform%3D%22translate(0%2C15)%22%3ESYMBOL%20CLASH%3C%2Ftext%3E%3C%2Fsvg%3E',
      genre: 'Party',
      platforms: ['browser', 'android'],
      localUrl: '/games/dobble/index.html',
      status: 'available'
    },
    {
      id: 'squid-game',
      title: 'الضوء الأحمر والأخضر 🦑',
      description: 'لعبة شاشة منقسمة (Split-Screen) حماسية! اركض عندما يكون الضوء أخضر، وارفع إصبعك فوراً عندما يصبح أحمر وإلا سيتم إقصاؤك!',
      thumbnail: 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%3E%3Cdefs%3E%3CradialGradient%20id%3D%22bg%22%20cx%3D%2250%25%22%20cy%3D%2250%25%22%20r%3D%2270%25%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%23312e81%22%2F%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%231e1b4b%22%2F%3E%3C%2FradialGradient%3E%3Cfilter%20id%3D%22glow%22%3E%3CfeGaussianBlur%20stdDeviation%3D%228%22%20result%3D%22blur%22%2F%3E%3CfeMerge%3E%3CfeMergeNode%20in%3D%22blur%22%2F%3E%3CfeMergeNode%20in%3D%22SourceGraphic%22%2F%3E%3C%2FfeMerge%3E%3C%2Ffilter%3E%3C%2Fdefs%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22url(%23bg)%22%20%2F%3E%3Cg%20transform%3D%22translate(400%2C300)%22%3E%3Ccircle%20cx%3D%22-150%22%20cy%3D%220%22%20r%3D%2260%22%20fill%3D%22%2310b981%22%20filter%3D%22url(%23glow)%22%2F%3E%3Ccircle%20cx%3D%22150%22%20cy%3D%220%22%20r%3D%2260%22%20fill%3D%22%23ef4444%22%20filter%3D%22url(%23glow)%22%2F%3E%3Cpath%20d%3D%22M-40%200%20L40%200%22%20stroke%3D%22%23cbd5e1%22%20stroke-width%3D%2210%22%20stroke-dasharray%3D%2215%2C15%22%2F%3E%3C%2Fg%3E%3Ctext%20x%3D%22400%22%20y%3D%22480%22%20font-family%3D%22system-ui%2C%20sans-serif%22%20font-size%3D%2260%22%20font-weight%3D%22900%22%20fill%3D%22%23fff%22%20text-anchor%3D%22middle%22%20filter%3D%22url(%23glow)%22%3ERED%20LIGHT%20GREEN%20LIGHT%3C%2Ftext%3E%3Ctext%20x%3D%22400%22%20y%3D%22150%22%20font-family%3D%22system-ui%2C%20sans-serif%22%20font-size%3D%2280%22%20font-weight%3D%22900%22%20fill%3D%22%23fff%22%20text-anchor%3D%22middle%22%20filter%3D%22url(%23glow)%22%3E%F0%9F%A6%91%3C%2Ftext%3E%3C%2Fsvg%3E',
      genre: 'Party',
      platforms: ['browser', 'android'],
      localUrl: '/games/squid-game/index.html',
      status: 'available'
    },
    {
      id: 'snake-arena',
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
      title: 'خمن الكلمة 🤔',
      description: 'النسخة العربية من اللعبة الشهيرة Wordle. خمن الكلمة المكونة من 5 حروف في 6 محاولات فقط!',
      thumbnail: 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22%23121213%22%2F%3E%3Cg%20transform%3D%22translate(250%2C200)%22%3E%3Crect%20x%3D%220%22%20y%3D%220%22%20width%3D%2280%22%20height%3D%2280%22%20fill%3D%22%23538d4e%22%2F%3E%3Crect%20x%3D%22100%22%20y%3D%220%22%20width%3D%2280%22%20height%3D%2280%22%20fill%3D%22%23b59f3b%22%2F%3E%3Crect%20x%3D%22200%22%20y%3D%220%22%20width%3D%2280%22%20height%3D%2280%22%20fill%3D%22%233a3a3c%22%2F%3E%3Ctext%20x%3D%2240%22%20y%3D%2255%22%20font-size%3D%2250%22%20font-family%3D%22sans-serif%22%20fill%3D%22%23fff%22%20text-anchor%3D%22middle%22%3E%D9%83%3C%2Ftext%3E%3Ctext%20x%3D%22140%22%20y%3D%2255%22%20font-size%3D%2250%22%20font-family%3D%22sans-serif%22%20fill%3D%22%23fff%22%20text-anchor%3D%22middle%22%3E%D9%84%3C%2Ftext%3E%3Ctext%20x%3D%22240%22%20y%3D%2255%22%20font-size%3D%2250%22%20font-family%3D%22sans-serif%22%20fill%3D%22%23fff%22%20text-anchor%3D%22middle%22%3E%D9%85%3C%2Ftext%3E%3C%2Fg%3E%3Ctext%20x%3D%22400%22%20y%3D%22450%22%20font-family%3D%22system-ui%2C%20sans-serif%22%20font-size%3D%2260%22%20font-weight%3D%22900%22%20fill%3D%22%23fff%22%20text-anchor%3D%22middle%22%3EWORDLE%3C%2Ftext%3E%3C%2Fsvg%3E',
      genre: 'Puzzle',
      platforms: ['browser', 'pc', 'android'],
      localUrl: '/games/arabic-wordle/index.html',
      status: 'available'
    },
    {
      id: 'escape-room',
      title: 'غرفة الهروب 🚪',
      description: 'لعبة تعاونية (P2P). تبادلا التلميحات عبر الميكروفون لحل الألغاز وفتح الأقفال والهروب معاً قبل نفاد الوقت!',
      thumbnail: 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22%231e1b4b%22%2F%3E%3Cg%20transform%3D%22translate(300%2C150)%22%3E%3Crect%20x%3D%220%22%20y%3D%220%22%20width%3D%22200%22%20height%3D%22250%22%20fill%3D%22%23475569%22%20stroke%3D%22%23334155%22%20stroke-width%3D%2210%22%2F%3E%3Ccircle%20cx%3D%22160%22%20cy%3D%22125%22%20r%3D%2210%22%20fill%3D%22%23fbbf24%22%2F%3E%3C%2Fg%3E%3Ctext%20x%3D%22400%22%20y%3D%22500%22%20font-family%3D%22system-ui%2C%20sans-serif%22%20font-size%3D%2260%22%20font-weight%3D%22900%22%20fill%3D%22%23fff%22%20text-anchor%3D%22middle%22%3EESCAPE%20ROOM%3C%2Ftext%3E%3C%2Fsvg%3E',
      genre: 'Co-op',
      platforms: ['browser', 'pc'],
      localUrl: '/games/escape-room/index.html',
      status: 'available'
    },
    {
      id: 'fruit-slicer',
      title: 'تقطيع الفواكه 🍉',
      description: 'مرر إصبعك بسرعة لتقطيع الفواكه المتطايرة وتجنب القنابل لجمع أعلى النقاط. لعبة مسلية مليئة بالحركة!',
      thumbnail: 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22%2327272a%22%2F%3E%3Ctext%20x%3D%22300%22%20y%3D%22300%22%20font-size%3D%22100%22%20text-anchor%3D%22middle%22%20transform%3D%22rotate(-20%20300%20300)%22%3E%F0%9F%8D%89%3C%2Ftext%3E%3Ctext%20x%3D%22500%22%20y%3D%22250%22%20font-size%3D%22100%22%20text-anchor%3D%22middle%22%20transform%3D%22rotate(20%20500%20250)%22%3E%F0%9F%8D%8B%3C%2Ftext%3E%3Cpath%20d%3D%22M200%20350%20L600%20150%22%20stroke%3D%22%23fff%22%20stroke-width%3D%228%22%20fill%3D%22none%22%2F%3E%3Ctext%20x%3D%22400%22%20y%3D%22450%22%20font-family%3D%22system-ui%2C%20sans-serif%22%20font-size%3D%2260%22%20font-weight%3D%22900%22%20fill%3D%22%23fff%22%20text-anchor%3D%22middle%22%3EFRUIT%20SLICER%3C%2Ftext%3E%3C%2Fsvg%3E',
      genre: 'Action',
      platforms: ['browser', 'pc', 'android'],
      localUrl: '/games/fruit-slicer/index.html',
      status: 'available'
    },
    {
      id: 'typing-defense',
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
      title: 'الطائر المضحك 🐒',
      description: 'اضغط على الشاشة للقفز وتفادى الأنابيب في هذه النسخة المضحكة من اللعبة الشهيرة!',
      thumbnail: 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22%2338bdf8%22%2F%3E%3Crect%20x%3D%22500%22%20y%3D%220%22%20width%3D%22120%22%20height%3D%22200%22%20fill%3D%22%2322c55e%22%20stroke%3D%22%23166534%22%20stroke-width%3D%228%22%2F%3E%3Crect%20x%3D%22480%22%20y%3D%22160%22%20width%3D%22160%22%20height%3D%2240%22%20fill%3D%22%2322c55e%22%20stroke%3D%22%23166534%22%20stroke-width%3D%228%22%2F%3E%3Ctext%20x%3D%22250%22%20y%3D%22300%22%20font-size%3D%22100%22%20text-anchor%3D%22middle%22%3E%F0%9F%90%92%3C%2Ftext%3E%3Ctext%20x%3D%22400%22%20y%3D%22500%22%20font-family%3D%22system-ui%2C%20sans-serif%22%20font-size%3D%2260%22%20font-weight%3D%22900%22%20fill%3D%22%23fff%22%20text-anchor%3D%22middle%22%3EFLAPPY%20CLONE%3C%2Ftext%3E%3C%2Fsvg%3E',
      genre: 'Action',
      platforms: ['browser', 'android'],
      localUrl: '/games/flappy-clone/index.html',
      status: 'available'
    },
    {
      id: 'math-racer',
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
      title: 'خيانة في الفضاء 🚀',
      description: 'لعبة خداع واستنتاج (P2P). العب مع أصدقائك! أنجزوا المهام كطاقم، أو قوموا بتخريب السفينة وقتل الطاقم كمخربين دون أن يتم اكتشافكم.',
      thumbnail: 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22%23000%22%2F%3E%3Ccircle%20cx%3D%22200%22%20cy%3D%22300%22%20r%3D%2280%22%20fill%3D%22%2338bdf8%22%2F%3E%3Crect%20x%3D%22220%22%20y%3D%22260%22%20width%3D%2260%22%20height%3D%2240%22%20rx%3D%2220%22%20fill%3D%22%2394a3b8%22%2F%3E%3Ccircle%20cx%3D%22600%22%20cy%3D%22300%22%20r%3D%2280%22%20fill%3D%22%23ef4444%22%2F%3E%3Crect%20x%3D%22520%22%20y%3D%22260%22%20width%3D%2260%22%20height%3D%2240%22%20rx%3D%2220%22%20fill%3D%22%2394a3b8%22%2F%3E%3Cpath%20d%3D%22M560%20320%20L520%20350%22%20stroke%3D%22%23fff%22%20stroke-width%3D%2210%22%2F%3E%3Ctext%20x%3D%22400%22%20y%3D%22500%22%20font-family%3D%22system-ui%2C%20sans-serif%22%20font-size%3D%2260%22%20font-weight%3D%22900%22%20fill%3D%22%23ef4444%22%20text-anchor%3D%22middle%22%3ESPACE%20DECEPTION%3C%2Ftext%3E%3C%2Fsvg%3E',
      genre: 'Co-op',
      platforms: ['browser', 'pc', 'android'],
      localUrl: '/games/space-deception/index.html',
      status: 'available',
      localModeType: 'ai'
    },
    {
      id: 'ludo-party',
      title: 'يلا لودو 🎲',
      description: 'لعبة اللوح الكلاسيكية الممتعة! العب مع 3 من أصدقائك في نفس الشاشة أو عبر الإنترنت، وارمِ النرد لتفوز بالسباق.',
      thumbnail: 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22%23fbbf24%22%2F%3E%3Crect%20x%3D%22200%22%20y%3D%22100%22%20width%3D%22400%22%20height%3D%22400%22%20fill%3D%22%23fff%22%20stroke%3D%22%23000%22%20stroke-width%3D%2210%22%2F%3E%3Crect%20x%3D%22200%22%20y%3D%22100%22%20width%3D%22150%22%20height%3D%22150%22%20fill%3D%22%23ef4444%22%2F%3E%3Crect%20x%3D%22450%22%20y%3D%22100%22%20width%3D%22150%22%20height%3D%22150%22%20fill%3D%22%2322c55e%22%2F%3E%3Crect%20x%3D%22200%22%20y%3D%22350%22%20width%3D%22150%22%20height%3D%22150%22%20fill%3D%22%233b82f6%22%2F%3E%3Crect%20x%3D%22450%22%20y%3D%22350%22%20width%3D%22150%22%20height%3D%22150%22%20fill%3D%22%23eab308%22%2F%3E%3Ctext%20x%3D%22400%22%20y%3D%22570%22%20font-family%3D%22system-ui%2C%20sans-serif%22%20font-size%3D%2250%22%20font-weight%3D%22900%22%20fill%3D%22%23000%22%20text-anchor%3D%22middle%22%3ELUDO%20PARTY%3C%2Ftext%3E%3C%2Fsvg%3E',
      genre: 'Board',
      platforms: ['browser', 'android'],
      localUrl: '/games/ludo-party/index.html',
      status: 'available'
    },
    {
      id: 'crazy-uno',
      title: 'أونو المجنونة 🃏',
      description: 'لعبة البطاقات الأشهر عالمياً! العب مع 3 إلى 8 أصدقاء، استخدم بطاقات السحب والعكس، ولا تنس أن تصرخ "أونو" قبل الفوز!',
      thumbnail: 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22%23ef4444%22%2F%3E%3Cg%20transform%3D%22translate(400%2C%20250)%20rotate(-15)%22%3E%3Crect%20x%3D%22-100%22%20y%3D%22-150%22%20width%3D%22200%22%20height%3D%22300%22%20fill%3D%22%23000%22%20rx%3D%2220%22%2F%3E%3Crect%20x%3D%22-90%22%20y%3D%22-140%22%20width%3D%22180%22%20height%3D%22280%22%20fill%3D%22%23fff%22%20rx%3D%2215%22%2F%3E%3Cellipse%20cx%3D%220%22%20cy%3D%220%22%20rx%3D%2260%22%20ry%3D%22100%22%20fill%3D%22%23ef4444%22%20transform%3D%22rotate(30)%22%2F%3E%3Ctext%20x%3D%220%22%20y%3D%2220%22%20font-family%3D%22sans-serif%22%20font-size%3D%2270%22%20font-weight%3D%22900%22%20fill%3D%22%23facc15%22%20text-anchor%3D%22middle%22%3EUNO%3C%2Ftext%3E%3C%2Fg%3E%3Ctext%20x%3D%22400%22%20y%3D%22550%22%20font-family%3D%22system-ui%2C%20sans-serif%22%20font-size%3D%2260%22%20font-weight%3D%22900%22%20fill%3D%22%23fff%22%20text-anchor%3D%22middle%22%3ECRAZY%20UNO%3C%2Ftext%3E%3C%2Fsvg%3E',
      genre: 'Card',
      platforms: ['browser', 'android'],
      localUrl: '/games/crazy-uno/index.html',
      status: 'available',
      localModeType: 'pass_and_play'
    },
    {
      id: 'werewolf-village',
      title: 'القرية الملعونة 🐺',
      description: 'لعبة خداع جماعية (5 إلى 10 لاعبين). هناك مستذئبون يتخفون بين القرويين! حققوا، تناقشوا عبر الميكروفون، واكتشفوا الخونة قبل حلول الليل.',
      thumbnail: 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22%230f172a%22%2F%3E%3Ccircle%20cx%3D%22400%22%20cy%3D%22300%22%20r%3D%22150%22%20fill%3D%22%23fef08a%22%2F%3E%3Cpath%20d%3D%22M300%20450%20Q400%20200%20500%20450%20Z%22%20fill%3D%22%23020617%22%2F%3E%3Ctext%20x%3D%22400%22%20y%3D%22550%22%20font-family%3D%22system-ui%2C%20sans-serif%22%20font-size%3D%2260%22%20font-weight%3D%22900%22%20fill%3D%22%23ef4444%22%20text-anchor%3D%22middle%22%3EWEREWOLF%20VILLAGE%3C%2Ftext%3E%3C%2Fsvg%3E',
      genre: 'Social',
      platforms: ['browser', 'android', 'pc'],
      localUrl: '/games/werewolf-village/index.html',
      status: 'available',
      localModeType: 'ai'
    },
    {
      id: 'bomb-arena',
      title: 'حرب القنابل 💣',
      description: 'لعبة أكشن وحماس لـ 4 إلى 8 لاعبين! ارمِ القنابل، فجّر أصدقاءك، وكن الناجي الأخير في خرائط ديناميكية مدمرة بالكامل.',
      thumbnail: 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22%23111827%22%2F%3E%3Ccircle%20cx%3D%22400%22%20cy%3D%22300%22%20r%3D%22120%22%20fill%3D%22%23000%22%20stroke%3D%22%23ef4444%22%20stroke-width%3D%2210%22%2F%3E%3Crect%20x%3D%22380%22%20y%3D%22150%22%20width%3D%2240%22%20height%3D%2240%22%20fill%3D%22%234b5563%22%2F%3E%3Cpath%20d%3D%22M400%20150%20Q450%20100%20420%2050%22%20fill%3D%22none%22%20stroke%3D%22%23facc15%22%20stroke-width%3D%228%22%20stroke-dasharray%3D%2210%2C5%22%2F%3E%3Ctext%20x%3D%22400%22%20y%3D%22550%22%20font-family%3D%22system-ui%2C%20sans-serif%22%20font-size%3D%2260%22%20font-weight%3D%22900%22%20fill%3D%22%23ef4444%22%20text-anchor%3D%22middle%22%3EBOMB%20ARENA%3C%2Ftext%3E%3C%2Fsvg%3E',
      genre: 'Action',
      platforms: ['browser', 'android', 'pc'],
      localUrl: '/games/bomb-arena/index.html',
      status: 'available'
    },
    {
      id: 'funny-answers',
      title: 'جوابك فخ 🤣',
      description: 'لعبة حفلات مضحكة لـ 3 إلى 8 لاعبين. املأ الفراغ بأكثر الإجابات إضحاكاً أو عبثية من بطاقاتك، ودع القاضي يختار الفائز!',
      thumbnail: 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22%23000%22%2F%3E%3Crect%20x%3D%22200%22%20y%3D%22150%22%20width%3D%22180%22%20height%3D%22260%22%20fill%3D%22%23fff%22%20rx%3D%2215%22%20transform%3D%22rotate(-10%20200%20150)%22%2F%3E%3Crect%20x%3D%22420%22%20y%3D%22150%22%20width%3D%22180%22%20height%3D%22260%22%20fill%3D%22%231e293b%22%20stroke%3D%22%23fff%22%20stroke-width%3D%224%22%20rx%3D%2215%22%20transform%3D%22rotate(10%20420%20150)%22%2F%3E%3Ctext%20x%3D%22400%22%20y%3D%22550%22%20font-family%3D%22system-ui%2C%20sans-serif%22%20font-size%3D%2260%22%20font-weight%3D%22900%22%20fill%3D%22%23fff%22%20text-anchor%3D%22middle%22%3EFUNNY%20ANSWERS%3C%2Ftext%3E%3C%2Fsvg%3E',
      genre: 'Party',
      platforms: ['browser', 'android'],
      localUrl: '/games/funny-answers/index.html',
      status: 'available',
      localModeType: 'pass_and_play'
    },
    {
      id: 'temporal-rift',
      title: 'صدع الزمن ⏳',
      description: 'لعبة ألغاز تعاونية تفاعلية عبر الزمن لـ 3 لاعبين (الماضي، الحاضر، المستقبل). تحرك بحذر فكل فعل تفعله في الماضي أو الحاضر سيغير مجرى التاريخ واللغز للآخرين!',
      thumbnail: 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22%230f172a%22%2F%3E%3Ctext%20x%3D%22400%22%20y%3D%22300%22%20font-size%3D%22120%22%20text-anchor%3D%22middle%22%3E%E2%8F%B3%3C%2Ftext%3E%3Ctext%20x%3D%22400%22%20y%3D%22420%22%20font-family%3D%22system-ui%2C%20sans-serif%22%20font-size%3D%2260%22%20font-weight%3D%22900%22%20fill%3D%22%2322c55e%22%20text-anchor%3D%22middle%22%3ETEMPORAL%20RIFT%3C%2Ftext%3E%3C%2Fsvg%3E',
      genre: 'Co-op',
      platforms: ['browser', 'pc'],
      localUrl: '/games/temporal-rift/index.html',
      status: 'available',
      hasCustomMenu: true
    },
    {
      id: 'mindustry',
      title: 'Mindustry Simulator',
      description: 'لعبة بناء مصانع ودفاع عن الأبراج. ابنِ شبكات التوريد المعقدة لنقل الموارد إلى أبراجك الدفاعية.',
      thumbnail: 'https://images.unsplash.com/photo-1584433144859-1fc3ab64a957?q=80&w=800&auto=format&fit=crop',
      genre: 'Strategy',
      platforms: ['browser', 'android'],
      status: 'coming_soon'
    }
  ];

  getGames(): Observable<ArcadeGame[]> {
    return of(this.games);
  }

  getGameById(id: string): Observable<ArcadeGame | undefined> {
    return of(this.games.find(g => g.id === id));
  }
}
