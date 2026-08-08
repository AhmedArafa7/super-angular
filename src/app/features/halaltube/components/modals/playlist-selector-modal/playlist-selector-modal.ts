import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, X, Plus, ListVideo, Lock, Globe } from 'lucide-angular';

@Component({
  selector: 'app-playlist-selector-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './playlist-selector-modal.html',
  styleUrls: ['./playlist-selector-modal.scss']
})
export class PlaylistSelectorModalComponent {
  @Input() isOpen: boolean = false;
  @Output() close = new EventEmitter<void>();
  @Output() select = new EventEmitter<string>();
  @Output() create = new EventEmitter<{name: string, isPrivate: boolean}>();
  
  X = X;
  Plus = Plus;
  ListVideo = ListVideo;
  Lock = Lock;
  Globe = Globe;
  
  newPlaylistName = '';
  isPrivate = false;
  
  playlists = [
    { id: 'p1', name: 'مشاهدة لاحقاً', count: 12, isPrivate: true },
    { id: 'p2', name: 'مفضلتي', count: 45, isPrivate: false },
    { id: 'p3', name: 'تعليمي', count: 23, isPrivate: false }
  ];
  
  onClose() {
    this.close.emit();
  }
  
  onCreate() {
    if (this.newPlaylistName.trim()) {
      this.create.emit({ name: this.newPlaylistName, isPrivate: this.isPrivate });
      this.newPlaylistName = '';
      this.isPrivate = false;
    }
  }
}
