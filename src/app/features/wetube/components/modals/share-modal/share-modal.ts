import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, X, Link, Download } from 'lucide-angular';

@Component({
  selector: 'app-share-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './share-modal.html',
  styleUrls: ['./share-modal.scss']
})
export class ShareModalComponent {
  @Input() isOpen: boolean = false;
  @Input() videoUrl: string = '';
  @Output() close = new EventEmitter<void>();
  
  X = X;
  Link = Link;
  Download = Download;
  
  copied = false;
  
  copyLink() {
    navigator.clipboard.writeText(this.videoUrl).then(() => {
      this.copied = true;
      setTimeout(() => this.copied = false, 2000);
    });
  }
  
  onClose() {
    this.close.emit();
  }
}
