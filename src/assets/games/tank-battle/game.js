const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const menu = document.getElementById('menu');
const gameContainer = document.getElementById('game-container');
const statusText = document.getElementById('status-text');
const restartBtn = document.getElementById('restart-btn');
const menuBtn = document.getElementById('menu-btn');
const playerBtns = document.querySelectorAll('.player-btn');
const controlsHelp = document.querySelectorAll('#controls-help div');

let gameInterval;
let isGameOver = false;
let numPlayers = 2;
let numAI = 0;

const TANK_SIZE = 30;
const BULLET_SIZE = 6;
const BULLET_SPEED = 8;
const TANK_SPEED = 3;
const FIRE_COOLDOWN = 30; // frames

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

document.addEventListener('keydown', e => { keysDown[e.key.toLowerCase()] = true; });
document.addEventListener('keyup', e => { keysDown[e.key.toLowerCase()] = false; });

playerBtns.forEach(btn => btn.addEventListener('click', e => {
    numPlayers = parseInt(e.target.dataset.players);
    numAI = parseInt(e.target.dataset.ai || '0');
    startGame();
}));

restartBtn.addEventListener('click', startGame);
menuBtn.addEventListener('click', () => {
    gameContainer.classList.add('hidden');
    menu.classList.remove('hidden');
    statusText.innerText = 'Select number of players';
    statusText.style.color = '#eee';
    restartBtn.classList.add('hidden');
    menuBtn.classList.add('hidden');
});

function createWalls() {
    walls = [];
    
    // Create a structured maze/city layout for tactical gameplay
    
    // Top Row
    walls.push({x: 80, y: 80, w: 160, h: 120});
    walls.push({x: 320, y: 80, w: 160, h: 120});
    walls.push({x: 560, y: 80, w: 160, h: 120});

    // Middle Row (with an open center arena around a central cover)
    walls.push({x: 80, y: 280, w: 160, h: 40});
    walls.push({x: 370, y: 270, w: 60, h: 60}); // Center cover
    walls.push({x: 560, y: 280, w: 160, h: 40});

    // Bottom Row
    walls.push({x: 80, y: 400, w: 160, h: 120});
    walls.push({x: 320, y: 400, w: 160, h: 120});
    walls.push({x: 560, y: 400, w: 160, h: 120});
}

function startGame() {
    isGameOver = false;
    menu.classList.add('hidden');
    gameContainer.classList.remove('hidden');
    restartBtn.classList.add('hidden');
    menuBtn.classList.add('hidden');
    statusText.innerText = 'BATTLE!';
    statusText.style.color = '#eee';

    controlsHelp.forEach((el, index) => el.classList.toggle('hidden', index >= numPlayers));

    players = PLAYER_CONFIGS.slice(0, numPlayers + numAI).map((config, index) => ({
        ...config,
        x: config.startX, y: config.startY,
        dx: 0, dy: -1, // Facing up initially
        alive: true,
        cooldown: 0,
        isAI: index >= numPlayers,
        aiDirTimer: 0
    }));

    bullets = [];
    keysDown = {};
    createWalls();
    
    // --- ARCADE HUB INTEGRATION ---
    if (window.parent) {
        window.parent.postMessage({ type: 'ARCADE_GAME_START', gameId: 'tank-battle' }, '*');
    }

    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(gameLoop, 1000 / 60); // 60 FPS
}

function gameLoop() {
    update();
    draw();
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
            moveUp = keysDown[p.keys.up];
            moveDown = keysDown[p.keys.down];
            moveLeft = keysDown[p.keys.left];
            moveRight = keysDown[p.keys.right];
            shoot = keysDown[p.keys.shoot];
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
        
        if (p.isAI && hitWall) p.aiDirTimer = 0; // change direction if stuck

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
                        // Determine bounce direction
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
                if (b.owner === p.id && b.bounces === 0) continue; // Don't shoot self immediately
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
            endGame(`Player ${alivePlayers[0].id} Wins!`, alivePlayers[0].color);
        } else {
            endGame("Draw! Everyone is destroyed.", "#fff");
        }
    }
}

function endGame(msg, color) {
    isGameOver = true;
    clearInterval(gameInterval);
    statusText.innerText = msg;
    statusText.style.color = color;
    restartBtn.classList.remove('hidden');
    menuBtn.classList.remove('hidden');
    
    // --- ARCADE HUB INTEGRATION ---
    if (window.parent) {
        window.parent.postMessage({ type: 'ARCADE_GAME_OVER', winner: msg, gameId: 'tank-battle' }, '*');
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw walls
    ctx.fillStyle = '#6d4c41'; // dirt color for walls
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
        
        // Calculate rotation based on dx and dy
        let angle = 0; // default is facing up
        if (p.dx === 1) angle = Math.PI / 2;
        else if (p.dx === -1) angle = -Math.PI / 2;
        else if (p.dy === 1) angle = Math.PI;
        else if (p.dy === -1) angle = 0;
        
        ctx.rotate(angle);
        
        // Draw tracks (dark grey)
        ctx.fillStyle = '#111';
        ctx.fillRect(-TANK_SIZE/2, -TANK_SIZE/2 - 2, 8, TANK_SIZE + 4);
        ctx.fillRect(TANK_SIZE/2 - 8, -TANK_SIZE/2 - 2, 8, TANK_SIZE + 4);

        // Track treads
        ctx.fillStyle = '#333';
        for (let i = -TANK_SIZE/2; i <= TANK_SIZE/2; i += 6) {
            ctx.fillRect(-TANK_SIZE/2, i, 8, 2);
            ctx.fillRect(TANK_SIZE/2 - 8, i, 8, 2);
        }

        // Draw hull (tank body)
        ctx.fillStyle = p.color;
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 2;
        ctx.fillRect(-TANK_SIZE/2 + 6, -TANK_SIZE/2 + 2, TANK_SIZE - 12, TANK_SIZE - 4);
        ctx.strokeRect(-TANK_SIZE/2 + 6, -TANK_SIZE/2 + 2, TANK_SIZE - 12, TANK_SIZE - 4);
        
        // Draw gun barrel
        ctx.fillStyle = '#444';
        ctx.fillRect(-3, -TANK_SIZE/2 - 8, 6, TANK_SIZE/2 + 4);
        ctx.strokeRect(-3, -TANK_SIZE/2 - 8, 6, TANK_SIZE/2 + 4);

        // Draw turret base (circle)
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#555';
        ctx.fill();
        ctx.stroke();
        
        // Inner color for turret
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        
        ctx.restore();
    });
}
