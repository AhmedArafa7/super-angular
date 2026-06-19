import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { WeTubeService } from './wetube.service';
import { WeTubeTab } from './wetube.model';

@Component({
  selector: 'app-wetube',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet, FormsModule, LucideDynamicIcon],
  templateUrl: './wetube.component.html',
  styleUrls: ['./wetube.component.scss']
})
export class WeTubeComponent {
  wetube = inject(WeTubeService);
  router = inject(Router);

  // Search input state
  searchQuery = signal<string>('');

  // Floating upload modal simulator
  showUploadModal = signal<boolean>(false);
  newVideoTitle = signal<string>('');
  newVideoAuthor = signal<string>('');
  newVideoCategory = signal<string>('تكنولوجيا');

  // Sidebar visibility
  isSidebarOpen = signal<boolean>(true);

  // Active channel subscription navigation helper
  subscriptionsList = computed(() => this.wetube.subscriptions());

  handleSearch(): void {
    const q = this.searchQuery().trim();
    if (!q) return;
    this.wetube.search(q);
  }

  onLogoClick(): void {
    this.searchQuery.set('');
    this.wetube.setSearchQuery('');
    this.wetube.setActiveCategory('الكل');
    this.wetube.setActiveTab('home');
    this.router.navigate(['/stream']);
  }

  selectTab(tab: WeTubeTab): void {
    this.wetube.setActiveTab(tab);
    if (tab === 'home') {
      this.router.navigate(['/stream']);
    }
  }

  simulateUpload(): void {
    const title = this.newVideoTitle().trim();
    const author = this.newVideoAuthor().trim();
    if (!title || !author) return;

    this.wetube.videos.update(list => [
      {
        id: (list.length + 1).toString(),
        title,
        author,
        source: 'platform',
        time: 'منذ ثوانٍ',
        thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800',
        channelAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=User',
        category: this.newVideoCategory(),
        status: 'published'
      },
      ...list
    ]);

    this.newVideoTitle.set('');
    this.newVideoAuthor.set('');
    this.showUploadModal.set(false);
  }

  connectVault(): void {
    alert('جاري ربط العقدة بالسجل المركزي لـ Si-Neuro Central Vault...');
  }
}
