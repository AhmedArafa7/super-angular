import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarService } from '../../core/sidebar.service';
import { LucideDynamicIcon } from '@lucide/angular';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, LucideDynamicIcon],
  templateUrl: './app-header.html',
  styleUrls: ['./app-header.scss']
})
export class AppHeaderComponent {
  sidebar = inject(SidebarService);
  unreadCount = 0; // TODO: Connect to Notification Service
}
