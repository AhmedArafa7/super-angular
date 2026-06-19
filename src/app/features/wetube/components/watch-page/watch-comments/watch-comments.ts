import { Component, Input } from '@angular/core';
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
  
  defaultComments = [
    { id: 1, author: 'أحمد محمد', avatar: 'A', text: 'فيديو رائع! شكراً على هذا المحتوى المميز', likes: 245, time: 'منذ ساعتين' },
    { id: 2, author: 'سارة علي', avatar: 'S', text: 'استفدت كثيراً من هذا الشرح', likes: 128, time: 'منذ 5 ساعات' },
    { id: 3, author: 'محمد حسن', avatar: 'M', text: 'في انتظار المزيد من هذا النوع من المحتوى', likes: 89, time: 'منذ يوم' }
  ];
  
  get displayComments() {
    return this.comments.length > 0 ? this.comments : this.defaultComments;
  }
  
  addComment() {
    if (this.newComment.trim()) {
      this.defaultComments.unshift({
        id: Date.now(),
        author: 'أنت',
        avatar: 'Y',
        text: this.newComment,
        likes: 0,
        time: 'الآن'
      });
      this.newComment = '';
    }
  }
}
