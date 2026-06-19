import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { OfflineQueueService } from './offline-queue.service';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  private offlineQueue = inject(OfflineQueueService);
  private http = inject(HttpClient);
  private isSyncing = false;

  constructor() {
    this.initSyncListener();
  }

  private initSyncListener(): void {
    window.addEventListener('online', () => {
      console.log('[SyncService] Connection restored. Attempting background sync...');
      this.syncPendingTasks();
    });
  }

  async syncPendingTasks(): Promise<void> {
    if (this.isSyncing) return;
    
    const queue = this.offlineQueue.queue();
    if (queue.length === 0) return;

    this.isSyncing = true;
    console.log(`[SyncService] Found ${queue.length} pending offline tasks to sync.`);

    for (const req of queue) {
      try {
        console.log(`[SyncService] Syncing: ${req.method} ${req.url}`);
        await firstValueFrom(
          this.http.request(req.method, req.url, {
            body: req.body,
            headers: req.headers
          })
        );
        
        console.log(`[SyncService] Success: ${req.id}`);
        this.offlineQueue.removeRequest(req.id);
      } catch (err) {
        console.error(`[SyncService] Failed to sync task ${req.id}, will retry later`, err);
        // Keeps it in the queue for the next attempt
      }
    }
    
    this.isSyncing = false;
  }
}
