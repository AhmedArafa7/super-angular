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

        if (type === 'slice') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, c.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1400, c.currentTime + 0.08);
            gain.gain.setValueAtTime(0.2, c.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.08);
            osc.start(); osc.stop(c.currentTime + 0.08);
        } else if (type === 'bomb') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(120, c.currentTime);
            osc.frequency.linearRampToValueAtTime(40, c.currentTime + 0.3);
            gain.gain.setValueAtTime(0.35, c.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.3);
            osc.start(); osc.stop(c.currentTime + 0.3);
        } else if (type === 'miss') {
            osc.frequency.setValueAtTime(300, c.currentTime);
            osc.frequency.linearRampToValueAtTime(150, c.currentTime + 0.15);
            gain.gain.setValueAtTime(0.15, c.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.15);
            osc.start(); osc.stop(c.currentTime + 0.15);
        }
    } catch(e) {}
}

// Game State
let isPlaying = false;
let score = 0;
let lives = 3;
let fruits = [];
let slicedHalves = [];
let particles = [];
let swipeTrail = [];

// Controlled Physics (Gentle & Smooth)
const GRAVITY = 0.14; // Slower, floating parabolic arc
const TYPES = ['🍉', '🍎', '🍊', '🍍', '🍓', '🥝'];

let lastSpawnTime = 0;
let nextSpawnDelay = 2200; // Controlled initial delay

// Mouse / Touch Swipe
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
    if (swipeTrail.length > 12) swipeTrail.shift();
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
    slicedHalves = [];
    particles = [];
    swipeTrail = [];
    isPlaying = true;
    lastSpawnTime = Date.now();
    nextSpawnDelay = 2000;
    
    $('score').innerText = score;
    updateLivesDisplay();
    showScreen('game-screen');
    
    if (window.parent) window.parent.postMessage({ type: 'ARCADE_GAME_START', gameId: 'fruit-slicer' }, '*');
    
    requestAnimationFrame(gameLoop);
}

// --- PACED ONE-BY-ONE SPAWNING ENGINE ---
function updateSpawning() {
    if (!isPlaying) return;
    const now = Date.now();

    // Determine max allowed active unsliced fruits based on progress
    let maxActiveFruits = 1;
    if (score >= 8 && score < 20) maxActiveFruits = 2;
    else if (score >= 20) maxActiveFruits = 3;

    // Count currently active (unsliced) fruits
    const activeCount = fruits.filter(f => !f.sliced).length;

    if (activeCount < maxActiveFruits && (now - lastSpawnTime > nextSpawnDelay)) {
        spawnSingleFruit();
        lastSpawnTime = now;
        
        // Paced next spawn delay
        if (score < 8) {
            nextSpawnDelay = 2200 + Math.random() * 800; // 2.2 - 3.0 sec (One by one)
        } else if (score < 20) {
            nextSpawnDelay = 1600 + Math.random() * 600;
        } else {
            nextSpawnDelay = 1200 + Math.random() * 500;
        }
    }
}

function spawnSingleFruit() {
    // Bombs only start appearing after score >= 4 to allow gentle start
    const allowBomb = score >= 4;
    const isBomb = allowBomb && (Math.random() < 0.22);
    const type = isBomb ? '💣' : TYPES[Math.floor(Math.random() * TYPES.length)];
    
    // Smooth launch velocity (gentle floating height)
    fruits.push({
        x: Math.random() * (cw - 140) + 70,
        y: ch + 40,
        vx: (Math.random() - 0.5) * 3.2, // Gentle horizontal movement
        vy: -7.0 - Math.random() * 1.5,   // Soft upward float
        type: type,
        isBomb: isBomb,
        size: 42,
        angle: 0,
        vAngle: (Math.random() - 0.5) * 0.1,
        sliced: false
    });
}

function checkSlice(e) {
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    
    for (let i = fruits.length - 1; i >= 0; i--) {
        const f = fruits[i];
        if (!f.sliced) {
            const dist = Math.hypot(f.x - x, f.y - y);
            if (dist < f.size + 10) {
                f.sliced = true;
                if (f.isBomb) {
                    playSound('bomb');
                    loseLife();
                    createParticles(f.x, f.y, '#ef4444', true);
                } else {
                    playSound('slice');
                    score++;
                    $('score').innerText = score;
                    createParticles(f.x, f.y, getFruitColor(f.type));
                    createFruitHalves(f);
                }
            }
        }
    }
}

function createFruitHalves(f) {
    // Left half
    slicedHalves.push({
        x: f.x - 10, y: f.y,
        vx: f.vx - 2.5, vy: f.vy - 1,
        type: f.type, angle: f.angle - 0.3, vAngle: -0.15,
        half: 'left'
    });
    // Right half
    slicedHalves.push({
        x: f.x + 10, y: f.y,
        vx: f.vx + 2.5, vy: f.vy - 1,
        type: f.type, angle: f.angle + 0.3, vAngle: 0.15,
        half: 'right'
    });
}

function getFruitColor(type) {
    if (type === '🍉') return '#ef4444';
    if (type === '🍎') return '#dc2626';
    if (type === '🍊') return '#f97316';
    if (type === '🍍') return '#facc15';
    if (type === '🍓') return '#f43f5e';
    if (type === '🥝') return '#84cc16';
    return '#ffffff';
}

function createParticles(x, y, color, isExplosion = false) {
    const count = isExplosion ? 25 : 12;
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * (isExplosion ? 12 : 8),
            vy: (Math.random() - 0.5) * (isExplosion ? 12 : 8),
            life: 1.0,
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

// --- MAIN GAME LOOP ---
function gameLoop() {
    if (!isPlaying) return;
    
    ctx.clearRect(0, 0, cw, ch);
    
    updateSpawning();
    
    // Update & Draw Fruits
    for (let i = fruits.length - 1; i >= 0; i--) {
        const f = fruits[i];
        f.x += f.vx;
        f.y += f.vy;
        f.vy += GRAVITY;
        f.angle += f.vAngle;
        
        // Check if fruit fell off bottom without being sliced
        if (f.y > ch + 60) {
            if (!f.isBomb && !f.sliced) {
                playSound('miss');
                loseLife(); // Missed a fruit
            }
            fruits.splice(i, 1);
            continue;
        }

        if (f.sliced) {
            fruits.splice(i, 1);
            continue;
        }

        // Draw Whole Fruit / Bomb
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.angle);
        ctx.font = (f.size * 2) + "px system-ui, Arial";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(f.type, 0, 0);
        ctx.restore();
    }

    // Update & Draw Sliced Halves
    for (let i = slicedHalves.length - 1; i >= 0; i--) {
        const h = slicedHalves[i];
        h.x += h.vx;
        h.y += h.vy;
        h.vy += GRAVITY * 1.2;
        h.angle += h.vAngle;

        if (h.y > ch + 80) {
            slicedHalves.splice(i, 1);
            continue;
        }

        ctx.save();
        ctx.translate(h.x, h.y);
        ctx.rotate(h.angle);
        ctx.font = "38px system-ui, Arial";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Clip half visually
        ctx.beginPath();
        if (h.half === 'left') ctx.rect(-30, -30, 30, 60);
        else ctx.rect(0, -30, 30, 60);
        ctx.clip();
        ctx.fillText(h.type, 0, 0);
        ctx.restore();
    }
    
    // Update & Draw Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += GRAVITY;
        p.life -= 0.025;
        
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
    
    // Draw Blade Swipe Trail
    if (swipeTrail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(swipeTrail[0].x, swipeTrail[0].y);
        for (let i = 1; i < swipeTrail.length; i++) {
            ctx.lineTo(swipeTrail[i].x, swipeTrail[i].y);
            swipeTrail[i].age++;
        }
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        if (swipeTrail[0].age > 4) swipeTrail.shift();
    }
    
    requestAnimationFrame(gameLoop);
}
