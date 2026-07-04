import { Component, inject } from '@angular/core';
import { AppShellComponent } from './layout/app-shell/app-shell';
import { SyncService } from './core/services/sync.service';
import { GlobalVideoPlayerComponent } from './features/wetube/components/global-video-player/global-video-player.component';
import { ToastComponent } from './shared/components/toast/toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [AppShellComponent, GlobalVideoPlayerComponent, ToastComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App {
  private syncService = inject(SyncService);
}
