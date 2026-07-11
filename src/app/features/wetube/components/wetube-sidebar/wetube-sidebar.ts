import { Component, inject, signal, computed, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { LucideAngularModule, Home, Library, Users, Bell, Video, Film, History, Tv, TrendingUp, Music, Gamepad2, Newspaper, GraduationCap, Menu, PlusCircle, MoreVertical, Settings, Sparkles, ExternalLink } from 'lucide-angular';
import { WeTubeService } from '../../wetube.service';
import { IndexedDBService } from '../../../../core/services/indexed-db.service';
import { ContextMenuService } from '../../../../shared/components/context-menu/context-menu.service';
import { ContextMenuItem } from '../../../../shared/components/context-menu/context-menu.model';

export interface SidebarSection {
  title: string;
  items: MenuItem[];
}

export interface MenuItem {
  label: string;
  icon: any;
  route: string;
  active: () => boolean;
  section?: string;
  isSubscription?: boolean;
  avatar?: string;
  hasUnread?: boolean;
  channelId?: string;
}

@Component({
  selector: 'app-wetube-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './wetube-sidebar.html',
  styleUrls: ['./wetube-sidebar.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'contents'
  }
})
export class WeTubeSidebarComponent implements OnInit {
  wetube = inject(WeTubeService);
  router = inject(Router);
  dbService = inject(IndexedDBService);
  contextMenu = inject(ContextMenuService);
  
  Menu = Menu;
  PlusCircle = PlusCircle;
  Users = Users;
  MoreVertical = MoreVertical;
  collapsed = computed(() => this.wetube.isSidebarCollapsed());
  showMobileMenu = signal(false);
  
  // Dynamic Subscriptions from IndexedDB
  subscriptions = signal<any[]>([]);

  baseSections: SidebarSection[] = [
    {
      title: '', // No title for the first section
      items: [
        { label: 'الصفحة الرئيسية', icon: Home, route: '/stream', active: () => this.wetube.activeTab() === 'home', section: 'main' },
        { label: 'استكشاف يوتيوب', icon: TrendingUp, route: '/stream', active: () => this.wetube.activeTab() === 'explore', section: 'main' },
        { label: 'Shorts', icon: Film, route: '/stream/shorts', active: () => this.wetube.activeTab() === 'shorts', section: 'main' },
        { label: 'الاشتراكات', icon: Users, route: '/stream/subscriptions', active: () => this.wetube.activeTab() === 'subs', section: 'main' },
        { label: 'الإشعارات', icon: Bell, route: '/stream/notifications', active: () => this.wetube.activeTab() === 'notifications', section: 'main' }
      ]
    },
    {
      title: 'أنت',
      items: [
        { label: 'المكتبة', icon: Library, route: '/stream/library', active: () => this.wetube.activeTab() === 'library', section: 'you' },
        { label: 'سجل المشاهدة', icon: History, route: '/stream/history', active: () => this.wetube.activeTab() === 'history', section: 'you' },
        { label: 'فيديوهات أعجبتني', icon: Tv, route: '/stream/liked', active: () => this.wetube.activeTab() === 'liked', section: 'you' }
      ]
    },
    {
      title: 'أدوات المبدعين',
      items: [
        { label: 'WeTube Studio', icon: Video, route: '/stream/studio', active: () => this.wetube.activeTab() === 'studio', section: 'creator' }
      ]
    }
  ];

  // Computed sections injects subscriptions dynamically
  sections = computed<SidebarSection[]>(() => {
    const subs = this.subscriptions();
    
    const subItems: MenuItem[] = subs.map(sub => ({
      label: sub.name,
      icon: Users,
      route: `/stream/channel/${sub.channelId}`,
      active: () => this.router.url.includes(sub.channelId),
      section: 'subs',
      isSubscription: true,
      avatar: sub.avatar,
      hasUnread: Math.random() > 0.7, // Randomize unread indicator for demo, ideally from DB
      channelId: sub.channelId
    }));

    const subsSection: SidebarSection = {
      title: 'الاشتراكات',
      items: subItems
    };

    return [
      this.baseSections[0], // Main
      this.baseSections[1], // You
      this.baseSections[2], // Creator
      subsSection           // Subscriptions at the bottom
    ];
  });

  menuItems = computed(() => this.sections().flatMap(s => s.items));

  constructor() {
    this.router.events.pipe(filter((event: any) => event instanceof NavigationEnd)).subscribe(() => {
      const url = this.router.url;
      if (url.includes('/stream/library')) this.wetube.setActiveTab('library');
      else if (url.includes('/stream/subscriptions')) this.wetube.setActiveTab('subs');
      else if (url.includes('/stream/notifications')) this.wetube.setActiveTab('notifications');
      else if (url.includes('/stream/studio')) this.wetube.setActiveTab('studio');
      else if (url.includes('/stream/shorts')) this.wetube.setActiveTab('shorts');
      else if (url === '/stream' && this.wetube.activeCategory() !== 'الكل') this.wetube.setActiveTab('explore');
      else this.wetube.setActiveTab('home');
    });
  }

  ngOnInit() {
    this.loadSubscriptions();
  }

  async loadSubscriptions() {
    try {
      const subs = await this.dbService.getAll('subscriptions');
      if (subs && subs.length > 0) {
        this.subscriptions.set(subs);
      } else {
        this.subscriptions.set([]);
      }
    } catch (e) {
      console.warn('[WeTubeSidebar] Failed to load subscriptions', e);
    }
  }

  toggleCollapse() {
    this.wetube.isSidebarCollapsed.update((v: boolean) => !v);
  }

  toggleMobileMenu() {
    this.showMobileMenu.update((v: boolean) => !v);
  }

  toggleSectionMenu(event: MouseEvent, sectionTitle: string) {
    event.stopPropagation();
    const items: ContextMenuItem[] = [
      { id: 'open', label: 'فتح القسم', icon: ExternalLink, action: () => console.log('Open', sectionTitle) },
      { id: 'settings', label: 'إعدادات القسم العامة', icon: Settings, action: () => console.log('Settings', sectionTitle) },
      { id: 'div1', label: '', isDivider: true },
      { id: 'advanced', label: 'إضافة ميزات متقدمة', icon: Sparkles, action: () => console.log('Advanced', sectionTitle) }
    ];
    this.contextMenu.openAttached(event.currentTarget as HTMLElement, items);
  }

  onSearchKeydown(event: KeyboardEvent) {
    const input = event.target as HTMLInputElement;
    if (event.key === 'Enter' && input.value.trim()) {
      this.wetube.search(input.value.trim());
      input.value = '';
    }
  }
}
