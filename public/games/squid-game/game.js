function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

// Audio
const greenAudio = document.getElementById('green-light-audio');
const redAudio = document.getElementById('red-light-audio');
const shotAudio = document.getElementById('shot-audio');

function playAudio(type) {
    try {
        if (type === 'green') {
            redAudio.pause();
            redAudio.currentTime = 0;
            greenAudio.play().catch(e=>{});
        } else if (type === 'red') {
            greenAudio.pause();
            greenAudio.currentTime = 0;
            redAudio.play().catch(e=>{});
        } else if (type === 'shot') {
            shotAudio.currentTime = 0;
            shotAudio.play().catch(e=>{});
        }
    } catch(e) {}
}

let playMode = 'online';

// --- LOCAL LOGIC ---
let localLightTimeout = null;
let localIsGreen = false;
let localRunning = { top: false, bottom: false };
let localPos = { top: 0, bottom: 0 };
let localStatus = { top: 'playing', bottom: 'playing' };
let localInterval = null;

function startLocalGame() {
    playMode = 'local';
    
    localIsGreen = false;
    localRunning = { top: false, bottom: false };
    localPos = { top: 0, bottom: 0 };
    localStatus = { top: 'playing', bottom: 'playing' };
    
    document.getElementById('char-top').style.left = '0%';
    document.getElementById('my-char').style.left = '0%';
    document.getElementById('char-top').innerText = "🏃‍♂️";
    document.getElementById('my-char').innerText = "🏃‍♂️";
    
    document.getElementById('btn-top').disabled = false;
    document.getElementById('my-btn').disabled = false;
    document.getElementById('btn-top').style.background = '';
    document.getElementById('my-btn').style.background = '';
    
    document.getElementById('game-screen').classList.add('local-mode');
    document.getElementById('game-screen').classList.remove('online-mode');
    document.getElementById('top-area').classList.remove('hidden');
    document.getElementById('online-opponents').classList.add('hidden');
    
    showScreen('game-screen');
    scheduleLocalLight();
}

function scheduleLocalLight() {
    if (playMode !== 'local') return;
    
    const time = localIsGreen ? (Math.random() * 2000 + 2000) : (Math.random() * 2000 + 1000);
    localLightTimeout = setTimeout(() => {
        localIsGreen = !localIsGreen;
        const ind = document.getElementById('light-indicator');
        if (localIsGreen) {
            ind.className = 'light-green';
            playAudio('green');
        } else {
            ind.className = 'light-red';
            playAudio('red');
            checkLocalEliminations();
        }
        scheduleLocalLight();
    }, time);
}

function startRunLocal(player) {
    if (playMode !== 'local') return;
    if (localStatus[player] !== 'playing') return;
    try { if(greenAudio.context && greenAudio.context.state === 'suspended') greenAudio.context.resume(); } catch(e){}
    
    localRunning[player] = true;
    
    if (!localIsGreen) {
        eliminateLocal(player);
        return;
    }
    
    if (!localInterval) {
        localInterval = setInterval(updateLocalPos, 50);
    }
}

function stopRunLocal(player) {
    if (playMode !== 'local') return;
    localRunning[player] = false;
    if (!localRunning.top && !localRunning.bottom) {
        clearInterval(localInterval);
        localInterval = null;
    }
}

function updateLocalPos() {
    ['top', 'bottom'].forEach(p => {
        if (localRunning[p] && localStatus[p] === 'playing') {
            if (!localIsGreen) {
                eliminateLocal(p);
            } else {
                localPos[p] += 1;
                const charId = p === 'top' ? 'char-top' : 'my-char';
                document.getElementById(charId).style.left = localPos[p] + '%';
                
                if (localPos[p] >= 100) {
                    localPos[p] = 100;
                    localStatus[p] = 'finished';
                    document.getElementById(charId).innerText = "🏆";
                    stopRunLocal(p);
                    checkLocalEnd();
                }
            }
        }
    });
}

function eliminateLocal(player) {
    localStatus[player] = 'eliminated';
    stopRunLocal(player);
    playAudio('shot');
    
    const charId = player === 'top' ? 'char-top' : 'my-char';
    const btnId = player === 'top' ? 'btn-top' : 'my-btn';
    
    document.getElementById(charId).innerText = "💀";
    document.getElementById(btnId).disabled = true;
    document.getElementById(btnId).style.background = '#6b7280';
    
    checkLocalEnd();
}

function checkLocalEnd() {
    if (localStatus.top !== 'playing' && localStatus.bottom !== 'playing') {
        clearTimeout(localLightTimeout);
        clearInterval(localInterval);
        
        let msg = "";
        if (localStatus.top === 'finished' && localStatus.bottom === 'finished') msg = "الجميع فاز!";
        else if (localStatus.top === 'eliminated' && localStatus.bottom === 'eliminated') msg = "الجميع خسر!";
        else if (localStatus.top === 'finished') msg = "فاز اللاعب العلوي!";
        else msg = "فاز اللاعب السفلي!";
        
        setTimeout(() => {
            showScreen('winner-screen');
            document.getElementById('winner-title').innerText = msg;
            document.getElementById('online-winners-view').classList.add('hidden');
            document.getElementById('local-winners-view').classList.remove('hidden');
        }, 1000);
    }
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
    isGreenLight: false
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
    myId = "SQUID-" + roomCode;
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
            gameState.players.push({ id: myId, name: myName, pos: 0, status: 'playing' });
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
                gameState.players.push({ id: conn.peer, name: data.name, pos: 0, status: 'playing' });
                updateHostLobby();
                broadcastState();
            } else if (data.type === 'POS_UPDATE' && gameState.phase === 'playing') {
                const player = gameState.players.find(p => p.id === conn.peer);
                if (player && player.status === 'playing') {
                    player.pos = data.pos;
                    if (data.pos >= 100) player.status = 'finished';
                    checkEndGame();
                }
            } else if (data.type === 'ELIMINATED' && gameState.phase === 'playing') {
                const player = gameState.players.find(p => p.id === conn.peer);
                if (player) player.status = 'eliminated';
                checkEndGame();
                playAudio('shot');
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
        hostConn = peer.connect('SQUID-' + codeInput);
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
let gameInterval = null;
let lightTimeout = null;
let myPos = 0;
let amIEliminated = false;
let amIFinished = false;
let isRunningLocal = false;

function startOnlineGame() {
    if (!isHost) return;
    gameState.phase = 'playing';
    gameState.isGreenLight = false;
    gameState.players.forEach(p => { p.pos = 0; p.status = 'playing'; });
    
    broadcastState();
    handleStateUpdate(JSON.parse(JSON.stringify(gameState)));
    
    scheduleLightChange();
}

function scheduleLightChange() {
    if (!isHost || gameState.phase !== 'playing') return;
    
    const time = gameState.isGreenLight ? (Math.random() * 2000 + 2000) : (Math.random() * 2000 + 1000);
    lightTimeout = setTimeout(() => {
        gameState.isGreenLight = !gameState.isGreenLight;
        broadcastState();
        handleStateUpdate(JSON.parse(JSON.stringify(gameState)));
        scheduleLightChange();
    }, time);
}

function checkEndGame() {
    if (!isHost || gameState.phase !== 'playing') return;
    const allDone = gameState.players.every(p => p.status !== 'playing');
    if (allDone) {
        clearTimeout(lightTimeout);
        gameState.phase = 'winner';
        broadcastState();
        handleStateUpdate(JSON.parse(JSON.stringify(gameState)));
    }
}

function startRun() {
    if (playMode === 'local') {
        startRunLocal('bottom');
        return;
    }
    
    if (gameState.phase !== 'playing' || amIEliminated || amIFinished) return;
    
    try { if(greenAudio.context && greenAudio.context.state === 'suspended') greenAudio.context.resume(); } catch(e){}
    
    isRunningLocal = true;
    
    if (!gameState.isGreenLight) {
        eliminateMe();
        return;
    }
    
    if (!gameInterval) {
        gameInterval = setInterval(() => {
            if (!isRunningLocal) return;
            
            if (!gameState.isGreenLight) {
                eliminateMe();
                return;
            }
            
            myPos += 1;
            if (myPos >= 100) {
                myPos = 100;
                amIFinished = true;
                stopRun();
                document.getElementById('my-char').innerText = "🏆";
            }
            
            document.getElementById('my-char').style.left = myPos + '%';
            
            if (isHost) {
                const p = gameState.players.find(p => p.id === myId);
                p.pos = myPos;
                if (amIFinished) p.status = 'finished';
                checkEndGame();
            } else {
                hostConn.send({ type: 'POS_UPDATE', pos: myPos });
            }
            
        }, 50);
    }
}

function stopRun() {
    if (playMode === 'local') {
        stopRunLocal('bottom');
        return;
    }
    
    isRunningLocal = false;
    clearInterval(gameInterval);
    gameInterval = null;
}

function eliminateMe() {
    stopRun();
    amIEliminated = true;
    document.getElementById('my-char').innerText = "💀";
    document.getElementById('my-btn').disabled = true;
    document.getElementById('my-btn').style.background = '#6b7280';
    playAudio('shot');
    
    if (isHost) {
        const p = gameState.players.find(p => p.id === myId);
        p.status = 'eliminated';
        checkEndGame();
    } else {
        hostConn.send({ type: 'ELIMINATED' });
    }
}

function handleStateUpdate(state) {
    let wasGreen = gameState.isGreenLight;
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
        document.getElementById('game-screen').classList.remove('local-mode');
        document.getElementById('game-screen').classList.add('online-mode');
        document.getElementById('top-area').classList.add('hidden');
        document.getElementById('online-opponents').classList.remove('hidden');
        
        myPos = 0;
        amIEliminated = false;
        amIFinished = false;
        document.getElementById('my-char').style.left = '0%';
        document.getElementById('my-char').innerText = "🏃‍♂️";
        document.getElementById('my-btn').disabled = false;
        document.getElementById('my-btn').style.background = '';
        
        showScreen('game-screen');
        
        const ind = document.getElementById('light-indicator');
        if (state.isGreenLight) {
            ind.className = 'light-green';
            if (!wasGreen) playAudio('green');
        } else {
            ind.className = 'light-red';
            if (wasGreen) playAudio('red');
            
            if (isRunningLocal) eliminateMe();
        }
        
        const oppCont = document.getElementById('opponents-chars-container');
        oppCont.innerHTML = '';
        state.players.forEach(p => {
            if (p.id === myId) return; 
            const div = document.createElement('div');
            div.className = 'opponent-char';
            div.style.left = p.pos + '%';
            if (p.status === 'eliminated') div.innerText = "💀";
            else if (p.status === 'finished') div.innerText = "🏆";
            else div.innerText = "🏃";
            oppCont.appendChild(div);
        });
        
    } else if (state.phase === 'winner') {
        stopRun();
        showScreen('winner-screen');
        
        document.getElementById('winner-title').innerText = "انتهت اللعبة!";
        document.getElementById('online-winners-view').classList.remove('hidden');
        document.getElementById('local-winners-view').classList.add('hidden');
        
        const winList = document.getElementById('winners-list');
        const loseList = document.getElementById('losers-list');
        winList.innerHTML = 'الفائزون: ';
        loseList.innerHTML = 'المقصيون: ';
        
        state.players.forEach(p => {
            if (p.status === 'finished') winList.innerHTML += p.name + "، ";
            if (p.status === 'eliminated') loseList.innerHTML += p.name + "، ";
        });
        
        if (isHost) {
            document.getElementById('host-restart-controls').classList.remove('hidden');
            document.getElementById('guest-restart-wait').classList.add('hidden');
        } else {
            document.getElementById('host-restart-controls').classList.add('hidden');
            document.getElementById('guest-restart-wait').classList.remove('hidden');
        }
    }
}

function leaveRoom() {
    if (peer) { peer.destroy(); peer = null; }
    window.location.reload();
}
