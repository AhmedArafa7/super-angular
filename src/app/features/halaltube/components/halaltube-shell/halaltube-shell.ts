import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { halaltubeSidebarComponent } from '../halaltube-sidebar/halaltube-sidebar';
import { halaltubeTopbarComponent } from '../halaltube-topbar/halaltube-topbar';
import { UploadModalComponent } from '../modals/upload-modal/upload-modal';
import { halaltubeService } from '../../halaltube.service';

@Component({
  selector: 'app-halaltube-shell',
  standalone: true,
  imports: [RouterModule, halaltubeSidebarComponent, halaltubeTopbarComponent, UploadModalComponent],
  templateUrl: './halaltube-shell.html',
  styleUrls: ['./halaltube-shell.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block h-full'
  }
})
export class halaltubeShellComponent {
  halaltube = inject(halaltubeService);
}
