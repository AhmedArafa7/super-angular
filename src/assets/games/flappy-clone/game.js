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

        if (type === 'flap') {
            osc.frequency.setValueAtTime(350, c.currentTime);
            osc.frequency.exponentialRampToValueAtTime(700, c.currentTime + 0.08);
            gain.gain.setValueAtTime(0.2, c.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.08);
            osc.start(); osc.stop(c.currentTime + 0.08);
        } else if (type === 'score') {
            osc.frequency.setValueAtTime(587.33, c.currentTime);
            osc.frequency.setValueAtTime(880, c.currentTime + 0.08);
            gain.gain.setValueAtTime(0.2, c.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.2);
            osc.start(); osc.stop(c.currentTime + 0.2);
        } else if (type === 'hit') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(180, c.currentTime);
            osc.frequency.linearRampToValueAtTime(60, c.currentTime + 0.25);
            gain.gain.setValueAtTime(0.3, c.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.25);
            osc.start(); osc.stop(c.currentTime + 0.25);
        }
    } catch(e) {}
}

// Game State
let isPlaying = false;
let score = 0;
let frameCount = 0;

// Realistic Aerodynamic Physics
const GRAVITY = 0.36;
const FLAP_LIFT = -6.8;
const PIPE_SPEED = 3.5;
const PIPE_WIDTH = 75;
const PIPE_GAP = 195;
const GROUND_HEIGHT = 80;

let bird = { 
    x: 120, 
    y: 200, 
    vy: 0, 
    radius: 18, 
    angle: 0,
    wingAngle: 0
};
let pipes = [];
let clouds = [];

// Initialize background clouds
function initClouds() {
    clouds = [];
    for (let i = 0; i < 6; i++) {
        clouds.push({
            x: Math.random() * cw,
            y: Math.random() * (ch * 0.45),
            scale: 0.6 + Math.random() * 0.8,
            speed: 0.3 + Math.random() * 0.4
        });
    }
}

$('start-btn').onclick = initGame;
$('restart-btn').onclick = initGame;

function initGame() {
    score = 0;
    frameCount = 0;
    bird = { 
        x: Math.min(140, cw * 0.25), 
        y: ch / 2, 
        vy: 0, 
        radius: 18, 
        angle: 0,
        wingAngle: 0
    };
    pipes = [];
    initClouds();
    isPlaying = true;
    $('score').innerText = score;
    showScreen('game-screen');
    
    if (window.parent) window.parent.postMessage({ type: 'ARCADE_GAME_START', gameId: 'flappy-clone' }, '*');
    
    requestAnimationFrame(gameLoop);
}

function flap() {
    if (!isPlaying) return;
    bird.vy = FLAP_LIFT;
    playSound('flap');
}

window.addEventListener('keydown', e => {
    if ((e.code === 'Space' || e.code === 'ArrowUp') && isPlaying) {
        e.preventDefault();
        flap();
    }
});
canvas.addEventListener('mousedown', flap);
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    flap();
});

function spawnPipe() {
    let minPipeHeight = 60;
    let maxPipeHeight = ch - PIPE_GAP - minPipeHeight - GROUND_HEIGHT;
    let topHeight = Math.floor(Math.random() * (maxPipeHeight - minPipeHeight + 1) + minPipeHeight);
    
    pipes.push({
        x: cw,
        topHeight: topHeight,
        passed: false
    });
}

function gameOver() {
    if (!isPlaying) return;
    isPlaying = false;
    playSound('hit');
    $('final-score').innerText = score;
    showScreen('game-over-screen');
    if (window.parent) window.parent.postMessage({ type: 'ARCADE_GAME_OVER', winner: 'Score: ' + score, gameId: 'flappy-clone' }, '*');
}

// --- REALISTIC PARALLAX BACKGROUND DRAWING ---
function drawBackground() {
    // Sky Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, ch - GROUND_HEIGHT);
    skyGrad.addColorStop(0, '#0284c7');
    skyGrad.addColorStop(0.6, '#38bdf8');
    skyGrad.addColorStop(1, '#bae6fd');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, cw, ch - GROUND_HEIGHT);

    // Glowing Sun
    const sunX = cw - 100;
    const sunY = 90;
    const sunGrad = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 80);
    sunGrad.addColorStop(0, 'rgba(254, 240, 138, 0.9)');
    sunGrad.addColorStop(0.4, 'rgba(253, 224, 71, 0.5)');
    sunGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 80, 0, Math.PI * 2);
    ctx.fill();

    // Drifting Parallax Clouds
    clouds.forEach(c => {
        c.x -= c.speed;
        if (c.x < -120) c.x = cw + 100;

        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.scale(c.scale, c.scale);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.beginPath();
        ctx.arc(0, 0, 25, 0, Math.PI * 2);
        ctx.arc(25, -10, 30, 0, Math.PI * 2);
        ctx.arc(55, 0, 22, 0, Math.PI * 2);
        ctx.fillRect(0, 0, 55, 20);
        ctx.fill();
        ctx.restore();
    });

    // Distant Mountain Silhouette (Far Background)
    ctx.fillStyle = 'rgba(56, 189, 248, 0.5)';
    ctx.beginPath();
    ctx.moveTo(0, ch - GROUND_HEIGHT);
    ctx.lineTo(cw * 0.1, ch - GROUND_HEIGHT - 60);
    ctx.lineTo(cw * 0.25, ch - GROUND_HEIGHT);
    ctx.lineTo(cw * 0.45, ch - GROUND_HEIGHT - 90);
    ctx.lineTo(cw * 0.65, ch - GROUND_HEIGHT);
    ctx.lineTo(cw * 0.85, ch - GROUND_HEIGHT - 70);
    ctx.lineTo(cw, ch - GROUND_HEIGHT);
    ctx.fill();
}

// --- REALISTIC GROUND DRAWING ---
function drawGround() {
    const gy = ch - GROUND_HEIGHT;
    
    // Soil Base
    const soilGrad = ctx.createLinearGradient(0, gy, 0, ch);
    soilGrad.addColorStop(0, '#854d0e');
    soilGrad.addColorStop(1, '#543109');
    ctx.fillStyle = soilGrad;
    ctx.fillRect(0, gy, cw, GROUND_HEIGHT);

    // Top Grass Border
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(0, gy, cw, 16);
    ctx.fillStyle = '#15803d';
    ctx.fillRect(0, gy + 16, cw, 6);

    // Moving Grass Texture Lines
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 3;
    const offset = (frameCount * PIPE_SPEED) % 24;
    for (let x = -offset; x < cw + 24; x += 24) {
        ctx.beginPath();
        ctx.moveTo(x, gy + 16);
        ctx.lineTo(x - 8, gy + 2);
        ctx.stroke();
    }
}

// --- REALISTIC 3D PIPE DRAWING ---
function drawPipes() {
    pipes.forEach(p => {
        const topH = p.topHeight;
        const botY = p.topHeight + PIPE_GAP;
        const botH = ch - GROUND_HEIGHT - botY;

        // Draw Top Pipe
        drawPipeBody(p.x, 0, PIPE_WIDTH, topH, true);
        // Draw Bottom Pipe
        drawPipeBody(p.x, botY, PIPE_WIDTH, botH, false);
    });
}

function drawPipeBody(x, y, width, height, isTop) {
    if (height <= 0) return;

    // 3D Metallic Green Gradient
    const pipeGrad = ctx.createLinearGradient(x, 0, x + width, 0);
    pipeGrad.addColorStop(0, '#15803d');
    pipeGrad.addColorStop(0.25, '#4ade80');
    pipeGrad.addColorStop(0.65, '#22c55e');
    pipeGrad.addColorStop(1, '#14532d');

    ctx.fillStyle = pipeGrad;
    ctx.fillRect(x, y, width, height);

    ctx.strokeStyle = '#052e16';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, width, height);

    // Pipe Cap Rim
    const capH = 26;
    const capW = width + 12;
    const capX = x - 6;
    const capY = isTop ? (y + height - capH) : y;

    const capGrad = ctx.createLinearGradient(capX, 0, capX + capW, 0);
    capGrad.addColorStop(0, '#166534');
    capGrad.addColorStop(0.3, '#86efac');
    capGrad.addColorStop(0.7, '#22c55e');
    capGrad.addColorStop(1, '#052e16');

    ctx.fillStyle = capGrad;
    ctx.fillRect(capX, capY, capW, capH);
    ctx.strokeRect(capX, capY, capW, capH);
}

// --- ANIMATED REALISTIC BIRD CHARACTER ---
function drawBird() {
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.angle);

    // Flapping Wing Animation Cycle
    const wingFlap = Math.sin(frameCount * 0.45);

    // Bird Tail Feathers
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(-16, 0);
    ctx.lineTo(-26, -8);
    ctx.lineTo(-24, 0);
    ctx.lineTo(-26, 8);
    ctx.closePath();
    ctx.fill();

    // Main Body (Vibrant Yellow/Orange Gradient)
    const bodyGrad = ctx.createRadialGradient(-2, -2, 4, 0, 0, bird.radius + 2);
    bodyGrad.addColorStop(0, '#fef08a');
    bodyGrad.addColorStop(0.6, '#facc15');
    bodyGrad.addColorStop(1, '#f59e0b');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // White Belly Accent
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(4, 6, 9, 0, Math.PI * 2);
    ctx.fill();

    // Animated Wing
    ctx.save();
    ctx.translate(-4, 2);
    ctx.rotate(wingFlap * 0.5);
    const wingGrad = ctx.createLinearGradient(-10, 0, 10, 0);
    wingGrad.addColorStop(0, '#fbbf24');
    wingGrad.addColorStop(1, '#d97706');
    ctx.fillStyle = wingGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, 11, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // Large Cute Eye
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(8, -6, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(10, -6, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(11, -7, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Orange Beak
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.moveTo(14, -2);
    ctx.lineTo(24, 2);
    ctx.lineTo(13, 7);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#7c2d12';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Red Crown Feathers
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(-2, -18, 4, 0, Math.PI * 2);
    ctx.arc(3, -19, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// --- MAIN GAME LOOP ---
function gameLoop() {
    if (!isPlaying) return;

    // Aerodynamic Physics Update
    bird.vy += GRAVITY;
    bird.y += bird.vy;

    // Smooth Aerodynamic Tilt Angle Interpolation
    let targetAngle = Math.min(Math.PI / 2.5, Math.max(-Math.PI / 5, bird.vy * 0.08));
    bird.angle += (targetAngle - bird.angle) * 0.15;

    // Ground & Ceiling Collisions
    const groundY = ch - GROUND_HEIGHT;
    if (bird.y + bird.radius >= groundY) {
        bird.y = groundY - bird.radius;
        gameOver();
        return;
    }
    if (bird.y - bird.radius <= 0) {
        bird.y = bird.radius;
        bird.vy = 0;
    }

    // Spawn Pipes
    if (frameCount % 100 === 0) spawnPipe();

    // Update Pipes & Collisions
    for (let i = pipes.length - 1; i >= 0; i--) {
        let p = pipes[i];
        p.x -= PIPE_SPEED;

        // Accurate Circular-to-Rectangle Collision Box
        const birdLeft = bird.x - bird.radius + 4;
        const birdRight = bird.x + bird.radius - 4;
        const birdTop = bird.y - bird.radius + 4;
        const birdBottom = bird.y + bird.radius - 4;

        if (
            birdRight > p.x && birdLeft < p.x + PIPE_WIDTH &&
            (birdTop < p.topHeight || birdBottom > p.topHeight + PIPE_GAP)
        ) {
            gameOver();
            return;
        }

        // Score Tracking
        if (p.x + PIPE_WIDTH < bird.x && !p.passed) {
            score++;
            $('score').innerText = score;
            playSound('score');
            p.passed = true;
        }

        // Remove offscreen pipes
        if (p.x + PIPE_WIDTH < -20) {
            pipes.splice(i, 1);
        }
    }

    // --- RENDER EVERYTHING ---
    drawBackground();
    drawPipes();
    drawGround();
    drawBird();

    frameCount++;
    requestAnimationFrame(gameLoop);
}
