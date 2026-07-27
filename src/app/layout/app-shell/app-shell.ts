import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { AppSidebarComponent } from '../app-sidebar/app-sidebar';
import { AppHeaderComponent } from '../app-header/app-header';
import { SidebarService } from '../../core/sidebar.service';
import { LucideDynamicIcon } from '@lucide/angular';
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
    LucideDynamicIcon,
  ],
  templateUrl: './app-shell.html',
  styleUrls: ['./app-shell.scss']
})
export class AppShellComponent {
  sidebar = inject(SidebarService);
  router = inject(Router);
  sessionPurge = inject(SessionPurgeService); // Initialize session purge monitoring
  isWeTubeRoute = signal(false);
  isInitialized = signal(false);

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.isWeTubeRoute.set(event.url.includes('/stream'));
      this.isInitialized.set(true);
    });
    
    if (this.router.navigated) {
      this.isWeTubeRoute.set(this.router.url.includes('/stream'));
      this.isInitialized.set(true);
    }
  }
}
