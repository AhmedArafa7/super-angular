const boardSize = 15;
const grid = document.getElementById('ludo-grid');
const tokensLayer = document.getElementById('tokens-layer');
const setupScreen = document.getElementById('setup-screen');
const toastEl = document.getElementById('toast');

const colors = ['red', 'green', 'yellow', 'blue'];
const colorNames = ['الموف 🟣', 'البينك 🌸', 'الأسود ⬛', 'البني 🟤'];

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
    [{x:1,y:7},{x:2,y:7},{x:3,y:7},{x:4,y:7},{x:5,y:7}], // Mauve (Red)
    [{x:7,y:1},{x:7,y:2},{x:7,y:3},{x:7,y:4},{x:7,y:5}], // Pink (Green)
    [{x:13,y:7},{x:12,y:7},{x:11,y:7},{x:10,y:7},{x:9,y:7}], // Black (Yellow)
    [{x:7,y:13},{x:7,y:12},{x:7,y:11},{x:7,y:10},{x:7,y:9}] // Brown (Blue)
];

const startIndices = [0, 13, 26, 39];
const safeIndices = [0, 8, 13, 21, 26, 34, 39, 47];

// Game State
let state = {
    status: 'waiting', // waiting, rolling, moving, finished
    turn: 0,
    diceValue: 6,
    lastDiceValue: 0,
    lastDicePerPlayer: [6, 6, 6, 6],
    hasRolled: false,
    players: [],
    tokens: [],
    turnTimer: 10
};

let isHost = false;
let myId = Math.random().toString(36).substring(2, 9);
let autoRollTimerInterval = null;
let isAnimatingMove = false;

// Initialize Tokens & Grid
function initBoard() {
    grid.innerHTML = '';
    for (let r = 0; r < boardSize; r++) {
        for (let c = 0; c < boardSize; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.r = r;
            cell.dataset.c = c;
            
            // Check if cell is path or safe zone
            const isMainPath = mainPath.some(p => p.x === c && p.y === r);
            const isVictoryPath = victoryPaths.some(vp => vp.some(p => p.x === c && p.y === r));
            
            if (isMainPath || isVictoryPath) cell.classList.add('bg-path');
            
            // Color victory paths
            if (victoryPaths[0].some(p => p.x === c && p.y === r)) cell.classList.add('bg-red');
            if (victoryPaths[1].some(p => p.x === c && p.y === r)) cell.classList.add('bg-green');
            if (victoryPaths[2].some(p => p.x === c && p.y === r)) cell.classList.add('bg-yellow');
            if (victoryPaths[3].some(p => p.x === c && p.y === r)) cell.classList.add('bg-blue');
            
            // Safe zones
            const globalIdx = mainPath.findIndex(p => p.x === c && p.y === r);
            if (safeIndices.includes(globalIdx)) cell.classList.add('safe-zone');
            
            grid.appendChild(cell);
        }
    }

    // Init Home Spot placeholders
    colors.forEach(c => {
        const homeInner = document.getElementById(`home-${c}`);
        if (homeInner) {
            homeInner.innerHTML = `
                <div class="home-spot"></div>
                <div class="home-spot"></div>
                <div class="home-spot"></div>
                <div class="home-spot"></div>
            `;
        }
    });

    // Init Tokens
    state.tokens = [];
    for (let colorId = 0; colorId < 4; colorId++) {
        for (let i = 0; i < 4; i++) {
            state.tokens.push({ id: i, colorId, pos: -1 });
        }
    }
}

function getCellPos(r, c) {
    const cell = document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
    if (!cell || !tokensLayer) return { top: 0, left: 0 };
    const rect = cell.getBoundingClientRect();
    const layerRect = tokensLayer.getBoundingClientRect();
    return {
        top: rect.top - layerRect.top + rect.height / 2,
        left: rect.left - layerRect.left + rect.width / 2
    };
}

function getTokenCoords(t) {
    if (t.pos === -1) {
        // In Home Spot
        const spots = document.querySelectorAll(`#home-${colors[t.colorId]} .home-spot`);
        const spot = spots[t.id];
        if (!spot || !tokensLayer) return { top: 0, left: 0 };
        const rect = spot.getBoundingClientRect();
        const layerRect = tokensLayer.getBoundingClientRect();
        return {
            top: rect.top - layerRect.top + rect.height / 2,
            left: rect.left - layerRect.left + rect.width / 2
        };
    }

    if (t.pos < 51) {
        // On Main Path
        const globalIdx = (startIndices[t.colorId] + t.pos) % 52;
        const pt = mainPath[globalIdx];
        return getCellPos(pt.y, pt.x);
    } else {
        // On Victory Path or Center
        const vIdx = t.pos - 51;
        if (vIdx < 5) {
            const pt = victoryPaths[t.colorId][vIdx];
            return getCellPos(pt.y, pt.x);
        } else {
            // Home Center
            return getCellPos(7, 7);
        }
    }
}

function renderTokens() {
    tokensLayer.innerHTML = '';

    // Group tokens by location for stack offset
    const map = {};
    state.tokens.forEach(t => {
        const key = `${t.colorId}_${t.pos}`;
        if (!map[key]) map[key] = [];
        map[key].push(t);
    });

    state.tokens.forEach(t => {
        const el = document.createElement('div');
        el.className = `token ${colors[t.colorId]}`;
        
        const coords = getTokenCoords(t);
        const stack = map[`${t.colorId}_${t.pos}`];
        let offsetX = 0, offsetY = 0;
        if (stack && stack.length > 1) {
            const idx = stack.indexOf(t);
            offsetX = (idx % 2 === 0 ? -5 : 5);
            offsetY = (idx > 1 ? 5 : -5);
        }

        el.style.top = `${coords.top + offsetY}px`;
        el.style.left = `${coords.left + offsetX}px`;

        // Interactive Highlight
        if (!isAnimatingMove && state.turn === t.colorId && (state.status === 'moving' || (state.status === 'rolling' && state.hasRolled))) {
            const isMyTurn = isHost || state.players.some(p => p.id === myId && p.colorId === state.turn);
            if (isMyTurn) {
                // Check if movable
                const canMove = (t.pos === -1 && state.diceValue === 6) || (t.pos !== -1 && t.pos + state.diceValue <= 56);
                if (canMove) {
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
    
    // Update Corner Player Cards & Dedicated 3D Cube Dice
    for (let i = 0; i < 4; i++) {
        const cornerCard = document.getElementById(`corner-player-${i}`);
        if (!cornerCard) continue;

        const isCurrentTurn = state.turn === i;
        cornerCard.classList.toggle('active', isCurrentTurn);

        // Update player status
        const p = state.players.find(pl => pl.colorId === i);
        const statusText = cornerCard.querySelector('.status-text');
        if (statusText) {
            if (p) {
                statusText.innerText = p.id === myId ? 'أنت 👤' : 'متصل 🟢';
                cornerCard.style.opacity = isCurrentTurn ? '1' : '0.9';
            } else {
                statusText.innerText = 'في الانتظار';
                cornerCard.style.opacity = '0.75';
            }
        }

        // Update Dedicated 3D Cube Dice value (Persists rolled value per player!)
        const cube3d = cornerCard.querySelector('.cube-3d');
        if (cube3d && !cube3d.classList.contains('rolling')) {
            const val = state.lastDicePerPlayer ? (state.lastDicePerPlayer[i] || 6) : 6;
            cube3d.dataset.value = val;
        }
    }

    if (state.status === 'playing' || state.status === 'rolling' || state.status === 'moving') {
        setupScreen.style.display = 'none';
        if (state.status === 'rolling' && !isAnimatingMove) {
            startAutoRollTimer();
        } else {
            clearAutoRollTimer();
        }
    } else if (state.status === 'finished') {
        clearAutoRollTimer();
        setupScreen.style.display = 'flex';
        setupScreen.innerHTML = `<h1>فاز ${colorNames[state.turn]}! 🏆</h1><button class="btn" onclick="location.reload()">إلعب مجدداً</button>`;
    } else {
        clearAutoRollTimer();
        document.getElementById('setup-status').innerText = `بانتظار انضمام اللاعبين (${state.players.length}/4)...`;
    }
}

// 10-Second Auto Roll Timer Management
function startAutoRollTimer() {
    clearAutoRollTimer();
    if (state.status !== 'rolling' || isAnimatingMove) return;

    state.turnTimer = 10;
    updateTimerBadge();

    autoRollTimerInterval = setInterval(() => {
        state.turnTimer--;
        updateTimerBadge();

        if (state.turnTimer <= 0) {
            clearAutoRollTimer();
            if (isHost) {
                rollDiceHost();
            }
        }
    }, 1000);
}

function clearAutoRollTimer() {
    if (autoRollTimerInterval) {
        clearInterval(autoRollTimerInterval);
        autoRollTimerInterval = null;
    }
    for (let i = 0; i < 4; i++) {
        const badge = document.querySelector(`#corner-player-${i} .timer-badge`);
        if (badge) badge.style.display = 'none';
    }
}

function updateTimerBadge() {
    for (let i = 0; i < 4; i++) {
        const badge = document.querySelector(`#corner-player-${i} .timer-badge`);
        if (badge) {
            if (state.turn === i && state.status === 'rolling') {
                badge.innerText = `${state.turnTimer}ث`;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    }
}

function showToast(msg) {
    toastEl.innerText = msg;
    toastEl.style.opacity = 1;
    setTimeout(() => toastEl.style.opacity = 0, 2500);
}

function showEventText(msg, color, duration = 1200) {
    const el = document.createElement('div');
    el.className = 'event-text';
    el.innerText = msg;
    el.style.color = `var(--${color})`;
    el.style.left = '50%';
    el.style.top = '50%';
    document.getElementById('game-container').appendChild(el);
    setTimeout(() => el.remove(), duration);
}

// Logic - Host Only (True 3D Rolling Animation + Persistent Number + Step-by-Step Move)
function rollDiceHost() {
    if (state.status !== 'rolling' || isAnimatingMove) return;
    clearAutoRollTimer();
    
    const activeCube = document.querySelector(`#corner-player-${state.turn} .cube-3d`);

    if (activeCube) {
        activeCube.classList.add('rolling');
    }

    setTimeout(() => {
        if (activeCube) activeCube.classList.remove('rolling');

        // Prevent rolling the exact same number twice in a row
        let newRoll;
        do {
            newRoll = Math.floor(Math.random() * 6) + 1;
        } while (newRoll === state.lastDiceValue);

        state.lastDiceValue = newRoll;
        state.diceValue = newRoll;
        if (!state.lastDicePerPlayer) state.lastDicePerPlayer = [6, 6, 6, 6];
        state.lastDicePerPlayer[state.turn] = newRoll; // Store per-player roll
        state.hasRolled = true;

        if (activeCube) activeCube.dataset.value = newRoll;
        
        // Always display big pop-up text showing what number was rolled!
        showEventText(`🎲 رميت ${newRoll}`, colors[state.turn], 1400);

        // Check if there are valid moves
        const validTokens = state.tokens.filter(t => t.colorId === state.turn && ((t.pos === -1 && state.diceValue === 6) || (t.pos !== -1 && t.pos + state.diceValue <= 56)));
        
        if (validTokens.length === 0) {
            showToast(`اللاعب ${colorNames[state.turn]} حصل على ${newRoll} 🎲 (لا يوجد حركة!)`);
            setTimeout(() => {
                nextTurn();
                syncState();
            }, 1400);
        } else if (validTokens.length === 1 && state.diceValue !== 6 && validTokens[0].pos !== -1) {
            // Auto move if only one choice
            setTimeout(() => {
                moveTokenHost(validTokens[0].id);
            }, 600);
        } else {
            state.status = 'moving';
            syncState();
        }
    }, 650);
    
    if (isHost) broadcast({ type: 'ROLL_ANIM' });
}

// STEP-BY-STEP TILE-BY-TILE PAWN MOVEMENT
function moveTokenHost(tokenId) {
    if (isAnimatingMove) return;
    clearAutoRollTimer();
    const t = state.tokens.find(t => t.colorId === state.turn && t.id === tokenId);
    if (!t) return;

    isAnimatingMove = true;

    if (t.pos === -1) {
        if (state.diceValue !== 6) {
            isAnimatingMove = false;
            return;
        }
        t.pos = 0; // Move 1 step out to start tile
        renderTokens();
        syncState();
        setTimeout(() => {
            isAnimatingMove = false;
            finishMoveLogic(t);
        }, 300);
    } else {
        if (t.pos + state.diceValue > 56) {
            isAnimatingMove = false;
            return;
        }

        // Step-by-step tile movement (220ms per tile)
        let remainingSteps = state.diceValue;
        const moveInterval = setInterval(() => {
            if (remainingSteps > 0 && t.pos < 56) {
                t.pos++;
                remainingSteps--;
                renderTokens();
                syncState();
            } else {
                clearInterval(moveInterval);
                setTimeout(() => {
                    isAnimatingMove = false;
                    finishMoveLogic(t);
                }, 200);
            }
        }, 220);
    }
}

function finishMoveLogic(t) {
    // Capture logic
    let captured = false;
    if (t.pos < 51) {
        const myGlobalIdx = (startIndices[t.colorId] + t.pos) % 52;
        if (!safeIndices.includes(myGlobalIdx)) {
            state.tokens.forEach(enemy => {
                if (enemy.colorId !== t.colorId && enemy.pos >= 0 && enemy.pos < 51) {
                    const enemyGlobalIdx = (startIndices[enemy.colorId] + enemy.pos) % 52;
                    if (myGlobalIdx === enemyGlobalIdx) {
                        enemy.pos = -1; // Send back home!
                        captured = true;
                        showEventText('أكلت البيدق لبيته! 💥🏠', colors[t.colorId]);
                        showToast(`اللاعب ${colorNames[t.colorId]} أكل بيدق ${colorNames[enemy.colorId]} وأرجعه لبيته! 🏠💥`);
                    }
                }
            });
        }
    }

    // Check Win
    const allFinished = state.tokens.filter(tk => tk.colorId === state.turn && tk.pos === 56).length === 4;
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
function rollDice(clickedPlayerColorId) {
    if (isAnimatingMove || state.status !== 'rolling') return;

    // Strict requirement: Only allow clicking the active player's own die!
    if (clickedPlayerColorId !== undefined && clickedPlayerColorId !== state.turn) {
        showToast(`ليس دور هذا النرد! دور ${colorNames[state.turn]} الآن ⚠️`);
        return;
    }

    const activePlayerObj = state.players.find(p => p.colorId === state.turn);
    if (!activePlayerObj) return;

    if (isHost) {
        rollDiceHost();
    } else {
        if (activePlayerObj.id === myId) {
            broadcast({ type: 'INPUT_ROLL', playerId: myId });
        }
    }
}

function handleTokenClick(colorId, tokenId) {
    if (isAnimatingMove) return;
    if (isHost) {
        moveTokenHost(tokenId);
    } else {
        broadcast({ type: 'INPUT_MOVE', playerId: myId, colorId, tokenId });
    }
}

// Local Player Selection (2, 3, or 4 players on same device)
window.selectPlayerCount = function(count, btnElement) {
    if (btnElement) {
        document.querySelectorAll('.count-btn').forEach(btn => btn.classList.remove('active'));
        btnElement.classList.add('active');
    }
    
    isHost = true;
    state.players = [];
    for (let i = 0; i < count; i++) {
        state.players.push({
            id: i === 0 ? myId : `local_player_${i + 1}`,
            colorId: i
        });
    }

    const startBtn = document.getElementById('start-btn');
    if (startBtn) startBtn.disabled = false;

    const setupStatus = document.getElementById('setup-status');
    if (setupStatus) setupStatus.innerText = `جاهز للعب بـ (${count}) لاعبين على نفس الجهاز 🎮`;

    updateUI();
    syncState();
};

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
        const activeCube = document.querySelector(`#corner-player-${state.turn} .cube-3d`);
        if (activeCube) {
            activeCube.classList.add('rolling');
            setTimeout(() => activeCube.classList.remove('rolling'), 650);
        }
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

// Initialize default 4 local players so local play is instantly ready
window.selectPlayerCount(4);

// Initial connection
setTimeout(() => {
    broadcast({ type: 'PLAYER_JOINED', playerId: myId });
}, 500);

// Window resize handler to reposition tokens correctly
window.addEventListener('resize', () => {
    if (state.status !== 'waiting') renderTokens();
});
