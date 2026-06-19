import { Component, Input, Output, EventEmitter } from '@angular/core';
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
  
  channels = [
    { id: 'ch1', title: 'Si-Neuro Engineering', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Si-Neuro', notifications: true, sync: 'all' },
    { id: 'ch2', title: 'Code Master', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Code', notifications: true, sync: 'long' },
    { id: 'ch3', title: 'Tech News Daily', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Tech', notifications: false, sync: 'all' }
  ];
  
  onClose() {
    this.close.emit();
  }
}
