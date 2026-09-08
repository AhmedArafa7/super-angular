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
}
