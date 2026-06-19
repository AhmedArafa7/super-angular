import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AppSidebarComponent } from '../app-sidebar/app-sidebar';
import { AppHeaderComponent } from '../app-header/app-header';
import { SidebarService } from '../../core/sidebar.service';
import { LucideDynamicIcon } from '@lucide/angular';
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
    LucideDynamicIcon,
    //OnboardingComponent,
    //PrivacyConsentComponent
  ],
  templateUrl: './app-shell.html',
  styleUrls: ['./app-shell.scss']
})
export class AppShellComponent {
  sidebar = inject(SidebarService);
}
