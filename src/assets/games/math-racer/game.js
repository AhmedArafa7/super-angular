const $ = id => document.getElementById(id);
const showScreen = id => {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $(id).classList.add('active');
};

let difficulty = 'easy';
document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        difficulty = btn.getAttribute('data-level');
    };
});

let isPlaying = false;
let timeLeft = 20;
let currentAnswer = 0;
let playerProgress = 0; // 0 to 100
let enemyProgress = 0;
let startTime = 0;
let gameLoopInterval = null;

const trackHeight = document.querySelector('.track-container').clientHeight;
const WIN_PROGRESS = 100;

$('start-btn').onclick = initGame;
$('restart-btn').onclick = initGame;

function initGame() {
    isPlaying = true;
    playerProgress = 0;
    enemyProgress = 0;
    $('player-car').style.bottom = '20px';
    $('enemy-car').style.bottom = '20px';
    $('feedback').innerText = '';
    $('answer').value = '';
    $('answer').focus();
    
    startTime = Date.now();
    showScreen('game-screen');
    
    if (window.parent) window.parent.postMessage({ type: 'ARCADE_GAME_START', gameId: 'math-racer' }, '*');
    
    generateEquation();
    
    if (gameLoopInterval) clearInterval(gameLoopInterval);
    gameLoopInterval = setInterval(gameLoop, 1000);
}

function generateEquation() {
    let a, b, op;
    if (difficulty === 'easy') {
        op = Math.random() > 0.5 ? '+' : '-';
        if (op === '+') {
            a = Math.floor(Math.random() * 20) + 1;
            b = Math.floor(Math.random() * 20) + 1;
            currentAnswer = a + b;
        } else {
            a = Math.floor(Math.random() * 20) + 10;
            b = Math.floor(Math.random() * a); // ensure positive
            currentAnswer = a - b;
        }
    } else {
        op = Math.random() > 0.5 ? '×' : '÷';
        if (op === '×') {
            a = Math.floor(Math.random() * 10) + 2;
            b = Math.floor(Math.random() * 10) + 2;
            currentAnswer = a * b;
        } else {
            b = Math.floor(Math.random() * 10) + 2;
            currentAnswer = Math.floor(Math.random() * 10) + 2;
            a = currentAnswer * b;
        }
    }
    
    $('equation').innerText = `${a} ${op} ${b} = ?`;
}

function submitAnswer() {
    if (!isPlaying) return;
    const val = parseInt($('answer').value);
    if (isNaN(val)) return;
    
    if (val === currentAnswer) {
        // Correct
        playerProgress += 10;
        let bonus = difficulty === 'easy' ? 2 : 4;
        timeLeft += bonus;
        $('feedback').innerText = `صحيح! +${bonus} ثانية 🚙`;
        $('feedback').className = 'feedback correct';
        $('answer').value = '';
        generateEquation();
    } else {
        // Wrong
        $('feedback').innerText = 'خطأ! ❌';
        // إعادة تفعيل الاهتزاز
        const feedback = $('feedback');
        feedback.className = 'feedback';
        void feedback.offsetWidth; // Force reflow
        feedback.className = 'feedback wrong';
        
        $('answer').value = '';
        // Penalty: car stops moving or goes back slightly
        playerProgress = Math.max(0, playerProgress - 5);
    }
    
    updateCars();
    checkWin();
    $('answer').focus();
}

$('submit-btn').onclick = submitAnswer;
$('answer').addEventListener('keydown', e => {
    if (e.key === 'Enter') submitAnswer();
});

function gameLoop() {
    if (!isPlaying) return;
    
    timeLeft--;
    $('timer-display').innerText = timeLeft;
    
    // Enemy moves automatically (with smart variance)
    let enemySpeed = (difficulty === 'easy' ? 4 : 7);
    if (Math.random() > 0.1) { // 10% chance to stop
         enemyProgress += enemySpeed * (0.8 + Math.random() * 0.4);
    }
    
    if (timeLeft <= 0) {
        isPlaying = false;
        checkWin(); // استدعاء checkWin
    }
    
    updateCars();
    checkWin();
}

function updateCars() {
    // 0 to 100% maps to bottom: 20px to bottom: calc(100% - 60px)
    $('player-car').style.bottom = `calc(20px + ${playerProgress}% - ${playerProgress * 0.8}px)`;
    $('enemy-car').style.bottom = `calc(20px + ${enemyProgress}% - ${enemyProgress * 0.8}px)`;
}

function checkWin() {
    if (playerProgress >= WIN_PROGRESS || enemyProgress >= WIN_PROGRESS) {
        isPlaying = false;
        clearInterval(gameLoopInterval);
        
        const timeTaken = ((Date.now() - startTime) / 1000).toFixed(1);
        $('final-time').innerText = timeTaken;
        
        if (playerProgress >= WIN_PROGRESS) {
            $('result-title').innerText = 'لقد فزت! 🎉🏆';
            $('result-title').style.color = '#10b981';
            if (window.parent) window.parent.postMessage({ type: 'ARCADE_GAME_OVER', winner: 'Victory', gameId: 'math-racer' }, '*');
        } else {
            $('result-title').innerText = 'لقد خسرت! 😔🚗';
            $('result-title').style.color = '#ef4444';
            if (window.parent) window.parent.postMessage({ type: 'ARCADE_GAME_OVER', winner: 'Defeat', gameId: 'math-racer' }, '*');
        }
        
        showScreen('game-over-screen');
    }
}
