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

let gameState = {
    phase: 'lobby', // lobby, roles, playing, game-over
    players: [], // { id, name, role }
    timeRemaining: 300,
    strikes: 0,
    maxStrikes: 3,
    resultMsg: '',
    modules: [],
    recentGesture: ''
};

let timerInterval = null;
let audioElements = [];

// --- Input Validation ---
function validateName(name) {
    const trimmed = name.trim();
    if (!trimmed) return { valid: false, error: 'الاسم مطلوب' };
    if (trimmed.length > 20) return { valid: false, error: 'الاسم طويل جداً (20 حرف كحد أقصى)' };
    if (!/^[\u0600-\u06FFa-zA-Z0-9\s_-]+$/.test(trimmed)) return { valid: false, error: 'الاسم يحتوي على رموز غير مسموحة' };
    return { valid: true, value: trimmed };
}

function validateRoomCode(code) {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return { valid: false, error: 'كود الغرفة مطلوب' };
    if (!/^[A-Z0-9]{6}$/.test(trimmed)) return { valid: false, error: 'كود الغرفة يجب أن يكون 6 أحرف/أرقام' };
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
    $('host-btn').innerText = 'جاري الإنشاء...';
    
    const myRoomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const peerId = 'SUPMONKEY_' + myRoomCode;
    myPeer = new Peer(peerId);
    
    let connectionTimeout = null;
    const CONNECTION_TIMEOUT = 10000;
    
    connectionTimeout = setTimeout(() => {
        if (!myId && isHost) {
            alert('انتهت مهلة الاتصال. يمكنك إعادة المحاولة.');
            cleanup();
            showScreen('lobby-screen');
            $('host-btn').disabled = false;
            $('host-btn').innerText = 'إنشاء غرفة (مضيف)';
        }
    }, CONNECTION_TIMEOUT);
    
    myPeer.on('disconnected', () => {
        console.warn('تم فقدان الاتصال بالسيرفر. جاري محاولة إعادة الاتصال...');
        attemptReconnection();
    });
    
    myPeer.on('close', () => {
        console.warn('تم إغلاق الاتصال.');
    });
    
    myPeer.on('error', (err) => {
        console.error('Peer error:', err);
        if (connectionTimeout) clearTimeout(connectionTimeout);
        cleanup();
        showScreen('lobby-screen');
        $('host-btn').disabled = false;
        $('host-btn').innerText = 'إنشاء غرفة (مضيف)';
        alert('حدث خطأ في الاتصال بالسيرفر: ' + err.message);
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
    $('join-btn').innerText = 'جاري الانضمام...';
    
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
        hostConn.on('error', () => alert('خطأ في الاتصال بالمضيف'));
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
}

// --- Lobby UI & Roles ---
function updateLobbyUI() {
    if (gameState.phase !== 'lobby' && gameState.phase !== 'roles') return;
    
    const list = $('players-list');
    list.innerHTML = '';
    gameState.players.forEach(p => {
        const li = document.createElement('li');
        li.innerText = `${p.name} ${p.id === myId ? '(أنت)' : ''}`;
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
                readyDiv.innerText = '✅ جاهز';
                if (p.id === myId) {
                    btn.innerText = 'إلغاء (CANCEL)';
                    btn.classList.add('my-role');
                    btn.disabled = false;
                } else {
                    btn.innerText = 'محجوز (TAKEN)';
                    btn.classList.remove('my-role');
                    btn.disabled = true;
                }
            } else {
                nameDiv.innerText = '--';
                card.classList.remove('selected');
                btn.innerText = 'اختيار';
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

function checkPhaseChange() {
    if (gameState.phase === 'playing') {
        const me = gameState.players.find(p => p.id === myId);
        myRole = me ? me.role : '';
        
        if (!isHost && myStream === null && myRole !== '') { // guest needs to connect audio
            startAudioNetworking();
        }
        
        renderGameUI();
    } else if (gameState.phase === 'game-over') {
        cleanup();
        showScreen('game-over-screen');
        $('end-title').innerText = gameState.resultMsg === 'win' ? 'تم التفكيك بنجاح! 🎉' : 'انفجرت القنبلة! 💥';
        $('end-title').className = gameState.resultMsg === 'win' ? 'end-title win' : 'end-title danger-text';
        if(isHost && parent) parent.postMessage({ type: 'ARCADE_GAME_OVER', winner: gameState.resultMsg === 'win' ? 'Victory' : 'Defeat', gameId: 'three-monkeys' }, '*');
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
        alert('حدث خطأ في الوصول للميكروفون. يرجى السماح به للعب.');
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
function generateBomb() {
    gameState.timeRemaining = 300;
    gameState.strikes = 0;
    gameState.resultMsg = '';
    
    // Module 1: Wires
    const colors = ['red', 'blue', 'yellow', 'green', 'black'];
    const numWires = Math.floor(Math.random() * 3) + 3; // 3 to 5
    let wires = [];
    for(let i=0; i<numWires; i++) wires.push(colors[Math.floor(Math.random() * colors.length)]);
    
    let wSol = 0;
    if (numWires === 3) {
        if (!wires.includes('red')) wSol = 1; // second
        else if (wires[2] === 'blue') wSol = 0; // first
        else wSol = 2; // last
    } else if (numWires === 4) {
        if (wires[0] === 'yellow') wSol = 0;
        else wSol = 2; // third
    } else {
        if (wires[4] === 'black') wSol = 3; // fourth
        else wSol = 1; // second
    }
    
    // Module 2: Numbers
    let number = Math.floor(Math.random() * 90) + 10;
    let nSol = '';
    if (number % 2 === 0) nSol = '<';
    else nSol = '>';
    
    // Module 3: Keypad
    let buttons = ['red', 'blue', 'yellow', 'green'];
    // Solution logic based on colors presence, independent of position
    let sequence = buttons.includes('red') ? ['red', 'blue', 'yellow', 'green'] : ['green', 'yellow', 'blue', 'red'];
    buttons.sort(() => 0.5 - Math.random()); // Shuffle for display only
    
    gameState.modules = [
        { type: 'wires', id: 0, wires: wires, cutIndex: -1, defused: false, solutionIndex: wSol },
        { type: 'numbers', id: 1, number: number, pressed: null, defused: false, solutionBtn: nSol },
        { type: 'keypad', id: 2, buttons: buttons, pressedSequence: [], defused: false, solutionSeq: sequence }
    ];
    
    startTimer();
}

function startTimer() {
    timerInterval = setInterval(() => {
        gameState.timeRemaining--;
        if (gameState.timeRemaining <= 0) {
            triggerGameOver('lose');
        }
        broadcastState();
    }, 1000);
}

function triggerGameOver(result) {
    if (timerInterval) clearInterval(timerInterval);
    gameState.phase = 'game-over';
    gameState.resultMsg = result;
    broadcastState();
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
        let mod = gameState.modules[0];
        if (mod.defused) return;
        mod.cutIndex = action.index;
        if (action.index === mod.solutionIndex) {
            mod.defused = true;
            checkWin();
        } else {
            addStrike();
        }
        broadcastState();
    }
    
    if (action.type === 'PRESS_NUM') {
        let mod = gameState.modules[1];
        if (mod.defused) return;
        mod.pressed = action.value;
        if (action.value === mod.solutionBtn) {
            mod.defused = true;
            checkWin();
        } else {
            addStrike();
            mod.pressed = null; // reset to try again
        }
        broadcastState();
    }
    
    if (action.type === 'PRESS_KEY') {
        let mod = gameState.modules[2];
        if (mod.defused) return;
        
        let expectedColor = mod.solutionSeq[mod.pressedSequence.length];
        if (action.color === expectedColor) {
            mod.pressedSequence.push(action.color);
            if (mod.pressedSequence.length === mod.solutionSeq.length) {
                mod.defused = true;
                checkWin();
            }
        } else {
            addStrike();
            mod.pressedSequence = []; // reset
        }
        broadcastState();
    }
}

function addStrike() {
    gameState.strikes++;
    if (gameState.strikes >= gameState.maxStrikes) {
        triggerGameOver('lose');
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
    
    // Header
    let m = Math.floor(gameState.timeRemaining / 60).toString().padStart(2, '0');
    let s = (gameState.timeRemaining % 60).toString().padStart(2, '0');
    $('timer-display').innerText = `${m}:${s}`;
    
    let str = '';
    for(let i=0; i<gameState.strikes; i++) str += '❌';
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
        
        if (mod.type === 'wires') {
            mod.wires.forEach((w, wIdx) => {
                let wHit = document.createElement('div');
                wHit.className = 'blind-item wire-hitbox';
                wHit.style.top = `${wIdx * 25 + 10}px`;
                wHit.addEventListener('touchstart', (e) => { e.preventDefault(); sendAction({ type: 'CUT_WIRE', index: wIdx }); }, {passive: false});
                wHit.onclick = () => sendAction({ type: 'CUT_WIRE', index: wIdx });
                if (mod.cutIndex === wIdx) wHit.style.display = 'none';
                modDiv.appendChild(wHit);
            });
        }
        
        if (mod.type === 'numbers') {
            let leftBtn = document.createElement('div');
            leftBtn.className = 'blind-item btn-hitbox';
            leftBtn.style.top = '60px'; leftBtn.style.left = '10px'; leftBtn.style.width = '60px'; leftBtn.style.height = '50px';
            leftBtn.addEventListener('touchstart', (e) => { e.preventDefault(); sendAction({ type: 'PRESS_NUM', value: '<' }); }, {passive: false});
            leftBtn.onclick = () => sendAction({ type: 'PRESS_NUM', value: '<' });
            
            let rightBtn = document.createElement('div');
            rightBtn.className = 'blind-item btn-hitbox';
            rightBtn.style.top = '60px'; rightBtn.style.right = '10px'; rightBtn.style.width = '60px'; rightBtn.style.height = '50px';
            rightBtn.addEventListener('touchstart', (e) => { e.preventDefault(); sendAction({ type: 'PRESS_NUM', value: '>' }); }, {passive: false});
            rightBtn.onclick = () => sendAction({ type: 'PRESS_NUM', value: '>' });
            
            modDiv.appendChild(leftBtn);
            modDiv.appendChild(rightBtn);
        }
        
        if (mod.type === 'keypad') {
            mod.buttons.forEach((b, bIdx) => {
                let btnHit = document.createElement('div');
                btnHit.className = 'blind-item btn-hitbox';
                let col = bIdx % 2; let row = Math.floor(bIdx / 2);
                btnHit.style.top = `${row * 65 + 10}px`;
                btnHit.style.left = `${col * 65 + 10}px`;
                btnHit.style.width = '60px'; btnHit.style.height = '60px';
                btnHit.onclick = () => sendAction({ type: 'PRESS_KEY', color: b });
                
                if (mod.pressedSequence.includes(b)) {
                    btnHit.style.opacity = '0.2';
                    btnHit.style.pointerEvents = 'none';
                }
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
            check.innerText = '✅';
            check.style.position = 'absolute'; check.style.right = '5px'; check.style.top = '5px';
            modDiv.appendChild(check);
        }
        
        if (mod.type === 'wires') {
            mod.wires.forEach((w, wIdx) => {
                let wireDiv = document.createElement('div');
                wireDiv.className = 'wire';
                if (mod.cutIndex === wIdx) wireDiv.classList.add('cut');
                wireDiv.style.backgroundColor = colorMap[w];
                modDiv.appendChild(wireDiv);
            });
        }
        
        if (mod.type === 'numbers') {
            let numD = document.createElement('div');
            numD.className = 'num-display';
            numD.innerText = mod.number;
            modDiv.appendChild(numD);
            
            let btnC = document.createElement('div');
            btnC.className = 'num-btn-container';
            btnC.innerHTML = `<button class="num-btn"><</button><button class="num-btn">></button>`;
            modDiv.appendChild(btnC);
        }
        
        if (mod.type === 'keypad') {
            let grid = document.createElement('div');
            grid.className = 'keypad-grid';
            mod.buttons.forEach((b, bIdx) => {
                let btn = document.createElement('button');
                btn.className = 'keypad-btn';
                btn.style.backgroundColor = colorMap[b];
                if (mod.pressedSequence.includes(b)) btn.classList.add('pressed');
                grid.appendChild(btn);
            });
            modDiv.appendChild(grid);
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
