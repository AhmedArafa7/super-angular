import { Injectable, signal, computed } from '@angular/core';

export type SyncStatus = 'pending' | 'syncing' | 'success' | 'error';

export interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  body: any;
  headers: any;
  timestamp: number;
  status: SyncStatus;
  progress?: number;
}

@Injectable({
  providedIn: 'root'
})
export class OfflineQueueService {
  private readonly QUEUE_KEY = 'si_neuro_offline_queue_v1';
  
  // Signal to keep the UI updated reactively about pending offline items
  queue = signal<QueuedRequest[]>([]);

  // Computed signal for active items
  activeSyncs = computed(() => this.queue().filter(q => q.status !== 'success'));

  constructor() {
    this.loadQueue();
    // In a real PWA, we would register a Background Sync event here.
    // For now, we simulate online recovery checking.
    window.addEventListener('online', () => this.syncPendingRequests());
  }

  private loadQueue(): void {
    const data = localStorage.getItem(this.QUEUE_KEY);
    if (data) {
      try {
        const loaded = JSON.parse(data) as QueuedRequest[];
        // Reset any 'syncing' statuses back to 'pending' on load
        this.queue.set(loaded.map(r => r.status === 'syncing' ? { ...r, status: 'pending' } : r));
      } catch (e) {
        console.error('[OfflineQueue] Failed to load offline queue', e);
      }
    }
  }

  private saveQueue(): void {
    localStorage.setItem(this.QUEUE_KEY, JSON.stringify(this.queue().filter(q => q.status !== 'success')));
  }

  enqueueRequest(req: { url: string; method: string; body: any; headers: any }): void {
    const newReq: QueuedRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...req,
      timestamp: Date.now(),
      status: 'pending',
      progress: 0
    };
    this.queue.update(q => [...q, newReq]);
    this.saveQueue();
    console.log(`[OfflineQueue] Request saved locally: ${req.method} ${req.url}`);
    
    // Attempt sync immediately if online
    if (navigator.onLine) {
      this.syncPendingRequests();
    }
  }

  updateRequestStatus(id: string, status: SyncStatus, progress?: number): void {
    this.queue.update(q => q.map(r => r.id === id ? { ...r, status, progress: progress ?? r.progress } : r));
    this.saveQueue();
  }

  removeRequest(id: string): void {
    this.queue.update(q => q.filter(r => r.id !== id));
    this.saveQueue();
  }

  clearQueue(): void {
    this.queue.set([]);
    this.saveQueue();
  }

  // Simulated Background Sync
  async syncPendingRequests(): Promise<void> {
    const pending = this.queue().filter(q => q.status === 'pending' || q.status === 'error');
    if (pending.length === 0) return;

    console.log(`[OfflineQueue] Starting sync for ${pending.length} items...`);

    for (const req of pending) {
      this.updateRequestStatus(req.id, 'syncing', 10);
      
      // Simulate network request progress
      await this.simulateProgress(req.id);
      
      // Simulate success
      this.updateRequestStatus(req.id, 'success', 100);
      console.log(`[OfflineQueue] Successfully synced: ${req.id}`);
      
      // Remove success items after a short delay so the UI can show the "Success" toast briefly
      setTimeout(() => {
        this.removeRequest(req.id);
      }, 3000);
    }
  }

  private simulateProgress(id: string): Promise<void> {
    return new Promise(resolve => {
      let progress = 10;
      const interval = setInterval(() => {
        progress += Math.floor(Math.random() * 20) + 10;
        if (progress >= 90) {
          progress = 90;
          clearInterval(interval);
          setTimeout(() => resolve(), 500);
        }
        this.updateRequestStatus(id, 'syncing', progress);
      }, 400);
    });
  }
}
