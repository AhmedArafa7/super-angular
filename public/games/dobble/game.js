const emojis = [
    "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", 
    "🦁", "🐮", "🐷", "🐸", "🐵", "🐔", "🐧", "🐦", "🐤", "🦆", 
    "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🐛", "🦋", 
    "🐌", "🐞", "🐜", "🦟", "🦗", "🕷", "🦂", "🐢", "🐍", "🦎", 
    "🦖", "🦕", "🐙", "🦑", "🦐", "🦞", "🦀", "🐡", "🐠", "🐟", 
    "🐬", "🐳", "🐋", "🦈", "🐊", "🐅", "🐆", "🦓", "🦍", "🦧", 
    "🐘", "🦛", "🦏", "🐪", "🐫", "🦒", "🦘", "🐃", "🐂", "🐄"
];

function generateDeck() {
    const n = 7;
    const cards = [];
    for (let i = 0; i <= n; i++) {
        let card = [0];
        for (let j = 0; j < n; j++) {
            card.push((i * n) + j + 1);
        }
        cards.push(card);
    }
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            let card = [i + 1];
            for (let k = 0; k < n; k++) {
                let val = (n + 1) + (n * k) + ((i * k + j) % n);
                card.push(val);
            }
            cards.push(card);
        }
    }
    const shuffledEmojis = [...emojis].sort(() => 0.5 - Math.random());
    return cards.map(cardIndexes => cardIndexes.map(idx => shuffledEmojis[idx % shuffledEmojis.length]));
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

let playMode = 'online';

// --- LOCAL LOGIC ---
let localDeck = [];
let localCenterCard = [];
let localTopCard = [];
let localBottomCard = [];
let localScoreTop = 0;
let localScoreBottom = 0;
let localMaxScore = 10;

function showLocalSetup() {
    playMode = 'local';
    showScreen('local-setup-screen');
}

function changeLocalMaxScore(delta) {
    localMaxScore += delta;
    if (localMaxScore < 5) localMaxScore = 5;
    if (localMaxScore > 50) localMaxScore = 50;
    document.getElementById('local-max-score-display').innerText = localMaxScore;
}

function startLocalGame() {
    localScoreTop = 0;
    localScoreBottom = 0;
    localDeck = generateDeck();
    
    localCenterCard = localDeck.pop();
    localTopCard = localDeck.pop();
    localBottomCard = localDeck.pop();
    
    document.getElementById('game-screen').classList.remove('online-mode');
    document.getElementById('game-screen').classList.add('local-mode');
    
    document.getElementById('top-area').classList.remove('hidden');
    document.getElementById('local-center-area').classList.remove('hidden');
    document.getElementById('score-bottom-container').classList.remove('hidden');
    
    document.getElementById('online-card-label').classList.add('hidden');
    document.getElementById('online-center-label').classList.add('hidden');
    document.getElementById('online-center-card').classList.add('hidden');
    
    showScreen('game-screen');
    updateLocalView();
}

function updateLocalView() {
    document.getElementById('score-top').innerText = localScoreTop;
    document.getElementById('score-bottom').innerText = localScoreBottom;
    
    renderCard('card-top', localTopCard, true, 'top');
    renderCard('my-card', localBottomCard, true, 'bottom');
    renderCard('local-center-card', localCenterCard, false);
}

function handleLocalClick(player, emoji) {
    if (localCenterCard.includes(emoji)) {
        if (player === 'top') {
            if (!localTopCard.includes(emoji)) return;
            localScoreTop++;
            localTopCard = localCenterCard;
        } else {
            if (!localBottomCard.includes(emoji)) return;
            localScoreBottom++;
            localBottomCard = localCenterCard;
        }
        
        if (localScoreTop >= localMaxScore || localScoreBottom >= localMaxScore) {
            endLocalGame(localScoreTop >= localMaxScore ? 'اللاعب العلوي' : 'اللاعب السفلي');
            return;
        }
        
        if (localDeck.length === 0) localDeck = generateDeck();
        localCenterCard = localDeck.pop();
        
        updateLocalView();
    }
}

function endLocalGame(winnerName) {
    showScreen('winner-screen');
    document.getElementById('winner-name').innerText = winnerName;
    document.getElementById('host-restart-controls').classList.add('hidden');
    document.getElementById('guest-restart-wait').classList.add('hidden');
    document.getElementById('local-restart-controls').classList.remove('hidden');
}

function renderCard(containerId, cardArray, isClickable, localPlayer = null) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    cardArray.forEach(emoji => {
        const span = document.createElement('span');
        span.className = 'emoji-item';
        span.innerText = emoji;
        
        const scale = 0.5 + Math.random() * 1.5;
        const rotate = Math.random() * 360;
        span.style.transform = `scale(${scale}) rotate(${rotate}deg)`;
        
        if (isClickable) {
            span.style.cursor = 'pointer';
            span.onclick = () => {
                if (playMode === 'local') {
                    handleLocalClick(localPlayer, emoji);
                } else {
                    onOnlineEmojiClick(emoji);
                }
            };
        }
        container.appendChild(span);
    });
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
    centerCard: [],
    maxScore: 10,
    winnerId: null
};

let deck = [];

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
    myId = "DOBBLE-" + roomCode;
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
            gameState.players.push({ id: myId, name: myName, score: 0, card: [] });
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
                gameState.players.push({ id: conn.peer, name: data.name, score: 0, card: [] });
                updateHostLobby();
                broadcastState();
            } else if (data.type === 'CLICK' && gameState.phase === 'playing') {
                handlePlayerClick(conn.peer, data.emoji);
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
        if (c.conn) {
            c.conn.send({ type: 'STATE_UPDATE', state: gameState });
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
        hostConn = peer.connect('DOBBLE-' + codeInput);
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

function changeMaxScore(delta) {
    gameState.maxScore += delta;
    if (gameState.maxScore < 5) gameState.maxScore = 5;
    if (gameState.maxScore > 50) gameState.maxScore = 50;
    document.getElementById('max-score-display').innerText = gameState.maxScore;
}

function drawCardFromDeck() {
    if (deck.length === 0) deck = generateDeck();
    return deck.pop();
}

function startOnlineGame() {
    if (!isHost) return;
    deck = generateDeck();
    gameState.phase = 'playing';
    gameState.winnerId = null;
    gameState.players.forEach(p => {
        p.score = 0;
        p.card = drawCardFromDeck();
    });
    gameState.centerCard = drawCardFromDeck();
    
    broadcastState();
    handleStateUpdate(JSON.parse(JSON.stringify(gameState)));
}

function handlePlayerClick(playerId, emoji) {
    if (!isHost || gameState.phase !== 'playing') return;
    
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return;
    
    if (gameState.centerCard.includes(emoji) && player.card.includes(emoji)) {
        player.score++;
        if (player.score >= gameState.maxScore) {
            gameState.phase = 'winner';
            gameState.winnerId = playerId;
        } else {
            player.card = gameState.centerCard;
            gameState.centerCard = drawCardFromDeck();
        }
        broadcastState();
        handleStateUpdate(JSON.parse(JSON.stringify(gameState)));
    }
}

function onOnlineEmojiClick(emoji) {
    if (isHost) {
        handlePlayerClick(myId, emoji);
    } else {
        hostConn.send({ type: 'CLICK', emoji: emoji });
    }
}

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
        document.getElementById('game-screen').classList.add('online-mode');
        document.getElementById('game-screen').classList.remove('local-mode');
        
        document.getElementById('top-area').classList.add('hidden');
        document.getElementById('local-center-area').classList.add('hidden');
        document.getElementById('score-bottom-container').classList.add('hidden');
        
        document.getElementById('online-card-label').classList.remove('hidden');
        document.getElementById('online-center-label').classList.remove('hidden');
        document.getElementById('online-center-card').classList.remove('hidden');
        
        showScreen('game-screen');
        
        const scoresList = document.getElementById('live-scores');
        scoresList.innerHTML = '';
        state.players.forEach(p => {
            const li = document.createElement('li');
            li.innerText = `${p.name}: ${p.score}`;
            if (p.id === myId) li.style.fontWeight = 'bold';
            scoresList.appendChild(li);
        });
        
        const myPlayer = state.players.find(p => p.id === myId);
        if (myPlayer) {
            renderCard('my-card', myPlayer.card, true);
        }
        renderCard('online-center-card', state.centerCard, false);
    } else if (state.phase === 'winner') {
        showScreen('winner-screen');
        const winner = state.players.find(p => p.id === state.winnerId);
        document.getElementById('winner-name').innerText = winner ? winner.name : "...";
        
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

function leaveRoom() {
    if (peer) { peer.destroy(); peer = null; }
    window.location.reload();
}
