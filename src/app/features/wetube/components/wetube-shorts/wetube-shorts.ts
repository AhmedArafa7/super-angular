import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, ThumbsUp, MessageCircle, Share2, Music } from 'lucide-angular';

@Component({
  selector: 'app-wetube-shorts',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './wetube-shorts.html',
  styleUrls: ['./wetube-shorts.scss']
})
export class WeTubeShortsComponent {
  ThumbsUp = ThumbsUp;
  MessageCircle = MessageCircle;
  Share2 = Share2;
  Music = Music;
  
  shorts = [
    { id: 1, title: 'فيديو قصير 1', likes: 1200, comments: 150 },
    { id: 2, title: 'فيديو قصير 2', likes: 850, comments: 90 },
    { id: 3, title: 'فيديو قصير 3', likes: 2100, comments: 300 }
  ];
}
