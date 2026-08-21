import { Component, OnInit, OnDestroy, inject, signal, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { 
  LucideAngularModule, ArrowRight, Sparkles, Trophy, Clock, Zap, RotateCcw, 
  Lock, Users, Globe, Smartphone, Volume2, VolumeX, Shield, Play, Pause, 
  Flame, Sliders, CheckCircle2, ChevronRight, Share2, Layers, Cpu, Award
} from 'lucide-angular';
import { AiGameBlueprint, AiGameLevel, AiGameMutation, AiGamePlayMode } from '../../models/ai-game.models';
import { AiGameStorageService } from '../../services/ai-game-storage.service';
import { AiGameEngineService } from '../../services/ai-game-engine.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { AiEvolutionPanelComponent } from '../ai-evolution-panel/ai-evolution-panel.component';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

interface Gem {
  id: string;
  x: number;
  y: number;
  radius: number;
  hue: number;
  pulsePhase: number;
  isCollected: boolean;
}

interface Hazard {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  type: 'orb' | 'laser' | 'seeker' | 'pulsar';
  angle: number;
  speed: number;
  color: string;
}

interface Portal {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  radius: number;
  angle: number;
}

interface DilationZone {
  x: number;
  y: number;
  radius: number;
  pulse: number;
}

@Component({
  selector: 'app-ai-game-runner',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule, AiEvolutionPanelComponent],
  templateUrl: './ai-game-runner.component.html',
  styleUrls: ['./ai-game-runner.component.scss']
})
export class AiGameRunnerComponent implements OnInit, OnDestroy {
  @ViewChild('gameCanvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private storageService = inject(AiGameStorageService);
  private engineService = inject(AiGameEngineService);
  private toast = inject(ToastService);

  // Icons
  ArrowRight = ArrowRight;
  Sparkles = Sparkles;
  Trophy = Trophy;
  Clock = Clock;
  Zap = Zap;
  RotateCcw = RotateCcw;
  Lock = Lock;
  Users = Users;
  Globe = Globe;
  Volume2 = Volume2;
  VolumeX = VolumeX;
  Shield = Shield;
  Play = Play;
  Pause = Pause;
  Flame = Flame;
  Sliders = Sliders;
  CheckCircle2 = CheckCircle2;
  ChevronRight = ChevronRight;
  Share2 = Share2;
  Layers = Layers;
  Cpu = Cpu;
  Award = Award;

  // Game State Signals
  game = signal<AiGameBlueprint | null>(null);
  currentLevel = signal<AiGameLevel | null>(null);
  score = signal<number>(0);
  gemsCollected = signal<number>(0);
  gemsRequired = signal<number>(5);
  lives = signal<number>(3);
  maxLives = 3;
  isPaused = signal<boolean>(false);
  isGameOver = signal<boolean>(false);
  isLevelComplete = signal<boolean>(false);
  isSoundEnabled = signal<boolean>(true);
  showEvolutionModal = signal<boolean>(false);
  showEvolutionPanel = signal<boolean>(false);
  playMode = signal<AiGamePlayMode>('local');
  roomCode = signal<string>('');

  // Evolution Transition Banner State
  isEvolvingNextBatch = signal<boolean>(false);
  latestUnlockedMutation = signal<AiGameMutation | null>(null);

  // Canvas & Physics internals
  private ctx: CanvasRenderingContext2D | null = null;
  private animationFrameId: number | null = null;
  private lastTimestamp = 0;

  // Player Physics
  private player = {
    x: 400,
    y: 300,
    vx: 0,
    vy: 0,
    speed: 6,
    radius: 16,
    angle: 0,
    dashCooldown: 0,
    isDashing: false,
    dashDuration: 0,
    invincibleTimer: 0,
    shieldActive: true,
    trail: [] as { x: number; y: number; alpha: number }[]
  };

  // World Entities
  private gems: Gem[] = [];
  private hazards: Hazard[] = [];
  private particles: Particle[] = [];
  private portals: Portal[] = [];
  private dilationZones: DilationZone[] = [];

  // Keys Map
  private keys: { [key: string]: boolean } = {};

  // Web Audio Context Synthesizer
  private audioCtx: AudioContext | null = null;

  ngOnInit(): void {
    this.initAudioContext();
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        const found = this.storageService.getGameById(id);
        if (found) {
          this.game.set(found);
          this.initLevel(found.currentLevelIndex || 1);
        } else {
          this.router.navigate(['/arcade/ai-games']);
        }
      }
    });

    this.route.queryParamMap.subscribe(query => {
      const mode = query.get('mode') as AiGamePlayMode;
      if (mode) this.playMode.set(mode);
      const room = query.get('room');
      if (room) this.roomCode.set(room);
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.setupCanvas();
      this.startGameLoop();
    }, 100);
  }

  ngOnDestroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  private initAudioContext(): void {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    } catch (e) {}
  }

  private playSound(type: 'gem' | 'hit' | 'dash' | 'victory' | 'gameover' | 'evolve' | 'portal'): void {
    if (!this.isSoundEnabled() || !this.audioCtx) return;

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    switch (type) {
      case 'gem':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
        break;

      case 'dash':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.2);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
        break;

      case 'portal':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.25);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
        break;

      case 'hit':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(40, now + 0.25);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
        break;

      case 'victory':
        // Ascending chord
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(554.37, now + 0.1);
        osc.frequency.setValueAtTime(659.25, now + 0.2);
        osc.frequency.setValueAtTime(880, now + 0.3);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
        break;

      case 'gameover':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.5);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
        break;

      case 'evolve':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(329.63, now); // E4
        osc.frequency.exponentialRampToValueAtTime(987.77, now + 0.4); // B5
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.8);
        osc.start(now);
        osc.stop(now + 0.8);
        break;
    }
  }

  private setupCanvas(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;

    this.ctx = canvas.getContext('2d');
    this.resizeCanvas();
  }

  @HostListener('window:resize')
  resizeCanvas(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (parent) {
      canvas.width = parent.clientWidth;
      canvas.height = Math.max(500, Math.min(window.innerHeight - 180, parent.clientWidth * 0.65));
    }
  }

  // Keyboard Handlers
  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    this.keys[event.code] = true;
    if (event.code === 'Space' || event.code.startsWith('Arrow')) {
      event.preventDefault();
    }
    if (event.code === 'Space' || event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
      this.triggerDash();
    }
    if (event.code === 'KeyP') {
      this.togglePause();
    }
  }

  @HostListener('window:keyup', ['$event'])
  handleKeyUp(event: KeyboardEvent): void {
    this.keys[event.code] = false;
  }

  initLevel(levelNum: number): void {
    const currentGame = this.game();
    if (!currentGame) return;

    // Find or fallback level
    let lvl = currentGame.levels.find(l => l.levelNumber === levelNum);
    if (!lvl) {
      lvl = currentGame.levels[currentGame.levels.length - 1];
    }

    this.currentLevel.set(lvl);
    this.gemsCollected.set(0);
    this.gemsRequired.set(lvl.requiredGems || 6);
    this.isGameOver.set(false);
    this.isLevelComplete.set(false);
    this.isPaused.set(false);

    // Reset player position
    const canvas = this.canvasRef?.nativeElement;
    const w = canvas ? canvas.width : 800;
    const h = canvas ? canvas.height : 600;

    this.player.x = w / 2;
    this.player.y = h / 2;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.invincibleTimer = 60; // 1s grace period
    this.player.trail = [];

    // Spawn Gems & Hazards according to level config and active mutations
    this.spawnEntitiesForLevel(lvl, w, h);
  }

  private spawnEntitiesForLevel(lvl: AiGameLevel, w: number, h: number): void {
    this.gems = [];
    this.hazards = [];
    this.portals = [];
    this.dilationZones = [];

    const activeMutations = this.game()?.mutations.filter(m => m.isEnabled) || [];

    // 1. Gems
    const gemCount = Math.min((lvl.requiredGems || 5) + 3, 14);
    for (let i = 0; i < gemCount; i++) {
      this.gems.push({
        id: 'gem_' + i,
        x: 60 + Math.random() * (w - 120),
        y: 60 + Math.random() * (h - 120),
        radius: 11,
        hue: (lvl.themeHue + i * 25) % 360,
        pulsePhase: Math.random() * Math.PI * 2,
        isCollected: false
      });
    }

    // 2. Hazards
    const hazardCount = lvl.hazardsCount || 4;
    const baseSpeed = 2.8 * (lvl.speedMultiplier || 1);

    for (let i = 0; i < hazardCount; i++) {
      let hx = Math.random() * w;
      let hy = Math.random() * h;
      // Avoid spawning on top of player
      while (Math.hypot(hx - this.player.x, hy - this.player.y) < 140) {
        hx = Math.random() * w;
        hy = Math.random() * h;
      }

      const angle = Math.random() * Math.PI * 2;
      this.hazards.push({
        x: hx,
        y: hy,
        vx: Math.cos(angle) * baseSpeed,
        vy: Math.sin(angle) * baseSpeed,
        radius: 13 + (i % 3) * 2,
        type: i % 4 === 0 ? 'pulsar' : (i % 3 === 0 ? 'seeker' : 'orb'),
        angle: 0,
        speed: baseSpeed,
        color: i % 2 === 0 ? '#f43f5e' : '#fb923c'
      });
    }

    // 3. Portals (If Quantum Portals mutation is active)
    const hasPortals = activeMutations.some(m => m.title.includes('بوابات') || m.id.includes('portal') || m.category === 'mechanic');
    if (hasPortals && lvl.levelNumber >= 2) {
      this.portals.push({
        x1: 100 + Math.random() * 150,
        y1: 100 + Math.random() * (h - 200),
        x2: w - (100 + Math.random() * 150),
        y2: 100 + Math.random() * (h - 200),
        radius: 24,
        angle: 0
      });
    }

    // 4. Chrono Dilation Zones (If Time dilation mutation is active)
    const hasDilation = activeMutations.some(m => m.title.includes('تباطؤ') || m.id.includes('chrono') || m.category === 'environment');
    if (hasDilation && lvl.levelNumber >= 2) {
      this.dilationZones.push({
        x: w / 2 + (Math.random() - 0.5) * 200,
        y: h / 2 + (Math.random() - 0.5) * 150,
        radius: 75,
        pulse: 0
      });
    }
  }

  private startGameLoop(): void {
    const loop = (timestamp: number) => {
      if (!this.lastTimestamp) this.lastTimestamp = timestamp;
      const dt = Math.min((timestamp - this.lastTimestamp) / 1000, 0.1);
      this.lastTimestamp = timestamp;

      if (!this.isPaused() && !this.isGameOver() && !this.isLevelComplete()) {
        this.updatePhysics(dt);
      }

      this.render();

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  private updatePhysics(dt: number): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    const w = canvas.width;
    const h = canvas.height;

    // 1. Process Player Input
    let ax = 0;
    let ay = 0;

    if (this.keys['ArrowLeft'] || this.keys['KeyA']) ax -= 1;
    if (this.keys['ArrowRight'] || this.keys['KeyD']) ax += 1;
    if (this.keys['ArrowUp'] || this.keys['KeyW']) ay -= 1;
    if (this.keys['ArrowDown'] || this.keys['KeyS']) ay += 1;

    // Normalize
    if (ax !== 0 && ay !== 0) {
      ax *= 0.7071;
      ay *= 0.7071;
    }

    const currentSpeed = this.player.isDashing ? this.player.speed * 2.6 : this.player.speed;
    this.player.vx = ax * currentSpeed;
    this.player.vy = ay * currentSpeed;

    this.player.x += this.player.vx;
    this.player.y += this.player.vy;

    // Bounds clamp
    this.player.x = Math.max(this.player.radius, Math.min(w - this.player.radius, this.player.x));
    this.player.y = Math.max(this.player.radius, Math.min(h - this.player.radius, this.player.y));

    // Dash Timers
    if (this.player.dashCooldown > 0) this.player.dashCooldown--;
    if (this.player.isDashing) {
      this.player.dashDuration--;
      if (this.player.dashDuration <= 0) {
        this.player.isDashing = false;
      }
    }
    if (this.player.invincibleTimer > 0) this.player.invincibleTimer--;

    // Trail
    if (Math.hypot(this.player.vx, this.player.vy) > 0.5) {
      this.player.trail.push({ x: this.player.x, y: this.player.y, alpha: 0.7 });
      if (this.player.trail.length > 8) this.player.trail.shift();
    } else if (this.player.trail.length > 0) {
      this.player.trail.shift();
    }

    // 2. Active Mutations Checks (Superconductor Magnet pull, Portals, Chrono Zones)
    const activeMutations = this.game()?.mutations.filter(m => m.isEnabled) || [];
    const hasMagnet = activeMutations.some(m => m.title.includes('مغناطيس') || m.id.includes('magnet') || m.id.includes('mut_init'));
    const magnetRadius = hasMagnet ? 160 : 70;

    // Update Portals
    for (const portal of this.portals) {
      portal.angle += 0.04;
      const d1 = Math.hypot(this.player.x - portal.x1, this.player.y - portal.y1);
      const d2 = Math.hypot(this.player.x - portal.x2, this.player.y - portal.y2);

      if (d1 < portal.radius && !this.player.isDashing) {
        this.player.x = portal.x2 + 30;
        this.player.y = portal.y2;
        this.player.invincibleTimer = 25;
        this.playSound('portal');
        this.spawnSparks(portal.x2, portal.y2, '#38bdf8', 15);
      } else if (d2 < portal.radius && !this.player.isDashing) {
        this.player.x = portal.x1 - 30;
        this.player.y = portal.y1;
        this.player.invincibleTimer = 25;
        this.playSound('portal');
        this.spawnSparks(portal.x1, portal.y1, '#f97316', 15);
      }
    }

    // 3. Gems Collection & Magnetism
    for (const gem of this.gems) {
      if (gem.isCollected) continue;
      gem.pulsePhase += 0.06;

      const dist = Math.hypot(this.player.x - gem.x, this.player.y - gem.y);

      // Magnet pull towards player
      if (dist < magnetRadius) {
        const pullFactor = (1 - dist / magnetRadius) * 4.5;
        gem.x += ((this.player.x - gem.x) / dist) * pullFactor;
        gem.y += ((this.player.y - gem.y) / dist) * pullFactor;
      }

      // Collect Check
      if (dist < this.player.radius + gem.radius) {
        gem.isCollected = true;
        this.gemsCollected.update(c => c + 1);
        this.score.update(s => s + 150);
        this.playSound('gem');
        this.spawnSparks(gem.x, gem.y, `hsl(${gem.hue}, 90%, 65%)`, 18);

        // Respawn gem elsewhere if target not reached
        if (this.gemsCollected() < this.gemsRequired()) {
          setTimeout(() => {
            gem.x = 60 + Math.random() * (w - 120);
            gem.y = 60 + Math.random() * (h - 120);
            gem.isCollected = false;
          }, 1200);
        } else {
          // Level Completed!
          this.triggerLevelVictory();
        }
      }
    }

    // 4. Update Hazards & Dilation Zones
    for (const hazard of this.hazards) {
      let speedMult = 1.0;

      // Check if inside any Chrono Dilation Zone
      for (const zone of this.dilationZones) {
        const dZone = Math.hypot(hazard.x - zone.x, hazard.y - zone.y);
        if (dZone < zone.radius) {
          speedMult = 0.35; // 65% slowdown
        }
      }

      if (hazard.type === 'seeker') {
        const angleToPlayer = Math.atan2(this.player.y - hazard.y, this.player.x - hazard.x);
        hazard.vx += Math.cos(angleToPlayer) * 0.12 * speedMult;
        hazard.vy += Math.sin(angleToPlayer) * 0.12 * speedMult;
        // Cap max seeker speed
        const curSpd = Math.hypot(hazard.vx, hazard.vy);
        if (curSpd > hazard.speed * 1.3) {
          hazard.vx = (hazard.vx / curSpd) * hazard.speed * 1.3;
        }
      }

      hazard.x += hazard.vx * speedMult;
      hazard.y += hazard.vy * speedMult;
      hazard.angle += 0.05;

      // Bounce on screen edges
      if (hazard.x < hazard.radius) {
        hazard.x = hazard.radius;
        hazard.vx = Math.abs(hazard.vx);
      } else if (hazard.x > w - hazard.radius) {
        hazard.x = w - hazard.radius;
        hazard.vx = -Math.abs(hazard.vx);
      }

      if (hazard.y < hazard.radius) {
        hazard.y = hazard.radius;
        hazard.vy = Math.abs(hazard.vy);
      } else if (hazard.y > h - hazard.radius) {
        hazard.y = h - hazard.radius;
        hazard.vy = -Math.abs(hazard.vy);
      }

      // Check Collision with player
      const dPlayer = Math.hypot(this.player.x - hazard.x, this.player.y - hazard.y);
      if (dPlayer < this.player.radius + hazard.radius) {
        if (this.player.isDashing) {
          // Destroy / deflect hazard when dashing!
          hazard.vx = -hazard.vx * 1.4;
          hazard.vy = -hazard.vy * 1.4;
          this.score.update(s => s + 50);
          this.spawnSparks(hazard.x, hazard.y, '#38bdf8', 12);
        } else if (this.player.invincibleTimer <= 0) {
          // Take Damage
          this.takeDamage(hazard);
        }
      }
    }

    // 5. Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life++;
      p.alpha = 1 - (p.life / p.maxLife);
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }
  }

  private takeDamage(hazard: Hazard): void {
    this.lives.update(l => l - 1);
    this.player.invincibleTimer = 90; // 1.5s invincibility flash
    this.playSound('hit');
    this.spawnSparks(this.player.x, this.player.y, '#ef4444', 25);

    // Push back player
    const pushAngle = Math.atan2(this.player.y - hazard.y, this.player.x - hazard.x);
    this.player.x += Math.cos(pushAngle) * 35;
    this.player.y += Math.sin(pushAngle) * 35;

    if (this.lives() <= 0) {
      this.isGameOver.set(true);
      this.playSound('gameover');
      this.storageService.updateProgress(this.game()!.id, this.currentLevel()!.levelNumber - 1, this.score());
    }
  }

  triggerDash(): void {
    if (this.player.dashCooldown <= 0 && !this.player.isDashing) {
      this.player.isDashing = true;
      this.player.dashDuration = 14; // ~0.25s
      this.player.dashCooldown = 45; // 0.75s cooldown
      this.player.invincibleTimer = 18;
      this.playSound('dash');
      this.spawnSparks(this.player.x, this.player.y, '#38bdf8', 12);
    }
  }

  // Touch Virtual Controls
  onTouchMove(dir: 'up' | 'down' | 'left' | 'right', active: boolean): void {
    const keyMap = {
      up: 'ArrowUp',
      down: 'ArrowDown',
      left: 'ArrowLeft',
      right: 'ArrowRight'
    };
    this.keys[keyMap[dir]] = active;
  }

  private spawnSparks(x: number, y: number, color: string, count = 12): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 4,
        color,
        alpha: 1,
        life: 0,
        maxLife: 20 + Math.random() * 20
      });
    }
  }

  private triggerLevelVictory(): void {
    this.isLevelComplete.set(true);
    this.playSound('victory');
    const lvlNum = this.currentLevel()!.levelNumber;
    const currentGame = this.game()!;

    this.storageService.updateProgress(currentGame.id, lvlNum, this.score());

    // Check if this completes a 5-level batch (5, 10, 15, 20...)
    // If so, trigger the AI Evolution sequence!
    if (lvlNum % 5 === 0 && lvlNum === currentGame.levels.length) {
      this.triggerAiEvolutionSequence();
    }
  }

  async triggerAiEvolutionSequence(): Promise<void> {
    this.isEvolvingNextBatch.set(true);
    this.playSound('evolve');

    try {
      const result = await this.engineService.evolveGameNextBatch(this.game()!);
      this.game.set(result.game);
      this.latestUnlockedMutation.set(result.newMutation);
      this.showEvolutionModal.set(true);
    } catch (e) {
      console.error('Error evolving next levels:', e);
    } finally {
      this.isEvolvingNextBatch.set(false);
    }
  }

  nextLevel(): void {
    const currentLvlNum = this.currentLevel()!.levelNumber;
    const nextLvlNum = currentLvlNum + 1;
    this.showEvolutionModal.set(false);
    this.initLevel(nextLvlNum);
  }

  restartLevel(): void {
    this.lives.set(this.maxLives);
    this.initLevel(this.currentLevel()!.levelNumber);
  }

  togglePause(): void {
    this.isPaused.update(p => !p);
  }

  toggleSound(): void {
    this.isSoundEnabled.update(s => !s);
  }

  onMutationChanged(updatedGame: AiGameBlueprint): void {
    this.game.set({ ...updatedGame });
    this.toast.show('⚡ تم تطبيق إعدادات الطفرات والتراجع فوراً على محرك اللعبة!', 'info');
  }

  private render(): void {
    const ctx = this.ctx;
    const canvas = this.canvasRef?.nativeElement;
    if (!ctx || !canvas) return;

    const w = canvas.width;
    const h = canvas.height;

    // 1. Background clear with subtle deep cyber gradient
    const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, w * 0.8);
    bgGrad.addColorStop(0, '#0f172a');
    bgGrad.addColorStop(1, '#020617');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. Subtle Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // 3. Render Dilation Zones
    for (const zone of this.dilationZones) {
      zone.pulse += 0.03;
      const zGrad = ctx.createRadialGradient(zone.x, zone.y, 10, zone.x, zone.y, zone.radius);
      zGrad.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
      zGrad.addColorStop(0.8, 'rgba(16, 185, 129, 0.08)');
      zGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
      ctx.fillStyle = zGrad;
      ctx.beginPath();
      ctx.arc(zone.x, zone.y, zone.radius + Math.sin(zone.pulse) * 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
      ctx.setLineDash([6, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 4. Render Portals
    for (const portal of this.portals) {
      // Portal 1 (Blue)
      ctx.save();
      ctx.translate(portal.x1, portal.y1);
      ctx.rotate(portal.angle);
      ctx.strokeStyle = '#38bdf8';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 15;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, 0, portal.radius, portal.radius * 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Portal 2 (Orange)
      ctx.save();
      ctx.translate(portal.x2, portal.y2);
      ctx.rotate(-portal.angle);
      ctx.strokeStyle = '#f97316';
      ctx.shadowColor = '#f97316';
      ctx.shadowBlur = 15;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, 0, portal.radius, portal.radius * 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 5. Render Gems
    for (const gem of this.gems) {
      if (gem.isCollected) continue;
      const pScale = 1 + Math.sin(gem.pulsePhase) * 0.15;
      const gColor = `hsl(${gem.hue}, 95%, 60%)`;

      ctx.shadowColor = gColor;
      ctx.shadowBlur = 18;
      ctx.fillStyle = gColor;

      // Diamond Polygon
      ctx.beginPath();
      const r = gem.radius * pScale;
      ctx.moveTo(gem.x, gem.y - r * 1.3);
      ctx.lineTo(gem.x + r, gem.y);
      ctx.lineTo(gem.x, gem.y + r * 1.3);
      ctx.lineTo(gem.x - r, gem.y);
      ctx.closePath();
      ctx.fill();

      // Core Highlight
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(gem.x, gem.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 6. Render Hazards
    for (const hazard of this.hazards) {
      ctx.shadowColor = hazard.color;
      ctx.shadowBlur = 14;
      ctx.fillStyle = hazard.color;

      ctx.save();
      ctx.translate(hazard.x, hazard.y);
      ctx.rotate(hazard.angle);

      if (hazard.type === 'seeker') {
        // Triangle Seeker
        ctx.beginPath();
        ctx.moveTo(hazard.radius * 1.3, 0);
        ctx.lineTo(-hazard.radius * 0.8, -hazard.radius * 0.8);
        ctx.lineTo(-hazard.radius * 0.4, 0);
        ctx.lineTo(-hazard.radius * 0.8, hazard.radius * 0.8);
        ctx.closePath();
        ctx.fill();
      } else if (hazard.type === 'pulsar') {
        // Pulsar Star
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4;
          const rad = i % 2 === 0 ? hazard.radius * 1.3 : hazard.radius * 0.6;
          ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
        }
        ctx.closePath();
        ctx.fill();
      } else {
        // Smooth Orb
        ctx.beginPath();
        ctx.arc(0, 0, hazard.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 7. Render Particles
    for (const p of this.particles) {
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // 8. Render Player Trail
    for (let i = 0; i < this.player.trail.length; i++) {
      const t = this.player.trail[i];
      ctx.fillStyle = this.player.isDashing ? `rgba(56, 189, 248, ${t.alpha * 0.6})` : `rgba(99, 102, 241, ${t.alpha * 0.4})`;
      ctx.beginPath();
      ctx.arc(t.x, t.y, this.player.radius * (0.4 + (i / this.player.trail.length) * 0.6), 0, Math.PI * 2);
      ctx.fill();
    }

    // 9. Render Player
    if (this.player.invincibleTimer % 4 < 2) {
      const pColor = this.player.isDashing ? '#38bdf8' : '#818cf8';
      ctx.shadowColor = pColor;
      ctx.shadowBlur = this.player.isDashing ? 30 : 20;

      // Outer Glow Core
      ctx.fillStyle = pColor;
      ctx.beginPath();
      ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2);
      ctx.fill();

      // Inner Core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(this.player.x, this.player.y, this.player.radius * 0.5, 0, Math.PI * 2);
      ctx.fill();

      // Protective Ring Shield
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.player.x, this.player.y, this.player.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Reset Shadows
    ctx.shadowBlur = 0;
  }
}
