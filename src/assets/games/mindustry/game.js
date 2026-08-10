// --- WEB AUDIO API SYNTHESIZER ---
let audioCtx = null;

function getAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

function playShootSound(type = 'turret') {
    try {
        const ctx = getAudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        if (type === 'laser') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(900, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);
        } else {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(400, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.08);
        }
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
    } catch(e) {}
}

function playExplosionSound() {
    try {
        const ctx = getAudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(30, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
    } catch(e) {}
}

// --- UI NAVIGATION ---
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function showProModal() { document.getElementById('pro-modal').classList.remove('hidden'); }
function closeProModal() { document.getElementById('pro-modal').classList.add('hidden'); }
function showDownloadsScreen() { showScreen('downloads-screen'); }

let selectedTool = 'drill';

function selectTool(tool) {
    selectedTool = tool;
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = document.querySelector(`[data-tool="${tool}"]`);
    if (activeBtn) activeBtn.classList.add('active');
}

// --- MINDUSTRY ENGINE ---
const TILE_SIZE = 40;
let cols = 15;
let rows = 12;
let grid = [];
let copper = 150;
let power = 100;
let coreHealth = 1000;
let waveCount = 1;
let waveTimer = 25;
let waveInterval = null;

let bullets = [];
let enemies = [];
let particles = [];
let conveyorItems = [];
let canvas, ctx;
let isRunning = false;

function initGrid() {
    grid = [];
    for (let r = 0; r < rows; r++) {
        let row = [];
        for (let c = 0; c < cols; c++) {
            row.push({ type: 'empty', health: 100 });
        }
        grid.push(row);
    }
    const midR = Math.floor(rows / 2);
    const midC = Math.floor(cols / 2);
    grid[midR][midC] = { type: 'core', health: 1000 };
}

function startLocalGame() {
    copper = 150;
    power = 100;
    coreHealth = 1000;
    waveCount = 1;
    waveTimer = 25;
    bullets = [];
    enemies = [];
    particles = [];
    conveyorItems = [];

    showScreen('game-screen');

    canvas = document.getElementById('mindustry-canvas');
    ctx = canvas.getContext('2d');

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    initGrid();
    setupCanvasClick();

    if (waveInterval) clearInterval(waveInterval);
    waveInterval = setInterval(updateWaveTimer, 1000);

    isRunning = true;
    requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
    if (!canvas) return;
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    cols = Math.floor(canvas.width / TILE_SIZE);
    rows = Math.floor(canvas.height / TILE_SIZE);
    if (grid.length === 0) initGrid();
}

function setupCanvasClick() {
    canvas.onclick = (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const c = Math.floor(x / TILE_SIZE);
        const r = Math.floor(y / TILE_SIZE);

        if (r < 0 || r >= rows || c < 0 || c >= cols) return;

        const tile = grid[r][c];
        if (selectedTool === 'delete') {
            if (tile.type !== 'core') {
                grid[r][c] = { type: 'empty', health: 100 };
            }
            return;
        }

        if (tile.type !== 'empty') return;

        if (selectedTool === 'drill' && copper >= 20) {
            copper -= 20;
            grid[r][c] = { type: 'drill', health: 150 };
        } else if (selectedTool === 'conveyor' && copper >= 5) {
            copper -= 5;
            grid[r][c] = { type: 'conveyor', health: 80 };
        } else if (selectedTool === 'turret' && copper >= 40) {
            copper -= 40;
            grid[r][c] = { type: 'turret', health: 200, cooldown: 0 };
        } else if (selectedTool === 'laser' && copper >= 60) {
            copper -= 60;
            grid[r][c] = { type: 'laser', health: 250, cooldown: 0 };
        } else if (selectedTool === 'wall' && copper >= 15) {
            copper -= 15;
            grid[r][c] = { type: 'wall', health: 400 };
        }
        updateHUD();
    };
}

function updateWaveTimer() {
    if (!isRunning) return;
    waveTimer--;
    if (waveTimer <= 0) {
        spawnWave();
        waveCount++;
        waveTimer = 25;
    }
    const timerElem = document.getElementById('wave-timer');
    const countElem = document.getElementById('wave-count');
    if (timerElem) timerElem.innerText = waveTimer;
    if (countElem) countElem.innerText = waveCount;
}

function spawnWave() {
    const count = waveCount * 4;
    for (let i = 0; i < count; i++) {
        setTimeout(() => {
            const side = Math.floor(Math.random() * 4);
            let x, y;
            if (side === 0) { x = Math.random() * canvas.width; y = -20; }
            else if (side === 1) { x = canvas.width + 20; y = Math.random() * canvas.height; }
            else if (side === 2) { x = Math.random() * canvas.width; y = canvas.height + 20; }
            else { x = -20; y = Math.random() * canvas.height; }

            const isBoss = (waveCount % 5 === 0 && i === 0);
            enemies.push({
                x, y,
                hp: isBoss ? 600 : 35 + waveCount * 12,
                maxHp: isBoss ? 600 : 35 + waveCount * 12,
                speed: isBoss ? 0.7 : 1.4 + Math.random() * 0.4,
                size: isBoss ? 24 : 12,
                isBoss: isBoss
            });
        }, i * 350);
    }
}

function updateHUD() {
    const copperElem = document.getElementById('res-copper');
    const powerElem = document.getElementById('res-power');
    const coreElem = document.getElementById('core-health');
    if (copperElem) copperElem.innerText = Math.floor(copper);
    if (powerElem) powerElem.innerText = Math.floor(power);
    if (coreElem) coreElem.innerText = Math.floor(coreHealth);
}

function gameLoop() {
    if (!isRunning) return;

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Grid Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let r = 0; r <= rows; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * TILE_SIZE);
        ctx.lineTo(canvas.width, r * TILE_SIZE);
        ctx.stroke();
    }
    for (let c = 0; c <= cols; c++) {
        ctx.beginPath();
        ctx.moveTo(c * TILE_SIZE, 0);
        ctx.lineTo(c * TILE_SIZE, canvas.height);
        ctx.stroke();
    }

    const midR = Math.floor(rows / 2);
    const midC = Math.floor(cols / 2);
    const coreX = midC * TILE_SIZE + TILE_SIZE / 2;
    const coreY = midR * TILE_SIZE + TILE_SIZE / 2;

    // Process & Render Grid Tiles
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const tile = grid[r][c];
            const x = c * TILE_SIZE;
            const y = r * TILE_SIZE;

            if (tile.type === 'core') {
                ctx.fillStyle = '#f59e0b';
                ctx.shadowColor = '#f59e0b';
                ctx.shadowBlur = 18;
                ctx.fillRect(x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8);
                ctx.shadowBlur = 0;
                ctx.fillStyle = '#000';
                ctx.font = '20px sans-serif';
                ctx.fillText('⚡', x + 10, y + 28);
            } else if (tile.type === 'drill') {
                ctx.fillStyle = '#0ea5e9';
                ctx.fillRect(x + 6, y + 6, TILE_SIZE - 12, TILE_SIZE - 12);
                copper += 0.06;
            } else if (tile.type === 'conveyor') {
                ctx.fillStyle = '#334155';
                ctx.fillRect(x + 8, y + 8, TILE_SIZE - 16, TILE_SIZE - 16);
            } else if (tile.type === 'turret') {
                ctx.fillStyle = '#34d399';
                ctx.fillRect(x + 6, y + 6, TILE_SIZE - 12, TILE_SIZE - 12);

                tile.cooldown = (tile.cooldown || 0) + 1;
                if (tile.cooldown > 18 && enemies.length > 0) {
                    const tx = x + TILE_SIZE / 2;
                    const ty = y + TILE_SIZE / 2;
                    const target = enemies[0];
                    const angle = Math.atan2(target.y - ty, target.x - tx);
                    bullets.push({ x: tx, y: ty, vx: Math.cos(angle) * 8, vy: Math.sin(angle) * 8, dmg: 25 });
                    playShootSound('turret');
                    tile.cooldown = 0;
                }
            } else if (tile.type === 'laser') {
                ctx.fillStyle = '#a855f7';
                ctx.fillRect(x + 6, y + 6, TILE_SIZE - 12, TILE_SIZE - 12);

                tile.cooldown = (tile.cooldown || 0) + 1;
                if (tile.cooldown > 12 && enemies.length > 0) {
                    const tx = x + TILE_SIZE / 2;
                    const ty = y + TILE_SIZE / 2;
                    const target = enemies[0];
                    const angle = Math.atan2(target.y - ty, target.x - tx);
                    bullets.push({ x: tx, y: ty, vx: Math.cos(angle) * 12, vy: Math.sin(angle) * 12, dmg: 45, isLaser: true });
                    playShootSound('laser');
                    tile.cooldown = 0;
                }
            } else if (tile.type === 'wall') {
                ctx.fillStyle = '#64748b';
                ctx.fillRect(x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8);
            }
        }
    }

    // Move & Render Bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.x += b.vx;
        b.y += b.vy;

        ctx.fillStyle = b.isLaser ? '#c084fc' : '#fbbf24';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.isLaser ? 5 : 4, 0, Math.PI * 2);
        ctx.fill();

        for (let j = enemies.length - 1; j >= 0; j--) {
            const e = enemies[j];
            const dist = Math.hypot(e.x - b.x, e.y - b.y);
            if (dist < e.size + 4) {
                e.hp -= b.dmg;
                bullets.splice(i, 1);

                if (e.hp <= 0) {
                    playExplosionSound();
                    copper += e.isBoss ? 100 : 10;
                    enemies.splice(j, 1);
                }
                break;
            }
        }

        if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) {
            bullets.splice(i, 1);
        }
    }

    // Move & Render Enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        const angle = Math.atan2(coreY - e.y, coreX - e.x);
        e.x += Math.cos(angle) * e.speed;
        e.y += Math.sin(angle) * e.speed;

        ctx.fillStyle = e.isBoss ? '#ef4444' : '#f97316';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = e.isBoss ? 15 : 5;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(e.x - e.size, e.y - e.size - 8, e.size * 2, 4);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(e.x - e.size, e.y - e.size - 8, (e.size * 2) * (e.hp / e.maxHp), 4);

        const distToCore = Math.hypot(coreX - e.x, coreY - e.y);
        if (distToCore < e.size + 20) {
            coreHealth -= e.isBoss ? 100 : 15;
            enemies.splice(i, 1);
            if (coreHealth <= 0) {
                alert('تم تدمير المفاعل الرئيسي! يمكنك إعادة التشفير والبدء مجدداً.');
                startLocalGame();
                return;
            }
        }
    }

    updateHUD();
    requestAnimationFrame(gameLoop);
}
