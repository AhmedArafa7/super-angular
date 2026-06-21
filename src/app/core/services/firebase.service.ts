import { Injectable, inject, signal } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, User, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, Firestore, doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { environment } from '../../../environments/environment';

export interface UserData {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  linkedAccounts?: LinkedAccount[];
  subscriptions?: string[];
  watchHistory?: WatchHistoryItem[];
  createdAt?: number;
  interests?: string[];
  searchHistory?: string[];
  onboardingComplete?: boolean;
  onboardingCompletedAt?: number;
}

export interface LinkedAccount {
  platform: 'youtube' | 'whatsapp' | 'telegram' | 'google';
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  channelId?: string;
  channelTitle?: string;
  avatarUrl?: string;
}

export interface WatchHistoryItem {
  videoId: string;
  title: string;
  thumbnail: string;
  author: string;
  watchedAt: number;
  progress?: number;
}

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private app!: FirebaseApp;
  private auth!: Auth;
  private firestore!: Firestore;

  readonly currentUser = signal<User | null>(null);
  readonly userData = signal<UserData | null>(null);
  readonly isReady = signal<boolean>(false);

  constructor() {
    try {
      this.app = initializeApp(environment.firebase);
      this.auth = getAuth(this.app);
      this.firestore = getFirestore(this.app);

      onAuthStateChanged(this.auth, (user) => {
        this.currentUser.set(user);
        if (user) {
          this.loadUserData(user.uid);
        } else {
          this.userData.set(null);
          this.signInAnonymously();
        }
        this.isReady.set(true);
      });
    } catch (err) {
      console.error('[FirebaseService] Init failed:', err);
      this.isReady.set(true);
    }
  }

  async signInAnonymously(): Promise<void> {
    try {
      await signInAnonymously(this.auth);
    } catch (err) {
      console.error('[FirebaseService] Anonymous sign-in failed:', err);
    }
  }

  async signInWithCustomToken(token: string): Promise<void> {
    try {
      await signInWithCustomToken(this.auth, token);
    } catch (err) {
      console.error('[FirebaseService] Custom token sign-in failed:', err);
    }
  }

  async signInWithGoogle(): Promise<boolean> {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/youtube.readonly');
      provider.setCustomParameters({
        prompt: 'consent',
        access_type: 'offline'
      });

      const result = await signInWithPopup(this.auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      
      if (credential?.accessToken) {
        // Token expires in ~1 hour (3600 seconds), we set expiry 5 minutes early to be safe
        const expiresAt = Date.now() + (55 * 60 * 1000); 
        
        // Save the Google credentials locally immediately for fast access
        localStorage.setItem('yt_access_token', credential.accessToken);
        localStorage.setItem('yt_token_expiry', expiresAt.toString());

        await this.saveYouTubeAuth({
          accessToken: credential.accessToken,
          expiresAt: expiresAt
        });

        // Also update the basic user data if we just linked a real account
        if (result.user) {
          const uid = result.user.uid;
          const userRef = doc(this.firestore, 'users', uid);
          await updateDoc(userRef, {
            displayName: result.user.displayName,
            photoURL: result.user.photoURL,
            email: result.user.email
          });
          this.userData.update(u => u ? { 
            ...u, 
            displayName: result.user.displayName || u.displayName,
            photoURL: result.user.photoURL || u.photoURL,
            email: result.user.email || u.email
          } : u);
        }

        return true;
      }
      return false;
    } catch (err) {
      console.error('[FirebaseService] Google sign-in failed:', err);
      return false;
    }
  }

  async refreshGoogleToken(): Promise<string | null> {
    // Attempt silent refresh via a background popup
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/youtube.readonly');
      const result = await signInWithPopup(this.auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        const expiresAt = Date.now() + (55 * 60 * 1000); 
        localStorage.setItem('yt_access_token', credential.accessToken);
        localStorage.setItem('yt_token_expiry', expiresAt.toString());
        await this.saveYouTubeAuth({ accessToken: credential.accessToken, expiresAt });
        return credential.accessToken;
      }
    } catch (err) {
      console.error('[FirebaseService] Token refresh failed', err);
    }
    return null;
  }

  private async loadUserData(uid: string): Promise<void> {
    try {
      const userRef = doc(this.firestore, 'users', uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        this.userData.set(snap.data() as UserData);
      } else {
        const newUser: UserData = {
          uid,
          createdAt: Date.now(),
          linkedAccounts: [],
          subscriptions: [],
          watchHistory: [],
          interests: [],
          searchHistory: [],
          onboardingComplete: false
        };
        await setDoc(userRef, newUser);
        this.userData.set(newUser);
      }
    } catch (err) {
      console.error('[FirebaseService] loadUserData failed:', err);
    }
  }

  getUserId(): string | null {
    return this.currentUser()?.uid || null;
  }

  getYouTubeAccount(): LinkedAccount | null {
    const accounts = this.userData()?.linkedAccounts || [];
    return accounts.find(a => a.platform === 'youtube') || null;
  }

  async saveYouTubeAuth(authData: Partial<LinkedAccount>): Promise<void> {
    const uid = this.getUserId();
    if (!uid) return;

    try {
      const userRef = doc(this.firestore, 'users', uid);
      const currentAccounts = this.userData()?.linkedAccounts || [];
      const filtered = currentAccounts.filter(a => a.platform !== 'youtube');
      const newAccounts = [...filtered, { platform: 'youtube' as const, ...authData }];
      await updateDoc(userRef, { linkedAccounts: newAccounts });

      this.userData.update(u => u ? { ...u, linkedAccounts: newAccounts } : u);
    } catch (err) {
      console.error('[FirebaseService] saveYouTubeAuth failed:', err);
    }
  }

  async addToHistory(item: WatchHistoryItem): Promise<void> {
    const uid = this.getUserId();
    if (!uid) return;

    try {
      const userRef = doc(this.firestore, 'users', uid);
      const currentHistory = this.userData()?.watchHistory || [];
      const filtered = currentHistory.filter(h => h.videoId !== item.videoId);
      const newHistory = [item, ...filtered].slice(0, 100);
      await updateDoc(userRef, { watchHistory: newHistory });

      this.userData.update(u => u ? { ...u, watchHistory: newHistory } : u);
    } catch (err) {
      console.error('[FirebaseService] addToHistory failed:', err);
    }
  }

  async addSubscription(channelId: string, channelTitle: string, avatarUrl?: string): Promise<void> {
    const uid = this.getUserId();
    if (!uid) return;

    try {
      const userRef = doc(this.firestore, 'users', uid);
      const currentSubs = this.userData()?.subscriptions || [];
      if (currentSubs.includes(channelId)) return;

      const newSubs = [...currentSubs, channelId];
      await updateDoc(userRef, { subscriptions: newSubs });

      const subRef = doc(this.firestore, 'subscriptions', `${uid}_${channelId}`);
      await setDoc(subRef, {
        userId: uid,
        channelId,
        channelTitle,
        avatarUrl,
        subscribedAt: Date.now()
      });

      this.userData.update(u => u ? { ...u, subscriptions: newSubs } : u);
    } catch (err) {
      console.error('[FirebaseService] addSubscription failed:', err);
    }
  }

  async removeSubscription(channelId: string): Promise<void> {
    const uid = this.getUserId();
    if (!uid) return;

    try {
      const userRef = doc(this.firestore, 'users', uid);
      const currentSubs = this.userData()?.subscriptions || [];
      const newSubs = currentSubs.filter(id => id !== channelId);
      await updateDoc(userRef, { subscriptions: newSubs });

      this.userData.update(u => u ? { ...u, subscriptions: newSubs } : u);
    } catch (err) {
      console.error('[FirebaseService] removeSubscription failed:', err);
    }
  }

  async recordSearch(query: string): Promise<void> {
    const uid = this.getUserId();
    if (!uid || !query.trim()) return;

    try {
      const userRef = doc(this.firestore, 'users', uid);
      const currentHistory = this.userData()?.searchHistory || [];
      const newHistory = [query, ...currentHistory.filter(q => q !== query)].slice(0, 50);
      await updateDoc(userRef, { searchHistory: newHistory });

      this.userData.update(u => u ? { ...u, searchHistory: newHistory } : u);
    } catch (err) {
      console.error('[FirebaseService] recordSearch failed:', err);
    }
  }

  async completeOnboarding(interests: string[]): Promise<void> {
    const uid = this.getUserId();
    if (!uid) return;

    try {
      const userRef = doc(this.firestore, 'users', uid);
      await updateDoc(userRef, {
        interests,
        onboardingComplete: true,
        onboardingCompletedAt: Date.now()
      });

      this.userData.update(u => u ? { ...u, interests, onboardingComplete: true } : u);
    } catch (err) {
      console.error('[FirebaseService] completeOnboarding failed:', err);
    }
  }

  isOnboardingComplete(): boolean {
    return this.userData()?.onboardingComplete === true;
  }
}
