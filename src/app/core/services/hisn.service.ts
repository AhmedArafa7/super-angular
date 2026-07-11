import { Injectable, inject, signal } from '@angular/core';
import { FirebaseService } from './firebase.service';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { WirdItem, QuranProgress } from '../../features/hisn/hisn.model';

@Injectable({ providedIn: 'root' })
export class HisnService {
  private firebase = inject(FirebaseService);
  
  wird = signal<WirdItem[]>([]);
  quranProgress = signal<QuranProgress | null>(null);

  constructor() {
    this.initListeners();
  }

  private initListeners() {
    const user = (this.firebase as any).currentUser();
    if (!user) return;

    const db = (this.firebase as any).db;

    // Listen to Wird sync
    const wirdRef = doc(db, 'users', user.uid, 'hisn', 'wird');
    onSnapshot(wirdRef, (snap) => {
      if (snap.exists()) this.wird.set(snap.data()['items']);
    });
    
    // Listen to Quran progress
    const quranRef = doc(db, 'users', user.uid, 'hisn', 'quran');
    onSnapshot(quranRef, (snap) => {
      if (snap.exists()) this.quranProgress.set(snap.data() as QuranProgress);
    });
  }

  async updateWird(wirdId: string, progress: number) {
    const user = (this.firebase as any).currentUser();
    if (!user) return;
    
    const db = (this.firebase as any).db;
    const wirdRef = doc(db, 'users', user.uid, 'hisn', 'wird');
    
    try {
      const docSnap = await getDoc(wirdRef);
      let items = docSnap.exists() ? docSnap.data()['items'] : [];
      
      const exists = items.find((w: WirdItem) => w.id === wirdId);
      if (exists) {
        items = items.map((w: WirdItem) => w.id === wirdId ? { ...w, progress, lastUpdated: Date.now() } : w);
      } else {
        items.push({ id: wirdId, target: 100, progress, lastUpdated: Date.now() });
      }
      
      await setDoc(wirdRef, { items }, { merge: true });
    } catch (e) {
      console.error('Error updating wird:', e);
    }
  }

  async updateQuranProgress(suraId: number, verseId: number) {
    const user = (this.firebase as any).currentUser();
    if (!user) return;
    
    const db = (this.firebase as any).db;
    const quranRef = doc(db, 'users', user.uid, 'hisn', 'quran');
    await setDoc(quranRef, { suraId, verseId, lastUpdated: Date.now() }, { merge: true });
  }
}
