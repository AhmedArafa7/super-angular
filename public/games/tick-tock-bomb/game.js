const questions = [
    { q: "ما هي عاصمة مصر؟", o: ["القاهرة", "الإسكندرية", "أسوان", "بورسعيد"], a: 0 },
    { q: "ما هي عاصمة فرنسا؟", o: ["باريس", "ليون", "مرسيليا", "نيس"], a: 0 },
    { q: "ما هي عاصمة إيطاليا؟", o: ["روما", "ميلانو", "نابولي", "فلورنسا"], a: 0 },
    { q: "ما هي عاصمة تركيا؟", o: ["أنقرة", "إسطنبول", "إزمير", "أنطاليا"], a: 0 },
    { q: "ما هي عاصمة اليابان؟", o: ["طوكيو", "أوساكا", "كيوتو", "هيروشيما"], a: 0 },
    { q: "ما هي عاصمة الصين؟", o: ["بكين", "شنغهاي", "هونغ كونغ", "تشونغتشينغ"], a: 0 },
    { q: "ما هي عاصمة السعودية؟", o: ["الرياض", "جدة", "مكة المكرمة", "الدمام"], a: 0 },
    { q: "ما هي عاصمة الإمارات؟", o: ["أبوظبي", "دبي", "الشارقة", "عجمان"], a: 0 },
    { q: "ما هي عاصمة الأردن؟", o: ["عمّان", "إربد", "العقبة", "الزرقاء"], a: 0 },
    { q: "ما هي عاصمة لبنان؟", o: ["بيروت", "طرابلس", "صور", "صيدا"], a: 0 },
    { q: "ما هي عاصمة العراق؟", o: ["بغداد", "البصرة", "الموصل", "أربيل"], a: 0 },
    { q: "ما هي عاصمة سوريا؟", o: ["دمشق", "حلب", "حمص", "اللاذقية"], a: 0 },
    { q: "ما هي عاصمة الكويت؟", o: ["مدينة الكويت", "الأحمدي", "حولي", "السالمية"], a: 0 },
    { q: "ما هي عاصمة قطر؟", o: ["الدوحة", "الريان", "أم صلال", "الوكرة"], a: 0 },
    { q: "ما هي عاصمة عُمان؟", o: ["مسقط", "صلالة", "صحار", "نزوى"], a: 0 },
    { q: "ما هي عاصمة اليمن؟", o: ["صنعاء", "عدن", "تعز", "الحديدة"], a: 0 },
    { q: "ما هي عاصمة ألمانيا؟", o: ["برلين", "ميونخ", "فرانكفورت", "هامبورغ"], a: 0 },
    { q: "ما هي عاصمة بريطانيا؟", o: ["لندن", "مانشستر", "ليفربول", "برمنغهام"], a: 0 },
    { q: "ما هي عاصمة الولايات المتحدة؟", o: ["واشنطن", "نيويورك", "لوس أنجلوس", "شيكاغو"], a: 0 },
    { q: "ما هي عاصمة روسيا؟", o: ["موسكو", "سانت بطرسبرغ", "كازان", "نوفوسيبيرسك"], a: 0 },
    { q: "ما هي عاصمة الهند؟", o: ["نيودلهي", "مومباي", "بنغالور", "كلكتا"], a: 0 },
    { q: "ما هي عاصمة المغرب؟", o: ["الرباط", "الدار البيضاء", "مراكش", "فاس"], a: 0 },
    { q: "ما هي عاصمة الجزائر؟", o: ["الجزائر", "وهران", "قسنطينة", "عنابة"], a: 0 },
    { q: "ما هي عاصمة تونس؟", o: ["تونس", "صفاقس", "سوسة", "القيروان"], a: 0 },
    { q: "ما هي عاصمة ليبيا؟", o: ["طرابلس", "بنغازي", "مصراتة", "سبها"], a: 0 },
    { q: "ما هي عاصمة البحرين؟", o: ["المنامة", "المحرق", "الرفاع", "جد حفص"], a: 0 },
    { q: "ما هي عاصمة فلسطين؟", o: ["القدس", "غزة", "رام الله", "نابلس"], a: 0 },
    { q: "كم عدد الكواكب في المجموعة الشمسية؟", o: ["8", "7", "9", "10"], a: 0 },
    { q: "ما هو الكوكب الأحمر؟", o: ["المريخ", "الزهرة", "عطارد", "المشتري"], a: 0 },
    { q: "ما هو أكبر كوكب في المجموعة الشمسية؟", o: ["المشتري", "زحل", "الأرض", "نبتون"], a: 0 },
    { q: "ما هو الكوكب الأقرب إلى الشمس؟", o: ["عطارد", "الزهرة", "الأرض", "المريخ"], a: 0 },
    { q: "ما هو الكوكب الذي يشتهر بحلقاته؟", o: ["زحل", "المريخ", "عطارد", "الزهرة"], a: 0 },
    { q: "ما هو أطول نهر في العالم؟", o: ["النيل", "الأمازون", "المسيسيبي", "الدانوب"], a: 0 },
    { q: "ما هي أكبر محيطات العالم؟", o: ["المحيط الهادئ", "الأطلسي", "الهندي", "المتجمد الشمالي"], a: 0 },
    { q: "ما هي أكبر صحراء في العالم؟", o: ["الصحراء الكبرى", "الربع الخالي", "غوبي", "كالاهاري"], a: 0 },
    { q: "ما هو أعلى جبل في العالم؟", o: ["إفرست", "كيليمانجارو", "مون بلان", "فوجي"], a: 0 },
    { q: "ما هو أكبر حيوان على وجه الأرض؟", o: ["الحوت الأزرق", "الفيل الأفريقي", "الزرافة", "وحيد القرن"], a: 0 },
    { q: "ما هو أسرع حيوان بري في العالم؟", o: ["الفهد", "الأسد", "الحصان", "الغزال"], a: 0 },
    { q: "ما هو الحيوان الملقب بملك الغابة؟", o: ["الأسد", "النمر", "الفيل", "الدب"], a: 0 },
    { q: "ما هو أطول حيوان في العالم؟", o: ["الزرافة", "الفيل", "الأفعى", "الكنغر"], a: 0 },
    { q: "ما هو الحيوان الذي يغير لونه؟", o: ["الحرباء", "السلحفاة", "التمساح", "الضفدع"], a: 0 },
    { q: "ما هو الحيوان الملقب بسفينة الصحراء؟", o: ["الجمل", "الحصان", "البغل", "الحمار"], a: 0 },
    { q: "ما هو الطائر الذي لا يطير؟", o: ["النعامة", "الصقر", "النسر", "الحمامة"], a: 0 },
    { q: "ما هو الحيوان الذي له ثمانية أذرع؟", o: ["الأخطبوط", "قنديل البحر", "السلطعون", "الجمبري"], a: 0 },
    { q: "ما هو الغاز الذي نتنفسه لنبقى أحياءً؟", o: ["الأكسجين", "النيتروجين", "الهيدروجين", "ثاني أكسيد الكربون"], a: 0 },
    { q: "ما هو الغاز الذي يملأ البالونات لتطير؟", o: ["الهيليوم", "الأكسجين", "النيتروجين", "الهيدروجين"], a: 0 },
    { q: "ما هو العضو الذي يضخ الدم في الجسم؟", o: ["القلب", "الكبد", "الرئة", "الكلية"], a: 0 },
    { q: "ما هو العضو الذي نرى به؟", o: ["العين", "الأذن", "الأنف", "اللسان"], a: 0 },
    { q: "ما هو أكبر عضو في جسم الإنسان؟", o: ["الجلد", "الكبد", "الدماغ", "القلب"], a: 0 },
    { q: "ما هو الفيتامين الذي نحصل عليه من الشمس؟", o: ["فيتامين د", "فيتامين ج", "فيتامين أ", "فيتامين ب"], a: 0 },
    { q: "كم عدد حواس الإنسان الأساسية؟", o: ["5", "4", "6", "7"], a: 0 },
    { q: "كم عدد ألوان قوس قزح؟", o: ["7", "5", "6", "8"], a: 0 },
    { q: "ما هي اللغة الأكثر انتشاراً في العالم؟", o: ["الإنجليزية", "الصينية", "العربية", "الفرنسية"], a: 0 },
    { q: "ما هو الشهر الذي يصوم فيه المسلمون؟", o: ["رمضان", "شوال", "ذو الحجة", "محرم"], a: 0 },
    { q: "ما هو أقدم هرم في العالم؟", o: ["الهرم الأكبر بالجيزة", "هرم زوسر المدرج", "هرم خفرع", "هرم منقرع"], a: 0 },
    { q: "ما هي الرياضة الأكثر شعبية في العالم؟", o: ["كرة القدم", "كرة السلة", "الكرة الطائرة", "التنس"], a: 0 },
    { q: "ما هو الشيء الذي يكتب ولا يقرأ؟", o: ["القلم", "الكتاب", "الورقة", "اللوح"], a: 0 },
    { q: "ما هو الشيء الذي له عين واحدة ولا يرى؟", o: ["الإبرة", "الساعة", "المصباح", "المفتاح"], a: 0 },
    { q: "ما هو الشيء الذي كلما زاد نقص؟", o: ["العمر", "المال", "الصوت", "الضوء"], a: 0 },
    { q: "ما هو الشيء الذي له رقبة وليس له رأس؟", o: ["الزجاجة", "القميص", "الشجرة", "الباب"], a: 0 }
];

// Deck that never repeats a question until all questions have been used
let questionDeck = [];
let deckIndex = 0;

function getNextPrompt() {
    if (deckIndex >= questionDeck.length) {
        questionDeck = questions.slice().sort(() => Math.random() - 0.5);
        deckIndex = 0;
    }
    const q = questionDeck[deckIndex++];
    // shuffle the options so the correct answer is never in the same place
    const opts = q.o.map((text, i) => ({ text, correct: i === q.a }));
    opts.sort(() => Math.random() - 0.5);
    return {
        q: q.q,
        o: opts.map(x => x.text),
        a: opts.findIndex(x => x.correct)
    };
}

// --- Question rendering (options + reveal answer) ---
let answerRevealed = false;

function renderQuestion(qObj) {
    answerRevealed = false;
    document.getElementById('category-text').innerText = qObj.q;
    const optsBox = document.getElementById('question-options');
    optsBox.innerHTML = '';
    qObj.o.forEach((opt, i) => {
        const div = document.createElement('div');
        div.className = 'q-option';
        div.textContent = opt;
        if (i === qObj.a) div.dataset.correct = '1';
        optsBox.appendChild(div);
    });
    const btn = document.getElementById('reveal-answer-btn');
    btn.classList.remove('hidden');
    btn.innerText = 'إظهار الإجابة 👁️';
}

function toggleRevealAnswer() {
    const btn = document.getElementById('reveal-answer-btn');
    answerRevealed = !answerRevealed;
    document.querySelectorAll('#question-options .q-option').forEach(opt => {
        if (opt.dataset.correct) opt.classList.toggle('correct', answerRevealed);
        else opt.classList.toggle('wrong', answerRevealed);
    });
    btn.innerText = answerRevealed ? 'إخفاء الإجابة 🙈' : 'إظهار الإجابة 👁️';
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

// Audio
let audioContext = null;
function initAudio() {
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume();
}
function playTickSound() {
    if (!audioContext) return;
    const osc = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(400, audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.1);
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    osc.connect(gainNode);
    gainNode.connect(audioContext.destination);
    osc.start(); osc.stop(audioContext.currentTime + 0.1);
}
function playExplosionSound() {
    if (!audioContext) return;
    const osc = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
    gainNode.gain.setValueAtTime(1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
    osc.connect(gainNode);
    gainNode.connect(audioContext.destination);
    osc.start(); osc.stop(audioContext.currentTime + 1);
}

// Global Mode
let playMode = 'online';
let localPlayers = ["اللاعب 1", "اللاعب 2", "اللاعب 3"];
let localTurnIndex = 0;

// --- POTATO MOVEMENT ---
function movePotatoToPlayer(index, animate = true) {
    const potato = document.getElementById('potato');
    const targetWrapper = document.getElementById(`char-${index}`);
    
    // Remove active class from all
    document.querySelectorAll('.character-wrapper').forEach(w => w.classList.remove('active'));
    
    if (targetWrapper && potato) {
        targetWrapper.classList.add('active');
        
        // Hand-level position (in front of the chest, between the arms)
        const container = document.getElementById('game-arena');
        const cRect = container.getBoundingClientRect();
        const wRect = targetWrapper.getBoundingClientRect();
        
        const targetX = (wRect.left + wRect.width / 2 - cRect.left) - 26;
        const targetY = (wRect.top - cRect.top) + 88;
        
        const currentX = parseFloat(potato.style.left);
        const currentY = parseFloat(potato.style.top);
        
        if (!animate || isNaN(currentX) || isNaN(currentY)) {
            potato.style.left = `${targetX}px`;
            potato.style.top = `${targetY}px`;
            potato.style.transform = '';
            potato.classList.add('tick');
            potato.classList.add('juggle');
        } else {
            // Throw the hot potato with an arc from hand to hand
            const startX = currentX;
            const startY = currentY;
            const arcHeight = Math.min(110, Math.abs(targetX - startX) / 2 + 40);
            const duration = 600;
            const startTime = performance.now();
            
            potato.classList.remove('tick');
            potato.classList.remove('juggle');
            
            function throwFrame(time) {
                const t = Math.min(1, (time - startTime) / duration);
                const eased = t * t * (3 - 2 * t);
                const x = startX + (targetX - startX) * eased;
                const y = startY + (targetY - startY) * eased - Math.sin(t * Math.PI) * arcHeight;
                const scale = 0.7 + Math.sin(t * Math.PI) * 0.6;
                
                potato.style.left = `${x}px`;
                potato.style.top = `${y}px`;
                potato.style.transform = `scale(${scale}) rotate(${t * 360}deg)`;
                
                if (t < 1) {
                    requestAnimationFrame(throwFrame);
                } else {
                    potato.style.transform = '';
                    potato.classList.add('tick');
                    potato.classList.add('juggle');
                }
            }
            requestAnimationFrame(throwFrame);
        }
    }
    
    updatePassButtons(index);
}

function updatePassButtons(index) {
    document.querySelectorAll('.pass-btn').forEach(b => b.classList.remove('show'));
    if (playMode === 'local') {
        const btn = document.querySelector(`#char-${index} .pass-btn`);
        if (btn) btn.classList.add('show');
    } else if (myIndex === index) {
        const btn = document.querySelector(`#char-${index} .pass-btn`);
        if (btn) btn.classList.add('show');
    }
}

// --- LOCAL LOGIC ---
let localTimer = null;
let localVisualTickTimer = null;
let localStartTime = 0;
let localDuration = 0;

function startLocalGame() {
    playMode = 'local';
    localTurnIndex = 0;
    initAudio();
    showScreen('game-screen');
    
    document.getElementById('local-turn-text').classList.remove('hidden');
    document.getElementById('online-turn-text').classList.add('hidden');
    document.getElementById('action-controls').classList.remove('hidden');
    document.getElementById('wait-controls').classList.add('hidden');
    
    renderQuestion(getNextPrompt());
    
    localDuration = Math.floor(Math.random() * (90000 - 40000 + 1)) + 40000;
    localStartTime = Date.now();
    
    clearTimeout(localTimer);
    localTimer = setTimeout(() => {
        localExplode();
    }, localDuration);
    
    movePotatoToPlayer(localTurnIndex, false);
    startLocalVisualTick();
}

function startLocalVisualTick() {
    clearTimeout(localVisualTickTimer);
    document.getElementById('potato').classList.add('tick');
    
    const tickLoop = () => {
        playTickSound();
        const timeElapsed = Date.now() - localStartTime;
        const core = document.querySelector('#potato .potato-core');
        let tickInterval = 1000;
        
        if (timeElapsed > localDuration - 5000) {
            tickInterval = 250;
            core.style.animationDuration = '0.1s';
        } else if (timeElapsed > localDuration - 10000) {
            tickInterval = 500;
            core.style.animationDuration = '0.25s';
        } else {
            core.style.animationDuration = '0.5s';
        }
        
        localVisualTickTimer = setTimeout(tickLoop, tickInterval);
    };
    tickLoop();
}

function localExplode() {
    clearTimeout(localVisualTickTimer);
    document.getElementById('potato').classList.remove('tick');
    document.getElementById('potato').classList.remove('juggle');
    document.querySelectorAll('.pass-btn').forEach(b => b.classList.remove('show'));
    playExplosionSound();
    
    document.body.classList.add('bg-flash');
    setTimeout(() => { document.body.classList.remove('bg-flash'); }, 1000);
    
    showScreen('explosion-screen');
    document.getElementById('loser-msg').classList.add('hidden');
    document.getElementById('local-loser-msg').classList.remove('hidden');
    
    // Set loser name
    document.getElementById('local-loser-msg').innerHTML = `انفجرت البطاطس في يد <span style="color:#ef4444">${localPlayers[localTurnIndex]}</span>! 🥔💥`;

    document.getElementById('host-restart-controls').classList.add('hidden');
    document.getElementById('local-restart-controls').classList.remove('hidden');
}


// --- ONLINE LOGIC ---
let peer = null;
let myId = null;
let myName = null;
let isHost = false;
let myIndex = -1;

let connections = []; 
let hostConn = null;

let gameState = {
    phase: 'lobby', 
    players: [], 
    turnId: null,
    category: "",
    duration: 0,
    startTime: 0
};

function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    for(let i=0; i<4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
}

function showCreateRoom() {
    playMode = 'online';
    isHost = true;
    myName = "المضيف (أنت)";
    const roomCode = generateRoomCode();
    myId = "POTATO-" + roomCode;
    document.getElementById('room-code-display').innerText = roomCode;
    showScreen('host-screen');
    initPeer(myId);
}

function showJoinRoom() {
    playMode = 'online';
    isHost = false;
    showScreen('join-screen');
}

function initPeer(id) {
    peer = new Peer(id);
    peer.on('open', (id) => {
        if (isHost) {
            connections.push({ id: myId, name: myName, conn: null });
            gameState.players.push({ id: myId, name: myName });
            updateHostLobby();
        }
    });
    peer.on('connection', (conn) => {
        if (isHost) setupHostConnection(conn);
    });
    peer.on('error', (err) => {
        if (isHost) alert("خطأ في الإنشاء.");
        else document.getElementById('join-status').innerText = "خطأ: الغرفة غير موجودة.";
    });
}

function setupHostConnection(conn) {
    conn.on('open', () => {
        conn.on('data', (data) => {
            if (data.type === 'JOIN') {
                connections.push({ id: conn.peer, name: data.name, conn: conn });
                gameState.players.push({ id: conn.peer, name: data.name });
                updateHostLobby();
                broadcastState();
            } else if (data.type === 'PASS' && data.peerId === gameState.turnId && gameState.phase === 'playing') {
                hostNextTurn();
            }
        });
    });
    conn.on('close', () => {
        connections = connections.filter(c => c.id !== conn.peer);
        gameState.players = gameState.players.filter(p => p.id !== conn.peer);
        updateHostLobby();
        broadcastState();
    });
}

function updateHostLobby() {
    document.getElementById('host-players-count').innerText = connections.length;
    const list = document.getElementById('host-players-list');
    list.innerHTML = '';
    connections.forEach(c => {
        const li = document.createElement('li');
        li.innerText = c.name;
        list.appendChild(li);
    });
    document.getElementById('start-online-btn').disabled = (connections.length < 2);
}

function broadcastState() {
    if (!isHost) return;
    connections.forEach(c => {
        if (c.conn) c.conn.send({ type: 'STATE_UPDATE', state: gameState });
    });
}

function joinRoom() {
    const nameInput = document.getElementById('player-name-input').value.trim();
    const codeInput = document.getElementById('room-code-input').value.trim().toUpperCase();
    if (!nameInput) { document.getElementById('join-status').innerText = "أدخل اسمك!"; return; }
    if (codeInput.length !== 4) { document.getElementById('join-status').innerText = "كود الغرفة 4 أحرف!"; return; }
    
    myName = nameInput;
    document.getElementById('join-status').innerText = "جاري الاتصال...";
    
    peer = new Peer();
    peer.on('open', (id) => {
        myId = id;
        hostConn = peer.connect('POTATO-' + codeInput);
        hostConn.on('open', () => {
            hostConn.send({ type: 'JOIN', name: myName });
            document.getElementById('guest-room-id').innerText = codeInput;
            showScreen('guest-waiting-screen');
        });
        hostConn.on('data', (data) => {
            if (data.type === 'STATE_UPDATE') handleStateUpdate(data.state);
        });
        hostConn.on('close', () => { alert("الغرفة أغلقت"); leaveRoom(); });
    });
}

// Game Logic
let hostTimer = null;
let visualTickTimer = null;
let isOnlineGamePlaying = false;

function handleStateUpdate(state) {
    gameState = state;
    
    if (state.phase === 'lobby') {
        const list = document.getElementById('guest-players-list');
        list.innerHTML = '';
        state.players.forEach(p => {
            const li = document.createElement('li');
            li.innerText = p.name + (p.id === myId ? " (أنت)" : "");
            list.appendChild(li);
        });
        showScreen('guest-waiting-screen');
    } else if (state.phase === 'playing') {
        initAudio();
        showScreen('game-screen');
        
        document.getElementById('local-turn-text').classList.add('hidden');
        document.getElementById('online-turn-text').classList.remove('hidden');
        
        const turnPlayer = state.players.find(p => p.id === state.turnId);
        const turnIndex = state.players.findIndex(p => p.id === state.turnId);
        myIndex = state.players.findIndex(p => p.id === myId);
        document.getElementById('current-player-name').innerText = turnPlayer ? turnPlayer.name : "...";
        renderQuestion(state.category);
        
        movePotatoToPlayer(turnIndex % 3, isOnlineGamePlaying); // Animate only on turn changes
        isOnlineGamePlaying = true;
        
        if (state.turnId === myId) {
            document.getElementById('action-controls').classList.remove('hidden');
            document.getElementById('wait-controls').classList.add('hidden');
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        } else {
            document.getElementById('action-controls').classList.add('hidden');
            document.getElementById('wait-controls').classList.remove('hidden');
        }
        
        startVisualTick();
    } else if (state.phase === 'exploded') {
        explodeVisual();
    }
}

function startOnlineGame() {
    if (!isHost) return;
    gameState.phase = 'playing';
    isOnlineGamePlaying = false;
    gameState.duration = Math.floor(Math.random() * (90000 - 40000 + 1)) + 40000;
    gameState.startTime = Date.now();
    
    gameState.turnId = gameState.players[Math.floor(Math.random() * gameState.players.length)].id;
    gameState.category = getNextPrompt();
    
    broadcastState();
    handleStateUpdate(JSON.parse(JSON.stringify(gameState)));
    
    clearTimeout(hostTimer);
    hostTimer = setTimeout(() => {
        hostExplode();
    }, gameState.duration);
}

function hostNextTurn() {
    if (!isHost) return;
    let currentIndex = gameState.players.findIndex(p => p.id === gameState.turnId);
    currentIndex = (currentIndex + 1) % gameState.players.length;
    
    gameState.turnId = gameState.players[currentIndex].id;
    gameState.category = getNextPrompt();
    
    broadcastState();
    handleStateUpdate(JSON.parse(JSON.stringify(gameState)));
}

function passPotato() {
    initAudio();
    if (playMode === 'local') {
        localTurnIndex = (localTurnIndex + 1) % 3;
        renderQuestion(getNextPrompt());
        movePotatoToPlayer(localTurnIndex, true);
    } else {
        if (isHost) {
            hostNextTurn();
        } else {
            hostConn.send({ type: 'PASS', peerId: myId });
        }
    }
}

function hostExplode() {
    if (!isHost) return;
    gameState.phase = 'exploded';
    broadcastState();
    handleStateUpdate(JSON.parse(JSON.stringify(gameState)));
}

function startVisualTick() {
    clearTimeout(visualTickTimer);
    document.getElementById('potato').classList.add('tick');
    
    const tickLoop = () => {
        if (gameState.phase !== 'playing') return;
        playTickSound();
        
        const core = document.querySelector('#potato .potato-core');
        const timeElapsed = Date.now() - gameState.startTime;
        let tickInterval = 1000;
        
        if (timeElapsed > gameState.duration - 5000) {
            tickInterval = 250;
            core.style.animationDuration = '0.1s';
        } else if (timeElapsed > gameState.duration - 10000) {
            tickInterval = 500;
            core.style.animationDuration = '0.25s';
        } else {
            core.style.animationDuration = '0.5s';
        }
        
        visualTickTimer = setTimeout(tickLoop, tickInterval);
    };
    tickLoop();
}

function explodeVisual() {
    clearTimeout(visualTickTimer);
    document.getElementById('potato').classList.remove('tick');
    document.getElementById('potato').classList.remove('juggle');
    document.querySelectorAll('.pass-btn').forEach(b => b.classList.remove('show'));
    playExplosionSound();
    
    document.body.classList.add('bg-flash');
    setTimeout(() => { document.body.classList.remove('bg-flash'); }, 1000);
    
    showScreen('explosion-screen');
    document.getElementById('loser-msg').classList.remove('hidden');
    document.getElementById('local-loser-msg').classList.add('hidden');
    
    const loser = gameState.players.find(p => p.id === gameState.turnId);
    document.getElementById('loser-name').innerText = loser ? loser.name : "...";
    
    if (isHost) {
        document.getElementById('host-restart-controls').classList.remove('hidden');
    } else {
        document.getElementById('host-restart-controls').classList.add('hidden');
    }
    document.getElementById('local-restart-controls').classList.add('hidden');
}

function leaveRoom() {
    if (peer) { peer.destroy(); peer = null; }
    window.location.reload();
}
