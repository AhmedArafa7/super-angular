// Bygone Island — Open World Builder
// THREE is a global
import { heightAt } from './engine/terrain.js';

export class WorldBuilder {
    constructor(scene) {
        this.scene = scene;
        this.colliders = [];
        this.checkpoints = [];
        this.grindRails = [];
        this.springs = [];
        this.enerbeamAnchors = [];
        this.interactiveProps = [];
        this.sittingSpots = [];
        this._waterMesh = null;
        this._waterTime = 0;
    }

    build() {
        this._beaches();
        this._jungles();
        this._ruins();
        this._village();
        this._tailsWorkshopAndBiplane();
        this._seasideCircuit();
        this._grindRailSystem();
        this._checkpointSystem();
        this._bounceSprings();
        this._enerbeamAnchors();
        this._interactiveProps();
        this._water();
        this._skyDome();
        this._clouds();
        this._vegetation();
        this._palmTrees();
        this._props();
    }

    // Update animated elements and LOD system (call each frame)
    update(dt, camera) {
        this._waterTime += dt;
        this._animateWater();
        this._animateCheckpoints(dt);
        this._animateGrindRails(dt);
        this._animateProps(dt);
        this._animateInteractiveProps(dt);
        if (camera) {
            this.scene.traverse(obj => {
                if (obj.isLOD) obj.update(camera);
            });
        }
    }

    _tailsWorkshopAndBiplane() {
        const wx = -22, wy = 1.2, wz = 8;
        // Rocky outcrop
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x6e6e6e, roughness: 0.9 });
        const outcrop = new THREE.Mesh(new THREE.CylinderGeometry(8, 10, 3, 8), rockMat);
        outcrop.position.set(wx, wy - 1.5, wz);
        outcrop.castShadow = true;
        outcrop.receiveShadow = true;
        this.scene.add(outcrop);

        // Helipad circle
        const helipadMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.6 });
        const helipad = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 0.1, 24), helipadMat);
        helipad.position.set(wx + 6, wy, wz + 4);
        this.scene.add(helipad);
        const ringMark = new THREE.Mesh(
            new THREE.RingGeometry(2.5, 3, 24),
            new THREE.MeshBasicMaterial({ color: 0xFFD54F, side: THREE.DoubleSide })
        );
        ringMark.rotation.x = -Math.PI / 2;
        ringMark.position.set(wx + 6, wy + 0.06, wz + 4);
        this.scene.add(ringMark);

        // Blue Biplane (X-Tornado)
        const planeGroup = new THREE.Group();
        const blueMat = new THREE.MeshStandardMaterial({ color: 0x1565C0, roughness: 0.4, metalness: 0.3 });
        const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
        const yellowMat = new THREE.MeshStandardMaterial({ color: 0xFFD54F, roughness: 0.5 });

        const fuselage = new THREE.Mesh(new THREE.ConeGeometry(0.8, 3.5, 8), blueMat);
        fuselage.rotation.x = Math.PI / 2;
        fuselage.position.z = 0.5;
        planeGroup.add(fuselage);

        const cockpit = new THREE.Mesh(
            new THREE.SphereGeometry(0.5, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0x88ccff, transparent: true, opacity: 0.7 })
        );
        cockpit.scale.set(0.8, 1, 1.2);
        cockpit.position.set(0, 0.4, 0.2);
        planeGroup.add(cockpit);

        const wingGeo = new THREE.BoxGeometry(5, 0.1, 1.2);
        const topWing = new THREE.Mesh(wingGeo, yellowMat);
        topWing.position.set(0, 0.8, 0.5);
        planeGroup.add(topWing);
        const botWing = new THREE.Mesh(wingGeo, yellowMat);
        botWing.position.set(0, -0.2, 0.5);
        planeGroup.add(botWing);

        const prop = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.2, 0.05), whiteMat);
        prop.position.set(0, 0, 2.3);
        planeGroup.add(prop);

        planeGroup.position.set(wx + 6, wy + 0.8, wz + 4);
        planeGroup.rotation.y = -0.6;
        this.scene.add(planeGroup);

        // Workshop Building
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x7c4721, roughness: 0.9 });
        const roofMat = new THREE.MeshStandardMaterial({ color: 0xb53725, roughness: 0.7 });
        const wsWalls = new THREE.Mesh(new THREE.BoxGeometry(5, 4, 4), woodMat);
        wsWalls.position.set(wx, wy + 2, wz);
        wsWalls.castShadow = true;
        this.scene.add(wsWalls);

        const wsRoof = new THREE.Mesh(new THREE.ConeGeometry(4, 2.5, 4), roofMat);
        wsRoof.position.set(wx, wy + 5.25, wz);
        wsRoof.rotation.y = Math.PI / 4;
        wsRoof.castShadow = true;
        this.scene.add(wsRoof);

        const solarMat = new THREE.MeshStandardMaterial({ color: 0x112244, roughness: 0.2, metalness: 0.8 });
        const solarPanel = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 1.5), solarMat);
        solarPanel.position.set(wx - 0.8, wy + 5.2, wz);
        solarPanel.rotation.z = -0.3;
        this.scene.add(solarPanel);

        const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2, 6), new THREE.MeshStandardMaterial({ color: 0x888888 }));
        antenna.position.set(wx + 1.5, wy + 5.5, wz);
        this.scene.add(antenna);
        const dish = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), new THREE.MeshStandardMaterial({ color: 0xcccccc }));
        dish.scale.set(1, 0.3, 1);
        dish.position.set(wx + 1.5, wy + 6.3, wz);
        this.scene.add(dish);
    }

    _seasideCircuit() {
        // ---- SEASIDE CIRCUIT Sign ----
        const signGroup = new THREE.Group();
        const postMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.9 });
        const post1 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 4, 8), postMat);
        post1.position.set(-2, 2, 0);
        signGroup.add(post1);
        const post2 = post1.clone();
        post2.position.set(2, 2, 0);
        signGroup.add(post2);

        const board = new THREE.Mesh(new THREE.BoxGeometry(5.4, 1.8, 0.4), postMat);
        board.position.set(0, 3.5, 0);
        signGroup.add(board);

        const neonBox = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.6, 0.45), new THREE.MeshStandardMaterial({ color: 0x1565C0, emissive: 0x00d2ff, emissiveIntensity: 0.8 }));
        neonBox.position.set(0, 3.5, 0.05);
        signGroup.add(neonBox);

        // Neon border glow
        const neonBorderMat = new THREE.MeshStandardMaterial({ color: 0xFFD54F, emissive: 0xFFD54F, emissiveIntensity: 1.0 });
        const borderTop = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.08, 0.5), neonBorderMat);
        borderTop.position.set(0, 4.3, 0.05);
        signGroup.add(borderTop);
        const borderBot = borderTop.clone();
        borderBot.position.y = 2.7;
        signGroup.add(borderBot);
        const borderL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.6, 0.5), neonBorderMat);
        borderL.position.set(-2.6, 3.5, 0.05);
        signGroup.add(borderL);
        const borderR = borderL.clone();
        borderR.position.x = 2.6;
        signGroup.add(borderR);

        signGroup.position.set(-28, 0.5, 22);
        signGroup.rotation.y = 0.5;
        this.scene.add(signGroup);

        // ---- Boost Pads along circuit ----
        const boostMat = new THREE.MeshStandardMaterial({ color: 0x00d2ff, emissive: 0x00d2ff, emissiveIntensity: 0.9 });
        const arrowMat = new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffff00, emissiveIntensity: 0.8 });
        const boostPositions = [
            [-24, 18, 0], [-12, 8, 0.3], [0, -2, 0], [12, -12, -0.2],
            [24, -22, 0.1], [36, -32, 0], [0, -42, 0.3], [-24, -32, -0.1],
        ];
        for (const [x, z, rot] of boostPositions) {
            const baseY = heightAt(x, z);
            const pad = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.15, 3.5), boostMat);
            pad.position.set(x, baseY + 0.1, z);
            pad.rotation.y = rot;
            pad.receiveShadow = true;
            this.scene.add(pad);

            // Glowing arrows on pad
            for (let a = 0; a < 3; a++) {
                const arrowGeo = new THREE.ConeGeometry(0.3, 0.6, 3);
                const arrow = new THREE.Mesh(arrowGeo, arrowMat);
                arrow.rotation.x = -Math.PI / 2;
                arrow.position.set(x, baseY + 0.25, z + 0.4 + a * 0.8);
                this.scene.add(arrow);
            }
        }

        // ---- Loop-the-loops (3 loops of varying sizes) ----
        const loopMat = new THREE.MeshStandardMaterial({ color: 0xb53725, roughness: 0.5, metalness: 0.3 });
        const trackMat = new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.7 });

        const loops = [
            { x: 10, z: -5, r: 5, rot: 0.5 },
            { x: 25, z: -18, r: 6, rot: -0.3 },
            { x: -15, z: -45, r: 4.5, rot: 0.2 },
        ];
        for (const l of loops) {
            const loopGeo = new THREE.TorusGeometry(l.r, 0.6, 12, 32, Math.PI * 2);
            const loop = new THREE.Mesh(loopGeo, loopMat);
            loop.position.set(l.x, l.r + 1, l.z);
            loop.rotation.y = l.rot;
            loop.castShadow = true;
            this.scene.add(loop);

            // Track surface inside loop
            const trackGeo = new THREE.TorusGeometry(l.r, 0.3, 8, 32, Math.PI * 2);
            const track = new THREE.Mesh(trackGeo, trackMat);
            track.position.copy(loop.position);
            track.rotation.y = l.rot;
            this.scene.add(track);
        }

        // ---- Ramp Jumps ----
        const rampMat = new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.6 });
        const rampPositions = [
            [18, -10, 0.4], [-8, -30, -0.2], [30, -25, 0.1],
            [-20, -50, 0.3], [5, -55, -0.1],
        ];
        for (const [x, z, rot] of rampPositions) {
            const baseY = heightAt(x, z);
            const rampGroup = new THREE.Group();
            // Ramp surface (angled box)
            const ramp = new THREE.Mesh(new THREE.BoxGeometry(3, 0.3, 4), rampMat);
            ramp.rotation.x = -0.35;
            ramp.position.y = 1;
            rampGroup.add(ramp);
            // Side rails
            const sideRailMat = new THREE.MeshStandardMaterial({ color: 0xFFD54F, emissive: 0xFFD54F, emissiveIntensity: 0.4 });
            for (const side of [-1, 1]) {
                const rail = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.5, 4), sideRailMat);
                rail.rotation.x = -0.35;
                rail.position.set(side * 1.5, 1.15, 0);
                rampGroup.add(rail);
            }
            // Arrow on ramp
            const rampArrow = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.8, 3), arrowMat);
            rampArrow.rotation.x = -Math.PI / 2 - 0.35;
            rampArrow.position.set(0, 1.3, -0.5);
            rampGroup.add(rampArrow);

            rampGroup.position.set(x, baseY, z);
            rampGroup.rotation.y = rot;
            this.scene.add(rampGroup);
        }

        // ---- Circuit Rings (floating sequential) ----
        const ringGeo = new THREE.TorusGeometry(0.8, 0.12, 12, 24);
        const ringMat = new THREE.MeshStandardMaterial({ color: 0xFFD54F, emissive: 0xFFD54F, emissiveIntensity: 0.5, metalness: 0.9, roughness: 0.1 });
        for (let i = 0; i < 20; i++) {
            const ring = new THREE.Mesh(ringGeo, ringMat);
            const angle = (i / 20) * Math.PI * 2;
            const radius = 30 + Math.sin(i * 0.7) * 10;
            ring.position.set(
                Math.cos(angle) * radius,
                1.5 + Math.sin(i * 0.6) * 1.5,
                Math.sin(angle) * radius - 10
            );
            ring.rotation.y = angle;
            this.scene.add(ring);
        }
    }

    _grindRailSystem() {
        const railMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.1 });
        const glowMat = new THREE.MeshStandardMaterial({ color: 0x00d2ff, emissive: 0x00d2ff, emissiveIntensity: 0.6, transparent: true, opacity: 0.5 });

        // Define grind rail paths (arrays of control points)
        const railPaths = [
            // Rail 1: Village to ruins
            { points: [[-5, 4, -10], [0, 5, -15], [8, 6, -18], [15, 5, -15]], radius: 0.12 },
            // Rail 2: Cliff descent
            { points: [[20, 8, 5], [25, 6, 0], [30, 4, -5], [32, 3, -12]], radius: 0.12 },
            // Rail 3: Workshop area
            { points: [[-25, 5, 15], [-20, 4, 10], [-15, 3, 5], [-10, 3, 0]], radius: 0.12 },
            // Rail 4: High altitude rail
            { points: [[-10, 10, -50], [-5, 12, -55], [0, 14, -60], [5, 12, -65], [10, 10, -70]], radius: 0.15 },
            // Rail 5: Spiral descent
            { points: [[35, 8, -20], [38, 6, -25], [36, 4, -30], [32, 3, -32]], radius: 0.12 },
        ];

        for (const railDef of railPaths) {
            const pts = railDef.points.map(p => new THREE.Vector3(p[0], p[1], p[2]));
            const curve = new THREE.CatmullRomCurve3(pts);
            const tubeGeo = new THREE.TubeGeometry(curve, 32, railDef.radius, 8, false);
            const rail = new THREE.Mesh(tubeGeo, railMat);
            rail.castShadow = true;
            this.scene.add(rail);

            // Glow tube around rail
            const glowGeo = new THREE.TubeGeometry(curve, 32, railDef.radius * 2, 8, false);
            const glow = new THREE.Mesh(glowGeo, glowMat);
            this.scene.add(glow);

            // Support posts
            for (let i = 0; i < pts.length; i++) {
                const p = pts[i];
                const baseY = heightAt(p.x, p.z);
                const postHeight = p.y - baseY;
                if (postHeight > 0.5) {
                    const post = new THREE.Mesh(
                        new THREE.CylinderGeometry(0.08, 0.12, postHeight, 6),
                        new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.7 })
                    );
                    post.position.set(p.x, baseY + postHeight / 2, p.z);
                    post.castShadow = true;
                    this.scene.add(post);
                }
            }

            // Store rail data for gameplay
            this.grindRails.push({
                curve,
                points: pts,
                length: curve.getLength(),
                radius: railDef.radius,
                glowMesh: glow
            });
        }
    }

    _checkpointSystem() {
        const checkpointPositions = [
            { x: 0, z: -20, label: 'START' },
            { x: 15, z: -15, label: 'CP 1' },
            { x: 25, z: -30, label: 'CP 2' },
            { x: 0, z: -45, label: 'CP 3' },
            { x: -20, z: -35, label: 'CP 4' },
            { x: -30, z: -15, label: 'CP 5' },
            { x: 10, z: -65, label: 'CP 6' },
        ];

        const poleMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.7, roughness: 0.3 });
        const inactiveGlowMat = new THREE.MeshStandardMaterial({ color: 0x666666, emissive: 0x333333, emissiveIntensity: 0.3 });
        const activeGlowMat = new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x00ff88, emissiveIntensity: 1.0 });

        for (const cp of checkpointPositions) {
            const baseY = heightAt(cp.x, cp.z);
            const group = new THREE.Group();

            // Left pole
            const poleL = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 4, 8), poleMat);
            poleL.position.set(-1.5, 2, 0);
            poleL.castShadow = true;
            group.add(poleL);

            // Right pole
            const poleR = poleL.clone();
            poleR.position.x = 1.5;
            group.add(poleR);

            // Top beam
            const beam = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.2, 0.2), poleMat);
            beam.position.y = 4;
            group.add(beam);

            // Star/orb at top
            const orb = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), inactiveGlowMat.clone());
            orb.position.y = 4.5;
            group.add(orb);

            // Light
            const light = new THREE.PointLight(0x333333, 0.3, 8);
            light.position.y = 4.5;
            group.add(light);

            group.position.set(cp.x, baseY, cp.z);
            this.scene.add(group);

            this.checkpoints.push({
                group,
                orb,
                light,
                x: cp.x,
                z: cp.z,
                y: baseY,
                label: cp.label,
                activated: false,
                activeMat: activeGlowMat,
                inactiveMat: inactiveGlowMat
            });
        }
    }

    activateCheckpoint(index) {
        if (index < 0 || index >= this.checkpoints.length) return;
        const cp = this.checkpoints[index];
        if (cp.activated) return;
        cp.activated = true;
        cp.orb.material = cp.activeMat.clone();
        cp.light.color.setHex(0x00ff88);
        cp.light.intensity = 1.5;
    }

    getCheckpoints() {
        return this.checkpoints;
    }

    getGrindRails() {
        return this.grindRails;
    }

    getSprings() {
        return this.springs;
    }

    getEnerbeamAnchors() {
        return this.enerbeamAnchors;
    }

    getInteractiveProps() {
        return this.interactiveProps;
    }

    getSittingSpots() {
        return this.sittingSpots;
    }

    _interactiveProps() {
        const chairMat = new THREE.MeshStandardMaterial({ color: 0x1565C0, roughness: 0.5 });
        const ballMat = new THREE.MeshStandardMaterial({ color: 0xff0055, roughness: 0.3, metalness: 0.1 });
        const coconutMat = new THREE.MeshStandardMaterial({ color: 0x4a2c11, roughness: 0.95 });

        // Sitting Spots (Beach Chairs & Village Benches)
        const chairSpots = [
            { x: -15, y: 0.6, z: 72, rot: 0.2 },
            { x: -10, y: 0.6, z: 74, rot: -0.3 },
            { x: 12, y: 0.6, z: 70, rot: 0.5 },
            { x: 18, y: 0.6, z: 72, rot: -0.1 }
        ];

        for (const spot of chairSpots) {
            const chairGroup = new THREE.Group();
            const seat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.2, 1.8), chairMat);
            seat.position.y = 0.5;
            chairGroup.add(seat);
            const back = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 0.2), chairMat);
            back.position.set(0, 1.1, -0.8);
            back.rotation.x = -0.3;
            chairGroup.add(back);

            chairGroup.position.set(spot.x, spot.y, spot.z);
            chairGroup.rotation.y = spot.rot;
            this.scene.add(chairGroup);

            this.sittingSpots.push({ x: spot.x, y: spot.y + 0.6, z: spot.z, radius: 2.0, type: 'chair' });
        }

        // Usable Pick-up & Throw Objects (Coconuts & Beach Balls)
        const objectSpots = [
            { x: -12, z: 71, type: 'ball', size: 0.65 },
            { x: 15, z: 69, type: 'ball', size: 0.7 },
            { x: 5, z: 73, type: 'coconut', size: 0.35 },
            { x: -5, z: 74, type: 'coconut', size: 0.35 },
            { x: 25, z: 65, type: 'coconut', size: 0.35 },
            { x: -25, z: 66, type: 'coconut', size: 0.35 }
        ];

        for (const o of objectSpots) {
            const baseY = heightAt(o.x, o.z);
            const geo = o.type === 'ball' ? new THREE.SphereGeometry(o.size, 16, 12) : new THREE.DodecahedronGeometry(o.size, 1);
            const mat = o.type === 'ball' ? ballMat : coconutMat;
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(o.x, baseY + o.size, o.z);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.scene.add(mesh);

            this.interactiveProps.push({
                mesh,
                x: o.x,
                z: o.z,
                baseY: baseY + o.size,
                type: o.type,
                radius: 2.5,
                held: false,
                velocity: new THREE.Vector3()
            });
        }
    }

    _animateInteractiveProps(dt) {
        for (const prop of this.interactiveProps) {
            if (!prop.held && prop.velocity.lengthSq() > 0.01) {
                prop.mesh.position.addScaledVector(prop.velocity, dt);
                prop.velocity.y -= 18 * dt; // gravity
                const groundH = heightAt(prop.mesh.position.x, prop.mesh.position.z) + (prop.type === 'ball' ? 0.65 : 0.35);
                if (prop.mesh.position.y <= groundH) {
                    prop.mesh.position.y = groundH;
                    prop.velocity.y *= -0.55; // bounce
                    prop.velocity.x *= 0.8;
                    prop.velocity.z *= 0.8;
                }
            }
        }
    }

    _bounceSprings() {
        const springDefs = [
            { x: 8, z: -18, type: 'red', force: 28 },
            { x: -12, z: -35, type: 'yellow', force: 18 },
            { x: 22, z: -25, type: 'red', force: 28 },
            { x: -28, z: -20, type: 'yellow', force: 18 },
            { x: 5, z: -50, type: 'red', force: 30 },
            { x: -18, z: -60, type: 'yellow', force: 20 },
            { x: 32, z: -15, type: 'red', force: 28 }
        ];

        const coilMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9, roughness: 0.2 });
        const redMat = new THREE.MeshStandardMaterial({ color: 0xd32f2f, emissive: 0xd32f2f, emissiveIntensity: 0.4, roughness: 0.3 });
        const yellowMat = new THREE.MeshStandardMaterial({ color: 0xffd54f, emissive: 0xffd54f, emissiveIntensity: 0.5, roughness: 0.3 });

        for (const s of springDefs) {
            const baseY = heightAt(s.x, s.z);
            const group = new THREE.Group();

            const base = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 0.25, 12), coilMat);
            base.position.y = 0.125;
            group.add(base);

            const coil = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.08, 8, 16), coilMat);
            coil.rotation.x = Math.PI / 2;
            coil.position.y = 0.4;
            group.add(coil);

            const plateMat = s.type === 'red' ? redMat : yellowMat;
            const topPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.2, 12), plateMat);
            topPlate.position.y = 0.75;
            topPlate.castShadow = true;
            group.add(topPlate);

            group.position.set(s.x, baseY, s.z);
            this.scene.add(group);

            this.springs.push({
                group,
                topPlate,
                x: s.x,
                z: s.z,
                y: baseY + 0.75,
                type: s.type,
                force: s.force,
                radius: 1.5,
                animTimer: 0
            });
        }
    }

    _enerbeamAnchors() {
        const anchorDefs = [
            { x: 0, y: 7, z: -30 },
            { x: 18, y: 9, z: -35 },
            { x: -18, y: 8, z: -45 },
            { x: 8, y: 12, z: -70 }
        ];

        const glowMat = new THREE.MeshStandardMaterial({ color: 0x00d2ff, emissive: 0x00d2ff, emissiveIntensity: 0.9, transparent: true, opacity: 0.85 });
        const ringMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.8 });

        for (const a of anchorDefs) {
            const group = new THREE.Group();

            const orb = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 12), glowMat);
            group.add(orb);

            const ring = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.08, 8, 20), ringMat);
            group.add(ring);

            const light = new THREE.PointLight(0x00d2ff, 1.2, 12);
            group.add(light);

            group.position.set(a.x, a.y, a.z);
            this.scene.add(group);

            this.enerbeamAnchors.push({
                group,
                orb,
                ring,
                x: a.x,
                y: a.y,
                z: a.z,
                radius: 14
            });
        }
    }

    _animateCheckpoints(dt) {
        const t = performance.now() * 0.001;
        for (const cp of this.checkpoints) {
            if (cp.activated) {
                cp.orb.position.y = 4.5 + Math.sin(t * 3 + cp.x) * 0.15;
                cp.orb.rotation.y += dt * 2;
                const pulse = 0.8 + Math.sin(t * 4) * 0.2;
                cp.orb.scale.setScalar(pulse);
            }
        }
    }

    _animateGrindRails(dt) {
        const t = performance.now() * 0.001;
        for (const rail of this.grindRails) {
            if (rail.glowMesh && rail.glowMesh.material) {
                rail.glowMesh.material.opacity = 0.3 + Math.sin(t * 2) * 0.2;
            }
        }
    }

    _clouds() {
        const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.9 });
        for (let i = 0; i < 15; i++) {
            const cloudGroup = new THREE.Group();
            const puffs = 3 + Math.floor(Math.random() * 4);
            for (let p = 0; p < puffs; p++) {
                const puff = new THREE.Mesh(new THREE.SphereGeometry(3 + Math.random() * 3, 10, 8), cloudMat);
                puff.position.set(p * 3 - puffs * 1.5, Math.random() * 1.5, (Math.random() - 0.5) * 3);
                puff.scale.y = 0.5 + Math.random() * 0.3;
                cloudGroup.add(puff);
            }
            cloudGroup.position.set(
                (Math.random() - 0.5) * 250,
                55 + Math.random() * 30,
                (Math.random() - 0.5) * 250
            );
            this.scene.add(cloudGroup);
        }
    }

    _beaches() {
        const sandMat = new THREE.MeshStandardMaterial({ color: 0xfce4b5, roughness: 0.95, metalness: 0 });
        const beach = new THREE.Mesh(new THREE.PlaneGeometry(140, 35), sandMat);
        beach.rotation.x = -Math.PI / 2;
        beach.position.set(0, 0.05, 80);
        beach.receiveShadow = true;
        this.scene.add(beach);

        // sand dunes
        for (let i = 0; i < 8; i++) {
            const dune = new THREE.Mesh(
                new THREE.SphereGeometry(2 + Math.random() * 3, 12, 8),
                sandMat
            );
            dune.scale.y = 0.3;
            dune.position.set(-40 + i * 12, 0.3, 75 + Math.random() * 10);
            dune.receiveShadow = true;
            dune.castShadow = true;
            this.scene.add(dune);
        }

        // beach rocks
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.9 });
        for (let i = 0; i < 12; i++) {
            const rock = new THREE.Mesh(
                new THREE.DodecahedronGeometry(0.5 + Math.random() * 1.5, 1),
                rockMat
            );
            rock.position.set(-50 + Math.random() * 100, 0.3 + Math.random() * 0.5, 70 + Math.random() * 15);
            rock.rotation.set(Math.random(), Math.random(), Math.random());
            rock.castShadow = true;
            this.scene.add(rock);
        }
    }

    _jungles() {
        const treeMat = new THREE.MeshStandardMaterial({ color: 0x1a8c1a, roughness: 0.8 });
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a4520, roughness: 0.85 });

        for (let i = 0; i < 60; i++) {
            const x = (Math.random() - 0.5) * 160;
            const z = (Math.random() - 0.5) * 120;
            if (Math.abs(z) < 25) continue; // leave village area clear
            const base = heightAt(x, z); // sit on the terrain

            // trunk
            const trunk = new THREE.Mesh(
                new THREE.CylinderGeometry(0.2, 0.4, 2 + Math.random() * 3, 6),
                trunkMat
            );
            trunk.position.set(x, base + 1.5, z);
            trunk.castShadow = true;
            this.scene.add(trunk);

            // canopy layers
            const layers = 2 + Math.floor(Math.random() * 3);
            for (let l = 0; l < layers; l++) {
                const size = 2.5 - l * 0.4;
                const canopy = new THREE.Mesh(
                    new THREE.SphereGeometry(size, 8, 6),
                    treeMat
                );
                canopy.position.set(x, base + 3 + l * 1.5, z);
                canopy.castShadow = true;
                this.scene.add(canopy);
            }

            // vines (thin cylinders)
            if (Math.random() > 0.6) {
                const vine = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.03, 0.03, 3 + Math.random() * 2, 4),
                    new THREE.MeshStandardMaterial({ color: 0x2d5a1e })
                );
                vine.position.set(x + 1, base + 2, z);
                this.scene.add(vine);
            }
        }
    }

    _palmTrees() {
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.9 });
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x228B22, roughness: 0.7, side: THREE.DoubleSide });

        // Palm trees along cliffs, beach edges, and scattered inland
        const palmPositions = [
            [30, 65], [40, 70], [50, 72], [-30, 68], [-40, 74], [-50, 70],
            [20, 60], [-20, 62], [10, 75], [-10, 73], [0, 78],
            [35, -5], [-35, -8], [45, 10], [-45, 5],
            [25, 30], [-25, 35], [15, 45], [-15, 50],
            [60, 55], [-60, 60], [55, 40], [-55, 45],
            [30, 80], [-30, 82], [0, 85],
            [-70, 20], [70, 15], [-65, -10], [65, -15],
            [20, -45], [-20, -50], [40, -55], [-40, -60],
        ];

        for (const [x, z] of palmPositions) {
            const baseY = heightAt(x, z);
            const height = 5 + Math.random() * 4;

            // Curved trunk (slightly bent)
            const trunkGroup = new THREE.Group();
            const segments = 5;
            let prevX = 0, prevY = 0;
            const bendX = (Math.random() - 0.5) * 2;
            for (let s = 0; s < segments; s++) {
                const t = s / segments;
                const segH = height / segments;
                const seg = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.15 - t * 0.05, 0.2 - t * 0.03, segH, 6),
                    trunkMat
                );
                const sx = bendX * t * t;
                seg.position.set(sx, baseY + t * height + segH / 2, 0);
                seg.rotation.z = Math.atan2(bendX * 2 * t, height / segments) * 0.3;
                seg.castShadow = true;
                trunkGroup.add(seg);
            }

            // Palm fronds (leaves)
            const frondCount = 6 + Math.floor(Math.random() * 3);
            const topY = baseY + height;
            const topX = bendX;
            for (let f = 0; f < frondCount; f++) {
                const angle = (f / frondCount) * Math.PI * 2 + Math.random() * 0.3;
                const frondLen = 2.5 + Math.random() * 1.5;
                const frond = new THREE.Mesh(
                    new THREE.BoxGeometry(0.5, 0.05, frondLen),
                    leafMat
                );
                frond.position.set(
                    topX + Math.cos(angle) * frondLen * 0.4,
                    topY + 0.3 - Math.random() * 0.5,
                    Math.sin(angle) * frondLen * 0.4
                );
                frond.rotation.set(
                    0.4 + Math.random() * 0.3,
                    angle,
                    0
                );
                frond.castShadow = true;
                trunkGroup.add(frond);
            }

            // Coconuts
            if (Math.random() > 0.5) {
                const coconutMat = new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.8 });
                for (let c = 0; c < 2 + Math.floor(Math.random() * 2); c++) {
                    const coconut = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 6), coconutMat);
                    coconut.position.set(
                        topX + (Math.random() - 0.5) * 0.5,
                        topY - 0.2,
                        (Math.random() - 0.5) * 0.5
                    );
                    trunkGroup.add(coconut);
                }
            }

            trunkGroup.position.set(x, 0, z);
            this.scene.add(trunkGroup);
        }
    }

    _ruins() {
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x9e9e9e, roughness: 0.85, metalness: 0.1 });

        // ancient pillars
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const r = 15;
            const pillar = new THREE.Mesh(
                new THREE.CylinderGeometry(0.6, 0.8, 6 + Math.random() * 3, 8),
                stoneMat
            );
            pillar.position.set(Math.cos(angle) * r, 3, Math.sin(angle) * r);
            pillar.castShadow = true;
            this.scene.add(pillar);

            // damaged top
            if (Math.random() > 0.5) {
                const cap = new THREE.Mesh(
                    new THREE.BoxGeometry(1.5, 0.5, 1.5),
                    stoneMat
                );
                cap.position.set(pillar.position.x, pillar.position.y + 3.5, pillar.position.z);
                cap.rotation.set(Math.random() * 0.3, Math.random(), 0);
                this.scene.add(cap);
            }
        }

        // stone archway
        const archBase = new THREE.Mesh(new THREE.BoxGeometry(2, 4, 2), stoneMat);
        archBase.position.set(20, 2, -10);
        archBase.castShadow = true;
        this.scene.add(archBase);
        const archBase2 = archBase.clone();
        archBase2.position.x = 26;
        this.scene.add(archBase2);
        const archTop = new THREE.Mesh(new THREE.BoxGeometry(8, 1.5, 2.5), stoneMat);
        archTop.position.set(23, 4.5, -10);
        archTop.castShadow = true;
        this.scene.add(archTop);

        // broken wall segments
        for (let i = 0; i < 5; i++) {
            const wall = new THREE.Mesh(
                new THREE.BoxGeometry(4 + Math.random() * 3, 1.5 + Math.random() * 2, 0.8),
                stoneMat
            );
            wall.position.set(-25 + i * 10, wall.geometry.parameters.height / 2, -20 + Math.random() * 5);
            wall.rotation.y = Math.random() * 0.5;
            wall.castShadow = true;
            this.scene.add(wall);
        }

        // carved stones with markings
        const markingMat = new THREE.MeshStandardMaterial({ color: 0x7a6a5a, roughness: 0.8 });
        for (let i = 0; i < 6; i++) {
            const stone = new THREE.Mesh(
                new THREE.BoxGeometry(1.5, 1, 0.3),
                markingMat
            );
            stone.position.set(-30 + i * 12, 0.5, -15);
            stone.rotation.y = Math.random() * Math.PI;
            this.scene.add(stone);
        }
    }

    _village() {
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.9 });
        const roofMat = new THREE.MeshStandardMaterial({ color: 0xCC4422, roughness: 0.7 });
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.85 });

        // village houses
        const housePositions = [
            [-12, 0, -15], [0, 0, -20], [12, 0, -15],
            [-8, 0, -28], [8, 0, -28], [0, 0, -35]
        ];

        for (const pos of housePositions) {
            this._buildHouse(pos[0], pos[1], pos[2], woodMat, roofMat);
        }

        // central village square
        const square = new THREE.Mesh(
            new THREE.CircleGeometry(8, 24),
            stoneMat
        );
        square.rotation.x = -Math.PI / 2;
        square.position.set(0, 0.02, -22);
        this.scene.add(square);

        // central fountain
        const fountainBase = new THREE.Mesh(
            new THREE.CylinderGeometry(2, 2.5, 1, 12),
            stoneMat
        );
        fountainBase.position.set(0, 0.5, -22);
        this.scene.add(fountainBase);
        const fountainTop = new THREE.Mesh(
            new THREE.CylinderGeometry(0.8, 0.8, 2, 8),
            stoneMat
        );
        fountainTop.position.set(0, 2, -22);
        this.scene.add(fountainTop);

        // street lamps
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const lamp = new THREE.Mesh(
                new THREE.CylinderGeometry(0.08, 0.08, 3, 6),
                new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.7 })
            );
            lamp.position.set(Math.cos(angle) * 6, 1.5, -22 + Math.sin(angle) * 6);
            this.scene.add(lamp);

            const bulb = new THREE.Mesh(
                new THREE.SphereGeometry(0.2, 8, 8),
                new THREE.MeshStandardMaterial({ color: 0xffee88, emissive: 0xffee88, emissiveIntensity: 0.8 })
            );
            bulb.position.set(lamp.position.x, 3.2, lamp.position.z);
            this.scene.add(bulb);

            const light = new THREE.PointLight(0xffee88, 0.5, 10);
            light.position.copy(bulb.position);
            this.scene.add(light);
        }
    }

    _buildHouse(x, y, z, woodMat, roofMat) {
        const w = 3 + Math.random() * 2;
        const h = 2.5 + Math.random();
        const d = 3 + Math.random() * 2;

        // walls
        const walls = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), woodMat);
        walls.position.set(x, y + h / 2, z);
        walls.castShadow = true;
        walls.receiveShadow = true;
        this.scene.add(walls);

        // roof
        const roof = new THREE.Mesh(
            new THREE.ConeGeometry(Math.max(w, d) * 0.8, 2, 4),
            roofMat
        );
        roof.position.set(x, y + h + 1, z);
        roof.rotation.y = Math.PI / 4;
        roof.castShadow = true;
        this.scene.add(roof);

        // door
        const door = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 1.5, 0.1),
            new THREE.MeshStandardMaterial({ color: 0x5a3a1a })
        );
        door.position.set(x, y + 0.75, z + d / 2 + 0.05);
        this.scene.add(door);

        // window
        if (Math.random() > 0.3) {
            const win = new THREE.Mesh(
                new THREE.BoxGeometry(0.6, 0.6, 0.1),
                new THREE.MeshStandardMaterial({ color: 0x88ccff, emissive: 0x88ccff, emissiveIntensity: 0.2, transparent: true, opacity: 0.7 })
            );
            win.position.set(x + w / 2 + 0.05, y + h * 0.6, z);
            this.scene.add(win);
        }
    }

    _water() {
        const waterGeo = new THREE.PlaneGeometry(400, 400, 120, 120);
        const waterMat = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uColor: { value: new THREE.Color(0x00c8e0) },
                uDeepColor: { value: new THREE.Color(0x004466) },
                uFoamColor: { value: new THREE.Color(0xd0f8ff) },
                uOpacity: { value: 0.78 },
            },
            vertexShader: `
                uniform float uTime;
                varying vec2 vUv;
                varying float vWave;
                varying vec3 vWorldPos;
                void main() {
                    vUv = uv;
                    vec3 pos = position;
                    float wave1 = sin(pos.x * 0.06 + uTime * 1.0) * cos(pos.y * 0.05 + uTime * 0.7) * 1.0;
                    float wave2 = sin(pos.x * 0.12 + uTime * 1.8) * 0.4;
                    float wave3 = cos(pos.y * 0.1 + uTime * 1.2) * 0.5;
                    float wave4 = sin((pos.x + pos.y) * 0.08 + uTime * 0.5) * 0.25;
                    pos.z = wave1 + wave2 + wave3 + wave4;
                    vWave = pos.z;
                    vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            `,
            fragmentShader: `
                uniform float uTime;
                uniform vec3 uColor;
                uniform vec3 uDeepColor;
                uniform vec3 uFoamColor;
                uniform float uOpacity;
                varying vec2 vUv;
                varying float vWave;
                varying vec3 vWorldPos;
                // Simple caustic pattern
                float caustic(vec2 uv, float t) {
                    float c = 0.0;
                    vec2 p = uv * 6.0;
                    c += sin(p.x * 3.0 + t * 1.5) * sin(p.y * 2.5 + t * 1.2) * 0.5;
                    c += sin(p.x * 2.0 - t * 0.8 + p.y * 1.5) * 0.3;
                    c += cos(p.x * 1.5 + p.y * 2.0 + t * 0.6) * 0.2;
                    return c * 0.5 + 0.5;
                }
                void main() {
                    float depth = smoothstep(-1.0, 1.5, vWave);
                    vec3 color = mix(uDeepColor, uColor, depth);
                    // Caustic light patterns
                    float caust = caustic(vWorldPos.xz * 0.02, uTime);
                    caust = pow(caust, 2.0) * 0.35;
                    color += vec3(caust * 0.5, caust * 0.8, caust);
                    // Foam at wave crests
                    float foam = smoothstep(0.6, 1.2, vWave);
                    float foamDetail = sin(vWorldPos.x * 3.0 + uTime) * cos(vWorldPos.z * 2.5 + uTime * 0.7) * 0.5 + 0.5;
                    foam *= foamDetail;
                    color = mix(color, uFoamColor, foam * 0.5);
                    // Specular highlight (sun reflection)
                    float spec = pow(max(0.0, vWave), 6.0) * 0.3;
                    color += vec3(spec);
                    // Fresnel-like edge brightness
                    float edge = smoothstep(0.0, 0.5, vWave);
                    color = mix(color * 0.85, color, edge);
                    gl_FragColor = vec4(color, uOpacity);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide,
        });
        const water = new THREE.Mesh(waterGeo, waterMat);
        water.rotation.x = -Math.PI / 2;
        water.position.y = -0.2;
        this.scene.add(water);
        this._waterMesh = water;
    }

    _animateWater() {
        if (this._waterMesh && this._waterMesh.material.uniforms) {
            this._waterMesh.material.uniforms.uTime.value = this._waterTime;
        }
    }

    _skyDome() {
        const skyGeo = new THREE.SphereGeometry(300, 32, 16);
        const skyMat = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(0x0077cc) },
                midColor: { value: new THREE.Color(0x44aaee) },
                bottomColor: { value: new THREE.Color(0x99ddff) },
                horizonColor: { value: new THREE.Color(0xddeeff) },
                offset: { value: 20 },
                exponent: { value: 0.6 }
            },
            vertexShader: `
                varying vec3 vWorldPos;
                void main() {
                    vec4 worldPos = modelMatrix * vec4(position, 1.0);
                    vWorldPos = worldPos.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 midColor;
                uniform vec3 bottomColor;
                uniform vec3 horizonColor;
                uniform float offset;
                uniform float exponent;
                varying vec3 vWorldPos;
                void main() {
                    float h = normalize(vWorldPos + offset).y;
                    vec3 color;
                    if (h > 0.4) {
                        color = mix(midColor, topColor, (h - 0.4) / 0.6);
                    } else if (h > 0.0) {
                        color = mix(bottomColor, midColor, h / 0.4);
                    } else {
                        color = mix(horizonColor, bottomColor, clamp((-h) * 2.0, 0.0, 1.0));
                    }
                    gl_FragColor = vec4(color, 1.0);
                }
            `,
            side: THREE.BackSide
        });
        this.scene.add(new THREE.Mesh(skyGeo, skyMat));
    }

    _vegetation() {
        // bushes — varied tropical greens, multiple sizes
        const bushColors = [0x228b22, 0x2d8e2d, 0x1e7a1e, 0x339933, 0x287828];
        for (let i = 0; i < 60; i++) {
            const bCol = bushColors[i % bushColors.length];
            const bushMat = new THREE.MeshStandardMaterial({ color: bCol, roughness: 0.85 });
            const size = 0.5 + Math.random() * 1.2;
            const bush = new THREE.Mesh(
                new THREE.SphereGeometry(size, 8, 6),
                bushMat
            );
            bush.scale.y = 0.5 + Math.random() * 0.4;
            bush.scale.x = 0.8 + Math.random() * 0.4;
            bush.position.set(
                (Math.random() - 0.5) * 180,
                bush.scale.y * size * 0.4,
                (Math.random() - 0.5) * 140
            );
            bush.castShadow = true;
            bush.receiveShadow = true;
            this.scene.add(bush);
        }

        // Flowers — vibrant tropical colors, scattered naturally
        const flowerColors = [0xff1493, 0xffd700, 0x00ff7f, 0x00bfff, 0xff4500, 0xff69b4, 0xff6347, 0x7cfc00];
        for (let i = 0; i < 80; i++) {
            const flower = new THREE.Mesh(
                new THREE.SphereGeometry(0.12 + Math.random() * 0.1, 6, 5),
                new THREE.MeshStandardMaterial({ color: flowerColors[i % flowerColors.length], emissive: flowerColors[i % flowerColors.length], emissiveIntensity: 0.25 })
            );
            flower.position.set(
                (Math.random() - 0.5) * 160,
                0.12,
                (Math.random() - 0.5) * 120
            );
            this.scene.add(flower);
        }

        // Rocks — varied sizes and colors, scattered naturally
        const rockColors = [0x7a7a70, 0x8a8878, 0x6e6e64, 0x9a9488];
        for (let i = 0; i < 30; i++) {
            const rMat = new THREE.MeshStandardMaterial({ color: rockColors[i % rockColors.length], roughness: 0.9 });
            const rSize = 0.3 + Math.random() * 1.5;
            const rock = new THREE.Mesh(
                new THREE.DodecahedronGeometry(rSize, 1),
                rMat
            );
            const rx = (Math.random() - 0.5) * 180;
            const rz = (Math.random() - 0.5) * 140;
            rock.position.set(rx, heightAt(rx, rz) + rSize * 0.3, rz);
            rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            rock.scale.y = 0.5 + Math.random() * 0.5;
            rock.castShadow = true;
            rock.receiveShadow = true;
            this.scene.add(rock);
        }

        // Tall grass patches — low flat clusters near beaches
        const grassMat = new THREE.MeshStandardMaterial({ color: 0x5aaa3a, roughness: 0.9, side: THREE.DoubleSide });
        for (let i = 0; i < 40; i++) {
            const gx = (Math.random() - 0.5) * 160;
            const gz = (Math.random() - 0.5) * 120;
            const baseY = heightAt(gx, gz);
            if (baseY < 2) {
                const blade = new THREE.Mesh(
                    new THREE.PlaneGeometry(0.3, 0.6 + Math.random() * 0.4),
                    grassMat
                );
                blade.position.set(gx, baseY + 0.3, gz);
                blade.rotation.y = Math.random() * Math.PI;
                blade.rotation.x = (Math.random() - 0.5) * 0.2;
                this.scene.add(blade);
            }
        }

        // Seashells near water
        const shellMat = new THREE.MeshStandardMaterial({ color: 0xffeedd, roughness: 0.6, metalness: 0.1 });
        for (let i = 0; i < 25; i++) {
            const sx = (Math.random() - 0.5) * 120;
            const sz = 60 + Math.random() * 30;
            const shell = new THREE.Mesh(
                new THREE.SphereGeometry(0.08 + Math.random() * 0.12, 6, 4),
                shellMat
            );
            shell.position.set(sx, heightAt(sx, sz) + 0.05, sz);
            shell.scale.y = 0.3;
            shell.rotation.set(Math.random(), Math.random(), Math.random());
            this.scene.add(shell);
        }
    }

    _props() {
        const bronzeMat = new THREE.MeshStandardMaterial({ color: 0xcd7f32, roughness: 0.25, metalness: 0.85 });
        const roseGoldMat = new THREE.MeshStandardMaterial({ color: 0xe8a090, roughness: 0.3, metalness: 0.8 });
        const crystalMat = new THREE.MeshStandardMaterial({ color: 0xff9ecd, emissive: 0xff69b4, emissiveIntensity: 0.8, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.85 });
        const copperMat = new THREE.MeshStandardMaterial({ color: 0xb87333, roughness: 0.3, metalness: 0.9 });
        const ringGoldMat = new THREE.MeshStandardMaterial({ color: 0xFFD700, emissive: 0xFFD700, emissiveIntensity: 0.6, roughness: 0.15, metalness: 0.95 });
        const ringStandMat = new THREE.MeshStandardMaterial({ color: 0xcd7f32, roughness: 0.3, metalness: 0.85 });

        const CORE_X = 28, CORE_Z = 18;

        // ---- CENTRAL POWER CORE STATION ----
        const coreBaseY = heightAt(CORE_X, CORE_Z);
        const corePlatform = new THREE.Mesh(
            new THREE.CylinderGeometry(5, 6, 1.2, 6),
            roseGoldMat
        );
        corePlatform.position.set(CORE_X, coreBaseY + 0.6, CORE_Z);
        corePlatform.castShadow = true;
        corePlatform.receiveShadow = true;
        this.scene.add(corePlatform);

        const corePyramid = new THREE.Mesh(
            new THREE.ConeGeometry(4, 4, 6),
            bronzeMat
        );
        corePyramid.position.set(CORE_X, coreBaseY + 3.2, CORE_Z);
        corePyramid.castShadow = true;
        this.scene.add(corePyramid);

        for (let i = 0; i < 3; i++) {
            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(3.5 - i * 1, 0.06, 8, 32),
                new THREE.MeshStandardMaterial({ color: 0xFFD700, emissive: 0xFFD700, emissiveIntensity: 0.3, roughness: 0.2, metalness: 0.9 })
            );
            ring.position.set(CORE_X, coreBaseY + 1.5 + i * 1.2, CORE_Z);
            ring.rotation.x = Math.PI / 2;
            this.scene.add(ring);
        }

        const crystal = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.9, 0),
            crystalMat
        );
        crystal.position.set(CORE_X, coreBaseY + 5.8, CORE_Z);
        crystal.castShadow = true;
        this.scene.add(crystal);
        this._crystal = crystal;

        const crystalLight = new THREE.PointLight(0xff69b4, 2, 20);
        crystalLight.position.set(CORE_X, coreBaseY + 6.2, CORE_Z);
        this.scene.add(crystalLight);
        this._crystalLight = crystalLight;

        // ---- DRONES ----
        this._drones = [];
        this._corePos = { x: CORE_X, z: CORE_Z };
        for (let i = 0; i < 3; i++) {
            const droneGroup = new THREE.Group();
            const droneBody = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), copperMat);
            droneGroup.add(droneBody);
            const droneEye = new THREE.Mesh(
                new THREE.SphereGeometry(0.12, 8, 6),
                new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 1 })
            );
            droneEye.position.z = 0.35;
            droneGroup.add(droneEye);
            const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 4), copperMat);
            ant.position.y = 0.4;
            droneGroup.add(ant);
            droneGroup.add(new THREE.PointLight(0x00ddff, 0.4, 6));
            droneGroup.position.set(CORE_X, coreBaseY + 4, CORE_Z);
            droneGroup.userData.angle = (i / 3) * Math.PI * 2;
            droneGroup.userData.radius = 7;
            droneGroup.userData.height = coreBaseY + 3 + i * 1.5;
            droneGroup.userData.speed = 0.8 + i * 0.2;
            this.scene.add(droneGroup);
            this._drones.push(droneGroup);
        }

        // ---- STANDING GOLDEN RINGS (monuments) ----
        const bigRingPositions = [[-18, -8], [-22, -8]];
        for (const [rx, rz] of bigRingPositions) {
            const baseY = heightAt(rx, rz);
            const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 2, 8), ringStandMat);
            stand.position.set(rx, baseY + 1, rz);
            this.scene.add(stand);
            const bigRing = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.2, 12, 32), ringGoldMat);
            bigRing.position.set(rx, baseY + 3.5, rz);
            bigRing.castShadow = true;
            this.scene.add(bigRing);
            const ringLight = new THREE.PointLight(0xFFD700, 0.8, 12);
            ringLight.position.set(rx, baseY + 3.5, rz);
            this.scene.add(ringLight);
        }

        // ---- COPPER PIPES ----
        for (let i = 0; i < 4; i++) {
            const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 12 + Math.random() * 8, 12), copperMat);
            pipe.position.set(-25 + i * 17 + (Math.random() - 0.5) * 5, 5, 15 + (Math.random() - 0.5) * 10);
            pipe.rotation.z = (Math.random() - 0.5) * 0.3;
            pipe.castShadow = true;
            this.scene.add(pipe);
            const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.4, 12), copperMat);
            cap.position.set(pipe.position.x, pipe.position.y + 6.5, pipe.position.z);
            this.scene.add(cap);
        }

        // ---- STONE COLUMNS ----
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0xd4c8b0, roughness: 0.7, metalness: 0.05 });
        for (const [cx, cz] of [[-15, 12], [15, 12], [-15, -35], [15, -35], [-25, -5], [25, -5]]) {
            const baseY = heightAt(cx, cz);
            const col = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 8, 10), stoneMat);
            col.position.set(cx, baseY + 4, cz);
            col.castShadow = true;
            this.scene.add(col);
            const capital = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 1.5), stoneMat);
            capital.position.set(cx, baseY + 8.3, cz);
            this.scene.add(capital);
        }

        // ---- BEACH HUT ----
        const thatchMat = new THREE.MeshStandardMaterial({ color: 0xc4a64a, roughness: 0.95 });
        const hutX = -18, hutZ = 60, hutBaseY = heightAt(hutX, hutZ);
        const hutWalls = new THREE.Mesh(new THREE.BoxGeometry(5, 3.5, 4), new THREE.MeshStandardMaterial({ color: 0x9e7a4a, roughness: 0.85 }));
        hutWalls.position.set(hutX, hutBaseY + 1.75, hutZ);
        hutWalls.castShadow = true;
        this.scene.add(hutWalls);
        for (let l = 0; l < 3; l++) {
            const rl = new THREE.Mesh(new THREE.ConeGeometry(4.5 - l * 0.5, 1.2, 8), thatchMat);
            rl.position.set(hutX, hutBaseY + 3.5 + l * 0.9, hutZ);
            rl.castShadow = true;
            this.scene.add(rl);
        }
        const hutDoor = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 0.1), new THREE.MeshStandardMaterial({ color: 0x5a3a1a }));
        hutDoor.position.set(hutX, hutBaseY + 1, hutZ + 2.05);
        this.scene.add(hutDoor);

        // ---- WOODEN WALKWAYS ----
        const plankMat = new THREE.MeshStandardMaterial({ color: 0xb8860b, roughness: 0.85 });
        for (const w of [[-5, -15, -15, 10], [5, -15, 15, 10], [0, -30, 0, -50]]) {
            const dx = w[2] - w[0], dz = w[3] - w[1];
            const len = Math.hypot(dx, dz);
            const segs = Math.ceil(len / 2);
            for (let s = 0; s < segs; s++) {
                const t = s / segs;
                const px = w[0] + dx * t, pz = w[1] + dz * t;
                const plank = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 0.8), plankMat);
                plank.position.set(px, heightAt(px, pz) + 0.3, pz);
                plank.rotation.y = Math.atan2(dx, dz);
                plank.receiveShadow = true;
                this.scene.add(plank);
            }
            for (let s = 0; s <= segs; s += 3) {
                const t = s / segs;
                const px = w[0] + dx * t, pz = w[1] + dz * t;
                const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.5, 6), plankMat);
                post.position.set(px, heightAt(px, pz) - 0.3, pz);
                this.scene.add(post);
            }
        }

        // ---- CORAL REEF ----
        const coralColors = [0xff6b6b, 0xff8c42, 0xffd93d, 0x6bcb77, 0x4d96ff, 0xff69b4];
        for (let i = 0; i < 40; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 30 + Math.random() * 80;
            const coral = new THREE.Mesh(
                new THREE.DodecahedronGeometry(0.5 + Math.random() * 1.5, 1),
                new THREE.MeshStandardMaterial({ color: coralColors[i % coralColors.length], roughness: 0.6 })
            );
            coral.position.set(Math.cos(angle) * dist, -0.5 - Math.random() * 1.5, Math.sin(angle) * dist);
            coral.rotation.set(Math.random(), Math.random(), Math.random());
            coral.scale.y = 0.5 + Math.random() * 0.5;
            this.scene.add(coral);
        }

        // ---- BENCHES ----
        const benchMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.9 });
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const bench = new THREE.Mesh(new THREE.BoxGeometry(2, 0.3, 0.6), benchMat);
            bench.position.set(Math.cos(angle) * 5, 0.5, -22 + Math.sin(angle) * 5);
            bench.rotation.y = angle + Math.PI / 2;
            this.scene.add(bench);
        }

        // ---- CRATES ----
        const crateMat = new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.85 });
        for (let i = 0; i < 6; i++) {
            const crate = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), crateMat);
            crate.position.set(-15 + Math.random() * 30, 0.5, -35 + Math.random() * 5);
            crate.rotation.y = Math.random();
            crate.castShadow = true;
            this.scene.add(crate);
        }

        // ---- BOAT ----
        const boat = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 6), new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8 }));
        boat.position.set(15, 0.5, 78);
        boat.rotation.y = 0.3;
        this.scene.add(boat);

        // ---- SPEED LOOPS (Sonic-style half-pipes and loops) ----
        const loopMat = new THREE.MeshStandardMaterial({ color: 0xff4444, roughness: 0.4, metalness: 0.5, side: THREE.DoubleSide });
        const loopRailMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.3, metalness: 0.8 });
        // Main speed loop at spawn area
        const loopPositions = [
            { x: 30, z: -40, r: 12, ry: 0 },
            { x: -30, z: 10, r: 10, ry: 0.3 },
        ];
        for (const lp of loopPositions) {
            const baseY = heightAt(lp.x, lp.z);
            // Loop ring
            const loopGeo = new THREE.TorusGeometry(lp.r, 0.3, 8, 32, Math.PI);
            const loop = new THREE.Mesh(loopGeo, loopMat);
            loop.position.set(lp.x, baseY + lp.r, lp.z);
            loop.rotation.y = lp.ry;
            loop.castShadow = true;
            this.scene.add(loop);
            // Support pillars
            for (let s = 0; s < 2; s++) {
                const angle = s === 0 ? -0.3 : Math.PI + 0.3;
                const px = lp.x + Math.cos(angle) * lp.r * Math.cos(lp.ry);
                const pz = lp.z + Math.cos(angle) * lp.r * Math.sin(lp.ry);
                const pillar = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.2, 0.25, baseY + lp.r, 8),
                    loopRailMat
                );
                pillar.position.set(px, (baseY + lp.r) / 2, pz);
                pillar.castShadow = true;
                this.scene.add(pillar);
            }
            // Entry ramp
            const ramp = new THREE.Mesh(
                new THREE.BoxGeometry(4, 0.3, 8),
                new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.5 })
            );
            ramp.position.set(lp.x - 3, baseY + 1.5, lp.z + lp.r);
            ramp.rotation.x = -0.3;
            ramp.receiveShadow = true;
            this.scene.add(ramp);
        }

        // ---- SPEED RAMP STRIPS ----
        const rampMat = new THREE.MeshStandardMaterial({ color: 0x00cc44, emissive: 0x00aa33, emissiveIntensity: 0.3, roughness: 0.4 });
        const rampPositions = [
            [10, -20, 0], [-10, -25, 0.5], [0, -35, -0.2],
            [20, -30, 0.1], [-20, -15, 0.3],
        ];
        for (const [rx, rz, rry] of rampPositions) {
            const baseY = heightAt(rx, rz);
            const strip = new THREE.Mesh(new THREE.BoxGeometry(3, 0.15, 6), rampMat);
            strip.position.set(rx, baseY + 0.1, rz);
            strip.rotation.y = rry;
            strip.receiveShadow = true;
            this.scene.add(strip);
            // Arrow markers on ramps
            const arrow = new THREE.Mesh(
                new THREE.ConeGeometry(0.5, 1.2, 3),
                new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x00ff44, emissiveIntensity: 0.5 })
            );
            arrow.position.set(rx, baseY + 0.5, rz + 1.5);
            arrow.rotation.x = -Math.PI / 2;
            this.scene.add(arrow);
        }

        // ---- GRIND RAIL ARCHES ----
        const archMat = new THREE.MeshStandardMaterial({ color: 0xff8800, roughness: 0.3, metalness: 0.7 });
        for (let i = 0; i < 3; i++) {
            const ax = -40 + i * 40, az = -50 + i * 15;
            const baseY = heightAt(ax, az);
            // Arch
            const arch = new THREE.Mesh(
                new THREE.TorusGeometry(5, 0.15, 8, 16, Math.PI),
                archMat
            );
            arch.position.set(ax, baseY + 5, az);
            arch.castShadow = true;
            this.scene.add(arch);
            // Support columns
            for (let side = -1; side <= 1; side += 2) {
                const col = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.12, 0.15, 5, 6),
                    archMat
                );
                col.position.set(ax + side * 5, baseY + 2.5, az);
                this.scene.add(col);
            }
        }

        // ---- FLOATING RING GATES ----
        const gateMat = new THREE.MeshStandardMaterial({ color: 0xFFD700, emissive: 0xFFD700, emissiveIntensity: 0.5, roughness: 0.15, metalness: 0.9 });
        const gatePositions = [
            [0, -30], [15, -20], [-15, -25], [25, -35], [-25, -30],
            [35, -45], [-35, -40], [0, -50], [10, -60], [-10, -55],
        ];
        for (const [gx, gz] of gatePositions) {
            const baseY = heightAt(gx, gz);
            // Two poles
            for (let side = -1; side <= 1; side += 2) {
                const pole = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.1, 0.1, 6, 6),
                    gateMat
                );
                pole.position.set(gx + side * 2.5, baseY + 3, gz);
                this.scene.add(pole);
            }
            // Top ring
            const gateRing = new THREE.Mesh(
                new THREE.TorusGeometry(2.5, 0.15, 8, 24),
                gateMat
            );
            gateRing.position.set(gx, baseY + 6, gz);
            gateRing.castShadow = true;
            this.scene.add(gateRing);
        }
    }

    _animateProps(dt) {
        const t = performance.now() * 0.001;
        if (this._crystal && this._corePos) {
            this._crystal.rotation.y += dt * 0.8;
            this._crystal.position.y = heightAt(this._corePos.x, this._corePos.z) + 5.8 + Math.sin(t * 1.5) * 0.3;
        }
        if (this._crystalLight && this._corePos) {
            this._crystalLight.intensity = 1.5 + Math.sin(t * 2) * 0.8;
        }
        if (this._drones && this._corePos) {
            for (const drone of this._drones) {
                drone.userData.angle += dt * drone.userData.speed;
                drone.position.x = this._corePos.x + Math.cos(drone.userData.angle) * drone.userData.radius;
                drone.position.z = this._corePos.z + Math.sin(drone.userData.angle) * drone.userData.radius;
                drone.position.y = drone.userData.height + Math.sin(t * 2 + drone.userData.angle) * 0.5;
                drone.rotation.y = drone.userData.angle;
            }
        }
    }

    clear() {
        const toRemove = [];
        for (const child of this.scene.children) {
            if (child === this.scene || child.isLight) continue;
            if (child.name === 'islandTerrain') continue;
            toRemove.push(child);
        }
        for (const child of toRemove) this.scene.remove(child);
        this.colliders = [];
        this.checkpoints = [];
        this.grindRails = [];
        this._crystal = null;
        this._crystalLight = null;
        this._drones = [];
    }

    getColliders() { return this.colliders; }
}
