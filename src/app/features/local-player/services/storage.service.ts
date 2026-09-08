import { Injectable, inject } from '@angular/core';
import { IndexedDBService } from '../../../core/services/indexed-db.service';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private indexedDb = inject(IndexedDBService);
  private readonly STORE_NAME = 'local_player_media';

  async saveMediaItem(item: any): Promise<void> {
    return this.indexedDb.put(this.STORE_NAME, item);
  }

  async getMediaItem(id: string): Promise<any> {
    return this.indexedDb.get(this.STORE_NAME, id);
  }

  async getAllMediaItems(): Promise<any[]> {
    return this.indexedDb.getAll(this.STORE_NAME);
  }

  async deleteMediaItem(id: string): Promise<void> {
    return this.indexedDb.delete(this.STORE_NAME, id);
  }

  async clearAllMedia(): Promise<void> {
    return this.indexedDb.clearStore(this.STORE_NAME);
  }
}
