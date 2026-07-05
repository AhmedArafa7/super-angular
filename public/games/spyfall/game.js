const categories = {
    "places": ["مستشفى", "مدرسة", "غواصة", "بنك", "طائرة", "مسرح", "فندق", "مطعم", "كازينو", "قطار ركاب", "قاعدة عسكرية", "استوديو سينمائي", "سفينة قراصنة", "قاعدة قطبية", "مركز شرطة", "سوبر ماركت", "حديقة حيوان", "متحف", "شاطئ", "سفينة فضاء"],
    "countries": ["مصر", "السعودية", "اليابان", "إيطاليا", "البرازيل", "فرنسا", "الصين", "الهند", "الولايات المتحدة", "إسبانيا", "روسيا", "المكسيك", "أستراليا", "كندا", "الأرجنتين", "تركيا", "المغرب", "الإمارات", "كوريا الجنوبية", "جنوب أفريقيا"],
    "animals": ["أسد", "فيل", "قرد", "دولفين", "ثعبان", "نمر", "زرافة", "حصان", "كلب", "قطة", "دب", "نسر", "قرش", "تمساح", "بطريق", "ذئب", "كنغر", "جمل", "بومة", "سلحفاة"],
    "actors": ["أحمد حلمي", "عادل إمام", "ليوناردو دي كابريو", "توم كروز", "براد بيت", "توم هانكس", "جوني ديب", "روبرت دي نيرو", "آل باتشينو", "ويل سميث", "كريم عبد العزيز", "أحمد السقا", "محمد هنيدي", "دنزل واشنطن", "مورغان فريمان", "جاكي شان", "سيلفستر ستالون", "ارنولد شوارزنيجر", "محمد رمضان", "يحيى الفخراني"]
};

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

// Global state
let playMode = 'online'; // 'online' or 'local'

// --- LOCAL LOGIC ---
let localPlayersCount = 4;
let localPlayers = [];
let localCurrentPlayerIndex = 0;
let localSpyIndex = 0;
let localSecretWord = "";
let localRound = 1;

function showLocalSetup() {
    playMode = 'local';
    showScreen('local-setup-screen');
}

function changeLocalPlayers(delta) {
    localPlayersCount += delta;
    if (localPlayersCount < 3) localPlayersCount = 3;
    if (localPlayersCount > 10) localPlayersCount = 10;
    document.getElementById('local-player-count').innerText = localPlayersCount;
}

function startLocalGame() {
    const activeCategory = document.getElementById('local-category-select').value;
    let cats = activeCategory === 'random' ? Object.keys(categories) : [activeCategory];
    const chosenCat = cats[Math.floor(Math.random() * cats.length)];
    const words = categories[chosenCat];
    
    localSecretWord = words[Math.floor(Math.random() * words.length)];
    const categoryName = (chosenCat === 'places') ? 'أماكن' : (chosenCat === 'countries') ? 'بلدان' : (chosenCat === 'animals') ? 'حيوانات' : 'ممثلين';
    
    localPlayers = [];
    for(let i=0; i<localPlayersCount; i++) {
        localPlayers.push({ id: `player-${i+1}`, name: `اللاعب ${i+1}`, role: 'طبيعي', word: localSecretWord });
    }
    
    localSpyIndex = Math.floor(Math.random() * localPlayersCount);
    localPlayers[localSpyIndex].role = 'جاسوس';
    localPlayers[localSpyIndex].word = null;
    
    // Set words list for reference
    const wordsList = document.getElementById('local-words-list');
    wordsList.innerHTML = '';
    words.forEach(word => {
        const div = document.createElement('div');
        div.className = 'word-pill';
        div.innerText = word;
        wordsList.appendChild(div);
    });
    
    localCurrentPlayerIndex = 0;
    localRound = 1;
    showLocalPassScreen();
}

function showLocalPassScreen() {
    showScreen('local-pass-screen');
    document.getElementById('local-current-player-num').innerText = (localCurrentPlayerIndex + 1);
    document.getElementById('local-secret-box').classList.add('hidden');
    document.getElementById('local-hide-pass-btn').classList.add('hidden');
    document.getElementById('local-show-secret-btn').classList.remove('hidden');
}

function localShowSecret() {
    document.getElementById('local-secret-box').classList.remove('hidden');
    document.getElementById('local-hide-pass-btn').classList.remove('hidden');
    document.getElementById('local-show-secret-btn').classList.add('hidden');
    
    const p = localPlayers[localCurrentPlayerIndex];
    if (p.role === 'جاسوس') {
        document.getElementById('local-player-role').innerText = "أنت الجاسوس! 🕵️‍♂️";
        document.getElementById('local-player-role').style.color = "#ef4444";
        document.getElementById('local-secret-word-container').classList.add('hidden');
    } else {
        document.getElementById('local-player-role').innerText = "عضو طبيعي 👨‍💼";
        document.getElementById('local-player-role').style.color = "#3b82f6";
        document.getElementById('local-secret-word-container').classList.remove('hidden');
        document.getElementById('local-secret-word').innerText = p.word;
    }
}

function localHideAndPass() {
    localCurrentPlayerIndex++;
    if (localCurrentPlayerIndex >= localPlayersCount) {
        startLocalQuestions();
    } else {
        showLocalPassScreen();
    }
}

function startLocalQuestions() {
    showScreen('local-question-screen');
    document.getElementById('local-round-number').innerText = localRound;
    pickLocalTurn();
}

function pickLocalTurn() {
    let askerIdx = Math.floor(Math.random() * localPlayersCount);
    let ansIdx = Math.floor(Math.random() * localPlayersCount);
    while (ansIdx === askerIdx) ansIdx = Math.floor(Math.random() * localPlayersCount);
    
    document.getElementById('local-asker-num').innerText = (askerIdx + 1);
    document.getElementById('local-answerer-num').innerText = (ansIdx + 1);
}

function localNextTurn() {
    pickLocalTurn();
}

function localEndRound() {
    showScreen('voting-screen');
    document.getElementById('host-voting-controls').classList.remove('hidden');
    document.getElementById('guest-voting-wait').classList.add('hidden');
    
    const votingGrid = document.getElementById('voting-buttons');
    votingGrid.innerHTML = '';
    localPlayers.forEach((p, idx) => {
        const btn = document.createElement('button');
        btn.className = 'btn-player';
        btn.innerText = p.name;
        btn.onclick = () => submitLocalVote(idx);
        votingGrid.appendChild(btn);
    });
}

function submitLocalVote(votedIdx) {
    showScreen('result-screen');
    document.getElementById('actual-spy').innerText = localPlayers[localSpyIndex].name;
    document.getElementById('actual-word').innerText = localSecretWord;
    
    if (votedIdx === localSpyIndex) {
        document.getElementById('result-title').innerText = "انتصر الفريق! ✅";
        document.getElementById('result-title').className = "attention-text";
    } else {
        document.getElementById('result-title').innerText = "فاز الجاسوس! 🕵️‍♂️";
        document.getElementById('result-title').className = "danger-text";
    }
    
    document.getElementById('host-result-controls').classList.remove('hidden');
}


// --- ONLINE LOGIC ---
let peer = null;
let myId = null;
let myName = null;
let isHost = false;

let connections = []; // Array of {id, name, conn}
let gameState = {
    phase: 'lobby',
    players: [], 
    spyId: null,
    secretWord: null,
    categoryName: null,
    wordsList: [],
    round: 1,
    askerId: null,
    answererId: null,
    winner: null 
};
let hostConn = null;
let myGameData = null;

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
    myId = "SPYFALL-" + roomCode;
    
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
        console.log('My peer ID is: ' + id);
        if (isHost) {
            connections.push({ id: myId, name: myName, conn: null }); 
            updateHostLobby();
        }
    });

    peer.on('connection', (conn) => {
        if (isHost) {
            setupHostConnection(conn);
        }
    });
    
    peer.on('error', (err) => {
        console.error(err);
        if (isHost) {
            alert("حدث خطأ في إنشاء الغرفة.");
        } else {
            document.getElementById('join-status').innerText = "حدث خطأ: " + err.type;
        }
    });
}

function setupHostConnection(conn) {
    conn.on('open', () => {
        conn.on('data', (data) => {
            if (data.type === 'JOIN') {
                connections.push({ id: conn.peer, name: data.name, conn: conn });
                updateHostLobby();
                broadcastState();
            } else if (data.type === 'READY') {
                const p = gameState.players.find(p => p.id === conn.peer);
                if (p) {
                    p.isReady = true;
                    checkAllReady();
                }
            }
        });
    });
    
    conn.on('close', () => {
        connections = connections.filter(c => c.id !== conn.peer);
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
    
    document.getElementById('start-online-btn').disabled = (connections.length < 3);
}

function broadcastState() {
    if (!isHost) return;
    
    connections.forEach(c => {
        if (c.conn) {
            const stateForGuest = JSON.parse(JSON.stringify(gameState));
            
            stateForGuest.players.forEach(p => {
                if (p.id !== c.id) {
                    delete p.role;
                    delete p.word;
                }
            });
            if (gameState.phase !== 'result') {
                delete stateForGuest.spyId;
                delete stateForGuest.secretWord;
            }
            
            c.conn.send({ type: 'STATE_UPDATE', state: stateForGuest, playersList: connections.map(x=>({id:x.id, name:x.name})) });
        }
    });
}

function joinRoom() {
    const nameInput = document.getElementById('player-name-input').value.trim();
    const codeInput = document.getElementById('room-code-input').value.trim().toUpperCase();
    
    if (!nameInput) {
        document.getElementById('join-status').innerText = "يرجى إدخال اسمك!";
        return;
    }
    if (codeInput.length !== 4) {
        document.getElementById('join-status').innerText = "كود الغرفة غير صحيح!";
        return;
    }
    
    myName = nameInput;
    document.getElementById('join-status').innerText = "جاري الاتصال...";
    
    peer = new Peer(); 
    peer.on('open', (id) => {
        myId = id;
        hostConn = peer.connect('SPYFALL-' + codeInput);
        
        hostConn.on('open', () => {
            hostConn.send({ type: 'JOIN', name: myName });
            document.getElementById('guest-room-id').innerText = codeInput;
            showScreen('guest-waiting-screen');
        });
        
        hostConn.on('data', (data) => {
            if (data.type === 'STATE_UPDATE') {
                handleStateUpdate(data.state, data.playersList);
            }
        });
        
        hostConn.on('close', () => {
            alert("تم إغلاق الغرفة من قبل المضيف.");
            leaveRoom();
        });
    });
    
    peer.on('error', (err) => {
        document.getElementById('join-status').innerText = "لم يتم العثور على الغرفة!";
    });
}

function handleStateUpdate(state, playersList) {
    myGameData = state;
    
    if (state.phase === 'lobby') {
        const list = document.getElementById('guest-players-list');
        list.innerHTML = '';
        playersList.forEach(p => {
            const li = document.createElement('li');
            li.innerText = p.name + (p.id === myId ? " (أنت)" : "");
            list.appendChild(li);
        });
        showScreen('guest-waiting-screen');
    } 
    else if (state.phase === 'role') {
        const myPlayer = state.players.find(p => p.id === myId);
        showRoleScreen(myPlayer);
    }
    else if (state.phase === 'question') {
        showQuestionScreen(state, playersList);
    }
    else if (state.phase === 'voting') {
        showVotingScreen(playersList);
    }
    else if (state.phase === 'result') {
        showResultScreen(state, playersList);
    }
}

function startOnlineGame() {
    if (!isHost) return;
    
    gameState.phase = 'role';
    gameState.round = 1;
    gameState.winner = null;
    
    const activeCategory = document.getElementById('category-select').value;
    let cats = activeCategory === 'random' ? Object.keys(categories) : [activeCategory];
    const chosenCat = cats[Math.floor(Math.random() * cats.length)];
    const words = categories[chosenCat];
    
    gameState.secretWord = words[Math.floor(Math.random() * words.length)];
    gameState.categoryName = (chosenCat === 'places') ? 'أماكن' : (chosenCat === 'countries') ? 'بلدان' : (chosenCat === 'animals') ? 'حيوانات' : 'ممثلين';
    gameState.wordsList = words;
    
    gameState.players = connections.map(c => ({ id: c.id, name: c.name, isReady: false, role: 'طبيعي', word: gameState.secretWord }));
    
    const spyIndex = Math.floor(Math.random() * gameState.players.length);
    gameState.spyId = gameState.players[spyIndex].id;
    gameState.players[spyIndex].role = 'جاسوس';
    gameState.players[spyIndex].word = null;
    
    pickNextTurn();
    broadcastState();
    handleStateUpdate(JSON.parse(JSON.stringify(gameState)), connections.map(c=>({id:c.id, name:c.name})));
}

function pickNextTurn() {
    const pCount = gameState.players.length;
    let askerIdx = Math.floor(Math.random() * pCount);
    let ansIdx = Math.floor(Math.random() * pCount);
    while (ansIdx === askerIdx) ansIdx = Math.floor(Math.random() * pCount);
    
    gameState.askerId = gameState.players[askerIdx].id;
    gameState.answererId = gameState.players[ansIdx].id;
}

function showRoleScreen(myPlayer) {
    showScreen('role-screen');
    const roleElem = document.getElementById('player-role');
    const wordCont = document.getElementById('secret-word-container');
    const wordElem = document.getElementById('secret-word');
    
    if (myPlayer.role === 'جاسوس') {
        roleElem.innerText = "أنت الجاسوس! 🕵️‍♂️";
        roleElem.style.color = "#ef4444";
        wordCont.classList.add('hidden');
    } else {
        roleElem.innerText = "عضو طبيعي 👨‍💼";
        roleElem.style.color = "#3b82f6";
        wordCont.classList.remove('hidden');
        wordElem.innerText = myPlayer.word;
    }
    
    document.getElementById('ready-status').innerText = "";
    document.getElementById('ready-btn').style.display = "block";
}

function markReady() {
    document.getElementById('ready-btn').style.display = "none";
    document.getElementById('ready-status').innerText = "في انتظار البقية...";
    
    if (isHost) {
        const p = gameState.players.find(p => p.id === myId);
        if (p) p.isReady = true;
        checkAllReady();
    } else {
        hostConn.send({ type: 'READY' });
    }
}

function checkAllReady() {
    if (!isHost) return;
    const allReady = gameState.players.every(p => p.isReady);
    if (allReady) {
        gameState.phase = 'question';
        broadcastState();
        handleStateUpdate(JSON.parse(JSON.stringify(gameState)), connections.map(c=>({id:c.id, name:c.name})));
    }
}

function showQuestionScreen(state, playersList) {
    showScreen('question-screen');
    document.getElementById('round-number').innerText = state.round;
    
    const asker = playersList.find(p => p.id === state.askerId);
    const answerer = playersList.find(p => p.id === state.answererId);
    
    document.getElementById('asker-name').innerText = asker ? asker.name : "?";
    document.getElementById('answerer-name').innerText = answerer ? answerer.name : "?";
    
    if (isHost) {
        document.getElementById('host-controls').classList.remove('hidden');
    } else {
        document.getElementById('host-controls').classList.add('hidden');
    }
    
    const wordsList = document.getElementById('words-list');
    wordsList.innerHTML = '';
    state.wordsList.forEach(word => {
        const div = document.createElement('div');
        div.className = 'word-pill';
        div.innerText = word;
        wordsList.appendChild(div);
    });
}

function hostNextTurn() {
    if (!isHost) return;
    pickNextTurn();
    broadcastState();
    handleStateUpdate(JSON.parse(JSON.stringify(gameState)), connections.map(c=>({id:c.id, name:c.name})));
}

function hostEndRound() {
    if (!isHost) return;
    gameState.phase = 'voting';
    broadcastState();
    handleStateUpdate(JSON.parse(JSON.stringify(gameState)), connections.map(c=>({id:c.id, name:c.name})));
}

function showVotingScreen(playersList) {
    showScreen('voting-screen');
    
    if (isHost) {
        document.getElementById('host-voting-controls').classList.remove('hidden');
        document.getElementById('guest-voting-wait').classList.add('hidden');
        
        const votingGrid = document.getElementById('voting-buttons');
        votingGrid.innerHTML = '';
        playersList.forEach(p => {
            const btn = document.createElement('button');
            btn.className = 'btn-player';
            btn.innerText = p.name;
            btn.onclick = () => hostSubmitVote(p.id);
            votingGrid.appendChild(btn);
        });
    } else {
        document.getElementById('host-voting-controls').classList.add('hidden');
        document.getElementById('guest-voting-wait').classList.remove('hidden');
    }
}

function hostSubmitVote(votedId) {
    if (!isHost) return;
    
    if (votedId === gameState.spyId) {
        gameState.winner = 'team';
    } else {
        gameState.winner = 'spy';
    }
    
    gameState.phase = 'result';
    broadcastState();
    handleStateUpdate(JSON.parse(JSON.stringify(gameState)), connections.map(c=>({id:c.id, name:c.name})));
}

function showResultScreen(state, playersList) {
    showScreen('result-screen');
    
    const spyPlayer = playersList.find(p => p.id === state.spyId);
    document.getElementById('actual-spy').innerText = spyPlayer ? spyPlayer.name : "?";
    document.getElementById('actual-word').innerText = state.secretWord;
    
    if (state.winner === 'spy') {
        document.getElementById('result-title').innerText = "فاز الجاسوس! 🕵️‍♂️";
        document.getElementById('result-title').className = "danger-text";
    } else {
        document.getElementById('result-title').innerText = "انتصر الفريق! ✅";
        document.getElementById('result-title').className = "attention-text";
    }
    
    if (isHost) {
        document.getElementById('host-result-controls').classList.remove('hidden');
    } else {
        document.getElementById('host-result-controls').classList.add('hidden');
    }
}

function playAgain() {
    if (playMode === 'local') {
        showScreen('local-setup-screen');
    } else {
        if (!isHost) return;
        gameState.phase = 'lobby';
        updateHostLobby();
        broadcastState();
        handleStateUpdate(JSON.parse(JSON.stringify(gameState)), connections.map(c=>({id:c.id, name:c.name})));
        showScreen('host-screen');
    }
}

function leaveRoom() {
    if (peer) {
        peer.destroy();
        peer = null;
    }
    connections = [];
    gameState.players = [];
    window.location.reload();
}
