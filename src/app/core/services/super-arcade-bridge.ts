import { Injectable } from '@angular/core';

export interface SuperArcadeConfig {
  gameId: string;
  gameTitle: string;
  mode: 'local' | 'p2p' | 'online_pro';
  isProUser: boolean;
  maxPlayers?: number;
}

export interface ArcadeGameState {
  score: number;
  level?: number;
  lives?: number;
  isGameOver: boolean;
  customData?: any;
}

@Injectable({
  providedIn: 'root'
})
export class SuperArcadeBridgeService {
  
  /**
   * Generates the client-side JavaScript snippet to be injected into game iframes (HTML5 & Godot Web).
   */
  generateBridgeScript(config: SuperArcadeConfig): string {
    return `
    <script>
      (function() {
        if (window.SuperArcade) return;

        window.SuperArcade = {
          config: ${JSON.stringify(config)},
          state: {
            score: 0,
            level: 1,
            lives: 3,
            isGameOver: false,
            activeScreen: 'start'
          },
          listeners: {
            onInput: [],
            onModeChange: [],
            onPeerMessage: []
          },

          // 1. Standardized Game Modes API
          getMode: function() { return this.config.mode; },
          isLocalMode: function() { return this.config.mode === 'local'; },
          isP2PMode: function() { return this.config.mode === 'p2p'; },
          isProMode: function() { return this.config.mode === 'online_pro'; },
          isProUser: function() { return !!this.config.isProUser; },

          // 2. State & Score Management
          submitScore: function(score, customData) {
            this.state.score = score;
            window.parent.postMessage({
              type: 'SUPER_ARCADE_SCORE_SUBMIT',
              gameId: this.config.gameId,
              score: score,
              customData: customData || {}
            }, '*');
          },

          setGameOver: function(finalScore) {
            this.state.isGameOver = true;
            this.state.activeScreen = 'gameover';
            this.submitScore(finalScore || this.state.score);
            window.parent.postMessage({
              type: 'SUPER_ARCADE_GAME_OVER',
              gameId: this.config.gameId,
              score: finalScore || this.state.score
            }, '*');
          },

          // 3. P2P Input Sync API
          sendPeerMessage: function(action, payload) {
            window.parent.postMessage({
              type: 'SUPER_ARCADE_P2P_SEND',
              action: action,
              payload: payload
            }, '*');
          },

          onPeerMessage: function(callback) {
            if (typeof callback === 'function') {
              this.listeners.onPeerMessage.push(callback);
            }
          },

          // 4. Input Listener Helper
          broadcastInput: function(inputEvent) {
            this.listeners.onInput.forEach(function(fn) { fn(inputEvent); });
          }
        };

        // Listen for parent messages
        window.addEventListener('message', function(event) {
          var data = event.data;
          if (!data || typeof data !== 'object') return;

          if (data.type === 'SUPER_ARCADE_P2P_RECEIVE') {
            window.SuperArcade.listeners.onPeerMessage.forEach(function(fn) {
              fn(data.action, data.payload);
            });
          }
        });

        console.log('⚡ SuperArcade Bridge SDK initialized for mode: ' + config.mode);
      })();
    </script>
    `;
  }
}
