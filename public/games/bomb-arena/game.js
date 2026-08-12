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
let subMode = 'potato'; // 'potato' or 'classic'
let myRole = playerRole;
let myRoomCode = roomCode;

let names = {}; // { pid: name }
let playerIdsList = [];
let players = {}; // { pid: { x, y, alive, color, name, radius } }
let bombHolderId = null;
let bombFuseTimer = 20; // 20s fuse
let bombInterval = null;
let animationFrameId = null;
let isGameOver = false;

// Bombs and Explosions for Classic mode
let bombs = [];
let explosions = [];

// Canvas & Engine state
let canvas, ctx;

// Key states
const keys = {};
window.addEventListener('keydown', e => { keys[e.code] = true; });
window.addEventListener('keyup', e => { keys[e.code] = false; });

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    canvas = $('gameCanvas');
    if (canvas) {
        ctx = canvas.getContext('2d');
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }
    setupGameMode();
});

function selectSubMode(mode) {
    subMode = mode;
    $('tab-potato-btn').classList.toggle('active', mode === 'potato');
    $('tab-classic-btn').classList.toggle('active', mode === 'classic');
}

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
            playerIdsList = ['host', 'guest'];
            
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
        showScreen('setup-screen');
    }
}

// Show specific screen helper
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $(id).classList.add('active');
}

function getPlayerColor(id) {
    if (id === 'p1' || id === 'host' || id === 'player') return '#ef4444';
    if (id === 'p2' || id === 'guest' || id === 'ai') return '#3b82f6';
    if (id === 'p3') return '#10b981';
    if (id === 'p4') return '#f59e0b';
    return '#ec4899';
}

/* ════════════════════ LOCAL MULTIPLAYER GAME ENGINE ════════════════════ */

function initLocalGame(playerCount) {
    playSound('click');
    activeMode = 'local';
    
    // فرض عدد اللاعبين ليكون 3
    playerCount = 3; 
    
    names = {};
    playerIdsList = [];
    players = {};
    
    // أماكن ثابتة لـ 3 لاعبين يجلسون بجانب بعضهم
    const spawns = [
        { x: 200, y: 250 },
        { x: 400, y: 250 },
        { x: 600, y: 250 }
    ];

    for (let i = 1; i <= playerCount; i++) {
        const pid = 'p' + i;
        names[pid] = 'اللاعب ' + i;
        playerIdsList.push(pid);
        
        const pos = spawns[i - 1];
        players[pid] = {
            id: pid,
            x: pos.x,
            y: pos.y,
            speed: 0, // إيقاف الحركة لأنهم يجلسون
            radius: 30, // تكبير حجم الشخصية قليلاً
            color: getPlayerColor(pid),
            alive: true,
            name: names[pid]
        };
    }
    
    showScreen('play-screen');
    startGameLoop();
}

function startGameLoop() {
    isGameOver = false;
    bombs = [];
    explosions = [];
    
    // Pick initial bomb holder for Potato mode
    if (subMode === 'potato') {
        const aliveList = playerIdsList.filter(id => players[id] && players[id].alive);
        bombHolderId = aliveList[Math.floor(Math.random() * aliveList.length)];
        startBombTimer();
    } else {
        $('bomb-timer-display').innerText = 'وضع القنابل';
    }
    
    setTimeout(() => {
        resizeCanvas();
        updateScoreboard();
        updateHolderDisplay();
        
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        loop();
    }, 60);
}

function startBombTimer() {
    if (bombInterval) clearInterval(bombInterval);
    bombFuseTimer = 18; // 18s round fuse
    $('bomb-timer-display').innerText = `💣 ${bombFuseTimer}s`;
    $('bomb-timer-display').classList.remove('danger-flash');
    
    bombInterval = setInterval(() => {
        if (isGameOver) return;
        
        bombFuseTimer--;
        $('bomb-timer-display').innerText = `💣 ${bombFuseTimer}s`;
        
        if (bombFuseTimer <= 5) {
            $('bomb-timer-display').classList.add('danger-flash');
            playSound('tick');
        }
        
        if (bombFuseTimer <= 0) {
            clearInterval(bombInterval);
            explodeBombOnHolder();
        }
    }, 1000);
}

function explodeBombOnHolder() {
    if (isGameOver || !bombHolderId || !players[bombHolderId]) return;
    
    const victimId = bombHolderId;
    playSound('error');
    
    // Create explosion at victim position
    explosions.push({
        x: players[victimId].x,
        y: players[victimId].y,
        radius: 70,
        timer: 30
    });
    
    // Eliminate victim
    players[victimId].alive = false;
    updateScoreboard();
    
    // Check remaining alive players
    const alivePlayers = playerIdsList.filter(id => players[id] && players[id].alive);
    
    if (alivePlayers.length <= 1) {
        const winnerId = alivePlayers[0] || victimId;
        triggerGameOver(names[winnerId] || 'الناجي الأخير');
    } else {
        // Next round: Pick new bomb holder from remaining alive players
        bombHolderId = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
        updateHolderDisplay();
        setTimeout(() => {
            if (!isGameOver) startBombTimer();
        }, 1200);
    }
}

/* ════════════════════ MAIN CANVAS GAME LOOP ════════════════════ */

function loop() {
    if (isGameOver || !ctx) return;
    
    // Process Inputs for Local Players
    updateLocalPlayerPositions();
    
    // Clear Screen
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw Arena Grid
    drawArenaGrid();
    
    // Draw Explosions
    updateAndDrawExplosions();
    
    // Draw Players
    drawPlayers();
    
    // Check Bomb Pass Collision in Potato Mode
    if (subMode === 'potato') {
        checkBombPassCollision();
    }
    
    animationFrameId = requestAnimationFrame(loop);
}

// دالة تمرير البطاطس
function passBomb(fromId) {
    if (bombHolderId !== fromId) return;
    
    // إيجاد اللاعب التالي في الصف
    const currentIndex = playerIdsList.indexOf(fromId);
    let nextIndex = (currentIndex + 1) % playerIdsList.length;
    
    // تخطي اللاعبين الذين خرجوا
    let attempts = 0;
    while (!players[playerIdsList[nextIndex]].alive && attempts < playerIdsList.length) {
        nextIndex = (nextIndex + 1) % playerIdsList.length;
        attempts++;
    }
    
    bombHolderId = playerIdsList[nextIndex];
    updateHolderDisplay();
    playSound('correct');
}

// تحديث التعامل مع الأزرار
function updateLocalPlayerPositions() {
    if (activeMode !== 'local') return;

    // تم إيقاف الحركة، وتفعيل أزرار التمرير
    if (keys['KeyE']) passBomb('p1');
    if (keys['KeyO']) passBomb('p2');
    if (keys['KeyY']) passBomb('p3');
}

function clampPosition(p) {
    p.x = Math.max(p.radius, Math.min(canvas.width - p.radius, p.x));
    p.y = Math.max(p.radius, Math.min(canvas.height - p.radius, p.y));
}

function checkBombPassCollision() {
    if (!bombHolderId || !players[bombHolderId] || !players[bombHolderId].alive) return;
    
    const holder = players[bombHolderId];
    
    playerIdsList.forEach(otherId => {
        if (otherId === bombHolderId) return;
        const other = players[otherId];
        if (other && other.alive) {
            const dist = Math.hypot(holder.x - other.x, holder.y - other.y);
            if (dist < holder.radius + other.radius + 6) {
                // PASS BOMB TO OTHER PLAYER!
                playSound('correct');
                bombHolderId = otherId;
                updateHolderDisplay();
                updateScoreboard();
            }
        }
    });
}

function drawArenaGrid() {
    ctx.save();
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
    ctx.lineWidth = 1;
    const step = 45;
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

function drawPlayers() {
    playerIdsList.forEach(pid => {
        const p = players[pid];
        if (!p || !p.alive) return;
        
        const isHolder = (subMode === 'potato' && bombHolderId === pid);
        
        ctx.save();
        
        // رسم جسم الشخصية (بدل الدائرة البسيطة)
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#fff';
        ctx.stroke();

        // إضافة ملامح وجه بسيطة
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(p.x - 7, p.y - 5, 4, 0, Math.PI * 2); // عين يسار
        ctx.arc(p.x + 7, p.y - 5, 4, 0, Math.PI * 2); // عين يمين
        ctx.fill();
        
        // تعبيرات وجه حسب الحالة (حامل القنبلة خائف)
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (isHolder) {
            ctx.arc(p.x, p.y + 10, 5, Math.PI, 0); // فم حزين/خائف
        } else {
            ctx.arc(p.x, p.y + 12, 5, 0, Math.PI); // فم مبتسم
        }
        ctx.stroke();
        
        // قبعة مميزة لكل لاعب
        ctx.fillStyle = isHolder ? '#facc15' : '#334155';
        ctx.fillRect(p.x - 15, p.y - p.radius - 8, 30, 8);
        
        // Draw Ticking Bomb Icon above Holder
        if (isHolder) {
            ctx.font = 'bold 20px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('🥔🔥', p.x, p.y - p.radius - 20);
        }
        
        // Draw Player Name
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Tajawal, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(p.name, p.x, p.y + p.radius + 16);
        
        ctx.restore();
    });
}

function updateAndDrawExplosions() {
    for (let i = explosions.length - 1; i >= 0; i--) {
        const ex = explosions[i];
        ex.timer--;
        
        ctx.save();
        ctx.shadowBlur = 30;
        ctx.shadowColor = '#ef4444';
        
        ctx.beginPath();
        ctx.arc(ex.x, ex.y, ex.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(239, 68, 68, ${ex.timer / 30})`;
        ctx.fill();
        ctx.strokeStyle = '#f87171';
        ctx.lineWidth = 4;
        ctx.stroke();
        
        ctx.restore();
        
        if (ex.timer <= 0) explosions.splice(i, 1);
    }
}

function updateHolderDisplay() {
    const holderBadge = $('current-holder-display');
    if (holderBadge && bombHolderId && names[bombHolderId]) {
        holderBadge.innerText = names[bombHolderId] + ' 💣';
        holderBadge.style.borderColor = getPlayerColor(bombHolderId);
        holderBadge.style.color = getPlayerColor(bombHolderId);
    }
}

function updateScoreboard() {
    const scoreboard = $('scoreboard');
    scoreboard.innerHTML = '';
    
    playerIdsList.forEach(playerId => {
        const badge = document.createElement('div');
        badge.className = 'score-badge';
        if (subMode === 'potato' && bombHolderId === playerId) {
            badge.classList.add('has-bomb');
        }
        badge.style.borderColor = getPlayerColor(playerId);
        
        const isAlive = players[playerId] ? players[playerId].alive : true;
        const statusText = isAlive ? (bombHolderId === playerId ? 'مع القنبلة 💣' : 'ناجٍ ⚡') : 'خسر 💥';
        
        badge.innerHTML = `<span>${names[playerId] || playerId}:</span><span class="score-val">${statusText}</span>`;
        scoreboard.appendChild(badge);
    });
}

function triggerGameOver(winnerName) {
    isGameOver = true;
    if (bombInterval) clearInterval(bombInterval);
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    playSound('victory');
    
    const sorted = playerIdsList.map(id => ({
        id,
        name: names[id],
        alive: players[id] ? players[id].alive : false
    })).sort((a, b) => (b.alive ? 1 : 0) - (a.alive ? 1 : 0));
                                      
    const list = $('leaderboard-list');
    list.innerHTML = '';
    
    sorted.forEach((p, idx) => {
        const row = document.createElement('div');
        row.className = `leaderboard-row ${idx === 0 ? 'rank-1' : ''}`;
        row.innerHTML = `<div class="rank-name"><span>#${idx+1}</span> <span>${p.name}</span></div><span class="rank-score">${p.alive ? 'الناجي الأخير 🏆' : 'انفجر 💥'}</span>`;
        list.appendChild(row);
    });
    
    $('winner-subtitle').innerText = `الفائز والناجي الأخير هو ${winnerName}! 🎉`;
    
    showScreen('game-over-screen');
    
    if (window.parent) {
        window.parent.postMessage({
            type: 'ARCADE_GAME_OVER',
            winner: winnerName,
            gameId: 'bomb-arena'
        }, '*');
    }
}

function restartGame() {
    playSound('click');
    if (activeMode === 'local') {
        initLocalGame(playerIdsList.length || 2);
    }
}

function exitGame() {
    playSound('click');
    isGameOver = true;
    if (bombInterval) clearInterval(bombInterval);
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
        window.parent.postMessage({ type: 'ARCADE_GAME_START', gameId: 'bomb-arena' }, '*');
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
        playerIdsList = ['host', 'guest'];
        sendMessageToPeer({ type: 'HOST_ACCEPT', name: names['host'] });
        startOnlineGame();
    } else if (data.type === 'HOST_ACCEPT' && myRole === 'guest') {
        names['host'] = data.name || 'المضيف 👑';
        names['guest'] = localStorage.getItem('arcade_player_name') || 'الضيف ⚡';
        playerIdsList = ['host', 'guest'];
        showScreen('play-screen');
        startGameLoop();
    }
}

function initProAiGame() {
    activeMode = 'pro';
    names['player'] = localStorage.getItem('arcade_player_name') || 'أنت 👤';
    names['ai'] = 'خبير القنابل (AI) 🤖';
    playerIdsList = ['player', 'ai'];
    
    showScreen('play-screen');
    startGameLoop();
}
