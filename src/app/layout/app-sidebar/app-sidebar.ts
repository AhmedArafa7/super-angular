import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarService } from '../../core/sidebar.service';
import { ALL_NAV_ITEMS, NavItem, getVisibleNavItems } from '../../core/nav-items';
import { LucideDynamicIcon } from '@lucide/angular';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideDynamicIcon],
  templateUrl: './app-sidebar.html',
  styleUrls: ['./app-sidebar.scss']
})
export class AppSidebarComponent {
  sidebar = inject(SidebarService);
  
  // TODO: Connect user auth state
  userRole: string | null = 'admin'; 
  
  get visibleItems(): NavItem[] {
    return getVisibleNavItems(this.userRole, ALL_NAV_ITEMS);
  }

  get pinnedItems(): NavItem[] {
    return this.visibleItems.filter(item => 
      item.isPermanent || this.sidebar.pinnedItems().includes(item.id as any)
    );
  }
}
