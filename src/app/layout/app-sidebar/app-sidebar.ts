import { Component, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarService } from '../../core/sidebar.service';
import { ALL_NAV_ITEMS, NavItem, getVisibleNavItems } from '../../core/nav-items';
import { LucideDynamicIcon } from '@lucide/angular';
import { OfflineQueueService } from '../../core/services/offline-queue.service';
import { FirebaseService } from '../../core/services/firebase.service';
import { LucideAngularModule, LogOut, User, Settings, LayoutDashboard, CloudUpload, CheckCircle2, XCircle, CloudCog } from 'lucide-angular';

import { SidebarItemComponent } from './sidebar-item/sidebar-item.component';
import { FloatingOrbComponent } from './floating-orb/floating-orb.component';
import { CustomizationDialogComponent } from './customization-dialog/customization-dialog.component';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    LucideDynamicIcon, 
    LucideAngularModule,
    SidebarItemComponent, 
    FloatingOrbComponent, 
    CustomizationDialogComponent
  ],
  templateUrl: './app-sidebar.html',
  styleUrls: ['./app-sidebar.scss'],
  host: {
    'class': 'contents'
  }
})
export class AppSidebarComponent {
  sidebar = inject(SidebarService);
  offlineQueue = inject(OfflineQueueService);
  firebase = inject(FirebaseService);
  
  userRole: string | null = 'admin'; 
  showCustomizationDialog = false;
  showUserProfileDropdown = false;
  
  // Icons
  LogOut = LogOut;
  User = User;
  Settings = Settings;
  LayoutDashboard = LayoutDashboard;
  CloudUpload = CloudUpload;
  CheckCircle2 = CheckCircle2;
  XCircle = XCircle;
  CloudCog = CloudCog;
  
  get visibleItems(): NavItem[] {
    return getVisibleNavItems(this.userRole, ALL_NAV_ITEMS);
  }

  get pinnedItems(): NavItem[] {
    return this.visibleItems.filter(item => 
      item.isPermanent || this.sidebar.pinnedItems().includes(item.id as any)
    );
  }

  // Keyboard Shortcut: Ctrl + B or Cmd + B to toggle sidebar
  @HostListener('window:keydown.control.b', ['$event'])
  @HostListener('window:keydown.meta.b', ['$event'])
  handleKeyboardToggle(event: Event) {
    const e = event as KeyboardEvent;
    e.preventDefault();
    if (this.sidebar.position() === 'left') {
      this.sidebar.toggleCollapsed();
    } else {
      this.sidebar.setPosition('left');
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    this.showUserProfileDropdown = false;
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
    
    let newWidth = event.clientX;
    
    if (newWidth < 180) newWidth = 180;
    if (newWidth > 450) newWidth = 450;
    
    this.sidebar.setWidth(newWidth);
  }

  @HostListener('window:mouseup', ['$event'])
  onMouseUp(event: MouseEvent) {
    if (this.sidebar.isResizing()) {
      this.sidebar.setIsResizing(false);
      if (typeof document !== 'undefined') {
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
      }
    }
  }

  startResizing(event: MouseEvent) {
    event.preventDefault();
    this.sidebar.setIsResizing(true);
    if (typeof document !== 'undefined') {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }
  }

  toggleProfileDropdown(event: Event) {
    event.stopPropagation();
    this.showUserProfileDropdown = !this.showUserProfileDropdown;
  }
}
