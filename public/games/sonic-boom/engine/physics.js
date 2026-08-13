// ============================================================
// SONIC BOOM — 3D Physics World (Cannon.js)
// Real rigid-body world + true third-person kinematic controller.
// Full 360° movement (WASD/analog), momentum, acceleration, gravity,
// jumping, slope grounding — no more 2D sliding.
// + Spin Dash, Homing Attack, Double Jump, Grind Rails
// ============================================================
// CANNON is a global (cannon.js UMD build loaded via <script> tag)

export class PhysicsEngine {
  constructor() {
    // Rigid-body world
    this.world = new CANNON.World();
    this.world.gravity.set(0, -9.82, 0);
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.allowSleep = true;
    this.world.defaultContactMaterial.friction = 0.02;
    this.world.defaultContactMaterial.restitution = 0;

    // Character tuning
    this.WALK_SPEED = 14;
    this.RUN_SPEED = 45;
    this.SPRINT_SPEED = 68;
    this.GROUND_ACCEL = 55;
    this.AIR_ACCEL = 16;
    this.DAMP_GROUND = 8;
    this.DAMP_AIR = 1.2;
    this.JUMP_FORCE = 13.5;
    this.DOUBLE_JUMP_FORCE = 11;
    this.PLAYER_RADIUS = 0.7;
    this.STEP_DT = 1 / 60;

    // Spin Dash
    this.SPIN_DASH_MAX_CHARGE = 1.5; // seconds to full charge
    this.SPIN_DASH_MIN_SPEED = 40;
    this.SPIN_DASH_MAX_SPEED = 120;
    this._spinDashCharge = 0;
    this._isSpinDashing = false;
    this._spinDashActive = false; // currently in released spin dash

    // Homing Attack
    this.HOMING_SPEED = 60;
    this.HOMING_RANGE = 30;
    this._homingTarget = null;
    this._isHomingAttacking = false;
    this._homingTimer = 0;

    // Double Jump
    this._hasDoubleJumped = false;
    this._coyoteTime = 0; // allows jumping shortly after leaving edge

    this.playerBody = null;
    this.groundBodies = [];
    this._material = new CANNON.Material('player');

    this.grounded = false;
    this.facingAngle = 0;
    this.velocity = { x: 0, y: 0, z: 0 };

    // Ray for ground checks
    this._ray = new CANNON.Ray(new CANNON.Vec3(), new CANNON.Vec3());
    this._ray.mode = CANNON.Ray.CLOSEST;

    this._heightAtFn = null;
  }

  // Create the player rigid body (sphere collider, fixed rotation)
  init(startPos) {
    const groundMat = new CANNON.Material('ground');
    const contact = new CANNON.ContactMaterial(this._material, groundMat, {
      friction: 0.02,
      restitution: 0,
      contactEquationStiffness: 1e8,
      contactEquationRelaxation: 3
    });
    this.world.addContactMaterial(contact);

    this.playerBody = new CANNON.Body({
      mass: 1,
      material: this._material,
      shape: new CANNON.Sphere(this.PLAYER_RADIUS),
      fixedRotation: true,
      linearDamping: 0,
      angularDamping: 1
    });
    if (startPos) {
      this.playerBody.position.set(startPos.x, startPos.y + 1.2, startPos.z);
    }
    this.world.addBody(this.playerBody);
  }

  // Register a static ground collider (heightfield / walls)
  addGroundBody(body) {
    body.type = CANNON.Body.STATIC;
    this.world.addBody(body);
    this.groundBodies.push(body);
  }

  // Sample the highest ground point under the player (for camera & snap)
  getGroundHeight() {
    const p = this.playerBody.position;
    this._ray.from.set(p.x, p.y + 0.3, p.z);
    this._ray.to.set(p.x, p.y - 6, p.z);
    this._ray.intersectBodies(this.groundBodies, this._ray.result);
    const res = this._ray.result;
    return res.hasHit ? p.y - res.distance + this.PLAYER_RADIUS : p.y;
  }

  _groundCheck() {
    const p = this.playerBody.position;
    this._ray.from.set(p.x, p.y + 0.1, p.z);
    this._ray.to.set(p.x, p.y - (this.PLAYER_RADIUS + 0.45), p.z);
    this._ray.intersectBodies(this.groundBodies, this._ray.result);
    const wasGrounded = this.grounded;
    this.grounded = this._ray.result.hasHit;

    // Reset double jump when landing
    if (this.grounded && !wasGrounded) {
      this._hasDoubleJumped = false;
      this._coyoteTime = 0;
    }

    // Coyote time: allow jump briefly after leaving edge
    if (wasGrounded && !this.grounded) {
      this._coyoteTime = 0.12;
    }

    return this._ray.result;
  }

  // Full 360° kinematic third-person controller
  updatePlayer(player, input, cameraYaw, dt) {
    const body = this.playerBody;

    // Coyote time countdown
    if (this._coyoteTime > 0) this._coyoteTime -= dt;

    // ---- SPIN DASH ----
    if (input.spinDashHeld && this.grounded && !this._spinDashActive) {
      this._spinDashCharge = Math.min(this._spinDashCharge + dt, this.SPIN_DASH_MAX_CHARGE);
      this._isSpinDashing = true;
      player.isSpinDashing = true;
      player.spinDashCharge = this._spinDashCharge / this.SPIN_DASH_MAX_CHARGE;
      player.setSpinMode(true);
      // Slow down while charging
      body.velocity.x *= 0.9;
      body.velocity.z *= 0.9;
    }

    if (input.spinDashReleased && this._isSpinDashing) {
      // Release spin dash!
      const chargePct = this._spinDashCharge / this.SPIN_DASH_MAX_CHARGE;
      const speed = this.SPIN_DASH_MIN_SPEED + chargePct * (this.SPIN_DASH_MAX_SPEED - this.SPIN_DASH_MIN_SPEED);
      const dir = player.facing;
      body.velocity.x = dir.x * speed;
      body.velocity.z = dir.z * speed;
      this._spinDashActive = true;
      this._isSpinDashing = false;
      this._spinDashCharge = 0;
      player.spinDashCharge = 0;
      this._spinDashDecay = 1.0;
    }

    // Spin dash active — gradually slow and end
    if (this._spinDashActive) {
      this._spinDashDecay -= dt * 0.8;
      if (this._spinDashDecay <= 0 || Math.hypot(body.velocity.x, body.velocity.z) < 15) {
        this._spinDashActive = false;
        player.isSpinDashing = false;
        player.setSpinMode(false);
      }
    }

    // ---- HOMING ATTACK ----
    if (input.homingAttackJust && !this.grounded && !this._isHomingAttacking) {
      this._isHomingAttacking = true;
      this._homingTimer = 0.5; // max duration
      player.isHomingAttacking = true;
      player.setSpinMode(true);
    }

    if (this._isHomingAttacking) {
      this._homingTimer -= dt;
      if (this._homingTimer <= 0 || this.grounded) {
        this._isHomingAttacking = false;
        player.isHomingAttacking = false;
        player.setSpinMode(false);
        this._homingTarget = null;
      } else if (this._homingTarget) {
        // Dash toward target
        const tx = this._homingTarget.x - body.position.x;
        const ty = this._homingTarget.y - body.position.y;
        const tz = this._homingTarget.z - body.position.z;
        const dist = Math.sqrt(tx * tx + ty * ty + tz * tz);
        if (dist > 0.5) {
          body.velocity.x = (tx / dist) * this.HOMING_SPEED;
          body.velocity.y = (ty / dist) * this.HOMING_SPEED;
          body.velocity.z = (tz / dist) * this.HOMING_SPEED;
        } else {
          // Reached target
          this._isHomingAttacking = false;
          player.isHomingAttacking = false;
          player.setSpinMode(false);
          body.velocity.y = 10; // bounce up
          this._homingTarget = null;
        }
      } else {
        // No target — dash forward
        const dir = player.facing;
        body.velocity.x = dir.x * this.HOMING_SPEED;
        body.velocity.y = -5;
        body.velocity.z = dir.z * this.HOMING_SPEED;
      }
    }

    // Skip normal movement during active spin dash release or homing attack
    const skipMovement = this._spinDashActive || this._isHomingAttacking || this._isSpinDashing;

    if (!skipMovement) {
      // 1. Calculate Camera Vectors (Flattened on Y-axis and normalized)
      const camForward = new THREE.Vector3(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw)).normalize();
      const camRight = new THREE.Vector3(Math.cos(cameraYaw), 0, -Math.sin(cameraYaw)).normalize();

      // 2. Map Inputs to Camera Vectors
      // W/S (Vertical) maps to camForward, A/D (Horizontal) maps to camRight
      const verticalInput = input.moveZ || 0;   // W = +1, S = -1
      const horizontalInput = input.moveX || 0; // D = +1, A = -1

      const targetMovementDirection = new THREE.Vector3();
      targetMovementDirection
        .addScaledVector(camForward, verticalInput)
        .addScaledVector(camRight, horizontalInput);

      let wx = 0, wz = 0;
      if (targetMovementDirection.lengthSq() > 0.0001) {
        targetMovementDirection.normalize();
        wx = targetMovementDirection.x;
        wz = targetMovementDirection.z;

        // 3. Character Rotation (Facing Direction via Quaternion slerp)
        const targetAngle = Math.atan2(wx, wz);
        const targetQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), targetAngle);
        if (player && player.group) {
          player.group.quaternion.slerp(targetQuaternion, Math.min(1.0, 12 * dt));
        }
        this.facingAngle = targetAngle;
      }

      const wantSpeed = input.sprint ? this.SPRINT_SPEED : input.walk ? this.WALK_SPEED : this.RUN_SPEED;
      const accel = this.grounded ? this.GROUND_ACCEL : this.AIR_ACCEL;

      // Accelerate toward target camera-relative movement direction
      body.velocity.x += wx * wantSpeed * accel * dt * 0.1;
      body.velocity.z += wz * wantSpeed * accel * dt * 0.1;

      // Clamp horizontal speed
      const hs = Math.hypot(body.velocity.x, body.velocity.z);
      if (hs > wantSpeed) {
        const s = wantSpeed / hs;
        body.velocity.x *= s;
        body.velocity.z *= s;
      }

      // Slope Physics (gaining speed downhill, losing speed uphill)
      if (this.grounded && this._heightAtFn) {
        const px = body.position.x;
        const pz = body.position.z;
        const fx = Math.sin(this.facingAngle);
        const fz = Math.cos(this.facingAngle);
        const currentH = this._heightAtFn(px, pz);
        const nextH = this._heightAtFn(px + fx * 1.5, pz + fz * 1.5);
        const dh = nextH - currentH;

        if (dh < -0.15) {
          // Downhill momentum acceleration
          const downhillFactor = Math.abs(dh) * 25;
          body.velocity.x += fx * downhillFactor * dt;
          body.velocity.z += fz * downhillFactor * dt;
        } else if (dh > 0.15 && !this._spinDashActive) {
          // Uphill resistance
          const uphillResistance = Math.min(0.5, dh * 0.35);
          body.velocity.x *= (1 - uphillResistance * dt * 4);
          body.velocity.z *= (1 - uphillResistance * dt * 4);
        }
      }

      // Momentum damping when no input
      const damp = input.hasMovement ? 0 : (this.grounded ? this.DAMP_GROUND : this.DAMP_AIR);
      if (damp > 0) {
        const k = Math.max(0, 1 - damp * dt);
        body.velocity.x *= k;
        body.velocity.z *= k;
      }
    }

    // ---- JUMP / DOUBLE JUMP ----
    if (input.jumpJust) {
      const canJump = this.grounded || this._coyoteTime > 0;
      if (canJump) {
        body.velocity.y = this.JUMP_FORCE;
        this.grounded = false;
        this._coyoteTime = 0;
        this._hasDoubleJumped = false;
        player._jumpSound = 'jump';
      } else if (!this._hasDoubleJumped && !this._isHomingAttacking) {
        // Double jump
        body.velocity.y = this.DOUBLE_JUMP_FORCE;
        this._hasDoubleJumped = true;
        player._jumpSound = 'doubleJump';
      }
    }

    // Step the physics world
    this.world.step(this.STEP_DT, dt, 3);

    this._groundCheck();

    // Safety: clamp player above terrain heightfield to prevent falling through
    if (this._heightAtFn) {
      const groundH = this._heightAtFn(body.position.x, body.position.z);
      const minY = groundH + this.PLAYER_RADIUS + 0.1;
      if (body.position.y < minY) {
        body.position.y = minY;
        body.velocity.y = Math.max(body.velocity.y, 0);
      }
    }

    // Smoothly face movement direction
    const speed = Math.hypot(body.velocity.x, body.velocity.z);
    if (speed > 2) {
      const target = Math.atan2(body.velocity.x, body.velocity.z);
      let diff = target - this.facingAngle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.facingAngle += diff * Math.min(1, 12 * dt);
    }

    // ---- Sync back to the visual character ----
    player.position.set(body.position.x, body.position.y - this.PLAYER_RADIUS, body.position.z);
    player.velocity.set(body.velocity.x, body.velocity.y, body.velocity.z);
    player.facingAngle = this.facingAngle;
    player.isGrounded = this.grounded;
    player.facing.set(Math.sin(this.facingAngle), 0, Math.cos(this.facingAngle));
    player.group.rotation.y = this.facingAngle;

    return {
      speed,
      grounded: this.grounded,
      position: player.position
    };
  }

  // Set homing attack target position
  setHomingTarget(pos) {
    this._homingTarget = pos ? { x: pos.x, y: pos.y, z: pos.z } : null;
  }

  // Check if currently in spin dash or homing attack
  isInSpecialMove() {
    return this._spinDashActive || this._isHomingAttacking || this._isSpinDashing;
  }

  get isSpinDashCharging() { return this._isSpinDashing; }
  get isSpinDashActive() { return this._spinDashActive; }
  get isHomingAttacking() { return this._isHomingAttacking; }
}
