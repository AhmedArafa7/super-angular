import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Search, Upload, User } from 'lucide-angular';
import { WeTubeService } from '../../wetube.service';

@Component({
  selector: 'app-wetube-topbar',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './wetube-topbar.html',
  styleUrls: ['./wetube-topbar.scss']
})
export class WeTubeTopbarComponent {
  Search = Search;
  Upload = Upload;
  User = User;
  searchQuery = '';
  wetube = inject(WeTubeService);

  onSearch() {
    this.wetube.search(this.searchQuery);
  }
}
