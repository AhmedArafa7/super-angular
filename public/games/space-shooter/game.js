// Elements
const mainMenu = document.getElementById('main-menu');
const p2pMenu = document.getElementById('p2p-menu');
const gameScreen = document.getElementById('game-screen');
const gameOverScreen = document.getElementById('game-over-screen');

// Shop UI
const shopModal = document.getElementById('shop-modal');
const closeShopBtn = document.getElementById('close-shop-btn');
const shopCoinsEl = document.getElementById('shop-coins');
const shopGemsEl = document.getElementById('shop-gems');
const buyBtns = document.querySelectorAll('.buy-btn');

const modeBtns = document.querySelectorAll('.mode-btn');

const createRoomBtn = document.getElementById('create-room-btn');
const roomIdDisplay = document.getElementById('roomIdDisplay');
const roomInfo = document.getElementById('room-info');
const joinRoomIdInput = document.getElementById('join-room-id');
const joinRoomBtn = document.getElementById('join-room-btn');
const joinError = document.getElementById('join-error');
const backToMenuBtn = document.getElementById('back-to-menu-btn');
const menuBtn = document.getElementById('menu-btn');
const rematchBtn = document.getElementById('rematch-btn');

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const p2Hud = document.getElementById('p2-hud');
const p1Hp = document.getElementById('p1-hp');
const p2Hp = document.getElementById('p2-hp');
const p1Fuel = document.getElementById('p1-fuel');
const p2Fuel = document.getElementById('p2-fuel');
const p1CoinsEl = document.getElementById('p1-coins');
const p1GemsEl = document.getElementById('p1-gems');
const p2CoinsEl = document.getElementById('p2-coins');
const p2GemsEl = document.getElementById('p2-gems');
const p1ScoreEl = document.getElementById('p1-score');
const p2ScoreEl = document.getElementById('p2-score');
const waveNumberEl = document.getElementById('wave-number');
const resultTitle = document.getElementById('result-title');
const resultDesc = document.getElementById('result-desc');
const finalStats = document.getElementById('final-stats');
const p2ControlsHint = document.getElementById('p2-controls-hint');

// Game State
let activeMode = 'local'; // local, local-coop, p2p-host, p2p-join
let isGameOver = false;
let animationId;
let lastTime = 0;
let wave = 1;
let waveTimer = 0;
let keys = {};

// P2P State
let peer = null;
let conn = null;

// Game Entities
let players = [];
let bullets = [];
let enemies = [];
let particles = [];
let stars = [];
let fuelItems = [];
let meteorites = [];
let bosses = [];
let coins = [];
let gems = [];
let isBossWave = false;
let isShopOpen = false;
let isMapOpen = false;
let currentWorld = 1;
let unlockedWorld = 1;

let savedCoins = 0;
let savedGems = 0;
let savedShipType = 'defender';
let savedWeaponType = 'normal';

function loadProgress() {
    const saved = localStorage.getItem('spaceShooterProgress');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            savedCoins = data.coins || 0;
            savedGems = data.gems || 0;
            unlockedWorld = data.unlockedWorld || 1;
            savedShipType = data.shipType || 'defender';
            savedWeaponType = data.weaponType || 'normal';
        } catch(e) {}
    }
}
function saveProgress() {
    if (players && players[0]) {
        savedCoins = players[0].coins;
        savedGems = players[0].gems;
        savedShipType = players[0].shipType;
        savedWeaponType = players[0].weaponType;
    }
    localStorage.setItem('spaceShooterProgress', JSON.stringify({
        coins: savedCoins,
        gems: savedGems,
        unlockedWorld: unlockedWorld,
        shipType: savedShipType,
        weaponType: savedWeaponType
    }));
}
loadProgress();

// Map UI
const worldsMapModal = document.getElementById('worlds-map-modal');
const closeMapBtn = document.getElementById('close-map-btn');
const worldBtns = document.querySelectorAll('.world-btn');

class Player {
    constructor(id, x, y, color) {
        this.id = id; // 1 or 2
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 40;
        this.color = color;
        this.speed = 500; // pixels per sec
        this.maxHp = 100;
        this.hp = 100;
        this.maxFuel = 100;
        this.fuel = 100; 
        this.score = 0;
        this.coins = 0;
        this.gems = 0;
        this.shipType = 'defender'; // defender, speedster, tank, healer
        this.weaponType = 'normal'; // normal, frost, explosive, piercing
        this.lastShot = 0;
        this.fireRate = 150; // ms
        this.isAlive = true;
        this.isHost = (id === 1);
        this.reviveTimer = 0;
    }
    draw() {
        if (!this.isAlive) {
            // Draw wreck / revive progress
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = '#475569';
            ctx.beginPath();
            ctx.moveTo(this.width / 2, 0);
            ctx.lineTo(this.width, this.height);
            ctx.lineTo(this.width / 2, this.height - 10);
            ctx.lineTo(0, this.height);
            ctx.closePath();
            ctx.fill();
            
            if(this.reviveTimer > 0) {
                ctx.globalAlpha = 1.0;
                ctx.beginPath();
                ctx.arc(this.width/2, this.height/2, 30, -Math.PI/2, (-Math.PI/2) + (Math.PI * 2 * (this.reviveTimer / 2.0)));
                ctx.strokeStyle = '#10b981';
                ctx.lineWidth = 4;
                ctx.stroke();
            }
            ctx.restore();
            return;
        }
        ctx.save();
        ctx.translate(this.x, this.y);
        let bColor = this.getBulletColor();
        ctx.globalAlpha = this.isBeingRevived ? 0.5 : 1.0;
        
        // Draw the spaceship SVG using Canvas paths!
        ctx.scale(this.width / 200, this.height / 200);

        // Exhaust Fire
        let timeOffset = Math.sin(Date.now() / 100) * 10; 
        ctx.fillStyle = '#ff9800'; 
        ctx.beginPath();
        ctx.moveTo(85, 160);
        ctx.quadraticCurveTo(100, 200 + timeOffset, 115, 160);
        ctx.fill();

        // Wings (Bullet Color!)
        ctx.fillStyle = bColor;
        ctx.beginPath();
        ctx.moveTo(100, 40); ctx.lineTo(160, 140); ctx.lineTo(130, 150); ctx.lineTo(100, 120); ctx.lineTo(70, 150); ctx.lineTo(40, 140); ctx.closePath();
        ctx.fill();
        
        // Wing shadow
        ctx.fillStyle = "rgba(0,0,0,0.2)";
        ctx.beginPath();
        ctx.moveTo(100, 40); ctx.lineTo(160, 140); ctx.lineTo(130, 150); ctx.lineTo(100, 120); ctx.closePath();
        ctx.fill();

        // Body
        let bodyGrad = ctx.createLinearGradient(0, 0, 200, 0);
        bodyGrad.addColorStop(0, "#b0bec5");
        bodyGrad.addColorStop(0.5, "#eceff1");
        bodyGrad.addColorStop(1, "#90a4ae");
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.moveTo(100, 20); ctx.lineTo(125, 100); ctx.lineTo(120, 160); ctx.lineTo(80, 160); ctx.lineTo(75, 100); ctx.closePath();
        ctx.fill();

        // Cockpit
        ctx.fillStyle = "#29b6f6";
        ctx.beginPath();
        ctx.ellipse(100, 85, 14, 24, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Cockpit highlight
        ctx.save();
        ctx.translate(96, 78);
        ctx.rotate(-15 * Math.PI / 180);
        ctx.fillStyle = "#e1f5fe";
        ctx.beginPath();
        ctx.ellipse(0, 0, 4, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Engine details
        ctx.fillStyle = "#263238";
        ctx.beginPath(); ctx.roundRect(83, 155, 34, 8, 2); ctx.fill();
        ctx.fillStyle = "#37474f";
        ctx.fillRect(88, 163, 24, 4);

        ctx.restore();
    }
    
    getBulletColor() {
        if (this.weaponType === 'frost') return '#60a5fa';
        if (this.weaponType === 'explosive') return '#ef4444';
        if (this.weaponType === 'piercing' || this.shipType === 'sniper') return '#fcd34d';
        return this.color;
    }
        
    update(dt) {
        if (!this.isAlive) return;
        
        let dx = 0;
        let dy = 0;

        let canMoveP1 = (this.id === 1 && (activeMode === 'local' || activeMode === 'local-coop' || activeMode === 'p2p-host'));
        let canMoveP2Local = (this.id === 2 && activeMode === 'local-coop');
        let canMoveP2P2P = (this.id === 2 && activeMode === 'p2p-join');

        if (canMoveP1 || canMoveP2P2P) {
            // Main controls (Arrows + Space)
            if (keys['ArrowLeft']) dx = -1;
            if (keys['ArrowRight']) dx = 1;
            if (keys['ArrowUp']) dy = -1;
            if (keys['ArrowDown']) dy = 1;
            if (keys[' '] && Date.now() - this.lastShot > this.fireRate) {
                this.shoot();
            }
        } else if (canMoveP2Local) {
            // Secondary controls (WASD + F)
            if (keys['a'] || keys['A']) dx = -1;
            if (keys['d'] || keys['D']) dx = 1;
            if (keys['w'] || keys['W']) dy = -1;
            if (keys['s'] || keys['S']) dy = 1;
            if ((keys['f'] || keys['F']) && Date.now() - this.lastShot > this.fireRate) {
                this.shoot();
            }
        }
        
        let currentSpeed = this.speed;
        if(this.shipType === 'speedster') currentSpeed = 750;
        else if(this.shipType === 'tank') currentSpeed = 300;
        else if(this.shipType === 'sniper') currentSpeed = 250;

        this.x += dx * currentSpeed * dt;
        this.y += dy * currentSpeed * dt;

        // Bounds
        this.x = Math.max(0, Math.min(canvas.width - this.width, this.x));
        this.y = Math.max(0, Math.min(canvas.height - this.height, this.y));
        
        // Fuel Depletion
        if (activeMode !== 'p2p-join') { // Host handles fuel depletion
            this.fuel = Math.max(0, this.fuel - 2 * dt);
            if (this.fuel <= 0) {
                this.hp -= 5 * dt; // Take damage if out of fuel
                if(this.hp <= 0 && this.isAlive) {
                    this.isAlive = false;
                    createParticles(this.x + this.width/2, this.y + this.height/2, this.color, 30, 2);
                }
            }
            // Healer passive
            if(this.shipType === 'healer' && this.isAlive && this.hp > 0 && this.hp < this.maxHp) {
                this.hp = Math.min(this.maxHp, this.hp + 2 * dt);
            }
            // Magnet passive
            if(this.shipType === 'speedster' && this.isAlive) {
                const magnetRadius = 250;
                let pull = (item) => {
                    let dist = Math.hypot(item.x - this.x, item.y - this.y);
                    if(dist < magnetRadius) {
                        let angle = Math.atan2(this.y + this.height/2 - item.y, this.x + this.width/2 - item.x);
                        item.x += Math.cos(angle) * 300 * dt;
                        item.y += Math.sin(angle) * 300 * dt;
                    }
                };
                coins.forEach(pull);
                gems.forEach(pull);
                fuelItems.forEach(pull);
            }
        }

        if(this.reviveTimer > 0 && !this.isBeingRevived) {
            this.reviveTimer = Math.max(0, this.reviveTimer - dt);
        }
        this.isBeingRevived = false;
    }
    shoot() {
        let currentFireRate = this.fireRate;
        if (this.shipType === 'sniper') currentFireRate = 600; // slow fire

        if (Date.now() - this.lastShot < currentFireRate) return;
        this.lastShot = Date.now();
        
        if (this.weaponType === 'frost') {
            bullets.push(new Bullet(this.x + this.width / 2 - 4, this.y, -600, '#60a5fa', this.id, 'frost'));
        } else if (this.weaponType === 'explosive') {
            bullets.push(new Bullet(this.x + this.width / 2 - 6, this.y, -400, '#ef4444', this.id, 'explosive'));
            bullets[bullets.length-1].width = 12;
        } else if (this.weaponType === 'piercing' || this.shipType === 'sniper') {
            bullets.push(new Bullet(this.x + this.width / 2 - 2, this.y, -1000, '#fcd34d', this.id, 'piercing'));
            bullets[bullets.length-1].height = 30;
            if (this.shipType === 'sniper') bullets[bullets.length-1].isSniper = true;
        } else {
            // Normal
            bullets.push(new Bullet(this.x + this.width / 2 - 3, this.y, -700, this.color, this.id, 'normal'));
        }

        createParticles(this.x + this.width / 2, this.y, this.color, 3, 2);
        
        if (activeMode === 'p2p-host' || activeMode === 'p2p-join') {
            broadcast({ type: 'shoot', id: this.id, x: this.x, y: this.y, wType: this.weaponType });
        }
    }
}

class Bullet {
    constructor(x, y, vy, color, ownerId, type = 'normal') {
        this.x = x;
        this.y = y;
        this.width = 6;
        this.height = 15;
        this.vy = vy;
        this.color = color;
        this.ownerId = ownerId; // 1, 2, or 'enemy'
        this.type = type; // normal, frost, explosive, piercing
        this.markedForDeletion = false;
    }
    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
    update(dt) {
        this.y += this.vy * dt;
        if(this.vx) this.x += this.vx * dt; // Support diagonal boss bullets
        if (this.y < -50 || this.y > canvas.height + 50 || this.x < -50 || this.x > canvas.width + 50) this.markedForDeletion = true;
    }
}

class Enemy {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 1 = basic, 2 = fast, 3 = tank
        this.width = type === 3 ? 60 : 40;
        this.height = type === 3 ? 60 : 40;
        this.hp = type === 3 ? 50 : type * 10;
        this.maxHp = this.hp;
        this.speed = type === 2 ? 150 : 80;
        this.color = type === 1 ? '#10b981' : (type === 2 ? '#f59e0b' : '#ef4444');
        this.markedForDeletion = false;
        this.lastShot = Date.now() + Math.random() * 2000;
        this.fireRate = type === 3 ? 1500 : 3000;
        this.id = Math.random().toString(36).substr(2, 9);
    }
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.font = this.type === 3 ? '50px "Segoe UI Emoji", Arial' : '35px "Segoe UI Emoji", Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        let emoji = this.type === 1 ? '👾' : (this.type === 2 ? '👽' : '👹');
        ctx.fillText(emoji, this.width/2, this.height/2);
        ctx.restore();
    }
    update(dt) {
        this.y += this.speed * dt;
        
        // Host controls enemy shooting
        if (activeMode !== 'p2p-join') {
            if (this.type !== 2 && Date.now() - this.lastShot > this.fireRate) {
                this.lastShot = Date.now();
                bullets.push(new Bullet(this.x + this.width / 2 - 3, this.y + this.height, 300, '#ef4444', 'enemy'));
                if (activeMode === 'p2p-host') broadcast({ type: 'enemy_shoot', x: this.x, y: this.y, w: this.width, h: this.height });
            }
        }

        if (this.y > canvas.height + 50) this.markedForDeletion = true;
    }
}

class FuelItem {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 25;
        this.vy = 80;
        this.markedForDeletion = false;
        this.id = Math.random().toString(36).substr(2, 9);
    }
    draw() {
        ctx.font = '20px "Segoe UI Emoji", Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⛽', this.x + this.width/2, this.y + this.height/2);
    }
    update(dt) {
        this.y += this.vy * dt;
        if (this.y > canvas.height + 50) this.markedForDeletion = true;
    }
}

class Coin {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 15;
        this.height = 15;
        this.vy = 50;
        this.markedForDeletion = false;
        this.id = Math.random().toString(36).substr(2, 9);
    }
    draw() {
        ctx.font = '15px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('💰', this.x + this.width/2, this.y + this.height/2);
    }
    update(dt) {
        this.y += this.vy * dt;
        if (this.y > canvas.height + 50) this.markedForDeletion = true;
    }
}

class Gem {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 15;
        this.height = 15;
        this.vy = 60;
        this.markedForDeletion = false;
        this.id = Math.random().toString(36).substr(2, 9);
    }
    draw() {
        ctx.font = '15px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('💎', this.x + this.width/2, this.y + this.height/2);
    }
    update(dt) {
        this.y += this.vy * dt;
        if (this.y > canvas.height + 50) this.markedForDeletion = true;
    }
}

class Meteorite {
    constructor(x, y, vx, vy, size) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.width = size;
        this.height = size;
        this.markedForDeletion = false;
        this.id = Math.random().toString(36).substr(2, 9);
    }
    draw() {
        ctx.font = this.width + 'px "Segoe UI Emoji", Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🪨', this.x + this.width/2, this.y + this.height/2);
    }
    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        if (this.y > canvas.height + 100 || this.x < -100 || this.x > canvas.width + 100) {
            this.markedForDeletion = true;
        }
    }
}

class Boss {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 150;
        this.height = 100;
        this.hp = 1500;
        this.maxHp = 1500;
        this.speed = 100;
        this.dir = 1;
        this.markedForDeletion = false;
        this.id = 'boss_1';
        this.lastShot = Date.now();
        this.phase = 1;
    }
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.font = '100px "Segoe UI Emoji", Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('😈', this.width/2, this.height/2);
        
        // Boss HP Bar
        ctx.fillStyle = '#000';
        ctx.fillRect(0, -15, this.width, 10);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(0, -15, this.width * (this.hp / this.maxHp), 10);
        
        ctx.restore();
    }
    update(dt) {
        if (this.y < 50) {
            this.y += 50 * dt; // Boss enters the screen!
        } else {
            // Move side to side
            this.x += this.speed * this.dir * dt;
            if (this.x <= 0 || this.x + this.width >= canvas.width) {
                this.dir *= -1;
                this.x = Math.max(0, Math.min(canvas.width - this.width, this.x));
            }
        }

        // Host controls shooting
        if (activeMode !== 'p2p-join') {
            if (Date.now() - this.lastShot > 1000) {
                this.lastShot = Date.now();
                // Spread shot
                for(let i=-2; i<=2; i++) {
                    bullets.push(new Bullet(this.x + this.width/2, this.y + this.height, 300 + Math.abs(i)*50, '#f59e0b', 'enemy'));
                    // Need vx for bullet if diagonal, but we'll just keep it simple straight down for now, or add small dx in bullet?
                    // Actually, let's keep it simple.
                    let b = bullets[bullets.length-1];
                    b.vx = i * 100; // Adding custom property dynamically
                }
            }
        }
    }
}

class Particle {
    constructor(x, y, color, speedScale) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 300 * speedScale;
        this.vy = (Math.random() - 0.5) * 300 * speedScale;
        this.size = Math.random() * 4 + 1;
        this.color = color;
        this.life = 1.0;
        this.decay = Math.random() * 0.02 + 0.02;
        this.markedForDeletion = false;
    }
    draw() {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.life -= this.decay;
        if (this.life <= 0) this.markedForDeletion = true;
    }
}

function createParticles(x, y, color, count, speedScale = 1) {
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y, color, speedScale));
    }
}

// Window resize
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Input
// Key Listeners
window.addEventListener('keydown', e => {
    keys[e.key] = true;
    if (e.key === 'b' || e.key === 'B') {
        toggleShop();
    }
});
window.addEventListener('keyup', e => {
    keys[e.key] = false;
});

// Shop Logic
function toggleShop() {
    if (activeMode === 'p2p-join') {
        alert("فقط الـ Host يمكنه إيقاف اللعبة لفتح المتجر الآن!");
        return; // Alternatively, allow local shop without pausing the whole game if async
    }
    isShopOpen = !isShopOpen;
    if (isShopOpen) {
        shopModal.classList.remove('hidden');
        updateShopUI();
    } else {
        shopModal.classList.add('hidden');
        saveProgress();
        // Removed requestAnimationFrame(animate) to prevent duplicate game loops!
    }
}

function updateShopUI() {
    let p = players[0]; // For local or host, player 0 is main. In proper P2P, each buys for themselves.
    // Assuming local player uses player[0] wallet for now (or local coop shared wallet).
    shopCoinsEl.innerText = p.coins;
    shopGemsEl.innerText = p.gems;
}

closeShopBtn.addEventListener('click', toggleShop);

buyBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        let p = players[0];
        let type = btn.getAttribute('data-type');
        let item = btn.getAttribute('data-item');
        let cost = parseInt(btn.getAttribute('data-cost'));
        let currency = btn.getAttribute('data-currency');

        if (currency === 'coins' && p.coins >= cost) {
            p.coins -= cost;
            applyPurchase(p, type, item);
        } else if (currency === 'gems' && p.gems >= cost) {
            p.gems -= cost;
            applyPurchase(p, type, item);
        } else {
            alert("رصيد غير كافٍ!");
        }
        updateShopUI();
    });
});

function applyPurchase(p, type, item) {
    if (type === 'weapon') {
        p.weaponType = item;
    } else if (type === 'ship') {
        p.shipType = item;
    } else if (type === 'upgrade') {
        if (item === 'maxFuel') {
            p.maxFuel += 20;
            p.fuel += 20;
        } else if (item === 'heal') {
            p.hp = p.maxHp;
        }
    }
}

function toggleMap() {
    if (activeMode === 'p2p-join') {
        alert("فقط الـ Host يمكنه اختيار العوالم الآن!");
        return; 
    }
    isMapOpen = !isMapOpen;
    if (isMapOpen) {
        worldsMapModal.classList.remove('hidden');
        updateMapUI();
    } else {
        worldsMapModal.classList.add('hidden');
        // Prevent duplicate loop
    }
}

function updateMapUI() {
    worldBtns.forEach(btn => {
        let w = parseInt(btn.getAttribute('data-world'));
        if (w <= unlockedWorld) {
            btn.classList.remove('locked');
            btn.removeAttribute('disabled');
            let pTag = btn.querySelector('p');
            if(pTag.innerText.includes('🔒')) pTag.innerText = pTag.innerText.replace(' 🔒', '');
        }
        if (w === currentWorld) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });
}

worldBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        let w = parseInt(btn.getAttribute('data-world'));
        if (w <= unlockedWorld) {
            currentWorld = w;
            wave = (currentWorld - 1) * 5 + 1; // Start at the beginning of that world
            enemies = [];
            meteorites = [];
            bosses = [];
            bullets = [];
            isBossWave = false;
            updateMapUI();
        }
    });
});

closeMapBtn.addEventListener('click', toggleMap);

// UI Handlers
modeBtns.forEach(btn => btn.addEventListener('click', e => {
    activeMode = e.currentTarget.dataset.mode;
    if (activeMode === 'local' || activeMode === 'local-coop') {
        startGame();
    } else {
        mainMenu.classList.add('hidden');
        p2pMenu.classList.remove('hidden');
    }
}));

backToMenuBtn.addEventListener('click', () => {
    p2pMenu.classList.add('hidden');
    mainMenu.classList.remove('hidden');
    if (peer) { peer.destroy(); peer = null; }
});
menuBtn.addEventListener('click', () => location.reload());
rematchBtn.addEventListener('click', () => {
    if(activeMode === 'p2p-host') {
        broadcast({type: 'rematch'});
        startGame();
    } else if (activeMode === 'local' || activeMode === 'local-coop') {
        startGame();
    }
});

// P2P Logic
function initP2P() {
    peer = new Peer();
    peer.on('open', id => {
        roomIdDisplay.innerText = id;
    });
    peer.on('connection', connection => {
        conn = connection;
        setupConnection();
    });
}

createRoomBtn.addEventListener('click', () => {
    createRoomBtn.classList.add('hidden');
    roomInfo.classList.remove('hidden');
    activeMode = 'p2p-host';
    initP2P();
});

joinRoomBtn.addEventListener('click', () => {
    const id = joinRoomIdInput.value.trim();
    if(!id) return;
    joinRoomBtn.innerText = 'جاري الاتصال...';
    peer = new Peer();
    peer.on('open', () => {
        conn = peer.connect(id);
        conn.on('open', () => {
            activeMode = 'p2p-join';
            setupConnection();
        });
        conn.on('error', () => {
            joinError.classList.remove('hidden');
            joinRoomBtn.innerText = 'بدء المهمة';
        });
    });
});

function setupConnection() {
    conn.on('data', data => {
        if (data.type === 'start') {
            startGame();
        } else if (data.type === 'sync') {
            syncState(data);
        } else if (data.type === 'rematch') {
            startGame();
        } else if (data.type === 'shoot') {
            bullets.push(new Bullet(data.x + 17, data.y, -700, data.id === 1 ? '#3b82f6' : '#8b5cf6', data.id));
            createParticles(data.x + 20, data.y, data.id === 1 ? '#3b82f6' : '#8b5cf6', 3, 2);
        } else if (data.type === 'enemy_shoot') {
            bullets.push(new Bullet(data.x + data.w / 2 - 3, data.y + data.h, 300, '#ef4444', 'enemy'));
        } else if (data.type === 'player_input') {
            const p = players.find(p => p.id === data.id);
            if(p) {
                p.x = data.x;
                p.y = data.y;
            }
        }
    });

    if (activeMode === 'p2p-host') {
        startGame();
        setTimeout(() => broadcast({ type: 'start' }), 500);
    }
}

function broadcast(data) {
    if (conn && conn.open) {
        conn.send(data);
    }
}

// Game Logic
function startGame() {
    mainMenu.classList.add('hidden');
    p2pMenu.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');

    players = [];
    bullets = [];
    enemies = [];
    particles = [];
    fuelItems = [];
    meteorites = [];
    bosses = [];
    isBossWave = false;
    wave = 1;
    waveTimer = 0;
    isGameOver = false;
    keys = {};

    let p1 = new Player(1, canvas.width / 2 - 20, canvas.height - 80, '#3b82f6');
    p1.coins = savedCoins;
    p1.gems = savedGems;
    p1.shipType = savedShipType;
    p1.weaponType = savedWeaponType;
    players.push(p1);
    
    if (activeMode === 'local-coop' || activeMode === 'p2p-host' || activeMode === 'p2p-join') {
        p2Hud.classList.remove('hidden');
        let p2X = activeMode === 'local-coop' ? canvas.width / 2 + 60 : canvas.width / 2 - 100;
        players.push(new Player(2, p2X, canvas.height - 80, '#8b5cf6'));
        if(activeMode === 'p2p-join' || activeMode === 'p2p-host') {
            p2ControlsHint.innerText = '(الزميل)';
        }
    } else {
        p2Hud.classList.add('hidden');
    }

    updateHUD();
    lastTime = performance.now();
    cancelAnimationFrame(animationId);
    animate(lastTime);
}

function updateHUD() {
    if(players[0]) {
        p1Hp.style.width = `${Math.max(0, players[0].hp / players[0].maxHp * 100)}%`;
        p1Fuel.style.width = `${Math.max(0, players[0].fuel / players[0].maxFuel * 100)}%`;
        p1ScoreEl.innerText = players[0].score;
        p1CoinsEl.innerText = players[0].coins;
        p1GemsEl.innerText = players[0].gems;
    }
    if(players[1]) {
        p2Hp.style.width = `${Math.max(0, players[1].hp / players[1].maxHp * 100)}%`;
        p2Fuel.style.width = `${Math.max(0, players[1].fuel / players[1].maxFuel * 100)}%`;
        p2ScoreEl.innerText = players[1].score;
        p2CoinsEl.innerText = players[1].coins;
        p2GemsEl.innerText = players[1].gems;
    }
    waveNumberEl.innerText = wave;
}

function checkCollisions() {
    // Bullets vs Enemies/Players
    bullets.forEach(b => {
        if (b.ownerId === 'enemy') {
            players.forEach(p => {
                if (p.isAlive && rectIntersect(b.x, b.y, b.width, b.height, p.x, p.y, p.width, p.height)) {
                    b.markedForDeletion = true;
                    if(activeMode !== 'p2p-join') { // Host handles logic
                        p.hp -= 10;
                        createParticles(p.x + p.width/2, p.y + p.height/2, '#3b82f6', 10);
                        if(p.hp <= 0) p.isAlive = false;
                    }
                }
            });
        } else {
            enemies.forEach(e => {
                if (rectIntersect(b.x, b.y, b.width, b.height, e.x, e.y, e.width, e.height) && !b.markedForDeletion) {
                    if (b.type !== 'piercing') b.markedForDeletion = true;
                    if(activeMode !== 'p2p-join') {
                        if(b.type === 'frost') e.slowTimer = 3;
                        
                        let damage = b.type === 'explosive' ? 30 : 10;
                        if(b.isSniper) damage = 40;
                        
                        e.hp -= damage;
                        createParticles(b.x, b.y, e.color, 5);

                        if(b.type === 'explosive') {
                            createParticles(b.x, b.y, '#ef4444', 40, 3);
                            // Area of effect damage
                            enemies.forEach(otherE => {
                                if(otherE !== e && Math.hypot(otherE.x - e.x, otherE.y - e.y) < 100) {
                                    otherE.hp -= 20;
                                }
                            });
                        }

                        if(e.hp <= 0) {
                            e.markedForDeletion = true;
                            createParticles(e.x + e.width/2, e.y + e.height/2, e.color, 20, 2);
                            const owner = players.find(p => p.id === b.ownerId);
                            if(owner) {
                                owner.score += e.maxHp;
                                if(owner.shipType === 'vampire' && owner.hp < owner.maxHp) {
                                    owner.hp = Math.min(owner.maxHp, owner.hp + 5);
                                    createParticles(owner.x + owner.width/2, owner.y + owner.height/2, '#7f1d1d', 10, 2);
                                }
                            }
                            
                            // Drops
                            let dropRoll = Math.random();
                            if(dropRoll < 0.1) gems.push(new Gem(e.x, e.y));
                            else if(dropRoll < 0.5) coins.push(new Coin(e.x, e.y));
                            else if(dropRoll < 0.8) fuelItems.push(new FuelItem(e.x, e.y));
                        }
                    }
                }
            });
            bosses.forEach(boss => {
                if (rectIntersect(b.x, b.y, b.width, b.height, boss.x, boss.y, boss.width, boss.height) && !b.markedForDeletion) {
                    if (b.type !== 'piercing') b.markedForDeletion = true;
                    if(activeMode !== 'p2p-join') {
                        let damage = b.type === 'explosive' ? 30 : 10;
                        boss.hp -= damage;
                        createParticles(b.x, b.y, '#9333ea', 5);
                        if(b.type === 'explosive') createParticles(b.x, b.y, '#ef4444', 40, 3);
                        if(boss.hp <= 0) {
                            boss.markedForDeletion = true;
                            createParticles(boss.x + boss.width/2, boss.y + boss.height/2, '#9333ea', 100, 3);
                            isBossWave = false; // Boss dead, proceed
                            wave++; // Increment wave so we don't spawn boss again
                            const owner = players.find(p => p.id === b.ownerId);
                            if(owner) { owner.score += boss.maxHp; owner.gems += 5; owner.coins += 50; }
                            
                            // Check world unlock
                            if (currentWorld * 5 < wave) {
                                unlockedWorld = Math.max(unlockedWorld, currentWorld + 1);
                                if (activeMode !== 'p2p-join') {
                                    toggleMap(); // Open map to choose next world
                                }
                            }
                        }
                    }
                }
            });
        }
    });

    if(activeMode !== 'p2p-join') {
        players.forEach(p => {
            if(!p.isAlive) return;
            // Vs Enemies
            enemies.forEach(e => {
                if (rectIntersect(p.x, p.y, p.width, p.height, e.x, e.y, e.width, e.height)) {
                    e.markedForDeletion = true;
                    if (p.shipType === 'ghost' && Math.random() < 0.2) {
                        createParticles(p.x + p.width/2, p.y + p.height/2, '#ffffff', 10, 1);
                        return; // Evade
                    }
                    p.hp -= p.shipType === 'tank' ? 10 : 20;
                    createParticles(p.x + p.width/2, p.y + p.height/2, '#ef4444', 20, 2);
                    if(p.hp <= 0) p.isAlive = false;
                }
            });
            // Vs Meteorites
            meteorites.forEach(m => {
                if (rectIntersect(p.x, p.y, p.width, p.height, m.x, m.y, m.width, m.height)) {
                    m.markedForDeletion = true;
                    if (p.shipType === 'ghost' && Math.random() < 0.2) {
                        createParticles(p.x + p.width/2, p.y + p.height/2, '#ffffff', 10, 1);
                        return; // Evade
                    }
                    p.hp -= p.shipType === 'tank' ? 0 : 50; // Heavy damage unless tank
                    createParticles(p.x + p.width/2, p.y + p.height/2, '#78716c', 30, 3);
                    if(p.hp <= 0) p.isAlive = false;
                }
            });
            // Vs Fuel
            fuelItems.forEach(f => {
                if (rectIntersect(p.x, p.y, p.width, p.height, f.x, f.y, f.width, f.height)) {
                    f.markedForDeletion = true;
                    p.fuel = Math.min(p.maxFuel, p.fuel + 30); // Restore 30 fuel
                    createParticles(p.x + p.width/2, p.y + p.height/2, '#f59e0b', 10, 1.5);
                }
            });
            // Vs Coins
            coins.forEach(c => {
                if (rectIntersect(p.x, p.y, p.width, p.height, c.x, c.y, c.width, c.height)) {
                    c.markedForDeletion = true;
                    p.coins += 5;
                }
            });
            // Vs Gems
            gems.forEach(g => {
                if (rectIntersect(p.x, p.y, p.width, p.height, g.x, g.y, g.width, g.height)) {
                    g.markedForDeletion = true;
                    p.gems += 1;
                }
            });
        });
    }

    // Player vs Player (Healing and Reviving)
    if (activeMode !== 'p2p-join' && players.length === 2) {
        let p1 = players[0];
        let p2 = players[1];
        if (rectIntersect(p1.x, p1.y, p1.width, p1.height, p2.x, p2.y, p2.width, p2.height)) {
            // Revive Logic
            if (!p1.isAlive && p2.isAlive) {
                p1.isBeingRevived = true;
                p1.reviveTimer += 1/60; // Approximate dt
                if(Math.random() > 0.8) createParticles(p1.x + p1.width/2, p1.y + p1.height/2, '#10b981', 1);
                if (p1.reviveTimer >= 2.0) {
                    p1.isAlive = true;
                    p1.hp = 50;
                    p1.reviveTimer = 0;
                    createParticles(p1.x + p1.width/2, p1.y + p1.height/2, '#10b981', 30, 2);
                }
            } else if (!p2.isAlive && p1.isAlive) {
                p2.isBeingRevived = true;
                p2.reviveTimer += 1/60;
                if(Math.random() > 0.8) createParticles(p2.x + p2.width/2, p2.y + p2.height/2, '#10b981', 1);
                if (p2.reviveTimer >= 2.0) {
                    p2.isAlive = true;
                    p2.hp = 50;
                    p2.reviveTimer = 0;
                    createParticles(p2.x + p2.width/2, p2.y + p2.height/2, '#10b981', 30, 2);
                }
            }
            // Heal Logic (Health Sharing)
            else if (p1.isAlive && p2.isAlive) {
                if (p1.hp > p2.hp + 2) {
                    p1.hp -= 0.5;
                    p2.hp += 0.5;
                    if(Math.random() > 0.7) createParticles(p2.x + p2.width/2, p2.y + p2.height/2, '#10b981', 1);
                } else if (p2.hp > p1.hp + 2) {
                    p2.hp -= 0.5;
                    p1.hp += 0.5;
                    if(Math.random() > 0.7) createParticles(p1.x + p1.width/2, p1.y + p1.height/2, '#10b981', 1);
                }
            }
        }
    }
}

function rectIntersect(x1, y1, w1, h1, x2, y2, w2, h2) {
    return x2 < x1 + w1 && x2 + w2 > x1 && y2 < y1 + h1 && y2 + h2 > y1;
}

function spawnWave() {
    if(activeMode === 'p2p-join') return; // Host controls spawns
    
    if(wave % 5 === 0 && !isBossWave) {
        // Spawn Boss every 5 waves
        isBossWave = true;
        bosses.push(new Boss(canvas.width / 2 - 75, -150));
        return; // Don't spawn normal enemies
    }

    let count = wave * 3 + 2;
    for (let i = 0; i < count; i++) {
        let type = Math.random() > 0.8 ? 3 : (Math.random() > 0.5 ? 2 : 1);
        let x = Math.random() * (canvas.width - 60);
        let y = -Math.random() * 500 - 100;
        enemies.push(new Enemy(x, y, type));
    }

    // Spawn Meteorites occasionally
    if(Math.random() > 0.5) {
        for(let j=0; j<wave; j++) {
            meteorites.push(new Meteorite(Math.random() * canvas.width, -100, (Math.random() - 0.5) * 100, Math.random() * 100 + 100, Math.random() * 40 + 30));
        }
    }
    
    wave++;
}

let syncTimer = 0;

function animate(time) {
    if (isGameOver) return;
    
    let dt = (time - lastTime) / 1000;
    lastTime = time;
    if(dt > 0.1) dt = 0.1;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background stars
    ctx.fillStyle = '#ffffff';
    stars.forEach(s => {
        s.y += s.speed * dt;
        if(s.y > canvas.height) { s.y = 0; s.x = Math.random() * canvas.width; }
        ctx.globalAlpha = s.alpha;
        ctx.fillRect(s.x, s.y, s.size, s.size);
    });
    
    ctx.globalAlpha = 1.0;

    if (isShopOpen || isMapOpen) {
        requestAnimationFrame(animate);
        return;
    }

    players.forEach(p => p.update(dt));
    bullets.forEach(b => b.update(dt));
    enemies.forEach(e => e.update(dt));
    particles.forEach(p => p.update(dt));
    fuelItems.forEach(f => f.update(dt));
    meteorites.forEach(m => m.update(dt));
    bosses.forEach(b => b.update(dt));
    coins.forEach(c => c.update(dt));
    gems.forEach(g => g.update(dt));

    checkCollisions();

    players.forEach(p => p.draw());
    bullets.forEach(b => b.draw());
    enemies.forEach(e => e.draw());
    particles.forEach(p => p.draw());
    fuelItems.forEach(f => f.draw());
    meteorites.forEach(m => m.draw());
    bosses.forEach(b => b.draw());
    coins.forEach(c => c.draw());
    gems.forEach(g => g.draw());

    bullets = bullets.filter(b => !b.markedForDeletion);
    enemies = enemies.filter(e => !e.markedForDeletion);
    particles = particles.filter(p => !p.markedForDeletion);
    fuelItems = fuelItems.filter(f => !f.markedForDeletion);
    meteorites = meteorites.filter(m => !m.markedForDeletion);
    bosses = bosses.filter(b => !b.markedForDeletion);
    coins = coins.filter(c => !c.markedForDeletion);
    gems = gems.filter(g => !g.markedForDeletion);

    updateHUD();

    // Host Logic
    if(activeMode !== 'p2p-join') {
        if(enemies.length === 0 && !isBossWave && bosses.length === 0) {
            waveTimer -= dt;
            if(waveTimer <= 0) {
                spawnWave();
                waveTimer = 3;
            }
        }

        // Sync State to Peer
        if(activeMode === 'p2p-host') {
            syncTimer += dt;
            if(syncTimer > 0.05) { // 20 times per sec
                syncTimer = 0;
                broadcast({
                    type: 'sync',
                    players: players.map(p => ({
                        id: p.id, hp: p.hp, maxHp: p.maxHp, fuel: p.fuel, maxFuel: p.maxFuel,
                        score: p.score, coins: p.coins, gems: p.gems,
                        isAlive: p.isAlive, reviveTimer: p.reviveTimer,
                        shipType: p.shipType, weaponType: p.weaponType
                    })),
                    enemies: enemies.map(e => ({id: e.id, x: e.x, y: e.y, type: e.type, hp: e.hp})),
                    fuelItems: fuelItems.map(f => ({id: f.id, x: f.x, y: f.y})),
                    meteorites: meteorites.map(m => ({id: m.id, x: m.x, y: m.y, width: m.width})),
                    bosses: bosses.map(b => ({id: b.id, x: b.x, y: b.y, hp: b.hp})),
                    coins: coins.map(c => ({id: c.id, x: c.x, y: c.y})),
                    gems: gems.map(g => ({id: g.id, x: g.x, y: g.y})),
                    isBossWave: isBossWave,
                    wave: wave,
                    currentWorld: currentWorld,
                    unlockedWorld: unlockedWorld
                });
            }
        }
        
        // End Game condition
        if(players.every(p => !p.isAlive)) {
            endGame();
        }
    } else {
        // P2P Join sends its position
        let myP = players[1];
        if(myP && myP.isAlive) {
            syncTimer += dt;
            if(syncTimer > 0.05) {
                syncTimer = 0;
                broadcast({type: 'player_input', id: 2, x: myP.x, y: myP.y});
            }
        }
    }

    animationId = requestAnimationFrame(animate);
}

function syncState(data) {
    // Sync players
    data.players.forEach(dp => {
        let p = players.find(p => p.id === dp.id);
        if(p) {
            p.hp = dp.hp;
            p.maxHp = dp.maxHp;
            p.fuel = dp.fuel;
            p.maxFuel = dp.maxFuel;
            p.score = dp.score;
            p.coins = dp.coins;
            p.gems = dp.gems;
            p.shipType = dp.shipType;
            p.weaponType = dp.weaponType;
            p.isAlive = dp.isAlive;
            if(dp.reviveTimer !== undefined) p.reviveTimer = dp.reviveTimer;
        }
    });

    // Update enemies positions
    data.enemies.forEach(de => {
        let e = enemies.find(en => en.id === de.id);
        if(e) {
            e.x = de.x;
            e.y = de.y;
            e.hp = de.hp;
        } else {
            let ne = new Enemy(de.x, de.y, de.type);
            ne.id = de.id;
            ne.hp = de.hp;
            enemies.push(ne);
        }
    });
    enemies = enemies.filter(e => data.enemies.some(de => de.id === e.id));

    // Update Fuel Items
    data.fuelItems.forEach(df => {
        let f = fuelItems.find(fi => fi.id === df.id);
        if(f) { f.x = df.x; f.y = df.y; }
        else { let nf = new FuelItem(df.x, df.y); nf.id = df.id; fuelItems.push(nf); }
    });
    fuelItems = fuelItems.filter(f => data.fuelItems.some(df => df.id === f.id));

    // Update Meteorites
    data.meteorites.forEach(dm => {
        let m = meteorites.find(mi => mi.id === dm.id);
        if(m) { m.x = dm.x; m.y = dm.y; }
        else { let nm = new Meteorite(dm.x, dm.y, 0, 0, dm.width); nm.id = dm.id; meteorites.push(nm); }
    });
    meteorites = meteorites.filter(m => data.meteorites.some(dm => dm.id === m.id));

    // Update Bosses
    data.bosses.forEach(db => {
        let b = bosses.find(bi => bi.id === db.id);
        if(b) { b.x = db.x; b.y = db.y; b.hp = db.hp; }
        else { let nb = new Boss(db.x, db.y); nb.id = db.id; nb.hp = db.hp; bosses.push(nb); }
    });
    bosses = bosses.filter(b => data.bosses.some(db => db.id === b.id));

    // Update Coins
    data.coins.forEach(dc => {
        let c = coins.find(ci => ci.id === dc.id);
        if(c) { c.x = dc.x; c.y = dc.y; }
        else { let nc = new Coin(dc.x, dc.y); nc.id = dc.id; coins.push(nc); }
    });
    coins = coins.filter(c => data.coins.some(dc => dc.id === c.id));

    // Update Gems
    data.gems.forEach(dg => {
        let g = gems.find(gi => gi.id === dg.id);
        if(g) { g.x = dg.x; g.y = dg.y; }
        else { let ng = new Gem(dg.x, dg.y); ng.id = dg.id; gems.push(ng); }
    });
    gems = gems.filter(g => data.gems.some(dg => dg.id === g.id));

    isBossWave = data.isBossWave;
    wave = data.wave;
    currentWorld = data.currentWorld;
    unlockedWorld = data.unlockedWorld;
    
    updateHUD();
    if(players.every(p => !p.isAlive)) {
        endGame();
    }
}

function endGame() {
    isGameOver = true;
    saveProgress();
    gameOverScreen.classList.remove('hidden');
    resultDesc.innerText = `وصلت للموجة رقم ${wave}`;
    
    let statsHTML = `
        <div style="color: #3b82f6">اللاعب 1: ${players[0].score} نقطة</div>
    `;
    if(players[1]) {
        statsHTML += `<div style="color: #8b5cf6">اللاعب 2: ${players[1].score} نقطة</div>`;
    }
    finalStats.innerHTML = statsHTML;
}

// Generate stars once
for(let i=0; i<100; i++) {
    stars.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 2 + 1,
        speed: Math.random() * 50 + 20,
        alpha: Math.random() * 0.8 + 0.2
    });
}
