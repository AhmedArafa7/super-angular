import { Component, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SidebarService } from '../../core/sidebar.service';
import { GlobalStateService } from '../../core/services/global-state.service';
import { PwaInstallService } from '../../core/services/pwa-install.service';
import { LucideDynamicIcon } from '@lucide/angular';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LucideDynamicIcon],
  templateUrl: './app-header.html',
  styleUrls: ['./app-header.scss']
})
export class AppHeaderComponent {
  sidebar = inject(SidebarService);
  globalState = inject(GlobalStateService);
  pwaInstall = inject(PwaInstallService);

  showGlobalFriendsModal = false;
  friendQuery = '';
  isAddingFriend = false;

  async addFriend() {
    if (!this.friendQuery.trim()) return;
    this.isAddingFriend = true;
    try {
      const success = await this.globalState.addFriend(this.friendQuery.trim());
      if (success) {
        alert('تمت إضافة الصديق بنجاح!');
        this.friendQuery = '';
      } else {
        alert('لم يتم العثور على مستخدم بهذا الاسم أو المعرف.');
      }
    } catch (e) {
      console.error(e);
      alert('حدث خطأ أثناء إضافة الصديق');
    } finally {
      this.isAddingFriend = false;
    }
  }
}
