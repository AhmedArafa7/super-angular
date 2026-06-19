import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Play, Music } from 'lucide-angular';

@Component({
  selector: 'app-youtube-thumbnail',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './youtube-thumbnail.html',
  styleUrls: ['./youtube-thumbnail.scss']
})
export class YoutubeThumbnailComponent {
  @Input() thumbnail: string = '';
  @Input() duration: string = '';
  @Input() title: string = '';
  @Input() hasMusic: boolean = false;
  @Input() isShorts: boolean = false;
  
  Play = Play;
  Music = Music;
  imageError = false;
  
  onError() {
    this.imageError = true;
  }
}
