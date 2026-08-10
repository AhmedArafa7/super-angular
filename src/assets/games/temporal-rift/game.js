// Elements shorthand
function $(id) { return document.getElementById(id); }

// Sound helper
function playSound(type) {
    if (window.parent) {
        window.parent.postMessage({ type: 'AUDIO_PLAY_SFX', volume: 0.8 }, '*');
    }
}

// Read URL Parameters
const urlParams = new URLSearchParams(window.location.search);
const gameMode = urlParams.get('mode') || 'local'; // 'local', 'private', 'pro'
const roomCode = urlParams.get('room') || '';
const playerRole = urlParams.get('role') || 'host'; // 'host', 'guest'

// Game state variables
let activeMode = gameMode;
let myRole = playerRole;
let myRoomCode = roomCode;

let score = {}; // { player_id: points }
let names = {}; // { player_id: display_name }
let playerIdsList = [];
let currentTurnIndex = 0;
let isGameOver = false;

// Canvas & Engine state
let canvas, ctx;
let animationFrameId = null;
let gameTimerInterval = null;
let timeRemaining = 60; // 60 seconds match

// Player Object
let player = {
    x: 300,
    y: 200,
    radius: 18,
    vx: 0,
    vy: 0,
    speed: 5,
    color: '#a855f7'
};

// Game Objects
let crystals = [];
let voidOrbs = [];
let particles = [];

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    canvas = $('rift-canvas');
    if (canvas) {
        ctx = canvas.getContext('2d');
        window.addEventListener('resize', resizeCanvas);
        setupControls();
    }
    setupGameMode();
});

function resizeCanvas() {
    if (!canvas) return;
    const container = $('canvas-container');
    if (container && container.clientWidth > 0 && container.clientHeight > 0) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
    } else {
        canvas.width = window.innerWidth ? Math.min(800, window.innerWidth - 20) : 800;
        canvas.height = window.innerHeight ? Math.min(500, window.innerHeight - 140) : 500;
    }
}

// Setup controls for player movement
function setupControls() {
    window.addEventListener('mousemove', (e) => {
        if (isGameOver || !canvas) return;
        const rect = canvas.getBoundingClientRect();
        const targetX = e.clientX - rect.left;
        const targetY = e.clientY - rect.top;
        if (targetX >= 0 && targetX <= canvas.width && targetY >= 0 && targetY <= canvas.height) {
            player.x += (targetX - player.x) * 0.18;
            player.y += (targetY - player.y) * 0.18;
        }
    });

    window.addEventListener('touchmove', (e) => {
        if (isGameOver || !canvas || !e.touches[0]) return;
        const rect = canvas.getBoundingClientRect();
        const targetX = e.touches[0].clientX - rect.left;
        const targetY = e.touches[0].clientY - rect.top;
        if (targetX >= 0 && targetX <= canvas.width && targetY >= 0 && targetY <= canvas.height) {
            player.x += (targetX - player.x) * 0.22;
            player.y += (targetY - player.y) * 0.22;
        }
    }, { passive: true });
}

// Setup screens according to mode
function setupGameMode() {
    if (activeMode === 'private') {
        $('local-setup').classList.add('hidden');
        $('online-setup').classList.remove('hidden');
        $('room-code-display').classList.remove('hidden');
        $('room-id-val').innerText = myRoomCode;
        
        window.addEventListener('message', receiveMessage);
        
        if (myRole === 'host') {
            names['host'] = localStorage.getItem('arcade_player_name') || 'المضيف 👑';
            names['guest'] = 'المنافس ⚡';
            score = { 'host': 0, 'guest': 0 };
            playerIdsList = ['host', 'guest'];
            currentTurnIndex = 0;
            
            setTimeout(() => {
                startOnlineGame();
            }, 2500);
        } else {
            names['host'] = 'المضيف 👑';
            names['guest'] = localStorage.getItem('arcade_player_name') || 'الضيف ⚡';
            playerIdsList = ['host', 'guest'];
            
            sendMessageToPeer({
                type: 'GUEST_JOIN',
                name: names['guest']
            });
        }
    } else if (activeMode === 'pro') {
        $('local-setup').classList.add('hidden');
        $('online-setup').classList.remove('hidden');
        $('online-setup').querySelector('.status-text').innerText = 'جاري البحث عن خصم محترف أونلاين...';
        
        setTimeout(() => {
            initProAiGame();
        }, 1800);
    } else {
        // Auto-launch local 2P game if mode parameter is preset
        initLocalGame(2);
    }
}

// Show specific screen helper
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $(id).classList.add('active');
}

function getPlayerColor(id) {
    if (id === 'p1' || id === 'host' || id === 'player') return '#a855f7';
    if (id === 'p2' || id === 'guest' || id === 'ai') return '#38bdf8';
    if (id === 'p3') return '#10b981';
    if (id === 'p4') return '#facc15';
    return '#c084fc';
}

/* ════════════════════ LOCAL MULTIPLAYER GAME ════════════════════ */

function initLocalGame(playerCount) {
    playSound('click');
    activeMode = 'local';
    
    score = {};
    names = {};
    playerIdsList = [];
    
    for (let i = 1; i <= playerCount; i++) {
        const pid = 'p' + i;
        score[pid] = 0;
        names[pid] = 'اللاعب ' + i;
        playerIdsList.push(pid);
    }
    currentTurnIndex = 0;
    
    showScreen('play-screen');
    startGameLoop();
}

function startGameLoop() {
    isGameOver = false;
    timeRemaining = 60;
    $('game-timer').innerText = timeRemaining + 's';
    
    if (gameTimerInterval) clearInterval(gameTimerInterval);
    gameTimerInterval = setInterval(() => {
        timeRemaining--;
        $('game-timer').innerText = timeRemaining + 's';
        if (timeRemaining <= 0) {
            clearInterval(gameTimerInterval);
            triggerGameOver();
        }
    }, 1000);
    
    // Ensure canvas dimensions match container AFTER screen becomes visible
    setTimeout(() => {
        resizeCanvas();
        player.x = canvas.width / 2;
        player.y = canvas.height / 2;
        spawnInitialObjects();
        updateScoreboard();
        updateTurnDisplay();
        
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        loop();
    }, 60);
}

function spawnInitialObjects() {
    crystals = [];
    voidOrbs = [];
    particles = [];
    
    if (!canvas || canvas.width === 0) return;
    
    for (let i = 0; i < 10; i++) {
        crystals.push(createCrystal());
    }
    for (let i = 0; i < 6; i++) {
        voidOrbs.push(createVoidOrb());
    }
}

function createCrystal() {
    const w = canvas.width > 50 ? canvas.width : 600;
    const h = canvas.height > 50 ? canvas.height : 400;
    return {
        x: Math.random() * (w - 60) + 30,
        y: Math.random() * (h - 60) + 30,
        radius: 12,
        pulse: Math.random() * Math.PI,
        points: Math.floor(Math.random() * 3) + 1
    };
}

function createVoidOrb() {
    const w = canvas.width > 50 ? canvas.width : 600;
    const h = canvas.height > 50 ? canvas.height : 400;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 2.5 + 1.2;
    return {
        x: Math.random() * (w - 60) + 30,
        y: Math.random() * (h - 60) + 30,
        radius: Math.random() * 8 + 14,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed
    };
}

/* ════════════════════ CANVAS GAME LOOP ════════════════════ */

function loop() {
    if (isGameOver || !ctx) return;
    
    // Clear Screen with Deep Void Background
    ctx.fillStyle = 'rgba(9, 13, 22, 0.35)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw Cosmic Grid Lines
    drawCosmicGrid();
    
    // Draw Particles
    drawParticles();
    
    // Update and Draw Void Orbs
    updateAndDrawVoidOrbs();
    
    // Update and Draw Crystals
    updateAndDrawCrystals();
    
    // Draw Player Ship
    drawPlayer();
    
    // Check Collisions
    checkCollisions();
    
    animationFrameId = requestAnimationFrame(loop);
}

function drawCosmicGrid() {
    ctx.save();
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.06)';
    ctx.lineWidth = 1;
    const step = 40;
    for (let x = 0; x < canvas.width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    ctx.restore();
}

function drawPlayer() {
    const activePlayerId = playerIdsList[currentTurnIndex] || 'p1';
    const color = getPlayerColor(activePlayerId);
    
    ctx.save();
    ctx.shadowBlur = 25;
    ctx.shadowColor = color;
    
    // Outer Shield Aura
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 4, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw Ship Energy Core
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    ctx.restore();
}

function updateAndDrawCrystals() {
    crystals.forEach((c) => {
        c.pulse += 0.06;
        const radius = c.radius + Math.sin(c.pulse) * 3;
        
        ctx.save();
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#c084fc';
        
        ctx.beginPath();
        ctx.arc(c.x, c.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#c084fc';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw Points Label inside crystal
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 11px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('+' + c.points, c.x, c.y);
        
        ctx.restore();
    });
}

function updateAndDrawVoidOrbs() {
    voidOrbs.forEach(orb => {
        orb.x += orb.vx;
        orb.y += orb.vy;
        
        // Bounce off walls
        if (orb.x <= orb.radius || orb.x >= canvas.width - orb.radius) orb.vx *= -1;
        if (orb.y <= orb.radius || orb.y >= canvas.height - orb.radius) orb.vy *= -1;
        
        ctx.save();
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ef4444';
        
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.restore();
    });
}

function drawParticles() {
    if (Math.random() < 0.4) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            alpha: 1,
            size: Math.random() * 3 + 1
        });
    }
    
    particles.forEach((p) => {
        p.alpha -= 0.012;
        ctx.fillStyle = `rgba(168, 85, 247, ${p.alpha})`;
        ctx.fillRect(p.x, p.y, p.size, p.size);
    });
    
    particles = particles.filter(p => p.alpha > 0);
}

function checkCollisions() {
    const activePlayerId = playerIdsList[currentTurnIndex];
    if (!activePlayerId) return;
    
    // Crystal Collection
    crystals.forEach((c, idx) => {
        const dist = Math.hypot(player.x - c.x, player.y - c.y);
        if (dist < player.radius + c.radius) {
            playSound('correct');
            score[activePlayerId] = (score[activePlayerId] || 0) + c.points;
            crystals[idx] = createCrystal();
            updateScoreboard();
        }
    });
    
    // Void Orb Collision
    voidOrbs.forEach(orb => {
        const dist = Math.hypot(player.x - orb.x, player.y - orb.y);
        if (dist < player.radius + orb.radius) {
            playSound('error');
            score[activePlayerId] = Math.max(0, (score[activePlayerId] || 0) - 2);
            updateScoreboard();
            
            player.x = canvas.width / 2;
            player.y = canvas.height / 2;
            
            if (activeMode === 'local') {
                currentTurnIndex = (currentTurnIndex + 1) % playerIdsList.length;
                updateTurnDisplay();
            }
        }
    });
}

function updateTurnDisplay() {
    if (playerIdsList.length === 0) return;
    const currentId = playerIdsList[currentTurnIndex];
    const turnBadge = $('current-turn-display');
    const color = getPlayerColor(currentId);
    
    if (turnBadge && names[currentId]) {
        turnBadge.innerText = names[currentId];
        turnBadge.style.borderColor = color;
        turnBadge.style.color = color;
    }

    document.querySelectorAll('.score-badge').forEach(badge => {
        if (badge.dataset.player === currentId) {
            badge.classList.add('active-turn');
        } else {
            badge.classList.remove('active-turn');
        }
    });
}

function updateScoreboard() {
    const scoreboard = $('scoreboard');
    scoreboard.innerHTML = '';
    
    playerIdsList.forEach(playerId => {
        const badge = document.createElement('div');
        badge.className = 'score-badge';
        badge.dataset.player = playerId;
        badge.style.borderColor = getPlayerColor(playerId);
        
        if (playerIdsList[currentTurnIndex] === playerId) {
            badge.classList.add('active-turn');
        }
        
        badge.innerHTML = `<span>${names[playerId] || playerId}:</span><span class="score-val">${score[playerId] || 0}</span>`;
        scoreboard.appendChild(badge);
    });
}

function triggerGameOver() {
    isGameOver = true;
    if (gameTimerInterval) clearInterval(gameTimerInterval);
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    playSound('victory');
    
    const sorted = playerIdsList.map(id => ({ id, name: names[id], points: score[id] || 0 }))
                                .sort((a, b) => b.points - a.points);
                                      
    const list = $('leaderboard-list');
    list.innerHTML = '';
    
    sorted.forEach((p, idx) => {
        const row = document.createElement('div');
        row.className = `leaderboard-row ${idx === 0 ? 'rank-1' : ''}`;
        row.innerHTML = `<div class="rank-name"><span>#${idx+1}</span> <span>${p.name}</span></div><span class="rank-score">${p.points} نقطة ⏳</span>`;
        list.appendChild(row);
    });
    
    showScreen('game-over-screen');
    
    if (window.parent) {
        window.parent.postMessage({
            type: 'ARCADE_GAME_OVER',
            winner: sorted[0] ? sorted[0].name : '',
            gameId: 'temporal-rift'
        }, '*');
    }
}

function restartGame() {
    playSound('click');
    playerIdsList.forEach(k => score[k] = 0);
    showScreen('play-screen');
    startGameLoop();
}

function exitGame() {
    playSound('click');
    isGameOver = true;
    if (gameTimerInterval) clearInterval(gameTimerInterval);
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    
    if (window.parent) {
        window.parent.postMessage({ type: 'CLOSE_GAME' }, '*');
    }
}

/* ════════════════════ ONLINE & PRO MODE SYSTEM ════════════════════ */

function startOnlineGame() {
    showScreen('play-screen');
    startGameLoop();
    
    if (window.parent) {
        window.parent.postMessage({ type: 'ARCADE_GAME_START', gameId: 'temporal-rift' }, '*');
    }
}

function sendMessageToPeer(data) {
    if (window.parent) {
        window.parent.postMessage(data, '*');
    }
}

function receiveMessage(event) {
    const data = event.data;
    if (!data || !data.type) return;
    
    if (data.type === 'GUEST_JOIN' && myRole === 'host') {
        names['guest'] = data.name || 'المنافس ⚡';
        score = { 'host': 0, 'guest': 0 };
        playerIdsList = ['host', 'guest'];
        currentTurnIndex = 0;
        sendMessageToPeer({ type: 'HOST_ACCEPT', name: names['host'] });
        startOnlineGame();
    } else if (data.type === 'HOST_ACCEPT' && myRole === 'guest') {
        names['host'] = data.name || 'المضيف 👑';
        names['guest'] = localStorage.getItem('arcade_player_name') || 'الضيف ⚡';
        score = { 'host': 0, 'guest': 0 };
        playerIdsList = ['host', 'guest'];
        currentTurnIndex = 0;
        showScreen('play-screen');
        startGameLoop();
    }
}

function initProAiGame() {
    activeMode = 'pro';
    names['player'] = localStorage.getItem('arcade_player_name') || 'أنت 👤';
    names['ai'] = 'صدع الزمن (AI) 🤖';
    
    score = { 'player': 0, 'ai': 0 };
    playerIdsList = ['player', 'ai'];
    currentTurnIndex = 0;
    
    showScreen('play-screen');
    startGameLoop();
}
