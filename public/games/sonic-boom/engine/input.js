// ============================================================
// SONIC BOOM — Input Manager
// Handles keyboard, touch (virtual joystick), and gamepad input
// ============================================================

export class InputManager {
  constructor() {
    this.keys = {};
    this.justPressed = {};
    this.justReleased = {};
    this._prevKeys = {};

    // Touch state
    this.touch = {
      active: false,
      joystick: { x: 0, y: 0, active: false },
      buttons: { jump: false, spinDash: false, homingAttack: false, enerbeam: false, pause: false }
    };

    // Gamepad state
    this.gamepad = { connected: false, axes: [0, 0, 0, 0], buttons: [] };

    // Combined output (normalized)
    this.moveX = 0;
    this.moveZ = 0;
    this.sprint = false;
    this.walk = false;
    this.jumpPressed = false;
    this.jumpJust = false;
    this.spinDashHeld = false;
    this.spinDashReleased = false;
    this.homingAttackJust = false;
    this.enerbeamJust = false;
    this.enerbeamHeld = false;
    this.pauseJust = false;
    this.chatJust = false;
    this.escapeJust = false;

    this._touchIds = {};
    this._joystickOrigin = null;
    this._joystickTouchId = null;

    this._bindEvents();
  }

  _bindEvents() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // Touch events for virtual joystick and buttons
    const canvas = document.getElementById('game-canvas');
    if (canvas) {
      canvas.addEventListener('touchstart', (e) => this._onTouchStart(e), { passive: false });
      canvas.addEventListener('touchmove', (e) => this._onTouchMove(e), { passive: false });
      canvas.addEventListener('touchend', (e) => this._onTouchEnd(e), { passive: false });
      canvas.addEventListener('touchcancel', (e) => this._onTouchEnd(e), { passive: false });
    }
  }

  _onTouchStart(e) {
    e.preventDefault();
    this.touch.active = true;
    const w = window.innerWidth;

    for (const t of e.changedTouches) {
      if (t.clientX < w * 0.4) {
        // Left side — joystick
        this._joystickTouchId = t.identifier;
        this._joystickOrigin = { x: t.clientX, y: t.clientY };
        this.touch.joystick.active = true;
      } else {
        // Right side — action buttons (mapped by Y position)
        const h = window.innerHeight;
        const relY = t.clientY / h;
        this._touchIds[t.identifier] = true;

        if (relY < 0.4) {
          this.touch.buttons.homingAttack = true;
        } else if (relY < 0.6) {
          this.touch.buttons.enerbeam = true;
        } else if (relY < 0.8) {
          this.touch.buttons.jump = true;
        } else {
          this.touch.buttons.spinDash = true;
        }
      }
    }
  }

  _onTouchMove(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === this._joystickTouchId && this._joystickOrigin) {
        const dx = t.clientX - this._joystickOrigin.x;
        const dy = t.clientY - this._joystickOrigin.y;
        const maxDist = 60;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const clamp = Math.min(dist, maxDist) / maxDist;
        const angle = Math.atan2(dy, dx);
        this.touch.joystick.x = Math.cos(angle) * clamp;
        this.touch.joystick.y = Math.sin(angle) * clamp;
      }
    }
  }

  _onTouchEnd(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === this._joystickTouchId) {
        this._joystickTouchId = null;
        this._joystickOrigin = null;
        this.touch.joystick = { x: 0, y: 0, active: false };
      }
      if (this._touchIds[t.identifier]) {
        delete this._touchIds[t.identifier];
        // Reset all touch buttons on release
        this.touch.buttons.jump = false;
        this.touch.buttons.spinDash = false;
        this.touch.buttons.homingAttack = false;
        this.touch.buttons.enerbeam = false;
      }
    }
    if (e.touches.length === 0) {
      this.touch.active = false;
    }
  }

  _pollGamepad() {
    const gp = navigator.getGamepads ? navigator.getGamepads()[0] : null;
    if (!gp) {
      this.gamepad.connected = false;
      return;
    }
    this.gamepad.connected = true;
    this.gamepad.axes = [...gp.axes];
    this.gamepad.buttons = gp.buttons.map(b => ({ pressed: b.pressed, value: b.value }));
  }

  update() {
    this._pollGamepad();

    // Compute justPressed / justReleased
    for (const code in this.keys) {
      this.justPressed[code] = this.keys[code] && !this._prevKeys[code];
      this.justReleased[code] = !this.keys[code] && this._prevKeys[code];
    }
    for (const code in this._prevKeys) {
      if (!(code in this.keys)) {
        this.justReleased[code] = true;
      }
    }

    // --- Movement ---
    let mx = 0, mz = 0;

    // Keyboard
    if (this.keys['KeyW'] || this.keys['ArrowUp']) mz -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) mz += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) mx -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) mx += 1;

    // Touch joystick
    if (this.touch.joystick.active) {
      mx += this.touch.joystick.x;
      mz += this.touch.joystick.y;
    }

    // Gamepad left stick
    if (this.gamepad.connected) {
      const deadzone = 0.15;
      const gx = Math.abs(this.gamepad.axes[0]) > deadzone ? this.gamepad.axes[0] : 0;
      const gz = Math.abs(this.gamepad.axes[1]) > deadzone ? this.gamepad.axes[1] : 0;
      mx += gx;
      mz += gz;
    }

    // Normalize
    const len = Math.sqrt(mx * mx + mz * mz);
    if (len > 1) { mx /= len; mz /= len; }
    this.moveX = mx;
    this.moveZ = mz;

    // --- Actions ---
    const kJump = this.keys['Space'];
    const kSpin = this.keys['ShiftLeft'] || this.keys['ShiftRight'];
    const kHoming = this.keys['KeyQ'];
    const kEnerbeam = this.keys['KeyE'];
    const kPause = this.keys['Escape'];
    const kChat = this.keys['Enter'];

    const tJump = this.touch.buttons.jump;
    const tSpin = this.touch.buttons.spinDash;
    const tHoming = this.touch.buttons.homingAttack;
    const tEnerbeam = this.touch.buttons.enerbeam;

    const gpJump = this.gamepad.connected && this.gamepad.buttons[0]?.pressed;
    const gpSpin = this.gamepad.connected && this.gamepad.buttons[2]?.pressed;
    const gpHoming = this.gamepad.connected && this.gamepad.buttons[1]?.pressed;
    const gpEnerbeam = this.gamepad.connected && this.gamepad.buttons[3]?.pressed;
    const gpPause = this.gamepad.connected && this.gamepad.buttons[9]?.pressed;

    const jumpNow = kJump || tJump || gpJump;
    this.jumpJust = jumpNow && !this._prevJump;
    this.jumpPressed = jumpNow;
    this._prevJump = jumpNow;

    const spinNow = kSpin || tSpin || gpSpin;
    this.spinDashReleased = !spinNow && this._prevSpin;
    this.spinDashHeld = spinNow;
    this._prevSpin = spinNow;

    const homingNow = kHoming || tHoming || gpHoming;
    this.homingAttackJust = homingNow && !this._prevHoming;
    this._prevHoming = homingNow;

    const enerbeamNow = kEnerbeam || tEnerbeam || gpEnerbeam;
    this.enerbeamJust = enerbeamNow && !this._prevEnerbeam;
    this.enerbeamHeld = enerbeamNow;
    this._prevEnerbeam = enerbeamNow;

    const pauseNow = kPause || gpPause;
    this.pauseJust = pauseNow && !this._prevPause;
    this._prevPause = pauseNow;

    const chatNow = kChat;
    this.chatJust = chatNow && !this._prevChat;
    this._prevChat = chatNow;

    this.sprint = this.keys['KeyR'] || this.gamepad.connected && this.gamepad.buttons[7]?.pressed;
    this.walk = this.keys['KeyC'] || this.gamepad.connected && this.gamepad.buttons[5]?.pressed;

    this.escapeJust = this.justPressed['Escape']; // for exiting chat

    // Save prev keys
    this._prevKeys = { ...this.keys };
  }

  // Check if any movement input is active
  get hasMovement() {
    return Math.abs(this.moveX) > 0.01 || Math.abs(this.moveZ) > 0.01;
  }

  // Get movement angle in radians (relative to camera)
  getMovementAngle() {
    return Math.atan2(this.moveX, -this.moveZ);
  }

  // Get movement magnitude (0-1)
  getMovementMagnitude() {
    return Math.min(1, Math.sqrt(this.moveX * this.moveX + this.moveZ * this.moveZ));
  }
}
