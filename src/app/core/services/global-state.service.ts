import { Injectable, signal, computed } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class GlobalStateService {
  // Signals for sustainable reactive state
  readonly walletBalance = signal<number>(1500.50);
  readonly unreadNotificationsCount = signal<number>(3);
  
  readonly userProfile = signal<{ name: string, avatarUrl: string }>({
    name: 'أحمد عرفة',
    avatarUrl: 'https://i.pravatar.cc/150?u=a042581f4e29026704d'
  });

  // Computed signals if needed
  readonly formattedBalance = computed(() => {
    return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(this.walletBalance());
  });

  // Methods to update state (will be called by real backend services later)
  updateBalance(amount: number) {
    this.walletBalance.update(b => b + amount);
  }

  clearNotifications() {
    this.unreadNotificationsCount.set(0);
  }
}
