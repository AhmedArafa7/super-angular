// =========================================================
// Lethal Company 3D - Overhauled Game Logic
// =========================================================

// UI Elements
const mainMenu = document.getElementById('main-menu');
const p2pMenu = document.getElementById('p2p-menu');
const gameHud = document.getElementById('game-hud');
const gameOverScreen = document.getElementById('game-over-screen');
const crosshair = document.getElementById('crosshair');
const pauseOverlay = document.getElementById('pause-overlay');
const interactionHint = document.getElementById('interaction-hint');
const shipHubScreen = document.getElementById('ship-hub-screen');

const modeBtns = document.querySelectorAll('.mode-btn');
const createRoomBtn = document.getElementById('create-room-btn');
const joinRoomBtn = document.getElementById('join-room-btn');
const backToMenuBtn = document.getElementById('back-to-menu-btn');
const joinRoomIdInput = document.getElementById('join-room-id');
const roomIdDisplay = document.getElementById('roomIdDisplay');
const roomInfo = document.getElementById('room-info');
const startGameBtn = document.getElementById('start-game-btn');
const joinError = document.getElementById('join-error');
const toastEl = document.getElementById('toast');

const quotaCollectedEl = document.getElementById('quota-collected');
const quotaTargetEl = document.getElementById('quota-target');
const scrapValueEl = document.getElementById('scrap-value');
const timeDisplay = document.getElementById('time-display');
const batteryFill = document.getElementById('battery-fill');
const hudDaysLeft = document.getElementById('hud-days-left');

const hubQuota = document.getElementById('hub-quota');
const hubCollected = document.getElementById('hub-collected');
const hubDays = document.getElementById('hub-days');
const moonBtns = document.querySelectorAll('.moon-btn');
const terminalWaiting = document.getElementById('terminal-waiting');

// Overhauled UI Elements
const terminalCredits = document.getElementById('terminal-credits');
const ownedItemsEl = document.getElementById('owned-items');
const launchLeverBtn = document.getElementById('launch-lever-btn');
const descentLoader = document.getElementById('descent-loader');
const descentProgressFill = document.getElementById('descent-progress-fill');
const walkieOverlay = document.getElementById('walkie-overlay');
const walkieMessages = document.getElementById('walkie-messages');
const walkieInput = document.getElementById('walkie-input');
const oxygenBarFill = document.getElementById('oxygen-bar-fill');
const weightBarFill = document.getElementById('weight-bar-fill');
const radarDoorBtn = document.getElementById('radar-door-btn');

// Game State
let activeMode = 'single';
let peer = null;
let conn = null;
let isHost = true;
let myId = 'p1';
let isGameRunning = false;

// 3D Engine Variables
let scene, camera, renderer, controls;
let flashlight, ambientLight, warningLight;
const objects = []; // Physical walls
let scraps3D = []; // Scrap meshes
let monsters3D = []; // Monster meshes
let otherPlayers3D = {}; // Other players' meshes
let keycardDoors3D = []; // Electronic doors in maze

// Cockpit Interactive Meshes
let leverMesh = null;
let monitorMesh = null;
let subDoorMesh = null;

// Movement
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let isSprinting = false;
let isCrouching = false;
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();

// Player gameplay state
let credits = 60;
let ownedItems = []; // 'flashlight', 'walkie', 'oxygen', 'taser'
let oxygen = 100;
let maxOxygen = 100;
let weight = 0;
let subState = 'SUB_HUB'; // 'SUB_HUB', 'DESCENT', 'DOCKED', 'EXTRACTION'
let descentProgress = 0;
let descentShake = 0;
let stepTimer = 0;
let taserCooldown = 0;

let myState = { 
    x: 0, y: 1.5, z: 0, rx: 0, ry: 0, 
    scrap: 0, battery: 100, isDead: false, 
    isFlashlightOn: false, oxygen: 100, weight: 0 
};
let globalCollected = 0;
let globalQuota = 130;
let daysLeft = 3; 

let timeRemaining = 600; // 10 minutes shift limit (600s)
let lastTime = performance.now();
let selectedMoon = 'experimentation';
let totalCollected = 0; // Scrap on ship

const MOONS = {
    'experimentation': { name: 'منشأة الاختبار الغارقة', fogDensity: 0.18, fogColor: 0x051008, monsters: 3, scrapRate: 0.06, speedMult: 1 },
    'vow': { name: 'ممرات الطحالب الكثيفة', fogDensity: 0.22, fogColor: 0x0d2012, monsters: 5, scrapRate: 0.08, speedMult: 1.2 },
    'titan': { name: 'هاوية تيتان العميقة', fogDensity: 0.25, fogColor: 0x010803, monsters: 8, scrapRate: 0.11, speedMult: 1.6 }
};

// Map Settings
const TILE_SIZE = 4;
const MAP_COLS = 25;
const MAP_ROWS = 25;
let mapGrid = [];

// Dynamic Canvas-based Textures
let wallTexture, subWallTexture, waterTexture;

// =========================================================
// AUDIO SYSTEM (Web Audio API Synthesizer)
// =========================================================
const AudioSynth = {
    ctx: null,
    humNode: null,
    humGain: null,
    
    init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.startEngineHum();
        this.startAmbientDrips();
    },
    
    startEngineHum() {
        try {
            this.humNode = this.ctx.createOscillator();
            this.humGain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();
            
            this.humNode.type = 'sawtooth';
            this.humNode.frequency.setValueAtTime(55, this.ctx.currentTime); // Low engine hum (55Hz)
            
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(90, this.ctx.currentTime);
            
            this.humGain.gain.setValueAtTime(0.04, this.ctx.currentTime);
            
            this.humNode.connect(filter);
            filter.connect(this.humGain);
            this.humGain.connect(this.ctx.destination);
            
            this.humNode.start();
        } catch (e) {
            console.error("Engine hum error:", e);
        }
    },
    
    setHumPitch(freq) {
        if (this.humNode && this.ctx) {
            this.humNode.frequency.exponentialRampToValueAtTime(freq, this.ctx.currentTime + 0.3);
        }
    },
    
    setHumVolume(vol) {
        if (this.humGain && this.ctx) {
            this.humGain.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + 0.2);
        }
    },
    
    playLever() {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(250, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.4);
        
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.4);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.4);
    },
    
    playSplash(crouching) {
        if (!this.ctx) return;
        // White noise splash
        const bufferSize = this.ctx.sampleRate * 0.15;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(crouching ? 200 : 350, this.ctx.currentTime);
        filter.Q.setValueAtTime(4, this.ctx.currentTime);
        
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(crouching ? 0.02 : 0.08, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.15);
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start();
    },
    
    playDock() {
        if (!this.ctx) return;
        // Low explosive collision sound
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(80, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(10, this.ctx.currentTime + 1.2);
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(60, this.ctx.currentTime);
        
        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 1.2);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 1.2);
    },
    
    playShriek() {
        if (!this.ctx) return;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(400, this.ctx.currentTime);
        osc1.frequency.linearRampToValueAtTime(1200, this.ctx.currentTime + 0.5);
        
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(410, this.ctx.currentTime);
        osc2.frequency.linearRampToValueAtTime(1210, this.ctx.currentTime + 0.5);
        
        gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.6);
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc1.start();
        osc2.start();
        osc1.stop(this.ctx.currentTime + 0.6);
        osc2.stop(this.ctx.currentTime + 0.6);
    },
    
    playStatic() {
        if (!this.ctx) return;
        const bufferSize = this.ctx.sampleRate * 0.25;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.25);
        
        source.connect(gain);
        gain.connect(this.ctx.destination);
        source.start();
    },

    startAmbientDrips() {
        setInterval(() => {
            if (!isGameRunning || !this.ctx || subState === 'SUB_HUB') return;
            // Dripping sound
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(3000, this.ctx.currentTime + 0.05);
            
            gain.gain.setValueAtTime(Math.random() * 0.02 + 0.01, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.1);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.1);
        }, 3000 + Math.random() * 4000);
    }
};

// =========================================================
// TEXTURE GENERATION
// =========================================================
function createDynamicTextures() {
    // 1. Rusty Wall Texture
    let canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    let ctx = canvas.getContext('2d');
    ctx.fillStyle = '#444444';
    ctx.fillRect(0,0,128,128);
    // Draw vertical sheets
    ctx.fillStyle = '#222222';
    for (let i = 0; i < 128; i += 16) {
        ctx.fillRect(i, 0, 2, 128);
    }
    // Draw random orange rust spots
    for (let i = 0; i < 40; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#b45309' : '#78350f';
        ctx.beginPath();
        ctx.arc(Math.random()*128, Math.random()*128, Math.random()*8+2, 0, Math.PI*2);
        ctx.fill();
    }
    wallTexture = new THREE.CanvasTexture(canvas);
    wallTexture.wrapS = THREE.RepeatWrapping;
    wallTexture.wrapT = THREE.RepeatWrapping;
    
    // 2. Submarine metal texture
    canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 128, 128);
    // Panels & rivets
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    ctx.strokeRect(4, 4, 120, 120);
    ctx.fillStyle = '#64748b';
    for (let i = 8; i < 128; i += 16) {
        ctx.beginPath(); ctx.arc(i, 8, 2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(i, 120, 2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(8, i, 2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(120, i, 2, 0, Math.PI*2); ctx.fill();
    }
    subWallTexture = new THREE.CanvasTexture(canvas);

    // 3. Water Texture
    canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(6, 182, 212, 0.4)';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    for (let i=0; i<5; i++) {
        ctx.fillRect(Math.random()*64, Math.random()*64, Math.random()*20+5, 2);
    }
    waterTexture = new THREE.CanvasTexture(canvas);
    waterTexture.wrapS = THREE.RepeatWrapping;
    waterTexture.wrapT = THREE.RepeatWrapping;
    waterTexture.repeat.set(2, 2);
}

// =========================================================
// INITIALIZE GAME
// =========================================================
function loadProgress() {
    const saved = localStorage.getItem('lethalCompanyProgress');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            globalCollected = data.globalCollected ?? 0;
            globalQuota = data.globalQuota ?? 130;
            daysLeft = data.daysLeft ?? 3;
            credits = data.credits ?? 60;
            ownedItems = data.ownedItems ?? [];
        } catch(e) {}
    }
}

function saveProgress() {
    localStorage.setItem('lethalCompanyProgress', JSON.stringify({
        globalCollected, globalQuota, daysLeft, credits, ownedItems
    }));
}

loadProgress();

// Menu Setup
modeBtns.forEach(btn => btn.addEventListener('click', () => {
    activeMode = btn.dataset.mode;
    AudioSynth.init();
    if (activeMode === 'p2p') {
        showScreen(p2pMenu);
    } else {
        isHost = true;
        myId = 'p1';
        startGame();
    }
}));

backToMenuBtn.addEventListener('click', () => {
    if (peer) peer.destroy();
    showScreen(mainMenu);
});

// P2P Setup
createRoomBtn.addEventListener('click', () => {
    activeMode = 'p2p-host';
    isHost = true;
    myId = 'p1';
    createRoomBtn.classList.add('hidden');
    roomInfo.classList.remove('hidden');
    
    peer = new Peer();
    peer.on('open', id => { roomIdDisplay.innerText = id; });
    peer.on('connection', connection => {
        conn = connection;
        setupConnection();
        showToast("انضم زميل للطاقم!");
        startGameBtn.classList.remove('hidden');
    });
});

startGameBtn.addEventListener('click', () => startGame());

joinRoomBtn.addEventListener('click', () => {
    const hostId = joinRoomIdInput.value.trim();
    if(!hostId) return;
    
    activeMode = 'p2p-join';
    isHost = false;
    myId = 'p2';
    joinRoomBtn.disabled = true;
    joinError.classList.add('hidden');
    
    peer = new Peer();
    peer.on('open', () => {
        conn = peer.connect(hostId);
        conn.on('open', () => {
            setupConnection();
            showToast("تم الانضمام! بانتظار المضيف للبدء...");
        });
        conn.on('error', () => {
            joinError.classList.remove('hidden');
            joinRoomBtn.disabled = false;
        });
    });
});

function setupConnection() {
    conn.on('data', data => {
        if (data.type === 'game_start') {
            mapGrid = data.mapGrid;
            startGameClient(data.scraps, data.moonId);
        }
        else if (data.type === 'update_state') {
            if (data.playerState) updateOtherPlayer(data.playerId, data.playerState);
            if (isHost === false) {
                if (data.monsters) updateMonsters(data.monsters);
                if (data.scraps) syncScraps(data.scraps);
                if (data.totalCollected !== undefined) totalCollected = data.totalCollected;
                if (data.subState) syncSubState(data.subState, data.descentProgress);
            }
        }
        else if (data.type === 'game_over') {
            triggerGameOver(data.won, data.score);
        }
        else if (data.type === 'enter_hub') {
            globalQuota = data.globalQuota;
            globalCollected = data.globalCollected;
            daysLeft = data.daysLeft;
            credits = data.credits;
            updateHubUI();
            showScreen(shipHubScreen);
            terminalWaiting.classList.remove('hidden');
            launchLeverBtn.classList.add('hidden');
        }
        else if (data.type === 'leave_moon') {
            endDayClient(data);
        }
        else if (data.type === 'lever_pull') {
            triggerDescent();
        }
        else if (data.type === 'door_toggle') {
            toggleKeycardDoors();
        }
        else if (data.type === 'walkie_msg') {
            displayWalkieMessage(data.sender, data.text);
        }
    });
    
    conn.on('close', () => {
        showToast("انقطع الاتصال بالطاقم!");
        if (isGameRunning) {
            document.exitPointerLock();
            setTimeout(() => location.reload(), 2000);
        }
    });
}

function broadcastState() {
    if (conn && conn.open) {
        let payload = {
            type: 'update_state',
            playerId: myId,
            playerState: myState
        };
        if (isHost) {
            payload.monsters = monsters3D.map(m => ({
                x: m.position.x, 
                z: m.position.z, 
                type: m.userData.type,
                angry: m.userData.angry
            }));
            payload.scraps = scraps3D.filter(s => !s.userData.isPickedUp).map(s => ({id: s.userData.id, isPickedUp: s.userData.isPickedUp}));
            payload.totalCollected = totalCollected;
            payload.subState = subState;
            payload.descentProgress = descentProgress;
        }
        conn.send(payload);
    }
}

// =========================================================
// 3D SCENE SETUP & ENGINE
// =========================================================
function init3D() {
    const container = document.getElementById('game-container');
    createDynamicTextures();
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.FogExp2(0x000000, 0.25); // Water/Fog density

    camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    ambientLight = new THREE.AmbientLight(0x051108);
    scene.add(ambientLight);

    // Warning spinning red light in cockpit
    warningLight = new THREE.PointLight(0xef4444, 0, 8);
    scene.add(warningLight);

    scene.add(camera);

    // Spotlight flashlight
    flashlight = new THREE.SpotLight(0xfffaed, 0); // Start OFF
    flashlight.position.set(0, 0, 0);
    flashlight.target.position.set(0, 0, -1);
    flashlight.angle = Math.PI / 4.5;
    flashlight.penumbra = 0.6;
    flashlight.decay = 2;
    flashlight.distance = 25;
    camera.add(flashlight);
    camera.add(flashlight.target);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    controls = new THREE.PointerLockControls(camera, document.body);

    pauseOverlay.addEventListener('click', () => {
        if(isGameRunning && subState !== 'SUB_HUB') controls.lock();
    });

    controls.addEventListener('lock', () => {
        pauseOverlay.classList.add('hidden');
        crosshair.classList.remove('hidden');
    });

    controls.addEventListener('unlock', () => {
        if(isGameRunning && subState !== 'SUB_HUB') {
            pauseOverlay.classList.remove('hidden');
            crosshair.classList.add('hidden');
        }
    });

    window.addEventListener('resize', onWindowResize, false);
    
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousedown', onMouseDown);
    
    setupMobileControls();
}

function onWindowResize() {
    if(!camera) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Controls
function onKeyDown(event) {
    if (!isGameRunning) return;
    switch (event.code) {
        case 'ArrowUp':
        case 'KeyW': moveForward = true; break;
        case 'ArrowLeft':
        case 'KeyA': moveLeft = true; break;
        case 'ArrowDown':
        case 'KeyS': moveBackward = true; break;
        case 'ArrowRight':
        case 'KeyD': moveRight = true; break;
        case 'ShiftLeft': isSprinting = true; break;
        case 'KeyC':
        case 'ControlLeft': 
            isCrouching = !isCrouching; 
            controls.getObject().position.y = isCrouching ? 0.8 : 1.5;
            break;
        case 'KeyE': 
            tryInteract(); 
            break;
        case 'KeyQ':
            tryUseTaser();
            break;
    }
}

function onKeyUp(event) {
    if (!isGameRunning) return;
    switch (event.code) {
        case 'ArrowUp':
        case 'KeyW': moveForward = false; break;
        case 'ArrowLeft':
        case 'KeyA': moveLeft = false; break;
        case 'ArrowDown':
        case 'KeyS': moveBackward = false; break;
        case 'ArrowRight':
        case 'KeyD': moveRight = false; break;
        case 'ShiftLeft': isSprinting = false; break;
    }
}

function onMouseDown(event) {
    if (!isGameRunning) return;
    if (event.button === 0 && !myState.isDead && myState.battery > 0 && ownedItems.includes('flashlight')) {
        myState.isFlashlightOn = !myState.isFlashlightOn;
        flashlight.intensity = myState.isFlashlightOn ? 1.8 : 0;
        AudioSynth.playStatic();
    }
}

// =========================================================
// GAME STAGINGS & NAVIGATION
// =========================================================
function startGame() {
    AudioSynth.init();
    updateHubUI();
    showScreen(shipHubScreen);
    
    // Toggle Lever availability based on host status
    if (isHost) {
        launchLeverBtn.classList.remove('hidden');
        terminalWaiting.classList.add('hidden');
    } else {
        launchLeverBtn.classList.add('hidden');
        terminalWaiting.classList.remove('hidden');
    }

    if(activeMode === 'p2p-host' && conn && conn.open) {
        conn.send({ 
            type: 'enter_hub', 
            globalQuota, 
            globalCollected, 
            daysLeft,
            credits
        });
    }
    initShopListeners();
}

function startGameLevel(moonId) {
    subState = 'SUB_HUB';
    isSubDoorOpen = false;
    doorOpenAmount = 0;
    
    if(!scene) init3D();
    generateMap();
    build3DEnvironment(moonId);
    
    let scrapData = spawnScraps(moonId);
    if(isHost) spawnMonsters(moonId);
    
    if (activeMode === 'p2p-host' && conn && conn.open) {
        conn.send({ type: 'game_start', mapGrid: mapGrid, scraps: scrapData, moonId: moonId });
    }
    
    postStartGame(moonId);
}

function startGameClient(scrapData, moonId) {
    subState = 'DESCENT';
    isSubDoorOpen = false;
    doorOpenAmount = 0;
    
    if(!scene) init3D();
    build3DEnvironment(moonId);
    buildScrapsFromData(scrapData);
    postStartGame(moonId);
    
    // Show descent overlay for client too
    descentProgress = 0;
    descentLoader.classList.remove('hidden');
    launchLeverBtn.classList.add('hidden');
    terminalWaiting.classList.add('hidden');
}

function postStartGame(moonId) {
    const moonConfig = MOONS[moonId] || MOONS['experimentation'];
    scene.fog.color.setHex(moonConfig.fogColor);
    scene.fog.far = 25; // Closer visible range in sub state
    scene.background.setHex(moonConfig.fogColor);

    myState.scrap = 0;
    myState.battery = 100;
    myState.isDead = false;
    myState.isFlashlightOn = false;
    flashlight.intensity = 0;
    
    oxygen = ownedItems.includes('oxygen') ? 200 : 100;
    maxOxygen = oxygen;
    weight = 0;
    
    totalCollected = 0;
    timeRemaining = 600; // 10 minutes

    // Spawn player in the submarine center tile
    const cx = Math.floor(MAP_COLS / 2) * TILE_SIZE;
    const cz = Math.floor(MAP_ROWS / 2) * TILE_SIZE;
    
    controls.getObject().position.set(cx, 1.5, cz);
    
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    gameHud.classList.remove('hidden');
    crosshair.classList.remove('hidden');
    
    // Show Walkie Talkie UI if purchased
    if(ownedItems.includes('walkie')) {
        walkieOverlay.classList.remove('hidden');
    } else {
        walkieOverlay.classList.add('hidden');
    }

    isGameRunning = true;
    lastTime = performance.now();
    
    // Sub-Hub state: don't lock pointer immediately so player can use HTML interface
    showScreen(shipHubScreen); 
    AudioSynth.setHumVolume(0.04);
    
    animate();
}

// Lever trigger
function tryLeverPull() {
    if (!isHost) return;
    if (subState === 'SUB_HUB') {
        triggerDescent();
        if (conn && conn.open) conn.send({ type: 'lever_pull' });
    }
}

function triggerDescent() {
    subState = 'DESCENT';
    descentProgress = 0;
    AudioSynth.playLever();
    AudioSynth.setHumPitch(120);
    AudioSynth.setHumVolume(0.12);
    
    descentLoader.classList.remove('hidden');
    launchLeverBtn.classList.add('hidden');
    terminalWaiting.classList.add('hidden');

    if (isHost) {
        startGameLevel(selectedMoon);
        subState = 'DESCENT'; // override startGameLevel's SUB_HUB reset
    }
}

// =========================================================
// SHOP & GEAR INVENTORY
// =========================================================
function initShopListeners() {
    // Moon/Facility Selection Click Listeners
    const moonBtnsList = document.querySelectorAll('.moon-btn');
    moonBtnsList.forEach(btn => {
        btn.onclick = () => {
            if (!isHost) {
                showToast("المضيف فقط يمكنه تحديد وجهة الرحلة!");
                return;
            }
            selectedMoon = btn.dataset.moon;
            moonBtnsList.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            AudioSynth.playLever(); // Click sound
            showToast(`تم تحديد وجهة الرحلة: ${MOONS[selectedMoon].name}`);
        };
    });

    document.querySelectorAll('.shop-buy-btn').forEach(btn => {
        btn.onclick = () => {
            const item = btn.dataset.item;
            const prices = { flashlight: 15, walkie: 10, oxygen: 25, taser: 30 };
            const cost = prices[item];
            
            if (credits >= cost) {
                if (ownedItems.includes(item)) {
                    showToast("أنت تمتلك هذه المعدات بالفعل!");
                    return;
                }
                credits -= cost;
                ownedItems.push(item);
                saveProgress();
                updateHubUI();
                AudioSynth.playLever();
                showToast(`تم شراء: ${item.toUpperCase()}!`);
            } else {
                showToast("الرصيد غير كافٍ للشركة!");
            }
        };
    });

    launchLeverBtn.onclick = () => tryLeverPull();
    
    walkieInput.onkeydown = (e) => {
        if(e.key === 'Enter') {
            const val = walkieInput.value.trim();
            if(!val) return;
            sendWalkieMessage(val);
            walkieInput.value = '';
        }
    };

    radarDoorBtn.onclick = () => {
        if (isHost) {
            toggleKeycardDoors();
        } else if (conn && conn.open) {
            conn.send({ type: 'door_toggle' });
        }
    };
}

function updateHubUI() {
    hubQuota.innerText = globalQuota;
    hubCollected.innerText = globalCollected;
    hubDays.innerText = daysLeft;
    terminalCredits.innerText = credits;
    
    ownedItemsEl.innerHTML = '';
    if (ownedItems.length === 0) {
        ownedItemsEl.innerText = '- لا يوجد -';
    } else {
        ownedItems.forEach(item => {
            const badge = document.createElement('span');
            badge.className = 'owned-item-badge';
            badge.innerText = item.toUpperCase();
            ownedItemsEl.appendChild(badge);
        });
    }
}

// Walkie messages
function sendWalkieMessage(text) {
    displayWalkieMessage("أنت", text);
    if(conn && conn.open) {
        conn.send({ type: 'walkie_msg', sender: myId === 'p1' ? 'لاعب 1' : 'لاعب 2', text });
    }
}

function displayWalkieMessage(sender, text) {
    AudioSynth.playStatic();
    const p = document.createElement('p');
    // Simulate radio proximity distortion if no walkie owned by receiver
    if(!ownedItems.includes('walkie') && sender !== 'أنت') {
        p.innerText = `${sender}: [تشويش شديد..]`;
    } else {
        p.innerText = `${sender}: ${text}`;
    }
    walkieMessages.appendChild(p);
    walkieMessages.scrollTop = walkieMessages.scrollHeight;
}

// =========================================================
// PROCEDURAL ENGINE GENERATION (FACILITY)
// =========================================================
function generateMap() {
    mapGrid = Array(MAP_ROWS).fill(null).map(() => Array(MAP_COLS).fill(1)); // 1=Wall, 0=Floor, 2=Ship Cockpit
    
    const cx = Math.floor(MAP_COLS/2);
    const cz = Math.floor(MAP_ROWS/2);
    
    // Build Cockpit (5x5 room)
    for(let r = cz - 2; r <= cz + 2; r++) {
        for(let c = cx - 2; c <= cx + 2; c++) {
            mapGrid[r][c] = 2; 
        }
    }
    
    // Spawn randomized mazy corridors starting at the exit boundary
    let x = cx + 3, z = cz;
    mapGrid[z][cx + 2] = 0; // Entrance tile connecting cockpit to facility
    
    for(let i=0; i<700; i++) {
        mapGrid[z][x] = 0;
        let dir = Math.floor(Math.random() * 4);
        if (dir === 0 && z > 1) z--;
        if (dir === 1 && z < MAP_ROWS-2) z++;
        if (dir === 2 && x > cx + 2) x--;
        if (dir === 3 && x < MAP_COLS-2) x++;
    }
}

function build3DEnvironment(moonId) {
    // Clear old stuff
    objects.forEach(obj => scene.remove(obj));
    objects.length = 0;
    scraps3D.forEach(obj => scene.remove(obj));
    scraps3D.length = 0;
    monsters3D.forEach(obj => scene.remove(obj));
    monsters3D.length = 0;
    keycardDoors3D.forEach(d => scene.remove(d));
    keycardDoors3D.length = 0;

    // Materials
    const subMat = new THREE.MeshLambertMaterial({ map: subWallTexture });
    const wallMat = new THREE.MeshLambertMaterial({ map: wallTexture });
    const floorMat = new THREE.MeshLambertMaterial({ color: 0x1c1917 }); // Concrete gray
    const ceilMat = new THREE.MeshLambertMaterial({ color: 0x111111 });

    const wallGeo = new THREE.BoxGeometry(TILE_SIZE, TILE_SIZE, TILE_SIZE);
    const floorGeo = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE);
    
    for (let r = 0; r < MAP_ROWS; r++) {
        for (let c = 0; c < MAP_COLS; c++) {
            let px = c * TILE_SIZE;
            let pz = r * TILE_SIZE;
            
            // Floor
            let fMesh = new THREE.Mesh(floorGeo, mapGrid[r][c] === 2 ? subMat : floorMat);
            fMesh.rotation.x = -Math.PI / 2;
            fMesh.position.set(px, 0, pz);
            scene.add(fMesh);
            objects.push(fMesh);
            
            // Wet water ankle plane if in facility
            if (mapGrid[r][c] === 0) {
                let waterPlane = new THREE.Mesh(floorGeo, new THREE.MeshLambertMaterial({
                    map: waterTexture,
                    transparent: true,
                    opacity: 0.55
                }));
                waterPlane.rotation.x = -Math.PI / 2;
                waterPlane.position.set(px, 0.1, pz);
                scene.add(waterPlane);
            }

            // Ceiling
            let cMesh = new THREE.Mesh(floorGeo, mapGrid[r][c] === 2 ? subMat : ceilMat);
            cMesh.rotation.x = Math.PI / 2;
            cMesh.position.set(px, TILE_SIZE, pz);
            scene.add(cMesh);
            objects.push(cMesh);

            // Walls
            if (mapGrid[r][c] === 1) {
                let wall = new THREE.Mesh(wallGeo, wallMat);
                wall.position.set(px, TILE_SIZE / 2, pz);
                scene.add(wall);
                objects.push(wall);
            }
        }
    }

    // Build Cockpit exit doors
    const cx = Math.floor(MAP_COLS / 2);
    const cz = Math.floor(MAP_ROWS / 2);
    const doorGeo = new THREE.BoxGeometry(0.3, TILE_SIZE, TILE_SIZE);
    const doorMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
    subDoorMesh = new THREE.Mesh(doorGeo, doorMat);
    subDoorMesh.position.set((cx + 2) * TILE_SIZE + 2, TILE_SIZE / 2, cz * TILE_SIZE);
    scene.add(subDoorMesh);

    // Build Electronic door in maze
    const keyDoorGeo = new THREE.BoxGeometry(TILE_SIZE, TILE_SIZE, 0.4);
    const keyDoorMat = new THREE.MeshLambertMaterial({ color: 0xef4444, transparent: true, opacity: 0.9 });
    let kDoor = new THREE.Mesh(keyDoorGeo, keyDoorMat);
    kDoor.position.set((cx + 5) * TILE_SIZE, TILE_SIZE/2, cz * TILE_SIZE);
    kDoor.userData = { isOpen: false, ox: (cx + 5) * TILE_SIZE, oz: cz * TILE_SIZE };
    scene.add(kDoor);
    keycardDoors3D.push(kDoor);
}

function spawnScraps(moonId) {
    let scrapData = [];
    const moonConfig = MOONS[moonId] || MOONS['experimentation'];
    const rate = moonConfig.scrapRate;

    // Scraps can be different meshes: Old PC (cube), Power Cell (cylinder), Titanium Bar (narrow box)
    const pcGeo = new THREE.BoxGeometry(0.6, 0.6, 0.5);
    const cellGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.6, 8);
    const titaniumGeo = new THREE.BoxGeometry(0.8, 0.15, 0.3);
    
    let id = 0;
    for(let r = 0; r < MAP_ROWS; r++) {
        for(let c = 0; c < MAP_COLS; c++) {
            if(mapGrid[r][c] === 0 && Math.random() < rate) {
                let px = c * TILE_SIZE + (Math.random() - 0.5) * 1.5;
                let pz = r * TILE_SIZE + (Math.random() - 0.5) * 1.5;
                
                let typeIdx = Math.floor(Math.random() * 3);
                let geo, color, name, value, weightFactor;
                if (typeIdx === 0) {
                    geo = pcGeo; color = 0x64748b; name = "كمبيوتر خردة"; value = Math.floor(Math.random() * 50) + 40; weightFactor = 25;
                } else if (typeIdx === 1) {
                    geo = cellGeo; color = 0x22c55e; name = "بطارية طاقة"; value = Math.floor(Math.random() * 30) + 20; weightFactor = 8;
                } else {
                    geo = titaniumGeo; color = 0xfacc15; name = "سبائك تيتانيوم"; value = Math.floor(Math.random() * 60) + 50; weightFactor = 35;
                }
                
                let mat = new THREE.MeshLambertMaterial({ color: color });
                let mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(px, 0.3, pz);
                mesh.userData = { id, value, weight: weightFactor, name, isPickedUp: false };
                
                scene.add(mesh);
                scraps3D.push(mesh);
                
                scrapData.push({ id, x: px, z: pz, value, weight: weightFactor, name, typeIdx });
                id++;
            }
        }
    }
    return scrapData;
}

function buildScrapsFromData(data) {
    const pcGeo = new THREE.BoxGeometry(0.6, 0.6, 0.5);
    const cellGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.6, 8);
    const titaniumGeo = new THREE.BoxGeometry(0.8, 0.15, 0.3);

    data.forEach(d => {
        let geo;
        let color;
        if (d.typeIdx === 0) { geo = pcGeo; color = 0x64748b; }
        else if (d.typeIdx === 1) { geo = cellGeo; color = 0x22c55e; }
        else { geo = titaniumGeo; color = 0xfacc15; }
        
        let mat = new THREE.MeshLambertMaterial({ color: color });
        let mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(d.x, 0.3, d.z);
        mesh.userData = { id: d.id, value: d.value, weight: d.weight, name: d.name, isPickedUp: false };
        scene.add(mesh);
        scraps3D.push(mesh);
    });
}

function spawnMonsters(moonId) {
    const config = MOONS[moonId] || MOONS['experimentation'];
    
    // Spawn Clickers, Light Eaters, Rushers
    for(let i=0; i<config.monsters; i++) {
        let r, c;
        do {
            r = Math.floor(Math.random() * MAP_ROWS);
            c = Math.floor(Math.random() * MAP_COLS);
        } while(mapGrid[r][c] !== 0); 
        
        let typeIdx = Math.floor(Math.random() * 3);
        let geo, mat, mesh, speed, name, type;
        
        if (typeIdx === 0) {
            // Blind Clicker (Pale human cylinder)
            geo = new THREE.CylinderGeometry(0.4, 0.4, 1.8, 8);
            mat = new THREE.MeshLambertMaterial({ color: 0xe2e8f0 });
            speed = 2.8 * config.speedMult;
            name = "blind_clicker";
            type = "Blind Clicker";
        } else if (typeIdx === 1) {
            // Light Eater (Jellyfish sphere)
            geo = new THREE.SphereGeometry(0.6, 8, 8);
            mat = new THREE.MeshLambertMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.7 });
            speed = 1.4 * config.speedMult;
            name = "light_eater";
            type = "Light Eater";
        } else {
            // Rusher (Spiked red cylinder)
            geo = new THREE.CylinderGeometry(0.45, 0.45, 1.8, 8);
            mat = new THREE.MeshLambertMaterial({ color: 0xef4444 });
            speed = 8.0 * config.speedMult; // Fast charger
            name = "rusher";
            type = "Rusher";
        }
        
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(c * TILE_SIZE, 0.9, r * TILE_SIZE);
        mesh.userData = { 
            speed, name, type, 
            state: 'wander', timer: 0, 
            angry: false, ox: c * TILE_SIZE, oz: r * TILE_SIZE 
        };
        
        scene.add(mesh);
        monsters3D.push(mesh);
    }
}

// =========================================================
// TASER WEAPON MECHANICS
// =========================================================
function tryUseTaser() {
    if (myState.isDead || !ownedItems.includes('taser') || taserCooldown > 0) return;
    
    // Shoots electric beam straight forward
    taserCooldown = 15; // 15s cooldown
    AudioSynth.playShriek(); // Shock sound
    showToast("تم إطلاق الصاعق الكهربائي!");

    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(monsters3D);
    
    if (intersects.length > 0 && intersects[0].distance < 8) {
        let monster = intersects[0].object;
        monster.userData.stunned = 3.5; // Stun for 3.5s
        showToast(`تم صعق كائن: ${monster.userData.type}!`);
    }
}

// =========================================================
// DYNAMIC RADAR ENGINE FOR MONITOR
// =========================================================
function drawRadar() {
    const canvas = document.getElementById('engineer-radar-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0,0,200,200);
    
    // Draw grid bounds
    ctx.strokeStyle = '#14532d';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 200; i += 20) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 200); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(200, i); ctx.stroke();
    }
    
    const factor = 200 / (MAP_COLS * TILE_SIZE);
    
    // Draw Walls in dark green
    ctx.fillStyle = '#062f17';
    for (let r = 0; r < MAP_ROWS; r++) {
        for (let c = 0; c < MAP_COLS; c++) {
            if (mapGrid[r][c] === 1) {
                ctx.fillRect(c * TILE_SIZE * factor, r * TILE_SIZE * factor, TILE_SIZE * factor, TILE_SIZE * factor);
            }
        }
    }
    
    // Draw player white dot
    const px = camera.position.x * factor;
    const pz = camera.position.z * factor;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(px, pz, 4, 0, Math.PI*2); ctx.fill();
    
    // Draw scraps yellow dots
    ctx.fillStyle = '#eab308';
    scraps3D.forEach(s => {
        if (!s.userData.isPickedUp) {
            ctx.beginPath(); ctx.arc(s.position.x * factor, s.position.z * factor, 3, 0, Math.PI*2); ctx.fill();
        }
    });
    
    // Draw monsters red dots
    ctx.fillStyle = '#ef4444';
    monsters3D.forEach(m => {
        ctx.beginPath(); ctx.arc(m.position.x * factor, m.position.z * factor, 4.5, 0, Math.PI*2); ctx.fill();
    });
    
    // Draw electronic key doors
    keycardDoors3D.forEach(d => {
        ctx.fillStyle = d.userData.isOpen ? '#22c55e' : '#f43f5e';
        ctx.fillRect(d.position.x * factor - 3, d.position.z * factor - 3, 6, 6);
    });
}

function toggleKeycardDoors() {
    keycardDoors3D.forEach(d => {
        d.userData.isOpen = !d.userData.isOpen;
        if(d.userData.isOpen) {
            d.position.y = -10; // Open by hiding underground
        } else {
            d.position.y = TILE_SIZE / 2;
        }
    });
    AudioSynth.playLever();
    showToast("تحديث حالة الأبواب الإلكترونية!");
}

// =========================================================
// RUN LOOP / GAME PHYSICS
// =========================================================
function animate() {
    if (!isGameRunning) return;
    requestAnimationFrame(animate);

    const time = performance.now();
    const dt = (time - lastTime) / 1000;
    lastTime = time;

    if (taserCooldown > 0) taserCooldown -= dt;

    if (subState === 'DESCENT') {
        updateDescent(dt);
    } else if (subState === 'EXTRACTION') {
        updateExtraction(dt);
    } else {
        updatePlayerPhysics(dt);
        if(isHost) updateMonstersAI(dt);
    }
    
    // Update camera shake during descent
    if (descentShake > 0) {
        camera.position.x += (Math.random() - 0.5) * descentShake;
        camera.position.z += (Math.random() - 0.5) * descentShake;
        descentShake -= dt * 0.15;
    }

    // Door animation
    if (isSubDoorOpen && doorOpenAmount < 1) {
        doorOpenAmount += dt * 0.5;
        subDoorMesh.position.y = (TILE_SIZE / 2) - (doorOpenAmount * TILE_SIZE);
    } else if (!isSubDoorOpen && doorOpenAmount > 0) {
        doorOpenAmount -= dt * 0.5;
        subDoorMesh.position.y = (TILE_SIZE / 2) - (doorOpenAmount * TILE_SIZE);
    }

    renderer.render(scene, camera);
    
    if (activeMode.startsWith('p2p')) {
        broadcastState();
    }
    
    drawRadar();
    updateHUDOverlay();
}

function updateDescent(dt) {
    descentProgress += dt * 16.6; // ~6 seconds total
    if (descentProgress > 100) descentProgress = 100;
    
    descentProgressFill.style.width = descentProgress + '%';
    descentShake = 0.06;
    
    if (descentProgress >= 100) {
        subState = 'DOCKED';
        descentShake = 0.3; // Final hard bump
        descentLoader.classList.add('hidden');
        showScreen(null); // Hide terminal cockpit HTML
        controls.lock(); // Lock to look around cockpit
        isSubDoorOpen = true;
        AudioSynth.playDock();
        AudioSynth.setHumVolume(0.04);
        AudioSynth.setHumPitch(55);
        showToast("التحام ناجح بالمنشأة! الباب يفتح الآن.");
        warningLight.intensity = 0;
    }
}

function updateExtraction(dt) {
    descentProgress += dt * 20; // 5 seconds
    descentShake = 0.08;
    if (descentProgress >= 100) {
        endDayHost();
    }
}

function updatePlayerPhysics(dt) {
    if (myState.isDead) return;

    // Movement speeds modified by weight of scrap carried
    let baseSpeed = isSprinting ? 28.0 : 14.0;
    let weightMult = 1 - (weight / 150); // Slows down
    if (weightMult < 0.3) weightMult = 0.3;
    let actualSpeed = baseSpeed * weightMult;

    velocity.x -= velocity.x * 10.0 * dt;
    velocity.z -= velocity.z * 10.0 * dt;
    
    direction.z = Number(moveForward) - Number(moveBackward) - mobileMove.y;
    direction.x = Number(moveRight) - Number(moveLeft) + mobileMove.x;
    
    if (direction.lengthSq() > 1) direction.normalize(); 

    if (moveForward || moveBackward) velocity.z -= direction.z * actualSpeed * dt;
    if (moveLeft || moveRight) velocity.x -= direction.x * actualSpeed * dt;

    controls.moveRight(-velocity.x * dt);
    controls.moveForward(-velocity.z * dt);
    
    let pos = controls.getObject().position;
    let cx = Math.floor(pos.x / TILE_SIZE);
    let cz = Math.floor(pos.z / TILE_SIZE);
    
    // Check collisions: Walls (1) or Closed sub-door, Closed keycard doors
    let isBlocked = false;
    if (mapGrid[cz] && mapGrid[cz][cx] === 1) isBlocked = true;
    
    // Electronic doors collision
    keycardDoors3D.forEach(d => {
        if (!d.userData.isOpen && Math.abs(pos.x - d.position.x) < 2.0 && Math.abs(pos.z - d.position.z) < 2.0) {
            isBlocked = true;
        }
    });

    // Submarine Door Collision
    if (!isSubDoorOpen && cx > Math.floor(MAP_COLS/2) + 1) {
        isBlocked = true;
    }

    if (isBlocked) {
        controls.moveRight(velocity.x * dt);
        controls.moveForward(velocity.z * dt);
        pos = controls.getObject().position;
        cx = Math.floor(pos.x / TILE_SIZE);
        cz = Math.floor(pos.z / TILE_SIZE);
    }

    // Sound generation based on steps
    if (velocity.length() > 2 && (moveForward || moveBackward || moveLeft || moveRight)) {
        stepTimer += dt;
        let stepRate = isSprinting ? 0.3 : 0.6;
        if (stepTimer >= stepRate) {
            stepTimer = 0;
            // Play wet splash footprints outside cockpit
            AudioSynth.playSplash(isCrouching);
        }
    }

    // Oxygen mechanics
    if (mapGrid[cz] && mapGrid[cz][cx] === 2) {
        // Refill in Sub-Hub
        if (oxygen < maxOxygen) oxygen += dt * 25;
        if (oxygen > maxOxygen) oxygen = maxOxygen;
    } else {
        // Outside Sub-Hub: depletes. Rate increases if carrying weight
        let depletionFactor = 1 + (weight / 50);
        oxygen -= dt * 0.8 * depletionFactor;
        if (oxygen <= 0) {
            oxygen = 0;
            die();
        }
    }

    // Battery Drain
    if (myState.isFlashlightOn) {
        myState.battery -= dt * (isSprinting ? 2.2 : 0.6);
        if (myState.battery <= 0) {
            myState.battery = 0;
            myState.isFlashlightOn = false;
            flashlight.intensity = 0;
        }
    }

    // Sync status object
    let euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
    myState.x = pos.x;
    myState.y = pos.y;
    myState.z = pos.z;
    myState.rx = euler.x;
    myState.ry = euler.y;
    myState.oxygen = oxygen;
    myState.weight = weight;
    
    // Auto dropoff scrap if returning inside cockpit
    if (mapGrid[cz] && mapGrid[cz][cx] === 2 && myState.scrap > 0) {
        totalCollected += myState.scrap;
        myState.scrap = 0;
        weight = 0;
        showToast("تم تفريغ الخردة في الغواصة!");
    }
}

// =========================================================
// MONSTERS & BEHAVIORS AI (HOST ONLY)
// =========================================================
function updateMonstersAI(dt) {
    // 10min shift timer
    timeRemaining -= dt;
    if (timeRemaining <= 0) {
        triggerFloodExtraction();
    }
    
    monsters3D.forEach(m => {
        if (m.userData.stunned && m.userData.stunned > 0) {
            m.userData.stunned -= dt;
            return; // Skip AI update if stunned
        }

        let targetPos = null;
        let minDist = 18;
        
        // Blind Clicker listens to splashing noise
        if (m.userData.name === 'blind_clicker') {
            let isMakingNoise = (moveForward || moveBackward || moveLeft || moveRight) && !isCrouching;
            if (isMakingNoise && !myState.isDead) {
                let d = m.position.distanceTo(camera.position);
                if (d < 25) { minDist = d; targetPos = camera.position; }
            }
        }
        
        // Light Eater checks if player flashlight is directed at it
        if (m.userData.name === 'light_eater') {
            if (myState.isFlashlightOn && !myState.isDead) {
                // Check if in line of sight using raycast
                let dir = new THREE.Vector3().subVectors(m.position, camera.position).normalize();
                let cameraDir = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
                let angle = cameraDir.angleTo(dir);
                if (angle < Math.PI / 6 && camera.position.distanceTo(m.position) < 18) {
                    m.userData.angry = true;
                    m.material.color.setHex(0xef4444); // Angry Red
                    AudioSynth.playShriek();
                }
            }
            if (m.userData.angry) {
                targetPos = camera.position;
                minDist = m.position.distanceTo(camera.position);
            }
        }

        // Rusher roars and dashes down corridors
        if (m.userData.name === 'rusher') {
            m.userData.timer += dt;
            if (m.userData.state === 'wander' && m.userData.timer > 8) {
                m.userData.state = 'charge';
                m.userData.timer = 0;
                AudioSynth.playShriek(); // Scream sound alert
            }
            if (m.userData.state === 'charge') {
                targetPos = camera.position;
                minDist = m.position.distanceTo(camera.position);
                if (m.userData.timer > 4) {
                    m.userData.state = 'wander';
                    m.userData.timer = 0;
                }
            }
        }

        // Track and move toward targets
        if (targetPos && subState !== 'SUB_HUB') {
            let dir = new THREE.Vector3().subVectors(targetPos, m.position).normalize();
            m.position.addScaledVector(dir, m.userData.speed * dt);
            m.lookAt(targetPos);
            
            // Check Kill collision
            if (minDist < 1.4) {
                if (targetPos === camera.position) {
                    if (m.userData.name === 'light_eater') {
                        // Breaks flashlight on attack
                        myState.isFlashlightOn = false;
                        flashlight.intensity = 0;
                    }
                    die();
                }
            }
        } else {
            // Wander behavior
            m.position.x += (Math.random() - 0.5) * m.userData.speed * dt * 0.5;
            m.position.z += (Math.random() - 0.5) * m.userData.speed * dt * 0.5;
            
            // Revert back to boundaries if they escape map
            if(m.position.x < 0 || m.position.x > MAP_COLS * TILE_SIZE) m.position.x = m.userData.ox;
            if(m.position.z < 0 || m.position.z > MAP_ROWS * TILE_SIZE) m.position.z = m.userData.oz;
        }
    });
}

// Flood extraction phase
function triggerFloodExtraction() {
    subState = 'EXTRACTION';
    descentProgress = 0;
    isSubDoorOpen = false;
    AudioSynth.playDock();
    AudioSynth.setHumPitch(150);
    showToast("تنبيه: ضغط المياه حرج! الغواصة تغلق وتغادر الآن!");
    warningLight.intensity = 2; // Pulsing warning
}

// Interactable checks
const raycaster = new THREE.Raycaster();
function tryInteract() {
    if (myState.isDead) return;
    
    let pos = controls.getObject().position;
    let cx = Math.floor(pos.x / TILE_SIZE);
    let cz = Math.floor(pos.z / TILE_SIZE);
    
    // Cockpit lever trigger
    if (mapGrid[cz] && mapGrid[cz][cx] === 2) {
        if (subState === 'SUB_HUB') {
            tryLeverPull();
        } else if (subState === 'DOCKED') {
            // Force extraction early
            triggerFloodExtraction();
            if (conn && conn.open) conn.send({ type: 'lever_pull' });
        }
        return;
    }

    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(scraps3D.filter(s => !s.userData.isPickedUp));
    
    if (intersects.length > 0 && intersects[0].distance < 3.5) {
        let scrap = intersects[0].object;
        scrap.userData.isPickedUp = true;
        scrap.visible = false;
        myState.scrap += scrap.userData.value;
        weight += scrap.userData.weight;
        showToast(`التقطت: ${scrap.userData.name} (${scrap.userData.value}$)`);
    }
}

function checkInteractions() {
    if (myState.isDead) return;
    
    let pos = controls.getObject().position;
    let cx = Math.floor(pos.x / TILE_SIZE);
    let cz = Math.floor(pos.z / TILE_SIZE);
    
    if (mapGrid[cz] && mapGrid[cz][cx] === 2) {
        if (subState === 'SUB_HUB') {
            interactionHint.innerText = "اضغط [E] لسحب الرافعة والهبوط بالمنشأة";
            interactionHint.classList.remove('hidden');
        } else if (subState === 'DOCKED') {
            interactionHint.innerText = "اضغط [E] للمغادرة والإقلاع فورا";
            interactionHint.classList.remove('hidden');
        }
        return;
    }

    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(scraps3D.filter(s => !s.userData.isPickedUp));
    
    if (intersects.length > 0 && intersects[0].distance < 3.5) {
        interactionHint.innerText = `اضغط [E] لالتقاط: ${intersects[0].object.userData.name}`;
        interactionHint.classList.remove('hidden');
    } else {
        interactionHint.classList.add('hidden');
    }
}

// Death
function die() {
    myState.isDead = true;
    myState.scrap = 0;
    weight = 0;
    myState.isFlashlightOn = false;
    flashlight.intensity = 0;
    controls.getObject().position.y = 0.2;
    AudioSynth.playShriek();
    showToast("لقد نفذ الأكسجين أو قتلك الوحش!");
    
    if(isHost) {
        setTimeout(() => triggerGameOver(false, globalCollected), 3000);
    }
}

// Client sync
function syncSubState(st, progress) {
    subState = st;
    descentProgress = progress;
    if (subState === 'DESCENT') {
        descentLoader.classList.remove('hidden');
        descentProgressFill.style.width = descentProgress + '%';
    } else if (subState === 'DOCKED') {
        descentLoader.classList.add('hidden');
        showScreen(null);
        controls.lock();
        isSubDoorOpen = true;
    } else if (subState === 'EXTRACTION') {
        isSubDoorOpen = false;
    }
}

// End shifts
function endDayHost() {
    if (!isGameRunning) return;
    isGameRunning = false;
    document.exitPointerLock();
    
    globalCollected += totalCollected;
    daysLeft--;
    credits += totalCollected; // Credits for gear
    
    if (daysLeft <= 0) {
        if (globalCollected >= globalQuota) {
            globalQuota += 150 + Math.floor(Math.random() * 80);
            daysLeft = 3;
            showToast("تم تلبية متطلبات الشركة! حصة جديدة قادمة.");
        } else {
            // Failed quota: thrown into ocean
            triggerGameOver(false, globalCollected);
            if(activeMode === 'p2p-host') conn.send({ type: 'game_over', won: false, score: globalCollected });
            return;
        }
    }
    
    if(activeMode === 'p2p-host' && conn && conn.open) {
        conn.send({ type: 'leave_moon', globalCollected, daysLeft, globalQuota, credits });
    }
    
    saveProgress();
    startGame();
}

function endDayClient(data) {
    if (!isGameRunning) return;
    isGameRunning = false;
    document.exitPointerLock();
    
    globalCollected = data.globalCollected;
    daysLeft = data.daysLeft;
    globalQuota = data.globalQuota;
    credits = data.credits;
    
    saveProgress();
    startGame();
}

// =========================================================
// HUD RENDERING & INTERFACE ACTIONS
// =========================================================
function updateHUDOverlay() {
    quotaCollectedEl.innerText = totalCollected;
    quotaTargetEl.innerText = globalQuota;
    scrapValueEl.innerText = myState.scrap;
    hudDaysLeft.innerText = daysLeft;
    
    // Oxygen & Weight Bar
    oxygenBarFill.style.width = (oxygen / maxOxygen * 100) + '%';
    weightBarFill.style.width = Math.min(100, (weight / 150 * 100)) + '%';
    
    let elapsed = 600 - timeRemaining;
    let h = 8 + Math.floor(elapsed / 60);
    let m = Math.floor(elapsed % 60);
    let ampm = h >= 12 ? 'PM' : 'AM';
    if (h > 12) h -= 12;
    timeDisplay.innerText = `الوقت: ${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')} ${ampm}`;
    
    batteryFill.style.width = myState.battery + '%';
    if (myState.battery < 20) batteryFill.className = 'battery-fill critical';
    else if (myState.battery < 50) batteryFill.className = 'battery-fill low';
    else batteryFill.className = 'battery-fill';

    checkInteractions();
}

function triggerGameOver(won, finalScore) {
    isGameRunning = false;
    document.exitPointerLock();
    
    crosshair.classList.add('hidden');
    gameHud.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
    
    const title = document.getElementById('game-over-title');
    const msg = document.getElementById('game-over-msg');
    document.getElementById('final-score').innerText = finalScore + '$';
    
    if (won) {
        title.innerText = "أحسنت العمل!";
        title.className = "glow-text text-green";
        msg.innerText = "لقد نجحت في تأمين الحصة المطلوبة للشركة.";
    } else {
        title.innerText = "تم الرفض من الشركة";
        title.className = "glow-text text-red";
        msg.innerText = "فشلت في تلبية المتطلبات، وتم إلقاءك في قاع البحر!";
    }
}

document.getElementById('restart-btn').onclick = () => {
    localStorage.removeItem('lethalCompanyProgress');
    location.reload();
};

document.getElementById('quit-btn').onclick = () => {
    location.reload();
};

function showScreen(screenEl) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    if(screenEl) screenEl.classList.remove('hidden');
}

function showToast(msg) {
    toastEl.innerText = msg;
    toastEl.classList.remove('hidden');
    setTimeout(() => toastEl.classList.add('hidden'), 3500);
}

// Mobile controls configuration
function setupMobileControls() {
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    if (!isMobile) return;

    document.getElementById('mobile-controls').classList.remove('hidden');

    document.addEventListener('touchstart', e => {
        if (!isGameRunning) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
            let t = e.changedTouches[i];
            if (t.target.id === 'mobile-interact-btn') {
                tryInteract();
                continue;
            }
            if (t.target.id === 'mobile-flashlight-btn') {
                if (!myState.isDead && myState.battery > 0 && ownedItems.includes('flashlight')) {
                    myState.isFlashlightOn = !myState.isFlashlightOn;
                    flashlight.intensity = myState.isFlashlightOn ? 1.8 : 0;
                }
                continue;
            }

            if (t.clientX > window.innerWidth / 2) {
                if (currentLookTouchId === null) {
                    currentLookTouchId = t.identifier;
                    touchLookStart = { x: t.clientX, y: t.clientY };
                }
            } else {
                if (currentMoveTouchId === null) {
                    currentMoveTouchId = t.identifier;
                    touchMoveStart = { x: t.clientX, y: t.clientY };
                }
            }
        }
    });

    document.addEventListener('touchmove', e => {
        if (!isGameRunning) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
            let t = e.changedTouches[i];
            if (t.identifier === currentLookTouchId) {
                let dx = t.clientX - touchLookStart.x;
                let dy = t.clientY - touchLookStart.y;
                touchLookStart = { x: t.clientX, y: t.clientY };
                
                let euler = new THREE.Euler(0, 0, 0, 'YXZ');
                euler.setFromQuaternion(camera.quaternion);
                euler.y -= dx * 0.005;
                euler.x -= dy * 0.005;
                euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x));
                camera.quaternion.setFromEuler(euler);
            } else if (t.identifier === currentMoveTouchId) {
                let dx = t.clientX - touchMoveStart.x;
                let dy = t.clientY - touchMoveStart.y;
                let radius = 50;
                mobileMove.x = Math.max(-1, Math.min(1, dx / radius));
                mobileMove.y = Math.max(-1, Math.min(1, dy / radius));
            }
        }
    });

    document.addEventListener('touchend', e => {
        for (let i = 0; i < e.changedTouches.length; i++) {
            let t = e.changedTouches[i];
            if (t.identifier === currentLookTouchId) currentLookTouchId = null;
            if (t.identifier === currentMoveTouchId) {
                currentMoveTouchId = null;
                mobileMove = { x: 0, y: 0 };
            }
        }
    });
}
