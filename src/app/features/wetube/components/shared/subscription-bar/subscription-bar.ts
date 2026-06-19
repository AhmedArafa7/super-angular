import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, Bell, BellOff } from 'lucide-angular';
import { WeTubeService } from '../../../wetube.service';

@Component({
  selector: 'app-subscription-bar',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './subscription-bar.html',
  styleUrls: ['./subscription-bar.scss']
})
export class SubscriptionBarComponent {
  wetube = inject(WeTubeService);
  Bell = Bell;
  BellOff = BellOff;
}
