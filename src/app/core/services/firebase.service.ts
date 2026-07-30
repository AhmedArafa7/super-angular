import { Injectable, inject, signal } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, User, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, Firestore, doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, orderBy, limit, startAfter, QueryDocumentSnapshot, documentId, runTransaction, arrayUnion, addDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL, FirebaseStorage } from 'firebase/storage';
import { environment } from '../../../environments/environment';

export interface UserData {
  uid: string;
  id?: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  name?: string;
  username?: string;
  avatar_url?: string;
  status?: string;
  lastSeen?: string;
  currentGame?: string;
  friendIds?: string[];
  linkedAccounts?: LinkedAccount[];
  subscriptions?: string[];
  watchHistory?: WatchHistoryItem[];
  createdAt?: number;
  interests?: string[];
  searchHistory?: string[];
  onboardingComplete?: boolean;
  onboardingCompletedAt?: number;
  role?: 'admin' | 'reviewer' | 'user' | 'founder' | 'cofounder' | 'management' | 'free';
}

/**
 * FIRESTORE SECURITY RULES (REQUIRED)
 * 
 * rules_version = '2';
 * service cloud.firestore {
 *   match /databases/{database}/documents {
 *     // Helper functions
 *     function isReviewer() {
 *       return request.auth != null && 
 *              (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' ||
 *               get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'reviewer');
 *     }
 * 
 *     // Videos Collection (Whitelist)
 *     match /videos/{videoId} {
 *       // Regular users can only read published videos
 *       allow read: if resource.data.status == 'published' || isReviewer();
 *       // Only admins/reviewers can create or update videos
 *       allow create, update, delete: if isReviewer();
 *     }
 * 
 *     // Blacklisted Channels Collection
 *     match /blacklisted_channels/{channelId} {
 *       // Only admins/reviewers can read or write to the blacklist
 *       allow read, write: if isReviewer();
 *     }
 *     
 *     // Blacklisted Videos Collection (per-video reports)
 *     match /blacklisted_videos/{videoId} {
 *       // Any authenticated user can report (create)
 *       allow create: if request.auth != null;
 *       // Only admins/reviewers can read/update/delete
 *       allow read, update, delete: if isReviewer();
 *     }
 *     
 *     // User notifications (subcollection)
 *     match /users/{userId}/notifications/{notificationId} {
 *       // Only the notification owner can read/update their own notifications
 *       allow read, update: if request.auth != null && request.auth.uid == userId;
 *       // Any authenticated user can create a notification for another user (for reporting)
 *       allow create: if request.auth != null;
 *       allow delete: if isReviewer();
 *     }
 *     
 *     // Other collections...
 *   }
 * }
 */

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
  public app!: FirebaseApp;
  public auth!: Auth;
  public firestore!: Firestore;
  public storage!: FirebaseStorage;
  
  readonly currentUser = signal<User | null>(null);
  readonly userData = signal<UserData | null>(null);
  readonly isReady = signal<boolean>(false);

  get db(): Firestore {
    return this.firestore;
  }

  constructor() {
    try {
      this.app = initializeApp(environment.firebase);
      this.auth = getAuth(this.app);
      this.firestore = getFirestore(this.app);
      this.storage = getStorage(this.app);

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
        const remoteData = snap.data() as UserData;
        this.userData.set({
          ...remoteData,
          displayName: remoteData.name || remoteData.displayName,
          photoURL: remoteData.avatar_url || remoteData.photoURL
        });

        // Sync YouTube credentials from remote DB to local storage if they exist
        const yt = remoteData.linkedAccounts?.find(a => a.platform === 'youtube');
        if (yt && yt.accessToken) {
          localStorage.setItem('yt_access_token', yt.accessToken);
          if (yt.expiresAt) {
            localStorage.setItem('yt_token_expiry', yt.expiresAt.toString());
          }
        }
      } else {
        let detectedName = `مستخدم ${uid.substring(0, 5).toUpperCase()}`;
        let detectedUsername = `guest_${uid.substring(0, 5)}`;
        
        if (this.auth.currentUser?.isAnonymous) {
          try {
            const sysRef = doc(this.firestore, 'system', 'metadata');
            const finalCount = await runTransaction(this.firestore, async (transaction) => {
              const sfDoc = await transaction.get(sysRef);
              let count = 1;
              if (sfDoc.exists()) {
                count = (sfDoc.data()['guestCount'] || 0) + 1;
                transaction.update(sysRef, { guestCount: count });
              } else {
                transaction.set(sysRef, { guestCount: count }, { merge: true });
              }
              return count;
            });
            detectedName = "مستخدم " + finalCount;
            detectedUsername = "guest_" + finalCount;
          } catch (err) {
            console.error("Counter TX Error:", err);
          }
        }

        const newUser: UserData = {
          uid,
          id: uid,
          displayName: detectedName,
          name: detectedName,
          username: detectedUsername,
          avatar_url: `https://picsum.photos/seed/${uid}/100/100`,
          photoURL: `https://picsum.photos/seed/${uid}/100/100`,
          role: 'free',
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

  async uploadVideoToStorage(file: File): Promise<string> {
    const fileName = `${Date.now()}_${file.name}`;
    const storageRef = ref(this.storage, `videos/${fileName}`);
    const uploadTask = await uploadBytesResumable(storageRef, file);
    return getDownloadURL(uploadTask.ref);
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
           displayName: remoteData.name || remoteData.displayName,
           photoURL: remoteData.avatar_url || remoteData.photoURL,
           watchHistory: this.mergeArrays(remoteData.watchHistory, localData?.watchHistory, 'videoId'),
           subscriptions: Array.from(new Set([...(remoteData.subscriptions || []), ...(localData?.subscriptions || [])])),
           searchHistory: Array.from(new Set([...(remoteData.searchHistory || []), ...(localData?.searchHistory || [])]))
        };
        await updateDoc(userRef, newUserData as any);
      } else {
        newUserData = {
          uid,
          id: uid,
          displayName: localData?.displayName || localData?.name || `مستخدم ${uid.substring(0, 5).toUpperCase()}`,
          name: localData?.name || localData?.displayName || `مستخدم ${uid.substring(0, 5).toUpperCase()}`,
          username: localData?.username || `user_${uid.substring(0, 5)}`,
          avatar_url: localData?.avatar_url || localData?.photoURL || `https://picsum.photos/seed/${uid}/100/100`,
          photoURL: localData?.photoURL || localData?.avatar_url || `https://picsum.photos/seed/${uid}/100/100`,
          role: localData?.role || 'free',
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

  async getPublishedVideos(lastDoc?: QueryDocumentSnapshot, pageSize: number = 20): Promise<{ videos: any[], lastVisible: QueryDocumentSnapshot | null }> {
    try {
      const videosRef = collection(this.firestore, 'videos');
      
      let q;
      if (lastDoc) {
        q = query(
          videosRef,
          where('status', '==', 'published'),
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(pageSize)
        );
      } else {
        q = query(
          videosRef,
          where('status', '==', 'published'),
          orderBy('createdAt', 'desc'),
          limit(pageSize)
        );
      }

      const snap = await getDocs(q);
      const videos = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const lastVisible = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;

      return { videos, lastVisible };
    } catch (err) {
      console.error('[FirebaseService] getPublishedVideos failed:', err);
      // Let the caller handle the fallback/empty state or retry logic
      throw err;
    }
  }

  // --- ADMIN MODERATION LOGIC ---

  async addVideoForReview(videoData: any): Promise<void> {
    try {
      const videosRef = collection(this.firestore, 'videos');
      
      // Strip undefined values to prevent Firestore Unsupported field value: undefined error
      const cleanData: any = {};
      Object.keys(videoData || {}).forEach(key => {
        if (videoData[key] !== undefined) {
          cleanData[key] = videoData[key];
        }
      });

      await addDoc(videosRef, {
        ...cleanData,
        status: 'pending_review',
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error('[FirebaseService] addVideoForReview failed:', err);
      throw err;
    }
  }

  async getVideosByStatus(status: 'pending_review' | 'published' | 'rejected', lastDoc?: QueryDocumentSnapshot, pageSize: number = 100): Promise<{ videos: any[], lastVisible: QueryDocumentSnapshot | null }> {
    try {
      const videosRef = collection(this.firestore, 'videos');
      
      let snap;
      try {
        let q;
        if (lastDoc) {
          q = query(videosRef, where('status', '==', status), orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(pageSize));
        } else {
          q = query(videosRef, where('status', '==', status), orderBy('createdAt', 'desc'), limit(pageSize));
        }
        snap = await getDocs(q);
      } catch (orderErr) {
        console.warn(`[FirebaseService] orderBy createdAt failed for status ${status}, falling back to simple query:`, orderErr);
        let qFallback;
        if (lastDoc) {
          qFallback = query(videosRef, where('status', '==', status), startAfter(lastDoc), limit(pageSize));
        } else {
          qFallback = query(videosRef, where('status', '==', status), limit(pageSize));
        }
        snap = await getDocs(qFallback);
      }

      const videos = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const lastVisible = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;

      return { videos, lastVisible };
    } catch (err) {
      console.error(`[FirebaseService] getVideosByStatus(${status}) failed:`, err);
      return { videos: [], lastVisible: null };
    }
  }

  async updateVideoStatus(videoId: string, newStatus: string): Promise<void> {
    try {
      const docRef = doc(this.firestore, 'videos', videoId);
      await updateDoc(docRef, { status: newStatus });
    } catch (err) {
      console.error(`[FirebaseService] updateVideoStatus failed for ${videoId}:`, err);
      throw err;
    }
  }

  async updateVideoData(videoId: string, data: any): Promise<void> {
    try {
      const docRef = doc(this.firestore, 'videos', videoId);
      await updateDoc(docRef, data);
    } catch (err) {
      console.error(`[FirebaseService] updateVideoData failed for ${videoId}:`, err);
      throw err;
    }
  }

  async getBlacklistedChannelsList(lastDoc?: QueryDocumentSnapshot, pageSize: number = 20): Promise<{ channels: any[], lastVisible: QueryDocumentSnapshot | null }> {
    try {
      const channelsRef = collection(this.firestore, 'blacklisted_channels');
      let q;
      if (lastDoc) {
        q = query(channelsRef, orderBy('blacklistedAt', 'desc'), startAfter(lastDoc), limit(pageSize));
      } else {
        q = query(channelsRef, orderBy('blacklistedAt', 'desc'), limit(pageSize));
      }

      const snap = await getDocs(q);
      const channels = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const lastVisible = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;

      return { channels, lastVisible };
    } catch (err) {
      console.error('[FirebaseService] getBlacklistedChannelsList failed:', err);
      throw err;
    }
  }

  async removeBlacklistedChannel(channelId: string): Promise<void> {
    try {
      const { deleteDoc } = await import('firebase/firestore');
      const docRef = doc(this.firestore, 'blacklisted_channels', channelId);
      await deleteDoc(docRef);
    } catch (err) {
      console.error(`[FirebaseService] removeBlacklistedChannel failed for ${channelId}:`, err);
      throw err;
    }
  }

  // --- REVIEWER DISCOVERY & BLACKLIST LOGIC ---

  async syncBlacklistedChannels(): Promise<string[]> {
    try {
      const q = query(collection(this.firestore, 'blacklisted_channels'));
      const snap = await getDocs(q);
      return snap.docs.map(doc => doc.id);
    } catch (err) {
      console.error('[FirebaseService] syncBlacklistedChannels failed', err);
      return [];
    }
  }

  async blacklistChannel(channelId: string, channelName: string): Promise<void> {
    try {
      const docRef = doc(this.firestore, 'blacklisted_channels', channelId);
      await setDoc(docRef, {
        channelId,
        channelName,
        blacklistedAt: Date.now(),
        blacklistedBy: this.getUserId()
      });
    } catch (err) {
      console.error('[FirebaseService] blacklistChannel failed', err);
      throw err;
    }
  }

  async addVideoToWhitelist(video: any): Promise<void> {
    try {
      if (!video || !video.id) {
        throw new Error('Invalid video object provided');
      }

      // First check if the video already exists
      const docRef = doc(this.firestore, 'videos', video.id);
      const docSnap = await getDoc(docRef);
      
      // If it already exists, do nothing (don't overwrite
      if (docSnap.exists()) {
        console.log('[FirebaseService] Video already exists in whitelist');
        return;
      }
      
      let parsedViews = 0;
      if (typeof video.views === 'number') {
        parsedViews = video.views;
      } else if (typeof video.views === 'string') {
        parsedViews = parseInt(video.views.replace(/\D/g, '')) || 0;
      }

      const videoData = {
        id: video.id,
        title: video.title || '',
        externalUrl: video.url || video.externalUrl || `https://www.youtube.com/watch?v=${video.id}`,
        thumbnail: video.thumbnail || '',
        author: video.author || '',
        authorId: video.authorId || null,
        channelAvatar: video.channelAvatar || null,
        status: 'pending_review', // Users can only submit for review
        createdAt: Date.now(),
        addedBy: this.getUserId() || 'anonymous',
        isShorts: video.isShorts || false,
        duration: video.duration || null,
        views: parsedViews
      };

      await setDoc(docRef, videoData);
    } catch (err) {
      console.error('[FirebaseService] addVideoToWhitelist failed', err);
      throw err;
    }
  }

  async checkVideosExist(videoIds: string[]): Promise<string[]> {
    if (!videoIds || videoIds.length === 0) return [];
    
    // Firestore `in` queries are limited to 30 items. We chunk them into groups of 25.
    const chunkSize = 25;
    const chunks: string[][] = [];
    for (let i = 0; i < videoIds.length; i += chunkSize) {
      chunks.push(videoIds.slice(i, i + chunkSize));
    }

    try {
      const existingIds: string[] = [];
      const videosRef = collection(this.firestore, 'videos');
      
      const promises = chunks.map(async chunk => {
        const q = query(videosRef, where(documentId(), 'in', chunk));
        const snap = await getDocs(q);
        return snap.docs.map(doc => doc.id);
      });

      const results = await Promise.all(promises);
      results.forEach(res => existingIds.push(...res));
      
      return existingIds;
    } catch (err) {
      console.error('[FirebaseService] checkVideosExist failed', err);
      return [];
    }
  }

  getLoginProvider(): 'google' | 'github' | 'credentials' | 'anonymous' | null {
    const user = this.auth?.currentUser;
    if (!user) return null;
    if (user.isAnonymous) return 'anonymous';
    const providers = user.providerData.map(p => p.providerId);
    if (providers.includes('google.com')) return 'google';
    if (providers.includes('github.com')) return 'github';
    if (providers.includes('password')) return 'credentials';
    return null;
  }

  async logout(): Promise<void> {
    try {
      const { signOut } = await import('firebase/auth');
      await signOut(this.auth);
      localStorage.removeItem('yt_access_token');
      localStorage.removeItem('yt_token_expiry');
      localStorage.setItem('manual_logout', 'true');
    } catch (err) {
      console.error('[FirebaseService] Logout failed:', err);
    }
  }

  // ==========================================
  // FRIENDS SYSTEM
  // ==========================================

  async searchUser(searchQuery: string): Promise<UserData | null> {
    if (!searchQuery) return null;
    const usersRef = collection(this.firestore, 'users');
    
    // First, search by exact displayName
    try {
      const q0 = query(usersRef, where('displayName', '==', searchQuery), limit(1));
      const snap0 = await getDocs(q0);
      if (!snap0.empty) {
        return { uid: snap0.docs[0].id, ...snap0.docs[0].data() } as UserData;
      }

      // Then by name
      const q = query(usersRef, where('name', '==', searchQuery), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return { uid: snap.docs[0].id, ...snap.docs[0].data() } as UserData;
      }

      // If not found, try username
      const q2 = query(usersRef, where('username', '==', searchQuery), limit(1));
      const snap2 = await getDocs(q2);
      if (!snap2.empty) {
        return { uid: snap2.docs[0].id, ...snap2.docs[0].data() } as UserData;
      }
      
      // Also try to find by email if they typed an email
      if (searchQuery.includes('@')) {
        const qEmail = query(usersRef, where('email', '==', searchQuery), limit(1));
        const snapEmail = await getDocs(qEmail);
        if (!snapEmail.empty) {
          return { uid: snapEmail.docs[0].id, ...snapEmail.docs[0].data() } as UserData;
        }
      }
    } catch (err) {
      console.error('[FirebaseService] searchUser failed:', err);
    }
    return null;
  }

  async addFriendToCurrentUser(friendUid: string): Promise<void> {
    const currentUser = this.currentUser();
    if (!currentUser) throw new Error('No active user');
    
    const userRef = doc(this.firestore, 'users', currentUser.uid);
    try {
      await updateDoc(userRef, {
        friendIds: arrayUnion(friendUid)
      });
      
      // Update local state immediately
      const currentData = this.userData();
      if (currentData) {
        const currentFriendIds = currentData.friendIds || [];
        if (!currentFriendIds.includes(friendUid)) {
           this.userData.set({ ...currentData, friendIds: [...currentFriendIds, friendUid] });
        }
      }
    } catch (err) {
      console.error('[FirebaseService] addFriendToCurrentUser failed:', err);
      throw err;
    }
  }

  async getFriendsByUids(uids: string[]): Promise<UserData[]> {
    if (!uids || uids.length === 0) return [];
    
    const chunkSize = 25;
    const chunks: string[][] = [];
    for (let i = 0; i < uids.length; i += chunkSize) {
      chunks.push(uids.slice(i, i + chunkSize));
    }

    try {
      const usersRef = collection(this.firestore, 'users');
      const promises = chunks.map(async chunk => {
        const q = query(usersRef, where(documentId(), 'in', chunk));
        const snap = await getDocs(q);
        return snap.docs.map(doc => doc.data() as UserData);
      });

      const results = await Promise.all(promises);
      const allFriends: UserData[] = [];
      results.forEach(res => allFriends.push(...res));
      
      return allFriends;
    } catch (err) {
      console.error('[FirebaseService] getFriendsByUids failed', err);
      return [];
    }
  }

  // ==========================================
  // GAME INVITES SYSTEM
  // ==========================================

  async sendGameInvite(
    toUid: string,
    gameId: string,
    gameTitle: string,
    roomCode: string,
    customGameData?: { htmlContent?: string; thumbnail?: string; description?: string; updatedAt?: number; category?: string; genre?: string }
  ): Promise<void> {
    const user = this.currentUser();
    if (!user) return;
    try {
      const invitesRef = collection(this.firestore, 'game_invites');
      const payload: any = {
        fromUid: user.uid,
        fromName: user.displayName || this.userData()?.name || 'لاعب',
        fromAvatar: user.photoURL || 'https://ui-avatars.com/api/?name=U',
        toUid: toUid,
        gameId: gameId,
        gameTitle: gameTitle,
        roomCode: roomCode,
        status: 'pending',
        createdAt: Date.now()
      };

      if (customGameData) {
        payload.isCustom = true;
        payload.customGameData = customGameData;
      }

      await addDoc(invitesRef, payload);
    } catch (err) {
      console.error('[FirebaseService] sendGameInvite failed:', err);
    }
  }

  listenForGameInvites(callback: (invites: any[]) => void): () => void {
    const user = this.currentUser();
    const targetUid = user?.uid || (user as any)?.id;
    if (!targetUid) return () => {};
    
    try {
      const q = query(
        collection(this.firestore, 'game_invites'),
        where('toUid', '==', targetUid)
      );
      
      return onSnapshot(q, (snapshot) => {
        const invites = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((inv: any) => inv.status === 'pending');
        console.log('[FirebaseService] Incoming game invites for', targetUid, ':', invites);
        callback(invites);
      }, (err) => {
        console.error('[FirebaseService] listenForGameInvites snapshot error:', err);
      });
    } catch (err) {
      console.error('[FirebaseService] listenForGameInvites failed:', err);
      return () => {};
    }
  }

  async updateGameInviteStatus(inviteId: string, status: 'accepted' | 'declined'): Promise<void> {
    try {
      const docRef = doc(this.firestore, 'game_invites', inviteId);
      await updateDoc(docRef, { status });
    } catch (err) {
      console.error('[FirebaseService] updateGameInviteStatus failed:', err);
    }
  }

  async reportVideo(videoId: string, videoTitle: string, reason: string, comments: string): Promise<void> {
    const uid = this.getUserId() || 'anonymous';
    try {
      const reportsCol = collection(this.firestore, 'reports');
      await addDoc(reportsCol, {
        videoId,
        videoTitle,
        reason,
        comments,
        reporterId: uid,
        timestamp: Date.now()
      });
      console.log(`[FirebaseService] Video ${videoId} reported successfully.`);
    } catch (err) {
      console.error('[FirebaseService] reportVideo failed:', err);
      throw err;
    }
  }

  // ==========================================
  // VIDEO BLACKLIST (per-video, not channel)
  // ==========================================

  async blacklistVideo(videoId: string, videoTitle: string, reason: string, authorId?: string, authorName?: string): Promise<void> {
    try {
      const docRef = doc(this.firestore, 'blacklisted_videos', videoId);
      await setDoc(docRef, {
        videoId,
        videoTitle,
        reason,
        blacklistedAt: Date.now(),
        blacklistedBy: this.getUserId() || 'anonymous',
        authorId: authorId || null,
        authorName: authorName || null
      });
      console.log(`[FirebaseService] Video ${videoId} blacklisted.`);
    } catch (err) {
      console.error('[FirebaseService] blacklistVideo failed:', err);
      throw err;
    }

    if (authorId) {
      await this.notifyChannelOwner(authorId, videoId, videoTitle, reason);
    }
  }

  private async notifyChannelOwner(channelId: string, videoId: string, videoTitle: string, reason: string): Promise<void> {
    try {
      const usersRef = collection(this.firestore, 'users');
      const snap = await getDocs(usersRef);
      let notifiedCount = 0;

      for (const userDoc of snap.docs) {
        const data = userDoc.data();
        const linkedAccount = (data['linkedAccounts'] || []).find(
          (a: any) => a.platform === 'youtube' && a.channelId === channelId
        );
        if (linkedAccount) {
          const notificationsRef = collection(this.firestore, 'users', userDoc.id, 'notifications');
          await addDoc(notificationsRef, {
            type: 'video_reported',
            videoId,
            videoTitle,
            reason,
            reportedBy: this.getUserId(),
            reportedByName: this.userData()?.displayName || 'مستخدم',
            timestamp: Date.now(),
            read: false
          });
          notifiedCount++;
        }
      }

      if (notifiedCount > 0) {
        console.log(`[FirebaseService] Notified ${notifiedCount} owner(s) about video report.`);
      }
    } catch (err) {
      console.error('[FirebaseService] notifyChannelOwner failed:', err);
    }
  }
}
