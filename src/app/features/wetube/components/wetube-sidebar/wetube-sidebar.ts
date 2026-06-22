import { Component, inject, signal, computed, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { LucideAngularModule, Home, Library, Users, Bell, Video, Film, History, Tv, TrendingUp, Music, Gamepad2, Newspaper, GraduationCap, Menu, PlusCircle } from 'lucide-angular';
import { WeTubeService } from '../../wetube.service';
import { IndexedDBService } from '../../../../core/services/indexed-db.service';

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
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WeTubeSidebarComponent implements OnInit {
  wetube = inject(WeTubeService);
  router = inject(Router);
  dbService = inject(IndexedDBService);
  
  Menu = Menu;
  PlusCircle = PlusCircle;
  collapsed = signal(false);
  showMobileMenu = signal(false);
  
  // Dynamic Subscriptions from IndexedDB
  subscriptions = signal<any[]>([]);

  baseSections: SidebarSection[] = [
    {
      title: 'أنت',
      items: [
        { label: 'الرئيسية', icon: Home, route: '/stream', active: () => this.wetube.activeTab() === 'home', section: 'you' },
        { label: 'المكتبة', icon: Library, route: '/stream/library', active: () => this.wetube.activeTab() === 'library', section: 'you' },
        { label: 'شورتس', icon: Film, route: '/stream/shorts', active: () => this.wetube.activeTab() === 'shorts', section: 'you' },
        { label: 'سجل المشاهدة', icon: History, route: '/stream/library', active: () => this.wetube.activeTab() === 'library', section: 'you' },
        { label: 'مباشر', icon: Tv, route: '/stream', active: () => false, section: 'you' }
      ]
    },
    {
      title: 'استكشاف',
      items: [
        { label: 'رائج', icon: TrendingUp, route: '/stream', active: () => this.wetube.activeTab() === 'explore' || this.wetube.activeCategory() === 'تريند', section: 'explore' },
        { label: 'موسيقى', icon: Music, route: '/stream', active: () => this.wetube.activeCategory() === 'موسيقى', section: 'explore' },
        { label: 'ألعاب', icon: Gamepad2, route: '/stream', active: () => this.wetube.activeCategory() === 'ألعاب', section: 'explore' },
        { label: 'أخبار', icon: Newspaper, route: '/stream', active: () => this.wetube.activeCategory() === 'أخبار', section: 'explore' },
        { label: 'تعلم', icon: GraduationCap, route: '/stream', active: () => this.wetube.activeCategory() === 'برمجة', section: 'explore' }
      ]
    },
    {
      title: 'منصة المبدعين',
      items: [
        { label: 'ستوديو', icon: Video, route: '/stream/studio', active: () => this.wetube.activeTab() === 'studio', section: 'creator' },
        { label: 'الإشعارات', icon: Bell, route: '/stream/notifications', active: () => this.wetube.activeTab() === 'notifications', section: 'creator' }
      ]
    }
  ];

  // Computed sections injects subscriptions dynamically
  sections = computed<SidebarSection[]>(() => {
    const subs = this.subscriptions();
    
    const subItems: MenuItem[] = subs.map(sub => ({
      label: sub.name,
      icon: null,
      route: `/stream/channel/${sub.channelId}`,
      active: () => this.router.url.includes(sub.channelId),
      section: 'subs',
      isSubscription: true,
      avatar: sub.avatar,
      hasUnread: Math.random() > 0.7, // Randomize unread indicator for demo, ideally from DB
      channelId: sub.channelId
    }));

    // Always keep the main "Subscriptions" link
    const allSubsItem: MenuItem = { 
      label: 'كل الاشتراكات', 
      icon: Users, 
      route: '/stream/subscriptions', 
      active: () => this.wetube.activeTab() === 'subs', 
      section: 'subs' 
    };

    const subsSection: SidebarSection = {
      title: 'الاشتراكات',
      items: [allSubsItem, ...subItems]
    };

    return [
      this.baseSections[0], // You
      subsSection,          // Subscriptions
      this.baseSections[1], // Explore
      this.baseSections[2]  // Creator
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
        // Mock data if no subscriptions found (to match React's nice UI if empty)
        this.subscriptions.set([
          { channelId: 'UC_x5XG1OV2P6uZZ5FSM9Ttw', name: 'Google Developers', avatar: 'https://ui-avatars.com/api/?name=GD&background=0D8ABC&color=fff' },
          { channelId: 'UCWv7vMbUUWE73PtMVlNk52Q', name: 'Angular', avatar: 'https://ui-avatars.com/api/?name=A&background=DD0031&color=fff' },
          { channelId: 'UCsBjURrPoezykLs9EqgamOA', name: 'Fireship', avatar: 'https://ui-avatars.com/api/?name=F&background=FF8A65&color=fff' }
        ]);
      }
    } catch (e) {
      console.warn('[WeTubeSidebar] Failed to load subscriptions', e);
    }
  }

  toggleCollapse() {
    this.collapsed.update(v => !v);
  }

  toggleMobileMenu() {
    this.showMobileMenu.update(v => !v);
  }

  onSearchKeydown(event: KeyboardEvent) {
    const input = event.target as HTMLInputElement;
    if (event.key === 'Enter' && input.value.trim()) {
      this.wetube.search(input.value.trim());
      input.value = '';
    }
  }
}
