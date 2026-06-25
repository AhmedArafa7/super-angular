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

      let parentSessionReceived = false;

      // Request session from parent Next.js app
      if (window.parent !== window) {
        // Use document.referrer if possible, or explicit origins
        const parentOrigin = document.referrer ? new URL(document.referrer).origin : '*';
        window.parent.postMessage({ type: 'SI_NEURO_AUTH_REQUEST' }, parentOrigin);
      }

      window.addEventListener('message', async (event) => {
        const allowedOrigins = ['http://localhost:3000', 'http://localhost:9002', 'http://localhost:4200'];
        const isAllowedOrigin = allowedOrigins.includes(event.origin) || 
                               (document.referrer && document.referrer.startsWith(event.origin)) ||
                               event.origin === window.location.origin;
                               
        if (!isAllowedOrigin) return;

        if (event.data?.type === 'SI_NEURO_AUTH_RESPONSE') {
          const { user, token } = event.data;
          if (user) {
            parentSessionReceived = true;
            // Instantly update UI Signal for reactivity
            this.currentUser.set({
              uid: user.id,
              email: user.email,
              displayName: user.name || user.username,
              photoURL: user.avatar_url,
              ...user
            } as any);

            // Store ID token for backend services
            if (token) localStorage.setItem('si_neuro_id_token', token);

            // Merge local guest data with authenticated session securely
            await this.mergeAndLoadUserData(user.id);
            this.isReady.set(true);
          }
        }
      });

      onAuthStateChanged(this.auth, (user) => {
        if (parentSessionReceived) return; // Do not overwrite parent session if synced

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

  private async mergeAndLoadUserData(uid: string): Promise<void> {
    try {
      const localData = this.userData();
      const userRef = doc(this.firestore, 'users', uid);
      const snap = await getDoc(userRef);
      let newUserData: UserData;

      if (snap.exists()) {
        const remoteData = snap.data() as UserData;
        newUserData = {
           ...remoteData,
           watchHistory: this.mergeArrays(remoteData.watchHistory, localData?.watchHistory, 'videoId'),
           subscriptions: Array.from(new Set([...(remoteData.subscriptions || []), ...(localData?.subscriptions || [])])),
           searchHistory: Array.from(new Set([...(remoteData.searchHistory || []), ...(localData?.searchHistory || [])]))
        };
        await updateDoc(userRef, newUserData as any);
      } else {
        newUserData = {
          uid,
          createdAt: Date.now(),
          linkedAccounts: localData?.linkedAccounts || [],
          subscriptions: localData?.subscriptions || [],
          watchHistory: localData?.watchHistory || [],
          interests: localData?.interests || [],
          searchHistory: localData?.searchHistory || [],
          onboardingComplete: localData?.onboardingComplete || false
        };
        await setDoc(userRef, newUserData);
      }
      this.userData.set(newUserData);
    } catch (err) {
      console.error('[FirebaseService] mergeAndLoadUserData failed:', err);
    }
  }

  private mergeArrays(arr1: any[] = [], arr2: any[] = [], key: string): any[] {
     const map = new Map();
     [...arr1, ...arr2].forEach(item => {
        if (item && item[key]) map.set(item[key], item);
     });
     return Array.from(map.values());
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
