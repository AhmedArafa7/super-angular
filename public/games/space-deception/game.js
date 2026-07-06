const $ = id => document.getElementById(id);
const showScreen = id => {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $(id).classList.add('active');
};

// --- NETWORKING (PEER JS) ---
let peer = null;
let conn = null; // Client connection to host
let isHost = false;
let hostConns = {}; // Host connections to clients

let myId = null;
let myName = '';
let roomId = '';

// --- GAME STATE ---
let gameState = 'LOBBY'; // LOBBY, PLAYING, MEETING, ENDED
let players = {}; // id -> { name, color, x, y, role, isDead, isHost }
let bodies = []; // { x, y, color }
let tasks = []; // Map tasks
let totalTasksCompleted = 0;
let totalTasksRequired = 10;
let meetingData = { caller: '', timer: 120, votes: {}, chat: [] }; // votes: voterId -> votedId ('skip' or playerId)
let myRole = 'CREWMATE'; // CREWMATE, IMPOSTOR

// Settings
const MAP_WIDTH = 1200;
const MAP_HEIGHT = 800;
const SPEED = 4;
const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6'];
let myColor = COLORS[0];

// Input
let keys = { w: false, a: false, s: false, d: false };

// Canvas
const canvas = $('game-canvas');
const ctx = canvas.getContext('2d');
let camera = { x: 0, y: 0 };

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// --- MAP & TASKS DEFINITION ---
const rooms = [
    { name: 'Cafeteria', x: 400, y: 100, w: 400, h: 300, color: '#1e293b' },
    { name: 'Engine', x: 50, y: 400, w: 300, h: 300, color: '#334155' },
    { name: 'Lab', x: 850, y: 400, w: 300, h: 300, color: '#0f172a' },
    { name: 'Control', x: 450, y: 500, w: 300, h: 200, color: '#475569' }
];

// Corridors connecting rooms
const corridors = [
    { x: 200, y: 250, w: 200, h: 150 }, // Cafe to Engine
    { x: 800, y: 250, w: 200, h: 150 }, // Cafe to Lab
    { x: 550, y: 400, w: 100, h: 100 }  // Cafe to Control
];

const taskLocations = [
    { id: 1, x: 500, y: 150, name: 'تفريغ القمامة', doneBy: [] },
    { id: 2, x: 100, y: 650, name: 'إصلاح الأسلاك', doneBy: [] },
    { id: 3, x: 1000, y: 650, name: 'تحليل العينات', doneBy: [] },
    { id: 4, x: 600, y: 650, name: 'تنزيل البيانات', doneBy: [] }
];

// --- INITIALIZATION ---
$('host-btn').onclick = () => {
    myName = $('player-name').value.trim() || 'لاعب';
    isHost = true;
    initPeer();
};

$('join-btn').onclick = () => {
    myName = $('player-name').value.trim() || 'لاعب';
    roomId = $('join-id').value.trim();
    if (!roomId) return alert('أدخل كود الغرفة');
    isHost = false;
    initPeer();
};

function initPeer() {
    peer = new Peer();
    
    peer.on('open', id => {
        myId = id;
        if (isHost) {
            roomId = id;
            players[myId] = { id: myId, name: myName, color: COLORS[0], x: 600, y: 250, role: 'CREWMATE', isDead: false, isHost: true };
            updateLobbyUI();
            showScreen('start-screen');
            $('room-info').classList.remove('hidden');
            $('room-id-display').innerText = roomId;
            $('start-game-btn').classList.remove('hidden');
            
            // Generate link
            const url = new URL(window.location.href);
            url.searchParams.set('room', roomId);
            console.log('Invite Link:', url.href);
        } else {
            conn = peer.connect(roomId);
            setupClientConnection(conn);
        }
    });

    if (isHost) {
        peer.on('connection', connection => {
            connection.on('open', () => {
                const newPlayerColor = COLORS[Object.keys(players).length % COLORS.length];
                players[connection.peer] = { id: connection.peer, name: 'ضيف', color: newPlayerColor, x: 600, y: 250, role: 'CREWMATE', isDead: false, isHost: false };
                hostConns[connection.peer] = connection;
                
                connection.on('data', data => handleHostData(connection.peer, data));
                connection.on('close', () => {
                    delete players[connection.peer];
                    delete hostConns[connection.peer];
                    broadcast({ type: 'UPDATE_STATE', players, gameState });
                    updateLobbyUI();
                });
            });
        });
    }
}

// Auto join from URL
window.onload = () => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('room')) {
        $('join-id').value = params.get('room');
    }
};

// --- NETWORKING LOGIC ---

function setupClientConnection(connection) {
    connection.on('open', () => {
        connection.send({ type: 'JOIN', name: myName });
        showScreen('start-screen');
        $('room-info').classList.remove('hidden');
        $('room-id-display').innerText = roomId;
        $('waiting-msg').classList.remove('hidden');
    });

    connection.on('data', data => {
        if (data.type === 'UPDATE_STATE') {
            players = data.players;
            if (data.bodies) bodies = data.bodies;
            if (data.tasks) tasks = data.tasks;
            totalTasksCompleted = data.totalTasksCompleted || 0;
            updateLobbyUI();
            
            if (data.gameState === 'PLAYING' && gameState === 'LOBBY') {
                startGameClient(data);
            }
            if (data.gameState === 'MEETING' && gameState === 'PLAYING') {
                startMeetingClient(data.meetingData);
            }
            if (data.gameState === 'PLAYING' && gameState === 'MEETING') {
                endMeetingClient();
            }
            if (data.gameState === 'ENDED' && gameState !== 'ENDED') {
                endGameClient(data.winner);
            }
            
            gameState = data.gameState;
            if (data.meetingData) meetingData = data.meetingData;
        }
    });
}

function handleHostData(peerId, data) {
    if (gameState === 'LOBBY') {
        if (data.type === 'JOIN') {
            players[peerId].name = data.name;
            broadcast({ type: 'UPDATE_STATE', players, gameState });
            updateLobbyUI();
        }
    } else if (gameState === 'PLAYING') {
        if (data.type === 'MOVE') {
            if (!players[peerId].isDead) {
                players[peerId].x = data.x;
                players[peerId].y = data.y;
            }
        } else if (data.type === 'KILL') {
            if (players[peerId].role === 'IMPOSTOR' && !players[data.targetId].isDead) {
                players[data.targetId].isDead = true;
                bodies.push({ x: players[data.targetId].x, y: players[data.targetId].y, color: players[data.targetId].color });
                checkWinCondition();
            }
        } else if (data.type === 'REPORT') {
            startMeeting(players[peerId].name);
        } else if (data.type === 'TASK') {
            if (players[peerId].role === 'CREWMATE') {
                let t = tasks.find(t => t.id === data.taskId);
                if (t && !t.doneBy.includes(peerId)) {
                    t.doneBy.push(peerId);
                    totalTasksCompleted++;
                    checkWinCondition();
                }
            }
        }
    } else if (gameState === 'MEETING') {
        if (data.type === 'VOTE') {
            meetingData.votes[peerId] = data.voteTarget;
            checkMeetingEnd();
        } else if (data.type === 'CHAT') {
            meetingData.chat.push({ sender: players[peerId].name, text: data.text });
        }
    }
    
    // Broadcast state frequently handled in host game loop
}

function broadcast(data) {
    Object.values(hostConns).forEach(conn => conn.send(data));
}

// --- LOBBY UI ---
function updateLobbyUI() {
    if (gameState !== 'LOBBY') return;
    const ul = $('players-ul');
    ul.innerHTML = '';
    Object.values(players).forEach(p => {
        const li = document.createElement('li');
        li.innerHTML = `<span style="color:${p.color}">●</span> ${p.name} ${p.isHost ? '(مضيف)' : ''}`;
        ul.appendChild(li);
    });
}

// --- GAME START ---
$('start-game-btn').onclick = () => {
    if (!isHost) return;
    
    // Assign roles
    const playerIds = Object.keys(players);
    if (playerIds.length < 1) return alert('نحتاج لاعب واحد على الأقل للتجربة (في الواقع يفضل 4+)');
    
    // Randomly pick 1 impostor
    const impostorId = playerIds[Math.floor(Math.random() * playerIds.length)];
    playerIds.forEach(id => {
        players[id].role = (id === impostorId) ? 'IMPOSTOR' : 'CREWMATE';
        players[id].isDead = false;
        players[id].x = 600 + Math.random()*50;
        players[id].y = 200 + Math.random()*50;
    });
    
    tasks = JSON.parse(JSON.stringify(taskLocations)); // Reset tasks
    totalTasksCompleted = 0;
    totalTasksRequired = playerIds.length * tasks.length; // Max tasks
    bodies = [];
    gameState = 'PLAYING';
    
    broadcast({ type: 'UPDATE_STATE', players, gameState, tasks, totalTasksCompleted, bodies });
    startGameClient({ players, tasks });
};

function startGameClient(data) {
    myRole = players[myId].role;
    myColor = players[myId].color;
    
    $('role-title').innerText = myRole === 'IMPOSTOR' ? 'أنت المخرب 🔪' : 'أنت ضمن الطاقم 👨‍🚀';
    $('role-title').className = myRole === 'IMPOSTOR' ? 'danger' : '';
    $('role-subtitle').innerText = myRole === 'IMPOSTOR' ? 'اقتل الطاقم ولا تدعهم يكتشفوك' : 'أنجز المهام وابحث عن المخرب';
    
    showScreen('role-screen');
    
    if (window.parent) window.parent.postMessage({ type: 'ARCADE_GAME_START', gameId: 'space-deception' }, '*');
    
    setTimeout(() => {
        showScreen('game-screen');
        requestAnimationFrame(gameLoopClient);
    }, 3000);
    
    if (isHost) {
        setInterval(hostGameLoop, 50); // 20 tick rate
    }
}

// --- HOST GAME LOOP ---
function hostGameLoop() {
    if (gameState !== 'PLAYING' && gameState !== 'MEETING') return;
    broadcast({ type: 'UPDATE_STATE', players, gameState, meetingData, totalTasksCompleted, bodies });
}

function checkWinCondition() {
    let aliveCrew = 0;
    let aliveImpostors = 0;
    
    Object.values(players).forEach(p => {
        if (!p.isDead) {
            if (p.role === 'IMPOSTOR') aliveImpostors++;
            else aliveCrew++;
        }
    });
    
    if (aliveImpostors === 0) {
        endGame('CREW');
    } else if (aliveImpostors >= aliveCrew) {
        endGame('IMPOSTOR');
    } else if (totalTasksCompleted >= totalTasksRequired) {
        endGame('CREW');
    }
}

function endGame(winner) {
    gameState = 'ENDED';
    broadcast({ type: 'UPDATE_STATE', gameState, winner, players });
    endGameClient(winner);
}

function endGameClient(winner) {
    showScreen('game-over-screen');
    if (winner === 'CREW') {
        $('result-title').innerText = 'فاز الطاقم! 🏆';
        $('result-title').style.color = '#10b981';
    } else {
        $('result-title').innerText = 'فاز المخربون! 🔪';
        $('result-title').style.color = '#ef4444';
    }
    
    if (isHost) {
        $('restart-btn').classList.remove('hidden');
    } else {
        $('game-over-waiting').classList.remove('hidden');
    }
    
    if (window.parent) window.parent.postMessage({ type: 'ARCADE_GAME_OVER', winner: winner, gameId: 'space-deception' }, '*');
}

$('restart-btn').onclick = () => {
    if (!isHost) return;
    gameState = 'LOBBY';
    broadcast({ type: 'UPDATE_STATE', gameState, players });
    showScreen('start-screen');
};

// --- CLIENT GAME LOOP (INPUT & RENDERING) ---
window.addEventListener('keydown', e => {
    if(gameState !== 'PLAYING') return;
    if (e.key === 'w') keys.w = true;
    if (e.key === 'a') keys.a = true;
    if (e.key === 's') keys.s = true;
    if (e.key === 'd') keys.d = true;
    if (e.key === 'e' || e.key === 'E') $('action-use').click();
    if (e.key === 'q' || e.key === 'Q') $('action-kill').click();
    if (e.key === 'r' || e.key === 'R') $('action-report').click();
});
window.addEventListener('keyup', e => {
    if (e.key === 'w') keys.w = false;
    if (e.key === 'a') keys.a = false;
    if (e.key === 's') keys.s = false;
    if (e.key === 'd') keys.d = false;
});

function isInsideMap(px, py, radius) {
    let points = [
        {x: px - radius + 2, y: py},
        {x: px + radius - 2, y: py},
        {x: px, y: py - radius + 2},
        {x: px, y: py + radius - 2}
    ];
    for (let p of points) {
        let inside = false;
        for (let r of rooms) if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) { inside = true; break; }
        if (!inside) for (let c of corridors) if (p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h) { inside = true; break; }
        if (!inside) return false;
    }
    return true;
}

function gameLoopClient() {
    if (gameState !== 'PLAYING') return;
    
    let me = players[myId];
    if (!me) return;
    
    // Movement
    if (!me.isDead) {
        let newX = me.x;
        let newY = me.y;
        
        if (keys.w) newY -= SPEED;
        if (keys.s) newY += SPEED;
        if (keys.a) newX -= SPEED;
        if (keys.d) newX += SPEED;
        
        let moved = false;
        // Check X and Y independently to allow sliding against walls
        if (newX !== me.x && isInsideMap(newX, me.y, 16)) { me.x = newX; moved = true; }
        if (newY !== me.y && isInsideMap(me.x, newY, 16)) { me.y = newY; moved = true; }
        
        if (moved && !isHost) {
            conn.send({ type: 'MOVE', x: me.x, y: me.y });
        }
    }
    
    // Camera follow
    camera.x = me.x - canvas.width / 2;
    camera.y = me.y - canvas.height / 2;
    
    checkInteractables();
    drawMap();
    
    // Update HUD
    let pct = totalTasksRequired > 0 ? (totalTasksCompleted / totalTasksRequired) * 100 : 0;
    $('task-progress').innerText = Math.floor(pct) + '%';
    $('task-bar-fill').style.width = pct + '%';
    $('my-role-display').innerText = myRole === 'IMPOSTOR' ? 'مخرب' : 'طاقم';
    $('my-role-display').style.color = myRole === 'IMPOSTOR' ? '#ef4444' : '#38bdf8';
    
    requestAnimationFrame(gameLoopClient);
}

// --- INTERACTIONS ---
let targetTask = null;
let targetPlayer = null;
let targetBody = null;

function checkInteractables() {
    let me = players[myId];
    if (!me || me.isDead) {
        $('action-use').disabled = true;
        $('action-kill').disabled = true;
        $('action-report').disabled = true;
        return;
    }
    
    // Tasks
    targetTask = null;
    if (me.role === 'CREWMATE') {
        for (let t of tasks) {
            if (!t.doneBy.includes(myId) && Math.hypot(me.x - t.x, me.y - t.y) < 60) {
                targetTask = t;
                break;
            }
        }
    }
    $('action-use').disabled = !targetTask;
    
    // Kill
    if (me.role === 'IMPOSTOR') {
        $('action-kill').classList.remove('hidden');
        $('action-sabotage').classList.remove('hidden');
        
        targetPlayer = null;
        for (let id in players) {
            if (id !== myId && !players[id].isDead && Math.hypot(me.x - players[id].x, me.y - players[id].y) < 80) {
                targetPlayer = players[id];
                break;
            }
        }
        $('action-kill').disabled = !targetPlayer;
    }
    
    // Report
    targetBody = null;
    for (let b of bodies) {
        if (Math.hypot(me.x - b.x, me.y - b.y) < 80) {
            targetBody = b;
            break;
        }
    }
    $('action-report').disabled = !targetBody;
}

$('action-use').onclick = () => {
    if (targetTask && !$('action-use').disabled) {
        // Send task complete
        if (isHost) {
            targetTask.doneBy.push(myId);
            totalTasksCompleted++;
            checkWinCondition();
        } else {
            conn.send({ type: 'TASK', taskId: targetTask.id });
        }
        targetTask = null;
    }
};

$('action-kill').onclick = () => {
    if (targetPlayer && !$('action-kill').disabled) {
        if (isHost) {
            players[targetPlayer.id].isDead = true;
            bodies.push({ x: targetPlayer.x, y: targetPlayer.y, color: targetPlayer.color });
            checkWinCondition();
        } else {
            conn.send({ type: 'KILL', targetId: targetPlayer.id });
        }
    }
};

$('action-report').onclick = () => {
    if (targetBody && !$('action-report').disabled) {
        if (isHost) {
            startMeeting(players[myId].name);
        } else {
            conn.send({ type: 'REPORT' });
        }
    }
};

// --- RENDERING ---
function drawMap() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    
    // Draw Floor Base (Space)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
    
    // Draw Walls (Rendered slightly larger behind rooms/corridors)
    const wallThickness = 12;
    ctx.fillStyle = '#38bdf8'; // Glowing blue walls
    rooms.forEach(r => ctx.fillRect(r.x - wallThickness, r.y - wallThickness, r.w + wallThickness*2, r.h + wallThickness*2));
    corridors.forEach(c => ctx.fillRect(c.x - wallThickness, c.y - wallThickness, c.w + wallThickness*2, c.h + wallThickness*2));
    
    // Draw Rooms (Floors)
    rooms.forEach(r => {
        ctx.fillStyle = r.color;
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.font = 'bold 30px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(r.name, r.x + r.w/2, r.y + r.h/2);
    });
    
    // Draw Corridors (Floors)
    corridors.forEach(c => {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(c.x, c.y, c.w, c.h);
    });
    
    // Draw Tasks
    tasks.forEach(t => {
        let isDone = t.doneBy.includes(myId);
        ctx.fillStyle = isDone ? '#10b981' : '#facc15';
        ctx.beginPath();
        ctx.arc(t.x, t.y, 15, 0, Math.PI*2);
        ctx.fill();
        if (targetTask === t) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.stroke();
        }
    });
    
    // Draw Bodies
    bodies.forEach(b => {
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y + 10, 20, Math.PI, 0); // Half circle body (lying down)
        ctx.fill();
        // Bone
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(b.x, b.y - 5, 8, 0, Math.PI*2);
        ctx.fill();
    });
    
    // Draw Players (Astronauts)
    let me = players[myId];
    
    Object.values(players).forEach(p => {
        if (p.isDead && (!me.isDead)) return;
        
        ctx.fillStyle = p.isDead ? 'rgba(255,255,255,0.4)' : p.color;
        
        // Backpack
        ctx.beginPath();
        ctx.roundRect(p.x - 22, p.y - 12, 10, 28, 5);
        ctx.fill();
        
        // Body (Capsule)
        ctx.beginPath();
        ctx.roundRect(p.x - 16, p.y - 22, 32, 44, 16);
        ctx.fill();
        
        // Legs
        ctx.fillRect(p.x - 12, p.y + 10, 10, 15); // Left leg
        ctx.fillRect(p.x + 2, p.y + 10, 10, 15);  // Right leg
        
        if (targetPlayer && targetPlayer.id === p.id) {
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 3;
            ctx.strokeRect(p.x - 25, p.y - 25, 50, 55);
        }
        
        // Visor
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.roundRect(p.x - 4, p.y - 14, 20, 14, 7);
        ctx.fill();
        // Visor Highlight
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.roundRect(p.x + 4, p.y - 12, 8, 4, 2);
        ctx.fill();
        
        // Player Name
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(p.name, p.x, p.y - 30);
    });
    
    ctx.restore();
    
    // Vision Fog (Simple Circle)
    if (!me.isDead) {
        const cx = canvas.width/2;
        const cy = canvas.height/2;
        const visionRadius = myRole === 'IMPOSTOR' ? 400 : 250;
        
        ctx.globalCompositeOperation = 'destination-in';
        let grad = ctx.createRadialGradient(cx, cy, visionRadius*0.5, cx, cy, visionRadius);
        grad.addColorStop(0, 'rgba(0,0,0,1)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, visionRadius, 0, Math.PI*2);
        ctx.fill();
        
        ctx.globalCompositeOperation = 'source-over';
    }
}

// --- MEETING LOGIC ---
let meetingInterval = null;

function startMeeting(callerName) {
    gameState = 'MEETING';
    meetingData = { caller: callerName, timer: 60, votes: {}, chat: [] };
    
    // Teleport alive players to Cafeteria
    Object.values(players).forEach(p => {
        if (!p.isDead) {
            p.x = 600 + Math.random()*50;
            p.y = 200 + Math.random()*50;
        }
    });
    
    broadcast({ type: 'UPDATE_STATE', gameState, players, meetingData });
    startMeetingClient(meetingData);
    
    if (isHost) {
        if (meetingInterval) clearInterval(meetingInterval);
        meetingInterval = setInterval(() => {
            meetingData.timer--;
            broadcast({ type: 'UPDATE_STATE', meetingData, gameState, players });
            if (meetingData.timer <= 0) checkMeetingEnd();
        }, 1000);
    }
}

function startMeetingClient(data) {
    showScreen('meeting-screen');
    $('chat-messages').innerHTML = `<div class="chat-msg" style="color:var(--danger); text-align:center;">تم طلب اجتماع طارئ بواسطة: ${data.caller}</div>`;
    renderMeetingUI();
}

function renderMeetingUI() {
    if (gameState !== 'MEETING') return;
    
    $('meeting-timer').innerText = meetingData.timer;
    
    // Render Players
    const grid = $('voting-players-grid');
    grid.innerHTML = '';
    
    Object.values(players).forEach(p => {
        const card = document.createElement('div');
        card.className = `player-vote-card ${p.isDead ? 'dead' : ''}`;
        
        // Count votes for this player
        let votesForMe = Object.values(meetingData.votes).filter(v => v === p.id).length;
        let dotsHTML = '<div class="vote-count">' + '<div class="vote-dot"></div>'.repeat(votesForMe) + '</div>';
        
        card.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px;">
                <div class="p-color" style="background:${p.color}"></div>
                <span>${p.name}</span>
            </div>
            ${dotsHTML}
        `;
        
        if (!p.isDead && !players[myId].isDead) {
            card.onclick = () => castVote(p.id);
        }
        
        if (meetingData.votes[myId] === p.id) {
            card.classList.add('selected');
        }
        
        grid.appendChild(card);
    });
    
    // Update skip vote button
    let skipVotes = Object.values(meetingData.votes).filter(v => v === 'skip').length;
    $('skip-vote-btn').innerText = `تخطي التصويت (${skipVotes})`;
    if (meetingData.votes[myId] === 'skip') {
        $('skip-vote-btn').style.borderColor = 'var(--primary)';
        $('skip-vote-btn').style.borderWidth = '2px';
        $('skip-vote-btn').style.borderStyle = 'solid';
    }
    
    // Render Chat (only append new to avoid scroll reset, but for simplicity re-render is okay if array is small)
    // To prevent input loss, only update chat
    const chatContainer = $('chat-messages');
    while (chatContainer.children.length - 1 < meetingData.chat.length) {
        let msg = meetingData.chat[chatContainer.children.length - 1];
        if(!msg) break;
        let el = document.createElement('div');
        el.className = 'chat-msg';
        el.innerHTML = `<span>${msg.sender}:</span> ${msg.text}`;
        chatContainer.appendChild(el);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
}

// Ensure the UI updates when new data comes in
setInterval(() => {
    if (gameState === 'MEETING') renderMeetingUI();
}, 500);

$('skip-vote-btn').onclick = () => {
    if (!players[myId].isDead) castVote('skip');
};

function castVote(targetId) {
    if (meetingData.votes[myId]) return; // Already voted
    
    if (isHost) {
        meetingData.votes[myId] = targetId;
        checkMeetingEnd();
    } else {
        conn.send({ type: 'VOTE', voteTarget: targetId });
        meetingData.votes[myId] = targetId; // Local optimistic update
    }
}

function checkMeetingEnd() {
    if (!isHost) return;
    
    let aliveCount = Object.values(players).filter(p => !p.isDead).length;
    let totalVotes = Object.keys(meetingData.votes).length;
    
    if (totalVotes >= aliveCount || meetingData.timer <= 0) {
        clearInterval(meetingInterval);
        
        // Tally votes
        let counts = { 'skip': 0 };
        Object.values(meetingData.votes).forEach(v => {
            counts[v] = (counts[v] || 0) + 1;
        });
        
        let highestId = null;
        let highestVotes = 0;
        let tie = false;
        
        for (let id in counts) {
            if (counts[id] > highestVotes) {
                highestVotes = counts[id];
                highestId = id;
                tie = false;
            } else if (counts[id] === highestVotes) {
                tie = true;
            }
        }
        
        if (highestId && highestId !== 'skip' && !tie) {
            // Eject player
            players[highestId].isDead = true;
        }
        
        // Clean bodies after meeting
        bodies = [];
        
        // Reset state back to playing
        gameState = 'PLAYING';
        broadcast({ type: 'UPDATE_STATE', gameState, players, bodies });
        
        setTimeout(() => {
            checkWinCondition(); // Check if ejected player was the last impostor
        }, 500);
    }
}

function endMeetingClient() {
    showScreen('game-screen');
    requestAnimationFrame(gameLoopClient); // Resume loop
}

$('chat-send-btn').onclick = () => {
    let text = $('chat-input').value.trim();
    if (!text) return;
    
    if (isHost) {
        meetingData.chat.push({ sender: players[myId].name, text });
    } else {
        conn.send({ type: 'CHAT', text });
    }
    $('chat-input').value = '';
};
$('chat-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') $('chat-send-btn').click();
});
