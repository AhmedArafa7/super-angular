import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { WeTubeSidebarComponent } from '../wetube-sidebar/wetube-sidebar';
import { WeTubeTopbarComponent } from '../wetube-topbar/wetube-topbar';
import { UploadModalComponent } from '../modals/upload-modal/upload-modal';
import { WeTubeService } from '../../wetube.service';

@Component({
  selector: 'app-wetube-shell',
  standalone: true,
  imports: [RouterModule, WeTubeSidebarComponent, WeTubeTopbarComponent, UploadModalComponent],
  templateUrl: './wetube-shell.html',
  styleUrls: ['./wetube-shell.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block h-full'
  }
})
export class WeTubeShellComponent {
  wetube = inject(WeTubeService);
}
