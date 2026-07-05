const categories = {
    animals: ["أسد", "فيل", "زرافة", "قرد", "حصان", "كلب", "قطة", "نمر", "تمساح", "ثعبان"],
    jobs: ["طبيب", "مهندس", "معلم", "شرطي", "طباخ", "طيار", "محامي", "نجار", "مزارع", "حلاق"],
    movies: ["تيتانيك", "أفاتار", "سبايدرمان", "باتمان", "الجوكر", "هاري بوتر", "سيد الخواتم", "الأسد الملك", "ماتريكس", "فاست أند فيورس"],
    actions: ["يأكل", "ينام", "يركض", "يسبح", "يقرأ", "يضحك", "يبكي", "يقود", "يطبخ", "يرقص"]
};

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

const correctAudio = document.getElementById('correct-audio');
const passAudio = document.getElementById('pass-audio');
const tickAudio = document.getElementById('tick-audio');

function playAudio(type) {
    try {
        if(type === 'correct') { correctAudio.currentTime = 0; correctAudio.play().catch(e=>{}); }
        if(type === 'pass') { passAudio.currentTime = 0; passAudio.play().catch(e=>{}); }
        if(type === 'tick') { tickAudio.currentTime = 0; tickAudio.play().catch(e=>{}); }
    } catch(e) {}
}

let playMode = 'online';
let deck = [];

// --- LOCAL LOGIC ---
let localTimeRemaining = 60;
let localScore = 0;
let localTimerInterval = null;
let canTilt = true;

function showLocalSetup() {
    playMode = 'local';
    showScreen('local-setup-screen');
}

function startLocalGame(cat) {
    playMode = 'local';
    deck = [...categories[cat]].sort(() => 0.5 - Math.random());
    localScore = 0;
    localTimeRemaining = 60;
    
    document.getElementById('local-word').innerText = deck.pop();
    
    showScreen('game-screen');
    document.getElementById('local-view').classList.remove('hidden');
    document.getElementById('guesser-view').classList.add('hidden');
    document.getElementById('actor-view').classList.add('hidden');
    
    document.getElementById('timer-display').innerText = localTimeRemaining;
    
    clearInterval(localTimerInterval);
    localTimerInterval = setInterval(() => {
        localTimeRemaining--;
        if (localTimeRemaining >= 0) {
            document.getElementById('timer-display').innerText = localTimeRemaining;
            if (localTimeRemaining <= 5) playAudio('tick');
        }
        if (localTimeRemaining <= 0) {
            endLocalGame();
        }
    }, 1000);
    
    // Request device orientation
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(permissionState => {
                if (permissionState === 'granted') {
                    window.addEventListener('deviceorientation', handleOrientation);
                }
            })
            .catch(console.error);
    } else {
        window.addEventListener('deviceorientation', handleOrientation);
    }
}

function handleOrientation(event) {
    if (playMode !== 'local' || localTimeRemaining <= 0 || !canTilt) return;
    
    let beta = event.beta; 
    
    // Face down = Correct (beta > 120 or beta < -120 depending on hold)
    // Let's use simple logic: 
    // Usually phone on forehead, upright: beta is near 90.
    // Tilt forward (face down): beta approaches 180 or 0.
    if (beta > 130 || beta < 40) { // arbitrary threshold, correct
        localVote('correct');
    } else if (beta < 70 && beta > 40) { // tilt back = pass
        localVote('pass');
    }
}

function localVote(vote) {
    if (!canTilt) return;
    canTilt = false; // debounce
    setTimeout(() => { canTilt = true; }, 1000);
    
    if (vote === 'correct') {
        localScore++;
        playAudio('correct');
        document.body.style.backgroundColor = '#10b981';
    } else {
        playAudio('pass');
        document.body.style.backgroundColor = '#ef4444';
    }
    
    setTimeout(() => { document.body.style.backgroundColor = '#0b0c10'; }, 500);
    
    if (deck.length === 0) {
        const allWords = [].concat(...Object.values(categories));
        document.getElementById('local-word').innerText = allWords[Math.floor(Math.random() * allWords.length)];
    } else {
        document.getElementById('local-word').innerText = deck.pop();
    }
}

function endLocalGame() {
    clearInterval(localTimerInterval);
    window.removeEventListener('deviceorientation', handleOrientation);
    showScreen('result-screen');
    
    document.getElementById('final-score').innerText = localScore;
    
    document.getElementById('host-restart-controls').classList.add('hidden');
    document.getElementById('guest-restart-wait').classList.add('hidden');
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
    guesserId: null,
    secretWord: null,
    timeRemaining: 60,
    score: 0
};

let timerInterval = null;

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
    myId = "HEADS-" + roomCode;
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
            } else if (data.type === 'VOTE' && gameState.phase === 'playing') {
                handleVote(data.vote);
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
        hostConn = peer.connect('HEADS-' + codeInput);
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

function selectCategory(cat) {
    if (!isHost) return;
    if (gameState.players.length < 2) {
        alert("تحتاج لاعبين على الأقل لبدء اللعبة!");
        return;
    }
    
    deck = [...categories[cat]].sort(() => 0.5 - Math.random());
    
    gameState.phase = 'playing';
    gameState.score = 0;
    gameState.timeRemaining = 60;
    gameState.secretWord = deck.pop();
    
    gameState.guesserId = gameState.players[Math.floor(Math.random() * gameState.players.length)].id;
    
    broadcastState();
    handleStateUpdate(JSON.parse(JSON.stringify(gameState)));
    
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        gameState.timeRemaining--;
        if (gameState.timeRemaining % 5 === 0) broadcastState(); 
        
        if (gameState.timeRemaining <= 0) {
            clearInterval(timerInterval);
            gameState.phase = 'result';
            broadcastState();
            handleStateUpdate(JSON.parse(JSON.stringify(gameState)));
        }
    }, 1000);
}

function handleVote(vote) {
    if (!isHost || gameState.phase !== 'playing') return;
    
    if (vote === 'correct') {
        gameState.score++;
        playAudio('correct');
    } else {
        playAudio('pass');
    }
    
    if (deck.length === 0) {
        const allWords = [].concat(...Object.values(categories));
        gameState.secretWord = allWords[Math.floor(Math.random() * allWords.length)];
    } else {
        gameState.secretWord = deck.pop();
    }
    
    broadcastState();
    handleStateUpdate(JSON.parse(JSON.stringify(gameState)));
}

function actorVote(vote) {
    if (isHost) {
        handleVote(vote);
    } else {
        if (vote === 'correct') playAudio('correct'); 
        if (vote === 'pass') playAudio('pass');
        hostConn.send({ type: 'VOTE', vote: vote });
    }
}

let onlineLocalTimerInterval = null;

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
        showScreen('game-screen');
        
        document.getElementById('local-view').classList.add('hidden');
        
        clearInterval(onlineLocalTimerInterval);
        let localTime = state.timeRemaining;
        document.getElementById('timer-display').innerText = localTime;
        
        onlineLocalTimerInterval = setInterval(() => {
            localTime--;
            if (localTime >= 0) {
                document.getElementById('timer-display').innerText = localTime;
                if (localTime <= 5) playAudio('tick');
            }
        }, 1000);
        
        if (state.guesserId === myId) {
            document.getElementById('guesser-view').classList.remove('hidden');
            document.getElementById('actor-view').classList.add('hidden');
        } else {
            document.getElementById('guesser-view').classList.add('hidden');
            document.getElementById('actor-view').classList.remove('hidden');
            document.getElementById('secret-word').innerText = state.secretWord;
            const guesser = state.players.find(p => p.id === state.guesserId);
            document.getElementById('guesser-name').innerText = guesser ? guesser.name : '...';
        }
        
    } else if (state.phase === 'result') {
        clearInterval(onlineLocalTimerInterval);
        showScreen('result-screen');
        
        document.getElementById('final-score').innerText = state.score;
        
        document.getElementById('local-restart-controls').classList.add('hidden');
        if (isHost) {
            document.getElementById('host-restart-controls').classList.remove('hidden');
            document.getElementById('guest-restart-wait').classList.add('hidden');
        } else {
            document.getElementById('host-restart-controls').classList.add('hidden');
            document.getElementById('guest-restart-wait').classList.remove('hidden');
        }
    }
}

function backToLobby() {
    if (!isHost) return;
    gameState.phase = 'lobby';
    updateHostLobby();
    broadcastState();
    handleStateUpdate(JSON.parse(JSON.stringify(gameState)));
    showScreen('host-screen');
}

function leaveRoom() {
    if (peer) { peer.destroy(); peer = null; }
    window.location.reload();
}
