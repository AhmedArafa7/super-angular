const canvasLeft = document.getElementById('canvas-left');
const canvasRight = document.getElementById('canvas-right');
const ctxLeft = canvasLeft.getContext('2d');
const ctxRight = canvasRight.getContext('2d');

canvasLeft.width = 800; canvasLeft.height = 600;
canvasRight.width = 800; canvasRight.height = 600;

const offLeft = document.createElement('canvas');
const offRight = document.createElement('canvas');
offLeft.width = 800; offLeft.height = 600;
offRight.width = 800; offRight.height = 600;
const ctxOffLeft = offLeft.getContext('2d');
const ctxOffRight = offRight.getContext('2d');

let differences = [];
let penaltiesLeft = [];
let penaltiesRight = [];

let score = 0; // Local score
let p1Score = 0; // Host score
let p2Score = 0; // Guest score

let timeLeft = 60;
let timerInterval;
let isPlaying = false;
let hintsRemaining = 3;

let currentLevel = 'medium';
let currentStage = 1;
const MAX_STAGES = 100;

const imageSourceSelect = document.getElementById('image-source-select');
let currentImageSource = 'svg';

function toggleCustomUpload() {
    const s = document.getElementById('image-source-select').value;
    if (s === 'custom') {
        document.getElementById('custom-image-upload').classList.remove('hidden');
    } else {
        document.getElementById('custom-image-upload').classList.add('hidden');
    }
}

const staticImageLevels = [
    'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1449844908441-8829872d2607?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1533154683836-84ea7a0bc310?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=800&h=600&fit=crop'
];

// P2P State
let activeMode = 'local'; // 'local', 'p2p-host', 'p2p-join'
let peer = null;
let conn = null;
let hostDifficulty = 'medium';
let playerId = 'host'; // 'host' or 'guest'

const scenesData = [
    `
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
    <rect width="800" height="600" fill="#87CEEB" id="sky"/>
    <circle cx="100" cy="100" r="50" fill="#FFD700" id="sun"/>
    <line x1="100" y1="40" x2="100" y2="10" stroke="#FFD700" stroke-width="4"/>
    <line x1="100" y1="160" x2="100" y2="190" stroke="#FFD700" stroke-width="4"/>
    <line x1="40" y1="100" x2="10" y2="100" stroke="#FFD700" stroke-width="4"/>
    <line x1="160" y1="100" x2="190" y2="100" stroke="#FFD700" stroke-width="4"/>
    <path d="M 150 120 Q 170 100 190 120 Q 210 110 230 130 Q 250 140 230 150 L 150 150 Z" fill="white" id="cloud1"/>
    <path d="M 400 80 Q 420 60 440 80 Q 460 70 480 90 Q 500 100 480 110 L 400 110 Z" fill="white" id="cloud3"/>
    <path d="M 600 150 Q 620 130 640 150 Q 660 140 680 160 Q 700 170 680 180 L 600 180 Z" fill="white" id="cloud2"/>
    <path d="M 50 200 Q 70 180 90 200 Q 110 190 130 210 Q 150 220 130 230 L 50 230 Z" fill="white" id="cloud4"/>
    <path d="M 300 100 Q 310 90 320 100 Q 330 90 340 100" fill="none" stroke="black" stroke-width="2" id="bird1"/>
    <path d="M 350 120 Q 360 110 370 120 Q 380 110 390 120" fill="none" stroke="black" stroke-width="2" id="bird2"/>
    <path d="M 500 200 Q 510 190 520 200 Q 530 190 540 200" fill="none" stroke="black" stroke-width="2" id="bird3"/>
    <rect x="0" y="400" width="800" height="200" fill="#32CD32" id="grass"/>
    <path d="M 0 400 Q 100 380 200 400 T 400 400 T 600 400 T 800 400 L 800 600 L 0 600 Z" fill="#228B22" id="grassBack"/>
    <g id="fence" fill="#DEB887" stroke="#8B4513" stroke-width="2">
        <rect x="20" y="380" width="10" height="40"/>
        <rect x="60" y="380" width="10" height="40"/>
        <rect x="100" y="380" width="10" height="40"/>
        <rect x="140" y="380" width="10" height="40"/>
        <rect x="180" y="380" width="10" height="40"/>
        <rect x="10" y="390" width="190" height="5"/>
        <rect x="10" y="405" width="190" height="5"/>
    </g>
    <circle cx="150" cy="450" r="10" fill="#FF1493" id="flower1"/>
    <circle cx="150" cy="450" r="4" fill="#FFD700"/>
    <circle cx="200" cy="480" r="8" fill="#FF4500" id="flower2"/>
    <circle cx="200" cy="480" r="3" fill="#FFFF00"/>
    <circle cx="80" cy="520" r="12" fill="#9370DB" id="flower3"/>
    <circle cx="80" cy="520" r="4" fill="#FFD700"/>
    <circle cx="650" cy="550" r="10" fill="#FF1493" id="flower4"/>
    <circle cx="650" cy="550" r="4" fill="#FFD700"/>
    <circle cx="720" cy="460" r="8" fill="#FF4500" id="flower5"/>
    <path d="M 400 450 Q 420 500 350 600 L 450 600 Q 500 500 440 450 Z" fill="#D2B48C" id="path"/>
    <rect x="300" y="300" width="200" height="150" fill="#CD853F" id="house"/>
    <rect x="450" y="220" width="30" height="60" fill="#A52A2A" id="chimney"/>
    <circle cx="465" cy="200" r="10" fill="gray" opacity="0.5"/>
    <circle cx="475" cy="180" r="15" fill="gray" opacity="0.4"/>
    <circle cx="490" cy="150" r="20" fill="gray" opacity="0.3" id="smoke"/>
    <polygon points="280,300 400,200 520,300" fill="#8B0000" id="roof"/>
    <rect x="380" y="380" width="40" height="70" fill="#8B4513" id="door"/>
    <circle cx="390" cy="415" r="3" fill="#FFD700" id="doorknob"/>
    <rect x="330" y="330" width="40" height="40" fill="#87CEFA" id="win1"/>
    <line x1="350" y1="330" x2="350" y2="370" stroke="white" stroke-width="2"/>
    <line x1="330" y1="350" x2="370" y2="350" stroke="white" stroke-width="2"/>
    <rect x="430" y="330" width="40" height="40" fill="#87CEFA" id="win2"/>
    <line x1="450" y1="330" x2="450" y2="370" stroke="white" stroke-width="2"/>
    <line x1="430" y1="350" x2="470" y2="350" stroke="white" stroke-width="2"/>
    <rect x="520" y="420" width="30" height="15" fill="#8B4513" id="dogBody"/>
    <circle cx="550" cy="415" r="10" fill="#8B4513" id="dogHead"/>
    <rect x="520" y="435" width="4" height="10" fill="#8B4513"/>
    <rect x="546" y="435" width="4" height="10" fill="#8B4513"/>
    <path d="M 520 420 Q 510 410 515 400" fill="none" stroke="#8B4513" stroke-width="3" id="dogTail"/>
    <rect x="650" y="350" width="30" height="100" fill="#8B4513" id="trunk"/>
    <circle cx="665" cy="300" r="70" fill="#228B22" id="leaf1"/>
    <circle cx="620" cy="330" r="50" fill="#228B22" id="leaf2"/>
    <circle cx="710" cy="330" r="50" fill="#228B22" id="leaf3"/>
    <circle cx="640" cy="280" r="6" fill="red" id="apple1"/>
    <circle cx="680" cy="260" r="6" fill="red" id="apple2"/>
    <circle cx="690" cy="310" r="6" fill="red" id="apple3"/>
    <circle cx="610" cy="340" r="6" fill="red" id="apple4"/>
    <rect x="250" y="350" width="15" height="60" fill="#8B4513" id="trunk2"/>
    <circle cx="257" cy="320" r="30" fill="#006400" id="leaf4"/>
    <circle cx="230" cy="340" r="20" fill="#006400" id="leaf5"/>
    <circle cx="280" cy="340" r="20" fill="#006400" id="leaf6"/>
</svg>`,
    `
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
    <rect width="800" height="600" fill="#0B0B3B" id="space"/>
    <g fill="white" id="stars">
        <circle cx="50" cy="50" r="1"/><circle cx="100" cy="20" r="2"/><circle cx="200" cy="80" r="1.5"/><circle cx="300" cy="40" r="1"/>
        <circle cx="400" cy="90" r="2.5"/><circle cx="500" cy="30" r="1"/><circle cx="600" cy="70" r="2"/><circle cx="700" cy="10" r="1"/>
        <circle cx="750" cy="60" r="1.5"/><circle cx="30" cy="150" r="2"/><circle cx="120" cy="250" r="1"/><circle cx="250" cy="180" r="2"/>
        <circle cx="350" cy="220" r="1"/><circle cx="480" cy="170" r="1.5"/><circle cx="550" cy="240" r="2"/><circle cx="680" cy="200" r="1"/>
        <circle cx="780" cy="180" r="2"/><circle cx="80" cy="350" r="1.5"/><circle cx="180" cy="380" r="2"/><circle cx="280" cy="320" r="1"/>
        <circle cx="380" cy="420" r="1"/><circle cx="450" cy="380" r="2"/><circle cx="520" cy="450" r="1.5"/><circle cx="650" cy="340" r="1"/>
        <circle cx="720" cy="410" r="2"/><circle cx="40" cy="500" r="1"/><circle cx="150" cy="480" r="2.5"/><circle cx="250" cy="550" r="1"/>
        <circle cx="320" cy="490" r="1.5"/><circle cx="420" cy="580" r="2"/><circle cx="580" cy="520" r="1"/><circle cx="680" cy="560" r="2"/>
        <circle cx="760" cy="480" r="1.5"/>
    </g>
    <polyline points="50,50 100,20 200,80 160,160" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1" id="constellation"/>
    <circle cx="150" cy="150" r="60" fill="#FF4500" id="planet1"/>
    <ellipse cx="150" cy="150" rx="90" ry="20" fill="none" stroke="#FFD700" stroke-width="5" transform="rotate(-20 150 150)" id="ring1"/>
    <circle cx="650" cy="100" r="40" fill="#DA70D6" id="planet2"/>
    <circle cx="720" cy="80" r="10" fill="#D3D3D3" id="moon1"/>
    <circle cx="580" cy="140" r="8" fill="#A9A9A9" id="moon2"/>
    <circle cx="100" cy="500" r="80" fill="#4682B4" id="planet3"/>
    <polygon points="300,100 310,95 320,105 315,115 305,110" fill="#808080" id="asteroid1"/>
    <polygon points="500,200 515,190 530,205 520,220 505,210" fill="#A9A9A9" id="asteroid2"/>
    <g id="mainShip">
        <ellipse cx="400" cy="300" rx="100" ry="30" fill="#C0C0C0" id="shipBody"/>
        <ellipse cx="400" cy="280" rx="40" ry="30" fill="#87CEFA" id="shipCabin"/>
        <circle cx="350" cy="300" r="10" fill="#FFD700" id="light1"/>
        <circle cx="400" cy="300" r="10" fill="#FFD700" id="light2"/>
        <circle cx="450" cy="300" r="10" fill="#FFD700" id="light3"/>
        <polygon points="380,330 420,330 400,380" fill="#FF0000" id="flame"/>
        <line x1="400" y1="250" x2="400" y2="230" stroke="white" stroke-width="2" id="antenna"/>
        <circle cx="400" cy="230" r="3" fill="red" id="antennaTip"/>
    </g>
    <g id="smallShip" transform="translate(600, 250) scale(0.4)">
        <ellipse cx="0" cy="0" rx="100" ry="30" fill="#FF69B4" id="sShipBody"/>
        <ellipse cx="0" cy="-20" rx="40" ry="30" fill="#87CEFA"/>
        <polygon points="-20,30 20,30 0,80" fill="#FF0000" id="sFlame"/>
    </g>
    <rect x="600" y="400" width="40" height="80" fill="#32CD32" id="alienBody"/>
    <circle cx="620" cy="380" r="30" fill="#32CD32" id="alienHead"/>
    <circle cx="610" cy="370" r="5" fill="black" id="alienEye1"/>
    <circle cx="630" cy="370" r="5" fill="black" id="alienEye2"/>
    <line x1="600" y1="420" x2="570" y2="400" stroke="#32CD32" stroke-width="5" id="alienArm1"/>
    <line x1="640" y1="420" x2="670" y2="400" stroke="#32CD32" stroke-width="5" id="alienArm2"/>
</svg>`,
    `
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
    <rect width="800" height="600" fill="#006994" id="water"/>
    <polygon points="100,0 200,0 150,600 50,600" fill="rgba(255,255,255,0.1)" id="ray1"/>
    <polygon points="400,0 550,0 450,600 300,600" fill="rgba(255,255,255,0.1)" id="ray2"/>
    <rect x="0" y="500" width="800" height="100" fill="#D2B48C" id="sand"/>
    <circle cx="50" cy="550" r="10" fill="#A0522D" id="rock1"/>
    <circle cx="80" cy="570" r="15" fill="#8B4513" id="rock2"/>
    <circle cx="300" cy="530" r="8" fill="#FFF8DC" id="shell1"/>
    <polygon points="300,530 310,520 305,540" fill="#FFDEAD" id="shell2"/>
    <circle cx="750" cy="540" r="20" fill="#A0522D" id="rock3"/>
    <polygon points="100,500 120,400 140,500" fill="#2E8B57" id="weed1"/>
    <polygon points="150,500 170,350 190,500" fill="#2E8B57" id="weed2"/>
    <polygon points="200,500 210,420 220,500" fill="#3CB371" id="weed3"/>
    <path d="M 600 500 Q 620 450 600 400 Q 580 450 600 500" fill="#FF6347" id="coral1"/>
    <path d="M 650 500 Q 670 420 650 350 Q 630 420 650 500" fill="#FF4500" id="coral2"/>
    <rect x="400" y="470" width="60" height="40" fill="#8B4513" id="chest"/>
    <rect x="400" y="470" width="60" height="15" fill="#A0522D" id="chestLid"/>
    <circle cx="430" cy="485" r="5" fill="#FFD700" id="lock"/>
    <circle cx="410" cy="460" r="4" fill="#FFD700" id="coin1"/>
    <circle cx="420" cy="455" r="4" fill="#FFD700" id="coin2"/>
    <g id="fish1" transform="translate(400, 200)">
        <ellipse cx="0" cy="0" rx="40" ry="20" fill="#FF8C00" id="fish1Body"/>
        <polygon points="-40,0 -70,-20 -70,20" fill="#FF8C00" id="fish1Tail"/>
        <polygon points="0,-20 -10,-35 10,-35" fill="#FF8C00" id="fish1Fin"/>
        <circle cx="20" cy="-5" r="4" fill="black" id="fish1Eye"/>
    </g>
    <g id="fish2" transform="translate(600, 300)">
        <ellipse cx="0" cy="0" rx="30" ry="15" fill="#FF1493" id="fish2Body"/>
        <polygon points="-30,0 -50,-15 -50,15" fill="#FF1493" id="fish2Tail"/>
        <circle cx="15" cy="-5" r="3" fill="black" id="fish2Eye"/>
    </g>
    <g id="school" fill="#00FFFF">
        <ellipse cx="200" cy="150" rx="10" ry="5"/> <polygon points="190,150 180,145 180,155"/>
        <ellipse cx="220" cy="140" rx="10" ry="5" id="sfish2"/> <polygon points="210,140 200,135 200,145"/>
        <ellipse cx="180" cy="160" rx="10" ry="5"/> <polygon points="170,160 160,155 160,165"/>
        <ellipse cx="240" cy="160" rx="10" ry="5"/> <polygon points="230,160 220,155 220,165"/>
        <ellipse cx="210" cy="170" rx="10" ry="5"/> <polygon points="200,170 190,165 190,175"/>
    </g>
    <g id="sub" transform="translate(150, 250)">
        <ellipse cx="0" cy="0" rx="50" ry="25" fill="#FFFF00" id="subBody"/>
        <rect x="-15" y="-40" width="30" height="20" fill="#FFFF00"/>
        <circle cx="20" cy="0" r="8" fill="#87CEFA" id="subWin1"/>
        <circle cx="-10" cy="0" r="8" fill="#87CEFA" id="subWin2"/>
        <polygon points="-50,0 -70,-15 -70,15" fill="#FFA500" id="subProp"/>
    </g>
    <g id="jelly" transform="translate(700, 150)">
        <path d="M -20 0 A 20 20 0 0 1 20 0 Z" fill="rgba(255,192,203,0.7)"/>
        <path d="M -15 0 Q -20 20 -10 40" fill="none" stroke="rgba(255,192,203,0.7)" stroke-width="2"/>
        <path d="M 0 0 Q -5 20 5 40" fill="none" stroke="rgba(255,192,203,0.7)" stroke-width="2"/>
        <path d="M 15 0 Q 10 20 20 40" fill="none" stroke="rgba(255,192,203,0.7)" stroke-width="2" id="jellyTent"/>
    </g>
    <g id="crab" transform="translate(600, 520)">
        <ellipse cx="0" cy="0" rx="20" ry="10" fill="#FF0000" id="crabBody"/>
        <circle cx="-10" cy="-15" r="5" fill="#FF0000" id="crabClaw1"/>
        <circle cx="10" cy="-15" r="5" fill="#FF0000" id="crabClaw2"/>
    </g>
    <circle cx="450" cy="150" r="10" fill="rgba(255,255,255,0.5)" id="bub1"/>
    <circle cx="470" cy="120" r="15" fill="rgba(255,255,255,0.5)" id="bub2"/>
    <circle cx="610" cy="270" r="6" fill="rgba(255,255,255,0.5)" id="bub3"/>
    <circle cx="620" cy="250" r="8" fill="rgba(255,255,255,0.5)" id="bub4"/>
</svg>`
];

// UI Control Functions
function selectMode(mode) {
    document.getElementById('mode-selection').classList.add('hidden');
    if (mode === 'local') {
        activeMode = 'local';
        document.getElementById('local-menu').classList.remove('hidden');
    } else {
        document.getElementById('p2p-menu').classList.remove('hidden');
    }
}

function backToModeSelection() {
    document.getElementById('local-menu').classList.add('hidden');
    document.getElementById('p2p-menu').classList.add('hidden');
    document.getElementById('mode-selection').classList.remove('hidden');
    
    if (peer) {
        peer.destroy();
        peer = null;
    }
    
    document.getElementById('room-info').classList.add('hidden');
    document.getElementById('create-room-btn').classList.remove('hidden');
    document.getElementById('create-room-btn').disabled = false;
    document.getElementById('create-room-btn').innerText = 'إنشاء غرفة';
    
    document.getElementById('join-room-btn').disabled = false;
    document.getElementById('join-room-btn').innerText = 'انضمام ولعب';
    document.getElementById('join-error').classList.add('hidden');
    document.getElementById('status-text-guest').classList.add('hidden');
}

function showMenu() {
    isPlaying = false;
    clearInterval(timerInterval);
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('main-menu').classList.remove('hidden');
    backToModeSelection();
}

function startGame(level) {
    currentImageSource = imageSourceSelect.value;
    activeMode = 'local';
    currentLevel = level;
    currentStage = 1;
    hintsRemaining = 3;
    document.getElementById('hints-count').innerText = hintsRemaining;
    document.getElementById('local-score-box').classList.remove('hidden');
    startStage();
}

// P2P Logic
function setHostDifficulty(diff) {
    hostDifficulty = diff;
    document.querySelectorAll('[id^="btn-diff-"]').forEach(el => el.style.border = 'none');
    document.getElementById('btn-diff-' + diff).style.border = '2px solid white';
}
setHostDifficulty('medium'); // default

function createRoom() {
    currentImageSource = imageSourceSelect.value;
    const btn = document.getElementById('create-room-btn');
    btn.disabled = true;
    btn.innerText = 'جاري الإنشاء...';
    
    peer = new Peer();
    
    peer.on('open', id => {
        document.getElementById('room-info').classList.remove('hidden');
        document.getElementById('room-id-display').innerText = id;
        btn.classList.add('hidden');
    });
    
    peer.on('connection', connection => {
        conn = connection;
        setupHostConnection();
    });
    
    peer.on('error', err => {
        alert('حدث خطأ في الشبكة: ' + err.message);
        btn.disabled = false;
        btn.innerText = 'إنشاء غرفة';
    });
}

function setupHostConnection() {
    conn.on('open', () => {
        activeMode = 'p2p-host';
        playerId = 'host';
        currentLevel = hostDifficulty;
        currentStage = 1;
        p1Score = 0;
        p2Score = 0;
        startStage(); // Host generates and sends to guest
    });
    
    conn.on('data', data => {
        handleRemoteData(data);
    });
}

function joinRoom() {
    const hostId = document.getElementById('join-room-id').value.trim();
    if (!hostId) {
        document.getElementById('join-error').innerText = 'الرجاء إدخال كود الغرفة';
        document.getElementById('join-error').classList.add('hidden');
        return;
    }
    
    const btn = document.getElementById('join-room-btn');
    btn.disabled = true;
    btn.innerText = 'جاري الاتصال...';
    document.getElementById('join-error').classList.add('hidden');
    document.getElementById('status-text-guest').classList.remove('hidden');
    
    peer = new Peer();
    
    peer.on('open', () => {
        conn = peer.connect(hostId);
        
        conn.on('open', () => {
            document.getElementById('status-text-guest').innerText = 'تم الاتصال! في انتظار المضيف لبدء اللعبة...';
            activeMode = 'p2p-join';
            playerId = 'guest';
            p1Score = 0;
            p2Score = 0;
        });
        
        conn.on('data', data => {
            handleRemoteData(data);
        });
    });
    
    peer.on('error', err => {
        document.getElementById('join-error').innerText = 'فشل الاتصال: ' + err.message;
        document.getElementById('join-error').classList.add('hidden');
        btn.disabled = false;
        btn.innerText = 'انضمام ولعب';
        document.getElementById('status-text-guest').classList.add('hidden');
    });
}

function handleRemoteData(data) {
    if (data.type === 'start_stage') {
        currentStage = data.stage;
        differences = data.diffs;
        timeLeft = data.timeLeft;
        currentLevel = data.level;
        
        document.getElementById('main-menu').classList.add('hidden');
        document.getElementById('game-over').classList.add('hidden');
        document.getElementById('loading').classList.remove('hidden');
        clearInterval(timerInterval);
        penaltiesLeft = [];
        penaltiesRight = [];
        isPlaying = false;
        updateUI();
        
        const baseScene = scenesData[data.sceneIndex];
        const svgRightStr = data.svgRightStr;
        
        renderFromSVGs(baseScene, svgRightStr);
        
    } else if (data.type === 'start_stage_static') {
        currentStage = data.stage;
        currentLevel = data.level;
        timeLeft = data.timeLeft;
        differences = data.diffs;
        document.getElementById('stage').innerText = `${currentStage} / ${MAX_STAGES}`;
        document.getElementById('loading').classList.remove('hidden');
        
        const imgL = new Image();
        const imgR = new Image();
        let loaded = 0;
        const check = () => {
            loaded++;
            if(loaded===2) {
                ctxOffLeft.clearRect(0,0,800,600);
                ctxOffRight.clearRect(0,0,800,600);
                ctxOffLeft.drawImage(imgL, 0, 0, 800, 600);
                ctxOffRight.drawImage(imgR, 0, 0, 800, 600);
                startGameLoop();
            }
        };
        imgL.onload = check;
        imgR.onload = check;
        imgL.src = data.leftUrl;
        imgR.src = data.rightUrl;
    } else if (data.type === 'found') {
        const diffIndex = data.diffIndex;
        differences[diffIndex].found = true;
        differences[diffIndex].finder = data.finder; // 'host' or 'guest'
        
        if (data.finder === 'host') p1Score++;
        else p2Score++;
        
        updateUI();
        render();
        checkWin();
    } else if (data.type === 'miss') {
        if (playerId === 'host') {
            // Guest missed
            penaltiesRight.push({x: data.x, y: data.y, alpha: 1, color: '#ef5350'});
        } else {
            // Host missed
            penaltiesLeft.push({x: data.x, y: data.y, alpha: 1, color: '#4fc3f7'});
        }
        render();
    }
}

// Core Game Flow
function startStage() {
    // Only Local or Host enters here naturally to generate a stage
    if (activeMode === 'p2p-join') return; 
    
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('loading').classList.remove('hidden');
    clearInterval(timerInterval);
    score = 0;
    differences = [];
    penaltiesLeft = [];
    penaltiesRight = [];
    isPlaying = false;
    hintsRemaining = 3;

    let baseTime = currentLevel === 'easy' ? 120 : (currentLevel === 'medium' ? 60 : 45);
    let timeDrop = currentLevel === 'easy' ? 3 : (currentLevel === 'medium' ? 1 : 0.5);
    
    timeLeft = Math.max(10, Math.floor(baseTime - (currentStage - 1) * timeDrop));
    updateUI();

    setTimeout(() => {
        generateStage(currentStage);
    }, 100);
}

function nextStage() {
    if (currentStage < MAX_STAGES) {
        currentStage++;
        if (activeMode === 'p2p-host' || activeMode === 'local') {
            startStage();
        }
    }
}

function retryStage() {
    if (activeMode === 'p2p-host' || activeMode === 'local') {
        startStage();
    }
}

function useHint() {
    if (!isPlaying || hintsRemaining <= 0) return;
    
    const unfoundDiff = differences.find(d => !d.found && !d.isHinted);
    if (!unfoundDiff) return;
    
    hintsRemaining--;
    document.getElementById('hints-count').innerText = hintsRemaining;
    
    unfoundDiff.isHinted = true;
    render();
}

function extractDifferences(imgA, imgB, callback) {
    ctxOffLeft.clearRect(0,0,800,600);
    ctxOffRight.clearRect(0,0,800,600);
    ctxOffLeft.drawImage(imgA, 0, 0, 800, 600);
    ctxOffRight.drawImage(imgB, 0, 0, 800, 600);
    
    const dataA = ctxOffLeft.getImageData(0,0,800,600).data;
    const dataB = ctxOffRight.getImageData(0,0,800,600).data;
    
    const gridCols = 80, gridRows = 60, cellSize = 10;
    const grid = new Uint8Array(gridCols * gridRows);
    
    for(let i=0; i<dataA.length; i+=4) {
        let diff = Math.abs(dataA[i]-dataB[i]) + Math.abs(dataA[i+1]-dataB[i+1]) + Math.abs(dataA[i+2]-dataB[i+2]);
        if(diff > 50) { 
            let px = (i/4) % 800;
            let py = Math.floor((i/4) / 800);
            grid[Math.floor(py/cellSize) * gridCols + Math.floor(px/cellSize)] = 1;
        }
    }
    
    const visited = new Uint8Array(gridCols * gridRows);
    const diffs = [];
    for(let y=0; y<gridRows; y++) {
        for(let x=0; x<gridCols; x++) {
            if(grid[y*gridCols + x] === 1 && visited[y*gridCols + x] === 0) {
                let q = [[x,y]];
                visited[y*gridCols + x] = 1;
                let minX = x, maxX = x, minY = y, maxY = y;
                
                let head = 0;
                while(head < q.length) {
                    let [cx, cy] = q[head++];
                    if(cx < minX) minX = cx; if(cx > maxX) maxX = cx;
                    if(cy < minY) minY = cy; if(cy > maxY) maxY = cy;
                    const dirs = [[1,0], [-1,0], [0,1], [0,-1], [1,1], [-1,-1], [1,-1], [-1,1]];
                    for(let d of dirs) {
                        let nx = cx+d[0], ny = cy+d[1];
                        if(nx>=0 && nx<gridCols && ny>=0 && ny<gridRows) {
                            if(grid[ny*gridCols + nx] === 1 && visited[ny*gridCols + nx] === 0) {
                                visited[ny*gridCols + nx] = 1; q.push([nx,ny]);
                            }
                        }
                    }
                }
                
                let cx = (minX + maxX)*cellSize/2 + cellSize/2;
                let cy = (minY + maxY)*cellSize/2 + cellSize/2;
                let radius = Math.max((maxX-minX)*cellSize, (maxY-minY)*cellSize)/2 + 25;
                diffs.push({ x: cx, y: cy, radius: radius, found: false, finder: null });
            }
        }
    }
    
    differences = diffs;
    if(differences.length > 5) differences = differences.slice(0, 5);
    callback();
}

function generateStaticStage(index) {
    if (activeMode === 'p2p-join') return;
    document.getElementById('loading').classList.remove('hidden');
    
    if (currentImageSource === 'custom') {
        const fileInput = document.getElementById('custom-image-upload');
        if (fileInput.files.length === 0) {
            alert('الرجاء اختيار صورة مزدوجة (جنباً إلى جنب) أولاً من القائمة الرئيسية!');
            showMenu();
            return;
        }
        const reader = new FileReader();
        reader.onload = e => processSideBySideImage(e.target.result);
        reader.readAsDataURL(fileInput.files[0]);
        return;
    }
    
    const url = staticImageLevels[(index - 1) % staticImageLevels.length];
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
        const c1 = document.createElement('canvas'); c1.width = 800; c1.height = 600;
        const c2 = document.createElement('canvas'); c2.width = 800; c2.height = 600;
        const ctx1 = c1.getContext('2d');
        const ctx2 = c2.getContext('2d');
        
        ctx1.drawImage(img, 0, 0, 800, 600);
        ctx2.drawImage(img, 0, 0, 800, 600);
        
        for(let i=0; i<5; i++) {
            let x = 50 + Math.random() * 600;
            let y = 50 + Math.random() * 400;
            let size = 40 + Math.random() * 40;
            
            let imgData = ctx2.getImageData(x, y, size, size);
            for(let j=0; j<imgData.data.length; j+=4) {
                let r = imgData.data[j], g = imgData.data[j+1], b = imgData.data[j+2];
                let gray = (r+g+b)/3;
                imgData.data[j] = gray;
                imgData.data[j+1] = gray;
                imgData.data[j+2] = gray;
            }
            ctx2.putImageData(imgData, x, y);
        }
        
        const imgL = new Image(); const imgR = new Image();
        let loaded = 0;
        const check = () => {
            loaded++;
            if (loaded === 2) {
                extractDifferences(imgL, imgR, () => {
                    if (activeMode === 'p2p-host') {
                        conn.send({
                            type: 'start_stage_static',
                            stage: currentStage, level: currentLevel, timeLeft: timeLeft,
                            diffs: differences, leftUrl: c1.toDataURL(), rightUrl: c2.toDataURL()
                        });
                    }
                    startGameLoop();
                });
            }
        };
        imgL.onload = check; imgR.onload = check;
        imgL.src = c1.toDataURL(); imgR.src = c2.toDataURL();
    };
    img.onerror = () => { alert("Failed to load Unsplash image due to CORS. Trying SVG."); currentImageSource = 'svg'; generateStage(index); };
    img.src = url;
}

function processSideBySideImage(dataUrl) {
    const img = new Image();
    img.onload = () => {
        const halfWidth = img.width / 2;
        const c1 = document.createElement('canvas'); c1.width = 800; c1.height = 600;
        const c2 = document.createElement('canvas'); c2.width = 800; c2.height = 600;
        const ctx1 = c1.getContext('2d');
        const ctx2 = c2.getContext('2d');
        
        ctx1.drawImage(img, 0, 0, halfWidth, img.height, 0, 0, 800, 600);
        ctx2.drawImage(img, halfWidth, 0, halfWidth, img.height, 0, 0, 800, 600);
        
        const imgL = new Image(); const imgR = new Image();
        let loaded = 0;
        const check = () => {
            loaded++;
            if(loaded===2) {
                extractDifferences(imgL, imgR, () => {
                    if (activeMode === 'p2p-host') {
                        conn.send({
                            type: 'start_stage_static',
                            stage: currentStage, level: currentLevel, timeLeft: timeLeft,
                            diffs: differences, leftUrl: c1.toDataURL(), rightUrl: c2.toDataURL()
                        });
                    }
                    startGameLoop();
                });
            }
        };
        imgL.onload = check; imgR.onload = check;
        imgL.src = c1.toDataURL(); imgR.src = c2.toDataURL();
    };
    img.src = dataUrl;
}

function generateStage(index) {
    if (currentImageSource === 'static' || currentImageSource === 'custom') {
        generateStaticStage(index);
        return;
    }
    const sceneIndex = (currentStage - 1) % scenesData.length;
    const baseScene = scenesData[sceneIndex];

    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.visibility = 'hidden';
    tempDiv.style.width = '800px';
    tempDiv.style.height = '600px';
    tempDiv.innerHTML = baseScene;
    document.body.appendChild(tempDiv);
    
    const svgNode = tempDiv.querySelector('svg');
    const allElements = Array.from(svgNode.querySelectorAll('circle, rect, path, polygon, ellipse, line'));
    
    const validElements = [];
    allElements.forEach(el => {
        try {
            const bbox = el.getBBox();
            const area = bbox.width * bbox.height;
            if (area <= 40000 && area >= 10) { 
                let category = '';
                if (area >= 1000) category = 'easy';
                else if (area >= 200) category = 'medium';
                else category = 'hard';
                
                validElements.push({ el, bbox, area, category });
            }
        } catch(e) {}
    });
    
    let candidates = validElements.filter(v => v.category === currentLevel);
    if (candidates.length < 15) {
        candidates = validElements; 
    }
    
    candidates.sort(() => Math.random() - 0.5);
    
    const selected = [];
    const localDiffs = [];
    
    for (const item of candidates) {
        if (selected.length >= 5) break;
        
        const cx = item.bbox.x + item.bbox.width / 2;
        const cy = item.bbox.y + item.bbox.height / 2;
        
        let tooClose = false;
        for (const s of selected) {
            const scx = s.bbox.x + s.bbox.width / 2;
            const scy = s.bbox.y + s.bbox.height / 2;
            if (Math.hypot(cx - scx, cy - scy) < 100) {
                tooClose = true;
                break;
            }
        }
        
        if (!tooClose) {
            selected.push(item);
            
            const modType = Math.random();
            if (modType < 0.6) {
                item.el.setAttribute('display', 'none');
            } else {
                const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffffff', '#000000', '#ff8800', '#8800ff'];
                const randomColor = colors[Math.floor(Math.random() * colors.length)];
                
                if (item.el.tagName === 'line' || item.el.tagName === 'polyline' || item.el.getAttribute('fill') === 'none') {
                    item.el.setAttribute('stroke', randomColor);
                } else {
                    item.el.setAttribute('fill', randomColor);
                }
            }
            
            let radius = Math.max(item.bbox.width, item.bbox.height) / 2;
            if (currentLevel === 'easy') radius += 20;
            if (currentLevel === 'medium') radius += 15;
            if (currentLevel === 'hard') radius += 10;
            
            radius = Math.max(radius, currentLevel === 'hard' ? 15 : (currentLevel === 'medium' ? 25 : 40));
            
            localDiffs.push({ x: cx, y: cy, radius: radius, found: false, finder: null });
        }
    }
    
    if (localDiffs.length < 5) {
        for (const item of validElements) {
            if (localDiffs.length >= 5) break;
            if (!selected.includes(item)) {
                item.el.setAttribute('display', 'none');
                const cx = item.bbox.x + item.bbox.width / 2;
                const cy = item.bbox.y + item.bbox.height / 2;
                localDiffs.push({ x: cx, y: cy, radius: 30, found: false, finder: null });
                selected.push(item);
            }
        }
    }
    
    const serializer = new XMLSerializer();
    const svgRightStr = serializer.serializeToString(svgNode);
    document.body.removeChild(tempDiv);
    differences = localDiffs;

    if (activeMode === 'p2p-host') {
        conn.send({
            type: 'start_stage',
            stage: currentStage,
            level: currentLevel,
            timeLeft: timeLeft,
            sceneIndex: sceneIndex,
            svgRightStr: svgRightStr,
            diffs: localDiffs
        });
    }

    renderFromSVGs(baseScene, svgRightStr);
}

function renderFromSVGs(baseScene, svgRightStr) {
    const imgLeft = new Image();
    const imgRight = new Image();
    let loaded = 0;
    
    const checkLoaded = () => {
        loaded++;
        if(loaded === 2) {
            ctxOffLeft.clearRect(0,0,800,600);
            ctxOffRight.clearRect(0,0,800,600);
            ctxOffLeft.drawImage(imgLeft, 0, 0, 800, 600);
            ctxOffRight.drawImage(imgRight, 0, 0, 800, 600);
            startGameLoop();
        }
    }
    
    imgLeft.onload = checkLoaded;
    imgRight.onload = checkLoaded;
    imgLeft.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(baseScene);
    imgRight.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgRightStr);
}

function startGameLoop() {
    document.getElementById('loading').classList.add('hidden');
    isPlaying = true;
    render();
    startTimer();
}

function render() {
    ctxLeft.clearRect(0, 0, 800, 600);
    ctxRight.clearRect(0, 0, 800, 600);

    ctxLeft.drawImage(offLeft, 0, 0);
    ctxRight.drawImage(offRight, 0, 0);

    const drawPenalty = (ctx, p) => {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(p.x - 15, p.y - 15);
        ctx.lineTo(p.x + 15, p.y + 15);
        ctx.moveTo(p.x + 15, p.y - 15);
        ctx.lineTo(p.x - 15, p.y + 15);
        ctx.strokeStyle = p.color || `rgba(239, 68, 68, ${p.alpha})`; // Default red, overrides for p2p
        ctx.lineWidth = 6;
        ctx.stroke();
        ctx.restore();
    };

    penaltiesLeft.forEach(p => drawPenalty(ctxLeft, p));
    penaltiesRight.forEach(p => drawPenalty(ctxRight, p));

    differences.forEach(diff => {
        if (!diff.found && diff.isHinted) {
            [ctxLeft, ctxRight].forEach(ctx => {
                ctx.save();
                ctx.beginPath();
                ctx.arc(diff.x, diff.y, diff.radius + 15, 0, Math.PI * 2);
                ctx.strokeStyle = '#f59e0b';
                ctx.lineWidth = 4;
                ctx.setLineDash([5, 5]);
                ctx.stroke();
                ctx.restore();
            });
        }
        if(diff.found) {
            [ctxLeft, ctxRight].forEach(ctx => {
                ctx.save();
                ctx.beginPath();
                ctx.arc(diff.x, diff.y, diff.radius + 10, 0, Math.PI * 2);
                
                let colorBase = '#34d399'; // Default Green
                if (activeMode !== 'local') {
                    colorBase = diff.finder === 'host' ? '#4fc3f7' : '#ef5350';
                }
                
                ctx.strokeStyle = colorBase; 
                ctx.lineWidth = 6;
                ctx.stroke();
                
                ctx.restore();
            });
        }
    });
}

function animatePenalties() {
    let changed = false;
    [penaltiesLeft, penaltiesRight].forEach(arr => {
        for (let i = arr.length - 1; i >= 0; i--) {
            arr[i].alpha -= 0.02;
            if (arr[i].alpha <= 0) {
                arr.splice(i, 1);
            }
            changed = true;
        }
    });
    if (changed && isPlaying) render();
    requestAnimationFrame(animatePenalties);
}
requestAnimationFrame(animatePenalties);

function handleClick(e, canvas, isLeft) {
    if (!isPlaying) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    let hit = false;
    differences.forEach((diff, idx) => {
        if (!diff.found) {
            const dist = Math.hypot(diff.x - clickX, diff.y - clickY);
            if (dist < diff.radius + 20) { 
                diff.found = true;
                diff.finder = playerId;
                hit = true;
                
                if (activeMode === 'local') {
                    score++;
                } else {
                    if (playerId === 'host') p1Score++;
                    else p2Score++;
                    
                    conn.send({ type: 'found', diffIndex: idx, finder: playerId });
                }
                
                updateUI();
                render();
                checkWin();
            }
        }
    });

    if (!hit) {
        let pColor = activeMode === 'local' ? `rgba(239, 68, 68, 1)` : (playerId === 'host' ? '#4fc3f7' : '#ef5350');
        
        if (isLeft) penaltiesLeft.push({x: clickX, y: clickY, alpha: 1, color: pColor});
        else penaltiesRight.push({x: clickX, y: clickY, alpha: 1, color: pColor});
        
        if (activeMode !== 'local') {
            conn.send({ type: 'miss', x: clickX, y: clickY });
        }
        
        if (activeMode === 'local') {
            timeLeft = Math.max(0, timeLeft - 5);
            updateUI();
        } // In P2P, we don't drop time to keep it fair and synced simply
        
        canvas.style.transform = 'translate(5px, 0)';
        setTimeout(() => canvas.style.transform = 'translate(-5px, 0)', 50);
        setTimeout(() => canvas.style.transform = 'translate(5px, 0)', 100);
        setTimeout(() => canvas.style.transform = 'translate(0, 0)', 150);
    }
}

canvasLeft.addEventListener('pointerdown', (e) => handleClick(e, canvasLeft, true));
canvasRight.addEventListener('pointerdown', (e) => handleClick(e, canvasRight, false));

function updateUI() {
    if (activeMode === 'local') {
        document.getElementById('local-score-box').classList.remove('hidden');
        document.getElementById('p2p-score-box').classList.add('hidden');
        document.getElementById('score').innerText = `${score} / 5`;
    } else {
        document.getElementById('local-score-box').classList.add('hidden');
        document.getElementById('p2p-score-box').classList.remove('hidden');
        document.getElementById('p1-score').innerText = p1Score;
        document.getElementById('p2-score').innerText = p2Score;
    }

    document.getElementById('timer').innerText = timeLeft;
    document.getElementById('stage').innerText = `${currentStage} / ${MAX_STAGES}`;
    document.getElementById('hints-count').innerText = hintsRemaining;
    document.getElementById('hint-btn').disabled = (hintsRemaining <= 0);
    if(timeLeft <= 10) {
        document.getElementById('timer').style.color = '#ef4444';
    } else {
        document.getElementById('timer').style.color = '#fbbf24';
    }
}

function startTimer() {
    timerInterval = setInterval(() => {
        if (!isPlaying) return;
        timeLeft--;
        updateUI();
        if (timeLeft <= 0) {
            loseGame();
        }
    }, 1000);
}

function checkWin() {
    const totalFound = differences.filter(d => d.found).length;
    
    if (totalFound >= 5) {
        isPlaying = false;
        clearInterval(timerInterval);
        
        setTimeout(() => {
            if (activeMode === 'local') {
                if (currentStage >= MAX_STAGES) {
                    document.getElementById('end-message').innerText = 'أسطورة! لقد أنهيت جميع الـ 100 مرحلة!';
                    document.getElementById('end-message').style.color = '#34d399';
                    document.getElementById('end-stats').innerText = `أنت بطل لعبة الاختلافات الخمسة!`;
                    
                    const btn = document.getElementById('next-stage-btn');
                    btn.innerText = 'العودة للقائمة الرئيسية';
                    btn.onclick = showMenu;
                } else {
                    document.getElementById('end-message').innerText = 'أحسنت! فزت بالمرحلة!';
                    document.getElementById('end-message').style.color = '#34d399';
                    document.getElementById('end-stats').innerText = `أنهيت المرحلة ${currentStage} وتبقى ${timeLeft} ثانية`;
                    
                    const btn = document.getElementById('next-stage-btn');
                    btn.innerText = 'المرحلة التالية';
                    btn.onclick = nextStage;
                }
            } else {
                // P2P Match over (one stage)
                let msg = '';
                let color = '';
                
                if (playerId === 'host') {
                    if (p1Score > p2Score) { msg = 'لقد فزت! أنت أسرع من الخصم.'; color = '#4fc3f7'; }
                    else if (p1Score < p2Score) { msg = 'لقد خسرت! الخصم تفوق عليك.'; color = '#ef5350'; }
                    else { msg = 'تعادل!'; color = '#fbbf24'; }
                } else {
                    if (p2Score > p1Score) { msg = 'لقد فزت! أنت أسرع من المضيف.'; color = '#ef5350'; }
                    else if (p2Score < p1Score) { msg = 'لقد خسرت! المضيف تفوق عليك.'; color = '#4fc3f7'; }
                    else { msg = 'تعادل!'; color = '#fbbf24'; }
                }
                
                document.getElementById('end-message').innerText = msg;
                document.getElementById('end-message').style.color = color;
                document.getElementById('end-stats').innerText = `النتيجة - أنت: ${playerId === 'host' ? p1Score : p2Score} | الخصم: ${playerId === 'host' ? p2Score : p1Score}`;
                
                const btn = document.getElementById('next-stage-btn');
                if (playerId === 'host') {
                    btn.innerText = 'المرحلة التالية (لعب مرة أخرى)';
                    btn.onclick = nextStage;
                    btn.classList.remove('hidden');
                } else {
                    btn.classList.add('hidden'); // Only host can proceed
                    document.getElementById('end-stats').innerText += '\nفي انتظار المضيف لبدء مرحلة جديدة...';
                }
            }

            document.getElementById('game-over').classList.remove('hidden');
        }, 500);
    }
}

function loseGame() {
    isPlaying = false;
    clearInterval(timerInterval);
    
    document.getElementById('end-message').innerText = 'انتهى الوقت!';
    document.getElementById('end-message').style.color = '#ef4444';
    
    if (activeMode === 'local') {
        document.getElementById('end-stats').innerText = `لقد وجدت ${score} اختلافات فقط.`;
    } else {
        document.getElementById('end-stats').innerText = `انتهى الوقت! النتيجة الإجمالية - أنت: ${playerId === 'host' ? p1Score : p2Score} | الخصم: ${playerId === 'host' ? p2Score : p1Score}`;
    }
    
    const btn = document.getElementById('next-stage-btn');
    if (activeMode === 'local' || playerId === 'host') {
        btn.innerText = 'إعادة المحاولة';
        btn.onclick = retryStage;
        btn.classList.remove('hidden');
    } else {
        btn.classList.add('hidden');
        document.getElementById('end-stats').innerText += '\nفي انتظار المضيف...';
    }

    document.getElementById('game-over').classList.remove('hidden');
}

function useHint() {
    if (hintsRemaining <= 0 || !isPlaying) return;
    
    const unfound = differences.filter(d => !d.found && !d.isHinted);
    if (unfound.length > 0) {
        hintsRemaining--;
        const target = unfound[Math.floor(Math.random() * unfound.length)];
        target.isHinted = true;
        
        updateUI();
        render();
        
        setTimeout(() => {
            target.isHinted = false;
            if (isPlaying) render();
        }, 3000);
    }
}

showMenu();
