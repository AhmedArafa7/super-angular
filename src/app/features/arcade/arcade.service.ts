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
}

@Injectable({
  providedIn: 'root'
})
export class ArcadeService {
  
  // Local Mock Data representing games until Firebase is integrated
  private games: ArcadeGame[] = [
    {
      id: 'tank-battle',
      title: 'Tank Battle Classic',
      description: 'لعبة حرب الدبابات الشهيرة. يمكنك اللعب مع أصدقائك في نفس الشاشة أو اللعب ضد الذكاء الاصطناعي في معارك طاحنة.',
      thumbnail: 'assets/images/tank-battle-thumb.jpg', // We can use a placeholder
      genre: 'Action',
      platforms: ['browser'],
      localUrl: '/assets/games/tank-battle/index.html',
      status: 'available'
    },
    {
      id: 'mindustry',
      title: 'Mindustry Simulator',
      description: 'لعبة بناء مصانع ودفاع عن الأبراج. ابنِ شبكات التوريد المعقدة لنقل الموارد إلى أبراجك الدفاعية.',
      thumbnail: 'assets/images/mindustry-thumb.jpg',
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
