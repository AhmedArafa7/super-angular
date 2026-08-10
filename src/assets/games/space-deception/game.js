const $ = id => document.getElementById(id);
const showScreen = id => {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $(id).classList.add('active');
};

// --- NETWORKING (PEER JS) ---
let peer = null;
let conn = null; // Client connection to host
let isHost = false;
let hostConns = {}; // Host connections to clients

let myId = null;
let myName = '';
let roomId = '';

// --- GAME STATE ---
let gameState = 'LOBBY'; // LOBBY, PLAYING, MEETING, ENDED
let players = {}; // id -> { name, color, x, y, role, isDead, isHost }
let bodies = []; // { x, y, color }
let tasks = []; // Map tasks
let totalTasksCompleted = 0;
let totalTasksRequired = 10;
let meetingData = { caller: '', timer: 120, votes: {}, chat: [] }; // votes: voterId -> votedId ('skip' or playerId)
let myRole = 'CREWMATE'; // CREWMATE, IMPOSTOR

// Settings
const MAP_WIDTH = 1200;
const MAP_HEIGHT = 800;
const SPEED = 4;
const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6'];
let myColor = COLORS[0];

// Input
let keys = { w: false, a: false, s: false, d: false };

// Canvas
const canvas = $('game-canvas');
const ctx = canvas.getContext('2d');
let camera = { x: 0, y: 0 };

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// --- MAP & TASKS DEFINITION ---
const rooms = [
    { name: 'Cafeteria', x: 400, y: 100, w: 400, h: 300, color: '#1e293b' },
    { name: 'Engine', x: 50, y: 400, w: 300, h: 300, color: '#334155' },
    { name: 'Lab', x: 850, y: 400, w: 300, h: 300, color: '#0f172a' },
    { name: 'Control', x: 450, y: 500, w: 300, h: 200, color: '#475569' }
];

// Corridors connecting rooms
const corridors = [
    { x: 200, y: 250, w: 200, h: 150 }, // Cafe to Engine
    { x: 800, y: 250, w: 200, h: 150 }, // Cafe to Lab
    { x: 550, y: 400, w: 100, h: 100 }  // Cafe to Control
];

const taskLocations = [
    { id: 1, x: 500, y: 150, name: 'تفريغ القمامة', doneBy: [] },
    { id: 2, x: 100, y: 650, name: 'إصلاح الأسلاك', doneBy: [] },
    { id: 3, x: 1000, y: 650, name: 'تحليل العينات', doneBy: [] },
    { id: 4, x: 600, y: 650, name: 'تنزيل البيانات', doneBy: [] }
];

const dropshipImg = new Image();
dropshipImg.src = 'dropship.png';

// --- INITIALIZATION ---
$('host-btn').onclick = () => {
    myName = $('player-name').value.trim() || 'لاعب';
    isHost = true;
    initPeer();
};

$('join-btn').onclick = () => {
    myName = $('player-name').value.trim() || 'لاعب';
    roomId = $('join-id').value.trim();
    if (!roomId) return alert('أدخل كود الغرفة');
    isHost = false;
    initPeer();
};

function initPeer() {
    peer = new Peer();
    
    peer.on('open', id => {
        myId = id;
        if (isHost) {
            roomId = id;
            players[myId] = { id: myId, name: myName, color: COLORS[0], x: 600, y: 250, role: 'CREWMATE', isDead: false, isHost: true };
            gameState = 'LOBBY';
            showScreen('game-screen');
            updateLobbyUI();
            requestAnimationFrame(gameLoopClient);
        } else {
            conn = peer.connect(roomId);
            setupClientConnection(conn);
        }
    });

    if (isHost) {
        peer.on('connection', connection => {
            connection.on('open', () => {
                const newPlayerColor = COLORS[Object.keys(players).length % COLORS.length];
                players[connection.peer] = { id: connection.peer, name: 'ضيف', color: newPlayerColor, x: 600 + Math.random()*40 - 20, y: 250 + Math.random()*40 - 20, role: 'CREWMATE', isDead: false, isHost: false };
                hostConns[connection.peer] = connection;
                
                connection.on('data', data => handleHostData(connection.peer, data));
                connection.on('close', () => {
                    delete players[connection.peer];
                    delete hostConns[connection.peer];
                    broadcast({ type: 'UPDATE_STATE', players, gameState });
                    updateLobbyUI();
                });
                
                broadcast({ type: 'UPDATE_STATE', players, gameState });
                updateLobbyUI();
            });
        });
    }
}

// Auto join or host from URL
window.onload = () => {
    initColorPicker();
    const params = new URLSearchParams(window.location.search);
    if (params.has('room')) {
        $('join-id').value = params.get('room');
    }
    // Auto-host if mode=private or mode=local in arena
    const mode = params.get('mode');
    if (mode && !peer) {
        myName = 'لاعب 1';
        isHost = true;
        initPeer();
    }
};

// --- NETWORKING LOGIC ---

function setupClientConnection(connection) {
    connection.on('open', () => {
        connection.send({ type: 'JOIN', name: myName });
        gameState = 'LOBBY';
        showScreen('game-screen');
        updateLobbyUI();
        requestAnimationFrame(gameLoopClient);
    });

    connection.on('data', data => {
        if (data.type === 'UPDATE_STATE') {
            players = data.players;
            if (data.bodies) bodies = data.bodies;
            if (data.tasks) tasks = data.tasks;
            totalTasksCompleted = data.totalTasksCompleted || 0;
            updateLobbyUI();
            
            if (data.gameState === 'PLAYING' && gameState === 'LOBBY') {
                startGameClient(data);
            }
            if (data.gameState === 'MEETING' && gameState === 'PLAYING') {
                startMeetingClient(data.meetingData);
            }
            if (data.gameState === 'PLAYING' && gameState === 'MEETING') {
                endMeetingClient();
            }
            if (data.gameState === 'ENDED' && gameState !== 'ENDED') {
                endGameClient(data.winner);
            }
            
            gameState = data.gameState;
            if (data.meetingData) meetingData = data.meetingData;
        }
    });
}

function handleHostData(peerId, data) {
    if (gameState === 'LOBBY') {
        if (data.type === 'JOIN') {
            players[peerId].name = data.name;
            broadcast({ type: 'UPDATE_STATE', players, gameState });
            updateLobbyUI();
        } else if (data.type === 'CHANGE_COLOR') {
            if (players[peerId]) {
                players[peerId].color = data.color;
                broadcast({ type: 'UPDATE_STATE', players, gameState });
                updateLobbyUI();
            }
        } else if (data.type === 'MOVE') {
            if (players[peerId]) {
                players[peerId].x = data.x;
                players[peerId].y = data.y;
                broadcast({ type: 'UPDATE_STATE', players, gameState });
            }
        }
    } else if (gameState === 'PLAYING') {
        if (data.type === 'MOVE') {
            if (!players[peerId].isDead) {
                players[peerId].x = data.x;
                players[peerId].y = data.y;
            }
        } else if (data.type === 'KILL') {
            if (players[peerId].role === 'IMPOSTOR' && !players[data.targetId].isDead) {
                players[data.targetId].isDead = true;
                bodies.push({ x: players[data.targetId].x, y: players[data.targetId].y, color: players[data.targetId].color });
                checkWinCondition();
            }
        } else if (data.type === 'REPORT') {
            startMeeting(players[peerId].name);
        } else if (data.type === 'TASK') {
            if (players[peerId].role === 'CREWMATE') {
                let t = tasks.find(t => t.id === data.taskId);
                if (t && !t.doneBy.includes(peerId)) {
                    t.doneBy.push(peerId);
                    totalTasksCompleted++;
                    checkWinCondition();
                }
            }
        }
    } else if (gameState === 'MEETING') {
        if (data.type === 'VOTE') {
            meetingData.votes[peerId] = data.voteTarget;
            checkMeetingEnd();
        } else if (data.type === 'CHAT') {
            meetingData.chat.push({ sender: players[peerId].name, text: data.text });
        }
    }
    
    // Broadcast state frequently handled in host game loop
}

function broadcast(data) {
    Object.values(hostConns).forEach(conn => conn.send(data));
}

// --- LOBBY UI & DROPSHIP SPACESHIP ---
function initColorPicker() {
    const container = $('color-dots-container');
    if (!container) return;
    container.innerHTML = '';
    COLORS.forEach(c => {
        const dot = document.createElement('div');
        dot.className = 'color-dot';
        dot.style.backgroundColor = c;
        dot.onclick = () => selectColor(c);
        container.appendChild(dot);
    });
}

function selectColor(color) {
    if (!players[myId]) return;
    players[myId].color = color;
    myColor = color;
    if (isHost) {
        broadcast({ type: 'UPDATE_STATE', players, gameState });
        updateLobbyUI();
    } else if (conn) {
        conn.send({ type: 'CHANGE_COLOR', color });
    }
}

$('copy-link-btn').onclick = () => {
    const url = new URL(window.location.href);
    if (roomId) url.searchParams.set('room', roomId);
    navigator.clipboard.writeText(url.href).then(() => {
        $('copy-link-btn').innerText = '✅ تم النسخ!';
        setTimeout(() => $('copy-link-btn').innerText = '📋 نسخ', 2000);
    });
};

function updateLobbyUI() {
    if (gameState !== 'LOBBY') return;
    
    // Update dropship HUD
    const dropshipHud = $('dropship-hud');
    if (dropshipHud) dropshipHud.classList.remove('hidden');
    
    $('dropship-room-code').innerText = roomId || '...';
    
    const count = Object.keys(players).length;
    const startBtn = $('dropship-start-btn');
    const waitingMsg = $('dropship-waiting-msg');
    
    if (isHost) {
        startBtn.classList.remove('hidden');
        startBtn.innerText = `🚀 بدء اللعبة (${count}/10)`;
        waitingMsg.classList.add('hidden');
    } else {
        startBtn.classList.add('hidden');
        waitingMsg.classList.remove('hidden');
    }

    // Highlight active color dot
    const dots = document.querySelectorAll('.color-dot');
    dots.forEach(d => {
        if (d.style.backgroundColor === myColor || d.style.backgroundColor === (players[myId] && players[myId].color)) {
            d.classList.add('active');
        } else {
            d.classList.remove('active');
        }
    });

    // Also update classic list if visible
    const ul = $('players-ul');
    if (ul) {
        ul.innerHTML = '';
        Object.values(players).forEach(p => {
            const li = document.createElement('li');
            li.innerHTML = `<span style="color:${p.color}">●</span> ${p.name} ${p.isHost ? '(مضيف)' : ''}`;
            ul.appendChild(li);
        });
    }
}

// --- GAME START ---
$('dropship-start-btn').onclick = () => $('start-game-btn').click();

$('start-game-btn').onclick = () => {
    if (!isHost) return;
    
    // Assign roles
    const playerIds = Object.keys(players);
    if (playerIds.length < 1) return alert('نحتاج لاعب واحد على الأقل للتجربة (في الواقع يفضل 4+)');
    
    // Randomly pick 1 impostor
    const impostorId = playerIds[Math.floor(Math.random() * playerIds.length)];
    playerIds.forEach(id => {
        players[id].role = (id === impostorId) ? 'IMPOSTOR' : 'CREWMATE';
        players[id].isDead = false;
        players[id].x = 600 + Math.random()*50;
        players[id].y = 250 + Math.random()*50;
    });
    
    tasks = JSON.parse(JSON.stringify(taskLocations)); // Reset tasks
    totalTasksCompleted = 0;
    totalTasksRequired = playerIds.length * tasks.length; // Max tasks
    bodies = [];
    gameState = 'PLAYING';
    
    broadcast({ type: 'UPDATE_STATE', players, gameState, tasks, totalTasksCompleted, bodies });
    startGameClient({ players, tasks });
};

function startGameClient(data) {
    myRole = players[myId].role;
    myColor = players[myId].color;
    
    $('role-title').innerText = myRole === 'IMPOSTOR' ? 'أنت المخرب 🔪' : 'أنت ضمن الطاقم 👨‍🚀';
    $('role-title').className = myRole === 'IMPOSTOR' ? 'danger' : '';
    $('role-subtitle').innerText = myRole === 'IMPOSTOR' ? 'اقتل الطاقم ولا تدعهم يكتشفوك' : 'أنجز المهام وابحث عن المخرب';
    
    showScreen('role-screen');
    
    if (window.parent) window.parent.postMessage({ type: 'ARCADE_GAME_START', gameId: 'space-deception' }, '*');
    
    setTimeout(() => {
        showScreen('game-screen');
        requestAnimationFrame(gameLoopClient);
    }, 3000);
    
    if (isHost) {
        setInterval(hostGameLoop, 50); // 20 tick rate
    }
}

// --- HOST GAME LOOP ---
function hostGameLoop() {
    if (gameState !== 'PLAYING' && gameState !== 'MEETING') return;
    broadcast({ type: 'UPDATE_STATE', players, gameState, meetingData, totalTasksCompleted, bodies });
}

function checkWinCondition() {
    let aliveCrew = 0;
    let aliveImpostors = 0;
    
    Object.values(players).forEach(p => {
        if (!p.isDead) {
            if (p.role === 'IMPOSTOR') aliveImpostors++;
            else aliveCrew++;
        }
    });
    
    if (aliveImpostors === 0) {
        endGame('CREW');
    } else if (aliveImpostors >= aliveCrew) {
        endGame('IMPOSTOR');
    } else if (totalTasksCompleted >= totalTasksRequired) {
        endGame('CREW');
    }
}

function endGame(winner) {
    gameState = 'ENDED';
    broadcast({ type: 'UPDATE_STATE', gameState, winner, players });
    endGameClient(winner);
}

function endGameClient(winner) {
    showScreen('game-over-screen');
    if (winner === 'CREW') {
        $('result-title').innerText = 'فاز الطاقم! 🏆';
        $('result-title').style.color = '#10b981';
    } else {
        $('result-title').innerText = 'فاز المخربون! 🔪';
        $('result-title').style.color = '#ef4444';
    }
    
    if (isHost) {
        $('restart-btn').classList.remove('hidden');
    } else {
        $('game-over-waiting').classList.remove('hidden');
    }
    
    if (window.parent) window.parent.postMessage({ type: 'ARCADE_GAME_OVER', winner: winner, gameId: 'space-deception' }, '*');
}

$('restart-btn').onclick = () => {
    if (!isHost) return;
    gameState = 'LOBBY';
    broadcast({ type: 'UPDATE_STATE', gameState, players });
    showScreen('start-screen');
};

// --- CLIENT GAME LOOP (INPUT & RENDERING) ---
let targetClickPos = null;

canvas.addEventListener('mousedown', handlePointerStart);
canvas.addEventListener('touchstart', handlePointerStart, { passive: false });

function handlePointerStart(e) {
    if (e.cancelable) e.preventDefault();
    window.focus();
    if (gameState !== 'PLAYING') return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    // Convert screen coordinates to world coordinates
    const worldX = clientX - rect.left + camera.x;
    const worldY = clientY - rect.top + camera.y;
    targetClickPos = { x: worldX, y: worldY };
}

window.addEventListener('keydown', e => {
    window.focus();
    if (gameState !== 'PLAYING') return;
    targetClickPos = null;
    const k = (e.key || '').toLowerCase();
    if (k === 'w' || k === 'arrowup' || k === 'ص') keys.w = true;
    if (k === 'a' || k === 'arrowleft' || k === 'ش') keys.a = true;
    if (k === 's' || k === 'arrowdown' || k === 'س') keys.s = true;
    if (k === 'd' || k === 'arrowright' || k === 'ي') keys.d = true;
    if (k === 'e' || k === 'ث') $('action-use').click();
    if (k === 'q' || k === 'ض') $('action-kill').click();
    if (k === 'r' || k === 'ق') $('action-report').click();
});

window.addEventListener('keyup', e => {
    const k = (e.key || '').toLowerCase();
    if (k === 'w' || k === 'arrowup' || k === 'ص') keys.w = false;
    if (k === 'a' || k === 'arrowleft' || k === 'ش') keys.a = false;
    if (k === 's' || k === 'arrowdown' || k === 'س') keys.s = false;
    if (k === 'd' || k === 'arrowright' || k === 'ي') keys.d = false;
});

// Also listen to postMessage from parent iframe (arcade-arena)
window.addEventListener('message', e => {
    if (e.data) {
        const k = (e.data.key || e.data.code || '').toLowerCase();
        const isDown = e.data.type === 'keydown' || e.data.isDown === true;
        if (k === 'w' || k === 'arrowup' || k === 'ص') keys.w = isDown;
        if (k === 'a' || k === 'arrowleft' || k === 'ش') keys.a = isDown;
        if (k === 's' || k === 'arrowdown' || k === 'س') keys.s = isDown;
        if (k === 'd' || k === 'arrowright' || k === 'ي') keys.d = isDown;
    }
});

function isInsideMap(px, py, radius) {
    if (gameState === 'LOBBY') {
        // Dropship Spaceship Interior Bounds (Full Walkable Deck Area)
        return (px >= 380 && px <= 820 && py >= 40 && py <= 450);
    }
    let points = [
        {x: px - radius + 2, y: py},
        {x: px + radius - 2, y: py},
        {x: px, y: py - radius + 2},
        {x: px, y: py + radius - 2}
    ];
    for (let p of points) {
        let inside = false;
        for (let r of rooms) if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) { inside = true; break; }
        if (!inside) for (let c of corridors) if (p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h) { inside = true; break; }
        if (!inside) return false;
    }
    return true;
}

function gameLoopClient() {
    if (gameState !== 'PLAYING' && gameState !== 'LOBBY') return;
    
    let me = players[myId];
    if (!me) return;
    
    // Movement
    if (!me.isDead) {
        let newX = me.x;
        let newY = me.y;
        
        if (keys.w) newY -= SPEED;
        if (keys.s) newY += SPEED;
        if (keys.a) newX -= SPEED;
        if (keys.d) newX += SPEED;
        
        // Touch or Click Destination Movement
        if (targetClickPos && !keys.w && !keys.a && !keys.s && !keys.d) {
            const dx = targetClickPos.x - me.x;
            const dy = targetClickPos.y - me.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 6) {
                newX += (dx / dist) * SPEED;
                newY += (dy / dist) * SPEED;
            } else {
                targetClickPos = null;
            }
        }
        
        let moved = false;
        // Check X and Y independently to allow sliding against walls
        if (newX !== me.x && isInsideMap(newX, me.y, 16)) { me.x = newX; moved = true; }
        if (newY !== me.y && isInsideMap(me.x, newY, 16)) { me.y = newY; moved = true; }
        
        if (moved) {
            if (!isHost && conn) {
                conn.send({ type: 'MOVE', x: me.x, y: me.y });
            } else if (isHost) {
                broadcast({ type: 'UPDATE_STATE', players, gameState });
            }
        }
    }
    
    // Camera follow
    camera.x = me.x - canvas.width / 2;
    camera.y = me.y - canvas.height / 2;
    
    if (gameState === 'PLAYING') {
        checkInteractables();
        const hudLeft = document.querySelector('.hud-top-left');
        const hudRight = document.querySelector('.hud-top-right');
        const actionBtns = document.querySelector('.action-buttons');
        const dropshipHud = $('dropship-hud');
        if (hudLeft) hudLeft.classList.remove('hidden');
        if (hudRight) hudRight.classList.remove('hidden');
        if (actionBtns) actionBtns.classList.remove('hidden');
        if (dropshipHud) dropshipHud.classList.add('hidden');
    } else {
        const hudLeft = document.querySelector('.hud-top-left');
        const hudRight = document.querySelector('.hud-top-right');
        const actionBtns = document.querySelector('.action-buttons');
        const dropshipHud = $('dropship-hud');
        if (hudLeft) hudLeft.classList.add('hidden');
        if (hudRight) hudRight.classList.add('hidden');
        if (actionBtns) actionBtns.classList.add('hidden');
        if (dropshipHud) dropshipHud.classList.remove('hidden');
    }

    drawMap();
    
    // Update HUD
    let pct = totalTasksRequired > 0 ? (totalTasksCompleted / totalTasksRequired) * 100 : 0;
    $('task-progress').innerText = Math.floor(pct) + '%';
    $('task-bar-fill').style.width = pct + '%';
    $('my-role-display').innerText = myRole === 'IMPOSTOR' ? 'مخرب' : 'طاقم';
    $('my-role-display').style.color = myRole === 'IMPOSTOR' ? '#ef4444' : '#38bdf8';
    
    requestAnimationFrame(gameLoopClient);
}

// --- INTERACTIONS ---
let targetTask = null;
let targetPlayer = null;
let targetBody = null;

function checkInteractables() {
    let me = players[myId];
    if (!me || me.isDead) {
        $('action-use').disabled = true;
        $('action-kill').disabled = true;
        $('action-report').disabled = true;
        return;
    }
    
    // Tasks
    targetTask = null;
    if (me.role === 'CREWMATE') {
        for (let t of tasks) {
            if (!t.doneBy.includes(myId) && Math.hypot(me.x - t.x, me.y - t.y) < 60) {
                targetTask = t;
                break;
            }
        }
    }
    $('action-use').disabled = !targetTask;
    
    // Kill
    if (me.role === 'IMPOSTOR') {
        $('action-kill').classList.remove('hidden');
        $('action-sabotage').classList.remove('hidden');
        
        targetPlayer = null;
        for (let id in players) {
            if (id !== myId && !players[id].isDead && Math.hypot(me.x - players[id].x, me.y - players[id].y) < 80) {
                targetPlayer = players[id];
                break;
            }
        }
        $('action-kill').disabled = !targetPlayer;
    }
    
    // Report
    targetBody = null;
    for (let b of bodies) {
        if (Math.hypot(me.x - b.x, me.y - b.y) < 80) {
            targetBody = b;
            break;
        }
    }
    $('action-report').disabled = !targetBody;
}

$('action-use').onclick = () => {
    if (targetTask && !$('action-use').disabled) {
        // Send task complete
        if (isHost) {
            targetTask.doneBy.push(myId);
            totalTasksCompleted++;
            checkWinCondition();
        } else {
            conn.send({ type: 'TASK', taskId: targetTask.id });
        }
        targetTask = null;
    }
};

$('action-kill').onclick = () => {
    if (targetPlayer && !$('action-kill').disabled) {
        if (isHost) {
            players[targetPlayer.id].isDead = true;
            bodies.push({ x: targetPlayer.x, y: targetPlayer.y, color: targetPlayer.color });
            checkWinCondition();
        } else {
            conn.send({ type: 'KILL', targetId: targetPlayer.id });
        }
    }
};

$('action-report').onclick = () => {
    if (targetBody && !$('action-report').disabled) {
        if (isHost) {
            startMeeting(players[myId].name);
        } else {
            conn.send({ type: 'REPORT' });
        }
    }
};

// --- ANIMATED DEEP SPACE STARFIELD ---
const STAR_COUNT = 180;
const spaceStars = [];
for (let i = 0; i < STAR_COUNT; i++) {
    spaceStars.push({
        x: Math.random() * 3200 - 1000,
        y: Math.random() * 2400 - 800,
        speed: 0.5 + Math.random() * 2.0,
        size: Math.random() < 0.2 ? 3.5 : Math.random() < 0.5 ? 2.5 : 1.5,
        color: Math.random() < 0.15 ? '#38bdf8' : Math.random() < 0.15 ? '#a855f7' : '#ffffff',
        alpha: 0.4 + Math.random() * 0.6
    });
}

function updateAndDrawSpaceStars(ctx) {
    // Deep Cosmic Dark Space Void
    ctx.fillStyle = '#010309';
    ctx.fillRect(-2000, -2000, 5000, 5000);

    // Glowing Purple & Cyan Space Nebulae
    const time = Date.now() * 0.002;
    const neb1 = ctx.createRadialGradient(400, 200, 50, 400, 200, 900);
    neb1.addColorStop(0, 'rgba(168, 85, 247, 0.22)');
    neb1.addColorStop(0.5, 'rgba(56, 189, 248, 0.14)');
    neb1.addColorStop(1, 'transparent');
    ctx.fillStyle = neb1;
    ctx.fillRect(-2000, -2000, 5000, 5000);

    const neb2 = ctx.createRadialGradient(800, 350, 50, 800, 350, 800);
    neb2.addColorStop(0, 'rgba(239, 68, 68, 0.18)');
    neb2.addColorStop(0.6, 'rgba(79, 70, 229, 0.1)');
    neb2.addColorStop(1, 'transparent');
    ctx.fillStyle = neb2;
    ctx.fillRect(-2000, -2000, 5000, 5000);

    // Animated Moving Parallax Stars
    for (let s of spaceStars) {
        s.y += s.speed;
        if (s.y > 1600) s.y = -800; // Loop seamlessly

        const pulseAlpha = s.alpha + Math.sin(time * 3 + s.x) * 0.25;
        ctx.globalAlpha = Math.max(0.2, Math.min(1, pulseAlpha));
        ctx.fillStyle = s.color;
        ctx.fillRect(s.x, s.y, s.size, s.size);
    }
    ctx.globalAlpha = 1.0;
}

// --- RENDERING ---
function drawMap() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    if (gameState === 'LOBBY') {
        const time = Date.now() * 0.005;
        const nebGrad1 = ctx.createRadialGradient(300, 100, 50, 300, 100, 800);
        nebGrad1.addColorStop(0, 'rgba(168, 85, 247, 0.25)');
        nebGrad1.addColorStop(0.5, 'rgba(56, 189, 248, 0.15)');
        nebGrad1.addColorStop(1, 'transparent');
        ctx.fillStyle = nebGrad1;
        ctx.fillRect(-2000, -2000, 5000, 5000);

        const nebGrad2 = ctx.createRadialGradient(900, 400, 50, 900, 400, 900);
        nebGrad2.addColorStop(0, 'rgba(239, 68, 68, 0.2)');
        nebGrad2.addColorStop(0.6, 'rgba(79, 70, 229, 0.12)');
        nebGrad2.addColorStop(1, 'transparent');
        ctx.fillStyle = nebGrad2;
        ctx.fillRect(-2000, -2000, 5000, 5000);

        // 150 Twinkling Multicolored Stars in Deep Space
        for (let i = 0; i < 150; i++) {
            const sx = ((i * 197) % 3200) - 1000;
            const sy = ((i * 313) % 2200) - 800;
            const starBrightness = 0.5 + Math.sin(time + i) * 0.5;
            const size = (i % 5 === 0) ? 3.5 : (i % 3 === 0) ? 2.5 : 1.5;
            ctx.fillStyle = i % 7 === 0 ? `rgba(168, 85, 247, ${starBrightness})` : i % 4 === 0 ? `rgba(56, 189, 248, ${starBrightness})` : `rgba(255, 255, 255, ${starBrightness})`;
            ctx.fillRect(sx, sy, size, size);
        }

        // 2. REALISTIC SCI-FI FANTASY STARSHIP (Centered at cx: 600, cy: 250)
        const cx = 600;
        const cy = 250;
        const flamePulse = 18 + Math.sin(time * 3) * 8;

        // Quadruple Plasma Thruster Engine Flames (Glowing Blue & Violet Exhausts)
        ctx.shadowBlur = flamePulse + 16;

        // Left Outer Engine Jet Flame
        const flame1 = ctx.createLinearGradient(cx - 210, cy + 220, cx - 210, cy + 220 + flamePulse * 2.2);
        flame1.addColorStop(0, '#38bdf8');
        flame1.addColorStop(0.4, '#a855f7');
        flame1.addColorStop(1, 'transparent');
        ctx.fillStyle = flame1;
        ctx.shadowColor = '#38bdf8';
        ctx.beginPath();
        ctx.ellipse(cx - 210, cy + 220 + flamePulse * 1.1, 20, flamePulse * 1.1, 0, 0, Math.PI * 2);
        ctx.fill();

        // Left Inner Engine Jet Flame
        const flame2 = ctx.createLinearGradient(cx - 110, cy + 240, cx - 110, cy + 240 + flamePulse * 2.8);
        flame2.addColorStop(0, '#60a5fa');
        flame2.addColorStop(0.5, '#ec4899');
        flame2.addColorStop(1, 'transparent');
        ctx.fillStyle = flame2;
        ctx.shadowColor = '#ec4899';
        ctx.beginPath();
        ctx.ellipse(cx - 110, cy + 240 + flamePulse * 1.4, 24, flamePulse * 1.4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Right Inner Engine Jet Flame
        ctx.fillStyle = flame2;
        ctx.beginPath();
        ctx.ellipse(cx + 110, cy + 240 + flamePulse * 1.4, 24, flamePulse * 1.4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Right Outer Engine Jet Flame
        ctx.fillStyle = flame1;
        ctx.shadowColor = '#38bdf8';
        ctx.beginPath();
        ctx.ellipse(cx + 210, cy + 220 + flamePulse, 20, flamePulse * 1.1, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Realistic Heavy Armor Wings with Metallic Bevels & Red LED Warning Lights
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = 'rgba(56, 189, 248, 0.7)';
        ctx.shadowBlur = 15;

        // Left Wing
        ctx.beginPath();
        ctx.moveTo(cx - 220, cy - 80);
        ctx.lineTo(cx - 330, cy + 100);
        ctx.lineTo(cx - 290, cy + 220);
        ctx.lineTo(cx - 195, cy + 180);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Right Wing
        ctx.beginPath();
        ctx.moveTo(cx + 220, cy - 80);
        ctx.lineTo(cx + 330, cy + 100);
        ctx.lineTo(cx + 290, cy + 220);
        ctx.lineTo(cx + 195, cy + 180);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Realistic Main Spaceship Hull Body
        const hullGrad = ctx.createLinearGradient(cx - 230, cy - 250, cx + 230, cy + 250);
        hullGrad.addColorStop(0, '#1e293b'); // Dark Steel Top Highlight
        hullGrad.addColorStop(0.4, '#0f172a'); // Heavy Obsidian Armor
        hullGrad.addColorStop(1, '#020617');   // Deep Space Base Body

        ctx.fillStyle = hullGrad;
        ctx.strokeStyle = '#38bdf8'; // Glowing Cyan Wall Border
        ctx.lineWidth = 5;
        ctx.shadowColor = 'rgba(56, 189, 248, 0.7)';
        ctx.shadowBlur = 22;

        ctx.beginPath();
        ctx.moveTo(cx - 140, cy - 250); // Nose Top Left
        ctx.lineTo(cx + 140, cy - 250); // Nose Top Right
        ctx.lineTo(cx + 240, cy - 100); // Right Shoulder
        ctx.lineTo(cx + 240, cy + 170); // Right Base
        ctx.lineTo(cx + 160, cy + 240); // Engine Right
        ctx.lineTo(cx - 160, cy + 240); // Engine Left
        ctx.lineTo(cx - 240, cy + 170); // Left Base
        ctx.lineTo(cx - 240, cy - 100); // Left Shoulder
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Pulsing Red Alarm LED Strips on Hull (Matching bg.png)
        const ledGlow = 8 + Math.sin(time * 4) * 6;
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = ledGlow;

        // Left Red Strip
        ctx.beginPath();
        ctx.moveTo(cx - 225, cy - 80);
        ctx.lineTo(cx - 225, cy + 150);
        ctx.stroke();

        // Right Red Strip
        ctx.beginPath();
        ctx.moveTo(cx + 225, cy - 80);
        ctx.lineTo(cx + 225, cy + 150);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Walkable Steel Diamond Plate Deck Floor
        const deckGrad = ctx.createLinearGradient(cx - 195, cy - 185, cx + 195, cy + 185);
        deckGrad.addColorStop(0, '#0f172a');
        deckGrad.addColorStop(0.5, '#1e293b');
        deckGrad.addColorStop(1, '#090d16');

        ctx.fillStyle = deckGrad;
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(cx - 195, cy - 185, 390, 390, 24);
        ctx.fill();
        ctx.stroke();

        // High-Tech Blue LED Floor Grid & Laser Runway Line
        ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
        ctx.fillRect(cx - 60, cy - 185, 120, 390);

        ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.lineWidth = 1.5;
        for (let gx = cx - 175; gx <= cx + 175; gx += 40) {
            ctx.beginPath();
            ctx.moveTo(gx, cy - 180);
            ctx.lineTo(gx, cy + 200);
            ctx.stroke();
        }
        for (let gy = cy - 180; gy <= cy + 200; gy += 40) {
            ctx.beginPath();
            ctx.moveTo(cx - 190, gy);
            ctx.lineTo(cx + 190, gy);
            ctx.stroke();
        }

        // Realistic Panoramic Glass Skylight Dome (Top Roof Viewport Window)
        const windowGrad = ctx.createRadialGradient(cx, cy - 210, 10, cx, cy - 210, 110);
        windowGrad.addColorStop(0, 'rgba(224, 242, 254, 0.5)');
        windowGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.25)');
        windowGrad.addColorStop(1, 'rgba(15, 23, 42, 0.85)');

        ctx.fillStyle = windowGrad;
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.ellipse(cx, cy - 210, 115, 32, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        // 3D Spinning Holographic Customization Computer Console (Center Station)
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 18;
        ctx.fillRect(cx - 30, cy - 75, 60, 30);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#020617';
        ctx.fillRect(cx - 25, cy - 71, 50, 22);

        // 3D Hologram Projection Globe
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy - 60, 22, 9, time * 3, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.font = '900 12px Tajawal, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('💻 تخصيص', cx, cy - 55);

        // 3. Draw 3D Astronaut Players Walking Inside the Realistic Starship Floor
        Object.values(players).forEach(p => {
            drawAstronaut(ctx, p.x, p.y, p.color, false, p.name, false, p.role);
        });

        ctx.restore();
        return;
    }
    
    // Draw Floor Base (Space)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
    
    // Draw Walls (Rendered slightly larger behind rooms/corridors)
    const wallThickness = 12;
    ctx.fillStyle = '#38bdf8'; // Glowing blue walls
    rooms.forEach(r => ctx.fillRect(r.x - wallThickness, r.y - wallThickness, r.w + wallThickness*2, r.h + wallThickness*2));
    corridors.forEach(c => ctx.fillRect(c.x - wallThickness, c.y - wallThickness, c.w + wallThickness*2, c.h + wallThickness*2));
    
    // Draw Rooms (Floors)
    rooms.forEach(r => {
        ctx.fillStyle = r.color;
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.font = 'bold 30px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(r.name, r.x + r.w/2, r.y + r.h/2);
    });
    
    // Draw Corridors (Floors)
    corridors.forEach(c => {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(c.x, c.y, c.w, c.h);
    });
    
    // Draw Tasks
    tasks.forEach(t => {
        let isDone = t.doneBy.includes(myId);
        ctx.fillStyle = isDone ? '#10b981' : '#facc15';
        ctx.beginPath();
        ctx.arc(t.x, t.y, 15, 0, Math.PI*2);
        ctx.fill();
        if (targetTask === t) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.stroke();
        }
    });
    
    // Draw Bodies
    bodies.forEach(b => {
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y + 10, 20, Math.PI, 0); // Half circle body (lying down)
        ctx.fill();
        // Bone
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(b.x, b.y - 5, 8, 0, Math.PI*2);
        ctx.fill();
    });
    
    // Draw Players (3D Stylized Astronauts matching Start Screen)
    let me = players[myId];
    
    Object.values(players).forEach(p => {
        if (p.isDead && (!me.isDead)) return;
        const isTargeted = targetPlayer && targetPlayer.id === p.id;
        drawAstronaut(ctx, p.x, p.y, p.color, p.isDead, p.name, isTargeted, p.role);
    });
    
    ctx.restore();
    
    // Vision Fog (Simple Circle)
    if (!me.isDead) {
        const cx = canvas.width/2;
        const cy = canvas.height/2;
        const visionRadius = myRole === 'IMPOSTOR' ? 400 : 250;
        
        ctx.globalCompositeOperation = 'destination-in';
        let grad = ctx.createRadialGradient(cx, cy, visionRadius*0.5, cx, cy, visionRadius);
        grad.addColorStop(0, 'rgba(0,0,0,1)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, visionRadius, 0, Math.PI*2);
        ctx.fill();
        
        ctx.globalCompositeOperation = 'source-over';
    }
}

// --- MEETING LOGIC ---
let meetingInterval = null;

function startMeeting(callerName) {
    gameState = 'MEETING';
    meetingData = { caller: callerName, timer: 60, votes: {}, chat: [] };
    
    // Teleport alive players to Cafeteria
    Object.values(players).forEach(p => {
        if (!p.isDead) {
            p.x = 600 + Math.random()*50;
            p.y = 200 + Math.random()*50;
        }
    });
    
    broadcast({ type: 'UPDATE_STATE', gameState, players, meetingData });
    startMeetingClient(meetingData);
    
    if (isHost) {
        if (meetingInterval) clearInterval(meetingInterval);
        meetingInterval = setInterval(() => {
            meetingData.timer--;
            broadcast({ type: 'UPDATE_STATE', meetingData, gameState, players });
            if (meetingData.timer <= 0) checkMeetingEnd();
        }, 1000);
    }
}

function startMeetingClient(data) {
    showScreen('meeting-screen');
    $('chat-messages').innerHTML = `<div class="chat-msg" style="color:var(--danger); text-align:center;">تم طلب اجتماع طارئ بواسطة: ${data.caller}</div>`;
    renderMeetingUI();
}

function renderMeetingUI() {
    if (gameState !== 'MEETING') return;
    
    $('meeting-timer').innerText = meetingData.timer;
    
    // Render Players
    const grid = $('voting-players-grid');
    grid.innerHTML = '';
    
    Object.values(players).forEach(p => {
        const card = document.createElement('div');
        card.className = `player-vote-card ${p.isDead ? 'dead' : ''}`;
        
        // Count votes for this player
        let votesForMe = Object.values(meetingData.votes).filter(v => v === p.id).length;
        let dotsHTML = '<div class="vote-count">' + '<div class="vote-dot"></div>'.repeat(votesForMe) + '</div>';
        
        card.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px;">
                <div class="p-color" style="background:${p.color}"></div>
                <span>${p.name}</span>
            </div>
            ${dotsHTML}
        `;
        
        if (!p.isDead && !players[myId].isDead) {
            card.onclick = () => castVote(p.id);
        }
        
        if (meetingData.votes[myId] === p.id) {
            card.classList.add('selected');
        }
        
        grid.appendChild(card);
    });
    
    // Update skip vote button
    let skipVotes = Object.values(meetingData.votes).filter(v => v === 'skip').length;
    $('skip-vote-btn').innerText = `تخطي التصويت (${skipVotes})`;
    if (meetingData.votes[myId] === 'skip') {
        $('skip-vote-btn').style.borderColor = 'var(--primary)';
        $('skip-vote-btn').style.borderWidth = '2px';
        $('skip-vote-btn').style.borderStyle = 'solid';
    }
    
    // Render Chat (only append new to avoid scroll reset, but for simplicity re-render is okay if array is small)
    // To prevent input loss, only update chat
    const chatContainer = $('chat-messages');
    while (chatContainer.children.length - 1 < meetingData.chat.length) {
        let msg = meetingData.chat[chatContainer.children.length - 1];
        if(!msg) break;
        let el = document.createElement('div');
        el.className = 'chat-msg';
        el.innerHTML = `<span>${msg.sender}:</span> ${msg.text}`;
        chatContainer.appendChild(el);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
}

// Ensure the UI updates when new data comes in
setInterval(() => {
    if (gameState === 'MEETING') renderMeetingUI();
}, 500);

$('skip-vote-btn').onclick = () => {
    if (!players[myId].isDead) castVote('skip');
};

function castVote(targetId) {
    if (meetingData.votes[myId]) return; // Already voted
    
    if (isHost) {
        meetingData.votes[myId] = targetId;
        checkMeetingEnd();
    } else {
        conn.send({ type: 'VOTE', voteTarget: targetId });
        meetingData.votes[myId] = targetId; // Local optimistic update
    }
}

function checkMeetingEnd() {
    if (!isHost) return;
    
    let aliveCount = Object.values(players).filter(p => !p.isDead).length;
    let totalVotes = Object.keys(meetingData.votes).length;
    
    if (totalVotes >= aliveCount || meetingData.timer <= 0) {
        clearInterval(meetingInterval);
        
        // Tally votes
        let counts = { 'skip': 0 };
        Object.values(meetingData.votes).forEach(v => {
            counts[v] = (counts[v] || 0) + 1;
        });
        
        let highestId = null;
        let highestVotes = 0;
        let tie = false;
        
        for (let id in counts) {
            if (counts[id] > highestVotes) {
                highestVotes = counts[id];
                highestId = id;
                tie = false;
            } else if (counts[id] === highestVotes) {
                tie = true;
            }
        }
        
        if (highestId && highestId !== 'skip' && !tie) {
            // Eject player
            players[highestId].isDead = true;
        }
        
        // Clean bodies after meeting
        bodies = [];
        
        // Reset state back to playing
        gameState = 'PLAYING';
        broadcast({ type: 'UPDATE_STATE', gameState, players, bodies });
        
        setTimeout(() => {
            checkWinCondition(); // Check if ejected player was the last impostor
        }, 500);
    }
}

function endMeetingClient() {
    showScreen('game-screen');
    requestAnimationFrame(gameLoopClient); // Resume loop
}

$('chat-send-btn').onclick = () => {
    let text = $('chat-input').value.trim();
    if (!text) return;
    
    if (isHost) {
        meetingData.chat.push({ sender: players[myId].name, text });
    } else {
        conn.send({ type: 'CHAT', text });
    }
    $('chat-input').value = '';
};
$('chat-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') $('chat-send-btn').click();
});

// --- ADVANCED 3D ASTRONAUT RENDERER (Matching Start Screen Wallpaper) ---
function drawAstronaut(ctx, x, y, color, isDead, name, isTargeted, role) {
    ctx.save();
    ctx.translate(x, y);

    if (isDead) {
        ctx.globalAlpha = 0.5;
    }

    // Shadow underneath astronaut
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 22, 18, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Targeted outline glow (if impostor target)
    if (isTargeted) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.roundRect(-24, -32, 48, 58, 20);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    // Backpack (Oxygen Tank) - Back layer with shadow
    ctx.fillStyle = adjustColor(color, -30);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-22, -14, 10, 28, 6);
    ctx.fill();
    ctx.stroke();

    // Legs / Boots
    ctx.fillStyle = adjustColor(color, -15);
    // Left Leg
    ctx.beginPath();
    ctx.roundRect(-14, 8, 11, 16, 5);
    ctx.fill();
    ctx.stroke();
    // Right Leg
    ctx.beginPath();
    ctx.roundRect(3, 8, 11, 16, 5);
    ctx.fill();
    ctx.stroke();

    // Body (Main Suit Capsule) with 3D Gradient Shading
    const bodyGrad = ctx.createLinearGradient(-15, -25, 15, 20);
    bodyGrad.addColorStop(0, adjustColor(color, 25)); // Top highlight
    bodyGrad.addColorStop(0.6, color);                 // Base color
    bodyGrad.addColorStop(1, adjustColor(color, -35)); // Bottom shadow

    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-16, -26, 32, 42, 16);
    ctx.fill();
    ctx.stroke();

    // Visor (Shiny Glass Helmet) with Cyan/Sky Gradient
    const visorGrad = ctx.createLinearGradient(-2, -18, 18, -2);
    visorGrad.addColorStop(0, '#e0f2fe');  // White glass reflection
    visorGrad.addColorStop(0.3, '#38bdf8'); // Cyan glow
    visorGrad.addColorStop(1, '#0284c7');   // Deep cyan shadow

    ctx.fillStyle = visorGrad;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-4, -18, 22, 16, 8);
    ctx.fill();
    ctx.stroke();

    // Visor Glare Arc
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.ellipse(3, -13, 6, 3, -Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();

    // Impostor Badge for Teammates
    if (role === 'IMPOSTOR' && (myRole === 'IMPOSTOR' || isDead)) {
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 12px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('😈', 0, -32);
    }

    // Player Name Tag
    if (name) {
        ctx.font = '900 13px Tajawal, system-ui, sans-serif';
        ctx.textAlign = 'center';

        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeText(name, 0, -35);

        ctx.fillStyle = '#ffffff';
        ctx.fillText(name, 0, -35);
    }

    ctx.restore();
}

function adjustColor(hex, percent) {
    let num = parseInt(hex.replace('#', ''), 16);
    if (isNaN(num)) return hex;
    let r = (num >> 16) + Math.round(255 * (percent / 100));
    let g = ((num >> 8) & 0x00FF) + Math.round(255 * (percent / 100));
    let b = (num & 0x0000FF) + Math.round(255 * (percent / 100));
    r = Math.min(255, Math.max(0, r));
    g = Math.min(255, Math.max(0, g));
    b = Math.min(255, Math.max(0, b));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
