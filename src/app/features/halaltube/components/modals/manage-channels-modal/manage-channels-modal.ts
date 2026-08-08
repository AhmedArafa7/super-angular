import { Component, Input, Output, EventEmitter, inject, computed } from '@angular/core';
import { halaltubeService } from '../../../halaltube.service';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, X, Settings, Trash2, Download, Bell, BellOff } from 'lucide-angular';

@Component({
  selector: 'app-manage-channels-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './manage-channels-modal.html',
  styleUrls: ['./manage-channels-modal.scss']
})
export class ManageChannelsModalComponent {
  @Input() isOpen: boolean = false;
  @Output() close = new EventEmitter<void>();
  @Output() remove = new EventEmitter<string>();
  @Output() toggleNotifications = new EventEmitter<string>();
  
  X = X;
  Settings = Settings;
  Trash2 = Trash2;
  Download = Download;
  Bell = Bell;
  BellOff = BellOff;
  
  halaltube = inject(halaltubeService);
  channels = computed(() => this.halaltube.subscriptions());
  
  onClose() {
    this.close.emit();
  }
}
