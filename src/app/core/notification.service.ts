import { Injectable, signal, inject } from '@angular/core';
import { FirebaseService } from './services/firebase.service';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

export type NotificationType = 'content_new' | 'chat_correction' | 'system_broadcast' | 'market_restock' | 'learning_reminder';
export type NotificationPriority = 'critical' | 'warning' | 'info';

export interface AppNotification {
  id: string;
  title: string;
  badge?: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  timestamp: number;
  isRead: boolean;
  routePath?: string;
  videoUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private firebase = inject(FirebaseService);
  private readonly STORAGE_KEY = 'Si-Neuro-neural-notifications-v2';

  notifications = signal<AppNotification[]>([]);

  constructor() {
    this.loadState();
    this.initFirestoreSync();
  }

  private loadState(): void {
    const dataStr = localStorage.getItem(this.STORAGE_KEY);
    if (dataStr) {
      try {
        const parsed = JSON.parse(dataStr);
        if (parsed.notifications && Array.isArray(parsed.notifications) && parsed.notifications.length > 0) {
          this.notifications.set(parsed.notifications);
          return;
        }
      } catch (e) {
        console.error("Notifications Load Error", e);
      }
    }

    // Seed matching user screenshot
    const seeds: AppNotification[] = [
      {
        id: 'notif_feed_1',
        title: 'إرسال فيديو جديد',
        badge: 'CONTENT NEW',
        message: '"مطلوب مراجعة المحتوى لـ: "مدرب طيران: ماذا يحدث لو مزحت بشأن خطف الطائرة | بودكاست شعلة"',
        type: 'content_new',
        priority: 'info',
        timestamp: Date.now() - 1000 * 60 * 60 * 24 * 6, // 6 days ago
        isRead: false,
        routePath: '/stream'
      },
      {
        id: 'notif_feed_2',
        title: 'إرسال فيديو جديد',
        badge: 'CONTENT NEW',
        message: '"مطلوب مراجعة المحتوى لـ: "صحابي يهرب من أبوه 🏃‍♂️😳 !! #قرآن #قرآن_كريم #قصص #اكسبلور #تاريخ"',
        type: 'content_new',
        priority: 'info',
        timestamp: Date.now() - 1000 * 60 * 60 * 24 * 18, // 18 days ago
        isRead: false,
        routePath: '/stream'
      },
      {
        id: 'notif_feed_3',
        title: 'إرسال فيديو جديد',
        badge: 'CONTENT NEW',
        message: '"💜 مطلوب مراجعة المحتوى لـ: "لن تتوقع كيف رد على صديقه"',
        type: 'content_new',
        priority: 'info',
        timestamp: Date.now() - 1000 * 60 * 60 * 24 * 18, // 18 days ago
        isRead: false,
        routePath: '/stream'
      },
      {
        id: 'notif_sys_1',
        title: 'تحديث أمني: ترقية بروتوكول العقدة',
        badge: 'SECURITY',
        message: 'تم ترقية نظام التشفير الطرفي E2EE AES-GCM-256 لعقدتك بنجاح. كافة جلسات المراسلة مؤمنة بالكامل.',
        type: 'system_broadcast',
        priority: 'critical',
        timestamp: Date.now() - 1000 * 60 * 60 * 24 * 22,
        isRead: true,
        routePath: '/dashboard'
      },
      {
        id: 'notif_mkt_1',
        title: 'شحنة عتاد جديدة في TechMarket',
        badge: 'STORE UPDATE',
        message: 'تم توفير لوحات تطوير ESP32-S3 وشاشات OLED جديدة في سوق العقد. يمكنك الطلب الآن.',
        type: 'market_restock',
        priority: 'warning',
        timestamp: Date.now() - 1000 * 60 * 60 * 24 * 30,
        isRead: true,
        routePath: '/market'
      }
    ];

    this.notifications.set(seeds);
    this.saveState();
  }

  private initFirestoreSync(): void {
    try {
      if (this.firebase.firestore) {
        const col = collection(this.firebase.firestore, 'notifications');
        onSnapshot(col, (snapshot) => {
          if (!snapshot.empty) {
            const remote: AppNotification[] = [];
            snapshot.forEach(docSnap => {
              remote.push({ id: docSnap.id, ...docSnap.data() } as AppNotification);
            });
            if (remote.length > 0) {
              this.notifications.set(remote);
              this.saveState();
            }
          }
        }, (err) => {
          console.warn('[NotificationService] Firestore sync notice:', err.message);
        });
      }
    } catch (e) {
      console.warn('[NotificationService] Firestore sync init skipped:', e);
    }
  }

  saveState(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
      notifications: this.notifications()
    }));
  }

  addNotification(title: string, message: string, type: NotificationType, priority: NotificationPriority, routePath?: string, badge?: string): void {
    const newNotif: AppNotification = {
      id: `notif_${Math.random().toString(36).substr(2, 9)}`,
      title,
      badge: badge || (type === 'content_new' ? 'CONTENT NEW' : type.toUpperCase()),
      message,
      type,
      priority,
      timestamp: Date.now(),
      isRead: false,
      routePath
    };

    this.notifications.update(list => [newNotif, ...list]);
    this.saveState();

    try {
      if (this.firebase.firestore) {
        const docRef = doc(this.firebase.firestore, 'notifications', newNotif.id);
        setDoc(docRef, newNotif, { merge: true });
      }
    } catch (e) {}
  }

  markAsRead(id: string): void {
    this.notifications.update(list => {
      return list.map(n => n.id === id ? { ...n, isRead: true } : n);
    });
    this.saveState();

    try {
      if (this.firebase.firestore) {
        const docRef = doc(this.firebase.firestore, 'notifications', id);
        setDoc(docRef, { isRead: true }, { merge: true });
      }
    } catch (e) {}
  }

  deleteNotification(id: string): void {
    this.notifications.update(list => list.filter(n => n.id !== id));
    this.saveState();

    try {
      if (this.firebase.firestore) {
        const docRef = doc(this.firebase.firestore, 'notifications', id);
        deleteDoc(docRef);
      }
    } catch (e) {}
  }

  clearAll(): void {
    this.notifications.set([]);
    this.saveState();
  }

  // Format relative time (e.g. "6 days ago", "18 days ago", "Today")
  formatTimeAgo(timestamp: number): string {
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    const diffMonths = Math.floor(diffDays / 30);

    if (diffDays === 0) {
      if (diffHours === 0) return 'Just now';
      return `${diffHours} hours ago`;
    }
    if (diffDays < 30) {
      return `${diffDays} days ago`;
    }
    if (diffMonths < 12) {
      return `${diffMonths} months ago`;
    }
    return `${Math.floor(diffDays / 365)} years ago`;
  }
}
