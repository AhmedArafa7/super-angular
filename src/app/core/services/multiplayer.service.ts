import { Injectable, inject, NgZone, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'failed';

/**
 * MultiplayerService — Socket.IO-based session manager.
 * Replaces the old PeerJS transport with a self-hosted signaling server
 * (see signaling-server/server.js). API kept compatible for arcade games:
 *   createRoom(code?), joinRoom(code), sendMessage(data), disconnect()
 */
@Injectable({ providedIn: 'root' })
export class MultiplayerService {
  private ngZone = inject(NgZone);

  private socket: Socket | null = null;
  public isHost = false;
  private currentRoomCode: string | null = null;
  private connectPromise: Promise<Socket> | null = null;

  readonly connectionState = signal<ConnectionState>('disconnected');
  readonly onMessageReceived = signal<any | null>(null);

  private serverUrl(): string {
    const configured = (window as any).__SUPER_SIGNALING_URL__;
    if (configured) return configured;
    const host = window.location.hostname || 'localhost';
    return `ws://${host}:3000`;
  }

  constructor() {}

  /** Lazily connect (or reuse an existing socket). Resolves on first connect. */
  private connect(): Promise<Socket> {
    if (this.socket && this.socket.connected) return Promise.resolve(this.socket);
    if (this.connectPromise) return this.connectPromise;

    this.ngZone.run(() => this.connectionState.set('connecting'));

    this.connectPromise = new Promise((resolve) => {
      try {
        this.socket = io(this.serverUrl(), { reconnection: true, reconnectionDelay: 1000, timeout: 8000 });

        this.socket.on('connect', () => {
          this.ngZone.run(() => {
            if (this.currentRoomCode) {
              this.connectionState.set('connected');
            }
            resolve(this.socket!);
          });
        });

        this.socket.on('connect_error', () => {
          this.ngZone.run(() => this.connectionState.set('failed'));
        });

        this.socket.on('message', (msg: any) => {
          this.ngZone.run(() => this.onMessageReceived.set(msg && msg.data !== undefined ? msg.data : msg));
        });

        this.socket.on('disconnect', () => {
          this.ngZone.run(() => {
            if (!this.currentRoomCode) this.connectionState.set('disconnected');
            this.connectPromise = null;
          });
        });
      } catch (e) {
        console.error('Failed to init Socket.IO:', e);
        this.ngZone.run(() => this.connectionState.set('failed'));
        this.connectPromise = null;
      }
    });

    return this.connectPromise;
  }

  async createRoom(specificCode?: string): Promise<string> {
    this.disconnect();
    this.isHost = true;
    const requestedCode = specificCode ? specificCode.trim().toUpperCase() : undefined;
    this.ngZone.run(() => this.connectionState.set('connecting'));

    const socket = await this.connect();
    this.currentRoomCode = requestedCode || null;

    return new Promise((resolve) => {
      socket.emit('create-session', { name: 'Player', character: 'sonic', requestedCode }, (res: any) => {
        if (res && res.ok) {
          this.currentRoomCode = res.code;
          this.isHost = true;
          this.ngZone.run(() => this.connectionState.set('connected'));
          resolve(res.code);
        } else {
          this.ngZone.run(() => this.connectionState.set('failed'));
          resolve(requestedCode || '');
        }
      });
    });
  }

  async joinRoom(roomCode: string): Promise<boolean> {
    this.disconnect();
    this.isHost = false;
    const code = roomCode.trim().toUpperCase();
    this.currentRoomCode = code;
    this.ngZone.run(() => this.connectionState.set('connecting'));

    const socket = await this.connect();

    return new Promise((resolve) => {
      socket.emit('join-session', { code, name: 'Player', character: 'sonic' }, (res: any) => {
        if (res && res.ok) {
          this.isHost = false;
          this.ngZone.run(() => this.connectionState.set('connected'));
          resolve(true);
        } else {
          this.ngZone.run(() => this.connectionState.set('failed'));
          resolve(false);
        }
      });
    });
  }

  sendMessage(message: any) {
    if (this.socket && this.socket.connected && this.currentRoomCode) {
      this.socket.emit('message', { data: message });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connectPromise = null;
    this.isHost = false;
    this.currentRoomCode = null;
    this.ngZone.run(() => this.connectionState.set('disconnected'));
  }
}
