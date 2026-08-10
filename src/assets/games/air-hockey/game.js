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
let p1 = { x: cw/2, y: ch - 100, vx: 0, vy: 0, r: 35, mass: 5, color: '#3b82f6', targetX: cw/2, targetY: ch - 100 };
let p2 = { x: cw/2, y: 100, vx: 0, vy: 0, r: 35, mass: 5, color: '#ef4444', targetX: cw/2, targetY: 100 };

const GOAL_WIDTH = 140;
const FRICTION = 0.99;
const MAX_MALLET_SPEED = 12; // NEW: Speed limit for mallets

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
    p1.x = cw/2; p1.y = ch - 100; p1.targetX = p1.x; p1.targetY = p1.y; p1.vx = 0; p1.vy = 0;
    p2.x = cw/2; p2.y = 100; p2.targetX = p2.x; p2.targetY = p2.y; p2.vx = 0; p2.vy = 0;
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

// Keyboard & Multi-Touch Input Engine
const keysPressed = {};
let p1TouchId = null;
let p2TouchId = null;

window.addEventListener('keydown', e => {
    keysPressed[e.code] = true;
    keysPressed[e.key] = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
    }
});

window.addEventListener('keyup', e => {
    keysPressed[e.code] = false;
    keysPressed[e.key] = false;
});

// Touch Handling (Independent Multi-touch tracking)
window.addEventListener('touchstart', handleTouch, {passive: false});
window.addEventListener('touchmove', handleTouch, {passive: false});
window.addEventListener('touchend', handleTouchEnd, {passive: false});
window.addEventListener('touchcancel', handleTouchEnd, {passive: false});

// Mouse fallback
let isMouseDown = false;
canvas.addEventListener('mousedown', e => { isMouseDown = true; handleMouse(e); });
canvas.addEventListener('mousemove', e => { if (isMouseDown) handleMouse(e); });
window.addEventListener('mouseup', () => { isMouseDown = false; });

function handleMouse(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    if (y > ch / 2) {
        p1.targetX = x;
        p1.targetY = y;
    } else if (mode === '2p' && y < ch / 2) {
        p2.targetX = x;
        p2.targetY = y;
    }
}

function handleTouch(e) {
    if (!isPlaying) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const currentTouchIds = new Set();

    for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        const id = touch.identifier;
        currentTouchIds.add(id);

        const x = (touch.clientX - rect.left) * scaleX;
        const y = (touch.clientY - rect.top) * scaleY;

        if (id === p1TouchId) {
            p1.targetX = x;
            p1.targetY = y;
        } else if (id === p2TouchId && mode === '2p') {
            p2.targetX = x;
            p2.targetY = y;
        } else {
            // Unbound new touch assignment
            if (y > ch / 2 && (p1TouchId === null || !currentTouchIds.has(p1TouchId))) {
                p1TouchId = id;
                p1.targetX = x;
                p1.targetY = y;
            } else if (y < ch / 2 && mode === '2p' && (p2TouchId === null || !currentTouchIds.has(p2TouchId))) {
                p2TouchId = id;
                p2.targetX = x;
                p2.targetY = y;
            }
        }
    }
}

function handleTouchEnd(e) {
    const activeIds = new Set(Array.from(e.touches).map(t => t.identifier));
    if (p1TouchId !== null && !activeIds.has(p1TouchId)) p1TouchId = null;
    if (p2TouchId !== null && !activeIds.has(p2TouchId)) p2TouchId = null;
}

function updateKeyboardControls() {
    if (!isPlaying) return;
    const kSpeed = 11;

    // Player 1 (Bottom - Blue): WASD
    if (keysPressed['KeyW'] || keysPressed['w'] || keysPressed['W']) p1.targetY -= kSpeed;
    if (keysPressed['KeyS'] || keysPressed['s'] || keysPressed['S']) p1.targetY += kSpeed;
    if (keysPressed['KeyA'] || keysPressed['a'] || keysPressed['A']) p1.targetX -= kSpeed;
    if (keysPressed['KeyD'] || keysPressed['d'] || keysPressed['D']) p1.targetX += kSpeed;

    // Player 2 (Top - Red): Arrow Keys or IJKL
    if (mode === '2p') {
        if (keysPressed['ArrowUp'] || keysPressed['KeyI'] || keysPressed['i']) p2.targetY -= kSpeed;
        if (keysPressed['ArrowDown'] || keysPressed['KeyK'] || keysPressed['k']) p2.targetY += kSpeed;
        if (keysPressed['ArrowLeft'] || keysPressed['KeyJ'] || keysPressed['j']) p2.targetX -= kSpeed;
        if (keysPressed['ArrowRight'] || keysPressed['KeyL'] || keysPressed['l']) p2.targetX += kSpeed;
    }
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
        if (speed > 20) {
            puck.vx = (puck.vx / speed) * 20;
            puck.vy = (puck.vy / speed) * 20;
        }
    }
}

function updateMalletPosition(mallet) {
    const dx = mallet.targetX - mallet.x;
    const dy = mallet.targetY - mallet.y;
    const dist = Math.hypot(dx, dy);
    
    if (dist > 0) {
        // Limit speed
        const speed = Math.min(dist, MAX_MALLET_SPEED);
        mallet.vx = (dx / dist) * speed;
        mallet.vy = (dy / dist) * speed;
        
        mallet.x += mallet.vx;
        mallet.y += mallet.vy;
    } else {
        mallet.vx = 0;
        mallet.vy = 0;
    }
}

function gameLoop() {
    if (!isPlaying) return;
    
    // AI Logic
    if (mode === 'ai') {
        if (puck.y < ch/2) {
            // Prevent trapping the puck against the top wall
            if (puck.y < 70 && Math.hypot(puck.x - p2.x, puck.y - p2.y) < 60) {
                p2.targetX = cw / 2;
                p2.targetY = 150; // Retreat towards center to let puck bounce out
            } else {
                // Predict puck's x position slightly ahead in time
                let predictedX = puck.x + (puck.vx * 8); 
                
                // Add a small randomized offset (sine wave based on time)
                const offset = Math.sin(Date.now() / 250) * 15;
                
                p2.targetX = Math.max(p2.r, Math.min(cw - p2.r, predictedX + offset));

                // Determine target Y based on puck's vertical velocity
                if (puck.vy < 0) {
                    // Puck moving towards AI goal - try to stay between puck and goal (above it)
                    p2.targetY = Math.max(p2.r, puck.y - 35);
                } else {
                    // Puck moving towards player - try to get behind it to push
                    p2.targetY = Math.min(puck.y - 15, ch / 2 - p2.r);
                }
            }
        } else {
            // Return to defensive position with slight movement to avoid jittering
            p2.targetX = cw / 2 + Math.sin(Date.now() / 500) * 20;
            p2.targetY = 100;
        }
        
        // Slightly slower max speed for AI to make it beatable
        const dx = p2.targetX - p2.x;
        const dy = p2.targetY - p2.y;
        const dist = Math.hypot(dx, dy);
        
        if (dist > 0) {
            const aiSpeed = Math.min(dist, MAX_MALLET_SPEED * 0.6); // AI is a bit slower
            p2.vx = (dx / dist) * aiSpeed;
            p2.vy = (dy / dist) * aiSpeed;
            
            p2.x += p2.vx;
            p2.y += p2.vy;
        } else {
            p2.vx = 0;
            p2.vy = 0;
        }
    // Update continuous keyboard input for both players
    updateKeyboardControls();

    if (mode !== 'ai') {
        updateMalletPosition(p2);
    }
    
    updateMalletPosition(p1);
    
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
