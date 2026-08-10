const prompts = [
    "اسم حيوان بحرف الميم (م)", "اسم نبات بحرف السين (س)", "اسم ولد بحرف الألف (أ)",
    "اسم بنت بحرف النون (ن)", "اسم دولة عربية", "اسم مدينة أوروبية", "شيء موجود في المطبخ",
    "شيء لونه أحمر", "شيء يطير", "رياضة تلعب بالكرة", "اسم فيلم مصري", "اسم ممثل أجنبي",
    "أكلة شعبية", "شيء تصطحبه معك للسفر", "ماركة سيارات", "اسم فاكهة بحرف الباء (ب)",
    "مهنة تبدأ بحرف الميم (م)", "شيء تجده في المدرسة", "جزء من جسم الإنسان", "وسيلة مواصلات"
];

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

// Audio
let audioContext = null;
function initAudio() {
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume();
}
function playTickSound() {
    if (!audioContext) return;
    const osc = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(400, audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.1);
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    osc.connect(gainNode);
    gainNode.connect(audioContext.destination);
    osc.start(); osc.stop(audioContext.currentTime + 0.1);
}
function playExplosionSound() {
    if (!audioContext) return;
    const osc = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
    gainNode.gain.setValueAtTime(1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
    osc.connect(gainNode);
    gainNode.connect(audioContext.destination);
    osc.start(); osc.stop(audioContext.currentTime + 1);
}

// Global Mode
let playMode = 'online';

// --- LOCAL LOGIC ---
let localBombTimer = null;
let localVisualTickTimer = null;
let localStartTime = 0;
let localDuration = 0;

function startLocalGame() {
    playMode = 'local';
    initAudio();
    showScreen('game-screen');
    
    document.getElementById('local-turn-text').classList.remove('hidden');
    document.getElementById('online-turn-text').classList.add('hidden');
    document.getElementById('action-controls').classList.remove('hidden');
    document.getElementById('wait-controls').classList.add('hidden');
    
    document.getElementById('category-text').innerText = prompts[Math.floor(Math.random() * prompts.length)];
    
    localDuration = Math.floor(Math.random() * (45000 - 15000 + 1)) + 15000;
    localStartTime = Date.now();
    
    clearTimeout(localBombTimer);
    localBombTimer = setTimeout(() => {
        localExplode();
    }, localDuration);
    
    startLocalVisualTick();
}

function startLocalVisualTick() {
    clearTimeout(localVisualTickTimer);
    document.getElementById('bomb').classList.add('bomb-tick');
    
    const tickLoop = () => {
        playTickSound();
        const timeElapsed = Date.now() - localStartTime;
        let tickInterval = 1000;
        
        if (timeElapsed > localDuration - 5000) {
            tickInterval = 250;
            document.getElementById('bomb').style.animationDuration = '0.1s';
        } else if (timeElapsed > localDuration - 10000) {
            tickInterval = 500;
            document.getElementById('bomb').style.animationDuration = '0.25s';
        } else {
            document.getElementById('bomb').style.animationDuration = '0.5s';
        }
        
        localVisualTickTimer = setTimeout(tickLoop, tickInterval);
    };
    tickLoop();
}

function localExplode() {
    clearTimeout(localVisualTickTimer);
    document.getElementById('bomb').classList.remove('bomb-tick');
    playExplosionSound();
    
    document.body.classList.add('bg-flash');
    setTimeout(() => { document.body.classList.remove('bg-flash'); }, 1000);
    
    showScreen('explosion-screen');
    document.getElementById('loser-msg').classList.add('hidden');
    document.getElementById('local-loser-msg').classList.remove('hidden');
    
    document.getElementById('host-restart-controls').classList.add('hidden');
    document.getElementById('local-restart-controls').classList.remove('hidden');
}


// --- ONLINE LOGIC ---
let peer = null;
let myId = null;
let myName = null;
let isHost = false;

let connections = []; 
let hostConn = null;

let gameState = {
    phase: 'lobby', 
    players: [], 
    turnId: null,
    category: "",
    duration: 0,
    startTime: 0
};

function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    for(let i=0; i<4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
}

function showCreateRoom() {
    playMode = 'online';
    isHost = true;
    myName = "المضيف (أنت)";
    const roomCode = generateRoomCode();
    myId = "BOMB-" + roomCode;
    document.getElementById('room-code-display').innerText = roomCode;
    showScreen('host-screen');
    initPeer(myId);
}

function showJoinRoom() {
    playMode = 'online';
    isHost = false;
    showScreen('join-screen');
}

function initPeer(id) {
    peer = new Peer(id);
    peer.on('open', (id) => {
        if (isHost) {
            connections.push({ id: myId, name: myName, conn: null });
            gameState.players.push({ id: myId, name: myName });
            updateHostLobby();
        }
    });
    peer.on('connection', (conn) => {
        if (isHost) setupHostConnection(conn);
    });
    peer.on('error', (err) => {
        if (isHost) alert("خطأ في الإنشاء.");
        else document.getElementById('join-status').innerText = "خطأ: الغرفة غير موجودة.";
    });
}

function setupHostConnection(conn) {
    conn.on('open', () => {
        conn.on('data', (data) => {
            if (data.type === 'JOIN') {
                connections.push({ id: conn.peer, name: data.name, conn: conn });
                gameState.players.push({ id: conn.peer, name: data.name });
                updateHostLobby();
                broadcastState();
            } else if (data.type === 'PASS' && data.peerId === gameState.turnId && gameState.phase === 'playing') {
                hostNextTurn();
            }
        });
    });
    conn.on('close', () => {
        connections = connections.filter(c => c.id !== conn.peer);
        gameState.players = gameState.players.filter(p => p.id !== conn.peer);
        updateHostLobby();
        broadcastState();
    });
}

function updateHostLobby() {
    document.getElementById('host-players-count').innerText = connections.length;
    const list = document.getElementById('host-players-list');
    list.innerHTML = '';
    connections.forEach(c => {
        const li = document.createElement('li');
        li.innerText = c.name;
        list.appendChild(li);
    });
    document.getElementById('start-online-btn').disabled = (connections.length < 2);
}

function broadcastState() {
    if (!isHost) return;
    connections.forEach(c => {
        if (c.conn) c.conn.send({ type: 'STATE_UPDATE', state: gameState });
    });
}

function joinRoom() {
    const nameInput = document.getElementById('player-name-input').value.trim();
    const codeInput = document.getElementById('room-code-input').value.trim().toUpperCase();
    if (!nameInput) { document.getElementById('join-status').innerText = "أدخل اسمك!"; return; }
    if (codeInput.length !== 4) { document.getElementById('join-status').innerText = "كود الغرفة 4 أحرف!"; return; }
    
    myName = nameInput;
    document.getElementById('join-status').innerText = "جاري الاتصال...";
    
    peer = new Peer();
    peer.on('open', (id) => {
        myId = id;
        hostConn = peer.connect('BOMB-' + codeInput);
        hostConn.on('open', () => {
            hostConn.send({ type: 'JOIN', name: myName });
            document.getElementById('guest-room-id').innerText = codeInput;
            showScreen('guest-waiting-screen');
        });
        hostConn.on('data', (data) => {
            if (data.type === 'STATE_UPDATE') handleStateUpdate(data.state);
        });
        hostConn.on('close', () => { alert("الغرفة أغلقت"); leaveRoom(); });
    });
}

// Game Logic
let hostBombTimer = null;
let visualTickTimer = null;

function handleStateUpdate(state) {
    gameState = state;
    
    if (state.phase === 'lobby') {
        const list = document.getElementById('guest-players-list');
        list.innerHTML = '';
        state.players.forEach(p => {
            const li = document.createElement('li');
            li.innerText = p.name + (p.id === myId ? " (أنت)" : "");
            list.appendChild(li);
        });
        showScreen('guest-waiting-screen');
    } else if (state.phase === 'playing') {
        initAudio();
        showScreen('game-screen');
        
        document.getElementById('local-turn-text').classList.add('hidden');
        document.getElementById('online-turn-text').classList.remove('hidden');
        
        const turnPlayer = state.players.find(p => p.id === state.turnId);
        document.getElementById('current-player-name').innerText = turnPlayer ? turnPlayer.name : "...";
        document.getElementById('category-text').innerText = state.category;
        
        if (state.turnId === myId) {
            document.getElementById('action-controls').classList.remove('hidden');
            document.getElementById('wait-controls').classList.add('hidden');
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        } else {
            document.getElementById('action-controls').classList.add('hidden');
            document.getElementById('wait-controls').classList.remove('hidden');
        }
        
        startVisualTick();
    } else if (state.phase === 'exploded') {
        explodeVisual();
    }
}

function startOnlineGame() {
    if (!isHost) return;
    gameState.phase = 'playing';
    gameState.duration = Math.floor(Math.random() * (45000 - 15000 + 1)) + 15000;
    gameState.startTime = Date.now();
    
    gameState.turnId = gameState.players[Math.floor(Math.random() * gameState.players.length)].id;
    gameState.category = prompts[Math.floor(Math.random() * prompts.length)];
    
    broadcastState();
    handleStateUpdate(JSON.parse(JSON.stringify(gameState)));
    
    clearTimeout(hostBombTimer);
    hostBombTimer = setTimeout(() => {
        hostExplode();
    }, gameState.duration);
}

function hostNextTurn() {
    if (!isHost) return;
    let currentIndex = gameState.players.findIndex(p => p.id === gameState.turnId);
    currentIndex = (currentIndex + 1) % gameState.players.length;
    
    gameState.turnId = gameState.players[currentIndex].id;
    gameState.category = prompts[Math.floor(Math.random() * prompts.length)];
    
    broadcastState();
    handleStateUpdate(JSON.parse(JSON.stringify(gameState)));
}

function passBomb() {
    initAudio();
    if (playMode === 'local') {
        document.getElementById('category-text').innerText = prompts[Math.floor(Math.random() * prompts.length)];
    } else {
        if (isHost) {
            hostNextTurn();
        } else {
            hostConn.send({ type: 'PASS', peerId: myId });
        }
    }
}

function hostExplode() {
    if (!isHost) return;
    gameState.phase = 'exploded';
    broadcastState();
    handleStateUpdate(JSON.parse(JSON.stringify(gameState)));
}

function startVisualTick() {
    clearTimeout(visualTickTimer);
    document.getElementById('bomb').classList.add('bomb-tick');
    
    const tickLoop = () => {
        if (gameState.phase !== 'playing') return;
        playTickSound();
        
        const timeElapsed = Date.now() - gameState.startTime;
        let tickInterval = 1000;
        
        if (timeElapsed > gameState.duration - 5000) {
            tickInterval = 250;
            document.getElementById('bomb').style.animationDuration = '0.1s';
        } else if (timeElapsed > gameState.duration - 10000) {
            tickInterval = 500;
            document.getElementById('bomb').style.animationDuration = '0.25s';
        } else {
            document.getElementById('bomb').style.animationDuration = '0.5s';
        }
        
        visualTickTimer = setTimeout(tickLoop, tickInterval);
    };
    tickLoop();
}

function explodeVisual() {
    clearTimeout(visualTickTimer);
    document.getElementById('bomb').classList.remove('bomb-tick');
    playExplosionSound();
    
    document.body.classList.add('bg-flash');
    setTimeout(() => { document.body.classList.remove('bg-flash'); }, 1000);
    
    showScreen('explosion-screen');
    document.getElementById('loser-msg').classList.remove('hidden');
    document.getElementById('local-loser-msg').classList.add('hidden');
    
    const loser = gameState.players.find(p => p.id === gameState.turnId);
    document.getElementById('loser-name').innerText = loser ? loser.name : "...";
    
    if (isHost) {
        document.getElementById('host-restart-controls').classList.remove('hidden');
    } else {
        document.getElementById('host-restart-controls').classList.add('hidden');
    }
    document.getElementById('local-restart-controls').classList.add('hidden');
}

function leaveRoom() {
    if (peer) { peer.destroy(); peer = null; }
    window.location.reload();
}
