import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, BarChart, Users, Eye, TrendingUp } from 'lucide-angular';

@Component({
  selector: 'app-wetube-studio',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './wetube-studio.html',
  styleUrls: ['./wetube-studio.scss']
})
export class WeTubeStudioComponent {
  stats = [
    { label: 'المشاهدات', value: '125,430', icon: Eye, color: '#3b82f6' },
    { label: 'المشتركون', value: '3,240', icon: Users, color: '#10b981' },
    { label: 'الإيرادات', value: '$1,250', icon: TrendingUp, color: '#f59e0b' },
    { label: 'التفاعل', value: '8.5%', icon: BarChart, color: '#ef4444' }
  ];

  videos = [
    { title: 'فيديو تعليمي 1', views: 12000, likes: 850, status: 'منشور' },
    { title: 'فيديو تعليمي 2', views: 8500, likes: 620, status: 'منشور' },
    { title: 'فيديو تعليمي 3', views: 0, likes: 0, status: 'مسودة' }
  ];
}
