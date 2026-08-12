// ============================================================
// SONIC BOOM — Procedural Audio Engine (Web Audio API)
// All sounds generated procedurally — no audio file dependencies
// ============================================================

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.volumes = { master: 0.7, music: 0.4, sfx: 0.8 };
    this._initialized = false;
    this._musicOsc = null;
    this._musicPlaying = false;
  }

  init() {
    if (this._initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volumes.master;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.volumes.sfx;
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.volumes.music;
      this.musicGain.connect(this.masterGain);

      this._initialized = true;
    } catch (e) {
      console.warn('[Audio] Web Audio not available:', e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  setVolume(channel, value) {
    this.volumes[channel] = Math.max(0, Math.min(1, value));
    if (channel === 'master' && this.masterGain) this.masterGain.gain.value = this.volumes.master;
    if (channel === 'sfx' && this.sfxGain) this.sfxGain.gain.value = this.volumes.sfx;
    if (channel === 'music' && this.musicGain) this.musicGain.gain.value = this.volumes.music;
  }

  // ---- Sound Effects ----

  playRingCollect() {
    if (!this._initialized) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(2400, t + 0.06);
    osc.frequency.exponentialRampToValueAtTime(1800, t + 0.12);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  playJump() {
    if (!this._initialized) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(900, t + 0.12);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  playDoubleJump() {
    if (!this._initialized) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(500, t);
    osc.frequency.exponentialRampToValueAtTime(1500, t + 0.1);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  playSpinDashCharge() {
    if (!this._initialized) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.linearRampToValueAtTime(600, t + 0.8);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.linearRampToValueAtTime(0.25, t + 0.8);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.85);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.85);
    this._spinChargeOsc = { osc, gain };
  }

  stopSpinDashCharge() {
    if (this._spinChargeOsc) {
      try {
        this._spinChargeOsc.osc.stop();
        this._spinChargeOsc.gain.disconnect();
      } catch (e) {}
      this._spinChargeOsc = null;
    }
  }

  playSpinDashRelease() {
    if (!this._initialized) return;
    this.stopSpinDashCharge();
    const t = this.ctx.currentTime;
    // Whoosh
    const noise = this._createNoise(0.25);
    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(2000, t);
    bandpass.frequency.exponentialRampToValueAtTime(500, t + 0.25);
    bandpass.Q.value = 2;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
    noise.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(t);
    noise.stop(t + 0.3);
  }

  playHomingAttack() {
    if (!this._initialized) return;
    const t = this.ctx.currentTime;
    // Quick ascending chirp
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(2000, t + 0.08);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.15);
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.18);
    // Hit impact
    const noise = this._createNoise(0.1);
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.15, t + 0.08);
    nGain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
    noise.connect(nGain);
    nGain.connect(this.sfxGain);
    noise.start(t + 0.08);
    noise.stop(t + 0.2);
  }

  playDamage() {
    if (!this._initialized) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.3);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.35);
  }

  playEnemyDestroy() {
    if (!this._initialized) return;
    const t = this.ctx.currentTime;
    // Explosion crunch
    const noise = this._createNoise(0.3);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3000, t);
    filter.frequency.exponentialRampToValueAtTime(200, t + 0.3);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(t);
    noise.stop(t + 0.35);
    // Tonal pop
    const osc = this.ctx.createOscillator();
    const oGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.2);
    oGain.gain.setValueAtTime(0.2, t);
    oGain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
    osc.connect(oGain);
    oGain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.25);
  }

  playCheckpoint() {
    if (!this._initialized) return;
    const t = this.ctx.currentTime;
    const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t + i * 0.1);
      gain.gain.linearRampToValueAtTime(0.2, t + i * 0.1 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, t + i * 0.1 + 0.15);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + i * 0.1);
      osc.stop(t + i * 0.1 + 0.2);
    });
  }

  playBoostPad() {
    if (!this._initialized) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(1200, t + 0.15);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  playGameOver() {
    if (!this._initialized) return;
    const t = this.ctx.currentTime;
    const notes = [523, 440, 349, 262]; // C5 A4 F4 C4 descending
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t + i * 0.25);
      gain.gain.linearRampToValueAtTime(0.2, t + i * 0.25 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, t + i * 0.25 + 0.3);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + i * 0.25);
      osc.stop(t + i * 0.25 + 0.35);
    });
  }

  playLevelComplete() {
    if (!this._initialized) return;
    const t = this.ctx.currentTime;
    const notes = [523, 659, 784, 1047, 1319, 1568]; // C E G C E G ascending
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.18, t + i * 0.12 + 0.03);
      gain.gain.linearRampToValueAtTime(0.15, t + i * 0.12 + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, t + i * 0.12 + 0.25);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + i * 0.12);
      osc.stop(t + i * 0.12 + 0.3);
    });
  }

  playGrindRail() {
    if (!this._initialized) return;
    if (this._grindOsc) return; // already playing
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 120;
    gain.gain.value = 0.08;
    // Add wobble via LFO
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 8;
    lfoGain.gain.value = 30;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfo.start(t);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    this._grindOsc = { osc, gain, lfo, lfoGain };
  }

  stopGrindRail() {
    if (!this._grindOsc) return;
    try {
      this._grindOsc.osc.stop();
      this._grindOsc.lfo.stop();
      this._grindOsc.gain.disconnect();
      this._grindOsc.lfoGain.disconnect();
    } catch (e) {}
    this._grindOsc = null;
  }

  playEnerbeam() {
    if (!this._initialized) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.linearRampToValueAtTime(600, t + 0.1);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  playBossAppear() {
    if (!this._initialized) return;
    const t = this.ctx.currentTime;
    // Ominous descending tone
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 1.5);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.linearRampToValueAtTime(0.25, t + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 1.6);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 1.6);
    // Sub bass rumble
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.value = 40;
    subGain.gain.setValueAtTime(0.15, t);
    subGain.gain.exponentialRampToValueAtTime(0.01, t + 1.5);
    sub.connect(subGain);
    subGain.connect(this.sfxGain);
    sub.start(t);
    sub.stop(t + 1.5);
  }

  playBossDefeat() {
    if (!this._initialized) return;
    const t = this.ctx.currentTime;
    // Big explosion
    for (let i = 0; i < 5; i++) {
      const noise = this._createNoise(0.4);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(4000 - i * 600, t + i * 0.15);
      filter.frequency.exponentialRampToValueAtTime(100, t + i * 0.15 + 0.4);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.25 - i * 0.03, t + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.01, t + i * 0.15 + 0.45);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      noise.start(t + i * 0.15);
      noise.stop(t + i * 0.15 + 0.5);
    }
  }

  // Ambient wind
  startAmbient() {
    if (!this._initialized || this._ambientNoise) return;
    const noise = this._createNoise(999);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    filter.Q.value = 0.5;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.03;
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    noise.start();
    this._ambientNoise = { noise, filter, gain };
  }

  stopAmbient() {
    if (this._ambientNoise) {
      try { this._ambientNoise.noise.stop(); } catch (e) {}
      this._ambientNoise.gain.disconnect();
      this._ambientNoise = null;
    }
  }

  // Update wind pitch based on speed (call each frame)
  updateSpeedWind(speedRatio) {
    if (!this._ambientNoise) return;
    const freq = 400 + speedRatio * 2000;
    const vol = 0.03 + speedRatio * 0.08;
    this._ambientNoise.filter.frequency.value = freq;
    this._ambientNoise.gain.gain.value = vol;
  }

  // ---- Utility ----

  _createNoise(duration) {
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    return source;
  }

  destroy() {
    this.stopGrindRail();
    this.stopSpinDashCharge();
    this.stopAmbient();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this._initialized = false;
  }
}
