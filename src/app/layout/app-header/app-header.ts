import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarService } from '../../core/sidebar.service';
import { GlobalStateService } from '../../core/services/global-state.service';
import { LucideDynamicIcon } from '@lucide/angular';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideDynamicIcon],
  templateUrl: './app-header.html',
  styleUrls: ['./app-header.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppHeaderComponent {
  sidebar = inject(SidebarService);
  globalState = inject(GlobalStateService);
}
