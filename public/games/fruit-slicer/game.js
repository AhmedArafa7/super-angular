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
let lives = 3;
let fruits = [];
let particles = [];
let swipeTrail = [];

const GRAVITY = 0.2;
const TYPES = ['🍉', '🍎', '🍊', '🍍', '💣'];

// Mouse / Touch
let isPointerDown = false;

function handlePointerDown(e) {
    isPointerDown = true;
    swipeTrail = [];
    addTrailPoint(e);
}

function handlePointerMove(e) {
    if (!isPointerDown || !isPlaying) return;
    addTrailPoint(e);
    checkSlice(e);
}

function handlePointerUp() {
    isPointerDown = false;
    setTimeout(() => { swipeTrail = []; }, 100);
}

function addTrailPoint(e) {
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    swipeTrail.push({x, y, age: 0});
    if (swipeTrail.length > 10) swipeTrail.shift();
}

canvas.addEventListener('mousedown', handlePointerDown);
canvas.addEventListener('mousemove', handlePointerMove);
window.addEventListener('mouseup', handlePointerUp);

canvas.addEventListener('touchstart', handlePointerDown);
canvas.addEventListener('touchmove', handlePointerMove);
window.addEventListener('touchend', handlePointerUp);

$('start-btn').onclick = initGame;
$('restart-btn').onclick = initGame;

function initGame() {
    score = 0;
    lives = 3;
    fruits = [];
    particles = [];
    isPlaying = true;
    $('score').innerText = score;
    updateLivesDisplay();
    showScreen('game-screen');
    
    if (window.parent) window.parent.postMessage({ type: 'ARCADE_GAME_START', gameId: 'fruit-slicer' }, '*');
    
    requestAnimationFrame(gameLoop);
}

function spawnFruit() {
    if (!isPlaying) return;
    if (Math.random() > 0.95) { // 5% chance per frame to spawn
        const isBomb = Math.random() > 0.8;
        const type = isBomb ? '💣' : TYPES[Math.floor(Math.random() * (TYPES.length - 1))];
        
        fruits.push({
            x: Math.random() * (cw - 100) + 50,
            y: ch + 50,
            vx: (Math.random() - 0.5) * 6,
            vy: -10 - Math.random() * 5,
            type: type,
            isBomb: isBomb,
            size: 40,
            angle: 0,
            vAngle: (Math.random() - 0.5) * 0.2,
            sliced: false
        });
    }
}

function checkSlice(e) {
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    
    for (let i = fruits.length - 1; i >= 0; i--) {
        const f = fruits[i];
        if (!f.sliced) {
            const dist = Math.hypot(f.x - x, f.y - y);
            if (dist < f.size) {
                f.sliced = true;
                if (f.isBomb) {
                    loseLife();
                    createParticles(f.x, f.y, '#ef4444', true);
                } else {
                    score++;
                    $('score').innerText = score;
                    createParticles(f.x, f.y, getFruitColor(f.type));
                }
            }
        }
    }
}

function getFruitColor(type) {
    if (type === '🍉') return '#ef4444';
    if (type === '🍎') return '#dc2626';
    if (type === '🍊') return '#f97316';
    if (type === '🍍') return '#facc15';
    return '#fff';
}

function createParticles(x, y, color, isExplosion = false) {
    const count = isExplosion ? 30 : 10;
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            life: 1,
            color: color
        });
    }
}

function loseLife() {
    lives--;
    updateLivesDisplay();
    if (lives <= 0) {
        gameOver();
    }
}

function updateLivesDisplay() {
    $('lives').innerText = '❤️'.repeat(lives) + '🖤'.repeat(3 - lives);
}

function gameOver() {
    isPlaying = false;
    $('final-score').innerText = score;
    showScreen('game-over-screen');
    if (window.parent) window.parent.postMessage({ type: 'ARCADE_GAME_OVER', winner: 'Score: ' + score, gameId: 'fruit-slicer' }, '*');
}

function gameLoop() {
    if (!isPlaying) return;
    
    ctx.clearRect(0, 0, cw, ch);
    
    spawnFruit();
    
    // Update & Draw Fruits
    for (let i = fruits.length - 1; i >= 0; i--) {
        const f = fruits[i];
        f.x += f.vx;
        f.y += f.vy;
        f.vy += GRAVITY;
        f.angle += f.vAngle;
        
        if (f.y > ch + 100) {
            if (!f.isBomb && !f.sliced) loseLife(); // Missed a fruit
            fruits.splice(i, 1);
            continue;
        }
        
        if (!f.sliced) {
            ctx.save();
            ctx.translate(f.x, f.y);
            ctx.rotate(f.angle);
            ctx.font = f.size * 2 + "px Arial";
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(f.type, 0, 0);
            ctx.restore();
        } else {
            // Drop halves
            fruits.splice(i, 1);
        }
    }
    
    // Update & Draw Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += GRAVITY;
        p.life -= 0.02;
        
        if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
        }
        
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
    
    // Draw Swipe Trail
    if (swipeTrail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(swipeTrail[0].x, swipeTrail[0].y);
        for (let i = 1; i < swipeTrail.length; i++) {
            ctx.lineTo(swipeTrail[i].x, swipeTrail[i].y);
            swipeTrail[i].age++;
        }
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        
        // Remove old trail points
        if (swipeTrail[0].age > 5) swipeTrail.shift();
    }
    
    requestAnimationFrame(gameLoop);
}
