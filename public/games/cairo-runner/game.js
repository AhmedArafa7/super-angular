// DOM Elements
const modeScreen = document.getElementById('mode-selection-screen');
const mainMenu = document.getElementById('main-menu');
const p2pMenu = document.getElementById('p2p-menu');
const gameScreen = document.getElementById('game-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const modeBtns = document.querySelectorAll('.mode-btn');

const createRoomBtn = document.getElementById('create-room-btn');
const roomIdDisplay = document.getElementById('roomIdDisplay');
const roomInfo = document.getElementById('room-info');
const joinRoomIdInput = document.getElementById('join-room-id');
const joinRoomBtn = document.getElementById('join-room-btn');
const joinError = document.getElementById('join-error');
const backToMenuBtn = document.getElementById('back-to-menu-btn');

const myScoreEl = document.getElementById('my-score');
const enemyHud = document.getElementById('enemy-hud');
const enemyScoreEl = document.getElementById('enemy-score');
const enemyStatusEl = document.getElementById('enemy-status');
const resultTitle = document.getElementById('result-title');
const resultDesc = document.getElementById('result-desc');
const finalScoreDisplay = document.getElementById('final-score-display');
const rematchBtn = document.getElementById('rematch-btn');
const menuBtn = document.getElementById('menu-btn');

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game State
let activeMode = 'local';
let isPlaying = false;
let animationId;
let frames = 0;

// Networking
let peer = null;
let conn = null;
let enemyAlive = true;
let enemyScore = 0;
let amIAlive = true;
let syncInterval;

// Menu Logic
modeBtns.forEach(btn => btn.addEventListener('click', e => {
    activeMode = e.currentTarget.dataset.mode;
    if (activeMode === 'local') {
        startGame();
    } else {
        mainMenu.classList.add('hidden');
        p2pMenu.classList.remove('hidden');
    }
}));

backToMenuBtn.addEventListener('click', () => {
    p2pMenu.classList.add('hidden');
    mainMenu.classList.remove('hidden');
    if(peer) { peer.destroy(); peer = null; }
});

menuBtn.addEventListener('click', () => {
    location.reload();
});

rematchBtn.addEventListener('click', () => {
    if(activeMode === 'local') {
        startGame();
    } else {
        // In P2P, simply tell the other we want a rematch and wait, or just start.
        // For simplicity, we just reload for P2P rematch or require both to click. Let's just reload.
        location.reload();
    }
});

// P2P Setup
createRoomBtn.addEventListener('click', () => {
    createRoomBtn.classList.add('hidden');
    roomInfo.classList.remove('hidden');
    peer = new Peer();
    peer.on('open', id => roomIdDisplay.innerText = id);
    peer.on('connection', connection => {
        conn = connection;
        setupConnection();
    });
});

joinRoomBtn.addEventListener('click', () => {
    const id = joinRoomIdInput.value.trim();
    if(!id) return;
    joinRoomBtn.innerText = 'جاري الاتصال...';
    peer = new Peer();
    peer.on('open', () => {
        conn = peer.connect(id);
        conn.on('open', setupConnection);
        conn.on('error', () => {
            joinError.classList.remove('hidden');
            joinRoomBtn.innerText = 'انضمام للغرفة';
        });
    });
});

function setupConnection() {
    enemyHud.classList.remove('hidden');
    
    conn.on('data', data => {
        if(data.type === 'sync') {
            enemyScore = data.score;
            enemyScoreEl.innerText = `النقاط: ${Math.floor(enemyScore)}`;
            if(!data.alive && enemyAlive) {
                enemyAlive = false;
                enemyStatusEl.innerText = 'مات 💀';
                enemyStatusEl.className = 'status-dead';
                if(amIAlive) {
                    // I win!
                    endGame(true, 'لقد فزت! الخصم اصطدم.');
                }
            }
        }
    });

    startGame();
}

// ---------------- GAME ENGINE ----------------

const LANE_WIDTH = 100;
const CANVAS_WIDTH = 700; // 100 sidewalk + 500 road + 100 sidewalk
const CANVAS_HEIGHT = 600;
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

let player = { lane: 2, y: 250, size: 50 }; // Middle of the 5 lanes
let obstacles = [];
let sidewalkObjects = [];
let gameSpeed = 5;
let score = 0;
let highScore = 0;

function loadProgress() {
    const saved = localStorage.getItem('cairoRunnerProgress');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            highScore = data.highScore || 0;
        } catch(e) {}
    }
}
function saveProgress() {
    localStorage.setItem('cairoRunnerProgress', JSON.stringify({ highScore }));
}
loadProgress();
let isJumping = false;
let jumpTimer = 0;

// Audio System (Synthesized)
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

function playJumpSound() {
    if(audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.type = 'sine';
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.frequency.setValueAtTime(300, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
}

function playCrashSound() {
    if(audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.frequency.setValueAtTime(100, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + 0.3);
    
    gainNode.gain.setValueAtTime(0.8, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
}

// Input handling
let touchStartX = 0, touchStartY = 0;
let touchEndX = 0, touchEndY = 0;

window.addEventListener('keydown', e => {
    if(!isPlaying) return;
    if(e.key === 'ArrowLeft' || e.key === 'a') movePlayer(-1);
    if(e.key === 'ArrowRight' || e.key === 'd') movePlayer(1);
    if(e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') jump();
});

// Mobile Buttons
document.getElementById('btn-left').addEventListener('click', () => movePlayer(-1));
document.getElementById('btn-right').addEventListener('click', () => movePlayer(1));
document.getElementById('btn-jump').addEventListener('click', () => jump());

// Swipe
canvas.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
}, {passive: true});

canvas.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;
    handleSwipe();
}, {passive: true});

function handleSwipe() {
    if(!isPlaying) return;
    let dx = touchEndX - touchStartX;
    let dy = touchEndY - touchStartY;
    if(Math.abs(dx) > Math.abs(dy)) {
        if(dx < -30) movePlayer(-1);
        if(dx > 30) movePlayer(1);
    } else {
        if(dy < -30) jump();
    }
}

function movePlayer(dir) {
    player.lane += dir;
    if(player.lane < 0) player.lane = 0;
    if(player.lane > 4) player.lane = 4;
}

function jump() {
    if(!isJumping && isPlaying) {
        isJumping = true;
        jumpTimer = 40;
        playJumpSound();
    }
}

// Game Loop
function startGame() {
    modeScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    
    player.lane = 2;
    obstacles = [];
    sidewalkObjects = [];
    gameSpeed = 5;
    score = 0;
    frames = 0;
    isJumping = false;
    jumpTimer = 0;
    isPlaying = true;
    amIAlive = true;
    enemyAlive = true;
    enemyStatusEl.innerText = 'حي يرزق 🏃';
    enemyStatusEl.className = 'status-alive';
    enemyScore = 0;
    
    if(conn) {
        clearInterval(syncInterval);
        syncInterval = setInterval(() => {
            if(conn && conn.open) {
                conn.send({ type: 'sync', score, alive: amIAlive });
            }
        }, 500);
    }
    
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    update();
}

function update() {
    if(!isPlaying) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw Road
    ctx.fillStyle = '#374151'; // Dark asphalt
    ctx.fillRect(100, 0, 500, canvas.height);
    
    // Draw Sidewalks
    ctx.fillStyle = '#9ca3af';
    ctx.fillRect(0, 0, 100, canvas.height);
    ctx.fillRect(600, 0, 100, canvas.height);
    
    // Sidewalk curbs
    ctx.fillStyle = '#4b5563';
    ctx.fillRect(95, 0, 5, canvas.height);
    ctx.fillRect(600, 0, 5, canvas.height);
    
    // Lane Lines
    ctx.strokeStyle = '#fcd34d'; // Yellow dashed lines
    ctx.lineWidth = 4;
    ctx.setLineDash([20, 20]);
    let lineOffset = (frames * gameSpeed) % 40; // Road moves DOWN
    
    ctx.beginPath();
    ctx.moveTo(200, lineOffset - 40); ctx.lineTo(200, canvas.height);
    ctx.moveTo(300, lineOffset - 40); ctx.lineTo(300, canvas.height);
    ctx.moveTo(400, lineOffset - 40); ctx.lineTo(400, canvas.height);
    ctx.moveTo(500, lineOffset - 40); ctx.lineTo(500, canvas.height);
    ctx.stroke();
    
    // Score & Speed
    score += gameSpeed * 0.02;
    myScoreEl.innerText = `النقاط: ${Math.floor(score)}`;
    if(frames % 300 === 0) gameSpeed += 0.5;
    
    // Jump logic
    let playerScale = 1;
    let playerYOffset = 0;
    if(isJumping) {
        jumpTimer--;
        playerYOffset = Math.sin((jumpTimer / 40) * Math.PI) * 40;
        playerScale = 1 + Math.sin((jumpTimer / 40) * Math.PI) * 0.4;
        if(jumpTimer <= 0) isJumping = false;
    }

    // Generate Obstacles
    if(frames % Math.floor(60 - gameSpeed) === 0) {
        let count = (Math.random() > 0.7) ? 2 : 1;
        let usedLanes = [];
        for(let i=0; i<count; i++) {
            let l = Math.floor(Math.random() * 5);
            if(usedLanes.includes(l)) continue;
            usedLanes.push(l);
            let r = Math.random();
            let type, y, dy, size;
            if(r < 0.3) { type = 'pothole'; y = -50; dy = gameSpeed; size = 50; }
            else if(r < 0.7) { type = 'tuktuk'; y = CANVAS_HEIGHT + 50; dy = -(gameSpeed * 1.5); size = 60; }
            else { type = 'microbus'; y = CANVAS_HEIGHT + 60; dy = -(gameSpeed * 2.2); size = 70; }
            obstacles.push({ lane: l, y, dy, type, size });
        }
    }
    
    // Generate Sidewalk Objects
    if(frames % Math.floor(40 - gameSpeed) === 0) {
        let side = Math.random() > 0.5 ? 'left' : 'right';
        let x = side === 'left' ? 50 : 650;
        let y = -50;
        let type = Math.random() > 0.5 ? 'tree' : 'shop';
        let emoji = type === 'tree' ? '🌴' : '🏪';
        sidewalkObjects.push({ x, y, dy: gameSpeed, emoji });
    }
    
    // Draw Sidewalk Objects
    for(let i=0; i<sidewalkObjects.length; i++) {
        let obj = sidewalkObjects[i];
        obj.y += obj.dy;
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(obj.x, obj.y + 20, 20, 8, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.font = '50px Arial';
        ctx.fillText(obj.emoji, obj.x, obj.y);
    }
    sidewalkObjects = sidewalkObjects.filter(o => o.y < CANVAS_HEIGHT + 100);

    // Update & Draw Obstacles
    for(let i = 0; i < obstacles.length; i++) {
        let obs = obstacles[i];
        obs.y += obs.dy;
        let cx = 100 + obs.lane * 100 + 50;
        if(obs.type !== 'pothole') {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.beginPath();
            ctx.ellipse(cx, obs.y + 15, obs.size/2.5, 10, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        if (obs.type === 'microbus') {
            ctx.fillStyle = '#f8fafc';
            ctx.beginPath();
            ctx.roundRect(cx - 30, obs.y - 40, 60, 80, 8);
            ctx.fill();
            ctx.fillStyle = '#1e293b'; 
            ctx.fillRect(cx - 25, obs.y - 35, 50, 20);
            ctx.fillRect(cx - 25, obs.y + 25, 50, 10);
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(cx - 30, obs.y, 60, 10);
            ctx.fillStyle = '#fef08a';
            ctx.fillRect(cx - 25, obs.y - 40, 10, 5);
            ctx.fillRect(cx + 15, obs.y - 40, 10, 5);
        } else if (obs.type === 'tuktuk') {
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.roundRect(cx - 20, obs.y - 30, 40, 60, 5);
            ctx.fill();
            ctx.fillStyle = '#111827';
            ctx.fillRect(cx - 15, obs.y - 15, 30, 40);
            ctx.fillStyle = '#cbd5e1'; 
            ctx.fillRect(cx - 15, obs.y - 25, 30, 10);
            ctx.fillStyle = '#000';
            ctx.fillRect(cx - 4, obs.y - 35, 8, 10);
        } else {
            ctx.fillStyle = '#111827';
            ctx.beginPath();
            ctx.ellipse(cx, obs.y, 25, 15, 0, 0, Math.PI*2);
            ctx.fill();
        }
        
        if(obs.lane === player.lane) {
            let hitDist = (obs.type === 'microbus') ? 40 : 30;
            if(Math.abs(player.y - obs.y) < hitDist) {
                if(obs.type === 'pothole' && isJumping) {
                } else {
                    handleDeath();
                }
            }
        }
    }
    
    obstacles = obstacles.filter(o => o.y > -100 && o.y < CANVAS_HEIGHT + 200);
    
    // Draw Player
    let px = 100 + player.lane * 100 + 50;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(px, player.y + 20, 15 - (playerScale - 1)*10, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    let legOffset = Math.sin(frames * 0.5) * 15;
    let visualY = player.y - playerYOffset;
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(px - 10, visualY + 10 + legOffset, 8, 20);
    ctx.fillRect(px + 2, visualY + 10 - legOffset, 8, 20);
    ctx.fillStyle = '#4d7c0f';
    ctx.beginPath();
    ctx.roundRect(px - 15, visualY - 15, 30, 35, 5);
    ctx.fill();
    ctx.fillStyle = '#fca5a5';
    ctx.fillRect(px - 22, visualY - 10 - legOffset, 6, 20);
    ctx.fillRect(px + 16, visualY - 10 + legOffset, 6, 20);
    ctx.fillStyle = '#fca5a5';
    ctx.beginPath();
    ctx.arc(px, visualY - 15, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#451a03';
    ctx.beginPath();
    ctx.arc(px, visualY - 18, 12, Math.PI, Math.PI * 2);
    ctx.fill();
    
    frames++;
    if(isPlaying) animationId = requestAnimationFrame(update);
}

function handleDeath() {
    if(!isPlaying) return; // Prevent multiple calls
    
    isPlaying = false;
    amIAlive = false;
    playCrashSound();
    
    if(conn && conn.open) {
        conn.send({ type: 'sync', score, alive: false });
    }
    
    if(activeMode === 'p2p') {
        if(!enemyAlive) {
            // Both dead, check score
            if(score > enemyScore) endGame(true, 'كلاكما مات، ولكن نقاطك أعلى!');
            else if (score < enemyScore) endGame(false, 'لقد خسرت! نقاط الخصم أعلى.');
            else endGame(false, 'التعادل!');
        } else {
            // I died, enemy still running
            endGame(false, 'لقد اصطدمت! فاز الخصم لأنه لا يزال يركض.');
        }
    } else {
        endGame(false, 'لقد اصطدمت بميكروباص!');
    }
}

function endGame(isWin, msg) {
    isPlaying = false;
    clearInterval(syncInterval);
    setTimeout(() => {
        gameOverScreen.classList.remove('hidden');
        resultTitle.innerText = isWin ? 'أنت الفائز! 🏆' : 'انتهت اللعبة! 💥';
        resultDesc.innerText = msg;
        if (score > highScore) {
            highScore = score;
        }
        saveProgress();
        finalScoreDisplay.innerHTML = `النقاط: ${Math.floor(score)}<br><span style="font-size:1.2rem; color:#f59e0b">أعلى نتيجة: ${Math.floor(highScore)}</span>`;
        resultTitle.style.color = isWin ? '#10b981' : '#ef4444';
    }, 500);
}
