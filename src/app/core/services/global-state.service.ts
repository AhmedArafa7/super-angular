import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { FirebaseService } from './firebase.service';

export interface Friend {
  id: string;
  name: string;
  avatarUrl: string;
  status: 'online' | 'offline' | 'in-game';
  gameName?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GlobalStateService {
  private firebaseService = inject(FirebaseService);

  // Signals for sustainable reactive state
  readonly walletBalance = signal<number>(1500.50);
  readonly unreadNotificationsCount = signal<number>(3);
  
  readonly friends = signal<Friend[]>([]);
  readonly activeGameInvites = signal<any[]>([]);

  readonly userProfile = computed(() => {
    const userData = this.firebaseService.userData();
    return {
      name: userData?.name || userData?.displayName || 'مستخدم جديد',
      avatarUrl: userData?.avatar_url || userData?.photoURL || 'https://i.pravatar.cc/150?u=a042581f4e29026704d',
      firstLetter: (userData?.name || userData?.displayName || 'م').charAt(0).toUpperCase(),
      isPro: localStorage.getItem('isPro') === 'true' // Local check for Pro status
    };
  });

  // Computed signals if needed
  readonly formattedBalance = computed(() => {
    return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(this.walletBalance());
  });

  constructor() {
    effect(() => {
      const userData = this.firebaseService.userData();
      if (userData && userData.friendIds && userData.friendIds.length > 0) {
        this.fetchFriends(userData.friendIds);
      } else {
        this.friends.set([]);
      }
    });

    // Listen for incoming game invites
    effect((onCleanup) => {
      const isReady = this.firebaseService.isReady();
      const user = this.firebaseService.currentUser();
      if (isReady && user) {
        const unsubscribe = this.firebaseService.listenForGameInvites((invites) => {
          this.activeGameInvites.set(invites);
        });
        onCleanup(() => {
          if (unsubscribe) unsubscribe();
        });
      }
    });
  }

  private async fetchFriends(uids: string[]) {
    const data = await this.firebaseService.getFriendsByUids(uids);
    const mapped: Friend[] = data.map(u => ({
      id: u.uid,
      name: u.name || u.displayName || u.username || 'بدون اسم',
      avatarUrl: u.avatar_url || u.photoURL || 'https://ui-avatars.com/api/?name=' + (u.name || u.displayName || 'User') + '&background=random',
      status: (u.currentGame ? 'in-game' : (u.status === 'online' ? 'online' : 'offline')) as any,
      gameName: u.currentGame
    }));
    this.friends.set(mapped);
  }

  // Methods to update state
  updateBalance(amount: number) {
    this.walletBalance.update(b => b + amount);
  }

  clearNotifications() {
    this.unreadNotificationsCount.set(0);
  }

  async addFriend(name: string): Promise<boolean> {
    const user = await this.firebaseService.searchUser(name);
    if (user && user.uid) {
      await this.firebaseService.addFriendToCurrentUser(user.uid);
      return true; // Success
    }
    return false; // Not found
  }
}
