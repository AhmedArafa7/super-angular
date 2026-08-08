import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { LucideAngularModule, Bell, Video, User, CheckCheck, Sparkles, Tv } from 'lucide-angular';
import { halaltubeService } from '../../halaltube.service';

@Component({
  selector: 'app-halaltube-notifications',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './halaltube-notifications.html',
  styleUrls: ['./halaltube-notifications.scss']
})
export class halaltubeNotificationsComponent implements OnInit {
  halaltube = inject(halaltubeService);
  router = inject(Router);

  Bell = Bell;
  Video = Video;
  User = User;
  CheckCheck = CheckCheck;
  Sparkles = Sparkles;
  Tv = Tv;

  readNotifIds = signal<Set<string>>(new Set());

  ngOnInit() {
    this.halaltube.loadSubscriptionsFeed();
  }

  notifications = computed(() => {
    const feed = this.halaltube.subscriptionsFeed();
    const home = this.halaltube.allHomeContent().slice(0, 10);
    const readSet = this.readNotifIds();

    const notifs: any[] = [];

    // Notifications from subscribed channels
    feed.forEach((v: any, idx: number) => {
      const id = 'sub_' + v.id;
      notifs.push({
        id,
        videoId: v.id,
        type: 'video',
        channel: v.author || 'قناة مُشترَك بها',
        message: `تم نشر فيديو جديد: "${v.title}"`,
        time: 'مؤخراً',
        avatar: v.channelAvatar || v.thumbnail,
        read: readSet.has(id)
      });
    });

    // Whitelisted / Featured content notifications
    home.forEach((v: any) => {
      if (v.isWhitelisted) {
        const id = 'wl_' + v.id;
        notifs.push({
          id,
          videoId: v.id,
          type: 'subscribe',
          channel: v.author || 'halaltube Whitelist',
          message: `تمت إضافة فيديو جديد مُميز للقائمة البيضاء: "${v.title}"`,
          time: 'اليوم',
          avatar: v.thumbnail,
          read: readSet.has(id)
        });
      }
    });

    return notifs;
  });

  markAllAsRead() {
    const allIds = new Set(this.notifications().map(n => n.id));
    this.readNotifIds.set(allIds);
  }

  openNotification(notif: any) {
    this.readNotifIds.update(set => {
      const next = new Set(set);
      next.add(notif.id);
      return next;
    });
    if (notif.videoId) {
      this.router.navigate(['/stream/watch', notif.videoId]);
    }
  }
}
