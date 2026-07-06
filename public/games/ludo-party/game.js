const boardSize = 15;
const grid = document.getElementById('ludo-grid');
const tokensLayer = document.getElementById('tokens-layer');
const diceEl = document.getElementById('dice');
const turnIndicator = document.getElementById('turn-indicator');
const setupScreen = document.getElementById('setup-screen');
const toastEl = document.getElementById('toast');

const colors = ['red', 'green', 'yellow', 'blue'];
const colorNames = ['الأحمر', 'الأخضر', 'الأصفر', 'الأزرق'];

// Path Coordinates
const mainPath = [
    {x:1,y:6},{x:2,y:6},{x:3,y:6},{x:4,y:6},{x:5,y:6}, 
    {x:6,y:5},{x:6,y:4},{x:6,y:3},{x:6,y:2},{x:6,y:1},{x:6,y:0}, 
    {x:7,y:0},{x:8,y:0}, 
    {x:8,y:1},{x:8,y:2},{x:8,y:3},{x:8,y:4},{x:8,y:5}, 
    {x:9,y:6},{x:10,y:6},{x:11,y:6},{x:12,y:6},{x:13,y:6},{x:14,y:6}, 
    {x:14,y:7},{x:14,y:8}, 
    {x:13,y:8},{x:12,y:8},{x:11,y:8},{x:10,y:8},{x:9,y:8}, 
    {x:8,y:9},{x:8,y:10},{x:8,y:11},{x:8,y:12},{x:8,y:13},{x:8,y:14}, 
    {x:7,y:14},{x:6,y:14}, 
    {x:6,y:13},{x:6,y:12},{x:6,y:11},{x:6,y:10},{x:6,y:9}, 
    {x:5,y:8},{x:4,y:8},{x:3,y:8},{x:2,y:8},{x:1,y:8},{x:0,y:8}, 
    {x:0,y:7},{x:0,y:6}
];

const victoryPaths = [
    [{x:1,y:7},{x:2,y:7},{x:3,y:7},{x:4,y:7},{x:5,y:7}], // Red
    [{x:7,y:1},{x:7,y:2},{x:7,y:3},{x:7,y:4},{x:7,y:5}], // Green
    [{x:13,y:7},{x:12,y:7},{x:11,y:7},{x:10,y:7},{x:9,y:7}], // Yellow
    [{x:7,y:13},{x:7,y:12},{x:7,y:11},{x:7,y:10},{x:7,y:9}] // Blue
];

const startIndices = [0, 13, 26, 39];
const safeIndices = [0, 8, 13, 21, 26, 34, 39, 47];

// Game State
let state = {
    status: 'waiting', // waiting, rolling, moving, finished
    players: [], // { id, colorId }
    tokens: [], // { id, colorId, pos: -1..57 }
    turn: 0, // colorId
    diceValue: 6,
    hasRolled: false
};

let myId = 'p_' + Math.floor(Math.random() * 1000);
let isHost = false;

// Initialization
function initBoard() {
    for (let y = 0; y < boardSize; y++) {
        for (let x = 0; x < boardSize; x++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            
            // Check if part of main path
            const pathIdx = mainPath.findIndex(p => p.x === x && p.y === y);
            if (pathIdx !== -1) {
                cell.classList.add('bg-path');
                if (safeIndices.includes(pathIdx)) {
                    cell.classList.add('safe-zone');
                    if (pathIdx === 0) cell.classList.add('bg-red');
                    if (pathIdx === 13) cell.classList.add('bg-green');
                    if (pathIdx === 26) cell.classList.add('bg-yellow');
                    if (pathIdx === 39) cell.classList.add('bg-blue');
                }
            }

            // Check victory paths
            for (let c = 0; c < 4; c++) {
                if (victoryPaths[c].some(p => p.x === x && p.y === y)) {
                    cell.classList.add(`bg-${colors[c]}`);
                }
            }

            grid.appendChild(cell);
        }
    }

    // Initialize Tokens
    for (let c = 0; c < 4; c++) {
        for (let i = 0; i < 4; i++) {
            state.tokens.push({ id: i, colorId: c, pos: -1 });
            
            const homeSpot = document.createElement('div');
            homeSpot.className = 'home-spot';
            homeSpot.id = `home-${colors[c]}-${i}`;
            document.getElementById(`home-${colors[c]}`).appendChild(homeSpot);
        }
    }
}

function renderTokens() {
    tokensLayer.innerHTML = '';
    const posCounts = {}; // Track tokens at same position

    state.tokens.forEach(t => {
        if (t.pos === 57) return; // Finished, don't render on board

        let x, y;
        let isHome = false;

        if (t.pos === -1) {
            // Home position
            const spot = document.getElementById(`home-${colors[t.colorId]}-${t.id}`);
            const rect = spot.getBoundingClientRect();
            const gridRect = grid.getBoundingClientRect();
            x = rect.left - gridRect.left + rect.width / 2;
            y = rect.top - gridRect.top + rect.height / 2;
            isHome = true;
        } else {
            let coords;
            if (t.pos < 51) {
                const idx = (startIndices[t.colorId] + t.pos) % 52;
                coords = mainPath[idx];
            } else {
                coords = victoryPaths[t.colorId][t.pos - 51];
            }
            
            // Convert grid coords to pixels
            const cellW = grid.clientWidth / 15;
            const cellH = grid.clientHeight / 15;
            x = (coords.x + 0.5) * cellW;
            y = (coords.y + 0.5) * cellH;

            // Offset if multiple tokens on same spot
            const posKey = `${coords.x},${coords.y}`;
            posCounts[posKey] = (posCounts[posKey] || 0) + 1;
            const count = posCounts[posKey];
            if (count > 1) {
                x += (count % 2 === 0 ? 1 : -1) * (cellW * 0.2);
                y += (count > 2 ? 1 : -1) * (cellH * 0.2);
            }
        }

        const el = document.createElement('div');
        el.className = `token ${colors[t.colorId]}`;
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;

        // Interactive highlight
        if (state.status === 'moving' && state.turn === t.colorId) {
            if ((t.pos === -1 && state.diceValue === 6) || (t.pos !== -1 && t.pos + state.diceValue <= 56)) {
                
                // Allow interaction if it's my turn (host handles its own, guests send input)
                const isMyTurn = isHost || state.players.some(p => p.id === myId && p.colorId === state.turn);
                if (isMyTurn) {
                    el.classList.add('highlight');
                    el.onclick = () => handleTokenClick(t.colorId, t.id);
                }
            }
        }

        tokensLayer.appendChild(el);
    });
}

function updateUI() {
    renderTokens();
    
    // Dice
    diceEl.dataset.value = state.diceValue;
    if (state.status === 'rolling' && (isHost || state.players.some(p => p.id === myId && p.colorId === state.turn))) {
        diceEl.classList.remove('disabled');
    } else {
        diceEl.classList.add('disabled');
    }

    // Turn indicator
    turnIndicator.innerText = `دور ${colorNames[state.turn]}`;
    turnIndicator.style.color = `var(--${colors[state.turn]})`;

    // Player Cards
    colors.forEach((c, i) => {
        const card = document.getElementById(`card-${c}`);
        card.classList.toggle('active', state.turn === i);
        
        const p = state.players.find(pl => pl.colorId === i);
        if (p) {
            card.querySelector('p').innerText = p.id === myId ? 'أنت' : 'متصل';
            card.style.opacity = 1;
        } else {
            card.querySelector('p').innerText = 'في الانتظار';
            card.style.opacity = 0.5;
        }
    });

    if (state.status === 'playing' || state.status === 'rolling' || state.status === 'moving') {
        setupScreen.style.display = 'none';
    } else if (state.status === 'finished') {
        setupScreen.style.display = 'flex';
        setupScreen.innerHTML = `<h1>فاز ${colorNames[state.turn]}! 🏆</h1><button class="btn" onclick="location.reload()">إلعب مجدداً</button>`;
    } else {
        document.getElementById('setup-status').innerText = `بانتظار انضمام اللاعبين (${state.players.length}/4)...`;
    }
}

function showToast(msg) {
    toastEl.innerText = msg;
    toastEl.style.opacity = 1;
    setTimeout(() => toastEl.style.opacity = 0, 2000);
}

function showEventText(msg, color) {
    const el = document.createElement('div');
    el.className = 'event-text';
    el.innerText = msg;
    el.style.color = `var(--${color})`;
    el.style.left = '50%';
    el.style.top = '50%';
    document.getElementById('game-container').appendChild(el);
    setTimeout(() => el.remove(), 1000);
}

// Logic - Host Only
function rollDiceHost() {
    if (state.status !== 'rolling') return;
    
    diceEl.classList.add('rolling');
    setTimeout(() => {
        diceEl.classList.remove('rolling');
        state.diceValue = Math.floor(Math.random() * 6) + 1;
        state.hasRolled = true;
        
        // Check if there are valid moves
        const validTokens = state.tokens.filter(t => t.colorId === state.turn && ((t.pos === -1 && state.diceValue === 6) || (t.pos !== -1 && t.pos + state.diceValue <= 56)));
        
        if (validTokens.length === 0) {
            showEventText('لا يوجد حركة!', colors[state.turn]);
            nextTurn();
        } else if (validTokens.length === 1 && state.diceValue !== 6 && validTokens[0].pos !== -1) {
            // Auto move if only one choice
            moveTokenHost(validTokens[0].id);
        } else {
            state.status = 'moving';
        }
        syncState();
    }, 500);
    
    // Broadcast rolling animation
    if(isHost) broadcast({ type: 'ROLL_ANIM' });
}

function moveTokenHost(tokenId) {
    const t = state.tokens.find(t => t.colorId === state.turn && t.id === tokenId);
    if (!t) return;

    if (t.pos === -1) {
        if (state.diceValue !== 6) return;
        t.pos = 0; // Start square
    } else {
        if (t.pos + state.diceValue > 56) return;
        t.pos += state.diceValue;
    }

    // Capture logic
    let captured = false;
    if (t.pos < 51) {
        const myGlobalIdx = (startIndices[t.colorId] + t.pos) % 52;
        if (!safeIndices.includes(myGlobalIdx)) {
            state.tokens.forEach(enemy => {
                if (enemy.colorId !== t.colorId && enemy.pos >= 0 && enemy.pos < 51) {
                    const enemyGlobalIdx = (startIndices[enemy.colorId] + enemy.pos) % 52;
                    if (myGlobalIdx === enemyGlobalIdx) {
                        enemy.pos = -1; // Send back home
                        captured = true;
                        showEventText('أكلت البيدق! 💥', colors[t.colorId]);
                    }
                }
            });
        }
    }

    // Check Win
    const allFinished = state.tokens.filter(t => t.colorId === state.turn && t.pos === 56).length === 4;
    if (allFinished) {
        state.status = 'finished';
        syncState();
        return;
    }

    // Extra Turn?
    if (state.diceValue === 6 || captured || t.pos === 56) {
        state.status = 'rolling';
        state.hasRolled = false;
        showEventText('رمية إضافية! 🎲', colors[t.colorId]);
    } else {
        nextTurn();
    }
    
    syncState();
}

function nextTurn() {
    do {
        state.turn = (state.turn + 1) % 4;
    } while (!state.players.some(p => p.colorId === state.turn) && state.players.length > 0);
    
    state.status = 'rolling';
    state.hasRolled = false;
}

function syncState() {
    if (!isHost) return;
    updateUI();
    window.parent.postMessage({ type: 'SYNC_STATE', state }, '*');
}

function broadcast(data) {
    window.parent.postMessage(data, '*');
}

// Input Handlers
function rollDice() {
    const isMyTurn = isHost || state.players.some(p => p.id === myId && p.colorId === state.turn);
    if (!isMyTurn || state.status !== 'rolling') return;

    if (isHost) {
        rollDiceHost();
    } else {
        broadcast({ type: 'INPUT_ROLL', playerId: myId });
    }
}

function handleTokenClick(colorId, tokenId) {
    if (isHost) {
        moveTokenHost(tokenId);
    } else {
        broadcast({ type: 'INPUT_MOVE', playerId: myId, colorId, tokenId });
    }
}

// Host actions
window.startGame = function() {
    if (!isHost) return;
    state.status = 'rolling';
    state.turn = state.players[0].colorId;
    syncState();
};

// WebRTC Bridge
window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || !data.type) return;

    if (data.type === 'SYNC_STATE' && !isHost) {
        state = data.state;
        updateUI();
    } else if (data.type === 'ROLL_ANIM' && !isHost) {
        diceEl.classList.add('rolling');
        setTimeout(() => diceEl.classList.remove('rolling'), 500);
    } else if (data.type === 'PLAYER_JOINED' && isHost) {
        if (!state.players.find(p => p.id === data.playerId)) {
            const nextColor = state.players.length;
            if (nextColor < 4) {
                state.players.push({ id: data.playerId, colorId: nextColor });
                if (state.players.length > 1) document.getElementById('start-btn').disabled = false;
                syncState();
            }
        }
    } else if (data.type === 'INPUT_ROLL' && isHost) {
        const p = state.players.find(p => p.id === data.playerId);
        if (p && p.colorId === state.turn) rollDiceHost();
    } else if (data.type === 'INPUT_MOVE' && isHost) {
        const p = state.players.find(p => p.id === data.playerId);
        if (p && p.colorId === state.turn && data.colorId === state.turn) {
            moveTokenHost(data.tokenId);
        }
    }
});

initBoard();

// Initial connection
setTimeout(() => {
    broadcast({ type: 'PLAYER_JOINED', playerId: myId });
}, 500);

// Local Test Mode (append ?mode=local to URL)
if (new URLSearchParams(window.location.search).get('mode') === 'local') {
    isHost = true;
    state.players.push({ id: myId, colorId: 0 });
    state.players.push({ id: 'bot1', colorId: 1 }); // Test with 2 players
    document.getElementById('start-btn').disabled = false;
    updateUI();
}

// Window resize handler to reposition tokens correctly
window.addEventListener('resize', () => {
    if (state.status !== 'waiting') renderTokens();
});
