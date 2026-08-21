import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { NotificationService, AppNotification } from '../../core/notification.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.scss']
})
export class NotificationsComponent {
  notificationService = inject(NotificationService);
  router = inject(Router);

  // Filter state
  activeFilter = signal<'all' | 'content_new' | 'system_broadcast' | 'market_restock'>('all');
  selectedNotification = signal<AppNotification | null>(null);

  // Total count
  totalCount = computed(() => this.notificationService.notifications().length);

  // Filtered list
  filteredNotifications = computed(() => {
    const f = this.activeFilter();
    const list = this.notificationService.notifications();
    if (f === 'all') return list;
    return list.filter(n => n.type === f);
  });

  // Action / Smart Jump
  handleSmartJump(n: AppNotification): void {
    this.notificationService.markAsRead(n.id);
    if (n.routePath) {
      this.router.navigate([n.routePath]);
    } else {
      this.selectedNotification.set(n);
    }
  }

  // Delete notification
  deleteNotification(event: Event, id: string): void {
    event.stopPropagation();
    this.notificationService.deleteNotification(id);
  }

  // Mark all as read
  markAllAsRead(): void {
    this.notificationService.notifications().forEach(n => {
      this.notificationService.markAsRead(n.id);
    });
  }

  // Clear all
  clearAll(): void {
    if (confirm('هل أنت متأكد من مسح جميع التنبيهات؟')) {
      this.notificationService.clearAll();
    }
  }
}
