import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Play, Pause, Volume2, VolumeX, Maximize, Settings } from 'lucide-angular';

@Component({
  selector: 'app-watch-player',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './watch-player.html',
  styleUrls: ['./watch-player.scss']
})
export class WatchPlayerComponent {
  @Input() videoUrl: string = '';
  @Input() thumbnail: string = '';
  @Input() title: string = '';
  
  Play = Play;
  Pause = Pause;
  Volume2 = Volume2;
  VolumeX = VolumeX;
  Maximize = Maximize;
  Settings = Settings;
  
  isPlaying = false;
  isMuted = false;
  currentTime = 0;
  duration = 0;
  volume = 80;
  
  togglePlay() {
    this.isPlaying = !this.isPlaying;
  }
  
  toggleMute() {
    this.isMuted = !this.isMuted;
  }
  
  toggleFullscreen() {
    const elem = document.querySelector('.video-container');
    if (elem && document.fullscreenEnabled) {
      if (!document.fullscreenElement) {
        elem.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    }
  }
  
  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
