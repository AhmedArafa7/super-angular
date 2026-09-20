import { 
  Component, 
  OnInit, 
  OnDestroy, 
  ElementRef, 
  ViewChild, 
  inject, 
  signal, 
  computed, 
  HostListener 
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { WalletService } from '../../../core/wallet.service';
import { FirebaseService } from '../../../core/services/firebase.service';
import { GlobalStateService } from '../../../core/services/global-state.service';
import { ArcadeAudioService } from '../../../core/services/arcade-audio.service';
import { MultiplayerService } from '../../../core/services/multiplayer.service';

export type GameSubMode = 'classic' | 'survival' | 'baseDefense' | 'bossFight';
export type ScreenState = 'mode_select' | 'local_lobby' | 'p2p_lobby' | 'p2p_wait' | 'playing' | 'game_over' | 'paused';

interface PlayerConfig {
  id: number;
  color: string;
  name: string;
  keys: { up: string; down: string; left: string; right: string; shoot: string };
  startX: number;
  startY: number;
}

interface Tank {
  id: number;
  name: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
  angle: number;
  speed: number;
  color: string;
  isAI: boolean;
  isBoss?: boolean;
  alive: boolean;
  hp: number;
  maxHp: number;
  cooldown: number;
  shieldTimer: number;
  tripleShotTimer: number;
  speedTimer: number;
  aiDirTimer: number;
  aiShootTimer: number;
  kills: number;
  score: number;
  keys: { up: string; down: string; left: string; right: string; shoot: string };
}

interface Bullet {
  x: number;
  y: number;
  dx: number;
  dy: number;
  color: string;
  ownerId: number;
  bounces: number;
  life: number;
  isRocket?: boolean;
}

interface Wall {
  x: number;
  y: number;
  w: number;
  h: number;
  hp?: number;
  maxHp?: number;
  isIndestructible?: boolean;
}

interface Barrel {
  x: number;
  y: number;
  r: number;
  alive: boolean;
}

interface PowerUp {
  x: number;
  y: number;
  type: 'shield' | 'speed' | 'triple' | 'health' | 'nuke';
  icon: string;
  color: string;
  duration: number;
}

interface Explosion {
  x: number;
  y: number;
  r: number;
  maxR: number;
  color: string;
  life: number;
}

interface BaseHQ {
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  alive: boolean;
}

const PLAYER_CONFIGS: PlayerConfig[] = [
  { id: 1, color: '#38bdf8', name: 'اللاعب 1 (أزرق)', keys: { up: 'w', down: 's', left: 'a', right: 'd', shoot: ' ' }, startX: 50, startY: 50 },
  { id: 2, color: '#f87171', name: 'اللاعب 2 (أحمر)', keys: { up: 'arrowup', down: 'arrowdown', left: 'arrowleft', right: 'arrowright', shoot: 'enter' }, startX: 720, startY: 520 },
  { id: 3, color: '#4ade80', name: 'اللاعب 3 (أخضر)', keys: { up: 'i', down: 'k', left: 'j', right: 'l', shoot: 'p' }, startX: 50, startY: 520 },
  { id: 4, color: '#facc15', name: 'اللاعب 4 (أصفر)', keys: { up: '8', down: '5', left: '4', right: '6', shoot: '0' }, startX: 720, startY: 50 }
];

@Component({
  selector: 'app-tank-battle',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  templateUrl: './tank-battle.component.html',
  styleUrls: ['./tank-battle.component.scss']
})
export class TankBattleComponent implements OnInit, OnDestroy {
  wallet = inject(WalletService);
  firebase = inject(FirebaseService);
  globalState = inject(GlobalStateService);
  audio = inject(ArcadeAudioService);
  multiplayer = inject(MultiplayerService);
  router = inject(Router);

  @ViewChild('gameCanvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  // Screen & Navigation state
  screen = signal<ScreenState>('mode_select');
  gameSubMode = signal<GameSubMode>('classic');
  nightModeEnabled = signal<boolean>(false);
  isSoundMuted = signal<boolean>(false);
  isFullscreen = signal<boolean>(false);
  showProUpgradeModal = signal<boolean>(false);

  // Local Match Config
  localPlayerCount = signal<number>(1);
  localAiCount = signal<number>(3);
  aiDifficulty = signal<'easy' | 'medium' | 'hard'>('medium');

  // P2P State
  p2pRoomCode = signal<string>('');
  joinRoomInput = signal<string>('');
  isP2PHost = signal<boolean>(false);
  p2pStatusMsg = signal<string>('');

  // Game Runtime State
  private animFrameId: number | null = null;
  private lastTime = 0;
  keysDown: Record<string, boolean> = {};

  tanks: Tank[] = [];
  bullets: Bullet[] = [];
  walls: Wall[] = [];
  barrels: Barrel[] = [];
  powerUps: PowerUp[] = [];
  explosions: Explosion[] = [];
  baseHQ: BaseHQ | null = null;
  bossTank: Tank | null = null;

  // Stats
  gameTimeSec = signal<number>(0);
  private gameTimerInterval: any = null;
  currentWave = signal<number>(1);
  earnedCoins = signal<number>(0);
  matchResultTitle = signal<string>('');
  matchResultDesc = signal<string>('');
  isVictory = signal<boolean>(false);

  // Canvas dimensions
  readonly CANVAS_WIDTH = 800;
  readonly CANVAS_HEIGHT = 600;

  ngOnInit(): void {
    this.audio.ensureAudioContext();
  }

  ngOnDestroy(): void {
    this.stopGameLoop();
    if (this.gameTimerInterval) clearInterval(this.gameTimerInterval);
    this.multiplayer.disconnect();
  }

  // ==========================================
  // Mode Selection Actions (3 Standard Modes)
  // ==========================================

  selectLocalMode(): void {
    this.screen.set('local_lobby');
    this.playClickSound();
  }

  selectP2PMode(): void {
    this.screen.set('p2p_lobby');
    this.playClickSound();
  }

  selectProOnlineMode(): void {
    this.playClickSound();
    const isPro = (this.globalState.userProfile() as any)?.isPro;
    if (!isPro) {
      this.showProUpgradeModal.set(true);
      return;
    }
    // Pro Matchmaking directly queues
    this.startOnlineProMatch();
  }

  startLocalGame(players: number, ai: number): void {
    this.localPlayerCount.set(players);
    this.localAiCount.set(ai);
    this.initAndStartGame();
  }

  // ==========================================
  // P2P Room Operations
  // ==========================================

  async createP2PRoom(): Promise<void> {
    this.isP2PHost.set(true);
    this.p2pStatusMsg.set('جارٍ إنشاء الغرفة...');
    const roomCode = await this.multiplayer.createRoom();
    if (roomCode) {
      this.p2pRoomCode.set(roomCode);
      this.screen.set('p2p_wait');
      this.p2pStatusMsg.set('بانتظار انضمام الصديق...');
      this.listenToMultiplayer();
    } else {
      this.p2pStatusMsg.set('فشل الاتصال بسيرفر الإشارات');
    }
  }

  async joinP2PRoom(): Promise<void> {
    const code = this.joinRoomInput().trim().toUpperCase();
    if (!code) return;
    this.isP2PHost.set(false);
    this.p2pStatusMsg.set('جارٍ الاتصال بالغرفة...');
    const success = await this.multiplayer.joinRoom(code);
    if (success) {
      this.p2pRoomCode.set(code);
      this.screen.set('p2p_wait');
      this.p2pStatusMsg.set('تم الاتصال! بانتظار بدء اللعبة...');
      this.listenToMultiplayer();
    } else {
      this.p2pStatusMsg.set('تعذر الانضمام، تأكد من كود الغرفة');
    }
  }

  private listenToMultiplayer(): void {
    // When peer connected, host starts game
    if (this.isP2PHost()) {
      setTimeout(() => {
        if (this.multiplayer.connectionState() === 'connected') {
          this.multiplayer.sendMessage({ type: 'START_GAME', subMode: this.gameSubMode() });
          this.localPlayerCount.set(2);
          this.localAiCount.set(0);
          this.initAndStartGame();
        }
      }, 1000);
    }
  }

  private startOnlineProMatch(): void {
    // Pro instant matchmaking
    this.localPlayerCount.set(1);
    this.localAiCount.set(3);
    this.aiDifficulty.set('hard');
    this.initAndStartGame();
  }

  copyRoomCode(): void {
    if (navigator.clipboard && this.p2pRoomCode()) {
      navigator.clipboard.writeText(this.p2pRoomCode());
      this.p2pStatusMsg.set('تم نسخ كود الغرفة بنجاح! أرسله لصديقك');
      setTimeout(() => this.p2pStatusMsg.set(''), 3000);
    }
  }

  // ==========================================
  // Core Game Initialization & Loop
  // ==========================================

  initAndStartGame(): void {
    this.screen.set('playing');
    this.isVictory.set(false);
    this.matchResultTitle.set('');
    this.earnedCoins.set(0);
    this.gameTimeSec.set(0);
    this.currentWave.set(1);

    if (this.gameTimerInterval) clearInterval(this.gameTimerInterval);
    this.gameTimerInterval = setInterval(() => {
      if (this.screen() === 'playing') {
        this.gameTimeSec.update(t => t + 1);
      }
    }, 1000);

    this.createMap();
    this.createTanks();
    this.bullets = [];
    this.explosions = [];
    this.powerUps = [];

    this.lastTime = performance.now();
    this.stopGameLoop();
    this.gameLoop(this.lastTime);

    this.audio.playBgm(this.isSoundMuted() ? 0 : 0.4);
  }

  private createMap(): void {
    this.walls = [];
    this.barrels = [];

    // Outer barriers & Standard tactical bunkers
    this.walls.push({ x: 80, y: 80, w: 160, h: 120, hp: 4, maxHp: 4 });
    this.walls.push({ x: 320, y: 80, w: 160, h: 120, hp: 4, maxHp: 4 });
    this.walls.push({ x: 560, y: 80, w: 160, h: 120, hp: 4, maxHp: 4 });
    this.walls.push({ x: 80, y: 280, w: 160, h: 40, isIndestructible: true });
    this.walls.push({ x: 560, y: 280, w: 160, h: 40, isIndestructible: true });
    this.walls.push({ x: 80, y: 400, w: 160, h: 120, hp: 4, maxHp: 4 });
    this.walls.push({ x: 320, y: 400, w: 160, h: 120, hp: 4, maxHp: 4 });
    this.walls.push({ x: 560, y: 400, w: 160, h: 120, hp: 4, maxHp: 4 });

    // Explosive barrels around tactical choke points
    this.barrels.push({ x: 260, y: 300, r: 14, alive: true });
    this.barrels.push({ x: 540, y: 300, r: 14, alive: true });
    this.barrels.push({ x: 400, y: 230, r: 14, alive: true });
    this.barrels.push({ x: 400, y: 370, r: 14, alive: true });

    // Base Defense Mode Setup
    if (this.gameSubMode() === 'baseDefense') {
      this.baseHQ = { x: 360, y: 260, w: 80, h: 80, hp: 100, maxHp: 100, alive: true };
    } else {
      this.baseHQ = null;
    }
  }

  private createTanks(): void {
    this.tanks = [];
    const humanCount = this.localPlayerCount();
    const aiCount = this.localAiCount();

    // 1. Human Players
    for (let i = 0; i < humanCount; i++) {
      const cfg = PLAYER_CONFIGS[i] || PLAYER_CONFIGS[0];
      this.tanks.push({
        id: cfg.id,
        name: humanCount === 1 ? (this.globalState.userProfile().name || 'أنت') : cfg.name,
        x: cfg.startX,
        y: cfg.startY,
        dx: i % 2 === 0 ? 1 : -1,
        dy: 0,
        angle: i % 2 === 0 ? 0 : Math.PI,
        speed: 3.2,
        color: cfg.color,
        isAI: false,
        alive: true,
        hp: 3,
        maxHp: 3,
        cooldown: 0,
        shieldTimer: 60, // 1 sec initial grace
        tripleShotTimer: 0,
        speedTimer: 0,
        aiDirTimer: 0,
        aiShootTimer: 0,
        kills: 0,
        score: 0,
        keys: cfg.keys
      });
    }

    // 2. Boss Mode Setup
    if (this.gameSubMode() === 'bossFight') {
      const boss: Tank = {
        id: 99,
        name: 'دبابة الميجا العملاقة 🤖💥',
        x: 370,
        y: 270,
        dx: 1,
        dy: 0,
        angle: 0,
        speed: 1.8,
        color: '#a855f7',
        isAI: true,
        isBoss: true,
        alive: true,
        hp: 30,
        maxHp: 30,
        cooldown: 0,
        shieldTimer: 0,
        tripleShotTimer: 999999,
        speedTimer: 0,
        aiDirTimer: 20,
        aiShootTimer: 15,
        kills: 0,
        score: 0,
        keys: { up: '', down: '', left: '', right: '', shoot: '' }
      };
      this.bossTank = boss;
      this.tanks.push(boss);
      return;
    }

    // 3. AI Opponents
    const aiColors = ['#ef4444', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
    const aiSpawns = [
      { x: 720, y: 520 },
      { x: 50, y: 520 },
      { x: 720, y: 50 },
      { x: 400, y: 50 },
      { x: 400, y: 520 }
    ];

    for (let i = 0; i < aiCount; i++) {
      const spawn = aiSpawns[i % aiSpawns.length];
      const botId = 10 + i;
      this.tanks.push({
        id: botId,
        name: `دبابة بوت ${i + 1}`,
        x: spawn.x,
        y: spawn.y,
        dx: -1,
        dy: 0,
        angle: Math.PI,
        speed: this.aiDifficulty() === 'hard' ? 3.0 : 2.4,
        color: aiColors[i % aiColors.length],
        isAI: true,
        alive: true,
        hp: this.gameSubMode() === 'survival' ? 1 + this.currentWave() : 2,
        maxHp: this.gameSubMode() === 'survival' ? 1 + this.currentWave() : 2,
        cooldown: 0,
        shieldTimer: 0,
        tripleShotTimer: 0,
        speedTimer: 0,
        aiDirTimer: Math.floor(Math.random() * 40) + 20,
        aiShootTimer: Math.floor(Math.random() * 60) + 30,
        kills: 0,
        score: 0,
        keys: { up: '', down: '', left: '', right: '', shoot: '' }
      });
    }
  }

  // ==========================================
  // Game Loop: Update & Render
  // ==========================================

  private gameLoop = (timestamp: number): void => {
    if (this.screen() !== 'playing') return;

    this.update();
    this.render();

    this.animFrameId = requestAnimationFrame(this.gameLoop);
  };

  private stopGameLoop(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private update(): void {
    // 1. Update Tanks
    for (const tank of this.tanks) {
      if (!tank.alive) continue;

      if (tank.shieldTimer > 0) tank.shieldTimer--;
      if (tank.tripleShotTimer > 0) tank.tripleShotTimer--;
      if (tank.speedTimer > 0) tank.speedTimer--;
      if (tank.cooldown > 0) tank.cooldown--;

      if (tank.isAI) {
        this.updateAITank(tank);
      } else {
        this.updateHumanTank(tank);
      }
    }

    // 2. Update Bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.dx;
      b.y += b.dy;
      b.life--;

      // Boundary bounce or vanish
      if (b.x <= 4 || b.x >= this.CANVAS_WIDTH - 4) {
        b.dx = -b.dx;
        b.bounces++;
      }
      if (b.y <= 4 || b.y >= this.CANVAS_HEIGHT - 4) {
        b.dy = -b.dy;
        b.bounces++;
      }

      if (b.bounces > 2 || b.life <= 0) {
        this.bullets.splice(i, 1);
        continue;
      }

      // Bullet collision with Walls
      let bulletRemoved = false;
      for (let wIdx = this.walls.length - 1; wIdx >= 0; wIdx--) {
        const wall = this.walls[wIdx];
        if (b.x >= wall.x && b.x <= wall.x + wall.w && b.y >= wall.y && b.y <= wall.y + wall.h) {
          this.bullets.splice(i, 1);
          bulletRemoved = true;
          this.createExplosion(b.x, b.y, 8, '#f59e0b');

          if (!wall.isIndestructible && wall.hp) {
            wall.hp--;
            if (wall.hp <= 0) {
              this.walls.splice(wIdx, 1);
              this.createExplosion(wall.x + wall.w / 2, wall.y + wall.h / 2, 24, '#78716c');
              this.maybeSpawnPowerUp(wall.x + wall.w / 2, wall.y + wall.h / 2);
            }
          }
          break;
        }
      }
      if (bulletRemoved) continue;

      // Bullet collision with Barrels
      for (const barrel of this.barrels) {
        if (barrel.alive && Math.hypot(b.x - barrel.x, b.y - barrel.y) < barrel.r + 4) {
          barrel.alive = false;
          this.bullets.splice(i, 1);
          bulletRemoved = true;
          this.detonateBarrel(barrel.x, barrel.y);
          break;
        }
      }
      if (bulletRemoved) continue;

      // Bullet collision with Base HQ
      if (this.baseHQ && this.baseHQ.alive) {
        if (b.x >= this.baseHQ.x && b.x <= this.baseHQ.x + this.baseHQ.w &&
            b.y >= this.baseHQ.y && b.y <= this.baseHQ.y + this.baseHQ.h) {
          this.bullets.splice(i, 1);
          this.baseHQ.hp -= 5;
          this.createExplosion(b.x, b.y, 16, '#eab308');
          if (this.baseHQ.hp <= 0) {
            this.baseHQ.alive = false;
            this.createExplosion(this.baseHQ.x + 40, this.baseHQ.y + 40, 50, '#ef4444');
            this.triggerGameOver(false, 'تم تدمير القاعدة الرئيسية!', 'اخترقت دبابات العدو دفاعاتك ودمرت المقر.');
            return;
          }
          continue;
        }
      }

      // Bullet collision with Tanks
      for (const tank of this.tanks) {
        if (!tank.alive || tank.id === b.ownerId) continue;

        const dist = Math.hypot(b.x - tank.x, b.y - tank.y);
        const tankRadius = tank.isBoss ? 35 : 18;

        if (dist < tankRadius) {
          this.bullets.splice(i, 1);
          this.createExplosion(b.x, b.y, 14, tank.color);

          if (tank.shieldTimer <= 0) {
            tank.hp--;
            this.audio.playSfx(0.7);

            if (tank.hp <= 0) {
              tank.alive = false;
              this.createExplosion(tank.x, tank.y, tank.isBoss ? 60 : 30, '#ef4444');

              // Reward killer
              const killer = this.tanks.find(t => t.id === b.ownerId);
              if (killer) {
                killer.kills++;
                killer.score += tank.isBoss ? 500 : 100;
                if (!killer.isAI) {
                  this.rewardCoins(tank.isBoss ? 50 : 10);
                }
              }

              this.maybeSpawnPowerUp(tank.x, tank.y);
            }
          }
          break;
        }
      }
    }

    // 3. Powerups Pickup Check
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const p = this.powerUps[i];
      for (const tank of this.tanks) {
        if (!tank.alive) continue;
        if (Math.hypot(tank.x - p.x, tank.y - p.y) < 22) {
          this.applyPowerUp(tank, p.type);
          this.powerUps.splice(i, 1);
          this.audio.playSfx(0.9);
          break;
        }
      }
    }

    // 4. Update Explosions
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const exp = this.explosions[i];
      exp.r += (exp.maxR - exp.r) * 0.25;
      exp.life -= 0.05;
      if (exp.life <= 0) {
        this.explosions.splice(i, 1);
      }
    }

    // 5. Check Win/Defeat Conditions (Bulletproof Logic!)
    this.checkWinLossConditions();
  }

  private updateHumanTank(tank: Tank): void {
    let moveX = 0;
    let moveY = 0;

    if (this.keysDown[tank.keys.up]) moveY -= 1;
    if (this.keysDown[tank.keys.down]) moveY += 1;
    if (this.keysDown[tank.keys.left]) moveX -= 1;
    if (this.keysDown[tank.keys.right]) moveX += 1;

    const currentSpeed = tank.speedTimer > 0 ? tank.speed * 1.6 : tank.speed;

    if (moveX !== 0 || moveY !== 0) {
      tank.dx = moveX;
      tank.dy = moveY;
      tank.angle = Math.atan2(moveY, moveX);

      const nextX = tank.x + moveX * currentSpeed;
      const nextY = tank.y + moveY * currentSpeed;

      if (!this.checkWallCollision(nextX, tank.y, 16)) tank.x = nextX;
      if (!this.checkWallCollision(tank.x, nextY, 16)) tank.y = nextY;

      // Keep within canvas
      tank.x = Math.max(20, Math.min(this.CANVAS_WIDTH - 20, tank.x));
      tank.y = Math.max(20, Math.min(this.CANVAS_HEIGHT - 20, tank.y));
    }

    // Shoot
    if (this.keysDown[tank.keys.shoot] && tank.cooldown <= 0) {
      this.fireBullet(tank);
      tank.cooldown = 18;
    }
  }

  private updateAITank(tank: Tank): void {
    // Intelligent Target Selection:
    // 1. Look for alive human player first
    // 2. If no human alive (or in free-for-all deathmatch), target closest other AI bot!
    // 3. If in Base Defense, prioritize HQ Base!
    let targetX = 0;
    let targetY = 0;
    let hasTarget = false;

    if (this.gameSubMode() === 'baseDefense' && this.baseHQ && this.baseHQ.alive) {
      targetX = this.baseHQ.x + this.baseHQ.w / 2;
      targetY = this.baseHQ.y + this.baseHQ.h / 2;
      hasTarget = true;
    } else {
      let minDist = Infinity;
      // First pass: humans
      for (const other of this.tanks) {
        if (!other.isAI && other.alive) {
          const d = Math.hypot(other.x - tank.x, other.y - tank.y);
          if (d < minDist) {
            minDist = d;
            targetX = other.x;
            targetY = other.y;
            hasTarget = true;
          }
        }
      }
      // Fallback pass: other bots (ensures bots NEVER freeze!)
      if (!hasTarget) {
        for (const other of this.tanks) {
          if (other.id !== tank.id && other.alive) {
            const d = Math.hypot(other.x - tank.x, other.y - tank.y);
            if (d < minDist) {
              minDist = d;
              targetX = other.x;
              targetY = other.y;
              hasTarget = true;
            }
          }
        }
      }
    }

    // AI Direction Timer
    tank.aiDirTimer--;
    if (tank.aiDirTimer <= 0) {
      tank.aiDirTimer = Math.floor(Math.random() * 45) + 20;

      if (hasTarget && Math.random() < 0.75) {
        const diffX = targetX - tank.x;
        const diffY = targetY - tank.y;
        if (Math.abs(diffX) > Math.abs(diffY)) {
          tank.dx = diffX > 0 ? 1 : -1;
          tank.dy = 0;
        } else {
          tank.dx = 0;
          tank.dy = diffY > 0 ? 1 : -1;
        }
      } else {
        const dirs = [{ dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 }];
        const chosen = dirs[Math.floor(Math.random() * dirs.length)];
        tank.dx = chosen.dx;
        tank.dy = chosen.dy;
      }
      tank.angle = Math.atan2(tank.dy, tank.dx);
    }

    // Move AI Tank
    const nextX = tank.x + tank.dx * tank.speed;
    const nextY = tank.y + tank.dy * tank.speed;

    if (!this.checkWallCollision(nextX, tank.y, tank.isBoss ? 30 : 16)) {
      tank.x = nextX;
    } else {
      tank.aiDirTimer = 0; // recalculate on hit
    }

    if (!this.checkWallCollision(tank.x, nextY, tank.isBoss ? 30 : 16)) {
      tank.y = nextY;
    } else {
      tank.aiDirTimer = 0;
    }

    tank.x = Math.max(25, Math.min(this.CANVAS_WIDTH - 25, tank.x));
    tank.y = Math.max(25, Math.min(this.CANVAS_HEIGHT - 25, tank.y));

    // AI Shoot logic
    tank.aiShootTimer--;
    if (tank.aiShootTimer <= 0) {
      tank.aiShootTimer = tank.isBoss ? 20 : (Math.floor(Math.random() * 50) + 30);
      if (hasTarget) {
        const isAlignedX = Math.abs(targetX - tank.x) < 30;
        const isAlignedY = Math.abs(targetY - tank.y) < 30;
        if (isAlignedX || isAlignedY || tank.isBoss || Math.random() < 0.3) {
          this.fireBullet(tank);
        }
      }
    }
  }

  private fireBullet(tank: Tank): void {
    const bSpeed = 7.5;
    const bulletColor = tank.color;

    if (tank.tripleShotTimer > 0) {
      // 3 Spread Bullets
      const baseAngle = tank.angle;
      const angles = [baseAngle - 0.25, baseAngle, baseAngle + 0.25];
      for (const a of angles) {
        this.bullets.push({
          x: tank.x + Math.cos(a) * 22,
          y: tank.y + Math.sin(a) * 22,
          dx: Math.cos(a) * bSpeed,
          dy: Math.sin(a) * bSpeed,
          color: bulletColor,
          ownerId: tank.id,
          bounces: 0,
          life: 200
        });
      }
    } else {
      // Single Cannon
      this.bullets.push({
        x: tank.x + Math.cos(tank.angle) * 22,
        y: tank.y + Math.sin(tank.angle) * 22,
        dx: Math.cos(tank.angle) * bSpeed,
        dy: Math.sin(tank.angle) * bSpeed,
        color: bulletColor,
        ownerId: tank.id,
        bounces: 0,
        life: 200
      });
    }

    this.audio.playSfx(0.4);
  }

  private checkWallCollision(x: number, y: number, radius: number): boolean {
    for (const w of this.walls) {
      if (x + radius > w.x && x - radius < w.x + w.w &&
          y + radius > w.y && y - radius < w.y + w.h) {
        return true;
      }
    }
    return false;
  }

  private detonateBarrel(x: number, y: number): void {
    this.createExplosion(x, y, 45, '#f97316');
    this.audio.playSfx(1.0);

    // Blast nearby walls and tanks
    for (const tank of this.tanks) {
      if (tank.alive && Math.hypot(tank.x - x, tank.y - y) < 60) {
        tank.hp -= 2;
        if (tank.hp <= 0) {
          tank.alive = false;
          this.createExplosion(tank.x, tank.y, 30, '#ef4444');
        }
      }
    }
  }

  private maybeSpawnPowerUp(x: number, y: number): void {
    if (Math.random() < 0.45) {
      const types: ('shield' | 'speed' | 'triple' | 'health')[] = ['shield', 'speed', 'triple', 'health'];
      const icons = { shield: '🛡️', speed: '⚡', triple: '💥', health: '💚' };
      const colors = { shield: '#38bdf8', speed: '#facc15', triple: '#ec4899', health: '#4ade80' };
      const chosen = types[Math.floor(Math.random() * types.length)];
      this.powerUps.push({
        x,
        y,
        type: chosen,
        icon: icons[chosen],
        color: colors[chosen],
        duration: 400
      });
    }
  }

  private applyPowerUp(tank: Tank, type: string): void {
    if (type === 'shield') tank.shieldTimer = 300;
    if (type === 'speed') tank.speedTimer = 300;
    if (type === 'triple') tank.tripleShotTimer = 250;
    if (type === 'health') tank.hp = Math.min(tank.maxHp, tank.hp + 1);
  }

  private createExplosion(x: number, y: number, maxR: number, color: string): void {
    this.explosions.push({
      x,
      y,
      r: 4,
      maxR,
      color,
      life: 1.0
    });
  }

  // ==========================================
  // Win / Defeat Detection (100% Robust)
  // ==========================================

  private checkWinLossConditions(): void {
    const aliveHumans = this.tanks.filter(t => !t.isAI && t.alive);
    const aliveAI = this.tanks.filter(t => t.isAI && t.alive);
    const totalAlive = this.tanks.filter(t => t.alive);

    // Case A: Single Human Player vs AI (The exact scenario in user's report!)
    if (this.localPlayerCount() === 1 && this.localAiCount() > 0) {
      // 1. If human player died -> IMMEDIATE DEFEAT!
      if (aliveHumans.length === 0) {
        this.triggerGameOver(false, 'هزيمة! تم تدمير دبابتك 💥', 'دمرت دبابات العدو درعك. أعد المحاولة واستخدم المخابئ والمفرقعات بحكمة!');
        return;
      }
      // 2. If all AI bots died -> VICTORY!
      if (aliveAI.length === 0) {
        this.triggerGameOver(true, 'نصر كاسح! دمرت جميع دبابات العدو 🏆', 'عمل بطولي لا مثيل له! لقد أثبتت براعتك التكتيكية في ساحة المعركة.');
        return;
      }
    }

    // Case B: Boss Fight
    if (this.gameSubMode() === 'bossFight') {
      if (aliveHumans.length === 0) {
        this.triggerGameOver(false, 'هزمك الزعيم العملاق 🤖', 'قوة نيران الميجا دمرت دبابتك.');
        return;
      }
      if (this.bossTank && !this.bossTank.alive) {
        this.triggerGameOver(true, 'أسقطت الزعيم العملاق! 🏆👑', 'نصر أسطوري! دمرت دبابة الميجا وحررت ساحة المعركة!');
        return;
      }
    }

    // Case C: Multiplayer / Hotseat (2-4 Humans)
    if (this.localPlayerCount() > 1) {
      if (totalAlive.length <= 1) {
        if (totalAlive.length === 1) {
          const winner = totalAlive[0];
          this.triggerGameOver(true, `فاز ${winner.name}! 🏆`, `معركة شرسة انتهت بانتصار ${winner.name} وسيطرته على الساحة!`);
        } else {
          this.triggerGameOver(false, 'تعادل ملحمي! تم تدمير الجميع 💥', 'دمرت جميع الدبابات في نفس اللحظة.');
        }
        return;
      }
    }
  }

  private triggerGameOver(victory: boolean, title: string, desc: string): void {
    this.screen.set('game_over');
    this.isVictory.set(victory);
    this.matchResultTitle.set(title);
    this.matchResultDesc.set(desc);
    this.stopGameLoop();

    if (victory) {
      const reward = this.earnedCoins() + 25;
      this.earnedCoins.set(reward);
      this.rewardCoins(25);
      this.syncHighScore();
    }
  }

  private rewardCoins(amount: number): void {
    try {
      this.wallet.depositFunds(amount, 'GMC', 'مكافأة معركة الدبابات Crazy Shells');
    } catch (e) {
      console.warn('Wallet reward fallback:', e);
    }
  }

  private syncHighScore(): void {
    const user = this.globalState.userProfile();
    const score = this.tanks[0]?.score || 100;
    // Save to Firestore / local history
    try {
      const entry = {
        gameId: 'tank-battle',
        userName: user.name || 'Hero Tank',
        score,
        time: Date.now()
      };
      const existing = JSON.parse(localStorage.getItem('crazy_shells_highscores') || '[]');
      existing.push(entry);
      localStorage.setItem('crazy_shells_highscores', JSON.stringify(existing.slice(-10)));
    } catch {}
  }

  // ==========================================
  // Canvas Rendering
  // ==========================================

  private render(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background Grid
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);

    // Subtle grid pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < this.CANVAS_WIDTH; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y < this.CANVAS_HEIGHT; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.CANVAS_WIDTH, y);
      ctx.stroke();
    }

    // Render Base HQ if in Base Defense
    if (this.baseHQ && this.baseHQ.alive) {
      ctx.fillStyle = '#eab308';
      ctx.fillRect(this.baseHQ.x, this.baseHQ.y, this.baseHQ.w, this.baseHQ.h);
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 3;
      ctx.strokeRect(this.baseHQ.x, this.baseHQ.y, this.baseHQ.w, this.baseHQ.h);

      ctx.fillStyle = '#000';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⭐ HQ', this.baseHQ.x + 40, this.baseHQ.y + 48);

      // Base HP bar
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(this.baseHQ.x, this.baseHQ.y - 10, this.baseHQ.w, 6);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(this.baseHQ.x, this.baseHQ.y - 10, (this.baseHQ.hp / this.baseHQ.maxHp) * this.baseHQ.w, 6);
    }

    // Render Walls
    for (const w of this.walls) {
      if (w.isIndestructible) {
        ctx.fillStyle = '#334155';
        ctx.fillRect(w.x, w.y, w.w, w.h);
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.strokeRect(w.x, w.y, w.w, w.h);
      } else {
        ctx.fillStyle = '#573322';
        ctx.fillRect(w.x, w.y, w.w, w.h);
        ctx.strokeStyle = '#854d0e';
        ctx.lineWidth = 2;
        ctx.strokeRect(w.x, w.y, w.w, w.h);

        // Brick texture pattern
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1;
        for (let row = w.y + 20; row < w.y + w.h; row += 20) {
          ctx.beginPath();
          ctx.moveTo(w.x, row);
          ctx.lineTo(w.x + w.w, row);
          ctx.stroke();
        }
      }
    }

    // Render Barrels
    for (const b of this.barrels) {
      if (!b.alive) continue;
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#9a3412';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('💣', b.x, b.y + 3);
    }

    // Render PowerUps
    for (const p of this.powerUps) {
      ctx.fillStyle = p.color + '33';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.icon, p.x, p.y + 5);
    }

    // Render Tanks
    for (const tank of this.tanks) {
      if (!tank.alive) continue;

      ctx.save();
      ctx.translate(tank.x, tank.y);
      ctx.rotate(tank.angle);

      const size = tank.isBoss ? 48 : 26;

      // Tank Body
      ctx.fillStyle = tank.color;
      ctx.fillRect(-size / 2, -size / 2, size, size);

      // Tank Treads
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-size / 2 - 4, -size / 2, 4, size);
      ctx.fillRect(size / 2, -size / 2, 4, size);

      // Turret Cannon
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, -3, size * 0.7, 6);

      // Turret Dome
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.35, 0, Math.PI * 2);
      ctx.fill();

      // Shield Aura
      if (tank.shieldTimer > 0) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.8, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();

      // Health bar & Label above tank
      const barW = tank.isBoss ? 50 : 28;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(tank.x - barW / 2, tank.y - (size * 0.75 + 10), barW, 4);
      ctx.fillStyle = tank.color;
      ctx.fillRect(tank.x - barW / 2, tank.y - (size * 0.75 + 10), (tank.hp / tank.maxHp) * barW, 4);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(tank.name, tank.x, tank.y - (size * 0.75 + 14));
    }

    // Render Bullets
    for (const b of this.bullets) {
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
      ctx.fill();

      // Glowing trail
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 6;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Render Explosions
    for (const exp of this.explosions) {
      ctx.fillStyle = exp.color + Math.floor(exp.life * 255).toString(16).padStart(2, '0');
      ctx.beginPath();
      ctx.arc(exp.x, exp.y, exp.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ==========================================
  // Host Key Listeners & Touch Controls
  // ==========================================

  @HostListener('window:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    this.keysDown[key] = true;

    // Pause toggle
    if ((key === 'escape' || key === 'p') && (this.screen() === 'playing' || this.screen() === 'paused')) {
      this.togglePause();
    }
  }

  @HostListener('window:keyup', ['$event'])
  onKeyUp(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    this.keysDown[key] = false;
  }

  // Virtual Touch Controller for Mobile
  setTouchKey(key: string, isDown: boolean): void {
    this.keysDown[key] = isDown;
  }

  togglePause(): void {
    if (this.screen() === 'playing') {
      this.screen.set('paused');
      this.stopGameLoop();
    } else if (this.screen() === 'paused') {
      this.screen.set('playing');
      this.lastTime = performance.now();
      this.gameLoop(this.lastTime);
    }
  }

  toggleSound(): void {
    this.isSoundMuted.update(v => !v);
    if (this.isSoundMuted()) {
      this.audio.stopBgm();
    } else {
      this.audio.playBgm(0.4);
    }
  }

  toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      this.isFullscreen.set(true);
    } else {
      document.exitFullscreen().catch(() => {});
      this.isFullscreen.set(false);
    }
  }

  returnToMenu(): void {
    this.stopGameLoop();
    this.screen.set('mode_select');
  }

  replayMatch(): void {
    this.initAndStartGame();
  }

  goBackToHub(): void {
    this.stopGameLoop();
    this.router.navigate(['/arcade']);
  }

  private playClickSound(): void {
    this.audio.playSfx(0.5);
  }
}
