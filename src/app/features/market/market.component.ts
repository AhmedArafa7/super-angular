import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { MarketService, MarketItem } from '../../core/market.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-market',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideDynamicIcon],
  templateUrl: './market.component.html',
  styleUrls: ['./market.component.scss']
})
export class MarketComponent {
  marketService = inject(MarketService);
  toast = inject(ToastService);

  // Search filter query
  searchQuery = signal<string>('');

  // Selected product detail page
  viewingItem = signal<MarketItem | null>(null);

  // Interactive Product Creation Modal toggler
  isModalOpen = false;
  newItemTitle = '';
  newItemDesc = '';
  newItemPrice = 100;
  newItemStock = 5;
  newItemCategory: 'software' | 'hardware' | 'services' | 'digital' = 'software';
  newItemImage = '';

  // Get active items list based on selected sidebar category and search
  get filteredItems(): MarketItem[] {
    const list = this.marketService.items();
    const activeCat = this.marketService.activeCategory();
    const activeTab = this.marketService.activeTab();
    const query = this.searchQuery().toLowerCase().trim();

    // 1. Filter by active category
    let result = list;
    if (activeCat !== 'all') {
      result = list.filter(i => i.mainCategory === activeCat);
    }

    // 2. Filter by tabs (buy vs mine)
    if (activeTab === 'mine') {
      result = result.filter(i => i.sellerId === 'me' || i.purchasedBy?.includes('me'));
    } else {
      result = result.filter(i => i.sellerId !== 'me' && !i.purchasedBy?.includes('me'));
    }

    // 3. Filter by search query
    if (query) {
      result = result.filter(i => 
        i.title.toLowerCase().includes(query) || 
        i.description.toLowerCase().includes(query)
      );
    }

    return result;
  }

  // Sidebar category switcher
  setCategory(cat: string): void {
    this.marketService.activeCategory.set(cat);
    this.viewingItem.set(null);
  }

  // Tabs switcher (buy vs mine)
  setTab(tab: 'buy' | 'mine'): void {
    this.marketService.activeTab.set(tab);
    this.viewingItem.set(null);
  }

  // Add new product
  handleCreateItem(): void {
    if (!this.newItemTitle.trim()) return;

    this.marketService.addItem(
      this.newItemTitle,
      this.newItemDesc,
      this.newItemPrice,
      this.newItemCategory,
      this.newItemStock,
      this.newItemImage
    );

    // Reset inputs
    this.newItemTitle = '';
    this.newItemDesc = '';
    this.newItemPrice = 100;
    this.newItemStock = 5;
    this.newItemCategory = 'software';
    this.newItemImage = '';
    this.isModalOpen = false;

    this.toast.show("تم إدراج المنتج بنجاح في سوق العقد العصبية.", "success");
  }

  // Buy item
  async handleAcquire(item: MarketItem): Promise<void> {
    const success = await this.marketService.acquireItem(item.id);
    if (success) {
      this.toast.show(`لقد استوليت على "${item.title}" بنجاح وتم خصم ${item.price} BKC من محفظتك.`, "success");
      this.viewingItem.set(null);
    }
  }

  // Delete item (allowed only for owner)
  async handleDelete(id: string): Promise<void> {
    const confirmed = await this.toast.confirm("هل تريد بالتأكيد حذف هذا المنتج المعروض من السوق؟");
    if (confirmed) {
      this.marketService.deleteItem(id);
      this.toast.show("تم حذف المنتج بنجاح.", "info");
      this.viewingItem.set(null);
    }
  }
}
