// Elements
function $(id) { return document.getElementById(id); }
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $(id).classList.add('active');
}

// Variables
let myPeer = null;
let myId = null;
let myName = localStorage.getItem('arcade_player_name') || '???? ???????';

window.addEventListener('DOMContentLoaded', () => {
    const nameDisplay = $('player-name-text');
    if (nameDisplay) {
        nameDisplay.innerText = myName;
    }
    const nameInput = $('player-name');
    if (nameInput) {
        nameInput.value = myName;
    }
});

let myRole = ''; // 'blind', 'deaf', 'mute'
let isHost = false;
let hostConn = null;
let guestConns = {}; // { peerId: DataConnection }
let myStream = null;

// Start directly in lobby
showScreen('lobby-screen');

function toBraille(num) {
    // Unicode braille digits (a-j mapping for 1-0)
    const brailleDigits = {
        '1': '\u2801',
        '2': '\u2803',
        '3': '\u2809',
        '4': '\u2819',
        '5': '\u2811',
        '6': '\u281b',
        '7': '\u2813',
        '8': '\u2817',
        '9': '\u281a',
        '0': '\u281d'
    };
    let str = String(num);
    let brailleStr = '\u283c'; // Braille number sign prefix
    for (let char of str) {
        if (brailleDigits[char]) {
            brailleStr += brailleDigits[char];
        }
    }
    return brailleStr;
}

const LIGHT_COLORS = ['red', 'yellow', 'green', 'blue'];
const WIRE_COLORS = ['red', 'blue', 'yellow', 'green'];

const CABLE_CUT_TABLE = {
    4: { red: 'blue', yellow: 'red', green: 'yellow', blue: 'green' },
    5: { red: 'green', yellow: 'blue', green: 'red', blue: 'yellow' }
};

const CALC_DIGIT_TABLE = {
    even: { red: '5', yellow: '0', green: '9', blue: '1' },
    odd: { red: '3', yellow: '7', green: '2', blue: '0' }
};

const DIRECTION_TABLE = {
    '1': { red: 'up', yellow: 'down', green: 'left', blue: 'left' },
    '4': { red: 'up', yellow: 'down', green: 'left', blue: 'left' },
    '2': { red: 'right', yellow: 'left', green: 'up', blue: 'up' },
    '7': { red: 'right', yellow: 'left', green: 'up', blue: 'up' },
    '5': { red: 'left', yellow: 'right', green: 'down', blue: 'down' },
    '3': { red: 'left', yellow: 'right', green: 'down', blue: 'down' },
    '6': { red: 'up', yellow: 'right', green: 'down', blue: 'left' },
    '9': { red: 'up', yellow: 'right', green: 'down', blue: 'left' }
};

function pickLightColor() {
    return LIGHT_COLORS[Math.floor(Math.random() * LIGHT_COLORS.length)];
}

function updateManualUI() {
    const el = $('manual-content');
    if (!el) return;
    el.innerHTML = `
        <div class="manual-pages">
            <img src="manual-cable.png" alt="Cable Module Manual" class="manual-page-img">
            <img src="manual-modules.png" alt="Calculation and Direction Manual" class="manual-page-img">
        </div>
    `;
}

const LEVELS = [
    { time: 300, strikes: 3, numModules: 1 }, // Level 1
    { time: 240, strikes: 3, numModules: 2 }, // Level 2
    { time: 300, strikes: 3, numModules: 3 }, // Level 3
    { time: 240, strikes: 2, numModules: 3 }, // Level 4
    { time: 180, strikes: 2, numModules: 3 }, // Level 5
    { time: 120, strikes: 1, numModules: 3 }  // Level 6 (Sudden Death)
];

let gameState = {
    phase: 'lobby', // lobby, roles, playing, game-over
    players: [], // { id, name, role }
    timeRemaining: 300,
    strikes: 0,
    maxStrikes: 3,
    resultMsg: '',
    loseReason: '',
    modules: [],
    recentGesture: '',
    missionLevel: parseInt(localStorage.getItem('tm_current_level')) || 1
};

let timerInterval = null;
let audioElements = [];

// --- Input Validation ---
function validateName(name) {
    const trimmed = name.trim();
    if (!trimmed) return { valid: false, error: '????? ?????' };
    if (trimmed.length > 20) return { valid: false, error: '????? ???? ???? (20 ??? ??? ????)' };
    if (!/^[\u0600-\u06FFa-zA-Z0-9\s_-]+$/.test(trimmed)) return { valid: false, error: '????? ????? ??? ???? ??? ??????' };
    return { valid: true, value: trimmed };
}

function validateRoomCode(code) {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return { valid: false, error: '??? ?????? ?????' };
    if (!/^[A-Z0-9]{6}$/.test(trimmed)) return { valid: false, error: '??? ?????? ??? ?? ???? 6 ????/?????' };
    return { valid: true, value: trimmed };
}

function showError(elementId, message) {
    const el = $(elementId);
    if (el) {
        el.innerText = message;
        el.style.display = 'block';
        setTimeout(() => { el.style.display = 'none'; }, 5000);
    }
}

function clearError(elementId) {
    const el = $(elementId);
    if (el) el.style.display = 'none';
}

// --- Init & Lobby ---
$('host-btn').onclick = () => {
    const validation = validateName($('player-name').value);
    if (!validation.valid) {
        showError('join-error', validation.error);
        return;
    }
    myName = validation.value;
    clearError('join-error');
    isHost = true;
    $('host-btn').disabled = true;
    $('host-btn').innerText = '???? ???????...';
    
    const myRoomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const peerId = 'SUPMONKEY_' + myRoomCode;
    myPeer = new Peer(peerId);
    
    let connectionTimeout = null;
    const CONNECTION_TIMEOUT = 10000;
    
    connectionTimeout = setTimeout(() => {
        if (!myId && isHost) {
            alert('????? ???? ???????. ????? ????? ????????.');
            cleanup();
            showScreen('lobby-screen');
            $('host-btn').disabled = false;
            $('host-btn').innerText = '????? ???? (????)';
        }
    }, CONNECTION_TIMEOUT);
    
    myPeer.on('disconnected', () => {
        console.warn('?? ????? ??????? ????????. ???? ?????? ????? ???????...');
        attemptReconnection();
    });
    
    myPeer.on('close', () => {
        console.warn('?? ????? ???????.');
    });
    
    myPeer.on('error', (err) => {
        console.error('Peer error:', err);
        if (connectionTimeout) clearTimeout(connectionTimeout);
        cleanup();
        showScreen('lobby-screen');
        $('host-btn').disabled = false;
        $('host-btn').innerText = '????? ???? (????)';
        alert('??? ??? ?? ??????? ????????: ' + err.message);
    });
    
    myPeer.on('open', id => {
        if (connectionTimeout) clearTimeout(connectionTimeout);
        myId = id;
        gameState.players.push({ id: myId, name: myName, role: '' });
        showScreen('room-screen');
        $('room-id-box').classList.remove('hidden');
        $('room-id-display').innerText = myRoomCode;
        updateLobbyUI();
    });
    
    myPeer.on('connection', conn => {
        if (gameState.phase !== 'lobby' && gameState.phase !== 'roles') {
            conn.close();
            return;
        }
        conn.on('data', data => handleClientData(conn.peer, data));
        conn.on('open', () => {
            guestConns[conn.peer] = conn;
        });
        conn.on('close', () => {
            delete guestConns[conn.peer];
            gameState.players = gameState.players.filter(p => p.id !== conn.peer);
            broadcastState();
        });
    });
    
    setupMediaCalls();
};

 $('join-btn').onclick = () => {
    const codeValidation = validateRoomCode($('join-id').value);
    if (!codeValidation.valid) {
        showError('join-error', codeValidation.error);
        return;
    }
    const hostId = codeValidation.value;
    const validation = validateName($('player-name').value);
    if (!validation.valid) {
        showError('join-error', validation.error);
        return;
    }
    myName = validation.value;
    clearError('join-error');
    
    $('join-btn').disabled = true;
    $('join-btn').innerText = '???? ????????...';
    
    myPeer = new Peer();
    myPeer.on('open', id => {
        myId = id;
        hostConn = myPeer.connect('SUPMONKEY_' + hostId);
        hostConn.on('open', () => {
            showScreen('room-screen');
            hostConn.send({ type: 'JOIN', name: myName, id: myId });
        });
        hostConn.on('data', data => {
            if (data.type === 'STATE_UPDATE') {
                gameState = data.state;
                updateLobbyUI();
                checkPhaseChange();
            }
        });
        hostConn.on('error', () => alert('??? ?? ??????? ???????'));
    });
    
    setupMediaCalls();
};

function setupMediaCalls() {
    myPeer.on('call', call => {
        call.on('stream', remoteStream => {
            addAudioStream(remoteStream);
        });
        if (myStream) {
            call.answer(myStream);
        } else {
            call.answer();
        }
    });
}

function broadcastState() {
    if (!isHost) return;
    Object.values(guestConns).forEach(conn => {
        conn.send({ type: 'STATE_UPDATE', state: gameState });
    });
    updateLobbyUI();
    checkPhaseChange();
}

function handleClientData(peerId, data) {
    if (data.type === 'JOIN') {
        if (gameState.players.length >= 3) return; // Room full
        gameState.players.push({ id: data.id, name: data.name, role: '' });
        if (gameState.players.length === 3) {
            gameState.phase = 'roles';
        }
        broadcastState();
    }
    if (data.type === 'SELECT_ROLE') {
        const p = gameState.players.find(x => x.id === data.id);
        if (p) {
            if (p.role === data.role) {
                p.role = ''; // toggle off
            } else {
                gameState.players.forEach(other => { if (other.role === data.role) other.role = ''; });
                p.role = data.role;
            }
            broadcastState();
            if (isHost) updateLobbyUI();
        }
    }
    if (data.type === 'ACTION') {
        handleGameAction(peerId, data.action);
    }
    if (data.type === 'REPLAY') {
        if (isHost) {
            generateBomb();
            gameState.phase = 'playing';
            broadcastState();
        }
    }
    if (data.type === 'GO_TO_LOBBY') {
        if (isHost) {
            gameState.phase = 'roles';
            gameState.resultMsg = '';
            gameState.loseReason = '';
            gameState.players.forEach(p => p.role = '');
            broadcastState();
        }
    }
}

// --- Lobby UI & Roles ---
function updateLobbyUI() {
    if (gameState.phase !== 'lobby' && gameState.phase !== 'roles') return;
    
    const list = $('players-list');
    list.innerHTML = '';
    gameState.players.forEach(p => {
        const li = document.createElement('li');
        li.innerText = `${p.name} ${p.id === myId ? '(???)' : ''}`;
        list.appendChild(li);
    });
    
    if (gameState.phase === 'roles') {
        ['deaf', 'blind', 'mute'].forEach(role => {
            const card = $(`card-${role}`);
            const nameDiv = $(`name-${role}`);
            const btn = $(`btn-select-${role}`);
            const readyDiv = $(`ready-${role}`);
            
            const p = gameState.players.find(x => x.role === role);
            if (p) {
                nameDiv.innerText = p.name;
                card.classList.add('selected');
                readyDiv.innerText = '? ????';
                if (p.id === myId) {
                    btn.innerText = '????? (CANCEL)';
                    btn.classList.add('my-role');
                    btn.disabled = false;
                } else {
                    btn.innerText = '????? (TAKEN)';
                    btn.classList.remove('my-role');
                    btn.disabled = true;
                }
            } else {
                nameDiv.innerText = '--';
                card.classList.remove('selected');
                btn.innerText = '??????';
                btn.classList.remove('my-role');
                btn.disabled = false;
            }
        });
        
        if (isHost) {
            const hasBlind = gameState.players.find(p => p.role === 'blind');
            const hasDeaf = gameState.players.find(p => p.role === 'deaf');
            const hasMute = gameState.players.find(p => p.role === 'mute');
            
            if (hasBlind && hasDeaf && hasMute) {
                $('start-game-btn').disabled = false;
                $('start-game-btn').style.display = 'block';
            } else {
                $('start-game-btn').disabled = true;
                $('start-game-btn').style.display = 'none';
            }
            $('waiting-msg').classList.add('hidden');
        } else {
            $('start-game-btn').style.display = 'none';
            $('waiting-msg').classList.remove('hidden');
        }
    }
    
    // Update Lobby Level Display
    const lobbyLevelEl = $('lobby-level-display');
    if (lobbyLevelEl) {
        lobbyLevelEl.innerText = gameState.missionLevel;
    }
}

window.selectMyRole = function(role) {
    if (gameState.phase !== 'roles') return;
    
    if (isHost) {
        const me = gameState.players.find(x => x.id === myId);
        if (me) {
            if (me.role === role) {
                me.role = '';
            } else {
                gameState.players.forEach(p => { if (p.role === role) p.role = ''; });
                me.role = role;
            }
            broadcastState();
            updateLobbyUI();
        }
    } else {
        hostConn.send({ type: 'SELECT_ROLE', role: role, id: myId });
    }
};

$('start-game-btn').onclick = () => {
    if (!isHost) return;
    generateBomb();
    gameState.phase = 'playing';
    broadcastState();
    startAudioNetworking();
};

$('replay-btn').onclick = () => {
    if (isHost) {
        generateBomb();
        gameState.phase = 'playing';
        broadcastState();
    } else {
        hostConn.send({ type: 'REPLAY' });
    }
};

$('lobby-btn').onclick = () => {
    if (isHost) {
        gameState.phase = 'roles';
        gameState.resultMsg = '';
        gameState.loseReason = '';
        gameState.players.forEach(p => p.role = '');
        broadcastState();
    } else {
        hostConn.send({ type: 'GO_TO_LOBBY' });
    }
};

function checkPhaseChange() {
    if (gameState.phase === 'playing') {
        const me = gameState.players.find(p => p.id === myId);
        myRole = me ? me.role : '';
        
        if (!isHost && myStream === null && myRole !== '') { // guest needs to connect audio
            startAudioNetworking();
        }
        
        renderGameUI();
    } else if (gameState.phase === 'game-over') {
        showGameOverScreen();
    } else if (gameState.phase === 'lobby' || gameState.phase === 'roles') {
        showScreen('room-screen');
        updateLobbyUI();
    }
}

// --- Audio Networking ---
async function startAudioNetworking() {
    if (myRole === 'mute') {
        // Mute monkey doesn't speak. Just receives.
        callOthers();
        return;
    }
    
    try {
        myStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        callOthers();
    } catch(e) {
        console.error('Failed to access mic', e);
        alert('??? ??? ?? ?????? ??????????. ???? ?????? ?? ????.');
    }
}

function callOthers() {
    gameState.players.forEach(p => {
        if (p.id !== myId) {
            const call = myPeer.call(p.id, myStream);
            if (call) {
                call.on('stream', remoteStream => {
                    addAudioStream(remoteStream);
                });
            }
        }
    });
}

function addAudioStream(stream) {
    // Avoid duplicate tracks
    if (audioElements.find(a => a.srcObject && a.srcObject.id === stream.id)) return;
    
    const audioEl = document.createElement('audio');
    audioEl.srcObject = stream;
    audioEl.autoplay = true;
    
    // IF I AM DEAF, I DO NOT HEAR ANYTHING!
    if (myRole === 'deaf') {
        audioEl.muted = true;
        audioEl.volume = 0;
    }
    
    $('audio-elements').appendChild(audioEl);
    audioElements.push(audioEl);
}

// --- Game Logic ---
function formatElapsedTime(totalSeconds) {
    const elapsed = Math.max(0, totalSeconds);
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function showGameOverScreen() {
    if (gameState.phase !== 'game-over') return;

    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    showScreen('game-over-screen');

    const reportLevel = $('report-level');
    const reportTime = $('report-time');
    const reportMistakes = $('report-mistakes');
    const reportGrade = $('report-grade');
    const replayBtn = $('replay-btn');
    const lobbyBtn = $('lobby-btn');
    const gameOverScreen = $('game-over-screen');

    const elapsed = 300 - gameState.timeRemaining;
    const isWin = gameState.resultMsg === 'win';

    if (reportLevel) reportLevel.innerText = String(gameState.missionLevel || 1);
    if (reportTime) reportTime.innerText = formatElapsedTime(elapsed);
    if (reportMistakes) reportMistakes.innerText = String(gameState.strikes || 0);

    if (reportGrade) {
        reportGrade.innerText = isWin ? 'A+' : 'F';
        reportGrade.className = isWin ? 'report-grade win' : 'report-grade fail';
    }

    if (gameOverScreen) {
        gameOverScreen.classList.toggle('report-win', isWin);
        gameOverScreen.classList.toggle('report-fail', !isWin);
    }

    if (replayBtn) {
        replayBtn.style.display = 'inline-block';
        replayBtn.innerText = isWin ? 'PLAY AGAIN' : 'TRY AGAIN';
    }
    if (lobbyBtn) {
        lobbyBtn.style.display = 'inline-block';
        lobbyBtn.innerText = 'RETURN TO LOBBY \uD83D\uDC46';
    }

    if (isHost && window.parent) {
        window.parent.postMessage({
            type: 'ARCADE_GAME_OVER',
            winner: isWin ? 'Victory' : 'Defeat',
            gameId: 'three-monkeys'
        }, '*');
    }
}

function generateBomb() {
    let currentLevel = parseInt(localStorage.getItem('tm_current_level')) || 1;
    gameState.missionLevel = currentLevel;
    
    let lData = LEVELS[Math.min(currentLevel - 1, LEVELS.length - 1)];
    gameState.timeRemaining = lData.time;
    gameState.maxStrikes = lData.strikes;
    gameState.strikes = 0;
    gameState.resultMsg = '';
    gameState.loseReason = '';

    // Module 1: Cable module (4 or 5 wires + indicator light)
    const numCables = Math.random() < 0.5 ? 4 : 5;
    const wires = [];
    for (let i = 0; i < numCables; i++) {
        wires.push(WIRE_COLORS[Math.floor(Math.random() * WIRE_COLORS.length)]);
    }
    const cableLight = pickLightColor();
    const cutColor = CABLE_CUT_TABLE[numCables][cableLight];
    let solutionIndex = wires.indexOf(cutColor);
    if (solutionIndex === -1) {
        wires[Math.floor(Math.random() * wires.length)] = cutColor;
        solutionIndex = wires.indexOf(cutColor);
    }

    // Module 2: Calculation module (math result + light -> digit)
    let a = Math.floor(Math.random() * 11) + 2;
    let b = Math.floor(Math.random() * 11) + 2;
    const ops = ['+', '-', '*'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let result;
    if (op === '+') result = a + b;
    else if (op === '-') {
        if (a < b) [a, b] = [b, a];
        result = a - b;
    } else {
        result = a * b;
    }
    const calcLight = pickLightColor();
    const parity = result % 2 === 0 ? 'even' : 'odd';
    const solutionDigit = CALC_DIGIT_TABLE[parity][calcLight];

    // Module 3: Direction module (braille digit + light -> arrow)
    const brailleOptions = [1, 2, 3, 4, 5, 6, 7, 9];
    const brailleDigit = brailleOptions[Math.floor(Math.random() * brailleOptions.length)];
    const dirLight = pickLightColor();
    const solutionDir = DIRECTION_TABLE[String(brailleDigit)][dirLight];

    let allModules = [
        {
            type: 'cables',
            id: 0,
            wires,
            lightColor: cableLight,
            cutIndex: -1,
            defused: false,
            solutionIndex
        },
        {
            type: 'calculation',
            id: 1,
            expression: `${a} ${op} ${b}`,
            result,
            lightColor: calcLight,
            pressed: null,
            defused: false,
            solutionDigit
        },
        {
            type: 'direction',
            id: 2,
            brailleDigit,
            lightColor: dirLight,
            pressed: null,
            defused: false,
            solutionDir
        }
    ];
    
    gameState.modules = allModules.slice(0, lData.numModules);

    startTimer();
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (gameState.phase !== 'playing') return;
        gameState.timeRemaining--;
        if (gameState.timeRemaining <= 0) {
            gameState.timeRemaining = 0;
            triggerGameOver('lose', 'timeout');
            return;
        }
        if (isHost) broadcastState();
    }, 1000);
}

function triggerGameOver(result, reason = '') {
    if (gameState.phase === 'game-over') return;
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    gameState.phase = 'game-over';
    gameState.resultMsg = result;
    gameState.loseReason = result === 'lose' ? reason : '';
    if (isHost) broadcastState();
    
    // Update Missions
    let played = parseInt(localStorage.getItem('tm_games_played')) || 0;
    localStorage.setItem('tm_games_played', played + 1);
    if (result === 'win') {
        let won = parseInt(localStorage.getItem('tm_games_won')) || 0;
        localStorage.setItem('tm_games_won', won + 1);
        if (gameState.strikes === 0) {
            let perfect = parseInt(localStorage.getItem('tm_perfect_win')) || 0;
            localStorage.setItem('tm_perfect_win', perfect + 1);
        }
        if (isHost) {
            let nextLvl = gameState.missionLevel + 1;
            localStorage.setItem('tm_current_level', nextLvl);
            gameState.missionLevel = nextLvl;
        }
    }
    if (myRole === 'deaf') {
        let deafPlayed = parseInt(localStorage.getItem('tm_played_deaf')) || 0;
        localStorage.setItem('tm_played_deaf', deafPlayed + 1);
    } else if (myRole === 'blind') {
        let blindPlayed = parseInt(localStorage.getItem('tm_played_blind')) || 0;
        localStorage.setItem('tm_played_blind', blindPlayed + 1);
    } else if (myRole === 'mute') {
        let mutePlayed = parseInt(localStorage.getItem('tm_played_mute')) || 0;
        localStorage.setItem('tm_played_mute', mutePlayed + 1);
    }
    
    showGameOverScreen();
}

function handleGameAction(peerId, action) {
    if (!isHost || gameState.phase !== 'playing') return;
    
    if (action.type === 'GESTURE') {
        gameState.recentGesture = action.value;
        broadcastState();
        
        // Visual indicator: Flash color
        const gestureDisplay = $('received-gesture');
        if (gestureDisplay) {
            gestureDisplay.style.color = '#fbbf24'; // Highlight color
            setTimeout(() => { gestureDisplay.style.color = 'inherit'; }, 500);
        }
        
        // clear gesture after 3 secs
        setTimeout(() => {
            if (gameState.recentGesture === action.value) {
                gameState.recentGesture = '';
                broadcastState();
            }
        }, 3000);
    }
    
    if (action.type === 'CUT_WIRE') {
        let mod = gameState.modules.find(m => m.type === 'cables');
        if (!mod || mod.defused) return;
        mod.cutIndex = action.index;
        if (action.index === mod.solutionIndex) {
            mod.defused = true;
            checkWin();
        } else {
            addStrike();
        }
        broadcastState();
    }

    if (action.type === 'PRESS_DIGIT') {
        let mod = gameState.modules.find(m => m.type === 'calculation');
        if (!mod || mod.defused) return;
        mod.pressed = action.value;
        if (String(action.value) === String(mod.solutionDigit)) {
            mod.defused = true;
            checkWin();
        } else {
            addStrike();
            mod.pressed = null;
        }
        broadcastState();
    }

    if (action.type === 'PRESS_DIR') {
        let mod = gameState.modules.find(m => m.type === 'direction');
        if (!mod || mod.defused) return;
        mod.pressed = action.value;
        if (action.value === mod.solutionDir) {
            mod.defused = true;
            checkWin();
        } else {
            addStrike();
            mod.pressed = null;
        }
        broadcastState();
    }
}

function addStrike() {
    gameState.strikes++;
    if (gameState.strikes >= gameState.maxStrikes) {
        triggerGameOver('lose', 'strikes');
    }
}

function checkWin() {
    let allDefused = gameState.modules.every(m => m.defused);
    if (allDefused) {
        triggerGameOver('win');
    }
}

function sendAction(action) {
    if (isHost) handleGameAction(myId, action);
    else hostConn.send({ type: 'ACTION', action: action });
}

// --- Rendering ---
function renderGameUI() {
    showScreen('game-screen');
    updateManualUI();
    
    // Header
    let m = Math.floor(gameState.timeRemaining / 60).toString().padStart(2, '0');
    let s = (gameState.timeRemaining % 60).toString().padStart(2, '0');
    $('timer-display').innerText = `${m}:${s}`;
    
    let str = '';
    for(let i=0; i<gameState.strikes; i++) str += '?';
    $('strikes-display').innerText = str;
    
    // Hide all views, show mine
    $('blind-view').classList.add('hidden');
    $('deaf-view').classList.add('hidden');
    $('mute-view').classList.add('hidden');
    
    if (myRole === 'blind') {
        $('blind-view').classList.remove('hidden');
        renderBlindBomb();
    } else if (myRole === 'deaf') {
        $('deaf-view').classList.remove('hidden');
        renderDeafBomb();
        $('received-gesture').innerText = gameState.recentGesture || '...';
    } else if (myRole === 'mute') {
        $('mute-view').classList.remove('hidden');
        setupMuteGestures();
    }
}

function renderBlindBomb() {
    const container = $('blind-bomb');
    container.innerHTML = '';
    
    gameState.modules.forEach((mod, i) => {
        let modDiv = document.createElement('div');
        modDiv.className = 'blind-module';
        // Position them manually on the "bomb"
        if (i === 0) { modDiv.style.top = '20px'; modDiv.style.left = '20px'; modDiv.style.width = '150px'; modDiv.style.height = '120px'; }
        if (i === 1) { modDiv.style.top = '160px'; modDiv.style.left = '20px'; modDiv.style.width = '150px'; modDiv.style.height = '120px'; }
        if (i === 2) { modDiv.style.top = '20px'; modDiv.style.left = '180px'; modDiv.style.width = '150px'; modDiv.style.height = '150px'; }
        
        if (mod.defused) {
            modDiv.style.opacity = '0.2';
            modDiv.style.pointerEvents = 'none';
        }
        
        if (mod.type === 'cables') {
            mod.wires.forEach((w, wIdx) => {
                let wHit = document.createElement('div');
                wHit.className = 'blind-item wire-hitbox';
                wHit.style.top = `${wIdx * 20 + 15}px`;
                wHit.style.height = '15px';
                wHit.style.width = '90%';
                wHit.style.left = '5%';
                wHit.style.border = '1px dashed #333';
                wHit.addEventListener('touchstart', (e) => { e.preventDefault(); sendAction({ type: 'CUT_WIRE', index: wIdx }); }, {passive: false});
                wHit.onclick = () => sendAction({ type: 'CUT_WIRE', index: wIdx });
                if (mod.cutIndex === wIdx) wHit.style.display = 'none';
                modDiv.appendChild(wHit);
            });
        }
        
        if (mod.type === 'calculation') {
            const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
            digits.forEach((digit, dIdx) => {
                let btnHit = document.createElement('div');
                btnHit.className = 'blind-item btn-hitbox';
                let col = dIdx % 5;
                let row = Math.floor(dIdx / 5);
                btnHit.style.top = `${row * 40 + 20}px`;
                btnHit.style.left = `${col * 26 + 10}px`;
                btnHit.style.width = '22px';
                btnHit.style.height = '30px';
                btnHit.style.border = '1px dashed #333';
                btnHit.style.display = 'flex';
                btnHit.style.alignItems = 'center';
                btnHit.style.justifyContent = 'center';
                btnHit.style.fontSize = '0.8rem';
                btnHit.style.color = 'transparent';
                
                const showDigit = () => { btnHit.style.color = '#ef4444'; };
                const hideDigit = () => { btnHit.style.color = 'transparent'; };
                btnHit.addEventListener('mouseenter', showDigit);
                btnHit.addEventListener('mouseleave', hideDigit);
                btnHit.addEventListener('touchstart', (e) => { e.preventDefault(); showDigit(); sendAction({ type: 'PRESS_DIGIT', value: digit }); }, {passive: false});
                btnHit.addEventListener('touchend', hideDigit);
                btnHit.onclick = () => sendAction({ type: 'PRESS_DIGIT', value: digit });
                
                btnHit.innerText = digit;
                modDiv.appendChild(btnHit);
            });
        }
        
        if (mod.type === 'direction') {
            const dirs = [
                { dir: 'up', label: '▲', top: '15px', left: '55px' },
                { dir: 'down', label: '▼', top: '95px', left: '55px' },
                { dir: 'left', label: '◀', top: '55px', left: '15px' },
                { dir: 'right', label: '▶', top: '55px', left: '95px' }
            ];
            
            dirs.forEach(d => {
                let btnHit = document.createElement('div');
                btnHit.className = 'blind-item btn-hitbox';
                btnHit.style.top = d.top;
                btnHit.style.left = d.left;
                btnHit.style.width = '40px';
                btnHit.style.height = '40px';
                btnHit.style.border = '1px dashed #333';
                btnHit.style.display = 'flex';
                btnHit.style.alignItems = 'center';
                btnHit.style.justifyContent = 'center';
                btnHit.style.fontSize = '1.2rem';
                btnHit.style.color = 'transparent';
                
                const showLabel = () => { btnHit.style.color = '#ef4444'; };
                const hideLabel = () => { btnHit.style.color = 'transparent'; };
                btnHit.addEventListener('mouseenter', showLabel);
                btnHit.addEventListener('mouseleave', hideLabel);
                btnHit.addEventListener('touchstart', (e) => { e.preventDefault(); showLabel(); sendAction({ type: 'PRESS_DIR', value: d.dir }); }, {passive: false});
                btnHit.addEventListener('touchend', hideLabel);
                btnHit.onclick = () => sendAction({ type: 'PRESS_DIR', value: d.dir });
                
                btnHit.innerText = d.label;
                modDiv.appendChild(btnHit);
            });
        }
        
        container.appendChild(modDiv);
    });
}

const colorMap = {
    'red': '#ef4444',
    'blue': '#3b82f6',
    'yellow': '#eab308',
    'green': '#22c55e',
    'black': '#1f2937'
};

function renderDeafBomb() {
    const container = $('deaf-bomb');
    container.innerHTML = '';
    
    gameState.modules.forEach((mod, i) => {
        let modDiv = document.createElement('div');
        modDiv.className = 'module';
        // Same layout as blind bomb
        if (i === 0) { modDiv.style.top = '20px'; modDiv.style.left = '20px'; modDiv.style.width = '150px'; modDiv.style.height = '120px'; }
        if (i === 1) { modDiv.style.top = '160px'; modDiv.style.left = '20px'; modDiv.style.width = '150px'; modDiv.style.height = '120px'; }
        if (i === 2) { modDiv.style.top = '20px'; modDiv.style.left = '180px'; modDiv.style.width = '150px'; modDiv.style.height = '150px'; }
        
        if (mod.defused) {
            modDiv.style.borderColor = '#10b981';
            let check = document.createElement('div');
            check.innerText = '✔️';
            check.style.position = 'absolute'; check.style.right = '5px'; check.style.top = '5px'; check.style.color = '#10b981'; check.style.fontSize = '1.5rem';
            modDiv.appendChild(check);
        }
        
        // Indicator light
        if (mod.lightColor) {
            let light = document.createElement('div');
            light.className = 'module-light';
            light.style.position = 'absolute';
            light.style.top = '5px';
            light.style.left = '5px';
            light.style.width = '15px';
            light.style.height = '15px';
            light.style.borderRadius = '50%';
            light.style.backgroundColor = colorMap[mod.lightColor];
            light.style.boxShadow = `0 0 10px ${colorMap[mod.lightColor]}`;
            modDiv.appendChild(light);
        }
        
        if (mod.type === 'cables') {
            mod.wires.forEach((w, wIdx) => {
                let wireDiv = document.createElement('div');
                wireDiv.className = 'wire';
                if (mod.cutIndex === wIdx) wireDiv.classList.add('cut');
                wireDiv.style.backgroundColor = colorMap[w];
                modDiv.appendChild(wireDiv);
            });
        }
        
        if (mod.type === 'calculation') {
            let exprDiv = document.createElement('div');
            exprDiv.style.textAlign = 'center';
            exprDiv.style.marginTop = '25px';
            exprDiv.style.fontSize = '1.5rem';
            exprDiv.style.fontWeight = 'bold';
            exprDiv.style.color = '#1e293b';
            exprDiv.innerText = mod.expression;
            modDiv.appendChild(exprDiv);
        }
        
        if (mod.type === 'direction') {
            let brailleDiv = document.createElement('div');
            brailleDiv.style.textAlign = 'center';
            brailleDiv.style.marginTop = '25px';
            brailleDiv.style.fontSize = '2.5rem';
            brailleDiv.style.color = '#1e293b';
            brailleDiv.innerText = toBraille(mod.brailleDigit);
            modDiv.appendChild(brailleDiv);
        }
        
        container.appendChild(modDiv);
    });
}

function setupMuteGestures() {
    if (window.muteGesturesSetup) return; // run once
    window.muteGesturesSetup = true;
    
    document.querySelectorAll('.btn-gesture').forEach(btn => {
        btn.onclick = () => {
            const gesture = btn.getAttribute('data-g');
            sendAction({ type: 'GESTURE', value: gesture });
            
            // Add tiny animation to self
            btn.style.transform = 'scale(1.2)';
            setTimeout(() => { btn.style.transform = 'scale(1)'; }, 200);
        };
    });
}

function cleanup() {
    console.log('Cleaning up game resources...');
    
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    if (myPeer) {
        myPeer.close();
        myPeer = null;
    }
    
    if (hostConn) {
        hostConn.close();
        hostConn = null;
    }
    
    Object.values(guestConns).forEach(conn => {
        if (conn) conn.close();
    });
    guestConns = {};
    
    if (myStream) {
        myStream.getTracks().forEach(track => track.stop());
        myStream = null;
    }
    
    audioElements.forEach(audio => {
        if (audio) {
            audio.pause();
            audio.srcObject = null;
            audio.remove();
        }
    });
    audioElements = [];
    
    gameState.phase = 'game-over';
    gameState.resultMsg = '';
}

// Initial
showScreen('lobby-screen');
if (window.parent) window.parent.postMessage({ type: 'ARCADE_GAME_START', gameId: 'three-monkeys' }, '*');
