// SONIC BOOM — Bygone Island (Clean Rewrite)
// THREE and CANNON are globals
import { CoreEngine } from './engine/core.js?v=3';
import { GameCamera } from './engine/camera.js?v=3';
import { PhysicsEngine } from './engine/physics.js?v=3';
import { InputManager } from './engine/input.js?v=3';
import { TerrainBuilder, heightAt } from './engine/terrain.js?v=3';
import { AudioEngine } from './engine/audio.js?v=3';
import { SonicCharacter } from './characters/sonic.js?v=3';
import { WorldBuilder } from './world.js?v=3';
import { CharacterSelect } from './characters/select.js?v=3';
import { EggmanEvent } from './events/eggman.js?v=3';
import { NetworkClient } from './net/net-client.js?v=3';

const STATE = { MENU: 0, SELECT: 1, PLAYING: 2, PAUSED: 3, GAME_OVER: 4 };
let gameState = STATE.MENU;
let gameTime = 0;

// ---- DOM refs ----
const $ = id => document.getElementById(id);
const canvas = $('game-canvas');
const mainMenu = $('main-menu');
const selectMenu = $('select-menu');
const pauseMenu = $('pause-menu');
const hudEl = $('hud');
const hudRingsEl = $('hud-rings');
const hudHealthFill = $('hud-health-fill');
const hudTimerEl = $('hud-timer');
const hudScoreEl = $('hud-score-display');
const hudSpeedFill = $('hud-speed-fill');
const hudSpinChargeFill = $('hud-spin-charge-fill');
const hudLivesEl = $('hud-lives');
const dialogueBox = $('dialogue-box');
const dialogueText = $('dialogue-text');
const dialogueSpeaker = $('dialogue-speaker');
const touchControls = $('touch-controls');
const checkpointNotify = $('checkpoint-notify');
const gameOverScreen = $('game-over');
const levelResults = $('level-results');
const speedLinesEl = $('speed-lines');
const minimapCanvas = $('minimap-canvas');
const minimapCtx = minimapCanvas ? minimapCanvas.getContext('2d') : null;

// ============================================================
// ENGINE SETUP (wrapped in try-catch so buttons always wire)
// ============================================================
let engine, cam, physics, input, audio, world, terrain, charSelect, eggman;

try {
    engine = new CoreEngine(canvas);
    cam = new GameCamera(engine.camera);
    physics = new PhysicsEngine();
    input = new InputManager();
    audio = new AudioEngine();
    world = new WorldBuilder(engine.scene);
    terrain = new TerrainBuilder(engine.scene);
    charSelect = new CharacterSelect(engine.scene);
    eggman = new EggmanEvent(engine.scene);
} catch (e) {
    console.error('[Init] Engine setup error:', e);
}

try {
    if (terrain && physics) {
        terrain.build();
        physics.init({ x: 0, y: 4, z: -20 });
        physics.addGroundBody(terrain.body);
        for (const w of terrain.walls) physics.addGroundBody(w);
        physics._heightAtFn = heightAt;
    }
} catch (e) {
    console.error('[Init] Terrain/Physics error:', e);
}

let player = null;
let playerHealth = 100;
let playerMaxHealth = 100;
let score = 0;
let enemiesDefeated = 0;
let lastCheckpointIndex = 0;

// ---- Collectible Rings ----
const worldRings = [];
const RING_GEO = new THREE.TorusGeometry(0.8, 0.12, 8, 24);
const RING_MAT = new THREE.MeshStandardMaterial({ color: 0xFFD700, emissive: 0xFFD700, emissiveIntensity: 0.6, metalness: 0.9, roughness: 0.1 });
const RING_COLLECT_MAT = new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x00ff88, emissiveIntensity: 0.8 });

function spawnWorldRings() {
    const ringPositions = [
        [5, 2, -20], [10, 2, -20], [15, 2, -20], [20, 2, -20],
        [5, 3, -25], [10, 4, -25], [15, 3, -25],
        [-10, 2, -10], [-15, 3, -10], [-20, 4, -10],
        [0, 3, -35], [5, 4, -40], [10, 3, -45],
        [-5, 2, 5], [-10, 3, 10], [-15, 2, 15],
        [20, 3, 5], [25, 4, 0], [30, 3, -5],
        [0, 5, -50], [5, 6, -55], [10, 5, -60],
        [-20, 3, -30], [-25, 4, -35], [-30, 3, -40],
        [15, 2, 20], [20, 3, 25], [25, 2, 30],
        [-5, 4, -55], [0, 5, -60], [5, 6, -65],
        [35, 3, -10], [40, 4, -15], [45, 3, -20],
        [-35, 3, -15], [-40, 4, -20], [-45, 3, -25],
        [0, 8, -70], [5, 9, -75], [10, 8, -80],
    ];
    for (const pos of ringPositions) {
        const ring = new THREE.Mesh(RING_GEO, RING_MAT);
        ring.position.set(pos[0], pos[1], pos[2]);
        ring.rotation.x = Math.PI / 2;
        ring.userData.collected = false;
        ring.userData.baseY = pos[1];
        engine.scene.add(ring);
        worldRings.push(ring);
    }
}

// ---- Enemy Robots ----
const enemies = [];
const ENEMY_BODY_MAT = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.8, roughness: 0.3 });
const ENEMY_EYE_MAT = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.8 });

function spawnEnemy(x, z) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 1.8, 8), ENEMY_BODY_MAT);
    body.position.y = 1.2;
    body.castShadow = true;
    group.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), ENEMY_BODY_MAT);
    head.position.y = 2.5;
    head.castShadow = true;
    group.add(head);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 6), ENEMY_EYE_MAT);
    eye.position.set(0, 2.6, 0.45);
    group.add(eye);
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 4), ENEMY_BODY_MAT);
    antenna.position.y = 3.1;
    group.add(antenna);
    const antTip = new THREE.Mesh(new THREE.SphereGeometry(0.08, 4, 4), new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1 }));
    antTip.position.y = 3.4;
    group.add(antTip);

    const baseY = heightAt(x, z);
    group.position.set(x, baseY, z);
    group.userData = { alive: true, patrolAngle: Math.random() * Math.PI * 2, patrolRadius: 3 + Math.random() * 4, originX: x, originZ: z, health: 2, hitTimer: 0 };
    engine.scene.add(group);
    enemies.push(group);
}

function spawnEnemies() {
    const spots = [
        [15, -15], [25, -10], [30, -25], [-15, -35], [-25, -30], [-35, -20],
        [5, -55], [15, -60], [-10, -65], [40, -30], [-40, -15], [0, -80],
        [20, 15], [-20, 10], [30, 5], [-30, -45], [10, -70], [-15, -75],
    ];
    for (const [x, z] of spots) spawnEnemy(x, z);
}

// ---- Speed Boost Pads ----
const boostPads = [];
function spawnBoostPads() {
    const padGeo = new THREE.BoxGeometry(2.5, 0.15, 3.5);
    const padMat = new THREE.MeshStandardMaterial({ color: 0x00d2ff, emissive: 0x00d2ff, emissiveIntensity: 0.9 });
    const arrowMat = new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffff00, emissiveIntensity: 0.8 });
    const padPositions = [
        [0, -15, 0], [12, -25, 0.3], [-12, -35, -0.2],
        [25, -40, 0.1], [-25, -50, 0.2], [0, -60, 0],
        [35, -20, 0.4], [-35, -30, -0.3],
    ];
    for (const [x, z, rot] of padPositions) {
        const baseY = heightAt(x, z);
        const pad = new THREE.Mesh(padGeo, padMat);
        pad.position.set(x, baseY + 0.1, z);
        pad.rotation.y = rot;
        pad.receiveShadow = true;
        engine.scene.add(pad);
        const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.8, 3), arrowMat);
        arrow.rotation.x = -Math.PI / 2;
        arrow.position.set(x, baseY + 0.25, z + 0.8);
        engine.scene.add(arrow);
        boostPads.push({ mesh: pad, x, z, radius: 2 });
    }
}

// ---- Floating Platforms ----
const platformBodies = [];
function spawnPlatforms() {
    const platMat = new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.7 });
    const platPositions = [
        [0, 6, -45], [8, 8, -50], [-8, 7, -55],
        [0, 10, -65], [12, 9, -70], [-12, 11, -75],
        [5, 12, -85], [-5, 10, -90],
    ];
    for (const [x, y, z] of platPositions) {
        const plat = new THREE.Mesh(new THREE.BoxGeometry(4, 0.5, 4), platMat);
        plat.position.set(x, y, z);
        plat.castShadow = true;
        plat.receiveShadow = true;
        engine.scene.add(plat);
        const platBody = new CANNON.Body({ mass: 0 });
        platBody.addShape(new CANNON.Box(new CANNON.Vec3(2, 0.25, 2)));
        platBody.position.set(x, y, z);
        physics.world.addBody(platBody);
        platformBodies.push(platBody);
    }
}

// ---- Dialogue ----
let _dialogueTimer = null;
function showDialogue(speaker, text) {
    if (!dialogueBox) return;
    dialogueSpeaker.textContent = speaker;
    dialogueText.textContent = text;
    dialogueBox.classList.remove('hidden');
    clearTimeout(_dialogueTimer);
    _dialogueTimer = setTimeout(() => dialogueBox.classList.add('hidden'), 4000);
}

// ---- HUD ----
function updateHUD() {
    if (hudRingsEl) hudRingsEl.textContent = player ? player.rings : 0;
    if (hudTimerEl) {
        const m = Math.floor(gameTime / 60);
        const s = Math.floor(gameTime % 60);
        hudTimerEl.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }
    if (hudScoreEl) hudScoreEl.textContent = 'SCORE: ' + score;
    if (hudLivesEl) {
        const lives = player ? player.lives : 3;
        hudLivesEl.innerHTML = '';
        for (let i = 0; i < lives; i++) {
            const icon = document.createElement('span');
            icon.className = 'life-icon';
            icon.textContent = '\uD83E\uDD94';
            hudLivesEl.appendChild(icon);
        }
    }
    if (!hudHealthFill) return;
    const pct = Math.max(0, playerHealth / playerMaxHealth) * 100;
    hudHealthFill.style.width = pct + '%';
    if (pct < 30) hudHealthFill.style.background = '#f44336';
    else if (pct < 60) hudHealthFill.style.background = '#ff9800';
    else hudHealthFill.style.background = '#4caf50';
}

function updateSpeedBar(speedRatio) {
    if (hudSpeedFill) {
        const pct = Math.min(100, speedRatio * 100);
        hudSpeedFill.style.width = pct + '%';
    }
    if (speedLinesEl) {
        if (speedRatio > 0.6) speedLinesEl.classList.add('active');
        else speedLinesEl.classList.remove('active');
    }
}

// ---- Minimap ----
function drawMinimap() {
    if (!minimapCtx || !player) return;
    const w = minimapCanvas.width, h = minimapCanvas.height;
    minimapCtx.clearRect(0, 0, w, h);
    minimapCtx.fillStyle = 'rgba(0,0,0,0.6)';
    minimapCtx.fillRect(0, 0, w, h);
    const px = player.position.x, pz = player.position.z;
    const scale = 0.45;
    const cx = w / 2, cy = h / 2;

    for (const ring of worldRings) {
        if (ring.userData.collected) continue;
        const sx = cx + (ring.position.x - px) * scale;
        const sy = cy + (ring.position.z - pz) * scale;
        if (sx > 2 && sx < w - 2 && sy > 2 && sy < h - 2) {
            minimapCtx.fillStyle = '#FFD700';
            minimapCtx.fillRect(sx - 1, sy - 1, 2, 2);
        }
    }

    for (const enemy of enemies) {
        if (!enemy.userData.alive) continue;
        const sx = cx + (enemy.position.x - px) * scale;
        const sy = cy + (enemy.position.z - pz) * scale;
        if (sx > 2 && sx < w - 2 && sy > 2 && sy < h - 2) {
            minimapCtx.fillStyle = '#ff0000';
            minimapCtx.fillRect(sx - 2, sy - 2, 4, 4);
        }
    }

    if (player) {
        minimapCtx.fillStyle = '#1565C0';
        minimapCtx.beginPath();
        minimapCtx.arc(cx, cy, 3.5, 0, Math.PI * 2);
        minimapCtx.fill();
        const angle = player.facingAngle;
        minimapCtx.strokeStyle = '#ffffff';
        minimapCtx.lineWidth = 2;
        minimapCtx.beginPath();
        minimapCtx.moveTo(cx, cy);
        minimapCtx.lineTo(cx + Math.sin(angle) * 8, cy + Math.cos(angle) * 8);
        minimapCtx.stroke();
    }
}

// ---- Ring Collection ----
function checkRingCollection() {
    if (!player) return;
    const pp = player.position;
    for (const ring of worldRings) {
        if (ring.userData.collected) continue;
        const dx = pp.x - ring.position.x;
        const dy = (pp.y + 1) - ring.position.y;
        const dz = pp.z - ring.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < 2.5) {
            ring.userData.collected = true;
            ring.material = RING_COLLECT_MAT;
            ring.scale.setScalar(1.5);
            player.rings++;
            score += 100;
            try { audio.playRingCollect(); } catch (e) {}

            const startY = ring.position.y;
            let t = 0;
            const animRing = () => {
                t += 0.03;
                ring.position.y = startY + t * 3;
                ring.material.opacity = Math.max(0, 1 - t);
                ring.material.transparent = true;
                ring.scale.setScalar(1.5 + t * 2);
                if (t < 1) requestAnimationFrame(animRing);
                else engine.scene.remove(ring);
            };
            animRing();
        }
    }
}

// ---- Checkpoints ----
function checkCheckpoints() {
    if (!player) return;
    const checkpoints = world.getCheckpoints ? world.getCheckpoints() : [];
    const pp = player.position;
    for (let i = lastCheckpointIndex + 1; i < checkpoints.length; i++) {
        const cp = checkpoints[i];
        const dx = pp.x - cp.x, dz = pp.z - cp.z;
        if (Math.sqrt(dx * dx + dz * dz) < 6) {
            cp.activated = true;
            lastCheckpointIndex = i;
            if (checkpointNotify) {
                checkpointNotify.classList.add('show');
                setTimeout(() => checkpointNotify.classList.remove('show'), 2000);
            }
            try { audio.playCheckpoint(); } catch (e) {}
            break;
        }
    }
}

// ---- Enemy AI ----
function updateEnemies(dt) {
    if (!player) return;
    const pp = player.position;
    for (const enemy of enemies) {
        if (!enemy.userData.alive) continue;

        if (enemy.userData.hitTimer > 0) {
            enemy.userData.hitTimer -= dt;
        }

        const dx = pp.x - enemy.position.x;
        const dz = pp.z - enemy.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < 15) {
            const speed = 4;
            enemy.position.x += (dx / dist) * speed * dt;
            enemy.position.z += (dz / dist) * speed * dt;
            enemy.lookAt(pp.x, enemy.position.y, pp.z);
        } else {
            enemy.userData.patrolAngle += dt * 1.5;
            const px = enemy.userData.originX + Math.cos(enemy.userData.patrolAngle) * enemy.userData.patrolRadius;
            const pz = enemy.userData.originZ + Math.sin(enemy.userData.patrolAngle) * enemy.userData.patrolRadius;
            enemy.position.x += (px - enemy.position.x) * 2 * dt;
            enemy.position.z += (pz - enemy.position.z) * 2 * dt;
        }
        enemy.position.y = heightAt(enemy.position.x, enemy.position.z) + 0.5 + Math.sin(performance.now() * 0.003) * 0.2;

        const isAttacking = (physics.isSpinDashActive || physics.isHomingAttacking);

        if (dist < 2.5 && pp.y > enemy.position.y + 1 && player.velocity.y < 0) {
            enemy.userData.health--;
            enemy.userData.hitTimer = 0.5;
            cam.shake(0.5);
            player.velocity.y = 12;
            score += 200;
            if (enemy.userData.health <= 0) {
                enemy.userData.alive = false;
                score += 500;
                enemiesDefeated++;
                try { audio.playEnemyDestroy(); } catch (e) {}
                for (let i = 0; i < 10; i++) {
                    const spark = new THREE.Mesh(
                        new THREE.SphereGeometry(0.2 + Math.random() * 0.3, 4, 4),
                        new THREE.MeshBasicMaterial({ color: 0xff6600 })
                    );
                    spark.position.copy(enemy.position);
                    spark.position.x += (Math.random() - 0.5) * 2;
                    spark.position.y += Math.random() * 2;
                    spark.position.z += (Math.random() - 0.5) * 2;
                    engine.scene.add(spark);
                    setTimeout(() => engine.scene.remove(spark), 400);
                }
                engine.scene.remove(enemy);
                showDialogue('System', 'Enemy destroyed! +500');
            }
        } else if (dist < 2.5 && isAttacking) {
            enemy.userData.health--;
            enemy.userData.hitTimer = 0.5;
            cam.shake(0.3);
            if (enemy.userData.health <= 0) {
                enemy.userData.alive = false;
                score += 500;
                enemiesDefeated++;
                try { audio.playEnemyDestroy(); } catch (e) {}
                engine.scene.remove(enemy);
                showDialogue('System', 'Enemy destroyed! +500');
            }
        } else if (dist < 2.5 && player.invincibleTimer <= 0 && !isAttacking) {
            const result = player.takeDamage();
            if (result) {
                playerHealth = Math.max(0, playerHealth - 20);
                cam.shake(0.8);
                try { audio.playDamage(); } catch (e) {}
                showDialogue('System', 'Hit! -20 HP');
            }
        }
    }
}

// ---- Boost Pad Check ----
function checkBoostPads() {
    if (!player) return;
    const pp = player.position;
    for (const pad of boostPads) {
        const dx = pp.x - pad.x;
        const dz = pp.z - pad.z;
        if (Math.sqrt(dx * dx + dz * dz) < pad.radius && player.velocity) {
            const speed = Math.sqrt(player.velocity.x ** 2 + player.velocity.z ** 2);
            if (speed > 5) {
                const dir = new THREE.Vector3(player.velocity.x, 0, player.velocity.z).normalize();
                player.velocity.x = dir.x * 80;
                player.velocity.z = dir.z * 80;
                cam.shake(0.3);
                try { audio.playBoostPad(); } catch (e) {}
            }
        }
    }
}

// ---- Bounce Springs Check ----
function checkSprings() {
    if (!player) return;
    const springs = world.getSprings ? world.getSprings() : [];
    const pp = player.position;
    for (const spring of springs) {
        const dx = pp.x - spring.x;
        const dy = pp.y - spring.y;
        const dz = pp.z - spring.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < spring.radius && Math.abs(dy) < 2.2) {
            physics.playerBody.velocity.y = spring.force;
            physics.playerBody.velocity.x += player.facing.x * 12;
            physics.playerBody.velocity.z += player.facing.z * 12;
            physics.grounded = false;
            cam.shake(0.4);
            try { audio.playSpring(); } catch (e) {}

            if (spring.topPlate) {
                spring.topPlate.position.y = 0.2;
                let t = 0;
                const bounceAnim = () => {
                    t += 0.1;
                    spring.topPlate.position.y = 0.2 + Math.sin(t * Math.PI) * 0.7;
                    if (t < 1) requestAnimationFrame(bounceAnim);
                    else spring.topPlate.position.y = 0.75;
                };
                bounceAnim();
            }
        }
    }
}

// ---- Dynamic Eggman Boss Event ----
let eggmanEventTimer = 0;
function updateEggmanBoss(dt) {
    if (!eggman) return;

    // Dynamic world event trigger every 120s
    eggmanEventTimer += dt;
    if (eggmanEventTimer > 120 && !eggman.active) {
        eggmanEventTimer = 0;
        eggman.start();
        showDialogue('Dr. Eggman', '🚨 DYNAMIC WORLD EVENT: Dr. Eggman has arrived in his Egg Slicer Mech! Team up to defeat him!');
    }

    if (!eggman.active || !eggman.mech) return;
    eggman.update(dt, [player.position]);
    if (eggman.mech) {
        const dx = player.position.x - eggman.mech.position.x;
        const dz = player.position.z - eggman.mech.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const isAttacking = (physics.isSpinDashActive || physics.isHomingAttacking);
        if (dist < 5 && isAttacking) {
            eggman.takeDamage(15);
            cam.shake(0.6);
            if (eggman.health <= 0) {
                try { audio.playBossDefeat(); } catch (e) {}
                showDialogue('Dr. Eggman', 'Curse you! This isn\'t over!');
            }
        }
        if (dist < 4 && player.invincibleTimer <= 0 && !isAttacking) {
            const result = player.takeDamage();
            if (result) {
                playerHealth = Math.max(0, playerHealth - 30);
                cam.shake(1);
                try { audio.playDamage(); } catch (e) {}
            }
        }
    }
}

// ---- Enerbeam Mechanic ----
let _enerbeamActive = false;
function handleEnerbeam() {
    if (!player) return;
    if (input.enerbeamHeld && !_enerbeamActive) {
        _enerbeamActive = true;
        cam.shake(0.2);
        try { audio.playEnerbeam(); } catch (e) {}
    } else if (!input.enerbeamHeld && _enerbeamActive) {
        _enerbeamActive = false;
        player.hideEnerbeam();
    }
    
    if (_enerbeamActive) {
        // 1. Enerbeam tether vs Eggman Mech
        if (eggman && eggman.active && eggman.mech) {
            const dx = player.position.x - eggman.mech.position.x;
            const dy = player.position.y - eggman.mech.position.y;
            const dz = player.position.z - eggman.mech.position.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (dist < 25) {
                const targetPos = new THREE.Vector3(eggman.mech.position.x, eggman.mech.position.y + 4, eggman.mech.position.z);
                player.showEnerbeam(targetPos);
                eggman.takeDamage(0.6);
                cam.shake(0.15);
                return;
            }
        }

        // 2. Enerbeam tether vs World Anchors
        const anchors = world.getEnerbeamAnchors ? world.getEnerbeamAnchors() : [];
        let closestAnchor = null;
        let minDist = 18;
        const pp = player.position;
        for (const a of anchors) {
            const dx = pp.x - a.x, dy = pp.y - a.y, dz = pp.z - a.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (dist < minDist) {
                minDist = dist;
                closestAnchor = a;
            }
        }

        if (closestAnchor) {
            const targetPos = new THREE.Vector3(closestAnchor.x, closestAnchor.y, closestAnchor.z);
            player.showEnerbeam(targetPos);
            // Enerbeam Grapple pull impulse
            physics.playerBody.velocity.x += (closestAnchor.x - pp.x) * 1.5;
            physics.playerBody.velocity.y = Math.max(physics.playerBody.velocity.y, 14);
            physics.playerBody.velocity.z += (closestAnchor.z - pp.z) * 1.5;
            physics.grounded = false;
        } else {
            const target = new THREE.Vector3(
                player.position.x + player.facing.x * 12,
                player.position.y + 2,
                player.position.z + player.facing.z * 12
            );
            player.showEnerbeam(target);
        }
    }
}

// ---- Interactive Social Props (Sitting & Pickup / Throw) ----
let heldProp = null;
function checkInteractiveProps(dt) {
    if (!player) return;
    const props = world.getInteractiveProps ? world.getInteractiveProps() : [];
    const sittingSpots = world.getSittingSpots ? world.getSittingSpots() : [];
    const pp = player.position;

    // 1. Sit on Beach Chair / Bench
    if (input.interactJust) {
        let nearestSpot = null;
        let minDist = 2.2;
        for (const spot of sittingSpots) {
            const dx = pp.x - spot.x, dz = pp.z - spot.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < minDist) {
                minDist = dist;
                nearestSpot = spot;
            }
        }
        if (nearestSpot) {
            physics.playerBody.position.set(nearestSpot.x, nearestSpot.y, nearestSpot.z);
            physics.playerBody.velocity.set(0, 0, 0);
            showDialogue('Social Hub', 'جلس اللاعب للاسترخاء والحديث على الشاطئ 🧘');
            return;
        }
    }

    // 2. Pick up & Throw Coconuts or Beach Balls
    if (input.actionJust || input.interactJust) {
        if (heldProp) {
            heldProp.held = false;
            heldProp.velocity.set(
                player.facing.x * 22,
                10,
                player.facing.z * 22
            );
            showDialogue('Social Fun', 'رمي الجسم التفاعلي! ⚽🥥');
            heldProp = null;
        } else {
            let closest = null, minDist = 2.5;
            for (const prop of props) {
                if (prop.held) continue;
                const dx = pp.x - prop.mesh.position.x;
                const dz = pp.z - prop.mesh.position.z;
                const dist = Math.sqrt(dx * dx + dz * dz);
                if (dist < minDist) {
                    minDist = dist;
                    closest = prop;
                }
            }
            if (closest) {
                closest.held = true;
                heldProp = closest;
                showDialogue('Social Fun', 'حمل جسم تفاعلي! اضغط رمي لإطلاقه 🥥');
            }
        }
    }

    // Carry held prop above player head
    if (heldProp && heldProp.held) {
        heldProp.mesh.position.set(
            player.position.x,
            player.position.y + 2.4,
            player.position.z
        );
        heldProp.velocity.set(0, 0, 0);
    }
}

// ---- Homing Target ----
function findHomingTarget() {
    if (!player) return null;
    const pp = player.position;
    let closest = null, closestDist = 35;

    // Check enemies
    for (const enemy of enemies) {
        if (!enemy.userData.alive) continue;
        const dx = pp.x - enemy.position.x;
        const dy = pp.y - enemy.position.y;
        const dz = pp.z - enemy.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < closestDist) {
            closestDist = dist;
            closest = enemy.position.clone();
        }
    }

    // Check springs
    const springs = world.getSprings ? world.getSprings() : [];
    for (const s of springs) {
        const dx = pp.x - s.x;
        const dy = pp.y - s.y;
        const dz = pp.z - s.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < closestDist) {
            closestDist = dist;
            closest = new THREE.Vector3(s.x, s.y, s.z);
        }
    }

    return closest;
}

// ---- Game Over ----
function triggerGameOver() {
    gameState = STATE.GAME_OVER;
    if (gameOverScreen) gameOverScreen.classList.add('active');
    const goTime = $('go-time');
    const goRings = $('go-rings');
    const goScore = $('go-score');
    const goEnemies = $('go-enemies');
    if (goTime) goTime.textContent = String(Math.floor(gameTime / 60)).padStart(2, '0') + ':' + String(Math.floor(gameTime % 60)).padStart(2, '0');
    if (goRings) goRings.textContent = player ? player.rings : 0;
    if (goScore) goScore.textContent = score;
    if (goEnemies) goEnemies.textContent = enemiesDefeated;
}

// ---- Level Complete ----
function triggerLevelComplete() {
    if (gameState !== STATE.PLAYING) return;
    gameState = STATE.PAUSED;
    if (levelResults) levelResults.classList.add('active');
    const ringBonus = (player ? player.rings : 0) * 50;
    const timeBonus = Math.max(0, 3000 - Math.floor(gameTime) * 10);
    const totalScore = score + ringBonus + timeBonus;
    const gradeEl = $('results-grade');
    const resTime = $('res-time');
    const resRings = $('res-rings');
    const resScore = $('res-score');
    const resEnemies = $('res-enemies');
    if (gradeEl) {
        let grade = 'D';
        if (totalScore > 8000) grade = 'S';
        else if (totalScore > 6000) grade = 'A';
        else if (totalScore > 4000) grade = 'B';
        else if (totalScore > 2000) grade = 'C';
        gradeEl.textContent = grade;
        gradeEl.className = 'results-grade grade-' + grade.toLowerCase();
    }
    if (resTime) resTime.textContent = String(Math.floor(gameTime / 60)).padStart(2, '0') + ':' + String(Math.floor(gameTime % 60)).padStart(2, '0');
    if (resRings) resRings.textContent = player ? player.rings : 0;
    if (resScore) resScore.textContent = totalScore;
    if (resEnemies) resEnemies.textContent = enemiesDefeated;
}

// ---- Cleanup ----
function cleanupGame() {
    for (const r of worldRings) { if (r.parent) engine.scene.remove(r); }
    worldRings.length = 0;
    for (const e of enemies) { if (e.parent) engine.scene.remove(e); }
    enemies.length = 0;
    for (const p of boostPads) { if (p.mesh && p.mesh.parent) engine.scene.remove(p.mesh); }
    boostPads.length = 0;
    for (const pb of platformBodies) { physics.world.removeBody(pb); }
    platformBodies.length = 0;
    try { world.clear(); } catch (e) {}
    try { eggman.reset(); } catch (e) {}
    _enerbeamActive = false;
    lastCheckpointIndex = 0;
    enemiesDefeated = 0;
}

// ---- Return to Menu ----
function returnToMenu() {
    gameState = STATE.MENU;
    hudEl.classList.remove('active');
    touchControls.classList.remove('active');
    pauseMenu.classList.remove('active');
    if (gameOverScreen) gameOverScreen.classList.remove('active');
    if (levelResults) levelResults.classList.remove('active');
    if (speedLinesEl) speedLinesEl.classList.remove('active');
    if (player && player.group) engine.scene.remove(player.group);
    player = null;
    cleanupGame();
    mainMenu.classList.remove('hidden');
}

// ---- Respawn ----
function respawnAtCheckpoint() {
    if (!player) return;
    const checkpoints = world.getCheckpoints ? world.getCheckpoints() : [];
    const cp = checkpoints[lastCheckpointIndex];
    if (cp) {
        const spawnY = heightAt(cp.x, cp.z) + 3;
        physics.playerBody.position.set(cp.x, spawnY, cp.z);
        physics.playerBody.velocity.set(0, 0, 0);
        player.respawn(new THREE.Vector3(cp.x, spawnY, cp.z));
        playerHealth = playerMaxHealth;
    } else {
        const spawnY = heightAt(0, -20) + 3;
        physics.playerBody.position.set(0, spawnY, -20);
        physics.playerBody.velocity.set(0, 0, 0);
        player.respawn(new THREE.Vector3(0, spawnY, -20));
        playerHealth = playerMaxHealth;
    }
}

// ============================================================
// MENU WIRING — 3 Standardized Game Modes
// ============================================================

// Mode 1: Local Play (4-6 Players)
const btnModeLocal = document.getElementById('btn-mode-local');
const localPlayMenu = document.getElementById('local-play-menu');
const btnLocalStartGame = document.getElementById('btn-local-start-game');
const btnLocalBackMain = document.getElementById('btn-local-back-main');

if (btnModeLocal) {
    btnModeLocal.onclick = () => {
        mainMenu.classList.add('hidden');
        if (localPlayMenu) localPlayMenu.style.display = 'flex';
    };
}
if (btnLocalBackMain) {
    btnLocalBackMain.onclick = () => {
        if (localPlayMenu) localPlayMenu.style.display = 'none';
        mainMenu.classList.remove('hidden');
    };
}
if (btnLocalStartGame) {
    btnLocalStartGame.onclick = () => {
        const countSelect = document.getElementById('local-player-count-select');
        const playerCount = countSelect ? parseInt(countSelect.value) : 6;
        if (localPlayMenu) localPlayMenu.style.display = 'none';
        showDialogue('Local Play', `بدء اللعب محلياً لـ ${playerCount} لاعبين! دور اللاعب الأول 🎮`);
        startGame();
    };
}

// Mode 2: Private Room / P2P
const btnModePrivate = document.getElementById('btn-mode-private');
const joinMenu = document.getElementById('join-menu');
const btnJoinBack = document.getElementById('btn-join-back');
if (btnModePrivate) {
    btnModePrivate.onclick = async () => {
        mainMenu.classList.add('hidden');
        if (joinMenu) {
            joinMenu.classList.remove('hidden');
            joinMenu.style.display = 'flex';
        }
        try {
            await initNetworkClient();
            if (netClient) {
                const res = await netClient.host('sonic');
                if (joinMenu) joinMenu.style.display = 'none';
                const lobbyMenu = $('lobby-menu');
                if (lobbyMenu) lobbyMenu.style.display = 'flex';
                if ($('lobby-code')) $('lobby-code').textContent = res.code;
            }
        } catch (e) {
            console.warn('[Net] Offline local listen-server room mode:', e.message);
        }
    };
}
if (btnJoinBack) {
    btnJoinBack.onclick = () => {
        if (joinMenu) {
            joinMenu.classList.add('hidden');
            joinMenu.style.display = 'none';
        }
        mainMenu.classList.remove('hidden');
    };
}

// ============================================================
// MULTIPLAYER & NETWORKING INTEGRATION
// ============================================================
let netClient = null;
let remotePlayerMeshes = {};

function initNetworkClient() {
    if (netClient && netClient.connected) return Promise.resolve(netClient);
    const playerName = ($('player-name') && $('player-name').value) || 'Player_' + Math.floor(Math.random() * 1000);
    netClient = new NetworkClient({
        name: playerName,
        onEvent: (evt) => handleNetEvent(evt)
    });
    return netClient.connect().catch(err => {
        console.warn('[Net] Direct socket offline, running local server mode:', err.message);
    });
}

function handleNetEvent(evt) {
    if (evt.type === 'lobby:update') {
        renderLobbyPlayers(evt.players);
    } else if (evt.type === 'eggman:event') {
        if (eggman && !eggman.active) {
            eggman.start();
            showDialogue('Dr. Eggman', evt.manual ? '💥 DUAL TRIGGER: Host triggered Dr. Eggman Mech Attack!' : '🚨 RANDOM EVENT: Dr. Eggman has invaded Bygone Island!');
        }
    } else if (evt.type === 'player:move') {
        updateRemotePlayerMesh(evt.playerId, evt.pos, evt.rot, evt.anim, evt.emote);
    } else if (evt.type === 'chat') {
        addChatMessage(evt.fromName, evt.message);
    }
}

function renderLobbyPlayers(players) {
    const container = $('lobby-players');
    if (!container) return;
    container.innerHTML = '';
    const charCounts = {};

    for (const p of players) {
        charCounts[p.character] = (charCounts[p.character] || 0) + 1;
        const count = charCounts[p.character];
        const el = document.createElement('div');
        el.className = 'lobby-player' + (p.isHost ? ' host' : '');
        const tintLabel = count > 1 ? ` (P${count} Tint)` : '';
        el.innerHTML = `
            <div class="dot" style="background:${p.character === 'sonic' ? '#1565C0' : p.character === 'tails' ? '#FF8C00' : p.character === 'knuckles' ? '#CC0000' : '#E91E63'}"></div>
            <div class="name">${p.name}${tintLabel}</div>
            <div class="role">${p.character.toUpperCase()}</div>
        `;
        container.appendChild(el);
    }
}

function updateRemotePlayerMesh(pid, pos, rot, anim, emote) {
    if (!pos || !engine) return;
    let group = remotePlayerMeshes[pid];
    if (!group) {
        group = new THREE.Group();
        const headMesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.8, 12, 10),
            new THREE.MeshStandardMaterial({ color: 0x1565C0 })
        );
        headMesh.position.y = 1.6;
        group.add(headMesh);
        const bodyMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(0.5, 0.4, 1.4, 8),
            new THREE.MeshStandardMaterial({ color: 0xffffff })
        );
        bodyMesh.position.y = 0.7;
        group.add(bodyMesh);
        engine.scene.add(group);
        
        group.userData = {
            targetPos: new THREE.Vector3(pos.x, pos.y, pos.z),
            targetRotY: rot ? (rot.y || 0) : 0,
            anim: anim || 'idle'
        };
        group.position.set(pos.x, pos.y, pos.z);
        remotePlayerMeshes[pid] = group;
    } else {
        // Store target for smooth lerp interpolation in render loop
        group.userData.targetPos.set(pos.x, pos.y, pos.z);
        if (rot) group.userData.targetRotY = rot.y || 0;
        group.userData.anim = anim || 'idle';
    }
}

// Per-frame smooth lerp interpolation for remote players
function animateRemotePlayers(dt) {
    for (const pid of Object.keys(remotePlayerMeshes)) {
        const group = remotePlayerMeshes[pid];
        if (!group || !group.userData) continue;
        
        // Linear position lerp interpolation
        group.position.lerp(group.userData.targetPos, Math.min(1.0, 16 * dt));
        
        // Rotation lerp
        let diff = group.userData.targetRotY - group.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        group.rotation.y += diff * Math.min(1.0, 16 * dt);
    }
}

function addChatMessage(sender, msg) {
    const messagesBox = $('chat-messages');
    if (!messagesBox) return;
    const line = document.createElement('div');
    line.className = 'chat-msg';
    line.innerHTML = `<span class="chat-sender">${sender}:</span> ${msg}`;
    messagesBox.appendChild(line);
    messagesBox.scrollTop = messagesBox.scrollHeight;
}

const btnJoinSubmit = document.getElementById('btn-join-submit');
if (btnJoinSubmit) {
    btnJoinSubmit.onclick = async () => {
        const codeInput = $('join-code');
        const code = codeInput ? codeInput.value.toUpperCase().trim() : '';
        if (!code) return;
        try {
            await initNetworkClient();
            const res = await netClient.join(code, 'sonic');
            if (joinMenu) joinMenu.style.display = 'none';
            const lobbyMenu = $('lobby-menu');
            if (lobbyMenu) lobbyMenu.style.display = 'flex';
            if ($('lobby-code')) $('lobby-code').textContent = res.code || code;
        } catch (e) {
            if ($('join-error')) $('join-error').textContent = e.message || 'Room not found';
        }
    };
}

const btnEggmanTrigger = document.getElementById('btn-eggman-trigger');
if (btnEggmanTrigger) {
    btnEggmanTrigger.onclick = () => {
        if (netClient && netClient.isHost) {
            netClient.triggerEggman();
        } else if (eggman) {
            eggman.start();
            showDialogue('Host Admin', '💥 HOST DUAL TRIGGER: Dr. Eggman Invasion Invoked!');
        }
    };
}

// Gear Customization & Enerbeam Color Wiring
const btnOpenGear = document.getElementById('btn-open-gear');
const gearModal = document.getElementById('gear-modal');
const btnGearSave = document.getElementById('btn-gear-save');
const btnInviteFriend = document.getElementById('btn-invite-friend');
let selectedEnerbeamColor = 0x00bbff;

if (btnOpenGear) {
    btnOpenGear.onclick = () => {
        if (gearModal) gearModal.style.display = 'flex';
    };
}
if (btnGearSave) {
    btnGearSave.onclick = () => {
        if (gearModal) gearModal.style.display = 'none';
        showDialogue('Gear Customization', 'تم حفظ تخصيص عتاد الـ Enerbeam بنجاح ⚙️');
    };
}
document.querySelectorAll('#enerbeam-color-picker .color-chip').forEach(chip => {
    chip.onclick = () => {
        document.querySelectorAll('#enerbeam-color-picker .color-chip').forEach(c => c.style.borderColor = 'transparent');
        chip.style.borderColor = '#fff';
        selectedEnerbeamColor = parseInt(chip.dataset.color);
        if (player && player._enerbeamLine) {
            player._enerbeamLine.material.color.setHex(selectedEnerbeamColor);
        }
    };
});

if (btnInviteFriend) {
    btnInviteFriend.onclick = () => {
        const code = (netClient && netClient.code) ? netClient.code : 'SNC78B';
        const inviteUrl = window.location.origin + window.location.pathname + '?room=' + code;
        navigator.clipboard.writeText(inviteUrl).catch(() => {});
        showDialogue('Invite Friend', `تم نسخ كود ورابط الدعوة للغرفة [${code}]! شاركه مع أصدقائك 👥`);
    };
}

// Mode 3: Online Matchmaking (PRO Restricted)
const btnModePro = document.getElementById('btn-mode-pro');
const proModal = document.getElementById('pro-modal');
const btnProClose = document.getElementById('btn-pro-close');
const btnProUpgrade = document.getElementById('btn-pro-upgrade');

if (btnModePro) {
    btnModePro.onclick = () => {
        const isPro = localStorage.getItem('is_pro_user') === 'true';
        if (isPro) {
            showDialogue('Online Matchmaking', 'جاري البحث عن منافسين أونلاين في سيرفرات Pro...');
            setTimeout(() => startGame(), 1500);
        } else {
            if (proModal) proModal.style.display = 'flex';
        }
    };
}
if (btnProClose) {
    btnProClose.onclick = () => {
        if (proModal) proModal.style.display = 'none';
    };
}
if (btnProUpgrade) {
    btnProUpgrade.onclick = () => {
        localStorage.setItem('is_pro_user', 'true');
        if (proModal) proModal.style.display = 'none';
        showDialogue('Pro Account', 'مبروك! تم تفعيل حساب Pro بنجاح 👑 جاري دخول الماتش أونلاين!');
        setTimeout(() => startGame(), 1500);
    };
}

document.querySelectorAll('.char-card').forEach(card => {
    card.onclick = () => {
        document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        if (charSelect) charSelect.select(card.dataset.char);
    };
});

const btnConfirm = document.getElementById('btn-confirm');
if (btnConfirm) btnConfirm.onclick = () => {
    selectMenu.classList.add('hidden');
    selectMenu.style.display = 'none';
    startGame();
};

const btnResume = document.getElementById('btn-resume');
if (btnResume) btnResume.onclick = () => {
    pauseMenu.classList.remove('active');
    gameState = STATE.PLAYING;
    try { audio.resume(); } catch (e) {}
};

const btnQuit = document.getElementById('btn-quit');
if (btnQuit) btnQuit.onclick = returnToMenu;

if ($('btn-retry')) $('btn-retry').onclick = () => {
    if (gameOverScreen) gameOverScreen.classList.remove('active');
    cleanupGame();
    selectMenu.classList.remove('hidden');
    selectMenu.style.display = 'flex';
    if (charSelect) charSelect.show();
    gameState = STATE.SELECT;
};

if ($('btn-go-quit')) $('btn-go-quit').onclick = returnToMenu;
if ($('btn-res-continue')) $('btn-res-continue').onclick = returnToMenu;

if ($('vol-master')) $('vol-master').oninput = (e) => { try { audio.setVolume('master', e.target.value / 100); } catch (err) {} };
if ($('vol-sfx')) $('vol-sfx').oninput = (e) => { try { audio.setVolume('sfx', e.target.value / 100); } catch (err) {} };
if ($('vol-music')) $('vol-music').oninput = (e) => { try { audio.setVolume('music', e.target.value / 100); } catch (err) {} };

// ============================================================
// GAME START
// ============================================================
function startGame() {
    try {
        const charInfo = charSelect.getSelected();
        world.build();
        charSelect.hide();

        try { audio.init(); audio.resume(); audio.startAmbient(); } catch (e) {}

        player = new SonicCharacter(engine.scene);
        player.setCharacter(charInfo);
        playerHealth = playerMaxHealth;
        score = 0;
        gameTime = 0;
        enemiesDefeated = 0;
        lastCheckpointIndex = 0;

        const spawnY = heightAt(0, -20) + 3;
        physics.playerBody.position.set(0, spawnY, -20);
        physics.playerBody.velocity.set(0, 0, 0);

        cam.setPosition(0, heightAt(0, -20) + 8, -10);
        cam.yaw = Math.PI;
        cam.currentLookAt.set(0, heightAt(0, -20) + 2, -20);
        cam.camera.lookAt(0, heightAt(0, -20) + 2, -20);

        spawnWorldRings();
        spawnEnemies();
        spawnBoostPads();
        spawnPlatforms();

        gameState = STATE.PLAYING;
        hudEl.classList.add('active');
        touchControls.classList.add('active');

        setTimeout(() => {
            const names = { sonic: 'Sonic', tails: 'Tails', knuckles: 'Knuckles', amy: 'Amy', sticks: 'Sticks' };
            showDialogue(names[charInfo.key] || 'Sonic', 'Welcome to Bygone Island! WASD=Move Space=Jump Shift=SpinDash Q=HomingAttack E=Enerbeam');
        }, 800);
    } catch (e) {
        console.error('[startGame] Error:', e);
        showDialogue('Error', 'Failed to start game: ' + e.message);
    }
}

// ============================================================
// MAIN LOOP
// ============================================================
let lastTime = performance.now();

function gameLoop(now) {
    requestAnimationFrame(gameLoop);
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    if (!engine) return;
    try { input.update(); } catch (e) {}

    if (gameState === STATE.PLAYING) {
        if (!player) {
            gameState = STATE.MENU;
            mainMenu.classList.remove('hidden');
            hudEl.classList.remove('active');
            return;
        }
        gameTime += dt;

        if (input.pauseJust) {
            gameState = STATE.PAUSED;
            pauseMenu.classList.add('active');
            return;
        }

        if (input.homingAttackJust && !physics.grounded) {
            const target = findHomingTarget();
            if (target) {
                try { physics.setHomingTarget(target); audio.playHomingAttack(); } catch (e) {}
            }
        }

        if (input.spinDashReleased) {
            try { audio.playSpinDashRelease(); } catch (e) {}
        }

        try { physics.updatePlayer(player, input, cam.getYaw(), dt); } catch (e) {}

        if (player._jumpSound === 'jump') {
            try { audio.playJump(); } catch (e) {}
            player._jumpSound = null;
        } else if (player._jumpSound === 'doubleJump') {
            try { audio.playDoubleJump(); } catch (e) {}
            player._jumpSound = null;
        }

        const speed = Math.sqrt(player.velocity.x ** 2 + player.velocity.z ** 2);
        cam.update(player.position, player.velocity, Math.min(1, speed / physics.SPRINT_SPEED), player.facingAngle, dt);

        updateSpeedBar(speed / physics.SPRINT_SPEED);
        checkRingCollection();
        checkCheckpoints();
        checkBoostPads();
        checkSprings();
        updateEnemies(dt);
        updateEggmanBoss(dt);
        handleEnerbeam();

        try { player.animate(dt, speed / physics.SPRINT_SPEED); } catch (e) {}

        updateHUD();
        drawMinimap();

        try { audio.updateSpeedWind(speed / physics.SPRINT_SPEED); } catch (e) {}

        try { world.update(dt, engine.camera); } catch (e) {}
        try { checkInteractiveProps(dt); } catch (e) {}
        try { animateRemotePlayers(dt); } catch (e) {}
        if (netClient) {
            try { netClient.updateVoiceProximity(player.position, cam.getYaw()); } catch (e) {}
        }

        for (const ring of worldRings) {
            if (!ring.userData.collected) {
                ring.position.y = ring.userData.baseY + Math.sin(now * 0.003 + ring.position.x) * 0.3;
                ring.rotation.z += dt * 2;
            }
        }

        const groundH = heightAt(player.position.x, player.position.z);
        if (player.position.y < groundH - 10) {
            player.lives--;
            if (player.lives <= 0) {
                triggerGameOver();
            } else {
                respawnAtCheckpoint();
                cam.shake(0.5);
                try { audio.playDamage(); } catch (e) {}
                showDialogue('System', 'Fell off! Respawning...');
            }
        }

        if (player._trailPoints && speed > 20) {
            try {
                const cols = player._trailGeometry.attributes.color.array;
                for (let i = 0; i < cols.length; i += 3) {
                    cols[i] = 0.1;
                    cols[i + 1] = 0.4 + Math.random() * 0.4;
                    cols[i + 2] = 1;
                }
            } catch (e) {}
        }

        const allEnemiesDead = enemies.length > 0 && enemies.every(e => !e.userData.alive);
        if (allEnemiesDead && player.rings >= 30 && !eggman.isActive()) {
            triggerLevelComplete();
        }

    } else if (gameState === STATE.MENU) {
        const t = performance.now() * 0.0001;
        engine.camera.position.x = Math.sin(t) * 40;
        engine.camera.position.z = Math.cos(t) * 40;
        engine.camera.position.y = 25;
        engine.camera.lookAt(0, 3, -20);
    } else if (gameState === STATE.SELECT) {
        const t = performance.now() * 0.0002;
        engine.camera.position.x = Math.sin(t) * 12;
        engine.camera.position.z = 10;
        engine.camera.position.y = 5;
        engine.camera.lookAt(0, 2, 0);
    } else if (gameState === STATE.GAME_OVER || gameState === STATE.PAUSED) {
        // Frozen scene behind overlay — just render
    }

    engine.render();
}

// ---- Init ----
mainMenu.classList.remove('hidden');
selectMenu.classList.add('hidden');
selectMenu.style.display = 'none';

document.addEventListener('click', () => {
    try { audio.init(); audio.resume(); } catch (e) {}
}, { once: true });

requestAnimationFrame(gameLoop);
