// UI Elements
const mainMenu = document.getElementById('main-menu');
const p2pMenu = document.getElementById('p2p-menu');
const localSetupMenu = document.getElementById('local-setup-menu');
const gameScreen = document.getElementById('game-screen');
const gameOverScreen = document.getElementById('game-over-screen');

const modeBtns = document.querySelectorAll('.mode-btn');
const createRoomBtn = document.getElementById('create-room-btn');
const joinRoomBtn = document.getElementById('join-room-btn');
const backBtns = document.querySelectorAll('.back-btn');
const joinRoomIdInput = document.getElementById('join-room-id');
const roomIdDisplay = document.getElementById('roomIdDisplay');
const roomInfo = document.getElementById('room-info');
const joinError = document.getElementById('join-error');
const toastEl = document.getElementById('toast');

const gameBoard = document.getElementById('game-board');
const mainHud = document.getElementById('main-hud');
const turnIndicator = document.getElementById('turn-indicator');
const timerDisplay = document.getElementById('timer-display');
const diffBtns = document.querySelectorAll('.diff-btn');
const gameOverStats = document.getElementById('game-over-stats');

const decLocalPlayersBtn = document.getElementById('dec-local-players');
const incLocalPlayersBtn = document.getElementById('inc-local-players');
const localPlayersCountDisplay = document.getElementById('local-players-count');
const startLocalBtn = document.getElementById('start-local-btn');

// Game State
let activeMode = 'single'; // single, local, p2p-host, p2p-join
let activeDifficulty = 'easy'; // easy, medium, hard
let peer = null;
let conn = null;
let isHost = true;
let myId = 1;

let numPlayers = 1;

let cards = []; // [{emoji, isFlipped, isMatched, id}]
const EMOJIS_EASY = ['🐶', '🐱', '🍔', '🍕', '🚀', '🛸', '🎸', '⚽'];
const EMOJIS_MEDIUM = [...EMOJIS_EASY, '🍓', '🏀', '🚗', '🎈'];
const EMOJIS_HARD = [...EMOJIS_MEDIUM, '👻', '👾', '💎', '👑'];
let flippedIndices = [];
let scores = {};

function loadProgress() {
    const saved = localStorage.getItem('memoryMatchProgress');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            if (data.scores) scores = data.scores;
        } catch(e) {}
    }
}
function saveProgress() {
    localStorage.setItem('memoryMatchProgress', JSON.stringify({ scores }));
}
function clearProgress() {
    localStorage.removeItem('memoryMatchProgress');
}
loadProgress();
let currentTurn = 1;
let isProcessing = false;
let matchCount = 0;
let totalPairs = 8;

let startTime = 0;
let timerInterval = null;
let elapsedTime = 0;

// Initialize
diffBtns.forEach(btn => btn.addEventListener('click', e => {
    diffBtns.forEach(b => {
        b.classList.remove('active');
        b.style.background = 'transparent';
        b.style.color = '#38bdf8';
    });
    e.target.classList.add('active');
    e.target.style.background = '#38bdf8';
    e.target.style.color = '#0f172a';
    activeDifficulty = e.target.dataset.diff;
}));

modeBtns.forEach(btn => btn.addEventListener('click', e => {
    const mode = e.target.dataset.mode;
    if (mode === 'p2p') {
        showScreen(p2pMenu);
    } else if (mode === 'local_setup') {
        numPlayers = 2;
        localPlayersCountDisplay.innerText = numPlayers;
        showScreen(localSetupMenu);
    } else {
        activeMode = 'single';
        isHost = true;
        myId = 1;
        numPlayers = 1;
        startGame();
    }
}));

// Local Setup Logic
decLocalPlayersBtn.addEventListener('click', () => {
    if (numPlayers > 2) {
        numPlayers--;
        localPlayersCountDisplay.innerText = numPlayers;
    }
});

incLocalPlayersBtn.addEventListener('click', () => {
    if (numPlayers < 6) {
        numPlayers++;
        localPlayersCountDisplay.innerText = numPlayers;
    }
});

startLocalBtn.addEventListener('click', () => {
    activeMode = 'local';
    isHost = true;
    myId = 1; // Not strictly used for auth in local, but signifies host device
    startGame();
});

backBtns.forEach(btn => btn.addEventListener('click', () => {
    if (peer) peer.destroy();
    showScreen(mainMenu);
}));

// P2P Logic
createRoomBtn.addEventListener('click', () => {
    activeMode = 'p2p-host';
    isHost = true;
    myId = 1;
    numPlayers = 2;
    createRoomBtn.classList.add('hidden');
    roomInfo.classList.remove('hidden');
    
    peer = new Peer();
    peer.on('open', id => {
        roomIdDisplay.innerText = id;
    });
    
    peer.on('connection', connection => {
        conn = connection;
        setupConnection();
        showToast("اكتمل الاتصال! جاري بدء اللعبة...");
        setTimeout(() => startGame(), 1000);
    });
});

joinRoomBtn.addEventListener('click', () => {
    const hostId = joinRoomIdInput.value.trim();
    if(!hostId) return;
    
    activeMode = 'p2p-join';
    isHost = false;
    myId = 2;
    numPlayers = 2;
    joinRoomBtn.disabled = true;
    joinError.classList.add('hidden');
    
    peer = new Peer();
    peer.on('open', () => {
        conn = peer.connect(hostId);
        conn.on('open', () => {
            setupConnection();
            showToast("تم الانضمام للغرفة!");
        });
        conn.on('error', () => {
            joinError.classList.remove('hidden');
            joinRoomBtn.disabled = false;
        });
    });
});

function setupConnection() {
    conn.on('data', data => {
        if (data.type === 'game_start') {
            cards = data.cards;
            activeDifficulty = data.difficulty || 'easy';
            totalPairs = cards.length / 2;
            startGameClient();
        }
        else if (data.type === 'flip') {
            handleFlip(data.index, data.playerId, false); // false = don't broadcast back
        }
    });
    
    conn.on('close', () => {
        showToast("انقطع الاتصال بالمنافس!");
        setTimeout(() => location.reload(), 2000);
    });
}

function broadcast(data) {
    if (conn && conn.open) {
        conn.send(data);
    }
}

// Game Logic
function buildHUD() {
    mainHud.innerHTML = '';
    scores = {};
    
    for (let i = 1; i <= numPlayers; i++) {
        if (scores[i] === undefined) {
            scores[i] = 0;
        }
        const colorClass = `player-color-${i}`;
        
        let label = `اللاعب ${i}`;
        if (activeMode === 'single') label = "أنت";
        else if (activeMode === 'p2p-host' && i === 1) label = "أنت";
        else if (activeMode === 'p2p-join' && i === 2) label = "أنت";
        
        const div = document.createElement('div');
        div.className = `player-hud ${i === 1 ? 'active-turn' : ''} ${colorClass}`;
        div.id = `hud-p${i}`;
        div.innerHTML = `
            <h3>${label}</h3>
            <div class="score-display">النقاط: <span id="score-p${i}">0</span></div>
        `;
        mainHud.appendChild(div);
    }
}

function startGame() {
    showScreen(gameScreen);
    buildHUD();
    resetGameState();
    
    if (isHost) {
        generateCards();
        if (activeMode === 'p2p-host') {
            broadcast({ type: 'game_start', cards, difficulty: activeDifficulty });
        }
        renderBoard();
        startTimer();
    }
    
    updateHUD();
}

function startGameClient() {
    showScreen(gameScreen);
    buildHUD();
    resetGameState();
    renderBoard();
    startTimer();
    updateHUD();
}

function resetGameState() {
    for (let i = 1; i <= numPlayers; i++) {
        if (scores[i] === undefined) {
            scores[i] = 0;
        }
    }
    currentTurn = 1;
    flippedIndices = [];
    isProcessing = false;
    matchCount = 0;
    elapsedTime = 0;
    clearInterval(timerInterval);
}

function generateCards() {
    let emojisToUse = EMOJIS_EASY;
    if (activeDifficulty === 'medium') emojisToUse = EMOJIS_MEDIUM;
    if (activeDifficulty === 'hard') emojisToUse = EMOJIS_HARD;
    
    totalPairs = emojisToUse.length;
    let deck = [...emojisToUse, ...emojisToUse];
    // Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    
    cards = deck.map((emoji, index) => ({
        id: index,
        emoji: emoji,
        isFlipped: false,
        isMatched: false
    }));
}

function renderBoard() {
    gameBoard.innerHTML = '';
    
    // Set grid columns based on card count
    let cols = 4;
    if (cards.length === 24) cols = 6;
    if (cards.length === 32) cols = 8;
    
    // Adjust card sizes if on hard mode to fit screen
    if (window.innerWidth < 800) {
        if (cards.length === 32) cols = 4; // Wrap on mobile
        else if (cards.length === 24) cols = 4;
    }
    
    gameBoard.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    
    cards.forEach((card, index) => {
        const cardEl = document.createElement('div');
        cardEl.className = `card ${card.isFlipped || card.isMatched ? 'flipped' : ''} ${card.isMatched ? 'matched' : ''}`;
        cardEl.dataset.index = index;
        
        cardEl.innerHTML = `
            <div class="card-face card-front"></div>
            <div class="card-face card-back">${card.emoji}</div>
        `;
        
        cardEl.addEventListener('click', () => {
            if (activeMode === 'p2p-host' || activeMode === 'p2p-join') {
                if (currentTurn !== myId) return; // Not my turn
            }
            handleFlip(index, currentTurn, true);
        });
        
        gameBoard.appendChild(cardEl);
    });
}

function handleFlip(index, playerId, shouldBroadcast) {
    if (isProcessing) return;
    if (cards[index].isFlipped || cards[index].isMatched) return;
    
    // In local co-op, we don't strictly enforce who clicks, but we attribute to currentTurn
    if (activeMode === 'local' && playerId !== currentTurn) {
        playerId = currentTurn;
    }

    if (shouldBroadcast && (activeMode === 'p2p-host' || activeMode === 'p2p-join')) {
        broadcast({ type: 'flip', index, playerId });
    }

    // Flip the card visually
    cards[index].isFlipped = true;
    updateCardElement(index);
    flippedIndices.push({ index, playerId });

    if (flippedIndices.length === 2) {
        isProcessing = true;
        checkMatch();
    }
}

function checkMatch() {
    const c1 = flippedIndices[0];
    const c2 = flippedIndices[1];
    
    if (cards[c1.index].emoji === cards[c2.index].emoji) {
        // Match
        cards[c1.index].isMatched = true;
        cards[c2.index].isMatched = true;
        
        // Award points to the player
        scores[c1.playerId]++;
        matchCount++;
        saveProgress();
        
        setTimeout(() => {
            updateCardElement(c1.index);
            updateCardElement(c2.index);
            isProcessing = false;
            flippedIndices = [];
            updateHUD();
            
            if (matchCount === totalPairs) {
                endGame();
            }
        }, 500);
        
    } else {
        // No match
        setTimeout(() => {
            cards[c1.index].isFlipped = false;
            cards[c2.index].isFlipped = false;
            updateCardElement(c1.index);
            updateCardElement(c2.index);
            
            // Switch turns
            if (activeMode !== 'single') {
                currentTurn++;
                if (currentTurn > numPlayers) {
                    currentTurn = 1;
                }
            }
            
            isProcessing = false;
            flippedIndices = [];
            updateHUD();
        }, 1000);
    }
    updateHUD();
}

function updateCardElement(index) {
    const cardEl = gameBoard.children[index];
    if(!cardEl) return;
    cardEl.className = `card ${cards[index].isFlipped || cards[index].isMatched ? 'flipped' : ''} ${cards[index].isMatched ? 'matched' : ''}`;
}

function updateHUD() {
    for (let i = 1; i <= numPlayers; i++) {
        const scoreSpan = document.getElementById(`score-p${i}`);
        if (scoreSpan) scoreSpan.innerText = scores[i];
        
        const hudBox = document.getElementById(`hud-p${i}`);
        if (hudBox) {
            if (currentTurn === i) {
                hudBox.classList.add('active-turn');
            } else {
                hudBox.classList.remove('active-turn');
            }
        }
    }
    
    if (activeMode !== 'single') {
        const colors = ['#38bdf8', '#a855f7', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
        if (activeMode.startsWith('p2p') && currentTurn === myId) {
            turnIndicator.innerText = "دورك الآن";
        } else {
            turnIndicator.innerText = `دور اللاعب ${currentTurn}`;
        }
        turnIndicator.style.color = colors[currentTurn - 1];
    } else {
        turnIndicator.innerText = "لعب فردي";
    }
}

function startTimer() {
    startTime = Date.now();
    timerInterval = setInterval(() => {
        elapsedTime = Math.floor((Date.now() - startTime) / 1000);
        let m = Math.floor(elapsedTime / 60).toString().padStart(2, '0');
        let s = (elapsedTime % 60).toString().padStart(2, '0');
        timerDisplay.innerText = `الوقت: ${m}:${s}`;
    }, 1000);
}

function endGame() {
    isProcessing = true;
    clearInterval(timerInterval);
    clearProgress();
    showScreen(gameOverScreen);
    
    gameOverStats.innerHTML = '';
    
    let m = Math.floor(elapsedTime / 60).toString().padStart(2, '0');
    let s = (elapsedTime % 60).toString().padStart(2, '0');
    document.getElementById('final-time').innerText = `${m}:${s}`;
    if (activeMode === 'single') {
        document.getElementById('game-over-title').innerText = "تم إكمال اللوحة!";
        
        gameOverStats.innerHTML = `
            <div class="stat-box">
                <span class="stat-label">نقاطك:</span>
                <span class="stat-value">${scores[1]}</span>
            </div>
        `;
    } else {
        // Find winner(s)
        let maxScore = -1;
        let winners = [];
        
        for (let i = 1; i <= numPlayers; i++) {
            const sc = scores[i];
            if (sc > maxScore) {
                maxScore = sc;
                winners = [i];
            } else if (sc === maxScore) {
                winners.push(i);
            }
            
            // Append stat box
            let label = `نقاط اللاعب ${i}:`;
            if (activeMode.startsWith('p2p') && i === myId) label = "نقاطك:";
            
            gameOverStats.innerHTML += `
                <div class="stat-box player-color-${i}" style="color: inherit; border-color: inherit;">
                    <span class="stat-label">${label}</span>
                    <span class="stat-value">${sc}</span>
                </div>
            `;
        }
        
        let title = document.getElementById('game-over-title');
        
        if (winners.length > 1) {
            title.innerText = "تعادل! 🤝";
            title.style.color = "#facc15";
        } else {
            const winner = winners[0];
            if (activeMode.startsWith('p2p') && winner === myId) {
                title.innerText = "لقد فزت! 🎉";
            } else {
                title.innerText = `فاز اللاعب ${winner}! 🏆`;
            }
            const colors = ['#38bdf8', '#a855f7', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
            title.style.color = colors[winner - 1];
        }
    }
}

document.getElementById('restart-btn').addEventListener('click', () => {
    if (activeMode === 'p2p-join') {
        showToast("فقط مدير الغرفة يمكنه إعادة اللعب");
        return;
    }
    startGame();
});

document.getElementById('quit-btn').addEventListener('click', () => {
    if (peer) peer.destroy();
    location.reload();
});

function showScreen(screenEl) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    screenEl.classList.remove('hidden');
}

function showToast(msg) {
    toastEl.innerText = msg;
    toastEl.classList.remove('hidden');
    setTimeout(() => toastEl.classList.add('hidden'), 3000);
}
