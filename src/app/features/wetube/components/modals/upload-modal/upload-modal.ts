import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, X, Upload } from 'lucide-angular';

@Component({
  selector: 'app-upload-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './upload-modal.html',
  styleUrls: ['./upload-modal.scss']
})
export class UploadModalComponent {
  @Input() isOpen: boolean = false;
  @Output() close = new EventEmitter<void>();
  
  X = X;
  Upload = Upload;
  title = '';
  description = '';
  category = 'تكنولوجيا';
  visibility = 'public';
  
  categories = ['تكنولوجيا', 'برمجة', 'ألعاب', 'موسيقى', 'تعليم', 'ترفيه'];
  visibilities = [
    { value: 'public', label: 'عام' },
    { value: 'unlisted', label: 'غير مدرج' },
    { value: 'private', label: 'خاص' }
  ];
  
  onClose() {
    this.close.emit();
  }
  
  onUpload() {
    console.log('Uploading video:', { title: this.title, description: this.description, category: this.category, visibility: this.visibility });
    this.onClose();
  }
}
