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
  @Input() views: any = 0;
  @Input() date: string = '';
  @Input() category: string = '';
  
  ChevronDown = ChevronDown;
  ChevronUp = ChevronUp;
  isExpanded = false;
  
  toggle() {
    this.isExpanded = !this.isExpanded;
  }

  formatViews(val: any): string {
    if (val === null || val === undefined || val === '') return '0 مشاهدة';
    if (typeof val === 'string') {
      if (val.includes('مشاهدة')) return val;
      const clean = val.trim();
      if (clean.includes('M') || clean.includes('K') || clean.includes('B')) {
        return `${clean} مشاهدة`;
      }
      const num = Number(clean.replace(/[^0-9.]/g, ''));
      if (isNaN(num) || num === 0) return `${clean} مشاهدة`;
      return `${num.toLocaleString('ar-EG')} مشاهدة`;
    }
    if (typeof val === 'number') {
      return `${val.toLocaleString('ar-EG')} مشاهدة`;
    }
    return `${val} مشاهدة`;
  }
}
