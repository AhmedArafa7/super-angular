// ============================================================
// SONIC BOOM — Third-Person Camera
// Speed-responsive follow camera with dynamic FOV
// ============================================================
// THREE is a global

export class GameCamera {
  constructor(camera) {
    this.camera = camera;
    this.target = new THREE.Vector3();
    this.currentPos = new THREE.Vector3(0, 8, 20);
    this.currentLookAt = new THREE.Vector3();

    // Camera offsets
    this.offsetBehind = 14;
    this.offsetUp = 6;
    this.offsetLookAhead = 8;

    // FOV settings (speed-responsive)
    this.baseFOV = 60;
    this.maxFOV = 85;
    this.currentFOV = this.baseFOV;

    // Smoothing
    this.positionSmoothing = 4.0;
    this.lookAtSmoothing = 8.0;
    this.fovSmoothing = 3.0;

    // Orbit angle (yaw controlled by mouse/touch)
    this.yaw = 0;
    this.pitch = 0.2; // Slight downward angle for heroic perspective
    this.autoRotate = true; // Camera auto-follows player facing

    // Shake
    this._shakeIntensity = 0;
    this._shakeDecay = 5;

    this._initMouseLook();
  }

  _initMouseLook() {
    // Right-click drag to orbit camera
    let dragging = false;
    let lastX = 0, lastY = 0;

    document.addEventListener('mousedown', (e) => {
      if (e.button === 2) { dragging = true; lastX = e.clientX; lastY = e.clientY; }
    });
    document.addEventListener('mouseup', (e) => {
      if (e.button === 2) dragging = false;
    });
    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      this.yaw -= dx * 0.005;
      this.pitch = Math.max(-0.3, Math.min(0.8, this.pitch + dy * 0.003));
      lastX = e.clientX;
      lastY = e.clientY;
      this.autoRotate = false;
      // Resume auto-rotate after 2 seconds of no input
      clearTimeout(this._autoRotateTimer);
      this._autoRotateTimer = setTimeout(() => { this.autoRotate = true; }, 2000);
    });
    document.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  update(playerPos, playerVelocity, speedRatio, facingAngle, dt) {
    // Auto-rotate camera to match player facing
    if (this.autoRotate && (Math.abs(playerVelocity.x) > 2 || Math.abs(playerVelocity.z) > 2)) {
      const targetYaw = Math.atan2(-playerVelocity.x, -playerVelocity.z);
      let diff = targetYaw - this.yaw;
      // Wrap angle difference
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.yaw += diff * 2.5 * dt;
    }

    // Dynamic distance based on speed (pull back at high speed)
    const speedFactor = speedRatio || 0;
    const dynamicBehind = this.offsetBehind + speedFactor * 8;
    const dynamicUp = this.offsetUp + speedFactor * 2;

    // Calculate desired camera position (behind and above player)
    const camX = playerPos.x + Math.sin(this.yaw) * dynamicBehind;
    const camY = playerPos.y + dynamicUp + Math.sin(this.pitch) * 5;
    const camZ = playerPos.z + Math.cos(this.yaw) * dynamicBehind;

    const desiredPos = new THREE.Vector3(camX, camY, camZ);

    // Smooth follow
    this.currentPos.lerp(desiredPos, this.positionSmoothing * dt);

    // Look-ahead target (ahead of player based on velocity)
    const lookAheadX = playerPos.x - Math.sin(this.yaw) * this.offsetLookAhead * speedFactor;
    const lookAheadY = playerPos.y + 2;
    const lookAheadZ = playerPos.z - Math.cos(this.yaw) * this.offsetLookAhead * speedFactor;

    const desiredLookAt = new THREE.Vector3(lookAheadX, lookAheadY, lookAheadZ);
    this.currentLookAt.lerp(desiredLookAt, this.lookAtSmoothing * dt);

    // Camera shake
    let shakeOffset = new THREE.Vector3();
    if (this._shakeIntensity > 0.01) {
      shakeOffset.set(
        (Math.random() - 0.5) * this._shakeIntensity,
        (Math.random() - 0.5) * this._shakeIntensity,
        (Math.random() - 0.5) * this._shakeIntensity
      );
      this._shakeIntensity *= Math.exp(-this._shakeDecay * dt);
    }

    // Apply to camera
    this.camera.position.copy(this.currentPos).add(shakeOffset);
    this.camera.lookAt(this.currentLookAt);

    // Dynamic FOV
    const targetFOV = this.baseFOV + (this.maxFOV - this.baseFOV) * speedFactor;
    this.currentFOV += (targetFOV - this.currentFOV) * this.fovSmoothing * dt;
    this.camera.fov = this.currentFOV;
    this.camera.updateProjectionMatrix();
  }

  // Trigger camera shake (e.g., on enemy hit, landing)
  shake(intensity = 1) {
    this._shakeIntensity = Math.max(this._shakeIntensity, intensity);
  }

  // Get the camera's yaw angle (used by physics to orient movement)
  getYaw() {
    return this.yaw;
  }

  // Set initial position
  setPosition(x, y, z) {
    this.currentPos.set(x, y, z);
    this.camera.position.set(x, y, z);
  }

  // Cinematic intro: sweep from a dramatic angle to behind player
  async playIntro(playerPos, duration = 2) {
    return new Promise((resolve) => {
      const startPos = new THREE.Vector3(
        playerPos.x + 30, playerPos.y + 20, playerPos.z + 30
      );
      this.currentPos.copy(startPos);
      this.camera.position.copy(startPos);

      const startTime = performance.now();
      const animate = () => {
        const elapsed = (performance.now() - startTime) / 1000;
        const t = Math.min(1, elapsed / duration);
        const eased = 1 - Math.pow(1 - t, 3); // Ease-out cubic

        // Smoothly interpolate the yaw
        this.yaw = Math.PI * (1 - eased);

        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };
      animate();
    });
  }
}
