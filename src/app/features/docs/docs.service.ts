import { Injectable, inject } from '@angular/core';
import { FirebaseService } from '../../core/services/firebase.service';
import { GlobalStateService } from '../../core/services/global-state.service';
import { SuperDocument } from './docs.model';
import { doc, setDoc, getDocs, deleteDoc, collection, getDoc } from 'firebase/firestore';

@Injectable({
  providedIn: 'root'
})
export class DocsService {
  private firebaseService = inject(FirebaseService);
  private globalState = inject(GlobalStateService);
  
  private dbName = 'SuperDocDB';
  private storeName = 'documents';
  
  private getDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  
  // Get all documents
  async getDocuments(): Promise<SuperDocument[]> {
    const isPro = this.globalState.userProfile().isPro;
    const currentUser = this.firebaseService.currentUser();
    
    // First read all local documents from IndexedDB
    const localDocs = await this.getLocalDocuments();
    
    if (isPro && currentUser) {
      try {
        const uid = currentUser.uid;
        const querySnapshot = await getDocs(collection(this.firebaseService.db, 'users', uid, 'documents'));
        const cloudDocs: SuperDocument[] = [];
        querySnapshot.forEach(doc => {
          cloudDocs.push(doc.data() as SuperDocument);
        });
        
        // Sync cloudDocs back to IndexedDB so they are cached locally
        const db = await this.getDb();
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        for (const doc of cloudDocs) {
          store.put({ ...doc, isSynced: true });
        }
        
        // Combine any local-only documents that aren't synced yet (so we don't lose them)
        const combined = [...cloudDocs];
        for (const localDoc of localDocs) {
          if (!cloudDocs.some(c => c.id === localDoc.id)) {
            combined.push(localDoc);
          }
        }
        return combined.sort((a, b) => b.updatedAt - a.updatedAt);
      } catch (err) {
        console.error('Failed to fetch from firestore, fallback to local', err);
        return localDocs;
      }
    }
    
    return localDocs;
  }
  
  private getLocalDocuments(): Promise<SuperDocument[]> {
    return new Promise(async (resolve, reject) => {
      try {
        const db = await this.getDb();
        const tx = db.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);
        const request = store.getAll();
        request.onsuccess = () => {
          const docs = request.result as SuperDocument[];
          resolve(docs.sort((a, b) => b.updatedAt - a.updatedAt));
        };
        request.onerror = () => reject(request.error);
      } catch (err) {
        reject(err);
      }
    });
  }
  
  // Save document
  async saveDocument(docData: SuperDocument): Promise<void> {
    const isPro = this.globalState.userProfile().isPro;
    const currentUser = this.firebaseService.currentUser();
    
    // Always save locally to IndexedDB first
    const db = await this.getDb();
    const tx = db.transaction(this.storeName, 'readwrite');
    const store = tx.objectStore(this.storeName);
    
    const isSynced = !!(isPro && currentUser);
    const updatedDoc: SuperDocument = {
      ...docData,
      isSynced,
      updatedAt: Date.now()
    };
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put(updatedDoc);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    
    // If Pro, save to Firestore
    if (isSynced && currentUser) {
      try {
        const uid = currentUser.uid;
        const docRef = doc(this.firebaseService.db, 'users', uid, 'documents', updatedDoc.id);
        await setDoc(docRef, updatedDoc);
      } catch (err) {
        console.error('Failed to sync to firestore', err);
        // Keep isSynced = false in IndexedDB so we can sync it later when online/successful
        const txFail = db.transaction(this.storeName, 'readwrite');
        txFail.objectStore(this.storeName).put({ ...updatedDoc, isSynced: false });
      }
    }
  }
  
  // Delete document
  async deleteDocument(id: string): Promise<void> {
    const isPro = this.globalState.userProfile().isPro;
    const currentUser = this.firebaseService.currentUser();
    
    // Delete locally
    const db = await this.getDb();
    const tx = db.transaction(this.storeName, 'readwrite');
    const store = tx.objectStore(this.storeName);
    
    await new Promise<void>((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    
    // If Pro, delete from Firestore
    if (isPro && currentUser) {
      try {
        const uid = currentUser.uid;
        const docRef = doc(this.firebaseService.db, 'users', uid, 'documents', id);
        await deleteDoc(docRef);
      } catch (err) {
        console.error('Failed to delete from firestore', err);
      }
    }
  }
  
  // Migrate local unsynced documents to Firestore (when user goes Pro or logs in)
  async migrateLocalToCloud(): Promise<number> {
    const currentUser = this.firebaseService.currentUser();
    if (!currentUser) return 0;
    
    const localDocs = await this.getLocalDocuments();
    const unsyncedDocs = localDocs.filter(d => !d.isSynced);
    if (unsyncedDocs.length === 0) return 0;
    
    const uid = currentUser.uid;
    let count = 0;
    
    const db = await this.getDb();
    
    for (const docData of unsyncedDocs) {
      try {
        const docRef = doc(this.firebaseService.db, 'users', uid, 'documents', docData.id);
        const syncedDoc = { ...docData, isSynced: true };
        await setDoc(docRef, syncedDoc);
        
        // Update IndexedDB to isSynced = true
        const tx = db.transaction(this.storeName, 'readwrite');
        tx.objectStore(this.storeName).put(syncedDoc);
        count++;
      } catch (err) {
        console.error('Migration failed for doc: ' + docData.id, err);
      }
    }
    
    return count;
  }
}
