import { Injectable, signal } from '@angular/core';

export interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  body: any;
  headers: any;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class OfflineQueueService {
  private readonly QUEUE_KEY = 'si_neuro_offline_queue_v1';
  
  // Signal to keep the UI updated reactively about pending offline items
  queue = signal<QueuedRequest[]>([]);

  constructor() {
    this.loadQueue();
  }

  private loadQueue(): void {
    const data = localStorage.getItem(this.QUEUE_KEY);
    if (data) {
      try {
        this.queue.set(JSON.parse(data));
      } catch (e) {
        console.error('[OfflineQueue] Failed to load offline queue', e);
      }
    }
  }

  private saveQueue(): void {
    localStorage.setItem(this.QUEUE_KEY, JSON.stringify(this.queue()));
  }

  enqueueRequest(req: { url: string; method: string; body: any; headers: any }): void {
    const newReq: QueuedRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...req,
      timestamp: Date.now()
    };
    this.queue.update(q => [...q, newReq]);
    this.saveQueue();
    console.log(`[OfflineQueue] Request saved locally: ${req.method} ${req.url}`);
  }

  removeRequest(id: string): void {
    this.queue.update(q => q.filter(r => r.id !== id));
    this.saveQueue();
  }

  clearQueue(): void {
    this.queue.set([]);
    this.saveQueue();
  }
}
