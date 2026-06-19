import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, ChevronDown, ChevronUp } from 'lucide-angular';

@Component({
  selector: 'app-watch-description',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './watch-description.html',
  styleUrls: ['./watch-description.scss']
})
export class WatchDescriptionComponent {
  @Input() description: string = '';
  @Input() views: number = 0;
  @Input() date: string = '';
  @Input() category: string = '';
  
  ChevronDown = ChevronDown;
  ChevronUp = ChevronUp;
  isExpanded = false;
  
  toggle() {
    this.isExpanded = !this.isExpanded;
  }
}
