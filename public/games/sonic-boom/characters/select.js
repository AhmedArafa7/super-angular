// Character Select — Sonic, Tails, Knuckles, Amy, Sticks
// THREE is a global

const CHARACTERS = {
    sonic: {
        name: 'Sonic', color: 0x1565C0, accentColor: 0xCC0000,
        speed: 1.0, abilities: ['Spin Dash', 'Homing Attack', 'Light Speed Dash'],
        quills: 3, bandana: false, shoes: 0xCC0000, gloves: true,
        desc: 'The fastest hedgehog alive. Balanced and versatile.'
    },
    tails: {
        name: 'Tails', color: 0xFF8C00, accentColor: 0xFFFFFF,
        speed: 0.8, abilities: ['Flight', 'Tails Sweep', 'Mech Tails'],
        quills: 0, bandana: false, shoes: 0x1565C0, gloves: true, tails: 2,
        desc: 'The genius twin-tailed fox. Can fly short distances.'
    },
    knuckles: {
        name: 'Knuckles', color: 0xCC0000, accentColor: 0xFFFFFF,
        speed: 0.75, abilities: ['Gliding', 'Wall Climb', 'Power Punch'],
        quills: 2, bandana: false, shoes: 0x1565C0, gloves: true, spikes: true,
        desc: 'The strong guardian. Slow but powerful.'
    },
    amy: {
        name: 'Amy', color: 0xF06292, accentColor: 0xFFFFFF,
        speed: 0.85, abilities: ['Piko Piko Hammer', 'Spin Attack', 'Tarot Reading'],
        quills: 5, bandana: false, shoes: 0xE91E63, gloves: true, hammer: true, headband: true, armlet: true, dress: true,
        legWraps: true, fingerless: true,
        desc: 'The energetic heroine. Fast and resourceful.'
    },
    sticks: {
        name: 'Sticks', color: 0xFF8C00, accentColor: 0x8B4513,
        speed: 0.9, abilities: ['Boomerang Throw', 'Trap Setting', 'Wild Instinct'],
        quills: 1, bandana: true, shoes: 0x8B4513, gloves: true, boomerang: true,
        desc: 'The wild jungle badger. Unpredictable and fierce.'
    }
};

export class CharacterSelect {
    constructor(scene) {
        this.scene = scene;
        this.selected = 'sonic';
        this.previews = {};
        this.meshes = {};
        this._buildPreviews();
    }

    _buildPreviews() {
        let x = -12;
        for (const [key, char] of Object.entries(CHARACTERS)) {
            const group = this._createCharacterMesh(char, 0.8);
            group.position.set(x, 0, 0);
            group.userData.charKey = key;
            this.scene.add(group);
            this.meshes[key] = group;
            this.previews[key] = group;
            x += 6;
        }
    }

    _createCharacterMesh(char, scale = 1) {
        const group = new THREE.Group();
        const bodyMat = new THREE.MeshStandardMaterial({ color: char.color, roughness: 0.6, metalness: 0.1 });
        const faceMat = new THREE.MeshStandardMaterial({ color: 0xf5d5b8, roughness: 0.5 });
        const shoeMat = new THREE.MeshStandardMaterial({ color: char.shoes, roughness: 0.4, metalness: 0.2 });
        const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
        // Amy-specific materials
        const amyEyeMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.2, metalness: 0.1 });
        const amyEyeWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1 });
        const amyPupilMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1 });
        const isAmy = char.name === 'Amy';

        // body
        const body = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), bodyMat);
        body.scale.set(1, 1.2, 0.9);
        body.position.y = 2.2;
        body.castShadow = true;
        group.add(body);

        // head
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.85, 16, 12), bodyMat);
        head.position.y = 3.5;
        head.castShadow = true;
        group.add(head);

        // muzzle
        const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), faceMat);
        muzzle.position.set(0, 3.35, 0.6);
        group.add(muzzle);

        // nose
        const nose = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), new THREE.MeshStandardMaterial({ color: 0x222222 }));
        nose.position.set(0, 3.4, 1.05);
        group.add(nose);

        // Amy — eyelashes
        if (isAmy) {
            const lashMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
            for (const side of [-1, 1]) {
                const lash = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.03, 0.02), lashMat);
                lash.position.set(side * 0.25, 3.75, 0.68);
                lash.rotation.z = side * 0.15;
                group.add(lash);
            }
        }

        // eyes — Amy uses bright green
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const pupilMat = new THREE.MeshStandardMaterial({ color: 0x006600 });
        const eyeMatUse = isAmy ? amyEyeWhite : eyeMat;
        const pupilMatUse = isAmy ? amyPupilMat : pupilMat;
        const irisMatUse = isAmy ? amyEyeMat : pupilMat;
        for (const side of [-1, 1]) {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(isAmy ? 0.22 : 0.18, 8, 8), eyeMatUse);
            eye.position.set(side * 0.25, 3.6, 0.7);
            group.add(eye);
            // iris (green for Amy)
            if (isAmy) {
                const iris = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), irisMatUse);
                iris.position.set(side * 0.25, 3.6, 0.83);
                group.add(iris);
                const pupil2 = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), pupilMatUse);
                pupil2.position.set(side * 0.25, 3.6, 0.92);
                group.add(pupil2);
            } else {
                const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), pupilMatUse);
                pupil.position.set(side * 0.25, 3.6, 0.85);
                group.add(pupil);
            }
        }

        // mouth (smile)
        const smile = new THREE.Mesh(
            new THREE.TorusGeometry(0.12, 0.02, 6, 12, Math.PI),
            new THREE.MeshStandardMaterial({ color: 0x333333 })
        );
        smile.position.set(0, 3.2, 0.95);
        smile.rotation.x = Math.PI;
        group.add(smile);

        // quills — Amy gets distinctive bob hairstyle with bangs
        if (char.quills > 0) {
            if (isAmy) {
                // Amy's bob hairstyle: 2 bangs drooping forward + 3 back quills forming bob shape
                // Front bangs
                for (let i = 0; i < 2; i++) {
                    const bang = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.7, 6), bodyMat);
                    bang.position.set((i - 0.5) * 0.4, 3.95, 0.55);
                    bang.rotation.x = 0.6; // drooping forward
                    bang.rotation.z = (i - 0.5) * 0.25;
                    group.add(bang);
                }
                // Back bob quills (rounded, shorter, angled outward)
                for (let i = 0; i < 3; i++) {
                    const quill = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.1, 8), bodyMat);
                    const spread = (i - 1) * 0.5;
                    quill.position.set(spread, 3.7, -0.5);
                    quill.rotation.x = -0.7 - Math.abs(i - 1) * 0.15;
                    quill.rotation.z = spread * 0.3;
                    group.add(quill);
                }
            } else {
                const quillCount = char.quills;
                for (let i = 0; i < quillCount; i++) {
                    const quill = new THREE.Mesh(new THREE.ConeGeometry(0.15, 1.2, 6), bodyMat);
                    const angle = -0.3 + (i / (char.quills - 1 || 1)) * 0.6;
                    quill.position.set(0, 3.8 - i * 0.3, -0.5 - i * 0.2);
                    quill.rotation.x = angle;
                    group.add(quill);
                }
            }
        }

        // tails (for Tails)
        if (char.tails) {
            for (let i = 0; i < char.tails; i++) {
                const tail = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.12, 0.08, 1.5, 6),
                    bodyMat
                );
                tail.position.set(i * 0.3 - 0.15, 1.8, -0.8);
                tail.rotation.x = 0.5;
                group.add(tail);
            }
        }

        // spikes (for Knuckles)
        if (char.spikes) {
            for (let i = 0; i < 3; i++) {
                const spike = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.5, 4), bodyMat);
                spike.position.set(0, 3.7, -0.4 - i * 0.3);
                spike.rotation.x = -0.8;
                group.add(spike);
            }
        }

        // gloves — Amy gets fingerless sports gloves
        if (char.gloves) {
            for (const side of [-1, 1]) {
                const glove = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), whiteMat);
                glove.position.set(side * 1.2, 1.8, 0);
                group.add(glove);
                if (isAmy) {
                    // Wrist cuff
                    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.15, 8), whiteMat);
                    cuff.position.set(side * 1.2, 1.95, 0);
                    group.add(cuff);
                    // Skin-tone upper arm
                    const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.6, 6), faceMat);
                    upperArm.position.set(side * 1.15, 2.2, 0);
                    group.add(upperArm);
                }
            }
        }

        // shoes — Amy gets chunky sporty sneakers from reference
        for (const side of [-1, 1]) {
            if (isAmy) {
                // Amy's sporty pink sneakers (chunky, with white sole and straps)
                const sneaker = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.4, 0.9), shoeMat);
                sneaker.position.set(side * 0.4, 0.2, 0.15);
                group.add(sneaker);
                // White thick sole
                const sole = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.12, 0.92), whiteMat);
                sole.position.set(side * 0.4, 0.0, 0.15);
                group.add(sole);
                // White toe cap
                const toeCap = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), whiteMat);
                toeCap.scale.set(1.3, 0.6, 1);
                toeCap.position.set(side * 0.4, 0.15, 0.55);
                group.add(toeCap);
                // White strap across top
                const strap = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.06, 0.15), whiteMat);
                strap.position.set(side * 0.4, 0.35, 0.2);
                group.add(strap);

                // Leg wraps / knee guards (purple-pink sports wraps)
                const legWrapMat = new THREE.MeshStandardMaterial({ color: 0xAB47BC, roughness: 0.6 });
                const legWrap = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.5, 8), legWrapMat);
                legWrap.position.set(side * 0.4, 0.7, 0.1);
                group.add(legWrap);
                // Knee guard ring
                const kneeRing = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.03, 6, 10), legWrapMat);
                kneeRing.position.set(side * 0.4, 0.95, 0.1);
                kneeRing.rotation.x = Math.PI / 2;
                group.add(kneeRing);
            } else {
                const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.8), shoeMat);
                shoe.position.set(side * 0.4, 0.15, 0.15);
                group.add(shoe);
            }
        }

        // belt/waistband
        const belt = new THREE.Mesh(
            new THREE.TorusGeometry(0.95, 0.08, 6, 16),
            new THREE.MeshStandardMaterial({ color: 0x333333 })
        );
        belt.position.y = 1.6;
        belt.rotation.x = Math.PI / 2;
        group.add(belt);

        // bandana (for Sticks)
        if (char.bandana) {
            const bandMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
            const band = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.05, 6, 12), bandMat);
            band.position.y = 3.8;
            band.rotation.x = Math.PI / 2;
            group.add(band);
        }

        // Amy — Pink headband (thicker, more prominent as in reference)
        if (char.headband) {
            const headbandMat = new THREE.MeshStandardMaterial({ color: 0xE91E63, roughness: 0.4 });
            // Thick headband base
            const headband = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.1, 10, 20), headbandMat);
            headband.position.y = 3.85;
            headband.rotation.x = Math.PI / 2;
            group.add(headband);
            // Top ridge of headband (the raised part visible in reference)
            const headbandTop = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 0.15), headbandMat);
            headbandTop.position.set(0, 4.0, 0);
            group.add(headbandTop);
        }

        // Amy — Athletic dress with broad white belt (darker magenta-pink as in reference)
        if (char.dress) {
            const dressMat = new THREE.MeshStandardMaterial({ color: 0xE91E63, roughness: 0.45 });
            // Main dress body (flared)
            const dress = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.95, 1.3, 14), dressMat);
            dress.position.y = 1.45;
            group.add(dress);
            // Collar / top edge
            const collar = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.04, 6, 14), dressMat);
            collar.position.y = 2.1;
            collar.rotation.x = Math.PI / 2;
            group.add(collar);
            // Broad white belt (prominent as in reference)
            const beltMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 });
            const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.18, 14), beltMat);
            belt.position.y = 1.85;
            group.add(belt);
            // Belt buckle detail
            const buckleMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.2, metalness: 0.3 });
            const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 0.06), buckleMat);
            buckle.position.set(0, 1.85, 0.62);
            group.add(buckle);
        }

        // Amy — Blue/white armlet on left arm
        if (char.armlet) {
            const armletBase = new THREE.MeshStandardMaterial({ color: 0x2196F3, roughness: 0.4 });
            const armletWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
            const armBand = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 6, 12), armletBase);
            armBand.position.set(-1.1, 2.0, 0);
            armBand.rotation.z = Math.PI / 2;
            group.add(armBand);
            const armBand2 = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 6, 12), armletWhite);
            armBand2.position.set(-1.1, 2.15, 0);
            armBand2.rotation.z = Math.PI / 2;
            group.add(armBand2);
        }

        // Amy — Piko Piko Hammer (massive cylindrical pink head with thick gold bands, long yellow handle)
        if (char.hammer) {
            const hammerGroup = new THREE.Group();
            const hammerHeadMat = new THREE.MeshStandardMaterial({ color: 0xE91E63, roughness: 0.35 });
            const hammerEdgeMat = new THREE.MeshStandardMaterial({ color: 0xFFD700, roughness: 0.2, metalness: 0.7 });
            const handleMat = new THREE.MeshStandardMaterial({ color: 0xFFD700, roughness: 0.3, metalness: 0.3 });

            // MASSIVE hammer head (bigger than reference — it's iconic)
            const hammerHead = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.9, 12), hammerHeadMat);
            hammerHead.rotation.x = Math.PI / 2;
            hammerGroup.add(hammerHead);

            // Flat face caps (lighter pink)
            const capMat = new THREE.MeshStandardMaterial({ color: 0xF48FB1, roughness: 0.3 });
            const cap1 = new THREE.Mesh(new THREE.CircleGeometry(0.68, 12), capMat);
            cap1.position.z = 0.46;
            hammerGroup.add(cap1);
            const cap2 = new THREE.Mesh(new THREE.CircleGeometry(0.68, 12), capMat);
            cap2.position.z = -0.46;
            cap2.rotation.y = Math.PI;
            hammerGroup.add(cap2);

            // Thick gold bands on hammer head edges
            const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.06, 8, 20), hammerEdgeMat);
            ring1.position.z = 0.42;
            hammerGroup.add(ring1);
            const ring2 = ring1.clone();
            ring2.position.z = -0.42;
            hammerGroup.add(ring2);
            // Center gold band
            const ringCenter = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.04, 6, 18), hammerEdgeMat);
            ringCenter.position.z = 0;
            hammerGroup.add(ringCenter);

            // Long yellow handle
            const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.4, 8), handleMat);
            handle.position.y = -1.4;
            handle.rotation.z = 0.15;
            hammerGroup.add(handle);
            // Handle grip end
            const grip = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), hammerEdgeMat);
            grip.position.y = -2.6;
            grip.position.x = 0.15 * 2.4;
            hammerGroup.add(grip);

            hammerGroup.position.set(0.8, 3.2, -0.7);
            hammerGroup.rotation.set(-0.25, 0.4, 0.25);
            group.add(hammerGroup);
        }

        // Sticks — crude boomerang on back
        if (char.boomerang) {
            const boomMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.7 });
            const boom = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.09, 6, 10, Math.PI * 1.4), boomMat);
            boom.position.set(0.7, 3.0, -0.8);
            boom.rotation.y = 0.4;
            boom.rotation.z = 0.3;
            group.add(boom);
        }

        // Tails — aviator goggles on head
        if (char.tails) {
            const goggleMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.6, roughness: 0.3 });
            const lensMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, metalness: 0.5, roughness: 0.1, transparent: true, opacity: 0.7 });
            for (const side of [-1, 1]) {
                const lens = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), lensMat);
                lens.position.set(side * 0.28, 3.85, 0.5);
                lens.scale.z = 0.4;
                group.add(lens);
                const ring = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.03, 6, 12), goggleMat);
                ring.position.set(side * 0.28, 3.85, 0.5);
                ring.rotation.y = 0;
                group.add(ring);
            }
            const strap = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 0.06), goggleMat);
            strap.position.set(0, 3.85, 0.2);
            group.add(strap);
        }

        group.scale.setScalar(scale);
        return group;
    }

    show() {
        for (const key in this.meshes) this.meshes[key].visible = true;
    }

    hide() {
        for (const key in this.meshes) this.meshes[key].visible = false;
    }

    select(charKey) {
        this.selected = charKey;
        for (const key in this.meshes) {
            const m = this.meshes[key];
            m.scale.setScalar(key === charKey ? 1.2 : 0.8);
            m.position.y = key === charKey ? 0.5 : 0;
        }
    }

    // Spawn a fresh character mesh (for remote/online players)
    spawnPlayerMesh(charKey, scale = 1) {
        const char = CHARACTERS[charKey] || CHARACTERS.sonic;
        return this._createCharacterMesh(char, scale);
    }

    // Recolor a character mesh (for duplicate character color variants)
    tintMesh(group, color) {
        group.traverse((child) => {
            if (child.isMesh && child.material && child.material.color) {
                child.material = child.material.clone();
                child.material.color.setHex(color);
            }
        });
    }

    getSelected() { const c = CHARACTERS[this.selected]; return c ? { ...c, key: this.selected } : null; }
    getCharacterInfo(charKey) { const c = CHARACTERS[charKey]; return c ? { ...c, key: charKey } : null; }
    getAllCharacters() { return CHARACTERS; }
}
