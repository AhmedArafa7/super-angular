import { Injectable, signal, computed, inject, effect, DestroyRef } from '@angular/core';
import { EncryptionService } from './encryption.service';
import { FirebaseService } from './firebase.service';

export interface OpenCodeConfig {
  instanceUrl: string;
  authToken: string;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'cold_start' | 'connected' | 'error';

@Injectable({
  providedIn: 'root'
})
export class OpencodeService {
  private encryptionService = inject(EncryptionService);
  private firebaseService = inject(FirebaseService);
  private destroyRef = inject(DestroyRef);

  private readonly STORAGE_KEY = 'opencode_encrypted_config_v1';

  // Signals for state management
  readonly connectionStatus = signal<ConnectionStatus>('disconnected');
  readonly savedConfig = signal<OpenCodeConfig | null>(null);
  readonly errorMessage = signal<string>('');

  // Computed signals
  readonly isConnected = computed(() => this.connectionStatus() === 'connected');
  readonly isConnecting = computed(() => this.connectionStatus() === 'connecting' || this.connectionStatus() === 'cold_start');
  readonly isColdStart = computed(() => this.connectionStatus() === 'cold_start');
  readonly hasSavedConfig = computed(() => !!this.savedConfig()?.instanceUrl);

  private ws: WebSocket | null = null;
  private coldStartTimer: any = null;
  private dataCallbacks: Array<(data: string) => void> = [];

  constructor() {
    // Auto-load encrypted config from storage on init
    this.loadSavedConfig();

    // Auto-purge credentials on user logout
    effect(() => {
      const user = this.firebaseService.currentUser();
      if (!user) {
        this.clearSessionCredentials();
      }
    });

    this.destroyRef.onDestroy(() => {
      this.disconnect();
    });
  }

  /**
   * Loads and decrypts saved configuration from local storage
   */
  async loadSavedConfig(): Promise<OpenCodeConfig | null> {
    try {
      const encryptedData = localStorage.getItem(this.STORAGE_KEY);
      if (!encryptedData) {
        this.savedConfig.set(null);
        return null;
      }

      const decrypted = await this.encryptionService.decrypt(encryptedData);
      if (decrypted && decrypted.instanceUrl && decrypted.authToken) {
        const config: OpenCodeConfig = {
          instanceUrl: decrypted.instanceUrl.trim(),
          authToken: decrypted.authToken.trim()
        };
        this.savedConfig.set(config);
        return config;
      }
    } catch (e) {
      console.error('[OpencodeService] Failed to load encrypted config:', e);
    }
    this.savedConfig.set(null);
    return null;
  }

  /**
   * Encrypts and persists configuration to local storage
   */
  async saveConfig(config: OpenCodeConfig): Promise<boolean> {
    try {
      const encrypted = await this.encryptionService.encrypt(config);
      if (encrypted) {
        localStorage.setItem(this.STORAGE_KEY, encrypted);
        this.savedConfig.set(config);
        return true;
      }
    } catch (e) {
      console.error('[OpencodeService] Failed to encrypt config:', e);
    }
    return false;
  }

  /**
   * Clears saved configuration and disconnects
   */
  async resetConnection(): Promise<void> {
    this.disconnect();
    localStorage.removeItem(this.STORAGE_KEY);
    this.savedConfig.set(null);
    this.errorMessage.set('');
  }

  /**
   * Clears in-memory & local session credentials (called on logout)
   */
  private clearSessionCredentials(): void {
    this.disconnect();
    localStorage.removeItem(this.STORAGE_KEY);
    this.savedConfig.set(null);
    this.errorMessage.set('');
  }

  /**
   * Establishes direct client-browser WebSocket connection to opencode instance
   */
  async connect(config?: OpenCodeConfig): Promise<boolean> {
    const targetConfig = config || this.savedConfig();
    if (!targetConfig || !targetConfig.instanceUrl || !targetConfig.authToken) {
      this.errorMessage.set('يرجى إدخال رابط الـ Instance ومفتاح التوثيق قبل الاتصال.');
      this.connectionStatus.set('error');
      return false;
    }

    this.disconnect();
    this.connectionStatus.set('connecting');
    this.errorMessage.set('');

    // Cold start detection timer (if server takes > 4s to connect, show cold_start banner)
    this.clearColdStartTimer();
    this.coldStartTimer = setTimeout(() => {
      if (this.connectionStatus() === 'connecting') {
        this.connectionStatus.set('cold_start');
      }
    }, 4000);

    return new Promise((resolve) => {
      try {
        const wsUrl = this.buildWebSocketUrl(targetConfig.instanceUrl, targetConfig.authToken);
        
        // Pass auth token safely using WebSocket subprotocols
        const subprotocols = ['opencode-v1', `token.${encodeURIComponent(targetConfig.authToken)}`].filter(Boolean);

        this.ws = new WebSocket(wsUrl, subprotocols);

        this.ws.onopen = async () => {
          this.clearColdStartTimer();
          this.connectionStatus.set('connected');
          this.errorMessage.set('');
          
          // Save valid config on successful connection
          await this.saveConfig(targetConfig);
          resolve(true);
        };

        this.ws.onmessage = (event: MessageEvent) => {
          const rawData = event.data;
          let textData = '';
          if (typeof rawData === 'string') {
            textData = rawData;
          } else if (rawData instanceof ArrayBuffer) {
            textData = new TextDecoder().decode(rawData);
          }
          this.notifyDataListeners(textData);
        };

        this.ws.onerror = (err) => {
          console.error('[OpencodeService] WebSocket error:', err);
          this.clearColdStartTimer();
          if (this.connectionStatus() !== 'connected') {
            this.connectionStatus.set('error');
            this.errorMessage.set('فشل الاتصال بالـ Instance. تحقق من صحة URL والـ Auth Token والشبكة.');
            resolve(false);
          }
        };

        this.ws.onclose = (event: CloseEvent) => {
          this.clearColdStartTimer();
          if (this.connectionStatus() === 'connected') {
            this.connectionStatus.set('disconnected');
          }
          if (event.code === 4001 || event.code === 4003) {
            this.connectionStatus.set('error');
            this.errorMessage.set('فشل التوثيق (Auth Token غير صالح أو انتهت صلاحيته).');
          }
        };
      } catch (e: any) {
        this.clearColdStartTimer();
        this.connectionStatus.set('error');
        this.errorMessage.set(e.message || 'رابط الـ Instance غير صالح.');
        resolve(false);
      }
    });
  }

  /**
   * Helper to normalize and convert http/https URL to ws/wss URL safely
   */
  private buildWebSocketUrl(rawUrl: string, token: string): string {
    let cleanUrl = rawUrl.trim();
    if (!cleanUrl.match(/^https?:\/\//i) && !cleanUrl.match(/^wss?:\/\//i)) {
      cleanUrl = 'https://' + cleanUrl;
    }

    const urlObj = new URL(cleanUrl);
    const protocol = urlObj.protocol === 'https:' || urlObj.protocol === 'wss:' ? 'wss:' : 'ws:';
    
    // Ensure path ends with /ws or terminal endpoint if not specified
    let path = urlObj.pathname;
    if (path === '/' || path === '') {
      path = '/ws';
    }

    // Build URL without embedding raw token in query string (prevents leakage in logs/SSRF)
    return `${protocol}//${urlObj.host}${path}`;
  }

  /**
   * Sends user terminal input to the connected opencode WebSocket
   */
  sendInput(data: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    }
  }

  /**
   * Disconnects current WebSocket session
   */
  disconnect(): void {
    this.clearColdStartTimer();
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }
    if (this.connectionStatus() !== 'error') {
      this.connectionStatus.set('disconnected');
    }
  }

  /**
   * Subscribes to terminal output data
   */
  onData(callback: (data: string) => void): () => void {
    this.dataCallbacks.push(callback);
    return () => {
      this.dataCallbacks = this.dataCallbacks.filter(cb => cb !== callback);
    };
  }

  private notifyDataListeners(data: string): void {
    for (const callback of this.dataCallbacks) {
      try {
        callback(data);
      } catch (err) {
        console.error('[OpencodeService] Error in data listener:', err);
      }
    }
  }

  private clearColdStartTimer(): void {
    if (this.coldStartTimer) {
      clearTimeout(this.coldStartTimer);
      this.coldStartTimer = null;
    }
  }
}
