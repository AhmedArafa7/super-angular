import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { WeTubeService } from './wetube.service';
import { FirebaseService } from '../../core/services/firebase.service';
import { WeTubeTab } from './wetube.model';
import { WeTubeSidebarComponent } from './components/wetube-sidebar/wetube-sidebar';

@Component({
  selector: 'app-wetube',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet, FormsModule, LucideDynamicIcon, WeTubeSidebarComponent],
  templateUrl: './wetube.component.html',
  styleUrls: ['./wetube.component.scss']
})
export class WeTubeComponent {
  wetube = inject(WeTubeService);
  firebaseService = inject(FirebaseService);
  router = inject(Router);

  // Search input state
  searchQuery = '';

  // Floating upload modal simulator
  newVideoTitle = '';
  newVideoAuthor = '';
  newVideoCategory = 'تكنولوجيا';

  // Sidebar visibility
  isSidebarOpen = signal<boolean>(true);

  // Active channel subscription navigation helper
  subscriptionsList = computed(() => this.wetube.subscriptions());

  handleSearch(): void {
    const q = this.searchQuery.trim();
    if (!q) return;
    this.wetube.search(q);
  }

  onLogoClick(): void {
    this.searchQuery = '';
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

  async submitVideo(): Promise<void> {
    const title = this.newVideoTitle.trim();
    const author = this.newVideoAuthor.trim();
    if (!title || !author) return;

    try {
      await this.firebaseService.addVideoForReview({
        title,
        author,
        category: this.newVideoCategory,
        thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800', // Default thumbnail for now
        source: 'user_submission'
      });
      alert('تم إرسال الفيديو للمراجعة بنجاح!');
      this.newVideoTitle = '';
      this.newVideoAuthor = '';
      this.wetube.showUploadModal.set(false);
    } catch (e) {
      console.error('Failed to submit video', e);
      alert('حدث خطأ أثناء إرسال الفيديو. تأكد من أن لديك صلاحيات المراجعة.');
    }
  }

  connectVault(): void {
    alert('جاري ربط العقدة بالسجل المركزي لـ Si-Neuro Central Vault...');
  }
}
