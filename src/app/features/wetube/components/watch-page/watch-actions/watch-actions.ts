import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, ThumbsUp, ThumbsDown, Share2, Download, Plus, Scissors } from 'lucide-angular';

@Component({
  selector: 'app-watch-actions',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './watch-actions.html',
  styleUrls: ['./watch-actions.scss']
})
export class WatchActionsComponent {
  @Input() likes: number = 0;
  @Input() isLiked: boolean = false;
  @Input() isDisliked: boolean = false;
  @Input() isSubscribed: boolean = false;
  @Input() channelName: string = '';
  
  @Output() like = new EventEmitter<void>();
  @Output() dislike = new EventEmitter<void>();
  @Output() subscribe = new EventEmitter<void>();
  @Output() share = new EventEmitter<void>();
  @Output() download = new EventEmitter<void>();
  @Output() clip = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();
  
  ThumbsUp = ThumbsUp;
  ThumbsDown = ThumbsDown;
  Share2 = Share2;
  Download = Download;
  Plus = Plus;
  Scissors = Scissors;
}
