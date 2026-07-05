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

const superBoardEl = document.getElementById('super-board');
const p1Hud = document.getElementById('p1-hud');
const p2Hud = document.getElementById('p2-hud');
const turnIndicator = document.getElementById('turn-indicator');

// Game State
let activeMode = 'local'; // local, p2p-host, p2p-join
let peer = null;
let conn = null;
let isHost = true;
let myPlayerSymbol = 'X'; // Host is X, Join is O

let superBoardState = Array(9).fill(null); // 'X', 'O', 'T'
let miniBoardsState = Array(9).fill(null).map(() => Array(9).fill(null));
let currentTurn = 'X';
let activeMiniBoard = -1; // -1 means any board
let isGameOver = false;

// Initialize
modeBtns.forEach(btn => btn.addEventListener('click', e => {
    activeMode = e.target.dataset.mode;
    if (activeMode === 'p2p') {
        showScreen(p2pMenu);
    } else {
        isHost = true;
        myPlayerSymbol = 'X';
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
    myPlayerSymbol = 'X';
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
function startGame() {
    showScreen(gameScreen);
    resetGameState();
    renderBoard();
    updateHUD();
    
    if (activeMode === 'p2p-host') {
        broadcast({ type: 'game_start' });
    }
}

function startGameClient() {
    showScreen(gameScreen);
    resetGameState();
    renderBoard();
    updateHUD();
}

function resetGameState() {
    superBoardState = Array(9).fill(null);
    miniBoardsState = Array(9).fill(null).map(() => Array(9).fill(null));
    currentTurn = 'X';
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
    
    // In P2P, check if it's my turn
    if ((activeMode === 'p2p-host' || activeMode === 'p2p-join') && currentTurn !== myPlayerSymbol) {
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
    
    // Make Move
    miniBoardsState[boardIdx][cellIdx] = currentTurn;
    
    const cellEl = document.getElementById(`cell-${boardIdx}-${cellIdx}`);
    cellEl.innerText = currentTurn === 'X' ? '✖' : '⭕';
    cellEl.classList.add('taken');
    if (currentTurn === 'X') cellEl.classList.add('text-x');
    else cellEl.classList.add('text-o');
    
    if (shouldBroadcast && (activeMode === 'p2p-host' || activeMode === 'p2p-join')) {
        broadcast({ type: 'move', boardIdx, cellIdx });
    }
    
    // Check Mini Board Win
    const miniWin = checkWin(miniBoardsState[boardIdx]);
    if (miniWin) {
        superBoardState[boardIdx] = miniWin; // 'X', 'O', or 'T' (Tie)
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
    currentTurn = currentTurn === 'X' ? 'O' : 'X';
    
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
        mbEl.classList.remove('active-board', 'disabled-board', 'won-x', 'won-o', 'tie');
        
        // Win overlay
        if (superBoardState[i] === 'X') mbEl.classList.add('won-x');
        else if (superBoardState[i] === 'O') mbEl.classList.add('won-o');
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
    if (currentTurn === 'X') {
        p1Hud.classList.add('active-turn');
        p2Hud.classList.remove('active-turn');
        turnIndicator.innerText = "دور اللاعب 1 (✖)";
        turnIndicator.className = "turn-indicator text-x";
    } else {
        p2Hud.classList.add('active-turn');
        p1Hud.classList.remove('active-turn');
        turnIndicator.innerText = "دور اللاعب 2 (⭕)";
        turnIndicator.className = "turn-indicator text-o";
    }
    
    // In P2P, show if it's MY turn explicitly
    if (activeMode.startsWith('p2p')) {
        if (currentTurn === myPlayerSymbol) {
            turnIndicator.innerText = "دورك الآن (" + (myPlayerSymbol === 'X' ? '✖' : '⭕') + ")";
        }
    }
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
            let winText = "";
            if (activeMode === 'local') {
                winText = winner === 'X' ? "اللاعب 1 (✖) يفوز!" : "اللاعب 2 (⭕) يفوز!";
            } else {
                winText = winner === myPlayerSymbol ? "لقد فزت! 🎉" : "لقد خسرت.. 😔";
            }
            titleEl.innerText = winText;
            titleEl.className = `glow-text ${winner === 'X' ? 'text-x' : 'text-o'}`;
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
