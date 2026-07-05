const $ = id => document.getElementById(id);
const showScreen = id => {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $(id).classList.add('active');
};

// --- Setup ---
const canvas = $('game-canvas');
const ctx = canvas.getContext('2d');
// Fixed grid resolution for game logic
const GRID_SIZE = 30; 
let CELL_SIZE = 20; // Will be calculated based on canvas actual size

const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b']; // Red, Blue, Green, Yellow

let peer = null;
let myId = null;
let myName = '';
let isHost = false;
let hostConn = null;
let guestConns = {};

// Game State
let state = {
    status: 'lobby',
    players: [], // { id, name, color, snake: [{x,y}], dir, score, alive }
    food: null,
    winnerName: ''
};

let myDir = 'right';
let nextDir = 'right';
let gameLoopInterval = null;

// --- Networking ---
$('host-btn').onclick = () => {
    myName = $('player-name').value.trim() || 'المضيف';
    isHost = true;
    $('host-btn').disabled = true;
    $('host-btn').innerText = 'جاري...';
    
    peer = new Peer();
    peer.on('open', id => {
        myId = id;
        addPlayer(id, myName);
        showScreen('lobby-screen');
        $('room-info').classList.remove('hidden');
        $('room-id-display').innerText = id;
        $('start-game-btn').classList.remove('hidden');
        updateLobbyUI();
    });
    
    peer.on('connection', conn => {
        if (state.status !== 'lobby') {
            conn.close(); return;
        }
        conn.on('data', data => handleClientData(conn.peer, data));
        conn.on('open', () => {
            guestConns[conn.peer] = conn;
        });
        conn.on('close', () => {
            delete guestConns[conn.peer];
            state.players = state.players.filter(p => p.id !== conn.peer);
            broadcastState();
        });
    });
};

$('join-btn').onclick = () => {
    const hostId = $('join-id').value.trim();
    myName = $('player-name').value.trim() || 'لاعب';
    if (!hostId) return;
    
    $('join-btn').disabled = true;
    $('join-btn').innerText = 'جاري...';
    
    peer = new Peer();
    peer.on('open', id => {
        myId = id;
        hostConn = peer.connect(hostId);
        hostConn.on('open', () => {
            $('room-info').classList.remove('hidden');
            hostConn.send({ type: 'JOIN', name: myName, id: myId });
        });
        hostConn.on('data', data => {
            if (data.type === 'STATE_UPDATE') {
                state = data.state;
                handleStateUpdate();
            }
        });
        hostConn.on('error', () => alert('خطأ في الاتصال'));
    });
};

function handleClientData(peerId, data) {
    if (data.type === 'JOIN') {
        if (state.players.length >= 4) return;
        addPlayer(data.id, data.name);
        broadcastState();
    }
    if (data.type === 'INPUT' && state.status === 'playing') {
        const p = state.players.find(x => x.id === peerId);
        if (p && p.alive) {
            // Prevent 180 turn
            if ((data.dir === 'up' && p.dir !== 'down') ||
                (data.dir === 'down' && p.dir !== 'up') ||
                (data.dir === 'left' && p.dir !== 'right') ||
                (data.dir === 'right' && p.dir !== 'left')) {
                p.dir = data.dir;
            }
        }
    }
}

function broadcastState() {
    if (!isHost) return;
    Object.values(guestConns).forEach(conn => {
        conn.send({ type: 'STATE_UPDATE', state: state });
    });
    handleStateUpdate();
}

function addPlayer(id, name) {
    state.players.push({
        id: id,
        name: name,
        color: colors[state.players.length % colors.length],
        snake: [],
        dir: 'right',
        score: 0,
        alive: true
    });
}

function updateLobbyUI() {
    const ul = $('players-ul');
    ul.innerHTML = '';
    state.players.forEach(p => {
        const li = document.createElement('li');
        li.innerHTML = `<span class="color-dot" style="background:${p.color}"></span> ${p.name} ${p.id === myId ? '(أنت)' : ''}`;
        ul.appendChild(li);
    });
}

// --- Host Game Logic ---
$('start-game-btn').onclick = () => {
    if (!isHost) return;
    initGame();
};

$('restart-btn').onclick = () => {
    if (!isHost) return;
    initGame();
};

function spawnFood() {
    state.food = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
    };
    // Ensure not on snake
    state.players.forEach(p => {
        if (p.alive) {
            p.snake.forEach(seg => {
                if (seg.x === state.food.x && seg.y === state.food.y) spawnFood();
            });
        }
    });
}

function initGame() {
    state.status = 'playing';
    state.winnerName = '';
    
    // Position players
    const startPositions = [
        {x: 5, y: 5, dir: 'right'},
        {x: GRID_SIZE-5, y: GRID_SIZE-5, dir: 'left'},
        {x: GRID_SIZE-5, y: 5, dir: 'down'},
        {x: 5, y: GRID_SIZE-5, dir: 'up'}
    ];
    
    state.players.forEach((p, i) => {
        p.alive = true;
        p.score = 0;
        p.dir = startPositions[i].dir;
        p.snake = [
            {x: startPositions[i].x, y: startPositions[i].y},
            {x: startPositions[i].x, y: startPositions[i].y}, // start with size 3
            {x: startPositions[i].x, y: startPositions[i].y}
        ];
    });
    
    spawnFood();
    broadcastState();
    
    if (gameLoopInterval) clearInterval(gameLoopInterval);
    gameLoopInterval = setInterval(gameStep, 150); // Speed
}

function gameStep() {
    if (state.status !== 'playing') return;
    
    let aliveCount = 0;
    let lastAlive = null;

    state.players.forEach(p => {
        if (!p.alive) return;
        aliveCount++;
        lastAlive = p;
        
        let head = { ...p.snake[0] };
        
        // Move
        if (p.dir === 'up') head.y--;
        if (p.dir === 'down') head.y++;
        if (p.dir === 'left') head.x--;
        if (p.dir === 'right') head.x++;
        
        // Wall collision
        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
            p.alive = false;
            return;
        }
        
        // Self & others collision
        let collided = false;
        state.players.forEach(other => {
            if (!other.alive) return;
            other.snake.forEach(seg => {
                if (head.x === seg.x && head.y === seg.y) {
                    collided = true;
                }
            });
        });
        
        if (collided) {
            p.alive = false;
            return;
        }
        
        p.snake.unshift(head);
        
        // Food
        if (state.food && head.x === state.food.x && head.y === state.food.y) {
            p.score += 10;
            spawnFood();
        } else {
            p.snake.pop();
        }
    });
    
    // Check win condition (if more than 1 player initially)
    if (state.players.length > 1) {
        if (aliveCount === 1) {
            state.status = 'game-over';
            state.winnerName = lastAlive ? lastAlive.name : 'لا أحد';
        } else if (aliveCount === 0) {
            state.status = 'game-over';
            state.winnerName = 'تعادل (الكل مات)';
        }
    } else {
        // Single player mode just plays for score until dead
        if (aliveCount === 0) {
            state.status = 'game-over';
            state.winnerName = 'أنت (نقاطك: ' + state.players[0].score + ')';
        }
    }
    
    if (state.status === 'game-over' && isHost) {
        clearInterval(gameLoopInterval);
        if (window.parent) window.parent.postMessage({ type: 'ARCADE_GAME_OVER', winner: state.winnerName, gameId: 'snake-arena' }, '*');
    }
    
    broadcastState();
}


// --- Rendering & Guest logic ---
function handleStateUpdate() {
    if (state.status === 'lobby') {
        updateLobbyUI();
    } else if (state.status === 'playing') {
        showScreen('game-screen');
        if (isHost && window.parent) window.parent.postMessage({ type: 'ARCADE_GAME_START', gameId: 'snake-arena' }, '*');
        resizeCanvas();
        render();
        updateScoreboard();
    } else if (state.status === 'game-over') {
        showScreen('game-over-screen');
        $('winner-name').innerText = 'الفائز: ' + state.winnerName;
        if (isHost) {
            $('restart-btn').classList.remove('hidden');
        } else {
            $('waiting-host-msg').classList.remove('hidden');
        }
    }
}

function resizeCanvas() {
    const container = document.querySelector('.canvas-container');
    const width = container.clientWidth;
    canvas.width = width;
    canvas.height = width;
    CELL_SIZE = width / GRID_SIZE;
}

window.addEventListener('resize', () => {
    if (state.status === 'playing') resizeCanvas();
});

function render() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw food
    if (state.food) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(
            state.food.x * CELL_SIZE + CELL_SIZE/2, 
            state.food.y * CELL_SIZE + CELL_SIZE/2, 
            CELL_SIZE/2 - 2, 0, Math.PI * 2
        );
        ctx.fill();
    }
    
    // Draw snakes
    state.players.forEach(p => {
        if (!p.alive) return;
        ctx.fillStyle = p.color;
        
        p.snake.forEach((seg, i) => {
            // Make head slightly different
            if (i === 0) {
                ctx.fillStyle = '#fff';
            } else {
                ctx.fillStyle = p.color;
            }
            
            ctx.fillRect(seg.x * CELL_SIZE + 1, seg.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
        });
    });
}

function updateScoreboard() {
    const sb = $('scoreboard');
    sb.innerHTML = '';
    state.players.forEach(p => {
        let div = document.createElement('div');
        div.className = 'score-badge';
        div.style.backgroundColor = p.color;
        if (!p.alive) div.style.opacity = '0.3';
        div.innerText = `${p.name}: ${p.score}`;
        sb.appendChild(div);
    });
}

// --- Inputs ---
window.addEventListener('keydown', e => {
    if (state.status !== 'playing') return;
    
    let newDir = null;
    if (e.key === 'ArrowUp' || e.key === 'w') newDir = 'up';
    if (e.key === 'ArrowDown' || e.key === 's') newDir = 'down';
    if (e.key === 'ArrowLeft' || e.key === 'a') newDir = 'left';
    if (e.key === 'ArrowRight' || e.key === 'd') newDir = 'right';
    
    if (newDir) sendInput(newDir);
});

$('btn-up').onclick = () => sendInput('up');
$('btn-down').onclick = () => sendInput('down');
$('btn-left').onclick = () => sendInput('left');
$('btn-right').onclick = () => sendInput('right');

function sendInput(dir) {
    if (isHost) {
        handleClientData(myId, { type: 'INPUT', dir: dir });
    } else {
        hostConn.send({ type: 'INPUT', dir: dir });
    }
}
