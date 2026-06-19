import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Bell, Video, User } from 'lucide-angular';

@Component({
  selector: 'app-wetube-notifications',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './wetube-notifications.html',
  styleUrls: ['./wetube-notifications.scss']
})
export class WeTubeNotificationsComponent {
  Bell = Bell;
  Video = Video;
  User = User;
  
  notifications = [
    { type: 'video', channel: 'قناة التقنية', message: "رفع فيديو جديد: تعلم Angular في 30 دقيقة", time: 'منذ 5 دقائق', read: false },
    { type: 'comment', channel: 'تعلم البرمجة', message: 'علق على فيديوك: شرح رائع!', time: 'منذ ساعة', read: false },
    { type: 'subscribe', channel: 'مطور ويب', message: 'اشترك في قناتك', time: 'منذ 3 ساعات', read: true },
    { type: 'video', channel: 'أخبار التكنولوجيا', message: "رفع فيديو جديد: أحدث إصدارات Angular 21", time: 'منذ يوم', read: true }
  ];
}
