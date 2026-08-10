const $ = id => document.getElementById(id);
const showScreen = id => {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $(id).classList.add('active');
};

// Word pools categorized by difficulty / character count
const EASY_WORDS = [
    "شمس", "قمر", "نجم", "سماء", "أرض", "بحر", "نهر", "جبل", "بيت", "باب",
    "شاي", "ماء", "خبز", "عسل", "يوم", "سنة", "عقد", "فصل", "أسد", "فيل",
    "كلب", "قطة", "موز", "تمر", "تين", "خوخ", "ورد", "زهر", "نمل", "صقر"
];

const MEDIUM_WORDS = [
    "شجرة", "زهرة", "حصان", "بقرة", "غزال", "نافذة", "غرفة", "مطبخ", "حديقة",
    "أرضية", "جدار", "كتاب", "دفتر", "طالب", "ورقة", "تفاحة", "برتقال", "قهوة",
    "عصير", "حليب", "دقيقة", "ثانية", "أسبوع", "أحمر", "أزرق", "أخضر", "أصفر", "أسود", "أبيض", "وردي"
];

const HARD_WORDS = [
    "عصفور", "طائرة", "سفينة", "دراجة", "طريق", "سبورة", "حقيبة", "بطيخ", "مانجو",
    "رمان", "بنفسجي", "رمادي", "محطة", "سيارة", "معلم", "مدرسة", "دباب", "قطار"
];

// --- WEB AUDIO API SYNTHESIZER ---
let audioCtx = null;
function getAudioContext() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
}

function playSound(type) {
    try {
        const c = getAudioContext();
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.connect(gain);
        gain.connect(c.destination);

        if (type === 'type') {
            osc.frequency.setValueAtTime(600, c.currentTime);
            osc.frequency.exponentialRampToValueAtTime(900, c.currentTime + 0.05);
            gain.gain.setValueAtTime(0.15, c.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.05);
            osc.start(); osc.stop(c.currentTime + 0.05);
        } else if (type === 'destroy') {
            osc.frequency.setValueAtTime(523.25, c.currentTime);
            osc.frequency.setValueAtTime(783.99, c.currentTime + 0.08);
            gain.gain.setValueAtTime(0.2, c.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.15);
            osc.start(); osc.stop(c.currentTime + 0.15);
        } else if (type === 'levelup') {
            const notes = [523.25, 659.25, 783.99, 1046.50];
            notes.forEach((f, i) => {
                const o = c.createOscillator();
                const g = c.createGain();
                o.frequency.value = f;
                g.gain.setValueAtTime(0.2, c.currentTime + i * 0.08);
                g.gain.exponentialRampToValueAtTime(0.01, c.currentTime + i * 0.08 + 0.18);
                o.connect(g); g.connect(c.destination);
                o.start(c.currentTime + i * 0.08);
                o.stop(c.currentTime + i * 0.08 + 0.18);
            });
        } else if (type === 'damage') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, c.currentTime);
            osc.frequency.linearRampToValueAtTime(50, c.currentTime + 0.2);
            gain.gain.setValueAtTime(0.3, c.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.2);
            osc.start(); osc.stop(c.currentTime + 0.2);
        }
    } catch(e) {}
}

let isPlaying = false;
let score = 0;
let lives = 3;
let activeWords = [];
let gameLoopInterval = null;
let spawnInterval = null;
let currentTargetId = null;

// Stage / Level Progression Config
let currentLevel = 1;
let levelScore = 0;
let targetWordsForLevel = 5;
let maxActiveWordsForLevel = 2; // Start with max 2 words on screen
let baseSpeed = 0.75;
let spawnRate = 3200;

const gameArea = $('game-area');
const inputField = $('type-input');

$('start-btn').onclick = initGame;
$('restart-btn').onclick = initGame;

function initGame() {
    isPlaying = true;
    score = 0;
    lives = 3;
    activeWords = [];
    currentTargetId = null;
    
    // Level 1 Initial Setup
    currentLevel = 1;
    levelScore = 0;
    targetWordsForLevel = 5;
    maxActiveWordsForLevel = 2; // Few words at the start
    baseSpeed = 0.75;
    spawnRate = 3200;
    
    $('score').innerText = score;
    updateLevelUI();
    updateLives();
    gameArea.innerHTML = '';
    inputField.value = '';
    
    showScreen('game-screen');
    inputField.focus();
    
    if (window.parent) window.parent.postMessage({ type: 'ARCADE_GAME_START', gameId: 'typing-defense' }, '*');
    
    if (gameLoopInterval) clearInterval(gameLoopInterval);
    gameLoopInterval = setInterval(gameLoop, 50);
    
    scheduleNextSpawn();
}

function updateLevelUI() {
    $('level-num').innerText = currentLevel;
    $('level-progress').innerText = `${levelScore}/${targetWordsForLevel}`;
}

function scheduleNextSpawn() {
    if (!isPlaying) return;
    spawnWord();
    if (spawnInterval) clearTimeout(spawnInterval);
    spawnInterval = setTimeout(scheduleNextSpawn, spawnRate);
}

function getRandomWordForLevel() {
    if (currentLevel === 1) {
        return EASY_WORDS[Math.floor(Math.random() * EASY_WORDS.length)];
    } else if (currentLevel <= 3) {
        const pool = [...EASY_WORDS, ...MEDIUM_WORDS];
        return pool[Math.floor(Math.random() * pool.length)];
    } else {
        const pool = [...MEDIUM_WORDS, ...HARD_WORDS];
        return pool[Math.floor(Math.random() * pool.length)];
    }
}

function spawnWord() {
    if (!isPlaying) return;
    
    // Strictly cap the maximum number of simultaneous words based on current level!
    if (activeWords.length >= maxActiveWordsForLevel) return;

    const text = getRandomWordForLevel();
    const id = 'word_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    
    const el = document.createElement('div');
    el.className = 'word-entity';
    el.id = id;
    
    el.innerHTML = `<span class="typed"></span><span class="untyped">${text}</span>`;
    
    // Random horizontal position
    const maxWidth = gameArea.clientWidth - 110;
    const x = Math.max(20, Math.random() * maxWidth);
    
    el.style.left = x + 'px';
    el.style.top = '-50px';
    
    gameArea.appendChild(el);
    
    activeWords.push({
        id: id,
        text: text,
        typedIndex: 0,
        el: el,
        y: -50,
        speed: baseSpeed + (Math.random() * 0.3)
    });
}

function gameLoop() {
    if (!isPlaying) return;
    
    const areaHeight = gameArea.clientHeight;
    
    // Move words
    for (let i = activeWords.length - 1; i >= 0; i--) {
        let w = activeWords[i];
        w.y += w.speed;
        w.el.style.top = w.y + 'px';
        
        // Reached bottom
        if (w.y > areaHeight - 35) {
            damageBase();
            gameArea.removeChild(w.el);
            activeWords.splice(i, 1);
            if (currentTargetId === w.id) {
                currentTargetId = null;
                inputField.value = '';
            }
        }
    }
}

inputField.addEventListener('input', (e) => {
    if (!isPlaying) return;
    const currentInput = inputField.value.trim();
    
    // If no target, find one that starts with the input
    if (!currentTargetId && currentInput.length > 0) {
        let possibleTargets = activeWords.filter(w => w.text.startsWith(currentInput));
        if (possibleTargets.length > 0) {
            // Pick lowest word on screen
            possibleTargets.sort((a,b) => b.y - a.y);
            currentTargetId = possibleTargets[0].id;
        } else {
            // Wrong starting input
            inputField.value = '';
            return;
        }
    }
    
    if (currentTargetId) {
        let targetWordIndex = activeWords.findIndex(w => w.id === currentTargetId);
        
        if (targetWordIndex === -1) {
            currentTargetId = null;
            inputField.value = '';
            return;
        }
        
        let targetWord = activeWords[targetWordIndex];
        
        if (targetWord.text.startsWith(currentInput)) {
            playSound('type');
            targetWord.el.classList.add('targeted');
            targetWord.el.innerHTML = `<span class="typed">${currentInput}</span><span class="untyped">${targetWord.text.substring(currentInput.length)}</span>`;
            
            // Finished word?
            if (currentInput === targetWord.text) {
                destroyWord(targetWordIndex);
            }
        } else {
            // Typo
            inputField.value = currentInput.slice(0, -1);
            $('game-screen').classList.add('shake');
            setTimeout(() => $('game-screen').classList.remove('shake'), 300);
        }
    }
    
    // Reset targeted styles for non-targets
    activeWords.forEach(w => {
        if (w.id !== currentTargetId) {
            w.el.classList.remove('targeted');
            w.el.innerHTML = `<span class="typed"></span><span class="untyped">${w.text}</span>`;
        }
    });
});

function destroyWord(index) {
    let w = activeWords[index];
    playSound('destroy');
    gameArea.removeChild(w.el);
    activeWords.splice(index, 1);
    
    currentTargetId = null;
    inputField.value = '';
    
    score++;
    levelScore++;
    $('score').innerText = score;
    updateLevelUI();
    
    // Check Level Advancement
    if (levelScore >= targetWordsForLevel) {
        advanceLevel();
    }
}

function advanceLevel() {
    currentLevel++;
    levelScore = 0;
    playSound('levelup');
    
    // Increase level parameters smoothly
    targetWordsForLevel = Math.min(25, 5 + (currentLevel - 1) * 3);
    maxActiveWordsForLevel = Math.min(6, 2 + Math.floor((currentLevel - 1) / 2)); // 2 -> 3 -> 3 -> 4 -> 4 -> 5...
    baseSpeed = Math.min(2.5, 0.75 + (currentLevel - 1) * 0.12);
    spawnRate = Math.max(1200, 3200 - (currentLevel - 1) * 350);
    
    updateLevelUI();
    showToast(`🎉 أحسنت! انتقلت للمرحلة ${currentLevel}! 🚀 (حد الكلمات: ${maxActiveWordsForLevel})`);
}

function damageBase() {
    playSound('damage');
    lives--;
    updateLives();
    
    $('game-screen').classList.add('shake');
    setTimeout(() => $('game-screen').classList.remove('shake'), 300);
    
    if (lives <= 0) {
        gameOver();
    }
}

function updateLives() {
    $('lives').innerText = '❤️'.repeat(lives) + '🖤'.repeat(3 - lives);
}

function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'level-toast';
    t.innerText = msg;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('show'), 50);
    setTimeout(() => {
        t.classList.remove('show');
        setTimeout(() => document.body.removeChild(t), 300);
    }, 2500);
}

function gameOver() {
    isPlaying = false;
    if (gameLoopInterval) clearInterval(gameLoopInterval);
    if (spawnInterval) clearTimeout(spawnInterval);
    
    $('final-score').innerText = score;
    $('final-level').innerText = currentLevel;
    showScreen('game-over-screen');
    
    if (window.parent) window.parent.postMessage({ type: 'ARCADE_GAME_OVER', winner: 'Score: ' + score, gameId: 'typing-defense' }, '*');
}

// Keep focus on input field continuously
document.addEventListener('click', () => {
    if (isPlaying) inputField.focus();
});
