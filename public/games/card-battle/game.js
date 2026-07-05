const AVAILABLE_CARDS = [
    { type: 'attack', name: 'هجوم', icon: '⚔️', desc: 'ضرر مباشر للخصم', class: 'attack' },
    { type: 'defense', name: 'دفاع', icon: '🛡️', desc: 'يقلل الضرر القادم', class: 'defense' },
    { type: 'fire', name: 'نار', icon: '🔥', desc: 'يسبب حروق للخصم (ضرر مستمر)', class: 'fire' },
    { type: 'poison', name: 'سم', icon: '☠️', desc: 'يقلل من قوة هجوم الخصم', class: 'poison' },
    { type: 'freeze', name: 'تجميد', icon: '❄️', desc: 'يمنع الخصم من اللعب لجولة', class: 'freeze' },
    { type: 'reflect', name: 'درع عاكس', icon: '🪞', desc: 'يعكس جزء من الضرر', class: 'reflect' },
    { type: 'heal', name: 'علاج', icon: '💚', desc: 'يستعيد نقاط الصحة', class: 'heal' },
    { type: 'lightning', name: 'برق', icon: '⚡', desc: 'ضرر هائل فرصة نجاح 70%', class: 'lightning' },
    { type: 'draw', name: 'سحب', icon: '🎴', desc: 'تسحب وتلعب بطاقة إضافية', class: 'draw' }
];

let playerDeck = [];
let aiDeck = [];
let pointsLeft = 100;
const MAX_DECK_SIZE = 20;

// Elements
const availableCardsContainer = document.getElementById('available-cards-container');
const myDeckList = document.getElementById('my-deck-list');
const pointsLeftEl = document.getElementById('points-left');
const deckCountEl = document.getElementById('deck-count');
const startBtn = document.getElementById('start-battle-btn');
const deckScreen = document.getElementById('deck-builder-screen');
const battleScreen = document.getElementById('battle-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const modeScreen = document.getElementById('mode-selection-screen');

// Menu Elements
const modeBtns = document.querySelectorAll('.mode-btn');
const mainMenu = document.getElementById('main-menu');
const p2pMenu = document.getElementById('p2p-menu');
const createRoomBtn = document.getElementById('create-room-btn');
const roomIdDisplay = document.getElementById('roomIdDisplay');
const roomInfo = document.getElementById('room-info');
const joinRoomIdInput = document.getElementById('join-room-id');
const joinRoomBtn = document.getElementById('join-room-btn');
const joinError = document.getElementById('join-error');
const backToModesBtns = document.querySelectorAll('.back-to-modes-btn');
const p2NameLabel = document.getElementById('p2-name-label');
const waitingP2PMsg = document.getElementById('waiting-p2p-msg');

const builderTitle = document.getElementById('builder-title');
const p2HandContainer = document.getElementById('p2-hand-container');
const p2HandEl = document.getElementById('p2-hand');

// Game State
let activeMode = 'local'; // 'local', 'local2p', 'p2p-host', 'p2p-join'
let peer = null;
let conn = null;
let amIReady = false;
let isEnemyReady = false;
let enemyDeck = [];
let pendingMyCardIndex = -1;
let receivedEnemyCard = null;

// Menu Navigation
modeBtns.forEach(btn => btn.addEventListener('click', e => {
    activeMode = e.currentTarget.dataset.mode;
    if (activeMode === 'local' || activeMode === 'local2p') {
        modeScreen.classList.add('hidden');
        deckScreen.classList.remove('hidden');
        p2NameLabel.innerText = activeMode === 'local' ? 'الذكاء الاصطناعي' : 'اللاعب الثاني';
        if(activeMode === 'local2p') {
            builderTitle.innerText = "تجهيز أوراق اللاعب الأول";
        }
    } else {
        mainMenu.classList.add('hidden');
        p2pMenu.classList.remove('hidden');
    }
}));

backToModesBtns.forEach(btn => btn.addEventListener('click', () => {
    p2pMenu.classList.add('hidden');
    mainMenu.classList.remove('hidden');
    if (peer) { peer.destroy(); peer = null; }
}));

// P2P Setup
function initP2P() {
    peer = new Peer();
    peer.on('open', id => {
        roomIdDisplay.innerText = id;
    });
    peer.on('connection', connection => {
        conn = connection;
        setupConnection();
    });
}

createRoomBtn.addEventListener('click', () => {
    createRoomBtn.classList.add('hidden');
    roomInfo.classList.remove('hidden');
    activeMode = 'p2p-host';
    p2NameLabel.innerText = 'الخصم (الضيف)';
    initP2P();
});

joinRoomBtn.addEventListener('click', () => {
    const id = joinRoomIdInput.value.trim();
    if(!id) return;
    joinRoomBtn.innerText = 'جاري الاتصال...';
    peer = new Peer();
    peer.on('open', () => {
        conn = peer.connect(id);
        conn.on('open', () => {
            activeMode = 'p2p-join';
            p2NameLabel.innerText = 'الخصم (المستضيف)';
            setupConnection();
        });
        conn.on('error', () => {
            joinError.classList.remove('hidden');
            joinRoomBtn.innerText = 'انضمام للغرفة';
        });
    });
});

function setupConnection() {
    modeScreen.classList.add('hidden');
    deckScreen.classList.remove('hidden');
    
    conn.on('data', data => {
        if (data.type === 'ready') {
            isEnemyReady = true;
            enemyDeck = data.deck;
            if (amIReady) {
                startP2PBattle();
            }
        }
        if (data.type === 'playCard') {
            receivedEnemyCard = data.card;
            checkAndResolveTurn();
        }
    });
}

// Initialize Deck Builder
function initDeckBuilder() {
    availableCardsContainer.innerHTML = '';
    AVAILABLE_CARDS.forEach(card => {
        let level = 5;
        const cardEl = document.createElement('div');
        cardEl.className = `game-card ${card.class}`;
        cardEl.innerHTML = `
            <div class="card-header">
                <span class="card-icon">${card.icon}</span>
                <span class="card-level">Lvl <span class="lvl-val">${level}</span></span>
            </div>
            <div class="card-name">${card.name}</div>
            <div class="card-desc">${card.desc}</div>
            <div class="card-actions">
                <button class="level-btn minus">-</button>
                <button class="add-btn">إضافة</button>
                <button class="level-btn plus">+</button>
            </div>
        `;
        
        const lvlVal = cardEl.querySelector('.lvl-val');
        cardEl.querySelector('.minus').addEventListener('click', (e) => {
            if (level > 1) { level--; lvlVal.innerText = level; }
        });
        cardEl.querySelector('.plus').addEventListener('click', (e) => {
            if (level < 9) { level++; lvlVal.innerText = level; }
        });
        
        cardEl.querySelector('.add-btn').addEventListener('click', () => {
            if (playerDeck.length >= MAX_DECK_SIZE) return alert('الحد الأقصى 20 بطاقات');
            if (pointsLeft - level < 0) return alert('لا تملك نقاط كافية');
            
            pointsLeft -= level;
            playerDeck.push({ ...card, level, id: Date.now() + Math.random() });
            updateDeckPreview();
        });
        
        availableCardsContainer.appendChild(cardEl);
    });
}

function updateDeckPreview() {
    pointsLeftEl.innerText = pointsLeft;
    deckCountEl.innerText = playerDeck.length;
    startBtn.disabled = playerDeck.length === 0 || pointsLeft > 0;
    
    if (pointsLeft > 0 && playerDeck.length === MAX_DECK_SIZE) {
        // Automatically allow start if max cards reached
        startBtn.disabled = false;
    }

    myDeckList.innerHTML = '';
    playerDeck.forEach((card, index) => {
        const item = document.createElement('div');
        item.className = 'deck-item';
        item.innerHTML = `
            <div>${index + 1}. ${card.icon} ${card.name} (Lvl ${card.level})</div>
            <button class="remove-btn">X</button>
        `;
        item.querySelector('.remove-btn').addEventListener('click', () => {
            pointsLeft += card.level;
            playerDeck.splice(index, 1);
            updateDeckPreview();
        });
        myDeckList.appendChild(item);
    });
}

let player1LocalDeck = null;

startBtn.addEventListener('click', () => {
    if (activeMode === 'local') {
        generateAIDeck();
        startBattle(aiDeck);
    } else if (activeMode === 'local2p') {
        if (!player1LocalDeck) {
            // First player finished
            player1LocalDeck = [...playerDeck];
            playerDeck = [];
            pointsLeft = 100;
            builderTitle.innerText = "تجهيز أوراق اللاعب الثاني";
            updateDeckPreview();
        } else {
            // Second player finished
            let player2LocalDeck = [...playerDeck];
            playerDeck = [...player1LocalDeck];
            startBattle(player2LocalDeck);
        }
    } else {
        amIReady = true;
        startBtn.disabled = true;
        startBtn.innerText = 'في انتظار الخصم...';
        waitingP2PMsg.classList.remove('hidden');
        conn.send({ type: 'ready', deck: playerDeck });
        if (isEnemyReady) {
            startP2PBattle();
        }
    }
});

function startP2PBattle() {
    waitingP2PMsg.classList.add('hidden');
    startBattle(enemyDeck);
}

function generateAIDeck() {
    aiDeck = [];
    let aiPoints = 100;
    while(aiDeck.length < MAX_DECK_SIZE && aiPoints > 0) {
        let cardBase = AVAILABLE_CARDS[Math.floor(Math.random() * AVAILABLE_CARDS.length)];
        let maxLvl = Math.min(9, aiPoints);
        let level = Math.floor(Math.random() * maxLvl) + 1;
        if(level === 0) level = 1;
        if(aiPoints - level >= 0) {
            aiDeck.push({ ...cardBase, level, id: Date.now() + Math.random() });
            aiPoints -= level;
        }
    }
}

// BATTLE PHASE STATE
let p1 = { hp: 100, maxHp: 100, deck: [], discard: [], hand: [], status: {} };
let p2 = { hp: 100, maxHp: 100, deck: [], discard: [], hand: [], status: {} };
let currentTurn = 'p1';

function startBattle(enemyDeckConfig) {
    deckScreen.classList.add('hidden');
    battleScreen.classList.remove('hidden');
    
    p1 = { hp: 100, maxHp: 100, deck: [...playerDeck], discard: [], hand: [], status: {} };
    p2 = { hp: 100, maxHp: 100, deck: [...enemyDeckConfig], discard: [], hand: [], status: {} };
    
    updateBattleUI();
    logBattle('بدأت المعركة!');
    
    // First draw
    drawCard(p1);
    drawCard(p2);

    if (activeMode === 'local2p') {
        p2HandContainer.classList.remove('hidden');
    }
}

function drawCard(player) {
    if (player.deck.length === 0) {
        if (player.discard.length === 0) return; // Completely out of cards
        player.deck = [...player.discard];
        player.discard = [];
        logBattle('تم إعادة تدوير مجموعة الأوراق!');
    }
    const card = player.deck.shift(); // take from top
    player.hand.push(card);
    updateBattleUI();
}

function updateBattleUI() {
    // HP
    document.getElementById('p1-hp-text').innerText = `${Math.floor(p1.hp)}/100`;
    document.getElementById('p1-hp-bar').style.width = `${Math.max(0, (p1.hp/100)*100)}%`;
    
    document.getElementById('p2-hp-text').innerText = `${Math.floor(p2.hp)}/100`;
    document.getElementById('p2-hp-bar').style.width = `${Math.max(0, (p2.hp/100)*100)}%`;

    // Deck counts
    document.getElementById('p1-deck-count').innerText = p1.deck.length;
    document.getElementById('p1-discard-count').innerText = p1.discard.length;
    document.getElementById('p2-deck-count').innerText = p2.deck.length;
    document.getElementById('p2-discard-count').innerText = p2.discard.length;

    // Hand Render
    const handEl = document.getElementById('p1-hand');
    handEl.innerHTML = '';
    p1.hand.forEach((card, index) => {
        const cardEl = document.createElement('div');
        cardEl.className = `game-card ${card.class}`;
        cardEl.innerHTML = `
            <div class="card-header">
                <span class="card-icon">${card.icon}</span>
                <span class="card-level">Lvl <span class="lvl-val">${card.level}</span></span>
            </div>
            <div class="card-name">${card.name}</div>
            <div class="card-desc">${card.desc}</div>
        `;
        cardEl.addEventListener('click', () => playTurn(index));
        handEl.appendChild(cardEl);
    });

    if (activeMode === 'local2p') {
        p2HandEl.innerHTML = '';
        p2.hand.forEach((card, index) => {
            const cardEl = document.createElement('div');
            cardEl.className = `game-card ${card.class}`;
            cardEl.innerHTML = `
                <div class="card-header">
                    <span class="card-icon">${card.icon}</span>
                    <span class="card-level">Lvl <span class="lvl-val">${card.level}</span></span>
                </div>
                <div class="card-name">${card.name}</div>
                <div class="card-desc">${card.desc}</div>
            `;
            cardEl.addEventListener('click', () => playP2Turn(index));
            p2HandEl.appendChild(cardEl);
        });
    }

    renderStatus(p1, 'p1-status');
    renderStatus(p2, 'p2-status');
}

function renderStatus(player, elementId) {
    const el = document.getElementById(elementId);
    el.innerHTML = '';
    if(player.status.fire > 0) el.innerHTML += `<div class="status-icon">🔥 ${player.status.fire}</div>`;
    if(player.status.poison > 0) el.innerHTML += `<div class="status-icon">☠️ ${player.status.poison}</div>`;
    if(player.status.freeze > 0) el.innerHTML += `<div class="status-icon">❄️ ${player.status.freeze}</div>`;
    if(player.status.reflect > 0) el.innerHTML += `<div class="status-icon">🪞 ${player.status.reflect}</div>`;
    if(player.status.defense > 0) el.innerHTML += `<div class="status-icon">🛡️ ${player.status.defense}</div>`;
}

function logBattle(msg) {
    const logList = document.getElementById('log-list');
    const li = document.createElement('li');
    li.innerText = msg;
    logList.appendChild(li);
    logList.parentElement.scrollTop = logList.parentElement.scrollHeight;
}

function renderActiveCard(slotId, card) {
    const slot = document.getElementById(slotId);
    if(!card) { slot.innerHTML = ''; return; }
    slot.innerHTML = `
        <div class="game-card ${card.class} anim-play" style="margin:0; width:100%; height:100%;">
            <div class="card-header">
                <span class="card-icon">${card.icon}</span>
                <span class="card-level">Lvl <span class="lvl-val">${card.level}</span></span>
            </div>
            <div class="card-name">${card.name}</div>
            <div class="card-desc">${card.desc}</div>
        </div>
    `;
}

let isResolvingTurn = false;
let pendingP2CardIndex = -1;

function playTurn(p1CardIndex) {
    if(p1.hp <= 0 || p2.hp <= 0 || isResolvingTurn) return;
    if(pendingMyCardIndex !== -1) return; // already selected
    
    // Disable hand
    document.getElementById('p1-hand').style.pointerEvents = 'none';
    pendingMyCardIndex = p1CardIndex;

    if (activeMode === 'local') {
        // AI plays immediately
        let p2Card = null;
        if(p2.hand.length > 0) {
            p2Card = p2.hand.splice(0, 1)[0];
        } else if(p2.deck.length > 0 || p2.discard.length > 0) {
            drawCard(p2);
            p2Card = p2.hand.splice(0, 1)[0];
        }
        receivedEnemyCard = p2Card;
        checkAndResolveTurn();
    } else if (activeMode === 'local2p') {
        logBattle('في انتظار اختيار اللاعب الثاني...');
        checkAndResolveTurn();
    } else {
        // P2P: Send my card index and wait
        const myCard = p1.hand[p1CardIndex];
        conn.send({ type: 'playCard', card: myCard });
        logBattle('في انتظار حركة الخصم...');
        checkAndResolveTurn();
    }
}

function playP2Turn(p2CardIndex) {
    if(p1.hp <= 0 || p2.hp <= 0 || isResolvingTurn) return;
    if(pendingP2CardIndex !== -1) return;
    
    document.getElementById('p2-hand').style.pointerEvents = 'none';
    pendingP2CardIndex = p2CardIndex;
    logBattle('اللاعب الثاني اختار بطاقته.');
    checkAndResolveTurn();
}

async function checkAndResolveTurn() {
    if (activeMode === 'local2p') {
        if (pendingMyCardIndex === -1 || pendingP2CardIndex === -1) return;
    } else {
        if (pendingMyCardIndex === -1 || !receivedEnemyCard) return; // Wait until both are ready
        if (activeMode !== 'local' && receivedEnemyCard === null) return;
    }
    
    isResolvingTurn = true;
    const p1Card = p1.hand.splice(pendingMyCardIndex, 1)[0];
    
    let p2Card;
    if (activeMode === 'local2p') {
        p2Card = p2.hand.splice(pendingP2CardIndex, 1)[0];
    } else {
        p2Card = activeMode === 'local' ? receivedEnemyCard : p2.hand.splice(0, 1)[0];
    }
    
    const actualP2Card = (activeMode === 'local' || activeMode === 'local2p') ? p2Card : receivedEnemyCard;
    
    // reset state
    pendingMyCardIndex = -1;
    pendingP2CardIndex = -1;
    receivedEnemyCard = null;

    renderActiveCard('p1-active-card', p1Card);
    renderActiveCard('p2-active-card', actualP2Card);
    
    // Process Status Effects First (Fire/Poison)
    processStatus(p1);
    processStatus(p2);
    
    if(p1.hp <= 0 || p2.hp <= 0) return checkGameOver();

    // Check freeze
    let p1Frozen = p1.status.freeze > 0;
    let p2Frozen = p2.status.freeze > 0;

    if (p1Frozen) { logBattle('أنت مجمد! بطاقتك أُلغيت.'); p1.status.freeze--; }
    if (p2Frozen) { logBattle('الخصم مجمد! بطاقته أُلغيت.'); p2.status.freeze--; }

    await new Promise(r => setTimeout(r, 1000));

    // Execute cards
    let p1ExtraDraw = false;
    let p2ExtraDraw = false;

    if (!p1Frozen && p1Card) p1ExtraDraw = executeCard(p1Card, p1, p2, 'أنت');
    if (!p2Frozen && actualP2Card) p2ExtraDraw = executeCard(actualP2Card, p2, p1, p2NameLabel.innerText);

    // Move to discard
    if(p1Card) p1.discard.push(p1Card);
    if(actualP2Card) p2.discard.push(actualP2Card);

    updateBattleUI();
    checkGameOver();

    if(p1.hp > 0 && p2.hp > 0) {
        setTimeout(() => {
            renderActiveCard('p1-active-card', null);
            renderActiveCard('p2-active-card', null);
            
            // Draw for next turn
            if(p1.hand.length === 0) drawCard(p1);
            if(p2.hand.length === 0) drawCard(p2);
            
            if(p1ExtraDraw) drawCard(p1);
            if(p2ExtraDraw) drawCard(p2);

            updateBattleUI();
            document.getElementById('p1-hand').style.pointerEvents = 'auto';
            if (activeMode === 'local2p') document.getElementById('p2-hand').style.pointerEvents = 'auto';
            isResolvingTurn = false;
        }, 1500);
    }
}

function processStatus(player) {
    if(player.status.fire > 0) {
        let dmg = 5;
        player.hp -= dmg;
        player.status.fire--;
        logBattle(`🔥 حرق! ${dmg} ضرر.`);
    }
}

function executeCard(card, attacker, defender, name) {
    let extraDraw = false;
    let defAmount = defender.status.defense || 0;
    let poisonMod = attacker.status.poison > 0 ? 0.5 : 1; // 50% damage reduction if poisoned

    switch(card.type) {
        case 'attack':
            let dmg = (card.level * 4) * poisonMod;
            if(defender.status.reflect > 0) {
                logBattle(`${name} هاجم لكن الدرع العاكس صد الضرر وعكسه!`);
                attacker.hp -= dmg;
                defender.status.reflect--;
            } else {
                let actualDmg = Math.max(0, dmg - defAmount);
                defender.hp -= actualDmg;
                logBattle(`⚔️ ${name} سبب ${actualDmg} ضرر!`);
                if(defAmount > 0) defender.status.defense--;
            }
            break;
        case 'defense':
            attacker.status.defense = card.level * 3;
            logBattle(`🛡️ ${name} زاد دفاعه بمقدار ${attacker.status.defense}`);
            break;
        case 'fire':
            defender.status.fire = card.level;
            logBattle(`🔥 ${name} أشعل النار في الخصم لـ ${card.level} جولات!`);
            break;
        case 'poison':
            defender.status.poison = card.level;
            logBattle(`☠️ ${name} سمم الخصم! هجومه سيقل لـ ${card.level} جولات.`);
            break;
        case 'freeze':
            // Level 1-4: 1 turn freeze, Level 5-9: 2 turns freeze
            defender.status.freeze = card.level >= 5 ? 2 : 1;
            logBattle(`❄️ ${name} جمد الخصم!`);
            break;
        case 'reflect':
            attacker.status.reflect = Math.ceil(card.level / 3);
            logBattle(`🪞 ${name} قام بتفعيل درع عاكس!`);
            break;
        case 'heal':
            let heal = card.level * 5;
            attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
            logBattle(`💚 ${name} استرجع ${heal} نقطة صحة.`);
            break;
        case 'lightning':
            if (Math.random() <= 0.7) {
                let lDmg = (card.level * 7) * poisonMod;
                if(defender.status.reflect > 0) {
                    attacker.hp -= lDmg;
                    defender.status.reflect--;
                    logBattle(`⚡ البرق انعكس على ${name}!`);
                } else {
                    let actualL = Math.max(0, lDmg - defAmount);
                    defender.hp -= actualL;
                    logBattle(`⚡ ضربة برق ساحقة من ${name} بـ ${actualL} ضرر!`);
                    if(defAmount > 0) defender.status.defense--;
                }
            } else {
                logBattle(`⚡ أخطأ ${name} في توجيه البرق!`);
            }
            break;
        case 'draw':
            logBattle(`🎴 ${name} سيسحب بطاقة إضافية!`);
            extraDraw = true;
            break;
    }
    
    // Reduce poison duration
    if (attacker.status.poison > 0) attacker.status.poison--;

    return extraDraw;
}

function checkGameOver() {
    updateBattleUI();
    if(p1.hp <= 0 && p2.hp <= 0) {
        showGameOver('التعادل!');
    } else if (p2.hp <= 0) {
        showGameOver('لقد فزت! 🏆');
    } else if (p1.hp <= 0) {
        showGameOver('لقد خسرت 💀');
    }
}

function showGameOver(title) {
    gameOverScreen.classList.remove('hidden');
    document.getElementById('result-title').innerText = title;
}

document.getElementById('rematch-btn').addEventListener('click', () => {
    gameOverScreen.classList.add('hidden');
    startBattle();
});
document.getElementById('rebuild-btn').addEventListener('click', () => {
    location.reload();
});

// Start App
initDeckBuilder();
