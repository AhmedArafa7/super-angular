import { Injectable, inject } from '@angular/core';
import { StorageService } from './storage.service';
import { VideoNote } from '../models/local-player.models';

@Injectable({
  providedIn: 'root'
})
export class NotesService {
  private storage = inject(StorageService);
  private readonly STORE_NAME = 'local_player_notes';

  async createNote(note: Omit<VideoNote, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<VideoNote> {
    const newNote: VideoNote = {
      ...note,
      id: 'note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      deletedAt: null
    };
    await this.storage.saveItem(this.STORE_NAME, newNote);
    return newNote;
  }

  async updateNote(id: string, changes: Partial<VideoNote>): Promise<void> {
    const note = await this.storage.getItem(this.STORE_NAME, id);
    if (!note) return;
    const updatedNote = { ...note, ...changes, updatedAt: Date.now() };
    await this.storage.saveItem(this.STORE_NAME, updatedNote);
  }

  async getAllNotes(): Promise<VideoNote[]> {
    const all = await this.storage.getAllItems(this.STORE_NAME);
    return all.filter(n => n.deletedAt === null);
  }

  async getNotesForVideo(videoId: string): Promise<VideoNote[]> {
    const all = await this.getAllNotes();
    return all.filter(n => n.videoId === videoId);
  }

  async getOrphanedNotes(): Promise<VideoNote[]> {
    const all = await this.getAllNotes();
    return all.filter(n => n.videoId === null);
  }

  async softDeleteNote(id: string): Promise<void> {
    return this.updateNote(id, { deletedAt: Date.now() });
  }

  async restoreNote(id: string): Promise<void> {
    return this.updateNote(id, { deletedAt: null });
  }

  async permanentlyDeleteNote(id: string): Promise<void> {
    return this.storage.deleteItem(this.STORE_NAME, id);
  }

  async getDeletedNotes(): Promise<VideoNote[]> {
    const all = await this.storage.getAllItems(this.STORE_NAME);
    return all.filter(n => n.deletedAt !== null);
  }

  async orphanNotesForVideo(videoId: string): Promise<void> {
    const all = await this.storage.getAllItems(this.STORE_NAME);
    const videoNotes = all.filter(n => n.videoId === videoId);
    for (const note of videoNotes) {
      await this.updateNote(note.id, { videoId: null });
    }
  }

  async migrateLegacyBookmarksIfNeeded(): Promise<void> {
    try {
      if (localStorage.getItem('local_player_notes_migration_done') === 'true') {
        return;
      }

      // Snapshot all matching keys beforehand to prevent index shifts during async awaits
      const legacyKeys = Object.keys(localStorage).filter(key => key.startsWith('local_player_bm_'));

      // Check existing notes to avoid duplicating notes on re-runs
      const existingNotes = await this.getAllNotes();

      for (const key of legacyKeys) {
        try {
          const videoId = key.substring('local_player_bm_'.length);
          const rawData = localStorage.getItem(key);
          if (rawData) {
            const bookmarks = JSON.parse(rawData);
            if (Array.isArray(bookmarks)) {
              for (const bm of bookmarks) {
                const noteText = bm.note || bm.text || '';
                const timeVal = bm.time !== undefined ? bm.time : (bm.timestampInVideo !== undefined ? bm.timestampInVideo : (bm.timestamp !== undefined ? bm.timestamp : null));
                const parsedTime = timeVal !== null && !isNaN(Number(timeVal)) ? Number(timeVal) : null;
                const targetVid = bm.videoId || videoId;

                const alreadyExists = existingNotes.some(n => 
                  n.videoId === targetVid && 
                  n.text === noteText && 
                  n.timestampInVideo === parsedTime
                );

                if (!alreadyExists) {
                  await this.createNote({
                    videoId: targetVid,
                    videoName: bm.videoName || 'فيديو',
                    folderName: bm.folderName || '',
                    timestampInVideo: parsedTime,
                    text: noteText,
                    textColor: bm.color || bm.textColor || null,
                    images: Array.isArray(bm.images) ? bm.images : [],
                    audio: bm.audio || null,
                    isPinned: !!bm.isPinned
                  });
                }
              }
            }
          }
        } catch (e) {
          console.error('[NotesService] Error migrating legacy bookmark key:', key, e);
        }
      }

      localStorage.setItem('local_player_notes_migration_done', 'true');
    } catch (e) {
      console.error('[NotesService] Migration failed:', e);
    }
  }
}
