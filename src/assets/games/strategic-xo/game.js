// UI Elements
const mainMenu = document.getElementById('main-menu');
const localSetupMenu = document.getElementById('local-setup-menu');
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

const decLocalPlayersBtn = document.getElementById('dec-local-players');
const incLocalPlayersBtn = document.getElementById('inc-local-players');
const localPlayersCountDisplay = document.getElementById('local-players-count');
const startLocalBtn = document.getElementById('start-local-btn');
const backFromLocalBtn = document.getElementById('back-from-local-btn');

const superBoardEl = document.getElementById('super-board');
const mainHud = document.getElementById('main-hud');
const turnIndicator = document.getElementById('turn-indicator');

// Game State
let activeMode = 'local'; // local, p2p-host, p2p-join
let peer = null;
let conn = null;
let isHost = true;
let myPlayerSymbol = 'X'; // Host is X, Join is O

let numPlayers = 2;
const PLAYERS = [
    { symbol: 'X', display: '✖', textClass: 'text-x' },
    { symbol: 'O', display: '⭕', textClass: 'text-o' },
    { symbol: 'A', display: '▲', textClass: 'text-a' },
    { symbol: 'S', display: '■', textClass: 'text-s' }
];

let superBoardState = Array(9).fill(null); 
let miniBoardsState = Array(9).fill(null).map(() => Array(9).fill(null));
let currentTurnIdx = 0;
let activeMiniBoard = -1; // -1 means any board
let isGameOver = false;

// Initialize
modeBtns.forEach(btn => btn.addEventListener('click', e => {
    const mode = e.target.dataset.mode;
    if (mode === 'p2p') {
        showScreen(p2pMenu);
    } else if (mode === 'local_setup') {
        numPlayers = 2;
        localPlayersCountDisplay.innerText = numPlayers;
        showScreen(localSetupMenu);
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
    if (numPlayers < 4) {
        numPlayers++;
        localPlayersCountDisplay.innerText = numPlayers;
    }
});

startLocalBtn.addEventListener('click', () => {
    activeMode = 'local';
    isHost = true;
    myPlayerSymbol = 'X'; 
    startGame();
});

backFromLocalBtn.addEventListener('click', () => {
    showScreen(mainMenu);
});

backToMenuBtn.addEventListener('click', () => {
    if (peer) peer.destroy();
    showScreen(mainMenu);
});

// P2P Logic
createRoomBtn.addEventListener('click', () => {
    activeMode = 'p2p-host';
    isHost = true;
    myPlayerSymbol = 'X';
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
    myPlayerSymbol = 'O';
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
            startGameClient();
        }
        else if (data.type === 'move') {
            handleMove(data.boardIdx, data.cellIdx, false);
        }
        else if (data.type === 'restart') {
            startGameClient();
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
    
    for (let i = 0; i < numPlayers; i++) {
        const p = PLAYERS[i];
        
        let label = `اللاعب ${i+1}`;
        if (activeMode.startsWith('p2p') && p.symbol === myPlayerSymbol) label += " (أنت)";
        
        const div = document.createElement('div');
        div.className = `player-hud ${i === 0 ? 'active-turn' : ''}`;
        div.id = `hud-p${i}`;
        div.innerHTML = `
            <h3>${label}</h3>
            <div class="player-symbol ${p.textClass}">${p.display}</div>
        `;
        mainHud.appendChild(div);
    }
}

function startGame() {
    showScreen(gameScreen);
    buildHUD();
    resetGameState();
    renderBoard();
    updateHUD();
    
    if (activeMode === 'p2p-host') {
        broadcast({ type: 'game_start' });
    }
}

function startGameClient() {
    showScreen(gameScreen);
    buildHUD();
    resetGameState();
    renderBoard();
    updateHUD();
}

function resetGameState() {
    superBoardState = Array(9).fill(null);
    miniBoardsState = Array(9).fill(null).map(() => Array(9).fill(null));
    currentTurnIdx = 0;
    activeMiniBoard = -1;
    isGameOver = false;
}

function renderBoard() {
    superBoardEl.innerHTML = '';
    
    for (let i = 0; i < 9; i++) {
        const miniBoardEl = document.createElement('div');
        miniBoardEl.className = 'mini-board';
        miniBoardEl.id = `mb-${i}`;
        
        for (let j = 0; j < 9; j++) {
            const cellEl = document.createElement('div');
            cellEl.className = 'cell';
            cellEl.id = `cell-${i}-${j}`;
            cellEl.dataset.board = i;
            cellEl.dataset.cell = j;
            
            cellEl.addEventListener('click', () => onCellClick(i, j));
            
            miniBoardEl.appendChild(cellEl);
        }
        
        superBoardEl.appendChild(miniBoardEl);
    }
    
    updateBoardVisuals();
}

function onCellClick(boardIdx, cellIdx) {
    if (isGameOver) return;
    
    const currSym = PLAYERS[currentTurnIdx].symbol;
    
    // In P2P, check if it's my turn
    if ((activeMode === 'p2p-host' || activeMode === 'p2p-join') && currSym !== myPlayerSymbol) {
        return;
    }
    
    handleMove(boardIdx, cellIdx, true);
}

function handleMove(boardIdx, cellIdx, shouldBroadcast) {
    if (isGameOver) return;
    
    // Validate Move
    if (superBoardState[boardIdx] !== null) return; // Board already won
    if (miniBoardsState[boardIdx][cellIdx] !== null) return; // Cell already taken
    if (activeMiniBoard !== -1 && activeMiniBoard !== boardIdx) return; // Must play in active board
    
    const p = PLAYERS[currentTurnIdx];
    
    // Make Move
    miniBoardsState[boardIdx][cellIdx] = p.symbol;
    
    const cellEl = document.getElementById(`cell-${boardIdx}-${cellIdx}`);
    cellEl.innerText = p.display;
    cellEl.classList.add('taken');
    cellEl.classList.add(p.textClass);
    
    if (shouldBroadcast && (activeMode === 'p2p-host' || activeMode === 'p2p-join')) {
        broadcast({ type: 'move', boardIdx, cellIdx });
    }
    
    // Check Mini Board Win
    const miniWin = checkWin(miniBoardsState[boardIdx]);
    if (miniWin) {
        superBoardState[boardIdx] = miniWin; // 'X', 'O', 'A', 'S', or 'T' (Tie)
    } else {
        // Check tie
        if (!miniBoardsState[boardIdx].includes(null)) {
            superBoardState[boardIdx] = 'T';
        }
    }
    
    // Next Active Board
    if (superBoardState[cellIdx] !== null) {
        // The board we were sent to is already won/full, so any board is allowed
        activeMiniBoard = -1;
    } else {
        activeMiniBoard = cellIdx;
    }
    
    // Switch Turn
    currentTurnIdx = (currentTurnIdx + 1) % numPlayers;
    
    updateBoardVisuals();
    updateHUD();
    
    // Check Super Board Win
    const superWin = checkWin(superBoardState);
    if (superWin) {
        endGame(superWin);
    } else if (!superBoardState.includes(null)) {
        endGame('T');
    }
}

function updateBoardVisuals() {
    for (let i = 0; i < 9; i++) {
        const mbEl = document.getElementById(`mb-${i}`);
        
        // Remove classes
        mbEl.classList.remove('active-board', 'disabled-board', 'won-x', 'won-o', 'won-a', 'won-s', 'tie');
        
        // Win overlay
        if (superBoardState[i] === 'X') mbEl.classList.add('won-x');
        else if (superBoardState[i] === 'O') mbEl.classList.add('won-o');
        else if (superBoardState[i] === 'A') mbEl.classList.add('won-a');
        else if (superBoardState[i] === 'S') mbEl.classList.add('won-s');
        else if (superBoardState[i] === 'T') mbEl.classList.add('tie');
        
        // Active/Disabled
        if (!isGameOver) {
            if (superBoardState[i] !== null) {
                mbEl.classList.add('disabled-board');
            } else if (activeMiniBoard !== -1 && activeMiniBoard !== i) {
                mbEl.classList.add('disabled-board');
            } else {
                mbEl.classList.add('active-board');
            }
        }
    }
}

function checkWin(board) {
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
        [0, 4, 8], [2, 4, 6]             // Diagonals
    ];
    
    for (let pattern of winPatterns) {
        const [a, b, c] = pattern;
        if (board[a] && board[a] === board[b] && board[a] === board[c] && board[a] !== 'T') {
            return board[a];
        }
    }
    return null;
}

function updateHUD() {
    for (let i = 0; i < numPlayers; i++) {
        const hudBox = document.getElementById(`hud-p${i}`);
        if (hudBox) {
            if (currentTurnIdx === i) {
                hudBox.classList.add('active-turn');
            } else {
                hudBox.classList.remove('active-turn');
            }
        }
    }
    
    const p = PLAYERS[currentTurnIdx];
    
    if (activeMode.startsWith('p2p')) {
        if (p.symbol === myPlayerSymbol) {
            turnIndicator.innerText = `دورك الآن (${p.display})`;
        } else {
            turnIndicator.innerText = `دور اللاعب ${currentTurnIdx + 1} (${p.display})`;
        }
    } else {
        turnIndicator.innerText = `دور اللاعب ${currentTurnIdx + 1} (${p.display})`;
    }
    
    turnIndicator.className = `turn-indicator ${p.textClass}`;
}

function endGame(winner) {
    isGameOver = true;
    updateBoardVisuals(); // Removes active borders
    
    setTimeout(() => {
        showScreen(gameOverScreen);
        const titleEl = document.getElementById('game-over-title');
        
        if (winner === 'T') {
            titleEl.innerText = "النتيجة: تعادل!";
            titleEl.className = "glow-text text-tie";
        } else {
            const pIndex = PLAYERS.findIndex(p => p.symbol === winner);
            const p = PLAYERS[pIndex];
            
            let winText = "";
            if (activeMode === 'local') {
                winText = `اللاعب ${pIndex + 1} (${p.display}) يفوز! 🎉`;
            } else {
                winText = winner === myPlayerSymbol ? "لقد فزت! 🎉" : "لقد خسرت.. 😔";
            }
            titleEl.innerText = winText;
            titleEl.className = `glow-text ${p.textClass}`;
        }
    }, 1000);
}

document.getElementById('restart-btn').addEventListener('click', () => {
    if (activeMode === 'p2p-join') {
        showToast("فقط مدير الغرفة يمكنه بدء اللعب من جديد!");
        return;
    }
    if (activeMode === 'p2p-host') {
        broadcast({ type: 'restart' });
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
