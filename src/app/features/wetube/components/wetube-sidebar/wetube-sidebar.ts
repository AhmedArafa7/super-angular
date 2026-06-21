import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { LucideAngularModule, Home, Library, Users, Bell, Video, Film, History, Tv, TrendingUp, Music, Gamepad2, Newspaper, GraduationCap, Menu } from 'lucide-angular';
import { WeTubeService } from '../../wetube.service';

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
}

@Component({
  selector: 'app-wetube-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './wetube-sidebar.html',
  styleUrls: ['./wetube-sidebar.scss']
})
export class WeTubeSidebarComponent {
  wetube = inject(WeTubeService);
  router = inject(Router);
  
  Menu = Menu;
  collapsed = signal(false);
  showMobileMenu = signal(false);

  sections = signal<SidebarSection[]>([
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
      title: 'الاشتراكات',
      items: [
        { label: 'الاشتراكات', icon: Users, route: '/stream/subscriptions', active: () => this.wetube.activeTab() === 'subs', section: 'subs' }
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
  ]);

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
