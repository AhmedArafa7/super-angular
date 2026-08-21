import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { 
  LucideAngularModule, Plus, Sparkles, Gamepad2, Play, Trash2, Cpu, 
  Layers, Trophy, Users, Globe, Lock, ArrowRight, RotateCcw, Share2, 
  Eye, Sliders, CheckCircle2, AlertTriangle, Flame, Shield, HelpCircle
} from 'lucide-angular';
import { AiGameStorageService } from './services/ai-game-storage.service';
import { AiGameEngineService } from './services/ai-game-engine.service';
import { AiGameBlueprint, AiGamePlayMode } from './models/ai-game.models';
import { AiGameBriefingModalComponent } from './components/ai-game-briefing-modal/ai-game-briefing-modal.component';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-ai-games-hub',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule, AiGameBriefingModalComponent],
  templateUrl: './ai-games-hub.component.html',
  styleUrls: ['./ai-games-hub.component.scss']
})
export class AiGamesHubComponent implements OnInit {
  private storageService = inject(AiGameStorageService);
  private engineService = inject(AiGameEngineService);
  private router = inject(Router);
  private toast = inject(ToastService);

  // Icons
  Plus = Plus;
  Sparkles = Sparkles;
  Gamepad2 = Gamepad2;
  Play = Play;
  Trash2 = Trash2;
  Cpu = Cpu;
  Layers = Layers;
  Trophy = Trophy;
  Users = Users;
  Globe = Globe;
  Lock = Lock;
  ArrowRight = ArrowRight;
  RotateCcw = RotateCcw;
  Share2 = Share2;
  Eye = Eye;
  Sliders = Sliders;
  CheckCircle2 = CheckCircle2;
  AlertTriangle = AlertTriangle;
  Flame = Flame;
  Shield = Shield;
  HelpCircle = HelpCircle;

  // Signals
  games = this.storageService.games;
  isGenerating = this.engineService.isGenerating;
  currentStep = this.engineService.currentGenerationStep;
  generatingId = this.engineService.generatingGameId;

  // Briefing modal state
  selectedGameForBriefing = signal<AiGameBlueprint | null>(null);

  // Genre selection dropdown
  showGenreModal = signal<boolean>(false);
  availableGenres = this.engineService.getAvailableGenres();
  selectedGenreForCreation = signal<string>('random');

  ngOnInit(): void {
    this.storageService.loadFromStorage();
  }

  get totalMutationsCount(): number {
    return this.games().reduce((acc, g) => acc + (g.mutations?.length || 0), 0);
  }

  get totalLevelsCount(): number {
    return this.games().reduce((acc, g) => acc + (g.levels?.length || 0), 0);
  }

  openCreateModal(): void {
    this.showGenreModal.set(true);
  }

  async startCreateGame(genreChoice: string): Promise<void> {
    this.showGenreModal.set(false);
    this.toast.show('🧠 بدأ الذكاء الاصطناعي في ابتكار وتصميم عالم اللعبة بالكامل...', 'info');

    try {
      const newGame = await this.engineService.generateNewGame(genreChoice === 'random' ? undefined : genreChoice);
      this.toast.show(`✨ اكتملت اللعبة بنجاح: "${newGame.title}"! جاهزة للعب الآن.`, 'success');
    } catch (e) {
      this.toast.show('حدث خطأ أثناء توليد اللعبة، يرجى المحاولة ثانية.', 'error');
    }
  }

  openBriefing(game: AiGameBlueprint): void {
    if (game.generationStatus === 'generating') {
      this.toast.show('⏳ جاري ابتكار اللعبة وتجهيز تفاصيلها بواسطة الذكاء الاصطناعي...', 'info');
      return;
    }
    this.selectedGameForBriefing.set(game);
  }

  onPlayFromBriefing(event: { mode: AiGamePlayMode; roomCode?: string }): void {
    const g = this.selectedGameForBriefing();
    if (!g) return;

    this.selectedGameForBriefing.set(null);
    this.router.navigate(['/arcade/ai-games/play', g.id], {
      queryParams: {
        mode: event.mode,
        room: event.roomCode
      }
    });
  }

  deleteGame(event: Event, gameId: string): void {
    event.stopPropagation();
    if (confirm('هل أنت متأكد من رغبتك في حذف هذه اللعبة المولدة؟')) {
      this.storageService.deleteGame(gameId);
      this.toast.show('تم حذف اللعبة بنجاح.', 'info');
    }
  }

  shareGame(event: Event, game: AiGameBlueprint): void {
    event.stopPropagation();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      const shareUrl = `${window.location.origin}/arcade/ai-games/play/${game.id}`;
      navigator.clipboard.writeText(shareUrl);
      this.toast.show('تم نسخ رابط اللعبة للمشاركة!', 'success');
    }
  }
}
