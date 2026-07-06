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

// Game State
let activeMode = 'single';
let peer = null;
let conn = null;
let isHost = true;
let myId = 'p1';
let isGameRunning = false;

// 3D Engine Variables
let scene, camera, renderer, controls;
let flashlight;
const objects = []; // Walls for collision
let scraps3D = []; // Scrap meshes
let monsters3D = []; // Monster meshes
let otherPlayers3D = {}; // Other players' meshes

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;
let isSprinting = false;

let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();

let myState = { x: 0, y: 1.5, z: 0, rx: 0, ry: 0, scrap: 0, battery: 100, isDead: false, isFlashlightOn: true };
let globalCollected = 0;
let globalQuota = 130;
let daysLeft = 3; 

function loadProgress() {
    const saved = localStorage.getItem('lethalCompanyProgress');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            globalCollected = data.globalCollected ?? 0;
            globalQuota = data.globalQuota ?? 130;
            daysLeft = data.daysLeft ?? 3;
        } catch(e) {}
    }
}
function saveProgress() {
    localStorage.setItem('lethalCompanyProgress', JSON.stringify({
        globalCollected, globalQuota, daysLeft
    }));
}
loadProgress();
let timeRemaining = 360; 
let lastTime = performance.now();
let selectedMoon = 'experimentation';
let totalCollected = 0; // Scrap currently on ship in this run

const MOONS = {
    'experimentation': { fogDensity: 30, fogColor: 0x000000, monsters: 2, scrapRate: 0.05, speedMult: 1 },
    'vow': { fogDensity: 12, fogColor: 0x113311, monsters: 4, scrapRate: 0.06, speedMult: 1.2 },
    'titan': { fogDensity: 18, fogColor: 0x000000, monsters: 6, scrapRate: 0.08, speedMult: 1.6 }
};

// Map settings
const TILE_SIZE = 4;
const MAP_COLS = 25;
const MAP_ROWS = 25;
let mapGrid = [];

// Initialize Menu
modeBtns.forEach(btn => btn.addEventListener('click', () => {
    activeMode = btn.dataset.mode;
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

// P2P Logic
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
            showToast("تم الانضمام! بانتظار המضيف للبدء...");
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
            }
        }
        else if (data.type === 'game_over') {
            triggerGameOver(data.won, data.score);
        }
        else if (data.type === 'enter_hub') {
            globalQuota = data.globalQuota;
            globalCollected = data.globalCollected;
            daysLeft = data.daysLeft;
            updateHubUI();
            showScreen(shipHubScreen);
            terminalWaiting.classList.remove('hidden');
        }
        else if (data.type === 'leave_moon') {
            endDayClient(data);
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
            payload.monsters = monsters3D.map(m => ({x: m.position.x, z: m.position.z}));
            payload.scraps = scraps3D.filter(s => !s.userData.isPickedUp).map(s => ({id: s.userData.id, isPickedUp: s.userData.isPickedUp}));
            payload.totalCollected = totalCollected;
        }
        conn.send(payload);
    }
}

// --------------------------------------------------------
// 3D Engine Setup
// --------------------------------------------------------

function init3D() {
    const container = document.getElementById('game-container');
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.Fog(0x000000, 0, 20); // Dark fog to limit vision

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    // Dim ambient light
    const ambientLight = new THREE.AmbientLight(0x222222);
    scene.add(ambientLight);

    scene.add(camera); // Add camera to scene so it can have children

    // Flashlight (SpotLight) attached to camera
    flashlight = new THREE.SpotLight(0xffffff, 1.5);
    flashlight.position.set(0, 0, 0);
    flashlight.target.position.set(0, 0, -1);
    flashlight.angle = Math.PI / 4;
    flashlight.penumbra = 0.5;
    flashlight.decay = 2;
    flashlight.distance = 40;
    camera.add(flashlight);
    camera.add(flashlight.target);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    controls = new THREE.PointerLockControls(camera, document.body);

    pauseOverlay.addEventListener('click', () => {
        if(isGameRunning) controls.lock();
    });

    controls.addEventListener('lock', () => {
        pauseOverlay.classList.add('hidden');
        crosshair.classList.remove('hidden');
    });

    controls.addEventListener('unlock', () => {
        if(isGameRunning) {
            pauseOverlay.classList.remove('hidden');
            crosshair.classList.add('hidden');
        }
    });

    window.addEventListener('resize', onWindowResize, false);
    
    // Add Event Listeners for Movement
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousedown', onMouseDown);
    
    // Mobile Touch Controls Setup
    setupMobileControls();
}

let mobileMove = { x: 0, y: 0 };
let currentLookTouchId = null;
let currentMoveTouchId = null;
let touchLookStart = { x: 0, y: 0 };
let touchMoveStart = { x: 0, y: 0 };

function setupMobileControls() {
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    if (!isMobile) return;

    document.getElementById('mobile-controls').classList.remove('hidden');

    document.addEventListener('touchstart', e => {
        if (!isGameRunning) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
            let t = e.changedTouches[i];
            // Check if touch is on action buttons
            if (t.target.id === 'mobile-interact-btn') {
                tryPickupScrap();
                tryLeaveMoon();
                continue;
            }
            if (t.target.id === 'mobile-flashlight-btn') {
                if (!myState.isDead && myState.battery > 0) {
                    myState.isFlashlightOn = !myState.isFlashlightOn;
                    flashlight.intensity = myState.isFlashlightOn ? 1 : 0;
                }
                continue;
            }

            if (t.clientX > window.innerWidth / 2) {
                // Right side -> Look
                if (currentLookTouchId === null) {
                    currentLookTouchId = t.identifier;
                    touchLookStart = { x: t.clientX, y: t.clientY };
                }
            } else {
                // Left side -> Move
                if (currentMoveTouchId === null) {
                    currentMoveTouchId = t.identifier;
                    touchMoveStart = { x: t.clientX, y: t.clientY };
                }
            }
        }
    }, { passive: false });

    document.addEventListener('touchmove', e => {
        if (!isGameRunning) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
            let t = e.changedTouches[i];
            if (t.identifier === currentLookTouchId) {
                let dx = t.clientX - touchLookStart.x;
                let dy = t.clientY - touchLookStart.y;
                touchLookStart = { x: t.clientX, y: t.clientY };
                
                // Rotate camera manually since PointerLock doesn't work on mobile
                let euler = new THREE.Euler(0, 0, 0, 'YXZ');
                euler.setFromQuaternion(camera.quaternion);
                euler.y -= dx * 0.005;
                euler.x -= dy * 0.005;
                euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x));
                camera.quaternion.setFromEuler(euler);
            } else if (t.identifier === currentMoveTouchId) {
                let dx = t.clientX - touchMoveStart.x;
                let dy = t.clientY - touchMoveStart.y;
                
                // Normalize to -1 to 1 based on a max radius of 50px
                let radius = 50;
                mobileMove.x = Math.max(-1, Math.min(1, dx / radius));
                mobileMove.y = Math.max(-1, Math.min(1, dy / radius));
            }
        }
    }, { passive: false });

    document.addEventListener('touchend', e => {
        for (let i = 0; i < e.changedTouches.length; i++) {
            let t = e.changedTouches[i];
            if (t.identifier === currentLookTouchId) {
                currentLookTouchId = null;
            } else if (t.identifier === currentMoveTouchId) {
                currentMoveTouchId = null;
                mobileMove = { x: 0, y: 0 };
            }
        }
    });
}

function onWindowResize() {
    if(!camera) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

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
        case 'KeyE': 
            tryPickupScrap(); 
            tryLeaveMoon();
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
    if (!isGameRunning || !controls.isLocked) return;
    if (event.button === 0 && !myState.isDead && myState.battery > 0) {
        myState.isFlashlightOn = !myState.isFlashlightOn;
        flashlight.intensity = myState.isFlashlightOn ? 1 : 0;
    }
}

// --------------------------------------------------------
// Game Logic & Generation
// --------------------------------------------------------

function startGame() {
    updateHubUI();
    showScreen(shipHubScreen);
    if(activeMode === 'p2p-host' && conn && conn.open) {
        conn.send({ type: 'enter_hub', globalQuota, globalCollected, daysLeft });
    }
}

moonBtns.forEach(btn => btn.addEventListener('click', () => {
    if(!isHost) return;
    selectedMoon = btn.dataset.moon;
    startGameLevel(selectedMoon);
}));

function startGameLevel(moonId) {
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
    if(!scene) init3D();
    build3DEnvironment(moonId);
    buildScrapsFromData(scrapData);
    postStartGame(moonId);
}

function postStartGame(moonId) {
    const moonConfig = MOONS[moonId] || MOONS['experimentation'];
    scene.fog.color.setHex(moonConfig.fogColor);
    scene.fog.far = moonConfig.fogDensity;
    scene.background.setHex(moonConfig.fogColor);

    // Reset daily state
    myState.scrap = 0;
    myState.battery = 100;
    myState.isDead = false;
    myState.isFlashlightOn = true;
    totalCollected = 0;
    timeRemaining = 360; 

    // Position player in the center ship area
    const cx = (MAP_COLS / 2) * TILE_SIZE;
    const cz = (MAP_ROWS / 2) * TILE_SIZE;
    
    controls.getObject().position.set(cx, 1.5, cz);
    
    // Clear UI and show Game HUD
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    gameHud.classList.remove('hidden');
    crosshair.classList.remove('hidden');
    
    isGameRunning = true;
    lastTime = performance.now();
    controls.lock(); // Request pointer lock
    
    animate();
}

function generateMap() {
    mapGrid = Array(MAP_ROWS).fill(null).map(() => Array(MAP_COLS).fill(1)); // 1=Wall, 0=Floor, 2=Ship
    
    const cx = Math.floor(MAP_COLS/2);
    const cz = Math.floor(MAP_ROWS/2);
    
    // Ship Area
    for(let r = cz - 2; r <= cz + 2; r++) {
        for(let c = cx - 2; c <= cx + 2; c++) {
            mapGrid[r][c] = 2; 
        }
    }
    
    // Maze path generation
    let x = cx, z = cz;
    for(let i=0; i<800; i++) {
        mapGrid[z][x] = 0;
        let dir = Math.floor(Math.random() * 4);
        if (dir === 0 && z > 1) z--;
        if (dir === 1 && z < MAP_ROWS-2) z++;
        if (dir === 2 && x > 1) x--;
        if (dir === 3 && x < MAP_COLS-2) x++;
    }
}

function clearScene() {
    objects.forEach(obj => scene.remove(obj));
    objects.length = 0;
    
    scraps3D.forEach(obj => scene.remove(obj));
    scraps3D.length = 0;
    
    monsters3D.forEach(obj => scene.remove(obj));
    monsters3D.length = 0;
}

function build3DEnvironment(moonId) {
    clearScene();
    
    // Floor & Ceiling textures/materials
    const floorMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const shipMat = new THREE.MeshLambertMaterial({ color: 0x1e3a8a });
    const wallMat = new THREE.MeshLambertMaterial({ color: 0x555555 }); // Lighter walls so they reflect light better
    const ceilMat = new THREE.MeshLambertMaterial({ color: 0x222222 });

    const wallGeo = new THREE.BoxGeometry(TILE_SIZE, TILE_SIZE, TILE_SIZE);
    const floorGeo = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE);
    
    for (let r = 0; r < MAP_ROWS; r++) {
        for (let c = 0; c < MAP_COLS; c++) {
            let px = c * TILE_SIZE;
            let pz = r * TILE_SIZE;
            
            // Floor
            let fMesh = new THREE.Mesh(floorGeo, mapGrid[r][c] === 2 ? shipMat : floorMat);
            fMesh.rotation.x = -Math.PI / 2;
            fMesh.position.set(px, 0, pz);
            scene.add(fMesh);
            objects.push(fMesh);
            
            // Ceiling
            let cMesh = new THREE.Mesh(floorGeo, ceilMat);
            cMesh.rotation.x = Math.PI / 2;
            cMesh.position.set(px, TILE_SIZE, pz);
            scene.add(cMesh);
            objects.push(cMesh);

            // Wall
            if (mapGrid[r][c] === 1) {
                let wall = new THREE.Mesh(wallGeo, wallMat);
                wall.position.set(px, TILE_SIZE / 2, pz);
                scene.add(wall);
                objects.push(wall);
            }
        }
    }
}

function spawnScraps(moonId) {
    let scrapData = [];
    const moonConfig = MOONS[moonId] || MOONS['experimentation'];
    const rate = moonConfig.scrapRate;

    const geo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const mat = new THREE.MeshLambertMaterial({ color: 0xfacc15 });
    
    let id = 0;
    for(let r = 0; r < MAP_ROWS; r++) {
        for(let c = 0; c < MAP_COLS; c++) {
            if(mapGrid[r][c] === 0 && Math.random() < rate) { // 5% chance per floor tile
                let value = Math.floor(Math.random() * 60) + 20;
                let px = c * TILE_SIZE + (Math.random() - 0.5);
                let pz = r * TILE_SIZE + (Math.random() - 0.5);
                
                let mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(px, 0.25, pz);
                mesh.userData = { id: id, value: value, isPickedUp: false };
                scene.add(mesh);
                scraps3D.push(mesh);
                
                scrapData.push({ id: id, x: px, z: pz, value: value });
                id++;
            }
        }
    }
    return scrapData;
}

function buildScrapsFromData(data) {
    const geo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const mat = new THREE.MeshLambertMaterial({ color: 0xfacc15 });
    
    data.forEach(d => {
        let mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(d.x, 0.25, d.z);
        mesh.userData = { id: d.id, value: d.value, isPickedUp: false };
        scene.add(mesh);
        scraps3D.push(mesh);
    });
}

function spawnMonsters(moonId) {
    const geo = new THREE.CylinderGeometry(0.5, 0.5, 2, 8);
    const mat = new THREE.MeshLambertMaterial({ color: 0xef4444 });
    const moonConfig = MOONS[moonId] || MOONS['experimentation'];
    const count = moonConfig.monsters;
    const speedMult = moonConfig.speedMult;
    
    for(let i=0; i<count; i++) {
        let r, c;
        do {
            r = Math.floor(Math.random() * MAP_ROWS);
            c = Math.floor(Math.random() * MAP_COLS);
        } while(mapGrid[r][c] !== 0); 
        
        let mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(c * TILE_SIZE, 1, r * TILE_SIZE);
        mesh.userData = { speed: 2 * speedMult };
        scene.add(mesh);
        monsters3D.push(mesh);
    }
}

// --------------------------------------------------------
// Game Loop & Mechanics
// --------------------------------------------------------

function animate() {
    if (!isGameRunning) return;
    requestAnimationFrame(animate);

    const time = performance.now();
    const dt = (time - lastTime) / 1000;
    lastTime = time;

    updatePlayer(dt);
    if(isHost) updateHostAI(dt);
    
    // Update Interaction Hint
    checkInteractions();

    renderer.render(scene, camera);
    
    // P2P Sync (10 times a second is enough for P2P visually, but we can do it every frame here)
    if (activeMode.startsWith('p2p')) {
        broadcastState();
    }
    
    updateHUD();
}

const raycaster = new THREE.Raycaster();
function checkInteractions() {
    if (myState.isDead) return;
    
    // Check if on Ship
    let pos = controls.getObject().position;
    let cx = Math.floor(pos.x / TILE_SIZE);
    let cz = Math.floor(pos.z / TILE_SIZE);
    
    if (mapGrid[cz] && mapGrid[cz][cx] === 2) {
        interactionHint.innerText = "اضغط [E] للإقلاع والمغادرة";
        interactionHint.classList.remove('hidden');
        return;
    }

    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(scraps3D.filter(s => !s.userData.isPickedUp));
    
    if (intersects.length > 0 && intersects[0].distance < 3) {
        interactionHint.innerText = "اضغط [E] للالتقاط";
        interactionHint.classList.remove('hidden');
    } else {
        interactionHint.classList.add('hidden');
    }
}

function tryLeaveMoon() {
    if (myState.isDead) return;
    let pos = controls.getObject().position;
    let cx = Math.floor(pos.x / TILE_SIZE);
    let cz = Math.floor(pos.z / TILE_SIZE);
    if (mapGrid[cz] && mapGrid[cz][cx] === 2) {
        if (isHost) {
            endDayHost();
        } else {
            showToast("فقط مدير السيرفر يمكنه إعطاء أمر المغادرة!");
        }
    }
}

function tryPickupScrap() {
    if (myState.isDead) return;
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(scraps3D.filter(s => !s.userData.isPickedUp));
    
    if (intersects.length > 0 && intersects[0].distance < 3) {
        let scrap = intersects[0].object;
        scrap.userData.isPickedUp = true;
        scrap.visible = false;
        myState.scrap += scrap.userData.value;
    }
}

function updatePlayer(dt) {
    if (myState.isDead) return;

    // Movement & Collisions
    velocity.x -= velocity.x * 10.0 * dt;
    velocity.z -= velocity.z * 10.0 * dt;
    
    direction.z = Number(moveForward) - Number(moveBackward) - mobileMove.y;
    direction.x = Number(moveRight) - Number(moveLeft) + mobileMove.x;
    
    // Clamp to length 1
    if (direction.lengthSq() > 1) direction.normalize(); 
    
    let speedMult = isSprinting && myState.battery > 0 ? 30.0 : 15.0;

    if (moveForward || moveBackward) velocity.z -= direction.z * speedMult * dt;
    if (moveLeft || moveRight) velocity.x -= direction.x * speedMult * dt;

    controls.moveRight(-velocity.x * dt);
    controls.moveForward(-velocity.z * dt);
    
    // Simple Collision (Keep inside map bounds & out of walls)
    let pos = controls.getObject().position;
    let cx = Math.floor(pos.x / TILE_SIZE);
    let cz = Math.floor(pos.z / TILE_SIZE);
    
    // Wall pushback (Very basic AABB)
    if (mapGrid[cz] && mapGrid[cz][cx] === 1) {
        // Just revert to center of previous tile loosely
        controls.moveRight(velocity.x * dt);
        controls.moveForward(velocity.z * dt);
    }

    // Flashlight & Battery
    if (myState.isFlashlightOn) {
        myState.battery -= dt * (isSprinting ? 2 : 0.5); // Drains faster if sprinting
        if (myState.battery <= 0) {
            myState.battery = 0;
            myState.isFlashlightOn = false;
            flashlight.intensity = 0;
        }
    }

    // Sync my state
    let euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
    myState.x = pos.x;
    myState.y = pos.y;
    myState.z = pos.z;
    myState.rx = euler.x;
    myState.ry = euler.y;
    
    // Dropoff Scrap at Ship
    if (mapGrid[cz] && mapGrid[cz][cx] === 2 && myState.scrap > 0) {
        totalCollected += myState.scrap;
        myState.scrap = 0;
    }
}

function updateHostAI(dt) {
    // Timer
    timeRemaining -= dt;
    if (timeRemaining <= 0) {
        endDayHost();
    }
    
    // Monsters
    monsters3D.forEach(m => {
        let targetPos = null;
        let minDist = 15; // Agro range

        // Check host
        if (!myState.isDead && myState.isFlashlightOn) {
            let d = m.position.distanceTo(camera.position);
            if (d < minDist) { minDist = d; targetPos = camera.position; }
        }
        
        // Check other players
        for(let pid in otherPlayers3D) {
            let op = otherPlayers3D[pid];
            // We'd need to track their flashlight state too, assuming it's on if they are close
            let d = m.position.distanceTo(op.position);
            if (d < minDist) { minDist = d; targetPos = op.position; }
        }
        
        if (targetPos) {
            let dir = new THREE.Vector3().subVectors(targetPos, m.position).normalize();
            m.position.addScaledVector(dir, m.userData.speed * dt);
            m.lookAt(targetPos);
            
            // Kill
            if (minDist < 1.5) {
                if (targetPos === camera.position) die();
            }
        } else {
            // Wander
            m.position.x += (Math.random() - 0.5) * dt;
            m.position.z += (Math.random() - 0.5) * dt;
        }
    });
}

function updateHubUI() {
    hubQuota.innerText = globalQuota;
    hubCollected.innerText = globalCollected;
    hubDays.innerText = daysLeft;
}

function endDayHost() {
    if (!isGameRunning) return;
    isGameRunning = false;
    document.exitPointerLock();
    
    // Calculate totals
    globalCollected += totalCollected;
    daysLeft--;
    
    if (daysLeft <= 0) {
        if (globalCollected >= globalQuota) {
            // Success! Next quota
            globalQuota += 150 + Math.floor(Math.random() * 100);
            daysLeft = 3;
            showToast("تم تحقيق الحصة! حصة جديدة بانتظارك.");
        } else {
            // Fired!
            triggerGameOver(false, globalCollected);
            if(activeMode === 'p2p-host') broadcastState({ type: 'game_over', won: false, score: globalCollected });
            return;
        }
    }
    
    if(activeMode === 'p2p-host' && conn && conn.open) {
        conn.send({ type: 'leave_moon', globalCollected, daysLeft, globalQuota });
    }
    
    saveProgress();
    updateHubUI();
    showScreen(shipHubScreen);
    crosshair.classList.add('hidden');
    gameHud.classList.add('hidden');
    terminalWaiting.classList.add('hidden');
}

function endDayClient(data) {
    if (!isGameRunning) return;
    isGameRunning = false;
    document.exitPointerLock();
    
    globalCollected = data.globalCollected;
    daysLeft = data.daysLeft;
    globalQuota = data.globalQuota;
    
    saveProgress();
    updateHubUI();
    showScreen(shipHubScreen);
    crosshair.classList.add('hidden');
    gameHud.classList.add('hidden');
    terminalWaiting.classList.remove('hidden');
}

function die() {
    myState.isDead = true;
    myState.scrap = 0;
    myState.isFlashlightOn = false;
    flashlight.intensity = 0;
    // Move camera to floor
    controls.getObject().position.y = 0.2;
    showToast("لقد مت!");
    
    // Check if everyone is dead (Host only logic to end day)
    if (isHost) {
        let allDead = myState.isDead;
        for (let pid in otherPlayers3D) {
            // We just assume if they haven't sent isDead = false, they are dead?
            // Actually, wait, let's just let time run out or let the other player leave.
            // If all are dead, we can fast-forward or just wait. Let's just wait for time for now, or check state.
        }
    }
}

// --------------------------------------------------------
// Multiplayer Sync Methods
// --------------------------------------------------------

function updateOtherPlayer(id, state) {
    if (!otherPlayers3D[id]) {
        // Create mesh
        const geo = new THREE.CylinderGeometry(0.4, 0.4, 2, 8);
        const mat = new THREE.MeshLambertMaterial({ color: 0x38bdf8 });
        let mesh = new THREE.Mesh(geo, mat);
        
        // Add flashlight to them
        let pLight = new THREE.SpotLight(0xfacc15, 1);
        pLight.angle = Math.PI / 6;
        pLight.penumbra = 0.5;
        pLight.distance = 25;
        mesh.add(pLight);
        mesh.add(pLight.target);
        mesh.userData.light = pLight;
        
        scene.add(mesh);
        otherPlayers3D[id] = mesh;
    }
    
    let op = otherPlayers3D[id];
    op.position.set(state.x, state.y, state.z);
    
    // Reconstruct direction from euler
    let euler = new THREE.Euler(state.rx, state.ry, 0, 'YXZ');
    let dir = new THREE.Vector3(0, 0, -1).applyEuler(euler);
    op.userData.light.target.position.set(0,0,0).add(dir);
    op.userData.light.intensity = state.isFlashlightOn && !state.isDead ? 1 : 0;
    
    if (state.isDead) op.position.y = 0.2;
}

function updateMonsters(mStates) {
    if(!mStates) return;
    // Client receives monster positions
    if(monsters3D.length === 0) {
        const geo = new THREE.CylinderGeometry(0.5, 0.5, 2, 8);
        const mat = new THREE.MeshLambertMaterial({ color: 0xef4444 });
        mStates.forEach(() => {
            let m = new THREE.Mesh(geo, mat);
            scene.add(m);
            monsters3D.push(m);
        });
    }
    mStates.forEach((st, i) => {
        if(monsters3D[i]) monsters3D[i].position.set(st.x, 1, st.z);
    });
    
    // Check if I touched a monster
    monsters3D.forEach(m => {
        if (!myState.isDead && m.position.distanceTo(camera.position) < 1.5) {
            die();
        }
    });
}

function syncScraps(sStates) {
    sStates.forEach(st => {
        let scrap = scraps3D.find(s => s.userData.id === st.id);
        if (scrap) {
            scrap.userData.isPickedUp = st.isPickedUp;
            scrap.visible = !st.isPickedUp;
        }
    });
}

// --------------------------------------------------------
// UI Methods
// --------------------------------------------------------

function updateHUD() {
    quotaCollectedEl.innerText = totalCollected;
    quotaTargetEl.innerText = globalQuota;
    scrapValueEl.innerText = myState.scrap;
    hudDaysLeft.innerText = daysLeft;
    
    let elapsed = 360 - timeRemaining;
    let h = 8 + Math.floor(elapsed / 60);
    let m = Math.floor(elapsed % 60);
    let ampm = h >= 12 ? 'PM' : 'AM';
    if (h > 12) h -= 12;
    timeDisplay.innerText = `الوقت: ${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')} ${ampm}`;
    
    batteryFill.style.width = myState.battery + '%';
    if (myState.battery < 20) batteryFill.className = 'battery-fill critical';
    else if (myState.battery < 50) batteryFill.className = 'battery-fill low';
    else batteryFill.className = 'battery-fill';
}

function triggerGameOver(won, finalScore) {
    if (!isGameRunning) return;
    isGameRunning = false;
    document.exitPointerLock();
    
    crosshair.classList.add('hidden');
    gameHud.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
    
    const title = document.getElementById('game-over-title');
    const msg = document.getElementById('game-over-msg');
    document.getElementById('final-score').innerText = finalScore + '$';
    
    if (won) {
        title.innerText = "عمل جيد!";
        title.className = "glow-text text-green";
        msg.innerText = "لقد حققت الحصة المطلوبة للشركة.";
    } else {
        title.innerText = "تم الرفض من الشركة";
        title.className = "glow-text text-red";
        msg.innerText = "فشلت في تلبية المتطلبات أو مت في الظلام.";
    }
}

document.getElementById('restart-btn').addEventListener('click', () => {
    if (peer) peer.destroy();
    location.reload();
});

document.getElementById('quit-btn').addEventListener('click', () => {
    if (peer) peer.destroy();
    location.reload();
});

function showScreen(screenEl) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    if(screenEl) screenEl.classList.remove('hidden');
}

function showToast(msg) {
    toastEl.innerText = msg;
    toastEl.classList.remove('hidden');
    setTimeout(() => toastEl.classList.add('hidden'), 3000);
}
