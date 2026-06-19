import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Play, Clock, ThumbsUp } from 'lucide-angular';
import { WeTubeService } from '../../wetube.service';
import { FirebaseService } from '../../../../core/services/firebase.service';

@Component({
  selector: 'app-wetube-library',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './wetube-library.html',
  styleUrls: ['./wetube-library.scss']
})
export class WeTubeLibraryComponent implements OnInit {
  wetube = inject(WeTubeService);
  firebaseService = inject(FirebaseService);
  Clock = Clock;
  Play = Play;
  ThumbsUp = ThumbsUp;

  historyCount = 0;
  likedCount = 0;
  playlistsCount = 0;

  ngOnInit() {
    this.refreshCounts();
  }

  refreshCounts() {
    const userData = this.firebaseService.userData();
    this.historyCount = userData?.watchHistory?.length || 0;
    const subs = this.wetube.subscriptions();
    this.likedCount = subs.length;
    this.playlistsCount = subs.length > 0 ? Math.ceil(subs.length / 5) : 0;
  }
}
