import { Injectable, signal } from '@angular/core';

export type NotificationType = 'chat_correction' | 'system_broadcast' | 'content_new' | 'market_restock' | 'learning_reminder';
export type NotificationPriority = 'critical' | 'warning' | 'info';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  timestamp: number;
  isRead: boolean;
  routePath?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly STORAGE_KEY = 'Si-Neuro-neural-notifications-v1';

  notifications = signal<AppNotification[]>([]);

  constructor() {
    this.loadState();
  }

  private loadState(): void {
    const dataStr = localStorage.getItem(this.STORAGE_KEY);
    if (dataStr) {
      try {
        const parsed = JSON.parse(dataStr);
        if (parsed.notifications) {
          this.notifications.set(parsed.notifications);
          return;
        }
      } catch (e) {
        console.error("Notifications Load Error", e);
      }
    }

    // Seed spectacular initial notifications for high-fidelity experience
    const seeds: AppNotification[] = [
      {
        id: 'notif_1',
        title: 'تنبيه أمني: تحديث بروتوكول العقدة',
        message: 'تم ترقية نظام الحماية العصبية الثنائي لعقدتك إلى الإصدار V2.8 بنجاح. كافة روابط المراسلة مؤمنة بالكامل.',
        type: 'system_broadcast',
        priority: 'critical',
        timestamp: Date.now() - 3600000 * 2,
        isRead: false
      },
      {
        id: 'notif_2',
        title: 'فيديو جديد في WeTube',
        message: 'تم إضافة حلقة جديدة: "كيف تبني معالجاً عصبياً متكاملاً في مختبرك المنزلي؟" شاهدها الآن.',
        type: 'content_new',
        priority: 'info',
        timestamp: Date.now() - 3600000 * 5,
        isRead: false,
        routePath: '/stream'
      },
      {
        id: 'notif_3',
        title: 'شحنة عتاد جديدة في السوق',
        message: 'تم توفير لوحات تطوير ESP32 وشاشات OLED جديدة في سوق العقد البرمجية. سارع بالشراء باستخدام رصيد BKC.',
        type: 'market_restock',
        priority: 'warning',
        timestamp: Date.now() - 3600000 * 12,
        isRead: true,
        routePath: '/market'
      },
      {
        id: 'notif_4',
        title: 'مراجعة المخطط العصبى',
        message: 'تذكير: لم تقم بإجراء اختبار المحاكاة الأسبوعي في مختبر المتحكمات بعد. قم بالتحقق الآن.',
        type: 'learning_reminder',
        priority: 'info',
        timestamp: Date.now() - 3600000 * 24,
        isRead: true,
        routePath: '/microcontroller-lab'
      }
    ];

    this.notifications.set(seeds);
    this.saveState();
  }

  saveState(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
      notifications: this.notifications()
    }));
  }

  addNotification(title: string, message: string, type: NotificationType, priority: NotificationPriority, routePath?: string): void {
    const newNotif: AppNotification = {
      id: `notif_${Math.random().toString(36).substr(2, 9)}`,
      title,
      message,
      type,
      priority,
      timestamp: Date.now(),
      isRead: false,
      routePath
    };

    this.notifications.update(list => [newNotif, ...list]);
    this.saveState();
  }

  markAsRead(id: string): void {
    this.notifications.update(list => {
      return list.map(n => n.id === id ? { ...n, isRead: true } : n);
    });
    this.saveState();
  }

  clearAll(): void {
    this.notifications.set([]);
    this.saveState();
  }
}
