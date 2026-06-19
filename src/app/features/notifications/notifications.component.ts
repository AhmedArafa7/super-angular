import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { NotificationService, AppNotification } from '../../core/notification.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, LucideDynamicIcon],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.scss']
})
export class NotificationsComponent {
  notificationService = inject(NotificationService);
  router = inject(Router);

  // States
  selectedBroadcast = signal<AppNotification | null>(null);

  // Get Type Icon helper
  getTypeIcon(type: string): string {
    switch (type) {
      case 'chat_correction': return 'edit-3';
      case 'system_broadcast': return 'info';
      case 'content_new': return 'video';
      case 'market_restock': return 'shopping-bag';
      case 'learning_reminder': return 'graduation-cap';
      default: return 'bell';
    }
  }

  // Get Priority styles helper
  getPriorityStyles(n: AppNotification): string {
    if (n.type !== 'system_broadcast') {
      return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
    }
    switch (n.priority) {
      case 'critical': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'warning': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default: return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
  }

  // Handle CTA action
  handleAction(n: AppNotification): void {
    this.notificationService.markAsRead(n.id);
    if (n.type === 'system_broadcast') {
      this.selectedBroadcast.set(n);
    } else if (n.routePath) {
      this.router.navigate([n.routePath]);
    }
  }
}
