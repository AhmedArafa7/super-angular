import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Play } from 'lucide-angular';
import { WeTubeService } from '../../wetube.service';

@Component({
  selector: 'app-wetube-subscriptions',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './wetube-subscriptions.html',
  styleUrls: ['./wetube-subscriptions.scss']
})
export class WeTubeSubscriptionsComponent implements OnInit {
  wetube = inject(WeTubeService);
  Play = Play;

  ngOnInit() {
    this.wetube.loadMySubscriptions();
  }
}
