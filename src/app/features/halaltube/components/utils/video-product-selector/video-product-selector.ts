import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Tag, X } from 'lucide-angular';

@Component({
  selector: 'app-video-product-selector',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './video-product-selector.html',
  styleUrls: ['./video-product-selector.scss']
})
export class VideoProductSelectorComponent {
  @Input() selectedProducts: string[] = [];
  @Input() displayMode: 'shelf' | 'overlay' | 'none' = 'none';
  @Output() update = new EventEmitter<{productIds: string[], mode: string}>();
  
  Tag = Tag;
  X = X;
  isOpen = false;
  searchQuery = '';
  
  availableProducts = [
    { id: 'p1', name: 'لوحة مفاتيح ميكانيكية', price: 450, category: 'إلكترونيات' },
    { id: 'p2', name: 'ماوس احترافي', price: 280, category: 'إلكترونيات' },
    { id: 'p3', name: 'سماعات بلوتوث', price: 320, category: 'صوتيات' },
    { id: 'p4', name: 'شاشة 4K', price: 1800, category: 'شاشات' },
    { id: 'p5', name: 'كاميرا ويب', price: 250, category: 'إكسسوارات' }
  ];
  
  toggleProduct(id: string) {
    if (this.selectedProducts.includes(id)) {
      this.selectedProducts = this.selectedProducts.filter(p => p !== id);
    } else {
      this.selectedProducts = [...this.selectedProducts, id];
    }
  }
  
  save() {
    this.update.emit({ productIds: this.selectedProducts, mode: this.displayMode });
    this.isOpen = false;
  }
  
  get filteredProducts() {
    if (!this.searchQuery) return this.availableProducts;
    return this.availableProducts.filter(p => p.name.includes(this.searchQuery));
  }
}
