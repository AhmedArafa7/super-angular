/**
 * Toxic Butterfly: Bear Hunt (صائد الفراشات السامة 🐻🦋☠️)
 * A reflex & observation game where a detective bear identifies and nets
 * the erratic, toxic venom-emitting butterfly among peaceful meadow butterflies.
 */

(function() {
    'use strict';

    // ==========================================
    // AUDIO SYNTHESIZER (Web Audio API)
    // ==========================================
    class SoundEngine {
        constructor() {
            this.ctx = null;
            this.enabled = localStorage.getItem('tb_sound_enabled') !== 'false';
        }

        init() {
            if (!this.ctx) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (AudioContext) {
                    this.ctx = new AudioContext();
                }
            }
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        }

        toggle() {
            this.enabled = !this.enabled;
            localStorage.setItem('tb_sound_enabled', this.enabled ? 'true' : 'false');
            return this.enabled;
        }

        play(name) {
            if (!this.enabled) return;
            this.init();
            if (!this.ctx) return;

            // Also notify parent iframe if supported
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({ type: 'AUDIO_PLAY_SFX', volume: 0.7 }, '*');
            }

            const now = this.ctx.currentTime;
            try {
                if (name === 'swing') {
                    // Net swing swoosh
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(400, now);
                    osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);
                    gain.gain.setValueAtTime(0.3, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.15);
                } else if (name === 'toxicCatch') {
                    // Triumphant chime / catch
                    const freqs = [523.25, 659.25, 783.99, 1046.50];
                    freqs.forEach((f, i) => {
                        const osc = this.ctx.createOscillator();
                        const gain = this.ctx.createGain();
                        osc.type = 'triangle';
                        osc.frequency.setValueAtTime(f, now + i * 0.06);
                        gain.gain.setValueAtTime(0.25, now + i * 0.06);
                        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.25);
                        osc.connect(gain);
                        gain.connect(this.ctx.destination);
                        osc.start(now + i * 0.06);
                        osc.stop(now + i * 0.06 + 0.25);
                    });
                } else if (name === 'wrongCatch') {
                    // Buzzer / error
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(140, now);
                    osc.frequency.linearRampToValueAtTime(90, now + 0.25);
                    gain.gain.setValueAtTime(0.3, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.25);
                } else if (name === 'toxicZap') {
                    // Weird flutter glitch
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(600, now);
                    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08);
                    gain.gain.setValueAtTime(0.08, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.08);
                }
            } catch (e) {
                console.warn('Audio play error:', e);
            }
        }
    }

    const sound = new SoundEngine();

    // ==========================================
    // BEAR CHARACTERS & SKINS
    // ==========================================
    const BEAR_SKINS = [
        { id: 'bruno', name: 'الدب برونو المحقق', emoji: '🐻', bodyColor: '#8B4513', snoutColor: '#D2B48C', hatColor: '#4A3728', accessory: 'red_bow' },
        { id: 'polar', name: 'دب الجليد القطبي', emoji: '🐻‍❄️', bodyColor: '#F0F8FF', snoutColor: '#E2E8F0', hatColor: '#38BDF8', accessory: 'blue_scarf' },
        { id: 'panda', name: 'بامبو كونغ فو باندا', emoji: '🐼', bodyColor: '#FFFFFF', snoutColor: '#0F172A', hatColor: '#10B981', accessory: 'panda_ears' },
        { id: 'honey', name: 'دب العسل الذهبي', emoji: '🍯', bodyColor: '#D97706', snoutColor: '#FDE68A', hatColor: '#F59E0B', accessory: 'honey_pot' },
        { id: 'koala', name: 'كوالا الغابة الحكيم', emoji: '🐨', bodyColor: '#64748B', snoutColor: '#CBD5E1', hatColor: '#059669', accessory: 'green_leaf' },
        { id: 'shadow', name: 'دب الظل النيون', emoji: '🔮', bodyColor: '#311042', snoutColor: '#6B21A8', hatColor: '#A855F7', accessory: 'neon_aura' }
    ];

    // ==========================================
    // BUTTERFLY CLASSES
    // ==========================================
    class Butterfly {
        constructor(isToxic, wave = 1) {
            this.isToxic = isToxic;
            this.wave = wave;
            this.x = Math.random() * (window.innerWidth - 160) + 80;
            this.y = Math.random() * (window.innerHeight - 260) + 70;
            this.size = isToxic ? 34 : 28;
            this.baseSpeed = (isToxic ? 2.6 : 1.8) + wave * 0.18;
            this.vx = (Math.random() - 0.5) * this.baseSpeed * 2;
            this.vy = (Math.random() - 0.5) * this.baseSpeed * 2;
            
            // Flutter animation state
            this.flapPhase = Math.random() * Math.PI * 2;
            this.flapSpeed = isToxic ? 0.35 : 0.22;
            this.wingSpread = 1;
            this.angle = Math.atan2(this.vy, this.vx);

            // Normal butterfly aesthetics
            const normalPalettes = [
                { top: '#38bdf8', bottom: '#0284c7', glow: 'rgba(56, 189, 248, 0.4)' },
                { top: '#fbbf24', bottom: '#d97706', glow: 'rgba(251, 191, 36, 0.4)' },
                { top: '#f472b6', bottom: '#db2777', glow: 'rgba(244, 114, 182, 0.4)' },
                { top: '#34d399', bottom: '#059669', glow: 'rgba(52, 211, 153, 0.4)' },
                { top: '#fb923c', bottom: '#ea580c', glow: 'rgba(251, 146, 60, 0.4)' }
            ];
            this.palette = normalPalettes[Math.floor(Math.random() * normalPalettes.length)];

            // Toxic Butterfly specific mechanics (as requested by user)
            // "بتقعد تعمل حركات غريبة، تقعد تطلع حاجات، تعمل كدا..."
            this.toxicTimer = 0;
            this.toxicState = 'normal'; // 'normal', 'twitching', 'spitting', 'spinning'
            this.toxicStateDuration = 0;
            this.weirdPuffs = []; // Weird emitted things
            this.sparks = [];
            this.twitchOffset = { x: 0, y: 0 };
        }

        update(width, height) {
            this.flapPhase += this.flapSpeed;
            this.wingSpread = Math.cos(this.flapPhase);

            if (!this.isToxic) {
                // Smooth, graceful, natural flight pattern
                this.x += this.vx + Math.sin(this.flapPhase * 0.5) * 0.8;
                this.y += this.vy + Math.cos(this.flapPhase * 0.3) * 0.6;
                this.angle = Math.atan2(this.vy, this.vx);
            } else {
                // Toxic Butterfly: Erratic movements & weird emissions!
                this.toxicTimer += 0.016;

                if (this.toxicState === 'normal') {
                    // Normal-ish movement with subtle jitter
                    this.x += this.vx;
                    this.y += this.vy;
                    this.angle = Math.atan2(this.vy, this.vx);

                    // Chance to trigger weird toxic behaviors
                    if (this.toxicTimer > 1.8 + Math.random() * 1.5) {
                        this.toxicTimer = 0;
                        const actions = ['twitching', 'spitting', 'spinning'];
                        this.toxicState = actions[Math.floor(Math.random() * actions.length)];
                        this.toxicStateDuration = 0.6 + Math.random() * 0.6;
                        sound.play('toxicZap');
                    }
                } else if (this.toxicState === 'twitching') {
                    // Wild rapid twitching & jitter in place
                    this.twitchOffset.x = (Math.random() - 0.5) * 16;
                    this.twitchOffset.y = (Math.random() - 0.5) * 16;
                    this.x += this.vx * 0.2 + this.twitchOffset.x;
                    this.y += this.vy * 0.2 + this.twitchOffset.y;
                    this.flapSpeed = 0.65; // Rapid spastic wing flap

                    // Emit electric sparks
                    if (Math.random() < 0.4) {
                        this.sparks.push({
                            x: this.x,
                            y: this.y,
                            vx: (Math.random() - 0.5) * 4,
                            vy: (Math.random() - 0.5) * 4,
                            life: 1.0,
                            color: Math.random() < 0.5 ? '#a855f7' : '#22c55e'
                        });
                    }

                    this.toxicStateDuration -= 0.016;
                    if (this.toxicStateDuration <= 0) {
                        this.toxicState = 'normal';
                        this.flapSpeed = 0.35;
                        this.twitchOffset = { x: 0, y: 0 };
                        // Sharp velocity direction shift after twitching
                        this.vx = (Math.random() - 0.5) * this.baseSpeed * 2.5;
                        this.vy = (Math.random() - 0.5) * this.baseSpeed * 2.5;
                    }
                } else if (this.toxicState === 'spitting') {
                    // "تقعد تطلع حاجات": Spits glowing purple/green toxic puffs & droplets!
                    this.x += this.vx * 0.5;
                    this.y += this.vy * 0.5;

                    if (Math.random() < 0.35) {
                        this.weirdPuffs.push({
                            x: this.x,
                            y: this.y,
                            vx: (Math.random() - 0.5) * 1.5,
                            vy: Math.random() * 2 + 0.5, // Drips downward
                            radius: 6 + Math.random() * 8,
                            life: 1.0,
                            type: Math.random() < 0.5 ? 'cloud' : 'droplet'
                        });
                    }

                    this.toxicStateDuration -= 0.016;
                    if (this.toxicStateDuration <= 0) {
                        this.toxicState = 'normal';
                    }
                } else if (this.toxicState === 'spinning') {
                    // Weird 360-degree looping spin
                    this.angle += 0.35;
                    this.x += Math.cos(this.angle) * (this.baseSpeed * 2);
                    this.y += Math.sin(this.angle) * (this.baseSpeed * 2);

                    this.toxicStateDuration -= 0.016;
                    if (this.toxicStateDuration <= 0) {
                        this.toxicState = 'normal';
                    }
                }

                // Update weird puffs
                for (let i = this.weirdPuffs.length - 1; i >= 0; i--) {
                    const p = this.weirdPuffs[i];
                    p.x += p.vx;
                    p.y += p.vy;
                    p.radius += 0.25;
                    p.life -= 0.025;
                    if (p.life <= 0) this.weirdPuffs.splice(i, 1);
                }

                // Update sparks
                for (let i = this.sparks.length - 1; i >= 0; i--) {
                    const s = this.sparks[i];
                    s.x += s.vx;
                    s.y += s.vy;
                    s.life -= 0.05;
                    if (s.life <= 0) this.sparks.splice(i, 1);
                }
            }

            // Screen boundary rebound with smooth turn
            const margin = 50;
            if (this.x < margin) { this.x = margin; this.vx = Math.abs(this.vx); }
            if (this.x > width - margin) { this.x = width - margin; this.vx = -Math.abs(this.vx); }
            if (this.y < margin + 60) { this.y = margin + 60; this.vy = Math.abs(this.vy); }
            if (this.y > height - 120) { this.y = height - 120; this.vy = -Math.abs(this.vy); }
        }

        draw(ctx) {
            ctx.save();

            // Draw weird puffs and sparks first (behind butterfly)
            if (this.isToxic) {
                // Draw toxic puffs ("تطلع حاجات")
                this.weirdPuffs.forEach(p => {
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                    const grad = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, p.radius);
                    if (p.type === 'cloud') {
                        grad.addColorStop(0, `rgba(168, 85, 247, ${p.life * 0.8})`);
                        grad.addColorStop(1, `rgba(34, 197, 94, 0)`);
                    } else {
                        grad.addColorStop(0, `rgba(74, 222, 128, ${p.life * 0.9})`);
                        grad.addColorStop(1, `rgba(147, 51, 234, 0)`);
                    }
                    ctx.fillStyle = grad;
                    ctx.fill();
                    ctx.restore();
                });

                // Draw sparks
                this.sparks.forEach(s => {
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(s.x, s.y, 3 * s.life, 0, Math.PI * 2);
                    ctx.fillStyle = s.color;
                    ctx.shadowColor = s.color;
                    ctx.shadowBlur = 8;
                    ctx.fill();
                    ctx.restore();
                });
            }

            // Transform to butterfly position and orientation
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle + Math.PI / 2);

            const scaleX = Math.max(0.15, Math.abs(this.wingSpread));
            const size = this.size;

            if (this.isToxic) {
                // Pulsating toxic venom aura
                const pulse = Math.sin(Date.now() * 0.008) * 0.3 + 0.7;
                ctx.shadowColor = '#a855f7';
                ctx.shadowBlur = 18 * pulse;

                // Left Wing (Toxic Neon Purple & Toxic Lime Green)
                ctx.save();
                ctx.scale(-scaleX, 1);
                this.drawToxicWing(ctx, size);
                ctx.restore();

                // Right Wing
                ctx.save();
                ctx.scale(scaleX, 1);
                this.drawToxicWing(ctx, size);
                ctx.restore();

                // Toxic Body
                ctx.fillStyle = '#1e1b4b';
                ctx.beginPath();
                ctx.ellipse(0, 0, 3.5, size * 0.55, 0, 0, Math.PI * 2);
                ctx.fill();

                // Glowing toxic venom eye
                ctx.fillStyle = '#4ade80';
                ctx.beginPath();
                ctx.arc(-2, -size * 0.45, 1.8, 0, Math.PI * 2);
                ctx.arc(2, -size * 0.45, 1.8, 0, Math.PI * 2);
                ctx.fill();

            } else {
                // Normal Harmless Peaceful Butterfly
                ctx.shadowColor = this.palette.glow;
                ctx.shadowBlur = 10;

                // Left Wing
                ctx.save();
                ctx.scale(-scaleX, 1);
                this.drawNormalWing(ctx, size, this.palette);
                ctx.restore();

                // Right Wing
                ctx.save();
                ctx.scale(scaleX, 1);
                this.drawNormalWing(ctx, size, this.palette);
                ctx.restore();

                // Gentle Butterfly Body
                ctx.fillStyle = '#1e293b';
                ctx.beginPath();
                ctx.ellipse(0, 0, 3, size * 0.5, 0, 0, Math.PI * 2);
                ctx.fill();

                // Delicate antennae
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(-1, -size * 0.45);
                ctx.quadraticCurveTo(-6, -size * 0.7, -9, -size * 0.65);
                ctx.moveTo(1, -size * 0.45);
                ctx.quadraticCurveTo(6, -size * 0.7, 9, -size * 0.65);
                ctx.stroke();
            }

            ctx.restore();
        }

        drawNormalWing(ctx, size, palette) {
            // Upper Wing
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(size * 0.8, -size * 0.8, size * 1.3, -size * 0.4, size * 0.9, size * 0.2);
            ctx.bezierCurveTo(size * 0.5, size * 0.3, size * 0.2, size * 0.1, 0, 0);
            const gradTop = ctx.createLinearGradient(0, -size * 0.6, size, size * 0.2);
            gradTop.addColorStop(0, palette.top);
            gradTop.addColorStop(1, palette.bottom);
            ctx.fillStyle = gradTop;
            ctx.fill();

            // Lower Wing
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(size * 0.5, size * 0.2, size * 0.9, size * 0.7, size * 0.4, size * 0.85);
            ctx.bezierCurveTo(size * 0.1, size * 0.9, 0, size * 0.4, 0, 0);
            ctx.fillStyle = palette.bottom;
            ctx.fill();

            // Subtle wing details
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 0.8;
            ctx.stroke();
        }

        drawToxicWing(ctx, size) {
            // Jagged, exotic, eerie toxic moth wing
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(size * 0.9, -size * 1.1, size * 1.5, -size * 0.5, size * 1.1, size * 0.3);
            ctx.lineTo(size * 0.8, size * 0.1);
            ctx.bezierCurveTo(size * 0.6, size * 0.5, size * 0.2, size * 0.2, 0, 0);
            const grad = ctx.createLinearGradient(0, -size * 0.8, size * 1.2, size * 0.4);
            grad.addColorStop(0, '#a855f7');
            grad.addColorStop(0.5, '#4ade80');
            grad.addColorStop(1, '#1e1b4b');
            ctx.fillStyle = grad;
            ctx.fill();

            // Toxic veins (spider-like neon veins)
            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(size * 0.8, -size * 0.6);
            ctx.moveTo(0, 0);
            ctx.lineTo(size * 0.9, -size * 0.1);
            ctx.stroke();

            // Spiky lower wing
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(size * 0.6, size * 0.3, size * 1.1, size * 0.9, size * 0.5, size * 1.1);
            ctx.bezierCurveTo(size * 0.1, size * 0.8, 0, size * 0.4, 0, 0);
            ctx.fillStyle = '#6b21a8';
            ctx.fill();
            ctx.strokeStyle = '#a855f7';
            ctx.stroke();
        }
    }

    // ==========================================
    // BEAR DETECTIVE PLAYER CLASS
    // ==========================================
    class DetectiveBear {
        constructor(skin = BEAR_SKINS[0]) {
            this.setSkin(skin);
            this.x = window.innerWidth / 2;
            this.y = window.innerHeight - 120;
            this.targetX = this.x;
            this.targetY = this.y;
            this.size = 55;
            this.facingRight = true;

            // Net swing animation
            this.isSwinging = false;
            this.swingProgress = 0;
            this.swingRadius = 90;
            this.swingCooldown = 0;

            // Reaction states: 'idle', 'happy', 'dizzy'
            this.reaction = 'idle';
            this.reactionTimer = 0;
        }

        setSkin(skin) {
            this.skin = skin || BEAR_SKINS[0];
        }

        swing() {
            if (this.swingCooldown > 0) return false;
            this.isSwinging = true;
            this.swingProgress = 0;
            this.swingCooldown = 0.28; // Cooldown between swings
            sound.play('swing');
            return true;
        }

        setReaction(type) {
            this.reaction = type;
            this.reactionTimer = 0.8;
        }

        update(dt) {
            if (this.swingCooldown > 0) this.swingCooldown -= dt;

            // Smooth interpolation to target position
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            this.x += dx * 0.2;
            this.y += dy * 0.2;

            if (Math.abs(dx) > 2) {
                this.facingRight = dx > 0;
            }

            if (this.isSwinging) {
                this.swingProgress += dt * 5;
                if (this.swingProgress >= 1) {
                    this.isSwinging = false;
                    this.swingProgress = 0;
                }
            }

            if (this.reactionTimer > 0) {
                this.reactionTimer -= dt;
                if (this.reactionTimer <= 0) this.reaction = 'idle';
            }
        }

        draw(ctx) {
            ctx.save();
            ctx.translate(this.x, this.y);

            // Flip horizontally if facing left
            if (!this.facingRight) {
                ctx.scale(-1, 1);
            }

            const bounce = Math.sin(Date.now() * 0.006) * 3;
            const skin = this.skin;

            // Draw Detective Bear Body
            // 1. Shadow underneath
            ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
            ctx.beginPath();
            ctx.ellipse(0, this.size * 0.7, this.size * 0.6, 12, 0, 0, Math.PI * 2);
            ctx.fill();

            // 2. Ears
            ctx.fillStyle = skin.bodyColor;
            ctx.beginPath();
            ctx.arc(-22, -32 + bounce, 12, 0, Math.PI * 2);
            ctx.arc(22, -32 + bounce, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = skin.snoutColor;
            ctx.beginPath();
            ctx.arc(-22, -32 + bounce, 6, 0, Math.PI * 2);
            ctx.arc(22, -32 + bounce, 6, 0, Math.PI * 2);
            ctx.fill();

            // 3. Main Head & Body
            ctx.fillStyle = skin.bodyColor;
            ctx.beginPath();
            // Body
            ctx.ellipse(0, 18 + bounce, 30, 26, 0, 0, Math.PI * 2);
            // Head
            ctx.arc(0, -12 + bounce, 28, 0, Math.PI * 2);
            ctx.fill();

            // 4. Snout & Cute Nose
            ctx.fillStyle = skin.snoutColor;
            ctx.beginPath();
            ctx.ellipse(6, -6 + bounce, 14, 11, 0, 0, Math.PI * 2);
            ctx.fill();

            // Black nose
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.ellipse(8, -10 + bounce, 6, 4, 0, 0, Math.PI * 2);
            ctx.fill();

            // Smile
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(6, -3 + bounce, 5, 0.2, Math.PI * 0.8);
            ctx.stroke();

            // 5. Eyes (Eyes blink or react)
            if (this.reaction === 'dizzy') {
                // Dizzy X eyes
                ctx.strokeStyle = '#0f172a';
                ctx.lineWidth = 2;
                [-6, 14].forEach(ex => {
                    ctx.beginPath();
                    ctx.moveTo(ex - 3, -17 + bounce); ctx.lineTo(ex + 3, -11 + bounce);
                    ctx.moveTo(ex + 3, -17 + bounce); ctx.lineTo(ex - 3, -11 + bounce);
                    ctx.stroke();
                });
            } else {
                ctx.fillStyle = '#0f172a';
                ctx.beginPath();
                ctx.arc(-4, -14 + bounce, 3.5, 0, Math.PI * 2);
                ctx.arc(14, -14 + bounce, 3.5, 0, Math.PI * 2);
                ctx.fill();
                // Eye glint
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(-3, -15 + bounce, 1.2, 0, Math.PI * 2);
                ctx.arc(15, -15 + bounce, 1.2, 0, Math.PI * 2);
                ctx.fill();
            }

            // 6. Detective Hat
            ctx.fillStyle = skin.hatColor;
            ctx.beginPath();
            ctx.ellipse(0, -32 + bounce, 24, 7, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(0, -38 + bounce, 18, Math.PI, 0);
            ctx.fill();

            // Hat rim ribbon
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, -34 + bounce, 18, Math.PI * 0.95, Math.PI * 0.05, true);
            ctx.stroke();

            // 7. Butterfly Catching Net (Swings with physics)
            ctx.save();
            ctx.translate(18, 5 + bounce);

            let swingAngle = -0.4;
            if (this.isSwinging) {
                // Dynamic swing swoosh curve
                swingAngle = -0.4 + Math.sin(this.swingProgress * Math.PI) * 1.8;
            }
            ctx.rotate(swingAngle);

            // Wooden pole
            ctx.strokeStyle = '#78350f';
            ctx.lineWidth = 5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(0, 10);
            ctx.lineTo(25, -60);
            ctx.stroke();

            // Net ring
            ctx.strokeStyle = '#d97706';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.ellipse(32, -75, 20, 24, 0.4, 0, Math.PI * 2);
            ctx.stroke();

            // Net mesh
            ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.beginPath();
            ctx.ellipse(32, -75, 18, 22, 0.4, 0, Math.PI * 2);
            ctx.fill();

            // Net mesh lines
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(20, -85); ctx.lineTo(44, -65);
            ctx.moveTo(20, -65); ctx.lineTo(44, -85);
            ctx.stroke();

            ctx.restore();

            // 8. Visual Swing Trail Effect
            if (this.isSwinging) {
                ctx.save();
                ctx.strokeStyle = 'rgba(52, 211, 153, 0.6)';
                ctx.lineWidth = 16;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.arc(20, -30 + bounce, 75, -0.6, swingAngle, false);
                ctx.stroke();
                ctx.restore();
            }

            ctx.restore();
        }

        // Net hit-test box in world coordinates
        getNetCatchZone() {
            const netDist = 70;
            const netAngle = this.facingRight ? -0.4 : Math.PI + 0.4;
            return {
                x: this.x + (this.facingRight ? 45 : -45),
                y: this.y - 45,
                radius: 48
            };
        }
    }

    // ==========================================
    // MAIN GAME CONTROLLER & STANDARDIZED MODES
    // ==========================================
    class ToxicButterflyGame {
        constructor() {
            this.canvas = document.getElementById('game-canvas');
            this.ctx = this.canvas.getContext('2d');
            this.resize();

            // State
            this.state = 'start'; // 'start', 'playing', 'paused', 'gameover'
            this.mode = 'quick'; // 'quick', 'local', 'private', 'pro'
            this.score = 0;
            this.level = 1;
            this.lives = 3;
            this.roundTime = 30; // seconds per wave/round
            this.timeRemaining = 30;
            this.combo = 0;
            this.maxCombo = 0;
            this.toxicCaughtCount = 0;
            this.innocentSparedCount = 0;

            // Entities
            this.bear = new DetectiveBear();
            this.butterflies = [];
            this.particles = [];

            // Local Multiplayer (4 to 6 players)
            this.localPlayerCount = 6;
            this.localPlayers = [];
            this.currentLocalPlayerIdx = 0;

            // Networking (P2P Room)
            this.peer = null;
            this.conn = null;
            this.roomCode = '';
            this.isHost = false;

            // Audio & Controls
            this.setupEvents();
            this.initLocalPlayers(6);
            this.loadStats();

            // Check URL parameters for direct mode launch
            this.checkUrlParams();

            // Start animation loop
            this.lastFrameTime = performance.now();
            requestAnimationFrame((t) => this.gameLoop(t));
        }

        resize() {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            if (this.bear) {
                this.bear.x = Math.min(this.bear.x, this.canvas.width - 60);
                this.bear.y = Math.min(this.bear.y, this.canvas.height - 80);
            }
        }

        checkUrlParams() {
            const params = new URLSearchParams(window.location.search);
            const modeParam = params.get('mode');
            const roomParam = params.get('room');
            const roleParam = params.get('role');

            if (modeParam === 'local') {
                this.openLocalModal();
            } else if (modeParam === 'private' && roomParam) {
                this.roomCode = roomParam.toUpperCase();
                if (roleParam === 'host') {
                    this.startHostingRoom(this.roomCode);
                } else {
                    this.joinP2PRoom(this.roomCode);
                }
            } else if (modeParam === 'pro') {
                this.triggerProMatchmaking();
            }
        }

        loadStats() {
            try {
                this.highScore = parseInt(localStorage.getItem('tb_high_score') || '0', 10);
            } catch (e) {
                this.highScore = 0;
            }
            const el = document.getElementById('high-score');
            if (el) el.textContent = this.highScore;
        }

        saveStats() {
            if (this.score > this.highScore) {
                this.highScore = this.score;
                localStorage.setItem('tb_high_score', this.highScore.toString());
            }

            // Sync with SuperArcade Bridge and parent window
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({
                    type: 'SUPER_ARCADE_SCORE_SUBMIT',
                    gameId: 'toxic-butterfly',
                    score: this.score,
                    customData: {
                        toxicCaught: this.toxicCaughtCount,
                        level: this.level,
                        combo: this.maxCombo
                    }
                }, '*');

                window.parent.postMessage({
                    type: 'ARCADE_GAME_OVER',
                    winner: 'Score: ' + this.score,
                    gameId: 'toxic-butterfly'
                }, '*');
            }
        }

        // ==========================================
        // LOCAL PLAY SETUP (4 to 6 Players)
        // ==========================================
        initLocalPlayers(count) {
            this.localPlayerCount = count;
            this.localPlayers = [];
            for (let i = 0; i < count; i++) {
                const skin = BEAR_SKINS[i % BEAR_SKINS.length];
                this.localPlayers.push({
                    id: i + 1,
                    name: `لاعب ${i + 1} (${skin.name.split(' ')[1] || 'الدب'})`,
                    skin: skin,
                    score: 0,
                    toxicCaught: 0
                });
            }
            this.renderLocalPlayerInputs();
        }

        renderLocalPlayerInputs() {
            const container = document.getElementById('player-inputs-container');
            if (!container) return;
            container.innerHTML = '';

            this.localPlayers.forEach((p, idx) => {
                const row = document.createElement('div');
                row.style.display = 'flex';
                row.style.alignItems = 'center';
                row.style.gap = '8px';
                row.style.background = 'rgba(0,0,0,0.3)';
                row.style.padding = '8px 12px';
                row.style.borderRadius = '12px';
                row.style.border = '1px solid rgba(255,255,255,0.1)';

                row.innerHTML = `
                    <span style="font-size: 1.5rem;">${p.skin.emoji}</span>
                    <input type="text" value="${p.name}" id="local-pname-${idx}" style="flex: 1; padding: 6px 10px; border-radius: 8px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2); color: #fff; font-family: 'Tajawal'; font-size: 0.9rem; font-weight: 700; outline: none;">
                    <select id="local-pskin-${idx}" style="padding: 6px; border-radius: 8px; background: #064e3b; color: #fff; border: 1px solid #34d399; font-size: 0.8rem; font-weight: 700; cursor: pointer;">
                        ${BEAR_SKINS.map((s, sIdx) => `<option value="${sIdx}" ${s.id === p.skin.id ? 'selected' : ''}>${s.emoji} ${s.name}</option>`).join('')}
                    </select>
                `;
                container.appendChild(row);

                // Bind changes
                const nameInput = row.querySelector(`#local-pname-${idx}`);
                const skinSelect = row.querySelector(`#local-pskin-${idx}`);
                nameInput.addEventListener('input', (e) => { p.name = e.target.value; });
                skinSelect.addEventListener('change', (e) => {
                    p.skin = BEAR_SKINS[parseInt(e.target.value, 10)];
                    this.renderLocalPlayerInputs();
                });
            });
        }

        // ==========================================
        // GAMEPLAY LIFECYCLE
        // ==========================================
        startNewGame(mode = 'quick') {
            this.mode = mode;
            this.score = 0;
            this.level = 1;
            this.lives = 3;
            this.combo = 0;
            this.maxCombo = 0;
            this.toxicCaughtCount = 0;
            this.innocentSparedCount = 0;
            this.particles = [];

            if (mode === 'local') {
                this.currentLocalPlayerIdx = 0;
                this.localPlayers.forEach(p => { p.score = 0; p.toxicCaught = 0; });
                this.setupLocalPlayerTurn();
            } else {
                this.bear.setSkin(BEAR_SKINS[0]);
                const turnPill = document.getElementById('player-turn-pill');
                if (turnPill) turnPill.style.display = 'none';
            }

            this.switchScreen('game');
            this.spawnWave();

            if (window.parent && window.parent !== window) {
                window.parent.postMessage({ type: 'ARCADE_GAME_START', gameId: 'toxic-butterfly' }, '*');
            }
        }

        setupLocalPlayerTurn() {
            const player = this.localPlayers[this.currentLocalPlayerIdx];
            this.bear.setSkin(player.skin);
            this.lives = 3;
            this.score = player.score;

            const turnPill = document.getElementById('player-turn-pill');
            const turnName = document.getElementById('player-turn-name');
            if (turnPill && turnName) {
                turnPill.style.display = 'flex';
                turnName.textContent = `${player.skin.emoji} دور: ${player.name}`;
            }
        }

        spawnWave() {
            this.butterflies = [];
            this.timeRemaining = Math.max(18, 30 - this.level * 2);

            // Normal peaceful butterflies (4 to 8)
            const normalCount = Math.min(8, 3 + this.level);
            for (let i = 0; i < normalCount; i++) {
                this.butterflies.push(new Butterfly(false, this.level));
            }

            // Exactly ONE Toxic Butterfly (or 2 in very high waves > 5)
            const toxicCount = this.level > 5 ? 2 : 1;
            for (let i = 0; i < toxicCount; i++) {
                this.butterflies.push(new Butterfly(true, this.level));
            }

            this.updateHUD();
        }

        updateHUD() {
            const scoreEl = document.getElementById('score-val');
            const levelEl = document.getElementById('level-val');
            const timerEl = document.getElementById('timer-val');
            const livesEl = document.getElementById('lives-val');

            if (scoreEl) scoreEl.textContent = this.score;
            if (levelEl) levelEl.textContent = this.level;
            if (timerEl) timerEl.textContent = Math.ceil(this.timeRemaining) + 's';
            if (livesEl) {
                livesEl.textContent = '❤️'.repeat(Math.max(0, this.lives)) + '🖤'.repeat(Math.max(0, 3 - this.lives));
            }
        }

        attemptCatch() {
            if (this.state !== 'playing') return;
            const swung = this.bear.swing();
            if (!swung) return;

            const netZone = this.bear.getNetCatchZone();
            let caughtAny = false;

            // Check collision with butterflies
            for (let i = this.butterflies.length - 1; i >= 0; i--) {
                const b = this.butterflies[i];
                const dx = b.x - netZone.x;
                const dy = b.y - netZone.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < netZone.radius + b.size * 0.5) {
                    caughtAny = true;
                    this.handleButterflyCapture(b, i);
                    break; // Catch one at a time for precision
                }
            }

            if (!caughtAny) {
                // Empty swing
            }
        }

        handleButterflyCapture(b, index) {
            if (b.isToxic) {
                // SUCCESS: Caught the Toxic Butterfly!
                sound.play('toxicCatch');
                this.bear.setReaction('happy');
                this.combo++;
                if (this.combo > this.maxCombo) this.maxCombo = this.combo;

                const pts = 200 + this.combo * 50;
                this.score += pts;
                this.toxicCaughtCount++;

                // Spawn celebration particles
                this.spawnParticles(b.x, b.y, '#4ade80', 25);
                this.spawnParticles(b.x, b.y, '#a855f7', 25);
                this.showFloatingText(`+${pts} كفووو! فراشة سامة! 💥`, b.x, b.y, '#34d399');

                // Remove toxic butterfly
                this.butterflies.splice(index, 1);

                // If in local play, update current player score
                if (this.mode === 'local') {
                    this.localPlayers[this.currentLocalPlayerIdx].score = this.score;
                    this.localPlayers[this.currentLocalPlayerIdx].toxicCaught = this.toxicCaughtCount;
                }

                // If in P2P room, notify peer
                if (this.conn && this.conn.open) {
                    this.conn.send({ type: 'OPPONENT_CATCH_TOXIC', score: this.score });
                }

                // Advance to next wave after a brief celebration
                setTimeout(() => {
                    if (this.state === 'playing') {
                        this.level++;
                        this.showFloatingText(`المرحلة ${this.level} 🌲✨`, window.innerWidth / 2, window.innerHeight / 2, '#fbbf24');
                        this.spawnWave();
                    }
                }, 700);

            } else {
                // PENALTY: Caught an Innocent Butterfly!
                sound.play('wrongCatch');
                this.bear.setReaction('dizzy');
                this.combo = 0;
                this.lives--;
                this.score = Math.max(0, this.score - 50);

                this.spawnParticles(b.x, b.y, '#ef4444', 15);
                this.showFloatingText('🚨 خطأ! فراشة بريئة مسالمة! (-50)', b.x, b.y, '#ef4444');

                // Fly away fast
                b.vx *= 3;
                b.vy *= 3;

                this.updateHUD();

                if (this.lives <= 0) {
                    this.handleRoundFailure('نفدت المحاولات! 💔');
                }
            }
        }

        handleRoundFailure(reason) {
            if (this.mode === 'local') {
                // Pass turn to next local player
                this.localPlayers[this.currentLocalPlayerIdx].score = this.score;
                this.localPlayers[this.currentLocalPlayerIdx].toxicCaught = this.toxicCaughtCount;

                this.currentLocalPlayerIdx++;
                if (this.currentLocalPlayerIdx < this.localPlayerCount) {
                    this.showFloatingText(`انتهى دور اللاعب! الدور القادم... 🔄`, window.innerWidth / 2, window.innerHeight / 2, '#fbbf24');
                    setTimeout(() => {
                        this.setupLocalPlayerTurn();
                        this.level = 1;
                        this.spawnWave();
                    }, 1200);
                    return;
                }
            }

            // End game completely
            this.gameOver(reason);
        }

        gameOver(reason) {
            this.state = 'gameover';
            this.saveStats();

            const badge = document.getElementById('gameover-badge');
            const title = document.getElementById('gameover-title');
            const finalScoreEl = document.getElementById('final-score');
            const caughtEl = document.getElementById('stat-toxic-caught');
            const sparedEl = document.getElementById('stat-spared');
            const comboEl = document.getElementById('stat-combo');
            const waveEl = document.getElementById('stat-wave');

            if (badge) badge.textContent = reason || 'انتهت الجولة! 🎯';
            if (finalScoreEl) finalScoreEl.textContent = this.score;
            if (caughtEl) caughtEl.textContent = this.toxicCaughtCount;
            if (sparedEl) sparedEl.textContent = this.butterflies.filter(b => !b.isToxic).length;
            if (comboEl) comboEl.textContent = 'x' + this.maxCombo;
            if (waveEl) waveEl.textContent = this.level;

            // Render Local Play Podium if in Local mode
            const podium = document.getElementById('local-multiplayer-podium');
            const podiumList = document.getElementById('podium-list');
            if (this.mode === 'local' && podium && podiumList) {
                podium.style.display = 'block';
                podiumList.innerHTML = '';
                const sorted = [...this.localPlayers].sort((a, b) => b.score - a.score);
                const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣'];
                sorted.forEach((p, idx) => {
                    const item = document.createElement('div');
                    item.style.display = 'flex';
                    item.style.justifyContent = 'space-between';
                    item.style.alignItems = 'center';
                    item.style.background = idx === 0 ? 'rgba(251, 191, 36, 0.2)' : 'rgba(255, 255, 255, 0.05)';
                    item.style.border = idx === 0 ? '1px solid #fbbf24' : '1px solid rgba(255, 255, 255, 0.1)';
                    item.style.padding = '8px 14px';
                    item.style.borderRadius = '12px';
                    item.innerHTML = `
                        <div>
                            <span style="font-size: 1.2rem; margin-left: 6px;">${medals[idx]}</span>
                            <span>${p.skin.emoji} ${p.name}</span>
                        </div>
                        <span style="font-weight: 900; color: #34d399;">${p.score} نقطة</span>
                    `;
                    podiumList.appendChild(item);
                });
            } else if (podium) {
                podium.style.display = 'none';
            }

            this.switchScreen('game-over');
        }

        // ==========================================
        // PARTICLES & FLOATING TEXTS
        // ==========================================
        spawnParticles(x, y, color, count = 20) {
            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 5 + 1;
                this.particles.push({
                    x, y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    radius: Math.random() * 4 + 2,
                    color,
                    life: 1.0,
                    decay: Math.random() * 0.03 + 0.02
                });
            }
        }

        showFloatingText(text, x, y, color = '#34d399') {
            this.particles.push({
                type: 'text',
                text, x, y,
                vy: -1.5,
                color,
                life: 1.0,
                decay: 0.018
            });
        }

        // ==========================================
        // MAIN GAME LOOP
        // ==========================================
        gameLoop(currentTime) {
            const dt = Math.min(0.1, (currentTime - this.lastFrameTime) / 1000);
            this.lastFrameTime = currentTime;

            if (this.state === 'playing') {
                // Update Timer
                this.timeRemaining -= dt;
                if (this.timeRemaining <= 0) {
                    this.handleRoundFailure('انتهى الوقت المحدد! ⏰');
                } else {
                    this.updateHUD();
                }

                // Update Bear
                this.bear.update(dt);

                // Update Butterflies
                this.butterflies.forEach(b => b.update(this.canvas.width, this.canvas.height));

                // Update Particles
                for (let i = this.particles.length - 1; i >= 0; i--) {
                    const p = this.particles[i];
                    p.x += (p.vx || 0);
                    p.y += (p.vy || 0);
                    p.life -= p.decay;
                    if (p.life <= 0) this.particles.splice(i, 1);
                }
            }

            // Draw Everything
            this.render();

            requestAnimationFrame((t) => this.gameLoop(t));
        }

        render() {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            if (this.state === 'playing' || this.state === 'paused') {
                // 1. Draw Forest Atmosphere & Ambient Fireflies
                this.drawEnchantedForestAtmosphere();

                // 2. Draw Butterflies
                this.butterflies.forEach(b => b.draw(this.ctx));

                // 3. Draw Detective Bear
                this.bear.draw(this.ctx);

                // 4. Draw Particles & Floating Texts
                this.particles.forEach(p => {
                    if (p.type === 'text') {
                        this.ctx.save();
                        this.ctx.font = '900 1.2rem Tajawal, sans-serif';
                        this.ctx.fillStyle = p.color;
                        this.ctx.globalAlpha = Math.max(0, p.life);
                        this.ctx.shadowColor = 'rgba(0,0,0,0.8)';
                        this.ctx.shadowBlur = 8;
                        this.ctx.textAlign = 'center';
                        this.ctx.fillText(p.text, p.x, p.y);
                        this.ctx.restore();
                    } else {
                        this.ctx.save();
                        this.ctx.beginPath();
                        this.ctx.arc(p.x, p.y, p.radius * p.life, 0, Math.PI * 2);
                        this.ctx.fillStyle = p.color;
                        this.ctx.globalAlpha = Math.max(0, p.life);
                        this.ctx.shadowColor = p.color;
                        this.ctx.shadowBlur = 6;
                        this.ctx.fill();
                        this.ctx.restore();
                    }
                });
            }
        }

        drawEnchantedForestAtmosphere() {
            // Ambient glowing fireflies in background
            const time = Date.now() * 0.001;
            this.ctx.save();
            for (let i = 0; i < 8; i++) {
                const fx = (Math.sin(time * 0.5 + i * 2) * 0.4 + 0.5) * this.canvas.width;
                const fy = (Math.cos(time * 0.4 + i * 1.5) * 0.3 + 0.4) * this.canvas.height;
                const r = Math.sin(time * 2 + i) * 2 + 3;
                this.ctx.beginPath();
                this.ctx.arc(fx, fy, r, 0, Math.PI * 2);
                this.ctx.fillStyle = 'rgba(251, 191, 36, 0.4)';
                this.ctx.shadowColor = '#fbbf24';
                this.ctx.shadowBlur = 10;
                this.ctx.fill();
            }
            this.ctx.restore();
        }

        // ==========================================
        // UI & EVENT BINDINGS
        // ==========================================
        setupEvents() {
            window.addEventListener('resize', () => this.resize());

            // Pointer / Mouse Movement controls Bear
            window.addEventListener('mousemove', (e) => {
                if (this.state === 'playing') {
                    this.bear.targetX = e.clientX;
                    this.bear.targetY = Math.max(window.innerHeight * 0.35, e.clientY);
                }
            });

            // Click or Tap swings the Net
            window.addEventListener('pointerdown', (e) => {
                if (this.state === 'playing') {
                    // Avoid triggering swing if clicking HUD buttons
                    if (e.target.closest('.hud-pill') || e.target.closest('.virtual-controls')) return;
                    this.bear.targetX = e.clientX;
                    this.bear.targetY = Math.max(window.innerHeight * 0.35, e.clientY);
                    this.attemptCatch();
                }
            });

            // Keyboard Controls (Arrows / WASD / Space)
            window.addEventListener('keydown', (e) => {
                if (this.state !== 'playing') return;
                const step = 35;
                if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
                    this.bear.targetX = Math.max(60, this.bear.targetX - step);
                } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
                    this.bear.targetX = Math.min(this.canvas.width - 60, this.bear.targetX + step);
                } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
                    this.bear.targetY = Math.max(window.innerHeight * 0.35, this.bear.targetY - step);
                } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
                    this.bear.targetY = Math.min(this.canvas.height - 80, this.bear.targetY + step);
                } else if (e.key === ' ' || e.key === 'Enter') {
                    this.attemptCatch();
                }
            });

            // Touch device detection for Virtual Controls
            if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
                const vControls = document.getElementById('virtual-controls');
                if (vControls) vControls.style.display = 'flex';

                const btnLeft = document.getElementById('touch-left');
                const btnRight = document.getElementById('touch-right');
                const btnCatch = document.getElementById('touch-catch');

                if (btnLeft) {
                    btnLeft.addEventListener('touchstart', (e) => {
                        e.preventDefault();
                        this.bear.targetX = Math.max(60, this.bear.targetX - 45);
                    });
                }
                if (btnRight) {
                    btnRight.addEventListener('touchstart', (e) => {
                        e.preventDefault();
                        this.bear.targetX = Math.min(this.canvas.width - 60, this.bear.targetX + 45);
                    });
                }
                if (btnCatch) {
                    btnCatch.addEventListener('touchstart', (e) => {
                        e.preventDefault();
                        this.attemptCatch();
                    });
                }
            }

            // Start Screen Buttons
            document.getElementById('btn-quick-play')?.addEventListener('click', () => {
                this.startNewGame('quick');
            });
            document.getElementById('btn-mode-local')?.addEventListener('click', () => {
                this.openLocalModal();
            });
            document.getElementById('btn-mode-room')?.addEventListener('click', () => {
                this.openRoomModal();
            });
            document.getElementById('btn-mode-pro')?.addEventListener('click', () => {
                this.triggerProMatchmaking();
            });

            // Local Play Modal Buttons
            document.getElementById('local-player-count')?.addEventListener('change', (e) => {
                this.initLocalPlayers(parseInt(e.target.value, 10));
            });
            document.getElementById('btn-start-local-match')?.addEventListener('click', () => {
                document.getElementById('local-modal')?.classList.remove('active');
                this.startNewGame('local');
            });
            document.getElementById('btn-close-local-modal')?.addEventListener('click', () => {
                document.getElementById('local-modal')?.classList.remove('active');
            });

            // P2P Room Modal Buttons
            document.getElementById('btn-create-room')?.addEventListener('click', () => {
                this.startHostingRoom();
            });
            document.getElementById('btn-copy-room-code')?.addEventListener('click', () => {
                if (this.roomCode) {
                    navigator.clipboard.writeText(this.roomCode);
                    alert('تم نسخ كود الغرفة: ' + this.roomCode);
                }
            });
            document.getElementById('btn-join-room')?.addEventListener('click', () => {
                const code = document.getElementById('input-join-code')?.value.trim();
                if (code) {
                    this.joinP2PRoom(code);
                } else {
                    alert('يرجى كتابة كود الغرفة أولاً!');
                }
            });
            document.getElementById('btn-close-room-modal')?.addEventListener('click', () => {
                document.getElementById('room-modal')?.classList.remove('active');
            });

            // Pro Modal Buttons
            document.getElementById('btn-close-pro-modal')?.addEventListener('click', () => {
                document.getElementById('pro-modal')?.classList.remove('active');
            });
            document.getElementById('btn-pro-upgrade-action')?.addEventListener('click', () => {
                alert('🚀 جاري توجيهك لصفحة ترقية الحساب إلى Pro الممتاز...');
                document.getElementById('pro-modal')?.classList.remove('active');
            });

            // Sound Toggle
            document.getElementById('btn-sound-toggle-main')?.addEventListener('click', () => {
                const enabled = sound.toggle();
                const icon = document.getElementById('sound-icon-main');
                if (icon) icon.textContent = enabled ? '🔊' : '🔇';
            });

            // In-Game HUD buttons
            document.getElementById('btn-exit-game')?.addEventListener('click', () => {
                if (confirm('هل تريد الخروج والعودة للقائمة الرئيسية؟')) {
                    this.switchScreen('start');
                }
            });
            document.getElementById('btn-pause')?.addEventListener('click', () => {
                if (this.state === 'playing') {
                    this.state = 'paused';
                    this.showFloatingText('⏸️ لعبة متوقفة مؤقتاً', window.innerWidth / 2, window.innerHeight / 2, '#38bdf8');
                } else if (this.state === 'paused') {
                    this.state = 'playing';
                }
            });

            // Game Over Buttons
            document.getElementById('btn-restart')?.addEventListener('click', () => {
                this.startNewGame(this.mode);
            });
            document.getElementById('btn-back-menu')?.addEventListener('click', () => {
                this.switchScreen('start');
            });
        }

        switchScreen(name) {
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            if (name === 'start') {
                document.getElementById('start-screen')?.classList.add('active');
                this.state = 'start';
            } else if (name === 'game') {
                document.getElementById('game-screen')?.classList.add('active');
                this.state = 'playing';
            } else if (name === 'game-over') {
                document.getElementById('game-over-screen')?.classList.add('active');
            }
        }

        openLocalModal() {
            document.getElementById('local-modal')?.classList.add('active');
        }

        openRoomModal() {
            document.getElementById('room-modal')?.classList.add('active');
        }

        triggerProMatchmaking() {
            // Check if Pro via SuperArcade bridge or config
            const isPro = window.SuperArcade && window.SuperArcade.isProUser ? window.SuperArcade.isProUser() : false;
            if (!isPro) {
                // Show Pro Upgrade Modal as required by rules
                document.getElementById('pro-modal')?.classList.add('active');
                return;
            }

            // Pro User Matchmaking
            alert('👑 مرحباً بك يا بطل Pro! جاري البحث عن خصم عالمي متصل...');
            this.startNewGame('pro');
        }

        // ==========================================
        // P2P MULTIPLAYER (PeerJS Integration)
        // ==========================================
        startHostingRoom(forcedCode) {
            const code = forcedCode || 'TOXIC' + Math.floor(1000 + Math.random() * 9000);
            this.roomCode = code;
            this.isHost = true;

            const codeDisplay = document.getElementById('generated-code');
            const box = document.getElementById('host-code-display');
            if (codeDisplay) codeDisplay.textContent = code;
            if (box) box.style.display = 'block';

            if (typeof Peer !== 'undefined') {
                try {
                    this.peer = new Peer('tb_' + code);
                    this.peer.on('connection', (conn) => {
                        this.conn = conn;
                        this.setupConnectionHandlers();
                        alert('🎉 اتصل صديقك بالغرفة بنجاح! بدء اللعبة المشتركة!');
                        document.getElementById('room-modal')?.classList.remove('active');
                        this.startNewGame('private');
                    });
                } catch (e) {
                    console.warn('PeerJS init failed:', e);
                }
            }
        }

        joinP2PRoom(code) {
            this.roomCode = code.toUpperCase();
            this.isHost = false;

            if (typeof Peer !== 'undefined') {
                try {
                    this.peer = new Peer();
                    this.peer.on('open', () => {
                        this.conn = this.peer.connect('tb_' + this.roomCode);
                        this.setupConnectionHandlers();
                        this.conn.on('open', () => {
                            alert('🎉 تم الاتصال بالغرفة بنجاح!');
                            document.getElementById('room-modal')?.classList.remove('active');
                            this.startNewGame('private');
                        });
                    });
                } catch (e) {
                    console.warn('Peer join failed:', e);
                }
            } else {
                this.startNewGame('private');
            }
        }

        setupConnectionHandlers() {
            if (!this.conn) return;
            this.conn.on('data', (data) => {
                if (data.type === 'OPPONENT_CATCH_TOXIC') {
                    this.showFloatingText('⚠️ صديقك اصطاد الفراشة السامة أسرع منك!', window.innerWidth / 2, window.innerHeight / 2, '#fbbf24');
                }
            });
        }
    }

    // Initialize Game on page load
    window.addEventListener('DOMContentLoaded', () => {
        window.game = new ToxicButterflyGame();
    });

})();
