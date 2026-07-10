// Elements shorthand
function $(id) { return document.getElementById(id); }

// Sound helpers
function playSound(type) {
    if (window.parent) {
        window.parent.postMessage({ type: 'AUDIO_PLAY_SFX', volume: 0.8 }, '*');
    }
}

// Read URL Parameters
const urlParams = new URLSearchParams(window.location.search);
const gameMode = urlParams.get('mode') || 'local'; // 'local', 'private', 'pro'
const roomCode = urlParams.get('room') || '';
const playerRole = urlParams.get('role') || 'host'; // 'host', 'guest'

// Game state variables
let activeMode = gameMode;
let myRole = playerRole;
let myRoomCode = roomCode;

let score = {}; // { player_id: points }
let names = {}; // { player_id: display_name }
let gridNumbers = [];
let targetNumber = null;
let winningScore = 10;
let isGameOver = false;

// Local Mode Buzzer variables
let buzzedPlayer = null;
let buzzerTimer = null;
let buzzerTimeRemaining = 3; // 3 seconds to find the number

// AI Opponent for Pro Mode (if played solo)
let aiTimer = null;

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    setupGameMode();
});

// Setup screens according to mode
function setupGameMode() {
    if (activeMode === 'private') {
        $('local-setup').classList.add('hidden');
        $('online-setup').classList.remove('hidden');
        $('room-code-display').classList.remove('hidden');
        $('room-id-val').innerText = myRoomCode;
        
        // Listen to peer messages from Angular parent
        window.addEventListener('message', receiveMessage);
        
        if (myRole === 'host') {
            names['host'] = localStorage.getItem('arcade_player_name') || 'المضيف';
            scores = { 'host': 0, 'guest': 0 };
            
            // Wait brief moment for WebRTC to establish, then start
            setTimeout(() => {
                startOnlineGame();
            }, 2500);
        } else {
            names['guest'] = localStorage.getItem('arcade_player_name') || 'الضيف';
            // Send join confirmation to Host
            sendMessageToPeer({
                type: 'GUEST_JOIN',
                name: names['guest']
            });
        }
    } else if (activeMode === 'pro') {
        // Start pro matchmaking mode against a simulated pro AI player
        $('local-setup').classList.add('hidden');
        $('online-setup').classList.remove('hidden');
        $('online-setup').querySelector('.status-text').innerText = 'جاري البحث عن خصم محترف أونلاين...';
        
        setTimeout(() => {
            initProAiGame();
        }, 2000);
    } else {
        // Local mode - show selection screen
        showScreen('setup-screen');
    }
}

// Show specific screen helper
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $(id).classList.add('active');
}

/* ════════════════════ LOCAL MULTIPLAYER GAME ════════════════════ */

function initLocalGame(playerCount) {
    playSound('click');
    activeMode = 'local';
    
    // Initialize scores
    score = {};
    names = {};
    for (let i = 1; i <= playerCount; i++) {
        score['p' + i] = 0;
        names['p' + i] = 'اللاعب ' + i;
    }
    
    // Display screen
    showScreen('play-screen');
    
    // Inject Buzzers
    setupLocalBuzzers(playerCount);
    
    // Generate board
    generateNewBoard();
    updateScoreboard();
}

function setupLocalBuzzers(count) {
    const container = $('buzzers-container');
    container.className = 'buzzers-' + count + 'p';
    container.classList.remove('hidden');
    container.innerHTML = '';
    
    const config = {
        2: [
            { id: 'p1', label: 'بزر (1)', icon: '🔴' },
            { id: 'p2', label: 'بزر (2)', icon: '🔵' }
        ],
        3: [
            { id: 'p1', label: 'بزر (1)', icon: '🔴' },
            { id: 'p2', label: 'بزر (2)', icon: '🔵' },
            { id: 'p3', label: 'بزر (3)', icon: '🟢' }
        ],
        4: [
            { id: 'p1', label: 'بزر (1)', icon: '🔴' },
            { id: 'p2', label: 'بزر (2)', icon: '🔵' },
            { id: 'p3', label: 'بزر (3)', icon: '🟢' },
            { id: 'p4', label: 'بزر (4)', icon: '🟡' }
        ]
    };
    
    config[count].forEach((p, idx) => {
        const btn = document.createElement('div');
        btn.className = `buzzer-btn buzzer-${p.id}`;
        btn.innerHTML = `<span class="buzzer-icon">${p.icon}</span><span>${names[p.id]}</span>`;
        btn.onclick = () => handleLocalBuzzer(p.id);
        container.appendChild(btn);
    });
}

function handleLocalBuzzer(playerId) {
    if (buzzedPlayer || isGameOver) return;
    
    playSound('buzzer');
    buzzedPlayer = playerId;
    
    // Show Buzzed Modal overlay
    $('buzzed-player-name').innerText = names[playerId] + ' يضغط!';
    $('buzzed-overlay').classList.remove('hidden');
    
    // Start countdown
    buzzerTimeRemaining = 3;
    $('buzzed-timer').innerText = buzzerTimeRemaining;
    
    buzzerTimer = setInterval(() => {
        buzzerTimeRemaining--;
        $('buzzed-timer').innerText = buzzerTimeRemaining;
        
        if (buzzerTimeRemaining <= 0) {
            // Time out penalty
            clearInterval(buzzerTimer);
            punishPlayer(playerId);
        }
    }, 1000);
}

function punishPlayer(playerId) {
    clearInterval(buzzerTimer);
    score[playerId] = Math.max(0, score[playerId] - 1);
    
    // Shake screen and show red flash on modal
    const modal = document.querySelector('.buzzed-modal');
    modal.classList.add('shake');
    playSound('error');
    
    setTimeout(() => {
        modal.classList.remove('shake');
        $('buzzed-overlay').classList.add('hidden');
        buzzedPlayer = null;
        updateScoreboard();
    }, 800);
}

/* ════════════════════ CORE GAME BOARD GENERATOR ════════════════════ */

function generateNewBoard() {
    // Generate unique random numbers 1 to 99
    const candidates = [];
    for (let i = 1; i <= 99; i++) candidates.push(i);
    
    // Shuffle candidates
    candidates.sort(() => Math.random() - 0.5);
    
    // Take first 40 numbers
    gridNumbers = candidates.slice(0, 40);
    
    // Choose target number from grid
    targetNumber = gridNumbers[Math.floor(Math.random() * gridNumbers.length)];
    
    // Render grid
    renderGridUI();
    
    // Update target text
    $('target-number').innerText = targetNumber;
}

function renderGridUI() {
    const grid = $('number-grid');
    grid.innerHTML = '';
    
    gridNumbers.forEach(num => {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.innerText = num;
        cell.onclick = () => handleCellClick(num, cell);
        grid.appendChild(cell);
    });
}

function handleCellClick(num, cellElement) {
    if (isGameOver) return;
    
    // In Local mode, only the buzzed player can click to score
    if (activeMode === 'local') {
        if (!buzzedPlayer) return; // Must buzz first!
        
        if (num === targetNumber) {
            // Correct click!
            clearInterval(buzzerTimer);
            score[buzzedPlayer]++;
            
            playSound('correct');
            cellElement.classList.add('correct-glow');
            
            setTimeout(() => {
                $('buzzed-overlay').classList.add('hidden');
                buzzedPlayer = null;
                
                checkGameWinner();
                if (!isGameOver) {
                    generateNewBoard();
                    updateScoreboard();
                }
            }, 600);
        } else {
            // Incorrect click!
            punishPlayer(buzzedPlayer);
        }
    }
    
    // In Private / Online modes, players click directly on their screen
    else if (activeMode === 'private') {
        if (num === targetNumber) {
            playSound('correct');
            if (myRole === 'host') {
                score['host']++;
                checkGameWinner();
                if (!isGameOver) {
                    generateNewBoard();
                    broadcastState();
                    updateScoreboard();
                }
            } else {
                sendMessageToPeer({
                    type: 'GUEST_SCORED',
                    number: num
                });
            }
        } else {
            playSound('error');
            // Deduct points for wrong taps
            if (myRole === 'host') {
                score['host'] = Math.max(0, score['host'] - 1);
                broadcastState();
                updateScoreboard();
            } else {
                sendMessageToPeer({
                    type: 'GUEST_PENALTY'
                });
            }
        }
    }
    
    // In Pro AI Mode
    else if (activeMode === 'pro') {
        if (num === targetNumber) {
            playSound('correct');
            score['player']++;
            checkProWinner();
            if (!isGameOver) {
                generateNewBoard();
                updateScoreboard();
                resetAiSearch();
            }
        } else {
            playSound('error');
            score['player'] = Math.max(0, score['player'] - 1);
            updateScoreboard();
        }
    }
}

function updateScoreboard() {
    const scoreboard = $('scoreboard');
    scoreboard.innerHTML = '';
    
    Object.keys(score).forEach(playerId => {
        const badge = document.createElement('div');
        badge.className = 'score-badge';
        // Get badge border color corresponding to player
        if (playerId === 'p1' || playerId === 'host' || playerId === 'player') badge.style.borderColor = '#ef4444';
        else if (playerId === 'p2' || playerId === 'guest' || playerId === 'ai') badge.style.borderColor = '#3b82f6';
        else if (playerId === 'p3') badge.style.borderColor = '#10b981';
        else if (playerId === 'p4') badge.style.borderColor = '#f59e0b';
        
        badge.innerHTML = `<span>${names[playerId] || playerId}:</span><span class="score-val">${score[playerId]}</span>`;
        scoreboard.appendChild(badge);
    });
}

function checkGameWinner() {
    Object.keys(score).forEach(playerId => {
        if (score[playerId] >= winningScore) {
            triggerGameOver(names[playerId]);
        }
    });
}

function triggerGameOver(winnerName) {
    isGameOver = true;
    clearInterval(buzzerTimer);
    clearInterval(aiTimer);
    playSound('victory');
    
    // Build leaderboard
    const sorted = Object.keys(score).map(id => ({ id, name: names[id], points: score[id] }))
                                      .sort((a, b) => b.points - a.points);
                                      
    const list = $('leaderboard-list');
    list.innerHTML = '';
    
    sorted.forEach((p, idx) => {
        const row = document.createElement('div');
        row.className = `leaderboard-row ${idx === 0 ? 'rank-1' : ''}`;
        row.innerHTML = `<div class="rank-name"><span>#${idx+1}</span> <span>${p.name}</span></div><span class="rank-score">${p.points} نقطة</span>`;
        list.appendChild(row);
    });
    
    showScreen('game-over-screen');
    
    // Post to parent Angular arcade components
    if (window.parent) {
        window.parent.postMessage({
            type: 'ARCADE_GAME_OVER',
            winner: winnerName,
            gameId: 'number-hunt'
        }, '*');
    }
}

function restartGame() {
    playSound('click');
    isGameOver = false;
    
    if (activeMode === 'local') {
        Object.keys(score).forEach(k => score[k] = 0);
        showScreen('play-screen');
        generateNewBoard();
        updateScoreboard();
    } else if (activeMode === 'private') {
        if (myRole === 'host') {
            score['host'] = 0;
            score['guest'] = 0;
            showScreen('play-screen');
            generateNewBoard();
            broadcastState();
            updateScoreboard();
        } else {
            sendMessageToPeer({ type: 'REQUEST_RESTART' });
        }
    } else if (activeMode === 'pro') {
        score['player'] = 0;
        score['ai'] = 0;
        showScreen('play-screen');
        generateNewBoard();
        updateScoreboard();
        resetAiSearch();
    }
}

function exitGame() {
    playSound('click');
    clearInterval(buzzerTimer);
    clearInterval(aiTimer);
    
    if (window.parent) {
        window.parent.postMessage({ type: 'CLOSE_GAME' }, '*');
    }
}

/* ════════════════════ ONLINE P2P MULTIPLAYER LOBBY & SYSTEM ════════════════════ */

function startOnlineGame() {
    showScreen('play-screen');
    generateNewBoard();
    broadcastState();
    updateScoreboard();
    
    if (window.parent) {
        window.parent.postMessage({ type: 'ARCADE_GAME_START', gameId: 'number-hunt' }, '*');
    }
}

function sendMessageToPeer(data) {
    if (window.parent) {
        window.parent.postMessage(data, '*');
    }
}

// Receive messages forwarded by Angular parent WeRTC connection
function receiveMessage(event) {
    const data = event.data;
    if (!data || !data.type) return;
    
    // GUEST joined the room
    if (data.type === 'GUEST_JOIN' && myRole === 'host') {
        names['guest'] = data.name || 'المنافس';
        score = { 'host': 0, 'guest': 0 };
        sendMessageToPeer({
            type: 'HOST_ACCEPT',
            name: names['host']
        });
        startOnlineGame();
    }
    
    // HOST accepted guest
    else if (data.type === 'HOST_ACCEPT' && myRole === 'guest') {
        names['host'] = data.name || 'المضيف';
        names['guest'] = localStorage.getItem('arcade_player_name') || 'الضيف';
        score = { 'host': 0, 'guest': 0 };
        showScreen('play-screen');
        updateScoreboard();
        
        if (window.parent) {
            window.parent.postMessage({ type: 'ARCADE_GAME_START', gameId: 'number-hunt' }, '*');
        }
    }
    
    // Synchronize host game state
    else if (data.type === 'STATE_UPDATE' && myRole === 'guest') {
        gridNumbers = data.gridNumbers;
        targetNumber = data.targetNumber;
        score = data.score;
        names = data.names;
        isGameOver = data.isGameOver;
        
        renderGridUI();
        $('target-number').innerText = targetNumber;
        updateScoreboard();
        
        if (isGameOver) {
            triggerGameOver(data.winnerName);
        }
    }
    
    // GUEST correct click reported to Host
    else if (data.type === 'GUEST_SCORED' && myRole === 'host') {
        if (data.number === targetNumber && !isGameOver) {
            score['guest']++;
            checkGameWinner();
            if (!isGameOver) {
                generateNewBoard();
                broadcastState();
                updateScoreboard();
            }
        }
    }
    
    // GUEST penalty reported to Host
    else if (data.type === 'GUEST_PENALTY' && myRole === 'host') {
        if (!isGameOver) {
            score['guest'] = Math.max(0, score['guest'] - 1);
            broadcastState();
            updateScoreboard();
        }
    }
    
    // Guest requesting restart
    else if (data.type === 'REQUEST_RESTART' && myRole === 'host') {
        restartGame();
    }
}

function broadcastState() {
    if (myRole !== 'host') return;
    sendMessageToPeer({
        type: 'STATE_UPDATE',
        gridNumbers,
        targetNumber,
        score,
        names,
        isGameOver,
        winnerName: isGameOver ? Object.keys(score).find(k => score[k] >= winningScore) === 'host' ? names['host'] : names['guest'] : ''
    });
}

/* ════════════════════ PRO MODE: AI OPPONENT SIMULATION ════════════════════ */

function initProAiGame() {
    activeMode = 'pro';
    
    names['player'] = localStorage.getItem('arcade_player_name') || 'أنت';
    names['ai'] = 'محترف الأرقام (AI)';
    
    score = { 'player': 0, 'ai': 0 };
    
    showScreen('play-screen');
    generateNewBoard();
    updateScoreboard();
    
    if (window.parent) {
        window.parent.postMessage({ type: 'ARCADE_GAME_START', gameId: 'number-hunt' }, '*');
    }
    
    resetAiSearch();
}

function resetAiSearch() {
    if (aiTimer) clearTimeout(aiTimer);
    if (isGameOver) return;
    
    // AI finds the number after a random delay (e.g. 3.5 to 6.5 seconds)
    const delay = 3500 + Math.random() * 3000;
    
    aiTimer = setTimeout(() => {
        aiScored();
    }, delay);
}

function aiScored() {
    if (isGameOver) return;
    
    playSound('error'); // Trigger alert sound for player since opponent scored!
    score['ai']++;
    checkProWinner();
    
    if (!isGameOver) {
        generateNewBoard();
        updateScoreboard();
        resetAiSearch();
    }
}

function checkProWinner() {
    if (score['player'] >= winningScore) {
        triggerGameOver(names['player']);
    } else if (score['ai'] >= winningScore) {
        triggerGameOver(names['ai']);
    }
}
