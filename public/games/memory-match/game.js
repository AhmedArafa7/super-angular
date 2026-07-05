// UI Elements
const mainMenu = document.getElementById('main-menu');
const p2pMenu = document.getElementById('p2p-menu');
const gameScreen = document.getElementById('game-screen');
const gameOverScreen = document.getElementById('game-over-screen');

const modeBtns = document.querySelectorAll('.mode-btn');
const createRoomBtn = document.getElementById('create-room-btn');
const joinRoomBtn = document.getElementById('join-room-btn');
const backToMenuBtn = document.getElementById('back-to-menu-btn');
const joinRoomIdInput = document.getElementById('join-room-id');
const roomIdDisplay = document.getElementById('roomIdDisplay');
const roomInfo = document.getElementById('room-info');
const joinError = document.getElementById('join-error');
const toastEl = document.getElementById('toast');

const gameBoard = document.getElementById('game-board');
const p1ScoreEl = document.getElementById('p1-score');
const p2ScoreEl = document.getElementById('p2-score');
const p1Hud = document.getElementById('p1-hud');
const p2Hud = document.getElementById('p2-hud');
const turnIndicator = document.getElementById('turn-indicator');
const timerDisplay = document.getElementById('timer-display');
const p2StatsBox = document.getElementById('p2-stats-box');
const diffBtns = document.querySelectorAll('.diff-btn');

// Game State
let activeMode = 'single'; // single, local, p2p-host, p2p-join
let activeDifficulty = 'easy'; // easy, medium, hard
let peer = null;
let conn = null;
let isHost = true;
let myId = 1;

let cards = []; // [{emoji, isFlipped, isMatched, id}]
const EMOJIS_EASY = ['🐶', '🐱', '🍔', '🍕', '🚀', '🛸', '🎸', '⚽'];
const EMOJIS_MEDIUM = [...EMOJIS_EASY, '🍓', '🏀', '🚗', '🎈'];
const EMOJIS_HARD = [...EMOJIS_MEDIUM, '👻', '👾', '💎', '👑'];
let flippedIndices = [];
let scores = { 1: 0, 2: 0 };
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
    activeMode = e.target.dataset.mode;
    if (activeMode === 'p2p') {
        showScreen(p2pMenu);
    } else {
        isHost = true;
        myId = 1;
        startGame();
    }
}));

backToMenuBtn.addEventListener('click', () => {
    if (peer) peer.destroy();
    showScreen(mainMenu);
});

// P2P Logic
createRoomBtn.addEventListener('click', () => {
    activeMode = 'p2p-host';
    isHost = true;
    myId = 1;
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
function startGame() {
    showScreen(gameScreen);
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
    resetGameState();
    renderBoard();
    startTimer();
    updateHUD();
}

function resetGameState() {
    scores = { 1: 0, 2: 0 };
    currentTurn = 1;
    flippedIndices = [];
    isProcessing = false;
    matchCount = 0;
    elapsedTime = 0;
    clearInterval(timerInterval);
    
    if (activeMode === 'single') {
        p2Hud.classList.add('hidden');
    } else {
        p2Hud.classList.remove('hidden');
    }
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
        
        // Award points to the player who made the SECOND flip (or first, they should be the same player)
        scores[c1.playerId]++;
        matchCount++;
        
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
                currentTurn = currentTurn === 1 ? 2 : 1;
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
    p1ScoreEl.innerText = scores[1];
    p2ScoreEl.innerText = scores[2];
    
    if (activeMode !== 'single') {
        if (currentTurn === 1) {
            p1Hud.classList.add('active-turn');
            p2Hud.classList.remove('active-turn');
            turnIndicator.innerText = (activeMode.startsWith('p2p') && myId === 1) ? "دورك الآن" : "دور اللاعب 1";
            turnIndicator.style.color = "#38bdf8";
        } else {
            p2Hud.classList.add('active-turn');
            p1Hud.classList.remove('active-turn');
            turnIndicator.innerText = (activeMode.startsWith('p2p') && myId === 2) ? "دورك الآن" : "دور اللاعب 2";
            turnIndicator.style.color = "#a855f7"; // purple
        }
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
    clearInterval(timerInterval);
    showScreen(gameOverScreen);
    
    document.getElementById('final-score-p1').innerText = scores[1];
    
    let m = Math.floor(elapsedTime / 60).toString().padStart(2, '0');
    let s = (elapsedTime % 60).toString().padStart(2, '0');
    document.getElementById('final-time').innerText = `${m}:${s}`;
    
    if (activeMode === 'single') {
        p2StatsBox.classList.add('hidden');
        document.getElementById('game-over-title').innerText = "تم إكمال اللوحة!";
    } else {
        p2StatsBox.classList.remove('hidden');
        document.getElementById('final-score-p2').innerText = scores[2];
        
        let title = document.getElementById('game-over-title');
        if (scores[1] > scores[2]) {
            title.innerText = (myId === 1) ? "لقد فزت! 🎉" : "فاز اللاعب 1!";
            title.style.color = "#38bdf8";
        } else if (scores[2] > scores[1]) {
            title.innerText = (myId === 2) ? "لقد فزت! 🎉" : "فاز اللاعب 2!";
            title.style.color = "#a855f7";
        } else {
            title.innerText = "تعادل! 🤝";
            title.style.color = "#facc15";
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
