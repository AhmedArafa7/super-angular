// ============================================================
// SONIC BOOM — Network Client
// Socket.IO session client + WebRTC proximity voice + Eggman sync
// Uses global `io` (loaded via CDN in index.html)
// ============================================================

export class NetworkClient {
  constructor({ serverUrl, name, onEvent, onVoiceGain }) {
    this.serverUrl = serverUrl || this._defaultServer();
    this.name = name || 'Player';
    this.onEvent = onEvent || (() => {});
    this.onVoiceGain = onVoiceGain || (() => {}); // (remoteId, gain)

    this.socket = null;
    this.connected = false;
    this.isHost = false;
    this.hostSecret = null;
    this.code = null;
    this.playerId = null;
    this.players = [];
    this.eggmanActive = false;

    // Remote player snapshots { playerId: { pos, rot, anim, emote } }
    this.remotes = {};

    // Voice
    this.voiceEnabled = false;
    this.voiceMuted = false;
    this._audioCtx = null;
    this._localStream = null;
    this._rtcPeers = {};      // playerId -> RTCPeerConnection
    this._voiceStreams = {};  // playerId -> MediaStream
    this._voiceElements = {}; // playerId -> AudioElement
    this._voiceGains = {};    // playerId -> GainNode
    this._pendingCandidates = {}; // playerId -> [candidates]

    // Move throttle
    this._lastMoveSent = 0;
    this._pendingMove = null;
    this._sendInterval = null;
  }

  _defaultServer() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('server')) return params.get('server');
    const host = window.location.hostname || 'localhost';
    return `ws://${host}:3000`;
  }

  connect() {
    return new Promise((resolve, reject) => {
      if (typeof io === 'undefined') {
        reject(new Error('Socket.IO client not loaded'));
        return;
      }
      try {
        this.socket = io(this.serverUrl, { reconnection: true, reconnectionDelay: 1000, timeout: 8000 });
      } catch (e) {
        reject(e);
        return;
      }
      this.socket.on('connect', () => {
        this.connected = true;
        this._bindHandlers();
        resolve();
      });
      this.socket.on('connect_error', (err) => {
        if (!this.connected) reject(err);
      });
      this.socket.on('disconnect', () => {
        this.connected = false;
        this.onEvent({ type: 'net:disconnect' });
      });
    });
  }

  _bindHandlers() {
    const s = this.socket;

    s.on('player:joined', (d) => this.onEvent({ type: 'player:joined', player: d.player }));
    s.on('player:left', (d) => {
      this._cleanupVoicePeer(d.playerId);
      this.onEvent({ type: 'player:left', playerId: d.playerId, name: d.name });
    });
    s.on('lobby:update', (d) => {
      this.players = d.players;
      this.onEvent({ type: 'lobby:update', players: d.players });
    });
    s.on('game:started', (d) => {
      this.players = d.players;
      this.onEvent({ type: 'game:started', players: d.players });
    });
    s.on('host:promoted', (d) => {
      this.isHost = this.playerId === d.playerId;
      this.onEvent({ type: 'host:promoted', playerId: d.playerId });
    });
    s.on('player:move', (d) => {
      this.remotes[d.playerId] = { pos: d.pos, rot: d.rot, anim: d.anim, emote: d.emote, t: d.t };
      this.onEvent({ type: 'player:move', playerId: d.playerId, pos: d.pos, rot: d.rot, anim: d.anim, emote: d.emote });
    });
    s.on('eggman:event', (d) => {
      this.eggmanActive = true;
      this.onEvent({ type: 'eggman:event', manual: d.manual, delayMinutes: d.delayMinutes, triggeredBy: d.triggeredBy });
    });
    s.on('eggman:cleared', () => {
      this.eggmanActive = false;
      this.onEvent({ type: 'eggman:cleared' });
    });
    s.on('chat', (d) => this.onEvent({ type: 'chat', fromId: d.fromId, fromName: d.fromName, message: d.message }));
    s.on('voice:signal', (d) => this._handleVoiceSignal(d));
  }

  // ------------------------------------------------------------
  // Session management
  // ------------------------------------------------------------
  host(character, requestedCode) {
    return new Promise((resolve, reject) => {
      if (!this.connected) return reject(new Error('Not connected'));
      this.socket.emit('create-session', { name: this.name, character, requestedCode }, (res) => {
        if (!res || !res.ok) return reject(new Error((res && res.error) || 'Failed to host'));
        this.isHost = true;
        this.hostSecret = res.hostSecret;
        this.code = res.code;
        this.playerId = res.playerId;
        this.players = res.players;
        resolve({ code: res.code, hostSecret: res.hostSecret, playerId: res.playerId, players: res.players });
      });
    });
  }

  join(code, character) {
    return new Promise((resolve, reject) => {
      if (!this.connected) return reject(new Error('Not connected'));
      this.socket.emit('join-session', { code, name: this.name, character }, (res) => {
        if (!res || !res.ok) return reject(new Error((res && res.error) || 'Failed to join'));
        this.isHost = false;
        this.code = res.code;
        this.playerId = res.playerId;
        this.players = res.players;
        this.eggmanActive = !!res.eggmanActive;
        resolve({ playerId: res.playerId, players: res.players, eggmanActive: res.eggmanActive });
      });
    });
  }

  selectCharacter(character, ready) {
    if (!this.connected) return;
    this.socket.emit('lobby:select', { character, ready });
  }

  startGame() {
    if (!this.connected || !this.isHost) return;
    this.socket.emit('game:start', { hostSecret: this.hostSecret }, (res) => {
      if (res && !res.ok) this.onEvent({ type: 'net:error', message: res.error });
    });
  }

  triggerEggman() {
    if (!this.connected || !this.isHost) return;
    this.socket.emit('eggman:trigger', { hostSecret: this.hostSecret, triggeredBy: this.name }, (res) => {
      if (res && !res.ok) this.onEvent({ type: 'net:error', message: res.error });
    });
  }

  reportEggmanDefeated() {
    if (!this.connected || !this.isHost) return;
    this.socket.emit('eggman:defeated', { hostSecret: this.hostSecret });
  }

  // ------------------------------------------------------------
  // Movement / actions (throttled to ~15Hz)
  // ------------------------------------------------------------
  startSync() {
    this._sendInterval = setInterval(() => {
      if (!this._pendingMove) return;
      this.socket.emit('move', this._pendingMove);
      this._pendingMove = null;
    }, 66); // ~15 Hz
  }

  sendMove({ pos, rot, anim, emote }) {
    this._pendingMove = { t: performance.now(), pos, rot, anim, emote };
  }

  sendChat(message) {
    if (!this.connected) return;
    this.socket.emit('chat', { message });
  }

  // ------------------------------------------------------------
  // WebRTC proximity voice chat
  // ------------------------------------------------------------
  async enableVoice() {
    if (this.voiceEnabled) return;
    try {
      this._localStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (e) {
      this.onEvent({ type: 'voice:error', message: 'Microphone access denied' });
      return;
    }
    this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    this.voiceEnabled = true;
    this.onEvent({ type: 'voice:enabled' });

    // Connect to every existing remote player
    for (const p of this.players) {
      if (p.id !== this.playerId && this.voiceEnabled) this._openVoicePeer(p.id, true);
    }
  }

  disableVoice() {
    this.voiceEnabled = false;
    for (const pid of Object.keys(this._rtcPeers)) this._cleanupVoicePeer(pid);
    if (this._localStream) { this._localStream.getTracks().forEach(t => t.stop()); this._localStream = null; }
    if (this._audioCtx) { this._audioCtx.close(); this._audioCtx = null; }
  }

  setVoiceMuted(muted) {
    this.voiceMuted = muted;
    if (this._localStream) this._localStream.getAudioTracks().forEach(t => (t.enabled = !muted));
  }

  _openVoicePeer(peerId, initiator) {
    if (this._rtcPeers[peerId]) return;
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });
    this._rtcPeers[peerId] = pc;
    this._pendingCandidates[peerId] = [];

    // Add local audio track
    if (this._localStream) this._localStream.getAudioTracks().forEach(t => pc.addTrack(t, this._localStream));

    // Receive remote audio → gain node (proximity attenuation)
    pc.ontrack = (event) => {
      if (this._voiceElements[peerId]) return;
      const stream = event.streams[0];
      this._voiceStreams[peerId] = stream;

      if (this._audioCtx) {
        const src = this._audioCtx.createMediaStreamSource(stream);
        const gain = this._audioCtx.createGain();
        gain.gain.value = 1;
        src.connect(gain);
        gain.connect(this._audioCtx.destination);
        this._voiceGains[peerId] = gain;
      }
      this.onEvent({ type: 'voice:peer', peerId });
    };

    pc.onicecandidate = (e) => {
      if (!e.candidate) return;
      if (this.socket && this.connected) {
        this.socket.emit('voice:signal', { targetId: peerId, signal: { type: 'candidate', candidate: e.candidate } });
      }
    };

    if (initiator) {
      pc.createOffer().then((offer) => pc.setLocalDescription(offer)).then(() => {
        if (this.socket && this.connected) {
          this.socket.emit('voice:signal', { targetId: peerId, signal: { type: 'offer', sdp: pc.localDescription } });
        }
      });
    }
  }

  _handleVoiceSignal(d) {
    // d = { fromId, fromName, signal }
    if (!this.voiceEnabled) return;

    if (d.signal.type === 'offer') {
      this._openVoicePeer(d.fromId, false);
      const pc = this._rtcPeers[d.fromId];
      pc.setRemoteDescription(new RTCSessionDescription(d.signal.sdp)).then(() => {
        // Flush queued candidates
        const pend = this._pendingCandidates[d.fromId] || [];
        pend.forEach(c => pc.addIceCandidate(new RTCIceCandidate(c)));
        this._pendingCandidates[d.fromId] = [];
        return pc.createAnswer();
      }).then((answer) => pc.setLocalDescription(answer)).then(() => {
        if (this.socket && this.connected) {
          this.socket.emit('voice:signal', { targetId: d.fromId, signal: { type: 'answer', sdp: pc.localDescription } });
        }
      });
    } else if (d.signal.type === 'answer') {
      const pc = this._rtcPeers[d.fromId];
      if (pc) pc.setRemoteDescription(new RTCSessionDescription(d.signal.sdp));
    } else if (d.signal.type === 'candidate') {
      const pc = this._rtcPeers[d.fromId];
      if (pc && pc.remoteDescription) {
        pc.addIceCandidate(new RTCIceCandidate(d.signal.candidate));
      } else {
        this._pendingCandidates[d.fromId] = this._pendingCandidates[d.fromId] || [];
        this._pendingCandidates[d.fromId].push(d.signal.candidate);
      }
    }
  }

  _cleanupVoicePeer(peerId) {
    const pc = this._rtcPeers[peerId];
    if (pc) { try { pc.close(); } catch (e) {} delete this._rtcPeers[peerId]; }
    if (this._voiceStreams[peerId]) { this._voiceStreams[peerId].getTracks().forEach(t => t.stop()); delete this._voiceStreams[peerId]; }
    if (this._voiceGains[peerId]) { try { this._voiceGains[peerId].disconnect(); } catch (e) {} delete this._voiceGains[peerId]; }
    delete this._voiceElements[peerId];
    delete this._pendingCandidates[peerId];
  }

  // Update voice gain based on proximity (called each frame from the game)
  updateVoiceProximity(localPos) {
    if (!this.voiceEnabled || !this._audioCtx) return;
    for (const p of this.players) {
      if (p.id === this.playerId) continue;
      const gain = this._voiceGains[p.id];
      if (!gain) continue;
      const remote = this.remotes[p.id];
      if (!remote || !remote.pos) { gain.gain.value = 0; continue; }
      const dx = localPos.x - remote.pos.x;
      const dz = localPos.z - remote.pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      // Proximity falloff: full volume < 8m, fade to silence at 25m
      const vol = Math.max(0, 1 - (dist - 8) / 17);
      gain.gain.value = vol * vol;
    }
  }

  // ------------------------------------------------------------
  // Misc
  // ------------------------------------------------------------
  getRemotePlayer(id) { return this.remotes[id] || null; }
  getAllPlayers() { return this.players; }
  getSelf() { return this.players.find(p => p.id === this.playerId) || null; }

  destroy() {
    if (this._sendInterval) clearInterval(this._sendInterval);
    for (const pid of Object.keys(this._rtcPeers)) this._cleanupVoicePeer(pid);
    this.disableVoice();
    if (this.socket) { this.socket.disconnect(); this.socket = null; }
  }
}
