const $ = id => document.getElementById(id);
const showScreen = id => {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $(id).classList.add('active');
};

const canvas = $('game-canvas');
const ctx = canvas.getContext('2d');

let cw, ch;
function resize() {
    // Keep a portrait aspect ratio for the table
    cw = Math.min(window.innerWidth - 20, 500);
    ch = Math.min(window.innerHeight - 20, 800);
    canvas.width = cw;
    canvas.height = ch;
}
window.addEventListener('resize', resize);
resize();

// Game State
let isPlaying = false;
let mode = 'ai'; // 'ai' or '2p'
let score1 = 0; // Bottom (Player 1)
let score2 = 0; // Top (Player 2 / AI)
const WIN_SCORE = 7;

// Physics bodies
let puck = { x: cw/2, y: ch/2, vx: 0, vy: 0, r: 15, mass: 1 };
let p1 = { x: cw/2, y: ch - 100, vx: 0, vy: 0, r: 35, mass: 5, color: '#3b82f6' };
let p2 = { x: cw/2, y: 100, vx: 0, vy: 0, r: 35, mass: 5, color: '#ef4444' };

const GOAL_WIDTH = 140;
const FRICTION = 0.99;

// Inputs
let touches = {};

$('btn-1p').onclick = () => startGame('ai');
$('btn-2p').onclick = () => startGame('2p');
$('restart-btn').onclick = () => showScreen('start-screen');

function startGame(selectedMode) {
    mode = selectedMode;
    score1 = 0;
    score2 = 0;
    updateScoreUI();
    resetPuck();
    p1.x = cw/2; p1.y = ch - 100;
    p2.x = cw/2; p2.y = 100;
    isPlaying = true;
    showScreen('game-screen');
    
    if (window.parent) window.parent.postMessage({ type: 'ARCADE_GAME_START', gameId: 'air-hockey' }, '*');
    
    requestAnimationFrame(gameLoop);
}

function resetPuck(scorer) {
    puck.x = cw/2;
    puck.y = ch/2;
    puck.vx = 0;
    puck.vy = scorer === 1 ? -3 : (scorer === 2 ? 3 : 0);
}

// Touch Handling (Multi-touch support)
canvas.addEventListener('touchstart', handleTouch);
canvas.addEventListener('touchmove', handleTouch);
canvas.addEventListener('touchend', handleTouchEnd);
canvas.addEventListener('touchcancel', handleTouchEnd);

// Mouse fallback for 1 player
let isMouseDown = false;
canvas.addEventListener('mousedown', e => { isMouseDown = true; handleMouse(e); });
canvas.addEventListener('mousemove', e => { if(isMouseDown) handleMouse(e); });
window.addEventListener('mouseup', () => { isMouseDown = false; });

function handleMouse(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (y > ch/2) {
        // Bottom half (P1)
        p1.vx = x - p1.x;
        p1.vy = y - p1.y;
        p1.x = x;
        p1.y = y;
    } else if (mode === '2p' && y < ch/2) {
        // Top half (P2)
        p2.vx = x - p2.x;
        p2.vy = y - p2.y;
        p2.x = x;
        p2.y = y;
    }
}

function handleTouch(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    
    // Reset velocities if no movement
    p1.vx = 0; p1.vy = 0;
    if (mode === '2p') { p2.vx = 0; p2.vy = 0; }
    
    for (let i = 0; i < e.touches.length; i++) {
        const x = e.touches[i].clientX - rect.left;
        const y = e.touches[i].clientY - rect.top;
        
        if (y > ch/2) {
            // Player 1 Area
            p1.vx = x - p1.x;
            p1.vy = y - p1.y;
            p1.x = x;
            p1.y = y;
        } else if (mode === '2p' && y < ch/2) {
            // Player 2 Area
            p2.vx = x - p2.x;
            p2.vy = y - p2.y;
            p2.x = x;
            p2.y = y;
        }
    }
}

function handleTouchEnd(e) {
    e.preventDefault();
}

function constrainMallet(p, isTop) {
    p.x = Math.max(p.r, Math.min(cw - p.r, p.x));
    if (isTop) {
        p.y = Math.max(p.r, Math.min(ch/2 - p.r, p.y));
    } else {
        p.y = Math.max(ch/2 + p.r, Math.min(ch - p.r, p.y));
    }
}

function resolveCollision(mallet, puck) {
    const dx = puck.x - mallet.x;
    const dy = puck.y - mallet.y;
    const distance = Math.hypot(dx, dy);
    
    if (distance < mallet.r + puck.r) {
        // Push puck out
        const overlap = (mallet.r + puck.r) - distance;
        const nx = dx / distance;
        const ny = dy / distance;
        
        puck.x += nx * overlap;
        puck.y += ny * overlap;
        
        // Basic elastic collision
        // Assume mallet has "infinite" mass compared to puck, but give it punch based on mallet velocity
        puck.vx = nx * 10 + mallet.vx * 0.5;
        puck.vy = ny * 10 + mallet.vy * 0.5;
        
        // Cap speed
        const speed = Math.hypot(puck.vx, puck.vy);
        if (speed > 25) {
            puck.vx = (puck.vx / speed) * 25;
            puck.vy = (puck.vy / speed) * 25;
        }
    }
}

function gameLoop() {
    if (!isPlaying) return;
    
    // AI Logic
    if (mode === 'ai') {
        const targetX = puck.y < ch/2 ? puck.x : cw/2;
        const targetY = puck.y < ch/2 ? Math.min(puck.y - 20, ch/2 - p2.r) : 100;
        
        // Ease towards target
        p2.vx = (targetX - p2.x) * 0.1;
        p2.vy = (targetY - p2.y) * 0.1;
        p2.x += p2.vx;
        p2.y += p2.vy;
    }
    
    constrainMallet(p1, false);
    constrainMallet(p2, true);
    
    // Puck physics
    puck.x += puck.vx;
    puck.y += puck.vy;
    puck.vx *= FRICTION;
    puck.vy *= FRICTION;
    
    // Walls collision
    if (puck.x - puck.r < 0) { puck.x = puck.r; puck.vx *= -1; }
    if (puck.x + puck.r > cw) { puck.x = cw - puck.r; puck.vx *= -1; }
    
    // Top/Bottom collision & Goals
    const inGoalX = puck.x > cw/2 - GOAL_WIDTH/2 && puck.x < cw/2 + GOAL_WIDTH/2;
    
    if (puck.y - puck.r < 0) {
        if (inGoalX) {
            score1++; updateScoreUI(); checkWin(); resetPuck(1);
        } else {
            puck.y = puck.r; puck.vy *= -1;
        }
    }
    
    if (puck.y + puck.r > ch) {
        if (inGoalX) {
            score2++; updateScoreUI(); checkWin(); resetPuck(2);
        } else {
            puck.y = ch - puck.r; puck.vy *= -1;
        }
    }
    
    resolveCollision(p1, puck);
    resolveCollision(p2, puck);
    
    draw();
    
    if (isPlaying) requestAnimationFrame(gameLoop);
}

function updateScoreUI() {
    $('score1').innerText = score1;
    $('score2').innerText = score2;
}

function checkWin() {
    if (score1 >= WIN_SCORE || score2 >= WIN_SCORE) {
        isPlaying = false;
        showScreen('game-over-screen');
        if (score1 >= WIN_SCORE) {
            $('result-title').innerText = mode === 'ai' ? 'لقد فزت! 🎉' : 'اللاعب الأزرق فاز! 🔵';
            $('result-title').style.color = '#3b82f6';
            if (window.parent) window.parent.postMessage({ type: 'ARCADE_GAME_OVER', winner: 'Victory', gameId: 'air-hockey' }, '*');
        } else {
            $('result-title').innerText = mode === 'ai' ? 'لقد خسرت! 😔' : 'اللاعب الأحمر فاز! 🔴';
            $('result-title').style.color = '#ef4444';
            if (window.parent) window.parent.postMessage({ type: 'ARCADE_GAME_OVER', winner: 'Defeat', gameId: 'air-hockey' }, '*');
        }
        $('final-score').innerText = `${score1} - ${score2}`;
    }
}

function draw() {
    ctx.clearRect(0, 0, cw, ch);
    
    // Draw Center Line
    ctx.beginPath();
    ctx.moveTo(0, ch/2);
    ctx.lineTo(cw, ch/2);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 4;
    ctx.stroke();
    
    // Draw Center Circle
    ctx.beginPath();
    ctx.arc(cw/2, ch/2, 60, 0, Math.PI*2);
    ctx.stroke();
    
    // Draw Goals
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(cw/2 - GOAL_WIDTH/2, 0, GOAL_WIDTH, 10);
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(cw/2 - GOAL_WIDTH/2, ch - 10, GOAL_WIDTH, 10);
    
    // Draw Puck
    ctx.beginPath();
    ctx.arc(puck.x, puck.y, puck.r, 0, Math.PI*2);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 4;
    ctx.stroke();
    
    // Draw Mallets
    drawMallet(p1);
    drawMallet(p2);
}

function drawMallet(p) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
    ctx.fillStyle = p.color;
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * 0.4, 0, Math.PI*2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
}
