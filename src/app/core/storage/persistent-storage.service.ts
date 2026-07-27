import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PersistentStorageService {
  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }

  public getItem<T>(key: string, fallback: T): T {
    if (!this.isBrowser()) return fallback;
    try {
      const item = localStorage.getItem(key);
      if (item === null) return fallback;
      // Check if it's JSON or raw string
      try {
        return JSON.parse(item) as T;
      } catch {
        return item as unknown as T;
      }
    } catch (e) {
      console.warn(`[PersistentStorageService] Error reading key "${key}":`, e);
      return fallback;
    }
  }

  public setItem<T>(key: string, value: T): void {
    if (!this.isBrowser()) return;
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, serialized);
    } catch (e) {
      console.warn(`[PersistentStorageService] Error saving key "${key}":`, e);
    }
  }

  public removeItem(key: string): void {
    if (!this.isBrowser()) return;
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`[PersistentStorageService] Error removing key "${key}":`, e);
    }
  }

  public clear(): void {
    if (!this.isBrowser()) return;
    try {
      localStorage.clear();
    } catch (e) {
      console.warn('[PersistentStorageService] Error clearing localStorage:', e);
    }
  }
}
