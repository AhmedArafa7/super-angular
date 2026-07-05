const $ = id => document.getElementById(id);
const showScreen = id => {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $(id).classList.add('active');
};

const WORDS = [
    "شمس", "قمر", "نجم", "سماء", "أرض", "بحر", "نهر", "جبل", "شجرة", "زهرة",
    "عصفور", "قطة", "كلب", "أسد", "فيل", "حصان", "بقرة", "غزال", "نمر", "فهد",
    "سيارة", "قطار", "طائرة", "سفينة", "دراجة", "طريق", "جسر", "مطار", "ميناء", "محطة",
    "بيت", "باب", "نافذة", "غرفة", "مطبخ", "حديقة", "سور", "سقف", "أرضية", "جدار",
    "كتاب", "قلم", "دفتر", "مدرسة", "معلم", "طالب", "سبورة", "مكتب", "حقيبة", "ورقة",
    "تفاحة", "موز", "برتقال", "عنب", "بطيخ", "مانجو", "تمر", "تين", "رمان", "خوخ",
    "قهوة", "شاي", "عصير", "حليب", "ماء", "خبز", "جبن", "عسل", "زبدة", "مربى",
    "ساعة", "يوم", "شهر", "سنة", "دقيقة", "ثانية", "أسبوع", "قرن", "عقد", "فصل",
    "أحمر", "أزرق", "أخضر", "أصفر", "أسود", "أبيض", "وردي", "بنفسجي", "بني", "رمادي"
];

let isPlaying = false;
let score = 0;
let lives = 3;
let activeWords = [];
let gameLoopInterval = null;
let spawnInterval = null;
let currentTargetId = null;
let baseSpeed = 1.0;
let spawnRate = 2000;

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
    baseSpeed = 1.0;
    spawnRate = 2000;
    
    $('score').innerText = score;
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

function scheduleNextSpawn() {
    if (!isPlaying) return;
    spawnWord();
    if (spawnInterval) clearTimeout(spawnInterval);
    spawnInterval = setTimeout(scheduleNextSpawn, spawnRate);
}

function spawnWord() {
    const text = WORDS[Math.floor(Math.random() * WORDS.length)];
    const id = 'word_' + Date.now() + '_' + Math.floor(Math.random()*1000);
    
    const el = document.createElement('div');
    el.className = 'word-entity';
    el.id = id;
    
    // Render word with span for typed part
    el.innerHTML = `<span class="typed"></span><span class="untyped">${text}</span>`;
    
    // Random horizontal position
    const maxWidth = gameArea.clientWidth - 100;
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
        speed: baseSpeed + Math.random() * 0.5
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
        if (w.y > areaHeight - 30) {
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
    const currentInput = inputField.value;
    
    // If no target, find one that starts with the input
    if (!currentTargetId && currentInput.length > 0) {
        let possibleTargets = activeWords.filter(w => w.text.startsWith(currentInput));
        if (possibleTargets.length > 0) {
            // Pick lowest word
            possibleTargets.sort((a,b) => b.y - a.y);
            currentTargetId = possibleTargets[0].id;
        } else {
            // Wrong input
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
            // Update visuals
            targetWord.el.classList.add('targeted');
            targetWord.el.innerHTML = `<span class="typed">${currentInput}</span><span class="untyped">${targetWord.text.substring(currentInput.length)}</span>`;
            
            // Finished word?
            if (currentInput === targetWord.text) {
                destroyWord(targetWordIndex);
            }
        } else {
            // Typo, prevent input (or reset)
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
    gameArea.removeChild(w.el);
    activeWords.splice(index, 1);
    
    currentTargetId = null;
    inputField.value = '';
    
    score++;
    $('score').innerText = score;
    
    // Increase difficulty
    if (score % 5 === 0) {
        baseSpeed += 0.2;
        spawnRate = Math.max(500, spawnRate - 200);
    }
}

function damageBase() {
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

function gameOver() {
    isPlaying = false;
    clearInterval(gameLoopInterval);
    if (spawnInterval) clearTimeout(spawnInterval);
    
    $('final-score').innerText = score;
    showScreen('game-over-screen');
    
    if (window.parent) window.parent.postMessage({ type: 'ARCADE_GAME_OVER', winner: 'Score: ' + score, gameId: 'typing-defense' }, '*');
}

// Keep focus on input
document.addEventListener('click', () => {
    if (isPlaying) inputField.focus();
});
