import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, Home, Library, Users, Bell, Video, Film } from 'lucide-angular';

@Component({
  selector: 'app-wetube-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './wetube-sidebar.html',
  styleUrls: ['./wetube-sidebar.scss']
})
export class WeTubeSidebarComponent {
  menuItems = [
    { label: 'الرئيسية', icon: Home, route: '/stream' },
    { label: 'المكتبة', icon: Library, route: '/stream/library' },
    { label: 'الاشتراكات', icon: Users, route: '/stream/subscriptions' },
    { label: 'الإشعارات', icon: Bell, route: '/stream/notifications' },
    { label: 'ستوديو', icon: Video, route: '/stream/studio' },
    { label: 'شورتس', icon: Film, route: '/stream/shorts' }
  ];
}
