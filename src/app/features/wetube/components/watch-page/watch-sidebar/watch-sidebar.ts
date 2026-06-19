import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-watch-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './watch-sidebar.html',
  styleUrls: ['./watch-sidebar.scss']
})
export class WatchSidebarComponent {
  recommendations = [
    { id: 'r1', title: 'تعلم Angular 21 - دورة شاملة للمبتدئين', author: 'Code Master', views: '125K', time: 'منذ أسبوع', thumbnail: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=400', duration: '45:20' },
    { id: 'r2', title: 'أفضل ممارسات TypeScript في 2026', author: 'TypeScript Pro', views: '89K', time: 'منذ 3 أيام', thumbnail: 'https://images.unsplash.com/photo-1540553016722-983e48a2cd10?auto=format&fit=crop&q=80&w=400', duration: '32:15' },
    { id: 'r3', title: 'بناء تطبيقات ويب حديثة بـ Signals', author: 'Angular Expert', views: '67K', time: 'منذ يومين', thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=400', duration: '28:45' },
    { id: 'r4', title: 'شرح مفصل لـ Standalone Components', author: 'Web Dev Guide', views: '45K', time: 'منذ 5 أيام', thumbnail: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=400', duration: '18:30' },
    { id: 'r5', title: 'تطوير تطبيقات الجوال بـ Capacitor', author: 'Mobile Dev', views: '34K', time: 'منذ أسبوع', thumbnail: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=400', duration: '22:10' }
  ];
}
