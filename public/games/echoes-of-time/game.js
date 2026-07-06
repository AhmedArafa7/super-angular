// Elements
function $(id) { return document.getElementById(id); }
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $(id).classList.add('active');
}

// Variables
let myPeer = null;
let myId = null;
let myName = localStorage.getItem('arcade_player_name') || 'لاعب الأركيد';

window.addEventListener('DOMContentLoaded', () => {
    const nameDisplay = $('player-name-text');
    if (nameDisplay) nameDisplay.innerText = myName;
    const nameInput = $('player-name');
    if (nameInput) nameInput.value = myName;
    
    // Parse URL params for Arcade integration
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    
    if (mode === 'private') {
        const roomCode = urlParams.get('room');
        const isHostParam = urlParams.get('isHost') === 'true';
        if (roomCode) {
            initGame(roomCode, isHostParam);
        }
    }
});

let myRole = ''; // 'past', 'present', 'future'
let isHost = false;
let hostConn = null;
let guestConns = {}; // { peerId: DataConnection }
let myStream = null;

showScreen('lobby-screen');

let gameState = {
    phase: 'lobby', // lobby, roles, playing, game-over
    players: [], // { id, name, role }
    timeRemaining: 600,
    powerRestored: false,
    coordinatesEntered: false,
    portalActivated: false,
    wireCut: null // 'red', 'blue', 'green'
};

let timerInterval = null;
let audioElements = [];

// --- Init & Lobby ---
function initGame(roomCode, hostFlag) {
    isHost = hostFlag;
    
    if (isHost) {
        const peerId = 'ECHOTIME_' + roomCode;
        myPeer = new Peer(peerId);
        
        myPeer.on('open', id => {
            myId = id;
            gameState.players.push({ id: myId, name: myName, role: '' });
            $('room-id-box').classList.remove('hidden');
            $('room-id-display').innerText = roomCode;
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
    } else {
        myPeer = new Peer();
        myPeer.on('open', id => {
            myId = id;
            hostConn = myPeer.connect('ECHOTIME_' + roomCode);
            hostConn.on('open', () => {
                $('room-id-box').classList.remove('hidden');
                $('room-id-display').innerText = roomCode;
                hostConn.send({ type: 'JOIN', name: myName, id: myId });
            });
            hostConn.on('data', data => {
                if (data.type === 'STATE_UPDATE') {
                    gameState = data.state;
                    updateLobbyUI();
                    checkPhaseChange();
                }
            });
        });
    }
    
    setupMediaCalls();
}

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
}

// --- Lobby UI & Roles ---
function updateLobbyUI() {
    if (gameState.phase !== 'lobby' && gameState.phase !== 'roles') return;
    
    const list = $('players-list');
    if (list) {
        list.innerHTML = '';
        gameState.players.forEach(p => {
            const li = document.createElement('li');
            li.innerText = `${p.name} ${p.id === myId ? '(أنت)' : ''}`;
            list.appendChild(li);
        });
    }
    
    if (gameState.phase === 'roles') {
        ['past', 'present', 'future'].forEach(role => {
            const card = $(`card-${role}`);
            const nameDiv = $(`name-${role}`);
            const btn = $(`btn-select-${role}`);
            const readyDiv = $(`ready-${role}`);
            
            const p = gameState.players.find(x => x.role === role);
            if (p) {
                nameDiv.innerText = p.name;
                card.classList.add('selected');
                readyDiv.innerText = '✅ جاهز';
                if (p.id === myId) {
                    btn.innerText = 'إلغاء';
                } else {
                    btn.style.display = 'none';
                }
            } else {
                nameDiv.innerText = '--';
                card.classList.remove('selected');
                readyDiv.innerText = '';
                btn.style.display = 'inline-block';
                btn.innerText = 'اختيار';
            }
        });
        
        // Host can start if all 3 roles picked
        if (isHost) {
            const allAssigned = ['past', 'present', 'future'].every(r => gameState.players.some(p => p.role === r));
            $('start-game-btn').classList.toggle('hidden', !allAssigned);
            $('start-game-btn').style.display = allAssigned ? 'inline-block' : 'none';
            $('waiting-msg').classList.add('hidden');
        } else {
            $('start-game-btn').classList.add('hidden');
            $('waiting-msg').classList.remove('hidden');
        }
    }
}

function selectMyRole(role) {
    if (isHost) {
        const p = gameState.players.find(x => x.id === myId);
        if (p.role === role) {
            p.role = '';
        } else {
            gameState.players.forEach(other => { if (other.role === role) other.role = ''; });
            p.role = role;
        }
        broadcastState();
    } else {
        hostConn.send({ type: 'SELECT_ROLE', id: myId, role: role });
    }
}

$('start-game-btn').onclick = () => {
    if (!isHost) return;
    gameState.phase = 'playing';
    broadcastState();
};

function checkPhaseChange() {
    if (gameState.phase === 'playing' && $('lobby-screen').classList.contains('active')) {
        const p = gameState.players.find(x => x.id === myId);
        if (p) myRole = p.role;
        startAudioNetworking().then(() => {
            showScreen('game-screen');
            initGameViews();
        });
        
        if (isHost) {
            timerInterval = setInterval(() => {
                gameState.timeRemaining--;
                if (gameState.timeRemaining <= 0) {
                    gameState.timeRemaining = 0;
                    gameState.phase = 'game-over';
                    clearInterval(timerInterval);
                }
                broadcastState();
            }, 1000);
        }
    } else if (gameState.phase === 'playing') {
        renderGameUI();
    } else if (gameState.phase === 'game-over') {
        showScreen('game-over-screen');
        if(isHost) {
            const winner = gameState.portalActivated ? 'Victory' : 'Defeat';
            window.parent.postMessage({ type: 'ARCADE_GAME_OVER', winner: winner, gameId: 'echoes-of-time' }, '*');
        }
    }
}

// --- Audio Networking ---
async function startAudioNetworking() {
    try {
        myStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        callOthers();
    } catch(e) {
        console.error('Failed to access mic', e);
        alert('حدث خطأ في الوصول للميكروفون. يرجى السماح به للعب.');
    }
}

function callOthers() {
    gameState.players.forEach(p => {
        if (p.id !== myId) {
            const call = myPeer.call(p.id, myStream);
            call.on('stream', remoteStream => {
                addAudioStream(remoteStream);
            });
        }
    });
}

function addAudioStream(stream) {
    const audios = [$('audio-peer-1'), $('audio-peer-2')];
    for (let a of audios) {
        if (!a.srcObject) {
            a.srcObject = stream;
            a.play().catch(e => console.log('Audio play blocked:', e));
            break;
        }
    }
}

let isGlobalMuted = false;
function toggleGlobalMute() {
    isGlobalMuted = !isGlobalMuted;
    const audios = [$('audio-peer-1'), $('audio-peer-2')];
    audios.forEach(a => a.muted = isGlobalMuted);
    $('global-mute-btn').innerText = isGlobalMuted ? '🔇' : '🎵';
}

window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'TOGGLE_MUTE') {
        toggleGlobalMute();
    }
});

// --- Gameplay Logic ---
function initGameViews() {
    document.querySelectorAll('.role-view').forEach(el => el.classList.add('hidden'));
    $(`${myRole}-view`).classList.remove('hidden');
    renderGameUI();
    
    // Setup Past Wires
    if (myRole === 'past') {
        const wiresBox = $('past-wires');
        wiresBox.innerHTML = `
            <button class="wire-btn wire-red" onclick="cutWire('red')">قطع الأحمر</button>
            <button class="wire-btn wire-blue" onclick="cutWire('blue')">قطع الأزرق</button>
            <button class="wire-btn wire-green" onclick="cutWire('green')">قطع الأخضر</button>
        `;
    }
}

function cutWire(color) {
    if (gameState.wireCut) return;
    sendAction({ type: 'CUT_WIRE', color: color });
}

window.submitCoordinates = () => {
    if (!gameState.powerRestored) return;
    const date = $('coord-date').value.trim();
    const city = $('coord-city').value.trim();
    
    sendAction({ type: 'SUBMIT_COORDS', date, city });
};

window.activatePortal = () => {
    const c1 = $('code-1').value;
    const c2 = $('code-2').value;
    const c3 = $('code-3').value;
    const c4 = $('code-4').value;
    const fullCode = `${c1}${c2}${c3}${c4}`;
    
    sendAction({ type: 'ACTIVATE_PORTAL', code: fullCode });
};

function sendAction(action) {
    if (isHost) {
        handleGameAction(myId, action);
    } else {
        hostConn.send({ type: 'ACTION', action: action });
    }
}

function handleGameAction(peerId, action) {
    if (!isHost || gameState.phase !== 'playing') return;
    
    if (action.type === 'CUT_WIRE' && !gameState.wireCut) {
        gameState.wireCut = action.color;
        if (action.color === 'blue') {
            gameState.powerRestored = true;
            window.parent.postMessage({ type: 'AUDIO_PLAY_SFX', volume: 0.8 }, '*');
        } else {
            // Cut wrong wire, lose time penalty
            gameState.timeRemaining = Math.max(0, gameState.timeRemaining - 60);
        }
        broadcastState();
    }
    
    if (action.type === 'SUBMIT_COORDS' && gameState.powerRestored && !gameState.coordinatesEntered) {
        // Expected: Date includes 15, City is London
        if (action.date.includes('15') && action.city.toLowerCase() === 'london') {
            gameState.coordinatesEntered = true;
            window.parent.postMessage({ type: 'AUDIO_PLAY_SFX', volume: 0.8 }, '*');
            broadcastState();
        } else {
            gameState.timeRemaining = Math.max(0, gameState.timeRemaining - 30);
            broadcastState();
        }
    }
    
    if (action.type === 'ACTIVATE_PORTAL') {
        if (action.code === '7492') {
            gameState.portalActivated = true;
            gameState.phase = 'game-over';
            window.parent.postMessage({ type: 'AUDIO_PLAY_SFX', volume: 1.0 }, '*');
            clearInterval(timerInterval);
            broadcastState();
        } else {
            gameState.timeRemaining = Math.max(0, gameState.timeRemaining - 30);
            broadcastState();
        }
    }
}

function renderGameUI() {
    let min = Math.floor(gameState.timeRemaining / 60);
    let sec = gameState.timeRemaining % 60;
    $('timer-display').innerText = `${min.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
    
    // Past UI updates
    if (myRole === 'past') {
        if (gameState.wireCut) {
            document.querySelectorAll('.wire-btn').forEach(btn => {
                if(btn.className.includes(gameState.wireCut)) {
                    btn.classList.add('wire-cut');
                    btn.innerText = 'تم القطع';
                } else {
                    btn.disabled = true;
                }
            });
            if (!gameState.powerRestored) {
                 $('past-wires').innerHTML += `<p style="color:red; grid-column: span 2; text-align:center;">خطأ! المولد معطل!</p>`;
            } else {
                if(!document.getElementById('past-success-msg')) {
                     $('past-wires').innerHTML += `<p id="past-success-msg" style="color:#10b981; grid-column: span 2; text-align:center;">نجاح! الطاقة تسري الآن للحاضر.</p>`;
                }
            }
        }
    }
    
    // Present UI updates
    if (myRole === 'present') {
        if (gameState.powerRestored) {
            $('terminal-screen').classList.remove('offline');
            $('terminal-screen').classList.add('online');
            $('terminal-screen').innerHTML = '<p>POWER RESTORED. SYSTEM ONLINE.</p>';
            $('terminal-inputs').classList.remove('hidden');
        }
        if (gameState.coordinatesEntered) {
            $('calibration-result').innerText = 'CALIBRATION CODE: 7492';
            $('calibration-result').style.color = '#22c55e';
            $('coord-date').disabled = true;
            $('coord-city').disabled = true;
        }
    }
}
