import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class EncryptionService {
  private key: CryptoKey | null = null;
  private readonly DB_NAME = 'WeTubeKeysDB';
  private readonly STORE_NAME = 'keys';

  private async getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, 1);
      request.onupgradeneeded = (e) => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async loadKey(): Promise<CryptoKey> {
    if (this.key) return this.key;

    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.STORE_NAME, 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.get('aes_key');

      request.onsuccess = async () => {
        if (request.result) {
          this.key = request.result as CryptoKey;
          resolve(this.key);
        } else {
          try {
            // Generate non-extractable key (cannot be exported by javascript)
            const newKey = await window.crypto.subtle.generateKey(
              { name: 'AES-GCM', length: 256 },
              false, // extractable = false (for maximum client privacy)
              ['encrypt', 'decrypt']
            );
            
            // Store the native CryptoKey directly in IndexedDB (fully supported)
            const writeTx = db.transaction(this.STORE_NAME, 'readwrite');
            const writeStore = writeTx.objectStore(this.STORE_NAME);
            writeStore.put(newKey, 'aes_key');
            
            this.key = newKey;
            resolve(newKey);
          } catch (err) {
            reject(err);
          }
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async encrypt(data: any): Promise<string> {
    if (data === null || data === undefined) return '';
    try {
      const key = await this.loadKey();
      const jsonStr = JSON.stringify(data);
      const encoder = new TextEncoder();
      const encodedData = encoder.encode(jsonStr);
      
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      
      const cipherBuffer = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encodedData
      );

      const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
      const cipherHex = Array.from(new Uint8Array(cipherBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
      
      return ivHex + ':' + cipherHex;
    } catch (e) {
      console.error('[EncryptionService] Encryption failed:', e);
      return '';
    }
  }

  async decrypt(encryptedStr: string): Promise<any> {
    if (!encryptedStr || !encryptedStr.includes(':')) return null;
    try {
      const key = await this.loadKey();
      const [ivHex, cipherHex] = encryptedStr.split(':');
      
      const iv = new Uint8Array(ivHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
      const cipherText = new Uint8Array(cipherHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
      
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        cipherText
      );
      
      const decoder = new TextDecoder();
      const jsonStr = decoder.decode(decryptedBuffer);
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error('[EncryptionService] Decryption failed:', e);
      return null;
    }
  }
}
