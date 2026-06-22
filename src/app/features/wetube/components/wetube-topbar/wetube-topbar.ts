import { Component, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { WeTubeService } from '../../wetube.service';

@Component({
  selector: 'app-wetube-topbar',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideDynamicIcon],
  templateUrl: './wetube-topbar.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WeTubeTopbarComponent {
  searchQuery = signal('');
  wetube = inject(WeTubeService);

  onSearch() {
    const q = this.searchQuery().trim();
    if (!q) return;
    this.wetube.search(q);
  }

  onLogoClick(): void {
    this.searchQuery.set('');
    this.wetube.setSearchQuery('');
    this.wetube.setActiveCategory('الكل');
    this.wetube.setActiveTab('home');
  }

  connectVault(): void {
    alert('جاري ربط العقدة بالسجل المركزي لـ Si-Neuro Central Vault...');
  }
}
