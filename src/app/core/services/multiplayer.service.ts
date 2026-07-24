import { Injectable, inject, NgZone, signal } from '@angular/core';
import { Peer, DataConnection } from 'peerjs';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'failed';

@Injectable({ providedIn: 'root' })
export class MultiplayerService {
  private ngZone = inject(NgZone);

  private peer: Peer | null = null;
  public isHost = false;
  private dataChannels = new Map<string, DataConnection>();
  private currentRoomCode: string | null = null;

  readonly connectionState = signal<ConnectionState>('disconnected');
  readonly onMessageReceived = signal<any | null>(null);

  constructor() {
    this.initPeer();
  }

  private initPeer() {
    try {
      this.peer = new Peer(undefined as any, {
        host: '0.peerjs.com',
        port: 443,
        secure: true
      });

      this.peer.on('error', (err: any) => {
        console.error('PeerJS error:', err);
        this.ngZone.run(() => this.connectionState.set('failed'));
      });
    } catch (e: any) {
      console.error('Failed to initialize PeerJS:', e);
    }
  }

  async createRoom(): Promise<string> {
    this.disconnect();
    this.isHost = true;
    this.ngZone.run(() => this.connectionState.set('connecting'));

    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.currentRoomCode = roomCode;

    // Re-initialize peer with the specific room code as ID
    if (this.peer) {
      this.peer.destroy();
    }

    return new Promise((resolve, reject) => {
      try {
        this.peer = new Peer(roomCode, {
          host: '0.peerjs.com',
          port: 443,
          secure: true
        });

        this.peer.on('open', () => {
          this.ngZone.run(() => this.connectionState.set('connecting'));
          resolve(roomCode);
        });

        this.peer.on('connection', (conn: DataConnection) => {
          this.dataChannels.set(conn.peer, conn);
          this.setupDataChannel(conn);
        });

        this.peer.on('error', (err: any) => {
          console.error('Host peer error:', err);
          this.ngZone.run(() => this.connectionState.set('failed'));
          reject(err);
        });
      } catch (e: any) {
        reject(e);
      }
    });
  }

  async joinRoom(roomCode: string): Promise<boolean> {
    this.disconnect();
    this.isHost = false;
    this.currentRoomCode = roomCode;
    this.ngZone.run(() => this.connectionState.set('connecting'));

    return new Promise((resolve) => {
      if (!this.peer || this.peer.destroyed) {
        this.peer = new Peer(undefined as any, {
          host: '0.peerjs.com',
          port: 443,
          secure: true
        });
      }

      this.peer.on('open', () => {
        const conn = this.peer!.connect(roomCode, { reliable: true });

        conn.on('open', () => {
          this.dataChannels.set('host', conn);
          this.setupDataChannel(conn);
          this.ngZone.run(() => this.connectionState.set('connected'));
          resolve(true);
        });

        conn.on('error', (err: any) => {
          console.error('Connection error:', err);
          this.ngZone.run(() => this.connectionState.set('failed'));
          resolve(false);
        });
      });

      this.peer.on('error', (err: any) => {
        console.error('Guest peer error:', err);
        this.ngZone.run(() => this.connectionState.set('failed'));
        resolve(false);
      });
    });
  }

  private setupDataChannel(conn: DataConnection) {
    conn.on('data', (data: any) => {
      this.ngZone.run(() => {
        this.onMessageReceived.set(data);
        // If we are Host, broadcast message to other connected guests (Star topology)
        if (this.isHost) {
          this.dataChannels.forEach((ch, id) => {
            if (id !== conn.peer && ch.open) {
              ch.send(data);
            }
          });
        }
      });
    });

    conn.on('open', () => {
      this.ngZone.run(() => this.connectionState.set('connected'));
    });

    conn.on('close', () => {
      this.dataChannels.delete(conn.peer);
      if (!this.isHost) {
        this.ngZone.run(() => this.connectionState.set('disconnected'));
      }
    });
  }

  sendMessage(message: any) {
    this.dataChannels.forEach(channel => {
      if (channel.open) {
        channel.send(message);
      }
    });
  }

  disconnect() {
    this.dataChannels.forEach(channel => channel.close());
    this.dataChannels.clear();
    if (this.peer && !this.peer.destroyed) {
      this.peer.destroy();
      this.peer = null;
    }
    this.isHost = false;
    this.currentRoomCode = null;
    this.ngZone.run(() => this.connectionState.set('disconnected'));
  }
}
