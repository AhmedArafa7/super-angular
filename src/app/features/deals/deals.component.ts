import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { DealsService, Deal, Store, DealCategory, DEAL_CATEGORIES, DealCategoryDefinition } from '../../core/deals.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-deals',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideDynamicIcon],
  templateUrl: './deals.component.html',
  styleUrls: ['./deals.component.scss']
})
export class DealsComponent {
  dealsService = inject(DealsService);
  toast = inject(ToastService);

  // Available Categories
  categoriesList: DealCategoryDefinition[] = DEAL_CATEGORIES;

  // Search input query
  searchQuery = signal<string>('');

  // Selected Store view filter
  selectedStoreId = signal<string | null>(null);

  // Dialog Modals State
  showAddDeal = signal<boolean>(false);
  showAddStore = signal<boolean>(false);
  showDealDetails = signal<Deal | null>(null);

  // New Deal Form State
  newProductName = '';
  newPrice: number | null = null;
  newOriginalPrice: number | null = null;
  newCategory: DealCategory = 'groceries';
  newUnit = '1 كجم';
  newStoreId = '';
  newBranchNote = '';
  newExpiresInDays = 7;

  // New Store Form State
  newStoreName = '';
  newStoreType = 'سوبر ماركت';
  newStoreAddress = '';
  newStorePhone = '';

  constructor() {
    // Set default store
    const stores = this.dealsService.stores();
    if (stores.length > 0) {
      this.newStoreId = stores[0].id;
    }
  }

  // Active stores list
  stores = computed(() => this.dealsService.stores());

  // Filtered and Sorted Deals
  filteredDeals = computed(() => {
    const list = this.dealsService.deals();
    const activeCat = this.dealsService.activeCategory();
    const sortMode = this.dealsService.activeSort();
    const query = this.searchQuery().toLowerCase().trim();
    const storeId = this.selectedStoreId();

    let result = list;

    // 1. Filter by Store if selected
    if (storeId) {
      result = result.filter(d => d.storeId === storeId);
    }

    // 2. Filter by Category
    if (activeCat !== 'all') {
      result = result.filter(d => d.category === activeCat);
    }

    // 3. Filter by Search Query
    if (query) {
      result = result.filter(d => 
        d.productName.toLowerCase().includes(query) ||
        d.storeName.toLowerCase().includes(query) ||
        (d.categoryLabel || '').toLowerCase().includes(query) ||
        (d.branchNote || '').toLowerCase().includes(query)
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
          const discA = a.originalPrice ? ((a.originalPrice - a.price) / a.originalPrice) * 100 : 0;
          const discB = b.originalPrice ? ((b.originalPrice - b.price) / b.originalPrice) * 100 : 0;
          return discB - discA;
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
  });

  // Category selection
  setCategory(cat: DealCategory | 'all'): void {
    this.dealsService.activeCategory.set(cat);
  }

  // Sort selection
  setSort(sort: 'price' | 'discount' | 'confirmations' | 'newest'): void {
    this.dealsService.activeSort.set(sort);
  }

  // Calculate discount percentage
  getDiscountPercentage(deal: Deal): number {
    if (!deal.originalPrice || deal.originalPrice <= deal.price) return 0;
    return Math.round(((deal.originalPrice - deal.price) / deal.originalPrice) * 100);
  }

  // Confirm / Upvote deal price
  async handleConfirm(deal: Deal): Promise<void> {
    await this.dealsService.confirmDeal(deal.id);
    this.toast.show(`شكراً لتأكيدك صحة سعر "${deal.productName}" في ${deal.storeName}!`, 'success');
  }

  // Report inaccurate deal price
  async handleReport(deal: Deal): Promise<void> {
    const confirmed = await this.toast.confirm(`هل أنت متأكد من الإبلاغ عن اختلاف سعر "${deal.productName}" في ${deal.storeName}؟`);
    if (confirmed) {
      await this.dealsService.reportDeal(deal.id);
      this.toast.show('تم تسجيل إبلاغك وسيتم مراجعة العرض والتحقق من الأسعار.', 'info');
    }
  }

  // Open Add Deal Modal
  openAddDealModal(): void {
    const stores = this.dealsService.stores();
    if (stores.length > 0 && !this.newStoreId) {
      this.newStoreId = stores[0].id;
    }
    this.showAddDeal.set(true);
  }

  // Save new deal
  async handleSaveDeal(): Promise<void> {
    if (!this.newProductName.trim()) {
      this.toast.show('يرجى كتابة اسم السلعة أو المنتج.', 'error');
      return;
    }

    if (!this.newPrice || this.newPrice <= 0) {
      this.toast.show('يرجى تحديد سعر العرض بشكل صحيح.', 'error');
      return;
    }

    if (!this.newStoreId) {
      this.toast.show('يرجى اختيار المحل أو إضافة محل جديد.', 'error');
      return;
    }

    await this.dealsService.addDeal(
      this.newStoreId,
      this.newProductName,
      this.newPrice,
      this.newOriginalPrice || undefined,
      this.newCategory,
      this.newUnit || '1 قطعة',
      this.newExpiresInDays,
      this.newBranchNote
    );

    // Reset Form
    this.newProductName = '';
    this.newPrice = null;
    this.newOriginalPrice = null;
    this.newUnit = '1 كجم';
    this.newBranchNote = '';
    this.showAddDeal.set(false);

    this.toast.show('تمت إضافة عرض السعر بنجاح والمزامنة مع قاعدة البيانات.', 'success');
  }

  // Save new store
  async handleSaveStore(): Promise<void> {
    if (!this.newStoreName.trim()) {
      this.toast.show('يرجى كتابة اسم المحل أو السوبرماركت.', 'error');
      return;
    }

    const created = await this.dealsService.addStore(
      this.newStoreName,
      this.newStoreType || 'سوبرماركت',
      this.newStoreAddress || 'الفرع الرئيسي',
      this.newStorePhone
    );

    this.newStoreId = created.id;
    this.newStoreName = '';
    this.newStoreAddress = '';
    this.newStorePhone = '';
    this.showAddStore.set(false);

    this.toast.show(`تمت إضافة متجر "${created.name}" بنجاح!`, 'success');
  }

  // Delete deal
  async handleDeleteDeal(deal: Deal): Promise<void> {
    const confirmed = await this.toast.confirm(`هل أنت متأكد من حذف عرض "${deal.productName}"؟`);
    if (confirmed) {
      await this.dealsService.deleteDeal(deal.id);
      this.showDealDetails.set(null);
      this.toast.show('تم حذف عرض السعر بنجاح.', 'info');
    }
  }

  // Share Deal
  shareDeal(deal: Deal): void {
    const shareText = `سعر ${deal.productName} في ${deal.storeName} بـ ${deal.price} ج.م فقط! 🏪🛒`;
    navigator.clipboard.writeText(shareText);
    this.toast.show('تم نسخ تفاصيل العرض إلى الحافظة بنجاح.', 'success');
  }
}
