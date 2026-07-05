const $ = id => document.getElementById(id);
const showScreen = id => {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $(id).classList.add('active');
};

let peer = null;
let myId = null;
let myName = '';
let isHost = false;
let conn = null; // Since it's exactly 2 players

let gameState = {
    status: 'lobby', // lobby, playing, game-over
    timeRemaining: 600, // 10 minutes
    players: [],
    puzzles: [
        { id: 1, type: 'colors', solved: false, sequence: [], inputIndex: 0 },
        { id: 2, type: 'simon', solved: false, sequence: [], inputIndex: 0, flashing: false, flashStep: -1 },
        { id: 3, type: 'keypad', solved: false, code: '', input: '' }
    ],
    currentPuzzle: 1,
    resultMsg: ''
};

let timerInterval = null;

// --- Networking ---
$('host-btn').onclick = () => {
    myName = $('player-name').value.trim() || 'اللاعب 1';
    isHost = true;
    $('host-btn').disabled = true;
    $('host-btn').innerText = 'جاري...';
    
    peer = new Peer();
    peer.on('open', id => {
        myId = id;
        gameState.players.push({ id, name: myName, role: 'A' });
        showScreen('lobby-screen');
        $('room-info').classList.remove('hidden');
        $('room-id-display').innerText = id;
        updateLobbyUI();
    });
    
    peer.on('connection', connection => {
        if (gameState.players.length >= 2 || gameState.status !== 'lobby') {
            connection.close(); return;
        }
        conn = connection;
        conn.on('data', data => handleClientData(data));
        conn.on('close', () => alert('انقطع اتصال الضيف'));
    });
};

$('join-btn').onclick = () => {
    const hostId = $('join-id').value.trim();
    myName = $('player-name').value.trim() || 'اللاعب 2';
    if (!hostId) return;
    
    $('join-btn').disabled = true;
    $('join-btn').innerText = 'جاري...';
    
    peer = new Peer();
    peer.on('open', id => {
        myId = id;
        conn = peer.connect(hostId);
        conn.on('open', () => {
            $('room-info').classList.remove('hidden');
            conn.send({ type: 'JOIN', name: myName, id: myId });
        });
        conn.on('data', data => {
            if (data.type === 'STATE_UPDATE') {
                gameState = data.state;
                handleStateUpdate();
            }
        });
        conn.on('error', () => alert('خطأ في الاتصال'));
    });
};

function handleClientData(data) {
    if (data.type === 'JOIN') {
        gameState.players.push({ id: data.id, name: data.name, role: 'B' });
        $('start-game-btn').classList.remove('hidden');
        broadcastState();
    }
    if (data.type === 'ACTION') {
        handleAction(data.action);
    }
}

function broadcastState() {
    if (isHost && conn) {
        conn.send({ type: 'STATE_UPDATE', state: gameState });
    }
    handleStateUpdate();
}

function updateLobbyUI() {
    const ul = $('players-ul');
    ul.innerHTML = '';
    gameState.players.forEach(p => {
        const li = document.createElement('li');
        li.innerText = `${p.name} ${p.id === myId ? '(أنت)' : ''}`;
        ul.appendChild(li);
    });
}

// --- Game Logic (Host only handles state mutations) ---
$('start-game-btn').onclick = () => {
    if (!isHost) return;
    initGame();
};

function initGame() {
    gameState.status = 'playing';
    gameState.timeRemaining = 600;
    gameState.currentPuzzle = 1;
    gameState.resultMsg = '';
    
    // Generate puzzles
    const colors = ['red', 'blue', 'green', 'yellow'];
    let seq1 = [];
    for(let i=0; i<4; i++) seq1.push(colors[Math.floor(Math.random() * colors.length)]);
    gameState.puzzles[0].sequence = seq1;
    gameState.puzzles[0].solved = false;
    gameState.puzzles[0].inputIndex = 0;
    
    let seq2 = [];
    for(let i=0; i<5; i++) seq2.push(Math.floor(Math.random() * 4) + 1);
    gameState.puzzles[1].sequence = seq2;
    gameState.puzzles[1].solved = false;
    gameState.puzzles[1].inputIndex = 0;
    gameState.puzzles[1].flashing = false;
    
    let code = Math.floor(1000 + Math.random() * 9000).toString();
    gameState.puzzles[2].code = code;
    gameState.puzzles[2].solved = false;
    gameState.puzzles[2].input = '';
    
    broadcastState();
    
    timerInterval = setInterval(() => {
        gameState.timeRemaining--;
        if (gameState.timeRemaining <= 0) {
            triggerGameOver('نفد الوقت! لم تتمكنا من الهروب.');
        } else {
            broadcastState(); // Sync timer every sec
        }
    }, 1000);
}

function handleAction(action) {
    if (!isHost) return;
    
    const p1 = gameState.puzzles[0];
    const p2 = gameState.puzzles[1];
    const p3 = gameState.puzzles[2];
    
    if (action.type === 'P1_COLOR') {
        if (action.color === p1.sequence[p1.inputIndex]) {
            p1.inputIndex++;
            if (p1.inputIndex === p1.sequence.length) {
                p1.solved = true;
                gameState.currentPuzzle = 2;
            }
        } else {
            p1.inputIndex = 0; // reset
        }
    }
    
    if (action.type === 'P2_FLASH') {
        if (!p2.flashing) {
            p2.flashing = true;
            p2.flashStep = 0;
            // The actual flashing loop is handled on client render, but host syncs the state.
            let flashInt = setInterval(() => {
                p2.flashStep++;
                if (p2.flashStep >= p2.sequence.length) {
                    clearInterval(flashInt);
                    p2.flashing = false;
                    setTimeout(() => { p2.flashStep = -1; broadcastState(); }, 500);
                }
                broadcastState();
            }, 800);
        }
    }
    
    if (action.type === 'P2_BTN') {
        if (action.val === p2.sequence[p2.inputIndex]) {
            p2.inputIndex++;
            if (p2.inputIndex === p2.sequence.length) {
                p2.solved = true;
                gameState.currentPuzzle = 3;
            }
        } else {
            p2.inputIndex = 0;
        }
    }
    
    if (action.type === 'P3_KEY') {
        if (action.val === 'C') {
            p3.input = '';
        } else if (action.val === 'E') {
            if (p3.input === p3.code) {
                p3.solved = true;
                checkWin();
            } else {
                p3.input = '';
            }
        } else {
            if (p3.input.length < 4) p3.input += action.val;
        }
    }
    
    broadcastState();
}

function sendAction(action) {
    if (isHost) handleAction(action);
    else conn.send({ type: 'ACTION', action });
}

function triggerGameOver(msg) {
    if (timerInterval) clearInterval(timerInterval);
    gameState.status = 'game-over';
    gameState.resultMsg = msg;
    broadcastState();
    if (window.parent) window.parent.postMessage({ type: 'ARCADE_GAME_OVER', winner: 'Defeat', gameId: 'escape-room' }, '*');
}

function checkWin() {
    if (gameState.puzzles.every(p => p.solved)) {
        if (timerInterval) clearInterval(timerInterval);
        gameState.status = 'game-over';
        gameState.resultMsg = 'تهانينا! لقد تمكنتما من الهروب معاً!';
        broadcastState();
        if (window.parent) window.parent.postMessage({ type: 'ARCADE_GAME_OVER', winner: 'Victory', gameId: 'escape-room' }, '*');
    }
}

// --- Rendering ---
function handleStateUpdate() {
    if (gameState.status === 'lobby') {
        updateLobbyUI();
    } else if (gameState.status === 'playing') {
        showScreen('game-screen');
        if (isHost && gameState.timeRemaining === 600 && window.parent) {
            window.parent.postMessage({ type: 'ARCADE_GAME_START', gameId: 'escape-room' }, '*');
        }
        renderGame();
    } else if (gameState.status === 'game-over') {
        showScreen('game-over-screen');
        $('end-title').innerText = gameState.puzzles.every(p => p.solved) ? 'تم الهروب! 🚪🏃' : 'انتهى الوقت! ⏳';
        $('end-msg').innerText = gameState.resultMsg;
        if (isHost) $('restart-btn').classList.remove('hidden');
        else $('waiting-host-msg').classList.remove('hidden');
    }
}

const COLOR_NAMES = { 'red': 'أحمر', 'blue': 'أزرق', 'green': 'أخضر', 'yellow': 'أصفر' };

function renderGame() {
    let m = Math.floor(gameState.timeRemaining / 60).toString().padStart(2, '0');
    let s = (gameState.timeRemaining % 60).toString().padStart(2, '0');
    $('timer').innerText = `${m}:${s}`;
    
    let solvedCount = gameState.puzzles.filter(p=>p.solved).length;
    $('progress').innerText = `الأقفال المفتوحة: ${solvedCount} / 3`;
    
    for(let i=1; i<=3; i++) {
        const lock = $(`lock-${i}`);
        if (gameState.puzzles[i-1].solved) {
            lock.innerText = '🔓';
            lock.classList.add('open');
        } else {
            lock.innerText = '🔒';
            lock.classList.remove('open');
        }
    }
    
    const me = gameState.players.find(p => p.id === myId);
    const myRole = me ? me.role : 'A';
    
    // Hide all stations
    $('puzzle-1-station').classList.add('hidden');
    $('puzzle-2-station').classList.add('hidden');
    $('puzzle-3-station').classList.add('hidden');
    
    const p1 = gameState.puzzles[0];
    const p2 = gameState.puzzles[1];
    const p3 = gameState.puzzles[2];
    
    if (gameState.currentPuzzle === 1 && !p1.solved) {
        $('puzzle-1-station').classList.remove('hidden');
        if (myRole === 'A') {
            $('p1-clue').classList.remove('hidden');
            $('p1-controls').classList.add('hidden');
            let seqText = p1.sequence.map(c => COLOR_NAMES[c]).join(' - ');
            $('p1-clue').innerText = `الترتيب السري:\n${seqText}`;
        } else {
            $('p1-clue').classList.add('hidden');
            $('p1-controls').classList.remove('hidden');
        }
    }
    
    if (gameState.currentPuzzle === 2 && !p2.solved) {
        $('puzzle-2-station').classList.remove('hidden');
        if (myRole === 'B') {
            $('p2-display').classList.remove('hidden');
            $('p2-controls').classList.add('hidden');
            
            // Flashing logic
            for(let i=1; i<=4; i++) $(`sl-${i}`).classList.remove('active');
            if (p2.flashing && p2.flashStep >= 0 && p2.flashStep < p2.sequence.length) {
                let activeId = p2.sequence[p2.flashStep];
                $(`sl-${activeId}`).classList.add('active');
            }
        } else {
            $('p2-display').classList.add('hidden');
            $('p2-controls').classList.remove('hidden');
        }
    }
    
    if (gameState.currentPuzzle === 3 && !p3.solved) {
        $('puzzle-3-station').classList.remove('hidden');
        $('keypad-display').innerText = p3.input.padEnd(4, '-');
        
        const code = p3.code; // String
        if (myRole === 'A') {
            $('p3-clue').innerText = `الرقم الأول هو: ${code[0]}\nالرقم الثالث هو: ${code[2]}`;
        } else {
            $('p3-clue').innerText = `الرقم الثاني هو: ${code[1]}\nالرقم الرابع هو: ${code[3]}`;
        }
    }
}

// Bind events
document.querySelectorAll('.color-btn').forEach(b => {
    b.onclick = () => sendAction({ type: 'P1_COLOR', color: b.getAttribute('data-color') });
});

$('p2-start-flash').onclick = () => sendAction({ type: 'P2_FLASH' });

document.querySelectorAll('.simon-btn').forEach(b => {
    b.onclick = () => sendAction({ type: 'P2_BTN', val: parseInt(b.getAttribute('data-idx')) });
});

document.querySelectorAll('.k-btn').forEach(b => {
    b.onclick = () => sendAction({ type: 'P3_KEY', val: b.innerText });
});

$('restart-btn').onclick = () => {
    if (isHost) initGame();
};
