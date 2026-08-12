// ============================================================
// SONIC BOOM — Sonic Character
// Procedural 3D model, animation states, speed trail particles
// ============================================================
// THREE is a global

export class SonicCharacter {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.position = this.group.position;
    this.velocity = new THREE.Vector3();
    this.facing = new THREE.Vector3(0, 0, -1);
    this.facingAngle = 0;

    // State
    this.isGrounded = true;
    this.isSpinning = false;
    this.isSpinDashing = false;
    this.isHomingAttacking = false;
    this.isEnerbeaming = false;
    this.spinDashCharge = 0;
    this.hasDoubleJumped = false;
    this.invincibleTimer = 0;
    this.homingTarget = null;

    // Health
    this.rings = 0;
    this.lives = 3;
    this.score = 0;
    this.alive = true;

    // Speed trail
    this._trailParticles = [];

    // Enerbeam visuals
    this._enerbeamLine = null;

    this._buildModel();
    scene.add(this.group);
  }

  _buildModel() {
    const materials = {
      body: new THREE.MeshStandardMaterial({ color: 0x1a6ff0, roughness: 0.35, metalness: 0.05 }),
      skin: new THREE.MeshStandardMaterial({ color: 0xf8c8a0, roughness: 0.5, metalness: 0 }),
      shoe: new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.3, metalness: 0.15 }),
      shoeSole: new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.4, metalness: 0 }),
      shoeStrap: new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.3, metalness: 0.1 }),
      bandana: new THREE.MeshStandardMaterial({ color: 0x6d4c3a, roughness: 0.55, metalness: 0 }),
      tape: new THREE.MeshStandardMaterial({ color: 0xf0ece4, roughness: 0.5, metalness: 0 }),
      eye: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.05, metalness: 0 }),
      eyeGreen: new THREE.MeshStandardMaterial({ color: 0x1b8a2e, roughness: 0.15, metalness: 0.05 }),
      pupil: new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.05, metalness: 0 }),
      belly: new THREE.MeshStandardMaterial({ color: 0xf8c8a0, roughness: 0.5, metalness: 0 }),
      nose: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.1, metalness: 0.3 }),
    };
    this._materials = materials;

    // ---- TORSO ----
    const bodyGeo = new THREE.SphereGeometry(1, 20, 14);
    bodyGeo.scale(0.85, 1.15, 0.7);
    const body = new THREE.Mesh(bodyGeo, materials.body);
    body.position.y = 1.35;
    body.castShadow = true;
    this.group.add(body);
    this._body = body;

    // Belly patch (lighter underside)
    const bellyGeo = new THREE.SphereGeometry(0.62, 14, 10);
    bellyGeo.scale(0.65, 0.85, 0.35);
    const belly = new THREE.Mesh(bellyGeo, materials.belly);
    belly.position.set(0, 1.25, 0.42);
    this.group.add(belly);

    // ---- HEAD ----
    const headGeo = new THREE.SphereGeometry(0.78, 20, 14);
    const head = new THREE.Mesh(headGeo, materials.body);
    head.position.set(0, 2.65, 0.1);
    head.castShadow = true;
    this.group.add(head);
    this._head = head;

    // Muzzle (skin-colored, protruding forward)
    const muzzleGeo = new THREE.SphereGeometry(0.48, 14, 10);
    muzzleGeo.scale(0.78, 0.65, 0.6);
    const muzzle = new THREE.Mesh(muzzleGeo, materials.skin);
    muzzle.position.set(0, 2.48, 0.55);
    this.group.add(muzzle);

    // ---- EYES (large, connected — Sonic Boom style) ----
    const eyeGeo = new THREE.SphereGeometry(0.22, 12, 10);
    const eyeL = new THREE.Mesh(eyeGeo, materials.eye);
    eyeL.position.set(-0.19, 2.7, 0.7);
    eyeL.scale.set(0.75, 1.05, 0.45);
    this.group.add(eyeL);

    const eyeR = eyeL.clone();
    eyeR.position.x = 0.19;
    this.group.add(eyeR);

    // Green irises
    const irisGeo = new THREE.SphereGeometry(0.11, 10, 8);
    const irisL = new THREE.Mesh(irisGeo, materials.eyeGreen);
    irisL.position.set(-0.17, 2.7, 0.85);
    this.group.add(irisL);
    const irisR = irisL.clone();
    irisR.position.x = 0.17;
    this.group.add(irisR);

    // Pupils
    const pupilGeo = new THREE.SphereGeometry(0.055, 8, 6);
    const pupilL = new THREE.Mesh(pupilGeo, materials.pupil);
    pupilL.position.set(-0.16, 2.72, 0.92);
    this.group.add(pupilL);
    const pupilR = pupilL.clone();
    pupilR.position.x = 0.16;
    this.group.add(pupilR);

    // Nose (small black sphere)
    const noseGeo = new THREE.SphereGeometry(0.09, 8, 6);
    const nose = new THREE.Mesh(noseGeo, materials.nose);
    nose.position.set(0, 2.45, 0.97);
    this.group.add(nose);

    // ---- QUILLS (5 spikes — Sonic Boom style, sweeping back & up) ----
    const quillMat = materials.body;
    const quillConfigs = [
      { y: 3.15, z: -0.25, rx: -0.9,  s: 1.35, r: 0.22 },
      { y: 2.95, z: -0.5,  rx: -1.0,  s: 1.25, r: 0.2  },
      { y: 2.7,  z: -0.7,  rx: -1.15, s: 1.1,  r: 0.18 },
      { y: 3.3,  z: -0.15, rx: -0.6,  s: 0.9,  r: 0.15 },
      { y: 2.5,  z: -0.85, rx: -1.3,  s: 0.8,  r: 0.16 },
    ];
    for (const q of quillConfigs) {
      const geo = new THREE.ConeGeometry(q.r, q.s, 6);
      const quill = new THREE.Mesh(geo, quillMat);
      quill.position.set(0, q.y, q.z);
      quill.rotation.x = q.rx;
      quill.castShadow = true;
      this.group.add(quill);
    }

    // ---- BANDANA / NECKERCHIEF (brown, Sonic Boom signature) ----
    const bandanaGeo = new THREE.TorusGeometry(0.52, 0.13, 8, 18);
    const bandana = new THREE.Mesh(bandanaGeo, materials.bandana);
    bandana.position.set(0, 2.0, 0.08);
    bandana.rotation.x = Math.PI / 2;
    this.group.add(bandana);
    this._bandana = bandana;

    // Bandana tails (2 flowing strips)
    for (const side of [-1, 1]) {
      const tailGeo = new THREE.BoxGeometry(0.14, 0.07, 0.65);
      const tail = new THREE.Mesh(tailGeo, materials.bandana);
      tail.position.set(side * 0.14, 1.98, -0.6);
      tail.rotation.x = -0.35;
      tail.rotation.y = side * 0.15;
      this.group.add(tail);
    }

    // ---- ARMS (blue, Sonic Boom style — thicker) ----
    const armGeo = new THREE.CapsuleGeometry(0.16, 0.75, 6, 10);
    const armL = new THREE.Mesh(armGeo, materials.body);
    armL.position.set(-0.88, 1.5, 0.05);
    armL.rotation.z = 0.35;
    armL.castShadow = true;
    this.group.add(armL);
    this._armL = armL;

    const armR = new THREE.Mesh(armGeo.clone(), materials.body);
    armR.position.set(0.88, 1.5, 0.05);
    armR.rotation.z = -0.35;
    armR.castShadow = true;
    this.group.add(armR);
    this._armR = armR;

    // ---- HANDS with sports tape wrapping ----
    const handGeo = new THREE.SphereGeometry(0.2, 10, 8);
    const handL = new THREE.Mesh(handGeo, materials.tape);
    handL.position.set(-1.02, 0.92, 0.05);
    this.group.add(handL);
    const handR = new THREE.Mesh(handGeo.clone(), materials.tape);
    handR.position.set(1.02, 0.92, 0.05);
    this.group.add(handR);

    // Tape wraps on forearms (multiple rings)
    const armTapeGeo = new THREE.TorusGeometry(0.18, 0.035, 6, 14);
    for (const side of [-1, 1]) {
      for (let j = 0; j < 3; j++) {
        const tape = new THREE.Mesh(armTapeGeo, materials.tape);
        tape.position.set(side * 0.92, 1.25 - j * 0.12, 0.05);
        tape.rotation.y = Math.PI / 2;
        this.group.add(tape);
      }
    }

    // ---- LEGS ----
    const legGeo = new THREE.CapsuleGeometry(0.18, 0.65, 6, 10);
    const legL = new THREE.Mesh(legGeo, materials.body);
    legL.position.set(-0.33, 0.35, 0);
    legL.castShadow = true;
    this.group.add(legL);
    this._legL = legL;

    const legR = new THREE.Mesh(legGeo.clone(), materials.body);
    legR.position.set(0.33, 0.35, 0);
    legR.castShadow = true;
    this.group.add(legR);
    this._legR = legR;

    // ---- SHOES (red with white strap & sole — Sonic Boom) ----
    const shoeGeo = new THREE.BoxGeometry(0.38, 0.22, 0.55);
    shoeGeo.translate(0, -0.08, 0.06);
    const shoeL = new THREE.Mesh(shoeGeo, materials.shoe);
    shoeL.position.set(-0.33, -0.1, 0);
    shoeL.castShadow = true;
    this.group.add(shoeL);
    this._shoeL = shoeL;

    const shoeR = new THREE.Mesh(shoeGeo.clone(), materials.shoe);
    shoeR.position.set(0.33, -0.1, 0);
    shoeR.castShadow = true;
    this.group.add(shoeR);
    this._shoeR = shoeR;

    // White strap across shoe top
    const strapGeo = new THREE.BoxGeometry(0.4, 0.06, 0.22);
    const strapL = new THREE.Mesh(strapGeo, materials.shoeStrap);
    strapL.position.set(-0.33, 0.0, 0.12);
    this.group.add(strapL);
    const strapR = new THREE.Mesh(strapGeo.clone(), materials.shoeStrap);
    strapR.position.set(0.33, 0.0, 0.12);
    this.group.add(strapR);

    // White sole
    const soleGeo = new THREE.BoxGeometry(0.4, 0.06, 0.58);
    const soleL = new THREE.Mesh(soleGeo, materials.shoeSole);
    soleL.position.set(-0.33, -0.22, 0.06);
    this.group.add(soleL);
    const soleR = new THREE.Mesh(soleGeo.clone(), materials.shoeSole);
    soleR.position.set(0.33, -0.22, 0.06);
    this.group.add(soleR);

    // ---- SPORTS TAPE on lower legs ----
    const legTapeGeo = new THREE.TorusGeometry(0.2, 0.035, 6, 14);
    for (const side of [-1, 1]) {
      for (let j = 0; j < 2; j++) {
        const tape = new THREE.Mesh(legTapeGeo, materials.tape);
        tape.position.set(side * 0.33, 0.18 + j * 0.1, 0);
        tape.rotation.x = Math.PI / 2;
        this.group.add(tape);
      }
    }

    // ---- SPIN BALL (hidden) ----
    const spinGeo = new THREE.SphereGeometry(0.9, 18, 14);
    this._spinBall = new THREE.Mesh(spinGeo, materials.body);
    this._spinBall.castShadow = true;
    this._spinBall.visible = false;
    this._spinBall.position.y = 0.9;
    this.group.add(this._spinBall);

    // ---- SPEED TRAIL ----
    this._trailGeometry = new THREE.BufferGeometry();
    const trailPositions = new Float32Array(300 * 3);
    const trailColors = new Float32Array(300 * 3);
    const trailSizes = new Float32Array(300);
    this._trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    this._trailGeometry.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));
    this._trailGeometry.setAttribute('size', new THREE.BufferAttribute(trailSizes, 1));

    const trailMat = new THREE.PointsMaterial({
      size: 0.3, vertexColors: true, transparent: true, opacity: 0.7,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
    });
    this._trailPoints = new THREE.Points(this._trailGeometry, trailMat);
    this.scene.add(this._trailPoints);
    this._trailIndex = 0;
    this._trailCount = 300;

    // ---- ENERBEAM ----
    const beamMat = new THREE.LineBasicMaterial({
      color: 0x00bbff, linewidth: 3, transparent: true, opacity: 0.9
    });
    const beamGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    this._enerbeamLine = new THREE.Line(beamGeo, beamMat);
    this._enerbeamLine.visible = false;
    this.scene.add(this._enerbeamLine);

    const glowGeo = new THREE.SphereGeometry(0.16, 10, 8);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x00ddff, transparent: true, opacity: 0.8 });
    this._enerbeamGlow = new THREE.Mesh(glowGeo, glowMat);
    this._enerbeamGlow.visible = false;
    this.scene.add(this._enerbeamGlow);
  }

  // Toggle between normal model and spin ball
  setSpinMode(spinning) {
    this.isSpinning = spinning;
    // Toggle visibility of body parts vs spin ball
    this.group.children.forEach(child => {
      if (child === this._spinBall) {
        child.visible = spinning;
      } else if (child.isMesh) {
        child.visible = !spinning;
      }
    });
  }

  // Animate limbs, bobbing, spin ball rotation
  animate(dt, speedRatio) {
    const time = performance.now() * 0.001;

    this._updateEmote(dt);

    if (this._emote) return; // emote overrides normal animation

    if (this.isSpinning || this.isSpinDashing) {
      // Spin ball rotation
      this._spinBall.rotation.x += dt * 25;
      this._spinBall.rotation.z += dt * 5;
    } else if (this._limbAnim === false) {
      // External GLTF model — bobbing + run tilt
      const bob = Math.sin(time * (8 + speedRatio * 10)) * 0.05 * Math.min(1, speedRatio * 2);
      this.group.position.y += bob;
      this._externalModel.rotation.x = speedRatio * 0.1;
    } else {
      // Running animation
      if (speedRatio > 0.05 && this.isGrounded) {
        const runSpeed = 6 + speedRatio * 14;
        const stride = Math.sin(time * runSpeed) * 0.4 * speedRatio;

        // Leg animation
        if (this._legL) {
          this._legL.rotation.x = stride;
          this._legR.rotation.x = -stride;
          this._shoeL.rotation.x = stride * 0.5;
          this._shoeR.rotation.x = -stride * 0.5;
          this._shoeL.position.y = -0.15 + Math.abs(stride) * 0.1;
          this._shoeR.position.y = -0.15 + Math.abs(-stride) * 0.1;
        }

        // Arm swing
        if (this._armL) {
          this._armL.rotation.x = -stride * 0.6;
          this._armR.rotation.x = stride * 0.6;
        }

        // Body lean forward at speed
        this._body.rotation.x = speedRatio * 0.15;
        this._head.rotation.x = -speedRatio * 0.05;

        // Slight bobbing
        this.group.position.y += Math.sin(time * runSpeed * 2) * 0.02 * speedRatio;
      } else {
        // Idle animation
        if (this._legL) {
          this._legL.rotation.x = 0;
          this._legR.rotation.x = 0;
          this._armL.rotation.x = Math.sin(time * 1.5) * 0.05;
          this._armR.rotation.x = Math.sin(time * 1.5 + Math.PI) * 0.05;
        }
        this._body.rotation.x = 0;

        // Breathing
        this._body.scale.y = 1.1 + Math.sin(time * 2) * 0.02;
      }
    }

    // Invincibility flash
    if (this.invincibleTimer > 0) {
      this.invincibleTimer -= dt;
      const flash = Math.sin(this.invincibleTimer * 20) > 0;
      this.group.visible = flash;
    } else {
      this.group.visible = true;
    }

    // Update facing rotation
    if (Math.abs(this.velocity.x) > 0.5 || Math.abs(this.velocity.z) > 0.5) {
      const targetAngle = Math.atan2(this.velocity.x, this.velocity.z);
      let diff = targetAngle - this.facingAngle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.facingAngle += diff * 10 * dt;
      this.group.rotation.y = this.facingAngle;
      this.facing.set(Math.sin(this.facingAngle), 0, Math.cos(this.facingAngle));
    }

    // Speed trail particles
    this._updateTrail(speedRatio);
  }

  _updateTrail(speedRatio) {
    if (speedRatio < 0.3) return;

    const positions = this._trailGeometry.attributes.position.array;
    const colors = this._trailGeometry.attributes.color.array;
    const sizes = this._trailGeometry.attributes.size.array;

    // Add new particle
    const i = this._trailIndex % this._trailCount;
    const spread = 0.5;
    positions[i * 3] = this.position.x + (Math.random() - 0.5) * spread;
    positions[i * 3 + 1] = this.position.y + 0.5 + (Math.random() - 0.5) * spread;
    positions[i * 3 + 2] = this.position.z + (Math.random() - 0.5) * spread;

    // Blue to cyan color
    colors[i * 3] = 0.1;
    colors[i * 3 + 1] = 0.5 + Math.random() * 0.3;
    colors[i * 3 + 2] = 1;

    sizes[i] = 0.2 + speedRatio * 0.4;

    this._trailIndex++;

    // Fade old particles
    for (let j = 0; j < this._trailCount; j++) {
      sizes[j] *= 0.96;
      if (sizes[j] < 0.01) sizes[j] = 0;
    }

    this._trailGeometry.attributes.position.needsUpdate = true;
    this._trailGeometry.attributes.color.needsUpdate = true;
    this._trailGeometry.attributes.size.needsUpdate = true;
  }

  // Show enerbeam from hand to target point
  showEnerbeam(targetPos) {
    this._enerbeamLine.visible = true;
    this._enerbeamGlow.visible = true;

    const handPos = new THREE.Vector3(
      this.position.x + Math.sin(this.facingAngle) * 0.5 + 0.5,
      this.position.y + 1.5,
      this.position.z + Math.cos(this.facingAngle) * 0.5
    );

    const positions = this._enerbeamLine.geometry.attributes.position.array;
    positions[0] = handPos.x; positions[1] = handPos.y; positions[2] = handPos.z;
    positions[3] = targetPos.x; positions[4] = targetPos.y; positions[5] = targetPos.z;
    this._enerbeamLine.geometry.attributes.position.needsUpdate = true;

    this._enerbeamGlow.position.copy(handPos);
    this._enerbeamGlow.scale.setScalar(1 + Math.sin(performance.now() * 0.01) * 0.3);
  }

  hideEnerbeam() {
    this._enerbeamLine.visible = false;
    this._enerbeamGlow.visible = false;
  }

  // Take damage
  takeDamage() {
    if (this.invincibleTimer > 0) return false;

    if (this.rings > 0) {
      // Scatter rings
      const scattered = Math.min(this.rings, 20);
      this.rings = 0;
      this.invincibleTimer = 2;
      return { type: 'ring_scatter', count: scattered };
    } else {
      // Lose a life
      this.lives--;
      if (this.lives <= 0) {
        this.alive = false;
        return { type: 'game_over' };
      }
      this.invincibleTimer = 3;
      return { type: 'life_lost' };
    }
  }

  // Reset to checkpoint position
  respawn(pos) {
    this.position.copy(pos);
    this.velocity.set(0, 0, 0);
    this.isSpinning = false;
    this.isSpinDashing = false;
    this.isHomingAttacking = false;
    this.setSpinMode(false);
    this.invincibleTimer = 2;
    this.rings = 0;
    this.alive = true;
  }

  getCollisionRadius() {
    return this.isSpinning ? 0.9 : 0.7;
  }

  // Recolor model to match selected character
  setCharacter(charData) {
    if (!charData) return;
    const color = charData.color;
    const mats = this._materials;
    mats.body.color.setHex(color);
    if (charData.shoes) mats.shoe.color.setHex(charData.shoes);
    if (charData.accentColor) {
      mats.bandana.color.setHex(charData.accentColor);
      for (const c of this.group.children) {
        if (c.isMesh && c.material === mats.bandana) c.material.color.setHex(charData.accentColor);
      }
    }

    // Amy-specific: headband, dress, armlet, hammer, green eyes, leg wraps, sporty sneakers
    if (charData.name === 'Amy') {
      // Green eyes
      mats.eyeGreen = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.2 });
      mats.eye.color.setHex(0xffffff);

      // ----- Pink headband (thick, prominent as in reference) -----
      const headbandMat = new THREE.MeshStandardMaterial({ color: 0xE91E63, roughness: 0.4 });
      const headband = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.1, 10, 20), headbandMat);
      headband.position.y = 3.85;
      headband.rotation.x = Math.PI / 2;
      this.group.add(headband);
      // Top ridge
      const headbandTop = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 0.15), headbandMat);
      headbandTop.position.set(0, 4.0, 0);
      this.group.add(headbandTop);

      // ----- Bob hairstyle (bangs forward + back quills) -----
      const hairMat = new THREE.MeshStandardMaterial({ color: 0xF06292, roughness: 0.6 });
      // Front bangs
      for (let i = 0; i < 2; i++) {
        const bang = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.7, 6), hairMat);
        bang.position.set((i - 0.5) * 0.4, 3.95, 0.55);
        bang.rotation.x = 0.6;
        bang.rotation.z = (i - 0.5) * 0.25;
        this.group.add(bang);
      }
      // Back bob quills
      for (let i = 0; i < 3; i++) {
        const quill = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.1, 8), hairMat);
        const spread = (i - 1) * 0.5;
        quill.position.set(spread, 3.7, -0.5);
        quill.rotation.x = -0.7 - Math.abs(i - 1) * 0.15;
        quill.rotation.z = spread * 0.3;
        this.group.add(quill);
      }

      // ----- Athletic dress (darker magenta-pink as in reference) -----
      const dressMat = new THREE.MeshStandardMaterial({ color: 0xE91E63, roughness: 0.45 });
      const dress = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.95, 1.3, 14), dressMat);
      dress.position.y = 1.45;
      this.group.add(dress);
      // Collar
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.04, 6, 14), dressMat);
      collar.position.y = 2.1;
      collar.rotation.x = Math.PI / 2;
      this.group.add(collar);

      // ----- Broad white belt -----
      const beltMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 });
      const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.18, 14), beltMat);
      belt.position.y = 1.85;
      this.group.add(belt);
      // Belt buckle
      const buckleMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.2, metalness: 0.3 });
      const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 0.06), buckleMat);
      buckle.position.set(0, 1.85, 0.62);
      this.group.add(buckle);

      // ----- Blue/white sports armlet on left arm -----
      const armletBlue = new THREE.MeshStandardMaterial({ color: 0x2196F3, roughness: 0.4 });
      const armletWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
      const armBand = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 6, 12), armletBlue);
      armBand.position.set(-1.1, 2.0, 0);
      armBand.rotation.z = Math.PI / 2;
      this.group.add(armBand);
      const armBand2 = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 6, 12), armletWhite);
      armBand2.position.set(-1.1, 2.15, 0);
      armBand2.rotation.z = Math.PI / 2;
      this.group.add(armBand2);

      // ----- Fingerless sports gloves with wrist cuff -----
      const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
      for (const side of [-1, 1]) {
        const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.15, 8), whiteMat);
        cuff.position.set(side * 1.15, 1.95, 0);
        this.group.add(cuff);
      }

      // ----- Leg wraps / knee guards (purple-pink) -----
      const legWrapMat = new THREE.MeshStandardMaterial({ color: 0xAB47BC, roughness: 0.6 });
      for (const side of [-1, 1]) {
        const legWrap = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.5, 8), legWrapMat);
        legWrap.position.set(side * 0.4, 0.7, 0.1);
        this.group.add(legWrap);
        const kneeRing = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.03, 6, 10), legWrapMat);
        kneeRing.position.set(side * 0.4, 0.95, 0.1);
        kneeRing.rotation.x = Math.PI / 2;
        this.group.add(kneeRing);
      }

      // ----- Chunky sporty pink sneakers -----
      const sneakerMat = new THREE.MeshStandardMaterial({ color: 0xE91E63, roughness: 0.4 });
      for (const side of [-1, 1]) {
        const sneaker = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.4, 0.9), sneakerMat);
        sneaker.position.set(side * 0.4, 0.2, 0.15);
        this.group.add(sneaker);
        const sole = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.12, 0.92), whiteMat);
        sole.position.set(side * 0.4, 0.0, 0.15);
        this.group.add(sole);
        const toeCap = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), whiteMat);
        toeCap.scale.set(1.3, 0.6, 1);
        toeCap.position.set(side * 0.4, 0.15, 0.55);
        this.group.add(toeCap);
        const strap = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.06, 0.15), whiteMat);
        strap.position.set(side * 0.4, 0.35, 0.2);
        this.group.add(strap);
      }

      // ----- Piko Piko Hammer (MASSIVE, matching reference) -----
      const hammerGroup = new THREE.Group();
      const hammerHeadMat = new THREE.MeshStandardMaterial({ color: 0xE91E63, roughness: 0.35 });
      const hammerEdgeMat = new THREE.MeshStandardMaterial({ color: 0xFFD700, roughness: 0.2, metalness: 0.7 });
      const handleMat = new THREE.MeshStandardMaterial({ color: 0xFFD700, roughness: 0.3, metalness: 0.3 });

      // Massive cylindrical hammer head
      const hammerHead = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.9, 12), hammerHeadMat);
      hammerHead.rotation.x = Math.PI / 2;
      hammerGroup.add(hammerHead);

      // Lighter pink face caps
      const capMat = new THREE.MeshStandardMaterial({ color: 0xF48FB1, roughness: 0.3 });
      const cap1 = new THREE.Mesh(new THREE.CircleGeometry(0.68, 12), capMat);
      cap1.position.z = 0.46;
      hammerGroup.add(cap1);
      const cap2 = new THREE.Mesh(new THREE.CircleGeometry(0.68, 12), capMat);
      cap2.position.z = -0.46;
      cap2.rotation.y = Math.PI;
      hammerGroup.add(cap2);

      // Thick gold edge bands
      const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.06, 8, 20), hammerEdgeMat);
      ring1.position.z = 0.42;
      hammerGroup.add(ring1);
      const ring2 = ring1.clone();
      ring2.position.z = -0.42;
      hammerGroup.add(ring2);
      // Center gold band
      const ringCenter = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.04, 6, 18), hammerEdgeMat);
      hammerGroup.add(ringCenter);

      // Long yellow handle
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.4, 8), handleMat);
      handle.position.y = -1.4;
      handle.rotation.z = 0.15;
      hammerGroup.add(handle);
      const grip = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), hammerEdgeMat);
      grip.position.y = -2.6;
      grip.position.x = 0.15 * 2.4;
      hammerGroup.add(grip);

      hammerGroup.position.set(0.8, 3.2, -0.7);
      hammerGroup.rotation.set(-0.25, 0.4, 0.25);
      this.group.add(hammerGroup);
      this._hammer = hammerGroup;

      // ----- Eyelashes -----
      const lashMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
      for (const side of [-1, 1]) {
        const lash = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.03, 0.02), lashMat);
        lash.position.set(side * 0.25, 3.75, 0.68);
        lash.rotation.z = side * 0.15;
        this.group.add(lash);
      }
    }

    // Sticks: add boomerang
    if (charData.name === 'Sticks') {
      const boomMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.7 });
      const boom = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.09, 6, 10, Math.PI * 1.4), boomMat);
      boom.position.set(0.7, 3.0, -0.8);
      boom.rotation.y = 0.4;
      boom.rotation.z = 0.3;
      this.group.add(boom);
      this._boomerang = boom;
    }

    // Knuckles: make bigger
    if (charData.name === 'Knuckles') {
      this.group.scale.setScalar(1.15);
    }
  }

  // Swap in an external GLTF/GLB model. Disables procedural limb
  // animation; the model is animated by simple bobbing + facing.
  setModel(gltfScene) {
    this._externalModel = gltfScene;
    // Hide procedural body parts but keep the spin ball & trail systems
    for (const c of this.group.children) {
      if (c.isMesh) c.visible = false;
    }
    gltfScene.traverse(obj => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    gltfScene.position.set(0, 0.15, 0);
    this.group.add(gltfScene);
    this._limbAnim = false;
  }

  // Emote animations
  playEmote(emote, duration = 1.5) {
    const time = performance.now() * 0.001;
    if (this._emoteTimer) { clearTimeout(this._emoteTimer); this._resetEmote(); }
    this._emote = emote;
    this._emoteStart = time;
    this._emoteTimer = setTimeout(() => { this._resetEmote(); }, duration * 1000);
  }

  _resetEmote() {
    this._emote = null;
    this._emoteStart = 0;
    if (this._armL) { this._armL.rotation.set(0.3, 0, 0.3); this._armR.rotation.set(-0.3, 0, -0.3); }
    if (this._body) { this._body.rotation.x = 0; this._body.scale.set(0.9, 1.1, 0.7); }
  }

  _updateEmote(dt) {
    if (!this._emote) return;
    const t = performance.now() * 0.001 - this._emoteStart;
    const sway = Math.sin(t * 8);
    switch (this._emote) {
      case 'wave':
        this._armR.rotation.x = -Math.PI / 2 + sway * 0.4;
        this._armR.rotation.z = -0.3;
        break;
      case 'dance':
        this.group.rotation.y += dt * 4;
        this._body.scale.y = 1.1 + sway * 0.08;
        this._armL.rotation.z = sway * 0.6;
        this._armR.rotation.z = -sway * 0.6;
        break;
      case 'laugh':
        this._body.scale.y = 1.1 + Math.abs(sway) * 0.15;
        this._body.scale.x = 0.9 - Math.abs(sway) * 0.1;
        break;
      case 'thumbsup':
        this._armR.rotation.x = -Math.PI / 2;
        this._armR.rotation.z = -0.2;
        break;
      case 'bow':
        this._body.rotation.x = Math.sin(t * 4) * 0.8;
        break;
      default:
        this._body.rotation.x = sway * 0.2;
    }
  }
}
