import { Injectable, signal, computed, inject } from '@angular/core';
import { WalletService } from './wallet.service';
import { FirebaseService } from './services/firebase.service';
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc, query, limit } from 'firebase/firestore';

export type AppFramework = 'angular' | 'react' | 'vue' | 'html' | 'nextjs' | 'other';
export type AppAccess = 'free' | 'paid' | 'trial';
export type AppStatus = 'approved' | 'pending' | 'rejected';

export interface WebProject {
  id: string;
  title: string;
  description: string;
  url: string;
  framework: AppFramework;
  access: AppAccess;
  price: number;
  thumbnail: string;
  authorId: string;
  authorName: string;
  status: AppStatus;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class LauncherService {
  private readonly STORAGE_KEY = 'Si-Neuro-launcher-registry';
  walletService = inject(WalletService);
  private firebaseService = inject(FirebaseService);

  // Core apps signals
  apps = signal<WebProject[]>([]);

  constructor() {
    this.loadState();
    this.syncFromFirebase();
  }

  async syncFromFirebase() {
    try {
      const q = query(collection(this.firebaseService.db, 'app_launcher'), limit(100));
      const snap = await getDocs(q);
      const fetchedApps = snap.docs.map(d => ({ id: d.id, ...d.data() } as WebProject));
      
      fetchedApps.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });
      
      this.apps.set(fetchedApps);
      this.saveState();
    } catch (e) {
      console.error("Launcher Firebase load error", e);
    }
  }

  private loadState(): void {
    const dataStr = localStorage.getItem(this.STORAGE_KEY);
    if (dataStr) {
      try {
        const parsed = JSON.parse(dataStr);
        this.apps.set(parsed || []);
        return;
      } catch (e) {
        console.error("Launcher Load Error", e);
      }
    }

    this.apps.set([]);
    this.saveState();
  }

  saveState(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.apps()));
  }

  // Add listing application request
  async submitAppRequest(title: string, url: string, description: string, framework: AppFramework, thumbnail?: string): Promise<void> {
    const newAppData = {
      title: title.trim(),
      url: url.trim(),
      description: description.trim(),
      framework,
      access: 'free' as AppAccess,
      price: 0,
      thumbnail: thumbnail || 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=600&auto=format&fit=crop',
      authorId: this.firebaseService.getUserId() || 'me',
      authorName: 'مستخدم نكسوس',
      status: 'pending' as AppStatus,
      createdAt: new Date().toISOString()
    };

    try {
      const docRef = await addDoc(collection(this.firebaseService.db, 'app_launcher'), newAppData);
      const newApp: WebProject = { id: docRef.id, ...newAppData };
      this.apps.update(list => [newApp, ...list]);
      this.saveState();
    } catch (error) {
      console.error("Failed to submit app request to Firebase:", error);
      const newAppLocal: WebProject = { id: `app_${Math.random().toString(36).substr(2, 9)}`, ...newAppData };
      this.apps.update(list => [newAppLocal, ...list]);
      this.saveState();
    }
  }

  // Admin moderation actions
  async approveApp(id: string, price: number, access: AppAccess): Promise<void> {
    this.apps.update(list => {
      return list.map(a => {
        if (a.id === id) {
          return {
            ...a,
            status: 'approved',
            price,
            access
          };
        }
        return a;
      });
    });
    this.saveState();

    try {
      await updateDoc(doc(this.firebaseService.db, 'app_launcher', id), {
        status: 'approved',
        price,
        access
      });
    } catch (error) {
      console.error("Failed to approve app in Firebase:", error);
    }
  }

  async rejectApp(id: string): Promise<void> {
    this.apps.update(list => {
      return list.map(a => {
        if (a.id === id) {
          return {
            ...a,
            status: 'rejected'
          };
        }
        return a;
      });
    });
    this.saveState();

    try {
      await updateDoc(doc(this.firebaseService.db, 'app_launcher', id), {
        status: 'rejected'
      });
    } catch (error) {
      console.error("Failed to reject app in Firebase:", error);
    }
  }

  async deleteApp(id: string): Promise<void> {
    this.apps.update(list => list.filter(a => a.id !== id));
    this.saveState();
    
    try {
      await deleteDoc(doc(this.firebaseService.db, 'app_launcher', id));
    } catch (error) {
      console.error("Failed to delete app in Firebase:", error);
    }
  }
}
