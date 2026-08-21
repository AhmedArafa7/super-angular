const $ = id => document.getElementById(id);
const showScreen = id => {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = $(id);
    if (target) target.classList.add('active');
};

// --- NETWORKING (PEER JS) ---
let peer = null;
let conn = null; // Client connection to host
let isHost = false;
let hostConns = {}; // Host connections to clients

let myId = 'local_player_' + Math.floor(Math.random() * 10000);
let myName = 'كابتن أحمد';
let roomId = '';

// --- GAME STATE ---
let gameState = 'LOBBY'; // LOBBY, PLAYING, MEETING, ENDED
let players = {}; // id -> { id, name, color, x, y, role, isDead, isHost, isBot, walkAnim }
let bodies = []; // { x, y, color }
let tasks = []; // Map tasks
let totalTasksCompleted = 0;
let totalTasksRequired = 8;
let meetingData = { caller: '', timer: 60, votes: {}, chat: [] };
let myRole = 'CREWMATE'; // CREWMATE, IMPOSTOR

// Settings & Colors
const MAP_WIDTH = 1400;
const MAP_HEIGHT = 900;
const SPEED = 4.5;
const COLORS = ['#ef4444', '#0284c7', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6'];
let myColor = COLORS[0];

// Input keys state
let keys = { w: false, a: false, s: false, d: false };
let targetClickPos = null;

// Canvas & Camera
const canvas = $('game-canvas');
const ctx = canvas.getContext('2d');
let camera = { x: 0, y: 0 };

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// --- MAP & ROOMS DEFINITIONS ---
const rooms = [
    { name: 'غرفة القيادة والاجتماعات (Cafeteria)', x: 450, y: 120, w: 500, h: 320, color: '#1e293b', icon: '☕' },
    { name: 'غرفة المحركات البلازمية (Engines)', x: 60, y: 440, w: 340, h: 340, color: '#0f172a', icon: '⚡' },
    { name: 'المختبر البيولوجي (MedBay & Lab)', x: 1000, y: 440, w: 340, h: 340, color: '#0f172a', icon: '🧪' },
    { name: 'مركز الملاحة والأسلحة (Nav & Weapons)', x: 520, y: 560, w: 360, h: 260, color: '#1e293b', icon: '🎯' }
];

const corridors = [
    { x: 220, y: 280, w: 230, h: 180 }, // Cafe to Engines
    { x: 950, y: 280, w: 230, h: 180 }, // Cafe to Lab
    { x: 630, y: 440, w: 140, h: 120 }  // Cafe to Nav
];

const vents = [
    { id: 'v1', x: 480, y: 150 },
    { id: 'v2', x: 350, y: 480 },
    { id: 'v3', x: 1050, y: 480 }
];

const taskLocations = [
    { id: 1, x: 560, y: 180, name: 'تفريغ القمامة الفضائية 🗑️', room: 'Cafeteria', doneBy: [] },
    { id: 2, x: 840, y: 180, name: 'تحميل البيانات المشفرة 💾', room: 'Cafeteria', doneBy: [] },
    { id: 3, x: 150, y: 680, name: 'معايرة طاقة المحرك ⚡', room: 'Engines', doneBy: [] },
    { id: 4, x: 280, y: 520, name: 'إعادة توصيل الأسلاك 🔌', room: 'Engines', doneBy: [] },
    { id: 5, x: 1240, y: 680, name: 'فحص العينات المجهرية 🔬', room: 'Lab', doneBy: [] },
    { id: 6, x: 1100, y: 520, name: 'المسح الحيوي الشامل 🧬', room: 'Lab', doneBy: [] },
    { id: 7, x: 600, y: 720, name: 'توجيه رادار الملاحة 📡', room: 'Nav', doneBy: [] },
    { id: 8, x: 800, y: 720, name: 'شحن طوربيدات الدفاع 🚀', room: 'Nav', doneBy: [] }
];

// --- INITIALIZATION ---
$('host-btn').onclick = () => {
    myName = $('player-name').value.trim() || 'كابتن أحمد';
    isHost = true;
    initPeer();
};

$('join-btn').onclick = () => {
    myName = $('player-name').value.trim() || 'مستكشف الفضاء';
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
            players[myId] = {
                id: myId,
                name: myName,
                color: myColor,
                x: 600,
                y: 250,
                role: 'CREWMATE',
                isDead: false,
                isHost: true,
                isBot: false,
                walkAnim: 0
            };
            gameState = 'LOBBY';
            showScreen('game-screen');
            updateLobbyUI();
            requestAnimationFrame(gameLoopClient);
        } else {
            conn = peer.connect(roomId);
            setupClientConnection(conn);
        }
    });

    peer.on('error', err => {
        console.log('Peer fallback: Local solo play active', err);
        // Fallback local host
        if (!players[myId]) {
            players[myId] = {
                id: myId,
                name: myName,
                color: myColor,
                x: 600,
                y: 250,
                role: 'CREWMATE',
                isDead: false,
                isHost: true,
                isBot: false,
                walkAnim: 0
            };
            isHost = true;
            gameState = 'LOBBY';
            showScreen('game-screen');
            updateLobbyUI();
            requestAnimationFrame(gameLoopClient);
        }
    });

    if (isHost) {
        peer.on('connection', connection => {
            connection.on('open', () => {
                const newPlayerColor = COLORS[Object.keys(players).length % COLORS.length];
                players[connection.peer] = {
                    id: connection.peer,
                    name: 'ضيف فضائي',
                    color: newPlayerColor,
                    x: 600 + Math.random() * 40 - 20,
                    y: 250 + Math.random() * 40 - 20,
                    role: 'CREWMATE',
                    isDead: false,
                    isHost: false,
                    isBot: false,
                    walkAnim: 0
                };
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

// Auto join or host from URL parameter or direct launch
window.onload = () => {
    initColorPicker();
    setupTouchAndDpadControls();
    
    const params = new URLSearchParams(window.location.search);
    if (params.has('room')) {
        $('join-id').value = params.get('room');
    }
    
    // Auto-host immediately for instant play
    setTimeout(() => {
        if (!peer && gameState === 'LOBBY') {
            myName = 'كابتن أحمد';
            isHost = true;
            initPeer();
        }
    }, 500);
};

// --- NETWORKING LOGIC ---
function setupClientConnection(connection) {
    connection.on('open', () => {
        connection.send({ type: 'JOIN', name: myName, color: myColor });
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
            if (players[peerId]) {
                players[peerId].name = data.name;
                if (data.color) players[peerId].color = data.color;
            }
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
            if (players[peerId] && !players[peerId].isDead) {
                players[peerId].x = data.x;
                players[peerId].y = data.y;
            }
        } else if (data.type === 'KILL') {
            if (players[peerId] && players[peerId].role === 'IMPOSTOR' && players[data.targetId] && !players[data.targetId].isDead) {
                players[data.targetId].isDead = true;
                bodies.push({ x: players[data.targetId].x, y: players[data.targetId].y, color: players[data.targetId].color });
                checkWinCondition();
            }
        } else if (data.type === 'REPORT') {
            startMeeting(players[peerId] ? players[peerId].name : 'أحد أفراد الطاقم');
        } else if (data.type === 'TASK') {
            if (players[peerId] && players[peerId].role === 'CREWMATE') {
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
            meetingData.chat.push({ sender: players[peerId] ? players[peerId].name : 'لاعب', text: data.text });
        }
    }
}

function broadcast(data) {
    Object.values(hostConns).forEach(c => {
        try { c.send(data); } catch (e) {}
    });
}

// --- COLOR PICKER & LOBBY UI ---
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
        setTimeout(() => $('copy-link-btn').innerText = '📋 نسخ الرابط', 2000);
    });
};

// Add Bots button
const botNames = ['روبوت أزرق 🤖', 'روبوت أخضر 🤖', 'روبوت أصفر 🤖', 'روبوت بنفسجي 🤖', 'روبوت برتقالي 🤖'];
$('add-bots-btn').onclick = () => {
    if (!isHost) return;
    const currentCount = Object.keys(players).length;
    if (currentCount >= 8) return alert('وصلت السفينة إلى الحد الأقصى للطاقم (8 لاعبين)');
    
    const botId = 'bot_' + Math.random().toString(36).substr(2, 5);
    const botColor = COLORS[currentCount % COLORS.length];
    const botName = botNames[(currentCount - 1) % botNames.length] || `روبوت ${currentCount}`;
    
    players[botId] = {
        id: botId,
        name: botName,
        color: botColor,
        x: 600 + (Math.random() - 0.5) * 120,
        y: 250 + (Math.random() - 0.5) * 80,
        role: 'CREWMATE',
        isDead: false,
        isHost: false,
        isBot: true,
        walkAnim: 0,
        targetTask: null
    };
    
    broadcast({ type: 'UPDATE_STATE', players, gameState });
    updateLobbyUI();
};

function updateLobbyUI() {
    if (gameState !== 'LOBBY') return;
    
    const dropshipHud = $('dropship-hud');
    if (dropshipHud) dropshipHud.classList.remove('hidden');
    
    $('dropship-room-code').innerText = roomId ? roomId.substring(0, 10) + '...' : 'محلي (Solo)';
    
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

    const dots = document.querySelectorAll('.color-dot');
    dots.forEach(d => {
        if (d.style.backgroundColor === myColor || (players[myId] && d.style.backgroundColor === players[myId].color)) {
            d.classList.add('active');
        } else {
            d.classList.remove('active');
        }
    });
}

// --- GAME START & ROLES ---
$('dropship-start-btn').onclick = () => {
    if (!isHost) return;
    
    // If playing solo with no other humans and no bots, auto add 3 smart bots
    const playerIds = Object.keys(players);
    if (playerIds.length === 1) {
        for (let i = 0; i < 3; i++) {
            const botId = 'bot_' + Math.random().toString(36).substr(2, 5);
            const botColor = COLORS[(i + 1) % COLORS.length];
            players[botId] = {
                id: botId,
                name: botNames[i],
                color: botColor,
                x: 600 + (Math.random() - 0.5) * 80,
                y: 250 + (Math.random() - 0.5) * 60,
                role: 'CREWMATE',
                isDead: false,
                isHost: false,
                isBot: true,
                walkAnim: 0
            };
        }
    }
    
    const allIds = Object.keys(players);
    
    // Pick 1 Impostor
    const impostorId = allIds[Math.floor(Math.random() * allIds.length)];
    allIds.forEach(id => {
        players[id].role = (id === impostorId) ? 'IMPOSTOR' : 'CREWMATE';
        players[id].isDead = false;
        // Place in Cafeteria at spawn
        players[id].x = 650 + (Math.random() - 0.5) * 120;
        players[id].y = 250 + (Math.random() - 0.5) * 100;
    });
    
    tasks = JSON.parse(JSON.stringify(taskLocations));
    totalTasksCompleted = 0;
    totalTasksRequired = allIds.length * 2;
    bodies = [];
    gameState = 'PLAYING';
    
    broadcast({ type: 'UPDATE_STATE', players, gameState, tasks, totalTasksCompleted, bodies });
    startGameClient({ players, tasks });
};

function startGameClient(data) {
    if (!players[myId]) return;
    myRole = players[myId].role;
    myColor = players[myId].color;
    
    $('role-title').innerText = myRole === 'IMPOSTOR' ? 'أنت المخرب الخائن 🔪' : 'أنت ضمن طاقم السفينة 👨‍🚀';
    $('role-title').className = myRole === 'IMPOSTOR' ? 'danger' : '';
    $('role-subtitle').innerText = myRole === 'IMPOSTOR' ? 'تسلل واغتال الطاقم أو قم بتخريب أنظمة السفينة دون كشف هويتك!' : 'أنجز مهام صيانة السفينة وابحث عن الخائن بينكم!';
    
    showScreen('role-screen');
    
    if (window.parent) window.parent.postMessage({ type: 'ARCADE_GAME_START', gameId: 'space-deception' }, '*');
    
    setTimeout(() => {
        showScreen('game-screen');
        requestAnimationFrame(gameLoopClient);
    }, 2800);
    
    if (isHost) {
        setInterval(hostGameLoop, 50);
        setInterval(updateAIBots, 250);
    }
}

// --- AI BOTS CONTROLLER ---
function updateAIBots() {
    if (gameState !== 'PLAYING') return;
    
    Object.values(players).forEach(p => {
        if (!p.isBot || p.isDead) return;
        
        // Impostor bot AI: stalk near player or kill if close
        if (p.role === 'IMPOSTOR') {
            const targets = Object.values(players).filter(other => other.id !== p.id && !other.isDead);
            if (targets.length > 0) {
                const target = targets[0];
                const dist = Math.hypot(target.x - p.x, target.y - p.y);
                if (dist > 50) {
                    p.x += ((target.x - p.x) / dist) * (SPEED * 0.8);
                    p.y += ((target.y - p.y) / dist) * (SPEED * 0.8);
                } else if (dist < 45 && Math.random() < 0.2) {
                    target.isDead = true;
                    bodies.push({ x: target.x, y: target.y, color: target.color });
                    checkWinCondition();
                }
            }
        } else {
            // Crewmate bot AI: wander towards tasks
            if (!p.targetTask || Math.random() < 0.05) {
                p.targetTask = tasks[Math.floor(Math.random() * tasks.length)];
            }
            if (p.targetTask) {
                const dist = Math.hypot(p.targetTask.x - p.x, p.targetTask.y - p.y);
                if (dist > 30) {
                    p.x += ((p.targetTask.x - p.x) / dist) * (SPEED * 0.7);
                    p.y += ((p.targetTask.y - p.y) / dist) * (SPEED * 0.7);
                } else {
                    if (!p.targetTask.doneBy.includes(p.id) && Math.random() < 0.1) {
                        p.targetTask.doneBy.push(p.id);
                        totalTasksCompleted++;
                        checkWinCondition();
                        p.targetTask = null;
                    }
                }
            }
        }
        
        // Report body if bot sees one
        bodies.forEach(b => {
            if (Math.hypot(p.x - b.x, p.y - b.y) < 70 && Math.random() < 0.2) {
                startMeeting(p.name);
            }
        });
    });
}

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
        $('result-subtitle').innerText = 'تم القضاء على الخائن أو إنجاز جميع مهام السفينة بنجاح!';
    } else {
        $('result-title').innerText = 'فاز المخرب الخائن! 🔪';
        $('result-title').style.color = '#ef4444';
        $('result-subtitle').innerText = 'تمت تصفية الطاقم بالكامل والسيطرة على المركبة!';
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
    Object.values(players).forEach(p => {
        p.isDead = false;
        p.x = 600 + (Math.random() - 0.5) * 60;
        p.y = 250 + (Math.random() - 0.5) * 60;
    });
    broadcast({ type: 'UPDATE_STATE', gameState, players });
    showScreen('game-screen');
    updateLobbyUI();
};

// --- CONTROLS (KEYBOARD + TOUCH + VIRTUAL DPAD + CLICK-TO-MOVE) ---
function setupTouchAndDpadControls() {
    // Canvas click & drag to move in BOTH LOBBY & PLAYING
    canvas.addEventListener('mousedown', handlePointerMove);
    canvas.addEventListener('mousemove', e => { if (e.buttons === 1) handlePointerMove(e); });
    canvas.addEventListener('touchstart', handlePointerMove, { passive: false });
    canvas.addEventListener('touchmove', handlePointerMove, { passive: false });

    function handlePointerMove(e) {
        if (e.cancelable) e.preventDefault();
        window.focus();
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        const worldX = clientX - rect.left + camera.x;
        const worldY = clientY - rect.top + camera.y;
        targetClickPos = { x: worldX, y: worldY };
    }

    // Virtual D-Pad buttons
    const bindDpad = (btnId, keyName) => {
        const btn = $(btnId);
        if (!btn) return;
        const start = e => { e.preventDefault(); keys[keyName] = true; targetClickPos = null; };
        const end = e => { e.preventDefault(); keys[keyName] = false; };
        btn.addEventListener('mousedown', start);
        btn.addEventListener('mouseup', end);
        btn.addEventListener('mouseleave', end);
        btn.addEventListener('touchstart', start, { passive: false });
        btn.addEventListener('touchend', end, { passive: false });
    };

    bindDpad('dpad-up', 'w');
    bindDpad('dpad-down', 's');
    bindDpad('dpad-left', 'a');
    bindDpad('dpad-right', 'd');
}

// Global Keyboard Listeners (ENABLED IN BOTH LOBBY & PLAYING!)
window.addEventListener('keydown', e => {
    window.focus();
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

// Map Boundary Collision
function isInsideMap(px, py, radius) {
    if (gameState === 'LOBBY') {
        // Dropship Walkable Deck Bounds
        return (px >= 380 && px <= 820 && py >= 50 && py <= 450);
    }
    
    let points = [
        { x: px - radius + 2, y: py },
        { x: px + radius - 2, y: py },
        { x: px, y: py - radius + 2 },
        { x: px, y: py + radius - 2 }
    ];
    for (let p of points) {
        let inside = false;
        for (let r of rooms) {
            if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) {
                inside = true; break;
            }
        }
        if (!inside) {
            for (let c of corridors) {
                if (p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h) {
                    inside = true; break;
                }
            }
        }
        if (!inside) return false;
    }
    return true;
}

// --- CLIENT GAME LOOP ---
function gameLoopClient() {
    if (gameState !== 'PLAYING' && gameState !== 'LOBBY') return;
    
    let me = players[myId];
    if (!me) return;
    
    // Player Movement (Active in LOBBY and PLAYING)
    if (!me.isDead) {
        let newX = me.x;
        let newY = me.y;
        let isMoving = false;
        
        if (keys.w) { newY -= SPEED; isMoving = true; }
        if (keys.s) { newY += SPEED; isMoving = true; }
        if (keys.a) { newX -= SPEED; isMoving = true; }
        if (keys.d) { newX += SPEED; isMoving = true; }
        
        // Touch/Click to Move
        if (targetClickPos && !keys.w && !keys.a && !keys.s && !keys.d) {
            const dx = targetClickPos.x - me.x;
            const dy = targetClickPos.y - me.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 6) {
                newX += (dx / dist) * SPEED;
                newY += (dy / dist) * SPEED;
                isMoving = true;
            } else {
                targetClickPos = null;
            }
        }
        
        if (isMoving) {
            me.walkAnim = (me.walkAnim || 0) + 0.3;
        } else {
            me.walkAnim = 0;
        }
        
        let moved = false;
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
    
    // Camera follow smoothly
    camera.x = me.x - canvas.width / 2;
    camera.y = me.y - canvas.height / 2;
    
    // HUD visibility toggles
    if (gameState === 'PLAYING') {
        checkInteractables();
        $('hud-task-box').classList.remove('hidden');
        $('hud-role-box').classList.remove('hidden');
        $('hud-action-buttons').classList.remove('hidden');
        $('dropship-hud').classList.add('hidden');
    } else {
        $('hud-task-box').classList.add('hidden');
        $('hud-role-box').classList.add('hidden');
        $('hud-action-buttons').classList.add('hidden');
        $('dropship-hud').classList.remove('hidden');
    }

    drawMap();
    
    // HUD stats
    let pct = totalTasksRequired > 0 ? (totalTasksCompleted / totalTasksRequired) * 100 : 0;
    $('task-progress').innerText = Math.floor(pct) + '%';
    $('task-bar-fill').style.width = Math.min(100, pct) + '%';
    $('my-role-display').innerText = myRole === 'IMPOSTOR' ? 'مخرب 🔪' : 'طاقم 👨‍🚀';
    $('my-role-display').style.color = myRole === 'IMPOSTOR' ? '#ef4444' : '#38bdf8';
    
    requestAnimationFrame(gameLoopClient);
}

// --- INTERACTIONS (Tasks, Kill, Report) ---
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
            if (!t.doneBy.includes(myId) && Math.hypot(me.x - t.x, me.y - t.y) < 65) {
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
            if (id !== myId && !players[id].isDead && Math.hypot(me.x - players[id].x, me.y - players[id].y) < 75) {
                targetPlayer = players[id];
                break;
            }
        }
        $('action-kill').disabled = !targetPlayer;
    }
    
    // Report Body
    targetBody = null;
    for (let b of bodies) {
        if (Math.hypot(me.x - b.x, me.y - b.y) < 85) {
            targetBody = b;
            break;
        }
    }
    $('action-report').disabled = !targetBody;
}

$('action-use').onclick = () => {
    if (targetTask && !$('action-use').disabled) {
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

// --- DRAWING GRAPHICS & SCI-FI ENVIRONMENT ---
const spaceStars = [];
for (let i = 0; i < 200; i++) {
    spaceStars.push({
        x: Math.random() * 3200 - 800,
        y: Math.random() * 2400 - 600,
        speed: 0.5 + Math.random() * 1.5,
        size: Math.random() < 0.2 ? 3 : Math.random() < 0.5 ? 2 : 1.2,
        color: Math.random() < 0.2 ? '#38bdf8' : Math.random() < 0.2 ? '#c084fc' : '#ffffff'
    });
}

function drawSpaceStarfield(ctx) {
    ctx.fillStyle = '#020617';
    ctx.fillRect(-2000, -2000, 5000, 5000);

    // Glowing Galactic Nebulae
    const time = Date.now() * 0.0015;
    const neb = ctx.createRadialGradient(600, 350, 80, 600, 350, 900);
    neb.addColorStop(0, 'rgba(99, 102, 241, 0.25)');
    neb.addColorStop(0.5, 'rgba(56, 189, 248, 0.12)');
    neb.addColorStop(1, 'transparent');
    ctx.fillStyle = neb;
    ctx.fillRect(-2000, -2000, 5000, 5000);

    // Drifting Twinkling Stars
    spaceStars.forEach(s => {
        s.y += s.speed * 0.2;
        if (s.y > 2000) s.y = -600;
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawMap() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    drawSpaceStarfield(ctx);

    const time = Date.now() * 0.003;

    // --- LOBBY DROPSHIP DRAWING ---
    if (gameState === 'LOBBY') {
        const cx = 600;
        const cy = 250;
        const flamePulse = 18 + Math.sin(time * 4) * 8;

        // Plasma Thrusters
        for (const off of [-180, -90, 90, 180]) {
            const flame = ctx.createLinearGradient(cx + off, cy + 220, cx + off, cy + 220 + flamePulse * 2.2);
            flame.addColorStop(0, '#38bdf8');
            flame.addColorStop(0.5, '#a855f7');
            flame.addColorStop(1, 'transparent');
            ctx.fillStyle = flame;
            ctx.beginPath();
            ctx.ellipse(cx + off, cy + 220 + flamePulse * 1.1, 18, flamePulse * 1.1, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Heavy Armor Hull
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 4;
        ctx.shadowColor = 'rgba(56, 189, 248, 0.6)';
        ctx.shadowBlur = 18;

        ctx.beginPath();
        ctx.roundRect(cx - 230, cy - 210, 460, 430, 32);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Metallic Steel Deck Floor
        const deckGrad = ctx.createLinearGradient(cx - 200, cy - 180, cx + 200, cy + 180);
        deckGrad.addColorStop(0, '#1e293b');
        deckGrad.addColorStop(1, '#090d16');
        ctx.fillStyle = deckGrad;
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(cx - 200, cy - 180, 400, 380, 20);
        ctx.fill();
        ctx.stroke();

        // Glowing Blue Floor Grid
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.18)';
        ctx.lineWidth = 1.5;
        for (let gx = cx - 180; gx <= cx + 180; gx += 40) {
            ctx.beginPath(); ctx.moveTo(gx, cy - 170); ctx.lineTo(gx, cy + 190); ctx.stroke();
        }
        for (let gy = cy - 170; gy <= cy + 190; gy += 40) {
            ctx.beginPath(); ctx.moveTo(cx - 190, gy); ctx.lineTo(cx + 190, gy); ctx.stroke();
        }

        // Customization Hologram Station
        ctx.fillStyle = '#020617';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(cx - 35, cy - 85, 70, 35, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('💻 تخصيص', cx, cy - 63);

        // Draw players in lobby
        Object.values(players).forEach(p => {
            drawCrewmate(ctx, p.x, p.y, p.color, false, p.name, false, p.role, p.walkAnim);
        });

        ctx.restore();
        return;
    }

    // --- IN-GAME SPACESHIP (THE SKELD ARENA) ---
    const wallThick = 14;

    // Glowing Walls
    ctx.fillStyle = '#0284c7';
    rooms.forEach(r => ctx.fillRect(r.x - wallThick, r.y - wallThick, r.w + wallThick * 2, r.h + wallThick * 2));
    corridors.forEach(c => ctx.fillRect(c.x - wallThick, c.y - wallThick, c.w + wallThick * 2, c.h + wallThick * 2));

    // Room Floors
    rooms.forEach(r => {
        const floorGrad = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
        floorGrad.addColorStop(0, '#1e293b');
        floorGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = floorGrad;
        ctx.fillRect(r.x, r.y, r.w, r.h);

        // Room Name Header & Icon
        ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${r.icon} ${r.name}`, r.x + r.w / 2, r.y + 40);
    });

    // Corridors Floors
    corridors.forEach(c => {
        ctx.fillStyle = '#090d16';
        ctx.fillRect(c.x, c.y, c.w, c.h);
    });

    // Cafeteria Central Emergency Table & Button
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(700, 280, 55, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Red Emergency Button
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(700, 280, 18, 0, Math.PI * 2);
    ctx.fill();

    // Vents
    vents.forEach(v => {
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.fillRect(v.x - 20, v.y - 15, 40, 30);
        ctx.strokeRect(v.x - 20, v.y - 15, 40, 30);
        for (let l = -12; l <= 12; l += 6) {
            ctx.beginPath();
            ctx.moveTo(v.x + l, v.y - 10);
            ctx.lineTo(v.x + l, v.y + 10);
            ctx.stroke();
        }
    });

    // Draw Tasks
    tasks.forEach(t => {
        const isDone = t.doneBy.includes(myId);
        ctx.fillStyle = isDone ? '#10b981' : '#f59e0b';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(t.x, t.y, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(t.name.split(' ')[0], t.x, t.y + 26);
    });

    // Draw Bodies
    bodies.forEach(b => {
        drawDeadBody(ctx, b.x, b.y, b.color);
    });

    // Draw Players
    const me = players[myId];
    Object.values(players).forEach(p => {
        if (p.isDead && me && !me.isDead) return;
        const isTargeted = targetPlayer && targetPlayer.id === p.id;
        drawCrewmate(ctx, p.x, p.y, p.color, p.isDead, p.name, isTargeted, p.role, p.walkAnim);
    });

    ctx.restore();
}

// --- BEAUTIFUL 3D/2.5D CREWMATE ASTRONAUT SPRITE ---
function drawCrewmate(ctx, x, y, color, isDead, name, isTargeted, role, walkAnim = 0) {
    ctx.save();
    ctx.translate(x, y);

    const bobY = Math.sin(walkAnim || 0) * 3;

    if (isDead) {
        ctx.globalAlpha = 0.55;
    }

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 22, 18, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Red Impostor Target Ring
    if (isTargeted) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(0, 0, 32, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Oxygen Backpack
    ctx.fillStyle = adjustColor(color, -30);
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-22, -12 + bobY, 10, 24, 5);
    ctx.fill();
    ctx.stroke();

    // Main Body
    const bodyGrad = ctx.createLinearGradient(-16, -24, 16, 20);
    bodyGrad.addColorStop(0, color);
    bodyGrad.addColorStop(1, adjustColor(color, -40));
    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.roundRect(-16, -24 + bobY, 32, 36, [16, 16, 6, 6]);
    ctx.fill();
    ctx.stroke();

    // Legs
    const legL_X = -12;
    const legR_X = 2;
    const legOffset = Math.sin(walkAnim || 0) * 4;

    ctx.fillStyle = adjustColor(color, -25);
    // Left Leg
    ctx.beginPath();
    ctx.roundRect(legL_X, 10 + bobY + legOffset, 10, 14, 4);
    ctx.fill();
    ctx.stroke();

    // Right Leg
    ctx.beginPath();
    ctx.roundRect(legR_X, 10 + bobY - legOffset, 10, 14, 4);
    ctx.fill();
    ctx.stroke();

    // Large Curved Glass Visor with Cyan Sheen & Reflection
    const visorGrad = ctx.createLinearGradient(-2, -18, 14, -2);
    visorGrad.addColorStop(0, '#e0f2fe');
    visorGrad.addColorStop(0.4, '#38bdf8');
    visorGrad.addColorStop(1, '#0369a1');

    ctx.fillStyle = visorGrad;
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-4, -18 + bobY, 22, 14, 7);
    ctx.fill();
    ctx.stroke();

    // White Specular Glint Reflection on Visor
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.ellipse(3, -15 + bobY, 5, 2, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Player Name Tag
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 4;
    ctx.fillText(name, 0, -32 + bobY);
    ctx.shadowBlur = 0;

    ctx.restore();
}

function drawDeadBody(ctx, x, y, color) {
    ctx.save();
    ctx.translate(x, y);

    // Lying down half crewmate body
    ctx.fillStyle = adjustColor(color, -25);
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 10, 20, 12, 0, 0, Math.PI);
    ctx.fill();
    ctx.stroke();

    // White Bone
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-4, -6, 8, 16, 4);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(-4, -6, 4, 0, Math.PI * 2);
    ctx.arc(4, -6, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function adjustColor(hex, amount) {
    let num = parseInt(hex.replace('#', ''), 16);
    let r = (num >> 16) + amount;
    let g = ((num >> 8) & 0x00FF) + amount;
    let b = (num & 0x0000FF) + amount;
    r = Math.min(255, Math.max(0, r));
    g = Math.min(255, Math.max(0, g));
    b = Math.min(255, Math.max(0, b));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

// --- MEETING SCREEN & VOTING ---
let meetingInterval = null;

function startMeeting(callerName) {
    gameState = 'MEETING';
    meetingData = { caller: callerName, timer: 60, votes: {}, chat: [] };
    
    // Teleport alive players to Cafeteria
    Object.values(players).forEach(p => {
        if (!p.isDead) {
            p.x = 700 + (Math.random() - 0.5) * 80;
            p.y = 280 + (Math.random() - 0.5) * 60;
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
    $('chat-messages').innerHTML = `<div class="chat-msg" style="color:#ef4444; text-align:center;">🚨 تم طلب اجتماع طارئ بواسطة: <b>${data.caller}</b></div>`;
    renderMeetingUI();
}

function renderMeetingUI() {
    if (gameState !== 'MEETING') return;
    $('meeting-timer').innerText = meetingData.timer;
    
    const grid = $('voting-players-grid');
    grid.innerHTML = '';
    
    Object.values(players).forEach(p => {
        const card = document.createElement('div');
        card.className = `player-vote-card ${p.isDead ? 'dead' : ''}`;
        
        let votesForMe = Object.values(meetingData.votes).filter(v => v === p.id).length;
        let dotsHTML = '<div class="vote-count" style="display:flex; gap:4px; margin-top:6px;">' + '<span style="color:#ef4444; font-size:1.1rem;">●</span>'.repeat(votesForMe) + '</div>';
        
        card.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px;">
                <div class="p-color" style="background:${p.color}"></div>
                <span style="font-weight:bold;">${p.name} ${p.isDead ? '(مستبعد)' : ''}</span>
            </div>
            ${dotsHTML}
        `;
        
        if (!p.isDead && players[myId] && !players[myId].isDead) {
            card.onclick = () => castVote(p.id);
        }
        if (meetingData.votes[myId] === p.id) {
            card.classList.add('selected');
        }
        grid.appendChild(card);
    });
}

function castVote(targetId) {
    if (meetingData.votes[myId]) return;
    if (isHost) {
        meetingData.votes[myId] = targetId;
        checkMeetingEnd();
    } else if (conn) {
        conn.send({ type: 'VOTE', voteTarget: targetId });
        meetingData.votes[myId] = targetId;
    }
}

$('skip-vote-btn').onclick = () => {
    if (players[myId] && !players[myId].isDead) castVote('skip');
};

function checkMeetingEnd() {
    if (!isHost) return;
    let aliveCount = Object.values(players).filter(p => !p.isDead).length;
    let totalVotes = Object.keys(meetingData.votes).length;
    
    if (totalVotes >= aliveCount || meetingData.timer <= 0) {
        clearInterval(meetingInterval);
        
        let counts = { 'skip': 0 };
        Object.values(meetingData.votes).forEach(v => { counts[v] = (counts[v] || 0) + 1; });
        
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
        
        if (highestId && highestId !== 'skip' && !tie && players[highestId]) {
            players[highestId].isDead = true;
        }
        
        bodies = [];
        gameState = 'PLAYING';
        broadcast({ type: 'UPDATE_STATE', gameState, players, bodies });
        
        setTimeout(() => {
            endMeetingClient();
            checkWinCondition();
        }, 1500);
    }
}

function endMeetingClient() {
    showScreen('game-screen');
    requestAnimationFrame(gameLoopClient);
}

$('chat-send-btn').onclick = () => {
    let text = $('chat-input').value.trim();
    if (!text) return;
    if (isHost) {
        meetingData.chat.push({ sender: players[myId].name, text });
    } else if (conn) {
        conn.send({ type: 'CHAT', text });
    }
    $('chat-input').value = '';
};
