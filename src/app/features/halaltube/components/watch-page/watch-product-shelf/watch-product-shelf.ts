import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, ShoppingCart, ExternalLink } from 'lucide-angular';

@Component({
  selector: 'app-watch-product-shelf',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './watch-product-shelf.html',
  styleUrls: ['./watch-product-shelf.scss']
})
export class WatchProductShelfComponent {
  @Input() products: any[] = [];
  
  ShoppingCart = ShoppingCart;
  ExternalLink = ExternalLink;
  
  defaultProducts = [
    { id: 1, name: 'لوحة مفاتيح ميكانيكية', price: '450 ر.س', image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&q=80&w=200', url: '#' },
    { id: 2, name: 'ماوس احترافي للألعاب', price: '280 ر.س', image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&q=80&w=200', url: '#' },
    { id: 3, name: 'سماعات بلوتوث', price: '320 ر.س', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=200', url: '#' }
  ];
  
  get displayProducts() {
    return this.products.length > 0 ? this.products : this.defaultProducts;
  }
}
