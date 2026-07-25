import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, MessageCircle, ThumbsUp } from 'lucide-angular';

@Component({
  selector: 'app-watch-comments',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './watch-comments.html',
  styleUrls: ['./watch-comments.scss']
})
export class WatchCommentsComponent {
  @Input() comments: any[] = [];
  @Input() commentCount: number = 0;
  
  MessageCircle = MessageCircle;
  ThumbsUp = ThumbsUp;
  newComment = '';
  
  localComments = signal<any[]>([]);

  get displayComments() {
    const external = this.comments || [];
    const local = this.localComments();
    return [...local, ...external];
  }
  
  addComment() {
    if (this.newComment.trim()) {
      const newEntry = {
        id: Date.now(),
        author: 'أنت',
        avatar: 'Y',
        authorThumb: '',
        text: this.newComment.trim(),
        likes: 0,
        time: 'الآن'
      };
      this.localComments.update(c => [newEntry, ...c]);
      this.newComment = '';
    }
  }
}
