import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-video-source-detector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './video-source-detector.html',
  styleUrls: ['./video-source-detector.scss']
})
export class VideoSourceDetectorComponent {
  @Input() url: string = '';
  @Input() source: string = '';
  
  get detectedSource() {
    if (this.source) return this.source;
    if (!this.url) return 'unknown';
    if (this.url.includes('youtube.com') || this.url.includes('youtu.be')) return 'youtube';
    if (this.url.includes('drive.google.com')) return 'drive';
    if (this.url.startsWith('http')) return 'external';
    return 'local';
  }
  
  get sourceLabel() {
    const labels: {[key: string]: string} = {
      'youtube': 'YouTube',
      'drive': 'Google Drive',
      'platform': 'منصة NexusAI',
      'local': 'ملف محلي',
      'external': 'رابط خارجي',
      'unknown': 'غير محدد'
    };
    return labels[this.detectedSource] || this.detectedSource;
  }
  
  get sourceColor() {
    const colors: {[key: string]: string} = {
      'youtube': '#ff0000',
      'drive': '#4285f4',
      'platform': '#3b82f6',
      'local': '#10b981',
      'external': '#f59e0b',
      'unknown': '#888'
    };
    return colors[this.detectedSource] || '#888';
  }
}
