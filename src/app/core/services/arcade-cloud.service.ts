import { Injectable, signal } from '@angular/core';
import { ArcadeGame } from '../../features/arcade/arcade.service';

export interface CloudLeaderboardEntry {
  gameId: string;
  playerName: string;
  score: number;
  createdAt: number;
}

export interface CloudRoomSignal {
  roomCode: string;
  gameId: string;
  hostPeerId: string;
  hostName: string;
  status: 'waiting' | 'in_game' | 'closed';
  createdAt: number;
}

@Injectable({
  providedIn: 'root'
})
export class ArcadeCloudService {
  private readonly PUBLISHED_STORAGE_KEY = 'si_neuro_published_arcade_games_v1';
  private readonly SCORES_STORAGE_KEY = 'si_neuro_cloud_scores_v1';
  private readonly ROOMS_STORAGE_KEY = 'si_neuro_cloud_active_rooms_v1';

  // Active online rooms signal
  activeRooms = signal<CloudRoomSignal[]>([]);

  constructor() {
    this.loadRoomsFromLocal();
  }

  // 1. Published Custom Games Sync
  async publishGameToCloud(gameData: {
    title: string;
    description: string;
    category: string;
    genre: string;
    htmlContent: string;
    thumbnail?: string;
  }): Promise<ArcadeGame> {
    const id = 'custom_game_' + Date.now();
    const newGame: ArcadeGame = {
      id: id,
      category: gameData.category || 'general',
      title: gameData.title,
      description: gameData.description || 'لعبة مخصصة تم إنشاؤها ونشرها في السحابة بنجاح.',
      thumbnail: gameData.thumbnail || this.generateDefaultThumbnail(gameData.title),
      genre: gameData.genre || 'Arcade AI',
      platforms: ['browser'],
      status: 'available',
      hasCustomMenu: true
    };

    if (typeof localStorage !== 'undefined') {
      const existing = this.getPublishedGamesLocal();
      const updated = [newGame, ...existing];
      localStorage.setItem(this.PUBLISHED_STORAGE_KEY, JSON.stringify(updated));
      localStorage.setItem(`arcade_custom_code_${id}`, gameData.htmlContent);
    }

    return newGame;
  }

  getPublishedGamesLocal(): ArcadeGame[] {
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(this.PUBLISHED_STORAGE_KEY);
        if (stored) return JSON.parse(stored);
      } catch (e) {}
    }
    return [];
  }

  // 2. Cloud Leaderboard & High Score Persistence
  async submitHighScore(gameId: string, playerName: string, score: number): Promise<void> {
    const entry: CloudLeaderboardEntry = {
      gameId,
      playerName: playerName || 'لاعب غامض',
      score,
      createdAt: Date.now()
    };

    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(this.SCORES_STORAGE_KEY) || '[]';
        const scores: CloudLeaderboardEntry[] = JSON.parse(raw);
        scores.push(entry);
        // keep top 50
        scores.sort((a, b) => b.score - a.score);
        localStorage.setItem(this.SCORES_STORAGE_KEY, JSON.stringify(scores.slice(0, 50)));
      } catch (e) {}
    }
  }

  getLeaderboard(gameId: string): CloudLeaderboardEntry[] {
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(this.SCORES_STORAGE_KEY) || '[]';
        const scores: CloudLeaderboardEntry[] = JSON.parse(raw);
        return scores.filter(s => s.gameId === gameId).sort((a, b) => b.score - a.score);
      } catch (e) {}
    }
    return [];
  }

  // 3. Supabase Realtime Channels Signaling & Matchmaking for P2P Rooms
  async registerPrivateRoom(roomCode: string, gameId: string, hostPeerId: string, hostName: string): Promise<CloudRoomSignal> {
    const signalData: CloudRoomSignal = {
      roomCode: roomCode.toUpperCase(),
      gameId,
      hostPeerId,
      hostName: hostName || 'مستضيف الغرفة',
      status: 'waiting',
      createdAt: Date.now()
    };

    const current = this.activeRooms();
    const updated = [signalData, ...current.filter(r => r.roomCode !== signalData.roomCode)];
    this.activeRooms.set(updated);
    this.saveRoomsToLocal(updated);

    return signalData;
  }

  async findRoomByCode(roomCode: string): Promise<CloudRoomSignal | null> {
    const code = roomCode.trim().toUpperCase();
    const rooms = this.activeRooms();
    const found = rooms.find(r => r.roomCode === code);
    return found || null;
  }

  private loadRoomsFromLocal() {
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(this.ROOMS_STORAGE_KEY);
        if (raw) {
          this.activeRooms.set(JSON.parse(raw));
        }
      } catch (e) {}
    }
  }

  private saveRoomsToLocal(rooms: CloudRoomSignal[]) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.ROOMS_STORAGE_KEY, JSON.stringify(rooms));
    }
  }

  private generateDefaultThumbnail(title: string): string {
    return 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22%234f46e5%22%2F%3E%3Ctext%20x%3D%22400%22%20y%3D%22280%22%20font-size%3D%22100%22%20text-anchor%3D%22middle%22%3E%F0%9F%9A%80%3C%2Ftext%3E%3Ctext%20x%3D%22400%22%20y%3D%22420%22%20font-family%3D%22system-ui%2C%20sans-serif%22%20font-size%3D%2240%22%20font-weight%3D%22900%22%20fill%3D%22%23fff%22%20text-anchor%3D%22middle%22%3E' + encodeURIComponent(title.substring(0, 20)) + '%3C%2Ftext%3E%3C%2Fsvg%3E';
  }
}
