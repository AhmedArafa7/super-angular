import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { DealsService, Deal, Store, DealCategory, DEAL_CATEGORIES } from '../../core/deals.service';

@Component({
  selector: 'app-deals',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideDynamicIcon],
  templateUrl: './deals.component.html',
  styleUrls: ['./deals.component.scss']
})
export class DealsComponent {
  dealsService = inject(DealsService);
  categoriesList = DEAL_CATEGORIES;

  // Search input query
  searchQuery = signal<string>('');

  // Active view filters
  activeView = signal<'browse' | 'store-view'>('browse');
  selectedStore = signal<Store | null>(null);

  // Dialog popup controllers
  showAddDeal = false;
  showAddStore = false;

  // Form parameters for new deal
  newProductName = '';
  newPrice = 20;
  newOriginalPrice = 25;
  newCategory: DealCategory = 'groceries';
  newUnit = '1 كجم';
  newStoreId = '';
  newExpiresInDays = 7;

  // Form parameters for new store
  newStoreName = '';
  newStoreType = 'سوبر ماركت';
  newStoreAddress = '';

  constructor() {
    // Select first store by default if available
    const stores = this.dealsService.stores();
    if (stores.length > 0) {
      this.newStoreId = stores[0].id;
    }
  }

  // Get active stores list
  get stores(): Store[] {
    return this.dealsService.stores();
  }

  // Filter and sort daily deals
  get filteredDeals(): Deal[] {
    const list = this.dealsService.deals();
    const activeCat = this.dealsService.activeCategory();
    const sortMode = this.dealsService.activeSort();
    const query = this.searchQuery().toLowerCase().trim();

    let result = list;

    // 1. Filter by Store if selected
    if (this.activeView() === 'store-view' && this.selectedStore()) {
      result = result.filter(d => d.storeId === this.selectedStore()?.id);
    }

    // 2. Filter by category
    if (activeCat !== 'all') {
      result = result.filter(d => d.category === activeCat);
    }

    // 3. Filter by search query
    if (query) {
      result = result.filter(d => 
        d.productName.toLowerCase().includes(query) ||
        d.storeName.toLowerCase().includes(query)
      );
    }

    // 4. Sort results
    const sorted = [...result];
    switch (sortMode) {
      case 'price':
        sorted.sort((a, b) => a.price - b.price);
        break;
      case 'discount':
        sorted.sort((a, b) => {
          const discountA = a.originalPrice ? ((a.originalPrice - a.price) / a.originalPrice) * 100 : 0;
          const discountB = b.originalPrice ? ((b.originalPrice - b.price) / b.originalPrice) * 100 : 0;
          return discountB - discountA;
        });
        break;
      case 'confirmations':
        sorted.sort((a, b) => b.confirmations - a.confirmations);
        break;
      case 'newest':
        sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }

    return sorted;
  }

  // Switch category filter
  setCategory(cat: DealCategory | 'all'): void {
    this.dealsService.activeCategory.set(cat);
  }

  // Switch sorting mode
  setSort(sort: 'price' | 'discount' | 'confirmations' | 'newest'): void {
    this.dealsService.activeSort.set(sort);
  }

  // View specific store details page
  viewStore(store: Store): void {
    this.selectedStore.set(store);
    this.activeView.set('store-view');
  }

  // Return to browse view
  goBack(): void {
    this.selectedStore.set(null);
    this.activeView.set('browse');
    this.searchQuery.set('');
  }

  // Confirm price accuracy
  handleConfirm(deal: Deal): void {
    this.dealsService.confirmDeal(deal.id);
  }

  // Report inaccurate price
  handleReport(deal: Deal): void {
    this.dealsService.reportDeal(deal.id);
    alert("شكراً لك! لقد تم الإبلاغ عن هذا العرض وسنقوم بمراجعته.");
  }

  // Calculate discount percentage
  getDiscountPercentage(deal: Deal): number {
    if (!deal.originalPrice || deal.originalPrice <= deal.price) return 0;
    return Math.round(((deal.originalPrice - deal.price) / deal.originalPrice) * 100);
  }

  // Add new deal listing
  handlePublishDeal(): void {
    if (!this.newProductName.trim() || !this.newStoreId) return;

    this.dealsService.addDeal(
      this.newStoreId,
      this.newProductName,
      this.newPrice,
      this.newOriginalPrice || undefined,
      this.newCategory,
      this.newUnit,
      this.newExpiresInDays
    );

    // Reset inputs
    this.newProductName = '';
    this.newPrice = 20;
    this.newOriginalPrice = 25;
    this.newCategory = 'groceries';
    this.newUnit = '1 كجم';
    this.showAddDeal = false;

    alert("تهانينا! تم إدراج العرض بنجاح للجميع.");
  }

  // Create new store Node
  handleCreateStore(): void {
    if (!this.newStoreName.trim() || !this.newStoreAddress.trim()) return;

    const newId = this.dealsService.addStore(
      this.newStoreName,
      this.newStoreType,
      this.newStoreAddress
    );

    this.newStoreId = newId;
    this.newStoreName = '';
    this.newStoreAddress = '';
    this.showAddStore = false;

    alert("تهانينا! تم تسجيل المحل الجديد بنجاح في النظام.");
  }
}
