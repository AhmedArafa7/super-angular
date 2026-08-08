import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { halaltubeService } from './halaltube.service';
import { FirebaseService } from '../../core/services/firebase.service';
import { halaltubeTab } from './halaltube.model';
import { halaltubeSidebarComponent } from './components/halaltube-sidebar/halaltube-sidebar';

@Component({
  selector: 'app-halaltube',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet, FormsModule, LucideDynamicIcon, halaltubeSidebarComponent],
  templateUrl: './halaltube.component.html',
  styleUrls: ['./halaltube.component.scss']
})
export class halaltubeComponent {
  halaltube = inject(halaltubeService);
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
  subscriptionsList = computed(() => this.halaltube.subscriptions());

  handleSearch(): void {
    const q = this.searchQuery.trim();
    if (!q) return;
    this.halaltube.search(q);
  }

  onLogoClick(): void {
    this.searchQuery = '';
    this.halaltube.setSearchQuery('');
    this.halaltube.setActiveCategory('الكل');
    this.halaltube.setActiveTab('home');
    this.router.navigate(['/stream']);
  }

  selectTab(tab: halaltubeTab): void {
    this.halaltube.setActiveTab(tab);
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
      this.halaltube.showUploadModal.set(false);
    } catch (e) {
      console.error('Failed to submit video', e);
      alert('حدث خطأ أثناء إرسال الفيديو. تأكد من أن لديك صلاحيات المراجعة.');
    }
  }

  connectVault(): void {
    alert('جاري ربط العقدة بالسجل المركزي لـ Si-Neuro Central Vault...');
  }
}
