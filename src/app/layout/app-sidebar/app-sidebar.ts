import { Component, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarService } from '../../core/sidebar.service';
import { ALL_NAV_ITEMS, NavItem, getVisibleNavItems } from '../../core/nav-items';
import { LucideDynamicIcon } from '@lucide/angular';

import { SidebarItemComponent } from './sidebar-item/sidebar-item.component';

import { FloatingOrbComponent } from './floating-orb/floating-orb.component';
import { CustomizationDialogComponent } from './customization-dialog/customization-dialog.component';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideDynamicIcon, SidebarItemComponent, FloatingOrbComponent, CustomizationDialogComponent],
  templateUrl: './app-sidebar.html',
  styleUrls: ['./app-sidebar.scss']
})
export class AppSidebarComponent {
  sidebar = inject(SidebarService);
  
  userRole: string | null = 'admin'; 
  showCustomizationDialog = false;
  
  get visibleItems(): NavItem[] {
    return getVisibleNavItems(this.userRole, ALL_NAV_ITEMS);
  }

  get pinnedItems(): NavItem[] {
    return this.visibleItems.filter(item => 
      item.isPermanent || this.sidebar.pinnedItems().includes(item.id as any)
    );
  }

  // Handle responsive layout automatically
  @HostListener('window:resize')
  onResize() {
    if (window.innerWidth < 768) {
      this.sidebar.isMobile.set(true);
      if (this.sidebar.position() === 'left') {
        this.sidebar.setPosition('bottom');
      }
    } else {
      this.sidebar.isMobile.set(false);
      if (this.sidebar.position() === 'bottom') {
        this.sidebar.setPosition('left');
      }
    }
  }

  ngOnInit() {
    this.onResize(); // Initial check
  }

  // --- Resizing Logic ---
  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (!this.sidebar.isResizing()) return;
    
    // Sidebar is on the left side of the screen. Width = clientX
    let newWidth = event.clientX;
    
    if (newWidth < 180) newWidth = 180;
    if (newWidth > 450) newWidth = 450;
    
    this.sidebar.setWidth(newWidth);
  }

  @HostListener('window:mouseup', ['$event'])
  onMouseUp(event: MouseEvent) {
    if (this.sidebar.isResizing()) {
      this.sidebar.setIsResizing(false);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    }
  }

  startResizing(event: MouseEvent) {
    event.preventDefault();
    this.sidebar.setIsResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }
}
