// Elements
const mainMenu = document.getElementById('main-menu');
const p2pMenu = document.getElementById('p2p-menu');
const gameScreen = document.getElementById('game-screen');
const gameOverScreen = document.getElementById('game-over-screen');

// Shop UI
const shopModal = document.getElementById('shop-modal');
const closeShopBtn = document.getElementById('close-shop-btn');
const mobileShopBtn = document.getElementById('mobile-shop-btn');
const shopCoinsEl = document.getElementById('shop-coins');
const shopGemsEl = document.getElementById('shop-gems');
const buyBtns = document.querySelectorAll('.buy-btn');

// Fusion UI Bindings
const fusionModal = document.getElementById('fusion-modal');
const menuFusionBtn = document.getElementById('menu-fusion-btn');
const closeFusionBtn = document.getElementById('close-fusion-btn');
const executeFusionBtn = document.getElementById('execute-fusion-btn');
const fusionPlayerSelect = document.getElementById('fusion-player-select');
const tabFuseShips = document.getElementById('tab-fuse-ships');
const tabFuseWeapons = document.getElementById('tab-fuse-weapons');
const fuseSlot1 = document.getElementById('fuse-slot-1');
const fuseSlot2 = document.getElementById('fuse-slot-2');
const fusionResultShowcase = document.getElementById('fusion-result-showcase');
const fusionResultText = document.getElementById('fusion-result-text');

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

// Player HUDs (supports up to 6 players)
const playerHuds = [1,2,3,4,5,6].map(i => document.getElementById(`p${i}-hud`));
const playerHps = [1,2,3,4,5,6].map(i => document.getElementById(`p${i}-hp`));
const playerFuels = [1,2,3,4,5,6].map(i => document.getElementById(`p${i}-fuel`));
const playerCoins = [1,2,3,4,5,6].map(i => document.getElementById(`p${i}-coins`));
const playerGems = [1,2,3,4,5,6].map(i => document.getElementById(`p${i}-gems`));
const playerScores = [1,2,3,4,5,6].map(i => document.getElementById(`p${i}-score`));
// Keep legacy refs for P2P compatibility
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
// Player count modal
const playerCountModal = document.getElementById('player-count-modal');
const closeCountBtn = document.getElementById('close-count-btn');
const countBtns = document.querySelectorAll('.count-btn');

// Resource Transfer
const transferTargetSelect = document.getElementById('transfer-target-select');
const transferBtns = document.querySelectorAll('.transfer-btn');

// Game State
let activeMode = 'local'; // local, local-coop, p2p-host, p2p-join
let isGameOver = false;
let animationId;
let lastTime = 0;
let wave = 1;
let waveTimer = 0;
let keys = {};
let warningText = "";
let warningTimer = 0;
let isBossRushMode = false;
let bulletTimeLeft = 0;

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

// Game State
let playersData = []; // تخزين بيانات جميع اللاعبين

function loadProgress() {
    const saved = localStorage.getItem('spaceShooterProgress');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            playersData = data.players || [];
            unlockedWorld = data.unlockedWorld || 1;
        } catch(e) { console.error("Error loading progress", e); }
    }
}

function saveProgress() {
    if (players && players.length > 0) {
        playersData = players.map(p => ({
            coins: p.coins,
            gems: p.gems,
            shipType: p.shipType,
            weaponType: p.weaponType,
            hasDroneHeal: p.hasDroneHeal,
            hasDroneFuel: p.hasDroneFuel,
            hasDroneMagnet: p.hasDroneMagnet,
            droneHealLevel: p.droneHealLevel,
            droneFuelLevel: p.droneFuelLevel,
            droneMagnetLevel: p.droneMagnetLevel,
            ownedWeapons: p.ownedWeapons || ['normal'],
            ownedShips: p.ownedShips || ['defender'],
            hasReflectiveShield: p.hasReflectiveShield,
            healsCount: p.healsCount || 0,
            selfReviveKits: p.selfReviveKits || 0,
            secondLifes: p.secondLifes || 0,
            tempShieldsCount: p.tempShieldsCount || 0,
            bulletDamageModifier: p.bulletDamageModifier || 1.0,
            maxHp: p.maxHp || 100
        }));
    }
    
    localStorage.setItem('spaceShooterProgress', JSON.stringify({
        players: playersData,
        unlockedWorld: unlockedWorld
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
        this.width = 64;
        this.height = 64;
        this.color = color;
        this.speed = 350; // pixels per sec (slower for better control)
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
        
        // Drone companions
        this.hasDroneHeal = false;
        this.hasDroneFuel = false;
        this.hasDroneMagnet = false;
        this.droneHealLevel = 0;
        this.droneFuelLevel = 0;
        this.droneMagnetLevel = 0;
        this.lastDroneHealShot = 0;
        this.lastDroneFuelShot = 0;
        this.lastDroneHealAction = 0;
        this.lastDroneFuelAction = 0;
        this.lastDroneMagnetAction = 0;

        // Inventory ownership
        this.ownedShips = ['defender'];
        this.ownedWeapons = ['normal'];
        this.hasReflectiveShield = false;
        this.isShieldActive = false;

        this.bulletDamageModifier = 1.0;

        this.ultCharge = 0;
        this.tankUltTimeLeft = 0;
        this.trailType = 'none';

        // Consumables inventory count
        this.healsCount = 0;
        this.selfReviveKits = 0;
        this.secondLifes = 0;
        this.tempShieldsCount = 0;
        this.tempShieldTimeLeft = 0;
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

        // Draw Drone 1 (Medical Drone - Left side)
        if (this.hasDroneHeal) {
            let angle = Date.now() / 300;
            let dx = this.x - 20 + Math.sin(angle) * 5;
            let dy = this.y + this.height/2 - 10 + Math.cos(angle) * 5;
            
            ctx.save();
            ctx.translate(dx, dy);
            
            // Glow
            ctx.beginPath();
            ctx.arc(10, 10, 12, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(16, 185, 129, 0.3)';
            ctx.fill();
            
            // Core
            ctx.beginPath();
            ctx.arc(10, 10, 8, 0, Math.PI * 2);
            ctx.fillStyle = '#10b981';
            ctx.fill();
            
            // Plus Sign
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(9, 5, 2, 10);
            ctx.fillRect(5, 9, 10, 2);
            
            ctx.restore();
        }

        // Draw Drone 2 (Fuel Drone - Right side)
        if (this.hasDroneFuel) {
            let angle = Date.now() / 300 + Math.PI; // Opposite phase
            let dx = this.x + this.width + 10 + Math.sin(angle) * 5;
            let dy = this.y + this.height/2 - 10 + Math.cos(angle) * 5;
            
            ctx.save();
            ctx.translate(dx, dy);
            
            // Glow
            ctx.beginPath();
            ctx.arc(10, 10, 12, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(245, 158, 11, 0.3)';
            ctx.fill();
            
            // Core
            ctx.beginPath();
            ctx.arc(10, 10, 8, 0, Math.PI * 2);
            ctx.fillStyle = '#f59e0b';
            ctx.fill();
            
            // Fuel shape indicator
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(8, 6, 4, 8);
            ctx.fillRect(7, 4, 6, 2);
            
            ctx.restore();
        }

        // Draw Drone 3 (Magnet Drone - Orbiting above)
        if (this.hasDroneMagnet) {
            let angle = Date.now() / 400 + Math.PI / 2;
            let dx = this.x + this.width/2 - 10 + Math.sin(angle) * 35;
            let dy = this.y - 25 + Math.cos(angle) * 10;
            
            ctx.save();
            ctx.translate(dx, dy);
            
            // Glow
            ctx.beginPath();
            ctx.arc(10, 10, 12, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(6, 182, 212, 0.3)';
            ctx.fill();
            
            // Core
            ctx.beginPath();
            ctx.arc(10, 10, 8, 0, Math.PI * 2);
            ctx.fillStyle = '#06b6d4';
            ctx.fill();
            
            // Draw a tiny U-shape magnet symbol
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#ef4444'; // Red half of magnet
            ctx.beginPath();
            ctx.arc(10, 8, 4, 0, Math.PI, false);
            ctx.stroke();
            
            ctx.strokeStyle = '#3b82f6'; // Blue tips of magnet
            ctx.beginPath();
            ctx.moveTo(6, 8); ctx.lineTo(6, 12);
            ctx.moveTo(14, 8); ctx.lineTo(14, 12);
            ctx.stroke();
            
            ctx.restore();
        }

        // Draw reflective shield bubble
        if (this.isShieldActive) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(this.x + this.width/2, this.y + this.height/2, this.width * 0.8, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(6, 182, 212, 0.8)';
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.fillStyle = 'rgba(6, 182, 212, 0.15)';
            ctx.fill();
            ctx.restore();
        }

        // Draw temporary invincibility shield bubble (5-second shield)
        if (this.tempShieldTimeLeft && this.tempShieldTimeLeft > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(this.x + this.width/2, this.y + this.height/2, this.width * 0.85, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.9)';
            ctx.lineWidth = 4;
            ctx.stroke();
            ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
            ctx.fill();
            ctx.restore();
        }
    }
    
    triggerDeathOrResurrection() {
        if (this.secondLifes > 0) {
            this.secondLifes--;
            this.hp = this.maxHp;
            this.fuel = this.maxFuel;
            createParticles(this.x + this.width/2, this.y + this.height/2, '#eab308', 45, 2.5);
            alert(`تم تفعيل الفرصة الثانية الفائقة للاعب ${this.id}! 🌟`);
            return;
        }
        if (this.selfReviveKits > 0) {
            this.selfReviveKits--;
            this.hp = this.maxHp / 2;
            this.fuel = this.maxFuel / 2;
            createParticles(this.x + this.width/2, this.y + this.height/2, '#10b981', 35, 2);
            alert(`تم تفعيل حقنة الإنعاش الذاتي للاعب ${this.id}! 💉`);
            return;
        }
        this.isAlive = false;
        createParticles(this.x + this.width/2, this.y + this.height/2, this.color, 30, 2);
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

        const isLocal = (activeMode === 'local' || activeMode === 'local-coop');
        const isP2PJoin = (activeMode === 'p2p-join');

        if (this.id === 1 && (activeMode === 'local' || activeMode === 'local-coop' || activeMode === 'p2p-host')) {
            // P1: Arrow keys + Space
            if (keys['ArrowLeft']) dx = -1;
            if (keys['ArrowRight']) dx = 1;
            if (keys['ArrowUp']) dy = -1;
            if (keys['ArrowDown']) dy = 1;
            if (keys[' '] && Date.now() - this.lastShot > this.fireRate) this.shoot();

        } else if (this.id === 2 && isP2PJoin) {
            // P2 remote (P2P): Arrow keys + Space
            if (keys['ArrowLeft']) dx = -1;
            if (keys['ArrowRight']) dx = 1;
            if (keys['ArrowUp']) dy = -1;
            if (keys['ArrowDown']) dy = 1;
            if (keys[' '] && Date.now() - this.lastShot > this.fireRate) this.shoot();

        } else if (this.id === 2 && isLocal) {
            // P2: WASD + Q
            if (keys['a'] || keys['A']) dx = -1;
            if (keys['d'] || keys['D']) dx = 1;
            if (keys['w'] || keys['W']) dy = -1;
            if (keys['s'] || keys['S']) dy = 1;
            if ((keys['q'] || keys['Q']) && Date.now() - this.lastShot > this.fireRate) this.shoot();

        } else if (this.id === 3 && isLocal) {
            // P3: IJKL + U
            if (keys['j'] || keys['J']) dx = -1;
            if (keys['l'] || keys['L']) dx = 1;
            if (keys['i'] || keys['I']) dy = -1;
            if (keys['k'] || keys['K']) dy = 1;
            if ((keys['u'] || keys['U']) && Date.now() - this.lastShot > this.fireRate) this.shoot();

        } else if (this.id === 4 && isLocal) {
            // P4: TFGH + R
            if (keys['f'] || keys['F']) dx = -1;
            if (keys['h'] || keys['H']) dx = 1;
            if (keys['t'] || keys['T']) dy = -1;
            if (keys['g'] || keys['G']) dy = 1;
            if ((keys['r'] || keys['R']) && Date.now() - this.lastShot > this.fireRate) this.shoot();

        } else if (this.id === 5 && isLocal) {
            // P5: Numpad 8,4,6,2 + 0
            if (keys['Numpad4'] || keys['4']) dx = -1;
            if (keys['Numpad6'] || keys['6']) dx = 1;
            if (keys['Numpad8'] || keys['8']) dy = -1;
            if (keys['Numpad2'] || keys['2']) dy = 1;
            if ((keys['Numpad0'] || keys['0']) && Date.now() - this.lastShot > this.fireRate) this.shoot();

        } else if (this.id === 6 && isLocal) {
            // P6: Home/End/PgUp/PgDn + Ins
            if (keys['End']) dx = -1;
            if (keys['Home']) dx = 1;
            if (keys['PageUp']) dy = -1;
            if (keys['PageDown']) dy = 1;
            if (keys['Insert'] && Date.now() - this.lastShot > this.fireRate) this.shoot();
        }
        
        let currentSpeed = this.speed;
        if(this.shipType.includes('speedster')) currentSpeed = 500;
        else if(this.shipType.includes('tank')) currentSpeed = 240;
        else if(this.shipType.includes('sniper')) currentSpeed = 200;

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
                    this.triggerDeathOrResurrection();
                }
            }
            // Healer passive
            if(this.shipType.includes('healer') && this.isAlive && this.hp > 0 && this.hp < this.maxHp) {
                this.hp = Math.min(this.maxHp, this.hp + 2 * dt);
            }
            // Magnet passive
            if(this.shipType.includes('speedster') && this.isAlive) {
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
            
            // Magnet Drone passive (Drone 3)
            if(this.hasDroneMagnet && this.isAlive) {
                const magnetRadius = 150 + this.droneMagnetLevel * 60;
                const magnetSpeed = 250 + this.droneMagnetLevel * 75;
                let pull = (item) => {
                    let dist = Math.hypot(item.x - this.x, item.y - this.y);
                    if(dist < magnetRadius) {
                        let angle = Math.atan2(this.y + this.height/2 - item.y, this.x + this.width/2 - item.x);
                        item.x += Math.cos(angle) * magnetSpeed * dt;
                        item.y += Math.sin(angle) * magnetSpeed * dt;
                        
                        if(Math.random() > 0.95) {
                            createParticles(item.x, item.y, '#06b6d4', 1, 0.5);
                        }
                    }
                };
                coins.forEach(pull);
                gems.forEach(pull);
                fuelItems.forEach(pull);
            }
            
            // Reflective Shield Active Cycle
            if (this.hasReflectiveShield && this.isAlive) {
                let cycle = (Date.now() % 15000);
                this.isShieldActive = (cycle < 3000); // Active for 3 seconds every 15 seconds
            } else {
                this.isShieldActive = false;
            }
            
            // Temp Shield Decrement
            if (this.tempShieldTimeLeft && this.tempShieldTimeLeft > 0) {
                this.tempShieldTimeLeft = Math.max(0, this.tempShieldTimeLeft - dt);
            }
            
            // Tank Ultimate timer
            if (this.tankUltTimeLeft && this.tankUltTimeLeft > 0) {
                this.tankUltTimeLeft = Math.max(0, this.tankUltTimeLeft - dt);
                this.width = 110;
                this.height = 110;
                if (this.tankUltTimeLeft === 0) {
                    this.width = 64;
                    this.height = 64;
                }
            }
        }

        // Auto shoot on mobile drag
        if (this.id === 1 && typeof isDragging !== 'undefined' && isDragging && this.isAlive) {
            this.shoot();
        }

        if(this.reviveTimer > 0 && !this.isBeingRevived) {
            this.reviveTimer = Math.max(0, this.reviveTimer - dt);
        }
        this.isBeingRevived = false;

        // Update Drone Actions and Autoshot
        if (this.isAlive) {
            // Drone 1: Medical
            if (this.hasDroneHeal) {
                // Heal action
                let healCooldown = Math.max(1000, 5000 - this.droneHealLevel * 500);
                if (Date.now() - this.lastDroneHealAction > healCooldown) {
                    if (this.hp < this.maxHp) {
                        this.hp = Math.min(this.maxHp, this.hp + 5 + this.droneHealLevel * 3);
                        createParticles(this.x + this.width/2, this.y + this.height/2, '#10b981', 12, 1);
                        this.lastDroneHealAction = Date.now();
                    }
                }
                
                // Shoot action if enemy is in front (x difference < 80px)
                let d1x = this.x - 10;
                let d1y = this.y + this.height/2;
                let shotCooldown = Math.max(400, 1000 - this.droneHealLevel * 80);
                if (Date.now() - this.lastDroneHealShot > shotCooldown) {
                    let enemyInFront = enemies.some(e => Math.abs(e.x + e.width/2 - d1x) < 80 && e.y < d1y) || (bosses.length > 0);
                    if (enemyInFront) {
                        bullets.push(new Bullet(d1x + 7, d1y, -550, '#10b981', this.id, 'normal'));
                        this.lastDroneHealShot = Date.now();
                    }
                }
            }
            
            // Drone 2: Fuel
            if (this.hasDroneFuel) {
                // Fuel action
                let fuelCooldown = Math.max(1000, 5000 - this.droneFuelLevel * 500);
                if (Date.now() - this.lastDroneFuelAction > fuelCooldown) {
                    if (this.fuel < this.maxFuel) {
                        this.fuel = Math.min(this.maxFuel, this.fuel + 6 + this.droneFuelLevel * 4);
                        createParticles(this.x + this.width/2, this.y + this.height/2, '#f59e0b', 8, 1);
                        this.lastDroneFuelAction = Date.now();
                    }
                }
                
                // Shoot action if enemy is in front
                let d2x = this.x + this.width + 10;
                let d2y = this.y + this.height/2;
                let shotCooldown = Math.max(400, 1000 - this.droneFuelLevel * 80);
                if (Date.now() - this.lastDroneFuelShot > shotCooldown) {
                    let enemyInFront = enemies.some(e => Math.abs(e.x + e.width/2 - d2x) < 80 && e.y < d2y) || (bosses.length > 0);
                    if (enemyInFront) {
                        bullets.push(new Bullet(d2x + 7, d2y, -550, '#f59e0b', this.id, 'normal'));
                        this.lastDroneFuelShot = Date.now();
                    }
                }
            }
        }
    }
    shoot() {
        let currentFireRate = this.fireRate;
        if (this.shipType === 'sniper') currentFireRate = 600; // slow fire

        if (Date.now() - this.lastShot < currentFireRate) return;
        this.lastShot = Date.now();
        
        if (this.weaponType.startsWith('hybrid-')) {
            let type = this.weaponType;
            let color = '#a855f7';
            let vy = -600;
            if (type.includes('piercing')) vy = -1000;
            else if (type.includes('explosive')) vy = -400;
            else if (type.includes('blackhole')) vy = -180;
            else if (type.includes('frost')) vy = -600;
            
            if (type.includes('blackhole')) color = '#7c3aed';
            else if (type.includes('piercing')) color = '#fcd34d';
            else if (type.includes('explosive')) color = '#ef4444';
            else if (type.includes('frost')) color = '#60a5fa';
            
            bullets.push(new Bullet(this.x + this.width / 2 - 3, this.y, vy, color, this.id, type));
            let b = bullets[bullets.length - 1];
            if (type.includes('blackhole')) {
                b.width = 32;
                b.height = 32;
                b.life = 2.5;
            } else if (type.includes('piercing')) {
                b.width = 4;
                b.height = 30;
            } else if (type.includes('explosive')) {
                b.width = 12;
            }
        } else if (this.weaponType === 'frost') {
            bullets.push(new Bullet(this.x + this.width / 2 - 4, this.y, -600, '#60a5fa', this.id, 'frost'));
        } else if (this.weaponType === 'explosive') {
            bullets.push(new Bullet(this.x + this.width / 2 - 6, this.y, -400, '#ef4444', this.id, 'explosive'));
            bullets[bullets.length-1].width = 12;
        } else if (this.weaponType === 'piercing' || this.shipType === 'sniper') {
            bullets.push(new Bullet(this.x + this.width / 2 - 2, this.y, -1000, '#fcd34d', this.id, 'piercing'));
            bullets[bullets.length-1].height = 30;
            if (this.shipType === 'sniper') bullets[bullets.length-1].isSniper = true;
        } else if (this.weaponType === 'blackhole') {
            bullets.push(new Bullet(this.x + this.width / 2 - 16, this.y, -180, '#7c3aed', this.id, 'blackhole'));
        } else {
            // Normal
            bullets.push(new Bullet(this.x + this.width / 2 - 3, this.y, -700, this.color, this.id, 'normal'));
        }

        if (bullets.length > 0) {
            bullets[bullets.length - 1].damageMultiplier = this.bulletDamageModifier || 1.0;
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
        this.width = type === 'blackhole' ? 32 : 6;
        this.height = type === 'blackhole' ? 32 : 15;
        this.vy = type === 'blackhole' ? -180 : vy;
        this.color = color;
        this.ownerId = ownerId; // 1, 2, or 'enemy'
        this.type = type; // normal, frost, explosive, piercing, blackhole
        this.markedForDeletion = false;
        this.damageMultiplier = 1.0;
        if (type === 'blackhole') {
            this.life = 2.5; // lasts 2.5 seconds
        }
    }
    draw() {
        if (this.type.includes('blackhole')) {
            ctx.save();
            let angle = Date.now() / 150;
            ctx.translate(this.x + 16, this.y + 16);
            ctx.rotate(angle);
            
            // Radial black hole gradient
            let grad = ctx.createRadialGradient(0, 0, 2, 0, 0, 18);
            grad.addColorStop(0, '#000000');
            grad.addColorStop(0.3, '#7c3aed');
            grad.addColorStop(0.8, 'rgba(147, 51, 234, 0.4)');
            grad.addColorStop(1, 'rgba(147, 51, 234, 0)');
            
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, 18, 0, Math.PI * 2);
            ctx.fill();
            
            // Tiny white core
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, 0, 3, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        } else {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
    update(dt) {
        let speedMult = (typeof bulletTimeLeft !== 'undefined' && bulletTimeLeft > 0 && this.ownerId === 'enemy') ? 0.2 : 1.0;
        this.y += this.vy * speedMult * dt;
        if(this.vx) this.x += this.vx * speedMult * dt;
        if (this.isScythe) {
            this.x += Math.sin(Date.now() / 80) * 150 * dt;
        }

        if (this.type.includes('blackhole')) {
            this.life -= dt;
            if (this.life <= 0) {
                this.markedForDeletion = true;
            }
            
            // Pull enemies
            enemies.forEach(e => {
                let dx = (this.x + 16) - (e.x + e.width / 2);
                let dy = (this.y + 16) - (e.y + e.height / 2);
                let dist = Math.hypot(dx, dy);
                if (dist < 180) {
                    let force = (180 - dist) * 1.5;
                    let angle = Math.atan2(dy, dx);
                    e.x += Math.cos(angle) * force * dt;
                    e.y += Math.sin(angle) * force * dt;
                }
            });

            // Pull items (coins, gems, fuels)
            let pullItem = (item) => {
                let dx = (this.x + 16) - item.x;
                let dy = (this.y + 16) - item.y;
                let dist = Math.hypot(dx, dy);
                if (dist < 180) {
                    let force = (180 - dist) * 2;
                    let angle = Math.atan2(dy, dx);
                    item.x += Math.cos(angle) * force * dt;
                    item.y += Math.sin(angle) * force * dt;
                }
            };
            coins.forEach(pullItem);
            gems.forEach(pullItem);
            fuelItems.forEach(pullItem);
        }

        if (this.y < -100 || this.y > canvas.height + 100 || this.x < -100 || this.x > canvas.width + 100) {
            this.markedForDeletion = true;
        }
    }
}

class Enemy {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 1 = basic, 2 = fast, 3 = tank, 4 = healer
        
        // Scale stats by wave progression (20% HP scaling per wave, 3% speed scaling)
        const scaling = 1.0 + (wave - 1) * 0.20;
        
        if (type === 3) {
            this.width = 60;
            this.height = 60;
            this.hp = Math.floor(50 * scaling);
            this.speed = Math.floor(80 * (1.0 + (wave - 1) * 0.02));
            this.color = '#ef4444';
            this.fireRate = Math.max(800, 1500 - (wave - 1) * 50);
        } else if (type === 2) {
            this.width = 40;
            this.height = 40;
            this.hp = Math.floor(20 * scaling);
            this.speed = Math.floor(150 * (1.0 + (wave - 1) * 0.02));
            this.color = '#f59e0b';
            this.fireRate = 3000;
        } else if (type === 4) {
            this.width = 45;
            this.height = 45;
            this.hp = Math.floor(35 * scaling);
            this.speed = Math.floor(70 * (1.0 + (wave - 1) * 0.01));
            this.color = '#10b981';
            this.fireRate = Math.max(1000, 2500 - (wave - 1) * 80);
            this.lastHeal = Date.now() + Math.random() * 1000;
        } else if (type === 5) {
            // Type 5 (Kamikaze)
            this.width = 40;
            this.height = 40;
            this.hp = Math.floor(12 * scaling);
            this.speed = Math.floor(210 * (1.0 + (wave - 1) * 0.025));
            this.color = '#ef4444';
            this.fireRate = 99999999; // Doesn't shoot
        } else {
            // Type 1 (Basic)
            this.width = 40;
            this.height = 40;
            this.hp = Math.floor(10 * scaling);
            this.speed = Math.floor(80 * (1.0 + (wave - 1) * 0.02));
            this.color = '#22d3ee';
            this.fireRate = Math.max(1200, 3000 - (wave - 1) * 100);
        }
        
        this.maxHp = this.hp;
        this.markedForDeletion = false;
        this.lastShot = Date.now() + Math.random() * 2000;
        this.id = Math.random().toString(36).substr(2, 9);
    }
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.font = this.type === 3 ? '50px "Segoe UI Emoji", Arial' : '35px "Segoe UI Emoji", Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        let emoji = '👾';
        if (this.type === 2) emoji = '👽';
        else if (this.type === 3) emoji = '👹';
        else if (this.type === 4) emoji = '🛸';
        else if (this.type === 5) emoji = '💥';
        
        // Draw red pulsing indicator for kamikaze
        if (this.type === 5) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ef4444';
        }
        
        ctx.fillText(emoji, this.width/2, this.height/2);
        
        // Green medic cross overlay for healer
        if (this.type === 4) {
            ctx.fillStyle = '#10b981';
            ctx.font = 'bold 16px Arial';
            ctx.fillText('✚', this.width/2 + 16, this.height/2 - 16);
        }
        ctx.restore();
    }
    update(dt) {
        if (this.type === 5) {
            // Track the nearest player's x coordinate
            let targetX = canvas.width / 2;
            if (players.length > 0) {
                let closestP = null;
                let minDist = Infinity;
                players.forEach(p => {
                    if (p.isAlive) {
                        let d = Math.hypot(p.x - this.x, p.y - this.y);
                        if (d < minDist) {
                            minDist = d;
                            closestP = p;
                        }
                    }
                });
                if (closestP) {
                    targetX = closestP.x + closestP.width / 2;
                }
            }
            // Move horizontally towards player target coordinate
            let horizMult = (typeof bulletTimeLeft !== 'undefined' && bulletTimeLeft > 0) ? 0.2 : 1.0;
            this.x += (targetX - (this.x + this.width / 2)) * dt * 2.2 * horizMult;
        }
        
        let speedMult = (typeof bulletTimeLeft !== 'undefined' && bulletTimeLeft > 0) ? 0.2 : 1.0;
        this.y += this.speed * speedMult * dt;
        
        if (activeMode !== 'p2p-join') {
            // Healer aura healing action
            if (this.type === 4 && Date.now() - this.lastHeal > this.fireRate) {
                this.lastHeal = Date.now();
                let healedAny = false;
                enemies.forEach(other => {
                    if (other !== this && other.hp < other.maxHp) {
                        let dist = Math.hypot(other.x - this.x, other.y - this.y);
                        if (dist < 250) {
                            other.hp = Math.min(other.maxHp, other.hp + 15);
                            createParticles(other.x + other.width/2, other.y + other.height/2, '#10b981', 8, 1);
                            healedAny = true;
                        }
                    }
                });
                if (healedAny) {
                    createParticles(this.x + this.width/2, this.y + this.height/2, '#10b981', 15, 1.5);
                }
            }
            
            // Host controls enemy shooting (Fast 2 and Kamikaze 5 do not shoot)
            if (this.type !== 2 && this.type !== 5 && Date.now() - this.lastShot > (this.type === 4 ? 3000 : this.fireRate)) {
                this.lastShot = Date.now();
                let bColor = this.type === 4 ? '#10b981' : '#ef4444';
                bullets.push(new Bullet(this.x + this.width / 2 - 3, this.y + this.height, 300, bColor, 'enemy'));
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
    constructor(x, y, vx, vy, size, isGolden = false) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.width = size;
        this.height = size;
        this.isGolden = isGolden;
        this.hp = isGolden ? 25 : Math.max(1, Math.ceil(size / 8));
        this.markedForDeletion = false;
        this.id = Math.random().toString(36).substr(2, 9);
    }
    draw() {
        ctx.save();
        ctx.font = this.width + 'px "Segoe UI Emoji", Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (this.isGolden) {
            ctx.shadowBlur = 12;
            ctx.shadowColor = '#fbbf24';
            ctx.fillText('☄️', this.x + this.width/2, this.y + this.height/2);
        } else {
            ctx.fillText('🪨', this.x + this.width/2, this.y + this.height/2);
        }
        ctx.restore();
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
        this.dir = 1;
        this.markedForDeletion = false;
        this.id = 'boss_1';
        this.lastShot = Date.now();
        this.phase = 1;

        // Choose boss configuration based on currentWorld
        const w = currentWorld || 1;
        if (w === 1) {
            this.emoji = '😈';
            this.name = 'زعيم السديم';
            this.maxHp = 600;
            this.speed = 80;
            this.fireRate = 1600;
            this.bulletColor = '#f59e0b';
        } else if (w === 2) {
            this.emoji = '🤖';
            this.name = 'حارس الكويكبات';
            this.maxHp = 900;
            this.speed = 100;
            this.fireRate = 1400;
            this.bulletColor = '#fb923c';
        } else if (w === 3) {
            this.emoji = '👽';
            this.name = 'سيد الثقب الأسود';
            this.maxHp = 1200;
            this.speed = 120;
            this.fireRate = 1200;
            this.bulletColor = '#a855f7';
        } else if (w === 4) {
            this.emoji = '👹';
            this.name = 'غول الكوكب الفضائي';
            this.maxHp = 1650;
            this.speed = 140;
            this.fireRate = 1100;
            this.bulletColor = '#ef4444';
        } else if (w === 5) {
            this.emoji = '🐉';
            this.name = 'تنين النجوم المشتعلة';
            this.maxHp = 2200;
            this.speed = 160;
            this.fireRate = 1000;
            this.bulletColor = '#10b981';
        } else if (w === 6) {
            this.emoji = '🐙';
            this.name = 'كراكن الطاقة المظلمة';
            this.maxHp = 2800;
            this.speed = 180;
            this.fireRate = 900;
            this.bulletColor = '#6366f1';
        } else if (w === 7) {
            this.emoji = '💀';
            this.name = 'حاصد الأرواح الكوني';
            this.maxHp = 3500;
            this.speed = 200;
            this.fireRate = 800;
            this.bulletColor = '#ec4899';
        } else {
            this.emoji = '👑';
            this.name = 'إمبراطور الأبعاد الكبرى';
            this.maxHp = 4500;
            this.speed = 220;
            this.fireRate = 700;
            this.bulletColor = '#06b6d4';
        }

        const bossScaling = 1.0 + (wave - 5) * 0.15;
        this.maxHp = Math.floor(this.maxHp * Math.max(1.0, bossScaling));
        this.hp = this.maxHp;
    }
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.font = '100px "Segoe UI Emoji", Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.emoji, this.width/2, this.height/2);

        // Draw Boss Name text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px "Cairo", Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, this.width/2, -22);
        
        // Boss HP Bar
        ctx.fillStyle = '#000';
        ctx.fillRect(0, -12, this.width, 8);
        ctx.fillStyle = this.bulletColor;
        ctx.fillRect(0, -12, this.width * (this.hp / this.maxHp), 8);
        
        ctx.restore();
    }
    update(dt) {
        let speedMult = (typeof bulletTimeLeft !== 'undefined' && bulletTimeLeft > 0) ? 0.2 : 1.0;
        if (this.y < 50) {
            this.y += 50 * speedMult * dt; // Boss enters the screen!
        } else {
            // Move side to side
            this.x += this.speed * this.dir * speedMult * dt;
            if (this.x <= 0 || this.x + this.width >= canvas.width) {
                this.dir *= -1;
                this.x = Math.max(0, Math.min(canvas.width - this.width, this.x));
            }
        }

        // Host controls shooting
        if (activeMode !== 'p2p-join') {
            if (Date.now() - this.lastShot > this.fireRate) {
                this.lastShot = Date.now();
                const w = currentWorld || 1;

                if (w === 1) {
                    // Spread shot
                    for(let i=-2; i<=2; i++) {
                        bullets.push(new Bullet(this.x + this.width/2, this.y + this.height, 250 + Math.abs(i)*50, this.bulletColor, 'enemy'));
                        let b = bullets[bullets.length-1];
                        b.vx = i * 80;
                    }
                } else if (w === 2) {
                    // Spread + central fast bullet
                    for(let i=-2; i<=2; i++) {
                        bullets.push(new Bullet(this.x + this.width/2, this.y + this.height, 260 + Math.abs(i)*50, this.bulletColor, 'enemy'));
                        let b = bullets[bullets.length-1];
                        b.vx = i * 90;
                    }
                    bullets.push(new Bullet(this.x + this.width/2 - 6, this.y + this.height, 380, '#ef4444', 'enemy', 'explosive'));
                    bullets[bullets.length-1].width = 12;
                    bullets[bullets.length-1].height = 20;
                } else if (w === 3) {
                    // Spread tracking players
                    let closestP = players[0];
                    if (players[1] && players[0]) {
                        let dist1 = Math.hypot(players[0].x - this.x, players[0].y - this.y);
                        let dist2 = Math.hypot(players[1].x - this.x, players[1].y - this.y);
                        if(dist2 < dist1) closestP = players[1];
                    }
                    let targetX = closestP ? closestP.x + closestP.width/2 : canvas.width/2;
                    let dx = targetX - (this.x + this.width/2);
                    for(let i=-2; i<=2; i++) {
                        bullets.push(new Bullet(this.x + this.width/2, this.y + this.height, 300, this.bulletColor, 'enemy'));
                        let b = bullets[bullets.length-1];
                        b.vx = (dx / canvas.height) * 250 + i * 40;
                    }
                } else if (w === 4) {
                    // Spiral pattern fire
                    let time = Date.now() / 1000;
                    for (let i = 0; i < 6; i++) {
                        let angle = (i * Math.PI / 3) + time;
                        bullets.push(new Bullet(this.x + this.width/2, this.y + this.height, 250, this.bulletColor, 'enemy'));
                        let b = bullets[bullets.length-1];
                        b.vx = Math.sin(angle) * 150;
                        b.vy = Math.cos(angle) * 150 + 200;
                    }
                } else if (w === 5) {
                    // Star shape / 8 directions spray
                    for(let i=0; i<8; i++) {
                        let angle = (i * Math.PI / 4);
                        bullets.push(new Bullet(this.x + this.width/2, this.y + this.height, 200, this.bulletColor, 'enemy'));
                        let b = bullets[bullets.length-1];
                        b.vx = Math.sin(angle) * 180;
                        b.vy = Math.cos(angle) * 180 + 150;
                    }
                } else if (w === 6) {
                    // Wave pattern
                    for(let i=-3; i<=3; i++) {
                        bullets.push(new Bullet(this.x + this.width/2, this.y + this.height, 320, this.bulletColor, 'enemy'));
                        let b = bullets[bullets.length-1];
                        b.vx = i * 110;
                    }
                } else if (w === 7) {
                    // Oscillating scythe attacks
                    for(let i=-3; i<=3; i++) {
                        bullets.push(new Bullet(this.x + this.width/2, this.y + this.height, 330, this.bulletColor, 'enemy'));
                        let b = bullets[bullets.length-1];
                        b.vx = i * 120;
                        b.isScythe = true;
                    }
                } else {
                    // Dimensional Emperor: spiral spray + track combinations
                    let time = Date.now() / 1000;
                    for (let i = 0; i < 8; i++) {
                        let angle = (i * Math.PI / 4) + time;
                        bullets.push(new Bullet(this.x + this.width/2, this.y + this.height, 200, this.bulletColor, 'enemy'));
                        let b = bullets[bullets.length-1];
                        b.vx = Math.sin(angle) * 200;
                        b.vy = Math.cos(angle) * 200 + 250;
                    }
                    // Additional fast tracking bullet
                    let targetX = players[0] ? players[0].x + players[0].width/2 : canvas.width/2;
                    let dx = targetX - (this.x + this.width/2);
                    bullets.push(new Bullet(this.x + this.width/2, this.y + this.height, 420, '#ff0000', 'enemy'));
                    bullets[bullets.length-1].vx = (dx / canvas.height) * 420;
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
let localPlayerCount = 1;
let activeShopPlayerIndex = 0;

// Key Listeners
window.addEventListener('keydown', e => {
    keys[e.key] = true;
    
    // Ultimate keys
    if (e.key === 'Shift' && players[0]) triggerUltimate(0);
    else if ((e.key === 'f' || e.key === 'F') && players[1]) triggerUltimate(1);
    else if ((e.key === 'h' || e.key === 'H') && players[2]) triggerUltimate(2);
    else if ((e.key === 'j' || e.key === 'J') && players[3]) triggerUltimate(3);
    else if ((e.key === 'k' || e.key === 'K') && players[4]) triggerUltimate(4);
    else if ((e.key === 'l' || e.key === 'L') && players[5]) triggerUltimate(5);

    if (activeMode === 'local' || activeMode === 'local-coop') {
        if ((e.key === 'b' || e.key === 'B') && players[0] && players[0].isAlive) toggleShop(0);
        else if ((e.key === 'e' || e.key === 'E') && players[1] && players[1].isAlive) toggleShop(1);
        else if ((e.key === 'o' || e.key === 'O') && players[2] && players[2].isAlive) toggleShop(2);
        else if ((e.key === 'y' || e.key === 'Y') && players[3] && players[3].isAlive) toggleShop(3);
        else if ((e.key === 'NumpadAdd' || e.key === '+') && players[4] && players[4].isAlive) toggleShop(4);
        else if ((e.key === 'Delete') && players[5] && players[5].isAlive) toggleShop(5);
    } else {
        if (e.key === 'b' || e.key === 'B') {
            toggleShop(0);
        }
    }
});
window.addEventListener('keyup', e => {
    keys[e.key] = false;
});

// Mobile Touch & Mouse Drag controls
let isDragging = false;
let dragOffset = { x: 0, y: 0 };

// Auto-display floating mobile shop button on load
if (mobileShopBtn) {
    mobileShopBtn.classList.remove('hidden');
    mobileShopBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        let p = players[0] || (players.length > 0 ? players[0] : null);
        if (p && p.isAlive) {
            toggleShop(0);
        } else {
            alert("يجب أن تكون على قيد الحياة لفتح المتجر!");
        }
    });
}

// Touch listeners on canvas
canvas.addEventListener('touchstart', e => {
    if (isGameOver || isShopOpen || isMapOpen) return;
    let touch = e.touches[0];
    let rect = canvas.getBoundingClientRect();
    let touchX = (touch.clientX - rect.left) * (canvas.width / rect.width);
    let touchY = (touch.clientY - rect.top) * (canvas.height / rect.height);
    
    let p = players[0];
    if (p && p.isAlive) {
        isDragging = true;
        dragOffset.x = p.x - touchX;
        dragOffset.y = p.y - touchY;
    }
}, { passive: false });

canvas.addEventListener('touchmove', e => {
    if (!isDragging) return;
    let touch = e.touches[0];
    let rect = canvas.getBoundingClientRect();
    let touchX = (touch.clientX - rect.left) * (canvas.width / rect.width);
    let touchY = (touch.clientY - rect.top) * (canvas.height / rect.height);
    
    let p = players[0];
    if (p && p.isAlive) {
        p.x = touchX + dragOffset.x;
        p.y = touchY + dragOffset.y;
        
        p.x = Math.max(0, Math.min(canvas.width - p.width, p.x));
        p.y = Math.max(0, Math.min(canvas.height - p.height, p.y));
    }
    e.preventDefault();
}, { passive: false });

canvas.addEventListener('touchend', () => {
    isDragging = false;
});

// Bind manual clicks to HUD inventory icons
document.querySelectorAll('.inv-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        let playerIdx = parseInt(btn.getAttribute('data-player'));
        let item = btn.getAttribute('data-item');
        
        let p = players[playerIdx];
        if (!p) return;
        
        if (item === 'heal') {
            if (!p.isAlive) {
                alert("يجب أن تكون السفينة حية لاستخدام عدة الإصلاح!");
                return;
            }
            if (p.hp >= p.maxHp) {
                alert("الطاقة كاملة بالفعل!");
                return;
            }
            if (p.healsCount > 0) {
                p.healsCount--;
                p.hp = p.maxHp;
                createParticles(p.x + p.width/2, p.y + p.height/2, '#10b981', 20, 2);
                alert("🔧 تم إصلاح السفينة بالكامل!");
            } else {
                alert("لا تملك أي عدة إصلاح! اشتريها من المتجر أولاً.");
            }
        }
        else if (item === 'selfRevive') {
            if (p.isAlive) {
                alert("السفينة حية بالفعل ولا تحتاج إنعاش!");
                return;
            }
            if (p.selfReviveKits > 0) {
                p.selfReviveKits--;
                p.isAlive = true;
                p.hp = p.maxHp / 2;
                p.fuel = Math.max(30, p.fuel); // Give starting fuel
                createParticles(p.x + p.width/2, p.y + p.height/2, '#ef4444', 35, 2);
                alert("💉 تم إنعاش السفينة بنجاح بنصف الطاقة!");
            } else {
                alert("لا تملك أي حقن إنعاش! اشتريها من المتجر أولاً.");
            }
        }
        else if (item === 'secondLife') {
            if (p.secondLifes > 0) {
                p.secondLifes--;
                p.isAlive = true;
                p.hp = p.maxHp;
                p.fuel = p.maxFuel;
                createParticles(p.x + p.width/2, p.y + p.height/2, '#eab308', 50, 3);
                alert("🌟 تم تفعيل الفرصة الثانية الفائقة واستعادة كامل الطاقة والوقود!");
            } else {
                alert("لا تملك أي فرصة ثانية فائقة! اشتريها من المتجر أولاً.");
            }
        }
        else if (item === 'tempShield') {
            if (!p.isAlive) {
                alert("يجب أن تكون السفينة حية لتفعيل درع الحماية!");
                return;
            }
            if (p.tempShieldTimeLeft > 0) {
                alert("درع الحماية نشط بالفعل حالياً!");
                return;
            }
            if (p.tempShieldsCount > 0) {
                p.tempShieldsCount--;
                p.tempShieldTimeLeft = 5;
                createParticles(p.x + p.width/2, p.y + p.height/2, '#38bdf8', 15, 1.5);
                alert("🛡️ تم تفعيل درع الحماية المؤقت لمدة 5 ثوانٍ!");
            } else {
                alert("لا تملك أي درع حماية مؤقت! اشتره من المتجر أولاً.");
            }
        }
        
        saveProgress();
        updateHUD();
    });
});

// Shop Logic
function toggleShop(playerIndex = 0) {
    if (activeMode === 'p2p-join') {
        alert("فقط الـ Host يمكنه إيقاف اللعبة لفتح المتجر الآن!");
        return; 
    }
    isShopOpen = !isShopOpen;
    if (isShopOpen) {
        activeShopPlayerIndex = playerIndex;
        shopModal.classList.remove('hidden');
        const shopTitle = shopModal.querySelector('h2');
        if (shopTitle) {
            shopTitle.innerText = `متجر اللاعب ${playerIndex + 1} 🛒`;
        }

        // Dynamically load target teammates for resource transfer
        if (transferTargetSelect) {
            transferTargetSelect.innerHTML = '';
            players.forEach((p, idx) => {
                if (idx !== playerIndex && p.isAlive) {
                    let opt = document.createElement('option');
                    opt.value = idx;
                    opt.innerText = `اللاعب ${idx + 1}`;
                    transferTargetSelect.appendChild(opt);
                }
            });
            const transferSection = document.querySelector('.shop-transfer-section');
            if (transferSection) {
                if (transferTargetSelect.children.length === 0) {
                    transferSection.style.display = 'none';
                } else {
                    transferSection.style.display = 'block';
                }
            }
        }

        updateShopUI();
    } else {
        shopModal.classList.add('hidden');
        saveProgress();
    }
}

function updateShopUI() {
    let p = players[activeShopPlayerIndex] || players[0];
    shopCoinsEl.innerText = p.coins;
    shopGemsEl.innerText = p.gems;

    if (!p.ownedShips) p.ownedShips = ['defender'];
    if (!p.ownedWeapons) p.ownedWeapons = ['normal'];

    // Update all buy buttons dynamically based on ownership
    buyBtns.forEach(btn => {
        let type = btn.getAttribute('data-type');
        let item = btn.getAttribute('data-item');
        let cost = btn.getAttribute('data-cost');
        let currency = btn.getAttribute('data-currency') === 'gems' ? '💎' : '💰';

        if (type === 'weapon') {
            if (p.ownedWeapons.includes(item)) {
                if (p.weaponType === item) {
                    btn.innerText = 'مجهز الحصان 🎖️';
                    btn.style.background = 'linear-gradient(to bottom, #4b5563, #374151)';
                    btn.disabled = true;
                } else {
                    btn.innerText = 'تجهيز 🔄';
                    btn.style.background = 'linear-gradient(to bottom, #3b82f6, #1d4ed8)';
                    btn.disabled = false;
                }
            } else {
                btn.innerText = `شراء بـ ${cost} ${currency}`;
                btn.style.background = '';
                btn.disabled = false;
            }
        } else if (type === 'ship') {
            if (p.ownedShips.includes(item)) {
                if (p.shipType === item) {
                    btn.innerText = 'مجهز الحصان 🎖️';
                    btn.style.background = 'linear-gradient(to bottom, #4b5563, #374151)';
                    btn.disabled = true;
                } else {
                    btn.innerText = 'تجهيز 🔄';
                    btn.style.background = 'linear-gradient(to bottom, #3b82f6, #1d4ed8)';
                    btn.disabled = false;
                }
            } else {
                btn.innerText = `شراء بـ ${cost} ${currency}`;
                btn.style.background = '';
                btn.disabled = false;
            }
        } else if (type === 'drone') {
            if (item === 'heal' && p.hasDroneHeal) {
                btn.innerText = 'مقتناة 🏥';
                btn.disabled = true;
                btn.style.background = '#4b5563';
            } else if (item === 'fuel' && p.hasDroneFuel) {
                btn.innerText = 'مقتناة ⛽';
                btn.disabled = true;
                btn.style.background = '#4b5563';
            } else if (item === 'magnet' && p.hasDroneMagnet) {
                btn.innerText = 'مقتناة 🧲';
                btn.disabled = true;
                btn.style.background = '#4b5563';
            } else {
                btn.innerText = `شراء بـ ${cost} ${currency}`;
                btn.style.background = '';
                btn.disabled = false;
            }
        } else if (type === 'drone-upgrade') {
            let currentLvl = 0;
            if (item === 'heal') currentLvl = p.droneHealLevel;
            else if (item === 'fuel') currentLvl = p.droneFuelLevel;
            else if (item === 'magnet') currentLvl = p.droneMagnetLevel;
            btn.innerText = `ترقية لـ ${currentLvl + 1} (${cost} 💰)`;
            btn.style.background = '';
            btn.disabled = false;
        } else if (type === 'upgrade') {
            if (item === 'reflectiveShield') {
                if (p.hasReflectiveShield) {
                    btn.innerText = 'ممتلكة 🛡️';
                    btn.disabled = true;
                    btn.style.background = '#4b5563';
                } else {
                    btn.innerText = `شراء بـ ${cost} ${currency}`;
                    btn.style.background = '';
                    btn.disabled = false;
                }
            }
        } else if (type === 'consumable') {
            if (item === 'selfRevive') {
                if (p.boughtSelfReviveThisRun) {
                    btn.innerText = 'مباعة 🔒';
                    btn.disabled = true;
                    btn.style.background = '#4b5563';
                } else {
                    btn.innerText = `شراء بـ ${cost} ${currency}`;
                    btn.style.background = '';
                    btn.disabled = false;
                }
            } else if (item === 'secondLife') {
                if (p.boughtSecondLifeThisRun) {
                    btn.innerText = 'مباعة 🔒';
                    btn.disabled = true;
                    btn.style.background = '#4b5563';
                } else {
                    btn.innerText = `شراء بـ ${cost} ${currency}`;
                    btn.style.background = '';
                    btn.disabled = false;
                }
            }
        }
    });
}

closeShopBtn.addEventListener('click', () => toggleShop(activeShopPlayerIndex));

buyBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        let p = players[activeShopPlayerIndex] || players[0];
        let type = btn.getAttribute('data-type');
        let item = btn.getAttribute('data-item');
        let cost = parseInt(btn.getAttribute('data-cost'));
        let currency = btn.getAttribute('data-currency');

        if (!p.ownedShips) p.ownedShips = ['defender'];
        if (!p.ownedWeapons) p.ownedWeapons = ['normal'];

        // If the ship/weapon is already owned, equip it for free
        let isOwned = false;
        if (type === 'weapon' && p.ownedWeapons.includes(item)) isOwned = true;
        if (type === 'ship' && p.ownedShips.includes(item)) isOwned = true;

        if (isOwned) {
            applyPurchase(p, type, item);
            updateShopUI();
            return;
        }

        if (currency === 'coins' && p.coins >= cost) {
            if (applyPurchase(p, type, item)) {
                p.coins -= cost;
            }
        } else if (currency === 'gems' && p.gems >= cost) {
            if (applyPurchase(p, type, item)) {
                p.gems -= cost;
            }
        } else {
            alert("رصيد غير كافٍ!");
        }
        updateShopUI();
    });
});

// Resource Transfer Listeners
if (transferBtns) {
    transferBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            let sender = players[activeShopPlayerIndex] || players[0];
            if (!transferTargetSelect.value) {
                alert("لم يتم اختيار أي لاعب لإرسال الموارد إليه!");
                return;
            }
            let targetIdx = parseInt(transferTargetSelect.value);
            let target = players[targetIdx];
            if (!target || !target.isAlive) {
                alert("اللاعب المستهدف غير متوفر أو غير حي!");
                return;
            }
            
            let type = btn.getAttribute('data-type');
            let amount = parseInt(btn.getAttribute('data-amount'));
            
            if (type === 'coins') {
                if (sender.coins >= amount) {
                    sender.coins -= amount;
                    target.coins += amount;
                    createParticles(target.x + target.width/2, target.y + target.height/2, '#eab308', 15, 1);
                    alert(`تم إرسال ${amount} 💰 إلى اللاعب ${targetIdx + 1}!`);
                } else {
                    alert("لا تملك رصيد كافٍ من الذهب!");
                }
            } else if (type === 'gems') {
                if (sender.gems >= amount) {
                    sender.gems -= amount;
                    target.gems += amount;
                    createParticles(target.x + target.width/2, target.y + target.height/2, '#06b6d4', 15, 1);
                    alert(`تم إرسال ${amount} 💎 إلى اللاعب ${targetIdx + 1}!`);
                } else {
                    alert("لا تملك رصيد كافٍ من الجواهر!");
                }
            } else if (type === 'fuel') {
                if (sender.fuel >= amount) {
                    sender.fuel = Math.max(0, sender.fuel - amount);
                    target.fuel = Math.min(target.maxFuel, target.fuel + amount);
                    createParticles(target.x + target.width/2, target.y + target.height/2, '#10b981', 15, 1);
                    alert(`تم إرسال ${amount} ⛽ وقود إلى اللاعب ${targetIdx + 1}!`);
                } else {
                    alert("لا تملك وقوداً كافياً للإرسال!");
                }
            }
            
            updateShopUI();
            
            // P2P Sync
            if (activeMode === 'p2p-host' || activeMode === 'p2p-join') {
                broadcast({
                    type: 'transfer',
                    senderId: sender.id,
                    targetId: target.id,
                    resourceType: type,
                    amount: amount
                });
            }
        });
    });
}

function applyPurchase(p, type, item) {
    if (!p.ownedShips) p.ownedShips = ['defender'];
    if (!p.ownedWeapons) p.ownedWeapons = ['normal'];

    if (type === 'weapon') {
        p.weaponType = item;
        if (!p.ownedWeapons.includes(item)) p.ownedWeapons.push(item);
        return true;
    } else if (type === 'ship') {
        p.shipType = item;
        if (!p.ownedShips.includes(item)) p.ownedShips.push(item);
        return true;
    } else if (type === 'upgrade') {
        if (item === 'maxFuel') {
            p.maxFuel += 20;
            p.fuel += 20;
            return true;
        } else if (item === 'upgradeMaxHp') {
            p.maxHp += 25;
            p.hp = Math.min(p.maxHp, p.hp + 25);
            alert(`تمت ترقية الطاقة القصوى بنجاح! الطاقة القصوى الآن: ${p.maxHp} 🩸`);
            return true;
        } else if (item === 'upgradeDamage') {
            p.bulletDamageModifier = (p.bulletDamageModifier || 1.0) + 0.25;
            let currentPercentage = Math.round((p.bulletDamageModifier - 1.0) * 100);
            alert(`تمت ترقية قوة المقذوف بنجاح! زيادة الضرر الحالية: +${currentPercentage}% ⚡`);
            return true;
        } else if (item === 'heal') {
            p.healsCount = (p.healsCount || 0) + 1;
            alert("تم شراء عدة الإصلاح بنجاح! 🔧 (تمت إضافتها للمخزن على الجنب)");
            return true;
        } else if (item === 'reflectiveShield') {
            if (p.hasReflectiveShield) {
                alert("تمتلك الدرع العاكس بالفعل!");
                return false;
            }
            p.hasReflectiveShield = true;
            alert("تم شراء الدرع العاكس المغناطيسي بنجاح! 🛡️⚡ (سيفعل تلقائياً كل 15 ثانية)");
            return true;
        }
    } else if (type === 'drone') {
        if (item === 'heal') {
            if (p.hasDroneHeal) {
                alert("تمتلك درون الهيل بالفعل!");
                return false;
            }
            p.hasDroneHeal = true;
            p.droneHealLevel = 1;
            p.lastDroneHealAction = Date.now();
            p.lastDroneHealShot = Date.now();
            return true;
        } else if (item === 'fuel') {
            if (p.hasDroneFuel) {
                alert("تمتلك درون الوقود بالفعل!");
                return false;
            }
            p.hasDroneFuel = true;
            p.droneFuelLevel = 1;
            p.lastDroneFuelAction = Date.now();
            p.lastDroneFuelShot = Date.now();
            return true;
        } else if (item === 'magnet') {
            if (p.hasDroneMagnet) {
                alert("تمتلك درون المغناطيس بالفعل!");
                return false;
            }
            p.hasDroneMagnet = true;
            p.droneMagnetLevel = 1;
            p.lastDroneMagnetAction = Date.now();
            return true;
        }
    } else if (type === 'drone-upgrade') {
        if (item === 'heal') {
            if (!p.hasDroneHeal) {
                alert("يجب شراء درون الهيل أولاً!");
                return false;
            }
            p.droneHealLevel++;
            alert(`تم ترقية درون الهيل للمستوى ${p.droneHealLevel}!`);
            return true;
        } else if (item === 'fuel') {
            if (!p.hasDroneFuel) {
                alert("يجب شراء درون الوقود أولاً!");
                return false;
            }
            p.droneFuelLevel++;
            alert(`تم ترقية درون الوقود للمستوى ${p.droneFuelLevel}!`);
            return true;
        } else if (item === 'magnet') {
            if (!p.hasDroneMagnet) {
                alert("يجب شراء درون المغناطيس أولاً!");
                return false;
            }
            p.droneMagnetLevel++;
            alert(`تم ترقية درون المغناطيس للمستوى ${p.droneMagnetLevel}!`);
            return true;
        }
    } else if (type === 'consumable') {
        if (item === 'selfRevive') {
            p.selfReviveKits = (p.selfReviveKits || 0) + 1;
            alert("تم شراء حقنة الإنعاش الذاتي بنجاح! 💉 (تمت إضافتها للمخزن على الجنب)");
            return true;
        } else if (item === 'secondLife') {
            p.secondLifes = (p.secondLifes || 0) + 1;
            alert("تم شراء الفرصة الثانية الفائقة بنجاح! 🌟 (تمت إضافتها للمخزن على الجنب)");
            return true;
        } else if (item === 'tempShield') {
            p.tempShieldsCount = (p.tempShieldsCount || 0) + 1;
            alert("تم شراء درع الخمس ثوانٍ بنجاح! 🛡️ (تمت إضافته للمخزن على الجنب)");
            return true;
        }
    }
    return false;
}

// --- Fusion Workshop State & Logic ---
let isFusionOpen = false;
let activeFusionTab = 'ships'; // 'ships' or 'weapons'
let activeFusionPlayerIndex = 0;

const SHIP_NAMES_AR = {
    'defender': 'السفينة المدافعة 🛡️',
    'speedster': 'السفينة السريعة ⚡',
    'tank': 'السفينة المدرعة 🧱',
    'healer': 'السفينة المعالجة ✚',
    'ghost': 'السفينة الشبحية 👻',
    'vampire': 'السفينة الخفاشية 🦇'
};

const WEAPON_NAMES_AR = {
    'normal': 'السلاح الأساسي 🔫',
    'frost': 'سلاح الجليد المبطئ ❄️',
    'explosive': 'سلاح المتفجرات المدمر 💥',
    'piercing': 'سلاح الليزر المخترق ⚡',
    'blackhole': 'سلاح الجاذبية الكونية 🕳️'
};

function translateItemName(id) {
    if (!id) return '';
    if (id.startsWith('hybrid-')) {
        let parts = id.replace('hybrid-', '').split('-');
        let n1 = SHIP_NAMES_AR[parts[0]] || WEAPON_NAMES_AR[parts[0]] || parts[0];
        let n2 = SHIP_NAMES_AR[parts[1]] || WEAPON_NAMES_AR[parts[1]] || parts[1];
        // Strip emojis to clean label
        n1 = n1.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '').trim();
        n2 = n2.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '').trim();
        return `هجين: ${n1} + ${n2} 🧪`;
    }
    return SHIP_NAMES_AR[id] || WEAPON_NAMES_AR[id] || id;
}

function getPlayerFusionInfo() {
    let p = null;
    if (players && players[activeFusionPlayerIndex]) {
        p = players[activeFusionPlayerIndex];
    } else if (playersData && playersData[activeFusionPlayerIndex]) {
        p = playersData[activeFusionPlayerIndex];
    }
    return {
        coins: p ? p.coins : 0,
        gems: p ? p.gems : 0,
        ownedShips: p ? (p.ownedShips || ['defender']) : ['defender'],
        ownedWeapons: p ? (p.ownedWeapons || ['normal']) : ['normal']
    };
}

function populateFusionSlots() {
    fuseSlot1.innerHTML = '';
    fuseSlot2.innerHTML = '';
    
    let info = getPlayerFusionInfo();
    let list = activeFusionTab === 'ships' ? info.ownedShips : info.ownedWeapons;
    
    if (list.length < 2) {
        let opt = document.createElement('option');
        opt.value = "";
        opt.innerText = activeFusionTab === 'ships' ? "تحتاج لشراء سفن أكثر لدمجها!" : "تحتاج لشراء أسلحة أكثر لدمجها!";
        fuseSlot1.appendChild(opt);
        
        let opt2 = document.createElement('option');
        opt2.value = "";
        opt2.innerText = activeFusionTab === 'ships' ? "شاهد المتجر لشراء سفن" : "شاهد المتجر لشراء أسلحة";
        fuseSlot2.appendChild(opt2);
        executeFusionBtn.disabled = true;
        return;
    }
    
    executeFusionBtn.disabled = false;
    
    list.forEach(item => {
        let opt = document.createElement('option');
        opt.value = item;
        opt.innerText = translateItemName(item);
        fuseSlot1.appendChild(opt);
        
        let opt2 = document.createElement('option');
        opt2.value = item;
        opt2.innerText = translateItemName(item);
        fuseSlot2.appendChild(opt2);
    });
    
    if (fuseSlot2.options.length > 1) {
        fuseSlot2.selectedIndex = 1;
    }
}

function toggleFusion() {
    isFusionOpen = !isFusionOpen;
    if (isFusionOpen) {
        fusionModal.classList.remove('hidden');
        fusionResultShowcase.classList.add('hidden');
        
        // Populate players select
        fusionPlayerSelect.innerHTML = '';
        const maxPlayers = players.length > 0 ? players.length : Math.max(1, playersData.length);
        for (let i = 0; i < maxPlayers; i++) {
            let opt = document.createElement('option');
            opt.value = i;
            opt.innerText = `اللاعب ${i + 1}`;
            fusionPlayerSelect.appendChild(opt);
        }
        activeFusionPlayerIndex = parseInt(fusionPlayerSelect.value) || 0;
        populateFusionSlots();
    } else {
        fusionModal.classList.add('hidden');
    }
}

// Listeners
if (menuFusionBtn) menuFusionBtn.addEventListener('click', toggleFusion);
if (closeFusionBtn) closeFusionBtn.addEventListener('click', toggleFusion);

if (fusionPlayerSelect) {
    fusionPlayerSelect.addEventListener('change', () => {
        activeFusionPlayerIndex = parseInt(fusionPlayerSelect.value) || 0;
        populateFusionSlots();
    });
}

if (tabFuseShips) {
    tabFuseShips.addEventListener('click', () => {
        activeFusionTab = 'ships';
        tabFuseShips.classList.add('primary');
        tabFuseShips.classList.remove('secondary');
        tabFuseWeapons.classList.add('secondary');
        tabFuseWeapons.classList.remove('primary');
        populateFusionSlots();
    });
}

if (tabFuseWeapons) {
    tabFuseWeapons.addEventListener('click', () => {
        activeFusionTab = 'weapons';
        tabFuseWeapons.classList.add('primary');
        tabFuseWeapons.classList.remove('secondary');
        tabFuseShips.classList.add('secondary');
        tabFuseShips.classList.remove('primary');
        populateFusionSlots();
    });
}

if (executeFusionBtn) {
    executeFusionBtn.addEventListener('click', () => {
        let item1 = fuseSlot1.value;
        let item2 = fuseSlot2.value;
        
        if (!item1 || !item2) {
            alert("يرجى اختيار المكونات المُراد دمجها أولاً!");
            return;
        }
        
        if (item1 === item2) {
            alert("لا يمكن دمج العنصر مع نفسه! اختر مكونين مختلفين.");
            return;
        }
        
        let info = getPlayerFusionInfo();
        if (info.gems < 15) {
            alert("لا تملك جواهر كافية! تكلفة الدمج هي 15 جوهرة 💎.");
            return;
        }
        
        // Deduct gems & perform fusion
        let p = null;
        let isGameInstance = false;
        if (players && players[activeFusionPlayerIndex]) {
            p = players[activeFusionPlayerIndex];
            isGameInstance = true;
        } else if (playersData && playersData[activeFusionPlayerIndex]) {
            p = playersData[activeFusionPlayerIndex];
        }
        
        if (!p) return;
        
        p.gems -= 15;
        
        // Clean prefix if any
        let clean1 = item1.replace('hybrid-', '');
        let clean2 = item2.replace('hybrid-', '');
        // Combine clean parts
        let combinedParts = Array.from(new Set([...clean1.split('-'), ...clean2.split('-')]));
        let hybridId = `hybrid-${combinedParts.join('-')}`;
        
        let resultText = '';
        if (activeFusionTab === 'ships') {
            if (!p.ownedShips.includes(hybridId)) {
                p.ownedShips.push(hybridId);
            }
            p.shipType = hybridId;
            resultText = translateItemName(hybridId);
        } else {
            if (!p.ownedWeapons.includes(hybridId)) {
                p.ownedWeapons.push(hybridId);
            }
            p.weaponType = hybridId;
            resultText = translateItemName(hybridId);
        }
        
        // Show result display
        fusionResultText.innerText = resultText;
        fusionResultShowcase.classList.remove('hidden');
        
        // Save progress immediately
        saveProgress();
        
        // Update UI
        populateFusionSlots();
        updateHUD();
        
        // Play particles if in game instance
        if (isGameInstance) {
            createParticles(canvas.width / 2, canvas.height / 2, '#a855f7', 80, 3);
        }
        alert(`🎉 تم دمج وصياغة: ${resultText}`);
    });
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
    if (activeMode === 'local') {
        localPlayerCount = 1;
        startGame();
    } else if (activeMode === 'local-coop') {
        // Show player count selector modal
        mainMenu.classList.add('hidden');
        if (playerCountModal) {
            playerCountModal.style.display = 'flex';
        }
    } else {
        mainMenu.classList.add('hidden');
        p2pMenu.classList.remove('hidden');
    }
}));

// Player count modal handlers
if (countBtns) {
    countBtns.forEach(btn => btn.addEventListener('click', () => {
        localPlayerCount = parseInt(btn.getAttribute('data-count')) || 2;
        activeMode = 'local-coop';
        if (playerCountModal) playerCountModal.style.display = 'none';
        startGame();
    }));
}
if (closeCountBtn) {
    closeCountBtn.addEventListener('click', () => {
        if (playerCountModal) playerCountModal.style.display = 'none';
        mainMenu.classList.remove('hidden');
    });
}

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
        } else if (data.type === 'ultimate_triggered') {
            const p = players[data.playerIdx];
            if (p && p.isAlive) {
                p.ultCharge = 0;
                let baseShip = data.shipType;
                if (baseShip.includes('defender')) {
                    for (let angle = 0; angle < Math.PI * 2; angle += (Math.PI * 2 / 24)) {
                        let vx = Math.cos(angle) * 500;
                        let vy = Math.sin(angle) * 500;
                        bullets.push(new Bullet(p.x + p.width/2 - 3, p.y + p.height/2, vy, '#a855f7', p.id, 'explosive'));
                        bullets[bullets.length - 1].vx = vx;
                        bullets[bullets.length - 1].damageMultiplier = p.bulletDamageModifier || 1.0;
                    }
                    createParticles(p.x + p.width/2, p.y + p.height/2, '#a855f7', 40, 3);
                } else if (baseShip.includes('speedster')) {
                    bulletTimeLeft = 5.0;
                    createParticles(p.x + p.width/2, p.y + p.height/2, '#38bdf8', 40, 3);
                } else if (baseShip.includes('tank')) {
                    p.tankUltTimeLeft = 5.0;
                    p.tempShieldTimeLeft = 5.0;
                    createParticles(p.x + p.width/2, p.y + p.height/2, '#e11d48', 40, 3);
                } else if (baseShip.includes('healer') || baseShip.includes('hybrid')) {
                    players.forEach(other => {
                        if (other.isAlive) {
                            other.hp = other.maxHp;
                            createParticles(other.x + other.width/2, other.y + other.height/2, '#10b981', 30, 2);
                        } else {
                            other.isAlive = true;
                            other.hp = other.maxHp / 2;
                            other.fuel = Math.max(40, other.fuel);
                            createParticles(other.x + other.width/2, other.y + other.height/2, '#10b981', 40, 3);
                        }
                    });
                }
            }
        } else if (data.type === 'sync') {
            syncState(data);
        } else if (data.type === 'rematch') {
            startGame();
        } else if (data.type === 'shoot') {
            bullets.push(new Bullet(data.x + 29, data.y, -700, data.id === 1 ? '#3b82f6' : '#8b5cf6', data.id));
            createParticles(data.x + 32, data.y, data.id === 1 ? '#3b82f6' : '#8b5cf6', 3, 2);
        } else if (data.type === 'enemy_shoot') {
            bullets.push(new Bullet(data.x + data.w / 2 - 3, data.y + data.h, 300, '#ef4444', 'enemy'));
        } else if (data.type === 'player_input') {
            const p = players.find(p => p.id === data.id);
            if(p) {
                p.x = data.x;
                p.y = data.y;
            }
        } else if (data.type === 'transfer') {
            const sender = players.find(p => p.id === data.senderId);
            const target = players.find(p => p.id === data.targetId);
            if (sender && target) {
                if (data.resourceType === 'coins') {
                    sender.coins -= data.amount;
                    target.coins += data.amount;
                    createParticles(target.x + target.width/2, target.y + target.height/2, '#eab308', 15, 1);
                } else if (data.resourceType === 'gems') {
                    sender.gems -= data.amount;
                    target.gems += data.amount;
                    createParticles(target.x + target.width/2, target.y + target.height/2, '#06b6d4', 15, 1);
                } else if (data.resourceType === 'fuel') {
                    sender.fuel = Math.max(0, sender.fuel - data.amount);
                    target.fuel = Math.min(target.maxFuel, target.fuel + data.amount);
                    createParticles(target.x + target.width/2, target.y + target.height/2, '#10b981', 15, 1);
                }
                updateShopUI();
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
const PLAYER_COLORS = ['#3b82f6', '#8b5cf6', '#a855f7', '#10b981', '#f59e0b', '#06b6d4'];

function getSpawnPositions(count) {
    // Distribute players evenly along the bottom
    const positions = [];
    const spacing = canvas.width / (count + 1);
    for (let i = 0; i < count; i++) {
        positions.push({ x: spacing * (i + 1) - 32, y: canvas.height - 100 });
    }
    return positions;
}

function startGame() {
    mainMenu.classList.add('hidden');
    p2pMenu.classList.add('hidden');
    if (playerCountModal) playerCountModal.style.display = 'none';
    gameOverScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');

    players = [];
    bullets = [];
    enemies = [];
    particles = [];
    fuelItems = [];
    meteorites = [];
    bosses = [];
    coins = [];
    gems = [];
    isBossWave = false;
    wave = 1;
    waveTimer = 0;
    isGameOver = false;
    keys = {};

    // Hide all player HUDs first
    playerHuds.forEach(h => { if (h) h.classList.add('hidden'); });

    if (activeMode === 'p2p-host' || activeMode === 'p2p-join') {
        // P2P: exactly 2 players
        localPlayerCount = 2;
    }

    const spawnPositions = getSpawnPositions(localPlayerCount);

    for (let i = 0; i < localPlayerCount; i++) {
        const pos = spawnPositions[i];
        const p = new Player(i + 1, pos.x, pos.y, PLAYER_COLORS[i]);
        
        // استرجاع بيانات اللاعب إذا توفرت
        if (playersData[i]) {
            p.coins = playersData[i].coins || 0;
            p.gems = playersData[i].gems || 0;
            p.shipType = playersData[i].shipType || 'defender';
            p.weaponType = playersData[i].weaponType || 'normal';
            p.hasDroneHeal = playersData[i].hasDroneHeal || false;
            p.hasDroneFuel = playersData[i].hasDroneFuel || false;
            p.hasDroneMagnet = playersData[i].hasDroneMagnet || false;
            p.droneHealLevel = playersData[i].droneHealLevel || 0;
            p.droneFuelLevel = playersData[i].droneFuelLevel || 0;
            p.droneMagnetLevel = playersData[i].droneMagnetLevel || 0;
            p.ownedWeapons = playersData[i].ownedWeapons || ['normal'];
            p.ownedShips = playersData[i].ownedShips || ['defender'];
            p.hasReflectiveShield = playersData[i].hasReflectiveShield || false;
            p.healsCount = playersData[i].healsCount || 0;
            p.selfReviveKits = playersData[i].selfReviveKits || 0;
            p.secondLifes = playersData[i].secondLifes || 0;
            p.tempShieldsCount = playersData[i].tempShieldsCount || 0;
            p.bulletDamageModifier = playersData[i].bulletDamageModifier || 1.0;
            p.maxHp = playersData[i].maxHp || 100;
            p.hp = p.maxHp;
        }
        
        players.push(p);
        // Show HUD for this player
        if (playerHuds[i]) playerHuds[i].classList.remove('hidden');
    }

    if (activeMode === 'p2p-join' || activeMode === 'p2p-host') {
        if (p2ControlsHint) p2ControlsHint.innerText = '(الزميل)';
    }

    updateHUD();
    lastTime = performance.now();
    cancelAnimationFrame(animationId);
    animate(lastTime);
}

function updateHUD() {
    players.forEach((p, i) => {
        if (playerHps[i]) playerHps[i].style.width = `${Math.max(0, p.hp / p.maxHp * 100)}%`;
        if (playerFuels[i]) playerFuels[i].style.width = `${Math.max(0, p.fuel / p.maxFuel * 100)}%`;
        if (playerScores[i]) playerScores[i].innerText = p.score;
        if (playerCoins[i]) playerCoins[i].innerText = p.coins;
        if (playerGems[i]) playerGems[i].innerText = p.gems;

        // Update Ultimate Bar
        let ultBar = document.getElementById(`p${i+1}-ult`);
        if (ultBar) {
            let charge = p.ultCharge || 0;
            ultBar.style.width = `${charge}%`;
            let barBg = ultBar.parentElement;
            if (charge >= 100) {
                barBg.classList.add('charged');
                ultBar.classList.add('charged');
            } else {
                barBg.classList.remove('charged');
                ultBar.classList.remove('charged');
            }
        }
        
        // Update inventory counts
        let hudEl = document.getElementById(`p${i+1}-hud`);
        if (hudEl) {
            let btns = hudEl.querySelectorAll('.inv-btn');
            btns.forEach(btn => {
                let item = btn.getAttribute('data-item');
                let countEl = btn.querySelector('.count');
                if (countEl) {
                    if (item === 'heal') countEl.innerText = p.healsCount || 0;
                    else if (item === 'selfRevive') countEl.innerText = p.selfReviveKits || 0;
                    else if (item === 'secondLife') countEl.innerText = p.secondLifes || 0;
                    else if (item === 'tempShield') countEl.innerText = p.tempShieldsCount || 0;
                }
            });
        }
    });
    waveNumberEl.innerText = wave;
}

function checkCollisions() {
    // Bullets vs Enemies/Players
    bullets.forEach(b => {
        if (b.ownerId === 'enemy') {
            players.forEach(p => {
                if (p.isAlive) {
                    // Check shield collision first if active
                    if (p.isShieldActive && rectIntersect(b.x, b.y, b.width, b.height, p.x - p.width * 0.3, p.y - p.height * 0.3, p.width * 1.6, p.height * 1.6)) {
                        b.vy = -Math.abs(b.vy);
                        b.vx = (Math.random() - 0.5) * 200;
                        b.ownerId = p.id;
                        b.color = '#06b6d4';
                        createParticles(b.x, b.y, '#06b6d4', 8, 1.5);
                        return;
                    }
                    
                    // Normal player body collision
                    if (rectIntersect(b.x, b.y, b.width, b.height, p.x, p.y, p.width, p.height)) {
                        b.markedForDeletion = true;
                        if(activeMode !== 'p2p-join') {
                            if (p.tempShieldTimeLeft && p.tempShieldTimeLeft > 0) {
                                createParticles(b.x, b.y, '#38bdf8', 5);
                                return;
                            }
                            let enemyDmg = Math.round(10 * (1.0 + (wave - 1) * 0.12));
                            p.hp -= enemyDmg;
                            createParticles(p.x + p.width/2, p.y + p.height/2, '#3b82f6', 10);
                            if(p.hp <= 0) p.triggerDeathOrResurrection();
                        }
                    }
                }
            });
        } else {
            enemies.forEach(e => {
                if (rectIntersect(b.x, b.y, b.width, b.height, e.x, e.y, e.width, e.height) && !b.markedForDeletion) {
                    if (!b.type.includes('piercing') && !b.type.includes('blackhole')) b.markedForDeletion = true;
                    if(activeMode !== 'p2p-join') {
                        if(b.type.includes('frost')) e.slowTimer = 3;
                        
                        let damage = 10;
                        if (b.type.includes('explosive')) damage = 30;
                        else if (b.type.includes('blackhole')) damage = 15;
                        else if (b.isSniper) damage = 40;
                        
                        damage = Math.round(damage * (b.damageMultiplier || 1.0));
                        e.hp -= damage;
                        createParticles(b.x, b.y, e.color, 5);

                        if(b.type.includes('explosive')) {
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
                                owner.ultCharge = Math.min(100, (owner.ultCharge || 0) + 8);
                                if(owner.shipType.includes('vampire') && owner.hp < owner.maxHp) {
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
                    if (!b.type.includes('piercing') && !b.type.includes('blackhole')) b.markedForDeletion = true;
                    if(activeMode !== 'p2p-join') {
                        let damage = 10;
                        if (b.type.includes('explosive')) damage = 30;
                        else if (b.type.includes('blackhole')) damage = 15;
                        damage = Math.round(damage * (b.damageMultiplier || 1.0));
                        boss.hp -= damage;
                        createParticles(b.x, b.y, '#9333ea', 5);
                        if(b.type.includes('explosive')) createParticles(b.x, b.y, '#ef4444', 40, 3);
                        if(boss.hp <= 0) {
                            boss.markedForDeletion = true;
                            createParticles(boss.x + boss.width/2, boss.y + boss.height/2, '#9333ea', 100, 3);
                            isBossWave = false; // Boss dead, proceed
                            wave++; // Increment wave so we don't spawn boss again
                            const owner = players.find(p => p.id === b.ownerId);
                            if(owner) { 
                                owner.score += boss.maxHp; 
                                owner.gems += 5; 
                                owner.coins += 50; 
                                owner.ultCharge = Math.min(100, (owner.ultCharge || 0) + 40);
                            }
                            
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
            meteorites.forEach(m => {
                if (rectIntersect(b.x, b.y, b.width, b.height, m.x, m.y, m.width, m.height) && !b.markedForDeletion && !m.markedForDeletion) {
                    if (!b.type.includes('piercing') && !b.type.includes('blackhole')) b.markedForDeletion = true;
                    if (activeMode !== 'p2p-join') {
                        let damage = 10;
                        if (b.type.includes('explosive')) damage = 30;
                        else if (b.type.includes('blackhole')) damage = 15;
                        
                        m.hp -= damage;
                        createParticles(b.x, b.y, '#78716c', 5);
                        
                        if (b.type.includes('explosive')) {
                            createParticles(b.x, b.y, '#ef4444', 30, 2);
                        }
                        
                        if (m.hp <= 0) {
                            m.markedForDeletion = true;
                            createParticles(m.x + m.width/2, m.y + m.height/2, m.isGolden ? '#fbbf24' : '#78716c', 20, 2.0);
                            
                            const owner = players.find(p => p.id === b.ownerId);
                            if (owner) {
                                owner.score += m.isGolden ? 100 : Math.round(m.width);
                                // Drops
                                let dropRoll = Math.random();
                                if (m.isGolden) {
                                    coins.push(new Coin(m.x, m.y));
                                    gems.push(new Gem(m.x, m.y));
                                } else {
                                    if (dropRoll < 0.08) gems.push(new Gem(m.x, m.y));
                                    else if (dropRoll < 0.25) coins.push(new Coin(m.x, m.y));
                                    else if (dropRoll < 0.4) fuelItems.push(new FuelItem(m.x, m.y));
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
                    if (p.tankUltTimeLeft && p.tankUltTimeLeft > 0) {
                        createParticles(e.x + e.width/2, e.y + e.height/2, '#e11d48', 25, 2.0);
                        p.score += e.maxHp;
                        return;
                    }
                    if (p.tempShieldTimeLeft && p.tempShieldTimeLeft > 0) {
                        createParticles(p.x + p.width/2, p.y + p.height/2, '#38bdf8', 15, 1.5);
                        return;
                    }
                    if (p.shipType.includes('ghost') && Math.random() < 0.2) {
                        createParticles(p.x + p.width/2, p.y + p.height/2, '#ffffff', 10, 1);
                        return; // Evade
                    }
                    let damage = e.type === 5 ? 30 : 20;
                    damage = Math.round(damage * (1.0 + (wave - 1) * 0.12));
                    if (e.type === 5) {
                        createParticles(p.x + p.width/2, p.y + p.height/2, '#f97316', 30, 2.5); // larger explosion
                    } else {
                        createParticles(p.x + p.width/2, p.y + p.height/2, '#ef4444', 20, 2);
                    }
                    p.hp -= p.shipType.includes('tank') ? Math.round(damage / 2) : damage;
                    if(p.hp <= 0) p.triggerDeathOrResurrection();
                }
            });
            // Vs Meteorites
            meteorites.forEach(m => {
                if (rectIntersect(p.x, p.y, p.width, p.height, m.x, m.y, m.width, m.height)) {
                    m.markedForDeletion = true;
                    if (m.isGolden) {
                        p.coins += 10;
                        p.gems += 2;
                        createParticles(m.x + m.width/2, m.y + m.height/2, '#fbbf24', 20, 2.0); // gold explosion
                        return; // No damage to player!
                    }
                    if (p.tempShieldTimeLeft && p.tempShieldTimeLeft > 0) {
                        createParticles(p.x + p.width/2, p.y + p.height/2, '#38bdf8', 15, 1.5);
                        return;
                    }
                    if (p.shipType.includes('ghost') && Math.random() < 0.2) {
                        createParticles(p.x + p.width/2, p.y + p.height/2, '#ffffff', 10, 1);
                        return; // Evade
                    }
                    let metDmg = Math.round((p.shipType.includes('tank') ? 0 : 50) * (1.0 + (wave - 1) * 0.10));
                    p.hp -= metDmg;
                    createParticles(p.x + p.width/2, p.y + p.height/2, '#78716c', 30, 3);
                    if(p.hp <= 0) p.triggerDeathOrResurrection();
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
    if (activeMode !== 'p2p-join' && players.length >= 2) {
        for (let i = 0; i < players.length; i++) {
            let p1 = players[i];
            for (let j = 0; j < players.length; j++) {
                if (i === j) continue;
                let p2 = players[j];
                
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
                    }
                    // Heal Logic (Health Sharing)
                    else if (p1.isAlive && p2.isAlive) {
                        if (p1.hp > p2.hp + 2) {
                            p1.hp -= 0.5;
                            p2.hp += 0.5;
                            if(Math.random() > 0.7) createParticles(p2.x + p2.width/2, p2.y + p2.height/2, '#10b981', 1);
                        }
                    }
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

    // Escalated enemy count: more enemies in higher waves
    let count = wave * 4 + 4;
    for (let i = 0; i < count; i++) {
        let rand = Math.random();
        let type = 1;
        
        // Introduce Type 4 (Healer) at wave 4+ and Type 5 (Kamikaze) at wave 2+
        if (wave >= 4 && rand < 0.12) {
            type = 4; // healer spawn rate
        } else if (wave >= 2 && rand < 0.26) {
            type = 5; // Kamikaze spawn rate
        } else if (rand < 0.52) {
            type = 1; // Basic
        } else if (rand < 0.77) {
            type = 2; // Fast
        } else {
            type = 3; // Tank
        }
        
        let x = Math.random() * (canvas.width - 60);
        let y = -Math.random() * 500 - 100;
        enemies.push(new Enemy(x, y, type));
    }

    // Spawn Meteorites occasionally or trigger a Golden Meteor Shower!
    let isGoldenShower = (wave % 4 === 3);
    if (isGoldenShower) {
        warningText = "⚠️ عاصفة نيازك ذهبية تقترب! 🌌✨";
        warningTimer = 4.0; // 4 seconds warning display on screen
        for (let j = 0; j < wave + 3; j++) {
            meteorites.push(new Meteorite(Math.random() * canvas.width, -100 - Math.random() * 300, (Math.random() - 0.5) * 100, Math.random() * 80 + 80, Math.random() * 40 + 35, true));
        }
    } else if (Math.random() > 0.5) {
        for (let j = 0; j < wave; j++) {
            meteorites.push(new Meteorite(Math.random() * canvas.width, -100, (Math.random() - 0.5) * 100, Math.random() * 100 + 100, Math.random() * 40 + 30, false));
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

    // Draw Event Warning notification
    if (warningTimer > 0) {
        warningTimer -= dt;
        ctx.save();
        ctx.fillStyle = '#fcd34d';
        ctx.font = 'bold 30px "Cairo", Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#f59e0b';
        ctx.fillText(warningText, canvas.width / 2, canvas.height / 3);
        ctx.restore();
    }

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

function triggerUltimate(playerIdx) {
    let p = players[playerIdx];
    if (!p || !p.isAlive || isGameOver) return;
    
    if (p.ultCharge < 100) {
        alert("القدرة الخارقة لم تشحن بالكامل بعد!");
        return;
    }
    
    p.ultCharge = 0;
    
    let baseShip = p.shipType;
    if (baseShip.includes('defender')) {
        for (let angle = 0; angle < Math.PI * 2; angle += (Math.PI * 2 / 24)) {
            let vx = Math.cos(angle) * 500;
            let vy = Math.sin(angle) * 500;
            bullets.push(new Bullet(p.x + p.width/2 - 3, p.y + p.height/2, vy, '#a855f7', p.id, 'explosive'));
            bullets[bullets.length - 1].vx = vx;
            bullets[bullets.length - 1].damageMultiplier = p.bulletDamageModifier || 1.0;
        }
        createParticles(p.x + p.width/2, p.y + p.height/2, '#a855f7', 40, 3);
        alert("⚡ تم إطلاق إعصار البلازما الخارق!");
    }
    else if (baseShip.includes('speedster')) {
        bulletTimeLeft = 5.0;
        createParticles(p.x + p.width/2, p.y + p.height/2, '#38bdf8', 40, 3);
        alert("⏰ تم إبطاء الوقت بنسبة 80% لجميع الأعداء والمقذوفات!");
    }
    else if (baseShip.includes('tank')) {
        p.tankUltTimeLeft = 5.0;
        p.tempShieldTimeLeft = 5.0;
        createParticles(p.x + p.width/2, p.y + p.height/2, '#e11d48', 40, 3);
        alert("👹 طور المدرعة العملاقة نشط! اصطدم بالأعداء لتدميرهم!");
    }
    else if (baseShip.includes('healer') || baseShip.includes('hybrid')) {
        players.forEach(other => {
            if (other.isAlive) {
                other.hp = other.maxHp;
                createParticles(other.x + other.width/2, other.y + other.height/2, '#10b981', 30, 2);
            } else {
                other.isAlive = true;
                other.hp = other.maxHp / 2;
                other.fuel = Math.max(40, other.fuel);
                createParticles(other.x + other.width/2, other.y + other.height/2, '#10b981', 40, 3);
            }
        });
        alert("💉 تم إطلاق موجة الشفاء الكبرى وإحياء جميع الزملاء الموتى!");
    } else {
        for (let angle = 0; angle < Math.PI * 2; angle += (Math.PI * 2 / 12)) {
            let vx = Math.cos(angle) * 450;
            let vy = Math.sin(angle) * 450;
            bullets.push(new Bullet(p.x + p.width/2 - 3, p.y + p.height/2, vy, '#06b6d4', p.id, 'normal'));
            bullets[bullets.length - 1].vx = vx;
            bullets[bullets.length - 1].damageMultiplier = p.bulletDamageModifier || 1.0;
        }
        createParticles(p.x + p.width/2, p.y + p.height/2, '#06b6d4', 30, 2.5);
        alert("⚡ تم إطلاق انفجار الطاقة الموجي!");
    }
    
    if (activeMode === 'p2p-host' || activeMode === 'p2p-join') {
        broadcast({
            type: 'ultimate_triggered',
            playerIdx: playerIdx,
            shipType: p.shipType
        });
    }
    
    saveProgress();
    updateHUD();
}

// Bind manual clicks to HUD ultimate bars
for (let i = 1; i <= 6; i++) {
    let ultBar = document.getElementById(`p${i}-ult`);
    if (ultBar) {
        ultBar.parentElement.addEventListener('click', () => {
            triggerUltimate(i - 1);
        });
    }
}
