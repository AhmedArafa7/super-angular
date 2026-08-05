const themeCategories = {
    animals: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🐔", "🐧", "🐦", "🐤", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🐛", "🦋", "🐌", "🐞", "🐜", "🦟", "🦗", "🕷", "🐢", "🐍", "🦎", "🦖", "🦕", "🐙", "🦑", "🦐", "🦞", "🦀", "🐡", "🐠", "🐟", "🐬", "🐳", "🐋", "🦈", "🐊", "🐅", "🐆", "🐘", "🦛", "🦏", "🐪"],
    fruits: ["🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🍆", "🥑", "🥦", "🥬", "🥒", "🌶", "🫑", "🌽", "🥕", "🫒", "🧄", "🧅", "🥔", "🍠", "🥐", "🥯", "🍞", "🥖", "🥨", "🧀", "🥚", "🍳", "🧈", "🥞", "<ctrl42>", "🥓", "🥩", "🍗", "🍖", "🌭", "🍔", "🍟", "🍕", "🫓", "🥪", "🥙", "🧆", "🌮", "🌯", "🫔", "🥗", "🥘", "🫕"],
    space: ["🚀", "🛸", "🛰", "🪐", "🌟", "⭐", "🌌", "☄️", "🌙", "☀️", "🌍", "🌕", "🌠", "👾", "🤖", "👽", "🔮", "⚡", "🔥", "💥", "✨", "💫", "🎯", "🧩", "🎲", "♟️", "🕹️", "🎮", "🔮", "💎", "👑", "🏆", "🥇", "🎗️", "🏵️", "🎖️", "⚔️", "🛡️", "🔮", "🧿", "🪄", "🧬", "🧪", "🧫", "🔬", "🔭", "📡", "💡", "🔦", "🕯️", "🎆", "🎇"],
    sports: ["⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱", "🪀", "🏓", "🏸", "🏒", "🏑", "🥍", "🏏", "🪃", "🥅", "⛳", "🪁", "🏹", "🎣", "🤿", "🥊", "🥋", "🎽", "🛹", "🛼", "🛷", "⛸", "🥌", "🎿", "⛷", "🏂", "🪂", "🏋️", "🤼", "🤸", "⛹️", "🤺", "🤾", "🏌️", "🏇", "🧘", "🏄", "🏊", "<ctrl42>", "🚣", "🧗", "🚵", "🚴", "🏆", "🥇", "🥈", "🥉", "🏅", "🎖", "🏵", "🎗"],
    vehicles: ["🚗", "🚕", "🚙", "🚌", "🚎", "🏎", "🚓", "🚑", "🚒", "🚐", "🛻", "🚚", "🚛", "🚜", "🦯", "🦽", "🦼", "<ctrl42>", "🚲", "🛵", "🏍", "🛺", "🚨", "🚔", "🚘", "🚍", "🚖", "🚡", "<ctrl42>", "🚟", "🚃", "🚋", "🪂", "🚁", "🛶", "⛵", "🚤", "🛥", "🛳", "⚙️", "🔧", "⚓", "🚦", "🛑", "⛵", "🚢", "✈️", "🛫", "🛬", "🪂", "💺", "🚁", "🚟", "<ctrl42>", "🚡", "🛰", "🚀", "🛸", "🛎", "🧳"]
};

let currentTheme = 'random'; // 'random', 'animals', 'fruits', 'space', 'sports', 'vehicles'

function getActiveEmojiPool() {
    if (currentTheme !== 'random' && themeCategories[currentTheme]) {
        return themeCategories[currentTheme];
    }
    // Random pool pick per round
    const keys = Object.keys(themeCategories);
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    return themeCategories[randomKey];
}

// --- WEB AUDIO API SYNTHESIZER ---
let audioCtx = null;

function getAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

function playMatchSound() {
    try {
        const ctx = getAudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(650, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1300, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
    } catch(e) {}
}

function playWrongSound() {
    try {
        const ctx = getAudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.18);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.18);
    } catch(e) {}
}

function playWinSound() {
    try {
        const ctx = getAudioContext();
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.25, ctx.currentTime + idx * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.1 + 0.22);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + idx * 0.1);
            osc.stop(ctx.currentTime + idx * 0.1 + 0.22);
        });
    } catch(e) {}
}

// --- DECK GENERATOR (DOBBLE PROJECTIVE PLANE) ---
let itemsPerCard = 8;

function generateDobbleDeck(itemsCount = 8) {
    const n = itemsCount - 1;
    const cards = [];
    
    for (let i = 0; i <= n; i++) {
        let card = [0];
        for (let j = 0; j < n; j++) {
            card.push((i * n) + j + 1);
        }
        cards.push(card);
    }
    
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            let card = [i + 1];
            for (let k = 0; k < n; k++) {
                let val = (n + 1) + (n * k) + ((i * k + j) % n);
                card.push(val);
            }
            cards.push(card);
        }
    }

    const pool = getActiveEmojiPool();
    const shuffledEmojis = [...pool].sort(() => 0.5 - Math.random());
    return cards.map(cardIndexes => cardIndexes.map(idx => shuffledEmojis[idx % shuffledEmojis.length]));
}

// --- UI SCREENS & NAVIGATION ---
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(screenId);
    if (target) target.classList.add('active');
}

function showProModal() { document.getElementById('pro-modal').classList.remove('hidden'); }
function closeProModal() { document.getElementById('pro-modal').classList.add('hidden'); }

let currentGameMode = 'ai';
let aiDifficulty = 'easy';
let maxScore = 10;

function showAiSetup() { currentGameMode = 'ai'; showScreen('ai-setup-screen'); }
function showLocalSetup() { currentGameMode = 'local'; showScreen('local-setup-screen'); }

function setTheme(theme) {
    currentTheme = theme;
    document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll(`.theme-btn[data-theme="${theme}"]`).forEach(b => b.classList.add('active'));
}

function setAiDifficulty(diff) {
    aiDifficulty = diff;
    document.querySelectorAll('#ai-setup-screen .players-mode-selector button').forEach(b => b.classList.remove('active'));
    document.getElementById(`ai-${diff}-btn`).classList.add('active');
}

function setItemCount(count) {
    itemsPerCard = count;
    document.querySelectorAll('.players-mode-selector button[id*="item"]').forEach(b => b.classList.remove('active'));
    document.querySelectorAll(`button[id*="item${count}"]`).forEach(b => b.classList.add('active'));
}

function changeMaxScore(delta) {
    maxScore += delta;
    if (maxScore < 5) maxScore = 5;
    if (maxScore > 50) maxScore = 50;
    const aiDisp = document.getElementById('ai-max-score-display');
    const localDisp = document.getElementById('local-max-score-display');
    if (aiDisp) aiDisp.innerText = maxScore;
    if (localDisp) localDisp.innerText = maxScore;
}

// --- GAME STATE ---
let deck = [];
let topCard = [];
let bottomCard = [];
let scoreTop = 0;
let scoreBottom = 0;
let currentMatchingEmoji = null;
let aiTimer = null;

function findMatchingEmoji(card1, card2) {
    for (let item of card1) {
        if (card2.includes(item)) return item;
    }
    return null;
}

function startAiGame() {
    currentGameMode = 'ai';
    initGameSession('الروبوت الذكي 🤖', 'أنت 👤');
}

function startLocalGame() {
    currentGameMode = 'local';
    initGameSession('اللاعب العلوي 👤', 'اللاعب السفلي 👤', true);
}

function initGameSession(nameTop, nameBottom, isTopRotated = false) {
    scoreTop = 0;
    scoreBottom = 0;
    deck = generateDobbleDeck(itemsPerCard);
    
    topCard = deck.pop();
    bottomCard = deck.pop();
    currentMatchingEmoji = findMatchingEmoji(topCard, bottomCard);

    document.getElementById('name-top').innerHTML = `${nameTop}: <span id="score-top">0</span>`;
    document.getElementById('name-bottom').innerHTML = `${nameBottom}: <span id="score-bottom">0</span>`;
    document.getElementById('target-score-num').innerText = maxScore;

    const slotTop = document.getElementById('slot-top');
    if (isTopRotated) slotTop.classList.add('player-top-rotated');
    else slotTop.classList.remove('player-top-rotated');

    showScreen('game-screen');
    renderRoundView();

    if (currentGameMode === 'ai') {
        scheduleAiTurn();
    }
}

function renderRoundView() {
    renderCircularCard('card-top', topCard, 'top');
    renderCircularCard('card-bottom', bottomCard, 'bottom');

    document.getElementById('score-top').innerText = scoreTop;
    document.getElementById('score-bottom').innerText = scoreBottom;
}

// RADIAL EMOJI PLACEMENT ENGINE WITH DYNAMIC SCALE AND ROTATION VARIATIONS
function renderCircularCard(containerId, cardArray, playerSlot) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const total = cardArray.length;
    const ringCount = total - 1;
    const radiusPercent = total >= 9 ? 34 : 32;

    // Center Emoji (Index 0)
    createEmojiNode(container, cardArray[0], 50, 50, playerSlot);

    // Outer Ring Emojis
    const angleStep = (2 * Math.PI) / ringCount;
    const randomOffset = Math.random() * Math.PI;

    for (let i = 1; i < total; i++) {
        const angle = (i - 1) * angleStep + randomOffset;
        const x = 50 + radiusPercent * Math.cos(angle);
        const y = 50 + radiusPercent * Math.sin(angle);
        createEmojiNode(container, cardArray[i], x, y, playerSlot);
    }
}

function createEmojiNode(container, emoji, xPercent, yPercent, playerSlot) {
    const span = document.createElement('span');
    span.className = 'emoji-item';
    span.innerText = emoji;
    span.style.left = `${xPercent}%`;
    span.style.top = `${yPercent}%`;

    const fontPx = Math.floor(Math.min(window.innerHeight * 0.045, 36));
    span.style.fontSize = `${fontPx}px`;

    // Dynamic random scale (0.75x to 1.45x) and rotation (-40deg to +40deg) as requested by user
    const randomScale = (0.75 + Math.random() * 0.7).toFixed(2);
    const randomRotate = Math.floor((Math.random() * 80) - 40);
    span.style.transform = `translate(-50%, -50%) scale(${randomScale}) rotate(${randomRotate}deg)`;

    span.onclick = (e) => {
        e.stopPropagation();
        handleEmojiClick(playerSlot, emoji);
    };

    container.appendChild(span);
}

function handleEmojiClick(playerSlot, emoji) {
    if (emoji === currentMatchingEmoji) {
        if (aiTimer) clearTimeout(aiTimer);

        playMatchSound();
        const winnerCardId = playerSlot === 'top' ? 'card-top' : 'card-bottom';
        const cardElem = document.getElementById(winnerCardId);
        if (cardElem) {
            cardElem.classList.add('success-glow');
            setTimeout(() => cardElem.classList.remove('success-glow'), 400);
        }

        if (playerSlot === 'top') scoreTop++;
        else scoreBottom++;

        if (scoreTop >= maxScore || scoreBottom >= maxScore) {
            playWinSound();
            endGame(scoreTop >= maxScore ? 'اللاعب العلوي (الخصم)' : 'أنت (اللاعب السفلي)');
            return;
        }

        // Draw next card for round
        if (deck.length === 0) deck = generateDobbleDeck(itemsPerCard);
        if (playerSlot === 'top') {
            topCard = deck.pop();
        } else {
            bottomCard = deck.pop();
        }

        currentMatchingEmoji = findMatchingEmoji(topCard, bottomCard);
        renderRoundView();

        if (currentGameMode === 'ai') {
            scheduleAiTurn();
        }
    } else {
        playWrongSound();
        const cardElem = document.getElementById(playerSlot === 'top' ? 'card-top' : 'card-bottom');
        if (cardElem) {
            cardElem.classList.add('wrong-shake');
            setTimeout(() => cardElem.classList.remove('wrong-shake'), 350);
        }
    }
}

function scheduleAiTurn() {
    if (aiTimer) clearTimeout(aiTimer);
    let delay = 2500;
    if (aiDifficulty === 'medium') delay = 1700;
    if (aiDifficulty === 'hard') delay = 1100;

    aiTimer = setTimeout(() => {
        if (currentGameMode === 'ai' && currentMatchingEmoji) {
            handleEmojiClick('top', currentMatchingEmoji);
        }
    }, delay + Math.random() * 500);
}

function endGame(winnerName) {
    if (aiTimer) clearTimeout(aiTimer);
    showScreen('winner-screen');
    document.getElementById('winner-name').innerText = winnerName;
}

function restartCurrentGame() {
    if (currentGameMode === 'ai') startAiGame();
    else if (currentGameMode === 'local') startLocalGame();
    else if (currentGameMode === 'online') startOnlineGame();
}

// --- ONLINE P2P (STRICTLY 2 PLAYERS, NO CENTER CARD) ---
let peer = null, myId = null, myName = null, isHost = false, hostConn = null;

function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    for(let i=0; i<4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
}

function showCreateRoom() {
    currentGameMode = 'online';
    isHost = true;
    myName = "المضيف (أنت)";
    const roomCode = generateRoomCode();
    myId = "DOBBLE2P-" + roomCode;
    document.getElementById('room-code-display').innerText = roomCode;
    showScreen('host-screen');
    initPeer(myId);
}

function copyRoomCode() {
    const code = document.getElementById('room-code-display').innerText;
    navigator.clipboard.writeText(code);
    const status = document.getElementById('copy-status');
    status.innerText = '✓ تم نسخ كود الغرفة!';
    setTimeout(() => status.innerText = '', 2500);
}

function showJoinRoom() {
    currentGameMode = 'online';
    isHost = false;
    showScreen('join-screen');
}

function initPeer(id) {
    peer = new Peer(id);
    peer.on('open', () => {
        if (isHost) updateHostLobby();
    });
    peer.on('connection', (conn) => {
        if (isHost) {
            hostConn = conn;
            conn.on('open', () => {
                conn.on('data', (data) => {
                    if (data.type === 'MATCH_CLICK') {
                        handleEmojiClick('top', data.emoji);
                    }
                });
                document.getElementById('host-players-count').innerText = '2';
                document.getElementById('host-players-list').innerHTML = '<li>أنت (المضيف)</li><li>صديقك (منضم) ✅</li>';
                document.getElementById('start-online-btn').disabled = false;
            });
        }
    });
}

function joinRoom() {
    const nameInput = document.getElementById('player-name-input').value.trim();
    const codeInput = document.getElementById('room-code-input').value.trim().toUpperCase();
    if (!nameInput || codeInput.length !== 4) return;
    
    document.getElementById('join-status').innerText = "جاري الاتصال بالسيرفر...";
    peer = new Peer();
    peer.on('open', () => {
        hostConn = peer.connect('DOBBLE2P-' + codeInput);
        hostConn.on('open', () => {
            document.getElementById('guest-room-id').innerText = codeInput;
            showScreen('guest-waiting-screen');
        });
        hostConn.on('data', (data) => {
            if (data.type === 'SYNC_ROUND') {
                topCard = data.topCard;
                bottomCard = data.bottomCard;
                scoreTop = data.scoreTop;
                scoreBottom = data.scoreBottom;
                currentMatchingEmoji = data.matching;
                showScreen('game-screen');
                renderRoundView();
            }
        });
    });
}

function startOnlineGame() {
    if (!isHost) return;
    initGameSession('صديقك 👤', 'أنت (المضيف) 👤');
}

function leaveRoom() {
    if (aiTimer) clearTimeout(aiTimer);
    if (peer) { peer.destroy(); peer = null; }
    window.location.reload();
}
