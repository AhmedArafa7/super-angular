const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const gameContainer = document.getElementById('game-container');
const statusText = document.getElementById('status-text');
const restartBtn = document.getElementById('restart-btn');
const menuBtn = document.getElementById('menu-btn');
const controlsHelp = document.querySelectorAll('#controls-help div');

// Menu Elements
const modeSelection = document.getElementById('mode-selection');
const localMenu = document.getElementById('local-menu');
const p2pMenu = document.getElementById('p2p-menu');
const modeBtns = document.querySelectorAll('.mode-btn');
const backBtns = document.querySelectorAll('.back-to-modes-btn');
const playerBtns = document.querySelectorAll('.player-btn');

// P2P Elements
const createRoomBtn = document.getElementById('create-room-btn');
const roomInfo = document.getElementById('room-info');
const roomIdDisplay = document.getElementById('roomIdDisplay');
const joinRoomIdInput = document.getElementById('join-room-id');
const joinRoomBtn = document.getElementById('join-room-btn');
const joinError = document.getElementById('join-error');

// Game State
let gameInterval;
let isGameOver = false;
let numPlayers = 2;
let numAI = 0;
let activeMode = 'local'; // 'local', 'p2p-host', 'p2p-join'
let gameMode = 'classic'; // 'classic', 'survival', 'baseDefense', 'bossFight'

// Network State
let peer = null;
let conn = null;
let guestInput = { up: false, down: false, left: false, right: false, shoot: false };

const TANK_SIZE = 30;
const BULLET_SIZE = 6;
const BULLET_SPEED = 8;
const TANK_SPEED = 3;
const FIRE_COOLDOWN = 30;

const PLAYER_CONFIGS = [
    { id: 1, color: '#4fc3f7', keys: { up: 'w', down: 's', left: 'a', right: 'd', shoot: ' ' }, startX: 50, startY: 50 },
    { id: 2, color: '#ef5350', keys: { up: 'arrowup', down: 'arrowdown', left: 'arrowleft', right: 'arrowright', shoot: 'enter' }, startX: 720, startY: 520 },
    { id: 3, color: '#81c784', keys: { up: 'i', down: 'k', left: 'j', right: 'l', shoot: 'p' }, startX: 50, startY: 520 },
    { id: 4, color: '#fff176', keys: { up: '8', down: '5', left: '4', right: '6', shoot: '0' }, startX: 720, startY: 50 }
];

let players = [];
let bullets = [];
let walls = [];
let planes = [];
let powerUps = [];
let planeSpawnTimer = 0;
let keysDown = {};

// New Environment State
let barrels = [];
let explosions = [];
let teleporters = [];
let terrains = [];
let isNightMode = false;
let nightTimer = 0;

// Game Modes State
let base = null;
let boss = null;
let wave = 1;
let waveTimer = 0;
let aiSpawnTimer = 0;
let nightModeEnabled = true;

// Key Listeners
document.addEventListener('keydown', e => { 
    keysDown[e.key.toLowerCase()] = true; 
    sendGuestInput();
});
document.addEventListener('keyup', e => { 
    keysDown[e.key.toLowerCase()] = false; 
    sendGuestInput();
});

// --- Mobile Controls ---
const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

if (isTouchDevice) {
    const pKeys = {
        1: { up: 'w', down: 's', left: 'a', right: 'd', shoot: ' ' },
        2: { up: 'arrowup', down: 'arrowdown', left: 'arrowleft', right: 'arrowright', shoot: 'enter' },
        3: { up: 'i', down: 'k', left: 'j', right: 'l', shoot: 'p' },
        4: { up: '8', down: '5', left: '4', right: '6', shoot: '0' }
    };

    const mapTouchToKey = (btnId, key) => {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); keysDown[key] = true; sendGuestInput(); }, {passive: false});
        btn.addEventListener('touchend', (e) => { e.preventDefault(); keysDown[key] = false; sendGuestInput(); }, {passive: false});
        // Handle touch cancel/leave
        btn.addEventListener('touchcancel', (e) => { e.preventDefault(); keysDown[key] = false; sendGuestInput(); }, {passive: false});
    };

    for(let i=1; i<=4; i++) {
        mapTouchToKey(`btn-up-${i}`, pKeys[i].up);
        mapTouchToKey(`btn-down-${i}`, pKeys[i].down);
        mapTouchToKey(`btn-left-${i}`, pKeys[i].left);
        mapTouchToKey(`btn-right-${i}`, pKeys[i].right);
        mapTouchToKey(`btn-shoot-${i}`, pKeys[i].shoot);
    }
}

function getGenericLocalInput() {
    return {
        up: keysDown['w'] || keysDown['arrowup'],
        down: keysDown['s'] || keysDown['arrowdown'],
        left: keysDown['a'] || keysDown['arrowleft'],
        right: keysDown['d'] || keysDown['arrowright'],
        shoot: keysDown[' '] || keysDown['enter']
    };
}

function sendGuestInput() {
    if (activeMode === 'p2p-join' && conn && conn.open) {
        conn.send({ type: 'input', input: getGenericLocalInput() });
    }
}

// Menu Navigation
modeBtns.forEach(btn => btn.addEventListener('click', e => {
    if (btn.disabled) return;
    const mode = e.target.dataset.mode;
    modeSelection.classList.add('hidden');
    if (mode === 'local') localMenu.classList.remove('hidden');
    if (mode === 'p2p') p2pMenu.classList.remove('hidden');
}));

backBtns.forEach(btn => btn.addEventListener('click', () => {
    localMenu.classList.add('hidden');
    p2pMenu.classList.add('hidden');
    modeSelection.classList.remove('hidden');
}));

playerBtns.forEach(btn => btn.addEventListener('click', e => {
    numPlayers = parseInt(e.target.dataset.players);
    numAI = parseInt(e.target.dataset.ai || '0');
    activeMode = 'local';
    startGame();
}));

// P2P Logic - Host
createRoomBtn.addEventListener('click', () => {
    createRoomBtn.disabled = true;
    createRoomBtn.innerText = 'Initializing...';
    
    peer = new Peer();
    
    peer.on('open', id => {
        roomInfo.classList.remove('hidden');
        document.getElementById('room-id-display').innerText = id;
        createRoomBtn.classList.add('hidden');
        statusText.innerText = 'Waiting for challenger...';
    });
    
    peer.on('connection', connection => {
        conn = connection;
        setupHostConnection();
    });
    
    peer.on('error', err => {
        alert('Network Error: ' + err.message);
        createRoomBtn.disabled = false;
        createRoomBtn.innerText = 'Create Room';
    });
});

function setupHostConnection() {
    conn.on('open', () => {
        // Player joined! Start a 1v1 P2P game
        activeMode = 'p2p-host';
        numPlayers = 2;
        numAI = 0;
        gameMode = document.getElementById('game-mode-select').value;
        conn.send({ type: 'start', mode: gameMode });
        startGame();
    });
    
    conn.on('data', data => {
        if (data.type === 'input') {
            guestInput = data.input;
        }
    });
}

// P2P Logic - Join
joinRoomBtn.addEventListener('click', () => {
    const hostId = joinRoomIdInput.value.trim();
    if (!hostId) {
        joinError.innerText = 'Please enter a Room ID';
        joinError.classList.remove('hidden');
        return;
    }
    
    joinRoomBtn.disabled = true;
    joinRoomBtn.innerText = 'Connecting...';
    joinError.classList.add('hidden');
    
    peer = new Peer();
    
    peer.on('open', () => {
        conn = peer.connect(hostId);
        
        conn.on('open', () => {
            statusText.innerText = 'Connected! Waiting for Host to start...';
        });
        
        conn.on('data', data => {
            if (data.type === 'start') {
                activeMode = 'p2p-join';
                if (data.mode) gameMode = data.mode;
                startGame();
            } else if (data.type === 'state') {
                players = data.state.players;
                bullets = data.state.bullets;
                walls = data.state.walls;
                planes = data.state.planes || [];
                powerUps = data.state.powerUps || [];
                barrels = data.state.barrels || [];
                explosions = data.state.explosions || [];
                teleporters = data.state.teleporters || [];
                terrains = data.state.terrains || [];
                isNightMode = data.state.isNightMode || false;
                base = data.state.base || null;
                boss = data.state.boss || null;
                wave = data.state.wave || 1;
                isGameOver = data.state.isGameOver;
                if (!isGameOver) {
                    draw();
                } else if (data.state.winnerMsg) {
                    endGameClient(data.state.winnerMsg, data.state.winnerColor);
                }
            }
        });
    });
    
    peer.on('error', err => {
        joinError.innerText = 'Connection failed: ' + err.message;
        joinError.classList.remove('hidden');
        joinRoomBtn.disabled = false;
        joinRoomBtn.innerText = 'Connect & Play';
    });
});

restartBtn.addEventListener('click', () => {
    if (activeMode === 'p2p-join') return; // Only host can restart
    if (activeMode === 'p2p-host' && conn && conn.open) conn.send({ type: 'start' });
    startGame();
});

menuBtn.addEventListener('click', () => {
    gameContainer.classList.add('hidden');
    modeSelection.classList.remove('hidden');
    localMenu.classList.add('hidden');
    p2pMenu.classList.add('hidden');
    roomInfo.classList.add('hidden');
    createRoomBtn.classList.remove('hidden');
    createRoomBtn.disabled = false;
    createRoomBtn.innerText = 'Create Room';
    joinRoomBtn.disabled = false;
    joinRoomBtn.innerText = 'Connect & Play';
    
    statusText.innerText = 'Select Game Mode';
    statusText.style.color = '#eee';
    restartBtn.classList.add('hidden');
    menuBtn.classList.add('hidden');
    
    for(let i=1; i<=4; i++) {
        const ctrl = document.getElementById(`controls-p${i}`);
        if(ctrl) ctrl.classList.remove('visible');
    }
    
    if (peer) {
        peer.destroy();
        peer = null;
    }
});

function createWalls() {
    walls = [];
    walls.push({x: 80, y: 80, w: 160, h: 120});
    walls.push({x: 320, y: 80, w: 160, h: 120});
    walls.push({x: 560, y: 80, w: 160, h: 120});
    walls.push({x: 80, y: 280, w: 160, h: 40});
    // Removed middle wall to allow base/boss to spawn freely
    walls.push({x: 560, y: 280, w: 160, h: 40});
    walls.push({x: 80, y: 400, w: 160, h: 120});
    walls.push({x: 320, y: 400, w: 160, h: 120});
    walls.push({x: 560, y: 400, w: 160, h: 120});
}

function initEnvironment() {
    barrels = [];
    explosions = [];
    teleporters = [];
    terrains = [];
    isNightMode = false;
    nightTimer = 600 + Math.random() * 1200; // 10-20 seconds before first night

    // Terrains
    for(let i=0; i<3; i++) {
        terrains.push({
            x: Math.random() * (canvas.width - 100),
            y: Math.random() * (canvas.height - 100),
            r: 50 + Math.random() * 80,
            type: Math.random() > 0.5 ? 'mud' : 'ice'
        });
    }
    // Teleporters (Corners)
    teleporters.push({ id: 0, x: 50, y: 50, link: 1 });
    teleporters.push({ id: 1, x: canvas.width - 50, y: canvas.height - 50, link: 0 });
    teleporters.push({ id: 2, x: canvas.width - 50, y: 50, link: 3 });
    teleporters.push({ id: 3, x: 50, y: canvas.height - 50, link: 2 });
    
    // Barrels
    for(let i=0; i<6; i++) {
        barrels.push({ x: 100 + Math.random()*(canvas.width-200), y: 100 + Math.random()*(canvas.height-200), r: 12 });
    }
}

function startGame() {
    isGameOver = false;
    if (activeMode !== 'p2p-join') {
        gameMode = document.getElementById('game-mode-select').value;
        const toggle = document.getElementById('night-mode-toggle');
        if (toggle) nightModeEnabled = toggle.checked;
    }
    modeSelection.classList.add('hidden');
    localMenu.classList.add('hidden');
    p2pMenu.classList.add('hidden');
    gameContainer.classList.remove('hidden');
    restartBtn.classList.add('hidden');
    menuBtn.classList.add('hidden');
    statusText.innerText = 'BATTLE!';
    statusText.style.color = '#eee';
    
    base = null;
    boss = null;
    wave = 1;
    waveTimer = 600;
    aiSpawnTimer = 300;
    
    // Hide all mobile controls first
    for(let i=1; i<=4; i++) {
        const ctrl = document.getElementById(`controls-p${i}`);
        if(ctrl) ctrl.classList.remove('visible');
    }

    if (isTouchDevice) {
        if (activeMode === 'local') {
            for(let i=1; i<=numPlayers; i++) {
                const ctrl = document.getElementById(`controls-p${i}`);
                if(ctrl) ctrl.classList.add('visible');
            }
        } else if (activeMode === 'p2p-host') {
            const ctrl = document.getElementById(`controls-p1`);
            if(ctrl) ctrl.classList.add('visible');
        } else if (activeMode === 'p2p-join') {
            const ctrl = document.getElementById(`controls-p2`);
            if(ctrl) ctrl.classList.add('visible');
        }
    }

    // UI Adjustments
    if (activeMode === 'p2p-host') {
        controlsHelp[0].innerHTML = 'You (Blue): W A S D | Shoot: Space';
        controlsHelp[1].classList.add('hidden'); // Guest plays P2 remotely
        restartBtn.innerText = 'Play Again (Host)';
    } else if (activeMode === 'p2p-join') {
        controlsHelp[0].innerHTML = 'You (Red): Arrows/WASD | Shoot: Space/Enter';
        controlsHelp[1].classList.add('hidden');
        restartBtn.classList.add('hidden'); // Guest can't restart
    } else {
        controlsHelp.forEach((el, index) => el.classList.toggle('hidden', index >= numPlayers));
    }

    if (activeMode !== 'p2p-join') {
        players = PLAYER_CONFIGS.slice(0, numPlayers + numAI).map((config, index) => ({
            ...config,
            x: config.startX, y: config.startY,
            dx: 0, dy: -1,
            alive: true,
            hp: 3,
            ammo: 5,
            reloadTimer: 0,
            invincibleTimer: 180, // 3 seconds at 60fps
            teleportCooldown: 0,
            slideDx: 0,
            slideDy: 0,
            cooldown: 0,
            isAI: index >= numPlayers,
            aiDirTimer: 0,
            weapon: 'normal', // 'normal', 'missile', 'laser', 'shotgun', 'mine'
            weaponUses: 0
        }));

        bullets = [];
        walls = [];
        planes = [];
        powerUps = [];
        planeSpawnTimer = 300 + Math.random() * 300; // 5-10 seconds for first plane
        keysDown = {};
        guestInput = { up: false, down: false, left: false, right: false, shoot: false };
        createWalls();
        initEnvironment();
    }
    
    // --- ARCADE HUB INTEGRATION ---
    if (window.parent) {
        window.parent.postMessage({ type: 'ARCADE_GAME_START', gameId: 'tank-battle' }, '*');
    }

    if (gameInterval) clearInterval(gameInterval);
    
    if (activeMode === 'local' || activeMode === 'p2p-host') {
        gameInterval = setInterval(gameLoop, 1000 / 60);
    }
    // Note: Guest doesn't run interval, it renders based on incoming data event
}

function gameLoop() {
    update();
    draw();
    
    if (activeMode === 'p2p-host' && conn && conn.open) {
        conn.send({
            type: 'state',
            state: {
                players: players,
                bullets: bullets,
                walls: walls,
                planes: planes,
                powerUps: powerUps,
                barrels: barrels,
                explosions: explosions,
                teleporters: teleporters,
                terrains: terrains,
                isNightMode: isNightMode,
                base: base,
                boss: boss,
                wave: wave,
                isGameOver: isGameOver
            }
        });
    }
}

function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.w &&
           rect1.x + rect1.w > rect2.x &&
           rect1.y < rect2.y + rect2.h &&
           rect1.y + rect1.h > rect2.y;
}

function update() {
    if (isGameOver) return;
    
    if (activeMode !== 'p2p-join') {
        // Game Modes Spawning Logic
        if (gameMode === 'survival') {
            if (waveTimer > 0) waveTimer--;
            else {
                if (aiSpawnTimer > 0) aiSpawnTimer--;
                else {
                    let aiId = players.length + 1;
                    players.push({
                        id: aiId, color: '#f97316', keys: {}, 
                        x: Math.random() > 0.5 ? 50 : canvas.width - 80, 
                        y: Math.random() > 0.5 ? 50 : canvas.height - 80, 
                        dx: 0, dy: -1, alive: true, hp: 3 + Math.floor(wave/3), ammo: 5, reloadTimer: 0, invincibleTimer: 60, teleportCooldown: 0, slideDx: 0, slideDy: 0, cooldown: 0, isAI: true, aiDirTimer: 0, weapon: 'normal', weaponUses: 0
                    });
                    aiSpawnTimer = Math.max(60, 300 - wave * 20);
                }
                if (players.filter(p => p.isAI && p.alive).length > 3 + wave) {
                    wave++;
                    waveTimer = 600; // 10s between waves
                }
            }
        } else if (gameMode === 'baseDefense') {
            if (!base) base = { x: canvas.width/2 - 30, y: canvas.height/2 - 30, w: 60, h: 60, hp: 10, maxHp: 10, alive: true };
            if (aiSpawnTimer > 0) aiSpawnTimer--;
            else {
                let aiId = players.length + 1;
                players.push({
                    id: aiId, color: '#ec4899', keys: {}, 
                    x: Math.random() > 0.5 ? 50 : canvas.width - 80, 
                    y: Math.random() > 0.5 ? 50 : canvas.height - 80, 
                    dx: 0, dy: -1, alive: true, hp: 3, ammo: 5, reloadTimer: 0, invincibleTimer: 60, teleportCooldown: 0, slideDx: 0, slideDy: 0, cooldown: 0, isAI: true, aiDirTimer: 0, weapon: 'normal', weaponUses: 0, targetBase: true
                });
                aiSpawnTimer = 300;
            }
        } else if (gameMode === 'bossFight') {
            if (!boss) {
                boss = {
                    id: 99, color: '#0f172a', keys: {}, 
                    x: canvas.width/2 - 45, y: canvas.height/2 - 45, 
                    dx: 0, dy: -1, alive: true, hp: 30, ammo: 999, reloadTimer: 0, invincibleTimer: 0, teleportCooldown: 0, slideDx: 0, slideDy: 0, cooldown: 0, isAI: true, aiDirTimer: 0, weapon: 'boss', weaponUses: 999, isBoss: true
                };
                players.push(boss);
            }
        }
    }

    players.forEach(p => {
        if (!p.alive) return;
        if (p.cooldown > 0) p.cooldown--;
        if (p.invincibleTimer > 0) p.invincibleTimer--;
        
        if (p.reloadTimer > 0) {
            p.reloadTimer--;
            if (p.reloadTimer <= 0) {
                p.ammo = 5;
            }
        }

        if (p.smallTimer > 0) {
            p.smallTimer--;
            if (p.smallTimer <= 0) p.isSmall = false;
        }

        if (p.invisibleTimer > 0) {
            p.invisibleTimer--;
            if (p.invisibleTimer <= 0) p.isInvisible = false;
        }
        if (p.teleportCooldown > 0) p.teleportCooldown--;

        let oldX = p.x;
        let oldY = p.y;
        
        let moveUp = false, moveDown = false, moveLeft = false, moveRight = false, shoot = false;

        let currentSize = p.isBoss ? TANK_SIZE * 3 : (p.isSmall ? TANK_SIZE / 2 : TANK_SIZE);
        let pCenter = { x: p.x + currentSize/2, y: p.y + currentSize/2 };

        if (p.isAI) {
            let target = null;
            let minDist = Infinity;
            if (p.targetBase && base && base.alive) {
                target = { x: base.x + base.w/2, y: base.y + base.h/2 };
            } else {
                players.forEach(other => {
                    if (!other.isAI && other.alive) {
                        let d = Math.hypot(other.x - p.x, other.y - p.y);
                        if (d < minDist) { minDist = d; target = other; }
                    }
                });
            }

            if (target) {
                if (p.aiDirTimer <= 0) {
                    p.aiDirTimer = p.isBoss ? 10 : (30 + Math.random() * 60);
                    if (Math.random() > 0.5) {
                        if (Math.abs(target.x - p.x) > Math.abs(target.y - p.y)) {
                            if (target.x > p.x) moveRight = true; else moveLeft = true;
                        } else {
                            if (target.y > p.y) moveDown = true; else moveUp = true;
                        }
                    } else {
                        let r = Math.random();
                        if(r < 0.25) moveUp = true; else if(r < 0.5) moveDown = true; else if(r < 0.75) moveLeft = true; else moveRight = true;
                    }
                } else {
                    p.aiDirTimer--;
                    if(p.dx === 1) moveRight = true;
                    if(p.dx === -1) moveLeft = true;
                    if(p.dy === 1) moveDown = true;
                    if(p.dy === -1) moveUp = true;
                }

                let isAlignedX = Math.abs(target.x - p.x) < currentSize;
                let isAlignedY = Math.abs(target.y - p.y) < currentSize;
                if ((isAlignedX && p.dy !== 0 && ((target.y > p.y && p.dy === 1) || (target.y < p.y && p.dy === -1))) ||
                    (isAlignedY && p.dx !== 0 && ((target.x > p.x && p.dx === 1) || (target.x < p.x && p.dx === -1))) || p.isBoss) {
                    shoot = true;
                }
            }
        } else {
            // Player Input mapping
            if (activeMode === 'p2p-host' && p.id === 2) {
                // Read from remote guest input
                moveUp = guestInput.up;
                moveDown = guestInput.down;
                moveLeft = guestInput.left;
                moveRight = guestInput.right;
                shoot = guestInput.shoot;
            } else {
                // Local input
                moveUp = keysDown[p.keys.up];
                moveDown = keysDown[p.keys.down];
                moveLeft = keysDown[p.keys.left];
                moveRight = keysDown[p.keys.right];
                shoot = keysDown[p.keys.shoot];
            }
        }

        if (moveUp) { p.dx = 0; p.dy = -1; }
        else if (moveDown) { p.dx = 0; p.dy = 1; }
        else if (moveLeft) { p.dx = -1; p.dy = 0; }
        else if (moveRight) { p.dx = 1; p.dy = 0; }

        currentSize = p.isBoss ? TANK_SIZE * 3 : (p.isSmall ? TANK_SIZE / 2 : TANK_SIZE);
        pCenter = { x: p.x + currentSize/2, y: p.y + currentSize/2 };

        let onMud = false;
        let onIce = false;
        for (let t of terrains) {
            let dist = Math.hypot(pCenter.x - t.x, pCenter.y - t.y);
            if (dist < t.r) {
                if (t.type === 'mud') onMud = true;
                if (t.type === 'ice') onIce = true;
            }
        }

        let speed = onMud ? 1.5 : TANK_SPEED;
        let isMoving = moveUp || moveDown || moveLeft || moveRight;

        if (onIce) {
            if (isMoving) {
                p.slideDx = p.dx * (speed + 1);
                p.slideDy = p.dy * (speed + 1);
            } else {
                if (!p.slideDx) p.slideDx = 0;
                if (!p.slideDy) p.slideDy = 0;
                p.slideDx *= 0.95;
                p.slideDy *= 0.95;
            }
            p.x += p.slideDx;
            p.y += p.slideDy;
            if (!isMoving && (Math.abs(p.slideDx) > 0.5 || Math.abs(p.slideDy) > 0.5)) {
                if (Math.abs(p.slideDx) > Math.abs(p.slideDy)) p.dx = p.slideDx > 0 ? 1 : -1;
                else p.dy = p.slideDy > 0 ? 1 : -1;
            }
        } else {
            p.slideDx = 0; p.slideDy = 0;
            if (isMoving) {
                p.x += p.dx * speed;
                p.y += p.dy * speed;
            }
        }

        // Teleporter Check
        if (p.teleportCooldown <= 0) {
            for (let tp of teleporters) {
                let dist = Math.hypot(pCenter.x - tp.x, pCenter.y - tp.y);
                if (dist < 30) {
                    let target = teleporters.find(t => t.id === tp.link);
                    if (target) {
                        p.x = target.x - currentSize/2;
                        p.y = target.y - currentSize/2;
                        p.teleportCooldown = 180;
                    }
                    break;
                }
            }
        }

        // Bounds collision
        let hitWall = false;
        if (p.x < 0 || p.x > canvas.width - TANK_SIZE || p.y < 0 || p.y > canvas.height - TANK_SIZE) {
            p.x = oldX; p.y = oldY;
            hitWall = true;
        }

        // Wall collision
        let playerRect = {x: p.x, y: p.y, w: currentSize, h: currentSize};
        for (let w of walls) {
            if (checkCollision(playerRect, w)) {
                p.x = oldX; p.y = oldY;
                hitWall = true;
                break;
            }
        }
        
        if (p.isAI && hitWall) p.aiDirTimer = 0;

        // Mine collision
        for (let j = 0; j < barrels.length; j++) {
            let br = barrels[j];
            if (br.isMine && br.owner !== p.id) {
                if (Math.hypot(pCenter.x - br.x, pCenter.y - br.y) < br.r + currentSize/2) {
                    explosions.push({ x: br.x, y: br.y, radius: 10, maxRadius: 60, life: 30 });
                    barrels.splice(j, 1);
                    if (p.invincibleTimer <= 0) {
                        p.hp -= 2;
                        if (p.hp <= 0) p.alive = false;
                    }
                    break;
                }
            }
        }

        // Shooting
        if (shoot && p.cooldown === 0) {
            let bx = p.x + currentSize/2 - BULLET_SIZE/2 + p.dx * (currentSize/2 + 5);
            let by = p.y + currentSize/2 - BULLET_SIZE/2 + p.dy * (currentSize/2 + 5);

            if (p.weapon === 'boss') {
                for(let k=0; k<8; k++) {
                    let angle = (Math.PI / 4) * k;
                    bullets.push({
                        x: p.x + currentSize/2 - BULLET_SIZE/2, 
                        y: p.y + currentSize/2 - BULLET_SIZE/2, 
                        dx: Math.cos(angle) * BULLET_SPEED, 
                        dy: Math.sin(angle) * BULLET_SPEED,
                        owner: p.id, bounces: 0
                    });
                }
                p.cooldown = FIRE_COOLDOWN * 2;
            } else if (p.weapon === 'mine') {
                barrels.push({ x: bx + BULLET_SIZE/2, y: by + BULLET_SIZE/2, r: 10, isMine: true, owner: p.id });
                p.weaponUses--;
                p.cooldown = FIRE_COOLDOWN;
                if (p.weaponUses <= 0) p.weapon = 'normal';
            } else if (p.weapon === 'laser') {
                bullets.push({
                    x: bx, y: by, dx: p.dx * (BULLET_SPEED * 3), dy: p.dy * (BULLET_SPEED * 3),
                    owner: p.id, bounces: 0, isLaser: true, life: 10
                });
                p.weaponUses--;
                p.cooldown = FIRE_COOLDOWN * 2;
                if (p.weaponUses <= 0) p.weapon = 'normal';
            } else if (p.weapon === 'shotgun') {
                for(let k=-1; k<=1; k++) {
                    let s_dx = p.dx === 0 ? k*0.3 : p.dx;
                    let s_dy = p.dy === 0 ? k*0.3 : p.dy;
                    let len = Math.hypot(s_dx, s_dy);
                    bullets.push({
                        x: bx, y: by, dx: (s_dx/len) * BULLET_SPEED, dy: (s_dy/len) * BULLET_SPEED,
                        owner: p.id, bounces: 0
                    });
                }
                p.weaponUses--;
                p.cooldown = FIRE_COOLDOWN;
                if (p.weaponUses <= 0) p.weapon = 'normal';
            } else if (p.weapon === 'missile') {
                bullets.push({
                    x: bx, y: by, dx: p.dx * (BULLET_SPEED*0.7), dy: p.dy * (BULLET_SPEED*0.7),
                    owner: p.id, bounces: 0, isMissile: true
                });
                p.weaponUses--;
                p.cooldown = FIRE_COOLDOWN;
                if (p.weaponUses <= 0) p.weapon = 'normal';
            } else if (p.ammo > 0) {
                // Normal
                bullets.push({
                    x: bx, y: by, dx: p.dx * BULLET_SPEED, dy: p.dy * BULLET_SPEED, owner: p.id, bounces: 0
                });
                p.ammo--;
                if (p.ammo <= 0) p.reloadTimer = 150;
                else p.cooldown = FIRE_COOLDOWN;
            }
        }
    });

    // Update bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        
        if (b.isMissile) {
            let target = null;
            let minDist = Infinity;
            players.forEach(p => {
                if (!p.alive || p.id === b.owner || p.isInvisible) return;
                let pSize = p.isSmall ? TANK_SIZE/2 : TANK_SIZE;
                let d = Math.hypot((p.x+pSize/2) - b.x, (p.y+pSize/2) - b.y);
                if (d < minDist) { minDist = d; target = p; }
            });
            if (target) {
                let pSize = target.isSmall ? TANK_SIZE/2 : TANK_SIZE;
                let angle = Math.atan2((target.y+pSize/2) - b.y, (target.x+pSize/2) - b.x);
                let speed = Math.hypot(b.dx, b.dy);
                b.dx += Math.cos(angle) * 0.4;
                b.dy += Math.sin(angle) * 0.4;
                let newSpeed = Math.hypot(b.dx, b.dy);
                b.dx = (b.dx / newSpeed) * speed;
                b.dy = (b.dy / newSpeed) * speed;
            }
        }

        b.x += b.dx;
        b.y += b.dy;
        let bRect = {x: b.x, y: b.y, w: BULLET_SIZE, h: BULLET_SIZE};
        
        let destroyed = false;
        
        if (b.isLaser) {
            b.life--;
            if (b.life <= 0) destroyed = true;
        }

        // Wall bounds
        if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) {
            if (b.bounces < 1) {
                if (b.x < 0 || b.x > canvas.width) b.dx *= -1;
                if (b.y < 0 || b.y > canvas.height) b.dy *= -1;
                b.bounces++;
            } else {
                destroyed = true;
            }
        }

        // Block collision
        if (!destroyed) {
            for (let w of walls) {
                if (checkCollision(bRect, w)) {
                    if (b.bounces < 1) {
                        let overlapLeft = Math.abs((b.x + b.w) - w.x);
                        let overlapRight = Math.abs((w.x + w.w) - b.x);
                        let overlapTop = Math.abs((b.y + b.h) - w.y);
                        let overlapBottom = Math.abs((w.y + w.h) - b.y);
                        let min = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
                        if (min === overlapLeft || min === overlapRight) b.dx *= -1;
                        else b.dy *= -1;
                        b.bounces++;
                    } else {
                        destroyed = true;
                    }
                    break;
                }
            }
        }

        // Base collision
        if (!destroyed && base && base.alive) {
            if (checkCollision(bRect, base)) {
                base.hp--;
                if (base.hp <= 0) base.alive = false;
                destroyed = true;
            }
        }

        // Barrel collision
        if (!destroyed) {
            for (let j = 0; j < barrels.length; j++) {
                let br = barrels[j];
                if (Math.hypot(b.x - br.x, b.y - br.y) < br.r + BULLET_SIZE) {
                    explosions.push({ x: br.x, y: br.y, radius: 10, maxRadius: 100, life: 30 });
                    barrels.splice(j, 1);
                    destroyed = true;
                    
                    // Damage nearby players
                    players.forEach(p2 => {
                        if (!p2.alive) return;
                        let s2 = p2.isSmall ? TANK_SIZE/2 : TANK_SIZE;
                        if (Math.hypot((p2.x+s2/2) - br.x, (p2.y+s2/2) - br.y) < 100) {
                            if (p2.invincibleTimer <= 0) {
                                p2.hp--;
                                if (p2.hp <= 0) p2.alive = false;
                            }
                        }
                    });
                    break;
                }
            }
        }

        // Tank collision
        if (!destroyed) {
            for (let p of players) {
                if (!p.alive) continue;
                if (b.owner === p.id && b.bounces === 0) continue;
                let pSize = p.isBoss ? TANK_SIZE*3 : (p.isSmall ? TANK_SIZE / 2 : TANK_SIZE);
                let pRect = {x: p.x, y: p.y, w: pSize, h: pSize};
                if (checkCollision(bRect, pRect) && p.invincibleTimer <= 0) {
                    p.hp--;
                    if (p.hp <= 0) p.alive = false;
                    destroyed = true;
                    break;
                }
            }
        }

        if (destroyed) bullets.splice(i, 1);
    }

    // Plane logic
    if (activeMode !== 'p2p-join') {
        if (planeSpawnTimer > 0) {
            planeSpawnTimer--;
        } else {
            // Spawn a plane
            let py = 50 + Math.random() * (canvas.height - 100);
            planes.push({ x: -50, y: py, speed: 4, hasDropped: false, dropX: 200 + Math.random() * (canvas.width - 400) });
            planeSpawnTimer = 600 + Math.random() * 600; // Next plane in 10-20 seconds
        }

        for (let i = planes.length - 1; i >= 0; i--) {
            let pl = planes[i];
            pl.x += pl.speed;
            
            if (!pl.hasDropped && pl.x >= pl.dropX) {
                pl.hasDropped = true;
                const types = ['hp', 'small', 'invisible', 'shield', 'missile', 'laser', 'shotgun', 'mine'];
                const pType = types[Math.floor(Math.random() * types.length)];
                powerUps.push({ x: pl.x, y: pl.y, type: pType, width: 20, height: 20 });
            }

            if (pl.x > canvas.width + 50) {
                planes.splice(i, 1);
            }
        }

        // PowerUps Logic
        for (let i = powerUps.length - 1; i >= 0; i--) {
            let pu = powerUps[i];
            let puRect = {x: pu.x, y: pu.y, w: pu.width, h: pu.height};
            let collected = false;

            for (let p of players) {
                if (!p.alive) continue;
                let pSize = p.isSmall ? TANK_SIZE / 2 : TANK_SIZE;
                let pRect = {x: p.x, y: p.y, w: pSize, h: pSize};
                
                if (checkCollision(puRect, pRect)) {
                    collected = true;
                    if (pu.type === 'hp') { p.hp = 5; }
                    else if (pu.type === 'small') { p.isSmall = true; p.smallTimer = 600; }
                    else if (pu.type === 'invisible') { p.isInvisible = true; p.invisibleTimer = 600; }
                    else if (pu.type === 'shield') { p.invincibleTimer = 600; }
                    else if (pu.type === 'missile') { p.weapon = 'missile'; p.weaponUses = 3; }
                    else if (pu.type === 'laser') { p.weapon = 'laser'; p.weaponUses = 2; }
                    else if (pu.type === 'shotgun') { p.weapon = 'shotgun'; p.weaponUses = 5; }
                    else if (pu.type === 'mine') { p.weapon = 'mine'; p.weaponUses = 3; }
                    break;
                }
            }

            if (collected) powerUps.splice(i, 1);
        }
    }

    // Update Explosions
    for (let i = explosions.length - 1; i >= 0; i--) {
        let ex = explosions[i];
        ex.radius += (ex.maxRadius - ex.radius) * 0.2;
        ex.life--;
        if (ex.life <= 0) explosions.splice(i, 1);
    }

    // Weather Logic (Host only)
    if (activeMode !== 'p2p-join' && nightModeEnabled) {
        if (nightTimer > 0) {
            nightTimer--;
            if (nightTimer <= 0) {
                isNightMode = !isNightMode;
                nightTimer = isNightMode ? 1800 : 1800 + Math.random()*1200; // Night lasts 30s
            }
        }
    } else if (!nightModeEnabled) {
        isNightMode = false;
    }

    checkWinCondition();
}

function checkWinCondition() {
    if (gameMode === 'baseDefense') {
        if (base && !base.alive) {
            endGame("HQ Destroyed! You Lose.", "#ef4444");
            return;
        }
    }
    
    if (gameMode === 'survival') {
        const humanPlayers = players.filter(p => !p.isAI && p.alive);
        if (humanPlayers.length === 0) {
            endGame(`Survived to Wave ${wave}`, "#ef4444");
        }
        return;
    }
    
    if (gameMode === 'bossFight') {
        const humanPlayers = players.filter(p => !p.isAI && p.alive);
        if (boss && !boss.alive) {
            endGame("Boss Defeated! You Win!", "#22c55e");
            return;
        } else if (humanPlayers.length === 0) {
            endGame("Boss Wins! You Lose.", "#ef4444");
            return;
        }
        return;
    }

    // Classic Deathmatch
    const alivePlayers = players.filter(p => p.alive && !p.isAI);
    if (alivePlayers.length <= 1 && players.filter(p => p.alive).length <= 1) {
        if (alivePlayers.length === 1) {
            let msg = `Player ${alivePlayers[0].id} Wins!`;
            if (activeMode === 'p2p-host') {
                if (alivePlayers[0].id === 1) msg = "You Win!";
                else msg = "You Lose! Guest Wins!";
            }
            endGame(msg, alivePlayers[0].color);
        } else {
            endGame("Draw! Everyone is destroyed.", "#fff");
        }
    }
}

function endGame(msg, color) {
    isGameOver = true;
    if (gameInterval) clearInterval(gameInterval);
    statusText.innerText = msg;
    statusText.style.color = color;
    
    if (activeMode !== 'p2p-join') {
        restartBtn.classList.remove('hidden');
    }
    menuBtn.classList.remove('hidden');
    
    // Broadcast end state to guest
    if (activeMode === 'p2p-host' && conn && conn.open) {
        let guestMsg = msg;
        if (msg === "You Win!") guestMsg = "You Lose! Host Wins!";
        else if (msg === "You Lose! Guest Wins!") guestMsg = "You Win!";
        
        conn.send({
            type: 'state',
            state: {
                players: players,
                bullets: bullets,
                walls: walls,
                isGameOver: true,
                winnerMsg: guestMsg,
                winnerColor: color
            }
        });
    }

    // --- ARCADE HUB INTEGRATION ---
    if (window.parent) {
        window.parent.postMessage({ type: 'ARCADE_GAME_OVER', winner: msg, gameId: 'tank-battle' }, '*');
    }
}

// Separate function for guest to show game over screen
function endGameClient(msg, color) {
    statusText.innerText = msg;
    statusText.style.color = color;
    menuBtn.classList.remove('hidden');
}

function shadeColor(color, percent) {
    let R = parseInt(color.substring(1,3),16);
    let G = parseInt(color.substring(3,5),16);
    let B = parseInt(color.substring(5,7),16);
    R = parseInt(R * (100 + percent) / 100);
    G = parseInt(G * (100 + percent) / 100);
    B = parseInt(B * (100 + percent) / 100);
    R = Math.max(0, Math.min(255, R));
    G = Math.max(0, Math.min(255, G));
    B = Math.max(0, Math.min(255, B));
    let RR = ((R.toString(16).length==1)?"0"+R.toString(16):R.toString(16));
    let GG = ((G.toString(16).length==1)?"0"+G.toString(16):G.toString(16));
    let BB = ((B.toString(16).length==1)?"0"+B.toString(16):B.toString(16));
    return "#"+RR+GG+BB;
}

function drawRealisticTank(ctx, p, size) {
    let width = size;
    let length = size * 1.4;

    // 1. Tracks (left and right)
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(-width/2 - 2, -length/2, width*0.3, length);
    ctx.fillRect(width/2 - width*0.3 + 2, -length/2, width*0.3, length);

    // Track details (treads)
    ctx.fillStyle = '#333';
    for (let i = -length/2 + 2; i < length/2; i += 4) {
        ctx.fillRect(-width/2 - 2, i, width*0.3, 2);
        ctx.fillRect(width/2 - width*0.3 + 2, i, width*0.3, 2);
    }

    // 2. Main Body (Hull)
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.moveTo(-width/2 + 2, -length/2 + 4);
    ctx.lineTo(width/2 - 2, -length/2 + 4);
    ctx.lineTo(width/2 - 2, length/2 - 2);
    ctx.lineTo(-width/2 + 2, length/2 - 2);
    ctx.fill();
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Front sloped armor
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; 
    ctx.fillRect(-width/2 + 3, -length/2 + 5, width - 6, length*0.2);
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; 
    ctx.fillRect(-width/2 + 3, -length/2 + 5 + length*0.2, width - 6, 2);

    // Engine grille at the back
    ctx.fillStyle = '#111';
    ctx.fillRect(-width/4, length/2 - 10, width/2, 8);
    ctx.fillStyle = '#444';
    for(let i=0; i<width/2; i+=3) {
        ctx.fillRect(-width/4 + i, length/2 - 10, 1, 8);
    }

    // 3. Main Gun (Barrel)
    ctx.fillStyle = '#3a3a3a'; 
    ctx.fillRect(-width*0.06, -length*0.75, width*0.12, length*0.6); // Barrel
    ctx.fillStyle = '#222';
    ctx.fillRect(-width*0.08, -length*0.5, width*0.16, length*0.15); // Fume extractor
    ctx.fillRect(-width*0.08, -length*0.75, width*0.16, length*0.06); // Muzzle brake
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(-width*0.06, -length*0.75, width*0.06, length*0.6);

    // 4. Turret
    let turretColor = shadeColor(p.color, -15);
    ctx.fillStyle = turretColor;
    ctx.beginPath();
    ctx.moveTo(-width*0.4, -length*0.1); 
    ctx.lineTo(-width*0.15, -length*0.3); 
    ctx.lineTo(width*0.15, -length*0.3); 
    ctx.lineTo(width*0.4, -length*0.1); 
    ctx.lineTo(width*0.3, length*0.25); 
    ctx.lineTo(-width*0.3, length*0.25); 
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Turret details
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.moveTo(-width*0.15, -length*0.3);
    ctx.lineTo(width*0.15, -length*0.3);
    ctx.lineTo(width*0.3, -length*0.1);
    ctx.lineTo(-width*0.3, -length*0.1);
    ctx.closePath();
    ctx.fill();

    // Hatches
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(-width*0.15, length*0.05, width*0.1, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(width*0.15, length*0.05, width*0.08, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#444';
    ctx.beginPath();
    ctx.arc(-width*0.15, length*0.05, width*0.06, 0, Math.PI*2);
    ctx.fill();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Grid Floor
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for(let i=0; i<canvas.width; i+=100) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke(); }
    for(let j=0; j<canvas.height; j+=100) { ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(canvas.width, j); ctx.stroke(); }

    // Draw Terrains
    terrains.forEach(t => {
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.r, 0, Math.PI*2);
        ctx.fillStyle = t.type === 'mud' ? 'rgba(101, 67, 33, 0.4)' : 'rgba(173, 216, 230, 0.4)';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = t.type === 'mud' ? 'rgba(70, 40, 20, 0.5)' : 'rgba(255, 255, 255, 0.5)';
        ctx.stroke();
    });

    // Draw Base
    if (base && base.alive) {
        ctx.fillStyle = '#0f766e';
        ctx.fillRect(base.x, base.y, base.w, base.h);
        ctx.strokeStyle = '#042f2e';
        ctx.lineWidth = 4;
        ctx.strokeRect(base.x, base.y, base.w, base.h);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('HQ', base.x + base.w/2, base.y + base.h/2);
        
        // Base Health
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(base.x, base.y - 12, base.w, 6);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(base.x, base.y - 12, (Math.max(0, base.hp)/base.maxHp)*base.w, 6);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(base.x, base.y - 12, base.w, 6);
    }

    // Draw walls
    ctx.fillStyle = '#6d4c41';
    walls.forEach(w => {
        ctx.fillRect(w.x, w.y, w.w, w.h);
        ctx.strokeStyle = '#3e2723';
        ctx.lineWidth = 2;
        ctx.strokeRect(w.x, w.y, w.w, w.h);
    });

    // Draw Teleporters
    teleporters.forEach(tp => {
        ctx.beginPath();
        ctx.arc(tp.x, tp.y, 25, 0, Math.PI*2);
        ctx.fillStyle = `rgba(168, 85, 247, ${0.3 + Math.sin(Date.now()/200)*0.2})`;
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#c084fc';
        ctx.setLineDash([10, 10]);
        ctx.stroke();
        ctx.setLineDash([]);
    });

    // Draw Barrels
    barrels.forEach(br => {
        if (br.isMine) {
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.arc(br.x, br.y, 8, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(br.x, br.y, 3, 0, Math.PI*2);
            ctx.fill();
        } else {
            ctx.fillStyle = '#b91c1c'; // Red
            ctx.beginPath();
            ctx.arc(br.x, br.y, br.r, 0, Math.PI*2);
            ctx.fill();
            ctx.strokeStyle = '#7f1d1d';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = '#dc2626';
            ctx.beginPath();
            ctx.arc(br.x, br.y, br.r - 3, 0, Math.PI*2);
            ctx.fill();
        }
    });

    // Draw bullets
    bullets.forEach(b => {
        if (b.isLaser) {
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(b.x - 2, b.y - 2, BULLET_SIZE + 4, BULLET_SIZE + 4);
        } else if (b.isMissile) {
            ctx.fillStyle = '#a855f7';
            ctx.fillRect(b.x, b.y, BULLET_SIZE + 2, BULLET_SIZE + 2);
        } else {
            ctx.fillStyle = '#ffeb3b';
            ctx.fillRect(b.x, b.y, BULLET_SIZE, BULLET_SIZE);
        }
    });

    // Draw power-ups
    powerUps.forEach(pu => {
        ctx.fillStyle = '#fff';
        ctx.fillRect(pu.x, pu.y, pu.width, pu.height);
        ctx.fillStyle = '#000';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        let icon = '?';
        if (pu.type === 'hp') icon = '❤️';
        if (pu.type === 'small') icon = '🔍';
        if (pu.type === 'invisible') icon = '👻';
        if (pu.type === 'shield') icon = '🛡️';
        if (pu.type === 'missile') icon = '🚀';
        if (pu.type === 'laser') icon = '⚡';
        if (pu.type === 'shotgun') icon = '🔫';
        if (pu.type === 'mine') icon = '💣';
        ctx.fillText(icon, pu.x + pu.width/2, pu.y + pu.height/2 + 2);
    });

    // Draw tanks
    players.forEach(p => {
        if (!p.alive) return;
        
        ctx.save();
        if (p.isInvisible) ctx.globalAlpha = 0.2;

        let currentSize = p.isBoss ? TANK_SIZE * 3 : (p.isSmall ? TANK_SIZE / 2 : TANK_SIZE);
        ctx.translate(p.x + currentSize / 2, p.y + currentSize / 2);
        
        if (p.isSmall) ctx.scale(0.5, 0.5);
        if (p.isBoss) ctx.scale(3, 3);
        
        let angle = 0;
        if (p.dx === 1) angle = Math.PI / 2;
        else if (p.dx === -1) angle = -Math.PI / 2;
        else if (p.dy === 1) angle = Math.PI;
        else if (p.dy === -1) angle = 0;
        
        ctx.rotate(angle);
        
        drawRealisticTank(ctx, p, TANK_SIZE);
        
        ctx.restore();

        // Draw Invincibility Shield
        if (p.invincibleTimer > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(p.x + currentSize/2, p.y + currentSize/2, TANK_SIZE / 1.5, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(56, 189, 248, ${Math.abs(Math.sin(p.invincibleTimer / 10)) * 0.8 + 0.2})`;
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.fillStyle = `rgba(56, 189, 248, 0.2)`;
            ctx.fill();
            ctx.restore();
        }

        // Draw Health Bar
        let barYOffset = p.isSmall ? 0 : 10;
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(p.x, p.y - barYOffset, currentSize, 4);
        ctx.fillStyle = '#22c55e';
        let maxHp = 5;
        ctx.fillRect(p.x, p.y - barYOffset, (Math.min(p.hp, maxHp) / maxHp) * currentSize, 4);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(p.x, p.y - barYOffset, currentSize, 4);

        // Draw Ammo or Reloading Bar
        if (p.reloadTimer > 0) {
            ctx.fillStyle = '#4b5563';
            ctx.fillRect(p.x, p.y - barYOffset - 6, currentSize, 4);
            ctx.fillStyle = '#facc15';
            let progress = 1 - (p.reloadTimer / 150);
            ctx.fillRect(p.x, p.y - barYOffset - 6, progress * currentSize, 4);
        } else {
            ctx.fillStyle = '#facc15';
            let dotSpace = p.isSmall ? 3 : 6;
            for (let i=0; i<p.ammo; i++) {
                ctx.fillRect(p.x + i * dotSpace + 1, p.y - barYOffset - 6, p.isSmall ? 2 : 4, p.isSmall ? 2 : 4);
            }
        }
    });

    // Draw planes
    planes.forEach(pl => {
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.moveTo(pl.x, pl.y);
        ctx.lineTo(pl.x - 20, pl.y - 10);
        ctx.lineTo(pl.x - 20, pl.y + 10);
        ctx.fill();
        ctx.fillStyle = '#334155';
        ctx.fillRect(pl.x - 30, pl.y - 2, 40, 4);
    });

    // Draw Explosions
    explosions.forEach(ex => {
        ctx.beginPath();
        ctx.arc(ex.x, ex.y, ex.radius, 0, Math.PI*2);
        ctx.fillStyle = `rgba(255, 100, 0, ${ex.life / 30})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ex.x, ex.y, ex.radius * 0.7, 0, Math.PI*2);
        ctx.fillStyle = `rgba(255, 200, 0, ${ex.life / 30})`;
        ctx.fill();
    });

    // Night Mode Mask
    if (isNightMode) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, canvas.width, canvas.height); // Outer mask
        
        let myTank = players.find(p => p.id === (activeMode === 'p2p-join' ? 2 : 1));
        if (myTank && myTank.alive) {
            let currentSize = myTank.isSmall ? TANK_SIZE / 2 : TANK_SIZE;
            let cx = myTank.x + currentSize/2;
            let cy = myTank.y + currentSize/2;
            
            // Carve out a circle around the player
            ctx.moveTo(cx + 150, cy);
            ctx.arc(cx, cy, 150, 0, Math.PI*2, true); 

            // Carve out a flashlight cone
            let angle = 0;
            if (myTank.dx === 1) angle = 0;
            else if (myTank.dx === -1) angle = Math.PI;
            else if (myTank.dy === 1) angle = Math.PI/2;
            else if (myTank.dy === -1) angle = -Math.PI/2;
            
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, 400, angle + 0.5, angle - 0.5, true);
            ctx.lineTo(cx, cy);
        }

        ctx.fillStyle = 'rgba(0, 5, 15, 0.95)';
        ctx.fill();
        ctx.restore();
    }
}
