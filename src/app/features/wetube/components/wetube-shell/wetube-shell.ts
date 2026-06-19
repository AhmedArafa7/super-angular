import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { WeTubeSidebarComponent } from '../wetube-sidebar/wetube-sidebar';
import { WeTubeTopbarComponent } from '../wetube-topbar/wetube-topbar';

@Component({
  selector: 'app-wetube-shell',
  standalone: true,
  imports: [RouterModule, WeTubeSidebarComponent, WeTubeTopbarComponent],
  templateUrl: './wetube-shell.html',
  styleUrls: ['./wetube-shell.scss']
})
export class WeTubeShellComponent {}
