import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, X, Plus, ListVideo, Lock, Globe, Check, Bell, Flame } from 'lucide-angular';
import { HalaltubePlaylistService } from '../../../services/halaltube-playlist.service';
import { HalalPlaylist } from '../../../models/halaltube-playlist.model';

@Component({
  selector: 'app-playlist-selector-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './playlist-selector-modal.html',
  styleUrls: ['./playlist-selector-modal.scss']
})
export class PlaylistSelectorModalComponent {
  playlistSvc = inject(HalaltubePlaylistService);

  @Input() isOpen: boolean = false;
  @Input() videoToSave?: any;
  @Output() close = new EventEmitter<void>();
  @Output() select = new EventEmitter<string>();
  @Output() create = new EventEmitter<{name: string, isPrivate: boolean}>();
  
  X = X;
  Plus = Plus;
  ListVideo = ListVideo;
  Lock = Lock;
  Globe = Globe;
  Check = Check;
  Bell = Bell;
  Flame = Flame;
  
  newPlaylistName = '';
  newPlaylistDesc = '';
  isPrivate = false;
  enableStudyPlan = true;
  dailyTarget = 1;
  
  get playlists(): HalalPlaylist[] {
    return this.playlistSvc.playlists();
  }

  isVideoInPlaylist(playlist: HalalPlaylist): boolean {
    if (!this.videoToSave) return false;
    const vId = this.videoToSave.id || this.videoToSave.videoId;
    return (playlist.videos || []).some(v => v.id === vId);
  }

  async togglePlaylist(playlist: HalalPlaylist) {
    if (!this.videoToSave) {
      this.select.emit(playlist.id);
      return;
    }

    const vId = this.videoToSave.id || this.videoToSave.videoId;
    const isIn = this.isVideoInPlaylist(playlist);

    if (isIn) {
      await this.playlistSvc.removeVideoFromPlaylist(playlist.id, vId);
    } else {
      await this.playlistSvc.addVideoToPlaylist(playlist.id, {
        id: vId,
        title: this.videoToSave.title || 'فيديو',
        thumbnail: this.videoToSave.thumbnail,
        author: this.videoToSave.author || 'قناة',
        duration: this.videoToSave.duration || ''
      });
    }

    this.select.emit(playlist.id);
  }
  
  onClose() {
    this.close.emit();
  }
  
  async onCreate() {
    const name = this.newPlaylistName.trim();
    if (!name) return;

    const initialVideos = [];
    if (this.videoToSave) {
      const vId = this.videoToSave.id || this.videoToSave.videoId;
      initialVideos.push({
        id: vId,
        title: this.videoToSave.title || 'فيديو',
        thumbnail: this.videoToSave.thumbnail || `https://img.youtube.com/vi/${vId}/hqdefault.jpg`,
        author: this.videoToSave.author || 'قناة',
        duration: this.videoToSave.duration || '',
        addedAt: Date.now(),
        watched: false,
        order: 0,
        source: 'youtube' as const
      });
    }

    const created = await this.playlistSvc.createPlaylist(
      name,
      this.newPlaylistDesc,
      this.isPrivate,
      initialVideos,
      {
        enabled: this.enableStudyPlan,
        dailyTarget: this.dailyTarget,
        reminderIntervalMinutes: 60,
        scheduledTime: '20:00'
      }
    );

    this.create.emit({ name, isPrivate: this.isPrivate });
    this.newPlaylistName = '';
    this.newPlaylistDesc = '';
    this.isPrivate = false;
    this.onClose();
  }
}
