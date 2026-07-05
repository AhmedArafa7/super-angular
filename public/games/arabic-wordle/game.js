const WORDS = [
    "تفاحة", "طاولة", "كتابة", "مدرسة", "سفينة", "طائرة", "حديقة", "نافذة", "خزانة", "سيارة",
    "ملعقة", "شوكة", "صحيفة", "خريطة", "حقيبة", "سحابة", "مدينة", "طبيعة", "طيارة", "رياضة",
    "سلامة", "نهاية", "بداية", "سعيدة", "جميلة", "حزينة", "كبيرة", "صغيرة", "جديدة", "قديمة",
    "عالية", "غالية", "سريعة", "بطيئة", "طويلة", "قصيرة", "قوية", "ضعيفة", "سمينة", "نحيفة",
    "نظيفة", "وسخة", "واسعة", "ضيقة", "عميقة", "شريكة", "طريقة", "دقيقة", "حقيقة", "صديقة",
    "معلمة", "طالبة", "طبيبة", "مريضة", "ممرضة", "مهندسة", "مديرة", "موظفة", "عاملة", "كاتبة",
    "قارئة", "شاعرة", "رسامة", "لاعبة", "عالمة", "باحثة", "مخترع", "فنانة", "ممثلة", "مغنية",
    "عائلة", "مكتبة", "رسالة", "رحلة", "سياحة", "تجارة", "صناعة", "زراعة", "دراسة", "قراءة",
    "الكتاب", "العلم", "العمل", "الوطن", "الشمس", "القمر", "النجم", "البحر", "النهر", "الجبل",
    "الورد", "الشجر", "الطير", "الأسد", "النمر", "الدب", "الفيل", "الجمل", "الفرس", "الكلب",
    "القطة", "الفأر", "السمك", "النحل", "النمل", "العسل", "اللبن", "الخبز", "التمر", "التين",
    "العنب", "الخوخ", "الرمان", "الموز", "الجزر", "البصل", "الثوم", "الملح", "الماء", "النار"
]; // Note: in real wordle, AL (ال) might be weird, but we accept 5 letters. Let's filter to exactly 5 letters.

const VALID_WORDS = WORDS.filter(w => w.length === 5);

let targetWord = VALID_WORDS[Math.floor(Math.random() * VALID_WORDS.length)];
console.log("Target (cheat):", targetWord);

const WORD_LENGTH = 5;
const MAX_GUESSES = 6;
let currentGuess = [];
let currentRow = 0;
let gameOver = false;

const board = document.getElementById('board');
const keyboard = document.getElementById('keyboard');
const toast = document.getElementById('toast');

const keys = [
    ['ض', 'ص', 'ث', 'ق', 'ف', 'غ', 'ع', 'ه', 'خ', 'ح', 'ج', 'د'],
    ['ش', 'س', 'ي', 'ب', 'ل', 'ا', 'أ', 'ت', 'ن', 'م', 'ك', 'ط'],
    ['ENTER', 'ئ', 'ء', 'ؤ', 'ر', 'لا', 'ى', 'ة', 'و', 'ز', 'ظ', 'BACKSPACE']
];

function initGame() {
    // Build board
    for (let i = 0; i < MAX_GUESSES; i++) {
        const row = document.createElement('div');
        row.className = 'row';
        row.id = `row-${i}`;
        for (let j = 0; j < WORD_LENGTH; j++) {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.id = `tile-${i}-${j}`;
            tile.setAttribute('data-state', 'empty');
            row.appendChild(tile);
        }
        board.appendChild(row);
    }

    // Build keyboard
    keys.forEach(rowKeys => {
        const row = document.createElement('div');
        row.className = 'keyboard-row';
        rowKeys.forEach(key => {
            const btn = document.createElement('button');
            btn.className = 'key';
            if (key === 'ENTER') {
                btn.textContent = 'إدخال';
                btn.classList.add('large');
                btn.onclick = submitGuess;
            } else if (key === 'BACKSPACE') {
                btn.textContent = '⌫';
                btn.classList.add('large');
                btn.onclick = deleteLetter;
            } else {
                btn.textContent = key;
                btn.id = `key-${key}`;
                btn.onclick = () => addLetter(key);
            }
            row.appendChild(btn);
        });
        keyboard.appendChild(row);
    });
}

function addLetter(letter) {
    if (currentGuess.length < WORD_LENGTH && !gameOver) {
        currentGuess.push(letter);
        updateBoard();
    }
}

function deleteLetter() {
    if (currentGuess.length > 0 && !gameOver) {
        currentGuess.pop();
        updateBoard();
    }
}

function updateBoard() {
    const row = document.getElementById(`row-${currentRow}`);
    for (let i = 0; i < WORD_LENGTH; i++) {
        const tile = row.children[i];
        tile.textContent = currentGuess[i] || '';
        tile.setAttribute('data-state', currentGuess[i] ? 'tbd' : 'empty');
    }
}

function submitGuess() {
    if (gameOver) return;
    if (currentGuess.length !== WORD_LENGTH) {
        showToast('كلمة قصيرة جداً');
        shakeRow();
        return;
    }

    const guessStr = currentGuess.join('');
    
    // In a real game we check against dictionary. Here we allow any 5 letters.
    
    checkGuess();
}

function checkGuess() {
    const row = document.getElementById(`row-${currentRow}`);
    let targetWordArr = targetWord.split('');
    let guessArr = [...currentGuess];
    let states = Array(WORD_LENGTH).fill('absent');

    // First pass: find correct letters
    for (let i = 0; i < WORD_LENGTH; i++) {
        if (guessArr[i] === targetWordArr[i]) {
            states[i] = 'correct';
            targetWordArr[i] = null; // consume
            guessArr[i] = null;
        }
    }

    // Second pass: find present letters
    for (let i = 0; i < WORD_LENGTH; i++) {
        if (guessArr[i] !== null) {
            const index = targetWordArr.indexOf(guessArr[i]);
            if (index !== -1) {
                states[i] = 'present';
                targetWordArr[index] = null;
            }
        }
    }

    // Apply states
    for (let i = 0; i < WORD_LENGTH; i++) {
        const tile = row.children[i];
        const letter = currentGuess[i];
        
        // Add a slight delay for animation
        setTimeout(() => {
            tile.setAttribute('data-state', states[i]);
            updateKeyboard(letter, states[i]);
        }, i * 300);
    }

    setTimeout(() => {
        if (currentGuess.join('') === targetWord) {
            showToast('أحسنت! 🎉');
            gameOver = true;
            setTimeout(() => showModal('فزت!', `الكلمة هي: ${targetWord}`), 1000);
            if (window.parent) window.parent.postMessage({ type: 'ARCADE_GAME_OVER', winner: 'Victory', gameId: 'arabic-wordle' }, '*');
        } else {
            currentRow++;
            currentGuess = [];
            if (currentRow >= MAX_GUESSES) {
                gameOver = true;
                setTimeout(() => showModal('حظ أوفر', `الكلمة كانت: ${targetWord}`), 1000);
                if (window.parent) window.parent.postMessage({ type: 'ARCADE_GAME_OVER', winner: 'Defeat', gameId: 'arabic-wordle' }, '*');
            }
        }
    }, WORD_LENGTH * 300 + 100);
}

function updateKeyboard(letter, state) {
    const key = document.getElementById(`key-${letter}`);
    if (!key) return;
    
    const currentState = key.getAttribute('data-state');
    if (currentState === 'correct') return; // don't downgrade
    if (currentState === 'present' && state === 'absent') return;
    
    key.setAttribute('data-state', state);
}

function shakeRow() {
    const row = document.getElementById(`row-${currentRow}`);
    row.classList.remove('shake');
    void row.offsetWidth; // trigger reflow
    row.classList.add('shake');
}

function showToast(msg) {
    toast.textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 2000);
}

function showModal(title, msg) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-content').textContent = msg;
    document.getElementById('modal-overlay').classList.remove('hidden');
    document.getElementById('play-again-btn').style.display = 'inline-block';
}

document.getElementById('close-modal').onclick = () => {
    document.getElementById('modal-overlay').classList.add('hidden');
};

document.getElementById('play-again-btn').onclick = () => {
    location.reload();
};

document.getElementById('stats-btn').onclick = () => {
    showModal('الإحصائيات', 'غير متوفرة حالياً في النسخة البسيطة.');
    document.getElementById('play-again-btn').style.display = 'none';
};

// Hardware Keyboard support
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitGuess();
    else if (e.key === 'Backspace') deleteLetter();
    else {
        // Arabic characters range roughly
        if (/[\u0600-\u06FF]/.test(e.key) && e.key.length === 1) {
            addLetter(e.key);
        }
    }
});

// Start
initGame();
if (window.parent) window.parent.postMessage({ type: 'ARCADE_GAME_START', gameId: 'arabic-wordle' }, '*');
