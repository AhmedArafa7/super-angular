import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { MarketService, MarketItem, MARKET_CATEGORIES, MarketCategoryDef } from '../../core/market.service';
import { ToastService } from '../../core/services/toast.service';
import { FirebaseService } from '../../core/services/firebase.service';

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
  private firebaseService = inject(FirebaseService);
  private router = inject(Router);

  // Available categories
  categories = MARKET_CATEGORIES;

  // Selected product detail modal
  viewingItem = signal<MarketItem | null>(null);

  // Product Creation Modal
  isAddModalOpen = signal<boolean>(false);
  
  // Product Edit Modal
  isEditModalOpen = signal<boolean>(false);
  editingItem = signal<MarketItem | null>(null);

  // Embedded Webview / Demo Modal
  demoModalItem = signal<MarketItem | null>(null);

  // Add Product Form State
  newTitle = '';
  newDesc = '';
  newPrice = 0;
  newStock = 10;
  newCategory = 'software_nodes';
  newBadge = 'WEB_APPS';
  newBadgeColor: 'emerald' | 'amber' | 'sky' | 'indigo' | 'purple' = 'emerald';
  newImageUrl = '';
  newDemoUrl = '';
  newTags = '';

  // Preset covers for easy aesthetic selection
  presetImages = [
    { label: 'طبيعة وجبال', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=800&auto=format&fit=crop' },
    { label: 'مكتبة حديثة', url: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=800&auto=format&fit=crop' },
    { label: 'بحر وشواطئ', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop' },
    { label: 'حقول وكثبان', url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=800&auto=format&fit=crop' },
    { label: 'نيون وذكاء اصطناعي', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop' },
    { label: 'أيقونات 3D', url: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=800&auto=format&fit=crop' },
    { label: 'متحكمات وعتاد', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=800&auto=format&fit=crop' },
    { label: 'خوادم وسحابة', url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=800&auto=format&fit=crop' }
  ];

  // Current user ID
  get currentUserId(): string {
    return this.firebaseService.getUserId() || 'me';
  }

  // Filtered items computed dynamically
  filteredItems = computed(() => {
    const list = this.marketService.items();
    const activeCat = this.marketService.activeCategory();
    const activeTab = this.marketService.activeTab();
    const query = this.marketService.searchQuery().toLowerCase().trim();
    const userId = this.currentUserId;

    return list.filter(item => {
      // 1. Category filter
      if (activeCat !== 'all' && item.mainCategory !== activeCat) {
        return false;
      }

      // 2. Tab filter (explore vs mine)
      if (activeTab === 'mine') {
        const isOwner = item.sellerId === userId || item.sellerId === 'me';
        const isPurchased = item.purchasedBy?.includes(userId) || item.purchasedBy?.includes('me');
        if (!isOwner && !isPurchased) return false;
      }

      // 3. Search query filter
      if (query) {
        const matchTitle = item.title.toLowerCase().includes(query);
        const matchDesc = item.description.toLowerCase().includes(query);
        const matchCat = (item.categoryLabel || '').toLowerCase().includes(query);
        const matchTag = item.tags?.some(t => t.toLowerCase().includes(query));
        if (!matchTitle && !matchDesc && !matchCat && !matchTag) return false;
      }

      return true;
    });
  });

  // Count items per category
  getCategoryCount(catId: string): number {
    const list = this.marketService.items();
    if (catId === 'all') return list.length;
    return list.filter(i => i.mainCategory === catId).length;
  }

  // Select category from sidebar
  selectCategory(catId: string): void {
    this.marketService.activeCategory.set(catId);
  }

  // Switch tabs (explore vs mine)
  selectTab(tab: 'explore' | 'mine'): void {
    this.marketService.activeTab.set(tab);
  }

  // Check if item is owned by current user
  isOwned(item: MarketItem): boolean {
    const userId = this.currentUserId;
    return item.sellerId === userId || item.sellerId === 'me' || (item.purchasedBy?.includes(userId) ?? false) || (item.purchasedBy?.includes('me') ?? false);
  }

  // Open Add Product Dialog
  openAddModal(): void {
    this.newTitle = '';
    this.newDesc = '';
    this.newPrice = 0;
    this.newStock = 10;
    this.newCategory = 'ui_ux';
    this.newBadge = 'WEB_APPS';
    this.newBadgeColor = 'emerald';
    this.newImageUrl = this.presetImages[0].url;
    this.newDemoUrl = '';
    this.newTags = '';
    this.isAddModalOpen.set(true);
  }

  selectPresetCover(url: string): void {
    this.newImageUrl = url;
  }

  // Submit new product
  async handleCreateItem(): Promise<void> {
    if (!this.newTitle.trim()) {
      this.toast.show('يرجى إدخال اسم المنتج أو العقدة.', 'error');
      return;
    }

    const tagsList = this.newTags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const created = await this.marketService.addItem({
      title: this.newTitle,
      description: this.newDesc,
      price: Number(this.newPrice) || 0,
      stock: Number(this.newStock) || 1,
      mainCategory: this.newCategory,
      badge: this.newBadge || (this.newPrice === 0 ? 'مجاني' : 'WEB_APPS'),
      badgeColor: this.newBadgeColor,
      imageUrl: this.newImageUrl || this.presetImages[0].url,
      demoUrl: this.newDemoUrl ? this.newDemoUrl.trim() : undefined,
      tags: tagsList.length > 0 ? tagsList : undefined
    });

    this.isAddModalOpen.set(false);
    this.toast.show(`تم إطلاق "${created.title}" بنجاح في سوق العقد العصبية!`, 'success');
  }

  // Acquire / Buy Product
  async handleAcquire(item: MarketItem): Promise<void> {
    const res = await this.marketService.acquireItem(item.id);
    if (res.success) {
      this.toast.show(res.message, 'success');
    } else {
      this.toast.show(res.message, 'error');
    }
  }

  // Open Live Demo / Shortcut / Tool
  launchProduct(item: MarketItem): void {
    if (!item.demoUrl) {
      this.viewingItem.set(item);
      return;
    }

    // Check if internal route
    if (item.demoUrl.startsWith('/')) {
      this.router.navigateByUrl(item.demoUrl);
    } else {
      // External link: open in new tab
      window.open(item.demoUrl, '_blank', 'noopener,noreferrer');
    }
  }

  // Open Edit Modal
  openEditModal(item: MarketItem): void {
    this.editingItem.set({ ...item });
    this.isEditModalOpen.set(true);
  }

  // Save Product Edits
  async handleSaveEdit(): Promise<void> {
    const item = this.editingItem();
    if (!item) return;

    await this.marketService.updateItem(item.id, {
      title: item.title,
      description: item.description,
      price: Number(item.price) || 0,
      stock: Number(item.stock) || 1,
      mainCategory: item.mainCategory,
      badge: item.badge,
      imageUrl: item.imageUrl,
      demoUrl: item.demoUrl
    });

    this.isEditModalOpen.set(false);
    this.editingItem.set(null);
    if (this.viewingItem()?.id === item.id) {
      this.viewingItem.set(item);
    }
    this.toast.show('تم تحديث بيانات العقدة بنجاح.', 'success');
  }

  // Delete product
  async handleDelete(item: MarketItem): Promise<void> {
    const confirmed = await this.toast.confirm(`هل أنت متأكد من حذف "${item.title}" نهائياً من السوق؟`);
    if (confirmed) {
      await this.marketService.deleteItem(item.id);
      this.viewingItem.set(null);
      this.toast.show('تم حذف المنتج بنجاح.', 'info');
    }
  }

  // Copy product link to clipboard
  copyShareLink(item: MarketItem): void {
    const link = `${window.location.origin}/market?item=${item.id}`;
    navigator.clipboard.writeText(link);
    this.toast.show('تم نسخ رابط العقدة إلى الحافظة بنجاح.', 'success');
  }
}
