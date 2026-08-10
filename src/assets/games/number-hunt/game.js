// Elements shorthand
function $(id) { return document.getElementById(id); }

// Sound helpers
function playSound(type) {
    if (window.parent) {
        window.parent.postMessage({ type: 'AUDIO_PLAY_SFX', volume: 0.8 }, '*');
    }
}

// Touch and click helper to eliminate mobile click delays
function bindInteraction(element, callback) {
    let triggered = false;
    element.addEventListener('touchstart', (e) => {
        e.preventDefault();
        triggered = true;
        callback();
        setTimeout(() => { triggered = false; }, 300);
    }, { passive: false });
    
    element.addEventListener('click', (e) => {
        if (triggered) return;
        callback();
    });
}

// Read URL Parameters
const urlParams = new URLSearchParams(window.location.search);
const gameMode = urlParams.get('mode') || 'local'; // 'local', 'private', 'pro'
const roomCode = urlParams.get('room') || '';
const playerRole = urlParams.get('role') || 'host'; // 'host', 'guest'

// Game state variables
let activeMode = gameMode;
let subMode = 'classic'; // 'classic' or 'squares'
let myRole = playerRole;
let myRoomCode = roomCode;

let score = {}; // { player_id: points }
let names = {}; // { player_id: display_name }
let gridNumbers = [];
let targetNumber = null;
let winningScore = 10;
let isGameOver = false;

// TURN TIMER ENGINE VARIABLES
let selectedTurnTimerSec = 10; // 10s default
let turnTimerInterval = null;
let turnTimeRemaining = 10;

// TURN BASED ENGINE VARIABLES
let playerIdsList = [];
let currentTurnIndex = 0;

// 100 SQUARES RUSH MODE STATE
let sharedFixedGrid = [];
let foundSharedNumbers = [];
let fixedPlayerGrid = {};
let foundPlayerNumbers = {};
let playerTargets = {};
let playerFilledSquares = {};

// AI Timers for Pro Mode
let aiTimer = null;
let aiFillerInterval = null;

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    setupGameMode();
});

function selectSubMode(mode) {
    subMode = mode;
    $('tab-classic-btn').classList.toggle('active', mode === 'classic');
    $('tab-squares-btn').classList.toggle('active', mode === 'squares');
    
    const timerBox = $('classic-timer-option');
    if (timerBox) {
        if (mode === 'classic') timerBox.classList.remove('hidden');
        else timerBox.classList.add('hidden');
    }
}

function updateSelectedTimer(val) {
    selectedTurnTimerSec = parseInt(val, 10) || 0;
}

// Setup screens according to mode
function setupGameMode() {
    if (activeMode === 'private') {
        $('local-setup').classList.add('hidden');
        $('online-setup').classList.remove('hidden');
        $('room-code-display').classList.remove('hidden');
        $('room-id-val').innerText = myRoomCode;
        
        window.addEventListener('message', receiveMessage);
        
        if (myRole === 'host') {
            names['host'] = localStorage.getItem('arcade_player_name') || 'المضيف 👑';
            names['guest'] = 'المنافس ⚡';
            score = { 'host': 0, 'guest': 0 };
            playerIdsList = ['host', 'guest'];
            currentTurnIndex = 0;
            
            setTimeout(() => {
                startOnlineGame();
            }, 2500);
        } else {
            names['host'] = 'المضيف 👑';
            names['guest'] = localStorage.getItem('arcade_player_name') || 'الضيف ⚡';
            playerIdsList = ['host', 'guest'];
            
            sendMessageToPeer({
                type: 'GUEST_JOIN',
                name: names['guest']
            });
        }
    } else if (activeMode === 'pro') {
        $('local-setup').classList.add('hidden');
        $('online-setup').classList.remove('hidden');
        $('online-setup').querySelector('.status-text').innerText = 'جاري البحث عن خصم محترف أونلاين...';
        
        setTimeout(() => {
            initProAiGame();
        }, 1800);
    } else {
        showScreen('setup-screen');
    }
}

// Show specific screen helper
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $(id).classList.add('active');
}

function getPlayerColor(id) {
    if (id === 'p1' || id === 'host' || id === 'player') return '#ef4444';
    if (id === 'p2' || id === 'guest' || id === 'ai') return '#3b82f6';
    if (id === 'p3') return '#10b981';
    if (id === 'p4') return '#f59e0b';
    return '#facc15';
}

/* ════════════════════ TURN COUNTDOWN TIMER ENGINE ════════════════════ */

function startTurnCountdown() {
    stopTurnCountdown();
    
    if (subMode !== 'classic' || selectedTurnTimerSec <= 0 || isGameOver) {
        $('turn-timer-badge').classList.add('hidden');
        return;
    }
    
    $('turn-timer-badge').classList.remove('hidden');
    turnTimeRemaining = selectedTurnTimerSec;
    $('turn-timer-sec').innerText = turnTimeRemaining;
    $('turn-timer-badge').classList.remove('warning-low');
    
    turnTimerInterval = setInterval(() => {
        turnTimeRemaining--;
        $('turn-timer-sec').innerText = turnTimeRemaining;
        
        if (turnTimeRemaining <= 3 && turnTimeRemaining > 0) {
            $('turn-timer-badge').classList.add('warning-low');
            playSound('tick');
        } else {
            $('turn-timer-badge').classList.remove('warning-low');
        }
        
        if (turnTimeRemaining <= 0) {
            handleTurnTimeout();
        }
    }, 1000);
}

function stopTurnCountdown() {
    if (turnTimerInterval) {
        clearInterval(turnTimerInterval);
        turnTimerInterval = null;
    }
    if ($('turn-timer-badge')) {
        $('turn-timer-badge').classList.remove('warning-low');
    }
}

function handleTurnTimeout() {
    stopTurnCountdown();
    if (isGameOver) return;
    
    const activePlayerId = playerIdsList[currentTurnIndex];
    playSound('error');
    
    $('buzzed-player-name').innerText = 'انتهى الوقت! ⏱️';
    $('buzzed-hint-text').innerText = `انتهت مهلة ${names[activePlayerId]}! انتقل الدور للاعب التالي تلقائياً.`;
    $('buzzed-overlay').classList.remove('hidden');
    
    setTimeout(() => {
        $('buzzed-overlay').classList.add('hidden');
        switchTurnToNextPlayer();
        generateNewBoard();
        updateScoreboard();
    }, 950);
}

/* ════════════════════ TURN SWITCHING & VIEW MANAGER ════════════════════ */

function switchTurnToNextPlayer() {
    if (playerIdsList.length === 0) return;
    
    stopTurnCountdown();
    currentTurnIndex = (currentTurnIndex + 1) % playerIdsList.length;
    
    if (subMode === 'squares') {
        setupSquaresModeTurn();
    } else {
        updateTurnDisplay();
    }
}

function updateTurnDisplay() {
    if (playerIdsList.length === 0) return;
    const currentId = playerIdsList[currentTurnIndex];
    const turnBadge = $('current-turn-display');
    const color = getPlayerColor(currentId);
    
    if (turnBadge && names[currentId]) {
        turnBadge.innerText = names[currentId];
        turnBadge.style.borderColor = color;
        turnBadge.style.color = color;
    }

    document.querySelectorAll('.score-badge').forEach(badge => {
        if (badge.dataset.player === currentId) {
            badge.classList.add('active-turn');
        } else {
            badge.classList.remove('active-turn');
        }
    });

    if (subMode === 'classic' && !isGameOver) {
        startTurnCountdown();
    }
}

/* ════════════════════ LOCAL MULTIPLAYER GAME ════════════════════ */

function initLocalGame(playerCount) {
    playSound('click');
    activeMode = 'local';
    
    score = {};
    names = {};
    playerIdsList = [];
    fixedPlayerGrid = {};
    foundPlayerNumbers = {};
    playerTargets = {};
    playerFilledSquares = {};
    foundSharedNumbers = [];
    
    const candidates = [];
    for (let num = 1; num <= 100; num++) candidates.push(num);
    candidates.sort(() => Math.random() - 0.5);
    sharedFixedGrid = candidates;
    
    for (let i = 1; i <= playerCount; i++) {
        const pid = 'p' + i;
        score[pid] = 0;
        names[pid] = 'اللاعب ' + i;
        playerIdsList.push(pid);
        
        fixedPlayerGrid[pid] = [...candidates];
        foundPlayerNumbers[pid] = [];
        playerFilledSquares[pid] = 0;
    }
    
    currentTurnIndex = 0;
    
    showScreen('play-screen');
    
    if (subMode === 'squares') {
        setupSquaresModeGame();
    } else {
        $('grid-container').classList.remove('hidden');
        $('squares-rush-view').classList.add('hidden');
        $('local-split-screen').classList.add('hidden');
        generateNewBoard();
        updateScoreboard();
        updateTurnDisplay();
    }
}

/* ════════════════════ MODE 2: 100 SQUARES RUSH BATTLE ════════════════════ */

function setupSquaresModeGame() {
    if (activeMode === 'local') {
        pickNextTargetForSharedGrid();
    } else {
        playerIdsList.forEach(pid => {
            pickNextTargetForPlayer(pid);
        });
    }
    
    setupSquaresModeTurn();
    updateScoreboard();
}

function pickNextTargetForSharedGrid() {
    const remaining = sharedFixedGrid.filter(n => !foundSharedNumbers.includes(n));
    if (remaining.length > 0) {
        targetNumber = remaining[Math.floor(Math.random() * remaining.length)];
    } else {
        targetNumber = null;
    }
}

function pickNextTargetForPlayer(pid) {
    const grid = fixedPlayerGrid[pid] || [];
    const foundList = foundPlayerNumbers[pid] || [];
    const remaining = grid.filter(n => !foundList.includes(n));
    
    if (remaining.length > 0) {
        playerTargets[pid] = remaining[Math.floor(Math.random() * remaining.length)];
    } else {
        playerTargets[pid] = null;
    }
}

function setupSquaresModeTurn() {
    const fillerId = playerIdsList[currentTurnIndex];
    
    if (activeMode === 'local') {
        $('grid-container').classList.add('hidden');
        $('squares-rush-view').classList.add('hidden');
        $('local-split-screen').classList.remove('hidden');
        
        const researcherIds = playerIdsList.filter(id => id !== fillerId);
        const researcherNamesStr = researcherIds.map(id => names[id]).join(' • ');
        
        $('split-researcher-name').innerText = researcherNamesStr;
        if (!targetNumber) pickNextTargetForSharedGrid();
        $('split-target-number').innerText = targetNumber || 'DONE';
        renderSplitResearcherGridShared(researcherIds);
        
        $('split-filler-name').innerText = names[fillerId];
        renderSplitFillerGrid(fillerId);
        
        updateTurnDisplay();
        return;
    }

    $('local-split-screen').classList.add('hidden');
    let isMeResearcher = (fillerId !== myRole);
    if (activeMode === 'pro') {
        isMeResearcher = (fillerId !== 'player');
    }
    
    updateTurnDisplay();
    
    if (isMeResearcher) {
        $('grid-container').classList.remove('hidden');
        $('squares-rush-view').classList.add('hidden');
        
        const researcherId = (activeMode === 'private') ? myRole : 'player';
        gridNumbers = fixedPlayerGrid[researcherId] || [];
        targetNumber = playerTargets[researcherId];
        $('target-number').innerText = targetNumber || 'DONE';
        
        renderSquaresModeGridUI(researcherId);
    } else {
        $('grid-container').classList.add('hidden');
        $('squares-rush-view').classList.remove('hidden');
        
        render100SquaresView(fillerId);
    }

    if (activeMode === 'pro') {
        handleProAiSquaresModeTurn(fillerId);
    }
}

function renderSplitResearcherGridShared(researcherIds) {
    const grid = $('split-number-grid');
    grid.innerHTML = '';
    
    sharedFixedGrid.forEach(num => {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        
        if (foundSharedNumbers.includes(num)) {
            cell.classList.add('cell-x');
            cell.innerText = '❌';
        } else {
            cell.innerText = num;
            bindInteraction(cell, () => handleSplitSharedResearcherClick(num, cell, targetNumber));
        }
        
        grid.appendChild(cell);
    });
}

function handleSplitSharedResearcherClick(num, cellElement, target) {
    if (isGameOver) return;
    
    if (num === target) {
        playSound('correct');
        cellElement.classList.add('correct-glow');
        
        foundSharedNumbers.push(num);
        cellElement.classList.add('cell-x');
        cellElement.innerText = '❌';
        
        pickNextTargetForSharedGrid();
        
        const prevFillerId = playerIdsList[currentTurnIndex];
        switchTurnToNextPlayer();
        const newFillerId = playerIdsList[currentTurnIndex];
        
        $('buzzed-player-name').innerText = 'تم العثور على الرقم! 🎯';
        $('buzzed-hint-text').innerText = `انتقل الدور ليكون ${names[newFillerId]} هو مالئ المربعات!`;
        $('buzzed-overlay').classList.remove('hidden');
        
        setTimeout(() => {
            $('buzzed-overlay').classList.add('hidden');
            setupSquaresModeTurn();
            updateScoreboard();
        }, 800);
    } else {
        playSound('error');
        cellElement.classList.add('wrong-shake');
        setTimeout(() => cellElement.classList.remove('wrong-shake'), 300);
    }
}

function renderSplitFillerGrid(fillerId) {
    const filledCount = playerFilledSquares[fillerId] || 0;
    
    $('split-squares-count-num').innerText = filledCount;
    $('split-squares-progress-fill').style.width = filledCount + '%';
    
    const container = $('split-squares-grid-100');
    container.innerHTML = '';
    
    for (let i = 1; i <= 100; i++) {
        const sq = document.createElement('div');
        const isAlreadyFilled = i <= filledCount;
        sq.className = 'sq-cell' + (isAlreadyFilled ? ' filled' : '');
        sq.innerText = isAlreadyFilled ? '✓' : i;
        
        if (isAlreadyFilled) {
            sq.style.pointerEvents = 'none';
        } else {
            bindInteraction(sq, () => fillNextSquare(fillerId, sq));
        }
        
        container.appendChild(sq);
    }
}

function renderSquaresModeGridUI(playerId) {
    const grid = $('number-grid');
    grid.innerHTML = '';
    
    const foundSet = foundPlayerNumbers[playerId] || [];
    
    gridNumbers.forEach(num => {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        
        if (foundSet.includes(num)) {
            cell.classList.add('cell-x');
            cell.innerText = '❌';
        } else {
            cell.innerText = num;
            bindInteraction(cell, () => handleCellClick(num, cell));
        }
        
        grid.appendChild(cell);
    });
}

function render100SquaresView(fillerId) {
    const filledCount = playerFilledSquares[fillerId] || 0;
    
    $('squares-count-num').innerText = filledCount;
    $('squares-progress-fill').style.width = filledCount + '%';
    
    const container = $('squares-grid-100');
    container.innerHTML = '';
    
    for (let i = 1; i <= 100; i++) {
        const sq = document.createElement('div');
        const isAlreadyFilled = i <= filledCount;
        sq.className = 'sq-cell' + (isAlreadyFilled ? ' filled' : '');
        sq.innerText = isAlreadyFilled ? '✓' : i;
        
        if (isAlreadyFilled) {
            sq.style.pointerEvents = 'none';
        } else {
            bindInteraction(sq, () => fillNextSquare(fillerId, sq));
        }
        
        container.appendChild(sq);
    }
}

function fillNextSquare(fillerId, squareElement) {
    if (isGameOver) return;
    
    if (squareElement.classList.contains('filled')) return;
    
    squareElement.classList.add('filled');
    squareElement.innerText = '✓';
    squareElement.style.pointerEvents = 'none';
    
    let current = playerFilledSquares[fillerId] || 0;
    if (current >= 100) return;
    
    current++;
    playerFilledSquares[fillerId] = current;
    score[fillerId] = current;
    
    playSound('click');
    
    const badgeNum = $('split-squares-count-num') || $('squares-count-num');
    if (badgeNum) badgeNum.innerText = current;
    
    const progressFill = $('split-squares-progress-fill') || $('squares-progress-fill');
    if (progressFill) progressFill.style.width = current + '%';
    
    updateScoreboard();
    
    if (current >= 100) {
        triggerGameOver(names[fillerId]);
    }
}

/* ════════════════════ CORE GAME BOARD GENERATOR (ALL 100 NUMBERS) ════════════════════ */

function generateNewBoard() {
    const candidates = [];
    for (let i = 1; i <= 100; i++) candidates.push(i);
    candidates.sort(() => Math.random() - 0.5);
    
    gridNumbers = candidates;
    targetNumber = gridNumbers[Math.floor(Math.random() * gridNumbers.length)];
    
    renderGridUI();
    $('target-number').innerText = targetNumber;
}

function renderGridUI() {
    const grid = $('number-grid');
    grid.innerHTML = '';
    
    gridNumbers.forEach(num => {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.innerText = num;
        bindInteraction(cell, () => handleCellClick(num, cell));
        grid.appendChild(cell);
    });
}

function handleCellClick(num, cellElement) {
    if (isGameOver || playerIdsList.length === 0) return;
    
    const activePlayerId = playerIdsList[currentTurnIndex];

    if (activeMode === 'private' && myRole === 'guest' && activePlayerId !== 'guest') return;
    if (activeMode === 'private' && myRole === 'host' && activePlayerId !== 'host') return;

    if (num === targetNumber) {
        stopTurnCountdown();
        playSound('correct');
        cellElement.classList.add('correct-glow');
        
        if (subMode === 'squares') {
            if (!foundPlayerNumbers[activePlayerId]) foundPlayerNumbers[activePlayerId] = [];
            foundPlayerNumbers[activePlayerId].push(num);
            
            cellElement.classList.add('cell-x');
            cellElement.innerText = '❌';
            
            pickNextTargetForPlayer(activePlayerId);
            
            $('buzzed-player-name').innerText = 'تم العثور على الرقم! 🎯';
            $('buzzed-hint-text').innerText = 'تم استبدال الرقم بـ ❌ وتم تحويل الشاشات!';
            $('buzzed-overlay').classList.remove('hidden');
            
            setTimeout(() => {
                $('buzzed-overlay').classList.add('hidden');
                switchTurnToNextPlayer();
                updateScoreboard();

                if (activeMode === 'private' && myRole === 'host') {
                    broadcastState();
                }
            }, 900);
        } else {
            // CLASSIC MODE
            score[activePlayerId] = (score[activePlayerId] || 0) + 1;
            checkGameWinner();
            
            if (!isGameOver) {
                setTimeout(() => {
                    switchTurnToNextPlayer();
                    generateNewBoard();
                    updateScoreboard();

                    if (activeMode === 'private') {
                        if (myRole === 'host') broadcastState();
                        else sendMessageToPeer({ type: 'GUEST_SCORED', number: num });
                    } else if (activeMode === 'pro') {
                        if (playerIdsList[currentTurnIndex] === 'ai') scheduleAiTurn();
                    }
                }, 550);
            }
        }
    } else {
        playSound('error');
        cellElement.classList.add('wrong-shake');
        setTimeout(() => cellElement.classList.remove('wrong-shake'), 350);

        if (subMode === 'classic') {
            score[activePlayerId] = Math.max(0, (score[activePlayerId] || 0) - 1);
            stopTurnCountdown();
            switchTurnToNextPlayer();
            updateScoreboard();

            if (activeMode === 'private') {
                if (myRole === 'host') broadcastState();
                else sendMessageToPeer({ type: 'GUEST_PENALTY' });
            } else if (activeMode === 'pro') {
                if (playerIdsList[currentTurnIndex] === 'ai') scheduleAiTurn();
            }
        }
    }
}

function updateScoreboard() {
    const scoreboard = $('scoreboard');
    scoreboard.innerHTML = '';
    
    playerIdsList.forEach(playerId => {
        const badge = document.createElement('div');
        badge.className = 'score-badge';
        badge.dataset.player = playerId;
        badge.style.borderColor = getPlayerColor(playerId);
        
        if (playerIdsList[currentTurnIndex] === playerId) {
            badge.classList.add('active-turn');
        }
        
        const displayScore = (subMode === 'squares') ? (playerFilledSquares[playerId] || 0) + '/100' : (score[playerId] || 0);
        const scoreLabel = (subMode === 'squares') ? 'مربع' : 'نقطة';
        
        badge.innerHTML = `<span>${names[playerId] || playerId}:</span><span class="score-val">${displayScore} ${scoreLabel}</span>`;
        scoreboard.appendChild(badge);
    });
}

function checkGameWinner() {
    playerIdsList.forEach(playerId => {
        if (subMode === 'squares') {
            if ((playerFilledSquares[playerId] || 0) >= 100) {
                triggerGameOver(names[playerId]);
            }
        } else {
            if ((score[playerId] || 0) >= winningScore) {
                triggerGameOver(names[playerId]);
            }
        }
    });
}

function triggerGameOver(winnerName) {
    isGameOver = true;
    stopTurnCountdown();
    if (aiTimer) clearTimeout(aiTimer);
    if (aiFillerInterval) clearInterval(aiFillerInterval);
    playSound('victory');
    
    const sorted = playerIdsList.map(id => {
        const points = subMode === 'squares' ? (playerFilledSquares[id] || 0) : (score[id] || 0);
        return { id, name: names[id], points };
    }).sort((a, b) => b.points - a.points);
                                      
    const list = $('leaderboard-list');
    list.innerHTML = '';
    
    sorted.forEach((p, idx) => {
        const row = document.createElement('div');
        row.className = `leaderboard-row ${idx === 0 ? 'rank-1' : ''}`;
        const unit = subMode === 'squares' ? 'مربع ⚡' : 'نقطة 🎯';
        row.innerHTML = `<div class="rank-name"><span>#${idx+1}</span> <span>${p.name}</span></div><span class="rank-score">${p.points} ${unit}</span>`;
        list.appendChild(row);
    });
    
    $('winner-subtitle').innerText = subMode === 'squares' ? `الفائز هو ${winnerName} بملء 100 مربع أولاً! 🎉` : `النتائج النهائية للمتسابقين`;
    
    showScreen('game-over-screen');
    
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
    currentTurnIndex = 0;
    stopTurnCountdown();
    if (aiTimer) clearTimeout(aiTimer);
    if (aiFillerInterval) clearInterval(aiFillerInterval);
    
    if (activeMode === 'local') {
        playerIdsList.forEach(k => {
            score[k] = 0;
            playerFilledSquares[k] = 0;
            foundPlayerNumbers[k] = [];
        });
        foundSharedNumbers = [];
        showScreen('play-screen');
        
        if (subMode === 'squares') {
            setupSquaresModeGame();
        } else {
            generateNewBoard();
            updateScoreboard();
            updateTurnDisplay();
        }
    } else if (activeMode === 'private') {
        if (myRole === 'host') {
            playerIdsList.forEach(k => {
                score[k] = 0;
                playerFilledSquares[k] = 0;
                foundPlayerNumbers[k] = [];
            });
            showScreen('play-screen');
            if (subMode === 'squares') setupSquaresModeGame();
            else { generateNewBoard(); updateScoreboard(); updateTurnDisplay(); }
            broadcastState();
        } else {
            sendMessageToPeer({ type: 'REQUEST_RESTART' });
        }
    } else if (activeMode === 'pro') {
        playerIdsList.forEach(k => {
            score[k] = 0;
            playerFilledSquares[k] = 0;
            foundPlayerNumbers[k] = [];
        });
        showScreen('play-screen');
        if (subMode === 'squares') setupSquaresModeGame();
        else { generateNewBoard(); updateScoreboard(); updateTurnDisplay(); }
    }
}

function exitGame() {
    playSound('click');
    stopTurnCountdown();
    if (aiTimer) clearTimeout(aiTimer);
    if (aiFillerInterval) clearInterval(aiFillerInterval);
    
    if (window.parent) {
        window.parent.postMessage({ type: 'CLOSE_GAME' }, '*');
    }
}

/* ════════════════════ ONLINE P2P MULTIPLAYER SYSTEM ════════════════════ */

function startOnlineGame() {
    showScreen('play-screen');
    if (subMode === 'squares') setupSquaresModeGame();
    else { generateNewBoard(); updateScoreboard(); updateTurnDisplay(); }
    if (myRole === 'host') broadcastState();
    
    if (window.parent) {
        window.parent.postMessage({ type: 'ARCADE_GAME_START', gameId: 'number-hunt' }, '*');
    }
}

function sendMessageToPeer(data) {
    if (window.parent) {
        window.parent.postMessage(data, '*');
    }
}

function receiveMessage(event) {
    const data = event.data;
    if (!data || !data.type) return;
    
    if (data.type === 'GUEST_JOIN' && myRole === 'host') {
        names['guest'] = data.name || 'المنافس ⚡';
        score = { 'host': 0, 'guest': 0 };
        playerIdsList = ['host', 'guest'];
        currentTurnIndex = 0;
        sendMessageToPeer({ type: 'HOST_ACCEPT', name: names['host'] });
        startOnlineGame();
    } else if (data.type === 'HOST_ACCEPT' && myRole === 'guest') {
        names['host'] = data.name || 'المضيف 👑';
        names['guest'] = localStorage.getItem('arcade_player_name') || 'الضيف ⚡';
        score = { 'host': 0, 'guest': 0 };
        playerIdsList = ['host', 'guest'];
        currentTurnIndex = 0;
        showScreen('play-screen');
        updateScoreboard();
        updateTurnDisplay();
    } else if (data.type === 'STATE_UPDATE' && myRole === 'guest') {
        gridNumbers = data.gridNumbers;
        targetNumber = data.targetNumber;
        score = data.score;
        names = data.names;
        currentTurnIndex = data.currentTurnIndex;
        isGameOver = data.isGameOver;
        subMode = data.subMode || 'classic';
        playerFilledSquares = data.playerFilledSquares || {};
        foundPlayerNumbers = data.foundPlayerNumbers || {};
        
        if (subMode === 'squares') {
            setupSquaresModeTurn();
        } else {
            renderGridUI();
            $('target-number').innerText = targetNumber;
        }
        
        updateScoreboard();
        updateTurnDisplay();
        
        if (isGameOver) {
            triggerGameOver(data.winnerName);
        }
    } else if (data.type === 'GUEST_SCORED' && myRole === 'host') {
        if (!isGameOver) {
            score['guest'] = (score['guest'] || 0) + 1;
            checkGameWinner();
            if (!isGameOver) {
                switchTurnToNextPlayer();
                generateNewBoard();
                broadcastState();
                updateScoreboard();
            }
        }
    } else if (data.type === 'GUEST_PENALTY' && myRole === 'host') {
        if (!isGameOver) {
            score['guest'] = Math.max(0, (score['guest'] || 0) - 1);
            switchTurnToNextPlayer();
            broadcastState();
            updateScoreboard();
        }
    } else if (data.type === 'REQUEST_RESTART' && myRole === 'host') {
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
        currentTurnIndex,
        subMode,
        playerFilledSquares,
        foundPlayerNumbers,
        isGameOver,
        winnerName: isGameOver ? Object.keys(score).find(k => (subMode === 'squares' ? playerFilledSquares[k] >= 100 : score[k] >= winningScore)) === 'host' ? names['host'] : names['guest'] : ''
    });
}

/* ════════════════════ PRO MODE: AI OPPONENT SIMULATION ════════════════════ */

function initProAiGame() {
    activeMode = 'pro';
    
    names['player'] = localStorage.getItem('arcade_player_name') || 'أنت 👤';
    names['ai'] = 'محترف الأرقام (AI) 🤖';
    
    score = { 'player': 0, 'ai': 0 };
    playerIdsList = ['player', 'ai'];
    currentTurnIndex = 0;
    
    fixedPlayerGrid['player'] = generateRandom100Grid();
    fixedPlayerGrid['ai'] = generateRandom100Grid();
    foundPlayerNumbers['player'] = [];
    foundPlayerNumbers['ai'] = [];
    playerFilledSquares['player'] = 0;
    playerFilledSquares['ai'] = 0;
    
    showScreen('play-screen');
    
    if (subMode === 'squares') {
        setupSquaresModeGame();
    } else {
        generateNewBoard();
        updateScoreboard();
        updateTurnDisplay();
    }
    
    if (window.parent) {
        window.parent.postMessage({ type: 'ARCADE_GAME_START', gameId: 'number-hunt' }, '*');
    }
}

function generateRandom100Grid() {
    const list = [];
    for (let i = 1; i <= 100; i++) list.push(i);
    list.sort(() => Math.random() - 0.5);
    return list;
}

function handleProAiSquaresModeTurn(fillerId) {
    if (aiTimer) clearTimeout(aiTimer);
    if (aiFillerInterval) clearInterval(aiFillerInterval);
    if (isGameOver) return;

    if (fillerId === 'ai') {
        aiFillerInterval = setInterval(() => {
            if (isGameOver || playerIdsList[currentTurnIndex] !== 'ai') {
                clearInterval(aiFillerInterval);
                return;
            }
            let aiCount = playerFilledSquares['ai'] || 0;
            if (aiCount < 100) {
                aiCount++;
                playerFilledSquares['ai'] = aiCount;
                score['ai'] = aiCount;
                updateScoreboard();
                if (aiCount >= 100) {
                    clearInterval(aiFillerInterval);
                    triggerGameOver(names['ai']);
                }
            }
        }, 380);
    } else {
        const delay = 3200 + Math.random() * 2500;
        aiTimer = setTimeout(() => {
            aiFoundNumberInSquaresMode();
        }, delay);
    }
}

function aiFoundNumberInSquaresMode() {
    if (isGameOver || playerIdsList[currentTurnIndex] === 'ai') return;
    
    const target = playerTargets['ai'];
    if (target) {
        if (!foundPlayerNumbers['ai']) foundPlayerNumbers['ai'] = [];
        foundPlayerNumbers['ai'].push(target);
        pickNextTargetForPlayer('ai');
    }
    
    playSound('error');
    switchTurnToNextPlayer();
    updateScoreboard();
}

function scheduleAiTurn() {
    if (aiTimer) clearTimeout(aiTimer);
    if (isGameOver || playerIdsList[currentTurnIndex] !== 'ai') return;
    
    const delay = 1800 + Math.random() * 1500;
    aiTimer = setTimeout(() => {
        aiScored();
    }, delay);
}

function aiScored() {
    if (isGameOver || playerIdsList[currentTurnIndex] !== 'ai') return;
    
    playSound('correct');
    score['ai'] = (score['ai'] || 0) + 1;
    checkProWinner();
    
    if (!isGameOver) {
        switchTurnToNextPlayer();
        generateNewBoard();
        updateScoreboard();
    }
}

function checkProWinner() {
    if (subMode === 'squares') {
        if ((playerFilledSquares['player'] || 0) >= 100) triggerGameOver(names['player']);
        else if ((playerFilledSquares['ai'] || 0) >= 100) triggerGameOver(names['ai']);
    } else {
        if ((score['player'] || 0) >= winningScore) triggerGameOver(names['player']);
        else if ((score['ai'] || 0) >= winningScore) triggerGameOver(names['ai']);
    }
}
