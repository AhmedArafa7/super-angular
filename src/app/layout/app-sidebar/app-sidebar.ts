import { Component, inject, HostListener, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SidebarService } from '../../core/sidebar.service';
import { ALL_NAV_ITEMS, NavItem, NAV_CATEGORIES, NavCategory, getVisibleNavItems } from '../../core/nav-items';
import { GlobalStateService } from '../../core/services/global-state.service';
import { OfflineQueueService } from '../../core/services/offline-queue.service';
import { FirebaseService } from '../../core/services/firebase.service';
import { CustomModuleStorageService } from '../../features/ai-module-builder/custom-module-viewer.component';
import { LucideAngularModule, LogOut, User, Settings, LayoutDashboard, CloudUpload, CheckCircle2, XCircle, CloudCog, Chrome, UserPlus, Users, Search, ChevronDown, ChevronRight, Moon, Sun, PanelLeftClose, PanelLeftOpen } from 'lucide-angular';

import { SidebarItemComponent } from './sidebar-item/sidebar-item.component';
import { FloatingOrbComponent } from './floating-orb/floating-orb.component';
import { CustomizationDialogComponent } from './customization-dialog/customization-dialog.component';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    FormsModule,
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
  globalState = inject(GlobalStateService);
  moduleStorage = inject(CustomModuleStorageService);
  
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  
  get userRole(): string | null {
    return (this.firebase.userData() as any)?.role || 'admin';
  }
  showCustomizationDialog = false;
  showUserProfileDropdown = false;
  
  searchQuery = signal<string>('');
  isOnline = signal<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  isDarkMode = signal<boolean>(true);
  
  // Resize State
  private startX = 0;
  private startWidth = 0;
  
  // Icons
  LogOut = LogOut;
  User = User;
  Settings = Settings;
  LayoutDashboard = LayoutDashboard;
  CloudUpload = CloudUpload;
  Chrome = Chrome;
  CheckCircle2 = CheckCircle2;
  XCircle = XCircle;
  CloudCog = CloudCog;
  UserPlus = UserPlus;
  Users = Users;
  Search = Search;
  ChevronDown = ChevronDown;
  ChevronRight = ChevronRight;
  Moon = Moon;
  Sun = Sun;
  PanelLeftClose = PanelLeftClose;
  PanelLeftOpen = PanelLeftOpen;

  categories = NAV_CATEGORIES;

  get visibleItems(): NavItem[] {
    const baseItems = getVisibleNavItems(this.userRole, ALL_NAV_ITEMS);
    
    // Dynamically append user-generated custom modules (excluding arcade games)
    const customModules = this.moduleStorage.modules()
      .filter(mod => !mod.id.startsWith('game_') && !mod.id.startsWith('custom_game_') && !mod.title.includes('🎮'))
      .map(mod => ({
        id: `custom-${mod.id}`,
        label: mod.title,
        icon: 'sparkles',
        restricted: false,
        status: 'NEW' as const,
        category: 'ai' as const,
        route: `custom-module/${mod.id}`
      }));

    return [...baseItems, ...customModules];
  }

  get pinnedItems(): NavItem[] {
    const pinnedList = this.sidebar.pinnedItems();
    const visible = this.visibleItems;
    
    // Map pinned IDs to actual NavItem objects in the exact order saved by user
    let items: NavItem[] = [];
    for (const id of pinnedList) {
      const found = visible.find(i => i.id === id);
      if (found && !items.some(i => i.id === found.id)) {
        items.push(found);
      }
    }

    const q = this.searchQuery().trim().toLowerCase();
    if (q) {
      items = items.filter(item => item.label.toLowerCase().includes(q));
    }
    return items;
  }

  get recentItems(): NavItem[] {
    const ids = this.sidebar.recentItemIds();
    return ids.map(id => this.visibleItems.find(i => i.id === id)).filter(Boolean) as NavItem[];
  }

  getItemsByCategory(catId: string): NavItem[] {
    return this.pinnedItems.filter(item => (item.category || 'core') === catId);
  }

  onItemClick(item: NavItem) {
    this.sidebar.addRecentItem(item.id);
  }

  // Keyboard Shortcut: Ctrl + K or Cmd + K to focus search
  @HostListener('window:keydown.control.k', ['$event'])
  @HostListener('window:keydown.meta.k', ['$event'])
  handleSearchFocus(event: Event) {
    event.preventDefault();
    if (this.sidebar.isCollapsed()) {
      this.sidebar.setCollapsed(false);
    }
    setTimeout(() => {
      this.searchInput?.nativeElement?.focus();
    }, 50);
  }

  @HostListener('window:online')
  onOnline() {
    this.isOnline.set(true);
  }

  @HostListener('window:offline')
  onOffline() {
    this.isOnline.set(false);
  }

  toggleTheme() {
    this.isDarkMode.update(v => !v);
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('light', !this.isDarkMode());
    }
  }

  // Keyboard Shortcut: Ctrl + B or Cmd + B to toggle sidebar collapse state
  @HostListener('window:keydown.control.b', ['$event'])
  @HostListener('window:keydown.meta.b', ['$event'])
  handleKeyboardToggle(event: Event) {
    const e = event as KeyboardEvent;
    e.preventDefault();
    this.sidebar.toggleCollapsed();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    this.showUserProfileDropdown = false;
  }

  // Handle responsive layout automatically
  @HostListener('window:resize')
  onResize() {
    if (typeof window !== 'undefined') {
      const mobile = window.innerWidth < 768;
      this.sidebar.isMobile.set(mobile);
    }
  }

  ngOnInit() {
    this.onResize(); // Initial check
  }

  // --- Resizing Logic ---
  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (!this.sidebar.isResizing()) return;
    
    const deltaX = event.clientX - this.startX;
    let newWidth = this.startWidth;
    
    if (this.sidebar.position() === 'left') {
      newWidth = this.startWidth + deltaX;
    } else if (this.sidebar.position() === 'right') {
      newWidth = this.startWidth - deltaX;
    }
    
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
    this.startX = event.clientX;
    this.startWidth = this.sidebar.width();
    
    if (typeof document !== 'undefined') {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }
  }

  toggleProfileDropdown(event: Event) {
    event.stopPropagation();
    this.showUserProfileDropdown = !this.showUserProfileDropdown;
  }

  loginWithGoogle() {
    this.showUserProfileDropdown = false;
    this.firebase.signInWithGoogle();
  }

  logout() {
    this.showUserProfileDropdown = false;
    this.firebase.logout();
  }
}
