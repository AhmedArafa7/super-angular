import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { AdminService, UserNode, CategorySuggestion } from '../../core/admin.service';
import { AdsService, Ad } from '../../core/ads.service';
import { MarketService, MarketItem } from '../../core/market.service';
import { LauncherService, WebProject } from '../../core/launcher.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideDynamicIcon],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent {
  adminService = inject(AdminService);
  adsService = inject(AdsService);
  marketService = inject(MarketService);
  launcherService = inject(LauncherService);

  // Active sub-tab state
  activeTab = signal<'products' | 'categories' | 'ads' | 'apps' | 'users' | 'logs'>('products');

  // Input states for feedback
  rejectFeedback = signal<Record<string, string>>({});
  allocationAmounts = signal<Record<string, number>>({});

  updateRejectFeedback(id: string, text: string): void {
    this.rejectFeedback.update(f => ({ ...f, [id]: text }));
  }

  updateAllocationAmount(id: string, amount: number): void {
    this.allocationAmounts.update(a => ({ ...a, [id]: amount }));
  }

  // Computed Pending Market Products
  pendingProducts = computed(() => {
    return this.marketService.items().filter(item => item.status === 'pending_review');
  });

  // Computed Pending Category Requests
  pendingCategories = computed(() => {
    return this.adminService.categorySuggestions().filter(c => c.status === 'pending');
  });

  // Computed Pending Ads Proposals
  pendingAds = computed(() => {
    return this.adsService.ads().filter(ad => ad.status === 'pending_review');
  });

  // Computed Pending App Launcher Requests
  pendingApps = computed(() => {
    return this.launcherService.apps().filter(app => app.status === 'pending');
  });

  // Action: Approve / Reject Marketplace Products
  moderateProduct(productId: string, status: 'active' | 'rejected'): void {
    const feedback = this.rejectFeedback()[productId] || '';
    
    // Call market service updates
    this.marketService.items.update(list => 
      list.map(item => {
        if (item.id === productId) {
          return {
            ...item,
            status,
            adminFeedback: status === 'rejected' ? feedback : undefined
          };
        }
        return item;
      })
    );
    this.marketService.saveState();

    this.adminService.logAction(`PRODUCT_MODERATION: معالجة المنتج ${productId} بالـ ${status}`);
    
    // Clear feedback state
    this.rejectFeedback.update(f => {
      const copy = { ...f };
      delete copy[productId];
      return copy;
    });

    alert(status === 'active' ? '✅ تم نشر وتنشيط المنتج في المتجر بنجاح.' : '❌ تم رفض المنتج وإشعار البائع.');
  }

  // Action: Approve / Reject Category suggestions
  moderateCategory(suggestionId: string, status: 'approved' | 'rejected'): void {
    const reason = this.rejectFeedback()[suggestionId] || '';
    this.adminService.moderateCategory(suggestionId, status, reason);
    
    // Clear feedback
    this.rejectFeedback.update(f => {
      const copy = { ...f };
      delete copy[suggestionId];
      return copy;
    });

    alert(status === 'approved' ? '✅ تم اعتماد وتنشيط التصنيف الجديد.' : '❌ تم رفض المقترح بنجاح.');
  }

  // Action: Approve / Reject Ads Campaigns
  moderateAd(adId: string, status: 'active' | 'rejected'): void {
    const reason = this.rejectFeedback()[adId] || '';
    this.adsService.moderateAd(adId, status, reason);

    // Clear feedback
    this.rejectFeedback.update(f => {
      const copy = { ...f };
      delete copy[adId];
      return copy;
    });

    alert(status === 'active' ? '✅ تم نشر الحملة الإعلانية على لوحات الشبكة.' : '❌ تم رفض الإعلان.');
  }

  // Action: Approve / Reject Launcher Applications
  moderateApp(appId: string, status: 'approved' | 'rejected'): void {
    if (status === 'approved') {
      this.launcherService.approveApp(appId, 0, 'free');
    } else {
      this.launcherService.rejectApp(appId);
    }
    this.adminService.logAction(`APP_MODERATION: معالجة التطبيق ${appId} بالـ ${status}`);
    alert(status === 'approved' ? '✅ تم الموافقة على التطبيق ونشره في المنصة.' : '❌ تم رفض وإرجاع مقترح التطبيق.');
  }

  // Action: Update user node roles
  changeUserRole(user: UserNode, role: UserNode['role']): void {
    this.adminService.updateUserRole(user.id, role);
  }

  // Action: Allocate credit coins to node
  grantCredits(user: UserNode): void {
    const amt = this.allocationAmounts()[user.id] || 0;
    if (amt <= 0) return;

    this.adminService.allocateCredits(user.id, amt);

    // Reset allocation amount field
    this.allocationAmounts.update(a => {
      const copy = { ...a };
      copy[user.id] = 0;
      return copy;
    });

    alert(`🎉 تم منح العقدة ${user.name} رصيداً إضافياً بقيمة ${amt} EGC بنجاح.`);
  }

  // Action: Toggle suspended state
  toggleSuspend(user: UserNode): void {
    this.adminService.toggleUserStatus(user.id);
  }

  openExternal(url: string): void {
    window.open(url, '_blank');
  }
}
