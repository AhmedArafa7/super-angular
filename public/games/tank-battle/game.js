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
let keysDown = {};

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
        conn.send({ type: 'start' });
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
                startGame();
            } else if (data.type === 'state') {
                players = data.state.players;
                bullets = data.state.bullets;
                walls = data.state.walls;
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
    walls.push({x: 370, y: 270, w: 60, h: 60});
    walls.push({x: 560, y: 280, w: 160, h: 40});
    walls.push({x: 80, y: 400, w: 160, h: 120});
    walls.push({x: 320, y: 400, w: 160, h: 120});
    walls.push({x: 560, y: 400, w: 160, h: 120});
}

function startGame() {
    isGameOver = false;
    modeSelection.classList.add('hidden');
    localMenu.classList.add('hidden');
    p2pMenu.classList.add('hidden');
    gameContainer.classList.remove('hidden');
    restartBtn.classList.add('hidden');
    menuBtn.classList.add('hidden');
    statusText.innerText = 'BATTLE!';
    statusText.style.color = '#eee';
    
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
            cooldown: 0,
            isAI: index >= numPlayers,
            aiDirTimer: 0
        }));

        bullets = [];
        keysDown = {};
        guestInput = { up: false, down: false, left: false, right: false, shoot: false };
        createWalls();
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

    players.forEach(p => {
        if (!p.alive) return;
        if (p.cooldown > 0) p.cooldown--;

        let oldX = p.x;
        let oldY = p.y;
        
        let moveUp = false, moveDown = false, moveLeft = false, moveRight = false, shoot = false;

        if (p.isAI) {
            let target = null;
            let minDist = Infinity;
            players.forEach(other => {
                if (!other.isAI && other.alive) {
                    let d = Math.hypot(other.x - p.x, other.y - p.y);
                    if (d < minDist) { minDist = d; target = other; }
                }
            });

            if (target) {
                if (p.aiDirTimer <= 0) {
                    p.aiDirTimer = 30 + Math.random() * 60;
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

                let isAlignedX = Math.abs(target.x - p.x) < TANK_SIZE;
                let isAlignedY = Math.abs(target.y - p.y) < TANK_SIZE;
                if ((isAlignedX && p.dy !== 0 && ((target.y > p.y && p.dy === 1) || (target.y < p.y && p.dy === -1))) ||
                    (isAlignedY && p.dx !== 0 && ((target.x > p.x && p.dx === 1) || (target.x < p.x && p.dx === -1)))) {
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

        if (moveUp) { p.y -= TANK_SPEED; p.dx = 0; p.dy = -1; }
        else if (moveDown) { p.y += TANK_SPEED; p.dx = 0; p.dy = 1; }
        else if (moveLeft) { p.x -= TANK_SPEED; p.dx = -1; p.dy = 0; }
        else if (moveRight) { p.x += TANK_SPEED; p.dx = 1; p.dy = 0; }

        // Bounds collision
        let hitWall = false;
        if (p.x < 0 || p.x > canvas.width - TANK_SIZE || p.y < 0 || p.y > canvas.height - TANK_SIZE) {
            p.x = oldX; p.y = oldY;
            hitWall = true;
        }

        // Wall collision
        let playerRect = {x: p.x, y: p.y, w: TANK_SIZE, h: TANK_SIZE};
        for (let w of walls) {
            if (checkCollision(playerRect, w)) {
                p.x = oldX; p.y = oldY;
                hitWall = true;
                break;
            }
        }
        
        if (p.isAI && hitWall) p.aiDirTimer = 0;

        // Shooting
        if (shoot && p.cooldown === 0) {
            bullets.push({
                x: p.x + TANK_SIZE/2 - BULLET_SIZE/2 + p.dx * (TANK_SIZE/2 + 5),
                y: p.y + TANK_SIZE/2 - BULLET_SIZE/2 + p.dy * (TANK_SIZE/2 + 5),
                dx: p.dx * BULLET_SPEED,
                dy: p.dy * BULLET_SPEED,
                owner: p.id,
                bounces: 0
            });
            p.cooldown = FIRE_COOLDOWN;
        }
    });

    // Update bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        b.x += b.dx;
        b.y += b.dy;
        let bRect = {x: b.x, y: b.y, w: BULLET_SIZE, h: BULLET_SIZE};
        
        let destroyed = false;

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

        // Tank collision
        if (!destroyed) {
            for (let p of players) {
                if (!p.alive) continue;
                if (b.owner === p.id && b.bounces === 0) continue;
                let pRect = {x: p.x, y: p.y, w: TANK_SIZE, h: TANK_SIZE};
                if (checkCollision(bRect, pRect)) {
                    p.alive = false;
                    destroyed = true;
                    break;
                }
            }
        }

        if (destroyed) bullets.splice(i, 1);
    }

    checkWinCondition();
}

function checkWinCondition() {
    const alivePlayers = players.filter(p => p.alive);
    if (alivePlayers.length <= 1) {
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

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw walls
    ctx.fillStyle = '#6d4c41';
    walls.forEach(w => {
        ctx.fillRect(w.x, w.y, w.w, w.h);
        ctx.strokeStyle = '#3e2723';
        ctx.lineWidth = 2;
        ctx.strokeRect(w.x, w.y, w.w, w.h);
    });

    // Draw bullets
    ctx.fillStyle = '#ffeb3b';
    bullets.forEach(b => {
        ctx.fillRect(b.x, b.y, BULLET_SIZE, BULLET_SIZE);
    });

    // Draw tanks
    players.forEach(p => {
        if (!p.alive) return;
        
        ctx.save();
        ctx.translate(p.x + TANK_SIZE / 2, p.y + TANK_SIZE / 2);
        
        let angle = 0;
        if (p.dx === 1) angle = Math.PI / 2;
        else if (p.dx === -1) angle = -Math.PI / 2;
        else if (p.dy === 1) angle = Math.PI;
        else if (p.dy === -1) angle = 0;
        
        ctx.rotate(angle);
        
        ctx.fillStyle = '#111';
        ctx.fillRect(-TANK_SIZE/2, -TANK_SIZE/2 - 2, 8, TANK_SIZE + 4);
        ctx.fillRect(TANK_SIZE/2 - 8, -TANK_SIZE/2 - 2, 8, TANK_SIZE + 4);

        ctx.fillStyle = '#333';
        for (let i = -TANK_SIZE/2; i <= TANK_SIZE/2; i += 6) {
            ctx.fillRect(-TANK_SIZE/2, i, 8, 2);
            ctx.fillRect(TANK_SIZE/2 - 8, i, 8, 2);
        }

        ctx.fillStyle = p.color;
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 2;
        ctx.fillRect(-TANK_SIZE/2 + 6, -TANK_SIZE/2 + 2, TANK_SIZE - 12, TANK_SIZE - 4);
        ctx.strokeRect(-TANK_SIZE/2 + 6, -TANK_SIZE/2 + 2, TANK_SIZE - 12, TANK_SIZE - 4);
        
        ctx.fillStyle = '#444';
        ctx.fillRect(-3, -TANK_SIZE/2 - 8, 6, TANK_SIZE/2 + 4);
        ctx.strokeRect(-3, -TANK_SIZE/2 - 8, 6, TANK_SIZE/2 + 4);

        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#555';
        ctx.fill();
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        
        ctx.restore();
    });
}
