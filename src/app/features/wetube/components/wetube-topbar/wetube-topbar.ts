import { Component, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Bell, Plus, Search, Mic, Menu } from 'lucide-angular';
import { WeTubeService } from '../../wetube.service';
import { FirebaseService } from '../../../../core/services/firebase.service';

import { Router } from '@angular/router';

@Component({
  selector: 'app-wetube-topbar',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './wetube-topbar.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WeTubeTopbarComponent {
  searchQuery = signal('');
  wetube = inject(WeTubeService);
  firebase = inject(FirebaseService);
  router = inject(Router);

  // Icons
  Bell = Bell;
  Plus = Plus;
  Search = Search;
  Mic = Mic;
  Menu = Menu;

  get userPhoto(): string {
    const user = this.firebase.currentUser();
    return user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName || 'User'}&background=4f46e5&color=fff`;
  }

  onSearch() {
    const q = this.searchQuery().trim();
    if (!q) return;
    this.wetube.search(q);
    this.router.navigate(['/stream']);
  }

  onLogoClick(): void {
    this.searchQuery.set('');
    this.wetube.setSearchQuery('');
    this.wetube.setActiveCategory('الكل');
    this.wetube.setActiveTab('home');
    this.router.navigate(['/stream']);
  }
}
