import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { AppSidebarComponent } from '../app-sidebar/app-sidebar';
import { AppHeaderComponent } from '../app-header/app-header';
import { SidebarService } from '../../core/sidebar.service';
import { LucideDynamicIcon } from '@lucide/angular';
import { SyncMonitorComponent } from './sync-monitor/sync-monitor';
//import { OnboardingComponent } from '../../shared/onboarding/onboarding';
//import { PrivacyConsentComponent } from '../../shared/privacy/privacy';

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
    //OnboardingComponent,
    //PrivacyConsentComponent
  ],
  templateUrl: './app-shell.html',
  styleUrls: ['./app-shell.scss']
})
export class AppShellComponent {
  sidebar = inject(SidebarService);
  router = inject(Router);
  isWeTubeRoute = signal(false);
  isBakeryRoute = signal(false);
  isInitialized = signal(false);

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.isWeTubeRoute.set(event.url.includes('/stream'));
      this.isBakeryRoute.set(event.url.includes('/bakery'));
      this.isInitialized.set(true);
    });
    
    if (this.router.navigated) {
      this.isWeTubeRoute.set(this.router.url.includes('/stream'));
      this.isBakeryRoute.set(this.router.url.includes('/bakery'));
      this.isInitialized.set(true);
    }
  }
}
