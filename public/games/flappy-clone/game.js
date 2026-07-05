const $ = id => document.getElementById(id);
const showScreen = id => {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $(id).classList.add('active');
};

const canvas = $('game-canvas');
const ctx = canvas.getContext('2d');

let cw, ch;
function resize() {
    cw = window.innerWidth;
    ch = window.innerHeight;
    canvas.width = cw;
    canvas.height = ch;
}
window.addEventListener('resize', resize);
resize();

// Game State
let isPlaying = false;
let score = 0;
let frameCount = 0;

const GRAVITY = 0.5;
const JUMP = -8;
const SPEED = 4;
const PIPE_WIDTH = 60;
const PIPE_GAP = 180;

let bird = { x: 50, y: 150, vy: 0, size: 20 };
let pipes = [];

$('start-btn').onclick = initGame;
$('restart-btn').onclick = initGame;

function initGame() {
    score = 0;
    frameCount = 0;
    bird = { x: 50, y: ch / 2, vy: 0, size: 20 };
    pipes = [];
    isPlaying = true;
    $('score').innerText = score;
    showScreen('game-screen');
    
    if (window.parent) window.parent.postMessage({ type: 'ARCADE_GAME_START', gameId: 'flappy-clone' }, '*');
    
    requestAnimationFrame(gameLoop);
}

function jump() {
    if (!isPlaying) return;
    bird.vy = JUMP;
}

window.addEventListener('keydown', e => {
    if (e.code === 'Space' && isPlaying) jump();
});
canvas.addEventListener('mousedown', jump);
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Prevent double firing
    jump();
});

function spawnPipe() {
    let minPipeHeight = 50;
    let maxPipeHeight = ch - PIPE_GAP - minPipeHeight - 100; // 100 for ground
    let topHeight = Math.floor(Math.random() * (maxPipeHeight - minPipeHeight + 1) + minPipeHeight);
    
    pipes.push({
        x: cw,
        topHeight: topHeight,
        passed: false
    });
}

function gameOver() {
    isPlaying = false;
    $('final-score').innerText = score;
    showScreen('game-over-screen');
    if (window.parent) window.parent.postMessage({ type: 'ARCADE_GAME_OVER', winner: 'Score: ' + score, gameId: 'flappy-clone' }, '*');
}

function drawBird() {
    ctx.save();
    ctx.translate(bird.x, bird.y);
    
    // Rotate bird based on velocity
    let angle = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (bird.vy * 0.1)));
    ctx.rotate(angle);
    
    // Draw Monkey Emoji
    ctx.font = "40px Arial";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🐒', 0, 0);
    
    ctx.restore();
}

function drawPipes() {
    ctx.fillStyle = '#22c55e'; // Green pipes
    
    pipes.forEach(p => {
        // Top pipe
        ctx.fillRect(p.x, 0, PIPE_WIDTH, p.topHeight);
        ctx.strokeRect(p.x, 0, PIPE_WIDTH, p.topHeight);
        // Top pipe cap
        ctx.fillRect(p.x - 5, p.topHeight - 20, PIPE_WIDTH + 10, 20);
        
        // Bottom pipe
        let bottomY = p.topHeight + PIPE_GAP;
        let bottomHeight = ch - bottomY;
        ctx.fillRect(p.x, bottomY, PIPE_WIDTH, bottomHeight);
        ctx.strokeRect(p.x, bottomY, PIPE_WIDTH, bottomHeight);
        // Bottom pipe cap
        ctx.fillRect(p.x - 5, bottomY, PIPE_WIDTH + 10, 20);
    });
}

function gameLoop() {
    if (!isPlaying) return;
    
    // Clear
    ctx.clearRect(0, 0, cw, ch);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#166534';
    
    // Update Bird
    bird.vy += GRAVITY;
    bird.y += bird.vy;
    
    // Ground / Ceiling Collision
    if (bird.y + bird.size >= ch || bird.y - bird.size <= 0) {
        gameOver();
        return;
    }
    
    // Pipes
    if (frameCount % 90 === 0) spawnPipe();
    
    for (let i = pipes.length - 1; i >= 0; i--) {
        let p = pipes[i];
        p.x -= SPEED;
        
        // Collision
        // Bird rect approx:
        let bx = bird.x - 15;
        let by = bird.y - 15;
        let bw = 30;
        let bh = 30;
        
        if (
            bx + bw > p.x && bx < p.x + PIPE_WIDTH &&
            (by < p.topHeight || by + bh > p.topHeight + PIPE_GAP)
        ) {
            gameOver();
            return;
        }
        
        // Score
        if (p.x + PIPE_WIDTH < bird.x && !p.passed) {
            score++;
            $('score').innerText = score;
            p.passed = true;
        }
        
        if (p.x + PIPE_WIDTH < 0) {
            pipes.splice(i, 1);
        }
    }
    
    // Draw
    drawPipes();
    
    // Ground
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(0, ch - 50, cw, 50);
    
    drawBird();
    
    frameCount++;
    requestAnimationFrame(gameLoop);
}
