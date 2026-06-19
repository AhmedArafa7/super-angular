import { Component, inject } from '@angular/core';
import { AppShellComponent } from './layout/app-shell/app-shell';
import { SyncService } from './core/services/sync.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [AppShellComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App {
  private syncService = inject(SyncService);
}
