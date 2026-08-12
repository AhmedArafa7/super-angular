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

// Game Settings (configurable from computer console)
let gameSettings = {
    speed: 4,
    vision: 250,
    votingTime: 60,
    tasksPerPlayer: 4,
    confirmEject: true,
    emergencyCooldown: 30
};

// Player Customization
let playerCustomization = {
    pet: null,       // null, 'cat', 'dog', 'robot', 'ufo', 'ghost'
    outfit: null,    // null, 'astronaut', 'ninja', 'astronaut_gold', 'doctor', 'police'
    hat: null        // null, 'cap', 'crown', 'helmet', 'antenna', 'horns'
};

const PETS = [
    { id: null, emoji: 'لا شيء', icon: '' },
    { id: 'cat', emoji: 'قطة', icon: '🐱' },
    { id: 'dog', emoji: 'كلب', icon: '🐶' },
    { id: 'robot', emoji: 'روبوت', icon: '🤖' },
    { id: 'ufo', emoji: 'كائن فضائي', icon: '👽' },
    { id: 'ghost', emoji: 'شبح', icon: '👻' }
];

const OUTFITS = [
    { id: null, emoji: 'افتراضي' },
    { id: 'astronaut_gold', emoji: 'فضائي ذهبي', color: '#f59e0b' },
    { id: 'ninja', emoji: 'نينجا', color: '#1e293b' },
    { id: 'doctor', emoji: 'طبيب', color: '#ffffff' },
    { id: 'police', emoji: 'شرطي', color: '#1e40af' },
    { id: 'firefighter', emoji: 'إطفائي', color: '#dc2626' }
];

const HATS = [
    { id: null, emoji: 'لا شيء', icon: '' },
    { id: 'cap', emoji: 'قبعة', icon: '🧢' },
    { id: 'crown', emoji: 'تاج', icon: '👑' },
    { id: 'helmet', emoji: 'خوذة', icon: '⛑️' },
    { id: 'antenna', emoji: 'هوائي', icon: '📡' },
    { id: 'horns', emoji: 'قرون', icon: '😈' }
];

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
    try {
        peer = new Peer({ 
            debug: 0,
            config: { 
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ] 
            }
        });
    } catch (e) {
        console.warn('Peer creation failed, retrying...', e);
        setTimeout(initPeer, 2000);
        return;
    }
    
    // Timeout: if connection takes too long, show error gracefully
    const connectTimeout = setTimeout(() => {
        if (!myId) {
            console.warn('PeerJS connection timeout - working in offline mode');
            myId = 'local_' + Math.random().toString(36).substr(2, 9);
            players[myId] = { id: myId, name: myName, color: COLORS[0], x: 600, y: 250, role: 'CREWMATE', isDead: false, isHost: true, walkFrame: 0, isMoving: false, facingDir: 'down', pet: null, outfit: null, hat: null };
            isHost = true;
            gameState = 'LOBBY';
            showScreen('game-screen');
            updateLobbyUI();
            requestAnimationFrame(gameLoopClient);
        }
    }, 8000);
    
    peer.on('open', id => {
        clearTimeout(connectTimeout);
        myId = id;
        if (isHost) {
            roomId = id;
            players[myId] = { id: myId, name: myName, color: COLORS[0], x: 600, y: 250, role: 'CREWMATE', isDead: false, isHost: true, walkFrame: 0, isMoving: false, facingDir: 'down', pet: null, outfit: null, hat: null };
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
        console.warn('PeerJS error:', err.type, err.message);
        // If we haven't started yet, fall back to offline mode
        if (!myId) {
            clearTimeout(connectTimeout);
            myId = 'local_' + Math.random().toString(36).substr(2, 9);
            players[myId] = { id: myId, name: myName, color: COLORS[0], x: 600, y: 250, role: 'CREWMATE', isDead: false, isHost: true, walkFrame: 0, isMoving: false, facingDir: 'down', pet: null, outfit: null, hat: null };
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
                players[connection.peer] = { id: connection.peer, name: 'ضيف', color: newPlayerColor, x: 600 + Math.random()*40 - 20, y: 250 + Math.random()*40 - 20, role: 'CREWMATE', isDead: false, isHost: false, walkFrame: 0, isMoving: false, facingDir: 'down', pet: null, outfit: null, hat: null };
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
                if (data.walkFrame !== undefined) players[peerId].walkFrame = data.walkFrame;
                if (data.isMoving !== undefined) players[peerId].isMoving = data.isMoving;
                if (data.facingDir) players[peerId].facingDir = data.facingDir;
                broadcast({ type: 'UPDATE_STATE', players, gameState });
            }
        }
    } else if (gameState === 'PLAYING') {
        if (data.type === 'MOVE') {
            if (!players[peerId].isDead) {
                players[peerId].x = data.x;
                players[peerId].y = data.y;
                if (data.walkFrame !== undefined) players[peerId].walkFrame = data.walkFrame;
                if (data.isMoving !== undefined) players[peerId].isMoving = data.isMoving;
                if (data.facingDir) players[peerId].facingDir = data.facingDir;
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
    const startGameBtn = $('start-game-btn');
    const shipStartBtn = $('ship-start-btn');
    
    // Initialize panels
    renderSettingsPanel();
    renderCustomizePanel();
    
    if (isHost) {
        startBtn.classList.remove('hidden');
        startGameBtn.classList.remove('hidden');
        if (shipStartBtn) shipStartBtn.classList.remove('hidden');
        if (count < 4) {
            startBtn.innerText = `⏳ يحتاج ${4 - count} لاعب إضافي`;
            startBtn.disabled = true;
            startBtn.style.opacity = '0.5';
            startGameBtn.disabled = true;
            if (shipStartBtn) {
                shipStartBtn.style.opacity = '0.5';
                shipStartBtn.style.pointerEvents = 'none';
                shipStartBtn.innerText = `⏳ يحتاج ${4 - count} لاعب`;
            }
        } else {
            startBtn.innerText = `🚀 بدء اللعبة (${count}/10)`;
            startBtn.disabled = false;
            startBtn.style.opacity = '1';
            startGameBtn.disabled = false;
            if (shipStartBtn) {
                shipStartBtn.style.opacity = '1';
                shipStartBtn.style.pointerEvents = 'auto';
                shipStartBtn.innerText = `🚀 بدء المهمة (${count})`;
            }
        }
        waitingMsg.classList.add('hidden');
    } else {
        startBtn.classList.add('hidden');
        startGameBtn.classList.add('hidden');
        if (shipStartBtn) shipStartBtn.classList.add('hidden');
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
    if (playerIds.length < 4) return alert('يحتاج اللعبة 4 لاعبين على الأقل!'); // Need 4+ players
    
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
    totalTasksRequired = playerIds.length * gameSettings.tasksPerPlayer; // Max tasks
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
    if (gameState !== 'PLAYING' && gameState !== 'LOBBY') return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    // Convert screen coordinates to world coordinates
    const worldX = clientX - rect.left + camera.x;
    const worldY = clientY - rect.top + camera.y;
    
    // LOBBY: Check clicks on Computer or Customization station
    if (gameState === 'LOBBY') {
        const cx = 600, cy = 250;
        // Computer console click area (center of ship)
        if (worldX > cx - 60 && worldX < cx + 60 && worldY > cy - 90 && worldY < cy - 30) {
            toggleSettingsPanel();
            return;
        }
        // Customization station click area (right side)
        if (worldX > cx + 160 && worldX < cx + 260 && worldY > cy - 40 && worldY < cy + 40) {
            toggleCustomizePanel();
            return;
        }
        return;
    }
    
    targetClickPos = { x: worldX, y: worldY };
}

// --- SETTINGS & CUSTOMIZATION PANELS ---
function toggleSettingsPanel() {
    const panel = $('settings-panel');
    if (!panel) return;
    panel.classList.toggle('hidden');
    $('customize-panel').classList.add('hidden');
}

function toggleCustomizePanel() {
    const panel = $('customize-panel');
    if (!panel) return;
    panel.classList.toggle('hidden');
    $('settings-panel').classList.add('hidden');
}

function renderSettingsPanel() {
    $('setting-speed').value = gameSettings.speed;
    $('setting-speed-val').innerText = gameSettings.speed;
    $('setting-vision').value = gameSettings.vision;
    $('setting-vision-val').innerText = gameSettings.vision;
    $('setting-vote-time').value = gameSettings.votingTime;
    $('setting-vote-time-val').innerText = gameSettings.votingTime + ' ثانية';
    $('setting-tasks').value = gameSettings.tasksPerPlayer;
    $('setting-tasks-val').innerText = gameSettings.tasksPerPlayer;
    $('setting-confirm-eject').checked = gameSettings.confirmEject;
    $('setting-emergency-cd').value = gameSettings.emergencyCooldown;
    $('setting-emergency-cd-val').innerText = gameSettings.emergencyCooldown + ' ثانية';
}

function renderCustomizePanel() {
    // Colors
    const colorGrid = $('customize-colors');
    colorGrid.innerHTML = '';
    COLORS.forEach(c => {
        const dot = document.createElement('div');
        dot.className = 'color-dot' + (c === myColor ? ' active' : '');
        dot.style.backgroundColor = c;
        dot.onclick = () => {
            myColor = c;
            if (players[myId]) players[myId].color = c;
            if (isHost) broadcast({ type: 'UPDATE_STATE', players, gameState });
            else if (conn) conn.send({ type: 'CHANGE_COLOR', color: c });
            renderCustomizePanel();
        };
        colorGrid.appendChild(dot);
    });
    
    // Pets
    const petGrid = $('customize-pets');
    petGrid.innerHTML = '';
    PETS.forEach(p => {
        const btn = document.createElement('div');
        btn.className = 'customize-option' + (playerCustomization.pet === p.id ? ' selected' : '');
        btn.innerHTML = p.icon ? `<span class="option-icon">${p.icon}</span><span class="option-label">${p.emoji}</span>` : `<span class="option-label">لا شيء</span>`;
        btn.onclick = () => {
            playerCustomization.pet = p.id;
            if (players[myId]) players[myId].pet = p.id;
            if (isHost) broadcast({ type: 'UPDATE_STATE', players, gameState });
            renderCustomizePanel();
        };
        petGrid.appendChild(btn);
    });
    
    // Outfits
    const outfitGrid = $('customize-outfits');
    outfitGrid.innerHTML = '';
    OUTFITS.forEach(o => {
        const btn = document.createElement('div');
        btn.className = 'customize-option' + (playerCustomization.outfit === o.id ? ' selected' : '');
        btn.innerHTML = o.color ? `<span class="option-icon" style="background:${o.color};width:24px;height:24px;border-radius:6px;border:2px solid #fff;display:inline-block"></span><span class="option-label">${o.emoji}</span>` : `<span class="option-label">افتراضي</span>`;
        btn.onclick = () => {
            playerCustomization.outfit = o.id;
            if (players[myId]) players[myId].outfit = o.id;
            if (isHost) broadcast({ type: 'UPDATE_STATE', players, gameState });
            renderCustomizePanel();
        };
        outfitGrid.appendChild(btn);
    });
    
    // Hats
    const hatGrid = $('customize-hats');
    hatGrid.innerHTML = '';
    HATS.forEach(h => {
        const btn = document.createElement('div');
        btn.className = 'customize-option' + (playerCustomization.hat === h.id ? ' selected' : '');
        btn.innerHTML = h.icon ? `<span class="option-icon">${h.icon}</span><span class="option-label">${h.emoji}</span>` : `<span class="option-label">لا شيء</span>`;
        btn.onclick = () => {
            playerCustomization.hat = h.id;
            if (players[myId]) players[myId].hat = h.id;
            if (isHost) broadcast({ type: 'UPDATE_STATE', players, gameState });
            renderCustomizePanel();
        };
        hatGrid.appendChild(btn);
    });
}

// Settings event listeners
$('setting-speed')?.addEventListener('input', e => {
    gameSettings.speed = parseInt(e.target.value);
    $('setting-speed-val').innerText = gameSettings.speed;
});
$('setting-vision')?.addEventListener('input', e => {
    gameSettings.vision = parseInt(e.target.value);
    $('setting-vision-val').innerText = gameSettings.vision;
});
$('setting-vote-time')?.addEventListener('input', e => {
    gameSettings.votingTime = parseInt(e.target.value);
    $('setting-vote-time-val').innerText = gameSettings.votingTime + ' ثانية';
});
$('setting-tasks')?.addEventListener('input', e => {
    gameSettings.tasksPerPlayer = parseInt(e.target.value);
    $('setting-tasks-val').innerText = gameSettings.tasksPerPlayer;
});
$('setting-confirm-eject')?.addEventListener('change', e => {
    gameSettings.confirmEject = e.target.checked;
});
$('setting-emergency-cd')?.addEventListener('input', e => {
    gameSettings.emergencyCooldown = parseInt(e.target.value);
    $('setting-emergency-cd-val').innerText = gameSettings.emergencyCooldown + ' ثانية';
});

$('close-settings-btn')?.addEventListener('click', () => $('settings-panel').classList.add('hidden'));
$('close-customize-btn')?.addEventListener('click', () => $('customize-panel').classList.add('hidden'));

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
        // Dropship interior bounds (walkable area inside the ship)
        return (px >= 420 && px <= 780 && py >= 120 && py <= 420);
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
        let moving = false;
        
        if (keys.w) { newY -= gameSettings.speed; moving = true; me.facingDir = 'up'; }
        if (keys.s) { newY += gameSettings.speed; moving = true; me.facingDir = 'down'; }
        if (keys.a) { newX -= gameSettings.speed; moving = true; me.facingDir = 'left'; }
        if (keys.d) { newX += gameSettings.speed; moving = true; me.facingDir = 'right'; }
        
        // Touch or Click Destination Movement
        if (targetClickPos && !keys.w && !keys.a && !keys.s && !keys.d) {
            const dx = targetClickPos.x - me.x;
            const dy = targetClickPos.y - me.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 6) {
                newX += (dx / dist) * gameSettings.speed;
                newY += (dy / dist) * gameSettings.speed;
                moving = true;
                if (Math.abs(dx) > Math.abs(dy)) {
                    me.facingDir = dx > 0 ? 'right' : 'left';
                } else {
                    me.facingDir = dy > 0 ? 'down' : 'up';
                }
            } else {
                targetClickPos = null;
            }
        }
        
        me.isMoving = moving;
        if (moving) {
            me.walkFrame = (me.walkFrame + 0.18) % (Math.PI * 2);
        } else {
            me.walkFrame = 0;
        }
        
        let moved = false;
        // Check X and Y independently to allow sliding against walls
        if (newX !== me.x && isInsideMap(newX, me.y, 16)) { me.x = newX; moved = true; }
        if (newY !== me.y && isInsideMap(me.x, newY, 16)) { me.y = newY; moved = true; }
        
        if (moved) {
            if (!isHost && conn) {
                conn.send({ type: 'MOVE', x: me.x, y: me.y, walkFrame: me.walkFrame, isMoving: me.isMoving, facingDir: me.facingDir });
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

// --- AMONG US STYLE DROPSHIP DRAWING ---
function drawDropship(ctx, cx, cy, time) {
    const t = time * 0.003;

    // --- LEFT ENGINE POD ---
    const engGrad = ctx.createLinearGradient(cx - 340, cy - 60, cx - 200, cy + 60);
    engGrad.addColorStop(0, '#374151');
    engGrad.addColorStop(0.5, '#1f2937');
    engGrad.addColorStop(1, '#111827');
    ctx.fillStyle = engGrad;
    ctx.strokeStyle = '#4b5563';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cx - 340, cy - 50, 140, 110, 16);
    ctx.fill();
    ctx.stroke();
    // Engine intake vent
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(cx - 330, cy - 35, 120, 40, 8);
    ctx.fill();
    ctx.stroke();
    // Glowing thruster nozzles (6 blue lights)
    for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 3; col++) {
            const nx = cx - 310 + col * 38;
            const ny = cy + 30 + row * 22;
            const glow = 0.6 + Math.sin(t * 2 + col + row) * 0.4;
            ctx.fillStyle = 'rgba(56, 189, 248, ' + glow + ')';
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.ellipse(nx, ny, 10, 8, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.shadowBlur = 0;
    // Engine panel lines
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 340, cy - 10);
    ctx.lineTo(cx - 200, cy - 10);
    ctx.moveTo(cx - 340, cy + 15);
    ctx.lineTo(cx - 200, cy + 15);
    ctx.stroke();

    // --- RIGHT ENGINE POD ---
    ctx.fillStyle = engGrad;
    ctx.strokeStyle = '#4b5563';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cx + 200, cy - 50, 140, 110, 16);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(cx + 210, cy - 35, 120, 40, 8);
    ctx.fill();
    ctx.stroke();
    for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 3; col++) {
            const nx = cx + 220 + col * 38;
            const ny = cy + 30 + row * 22;
            const glow = 0.6 + Math.sin(t * 2 + col + row + 1) * 0.4;
            ctx.fillStyle = 'rgba(56, 189, 248, ' + glow + ')';
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.ellipse(nx, ny, 10, 8, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx + 200, cy - 10);
    ctx.lineTo(cx + 340, cy - 10);
    ctx.moveTo(cx + 200, cy + 15);
    ctx.lineTo(cx + 340, cy + 15);
    ctx.stroke();

    // --- MAIN SHIP HULL ---
    const hullGrad = ctx.createLinearGradient(cx - 180, cy - 130, cx + 180, cy + 170);
    hullGrad.addColorStop(0, '#374151');
    hullGrad.addColorStop(0.3, '#1f2937');
    hullGrad.addColorStop(0.7, '#111827');
    hullGrad.addColorStop(1, '#030712');
    ctx.fillStyle = hullGrad;
    ctx.strokeStyle = '#4b5563';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(cx - 180, cy - 130, 360, 300, 20);
    ctx.fill();
    ctx.stroke();
    // Hull border glow
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cx - 178, cy - 128, 356, 296, 18);
    ctx.stroke();

    // Hull rivets
    ctx.fillStyle = '#4b5563';
    [[cx-165,cy-115],[cx-165,cy+145],[cx+165,cy-115],[cx+165,cy+145],[cx-100,cy-115],[cx+100,cy-115],[cx-100,cy+145],[cx+100,cy+145]].forEach(function(p) {
        ctx.beginPath();
        ctx.arc(p[0], p[1], 3, 0, Math.PI * 2);
        ctx.fill();
    });

    // --- INTERIOR FLOOR ---
    const floorGrad = ctx.createLinearGradient(cx - 165, cy - 115, cx + 165, cy + 155);
    floorGrad.addColorStop(0, '#1a1f2e');
    floorGrad.addColorStop(0.5, '#151926');
    floorGrad.addColorStop(1, '#0d1117');
    ctx.fillStyle = floorGrad;
    ctx.beginPath();
    ctx.roundRect(cx - 165, cy - 115, 330, 270, 12);
    ctx.fill();
    // Floor grid
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.lineWidth = 1;
    for (let gx = cx - 155; gx <= cx + 155; gx += 30) {
        ctx.beginPath(); ctx.moveTo(gx, cy - 110); ctx.lineTo(gx, cy + 150); ctx.stroke();
    }
    for (let gy = cy - 110; gy <= cy + 150; gy += 30) {
        ctx.beginPath(); ctx.moveTo(cx - 160, gy); ctx.lineTo(cx + 160, gy); ctx.stroke();
    }

    // --- LEFT CONTROL PANEL ---
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(cx - 158, cy - 105, 45, 90, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(cx - 153, cy - 100, 35, 30, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(56, 189, 248, ' + (0.3 + Math.sin(t * 2) * 0.2) + ')';
    ctx.beginPath();
    ctx.roundRect(cx - 153, cy - 100, 35, 30, 4);
    ctx.fill();
    for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i === 0 ? '#ef4444' : i === 1 ? '#f59e0b' : '#10b981';
        ctx.beginPath();
        ctx.arc(cx - 140 + i * 12, cy - 62, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    // --- RIGHT CONTROL PANEL (Customization - clickable) ---
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(cx + 113, cy - 105, 45, 90, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(cx + 118, cy - 100, 35, 30, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(168, 85, 247, ' + (0.3 + Math.sin(t * 2.5) * 0.2) + ')';
    ctx.beginPath();
    ctx.roundRect(cx + 118, cy - 100, 35, 30, 4);
    ctx.fill();
    for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i === 0 ? '#38bdf8' : i === 1 ? '#a855f7' : '#f59e0b';
        ctx.beginPath();
        ctx.arc(cx + 130 + i * 12, cy - 62, 4, 0, Math.PI * 2);
        ctx.fill();
    }
    // Label
    ctx.fillStyle = '#a855f7';
    ctx.font = '800 9px Tajawal, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎨 تخصيص', cx + 135, cy - 45);

    // --- AIRLOCK DOOR (top) ---
    ctx.fillStyle = '#1f2937';
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cx - 45, cy - 128, 90, 25, 6);
    ctx.fill();
    ctx.stroke();
    for (let i = 0; i < 3; i++) {
        ctx.fillStyle = 'rgba(16, 185, 129, ' + (0.5 + Math.sin(t * 3 + i) * 0.5) + ')';
        ctx.beginPath();
        ctx.arc(cx - 20 + i * 20, cy - 115, 4, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.fillStyle = '#9ca3af';
    ctx.font = '800 9px Tajawal, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('AIRLOCK', cx, cy - 113);

    // --- CRATES ---
    function drawCrate(bx, by, bw, bh, shade) {
        ctx.fillStyle = shade;
        ctx.strokeStyle = '#4b5563';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, bh, 3);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = '#6b7280';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bx + bw/2, by);
        ctx.lineTo(bx + bw/2, by + bh);
        ctx.moveTo(bx, by + bh/2);
        ctx.lineTo(bx + bw, by + bh/2);
        ctx.stroke();
    }
    drawCrate(cx - 130, cy + 80, 35, 30, '#2d3748');
    drawCrate(cx - 95, cy + 95, 25, 22, '#374151');
    drawCrate(cx + 100, cy + 85, 30, 28, '#2d3748');
    drawCrate(cx + 130, cy + 100, 22, 20, '#374151');

    // --- COMPUTER CONSOLE (center - clickable for settings) ---
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cx - 40, cy - 85, 80, 40, 8);
    ctx.fill();
    ctx.stroke();
    var screenGlow = 0.4 + Math.sin(t * 2) * 0.3;
    ctx.fillStyle = 'rgba(56, 189, 248, ' + screenGlow + ')';
    ctx.beginPath();
    ctx.roundRect(cx - 35, cy - 80, 70, 28, 4);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(cx - 33, cy - 78, 66, 24, 3);
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.font = '800 10px Tajawal, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚙️ إعدادات', cx, cy - 62);
    // Keyboard base
    ctx.fillStyle = '#374151';
    ctx.beginPath();
    ctx.roundRect(cx - 30, cy - 52, 60, 10, 3);
    ctx.fill();

    // --- LABELS ---
    ctx.fillStyle = 'rgba(56, 189, 248, 0.5)';
    ctx.font = '800 8px Tajawal, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('💻 اضغط للإعدادات', cx, cy - 38);
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

        // Draw Among Us style dropship
        const cx = 600, cy = 250;
        drawDropship(ctx, cx, cy, Date.now());

        // 3. Draw 3D Astronaut Players Walking Inside the Realistic Starship Floor
        Object.values(players).forEach(p => {
            drawAstronaut(ctx, p.x, p.y, p.color, false, p.name, false, p.role, p.walkFrame || 0, p.isMoving || false);
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
        drawAstronaut(ctx, p.x, p.y, p.color, p.isDead, p.name, isTargeted, p.role, p.walkFrame || 0, p.isMoving || false);
    });
    
    ctx.restore();
    
    // Vision Fog (Simple Circle)
    if (!me.isDead) {
        const cx = canvas.width/2;
        const cy = canvas.height/2;
        const visionRadius = myRole === 'IMPOSTOR' ? gameSettings.vision * 1.5 : gameSettings.vision;
        
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
    meetingData = { caller: callerName, timer: gameSettings.votingTime, votes: {}, chat: [] };
    
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

// --- AMONG US STYLE ASTRONAUT RENDERER ---
function drawAstronaut(ctx, x, y, color, isDead, name, isTargeted, role, walkFrame, isMoving) {
    ctx.save();
    ctx.translate(x, y);

    if (isDead) {
        ctx.globalAlpha = 0.5;
    }

    const wf = walkFrame || 0;
    const legSwing = isMoving ? Math.sin(wf * 6) : 0;
    const bodyBob = isMoving ? Math.abs(Math.sin(wf * 6)) * 1.5 : 0;

    ctx.translate(0, -bodyBob);

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 26, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Targeted glow
    if (isTargeted) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.roundRect(-22, -32, 44, 58, 20);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    // LEGS (short stubby)
    ctx.fillStyle = adjustColor(color, -10);
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-12, 12, 11, 12 + legSwing * 3, 5);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(1, 12, 11, 12 - legSwing * 3, 5);
    ctx.fill();
    ctx.stroke();

    // BACKPACK
    ctx.fillStyle = adjustColor(color, -15);
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-24, -10, 12, 22, 5);
    ctx.fill();
    ctx.stroke();

    // BODY (bean/capsule)
    const bodyGrad = ctx.createLinearGradient(-18, -28, 18, 16);
    bodyGrad.addColorStop(0, adjustColor(color, 30));
    bodyGrad.addColorStop(0.35, adjustColor(color, 10));
    bodyGrad.addColorStop(0.65, color);
    bodyGrad.addColorStop(1, adjustColor(color, -30));

    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, -30);
    ctx.bezierCurveTo(18, -30, 20, -20, 20, -8);
    ctx.bezierCurveTo(20, 8, 18, 18, 14, 22);
    ctx.lineTo(-14, 22);
    ctx.bezierCurveTo(-18, 18, -20, 8, -20, -8);
    ctx.bezierCurveTo(-20, -20, -18, -30, 0, -30);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Body highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    ctx.ellipse(0, -22, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // VISOR (oval glass)
    const visorGrad = ctx.createLinearGradient(-12, -22, 14, -4);
    visorGrad.addColorStop(0, '#d4f1ff');
    visorGrad.addColorStop(0.2, '#7dd3fc');
    visorGrad.addColorStop(0.5, '#38bdf8');
    visorGrad.addColorStop(0.8, '#0284c7');
    visorGrad.addColorStop(1, '#0c4a6e');

    ctx.fillStyle = visorGrad;
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(5, -14, 15, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Visor glare
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.ellipse(1, -18, 6, 3, -0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.ellipse(10, -12, 2.5, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // HATS
    if (playerCustomization.hat) {
        drawHat(ctx, playerCustomization.hat, color);
    }

    // PET
    if (playerCustomization.pet) {
        drawPet(ctx, playerCustomization.pet, color);
    }

    // IMPOSTOR BADGE
    if (role === 'IMPOSTOR' && (myRole === 'IMPOSTOR' || isDead)) {
        ctx.font = 'bold 11px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('\uD83D\uDD2A', 0, -34);
    }

    // NAME TAG
    if (name) {
        ctx.font = '900 12px Tajawal, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeText(name, 0, -35);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(name, 0, -35);
    }

    ctx.restore();
}

// --- HAT DRAWING ---
function drawHat(ctx, hatId, playerColor) {
    switch (hatId) {
        case 'cap':
            ctx.fillStyle = '#ef4444';
            ctx.strokeStyle = '#1a1a2e';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.ellipse(2, -32, 14, 5, 0, Math.PI, 0);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#dc2626';
            ctx.beginPath();
            ctx.ellipse(2, -32, 14, 4, 0, 0, Math.PI);
            ctx.fill();
            ctx.stroke();
            break;
        case 'crown':
            ctx.fillStyle = '#f59e0b';
            ctx.strokeStyle = '#1a1a2e';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(-10, -30);
            ctx.lineTo(-12, -40);
            ctx.lineTo(-6, -35);
            ctx.lineTo(0, -42);
            ctx.lineTo(6, -35);
            ctx.lineTo(12, -40);
            ctx.lineTo(10, -30);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(0, -35, 2, 0, Math.PI * 2);
            ctx.fill();
            break;
        case 'helmet':
            ctx.fillStyle = '#f59e0b';
            ctx.strokeStyle = '#1a1a2e';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.ellipse(2, -32, 16, 8, 0, Math.PI, 0);
            ctx.fill();
            ctx.stroke();
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(2, -40);
            ctx.lineTo(2, -32);
            ctx.stroke();
            break;
        case 'antenna':
            ctx.strokeStyle = '#6b7280';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(2, -30);
            ctx.lineTo(2, -45);
            ctx.stroke();
            var antGlow = 0.6 + Math.sin(Date.now() * 0.005) * 0.4;
            ctx.fillStyle = 'rgba(239, 68, 68, ' + antGlow + ')';
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(2, -46, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            break;
        case 'horns':
            ctx.fillStyle = '#ef4444';
            ctx.strokeStyle = '#1a1a2e';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(-8, -30);
            ctx.lineTo(-14, -44);
            ctx.lineTo(-4, -32);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(8, -30);
            ctx.lineTo(14, -44);
            ctx.lineTo(4, -32);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
    }
}

// --- PET DRAWING (floating beside character) ---
function drawPet(ctx, petId, playerColor) {
    var petX = 22;
    var petY = -5;
    var floatY = Math.sin(Date.now() * 0.004) * 3;

    ctx.save();
    ctx.translate(petX, petY + floatY);

    switch (petId) {
        case 'cat':
            ctx.fillStyle = '#f59e0b';
            ctx.strokeStyle = '#1a1a2e';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-5, -5);
            ctx.lineTo(-7, -12);
            ctx.lineTo(-2, -7);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(5, -5);
            ctx.lineTo(7, -12);
            ctx.lineTo(2, -7);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#1a1a2e';
            ctx.beginPath();
            ctx.arc(-3, -1, 1.5, 0, Math.PI * 2);
            ctx.arc(3, -1, 1.5, 0, Math.PI * 2);
            ctx.fill();
            break;
        case 'dog':
            ctx.fillStyle = '#92400e';
            ctx.strokeStyle = '#1a1a2e';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#78350f';
            ctx.beginPath();
            ctx.ellipse(-7, 2, 4, 6, 0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.ellipse(7, 2, 4, 6, -0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#1a1a2e';
            ctx.beginPath();
            ctx.arc(-2.5, -1, 1.5, 0, Math.PI * 2);
            ctx.arc(2.5, -1, 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(0, 2, 1.5, 0, Math.PI * 2);
            ctx.fill();
            break;
        case 'robot':
            ctx.fillStyle = '#6b7280';
            ctx.strokeStyle = '#1a1a2e';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(-6, -5, 12, 12, 3);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.arc(-2, 0, 2, 0, Math.PI * 2);
            ctx.arc(2, 0, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#6b7280';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(0, -5);
            ctx.lineTo(0, -10);
            ctx.stroke();
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(0, -11, 2, 0, Math.PI * 2);
            ctx.fill();
            break;
        case 'ufo':
            ctx.fillStyle = '#a3e635';
            ctx.strokeStyle = '#1a1a2e';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.ellipse(0, 0, 8, 4, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#d4f1ff';
            ctx.beginPath();
            ctx.ellipse(0, -2, 5, 4, 0, Math.PI, 0);
            ctx.fill();
            ctx.stroke();
            break;
        case 'ghost':
            var ghostAlpha = 0.6 + Math.sin(Date.now() * 0.003) * 0.3;
            ctx.globalAlpha = ghostAlpha;
            ctx.fillStyle = '#e2e8f0';
            ctx.strokeStyle = '#1a1a2e';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, -2, 7, Math.PI, 0);
            ctx.lineTo(7, 6);
            ctx.lineTo(4, 3);
            ctx.lineTo(0, 7);
            ctx.lineTo(-4, 3);
            ctx.lineTo(-7, 6);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#1a1a2e';
            ctx.beginPath();
            ctx.arc(-3, -3, 2, 0, Math.PI * 2);
            ctx.arc(3, -3, 2, 0, Math.PI * 2);
            ctx.fill();
            break;
    }

    ctx.restore();
}


// --- SETTINGS & CUSTOMIZATION PANELS ---
function toggleSettingsPanel() {
    const panel = $('settings-panel');
    if (!panel) return;
    panel.classList.toggle('hidden');
    $('customize-panel').classList.add('hidden');
}

function toggleCustomizePanel() {
    const panel = $('customize-panel');
    if (!panel) return;
    panel.classList.toggle('hidden');
    $('settings-panel').classList.add('hidden');
}

function renderSettingsPanel() {
    $('setting-speed').value = gameSettings.speed;
    $('setting-speed-val').innerText = gameSettings.speed;
    $('setting-vision').value = gameSettings.vision;
    $('setting-vision-val').innerText = gameSettings.vision;
    $('setting-vote-time').value = gameSettings.votingTime;
    $('setting-vote-time-val').innerText = gameSettings.votingTime + ' ثانية';
    $('setting-tasks').value = gameSettings.tasksPerPlayer;
    $('setting-tasks-val').innerText = gameSettings.tasksPerPlayer;
    $('setting-confirm-eject').checked = gameSettings.confirmEject;
    $('setting-emergency-cd').value = gameSettings.emergencyCooldown;
    $('setting-emergency-cd-val').innerText = gameSettings.emergencyCooldown + ' ثانية';
}

function renderCustomizePanel() {
    // Colors
    const colorGrid = $('customize-colors');
    colorGrid.innerHTML = '';
    COLORS.forEach(c => {
        const dot = document.createElement('div');
        dot.className = 'color-dot' + (c === myColor ? ' active' : '');
        dot.style.backgroundColor = c;
        dot.onclick = () => {
            myColor = c;
            if (players[myId]) players[myId].color = c;
            if (isHost) broadcast({ type: 'UPDATE_STATE', players, gameState });
            else if (conn) conn.send({ type: 'CHANGE_COLOR', color: c });
            renderCustomizePanel();
        };
        colorGrid.appendChild(dot);
    });
    
    // Pets
    const petGrid = $('customize-pets');
    petGrid.innerHTML = '';
    PETS.forEach(p => {
        const btn = document.createElement('div');
        btn.className = 'customize-option' + (playerCustomization.pet === p.id ? ' selected' : '');
        btn.innerHTML = p.icon ? `<span class="option-icon">${p.icon}</span><span class="option-label">${p.emoji}</span>` : `<span class="option-label">لا شيء</span>`;
        btn.onclick = () => {
            playerCustomization.pet = p.id;
            if (players[myId]) players[myId].pet = p.id;
            if (isHost) broadcast({ type: 'UPDATE_STATE', players, gameState });
            renderCustomizePanel();
        };
        petGrid.appendChild(btn);
    });
    
    // Outfits
    const outfitGrid = $('customize-outfits');
    outfitGrid.innerHTML = '';
    OUTFITS.forEach(o => {
        const btn = document.createElement('div');
        btn.className = 'customize-option' + (playerCustomization.outfit === o.id ? ' selected' : '');
        btn.innerHTML = o.color ? `<span class="option-icon" style="background:${o.color};width:24px;height:24px;border-radius:6px;border:2px solid #fff;display:inline-block"></span><span class="option-label">${o.emoji}</span>` : `<span class="option-label">افتراضي</span>`;
        btn.onclick = () => {
            playerCustomization.outfit = o.id;
            if (players[myId]) players[myId].outfit = o.id;
            if (isHost) broadcast({ type: 'UPDATE_STATE', players, gameState });
            renderCustomizePanel();
        };
        outfitGrid.appendChild(btn);
    });
    
    // Hats
    const hatGrid = $('customize-hats');
    hatGrid.innerHTML = '';
    HATS.forEach(h => {
        const btn = document.createElement('div');
        btn.className = 'customize-option' + (playerCustomization.hat === h.id ? ' selected' : '');
        btn.innerHTML = h.icon ? `<span class="option-icon">${h.icon}</span><span class="option-label">${h.emoji}</span>` : `<span class="option-label">لا شيء</span>`;
        btn.onclick = () => {
            playerCustomization.hat = h.id;
            if (players[myId]) players[myId].hat = h.id;
            if (isHost) broadcast({ type: 'UPDATE_STATE', players, gameState });
            renderCustomizePanel();
        };
        hatGrid.appendChild(btn);
    });
}

// Settings event listeners
$('setting-speed')?.addEventListener('input', e => {
    gameSettings.speed = parseInt(e.target.value);
    $('setting-speed-val').innerText = gameSettings.speed;
});
$('setting-vision')?.addEventListener('input', e => {
    gameSettings.vision = parseInt(e.target.value);
    $('setting-vision-val').innerText = gameSettings.vision;
});
$('setting-vote-time')?.addEventListener('input', e => {
    gameSettings.votingTime = parseInt(e.target.value);
    $('setting-vote-time-val').innerText = gameSettings.votingTime + ' ثانية';
});
$('setting-tasks')?.addEventListener('input', e => {
    gameSettings.tasksPerPlayer = parseInt(e.target.value);
    $('setting-tasks-val').innerText = gameSettings.tasksPerPlayer;
});
$('setting-confirm-eject')?.addEventListener('change', e => {
    gameSettings.confirmEject = e.target.checked;
});
$('setting-emergency-cd')?.addEventListener('input', e => {
    gameSettings.emergencyCooldown = parseInt(e.target.value);
    $('setting-emergency-cd-val').innerText = gameSettings.emergencyCooldown + ' ثانية';
});

$('close-settings-btn')?.addEventListener('click', () => $('settings-panel').classList.add('hidden'));
$('close-customize-btn')?.addEventListener('click', () => $('customize-panel').classList.add('hidden'));

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
        // Dropship interior bounds (walkable area inside the ship)
        return (px >= 420 && px <= 780 && py >= 120 && py <= 420);
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
        let moving = false;
        
        if (keys.w) { newY -= gameSettings.speed; moving = true; me.facingDir = 'up'; }
        if (keys.s) { newY += gameSettings.speed; moving = true; me.facingDir = 'down'; }
        if (keys.a) { newX -= gameSettings.speed; moving = true; me.facingDir = 'left'; }
        if (keys.d) { newX += gameSettings.speed; moving = true; me.facingDir = 'right'; }
        
        // Touch or Click Destination Movement
        if (targetClickPos && !keys.w && !keys.a && !keys.s && !keys.d) {
            const dx = targetClickPos.x - me.x;
            const dy = targetClickPos.y - me.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 6) {
                newX += (dx / dist) * gameSettings.speed;
                newY += (dy / dist) * gameSettings.speed;
                moving = true;
                if (Math.abs(dx) > Math.abs(dy)) {
                    me.facingDir = dx > 0 ? 'right' : 'left';
                } else {
                    me.facingDir = dy > 0 ? 'down' : 'up';
                }
            } else {
                targetClickPos = null;
            }
        }
        
        me.isMoving = moving;
        if (moving) {
            me.walkFrame = (me.walkFrame + 0.18) % (Math.PI * 2);
        } else {
            me.walkFrame = 0;
        }
        
        let moved = false;
        // Check X and Y independently to allow sliding against walls
        if (newX !== me.x && isInsideMap(newX, me.y, 16)) { me.x = newX; moved = true; }
        if (newY !== me.y && isInsideMap(me.x, newY, 16)) { me.y = newY; moved = true; }
        
        if (moved) {
            if (!isHost && conn) {
                conn.send({ type: 'MOVE', x: me.x, y: me.y, walkFrame: me.walkFrame, isMoving: me.isMoving, facingDir: me.facingDir });
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

// --- AMONG US STYLE DROPSHIP DRAWING ---
function drawDropship(ctx, cx, cy, time) {
    const t = time * 0.003;

    // --- LEFT ENGINE POD ---
    const engGrad = ctx.createLinearGradient(cx - 340, cy - 60, cx - 200, cy + 60);
    engGrad.addColorStop(0, '#374151');
    engGrad.addColorStop(0.5, '#1f2937');
    engGrad.addColorStop(1, '#111827');
    ctx.fillStyle = engGrad;
    ctx.strokeStyle = '#4b5563';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cx - 340, cy - 50, 140, 110, 16);
    ctx.fill();
    ctx.stroke();
    // Engine intake vent
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(cx - 330, cy - 35, 120, 40, 8);
    ctx.fill();
    ctx.stroke();
    // Glowing thruster nozzles (6 blue lights)
    for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 3; col++) {
            const nx = cx - 310 + col * 38;
            const ny = cy + 30 + row * 22;
            const glow = 0.6 + Math.sin(t * 2 + col + row) * 0.4;
            ctx.fillStyle = 'rgba(56, 189, 248, ' + glow + ')';
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.ellipse(nx, ny, 10, 8, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.shadowBlur = 0;
    // Engine panel lines
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 340, cy - 10);
    ctx.lineTo(cx - 200, cy - 10);
    ctx.moveTo(cx - 340, cy + 15);
    ctx.lineTo(cx - 200, cy + 15);
    ctx.stroke();

    // --- RIGHT ENGINE POD ---
    ctx.fillStyle = engGrad;
    ctx.strokeStyle = '#4b5563';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cx + 200, cy - 50, 140, 110, 16);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(cx + 210, cy - 35, 120, 40, 8);
    ctx.fill();
    ctx.stroke();
    for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 3; col++) {
            const nx = cx + 220 + col * 38;
            const ny = cy + 30 + row * 22;
            const glow = 0.6 + Math.sin(t * 2 + col + row + 1) * 0.4;
            ctx.fillStyle = 'rgba(56, 189, 248, ' + glow + ')';
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.ellipse(nx, ny, 10, 8, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx + 200, cy - 10);
    ctx.lineTo(cx + 340, cy - 10);
    ctx.moveTo(cx + 200, cy + 15);
    ctx.lineTo(cx + 340, cy + 15);
    ctx.stroke();

    // --- MAIN SHIP HULL ---
    const hullGrad = ctx.createLinearGradient(cx - 180, cy - 130, cx + 180, cy + 170);
    hullGrad.addColorStop(0, '#374151');
    hullGrad.addColorStop(0.3, '#1f2937');
    hullGrad.addColorStop(0.7, '#111827');
    hullGrad.addColorStop(1, '#030712');
    ctx.fillStyle = hullGrad;
    ctx.strokeStyle = '#4b5563';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(cx - 180, cy - 130, 360, 300, 20);
    ctx.fill();
    ctx.stroke();
    // Hull border glow
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cx - 178, cy - 128, 356, 296, 18);
    ctx.stroke();

    // Hull rivets
    ctx.fillStyle = '#4b5563';
    [[cx-165,cy-115],[cx-165,cy+145],[cx+165,cy-115],[cx+165,cy+145],[cx-100,cy-115],[cx+100,cy-115],[cx-100,cy+145],[cx+100,cy+145]].forEach(function(p) {
        ctx.beginPath();
        ctx.arc(p[0], p[1], 3, 0, Math.PI * 2);
        ctx.fill();
    });

    // --- INTERIOR FLOOR ---
    const floorGrad = ctx.createLinearGradient(cx - 165, cy - 115, cx + 165, cy + 155);
    floorGrad.addColorStop(0, '#1a1f2e');
    floorGrad.addColorStop(0.5, '#151926');
    floorGrad.addColorStop(1, '#0d1117');
    ctx.fillStyle = floorGrad;
    ctx.beginPath();
    ctx.roundRect(cx - 165, cy - 115, 330, 270, 12);
    ctx.fill();
    // Floor grid
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.lineWidth = 1;
    for (let gx = cx - 155; gx <= cx + 155; gx += 30) {
        ctx.beginPath(); ctx.moveTo(gx, cy - 110); ctx.lineTo(gx, cy + 150); ctx.stroke();
    }
    for (let gy = cy - 110; gy <= cy + 150; gy += 30) {
        ctx.beginPath(); ctx.moveTo(cx - 160, gy); ctx.lineTo(cx + 160, gy); ctx.stroke();
    }

    // --- LEFT CONTROL PANEL ---
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(cx - 158, cy - 105, 45, 90, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(cx - 153, cy - 100, 35, 30, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(56, 189, 248, ' + (0.3 + Math.sin(t * 2) * 0.2) + ')';
    ctx.beginPath();
    ctx.roundRect(cx - 153, cy - 100, 35, 30, 4);
    ctx.fill();
    for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i === 0 ? '#ef4444' : i === 1 ? '#f59e0b' : '#10b981';
        ctx.beginPath();
        ctx.arc(cx - 140 + i * 12, cy - 62, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    // --- RIGHT CONTROL PANEL (Customization - clickable) ---
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(cx + 113, cy - 105, 45, 90, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(cx + 118, cy - 100, 35, 30, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(168, 85, 247, ' + (0.3 + Math.sin(t * 2.5) * 0.2) + ')';
    ctx.beginPath();
    ctx.roundRect(cx + 118, cy - 100, 35, 30, 4);
    ctx.fill();
    for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i === 0 ? '#38bdf8' : i === 1 ? '#a855f7' : '#f59e0b';
        ctx.beginPath();
        ctx.arc(cx + 130 + i * 12, cy - 62, 4, 0, Math.PI * 2);
        ctx.fill();
    }
    // Label
    ctx.fillStyle = '#a855f7';
    ctx.font = '800 9px Tajawal, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎨 تخصيص', cx + 135, cy - 45);

    // --- AIRLOCK DOOR (top) ---
    ctx.fillStyle = '#1f2937';
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cx - 45, cy - 128, 90, 25, 6);
    ctx.fill();
    ctx.stroke();
    for (let i = 0; i < 3; i++) {
        ctx.fillStyle = 'rgba(16, 185, 129, ' + (0.5 + Math.sin(t * 3 + i) * 0.5) + ')';
        ctx.beginPath();
        ctx.arc(cx - 20 + i * 20, cy - 115, 4, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.fillStyle = '#9ca3af';
    ctx.font = '800 9px Tajawal, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('AIRLOCK', cx, cy - 113);

    // --- CRATES ---
    function drawCrate(bx, by, bw, bh, shade) {
        ctx.fillStyle = shade;
        ctx.strokeStyle = '#4b5563';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, bh, 3);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = '#6b7280';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bx + bw/2, by);
        ctx.lineTo(bx + bw/2, by + bh);
        ctx.moveTo(bx, by + bh/2);
        ctx.lineTo(bx + bw, by + bh/2);
        ctx.stroke();
    }
    drawCrate(cx - 130, cy + 80, 35, 30, '#2d3748');
    drawCrate(cx - 95, cy + 95, 25, 22, '#374151');
    drawCrate(cx + 100, cy + 85, 30, 28, '#2d3748');
    drawCrate(cx + 130, cy + 100, 22, 20, '#374151');

    // --- COMPUTER CONSOLE (center - clickable for settings) ---
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cx - 40, cy - 85, 80, 40, 8);
    ctx.fill();
    ctx.stroke();
    var screenGlow = 0.4 + Math.sin(t * 2) * 0.3;
    ctx.fillStyle = 'rgba(56, 189, 248, ' + screenGlow + ')';
    ctx.beginPath();
    ctx.roundRect(cx - 35, cy - 80, 70, 28, 4);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(cx - 33, cy - 78, 66, 24, 3);
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.font = '800 10px Tajawal, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚙️ إعدادات', cx, cy - 62);
    // Keyboard base
    ctx.fillStyle = '#374151';
    ctx.beginPath();
    ctx.roundRect(cx - 30, cy - 52, 60, 10, 3);
    ctx.fill();

    // --- LABELS ---
    ctx.fillStyle = 'rgba(56, 189, 248, 0.5)';
    ctx.font = '800 8px Tajawal, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('💻 اضغط للإعدادات', cx, cy - 38);
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

        // Draw Among Us style dropship
        const cx = 600, cy = 250;
        drawDropship(ctx, cx, cy, Date.now());

        // 3. Draw 3D Astronaut Players Walking Inside the Realistic Starship Floor
        Object.values(players).forEach(p => {
            drawAstronaut(ctx, p.x, p.y, p.color, false, p.name, false, p.role, p.walkFrame || 0, p.isMoving || false);
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
        drawAstronaut(ctx, p.x, p.y, p.color, p.isDead, p.name, isTargeted, p.role, p.walkFrame || 0, p.isMoving || false);
    });
    
    ctx.restore();
    
    // Vision Fog (Simple Circle)
    if (!me.isDead) {
        const cx = canvas.width/2;
        const cy = canvas.height/2;
        const visionRadius = myRole === 'IMPOSTOR' ? gameSettings.vision * 1.5 : gameSettings.vision;
        
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
    meetingData = { caller: callerName, timer: gameSettings.votingTime, votes: {}, chat: [] };
    
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
function drawAstronaut(ctx, x, y, color, isDead, name, isTargeted, role, walkFrame, isMoving) {
    ctx.save();
    ctx.translate(x, y);

    if (isDead) {
        ctx.globalAlpha = 0.5;
    }

    // Shadow underneath astronaut
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 24, 20, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Targeted outline glow (if impostor target)
    if (isTargeted) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.roundRect(-28, -36, 56, 66, 22);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    // Walking animation
    const wf = walkFrame || 0;
    const legSwing = isMoving ? Math.sin(wf * 6) * 8 : 0;
    const bodyBob = isMoving ? Math.abs(Math.sin(wf * 6)) * 2 : 0;

    ctx.translate(0, -bodyBob);

    // Left Leg (animated)
    ctx.fillStyle = adjustColor(color, -15);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-16, 12, 13, 18, 6);
    ctx.fill();
    ctx.stroke();
    // Boot
    ctx.fillStyle = adjustColor(color, -30);
    ctx.beginPath();
    ctx.roundRect(-18, 26, 16, 8, 4);
    ctx.fill();
    ctx.stroke();

    // Right Leg (animated)
    ctx.fillStyle = adjustColor(color, -15);
    ctx.beginPath();
    ctx.roundRect(3, 12, 13, 18, 6);
    ctx.fill();
    ctx.stroke();
    // Boot
    ctx.fillStyle = adjustColor(color, -30);
    ctx.beginPath();
    ctx.roundRect(2, 26, 16, 8, 4);
    ctx.fill();
    ctx.stroke();

    // Backpack (Oxygen Tank) - Back layer
    ctx.fillStyle = adjustColor(color, -25);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-26, -10, 14, 32, 7);
    ctx.fill();
    ctx.stroke();
    // Backpack detail lines
    ctx.strokeStyle = adjustColor(color, -40);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-26, 0);
    ctx.lineTo(-12, 0);
    ctx.moveTo(-26, 10);
    ctx.lineTo(-12, 10);
    ctx.stroke();

    // Left Arm
    ctx.fillStyle = adjustColor(color, -8);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-28, -8, 12, 24, 6);
    ctx.fill();
    ctx.stroke();
    // Glove
    ctx.fillStyle = adjustColor(color, -35);
    ctx.beginPath();
    ctx.roundRect(-29, 14, 14, 8, 4);
    ctx.fill();
    ctx.stroke();

    // Right Arm
    ctx.fillStyle = adjustColor(color, -8);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(16, -8, 12, 24, 6);
    ctx.fill();
    ctx.stroke();
    // Glove
    ctx.fillStyle = adjustColor(color, -35);
    ctx.beginPath();
    ctx.roundRect(15, 14, 14, 8, 4);
    ctx.fill();
    ctx.stroke();

    // Body (Main Suit Capsule) with 3D Gradient Shading - BIGGER
    const bodyGrad = ctx.createLinearGradient(-18, -28, 18, 18);
    bodyGrad.addColorStop(0, adjustColor(color, 30));  // Top highlight
    bodyGrad.addColorStop(0.5, color);                  // Base color
    bodyGrad.addColorStop(1, adjustColor(color, -40));  // Bottom shadow

    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-18, -28, 36, 46, 16);
    ctx.fill();
    ctx.stroke();

    // Belt
    ctx.fillStyle = adjustColor(color, -25);
    ctx.beginPath();
    ctx.roundRect(-18, 8, 36, 6, 2);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Visor (Shiny Glass Helmet) - WIDER
    const visorGrad = ctx.createLinearGradient(-2, -20, 20, -2);
    visorGrad.addColorStop(0, '#e0f2fe');   // White glass reflection
    visorGrad.addColorStop(0.25, '#38bdf8'); // Cyan glow
    visorGrad.addColorStop(0.7, '#0ea5e9');  // Mid cyan
    visorGrad.addColorStop(1, '#0369a1');    // Deep cyan shadow

    ctx.fillStyle = visorGrad;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-6, -22, 28, 20, 10);
    ctx.fill();
    ctx.stroke();

    // Visor Glare Arc (shine effect)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.ellipse(2, -16, 7, 3.5, -Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();

    // Small visor reflection dot
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(12, -14, 2, 0, Math.PI * 2);
    ctx.fill();

    // Impostor Badge for Teammates
    if (role === 'IMPOSTOR' && (myRole === 'IMPOSTOR' || isDead)) {
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 12px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('🔪', 0, -34);
    }

    // Player Name Tag
    if (name) {
        ctx.font = '900 13px Tajawal, system-ui, sans-serif';
        ctx.textAlign = 'center';

        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeText(name, 0, -36);

        ctx.fillStyle = '#ffffff';
        ctx.fillText(name, 0, -36);
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
