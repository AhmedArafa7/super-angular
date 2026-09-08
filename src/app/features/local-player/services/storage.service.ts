import { Injectable, inject } from '@angular/core';
import { IndexedDBService } from '../../../core/services/indexed-db.service';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private indexedDb = inject(IndexedDBService);

  async saveMediaItem(item: any): Promise<void> {
    return this.indexedDb.put('local_player_media', item);
  }

  async getMediaItem(id: string): Promise<any> {
    return this.indexedDb.get('local_player_media', id);
  }

  async getAllMediaItems(): Promise<any[]> {
    return this.indexedDb.getAll('local_player_media');
  }

  async deleteMediaItem(id: string): Promise<void> {
    return this.indexedDb.delete('local_player_media', id);
  }

  async clearAllMedia(): Promise<void> {
    return this.indexedDb.clearStore('local_player_media');
  }

  // --- New generic methods ---

  async saveItem(storeName: string, item: any): Promise<void> {
    return this.indexedDb.put(storeName, item);
  }

  async getItem(storeName: string, id: string): Promise<any> {
    return this.indexedDb.get(storeName, id);
  }

  async getAllItems(storeName: string): Promise<any[]> {
    return this.indexedDb.getAll(storeName);
  }

  async deleteItem(storeName: string, id: string): Promise<void> {
    return this.indexedDb.delete(storeName, id);
  }
}
