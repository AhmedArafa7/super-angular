import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { LucideAngularModule, Play, Clock, History, Bookmark, User, ChevronLeft, Download, Trash2, WifiOff } from 'lucide-angular';
import { WeTubeService } from '../../wetube.service';
import { IndexedDBService } from '../../../../core/services/indexed-db.service';
import { VideoDownloadService } from '../../../../core/services/video-download.service';

import { FirebaseService } from '../../../../core/services/firebase.service';

@Component({
  selector: 'app-wetube-library',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  template: `
    <div class="library-page w-full min-h-screen bg-[#0f0f0f] text-white p-4 sm:p-6 lg:p-8 overflow-y-auto pb-24">
      <div class="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8">
        <!-- Main Content (History & Saved) -->
        <div class="flex-1 space-y-10">
          
          <!-- History Section -->
          @if (pageMode() === 'library' || pageMode() === 'history') {
            <section>
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-2 text-xl font-bold">
                  <lucide-icon [img]="History" size="24"></lucide-icon>
                  <h2>سجل المشاهدة</h2>
                </div>
                @if (pageMode() === 'library') {
                  <button class="text-indigo-400 hover:text-indigo-300 text-sm font-medium" [routerLink]="['/stream/history']">عرض الكل</button>
                }
              </div>
              
              @if (history().length === 0) {
                <div class="text-gray-400 py-8 text-center bg-gray-900 rounded-xl">لا يوجد فيديوهات في السجل.</div>
              } @else {
                <div [class]="pageMode() === 'history' ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4' : 'flex gap-4 overflow-x-auto hide-scrollbar pb-4 snap-x'">
                  @for (item of (pageMode() === 'history' ? history() : history().slice(0, 10)); track item.videoId) {
                    <div [class]="pageMode() === 'history' ? 'w-full group cursor-pointer' : 'w-64 shrink-0 snap-start group cursor-pointer'" (click)="playVideo(item.videoId)">
                      <div class="aspect-video bg-gray-800 rounded-xl overflow-hidden relative mb-2">
                        <img crossorigin="anonymous" [src]="item.thumbnail" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
                        <div class="absolute bottom-0 left-0 w-full h-1 bg-gray-600">
                          <div class="h-full bg-red-600" style="width: 100%"></div> <!-- Fake progress for now -->
                        </div>
                      </div>
                      <h3 class="text-sm font-medium line-clamp-2">{{ item.title }}</h3>
                      <p class="text-xs text-gray-400 mt-1">{{ item.author }}</p>
                    </div>
                  }
                </div>
              }
            </section>
          }

          <!-- Saved/Liked Videos Section -->
          @if (pageMode() === 'library' || pageMode() === 'liked') {
            <section>
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2 text-xl font-bold">
                <lucide-icon [img]="Bookmark" size="24"></lucide-icon>
                <h2>الفيديوهات المحفوظة</h2>
              </div>
              @if (pageMode() === 'library') {
                <button class="text-indigo-400 hover:text-indigo-300 text-sm font-medium" [routerLink]="['/stream/liked']">عرض الكل</button>
              }
            </div>
            
            @if (savedVideos().length === 0) {
              <div class="text-gray-400 py-8 text-center bg-gray-900 rounded-xl">لم تقم بحفظ أي فيديو بعد.</div>
            } @else {
              <div [class]="pageMode() === 'liked' ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4' : 'flex gap-4 overflow-x-auto hide-scrollbar pb-4 snap-x'">
                @for (item of (pageMode() === 'liked' ? savedVideos() : savedVideos().slice(0, 10)); track item.id) {
                  <div [class]="pageMode() === 'liked' ? 'w-full group cursor-pointer' : 'w-64 shrink-0 snap-start group cursor-pointer'" (click)="playVideo(item.id)">
                    <div class="aspect-video bg-gray-800 rounded-xl overflow-hidden relative mb-2">
                      <img crossorigin="anonymous" [src]="item.thumbnail" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
                    </div>
                    <h3 class="text-sm font-medium line-clamp-2">{{ item.title }}</h3>
                    <p class="text-xs text-gray-400 mt-1">{{ item.author }}</p>
                  </div>
                }
              </div>
            }
          </section>
          }

        </div>

        <!-- Sidebar Profile & Stats -->
        @if (pageMode() === 'library') {
          <div class="w-full lg:w-80 shrink-0">
            <div class="bg-[#181818] rounded-2xl p-6 sticky top-24">
            <div class="flex flex-col items-center text-center border-b border-gray-800 pb-6 mb-6">
              <div class="w-24 h-24 rounded-full bg-indigo-900 border-2 border-indigo-500 mb-4 flex items-center justify-center overflow-hidden shrink-0 shadow-lg">
                <img *ngIf="userAvatar" [src]="userAvatar" [alt]="userName" class="w-full h-full object-cover" />
                <lucide-icon *ngIf="!userAvatar" [img]="User" size="40" class="text-indigo-300"></lucide-icon>
              </div>
              <h2 class="text-lg font-bold text-white">{{ userName }}</h2>
              <p class="text-sm text-gray-400" dir="ltr">{{ userHandle }}</p>
            </div>

            <div class="space-y-4">
              <div class="flex justify-between items-center text-sm">
                <span class="text-gray-400">الاشتراكات</span>
                <span class="font-bold">{{ wetube.subscriptions().length }}</span>
              </div>
              <div class="flex justify-between items-center text-sm">
                <span class="text-gray-400">الفيديوهات المحفوظة</span>
                <span class="font-bold">{{ savedVideos().length }}</span>
              </div>
              <div class="flex justify-between items-center text-sm">
                <span class="text-gray-400">سجل المشاهدة</span>
                <span class="font-bold">{{ history().length }}</span>
              </div>
            </div>
          </div>
        </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .hide-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
    .hide-scrollbar::-webkit-scrollbar {
      display: none;
    }
  `]
})
export class WeTubeLibraryComponent implements OnInit {
  wetube = inject(WeTubeService);
  firebase = inject(FirebaseService);
  private idb = inject(IndexedDBService);
  private router = inject(Router);

  get userName(): string {
    const user = this.firebase.currentUser();
    const data = this.firebase.userData();
    return data?.name || user?.displayName || 'مستخدم WeTube';
  }

  get userHandle(): string {
    const user = this.firebase.currentUser();
    if (user?.email) return '@' + user.email.split('@')[0];
    return '@user';
  }

  get userAvatar(): string | null {
    const user = this.firebase.currentUser();
    return user?.photoURL || null;
  }
  
  Clock = Clock;
  Play = Play;
  History = History;
  Bookmark = Bookmark;
  User = User;
  ChevronLeft = ChevronLeft;
  Download = Download;
  Trash2 = Trash2;
  WifiOff = WifiOff;

  history = signal<any[]>([]);
  savedVideos = signal<any[]>([]);
  downloads = signal<any[]>([]);

  pageMode = computed(() => {
    const url = this.router.url;
    if (url.includes('/history')) return 'history';
    if (url.includes('/liked')) return 'liked';
    return 'library';
  });

  totalDownloadSize = () => this.downloads().reduce((sum, d) => sum + (d.sizeBytes || 0), 0);

  private downloadSvc = inject(VideoDownloadService);

  ngOnInit() {
    this.loadLibraryData();
  }

  async loadLibraryData() {
    try {
      // Load History
      const historyData = await this.idb.getAll('watch_history');
      // Sort by newest first
      this.history.set((historyData || []).sort((a: any, b: any) => b.watchedAt - a.watchedAt));

      // Load Saved Videos
      await this.loadSavedVideos();

      // Load Offline Downloads
      const dlData = await this.downloadSvc.getAllCachedMeta();
      this.downloads.set(dlData.sort((a, b) => (b.cachedAt || 0) - (a.cachedAt || 0)));
      
    } catch (e) {
      console.error('Failed to load library data from IndexedDB', e);
    }
  }

  async loadSavedVideos() {
    try {
      const dbVideos = await this.idb.getAll('saved_videos');
      if (dbVideos && dbVideos.length > 0) {
        this.savedVideos.set(dbVideos.sort((a: any, b: any) => b.savedAt - a.savedAt));
      } else {
        // Fallback or empty state
        this.savedVideos.set([]);
      }
    } catch (e) {
      console.error('Failed to load saved videos', e);
    }
  }

  playVideo(id: string) {
    this.router.navigate(['/stream/watch', id]);
  }

  async deleteDownload(videoId: string) {
    await this.downloadSvc.deleteCached(videoId);
    this.downloads.update(all => all.filter(d => d.videoId !== videoId));
  }

  formatSize(bytes: number): string {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
}
