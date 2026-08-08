import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, X, Upload, FileText } from 'lucide-angular';

@Component({
  selector: 'app-import-subscriptions-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './import-subscriptions-modal.html',
  styleUrls: ['./import-subscriptions-modal.scss']
})
export class ImportSubscriptionsModalComponent {
  @Input() isOpen: boolean = false;
  @Output() close = new EventEmitter<void>();
  @Output() import = new EventEmitter<string>();
  
  X = X;
  Upload = Upload;
  FileText = FileText;
  selectedFile: File | null = null;
  
  onClose() {
    this.close.emit();
    this.selectedFile = null;
  }
  
  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
  }
  
  onImport() {
    if (this.selectedFile) {
      this.import.emit(this.selectedFile.name);
      this.onClose();
    }
  }
}
