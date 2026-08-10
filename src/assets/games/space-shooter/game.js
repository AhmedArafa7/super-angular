(function () {
  const e = document.createElement("link").relList;
  if (e && e.supports && e.supports("modulepreload")) return;
  for (const l of document.querySelectorAll('link[rel="modulepreload"]')) s(l);
  new MutationObserver((l) => {
    for (const n of l)
      if (n.type === "childList")
        for (const r of n.addedNodes)
          r.tagName === "LINK" && r.rel === "modulepreload" && s(r);
  }).observe(document, { childList: !0, subtree: !0 });
  function i(l) {
    const n = {};
    return (
      l.integrity && (n.integrity = l.integrity),
      l.referrerPolicy && (n.referrerPolicy = l.referrerPolicy),
      l.crossOrigin === "use-credentials"
        ? (n.credentials = "include")
        : l.crossOrigin === "anonymous"
          ? (n.credentials = "omit")
          : (n.credentials = "same-origin"),
      n
    );
  }
  function s(l) {
    if (l.ep) return;
    l.ep = !0;
    const n = i(l);
    fetch(l.href, n);
  }
})();
const ee = document.getElementById("main-menu"),
  Le = document.getElementById("p2p-menu"),
  lt = document.getElementById("game-screen"),
  Ge = document.getElementById("game-over-screen"),
  ye = document.getElementById("shop-modal"),
  ht = document.getElementById("close-shop-btn"),
  pe = document.getElementById("mobile-shop-btn"),
  nt = document.getElementById("shop-coins"),
  ot = document.getElementById("shop-gems"),
  qe = document.querySelectorAll(".buy-btn"),
  ke = document.getElementById("fusion-modal"),
  Ie = document.getElementById("menu-fusion-btn"),
  Fe = document.getElementById("close-fusion-btn"),
  fe = document.getElementById("execute-fusion-btn"),
  X = document.getElementById("fusion-player-select"),
  q = document.getElementById("tab-fuse-ships"),
  N = document.getElementById("tab-fuse-weapons"),
  oe = document.getElementById("fuse-slot-1"),
  G = document.getElementById("fuse-slot-2"),
  Ne = document.getElementById("fusion-result-showcase"),
  at = document.getElementById("fusion-result-text"),
  rt = document.querySelectorAll(".mode-btn"),
  Ae = document.getElementById("create-room-btn"),
  dt = document.getElementById("roomIdDisplay"),
  ft = document.getElementById("room-info"),
  ct = document.getElementById("join-room-id"),
  ge = document.getElementById("join-room-btn"),
  ut = document.getElementById("join-error"),
  mt = document.getElementById("back-to-menu-btn"),
  yt = document.getElementById("menu-btn"),
  pt = document.getElementById("rematch-btn"),
  u = document.getElementById("game-canvas"),
  h = u.getContext("2d"),
  xe = [1, 2, 3, 4, 5, 6].map((t) => document.getElementById(`p${t}-hud`)),
  He = [1, 2, 3, 4, 5, 6].map((t) => document.getElementById(`p${t}-hp`)),
  Be = [1, 2, 3, 4, 5, 6].map((t) => document.getElementById(`p${t}-fuel`)),
  Ce = [1, 2, 3, 4, 5, 6].map((t) => document.getElementById(`p${t}-coins`)),
  Re = [1, 2, 3, 4, 5, 6].map((t) => document.getElementById(`p${t}-gems`)),
  Pe = [1, 2, 3, 4, 5, 6].map((t) => document.getElementById(`p${t}-score`));
document.getElementById("p2-hud");
document.getElementById("p1-hp");
document.getElementById("p2-hp");
document.getElementById("p1-fuel");
document.getElementById("p2-fuel");
document.getElementById("p1-coins");
document.getElementById("p1-gems");
document.getElementById("p2-coins");
document.getElementById("p2-gems");
document.getElementById("p1-score");
document.getElementById("p2-score");
const gt = document.getElementById("wave-number");
document.getElementById("result-title");
const xt = document.getElementById("result-desc"),
  wt = document.getElementById("final-stats"),
  je = document.getElementById("p2-controls-hint"),
  R = document.getElementById("player-count-modal"),
  $e = document.getElementById("close-count-btn"),
  We = document.querySelectorAll(".count-btn"),
  K = document.getElementById("transfer-target-select"),
  Oe = document.querySelectorAll(".transfer-btn");
let m = "local",
  se = !1,
  Ke,
  ce = 0,
  w = 1,
  ae = 0,
  d = {},
  _e = "",
  Se = 0,
  I = 0,
  H = null,
  C = null,
  a = [],
  o = [],
  v = [],
  _ = [],
  Xe = [],
  D = [],
  E = [],
  S = [],
  M = [],
  T = [],
  P = !1,
  Q = !1,
  V = !1,
  B = 1,
  j = 1,
  x = [];
function vt() {
  const t = localStorage.getItem("spaceShooterProgress");
  if (t)
    try {
      const e = JSON.parse(t);
      ((x = e.players || []), (j = e.unlockedWorld || 1));
    } catch (e) {
      console.error("Error loading progress", e);
    }
}
function le() {
  (a &&
    a.length > 0 &&
    (x = a.map((t) => ({
      coins: t.coins,
      gems: t.gems,
      shipType: t.shipType,
      weaponType: t.weaponType,
      hasDroneHeal: t.hasDroneHeal,
      hasDroneFuel: t.hasDroneFuel,
      hasDroneMagnet: t.hasDroneMagnet,
      droneHealLevel: t.droneHealLevel,
      droneFuelLevel: t.droneFuelLevel,
      droneMagnetLevel: t.droneMagnetLevel,
      ownedWeapons: t.ownedWeapons || ["normal"],
      ownedShips: t.ownedShips || ["defender"],
      hasReflectiveShield: t.hasReflectiveShield,
      healsCount: t.healsCount || 0,
      selfReviveKits: t.selfReviveKits || 0,
      secondLifes: t.secondLifes || 0,
      tempShieldsCount: t.tempShieldsCount || 0,
      bulletDamageModifier: t.bulletDamageModifier || 1,
      maxHp: t.maxHp || 100,
      trailType: t.trailType || 'none',
    }))),
    localStorage.setItem(
      "spaceShooterProgress",
      JSON.stringify({ players: x, unlockedWorld: j }),
    ));
}
vt();
const Ue = document.getElementById("worlds-map-modal"),
  Mt = document.getElementById("close-map-btn"),
  ze = document.querySelectorAll(".world-btn");
class Tt {
  getMass() {
    let m = 100;
    if (this.shipType === "tank") m += 100;
    else if (this.shipType === "speedster") m -= 30;
    if (this.hasDroneHeal) m += 20 * (this.droneHealLevel || 1);
    if (this.hasDroneFuel) m += 20 * (this.droneFuelLevel || 1);
    if (this.hasDroneMagnet) m += 20 * (this.droneMagnetLevel || 1);
    if (this.weaponType === "explosive") m += 50;
    else if (this.weaponType === "blackhole") m += 80;
    else if (this.weaponType === "piercing") m += 40;
    else if (this.weaponType === "frost") m += 30;
    return m;
  }
  constructor(e, i, s, l) {
    ((this.id = e),
      (this.x = i),
      (this.y = s),
      (this.width = 64),
      (this.height = 64),
      (this.color = l),
      (this.speed = 350),
      (this.maxHp = 100),
      (this.hp = 100),
      (this.maxFuel = 100),
      (this.fuel = 100),
      (this.score = 0),
      (this.coins = 0),
      (this.gems = 0),
      (this.shipType = "defender"),
      (this.weaponType = "normal"),
      (this.lastShot = 0),
      (this.fireRate = 150),
      (this.isAlive = !0),
      (this.isHost = e === 1),
      (this.reviveTimer = 0),
      (this.hasDroneHeal = !1),
      (this.hasDroneFuel = !1),
      (this.hasDroneMagnet = !1),
      (this.droneHealLevel = 0),
      (this.droneFuelLevel = 0),
      (this.droneMagnetLevel = 0),
      (this.lastDroneHealShot = 0),
      (this.lastDroneFuelShot = 0),
      (this.lastDroneHealAction = 0),
      (this.lastDroneFuelAction = 0),
      (this.lastDroneMagnetAction = 0),
      (this.ownedShips = ["defender"]),
      (this.ownedWeapons = ["normal"]),
      (this.hasReflectiveShield = !1),
      (this.isShieldActive = !1),
      (this.bulletDamageModifier = 1),
      (this.ultCharge = 0),
      (this.tankUltTimeLeft = 0),
      (this.trailType = "none"),
      (this.healsCount = 0),
      (this.selfReviveKits = 0),
      (this.secondLifes = 0),
      (this.tempShieldsCount = 0),
      (this.tempShieldTimeLeft = 0),
      (this.energy = 100),
      (this.maxEnergy = 100),
      (this.heat = 0),
      (this.maxHeat = 100),
      (this.nuclearReactors = 1));
  }
  draw() {
    if (!this.isAlive) {
      (h.save(),
        h.translate(this.x, this.y),
        (h.globalAlpha = 0.5),
        (h.fillStyle = "#475569"),
        h.beginPath(),
        h.moveTo(this.width / 2, 0),
        h.lineTo(this.width, this.height),
        h.lineTo(this.width / 2, this.height - 10),
        h.lineTo(0, this.height),
        h.closePath(),
        h.fill(),
        this.reviveTimer > 0 &&
          ((h.globalAlpha = 1),
          h.beginPath(),
          h.arc(
            this.width / 2,
            this.height / 2,
            30,
            -Math.PI / 2,
            -Math.PI / 2 + Math.PI * 2 * (this.reviveTimer / 2),
          ),
          (h.strokeStyle = "#10b981"),
          (h.lineWidth = 4),
          h.stroke()),
        h.restore());
      return;
    }
    (h.save(), h.translate(this.x, this.y));
    let e = this.getBulletColor();
    ((h.globalAlpha = this.isBeingRevived ? 0.5 : 1),
      h.scale(this.width / 200, this.height / 200));
    let i = Math.sin(Date.now() / 100) * 10;
    let flameColor = "#ff9800";
    if (this.trailType === "rainbow") {
      let hue = (Date.now() / 10) % 360;
      flameColor = `hsl(${hue}, 100%, 50%)`;
    } else if (this.trailType === "neon-blue") {
      flameColor = "#00f0ff";
    } else if (this.trailType === "matrix") {
      flameColor = "#00ff00";
    }
    ((h.fillStyle = flameColor),
      h.beginPath(),
      h.moveTo(85, 160),
      h.quadraticCurveTo(100, 200 + i, 115, 160),
      h.fill(),
      (h.fillStyle = e),
      h.beginPath(),
      h.moveTo(100, 40),
      h.lineTo(160, 140),
      h.lineTo(130, 150),
      h.lineTo(100, 120),
      h.lineTo(70, 150),
      h.lineTo(40, 140),
      h.closePath(),
      h.fill(),
      (h.fillStyle = "rgba(0,0,0,0.2)"),
      h.beginPath(),
      h.moveTo(100, 40),
      h.lineTo(160, 140),
      h.lineTo(130, 150),
      h.lineTo(100, 120),
      h.closePath(),
      h.fill());
    let s = h.createLinearGradient(0, 0, 200, 0);
    if (
      (s.addColorStop(0, "#b0bec5"),
      s.addColorStop(0.5, "#eceff1"),
      s.addColorStop(1, "#90a4ae"),
      (h.fillStyle = s),
      h.beginPath(),
      h.moveTo(100, 20),
      h.lineTo(125, 100),
      h.lineTo(120, 160),
      h.lineTo(80, 160),
      h.lineTo(75, 100),
      h.closePath(),
      h.fill(),
      (h.fillStyle = "#29b6f6"),
      h.beginPath(),
      h.ellipse(100, 85, 14, 24, 0, 0, Math.PI * 2),
      h.fill(),
      h.save(),
      h.translate(96, 78),
      h.rotate((-15 * Math.PI) / 180),
      (h.fillStyle = "#e1f5fe"),
      h.beginPath(),
      h.ellipse(0, 0, 4, 10, 0, 0, Math.PI * 2),
      h.fill(),
      h.restore(),
      (h.fillStyle = "#263238"),
      h.beginPath(),
      h.roundRect(83, 155, 34, 8, 2),
      h.fill(),
      (h.fillStyle = "#37474f"),
      h.fillRect(88, 163, 24, 4),
      h.restore(),
      this.hasDroneHeal)
    ) {
      let l = Date.now() / 300,
        n = this.x - 20 + Math.sin(l) * 5,
        r = this.y + this.height / 2 - 10 + Math.cos(l) * 5;
      (h.save(),
        h.translate(n, r),
        h.beginPath(),
        h.arc(10, 10, 12, 0, Math.PI * 2),
        (h.fillStyle = "rgba(16, 185, 129, 0.3)"),
        h.fill(),
        h.beginPath(),
        h.arc(10, 10, 8, 0, Math.PI * 2),
        (h.fillStyle = "#10b981"),
        h.fill(),
        (h.fillStyle = "#ffffff"),
        h.fillRect(9, 5, 2, 10),
        h.fillRect(5, 9, 10, 2),
        h.restore());
    }
    if (this.hasDroneFuel) {
      let l = Date.now() / 300 + Math.PI,
        n = this.x + this.width + 10 + Math.sin(l) * 5,
        r = this.y + this.height / 2 - 10 + Math.cos(l) * 5;
      (h.save(),
        h.translate(n, r),
        h.beginPath(),
        h.arc(10, 10, 12, 0, Math.PI * 2),
        (h.fillStyle = "rgba(245, 158, 11, 0.3)"),
        h.fill(),
        h.beginPath(),
        h.arc(10, 10, 8, 0, Math.PI * 2),
        (h.fillStyle = "#f59e0b"),
        h.fill(),
        (h.fillStyle = "#ffffff"),
        h.fillRect(8, 6, 4, 8),
        h.fillRect(7, 4, 6, 2),
        h.restore());
    }
    if (this.hasDroneMagnet) {
      let l = Date.now() / 400 + Math.PI / 2,
        n = this.x + this.width / 2 - 10 + Math.sin(l) * 35,
        r = this.y - 25 + Math.cos(l) * 10;
      (h.save(),
        h.translate(n, r),
        h.beginPath(),
        h.arc(10, 10, 12, 0, Math.PI * 2),
        (h.fillStyle = "rgba(6, 182, 212, 0.3)"),
        h.fill(),
        h.beginPath(),
        h.arc(10, 10, 8, 0, Math.PI * 2),
        (h.fillStyle = "#06b6d4"),
        h.fill(),
        (h.lineWidth = 3),
        (h.strokeStyle = "#ef4444"),
        h.beginPath(),
        h.arc(10, 8, 4, 0, Math.PI, !1),
        h.stroke(),
        (h.strokeStyle = "#3b82f6"),
        h.beginPath(),
        h.moveTo(6, 8),
        h.lineTo(6, 12),
        h.moveTo(14, 8),
        h.lineTo(14, 12),
        h.stroke(),
        h.restore());
    }
    (this.isShieldActive &&
      (h.save(),
      h.beginPath(),
      h.arc(
        this.x + this.width / 2,
        this.y + this.height / 2,
        this.width * 0.8,
        0,
        Math.PI * 2,
      ),
      (h.strokeStyle = "rgba(6, 182, 212, 0.8)"),
      (h.lineWidth = 3),
      h.stroke(),
      (h.fillStyle = "rgba(6, 182, 212, 0.15)"),
      h.fill(),
      h.restore()),
      this.tempShieldTimeLeft &&
        this.tempShieldTimeLeft > 0 &&
        (h.save(),
        h.beginPath(),
        h.arc(
          this.x + this.width / 2,
          this.y + this.height / 2,
          this.width * 0.85,
          0,
          Math.PI * 2,
        ),
        (h.strokeStyle = "rgba(56, 189, 248, 0.9)"),
        (h.lineWidth = 4),
        h.stroke(),
        (h.fillStyle = "rgba(56, 189, 248, 0.2)"),
        h.fill(),
        h.restore()));
  }
  triggerDeathOrResurrection() {
    if (this.secondLifes > 0) {
      (this.secondLifes--,
        (this.hp = this.maxHp),
        (this.fuel = this.maxFuel),
        f(
          this.x + this.width / 2,
          this.y + this.height / 2,
          "#eab308",
          45,
          2.5,
        ),
        alert(`تم تفعيل الفرصة الثانية الفائقة للاعب ${this.id}! 🌟`));
      return;
    }
    if (this.selfReviveKits > 0) {
      (this.selfReviveKits--,
        (this.hp = this.maxHp / 2),
        (this.fuel = this.maxFuel / 2),
        f(this.x + this.width / 2, this.y + this.height / 2, "#10b981", 35, 2),
        alert(`تم تفعيل حقنة الإنعاش الذاتي للاعب ${this.id}! 💉`));
      return;
    }
    ((this.isAlive = !1),
      f(this.x + this.width / 2, this.y + this.height / 2, this.color, 30, 2));
      
    // Ad watched revive option (Max 3 per run)
    if (!this.isAlive) {
      this.adRevivesCount = this.adRevivesCount || 0;
      if (this.adRevivesCount < 3) {
        setTimeout(() => {
          let watchAd = confirm(`اللاعب ${this.id} تدمر! 💔\nهل تريد مشاهدة إعلان لإعادة الإحياء؟ (المحاولات المتبقية: ${3 - this.adRevivesCount})`);
          if (watchAd) {
            alert("📺 جاري تشغيل الإعلان... الرجاء الانتظار 5 ثوانٍ.");
            setTimeout(() => {
              this.isAlive = !0;
              this.hp = this.maxHp;
              this.fuel = this.maxFuel;
              this.adRevivesCount++;
              f(this.x + this.width / 2, this.y + this.height / 2, "#10b981", 40, 3);
              alert(`🎉 تم إحياء اللاعب ${this.id} بنجاح!`);
              if (typeof Y === 'function') Y();
            }, 5000);
          }
        }, 800);
      }
    }
  }
  getBulletColor() {
    return this.weaponType === "frost"
      ? "#60a5fa"
      : this.weaponType === "explosive"
        ? "#ef4444"
        : this.weaponType === "piercing" || this.shipType === "sniper"
          ? "#fcd34d"
          : this.color;
  }
  update(e) {
    if (!this.isAlive) return;
    let i = 0,
      s = 0;
    const l = m === "local" || m === "local-coop",
      n = m === "p2p-join";
    this.id === 1 && (m === "local" || m === "local-coop" || m === "p2p-host")
      ? (d.ArrowLeft && (i = -1),
        d.ArrowRight && (i = 1),
        d.ArrowUp && (s = -1),
        d.ArrowDown && (s = 1),
        d[" "] && Date.now() - this.lastShot > this.fireRate && this.shoot())
      : this.id === 2 && n
        ? (d.ArrowLeft && (i = -1),
          d.ArrowRight && (i = 1),
          d.ArrowUp && (s = -1),
          d.ArrowDown && (s = 1),
          d[" "] && Date.now() - this.lastShot > this.fireRate && this.shoot())
        : this.id === 2 && l
          ? ((d.a || d.A) && (i = -1),
            (d.d || d.D) && (i = 1),
            (d.w || d.W) && (s = -1),
            (d.s || d.S) && (s = 1),
            (d.q || d.Q) &&
              Date.now() - this.lastShot > this.fireRate &&
              this.shoot())
          : this.id === 3 && l
            ? ((d.j || d.J) && (i = -1),
              (d.l || d.L) && (i = 1),
              (d.i || d.I) && (s = -1),
              (d.k || d.K) && (s = 1),
              (d.u || d.U) &&
                Date.now() - this.lastShot > this.fireRate &&
                this.shoot())
            : this.id === 4 && l
              ? ((d.f || d.F) && (i = -1),
                (d.h || d.H) && (i = 1),
                (d.t || d.T) && (s = -1),
                (d.g || d.G) && (s = 1),
                (d.r || d.R) &&
                  Date.now() - this.lastShot > this.fireRate &&
                  this.shoot())
              : this.id === 5 && l
                ? ((d.Numpad4 || d[4]) && (i = -1),
                  (d.Numpad6 || d[6]) && (i = 1),
                  (d.Numpad8 || d[8]) && (s = -1),
                  (d.Numpad2 || d[2]) && (s = 1),
                  (d.Numpad0 || d[0]) &&
                    Date.now() - this.lastShot > this.fireRate &&
                    this.shoot())
                : this.id === 6 &&
                  l &&
                  (d.End && (i = -1),
                  d.Home && (i = 1),
                  d.PageUp && (s = -1),
                  d.PageDown && (s = 1),
                  d.Insert &&
                    Date.now() - this.lastShot > this.fireRate &&
                    this.shoot());
    let r = this.speed;
    if (
      (this.shipType.includes("speedster")
        ? (r = 500)
        : this.shipType.includes("tank")
          ? (r = 240)
          : this.shipType.includes("sniper") && (r = 200),
      (this.fuel <= 0 && (r = 0)),
      (this.energy = Math.min(this.maxEnergy, this.energy + this.nuclearReactors * 15 * e)),
      (this.heat = Math.max(0, this.heat - 25 * e)),
      (this.x += i * r * e),
      (this.y += s * r * e),
      (this.x = Math.max(0, Math.min(u.width - this.width, this.x))),
      (this.y = Math.max(0, Math.min(u.height - this.height, this.y))),
      this.isAlive && this.trailType && this.trailType !== "none" && Math.random() > 0.4 && (
        this.trailType === "rainbow"
          ? f(this.x + this.width / 2, this.y + this.height - 5, `hsl(${(Date.now() / 8) % 360}, 100%, 50%)`, 2, 0.4)
          : this.trailType === "neon-blue"
            ? f(this.x + this.width / 2, this.y + this.height - 5, "#00f0ff", 2, 0.4)
            : this.trailType === "matrix" &&
              f(this.x + this.width / 2, this.y + this.height - 5, "#00ff00", 2, 0.4)
      ),
      m !== "p2p-join")
    ) {
      if (
        ((this.fuel = Math.max(0, this.fuel - (this.getMass() / 50) * ((Math.abs(i) + Math.abs(s) > 0) ? e : 0))),
        this.shipType.includes("healer") &&
          this.isAlive &&
          this.hp > 0 &&
          this.hp < this.maxHp &&
          (this.hp = Math.min(this.maxHp, this.hp + 2 * e)),
        this.shipType.includes("speedster") && this.isAlive)
      ) {
        let y = (g) => {
          if (Math.hypot(g.x - this.x, g.y - this.y) < 250) {
            let J = Math.atan2(
              this.y + this.height / 2 - g.y,
              this.x + this.width / 2 - g.x,
            );
            ((g.x += Math.cos(J) * 300 * e), (g.y += Math.sin(J) * 300 * e));
          }
        };
        (M.forEach(y), T.forEach(y), D.forEach(y));
      }
      if (this.hasDroneMagnet && this.isAlive) {
        const c = 150 + this.droneMagnetLevel * 60,
          y = 250 + this.droneMagnetLevel * 75;
        let g = (b) => {
          if (Math.hypot(b.x - this.x, b.y - this.y) < c) {
            let k = Math.atan2(
              this.y + this.height / 2 - b.y,
              this.x + this.width / 2 - b.x,
            );
            ((b.x += Math.cos(k) * y * e),
              (b.y += Math.sin(k) * y * e),
              Math.random() > 0.95 && f(b.x, b.y, "#06b6d4", 1, 0.5));
          }
        };
        (M.forEach(g), T.forEach(g), D.forEach(g));
      }
      if (this.hasReflectiveShield && this.isAlive) {
        let c = Date.now() % 15e3;
        if (c < 3e3 && this.energy >= 20 * e) {
            this.energy -= 20 * e;
            this.isShieldActive = !0;
        } else {
            this.isShieldActive = !1;
        }
      } else this.isShieldActive = !1;
      (this.tempShieldTimeLeft &&
        this.tempShieldTimeLeft > 0 &&
        (this.tempShieldTimeLeft = Math.max(0, this.tempShieldTimeLeft - e)),
        this.tankUltTimeLeft &&
          this.tankUltTimeLeft > 0 &&
          ((this.tankUltTimeLeft = Math.max(0, this.tankUltTimeLeft - e)),
          (this.width = 110),
          (this.height = 110),
          this.tankUltTimeLeft === 0 &&
            ((this.width = 64), (this.height = 64))));
    }
    if (
      (this.id === 1 && typeof te < "u" && te && this.isAlive && this.shoot(),
      this.reviveTimer > 0 &&
        !this.isBeingRevived &&
        (this.reviveTimer = Math.max(0, this.reviveTimer - e)),
      (this.isBeingRevived = !1),
      this.isAlive)
    ) {
      if (this.hasDroneHeal) {
        let c = Math.max(1e3, 5e3 - this.droneHealLevel * 500);
        Date.now() - this.lastDroneHealAction > c &&
          this.hp < this.maxHp &&
          ((this.hp = Math.min(
            this.maxHp,
            this.hp + 5 + this.droneHealLevel * 3,
          )),
          f(
            this.x + this.width / 2,
            this.y + this.height / 2,
            "#10b981",
            12,
            1,
          ),
          (this.lastDroneHealAction = Date.now()));
        let y = this.x - 10,
          g = this.y + this.height / 2,
          b = Math.max(400, 1e3 - this.droneHealLevel * 80);
        Date.now() - this.lastDroneHealShot > b && this.energy >= 5 &&
          (v.some((k) => Math.abs(k.x + k.width / 2 - y) < 80 && k.y < g) ||
            S.length > 0) &&
          (this.energy -= 5, o.push(new p(y + 7, g, -550, "#10b981", this.id, "normal")),
          (this.lastDroneHealShot = Date.now()));
      }
      if (this.hasDroneFuel) {
        let c = Math.max(1e3, 5e3 - this.droneFuelLevel * 500);
        Date.now() - this.lastDroneFuelAction > c &&
          this.fuel < this.maxFuel &&
          ((this.fuel = Math.min(
            this.maxFuel,
            this.fuel + 6 + this.droneFuelLevel * 4,
          )),
          f(this.x + this.width / 2, this.y + this.height / 2, "#f59e0b", 8, 1),
          (this.lastDroneFuelAction = Date.now()));
        let y = this.x + this.width + 10,
          g = this.y + this.height / 2,
          b = Math.max(400, 1e3 - this.droneFuelLevel * 80);
        Date.now() - this.lastDroneFuelShot > b && this.energy >= 5 &&
          (v.some((k) => Math.abs(k.x + k.width / 2 - y) < 80 && k.y < g) ||
            S.length > 0) &&
          (this.energy -= 5, o.push(new p(y + 7, g, -550, "#f59e0b", this.id, "normal")),
          (this.lastDroneFuelShot = Date.now()));
      }
    }
  }
  shoot() {
    let e = this.fireRate;
    if (
      (this.shipType === "sniper" && (e = 600),
      !(Date.now() - this.lastShot < e))
    ) {
      let stats = {
          "normal": { heat: 5, energy: 5 },
          "explosive": { heat: 15, energy: 15 },
          "piercing": { heat: 10, energy: 10 },
          "blackhole": { heat: 30, energy: 25 },
          "frost": { heat: 8, energy: 8 }
      }[this.weaponType] || { heat: 10, energy: 10 };
      if (this.weaponType.startsWith("hybrid-")) {
          stats.heat *= 1.5;
          stats.energy *= 1.5;
      }
      if (this.heat + stats.heat > this.maxHeat || this.energy < stats.energy) return;
      this.heat += stats.heat;
      this.energy -= stats.energy;
      if (
        ((this.lastShot = Date.now()), this.weaponType.startsWith("hybrid-"))
      ) {
        let i = this.weaponType,
          s = "#a855f7",
          l = -600;
        (i.includes("piercing")
          ? (l = -1e3)
          : i.includes("explosive")
            ? (l = -400)
            : i.includes("blackhole")
              ? (l = -180)
              : i.includes("frost") && (l = -600),
          i.includes("blackhole")
            ? (s = "#7c3aed")
            : i.includes("piercing")
              ? (s = "#fcd34d")
              : i.includes("explosive")
                ? (s = "#ef4444")
                : i.includes("frost") && (s = "#60a5fa"),
          o.push(new p(this.x + this.width / 2 - 3, this.y, l, s, this.id, i)));
        let n = o[o.length - 1];
        i.includes("blackhole")
          ? ((n.width = 32), (n.height = 32), (n.life = 2.5))
          : i.includes("piercing")
            ? ((n.width = 4), (n.height = 30))
            : i.includes("explosive") && (n.width = 12);
      } else
        this.weaponType === "frost"
          ? o.push(
              new p(
                this.x + this.width / 2 - 4,
                this.y,
                -600,
                "#60a5fa",
                this.id,
                "frost",
              ),
            )
          : this.weaponType === "explosive"
            ? (o.push(
                new p(
                  this.x + this.width / 2 - 6,
                  this.y,
                  -400,
                  "#ef4444",
                  this.id,
                  "explosive",
                ),
              ),
              (o[o.length - 1].width = 12))
            : this.weaponType === "piercing" || this.shipType === "sniper"
              ? (o.push(
                  new p(
                    this.x + this.width / 2 - 2,
                    this.y,
                    -1e3,
                    "#fcd34d",
                    this.id,
                    "piercing",
                  ),
                ),
                (o[o.length - 1].height = 30),
                this.shipType === "sniper" && (o[o.length - 1].isSniper = !0))
              : this.weaponType === "blackhole"
                ? o.push(
                    new p(
                      this.x + this.width / 2 - 16,
                      this.y,
                      -180,
                      "#7c3aed",
                      this.id,
                      "blackhole",
                    ),
                  )
                : o.push(
                    new p(
                      this.x + this.width / 2 - 3,
                      this.y,
                      -700,
                      this.color,
                      this.id,
                      "normal",
                    ),
                  );
      (o.length > 0 &&
        (o[o.length - 1].damageMultiplier = this.bulletDamageModifier || 1),
        f(this.x + this.width / 2, this.y, this.color, 3, 2),
        (m === "p2p-host" || m === "p2p-join") &&
          $({
            type: "shoot",
            id: this.id,
            x: this.x,
            y: this.y,
            wType: this.weaponType,
          }));
    }
  }
}
class p {
  constructor(e, i, s, l, n, r = "normal") {
    ((this.x = e),
      (this.y = i),
      (this.width = r === "blackhole" ? 32 : 6),
      (this.height = r === "blackhole" ? 32 : 15),
      (this.vy = r === "blackhole" ? -180 : s),
      (this.color = l),
      (this.ownerId = n),
      (this.type = r),
      (this.markedForDeletion = !1),
      (this.damageMultiplier = 1),
      r === "blackhole" && (this.life = 2.5));
  }
  draw() {
    if (this.type.includes("blackhole")) {
      h.save();
      let e = Date.now() / 150;
      (h.translate(this.x + 16, this.y + 16), h.rotate(e));
      let i = h.createRadialGradient(0, 0, 2, 0, 0, 18);
      (i.addColorStop(0, "#000000"),
        i.addColorStop(0.3, "#7c3aed"),
        i.addColorStop(0.8, "rgba(147, 51, 234, 0.4)"),
        i.addColorStop(1, "rgba(147, 51, 234, 0)"),
        (h.fillStyle = i),
        h.beginPath(),
        h.arc(0, 0, 18, 0, Math.PI * 2),
        h.fill(),
        (h.fillStyle = "#ffffff"),
        h.beginPath(),
        h.arc(0, 0, 3, 0, Math.PI * 2),
        h.fill(),
        h.restore());
    } else
      ((h.fillStyle = this.color),
        h.fillRect(this.x, this.y, this.width, this.height));
  }
  update(e) {
    let i = typeof I < "u" && I > 0 && this.ownerId === "enemy" ? 0.2 : 1;
    if (
      ((this.y += this.vy * i * e),
      this.vx && (this.x += this.vx * i * e),
      this.isScythe && (this.x += Math.sin(Date.now() / 80) * 150 * e),
      this.type.includes("blackhole"))
    ) {
      ((this.life -= e),
        this.life <= 0 && (this.markedForDeletion = !0),
        v.forEach((l) => {
          let n = this.x + 16 - (l.x + l.width / 2),
            r = this.y + 16 - (l.y + l.height / 2),
            c = Math.hypot(n, r);
          if (c < 180) {
            let y = (180 - c) * 1.5,
              g = Math.atan2(r, n);
            ((l.x += Math.cos(g) * y * e), (l.y += Math.sin(g) * y * e));
          }
        }));
      let s = (l) => {
        let n = this.x + 16 - l.x,
          r = this.y + 16 - l.y,
          c = Math.hypot(n, r);
        if (c < 180) {
          let y = (180 - c) * 2,
            g = Math.atan2(r, n);
          ((l.x += Math.cos(g) * y * e), (l.y += Math.sin(g) * y * e));
        }
      };
      (M.forEach(s), T.forEach(s), D.forEach(s));
    }
    (this.y < -100 ||
      this.y > u.height + 100 ||
      this.x < -100 ||
      this.x > u.width + 100) &&
      (this.markedForDeletion = !0);
  }
}
class Ye {
  constructor(e, i, s) {
    this.x = e;
    this.y = i;
    this.type = s;
    const l = 1 + (w - 1) * 0.2;
    if (s === 3) {
      ((this.width = 60),
        (this.height = 60),
        (this.hp = Math.floor(50 * l)),
        (this.speed = Math.floor(80 * (1 + (w - 1) * 0.02))),
        (this.color = "#ef4444"),
        (this.fireRate = Math.max(800, 1500 - (w - 1) * 50)));
    } else if (s === 2) {
      ((this.width = 40),
        (this.height = 40),
        (this.hp = Math.floor(20 * l)),
        (this.speed = Math.floor(150 * (1 + (w - 1) * 0.02))),
        (this.color = "#f59e0b"),
        (this.fireRate = 3e3));
    } else if (s === 4) {
      ((this.width = 45),
        (this.height = 45),
        (this.hp = Math.floor(35 * l)),
        (this.speed = Math.floor(70 * (1 + (w - 1) * 0.01))),
        (this.color = "#10b981"),
        (this.fireRate = Math.max(1e3, 2500 - (w - 1) * 80)),
        (this.lastHeal = Date.now() + Math.random() * 1e3));
    } else if (s === 5) {
      ((this.width = 40),
        (this.height = 40),
        (this.hp = Math.floor(12 * l)),
        (this.speed = Math.floor(210 * (1 + (w - 1) * 0.025))),
        (this.color = "#ef4444"),
        (this.fireRate = 99999999));
    } else if (s === 6) {
      ((this.width = 45),
        (this.height = 45),
        (this.hp = Math.floor(60 * l)),
        (this.speed = Math.floor(60 * (1 + (w - 1) * 0.02))),
        (this.color = "#3b82f6"),
        (this.fireRate = Math.max(1e3, 2e3 - (w - 1) * 50)));
    } else if (s === 7) {
      ((this.width = 40),
        (this.height = 40),
        (this.hp = Math.floor(20 * l)),
        (this.speed = Math.floor(90 * (1 + (w - 1) * 0.02))),
        (this.color = "#a855f7"),
        (this.fireRate = Math.max(1e3, 2e3 - (w - 1) * 50)),
        (this.phaseTimer = 0),
        (this.isVisible = !0));
    } else if (s === 8) {
      ((this.width = 50),
        (this.height = 50),
        (this.hp = Math.floor(40 * l)),
        (this.speed = Math.floor(50 * (1 + (w - 1) * 0.01))),
        (this.color = "#d946ef"),
        (this.fireRate = 99999999),
        (this.lastSummon = Date.now() + Math.random() * 2e3));
    } else if (s === 9) {
      ((this.width = 45),
        (this.height = 45),
        (this.hp = Math.floor(30 * l)),
        (this.speed = Math.floor(70 * (1 + (w - 1) * 0.02))),
        (this.color = "#94a3b8"),
        (this.fireRate = 3000));
    } else if (s === 10) {
      ((this.width = 40),
        (this.height = 40),
        (this.hp = Math.floor(15 * l)),
        (this.speed = Math.floor(40 * (1 + (w - 1) * 0.01))),
        (this.color = "#fcd34d"),
        (this.fireRate = Math.max(1500, 3e3 - (w - 1) * 50)));
    } else if (s === 11) {
      ((this.width = 55),
        (this.height = 55),
        (this.hp = Math.floor(35 * l)),
        (this.speed = Math.floor(70 * (1 + (w - 1) * 0.02))),
        (this.color = "#14b8a6"),
        (this.fireRate = Math.max(1500, 2500 - (w - 1) * 50)));
    } else if (s === 12) {
      ((this.width = 40),
        (this.height = 40),
        (this.hp = Math.floor(25 * l)),
        (this.speed = Math.floor(100 * (1 + (w - 1) * 0.02))),
        (this.color = "#f43f5e"),
        (this.fireRate = Math.max(800, 1500 - (w - 1) * 50)),
        (this.startX = e),
        (this.timeOffset = Math.random() * Math.PI * 2));
    } else if (s === 13) {
      // 🤖 Heavy Battle Droid
      ((this.width = 65),
        (this.height = 65),
        (this.hp = Math.floor(80 * l)),
        (this.speed = Math.floor(50 * (1 + (w - 1) * 0.015))),
        (this.color = "#ef4444"),
        (this.fireRate = Math.max(1200, 2000 - (w - 1) * 40)));
    } else if (s === 14) {
      // 💀 Dark Void Reaper
      ((this.width = 70),
        (this.height = 70),
        (this.hp = Math.floor(120 * l)),
        (this.speed = Math.floor(40 * (1 + (w - 1) * 0.01))),
        (this.color = "#a855f7"),
        (this.fireRate = Math.max(1500, 2500 - (w - 1) * 50)));
    } else {
      ((this.width = 40),
        (this.height = 40),
        (this.hp = Math.floor(10 * l)),
        (this.speed = Math.floor(80 * (1 + (w - 1) * 0.02))),
        (this.color = "#22d3ee"),
        (this.fireRate = Math.max(1200, 3e3 - (w - 1) * 100)));
    }
    ((this.maxHp = this.hp),
      (this.markedForDeletion = !1),
      (this.lastShot = Date.now() + Math.random() * 2e3),
      (this.id = Math.random().toString(36).substr(2, 9)));
  }
  draw() {
    if (this.markedForDeletion && this.type === 11 && !this.splitDone) {
      this.splitDone = true;
      v.push(new Ye(this.x - 20, this.y, 2));
      v.push(new Ye(this.x + 20, this.y, 2));
    }

    (h.save(),
      h.translate(this.x, this.y),
      (h.font =
        this.type === 3
          ? '50px "Segoe UI Emoji", Arial'
          : this.type === 13
            ? '55px "Segoe UI Emoji", Arial'
            : this.type === 14
              ? '60px "Segoe UI Emoji", Arial'
              : '35px "Segoe UI Emoji", Arial'),
      (h.textAlign = "center"),
      (h.textBaseline = "middle"));
    let e = "👾";
    this.type === 2
      ? (e = "👽")
      : this.type === 3
        ? (e = "👹")
        : this.type === 4
          ? (e = "🛸")
          : this.type === 5
            ? (e = "💥")
            : this.type === 6
              ? (e = "🛡️")
              : this.type === 7
                ? (e = "👻")
                : this.type === 8
                  ? (e = "🧙")
                  : this.type === 9
                    ? (e = "🐺")
                    : this.type === 10
                      ? (e = "🎯")
                      : this.type === 11
                          ? (e = "🦠")
                          : this.type === 12
                            ? (e = "🦇")
                            : this.type === 13
                              ? (e = "🤖")
                              : this.type === 14 && (e = "💀");

    if (this.type === 5) {
      ((h.shadowBlur = 15), (h.shadowColor = "#ef4444"));
    }
    if (this.type === 7 && !this.isVisible) {
      h.globalAlpha = 0.2;
    }

    h.fillText(e, this.width / 2, this.height / 2);

    if (this.type === 6 && this.hp > this.maxHp / 2) {
      (h.beginPath(),
        h.arc(
          this.width / 2,
          this.height / 2,
          this.width / 1.5,
          0,
          Math.PI * 2,
        ),
        (h.strokeStyle = "#3b82f6"),
        (h.lineWidth = 3),
        h.stroke());
    }

    if (this.type === 4) {
      ((h.fillStyle = "#10b981"),
        (h.font = "bold 16px Arial"),
        h.fillText("✚", this.width / 2 + 16, this.height / 2 - 16));
    }
    h.restore();
  }
  update(e) {
    if (this.type === 7) {
      this.phaseTimer += e;
      if (this.phaseTimer > 2) {
        ((this.isVisible = !this.isVisible), (this.phaseTimer = 0));
        if (this.isVisible) {
          this.x += (Math.random() - 0.5) * 100;
          this.x = Math.max(0, Math.min(u.width - this.width, this.x));
        }
      }
    }
    if (this.type === 12) {
      this.timeOffset += e * 3;
      this.x = this.startX + Math.sin(this.timeOffset) * 100;
      this.x = Math.max(0, Math.min(u.width - this.width, this.x));
    }

    if (this.type === 5) {
      let s = u.width / 2;
      if (a.length > 0) {
        let n = null,
          r = 1 / 0;
        a.forEach((c) => {
          if (c.isAlive) {
            let y = Math.hypot(c.x - this.x, c.y - this.y);
            y < r && ((r = y), (n = c));
          }
        });
        n && (s = n.x + n.width / 2);
      }
      let l = typeof I < "u" && I > 0 ? 0.2 : 1;
      this.x += (s - (this.x + this.width / 2)) * e * 2.2 * l;
    }

    let i = typeof I < "u" && I > 0 ? 0.2 : 1;
    this.y += this.speed * i * e;

    if (m !== "p2p-join") {
      if (this.type === 4 && Date.now() - this.lastHeal > 2e3) {
        this.lastHeal = Date.now();
        let s = !1;
        v.forEach((l) => {
          l !== this &&
            l.hp < l.maxHp &&
            Math.hypot(l.x - this.x, l.y - this.y) < 250 &&
            ((l.hp = Math.min(l.maxHp, l.hp + 15)),
            f(l.x + l.width / 2, l.y + l.height / 2, "#10b981", 8, 1),
            (s = !0));
        });
        s &&
          f(
            this.x + this.width / 2,
            this.y + this.height / 2,
            "#10b981",
            15,
            1.5,
          );
      }

      if (this.type === 8 && Date.now() - this.lastSummon > 4e3) {
        this.lastSummon = Date.now();
        v.push(new Ye(this.x, this.y + this.height, 1));
        if (m === "p2p-host")
          $({
            type: "spawn_enemy",
            x: this.x,
            y: this.y + this.height,
            eType: 1,
          });
      }

      if (this.type === 9 && Date.now() - this.lastShot > 3e3) {
        this.lastShot = Date.now();
        for (let k = 0; k < 8; k++) {
          let angle = (k / 8) * Math.PI * 2;
          let bb = new p(
            this.x + this.width / 2,
            this.y + this.height / 2,
            0,
            "#94a3b8",
            "enemy",
          );
          bb.vx = Math.cos(angle) * 150;
          bb.vy = Math.sin(angle) * 150;
          o.push(bb);
        }
      }

      if (
        this.type !== 2 &&
        this.type !== 5 &&
        this.type !== 8 &&
        this.type !== 9
      ) {
        if (Date.now() - this.lastShot > this.fireRate) {
          this.lastShot = Date.now();
          let bColor = "#ef4444",
            vy = 300,
            eType = "normal";
          if (this.type === 4) bColor = "#10b981";
          else if (this.type === 10) {
            bColor = "#fcd34d";
            vy = 600;
            eType = "piercing";
          } else if (this.type === 6) {
            bColor = "#3b82f6";
          }

          if (this.type === 13) {
            // 🤖 Heavy Battle Droid: dual parallel lasers
            o.push(new p(this.x + 10, this.y + this.height, 350, "#ef4444", "enemy", "normal"));
            o.push(new p(this.x + this.width - 16, this.y + this.height, 350, "#ef4444", "enemy", "normal"));
          } else if (this.type === 14) {
            // 💀 Dark Void Reaper: 3-way spread shot
            let centerLaser = new p(this.x + this.width / 2 - 3, this.y + this.height, 300, "#a855f7", "enemy", "normal");
            centerLaser.vx = 0;
            o.push(centerLaser);
            
            let leftLaser = new p(this.x + this.width / 2 - 3, this.y + this.height, 280, "#a855f7", "enemy", "normal");
            leftLaser.vx = -80;
            o.push(leftLaser);
            
            let rightLaser = new p(this.x + this.width / 2 - 3, this.y + this.height, 280, "#a855f7", "enemy", "normal");
            rightLaser.vx = 80;
            o.push(rightLaser);
          } else {
            o.push(
              new p(
                this.x + this.width / 2 - 3,
                this.y + this.height,
                vy,
                bColor,
                "enemy",
                eType,
              ),
            );
          }
          if (m === "p2p-host")
            $({
              type: "enemy_shoot",
              x: this.x,
              y: this.y,
              w: this.width,
              h: this.height,
              vy: vy,
              bColor: bColor,
              eType: eType,
              owner: "enemy",
            });
        }
      }
    }
    if (this.y > u.height + 50) this.markedForDeletion = !0;
  }
}
class De {
  constructor(e, i) {
    ((this.x = e),
      (this.y = i),
      (this.width = 20),
      (this.height = 25),
      (this.vy = 80),
      (this.markedForDeletion = !1),
      (this.id = Math.random().toString(36).substr(2, 9)));
  }
  draw() {
    ((h.font = '20px "Segoe UI Emoji", Arial'),
      (h.textAlign = "center"),
      (h.textBaseline = "middle"),
      h.fillText("⛽", this.x + this.width / 2, this.y + this.height / 2));
  }
  update(e) {
    ((this.y += this.vy * e),
      this.y > u.height + 50 && (this.markedForDeletion = !0));
  }
}
class re {
  constructor(e, i) {
    ((this.x = e),
      (this.y = i),
      (this.width = 15),
      (this.height = 15),
      (this.vy = 50),
      (this.markedForDeletion = !1),
      (this.id = Math.random().toString(36).substr(2, 9)));
  }
  draw() {
    ((h.font = "15px Arial"),
      (h.textAlign = "center"),
      (h.textBaseline = "middle"),
      h.fillText("💰", this.x + this.width / 2, this.y + this.height / 2));
  }
  update(e) {
    ((this.y += this.vy * e),
      this.y > u.height + 50 && (this.markedForDeletion = !0));
  }
}
class de {
  constructor(e, i) {
    ((this.x = e),
      (this.y = i),
      (this.width = 15),
      (this.height = 15),
      (this.vy = 60),
      (this.markedForDeletion = !1),
      (this.id = Math.random().toString(36).substr(2, 9)));
  }
  draw() {
    ((h.font = "15px Arial"),
      (h.textAlign = "center"),
      (h.textBaseline = "middle"),
      h.fillText("💎", this.x + this.width / 2, this.y + this.height / 2));
  }
  update(e) {
    ((this.y += this.vy * e),
      this.y > u.height + 50 && (this.markedForDeletion = !0));
  }
}
class Ee {
  constructor(e, i, s, l, n, r = !1) {
    ((this.x = e),
      (this.y = i),
      (this.vx = s),
      (this.vy = l),
      (this.width = n),
      (this.height = n),
      (this.isGolden = r),
      (this.hp = r ? 25 : Math.max(1, Math.ceil(n / 8))),
      (this.markedForDeletion = !1),
      (this.id = Math.random().toString(36).substr(2, 9)));
  }
  draw() {
    (h.save(),
      (h.font = this.width + 'px "Segoe UI Emoji", Arial'),
      (h.textAlign = "center"),
      (h.textBaseline = "middle"),
      this.isGolden
        ? ((h.shadowBlur = 12),
          (h.shadowColor = "#fbbf24"),
          h.fillText("☄️", this.x + this.width / 2, this.y + this.height / 2))
        : h.fillText("🪨", this.x + this.width / 2, this.y + this.height / 2),
      h.restore());
  }
  update(e) {
    ((this.x += this.vx * e),
      (this.y += this.vy * e),
      (this.y > u.height + 100 || this.x < -100 || this.x > u.width + 100) &&
        (this.markedForDeletion = !0));
  }
}
class Je {
  constructor(e, i) {
    ((this.x = e),
      (this.y = i),
      (this.width = 150),
      (this.height = 100),
      (this.dir = 1),
      (this.markedForDeletion = !1),
      (this.id = "boss_1"),
      (this.lastShot = Date.now()),
      (this.phase = 1));
    const s = B || 1;
    s === 1
      ? ((this.emoji = "😈"),
        (this.name = "زعيم السديم"),
        (this.maxHp = 600),
        (this.speed = 80),
        (this.fireRate = 1600),
        (this.bulletColor = "#f59e0b"))
      : s === 2
        ? ((this.emoji = "🤖"),
          (this.name = "حارس الكويكبات"),
          (this.maxHp = 900),
          (this.speed = 100),
          (this.fireRate = 1400),
          (this.bulletColor = "#fb923c"))
        : s === 3
          ? ((this.emoji = "👽"),
            (this.name = "سيد الثقب الأسود"),
            (this.maxHp = 1200),
            (this.speed = 120),
            (this.fireRate = 1200),
            (this.bulletColor = "#a855f7"))
          : s === 4
            ? ((this.emoji = "👹"),
              (this.name = "غول الكوكب الفضائي"),
              (this.maxHp = 1650),
              (this.speed = 140),
              (this.fireRate = 1100),
              (this.bulletColor = "#ef4444"))
            : s === 5
              ? ((this.emoji = "🐉"),
                (this.name = "تنين النجوم المشتعلة"),
                (this.maxHp = 2200),
                (this.speed = 160),
                (this.fireRate = 1e3),
                (this.bulletColor = "#10b981"))
              : s === 6
                ? ((this.emoji = "🐙"),
                  (this.name = "كراكن الطاقة المظلمة"),
                  (this.maxHp = 2800),
                  (this.speed = 180),
                  (this.fireRate = 900),
                  (this.bulletColor = "#6366f1"))
                : s === 7
                  ? ((this.emoji = "💀"),
                    (this.name = "حاصد الأرواح الكوني"),
                    (this.maxHp = 3500),
                    (this.speed = 200),
                    (this.fireRate = 800),
                    (this.bulletColor = "#ec4899"))
                  : s === 8
                    ? ((this.emoji = "👑"),
                      (this.name = "إمبراطور الأبعاد الكبرى"),
                      (this.maxHp = 4500),
                      (this.speed = 220),
                      (this.fireRate = 700),
                      (this.bulletColor = "#06b6d4"))
                    : s === 9
                      ? ((this.emoji = "👾"),
                        (this.name = "حارس الحافة المظلمة"),
                        (this.maxHp = 5500),
                        (this.speed = 230),
                        (this.fireRate = 650),
                        (this.bulletColor = "#fb7185"))
                      : s === 10
                        ? ((this.emoji = "🥶"),
                          (this.name = "وحش الصقيع الكوني"),
                          (this.maxHp = 6500),
                          (this.speed = 240),
                          (this.fireRate = 600),
                          (this.bulletColor = "#67e8f9"))
                        : s === 11
                          ? ((this.emoji = "👽"),
                            (this.name = "لورد الكويزار المدمر"),
                            (this.maxHp = 8e3),
                            (this.speed = 250),
                            (this.fireRate = 550),
                            (this.bulletColor = "#f97316"))
                          : ((this.emoji = "🌌💥"),
                            (this.name = "الحاكم المطلق للأبعاد"),
                            (this.maxHp = 1e4),
                            (this.speed = 260),
                            (this.fireRate = 500),
                            (this.bulletColor = "#ec4899"));
    const l = 1 + (w - 5) * 0.15;
    ((this.maxHp = Math.floor(this.maxHp * Math.max(1, l))),
      (this.hp = this.maxHp));
  }
  draw() {
    (h.save(),
      h.translate(this.x, this.y),
      (h.font = '100px "Segoe UI Emoji", Arial'),
      (h.textAlign = "center"),
      (h.textBaseline = "middle"),
      h.fillText(this.emoji, this.width / 2, this.height / 2),
      (h.fillStyle = "#ffffff"),
      (h.font = 'bold 16px "Cairo", Arial'),
      (h.textAlign = "center"),
      h.fillText(this.name, this.width / 2, -22),
      (h.fillStyle = "#000"),
      h.fillRect(0, -12, this.width, 8),
      (h.fillStyle = this.bulletColor),
      h.fillRect(0, -12, this.width * (this.hp / this.maxHp), 8),
      h.restore());
  }
  update(e) {
    let i = typeof I < "u" && I > 0 ? 0.2 : 1;
    if (
      (this.y < 50
        ? (this.y += 50 * i * e)
        : ((this.x += this.speed * this.dir * i * e),
          (this.x <= 0 || this.x + this.width >= u.width) &&
            ((this.dir *= -1),
            (this.x = Math.max(0, Math.min(u.width - this.width, this.x))))),
      m !== "p2p-join" && Date.now() - this.lastShot > this.fireRate)
    ) {
      this.lastShot = Date.now();
      const s = B || 1;
      if (s === 1)
        for (let l = -2; l <= 2; l++) {
          o.push(
            new p(
              this.x + this.width / 2,
              this.y + this.height,
              250 + Math.abs(l) * 50,
              this.bulletColor,
              "enemy",
            ),
          );
          let n = o[o.length - 1];
          n.vx = l * 80;
        }
      else if (s === 2) {
        for (let l = -2; l <= 2; l++) {
          o.push(
            new p(
              this.x + this.width / 2,
              this.y + this.height,
              260 + Math.abs(l) * 50,
              this.bulletColor,
              "enemy",
            ),
          );
          let n = o[o.length - 1];
          n.vx = l * 90;
        }
        (o.push(
          new p(
            this.x + this.width / 2 - 6,
            this.y + this.height,
            380,
            "#ef4444",
            "enemy",
            "explosive",
          ),
        ),
          (o[o.length - 1].width = 12),
          (o[o.length - 1].height = 20));
      } else if (s === 3) {
        let l = a[0];
        if (a[1] && a[0]) {
          let c = Math.hypot(a[0].x - this.x, a[0].y - this.y);
          Math.hypot(a[1].x - this.x, a[1].y - this.y) < c && (l = a[1]);
        }
        let r =
          (l ? l.x + l.width / 2 : u.width / 2) - (this.x + this.width / 2);
        for (let c = -2; c <= 2; c++) {
          o.push(
            new p(
              this.x + this.width / 2,
              this.y + this.height,
              300,
              this.bulletColor,
              "enemy",
            ),
          );
          let y = o[o.length - 1];
          y.vx = (r / u.height) * 250 + c * 40;
        }
      } else if (s === 4) {
        let l = Date.now() / 1e3;
        for (let n = 0; n < 6; n++) {
          let r = (n * Math.PI) / 3 + l;
          o.push(
            new p(
              this.x + this.width / 2,
              this.y + this.height,
              250,
              this.bulletColor,
              "enemy",
            ),
          );
          let c = o[o.length - 1];
          ((c.vx = Math.sin(r) * 150), (c.vy = Math.cos(r) * 150 + 200));
        }
      } else if (s === 5)
        for (let l = 0; l < 8; l++) {
          let n = (l * Math.PI) / 4;
          o.push(
            new p(
              this.x + this.width / 2,
              this.y + this.height,
              200,
              this.bulletColor,
              "enemy",
            ),
          );
          let r = o[o.length - 1];
          ((r.vx = Math.sin(n) * 180), (r.vy = Math.cos(n) * 180 + 150));
        }
      else if (s === 6)
        for (let l = -3; l <= 3; l++) {
          o.push(
            new p(
              this.x + this.width / 2,
              this.y + this.height,
              320,
              this.bulletColor,
              "enemy",
            ),
          );
          let n = o[o.length - 1];
          n.vx = l * 110;
        }
      else if (s === 7)
        for (let l = -3; l <= 3; l++) {
          o.push(
            new p(
              this.x + this.width / 2,
              this.y + this.height,
              330,
              this.bulletColor,
              "enemy",
            ),
          );
          let n = o[o.length - 1];
          ((n.vx = l * 120), (n.isScythe = !0));
        }
      else if (s === 8) {
        let l = Date.now() / 1e3;
        for (let c = 0; c < 8; c++) {
          let y = (c * Math.PI) / 4 + l;
          o.push(
            new p(
              this.x + this.width / 2,
              this.y + this.height,
              200,
              this.bulletColor,
              "enemy",
            ),
          );
          let g = o[o.length - 1];
          ((g.vx = Math.sin(y) * 200), (g.vy = Math.cos(y) * 200 + 250));
        }
        let r =
          (a[0] ? a[0].x + a[0].width / 2 : u.width / 2) -
          (this.x + this.width / 2);
        (o.push(
          new p(
            this.x + this.width / 2,
            this.y + this.height,
            420,
            "#ff0000",
            "enemy",
          ),
        ),
          (o[o.length - 1].vx = (r / u.height) * 420));
      } else if (s === 9) {
        let l = Date.now() / 800;
        for (let n = 0; n < 10; n++) {
          let r = (n * Math.PI) / 5 + l;
          o.push(
            new p(
              this.x + this.width / 2,
              this.y + this.height,
              220,
              this.bulletColor,
              "enemy",
            ),
          );
          let c = o[o.length - 1];
          ((c.vx = Math.sin(r) * 220), (c.vy = Math.cos(r) * 220 + 200));
        }
      } else if (s === 10) {
        for (let l = -3; l <= 3; l++) {
          o.push(
            new p(
              this.x + this.width / 2,
              this.y + this.height,
              280,
              this.bulletColor,
              "enemy",
            ),
          );
          let n = o[o.length - 1];
          n.vx = l * 60;
        }
        (o.push(
          new p(
            this.x + this.width / 2,
            this.y + this.height,
            180,
            "#22d3ee",
            "enemy",
            "frost",
          ),
        ),
          (o[o.length - 1].width = 18),
          (o[o.length - 1].height = 18));
      } else if (s === 11) {
        let n =
          (a[0] ? a[0].x + a[0].width / 2 : u.width / 2) -
          (this.x + this.width / 2);
        (o.push(
          new p(
            this.x + this.width / 2,
            this.y + this.height,
            480,
            this.bulletColor,
            "enemy",
          ),
        ),
          (o[o.length - 1].vx = (n / u.height) * 480));
        for (let r = -1; r <= 1; r++)
          (o.push(
            new p(
              this.x + this.width / 2,
              this.y + this.height,
              240,
              "#f97316",
              "enemy",
            ),
          ),
            (o[o.length - 1].vx = (Math.random() - 0.5) * 300));
      } else {
        let l = Date.now() / 600;
        for (let n = 0; n < 12; n++) {
          let r = (n * Math.PI) / 6 + l;
          o.push(
            new p(
              this.x + this.width / 2,
              this.y + this.height,
              260,
              this.bulletColor,
              "enemy",
            ),
          );
          let c = o[o.length - 1];
          ((c.vx = Math.sin(r) * 240), (c.vy = Math.cos(r) * 240 + 220));
        }
        (o.push(
          new p(
            this.x + this.width / 2,
            this.y + this.height,
            350,
            "#f43f5e",
            "enemy",
          ),
        ),
          (o[o.length - 1].vx = (Math.random() - 0.5) * 400),
          (o[o.length - 1].isScythe = !0));
      }
    }
  }
}
class St {
  constructor(e, i, s, l) {
    ((this.x = e),
      (this.y = i),
      (this.vx = (Math.random() - 0.5) * 300 * l),
      (this.vy = (Math.random() - 0.5) * 300 * l),
      (this.size = Math.random() * 4 + 1),
      (this.color = s),
      (this.life = 1),
      (this.decay = Math.random() * 0.02 + 0.02),
      (this.markedForDeletion = !1));
  }
  draw() {
    ((h.globalAlpha = this.life),
      (h.fillStyle = this.color),
      h.beginPath(),
      h.arc(this.x, this.y, this.size, 0, Math.PI * 2),
      h.fill(),
      (h.globalAlpha = 1));
  }
  update(e) {
    ((this.x += this.vx * e),
      (this.y += this.vy * e),
      (this.life -= this.decay),
      this.life <= 0 && (this.markedForDeletion = !0));
  }
}
function f(t, e, i, s, l = 1) {
  for (let n = 0; n < s; n++) _.push(new St(t, e, i, l));
}
function Qe() {
  ((u.width = window.innerWidth), (u.height = window.innerHeight));
}
window.addEventListener("resize", Qe);
Qe();
let Z = 1,
  he = 0;
window.addEventListener("keydown", (t) => {
  ((d[t.key] = !0),
    t.key === "Shift" && a[0]
      ? W(0)
      : (t.key === "f" || t.key === "F") && a[1]
        ? W(1)
        : (t.key === "h" || t.key === "H") && a[2]
          ? W(2)
          : (t.key === "j" || t.key === "J") && a[3]
            ? W(3)
            : (t.key === "k" || t.key === "K") && a[4]
              ? W(4)
              : (t.key === "l" || t.key === "L") && a[5] && W(5),
    m === "local" || m === "local-coop"
      ? (t.key === "b" || t.key === "B") && a[0] && a[0].isAlive
        ? A(0)
        : (t.key === "e" || t.key === "E") && a[1] && a[1].isAlive
          ? A(1)
          : (t.key === "o" || t.key === "O") && a[2] && a[2].isAlive
            ? A(2)
            : (t.key === "y" || t.key === "Y") && a[3] && a[3].isAlive
              ? A(3)
              : (t.key === "NumpadAdd" || t.key === "+") && a[4] && a[4].isAlive
                ? A(4)
                : t.key === "Delete" && a[5] && a[5].isAlive && A(5)
      : (t.key === "b" || t.key === "B") && A(0));
});
window.addEventListener("keyup", (t) => {
  d[t.key] = !1;
});
let te = !1,
  ue = { x: 0, y: 0 };
pe &&
  (pe.classList.remove("hidden"),
  pe.addEventListener("click", (t) => {
    t.stopPropagation();
    let e = a[0] || (a.length > 0 ? a[0] : null);
    e && e.isAlive ? A(0) : alert("يجب أن تكون على قيد الحياة لفتح المتجر!");
  }));
u.addEventListener(
  "touchstart",
  (t) => {
    if (se || Q || V) return;
    let e = t.touches[0],
      i = u.getBoundingClientRect(),
      s = (e.clientX - i.left) * (u.width / i.width),
      l = (e.clientY - i.top) * (u.height / i.height),
      n = a[0];
    n && n.isAlive && ((te = !0), (ue.x = n.x - s), (ue.y = n.y - l));
  },
  { passive: !1 },
);
u.addEventListener(
  "touchmove",
  (t) => {
    if (!te) return;
    let e = t.touches[0],
      i = u.getBoundingClientRect(),
      s = (e.clientX - i.left) * (u.width / i.width),
      l = (e.clientY - i.top) * (u.height / i.height),
      n = a[0];
    (n &&
      n.isAlive &&
      ((n.x = s + ue.x),
      (n.y = l + ue.y),
      (n.x = Math.max(0, Math.min(u.width - n.width, n.x))),
      (n.y = Math.max(0, Math.min(u.height - n.height, n.y)))),
      t.preventDefault());
  },
  { passive: !1 },
);
u.addEventListener("touchend", () => {
  te = !1;
});
document.querySelectorAll(".inv-btn").forEach((t) => {
  t.addEventListener("click", (e) => {
    e.stopPropagation();
    let i = parseInt(t.getAttribute("data-player")),
      s = t.getAttribute("data-item"),
      l = a[i];
    if (l) {
      if (s === "heal") {
        if (!l.isAlive) {
          alert("يجب أن تكون السفينة حية لاستخدام عدة الإصلاح!");
          return;
        }
        if (l.hp >= l.maxHp) {
          alert("الطاقة كاملة بالفعل!");
          return;
        }
        l.healsCount > 0
          ? (l.healsCount--,
            (l.hp = l.maxHp),
            f(l.x + l.width / 2, l.y + l.height / 2, "#10b981", 20, 2),
            alert("🔧 تم إصلاح السفينة بالكامل!"))
          : alert("لا تملك أي عدة إصلاح! اشتريها من المتجر أولاً.");
      } else if (s === "selfRevive") {
        if (l.isAlive) {
          alert("السفينة حية بالفعل ولا تحتاج إنعاش!");
          return;
        }
        l.selfReviveKits > 0
          ? (l.selfReviveKits--,
            (l.isAlive = !0),
            (l.hp = l.maxHp / 2),
            (l.fuel = Math.max(30, l.fuel)),
            f(l.x + l.width / 2, l.y + l.height / 2, "#ef4444", 35, 2),
            alert("💉 تم إنعاش السفينة بنجاح بنصف الطاقة!"))
          : alert("لا تملك أي حقن إنعاش! اشتريها من المتجر أولاً.");
      } else if (s === "secondLife")
        l.secondLifes > 0
          ? (l.secondLifes--,
            (l.isAlive = !0),
            (l.hp = l.maxHp),
            (l.fuel = l.maxFuel),
            f(l.x + l.width / 2, l.y + l.height / 2, "#eab308", 50, 3),
            alert(
              "🌟 تم تفعيل الفرصة الثانية الفائقة واستعادة كامل الطاقة والوقود!",
            ))
          : alert("لا تملك أي فرصة ثانية فائقة! اشتريها من المتجر أولاً.");
      else if (s === "tempShield") {
        if (!l.isAlive) {
          alert("يجب أن تكون السفينة حية لتفعيل درع الحماية!");
          return;
        }
        if (l.tempShieldTimeLeft > 0) {
          alert("درع الحماية نشط بالفعل حالياً!");
          return;
        }
        l.tempShieldsCount > 0
          ? (l.tempShieldsCount--,
            (l.tempShieldTimeLeft = 5),
            f(l.x + l.width / 2, l.y + l.height / 2, "#38bdf8", 15, 1.5),
            alert("🛡️ تم تفعيل درع الحماية المؤقت لمدة 5 ثوانٍ!"))
          : alert("لا تملك أي درع حماية مؤقت! اشتره من المتجر أولاً.");
      }
      (le(), Y());
    }
  });
});
function A(t = 0) {
  if (m === "p2p-join") {
    alert("فقط الـ Host يمكنه إيقاف اللعبة لفتح المتجر الآن!");
    return;
  }
  if (((Q = !Q), Q)) {
    ((he = t), ye.classList.remove("hidden"));
    const e = ye.querySelector("h2");
    if ((e && (e.innerText = `متجر اللاعب ${t + 1} 🛒`), K)) {
      ((K.innerHTML = ""),
        a.forEach((s, l) => {
          if (l !== t && s.isAlive) {
            let n = document.createElement("option");
            ((n.value = l),
              (n.innerText = `اللاعب ${l + 1}`),
              K.appendChild(n));
          }
        }));
      const i = document.querySelector(".shop-transfer-section");
      i &&
        (K.children.length === 0
          ? (i.style.display = "none")
          : (i.style.display = "block"));
    }
    ie();
  } else (ye.classList.add("hidden"), le());
}
function ie() {
  let t = a[he] || a[0];
  ((nt.innerText = t.coins),
    (ot.innerText = t.gems),
    t.ownedShips || (t.ownedShips = ["defender"]),
    t.ownedWeapons || (t.ownedWeapons = ["normal"]),
    qe.forEach((e) => {
      let i = e.getAttribute("data-type"),
        s = e.getAttribute("data-item"),
        l = e.getAttribute("data-cost"),
        n = e.getAttribute("data-currency") === "gems" ? "💎" : "💰";
      if (i === "weapon")
        t.ownedWeapons.includes(s)
          ? t.weaponType === s
            ? ((e.innerText = "مجهز الحصان 🎖️"),
              (e.style.background =
                "linear-gradient(to bottom, #4b5563, #374151)"),
              (e.disabled = !0))
            : ((e.innerText = "تجهيز 🔄"),
              (e.style.background =
                "linear-gradient(to bottom, #3b82f6, #1d4ed8)"),
              (e.disabled = !1))
          : ((e.innerText = `شراء بـ ${l} ${n}`),
            (e.style.background = ""),
            (e.disabled = !1));
      else if (i === "ship")
        t.ownedShips.includes(s)
          ? t.shipType === s
            ? ((e.innerText = "مجهز الحصان 🎖️"),
              (e.style.background =
                "linear-gradient(to bottom, #4b5563, #374151)"),
              (e.disabled = !0))
            : ((e.innerText = "تجهيز 🔄"),
              (e.style.background =
                "linear-gradient(to bottom, #3b82f6, #1d4ed8)"),
              (e.disabled = !1))
          : ((e.innerText = `شراء بـ ${l} ${n}`),
            (e.style.background = ""),
            (e.disabled = !1));
      else if (i === "drone")
        s === "heal" && t.hasDroneHeal
          ? ((e.innerText = "مقتناة 🏥"),
            (e.disabled = !0),
            (e.style.background = "#4b5563"))
          : s === "fuel" && t.hasDroneFuel
            ? ((e.innerText = "مقتناة ⛽"),
              (e.disabled = !0),
              (e.style.background = "#4b5563"))
            : s === "magnet" && t.hasDroneMagnet
              ? ((e.innerText = "مقتناة 🧲"),
                (e.disabled = !0),
                (e.style.background = "#4b5563"))
              : ((e.innerText = `شراء بـ ${l} ${n}`),
                (e.style.background = ""),
                (e.disabled = !1));
      else if (i === "drone-upgrade") {
        let r = 0;
        (s === "heal"
          ? (r = t.droneHealLevel)
          : s === "fuel"
            ? (r = t.droneFuelLevel)
            : s === "magnet" && (r = t.droneMagnetLevel),
          (e.innerText = `ترقية لـ ${r + 1} (${l} 💰)`),
          (e.style.background = ""),
          (e.disabled = !1));
      } else
        i === "upgrade"
          ? s === "reflectiveShield" &&
            (t.hasReflectiveShield
              ? ((e.innerText = "ممتلكة 🛡️"),
                (e.disabled = !0),
                (e.style.background = "#4b5563"))
              : ((e.innerText = `شراء بـ ${l} ${n}`),
                (e.style.background = ""),
                (e.disabled = !1)))
          : i === "consumable" ?
            (s === "selfRevive"
              ? t.boughtSelfReviveThisRun
                ? ((e.innerText = "مباعة 🔒"),
                  (e.disabled = !0),
                  (e.style.background = "#4b5563"))
                : ((e.innerText = `شراء بـ ${l} ${n}`),
                  (e.style.background = ""),
                  (e.disabled = !1))
              : s === "secondLife" &&
                (t.boughtSecondLifeThisRun
                  ? ((e.innerText = "مباعة 🔒"),
                    (e.disabled = !0),
                    (e.style.background = "#4b5563"))
                  : ((e.innerText = `شراء بـ ${l} ${n}`),
                    (e.style.background = ""),
                    (e.disabled = !1))))
          : i === "trail" &&
            (t.trailType === s
              ? ((e.innerText = "مفعلة 🎖️"),
                (e.disabled = !0),
                (e.style.background = "linear-gradient(to bottom, #4b5563, #374151)"))
              : ((e.innerText = `تفعيل بـ ${l} ${n}`),
                (e.style.background = ""),
                (e.disabled = !1)));
    }));
}
ht.addEventListener("click", () => A(he));
qe.forEach((t) => {
  t.addEventListener("click", (e) => {
    let i = a[he] || a[0],
      s = t.getAttribute("data-type"),
      l = t.getAttribute("data-item"),
      n = parseInt(t.getAttribute("data-cost")),
      r = t.getAttribute("data-currency");
    (i.ownedShips || (i.ownedShips = ["defender"]),
      i.ownedWeapons || (i.ownedWeapons = ["normal"]));
    let c = !1;
    if (
      (s === "weapon" && i.ownedWeapons.includes(l) && (c = !0),
      s === "ship" && i.ownedShips.includes(l) && (c = !0),
      c)
    ) {
      (we(i, s, l), ie());
      return;
    }
    (r === "coins" && i.coins >= n
      ? we(i, s, l) && (i.coins -= n)
      : r === "gems" && i.gems >= n
        ? we(i, s, l) && (i.gems -= n)
        : alert("رصيد غير كافٍ!"),
      ie());
  });
});
Oe &&
  Oe.forEach((t) => {
    t.addEventListener("click", () => {
      let e = a[he] || a[0];
      if (!K.value) {
        alert("لم يتم اختيار أي لاعب لإرسال الموارد إليه!");
        return;
      }
      let i = parseInt(K.value),
        s = a[i];
      if (!s || !s.isAlive) {
        alert("اللاعب المستهدف غير متوفر أو غير حي!");
        return;
      }
      let l = t.getAttribute("data-type"),
        n = parseInt(t.getAttribute("data-amount"));
      (l === "coins"
        ? e.coins >= n
          ? ((e.coins -= n),
            (s.coins += n),
            f(s.x + s.width / 2, s.y + s.height / 2, "#eab308", 15, 1),
            alert(`تم إرسال ${n} 💰 إلى اللاعب ${i + 1}!`))
          : alert("لا تملك رصيد كافٍ من الذهب!")
        : l === "gems"
          ? e.gems >= n
            ? ((e.gems -= n),
              (s.gems += n),
              f(s.x + s.width / 2, s.y + s.height / 2, "#06b6d4", 15, 1),
              alert(`تم إرسال ${n} 💎 إلى اللاعب ${i + 1}!`))
            : alert("لا تملك رصيد كافٍ من الجواهر!")
          : l === "fuel" &&
            (e.fuel >= n
              ? ((e.fuel = Math.max(0, e.fuel - n)),
                (s.fuel = Math.min(s.maxFuel, s.fuel + n)),
                f(s.x + s.width / 2, s.y + s.height / 2, "#10b981", 15, 1),
                alert(`تم إرسال ${n} ⛽ وقود إلى اللاعب ${i + 1}!`))
              : alert("لا تملك وقوداً كافياً للإرسال!")),
        ie(),
        (m === "p2p-host" || m === "p2p-join") &&
          $({
            type: "transfer",
            senderId: e.id,
            targetId: s.id,
            resourceType: l,
            amount: n,
          }));
    });
  });
function we(t, e, i) {
  if (
    (t.ownedShips || (t.ownedShips = ["defender"]),
    t.ownedWeapons || (t.ownedWeapons = ["normal"]),
    e === "weapon")
  )
    return (
      (t.weaponType = i),
      t.ownedWeapons.includes(i) || t.ownedWeapons.push(i),
      !0
    );
  if (e === "ship")
    return (
      (t.shipType = i),
      t.ownedShips.includes(i) || t.ownedShips.push(i),
      !0
    );
  if (e === "upgrade") {
    if (i === "maxFuel") return ((t.maxFuel += 20), (t.fuel += 20), !0);
    if (i === "nuclearReactor") {
      t.nuclearReactors = (t.nuclearReactors || 1) + 1;
      alert(`تمت إضافة مفاعل نووي بنجاح! المفاعلات الحالية: ${t.nuclearReactors} ☢️`);
      return !0;
    }
    if (i === "upgradeMaxHp")
      return (
        (t.maxHp += 25),
        (t.hp = Math.min(t.maxHp, t.hp + 25)),
        alert(
          `تمت ترقية الطاقة القصوى بنجاح! الطاقة القصوى الآن: ${t.maxHp} 🩸`,
        ),
        !0
      );
    if (i === "upgradeDamage") {
      t.bulletDamageModifier = (t.bulletDamageModifier || 1) + 0.25;
      let s = Math.round((t.bulletDamageModifier - 1) * 100);
      return (
        alert(`تمت ترقية قوة المقذوف بنجاح! زيادة الضرر الحالية: +${s}% ⚡`),
        !0
      );
    } else {
      if (i === "heal")
        return (
          (t.healsCount = (t.healsCount || 0) + 1),
          alert("تم شراء عدة الإصلاح بنجاح! 🔧 (تمت إضافتها للمخزن على الجنب)"),
          !0
        );
      if (i === "reflectiveShield")
        return t.hasReflectiveShield
          ? (alert("تمتلك الدرع العاكس بالفعل!"), !1)
          : ((t.hasReflectiveShield = !0),
            alert(
              "تم شراء الدرع العاكس المغناطيسي بنجاح! 🛡️⚡ (سيفعل تلقائياً كل 15 ثانية)",
            ),
            !0);
    }
  } else if (e === "drone") {
    if (i === "heal")
      return t.hasDroneHeal
        ? (alert("تمتلك درون الهيل بالفعل!"), !1)
        : ((t.hasDroneHeal = !0),
          (t.droneHealLevel = 1),
          (t.lastDroneHealAction = Date.now()),
          (t.lastDroneHealShot = Date.now()),
          !0);
    if (i === "fuel")
      return t.hasDroneFuel
        ? (alert("تمتلك درون الوقود بالفعل!"), !1)
        : ((t.hasDroneFuel = !0),
          (t.droneFuelLevel = 1),
          (t.lastDroneFuelAction = Date.now()),
          (t.lastDroneFuelShot = Date.now()),
          !0);
    if (i === "magnet")
      return t.hasDroneMagnet
        ? (alert("تمتلك درون المغناطيس بالفعل!"), !1)
        : ((t.hasDroneMagnet = !0),
          (t.droneMagnetLevel = 1),
          (t.lastDroneMagnetAction = Date.now()),
          !0);
  } else if (e === "drone-upgrade") {
    if (i === "heal")
      return t.hasDroneHeal
        ? (t.droneHealLevel++,
          alert(`تم ترقية درون الهيل للمستوى ${t.droneHealLevel}!`),
          !0)
        : (alert("يجب شراء درون الهيل أولاً!"), !1);
    if (i === "fuel")
      return t.hasDroneFuel
        ? (t.droneFuelLevel++,
          alert(`تم ترقية درون الوقود للمستوى ${t.droneFuelLevel}!`),
          !0)
        : (alert("يجب شراء درون الوقود أولاً!"), !1);
    if (i === "magnet")
      return t.hasDroneMagnet
        ? (t.droneMagnetLevel++,
          alert(`تم ترقية درون المغناطيس للمستوى ${t.droneMagnetLevel}!`),
          !0)
        : (alert("يجب شراء درون المغناطيس أولاً!"), !1);
  } else if (e === "consumable") {
    if (i === "selfRevive")
      return (
        (t.selfReviveKits = (t.selfReviveKits || 0) + 1),
        alert(
          "تم شراء حقنة الإنعاش الذاتي بنجاح! 💉 (تمت إضافتها للمخزن على الجنب)",
        ),
        !0
      );
    if (i === "secondLife")
      return (
        (t.secondLifes = (t.secondLifes || 0) + 1),
        alert(
          "تم شراء الفرصة الثانية الفائقة بنجاح! 🌟 (تمت إضافتها للمخزن على الجنب)",
        ),
        !0
      );
    if (i === "tempShield")
      return (
        (t.tempShieldsCount = (t.tempShieldsCount || 0) + 1),
        alert(
          "تم شراء درع الخمس ثوانٍ بنجاح! 🛡️ (تمت إضافته للمخزن على الجنب)",
        ),
        !0
      );
  } else if (e === "trail") {
    t.trailType = i;
    alert(`🎉 تم تفعيل مظهر محرك الدفع: ${i === 'rainbow' ? 'قوس قزح 🌈' : i === 'neon-blue' ? 'نيون أزرق 🟦' : 'الماتريكس 🟢'}`);
    return !0;
  }
  return !1;
}
let ve = !1,
  z = "ships",
  F = 0;
const Me = {
    defender: "السفينة المدافعة 🛡️",
    speedster: "السفينة السريعة ⚡",
    tank: "السفينة المدرعة 🧱",
    healer: "السفينة المعالجة ✚",
    ghost: "السفينة الشبحية 👻",
    vampire: "السفينة الخفاشية 🦇",
  },
  Te = {
    normal: "السلاح الأساسي 🔫",
    frost: "سلاح الجليد المبطئ ❄️",
    explosive: "سلاح المتفجرات المدمر 💥",
    piercing: "سلاح الليزر المخترق ⚡",
    blackhole: "سلاح الجاذبية الكونية 🕳️",
  };
function me(t) {
  if (!t) return "";
  if (t.startsWith("hybrid-")) {
    let e = t.replace("hybrid-", "").split("-"),
      i = Me[e[0]] || Te[e[0]] || e[0],
      s = Me[e[1]] || Te[e[1]] || e[1];
    return (
      (i = i
        .replace(
          /[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g,
          "",
        )
        .trim()),
      (s = s
        .replace(
          /[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g,
          "",
        )
        .trim()),
      `هجين: ${i} + ${s} 🧪`
    );
  }
  return Me[t] || Te[t] || t;
}
function Ve() {
  let t = null;
  return (
    a && a[F] ? (t = a[F]) : x && x[F] && (t = x[F]),
    {
      coins: t ? t.coins : 0,
      gems: t ? t.gems : 0,
      ownedShips: t ? t.ownedShips || ["defender"] : ["defender"],
      ownedWeapons: t ? t.ownedWeapons || ["normal"] : ["normal"],
    }
  );
}
function ne() {
  ((oe.innerHTML = ""), (G.innerHTML = ""));
  let t = Ve(),
    e = z === "ships" ? t.ownedShips : t.ownedWeapons;
  if (e.length < 2) {
    let i = document.createElement("option");
    ((i.value = ""),
      (i.innerText =
        z === "ships"
          ? "تحتاج لشراء سفن أكثر لدمجها!"
          : "تحتاج لشراء أسلحة أكثر لدمجها!"),
      oe.appendChild(i));
    let s = document.createElement("option");
    ((s.value = ""),
      (s.innerText =
        z === "ships" ? "شاهد المتجر لشراء سفن" : "شاهد المتجر لشراء أسلحة"),
      G.appendChild(s),
      (fe.disabled = !0));
    return;
  }
  ((fe.disabled = !1),
    e.forEach((i) => {
      let s = document.createElement("option");
      ((s.value = i), (s.innerText = me(i)), oe.appendChild(s));
      let l = document.createElement("option");
      ((l.value = i), (l.innerText = me(i)), G.appendChild(l));
    }),
    G.options.length > 1 && (G.selectedIndex = 1));
}
function Ze() {
  if (((ve = !ve), ve)) {
    (ke.classList.remove("hidden"),
      Ne.classList.add("hidden"),
      (X.innerHTML = ""));
    const t = a.length > 0 ? a.length : Math.max(1, x.length);
    for (let e = 0; e < t; e++) {
      let i = document.createElement("option");
      ((i.value = e), (i.innerText = `اللاعب ${e + 1}`), X.appendChild(i));
    }
    ((F = parseInt(X.value) || 0), ne());
  } else ke.classList.add("hidden");
}
Ie && Ie.addEventListener("click", Ze);
Fe && Fe.addEventListener("click", Ze);
X &&
  X.addEventListener("change", () => {
    ((F = parseInt(X.value) || 0), ne());
  });
q &&
  q.addEventListener("click", () => {
    ((z = "ships"),
      q.classList.add("primary"),
      q.classList.remove("secondary"),
      N.classList.add("secondary"),
      N.classList.remove("primary"),
      ne());
  });
N &&
  N.addEventListener("click", () => {
    ((z = "weapons"),
      N.classList.add("primary"),
      N.classList.remove("secondary"),
      q.classList.add("secondary"),
      q.classList.remove("primary"),
      ne());
  });
fe &&
  fe.addEventListener("click", () => {
    let t = oe.value,
      e = G.value;
    if (!t || !e) {
      alert("يرجى اختيار المكونات المُراد دمجها أولاً!");
      return;
    }
    if (t === e) {
      alert("لا يمكن دمج العنصر مع نفسه! اختر مكونين مختلفين.");
      return;
    }
    if (Ve().gems < 15) {
      alert("لا تملك جواهر كافية! تكلفة الدمج هي 15 جوهرة 💎.");
      return;
    }
    let s = null,
      l = !1;
    if ((a && a[F] ? ((s = a[F]), (l = !0)) : x && x[F] && (s = x[F]), !s))
      return;
    s.gems -= 15;
    let n = t.replace("hybrid-", ""),
      r = e.replace("hybrid-", ""),
      y = `hybrid-${Array.from(new Set([...n.split("-"), ...r.split("-")])).join("-")}`,
      g = "";
    (z === "ships"
      ? (s.ownedShips.includes(y) || s.ownedShips.push(y),
        (s.shipType = y),
        (g = me(y)))
      : (s.ownedWeapons.includes(y) || s.ownedWeapons.push(y),
        (s.weaponType = y),
        (g = me(y))),
      (at.innerText = g),
      Ne.classList.remove("hidden"),
      le(),
      ne(),
      Y(),
      l && f(u.width / 2, u.height / 2, "#a855f7", 80, 3),
      alert(`🎉 تم دمج وصياغة: ${g}`));
  });
function et() {
  if (m === "p2p-join") {
    alert("فقط الـ Host يمكنه اختيار العوالم الآن!");
    return;
  }
  ((V = !V),
    V ? (Ue.classList.remove("hidden"), tt()) : Ue.classList.add("hidden"));
}
function tt() {
  ze.forEach((t) => {
    let e = parseInt(t.getAttribute("data-world"));
    if (e <= j) {
      (t.classList.remove("locked"), t.removeAttribute("disabled"));
      let i = t.querySelector("p");
      i.innerText.includes("🔒") &&
        (i.innerText = i.innerText.replace(" 🔒", ""));
    }
    e === B ? t.classList.add("selected") : t.classList.remove("selected");
  });
}
ze.forEach((t) => {
  t.addEventListener("click", () => {
    let e = parseInt(t.getAttribute("data-world"));
    e <= j &&
      ((B = e),
      (w = (B - 1) * 5 + 1),
      (v = []),
      (E = []),
      (S = []),
      (o = []),
      (P = !1),
      tt());
  });
});
Mt.addEventListener("click", et);
rt.forEach((t) =>
  t.addEventListener("click", (e) => {
    ((m = e.currentTarget.dataset.mode),
      m === "local"
        ? ((Z = 1), O())
        : m === "local-coop"
          ? (ee.classList.add("hidden"), R && (R.style.display = "flex"))
          : (ee.classList.add("hidden"), Le.classList.remove("hidden")));
  }),
);
We &&
  We.forEach((t) =>
    t.addEventListener("click", () => {
      ((Z = parseInt(t.getAttribute("data-count")) || 2),
        (m = "local-coop"),
        R && (R.style.display = "none"),
        O());
    }),
  );
$e &&
  $e.addEventListener("click", () => {
    (R && (R.style.display = "none"), ee.classList.remove("hidden"));
  });
mt.addEventListener("click", () => {
  (Le.classList.add("hidden"),
    ee.classList.remove("hidden"),
    H && (H.destroy(), (H = null)));
});
yt.addEventListener("click", () => location.reload());
pt.addEventListener("click", () => {
  m === "p2p-host"
    ? ($({ type: "rematch" }), O())
    : (m === "local" || m === "local-coop") && O();
});
function Dt() {
  ((H = new Peer()),
    H.on("open", (t) => {
      dt.innerText = t;
    }),
    H.on("connection", (t) => {
      ((C = t), it());
    }));
}
Ae.addEventListener("click", () => {
  (Ae.classList.add("hidden"),
    ft.classList.remove("hidden"),
    (m = "p2p-host"),
    Dt());
});
ge.addEventListener("click", () => {
  const t = ct.value.trim();
  t &&
    ((ge.innerText = "جاري الاتصال..."),
    (H = new Peer()),
    H.on("open", () => {
      ((C = H.connect(t)),
        C.on("open", () => {
          ((m = "p2p-join"), it());
        }),
        C.on("error", () => {
          (ut.classList.remove("hidden"), (ge.innerText = "بدء المهمة"));
        }));
    }));
});
function it() {
  (C.on("data", (t) => {
    if (t.type === "start") O();
    else if (t.type === "ultimate_triggered") {
      const e = a[t.playerIdx];
      if (e && e.isAlive) {
        e.ultCharge = 0;
        let i = t.shipType;
        if (i.includes("defender")) {
          for (let s = 0; s < Math.PI * 2; s += (Math.PI * 2) / 24) {
            let l = Math.cos(s) * 500,
              n = Math.sin(s) * 500;
            (o.push(
              new p(
                e.x + e.width / 2 - 3,
                e.y + e.height / 2,
                n,
                "#a855f7",
                e.id,
                "explosive",
              ),
            ),
              (o[o.length - 1].vx = l),
              (o[o.length - 1].damageMultiplier = e.bulletDamageModifier || 1));
          }
          f(e.x + e.width / 2, e.y + e.height / 2, "#a855f7", 40, 3);
        } else
          i.includes("speedster")
            ? ((I = 5),
              f(e.x + e.width / 2, e.y + e.height / 2, "#38bdf8", 40, 3))
            : i.includes("tank")
              ? ((e.tankUltTimeLeft = 5),
                (e.tempShieldTimeLeft = 5),
                f(e.x + e.width / 2, e.y + e.height / 2, "#e11d48", 40, 3))
              : (i.includes("healer") || i.includes("hybrid")) &&
                a.forEach((s) => {
                  s.isAlive
                    ? ((s.hp = s.maxHp),
                      f(
                        s.x + s.width / 2,
                        s.y + s.height / 2,
                        "#10b981",
                        30,
                        2,
                      ))
                    : ((s.isAlive = !0),
                      (s.hp = s.maxHp / 2),
                      (s.fuel = Math.max(40, s.fuel)),
                      f(
                        s.x + s.width / 2,
                        s.y + s.height / 2,
                        "#10b981",
                        40,
                        3,
                      ));
                });
      }
    } else if (t.type === "sync") It(t);
    else if (t.type === "rematch") O();
    else if (t.type === "shoot")
      (o.push(
        new p(t.x + 29, t.y, -700, t.id === 1 ? "#3b82f6" : "#8b5cf6", t.id),
      ),
        f(t.x + 32, t.y, t.id === 1 ? "#3b82f6" : "#8b5cf6", 3, 2));
    else if (t.type === "enemy_shoot")
      o.push(new p(t.x + t.w / 2 - 3, t.y + t.h, 300, "#ef4444", "enemy"));
    else if (t.type === "player_input") {
      const e = a.find((i) => i.id === t.id);
      e && ((e.x = t.x), (e.y = t.y));
    } else if (t.type === "transfer") {
      const e = a.find((s) => s.id === t.senderId),
        i = a.find((s) => s.id === t.targetId);
      e &&
        i &&
        (t.resourceType === "coins"
          ? ((e.coins -= t.amount),
            (i.coins += t.amount),
            f(i.x + i.width / 2, i.y + i.height / 2, "#eab308", 15, 1))
          : t.resourceType === "gems"
            ? ((e.gems -= t.amount),
              (i.gems += t.amount),
              f(i.x + i.width / 2, i.y + i.height / 2, "#06b6d4", 15, 1))
            : t.resourceType === "fuel" &&
              ((e.fuel = Math.max(0, e.fuel - t.amount)),
              (i.fuel = Math.min(i.maxFuel, i.fuel + t.amount)),
              f(i.x + i.width / 2, i.y + i.height / 2, "#10b981", 15, 1)),
        ie());
    }
  }),
    m === "p2p-host" && (O(), setTimeout(() => $({ type: "start" }), 500)));
}
function $(t) {
  C && C.open && C.send(t);
}
const Et = ["#3b82f6", "#8b5cf6", "#a855f7", "#10b981", "#f59e0b", "#06b6d4"];
function bt(t) {
  const e = [],
    i = u.width / (t + 1);
  for (let s = 0; s < t; s++)
    e.push({ x: i * (s + 1) - 32, y: u.height - 100 });
  return e;
}
function O() {
  (ee.classList.add("hidden"),
    Le.classList.add("hidden"),
    R && (R.style.display = "none"),
    Ge.classList.add("hidden"),
    lt.classList.remove("hidden"),
    (a = []),
    (o = []),
    (v = []),
    (_ = []),
    (D = []),
    (E = []),
    (S = []),
    (M = []),
    (T = []),
    (P = !1),
    (w = 1),
    (ae = 0),
    (se = !1),
    (d = {}),
    xe.forEach((e) => {
      e && e.classList.add("hidden");
    }),
    (m === "p2p-host" || m === "p2p-join") && (Z = 2));
  const t = bt(Z);
  for (let e = 0; e < Z; e++) {
    const i = t[e],
      s = new Tt(e + 1, i.x, i.y, Et[e]);
    (x[e] &&
      ((s.coins = x[e].coins || 0),
      (s.gems = x[e].gems || 0),
      (s.shipType = x[e].shipType || "defender"),
      (s.weaponType = x[e].weaponType || "normal"),
      (s.hasDroneHeal = x[e].hasDroneHeal || !1),
      (s.hasDroneFuel = x[e].hasDroneFuel || !1),
      (s.hasDroneMagnet = x[e].hasDroneMagnet || !1),
      (s.droneHealLevel = x[e].droneHealLevel || 0),
      (s.droneFuelLevel = x[e].droneFuelLevel || 0),
      (s.droneMagnetLevel = x[e].droneMagnetLevel || 0),
      (s.ownedWeapons = x[e].ownedWeapons || ["normal"]),
      (s.ownedShips = x[e].ownedShips || ["defender"]),
      (s.hasReflectiveShield = x[e].hasReflectiveShield || !1),
      (s.healsCount = x[e].healsCount || 0),
      (s.selfReviveKits = x[e].selfReviveKits || 0),
      (s.secondLifes = x[e].secondLifes || 0),
      (s.tempShieldsCount = x[e].tempShieldsCount || 0),
      (s.bulletDamageModifier = x[e].bulletDamageModifier || 1),
      (s.maxHp = x[e].maxHp || 100),
      (s.hp = s.maxHp),
      (s.trailType = x[e].trailType || 'none'),
      (s.adRevivesCount = 0)),
      a.push(s),
      xe[e] && xe[e].classList.remove("hidden"));
  }
  ((m === "p2p-join" || m === "p2p-host") && je && (je.innerText = "(الزميل)"),
    Y(),
    (ce = performance.now()),
    cancelAnimationFrame(Ke),
    be(ce));
}
function Y() {
  (a.forEach((t, e) => {
    (He[e] && (He[e].style.width = `${Math.max(0, (t.hp / t.maxHp) * 100)}%`),
      Be[e] &&
        (Be[e].style.width = `${Math.max(0, (t.fuel / t.maxFuel) * 100)}%`),
      document.getElementById(`p${e+1}-energy`) && (document.getElementById(`p${e+1}-energy`).style.width = `${Math.min(100, Math.max(0, (t.energy / t.maxEnergy) * 100))}%`),
      document.getElementById(`p${e+1}-heat`) && (document.getElementById(`p${e+1}-heat`).style.width = `${Math.min(100, Math.max(0, (t.heat / t.maxHeat) * 100))}%`),
      Pe[e] && (Pe[e].innerText = t.score),
      Ce[e] && (Ce[e].innerText = t.coins),
      Re[e] && (Re[e].innerText = t.gems));
    
    // Glowing HUD titles update
    let badgeSpan = document.getElementById(`p${e + 1}-title-badge`);
    if (badgeSpan) {
      let titleText = "";
      let titleClass = "";
      if (t.coins >= 300) {
        titleText = "[الملياردير الفضائي 💰]";
        titleClass = "title-billionaire";
      } else if (t.healsCount > 0 || t.selfReviveKits > 0 || t.secondLifes > 0) {
        titleText = "[ملاك الرحمة 💉]";
        titleClass = "title-angel";
      } else if (w >= 10) {
        titleText = "[قاهر العمالقة 👑]";
        titleClass = "title-slayer";
      } else if (t.score >= 2000) {
        titleText = "[صائد الوحوش 👹]";
        titleClass = "title-hunter";
      }
      
      if (titleText) {
        badgeSpan.className = `glowing-title ${titleClass}`;
        badgeSpan.innerText = titleText + " ";
      } else {
        badgeSpan.className = "";
        badgeSpan.innerText = "";
      }
    }

    let i = document.getElementById(`p${e + 1}-ult`);
    if (i) {
      let l = t.ultCharge || 0;
      i.style.width = `${l}%`;
      let n = i.parentElement;
      l >= 100
        ? (n.classList.add("charged"), i.classList.add("charged"))
        : (n.classList.remove("charged"), i.classList.remove("charged"));
    }
    let s = document.getElementById(`p${e + 1}-hud`);
    s &&
      s.querySelectorAll(".inv-btn").forEach((n) => {
        let r = n.getAttribute("data-item"),
          c = n.querySelector(".count");
        c &&
          (r === "heal"
            ? (c.innerText = t.healsCount || 0)
            : r === "selfRevive"
              ? (c.innerText = t.selfReviveKits || 0)
              : r === "secondLife"
                ? (c.innerText = t.secondLifes || 0)
                : r === "tempShield" &&
                  (c.innerText = t.tempShieldsCount || 0));
      });
  }),
    (gt.innerText = w));
}
function Lt() {
  if (
    (o.forEach((t) => {
      t.ownerId === "enemy"
        ? a.forEach((e) => {
            if (e.isAlive) {
              if (
                e.isShieldActive &&
                L(
                  t.x,
                  t.y,
                  t.width,
                  t.height,
                  e.x - e.width * 0.3,
                  e.y - e.height * 0.3,
                  e.width * 1.6,
                  e.height * 1.6,
                )
              ) {
                ((t.vy = -Math.abs(t.vy)),
                  (t.vx = (Math.random() - 0.5) * 200),
                  (t.ownerId = e.id),
                  (t.color = "#06b6d4"),
                  f(t.x, t.y, "#06b6d4", 8, 1.5));
                return;
              }
              if (
                L(t.x, t.y, t.width, t.height, e.x, e.y, e.width, e.height) &&
                ((t.markedForDeletion = !0), m !== "p2p-join")
              ) {
                if (e.tempShieldTimeLeft && e.tempShieldTimeLeft > 0) {
                  f(t.x, t.y, "#38bdf8", 5);
                  return;
                }
                let i = Math.round(10 * (1 + (w - 1) * 0.12));
                ((e.hp -= i),
                  f(e.x + e.width / 2, e.y + e.height / 2, "#3b82f6", 10),
                  e.hp <= 0 && e.triggerDeathOrResurrection());
              }
            }
          })
        : (v.forEach((e) => {
            if (
              L(t.x, t.y, t.width, t.height, e.x, e.y, e.width, e.height) &&
              !t.markedForDeletion &&
              (!t.type.includes("piercing") &&
                !t.type.includes("blackhole") &&
                (t.markedForDeletion = !0),
              m !== "p2p-join")
            ) {
              t.type.includes("frost") && (e.slowTimer = 3);
              let i = 10;
              if (
                (t.type.includes("explosive")
                  ? (i = 30)
                  : t.type.includes("blackhole")
                    ? (i = 15)
                    : t.isSniper && (i = 40),
                (i = Math.round(i * (t.damageMultiplier || 1))),
                (e.hp -= i),
                f(t.x, t.y, e.color, 5),
                t.type.includes("explosive") &&
                  (f(t.x, t.y, "#ef4444", 40, 3),
                  v.forEach((s) => {
                    s !== e &&
                      Math.hypot(s.x - e.x, s.y - e.y) < 100 &&
                      (s.hp -= 20);
                  })),
                e.hp <= 0)
              ) {
                ((e.markedForDeletion = !0),
                  f(e.x + e.width / 2, e.y + e.height / 2, e.color, 20, 2));
                const s = a.find((n) => n.id === t.ownerId);
                s &&
                  ((s.score += e.maxHp),
                  (s.ultCharge = Math.min(100, (s.ultCharge || 0) + 8)),
                  s.shipType.includes("vampire") &&
                    s.hp < s.maxHp &&
                    ((s.hp = Math.min(s.maxHp, s.hp + 5)),
                    f(
                      s.x + s.width / 2,
                      s.y + s.height / 2,
                      "#7f1d1d",
                      10,
                      2,
                    )));
                let l = Math.random();
                l < 0.1
                  ? T.push(new de(e.x, e.y))
                  : l < 0.5
                    ? M.push(new re(e.x, e.y))
                    : l < 0.8 && D.push(new De(e.x, e.y));
              }
            }
          }),
          S.forEach((e) => {
            if (
              L(t.x, t.y, t.width, t.height, e.x, e.y, e.width, e.height) &&
              !t.markedForDeletion &&
              (!t.type.includes("piercing") &&
                !t.type.includes("blackhole") &&
                (t.markedForDeletion = !0),
              m !== "p2p-join")
            ) {
              let i = 10;
              if (
                (t.type.includes("explosive")
                  ? (i = 30)
                  : t.type.includes("blackhole") && (i = 15),
                (i = Math.round(i * (t.damageMultiplier || 1))),
                (e.hp -= i),
                f(t.x, t.y, "#9333ea", 5),
                t.type.includes("explosive") && f(t.x, t.y, "#ef4444", 40, 3),
                e.hp <= 0)
              ) {
                ((e.markedForDeletion = !0),
                  f(e.x + e.width / 2, e.y + e.height / 2, "#9333ea", 100, 3),
                  (P = !1),
                  w++);
                const s = a.find((l) => l.id === t.ownerId);
                (s &&
                  ((s.score += e.maxHp),
                  (s.gems += 5),
                  (s.coins += 50),
                  (s.ultCharge = Math.min(100, (s.ultCharge || 0) + 40))),
                  B * 5 < w &&
                    ((j = Math.max(j, B + 1)), m !== "p2p-join" && et()));
              }
            }
          }),
          E.forEach((e) => {
            if (
              L(t.x, t.y, t.width, t.height, e.x, e.y, e.width, e.height) &&
              !t.markedForDeletion &&
              !e.markedForDeletion &&
              (!t.type.includes("piercing") &&
                !t.type.includes("blackhole") &&
                (t.markedForDeletion = !0),
              m !== "p2p-join")
            ) {
              let i = 10;
              if (
                (t.type.includes("explosive")
                  ? (i = 30)
                  : t.type.includes("blackhole") && (i = 15),
                (e.hp -= i),
                f(t.x, t.y, "#78716c", 5),
                t.type.includes("explosive") && f(t.x, t.y, "#ef4444", 30, 2),
                e.hp <= 0)
              ) {
                ((e.markedForDeletion = !0),
                  f(
                    e.x + e.width / 2,
                    e.y + e.height / 2,
                    e.isGolden ? "#fbbf24" : "#78716c",
                    20,
                    2,
                  ));
                const s = a.find((l) => l.id === t.ownerId);
                if (s) {
                  s.score += e.isGolden ? 100 : Math.round(e.width);
                  let l = Math.random();
                  e.isGolden
                    ? (M.push(new re(e.x, e.y)), T.push(new de(e.x, e.y)))
                    : l < 0.08
                      ? T.push(new de(e.x, e.y))
                      : l < 0.25
                        ? M.push(new re(e.x, e.y))
                        : l < 0.4 && D.push(new De(e.x, e.y));
                }
              }
            }
          }));
    }),
    m !== "p2p-join" &&
      a.forEach((t) => {
        t.isAlive &&
          (v.forEach((e) => {
            if (L(t.x, t.y, t.width, t.height, e.x, e.y, e.width, e.height)) {
              if (
                ((e.markedForDeletion = !0),
                t.tankUltTimeLeft && t.tankUltTimeLeft > 0)
              ) {
                (f(e.x + e.width / 2, e.y + e.height / 2, "#e11d48", 25, 2),
                  (t.score += e.maxHp));
                return;
              }
              if (t.tempShieldTimeLeft && t.tempShieldTimeLeft > 0) {
                f(t.x + t.width / 2, t.y + t.height / 2, "#38bdf8", 15, 1.5);
                return;
              }
              if (t.shipType.includes("ghost") && Math.random() < 0.2) {
                f(t.x + t.width / 2, t.y + t.height / 2, "#ffffff", 10, 1);
                return;
              }
              let i = e.type === 5 ? 30 : 20;
              ((i = Math.round(i * (1 + (w - 1) * 0.12))),
                e.type === 5
                  ? f(t.x + t.width / 2, t.y + t.height / 2, "#f97316", 30, 2.5)
                  : f(t.x + t.width / 2, t.y + t.height / 2, "#ef4444", 20, 2),
                (t.hp -= t.shipType.includes("tank") ? Math.round(i / 2) : i),
                t.hp <= 0 && t.triggerDeathOrResurrection());
            }
          }),
          E.forEach((e) => {
            if (L(t.x, t.y, t.width, t.height, e.x, e.y, e.width, e.height)) {
              if (((e.markedForDeletion = !0), e.isGolden)) {
                ((t.coins += 10),
                  (t.gems += 2),
                  f(e.x + e.width / 2, e.y + e.height / 2, "#fbbf24", 20, 2));
                return;
              }
              if (t.tempShieldTimeLeft && t.tempShieldTimeLeft > 0) {
                f(t.x + t.width / 2, t.y + t.height / 2, "#38bdf8", 15, 1.5);
                return;
              }
              if (t.shipType.includes("ghost") && Math.random() < 0.2) {
                f(t.x + t.width / 2, t.y + t.height / 2, "#ffffff", 10, 1);
                return;
              }
              let i = Math.round(
                (t.shipType.includes("tank") ? 0 : 50) * (1 + (w - 1) * 0.1),
              );
              ((t.hp -= i),
                f(t.x + t.width / 2, t.y + t.height / 2, "#78716c", 30, 3),
                t.hp <= 0 && t.triggerDeathOrResurrection());
            }
          }),
          D.forEach((e) => {
            L(t.x, t.y, t.width, t.height, e.x, e.y, e.width, e.height) &&
              ((e.markedForDeletion = !0),
              (t.fuel = Math.min(t.maxFuel, t.fuel + 30)),
              f(t.x + t.width / 2, t.y + t.height / 2, "#f59e0b", 10, 1.5));
          }),
          M.forEach((e) => {
            L(t.x, t.y, t.width, t.height, e.x, e.y, e.width, e.height) &&
              ((e.markedForDeletion = !0), (t.coins += 5));
          }),
          T.forEach((e) => {
            L(t.x, t.y, t.width, t.height, e.x, e.y, e.width, e.height) &&
              ((e.markedForDeletion = !0), (t.gems += 1));
          }));
      }),
    m !== "p2p-join" && a.length >= 2)
  )
    for (let t = 0; t < a.length; t++) {
      let e = a[t];
      for (let i = 0; i < a.length; i++) {
        if (t === i) continue;
        let s = a[i];
        L(e.x, e.y, e.width, e.height, s.x, s.y, s.width, s.height) &&
          (!e.isAlive && s.isAlive
            ? ((e.isBeingRevived = !0),
              (e.reviveTimer += 1 / 60),
              Math.random() > 0.8 &&
                f(e.x + e.width / 2, e.y + e.height / 2, "#10b981", 1),
              e.reviveTimer >= 2 &&
                ((e.isAlive = !0),
                (e.hp = 50),
                (e.reviveTimer = 0),
                f(e.x + e.width / 2, e.y + e.height / 2, "#10b981", 30, 2)))
            : e.isAlive &&
              s.isAlive &&
              e.hp > s.hp + 2 &&
              ((e.hp -= 0.5),
              (s.hp += 0.5),
              Math.random() > 0.7 &&
                f(s.x + s.width / 2, s.y + s.height / 2, "#10b981", 1)));
      }
    }
}
function L(t, e, i, s, l, n, r, c) {
  return l < t + i && l + r > t && n < e + s && n + c > e;
}
function kt() {
  if (m === "p2p-join") return;
  if (w % 5 === 0 && !P) {
    ((P = !0), S.push(new Je(u.width / 2 - 75, -150)));
    return;
  }
  let t = w * 4 + 4;
  for (let i = 0; i < t; i++) {
    let s = Math.random(),
      l = 1;
    let c = typeof B !== "undefined" ? B : 1;
    let avail = [1, 2];
    if (c >= 2) avail.push(3, 13);
    if (c >= 3) avail.push(4, 14);
    if (c >= 4) avail.push(5);
    if (c >= 5) avail.push(6);
    if (c >= 6) avail.push(7);
    if (c >= 7) avail.push(8);
    if (c >= 8) avail.push(9);
    if (c >= 9) avail.push(10);
    if (c >= 10) avail.push(11);
    if (c >= 11) avail.push(12);

    if (c > 1 && s < 0.3) l = Math.min(14, c + 1);
    else l = avail[Math.floor(Math.random() * avail.length)];

    let n = Math.random() * (u.width - 60),
      r = -Math.random() * 500 - 100;

    let overlap = !1;
    if (m === "p2p-host") {
      v.forEach((e) => {
        if (Math.hypot(e.x - n, e.y - r) < 50) overlap = !0;
      });
    }
    if (!overlap) v.push(new Ye(n, r, l));
  }

  if (m === "p2p-host") {
    let syncEnemies = v.map((e) => ({
      x: e.x,
      y: e.y,
      type: e.type,
      id: e.id,
      hp: e.hp,
    }));
    $({ type: "spawn_wave", wave: w, enemies: syncEnemies });
  }

  if (w % 4 === 3) {
    ((_e = "⚠️ عاصفة نيازك ذهبية تقترب! 🌌✨"), (Se = 4));
    for (let i = 0; i < w + 3; i++)
      E.push(
        new Ee(
          Math.random() * u.width,
          -100 - Math.random() * 300,
          (Math.random() - 0.5) * 100,
          Math.random() * 80 + 80,
          Math.random() * 40 + 35,
          !0,
        ),
      );
  } else if (Math.random() > 0.5) {
    for (let i = 0; i < w; i++)
      E.push(
        new Ee(
          Math.random() * u.width,
          -100,
          (Math.random() - 0.5) * 100,
          Math.random() * 100 + 100,
          Math.random() * 40 + 30,
          !1,
        ),
      );
  }
  w++;
}
let U = 0;
function be(t) {
  if (se) return;
  let e = (t - ce) / 1e3;
  if (
    ((ce = t),
    e > 0.1 && (e = 0.1),
    h.clearRect(0, 0, u.width, u.height),
    (h.fillStyle = "#ffffff"),
    Xe.forEach((i) => {
      ((i.y += i.speed * e),
        i.y > u.height && ((i.y = 0), (i.x = Math.random() * u.width)),
        (h.globalAlpha = i.alpha),
        h.fillRect(i.x, i.y, i.size, i.size));
    }),
    (h.globalAlpha = 1),
    Se > 0 &&
      ((Se -= e),
      h.save(),
      (h.fillStyle = "#fcd34d"),
      (h.font = 'bold 30px "Cairo", Arial'),
      (h.textAlign = "center"),
      (h.textBaseline = "middle"),
      (h.shadowBlur = 10),
      (h.shadowColor = "#f59e0b"),
      h.fillText(_e, u.width / 2, u.height / 3),
      h.restore()),
    Q || V)
  ) {
    requestAnimationFrame(be);
    return;
  }
  if (
    (a.forEach((i) => i.update(e)),
    o.forEach((i) => i.update(e)),
    v.forEach((i) => i.update(e)),
    _.forEach((i) => i.update(e)),
    D.forEach((i) => i.update(e)),
    E.forEach((i) => i.update(e)),
    S.forEach((i) => i.update(e)),
    M.forEach((i) => i.update(e)),
    T.forEach((i) => i.update(e)),
    Lt(),
    a.forEach((i) => i.draw()),
    o.forEach((i) => i.draw()),
    v.forEach((i) => i.draw()),
    _.forEach((i) => i.draw()),
    D.forEach((i) => i.draw()),
    E.forEach((i) => i.draw()),
    S.forEach((i) => i.draw()),
    M.forEach((i) => i.draw()),
    T.forEach((i) => i.draw()),
    (o = o.filter((i) => !i.markedForDeletion)),
    (v = v.filter((i) => !i.markedForDeletion)),
    (_ = _.filter((i) => !i.markedForDeletion)),
    (D = D.filter((i) => !i.markedForDeletion)),
    (E = E.filter((i) => !i.markedForDeletion)),
    (S = S.filter((i) => !i.markedForDeletion)),
    (M = M.filter((i) => !i.markedForDeletion)),
    (T = T.filter((i) => !i.markedForDeletion)),
    Y(),
    m !== "p2p-join")
  )
    (v.length === 0 &&
      !P &&
      S.length === 0 &&
      ((ae -= e), ae <= 0 && (kt(), (ae = 3))),
      m === "p2p-host" &&
        ((U += e),
        U > 0.05 &&
          ((U = 0),
          $({
            type: "sync",
            players: a.map((i) => ({
              id: i.id,
              hp: i.hp,
              maxHp: i.maxHp,
              fuel: i.fuel,
              maxFuel: i.maxFuel,
              score: i.score,
              coins: i.coins,
              gems: i.gems,
              isAlive: i.isAlive,
              reviveTimer: i.reviveTimer,
              shipType: i.shipType,
              weaponType: i.weaponType,
              energy: i.energy,
              heat: i.heat,
              maxEnergy: i.maxEnergy,
              maxHeat: i.maxHeat,
              nuclearReactors: i.nuclearReactors,
            })),
            enemies: v.map((i) => ({
              id: i.id,
              x: i.x,
              y: i.y,
              type: i.type,
              hp: i.hp,
            })),
            fuelItems: D.map((i) => ({ id: i.id, x: i.x, y: i.y })),
            meteorites: E.map((i) => ({
              id: i.id,
              x: i.x,
              y: i.y,
              width: i.width,
            })),
            bosses: S.map((i) => ({ id: i.id, x: i.x, y: i.y, hp: i.hp })),
            coins: M.map((i) => ({ id: i.id, x: i.x, y: i.y })),
            gems: T.map((i) => ({ id: i.id, x: i.x, y: i.y })),
            isBossWave: P,
            wave: w,
            currentWorld: B,
            unlockedWorld: j,
          }))),
      a.every((i) => !i.isAlive) && st());
  else {
    let i = a[1];
    i &&
      i.isAlive &&
      ((U += e),
      U > 0.05 &&
        ((U = 0), $({ type: "player_input", id: 2, x: i.x, y: i.y })));
  }
  Ke = requestAnimationFrame(be);
}
function It(t) {
  (t.players.forEach((e) => {
    let i = a.find((s) => s.id === e.id);
    i &&
      ((i.hp = e.hp),
      (i.maxHp = e.maxHp),
      (i.fuel = e.fuel),
      (i.maxFuel = e.maxFuel),
      (i.score = e.score),
      (i.coins = e.coins),
      (i.gems = e.gems),
      (i.shipType = e.shipType),
      (i.weaponType = e.weaponType),
      (i.energy = e.energy),
      (i.heat = e.heat),
      (i.maxEnergy = e.maxEnergy),
      (i.maxHeat = e.maxHeat),
      (i.nuclearReactors = e.nuclearReactors),
      (i.isAlive = e.isAlive),
      e.reviveTimer !== void 0 && (i.reviveTimer = e.reviveTimer));
  }),
    t.enemies.forEach((e) => {
      let i = v.find((s) => s.id === e.id);
      if (i) ((i.x = e.x), (i.y = e.y), (i.hp = e.hp));
      else {
        let s = new Ye(e.x, e.y, e.type);
        ((s.id = e.id), (s.hp = e.hp), v.push(s));
      }
    }),
    (v = v.filter((e) => t.enemies.some((i) => i.id === e.id))),
    t.fuelItems.forEach((e) => {
      let i = D.find((s) => s.id === e.id);
      if (i) ((i.x = e.x), (i.y = e.y));
      else {
        let s = new De(e.x, e.y);
        ((s.id = e.id), D.push(s));
      }
    }),
    (D = D.filter((e) => t.fuelItems.some((i) => i.id === e.id))),
    t.meteorites.forEach((e) => {
      let i = E.find((s) => s.id === e.id);
      if (i) ((i.x = e.x), (i.y = e.y));
      else {
        let s = new Ee(e.x, e.y, 0, 0, e.width);
        ((s.id = e.id), E.push(s));
      }
    }),
    (E = E.filter((e) => t.meteorites.some((i) => i.id === e.id))),
    t.bosses.forEach((e) => {
      let i = S.find((s) => s.id === e.id);
      if (i) ((i.x = e.x), (i.y = e.y), (i.hp = e.hp));
      else {
        let s = new Je(e.x, e.y);
        ((s.id = e.id), (s.hp = e.hp), S.push(s));
      }
    }),
    (S = S.filter((e) => t.bosses.some((i) => i.id === e.id))),
    t.coins.forEach((e) => {
      let i = M.find((s) => s.id === e.id);
      if (i) ((i.x = e.x), (i.y = e.y));
      else {
        let s = new re(e.x, e.y);
        ((s.id = e.id), M.push(s));
      }
    }),
    (M = M.filter((e) => t.coins.some((i) => i.id === e.id))),
    t.gems.forEach((e) => {
      let i = T.find((s) => s.id === e.id);
      if (i) ((i.x = e.x), (i.y = e.y));
      else {
        let s = new de(e.x, e.y);
        ((s.id = e.id), T.push(s));
      }
    }),
    (T = T.filter((e) => t.gems.some((i) => i.id === e.id))),
    (P = t.isBossWave),
    (w = t.wave),
    (B = t.currentWorld),
    (j = t.unlockedWorld),
    Y(),
    a.every((e) => !e.isAlive) && st());
}
function st() {
  ((se = !0),
    le(),
    Ge.classList.remove("hidden"),
    (xt.innerText = `وصلت للموجة رقم ${w}`));
  let t = `
        <div style="color: #3b82f6">اللاعب 1: ${a[0].score} نقطة</div>
    `;
  (a[1] &&
    (t += `<div style="color: #8b5cf6">اللاعب 2: ${a[1].score} نقطة</div>`),
    (wt.innerHTML = t));
}
for (let t = 0; t < 100; t++)
  Xe.push({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    size: Math.random() * 2 + 1,
    speed: Math.random() * 50 + 20,
    alpha: Math.random() * 0.8 + 0.2,
  });
function W(t) {
  let e = a[t];
  if (!e || !e.isAlive || se) return;
  if (e.ultCharge < 100) {
    alert("القدرة الخارقة لم تشحن بالكامل بعد!");
    return;
  }
  e.ultCharge = 0;
  let i = e.shipType;
  if (i.includes("defender")) {
    for (let s = 0; s < Math.PI * 2; s += (Math.PI * 2) / 24) {
      let l = Math.cos(s) * 500,
        n = Math.sin(s) * 500;
      (o.push(
        new p(
          e.x + e.width / 2 - 3,
          e.y + e.height / 2,
          n,
          "#a855f7",
          e.id,
          "explosive",
        ),
      ),
        (o[o.length - 1].vx = l),
        (o[o.length - 1].damageMultiplier = e.bulletDamageModifier || 1));
    }
    (f(e.x + e.width / 2, e.y + e.height / 2, "#a855f7", 40, 3),
      alert("⚡ تم إطلاق إعصار البلازما الخارق!"));
  } else if (i.includes("speedster"))
    ((I = 5),
      f(e.x + e.width / 2, e.y + e.height / 2, "#38bdf8", 40, 3),
      alert("⏰ تم إبطاء الوقت بنسبة 80% لجميع الأعداء والمقذوفات!"));
  else if (i.includes("tank"))
    ((e.tankUltTimeLeft = 5),
      (e.tempShieldTimeLeft = 5),
      f(e.x + e.width / 2, e.y + e.height / 2, "#e11d48", 40, 3),
      alert("👹 طور المدرعة العملاقة نشط! اصطدم بالأعداء لتدميرهم!"));
  else if (i.includes("healer") || i.includes("hybrid"))
    (a.forEach((s) => {
      s.isAlive
        ? ((s.hp = s.maxHp),
          f(s.x + s.width / 2, s.y + s.height / 2, "#10b981", 30, 2))
        : ((s.isAlive = !0),
          (s.hp = s.maxHp / 2),
          (s.fuel = Math.max(40, s.fuel)),
          f(s.x + s.width / 2, s.y + s.height / 2, "#10b981", 40, 3));
    }),
      alert("💉 تم إطلاق موجة الشفاء الكبرى وإحياء جميع الزملاء الموتى!"));
  else {
    for (let s = 0; s < Math.PI * 2; s += (Math.PI * 2) / 12) {
      let l = Math.cos(s) * 450,
        n = Math.sin(s) * 450;
      (o.push(
        new p(
          e.x + e.width / 2 - 3,
          e.y + e.height / 2,
          n,
          "#06b6d4",
          e.id,
          "normal",
        ),
      ),
        (o[o.length - 1].vx = l),
        (o[o.length - 1].damageMultiplier = e.bulletDamageModifier || 1));
    }
    (f(e.x + e.width / 2, e.y + e.height / 2, "#06b6d4", 30, 2.5),
      alert("⚡ تم إطلاق انفجار الطاقة الموجي!"));
  }
  ((m === "p2p-host" || m === "p2p-join") &&
    $({ type: "ultimate_triggered", playerIdx: t, shipType: e.shipType }),
    le(),
    Y());
}
for (let t = 1; t <= 6; t++) {
  let e = document.getElementById(`p${t}-ult`);
  e &&
    e.parentElement.addEventListener("click", () => {
      W(t - 1);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
        const lastLogin = localStorage.getItem("spaceShooterLastLogin");
        const today = new Date().toDateString();
        
        if (lastLogin !== today) {
            const modal = document.getElementById("daily-reward-modal");
            const claimBtn = document.getElementById("claim-daily-btn");
            
            if (modal && claimBtn) {
                modal.classList.remove("hidden");
                
                claimBtn.addEventListener("click", () => {
                    if (!x || x.length === 0) {
                        x = [{ id: 1, hp: 100, maxHp: 100, fuel: 100, maxFuel: 100, coins: 0, gems: 0, score: 0 }];
                    }
                    
                    x[0].coins = (x[0].coins || 0) + 100;
                    x[0].gems = (x[0].gems || 0) + 5;
                    
                    localStorage.setItem("spaceShooterProgress", JSON.stringify({ players: x, unlockedWorld: typeof j !== 'undefined' ? j : 1 }));
                    localStorage.setItem("spaceShooterLastLogin", today);
                    
                    if (typeof a !== 'undefined' && a.length > 0) {
                        a[0].coins = x[0].coins;
                        a[0].gems = x[0].gems;
                        if (typeof Y === 'function') Y();
                    }
                    
                    modal.classList.add("hidden");
                }, { once: true });
            }
        }
        
        // Free Ad watch rewards (Gold & Gems) once per day
        const adGoldBtn = document.getElementById("ad-gold-btn");
        const adGemsBtn = document.getElementById("ad-gems-btn");
        
        if (adGoldBtn) {
            adGoldBtn.addEventListener("click", () => {
                const today = new Date().toDateString();
                const lastGoldAd = localStorage.getItem("spaceShooterLastGoldAd");
                if (lastGoldAd === today) {
                    alert("لقد استلمت هذه المكافأة اليوم بالفعل! عد غداً.");
                    return;
                }
                
                alert("📺 جاري تشغيل إعلان الذهب... الرجاء الانتظار 5 ثوانٍ.");
                setTimeout(() => {
                    let activePlayer = a[he] || a[0];
                    activePlayer.coins = (activePlayer.coins || 0) + 100;
                    
                    if (x && x[he]) {
                        x[he].coins = activePlayer.coins;
                    }
                    localStorage.setItem("spaceShooterLastGoldAd", today);
                    le();
                    Y();
                    ie();
                    alert("🎉 تم استلام 100 عملة ذهبية 💰 بنجاح!");
                }, 5000);
            });
        }
        
        if (adGemsBtn) {
            adGemsBtn.addEventListener("click", () => {
                const today = new Date().toDateString();
                const lastGemsAd = localStorage.getItem("spaceShooterLastGemsAd");
                if (lastGemsAd === today) {
                    alert("لقد استلمت هذه المكافأة اليوم بالفعل! عد غداً.");
                    return;
                }
                
                alert("📺 جاري تشغيل إعلان الجواهر... الرجاء الانتظار 5 ثوانٍ.");
                setTimeout(() => {
                    let activePlayer = a[he] || a[0];
                    activePlayer.gems = (activePlayer.gems || 0) + 5;
                    
                    if (x && x[he]) {
                        x[he].gems = activePlayer.gems;
                    }
                    localStorage.setItem("spaceShooterLastGemsAd", today);
                    le();
                    Y();
                    ie();
                    alert("🎉 تم استلام 5 جواهر 💎 بنجاح!");
                }, 5000);
            });
        }
    }, 500); // Wait a bit for game to load progress
});





const exploreBtn = document.getElementById("menu-explore-btn");
const exploreModal = document.getElementById("exploration-modal");
const closeExploreBtn = document.getElementById("close-explore-btn");
const exploreGrid = document.getElementById("exploration-grid");

let isExploreOpen = false;

function toggleExplore() {
    isExploreOpen = !isExploreOpen;
    if (isExploreOpen) {
        if (exploreModal) exploreModal.classList.remove("hidden");
        const mm = document.getElementById("main-menu");
        if (mm) mm.classList.add("hidden");
        renderExploreGrid();
    } else {
        if (exploreModal) exploreModal.classList.add("hidden");
        const mm = document.getElementById("main-menu");
        if (mm) mm.classList.remove("hidden");
    }
}

if (exploreBtn) exploreBtn.addEventListener("click", toggleExplore);
if (closeExploreBtn) closeExploreBtn.addEventListener("click", toggleExplore);

function checkDailyExploreReset() {
    if (!x || x.length === 0) return;
    let p = x[0];
    const lastExplore = localStorage.getItem("spaceShooterLastExplore");
    const today = new Date().toDateString();
    
    if (lastExplore !== today || !p.exploreMap) {
        p.explorePoints = 5;
        p.exploreMap = generateDeterministicMap();
        localStorage.setItem("spaceShooterLastExplore", today);
        localStorage.setItem("spaceShooterProgress", JSON.stringify({ players: x, unlockedWorld: typeof j !== 'undefined' ? j : 1 }));
    }
}

function renderExploreGrid() {
    if (!x || x.length === 0) {
        x = [{ id: 1, hp: 100, maxHp: 100, fuel: 100, maxFuel: 100, coins: 0, gems: 0, score: 0 }];
    }
    
    checkDailyExploreReset();
    
    let p = x[0];
    
    let ep = document.getElementById("explore-points");
    if (ep) ep.innerText = p.explorePoints;
    
    let cDisp = document.getElementById("explore-coins-display");
    let gDisp = document.getElementById("explore-gems-display");
    if (cDisp) cDisp.innerText = p.coins || 0;
    if (gDisp) gDisp.innerText = p.gems || 0;
    
    if (exploreGrid) {
        exploreGrid.innerHTML = "";
        
        p.exploreMap.forEach((node, index) => {
            let btn = document.createElement("button");
            btn.style.width = "100%";
            btn.style.padding = "10px";
            btn.style.borderRadius = "12px";
            btn.style.border = node.explored ? "2px solid #10b981" : "2px solid #3b82f6";
            btn.style.background = node.explored ? "rgba(16, 185, 129, 0.2)" : "rgba(30, 41, 59, 0.8)";
            btn.style.color = "white";
            btn.style.cursor = node.explored ? "default" : "pointer";
            btn.style.display = "flex";
            btn.style.flexDirection = "column";
            btn.style.alignItems = "center";
            btn.style.justifyContent = "center";
            btn.style.transition = "transform 0.2s, box-shadow 0.2s";
            btn.style.gap = "5px";
            
            btn.onmouseover = () => { if(!node.explored) { btn.style.transform = "scale(1.05)"; btn.style.boxShadow = "0 0 10px rgba(59,130,246,0.5)"; } };
            btn.onmouseout = () => { btn.style.transform = "scale(1)"; btn.style.boxShadow = "none"; };
            
            let iconDiv = document.createElement("div");
            iconDiv.style.fontSize = "1.5rem";
            iconDiv.innerText = node.explored ? "✅" : node.icon;
            
            let rewardDiv = document.createElement("div");
            rewardDiv.style.fontSize = "0.9rem";
            rewardDiv.style.fontWeight = "bold";
            rewardDiv.innerText = node.explored ? "تم الاستلام" : node.desc;
            
            btn.appendChild(iconDiv);
            btn.appendChild(rewardDiv);
            
            if (!node.explored) {
                btn.addEventListener("click", () => exploreNode(index));
            }
            exploreGrid.appendChild(btn);
        });
    }
}

function generateDeterministicMap() {
    return [
        { icon: "🪐", desc: "50 💰", rewardType: "coins", amount: 50, explored: false },
        { icon: "☄️", desc: "2 💎", rewardType: "gems", amount: 2, explored: false },
        { icon: "🛸", desc: "1 🔧", rewardType: "heals", amount: 1, explored: false },
        { icon: "🛰️", desc: "100 💰", rewardType: "coins", amount: 100, explored: false },
        { icon: "🌟", desc: "3 💎", rewardType: "gems", amount: 3, explored: false },
        { icon: "🚀", desc: "75 💰", rewardType: "coins", amount: 75, explored: false },
        { icon: "🌑", desc: "1 🛡️", rewardType: "tempShield", amount: 1, explored: false },
        { icon: "🌌", desc: "150 💰", rewardType: "coins", amount: 150, explored: false },
        { icon: "🛰️", desc: "5 💎", rewardType: "gems", amount: 5, explored: false }
    ];
}

function exploreNode(index) {
    let p = x[0];
    if (p.explorePoints <= 0) {
        alert("لقد استنفدت نقاط الاستكشاف الخاصة بك لهذا اليوم! عد غداً للحصول على نقاط جديدة.");
        return;
    }
    p.explorePoints--;
    p.exploreMap[index].explored = true;
    
    let node = p.exploreMap[index];
    if (node.rewardType === "coins") {
        p.coins = (p.coins || 0) + node.amount;
        alert(`تم استكشاف القطاع بنجاح! حصلت على ${node.amount} 💰`);
    } else if (node.rewardType === "gems") {
        p.gems = (p.gems || 0) + node.amount;
        alert(`تم استكشاف القطاع بنجاح! حصلت على ${node.amount} 💎`);
    } else if (node.rewardType === "heals") {
        p.healsCount = (p.healsCount || 0) + node.amount;
        alert(`تم استكشاف القطاع بنجاح! حصلت على ${node.amount} 🔧`);
    } else if (node.rewardType === "tempShield") {
        p.tempShieldsCount = (p.tempShieldsCount || 0) + node.amount;
        alert(`تم استكشاف القطاع بنجاح! حصلت على ${node.amount} 🛡️`);
    }
    
    if (typeof a !== 'undefined' && a.length > 0) {
        a[0].coins = p.coins;
        a[0].gems = p.gems;
        a[0].healsCount = p.healsCount;
        a[0].tempShieldsCount = p.tempShieldsCount;
        if (typeof Y === 'function') Y();
    }
    
    localStorage.setItem("spaceShooterProgress", JSON.stringify({ players: x, unlockedWorld: typeof j !== 'undefined' ? j : 1 }));
    renderExploreGrid();
}
