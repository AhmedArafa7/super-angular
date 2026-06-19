import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, X, Scissors } from 'lucide-angular';

@Component({
  selector: 'app-clip-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './clip-modal.html',
  styleUrls: ['./clip-modal.scss']
})
export class ClipModalComponent {
  @Input() isOpen: boolean = false;
  @Input() maxDuration: number = 60;
  @Output() close = new EventEmitter<void>();
  @Output() create = new EventEmitter<{start: number, end: number, title: string}>();
  
  X = X;
  Scissors = Scissors;
  startTime = 0;
  endTime = 10;
  clipTitle = '';
  
  onClose() {
    this.close.emit();
  }
  
  onCreate() {
    this.create.emit({ start: this.startTime, end: this.endTime, title: this.clipTitle });
    this.clipTitle = '';
    this.onClose();
  }
}
