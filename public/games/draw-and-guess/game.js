const words = [
    "شجرة", "سيارة", "بيت", "شمس", "قمر", "نجمة", "بحر", "جبل", "وردة", "عصفور",
    "قطة", "كلب", "حصان", "سمكة", "تفاحة", "موز", "برتقال", "كتاب", "قلم", "طاولة",
    "كرسي", "سرير", "باب", "شباك", "كمبيوتر", "هاتف", "تلفزيون", "ساعة", "نظارة", "حذاء",
    "طائرة", "سفينة", "دراجة", "قطار", "صاروخ", "كرة", "نار", "ثلج", "مطر", "سحابة"
];

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

// Canvas Setup
const canvas = document.getElementById('drawing-canvas');
const ctx = canvas.getContext('2d');
let isDrawing = false;
let currentX = 0;
let currentY = 0;
let currentColor = '#000000';
let currentLineWidth = 5;
let isEraser = false;

function resizeCanvas() {
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
}
window.addEventListener('resize', resizeCanvas);
setTimeout(resizeCanvas, 100);

// --- LOCAL LOGIC ---
let playMode = 'online';
let localTotalRounds = 3;
let localCurrentRound = 1;
let localScore = 0;
let localSecretWord = "";
let localTimerInterval = null;

function showLocalSetup() {
    playMode = 'local';
    showScreen('local-setup-screen');
}

function changeLocalRounds(delta) {
    localTotalRounds += delta;
    if (localTotalRounds < 1) localTotalRounds = 1;
    if (localTotalRounds > 10) localTotalRounds = 10;
    document.getElementById('local-rounds-count').innerText = localTotalRounds;
}

function startLocalGame() {
    localCurrentRound = 1;
    localScore = 0;
    startLocalRound();
}

function startLocalRound() {
    localSecretWord = words[Math.floor(Math.random() * words.length)];
    
    showScreen('word-reveal-screen');
    document.getElementById('role-title').innerText = `الجولة ${localCurrentRound} من ${localTotalRounds}`;
    document.getElementById('role-desc').innerText = "الرسام الحالي، انظر للكلمة ولا تدع البقية يرونها:";
    document.getElementById('secret-word').innerText = localSecretWord;
    document.getElementById('start-drawing-btn').classList.remove('hidden');
    document.getElementById('wait-drawer-msg').classList.add('hidden');
}

function startLocalDrawing() {
    showScreen('drawing-screen');
    resizeCanvas();
    emitClearCanvas();
    
    document.getElementById('drawer-toolbar').classList.remove('hidden');
    document.getElementById('guesser-ui').classList.add('hidden');
    document.getElementById('host-drawing-controls').classList.add('hidden');
    document.getElementById('local-drawing-controls').classList.remove('hidden');
    
    let timeRemaining = 90;
    document.getElementById('timer-display').innerText = timeRemaining;
    
    clearInterval(localTimerInterval);
    localTimerInterval = setInterval(() => {
        timeRemaining--;
        document.getElementById('timer-display').innerText = timeRemaining;
        if (timeRemaining <= 0) {
            endDrawingPhase('timeout');
        }
    }, 1000);
}

// Global drawing hooks
function startDrawingPhase() {
    if (playMode === 'local') {
        startLocalDrawing();
    } else {
        hostStartDrawing();
    }
}

function endDrawingPhase(reason) {
    if (playMode === 'local') {
        clearInterval(localTimerInterval);
        
        if (reason === 'guessed') {
            localScore++;
            document.getElementById('round-result-title').innerText = "تخمين صحيح! 🎉";
            document.getElementById('round-result-title').style.color = "#10b981";
        } else {
            document.getElementById('round-result-title').innerText = "انتهى الوقت! ❌";
            document.getElementById('round-result-title').style.color = "#ef4444";
        }
        
        showScreen('score-screen');
        document.getElementById('round-result-word').innerText = `الكلمة كانت: ${localSecretWord}`;
        
        document.getElementById('online-scoreboard').style.display = 'none';
        document.getElementById('local-scoreboard').style.display = 'block';
        document.getElementById('local-total-score').innerText = localScore;
        
        document.getElementById('host-score-controls').classList.add('hidden');
        document.getElementById('guest-score-wait').classList.add('hidden');
        document.getElementById('local-score-controls').classList.remove('hidden');
        
        if (localCurrentRound >= localTotalRounds) {
            document.getElementById('local-next-round-btn').classList.add('hidden');
            document.getElementById('local-finish-btn').classList.remove('hidden');
        } else {
            document.getElementById('local-next-round-btn').classList.remove('hidden');
            document.getElementById('local-finish-btn').classList.add('hidden');
        }
        
    } else {
        hostEndDrawing(reason);
    }
}

function localNextRound() {
    localCurrentRound++;
    startLocalRound();
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
    drawerId: null,
    secretWord: null,
    totalRounds: 3,
    currentRound: 0,
    timeRemaining: 90,
    roundResult: null,
    winnerName: null
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
    myId = "DRAW-" + roomCode;
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
            gameState.players.push({ id: myId, name: myName, score: 0 });
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
                gameState.players.push({ id: conn.peer, name: data.name, score: 0 });
                updateHostLobby();
                broadcastState();
            } else if (data.type === 'DRAW_LINE' && gameState.phase === 'drawing') {
                broadcastDrawData(data);
            } else if (data.type === 'CLEAR_CANVAS' && gameState.phase === 'drawing') {
                broadcastDrawData(data);
            } else if (data.type === 'GUESS' && gameState.phase === 'drawing') {
                hostCheckGuess(conn.peer, data.guess);
            } else if (data.type === 'DRAWER_READY') {
                hostStartDrawing();
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

function broadcastDrawData(data) {
    connections.forEach(c => {
        if (c.conn && c.id !== data.senderId) {
            c.conn.send(data);
        }
    });
    handleDrawData(data);
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

function changeRounds(delta) {
    gameState.totalRounds += delta;
    if (gameState.totalRounds < 1) gameState.totalRounds = 1;
    if (gameState.totalRounds > 10) gameState.totalRounds = 10;
    document.getElementById('rounds-count').innerText = gameState.totalRounds;
}

function broadcastState() {
    if (!isHost) return;
    connections.forEach(c => {
        if (c.conn) {
            let stateClone = JSON.parse(JSON.stringify(gameState));
            if (c.id !== gameState.drawerId && gameState.phase === 'drawing_wait') {
                stateClone.secretWord = null;
            }
            c.conn.send({ type: 'STATE_UPDATE', state: stateClone });
        }
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
        hostConn = peer.connect('DRAW-' + codeInput);
        hostConn.on('open', () => {
            hostConn.send({ type: 'JOIN', name: myName });
            document.getElementById('guest-room-id').innerText = codeInput;
            showScreen('guest-waiting-screen');
        });
        hostConn.on('data', (data) => {
            if (data.type === 'STATE_UPDATE') {
                handleStateUpdate(data.state);
            } else if (data.type === 'DRAW_LINE' || data.type === 'CLEAR_CANVAS') {
                handleDrawData(data);
            }
        });
        hostConn.on('close', () => { alert("الغرفة أغلقت"); leaveRoom(); });
    });
}

function startOnlineGame() {
    if (!isHost) return;
    gameState.currentRound = 0;
    gameState.players.forEach(p => p.score = 0);
    hostNextRound();
}

function hostNextRound() {
    if (!isHost) return;
    gameState.currentRound++;
    if (gameState.currentRound > gameState.totalRounds) {
        // End Game
        alert("انتهت اللعبة!");
        leaveRoom();
        return;
    }
    
    gameState.phase = 'drawing_wait';
    gameState.secretWord = words[Math.floor(Math.random() * words.length)];
    gameState.drawerId = gameState.players[(gameState.currentRound - 1) % gameState.players.length].id;
    gameState.timeRemaining = 90;
    
    broadcastState();
    handleStateUpdate(JSON.parse(JSON.stringify(gameState)));
}

let hostTimerInterval = null;

function hostStartDrawing() {
    if (!isHost) {
        hostConn.send({ type: 'DRAWER_READY' });
        return;
    }
    gameState.phase = 'drawing';
    broadcastState();
    handleStateUpdate(JSON.parse(JSON.stringify(gameState)));
    
    emitClearCanvas();
    
    clearInterval(hostTimerInterval);
    hostTimerInterval = setInterval(() => {
        gameState.timeRemaining--;
        if (gameState.timeRemaining % 5 === 0) broadcastState();
        document.getElementById('timer-display').innerText = gameState.timeRemaining;
        
        if (gameState.timeRemaining <= 0) {
            hostEndDrawing('timeout');
        }
    }, 1000);
}

function hostCheckGuess(playerId, guess) {
    if (!isHost || gameState.phase !== 'drawing') return;
    if (guess.trim() === gameState.secretWord) {
        const player = gameState.players.find(p => p.id === playerId);
        const drawer = gameState.players.find(p => p.id === gameState.drawerId);
        if (player) player.score += 10;
        if (drawer) drawer.score += 5;
        
        gameState.winnerName = player.name;
        hostEndDrawing('guessed');
    }
}

function hostEndDrawing(reason) {
    if (!isHost) return;
    clearInterval(hostTimerInterval);
    gameState.phase = 'score';
    gameState.roundResult = reason;
    broadcastState();
    handleStateUpdate(JSON.parse(JSON.stringify(gameState)));
}

function submitGuess() {
    if (playMode === 'local') return;
    const guess = document.getElementById('guess-input').value;
    if (guess && !isHost) {
        hostConn.send({ type: 'GUESS', guess: guess });
        document.getElementById('guess-input').value = '';
    } else if (guess && isHost) {
        hostCheckGuess(myId, guess);
        document.getElementById('guess-input').value = '';
    }
}

function handleStateUpdate(state) {
    let oldPhase = gameState.phase;
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
    } else if (state.phase === 'drawing_wait') {
        showScreen('word-reveal-screen');
        if (state.drawerId === myId) {
            document.getElementById('role-title').innerText = "دورك في الرسم!";
            document.getElementById('role-desc').innerText = "انظر للكلمة ولا تخبر أحداً بها:";
            document.getElementById('secret-word').innerText = state.secretWord;
            document.getElementById('start-drawing-btn').classList.remove('hidden');
            document.getElementById('wait-drawer-msg').classList.add('hidden');
        } else {
            const drawer = state.players.find(p => p.id === state.drawerId);
            document.getElementById('role-title').innerText = "استعد للتخمين!";
            document.getElementById('role-desc').innerText = `الرسام الآن هو: ${drawer ? drawer.name : ''}`;
            document.getElementById('secret-word').innerText = "???";
            document.getElementById('start-drawing-btn').classList.add('hidden');
            document.getElementById('wait-drawer-msg').classList.remove('hidden');
        }
    } else if (state.phase === 'drawing') {
        if (oldPhase !== 'drawing') {
            showScreen('drawing-screen');
            resizeCanvas();
        }
        
        document.getElementById('timer-display').innerText = state.timeRemaining;
        
        if (state.drawerId === myId) {
            document.getElementById('drawer-toolbar').classList.remove('hidden');
            document.getElementById('guesser-ui').classList.add('hidden');
            document.getElementById('local-drawing-controls').classList.add('hidden');
            
            if (isHost) {
                document.getElementById('host-drawing-controls').classList.remove('hidden');
            } else {
                document.getElementById('host-drawing-controls').classList.add('hidden');
            }
        } else {
            document.getElementById('drawer-toolbar').classList.add('hidden');
            document.getElementById('guesser-ui').classList.remove('hidden');
            document.getElementById('host-drawing-controls').classList.add('hidden');
            document.getElementById('local-drawing-controls').classList.add('hidden');
        }
    } else if (state.phase === 'score') {
        showScreen('score-screen');
        
        if (state.roundResult === 'guessed') {
            document.getElementById('round-result-title').innerText = `خمّنها ${state.winnerName}! 🎉`;
            document.getElementById('round-result-title').style.color = "#10b981";
        } else {
            document.getElementById('round-result-title').innerText = "انتهى الوقت! ❌";
            document.getElementById('round-result-title').style.color = "#ef4444";
        }
        
        document.getElementById('round-result-word').innerText = `الكلمة كانت: ${state.secretWord}`;
        
        document.getElementById('online-scoreboard').style.display = 'block';
        document.getElementById('local-scoreboard').style.display = 'none';
        
        const list = document.getElementById('score-board-list');
        list.innerHTML = '';
        state.players.forEach(p => {
            const li = document.createElement('li');
            li.innerText = `${p.name}: ${p.score} نقطة`;
            list.appendChild(li);
        });
        
        document.getElementById('local-score-controls').classList.add('hidden');
        if (isHost) {
            document.getElementById('host-score-controls').classList.remove('hidden');
            document.getElementById('guest-score-wait').classList.add('hidden');
            
            if (state.currentRound >= state.totalRounds) {
                document.getElementById('next-round-btn').classList.add('hidden');
                document.getElementById('finish-btn').classList.remove('hidden');
            }
        } else {
            document.getElementById('host-score-controls').classList.add('hidden');
            document.getElementById('guest-score-wait').classList.remove('hidden');
            
            if (state.currentRound >= state.totalRounds) {
                document.getElementById('guest-score-wait').innerText = "انتهت اللعبة!";
                document.getElementById('finish-btn').classList.remove('hidden');
            }
        }
    }
}

// Drawing Functions
function setColor(color, btn) {
    currentColor = color;
    isEraser = false;
    document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('eraser-btn').classList.remove('active');
    if (btn) btn.classList.add('active');
}

function toggleEraser() {
    isEraser = true;
    document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('eraser-btn').classList.add('active');
}

function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    if (e.touches) {
        return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function emitDrawData(x0, y0, x1, y1, color, width, eraser) {
    if (playMode === 'online') {
        const data = {
            type: 'DRAW_LINE',
            senderId: myId,
            x0: x0 / canvas.width,
            y0: y0 / canvas.height,
            x1: x1 / canvas.width,
            y1: y1 / canvas.height,
            color: color,
            width: width,
            eraser: eraser
        };
        if (isHost) {
            broadcastDrawData(data);
        } else {
            hostConn.send(data);
            handleDrawData(data); // Draw locally too
        }
    } else {
        drawLine(x0, y0, x1, y1, color, width, eraser);
    }
}

function emitClearCanvas() {
    if (playMode === 'online') {
        const data = { type: 'CLEAR_CANVAS', senderId: myId };
        if (isHost) {
            broadcastDrawData(data);
        } else {
            hostConn.send(data);
            handleDrawData(data);
        }
    } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

function handleDrawData(data) {
    if (data.type === 'DRAW_LINE') {
        drawLine(
            data.x0 * canvas.width,
            data.y0 * canvas.height,
            data.x1 * canvas.width,
            data.y1 * canvas.height,
            data.color,
            data.width,
            data.eraser
        );
    } else if (data.type === 'CLEAR_CANVAS') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

function drawLine(x0, y0, x1, y1, color, width, eraser) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    
    if (eraser) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = width * 3;
    } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
    }
    
    ctx.stroke();
    ctx.closePath();
}

function onDown(e) {
    if (playMode === 'online' && gameState.drawerId !== myId) return;
    isDrawing = true;
    const pos = getPos(e);
    currentX = pos.x;
    currentY = pos.y;
    e.preventDefault();
}

function onMove(e) {
    if (!isDrawing) return;
    const pos = getPos(e);
    emitDrawData(currentX, currentY, pos.x, pos.y, currentColor, currentLineWidth, isEraser);
    currentX = pos.x;
    currentY = pos.y;
    e.preventDefault();
}

function onUp(e) {
    if (!isDrawing) return;
    isDrawing = false;
}

canvas.addEventListener('mousedown', onDown);
canvas.addEventListener('mousemove', onMove);
canvas.addEventListener('mouseup', onUp);
canvas.addEventListener('mouseout', onUp);

canvas.addEventListener('touchstart', onDown, {passive: false});
canvas.addEventListener('touchmove', onMove, {passive: false});
canvas.addEventListener('touchend', onUp);

function leaveRoom() {
    if (peer) { peer.destroy(); peer = null; }
    window.location.reload();
}
