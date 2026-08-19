import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { AppSidebarComponent } from '../app-sidebar/app-sidebar';
import { AppHeaderComponent } from '../app-header/app-header';
import { SidebarService } from '../../core/sidebar.service';
import { SyncMonitorComponent } from './sync-monitor/sync-monitor';
import { SessionPurgeService } from '../../core/services/session-purge.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    AppSidebarComponent,
    AppHeaderComponent,
    SyncMonitorComponent,
  ],
  templateUrl: './app-shell.html',
  styleUrls: ['./app-shell.scss']
})
export class AppShellComponent {
  sidebar = inject(SidebarService);
  router = inject(Router);
  sessionPurge = inject(SessionPurgeService);
  ishalaltubeRoute = signal(false);
  isArcadeArenaRoute = signal(false);
  isInitialized = signal(false);

  // Touch Swipe Gesture Tracking
  private touchStartX = 0;
  private touchStartY = 0;
  private isTouchSwipeActive = false;

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.ishalaltubeRoute.set(event.url.includes('/stream'));
      this.isArcadeArenaRoute.set(event.url.includes('/arcade/arena/'));
      this.isInitialized.set(true);
    });
    
    if (this.router.navigated) {
      this.ishalaltubeRoute.set(this.router.url.includes('/stream'));
      this.isArcadeArenaRoute.set(this.router.url.includes('/arcade/arena/'));
      this.isInitialized.set(true);
    }
  }

  restoreSidebar() {
    this.sidebar.setVisible(true);
  }

  // --- Touch Gestures (Swipe to Reveal / Swipe to Tuck Away) ---
  onTouchStart(e: TouchEvent) {
    if (e.touches && e.touches.length === 1) {
      this.touchStartX = e.touches[0].clientX;
      this.touchStartY = e.touches[0].clientY;
      this.isTouchSwipeActive = true;
    }
  }

  onTouchEnd(e: TouchEvent) {
    if (!this.isTouchSwipeActive || !e.changedTouches || e.changedTouches.length === 0) return;
    this.isTouchSwipeActive = false;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const dx = touchEndX - this.touchStartX;
    const dy = touchEndY - this.touchStartY;

    // Only trigger if horizontal swipe is predominant
    if (Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy) * 1.15) {
      const pos = this.sidebar.position();
      const screenW = typeof window !== 'undefined' ? window.innerWidth : 1000;

      // 1. Sidebar is on the LEFT (default)
      if (pos === 'left') {
        // Swipe Right from Left Edge or when tucked -> Restore sidebar state as it was
        if (dx > 40 && (!this.sidebar.isVisible() || this.touchStartX < 60)) {
          this.restoreSidebar();
        }
        // Swipe Left from Sidebar area -> Tuck into the side
        else if (dx < -45 && this.sidebar.isVisible() && this.touchStartX < (this.sidebar.isCollapsed() ? 110 : this.sidebar.width() + 40)) {
          this.sidebar.setVisible(false);
        }
      }

      // 2. Sidebar is on the RIGHT
      else if (pos === 'right') {
        // Swipe Left from Right Edge or when tucked -> Restore sidebar state as it was
        if (dx < -40 && (!this.sidebar.isVisible() || this.touchStartX > (screenW - 60))) {
          this.restoreSidebar();
        }
        // Swipe Right from Sidebar area -> Tuck into the side
        else if (dx > 45 && this.sidebar.isVisible() && this.touchStartX > (screenW - (this.sidebar.isCollapsed() ? 110 : this.sidebar.width() + 40))) {
          this.sidebar.setVisible(false);
        }
      }
    }
  }
}
