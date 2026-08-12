// ============================================================
// SUPER SIGNALING SERVER — Sonic Boom Multiplayer Backend
// WebSocket session management + movement/action relay
// + WebRTC voice signaling relay + Eggman event system
// ============================================================

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// ------------------------------------------------------------
// In-memory stores (swap for Redis in prod for horizontal scale)
// ------------------------------------------------------------
const sessions = new Map();         // code -> session
const playerBySocket = new Map();   // socketId -> playerId
const playerToSocket = new Map();   // playerId -> socketId

const CHARACTERS = ['sonic', 'tails', 'knuckles', 'amy', 'sticks'];

// Base + variant palettes for duplicate-character color resolution
const COLOR_PALETTES = {
    sonic:    [0x1565C0, 0xE91E63, 0x7B1FA2, 0xFF9800],
    tails:    [0xFF8C00, 0x00B8D4, 0xFFD54F, 0x9E9E9E],
    knuckles: [0xCC0000, 0x00C853, 0x651FFF, 0xFF6F00],
    amy:      [0xE91E63, 0x3F51B5, 0xFFAB00, 0x8BC34A],
    sticks:   [0x8B4513, 0x00BCD4, 0xE040FB, 0x66BB6A]
};

const EGGMAN_MIN_MINUTES = 20;
const EGGMAN_MAX_MINUTES = 40;

// ------------------------------------------------------------
// Session lifecycle
// ------------------------------------------------------------
function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code;
    do {
        code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    } while (sessions.has(code));
    return code;
}

function assignColor(session, character) {
    const used = session.players.filter(p => p.character === character).map(p => p.color);
    const palette = COLOR_PALETTES[character] || [0x888888];
    for (const c of palette) {
        if (!used.includes(c)) return c;
    }
    return palette[used.length % palette.length];
}

function scheduleEggman(session) {
    if (session.eggmanTimer) clearTimeout(session.eggmanTimer);
    const minutes = EGGMAN_MIN_MINUTES + Math.random() * (EGGMAN_MAX_MINUTES - EGGMAN_MIN_MINUTES);
    session.eggmanTimer = setTimeout(() => {
        if (sessions.has(session.code) && session.state === 'playing' && !session.eggmanActive) {
            session.eggmanActive = true;
            io.to(session.code).emit('eggman:event', { manual: false, delayMinutes: Math.round(minutes) });
            console.log(`[EGGMAN] Random invasion in ${session.code} (after ${Math.round(minutes)}m)`);
        }
    }, minutes * 60 * 1000);
}

function createSession(name, character, requestedCode) {
    const code = requestedCode && /^[A-Z0-9]{4,8}$/.test(requestedCode) && !sessions.has(requestedCode)
        ? requestedCode
        : generateCode();
    const session = {
        code,
        hostSecret: Math.random().toString(36).slice(2) + Date.now().toString(36),
        hostSocketId: null,
        createdAt: Date.now(),
        eggmanTimer: null,
        eggmanActive: false,
        players: [],
        nextPlayerId: 1,
        state: 'lobby'
    };
    sessions.set(code, session);
    return session;
}

function registerPlayer(session, socket, name, character, isHost) {
    const player = {
        id: 'p' + session.nextPlayerId++,
        name,
        character,
        color: isHost ? COLOR_PALETTES[character][0] : assignColor(session, character),
        isHost,
        ready: false,
        position: null
    };
    session.players.push(player);
    playerBySocket.set(socket.id, player.id);
    playerToSocket.set(player.id, socket.id);
    return player;
}

function unregisterPlayer(session, socketId) {
    const playerId = playerBySocket.get(socketId);
    if (!playerId) return null;
    const player = session.players.find(p => p.id === playerId) || null;
    if (player) session.players.splice(session.players.indexOf(player), 1);
    playerBySocket.delete(socketId);
    playerToSocket.delete(playerId);
    return player;
}

function getSession(socket) {
    const playerId = playerBySocket.get(socket.id);
    if (!playerId) return null;
    for (const session of sessions.values()) {
        if (session.players.some(p => p.id === playerId)) return session;
    }
    return null;
}

function getPlayer(session, socket) {
    const playerId = playerBySocket.get(socket.id);
    return session.players.find(p => p.id === playerId) || null;
}

// ------------------------------------------------------------
// Socket handlers
// ------------------------------------------------------------
io.on('connection', (socket) => {
    socket.on('create-session', (data, ack) => {
        const name = (data && data.name || 'Player').toString().slice(0, 20);
        const character = CHARACTERS.includes(data && data.character) ? data.character : 'sonic';
        const requestedCode = data && data.requestedCode ? data.requestedCode.toString().toUpperCase() : null;

        const session = createSession(name, character, requestedCode);
        session.hostSocketId = socket.id;
        socket.join(session.code);

        const player = registerPlayer(session, socket, name, character, true);
        scheduleEggman(session);

        if (ack) ack({
            ok: true,
            code: session.code,
            hostSecret: session.hostSecret,
            playerId: player.id,
            players: session.players
        });
        console.log(`[CREATE] ${name} hosted ${session.code}`);
    });

    socket.on('join-session', (data, ack) => {
        const code = (data && data.code || '').toString().trim().toUpperCase();
        const name = (data && data.name || 'Player').toString().slice(0, 20);
        const character = CHARACTERS.includes(data && data.character) ? data.character : 'sonic';

        const session = sessions.get(code);
        if (!session) {
            if (ack) ack({ ok: false, error: 'Session not found. Check the code.' });
            return;
        }
        if (session.players.length >= 8) {
            if (ack) ack({ ok: false, error: 'Session is full (max 8 players).' });
            return;
        }
        if (session.players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
            if (ack) ack({ ok: false, error: 'That name is already taken.' });
            return;
        }

        socket.join(code);
        const player = registerPlayer(session, socket, name, character, false);

        if (ack) ack({
            ok: true,
            code,
            hostSecret: null,
            playerId: player.id,
            players: session.players,
            eggmanActive: session.eggmanActive
        });

        io.to(code).emit('player:joined', { player });
        io.to(code).emit('lobby:update', { players: session.players });
        console.log(`[JOIN] ${name} joined ${code} as ${character}`);
    });

    // Lobby: change character / ready state
    socket.on('lobby:select', (data, ack) => {
        const session = getSession(socket);
        const player = getPlayer(session, socket);
        if (!session || !player) return;

        if (data && data.character && CHARACTERS.includes(data.character)) {
            player.character = data.character;
            player.color = assignColor(session, data.character);
        }
        if (data && data.ready !== undefined) player.ready = !!data.ready;

        io.to(session.code).emit('lobby:update', { players: session.players });
        if (ack) ack({ ok: true, players: session.players });
    });

    // Host starts the game (authorized via hostSecret)
    socket.on('game:start', (data, ack) => {
        const session = getSession(socket);
        if (!session) return;
        if (!data || data.hostSecret !== session.hostSecret) {
            if (ack) ack({ ok: false, error: 'Only the host can start the game.' });
            return;
        }
        session.state = 'playing';
        io.to(session.code).emit('game:started', { players: session.players });
        if (ack) ack({ ok: true });
        console.log(`[START] Session ${session.code} started`);
    });

    // Host manually triggers Eggman (hidden admin command)
    socket.on('eggman:trigger', (data, ack) => {
        const session = getSession(socket);
        if (!session) return;
        if (!data || data.hostSecret !== session.hostSecret) {
            if (ack) ack({ ok: false, error: 'Only the host can trigger Eggman.' });
            return;
        }
        if (session.eggmanActive) {
            if (ack) ack({ ok: false, error: 'Eggman is already invading!' });
            return;
        }
        session.eggmanActive = true;
        scheduleEggman(session); // resets the random timer for the next window
        io.to(session.code).emit('eggman:event', { manual: true, triggeredBy: data.triggeredBy || 'host' });
        if (ack) ack({ ok: true });
        console.log(`[EGGMAN] Manual trigger in ${session.code}`);
    });

    // Movement / action relay (throttled client-side, ~15Hz)
    socket.on('move', (data) => {
        const session = getSession(socket);
        const player = getPlayer(session, socket);
        if (!session || !player || !data) return;
        player.position = data.pos || player.position;
        socket.to(session.code).emit('player:move', {
            playerId: player.id,
            t: data.t || 0,
            pos: data.pos || null,
            rot: data.rot || null,
            anim: data.anim || 'idle',
            emote: data.emote || null
        });
    });

    // WebRTC voice signaling relay (proximity voice = WebRTC mesh)
    socket.on('voice:signal', (data) => {
        const session = getSession(socket);
        const player = getPlayer(session, socket);
        if (!session || !player || !data) return;
        const targetId = playerToSocket.get(data.targetId);
        if (!targetId) return;
        io.to(targetId).emit('voice:signal', {
            fromId: player.id,
            fromName: player.name,
            signal: data.signal
        });
    });

    // Chat relay
    socket.on('chat', (data) => {
        const session = getSession(socket);
        const player = getPlayer(session, socket);
        if (!session || !player || !data) return;
        const text = (data.message || '').toString().slice(0, 200);
        io.to(session.code).emit('chat', { fromId: player.id, fromName: player.name, message: text });
    });

    // Generic message relay (used by the Angular MultiplayerService / arcade games)
    socket.on('message', (data) => {
        const session = getSession(socket);
        const player = getPlayer(session, socket);
        if (!session || !player || !data) return;
        socket.to(session.code).emit('message', { fromId: player.id, fromName: player.name, data });
    });

    // Eggman defeated — reset state
    socket.on('eggman:defeated', (data, ack) => {
        const session = getSession(socket);
        if (!session) return;
        if (!data || data.hostSecret !== session.hostSecret) {
            if (ack) ack({ ok: false, error: 'Only the host can reset Eggman.' });
            return;
        }
        session.eggmanActive = false;
        scheduleEggman(session);
        io.to(session.code).emit('eggman:cleared');
        if (ack) ack({ ok: true });
        console.log(`[EGGMAN] Defeated in ${session.code}, next window scheduled`);
    });

    socket.on('disconnect', () => {
        const session = getSession(socket);
        if (!session) return;
        const player = unregisterPlayer(session, socket.id);

        if (player) {
            io.to(session.code).emit('player:left', { playerId: player.id, name: player.name });
            io.to(session.code).emit('lobby:update', { players: session.players });
        }

        // Host disconnected → promote next player, or close session
        if (socket.id === session.hostSocketId) {
            if (session.players.length > 0) {
                const newHost = session.players[0];
                newHost.isHost = true;
                session.hostSecret = Math.random().toString(36).slice(2) + Date.now().toString(36);
                session.hostSocketId = playerToSocket.get(newHost.id);
                io.to(session.code).emit('host:promoted', { playerId: newHost.id });
                io.to(session.code).emit('lobby:update', { players: session.players });
                console.log(`[HOST] Promoted ${newHost.name} in ${session.code}`);
            } else {
                if (session.eggmanTimer) clearTimeout(session.eggmanTimer);
                sessions.delete(session.code);
                console.log(`[CLOSE] Session ${session.code} closed`);
            }
        }
        if (player) console.log(`[LEFT] ${player.name} left ${session.code}`);
    });
});

// ------------------------------------------------------------
// HTTP endpoints (lobby status / health)
// ------------------------------------------------------------
app.get('/health', (req, res) => {
    res.json({ ok: true, sessions: sessions.size, players: playerBySocket.size });
});

app.get('/api/session/:code', (req, res) => {
    const session = sessions.get((req.params.code || '').toUpperCase());
    if (!session) return res.status(404).json({ error: 'not_found' });
    res.json({
        code: session.code,
        state: session.state,
        eggmanActive: session.eggmanActive,
        players: session.players.map(p => ({
            id: p.id, name: p.name, character: p.character,
            color: p.color, isHost: p.isHost, ready: p.ready
        }))
    });
});

// ------------------------------------------------------------
// Startup
// ------------------------------------------------------------
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Super signaling server running on port ${PORT}`);
    console.log(`  Eggman invasion window: ${EGGMAN_MIN_MINUTES}-${EGGMAN_MAX_MINUTES} min`);
});
