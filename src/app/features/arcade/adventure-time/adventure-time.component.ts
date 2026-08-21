import { Component, signal, ElementRef, ViewChild, AfterViewInit, OnDestroy, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule, ArrowRight, Sword, Map, Users, Play, Heart, RotateCcw, Skull } from 'lucide-angular';

interface Enemy {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  radius: number;
  flash: number;
  attackTimer: number;
  changeTimer: number;
}

interface HeartPickup {
  x: number;
  y: number;
  radius: number;
  bob: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

@Component({
  selector: 'app-adventure-time',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="min-h-screen bg-slate-950 text-white p-4 md:p-6 font-sans" dir="rtl">
      <!-- Header -->
      <div class="max-w-5xl mx-auto flex items-center justify-between mb-6 border-b border-white/10 pb-4">
        <button (click)="goBack()" class="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl text-sm font-bold transition-all">
          <lucide-icon [img]="ArrowRight" class="w-4 h-4"></lucide-icon> العودة
        </button>
        <h1 class="text-xl font-black flex items-center gap-2 text-amber-400">
          <lucide-icon [img]="Sword" class="w-6 h-6 text-fuchsia-400"></lucide-icon> Loot & Scoot 🗡️💎
        </h1>
      </div>

      <!-- Menu Screen -->
      <div *ngIf="mode() === 'menu'" class="max-w-5xl mx-auto">
        <div class="relative rounded-[2rem] overflow-hidden border border-fuchsia-500/30 shadow-2xl mb-10">
          <div class="h-[340px] bg-gradient-to-b from-purple-900/90 via-fuchsia-950/70 to-slate-950 flex items-center justify-center relative overflow-hidden">
            <div class="absolute inset-0 opacity-40" style="background: radial-gradient(circle at 75% 25%, #f59e0b 0 70px, transparent 70px), radial-gradient(circle at 20% 80%, #a855f7 0 200px, transparent 200px), radial-gradient(circle at 85% 70%, #ec4899 0 260px, transparent 260px);"></div>
            <div class="text-center z-10 px-6">
              <div class="text-6xl mb-3 animate-bounce">🗡️💰🏃‍♂️</div>
              <h2 class="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-fuchsia-300 to-emerald-300 drop-shadow-lg">Loot & Scoot</h2>
              <p class="mt-3 text-slate-200 font-bold drop-shadow">اجمع الغنائم الساحرة، اضرب الوحوش بالسيف، واهرب بالكنوز قبل فوات الأوان!</p>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div class="bg-slate-900/90 rounded-3xl p-6 border border-fuchsia-500/20 hover:border-fuchsia-500/50 transition-all">
            <div class="w-12 h-12 rounded-2xl bg-fuchsia-500/20 border border-fuchsia-500/40 flex items-center justify-center text-fuchsia-400 mb-4">
              <lucide-icon [img]="Sword" class="w-6 h-6"></lucide-icon>
            </div>
            <h3 class="text-lg font-black mb-2 text-white">القتال والدفاع</h3>
            <p class="text-sm text-slate-400 leading-relaxed">اضرب الوحوش بسيفك السحري، اقضِ على الأعداء ودافع عن نفسك للنجاة داخل الحصن.</p>
          </div>
          <div class="bg-slate-900/90 rounded-3xl p-6 border border-amber-500/20 hover:border-amber-500/50 transition-all">
            <div class="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-4">
              <lucide-icon [img]="Map" class="w-6 h-6"></lucide-icon>
            </div>
            <h3 class="text-lg font-black mb-2 text-white">جمع الغنائم والكنوز</h3>
            <p class="text-sm text-slate-400 leading-relaxed">استكشف الدهاليز المظلمة، اجمع الجواهر والذهب والقلوب لاستعادة طاقتك والصمود لأطول وقت.</p>
          </div>
          <div class="bg-slate-900/90 rounded-3xl p-6 border border-emerald-500/20 hover:border-emerald-500/50 transition-all">
            <div class="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-4">
              <lucide-icon [img]="Users" class="w-6 h-6"></lucide-icon>
            </div>
            <h3 class="text-lg font-black mb-2 text-white">الهروب السريع</h3>
            <p class="text-sm text-slate-400 leading-relaxed">اجمع كل ما تستطيع من الـ Loot واهرب بسرعة (Scoot) محققاً أعلى رقم قياسي بين أصدقائك!</p>
          </div>
        </div>

        <div class="bg-black/30 border border-white/5 rounded-3xl p-6 mb-8 text-sm text-slate-300">
          <h4 class="font-black text-white mb-3 flex items-center gap-2">🎮 طريقة اللعب (نسخة تجريبية)</h4>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div class="bg-white/5 rounded-2xl p-4 text-center">
              <span class="text-2xl block mb-1">⌨️</span>
              <span class="font-bold">WASD / الأسهم</span>
              <p class="text-xs text-slate-400 mt-1">للحركة</p>
            </div>
            <div class="bg-white/5 rounded-2xl p-4 text-center">
              <span class="text-2xl block mb-1">⚔️</span>
              <span class="font-bold">مسافة (Space)</span>
              <p class="text-xs text-slate-400 mt-1">للضرب بالسيف</p>
            </div>
            <div class="bg-white/5 rounded-2xl p-4 text-center">
              <span class="text-2xl block mb-1">❤️</span>
              <span class="font-bold">القلوب</span>
              <p class="text-xs text-slate-400 mt-1">استعادة الصحة</p>
            </div>
          </div>
        </div>

        <div class="flex flex-col sm:flex-row items-center justify-center gap-4 pb-10">
          <button (click)="startGame()" class="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-10 py-4 rounded-2xl shadow-xl shadow-emerald-500/30 transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-3 text-lg">
            <lucide-icon [img]="Play" class="w-6 h-6"></lucide-icon> ابدأ المغامرة
          </button>
          <button (click)="play3D()" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 py-4 rounded-2xl shadow-xl shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 flex items-center gap-2">
            🌐 جرّب النسخة ثلاثية الأبعاد
          </button>
          <button (click)="goBack()" class="bg-white/10 hover:bg-white/20 text-white font-bold px-8 py-4 rounded-2xl transition-all">
            العودة للأركيد
          </button>
        </div>
      </div>

      <!-- Game Screen -->
      <div *ngIf="mode() !== 'menu'" class="max-w-5xl mx-auto">
        <!-- HUD -->
        <div class="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <div class="flex items-center gap-3">
            <div class="bg-black/30 border border-white/10 rounded-2xl px-4 py-2 flex items-center gap-2">
              <lucide-icon [img]="Heart" class="w-5 h-5 text-red-500"></lucide-icon>
              <div class="w-40 h-3 bg-slate-800 rounded-full overflow-hidden">
                <div class="h-full bg-gradient-to-r from-red-500 to-rose-400 transition-all duration-200" [style.width.%]="hp()"></div>
              </div>
              <span class="text-sm font-black">{{ hp() }}</span>
            </div>
            <div class="bg-black/30 border border-white/10 rounded-2xl px-4 py-2 flex items-center gap-2">
              <lucide-icon [img]="Skull" class="w-5 h-5 text-emerald-400"></lucide-icon>
              <span class="text-sm font-black">{{ score() }}</span>
            </div>
          </div>
          <button (click)="backToMenu()" class="bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl text-xs font-bold transition-all">
            قائمة اللعبة
          </button>
        </div>

        <!-- Canvas -->
        <div class="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-slate-900">
          <canvas #gameCanvas class="w-full block touch-none" style="aspect-ratio: 4/3; min-height: 320px;"></canvas>

          <!-- Game Over Overlay -->
          <div *ngIf="mode() === 'gameover'" class="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center">
            <div class="text-center p-8">
              <div class="text-6xl mb-4">💀</div>
              <h2 class="text-3xl font-black text-white mb-2">سقط البطل!</h2>
              <p class="text-slate-300 mb-6">نقاطك النهائية: <span class="font-black text-emerald-400">{{ score() }}</span></p>
              <div class="flex gap-3 justify-center">
                <button (click)="startGame()" class="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-3 rounded-xl flex items-center gap-2 transition-all">
                  <lucide-icon [img]="RotateCcw" class="w-5 h-5"></lucide-icon> إعادة المحاولة
                </button>
                <button (click)="backToMenu()" class="bg-white/10 hover:bg-white/20 text-white font-bold px-6 py-3 rounded-xl transition-all">
                  القائمة
                </button>
              </div>
            </div>
          </div>
        </div>

        <p class="text-center text-xs text-slate-500 mt-3">تلميح: اضغط <span class="font-bold text-slate-300">WASD</span> أو <span class="font-bold text-slate-300">الأسهم</span> للحركة و <span class="font-bold text-slate-300">Space</span> للضرب. لا تدع الغوغاء يحيطون بك!</p>
      </div>
    </div>
  `
})
export class AdventureTimeComponent implements AfterViewInit, OnDestroy {
  private router = inject(Router);

  @ViewChild('gameCanvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  mode = signal<'menu' | 'playing' | 'gameover'>('menu');
  hp = signal(100);
  score = signal(0);

  ArrowRight = ArrowRight; Sword = Sword; Map = Map; Users = Users; Play = Play; Heart = Heart; RotateCcw = RotateCcw; Skull = Skull;

  private ctx!: CanvasRenderingContext2D;
  private rafId = 0;
  private lastTime = 0;
  private keys = new Set<string>();

  private player = { x: 0, y: 0, radius: 16, speed: 210, facingX: 0, facingY: -1 };
  private enemies: Enemy[] = [];
  private hearts: HeartPickup[] = [];
  private particles: Particle[] = [];
  private decorations: { x: number; y: number; type: number }[] = [];

  private spawnTimer = 0;
  private heartTimer = 0;
  private attackTimer = 0;
  private attackCooldown = 0.35;
  private enemyHitCooldown = 0;
  private canvasW = 0;
  private canvasH = 0;
  private running = false;

  private keyHandler = (e: KeyboardEvent) => {
    if (this.mode() !== 'playing') return;
    const code = e.code;
    if (code === 'Space') {
      e.preventDefault();
      this.tryAttack();
      return;
    }
    this.keys.add(code);
  };

  private keyUpHandler = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  @HostListener('window:resize')
  onResize() {
    if (this.canvasRef) this.resizeCanvas();
  }

  goBack() { this.router.navigate(['/arcade']); }
  play3D() { this.router.navigate(['/arcade/adventure-time-3d']); }
  backToMenu() {
    this.stopLoop();
    this.mode.set('menu');
  }

  startGame() {
    this.resetState();
    this.mode.set('playing');
    setTimeout(() => {
      const canvas = this.canvasRef?.nativeElement;
      if (!canvas) return;
      if (!this.ctx) this.ctx = canvas.getContext('2d')!;
      this.resizeCanvas();
      this.startLoop();
    }, 0);
  }

  ngAfterViewInit() {
    const canvas = this.canvasRef?.nativeElement;
    if (canvas) {
      this.ctx = canvas.getContext('2d')!;
      this.resizeCanvas();
    }
    window.addEventListener('keydown', this.keyHandler);
    window.addEventListener('keyup', this.keyUpHandler);
  }

  ngOnDestroy() {
    this.stopLoop();
    window.removeEventListener('keydown', this.keyHandler);
    window.removeEventListener('keyup', this.keyUpHandler);
  }

  private resetState() {
    const w = this.canvasRef?.nativeElement?.clientWidth || 800;
    const h = this.canvasRef?.nativeElement?.clientHeight || 600;
    this.player.x = w / 2;
    this.player.y = h / 2;
    this.player.facingX = 0;
    this.player.facingY = -1;
    this.enemies = [];
    this.hearts = [];
    this.particles = [];
    this.decorations = [];
    this.spawnTimer = 0;
    this.heartTimer = 6;
    this.attackTimer = 0;
    this.attackCooldown = 0.35;
    this.enemyHitCooldown = 0;
    this.hp.set(100);
    this.score.set(0);
    this.keys.clear();

    const rng = this.mulberry(42);
    const count = Math.floor((w * h) / 45000);
    for (let i = 0; i < count; i++) {
      this.decorations.push({ x: rng() * w, y: rng() * h, type: Math.floor(rng() * 3) });
    }
    for (let i = 0; i < 3; i++) {
      this.spawnEnemy();
    }
  }

  private mulberry(seed: number) {
    let a = seed;
    return () => {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  private resizeCanvas() {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    this.canvasW = Math.max(rect.width, 320);
    this.canvasH = Math.max(rect.height, 240);
    canvas.width = this.canvasW;
    canvas.height = this.canvasH;
    if (this.mode() !== 'playing') return;
    this.player.x = Math.min(Math.max(this.player.x, 24), this.canvasW - 24);
    this.player.y = Math.min(Math.max(this.player.y, 24), this.canvasH - 24);
  }

  private startLoop() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    const loop = (t: number) => {
      const dt = Math.min((t - this.lastTime) / 1000, 0.05);
      this.lastTime = t;
      if (this.mode() === 'playing') this.update(dt);
      this.render();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private stopLoop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  }

  private tryAttack() {
    if (this.attackTimer > 0) return;
    this.attackTimer = 0.18;
    this.attackCooldown = 0.35;

    for (const e of this.enemies) {
      const dx = e.x - this.player.x;
      const dy = e.y - this.player.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 85) {
        const dot = (dx / (dist || 1)) * this.player.facingX + (dy / (dist || 1)) * this.player.facingY;
        if (dot > -0.2) {
          e.hp -= 1;
          e.flash = 0.12;
          if (e.hp <= 0) {
            this.killEnemy(e);
          }
        }
      }
    }
  }

  private killEnemy(e: Enemy) {
    this.enemies = this.enemies.filter(en => en !== e);
    this.score.update(s => s + 10);
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 120;
      this.particles.push({
        x: e.x, y: e.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.4,
        color: Math.random() > 0.5 ? '#4ade80' : '#a7f3d0'
      });
    }
  }

  private spawnEnemy() {
    const w = this.canvasW;
    const h = this.canvasH;
    let x = 0, y = 0;
    for (let i = 0; i < 20; i++) {
      x = 30 + Math.random() * (w - 60);
      y = 30 + Math.random() * (h - 60);
      if (Math.hypot(x - this.player.x, y - this.player.y) > 150) break;
    }
    this.enemies.push({
      x, y,
      vx: (Math.random() - 0.5) * 60,
      vy: (Math.random() - 0.5) * 60,
      hp: 1,
      radius: 15,
      flash: 0,
      attackTimer: 0,
      changeTimer: Math.random() * 2
    });
  }

  private spawnHeart() {
    this.hearts.push({
      x: 30 + Math.random() * (this.canvasW - 60),
      y: 30 + Math.random() * (this.canvasH - 60),
      radius: 14,
      bob: Math.random() * Math.PI * 2
    });
  }

  private update(dt: number) {
    this.attackTimer = Math.max(0, this.attackTimer - dt);
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.enemyHitCooldown = Math.max(0, this.enemyHitCooldown - dt);

    // Player movement
    let dx = 0, dy = 0;
    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) dx -= 1;
    if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) dx += 1;
    if (this.keys.has('ArrowUp') || this.keys.has('KeyW')) dy -= 1;
    if (this.keys.has('ArrowDown') || this.keys.has('KeyS')) dy += 1;

    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      this.player.x += (dx / len) * this.player.speed * dt;
      this.player.y += (dy / len) * this.player.speed * dt;
      this.player.facingX = dx / len;
      this.player.facingY = dy / len;
    }

    this.player.x = Math.min(Math.max(this.player.x, 20), this.canvasW - 20);
    this.player.y = Math.min(Math.max(this.player.y, 20), this.canvasH - 20);

    // Spawn enemies
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.enemies.length < 8) {
      this.spawnEnemy();
      this.spawnTimer = 1.4;
    }

    // Spawn hearts
    this.heartTimer -= dt;
    if (this.heartTimer <= 0 && this.hp() < 80) {
      this.spawnHeart();
      this.heartTimer = 7;
    }

    // Enemies
    for (const e of this.enemies) {
      e.changeTimer -= dt;
      if (e.changeTimer <= 0) {
        e.changeTimer = 1 + Math.random() * 2;
        e.vx = (Math.random() - 0.5) * 90;
        e.vy = (Math.random() - 0.5) * 90;
      }
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      if (e.x < 18 || e.x > this.canvasW - 18) e.vx *= -1;
      if (e.y < 18 || e.y > this.canvasH - 18) e.vy *= -1;
      e.x = Math.min(Math.max(e.x, 18), this.canvasW - 18);
      e.y = Math.min(Math.max(e.y, 18), this.canvasH - 18);
      e.flash = Math.max(0, e.flash - dt);

      // Chase & damage player
      const dist = Math.hypot(e.x - this.player.x, e.y - this.player.y);
      if (dist < 180 && dist > 24) {
        e.x -= ((e.x - this.player.x) / dist) * 40 * dt;
        e.y -= ((e.y - this.player.y) / dist) * 40 * dt;
      }
      e.attackTimer -= dt;
      if (dist < this.player.radius + e.radius && e.attackTimer <= 0 && this.enemyHitCooldown <= 0) {
        e.attackTimer = 0.8;
        this.enemyHitCooldown = 0.6;
        this.hp.update(h => Math.max(0, h - 15));
        if (this.hp() <= 0) {
          this.mode.set('gameover');
          return;
        }
      }
    }

    // Hearts
    for (const heart of this.hearts) {
      heart.bob += dt * 3;
      const dist = Math.hypot(heart.x - this.player.x, heart.y - this.player.y);
      if (dist < this.player.radius + heart.radius) {
        this.hearts = this.hearts.filter(h => h !== heart);
        this.hp.update(h => Math.min(100, h + 25));
      }
    }

    // Particles
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.life -= dt;
    }
    this.particles = this.particles.filter(p => p.life > 0);
  }

  private render() {
    const ctx = this.ctx;
    const w = this.canvasW;
    const h = this.canvasH;
    if (!ctx || !w || !h) return;

    // Sky/land gradient
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#2563eb');
    bg.addColorStop(0.4, '#4ade80');
    bg.addColorStop(1, '#166534');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Ground grid
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    const grid = 48;
    ctx.beginPath();
    for (let x = 0; x <= w; x += grid) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
    for (let y = 0; y <= h; y += grid) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
    ctx.stroke();

    // Decorations (trees/rocks/flowers)
    for (const d of this.decorations) {
      if (d.type === 0) {
        ctx.fillStyle = '#8b5e3c';
        ctx.fillRect(d.x - 4, d.y - 4, 8, 14);
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(d.x, d.y - 10, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#16a34a';
        ctx.beginPath();
        ctx.arc(d.x - 6, d.y - 12, 8, 0, Math.PI * 2);
        ctx.fill();
      } else if (d.type === 1) {
        ctx.fillStyle = '#9ca3af';
        ctx.beginPath();
        ctx.ellipse(d.x, d.y, 12, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#d1d5db';
        ctx.beginPath();
        ctx.ellipse(d.x - 3, d.y - 4, 5, 4, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        for (let i = 0; i < 5; i++) {
          const px = d.x + Math.cos(i * 1.25) * 6;
          const py = d.y + Math.sin(i * 1.25) * 6;
          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(d.x, d.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Hearts
    for (const heart of this.hearts) {
      const bobY = Math.sin(heart.bob) * 4;
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(heart.x - 7, heart.y + bobY, 7, 0, Math.PI * 2);
      ctx.arc(heart.x + 7, heart.y + bobY, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(heart.x - 14, heart.y + bobY + 2);
      ctx.lineTo(heart.x, heart.y + bobY + 14);
      ctx.lineTo(heart.x + 14, heart.y + bobY + 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fecaca';
      ctx.beginPath();
      ctx.arc(heart.x - 3, heart.y + bobY - 1, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Enemies
    for (const e of this.enemies) {
      const color = e.flash > 0 ? '#ffffff' : '#4ade80';
      ctx.fillStyle = '#166534';
      ctx.beginPath();
      ctx.ellipse(e.x, e.y + 4, e.radius, e.radius * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(e.x, e.y, e.radius, e.radius * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(e.x - 5, e.y - 3, 3, 0, Math.PI * 2);
      ctx.arc(e.x + 5, e.y - 3, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#052e16';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(e.x, e.y + 3, 4, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }

    // Sword swing
    if (this.attackTimer > 0) {
      const base = Math.atan2(this.player.facingY, this.player.facingX);
      const progress = 1 - this.attackTimer / 0.18;
      const start = base - 1.2;
      const sweep = progress * 2.4;
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(this.player.x, this.player.y, 60, start, start + sweep);
      ctx.stroke();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.player.x, this.player.y, 60, start, start + sweep);
      ctx.stroke();
    }

    // Particles
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / 0.7);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Player (Finn)
    const px = this.player.x;
    const py = this.player.y;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(px, py + 12, 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    // Body (blue shirt)
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(px, py, this.player.radius, 0, Math.PI * 2);
    ctx.fill();
    // Head
    ctx.fillStyle = '#fcd9b8';
    ctx.beginPath();
    ctx.arc(px, py - 4, 11, 0, Math.PI * 2);
    ctx.fill();
    // White bear hat
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(px, py - 9, 9, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(px - 12, py - 12, 24, 4);
    // Eyes
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(px - 4, py - 5, 1.8, 0, Math.PI * 2);
    ctx.arc(px + 4, py - 5, 1.8, 0, Math.PI * 2);
    ctx.fill();
    // Sword held in facing direction
    const swordLen = 26;
    const ex = px + this.player.facingX * swordLen;
    const ey = py + this.player.facingY * swordLen;
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(px + this.player.facingX * 8, py + this.player.facingY * 8);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex + this.player.facingX * 6, ey + this.player.facingY * 6);
    ctx.stroke();
  }
}
