import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, X, Plus } from 'lucide-angular';

@Component({
  selector: 'app-add-channel-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './add-channel-modal.html',
  styleUrls: ['./add-channel-modal.scss']
})
export class AddChannelModalComponent {
  @Input() isOpen: boolean = false;
  @Output() close = new EventEmitter<void>();
  @Output() add = new EventEmitter<string>();
  
  X = X;
  Plus = Plus;
  channelUrl = '';
  autoSyncType: 'all' | 'long' | 'shorts' | 'none' = 'all';
  
  onClose() {
    this.close.emit();
  }
  
  onAdd() {
    if (this.channelUrl.trim()) {
      this.add.emit(this.channelUrl);
      this.channelUrl = '';
      this.onClose();
    }
  }
}
