import { Injectable, signal, computed, inject } from '@angular/core';
import { WalletService } from './wallet.service';

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

  // Core apps signals
  apps = signal<WebProject[]>([]);

  constructor() {
    this.loadState();
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

    // Seed default approved launchers
    const seedApps: WebProject[] = [
      {
        id: 'app_1',
        title: 'محاكي Wokwi IoT',
        description: 'بيئة افتراضية متكاملة تماماً لتجربة ومحاكاة لوحات Arduino و ESP32 و Raspberry Pi بدون عتاد حقيقي.',
        url: 'https://wokwi.com',
        framework: 'other',
        access: 'free',
        price: 0,
        thumbnail: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=600&auto=format&fit=crop',
        authorId: 'system',
        authorName: 'الإدارة المركزية',
        status: 'approved',
        createdAt: new Date(Date.now() - 3600000 * 48).toISOString()
      },
      {
        id: 'app_2',
        title: 'TypeScript Playground',
        description: 'بيئة برمجة واختبار مخصصة للغة تايب سكريبت مباشرة من المتصفح مع معالجة وتحليل الأخطاء حياً.',
        url: 'https://typescriptlang.org/play',
        framework: 'angular',
        access: 'free',
        price: 0,
        thumbnail: 'https://images.unsplash.com/photo-1618401471353-b98aedd07871?q=80&w=600&auto=format&fit=crop',
        authorId: 'system',
        authorName: 'الإدارة المركزية',
        status: 'approved',
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
      },
      {
        id: 'app_3',
        title: 'بوابة StackBlitz Cloud IDE',
        description: 'بيئة تطوير سحابية بالكامل لتشغيل وتعديل مشاريع Angular و Next.js بسرعة وسرية فائقة.',
        url: 'https://stackblitz.com',
        framework: 'nextjs',
        access: 'paid',
        price: 150,
        thumbnail: 'https://images.unsplash.com/photo-1607799279861-4dd421887fb3?q=80&w=600&auto=format&fit=crop',
        authorId: 'developer_1',
        authorName: 'أحمد عرفة',
        status: 'approved',
        createdAt: new Date(Date.now() - 3600000 * 12).toISOString()
      }
    ];

    this.apps.set(seedApps);
    this.saveState();
  }

  saveState(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.apps()));
  }

  // Add listing application request
  submitAppRequest(title: string, url: string, description: string, framework: AppFramework, thumbnail?: string): void {
    const newApp: WebProject = {
      id: `app_${Math.random().toString(36).substr(2, 9)}`,
      title: title.trim(),
      url: url.trim(),
      description: description.trim(),
      framework,
      access: 'free',
      price: 0,
      thumbnail: thumbnail || 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=600&auto=format&fit=crop',
      authorId: 'me',
      authorName: 'العقدة الحالية',
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    this.apps.update(list => [newApp, ...list]);
    this.saveState();
  }

  // Admin moderation actions
  approveApp(id: string, price: number, access: AppAccess): void {
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
  }

  rejectApp(id: string): void {
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
  }

  deleteApp(id: string): void {
    this.apps.update(list => list.filter(a => a.id !== id));
    this.saveState();
  }
}
