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
  
  notifications: any[] = [];
}
