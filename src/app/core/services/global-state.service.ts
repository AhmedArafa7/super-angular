import { Injectable, signal, computed, inject } from '@angular/core';
import { FirebaseService } from './firebase.service';

@Injectable({
  providedIn: 'root'
})
export class GlobalStateService {
  private firebaseService = inject(FirebaseService);

  // Signals for sustainable reactive state
  readonly walletBalance = signal<number>(1500.50);
  readonly unreadNotificationsCount = signal<number>(3);
  
  readonly userProfile = computed(() => {
    const userData = this.firebaseService.userData();
    return {
      name: userData?.displayName || 'مستخدم جديد',
      avatarUrl: userData?.photoURL || 'https://i.pravatar.cc/150?u=a042581f4e29026704d',
      firstLetter: (userData?.displayName || 'م').charAt(0).toUpperCase()
    };
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
