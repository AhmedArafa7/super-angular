import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule, ArrowRight, Sword, Shield, Heart, Trophy, Zap, AlertTriangle } from 'lucide-angular';
import * as THREE from 'three';

@Component({
  selector: 'app-adventure-time-3d',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div [style.height.px]="containerHeight" class="relative w-full min-h-[480px] bg-slate-950 overflow-hidden font-sans rounded-2xl sm:rounded-3xl border border-white/10" dir="rtl">
      <!-- HUD -->
      <div class="absolute top-2 sm:top-4 inset-x-2 sm:inset-x-4 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div class="flex items-center gap-1.5 sm:gap-3 pointer-events-auto">
          <button (click)="goBack()" class="bg-black/80 hover:bg-black backdrop-blur-md border border-white/20 text-white px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 shadow-xl cursor-pointer">
            <lucide-icon [img]="ArrowRight" class="w-3.5 h-3.5 sm:w-4 sm:h-4"></lucide-icon> <span class="hidden sm:inline">العودة للأركيد</span>
          </button>
          <div class="bg-black/80 backdrop-blur-md border border-emerald-500/30 text-white px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-xl sm:rounded-2xl flex items-center gap-1.5 sm:gap-3 shadow-xl">
            <span class="text-[10px] sm:text-xs text-emerald-400 font-bold hidden sm:inline">البطل:</span>
            <span class="text-xs sm:text-sm font-black">{{ currentHero }}</span>
            <button (click)="switchHero()" class="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[9px] sm:text-[10px] font-black px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-xl sm:rounded-2xl transition-all cursor-pointer">
              تبديل 🐶/🧒
            </button>
          </div>
        </div>
        <div class="flex items-center gap-1.5 sm:gap-3 pointer-events-auto flex-wrap">
          <div class="bg-black/80 backdrop-blur-md border border-red-500/30 text-white px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-xl sm:rounded-2xl flex items-center gap-1.5 sm:gap-2 shadow-xl">
            <lucide-icon [img]="Heart" class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500"></lucide-icon>
            <div class="w-16 sm:w-28 h-2 sm:h-2.5 bg-slate-800 rounded-full overflow-hidden">
              <div class="h-full bg-gradient-to-r from-red-500 to-rose-400 transition-all duration-300" [style.width.%]="hp"></div>
            </div>
            <span class="text-[10px] sm:text-xs font-black">{{ hp }}</span>
          </div>
          <div class="bg-black/80 backdrop-blur-md border border-amber-500/30 text-white px-2 sm:px-4 py-1.5 sm:py-2.5 rounded-xl sm:rounded-2xl flex items-center gap-1 sm:gap-2 shadow-xl">
            <lucide-icon [img]="Trophy" class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400"></lucide-icon>
            <span class="text-[10px] sm:text-xs font-black">{{ score }}</span>
          </div>
          <div class="bg-black/80 backdrop-blur-md border border-cyan-500/30 text-white px-2 sm:px-4 py-1.5 sm:py-2.5 rounded-xl sm:rounded-2xl flex items-center gap-1 sm:gap-2 shadow-xl hidden sm:flex">
            <span class="text-xs text-cyan-400 font-bold">م: {{ wave }}</span>
          </div>
          <div class="bg-black/80 backdrop-blur-md border border-purple-500/30 text-white px-2 sm:px-4 py-1.5 sm:py-2.5 rounded-xl sm:rounded-2xl flex items-center gap-1 sm:gap-2 shadow-xl hidden sm:flex">
            <span class="text-xs text-purple-400 font-bold">Lvl {{ playerLevel }}</span>
          </div>
          <button (click)="saveGame()" class="bg-black/80 hover:bg-black backdrop-blur-md border border-white/20 text-white px-2 sm:px-3 py-1.5 sm:py-2.5 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-bold transition-all cursor-pointer pointer-events-auto shadow-xl">
            💾 حفظ
          </button>
        </div>
      </div>

      <!-- Level Up Banner -->
      <div *ngIf="showLevelUp" class="absolute top-20 inset-x-0 z-30 flex justify-center pointer-events-none">
        <div class="bg-gradient-to-r from-purple-600/90 to-indigo-600/90 backdrop-blur-xl border border-purple-400/50 text-white px-8 py-4 rounded-2xl shadow-2xl animate-bounce">
          <p class="text-lg font-black">🎉 المستوى {{ playerLevel }}!</p>
          <p class="text-xs text-purple-200">قوة الهجوم: {{ attackPower }}</p>
        </div>
      </div>

      <!-- 3D Canvas -->
      <div #canvasContainer class="absolute inset-0 w-full h-full z-0"></div>

      <!-- Mini-Map -->
      <canvas #miniMapCanvas class="absolute top-20 left-4 z-20 w-40 h-40 rounded-2xl border border-white/20 shadow-2xl pointer-events-none"></canvas>

      <!-- Damage Numbers Container -->
      <div class="absolute inset-0 z-10 pointer-events-none overflow-hidden">
        <div *ngFor="let dmg of damageNumbers" class="absolute font-black text-lg" [style.left.px]="dmg.x" [style.top.px]="dmg.y" [style.color]="dmg.color" [style.text-shadow]="'0 0 8px ' + dmg.color" [style.font-size.px]="dmg.size || 18">
          {{ dmg.text }}
        </div>
      </div>

      <!-- Screen Flash -->
      <div *ngIf="screenFlash" class="absolute inset-0 z-15 pointer-events-none transition-opacity duration-150" [style.background]="screenFlash" [style.opacity]="flashOpacity"></div>

      <!-- Combo -->
      <div *ngIf="combo > 1" class="absolute top-24 right-4 z-20 pointer-events-none">
        <div class="bg-gradient-to-r from-orange-500/90 to-red-500/90 backdrop-blur-sm border border-orange-300/50 text-white px-4 py-2 rounded-2xl shadow-xl animate-pulse">
          <p class="text-lg font-black">🔥 {{ combo }}x كومبو!</p>
          <p class="text-[10px] text-orange-200">+{{ comboBonus }} نقطة إضافية</p>
        </div>
      </div>

      <!-- Loading -->
      <div *ngIf="initState() === 'loading'" class="absolute inset-0 z-30 bg-slate-950/90 flex flex-col items-center justify-center gap-3">
        <div class="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin"></div>
        <p class="text-sm font-bold text-slate-300">جاري تحميل عالم أوو...</p>
      </div>

      <!-- Error -->
      <div *ngIf="initState() === 'error'" class="absolute inset-0 z-30 bg-slate-950/95 flex flex-col items-center justify-center text-center p-8">
        <div class="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-4">
          <lucide-icon [img]="AlertTriangle" class="w-8 h-8"></lucide-icon>
        </div>
        <h3 class="text-xl font-black text-white mb-2">تعذّر تشغيل النسخة ثلاثية الأبعاد</h3>
        <p class="text-sm text-slate-400 mb-6 max-w-md">{{ initErrorMsg() }}</p>
        <button (click)="play2D()" class="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-3 rounded-xl cursor-pointer">العب النسخة 2D 🎮</button>
      </div>

      <!-- Quest -->
      <div class="absolute bottom-6 right-6 z-20 max-w-sm w-full bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-2xl pointer-events-auto">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <lucide-icon [img]="Sword" class="w-5 h-5"></lucide-icon>
          </div>
          <div>
            <h3 class="text-white font-black text-sm">مهمة أرض أوو</h3>
            <span class="text-[10px] text-emerald-400 font-bold">الحالة: نشطة</span>
          </div>
        </div>
        <p class="text-xs text-slate-300 leading-relaxed mb-4">{{ currentQuest }}</p>
        <div class="flex gap-2">
          <button (click)="nextQuest()" class="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 rounded-xl transition-all cursor-pointer">المهمة التالية 📜</button>
          <button (click)="doAttack()" class="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer">
            <lucide-icon [img]="Sword" class="w-4 h-4"></lucide-icon> هجوم ⚔️
          </button>
        </div>
      </div>

      <!-- Controls (Desktop) -->
      <div class="absolute bottom-6 left-6 z-20 bg-black/80 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-white text-xs pointer-events-auto hidden md:block">
        <p class="font-bold text-amber-400 mb-1">🎮 التحكم:</p>
        <p class="text-slate-300"><span class="font-mono bg-white/10 px-1 rounded">W A S D</span> للحركة | <span class="font-mono bg-white/10 px-1 rounded">SPACE</span> للهجوم | <span class="font-mono bg-white/10 px-1 rounded">E</span> لالتقاط</p>
      </div>

      <!-- Mobile Touch Controls -->
      <div class="absolute inset-0 z-25 pointer-events-none md:hidden">
        <div class="absolute bottom-8 left-8 pointer-events-auto">
          <div #joystickBase class="w-28 h-28 rounded-full bg-white/10 border-2 border-white/20 backdrop-blur-sm flex items-center justify-center">
            <div #joystickThumb class="w-12 h-12 rounded-full bg-white/40 border border-white/30 transition-none"></div>
          </div>
        </div>
        <button (touchstart)="onTouchAttack($event)" class="absolute bottom-10 right-10 pointer-events-auto w-16 h-16 rounded-full bg-emerald-600/80 border-2 border-emerald-400/50 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform shadow-xl">
          <lucide-icon [img]="Sword" class="w-7 h-7 text-white"></lucide-icon>
        </button>
        <button (touchstart)="onTouchPickup($event)" class="absolute bottom-32 right-12 pointer-events-auto w-12 h-12 rounded-full bg-amber-600/80 border-2 border-amber-400/50 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform shadow-xl">
          <lucide-icon [img]="Heart" class="w-5 h-5 text-white"></lucide-icon>
        </button>
      </div>
    </div>
  `
})
export class AdventureTime3DComponent implements OnInit, AfterViewInit, OnDestroy {
  private router = inject(Router);
  @ViewChild('canvasContainer', { static: true }) containerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('miniMapCanvas', { static: true }) miniMapRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('joystickBase', { static: false }) joystickBaseRef!: ElementRef<HTMLDivElement>;
  @ViewChild('joystickThumb', { static: false }) joystickThumbRef!: ElementRef<HTMLDivElement>;

  ArrowRight = ArrowRight; Sword = Sword; Shield = Shield; Heart = Heart; Trophy = Trophy; Zap = Zap; AlertTriangle = AlertTriangle;

  hp = 100;
  score = 0;
  wave = 1;
  currentHero = 'فين البشري (Finn)';
  currentQuest = 'مهمة 1: اهزم زومبي السكري ودافع عن مملكة العلكة!';
  containerHeight = 600;
  initState = signal<'loading' | 'ready' | 'error'>('loading');
  initErrorMsg = signal('');
  webglStatus = signal('فحص...');
  viewDims = signal('-');
  damageNumbers: Array<{ x: number; y: number; text: string; color: string; life: number; size?: number }> = [];

  combo = 0;
  comboTimer = 0;
  comboBonus = 0;
  screenFlash = '';
  flashOpacity = 0;
  private cameraShake = 0;
  private cameraBasePos = new THREE.Vector3();
  private killCount = 0;

  private quests = [
    'مهمة 1: اهزم زومبي السكري ودافع عن مملكة العلكة!',
    'مهمة 2: توجّه لقلعة ملك الجليد واقضِ على حرسه!',
    'مهمة 3: استكشف غابة الأشجار الملعونة واجمع السيف الأحمر!',
    'مهمة 4: ادخل عالم Nightosphere والتقِ بالشياطين!'
  ];
  private questIndex = 0;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private heroMesh!: THREE.Group;
  private jakeMesh!: THREE.Group;
  private enemies: THREE.Group[] = [];
  private hearts: THREE.Mesh[] = [];
  private swordTrail: THREE.Mesh[] = [];
  private particles: THREE.Mesh[] = [];
  private clouds: THREE.Group[] = [];
  private animId = 0;
  private keys: { [key: string]: boolean } = {};
  private isJake = false;
  private initialized = false;
  private modeStopped = false;
  private audioCtx: AudioContext | null = null;
  private bossActive = false;
  private solids: Array<{ x: number; z: number; radius: number }> = [];

  private attackTimer = 0;
  private attackCooldown = 0.4;
  private spawnTimer = 0;
  private heartTimer = 8;
  private playerSpeed = 0.3;
  private lastTime = 0;
  private miniCtx!: CanvasRenderingContext2D;

  private keyListener = (e: KeyboardEvent) => { this.keys[e.code] = true; if (e.code === 'Space') this.doAttack(); };
  private keyUpListener = (e: KeyboardEvent) => { this.keys[e.code] = false; };
  private resizeListener = () => this.handleResize();
  private touchDx = 0;
  private touchDz = 0;
  private joystickActive = false;
  private joystickTouchId: number | null = null;
  private joystickCenter = { x: 0, y: 0 };
  private joystickRadius = 56;

  playerLevel = 1;
  attackPower = 35;
  showLevelUp = false;
  dayPhase = 0;
  dayPhaseLabel = 'نهار';
  dayPhaseIcon = '☀️';
  private dayNightDuration = 120;
  private sunLight!: THREE.DirectionalLight;
  private ambientLight!: THREE.AmbientLight;
  private hemiLight!: THREE.HemisphereLight;
  private leaves: THREE.Mesh[] = [];
  private butterflies: THREE.Mesh[] = [];
  private dustParticles: THREE.Mesh[] = [];
  private saveKey = 'adventure-time-3d-save';

  ngOnInit() { this.containerHeight = Math.max(480, window.innerHeight - 40); }
  goBack() { this.router.navigate(['/arcade']); }
  play2D() { this.router.navigate(['/arcade/adventure-time']); }

  private playSound(freq: number, duration: number, type: OscillatorType = 'square', vol = 0.08) {
    try {
      if (!this.audioCtx) this.audioCtx = new AudioContext();
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.frequency.value = freq;
      osc.type = type;
      gain.gain.setValueAtTime(vol, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (e) {}
  }

  private sfxAttack() { this.playSound(800, 0.1, 'sawtooth', 0.06); setTimeout(() => this.playSound(1200, 0.08, 'square', 0.04), 50); }
  private sfxHit() { this.playSound(200, 0.15, 'sine', 0.1); }
  private sfxKill() { this.playSound(300, 0.1, 'square', 0.06); setTimeout(() => this.playSound(500, 0.1, 'square', 0.05), 80); setTimeout(() => this.playSound(800, 0.15, 'sine', 0.04), 160); }
  private sfxPickup() { this.playSound(523, 0.1, 'sine', 0.07); setTimeout(() => this.playSound(659, 0.1, 'sine', 0.06), 100); setTimeout(() => this.playSound(784, 0.15, 'sine', 0.05), 200); }
  private sfxBoss() { this.playSound(80, 0.5, 'sawtooth', 0.1); setTimeout(() => this.playSound(60, 0.8, 'sine', 0.08), 200); }
  private sfxHurt() { this.playSound(150, 0.2, 'sawtooth', 0.08); }

  switchHero() {
    this.isJake = !this.isJake;
    this.currentHero = this.isJake ? 'جيك الكلب (Jake)' : 'فين البشري (Finn)';
    if (this.heroMesh) this.heroMesh.visible = !this.isJake;
    if (this.jakeMesh) this.jakeMesh.visible = this.isJake;
  }

  nextQuest() {
    this.questIndex = (this.questIndex + 1) % this.quests.length;
    this.currentQuest = this.quests[this.questIndex];
    this.score += 50;
  }

  onTouchAttack(e: TouchEvent) {
    e.preventDefault();
    this.doAttack();
  }

  onTouchPickup(e: TouchEvent) {
    e.preventDefault();
  }

  private initTouchControls() {
    const base = this.joystickBaseRef?.nativeElement;
    if (!base) return;

    base.addEventListener('touchstart', (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      this.joystickActive = true;
      this.joystickTouchId = touch.identifier;
      const rect = base.getBoundingClientRect();
      this.joystickCenter.x = rect.left + rect.width / 2;
      this.joystickCenter.y = rect.top + rect.height / 2;
      this.updateJoystick(touch.clientX, touch.clientY);
    }, { passive: false });

    const onMove = (e: TouchEvent) => {
      if (!this.joystickActive) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this.joystickTouchId) {
          this.updateJoystick(touch.clientX, touch.clientY);
          break;
        }
      }
    };

    const onEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.joystickTouchId) {
          this.joystickActive = false;
          this.joystickTouchId = null;
          this.touchDx = 0;
          this.touchDz = 0;
          const thumb = this.joystickThumbRef?.nativeElement;
          if (thumb) {
            thumb.style.transform = 'translate(0px, 0px)';
          }
          break;
        }
      }
    };

    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', onEnd);
  }

  private updateJoystick(touchX: number, touchY: number) {
    const thumb = this.joystickThumbRef?.nativeElement;
    let dx = touchX - this.joystickCenter.x;
    let dy = touchY - this.joystickCenter.y;
    const dist = Math.hypot(dx, dy);
    if (dist > this.joystickRadius) {
      dx = (dx / dist) * this.joystickRadius;
      dy = (dy / dist) * this.joystickRadius;
    }
    if (thumb) {
      thumb.style.transform = `translate(${dx}px, ${dy}px)`;
    }
    const normalizedDist = Math.min(dist, this.joystickRadius) / this.joystickRadius;
    this.touchDx = (dx / this.joystickRadius) * normalizedDist;
    this.touchDz = (dy / this.joystickRadius) * normalizedDist;
  }

  saveGame() {
    try {
      const data = { hp: this.hp, score: this.score, wave: this.wave, level: this.playerLevel, isJake: this.isJake, questIndex: this.questIndex };
      localStorage.setItem(this.saveKey, JSON.stringify(data));
      this.playSound(600, 0.08, 'sine', 0.05);
    } catch (e) {}
  }

  private loadGame() {
    try {
      const raw = localStorage.getItem(this.saveKey);
      if (!raw) return false;
      const data = JSON.parse(raw);
      this.hp = data.hp ?? 100;
      this.score = data.score ?? 0;
      this.wave = data.wave ?? 1;
      this.playerLevel = data.level ?? 1;
      this.attackPower = 30 + this.playerLevel * 5;
      this.isJake = data.isJake ?? false;
      this.questIndex = data.questIndex ?? 0;
      this.currentHero = this.isJake ? 'جيك الكلب (Jake)' : 'فين البشري (Finn)';
      this.currentQuest = this.quests[this.questIndex];
      return true;
    } catch (e) { return false; }
  }

  private checkLevelUp() {
    const threshold = this.playerLevel * 500;
    if (this.score >= threshold) {
      this.playerLevel++;
      this.attackPower += 5;
      this.showLevelUp = true;
      this.sfxLevelUp();
      setTimeout(() => { this.showLevelUp = false; }, 2500);
    }
  }

  private sfxLevelUp() {
    this.playSound(523, 0.12, 'sine', 0.08);
    setTimeout(() => this.playSound(659, 0.12, 'sine', 0.07), 120);
    setTimeout(() => this.playSound(784, 0.12, 'sine', 0.07), 240);
    setTimeout(() => this.playSound(1047, 0.2, 'sine', 0.06), 360);
  }

  private sfxLevelUpTouch() {
    this.playSound(440, 0.08, 'triangle', 0.06);
    setTimeout(() => this.playSound(554, 0.08, 'triangle', 0.05), 80);
    setTimeout(() => this.playSound(659, 0.1, 'triangle', 0.04), 160);
  }

  private sfxBird() { this.playSound(1400, 0.06, 'sine', 0.04); setTimeout(() => this.playSound(1600, 0.05, 'sine', 0.03), 60); }
  private sfxSpirit() { this.playSound(250, 0.3, 'sine', 0.06); setTimeout(() => this.playSound(300, 0.2, 'sine', 0.04), 100); }
  private sfxTank() { this.playSound(80, 0.3, 'sawtooth', 0.08); setTimeout(() => this.playSound(100, 0.2, 'square', 0.05), 150); }
  private sfxDayNight() { this.playSound(440, 0.15, 'sine', 0.03); setTimeout(() => this.playSound(330, 0.2, 'sine', 0.02), 200); }

  doAttack() {
    if (this.attackTimer > 0 || this.initState() !== 'ready') return;
    this.attackTimer = this.attackCooldown;
    this.sfxAttack();

    const heroPos = this.isJake ? this.jakeMesh.position : this.heroMesh.position;

    for (const enemy of this.enemies) {
      const dist = heroPos.distanceTo(enemy.position);
      if (dist < 5) {
        const hpBar = enemy.userData['hp'] as number;
        const newHp = hpBar - this.attackPower;
        enemy.userData['hp'] = newHp;

        enemy.children.forEach(c => {
          if (c instanceof THREE.Mesh && c.material instanceof THREE.MeshStandardMaterial) {
            c.material.emissive.set(0xff0000);
            c.material.emissiveIntensity = 1;
            setTimeout(() => { c.material.emissiveIntensity = 0; }, 150);
          }
        });

        const dmg = newHp <= 0 ? this.attackPower * 2 : this.attackPower;
        const isCrit = Math.random() < 0.15;
        const finalDmg = isCrit ? dmg * 2 : dmg;
        const critLabel = isCrit ? '💥' : '';
        const size = isCrit ? 28 : 18;
        this.spawnDamageNumber(enemy.position, `${critLabel}${finalDmg}`, isCrit ? '#fbbf24' : '#ef4444', size);

        this.combo++;
        this.comboTimer = 2;
        this.comboBonus = Math.floor(this.combo * 2.5);
        this.score += 10 + this.comboBonus;

        if (newHp <= 0) {
          this.killEnemy(enemy);
        }
      }
    }

    this.createSwordTrail(heroPos);
  }

  ngAfterViewInit() {
    this.loadGame();
    window.addEventListener('keydown', this.keyListener);
    window.addEventListener('keyup', this.keyUpListener);
    window.addEventListener('resize', this.resizeListener);
    setTimeout(() => {
      this.initThree();
      this.initTouchControls();
    }, 100);
  }

  ngOnDestroy() {
    this.modeStopped = true;
    cancelAnimationFrame(this.animId);
    window.removeEventListener('keydown', this.keyListener);
    window.removeEventListener('keyup', this.keyUpListener);
    window.removeEventListener('resize', this.resizeListener);
    if (this.renderer) { this.renderer.dispose(); this.renderer.domElement.remove(); }
  }

  private measure() {
    const c = this.containerRef.nativeElement.getBoundingClientRect();
    let w = c.width > 0 ? c.width : window.innerWidth;
    let h = c.height > 0 ? c.height : (window.innerHeight - 40);
    if (!isFinite(w) || w <= 0) w = window.innerWidth;
    if (!isFinite(h) || h <= 0) h = Math.max(480, window.innerHeight - 40);
    return { w, h };
  }

  private handleResize() {
    if (!this.renderer) return;
    const { w, h } = this.measure();
    if (w <= 0 || h <= 0) return;
    this.viewDims.set(`${Math.round(w)}x${Math.round(h)}`);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private initThree() {
    if (this.initialized) return;
    const container = this.containerRef.nativeElement;

    const testCanvas = document.createElement('canvas');
    const gl2 = testCanvas.getContext('webgl2');
    if (!gl2) {
      this.webglStatus.set('غير مدعوم');
      this.initState.set('error');
      this.initErrorMsg.set('متصفحك لا يدعم WebGL2. فعّل تسريع العتاد أو استخدم النسخة 2D.');
      return;
    }
    this.webglStatus.set('مدعوم');

    const { w, h } = this.measure();
    if (w <= 0 || h <= 0) { this.initState.set('error'); return; }
    this.viewDims.set(`${Math.round(w)}x${Math.round(h)}`);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x87ceeb, 60, 150);

    this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 300);
    this.camera.position.set(0, 14, 22);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, canvas: testCanvas, powerPreference: 'high-performance' });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.buildScene();
    this.initialized = true;
    this.initState.set('ready');
    this.lastTime = performance.now();
    this.animate();
  }

  private buildScene() {
    this.sunLight = new THREE.DirectionalLight(0xffe4b5, 3);
    this.sunLight.position.set(30, 40, 20);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 150;
    this.sunLight.shadow.camera.left = -60;
    this.sunLight.shadow.camera.right = 60;
    this.sunLight.shadow.camera.top = 60;
    this.sunLight.shadow.camera.bottom = -60;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);

    const fillLight = new THREE.DirectionalLight(0xffa07a, 0.5);
    fillLight.position.set(-25, 18, -15);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x87ceeb, 0.3);
    rimLight.position.set(0, 10, -30);
    this.scene.add(rimLight);

    this.ambientLight = new THREE.AmbientLight(0xfff5ee, 0.6);
    this.scene.add(this.ambientLight);
    this.hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x4ade80, 0.7);
    this.scene.add(this.hemiLight);

    for (let i = 0; i < 120; i++) {
      const star = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 4, 4),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })
      );
      star.position.set(
        (Math.random() - 0.5) * 200,
        40 + Math.random() * 40,
        (Math.random() - 0.5) * 200
      );
      star.userData = { isStar: true };
      this.scene.add(star);
    }

    const groundGeo = new THREE.PlaneGeometry(200, 200, 50, 50);
    const posAttr = groundGeo.attributes['position'] as THREE.BufferAttribute;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const noise = Math.sin(x * 0.05) * Math.cos(y * 0.05) * 0.3 + Math.sin(x * 0.12 + y * 0.08) * 0.15;
      posAttr.setZ(i, noise);
    }
    groundGeo.computeVertexNormals();
    const ground = new THREE.Mesh(
      groundGeo,
      new THREE.MeshStandardMaterial({ color: 0x3daa35, roughness: 0.92, metalness: 0.02 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    for (let i = 0; i < 20; i++) {
      const tx = (Math.random() - 0.5) * 120;
      const tz = (Math.random() - 0.5) * 120;
      const t = this.createTree(tx, tz);
      this.scene.add(t);
      this.solids.push({ x: tx, z: tz, radius: 2.5 });
    }

    this.solids.push({ x: 30, z: -25, radius: 12 });

    const flowerColors = [0xff69b4, 0xff4500, 0xfbbf24, 0xc084fc, 0x38bdf8, 0xef4444];
    for (let i = 0; i < 80; i++) {
      const color = flowerColors[Math.floor(Math.random() * flowerColors.length)];
      const flower = new THREE.Mesh(
        new THREE.SphereGeometry(0.15 + Math.random() * 0.15, 8, 8),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.15 })
      );
      flower.position.set(
        (Math.random() - 0.5) * 100,
        0.12,
        (Math.random() - 0.5) * 100
      );
      this.scene.add(flower);
    }

    for (let i = 0; i < 40; i++) {
      const grass = new THREE.Mesh(
        new THREE.ConeGeometry(0.08, 0.3 + Math.random() * 0.3, 4),
        new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.9 })
      );
      grass.position.set(
        (Math.random() - 0.5) * 100,
        0.15,
        (Math.random() - 0.5) * 100
      );
      grass.rotation.z = (Math.random() - 0.5) * 0.4;
      this.scene.add(grass);
    }

    const waterMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.2, metalness: 0.3, transparent: true, opacity: 0.85 });
    const pond = new THREE.Mesh(new THREE.CircleGeometry(5, 32), waterMat);
    pond.rotation.x = -Math.PI / 2;
    pond.position.set(-15, 0.02, 10);
    this.scene.add(pond);
    const pondRim = new THREE.Mesh(new THREE.RingGeometry(4.8, 5.3, 32), new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.9 }));
    pondRim.rotation.x = -Math.PI / 2;
    pondRim.position.set(-15, 0.03, 10);
    this.scene.add(pondRim);

    const pathMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.95 });
    for (let i = 0; i < 25; i++) {
      const stone = new THREE.Mesh(new THREE.CircleGeometry(0.3 + Math.random() * 0.2, 8), pathMat);
      stone.rotation.x = -Math.PI / 2;
      const t = i / 25;
      stone.position.set(
        -20 + t * 50 + (Math.random() - 0.5) * 1.5,
        0.01,
        -30 + Math.sin(t * 3) * 15 + (Math.random() - 0.5) * 1
      );
      this.scene.add(stone);
    }

    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.9 });
    for (let i = 0; i < 8; i++) {
      const cloud = new THREE.Group();
      const numPuffs = 3 + Math.floor(Math.random() * 3);
      for (let j = 0; j < numPuffs; j++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(1.5 + Math.random() * 1.5, 12, 12), cloudMat);
        puff.position.set(j * 2 - numPuffs, Math.random() * 0.8, (Math.random() - 0.5) * 1.5);
        puff.scale.y = 0.5;
        cloud.add(puff);
      }
      cloud.position.set(
        (Math.random() - 0.5) * 140,
        30 + Math.random() * 10,
        (Math.random() - 0.5) * 140
      );
      cloud.userData = { speed: 0.3 + Math.random() * 0.5 };
      this.scene.add(cloud);
      this.clouds.push(cloud);
    }

    this.scene.add(this.createCandyCastle());
    this.heroMesh = this.createFinn();
    this.scene.add(this.heroMesh);
    this.jakeMesh = this.createJake();
    this.jakeMesh.position.set(2, 0, 0);
    this.jakeMesh.visible = false;
    this.scene.add(this.jakeMesh);

    for (let i = 0; i < 4; i++) this.spawnZombie();
  }

  private createFinn(): THREE.Group {
    const group = new THREE.Group();
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xfcd9b6, roughness: 0.55 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0x5bc0eb, roughness: 0.6, metalness: 0.03 });
    const shortsMat = new THREE.MeshStandardMaterial({ color: 0x1e3a5f, roughness: 0.7 });
    const hatMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.6, side: THREE.DoubleSide });
    const greenMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.6, metalness: 0.1 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.8 });
    const sockMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 0.65, 12, 16), shirtMat);
    torso.position.y = 1.8;
    torso.castShadow = true;
    torso.name = 'body';
    group.add(torso);

    const shorts = new THREE.Mesh(new THREE.CapsuleGeometry(0.53, 0.22, 10, 14), shortsMat);
    shorts.position.y = 1.2;
    shorts.name = 'shorts';
    group.add(shorts);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.15, 12), skinMat);
    neck.position.y = 2.35;
    group.add(neck);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.58, 24, 18), skinMat);
    head.position.y = 2.75;
    head.castShadow = true;
    head.name = 'head';
    group.add(head);

    const hatFull = new THREE.Mesh(new THREE.SphereGeometry(0.65, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.65), hatMat);
    hatFull.position.y = 2.85;
    hatFull.castShadow = true;
    group.add(hatFull);

    const hatBack = new THREE.Mesh(new THREE.SphereGeometry(0.64, 20, 14, Math.PI * 0.75, Math.PI * 1.5, 0, Math.PI * 0.55), hatMat);
    hatBack.position.y = 2.8;
    group.add(hatBack);

    const hatSideL = new THREE.Mesh(new THREE.SphereGeometry(0.63, 12, 12, Math.PI * 1.5, Math.PI * 0.5, 0.3, Math.PI * 0.4), hatMat);
    hatSideL.position.y = 2.8;
    group.add(hatSideL);

    const hatSideR = new THREE.Mesh(new THREE.SphereGeometry(0.63, 12, 12, 0, Math.PI * 0.5, 0.3, Math.PI * 0.4), hatMat);
    hatSideR.position.y = 2.8;
    group.add(hatSideR);

    const hatBrowL = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), hatMat);
    hatBrowL.position.set(-0.35, 2.9, 0.45);
    group.add(hatBrowL);
    const hatBrowR = hatBrowL.clone();
    hatBrowR.position.set(0.35, 2.9, 0.45);
    group.add(hatBrowR);

    const hatTop = new THREE.Mesh(new THREE.SphereGeometry(0.62, 20, 14), hatMat);
    hatTop.scale.set(1, 0.5, 1);
    hatTop.position.y = 3.35;
    group.add(hatTop);

    const earL = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), hatMat);
    earL.position.set(-0.35, 3.6, 0);
    group.add(earL);
    const earR = earL.clone();
    earR.position.set(0.35, 3.6, 0);
    group.add(earR);

    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3 }));
    eyeL.position.set(-0.18, 2.82, 0.55);
    group.add(eyeL);
    const eyeR = eyeL.clone();
    eyeR.position.set(0.18, 2.82, 0.55);
    group.add(eyeR);

    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.018, 8, 12, Math.PI), new THREE.MeshStandardMaterial({ color: 0x1a1a2e }));
    mouth.position.set(0, 2.65, 0.54);
    mouth.rotation.x = Math.PI;
    group.add(mouth);

    const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.6, 8, 12), shirtMat);
    armL.position.set(-0.72, 1.8, 0);
    armL.name = 'armL';
    group.add(armL);
    const armR = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.6, 8, 12), shirtMat);
    armR.position.set(0.72, 1.8, 0);
    armR.name = 'armR';
    group.add(armR);

    const handL = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 10), skinMat);
    handL.position.set(-0.72, 1.3, 0);
    group.add(handL);
    const handR = handL.clone();
    handR.position.set(0.72, 1.3, 0);
    group.add(handR);

    const legL = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.3, 8, 12), shortsMat);
    legL.position.set(-0.25, 0.85, 0);
    legL.name = 'legL';
    group.add(legL);
    const legR = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.3, 8, 12), shortsMat);
    legR.position.set(0.25, 0.85, 0);
    legR.name = 'legR';
    group.add(legR);

    const sockL = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.18, 8, 12), sockMat);
    sockL.position.set(-0.25, 0.5, 0);
    group.add(sockL);
    const sockR = sockL.clone();
    sockR.position.set(0.25, 0.5, 0);
    group.add(sockR);

    const shoeL = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.08, 8, 12), shoeMat);
    shoeL.scale.set(1, 0.6, 1.4);
    shoeL.position.set(-0.25, 0.28, 0.04);
    group.add(shoeL);
    const shoeR = shoeL.clone();
    shoeR.position.set(0.25, 0.28, 0.04);
    group.add(shoeR);

    const backpack = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.5, 10, 12), greenMat);
    backpack.position.set(0, 1.8, -0.5);
    backpack.castShadow = true;
    group.add(backpack);

    const strapL = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.55, 6), greenMat);
    strapL.position.set(-0.28, 2.0, -0.18);
    strapL.rotation.x = 0.3;
    group.add(strapL);
    const strapR = strapL.clone();
    strapR.position.set(0.28, 2.0, -0.18);
    group.add(strapR);

    const swordHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.35, 10), new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.6 }));
    swordHandle.position.set(0.95, 1.95, 0.22);
    swordHandle.rotation.z = -0.4;
    swordHandle.name = 'swordHandle';
    group.add(swordHandle);

    const swordBladeMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, metalness: 0.7, roughness: 0.15, emissive: 0x22c55e, emissiveIntensity: 0.5 });
    const swordBlade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.1, 0.02), swordBladeMat);
    swordBlade.position.set(1.08, 2.55, 0.22);
    swordBlade.rotation.z = -0.4;
    swordBlade.castShadow = true;
    swordBlade.name = 'swordBlade';
    group.add(swordBlade);

    const swordTip = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 8), swordBladeMat);
    swordTip.position.set(1.2, 3.12, 0.22);
    swordTip.rotation.z = -0.4;
    group.add(swordTip);

    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.035, 0.05), new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.5 }));
    guard.position.set(0.98, 1.78, 0.22);
    guard.rotation.z = -0.4;
    group.add(guard);

    return group;
  }

  private createJake(): THREE.Group {
    const group = new THREE.Group();
    const jakeMat = new THREE.MeshStandardMaterial({ color: 0xe8b830, roughness: 0.7 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e });

    const body = new THREE.Mesh(new THREE.SphereGeometry(1.1, 24, 20), jakeMat);
    body.scale.set(0.8, 1.2, 0.7);
    body.position.y = 1.6;
    body.castShadow = true;
    body.name = 'jakeBody';
    group.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.75, 20, 16), jakeMat);
    head.scale.set(1, 0.9, 0.9);
    head.position.set(0, 2.75, 0.1);
    head.castShadow = true;
    head.name = 'jakeHead';
    group.add(head);

    const jowlL = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), jakeMat);
    jowlL.scale.set(0.9, 0.65, 0.7);
    jowlL.position.set(-0.32, 2.35, 0.45);
    group.add(jowlL);
    const jowlR = jowlL.clone();
    jowlR.position.set(0.32, 2.35, 0.45);
    group.add(jowlR);

    const earL = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), jakeMat);
    earL.scale.set(0.5, 1.3, 0.35);
    earL.position.set(-0.52, 2.5, 0.05);
    earL.rotation.z = 0.35;
    earL.name = 'earL';
    group.add(earL);
    const earR = earL.clone();
    earR.position.set(0.52, 2.5, 0.05);
    earR.rotation.z = -0.35;
    earR.name = 'earR';
    group.add(earR);

    const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 12), eyeWhiteMat);
    eyeL.position.set(-0.26, 2.85, 0.55);
    group.add(eyeL);
    const eyeR = eyeL.clone();
    eyeR.position.set(0.26, 2.85, 0.55);
    group.add(eyeR);

    const pupilL = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), darkMat);
    pupilL.position.set(-0.26, 2.85, 0.75);
    group.add(pupilL);
    const pupilR = pupilL.clone();
    pupilR.position.set(0.26, 2.85, 0.75);
    group.add(pupilR);

    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), darkMat);
    nose.position.set(0, 2.6, 0.72);
    group.add(nose);

    const shoulderL = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), jakeMat);
    shoulderL.position.set(-0.72, 1.95, 0.05);
    group.add(shoulderL);
    const shoulderR = shoulderL.clone();
    shoulderR.position.set(0.72, 1.95, 0.05);
    group.add(shoulderR);

    const armUpperL = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.55, 10), jakeMat);
    armUpperL.position.set(-0.82, 1.55, 0.05);
    armUpperL.rotation.z = 0.15;
    armUpperL.name = 'armL';
    group.add(armUpperL);
    const armUpperR = armUpperL.clone();
    armUpperR.position.set(0.82, 1.55, 0.05);
    armUpperR.rotation.z = -0.15;
    armUpperR.name = 'armR';
    group.add(armUpperR);

    const elbowL = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), jakeMat);
    elbowL.position.set(-0.88, 1.2, 0.05);
    group.add(elbowL);
    const elbowR = elbowL.clone();
    elbowR.position.set(0.88, 1.2, 0.05);
    group.add(elbowR);

    const armLowerL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.45, 10), jakeMat);
    armLowerL.position.set(-0.9, 0.95, 0.05);
    armLowerL.name = 'armLowerL';
    group.add(armLowerL);
    const armLowerR = armLowerL.clone();
    armLowerR.position.set(0.9, 0.95, 0.05);
    armLowerR.name = 'armLowerR';
    group.add(armLowerR);

    const handL = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), jakeMat);
    handL.position.set(-0.9, 0.7, 0.05);
    group.add(handL);
    const handR = handL.clone();
    handR.position.set(0.9, 0.7, 0.05);
    group.add(handR);

    const hipL = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), jakeMat);
    hipL.position.set(-0.3, 0.65, 0);
    group.add(hipL);
    const hipR = hipL.clone();
    hipR.position.set(0.3, 0.65, 0);
    group.add(hipR);

    const legUpperL = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.4, 10), jakeMat);
    legUpperL.position.set(-0.3, 0.4, 0);
    legUpperL.name = 'legL';
    group.add(legUpperL);
    const legUpperR = legUpperL.clone();
    legUpperR.position.set(0.3, 0.4, 0);
    legUpperR.name = 'legR';
    group.add(legUpperR);

    const kneeL = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), jakeMat);
    kneeL.position.set(-0.3, 0.18, 0);
    group.add(kneeL);
    const kneeR = kneeL.clone();
    kneeR.position.set(0.3, 0.18, 0);
    group.add(kneeR);

    const footL = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), jakeMat);
    footL.scale.set(0.9, 0.5, 1.3);
    footL.position.set(-0.3, 0.06, 0.06);
    group.add(footL);
    const footR = footL.clone();
    footR.position.set(0.3, 0.06, 0.06);
    group.add(footR);

    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), jakeMat);
    tail.scale.set(0.5, 0.5, 1);
    tail.position.set(0, 1.3, -0.72);
    group.add(tail);

    return group;
  }

  private createZombieBody(color: number): THREE.Group {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.05 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.8 });
    const candyMat = new THREE.MeshStandardMaterial({ color: 0xff69b4, roughness: 0.35, metalness: 0.1 });

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 1, 12, 16), mat);
    body.position.y = 1.6;
    body.castShadow = true;
    group.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 14), mat);
    head.position.y = 2.8;
    head.castShadow = true;
    group.add(head);

    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), whiteMat);
    eyeL.position.set(-0.18, 2.85, 0.45);
    group.add(eyeL);
    const eyeR = eyeL.clone();
    eyeR.position.set(0.18, 2.85, 0.45);
    group.add(eyeR);

    const pupilL = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), darkMat);
    pupilL.position.set(-0.18, 2.85, 0.54);
    group.add(pupilL);
    const pupilR = pupilL.clone();
    pupilR.position.set(0.18, 2.85, 0.54);
    group.add(pupilR);

    const candy = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.35, 8), candyMat);
    candy.position.set(0, 3.25, 0.25);
    candy.rotation.z = 0.3;
    group.add(candy);

    const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.7, 8, 12), mat);
    armL.position.set(-0.7, 1.5, 0);
    armL.rotation.z = 0.3;
    armL.name = 'armL';
    group.add(armL);
    const armR = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.7, 8, 12), mat);
    armR.position.set(0.7, 1.5, 0);
    armR.rotation.z = -0.3;
    armR.name = 'armR';
    group.add(armR);

    const legL = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.5, 8, 12), mat);
    legL.position.set(-0.28, 0.4, 0);
    legL.name = 'legL';
    group.add(legL);
    const legR = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.5, 8, 12), mat);
    legR.position.set(0.28, 0.4, 0);
    legR.name = 'legR';
    group.add(legR);

    const hpBarBg = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.1, 0.04), darkMat);
    hpBarBg.position.set(0, 3.7, 0);
    group.add(hpBarBg);

    const hpBarFill = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.1, 0.05), new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 0.2 }));
    hpBarFill.position.set(0, 3.7, 0.01);
    group.add(hpBarFill);

    group.userData = { hp: 100, maxHp: 100, speed: 1 + Math.random() * 1.5, attackTimer: 0, hpBarFill };

    return group;
  }

  private createBirdBody(): THREE.Group {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x6366f1, roughness: 0.6 });
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x818cf8, roughness: 0.5 });

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 12), bodyMat);
    body.position.y = 5;
    body.castShadow = true;
    group.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 10), bodyMat);
    head.position.set(0, 5.5, 0.3);
    group.add(head);

    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 6), new THREE.MeshStandardMaterial({ color: 0xfbbf24 }));
    beak.position.set(0, 5.45, 0.6);
    beak.rotation.x = Math.PI / 2;
    group.add(beak);

    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), new THREE.MeshStandardMaterial({ color: 0xff0000 }));
    eyeL.position.set(-0.15, 5.6, 0.5);
    group.add(eyeL);
    const eyeR = eyeL.clone();
    eyeR.position.set(0.15, 5.6, 0.5);
    group.add(eyeR);

    const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.5), wingMat);
    wingL.position.set(-0.7, 5.1, 0);
    wingL.name = 'wingL';
    group.add(wingL);
    const wingR = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.5), wingMat);
    wingR.position.set(0.7, 5.1, 0);
    wingR.name = 'wingR';
    group.add(wingR);

    const hpBarBg = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.04), new THREE.MeshStandardMaterial({ color: 0x1a1a2e }));
    hpBarBg.position.set(0, 6.2, 0);
    group.add(hpBarBg);
    const hpBarFill = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.05), new THREE.MeshStandardMaterial({ color: 0x22c55e }));
    hpBarFill.position.set(0, 6.2, 0.01);
    group.add(hpBarFill);

    group.userData = { hp: 60, maxHp: 60, speed: 2.5 + Math.random(), attackTimer: 0, hpBarFill, isFlying: true };
    return group;
  }

  private createSpiritBody(): THREE.Group {
    const group = new THREE.Group();
    const ghostMat = new THREE.MeshStandardMaterial({ color: 0xa78bfa, transparent: true, opacity: 0.7, emissive: 0x7c3aed, emissiveIntensity: 0.3 });

    const body = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.8, 12), ghostMat);
    body.position.y = 1.2;
    body.castShadow = true;
    group.add(body);

    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.8 }));
    eyeL.position.set(-0.2, 1.8, 0.45);
    group.add(eyeL);
    const eyeR = eyeL.clone();
    eyeR.position.set(0.2, 1.8, 0.45);
    group.add(eyeR);

    const pupilL = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), new THREE.MeshStandardMaterial({ color: 0x1a1a2e }));
    pupilL.position.set(-0.2, 1.8, 0.52);
    group.add(pupilL);
    const pupilR = pupilL.clone();
    pupilR.position.set(0.2, 1.8, 0.52);
    group.add(pupilR);

    const hpBarBg = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.04), new THREE.MeshStandardMaterial({ color: 0x1a1a2e }));
    hpBarBg.position.set(0, 2.5, 0);
    group.add(hpBarBg);
    const hpBarFill = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.05), new THREE.MeshStandardMaterial({ color: 0x22c55e }));
    hpBarFill.position.set(0, 2.5, 0.01);
    group.add(hpBarFill);

    group.userData = { hp: 70, maxHp: 70, speed: 1.8 + Math.random() * 0.8, attackTimer: 0, hpBarFill, isFlying: false };
    return group;
  }

  private createTankBody(): THREE.Group {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.9 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.8 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.2, 1.2), mat);
    body.position.y = 1.8;
    body.castShadow = true;
    group.add(body);

    const head = new THREE.Mesh(new THREE.BoxGeometry(1, 0.8, 0.8), mat);
    head.position.y = 3.2;
    head.castShadow = true;
    group.add(head);

    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.5 }));
    eyeL.position.set(-0.2, 3.3, 0.4);
    group.add(eyeL);
    const eyeR = eyeL.clone();
    eyeR.position.set(0.2, 3.3, 0.4);
    group.add(eyeR);

    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.2, 0.5), mat);
    armL.position.set(-1.2, 1.6, 0);
    armL.name = 'armL';
    group.add(armL);
    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.2, 0.5), mat);
    armR.position.set(1.2, 1.6, 0);
    armR.name = 'armR';
    group.add(armR);

    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, 0.5), mat);
    legL.position.set(-0.5, 0.45, 0);
    legL.name = 'legL';
    group.add(legL);
    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, 0.5), mat);
    legR.position.set(0.5, 0.45, 0);
    legR.name = 'legR';
    group.add(legR);

    const hpBarBg = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 0.05), darkMat);
    hpBarBg.position.set(0, 4.2, 0);
    group.add(hpBarBg);
    const hpBarFill = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 0.06), new THREE.MeshStandardMaterial({ color: 0x22c55e }));
    hpBarFill.position.set(0, 4.2, 0.01);
    group.add(hpBarFill);

    group.userData = { hp: 200, maxHp: 200, speed: 0.6 + Math.random() * 0.3, attackTimer: 0, hpBarFill, isFlying: false };
    return group;
  }

  private createTree(x: number, z: number): THREE.Group {
    const group = new THREE.Group();
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b3a0e, roughness: 0.85, metalness: 0.02 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.75, metalness: 0.02 });
    const candyMat = new THREE.MeshStandardMaterial({ color: 0xff69b4, roughness: 0.35, metalness: 0.1 });

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 3.5, 10), trunkMat);
    trunk.position.y = 1.75;
    trunk.castShadow = true;
    group.add(trunk);

    const foliage = new THREE.Mesh(new THREE.SphereGeometry(2.2, 16, 14), leafMat);
    foliage.position.y = 5;
    foliage.castShadow = true;
    group.add(foliage);

    const candy1 = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 10), candyMat);
    candy1.position.set(0.8, 4.5, 1);
    group.add(candy1);

    const candy2 = candy1.clone();
    candy2.position.set(-1, 5.5, 0.5);
    candy2.material = new THREE.MeshStandardMaterial({ color: 0xff4500, roughness: 0.35, metalness: 0.1 });
    group.add(candy2);

    group.position.set(x, 0, z);
    return group;
  }

  private createCandyCastle(): THREE.Group {
    const group = new THREE.Group();
    const pinkMat = new THREE.MeshStandardMaterial({ color: 0xf9a8d4, roughness: 0.45, metalness: 0.08 });
    const purpleMat = new THREE.MeshStandardMaterial({ color: 0xc084fc, roughness: 0.4, metalness: 0.1 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.25, metalness: 0.6 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.05 });

    const mainWall = new THREE.Mesh(new THREE.BoxGeometry(12, 8, 8), pinkMat);
    mainWall.position.y = 4;
    mainWall.castShadow = true;
    mainWall.receiveShadow = true;
    group.add(mainWall);

    const tower1 = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.2, 12, 16), pinkMat);
    tower1.position.set(-7, 6, -2);
    tower1.castShadow = true;
    group.add(tower1);

    const tower2 = tower1.clone();
    tower2.position.set(7, 6, -2);
    group.add(tower2);

    const tower3 = tower1.clone();
    tower3.position.set(-7, 6, 5);
    group.add(tower3);

    const tower4 = tower1.clone();
    tower4.position.set(7, 6, 5);
    group.add(tower4);

    const cone1 = new THREE.Mesh(new THREE.ConeGeometry(2.5, 4, 16), purpleMat);
    cone1.position.set(-7, 14, -2);
    group.add(cone1);
    const cone2 = cone1.clone(); cone2.position.set(7, 14, -2); group.add(cone2);
    const cone3 = cone1.clone(); cone3.position.set(-7, 14, 5); group.add(cone3);
    const cone4 = cone1.clone(); cone4.position.set(7, 14, 5); group.add(cone4);

    const crown = new THREE.Mesh(new THREE.TorusGeometry(1, 0.3, 12, 24), goldMat);
    crown.position.set(0, 9.5, 4);
    crown.rotation.x = Math.PI / 2;
    group.add(crown);

    for (let i = 0; i < 6; i++) {
      const candy = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 12), new THREE.MeshStandardMaterial({
        color: [0xff4500, 0xff69b4, 0x4ade80, 0x38bdf8, 0xfbbf24, 0xc084fc][i], roughness: 0.3, metalness: 0.1
      }));
      candy.position.set(-5 + i * 2, 8.5, 4.5);
      group.add(candy);
    }

    group.position.set(30, 0, -25);
    group.scale.setScalar(0.8);
    return group;
  }

  private spawnZombie() {
    const roll = Math.random();
    let zombie: THREE.Group;
    if (this.wave >= 3 && roll < 0.15) {
      zombie = this.createTankBody();
      this.sfxTank();
    } else if (this.wave >= 2 && roll < 0.35) {
      zombie = this.createBirdBody();
      this.sfxBird();
    } else if (this.wave >= 2 && roll < 0.5) {
      zombie = this.createSpiritBody();
      this.sfxSpirit();
    } else {
      const colors = [0xf472b6, 0xc084fc, 0xfb7185, 0xa78bfa, 0xf9a8d4];
      zombie = this.createZombieBody(colors[Math.floor(Math.random() * colors.length)]);
    }
    const angle = Math.random() * Math.PI * 2;
    const dist = 15 + Math.random() * 25;
    zombie.position.set(
      this.heroMesh.position.x + Math.cos(angle) * dist,
      0,
      this.heroMesh.position.z + Math.sin(angle) * dist
    );
    this.scene.add(zombie);
    this.enemies.push(zombie);
  }

  private spawnBoss() {
    this.bossActive = true;
    this.sfxBoss();
    const boss = this.createZombieBody(0x7c2d12);
    boss.scale.setScalar(1.8);
    boss.userData['hp'] = 300;
    boss.userData['maxHp'] = 300;
    boss.userData['speed'] = 0.8;
    boss.userData['isBoss'] = true;
    const angle = Math.random() * Math.PI * 2;
    boss.position.set(
      this.heroMesh.position.x + Math.cos(angle) * 25,
      0,
      this.heroMesh.position.z + Math.sin(angle) * 25
    );

    const crown = new THREE.Mesh(
      new THREE.TorusGeometry(0.6, 0.15, 8, 12),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xfbbf24, emissiveIntensity: 0.5, metalness: 0.8 })
    );
    crown.position.set(0, 3.5, 0);
    crown.rotation.x = Math.PI / 2;
    boss.add(crown);

    const glowMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.6 });
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), glowMat);
    glow.position.set(-0.2, 2.85, 0.6);
    boss.children[3].add(glow);
    const glow2 = glow.clone();
    glow2.position.set(0.2, 2.85, 0.6);
    boss.children[3].add(glow2);

    this.scene.add(boss);
    this.enemies.push(boss);
  }

  private spawnHeartPickup() {
    const mat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.3 });
    const heart = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 12), mat);
    const heroPos = this.isJake ? this.jakeMesh.position : this.heroMesh.position;
    heart.position.set(
      heroPos.x + (Math.random() - 0.5) * 30,
      0.8,
      heroPos.z + (Math.random() - 0.5) * 30
    );
    heart.userData = { bobPhase: Math.random() * Math.PI * 2 };
    this.scene.add(heart);
    this.hearts.push(heart);
  }

  private killEnemy(enemy: THREE.Group) {
    this.sfxKill();
    this.killCount++;
    this.cameraShake = 0.4;
    this.screenFlash = 'rgba(34, 197, 94, 0.2)';
    this.flashOpacity = 0.4;
    const isBoss = enemy.userData['isBoss'];
    for (let i = 0; i < 15; i++) {
      const p = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 6, 6),
        new THREE.MeshStandardMaterial({ color: Math.random() > 0.5 ? 0xff69b4 : 0xfbbf24 })
      );
      p.position.copy(enemy.position).add(new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 3, (Math.random() - 0.5) * 2));
      p.userData = { life: 0.8, vy: 2 + Math.random() * 3 };
      this.scene.add(p);
      this.particles.push(p);
    }
    this.scene.remove(enemy);
    this.enemies = this.enemies.filter(e => e !== enemy);
    this.score += isBoss ? 100 : 25;

    if (isBoss) {
      this.bossActive = false;
      this.score += 200;
      for (let i = 0; i < 25; i++) {
        const p = new THREE.Mesh(
          new THREE.SphereGeometry(0.2, 8, 8),
          new THREE.MeshStandardMaterial({ color: Math.random() > 0.5 ? 0xfbbf24 : 0xff4500, emissive: 0xfbbf24, emissiveIntensity: 0.5 })
        );
        p.position.copy(enemy.position).add(new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 5, (Math.random() - 0.5) * 4));
        p.userData = { life: 1.2, vy: 3 + Math.random() * 4 };
        this.scene.add(p);
        this.particles.push(p);
      }
    }

    if (this.enemies.length < 3) {
      this.wave++;
      if (this.wave % 5 === 0 && !this.bossActive) {
        this.spawnBoss();
      } else {
        for (let i = 0; i < 2 + this.wave; i++) this.spawnZombie();
      }
    }
  }

  private createSwordTrail(heroPos: THREE.Vector3) {
    const geo = new THREE.RingGeometry(2, 4.5, 24, 1, 0, Math.PI * 0.8);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    const trail = new THREE.Mesh(geo, mat);
    trail.position.copy(heroPos);
    trail.position.y = 2;
    trail.rotation.x = -Math.PI / 2;
    trail.userData = { life: 0.25 };
    this.scene.add(trail);
    this.swordTrail.push(trail);
  }

  private spawnDamageNumber(worldPos: THREE.Vector3, text: string, color: string, size = 18) {
    const vec = worldPos.clone();
    vec.y += 4;
    vec.project(this.camera);
    const x = (vec.x * 0.5 + 0.5) * this.containerRef.nativeElement.clientWidth + (Math.random() - 0.5) * 30;
    const y = (-vec.y * 0.5 + 0.5) * this.containerRef.nativeElement.clientHeight;
    this.damageNumbers.push({ x, y, text, color, life: 1, size });
    setTimeout(() => { this.damageNumbers.shift(); }, 800);
  }

  private checkCollision(x: number, z: number): boolean {
    const playerRadius = 0.8;
    for (const solid of this.solids) {
      const dx = x - solid.x;
      const dz = z - solid.z;
      if (dx * dx + dz * dz < (playerRadius + solid.radius) * (playerRadius + solid.radius)) {
        return true;
      }
    }
    return false;
  }

  private animate() {
    this.animId = requestAnimationFrame(() => this.animate());
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;
    const time = now * 0.003;

    this.dayPhase = (this.dayPhase + dt / this.dayNightDuration) % 1;
    const nightAmount = Math.max(0, Math.sin(this.dayPhase * Math.PI * 2 - Math.PI / 2));
    const skyColor = new THREE.Color().lerpColors(new THREE.Color(0x87ceeb), new THREE.Color(0x0f172a), nightAmount);
    this.scene.background = skyColor;
    this.scene.fog = new THREE.Fog(skyColor, 80, 180);
    this.sunLight.intensity = THREE.MathUtils.lerp(2.5, 0.2, nightAmount);
    this.sunLight.color.lerpColors(new THREE.Color(0xffe4b5), new THREE.Color(0x4466aa), nightAmount);
    this.ambientLight.intensity = THREE.MathUtils.lerp(0.5, 0.15, nightAmount);
    this.hemiLight.intensity = THREE.MathUtils.lerp(0.6, 0.2, nightAmount);
    this.scene.children.forEach(c => {
      if (c instanceof THREE.Mesh && c.userData['isStar']) {
        (c.material as THREE.MeshBasicMaterial).opacity = nightAmount * (0.5 + Math.sin(time * 2 + c.position.x) * 0.3);
      }
    });
    if (nightAmount > 0.5) { this.dayPhaseLabel = 'ليل'; this.dayPhaseIcon = '🌙'; }
    else if (nightAmount > 0.1) { this.dayPhaseLabel = 'غروب'; this.dayPhaseIcon = '🌅'; }
    else { this.dayPhaseLabel = 'نهار'; this.dayPhaseIcon = '☀️'; }

    this.attackTimer = Math.max(0, this.attackTimer - dt);
    this.heartTimer -= dt;
    if (this.heartTimer <= 0 && this.hp < 80 && this.hearts.length < 3) {
      this.spawnHeartPickup();
      this.heartTimer = 6;
    }
    this.checkLevelUp();

    const hero = this.isJake ? this.jakeMesh : this.heroMesh;
    const companion = this.isJake ? this.heroMesh : this.jakeMesh;

    let dx = 0, dz = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) dz = -1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) dz = 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) dx = -1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) dx = 1;

    if (Math.abs(this.touchDx) > 0.1) dx = this.touchDx;
    if (Math.abs(this.touchDz) > 0.1) dz = this.touchDz;

    if (dx !== 0 || dz !== 0) {
      const len = Math.hypot(dx, dz);
      const nx = hero.position.x + (dx / len) * this.playerSpeed;
      const nz = hero.position.z + (dz / len) * this.playerSpeed;
      if (!this.checkCollision(nx, nz)) {
        hero.position.x = nx;
        hero.position.z = nz;
      } else if (!this.checkCollision(nx, hero.position.z)) {
        hero.position.x = nx;
      } else if (!this.checkCollision(hero.position.x, nz)) {
        hero.position.z = nz;
      }
      hero.rotation.y = Math.atan2(dx, dz);
    }

    hero.position.x = Math.max(-60, Math.min(60, hero.position.x));
    hero.position.z = Math.max(-60, Math.min(60, hero.position.z));

    const isMoving = dx !== 0 || dz !== 0;
    const walkCycle = time * 8;
    const walkAmp = isMoving ? 0.4 : 0;

    hero.children.forEach(child => {
      if (child.name === 'legL') {
        child.position.z = Math.sin(walkCycle) * walkAmp;
        child.position.y = 0.4 + (isMoving ? Math.abs(Math.sin(walkCycle)) * 0.1 : 0);
      } else if (child.name === 'legR') {
        child.position.z = -Math.sin(walkCycle) * walkAmp;
        child.position.y = 0.4 + (isMoving ? Math.abs(Math.sin(walkCycle + Math.PI)) * 0.1 : 0);
      } else if (child.name === 'armL') {
        child.position.z = -Math.sin(walkCycle) * walkAmp * 0.7;
        child.rotation.x = Math.sin(walkCycle) * 0.3;
      } else if (child.name === 'armR') {
        child.position.z = Math.sin(walkCycle) * walkAmp * 0.7;
        child.rotation.x = -Math.sin(walkCycle) * 0.3;
      } else if (child.name === 'body') {
        child.scale.y = 1 + Math.sin(time * 2) * 0.015;
      } else if (child.name === 'head') {
        child.position.y = 3 + Math.sin(time * 2) * 0.02;
      } else if (child.name === 'swordBlade' && child instanceof THREE.Mesh) {
        if (child.material instanceof THREE.MeshStandardMaterial) {
          child.material.emissiveIntensity = 0.3 + Math.sin(time * 3) * 0.2;
        }
      }
    });

    if (this.isJake) {
      this.jakeMesh.children.forEach(child => {
        if (child.name === 'jakeBody') {
          child.scale.y = 0.8 + Math.sin(time * 2) * 0.02;
        }
      });
    }

    companion.position.lerp(
      new THREE.Vector3(hero.position.x + 2.5, hero.position.y, hero.position.z),
      0.05
    );
    companion.rotation.y = hero.rotation.y;

    this.enemies.forEach(enemy => {
      const dir = new THREE.Vector3().subVectors(hero.position, enemy.position);
      dir.y = 0;
      const dist = dir.length();
      if (dist > 3) {
        dir.normalize();
        enemy.position.x += dir.x * enemy.userData['speed'] * dt;
        enemy.position.z += dir.z * enemy.userData['speed'] * dt;
      }

      if (enemy.userData['isFlying']) {
        enemy.position.y = 4 + Math.sin(time * 2 + enemy.id) * 0.5;
      } else {
        enemy.position.y = 0;
      }

      if (dist > 0.5) {
        const targetAngle = Math.atan2(dir.x, dir.z);
        let diff = targetAngle - enemy.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        enemy.rotation.y += diff * 4 * dt;
      }

      const zombieWalk = Math.sin(time * enemy.userData['speed'] * 3);
      enemy.children.forEach(child => {
        if (child.name === 'wingL') {
          child.rotation.z = Math.sin(time * 8) * 0.5;
        } else if (child.name === 'wingR') {
          child.rotation.z = -Math.sin(time * 8) * 0.5;
        } else if (child.name && (child.name.includes('leg') || child.name.includes('arm'))) {
          child.rotation.x = zombieWalk * (child.name.includes('leg') ? 0.5 : 0.3);
        }
      });

      const attackDist = enemy.userData['isFlying'] ? 4 : 2.5;
      enemy.userData['attackTimer'] -= dt;
      if (dist < attackDist && enemy.userData['attackTimer'] <= 0) {
        enemy.userData['attackTimer'] = 1.2;
        const dmg = enemy.userData['isBoss'] ? 25 : enemy.userData['isFlying'] ? 15 : 10;
        this.hp = Math.max(0, this.hp - dmg);
        this.sfxHurt();
        this.cameraShake = 0.8;
        this.screenFlash = 'rgba(239, 68, 68, 0.3)';
        this.flashOpacity = 0.6;
        this.combo = 0;
        if (this.hp <= 0) this.hp = 100;
      }
    });

    this.hearts.forEach((heart, i) => {
      const phase = (heart.userData['bobPhase'] || 0) + time;
      heart.position.y = 0.8 + Math.sin(phase) * 0.3;
      heart.rotation.y += dt;
      const dist = hero.position.distanceTo(heart.position);
      if (dist < 2) {
        this.hp = Math.min(100, this.hp + 25);
        this.sfxPickup();
        this.scene.remove(heart);
        this.hearts.splice(i, 1);
      }
    });

    this.clouds.forEach(cloud => {
      cloud.position.x += (cloud.userData['speed'] || 0.3) * dt;
      if (cloud.position.x > 80) cloud.position.x = -80;
    });

    if (Math.random() < 0.02 && this.leaves.length < 15) {
      const leafMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, transparent: true, opacity: 0.8 });
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.02, 0.1), leafMat);
      leaf.position.set(hero.position.x + (Math.random() - 0.5) * 40, 3 + Math.random() * 6, hero.position.z + (Math.random() - 0.5) * 40);
      leaf.userData = { life: 4 + Math.random() * 3, vy: -0.5 - Math.random() * 0.3, rotSpeed: 2 + Math.random() * 4 };
      this.scene.add(leaf);
      this.leaves.push(leaf);
    }
    this.leaves.forEach((leaf, i) => {
      leaf.userData['life'] -= dt;
      leaf.position.y += leaf.userData['vy'] * dt;
      leaf.rotation.y += (leaf.userData['rotSpeed'] || 3) * dt;
      leaf.position.x += Math.sin(time * 2 + i) * 0.01;
      if (leaf.userData['life'] <= 0) { this.scene.remove(leaf); this.leaves.splice(i, 1); }
    });

    if (Math.random() < 0.008 && this.butterflies.length < 6) {
      const bColors = [0xff69b4, 0xfbbf24, 0x38bdf8, 0xc084fc];
      const bMat = new THREE.MeshStandardMaterial({ color: bColors[Math.floor(Math.random() * bColors.length)], transparent: true, opacity: 0.85 });
      const butterfly = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), bMat);
      const wingL = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 6), bMat);
      wingL.position.set(-0.2, 0, 0);
      wingL.name = 'wingL';
      butterfly.add(wingL);
      const wingR = wingL.clone();
      wingR.position.set(0.2, 0, 0);
      wingR.name = 'wingR';
      butterfly.add(wingR);
      butterfly.position.set(hero.position.x + (Math.random() - 0.5) * 30, 1.5 + Math.random() * 3, hero.position.z + (Math.random() - 0.5) * 30);
      butterfly.userData = { life: 6 + Math.random() * 4, vx: (Math.random() - 0.5) * 2, vz: (Math.random() - 0.5) * 2, phase: Math.random() * Math.PI * 2 };
      this.scene.add(butterfly);
      this.butterflies.push(butterfly);
    }
    this.butterflies.forEach((b, i) => {
      b.userData['life'] -= dt;
      b.position.y += Math.sin(time * 3 + (b.userData['phase'] || 0)) * 0.01;
      b.position.x += (b.userData['vx'] || 0) * dt;
      b.position.z += (b.userData['vz'] || 0) * dt;
      b.children.forEach(c => { if (c.name === 'wingL') c.scale.y = 1 + Math.sin(time * 10) * 0.5; if (c.name === 'wingR') c.scale.y = 1 - Math.sin(time * 10) * 0.5; });
      if (b.userData['life'] <= 0) { this.scene.remove(b); this.butterflies.splice(i, 1); }
    });

    if (Math.random() < 0.04 && this.dustParticles.length < 20) {
      const dustMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.4, emissive: 0xfbbf24, emissiveIntensity: 0.2 });
      const dust = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 4), dustMat);
      dust.position.set(hero.position.x + (Math.random() - 0.5) * 20, 0.3 + Math.random() * 2, hero.position.z + (Math.random() - 0.5) * 20);
      dust.userData = { life: 2 + Math.random() * 2, vy: 0.2 + Math.random() * 0.3 };
      this.scene.add(dust);
      this.dustParticles.push(dust);
    }
    this.dustParticles.forEach((d, i) => {
      d.userData['life'] -= dt;
      d.position.y += (d.userData['vy'] || 0.2) * dt;
      if (d.material instanceof THREE.MeshStandardMaterial) { d.material.opacity = Math.max(0, d.userData['life'] * 0.3); }
      if (d.userData['life'] <= 0) { this.scene.remove(d); this.dustParticles.splice(i, 1); }
    });

    this.swordTrail.forEach((trail, i) => {
      trail.userData['life'] -= dt * 4;
      if (trail.material instanceof THREE.MeshBasicMaterial) {
        trail.material.opacity = Math.max(0, trail.userData['life']);
      }
      if (trail.userData['life'] <= 0) {
        this.scene.remove(trail);
        this.swordTrail.splice(i, 1);
      }
    });

    this.particles.forEach((p, i) => {
      p.userData['life'] -= dt;
      p.position.y += (p.userData['vy'] || 0) * dt;
      p.position.x += Math.sin(time + i) * 0.02;
      if (p.material instanceof THREE.MeshStandardMaterial) {
        p.material.opacity = Math.max(0, p.userData['life']);
        p.material.transparent = true;
      }
      if (p.userData['life'] <= 0) {
        this.scene.remove(p);
        this.particles.splice(i, 1);
      }
    });

    this.comboTimer -= dt;
    if (this.comboTimer <= 0) { this.combo = 0; this.comboBonus = 0; }

    this.cameraShake *= 0.9;
    if (this.flashOpacity > 0) this.flashOpacity -= dt * 4;

    this.camera.position.x = hero.position.x + (Math.random() - 0.5) * this.cameraShake;
    this.camera.position.z = hero.position.z + 14 + (Math.random() - 0.5) * this.cameraShake;
    this.camera.position.y = 10 + (Math.random() - 0.5) * this.cameraShake * 0.5;
    this.camera.lookAt(hero.position.x, 2, hero.position.z);

    this.renderer.render(this.scene, this.camera);
    this.renderMiniMap(hero);
  }

  private renderMiniMap(hero: THREE.Group) {
    const canvas = this.miniMapRef?.nativeElement;
    if (!canvas) return;
    if (!this.miniCtx) {
      canvas.width = 160;
      canvas.height = 160;
      this.miniCtx = canvas.getContext('2d')!;
    }
    const ctx = this.miniCtx;
    const s = 160;
    const range = 50;

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, s, s);

    ctx.fillStyle = '#166534';
    ctx.fillRect(5, 5, s - 10, s - 10);

    const cx = s / 2;
    const cy = s / 2;
    const px = hero.position.x;
    const pz = hero.position.z;

    ctx.fillStyle = '#22c55e';
    const castleX = cx + (30 - px) * (s / range / 2);
    const castleY = cy + (-25 - pz) * (s / range / 2);
    if (castleX > 5 && castleX < s - 15 && castleY > 5 && castleY < s - 15) {
      ctx.fillRect(castleX, castleY, 10, 10);
    }

    this.enemies.forEach(e => {
      const ex = cx + (e.position.x - px) * (s / range / 2);
      const ey = cy + (e.position.z - pz) * (s / range / 2);
      if (ex > 5 && ex < s - 5 && ey > 5 && ey < s - 5) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(ex, ey, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    this.hearts.forEach(h => {
      const hx = cx + (h.position.x - px) * (s / range / 2);
      const hy = cy + (h.position.z - pz) * (s / range / 2);
      if (hx > 5 && hx < s - 5 && hy > 5 && hy < s - 5) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(hx, hy, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(5, 5, s - 10, s - 10);

    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = 'bold 8px sans-serif';
    ctx.fillText('أرض أوو', 10, 15);

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '7px sans-serif';
    ctx.fillText(`☠ ${this.killCount}`, 10, s - 10);
    ctx.fillText(`${this.enemies.length} أعداء`, s - 50, s - 10);
  }
}
